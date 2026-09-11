import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { CITIES, buildGcalUrl, geocode, setPhoto, clearPhoto, getPhoto } from '../utils';

const SOURCES = ['Le Bon Coin','Jinka','SeLoger','Bien\'ici','PAP','Logic-Immo','Autre'];
const EXT_OPT = [
  { value:'balcon',         label:'🪟 Balcon' },
  { value:'terrasse',       label:'☀️ Terrasse' },
  { value:'grande-terrasse',label:'🌅 Grande terrasse' },
  { value:'jardin',         label:'🌿 Jardin' },
  { value:'grand-jardin',   label:'🌳 Grand jardin' },
];

/* ── StarPicker ── */
function StarPicker({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="fg">
      <label>{label}</label>
      <div className="star-picker-wrap">
        <div className="star-picker">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n} type="button"
              className={`star-btn${n <= (hover || value) ? ' lit' : ''}`}
              onClick={() => onChange(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
            >★</button>
          ))}
        </div>
        <span className="star-score">{value ? `${value}/10` : '—'}</span>
      </div>
    </div>
  );
}

/* ── PhotoUpload ── */
function PhotoUpload({ photo, onChange, onClear }) {
  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 800; let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        onChange(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="photo-upload" style={{ position:'relative' }}>
      {photo ? (
        <>
          <img src={photo} className="photo-preview-img" alt="preview" />
          <button type="button" className="photo-remove-btn" onClick={(e) => { e.stopPropagation(); onClear(); }}>
            ✕ Supprimer
          </button>
        </>
      ) : (
        <>
          <input type="file" accept="image/*" onChange={handleFile} />
          <div className="photo-upload-text">
            <strong>📷 Choisir une photo</strong>
            JPG · PNG · WEBP — stockée localement
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main Modal ── */
export default function AnnonceModal({ editId, annonces, onClose, onToast, setSyncState }) {
  const editData = editId ? annonces.find((a) => a.id === editId) : null;

  const [saving,    setSaving]    = useState(false);
  const [photo,     setPhotoState]= useState('');
  const [villeCustom, setVilleCustom] = useState(false);
  const [scoreFranck, setScoreFranck] = useState(0);
  const [scoreLaura,  setScoreLaura]  = useState(0);

  // form ref
  const formRef = useRef(null);

  useEffect(() => {
    if (!editData) {
      setScoreFranck(0); setScoreLaura(0); setPhotoState(''); setVilleCustom(false);
      return;
    }
    setScoreFranck(+editData.scoreFranck || 0);
    setScoreLaura(+editData.scoreLaura   || 0);
    setPhotoState(editData.photo || '');
    setVilleCustom(editData.ville ? !CITIES.includes(editData.ville) : false);
  }, [editId]);

  function gv(name) {
    return (formRef.current?.elements[name]?.value || '').trim();
  }

  function getVille() {
    const sel = gv('villeSelect');
    return sel === '__autre' ? gv('villeCustom') : sel;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setSyncState('syncing');

    const adresse = gv('adresse');
    const ville   = getVille();
    const cp      = gv('cp');

    // Geocode
    let lat = null, lng = null;
    if (editData?.lat && editData.ville === ville && editData.adresse === adresse) {
      lat = editData.lat; lng = editData.lng;
    } else {
      const q = [adresse, cp, ville].filter(Boolean).join(', ');
      if (q) { const geo = await geocode(q); if (geo) { lat = geo.lat; lng = geo.lng; } }
    }

    const data = {
      source:      gv('source'),
      statut:      gv('statut'),
      titre:       gv('titre'),
      url:         gv('url'),
      agenceType:  gv('agenceType'),
      agenceNom:   gv('agenceNom'),
      adresse, ville, cp, lat, lng,
      prix:        gv('prix'),
      surface:     gv('surface'),
      pieces:      gv('pieces'),
      chambres:    gv('chambres'),
      dpe:         gv('dpe'),
      exterieur:   gv('exterieur'),
      cnom:        gv('cnom'),
      ctel:        gv('ctel'),
      visitDate:   gv('visitDate'),
      rappelTitre: gv('rappelTitre'),
      rappelDate:  gv('rappelDate'),
      notes:       gv('notes'),
      scoreFranck, scoreLaura,
      updatedAt:   new Date().toISOString(),
    };

    try {
      if (editId) {
        await updateDoc(doc(db, 'annonces', editId), data);
        if (photo) setPhoto(editId, photo);
        else clearPhoto(editId);
      } else {
        data.createdAt = new Date().toISOString();
        data.fav = false;
        const ref = await addDoc(collection(db, 'annonces'), data);
        if (photo) setPhoto(ref.id, photo);
      }
      onToast(editId ? '✅ Annonce modifiée' : '✅ Annonce ajoutée');
      onClose();
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'enregistrement');
    }

    setSaving(false); setSyncState('ok');
  }

  function openGcalVisite() {
    const dt = gv('visitDate'), titre = gv('titre') || 'Annonce';
    const loc = gv('adresse') || getVille();
    if (!dt) { onToast('⚠️ Date de visite requise'); return; }
    window.open(buildGcalUrl(`Visite · ${titre}`, dt, 60, loc, gv('url')), '_blank');
  }
  function openGcalRappel() {
    const titre = gv('rappelTitre'), dt = gv('rappelDate');
    if (!titre || !dt) { onToast('⚠️ Titre et date requis'); return; }
    window.open(buildGcalUrl(titre, dt, 30, getVille(), ''), '_blank');
  }

  const villeValue = editData?.ville
    ? (CITIES.includes(editData.ville) ? editData.ville : '__autre')
    : '';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editId ? "Modifier l'annonce" : 'Nouvelle annonce'}</h2>
          <button className="modal-close" type="button" onClick={onClose}>✕</button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* ── Identité ── */}
            <div className="fsec">
              <div className="fsec-hd">🏷 Identité</div>
              <div className="fsec-bd">
                <div className="frow">
                  <div className="fg">
                    <label>Site source</label>
                    <select name="source" defaultValue={editData?.source || ''}>
                      <option value="">— Choisir —</option>
                      {SOURCES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label>Statut *</label>
                    <select name="statut" defaultValue={editData?.statut || 'appeler'} required>
                      <option value="appeler">📞 À appeler</option>
                      <option value="visite">👁 Visite prévue</option>
                      <option value="dossier">📁 Dossier en cours</option>
                      <option value="attente">⏳ En attente</option>
                      <option value="refuse">❌ Refusé</option>
                      <option value="ok">✅ Accepté</option>
                    </select>
                  </div>
                </div>
                <div className="fg">
                  <label>Titre *</label>
                  <input name="titre" type="text" placeholder="T3 45 m² proche tram B, lumineux" defaultValue={editData?.titre || ''} required />
                </div>
                <div className="fg">
                  <label>Lien annonce</label>
                  <input name="url" type="url" placeholder="https://…" defaultValue={editData?.url || ''} />
                </div>
                <div className="frow">
                  <div className="fg">
                    <label>Type</label>
                    <select name="agenceType" defaultValue={editData?.agenceType || ''}>
                      <option value="">—</option>
                      <option value="particulier">👤 Particulier</option>
                      <option value="agence">🏢 Agence</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label>Nom agence / propriétaire</label>
                    <input name="agenceNom" type="text" placeholder="Century 21…" defaultValue={editData?.agenceNom || ''} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Localisation ── */}
            <div className="fsec">
              <div className="fsec-hd">📍 Localisation</div>
              <div className="fsec-bd">
                <div className="fg">
                  <label>Adresse <span style={{ fontWeight:400, color:'var(--text-3)' }}>(optionnelle)</span></label>
                  <input name="adresse" type="text" placeholder="12 rue des Lilas — laisser vide si inconnue" defaultValue={editData?.adresse || ''} />
                </div>
                <div className="frow">
                  <div className="fg">
                    <label>Ville</label>
                    <select
                      name="villeSelect"
                      defaultValue={villeValue}
                      onChange={(e) => setVilleCustom(e.target.value === '__autre')}
                    >
                      <option value="">— Choisir —</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      <option value="__autre">Autre ville…</option>
                    </select>
                    {villeCustom && (
                      <input
                        name="villeCustom" type="text" placeholder="Saisir la ville"
                        defaultValue={editData && !CITIES.includes(editData.ville) ? editData.ville : ''}
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </div>
                  <div className="fg">
                    <label>Code postal</label>
                    <input name="cp" type="text" placeholder="33000" defaultValue={editData?.cp || ''} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Détails ── */}
            <div className="fsec">
              <div className="fsec-hd">📐 Détails du bien</div>
              <div className="fsec-bd">
                <div className="frow">
                  <div className="fg">
                    <label>Loyer (€/mois)</label>
                    <input name="prix" type="number" placeholder="1 200" min="0" defaultValue={editData?.prix || ''} />
                  </div>
                  <div className="fg">
                    <label>Surface (m²)</label>
                    <input name="surface" type="number" placeholder="45" min="0" defaultValue={editData?.surface || ''} />
                  </div>
                </div>
                <div className="frow3">
                  <div className="fg">
                    <label>Pièces</label>
                    <input name="pieces" type="number" placeholder="3" min="1" defaultValue={editData?.pieces || ''} />
                  </div>
                  <div className="fg">
                    <label>Chambres</label>
                    <input name="chambres" type="number" placeholder="2" min="0" defaultValue={editData?.chambres || ''} />
                  </div>
                  <div className="fg">
                    <label>DPE</label>
                    <select name="dpe" defaultValue={editData?.dpe || ''}>
                      <option value="">—</option>
                      {['A','B','C','D','E','F','G'].map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fg">
                  <label>Extérieur</label>
                  <select name="exterieur" defaultValue={editData?.exterieur || ''}>
                    <option value="">Aucun</option>
                    {EXT_OPT.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Contact ── */}
            <div className="fsec">
              <div className="fsec-hd">📞 Contact</div>
              <div className="fsec-bd">
                <div className="frow">
                  <div className="fg">
                    <label>Nom</label>
                    <input name="cnom" type="text" placeholder="M. Martin" defaultValue={editData?.cnom || ''} />
                  </div>
                  <div className="fg">
                    <label>Téléphone</label>
                    <input name="ctel" type="tel" placeholder="06 12 34 56 78" defaultValue={editData?.ctel || ''} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Agenda ── */}
            <div className="fsec">
              <div className="fsec-hd">📅 Agenda</div>
              <div className="fsec-bd">
                <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
                  <div className="fg" style={{ flex:1, minWidth:200 }}>
                    <label>Date de visite</label>
                    <input name="visitDate" type="datetime-local" defaultValue={editData?.visitDate || ''} />
                  </div>
                  <button type="button" className="btn-gcal" onClick={openGcalVisite}>📅 Agenda</button>
                </div>
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:10, display:'flex', flexDirection:'column', gap:10 }}>
                  <label style={{ fontSize:'.74rem', fontWeight:700, color:'var(--text-3)' }}>Rappel personnalisé</label>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
                    <div className="fg" style={{ flex:1, minWidth:160 }}>
                      <label>Titre</label>
                      <input name="rappelTitre" type="text" placeholder="Rappeler l'agence…" defaultValue={editData?.rappelTitre || ''} />
                    </div>
                    <div className="fg" style={{ flex:1, minWidth:180 }}>
                      <label>Date & heure</label>
                      <input name="rappelDate" type="datetime-local" defaultValue={editData?.rappelDate || ''} />
                    </div>
                    <button type="button" className="btn-gcal" onClick={openGcalRappel}>📅 Agenda</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Photo ── */}
            <div className="fsec">
              <div className="fsec-hd">📷 Photo</div>
              <div className="fsec-bd">
                <PhotoUpload
                  photo={photo}
                  onChange={setPhotoState}
                  onClear={() => setPhotoState('')}
                />
              </div>
            </div>

            {/* ── Notes & Avis ── */}
            <div className="fsec">
              <div className="fsec-hd">💬 Notes & Avis</div>
              <div className="fsec-bd">
                <div className="fg">
                  <label>Notes libres</label>
                  <textarea name="notes" placeholder="Lumineux, étage élevé, pas d'ascenseur…" defaultValue={editData?.notes || ''} />
                </div>
                <StarPicker label="Note Franck 🧔 (sur 10)" value={scoreFranck} onChange={setScoreFranck} />
                <StarPicker label="Note Laura 👩 (sur 10)"  value={scoreLaura}  onChange={setScoreLaura}  />
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary dark" disabled={saving}>
              {saving ? '⏳ Enregistrement…' : '💾 Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
