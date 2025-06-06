import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/api/auth/users";
import { logApiError, logApiRequest } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      logApiRequest(req.method, req.nextUrl.pathname, 400);
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 },
      );
    }

    // セッショントークンを更新/作成
    const sessionData = await updateSession(userId);
    
    if (!sessionData) {
      logApiRequest(req.method, req.nextUrl.pathname, 500);
      return NextResponse.json(
        { error: "セッションの作成に失敗しました" },
        { status: 500 },
      );
    }

    logApiRequest(req.method, req.nextUrl.pathname, 200, userId);
    return NextResponse.json({
      sessionToken: sessionData.sessionToken,
      expires: sessionData.expires,
      userId: sessionData.userId
    }, { status: 200 });
    
  } catch (error) {
    logApiError(
      req.method,
      req.nextUrl.pathname,
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error("セッション作成エラー:", error);
    return NextResponse.json(
      { error: "セッション作成中にエラーが発生しました" },
      { status: 500 },
    );
  }
}