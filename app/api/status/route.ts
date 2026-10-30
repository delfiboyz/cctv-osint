import { NextResponse } from "next/server";
import { getAllCameras } from "@/lib/sources";

export const dynamic = "force-dynamic";

/** GET /api/status?id=<cameraId> — cek apakah feed kamera bisa dijangkau dari server. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const { cameras } = await getAllCameras();
  const cam = cameras.find((c) => c.id === id);
  if (!cam) return NextResponse.json({ error: "Kamera tidak ditemukan" }, { status: 404 });

  const started = Date.now();
  try {
    const res = await fetch(cam.streamUrl, {
      method: "GET",
      headers: { Range: "bytes=0-1023" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    await res.body?.cancel();
    return NextResponse.json({
      id: cam.id,
      online: res.ok || res.status === 206,
      httpStatus: res.status,
      contentType: res.headers.get("content-type"),
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      id: cam.id,
      online: false,
      error: (err as Error).message,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    });
  }
}
