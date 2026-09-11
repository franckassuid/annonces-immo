import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STATUS, formatPrice } from '../utils';

export default function MapView({ annonces, onEdit }) {
  const mapRef  = useRef(null);
  const lmapRef = useRef(null);

  useEffect(() => {
    if (lmapRef.current) return;
    lmapRef.current = L.map(mapRef.current).setView([44.84, -0.58], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(lmapRef.current);
  }, []);

  useEffect(() => {
    const lmap = lmapRef.current;
    if (!lmap) return;

    // Clear old markers
    lmap.eachLayer((l) => { if (l instanceof L.Marker) l.remove(); });

    const visible = annonces.filter((a) => a.lat && a.lng);
    visible.forEach((a) => {
      const s = STATUS[a.statut] ?? STATUS.appeler;

      const ico = L.divIcon({
        className: '',
        html: `<div class="map-pin" style="background:${s.pin}">🏠</div>`,
        iconSize:   [28, 28],
        iconAnchor: [14, 14],
        popupAnchor:[0, -18],
      });

      const marker = L.marker([a.lat, a.lng], { icon: ico }).addTo(lmap);

      marker.bindPopup(`
        <div class="popup-city">${a.ville || ''}</div>
        <div class="popup-title">${a.titre || 'Annonce'}</div>
        ${a.prix ? `<div class="popup-price">${formatPrice(a.prix)} €/mois</div>` : ''}
        <span class="popup-stat" style="background:${s.bg};color:${s.color}">${s.label}</span><br/>
        <button class="popup-edit" id="popup-edit-${a.id}">✏️ Modifier</button>
      `);

      marker.on('popupopen', () => {
        document.getElementById(`popup-edit-${a.id}`)
          ?.addEventListener('click', () => onEdit(a.id));
      });
    });

    if (visible.length) {
      lmap.fitBounds(
        L.latLngBounds(visible.map((a) => [a.lat, a.lng])),
        { padding: [50, 50], maxZoom: 14 }
      );
    }
  }, [annonces]);

  return (
    <div className="map-wrap">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
