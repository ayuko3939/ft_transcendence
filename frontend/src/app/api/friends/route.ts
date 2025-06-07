import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { db } from "@/api/db";
import { friends, user } from "@ft-transcendence/shared";
import { eq, sql, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { logApiRequest, logApiError } from "@/lib/logger";

const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5分

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

    logApiRequest(request.method, request.nextUrl.pathname, 200, session.user.id);
    return NextResponse.json({
      friends: friendsList,
    });
  } catch (error) {
    logApiError(request.method, request.nextUrl.pathname, error instanceof Error ? error : new Error(String(error)));
    console.error("友達一覧取得エラー:", error);
    return NextResponse.json(
      { error: "友達一覧の取得中にエラーが発生しました" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let session;
  try {
    console.log("友達追加API開始");
    session = await getServerSession(authOptions);
    console.log("セッション取得:", session?.user?.id);
    
    if (!session || !session.user || !session.user.id) {
      console.log("認証エラー: セッションなし");
      logApiRequest(request.method, request.nextUrl.pathname, 401);
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    const body = await request.json();
    console.log("リクエストボディ:", body);
    const { friendId } = body;

    if (!friendId) {
      logApiRequest(request.method, request.nextUrl.pathname, 400, session.user.id);
      return NextResponse.json(
        { error: "友達IDが必要です" },
        { status: 400 },
      );
    }

    if (friendId === session.user.id) {
      logApiRequest(request.method, request.nextUrl.pathname, 400, session.user.id);
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
      logApiRequest(request.method, request.nextUrl.pathname, 404, session.user.id);
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
      logApiRequest(request.method, request.nextUrl.pathname, 400, session.user.id);
      return NextResponse.json(
        { error: "既に友達です" },
        { status: 400 },
      );
    }

    // 友達追加
    const friendshipId = `${session.user.id}-${friendId}-${Date.now()}`;
    console.log("友達追加実行:", { userId: session.user.id, friendId, friendshipId });
    
    await db.insert(friends).values({
      id: friendshipId,
      userId: session.user.id,
      friendId: friendId,
    });
    
    console.log("友達追加成功");

    logApiRequest(request.method, request.nextUrl.pathname, 200, session.user.id);
    return NextResponse.json({
      success: true,
      message: "友達に追加しました",
    });
  } catch (error) {
    logApiError(request.method, request.nextUrl.pathname, error instanceof Error ? error : new Error(String(error)), session?.user?.id);
    console.error("友達追加エラー:", error);
    return NextResponse.json(
      { error: "友達追加中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
