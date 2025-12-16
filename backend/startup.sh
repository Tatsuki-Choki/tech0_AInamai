#!/bin/bash
set -e

echo "=== Starting deployment script ==="

# Change to app directory
cd /home/site/wwwroot
export PYTHONPATH=$PYTHONPATH:/home/site/wwwroot
ls -F /home/site/wwwroot

# Run database migrations (dependencies are installed during build)
echo "Running database migrations..."
python -m alembic upgrade head || alembic upgrade head || echo "Migration failed or already up to date"
echo "Migrations completed!"

# Add seed execution
echo "Running seed data..."
python -m app.db.seed || echo "Seed failed"
echo "Creating demo data (users + reports)..."
python -m app.db.seed_demo || echo "Demo seed failed"

echo "Starting application..."
# Start the application with Gunicorn
exec python -m gunicorn --bind=0.0.0.0:8000 --workers=1 --timeout=1800 --access-logfile - --error-logfile - -k uvicorn.workers.UvicornWorker app.main:app
