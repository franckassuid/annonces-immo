import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  STATUS,
  EXTERIOR,
  formatPrice,
  buildAnnonceGcalUrl,
  getPhoto,
  setPhoto,
  clearPhoto,
} from '../utils';

function InlineEdit({
  label,
  value,
  type = 'text',
  options = null,
  onSave,
  placeholder = 'Non renseigné',
  suffix = '',
  compact = false,
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  useEffect(() => {
    setVal(value ?? '');
  }, [value]);

  const handleCommit = () => {
    setEditing(false);
    if (val !== value) {
      onSave(val);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleCommit();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setVal(value ?? '');
    }
  };

  return (
    <div
      className={`inline-field-tile ${editing ? 'is-editing' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={() => !editing && setEditing(true)}
    >
      <div className="inline-tile-head">
        <span className="inline-label">{label}</span>
        {!editing && <span className="inline-edit-indicator" title="Cliquer pour modifier">✏️</span>}
      </div>

      {editing ? (
        <div className="inline-edit-box" onClick={(e) => e.stopPropagation()}>
          {options ? (
            <select
              value={val}
              onChange={(e) => {
                setVal(e.target.value);
                setEditing(false);
                onSave(e.target.value);
              }}
              onBlur={() => setEditing(false)}
              autoFocus
              className="inline-input"
            >
              {options.map((opt) => {
                const oVal = typeof opt === 'string' ? opt : opt.value;
                const oLbl = typeof opt === 'string' ? opt : opt.label;
                return (
                  <option key={oVal} value={oVal}>
                    {oLbl}
                  </option>
                );
              })}
            </select>
          ) : type === 'textarea' ? (
            <div className="inline-textarea-wrap">
              <textarea
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={handleCommit}
                rows={3}
                autoFocus
                className="inline-input inline-textarea"
                placeholder={placeholder}
              />
              <button
                type="button"
                className="inline-save-btn"
                onMouseDown={handleCommit}
              >
                ✓ Enregistrer
              </button>
            </div>
          ) : (
            <input
              type={type}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="inline-input"
              placeholder={placeholder}
            />
          )}
        </div>
      ) : (
        <div className="inline-tile-val-wrap">
          <span className={`inline-tile-val ${!value ? 'empty' : ''}`}>
            {value !== undefined && value !== null && value !== ''
              ? options
                ? options.find((o) => (typeof o === 'string' ? o : o.value) === value)?.label ||
                  (typeof value === 'string' && EXTERIOR[value]) ||
                  value
                : `${value}${suffix}`
              : placeholder}
          </span>
        </div>
      )}
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
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'annonces', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        const localPhoto = getPhoto(snap.id);
        if (localPhoto) data.photo = localPhoto;
        setAnnonce(data);
        setPhotoState(data.photo || '');
      } else {
        setAnnonce(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const updateField = async (field, val) => {
    try {
      await updateDoc(doc(db, 'annonces', id), {
        [field]: val,
        updatedAt: new Date().toISOString(),
      });
      onToast('✓ Mis à jour');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur de mise à jour');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setPhoto(id, dataUrl);
        setPhotoState(dataUrl);
        onToast('📷 Photo mise à jour !');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Archive instead of delete
  const handleArchive = async () => {
    if (!confirm('Archiver cette annonce ? Elle sera conservée dans vos archives.')) return;
    try {
      await updateDoc(doc(db, 'annonces', id), {
        archived: true,
        archivedAt: new Date().toISOString(),
      });
      onToast('📦 Annonce archivée avec succès');
      navigate('/');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'archivage');
    }
  };

  // Restore
  const handleRestore = async () => {
    try {
      await updateDoc(doc(db, 'annonces', id), {
        archived: false,
        restoredAt: new Date().toISOString(),
      });
      onToast('✅ Annonce restaurée dans la liste active');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de la restauration');
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async () => {
    if (!confirm('Supprimer DÉFINITIVEMENT cette annonce ? Cette action est irréversible.')) return;
    try {
      await deleteDoc(doc(db, 'annonces', id));
      clearPhoto(id);
      onToast('🗑 Annonce supprimée définitivement');
      navigate('/');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de la suppression');
    }
  };

  // Cancel Visit
  const handleCancelVisit = async () => {
    try {
      await updateDoc(doc(db, 'annonces', id), { visitDate: null });
      onToast('✕ Rendez-vous de visite annulé');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'annulation');
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
          {annonce.archived ? (
            <>
              <button
                type="button"
                className="btn-restore-top"
                onClick={handleRestore}
                title="Restaurer l'annonce"
              >
                ↩ Restaurer
              </button>
              <button
                type="button"
                className="btn-delete-top"
                onClick={handlePermanentDelete}
                title="Supprimer définitivement"
              >
                🗑
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-archive-top"
              onClick={handleArchive}
              title="Archiver l'annonce"
            >
              📦 Archiver
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="details-grid-main">
        {/* Left Column : Media, Visit, Evaluations */}
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

          {/* VISIT CARD */}
          <div className="details-section-card visit-feature-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">📅</span>
                <h3>Visite & Agenda Google</h3>
              </div>
              <div className="visit-header-actions">
                {isVisitValid && (
                  <button
                    type="button"
                    className="btn-cancel-visit-sheet"
                    onClick={handleCancelVisit}
                    title="Supprimer / Annuler le rendez-vous"
                  >
                    ✕ Annuler RDV
                  </button>
                )}
                {gcalHref && (
                  <a
                    href={gcalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gcal-large"
                    title="Ajouter à Google Agenda"
                  >
                    📅 Google Agenda
                  </a>
                )}
              </div>
            </div>

            <div className="visit-fields-grid">
              {isVisitValid ? (
                <div className="visit-summary-box">
                  <span className="vs-badge">✓ Visite programmée</span>
                  <div className="vs-details">
                    <b>{visitDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                    &nbsp;à&nbsp;
                    <b>{visitDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</b>
                  </div>
                  <InlineEdit
                    label="Modifier date"
                    value={annonce.visitDate}
                    type="datetime-local"
                    onSave={(v) => updateField('visitDate', v)}
                    compact
                  />
                </div>
              ) : (
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
                  label="Note (/10)"
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
                  label="Note (/10)"
                  value={annonce.scoreLaura}
                  type="number"
                  suffix=" / 10"
                  onSave={(v) => updateField('scoreLaura', v)}
                />
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
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

        {/* Right Column : Compact Specs & Contact Details */}
        <div className="details-col-side">
          {/* Card Caractéristiques : Compact 2x3 Grid */}
          <div className="details-section-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">📐</span>
                <h3>Caractéristiques du bien</h3>
              </div>
            </div>

            <div className="specs-grid-tiles-compact">
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
                suffix=" p."
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
              <InlineEdit
                label="Extérieur"
                value={annonce.exterieur}
                options={[
                  { value: '', label: 'Aucun' },
                  ...Object.entries(EXTERIOR).map(([k, v]) => ({ value: k, label: v })),
                ]}
                onSave={(v) => updateField('exterieur', v)}
              />
              <InlineEdit
                label="Source"
                value={annonce.source}
                options={[
                  'Le Bon Coin', 'Jinka', 'SeLoger', 'Bien\'ici', 'PAP', 'Autre',
                ].map((s) => ({ value: s, label: s }))}
                onSave={(v) => updateField('source', v)}
              />
            </div>

            <div style={{ marginTop: '8px' }}>
              <InlineEdit
                label="Lien web de l'annonce"
                value={annonce.url}
                type="url"
                onSave={(v) => updateField('url', v)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Card Contact & Interlocuteur */}
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
                  label="Type"
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
                  placeholder="Ex: Century 21..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
