import blessed from "blessed";
import type { GameState, PlayerSide, ChatMessage, GameResult } from "./types";

export class GameUI {
  private screen: any;
  private gameBox: any;
  private scoreBox: any;
  private statusBox: any;
  private settingsModal: any;

  private currentState: GameState | null = null;
  private playerSide: PlayerSide = null;
  private opponentName: string = "Opponent";
  private isSettingsModalOpen: boolean = false;
  private isGameEnded: boolean = false;

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
  public onGameSettings?: (ballSpeed: number, winningScore: number) => void;
  public onReturnToMenu?: () => void;

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
      if (!this.isSettingsModalOpen) {
        this.movePaddle(-1);
      }
    });

    this.screen.key(["s", "down"], () => {
      if (!this.isSettingsModalOpen) {
        this.movePaddle(1);
      }
    });

    // 設定モーダル表示（setup状態の時のみ）
    this.screen.key(["space"], () => {
      if (this.currentState?.status === "setup" && !this.isSettingsModalOpen) {
        this.showSettingsModal();
      }
    });

    // ゲーム終了時のメニュー復帰（ENTERキー）
    this.screen.key(["enter"], () => {
      if (this.isGameEnded && this.onReturnToMenu) {
        this.onReturnToMenu();
      }
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
    this.isGameEnded = true;

    this.updateStatus(
      `{center}{bold}GAME OVER{/bold}{/center}\n\n` +
        `{center}${isWinner ? "{green-fg}{bold}YOU WIN!{/bold}{/green-fg}" : "{red-fg}{bold}YOU LOSE{/bold}{/red-fg}"}{/center}\n\n` +
        `{center}Final Score{/center}\n` +
        `{center}${result.finalScore.left} - ${result.finalScore.right}{/center}\n\n` +
        `{center}{yellow-fg}ENTER: Return to Menu{/yellow-fg}{/center}\n` +
        `{center}Ctrl+C: Quit{/center}`,
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
    this.isGameEnded = true;
    this.updateStatus(
      `{center}{red-fg}ERROR: ${message}{/red-fg}{/center}\n\n` +
        `{center}{yellow-fg}ENTER: Return to Menu{/yellow-fg}{/center}\n` +
        `{center}Ctrl+C: Quit{/center}`,
    );
    this.screen.render();
  }

  /**
   * 切断状態の表示
   */
  public showDisconnected(): void {
    this.isGameEnded = true;
    this.updateStatus(
      `{center}{red-fg}CONNECTION LOST{/red-fg}{/center}\n\n` +
        `{center}Server disconnected{/center}\n\n` +
        `{center}{yellow-fg}ENTER: Return to Menu{/yellow-fg}{/center}\n` +
        `{center}Ctrl+C: Quit{/center}`,
    );
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
        return "{center}Setting up...{/center}\n\n{center}{yellow-fg}SPACE: Game Settings{/yellow-fg}{/center}\n{center}Ctrl+C: Quit{/center}";
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
    try {
      this.screen.destroy();
    } catch (error) {
      console.error("UI cleanup error:", error);
    }
  }

  /**
   * 画面を再描画
   */
  public render(): void {
    this.screen.render();
  }

  /**
   * ゲーム設定モーダルを表示
   */
  private showSettingsModal(): void {
    this.isSettingsModalOpen = true;

    // フォーム用の変数
    let ballSpeed = 5;
    let winningScore = 5;
    let currentField = 0; // 0: ballSpeed, 1: winningScore
    let keyProcessing = false; // キー処理の重複を防ぐフラグ

    // モーダルボックス
    this.settingsModal = blessed.box({
      parent: this.screen,
      top: "center",
      left: "center",
      width: 50,
      height: 15,
      border: {
        type: "line",
      },
      style: {
        border: {
          fg: "yellow",
        },
        bg: "white",
      },
      label: " Game Settings ",
      tags: true,
      keys: true, // キーイベントを有効化
      vi: false, // viモードを無効化
    });

    // モーダルにフォーカスを設定
    this.settingsModal.focus();

    // 設定内容を更新する関数
    const updateModalContent = () => {
      const content = [
        "{center}{bold}Game Settings{/bold}{/center}",
        "",
        `Ball Speed: ${currentField === 0 ? "{yellow-fg}{bold}" : ""}${ballSpeed}${currentField === 0 ? "{/bold}{/yellow-fg}" : ""} (1-30)`,
        `Winning Score: ${currentField === 1 ? "{yellow-fg}{bold}" : ""}${winningScore}${currentField === 1 ? "{/bold}{/yellow-fg}" : ""} (1-30)`,
        "",
        "{center}↑/↓: Select field{/center}",
        "{center}←/→: Change value{/center}",
        "{center}ENTER: Apply{/center}",
        "{center}ESC: Cancel{/center}",
      ].join("\n");

      this.settingsModal.setContent(content);
      this.screen.render();
    };

    // 初期表示
    updateModalContent();

    // キーハンドラーを設定（モーダルボックス自体に設定）
    const modalKeyHandler = (_ch: string, key: any) => {
      if (!this.isSettingsModalOpen || keyProcessing) return;

      keyProcessing = true;

      // 短時間後にフラグをリセット
      setTimeout(() => {
        keyProcessing = false;
      }, 50);

      switch (key.name) {
        case "up":
          currentField = currentField === 0 ? 1 : 0;
          updateModalContent();
          break;

        case "down":
          currentField = currentField === 1 ? 0 : 1;
          updateModalContent();
          break;

        case "left":
          if (currentField === 0) {
            ballSpeed = Math.max(1, ballSpeed - 1);
          } else {
            winningScore = Math.max(1, winningScore - 1);
          }
          updateModalContent();
          break;

        case "right":
          if (currentField === 0) {
            ballSpeed = Math.min(30, ballSpeed + 1);
          } else {
            winningScore = Math.min(30, winningScore + 1);
          }
          updateModalContent();
          break;

        case "enter":
          this.closeSettingsModal();
          if (this.onGameSettings) {
            this.onGameSettings(ballSpeed, winningScore);
          }
          break;

        case "escape":
          this.closeSettingsModal();
          break;
      }
    };

    // モーダルボックス自体にキーハンドラーを設定
    this.settingsModal.on("keypress", modalKeyHandler);

    // モーダル用のクリーンアップ関数を保存
    this.settingsModal._keyHandler = modalKeyHandler;

    this.screen.render();
  }

  /**
   * ゲーム設定モーダルを閉じる
   */
  private closeSettingsModal(): void {
    if (this.settingsModal) {
      // モーダル自体からキーハンドラーを削除
      if (this.settingsModal._keyHandler) {
        this.settingsModal.removeListener(
          "keypress",
          this.settingsModal._keyHandler,
        );
      }
      this.settingsModal.destroy();
      this.settingsModal = null;
    }
    this.isSettingsModalOpen = false;
    this.screen.render();
  }
}
