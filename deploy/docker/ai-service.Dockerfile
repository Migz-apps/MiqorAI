# syntax=docker/dockerfile:1.7
#
# MiqorAI clinical-safety inference service (FastAPI). SINGLE SOURCE of the AI image.
#
# Build from the REPOSITORY ROOT (Kubernetes / CI):
#   docker build -f deploy/docker/ai-service.Dockerfile -t miqorai-ai-service .
#
# Hugging Face Space: scripts/sync-hf-space.ps1 copies this file to
# hf-space-publish/Dockerfile and strips the "miqorai-ai-service/" prefix from the
# COPY sources, because the Space builds with hf-space-publish/ as its context.
# Never edit hf-space-publish/Dockerfile by hand.
#
# Build args:
#   GPU=1              also install requirements-gpu.txt (bitsandbytes 4-bit loading on CUDA hosts)
#   TORCH_INDEX_URL    optional wheel index for torch, e.g. https://download.pytorch.org/whl/cpu
#                      (much smaller CPU-only image; empty keeps the default PyPI torch)

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/home/user/.cache/huggingface \
    HOME=/home/user

# Build prerequisites for Python packages without wheels; package indexes are removed.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Non-root runtime user (uid 1000, the uid Hugging Face Spaces expect).
RUN useradd --create-home --uid 1000 user
WORKDIR /app

COPY miqorai-ai-service/requirements.txt miqorai-ai-service/requirements-gpu.txt ./
ARG GPU=0
ARG TORCH_INDEX_URL=""
RUN pip install --upgrade pip \
    && if [ -n "$TORCH_INDEX_URL" ]; then pip install torch --index-url "$TORCH_INDEX_URL"; fi \
    && pip install -r requirements.txt \
    && if [ "$GPU" = "1" ]; then pip install -r requirements-gpu.txt; fi

COPY --chown=1000:1000 miqorai-ai-service/app ./app
COPY --chown=1000:1000 miqorai-ai-service/model ./model

USER 1000
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=300s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

# Starts the FastAPI application on the container's public HTTP port.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
