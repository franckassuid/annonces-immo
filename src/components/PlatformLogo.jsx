// Reusable authentic vector logos for French real estate platforms

export function normalizePlatform(source = '') {
  const s = (source || '').trim().toLowerCase();
  if (s.includes('coin') || s.includes('lbc') || s.includes('leboncoin')) return 'leboncoin';
  if (s.includes('seloger') || s.includes('se loger')) return 'seloger';
  if (s.includes('jinka')) return 'jinka';
  if (s.includes('pap')) return 'pap';
  if (s.includes('bienici') || s.includes("bien'ici") || s.includes('bien ici')) return 'bienici';
  if (s.includes('logic')) return 'logicimmo';
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
            d="M6 16.5V9.5L12 5L18 9.5V16.5C18 17.05 17.55 17.5 17 17.5H7C6.45 17.5 6 17.05 6 16.5Z"
            fill="white"
          />
          <path
            d="M12 5L18 9.5H6L12 5Z"
            fill="#FFE3D1"
          />
          <rect x="9.5" y="11" width="5" height="6.5" rx="1" fill="#FF6E14" />
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
            d="M4 14.5L11.5 6L18.5 13.5L12 11.5L4 14.5Z"
            fill="white"
          />
          <path
            d="M11.5 6L14 17.5L12 11.5V6Z"
            fill="#E0484D"
          />
          <path
            d="M11.5 6L9 17.5L12 11.5V6Z"
            fill="#FFFFFF"
            opacity="0.85"
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
            d="M4.5 12L12 5.5L19.5 12H17V18H7V12H4.5Z"
            fill="white"
          />
          <rect x="15" y="6" width="2" height="3.5" fill="white" />
          <path
            d="M12 9.5C10.5 9.5 9.5 10.5 9.5 12C9.5 13.8 12 14.5 12 15.5C12 16.2 11.2 16.5 10.5 16.5"
            stroke="#E60050"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
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
          title="PAP"
        >
          <rect width="24" height="24" rx="5" fill="#004B93" />
          <text
            x="12"
            y="15.5"
            fill="white"
            fontSize="9"
            fontWeight="900"
            fontFamily="Arial Black, Impact, sans-serif"
            textAnchor="middle"
            letterSpacing="-0.5"
          >
            PAP
          </text>
          <rect x="4" y="17.5" width="16" height="1.5" fill="#E60050" rx="0.75" />
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
          <path
            d="M12 5C9.2 5 7 7.2 7 10C7 13.5 12 18.5 12 18.5C12 18.5 17 13.5 17 10C17 7.2 14.8 5 12 5Z"
            fill="#111827"
          />
          <circle cx="12" cy="9.5" r="2.2" fill="#FFD500" />
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
            d="M5 12.5L12 6.5L19 12.5V17.5H14.5V13.5H9.5V17.5H5V12.5Z"
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
