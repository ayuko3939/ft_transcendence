import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const upgradeHeader = req.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return NextResponse.next();
  }

  // ローカル対戦用WebSocketプロキシ
  if (req.nextUrl.pathname === "/api/ws-proxy-local") {
    const backendWsUrl = process.env.BACKEND_WS_URL || "ws://localhost:3001/game";
    const localWsUrl = backendWsUrl.replace("/game", "/game/local");
    const url = new URL(localWsUrl);
    return NextResponse.rewrite(url);
  }

  // オンライン対戦用WebSocketプロキシ
  const backendWsUrl = process.env.BACKEND_WS_URL || "ws://localhost:3001/game";
  const url = new URL(backendWsUrl);
  return NextResponse.rewrite(url);
}
