import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STATUS, formatPrice, getAnnonceCoords } from '../utils';

export default function MapView({ annonces = [], onEdit }) {
  const mapContainerRef = useRef(null);
  const lmapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const lmap = L.map(mapContainerRef.current, {
      zoomControl: true,
    }).setView([44.8378, -0.5792], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(lmap);

    lmapRef.current = lmap;

    // Force redraw once DOM layout is settled
    const timer = setTimeout(() => {
      lmap.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      lmap.remove();
      lmapRef.current = null;
    };
  }, []);

  // Update markers when annonces change
  useEffect(() => {
    const lmap = lmapRef.current;
    if (!lmap) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const visibleList = [];

    annonces.forEach((a) => {
      const coords = getAnnonceCoords(a);
      if (!coords) return;

      visibleList.push({ ...a, coords });
      const s = STATUS[a.statut] ?? STATUS.appeler;

      const ico = L.divIcon({
        className: 'custom-map-icon',
        html: `<div class="map-pin" style="background:${s.color}; box-shadow: 0 2px 8px ${s.color}66;">
                 <span>🏠</span>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: ico }).addTo(lmap);
      markersRef.current.push(marker);

      const priceText = a.prix ? `${formatPrice(a.prix)} €/m` : '';
      const specs = [
        a.surface ? `${a.surface} m²` : '',
        a.pieces ? `${a.pieces} p.` : '',
        a.chambres ? `${a.chambres} ch.` : '',
      ].filter(Boolean).join(' · ');

      marker.bindPopup(`
        <div class="map-popup-card">
          <div class="map-popup-head">
            <span class="map-popup-city">📍 ${a.ville || 'Gironde'}</span>
            <span class="map-popup-stat" style="background:${s.bg};color:${s.color}">${s.label}</span>
          </div>
          <h4 class="map-popup-title">${a.titre || 'Bien immobilier'}</h4>
          <div class="map-popup-meta">
            ${priceText ? `<strong class="map-popup-price">${priceText}</strong>` : ''}
            ${specs ? `<span class="map-popup-specs">${specs}</span>` : ''}
          </div>
          <div class="map-popup-actions">
            <button class="map-popup-btn" id="map-edit-btn-${a.id}">
              Consulter la fiche ➔
            </button>
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`map-edit-btn-${a.id}`);
        if (btn) {
          btn.onclick = () => onEdit(a.id);
        }
      });
    });

    if (visibleList.length > 0) {
      try {
        const bounds = L.latLngBounds(visibleList.map((v) => [v.coords.lat, v.coords.lng]));
        lmap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch (_) {}
    }
  }, [annonces, onEdit]);

  return (
    <div className="map-wrapper-view">
      <div className="map-view-container" ref={mapContainerRef} />
    </div>
  );
}
