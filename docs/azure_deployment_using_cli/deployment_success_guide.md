# Azure App Service デプロイ成功手順書 (CLI版)

本ドキュメントは、PythonバックエンドとReactフロントエンドをAzure CLIを使用してAzure App Service (Linux) に正常にデプロイするための構成と手順をまとめたものです。
過去に発生した「504 Gateway Timeout」および「ContainerTimeout」エラーを回避するための重要な設定を含みます。

## 1. 全体共通の重要設定

### 非同期デプロイとタイムアウト延長
Azure Load Balancerの230秒制限（504エラーの原因）と、コンテナ起動の遅延（ContainerTimeoutの原因）を回避するため、以下の設定を両方のアプリに適用しています。

- **デプロイコマンド**: `az webapp deploy --async true`
    - CLIがデプロイ完了を待たずに終了し、Azure側で処理を継続させます。ロードバランサーのタイムアウトを回避します。
- **App Settings**:
    - `SCM_COMMAND_IDLE_TIMEOUT=1800`: ビルド処理のアイドルタイムアウトを30分に延長。
    - `WEBSITES_CONTAINER_START_TIME_LIMIT=1800`: コンテナ起動の許容時間を30分に延長。

---

## 2. バックエンド (Python/FastAPI)

### デプロイ戦略: Server-side Build (Oryx)
ローカルでの依存関係解決（`pip install`）はOS非互換やZIPサイズ肥大化の原因となるため、ソースコードのみをアップロードし、Azure側でビルドを実行させます。

### 構成詳細
- **デプロイ対象**:
    - `app/` (ソースコード)
    - `requirements.txt`
    - `alembic/`, `alembic.ini`, `startup.sh`
    - **除外**: `.python_packages`, `__pycache__`, `venv`
- **App Service 設定**:
    - `SCM_DO_BUILD_DURING_DEPLOYMENT=true`: デプロイ時にAzure側でOryxビルド（`pip install`等）を実行。
    - `ENABLE_ORYX_BUILD=true`: Oryxビルドを明示的に有効化。
    - `PYTHONPATH`: **設定しない**（Oryxが自動管理するため削除）。
- **スタートアップコマンド**:
    ```bash
    python -m gunicorn --bind=0.0.0.0:8000 --workers=2 --access-logfile - --error-logfile - -k uvicorn.workers.UvicornWorker app.main:app
    ```
    ※ `python -m gunicorn` とすることで、パスの問題を回避しています。

### デプロイ実行スクリプト
`backend/deploy_backend.sh`

---

## 3. フロントエンド (React/Vite)

### デプロイ戦略: Pre-built Assets + Custom Express Server
静的ファイル配信のみであればもっと単純化できますが、Azure App Service Linuxコンテナ上での「ポートバインディング」と「SPAルーティング」を確実に制御するため、カスタムNodeサーバー (`server.cjs`) を同梱します。

### 構成詳細
- **デプロイ対象**:
    - `dist/` (ローカルで `npm run build` した成果物)
    - `server.cjs` (カスタムサーバー)
    - `package.json` (サーバー起動用、最小限のExpress依存)
    - **除外**: 開発用の `node_modules` (デプロイ用パッケージ内で `npm install` するため不要だが、今回は `dist` と `server.cjs` のみで軽量化)
- **App Service 設定**:
    - `SCM_DO_BUILD_DURING_DEPLOYMENT=true`: デプロイ時にサーバー用の依存関係 (`express`) をインストール。
    - `WEBSITE_NODE_DEFAULT_VERSION=~20`: Node.js バージョン指定。
    - `WEBSITES_PORT`: **設定しない**（Azureが自動設定する `PORT` 環境変数を使用するため）。
- **スタートアップコマンド**:
    ```bash
    npm start
    ```
    ※ `package.json` で `"start": "node server.cjs"` と定義されています。

### カスタムサーバー (`server.cjs`) の役割
- **ポート待受**: `process.env.PORT` をリッスンすることで、Azureのロードバランサーと正しく接続します（これが `ContainerTimeout` の解決策）。
- **SPA対応**: どのURLパスにアクセスされても `index.html` を返すことで、ブラウザ側のReactルーティングを機能させます。
- **CommonJS強制**: 拡張子を `.cjs` にすることで、プロジェクトが ESM (`type: "module"`) であっても確実に動作させます。

### デプロイ実行スクリプト
`frontend/deploy_frontend.sh`

---

## 4. 今後の運用について

### コード修正後の際デプロイ
1. フロントエンドまたはバックエンドのコードを修正。
2. 対応するデプロイスクリプトを実行。
   ```bash
   ./backend/deploy_backend.sh
   # または
   ./frontend/deploy_frontend.sh
   ```
3. デプロイは非同期 (`--async`) で開始されるため、完了まで数分待ちます。
4. 以下のURLで動作確認を行います。
   - Frontend: https://koya-app-frontend-dev.azurewebsites.net
   - Backend Health: https://koya-app-backend-dev.azurewebsites.net/health

## 5. トラブルシューティング

### よくあるエラーと対処

#### 1. Backend: ValueError: badly formed hexadecimal UUID string
- **現象**: アプリが起動せず、ログにこのエラーが繰り返される。
- **原因**: データベース内のデータ形式と、コード内のUUIDパース処理の不整合。Azure上のデータが古い（シードデータなど）場合に発生しやすい。
- **対処**: `app/models/base.py` の `UUID36.process_result_value` メソッドで、`uuid.UUID` への変換を強制せず、純粋な文字列として返すように修正されているか確認する（`return str(value)`）。

