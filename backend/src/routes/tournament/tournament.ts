import type { FastifyInstance } from "fastify";
import { TournamentService } from "../../services/tournament/TournamentService";
import type {
  CreateTournamentRequest,
  JoinTournamentRequest,
  StartTournamentRequest,
} from "@ft-transcendence/shared";

export default async function tournamentRoutes(fastify: FastifyInstance) {
  const tournamentService = new TournamentService();

  // 利用可能なトーナメント一覧を取得
  fastify.get("/", async (request, reply) => {
    try {
      const tournaments = await tournamentService.getAvailableTournaments();
      return { tournaments };
    } catch (error) {
      fastify.log.error(`トーナメント一覧取得エラー: ${error}`);
      return reply.status(500).send({
        error: "トーナメント一覧の取得中にエラーが発生しました",
      });
    }
  });

  // 新しいトーナメントを作成
  fastify.post<{ Body: CreateTournamentRequest & { creatorId: string } }>(
    "/",
    async (request, reply) => {
      try {
        const { name, maxParticipants, creatorId } = request.body;

        if (!name || !maxParticipants || !creatorId) {
          return reply.status(400).send({
            error: "必須パラメータが不足しています",
          });
        }

        if (maxParticipants < 2 || maxParticipants > 16) {
          return reply.status(400).send({
            error: "参加者数は2人以上16人以下で設定してください",
          });
        }

        const tournament = await tournamentService.createTournament(
          { name, maxParticipants },
          creatorId,
        );

        return { tournament };
      } catch (error) {
        fastify.log.error(`トーナメント作成エラー: ${error}`);
        return reply.status(500).send({
          error: "トーナメントの作成中にエラーが発生しました",
        });
      }
    },
  );

  // 特定のトーナメントの詳細を取得
  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const tournament = await tournamentService.getTournamentWithDetails(id);

      if (!tournament) {
        return reply.status(404).send({
          error: "トーナメントが見つかりません",
        });
      }

      return { tournament };
    } catch (error) {
      fastify.log.error(`トーナメント詳細取得エラー: ${error}`);
      return reply.status(500).send({
        error: "トーナメント詳細の取得中にエラーが発生しました",
      });
    }
  });

  // トーナメントを開始
  fastify.post<{
    Params: { id: string };
    Body: { creatorId: string };
  }>("/:id/start", async (request, reply) => {
    try {
      const { id } = request.params;
      const { creatorId } = request.body;

      if (!creatorId) {
        return reply.status(400).send({
          error: "作成者IDが必要です",
        });
      }

      await tournamentService.startTournament(id, creatorId);
      return { success: true, message: "トーナメントを開始しました" };
    } catch (error) {
      fastify.log.error(`トーナメント開始エラー: ${error}`);

      return reply.status(400).send({
        error:
          error instanceof Error
            ? error.message
            : "トーナメント開始中にエラーが発生しました",
      });
    }
  });

  // マッチ詳細を取得
  fastify.get<{ Params: { matchId: string } }>(
    "/matches/:matchId",
    async (request, reply) => {
      try {
        const { matchId } = request.params;
        const matchDetails = await tournamentService.getMatchDetails(matchId);

        if (!matchDetails) {
          return reply.status(404).send({
            error: "マッチが見つかりません",
          });
        }

        return { match: matchDetails };
      } catch (error) {
        fastify.log.error(`マッチ詳細取得エラー: ${error}`);
        return reply.status(500).send({
          error: "マッチ詳細の取得中にエラーが発生しました",
        });
      }
    },
  );

  // 試合結果を報告
  fastify.post<{
    Params: { matchId: string };
    Body: { winnerId: string; gameId: string };
  }>("/matches/:matchId/result", async (request, reply) => {
    try {
      const { matchId } = request.params;
      const { winnerId, gameId } = request.body;

      if (!winnerId || !gameId) {
        return reply.status(400).send({
          error: "勝者IDとゲームIDが必要です",
        });
      }

      await tournamentService.processMatchResult(matchId, winnerId, gameId);
      return { success: true, message: "試合結果を処理しました" };
    } catch (error) {
      fastify.log.error(`試合結果処理エラー: ${error}`);

      return reply.status(400).send({
        error:
          error instanceof Error
            ? error.message
            : "試合結果処理中にエラーが発生しました",
      });
    }
  });
}
