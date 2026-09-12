// Reusable vector logos for French real estate platforms

export function normalizePlatform(source = '') {
  const s = (source || '').trim().toLowerCase();
  if (s.includes('coin') || s.includes('lbc')) return 'leboncoin';
  if (s.includes('seloger')) return 'seloger';
  if (s.includes('jinka')) return 'jinka';
  if (s.includes('pap')) return 'pap';
  if (s.includes('bienici') || s.includes("bien'ici")) return 'bienici';
  if (s.includes('logic') || s.includes('immo')) return 'logicimmo';
  return 'other';
}

export function PlatformLogo({ source, size = 18, className = '' }) {
  const platform = normalizePlatform(source);

  switch (platform) {
    case 'leboncoin':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`platform-logo lbc ${className}`}
          title="LeBonCoin"
        >
          <rect width="24" height="24" rx="5" fill="#FF6E14" />
          <path
            d="M12 5.5L5.5 11V18.5H10V14.5H14V18.5H18.5V11L12 5.5Z"
            fill="white"
          />
          <path
            d="M15.5 8.2V6.2H17.5V9.8L15.5 8.2Z"
            fill="white"
          />
        </svg>
      );

    case 'jinka':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`platform-logo jinka ${className}`}
          title="Jinka"
        >
          <rect width="24" height="24" rx="5" fill="#FF5A5F" />
          <path
            d="M5 15L12 7L19 15L12 12.5L5 15Z"
            fill="white"
          />
          <path
            d="M12 7L14.5 17L12 12.5V7Z"
            fill="rgba(255,255,255,0.75)"
          />
          <path
            d="M12 7L9.5 17L12 12.5V7Z"
            fill="rgba(255,255,255,0.9)"
          />
        </svg>
      );

    case 'seloger':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`platform-logo seloger ${className}`}
          title="SeLoger"
        >
          <rect width="24" height="24" rx="5" fill="#E60050" />
          <path
            d="M6 11.5L12 6.5L18 11.5V17.5C18 18.05 17.55 18.5 17 18.5H7C6.45 18.5 6 18.05 6 17.5V11.5Z"
            fill="white"
          />
          <circle cx="12" cy="13.5" r="2" fill="#E60050" />
        </svg>
      );

    case 'pap':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`platform-logo pap ${className}`}
          title="PAP (De Particulier à Particulier)"
        >
          <rect width="24" height="24" rx="5" fill="#004B93" />
          <text
            x="12"
            y="16"
            fill="white"
            fontSize="8.5"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            letterSpacing="-0.5"
          >
            PAP
          </text>
        </svg>
      );

    case 'bienici':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`platform-logo bienici ${className}`}
          title="Bien'ici"
        >
          <rect width="24" height="24" rx="5" fill="#FFD500" />
          <text
            x="12"
            y="17"
            fill="#111827"
            fontSize="12"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
          >
            b.
          </text>
        </svg>
      );

    case 'logicimmo':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`platform-logo logicimmo ${className}`}
          title="Logic-Immo"
        >
          <rect width="24" height="24" rx="5" fill="#0A2540" />
          <path
            d="M6 13L12 7L18 13V18H14V14H10V18H6V13Z"
            fill="#FF6E14"
          />
        </svg>
      );

    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`platform-logo other ${className}`}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
}

export function PlatformBadge({ source, className = '', showLabel = true }) {
  if (!source) return null;
  const platform = normalizePlatform(source);

  const nameMap = {
    leboncoin: 'LeBonCoin',
    seloger: 'SeLoger',
    jinka: 'Jinka',
    pap: 'PAP',
    bienici: "Bien'ici",
    logicimmo: 'Logic-Immo',
    other: source,
  };

  const displayName = nameMap[platform] || source;

  return (
    <span className={`platform-badge platform-${platform} ${className}`}>
      <PlatformLogo source={source} size={15} />
      {showLabel && <span className="platform-name">{displayName}</span>}
    </span>
  );
}

export default PlatformLogo;
