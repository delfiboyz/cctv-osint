import { NextResponse } from "next/server";
import { getAllCameras } from "@/lib/sources";
import { PROVINCES } from "@/lib/regions";

export const dynamic = "force-dynamic";

/** GET /api/regions — jumlah kamera per provinsi & kota. */
export async function GET() {
  const { cameras } = await getAllCameras();
  const regions = PROVINCES.map((p) => {
    const inProv = cameras.filter((c) => c.province === p.name);
    const cities: Record<string, number> = {};
    for (const c of inProv) if (c.city) cities[c.city] = (cities[c.city] ?? 0) + 1;
    return { ...p, count: inProv.length, cities };
  });
  return NextResponse.json({ regions });
}
