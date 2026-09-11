import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { STATUS, EXTERIOR, formatPrice, buildAnnonceGcalUrl, getPhoto, setPhoto, clearPhoto } from '../utils';

function InlineEdit({ label, value, type = 'text', options, onSave, prefix = '', suffix = '', placeholder = '—' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  useEffect(() => { setVal(value ?? ''); }, [value]);

  const handleSave = () => {
    setEditing(false);
    if (val !== (value ?? '')) onSave(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') handleSave();
    if (e.key === 'Escape') {
      setVal(value ?? '');
      setEditing(false);
    }
  };

  const displayVal = () => {
    if (options) {
      const found = options.find(o => String(o.value) === String(value));
      return found ? found.label : (value || placeholder);
    }
    return value ? `${prefix}${value}${suffix}` : placeholder;
  };

  if (editing) {
    return (
      <div className="inline-edit-box">
        <label className="inline-label">{label}</label>
        {options ? (
          <select
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleSave}
            className="inline-input"
          >
            <option value="">— Non spécifié —</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <div className="inline-textarea-wrap">
            <textarea
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onBlur={handleSave}
              rows={4}
              className="inline-input inline-textarea"
            />
            <button type="button" className="inline-save-btn" onClick={handleSave}>✓ Enregistrer</button>
          </div>
        ) : (
          <input
            autoFocus
            type={type}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="inline-input"
          />
        )}
      </div>
    );
  }

  return (
    <div className="inline-field-tile" onClick={() => setEditing(true)} title="Cliquer pour modifier">
      <div className="inline-tile-head">
        <span className="inline-label">{label}</span>
        <span className="inline-edit-indicator">✏️</span>
      </div>
      <div className={`inline-tile-val ${!value ? 'empty' : ''}`}>
        {displayVal()}
      </div>
    </div>
  );
}

export default function AnnonceDetails({ onToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [annonce, setAnnonce] = useState(null);
  const [photo, setPhotoState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'annonces', id)).then((snap) => {
      if (snap.exists()) {
        setAnnonce({ id, ...snap.data() });
        setPhotoState(getPhoto(id) || '');
      }
      setLoading(false);
    });
  }, [id]);

  const updateField = async (field, value) => {
    try {
      await updateDoc(doc(db, 'annonces', id), {
        [field]: value,
        updatedAt: new Date().toISOString(),
      });
      setAnnonce((prev) => ({ ...prev, [field]: value }));
      onToast('💾 Sauvegardé avec succès');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de la sauvegarde');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1000;
        let w = img.width, h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        setPhoto(id, dataUrl);
        setPhotoState(dataUrl);
        onToast('📷 Photo mise à jour !');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    if (!confirm('Voulez-vous vraiment supprimer cette annonce ?')) return;
    try {
      await deleteDoc(doc(db, 'annonces', id));
      clearPhoto(id);
      onToast('🗑 Annonce supprimée');
      navigate('/');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de la suppression');
    }
  };

  const toggleFav = async () => {
    const nextFav = !annonce?.fav;
    await updateField('fav', nextFav);
    onToast(nextFav ? '⭐ Ajouté aux favoris' : 'Retiré des favoris');
  };

  if (loading) return <div className="detail-loading"><div className="loading-spinner"></div>Chargement de la fiche...</div>;
  if (!annonce) return (
    <div className="dashboard-container empty-state">
      <h2>Annonce introuvable</h2>
      <button className="btn-primary" onClick={() => navigate('/')}>← Retour aux annonces</button>
    </div>
  );

  const visitDate = annonce.visitDate ? new Date(annonce.visitDate) : null;
  const isVisitValid = visitDate && !isNaN(visitDate.getTime());
  const gcalHref = isVisitValid ? buildAnnonceGcalUrl(annonce) : null;

  return (
    <div className="details-wrapper">
      {/* Top action navigation */}
      <div className="details-topbar">
        <button type="button" className="btn-back" onClick={() => navigate('/')}>
          ← Retour
        </button>

        <div className="details-status-pipeline">
          {Object.entries(STATUS).map(([key, item]) => {
            const isSelected = (annonce.statut || 'appeler') === key;
            return (
              <button
                key={key}
                type="button"
                className={`status-pip-btn ${isSelected ? 'selected' : ''}`}
                style={{
                  backgroundColor: isSelected ? item.bg : 'transparent',
                  color: isSelected ? item.color : 'var(--text-3)',
                  borderColor: isSelected ? item.pin : 'transparent',
                }}
                onClick={() => updateField('statut', key)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="details-topbar-actions">
          <button
            type="button"
            className={`btn-fav-top ${annonce.fav ? 'active' : ''}`}
            onClick={toggleFav}
            title="Favori"
          >
            {annonce.fav ? '★ Favori' : '☆ Favori'}
          </button>
          {annonce.url && (
            <a
              href={annonce.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link-source"
              title="Ouvrir l'annonce d'origine"
            >
              🔗 Source
            </a>
          )}
          <button type="button" className="btn-delete-top" onClick={handleDelete} title="Supprimer l'annonce">
            🗑
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="details-grid-main">
        {/* Left Column : Showcase, Visit Card, Notes */}
        <div className="details-col-main">
          {/* Hero Media Card */}
          <div className="details-hero-card">
            <div className="details-hero-img-box">
              {photo ? (
                <img src={photo} alt={annonce.titre} className="details-hero-img" />
              ) : (
                <div className="details-hero-placeholder">
                  <span className="ph-icon">🏡</span>
                  <span>Aucune photo enregistrée</span>
                </div>
              )}
              <label className="btn-change-photo">
                📷 {photo ? 'Modifier la photo' : 'Ajouter une photo'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="details-hero-body">
              <div className="details-title-row">
                <InlineEdit
                  label="Titre de l'annonce"
                  value={annonce.titre}
                  onSave={(v) => updateField('titre', v)}
                  placeholder="Cliquez pour ajouter un titre..."
                />
              </div>

              <div className="details-price-row">
                <InlineEdit
                  label="Loyer mensuel"
                  value={annonce.prix}
                  type="number"
                  suffix=" € / mois"
                  onSave={(v) => updateField('prix', v)}
                />
              </div>

              <div className="details-loc-row">
                <InlineEdit
                  label="Ville"
                  value={annonce.ville}
                  onSave={(v) => updateField('ville', v)}
                />
                <InlineEdit
                  label="Adresse exacte"
                  value={annonce.adresse}
                  onSave={(v) => updateField('adresse', v)}
                  placeholder="Ex: 14 rue de la Paix"
                />
              </div>
            </div>
          </div>

          {/* VISIT CARD (PRO GOOGLE CALENDAR) */}
          <div className="details-section-card visit-feature-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">📅</span>
                <div>
                  <h3>Visite & Agenda Google</h3>
                  <p className="sec-subtitle">Programmez la visite et synchronisez en 1 clic dans Google Agenda</p>
                </div>
              </div>
              {gcalHref && (
                <a
                  href={gcalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gcal-large"
                  title="Ouvre Google Agenda avec l'adresse, l'agent, le téléphone et le lien vers cette fiche"
                >
                  📅 Ajouter à Google Agenda
                </a>
              )}
            </div>

            <div className="visit-fields-grid">
              <InlineEdit
                label="Date et heure de visite"
                value={annonce.visitDate}
                type="datetime-local"
                onSave={(v) => {
                  updateField('visitDate', v);
                  if (v && (!annonce.statut || annonce.statut === 'appeler')) {
                    updateField('statut', 'visite');
                  }
                }}
                placeholder="Cliquer pour fixer une date de visite"
              />
              {isVisitValid && (
                <div className="visit-summary-box">
                  <span className="vs-badge">✓ Visite confirmée</span>
                  <div className="vs-details">
                    <b>{visitDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>
                    &nbsp;à&nbsp;
                    <b>{visitDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</b>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Avis & Notes libres */}
          <div className="details-section-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">💬</span>
                <h3>Avis & Notes d'évaluation</h3>
              </div>
            </div>

            <div className="scores-duo-grid">
              <div className="score-eval-tile">
                <div className="score-eval-head">
                  <span className="eval-avatar">🧔</span>
                  <span className="eval-name">Franck</span>
                </div>
                <InlineEdit
                  label="Note Franck (/10)"
                  value={annonce.scoreFranck}
                  type="number"
                  suffix=" / 10"
                  onSave={(v) => updateField('scoreFranck', v)}
                />
              </div>

              <div className="score-eval-tile">
                <div className="score-eval-head">
                  <span className="eval-avatar">👩</span>
                  <span className="eval-name">Laura</span>
                </div>
                <InlineEdit
                  label="Note Laura (/10)"
                  value={annonce.scoreLaura}
                  type="number"
                  suffix=" / 10"
                  onSave={(v) => updateField('scoreLaura', v)}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <InlineEdit
                label="Notes & Impressions libres"
                value={annonce.notes}
                type="textarea"
                onSave={(v) => updateField('notes', v)}
                placeholder="Ressenti, points forts, points faibles, transports, luminosité..."
              />
            </div>
          </div>
        </div>

        {/* Right Column : Specs & Contact Details */}
        <div className="details-col-side">
          {/* Card Caractéristiques */}
          <div className="details-section-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">📐</span>
                <h3>Caractéristiques du bien</h3>
              </div>
            </div>

            <div className="specs-grid-tiles">
              <InlineEdit
                label="Surface"
                value={annonce.surface}
                type="number"
                suffix=" m²"
                onSave={(v) => updateField('surface', v)}
              />
              <InlineEdit
                label="Pièces"
                value={annonce.pieces}
                type="number"
                suffix=" pièces"
                onSave={(v) => updateField('pieces', v)}
              />
              <InlineEdit
                label="Chambres"
                value={annonce.chambres}
                type="number"
                suffix=" ch."
                onSave={(v) => updateField('chambres', v)}
              />
              <InlineEdit
                label="DPE"
                value={annonce.dpe}
                options={[
                  { value: 'Non renseigné', label: 'Non renseigné' },
                  ...['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((l) => ({ value: l, label: `Classe ${l}` })),
                ]}
                onSave={(v) => updateField('dpe', v)}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <InlineEdit
                label="Extérieur"
                value={annonce.exterieur}
                options={[
                  { value: '', label: 'Aucun extérieur' },
                  ...Object.entries(EXTERIOR).map(([k, v]) => ({ value: k, label: v })),
                ]}
                onSave={(v) => updateField('exterieur', v)}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <InlineEdit
                label="Source du bien"
                value={annonce.source}
                options={[
                  'Le Bon Coin', 'Jinka', 'SeLoger', 'Bien\'ici', 'PAP', 'Logic-Immo', 'Autre',
                ].map((s) => ({ value: s, label: s }))}
                onSave={(v) => updateField('source', v)}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <InlineEdit
                label="Lien web de l'annonce"
                value={annonce.url}
                type="url"
                onSave={(v) => updateField('url', v)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Card Contact & Agence */}
          <div className="details-section-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">👤</span>
                <h3>Contact & Interlocuteur</h3>
              </div>
            </div>

            <div className="contact-fields-stack">
              <InlineEdit
                label="Nom du contact / agent"
                value={annonce.cnom}
                onSave={(v) => updateField('cnom', v)}
                placeholder="Ex: Sophie Lambert"
              />

              <div className="tel-field-wrap">
                <InlineEdit
                  label="Numéro de téléphone"
                  value={annonce.ctel}
                  type="tel"
                  onSave={(v) => updateField('ctel', v)}
                  placeholder="06 12 34 56 78"
                />
                {annonce.ctel && (
                  <a href={`tel:${annonce.ctel}`} className="btn-call-direct" title="Lancer l'appel">
                    📞 Appeler
                  </a>
                )}
              </div>

              <div className="agency-subgrid">
                <InlineEdit
                  label="Type de contact"
                  value={annonce.agenceType}
                  options={[
                    { value: 'agence', label: '🏢 Agence' },
                    { value: 'particulier', label: '👤 Particulier' },
                  ]}
                  onSave={(v) => updateField('agenceType', v)}
                />
                <InlineEdit
                  label="Nom de l'agence"
                  value={annonce.agenceNom}
                  onSave={(v) => updateField('agenceNom', v)}
                  placeholder="Ex: Stéphane Plaza Immobilier"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
