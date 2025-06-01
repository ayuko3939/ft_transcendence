import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ここでは `node:path` が使用できないため
function joinWsUrl(baseUrl: string, ...paths: string[]): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPaths = paths.map((path) => path.replace(/^\/+/, ""));
  return `${cleanBase}/${cleanPaths.join("/")}`;
}

export function middleware(req: NextRequest) {
  const upgradeHeader = req.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return NextResponse.next();
  }

  console.log("WebSocketリクエストを検出:", req.nextUrl.pathname);
  const backendWsUrl = process.env.BACKEND_WS_URL || "ws://localhost:3001";

  // ローカル対戦用WebSocketプロキシ
  if (req.nextUrl.pathname === "/api/ws-proxy-local") {
    const localgameWsUrl = joinWsUrl(backendWsUrl, "game", "local");
    console.log("ローカル対戦用WebSocketプロキシ:", localgameWsUrl);
    return NextResponse.rewrite(localgameWsUrl);
  }

  // トーナメント用WebSocketプロキシ
  if (req.nextUrl.pathname.startsWith("/ws/tournament/")) {
    const pathSegments = req.nextUrl.pathname.split("/");
    const tournamentId = pathSegments[3];
    const tournamentWsUrl = joinWsUrl(
      backendWsUrl,
      "tournament",
      tournamentId,
      "ws",
    );
    console.log("トーナメント用WebSocketプロキシ:", tournamentWsUrl);
    return NextResponse.rewrite(tournamentWsUrl);
  }

  if (req.nextUrl.pathname.startsWith("/api/tournament-ws-proxy/")) {
    const roomId = req.nextUrl.pathname.split("/").pop();
    if (!roomId) {
      console.error(
        "トーナメントゲームルーム用WebSocketプロキシ: roomIdが見つかりません",
      );
      return new NextResponse("Invalid room ID", { status: 400 });
    }
    const tournamentWsUrl = joinWsUrl(backendWsUrl, "game", roomId);
    console.log(
      "トーナメントゲームルーム用WebSocketプロキシ:",
      tournamentWsUrl,
    );
    return NextResponse.rewrite(tournamentWsUrl);
  }

  // オンライン対戦用WebSocketプロキシ（デフォルト）
  const onlineWsUrl = joinWsUrl(backendWsUrl, "game");
  console.log("オンライン対戦用WebSocketプロキシ:", onlineWsUrl);
  return NextResponse.rewrite(onlineWsUrl);
}
