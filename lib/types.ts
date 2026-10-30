export type StreamType = "hls" | "mjpeg" | "image" | "iframe" | "portal";

export interface Camera {
  id: string;
  name: string;
  province: string;
  city: string;
  lat: number;
  lng: number;
  streamType: StreamType;
  /** URL stream/snapshot/halaman embed. Untuk "portal" berisi URL halaman portal. */
  streamUrl: string;
  /** Nama penyedia, mis. "Dishub Kota Bandung". */
  source: string;
  /** Halaman resmi tempat feed dipublikasikan (bukti bahwa feed memang publik). */
  sourceUrl?: string;
  tags?: string[];
  /** Asal data di aplikasi ini: seed, sumber eksternal, atau input analis. */
  origin: "seed" | "external" | "local";
  addedAt?: string;
}

export interface SourceConfig {
  id: string;
  enabled: boolean;
  label: string;
  url: string;
  /** Path bertitik ke array item di respons JSON, mis. "data.cameras". Kosong = root. */
  itemsPath?: string;
  province: string;
  city?: string;
  streamType: StreamType;
  /** Peta field kamera -> path bertitik di item sumber. */
  fields: {
    id: string;
    name: string;
    lat: string;
    lng: string;
    stream?: string;
    city?: string;
  };
  /** Jika feed dibangun dari id, mis. "https://host/live/{id}/index.m3u8". */
  streamTemplate?: string | null;
  sourceUrl?: string;
  headers?: Record<string, string>;
}
