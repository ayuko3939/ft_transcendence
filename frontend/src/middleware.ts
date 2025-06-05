import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ここでは `node:path` が使用できないため
function joinWsUrl(baseUrl: string, ...paths: string[]): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPaths = paths.map((path) => path.replace(/^\/+/, ""));
  return `${cleanBase}/${cleanPaths.join("/")}`;
}

// WebSocketリクエストを検出し、適切なWebSocket URLにリダイレクトするミドルウェア
// ただし、本番のdocker-compose環境では、Nginxのルーティングにより、以下の設定を制御するので
// ここでの記載している理由はローカル実行のためのものです。
export function middleware(req: NextRequest) {
  const upgradeHeader = req.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return NextResponse.next();
  }

  console.log("WebSocketリクエストを検出:", req.nextUrl.pathname);
  const backendWsUrl = process.env.BACKEND_WS_URL || "ws://localhost:3001";

  // ローカル対戦用WebSocketプロキシ
  if (req.nextUrl.pathname === "/ws/game-local") {
    const localgameWsUrl = joinWsUrl(backendWsUrl, "game", "local");
    console.log("ローカル対戦用WebSocketプロキシ:", localgameWsUrl);
    return NextResponse.rewrite(localgameWsUrl);
  }

  // トーナメント用WebSocketプロキシ
  if (req.nextUrl.pathname.startsWith("/ws/tournament/")) {
    const pathSegments = req.nextUrl.pathname.split("/");
    const tournamentId = pathSegments[3];
    if (!tournamentId) {
      console.error(
        "トーナメント用WebSocketプロキシ: tournamentIdが見つかりません",
      );
      return new NextResponse("Invalid tournament ID", { status: 400 });
    }
    const tournamentWsUrl = joinWsUrl(
      backendWsUrl,
      "tournament",
      tournamentId,
      "ws",
    );
    console.log("トーナメント用WebSocketプロキシ:", tournamentWsUrl);
    return NextResponse.rewrite(tournamentWsUrl);
  }

  if (req.nextUrl.pathname.startsWith("/ws/tournament-match/")) {
    const roomId = req.nextUrl.pathname.split("/").pop();
    if (!roomId) {
      console.error(
        "トーナメントゲームルーム用WebSocketプロキシ: roomIdが見つかりません",
      );
      return new NextResponse("Invalid room ID", { status: 400 });
    }
    const tournamentWsUrl = joinWsUrl(backendWsUrl, "game", "tournament-match", roomId);
    console.log(
      "トーナメントゲームルーム用WebSocketプロキシ:",
      tournamentWsUrl,
    );
    return NextResponse.rewrite(tournamentWsUrl);
  }

  if (req.nextUrl.pathname.startsWith("/ws/game")) {
    const onlineWsUrl = joinWsUrl(backendWsUrl, "game");
    console.log("オンライン対戦用WebSocketプロキシ:", onlineWsUrl);
    return NextResponse.rewrite(onlineWsUrl);
  }
  console.error("不明なWebSocketリクエスト:", req.nextUrl.pathname);
  return new NextResponse("Unknown WebSocket request", { status: 400 });
}
