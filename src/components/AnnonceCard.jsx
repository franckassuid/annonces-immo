import { useState } from 'react';
import { STATUS, EXTERIOR, formatPrice, buildAnnonceGcalUrl, clearPhoto } from '../utils';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlatformBadge } from './PlatformLogo';

export default function AnnonceCard({ annonce, onClick, onDelete, onToast }) {
  const [editingVisit, setEditingVisit] = useState(false);
  const [tempVisit, setTempVisit] = useState(annonce.visitDate || '');

  const s = STATUS[annonce.statut] ?? STATUS.appeler;

  async function toggleFav(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), { fav: !annonce.fav });
      onToast(annonce.fav ? 'Retiré des favoris' : 'Ajouté aux favoris');
    } catch (err) {
      console.error(err);
    }
  }

  async function handleArchive(e) {
    e.stopPropagation();
    if (!confirm('Archiver cette annonce ? Elle sera conservée dans l\'onglet Archives.')) return;
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), {
        archived: true,
        archivedAt: new Date().toISOString(),
      });
      onToast('Annonce archivée');
      if (onDelete) onDelete(annonce.id);
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de l\'archivage');
    }
  }

  async function handleRestore(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), {
        archived: false,
        restoredAt: new Date().toISOString(),
      });
      onToast('Annonce restaurée');
      if (onDelete) onDelete(annonce.id);
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de la restauration');
    }
  }

  async function handlePermanentDelete(e) {
    e.stopPropagation();
    if (!confirm('Supprimer DÉFINITIVEMENT cette annonce ? Cette action est irréversible.')) return;
    try {
      await deleteDoc(doc(db, 'annonces', annonce.id));
      clearPhoto(annonce.id);
      onToast('Annonce supprimée définitivement');
      if (onDelete) onDelete(annonce.id);
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de la suppression');
    }
  }

  async function handleCancelVisit(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), {
        visitDate: null,
        statut: annonce.statut === 'visite' ? 'appeler' : annonce.statut,
      });
      onToast('Rendez-vous de visite annulé');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de l\'annulation');
    }
  }

  async function handleSaveVisit(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), {
        visitDate: tempVisit || null,
        statut: tempVisit ? 'visite' : (annonce.statut === 'visite' ? 'appeler' : annonce.statut),
      });
      setEditingVisit(false);
      onToast(tempVisit ? 'Date de visite enregistrée !' : 'Date de visite supprimée');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de l\'enregistrement');
    }
  }

  const visitDate = annonce.visitDate ? new Date(annonce.visitDate) : null;
  const isVisitValid = visitDate && !isNaN(visitDate.getTime());
  const gcalHref = isVisitValid ? buildAnnonceGcalUrl(annonce) : null;

  const dateStr = annonce.createdAt
    ? new Date(annonce.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      })
    : '';

  return (
    <article className="card" onClick={onClick}>
      {/* Photo header */}
      <div className="card-photo-wrap">
        {annonce.photo ? (
          <img className="card-photo" src={annonce.photo} alt={annonce.titre || 'Photo du bien'} loading="lazy" />
        ) : (
          <div className="card-photo-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        )}

        <span
          className="card-status-badge"
          style={{ backgroundColor: s.bg, color: s.color, borderColor: s.pin }}
        >
          <span className="status-dot" style={{ backgroundColor: s.dot || s.color }} />
          {s.label}
        </span>

        <button
          type="button"
          className={`card-fav-btn ${annonce.fav ? 'active' : ''}`}
          onClick={toggleFav}
          title={annonce.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {annonce.fav ? '★' : '☆'}
        </button>
      </div>

      {/* Body */}
      <div className="card-body">
        <div className="card-location-row">
          <span className="card-city-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3, verticalAlign: '-1px' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {annonce.ville || 'Gironde'}
          </span>
          {annonce.source && (
            <PlatformBadge source={annonce.source} />
          )}
        </div>

        <h3 className="card-title" title={annonce.titre}>
          {annonce.titre || 'Annonce sans titre'}
        </h3>

        <div className="card-price-row">
          <div className="card-price">
            {annonce.prix ? (
              <>
                <span className="price-num">{formatPrice(annonce.prix)} €</span>
                <span className="price-period">/m</span>
              </>
            ) : (
              <span className="price-unset">Prix non renseigné</span>
            )}
          </div>
        </div>

        {/* Specs */}
        <div className="card-specs-row">
          {annonce.surface && (
            <span className="card-spec-item">{annonce.surface} m²</span>
          )}
          {annonce.pieces && (
            <span className="card-spec-item">{annonce.pieces} p.</span>
          )}
          {annonce.chambres && (
            <span className="card-spec-item">{annonce.chambres} ch.</span>
          )}
          {annonce.dpe && annonce.dpe !== 'Non renseigné' && (
            <span className={`card-spec-dpe dpe-${annonce.dpe}`}>
              {annonce.dpe}
            </span>
          )}
          {annonce.exterieur && (
            <span className="card-spec-item">
              {EXTERIOR[annonce.exterieur] ?? annonce.exterieur}
            </span>
          )}
        </div>


        {/* Visit Section */}
        <div className="card-visit-section" onClick={(e) => e.stopPropagation()}>
          {editingVisit ? (
            <div className="card-visit-editor">
              <input
                type="datetime-local"
                value={tempVisit}
                onChange={(e) => setTempVisit(e.target.value)}
                className="card-visit-input"
              />
              <div className="card-visit-editor-actions">
                <button
                  type="button"
                  className="btn-visit-save"
                  onClick={handleSaveVisit}
                >
                  Valider
                </button>
                <button
                  type="button"
                  className="btn-visit-cancel"
                  onClick={() => setEditingVisit(false)}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : isVisitValid ? (
            <div className="card-visit-scheduled">
              <div className="visit-scheduled-info">
                <span className="visit-scheduled-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div>
                  <div className="visit-scheduled-label">Visite planifiée</div>
                  <div className="visit-scheduled-date">
                    {visitDate.toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    à{' '}
                    {visitDate.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              <div className="visit-scheduled-btns">
                {gcalHref && (
                  <a
                    className="btn-gcal-action"
                    href={gcalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ajouter à Google Agenda"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Google Agenda
                  </a>
                )}
                <button
                  type="button"
                  className="btn-visit-edit"
                  onClick={() => { setTempVisit(annonce.visitDate || ''); setEditingVisit(true); }}
                  title="Modifier la date de visite"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="btn-visit-cancel-direct"
                  onClick={handleCancelVisit}
                  title="Annuler le rendez-vous"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-plan-visit"
              onClick={() => { setTempVisit(''); setEditingVisit(true); }}
            >
              + Planifier une visite
            </button>
          )}
        </div>

        {/* Scores Franck & Laura */}
        {(annonce.scoreFranck > 0 || annonce.scoreLaura > 0) && (
          <div className="card-scores-row">
            {annonce.scoreFranck > 0 && (
              <div className="score-badge franck" title={`Note Franck : ${annonce.scoreFranck}/10`}>
                <span className="score-badge-avatar franck">F</span>
                <span className="score-val">{annonce.scoreFranck}</span>
                <span className="score-denom">/10</span>
              </div>
            )}
            {annonce.scoreLaura > 0 && (
              <div className="score-badge laura" title={`Note Laura : ${annonce.scoreLaura}/10`}>
                <span className="score-badge-avatar laura">L</span>
                <span className="score-val">{annonce.scoreLaura}</span>
                <span className="score-denom">/10</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="card-footer" onClick={(e) => e.stopPropagation()}>
        <span className="card-date">{dateStr}</span>
        <div className="card-actions">
          {annonce.url && (
            <a
              className="card-action-btn"
              href={annonce.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Ouvrir l'annonce d'origine"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
          <button
            type="button"
            className="card-action-btn primary"
            onClick={onClick}
            title="Consulter et modifier la fiche complète"
          >
            Fiche ➔
          </button>
          {annonce.archived ? (
            <>
              <button
                type="button"
                className="card-action-btn restore"
                onClick={handleRestore}
                title="Restaurer l'annonce dans la liste active"
              >
                Restaurer
              </button>
              <button
                type="button"
                className="card-action-btn danger"
                onClick={handlePermanentDelete}
                title="Supprimer définitivement"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="card-action-btn danger"
              onClick={handleArchive}
              title="Archiver l'annonce"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
