import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

// バックエンドのベースURL
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    // バックエンドからトーナメント一覧を取得
    const response = await fetch(`${BACKEND_URL}/tournament/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "トーナメント一覧の取得に失敗しました" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("トーナメント一覧取得エラー:", error);
    return NextResponse.json(
      { error: "トーナメント一覧の取得中にエラーが発生しました" },
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
    const { name, maxParticipants } = body;

    if (!name || !maxParticipants) {
      return NextResponse.json(
        { error: "名前と最大参加者数は必須です" },
        { status: 400 },
      );
    }

    if (maxParticipants < 2 || maxParticipants > 16) {
      return NextResponse.json(
        { error: "参加者数は2人以上16人以下で設定してください" },
        { status: 400 },
      );
    }

    // バックエンドにトーナメント作成リクエストを送信
    const response = await fetch(`${BACKEND_URL}/tournament/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        maxParticipants: parseInt(maxParticipants),
        creatorId: session.user.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "トーナメントの作成に失敗しました" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("トーナメント作成エラー:", error);
    return NextResponse.json(
      { error: "トーナメント作成中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
