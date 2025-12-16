#!/bin/bash
set -e

echo "=== Starting deployment script ==="

# Change to app directory
cd /home/site/wwwroot

# Run database migrations (dependencies are installed during build)
echo "Running database migrations..."
python -m alembic upgrade head || echo "Migration failed or already up to date"
echo "Migrations completed!"

# Add seed execution
echo "Running seed data..."
python -m app.db.seed || echo "Seed failed"
echo "Creating demo data (users + reports)..."
python -m app.db.seed_demo || echo "Demo seed failed"

echo "Starting application..."
# Start the application with Gunicorn
exec gunicorn --bind=0.0.0.0:8000 --workers=2 --timeout=600 -k uvicorn.workers.UvicornWorker app.main:app
