import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { hashPassword, verifyPassword } from "@/api/auth/utils";
import { client } from "@/api/db";
import { logApiError, logApiRequest } from "@/lib/logger";
import { userPassword } from "@ft-transcendence/shared";
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
    if (session.user.provider !== "credentials") {
      logApiRequest(req.method, req.nextUrl.pathname, 403, session.user.id);
      return NextResponse.json(
        { error: "このエンドポイントはパスワード認証ユーザーのみ使用できます" },
        { status: 403 },
      );
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      logApiRequest(req.method, req.nextUrl.pathname, 400, session.user.id);
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 },
      );
    }

    // 新しいパスワードの検証
    if (newPassword.length < 8) {
      logApiRequest(req.method, req.nextUrl.pathname, 400, session.user.id);
      return NextResponse.json(
        { error: "新しいパスワードは8文字以上必要です" },
        { status: 400 },
      );
    }

    const db = drizzle(client, { logger: true });

    // 現在のパスワードを検証
    const userPasswords = await db
      .select()
      .from(userPassword)
      .where(eq(userPassword.userId, session.user.id))
      .limit(1);

    const currentUserPassword = userPasswords[0];
    // パスワードがないということはそいつはSSOでログインした人
    // 起こりえないはず
    if (!currentUserPassword) {
      logApiRequest(req.method, req.nextUrl.pathname, 404, session.user.id);
      return NextResponse.json(
        { error: "パスワード情報が見つかりません" },
        { status: 404 },
      );
    }
    const isPasswordValid = await verifyPassword(
      currentPassword,
      currentUserPassword.passwordHash,
    );
    if (!isPasswordValid) {
      logApiRequest(req.method, req.nextUrl.pathname, 400, session.user.id);
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません" },
        { status: 400 },
      );
    }

    // 新しいパスワードをハッシュ化
    const newPasswordHash = await hashPassword(newPassword);

    // パスワードを更新
    await db
      .update(userPassword)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date().getTime(),
      })
      .where(eq(userPassword.userId, session.user.id));

    logApiRequest(req.method, req.nextUrl.pathname, 200, session.user.id);
    return NextResponse.json(
      { message: "パスワードが正常に変更されました" },
      { status: 200 },
    );
  } catch (error) {
    logApiError(
      req.method,
      req.nextUrl.pathname,
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error("パスワード変更エラー:", error);
    return NextResponse.json(
      { error: "パスワード変更中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
