# OrbitPulse

![OrbitPulse Logo](public/images/OrbitPulse_Logo.png)

個人のためのスクラム管理システム。休憩時間も考慮し、ゲーミフィケーションも取り入れたい。

## 環境構築

1. リポジトリをクローン
```bash
git clone <repository-url>
cd OrbitPulse
```

2. 依存関係をインストール ※ あらかじめ mise が入っていること
```bash
mise install
npm install
```

3. 環境変数を設定（開発用）
```bash
cp .env.example .env
# 必要に応じて .env を編集
```

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセス。

## Docker での起動

Docker Compose を使用して、アプリケーションを簡単に起動できます。

```bash
docker compose up --build
```

起動後、[http://localhost:3000](http://localhost:3000) にアクセスしてください。
データは `data/db.json` に保存されます。

## 多言語対応

- URLベースのルーティング（`/ja/...`、`/en/...`）
- `next-intl` を使用
- 言語切り替えはヘッダーのセレクトボックスから可能

## 主な機能

- **スプリント管理**: 計画、実行、振り返り
- **ポモドーロタイマー**: 25分作業 + 5分休憩
- **バーンダウンチャート**: 進捗可視化
- **キャパシティ管理**: 日ごとの作業可能量を管理
- **多言語対応**: 日本語・英語対応

## 技術スタック

- **フレームワーク**: Next.js (App Router)
- **言語**: TypeScript
- **スタイル**: CSS Modules
- **データベース**: lowdb (JSONファイル)
- **多言語化**: next-intl
- **グラフ**: Recharts
- **環境管理**: mise, Docker

## ドキュメント

- [アーキテクチャ](docs/architecture.md)
- [データベース設計](docs/database.md)
- [主要機能](docs/features.md)
- [開発ガイド](docs/development.md)
- [データベースのバックアップについて](docs/database-backup.md)
- [アイディア帳](docs/ideas.md)

詳細は `AGENTS.md` も参照してください。
