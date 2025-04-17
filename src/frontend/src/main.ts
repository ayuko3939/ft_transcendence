class PongGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private paddleLeft: { x: number; y: number; width: number; height: number };
  private paddleRight: { x: number; y: number; width: number; height: number };
  private ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
  };
  private score: { left: number; right: number };
  private ws: WebSocket;
  private playerSide: 'left' | 'right' | null = null;
  private chatInput: HTMLInputElement;
  private chatMessages: HTMLDivElement;
  private sendButton: HTMLButtonElement;
  private countdownElement: HTMLDivElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    // パドルの初期設定
    const paddleHeight = 100;
    const paddleWidth = 10;
    this.paddleLeft = {
      x: 50,
      y: this.canvas.height / 2 - paddleHeight / 2,
      width: paddleWidth,
      height: paddleHeight,
    };

    this.paddleRight = {
      x: this.canvas.width - 50 - paddleWidth,
      y: this.canvas.height / 2 - paddleHeight / 2,
      width: paddleWidth,
      height: paddleHeight,
    };

    // ボールの初期設定
    this.ball = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      dx: 5,
      dy: 5,
      radius: 10,
    };

    // スコアの初期化
    this.score = { left: 0, right: 0 };

    // WebSocket接続
    this.ws = new WebSocket('ws://localhost:3000/game');
    this.ws.onmessage = this.handleWebSocketMessage.bind(this);

    // キーボードイベントの設定
    document.addEventListener('keydown', this.handleKeyPress.bind(this));

    // チャット要素の取得
    this.chatInput = document.getElementById('chatInput') as HTMLInputElement;
    this.chatMessages = document.getElementById(
      'chatMessages'
    ) as HTMLDivElement;
    this.sendButton = document.getElementById('sendChat') as HTMLButtonElement;

    // チャットイベントの設定
    this.sendButton.addEventListener('click', this.sendChat.bind(this));
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendChat();
      }
    });

    // カウントダウン要素の初期化
    this.countdownElement = document.createElement('div');
    this.countdownElement.style.position = 'absolute';
    this.countdownElement.style.top = '50%';
    this.countdownElement.style.left = '50%';
    this.countdownElement.style.transform = 'translate(-50%, -50%)';
    this.countdownElement.style.fontSize = '64px';
    this.countdownElement.style.fontWeight = 'bold';
    this.countdownElement.style.color = 'white';
    this.countdownElement.style.display = 'none';
    document.body.appendChild(this.countdownElement);

    // ゲームキャンバスの上に表示するカウントダウン要素
    document.body.appendChild(this.countdownElement);

    // ゲームループの開始
    this.gameLoop();
  }

  private handleWebSocketMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);

    if (data.type === 'init') {
      this.playerSide = data.side;
      this.updateGameState(data.gameState);
    } else if (Array.isArray(data)) {
      // チャットメッセージの配列
      this.updateChat(data);
    } else if (data.type === 'countdown') {
      this.countdownElement.style.display = 'block';
      this.countdownElement.textContent = data.count.toString();
    } else if (data.type === 'gameStart') {
      this.countdownElement.style.display = 'none';
      // ゲーム開始の処理
      this.startGame(data.gameState);
    } else {
      this.updateGameState(data);
    }
  }

  private updateGameState(gameState: any) {
    this.ball.x = gameState.ball.x;
    this.ball.y = gameState.ball.y;
    this.paddleLeft.y = gameState.paddleLeft.y;
    this.paddleRight.y = gameState.paddleRight.y;
    this.score = gameState.score;
  }

  private handleKeyPress(e: KeyboardEvent): void {
    if (!this.playerSide) return;

    const speed = 10;
    let paddleMove = false;
    let newY = 0;

    const paddle =
      this.playerSide === 'left' ? this.paddleLeft : this.paddleRight;

    if ((e.key === 'ArrowUp' || e.key === 'w') && paddle.y > 0) {
      paddle.y -= speed;
      paddleMove = true;
      newY = paddle.y;
    }
    if (
      (e.key === 'ArrowDown' || e.key === 's') &&
      paddle.y < this.canvas.height - paddle.height
    ) {
      paddle.y += speed;
      paddleMove = true;
      newY = paddle.y;
    }

    if (paddleMove) {
      this.ws.send(
        JSON.stringify({
          type: 'paddleMove',
          y: newY,
        })
      );
    }

    if (paddleMove) {
      this.ws.send(
        JSON.stringify({
          type: 'paddleMove',
          y: newY,
        })
      );
    }
  }

  private draw(): void {
    // キャンバスのクリア
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // パドルの描画
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(
      this.paddleLeft.x,
      this.paddleLeft.y,
      this.paddleLeft.width,
      this.paddleLeft.height
    );
    this.ctx.fillRect(
      this.paddleRight.x,
      this.paddleRight.y,
      this.paddleRight.width,
      this.paddleRight.height
    );

    // ボールの描画
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // スコアの描画
    this.ctx.font = '48px Arial';
    this.ctx.fillText(this.score.left.toString(), this.canvas.width / 4, 50);
    this.ctx.fillText(
      this.score.right.toString(),
      (3 * this.canvas.width) / 4,
      50
    );

    // 中央線の描画
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.strokeStyle = 'white';
    this.ctx.stroke();
  }

  private gameLoop(): void {
    this.draw();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private sendChat() {
    const message = this.chatInput.value.trim();
    if (message && this.playerSide) {
      this.ws.send(
        JSON.stringify({
          type: 'chat',
          name: this.playerSide === 'left' ? 'プレイヤー1' : 'プレイヤー2',
          message: message,
        })
      );
      this.chatInput.value = '';
    }
  }

  private updateChat(chats: { name: string; message: string }[]) {
    this.chatMessages.innerHTML = chats
      .map(
        (chat) => `
          <div class="mb-2">
            <span class="font-bold">${chat.name}:</span>
            <span>${chat.message}</span>
          </div>
        `
      )
      .join('');

    // 最新のメッセージが見えるようにスクロール
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private startGame(gameState: any) {
    // ゲーム開始の処理
    this.updateGameState(gameState);
  }
}

// ゲームの開始
document.addEventListener('DOMContentLoaded', () => {
  new PongGame();
});
