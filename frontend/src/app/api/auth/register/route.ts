import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAccount, createUser, getUserByEmail } from "@/api/auth/users";
import { logApiRequest, logApiError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, confirmPassword } = await req.json();

    if (!name || !email || !password) {
      logApiRequest(req.method, req.nextUrl.pathname, 400);
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 },
      );
    }
    if (password !== confirmPassword) {
      logApiRequest(req.method, req.nextUrl.pathname, 400);
      return NextResponse.json(
        { error: "パスワードが一致しません" },
        { status: 400 },
      );
    }
    const emailRegex =
      /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
    if (!emailRegex.test(email)) {
      logApiRequest(req.method, req.nextUrl.pathname, 400);
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 },
      );
    }
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      logApiRequest(req.method, req.nextUrl.pathname, 409);
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 },
      );
    }
    if (password.length < 8) {
      logApiRequest(req.method, req.nextUrl.pathname, 400);
      return NextResponse.json(
        { error: "パスワードは最低8文字必要です" },
        { status: 400 },
      );
    }
    const newUser = await createUser(name, email, password);
    await createAccount(newUser.id);
    logApiRequest(req.method, req.nextUrl.pathname, 201, newUser.id);
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    logApiError(req.method, req.nextUrl.pathname, error instanceof Error ? error : new Error(String(error)));
    console.error("ユーザー登録エラー:", error);
    return NextResponse.json(
      { error: "ユーザー登録中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
