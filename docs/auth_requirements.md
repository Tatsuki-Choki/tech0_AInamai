# 認証・認可要件定義書

## 1. 概要

本ドキュメントは、探究学習日記アプリにおける認証・認可機能の要件を定義します。

### 1.1 認証方式
**Google OAuth 2.0**（確定）

### 1.2 対象ユーザー
| ロール | 説明 | 想定人数 |
|--------|------|---------|
| 生徒（student） | 日報入力、AI校長チャット | 300-400人 |
| 教師（teacher） | ダッシュボード閲覧、評価訂正 | 20-30人 |
| 管理者（admin） | マスタ管理、ユーザー管理 | 2-3人（検討中） |

---

## 2. Google OAuth 2.0 認証

### 2.1 取得する情報
**基本情報のみ**（確定）

| スコープ | 取得情報 | 用途 |
|---------|---------|------|
| `openid` | OpenID識別子 | ユーザー識別 |
| `email` | メールアドレス | アカウント紐付け |
| `profile` | 名前、プロフィール画像 | 表示用 |

### 2.2 将来の拡張（検討中）
| スコープ | 取得情報 | 用途 | ステータス |
|---------|---------|------|----------|
| Google Classroom | クラス情報、生徒一覧 | クラス連携 | 将来検討 |

### 2.3 認証フロー

```
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌─────────┐
│  User   │     │  App    │     │ Google Auth │     │   API   │
└────┬────┘     └────┬────┘     └──────┬──────┘     └────┬────┘
     │               │                  │                 │
     │ 1. ログインボタンクリック        │                 │
     │──────────────>│                  │                 │
     │               │                  │                 │
     │               │ 2. OAuth URL生成  │                 │
     │               │─────────────────>│                 │
     │               │                  │                 │
     │ 3. Google認証画面リダイレクト    │                 │
     │<─────────────────────────────────│                 │
     │               │                  │                 │
     │ 4. Google認証（ユーザー同意）    │                 │
     │─────────────────────────────────>│                 │
     │               │                  │                 │
     │ 5. 認証コード付きリダイレクト    │                 │
     │<─────────────────────────────────│                 │
     │──────────────>│                  │                 │
     │               │                  │                 │
     │               │ 6. 認証コード→トークン交換         │
     │               │─────────────────>│                 │
     │               │<─────────────────│                 │
     │               │                  │                 │
     │               │ 7. ユーザー情報取得                │
     │               │─────────────────>│                 │
     │               │<─────────────────│                 │
     │               │                  │                 │
     │               │ 8. ユーザー登録/ログイン処理       │
     │               │────────────────────────────────────>│
     │               │<────────────────────────────────────│
     │               │                  │                 │
     │ 9. JWTトークン発行               │                 │
     │<──────────────│                  │                 │
     │               │                  │                 │
```

### 2.4 実装例（Next.js + NextAuth.js）

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 事前登録済みユーザーかチェック
      const existingUser = await db.user.findUnique({
        where: { email: user.email }
      });

      if (!existingUser) {
        // 未登録ユーザーの場合の処理（フローによって異なる）
        return '/auth/not-registered';
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // ユーザーロールをトークンに含める
        const dbUser = await db.user.findUnique({
          where: { email: user.email }
        });
        token.role = dbUser?.role;
        token.userId = dbUser?.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.userId;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## 3. ユーザー登録フロー

### 3.1 ステータス
**検討中** - 以下の選択肢から決定が必要

### 3.2 選択肢と比較

| 方式 | メリット | デメリット | 推奨度 |
|------|---------|----------|-------|
| a) 事前登録 + Google紐付け | セキュリティ高い | 管理者の手間 | ◎ |
| b) 招待コード方式 | 配布が簡単 | コード管理が必要 | ○ |
| c) CSV一括登録 | 大量登録が容易 | ファイル管理 | ○ |
| d) 自由登録 + 承認 | ユーザー負担少 | 承認作業が必要 | △ |

### 3.3 推奨案：事前登録 + Google紐付け

#### フロー
```
1. 管理者がユーザー情報を事前登録（メールアドレス、ロール、学年・クラス等）
2. 生徒/教師がGoogleログイン
3. メールアドレスで既存レコードとマッチング
4. マッチすればログイン成功、しなければエラー
```

#### 理由
- 学校環境では生徒情報が事前に把握できる
- 不正なアカウント作成を防止
- Google Workspaceとの親和性が高い

### 3.4 登録データ項目

#### 事前登録時に必要な情報
| 項目 | 必須 | 備考 |
|------|------|------|
| メールアドレス | ◎ | Google認証のキー |
| 氏名 | ◎ | - |
| ロール | ◎ | student / teacher / admin |
| 学年 | △ | 生徒のみ |
| クラス | △ | 生徒のみ |
| 担当教師ID | △ | 生徒のみ |
| 担当科目 | △ | 教師のみ |

#### CSV一括登録フォーマット例
```csv
email,name,role,grade,class,primary_teacher_email
yamada.taro@school.edu,山田太郎,student,2,A,suzuki@school.edu
tanaka.hanako@school.edu,田中花子,student,2,A,suzuki@school.edu
suzuki@school.edu,鈴木先生,teacher,,,
```

---

## 4. セッション管理

### 4.1 ステータス
**検討中**

### 4.2 選択肢と比較

| 方式 | 有効期限 | ユースケース | 推奨度 |
|------|---------|------------|-------|
| 短め | 1日 | 高セキュリティ環境 | △ |
| 中程度 | 1週間 | バランス型 | ○ |
| 長め | 1ヶ月 | 利便性重視 | ○ |
| オプション付き | 選択可 | 柔軟性 | ◎ |

### 4.3 推奨案

| 設定 | 値 | 理由 |
|------|------|------|
| デフォルト有効期限 | 7日 | 学校の1週間サイクルに合致 |
| 「ログイン状態を保持」選択時 | 30日 | 自宅学習時の利便性 |
| アクセストークン有効期限 | 1時間 | セキュリティ |
| リフレッシュトークン有効期限 | 7日/30日 | 上記に準拠 |

### 4.4 セッション実装

```typescript
// セッション設定例
export const sessionConfig = {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60, // 7日（デフォルト）
  updateAge: 24 * 60 * 60,  // 24時間ごとに更新
};

// 「ログイン状態を保持」の場合
export const extendedSessionConfig = {
  ...sessionConfig,
  maxAge: 30 * 24 * 60 * 60, // 30日
};
```

---

## 5. 複数デバイス対応

### 5.1 ステータス
**検討中**

### 5.2 推奨案
**許可**（同一アカウントで複数デバイス同時ログインOK）

#### 理由
- 学校PC + 自宅PC + スマホの併用が想定される
- 制限するメリットが少ない
- ユーザビリティ向上

#### 実装方針
- 複数の有効なセッションを許可
- 必要に応じて「他デバイスからログアウト」機能を提供

---

## 6. ロールベースアクセス制御（RBAC）

### 6.1 ロール定義

| ロール | コード | 説明 |
|--------|--------|------|
| 生徒 | `student` | 日報入力、自分のデータ閲覧 |
| 教師 | `teacher` | 担当生徒のデータ閲覧・評価訂正 |
| 管理者 | `admin` | 全データ閲覧・マスタ管理（検討中） |

### 6.2 権限マトリクス

| リソース | 操作 | 生徒 | 教師 | 管理者 |
|---------|------|------|------|-------|
| 自分の日報 | CRUD | ◎ | - | ◎ |
| 担当生徒の日報 | 閲覧 | - | ◎ | ◎ |
| 担当生徒の日報 | 評価訂正 | - | ◎ | ◎ |
| 他生徒の日報 | 閲覧 | - | - | ◎ |
| AI校長チャット | 利用 | ◎ | - | - |
| ダッシュボード | 閲覧 | - | ◎ | ◎ |
| マスタデータ | 閲覧 | ◎ | ◎ | ◎ |
| マスタデータ | 編集 | - | - | ◎ |
| ユーザー管理 | CRUD | - | - | ◎ |

### 6.3 教師の権限詳細

**確定事項**：担当生徒のデータのみ閲覧・編集可能

```typescript
// 担当生徒チェックの実装例
async function canAccessStudentData(
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const relationship = await db.teacherStudentRelation.findFirst({
    where: {
      teacherId,
      studentId,
      isActive: true,
    },
  });
  return !!relationship;
}

// ミドルウェア例
export async function teacherAuthMiddleware(req, res, next) {
  const { studentId } = req.params;
  const teacherId = req.user.id;

  if (!await canAccessStudentData(teacherId, studentId)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'この生徒のデータにアクセスする権限がありません',
      }
    });
  }

  next();
}
```

### 6.4 主担当教師フラグ

```typescript
// 主担当教師のみができる操作（将来拡張用）
interface TeacherStudentRelation {
  teacherId: string;
  studentId: string;
  isPrimary: boolean;  // 主担当フラグ
  isActive: boolean;
  assignedAt: Date;
}
```

---

## 7. 管理者機能

### 7.1 ステータス
**検討中**

### 7.2 選択肢

| 方式 | メリット | デメリット |
|------|---------|----------|
| a) 専用管理者ロール | 権限分離が明確 | ロール管理が複雑 |
| b) 教師権限拡張 | シンプル | 権限過多の懸念 |
| c) 開発者直接DB操作 | 初期コスト低 | 運用負荷高 |

### 7.3 推奨案
**a) 専用管理者ロール**

#### 理由
- マスタデータ（7つの能力、探究フェーズ）の変更が想定される
- ユーザー一括登録など、教師には不要な権限がある
- 将来的な拡張に対応しやすい

### 7.4 管理者機能一覧

| 機能 | 説明 | 優先度 |
|------|------|--------|
| ユーザー管理 | 登録・編集・削除・一括インポート | 高 |
| マスタ管理 | 能力・フェーズの追加・編集 | 高 |
| 年度管理 | 年度切り替え・データアーカイブ | 中 |
| システム設定 | 各種パラメータ設定 | 低 |
| ログ閲覧 | 操作ログ・エラーログ | 低 |

---

## 8. セキュリティ考慮事項

### 8.1 認証セキュリティ

| 項目 | 対策 |
|------|------|
| CSRF | CSRFトークンの使用 |
| セッションハイジャック | HTTPSの強制、Secure/HttpOnlyクッキー |
| 不正ログイン試行 | レート制限、アカウントロック |

### 8.2 データ保護

| 項目 | 対策 |
|------|------|
| 個人情報 | 暗号化保存、アクセスログ |
| チャット履歴 | DB保存しない（プライバシー保護） |
| 評価データ | 担当教師のみアクセス可能 |

### 8.3 監査ログ

```typescript
// 監査ログの記録項目
interface AuditLog {
  id: string;
  userId: string;
  action: string;       // 'LOGIN', 'LOGOUT', 'CREATE_REPORT', etc.
  resourceType: string; // 'user', 'report', 'evaluation', etc.
  resourceId: string;
  details: object;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}
```

---

## 9. 環境変数設定

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secret_key

# Session
SESSION_MAX_AGE=604800  # 7 days in seconds
EXTENDED_SESSION_MAX_AGE=2592000  # 30 days
```

---

## 10. 未決定事項一覧

| 項目 | 選択肢 | 推奨 | 決定期限 |
|------|--------|------|---------|
| ユーザー登録フロー | 事前登録/招待コード/CSV/自由登録 | 事前登録 | 要相談 |
| セッション有効期限 | 1日/1週間/1ヶ月/オプション | オプション付き7日 | 開発時 |
| 複数デバイス | 許可/不許可 | 許可 | 開発時 |
| 管理者ロール | 専用/教師拡張/なし | 専用 | 要相談 |

---

## 11. 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2024-01-15 | 1.0 | 初版作成 |
