"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Camera, StreamType } from "@/lib/types";
import { PROVINCES } from "@/lib/regions";
import type { SourceStatus } from "@/lib/sources";
import Player from "./Player";
import AddCameraForm from "./AddCameraForm";
import { TYPE_COLOR, TYPE_LABEL } from "./typeColors";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="empty">Memuat peta…</div> });

const MAX_TILES = 4;

export default function Dashboard() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<Camera[]>([]);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/cameras");
      if (!res.ok) throw new Error(`API /api/cameras mengembalikan HTTP ${res.status}`);
      const data = await res.json();
      setCameras(data.cameras ?? []);
      setSources(data.sources ?? []);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cities = useMemo(
    () => [...new Set(cameras.filter((c) => !province || c.province === province).map((c) => c.city).filter(Boolean))].sort(),
    [cameras, province],
  );

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return cameras.filter(
      (c) =>
        (!province || c.province === province) &&
        (!city || c.city === city) &&
        (!type || c.streamType === type) &&
        (!needle || [c.name, c.city, c.province, c.source, ...(c.tags ?? [])].join(" ").toLowerCase().includes(needle)),
    );
  }, [cameras, q, province, city, type]);

  const provinceCount = useMemo(() => new Set(cameras.map((c) => c.province)).size, [cameras]);
  const liveCount = useMemo(() => cameras.filter((c) => c.streamType !== "portal").length, [cameras]);

  function selectProvince(name: string) {
    setProvince(name);
    setCity("");
    const p = PROVINCES.find((x) => x.name === name);
    setFlyTarget(p ? { lat: p.lat, lng: p.lng, zoom: 8 } : { lat: -2.5, lng: 118, zoom: 5 });
  }

  function open(c: Camera) {
    setFlyTarget({ lat: c.lat, lng: c.lng, zoom: 14 });
    setSelected((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev].slice(0, MAX_TILES)));
  }

  const close = (id: string) => setSelected((prev) => prev.filter((c) => c.id !== id));
  const failing = sources.filter((s) => !s.ok);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">CCTV <span>OSINT</span> Indonesia</div>
        <div className="stats">
          <span><b>{cameras.length}</b> titik</span>
          <span><b>{liveCount}</b> feed langsung</span>
          <span><b>{provinceCount}</b> provinsi</span>
          <span><b>{sources.filter((s) => s.ok).length}/{sources.length}</b> API aktif</span>
        </div>
        <button className="btn" onClick={load}>↻ Muat ulang</button>
        <button className="btn primary" onClick={() => setShowForm(true)}>+ Kamera</button>
      </header>

      <div className="body">
        <aside className="sidebar">
          <div className="filters">
            <input className="input" placeholder="Cari lokasi, kota, penyedia, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select" value={province} onChange={(e) => selectProvince(e.target.value)}>
              <option value="">Semua provinsi</option>
              {PROVINCES.map((p) => <option key={p.name}>{p.name}</option>)}
            </select>
            <div className="row">
              <select className="select" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Semua kota/kab.</option>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)} style={{ width: 130 }}>
                <option value="">Semua tipe</option>
                {(Object.keys(TYPE_LABEL) as StreamType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
          </div>
          {failing.map((s) => (
            <div key={s.id} className="source-err">⚠ {s.label}: {s.error}</div>
          ))}
          <div className="list">
            {loading && <div className="empty">Memuat data…</div>}
            {loadError && <div className="empty error">Gagal memuat kamera: {loadError}. Cek log terminal server.</div>}
            {!loading && !loadError && cameras.length === 0 && <div className="empty">Belum ada data kamera. Periksa data/portals.json dan config/sources.json.</div>}
            {!loading && cameras.length > 0 && filtered.length === 0 && <div className="empty">Tidak ada kamera untuk filter ini.</div>}
            {filtered.map((c) => (
              <div key={c.id} className={`item ${selected.some((s) => s.id === c.id) ? "active" : ""}`} onClick={() => open(c)}>
                <div className="name">{c.name}</div>
                <div className="meta">
                  <span className="badge" style={{ color: TYPE_COLOR[c.streamType] }}>{TYPE_LABEL[c.streamType]}</span>
                  <span>{c.city || c.province}</span>
                  <span>· {c.source}</span>
                  {c.origin === "local" && <span className="badge" style={{ color: "var(--warn)" }}>lokal</span>}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="main">
          <div className="map">
            <MapView cameras={filtered} selectedIds={selected.map((c) => c.id)} onSelect={open} flyTarget={flyTarget} />
          </div>
          <section className="viewer">
            {selected.length === 0 ? (
              <div className="empty">
                Pilih titik di peta atau daftar untuk membuka feed. Hingga {MAX_TILES} kamera dapat dipantau bersamaan.
              </div>
            ) : (
              <div className="grid">
                {selected.map((c) => <Player key={c.id} camera={c} onClose={() => close(c.id)} />)}
              </div>
            )}
          </section>
        </main>
      </div>

      {showForm && (
        <AddCameraForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
