import { STATUS } from '../utils';

const STATUSES = ['all', ...Object.keys(STATUS)];
const LABELS   = { all: 'Toutes', ...Object.fromEntries(Object.entries(STATUS).map(([k,v]) => [k, v.label])) };

export default function FilterBar({ status, setStatus, showFav, toggleFav, sortBy, setSortBy, count }) {
  return (
    <div className="filter-bar">
      <button
        className={`chip fav${showFav ? ' active' : ''}`}
        onClick={toggleFav}
      >
        ⭐ Favoris
      </button>

      <div className="filter-sep" />

      {STATUSES.map((s) => (
        <button
          key={s}
          className={`chip${status === s ? ' active' : ''}`}
          onClick={() => setStatus(s)}
        >
          {LABELS[s]}
        </button>
      ))}

      <div className="filter-sep" />

      <select
        className="sort-select"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
      >
        <option value="date-desc">Plus récent</option>
        <option value="date-asc">Plus ancien</option>
        <option value="prix-asc">Prix ↑</option>
        <option value="prix-desc">Prix ↓</option>
        <option value="score-desc">Meilleur score</option>
      </select>

      <span className="count-tag">
        {count} {count === 1 ? 'annonce' : 'annonces'}
      </span>
    </div>
  );
}
