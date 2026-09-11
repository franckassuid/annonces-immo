import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CITIES, geocode, setPhoto } from '../utils';

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
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {label} 
        <span className="star-score">{value ? `${value}/10` : '—'}</span>
      </label>
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
    <div className="photo-upload">
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
            JPG · PNG · WEBP
          </div>
        </>
      )}
    </div>
  );
}

const SAMPLE_JSON = {
  titre: "T3 lumineux avec balcon vue dégagée - Proche Tram B",
  prix: 1250,
  surface: 68,
  pieces: 3,
  chambres: 2,
  dpe: "C",
  exterieur: "balcon",
  ville: "Bordeaux",
  adresse: "15 Rue Sainte-Catherine",
  statut: "visite",
  source: "Le Bon Coin",
  url: "https://www.leboncoin.fr/locations/2481928341.htm",
  agenceType: "agence",
  agenceNom: "Immobilier Bordelais",
  cnom: "Thomas Mercier",
  ctel: "06 12 34 56 78",
  visitDate: "2026-09-18T14:30",
  scoreFranck: 8,
  scoreLaura: 9,
  notes: "Parquet ancien rénové, double vitrage récent, cave privative. Très calme.",
  photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop"
};

export default function AddWizard({ onToast }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('wizard'); // 'wizard' | 'json'
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // JSON Import state
  const [jsonText, setJsonText] = useState('');
  const [jsonStatus, setJsonStatus] = useState(null); // { valid: bool, msg: string }

  // Form State
  const [formData, setFormData] = useState({
    source: '', statut: 'appeler', titre: '', url: '', agenceType: '', agenceNom: '',
    adresse: '', ville: '', villeCustom: '',
    prix: '', surface: '', pieces: '', chambres: '', dpe: '', exterieur: '',
    cnom: '', ctel: '',
    notes: '', scoreFranck: 0, scoreLaura: 0, visitDate: '', rappelTitre: '', rappelDate: ''
  });
  const [photo, setPhotoState] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getVille = () => formData.ville === '__autre' ? formData.villeCustom : formData.ville;

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 4) setStep(step + 1);
    else submit();
  };

  const submit = async () => {
    setSaving(true);
    const ville = getVille();
    const { adresse } = formData;
    
    let lat = null, lng = null;
    const q = [adresse, ville].filter(Boolean).join(', ');
    if (q) {
      const geo = await geocode(q);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }

    const data = {
      ...formData,
      ville, lat, lng,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fav: false
    };
    delete data.villeCustom;

    try {
      const ref = await addDoc(collection(db, 'annonces'), data);
      if (photo) setPhoto(ref.id, photo);
      onToast('✅ Annonce ajoutée avec succès !');
      navigate(`/annonce/${ref.id}`);
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'enregistrement');
      setSaving(false);
    }
  };

  // ── JSON Import Handlers ──
  const handleJsonChange = (text) => {
    setJsonText(text);
    if (!text.trim()) {
      setJsonStatus(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const isArr = Array.isArray(parsed);
      const count = isArr ? parsed.length : 1;
      setJsonStatus({ valid: true, msg: `✓ JSON valide (${count} annonce${count > 1 ? 's' : ''})` });
    } catch (err) {
      setJsonStatus({ valid: false, msg: `⚠️ Erreur de syntaxe JSON : ${err.message}` });
    }
  };

  const handleLoadSample = () => {
    const formatted = JSON.stringify(SAMPLE_JSON, null, 2);
    handleJsonChange(formatted);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_JSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_annonce.json';
    a.click();
    URL.revokeObjectURL(url);
    onToast('💾 Modèle JSON téléchargé');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      handleJsonChange(ev.target.result);
      onToast(`📂 Fichier ${file.name} chargé`);
    };
    reader.readAsText(file);
  };

  const handleImportJson = async () => {
    if (!jsonText.trim()) {
      onToast('⚠️ Veuillez coller ou charger un fichier JSON');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      onToast('⚠️ Le JSON est invalide, vérifiez la syntaxe');
      return;
    }

    setSaving(true);
    const items = Array.isArray(parsed) ? parsed : [parsed];

    try {
      let lastId = null;
      for (const item of items) {
        const ville = item.ville || '';
        const adresse = item.adresse || '';
        let lat = item.lat || null, lng = item.lng || null;

        if (!lat && (adresse || ville)) {
          const geo = await geocode([adresse, ville].filter(Boolean).join(', '));
          if (geo) { lat = geo.lat; lng = geo.lng; }
        }

        const cleanData = {
          titre: item.titre || 'Annonce importée',
          prix: item.prix ? String(item.prix) : '',
          surface: item.surface ? String(item.surface) : '',
          pieces: item.pieces ? String(item.pieces) : '',
          chambres: item.chambres ? String(item.chambres) : '',
          dpe: item.dpe || 'Non renseigné',
          exterieur: item.exterieur || '',
          statut: item.statut || 'appeler',
          source: item.source || '',
          url: item.url || '',
          agenceType: item.agenceType || '',
          agenceNom: item.agenceNom || '',
          cnom: item.cnom || '',
          ctel: item.ctel || '',
          visitDate: item.visitDate || '',
          scoreFranck: Number(item.scoreFranck) || 0,
          scoreLaura: Number(item.scoreLaura) || 0,
          notes: item.notes || '',
          adresse, ville, lat, lng,
          fav: !!item.fav,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const ref = await addDoc(collection(db, 'annonces'), cleanData);
        lastId = ref.id;

        if (item.photo) {
          setPhoto(ref.id, item.photo);
        }
      }

      onToast(`✅ ${items.length} annonce${items.length > 1 ? 's' : ''} importée${items.length > 1 ? 's' : ''} !`);
      if (items.length === 1 && lastId) {
        navigate(`/annonce/${lastId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'import');
      setSaving(false);
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <button className="btn-ghost" onClick={() => navigate('/')}>← Retour</button>
        <h2>Nouvelle annonce</h2>
        {mode === 'wizard' ? (
          <div className="wizard-steps">
            {[1,2,3,4].map(num => (
              <div key={num} className={`wizard-dot ${step >= num ? 'active' : ''}`} />
            ))}
          </div>
        ) : (
          <span className="import-badge-tag">Format JSON</span>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="mode-toggle-tabs">
        <button
          type="button"
          className={`mode-tab ${mode === 'wizard' ? 'active' : ''}`}
          onClick={() => setMode('wizard')}
        >
          📝 Formulaire guidé
        </button>
        <button
          type="button"
          className={`mode-tab ${mode === 'json' ? 'active' : ''}`}
          onClick={() => setMode('json')}
        >
          📥 Importer un JSON
        </button>
      </div>

      <div className="wizard-card">
        {mode === 'json' ? (
          <div className="json-import-panel slide-in">
            <div className="json-panel-head">
              <div>
                <h3>Importer une annonce via JSON</h3>
                <p className="json-panel-desc">
                  Glissez un fichier <code>.json</code> ou collez directement votre code ci-dessous.
                </p>
              </div>
            </div>

            <div className="json-quick-actions">
              <label className="btn-json-action upload">
                📂 Parcourir un fichier .json
                <input type="file" accept=".json,application/json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
              <button type="button" className="btn-json-action" onClick={handleLoadSample}>
                📋 Charger l'exemple complet
              </button>
              <button type="button" className="btn-json-action" onClick={handleDownloadTemplate}>
                💾 Télécharger modèle .json
              </button>
            </div>

            <div className="json-editor-wrap">
              <textarea
                className="json-textarea"
                rows={12}
                placeholder="Collez ici votre objet JSON ou tableau d'objets..."
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
              />
              {jsonStatus && (
                <div className={`json-status-banner ${jsonStatus.valid ? 'valid' : 'invalid'}`}>
                  {jsonStatus.msg}
                </div>
              )}
            </div>

            <div className="wizard-footer">
              <button type="button" className="btn-ghost" onClick={() => setMode('wizard')}>
                Retour au formulaire
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleImportJson}
                disabled={saving || (jsonStatus && !jsonStatus.valid)}
              >
                {saving ? '⏳ Import en cours...' : '🚀 Importer l\'annonce'}
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleNext}>
          {step === 1 && (
            <div className="wizard-step slide-in">
              <h3>🏷 Étape 1 : Identité du bien</h3>
              <div className="fg">
                <label>Titre de l'annonce *</label>
                <input name="titre" type="text" placeholder="T3 45 m² proche tram B..." value={formData.titre} onChange={handleChange} required autoFocus />
              </div>
              <div className="frow-compact">
                <div className="fg">
                  <label>Statut *</label>
                  <select name="statut" value={formData.statut} onChange={handleChange} required>
                    <option value="appeler">📞 À appeler</option>
                    <option value="visite">👁 Visite prévue</option>
                    <option value="dossier">📁 Dossier en cours</option>
                    <option value="attente">⏳ En attente</option>
                  </select>
                </div>
                <div className="fg">
                  <label>Source</label>
                  <select name="source" value={formData.source} onChange={handleChange}>
                    <option value="">— Choisir —</option>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {formData.statut === 'visite' && (
                <div className="fg highlight-field">
                  <label>📅 Date et heure de visite prévue</label>
                  <input
                    name="visitDate"
                    type="datetime-local"
                    value={formData.visitDate}
                    onChange={handleChange}
                  />
                </div>
              )}
              <div className="fg">
                <label>Lien de l'annonce</label>
                <input name="url" type="url" placeholder="https://..." value={formData.url} onChange={handleChange} />
              </div>
              <div className="frow-compact">
                <div className="fg">
                  <label>Contact</label>
                  <select name="agenceType" value={formData.agenceType} onChange={handleChange}>
                    <option value="">— Type —</option>
                    <option value="particulier">👤 Particulier</option>
                    <option value="agence">🏢 Agence</option>
                  </select>
                </div>
                <div className="fg">
                  <label>Nom agence / proprio</label>
                  <input name="agenceNom" type="text" placeholder="Century 21..." value={formData.agenceNom} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step slide-in">
              <h3>📍 Étape 2 : Localisation</h3>
              <div className="fg">
                <label>Adresse <span style={{ fontWeight:400, color:'var(--text-3)' }}>(optionnelle)</span></label>
                <input name="adresse" type="text" placeholder="12 rue des Lilas..." value={formData.adresse} onChange={handleChange} autoFocus />
              </div>
              <div className="fg">
                <label>Ville</label>
                <select name="ville" value={formData.ville} onChange={handleChange}>
                  <option value="">— Choisir —</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__autre">Autre ville…</option>
                </select>
                {formData.ville === '__autre' && (
                  <input name="villeCustom" type="text" placeholder="Saisir la ville" value={formData.villeCustom} onChange={handleChange} style={{ marginTop: 6 }} required />
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step slide-in">
              <h3>📐 Étape 3 : Le Bien & Contact</h3>
              <div className="frow-compact">
                <div className="fg">
                  <label>Loyer (€/m)</label>
                  <input name="prix" type="number" placeholder="1200" value={formData.prix} onChange={handleChange} autoFocus />
                </div>
                <div className="fg">
                  <label>Surface (m²)</label>
                  <input name="surface" type="number" placeholder="45" value={formData.surface} onChange={handleChange} />
                </div>
              </div>
              <div className="frow-compact-3">
                <div className="fg">
                  <label>Pièces</label>
                  <input name="pieces" type="number" placeholder="3" value={formData.pieces} onChange={handleChange} />
                </div>
                <div className="fg">
                  <label>Chambres</label>
                  <input name="chambres" type="number" placeholder="2" value={formData.chambres} onChange={handleChange} />
                </div>
                <div className="fg">
                  <label>DPE</label>
                  <select name="dpe" value={formData.dpe} onChange={handleChange}>
                    <option value="">—</option>
                    <option value="Non renseigné">Non renseig.</option>
                    {['A','B','C','D','E','F','G'].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg">
                <label>Extérieur</label>
                <select name="exterieur" value={formData.exterieur} onChange={handleChange}>
                  <option value="">Aucun</option>
                  {EXT_OPT.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="frow-compact" style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border-2)' }}>
                <div className="fg">
                  <label>Contact</label>
                  <input name="cnom" type="text" placeholder="M. Martin" value={formData.cnom} onChange={handleChange} />
                </div>
                <div className="fg">
                  <label>Téléphone</label>
                  <input name="ctel" type="tel" placeholder="06 12 34 56 78" value={formData.ctel} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step slide-in">
              <h3>📷 Étape 4 : Photo & Avis</h3>
              <PhotoUpload photo={photo} onChange={setPhotoState} onClear={() => setPhotoState('')} />
              <div className="fg" style={{ marginTop: 8 }}>
                <label>Notes & impressions</label>
                <textarea name="notes" placeholder="Lumineux, étage élevé, cave..." rows={2} value={formData.notes} onChange={handleChange} />
              </div>
              <div className="frow-compact" style={{ marginTop: 8 }}>
                <StarPicker label="Note Franck 🧔" value={formData.scoreFranck} onChange={(v) => setFormData(p => ({...p, scoreFranck: v}))} />
                <StarPicker label="Note Laura 👩"  value={formData.scoreLaura}  onChange={(v) => setFormData(p => ({...p, scoreLaura: v}))} />
              </div>
            </div>
          )}

          <div className="wizard-footer">
            {step > 1 ? (
              <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>
                Précédent
              </button>
            ) : <div />}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? '⏳ En cours...' : (step < 4 ? 'Suivant →' : '💾 Terminer')}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
