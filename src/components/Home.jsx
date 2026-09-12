import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header        from './Header';
import FilterBar     from './FilterBar';
import AnnonceCard   from './AnnonceCard';
import AnnonceRow    from './AnnonceRow';
import MapView       from './MapView';

function avg(a) {
  const vals = [+a.scoreFranck, +a.scoreLaura].filter((v) => v > 0);
  return vals.length ? vals.reduce((t, v) => t + v, 0) / vals.length : 0;
}

export default function Home({ annonces = [], loading, toast, showToast, syncState }) {
  const navigate = useNavigate();

  // 'grid' | 'list' | 'map'
  const [view, setView] = useState('grid');
  
  // Multi-select filters
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedExteriors, setSelectedExteriors] = useState([]);
  const [selectedDpes, setSelectedDpes] = useState([]);
  
  const [showFav, setShowFav] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');

  // Count of archived listings
  const archivedCount = useMemo(() => {
    return annonces.filter((a) => !!a.archived).length;
  }, [annonces]);

  // Collect all distinct cities from active listings
  const availableCities = useMemo(() => {
    const set = new Set();
    annonces.forEach((a) => {
      if (a.ville && typeof a.ville === 'string' && a.ville.trim()) {
        set.add(a.ville.trim());
      }
    });
    return Array.from(set);
  }, [annonces]);

  const hasActiveFilters = 
    selectedStatuses.length > 0 ||
    selectedCities.length > 0 ||
    selectedExteriors.length > 0 ||
    selectedDpes.length > 0 ||
    showFav;

  const handleResetFilters = () => {
    setSelectedStatuses([]);
    setSelectedCities([]);
    setSelectedExteriors([]);
    setSelectedDpes([]);
    setShowFav(false);
  };

  const filtered = useMemo(() => {
    // 0. Base filter: active vs archived
    let list = annonces.filter((a) => (showArchived ? !!a.archived : !a.archived));

    // 1. Favoris filter
    if (showFav) {
      list = list.filter((a) => !!a.fav);
    }

    // 2. Statuses multi-select (OR within category)
    if (selectedStatuses.length > 0) {
      list = list.filter((a) => selectedStatuses.includes(a.statut));
    }

    // 3. Cities multi-select
    if (selectedCities.length > 0) {
      const lowerCities = selectedCities.map((c) => c.toLowerCase());
      list = list.filter((a) => a.ville && lowerCities.includes(a.ville.trim().toLowerCase()));
    }

    // 4. Exterior multi-select
    if (selectedExteriors.length > 0) {
      list = list.filter((a) => {
        const ext = (a.exterieur || '').trim().toLowerCase();
        const hasNone = !ext || ext === 'aucun' || ext === 'sans';
        if (selectedExteriors.includes('none') && hasNone) return true;
        return selectedExteriors.includes(a.exterieur);
      });
    }

    // 5. DPE multi-select
    if (selectedDpes.length > 0) {
      list = list.filter((a) => {
        const dpe = (a.dpe || '').trim();
        const isUnset = !dpe || dpe === 'Non renseigné' || dpe === '—';
        if (selectedDpes.includes('Non renseigné') && isUnset) return true;
        return selectedDpes.includes(dpe);
      });
    }

    // 6. Sorting
    switch (sortBy) {
      case 'date-asc':
        list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        break;
      case 'prix-asc':
        list.sort((a, b) => (+a.prix || 999999) - (+b.prix || 999999));
        break;
      case 'prix-desc':
        list.sort((a, b) => (+b.prix || 0) - (+a.prix || 0));
        break;
      case 'score-desc':
        list.sort((a, b) => avg(b) - avg(a));
        break;
      default:
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        break;
    }

    return list;
  }, [annonces, showArchived, showFav, selectedStatuses, selectedCities, selectedExteriors, selectedDpes, sortBy]);

  return (
    <>
      <Header
        view={view}
        setView={setView}
        syncState={syncState}
        onAdd={() => navigate('/add')}
      />

      <FilterBar
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        selectedCities={selectedCities}
        setSelectedCities={setSelectedCities}
        selectedExteriors={selectedExteriors}
        setSelectedExteriors={setSelectedExteriors}
        selectedDpes={selectedDpes}
        setSelectedDpes={setSelectedDpes}
        showFav={showFav}
        toggleFav={() => setShowFav((f) => !f)}
        showArchived={showArchived}
        toggleArchived={() => setShowArchived((a) => !a)}
        archivedCount={archivedCount}
        sortBy={sortBy}
        setSortBy={setSortBy}
        count={filtered.length}
        availableCities={availableCities}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Archived alert banner */}
      {showArchived && (
        <div className="archived-banner">
          <span>📦 <b>Mode Archives</b> : {filtered.length} annonce{filtered.length > 1 ? 's' : ''} archivée{filtered.length > 1 ? 's' : ''}</span>
          <button
            type="button"
            className="btn-exit-archived"
            onClick={() => setShowArchived(false)}
          >
            ← Retour aux annonces actives
          </button>
        </div>
      )}

      {/* Grid View */}
      {view === 'grid' && (
        <div className="grid-wrapper">
          {loading ? (
            <div className="grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid">
              {filtered.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">
                    {showArchived ? '📦' : annonces.length === 0 ? '🏠' : '🔍'}
                  </div>
                  <h2>
                    {showArchived
                      ? 'Aucune annonce dans les archives'
                      : annonces.length === 0
                      ? 'Ajoutez votre première annonce !'
                      : 'Aucune annonce ne correspond à vos filtres'}
                  </h2>
                  <p>
                    {showArchived
                      ? 'Les annonces que vous supprimez apparaîtront ici.'
                      : annonces.length === 0
                      ? 'Cliquez sur « + Ajouter » pour commencer.'
                      : hasActiveFilters
                      ? 'Essayez de modifier vos filtres ou cliquez sur « Réinitialiser ».'
                      : 'Modifiez vos critères pour voir des annonces.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: 12 }}
                      onClick={handleResetFilters}
                    >
                      Effacer les filtres
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((a) => (
                  <AnnonceCard
                    key={a.id}
                    annonce={a}
                    onClick={() => navigate(`/annonce/${a.id}`)}
                    onToast={showToast}
                    onDelete={() => {}}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* List / Row View */}
      {view === 'list' && (
        <div className="list-wrapper">
          {loading ? (
            <div className="list-rows">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          ) : (
            <div className="list-rows">
              {filtered.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">
                    {showArchived ? '📦' : annonces.length === 0 ? '🏠' : '🔍'}
                  </div>
                  <h2>
                    {showArchived
                      ? 'Aucune annonce archivée'
                      : 'Aucune annonce trouvée'}
                  </h2>
                  <p>
                    {hasActiveFilters
                      ? 'Essayez de réinitialiser vos filtres.'
                      : 'Aucune annonce à afficher en mode liste.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: 12 }}
                      onClick={handleResetFilters}
                    >
                      Effacer les filtres
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((a) => (
                  <AnnonceRow
                    key={a.id}
                    annonce={a}
                    onClick={() => navigate(`/annonce/${a.id}`)}
                    onToast={showToast}
                    isArchived={showArchived}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Map View */}
      {view === 'map' && (
        <MapView annonces={filtered} onEdit={(id) => navigate(`/annonce/${id}`)} />
      )}
    </>
  );
}
