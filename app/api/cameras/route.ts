import { NextResponse } from "next/server";
import { getAllCameras } from "@/lib/sources";
import { addLocal } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import type { Camera, StreamType } from "@/lib/types";

export const dynamic = "force-dynamic";

const STREAM_TYPES: StreamType[] = ["hls", "mjpeg", "image", "iframe", "portal"];

/**
 * GET /api/cameras?q=&province=&city=&type=&bbox=minLng,minLat,maxLng,maxLat
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.toLowerCase().trim();
  const province = sp.get("province");
  const city = sp.get("city");
  const type = sp.get("type");
  const bbox = sp.get("bbox")?.split(",").map(Number);

  const { cameras, sources } = await getAllCameras();
  const filtered = cameras.filter((c) => {
    if (province && c.province !== province) return false;
    if (city && c.city !== city) return false;
    if (type && c.streamType !== type) return false;
    if (q && ![c.name, c.city, c.province, c.source, ...(c.tags ?? [])].join(" ").toLowerCase().includes(q)) return false;
    if (bbox?.length === 4 && bbox.every(Number.isFinite)) {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      if (c.lng < minLng || c.lng > maxLng || c.lat < minLat || c.lat > maxLat) return false;
    }
    return true;
  });

  return NextResponse.json({ total: filtered.length, cameras: filtered, sources });
}

/** POST /api/cameras — tambah kamera hasil temuan analis (butuh header x-admin-token). */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Token admin tidak valid" }, { status: 401 });

  let body: Partial<Camera>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const errors: string[] = [];
  if (!body.name?.trim()) errors.push("name wajib");
  if (!body.province?.trim()) errors.push("province wajib");
  if (!Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lng))) errors.push("lat/lng harus angka");
  if (!body.streamType || !STREAM_TYPES.includes(body.streamType)) errors.push(`streamType harus salah satu: ${STREAM_TYPES.join(", ")}`);
  try {
    if (!["http:", "https:"].includes(new URL(body.streamUrl ?? "").protocol)) throw new Error();
  } catch {
    errors.push("streamUrl harus URL http(s)");
  }
  if (!body.sourceUrl?.trim()) errors.push("sourceUrl wajib (halaman resmi yang mempublikasikan feed)");
  if (errors.length) return NextResponse.json({ error: errors.join("; ") }, { status: 400 });

  const camera: Camera = {
    id: body.id?.trim() || `local-${Date.now().toString(36)}`,
    name: body.name!.trim(),
    province: body.province!.trim(),
    city: body.city?.trim() ?? "",
    lat: Number(body.lat),
    lng: Number(body.lng),
    streamType: body.streamType!,
    streamUrl: body.streamUrl!,
    source: body.source?.trim() || "Input analis",
    sourceUrl: body.sourceUrl!.trim(),
    tags: body.tags ?? [],
    origin: "local",
    addedAt: new Date().toISOString(),
  };

  try {
    return NextResponse.json(await addLocal(camera), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }
}
