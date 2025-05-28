import { db } from "../../db";
import { games, players } from "../../../drizzle/schema";
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
}
