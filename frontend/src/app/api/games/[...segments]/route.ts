import type { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { segments: string[] } }
) {
  const segments = params.segments || [];
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  const apiPath = `/api/games/${segments.join("/")}`;
  const url = `${backendUrl}${apiPath}${request.nextUrl.search}`;

  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Game API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from backend" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { segments: string[] } }
) {
  const segments = params.segments || [];
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  const apiPath = `/api/games/${segments.join("/")}`;
  const url = `${backendUrl}${apiPath}`;

  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Game API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to send data to backend" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { segments: string[] } }
) {
  const segments = params.segments || [];
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  const apiPath = `/api/games/${segments.join("/")}`;
  const url = `${backendUrl}${apiPath}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Game API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to delete data from backend" },
      { status: 500 }
    );
  }
}
