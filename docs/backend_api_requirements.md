# バックエンドAPI要件定義書

## 1. 概要

本ドキュメントは、探究学習日記アプリのバックエンドAPI設計に関する要件を定義します。

### 1.1 対象システム
- 探究学習日記アプリ（生徒向け日報入力・教師向けダッシュボード）
- AI機能（Gemini API連携）
- RAG基盤（校長思想データベース）

### 1.2 技術スタック
| 項目 | 技術 | 備考 |
|------|------|------|
| クラウド | Azure | 確定 |
| データベース | Azure Database | 確定 |
| AI/LLM | Gemini API | 確定 |
| RAG | Gemini File Search Store | 確定 |
| 認証 | Google Authentication | 確定 |
| APIフレームワーク | **検討中** | Next.js API Routes または Azure Functions |

---

## 2. APIフレームワーク

### 2.1 ステータス
**検討中** - フロントエンドエンジニアと相談して決定

### 2.2 選択肢と比較

| 観点 | Next.js API Routes | Azure Functions |
|------|-------------------|-----------------|
| 開発効率 | ◎ フロントと同一プロジェクト | △ 別プロジェクト管理 |
| スケーラビリティ | ○ Vercel/Azure App Serviceで対応可 | ◎ 自動スケール |
| コスト | ○ 固定費用 | ◎ 従量課金（使った分だけ） |
| コールドスタート | ◎ なし | △ あり（初回リクエスト遅延） |
| 学習コスト | ◎ 低い | ○ 中程度 |

### 2.3 推奨案
ユーザー数300〜400人程度の規模を考慮すると、**Next.js API Routes**を推奨。
- 理由：開発効率が高く、フロントエンドとの統合が容易
- 将来的にスケールが必要になった場合、Azure App Serviceで対応可能

---

## 3. API設計方針

### 3.1 設計原則
- RESTful API設計
- JSON形式でのリクエスト/レスポンス
- 適切なHTTPステータスコードの使用
- エラーレスポンスの統一フォーマット

### 3.2 エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### 3.3 ページネーション形式
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 4. APIエンドポイント一覧

### 4.1 認証関連

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| POST | `/api/auth/google` | Google認証コールバック | 不要 |
| POST | `/api/auth/logout` | ログアウト | 必要 |
| GET | `/api/auth/me` | 現在のユーザー情報取得 | 必要 |

### 4.2 ユーザー管理

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/api/users/profile` | プロフィール取得 | 本人 |
| PUT | `/api/users/profile` | プロフィール更新 | 本人 |
| GET | `/api/users/students` | 担当生徒一覧（教師用） | 教師 |
| GET | `/api/users/teachers` | 担当教師一覧（生徒用） | 生徒 |

### 4.3 研究テーマ

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/api/themes` | 研究テーマ取得 | 本人/担当教師 |
| POST | `/api/themes` | 研究テーマ作成 | 生徒 |
| PUT | `/api/themes/:id` | 研究テーマ更新 | 生徒 |

### 4.4 日報（DailyReport）

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/api/reports` | 日報一覧取得 | 本人/担当教師 |
| GET | `/api/reports/:id` | 日報詳細取得 | 本人/担当教師 |
| POST | `/api/reports` | 日報作成 | 生徒 |
| PUT | `/api/reports/:id` | 日報更新 | 生徒 |
| DELETE | `/api/reports/:id` | 日報削除 | 生徒 |

#### リクエスト例（日報作成）
```json
{
  "content": "今日はインタビュー調査を実施しました...",
  "inquiryPhaseId": "phase_uuid",
  "selectedAbilityIds": ["ability_uuid_1", "ability_uuid_2"],
  "selfEvaluations": [
    {
      "abilityId": "ability_uuid_1",
      "score": 3
    },
    {
      "abilityId": "ability_uuid_2",
      "score": 4
    }
  ]
}
```

#### レスポンス例
```json
{
  "id": "report_uuid",
  "content": "今日はインタビュー調査を実施しました...",
  "inquiryPhase": {
    "id": "phase_uuid",
    "name": "情報の収集"
  },
  "selectedAbilities": [
    {"id": "ability_uuid_1", "name": "課題発見力"},
    {"id": "ability_uuid_2", "name": "計画実行力"}
  ],
  "selfEvaluations": [...],
  "aiEvaluation": null,
  "aiComment": "素晴らしい取り組みですね！...",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 4.5 評価関連

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/api/reports/:id/evaluations` | 評価一覧取得 | 本人/担当教師 |
| POST | `/api/reports/:id/evaluations/ai` | AI評価生成 | システム |
| POST | `/api/reports/:id/evaluations/teacher` | 教師訂正評価登録 | 担当教師 |
| PUT | `/api/reports/:id/evaluations/teacher` | 教師訂正評価更新 | 担当教師 |

#### 評価レスポンス例
```json
{
  "reportId": "report_uuid",
  "evaluations": {
    "selfEvaluation": {
      "abilities": [
        {"abilityId": "uuid", "abilityName": "課題発見力", "score": 3}
      ],
      "evaluatedAt": "2024-01-15T10:30:00Z"
    },
    "aiEvaluation": {
      "abilities": [
        {"abilityId": "uuid", "abilityName": "課題発見力", "score": 4, "reason": "..."}
      ],
      "evaluatedAt": "2024-01-15T10:30:05Z"
    },
    "teacherEvaluation": {
      "abilities": [
        {"abilityId": "uuid", "abilityName": "課題発見力", "score": 3}
      ],
      "evaluatedAt": "2024-01-15T15:00:00Z",
      "teacherId": "teacher_uuid"
    },
    "finalEvaluation": {
      "abilities": [
        {"abilityId": "uuid", "abilityName": "課題発見力", "score": 3.33}
      ],
      "calculatedAt": "2024-01-15T15:00:00Z"
    }
  }
}
```

### 4.6 AI機能

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| POST | `/api/ai/comment` | AIコメント生成 | 生徒 |
| POST | `/api/ai/chat` | AI校長チャット | 生徒 |
| GET | `/api/ai/advice/:studentId` | 教師向けAIアドバイス | 担当教師 |

#### AI校長チャット リクエスト例
```json
{
  "message": "探究活動で行き詰まっています..."
}
```

#### AI校長チャット レスポンス例
```json
{
  "response": "なるほど、行き詰まりを感じているのですね...",
  "sources": [
    {
      "title": "13歳からのアントレプレナーシップ",
      "excerpt": "失敗は成功の母である..."
    }
  ]
}
```

### 4.7 教師ダッシュボード

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/api/dashboard/students` | 担当生徒一覧（進捗含む） | 教師 |
| GET | `/api/dashboard/students/:id` | 生徒詳細情報 | 担当教師 |
| GET | `/api/dashboard/students/:id/reports` | 生徒の日報一覧 | 担当教師 |
| GET | `/api/dashboard/students/:id/evaluations` | 生徒の評価推移 | 担当教師 |
| GET | `/api/dashboard/analytics` | クラス全体の分析 | 教師 |

#### 担当生徒一覧レスポンス例
```json
{
  "students": [
    {
      "id": "student_uuid",
      "name": "山田太郎",
      "grade": 2,
      "className": "A組",
      "researchTheme": "地域活性化について",
      "lastReportDate": "2024-01-15",
      "totalReports": 45,
      "currentPhase": "整理・分析",
      "overallProgress": {
        "abilities": [
          {"name": "課題発見力", "averageScore": 3.5, "count": 15},
          {"name": "計画実行力", "averageScore": 4.2, "count": 12}
        ]
      },
      "isPrimary": true
    }
  ],
  "pagination": {...}
}
```

### 4.8 マスタデータ

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/api/master/abilities` | 能力一覧取得 | 全ユーザー |
| GET | `/api/master/inquiry-phases` | 探究フェーズ一覧取得 | 全ユーザー |
| GET | `/api/master/academic-years` | 年度一覧取得 | 全ユーザー |

### 4.9 管理者機能（検討中）

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| POST | `/api/admin/abilities` | 能力マスタ追加 | 管理者 |
| PUT | `/api/admin/abilities/:id` | 能力マスタ更新 | 管理者 |
| POST | `/api/admin/users/import` | ユーザー一括登録 | 管理者 |
| GET | `/api/admin/users` | 全ユーザー一覧 | 管理者 |

---

## 5. 外部連携

### 5.1 必須連携

| サービス | 用途 | 連携方法 |
|---------|------|---------|
| Gemini API | AI評価・コメント生成 | REST API |
| Gemini File Search Store | RAG（校長思想検索） | REST API |
| Google OAuth 2.0 | ユーザー認証 | OAuth 2.0 |

### 5.2 オプション連携（検討中）

| サービス | 用途 | ステータス |
|---------|------|----------|
| Azure Blob Storage | ファイルアップロード | 不要（テキストのみ） |
| メール通知 | 通知機能 | 検討中 |
| Google Classroom | クラス連携 | 将来検討 |

---

## 6. セキュリティ要件

### 6.1 認証・認可
- Google OAuth 2.0による認証
- JWT（JSON Web Token）によるセッション管理
- ロールベースアクセス制御（RBAC）
  - 生徒：自分のデータのみアクセス可能
  - 教師：担当生徒のデータのみアクセス可能
  - 管理者：全データアクセス可能（検討中）

### 6.2 データ保護
- HTTPS必須
- 入力値のバリデーション
- SQLインジェクション対策
- XSS対策

### 6.3 レート制限

#### ステータス
**検討中** - AI関連APIのコスト考慮が必要

#### 推奨案
| エンドポイント種別 | 制限 | 理由 |
|------------------|------|------|
| 一般API | 100リクエスト/分 | 通常利用で十分 |
| AI関連API | 10リクエスト/分 | LLMコスト削減 |
| 日報作成 | 20件/日 | 不正利用防止 |

---

## 7. パフォーマンス要件

### 7.1 レスポンスタイム目標
| API種別 | 目標時間 | 備考 |
|---------|---------|------|
| 一般API | < 200ms | CRUD操作 |
| 一覧取得（ページネーション付） | < 500ms | インデックス最適化 |
| AI評価生成 | < 5秒 | Gemini API依存 |
| AI校長チャット | < 10秒 | RAG検索 + 生成 |

### 7.2 同時接続数
- 想定ユーザー数：300〜400人
- ピーク時同時接続：50〜100人程度
- 必要スループット：100 RPS以上

---

## 8. 未決定事項一覧

| 項目 | 選択肢 | 決定期限 | 担当 |
|------|--------|---------|------|
| APIフレームワーク | Next.js API Routes / Azure Functions | 要相談 | フロントエンドエンジニア |
| レート制限値 | 具体的な数値 | 開発時 | バックエンドエンジニア |
| 管理者ロール設計 | 専用ロール / 教師権限拡張 | 要相談 | プロジェクトマネージャー |
| ユーザー登録フロー | 事前登録 / 招待コード / CSV | 要相談 | プロジェクトマネージャー |

---

## 9. 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2024-01-15 | 1.0 | 初版作成 |
