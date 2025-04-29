// ゲームの状態
export interface GameState {
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
  };
  paddleLeft: {
    y: number;
  };
  paddleRight: {
    y: number;
  };
  score: {
    left: number;
    right: number;
  };
  gameOver: boolean;
  winner: 'left' | 'right' | null;
}

// ゲームエンジン
export interface IGameEngine {
  update(): void;
}
