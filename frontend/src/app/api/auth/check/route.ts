import { NextResponse } from "next/server";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session) {
    return NextResponse.json({ authenticated: true }, { status: 200 });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
