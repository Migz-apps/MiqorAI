from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class VisitContext(BaseModel):
    chiefComplaint: str | None = None
    symptoms: str | None = None
    assessment: str | None = None
    diagnosis: str | None = None


class PatientProfile(BaseModel):
    age: int = 0
    sex: str = "U"
    bloodGroup: str = "—"
    allergies: list[str] = Field(default_factory=list)
    chronicConditions: list[str] = Field(default_factory=list)
    currentMedications: list[str] = Field(default_factory=list)


class HistoryEntry(BaseModel):
    date: str = ""
    facility: str = ""
    complaint: str = ""
    diagnosis: str = ""
    tests: list[str] = Field(default_factory=list)
    imaging: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    outcome: str = ""


class RelevantHistoryRequest(BaseModel):
    patientId: str
    doctorId: str
    visitContext: VisitContext
    patientProfile: PatientProfile
    availableHistory: list[HistoryEntry] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)


class RelevantHistoryItem(BaseModel):
    date: str
    facility: str
    reason: str
    summary: str
    tests: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    imaging: list[str] = Field(default_factory=list)


class RelevantHistoryResponse(BaseModel):
    relevantHistory: list[RelevantHistoryItem] = Field(default_factory=list)
    confidence: float = 0.0


class ActionPayload(BaseModel):
    type: Literal["LAB_ORDER", "IMAGING_ORDER", "PRESCRIPTION", "REFERRAL"]
    name: str
    dose: str | None = None
    frequency: str | None = None
    duration: str | None = None
    reason: str | None = None


class CheckActionRequest(BaseModel):
    patientId: str
    doctorId: str
    visitId: str | None = None
    action: ActionPayload
    visitContext: VisitContext
    patientProfile: PatientProfile
    availableHistory: list[HistoryEntry] = Field(default_factory=list)


class EvidenceItem(BaseModel):
    date: str
    facility: str
    detail: str


class CheckActionResponse(BaseModel):
    hasAlert: bool
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] | None = None
    alertType: (
        Literal[
            "DUPLICATE_TEST",
            "ALLERGY",
            "DRUG_INTERACTION",
            "MEDICATION_RISK",
            "DUPLICATE_IMAGING",
            "EXISTING_REFERRAL",
            "NONE",
        ]
        | None
    ) = None
    title: str | None = None
    message: str | None = None
    evidence: list[EvidenceItem] = Field(default_factory=list)
    recommendedAction: (
        Literal["CANCEL", "REVIEW", "PROCEED_WITH_CAUTION", "SAFE_TO_PROCEED"] | None
    ) = None
    alternatives: list[str] = Field(default_factory=list)
    requiresOverrideReason: bool = False


def _score(entry: HistoryEntry, keywords: list[str]) -> int:
    blob = " ".join(
        [entry.complaint, entry.diagnosis, entry.outcome, *entry.tests, *entry.medications, *entry.imaging]
    ).lower()
    return sum(1 for kw in keywords if kw.lower() in blob)


def build_relevant_history(request: RelevantHistoryRequest) -> RelevantHistoryResponse:
    keywords = request.keywords or []
    if not keywords:
        context_blob = " ".join(
            filter(
                None,
                [
                    request.visitContext.chiefComplaint,
                    request.visitContext.symptoms,
                    request.visitContext.assessment,
                    request.visitContext.diagnosis,
                ],
            )
        ).lower()
        keywords = [t for t in context_blob.split() if len(t) > 3][:15]

    ranked = sorted(
        ((entry, _score(entry, keywords)) for entry in request.availableHistory),
        key=lambda row: row[1],
        reverse=True,
    )
    selected = [row for row in ranked if row[1] > 0][:5]
    if not selected and request.availableHistory:
        selected = [(request.availableHistory[0], 0.1)]

    items = [
        RelevantHistoryItem(
            date=entry.date,
            facility=entry.facility,
            reason=f"Matched {score} keyword(s) from current visit" if score else "Contextually related prior record",
            summary=" — ".join(filter(None, [entry.complaint, entry.diagnosis])) or "Prior encounter",
            tests=entry.tests,
            medications=entry.medications,
            imaging=entry.imaging,
        )
        for entry, score in selected
    ]
    confidence = min(0.95, 0.35 + len(items) * 0.12) if items else 0.0
    return RelevantHistoryResponse(relevantHistory=items, confidence=confidence)


def build_check_action(request: CheckActionRequest) -> CheckActionResponse:
    name = request.action.name.lower()
    for allergy in request.patientProfile.allergies:
        if allergy.lower() in name or name in allergy.lower():
            return CheckActionResponse(
                hasAlert=True,
                severity="CRITICAL",
                alertType="ALLERGY",
                title="Allergy risk detected",
                message=f"Patient allergy profile conflicts with {request.action.name}.",
                evidence=[EvidenceItem(date="—", facility="Patient profile", detail=allergy)],
                recommendedAction="CANCEL",
                alternatives=["Select an alternative"],
                requiresOverrideReason=True,
            )

    if request.action.type == "LAB_ORDER":
        for entry in request.availableHistory:
            for test in entry.tests:
                if name in test.lower() or test.lower() in name:
                    return CheckActionResponse(
                        hasAlert=True,
                        severity="HIGH",
                        alertType="DUPLICATE_TEST",
                        title="Similar test found in history",
                        message=f"{request.action.name} may duplicate prior testing.",
                        evidence=[
                            EvidenceItem(
                                date=entry.date,
                                facility=entry.facility,
                                detail=f"Prior test: {test}",
                            )
                        ],
                        recommendedAction="REVIEW",
                        alternatives=["Review prior result before reordering"],
                        requiresOverrideReason=True,
                    )

    if request.action.type == "PRESCRIPTION" and any(x in name for x in ("warfarin", "penicillin")):
        return CheckActionResponse(
            hasAlert=True,
            severity="HIGH",
            alertType="MEDICATION_RISK",
            title="Medication safety review",
            message=f"{request.action.name} requires additional clinical review.",
            recommendedAction="PROCEED_WITH_CAUTION",
            alternatives=["Consider safer alternative"],
            requiresOverrideReason=True,
        )

    return CheckActionResponse(
        hasAlert=False,
        severity="LOW",
        alertType="NONE",
        title="No alert",
        message="No blocking concern identified.",
        recommendedAction="SAFE_TO_PROCEED",
        requiresOverrideReason=False,
    )
