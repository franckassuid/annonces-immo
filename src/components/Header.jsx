import { STATUS } from '../utils';

export default function Header({ view, setView, syncState, onAdd }) {
  const syncLabel = { ok: 'Synchronisé', syncing: 'Sync…', error: 'Hors-ligne' }[syncState] ?? '…';

  return (
    <header className="header">
      <a className="header-logo" href="#" onClick={(e) => e.preventDefault()}>
        <div className="header-logo-mark">FL</div>
        <div>
          <div className="header-logo-name">Nos Annonces</div>
          <div className="header-logo-sub">Franck & Laura · Bordeaux</div>
        </div>
      </a>

      <div className="header-right">
        <div className={`sync-dot ${syncState}`} title={syncLabel} />
        <span className="sync-label">{syncLabel}</span>

        <div className="view-toggle">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Vue grille">
            <span>⊞</span><span className="toggle-lbl">Grille</span>
          </button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="Vue en lignes">
            <span>☰</span><span className="toggle-lbl">Lignes</span>
          </button>
          <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')} title="Vue carte">
            <span>📍</span><span className="toggle-lbl">Carte</span>
          </button>
        </div>

        <button className="btn-primary" onClick={onAdd}>
          + Ajouter
        </button>
      </div>
    </header>
  );
}
