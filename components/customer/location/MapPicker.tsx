"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    L?: {
      map: (...args: unknown[]) => unknown;
      tileLayer: (...args: unknown[]) => { addTo: (...args: unknown[]) => void };
      marker: (...args: unknown[]) => {
        addTo: (...args: unknown[]) => unknown;
        setLatLng: (...args: unknown[]) => void;
      };
    };
  }
}

interface Props {
  isOpen: boolean;
  userCoords: { lat: number; lng: number } | null;
  onConfirm: (coords: { lat: number; lng: number }) => Promise<void>;
  onClose: () => void;
}

export default function MapPicker({ isOpen, userCoords, onConfirm, onClose }: Props) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{
    setView: (coords: [number, number], zoom: number) => void;
    on: (event: string, handler: (evt: { latlng?: { lat?: number; lng?: number } }) => void) => void;
    remove: () => void;
  } | null>(null);
  const mapMarkerRef = useRef<{ setLatLng: (coords: [number, number]) => void } | null>(null);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [tileError, setTileError] = useState("");

  const loadLeaflet = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (window.L) return true;
    const existingCss = document.getElementById("leaflet-css");
    if (!existingCss) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }
    await new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById("leaflet-js") as HTMLScriptElement | null;
      if (existingScript) {
        if (window.L) { resolve(); return; }
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Leaflet load failed")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Leaflet load failed"));
      document.body.appendChild(script);
    });
    return Boolean(window.L);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      const loaded = await loadLeaflet().catch(() => false);
      if (!loaded || cancelled || !mapHostRef.current || mapRef.current || !window.L) return;
      const centerLat = userCoords?.lat ?? 12.9716;
      const centerLng = userCoords?.lng ?? 77.5946;
      const map = window.L.map(mapHostRef.current, { zoomControl: true }) as {
        setView: (coords: [number, number], zoom: number) => void;
        on: (event: string, handler: (evt: { latlng?: { lat?: number; lng?: number } }) => void) => void;
        off: (event: string, handler: (...args: unknown[]) => void) => void;
        invalidateSize: () => void;
        remove: () => void;
      };
      map.setView([centerLat, centerLng], 13);

      const primaryLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }) as {
        addTo: (target: unknown) => void;
        on: (event: string, handler: (...args: unknown[]) => void) => void;
      };

      const fallbackLayer = window.L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        }
      ) as {
        addTo: (target: unknown) => void;
      };

      let fallbackAttached = false;
      let tileFailures = 0;
      const onTileError = () => {
        tileFailures += 1;
        if (!fallbackAttached && tileFailures >= 3) {
          fallbackAttached = true;
          fallbackLayer.addTo(map);
          setTileError("Primary tiles failed. Switched to fallback map tiles.");
        }
      };

      primaryLayer.on("tileerror", onTileError);
      primaryLayer.addTo(map);

      // Map opens inside collapsible panels; force reflow so tiles render.
      setTimeout(() => map.invalidateSize(), 150);

      const marker = window.L.marker([centerLat, centerLng]).addTo(map) as {
        setLatLng: (coords: [number, number]) => void;
      };
      mapMarkerRef.current = marker;
      mapRef.current = map;
      setPickedCoords({ lat: centerLat, lng: centerLng });
      map.on("click", (evt: { latlng?: { lat?: number; lng?: number } }) => {
        const lat = evt.latlng?.lat;
        const lng = evt.latlng?.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        marker.setLatLng([lat as number, lng as number]);
        setPickedCoords({ lat: lat as number, lng: lng as number });
      });
    })();
    return () => { cancelled = true; };
  }, [isOpen, loadLeaflet, userCoords]);

  useEffect(() => {
    if (isOpen) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    mapMarkerRef.current = null;
    setPickedCoords(null);
    setTileError("");
  }, [isOpen]);

  const handleCurrentLocation = useCallback(async () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setPickedCoords({ lat, lng });
      mapMarkerRef.current?.setLatLng([lat, lng]);
      mapRef.current?.setView([lat, lng], 15);
    } finally {
      setLocating(false);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Select area on map</p>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
          onClick={onClose}
          aria-label="Close map picker"
        >
          <X size={16} />
        </button>
      </div>
      <div
        ref={mapHostRef}
        className="h-64 w-full overflow-hidden rounded-lg border border-border bg-muted"
      />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {pickedCoords
            ? `Selected: ${pickedCoords.lat.toFixed(5)}, ${pickedCoords.lng.toFixed(5)}`
            : "Click on map to select coordinates."}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg px-3"
            disabled={locating}
            onClick={() => void handleCurrentLocation()}
          >
            {locating ? "Locating..." : "Use current location"}
          </Button>
          <Button
            className="h-9 rounded-lg px-3"
            disabled={!pickedCoords}
            onClick={() => pickedCoords && onConfirm(pickedCoords)}
          >
            Use This Area
          </Button>
          <Button variant="outline" className="h-9 rounded-lg px-3" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
      {tileError ? (
        <p className="mt-2 text-xs text-amber-600">{tileError}</p>
      ) : null}
    </div>
  );
}
