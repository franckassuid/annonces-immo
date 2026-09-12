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
import { PlatformBadge } from './PlatformLogo';

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

  // Visit Date Editing State
  const [editingVisitDate, setEditingVisitDate] = useState(false);
  const [tempVisitDate, setTempVisitDate] = useState('');

  // Call Logging State
  const [showAddCall, setShowAddCall] = useState(false);
  const [callAuthor, setCallAuthor] = useState('Franck');
  const [callStatus, setCallStatus] = useState('joint');
  const [callNotes, setCallNotes] = useState('');
  const [callRappelDate, setCallRappelDate] = useState('');

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
        if (val === '' || val === null || val === undefined || val === 0) {
          finalVal = 0;
        } else {
          const num = Number(val);
          finalVal = isNaN(num) ? 0 : Math.max(0, Math.min(10, Math.round(num)));
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

  // Save Call Log (Notes are optional!)
  const handleSaveCallLog = async (e) => {
    e.preventDefault();
    const currentLogs = annonce.callsLog || [];
    const newCall = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      author: callAuthor,
      status: callStatus,
      notes: callNotes || '',
    };

    const payload = {
      callsLog: [newCall, ...currentLogs],
      updatedAt: new Date().toISOString(),
    };

    if (callRappelDate) {
      payload.rappelDate = callRappelDate;
    }

    try {
      await updateDoc(doc(db, 'annonces', id), payload);
      setShowAddCall(false);
      setCallNotes('');
      setCallRappelDate('');
      onToast('Appel enregistré !');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de l\'enregistrement de l\'appel');
    }
  };

  const handleDeleteCallLog = async (callId) => {
    const currentLogs = annonce.callsLog || [];
    const updatedLogs = currentLogs.filter((c) => c.id !== callId);
    try {
      await updateDoc(doc(db, 'annonces', id), {
        callsLog: updatedLogs,
        updatedAt: new Date().toISOString(),
      });
      onToast('Appel supprimé');
    } catch (err) {
      console.error(err);
      onToast('Erreur de suppression');
    }
  };

  const handleSaveRappelDate = async (val) => {
    try {
      await updateDoc(doc(db, 'annonces', id), {
        rappelDate: val || null,
        updatedAt: new Date().toISOString(),
      });
      onToast(val ? 'Rappel planifié !' : 'Rappel supprimé');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de la planification');
    }
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
      {/* Top action navigation bar (STRICT SINGLE LINE) */}
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
        {/* Left Column : Media, Essential Specs, Visit & Evaluations */}
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

              {/* Essential Quick-Summary Card */}
              <div className="details-essential-card">
                <div className="essential-specs-grid">
                  {/* Surface */}
                  <div className="essential-spec-item">
                    <div className="essential-spec-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="9" y1="3" x2="9" y2="21"/>
                      </svg>
                    </div>
                    <div className="essential-spec-label">
                      <span className="essential-spec-val">{annonce.surface ? `${annonce.surface} m²` : 'Non renseigné'}</span>
                      <span className="essential-spec-sub">Surface</span>
                    </div>
                  </div>

                  {/* Localisation */}
                  <div className="essential-spec-item">
                    <div className="essential-spec-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div className="essential-spec-label">
                      <span className="essential-spec-val">{annonce.ville || 'Gironde'}</span>
                      <span className="essential-spec-sub">{annonce.adresse || 'Adresse à préciser'}</span>
                    </div>
                  </div>

                  {/* Pièces */}
                  <div className="essential-spec-item">
                    <div className="essential-spec-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M9 3v18"/>
                      </svg>
                    </div>
                    <div className="essential-spec-label">
                      <span className="essential-spec-val">{annonce.pieces ? `${annonce.pieces} pièce(s)` : 'Non renseigné'}</span>
                      <span className="essential-spec-sub">Pièces</span>
                    </div>
                  </div>

                  {/* Loyer */}
                  <div className="essential-spec-item">
                    <div className="essential-spec-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v12M15 9.5H10a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5H8" />
                      </svg>
                    </div>
                    <div className="essential-spec-label">
                      <span className="essential-spec-val">{annonce.prix ? `${formatPrice(annonce.prix)} €` : 'Non renseigné'}</span>
                      <span className="essential-spec-sub">/mois (CC)</span>
                    </div>
                  </div>

                  {/* Chambres */}
                  <div className="essential-spec-item">
                    <div className="essential-spec-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4v16M2 8h20M2 17h20M22 4v16"/>
                      </svg>
                    </div>
                    <div className="essential-spec-label">
                      <span className="essential-spec-val">{annonce.chambres ? `${annonce.chambres} chambre(s)` : '0 chambre(s)'}</span>
                      <span className="essential-spec-sub">Chambres</span>
                    </div>
                  </div>
                </div>

                {/* Badges Bar (DPE, Extérieur, Plateforme, Scores) */}
                <div className="essential-badges-row">
                  {annonce.dpe && annonce.dpe !== 'Non renseigné' && (
                    <span className={`essential-dpe-badge dpe-${annonce.dpe}`}>
                      DPE {annonce.dpe}
                    </span>
                  )}
                  {annonce.exterieur && annonce.exterieur !== 'aucun' && (
                    <span className="essential-ext-pill">
                      🍃 {EXTERIOR[annonce.exterieur] ?? annonce.exterieur}
                    </span>
                  )}
                  {annonce.source && (
                    <PlatformBadge source={annonce.source} />
                  )}
                  {annonce.scoreFranck > 0 && (
                    <span className="essential-score-pill">
                      <span className="avatar-mark franck">F</span> {annonce.scoreFranck}/10
                    </span>
                  )}
                  {annonce.scoreLaura > 0 && (
                    <span className="essential-score-pill">
                      <span className="avatar-mark laura">L</span> {annonce.scoreLaura}/10
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* VISIT CARD */}
          <div className="details-section-card visit-feature-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">📅</span>
                <h3>Rendez-vous de visite</h3>
              </div>
              {gcalHref && isVisitValid && (
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

            <div className="visit-card-content">
              {editingVisitDate ? (
                <div className="visit-date-picker-box">
                  <label>Sélectionner la date et heure de visite :</label>
                  <div className="visit-picker-row">
                    <input
                      type="datetime-local"
                      value={tempVisitDate}
                      onChange={(e) => setTempVisitDate(e.target.value)}
                      className="visit-datetime-input"
                    />
                    <button
                      type="button"
                      className="btn-visit-save-main"
                      onClick={async () => {
                        await updateField('visitDate', tempVisitDate);
                        if (tempVisitDate && (!annonce.statut || annonce.statut === 'appeler')) {
                          await updateField('statut', 'visite');
                        }
                        setEditingVisitDate(false);
                      }}
                    >
                      ✓ Valider
                    </button>
                    <button
                      type="button"
                      className="btn-visit-cancel-main"
                      onClick={() => setEditingVisitDate(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : isVisitValid ? (
                <div className="visit-scheduled-banner">
                  <div className="visit-banner-left">
                    <span className="visit-scheduled-badge">✓ Visite programmée</span>
                    <div className="visit-banner-datetime">
                      <b>{visitDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>
                      &nbsp;à&nbsp;
                      <strong>{visitDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong>
                    </div>
                  </div>

                  <div className="visit-banner-right">
                    <button
                      type="button"
                      className="btn-visit-action edit"
                      onClick={() => {
                        setTempVisitDate(annonce.visitDate || '');
                        setEditingVisitDate(true);
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn-visit-action cancel"
                      onClick={handleCancelVisit}
                    >
                      Annuler RDV
                    </button>
                  </div>
                </div>
              ) : (
                <div className="visit-empty-box">
                  <p>Aucun rendez-vous de visite fixé pour le moment.</p>
                  <button
                    type="button"
                    className="btn-plan-visit-hero"
                    onClick={() => {
                      setTempVisitDate('');
                      setEditingVisitDate(true);
                    }}
                  >
                    + Fixer une date de visite
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AVIS & EVALUATIONS WITH RANGE SLIDERS & REMOVE SCORE BUTTON */}
          <div className="details-section-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">💬</span>
                <h3>Avis & Évaluations des membres</h3>
              </div>
            </div>

            <div className="scores-duo-grid">
              {/* Franck's Evaluation */}
              <div className="score-eval-tile">
                <div className="score-eval-head">
                  <span className="eval-avatar-mark franck">F</span>
                  <div className="eval-user-info">
                    <span className="eval-name">Franck</span>
                    <span className="eval-sub">Note & Avis</span>
                  </div>
                  <div className="score-head-right">
                    <span className={`eval-current-score ${annonce.scoreFranck ? 'has-score' : ''}`}>
                      {annonce.scoreFranck ? `★ ${annonce.scoreFranck}/10` : 'Aucune note'}
                    </span>
                    {Boolean(annonce.scoreFranck) && (
                      <button
                        type="button"
                        className="btn-remove-score-pill"
                        onClick={() => updateField('scoreFranck', 0)}
                        title="Retirer la note de Franck"
                      >
                        ✕ Retirer
                      </button>
                    )}
                  </div>
                </div>

                {/* Range Slider for Score */}
                <div className="score-slider-box">
                  <div className="slider-row">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={annonce.scoreFranck || 5}
                      onChange={(e) => updateField('scoreFranck', Number(e.target.value))}
                      className="score-range-input"
                    />
                  </div>
                  <div className="score-slider-ticks">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                <div className="avis-text-box">
                  <InlineEdit
                    label="Remarques & avis de Franck"
                    value={annonce.avisFranck}
                    type="textarea"
                    onSave={(v) => updateField('avisFranck', v)}
                    placeholder="Ajouter un avis écrit par Franck (atouts, quartier, points d'attention)..."
                  />
                </div>
              </div>

              {/* Laura's Evaluation */}
              <div className="score-eval-tile">
                <div className="score-eval-head">
                  <span className="eval-avatar-mark laura">L</span>
                  <div className="eval-user-info">
                    <span className="eval-name">Laura</span>
                    <span className="eval-sub">Note & Avis</span>
                  </div>
                  <div className="score-head-right">
                    <span className={`eval-current-score ${annonce.scoreLaura ? 'has-score' : ''}`}>
                      {annonce.scoreLaura ? `★ ${annonce.scoreLaura}/10` : 'Aucune note'}
                    </span>
                    {Boolean(annonce.scoreLaura) && (
                      <button
                        type="button"
                        className="btn-remove-score-pill"
                        onClick={() => updateField('scoreLaura', 0)}
                        title="Retirer la note de Laura"
                      >
                        ✕ Retirer
                      </button>
                    )}
                  </div>
                </div>

                {/* Range Slider for Score */}
                <div className="score-slider-box">
                  <div className="slider-row">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={annonce.scoreLaura || 5}
                      onChange={(e) => updateField('scoreLaura', Number(e.target.value))}
                      className="score-range-input"
                    />
                  </div>
                  <div className="score-slider-ticks">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                <div className="avis-text-box">
                  <InlineEdit
                    label="Remarques & avis de Laura"
                    value={annonce.avisLaura}
                    type="textarea"
                    onSave={(v) => updateField('avisLaura', v)}
                    placeholder="Ajouter un avis écrit par Laura (atouts, quartier, points d'attention)..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column : Contact & Journal d'appels / Rappels (No duplicates!) */}
        <div className="details-col-side">
          {/* Card Contact & Suivi des appels */}
          <div className="details-section-card">
            <div className="section-card-header">
              <div className="sec-title-with-icon">
                <span className="sec-icon">👤</span>
                <h3>Contact & Journal d'appels</h3>
              </div>
              <button
                type="button"
                className="btn-add-call-trigger"
                onClick={() => setShowAddCall(!showAddCall)}
              >
                {showAddCall ? '✕ Fermer' : '+ Consigner un appel'}
              </button>
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
                  label="Type d'interlocuteur"
                  value={annonce.agenceType}
                  options={[
                    { value: 'agence', label: 'Agence' },
                    { value: 'particulier', label: 'Particulier' },
                  ]}
                  onSave={(v) => updateField('agenceType', v)}
                />
                {annonce.agenceType === 'agence' && (
                  <InlineEdit
                    label="Nom de l'agence"
                    value={annonce.agenceNom}
                    onSave={(v) => updateField('agenceNom', v)}
                    placeholder="Ex: Century 21..."
                  />
                )}
              </div>

              <InlineEdit
                label="Lien web de l'annonce"
                value={annonce.url}
                type="url"
                onSave={(v) => updateField('url', v)}
                placeholder="https://..."
              />
            </div>

            {/* RAPPEL PLANIFIÉ SECTION */}
            <div className="rappel-section-wrap">
              <div className="rappel-header-row">
                <span className="sec-sub-title">⏰ Rappel de l'agence</span>
                <InlineEdit
                  label="Fixer une date de rappel"
                  value={annonce.rappelDate}
                  type="datetime-local"
                  onSave={handleSaveRappelDate}
                  placeholder="+ Planifier un rappel"
                  compact
                />
              </div>
              {annonce.rappelDate && (
                <div className="rappel-active-banner">
                  <span>⏰ Rappel prévu le <b>{new Date(annonce.rappelDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</b> à <b>{new Date(annonce.rappelDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</b></span>
                  <button type="button" onClick={() => handleSaveRappelDate(null)} className="btn-clear-rappel" title="Effacer le rappel">✕</button>
                </div>
              )}
            </div>

            {/* CALL LOG FORM (Optional call notes) */}
            {showAddCall && (
              <form className="call-log-form" onSubmit={handleSaveCallLog}>
                <h4>Consigner un échange téléphonique</h4>
                <div className="call-form-row">
                  <div className="fg">
                    <label>Auteur de l'appel</label>
                    <div className="segmented-control">
                      <button
                        type="button"
                        className={callAuthor === 'Franck' ? 'active' : ''}
                        onClick={() => setCallAuthor('Franck')}
                      >
                        Franck
                      </button>
                      <button
                        type="button"
                        className={callAuthor === 'Laura' ? 'active' : ''}
                        onClick={() => setCallAuthor('Laura')}
                      >
                        Laura
                      </button>
                    </div>
                  </div>

                  <div className="fg">
                    <label>Résultat de l'échange</label>
                    <select value={callStatus} onChange={(e) => setCallStatus(e.target.value)}>
                      <option value="joint">✓ Échange réussi (Joint)</option>
                      <option value="repondeur">📱 Message sur répondeur</option>
                      <option value="pas-de-reponse">🚫 Pas de réponse</option>
                      <option value="rappel">⏰ Rappel demandé</option>
                    </select>
                  </div>
                </div>

                <div className="fg" style={{ marginTop: 8 }}>
                  <label>Remarques sur l'appel <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(facultatif)</span></label>
                  <textarea
                    rows={2}
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Remarques éventuelles sur l'échange (optionnel)..."
                  />
                </div>

                <div className="fg" style={{ marginTop: 8 }}>
                  <label>Rappel à planifier (Optionnel)</label>
                  <input
                    type="datetime-local"
                    value={callRappelDate}
                    onChange={(e) => setCallRappelDate(e.target.value)}
                  />
                </div>

                <div className="call-form-actions">
                  <button type="submit" className="btn-primary">Enregistrer l'appel</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddCall(false)}>Annuler</button>
                </div>
              </form>
            )}

            {/* LOGGED CALLS TIMELINE */}
            <div className="calls-history-list">
              <span className="calls-history-title">Historique des appels ({annonce.callsLog?.length || 0})</span>
              {(!annonce.callsLog || annonce.callsLog.length === 0) ? (
                <p className="no-calls-text">Aucun appel consigné. Cliquez sur "+ Consigner un appel" pour ajouter un échange.</p>
              ) : (
                <div className="calls-timeline">
                  {annonce.callsLog.map((call) => {
                    const callDate = new Date(call.date);
                    const statusLabels = {
                      joint: { label: 'Joint', bg: '#d1fae5', color: '#065f46' },
                      repondeur: { label: 'Répondeur', bg: '#fef3c7', color: '#b45309' },
                      'pas-de-reponse': { label: 'Pas de réponse', bg: '#fee2e2', color: '#991b1b' },
                      rappel: { label: 'Rappel demandé', bg: '#dbeafe', color: '#1e40af' },
                    };
                    const st = statusLabels[call.status] || statusLabels.joint;

                    return (
                      <div key={call.id} className="call-log-item">
                        <div className="call-item-head">
                          <span className={`eval-avatar-mark ${call.author.toLowerCase()}`}>{call.author[0]}</span>
                          <span className="call-item-author">{call.author}</span>
                          <span className="call-status-badge" style={{ backgroundColor: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          <span className="call-item-date">
                            {callDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {callDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            type="button"
                            className="btn-delete-call"
                            onClick={() => handleDeleteCallLog(call.id)}
                            title="Supprimer cet appel"
                          >
                            ✕
                          </button>
                        </div>
                        {call.notes && <p className="call-item-notes">{call.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
