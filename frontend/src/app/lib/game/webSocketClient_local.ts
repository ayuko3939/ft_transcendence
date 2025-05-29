import type {
  ChatMessage,
  ClientMessage,
  GameResult,
  GameSettings,
  GameState,
  PlayerSide,
  ServerMessage,
} from "@ft-transcendence/shared";

export interface LocalWebSocketHandlers {
  onInit: (side: PlayerSide, gameState: GameState) => void;
  onGameState: (gameState: GameState) => void;
  onChatMessages: (messages: ChatMessage[]) => void;
  onCountdown: (count: number) => void;
  onGameStart: (gameState: GameState) => void;
  onGameOver: (result: GameResult) => void;
  onWaitingForPlayer: () => void;
}

export class LocalPongSocketClient {
  private ws: WebSocket | null = null;
  private handlers: LocalWebSocketHandlers;

  constructor(handlers: LocalWebSocketHandlers) {
    this.handlers = handlers;
  }

  public connect(sessionToken?: string): void {
    // ローカル対戦専用のWebSocketプロキシを使用
    const wsUrl = "/api/ws-proxy-local";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const fullWsUrl = `${protocol}//${window.location.host}${wsUrl}`;

    this.ws = new WebSocket(fullWsUrl);

    this.ws.onopen = () => {
      console.log("ローカル対戦WebSocket接続完了");

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
      console.error("ローカル対戦WebSocket接続エラー:", error);
    };

    this.ws.onclose = (event) => {
      if (event.code !== 1000) {
        console.log("ローカル対戦WebSocket切断されました");
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

  // ローカル対戦用: playerSide付きパドル移動
  public sendPaddleMove(y: number, playerSide: PlayerSide): void {
    this.sendMessage({
      type: "paddleMove",
      y,
      playerSide,
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
