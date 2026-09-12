// Authentic brand logos for French real estate platforms retrieved from internet

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

const DOMAIN_MAP = {
  leboncoin: 'leboncoin.fr',
  seloger: 'seloger.com',
  jinka: 'jinka.fr',
  pap: 'pap.fr',
  bienici: 'bienici.com',
  logicimmo: 'logic-immo.com',
};

const NAME_MAP = {
  leboncoin: 'LeBonCoin',
  seloger: 'SeLoger',
  jinka: 'Jinka',
  pap: 'PAP',
  bienici: "Bien'ici",
  logicimmo: 'Logic-Immo',
  other: 'Autre',
};

export function PlatformLogo({ source, size = 18, className = '' }) {
  const platform = normalizePlatform(source);
  const domain = DOMAIN_MAP[platform];
  const displayName = NAME_MAP[platform] || source;

  if (platform !== 'other' && domain) {
    const localSrc = `/logos/${platform}.png`;
    const remoteFallback = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    return (
      <img
        src={localSrc}
        onError={(e) => {
          if (e.target.src !== remoteFallback) {
            e.target.src = remoteFallback;
          }
        }}
        alt={displayName}
        title={displayName}
        width={size}
        height={size}
        className={`platform-logo-img ${platform} ${className}`}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: 3,
          verticalAlign: 'middle',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    );
  }

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
      className={`platform-logo-fallback ${className}`}
      style={{ verticalAlign: 'middle', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function PlatformBadge({ source, className = '', showLabel = true }) {
  if (!source) return null;
  const platform = normalizePlatform(source);
  const displayName = NAME_MAP[platform] || source;

  return (
    <span className={`platform-badge platform-${platform} ${className}`}>
      <PlatformLogo source={source} size={16} />
      {showLabel && <span className="platform-name">{displayName}</span>}
    </span>
  );
}

export default PlatformLogo;
