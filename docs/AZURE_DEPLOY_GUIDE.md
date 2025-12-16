# Azure App Service デプロイ手順書

このガイドでは、探究学習日記アプリを既存の Azure リソースにデプロイする手順を説明します。

## 目次

1. [既存リソース構成](#1-既存リソース構成)
2. [前提条件](#2-前提条件)
3. [変数の設定](#3-変数の設定)
4. [MySQL データベースの設定](#4-mysql-データベースの設定)
5. [バックエンドのデプロイ](#5-バックエンドのデプロイ)
6. [フロントエンドのデプロイ](#6-フロントエンドのデプロイ)
7. [環境変数の設定](#7-環境変数の設定)
8. [データベースマイグレーション](#8-データベースマイグレーション)
9. [動作確認](#9-動作確認)
10. [トラブルシューティング](#10-トラブルシューティング)

---

## 1. 既存リソース構成

| リソース名 | 種類 | 用途 |
|-----------|------|------|
| `koya-app-frontend-dev` | App Service (Linux / Basic B1) | フロントエンド |
| `koya-app-backend-dev` | App Service (Linux / Basic B1) | バックエンド API |
| `koya-mysql-dev` | Azure Database for MySQL Flexible Server | データベース |

---

## 2. 前提条件

### 必要なツール

```bash
# Azure CLI のインストール確認
az --version

# Azure CLI がない場合はインストール
# macOS
brew install azure-cli

# Windows (PowerShell)
winget install Microsoft.AzureCLI

# Node.js (フロントエンドビルド用)
node --version  # v18以上推奨

# Python (マイグレーション用)
python --version  # 3.11推奨
```

### Azure へのログイン

```bash
# Azure にログイン
az login

# サブスクリプションの確認
az account show

# サブスクリプションの切り替え（必要な場合）
az account set --subscription "<SUBSCRIPTION_ID>"
```

---

## 3. 変数の設定

以下の変数をターミナルで設定してください。

```bash
# ==========================================
# リソース名（既存リソースに合わせる）
# ==========================================
export RESOURCE_GROUP="<YOUR_RESOURCE_GROUP>"  # リソースグループ名を設定
export BACKEND_APP="koya-app-backend-dev"
export FRONTEND_APP="koya-app-frontend-dev"
export MYSQL_SERVER="koya-mysql-dev"

# ==========================================
# データベース設定（実際の値を設定）
# ==========================================
export MYSQL_ADMIN_USER="<YOUR_MYSQL_ADMIN_USER>"
export MYSQL_ADMIN_PASSWORD="<YOUR_MYSQL_PASSWORD>"
export MYSQL_DB="tankyu_diary"

# ==========================================
# 認証・API キー（実際の値を設定）
# ==========================================
export JWT_SECRET_KEY="$(openssl rand -base64 32)"
export GOOGLE_CLIENT_ID="<YOUR_GOOGLE_CLIENT_ID>"
export GOOGLE_CLIENT_SECRET="<YOUR_GOOGLE_CLIENT_SECRET>"
export GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"

# ==========================================
# プロジェクトパス
# ==========================================
export PROJECT_ROOT="/Users/tatsuki/Documents/Workspace/tech0_AInamai"

echo "=================================================="
echo "設定された変数:"
echo "Resource Group: $RESOURCE_GROUP"
echo "Backend App: $BACKEND_APP"
echo "Frontend App: $FRONTEND_APP"
echo "MySQL Server: $MYSQL_SERVER"
echo "=================================================="
```

---

## 4. MySQL データベースの設定

### 4.1 MySQL サーバー情報の取得

```bash
# MySQL サーバーの情報を取得
az mysql flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --output table

# 接続情報を確認
export MYSQL_HOST="${MYSQL_SERVER}.mysql.database.azure.com"
echo "MySQL Host: $MYSQL_HOST"
```

### 4.2 データベースの作成

```bash
# データベースを作成（存在しない場合）
az mysql flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER \
  --database-name $MYSQL_DB

# データベース一覧を確認
az mysql flexible-server db list \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER \
  --output table
```

### 4.3 ファイアウォール設定

```bash
# Azure サービスからのアクセスを許可
az mysql flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --rule-name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# ローカルIPからのアクセスを許可（マイグレーション用）
export MY_IP=$(curl -s ifconfig.me)
az mysql flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --rule-name "AllowMyIP" \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP

echo "Your IP: $MY_IP has been allowed"
```

### 4.4 接続文字列の生成

```bash
# 接続文字列を生成（aiomysql用）
export DATABASE_URL="mysql+aiomysql://${MYSQL_ADMIN_USER}:${MYSQL_ADMIN_PASSWORD}@${MYSQL_HOST}:3306/${MYSQL_DB}?ssl=true"

echo "Database URL (masked): mysql+aiomysql://${MYSQL_ADMIN_USER}:****@${MYSQL_HOST}:3306/${MYSQL_DB}?ssl=true"
```

---

## 5. バックエンドのデプロイ

### 5.1 App Service のランタイム設定

```bash
# Python バージョンを設定
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --linux-fx-version "PYTHON|3.11"

# スタートアップコマンドを設定
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --startup-file "gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000"
```

### 5.2 環境変数の設定

```bash
# バックエンド URL を取得
export BACKEND_URL=$(az webapp show \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --query "defaultHostName" -o tsv)

export FRONTEND_URL=$(az webapp show \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --query "defaultHostName" -o tsv)

echo "Backend URL: https://$BACKEND_URL"
echo "Frontend URL: https://$FRONTEND_URL"

# 環境変数を設定
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --settings \
    APP_NAME="探究学習日記アプリ API" \
    DEBUG="false" \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET_KEY="$JWT_SECRET_KEY" \
    GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
    GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
    GOOGLE_REDIRECT_URI="https://${BACKEND_URL}/api/auth/google/callback" \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    GEMINI_MODEL="gemini-2.0-flash" \
    CORS_ORIGINS="[\"https://${FRONTEND_URL}\",\"http://localhost:3000\",\"http://localhost:5173\"]" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    WEBSITE_HTTPLOGGING_RETENTION_DAYS="7"
```

### 5.3 バックエンドコードのデプロイ

```bash
# backend ディレクトリに移動
cd $PROJECT_ROOT/backend

# ZIP デプロイ用にパッケージング
zip -r backend.zip . \
  -x "*.pyc" \
  -x "__pycache__/*" \
  -x ".env" \
  -x "venv/*" \
  -x ".git/*" \
  -x "*.zip"

# デプロイ実行
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --src-path backend.zip \
  --type zip

# クリーンアップ
rm backend.zip

echo "=================================================="
echo "バックエンドのデプロイが完了しました"
echo "API URL: https://$BACKEND_URL"
echo "API Docs: https://$BACKEND_URL/docs"
echo "=================================================="
```

### 5.4 (代替) Git デプロイの設定

ZIP デプロイの代わりに Git を使用する場合：

```bash
# ローカル Git デプロイを有効化
az webapp deployment source config-local-git \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP

# デプロイ用 Git URL を取得
export GIT_URL=$(az webapp deployment source config-local-git \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --query url -o tsv)

echo "Git URL: $GIT_URL"

# Git リモートを追加（backend ディレクトリで実行）
cd $PROJECT_ROOT/backend
git remote add azure $GIT_URL

# デプロイ
git push azure main:master
```

---

## 6. フロントエンドのデプロイ

### 6.1 App Service の設定

```bash
# Node.js バージョンを設定
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --linux-fx-version "NODE|18-lts"
```

### 6.2 環境変数の設定

```bash
# フロントエンドの環境変数を設定
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --settings \
    VITE_API_URL="https://${BACKEND_URL}/api" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"
```

### 6.3 フロントエンドのビルドとデプロイ

```bash
# frontend ディレクトリに移動
cd $PROJECT_ROOT/frontend

# .env.production を作成
cat > .env.production << EOF
VITE_API_URL=https://${BACKEND_URL}/api
EOF

# 依存関係のインストール
npm install

# プロダクションビルド
npm run build

# PM2 設定ファイルを作成（静的ファイル配信用）
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: "frontend",
    script: "npx",
    args: "serve -s dist -l 8080",
    env: {
      NODE_ENV: "production"
    }
  }]
};
EOF

# package.json に serve を追加（存在しない場合）
npm install serve --save

# デプロイ用にパッケージング
zip -r frontend.zip dist package.json package-lock.json ecosystem.config.js node_modules \
  -x "node_modules/.cache/*"

# デプロイ実行
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --src-path frontend.zip \
  --type zip

# クリーンアップ
rm frontend.zip

echo "=================================================="
echo "フロントエンドのデプロイが完了しました"
echo "Frontend URL: https://$FRONTEND_URL"
echo "=================================================="
```

### 6.4 スタートアップコマンドの設定

```bash
# フロントエンドのスタートアップコマンドを設定
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --startup-file "npx serve -s dist -l 8080"
```

---

## 7. 環境変数の設定（一括確認）

### 7.1 バックエンド環境変数の確認

```bash
az webapp config appsettings list \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --output table
```

### 7.2 フロントエンド環境変数の確認

```bash
az webapp config appsettings list \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --output table
```

---

## 8. データベースマイグレーション

### 8.1 ローカルからマイグレーション実行

```bash
# backend ディレクトリに移動
cd $PROJECT_ROOT/backend

# 仮想環境を作成（まだない場合）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係をインストール
pip install -r requirements.txt

# 環境変数を設定
export DATABASE_URL="mysql+aiomysql://${MYSQL_ADMIN_USER}:${MYSQL_ADMIN_PASSWORD}@${MYSQL_HOST}:3306/${MYSQL_DB}?ssl=true"

# Alembic マイグレーションを実行
alembic upgrade head

# マイグレーション状態を確認
alembic current
```

### 8.2 シードデータの投入

```bash
# シードデータを投入（必要な場合）
python -m app.db.seed
```

### 8.3 (代替) App Service 上でマイグレーション実行

```bash
# App Service に SSH 接続
az webapp ssh --resource-group $RESOURCE_GROUP --name $BACKEND_APP

# SSH 接続後、以下を実行
cd /home/site/wwwroot
alembic upgrade head
```

---

## 9. 動作確認

### 9.1 バックエンド確認

```bash
# ヘルスチェック
curl -s "https://${BACKEND_URL}/" | head -20

# API ドキュメント確認
echo "API Docs: https://${BACKEND_URL}/docs"
open "https://${BACKEND_URL}/docs"  # macOS
```

### 9.2 フロントエンド確認

```bash
# フロントエンド確認
echo "Frontend: https://${FRONTEND_URL}"
open "https://${FRONTEND_URL}"  # macOS
```

### 9.3 ログの確認

```bash
# バックエンドのログをストリーミング
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP

# フロントエンドのログをストリーミング
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP
```

### 9.4 App Service の状態確認

```bash
# バックエンドの状態
az webapp show \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --query "state" -o tsv

# フロントエンドの状態
az webapp show \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --query "state" -o tsv
```

---

## 10. トラブルシューティング

### 10.1 よくある問題と解決方法

#### App Service が起動しない

```bash
# ログを確認
az webapp log download \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --log-file logs.zip

unzip logs.zip -d logs
cat logs/LogFiles/kudu/trace/*.txt
```

#### データベース接続エラー

```bash
# MySQL 接続テスト
mysql -h ${MYSQL_HOST} -u ${MYSQL_ADMIN_USER} -p${MYSQL_ADMIN_PASSWORD} --ssl-mode=REQUIRED -e "SELECT 1;"

# ファイアウォールルールを確認
az mysql flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --output table
```

#### CORS エラー

```bash
# CORS 設定を確認
az webapp config appsettings list \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --query "[?name=='CORS_ORIGINS'].value" -o tsv

# CORS を更新
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --settings CORS_ORIGINS="[\"https://${FRONTEND_URL}\"]"
```

#### 502 Bad Gateway

```bash
# App Service を再起動
az webapp restart \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP

# スケールアップ（リソース不足の場合）
az appservice plan update \
  --resource-group $RESOURCE_GROUP \
  --name <APP_SERVICE_PLAN_NAME> \
  --sku B2
```

### 10.2 App Service の再起動

```bash
# バックエンドを再起動
az webapp restart \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP

# フロントエンドを再起動
az webapp restart \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP
```

### 10.3 環境変数の更新

```bash
# 単一の環境変数を更新
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --settings KEY="VALUE"

# 環境変数を削除
az webapp config appsettings delete \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --setting-names KEY
```

---

## 11. Google OAuth 設定

Google Cloud Console での設定が必要です：

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」
4. OAuth 2.0 クライアント ID を選択
5. 「承認済みのリダイレクト URI」に以下を追加：

```
https://koya-app-backend-dev.azurewebsites.net/api/auth/google/callback
```

6. 保存

---

## 12. デプロイ後の URL 一覧

| サービス | URL |
|---------|-----|
| Frontend | `https://koya-app-frontend-dev.azurewebsites.net` |
| Backend API | `https://koya-app-backend-dev.azurewebsites.net` |
| API Docs | `https://koya-app-backend-dev.azurewebsites.net/docs` |
| MySQL | `koya-mysql-dev.mysql.database.azure.com` |

---

## チェックリスト

デプロイ完了後、以下を確認してください：

- [ ] バックエンド API が応答する (`/docs` にアクセス)
- [ ] フロントエンドが表示される
- [ ] Google ログインが機能する
- [ ] データベースに接続できる
- [ ] Gemini AI が応答する
- [ ] CORS エラーが発生しない

---

作成日: 2024年
対象アプリ: 探究学習日記アプリ (Tech0 AInamai)
リソース: Azure App Service + MySQL Flexible Server
