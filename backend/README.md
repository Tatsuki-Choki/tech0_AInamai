# 探究学習日記アプリ - バックエンドAPI

## 概要

探究学習日記アプリのバックエンドAPIです。FastAPIで構築されています。

## 技術スタック

- **フレームワーク**: FastAPI
- **データベース**: PostgreSQL (Azure Database for PostgreSQL)
- **ORM**: SQLAlchemy 2.0 (async)
- **マイグレーション**: Alembic
- **認証**: Google OAuth 2.0 + JWT
- **AI**: Gemini API

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集して必要な値を設定
```

### 2. Docker Compose で起動（推奨）

```bash
docker-compose up -d
```

### 3. ローカルで起動

```bash
# 仮想環境の作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

# データベースのマイグレーション
alembic upgrade head

# シードデータの投入
python -m app.db.seed

# 開発サーバーの起動
uvicorn app.main:app --reload
```

## APIドキュメント

サーバー起動後、以下のURLでAPIドキュメントを確認できます：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 主要エンドポイント

### 認証
- `GET /api/auth/google/login` - Google認証URL取得
- `POST /api/auth/google/callback` - Google認証コールバック
- `GET /api/auth/me` - 現在のユーザー情報

### ユーザー管理
- `GET /api/users/profile` - プロフィール取得
- `PUT /api/users/profile` - プロフィール更新
- `GET /api/users/students` - 担当生徒一覧（教師用）
- `GET /api/users/teachers` - 担当教師一覧（生徒用）

### 研究テーマ
- `GET /api/themes` - テーマ一覧
- `POST /api/themes` - テーマ作成
- `GET /api/themes/current` - 現在のテーマ

### 日報
- `GET /api/reports` - 日報一覧
- `POST /api/reports` - 日報作成
- `GET /api/reports/streak` - 継続記録

### マスタデータ
- `GET /api/master/abilities` - 7つの能力一覧
- `GET /api/master/research-phases` - 探究フェーズ一覧

### AI機能
- `POST /api/ai/chat` - AI校長チャット
- `GET /api/ai/advice/{student_id}` - 教師向けAIアドバイス

### 教師ダッシュボード
- `GET /api/dashboard/students` - 担当生徒一覧（詳細）
- `GET /api/dashboard/students/{id}` - 生徒詳細
- `GET /api/dashboard/students/{id}/reports` - 生徒の日報一覧

## データベーススキーマ

### 主要テーブル

- `users` - ユーザー基本情報
- `students` - 生徒プロフィール
- `teachers` - 教師プロフィール
- `student_teachers` - 生徒-教師関係（多対多）
- `abilities` - 7つの能力マスタ
- `research_phases` - 探究フェーズマスタ
- `research_themes` - 探究テーマ
- `reports` - 日報
- `report_abilities` - 日報-能力関係
- `streak_records` - 継続記録
- `evaluations` - 評価データ

## ディレクトリ構造

```
backend/
├── alembic/              # マイグレーション
│   └── versions/
├── app/
│   ├── api/
│   │   └── endpoints/    # APIエンドポイント
│   ├── core/             # 設定、セキュリティ
│   ├── db/               # データベース接続
│   ├── models/           # SQLAlchemyモデル
│   ├── schemas/          # Pydanticスキーマ
│   ├── services/         # ビジネスロジック
│   └── main.py           # アプリケーションエントリ
├── tests/
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md
```

## 開発

### マイグレーションの作成

```bash
alembic revision --autogenerate -m "description"
```

### マイグレーションの適用

```bash
alembic upgrade head
```

### テストの実行

```bash
pytest
```
