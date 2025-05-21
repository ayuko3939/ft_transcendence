// ===== メッセージの型定義 =====

// WebSocketメッセージの型定義
export interface ChatMessage {
  type: "chat";
  name: string;
  message: string;
}

export interface PaddleMoveMessage {
  type: "paddleMove";
  y: number;
}

export interface SurrenderMessage {
  type: "surrender";
}

// ゲーム設定メッセージの型を追加
export interface GameSettingsMessage {
  type: "gameSettings";
  settings: GameSettings;
}

export type GameMessage =
  | ChatMessage
  | PaddleMoveMessage
  | SurrenderMessage
  | GameSettingsMessage;

// サーバーからクライアントへのメッセージ型定義
export interface InitMessage {
  type: "init";
  side: "left" | "right";
  gameState: GameState;
}

export interface CountdownMessage {
  type: "countdown";
  count: number;
}

export interface GameStartMessage {
  type: "gameStart";
  gameState: GameState;
}

export interface GameStateMessage {
  type: "gameState";
  ball: GameState["ball"];
  paddleLeft: GameState["paddleLeft"];
  paddleRight: GameState["paddleRight"];
  score: GameState["score"];
  gameOver: boolean;
  winner: "left" | "right" | null;
}

export interface GameOverMessage {
  type: "gameOver";
  winner: "left" | "right" | null;
  leftScore: number;
  rightScore: number;
  reason?: string;
  message?: string;
}

export type ServerMessage =
  | InitMessage
  | CountdownMessage
  | GameStartMessage
  | GameStateMessage
  | GameOverMessage;
