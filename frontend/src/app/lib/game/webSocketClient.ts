import type {
  ChatMessage,
  ClientMessage,
  GameResult,
  GameSettings,
  GameState,
  PlayerSide,
  ServerMessage,
} from "@ft-transcendence/shared";
import { clientLogError, clientLogWarn } from "@/lib/clientLogger";

export interface WebSocketHandlers {
  onInit: (side: PlayerSide, gameState: GameState) => void;
  onGameState: (gameState: GameState) => void;
  onChatMessages: (messages: ChatMessage[]) => void;
  onCountdown: (count: number) => void;
  onGameStart: (gameState: GameState) => void;
  onGameOver: (result: GameResult) => void;
  onWaitingForPlayer: () => void;
}

export class PongSocketClient {
  private ws: WebSocket | null = null;
  private handlers: WebSocketHandlers;

  constructor(handlers: WebSocketHandlers) {
    this.handlers = handlers;
  }

  public connect(url: string, sessionToken?: string): void {
    let wsUrl = url;
    if (url.startsWith("/")) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}${url}`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket接続完了");

      // 認証情報を送信
      if (sessionToken) {
        this.sendAuthMessage(sessionToken);
      }
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerMessage;
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket接続エラー:", error);
      clientLogError("WebSocket接続エラー");
    };

    this.ws.onclose = (event) => {
      if (event.code !== 1000) {
        console.log("WebSocket切断されました");
        clientLogWarn("WebSocket接続が切断されました", { 
          code: event.code.toString() 
        });
      }
    };
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

  public sendPaddleMove(y: number, playerSide?: PlayerSide): void {
    this.sendMessage({
      type: "paddleMove",
      y,
      playerSide,
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

  private sendAuthMessage(sessionToken: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "auth",
          sessionToken: sessionToken,
        }),
      );
    }
  }

  private sendMessage(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      clientLogError("WebSocket送信エラー: 接続が切断されています");
    }
  }

  private handleMessage(data: ServerMessage): void {
    switch (data.type) {
      case "init":
        this.handlers.onInit(data.side, data.state);
        break;
      case "countdown":
        this.handlers.onCountdown(data.count);
        break;
      case "gameStart":
        this.handlers.onGameStart(data.state);
        break;
      case "gameOver":
        this.handlers.onGameOver(data.result);
        break;
      case "gameState":
        this.handlers.onGameState(data.state);
        break;
      case "chatUpdate":
        this.handlers.onChatMessages(data.messages);
        break;
      case "waitingForPlayer":
        this.handlers.onWaitingForPlayer();
        break;
    }
  }
}
