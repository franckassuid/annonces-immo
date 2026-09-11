import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header        from './Header';
import FilterBar     from './FilterBar';
import AnnonceCard   from './AnnonceCard';
import MapView       from './MapView';

function avg(a) {
  const vals = [+a.scoreFranck, +a.scoreLaura].filter((v) => v > 0);
  return vals.length ? vals.reduce((t, v) => t + v, 0) / vals.length : 0;
}

export default function Home({ annonces, loading, toast, showToast, syncState }) {
  const navigate = useNavigate();

  const [view, setView] = useState('grid');
  
  // Multi-select filters
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedExteriors, setSelectedExteriors] = useState([]);
  const [selectedDpes, setSelectedDpes] = useState([]);
  
  const [showFav, setShowFav] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');

  // Collect all distinct cities from loaded listings
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
    let list = annonces.slice();

    // 1. Favoris filter
    if (showFav) {
      list = list.filter((a) => !!a.fav);
    }

    // 2. Statuses multi-select (OR within category)
    if (selectedStatuses.length > 0) {
      list = list.filter((a) => selectedStatuses.includes(a.statut));
    }

    // 3. Cities multi-select (case-insensitive trim compare)
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
  }, [annonces, showFav, selectedStatuses, selectedCities, selectedExteriors, selectedDpes, sortBy]);

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
        sortBy={sortBy}
        setSortBy={setSortBy}
        count={filtered.length}
        availableCities={availableCities}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

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
                  <div className="empty-icon">{annonces.length === 0 ? '🏠' : '🔍'}</div>
                  <h2>
                    {annonces.length === 0
                      ? 'Ajoutez votre première annonce !'
                      : 'Aucune annonce ne correspond à vos filtres'}
                  </h2>
                  <p>
                    {annonces.length === 0
                      ? 'Cliquez sur « + Ajouter » pour commencer.'
                      : hasActiveFilters
                      ? 'Essayez de décocher certains filtres ou cliquez sur « Réinitialiser ».'
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

      {view === 'map' && (
        <MapView annonces={filtered} onEdit={(id) => navigate(`/annonce/${id}`)} />
      )}
    </>
  );
}
