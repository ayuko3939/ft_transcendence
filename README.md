# ft_transcendence

オンラインマルチプレイヤーPongゲームプラットフォーム

## 概要

このプロジェクトは、クラシックなPongゲームのモダンな解釈を提供する Web アプリケーションです。

### 主な機能

- リアルタイムPong対戦
- ユーザー認証システム
- チャットシステム
- ユーザープロフィール
- マッチメイキング
- ランキングシステム

## 技術スタック

- フロントエンド: TypeScript
- バックエンド: Node.js + Fastify
- データベース: SQLite
- リアルタイム通信: WebSocket

## 必要条件

- Node.js (v18以上推奨)
- pnpm 9.15.0以上

## 注意事項

- npmではなく、**pnpm**を使用してください

## セットアップと実行方法

1. リポジトリのクローン: 

```bash
git clone https://github.com/ayuko3939/ft_transcendence.git
cd ft_transcendence
```

2. 依存パッケージのインストール:

```bash
pnpm install
```

3. アプリケーションの実行:

方法1: 全サービスを同時に起動

```bash
pnpm -r dev
```

方法2: 各サービスを個別に起動

```bash
# フロントエンド
cd frontend
pnpm dev

# バックエンド
cd backend
pnpm dev
```

## 開発環境のセットアップ

1. 環境変数の設定:

### 現状は無し


