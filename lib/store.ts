import { promises as fs } from "fs";
import path from "path";
import type { Camera } from "./types";
import portalsData from "@/data/portals.json";
import camerasData from "@/data/cameras.json";

const DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_FILE = path.join(DATA_DIR, "cameras.local.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

// Data seed di-import (bukan dibaca dari disk) agar ikut terbundel dan tidak bergantung pada folder kerja server.
export async function readSeed(): Promise<Camera[]> {
  const seed = [...portalsData, ...camerasData] as Omit<Camera, "origin">[];
  return seed.map((c) => ({ ...c, origin: "seed" as const }));
}

export async function readLocal(): Promise<Camera[]> {
  return readJson<Camera[]>(LOCAL_FILE, []);
}

async function writeLocal(cameras: Camera[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(cameras, null, 2));
}

export async function addLocal(camera: Camera): Promise<Camera> {
  const all = await readLocal();
  if (all.some((c) => c.id === camera.id)) throw new Error("ID kamera sudah ada");
  all.push(camera);
  await writeLocal(all);
  return camera;
}

export async function removeLocal(id: string): Promise<boolean> {
  const all = await readLocal();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return false;
  await writeLocal(next);
  return true;
}
