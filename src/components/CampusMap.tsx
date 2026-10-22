import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Spot, UserLocation } from '../types.ts';
import { formatDistance } from '../utils/geo.ts';
import { MapPin, Navigation, Compass, Layers } from 'lucide-react';

interface CampusMapProps {
  spots: Spot[];
  selectedSpotId: string | null;
  onSelectSpot: (spot: Spot) => void;
  onOpenCheckIn: (spot: Spot) => void;
  userLocation: UserLocation | null;
  onUseLocation: () => void;
  isLocating: boolean;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  spots,
  selectedSpotId,
  onSelectSpot,
  onOpenCheckIn,
  userLocation,
  onUseLocation,
  isLocating,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center at Tulane University Uptown Campus (around Howie-T and LBC)
    const map = L.map(mapContainerRef.current, {
      center: [29.9398, -90.1213],
      zoom: 16.5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Invalidate size after layout rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync spot markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    spots.forEach((spot) => {
      const isSelected = spot.id === selectedSpotId;
      
      // Determine badge color based on real reports
      let statusColor = '#64748b'; // slate for no reports
      let statusText = 'No recent reports';
      if (spot.hasRecentReports && spot.currentStatus) {
        if (spot.currentStatus.crowd === 'empty' || spot.currentStatus.crowd === 'light') {
          statusColor = '#059669'; // emerald
          statusText = `${spot.currentStatus.crowd.toUpperCase()} • ${spot.currentStatus.noise}`;
        } else if (spot.currentStatus.crowd === 'moderate') {
          statusColor = '#d97706'; // amber
          statusText = `MODERATE • ${spot.currentStatus.noise}`;
        } else {
          statusColor = '#e11d48'; // rose
          statusText = `${spot.currentStatus.crowd.toUpperCase()} • ${spot.currentStatus.noise}`;
        }
      }

      // Tulane green marker pin with badge
      const markerHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-115 z-50' : 'hover:scale-105'
        }">
          <div class="w-8 h-8 rounded-full shadow-lg border-2 ${
            isSelected ? 'border-amber-400 ring-4 ring-emerald-600/30' : 'border-white'
          } flex items-center justify-center text-white text-xs font-bold transition-all"
               style="background-color: #006747;">
            ${spot.category === 'library' ? '📚' : spot.category === 'cafe' ? '☕' : spot.category === 'student-center' ? '🏛️' : '🏫'}
          </div>
          <div class="absolute -bottom-1 w-2 h-2 rotate-45" style="background-color: #006747;"></div>
          <div class="mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-sm text-white"
               style="background-color: ${statusColor};">
            ${spot.shortName}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-spot-marker',
        html: markerHtml,
        iconSize: [40, 50],
        iconAnchor: [20, 25],
        popupAnchor: [0, -25],
      });

      const marker = L.marker([spot.coordinates.lat, spot.coordinates.lng], {
        icon: customIcon,
      }).addTo(map);

      // Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-800 text-sm max-w-xs';
      popupContent.innerHTML = `
        <div class="font-bold text-base text-emerald-950 mb-0.5">${spot.name}</div>
        <div class="text-xs text-slate-500 mb-2">${spot.address}</div>
        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
          spot.hasRecentReports
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-slate-100 text-slate-600 border border-slate-200'
        }">
          <span class="w-1.5 h-1.5 rounded-full ${
            spot.hasRecentReports ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
          }"></span>
          ${statusText}
        </div>
        ${spot.distanceMeters !== undefined ? `<div class="text-xs text-emerald-700 font-semibold mb-2">📍 ${formatDistance(spot.distanceMeters)}</div>` : ''}
        <div class="text-xs text-slate-600 mb-2 line-clamp-2">${spot.description}</div>
        <div class="flex gap-1.5 mt-2">
          <button id="map-checkin-${spot.id}" class="flex-1 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white py-1.5 px-2 rounded-lg text-xs font-semibold shadow-sm transition">
            Check In Here
          </button>
          <button id="map-details-${spot.id}" class="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg text-xs font-medium transition">
            Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280, closeButton: false });

      marker.on('click', () => {
        onSelectSpot(spot);
      });

      marker.on('popupopen', () => {
        const checkinBtn = document.getElementById(`map-checkin-${spot.id}`);
        if (checkinBtn) {
          checkinBtn.onclick = () => {
            marker.closePopup();
            onOpenCheckIn(spot);
          };
        }
        const detailsBtn = document.getElementById(`map-details-${spot.id}`);
        if (detailsBtn) {
          detailsBtn.onclick = () => {
            onSelectSpot(spot);
          };
        }
      });

      markersRef.current[spot.id] = marker;
    });
  }, [spots, selectedSpotId, onSelectSpot, onOpenCheckIn]);

  // Center on selected spot if changed
  useEffect(() => {
    if (!selectedSpotId || !mapInstanceRef.current) return;
    const spot = spots.find((s) => s.id === selectedSpotId);
    if (spot) {
      mapInstanceRef.current.panTo([spot.coordinates.lat, spot.coordinates.lng], {
        animate: true,
        duration: 0.8,
      });
      const marker = markersRef.current[spot.id];
      if (marker && !marker.isPopupOpen()) {
        marker.openPopup();
      }
    }
  }, [selectedSpotId, spots]);

  // Handle user location pulse marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 8,
          fillColor: '#2563eb',
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);
        userMarkerRef.current.bindPopup('<b>You are here</b><br/>GPS Distance calculated locally');
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  const recenterCampus = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([29.9398, -90.1213], 16.5, { animate: true });
    }
  };

  const focusUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17, { animate: true });
    } else {
      onUseLocation();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

      {/* Floating Map Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <button
          onClick={focusUser}
          disabled={isLocating}
          className="bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-md border border-slate-200 text-slate-700 hover:text-emerald-800 hover:bg-white active:scale-95 transition flex items-center justify-center"
          title="Center My Location"
          aria-label="Center My Location"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-600' : userLocation ? 'text-blue-600 fill-blue-600' : ''}`} />
        </button>
        <button
          onClick={recenterCampus}
          className="bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-md border border-slate-200 text-slate-700 hover:text-emerald-800 hover:bg-white active:scale-95 transition flex items-center justify-center"
          title="Recenter Tulane Uptown Campus"
          aria-label="Recenter Tulane Uptown Campus"
        >
          <Compass className="w-4 h-4 text-emerald-800" />
        </button>
      </div>

      {/* Map Legend Footer */}
      <div className="absolute bottom-2 left-2 right-2 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between text-[11px] text-slate-600 overflow-x-auto gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Open/Light
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Busy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span> No Recent Reports
          </span>
        </div>
        <span className="text-slate-400 text-[10px] hidden sm:inline">OSM Free Map</span>
      </div>
    </div>
  );
};
