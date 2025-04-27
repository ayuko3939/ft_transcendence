import type {
  ChatMessage,
  GameState,
  PlayerSide,
  WebSocketMessage,
} from "./types";

export interface WebSocketHandlers {
  onInit: (side: PlayerSide, gameState: GameState) => void;
  onGameState: (gameState: GameState) => void;
  onChatMessages: (messages: ChatMessage[]) => void;
  onCountdown: (count: number) => void;
  onGameStart: (gameState: GameState) => void;
}

export class PongSocketClient {
  private ws: WebSocket | null = null;
  private handlers: WebSocketHandlers;

  constructor(handlers: WebSocketHandlers) {
    this.handlers = handlers;
  }

  public connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("WebSocket接続が確立されました");
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket接続エラー:", error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket接続が閉じられました");
    };
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public sendPaddleMove(y: number): void {
    this.sendMessage({
      type: "paddleMove",
      y,
    });
  }

  public sendChatMessage(name: string, message: string): void {
    this.sendMessage({
      type: "chat",
      name,
      message,
    });
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: any): void {
    // デバッグ: 受信したデータの表示
    console.log("WebSocketデータ受信:", data);

    if (data.type === "init") {
      // 初期化メッセージ
      this.handlers.onInit(data.side, this.normalizeGameState(data.gameState));
    } else if (Array.isArray(data)) {
      // チャットメッセージ
      this.handlers.onChatMessages(data);
    } else if (data.type === "countdown") {
      // カウントダウン
      this.handlers.onCountdown(data.count);
    } else if (data.type === "gameStart") {
      // ゲーム開始
      this.handlers.onGameStart(this.normalizeGameState(data.gameState));
    } else if (data.type === "gameState" || data.ball) {
      // ゲーム状態の更新
      // data.typeがgameStateの場合と、直接ゲーム状態が送られてくる場合の両方に対応
      const gameState = data.type === "gameState" ? data : data;
      this.handlers.onGameState(this.normalizeGameState(gameState));
    } else {
      // 不明なメッセージタイプ
      console.warn("不明なWebSocketメッセージタイプ:", data);
    }
  }

  // バックエンドから受信したデータをフロントエンドの型に合わせて正規化
  private normalizeGameState(data: any): GameState {
    // データが既に期待する形式なら修正せずに返す
    if (
      data &&
      data.ball &&
      data.ball.radius !== undefined &&
      data.paddleLeft &&
      data.paddleLeft.width !== undefined &&
      data.paddleRight &&
      data.paddleRight.width !== undefined
    ) {
      return data as GameState;
    }

    const defaultPaddleWidth = 10;
    const defaultPaddleHeight = 100;
    const defaultBallRadius = 10;
    const defaultLeftPaddleX = 50;
    const defaultRightPaddleX = 740;

    const normalized: GameState = {
      ball: {
        x: data.ball?.x ?? 400,
        y: data.ball?.y ?? 300,
        dx: data.ball?.dx ?? 5,
        dy: data.ball?.dy ?? 5,
        radius: data.ball?.radius ?? defaultBallRadius,
      },
      paddleLeft: {
        x: data.paddleLeft?.x ?? defaultLeftPaddleX,
        y: data.paddleLeft?.y ?? 250,
        width: data.paddleLeft?.width ?? defaultPaddleWidth,
        height: data.paddleLeft?.height ?? defaultPaddleHeight,
      },
      paddleRight: {
        x: data.paddleRight?.x ?? defaultRightPaddleX,
        y: data.paddleRight?.y ?? 250,
        width: data.paddleRight?.width ?? defaultPaddleWidth,
        height: data.paddleRight?.height ?? defaultPaddleHeight,
      },
      score: {
        left: data.score?.left ?? 0,
        right: data.score?.right ?? 0,
      },
    };

    return normalized;
  }
}
