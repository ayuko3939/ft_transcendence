import type { WebSocket } from "@fastify/websocket";
import { v4 as uuidv4 } from "uuid";

import type {
  ChatMessage,
  GameSession,
  Player,
  PlayerRole,
  SessionInfo,
  SessionStatus,
  WebSocketResponse,
} from "./types/session";
import type { GameState } from "./types/state";
import { GameEngine } from "./GameState";

/**
 * ゲームセッションを表すクラス
 */
export class Session implements GameSession {
  public id: string;
  public name: string;
  public status: SessionStatus;
  public players: Player[];
  public gameState: GameState;
  public createdAt: number;
  public maxPlayers: number;
  public countdown: number;
  public chats: ChatMessage[];

  private gameEngine: GameEngine;
  private gameInterval: NodeJS.Timeout | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;

  constructor(
    name: string,
    creatorId: string,
    creatorName: string,
    creatorSocket: WebSocket,
  ) {
    this.id = uuidv4(); // ユニークなセッションID
    this.name = name;
    this.status = "waiting";
    this.players = [];
    this.createdAt = Date.now();
    this.maxPlayers = 2; // 基本的には2人プレイ
    this.chats = [];
    this.countdown = 0;

    // 初期ゲーム状態
    this.gameState = {
      ball: {
        x: 400,
        y: 300,
        dx: 5,
        dy: 5,
        radius: 10,
      },
      paddleLeft: {
        x: 50,
        y: 250,
        width: 10,
        height: 100,
      },
      paddleRight: {
        x: 740,
        y: 250,
        width: 10,
        height: 100,
      },
      score: { left: 0, right: 0 },
    };

    this.addPlayer(creatorId, creatorName, creatorSocket, "left");

    this.gameEngine = new GameEngine(this.gameState);
  }

  /**
   * プレイヤーをセッションに追加する
   */
  public addPlayer(
    id: string,
    name: string,
    socket: WebSocket,
    role: PlayerRole,
  ): Player {
    const player: Player = { id, name, socket, role };
    this.players.push(player);

    // プレイヤーが追加されたら、セッション情報を全員に通知
    this.broadcastSessionUpdate();

    // もし2人目のプレイヤーで、ステータスがwaitingならカウントダウン開始
    if (this.getPlayersCount() === 2 && this.status === "waiting") {
      this.startCountdown();
    }

    return player;
  }

  /**
   * プレイヤーをセッションから削除する
   */
  public removePlayer(playerId: string): boolean {
    const initialCount = this.players.length;
    this.players = this.players.filter((player) => player.id !== playerId);

    // プレイヤーが削除されたら、セッション情報を全員に通知
    if (initialCount !== this.players.length) {
      this.broadcastSessionUpdate();

      // ゲームが進行中でプレイヤーが退出した場合、ゲームを終了
      if (this.status === "playing" && this.getPlayersCount() < 2) {
        this.stopGame();
        this.status = "waiting";
      }

      return true;
    }

    return false;
  }

  /**
   * セッションにいるプレイヤー数を取得する
   */
  public getPlayersCount(): number {
    return this.players.filter((p) => p.role === "left" || p.role === "right")
      .length;
  }

  /**
   * セッションの要約情報を取得する
   */
  public getSessionInfo(): SessionInfo {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
      })),
      createdAt: this.createdAt,
      maxPlayers: this.maxPlayers,
    };
  }

  /**
   * カウントダウンを開始する
   */
  public startCountdown() {
    this.status = "countdown";
    this.countdown = 5;

    // すでにカウントダウンが進行中なら中止
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // カウントダウンを開始
    this.countdownInterval = setInterval(() => {
      this.broadcastToAll({
        type: "countdown",
        count: this.countdown,
        sessionId: this.id,
      });

      this.countdown--;

      if (this.countdown < 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.startGame();
      }
    }, 1000);
  }

  /**
   * ゲームを開始する
   */
  private startGame() {
    this.status = "playing";

    // ゲーム開始メッセージを送信
    this.broadcastToAll({
      type: "gameStart",
      gameState: this.gameState,
      sessionId: this.id,
    });

    // ゲームループを開始
    this.gameInterval = setInterval(() => {
      // ゲーム状態を更新
      this.gameEngine.update();

      // 状態をブロードキャスト
      this.broadcastToAll({
        type: "gameState",
        gameState: this.gameState,
        sessionId: this.id,
      });

      // もしどちらかのスコアが10に達したらゲーム終了
      if (this.gameState.score.left >= 10 || this.gameState.score.right >= 10) {
        this.finishGame();
      }
    }, 1000 / 60); // 60FPS
  }

  /**
   * ゲームを停止する
   */
  private stopGame() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * ゲームを終了する
   */
  private finishGame() {
    this.stopGame();
    this.status = "finished";

    // ゲーム終了メッセージを送信
    this.broadcastToAll({
      type: "sessionUpdated",
      sessions: [this.getSessionInfo()],
      sessionId: this.id,
    });

    // 3秒後にゲームをリセット
    setTimeout(() => {
      this.resetGame();
    }, 3000);
  }

  /**
   * ゲームをリセットする
   */
  private resetGame() {
    // ゲーム状態をリセット
    this.gameState = {
      ball: {
        x: 400,
        y: 300,
        dx: 5,
        dy: 5,
        radius: 10,
      },
      paddleLeft: {
        x: 50,
        y: 250,
        width: 10,
        height: 100,
      },
      paddleRight: {
        x: 740,
        y: 250,
        width: 10,
        height: 100,
      },
      score: { left: 0, right: 0 },
    };

    this.gameEngine = new GameEngine(this.gameState);
    this.status = "waiting";

    // セッション更新を通知
    this.broadcastSessionUpdate();

    // プレイヤーが2人いる場合は再度カウントダウン開始
    if (this.getPlayersCount() === 2) {
      this.startCountdown();
    }
  }

  /**
   * パドルを移動する
   */
  public movePaddle(playerId: string, y: number) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;

    if (player.role === "left") {
      this.gameState.paddleLeft.y = y;
    } else if (player.role === "right") {
      this.gameState.paddleRight.y = y;
    }
  }

  /**
   * チャットメッセージを追加する
   */
  public addChatMessage(
    playerId: string,
    name: string,
    message: string,
  ): ChatMessage {
    const chatMessage: ChatMessage = {
      playerId,
      name,
      message,
      timestamp: Date.now(),
    };

    this.chats.push(chatMessage);

    // チャットメッセージをブロードキャスト
    this.broadcastToAll({
      type: "chatMessage",
      chat: chatMessage,
      sessionId: this.id,
    });

    return chatMessage;
  }

  /**
   * セッション情報の更新を全プレイヤーに通知する
   */
  private broadcastSessionUpdate() {
    this.broadcastToAll({
      type: "sessionUpdated",
      sessions: [this.getSessionInfo()],
      sessionId: this.id,
    });
  }

  /**
   * セッション内の全員にメッセージを送信する
   */
  private broadcastToAll(message: WebSocketResponse) {
    for (const player of this.players) {
      try {
        player.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to player ${player.id}:`, error);
      }
    }
  }

  /**
   * セッションを破棄する前の後処理
   */
  public dispose() {
    this.stopGame();
    this.players = [];
  }
}
