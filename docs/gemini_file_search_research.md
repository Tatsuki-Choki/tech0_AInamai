# Gemini API File Search Tool 調査レポート

## 概要

Gemini API File Searchは、**フルマネージドRAGシステム**です。ベクターデータベースやエンベディングパイプラインの構築が不要で、数分でRAGシステムを構築できます。

**公式ドキュメント**: https://ai.google.dev/gemini-api/docs/file-search

---

## 1. 主要な特徴

| 特徴 | 詳細 |
|------|------|
| 自動チャンキング | ファイルを自動的に最適なサイズに分割 |
| 自動エンベディング | Gemini Embedding modelで意味検索可能 |
| 引用機能 | 回答にドキュメントの引用が自動付与 |
| メタデータフィルタリング | タグ付けによる検索範囲の絞り込み |

---

## 2. 対応ファイル形式

**150以上のファイル形式**に対応:

### ドキュメント
- PDF, DOCX, XLSX, PPTX
- JSON, XML, LaTeX, SQL

### テキスト・コード
- Markdown, HTML, CSS
- JavaScript, TypeScript, Python, Java, C++, Go, Rust
- YAML, など

---

## 3. 制限事項

### ファイルサイズ
| 項目 | 制限 |
|------|------|
| 1ファイルあたり | **100 MB** |
| プロンプトあたりファイル数 | 10ファイル |

### ストレージ容量（Tier別）

| Tier | 容量 | 備考 |
|------|------|------|
| Free | 1 GB | テスト用 |
| Tier 1 | 10 GB | 課金有効化で自動アップグレード |
| Tier 2 | 100 GB | $250累積利用 + 30日 |
| Tier 3 | 1 TB | エンタープライズ |

**推奨**: 各ストアは20GB以下で最適なレイテンシ

### File Search Store
- **プロジェクトあたり最大10ストア**
- ストア内データは手動削除まで永続保存
- Files API経由のファイルは48時間後に自動削除

### レートリミット

| Tier | RPM | RPD |
|------|-----|-----|
| Free | 5 | 25 |
| Tier 1 | 300 | 1,000 |
| Tier 2+ | 上位クォータ | 上位クォータ |

---

## 4. 料金体系

| 項目 | 料金 |
|------|------|
| ファイルストレージ | **無料** |
| クエリ時のエンベディング生成 | **無料** |
| インデックス作成（初回のみ） | **$0.15 / 1M tokens** |
| 入出力トークン | 通常のGemini API料金 |

**コスト試算例**:
- 校長先生の著書（約10万トークン）をインデックス化 → 約$0.015（約2円）

---

## 5. 対応モデル

- **gemini-2.5-pro**
- **gemini-2.5-flash**（推奨: 高速・低コスト）
- gemini-3-pro-preview

---

## 6. 実装例

### Python

```python
from google import genai
from google.genai import types
import time

# クライアント初期化
client = genai.Client(api_key="YOUR_API_KEY")

# 1. File Search Store作成
file_search_store = client.file_search_stores.create(
    config={'display_name': 'principal-books'}
)

# 2. ファイルアップロード（PDF等）
operation = client.file_search_stores.upload_to_file_search_store(
    file='principal_philosophy.pdf',
    file_search_store_name=file_search_store.name,
    config={
        'display_name': '校長先生の著書',
        'custom_metadata': [
            {'key': 'category', 'string_value': 'philosophy'}
        ]
    }
)

# 3. インデックス完了を待機
while not operation.done:
    time.sleep(5)
    operation = client.operations.get(operation)

# 4. RAGクエリ実行
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="校長先生の教育理念について教えてください",
    config=types.GenerateContentConfig(
        tools=[
            types.Tool(
                file_search=types.FileSearch(
                    file_search_store_names=[file_search_store.name]
                )
            )
        ]
    )
)

print(response.text)
```

### JavaScript/TypeScript (Node.js)

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 1. File Search Store作成
const fileStore = await ai.fileSearchStores.create({
    displayName: 'principal-books'
});

// 2. ファイルアップロード（チャンキング設定付き）
let uploadOp = await ai.fileSearchStores.uploadToFileSearchStore({
    file: 'principal_philosophy.pdf',
    fileSearchStoreName: fileStore.name,
    config: {
        displayName: '校長先生の著書',
        customMetadata: [
            { key: 'category', stringValue: 'philosophy' }
        ],
        chunkingConfig: {
            whiteSpaceConfig: {
                maxTokensPerChunk: 500,
                maxOverlapTokens: 50
            }
        }
    }
});

// 3. インデックス完了を待機
while (!uploadOp.done) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    uploadOp = await ai.operations.get({ operation: uploadOp });
}

// 4. RAGクエリ実行
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: '校長先生の教育理念について教えてください',
    config: {
        tools: [{
            fileSearch: {
                fileSearchStoreNames: [fileStore.name]
            }
        }]
    }
});

console.log(response.text);
```

### メタデータフィルタリング

```typescript
// 特定カテゴリのドキュメントのみ検索
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'アントレプレナーシップについて',
    config: {
        tools: [{
            fileSearch: {
                fileSearchStoreNames: [fileStore.name],
                metadataFilter: 'category="entrepreneurship"'
            }
        }]
    }
});
```

---

## 7. Azureデプロイ時の考慮事項

### アーキテクチャ

```
[Azure App Service / Functions]
        ↓
   [Node.js Backend]
        ↓
   [Gemini API] ←→ [File Search Store]
        ↓
   [Azure Database]（ドキュメント管理用）
```

### 必要なAzure特殊プラン: なし

- Gemini APIは外部APIとして呼び出すため、**特殊なAzureプランは不要**
- 通常のApp Service / Functionsで十分
- API KeyはAzure Key Vaultで管理推奨

### バックエンド設計のポイント

1. **ドキュメント管理テーブル**の作成が必要:
   - ファイル名、オーナー、ファイルタイプ
   - Gemini Store ID、Document ID
   - ステータス（uploading / ready / error）

2. **アップロードフロー**:
   ```
   ユーザー → Azure Storage → Gemini File Search → DB更新
   ```

3. **引用の人間可読化**:
   - Geminiは内部IDで引用を返す
   - バックエンドでDBから人間可読な名前に変換

---

## 8. 本プロジェクトへの適用

### AI校長チャットボット

| 項目 | 設計 |
|------|------|
| Store名 | `principal-philosophy` |
| アップロード内容 | 校長先生の著書・思想PDF |
| メタデータ | `category`, `topic` |
| モデル | `gemini-2.5-flash`（コスト効率重視） |

### 注意点

1. **48時間問題の回避**: Files APIではなく**File Search Store**を使用すれば永続保存
2. **ストア数制限**: 10ストアまで → 1プロジェクト1ストアで十分
3. **Tierアップグレード**: 本番運用前にTier 1以上への移行推奨

---

## 9. 参考リンク

- [公式ドキュメント](https://ai.google.dev/gemini-api/docs/file-search)
- [Google Blog: File Search Tool発表](https://blog.google/technology/developers/file-search-gemini-api/)
- [JavaScript実装チュートリアル](https://www.philschmid.de/gemini-file-search-javascript)
- [DataCampチュートリアル](https://www.datacamp.com/tutorial/google-file-search-tool)
- [Google Gemini Cookbook (GitHub)](https://github.com/google-gemini/cookbook)
- [Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)

---

## 10. 結論

Gemini API File Searchは本プロジェクトのAI校長機能に**最適**です。

**メリット**:
- インフラ構築不要（ベクターDB不要）
- 低コスト（ストレージ無料、インデックス$0.15/1M tokens）
- 実装がシンプル（数十行のコードで完結）
- 引用機能で信頼性確保

**開発時の懸念点**: 特になし（技術的なブロッカーは見当たらない）
