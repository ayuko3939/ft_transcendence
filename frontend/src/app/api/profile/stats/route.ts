import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { db } from "@/api/db";
import { players } from "@ft-transcendence/shared";
import { count, eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { logApiRequest, logApiError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      logApiRequest(request.method, request.nextUrl.pathname, 401);
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    // 基本統計を取得
    const basicStats = await db
      .select({
        totalGames: count(),
        wins: sql<number>`SUM(CASE WHEN ${players.result} = 'win' THEN 1 ELSE 0 END)`,
        losses: sql<number>`SUM(CASE WHEN ${players.result} = 'lose' THEN 1 ELSE 0 END)`,
      })
      .from(players)
      .where(eq(players.userId, session.user.id));

    const stats = basicStats[0];
    const totalGames = stats.totalGames || 0;
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const winRate =
      totalGames > 0 ? Math.round((wins / totalGames) * 100 * 10) / 10 : 0;

    // 連勝記録を計算（簡易版）
    const recentGames = await db
      .select({
        result: players.result,
      })
      .from(players)
      .where(eq(players.userId, session.user.id))
      .orderBy(sql`${players.createdAt} DESC`)
      .limit(20);

    // 現在の連勝数を計算
    let currentStreak = 0;
    for (const game of recentGames) {
      if (game.result === "win") {
        currentStreak++;
      } else {
        break;
      }
    }

    // 最長連勝記録を計算（簡易版）
    let longestStreak = 0;
    let streak = 0;
    for (const game of recentGames.reverse()) {
      if (game.result === "win") {
        streak++;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        streak = 0;
      }
    }

    logApiRequest(request.method, request.nextUrl.pathname, 200, session.user.id);
    return NextResponse.json({
      totalGames,
      wins,
      losses,
      winRate,
      currentStreak,
      longestStreak,
    });
  } catch (error) {
    logApiError(request.method, request.nextUrl.pathname, error instanceof Error ? error : new Error(String(error)));
    console.error("統計情報取得エラー:", error);
    return NextResponse.json(
      { error: "統計情報の取得中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
