import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default icons
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  label?: string;
}

function LocationMarker({ onSelect, initialPos }: { onSelect: (lat: number, lng: number) => void, initialPos: [number, number] | null }) {
  const [position, setPosition] = useState<L.LatLng | null>(initialPos ? L.latLng(initialPos) : null);
  const map = useMap();

  useEffect(() => {
    if (initialPos) {
      map.setView(initialPos, 13);
      setPosition(L.latLng(initialPos));
    }
  }, [initialPos, map]);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function LocationPicker({ initialLat, initialLng, onLocationSelect, label }: LocationPickerProps) {
  const defaultCenter: [number, number] = [14.5995, 120.9842]; 
  const center = initialLat && initialLng ? [initialLat, initialLng] as [number, number] : defaultCenter;

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 z-0 relative">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onSelect={onLocationSelect} initialPos={initialLat && initialLng ? [initialLat, initialLng] : null} />
        </MapContainer>
      </div>
    </div>
  );
}