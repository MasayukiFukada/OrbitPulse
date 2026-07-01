# 開発ガイド

## セットアップ

1. **mise の導入**: プロジェクトで使用する Node.js バージョンなどを管理します。
2. **依存関係のインストール**: `npm install`
3. **データベースの準備**: `npm run db:push` で初期スキーマを作成します。

## コーディング規約

### 1. ディレクトリ構造の遵守
新機能を追加する場合は、クリーンアーキテクチャのレイヤーを意識して配置してください。
- ロジックは `domain` または `application` に書く。
- DB 操作は `infrastructure` のリポジトリ実装に閉じ込める。

### 2. 多言語対応 (i18n)
画面上のテキストをハードコードせず、必ず `next-intl` を使用してください。
- 翻訳ファイル: `src/i18n/messages/ja.json`, `en.json`
- 利用方法:
  ```tsx
  const t = useTranslations('Namespace');
  return <div>{t('key')}</div>;
  ```

### 3. スタイリング
- **CSS Modules** を基本とします。
- コンポーネントと同じディレクトリに `.module.css` を作成してください。

## よくあるタスク

### 新しいエンティティを追加する
1. `src/domain/entities/` にクラスを定義。
2. `src/infrastructure/db/schema.ts` にテーブル定義を追加。
3. `src/domain/repositories/` にインターフェースを定義。
4. `src/infrastructure/repositories/` に SQLite での実装を作成。
5. `src/application/use-cases/` に操作用ユースケースを作成。

### スキーマ変更の反映
```bash
npm run db:push
```

## テスト
(今後追加予定)
