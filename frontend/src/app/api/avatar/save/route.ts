import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { db } from "@/api/db";
import { eq } from "drizzle-orm";
import { user } from "drizzle/schema";
import { getServerSession } from "next-auth";

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
    const { objectKey, publicUrl } = body;

    if (!objectKey || !publicUrl) {
      return NextResponse.json(
        { error: "必要な情報が提供されていません" },
        { status: 400 },
      );
    }

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(user)
          .set({
            image: publicUrl,
          })
          .where(eq(user.id, session.user.id));
      });
    } catch (dbError) {
      console.error("データベース更新エラー:", dbError);
      return NextResponse.json(
        { error: "データベース更新中にエラーが発生しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "アバター情報が更新されました",
      avatarUrl: publicUrl,
    });
  } catch (error) {
    console.error("アバター保存エラー:", error);
    return NextResponse.json(
      { error: "アバター情報の保存中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
