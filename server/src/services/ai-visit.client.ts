import { logger } from "../lib/logger.js";
import { getAiServiceConfig } from "./ai-service.config.js";
import type {
  CheckActionRequest,
  CheckActionResponse,
  RelevantHistoryRequest,
  RelevantHistoryResponse,
} from "../types/ai-visit.types.js";

const UNAVAILABLE_HISTORY: RelevantHistoryResponse = {
  relevantHistory: [],
  confidence: 0,
  aiUnavailable: true,
  message: "MiqorAI assistant is temporarily unavailable. Continue using clinical judgment.",
};

const UNAVAILABLE_ACTION: CheckActionResponse = {
  hasAlert: false,
  aiUnavailable: true,
  message: "MiqorAI assistant is temporarily unavailable. Continue using clinical judgment.",
};

function scoreHistoryMatch(entry: RelevantHistoryRequest["availableHistory"][0], keywords: string[]): number {
  const blob = [
    entry.complaint,
    entry.diagnosis,
    entry.outcome,
    ...entry.tests,
    ...entry.medications,
    ...entry.imaging,
  ]
    .join(" ")
    .toLowerCase();
  return keywords.reduce((score, kw) => (blob.includes(kw) ? score + 1 : score), 0);
}

function localMockRelevantHistory(request: RelevantHistoryRequest): RelevantHistoryResponse {
  const keywords = request.keywords ?? [];
  const scored = request.availableHistory
    .map((entry) => ({ entry, score: scoreHistoryMatch(entry, keywords) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const relevantHistory = scored.map(({ entry, score }) => ({
    date: entry.date,
    facility: entry.facility,
    reason: `Matched ${score} clinical keyword(s) from current visit context`,
    summary: [entry.complaint, entry.diagnosis].filter(Boolean).join(" — ") || "Prior encounter",
    tests: entry.tests,
    medications: entry.medications,
    imaging: entry.imaging,
  }));

  return {
    relevantHistory,
    confidence: relevantHistory.length ? Math.min(0.95, 0.4 + relevantHistory.length * 0.1) : 0.2,
  };
}

function localMockCheckAction(request: CheckActionRequest): CheckActionResponse {
  const name = request.action.name.toLowerCase();
  const allergyHit = request.patientProfile.allergies.find(
    (a) => name.includes(a.toLowerCase()) || a.toLowerCase().includes(name),
  );
  if (allergyHit) {
    return {
      hasAlert: true,
      severity: "CRITICAL",
      alertType: "ALLERGY",
      title: "Allergy risk detected",
      message: `Patient has a documented allergy related to ${request.action.name}.`,
      evidence: [{ date: "—", facility: "Patient profile", detail: `Allergy: ${allergyHit}` }],
      recommendedAction: "CANCEL",
      alternatives: ["Choose an alternative medication or test"],
      requiresOverrideReason: true,
    };
  }

  const duplicate = request.availableHistory.find((h) =>
    h.tests.some((t) => t.toLowerCase().includes(name) || name.includes(t.toLowerCase())),
  );
  if (request.action.type === "LAB_ORDER" && duplicate) {
    return {
      hasAlert: true,
      severity: "HIGH",
      alertType: "DUPLICATE_TEST",
      title: "Similar test found in history",
      message: `${request.action.name} appears to have been ordered previously.`,
      evidence: [
        {
          date: duplicate.date,
          facility: duplicate.facility,
          detail: `Prior tests: ${duplicate.tests.join(", ")}`,
        },
      ],
      recommendedAction: "REVIEW",
      alternatives: ["Review prior result before reordering"],
      requiresOverrideReason: true,
    };
  }

  if (/warfarin|penicillin/i.test(name)) {
    return {
      hasAlert: true,
      severity: "HIGH",
      alertType: "MEDICATION_RISK",
      title: "Medication safety review",
      message: `${request.action.name} requires additional clinical review.`,
      evidence: [],
      recommendedAction: "PROCEED_WITH_CAUTION",
      alternatives: ["Consider safer alternative"],
      requiresOverrideReason: true,
    };
  }

  return {
    hasAlert: false,
    severity: "LOW",
    alertType: "NONE",
    title: "No alert",
    message: "No blocking concern identified for this action.",
    recommendedAction: "SAFE_TO_PROCEED",
    requiresOverrideReason: false,
  };
}

async function postAi<T>(path: string, body: unknown): Promise<T | null> {
  const cfg = getAiServiceConfig();
  if (!cfg.baseUrl) return null;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn("AI request failed", { path, status: res.status });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    logger.warn("AI request error", { path, error: String(err) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRelevantHistory(
  request: RelevantHistoryRequest,
): Promise<RelevantHistoryResponse> {
  const cfg = getAiServiceConfig();
  if (!cfg.enabled) {
    return { relevantHistory: [], confidence: 0 };
  }

  logger.info("AI relevant-history request started", {
    patientId: request.patientId,
    keywordCount: request.keywords?.length ?? 0,
  });

  if (cfg.mock && !cfg.baseUrl) {
    const mock = localMockRelevantHistory(request);
    logger.info("AI relevant-history completed (local mock)");
    return mock;
  }

  const remote = await postAi<RelevantHistoryResponse>("/ai/relevant-history", request);
  if (remote) {
    logger.info("AI relevant-history completed", { count: remote.relevantHistory?.length ?? 0 });
    return remote;
  }

  if (cfg.mock) {
    const mock = localMockRelevantHistory(request);
    logger.info("AI relevant-history completed (fallback mock)");
    return mock;
  }

  logger.warn("AI relevant-history unavailable");
  return UNAVAILABLE_HISTORY;
}

export async function fetchCheckAction(request: CheckActionRequest): Promise<CheckActionResponse> {
  const cfg = getAiServiceConfig();
  if (!cfg.enabled) {
    return { hasAlert: false, alertType: "NONE", recommendedAction: "SAFE_TO_PROCEED" };
  }

  logger.info("AI check-action request started", {
    patientId: request.patientId,
    actionType: request.action.type,
    actionName: request.action.name,
  });

  if (cfg.mock && !cfg.baseUrl) {
    const mock = localMockCheckAction(request);
    logger.info("AI check-action completed (local mock)", { hasAlert: mock.hasAlert });
    return mock;
  }

  const remote = await postAi<CheckActionResponse>("/ai/check-action", request);
  if (remote) {
    logger.info("AI check-action completed", { hasAlert: remote.hasAlert });
    return remote;
  }

  if (cfg.mock) {
    const mock = localMockCheckAction(request);
    logger.info("AI check-action completed (fallback mock)", { hasAlert: mock.hasAlert });
    return mock;
  }

  logger.warn("AI check-action unavailable");
  return UNAVAILABLE_ACTION;
}
