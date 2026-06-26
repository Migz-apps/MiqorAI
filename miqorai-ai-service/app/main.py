from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.model_loader import get_runtime, is_model_loaded, load_inference_runtime
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


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=is_model_loaded())


@app.post("/clinical-safety/check", response_model=ClinicalSafetyCheckResponse)
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


@app.post("/clinical-safety/check/mock", response_model=ClinicalSafetyAlertResponse)
async def clinical_safety_check_mock(
    request: ClinicalSafetyCheckRequest,
) -> ClinicalSafetyAlertResponse:
    action = request.doctor_attempted_action
    if action.type == "test_order":
        return ClinicalSafetyAlertResponse(
            alert_title="Recent Similar Test Found",
            severity="high",
            reasoning="A similar test was ordered recently; repeat testing may be unnecessary unless clinical status changed.",
            ai_search_result='{"match_type":"duplicate_test","test":"'
            + action.item
            + '","source":"mock"}',
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
        ai_search_result='{"match_type":"medication_risk","drug":"'
        + action.item
        + '","source":"mock"}',
        doctor_options=[
            "Choose a safer alternative",
            "Proceed with override and document clinical justification",
        ],
        intervention_required=True,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)
