// ===========================================
// 基本ゲーム型定義（フロント・バック共通）
// ===========================================

// 座標を持つオブジェクトの基本型
export interface Position {
  x: number;
  y: number;
}

// ===========================================
// ゲームオブジェクト
// ===========================================

// ボール（位置 + 移動速度 + サイズ）
export interface Ball extends Position {
  dx: number; // X方向の速度
  dy: number; // Y方向の速度
  radius: number; // ボールの半径
}

// パドル（位置 + サイズ）
export interface Paddle extends Position {
  width: number; // パドルの幅
  height: number; // パドルの高さ
}

// スコア
export interface Score {
  left: number; // 左プレイヤーの得点
  right: number; // 右プレイヤーの得点
}

// ===========================================
// ゲーム状態・設定
// ===========================================

// ゲームの進行状況（分かりやすい名前）
export type GameStatus = 'connecting' | 'setup' | 'waiting' | 'countdown' | 'playing' | 'finished';

// プレイヤーの位置（左・右・未決定）
export type PlayerSide = "left" | "right" | null;

// ゲームタイプ（オンライン・ローカル・トーナメント）
export type GameType = "online" | "local" | "tournament";

// ゲーム設定（プレイヤーが変更可能な項目）
export interface GameSettings {
  ballSpeed: number; // ボールの速度 (1-10)
  winningScore: number; // 勝利に必要な点数 (5, 10, 15, 20)
}

// ゲーム全体の状態
export interface GameState {
  ball: Ball;
  paddleLeft: Paddle;
  paddleRight: Paddle;
  score: Score;
  status: GameStatus; // 現在のゲーム進行状況
  winner: PlayerSide; // 勝者（ゲーム終了時のみ）
  winningScore: number; // 勝利条件の点数
  gameType?: GameType; // ゲームタイプ
}

// ===========================================
// チャット・結果
// ===========================================

// チャットメッセージ
export interface ChatMessage {
  name: string; // 送信者の名前
  message: string; // メッセージ内容
}

// ゲーム結果（ゲーム終了時の詳細情報）
export interface GameResult {
  winner: PlayerSide; // 勝者
  finalScore: Score; // 最終スコア
  reason?: string; // 終了理由（'completed', 'surrendered', 'disconnected'等）
  message?: string; // プレイヤー向けメッセージ
}

// ===========================================
// WebSocket通信メッセージ
// ===========================================

// クライアント → サーバー へのメッセージ
export type ClientMessage =
  | { type: "auth"; sessionToken: string } // 認証情報送信
  | { type: "paddleMove"; y: number; playerSide?: PlayerSide } // パドル移動
  | { type: "chat"; name: string; message: string } // チャット送信
  | { type: "surrender" } // ゲーム中断
  | { type: "gameSettings"; ballSpeed: number; winningScore: number }; // ゲーム設定

// サーバー → クライアント へのメッセージ
export type ServerMessage =
  | { type: "init"; side: PlayerSide; state: GameState; roomId?: string } // 初期化・プレイヤー割り当て
  | { type: "gameState"; state: GameState } // ゲーム状態更新
  | { type: "countdown"; count: number } // カウントダウン
  | { type: "gameStart"; state: GameState } // ゲーム開始
  | { type: "gameOver"; result: GameResult } // ゲーム終了
  | { type: "chatUpdate"; messages: ChatMessage[] } // チャット更新
  | { type: "waitingForPlayer" } // プレイヤー待機中
  | { type: "error"; message: string }; // エラーメッセージ
