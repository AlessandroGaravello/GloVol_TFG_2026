// ─────────────────────────────────────────────────────────────────────────────
// ProfileBadge — iconos profesionales para tipos de cuenta GloVol
//
// Verificados (requieren aprobación):
//   government   → Estrella         — representante gubernamental
//   journalist   → Globo+NEWS       — periodista / corresponsal
//   organization → Escudo personas  — ONG / organización
//
// De mérito (automáticos por umbrales):
//   top_volunteer → Corazón+hoja    — ≥10 eventos voluntariado
//   top_donor     → Diamante        — ≥500 EUR donados
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeType =
  | 'government'
  | 'journalist'
  | 'organization'
  | 'top_volunteer'
  | 'top_donor'
  | null;

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export const VOLUNTEER_BADGE_THRESHOLD = 10;
export const DONOR_BADGE_THRESHOLD     = 500;

export function getBadgeType(params: {
  role: string; isVerified: boolean; verifiedProfileType?: string;
  volunteerEventsCount: number; totalDonatedEUR: number;
}): BadgeType {
  const { isVerified, verifiedProfileType, volunteerEventsCount, totalDonatedEUR } = params;
  if (isVerified && verifiedProfileType) {
    if (verifiedProfileType === 'government')   return 'government';
    if (verifiedProfileType === 'journalist')   return 'journalist';
    if (verifiedProfileType === 'organization') return 'organization';
  }
  if (volunteerEventsCount >= VOLUNTEER_BADGE_THRESHOLD) return 'top_volunteer';
  if (totalDonatedEUR      >= DONOR_BADGE_THRESHOLD)     return 'top_donor';
  return null;
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

// Estrella de 5 puntas sólida — gobierno/autoridad (imagen 6, icono 1)
const StarSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

// Globo con banda "NEWS" — periodista/corresponsal (imagen 6, icono 3)
const NewsSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Globo terráqueo */}
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" opacity="0.85"/>
    {/* Banda "NEWS" superpuesta */}
    <rect x="3" y="10.5" width="18" height="3" rx="1.5" fill="currentColor"/>
    <text x="12" y="12.85" textAnchor="middle" fontSize="2.6" fontWeight="800" fontFamily="Arial,sans-serif" fill="white" letterSpacing="0.3">NEWS</text>
  </svg>
);

// Personas / comunidad — organización humanitaria
const OrgSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

// Corazón con hoja — voluntariado / medioambiental (imagen 6, icono 2)
const VolunteerSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    {/* Corazón */}
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    {/* Hoja superpuesta abajo-izquierda */}
    <path d="M7 15 C7 12 9 10 12 10 C12 13 10 15 7 15Z" fill="white" opacity="0.9"/>
    <path d="M7 15 L12 10" stroke="white" strokeWidth="0.8" opacity="0.7"/>
  </svg>
);

// Diamante — gran donante
const DiamondSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3H5L2 9l10 12L22 9l-3-6zm-8.5 6l1.5-4 1.5 4h-3zm4.5 0l-1.5-4h3.17L18.5 9H15zM5.83 5H9l-1.5 4H5.5L5.83 5zM4.5 9h2.22L10 19 4.5 9zm8 10l3.28-10H18L12.5 19z"/>
  </svg>
);

// ── Configuración de cada badge ───────────────────────────────────────────────
type BConfig = {
  Icon: React.FC<{ s: number }>;
  label:   string;
  tooltip: string;
  // colores
  iconColor: string;
  circleBg:  string;     // fondo del círculo SVG
  pillBg:    string;     // fondo del pill de label
  pillText:  string;     // texto del pill
};

const CONFIG: Record<Exclude<BadgeType, null>, BConfig> = {
  government: {
    Icon: StarSVG,
    label:    'Gobierno',
    tooltip:  'Representante gubernamental verificado por GloVol',
    iconColor: '#fbbf24',   // amber-400
    circleBg:  '#000000',
    pillBg:    '#78350f',
    pillText:  '#fcd34d',
  },
  journalist: {
    Icon: NewsSVG,
    label:    'Periodista',
    tooltip:  'Periodista / corresponsal verificado por GloVol',
    iconColor: '#60a5fa',   // blue-400
    circleBg:  '#000000',
    pillBg:    '#1e3a5f',
    pillText:  '#93c5fd',
  },
  organization: {
    Icon: OrgSVG,
    label:    'Organización',
    tooltip:  'Organización humanitaria verificada por GloVol',
    iconColor: '#4ade80',   // green-400
    circleBg:  '#000000',
    pillBg:    '#14532d',
    pillText:  '#86efac',
  },
  top_volunteer: {
    Icon: VolunteerSVG,
    label:    'Top Voluntario',
    tooltip:  'Ha participado en 10 o más eventos de voluntariado',
    iconColor: '#f472b6',   // pink-400
    circleBg:  '#000000',
    pillBg:    '#831843',
    pillText:  '#f9a8d4',
  },
  top_donor: {
    Icon: DiamondSVG,
    label:    'Gran Donante',
    tooltip:  'Ha donado más de 500 € en total',
    iconColor: '#22d3ee',   // cyan-400
    circleBg:  '#000000',
    pillBg:    '#164e63',
    pillText:  '#67e8f9',
  },
};

// ── Tamaños ────────────────────────────────────────────────────────────────────
const SIZES = {
  xs: { circle: 18, icon: 10 },
  sm: { circle: 22, icon: 13 },
  md: { circle: 28, icon: 16 },
  lg: { circle: 36, icon: 21 },
};

// ── Componente principal ────────────────────────────────────────────────────
export default function ProfileBadge({
  type, size = 'sm', showLabel = false, className = '',
}: {
  type: BadgeType; size?: BadgeSize; showLabel?: boolean; className?: string;
}) {
  if (!type) return null;
  const cfg = CONFIG[type];
  const sz  = SIZES[size];

  return (
    <span
      title={cfg.tooltip}
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{ flexShrink: 0 }}
    >
      {/* Círculo con icono */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: sz.circle, height: sz.circle,
        borderRadius: '50%',
        backgroundColor: cfg.circleBg,
        color: cfg.iconColor,
        border: `1.5px solid ${cfg.iconColor}22`,
        flexShrink: 0,
      }}>
        <cfg.Icon s={sz.icon} />
      </span>

      {/* Label opcional */}
      {showLabel && size !== 'xs' && (
        <span style={{
          fontSize: size === 'sm' ? 10 : size === 'md' ? 11 : 12,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 20,
          backgroundColor: cfg.pillBg,
          color: cfg.pillText,
          whiteSpace: 'nowrap',
        }}>
          {cfg.label}
        </span>
      )}
    </span>
  );
}

// ── InlineBadge — ultra-compacto para PostCard y listas ─────────────────────
export function InlineBadge({ type }: { type: BadgeType }) {
  if (!type) return null;
  const cfg = CONFIG[type];
  return (
    <span title={cfg.tooltip} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, borderRadius: '50%',
      backgroundColor: cfg.circleBg,
      color: cfg.iconColor,
      border: `1px solid ${cfg.iconColor}33`,
      flexShrink: 0,
    }}>
      <cfg.Icon s={10} />
    </span>
  );
}

// ── BadgeDescription — tarjeta descriptiva para perfil ──────────────────────
export function BadgeDescription({ type }: { type: BadgeType }) {
  if (!type) return null;
  const cfg = CONFIG[type];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 12,
      backgroundColor: cfg.pillBg + '50',
      border: `1px solid ${cfg.pillBg}`,
    }}>
      <span style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        width: 36, height: 36, borderRadius: '50%',
        backgroundColor: cfg.circleBg, color: cfg.iconColor,
        border: `1.5px solid ${cfg.iconColor}44`,
        flexShrink: 0,
      }}>
        <cfg.Icon s={20} />
      </span>
      <div>
        <p style={{ fontSize:12, fontWeight:700, color:cfg.pillText, margin:0 }}>{cfg.label}</p>
        <p style={{ fontSize:11, color:'#a1a1aa', margin:'2px 0 0' }}>{cfg.tooltip}</p>
      </div>
    </div>
  );
}
