import type { StreamType } from "@/lib/types";

export const TYPE_COLOR: Record<StreamType, string> = {
  hls: "#2fd4a7",
  mjpeg: "#5aa9ff",
  image: "#c38bff",
  iframe: "#f5b84b",
  portal: "#f2626b",
};

export const TYPE_LABEL: Record<StreamType, string> = {
  hls: "HLS",
  mjpeg: "MJPEG",
  image: "Snapshot",
  iframe: "Embed",
  portal: "Portal",
};
