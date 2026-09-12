import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { STATUS, EXTERIOR, formatPrice, buildAnnonceGcalUrl, clearPhoto } from '../utils';

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
      onToast(annonce.fav ? 'Retiré des favoris' : '⭐ Ajouté aux favoris');
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
      onToast('📦 Annonce déplacée dans les archives');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'archivage');
    }
  }

  // Restore archived
  async function handleRestore(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), {
        archived: false,
        restoredAt: new Date().toISOString(),
      });
      onToast('✅ Annonce restaurée dans la liste active');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de la restauration');
    }
  }

  // Permanent delete
  async function handlePermanentDelete(e) {
    e.stopPropagation();
    if (!confirm('Supprimer DÉFINITIVEMENT cette annonce ? Cette action est irréversible.')) return;
    try {
      await deleteDoc(doc(db, 'annonces', annonce.id));
      clearPhoto(annonce.id);
      onToast('🗑 Annonce supprimée définitivement');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de la suppression');
    }
  }

  // Cancel visit
  async function handleCancelVisit(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), { visitDate: null });
      onToast('✕ Rendez-vous de visite annulé');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'annulation');
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
      onToast(tempVisit ? '📅 Date de visite enregistrée !' : 'Date de visite supprimée');
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
          <div className="row-img-placeholder">🏡</div>
        )}
        <span
          className="row-status-pill"
          style={{ background: s.bg, color: s.color, borderColor: s.color + '44' }}
        >
          {s.label}
        </span>
      </div>

      {/* Main Info */}
      <div className="row-content">
        <div className="row-header-line">
          <span className="row-city-badge">📍 {annonce.ville || 'Gironde'}</span>
          {annonce.source && <span className="row-source-badge">{annonce.source}</span>}
          {annonce.fav && <span className="row-fav-star" title="Favori">⭐</span>}
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
          {annonce.surface && <span className="row-pill">📐 {annonce.surface} m²</span>}
          {annonce.pieces && <span className="row-pill">🚪 {annonce.pieces} p.</span>}
          {annonce.chambres && <span className="row-pill">🛏 {annonce.chambres} ch.</span>}
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
              <span className="row-visit-icon">📅</span>
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
            {annonce.agenceType === 'particulier' ? '👤 ' : '🏢 '}
            {annonce.cnom || annonce.agenceNom || 'Contact'}
          </span>
          {annonce.ctel && (
            <a
              href={`tel:${annonce.ctel}`}
              className="row-contact-tel"
              onClick={(e) => e.stopPropagation()}
              title={`Appeler ${annonce.ctel}`}
            >
              📞 <span>{annonce.ctel}</span>
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
          {annonce.fav ? '⭐' : '☆'}
        </button>

        {annonce.url && (
          <a
            href={annonce.url}
            target="_blank"
            rel="noopener noreferrer"
            className="row-action-btn"
            title="Ouvrir le lien de l'annonce"
          >
            🔗
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
              ↩ Restaurer
            </button>
            <button
              type="button"
              className="row-action-btn delete"
              onClick={handlePermanentDelete}
              title="Supprimer définitivement"
            >
              🗑
            </button>
          </>
        ) : (
          <button
            type="button"
            className="row-action-btn archive"
            onClick={handleArchive}
            title="Archiver l'annonce"
          >
            📦
          </button>
        )}
      </div>
    </div>
  );
}
