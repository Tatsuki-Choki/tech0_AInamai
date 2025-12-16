#!/bin/bash

# 基底ディレクトリ
BASE_DIR="/Users/tatsuki/Documents/Workspace/tech0_AInamai"
FRONTEND_DIR="$BASE_DIR/frontend"
RESOURCE_GROUP="rg-001-gen10"
APP_NAME="koya-app-frontend-dev"

cd "$FRONTEND_DIR"

echo "=== 1. Building Frontend ==="
npm install
npm run build

echo "=== 2. Preparing Deployment Package ==="
rm -f frontend_deploy.zip
rm -rf deploy_artifact
mkdir deploy_artifact

# Copy build artifacts
cp -r dist deploy_artifact/

# Create server.cjs (CommonJS enforced)
cp server.js deploy_artifact/server.cjs

# Create package.json for production server
cat > deploy_artifact/package.json <<EOF
{
  "name": "frontend-server",
  "version": "1.0.0",
  "description": "Simple Express server for SPA",
  "scripts": {
    "start": "node server.cjs"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

cd deploy_artifact
zip -r ../frontend_deploy.zip .
cd ..
rm -rf deploy_artifact

echo "=== 3. Configuring App Service Settings ==="
# WEBSITES_PORT は削除し、Azureから渡される PORT 環境変数(デフォルト8080)を使う
az webapp config appsettings delete --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --setting-names WEBSITES_PORT

az webapp config appsettings set --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  WEBSITE_NODE_DEFAULT_VERSION=~20 \
  SCM_COMMAND_IDLE_TIMEOUT=1800 \
  WEBSITES_CONTAINER_START_TIME_LIMIT=1800

# スタートアップコマンド
# npm start -> node server.cjs
az webapp config set --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --startup-file "npm start"

echo "=== 4. Deploying to Azure Async ==="
az webapp deploy --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --src-path frontend_deploy.zip --type zip --async true

echo "=== Frontend Redeployment Triggered ==="
