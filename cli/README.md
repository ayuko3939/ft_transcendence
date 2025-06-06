# Pong CLI クライアント

ブラウザ版のft_transcendenceサーバーに接続してPongゲームをプレイできるCLIクライアントです。

## 機能

- **認証**: メールアドレス＋パスワードでログイン
- **ランダムマッチ**: 他のプレイヤーとのオンライン対戦
- **ルーム参加**: 特定のルームIDを指定して対戦
- **リアルタイムゲーム**: WebSocketによるリアルタイム通信
- **チャット機能**: ゲーム中のテキストチャット
- **テキストUI**: blessedによる高機能なターミナルUI

## インストール

```bash
cd cli
npm install
```

## ビルド

```bash
npm run build
```

## 実行

### 開発モード
```bash
npm run dev
```

### 本番モード（ビルド後）
```bash
npm start
```

### コマンドラインオプション

```bash
# デフォルト設定で起動
./dist/index.js

# 開発モードで起動（localhost:3000/3001に直接接続）
./dist/index.js --dev

# カスタムサーバーで起動
./dist/index.js --server http://your-server.com

# WebSocket URLを指定
./dist/index.js --ws ws://your-server.com/api/game

# 認証API URLを指定
./dist/index.js --auth http://your-server.com/api/auth

# ヘルプを表示
./dist/index.js --help
```

## 使用方法

1. **起動**: CLIを起動すると認証画面が表示されます
2. **ログイン**: メールアドレスとパスワードを入力
3. **ゲーム選択**: ランダムマッチまたはルーム参加を選択
4. **ゲームプレイ**: 
   - `W/S`または`↑/↓`: パドル移動
   - `C`: チャット入力
   - `Q`: ゲーム中断
   - `Ctrl+C`: CLI終了

## ネットワーク設定

### 本番環境（デフォルト）
- サーバーURL: `http://localhost` (Nginx経由)
- WebSocket: `ws://localhost/api/game`
- 認証API: `http://localhost/api/auth`

### 開発環境（`--dev`フラグ）
- サーバーURL: `http://localhost:3001` (バックエンド直接)
- WebSocket: `ws://localhost:3001/api/game`
- 認証API: `http://localhost:3000/api/auth` (フロントエンド)

## アーキテクチャ

### ファイル構成
```
src/
├── index.ts          # メインエントリーポイント
├── auth.ts           # 認証クライアント
├── game-client.ts    # WebSocketゲームクライアント
├── game-ui.ts        # ターミナルUI
├── config.ts         # 設定管理
└── types.ts          # 型定義
```

### 主要クラス

- **PongCLI**: メインアプリケーション制御
- **AuthClient**: Next-Auth APIとの認証処理
- **GameClient**: WebSocketによるゲーム通信
- **GameUI**: blessed.jsによるターミナルUI

## トラブルシューティング

### 接続エラー
- サーバーが起動していることを確認
- ネットワーク設定（URL/ポート）を確認
- 開発モードの場合は`--dev`フラグを使用

### 認証エラー
- メールアドレスとパスワードが正しいことを確認
- アカウントがWebアプリで作成済みであることを確認

### WebSocketエラー
- WebSocket URLが正しいことを確認
- ファイアウォール設定を確認
- プロキシ設定を確認

## 開発

### 依存関係
- `ws`: WebSocket通信
- `axios`: HTTP通信
- `inquirer`: 対話式CLI
- `blessed`: ターミナルUI
- `colors`: テキスト装飾
- `yargs`: コマンドライン引数解析

### 型安全性
- TypeScriptによる厳密な型チェック
- 共有型定義でサーバーとの整合性を保証

### フォーマット
```bash
npm run fmt
```