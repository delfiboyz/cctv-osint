import { NextResponse } from "next/server";
import { getAllCameras } from "@/lib/sources";
import { removeLocal } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { cameras } = await getAllCameras();
  const camera = cameras.find((c) => c.id === decodeURIComponent(id));
  if (!camera) return NextResponse.json({ error: "Kamera tidak ditemukan" }, { status: 404 });
  return NextResponse.json(camera);
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Token admin tidak valid" }, { status: 401 });
  const { id } = await params;
  const ok = await removeLocal(decodeURIComponent(id));
  if (!ok) return NextResponse.json({ error: "Hanya kamera lokal yang bisa dihapus" }, { status: 404 });
  return NextResponse.json({ deleted: id });
}
