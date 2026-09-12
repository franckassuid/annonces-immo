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
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-1px' }}>
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            </span>
            <span className="toggle-lbl">Carte</span>
          </button>
        </div>

        <button className="btn-primary" onClick={onAdd}>
          + Ajouter
        </button>
      </div>
    </header>
  );
}
