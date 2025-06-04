import { NextRequest, NextResponse } from "next/server";
import { format, toZonedTime } from "date-fns-tz";
import { getServerSession } from "next-auth/next";

import { getLastActivity } from "../lastActivityService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;

    const lastActivity = await getLastActivity(userId);
    return NextResponse.json(
      {
        userId,
        lastActivity,
        lastActivityDate: lastActivity
          ? format(
              toZonedTime(new Date(lastActivity), "Asia/Tokyo"),
              "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
              { timeZone: "Asia/Tokyo" },
            )
          : null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to get last activity:", error);
    return NextResponse.json(
      { error: "最終アクティビティの取得に失敗しました" },
      { status: 500 },
    );
  }
}
