# Backlog Progress Monitor (BPM)

Backlog Progress Monitor (BPM) は、Backlogの課題データをAPI経由で取得し、プロジェクト（エンハンス案件など）の進捗状況と遅延リスクを一覧で可視化するダッシュボードツールです。

## 主な機能

- **案件単位の進捗トラッキング:** 親課題（案件）ごとに紐づく子課題（詳細設計、開発、テスト等）の状況を集約し、残工数と進捗率を自動計算します。
- **2軸での遅延リスク自動判定:** テストリリース予定日までの「非営業日を除いた利用可能工数」と「現在の残工数」から、**納期余裕率**および**進捗遅延率**の2軸で遅れリスク（🟢正常 / 🟡注意 / 🔴危険 / ⚠️要確認）を判定します。
- **例外の検知コントロール:** リリース待ち状態（ステータス59等）やテスト完了のフラグなどを検知し、適切にリスクを「正常」としてフィルタします。
- **リッチなUI表示:** ダークトーンで視認性の高いUI、担当者別の動的フィルタリング、タテ型の工数グリッド表示を備えたダッシュボードを提供します。

## アーキテクチャ

* **バックエンド (Node.js/Express):** 
  * Backlog APIとの通信およびレスポンスの合算・計算を行います。
  * `dotenv` によってAPIキーを隠蔽し、ブラウザ側に露出させない安全な仕組みです。
* **フロントエンド (Vanilla JS/CSS/HTML):** 
  * バックエンドから渡されたJSONデータを元に、DOMを生成・構築します。

詳しくは [doc/BPM_詳細設計書.md](./doc/BPM_詳細設計書.md) を参照してください。

## 開発環境とセットアップ

### 1. 必要な環境
- Node.js (v18以降を推奨)
- Docker & Docker Compose (コンテナで動かす場合)

### 2. 環境変数の設定
プロジェクトルートにある `.env.example` をコピーして `.env` ファイルを作成し、自身の環境に合わせて設定します。

```env
# Backlog接続情報
BACKLOG_API_KEY=your_api_key_here
BACKLOG_SPACE_ID=your_space_id
PROJECT_KEY=V2A9

# 各種カスタムフィールドの固有ID
CUSTOM_FIELD_ID_STATUS=16753
CUSTOM_FIELD_ID_RELEASE_DATE=16750
CUSTOM_FIELD_ID_PROGRESS=601439
ISSUE_TYPE_ID_ANKEN=224204

# 祝日・非営業日設定ファイル
HOLIDAY_CSV_PATH=./data/holidays.csv
```

### 3. マスタファイルの設定
`data/holidays.csv` にシステムの非営業日（祝日や会社指定の休日）を改行区切りで登録します。土日は自動的に計算から除外されます。

## アプリケーションの起動方法

### ローカルでの直接起動 (Node.js)
```bash
cd backend
npm install
node src/app.js
```
`http://localhost:3030` にアクセスしてください。

### Docker での起動
社内Linuxサーバなどの本番環境、もしくはDockerを使用した統一環境で動かす場合:
```bash
docker-compose up -d --build
```
`http://localhost:3030` にアクセスしてください。

## ドキュメント
- [BPM 基本設計書](./doc/BPM_基本設計書.md)
- [BPM 詳細設計書](./doc/BPM_詳細設計書.md) (直近の実装追従版)