/**
 * ゲーム関連の定数定義
 */
export const GAME_CONSTANTS = {
    // キャンバスサイズ
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    
    // ボール設定
    BALL_RADIUS: 10,
    INITIAL_BALL_SPEED: 5,
    
    // パドル設定
    PADDLE_WIDTH: 10,
    PADDLE_HEIGHT: 100,
    PADDLE_LEFT_X: 50,
    PADDLE_RIGHT_X: 740,
    
    // ゲーム設定
    WINNING_SCORE: 10,
    COUNTDOWN_SECONDS: 5,
    FPS: 60,
  };
  
  /**
   * WebSocketメッセージの種類
   */
  export enum MessageType {
    // ゲーム初期化・進行関連
    INIT = "init",
    COUNTDOWN = "countdown",
    GAME_START = "gameStart",
    GAME_STATE = "gameState",
    GAME_OVER = "gameOver",
    
    // プレイヤー操作関連
    PADDLE_MOVE = "paddleMove",
    PADDLE_STATE = "paddleState",
    SURRENDER = "surrender",
    
    // コミュニケーション関連
    CHAT = "chat",
  }
  