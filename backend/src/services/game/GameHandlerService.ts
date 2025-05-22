import { TypeGuardService } from "./TypeGuardService";
import { checkAndStartGame } from "./roomUtils";

import type { GameRoom } from "src/types/game";

import type {
  ChatMessage,
  PaddleMoveMessage,
  GameSettingsMessage,
  GameMessage,
} from "src/types/message";

export class GameHandlerService {
  private room: GameRoom;

  constructor(room: GameRoom) {
    this.room = room;
  }

  public handlePlayerMessage(message: Buffer, playerSide: "left" | "right") {
    const typeGuardService = new TypeGuardService();

    try {
      const data = JSON.parse(message.toString()) as Partial<GameMessage>;
      switch (data.type) {
        case "chat":
          if (typeGuardService.isChatMessage(data)) {
            this.handleChatMessage(data as ChatMessage, playerSide);
          }
          break;
        case "paddleMove":
          if (typeGuardService.isPaddleMoveMessage(data)) {
            this.handlePaddleMove(data as PaddleMoveMessage, playerSide);
          }
          break;
        case "surrender":
          if (typeGuardService.isSurrenderMessage(data)) {
            this.handleSurrender(playerSide);
          }
          break;
        case "gameSettings":
          if (typeGuardService.isGameSettingsMessage(data)) {
            this.handleGameSettings(data as GameSettingsMessage, playerSide);
          }
          break;
        default:
          console.error(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  private handleChatMessage(
    data: ChatMessage,
    playerSide: "left" | "right"
  ): void {
    // チャットメッセージを追加
    this.room.chats.push({
      name: data.name,
      message: data.message,
    });

    // 自分自身に送信
    const player = this.room.players[playerSide];
    if (player) {
      // 元の実装と同じ形式でチャットデータを送信
      player.send(JSON.stringify(this.room.chats));
    }

    // 相手プレイヤーに送信
    const opponent =
      playerSide === "left" ? this.room.players.right : this.room.players.left;
    if (opponent) {
      opponent.send(JSON.stringify(this.room.chats));
    }
  }

  private handlePaddleMove(
    data: PaddleMoveMessage,
    playerSide: "left" | "right"
  ): void {
    // パドル位置を更新
    if (playerSide === "left") {
      this.room.gameState.paddleLeft.y = data.y;
    } else {
      this.room.gameState.paddleRight.y = data.y;
    }

    // 相手プレイヤーに状態を送信
    const opponent =
      playerSide === "left" ? this.room.players.right : this.room.players.left;
    if (opponent) {
      opponent.send(JSON.stringify(this.room.gameState));
    }
  }

  private handleSurrender(playerSide: "left" | "right") {
    // ゲームが開始されていない場合は何もしない
    if (!this.room.gameStarted) return;

    console.log(`Player ${playerSide} surrendered the game`);

    // 降参したプレイヤーの相手を勝者とする
    const winner = playerSide === "left" ? "right" : "left";
    this.room.gameState.gameOver = true;
    this.room.gameState.winner = winner;

    // 勝者のスコアを勝利点数にする
    if (winner === "left") {
      this.room.gameState.score.left = this.room.gameState.winningScore;
    } else {
      this.room.gameState.score.right = this.room.gameState.winningScore;
    }

    // 降参したプレイヤーに敗北通知を送信
    const surrenderingPlayer = this.room.players[playerSide];
    if (surrenderingPlayer) {
      const surrenderMessage = JSON.stringify({
        type: "gameOver",
        winner: winner,
        reason: "surrender",
        message: "あなたは中断して敗北しました。",
        leftScore: this.room.gameState.score.left,
        rightScore: this.room.gameState.score.right,
      });

      surrenderingPlayer.send(surrenderMessage);
    }

    // 勝利したプレイヤーに勝利通知を送信
    const victorPlayer = this.room.players[winner];
    if (victorPlayer) {
      const victoryMessage = JSON.stringify({
        type: "gameOver",
        winner: winner,
        reason: "opponent_surrendered",
        message: "相手プレイヤーが中断しました。あなたの勝利です！",
        leftScore: this.room.gameState.score.left,
        rightScore: this.room.gameState.score.right,
      });
      victorPlayer.send(victoryMessage);
    }

    // ゲームを停止
    if (this.room.gameIntervals.gameInterval) {
      clearInterval(this.room.gameIntervals.gameInterval);
      this.room.gameIntervals.gameInterval = undefined;
    }

    this.room.gameStarted = false;
  }

  private handleGameSettings(
    data: GameSettingsMessage,
    playerSide: "left" | "right"
  ): void {
    // 左側プレイヤーからの設定のみを受け付ける
    if (playerSide !== "left") {
      console.warn("Right player attempted to change game settings, ignored");
      return;
    }

    const { ballSpeed, winningScore } = data.settings;
    console.log(
      `Game settings updated: ballSpeed=${ballSpeed}, winningScore=${winningScore}`
    );

    // 設定を保存
    this.room.settings = {
      ballSpeed,
      winningScore,
    };

    // ゲーム状態に勝利点数を反映
    this.room.gameState.winningScore = winningScore;

    // 左側プレイヤーの準備完了フラグをセット
    this.room.leftPlayerReady = true;

    // 右側プレイヤーが既に接続している場合はゲーム開始準備をチェック
    checkAndStartGame(this.room);
  }

  public handlePlayerDisconnect(
    playerSide: "left" | "right",
    roomId: string,
    gameRooms: Map<string, GameRoom>
  ) {
    // プレイヤーの接続を削除
    if (this.room.players[playerSide]) {
      this.room.players[playerSide] = undefined;
    }

    // ゲームが進行中の場合は、切断したプレイヤーを敗者とする
    if (this.room.gameStarted) {
      // 残っているプレイヤーを勝者にする
      const winner = playerSide === "left" ? "right" : "left";
      const opponent = this.room.players[winner];

      if (opponent) {
        // 勝者のスコアを勝利点数にする
        if (winner === "left") {
          this.room.gameState.score.left = this.room.gameState.winningScore;
        } else {
          this.room.gameState.score.right = this.room.gameState.winningScore;
        }

        // 勝利メッセージを送信
        const victoryMessage = JSON.stringify({
          type: "gameOver",
          winner: winner,
          reason: "opponent_disconnected",
          message: "相手プレイヤーが切断しました。あなたの勝利です！",
          leftScore: this.room.gameState.score.left,
          rightScore: this.room.gameState.score.right,
        });

        opponent.send(victoryMessage);
      }

      // ゲームを停止
      if (this.room.gameIntervals.gameInterval) {
        clearInterval(this.room.gameIntervals.gameInterval);
        this.room.gameIntervals.gameInterval = undefined;
      }

      this.room.gameStarted = false;
      this.room.gameState.gameOver = true;
    }

    // カウントダウン中の場合はカウントダウンを停止
    if (this.room.gameIntervals.countdownInterval) {
      clearInterval(this.room.gameIntervals.countdownInterval);
      this.room.gameIntervals.countdownInterval = undefined;
    }

    // ルームが空になったら削除
    if (!this.room.players.left && !this.room.players.right) {
      // すべてのインターバルをクリア
      for (const interval in this.room.gameIntervals) {
        if (this.room.gameIntervals[interval]) {
          clearInterval(this.room.gameIntervals[interval]);
          this.room.gameIntervals[interval] = undefined;
        }
      }
      gameRooms.delete(roomId);
    }
  }

  
}
