import type { WebSocket } from "@fastify/websocket";
import type {
  TournamentClientMessage,
  TournamentServerMessage,
  TournamentConnection,
  TournamentRoom,
  Tournament,
} from "../../types/tournament";
import { TournamentService } from "./TournamentService";

export class TournamentWebSocketService {
  private tournamentService: TournamentService;

  constructor(tournamentService: TournamentService) {
    this.tournamentService = tournamentService;
  }

  /**
   * 新しいクライアント接続を処理
   */
  public async handleConnection(
    socket: WebSocket,
    tournamentId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const tournament = await this.tournamentService.getTournament(tournamentId);
      if (!tournament) {
        socket.close(1003, "Tournament not found");
        return;
      }

      // ユーザーが参加者かチェック
      const isParticipant = tournament.participants.some(p => p.userId === userId);
      if (!isParticipant) {
        socket.close(1008, "Not a participant in this tournament");
        return;
      }

      const room = this.tournamentService.getTournamentRoom(tournamentId);
      room.tournament = tournament;

      // 接続を管理マップに追加
      const connection: TournamentConnection = {
        socket,
        userId,
        userName,
      };
      room.connections.set(userId, connection);

      // 現在の状態を新しいクライアントに送信
      this.sendTournamentState(socket, room);

      // 他の参加者に新規参加を通知
      this.broadcastToRoom(room, {
        type: "participant_joined",
        participant: tournament.participants.find(p => p.userId === userId)!,
        totalParticipants: tournament.participants.length,
      }, userId);

      // メッセージハンドラを設定
      socket.on("message", (message: Buffer) => {
        this.handleMessage(room, userId, message);
      });

      // 切断ハンドラを設定
      socket.on("close", () => {
        this.handleDisconnection(room, userId);
      });

      console.log(`User ${userName} connected to tournament ${tournamentId}`);
    } catch (error) {
      console.error("Error handling tournament connection:", error);
      socket.close(1011, "Internal server error");
    }
  }

  /**
   * メッセージ処理
   */
  private handleMessage(room: TournamentRoom, userId: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString()) as TournamentClientMessage;
      
      switch (data.type) {
        case "chat_message":
          this.handleChatMessage(room, userId, data.message);
          break;
        case "ready_status":
          this.handleReadyStatus(room, userId, data.isReady);
          break;
        default:
          console.warn(`Unknown message type: ${(data as any).type}`);
      }
    } catch (error) {
      console.error("Error handling tournament message:", error);
    }
  }

  /**
   * チャットメッセージ処理
   */
  private handleChatMessage(room: TournamentRoom, userId: string, message: string): void {
    const connection = room.connections.get(userId);
    if (!connection) return;

    const chatMessage = this.tournamentService.addChatMessage(
      room.tournament.id,
      userId,
      connection.userName,
      message
    );

    this.broadcastToRoom(room, {
      type: "chat_message",
      message: chatMessage,
    });
  }

  /**
   * 準備状態変更処理
   */
  private handleReadyStatus(room: TournamentRoom, userId: string, isReady: boolean): void {
    // 現在のところ、準備状態は特に保存しないが、必要に応じて実装可能
    console.log(`User ${userId} ready status: ${isReady}`);
  }

  /**
   * 切断処理
   */
  private handleDisconnection(room: TournamentRoom, userId: string): void {
    room.connections.delete(userId);

    // 他の参加者に退出を通知
    this.broadcastToRoom(room, {
      type: "participant_left",
      userId,
      totalParticipants: room.tournament.participants.length,
    });

    console.log(`User ${userId} disconnected from tournament ${room.tournament.id}`);
  }

  /**
   * トーナメント状態を送信
   */
  private sendTournamentState(socket: WebSocket, room: TournamentRoom): void {
    const message: TournamentServerMessage = {
      type: "tournament_state",
      tournament: room.tournament,
      chatMessages: room.chatMessages,
    };

    this.sendMessage(socket, message);
  }

  /**
   * トーナメント開始通知
   */
  public notifyTournamentStarting(tournamentId: string): void {
    const room = this.tournamentService.getTournamentRoom(tournamentId);
    
    this.broadcastToRoom(room, {
      type: "tournament_starting",
      message: "トーナメントが開始されます！",
    });
  }

  /**
   * ブラケット生成通知
   */
  public notifyBracketGenerated(tournamentId: string, totalRounds: number): void {
    const room = this.tournamentService.getTournamentRoom(tournamentId);
    
    this.broadcastToRoom(room, {
      type: "bracket_generated",
      bracket: room.tournament.bracket,
      totalRounds,
    });
  }

  /**
   * 試合開始準備通知
   */
  public notifyMatchReady(
    tournamentId: string,
    matchId: string,
    gameRoomId: string,
    playerId: string,
    opponentInfo: { id: string; name: string; image?: string }
  ): void {
    const room = this.tournamentService.getTournamentRoom(tournamentId);
    const match = room.tournament.bracket.find(m => m.id === matchId);
    
    if (!match) return;

    const connection = room.connections.get(playerId);
    if (!connection) return;

    const message: TournamentServerMessage = {
      type: "match_ready",
      matchId,
      gameRoomId,
      round: match.round,
      matchNumber: match.matchNumber,
      opponent: opponentInfo,
    };

    this.sendMessage(connection.socket, message);
  }

  /**
   * 試合結果通知
   */
  public notifyMatchResult(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    winnerName: string,
    loserId: string,
    loserName: string,
    score: { winner: number; loser: number }
  ): void {
    const room = this.tournamentService.getTournamentRoom(tournamentId);
    
    this.broadcastToRoom(room, {
      type: "match_result",
      matchId,
      winnerId,
      winnerName,
      loserId,
      loserName,
      score,
    });
  }

  /**
   * トーナメント進行状況更新通知
   */
  public notifyTournamentStatusUpdate(
    tournamentId: string,
    status: Tournament["status"],
    currentRound?: number,
    totalRounds?: number,
    winnerId?: string,
    winnerName?: string
  ): void {
    const room = this.tournamentService.getTournamentRoom(tournamentId);
    
    this.broadcastToRoom(room, {
      type: "tournament_status_update",
      status,
      currentRound,
      totalRounds,
      winnerId,
      winnerName,
    });
  }

  /**
   * ルーム内の全員にメッセージをブロードキャスト
   */
  private broadcastToRoom(
    room: TournamentRoom,
    message: TournamentServerMessage,
    excludeUserId?: string
  ): void {
    room.connections.forEach((connection, userId) => {
      if (excludeUserId && userId === excludeUserId) return;
      this.sendMessage(connection.socket, message);
    });
  }

  /**
   * 特定のソケットにメッセージを送信
   */
  private sendMessage(socket: WebSocket, message: TournamentServerMessage): void {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  /**
   * トーナメントルームの接続数を取得
   */
  public getConnectionCount(tournamentId: string): number {
    const room = this.tournamentService.getTournamentRoom(tournamentId);
    return room.connections.size;
  }

  /**
   * 特定のユーザーがオンラインかチェック
   */
  public isUserOnline(tournamentId: string, userId: string): boolean {
    const room = this.tournamentService.getTournamentRoom(tournamentId);
    return room.connections.has(userId);
  }
}
