import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logInfo, logWarn, logError, type SimpleLogContext } from "@/lib/logger";

// クライアントから送信されるログの型
interface ClientLogRequest {
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: SimpleLogContext;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ClientLogRequest;
    
    // 必須項目のチェック
    if (!body.level || !body.message) {
      return NextResponse.json(
        { error: "level と message は必須です" },
        { status: 400 }
      );
    }

    // ログレベルに応じて適切な関数を呼び出し
    switch (body.level) {
      case 'info':
        logInfo(body.message, body.context);
        break;
      case 'warn':
        logWarn(body.message, body.context);
        break;
      case 'error':
        logError(body.message, undefined, body.context);
        break;
      default:
        return NextResponse.json(
          { error: "無効なログレベルです" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("ログAPI エラー:", error);
    return NextResponse.json(
      { error: "ログの処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
