import { db } from "../../db";
import {
  tournaments,
  tournamentParticipants,
  tournamentMatches,
  user,
} from "@ft-transcendence/shared";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createTournamentGameRoom } from "../game/roomUtils";
import { gameRooms } from "../game/index";
import type {
  Tournament,
  TournamentWithDetails,
  CreateTournamentRequest,
  TournamentParticipant,
  TournamentMatch,
} from "@ft-transcendence/shared";

export class TournamentService {
  /**
   * 利用可能なトーナメントと参加中のトーナメントを取得
   */
  async getTournamentsForUser(userId: string): Promise<{
    availableTournaments: TournamentWithDetails[];
    participatingTournaments: TournamentWithDetails[];
  }> {
    // 利用可能なトーナメント（waiting状態）
    const availableTournaments = await this.getAvailableTournaments();

    // 参加中のトーナメント（in_progress状態で自分が参加しているもの）
    const participatingQuery = await db
      .select()
      .from(tournaments)
      .innerJoin(
        tournamentParticipants,
        eq(tournaments.id, tournamentParticipants.tournamentId),
      )
      .where(
        and(
          eq(tournaments.status, "in_progress"),
          eq(tournamentParticipants.userId, userId),
          eq(tournamentParticipants.status, "active"),
        ),
      );

    const participatingTournaments = await Promise.all(
      participatingQuery.map(async ({ tournaments: tournament }) => {
        const details = await this.getTournamentWithDetails(tournament.id);
        return details!;
      }),
    );

    return {
      availableTournaments,
      participatingTournaments,
    };
  }
  /**
   * 新しいトーナメントを作成
   */
  async createTournament(
    request: CreateTournamentRequest,
    creatorId: string,
  ): Promise<Tournament> {
    const tournamentId = crypto.randomUUID();
    const now = Date.now();

    // トーナメントを作成
    await db.insert(tournaments).values({
      id: tournamentId,
      name: request.name,
      creatorId: creatorId,
      maxParticipants: request.maxParticipants,
      status: "waiting",
      currentRound: 0,
      createdAt: now,
    });

    // 作成者を自動的に参加者として追加
    await db.insert(tournamentParticipants).values({
      id: crypto.randomUUID(),
      tournamentId: tournamentId,
      userId: creatorId,
      status: "active",
      joinedAt: now,
    });

    return {
      id: tournamentId,
      name: request.name,
      creatorId: creatorId,
      status: "waiting",
      maxParticipants: request.maxParticipants,
      currentRound: 0,
      createdAt: now,
    };
  }

  /**
   * トーナメントに参加
   */
  async joinTournament(tournamentId: string, userId: string): Promise<boolean> {
    // トーナメントの存在確認
    const tournament = await this.getTournamentById(tournamentId);
    if (!tournament) {
      throw new Error("トーナメントが見つかりません");
    }

    if (tournament.status !== "waiting") {
      throw new Error("このトーナメントは参加受付を終了しています");
    }

    // 既に参加しているかチェック
    const existingParticipant = await db
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, userId),
        ),
      )
      .limit(1);

    if (existingParticipant.length > 0) {
      throw new Error("既にこのトーナメントに参加しています");
    }

    // 現在の参加者数をチェック
    const participantCount = await db
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId));

    if (participantCount.length >= tournament.maxParticipants) {
      throw new Error("トーナメントの参加者数が上限に達しています");
    }

    // 参加者として追加
    await db.insert(tournamentParticipants).values({
      id: crypto.randomUUID(),
      tournamentId: tournamentId,
      userId: userId,
      status: "active",
      joinedAt: Date.now(),
    });

    return true;
  }

  /**
   * トーナメントを開始（ブラケット生成）
   */
  async startTournament(
    tournamentId: string,
    creatorId: string,
  ): Promise<void> {
    const tournament = await this.getTournamentById(tournamentId);
    if (!tournament) {
      throw new Error("トーナメントが見つかりません");
    }

    if (tournament.creatorId !== creatorId) {
      throw new Error("トーナメントを開始する権限がありません");
    }

    if (tournament.status !== "waiting") {
      throw new Error("このトーナメントは既に開始されています");
    }

    // 参加者を取得
    const participants = await db
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId));

    if (participants.length < 2) {
      throw new Error("トーナメントを開始するには最低2人の参加者が必要です");
    }

    // トーナメント状態を更新
    await db
      .update(tournaments)
      .set({
        status: "in_progress",
        startedAt: Date.now(),
        currentRound: 1,
      })
      .where(eq(tournaments.id, tournamentId));

    // 第1ラウンドの試合を生成
    await this.generateRoundMatches(tournamentId, participants, 1);
  }

  /**
   * ラウンドの試合を生成
   */
  private async generateRoundMatches(
    tournamentId: string,
    participants: any[],
    round: number,
  ): Promise<void> {
    // 参加者をシャッフル
    const shuffledParticipants = [...participants].sort(
      () => Math.random() - 0.5,
    );

    const matches: any[] = [];
    let matchNumber = 1;

    // ペアを作成
    for (let i = 0; i < shuffledParticipants.length; i += 2) {
      if (i + 1 < shuffledParticipants.length) {
        const matchId = crypto.randomUUID();
        matches.push({
          id: matchId,
          tournamentId: tournamentId,
          round: round,
          matchNumber: matchNumber++,
          player1Id: shuffledParticipants[i].userId,
          player2Id: shuffledParticipants[i + 1].userId,
          status: "pending",
          scheduledAt: Date.now(),
        });
      }
    }

    // 試合をデータベースに保存
    if (matches.length > 0) {
      await db.insert(tournamentMatches).values(matches);
      // ゲームルームの作成は実際にプレイヤーが接続した時に行う
    }
  }

  /**
   * 試合用のゲームルームを作成
   */
  private createMatchGameRoom(tournamentId: string, matchId: string): string {
    const { roomId } = createTournamentGameRoom(
      tournamentId,
      matchId,
      gameRooms,
    );
    console.log(`トーナメント試合用ルーム作成: ${roomId} (試合ID: ${matchId})`);
    return roomId;
  }

  /**
   * トーナメント詳細を取得
   */
  async getTournamentWithDetails(
    tournamentId: string,
  ): Promise<TournamentWithDetails | null> {
    const tournament = await this.getTournamentById(tournamentId);
    if (!tournament) {
      return null;
    }

    // 参加者情報を取得（ユーザー名付き）
    const participantsWithUsersFromDB = await db
      .select({
        id: tournamentParticipants.id,
        tournamentId: tournamentParticipants.tournamentId,
        userId: tournamentParticipants.userId,
        status: tournamentParticipants.status,
        eliminatedRound: tournamentParticipants.eliminatedRound,
        joinedAt: tournamentParticipants.joinedAt,
        userName: user.name,
      })
      .from(tournamentParticipants)
      .innerJoin(user, eq(tournamentParticipants.userId, user.id))
      .where(eq(tournamentParticipants.tournamentId, tournamentId));

    // 現在のラウンドの試合を取得
    let currentMatches: TournamentMatch[] = [];
    if (tournament.status === "in_progress") {
      currentMatches = (await db
        .select()
        .from(tournamentMatches)
        .where(
          and(
            eq(tournamentMatches.tournamentId, tournamentId),
            eq(tournamentMatches.round, tournament.currentRound),
          ),
        )) as unknown as TournamentMatch[];
    }
    const participantsWithUsers: Array<
      TournamentParticipant & { userName: string }
    > = participantsWithUsersFromDB.map((item) => ({
      id: item.id,
      tournamentId: item.tournamentId,
      userId: item.userId,
      status: item.status as "active" | "eliminated" | "winner",
      eliminatedRound: item.eliminatedRound ?? undefined,
      joinedAt: item.joinedAt,
      userName: item.userName ?? "Unknown User",
    }));
    return {
      ...tournament,
      participants: participantsWithUsers,
      currentMatches,
    };
  }

  /**
   * すべてのトーナメントを取得（waiting状態のもの）
   */
  async getAvailableTournaments(): Promise<TournamentWithDetails[]> {
    const tournamentListFromDB = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.status, "waiting"))
      .orderBy(desc(tournaments.createdAt));

    if (tournamentListFromDB.length === 0) {
      return [];
    }
    const tournamentList: Tournament[] = tournamentListFromDB.map(
      (tournament) => ({
        id: tournament.id,
        name: tournament.name,
        creatorId: tournament.creatorId,
        status: tournament.status as
          | "waiting"
          | "in_progress"
          | "completed"
          | "cancelled",
        maxParticipants: tournament.maxParticipants,
        currentRound: tournament.currentRound,
        winnerId: tournament.winnerId ?? undefined,
        createdAt: tournament.createdAt,
        startedAt: tournament.startedAt ?? undefined,
        endedAt: tournament.endedAt ?? undefined,
      }),
    );

    // 全トーナメントの参加者を一度に取得
    const allParticipantsFromDB = await db
      .select({
        id: tournamentParticipants.id,
        tournamentId: tournamentParticipants.tournamentId,
        userId: tournamentParticipants.userId,
        status: tournamentParticipants.status,
        eliminatedRound: tournamentParticipants.eliminatedRound,
        joinedAt: tournamentParticipants.joinedAt,
        userName: user.name,
      })
      .from(tournamentParticipants)
      .innerJoin(user, eq(tournamentParticipants.userId, user.id))
      .where(
        inArray(
          tournamentParticipants.tournamentId,
          tournamentList.map((t) => t.id),
        ),
      );

    // allParticipantsFromDB を適切な型に変換
    const allParticipants = allParticipantsFromDB.map((item) => ({
      id: item.id,
      tournamentId: item.tournamentId,
      userId: item.userId,
      status: item.status as "active" | "eliminated" | "winner",
      eliminatedRound: item.eliminatedRound ?? undefined,
      joinedAt: item.joinedAt,
      userName: item.userName ?? "Unknown User",
    }));

    // トーナメントIDでグループ化
    const participantsByTournament = allParticipants.reduce(
      (acc, participant) => {
        if (!acc[participant.tournamentId]) {
          acc[participant.tournamentId] = [];
        }
        acc[participant.tournamentId].push(participant);
        return acc;
      },
      {} as Record<string, typeof allParticipants>,
    );

    return tournamentList.map((tournament) => ({
      ...tournament,
      participants: participantsByTournament[tournament.id] || [],
      currentMatches: [], // waiting状態なので空配列
    }));
  }

  /**
   * 試合結果を処理し、次のラウンドを進行
   */
  async processMatchResult(
    matchId: string,
    winnerId: string,
    gameId: string,
  ): Promise<void> {
    // 試合情報を取得
    const match = await db
      .select()
      .from(tournamentMatches)
      .where(eq(tournamentMatches.id, matchId))
      .limit(1);

    if (match.length === 0) {
      throw new Error("試合が見つかりません");
    }

    const currentMatch = match[0];

    // 試合結果を更新
    await db
      .update(tournamentMatches)
      .set({
        winnerId: winnerId,
        gameId: gameId,
        status: "completed",
      })
      .where(eq(tournamentMatches.id, matchId));

    // 敗者を脱落状態に更新
    const loserId =
      currentMatch.player1Id === winnerId
        ? currentMatch.player2Id
        : currentMatch.player1Id;

    await db
      .update(tournamentParticipants)
      .set({
        status: "eliminated",
        eliminatedRound: currentMatch.round,
      })
      .where(
        and(
          eq(tournamentParticipants.tournamentId, currentMatch.tournamentId),
          eq(tournamentParticipants.userId, loserId),
        ),
      );

    // このラウンドのすべての試合が完了したかチェック
    await this.checkAndAdvanceRound(
      currentMatch.tournamentId,
      currentMatch.round,
    );
  }

  /**
   * ラウンド進行をチェックし、必要に応じて次のラウンドを開始
   */
  private async checkAndAdvanceRound(
    tournamentId: string,
    round: number,
  ): Promise<void> {
    // このラウンドの試合をすべて取得
    const roundMatches = await db
      .select()
      .from(tournamentMatches)
      .where(
        and(
          eq(tournamentMatches.tournamentId, tournamentId),
          eq(tournamentMatches.round, round),
        ),
      );

    const completedMatches = roundMatches.filter(
      (match) => match.status === "completed",
    );

    // すべての試合が完了していない場合は何もしない
    if (completedMatches.length !== roundMatches.length) {
      return;
    }

    // 勝者を取得
    const winners = completedMatches
      .map((match) => match.winnerId)
      .filter(Boolean);

    if (winners.length === 1) {
      // 優勝者決定
      await db
        .update(tournaments)
        .set({
          status: "completed",
          winnerId: winners[0],
          endedAt: Date.now(),
        })
        .where(eq(tournaments.id, tournamentId));

      // 優勝者のステータスを更新
      await db
        .update(tournamentParticipants)
        .set({ status: "winner" })
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournamentId),
            eq(tournamentParticipants.userId, winners[0] ?? ""),
          ),
        );
    } else if (winners.length > 1) {
      // 次のラウンドを開始
      const nextRound = round + 1;

      await db
        .update(tournaments)
        .set({ currentRound: nextRound })
        .where(eq(tournaments.id, tournamentId));

      // 勝者情報を参加者形式に変換
      const nextRoundParticipants = winners.map((winnerId) => ({
        userId: winnerId,
      }));
      await this.generateRoundMatches(
        tournamentId,
        nextRoundParticipants,
        nextRound,
      );
    }
  }

  /**
   * マッチ詳細を取得
   */
  async getMatchDetails(matchId: string): Promise<{
    id: string;
    tournamentId: string;
    round: number;
    matchNumber: number;
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    status: "pending" | "in_progress" | "completed";
    gameRoomId?: string;
  } | null> {
    // マッチ情報を取得
    const matchResult = await db
      .select({
        id: tournamentMatches.id,
        tournamentId: tournamentMatches.tournamentId,
        round: tournamentMatches.round,
        matchNumber: tournamentMatches.matchNumber,
        player1Id: tournamentMatches.player1Id,
        player2Id: tournamentMatches.player2Id,
        status: tournamentMatches.status,
      })
      .from(tournamentMatches)
      .where(eq(tournamentMatches.id, matchId))
      .limit(1);

    if (matchResult.length === 0) {
      return null;
    }

    const match = matchResult[0];

    // プレイヤー名を取得
    const [player1, player2] = await Promise.all([
      db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, match.player1Id))
        .limit(1),
      db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, match.player2Id))
        .limit(1),
    ]);

    return {
      id: match.id,
      tournamentId: match.tournamentId,
      round: match.round,
      matchNumber: match.matchNumber,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1Name: player1[0]?.name || "Unknown Player",
      player2Name: player2[0]?.name || "Unknown Player",
      status: match.status as "pending" | "in_progress" | "completed",
    };
  }

  /**
   * 試合状態を更新
   */
  async updateMatchStatus(
    matchId: string,
    status: "pending" | "in_progress" | "completed",
  ): Promise<void> {
    await db
      .update(tournamentMatches)
      .set({ status })
      .where(eq(tournamentMatches.id, matchId));
  }

  /**
   * 特定の試合のゲームルームIDを取得
   */
  async getMatchGameRoomId(matchId: string): Promise<string | null> {
    // gameRoomsから該当するルームを検索
    for (const [roomId, room] of gameRooms.entries()) {
      if (room.tournamentMatchId === matchId) {
        return roomId;
      }
    }
    return null;
  }

  /**
   * IDでトーナメントを取得
   */
  private async getTournamentById(
    tournamentId: string,
  ): Promise<Tournament | null> {
    const result = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1)
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          creatorId: row.creatorId,
          status: row.status as
            | "waiting"
            | "in_progress"
            | "completed"
            | "cancelled",
          maxParticipants: row.maxParticipants,
          currentRound: row.currentRound,
          winnerId: row.winnerId ?? undefined,
          createdAt: row.createdAt,
          startedAt: row.startedAt ?? undefined,
          endedAt: row.endedAt ?? undefined,
        })),
      );

    return result.length > 0 ? result[0] : null;
  }
}
