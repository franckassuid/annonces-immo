import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { STATUS, EXTERIOR, formatPrice, buildAnnonceGcalUrl, clearPhoto } from '../utils';
import { PlatformBadge } from './PlatformLogo';

export default function AnnonceRow({ annonce, onClick, onToast, isArchived }) {
  const [editingVisit, setEditingVisit] = useState(false);
  const [tempVisit, setTempVisit] = useState(annonce.visitDate || '');

  const s = STATUS[annonce.statut] ?? STATUS.appeler;
  const visitDate = annonce.visitDate ? new Date(annonce.visitDate) : null;
  const isVisitValid = visitDate && !isNaN(visitDate.getTime());
  const gcalHref = isVisitValid ? buildAnnonceGcalUrl(annonce) : null;

  async function handleToggleFav(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), { fav: !annonce.fav });
      onToast(annonce.fav ? 'Retiré des favoris' : 'Ajouté aux favoris');
    } catch (err) {
      console.error(err);
    }
  }

  // Archive instead of delete
  async function handleArchive(e) {
    e.stopPropagation();
    if (!confirm('Archiver cette annonce ? Elle sera conservée dans l\'onglet Archives.')) return;
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), {
        archived: true,
        archivedAt: new Date().toISOString(),
      });
      onToast('Annonce déplacée dans les archives');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de l\'archivage');
    }
  }

  // Restore
  async function handleRestore(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), {
        archived: false,
        restoredAt: new Date().toISOString(),
      });
      onToast('Annonce restaurée');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de la restauration');
    }
  }

  // Permanent Delete
  async function handlePermanentDelete(e) {
    e.stopPropagation();
    if (!confirm('Supprimer DÉFINITIVEMENT cette annonce ? Cette action est irréversible.')) return;
    try {
      await deleteDoc(doc(db, 'annonces', annonce.id));
      clearPhoto(annonce.id);
      onToast('Annonce supprimée définitivement');
    } catch (err) {
      console.error(err);
      onToast('Erreur lors de la suppression');
    }
  }

  // Cancel Visit
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

  // Save / edit visit
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
    }
  }

  return (
    <div className={`annonce-row ${isArchived ? 'is-archived' : ''}`} onClick={onClick}>
      {/* Thumbnail */}
      <div className="row-media">
        {annonce.photo ? (
          <img src={annonce.photo} alt={annonce.titre} className="row-img" />
        ) : (
          <div className="row-img-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        )}
        <span
          className="row-status-pill"
          style={{ background: s.bg, color: s.color, borderColor: s.color + '44' }}
        >
          <span className="status-dot" style={{ backgroundColor: s.dot || s.color }} />
          {s.label}
        </span>
      </div>

      {/* Main Info */}
      <div className="row-content">
        <div className="row-header-line">
          <span className="row-city-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3, verticalAlign: '-1px' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {annonce.ville || 'Gironde'}
          </span>
          {annonce.source && <PlatformBadge source={annonce.source} />}
          {annonce.fav && <span className="row-fav-star" title="Favori">★</span>}
        </div>

        <h3 className="row-title" title={annonce.titre}>
          {annonce.titre || 'Sans titre'}
        </h3>

        {/* Specs and metrics */}
        <div className="row-specs-line">
          {annonce.prix && (
            <span className="row-price">
              {formatPrice(annonce.prix)} € <small>/mois</small>
            </span>
          )}
          {annonce.surface && <span className="row-pill">{annonce.surface} m²</span>}
          {annonce.pieces && <span className="row-pill">{annonce.pieces} p.</span>}
          {annonce.chambres && <span className="row-pill">{annonce.chambres} ch.</span>}
          {annonce.dpe && annonce.dpe !== 'Non renseigné' && (
            <span className={`dpe-badge dpe-${annonce.dpe}`} title={`Classe ${annonce.dpe}`}>
              {annonce.dpe}
            </span>
          )}
          {annonce.exterieur && (
            <span className="row-pill row-ext-pill">
              {EXTERIOR[annonce.exterieur] ?? annonce.exterieur}
            </span>
          )}
        </div>
      </div>

      {/* Visit Column */}
      <div className="row-visit-col" onClick={(e) => e.stopPropagation()}>
        {editingVisit ? (
          <div className="row-visit-editor">
            <input
              type="datetime-local"
              value={tempVisit}
              onChange={(e) => setTempVisit(e.target.value)}
              className="row-visit-input"
            />
            <div className="row-visit-editor-btns">
              <button type="button" className="btn-row-save" onClick={handleSaveVisit}>✓</button>
              <button type="button" className="btn-row-cancel" onClick={() => setEditingVisit(false)}>✕</button>
            </div>
          </div>
        ) : isVisitValid ? (
          <div className="row-visit-scheduled">
            <div className="row-visit-info">
              <span className="row-visit-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <div>
                <div className="row-visit-date">
                  {visitDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                  {visitDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="row-visit-actions">
              {gcalHref && (
                <a
                  href={gcalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-row-gcal"
                  title="Ajouter à Google Agenda"
                  onClick={(e) => e.stopPropagation()}
                >
                  GCal
                </a>
              )}
              <button
                type="button"
                className="btn-row-cancel-visit"
                onClick={handleCancelVisit}
                title="Supprimer / Annuler le rendez-vous de visite"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-row-add-visit"
            onClick={() => { setTempVisit(''); setEditingVisit(true); }}
            title="Planifier une visite"
          >
            + Visite
          </button>
        )}
      </div>

      {/* Contact snippet */}
      {(annonce.cnom || annonce.ctel || annonce.agenceNom) && (
        <div className="row-contact-col">
          <span className="row-contact-name" title={annonce.cnom || annonce.agenceNom}>
            {annonce.cnom || annonce.agenceNom || 'Contact'}
          </span>
          {annonce.ctel && (
            <a
              href={`tel:${annonce.ctel}`}
              className="row-contact-tel"
              onClick={(e) => e.stopPropagation()}
              title={`Appeler ${annonce.ctel}`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{annonce.ctel}</span>
            </a>
          )}
        </div>
      )}

      {/* Row Actions */}
      <div className="row-actions-col" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`row-action-btn fav-btn ${annonce.fav ? 'active' : ''}`}
          onClick={handleToggleFav}
          title={annonce.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {annonce.fav ? '★' : '☆'}
        </button>

        {annonce.url && (
          <a
            href={annonce.url}
            target="_blank"
            rel="noopener noreferrer"
            className="row-action-btn"
            title="Ouvrir le lien de l'annonce"
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
          className="row-action-btn primary"
          onClick={onClick}
          title="Consulter la fiche"
        >
          Fiche ➔
        </button>

        {isArchived ? (
          <>
            <button
              type="button"
              className="row-action-btn restore"
              onClick={handleRestore}
              title="Restaurer l'annonce"
            >
              Restaurer
            </button>
            <button
              type="button"
              className="row-action-btn delete"
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
            className="row-action-btn archive"
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
  );
}
