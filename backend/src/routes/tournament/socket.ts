import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { TournamentService } from "../../services/tournament/TournamentService";

// トーナメント待機室の接続を管理
const tournamentConnections = new Map<string, Set<WebSocket>>();

export default async function tournamentSocketRoute(fastify: FastifyInstance) {
  const tournamentService = new TournamentService();

  // トーナメント待機室のWebSocket接続
  fastify.get<{ Params: { tournamentId: string } }>(
    "/:tournamentId/ws",
    { websocket: true },
    (connection, req) => {
      const { tournamentId } = req.params;

      // 接続をトーナメントルームに追加
      if (!tournamentConnections.has(tournamentId)) {
        tournamentConnections.set(tournamentId, new Set());
      }
      tournamentConnections.get(tournamentId)!.add(connection);

      console.log(`トーナメント ${tournamentId} に接続しました`);

      // 接続時に現在の状態を送信
      sendTournamentUpdate(tournamentId, tournamentService);

      // メッセージハンドラー
      connection.on("message", async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          switch (data.type) {
            case "join":
              await handleJoinTournament(data, tournamentId, tournamentService);
              break;
            case "start":
              await handleStartTournament(
                data,
                tournamentId,
                tournamentService
              );
              break;
            case "chat":
              handleTournamentChat(data, tournamentId);
              break;
            default:
              console.log(`Unknown message type: ${data.type}`);
          }
        } catch (error) {
          console.error("トーナメントWebSocketメッセージ処理エラー:", error);
        }
      });

      // 接続終了時のクリーンアップ
      connection.on("close", () => {
        const connections = tournamentConnections.get(tournamentId);
        if (connections) {
          connections.delete(connection);
          if (connections.size === 0) {
            tournamentConnections.delete(tournamentId);
          }
        }
        console.log(`トーナメント ${tournamentId} から切断しました`);
      });
    }
  );
}

/**
 * トーナメント参加処理
 */
async function handleJoinTournament(
  data: any,
  tournamentId: string,
  tournamentService: TournamentService
) {
  try {
    const { userId } = data;
    await tournamentService.joinTournament(tournamentId, userId);

    // 全員に更新を通知
    await sendTournamentUpdate(tournamentId, tournamentService);
  } catch (error) {
    console.error("トーナメント参加エラー:", error);
    // エラーを特定の接続に送信する実装は後で追加
  }
}

/**
 * トーナメント開始処理
 */
async function handleStartTournament(
  data: any,
  tournamentId: string,
  tournamentService: TournamentService
) {
  try {
    const { creatorId } = data;
    await tournamentService.startTournament(tournamentId, creatorId);

    // 全員に更新を通知
    await sendTournamentUpdate(tournamentId, tournamentService);
  } catch (error) {
    console.error("トーナメント開始エラー:", error);
  }
}

/**
 * トーナメントチャット処理
 */
function handleTournamentChat(data: any, tournamentId: string) {
  const { name, message } = data;

  const chatMessage = JSON.stringify({
    type: "chat",
    name,
    message,
    timestamp: Date.now(),
  });

  // トーナメント内の全員にチャットを送信
  broadcastToTournament(tournamentId, chatMessage);
}

/**
 * トーナメント状態更新を全員に送信
 */
async function sendTournamentUpdate(
  tournamentId: string,
  tournamentService: TournamentService
) {
  try {
    const tournament =
      await tournamentService.getTournamentWithDetails(tournamentId);
    if (!tournament) return;

    const updateMessage = JSON.stringify({
      type: "tournamentUpdate",
      tournament,
    });
    console.log(
      `トーナメント ${tournamentId} の状態を更新: ${JSON.stringify(tournament)}`
    );
    broadcastToTournament(tournamentId, updateMessage);
  } catch (error) {
    console.error("トーナメント状態更新送信エラー:", error);
  }
}

/**
 * トーナメント内の全員にメッセージをブロードキャスト
 */
function broadcastToTournament(tournamentId: string, message: string) {
  const connections = tournamentConnections.get(tournamentId);
  if (!connections) return;

  connections.forEach((connection) => {
    try {
      if (connection.readyState === connection.OPEN) {
        connection.send(message);
      }
    } catch (error) {
      console.error("メッセージ送信エラー:", error);
    }
  });
}

/**
 * 外部からトーナメント更新を送信するための関数をエクスポート
 */
export function notifyTournamentUpdate(tournamentId: string) {
  const tournamentService = new TournamentService();
  sendTournamentUpdate(tournamentId, tournamentService);
}
