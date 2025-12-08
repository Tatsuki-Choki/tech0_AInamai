# フロントエンド・バックエンド連携ガイド

## 1. 概要

本ドキュメントは、フロントエンド実装とバックエンドAPIの連携に必要な情報をまとめたものです。

**重要な差異**がいくつかありますので、フロントエンドの修正が必要です。

---

## 2. 重要な差異と対応依頼

### 2.1 認証方式の変更（要対応）

| 項目 | フロントエンド現状 | バックエンド実装 |
|------|------------------|-----------------|
| 認証方式 | 名前・パスワード | **Google OAuth 2.0** |
| 対象画面 | `StudentLogin`, `TeacherLogin` | Google認証ボタン |

**対応依頼**:
- `StudentLogin` / `TeacherLogin` コンポーネントを **Googleログインボタン** に置き換えてください
- 認証フローは以下の通りです:

```
1. フロントエンド: GET /api/auth/google/login を呼び出し
   → レスポンスの auth_url を取得

2. フロントエンド: auth_url にリダイレクト（またはポップアップ）
   → ユーザーがGoogleで認証

3. Google: redirect_uri にコールバック（認証コード付き）
   → フロントエンドのコールバックページで受け取り

4. フロントエンド: POST /api/auth/google/callback
   Body: { "code": "認証コード" }
   → JWTトークンとユーザー情報を取得

5. フロントエンド: トークンをlocalStorageに保存
   → 以降のAPIリクエストに Authorization: Bearer {token} を付与
```

### 2.2 APIエンドポイントのプレフィックス

| フロントエンド想定 | バックエンド実装 |
|------------------|-----------------|
| `/auth/login` | `/api/auth/google/callback` |
| `/reports` | `/api/reports` |
| `/teacher/students` | `/api/dashboard/students` |

**対応依頼**: 全てのAPIコールに `/api` プレフィックスを追加してください。

```typescript
// Before
const response = await fetch('/reports');

// After
const response = await fetch('/api/reports');
```

---

## 3. APIエンドポイント対応表

### 3.1 認証

| フロントエンド想定 | バックエンドAPI | メソッド | 備考 |
|------------------|----------------|---------|------|
| `POST /auth/login` | `POST /api/auth/google/callback` | POST | Google認証コールバック |
| - | `GET /api/auth/google/login` | GET | Google認証URL取得 |
| `GET /users/me` | `GET /api/auth/me` | GET | ログインユーザー情報 |
| `POST /auth/logout` | `POST /api/auth/logout` | POST | ログアウト |

### 3.2 報告（生徒機能）

| フロントエンド想定 | バックエンドAPI | メソッド | 備考 |
|------------------|----------------|---------|------|
| `POST /reports/analyze` | `POST /api/reports/analyze` | POST | AI分析（プレビュー用） |
| `POST /reports` | `POST /api/reports` | POST | 報告保存 |
| `GET /reports/calendar` | `GET /api/reports/calendar` | GET | カレンダー用日付 |
| `GET /reports/summary` | `GET /api/reports/summary` | GET | サマリー（レーダーチャート用） |
| `GET /reports/{date}` | `GET /api/reports/by-date/{date}` | GET | 日付指定で報告取得 |
| - | `GET /api/reports/streak` | GET | 継続記録 |

### 3.3 テーマ・マスタ

| バックエンドAPI | メソッド | 備考 |
|----------------|---------|------|
| `GET /api/themes/current` | GET | 現在の研究テーマ |
| `POST /api/themes` | POST | テーマ作成 |
| `GET /api/master/abilities` | GET | 7つの能力一覧 |
| `GET /api/master/research-phases` | GET | 探究フェーズ一覧 |

### 3.4 教師機能

| フロントエンド想定 | バックエンドAPI | メソッド | 備考 |
|------------------|----------------|---------|------|
| `GET /teacher/students` | `GET /api/dashboard/students` | GET | 担当生徒一覧 |
| `GET /teacher/students/{id}` | `GET /api/dashboard/students/{id}` | GET | 生徒詳細 |
| - | `GET /api/dashboard/students/{id}/reports` | GET | 生徒の報告一覧 |

### 3.5 AI機能

| バックエンドAPI | メソッド | 備考 |
|----------------|---------|------|
| `POST /api/ai/chat` | POST | AI校長チャット |
| `GET /api/ai/advice/{student_id}` | GET | 教師向けAIアドバイス |

---

## 4. データモデル対応

### 4.1 ユーザー情報

```typescript
// バックエンドレスポンス
interface UserResponse {
  id: string;           // UUID
  email: string;
  name: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'admin';
}

// フロントエンドで必要な変換
// class情報は別途 student-profile から取得
```

### 4.2 能力データ

```typescript
// フロントエンド想定（capabilities 0-100）
interface Capabilities {
  informationGathering: number;
  problemSolving: number;
  // ...
}

// バックエンドレスポンス（/api/reports/summary）
interface CapabilitySummary {
  id: string;
  name: string;      // "情報収集能力と先を見る力" など
  count: number;     // 選択回数
  percentage: number; // 0-100（レーダーチャート用）
}
```

**対応依頼**: レーダーチャートには `percentage` を使用してください。

### 4.3 報告データ

```typescript
// バックエンドレスポンス
interface ReportResponse {
  id: string;
  student_id: string;
  theme_id: string;
  content: string;
  phase?: {
    id: string;
    name: string;
    display_order: number;
  };
  selected_abilities: Array<{
    id: string;
    name: string;
  }>;
  ai_comment?: string;
  reported_at: string; // ISO 8601
  created_at: string;
  updated_at: string;
}
```

---

## 5. フロントエンドで必要な追加実装

### 5.1 必須

1. **Google認証画面**
   - Googleログインボタンを配置
   - `GET /api/auth/google/login` で認証URLを取得
   - Google認証後のコールバック処理

2. **認証状態管理**
   - JWTトークンの保存/読み込み
   - 全APIリクエストへの `Authorization: Bearer {token}` ヘッダー追加
   - トークン期限切れ時のリダイレクト

3. **APIベースURL設定**
   ```typescript
   // 環境変数で管理推奨
   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
   ```

### 5.2 推奨

1. **研究テーマ登録画面**
   - 初回ログイン時、テーマ未登録なら設定を促す

2. **ロール切り替え**
   - 同一アカウントで生徒/教師の両方の権限を持つ場合の対応
   - （現在は簡易方式で全員が最初は生徒ロール）

---

## 6. 認証フロー詳細

### 6.1 ログイン

```typescript
// 1. Google認証URLを取得
const loginResponse = await fetch('/api/auth/google/login');
const { auth_url } = await loginResponse.json();

// 2. Googleにリダイレクト
window.location.href = auth_url;

// --- Google認証後、コールバックURLに戻ってくる ---

// 3. URLから認証コードを取得
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

// 4. バックエンドにコードを送信してJWTを取得
const tokenResponse = await fetch('/api/auth/google/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code }),
});
const { access_token, user } = await tokenResponse.json();

// 5. トークンを保存
localStorage.setItem('access_token', access_token);
localStorage.setItem('user', JSON.stringify(user));
```

### 6.2 認証済みAPIリクエスト

```typescript
const token = localStorage.getItem('access_token');

const response = await fetch('/api/reports', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

if (response.status === 401) {
  // トークン期限切れ → ログイン画面へ
  localStorage.removeItem('access_token');
  window.location.href = '/login';
}
```

---

## 7. 開発環境設定

### 7.1 CORS設定

バックエンドはデフォルトで `http://localhost:3000` からのリクエストを許可しています。
フロントエンドが別ポートで動作する場合は、バックエンドの `.env` で `CORS_ORIGINS` を更新してください。

### 7.2 環境変数

フロントエンドで必要な環境変数:

```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 8. 質問事項・確認依頼

フロントエンドチームに確認したいこと:

1. **ロール切り替えUI**: 管理者が後からユーザーのロールを変更する画面は必要ですか？

2. **エラーハンドリング**: APIエラー時のUI表示方針（トースト通知、モーダル等）

3. **ローディング状態**: AI分析中（3-5秒程度）のローディング表示

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-08 | 初版作成 |
