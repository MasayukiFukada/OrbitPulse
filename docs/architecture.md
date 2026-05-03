# アーキテクチャ

OrbitPulse は、**クリーンアーキテクチャ**と **DDD (Domain-Driven Design)** の考え方を取り入れた構造になっています。

## レイヤー構造

`src/` ディレクトリ配下は以下のレイヤーに分割されています。

### 1. Domain Layer (`src/domain`)
プロジェクトの核となるビジネスロジックとエンティティを含みます。他のどのレイヤーにも依存しません。
- **Entities**: 状態と振る舞いを持つドメインオブジェクト（`Sprint`, `BacklogItem`, `Task` など）。
- **Repositories (Interfaces)**: データ永続化のためのインターフェース定義。

### 2. Application Layer (`src/application`)
ドメインオブジェクトを利用して、具体的なユースケースを実現するレイヤーです。
- **Use Cases**: `ManageSprintUseCase`, `ManageTaskUseCase` など。ビジネスルールを実行し、リポジトリを介してデータを操作します。

### 3. Infrastructure Layer (`src/infrastructure`)
外部ツールやデータベースとの接続を実装するレイヤーです。
- **DB Schema**: Drizzle ORM を使用した SQLite のテーブル定義。
- **Repositories (Implementations)**: ドメイン層のインターフェースを実際に SQLite (better-sqlite3) で実装したもの。

### 4. Presentation / App Layer (`src/app`, `src/presentation`)
ユーザーインターフェースを担うレイヤーです。
- **App Router (`src/app`)**: Next.js のルーティングとページ構成。
- **Components**: UI 部品。一部は `src/presentation` に配置される（将来的な整理予定）。
- **i18n**: `next-intl` を使用した多言語対応。

## 依存関係の方向
依存性は常に **内側（Domain）** に向かいます。

`Presentation` -> `Application` -> `Domain`
`Infrastructure` -> `Application` -> `Domain`

## フォルダ構成
```text
src/
├── app/              # Next.js App Router (Presentation)
├── application/      # Use Cases (Application)
│   └── use-cases/
├── domain/           # Core Logic (Domain)
│   ├── entities/
│   └── repositories/ # Interfaces
├── i18n/             # i18n Configuration
├── infrastructure/   # Data Access (Infrastructure)
│   ├── db/           # Schema & DB Connection
│   └── repositories/ # Implementations
└── presentation/     # Shared UI Components & Styles
```
