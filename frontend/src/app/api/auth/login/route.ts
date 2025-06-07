import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticateUser, updateSession } from "@/api/auth/users";
import { logApiError, logApiRequest } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      logApiRequest(req.method, req.nextUrl.pathname, 400);
      return NextResponse.json(
        { error: "ユーザー名とパスワードを入力してください" },
        { status: 400 },
      );
    }
    const user = await authenticateUser(username, password);
    if (!user) {
      logApiRequest(req.method, req.nextUrl.pathname, 401);
      return NextResponse.json(
        { error: "ユーザー名またはパスワードが無効です" },
        { status: 401 },
      );
    }

    // CLIクライアント用にセッショントークンも作成
    const sessionData = await updateSession(user.id);

    logApiRequest(req.method, req.nextUrl.pathname, 200, user.id);
    return NextResponse.json(
      {
        user,
        sessionToken: sessionData.sessionToken,
        expires: sessionData.expires,
      },
      { status: 200 },
    );
  } catch (error) {
    logApiError(
      req.method,
      req.nextUrl.pathname,
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error("ログインエラー:", error);
    return NextResponse.json(
      { error: "ログイン処理中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
