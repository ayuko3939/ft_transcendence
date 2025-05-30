import { db } from "../../db";
import { games, players } from "@ft-transcendence/shared";
import { TournamentService } from "../tournament/TournamentService";
import { notifyTournamentUpdate } from "../../routes/tournament/socket";
import type { GameRoom } from "../../types/game";

/**
 * ゲーム結果をデータベースに保存する共通関数
 * @param room ゲームルーム情報
 * @param endReason 終了理由 ('completed' | 'surrender' | 'disconnect')
 */
export async function saveGameResult(
  room: GameRoom,
  endReason: "completed" | "surrender" | "disconnect",
): Promise<void> {
  // 両プレイヤーのユーザーIDが存在することを確認
  const leftUserId = room.userIds.left;
  const rightUserId = room.userIds.right;

  if (!leftUserId || !rightUserId) {
    console.error("ユーザーIDが不足しているためゲーム結果を保存できません");
    return;
  }

  const currentTime = Date.now();
  const gameId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    // gamesテーブルにゲーム情報を保存
    await tx.insert(games).values({
      id: gameId,
      startedAt: currentTime - 60000, // 仮で1分前を開始時刻とする
      endedAt: currentTime,
      ballSpeed: room.settings.ballSpeed,
      winningScore: room.settings.winningScore,
      endReason: endReason,
      status: "completed",
    });

    // 左プレイヤーの結果を保存
    const leftResult = room.state.winner === "left" ? "win" : "lose";
    await tx.insert(players).values({
      id: crypto.randomUUID(),
      gameId: gameId,
      userId: leftUserId,
      side: "left",
      score: room.state.score.left,
      result: leftResult,
    });

    // 右プレイヤーの結果を保存
    const rightResult = room.state.winner === "right" ? "win" : "lose";
    await tx.insert(players).values({
      id: crypto.randomUUID(),
      gameId: gameId,
      userId: rightUserId,
      side: "right",
      score: room.state.score.right,
      result: rightResult,
    });
  });

  console.log(`ゲーム結果を保存しました: ${gameId}, 終了理由: ${endReason}`);
  
  // トーナメントマッチの場合は、トーナメントシステムに結果を反映
  if (room.tournamentMatchId && room.state.winner) {
    await handleTournamentMatchResult(room, gameId);
  }
}

/**
 * トーナメントマッチの結果をトーナメントシステムに反映
 */
async function handleTournamentMatchResult(
  room: GameRoom,
  gameId: string,
): Promise<void> {
  try {
    if (!room.tournamentMatchId || !room.state.winner) {
      return;
    }

    // 勝者のユーザーIDを取得
    const winnerId = room.state.winner === "left" 
      ? room.userIds.left 
      : room.userIds.right;

    if (!winnerId) {
      console.error("勝者のユーザーIDが見つかりません");
      return;
    }

    // トーナメントサービスで試合結果を処理
    const tournamentService = new TournamentService();
    await tournamentService.processMatchResult(
      room.tournamentMatchId,
      winnerId,
      gameId
    );

    // トーナメントの更新をWebSocket経由で通知
    if (room.tournamentId) {
      notifyTournamentUpdate(room.tournamentId);
    }

    console.log(`トーナメントマッチ結果を処理しました: ${room.tournamentMatchId}`);
  } catch (error) {
    console.error("トーナメントマッチ結果処理エラー:", error);
  }
}
