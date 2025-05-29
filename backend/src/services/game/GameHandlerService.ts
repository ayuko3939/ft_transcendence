import { checkAndStartGame } from "./roomUtils";
import { saveGameResult } from "./saveGameResult";

import type { GameRoom } from "../../types/game";
import type { ClientMessage } from "@ft-transcendence/shared";

export class GameHandlerService {
  private room: GameRoom;

  constructor(room: GameRoom) {
    this.room = room;
  }

  // ヘルパー関数群
  private isGamePlaying(): boolean {
    return this.room.state.status === "playing";
  }

  private getOpponent(playerSide: "left" | "right") {
    return playerSide === "left"
      ? this.room.players.right
      : this.room.players.left;
  }

  private sendGameOver(
    winner: "left" | "right",
    reason: string,
    message: string,
  ): void {
    const victorPlayer = this.room.players[winner];
    if (!victorPlayer) return;

    // 勝者のスコアを勝利点数にする
    if (winner === "left") {
      this.room.state.score.left = this.room.state.winningScore;
    } else {
      this.room.state.score.right = this.room.state.winningScore;
    }

    const victoryMessage = JSON.stringify({
      type: "gameOver",
      result: {
        winner: winner,
        finalScore: {
          left: this.room.state.score.left,
          right: this.room.state.score.right,
        },
        reason: reason,
        message: message,
      },
    });

    victorPlayer.send(victoryMessage);
  }

  private stopGame(): void {
    if (this.room.timers.game) {
      clearInterval(this.room.timers.game);
      this.room.timers.game = undefined;
    }
    this.room.state.status = "finished";
  }

  public handlePlayerMessage(message: Buffer, playerSide: "left" | "right") {
    try {
      const data = JSON.parse(message.toString()) as ClientMessage;

      switch (data.type) {
        case "auth":
          this.handleAuthMessage(data, playerSide);
          break;
        case "chat":
          this.handleChatMessage(data, playerSide);
          break;
        case "paddleMove":
          this.handlePaddleMove(data, playerSide);
          break;
        case "surrender":
          this.handleSurrender(playerSide).catch(console.error);
          break;
        case "gameSettings":
          this.handleGameSettings(data, playerSide);
          break;
        default:
          console.error(`Unknown message type: ${(data as any).type}`);
      }
    } catch (error) {
      console.error("メッセージ処理エラー:", error);
    }
  }

  private handleAuthMessage(
    data: Extract<ClientMessage, { type: "auth" }>,
    playerSide: "left" | "right",
  ): void {
    // ユーザーIDをGameRoomに保存
    this.room.userIds[playerSide] = data.sessionToken;

    console.log(`プレイヤー ${playerSide} の認証完了:`, data.sessionToken);

    const player = this.room.players[playerSide];
    if (!player) return;

    // leftプレイヤーはsetup状態で初期化
    if (playerSide === "left") {
      this.room.state.status = "setup";
      player.send(
        JSON.stringify({
          type: "init",
          side: playerSide,
          state: this.room.state,
          roomId: this.room.id,
        }),
      );
    } else {
      // rightプレイヤーは待機状態で初期化
      this.room.state.status = "waiting";

      player.send(
        JSON.stringify({
          type: "init",
          side: playerSide,
          state: this.room.state,
          roomId: this.room.id,
        }),
      );

      checkAndStartGame(this.room);
    }
  }

  private handleChatMessage(
    data: Extract<ClientMessage, { type: "chat" }>,
    playerSide: "left" | "right",
  ): void {
    this.room.chats.push({
      name: data.name,
      message: data.message,
    });

    const chatUpdate = JSON.stringify({
      type: "chatUpdate",
      messages: this.room.chats,
    });

    // 両プレイヤーに送信
    const player = this.room.players[playerSide];
    const opponent = this.getOpponent(playerSide);

    if (player) player.send(chatUpdate);
    if (opponent) opponent.send(chatUpdate);
  }

  private handlePaddleMove(
    data: Extract<ClientMessage, { type: "paddleMove" }>,
    playerSide: "left" | "right",
  ): void {
    // パドル位置を更新
    if (playerSide === "left") {
      this.room.state.paddleLeft.y = data.y;
    } else {
      this.room.state.paddleRight.y = data.y;
    }

    // 相手プレイヤーに状態を送信
    const opponent = this.getOpponent(playerSide);
    if (opponent) {
      opponent.send(
        JSON.stringify({
          type: "gameState",
          state: this.room.state,
        }),
      );
    }
  }

  private async handleSurrender(playerSide: "left" | "right"): Promise<void> {
    // ゲーム中でない場合は何もしない
    if (!this.isGamePlaying()) return;

    const winner = playerSide === "left" ? "right" : "left";
    this.sendGameOver(
      winner,
      "surrender",
      "相手プレイヤーが中断しました。あなたの勝利です！",
    );
    this.stopGame();

    // ゲーム結果をデータベースに保存
    await saveGameResult(this.room, "surrender");
  }

  private handleGameSettings(
    data: Extract<ClientMessage, { type: "gameSettings" }>,
    playerSide: "left" | "right",
  ): void {
    // 左側プレイヤー以外は設定変更不可
    if (playerSide !== "left") {
      console.warn("右プレイヤーが設定変更を試行しました");
      return;
    }

    const { ballSpeed, winningScore } = data;

    this.room.settings = { ballSpeed, winningScore };
    this.room.state.winningScore = winningScore;
    this.room.leftPlayerReady = true;

    checkAndStartGame(this.room);
  }

  public async handlePlayerDisconnect(
    playerSide: "left" | "right",
    roomId: string,
    gameRooms: Map<string, GameRoom>,
  ): Promise<void> {
    // プレイヤーの接続を削除
    if (this.room.players[playerSide]) {
      this.room.players[playerSide] = undefined;
    }

    // ユーザーID情報も削除
    if (this.room.userIds[playerSide]) {
      this.room.userIds[playerSide] = undefined;
    }

    // ゲーム中の場合は相手を勝者にする
    if (this.isGamePlaying()) {
      const winner = playerSide === "left" ? "right" : "left";
      this.sendGameOver(
        winner,
        "opponent_disconnected",
        "相手プレイヤーが切断しました。あなたの勝利です！",
      );
      this.stopGame();

      // ゲーム結果をデータベースに保存
      await saveGameResult(this.room, "disconnect");
    }

    // カウントダウン中の場合はカウントダウンを停止
    if (this.room.timers.countdown) {
      clearInterval(this.room.timers.countdown);
      this.room.timers.countdown = undefined;
    }

    // ルームが空になったら削除
    if (!this.room.players.left && !this.room.players.right) {
      this.cleanupRoom();
      gameRooms.delete(roomId);
    }
  }

  private cleanupRoom(): void {
    if (this.room.timers.countdown) {
      clearInterval(this.room.timers.countdown);
      this.room.timers.countdown = undefined;
    }
    if (this.room.timers.game) {
      clearInterval(this.room.timers.game);
      this.room.timers.game = undefined;
    }
  }
}
