#!/bin/bash

# 基底ディレクトリ
BASE_DIR="/Users/tatsuki/Documents/Workspace/tech0_AInamai"
BACKEND_DIR="$BASE_DIR/backend"
RESOURCE_GROUP="rg-001-gen10"
APP_NAME="koya-app-backend-dev"

# 環境変数 (既にApp Serviceに設定済みの場合は不要、必要な場合のみ設定)
# 以下の値は実際のシークレットに置き換えてください
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-YOUR_GOOGLE_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-YOUR_GOOGLE_CLIENT_SECRET}"
GEMINI_API_KEY="${GEMINI_API_KEY:-YOUR_GEMINI_API_KEY}"

cd "$BACKEND_DIR"

echo "=== 1. Preparing Source Code (No Local Libs) ==="
rm -f backend_deploy.zip
# ソースコードのみZIP化
zip -r backend_deploy.zip app alembic requirements.txt alembic.ini startup.sh seed_dummy_data.sql

echo "=== 2. Configuring App Service for Robust Build ==="
# タイムアウト拡張設定を追加
az webapp config appsettings set --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  ENABLE_ORYX_BUILD=true \
  SCM_COMMAND_IDLE_TIMEOUT=1800 \
  WEBSITES_CONTAINER_START_TIME_LIMIT=1800 \
  GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  GEMINI_API_KEY="$GEMINI_API_KEY"

# 古い設定の削除
az webapp config appsettings delete --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --setting-names PYTHONPATH

# スタートアップコマンド
az webapp config set --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --startup-file "python -m gunicorn --bind=0.0.0.0:8000 --workers=2 --access-logfile - --error-logfile - -k uvicorn.workers.UvicornWorker app.main:app"

echo "=== 3. Deploying to Azure Async ==="
# --async true でCLIのタイムアウトを回避
az webapp deploy --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --src-path backend_deploy.zip --type zip --async true

echo "=== Backend Deployment Triggered (Async) ==="
echo "Check status with: az webapp deployment list --resource-group $RESOURCE_GROUP --name $APP_NAME --query '[0].{id:id, status:status, message:message}'"
