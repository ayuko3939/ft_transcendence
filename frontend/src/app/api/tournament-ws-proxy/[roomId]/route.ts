import type { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } },
) {
  try {
    const upgradeHeader = req.headers.get("upgrade");

    if (upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const { roomId } = await params;
    
    // トーナメント専用のゲームルームに接続
    const backendWsUrl = process.env.BACKEND_WS_URL || "ws://localhost:3001";
    const tournamentGameWsUrl = backendWsUrl.replace("/game", `/game/${roomId}`);

    console.log(`Proxying Tournament Game WebSocket to: ${tournamentGameWsUrl}`);

    const response = await fetch(tournamentGameWsUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      cache: "no-store",
      redirect: "manual",
    } as RequestInit);

    return response;
  } catch (error: unknown) {
    console.error("Tournament Game WebSocketプロキシエラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(`Tournament Game WebSocketプロキシエラー: ${errorMessage}`, {
      status: 500,
    });
  }
}
