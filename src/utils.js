export const STATUS = {
  appeler: { label: '📞 À appeler',        color: '#b45309', bg: '#fef3c7', pin: '#f59e0b' },
  visite:  { label: '👁 Visite prévue',    color: '#1e40af', bg: '#dbeafe', pin: '#3b82f6' },
  dossier: { label: '📁 Dossier en cours', color: '#5b21b6', bg: '#ede9fe', pin: '#7c3aed' },
  attente: { label: '⏳ En attente',        color: '#374151', bg: '#f3f4f6', pin: '#9ca3af' },
  refuse:  { label: '❌ Refusé',            color: '#991b1b', bg: '#fee2e2', pin: '#ef4444' },
  ok:      { label: '✅ Accepté',           color: '#065f46', bg: '#d1fae5', pin: '#10b981' },
};

export const EXTERIOR = {
  balcon:           '🪟 Balcon',
  terrasse:         '☀️ Terrasse',
  'grande-terrasse':'🌅 Grande terrasse',
  jardin:           '🌿 Jardin',
  'grand-jardin':   '🌳 Grand jardin',
};

export const CITIES = [
  'Bordeaux', 'Talence', 'Pessac', 'Mérignac', 'Bègles',
  "Villenave-d'Ornon", 'Gradignan', 'Le Bouscat',
  'Floirac', 'Cenon', 'Lormont',
];

export function formatPrice(n) {
  return Number(n).toLocaleString('fr-FR');
}

export function buildGcalUrl(title, dt, durationMin, location = '', details = '') {
  if (!dt) return '#';
  const s = new Date(dt);
  const e = new Date(s.getTime() + durationMin * 60_000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(title) +
    '&dates=' + fmt(s) + '/' + fmt(e) +
    (location ? '&location=' + encodeURIComponent(location) : '') +
    (details  ? '&details='  + encodeURIComponent(details)  : '')
  );
}

export function buildAnnonceGcalUrl(annonce) {
  if (!annonce || !annonce.visitDate) return '#';
  const title = `Visite : ${annonce.titre || 'Bien immobilier'} - ${annonce.ville || ''}`;
  const location = [annonce.adresse, annonce.ville].filter(Boolean).join(', ');
  
  const detailLines = [
    '🏢 VISITE IMMOBILIÈRE',
    '----------------------------------',
    `📍 Adresse : ${location || 'Non renseignée'}`,
    `👤 Contact : ${annonce.cnom || annonce.agenceNom || 'Non spécifié'}${annonce.agenceType ? ` (${annonce.agenceType === 'particulier' ? 'Particulier' : 'Agence'})` : ''}`,
    `📞 Téléphone : ${annonce.ctel || 'Non spécifié'}`,
    '',
    `🔗 Fiche complète de l'annonce : ${typeof window !== 'undefined' ? `${window.location.origin}/annonce/${annonce.id}` : ''}`,
    annonce.url ? `🌐 Annonce d'origine : ${annonce.url}` : null,
    annonce.notes ? `\n📝 Notes :\n${annonce.notes}` : null,
  ].filter(line => line !== null).join('\n');

  return buildGcalUrl(title, annonce.visitDate, 60, location, detailLines);
}

export async function geocode(address) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'fr' } }
    );
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
}

// Photos stored in localStorage (keys = 'photo_<id>') to avoid Firestore 1MB doc limit
export const getPhoto  = (id)  => localStorage.getItem(`photo_${id}`) || null;
export const setPhoto  = (id, d) => localStorage.setItem(`photo_${id}`, d);
export const clearPhoto = (id) => localStorage.removeItem(`photo_${id}`);
