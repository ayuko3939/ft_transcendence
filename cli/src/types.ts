// 共有型定義（shared packageから抽出）
export interface Position {
  x: number;
  y: number;
}

export interface Ball extends Position {
  dx: number;
  dy: number;
  radius: number;
}

export interface Paddle extends Position {
  width: number;
  height: number;
}

export interface Score {
  left: number;
  right: number;
}

export type GameStatus =
  | "connecting"
  | "setup"
  | "waiting"
  | "countdown"
  | "playing"
  | "finished";
export type PlayerSide = "left" | "right" | null;
export type GameType = "online" | "local" | "tournament";

export interface GameSettings {
  ballSpeed: number;
  winningScore: number;
}

export interface GameState {
  ball: Ball;
  paddleLeft: Paddle;
  paddleRight: Paddle;
  score: Score;
  status: GameStatus;
  winner: PlayerSide;
  winningScore: number;
  gameType?: GameType;
}

export interface ChatMessage {
  name: string;
  message: string;
}

export interface GameResult {
  winner: PlayerSide;
  finalScore: Score;
  reason?: string;
  message?: string;
}

// WebSocket通信メッセージ
export type ClientMessage =
  | { type: "auth"; sessionToken: string }
  | { type: "paddleMove"; y: number; playerSide?: PlayerSide }
  | { type: "chat"; name: string; message: string }
  | { type: "surrender" }
  | { type: "gameSettings"; ballSpeed: number; winningScore: number };

export type ServerMessage =
  | { type: "init"; side: PlayerSide; state: GameState; roomId?: string }
  | { type: "gameState"; state: GameState }
  | { type: "countdown"; count: number }
  | { type: "gameStart"; state: GameState }
  | { type: "gameOver"; result: GameResult }
  | { type: "chatUpdate"; messages: ChatMessage[] }
  | { type: "waitingForPlayer" };

// CLI固有の型定義
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface UserSession {
  sessionToken: string;
  userId: string;
  username: string;
}

export interface CLIConfig {
  serverUrl: string;
  wsUrl: string;
  authUrl: string;
}
