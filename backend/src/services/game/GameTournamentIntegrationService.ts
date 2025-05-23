import type { GameRoom } from "../../types/game";
import { TournamentService, TournamentWebSocketService } from "../tournament";

export class GameTournamentIntegrationService {
  private tournamentService: TournamentService;
  private tournamentWsService: TournamentWebSocketService;

  constructor() {
    this.tournamentService = new TournamentService();
    this.tournamentWsService = new TournamentWebSocketService(this.tournamentService);
  }

  /**
   * ゲーム終了時の処理（トーナメント統合）
   */
  public async handleGameOver(gameRoom: GameRoom, roomId: string): Promise<void> {
    // トーナメントの試合でない場合は何もしない
    if (!gameRoom.tournamentInfo) {
      return;
    }

    const { tournamentId, matchId, player1Id, player2Id } = gameRoom.tournamentInfo;
    const { winner, score } = gameRoom.gameState;

    if (!winner) {
      console.warn("ゲーム終了時に勝者が決まっていません");
      return;
    }

    try {
      // 勝者と敗者のユーザーIDを決定
      const winnerId = winner === "left" ? player1Id : player2Id;
      const loserId = winner === "left" ? player2Id : player1Id;

      // スコアを決定
      const player1Score = score.left;
      const player2Score = score.right;

      // トーナメントサービスに試合結果を記録
      await this.tournamentService.recordMatchResult(
        tournamentId,
        matchId,
        player1Score,
        player2Score,
        winnerId
      );

      // トーナメント情報を取得
      const tournament = await this.tournamentService.getTournament(tournamentId);
      if (!tournament) {
        console.error("トーナメントが見つかりません");
        return;
      }

      // 参加者情報を取得
      const winnerInfo = tournament.participants.find(p => p.userId === winnerId);
      const loserInfo = tournament.participants.find(p => p.userId === loserId);

      if (!winnerInfo || !loserInfo) {
        console.error("参加者情報が見つかりません");
        return;
      }

      // 試合結果をWebSocket経由で通知
      this.tournamentWsService.notifyMatchResult(
        tournamentId,
        matchId,
        winnerId,
        winnerInfo.userName,
        loserId,
        loserInfo.userName,
        {
          winner: winner === "left" ? player1Score : player2Score,
          loser: winner === "left" ? player2Score : player1Score,
        }
      );

      // トーナメントの進行状況を確認
      const updatedTournament = await this.tournamentService.getTournament(tournamentId);
      if (!updatedTournament) return;

      // トーナメントが完了したかチェック
      if (updatedTournament.status === "completed") {
        const finalist = updatedTournament.participants.find(p => p.status === "won");
        if (finalist) {
          this.tournamentWsService.notifyTournamentStatusUpdate(
            tournamentId,
            "completed",
            undefined,
            undefined,
            finalist.userId,
            finalist.userName
          );
        }
      } else {
        // 次の試合の準備
        await this.prepareNextMatches(tournamentId);
      }

      console.log(`トーナメント試合結果を記録: ${matchId}, 勝者: ${winnerId}`);
    } catch (error) {
      console.error("トーナメント試合結果の処理中にエラーが発生しました:", error);
    }
  }

  /**
   * 次の試合の準備
   */
  private async prepareNextMatches(tournamentId: string): Promise<void> {
    const nextMatches = this.tournamentService.getNextAvailableMatches(tournamentId);
    
    for (const match of nextMatches) {
      if (match.player1Id && match.player2Id) {
        const gameRoomId = `tournament_${tournamentId}_match_${match.id}`;
        
        // ゲームルームIDを設定
        await this.tournamentService.setMatchGameRoom(tournamentId, match.id, gameRoomId);
        
        // トーナメント用ゲームルームを作成
        const { createTournamentGameRoom } = require("../game");
        createTournamentGameRoom(
          gameRoomId,
          tournamentId,
          match.id,
          match.player1Id,
          match.player2Id
        );
        
        // トーナメント情報を取得
        const tournament = await this.tournamentService.getTournament(tournamentId);
        if (!tournament) continue;

        // 各プレイヤーに試合開始通知
        const player1Info = tournament.participants.find(p => p.userId === match.player1Id);
        const player2Info = tournament.participants.find(p => p.userId === match.player2Id);
        
        if (player1Info && player2Info) {
          this.tournamentWsService.notifyMatchReady(
            tournamentId,
            match.id,
            gameRoomId,
            match.player1Id,
            { 
              id: player2Info.userId, 
              name: player2Info.userName, 
              image: player2Info.userImage 
            }
          );
          this.tournamentWsService.notifyMatchReady(
            tournamentId,
            match.id,
            gameRoomId,
            match.player2Id,
            { 
              id: player1Info.userId, 
              name: player1Info.userName, 
              image: player1Info.userImage 
            }
          );
        }
      }
    }
  }

  /**
   * トーナメント用のゲームルームを作成
   */
  public createTournamentGameRoom(
    tournamentId: string,
    matchId: string,
    player1Id: string,
    player2Id: string
  ): GameRoom {
    const { createGameRoom } = require("./roomUtils");
    const gameRoom = createGameRoom();
    
    // トーナメント情報を追加
    gameRoom.tournamentInfo = {
      tournamentId,
      matchId,
      player1Id,
      player2Id,
    };

    return gameRoom;
  }

  /**
   * プレイヤー切断時の処理（トーナメント統合）
   */
  public async handlePlayerDisconnect(
    gameRoom: GameRoom,
    playerSide: "left" | "right"
  ): Promise<void> {
    // トーナメントの試合でない場合は何もしない
    if (!gameRoom.tournamentInfo) {
      return;
    }

    // ゲームが進行中の場合のみ処理
    if (!gameRoom.gameStarted) {
      return;
    }

    const { tournamentId, matchId, player1Id, player2Id } = gameRoom.tournamentInfo;
    
    // 切断したプレイヤーを敗者、残ったプレイヤーを勝者とする
    const winnerId = playerSide === "left" ? player2Id : player1Id;
    const loserId = playerSide === "left" ? player1Id : player2Id;

    try {
      // 勝者のスコアを勝利点数、敗者を0とする
      const winnerScore = gameRoom.gameState.winningScore;
      const loserScore = 0;

      const player1Score = playerSide === "left" ? loserScore : winnerScore;
      const player2Score = playerSide === "left" ? winnerScore : loserScore;

      // 試合結果を記録
      await this.tournamentService.recordMatchResult(
        tournamentId,
        matchId,
        player1Score,
        player2Score,
        winnerId
      );

      // 結果を通知
      const tournament = await this.tournamentService.getTournament(tournamentId);
      if (tournament) {
        const winnerInfo = tournament.participants.find(p => p.userId === winnerId);
        const loserInfo = tournament.participants.find(p => p.userId === loserId);

        if (winnerInfo && loserInfo) {
          this.tournamentWsService.notifyMatchResult(
            tournamentId,
            matchId,
            winnerId,
            winnerInfo.userName,
            loserId,
            loserInfo.userName,
            {
              winner: winnerScore,
              loser: loserScore,
            }
          );
        }
      }

      console.log(`プレイヤー切断によりトーナメント試合終了: ${matchId}, 勝者: ${winnerId}`);
    } catch (error) {
      console.error("プレイヤー切断時のトーナメント処理でエラーが発生しました:", error);
    }
  }

  /**
   * 降参時の処理（トーナメント統合）
   */
  public async handleSurrender(
    gameRoom: GameRoom,
    playerSide: "left" | "right"
  ): Promise<void> {
    // トーナメントの試合でない場合は何もしない
    if (!gameRoom.tournamentInfo) {
      return;
    }

    const { tournamentId, matchId, player1Id, player2Id } = gameRoom.tournamentInfo;
    
    // 降参したプレイヤーを敗者、相手を勝者とする
    const winnerId = playerSide === "left" ? player2Id : player1Id;
    const loserId = playerSide === "left" ? player1Id : player2Id;

    try {
      // 勝者のスコアを勝利点数、敗者を0とする
      const winnerScore = gameRoom.gameState.winningScore;
      const loserScore = 0;

      const player1Score = playerSide === "left" ? loserScore : winnerScore;
      const player2Score = playerSide === "left" ? winnerScore : loserScore;

      // 試合結果を記録
      await this.tournamentService.recordMatchResult(
        tournamentId,
        matchId,
        player1Score,
        player2Score,
        winnerId
      );

      // 結果を通知
      const tournament = await this.tournamentService.getTournament(tournamentId);
      if (tournament) {
        const winnerInfo = tournament.participants.find(p => p.userId === winnerId);
        const loserInfo = tournament.participants.find(p => p.userId === loserId);

        if (winnerInfo && loserInfo) {
          this.tournamentWsService.notifyMatchResult(
            tournamentId,
            matchId,
            winnerId,
            winnerInfo.userName,
            loserId,
            loserInfo.userName,
            {
              winner: winnerScore,
              loser: loserScore,
            }
          );
        }
      }

      console.log(`降参によりトーナメント試合終了: ${matchId}, 勝者: ${winnerId}`);
    } catch (error) {
      console.error("降参時のトーナメント処理でエラーが発生しました:", error);
    }
  }
}

// シングルトンインスタンス
export const gameTournamentIntegration = new GameTournamentIntegrationService();
