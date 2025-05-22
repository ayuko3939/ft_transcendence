import type { WebSocket } from "ws";

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
