import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { db } from "@/api/db";
import { friends, user } from "@ft-transcendence/shared";
import { eq, sql, and } from "drizzle-orm";
import { getServerSession } from "next-auth";

const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5分

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    const currentTime = Date.now();
    const friendsList = await db
      .select({
        id: friends.friendId,
        name: user.name,
        image: user.image,
        isOnline: sql<boolean>`
          CASE 
            WHEN ${user.lastActivity} > ${currentTime - ONLINE_THRESHOLD} 
            THEN 1 
            ELSE 0 
          END
        `,
      })
      .from(friends)
      .innerJoin(user, eq(friends.friendId, user.id))
      .where(eq(friends.userId, session.user.id));

    return NextResponse.json({
      friends: friendsList,
    });
  } catch (error) {
    console.error("友達一覧取得エラー:", error);
    return NextResponse.json(
      { error: "友達一覧の取得中にエラーが発生しました" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json(
        { error: "友達IDが必要です" },
        { status: 400 },
      );
    }

    if (friendId === session.user.id) {
      return NextResponse.json(
        { error: "自分自身を友達に追加することはできません" },
        { status: 400 },
      );
    }

    // 友達が存在するかチェック
    const targetUser = await db
      .select()
      .from(user)
      .where(eq(user.id, friendId))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json(
        { error: "指定されたユーザーが見つかりません" },
        { status: 404 },
      );
    }

    // 既に友達かチェック
    const existingFriend = await db
      .select()
      .from(friends)
      .where(and(
        eq(friends.userId, session.user.id),
        eq(friends.friendId, friendId)
      ))
      .limit(1);

    if (existingFriend.length > 0) {
      return NextResponse.json(
        { error: "既に友達です" },
        { status: 400 },
      );
    }

    // 友達追加
    await db.insert(friends).values({
      userId: session.user.id,
      friendId: friendId,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("友達追加エラー:", error);
    return NextResponse.json(
      { error: "友達追加中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
