import { logger } from "../lib/logger.js";
import { getAiServiceConfig } from "./ai-service.config.js";
import type {
  AiHealthResponse,
  ClinicalSafetyRequest,
  ClinicalSafetyResponse,
} from "../types/clinical-safety.types.js";

const TIMEOUT_MS = 15_000;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

function isMockMode(): boolean {
  return getAiServiceConfig().mock;
}

function serviceBaseUrl(): string | null {
  const url = getAiServiceConfig().baseUrl;
  return url || null;
}

export const CLINICAL_SAFETY_UNAVAILABLE_FALLBACK: ClinicalSafetyResponse = {
  alert_title: "AI Service Unavailable",
  severity: "Review",
  reasoning:
    "Clinical safety service could not be reached. Doctor should review patient history manually before continuing.",
  ai_search_result: "AI service unavailable or timed out.",
  doctor_options: ["Review manually", "Continue only with documented reason"],
  intervention_required: true,
};

function allergyConflictsItem(
  allergy: { substance?: string | null },
  item: string,
): boolean {
  const substance = (allergy.substance ?? "").trim().toLowerCase();
  if (!substance || substance === "none known" || substance === "none") return false;
  return item.toLowerCase().includes(substance);
}

function localMockResponse(request: ClinicalSafetyRequest): ClinicalSafetyResponse {
  const item = request.doctor_attempted_action.item;
  const isHighRisk =
    /(?:^|\b)(penicillin|warfarin|cbc|mri)(?:\b|$)/i.test(item) ||
    request.patient_record.allergies.some((a) => allergyConflictsItem(a, item));

  if (isHighRisk) {
    return {
      alert_title: "Potential clinical safety concern",
      severity: "High",
      reasoning: `Mock review flagged ${item} based on patient context.`,
      ai_search_result: `Mock search results for ${item}.`,
      doctor_options: ["Cancel order", "Override with documented reason", "Order alternative"],
      intervention_required: true,
    };
  }

  return {
    alert_title: "No intervention required",
    severity: "Low",
    reasoning: `Mock review found no blocking concern for ${item}.`,
    ai_search_result: `Mock search completed for ${item}.`,
    doctor_options: ["Continue"],
    intervention_required: false,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  allowRetry = true,
): Promise<T> {
  const base = serviceBaseUrl();
  if (!base) throw new Error("AI service URL is not configured");

  const url = `${base}${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < (allowRetry ? 2 : 1); attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          ...(init.headers ?? {}),
        },
      });

      if (!res.ok) {
        if (allowRetry && attempt === 0 && RETRYABLE_STATUS.has(res.status)) {
          continue;
        }
        throw new Error(`AI service responded with ${res.status}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (allowRetry && attempt === 0) continue;
      throw lastError;
    }
  }

  throw lastError;
}

export function isAiClinicalSafetyConfigured(): boolean {
  const cfg = getAiServiceConfig();
  if (!cfg.enabled) return false;
  return Boolean(cfg.baseUrl) || cfg.mock;
}

export async function checkAiServiceHealth(): Promise<AiHealthResponse | null> {
  if (isMockMode()) {
    return { status: "ok", model_loaded: false };
  }

  const base = serviceBaseUrl();
  if (!base) return null;

  try {
    return await requestJson<AiHealthResponse>("/health", { method: "GET" }, true);
  } catch (err) {
    logger.warn("AI service health check failed", { message: (err as Error).message });
    return null;
  }
}

export async function checkClinicalSafety(
  request: ClinicalSafetyRequest,
): Promise<ClinicalSafetyResponse> {
  if (isMockMode()) {
    return localMockResponse(request);
  }
  const path = "/clinical-safety/check";

  try {
    const response = await requestJson<ClinicalSafetyResponse>(
      path,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      true,
    );

    return {
      alert_title: response.alert_title,
      severity: response.severity,
      reasoning: response.reasoning,
      ai_search_result: response.ai_search_result,
      doctor_options: response.doctor_options ?? [],
      intervention_required: Boolean(response.intervention_required),
    };
  } catch (err) {
    logger.warn("Clinical safety AI call failed — using safe fallback", {
      message: (err as Error).message,
    });
    return { ...CLINICAL_SAFETY_UNAVAILABLE_FALLBACK };
  }
}
