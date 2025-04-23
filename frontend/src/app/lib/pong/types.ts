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
    name: string;
    message: string;
  }
  
  export type PlayerSide = 'left' | 'right' | null;
  
  export interface WebSocketMessage {
    type: string;
    [key: string]: unknown;
  }
