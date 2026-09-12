import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { STATUS, EXTERIOR, CITIES, geocode, setPhoto } from '../utils';

const SOURCES = ['Le Bon Coin', 'SeLoger', 'PAP', 'Jinka', 'Bien\'ici', 'Autre'];

const EXT_OPT = [
  { value: 'aucun',            label: '🚫 Aucun' },
  { value: 'balcon',           label: '🪟 Balcon' },
  { value: 'terrasse',         label: '☀️ Terrasse' },
  { value: 'grande-terrasse',  label: '🌅 Grande terrasse' },
  { value: 'jardin',           label: '🌿 Jardin' },
  { value: 'grand-jardin',     label: '🌳 Grand jardin' },
];

const DPE_OPTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Non renseigné'];
const PIECES_OPTS = ['1', '2', '3', '4', '5', '6+'];
const CHAMBRES_OPTS = ['0', '1', '2', '3', '4', '5+'];

function StarPicker({ label, value, onChange }) {
  return (
    <div className="star-picker-wrap">
      <label>{label}</label>
      <div className="star-row">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            type="button"
            key={star}
            className={`star-btn ${value >= star ? 'filled' : ''}`}
            onClick={() => onChange(value === star ? 0 : star)}
            title={`${star}/10`}
          >
            ★
          </button>
        ))}
        <span className="star-score-val">{value ? `${value}/10` : '—'}</span>
      </div>
    </div>
  );
}

function PhotoUpload({ photo, onChange, onClear }) {
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let { width, height } = img;
        if (width > height && width > MAX) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else if (height > MAX) {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        onChange(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="photo-upload-wrap">
      <label>Photo principale</label>
      {photo ? (
        <div className="photo-preview-box">
          <img src={photo} alt="Aperçu" className="photo-preview-img" />
          <button type="button" className="btn-remove-photo" onClick={onClear}>
            ✕ Supprimer
          </button>
        </div>
      ) : (
        <label className="photo-upload">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div className="photo-upload-text">
            <span>📷</span>
            <strong>Ajouter une photo</strong>
            <small>Glisser ou cliquer</small>
          </div>
        </label>
      )}
    </div>
  );
}

const SAMPLE_JSON = {
  titre: "T3 lumineux avec terrasse plein sud - Proche Tram",
  prix: 1250,
  surface: 68,
  pieces: 3,
  chambres: 2,
  dpe: "C",
  exterieur: "terrasse",
  ville: "Bordeaux",
  adresse: "15 Rue Sainte-Catherine",
  statut: "appeler",
  source: "Le Bon Coin",
  url: "https://www.leboncoin.fr/locations/...",
  agenceType: "agence",
  agenceNom: "Immobilier Bordelais",
  cnom: "Thomas Mercier",
  ctel: "06 12 34 56 78",
  visitDate: "2026-09-18T14:30",
  scoreFranck: 8,
  scoreLaura: 9,
  notes: "Parquet ancien rénové, double vitrage récent, cave privative. Très calme.",
  photo: ""
};

const AI_PROMPT_TEMPLATE = `Tu es un assistant spécialisé dans l'extraction d'annonces immobilières.
Extrais les données de l'annonce immobilière suivante et renvoie UNIQUEMENT un objet JSON valide (aucun texte avant ou après), respectant scrupuleusement ces champs et options autorisées :

{
  "titre": "string (ex: T3 meublé proche tramway)",
  "prix": number (loyer mensuel charges comprises en euros, ex: 1200),
  "surface": number (surface en m², ex: 65),
  "pieces": number (nombre total de pièces, ex: 3),
  "chambres": number (nombre de chambres, ex: 2),
  "dpe": "A" | "B" | "C" | "D" | "E" | "F" | "G" | "Non renseigné",
  "exterieur": "aucun" | "balcon" | "terrasse" | "grande-terrasse" | "jardin" | "grand-jardin",
  "ville": "Bordeaux" | "Talence" | "Pessac" | "Mérignac" | "Bègles" | "Villenave-d'Ornon" (ou autre ville),
  "adresse": "string (adresse ou quartier si disponible)",
  "statut": "appeler" | "visite" | "dossier" | "attente" | "refuse" | "ok",
  "source": "Le Bon Coin" | "SeLoger" | "PAP" | "Jinka" | "Bien'ici" | "Autre",
  "url": "string (lien de l'annonce si fourni)",
  "agenceType": "agence" | "particulier",
  "agenceNom": "string (nom de l'agence si agence)",
  "cnom": "string (nom de la personne de contact)",
  "ctel": "string (numéro de téléphone)",
  "visitDate": "string (format ISO YYYY-MM-DDTHH:mm si un rendez-vous est prévu)",
  "notes": "string (résumé des atouts, charges, transports, étage...)"
}

Voici l'annonce à analyser :
`;

export default function AddWizard({ onToast }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('wizard'); // 'wizard' | 'json'
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // JSON Import state
  const [jsonText, setJsonText] = useState('');
  const [jsonStatus, setJsonStatus] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    source: 'Le Bon Coin',
    statut: 'appeler',
    titre: '',
    url: '',
    agenceType: 'agence',
    agenceNom: '',
    adresse: '',
    ville: 'Bordeaux',
    villeCustom: '',
    prix: '',
    surface: '',
    pieces: '3',
    chambres: '2',
    dpe: 'C',
    exterieur: 'aucun',
    cnom: '',
    ctel: '',
    notes: '',
    scoreFranck: 0,
    scoreLaura: 0,
    visitDate: '',
  });
  const [photo, setPhotoState] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFieldSelect = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getVille = () =>
    formData.ville === '__autre' ? formData.villeCustom : formData.ville;

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 4) setStep(step + 1);
    else submit();
  };

  const submit = async () => {
    setSaving(true);
    const ville = getVille();
    const { adresse } = formData;

    let lat = null,
      lng = null;
    const q = [adresse, ville].filter(Boolean).join(', ');
    if (q) {
      const geo = await geocode(q);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    const data = {
      ...formData,
      ville,
      lat,
      lng,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fav: false,
      archived: false,
    };
    delete data.villeCustom;

    try {
      const ref = await addDoc(collection(db, 'annonces'), data);
      if (photo) setPhoto(ref.id, photo);
      onToast('✅ Annonce ajoutée avec succès !');
      navigate(`/annonce/${ref.id}`);
    } catch (err) {
      console.error(err);
      onToast("⚠️ Erreur lors de l'enregistrement");
      setSaving(false);
    }
  };

  // JSON Import Handlers
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
      setJsonStatus({
        valid: true,
        msg: `✓ JSON valide (${count} annonce${count > 1 ? 's' : ''})`,
      });
    } catch (err) {
      setJsonStatus({
        valid: false,
        msg: `⚠️ Erreur de syntaxe JSON : ${err.message}`,
      });
    }
  };

  const handleLoadSample = () => {
    const formatted = JSON.stringify(SAMPLE_JSON, null, 2);
    handleJsonChange(formatted);
  };

  const handleCopyAiPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
    onToast('📋 Prompt pour l\'IA copié dans le presse-papier !');
  };

  const handleImportJson = async () => {
    if (!jsonText.trim()) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      let successCount = 0;
      for (const item of items) {
        const ville = item.ville || 'Bordeaux';
        const adresse = item.adresse || '';

        let lat = item.lat || null;
        let lng = item.lng || null;
        if (!lat && (adresse || ville)) {
          const geo = await geocode([adresse, ville].filter(Boolean).join(', '));
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
          }
        }

        const data = {
          titre: item.titre || 'Nouvelle annonce',
          prix: item.prix ? Number(item.prix) : '',
          surface: item.surface ? Number(item.surface) : '',
          pieces: item.pieces ? Number(item.pieces) : '',
          chambres: item.chambres ? Number(item.chambres) : '',
          dpe: item.dpe || 'Non renseigné',
          exterieur: item.exterieur || 'aucun',
          ville,
          adresse,
          lat,
          lng,
          statut: item.statut || 'appeler',
          source: item.source || 'Import JSON',
          url: item.url || '',
          agenceType: item.agenceType || 'agence',
          agenceNom: item.agenceNom || '',
          cnom: item.cnom || '',
          ctel: item.ctel || '',
          visitDate: item.visitDate || '',
          scoreFranck: item.scoreFranck ? Number(item.scoreFranck) : 0,
          scoreLaura: item.scoreLaura ? Number(item.scoreLaura) : 0,
          notes: item.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fav: false,
          archived: false,
        };

        const ref = await addDoc(collection(db, 'annonces'), data);
        if (item.photo) {
          setPhoto(ref.id, item.photo);
        }
        successCount++;
      }

      onToast(`✅ ${successCount} annonce(s) importée(s) avec succès !`);
      navigate('/');
    } catch (err) {
      console.error(err);
      onToast(`⚠️ Erreur d'importation : ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-top-nav">
        <button
          type="button"
          className="btn-back"
          onClick={() => navigate('/')}
        >
          ← Retour
        </button>
        <span className="wizard-page-title">Nouvelle annonce</span>
        <div className="wizard-steps-dots">
          {mode === 'wizard' &&
            [1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`wdot ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`}
              />
            ))}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="wizard-mode-tabs">
        <button
          type="button"
          className={`tab-btn ${mode === 'wizard' ? 'active' : ''}`}
          onClick={() => setMode('wizard')}
        >
          📝 Formulaire rapide 1-clic
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === 'json' ? 'active' : ''}`}
          onClick={() => setMode('json')}
        >
          📥 Importer un JSON IA
        </button>
      </div>

      <div className="wizard-card">
        {mode === 'json' ? (
          <div className="json-import-view">
            <div className="json-import-header">
              <div>
                <h3>Importer via un JSON (IA ou fichier)</h3>
                <p>
                  Collez le JSON généré par votre IA ou cliquez ci-dessous pour copier le prompt d'instruction IA.
                </p>
              </div>
              <div className="json-action-btns">
                <button
                  type="button"
                  className="btn-copy-prompt"
                  onClick={handleCopyAiPrompt}
                  title="Copier le prompt complet pour ChatGPT / Claude / Gemini"
                >
                  📋 Copier le prompt pour l'IA
                </button>
                <button
                  type="button"
                  className="btn-load-sample"
                  onClick={handleLoadSample}
                >
                  📄 Charger l'exemple
                </button>
              </div>
            </div>

            {/* AI Schema Guide Details */}
            <div className="json-schema-guide">
              <span className="guide-badge">💡 Options autorisées pour votre IA :</span>
              <ul className="guide-list">
                <li><b>statut</b> : <code>"appeler"</code>, <code>"visite"</code>, <code>"dossier"</code>, <code>"attente"</code>, <code>"refuse"</code>, <code>"ok"</code></li>
                <li><b>exterieur</b> : <code>"aucun"</code>, <code>"balcon"</code>, <code>"terrasse"</code>, <code>"grande-terrasse"</code>, <code>"jardin"</code>, <code>"grand-jardin"</code></li>
                <li><b>dpe</b> : <code>"A"</code> à <code>"G"</code> ou <code>"Non renseigné"</code></li>
                <li><b>agenceType</b> : <code>"particulier"</code> ou <code>"agence"</code></li>
                <li><b>ville</b> : <code>"Bordeaux"</code>, <code>"Talence"</code>, <code>"Pessac"</code>, <code>"Mérignac"</code>, <code>"Bègles"</code>, <code>"Villenave-d'Ornon"</code></li>
              </ul>
            </div>

            <textarea
              className="json-textarea"
              placeholder="Collez ici votre JSON..."
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={8}
            />

            {jsonStatus && (
              <div className={`json-status-box ${jsonStatus.valid ? 'valid' : 'invalid'}`}>
                {jsonStatus.msg}
              </div>
            )}

            <div className="json-footer-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={saving || !jsonStatus?.valid}
                onClick={handleImportJson}
              >
                {saving ? '⏳ Enregistrement...' : '🚀 Valider et Importer dans les annonces'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleNext}>
            {/* Step 1 : Identité du bien */}
            {step === 1 && (
              <div className="wizard-step slide-in">
                <h3>🏷 Étape 1 : Identité & Contact</h3>

                <div className="fg">
                  <label>Titre de l'annonce *</label>
                  <input
                    name="titre"
                    type="text"
                    placeholder="Ex: T3 meublé 65 m² avec terrasse proche tram..."
                    value={formData.titre}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>

                {/* Statut 1-click pills */}
                <div className="fg">
                  <label>Statut</label>
                  <div className="chip-selector-group">
                    {Object.entries(STATUS).map(([key, item]) => {
                      const isSel = formData.statut === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`btn-chip-option ${isSel ? 'selected' : ''}`}
                          style={
                            isSel
                              ? { backgroundColor: item.bg, color: item.color, borderColor: item.pin }
                              : {}
                          }
                          onClick={() => handleFieldSelect('statut', key)}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Source 1-click pills */}
                <div className="fg">
                  <label>Source</label>
                  <div className="chip-selector-group">
                    {SOURCES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`btn-chip-option ${formData.source === s ? 'selected' : ''}`}
                        onClick={() => handleFieldSelect('source', s)}
                      >
                        {s}
                      </button>
                    ))}
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
                  <label>Lien web de l'annonce</label>
                  <input
                    name="url"
                    type="url"
                    placeholder="https://www.leboncoin.fr/..."
                    value={formData.url}
                    onChange={handleChange}
                  />
                </div>

                {/* Contact Segmented Buttons */}
                <div className="frow-compact">
                  <div className="fg">
                    <label>Type d'interlocuteur</label>
                    <div className="segmented-control">
                      <button
                        type="button"
                        className={formData.agenceType === 'particulier' ? 'active' : ''}
                        onClick={() => handleFieldSelect('agenceType', 'particulier')}
                      >
                        👤 Particulier
                      </button>
                      <button
                        type="button"
                        className={formData.agenceType === 'agence' ? 'active' : ''}
                        onClick={() => handleFieldSelect('agenceType', 'agence')}
                      >
                        🏢 Agence
                      </button>
                    </div>
                  </div>

                  <div className="fg">
                    <label>Nom de l'agence ou propriétaire</label>
                    <input
                      name="agenceNom"
                      type="text"
                      placeholder="Ex: Century 21..."
                      value={formData.agenceNom}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 : Localisation */}
            {step === 2 && (
              <div className="wizard-step slide-in">
                <h3>📍 Étape 2 : Localisation</h3>

                {/* Villes 1-click pills (6 premières) */}
                <div className="fg">
                  <label>Ville (Sélection rapide 1-clic)</label>
                  <div className="chip-selector-group">
                    {CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`btn-chip-option ${formData.ville === c ? 'selected' : ''}`}
                        onClick={() => handleFieldSelect('ville', c)}
                      >
                        📍 {c}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`btn-chip-option ${formData.ville === '__autre' ? 'selected' : ''}`}
                      onClick={() => handleFieldSelect('ville', '__autre')}
                    >
                      ✏️ Autre ville...
                    </button>
                  </div>
                  {formData.ville === '__autre' && (
                    <input
                      name="villeCustom"
                      type="text"
                      placeholder="Saisir la ville..."
                      value={formData.villeCustom}
                      onChange={handleChange}
                      style={{ marginTop: 6 }}
                      autoFocus
                      required
                    />
                  )}
                </div>

                <div className="fg" style={{ marginTop: 8 }}>
                  <label>
                    Adresse exacte{' '}
                    <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optionnelle)</span>
                  </label>
                  <input
                    name="adresse"
                    type="text"
                    placeholder="12 rue des Lilas..."
                    value={formData.adresse}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Step 3 : Le Bien & Contact */}
            {step === 3 && (
              <div className="wizard-step slide-in">
                <h3>📐 Étape 3 : Le Bien & Métriques</h3>

                <div className="frow-compact">
                  <div className="fg">
                    <label>Loyer (€/mois) *</label>
                    <input
                      name="prix"
                      type="number"
                      placeholder="1250"
                      value={formData.prix}
                      onChange={handleChange}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="fg">
                    <label>Surface (m²)</label>
                    <input
                      name="surface"
                      type="number"
                      placeholder="68"
                      value={formData.surface}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Pièces 1-click buttons */}
                <div className="fg">
                  <label>Nombre de pièces</label>
                  <div className="chip-selector-group compact">
                    {PIECES_OPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`btn-num-option ${formData.pieces === p ? 'selected' : ''}`}
                        onClick={() => handleFieldSelect('pieces', p)}
                      >
                        {p} {p === '1' ? 'pièce' : 'pièces'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chambres 1-click buttons */}
                <div className="fg">
                  <label>Nombre de chambres</label>
                  <div className="chip-selector-group compact">
                    {CHAMBRES_OPTS.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        className={`btn-num-option ${formData.chambres === ch ? 'selected' : ''}`}
                        onClick={() => handleFieldSelect('chambres', ch)}
                      >
                        {ch} {ch === '1' ? 'chambre' : 'chambres'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DPE 1-click badges */}
                <div className="fg">
                  <label>DPE (Classe Énergétique)</label>
                  <div className="dpe-selector-row">
                    {DPE_OPTS.map((l) => {
                      const isSel = formData.dpe === l;
                      return (
                        <button
                          key={l}
                          type="button"
                          className={`btn-dpe-badge dpe-${l} ${isSel ? 'selected' : ''}`}
                          onClick={() => handleFieldSelect('dpe', l)}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Extérieur 1-click pills */}
                <div className="fg">
                  <label>Extérieur</label>
                  <div className="chip-selector-group">
                    {EXT_OPT.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`btn-chip-option ${formData.exterieur === o.value ? 'selected' : ''}`}
                        onClick={() => handleFieldSelect('exterieur', o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="frow-compact"
                  style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-2)' }}
                >
                  <div className="fg">
                    <label>Nom interlocuteur</label>
                    <input
                      name="cnom"
                      type="text"
                      placeholder="M. Martin"
                      value={formData.cnom}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="fg">
                    <label>Téléphone</label>
                    <input
                      name="ctel"
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={formData.ctel}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 : Photo & Avis */}
            {step === 4 && (
              <div className="wizard-step slide-in">
                <h3>📷 Étape 4 : Photo & Avis</h3>
                <PhotoUpload
                  photo={photo}
                  onChange={setPhotoState}
                  onClear={() => setPhotoState('')}
                />
                <div className="fg" style={{ marginTop: 8 }}>
                  <label>Notes & impressions libres</label>
                  <textarea
                    name="notes"
                    placeholder="Lumineux, étage élevé, cave, double vitrage..."
                    rows={2}
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
                <div className="frow-compact" style={{ marginTop: 8 }}>
                  <StarPicker
                    label="Note Franck 🧔"
                    value={formData.scoreFranck}
                    onChange={(v) => setFormData((p) => ({ ...p, scoreFranck: v }))}
                  />
                  <StarPicker
                    label="Note Laura 👩"
                    value={formData.scoreLaura}
                    onChange={(v) => setFormData((p) => ({ ...p, scoreLaura: v }))}
                  />
                </div>
              </div>
            )}

            <div className="wizard-footer">
              {step > 1 ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setStep(step - 1)}
                >
                  Précédent
                </button>
              ) : (
                <div />
              )}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving
                  ? '⏳ En cours...'
                  : step < 4
                  ? 'Suivant →'
                  : '💾 Terminer et Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
