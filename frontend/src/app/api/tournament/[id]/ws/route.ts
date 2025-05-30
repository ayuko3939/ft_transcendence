import type { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const upgradeHeader = req.headers.get("upgrade");

    if (upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const { id } = params;
    const backendWsUrl = process.env.BACKEND_WS_URL || "ws://localhost:3001";
    const tournamentWsUrl = backendWsUrl.replace(
      "/game",
      `/tournament/${id}/ws`,
    );

    console.log(`Proxying Tournament WebSocket to: ${tournamentWsUrl}`);

    const response = await fetch(tournamentWsUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      cache: "no-store",
      redirect: "manual",
    } as RequestInit);

    return response;
  } catch (error: unknown) {
    console.error("Tournament WebSocketプロキシエラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(`Tournament WebSocketプロキシエラー: ${errorMessage}`, {
      status: 500,
    });
  }
}
