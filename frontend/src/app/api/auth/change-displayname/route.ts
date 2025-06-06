import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { client } from "@/api/db";
import { logApiError, logApiRequest } from "@/lib/logger";
import { user } from "@ft-transcendence/shared";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      logApiRequest(req.method, req.nextUrl.pathname, 401);
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    const { displayName } = await req.json();

    if (!displayName) {
      logApiRequest(req.method, req.nextUrl.pathname, 400, session.user.id);
      return NextResponse.json(
        { error: "ディスプレイネームが入力されていません" },
        { status: 400 },
      );
    }

    // ディスプレイネームの検証
    if (displayName.length > 17) {
      logApiRequest(req.method, req.nextUrl.pathname, 400, session.user.id);
      return NextResponse.json(
        { error: "ディスプレイネームは17文字以内で入力してください" },
        { status: 400 },
      );
    }

    if (displayName.trim().length === 0) {
      logApiRequest(req.method, req.nextUrl.pathname, 400, session.user.id);
      return NextResponse.json(
        { error: "ディスプレイネームは空にできません" },
        { status: 400 },
      );
    }

    const db = drizzle(client, { logger: true });

    // ディスプレイネームを更新
    await db
      .update(user)
      .set({
        displayName: displayName.trim(),
      })
      .where(eq(user.id, session.user.id));

    logApiRequest(req.method, req.nextUrl.pathname, 200, session.user.id);
    return NextResponse.json(
      { message: "ディスプレイネームが正常に変更されました" },
      { status: 200 },
    );
  } catch (error) {
    logApiError(
      req.method,
      req.nextUrl.pathname,
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error("ディスプレイネーム変更エラー:", error);
    return NextResponse.json(
      { error: "ディスプレイネーム変更中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
