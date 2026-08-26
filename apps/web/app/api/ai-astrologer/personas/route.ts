import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://divinemarg.onrender.com";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/ai-astrologer/personas`, {
      cache: "no-store",
    });
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: "Failed to load astrologer personas" },
        { status: 502 }
      );
    }
    const json = await backendRes.json();
    return NextResponse.json(json);
  } catch (e) {
    console.error("AI Astrologer personas route error:", e);
    return NextResponse.json(
      { error: "Failed to load astrologer personas" },
      { status: 500 }
    );
  }
}
