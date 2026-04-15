# BPM (Backlog Progress Monitor) Linuxサーバ構築手順書

本ドキュメントは、BPMを社内のLinuxサーバ（Ubuntu/RHEL等）で稼働させるためのセットアップ手順を記述します。Dockerを使用したコンテナ運用を前提としています。

---

## 1. 前提条件

サーバに以下のソフトウェアがインストールされている必要があります。
- **Git**
- **Docker**
- **Docker Compose** (v2.0以降推奨)

---

## 2. アプリケーションの配置

### 2.1 リポジトリのクローン
ソースコードをサーバ上の任意のディレクトリ（例: `/opt/bpm`）に配置します。

```bash
cd /opt
sudo git clone git@github.com:Cos-Tanaka/BPM.git
sudo chown -R $USER:$USER /opt/bpm
cd /opt/bpm
```

---

## 3. 環境設定

### 3.1 環境変数ファイル (.env) の作成
ルートディレクトリにある `.env.example` をコピーして `.env` を作成し、Backlog APIキー等の秘密情報を設定します。

```bash
cp .env.example .env
nano .env
```

**設定項目:**
- `BACKLOG_API_KEY`: Backlogの個人設定から発行したAPIキー
- `BACKLOG_SPACE_ID`: スペースのサブドメイン (例: `cosmicb-2s`)
- `PROJECT_KEY`: `V2A9`
- `PORT`: `3030` (コンテナ内部ポート)

### 3.2 休日マスタ (holidays.csv) の配置
非営業日を計算に含めるため、`data/holidays.csv` を最新の状態にします。

```bash
# 必要に応じて編集
nano data/holidays.csv
```
※ `docker-compose.yml` の `volumes` 設定により、コンテナを再起動せずにこのファイルを更新するだけで変更が反映されます。

---

## 4. アプリケーションの起動

Docker Compose を使用してビルドおよび起動を行います。

```bash
# ビルドとバッググラウンド実行
docker-compose up -d --build
```

### 起動確認
出力結果に `done` と表示されれば完了です。以下のコマンドでログを確認できます。

```bash
docker-compose logs -f bpm
```
「BPM Server running at http://localhost:3030」と表示されていれば正常です。

---

## 5. アクセス確認

ブラウザから以下のURLにアクセスします。
`http:// <サーバのIPアドレス> :3030`

※ 社内ネットワークのファイアウォール設定で、TCPポート `3030` が許可されている必要があります。

---

## 6. 保守・運用

### コンテナの停止
```bash
docker-compose down
```

### 祝日データの更新反映
`data/holidays.csv` を編集した後、コンテナを再起動します。
```bash
docker-compose restart bpm
```

### アプリケーションの更新 (Git pull時)
```bash
git pull origin main
docker-compose up -d --build
```

---

## 付録：リバースプロキシ (Nginx) の設定（任意）

ポート番号なし（80番ポートなど）でアクセスしたい場合や、SSL化したい場合は Nginx 等を前段に配置してください。

```nginx
server {
    listen 80;
    server_name bpm.yourdomain.local;

    location / {
        proxy_pass http://localhost:3030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
