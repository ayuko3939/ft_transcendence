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
    if (data.type === "init") {
      this.handlers.onInit(data.side, data.gameState);
    } else if (Array.isArray(data)) {
      this.handlers.onChatMessages(data);
    } else if (data.type === "countdown") {
      this.handlers.onCountdown(data.count);
    } else if (data.type === "gameStart") {
      this.handlers.onGameStart(data.gameState);
    } else {
      this.handlers.onGameState(data);
    }
  }
}
