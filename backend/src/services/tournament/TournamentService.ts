import { db } from "../../db";
import type {
  Tournament,
  TournamentParticipant,
  TournamentRoom,
  BracketMatch,
  TournamentChatMessage,
} from "../../types/tournament";
import {
  tournament as tournamentTable,
  tournamentParticipant,
  tournamentMatch,
  user,
  match as matchTable,
} from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { BracketService } from "./BracketService";

export class TournamentService {
  private bracketService: BracketService;
  private tournamentRooms: Map<string, TournamentRoom> = new Map();

  constructor() {
    this.bracketService = new BracketService();
  }

  /**
   * 新しいトーナメントを作成
   */
  public async createTournament(
    name: string,
    hostId: string,
    maxPlayers: number = 8
  ): Promise<string> {
    const tournamentId = uuidv4();

    await db.insert(tournamentTable).values({
      id: tournamentId,
      name,
      hostId,
      status: "waiting",
      maxPlayers,
      createdAt: Date.now(),
    });

    // ホストを自動的に参加者として追加
    await this.joinTournament(tournamentId, hostId);

    return tournamentId;
  }

  /**
   * トーナメントに参加
   */
  public async joinTournament(tournamentId: string, userId: string): Promise<void> {
    // トーナメントの状態を確認
    const tournaments = await db
      .select()
      .from(tournamentTable)
      .where(eq(tournamentTable.id, tournamentId));

    const tournament = tournaments[0];
    if (!tournament) {
      throw new Error("トーナメントが見つかりません");
    }

    if (tournament.status !== "waiting") {
      throw new Error("このトーナメントは既に開始されています");
    }

    // 現在の参加者数を確認
    const participants = await db
      .select()
      .from(tournamentParticipant)
      .where(eq(tournamentParticipant.tournamentId, tournamentId));

    if (participants.length >= tournament.maxPlayers) {
      throw new Error("トーナメントの定員に達しています");
    }

    // 既に参加しているかチェック
    const existingParticipant = participants.find(p => p.userId === userId);
    if (existingParticipant) {
      throw new Error("既にこのトーナメントに参加しています");
    }

    // 参加者として追加
    await db.insert(tournamentParticipant).values({
      tournamentId,
      userId,
      status: "waiting",
      joinedAt: Date.now(),
    });
  }

  /**
   * トーナメントから退出
   */
  public async leaveTournament(tournamentId: string, userId: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error("トーナメントが見つかりません");
    }

    if (tournament.status !== "waiting") {
      throw new Error("開始済みのトーナメントからは退出できません");
    }

    await db
      .delete(tournamentParticipant)
      .where(
        and(
          eq(tournamentParticipant.tournamentId, tournamentId),
          eq(tournamentParticipant.userId, userId)
        )
      );
  }

  /**
   * トーナメント開始
   */
  public async startTournament(tournamentId: string, hostId: string): Promise<BracketMatch[]> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error("トーナメントが見つかりません");
    }

    if (tournament.hostId !== hostId) {
      throw new Error("トーナメントを開始する権限がありません");
    }

    if (tournament.status !== "waiting") {
      throw new Error("このトーナメントは既に開始されています");
    }

    if (tournament.participants.length < 2) {
      throw new Error("トーナメントには最低2名の参加者が必要です");
    }

    // ブラケット生成
    const bracketResult = this.bracketService.generateBracket(
      tournament.participants,
      tournamentId
    );

    // データベースにブラケットを保存
    for (const match of bracketResult.matches) {
      await db.insert(tournamentMatch).values({
        id: match.id,
        tournamentId: match.tournamentId,
        round: match.round,
        matchNumber: match.matchNumber,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        status: match.status,
        createdAt: match.createdAt,
      });
    }

    // トーナメント状態を更新
    await db
      .update(tournamentTable)
      .set({
        status: "in_progress",
        startedAt: Date.now(),
      })
      .where(eq(tournamentTable.id, tournamentId));

    return bracketResult.matches;
  }

  /**
   * 試合結果を記録
   */
  public async recordMatchResult(
    tournamentId: string,
    matchId: string,
    player1Score: number,
    player2Score: number,
    winnerId: string
  ): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error("トーナメントが見つかりません");
    }

    const bracketMatch = tournament.bracket.find(m => m.id === matchId);
    if (!bracketMatch) {
      throw new Error("試合が見つかりません");
    }

    if (!bracketMatch.player1Id || !bracketMatch.player2Id) {
      throw new Error("無効な試合です");
    }

    // 実際の試合記録をmatchテーブルに保存
    const gameMatchId = uuidv4();
    await db.insert(matchTable).values({
      id: gameMatchId,
      player1Id: bracketMatch.player1Id,
      player2Id: bracketMatch.player2Id,
      player1Score,
      player2Score,
      winnerId,
      matchType: "tournament",
      gameRoomId: bracketMatch.gameRoomId || "",
      playedAt: Date.now(),
    });

    // tournamentMatchテーブルを更新
    await db
      .update(tournamentMatch)
      .set({
        matchId: gameMatchId,
        status: "completed",
      })
      .where(eq(tournamentMatch.id, matchId));

    // 敗者の状態を更新
    const loserId = bracketMatch.player1Id === winnerId ? bracketMatch.player2Id : bracketMatch.player1Id;
    await db
      .update(tournamentParticipant)
      .set({ status: "lost" })
      .where(
        and(
          eq(tournamentParticipant.tournamentId, tournamentId),
          eq(tournamentParticipant.userId, loserId)
        )
      );

    // ブラケットを更新
    const winnerName = tournament.participants.find(p => p.userId === winnerId)?.userName || "";
    const updatedBracket = this.bracketService.updateBracketAfterMatch(
      tournament.bracket,
      bracketMatch,
      winnerId,
      winnerName
    );

    // 優勝者が決まったかチェック
    const finalistId = this.bracketService.getFinalist(updatedBracket);
    if (finalistId) {
      await this.completeTournament(tournamentId, finalistId);
    }
  }

  /**
   * トーナメント完了
   */
  private async completeTournament(tournamentId: string, winnerId: string): Promise<void> {
    await db
      .update(tournamentTable)
      .set({
        status: "completed",
        completedAt: Date.now(),
      })
      .where(eq(tournamentTable.id, tournamentId));

    // 優勝者の状態を更新
    await db
      .update(tournamentParticipant)
      .set({
        status: "won",
        finalRank: 1,
      })
      .where(
        and(
          eq(tournamentParticipant.tournamentId, tournamentId),
          eq(tournamentParticipant.userId, winnerId)
        )
      );
  }

  /**
   * トーナメント情報を取得
   */
  public async getTournament(tournamentId: string): Promise<Tournament | null> {
    const tournaments = await db
      .select()
      .from(tournamentTable)
      .where(eq(tournamentTable.id, tournamentId));

    const tournament = tournaments[0];
    if (!tournament) {
      return null;
    }

    // 参加者情報を取得
    const participantsData = await db
      .select({
        userId: tournamentParticipant.userId,
        status: tournamentParticipant.status,
        finalRank: tournamentParticipant.finalRank,
        joinedAt: tournamentParticipant.joinedAt,
        userName: user.name,
        userImage: user.image,
      })
      .from(tournamentParticipant)
      .leftJoin(user, eq(tournamentParticipant.userId, user.id))
      .where(eq(tournamentParticipant.tournamentId, tournamentId));

    const participants: TournamentParticipant[] = participantsData.map(p => ({
      userId: p.userId,
      userName: p.userName || "Unknown",
      userImage: p.userImage || undefined,
      status: p.status as any,
      finalRank: p.finalRank || undefined,
      joinedAt: p.joinedAt,
    }));

    // ブラケット情報を取得
    const bracketData = await db
      .select()
      .from(tournamentMatch)
      .where(eq(tournamentMatch.tournamentId, tournamentId));

    const bracket: BracketMatch[] = bracketData.map(m => ({
      id: m.id,
      tournamentId: m.tournamentId,
      matchId: m.matchId || undefined,
      round: m.round,
      matchNumber: m.matchNumber,
      player1Id: m.player1Id || undefined,
      player2Id: m.player2Id || undefined,
      player1Name: participants.find(p => p.userId === m.player1Id)?.userName,
      player2Name: participants.find(p => p.userId === m.player2Id)?.userName,
      status: m.status as any,
      createdAt: m.createdAt,
    }));

    return {
      id: tournament.id,
      name: tournament.name,
      hostId: tournament.hostId,
      status: tournament.status as any,
      maxPlayers: tournament.maxPlayers,
      createdAt: tournament.createdAt,
      startedAt: tournament.startedAt || undefined,
      completedAt: tournament.completedAt || undefined,
      participants,
      bracket,
    };
  }

  /**
   * トーナメントルームを取得または作成
   */
  public getTournamentRoom(tournamentId: string): TournamentRoom {
    let room = this.tournamentRooms.get(tournamentId);
    if (!room) {
      room = {
        tournament: {} as Tournament, // 後で更新される
        connections: new Map(),
        chatMessages: [],
      };
      this.tournamentRooms.set(tournamentId, room);
    }
    return room;
  }

  /**
   * チャットメッセージを追加
   */
  public addChatMessage(
    tournamentId: string,
    userId: string,
    userName: string,
    message: string
  ): TournamentChatMessage {
    const room = this.getTournamentRoom(tournamentId);
    const chatMessage: TournamentChatMessage = {
      id: uuidv4(),
      userId,
      userName,
      message,
      timestamp: Date.now(),
    };

    room.chatMessages.push(chatMessage);

    // 最新の50件のみ保持
    if (room.chatMessages.length > 50) {
      room.chatMessages = room.chatMessages.slice(-50);
    }

    return chatMessage;
  }

  /**
   * 次に実行可能な試合を取得
   */
  public getNextAvailableMatches(tournamentId: string): BracketMatch[] {
    const room = this.tournamentRooms.get(tournamentId);
    if (!room) return [];

    return this.bracketService.getNextAvailableMatches(room.tournament.bracket);
  }

  /**
   * 試合にゲームルームIDを設定
   */
  public async setMatchGameRoom(
    tournamentId: string,
    matchId: string,
    gameRoomId: string
  ): Promise<void> {
    await db
      .update(tournamentMatch)
      .set({ status: "in_progress" })
      .where(eq(tournamentMatch.id, matchId));

    // メモリ上のデータも更新
    const room = this.tournamentRooms.get(tournamentId);
    if (room) {
      const match = room.tournament.bracket.find(m => m.id === matchId);
      if (match) {
        match.gameRoomId = gameRoomId;
        match.status = "in_progress";
      }
    }
  }
}
