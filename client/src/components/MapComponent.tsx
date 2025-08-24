import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapComponentProps {
  height?: string;
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    popup?: string;
    priority?: "alta" | "media" | "baixa";
  }>;
  draggableMarker?: {
    lat: number;
    lng: number;
    onDrag?: (lat: number, lng: number) => void;
  };
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export function MapComponent({
  height = "400px",
  center = [-23.2017, -47.2911],
  zoom = 13,
  markers = [],
  draggableMarker,
  onMapClick,
  className = ""
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<any>(null);
  const draggableMarkerRef = useRef<L.Marker | null>(null);

  // Custom tree icons
  const getTreeIcon = (priority: string) => {
    const color = priority === "alta" ? "#ef4444" : priority === "media" ? "#f59e0b" : "#10b981";
    return L.divIcon({
      html: `<div style="background-color: ${color}; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
               <i class="fas fa-tree" style="color: white; font-size: 10px;"></i>
             </div>`,
      className: "custom-tree-icon",
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    // Initialize marker cluster group
    markersGroupRef.current = (L as any).markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });
    mapInstanceRef.current.addLayer(markersGroupRef.current);

    // Add map click handler
    if (onMapClick) {
      mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when markers prop changes
  useEffect(() => {
    if (!markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    markers.forEach(marker => {
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: getTreeIcon(marker.priority || "baixa")
      });

      if (marker.popup) {
        leafletMarker.bindPopup(marker.popup);
      }

      markersGroupRef.current!.addLayer(leafletMarker);
    });
  }, [markers]);

  // Update draggable marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing draggable marker
    if (draggableMarkerRef.current) {
      mapInstanceRef.current.removeLayer(draggableMarkerRef.current);
      draggableMarkerRef.current = null;
    }

    // Add new draggable marker if provided
    if (draggableMarker) {
      draggableMarkerRef.current = L.marker([draggableMarker.lat, draggableMarker.lng], {
        draggable: true
      }).addTo(mapInstanceRef.current);

      draggableMarkerRef.current.on('dragend', (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        draggableMarker.onDrag?.(position.lat, position.lng);
      });

      // Center map on draggable marker
      mapInstanceRef.current.setView([draggableMarker.lat, draggableMarker.lng]);
    }
  }, [draggableMarker]);

  return (
    <div 
      ref={mapRef} 
      style={{ height }} 
      className={`rounded-lg border border-gray-300 ${className}`}
    />
  );
}
