# MCP (Model Context Protocol) 連携ガイド

OrbitPulse は MCP に対応しており、AI（Claude Desktop 等）と連携してプロジェクト管理の支援を受けることができます。

## 1. AIクライアントの設定例

### Claude Desktop の場合

設定ファイル（`~/.config/Claude/claude_desktop_config.json` 等）に以下の設定を追加してください。

```json
{
  "mcpServers": {
    "orbit-pulse": {
      "command": "npm",
      "args": [
        "--prefix",
        "/home/minamo/repository/OrbitPulse",
        "run",
        "mcp"
      ]
    }
  }
}
```

※ `/home/minamo/repository/OrbitPulse` の部分は、実際のプロジェクトの絶対パスに置き換えてください。

## 2. 提供されているツール

AIは以下のツールを使用して、OrbitPulse のデータを操作できます。

- **参照系**
  - `get_backlog_items`: 未着手・進行中のバックログアイテム一覧を取得
  - `get_sprints`: 全スプリントの一覧を取得
  - `get_current_sprint`: 現在アクティブなスプリントを取得
  - `get_sprint_details`: 特定のスプリントの詳細（アイテム、タスク、キャパシティ）を取得
  - `get_todo_tasks`: スプリント未割当のToDoタスクを取得
- **操作系**
  - `create_backlog_item`: 新しいバックログアイテム（ストーリー）を作成
  - `add_item_to_sprint`: アイテムをスプリントに割り当てる
  - `update_sprint`: スプリントの目標やレトロスペクティブを更新

## 3. 動作確認方法

MCP Inspector を使用して、サーバーが正しく動作しているか確認できます。

```bash
npx @modelcontextprotocol/inspector npm --prefix /home/minamo/repository/OrbitPulse run mcp
```

実行後、表示されたURLにブラウザでアクセスし、各ツールが期待通りデータを返すか確認してください。

## 4. 考慮事項

- `lowdb` を使用しているため、Next.js 実行時と MCP サーバー実行時で同じ `db.json` を参照します。
- データの整合性を保つため、ツール経由の操作も既存のユースケース（UseCase）を介して行われます。
