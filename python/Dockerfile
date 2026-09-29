FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENV CUDA_VISIBLE_DEVICES=-1
ENV USE_TF=0
ENV USE_TORCH=1
ENV TOKENIZERS_PARALLELISM=false
ENV TF_ENABLE_ONEDNN_OPTS=0

ENV TF_NUM_INTRAOP_THREADS=1
ENV TF_NUM_INTEROP_THREADS=1
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

ENV HF_HOME=/app/models/hf_cache

WORKDIR /app

COPY requirements-cloudrun.txt .

RUN pip install --no-cache-dir -r requirements-cloudrun.txt

# Pre-download and cache Hugging Face food classification model during build
RUN python -c "from transformers import pipeline; pipeline('image-classification', model='Subhash5/indian-food-classifier', device=-1)"

COPY src ./src
COPY rules ./rules
COPY models ./models

RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /app/uploads /app/data /app/models/hf_cache \
    && chown -R appuser:appuser /app /home/appuser

USER appuser

ENV PORT=8080

EXPOSE 8080

CMD exec gunicorn src.model_api:app \
    --bind 0.0.0.0:${PORT} \
    --workers 1 \
    --threads 2 \
    --timeout 300 \
    --worker-class gthread \
    --access-logfile - \
    --error-logfile -