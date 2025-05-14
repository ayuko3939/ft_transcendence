export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Score {
  left: number;
  right: number;
}

export interface GameState {
  ball: Ball;
  paddleLeft: Paddle;
  paddleRight: Paddle;
  score: Score;
}

export interface ChatMessage {
  userId?: string;
  username?: string;
  name?: string;
  message: string;
  timestamp?: Date;
}

// プレイヤーサイドの型定義（観戦者を追加）
export type PlayerSide = "left" | "right" | "spectator" | null;

// ゲームセッションステータスの型定義
export type GameSessionStatus = 
  | "waiting"   // ゲーム開始待ち
  | "countdown" // カウントダウン中
  | "playing"   // ゲーム進行中
  | "finished"  // ゲーム終了
  | "abandoned"; // 放棄（プレイヤーが離脱）

// WebSocketメッセージの型定義
export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

// ゲームセッション情報の型定義
export interface GameSessionInfo {
  id: string;
  name: string;
  status: GameSessionStatus;
  players: {
    left: { userId: string; username: string } | null;
    right: { userId: string; username: string } | null;
  };
  spectatorCount: number;
  createdAt: Date | string;
  score: Score;
}
