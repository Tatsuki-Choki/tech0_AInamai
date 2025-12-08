# 探究学習日記アプリ (AInamai)

探究学習の進捗を記録し、AI校長「生意君」がサポートする学習支援アプリケーション。

## 概要

生徒が日々の探究学習の活動を記録し、AIが7つの能力の観点からフィードバックを提供します。教師は生徒の進捗をダッシュボードで確認できます。

### 主な機能

- **日報記録**: 探究学習の日々の活動を記録
- **AI分析**: Gemini AIが報告内容を分析し、フェーズと能力を提案
- **AIチャット**: AI校長「生意君」との対話（RAGで書籍の内容を参照）
- **振り返り**: カレンダー形式で過去の報告を確認
- **教師ダッシュボード**: 担当生徒の進捗確認とAIアドバイス

### 7つの能力

1. 情報収集能力と先を見る力
2. 課題設定能力と構想する力
3. 巻き込む力
4. 対話する力
5. 実行する力
6. 謙虚である力
7. 完遂する力

## 技術スタック

### Backend
- **FastAPI** - 非同期WebフレームワークR
- **PostgreSQL** - データベース
- **SQLAlchemy** - ORM（非同期対応）
- **Alembic** - データベースマイグレーション
- **Google OAuth 2.0** - 認証
- **Gemini AI** - AI分析・チャット・RAG

### Frontend
- **React 18** + **TypeScript**
- **Vite** - ビルドツール
- **TailwindCSS** - スタイリング
- **React Router** - ルーティング
- **Axios** - HTTPクライアント

### Infrastructure
- **Docker** + **Docker Compose** - コンテナ化

## セットアップ

### 必要条件

- Docker & Docker Compose
- Node.js 18+
- Google Cloud Console アカウント（OAuth設定用）
- Gemini API キー

### 環境変数

`backend/.env` を作成:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# JWT
JWT_SECRET_KEY=your_secret_key

# CORS
CORS_ORIGINS=["http://localhost:5173"]
```

### 起動方法

#### Backend

```bash
cd backend
docker-compose up -d
```

APIは http://localhost:8000 で起動します。
- API Docs: http://localhost:8000/docs

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは http://localhost:5173 で起動します。

### データベースマイグレーション

```bash
docker exec tankyu_diary_api alembic upgrade head
```

### 初期データ投入

```bash
docker exec tankyu_diary_api python -m app.db.seed
```

## プロジェクト構成

```
tech0_AInamai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/      # APIエンドポイント
│   │   ├── core/               # 設定、セキュリティ
│   │   ├── db/                 # データベース設定
│   │   ├── models/             # SQLAlchemyモデル
│   │   ├── schemas/            # Pydanticスキーマ
│   │   └── services/           # ビジネスロジック
│   │       ├── ai.py           # AI機能
│   │       ├── analysis.py     # 報告分析
│   │       └── rag.py          # RAGサービス
│   ├── alembic/                # マイグレーション
│   ├── docker-compose.yml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/         # Reactコンポーネント
│   │   └── lib/                # ユーティリティ
│   └── package.json
└── docs/
    └── Diary_App_RAG_Gemini/   # RAG用PDFファイル
```

## API エンドポイント

### 認証
- `GET /api/auth/google` - Google OAuth開始
- `GET /api/auth/google/callback` - OAuthコールバック

### 報告
- `GET /api/reports/` - 報告一覧
- `POST /api/reports/` - 報告作成
- `POST /api/reports/analyze` - AI分析
- `GET /api/reports/calendar` - カレンダーデータ
- `GET /api/reports/by-date/{date}` - 日付別報告

### テーマ
- `GET /api/themes/current` - 現在のテーマ
- `POST /api/themes` - テーマ作成

### AI
- `POST /api/ai/chat` - AIチャット（RAG対応）

## RAG機能

AI校長「生意君」は書籍「13歳からのアントレプレナーシップ」の内容をRAG（Retrieval-Augmented Generation）で参照し、具体的なページ番号や章を引用しながらアドバイスを提供します。

PDFファイルはGemini File APIにアップロードされ、チャット時に自動的に参照されます。

### RAGの仕組み

```
docs/
└── Diary_App_RAG_Gemini/
    └── 13歳からのアントレプレナーシップ.pdf  ← RAG用PDF
        ↓
    Docker Volume マウント (../docs:/docs:ro)
        ↓
    backend/app/services/rag.py
        ↓
    Gemini File API にアップロード（48時間有効、24時間で自動更新）
        ↓
    AIチャット時に参照
```

### RAGデータの追加・変更方法

#### 1. PDFファイルを配置

```bash
# プロジェクトルートに docs ディレクトリがあることを確認
ls docs/Diary_App_RAG_Gemini/

# 新しいPDFファイルを配置
cp /path/to/your/book.pdf docs/Diary_App_RAG_Gemini/
```

#### 2. RAG設定ファイルを更新

`backend/app/services/rag.py` を編集：

```python
# 18-20行目を変更
PDF_FILE_PATH = "/docs/Diary_App_RAG_Gemini/新しいファイル名.pdf"
PDF_DISPLAY_NAME = "new_book_name"  # Gemini上での識別名（英数字推奨）
```

#### 3. プロンプトを調整（任意）

`backend/app/services/rag.py` の125-128行目で、AIへの指示を変更できます：

```python
contents.append(
    "上記の書籍「新しい書籍名」の内容を参考に、"
    "以下の質問に答えてください。書籍の内容を引用する場合は、"
    "具体的なページや章を示してください。\n\n"
)
```

#### 4. アプリケーションを再起動

```bash
cd backend
docker-compose restart api
```

#### 5. RAGの初期化を確認

```bash
# ログでRAG初期化を確認
docker-compose logs api | grep -i "rag\|pdf\|upload"

# 成功時の出力例：
# Uploading PDF from /docs/Diary_App_RAG_Gemini/新しいファイル名.pdf...
# Waiting for file processing...
# File uploaded successfully: files/xxxxx
# RAG initialized with file: files/xxxxx
```

### 複数PDFの利用（上級）

複数のPDFを使用する場合は、`rag.py` を拡張します：

```python
# 例: 複数ファイルの定義
PDF_FILES = [
    {
        "path": "/docs/Diary_App_RAG_Gemini/book1.pdf",
        "display_name": "book1",
    },
    {
        "path": "/docs/Diary_App_RAG_Gemini/book2.pdf",
        "display_name": "book2",
    },
]
```

### トラブルシューティング

| 問題 | 原因 | 解決方法 |
|------|------|----------|
| RAGが動作しない | PDFファイルが見つからない | `docker-compose exec api ls -la /docs/` で確認 |
| アップロードエラー | Gemini APIキー未設定 | `.env` の `GEMINI_API_KEY` を確認 |
| 48時間後にエラー | ファイル期限切れ | 自動更新されるが、手動で `docker-compose restart api` |
| PDFが大きすぎる | Gemini制限 | 20MB以下のPDFを使用、または分割 |

### Gemini File APIの制限

- **ファイルサイズ**: 最大 20MB（PDFの場合）
- **有効期限**: アップロード後48時間
- **自動更新**: 24時間経過で自動再アップロード
- **対応形式**: PDF, テキスト, 画像など

## ライセンス

Private

## 作者

Tech0 AInamai Team
