# Creates the Python runtime image for the clinical-safety inference API.
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Installs only build prerequisites needed by the Python and model dependencies, then removes package indexes.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-gpu.txt ./
# Build with --build-arg GPU=1 on CUDA hosts (installs bitsandbytes for 4-bit loading).
ARG GPU=0
RUN pip install --upgrade pip && pip install -r requirements.txt     && if [ "$GPU" = "1" ]; then pip install -r requirements-gpu.txt; fi

COPY app ./app
COPY model ./model

EXPOSE 8000

# Starts the FastAPI application on the container's public HTTP port.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
