## 🚀 リファクタリングとデータ構造調整計画（2026-06-30）

### 概要
これまでのコードを一度退避（バックアップ）し、それを参考にしながらデータ構造（エンティティ設計やlowdbのスキーマ）を見直し、再構築します。

### ステップ1: 既存コード・データの退避（バックアップ） 【完了】
- プロジェクトルート直下に `backup_20260630` ディレクトリを作成し、主要リソース（`src/`, `docs/`, `db.json` 等）をコピー。

### ステップ2: 新しいデータ構造の定義 【合意済】
`db.json` のスキーマを以下の構成に刷新します。

```typescript
// 1. カテゴリ
interface Category {
  id: string;
  name: string;      // 例: "自己研鑽", "日常の雑務", "OrbitPulse開発"
  color: string;     // UIのカラーコード
}

// 2. 繰り返しタスク（ルーチンワークのテンプレート）
interface RecurringTask {
  id: string;
  categoryId: string;
  title: string;
  pattern: 'daily' | 'weekly' | 'monthly';
  patternValue: string; // 曜日(1-7)や日付など
  estimatedPulse: number; // テンプレートとしての見積もり
}

// 3. スプリント
interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: 'planning' | 'active' | 'completed';
  retrospective: string | null;
  
  // 日ごとの情報（キャパシティと実績を1箇所で管理、最大14日間）
  days: {
    date: string;            // YYYY-MM-DD
    capacity: number;        // その日の作業可能パルス数
    remaining: number | null; // その日終了時のスプリント全体の残り総見積Pulse（実績値。未来の日はnull）
    note: string | null;     // メモ
  }[];
}

// 4. プロダクトバックログアイテム
interface BacklogItem {
  id: string;
  sprintId: string | null;
  categoryId: string | null;
  subject: string;
  title: string;
  description: string;
  why: string;
  acceptanceCriteria: string;
  storyPoints: number;
  status: 'backlog' | 'todo' | 'doing' | 'done';
  priority: number;
}

// 5. タスク（プロダクトタスク、単発タスク、繰り返し生成タスクすべて共通）
interface Task {
  id: string;
  sprintId: string | null;      // アサイン先のスプリントID
  backlogItemId: string | null; // 紐づくバックログID（nullなら単発ToDo）
  categoryId: string | null;    // カテゴリID（プロダクト外タスクの分類用）
  recurringTaskId: string | null; // 繰り返しタスクから生成された場合のテンプレートID
  title: string;
  status: 'todo' | 'doing' | 'done' | 'pooled';
  
  estimatedPulse: number;  // 当初見積（記録用・変更しない）
  actualPulse: number;     // 実績（タイマー消化分）
  remainingPulse: number;  // 残り見積（バーンダウン等で使用、完了したら0）
  
  deadline: string | null; // YYYY-MM-DD
  priority: number;
}
```

### ステップ3: 実装・再構築手順
1. **ドメインモデル (`src/domain/entities/...`) の修正 【完了】**
   - `Category`, `RecurringTask`, `Sprint`, `BacklogItem`, `Task` のエンティティおよびリポジトリインターフェースを定義。
2. **インフラ層 (`src/infrastructure/repositories/...`) の書き換え 【完了】**
   - `lowdb` を使った新データ構造用リポジトリの実装。
3. **ユースケース層 (`src/application/use-cases/...`) の更新 【完了】**
   - 新しいデータモデル・リポジトリに基づき、各操作ロジックを修正。
   - スプリント開始時に `days` 配列を初期化する処理や、繰り返しタスクの実体化ロジックの追加。
4. **移行スクリプト (`scripts/migrate.ts`) の作成・実行 【完了】**
   - 既存の `db.json` を新構造に変換する使い捨てマイグレーションスクリプトを作成・実行し、データを保護する。
5. **プレゼンテーション層（UI / actions）の調整 【完了】**
   - スプリント画面、タスク管理、ポモドーロタイマーのUIを新データ構造に適合させる。
   - `chartUtils.ts` にて `sprint.days` を直接用い、未入力日の「前日実績コピー補完」を行うシンプルなグラフデータ生成ロジックの実装。
6. **MCP サーバー (`src/mcp/server.ts`) の修正 【完了】**
   - AIが新構造（カテゴリや繰り返しタスク、タスクの3つのPulse）を扱えるよう、ツール群を新スキーマに合わせる。

---

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
182: - **多言語対応は next-intl で完成したで！URL ベースのルーティングで、言語切り替えがスムーズに動くようになった。**
183: 
184: 明日もこの調子で「鼓動（Pulse）」刻んでいこうや！
185: 
186: ---
187: 
188: ## 🚀 UI不具合の修正計画：ハイドレーションエラーとタイムゾーン問題の解消（2026-07-01）
189: 
190: ### 状況分析
191: データ構造の移行後、スプリント一覧画面（`/sprints`）やバックログ一覧画面（`/backlog`）でアコーディオンの開閉などUIの操作（展開）ができなくなっている現象を確認しました。
192: 
193: 原因は、**サーバーサイド（多くの場合はUTC）とクライアントサイド（JSTなどローカル）のタイムゾーン不一致**による**ハイドレーションエラー（Hydration Mismatch）**です。
194: 特に、`new Date()` による現在時刻の取得や、タイムゾーンを考慮しない `Date` オブジェクトの丸め処理（`setHours(0,0,0,0)`）を行っている箇所で、サーバーとクライアントでレンダリング結果の HTML（適用される CSS クラスや計算結果テキスト）に食い違いが発生し、React がハイドレーションを中断したため、JavaScript のイベントハンドラ（アコーディオンの `onClick` など）がバインドされなくなっています。
195: 
196: ### 修正ステップ
197: 
198: 1. **`SprintList.tsx` のタイムゾーン安全化**
199:    - `CapacityEditor` 内での `new Date()` に依存する日付、曜日、祝日、今日判定を、すべて `chartUtils.ts` の `toDateKey` （タイムゾーン固定）基準に書き換えます。
200:    - `isToday` や `dateStr` の判定をミリ秒やローカルタイム基準ではなく、タイムゾーン固定の文字列比較（`toDateKey(new Date())`）に変更します。
201: 
202: 2. **`PlanningBoard.tsx` のタイムゾーン安全化**
203:    - `remainingCapacityFromTomorrow` の算出ループにおいて、`new Date()` や `setDate` によるローカルタイム操作を廃止し、`chartUtils.ts` の `addCalendarDays` と `toDateKey` を使用したタイムゾーン安全なループ処理に書き換えます。
204: 
205: 205: 3. **動作確認**
206:    - 修正後、開発サーバーを再起動して UI が正常に操作できる（アコーディオンの開閉トグルが動作する）ことを確認します。
207: 
208: ---
209: 
210: ## 🚀 繰り返しタスク・カテゴリ管理画面の新規構築（2026-07-01）
211: 
212: ### 概要
213: 新しく定義された `RecurringTask` (繰り返しタスク) と `Category` (カテゴリ) を登録・管理するための設定画面（`/recurring`）を構築します。また、スプリントや PlanningBoard ロード時に今日の日付の繰り返しタスクを自動生成するロジックを組み込みます。
214: 
215: ### 開発タスク
216: 
217: 1. **言語メッセージの追加 (`src/i18n/messages/...`)**
218:    - `ja.json` / `en.json` に `recurring` セクションを追加（タイトル、パターン、曜日選択、作成ボタンなど）。
219: 
220: 2. **管理用 UI 画面の構築**
221:    - `/src/app/[locale]/recurring/page.tsx`：サーバーコンポーネント。UseCase からデータを取得しシリアライズ。
222:    - `/src/app/[locale]/recurring/actions.ts`：繰り返しタスクとカテゴリの登録・更新・削除を行う Server Actions。
223:    - `/src/app/[locale]/recurring/RecurringConfigBoard.tsx`：クライアントコンポーネント。繰り返しタスクとカテゴリをリッチな 2 カラムレイアウトで管理する UI。曜日のチェックボックス選択やカラーピッカーなど。
224:    - `/src/app/[locale]/recurring/page.module.css`：美しくモダンなダーク/ガラスモーフィズム対応のスタイル定義。
225: 
226: 3. **繰り返しタスク自動生成の組み込み**
227:    - `/src/app/[locale]/sprints/[id]/page.tsx` またはダッシュボードにて、ページロード時に `ManageRecurringTaskUseCase.generateTasksForDate` を自動で走らせる処理を追加。
228: 
229: 4. **サイドバー（Navigation）の更新**
230:    - `/src/app/[locale]/components/Navigation.tsx` に「繰り返し設定」のメニューを追加。
231: 
232: ---
233: 
234: ## 🚀 タスク管理画面（`/tasks`）の新設とスプリント詳細画面の簡素化（2026-07-01）
235: 
236: ### 概要
237: すべてのタスク（プロダクトバックログタスク、単発ToDo）を一元的に作成・編集・削除できる「タスク管理画面」を新設します。これに伴い、スプリント詳細（PlanningBoard）画面で行っていたタスクの作成や見積もり等の大掛かりな編集機能を削除し、進捗状況（ステータス）と実績Pulseの入力のみを行えるシンプルな構成に整理します。
238: 
239: ### 開発タスク
240: 
241: 1. **`ManageTaskUseCase.ts` の拡張**
242:    - 全てのタスクを取得する `getTasks(): Promise<Task[]>` メソッドを追加。
243: 
244: 2. **言語メッセージの追加 (`src/i18n/messages/...`)**
245:    - `ja.json` / `en.json` に `tasks` セクションを追加（タイトル、見積もり、紐付け先バックログ、アサイン先スプリント、期日、優先度など）。
246:    - `common` セクションに `tasksSettings` （タスク設定）を追加。
247: 
248: 3. **タスク一元管理画面の構築**
249:    - `/src/app/[locale]/tasks/page.tsx`：サーバーコンポーネント。UseCaseから全タスク、全バックログアイテム、全カテゴリ、全進行中スプリントを取得してシリアライズ。
250:    - `/src/app/[locale]/tasks/actions.ts`：タスクの追加・編集（更新）・削除を行う Server Actions。
251:    - `/src/app/[locale]/tasks/TaskConfigBoard.tsx`：クライアントコンポーネント。タスクを「プロダクトタスク」と「単発ToDoタスク」に分けて一覧表示し、作成・編集・削除ができる設定ボード。
252:    - `/src/app/[locale]/tasks/page.module.css`：モダンで統一感のある CSS Module。
253: 
254: 4. **スプリント詳細画面（`PlanningBoard.tsx`）の簡素化**
255:    - タスクの新規作成フォーム、タスク名のインライン編集（input）、見積もり（Est）変更ボタン、残見積もり（Rem）変更ボタン、タスク削除ボタンを画面から削除。
256:    - スプリント詳細画面には、タスク名（テキスト）、進捗（Status select）、ポモドーロボタン、実績（Act）変更ボタンのみを残し、操作をシンプルにします。
257: 
258: 5. **サイドバー（Navigation）の更新**
259:    - `/src/app/[locale]/components/Navigation.tsx` に「タスク設定」リンクを追加。
260: 
261: - **ステータス**: 🎉 完了（2026-07-01）
262: 
263: ### 💡 今後の課題・アイデア（タスク増加時の対策）
264: - 今後タスクが増えた場合の一覧性・パフォーマンス低下を防ぐためのアプローチ：
265:   - **詳細なフィルタリング＆テキスト検索**：タイトル部分一致検索や、カテゴリ・優先度・期日による絞り込み。
266:   - **完了タスクのアーカイブ機能**：完了して一定期間経過したタスクを非表示にする、または別テーブルに退避させて通常一覧を軽量化する。
267:   - **ページネーション/遅延読み込み**：一度に読み込むタスク数を制限する。





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

---

## 🚀 メニュー順序の変更：繰り返し設定とタスク設定の入れ替え（2026-07-02）

### 概要
ユーザーからの要望に基づき、サイドバーメニューの表示順を変更します。
「繰り返し設定」と「タスク設定」の位置を入れ替えます。

### 開発タスク

1. **`Navigation.tsx` の修正**
   - リンクのレンダリング順序を `tasks` -> `recurring` に変更する。
   - `NavigationProps` の型定義内の順序も揃える。

2. **`layout.tsx` の修正**
   - `Navigation` コンポーネントに渡す `translations` オブジェクトのプロパティ順序を揃える。

3. **動作確認**
   - ビルドおよび画面表示を確認し、メニューの順番が正しく入れ替わっていること、ルーティングが正しく動作することを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 ダッシュボードの充実化：14日間の繰り返しタスク予定グラフの追加（2026-07-02）

### 概要
ダッシュボードに、今後14日間（今日を含む）の繰り返しタスクの予定をカテゴリごとに積み上げた棒グラフを追加します。これにより、直近の作業負荷やルーティンの分布が視覚的に把握しやすくなります。

### 開発タスク

1. **`chartUtils.ts` の拡張**
   - `generateRecurringChartData` 関数を追加し、今日から14日間の繰り返しタスク発生日とカテゴリ別の `estimatedPulse` の積算データをタイムゾーン安全に算出するロジックを実装する。

2. **`RecurringScheduleChart` コンポーネントの新規作成**
   - Recharts の `<BarChart>` を用いた積み上げ棒グラフコンポーネントを `src/app/[locale]/components/RecurringScheduleChart.tsx` に新規作成する。
   - ガラスモーフィズムを基調とした美しいスタイルを `RecurringScheduleChart.module.css` に定義する。

3. **翻訳ファイルの更新**
   - `ja.json` と `en.json` の `dashboard` セクションにグラフのタイトルを追加する。
     - `recurringChartTitle`: `"今後14日間の繰り返しタスク予定"` / `"Recurring Tasks Schedule (Next 14 Days)"`

4. **ダッシュボード画面 (`page.tsx`) の修正**
   - `LowDbRecurringTaskRepository` と `LowDbCategoryRepository` からデータを取得し、チャートデータを生成して `RecurringScheduleChart` に渡す。
   - アクティブスプリントがない場合（＝バーンダウンがない場合）でも、この予定グラフはダッシュボードに表示されるようにレイアウトを調整する。

5. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 繰り返しタスクグラフの修正：Y軸を見積Pulseからタスク件数に変更（2026-07-02）

### 概要
ダッシュボードに新設した「今後14日間の繰り返しタスク予定」グラフの集計単位を、見積Pulse（ポイント）から「タスク件数（個数）」に変更します。

### 開発タスク

1. **`chartUtils.ts` の修正**
   - `generateRecurringChartData` 内で、日付ごとの集計時に `task.estimatedPulse` を加算していた部分を `1`（件数カウント）に変更する。

2. **翻訳ファイルの更新 (`ja.json` / `en.json`)**
   - `dashboard` セクションに件数表現用の翻訳キーを追加する。
     - 日本語：`"taskCount": "{count} 件"`, `"chartTotal": "合計"`
     - 英語：`"taskCount": "{count} {count, plural, =1 {task} other {tasks}}"`, `"chartTotal": "Total"`

3. **`RecurringScheduleChart.tsx` の修正**
   - ツールチップに表示される単位を `P` から `t("taskCount", { count: ... })` に変更し、合計表記も多言語対応にする。

4. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 繰り返しタスクグラフのレイアウト修正：横幅の確保と軸ラベルの表示改善（2026-07-02）

### 概要
ダッシュボード上の繰り返しタスク予定グラフが極端に縮んで表示されてしまう不具合（横幅が0または非常に狭くなる）およびY軸などのラベルが隠れてしまう問題を修正します。

### 開発タスク

1. **`RecurringScheduleChart.module.css` の修正**
   - `.container` に `width: 100%` を追加。
   - `.chartWrapper` に `width: 100%`, `min-height: 300px` を定義し、Recharts の `<ResponsiveContainer>` が親要素のサイズを正しく検知できるようにする。

2. **`RecurringScheduleChart.tsx` の修正**
   - Next.js (SSR) で Recharts のサイズ計算が崩れるのを防ぐため、`useState` / `useEffect` を使ったクライアントサイド・マウント完了後の描画制御（`mounted`）を追加する。
   - `<BarChart>` の左側マージンを調整（`left: -20` ➔ `left: 0` または `10`）し、Y軸ラベルの数字が隠れないようにする。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）


3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 翻訳エラーの修正：共通の loading 翻訳キーの参照（2026-07-02）

### 概要
プレースホルダー表示部分で `dashboard.loading` という存在しない翻訳キーを呼び出していたため、`next-intl` で `MISSING_MESSAGE` エラーが発生している問題を修正します。共通の翻訳セクション `common.loading` を参照するように修正します。

### 開発タスク

1. **`RecurringScheduleChart.tsx` の修正**
   - `useTranslations("common")` を宣言。
   - プレースホルダー内のテキスト描画を `t("loading")` から `tCommon("loading")` に変更する。

2. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 スプリントプランニング画面のカンバンUI化とポモドーロ連携（2026-07-02）

### 概要
スプリント詳細（プランニング）画面におけるタスク一覧を、従来の縦並びリストから「Ready（準備完了・プール）」「Active（作業中）」「Completed（完了）」の3列からなるモダンなカンバンボードUIに刷新します。また、作業中の「Active」列にあるタスクにのみポモドーロ開始ボタンを表示し、スムーズなタスク実行を促します。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - バックログ紐づきタスクとスプリント共有ToDoタスクをマージしてフラット化し、ステータス（Ready: `todo`/`pooled`, Active: `doing`, Completed: `done`）ごとに分類するロジックを追加。
   - 右側のタスク表示領域をカンバンボードレイアウトに変更。
   - カンバンタスクカードを実装：
     - 所属ストーリー名（紐づきがない場合は「共有ToDo」などの識別用バッジ）を表示。
     - タスク名。
     - **ポモドーロボタン (🍅)**：Active列（`doing`）のカードにのみ表示する。
     - **ステータス移行セレクトボックス**：直接ステータスを遷移できるようにする。
     - **実績Pulse (Act) 増減ボタン**：その場で実績を入力できるようにする。
   - 左側セクションに「バーンダウンチャート」と、プランニング操作用として「ストーリー管理（スプリント内ストーリーの除外・プロダクトバックログストーリーの追加）」を綺麗に再配置。

2. **`PlanningBoard.module.css` の修正**
   - カンバンボード（3カラム）、カラムヘッダー、カードのスタイルを定義。
   - カードはガラスモーフィズム調のすっきりとしたデザインにし、ドラッグ可能なイメージを持たせるホバーエフェクトを追加。
   - 画面幅に応じてカードが適切に並び変わるレスポンシブデザインの実装。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 カンバンボードのドラッグ＆ドロップ（Drag & Drop）対応（2026-07-02）

### 概要
カンバンボードでのステータス移動を、セレクトボックスでの選択から、カードを直接ドラッグ＆ドロップして直感的に動かせるように改善します。外部ライブラリを導入せず、HTML5 標準の Drag and Drop API を使用することで、Next.js 互換性が高く軽量な実装を行います。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - ドラッグ関連のイベントハンドラ (`handleDragStart`, `handleDragOver`, `handleDragEnter`, `handleDragLeave`, `handleDrop`) を実装。
   - 現在ドラッグオーバーされているカラムを特定するための `activeOverColumn` ステートを追加。
   - カンバンタスクカードに `draggable` 属性を設定し、`onDragStart` でタスクIDとタスクの種類（ストーリータスク/共有ToDo）を渡す。
   - 各カンバンカラムにドラッグ＆ドロップイベントを設定し、ドロップ時に対応するステータス（Ready: `todo`, Active: `doing`, Completed: `done`）への更新アクションを実行するようにする。

2. **`PlanningBoard.module.css` の修正**
   - ドラッグ中のカードホバースタイル (`cursor: grabbing`) を追加。
   - カラムにドラッグオーバーしている際、枠線を光らせたり背景色を透過させたりする視覚効果 (`.kanbanColumn.dragOver`) を追加。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 カンバンボードの4カラム化（Pooled列の追加）（2026-07-02）

### 概要
カンバンボードの構成を拡張し、「Pooled（一時保留）」のステータスを独立した列として追加します。これにより、「Pooled」「Ready」「Active」「Completed」の4列体制となり、タスクの準備状況から実行、完了までのステータス遷移が1対1で視覚的かつドラッグ＆ドロップで操作可能になります。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - カンバンボードの列を「Pooled」「Ready」「Active」「Completed」の4列に増設。
   - タスクの分類において、`pooled`（Pooled）と `todo`（Ready）をそれぞれ独立した配列に分けて集計。
   - 「Pooled」列へのドラッグオーバー／ドロップのイベントハンドリングを追加（ドロップ時にステータスを `pooled` へ変更する）。
   - 「Ready」列へのドロップ時は、ステータスを一律 `todo` に変更する。

2. **`PlanningBoard.module.css` の修正**
   - カンバンボードのレイアウトを `grid-template-columns: repeat(4, 1fr)` に拡張。
   - `pooledHeader` のヘッダー線カラーを追加。
   - レスポンシブ表示（画面幅狭小時のグリッド配置）の微調整。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 カンバンボードの3カラム化とReady内へのPooled縦積みスタック（2026-07-02）

### 概要
4カラム化によって生じた「横幅が狭い」という課題を解決するため、カンバンを「Ready」「Active」「Completed」の3列レイアウトに戻します。その上で、「Ready」カラムを上下に2分割し、上半分に「Ready（ToDo）」、下半分に「Pooled（保留）」のタスクを縦に並べるハイブリッドなレイアウトに改善します。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - カンバンボードの列数を3列に戻し、1列目の「Ready」カラムを上下2つのサブカラムに分割する。
   - 上半分の領域を `Ready`（ステータス：`todo`）、下半分の領域を `Pooled`（ステータス：`pooled`）としてタスクを分類・表示する。
   - 各サブカラムに対して独立したドラッグ＆ドロップイベントを設定。
     - 上半分にドロップ ➔ ステータスを `todo` に更新。
     - 下半分にドロップ ➔ ステータスを `pooled` に更新。
     - ドラッグオーバー時のハイライト (`activeOverColumn`) をサブカラム単位でトリガーするように調整。

2. **`PlanningBoard.module.css` の修正**
   - カンバンボードのグリッド配置を `grid-template-columns: repeat(3, 1fr)` に戻す。
   - 左側セクションの幅を元の `380px` に戻す。
   - サブカラム用のスタイル `.kanbanSubColumn`、境界線 `.subColumnDivider` を定義。
   - 各サブカラムが等幅・等高で伸縮し、かつ内部のカードがスクロール (`overflow-y: auto`) できるように調整。
   - ドラッグオーバー時の光るスタイルを、カラム単位からサブカラム単位 (`.kanbanSubColumn.dragOver`) に移行。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 カンバンボードの縦方向拡張とReady-Pooled間の物理ギャップ追加（2026-07-02）

### 概要
カンバンボードをさらに縦に広く使えるように全体の高さを 800px に拡張します。また、Ready と Pooled の間が1本の線で区切られている窮屈さを解消するため、1列目の共通外枠を廃止し、独立したハーフサイズカラムを縦にギャップ（余白）を挟んで並べることで、デザインのメリハリと視認性を向上させます。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - 1列目の共通外枠 `.kanbanColumn` を廃止し、外側に縦積みコンテナ `.kanbanDoubleColumn` を配置。
   - その中に、独立したハーフサイズカラム `.kanbanColumnHalf`（Ready用とPooled用）を縦に2つ並べる構造に変更。
   - 各イベントハンドリングはそれぞれのハーフサイズカラムに割り当てる。

2. **`PlanningBoard.module.css` の修正**
   - カンバンボードおよび各カラムの基準高さを `720px` から `800px` へ引き上げ。
   - `kanbanDoubleColumn`（`display: flex; flex-direction: column; gap: 1.25rem; height: 800px`）を追加。
   - `kanbanColumnHalf` のスタイルを追加（`flex: 1` による高さの等分、独立した境界線、シャドウ、角丸の設定）。
   - ドラッグオーバー時のスタイルを `.kanbanColumnHalf.dragOver` でも綺麗に適用されるように統合。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 カンバンヘッダーの残りPulse数表示とRem（残り見積）の個別調整UI（2026-07-02）

### 概要
カンバンの各ヘッダーにある数値表示を「タスク件数」から「残りPulse数の合計」に変更し、スプリントの総負荷状況を直感的に把握できるようにします。また、タスクカード内の「Rem（残り見積）」について、実績Pulseと同様に `+/-` ボタンで手動調整できるようにし、進捗状況に応じた残作業のリアルタイムな更新に対応します。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - Server Action `updateTaskRemainingPulseAction` を追加インポート。
   - 4つの分類（Pooled, Ready, Active, Completed）ごとに、所属タスクの `remainingPulse` の総和を算出。
     - `pooledPulse = pooledTasks.reduce(...)`
     - `readyPulse = readyTasks.reduce(...)`
     - `activePulse = activeTasks.reduce(...)`
     - `completedPulse = completedTasks.reduce(...)`
   - 各カラムヘッダーのバッジ表示を `{xxxPulse} Pulse` に変更。
   - タスクカード内の `Rem` 表示部に `+/-` ボタンを導入し、`updateTaskRemainingPulseAction` を呼び出して値を更新できるようにする（下限は 0）。

2. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 カンバンカードの数値表示巨大化とホバー＆インライン入力ハイブリッドUI（2026-07-02）

### 概要
タスクカード内の数値（Est, Act, Rem）をデカデカと見やすく表示しつつ、スピンコントロールなどの不要な常時ボタンを排除してデザインをスッキリさせます。普段は巨大な数字と小さなラベルのみを表示し、ホバー時にミニ増減ボタン（`+/-`）がフェードインし、数字クリックで直接キーボード入力（インライン編集）ができるハイブリッドでプレミアムなUIを構築します。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - Server Action `updateTaskEstimatedPulseAction` および `updateTodoEstimatedPulseAction` を追加インポート。
   - 編集状態を管理する `editingPulse` ステートを追加。
   - 入力保存処理 `handleSavePulse` を実装（Enterキーまたはフォーカスアウトで確定、Escapeキーでキャンセル）。
   - タスクカード内のEst, Act, RemのUIを新インジケータ（`pulseIndicator`）に変更。
     - 数字クリック ➔ 直接入力モードに切り替え。
     - ホバー時に出現するミニボタン ➔ ポチポチと1ずつ増減。

2. **`PlanningBoard.module.css` の修正**
   - 数値表示エリアのグリッドレイアウト（`.cardPulseControls`, `.pulseIndicator`）を変更。
   - 普段は巨大な数字（`font-size: 1.35rem`）と微細なラベルのみを表示。
   - ホバー時に `.hoverControls`（ミニ `+`/`-` ボタン）がフェードインするアニメーションを定義。
   - 編集時のインライン入力フォーム `.pulseInputInline` のスタイルを定義。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 カンバンカード内のステータス選択リストボックス排除（2026-07-02）

### 概要
ドラッグ＆ドロップ機能が安定して動作するようになったため、タスクカード内に残っていた補助用の「ステータス選択セレクトボックス」を削除します。これにより、カードの右上スペースがすっきり広くなり、バッジとタイトルに集中できる洗練されたデザインに整えます。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - `renderKanbanCard` メソッド内から `<select className={styles.cardStatusSelect}>` 関連のJSXコードを削除。

2. **`PlanningBoard.module.css` の修正**
   - 不要になった `.cardStatusSelect` クラスのスタイル定義を削除。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 カンバンカードへのタスク削除ボタン（✕ボタン）の追加（2026-07-02）

### 概要
カンバン移行時に失われていた「タスクの削除機能」をカード内に復活させます。昨日（水曜日）の未完了の繰り返しタスクなど、不要になったタスクをユーザーがその場で簡単に削除できるように、カードヘッダーに ✕ ボタンを配置し、誤クリック防止用の確認ダイアログとともに実装します。

### 開発タスク

1. **`PlanningBoard.tsx` の修正**
   - Server Actions から `deleteTaskAction` および `deleteTodoTaskAction` を追加インポート。
   - `renderKanbanCard` のカードヘッダー内（バッジの右端）に削除用の `✕` ボタン（`.cardDeleteBtn`）を追加。
   - クリック時に `window.confirm` で確認を挟み、OKなら削除アクションを実行する処理を実装。

2. **`PlanningBoard.module.css` の修正**
   - `.cardDeleteBtn` のスタイルを追加（通常時は薄いグレー、ホバー時に赤く光るフェードインアニメーション効果）。

3. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）



---

## 🚀 繰り返しタスク自動生成処理のタイムゾーンバグ修正（2026-07-02）

### 概要
日本時間の深夜・早朝（0:00 〜 8:59）にシステムを操作した際、サーバーのタイムゾーンが UTC である場合に日付や曜日判定が前日（UTC基準）にズレてしまい、意図しない曜日の繰り返しタスクがスプリントやプールに生成されてしまう問題を修正します。タイムゾーン `Asia/Tokyo` を明示して日付と曜日を日本時間基準で安全に算出するように修正します。

### 開発タスク

1. **`ManageRecurringTaskUseCase.ts` の修正**
   - `generateTasksForDate` メソッドにて、曜日（`dayOfWeek`）、日付（`dayOfMonth`）、および日付文字列（`dateStr`）の取得を `Intl.DateTimeFormat` を用いて日本時間（`Asia/Tokyo`）基準に固定する。
   - 重複生成チェック（`isAlreadyGenerated`）の際に、過去タスクの作成日時（`t.createdAt`）も日本時間（`Asia/Tokyo`）基準で `YYYY-MM-DD` に変換して正しく同一日付かどうかを比較するように修正。

2. **動作確認**
   - ビルドが正常に通ることを確認する。

- **ステータス**: 🎉 完了（2026-07-02）

---

## 🚀 イグナイトガチャ（IgniteGacha）機能の追加（進行中）

### 概要
作業を開始する心理的ハードルを下げるため、数分で終わる簡単な「マイ・儀式（タスク）」をレアリティ付きのガチャでランダムに選出し、モチベーションを点火（Ignite）させてから本番タスクに移行できるゲーミフィケーション機能を追加します。

### 設計・仕様イメージ
- **レアリティと排出率**: 
  - C (Common): 50% （コップに水を汲む、深呼吸をする等）
  - R (Rare): 30% （机の上のゴミを捨てる、窓を開ける等）
  - SR (Super Rare): 15% （開発サーバーを動かす、エディタでファイルを開く等）
  - SSR (Ultra Rare): 5% （お気に入りの曲を流す、おやつを一口食べる等）
- **カテゴリによるタスク分類**:
  - システム専用カテゴリとして `id: "ignite-gacha"`（表示名：「イグナイトガチャ」）を定義。
- **ガチャ候補（テンプレート）の管理**:
  - 条件：`categoryId === "ignite-gacha"`, `sprintId === null`, `backlogItemId === null`, `status === "pooled"` としてDBに保存。
  - 通常のタスク管理画面（`/tasks`）やスプリントボードのタスクプールからは、このカテゴリのタスクを除外（非表示）する。
- **ガチャ実行タスク（当日限り）と自動クリーンアップ**:
  - ガチャを引いた際、選ばれた候補をコピーし、一時的なタスクとして `id: "ignite-active-" + nanoid()`, `status: "doing"` でDBに追加。
  - アプリ起動時やガチャ画面ロード時に、作成日（`createdAt`）が今日（日本時間）ではない `ignite-active-` から始まるタスクをDBから物理的に自動クリーンアップ（削除）する。
- **制限・条件**:
  - 使用条件や回数制限は一切なし。やる気が出ないときはいつでも、何度でも引くことができる。
- **UI/UX (サクサク感の追求)**: 
  - **モーダル/ドロワー形式（画面遷移なし）**: ガチャのために別ページ（`/ignite`）に遷移せず、どの画面からでもヘッダー等の「Ignite!」ボタンを押せば、画面中央にモーダルが出るか右側からドロワーがスライドインしてガチャとタイマーが立ち上がる。
  - **楽観的アップデート（Optimistic Updates）の導入**: カンバンのドラッグ＆ドロップ、各数値の `+/-` ボタン変更、タイマー完了処理などで、サーバー応答を待たずに「操作した瞬間に画面を更新」するよう実装し、極上のサクサク感を実現する。

### 開発タスク

1. **インフラ・ユースケースの実装**
   - `LowDbCategoryRepository` で `ignite-gacha` カテゴリの自動生成（存在しない場合）を実装。
   - `ManageTaskUseCase` 等に、イグナイトガチャ用テンプレートの管理機能、および当日以外の古い `ignite-active-` タスクを削除する自動クリーンアップ処理を実装。
   - ガチャ抽選（レアリティに応じた重み付けランダム選択）と、一時的な実行タスク（`ignite-active-xxx`）の生成ロジックの実装。
   - 多言語メッセージの追加（`en.json`, `ja.json`）に `ignite` と `igniteSettings` セクションを追加。

2. **既存画面のフィルタリング**
   - タスク一元管理画面（`/tasks`）およびスプリントプランニング画面（`PlanningBoard.tsx`）から、`categoryId === "ignite-gacha"` のタスクを表示対象外にする。

3. **ガチャタスク登録画面（イグナイト設定）の構築**
   - `/src/app/[locale]/ignite/tasks/page.tsx` および `actions.ts` などの作成。
   - `IgniteTaskConfigBoard.tsx` を作成し loopholes を排したガチャ候補（テンプレート）を登録・編集・削除できる管理画面を整備。
   - サイドバー（`Navigation.tsx`）に「イグナイト設定」リンクを追加。

4. **グローバルガチャモーダル/ドロワーとタイマーの実装**
   - アプリ全体（レイアウトレベル）で呼び出せる `IgniteModal` / `IgniteDrawer` コンポーネントの作成。
   - ガチャ演出、タイマー作動、実績Pulse加算処理を実装。
   - 楽観的アップデートを用いたステータス切り替えやタイマー連携の構築。
   - ヘッダー等のグローバルナビゲーションに「イグナイトガチャ（Ignite!）」の起動ボタンを追加。

- **ステータス**: 🎉 完了 (2026-07-05 実装完了)
  - ガチャを引いたら進行中スプリントの **Active（作業中）列** に `0 P` タスクとして自動アサインするよう仕様決定・実装。
  - カンバン上では特別な **「炎のイグナイトカード🔥」** として差別化（赤オレンジのガラス調グラデーション、脈動する枠線ライト、バッジ「🔥 IGNITE」、Pulseメーター非表示）。
  - ポモドーロは回さず、ドロワー内やカード上の `✅`（完了）ボタンまたはドラッグ移動だけで即完了できるサクサク動線に変更。
  - **重複回避機能**: 1日に何回でも引けるが、今日既に引いたタスクは抽選から自動除外されるスマートなロジックを実装。

---

## 🚀 画面遷移スピードの改善：Next.jsの `loading.tsx` / `Suspense` 最適化（今後のロードマップ）

### 概要
同一URL内のタブ切り替え化（SPA化）による大規模改修を行う代わりに、Next.js App Routerの `loading.tsx` や `Suspense` によるローディングスケルトン表示を最適化し、遷移スピードのモタつき感を解消します。

### 開発タスク
- 各ページに `loading.tsx`（スケルトンプレースホルダー）を配置。
- データロードを非同期で `Suspense` で囲むことで、ページ遷移の実行自体はミリ秒単位で一瞬で行われるようにする。

- **ステータス**: ⏳ 保留（代替案としてメモ、様子見）

---

## 🚀 Docker起動時のDB初期化不具合の修正（2026-07-19）

### 概要
別マシンの Docker 環境で起動した際、マウントされた `db.json` が空（`{}` など）で存在している場合に、`db.data.backlogItems` などのプロパティが `undefined` となり、`findAll()` などの呼び出し時に `TypeError: Cannot read properties of undefined (reading 'map')` が発生してクラッシュする不具合を修正します。

### 開発タスク

1. **`json-db.ts` の修正 【完了】**
   - `getDb` 関数において、`lowdb` の読み込み直後に `db.data` の各キー（`categories`, `recurringTasks`, `sprints`, `backlogItems`, `tasks`）が存在するか確認する。
   - 欠損しているキーがあれば、`defaultData` から空配列を補完する。
   - 補完を行った場合は `await db.write()` を呼び出し、補完されたスキーマをファイルに書き戻す。

2. **動作確認 【完了】**
   - ビルドが正常に通ることを確認する (`npm run build`)。

- **ステータス**: 🎉 完了（2026-07-19）

---

## 🚀 スプリントのバーンダウンチャート描画およびPulse計算の不具合修正（2026-09-26）

### 概要
スプリント詳細画面において、Ready/Completedカラムへのタスク移動時に残りPulseや完了Pulseが正しく計算・反映されない問題、およびバーンダウンチャートのスナップショットが正常に更新されない問題を解消しました。

### 原因
1. **カンバンCompletedカラムの集計バグ**:
   - `PlanningBoard.tsx` で `completedPulse` を `remainingPulse` の総和で計算していたため、完了時に残見積が0になる仕様上、常に「0 Pulse」と表示されていた。
2. **ダッシュボード残り見積カードの `NaN` バグ**:
   - `ManageSprintUseCase.getSprintPulseStats` の返却プロパティ名と `PlanningBoard.tsx` の型定義に食い違いがあり、未定義プロパティの減算で `NaN Pulse` が表示されていた。
3. **バックログタスクのスプリントPulse集計漏れ**:
   - `ManageSprintUseCase` 内のPulse集計で `taskRepository.findBySprintId(sprintId)` のみを対象にしていたため、スプリントに登録されたバックログアイテムの子タスク（`sprintId` 未セット時）が集計から除外されていた。
4. **スナップショットの日付照合タイムゾーン不一致**:
   - `takeSnapshot` や `fillMissingSnapshots` で UTC 基準の `toISOString()` を使用していたため、JST基準の `sprint.days` の日付キーとズレが生じていた。

### 開発タスク

1. **`ManageSprintUseCase.ts` の改修 【完了】**
   - スプリントに紐づく全タスク（バックログアイテム配下＋単発ToDo）を確実に集計するヘルパー `getAllTasksInSprint` を追加。
   - `calculateRemainingPulse`, `calculateInitialEstimate`, `getSprintPulseStats` で上記ヘルパーを使用し、`totalEstPulse`, `plannedActualPulse`（完了タスクの当初見積合計）, `totalActualPulse`, `remainingPulse`（残見積合計）を正確に計算。
   - `addBacklogItemToSprint` / `removeBacklogItemFromSprint` 時に、配下のタスクの `sprintId` も整合性を保って更新。
   - `takeSnapshot` および `fillMissingSnapshots` における日付キーの判定を `Asia/Tokyo` 基準に統一。

2. **`PlanningBoard.tsx` の改修 【完了】**
   - `pulseStats` の型定義をUseCaseと整合させ、`remainingEstPulse` に正確な `remainingPulse` を反映。
   - カンバンの `completedPulse` を完了タスクの `estimatedPulse`（当初見積合計）で集計するように修正。

3. **動作確認 【完了】**
   - `npm run build` による型チェックおよびプロダクションビルドが成功することを確認。

- **ステータス**: 🎉 完了（2026-09-26）

