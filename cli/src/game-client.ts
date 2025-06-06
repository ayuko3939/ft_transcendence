import WebSocket from 'ws';
import type { 
  ClientMessage, 
  ServerMessage, 
  GameState, 
  PlayerSide, 
  CLIConfig, 
  UserSession,
  GameResult,
  ChatMessage
} from './types';

export interface GameEventHandlers {
  onInit?: (side: PlayerSide, state: GameState, roomId?: string) => void;
  onGameState?: (state: GameState) => void;
  onCountdown?: (count: number) => void;
  onGameStart?: (state: GameState) => void;
  onGameOver?: (result: GameResult) => void;
  onChatUpdate?: (messages: ChatMessage[]) => void;
  onWaitingForPlayer?: () => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class GameClient {
  private ws: WebSocket | null = null;
  private config: CLIConfig;
  private session: UserSession;
  private handlers: GameEventHandlers;
  private isConnected = false;
  private roomId?: string;

  constructor(config: CLIConfig, session: UserSession, handlers: GameEventHandlers) {
    this.config = config;
    this.session = session;
    this.handlers = handlers;
  }

  /**
   * WebSocket接続を開始
   */
  async connect(roomId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // WebSocket URLを構築
        let wsUrl = this.config.wsUrl;
        if (roomId) {
          wsUrl += `/${roomId}`;
        }

        console.log(`🔄 WebSocket接続開始: ${wsUrl}`);

        this.ws = new WebSocket(wsUrl);
        this.roomId = roomId;

        this.ws.on('open', () => {
          this.isConnected = true;
          console.log(`🔗 WebSocket接続成功: ${wsUrl}`);
          
          // 認証メッセージを送信
          this.sendAuth();
          
          if (this.handlers.onConnected) {
            this.handlers.onConnected();
          }
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          this.isConnected = false;
          if (code !== 1000) { // 正常切断以外の場合のみログ表示
            console.log(`🔌 接続が終了しました (${code})`);
          }
          
          if (this.handlers.onDisconnected) {
            this.handlers.onDisconnected();
          }
        });

        this.ws.on('error', (error) => {
          console.error('🚨 接続エラー:', error.message);
          
          if (this.handlers.onError) {
            this.handlers.onError(error.message);
          }
          reject(error);
        });

        // 接続タイムアウト
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('接続がタイムアウトしました'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * WebSocket接続を閉じる
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * 認証メッセージを送信
   */
  private sendAuth(): void {
    const authMessage: ClientMessage = {
      type: 'auth',
      sessionToken: this.session.sessionToken
    };
    this.sendMessage(authMessage);
  }

  /**
   * パドル移動を送信
   */
  movePaddle(y: number, playerSide?: PlayerSide): void {
    const message: ClientMessage = {
      type: 'paddleMove',
      y,
      playerSide
    };
    this.sendMessage(message);
  }

  /**
   * チャットメッセージを送信
   */
  sendChat(message: string): void {
    const chatMessage: ClientMessage = {
      type: 'chat',
      name: this.session.username,
      message
    };
    this.sendMessage(chatMessage);
  }

  /**
   * ゲーム設定を送信
   */
  sendGameSettings(ballSpeed: number, winningScore: number): void {
    const message: ClientMessage = {
      type: 'gameSettings',
      ballSpeed,
      winningScore
    };
    this.sendMessage(message);
  }

  /**
   * ゲームを中断
   */
  surrender(): void {
    const message: ClientMessage = {
      type: 'surrender'
    };
    this.sendMessage(message);
  }

  /**
   * メッセージ送信のヘルパー
   */
  private sendMessage(message: ClientMessage): void {
    if (!this.ws || !this.isConnected) {
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('🚨 メッセージ送信エラー:', error);
    }
  }

  /**
   * サーバーからのメッセージを処理
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: ServerMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'init':
          if (this.handlers.onInit) {
            this.handlers.onInit(message.side, message.state, message.roomId);
          }
          break;

        case 'gameState':
          if (this.handlers.onGameState) {
            this.handlers.onGameState(message.state);
          }
          break;

        case 'countdown':
          if (this.handlers.onCountdown) {
            this.handlers.onCountdown(message.count);
          }
          break;

        case 'gameStart':
          if (this.handlers.onGameStart) {
            this.handlers.onGameStart(message.state);
          }
          break;

        case 'gameOver':
          if (this.handlers.onGameOver) {
            this.handlers.onGameOver(message.result);
          }
          break;

        case 'chatUpdate':
          if (this.handlers.onChatUpdate) {
            this.handlers.onChatUpdate(message.messages);
          }
          break;

        case 'waitingForPlayer':
          if (this.handlers.onWaitingForPlayer) {
            this.handlers.onWaitingForPlayer();
          }
          break;

        default:
          // 未知のメッセージタイプは無視
          break;
      }
    } catch (error) {
      console.error('🚨 メッセージ解析エラー:', error);
    }
  }

  /**
   * 接続状態を取得
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * ルームIDを取得
   */
  get currentRoomId(): string | undefined {
    return this.roomId;
  }
}