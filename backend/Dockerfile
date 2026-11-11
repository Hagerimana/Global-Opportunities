FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends clamav clamav-freshclam fonts-dejavu-core ca-certificates libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app && useradd --uid 10001 --gid app --create-home app
COPY requirements.txt requirements-docker.txt ./
RUN pip install -r requirements-docker.txt
COPY . .
RUN mkdir -p /data/private /data/media /data/static /data/clamav /data/beat \
    && chown -R app:app /data /app
USER app
EXPOSE 8000
CMD ["sh", "-c", "python manage.py collectstatic --noinput && exec gunicorn config.wsgi:application --bind=0.0.0.0:${PORT:-8000} --workers=1 --threads=2 --timeout=90 --access-logfile=- --error-logfile=-"]
