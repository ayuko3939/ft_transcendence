# Pong CLI クライアント

ft_transcendence プロジェクト用のコマンドライン Pong ゲームクライアントです。ターミナル上でリアルタイムのオンライン Pong ゲームをプレイできます。

## 概要

このCLIクライアントは、Webブラウザを使わずにターミナルから直接 ft_transcendence のPongゲームをプレイできるアプリケーションです。

### 主な機能

- リアルタイム オンライン Pong ゲーム
- ユーザー認証 (メール/パスワード)
- ゲーム設定 (ボール速度、勝利ポイント)
- ランダムマッチング
- リアルタイムスコア表示
- 色付きTUIインターフェース
- 直感的なキーコントロール

## インストール

### 必要な環境

- Node.js 18.0.0 以上
- pnpm (推奨) または npm
- UTF-8対応ターミナル

### セットアップ

1. 依存関係のインストール
```bash
# プロジェクトルートで
pnpm install

# またはCLIディレクトリで直接
cd cli
pnpm install
```

2. ビルド
```bash
cd cli
pnpm build
```

## 使用方法

### 基本的な使用方法

```bash
# 開発モード（TypeScript直接実行）
cd cli
pnpm dev

# 本番モード（ビルド後実行）
cd cli
pnpm start

# またはグローバルインストール後
npm install -g .
pong-cli
```

### コマンドラインオプション

```bash
pong-cli [options]

Options:
  -s, --server <url>   サーバーURL (デフォルト: http://localhost)
  -a, --auth <url>     認証API URL
  -w, --ws <url>       WebSocket URL
  -d, --dev            開発モード
  -h, --help           ヘルプを表示
  -V, --version        バージョンを表示

Examples:
  pong-cli                           # デフォルト設定で起動
  pong-cli --dev                     # 開発モードで起動
  pong-cli -s http://example.com     # カスタムサーバーで起動
```

### ゲームプレイ

#### 1. 認証
アプリ起動後、メールアドレスとパスワードを入力してログインします。

#### 2. メインメニュー
- ランダムマッチに参加: 他のプレイヤーとのマッチングを開始
- 終了: アプリを終了

#### 3. ゲーム設定（セットアップ時）
ゲーム開始前に以下の設定が可能です：
- SPACE: 設定モーダルを開く
- ボール速度: 1-30 (デフォルト: 5)
- 勝利ポイント: 1-30 (デフォルト: 5)

#### 4. ゲームコントロール
```
W / ↑     パドルを上に移動
S / ↓     パドルを下に移動
Ctrl+C    ゲーム終了
```

#### 5. ゲーム終了時
```
ENTER     メインメニューに戻る
Ctrl+C    アプリを終了
```

## 画面構成

```
┌─────────────────────────────────── PONG ────────────────────────────────────┐
│                                                                             │
│  █                                     │                                 █  │
│  █                                     │                                 █  │
│  █                  ●                  │                                 █  │
│  █                                     │                                 █  │
│                                        │                                    │
└─────────────────────────────────────────────────────────────────────────────┘
┌─ SCORE ─┐  ┌─ STATUS ─┐
│  You    │  │ PLAYING  │
│   3     │  │          │
│         │  │ W/S: Move│
│Opponent │  │Ctrl+C:Quit│
│   2     │  └──────────┘
└─────────┘
```

## 技術仕様

### アーキテクチャ

```
┌─────────────┐    WebSocket     ┌─────────────┐
│ CLI Client  │ ←─────────────→  │ Game Server │
│             │                  │             │
│ - GameUI    │    HTTP/Auth     │ - Fastify   │
│ - blessed   │ ←─────────────→  │ - Socket.io │
│ - inquirer  │                  │             │
└─────────────┘                  └─────────────┘
```

### 使用技術

#### フロントエンド (CLI)
- TypeScript: 型安全な開発
- blessed: TUI (Text User Interface) ライブラリ
- inquirer: インタラクティブなプロンプト
- WebSocket (ws): リアルタイム通信
- axios: HTTP通信
- yargs: コマンドライン引数解析

#### 通信プロトコル
- WebSocket: ゲーム状態の同期、リアルタイム更新
- HTTP: 認証、ユーザー管理
- JSON: メッセージフォーマット

### プロジェクト構造

```
cli/
├── src/
│   ├── index.ts          # メインエントリーポイント
│   ├── game-ui.ts        # ゲームUI (blessed)
│   ├── game-client.ts    # WebSocketクライアント
│   ├── auth.ts           # 認証クライアント
│   ├── config.ts         # 設定管理
│   └── types.ts          # 型定義
├── package.json          # 依存関係とスクリプト
├── tsconfig.json         # TypeScript設定
└── README.md            # このファイル
```

### 主要クラス

#### PongCLI
- メインアプリケーションクラス
- ライフサイクル管理、認証、メニュー表示

#### GameUI
- blessed ベースのゲーム画面
- リアルタイム描画、ユーザー入力処理

#### GameClient
- WebSocket通信管理
- ゲーム状態同期、メッセージ処理

#### AuthClient
- HTTP認証クライアント
- ログイン、セッション管理

### 設定

#### 環境別設定

**本番環境** (NODE_ENV=production)
```javascript
{
  serverUrl: "http://localhost",
  wsUrl: "ws://localhost/api/game", 
  authUrl: "http://localhost/api/auth"
}
```

**開発環境** (NODE_ENV=development または --dev)
```javascript
{
  serverUrl: "http://localhost:3001",
  wsUrl: "ws://localhost:3001/game",
  authUrl: "http://localhost:3000/api/auth"
}
```

## 開発

### 開発サーバー起動

```bash
# フロントエンド開発サーバー
pnpm frontend dev

# バックエンド開発サーバー  
pnpm backend dev

# CLI開発モード
cd cli
pnpm dev
```

### ビルドとフォーマット

```bash
cd cli

# TypeScriptビルド
pnpm build

# コードフォーマット
pnpm fmt
```

### デバッグ

開発時は詳細なログが出力されます：

```bash
# 開発モードで起動
pnpm dev

# またはデバッグログ有効
DEBUG=* pnpm dev
```

## トラブルシューティング

### よくある問題

#### 1. 接続エラー
```
接続に失敗しました: Connection refused
```
**解決方法**: サーバーが起動していることを確認してください。

```bash
# バックエンドサーバー起動
pnpm backend dev
```

#### 2. 認証エラー
```
ログインに失敗しました
```
**解決方法**: 
- メールアドレスとパスワードを確認
- フロントエンドでユーザー登録が済んでいることを確認

#### 3. 画面表示の崩れ
**解決方法**:
- ターミナルサイズを大きくする (最小80x24推奨)
- UTF-8対応ターミナルを使用

#### 4. キーボード入力が反応しない
**解決方法**:
- Ctrl+C で一度終了し、再起動
- ターミナルをリセット

### 画面サイズ要件

最適な表示のため、以下のターミナルサイズを推奨します：
- 最小: 80列 x 24行
- 推奨: 100列 x 30行以上

### 対応ターミナル

テスト済み：
- macOS Terminal
- iTerm2  
- Windows Terminal
- Ubuntu Terminal
- VS Code Integrated Terminal

制限あり：
- Git Bash (色表示制限)
- 古いバージョンのCmd.exe

## ライセンス

MIT License

## 貢献

1. フォークしてブランチを作成
2. 機能を実装・テスト
3. プルリクエストを作成

## サポート

問題や質問がある場合は、プロジェクトのIssueページで報告してください。

---

**ターミナルでPongを楽しんでください！**