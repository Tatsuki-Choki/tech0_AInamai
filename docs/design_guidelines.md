# 探求学習の報告確認アプリ デザインガイドライン

このドキュメントは、現在実装されている「探求学習の報告確認アプリ」の全画面（ログイン、生徒メニュー、報告・振り返り、教師ダッシュボードなど）のデザインルール（トンマナ）をまとめたものです。
今後の画面追加・修正の際は、このガイドラインに従って実装してください。

## 1. カラーパレット

### ベースカラー
画面全体の背景色として、温かみのあるベージュ/ピンク系を使用します。
- **Main Background**: `#fef8f5`
  - 使用箇所: 全画面の `min-h-screen` 背景、サイドバー背景

### コンポーネントカラー
- **Card Background**: `#ffffff` (White)
  - 使用箇所: カード、モーダル、入力エリアのベース
- **Card Border**: `rgba(243, 232, 255, 0.5)` (淡い紫)
- **Input Background**: `#faf5ff` (Very Light Purple) または `rgba(250, 245, 255, 0.5)`

### アクセントカラー（パープル・ブルー系）
- **Primary Purple**: `#9810fa`
  - 使用箇所: アイコン、強調テキスト、アクティブ状態
- **Deep Purple**: `#8200db`
  - 使用箇所: ログアウトボタンのテキスト、重要なメッセージ
- **Dark Purple**: `#59168b`
  - 使用箇所: 見出し（H1, H2など）、教師ダッシュボードの強調テキスト
- **Soft Purple**: `#e9d4ff`
  - 使用箇所: バッジ背景、ViewSwitcherのアクティブ背景、装飾要素

### グラデーション（ボタン等）
- **Blue-Purple Gradient**: `from-[#a3b3ff] to-[#7c86ff]`
  - 使用箇所: 「振り返り」ボタン、ログインボタン（一部）
- **Light-Purple Gradient**: `from-[#e9d4ff] to-[#c9a0ff]`
  - 使用箇所: 「報告」ボタン、アクションボタン

### テキストカラー
- **Text Main**: `#333333`
- **Text Muted**: `#5a5a5a`
- **Text Hint**: `rgba(152, 16, 250, 0.6)` (紫がかったグレー)

## 2. タイポグラフィ

### フォントファミリー
丸みのある親しみやすいフォントを優先して使用します。
- **Primary**: `Zen Maru Gothic` (`var(--font-zen-maru-gothic)`)
- **Secondary**: `Noto Sans JP` (`var(--font-noto-sans-jp)`)

### フォントサイズ・ウェイト
- **Page Title**: 20px / Bold (`font-bold`)
- **Card Title**: 18px / Bold
- **Body Text**: 14px - 16px / Regular
- **Small/Hint**: 12px - 13px

## 3. レイアウト & シェイプ

### 角丸 (Border Radius)
全体的に丸みを帯びたデザインを採用します。
- **Cards / Containers**: `rounded-[24px]`
- **Buttons (Large)**: `rounded-[24px]`
- **Inputs / Small Items**: `rounded-[16px]` or `rounded-[12px]`

### 影 (Box Shadow)
柔らかく、奥行きのある影を使用します。
- **Base Shadow**: `shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]`
- **Floating/Large Shadow**: `shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]`

## 4. UIコンポーネント

### ボタン (Buttons)
- **Primary Action**: グラデーション背景 + 白文字 + `rounded-[24px]` + `shadow`
  - Hover: `hover:from-... hover:to-...` (少し明るく/濃く)
  - Active: `active:scale-[0.98]` (押し込みエフェクト)
- **Secondary / Outline**: 背景 `rgba(250, 245, 255, 0.5)` + ボーダー `rgba(243, 232, 255, 0.5)` + 紫文字

### 入力フォーム (Inputs / Textareas)
- 背景: `#faf5ff` (薄い紫) または `bg-white`
- ボーダー: `border-[rgba(243, 232, 255, 0.5)]`
- フォーカス: `focus:outline-none focus:border-[#9810fa]/50`
- プレースホルダー: `placeholder:text-[#9810fa]/50`

### ナビゲーション (Navigation)
- **Sidebar / Header**: 背景は `#fef8f5` で統一し、コンテンツエリアと一体感を出す。
- **Active Links**: 背景 `#e9d4ff` (またはその透過) + 紫文字

## 5. 禁止事項・注意事項
- **緑色 (#008236, bg-green-100等) の使用禁止**: 成功状態やアクセントカラーには、緑ではなく紫系を使用すること。
- **角張ったデザインの回避**: 基本的に `rounded-none` や `rounded-sm` は避け、`rounded-[24px]` などの大きな角丸を使用する。
- **「チームコンパス」表記の禁止**: プロジェクト名は「探求学習の報告確認アプリ」とし、UI上に「チームコンパス」と表示しない。

