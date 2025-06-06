import blessed from "blessed";
import type { GameState, PlayerSide, ChatMessage, GameResult } from "./types";

export class GameUI {
  private screen: any;
  private gameBox: any;
  private scoreBox: any;
  private statusBox: any;

  private currentState: GameState | null = null;
  private playerSide: PlayerSide = null;
  private opponentName: string = "Opponent";

  // ゲームフィールドの定数
  private readonly FIELD_WIDTH = 80;
  private readonly FIELD_HEIGHT = 20;
  private readonly PADDLE_HEIGHT = 4;

  // 実際のゲーム座標系（Web版と同じ）
  private readonly GAME_WIDTH = 800;
  private readonly GAME_HEIGHT = 600;
  private readonly GAME_PADDLE_HEIGHT = 100;
  private readonly PADDLE_MOVE_SPEED = 10;

  // イベントハンドラー
  public onPaddleMove?: (y: number) => void;
  public onQuit?: () => void;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "Pong CLI Game",
    });

    this.setupUI();
    this.setupKeyHandlers();
  }

  private setupUI(): void {
    // メインゲームエリア（画面全体の80%）
    this.gameBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: "80%",
      height: "40%",
      border: {
        type: "line",
      },
      style: {
        border: {
          fg: "cyan",
        },
      },
      label: " PONG ",
      content: "",
    });

    // スコア表示エリア
    this.scoreBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: "80%",
      width: "20%",
      height: "20%",
      border: {
        type: "line",
      },
      style: {
        border: {
          fg: "yellow",
        },
      },
      label: " SCORE ",
      content: "You: 0\nOpponent: 0",
      tags: true,
    });

    // ステータス表示エリア（カウントダウンなど）
    this.statusBox = blessed.box({
      parent: this.screen,
      top: "20%",
      left: "80%",
      width: "20%",
      height: "20%",
      border: {
        type: "line",
      },
      style: {
        border: {
          fg: "green",
        },
      },
      label: " STATUS ",
      content:
        "Connecting...\n\n{center}W/S: Move{/center}\n{center}Ctrl+C: Quit{/center}",
      tags: true,
    });

    this.screen.render();
  }

  private setupKeyHandlers(): void {
    // パドル移動
    this.screen.key(["w", "up"], () => {
      this.movePaddle(-1);
    });

    this.screen.key(["s", "down"], () => {
      this.movePaddle(1);
    });

    // 終了
    this.screen.key(["C-c"], () => {
      if (this.onQuit) {
        this.onQuit();
      }
      process.exit(0);
    });
  }

  private movePaddle(direction: number): void {
    if (!this.currentState || !this.playerSide) return;

    const paddle =
      this.playerSide === "left"
        ? this.currentState.paddleLeft
        : this.currentState.paddleRight;

    // Web版と同じ座標系で動作
    const moveAmount = direction * this.PADDLE_MOVE_SPEED;
    const newY = Math.max(
      0,
      Math.min(
        this.GAME_HEIGHT - this.GAME_PADDLE_HEIGHT,
        paddle.y + moveAmount,
      ),
    );

    if (this.onPaddleMove) {
      this.onPaddleMove(newY);
    }
  }

  /**
   * ゲーム初期化時の表示更新
   */
  public onGameInit(side: PlayerSide, state: GameState, roomId?: string): void {
    this.playerSide = side;
    this.currentState = state;

    this.updateStatus(`${this.getStatusText(state.status)}`);
    this.updateScore(state.score);
    this.updateGameField();
    this.screen.render();
  }

  /**
   * ゲーム状態更新時の表示更新
   */
  public onGameStateUpdate(state: GameState): void {
    this.currentState = state;
    this.updateGameField();
    this.updateScore(state.score);
    this.updateStatus(this.getStatusText(state.status));
    this.screen.render();
  }

  /**
   * カウントダウン表示
   */
  public onCountdown(count: number): void {
    this.updateStatus(
      `{center}{bold}{yellow-fg}${count}{/yellow-fg}{/bold}{/center}`,
    );
    this.screen.render();
  }

  /**
   * ゲーム終了時の表示
   */
  public onGameOver(result: GameResult): void {
    const isWinner = result.winner === this.playerSide;

    this.updateStatus(
      `{center}{bold}GAME OVER{/bold}{/center}\n\n` +
        `{center}${isWinner ? "{green-fg}{bold}YOU WIN!{/bold}{/green-fg}" : "{red-fg}{bold}YOU LOSE{/bold}{/red-fg}"}{/center}\n\n` +
        `{center}Final Score{/center}\n` +
        `{center}${result.finalScore.left} - ${result.finalScore.right}{/center}`,
    );

    this.screen.render();
  }

  /**
   * 待機状態の表示
   */
  public onWaitingForPlayer(): void {
    this.updateStatus(`{center}Waiting for opponent...{/center}`);
    this.screen.render();
  }

  /**
   * エラー表示
   */
  public showError(message: string): void {
    this.updateStatus(`{center}{red-fg}ERROR: ${message}{/red-fg}{/center}`);
    this.screen.render();
  }

  /**
   * ゲームフィールドの描画
   */
  private updateGameField(): void {
    if (!this.currentState) {
      this.gameBox.setContent("ゲーム状態を読み込み中...");
      return;
    }

    const { ball, paddleLeft, paddleRight } = this.currentState;

    // フィールドを空白で初期化
    const field: string[][] = [];
    for (let y = 0; y < this.FIELD_HEIGHT; y++) {
      field[y] = new Array(this.FIELD_WIDTH).fill(" ");
    }

    // 境界線を描画
    for (let x = 0; x < this.FIELD_WIDTH; x++) {
      field[0][x] = "-";
      field[this.FIELD_HEIGHT - 1][x] = "-";
    }
    for (let y = 0; y < this.FIELD_HEIGHT; y++) {
      field[y][0] = "|";
      field[y][this.FIELD_WIDTH - 1] = "|";
    }

    // 中央線を描画
    const centerX = Math.floor(this.FIELD_WIDTH / 2);
    for (let y = 1; y < this.FIELD_HEIGHT - 1; y++) {
      field[y][centerX] = y % 2 === 0 ? "|" : " ";
    }

    // パドルを描画
    this.drawPaddle(field, paddleLeft, 2, "█");
    this.drawPaddle(field, paddleRight, this.FIELD_WIDTH - 3, "█");

    // ボールを描画
    const ballX =
      Math.round((ball.x / this.GAME_WIDTH) * (this.FIELD_WIDTH - 2)) + 1;
    const ballY =
      Math.round((ball.y / this.GAME_HEIGHT) * (this.FIELD_HEIGHT - 2)) + 1;

    if (
      ballX > 0 &&
      ballX < this.FIELD_WIDTH - 1 &&
      ballY > 0 &&
      ballY < this.FIELD_HEIGHT - 1
    ) {
      field[ballY][ballX] = "●";
    }

    // フィールドを文字列に変換
    const fieldContent = field.map((row) => row.join("")).join("\n");
    this.gameBox.setContent(fieldContent);
  }

  private drawPaddle(
    field: string[][],
    paddle: any,
    x: number,
    char: string,
  ): void {
    const paddleY =
      Math.round((paddle.y / this.GAME_HEIGHT) * (this.FIELD_HEIGHT - 2)) + 1;
    const paddleHeight = Math.round(
      (this.GAME_PADDLE_HEIGHT / this.GAME_HEIGHT) * (this.FIELD_HEIGHT - 2),
    );

    for (
      let i = 0;
      i < paddleHeight && paddleY + i < this.FIELD_HEIGHT - 1;
      i++
    ) {
      if (paddleY + i > 0) {
        field[paddleY + i][x] = char;
      }
    }
  }

  private updateScore(score: { left: number; right: number }): void {
    const myScore = this.playerSide === "left" ? score.left : score.right;
    const opponentScore = this.playerSide === "left" ? score.right : score.left;

    this.scoreBox.setContent(
      `{center}You{/center}\n` +
        `{center}{bold}{green-fg}${myScore}{/green-fg}{/bold}{/center}\n\n` +
        `{center}${this.opponentName}{/center}\n` +
        `{center}{bold}{red-fg}${opponentScore}{/red-fg}{/bold}{/center}`,
    );
  }

  private updateStatus(text: string): void {
    this.statusBox.setContent(text);
  }

  private getStatusText(status: string): string {
    switch (status) {
      case "connecting":
        return "{center}Connecting...{/center}";
      case "setup":
        return "{center}Setting up...{/center}";
      case "waiting":
        return "{center}Preparing...{/center}";
      case "countdown":
        return "{center}Starting soon...{/center}";
      case "playing":
        return "{center}{green-fg}{bold}PLAYING{/bold}{/green-fg}{/center}\n\n{center}W/S: Move{/center}\n{center}Ctrl+C: Quit{/center}";
      case "finished":
        return "{center}Finished{/center}";
      default:
        return `{center}${status}{/center}`;
    }
  }

  /**
   * UI をクリーンアップ
   */
  public destroy(): void {
    this.screen.destroy();
  }

  /**
   * 画面を再描画
   */
  public render(): void {
    this.screen.render();
  }
}
