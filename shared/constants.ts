// ===========================================
// ゲーム定数定義（設定値を一箇所で管理）
// ===========================================

// 画面サイズ
export const CANVAS = {
  WIDTH: 800,
  HEIGHT: 600,
} as const;

// ボール設定
export const BALL = {
  RADIUS: 10,
  DEFAULT_SPEED: 3,
} as const;

// パドル設定
export const PADDLE = {
  WIDTH: 10,
  HEIGHT: 100,
  LEFT_X: 50,      // 左パドルのX座標
  RIGHT_X: 740,    // 右パドルのX座標（800 - 50 - 10）
  MOVE_SPEED: 10,  // キー押下時の移動量
} as const;

// ゲーム設定
export const GAME = {
  DEFAULT_WINNING_SCORE: 10,
  WINNING_SCORE_OPTIONS: [5, 10, 15, 20],
  COUNTDOWN_SECONDS: 5,
  FPS: 60,
} as const;
