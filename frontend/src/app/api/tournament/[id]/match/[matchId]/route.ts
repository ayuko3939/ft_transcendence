import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 },
      );
    }

    const { matchId } = await params;

    // バックエンドAPIを呼び出してマッチ詳細を取得
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(
      `${backendUrl}/tournament/matches/${matchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "マッチ情報の取得に失敗しました" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("マッチ詳細取得エラー:", error);
    return NextResponse.json(
      { error: "マッチ詳細の取得中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
