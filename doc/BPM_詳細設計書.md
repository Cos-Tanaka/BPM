# Backlog進捗管理ツール (BPM) 詳細設計書

**システム名：** Backlog Progress Monitor (BPM)  
**文書バージョン：** 0.1.0  
**作成日：** 2026-04-15  
**最終更新日：** 2026-04-15  

---

## 1. ドキュメント情報

| 項目 | 内容 |
|---|---|
| 作成者 | Antigravity (AI) |
| 利用モデル | Gemini 3 Flash |
| 準拠文書 | [Backlog進捗管理ツール 基本設計書](./BPM_基本設計書.md) |

---

## 2. ファイル構成・ディレクトリ構造

### 2.1 ディレクトリ構造

```text
bpm/
├── doc/
│   ├── BPM_基本設計書.md
│   └── BPM_詳細設計書.md
├── .env.example                # 環境変数テンプレート
├── docker-compose.yml          # コンテナ構成
├── Dockerfile                  # サーバ実行環境
├── backend/
│   ├── src/
│   │   ├── app.js              # エントリポイント・ルート定義
│   │   ├── config.js           # 環境変数・設定管理
│   │   ├── routes/
│   │   │   └── progress.js     # 進捗集計エンドポイント
│   │   └── services/
│   │       ├── backlogApi.js   # Backlog API クライアント
│   │       ├── progressCalc.js # 工数・リスク計算ロジック
│   │       └── holidayLoader.js # 非営業日CSV読み込み
│   └── package.json
└── frontend/
    ├── index.html              # メイン画面
    ├── css/
    │   └── style.css           # スタイルシート
    └── js/
        ├── app.js              # フロントエンドメイン
        ├── api.js              # バックエンドAPI呼び出し
        └── components.js       # UIコンポーネント生成
```

---

## 3. バックエンド設計

### 3.1 技術詳細
- **Runtime:** Node.js (v18+)
- **Framework:** Express
- **API Client:** axios (or fetch)
- **External Dependencies:**
  - `dotenv`: 環境変数読み込み
  - `csv-parse`: 祝日CSVのパース

### 3.2 モジュール一覧

| ファイル名 | 役割 | 主要な関数 |
|---|---|---|
| `app.js` | Expressサーバの初期化、静的ファイルのホスティング、ミドルウェア設定 | - |
| `config.js` | `process.env` をラップし、型の保証とデフォルト値を設定 | `getBacklogConfig()` |
| `backlogApi.js` | Backlog API (v2) へのリクエストを管理。レート制限を考慮した並列呼び出し | `getIssues()`, `getChildIssues()` |
| `progressCalc.js` | 基本設計書9章に基づいた工数・リスク算出ロジック | `calculateProgress()`, `evaluateRisk()` |
| `holidayLoader.js` | 起動時または一定間隔で CSV から非営業日を読み込みキャッシュする | `loadHolidays()`, `isWorkingDay()` |

---

## 4. APIエンドポイント仕様

### 4.1 GET `/api/progress`
全案件の進捗集計データを取得する。

#### Request
- **Query Parameters:** なし（将来的にプロジェクトID等を指定可能）

#### Response (JSON)
```json
[
  {
    "issueKey": "V2A9-10",
    "summary": "機能A強化",
    "assignee": "山田 太郎",
    "testReleaseDate": "2026-04-30",
    "estimatedHours": 40.0,
    "actualHours": 10.0,
    "remainingHours": 30.0,
    "progressRate": 25,
    "riskLevel": "danger",
    "riskIcon": "🔴",
    "phases": {
      "detailDesign": { "completed": 2, "total": 2 },
      "unitTestDesign": { "completed": 0, "total": 1 },
      "manufacturing": { "completed": 0, "total": 1 },
      "unitTestExecution": { "completed": 0, "total": 1 }
    },
    "backlogUrl": "https://xxx.backlog.com/view/V2A9-10"
  },
  ...
]
```

---

## 5. ロジック詳細仕様

### 5.1 Backlog API データ取得フロー
1. `GET /api/v2/issues` で親課題（00.案件、ステータス40-60）を取得
2. 取得した各親課題の `id` をリスト化し、`parentIssueId` として子課題を検索
   - パフォーマンス向上のため、親課題10件ずつ程度で纏めてリクエストを送る等の工夫を行う
3. 工程分類キーワードに基づき、子課題を工程別にグルーピングする

### 5.2 工程分類ロジック
子課題の `summary` または `issueType` に以下のキーワードが含まれる場合に分類する。

| 工程 | キーワード（正規表現） |
|---|---|
| 詳細設計 | `詳細設計` / `Detail Design` / `DD` |
| 単体テスト設計 | `単体テスト設計` / `UTD` / `UT設計` |
| 製造 | `製造` / `Coding` / `実装` |
| 単体テスト実施 | `単体テスト実施` / `UT実施` |

### 5.3 リスク判定の厳密化 (Edge Cases)
基本設計書9.5節に加え、以下の詳細な仕様を適用する。

- **開始日の決定:**
  1. 課題の `startDate`
  2. なければ `created` (作成日)
  3. `startDate` が `testReleaseDate` より後の場合は、`created` を使用
- **残工数 0 の扱い:**
  - 全ての課題が「完了」ステータスであれば、リスクは常に `🟢 正常` とする
- **予定工数未設定:**
  - 親・子ともに予定工数 0 の場合は、画面上 `予定工数: —` と表示し、リスクは `⚠️ 要確認` とする

---

## 6. フロントエンド設計

### 6.1 画面コンポーネント構成
- **App (js/app.js):** 全体の状態管理とAPI呼び出しのトリガー
- **SearchFilter (js/components.js):** 担当者・リスク・マイルストーンの絞り込み
- **IssueTable (js/components.js):** 案件一覧のレンダリング
- **ProgressBar (js/components.js):** 進捗率を視覚化するバー

### 6.2 状態管理 (State)
```javascript
const state = {
  allIssues: [],     // APIから取得した生データ
  filteredIssues: [], // フィルタ適用後のデータ
  filters: {
    assignee: 'all',
    risk: 'all',
    milestone: 'all'
  },
  isLoading: false,
  error: null
};
```

### 6.3 デザインシステム (CSS)
- **カラーパレット:**
  - Primary: `#00a29a` (Backlog Green)
  - Danger: `#e74c3c`
  - Warning: `#f1c40f`
  - Success: `#2ecc71`
  - Background: `#f8f9fa`
- **フォント:** `Inter, "Noto Sans JP", sans-serif`
- **テーブル:** 固定ヘッダー、ホバー時行ハイライト

---

## 7. インフラ・デプロイ設計

### 7.1 Docker構成

#### Dockerfile
- `Node.js 18-slim` をベースイメージに使用
- `/app` に backend と frontend を配置
- バックエンドが `frontend/` を `express.static()` で配信する

#### docker-compose.yml
- 社内ネットワーク内の特定ポート（例：3030）をフォワード
- ボリュームマウントを使用して非営業日CSVを動的に参照可能にする

### 7.2 環境変数 (.env) 詳細

| 変数名 | デフォルト値 | 必須 | 説明 |
|---|---|---|---|
| `BACKLOG_API_KEY` | - | Yes | Backlog APIアクセス用 |
| `BACKLOG_SPACE_ID` | - | Yes | `xxxx.backlog.com` の `xxxx` 部分 |
| `PROJECT_KEY` | `V2A9` | No | 対象プロジェクト |
| `HOLIDAY_CSV_PATH` | `./data/holidays.csv` | No | 非営業日マスタ |
| `PORT` | `3030` | No | 起動ポート |

---

## 8. 非機能要件の具体的実現

| 項目 | 実装方針 |
|---|---|
| レート制限対策 | `p-limit` 等のライブラリを使用し、同時に発行するAPIリクエストを5件程度に制限 |
| エラーハンドリング | APIエラー時はフロントエンドに分かりやすいメッセージ（「APIキーが無効です」等）を返却し、画面全体がクラッシュしないようにする |
| 軽量化 | 外部ライブラリを最小限にし、クライアント側での JS 実行負荷を下げる |
