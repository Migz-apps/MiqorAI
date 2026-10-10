from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

import hmac
import json

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.model_loader import get_runtime, is_model_loaded, load_inference_runtime
from app.ai_visit import (
    CheckActionRequest,
    CheckActionResponse,
    RelevantHistoryRequest,
    RelevantHistoryResponse,
    build_check_action,
    build_relevant_history,
)
from app.schemas import (
    ClinicalSafetyAlertResponse,
    ClinicalSafetyCheckRequest,
    ClinicalSafetyCheckResponse,
    HealthResponse,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s", settings.app_name)
    try:
        load_inference_runtime()
        logger.info("Clinical safety model ready")
    except Exception as exc:
        logger.exception("Failed to load model at startup: %s", exc)
        raise
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def require_api_key(authorization: str | None = Header(default=None)) -> None:
    """Enforce bearer auth on inference endpoints when AI_SERVICE_API_KEY is set."""
    expected = settings.ai_service_api_key.strip()
    if not expected:
        return
    provided = ""
    if authorization and authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")



@app.get("/")
async def root() -> dict[str, object]:
    return {
        "service": settings.app_name,
        "status": "ok",
        "model_loaded": is_model_loaded(),
        "health_url": "/health",
        "docs_url": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=is_model_loaded())


@app.post("/clinical-safety/check", response_model=ClinicalSafetyCheckResponse, dependencies=[Depends(require_api_key)])
async def clinical_safety_check(
    request: ClinicalSafetyCheckRequest,
    debug: bool = Query(default=False, description="Include raw model output in response"),
) -> ClinicalSafetyCheckResponse:
    include_raw = debug or settings.debug_raw_model_output
    try:
        runtime = get_runtime()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        alert, raw_output, used_fallback = await asyncio.to_thread(runtime.check_clinical_safety, request)
    except Exception as exc:
        logger.exception("Inference failed: %s", exc)
        raise HTTPException(status_code=500, detail="Clinical safety inference failed") from exc

    response = ClinicalSafetyCheckResponse(
        **alert,
        used_fallback=used_fallback,
        raw_model_output=raw_output if include_raw else None,
    )
    return response


@app.post("/clinical-safety/check/mock", response_model=ClinicalSafetyAlertResponse, dependencies=[Depends(require_api_key)])
async def clinical_safety_check_mock(
    request: ClinicalSafetyCheckRequest,
) -> ClinicalSafetyAlertResponse:
    action = request.doctor_attempted_action
    if action.type == "test_order":
        return ClinicalSafetyAlertResponse(
            alert_title="Recent Similar Test Found",
            severity="high",
            reasoning="A similar test was ordered recently; repeat testing may be unnecessary unless clinical status changed.",
            ai_search_result=json.dumps(
                {"match_type": "duplicate_test", "test": action.item, "source": "mock"}
            ),
            doctor_options=[
                "Cancel duplicate order and review prior result",
                "Proceed with override and document clinical justification",
            ],
            intervention_required=True,
        )

    return ClinicalSafetyAlertResponse(
        alert_title="Medication Safety Alert",
        severity="high",
        reasoning="The attempted prescription requires clinical safety review before proceeding.",
        ai_search_result=json.dumps(
            {"match_type": "medication_risk", "drug": action.item, "source": "mock"}
        ),
        doctor_options=[
            "Choose a safer alternative",
            "Proceed with override and document clinical justification",
        ],
        intervention_required=True,
    )


@app.post("/ai/relevant-history", response_model=RelevantHistoryResponse, dependencies=[Depends(require_api_key)])
async def ai_relevant_history(request: RelevantHistoryRequest) -> RelevantHistoryResponse:
    return build_relevant_history(request)


@app.post("/ai/check-action", response_model=CheckActionResponse, dependencies=[Depends(require_api_key)])
async def ai_check_action(request: CheckActionRequest) -> CheckActionResponse:
    return build_check_action(request)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)
