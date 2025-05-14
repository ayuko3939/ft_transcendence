import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const upgradeHeader = req.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    return NextResponse.next();
  }

  const backendWsUrl = process.env.BACKEND_WS_URL || "ws://localhost:3001/game";
  const url = new URL(backendWsUrl);
  return NextResponse.rewrite(url);
}
