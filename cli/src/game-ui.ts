import blessed from 'blessed';
import type { GameState, PlayerSide, ChatMessage, GameResult } from './types';

export class GameUI {
  private screen: any;
  private gameBox: any;
  private statusBox: any;
  private chatBox: any;
  private chatInput: any;
  private scoreBox: any;
  private infoBox: any;
  
  private currentState: GameState | null = null;
  private playerSide: PlayerSide = null;
  private roomId?: string;
  private chatMessages: ChatMessage[] = [];
  
  // ゲームフィールドの定数
  private readonly FIELD_WIDTH = 80;
  private readonly FIELD_HEIGHT = 20;
  private readonly PADDLE_HEIGHT = 4;

  // イベントハンドラー
  public onPaddleMove?: (y: number) => void;
  public onSendChat?: (message: string) => void;
  public onSurrender?: () => void;
  public onQuit?: () => void;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Pong CLI Game'
    });

    this.setupUI();
    this.setupKeyHandlers();
  }

  private setupUI(): void {
    // メインゲームエリア
    this.gameBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '70%',
      height: '70%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      },
      label: ' ゲームフィールド ',
      content: ''
    });

    // スコア表示エリア
    this.scoreBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: '70%',
      width: '30%',
      height: '30%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'yellow'
        }
      },
      label: ' スコア ',
      content: '左: 0  右: 0'
    });

    // ステータス表示エリア
    this.statusBox = blessed.box({
      parent: this.screen,
      top: '30%',
      left: '70%',
      width: '30%',
      height: '40%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        }
      },
      label: ' ステータス ',
      content: '接続中...'
    });

    // チャット表示エリア
    this.chatBox = blessed.box({
      parent: this.screen,
      top: '70%',
      left: 0,
      width: '70%',
      height: '20%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'magenta'
        }
      },
      label: ' チャット ',
      content: '',
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        style: {
          bg: 'yellow'
        }
      }
    });

    // チャット入力エリア
    this.chatInput = blessed.textbox({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '70%',
      height: 3,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'white'
        }
      },
      label: ' チャット入力 (Enter: 送信, Esc: ゲームに戻る) ',
      input: true,
      keys: true,
      mouse: true
    });

    // 情報表示エリア
    this.infoBox = blessed.box({
      parent: this.screen,
      top: '70%',
      left: '70%',
      width: '30%',
      height: '30%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'blue'
        }
      },
      label: ' 操作方法 ',
      content: 'W/S: パドル移動\n' +
               'C: チャット\n' +
               'Q: 中断\n' +
               'Ctrl+C: 終了'
    });

    this.screen.render();
  }

  private setupKeyHandlers(): void {
    // パドル移動とゲーム操作
    this.screen.key(['w', 'up'], () => {
      this.movePaddle(-1);
    });

    this.screen.key(['s', 'down'], () => {
      this.movePaddle(1);
    });

    this.screen.key(['c'], () => {
      this.focusChat();
    });

    this.screen.key(['q'], () => {
      if (this.onSurrender) {
        this.onSurrender();
      }
    });

    this.screen.key(['C-c'], () => {
      if (this.onQuit) {
        this.onQuit();
      }
      process.exit(0);
    });

    // チャット入力のハンドリング
    this.chatInput.on('submit', (text: string) => {
      if (text.trim() && this.onSendChat) {
        this.onSendChat(text.trim());
      }
      this.chatInput.clearValue();
      this.chatInput.cancel();
      this.screen.render();
    });

    this.chatInput.key(['escape'], () => {
      this.chatInput.cancel();
      this.screen.render();
    });
  }

  private movePaddle(direction: number): void {
    if (!this.currentState || !this.playerSide) return;

    const paddle = this.playerSide === 'left' ? 
      this.currentState.paddleLeft : 
      this.currentState.paddleRight;

    const newY = Math.max(0, Math.min(
      this.FIELD_HEIGHT - this.PADDLE_HEIGHT,
      paddle.y + direction
    ));

    if (this.onPaddleMove) {
      this.onPaddleMove(newY);
    }
  }

  private focusChat(): void {
    this.chatInput.focus();
    this.screen.render();
  }

  /**
   * ゲーム初期化時の表示更新
   */
  public onGameInit(side: PlayerSide, state: GameState, roomId?: string): void {
    this.playerSide = side;
    this.currentState = state;
    this.roomId = roomId;

    const sideText = side === 'left' ? '左' : side === 'right' ? '右' : '観戦';
    this.updateStatus(`あなた: ${sideText}側プレイヤー\n` +
                     `状態: ${this.getStatusText(state.status)}`);
    
    this.updateGameField();
    this.screen.render();
    
    // ステータス通知をコンソールに表示（UIの上に）
    process.stdout.write(`\n🎮 ${sideText}側プレイヤーとして参加しました\n`);
  }

  /**
   * ゲーム状態更新時の表示更新
   */
  public onGameStateUpdate(state: GameState): void {
    this.currentState = state;
    this.updateGameField();
    this.updateScore(state.score);
    
    const sideText = this.playerSide === 'left' ? '左' : 
                     this.playerSide === 'right' ? '右' : '観戦';
    this.updateStatus(`あなた: ${sideText}側プレイヤー\n` +
                     `状態: ${this.getStatusText(state.status)}`);
    
    this.screen.render();
  }

  /**
   * カウントダウン表示
   */
  public onCountdown(count: number): void {
    const sideText = this.playerSide === 'left' ? '左' : 
                     this.playerSide === 'right' ? '右' : '観戦';
    this.updateStatus(`あなた: ${sideText}側プレイヤー\n` +
                     `開始まで: ${count}秒`);
    this.screen.render();
  }

  /**
   * ゲーム終了時の表示
   */
  public onGameOver(result: GameResult): void {
    const winner = result.winner === 'left' ? '左' : '右';
    const isWinner = result.winner === this.playerSide;
    
    this.updateStatus(`🏁 ゲーム終了!\n` +
                     `結果: ${isWinner ? '🎉 勝利!' : '😔 敗北'}\n` +
                     `スコア: ${result.finalScore.left} - ${result.finalScore.right}\n` +
                     `まもなくメニューに戻ります...`);
    
    this.screen.render();
    
    // 結果をコンソールにも表示
    process.stdout.write(`\n🏁 ゲーム終了: ${isWinner ? '勝利!' : '敗北'} (${result.finalScore.left}-${result.finalScore.right})\n`);
  }

  /**
   * チャット更新
   */
  public onChatUpdate(messages: ChatMessage[]): void {
    this.chatMessages = messages;
    const chatContent = messages
      .map(msg => `${msg.name}: ${msg.message}`)
      .join('\n');
    
    this.chatBox.setContent(chatContent);
    this.chatBox.setScrollPerc(100); // 最下部にスクロール
    this.screen.render();
  }

  /**
   * 待機状態の表示
   */
  public onWaitingForPlayer(): void {
    const sideText = this.playerSide === 'left' ? '左' : 
                     this.playerSide === 'right' ? '右' : '観戦';
    this.updateStatus(`あなた: ${sideText}側プレイヤー\n` +
                     `⏳ 相手を待機中...`);
    this.screen.render();
  }

  /**
   * エラー表示
   */
  public showError(message: string): void {
    this.updateStatus(`❌ エラー: ${message}`);
    this.screen.render();
  }

  /**
   * ゲームフィールドの描画
   */
  private updateGameField(): void {
    if (!this.currentState) {
      this.gameBox.setContent('ゲーム状態を読み込み中...');
      return;
    }

    const { ball, paddleLeft, paddleRight } = this.currentState;
    
    // フィールドを空白で初期化
    const field: string[][] = [];
    for (let y = 0; y < this.FIELD_HEIGHT; y++) {
      field[y] = new Array(this.FIELD_WIDTH).fill(' ');
    }

    // 境界線を描画
    for (let x = 0; x < this.FIELD_WIDTH; x++) {
      field[0][x] = '-';
      field[this.FIELD_HEIGHT - 1][x] = '-';
    }
    for (let y = 0; y < this.FIELD_HEIGHT; y++) {
      field[y][0] = '|';
      field[y][this.FIELD_WIDTH - 1] = '|';
    }

    // 中央線を描画
    const centerX = Math.floor(this.FIELD_WIDTH / 2);
    for (let y = 1; y < this.FIELD_HEIGHT - 1; y++) {
      field[y][centerX] = y % 2 === 0 ? '|' : ' ';
    }

    // パドルを描画
    this.drawPaddle(field, paddleLeft, 2, '█');
    this.drawPaddle(field, paddleRight, this.FIELD_WIDTH - 3, '█');

    // ボールを描画
    const ballX = Math.round((ball.x / 800) * (this.FIELD_WIDTH - 2)) + 1;
    const ballY = Math.round((ball.y / 400) * (this.FIELD_HEIGHT - 2)) + 1;
    
    if (ballX > 0 && ballX < this.FIELD_WIDTH - 1 && 
        ballY > 0 && ballY < this.FIELD_HEIGHT - 1) {
      field[ballY][ballX] = '●';
    }

    // フィールドを文字列に変換
    const fieldContent = field.map(row => row.join('')).join('\n');
    this.gameBox.setContent(fieldContent);
  }

  private drawPaddle(field: string[][], paddle: any, x: number, char: string): void {
    const paddleY = Math.round((paddle.y / 400) * (this.FIELD_HEIGHT - 2)) + 1;
    const paddleHeight = Math.round((this.PADDLE_HEIGHT / 400) * this.FIELD_HEIGHT);
    
    for (let i = 0; i < paddleHeight && paddleY + i < this.FIELD_HEIGHT - 1; i++) {
      if (paddleY + i > 0) {
        field[paddleY + i][x] = char;
      }
    }
  }

  private updateScore(score: { left: number; right: number }): void {
    this.scoreBox.setContent(`左: ${score.left}  右: ${score.right}`);
  }

  private updateStatus(text: string): void {
    this.statusBox.setContent(text);
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'connecting': return '接続中';
      case 'setup': return 'セットアップ';
      case 'waiting': return '待機中';
      case 'countdown': return 'カウントダウン';
      case 'playing': return 'プレイ中';
      case 'finished': return '終了';
      default: return status;
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