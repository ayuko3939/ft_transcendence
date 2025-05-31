import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    // バックエンドAPIを呼び出し
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/tournament`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("トーナメント一覧の取得に失敗しました");
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

    // バックエンドAPIを呼び出し
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/tournament`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        maxParticipants,
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
      { error: "トーナメントの作成中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
