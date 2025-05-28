import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { db } from "@/api/db";
import { and, desc, eq, ne } from "drizzle-orm";
import { games, players, user } from "drizzle/schema";
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = page * limit;

    // 自分の参加したゲームを取得
    const myGames = await db
      .select({
        gameId: games.id,
        date: games.endedAt,
        ballSpeed: games.ballSpeed,
        winningScore: games.winningScore,
        endReason: games.endReason,
        myScore: players.score,
        myResult: players.result,
        mySide: players.side,
      })
      .from(games)
      .innerJoin(players, eq(games.id, players.gameId))
      .where(eq(players.userId, session.user.id))
      .orderBy(desc(games.endedAt))
      .limit(limit)
      .offset(offset);

    // 各ゲームの相手プレイヤー情報を取得
    const matchHistory = await Promise.all(
      myGames.map(async (game) => {
        // 相手プレイヤーの情報を取得
        const opponentInfo = await db
          .select({
            score: players.score,
            name: user.name,
          })
          .from(players)
          .innerJoin(user, eq(players.userId, user.id))
          .where(
            and(
              eq(players.gameId, game.gameId),
              ne(players.userId, session.user.id),
            ),
          )
          .limit(1);

        const opponent = opponentInfo[0];

        return {
          id: game.gameId,
          date: new Date(game.date || 0).toISOString().split("T")[0],
          opponent: opponent?.name || "Unknown",
          playerScore: game.myScore,
          opponentScore: opponent?.score || 0,
          result: game.myResult,
          gameSettings: {
            ballSpeed: game.ballSpeed,
            winningScore: game.winningScore,
          },
          endReason: game.endReason,
        };
      }),
    );

    return NextResponse.json({
      matches: matchHistory,
      page,
      limit,
      hasMore: matchHistory.length === limit,
    });
  } catch (error) {
    console.error("対戦履歴取得エラー:", error);
    return NextResponse.json(
      { error: "対戦履歴の取得中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
