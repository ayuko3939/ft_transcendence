import { db } from "../../db";
import { games, players, user } from "@ft-transcendence/shared";
import { TournamentService } from "../tournament/TournamentService";
import { notifyTournamentUpdate } from "../../routes/tournament/socket";
import type { GameRoom } from "../../types/game";
import { eq } from "drizzle-orm";

/**
 * ユーザーIDが有効かどうかを検証する
 * @param userId 検証するユーザーID
 * @returns ユーザーが存在する場合はtrue
 */
async function validateUserId(userId: string): Promise<boolean> {
  try {
    const userExists = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    
    return userExists.length > 0;
  } catch (error) {
    console.error(`ユーザーID検証エラー (${userId}):`, error);
    return false;
  }
}

/**
 * ゲーム結果をデータベースに保存する共通関数
 * @param room ゲームルーム情報
 * @param endReason 終了理由 ('completed' | 'surrender' | 'disconnect')
 */
export async function saveGameResult(
  room: GameRoom,
  endReason: "completed" | "surrender" | "disconnect",
): Promise<void> {
  try {
    // 入力値の基本バリデーション
    const leftUserId = room.userIds.left;
    const rightUserId = room.userIds.right;

    if (!leftUserId || !rightUserId) {
      console.error("ゲーム結果保存エラー: ユーザーIDが不足しています", {
        leftUserId,
        rightUserId,
        roomId: room.id
      });
      return;
    }

    // ユーザーIDの形式検証（UUIDの基本チェック）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(leftUserId) || !uuidRegex.test(rightUserId)) {
      console.error("ゲーム結果保存エラー: 無効なユーザーID形式", {
        leftUserId,
        rightUserId,
        roomId: room.id
      });
      return;
    }

    // データベースでユーザーの存在を確認
    console.log("ユーザー存在確認中...", { leftUserId, rightUserId });
    const [leftUserExists, rightUserExists] = await Promise.all([
      validateUserId(leftUserId),
      validateUserId(rightUserId)
    ]);

    if (!leftUserExists) {
      console.error("ゲーム結果保存エラー: 左プレイヤーが存在しません", {
        leftUserId,
        roomId: room.id
      });
      return;
    }

    if (!rightUserExists) {
      console.error("ゲーム結果保存エラー: 右プレイヤーが存在しません", {
        rightUserId,
        roomId: room.id
      });
      return;
    }

    // ゲームデータの妥当性検証
    if (!room.state || !room.state.score) {
      console.error("ゲーム結果保存エラー: ゲーム状態が無効です", {
        roomId: room.id,
        state: room.state
      });
      return;
    }

    if (!room.settings || !room.settings.ballSpeed || !room.settings.winningScore) {
      console.error("ゲーム結果保存エラー: ゲーム設定が無効です", {
        roomId: room.id,
        settings: room.settings
      });
      return;
    }

    const currentTime = Date.now();
    const gameId = crypto.randomUUID();

    console.log("データベーストランザクション開始...", { gameId });

    await db.transaction(async (tx) => {
      try {
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

        console.log("ゲーム結果の保存が完了しました", {
          gameId,
          leftUserId,
          rightUserId,
          endReason,
          winner: room.state.winner
        });

      } catch (dbError) {
        console.error("データベーストランザクションエラー:", {
          error: dbError,
          gameId,
          leftUserId,
          rightUserId,
          endReason
        });
        throw dbError; // トランザクションをロールバック
      }
    });

    // トーナメントマッチの場合は、トーナメントシステムに結果を反映
    if (room.tournamentMatchId && room.state.winner) {
      await handleTournamentMatchResult(room, gameId);
    }

  } catch (error) {
    console.error("ゲーム結果保存中に予期しないエラーが発生しました:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      roomId: room.id,
      leftUserId: room.userIds.left,
      rightUserId: room.userIds.right,
      endReason
    });
    
    // エラーを再スローせず、ログに記録のみ（ゲームの進行を妨げない）
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
    // 入力データの妥当性検証
    if (!room.tournamentMatchId || !room.state.winner) {
      console.warn("トーナメントマッチ結果処理をスキップ: 必要なデータが不足", {
        tournamentMatchId: room.tournamentMatchId,
        winner: room.state.winner,
        gameId
      });
      return;
    }

    // 勝者のユーザーIDを取得と検証
    const winnerId =
      room.state.winner === "left" ? room.userIds.left : room.userIds.right;

    if (!winnerId) {
      console.error("トーナメントマッチ結果処理エラー: 勝者のユーザーIDが見つかりません", {
        winner: room.state.winner,
        leftUserId: room.userIds.left,
        rightUserId: room.userIds.right,
        tournamentMatchId: room.tournamentMatchId,
        gameId
      });
      return;
    }

    // UUIDの形式検証
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(winnerId)) {
      console.error("トーナメントマッチ結果処理エラー: 無効な勝者ID形式", {
        winnerId,
        tournamentMatchId: room.tournamentMatchId,
        gameId
      });
      return;
    }

    // 勝者がデータベースに存在するか確認
    const winnerExists = await validateUserId(winnerId);
    if (!winnerExists) {
      console.error("トーナメントマッチ結果処理エラー: 勝者がデータベースに存在しません", {
        winnerId,
        tournamentMatchId: room.tournamentMatchId,
        gameId
      });
      return;
    }

    console.log("トーナメントマッチ結果処理開始", {
      tournamentMatchId: room.tournamentMatchId,
      winnerId,
      gameId
    });

    // トーナメントサービスで試合結果を処理
    const tournamentService = new TournamentService();
    await tournamentService.processMatchResult(
      room.tournamentMatchId,
      winnerId,
      gameId,
    );

    // トーナメントの更新をWebSocket経由で通知
    if (room.tournamentId) {
      try {
        notifyTournamentUpdate(room.tournamentId);
        console.log("トーナメント更新通知を送信しました", {
          tournamentId: room.tournamentId,
          gameId
        });
      } catch (notificationError) {
        console.error("トーナメント更新通知エラー:", {
          error: notificationError,
          tournamentId: room.tournamentId,
          gameId
        });
        // 通知エラーは処理を停止しない
      }
    }

    console.log("トーナメントマッチ結果処理完了", {
      tournamentMatchId: room.tournamentMatchId,
      winnerId,
      gameId
    });

  } catch (error) {
    console.error("トーナメントマッチ結果処理中に予期しないエラーが発生しました:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      tournamentMatchId: room.tournamentMatchId,
      tournamentId: room.tournamentId,
      gameId,
      winnerId: room.state.winner === "left" ? room.userIds.left : room.userIds.right
    });
    
    // エラーを再スローせず、ログに記録のみ（ゲームの進行を妨げない）
  }
}
