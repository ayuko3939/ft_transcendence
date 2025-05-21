# Pong Game Online

オンラインでPongゲームを楽しめるWebアプリケーションです。リアルタイムで他のプレイヤーと対戦したり、プロフィールを管理したりすることができます。

![Pong Game Screenshot](https://github.com/user-attachments/assets/47b94a01-9c7b-4593-921b-19d6f256ec22)

## 目次

- [利用者向け情報](#利用者向け情報)
- [開発者向け情報](#開発者向け情報)
- [アーキテクチャ](#アーキテクチャ)
- [主要技術・ライブラリ](#主要技術ライブラリ)
- [セットアップと実行](#セットアップと実行)
- [利用可能なスクリプト](#利用可能なスクリプト)
- [ディレクトリ構造](#ディレクトリ構造)
- [ライセンス](#ライセンス)

## 利用者向け情報

### 機能

- **アカウント管理**: メールアドレスとパスワードでの登録、またはGoogleアカウントでのログイン
- **オンラインPongゲーム**: リアルタイムで他のプレイヤーと対戦
- **ゲーム設定カスタマイズ**: ボールの速度や勝利点数などを調整可能
- **ゲーム内チャット**: 対戦中に相手とコミュニケーション
- **プロフィール管理**: アバター画像のアップロードや統計情報の確認
- **対戦履歴**: 過去の試合結果と統計の確認

### 使い方

> [!TIP]
> ゲームコントロールはシンプル：上下キー(↑/↓)またはWキー/Sキーでパドルを操作できます。

1. アカウント登録またはログイン
2. ダッシュボードから「ゲームを始める」をクリック
3. 対戦相手を待つか、既存のゲームルームに参加
4. ゲーム画面で操作方法:
   - 上下キー (↑/↓) またはWキー/Sキーでパドルを動かす
   - チャットメッセージはテキスト入力フィールドから送信
   - 中断する場合は「中断」ボタンを使用（敗北扱いになります）

> [!CAUTION]
> ゲーム中に「中断」ボタンを押すと、即座に敗北となり、対戦記録に反映されます。

## 開発者向け情報

### 環境要件

- Node.js 18以上
- pnpm 9.15.0以上
- Docker & Docker Compose (本番環境用)

### セットアップと実行

#### 開発環境のセットアップ

> [!IMPORTANT]
> 開発を始める前に、`.env`ファイルを設定してください。特にGoogle OAuth認証を使用する場合は、`GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`の設定が必須です。

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/ft_transcendence.git
cd ft_transcendence

# 依存関係をインストール
pnpm install

# 環境変数ファイルの準備
cp .example.env .env
# .envファイルを編集して必要な環境変数を設定

# データベースの初期化
pnpm db push
pnpm frontend introspect
```

#### 開発サーバーの起動

```bash
# フロントエンド開発サーバー (http://localhost:3000)
pnpm frontend dev

# バックエンド開発サーバー (http://localhost:3001)
pnpm backend dev
```

#### 本番環境（Docker）での実行

> [!NOTE]
> 開発環境では個別にサーバーを起動する方法が推奨されますが、本番環境ではDockerを使用した完全なスタックの起動が便利です。

完全なスタック（フロントエンド、バックエンド、DB、MinIO、Elastic Stack）:

```bash
make all
# または
COMMIT_HASH=latest docker compose -f docker-compose.yml up --build -d
```

最小限のスタック（フロントエンド、バックエンド、DBのみ）:

```bash
make min
# または
COMMIT_HASH=latest docker compose -f docker-compose.min.yml up --build -d
```

#### その他の実行コマンド

```bash
# コンテナの停止
make down

# コンテナとボリュームの削除
make clean

# コンテナ、ボリューム、イメージの削除
make fclean
```

## アーキテクチャ

```
                   +----------------+
                   |    NGINX       |
                   |  (Reverse Proxy)|
                   +--------+-------+
                            |
             +-------------+--------------+
             |                            |
      +------v-------+            +------v-------+
      |  Frontend    |            |  Backend     |
      |  (Next.js)   |<---------->|  (Fastify)   |
      +------+-------+   WebSocket+------+-------+
             |                            |
             |                            |
      +------v-------+            +------v-------+
      |  Database    |            |  MinIO       |
      |  (SQLite)    |            | (Object Store)|
      +--------------+            +--------------+
                                         |
                                  +------v-------+
                                  | Elastic Stack|
                                  | (Monitoring) |
                                  +--------------+
```

### 主要コンポーネント

- **Frontend**: Next.js (React)で構築されたSPAアプリケーション
- **Backend**: Fastifyサーバーでリアルタイムゲーム処理とAPI提供
- **Database**: SQLiteデータベースをDrizzle ORMで操作
- **Storage**: MinIOでユーザーアバター画像などを保存
- **Monitoring**: ElasticsearchとKibanaでログ監視（フル構成のみ）
- **Proxy**: Nginxでフロントエンドとバックエンドのリバースプロキシ

> [!WARNING]
> ローカル環境で実行する場合、MinIOの設定が正しく行われていないとユーザーアバターのアップロードが機能しません。環境変数`AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`が正しく設定されていることを確認してください。

## 主要技術・ライブラリ

### フロントエンド

- **Next.js 15**: Reactフレームワーク
- **Next-Auth**: 認証システム
- **TailwindCSS**: スタイリング
- **AWS SDK for JavaScript**: MinIOとの通信

### バックエンド

- **Fastify**: 高速なNode.jsフレームワーク
- **@fastify/websocket**: WebSocket通信
- **Drizzle ORM**: TypeScriptファーストなORMツール
- **UUID**: ユニークIDの生成

### データベース・ストレージ

- **SQLite**: 軽量データベース
- **libSQL**: SQLiteクライアント
- **Drizzle ORM**: TypeSafe型のORMツール
- **MinIO**: S3互換オブジェクトストレージ

### その他

- **Docker & Docker Compose**: コンテナ化とオーケストレーション
- **Elastic Stack**: ログモニタリング
- **pnpm**: パッケージマネージャ

## Drizzle ORMについて

このプロジェクトでは、データベースアクセスに**Drizzle ORM**を採用しています。Drizzleは、TypeScriptに完全対応したモダンなORMで、型安全性に優れています。

### スキーマ定義

スキーマはTypeScriptで定義され、データベースの構造を表現します。`database/schema.ts`で中央管理されています：

```typescript
// database/schema.ts（抜粋）
import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const userPasswords = sqliteTable(
  "user_password",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.userId] })]
);
```

### データベース接続

フロントエンドとバックエンドでそれぞれデータベース接続を確立します：

```typescript
// frontend/src/app/api/db.ts
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const databaseFileName = `file:${path.join(
  process.env.DB_FILE_DIR ?? "../database",
  process.env.DB_FILE_NAME ?? "database.db",
)}`;

export const client = createClient({
  url: process.env.NEXT_BUILD === "true" ? "file:./dummy.db" : databaseFileName,
});

export const db = drizzle(client, { logger: true });
```

### クエリ実行例

Drizzle ORMを使用したCRUD操作の例：

```typescript
// ユーザー検索（Select）
export async function getUserByEmail(email?: string): Promise<UserData | null> {
  if (!email) {
    return null;
  }
  const result = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return result[0] || null;
}

// トランザクションを使用したユーザー作成（Insert）
const newUserID = await db.transaction(async (tx) => {
  const [newUser] = await tx
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name,
      email,
      emailVerified: null,
      image,
    })
    .returning({ id: user.id });
  if (!newUser) {
    throw new Error("ユーザーの作成に失敗しました");
  }
  await tx.insert(userPassword).values({
    userId: newUser.id,
    passwordHash,
  });
  return newUser.id;
});

// セッション更新（Update）
await db.update(session).set(newSession).where(eq(session.userId, userID));
```

### Drizzle ORMの利点

- **型安全性**: TypeScriptの型システムを活用した完全な型チェック
- **軽量**: 余分な依存関係が少なく、高速な実行
- **SQLライク**: クエリビルダーがSQLに近い直感的な構文
- **マイグレーション**: スキーマとデータベースの同期が容易
- **トランザクションサポート**: 複数の操作を安全に実行

## 利用可能なスクリプト

プロジェクトは3つのパッケージ（frontend、backend、database）で構成されており、それぞれに異なるスクリプトが用意されています。ルートディレクトリからpnpmワークスペースを使用して各パッケージのスクリプトを実行できます。

### ルートプロジェクト

```bash
# フロントエンドコマンド実行
pnpm frontend <command>

# バックエンドコマンド実行
pnpm backend <command>

# データベースコマンド実行
pnpm db <command>
```

### フロントエンドスクリプト

```bash
# 開発サーバーの起動 (http://localhost:3000)
pnpm frontend dev

# 本番用ビルド
pnpm frontend build

# 本番モードでアプリケーションを実行
pnpm frontend start

# リンターの実行
pnpm frontend lint

# コードのフォーマット
pnpm frontend fmt

# データベーススキーマの検査
pnpm frontend introspect
```

### バックエンドスクリプト

```bash
# 開発モードでサーバーを起動
pnpm backend dev

# 本番用ビルド
pnpm backend build

# 本番モードでサーバーを実行
pnpm backend start

# コードのフォーマット
pnpm backend fmt

# データベーススキーマの検査
pnpm backend introspect
```

### データベーススクリプト

```bash
# データベーススキーマの変更をデータベースに適用
pnpm db push

# マイグレーションの実行
pnpm db migrate

# マイグレーションファイルの生成
pnpm db generate
```

> [!NOTE]
> フロントエンドとバックエンドを別々のターミナルで起動する場合は、それぞれ `pnpm frontend dev` と `pnpm backend dev` を実行します。データベースの初期化は `pnpm run generate && pnpm run migrate` で行います。

## ディレクトリ構造

```
ft_transcendence/
├── frontend/            # Next.jsフロントエンド
│   ├── src/             # ソースコード
│   │   ├── app/         # Next.js App Router
│   │   │   ├── (auth)/  # 認証関連のページ
│   │   │   ├── (authed)/# 認証済みユーザー用ページ
│   │   │   └── api/     # APIルート
│   │   ├── lib/         # 共通ライブラリ
│   │   └── types/       # 型定義
│   ├── public/          # 静的ファイル
│   └── drizzle/         # データベース関連
│
├── backend/             # Fastifyバックエンド
│   ├── src/             # ソースコード
│   │   ├── routes/      # APIルート
│   │   ├── services/    # ビジネスロジック
│   │   └── types/       # 型定義
│   └── drizzle/         # データベーススキーマ
│
├── database/            # データベース関連
│   ├── schema.ts        # データベーススキーマ定義
│   └── drizzle/         # マイグレーションファイル
│
├── nginx/               # Nginx設定
├── internal/            # 内部設定ファイル
│   └── settings/        # 各種サービス設定
│
├── docker-compose.yml         # 完全版Docker Compose設定
├── docker-compose.min.yml     # 最小構成Docker Compose設定
└── Makefile                   # ビルド・実行ヘルパー
```

## ライセンス

ISC License

このプロジェクトは42Tokyoの教育プログラムの一環として開発されました。
