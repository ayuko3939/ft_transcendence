import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '../users';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'ユーザー名とパスワードを入力してください' },
        { status: 400 }
      );
    }

    // データベースからユーザーを認証
    const user = await authenticateUser(username, password);

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザー名またはパスワードが無効です' },
        { status: 401 }
      );
    }

    // パスワードを除いたユーザー情報を返す
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('ログインエラー:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
