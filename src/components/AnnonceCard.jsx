import { useState } from 'react';
import { STATUS, EXTERIOR, formatPrice, buildAnnonceGcalUrl, clearPhoto } from '../utils';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AnnonceCard({ annonce, onClick, onDelete, onToast }) {
  const [editingVisit, setEditingVisit] = useState(false);
  const [tempVisit, setTempVisit] = useState(annonce.visitDate || '');

  const s = STATUS[annonce.statut] ?? STATUS.appeler;

  async function toggleFav(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), { fav: !annonce.fav });
      onToast(annonce.fav ? 'Retiré des favoris' : '⭐ Ajouté aux favoris');
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
      onToast('📦 Annonce archivée');
      if (onDelete) onDelete(annonce.id);
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'archivage');
    }
  }

  async function handleRestore(e) {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), {
        archived: false,
        restoredAt: new Date().toISOString(),
      });
      onToast('✅ Annonce restaurée');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de la restauration');
    }
  }

  async function handlePermanentDelete(e) {
    e.stopPropagation();
    if (!confirm('Supprimer DÉFINITIVEMENT cette annonce ?')) return;
    try {
      await deleteDoc(doc(db, 'annonces', annonce.id));
      clearPhoto(annonce.id);
      onToast('🗑 Annonce supprimée définitivement');
      if (onDelete) onDelete(annonce.id);
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de la suppression');
    }
  }

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

  async function handleSaveVisit(e) {
    e.stopPropagation();
    try {
      const updates = {
        visitDate: tempVisit || null,
        updatedAt: new Date().toISOString(),
      };
      if (tempVisit && (!annonce.statut || annonce.statut === 'appeler')) {
        updates.statut = 'visite';
      }
      await updateDoc(doc(db, 'annonces', annonce.id), updates);
      setEditingVisit(false);
      onToast(tempVisit ? '📅 Date de visite enregistrée !' : 'Date de visite supprimée');
    } catch (err) {
      console.error(err);
      onToast('⚠️ Erreur lors de l\'enregistrement');
    }
  }

  const visitDate = annonce.visitDate ? new Date(annonce.visitDate) : null;
  const isVisitValid = visitDate && !isNaN(visitDate.getTime());
  const gcalHref = isVisitValid ? buildAnnonceGcalUrl(annonce) : null;

  const dateStr = annonce.createdAt
    ? new Date(annonce.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : '';

  return (
    <article className="card" onClick={onClick}>
      {/* Photo header */}
      <div className="card-photo-wrap">
        {annonce.photo ? (
          <img className="card-photo" src={annonce.photo} alt={annonce.titre || 'Photo du bien'} loading="lazy" />
        ) : (
          <div className="card-photo-placeholder">
            <span className="placeholder-icon">🏡</span>
          </div>
        )}

        <span
          className="card-status-badge"
          style={{ backgroundColor: s.bg, color: s.color, borderColor: s.pin }}
        >
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
            📍 {annonce.ville || 'Ville'}
          </span>
          {annonce.source && (
            <span className="card-source-tag">{annonce.source}</span>
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

        {/* Specs Pills */}
        <div className="card-meta">
          {annonce.surface && (
            <span className="mpill" title="Surface habitable">
              📐 <b>{annonce.surface} m²</b>
            </span>
          )}
          {annonce.pieces && (
            <span className="mpill" title="Nombre de pièces">
              🚪 <b>{annonce.pieces} p.</b>
            </span>
          )}
          {annonce.chambres && (
            <span className="mpill" title="Nombre de chambres">
              🛏 <b>{annonce.chambres} ch.</b>
            </span>
          )}
          {annonce.dpe && annonce.dpe !== 'Non renseigné' && (
            <span className={`dpe-badge dpe-${annonce.dpe}`} title={`Classe énergétique ${annonce.dpe}`}>
              {annonce.dpe}
            </span>
          )}
          {annonce.exterieur && (
            <span className="ext-pill">
              {EXTERIOR[annonce.exterieur] ?? annonce.exterieur}
            </span>
          )}
        </div>

        {/* Contact info snippet */}
        {(annonce.cnom || annonce.agenceNom || annonce.ctel) && (
          <div className="card-contact-line">
            <span className="contact-name" title={annonce.cnom || annonce.agenceNom}>
              {annonce.agenceType === 'particulier' ? '👤 ' : '🏢 '}
              {annonce.cnom || annonce.agenceNom || 'Contact'}
            </span>
            {annonce.ctel && (
              <a
                href={`tel:${annonce.ctel}`}
                className="contact-tel"
                onClick={(e) => e.stopPropagation()}
                title={`Appeler ${annonce.ctel}`}
              >
                📞 <span className="tel-digits">{annonce.ctel}</span>
              </a>
            )}
          </div>
        )}

        {/* VISIT & GOOGLE AGENDA SECTION */}
        <div className="card-visit-section" onClick={(e) => e.stopPropagation()}>
          {editingVisit ? (
            <div className="visit-editor">
              <label className="visit-editor-lbl">📅 Date & heure de visite :</label>
              <input
                type="datetime-local"
                value={tempVisit}
                onChange={(e) => setTempVisit(e.target.value)}
                className="visit-datetime-input"
                autoFocus
              />
              <div className="visit-editor-actions">
                <button type="button" className="btn-save-visit" onClick={handleSaveVisit}>
                  ✓ Enregistrer
                </button>
                <button type="button" className="btn-cancel-visit" onClick={() => setEditingVisit(false)}>
                  Annuler
                </button>
                {annonce.visitDate && (
                  <button
                    type="button"
                    className="btn-clear-visit"
                    onClick={() => { setTempVisit(''); handleSaveVisit({ stopPropagation: () => {} }); }}
                    title="Supprimer la date de visite"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>
          ) : isVisitValid ? (
            <div className="card-visit-scheduled">
              <div className="visit-scheduled-info">
                <span className="visit-badge-icon">📅</span>
                <div className="visit-badge-text">
                  <div className="visit-badge-title">Visite programmée</div>
                  <div className="visit-badge-time">
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
                    title="Ajouter automatiquement à Google Agenda avec l'adresse, l'agent et la fiche"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📅 Google Agenda
                  </a>
                )}
                <button
                  type="button"
                  className="btn-visit-edit"
                  onClick={() => { setTempVisit(annonce.visitDate || ''); setEditingVisit(true); }}
                  title="Modifier la date de la visite"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="btn-visit-cancel-direct"
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
                <span className="score-avatar">🧔</span>
                <span className="score-val">{annonce.scoreFranck}</span>
                <span className="score-denom">/10</span>
              </div>
            )}
            {annonce.scoreLaura > 0 && (
              <div className="score-badge laura" title={`Note Laura : ${annonce.scoreLaura}/10`}>
                <span className="score-avatar">👩</span>
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
              🔗
            </a>
          )}
          <button
            type="button"
            className="card-action-btn primary"
            onClick={onClick}
            title="Consulter et modifier la fiche complète"
          >
            Fiche ➜
          </button>
          {annonce.archived ? (
            <>
              <button
                type="button"
                className="card-action-btn restore"
                onClick={handleRestore}
                title="Restaurer l'annonce dans la liste active"
              >
                ↩
              </button>
              <button
                type="button"
                className="card-action-btn danger"
                onClick={handlePermanentDelete}
                title="Supprimer définitivement"
              >
                🗑
              </button>
            </>
          ) : (
            <button
              type="button"
              className="card-action-btn danger"
              onClick={handleArchive}
              title="Archiver l'annonce"
            >
              📦
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
