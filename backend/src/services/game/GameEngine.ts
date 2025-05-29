import type {
  GameState,
  GameSettings,
  PlayerSide,
} from "@ft-transcendence/shared";
import { CANVAS, PADDLE, BALL } from "@ft-transcendence/shared";

export class GameEngine {
  /**
   * ゲームエンジンを初期化
   * - ゲーム状態とゲーム設定を受け取る
   */
  constructor(
    private gameState: GameState,
    private settings: GameSettings,
  ) {
    // ゲーム状態の初期化
    if (this.gameState.status === undefined) {
      this.gameState.status = "playing";
    }
    if (this.gameState.winner === undefined) {
      this.gameState.winner = null;
    }
    if (this.gameState.winningScore === undefined) {
      this.gameState.winningScore = this.settings.winningScore;
    }
    // gameTypeはオプショナルなので、設定されていない場合はデフォルトでonlineとする
    if (this.gameState.gameType === undefined) {
      this.gameState.gameType = "online";
    }
  }

  /**
   * ゲーム状態の更新メソッド
   * 1. ゲーム終了チェック
   * 2. ボールの移動
   * 3. 得点判定 - 得点が入った場合は処理終了
   * 4. パドル衝突判定 - 優先的に処理
   * 5. 壁衝突判定 - パドルと衝突していない場合のみ
   * 6. 勝者判定
   */
  update(): void {
    // 0.ゲームが終了している場合は更新しない
    if (!this.gameState || this.gameState.status === "finished") return;

    // 1.ボールの移動
    this.gameState.ball.x += this.gameState.ball.dx;
    this.gameState.ball.y += this.gameState.ball.dy;

    // 2.得点判定（左右の壁に到達した場合） 得点が入った場合は残りの処理をスキップ
    if (this.checkScore()) {
      return;
    }

    // 3.パドルとの衝突判定を優先
    const paddleCollision = this.checkPaddleCollision();

    // 4.パドルと衝突していない場合のみ、上下の壁との衝突判定
    if (!paddleCollision) {
      this.checkWallCollision();
    }

    // 5.勝者判定
    this.checkWinner();
  }

  /**
   * パドルとの衝突判定
   * - 表側からアプローチしている場合のみ衝突判定
   * - パドルの範囲内でのみ衝突を判定
   * - 上下の壁とパドルの交差点では両方向の速度を反転
   *
   * @returns パドルと衝突したかどうか
   */
  private checkPaddleCollision(): boolean {
    let paddleCollided = false;

    // ===== 左パドルとの衝突判定 =====
    if (
      this.gameState.ball.dx < 0 && // 左方向に移動中（表側からアプローチ）
      this.gameState.ball.x <=
        this.gameState.paddleLeft.x + this.gameState.paddleLeft.width &&
      this.gameState.ball.x >= this.gameState.paddleLeft.x &&
      this.gameState.ball.y >= this.gameState.paddleLeft.y &&
      this.gameState.ball.y <=
        this.gameState.paddleLeft.y + this.gameState.paddleLeft.height
    ) {
      // 壁との交差点かどうかをチェック
      const nearTopWall = this.gameState.ball.y <= BALL.RADIUS;
      const nearBottomWall =
        this.gameState.ball.y >= CANVAS.HEIGHT - BALL.RADIUS;

      // パドルと壁の交差点にいる場合、両方向に反転
      if (nearTopWall || nearBottomWall) {
        this.gameState.ball.dx *= -1;
        this.gameState.ball.dy *= -1;
      } else {
        // 通常のパドル衝突
        this.gameState.ball.dx *= -1;
      }

      paddleCollided = true;
    }

    // ===== 右パドルとの衝突判定（左パドルと衝突していない場合） =====
    if (
      !paddleCollided && // 左パドルとの衝突がない場合のみ
      this.gameState.ball.dx > 0 && // 右方向に移動中（表側からアプローチ）
      this.gameState.ball.x >= this.gameState.paddleRight.x &&
      this.gameState.ball.x <=
        this.gameState.paddleRight.x + this.gameState.paddleRight.width &&
      this.gameState.ball.y >= this.gameState.paddleRight.y &&
      this.gameState.ball.y <=
        this.gameState.paddleRight.y + this.gameState.paddleRight.height
    ) {
      // 壁との交差点かどうかをチェック
      const nearTopWall = this.gameState.ball.y <= BALL.RADIUS;
      const nearBottomWall =
        this.gameState.ball.y >= CANVAS.HEIGHT - BALL.RADIUS;

      // パドルと壁の交差点にいる場合、両方向に反転
      if (nearTopWall || nearBottomWall) {
        this.gameState.ball.dx *= -1;
        this.gameState.ball.dy *= -1;
      } else {
        // 通常のパドル衝突
        this.gameState.ball.dx *= -1;
      }

      paddleCollided = true;
    }

    return paddleCollided;
  }

  /**
   * 上下の壁との衝突判定
   * - パドルとの衝突がなかった場合のみ実行
   * - 上下の壁に到達した場合、Y方向の速度を反転
   */
  private checkWallCollision(): void {
    if (this.gameState.ball.y <= 0 || this.gameState.ball.y >= CANVAS.HEIGHT) {
      this.gameState.ball.dy *= -1;
    }
  }

  /**
   * 得点判定
   * - ボールが左右の壁に到達した場合、得点を加算
   * - 得点が入った場合はボールをリセット
   *
   * @returns 得点が入ったかどうか
   */
  private checkScore(): boolean {
    // 右側の壁に到達：左側のプレイヤーが得点
    if (this.gameState.ball.x >= CANVAS.WIDTH) {
      this.gameState.score.left++;
      this.resetBall();
      return true;
    }
    // 左側の壁に到達：右側のプレイヤーが得点
    if (this.gameState.ball.x <= 0) {
      this.gameState.score.right++;
      this.resetBall();
      return true;
    }
    return false;
  }

  /**
   * 勝者判定
   * - スコアが勝利点数に達したかチェック
   * - 達した場合はゲーム終了フラグを立て、勝者を記録
   */
  private checkWinner(): void {
    const winningScore = this.gameState.winningScore;

    if (this.gameState.score.left >= winningScore) {
      this.gameState.status = "finished";
      this.gameState.winner = "left";
    } else if (this.gameState.score.right >= winningScore) {
      this.gameState.status = "finished";
      this.gameState.winner = "right";
    }
  }

  /**
   * ボールのリセット
   * - ボールを中央にリセット
   * - ランダムな方向（左右・上下）に初期速度を設定
   */
  private resetBall(): void {
    const ballSpeed = this.settings.ballSpeed; // GameSettingsから速度を取得

    this.gameState.ball = {
      x: CANVAS.WIDTH / 2,
      y: CANVAS.HEIGHT / 2,
      dx: ballSpeed * (Math.random() > 0.5 ? 1 : -1),
      dy: ballSpeed * (Math.random() > 0.5 ? 1 : -1),
      radius: BALL.RADIUS,
    };
  }
}
