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

  const [view,       setView]      = useState('grid');
  const [status,     setStatus]    = useState('all');
  const [showFav,    setShowFav]   = useState(false);
  const [sortBy,     setSortBy]    = useState('date-desc');

  const filtered = useMemo(() => {
    let list = annonces.slice();
    if (showFav)        list = list.filter((a) => a.fav);
    if (status !== 'all') list = list.filter((a) => a.statut === status);

    switch (sortBy) {
      case 'date-asc':   list.sort((a,b) => a.createdAt.localeCompare(b.createdAt)); break;
      case 'prix-asc':   list.sort((a,b) => (+a.prix||999999)-(+b.prix||999999));    break;
      case 'prix-desc':  list.sort((a,b) => (+b.prix||0)-(+a.prix||0));              break;
      case 'score-desc': list.sort((a,b) => avg(b)-avg(a));                          break;
      default:           list.sort((a,b) => b.createdAt.localeCompare(a.createdAt)); break;
    }
    return list;
  }, [annonces, showFav, status, sortBy]);

  return (
    <>
      <Header
        view={view}
        setView={setView}
        syncState={syncState}
        onAdd={() => navigate('/add')}
      />

      <FilterBar
        status={status}
        setStatus={setStatus}
        showFav={showFav}
        toggleFav={() => setShowFav((f) => !f)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        count={filtered.length}
      />

      {view === 'grid' && (
        <div className="grid-wrapper">
          {loading ? (
            <div className="grid">
              {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton" />)}
            </div>
          ) : (
            <div className="grid">
              {filtered.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">{annonces.length === 0 ? '🏠' : '🔍'}</div>
                  <h2>{annonces.length === 0 ? 'Ajoutez votre première annonce !' : 'Aucune annonce ici'}</h2>
                  <p>{annonces.length === 0
                    ? 'Cliquez sur « + Ajouter » pour commencer.'
                    : 'Essayez un autre filtre de statut.'}
                  </p>
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
