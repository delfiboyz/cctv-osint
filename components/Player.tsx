"use client";

import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import type { Camera } from "@/lib/types";
import { TYPE_COLOR, TYPE_LABEL } from "./typeColors";

const viaProxy = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`;

interface Status {
  online: boolean;
  httpStatus?: number;
  latencyMs: number;
  error?: string;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function HlsVideo({ src, videoRef, onError }: { src: string; videoRef: React.RefObject<HTMLVideoElement | null>; onError: (m: string) => void }) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    let cancelled = false;

    (async () => {
      const { default: HlsLib } = await import("hls.js");
      if (cancelled) return;
      if (HlsLib.isSupported()) {
        hls = new HlsLib({ liveDurationInfinity: true, lowLatencyMode: true });
        hls.on(HlsLib.Events.ERROR, (_e, data) => {
          if (data.fatal) onError(`HLS error: ${data.details}`);
        });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        onError("Browser tidak mendukung HLS");
      }
    })();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, videoRef, onError]);

  return <video ref={videoRef} autoPlay muted playsInline controls crossOrigin="anonymous" />;
}

function RefreshingImage({ src, interval, imgRef, onError }: { src: string; interval: number; imgRef: React.RefObject<HTMLImageElement | null>; onError: (m: string) => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!interval) return;
    const t = setInterval(() => setTick((n) => n + 1), interval * 1000);
    return () => clearInterval(t);
  }, [interval]);
  const sep = src.includes("?") ? "&" : "?";
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imgRef} src={interval ? `${src}${sep}_t=${tick}` : src} alt="" crossOrigin="anonymous" onError={() => onError("Gambar gagal dimuat")} />;
}

export default function Player({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const [useProxy, setUseProxy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const now = useClock();

  const src = useProxy && camera.streamType !== "iframe" && camera.streamType !== "portal" ? viaProxy(camera.streamUrl) : camera.streamUrl;

  useEffect(() => setError(null), [src]);

  async function checkStatus() {
    setChecking(true);
    try {
      const res = await fetch(`/api/status?id=${encodeURIComponent(camera.id)}`);
      setStatus(await res.json());
    } finally {
      setChecking(false);
    }
  }

  /** Simpan frame saat ini sebagai PNG dengan stempel waktu & koordinat (bukti OSINT). */
  function snapshot() {
    const el: HTMLVideoElement | HTMLImageElement | null = videoRef.current ?? imgRef.current;
    if (!el) return;
    const w = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
    const h = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
    if (!w || !h) return setError("Belum ada frame untuk diambil");
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h + 28;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(el, 0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, h, w, 28);
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.fillText(`${camera.name} | ${camera.lat.toFixed(5)},${camera.lng.toFixed(5)} | ${new Date().toISOString()}`, 8, h + 19);
    try {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${camera.id.replace(/[^a-z0-9-]/gi, "_")}_${Date.now()}.png`;
      a.click();
    } catch {
      setError("Snapshot diblokir CORS — aktifkan proxy");
    }
  }

  let screen: React.ReactNode;
  if (error) screen = <div className="msg">⚠ {error}<br />{!useProxy && "Coba aktifkan proxy."}</div>;
  else if (camera.streamType === "hls") screen = <HlsVideo src={src} videoRef={videoRef} onError={setError} />;
  else if (camera.streamType === "mjpeg") screen = <RefreshingImage src={src} interval={0} imgRef={imgRef} onError={setError} />;
  else if (camera.streamType === "image") screen = <RefreshingImage src={src} interval={5} imgRef={imgRef} onError={setError} />;
  else if (camera.streamType === "iframe")
    screen = <iframe src={src} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" allow="autoplay" />;
  else
    screen = (
      <div className="msg">
        Feed tersedia di portal resmi penyedia.
        <br />
        <a href={camera.streamUrl} target="_blank" rel="noopener noreferrer">Buka portal ↗</a>
      </div>
    );

  const playable = camera.streamType !== "portal" && camera.streamType !== "iframe";

  return (
    <div className="tile">
      <div className="tile-head">
        <span className="badge" style={{ color: TYPE_COLOR[camera.streamType] }}>{TYPE_LABEL[camera.streamType]}</span>
        <span className="title" title={camera.name}>{camera.name}</span>
        <button className="btn icon" onClick={onClose} aria-label="Tutup">✕</button>
      </div>
      <div className="screen">
        {screen}
        {playable && !error && <span className="rec">● {now.toLocaleTimeString("id-ID")}</span>}
      </div>
      <div className="tile-foot">
        <span>{camera.city ? `${camera.city}, ` : ""}{camera.province}</span>
        <span>· {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}</span>
        <span style={{ flex: 1 }} />
        {playable && (
          <>
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" checked={useProxy} onChange={(e) => setUseProxy(e.target.checked)} /> proxy
            </label>
            <button className="btn" onClick={snapshot}>📸 Snapshot</button>
          </>
        )}
        {camera.streamType !== "portal" && (
          <button className="btn" onClick={checkStatus} disabled={checking}>
            {checking ? "Mengecek…" : "Cek status"}
          </button>
        )}
        {status && (
          <span title={status.error ?? `HTTP ${status.httpStatus}`}>
            <span className={`dot ${status.online ? "on" : "off"}`} /> {status.online ? "online" : "offline"} · {status.latencyMs} ms
          </span>
        )}
        {camera.sourceUrl && (
          <a href={camera.sourceUrl} target="_blank" rel="noopener noreferrer">Sumber: {camera.source} ↗</a>
        )}
      </div>
    </div>
  );
}
