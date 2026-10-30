"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { Camera } from "@/lib/types";
import { INDONESIA_CENTER } from "@/lib/regions";
import { TYPE_COLOR, TYPE_LABEL } from "./typeColors";

// Default: tile OpenStreetMap (tanpa API key). Bisa diganti via NEXT_PUBLIC_TILE_URL.
const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function FlyTo({ target }: { target: { lat: number; lng: number; zoom: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.8 });
  }, [map, target]);
  return null;
}

export default function MapView({
  cameras,
  selectedIds,
  onSelect,
  flyTarget,
}: {
  cameras: Camera[];
  selectedIds: string[];
  onSelect: (c: Camera) => void;
  flyTarget: { lat: number; lng: number; zoom: number } | null;
}) {
  return (
    <MapContainer center={INDONESIA_CENTER} zoom={5} minZoom={4} worldCopyJump>
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <FlyTo target={flyTarget} />
      {cameras.map((c) => {
        const active = selectedIds.includes(c.id);
        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={active ? 9 : c.streamType === "portal" ? 8 : 6}
            pathOptions={{
              color: active ? "#ffffff" : TYPE_COLOR[c.streamType],
              fillColor: TYPE_COLOR[c.streamType],
              fillOpacity: 0.85,
              weight: active ? 3 : 1,
            }}
            eventHandlers={{ click: () => onSelect(c) }}
          >
            <Popup>
              <strong>{c.name}</strong>
              <br />
              {c.city ? `${c.city}, ` : ""}
              {c.province}
              <br />
              {TYPE_LABEL[c.streamType]} · {c.source}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
