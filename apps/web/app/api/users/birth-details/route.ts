import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://divinemarg.onrender.com";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const backendRes = await fetch(`${BACKEND_URL}/api/users/birth-details`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    const backendJson = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: backendJson?.error ?? "Failed to load birth details" },
        { status: backendRes.status }
      );
    }
    return NextResponse.json(backendJson);
  } catch (e) {
    console.error("Birth details route error:", e);
    return NextResponse.json(
      { error: "Failed to load birth details" },
      { status: 500 }
    );
  }
}
