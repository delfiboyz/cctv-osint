import sourcesConfig from "@/config/sources.json";
import type { Camera, SourceConfig } from "./types";
import { readLocal, readSeed } from "./store";

const TTL_MS = Number(process.env.CCTV_CACHE_TTL ?? 300) * 1000;

export interface SourceStatus {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
  fetchedAt: string;
}

const cache = new Map<string, { at: number; cameras: Camera[]; status: SourceStatus }>();

export async function loadSourceConfigs(): Promise<SourceConfig[]> {
  return (sourcesConfig.sources ?? []) as SourceConfig[];
}

function getPath(obj: unknown, p?: string): unknown {
  if (!p) return obj;
  return p.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function normalize(src: SourceConfig, item: unknown): Camera | null {
  const id = String(getPath(item, src.fields.id) ?? "");
  const lat = Number(getPath(item, src.fields.lat));
  const lng = Number(getPath(item, src.fields.lng));
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  let streamUrl = src.fields.stream ? String(getPath(item, src.fields.stream) ?? "") : "";
  if (!streamUrl && src.streamTemplate) streamUrl = src.streamTemplate.replace("{id}", encodeURIComponent(id));
  if (!streamUrl) return null;

  return {
    id: `${src.id}:${id}`,
    name: String(getPath(item, src.fields.name) ?? id),
    province: src.province,
    city: String((src.fields.city && getPath(item, src.fields.city)) || src.city || ""),
    lat,
    lng,
    streamType: src.streamType,
    streamUrl,
    source: src.label,
    sourceUrl: src.sourceUrl ?? src.url,
    origin: "external",
  };
}

async function fetchSource(src: SourceConfig): Promise<{ cameras: Camera[]; status: SourceStatus }> {
  const hit = cache.get(src.id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;

  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(src.url, {
      headers: { Accept: "application/json", ...src.headers },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = getPath(await res.json(), src.itemsPath);
    if (!Array.isArray(items)) throw new Error(`itemsPath "${src.itemsPath ?? ""}" bukan array`);
    const cameras = items.map((it) => normalize(src, it)).filter((c): c is Camera => c !== null);
    const entry = { at: Date.now(), cameras, status: { id: src.id, label: src.label, ok: true, count: cameras.length, fetchedAt } };
    cache.set(src.id, entry);
    return entry;
  } catch (err) {
    // Kembalikan data cache lama bila ada, supaya peta tidak kosong saat sumber sedang down.
    const stale = hit?.cameras ?? [];
    return {
      cameras: stale,
      status: { id: src.id, label: src.label, ok: false, count: stale.length, error: (err as Error).message, fetchedAt },
    };
  }
}

export async function getAllCameras(): Promise<{ cameras: Camera[]; sources: SourceStatus[] }> {
  const configs = (await loadSourceConfigs()).filter((s) => s.enabled);
  const [seed, local, ...external] = await Promise.all([readSeed(), readLocal(), ...configs.map(fetchSource)]);

  const byId = new Map<string, Camera>();
  for (const c of [...seed, ...external.flatMap((e) => e.cameras), ...local]) byId.set(c.id, c);

  return { cameras: [...byId.values()], sources: external.map((e) => e.status) };
}
