import { WebSocket } from "ws";

// ===== ゲームの基本的なデータ構造 =====

// ゲームの設定用の型を追加
export interface GameSettings {
  ballSpeed: number;
  winningScore: number;
}

// ゲームの状態
export interface GameState {
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
  };
  paddleLeft: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  paddleRight: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score: {
    left: number;
    right: number;
  };
  gameOver: boolean;
  winner: "left" | "right" | null;
  winningScore: number;
  ballSpeed: number;
}

// ゲームルーム
export interface GameRoom {
  players: {
    left?: WebSocket;
    right?: WebSocket;
  };
  gameState: GameState;
  chats: {
    name: string;
    message: string;
  }[];
  gameStarted: boolean;
  // インターバルタイマーの参照を管理
  gameIntervals: {
    countdownInterval?: NodeJS.Timeout;
    gameInterval?: NodeJS.Timeout;
    [key: string]: NodeJS.Timeout | undefined;
  };
  // ゲーム設定状態を追加
  settings: GameSettings;
  leftPlayerReady: boolean;
}

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
