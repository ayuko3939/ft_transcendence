import { checkAndStartGame } from "./roomUtils";

import type { GameRoom } from "../../types/game";
import type { ClientMessage, GameStatus } from "../../types/shared/types";

export class GameHandlerService {
  private room: GameRoom;

  constructor(room: GameRoom) {
    this.room = room;
  }

  public handlePlayerMessage(message: Buffer, playerSide: "left" | "right") {
    try {
      const data = JSON.parse(message.toString()) as ClientMessage;
      switch (data.type) {
        case "chat":
          this.handleChatMessage(data, playerSide);
          break;
        case "paddleMove":
          this.handlePaddleMove(data, playerSide);
          break;
        case "surrender":
          this.handleSurrender(playerSide);
          break;
        case "gameSettings":
          this.handleGameSettings(data, playerSide);
          break;
        default: {
          const unknownMessage = data as { type: string };
          console.error(`Unknown message type: ${unknownMessage.type}`);
          break;
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  private handleChatMessage(
    data: Extract<ClientMessage, { type: 'chat' }>,
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
      player.send(JSON.stringify({
        type: "chatUpdate",
        messages: this.room.chats,
      }));
    }

    // 相手プレイヤーに送信
    const opponent =
    playerSide === "left" ? this.room.players.right : this.room.players.left;
    if (opponent) {
      opponent.send(JSON.stringify({
        type: "chatUpdate", 
        messages: this.room.chats,
      }));
    } else {
      console.error("Opponent not found!");
    }
  }

  private handlePaddleMove(
    data: Extract<ClientMessage, { type: 'paddleMove' }>,
    playerSide: "left" | "right"
  ): void {
    // パドル位置を更新
    if (playerSide === "left") {
      this.room.state.paddleLeft.y = data.y;
    } else {
      this.room.state.paddleRight.y = data.y;
    }

    // 相手プレイヤーに状態を送信
    const opponent =
      playerSide === "left" ? this.room.players.right : this.room.players.left;
    if (opponent) {
      opponent.send(JSON.stringify({
        type: "gameState",
        state: this.room.state,
      }));
    }
  }

  private handleSurrender(playerSide: "left" | "right") {
    // ゲームが開始されていない場合は何もしない
    if ((this.room.state.status as GameStatus) !== 'playing') return;

    // 降参したプレイヤーの相手を勝者とする
    const winner = playerSide === "left" ? "right" : "left";
    this.room.state.status = 'finished';
    this.room.state.winner = winner;

    // 勝者のスコアを勝利点数にする
    if (winner === "left") {
      this.room.state.score.left = this.room.state.winningScore;
    } else {
      this.room.state.score.right = this.room.state.winningScore;
    }

    // // 降参したプレイヤーに敗北通知を送信
    // const surrenderingPlayer = this.room.players[playerSide];
    // if (surrenderingPlayer) {
    //   const surrenderMessage = JSON.stringify({
    //     type: "gameOver",
    //     result: {
    //       winner: winner,
    //       finalScore: {
    //         left: this.room.state.score.left,
    //         right: this.room.state.score.right,
    //       },
    //       reason: "surrender",
    //       message: "あなたは中断して敗北しました。",
    //     }
    //   });
    //   surrenderingPlayer.send(surrenderMessage);
    // }

    // 勝利したプレイヤーに勝利通知を送信
    const victorPlayer = this.room.players[winner];
    if (victorPlayer) {
      const victoryMessage = JSON.stringify({
        type: "gameOver",
        result: {
          winner: winner,
          finalScore: {
            left: this.room.state.score.left,
            right: this.room.state.score.right,
          },
          reason: "surrender",
          message: "相手プレイヤーが中断しました。あなたの勝利です！",
        }
      });
      victorPlayer.send(victoryMessage);
    }

    // ゲームを停止
    if (this.room.timers.game) {
      clearInterval(this.room.timers.game);
      this.room.timers.game = undefined;
    }
  }

  private handleGameSettings(
    data: Extract<ClientMessage, { type: 'gameSettings' }>,
    playerSide: "left" | "right"
  ): void {
    // 左側プレイヤーからの設定のみを受け付ける
    if (playerSide !== "left") {
      console.warn("Right player attempted to change game settings, ignored");
      return;
    }

    const { ballSpeed, winningScore } = data;
    console.log(
      `Game settings updated: ballSpeed=${ballSpeed}, winningScore=${winningScore}`
    );

    // 設定を保存
    this.room.settings = {
      ballSpeed,
      winningScore,
    };

    // ゲーム状態に勝利点数を反映
    this.room.state.winningScore = winningScore;

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
    if ((this.room.state.status as GameStatus) === 'playing') {
      // 残っているプレイヤーを勝者にする
      const winner = playerSide === "left" ? "right" : "left";
      const opponent = this.room.players[winner];

      if (opponent) {
        // 勝者のスコアを勝利点数にする
        if (winner === "left") {
          this.room.state.score.left = this.room.state.winningScore;
        } else {
          this.room.state.score.right = this.room.state.winningScore;
        }

        // 勝利メッセージを送信
        const victoryMessage = JSON.stringify({
          type: "gameOver",
          result: {
            winner: winner,
            finalScore: {
              left: this.room.state.score.left,
              right: this.room.state.score.right,
            },
            reason: "opponent_disconnected",
            message: "相手プレイヤーが切断しました。あなたの勝利です！",
          },
        });

        opponent.send(victoryMessage);
      }

      // ゲームを停止
      if (this.room.timers.game) {
        clearInterval(this.room.timers.game);
        this.room.timers.game = undefined;
      }

      this.room.state.status = 'finished';
    }

    // カウントダウン中の場合はカウントダウンを停止
    if (this.room.timers.countdown) {
      clearInterval(this.room.timers.countdown);
      this.room.timers.countdown = undefined;
    }

    // ルームが空になったら削除
    if (!this.room.players.left && !this.room.players.right) {
      // すべてのインターバルをクリア
      if (this.room.timers.countdown) {
        clearInterval(this.room.timers.countdown);
        this.room.timers.countdown = undefined;
      }
      if (this.room.timers.game) {
        clearInterval(this.room.timers.game);
        this.room.timers.game = undefined;
      }
      gameRooms.delete(roomId);
    }
  }
}
