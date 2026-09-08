import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://divinemarg.onrender.com";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/settings/public`, {
      cache: "no-store",
    });
    const json = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: json?.error ?? "Could not load settings" },
        { status: backendRes.status >= 400 ? backendRes.status : 503 }
      );
    }
    return NextResponse.json(json);
  } catch (e) {
    console.error("Public settings proxy error:", e);
    return NextResponse.json(
      { error: "Could not load settings" },
      { status: 500 }
    );
  }
}
