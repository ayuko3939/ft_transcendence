import type { NextRequest } from "next/server";
import { logApiRequest, logApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const upgradeHeader = req.headers.get("upgrade");

    if (upgradeHeader !== "websocket") {
      logApiRequest(req.method, req.nextUrl.pathname, 426);
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const backendWsUrl =
      process.env.BACKEND_WS_URL || "ws://localhost:3001/game";
    console.log(`Proxying WebSocket to: ${backendWsUrl}`);

    const response = await fetch(backendWsUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      cache: "no-store",
      redirect: "manual",
    } as RequestInit);

    logApiRequest(req.method, req.nextUrl.pathname, response.status);
    return response;
  } catch (error: unknown) {
    logApiError(req.method, req.nextUrl.pathname, error instanceof Error ? error : new Error(String(error)));
    console.error("WebSocketプロキシエラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(`WebSocketプロキシエラー: ${errorMessage}`, {
      status: 500,
    });
  }
}
