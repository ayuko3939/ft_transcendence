import type { WebSocket } from "@fastify/websocket";
import { GameEngine } from "../GameState";

export type PlayerInfo = {
  userId: string;
  username: string;
  socket: WebSocket;
};

export type SpectatorInfo = {
  userId: string;
  username: string;
  socket: WebSocket;
};

export type GameSessionStatus =
  | "waiting"   // ゲーム開始待ち
  | "countdown" // カウントダウン中
  | "playing"   // ゲーム進行中
  | "finished"  // ゲーム終了
  | "abandoned"; // 放棄（プレイヤーが離脱）

/**
 * ゲームセッションを管理するクラス
 */
export class GameSession {
  public id: string;
  public name: string;
  public createdAt: Date;
  public status: GameSessionStatus;
  public players: {
    left?: PlayerInfo;
    right?: PlayerInfo;
  };
  public spectators: SpectatorInfo[];
  public gameState: {
    ball: {
      x: number;
      y: number;
      dx: number;
      dy: number;
      radius: number;
    };
    paddleLeft: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    paddleRight: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    score: {
      left: number;
      right: number;
    };
  };
  public chats: {
    userId: string;
    username: string;
    message: string;
    timestamp: Date;
  }[];

  private gameEngine: GameEngine;
  private gameInterval: NodeJS.Timeout | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;
  private countdown: number = 5;

  constructor(id: string, name: string, creatorId: string, creatorName: string) {
    this.id = id;
    this.name = name;
    this.createdAt = new Date();
    this.status = "waiting";
    this.players = {};
    this.spectators = [];
    // 初期ゲーム状態の設定
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
    this.chats = [];
    this.gameEngine = new GameEngine(this.gameState);
  }

  /**
   * プレイヤーをセッションに追加する
   * @param userId ユーザーID
   * @param username ユーザー名
   * @param socket WebSocketコネクション
   * @returns 割り当てられた側（"left" | "right" | null）
   */
  public addPlayer(userId: string, username: string, socket: WebSocket): "left" | "right" | null {
    if (this.status !== "waiting") {
      return null; // 待機中でない場合は追加できない
    }

    if (!this.players.left) {
      this.players.left = { userId, username, socket };
      this.setupPlayerSocket(this.players.left, "left");
      return "left";
    } else if (!this.players.right) {
      this.players.right = { userId, username, socket };
      this.setupPlayerSocket(this.players.right, "right");

      // 両方のプレイヤーが揃ったらカウントダウン開始
      this.startCountdown();
      return "right";
    }

    return null; // 両方のポジションが埋まっている
  }

  /**
   * 観戦者をセッションに追加する
   * @param userId ユーザーID
   * @param username ユーザー名
   * @param socket WebSocketコネクション
   */
  public addSpectator(userId: string, username: string, socket: WebSocket): void {
    const spectator = { userId, username, socket };
    this.spectators.push(spectator);
    this.setupSpectatorSocket(spectator);

    // 現在の状態を送信
    socket.send(JSON.stringify({
      type: "gameInfo",
      id: this.id,
      name: this.name,
      status: this.status,
      players: {
        left: this.players.left ? { userId: this.players.left.userId, username: this.players.left.username } : null,
        right: this.players.right ? { userId: this.players.right.userId, username: this.players.right.username } : null
      },
      gameState: this.gameState,
      spectatorCount: this.spectators.length,
    }));

    // チャット履歴を送信
    if (this.chats.length > 0) {
      socket.send(JSON.stringify({
        type: "chatHistory",
        chats: this.chats
      }));
    }
  }

  /**
   * プレイヤーをセッションから削除する
   * @param userId ユーザーID
   */
  public removePlayer(userId: string): void {
    if (this.players.left && this.players.left.userId === userId) {
      this.players.left = undefined;
      this.handlePlayerDisconnect("left");
    } else if (this.players.right && this.players.right.userId === userId) {
      this.players.right = undefined;
      this.handlePlayerDisconnect("right");
    }
  }

  /**
   * 観戦者をセッションから削除する
   * @param userId ユーザーID
   */
  public removeSpectator(userId: string): void {
    const index = this.spectators.findIndex(s => s.userId === userId);
    if (index !== -1) {
      this.spectators.splice(index, 1);
      
      // 観戦者数更新を通知
      this.broadcastToAll({
        type: "spectatorCount",
        count: this.spectators.length
      });
    }
  }

  /**
   * チャットメッセージを追加する
   * @param userId ユーザーID
   * @param username ユーザー名
   * @param message メッセージ
   */
  public addChatMessage(userId: string, username: string, message: string): void {
    const chatMessage = {
      userId,
      username,
      message,
      timestamp: new Date()
    };
    
    this.chats.push(chatMessage);
    
    // チャットメッセージを全員に送信
    this.broadcastToAll({
      type: "chat",
      chat: chatMessage
    });
  }

  /**
   * パドルの位置を更新する
   * @param userId ユーザーID
   * @param y 新しいY座標
   */
  public updatePaddlePosition(userId: string, y: number): void {
    if (this.players.left && this.players.left.userId === userId) {
      this.gameState.paddleLeft.y = y;
    } else if (this.players.right && this.players.right.userId === userId) {
      this.gameState.paddleRight.y = y;
    }
    
    // ゲーム中でない場合は他のプレイヤーにも通知
    if (this.status !== "playing") {
      this.broadcastGameState();
    }
  }

  /**
   * ゲームセッションを終了する
   */
  public endGame(): void {
    this.stopGameLoop();
    this.status = "finished";
    
    // ゲーム終了を通知
    this.broadcastToAll({
      type: "gameEnd",
      score: this.gameState.score
    });
  }

  /**
   * ゲームセッションを完全に終了し、リソースを解放する
   */
  public destroy(): void {
    this.stopGameLoop();
    this.stopCountdown();
    
    // すべての接続を閉じる
    if (this.players.left) {
      this.players.left.socket.close();
    }
    if (this.players.right) {
      this.players.right.socket.close();
    }
    this.spectators.forEach(spectator => {
      spectator.socket.close();
    });
  }

  /**
   * ゲームセッションの情報を返す
   */
  public getInfo() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      players: {
        left: this.players.left ? { userId: this.players.left.userId, username: this.players.left.username } : null,
        right: this.players.right ? { userId: this.players.right.userId, username: this.players.right.username } : null
      },
      spectatorCount: this.spectators.length,
      createdAt: this.createdAt,
      score: this.gameState.score
    };
  }

  // プライベートメソッド

  /**
   * プレイヤーのソケットをセットアップする
   */
  private setupPlayerSocket(player: PlayerInfo, side: "left" | "right"): void {
    const { socket } = player;

    socket.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handlePlayerMessage(player.userId, data, side);
      } catch (err) {
        console.error(`メッセージ解析エラー: ${err}`);
      }
    });

    socket.on("close", () => {
      this.removePlayer(player.userId);
    });

    // 初期情報を送信
    socket.send(JSON.stringify({
      type: "init",
      gameId: this.id,
      gameName: this.name,
      side,
      gameState: this.gameState,
      status: this.status
    }));
  }

  /**
   * 観戦者のソケットをセットアップする
   */
  private setupSpectatorSocket(spectator: SpectatorInfo): void {
    const { socket } = spectator;

    socket.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleSpectatorMessage(spectator.userId, data);
      } catch (err) {
        console.error(`メッセージ解析エラー: ${err}`);
      }
    });

    socket.on("close", () => {
      this.removeSpectator(spectator.userId);
    });

    // 観戦者に初期情報を送信
    socket.send(JSON.stringify({
      type: "init",
      gameId: this.id,
      gameName: this.name,
      role: "spectator",
      gameState: this.gameState,
      status: this.status,
      players: {
        left: this.players.left ? { username: this.players.left.username } : null,
        right: this.players.right ? { username: this.players.right.username } : null
      }
    }));
  }

  /**
   * プレイヤーからのメッセージを処理する
   */
  private handlePlayerMessage(userId: string, data: any, side: "left" | "right"): void {
    switch (data.type) {
      case "paddleMove":
        this.updatePaddlePosition(userId, data.y);
        break;
      case "chat":
        const username = side === "left" 
          ? this.players.left?.username || "Player 1"
          : this.players.right?.username || "Player 2";
        this.addChatMessage(userId, username, data.message);
        break;
      // その他のメッセージタイプに対応
    }
  }

  /**
   * 観戦者からのメッセージを処理する
   */
  private handleSpectatorMessage(userId: string, data: any): void {
    // 観戦者からは基本的にチャットメッセージのみ受け付ける
    if (data.type === "chat") {
      const spectator = this.spectators.find(s => s.userId === userId);
      if (spectator) {
        this.addChatMessage(userId, spectator.username, data.message);
      }
    }
  }

  /**
   * プレイヤーが切断した時の処理
   */
  private handlePlayerDisconnect(side: "left" | "right"): void {
    // ゲーム中の場合はゲームを終了
    if (this.status === "playing" || this.status === "countdown") {
      this.stopGameLoop();
      this.stopCountdown();
      this.status = "abandoned";
      
      // 残っている人に通知
      this.broadcastToAll({
        type: "playerDisconnected",
        side,
        status: this.status
      });
    }
  }

  /**
   * カウントダウンを開始する
   */
  private startCountdown(): void {
    this.status = "countdown";
    this.countdown = 5;
    
    // カウントダウンメッセージを送信
    this.broadcastToAll({
      type: "countdown",
      count: this.countdown
    });
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      
      if (this.countdown <= 0) {
        this.stopCountdown();
        this.startGame();
      } else {
        // カウントダウンメッセージを送信
        this.broadcastToAll({
          type: "countdown",
          count: this.countdown
        });
      }
    }, 1000);
  }

  /**
   * カウントダウンを停止する
   */
  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * ゲームを開始する
   */
  private startGame(): void {
    this.status = "playing";
    
    // ゲーム開始メッセージを送信
    this.broadcastToAll({
      type: "gameStart",
      gameState: this.gameState
    });
    
    // ゲームループを開始
    this.gameInterval = setInterval(() => {
      this.gameEngine.update();
      this.broadcastGameState();
      
      // 得点上限に達したらゲーム終了
      if (this.gameState.score.left >= 10 || this.gameState.score.right >= 10) {
        this.endGame();
      }
    }, 1000 / 60); // 60FPS
  }

  /**
   * ゲームループを停止する
   */
  private stopGameLoop(): void {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }

  /**
   * ゲーム状態を全員に送信する
   */
  private broadcastGameState(): void {
    const message = JSON.stringify({
      type: "gameState",
      ...this.gameState
    });
    
    this.broadcastToAll(message);
  }

  /**
   * メッセージを全員に送信する
   */
  private broadcastToAll(message: any): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (this.players.left) {
      this.players.left.socket.send(messageStr);
    }
    if (this.players.right) {
      this.players.right.socket.send(messageStr);
    }
    this.spectators.forEach(spectator => {
      spectator.socket.send(messageStr);
    });
  }
}
