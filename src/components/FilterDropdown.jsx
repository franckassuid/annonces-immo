import { useRef, useEffect } from 'react';

export default function FilterDropdown({
  label,
  icon,
  options = [],
  selected = [],
  onChange,
  isOpen,
  onToggle,
  onClose,
}) {
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const hasSelection = selected && selected.length > 0;

  const handleToggleOption = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    onChange(options.map((o) => (typeof o === 'string' ? o : o.value)));
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={`filter-dropdown ${hasSelection ? 'active' : ''}`} ref={containerRef}>
      <button
        type="button"
        className={`filter-btn ${hasSelection ? 'active' : ''} ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        {icon && <span className="filter-btn-icon">{icon}</span>}
        <span className="filter-btn-label">{label}</span>
        {hasSelection && (
          <span className="filter-btn-badge">{selected.length}</span>
        )}
        <span className="filter-btn-arrow">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="filter-popover" role="dialog">
          <div className="filter-popover-header">
            <span className="filter-popover-title">{label}</span>
            <div className="filter-popover-quick-actions">
              <button
                type="button"
                className="btn-filter-quick"
                onClick={handleSelectAll}
                title="Tout sélectionner"
              >
                Tout
              </button>
              <button
                type="button"
                className="btn-filter-quick"
                onClick={handleClear}
                title="Effacer la sélection"
              >
                Effacer
              </button>
            </div>
          </div>

          <div className="filter-popover-list">
            {options.length === 0 ? (
              <div className="filter-popover-empty">Aucune option disponible</div>
            ) : (
              options.map((opt) => {
                const val = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const isChecked = selected.includes(val);

                return (
                  <label key={val} className={`filter-option-row ${isChecked ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleOption(val)}
                      className="filter-checkbox"
                    />
                    <span className="filter-option-text">{optLabel}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
