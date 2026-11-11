#!/bin/sh
set -eu
echo "[setup] Applying database migrations..."
python manage.py migrate --noinput
echo "[setup] Seeding country/province/commune reference..."
python manage.py seed_location_reference
echo "[setup] Seeding professional requirements..."
python manage.py seed_professional_requirements
echo "[setup] Loading previously reviewed locality reference..."
python manage.py transfer_demo_localities --import-file /app/demo_reference/reviewed_localities.json
echo "[setup] Collecting static assets..."
python manage.py collectstatic --noinput
echo "[setup] SUCCESS: database and reference data initialized."
echo "[setup] SMTP email backend configured; verify delivery through the application."
