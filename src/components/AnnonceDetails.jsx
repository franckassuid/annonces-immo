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
import { PlatformBadge, PlatformLogo } from './PlatformLogo';

function InlineEdit({
  label,
  value,
  type = 'text',
  options = null,
  onSave,
  placeholder = 'Non renseigné',
  suffix = '',
  compact = false,
  min,
  max,
  step,
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  useEffect(() => {
    setVal(value ?? '');
  }, [value]);

  const handleCommit = () => {
    setEditing(false);
    let finalVal = val;
    if (type === 'number' && finalVal !== '' && finalVal !== null && finalVal !== undefined) {
      let num = Number(finalVal);
      if (isNaN(num)) num = 0;
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      finalVal = num;
      setVal(num);
    }
    if (finalVal !== value) {
      onSave(finalVal);
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
        {!editing && (
          <span className="inline-edit-indicator" title="Cliquer pour modifier">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
        )}
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
              min={min}
              max={max}
              step={step || (type === 'number' ? '1' : undefined)}
              onChange={(e) => {
                const raw = e.target.value;
                if (type === 'number') {
                  if (raw === '') {
                    setVal('');
                    return;
                  }
                  let n = Number(raw);
                  if (!isNaN(n)) {
                    if (max !== undefined && n > max) n = max;
                    if (min !== undefined && n < min) n = min;
                    setVal(n);
                  }
                } else {
                  setVal(raw);
                }
              }}
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
      let finalVal = val;
      if (field === 'scoreFranck' || field === 'scoreLaura') {
        if (val === '' || val === null || val === undefined) {
          finalVal = 0;
        } else {
          const num = Number(val);
          finalVal = isNaN(num) ? 0 : Math.max(0, Math.min(10, Math.round(num * 10) / 10));
        }
      }
      await updateDoc(doc(db, 'annonces', id), {
        [field]: finalVal,
        updatedAt: new Date().toISOString(),
      });
      onToast('✓ Mis à jour');
    } catch (err) {
      console.error(err);
      onToast('Erreur de mise à jour');
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
        onToast('Photo mise à jour !');
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
      onToast('Annonce archivée');
      navigate('/');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de l\'archivage');
    }
  };

  // Restore
  const handleRestore = async () => {
    try {
      await updateDoc(doc(db, 'annonces', id), {
        archived: false,
        restoredAt: new Date().toISOString(),
      });
      onToast('Annonce restaurée dans la liste active');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de la restauration');
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async () => {
    if (!confirm('Supprimer DÉFINITIVEMENT cette annonce ? Cette action est irréversible.')) return;
    try {
      await deleteDoc(doc(db, 'annonces', id));
      clearPhoto(id);
      onToast('Annonce supprimée définitivement');
      navigate('/');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de la suppression');
    }
  };

  // Cancel Visit
  const handleCancelVisit = async () => {
    try {
      await updateDoc(doc(db, 'annonces', id), { visitDate: null });
      onToast('Rendez-vous de visite annulé');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de l\'annulation');
    }
  };

  const toggleFav = async () => {
    const nextFav = !annonce?.fav;
    await updateField('fav', nextFav);
    onToast(nextFav ? 'Ajouté aux favoris' : 'Retiré des favoris');
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
                <span className="pip-dot" style={{ backgroundColor: item.dot || item.color }} />
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
              <PlatformBadge source={annonce.source || 'Autre'} />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
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
                Restaurer
              </button>
              <button
                type="button"
                className="btn-delete-top"
                onClick={handlePermanentDelete}
                title="Supprimer définitivement"
              >
                Supprimer
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-archive-top"
              onClick={handleArchive}
              title="Archiver l'annonce"
            >
              Archiver
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
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Aucune photo enregistrée</span>
                </div>
              )}
              <label className="btn-change-photo">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {photo ? 'Modifier la photo' : 'Ajouter une photo'}
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
                <span className="sec-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
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
                    Google Agenda ➔
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
                <span className="sec-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <h3>Avis & Notes d'évaluation</h3>
              </div>
            </div>

            <div className="scores-duo-grid">
              <div className="score-eval-tile">
                <div className="score-eval-head">
                  <span className="eval-avatar-mark franck">F</span>
                  <div className="eval-user-info">
                    <span className="eval-name">Franck</span>
                    <span className="eval-sub">Note personnelle</span>
                  </div>
                  <span className="eval-current-score">{annonce.scoreFranck ? `${annonce.scoreFranck}/10` : '—'}</span>
                </div>
                <div className="score-stepper-row">
                  <button
                    type="button"
                    className="score-step-btn"
                    onClick={() => updateField('scoreFranck', Math.max(0, (Number(annonce.scoreFranck) || 0) - 1))}
                    title="Diminuer la note"
                  >
                    −
                  </button>
                  <InlineEdit
                    label="Note (/10)"
                    value={annonce.scoreFranck}
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    suffix=" / 10"
                    onSave={(v) => updateField('scoreFranck', v)}
                  />
                  <button
                    type="button"
                    className="score-step-btn"
                    onClick={() => updateField('scoreFranck', Math.min(10, (Number(annonce.scoreFranck) || 0) + 1))}
                    title="Augmenter la note (max 10)"
                  >
                    +
                  </button>
                </div>
                <div className="score-quick-pills">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      className={`score-quick-btn ${Number(annonce.scoreFranck) === pt ? 'active' : ''}`}
                      onClick={() => updateField('scoreFranck', Number(annonce.scoreFranck) === pt ? 0 : pt)}
                      title={`${pt}/10`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="score-eval-tile">
                <div className="score-eval-head">
                  <span className="eval-avatar-mark laura">L</span>
                  <div className="eval-user-info">
                    <span className="eval-name">Laura</span>
                    <span className="eval-sub">Note personnelle</span>
                  </div>
                  <span className="eval-current-score">{annonce.scoreLaura ? `${annonce.scoreLaura}/10` : '—'}</span>
                </div>
                <div className="score-stepper-row">
                  <button
                    type="button"
                    className="score-step-btn"
                    onClick={() => updateField('scoreLaura', Math.max(0, (Number(annonce.scoreLaura) || 0) - 1))}
                    title="Diminuer la note"
                  >
                    −
                  </button>
                  <InlineEdit
                    label="Note (/10)"
                    value={annonce.scoreLaura}
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    suffix=" / 10"
                    onSave={(v) => updateField('scoreLaura', v)}
                  />
                  <button
                    type="button"
                    className="score-step-btn"
                    onClick={() => updateField('scoreLaura', Math.min(10, (Number(annonce.scoreLaura) || 0) + 1))}
                    title="Augmenter la note (max 10)"
                  >
                    +
                  </button>
                </div>
                <div className="score-quick-pills">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      className={`score-quick-btn ${Number(annonce.scoreLaura) === pt ? 'active' : ''}`}
                      onClick={() => updateField('scoreLaura', Number(annonce.scoreLaura) === pt ? 0 : pt)}
                      title={`${pt}/10`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
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
                <span className="sec-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </span>
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
                label="Plateforme"
                value={annonce.source}
                options={[
                  'Le Bon Coin', 'SeLoger', 'PAP', 'Jinka', "Bien'ici", 'Logic-Immo', 'Autre',
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
                <span className="sec-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Appeler
                  </a>
                )}
              </div>

              <div className="agency-subgrid">
                <InlineEdit
                  label="Type"
                  value={annonce.agenceType}
                  options={[
                    { value: 'agence', label: 'Agence' },
                    { value: 'particulier', label: 'Particulier' },
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
