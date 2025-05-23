import type {
  ChatMessage,
  GameResult,
  GameSettings,
  GameState,
  PlayerSide,
  ClientMessage,
  ServerMessage,
} from "../../../types/shared/types";

export interface WebSocketHandlers {
  onInit: (side: PlayerSide, gameState: GameState) => void;
  onGameState: (gameState: GameState) => void;
  onChatMessages: (messages: ChatMessage[]) => void;
  onCountdown: (count: number) => void;
  onGameStart: (gameState: GameState) => void;
  onGameOver: (result: GameResult) => void;
}

export class PongSocketClient {
  private ws: WebSocket | null = null;
  private handlers: WebSocketHandlers;

  constructor(handlers: WebSocketHandlers) {
    this.handlers = handlers;
  }

  public connect(url: string): void {
    let wsUrl = url;
    if (url.startsWith("/")) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}${url}`;
    }

    console.log(`WebSocket接続開始: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket接続が確立されました");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error("WebSocketメッセージの解析エラー:", e, event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket接続エラー:", error);
      };

      this.ws.onclose = (event) => {
        console.log(
          `WebSocket接続が閉じられました: コード=${event.code}, 理由=${event.reason}`,
        );
      };
    } catch (error) {
      console.error("WebSocket初期化エラー:", error);
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public sendGameSettings(settings: GameSettings): void {
    this.sendMessage({
      type: "gameSettings",
      ballSpeed: settings.ballSpeed,
      winningScore: settings.winningScore,
    });
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

  public sendSurrenderMessage(): void {
    this.sendMessage({
      type: "surrender",
    });
  }

  private sendMessage(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("WebSocketメッセージ送信エラー:", error);
      }
    } else {
      console.warn(
        "WebSocketが接続されていないため、メッセージを送信できません",
      );
    }
  }

  private handleMessage(data: ServerMessage): void {
    // デバッグ: 受信したデータの表示
    console.log("WebSocketデータ受信:", data);

    // ServerMessageの場合
    switch (data.type) {
      case "init":
        this.handlers.onInit(data.side, this.normalizeGameState(data.state));
        break;
      case "countdown":
        this.handlers.onCountdown(data.count);
        break;
      case "gameStart":
        this.handlers.onGameStart(this.normalizeGameState(data.state));
        break;
      case "gameOver":
        this.handlers.onGameOver(data.result);
        break;
      case "gameState":
        this.handlers.onGameState(this.normalizeGameState(data.state));
        break;
      case "chatUpdate":
        this.handlers.onChatMessages(data.messages);
        break;
      default:
        console.warn("不明なWebSocketメッセージタイプ:", data);
    }
  }

  private normalizeGameState(data: GameState): GameState {
    // 新定義では基本的に正規化不要だが、念のため型チェック
    if (
      data &&
      data.ball &&
      data.ball.radius !== undefined &&
      data.paddleLeft &&
      data.paddleLeft.width !== undefined &&
      data.paddleRight &&
      data.paddleRight.width !== undefined
    ) {
      return data;
    }

    // デフォルト値で補完（エラー時のフォールバック）
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
      status: data.status ?? 'waiting',
      winner: data.winner ?? null,
      winningScore: data.winningScore ?? 10,
    };

    return normalized;
  }
}
