import { isAllowed } from "@/lib/allowlist";

export const dynamic = "force-dynamic";

const proxied = (u: string) => `/api/proxy?url=${encodeURIComponent(u)}`;

/** Tulis ulang URL di playlist HLS agar segmen & sub-playlist juga lewat proxy (bypass CORS). */
function rewritePlaylist(text: string, base: URL): string {
  return text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${proxied(new URL(uri, base).toString())}"`);
      }
      return proxied(new URL(t, base).toString());
    })
    .join("\n");
}

/** GET /api/proxy?url=... — proxy feed CCTV dari host yang terdaftar saja. */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("Parameter url tidak valid", { status: 400 });
  }
  if (!(await isAllowed(target))) return new Response("Host tidak terdaftar sebagai sumber CCTV", { status: 403 });

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { "User-Agent": "cctv-osint-indonesia/0.1", Referer: target.origin },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (err) {
    return new Response(`Gagal menghubungi sumber: ${(err as Error).message}`, { status: 502 });
  }

  // Redirect hanya diikuti jika tujuan juga host terdaftar.
  if (upstream.status >= 300 && upstream.status < 400) {
    const loc = upstream.headers.get("location");
    if (!loc) return new Response("Redirect tanpa Location", { status: 502 });
    const next = new URL(loc, target);
    if (!(await isAllowed(next))) return new Response("Redirect ke host tidak terdaftar", { status: 403 });
    return Response.redirect(new URL(proxied(next.toString()), req.url), 302);
  }

  const type = upstream.headers.get("content-type") ?? "";
  const headers = new Headers({ "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
  if (type) headers.set("Content-Type", type);

  const isPlaylist = /mpegurl/i.test(type) || target.pathname.endsWith(".m3u8");
  if (isPlaylist && upstream.ok) {
    headers.set("Content-Type", "application/vnd.apple.mpegurl");
    return new Response(rewritePlaylist(await upstream.text(), target), { status: 200, headers });
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
