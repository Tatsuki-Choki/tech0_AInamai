## 画面/機能チェックリスト（ローカル: `http://localhost:3001`）

### 0. 前提
- Backend（API）: `http://localhost:8000/api`（`VITE_API_URL`未設定時のデフォルト）
- OAuth redirect:
  - Backend `GOOGLE_REDIRECT_URI`: `http://localhost:8000/api/auth/google/callback`
  - Backend `FRONTEND_URL`: `http://localhost:3001`（修正済み）

### 1. ルート一覧（`frontend/src/App.tsx`）
- [x] `/` → `/login` にリダイレクト（確認済）
- [x] `/login` ログイン選択（確認済）
- [x] `/student/login` 生徒ログイン（確認済）
- [x] `/teacher/login` 教師ログイン（確認済）
- [x] `/auth/callback` Google OAuth コールバック（疑似URLで確認済）
- [x] `/student/menu` 生徒メニュー（要ログイン/role=student）（確認済）
- [x] `/student/report` 報告（要ログイン/role=student）（確認済）
- [x] `/student/calendar` カレンダー（要ログイン/role=student）（確認済）
- [x] `/teacher/dashboard` 教師ダッシュボード（要ログイン/role=teacher）（確認済）
- [x] `/teacher/student/:id` 生徒個別（要ログイン/role=teacher）（確認済）
- [x] `*` → `/login` にリダイレクト（確認済）

### 2. 認証（共通）
- [x] 未ログインで保護ルートへアクセス → `/login` にリダイレクト（確認済）
- [x] role不一致で保護ルートへアクセス → それぞれのホームへ（教師→`/teacher/dashboard`、生徒→`/student/menu`）（確認済）
- [x] ログアウトで `localStorage` の `access_token`/`user` が消える（確認済）
- [x] API 401 → `api.ts` interceptor により `/login` へ遷移（ロジック確認済）

### 3. Googleログイン
- [x] 生徒ログイン画面に「Googleでログイン」ボタンがある（確認済）
- [x] 教師ログイン画面に「Googleでログイン」ボタンがある（確認済）
- [x] クリック → `GET /auth/google/login?role=...` が呼ばれる（確認済）
- [ ] Googleから戻る（`/auth/callback?token=...&role=...`）→ token保存 → `/auth/me` 取得 → roleに応じて遷移
  - **保留**: Google側の実ログインは `GOOGLE_CLIENT_ID/SECRET` とGoogleCloud設定、Backend起動が必要
- [x] 失敗時（API不達/設定不備/`error` query）→ `/login?error=...` に戻る（確認済）

### 4. 画面別（見た目/動作）
- [x] LoginSelection: 足跡/フクロウが `src/assets/figma` の画像で表示される（確認済）
- [x] StudentMenu: 報告ボタンの足跡、振り返りボタンの虫眼鏡が figmaアセットで表示（確認済）
- [x] TeacherDashboard: リスト/サマリー切り替え・検索欄・ログアウト（確認済）
- [x] TeacherStudentDetail: サマリーでレーダーチャートが表示される、報告ログでカレンダーが表示される（確認済）


