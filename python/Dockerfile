FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENV CUDA_VISIBLE_DEVICES=-1
ENV USE_TF=0
ENV USE_TORCH=1
ENV TOKENIZERS_PARALLELISM=false

ENV TF_NUM_INTRAOP_THREADS=1
ENV TF_NUM_INTEROP_THREADS=1
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

WORKDIR /app

COPY requirements-cloudrun.txt .

RUN pip install --no-cache-dir -r requirements-cloudrun.txt

COPY src ./src
COPY rules ./rules
COPY models ./models

RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app

USER appuser

ENV PORT=8080

EXPOSE 8080

CMD exec gunicorn src.model_api:app \
    --bind 0.0.0.0:${PORT} \
    --timeout 300 \
    --workers 1