## 📝 MCP対応の進捗（2026-05-13）

### 完了した作業
1. **MCPサーバーの実装 (`src/mcp/server.ts`)**
   - `@modelcontextprotocol/sdk` を導入
   - 参照系ツール (`get_backlog_items`, `get_sprints`, `get_current_sprint`, `get_sprint_details`, `get_todo_tasks`) の実装
   - 操作系ツール (`create_backlog_item`, `add_item_to_sprint`, `update_sprint`) の実装
2. **実行環境の整備**
   - `tsx` を導入し、TypeScript を直接実行可能に
   - `package.json` に `npm run mcp` スクリプトを追加
3. **動作確認**
   - stdio 経由でのサーバー起動を確認

### 未完了の作業
1. **AIクライアントとの連携テスト**
   - Claude Desktop 等の MCP クライアントから実際にツールを呼び出して動作確認する。
2. **ツールの拡充**
   - タスクの作成や更新、キャパシティの調整など、さらに細かい操作ツールの追加を検討。

### 再開時の手順
1. `npm run mcp` でサーバーが起動することを確認。
2. MCP Inspector などを使用して、各ツールのレスポンスが正しいか詳細に検証する。

---

## 🛠 明日の自分へのメモ
- `better-sqlite3` のトランザクションは `async/await` 使ったらあかんで！
- 画面が長くなってきたから、CSSの共通化（ボタンやカードのスタイル）を検討してもええかもな。
- グラフライブラリ（Recharts とか）の選定から始めようか！
- **多言語対応は next-intl で完成したで！URL ベースのルーティングで、言語切り替えがスムーズに動くようになった。**

明日もこの調子で「鼓動（Pulse）」刻んでいこうや！

---

## 📝 多言語対応の進捗（2026-05-03）

### 完了した作業
1. **ミドルウェアとルーティングの設定**
   - `middleware.ts` を作成し、next-intl のルーティングを設定
   - `src/i18n/routing.ts` を新規作成
2. **サーバーサイドのロケール設定**
   - `src/i18n/request.ts` を修正：`requestLocale` を正しく処理
   - `src/app/[locale]/layout.tsx` に `setRequestLocale` を追加
   - `src/app/[locale]/sprints/[id]/page.tsx` に `setRequestLocale` を追加
3. **翻訳キーの追加**
   - `en.json` と `ja.json` に PlanningBoard 用の翻訳キーを追加
   - 追加キー：`startSprint`, `completeSprint`, `statsLabel`, `remainingEstimate`, `overCapacity` 等
4. **PlanningBoard.tsx の完全翻訳対応**
   - 全てのハードコードされた日本語を `t('key')` に置き換え
   - 対象箇所：
     - ヘッダーの「スプリント完了」ボタン
     - 「残り見積」「明日以降のキャパシティ」「キャパシティ超過」警告
     - 今日の遅延警告メッセージ
     - タスクステータス表示（TODO, DOING, POOLED, DONE）
     - ポモドーロタイマーの通知・表示
     - 「新しいタスクを追加...」「一般的なタスクを追加...」プレースホルダー
     - 「追加」「削除」「戻す」ボタン
     - セクションタイトル（Sprint Backlog, Product Backlog, Todo Task Pool 等）
5. **他のコンポーネントの翻訳対応**
   - `PomodoroTimer.tsx` / `PomodoroStatusDisplay.tsx` の翻訳対応
   - `BurnDownChart.tsx` のツールチップ・凡例の翻訳対応
6. **不足翻訳キーの追加**
   - `en.json` / `ja.json` に `pomodoro` と `chart` セクションを追加

### 未完了の作業
1. **統合テスト**
   - `/en` プレフィックスで全ページが英語表示されるか確認
   - `/ja` プレフィックスで日本語表示されるか確認
   - 言語切り替えが全ページで正しく動作するか確認
2. **その他のコンポーネント確認**
   - `LanguageSwitcher.tsx`（現在はlocaleNamesを使用しており問題なし）
   - その他のページコンポーネントも翻訳対応が必要な箇所がないか確認

### 再開時の手順
1. `npm run dev` で開発サーバーを起動
2. `/en/sprints/[id]` と `/ja/sprints/[id]` でPlanningBoardの表示を確認
3. ポモドーロタイマーの通知メッセージが言語切り替えで変わるか確認
4. バーンダウンチャートのツールチップ・凡例が翻訳されるか確認
5. 不具合があれば修正
