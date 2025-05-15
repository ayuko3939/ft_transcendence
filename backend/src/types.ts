import { WebSocket } from 'ws';

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
  // gameOver: boolean;
  // winner: 'left' | 'right' | null;
};

// export interface WSConn {
//   socket: WebSocket;
// }

export interface GameRoom {
  players: {
    left?: WebSocket;
    right?: WebSocket;
  };
  gameState: {
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
  };
  chats: {
    name: string;
    message: string;
  }[];
  gameStarted: boolean;
};
