import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://divinemarg.onrender.com";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const backendRes = await fetch(
      `${BACKEND_URL}/api/ai-astrologer/sessions/${params.id}`,
      {
        headers: { Authorization: authHeader },
        cache: "no-store",
      }
    );
    const backendJson = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: backendJson?.error ?? "Failed to load session" },
        { status: backendRes.status }
      );
    }
    return NextResponse.json(backendJson);
  } catch (e) {
    console.error("AI Astrologer session detail route error:", e);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
