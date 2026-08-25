import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://divinemarg.onrender.com";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/ai-astrologer/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    });

    const backendJson = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: backendJson?.error ?? "Astrologer chat failed" },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(backendJson);
  } catch (e) {
    console.error("AI Astrologer chat route error:", e);
    return NextResponse.json(
      { error: "Astrologer chat failed. Please try again." },
      { status: 500 }
    );
  }
}
