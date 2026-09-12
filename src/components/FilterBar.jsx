import { useState, useMemo } from 'react';
import FilterDropdown from './FilterDropdown';
import { STATUS, EXTERIOR, CITIES } from '../utils';

export default function FilterBar({
  selectedStatuses = [],
  setSelectedStatuses,
  selectedCities = [],
  setSelectedCities,
  selectedExteriors = [],
  setSelectedExteriors,
  selectedDpes = [],
  setSelectedDpes,
  showFav,
  toggleFav,
  showArchived,
  toggleArchived,
  archivedCount = 0,
  sortBy,
  setSortBy,
  count,
  availableCities = [],
  onResetFilters,
  hasActiveFilters,
}) {
  // Only one popover open at a time
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => {
    setOpenDropdown((curr) => (curr === name ? null : name));
  };

  const closeDropdown = () => setOpenDropdown(null);

  // Status options
  const statusOptions = useMemo(() => {
    return Object.entries(STATUS).map(([key, val]) => ({
      value: key,
      label: val.label,
    }));
  }, []);

  // City options (dynamic from ads + standard cities)
  const cityOptions = useMemo(() => {
    const combined = new Set([...availableCities, ...CITIES]);
    return Array.from(combined)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map((c) => ({ value: c, label: c }));
  }, [availableCities]);

  // Exterior options
  const exteriorOptions = useMemo(() => {
    const list = Object.entries(EXTERIOR).map(([key, label]) => ({
      value: key,
      label,
    }));
    list.push({ value: 'none', label: 'Sans extérieur' });
    return list;
  }, []);

  // DPE options
  const dpeOptions = useMemo(() => {
    return [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' },
      { value: 'E', label: 'E' },
      { value: 'F', label: 'F' },
      { value: 'G', label: 'G' },
      { value: 'Non renseigné', label: 'Non renseigné' },
    ];
  }, []);

  return (
    <div className="filter-bar">
      <div className="filter-scroll-row">
        {/* Favoris Quick Toggle */}
        <button
          type="button"
          className={`chip fav${showFav ? ' active' : ''}`}
          onClick={toggleFav}
        >
          ★ Favoris
        </button>

        {/* Archives Quick Toggle */}
        <button
          type="button"
          className={`chip archive-chip${showArchived ? ' active' : ''}`}
          onClick={toggleArchived}
          title={showArchived ? 'Afficher les annonces actives' : 'Afficher les annonces archivées'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, verticalAlign: '-1px' }}>
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
          Archives {archivedCount > 0 ? `(${archivedCount})` : ''}
        </button>

        <div className="filter-sep" />

        {/* Statuts Multi-select */}
        <FilterDropdown
          label="Statut"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          }
          options={statusOptions}
          selected={selectedStatuses}
          onChange={setSelectedStatuses}
          isOpen={openDropdown === 'status'}
          onToggle={() => toggleDropdown('status')}
          onClose={closeDropdown}
        />

        {/* Villes Multi-select */}
        <FilterDropdown
          label="Ville"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
          options={cityOptions}
          selected={selectedCities}
          onChange={setSelectedCities}
          isOpen={openDropdown === 'city'}
          onToggle={() => toggleDropdown('city')}
          onClose={closeDropdown}
        />

        {/* Extérieur Multi-select */}
        <FilterDropdown
          label="Extérieur"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
            </svg>
          }
          options={exteriorOptions}
          selected={selectedExteriors}
          onChange={setSelectedExteriors}
          isOpen={openDropdown === 'exterior'}
          onToggle={() => toggleDropdown('exterior')}
          onClose={closeDropdown}
        />

        {/* DPE Multi-select */}
        <FilterDropdown
          label="DPE"
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          }
          options={dpeOptions}
          selected={selectedDpes}
          onChange={setSelectedDpes}
          isOpen={openDropdown === 'dpe'}
          onToggle={() => toggleDropdown('dpe')}
          onClose={closeDropdown}
        />

        {/* Reset button if any filter active */}
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-filter-reset"
            onClick={onResetFilters}
            title="Réinitialiser tous les filtres"
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      <div className="filter-end-row">
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
          {count} {count <= 1 ? 'annonce' : 'annonces'}
          {showArchived ? ' (archivées)' : ''}
        </span>
      </div>
    </div>
  );
}
