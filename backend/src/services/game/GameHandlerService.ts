import { checkAndStartGame, checkAndStartTournamentGame } from "./roomUtils";
import { saveGameResult } from "./saveGameResult";
import { TournamentService } from "../tournament/TournamentService";

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
    const leftPlayer = this.room.players.left;
    const rightPlayer = this.room.players.right;
    
    if (!leftPlayer || !rightPlayer) return;

    // 勝者のスコアを勝利点数にする
    if (winner === "left") {
      this.room.state.score.left = this.room.state.winningScore;
    } else {
      this.room.state.score.right = this.room.state.winningScore;
    }

    const gameResult = {
      winner: winner,
      finalScore: {
        left: this.room.state.score.left,
        right: this.room.state.score.right,
      },
      reason: reason,
      message: message,
    };

    // 左プレイヤーにメッセージ送信（対戦相手は右プレイヤー）
    const leftMessage = JSON.stringify({
      type: "gameOver",
      result: gameResult,
      opponentUserId: this.room.userIds.right,
    });
    leftPlayer.send(leftMessage);

    // 右プレイヤーにメッセージ送信（対戦相手は左プレイヤー）
    const rightMessage = JSON.stringify({
      type: "gameOver",
      result: gameResult,
      opponentUserId: this.room.userIds.left,
    });
    rightPlayer.send(rightMessage);
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
          this.handleAuthMessage(data, playerSide).catch(console.error);
          break;
        case "chat":
          if (this.room.state.gameType !== "local") {
            this.handleChatMessage(data, playerSide);
          }
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

  private async handleAuthMessage(
    data: Extract<ClientMessage, { type: "auth" }>,
    playerSide: "left" | "right",
  ): Promise<void> {
    // ユーザーIDをGameRoomに保存
    this.room.userIds[playerSide] = data.sessionToken;

    console.log(`プレイヤー ${playerSide} 接続:`, data.sessionToken);

    // トーナメントマッチの場合、プレイヤーが正しいか検証
    if (this.room.tournamentMatchId) {
      const isValidPlayer = await this.validateTournamentPlayer(
        data.sessionToken,
        playerSide
      );
      if (!isValidPlayer) {
        const player = this.room.players[playerSide];
        if (player) {
          player.send(
            JSON.stringify({
              type: "error",
              message: "このトーナメントマッチに参加する権限がありません",
            })
          );
          player.close(1008, "Unauthorized for this tournament match");
        }
        return;
      }
    }

    const player = this.room.players[playerSide];
    if (!player) return;

    // トーナメントマッチの場合は設定をスキップ
    if (this.room.tournamentMatchId) {
      this.room.state.status = "waiting";
      player.send(
        JSON.stringify({
          type: "init",
          side: playerSide,
          state: this.room.state,
          roomId: this.room.id,
        }),
      );

      // 両プレイヤーが接続したら試合を開始
      if (this.room.players.left && this.room.players.right) {
        this.updateTournamentMatchStatus("in_progress").catch(console.error);
        // トーナメント専用のゲーム開始処理
        checkAndStartTournamentGame(this.room);
      }
    } else {
      // 通常のゲーム
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
    this.room.state.winner = winner;
    this.room.state.status = "finished";
    this.sendGameOver(
      winner,
      "surrender",
      "相手プレイヤーが中断しました。あなたの勝利です！",
    );
    this.stopGame();

    // ローカルモードではDB保存をスキップ
    if (this.room.state.gameType !== "local") {
      await saveGameResult(this.room, "surrender");
    }
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
      this.room.state.winner = winner;
      this.room.state.status = "finished";
      this.sendGameOver(
        winner,
        "opponent_disconnected",
        "相手プレイヤーが切断しました。あなたの勝利です！",
      );
      this.stopGame();

      // ローカルモードではDB保存をスキップ
      if (this.room.state.gameType !== "local") {
        await saveGameResult(this.room, "disconnect");
      }
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

  /**
   * トーナメントマッチの状態を更新
   */
  private async updateTournamentMatchStatus(
    status: "pending" | "in_progress" | "completed",
  ): Promise<void> {
    if (!this.room.tournamentMatchId) return;

    try {
      const tournamentService = new TournamentService();
      await tournamentService.updateMatchStatus(
        this.room.tournamentMatchId,
        status,
      );
      console.log(
        `トーナメントマッチ ${this.room.tournamentMatchId} の状態を ${status} に更新しました`,
      );
    } catch (error) {
      console.error("トーナメントマッチ状態更新エラー:", error);
    }
  }

  /**
   * トーナメントプレイヤーの検証
   */
  private async validateTournamentPlayer(
    userId: string,
    playerSide: "left" | "right"
  ): Promise<boolean> {
    if (!this.room.tournamentMatchId) return false;

    try {
      const tournamentService = new TournamentService();
      const matchDetails = await tournamentService.getMatchDetails(
        this.room.tournamentMatchId
      );

      if (!matchDetails) return false;

      // プレイヤーがマッチの参加者であることを確認
      const isPlayer1 = matchDetails.player1Id === userId;
      const isPlayer2 = matchDetails.player2Id === userId;

      if (!isPlayer1 && !isPlayer2) {
        console.log(
          `ユーザー ${userId} はマッチ ${this.room.tournamentMatchId} の参加者ではありません`
        );
        return false;
      }

      // 既に両プレイヤーが接続している場合、重複接続を防ぐ
      const oppositeSlot = playerSide === "left" ? "right" : "left";
      if (this.room.userIds[oppositeSlot] === userId) {
        console.log(`ユーザー ${userId} は既に接続しています`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("トーナメントプレイヤー検証エラー:", error);
      return false;
    }
  }
}
