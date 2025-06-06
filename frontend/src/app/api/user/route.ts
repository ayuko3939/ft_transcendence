import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { db } from "@/api/db";
import { logApiError, logApiRequest } from "@/lib/logger";
import { user } from "@ft-transcendence/shared";
import { eq, InferSelectModel } from "drizzle-orm";
import { getServerSession } from "next-auth";

type User = InferSelectModel<typeof user>;

export async function GET(request: NextRequest): Promise<NextResponse> {
  let id;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      logApiRequest(request.method, request.nextUrl.pathname, 401);
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      logApiRequest(request.method, request.nextUrl.pathname, 400);
      return NextResponse.json(
        { error: "ユーザーIDが指定されていません" },
        { status: 400 },
      );
    }
    id = userId;
    const foundUser: User[] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));

    if (!foundUser || foundUser.length === 0) {
      logApiRequest(
        request.method,
        request.nextUrl.pathname,
        404,
        session.user.id,
      );
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    logApiRequest(
      request.method,
      request.nextUrl.pathname,
      200,
      session.user.id,
    );
    return NextResponse.json(foundUser[0]);
  } catch (error) {
    logApiError(
      request.method,
      request.nextUrl.pathname,
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error(`ユーザー取得エラー(ID: ${id}):`, error);
    return NextResponse.json(
      { error: "ユーザーの取得中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
