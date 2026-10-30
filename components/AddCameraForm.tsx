"use client";

import { useState } from "react";
import { PROVINCES } from "@/lib/regions";
import type { StreamType } from "@/lib/types";
import { TYPE_LABEL } from "./typeColors";

const TOKEN_KEY = "cctv-admin-token";

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function AddCameraForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", province: "DKI Jakarta", city: "", lat: "", lng: "",
    streamType: "hls" as StreamType, streamUrl: "", source: "", sourceUrl: "", tags: "",
  });
  const [token, setToken] = useState(readToken);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
    const res = await fetch("/api/cameras", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setSaving(false);
    if (!res.ok) return setError((await res.json()).error ?? "Gagal menyimpan");
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Tambah kamera publik</h2>
        <p className="note">
          Hanya tambahkan feed yang dipublikasikan resmi oleh instansi/pemilik (Dishub, ATCS, Pemda, pengelola jalan tol, dll.).
          Jangan memasukkan kamera privat atau perangkat yang terbuka karena salah konfigurasi.
        </p>
        <label>Nama lokasi<input className="input" required value={form.name} onChange={set("name")} placeholder="Simpang Dago" /></label>
        <div className="row">
          <label style={{ flex: 1 }}>Provinsi
            <select className="select" value={form.province} onChange={set("province")}>
              {PROVINCES.map((p) => <option key={p.name}>{p.name}</option>)}
            </select>
          </label>
          <label style={{ flex: 1 }}>Kota/Kabupaten<input className="input" value={form.city} onChange={set("city")} placeholder="Kota Bandung" /></label>
        </div>
        <div className="row">
          <label style={{ flex: 1 }}>Latitude<input className="input" required inputMode="decimal" value={form.lat} onChange={set("lat")} placeholder="-6.8915" /></label>
          <label style={{ flex: 1 }}>Longitude<input className="input" required inputMode="decimal" value={form.lng} onChange={set("lng")} placeholder="107.6107" /></label>
        </div>
        <div className="row">
          <label style={{ width: 140 }}>Tipe
            <select className="select" value={form.streamType} onChange={set("streamType")}>
              {(Object.keys(TYPE_LABEL) as StreamType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label style={{ flex: 1 }}>URL stream / snapshot<input className="input" required type="url" value={form.streamUrl} onChange={set("streamUrl")} placeholder="https://…/index.m3u8" /></label>
        </div>
        <div className="row">
          <label style={{ flex: 1 }}>Penyedia<input className="input" value={form.source} onChange={set("source")} placeholder="Dishub Kota Bandung" /></label>
          <label style={{ flex: 1 }}>Halaman sumber resmi<input className="input" required type="url" value={form.sourceUrl} onChange={set("sourceUrl")} placeholder="https://…go.id" /></label>
        </div>
        <label>Tag (pisah koma)<input className="input" value={form.tags} onChange={set("tags")} placeholder="lalu-lintas, simpang" /></label>
        <label>Token admin (CCTV_ADMIN_TOKEN)<input className="input" type="password" required value={token} onChange={(e) => setToken(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </form>
    </div>
  );
}
