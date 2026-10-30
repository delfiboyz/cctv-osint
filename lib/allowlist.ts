import { getAllCameras, loadSourceConfigs } from "./sources";

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Proxy hanya melayani host yang memang terdaftar sebagai sumber CCTV,
 * agar endpoint /api/proxy tidak bisa dipakai sebagai open proxy / SSRF.
 */
export async function allowedHosts(): Promise<Set<string>> {
  const hosts = new Set<string>();
  for (const h of (process.env.CCTV_PROXY_ALLOW ?? "").split(",")) if (h.trim()) hosts.add(h.trim().toLowerCase());
  for (const s of await loadSourceConfigs()) {
    const h = hostOf(s.url);
    if (h) hosts.add(h);
    if (s.streamTemplate) {
      const t = hostOf(s.streamTemplate.replace("{id}", "x"));
      if (t) hosts.add(t);
    }
  }
  const { cameras } = await getAllCameras();
  for (const c of cameras) {
    const h = hostOf(c.streamUrl);
    if (h) hosts.add(h);
  }
  return hosts;
}

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/;

export async function isAllowed(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOST.test(host)) return false;
  return (await allowedHosts()).has(host);
}
