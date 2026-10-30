# CCTV OSINT Indonesia

Aplikasi Next.js untuk mengumpulkan, memetakan, dan memantau **feed CCTV publik resmi** (Dishub, ATCS, Pemda, pengelola jalan) di seluruh Indonesia.

## Fitur
- Peta interaktif (Leaflet) dengan warna per tipe feed, navigasi ke 38 provinsi
- Filter: teks, provinsi, kota/kabupaten, tipe stream
- Multi-view sampai 4 kamera sekaligus
- Pemutar **HLS** (hls.js), **MJPEG**, **snapshot JPG** (refresh 5 detik), **iframe embed**, dan tautan **portal**
- **Snapshot bukti**: simpan frame ke PNG dengan stempel nama, koordinat, dan waktu ISO
- **Cek status** feed dari server (online/offline, HTTP status, latensi)
- **Proxy CORS** yang hanya melayani host terdaftar (bukan open proxy; IP privat diblokir; playlist HLS ditulis ulang)
- **Adapter API JSON generik**: hubungkan endpoint baru lewat `config/sources.json` tanpa menulis kode
- Tambah/hapus kamera temuan analis lewat UI/API (dilindungi token)

## Menjalankan
```bash
npm install
cp .env.example .env.local   # isi CCTV_ADMIN_TOKEN
npm run dev                  # http://localhost:3000
```

## Sumber data
| File | Isi |
|---|---|
| `data/portals.json` | Portal CCTV resmi: Jakarta, Bandung, Yogyakarta, Surabaya, Semarang, Malang, Medan, Denpasar, Pontianak, + jalan tol nasional (Bina Marga/BPJT). Entri bertag `perlu-verifikasi` belum dicek langsung. |
| `data/cameras.json` | Kamera seed dalam skema `Camera` (`lib/types.ts`) |
| `data/cameras.local.json` | Kamera yang ditambahkan via UI/API (tidak di-commit) |
| `config/sources.json` | Adapter API eksternal |

### Menambah adapter API
```json
{
  "id": "dishub-kota-x",
  "enabled": true,
  "label": "Dishub Kota X",
  "url": "https://…/api/cctv",
  "itemsPath": "data",
  "province": "Jawa Tengah",
  "city": "Kota X",
  "streamType": "hls",
  "fields": { "id": "id", "name": "nama", "lat": "latitude", "lng": "longitude", "stream": "url_stream" },
  "streamTemplate": null,
  "sourceUrl": "https://…"
}
```
- `itemsPath` / `fields.*` memakai notasi titik (`lokasi.lat`).
- Jika API hanya memberi ID, isi `streamTemplate`, mis. `"https://host/live/{id}/index.m3u8"`.
- Respons di-cache `CCTV_CACHE_TTL` detik; jika sumber down, data cache terakhir tetap dipakai dan peringatan tampil di sidebar.

Cara menemukan endpoint: buka portal CCTV resmi, lalu DevTools → Network → filter `Fetch/XHR` atau `m3u8`, dan catat URL JSON/stream yang dipakai halaman itu.

## REST API
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/cameras?q=&province=&city=&type=&bbox=minLng,minLat,maxLng,maxLat` | Daftar kamera + status sumber |
| GET | `/api/cameras/:id` | Detail kamera |
| POST | `/api/cameras` | Tambah kamera (header `x-admin-token`) |
| DELETE | `/api/cameras/:id` | Hapus kamera lokal (header `x-admin-token`) |
| GET | `/api/regions` | Jumlah kamera per provinsi/kota |
| GET | `/api/status?id=` | Cek keterjangkauan feed |
| GET | `/api/proxy?url=` | Proxy feed (host terdaftar saja) |
