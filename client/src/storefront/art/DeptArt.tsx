/**
 * Original department artwork (SVG, brand palette only). These are Reka's own
 * illustrations — no scraped or unlicensed imagery — colour-directed per
 * department: burgundy dew for Korean skincare, cream silk for French,
 * olive pigment for makeup, clay amber for perfumes, ink for offers.
 */
type ArtProps = { title: string; className?: string };

const Svg = ({ title, className, children, bg }: ArtProps & { children: React.ReactNode; bg: string }) => (
  <svg viewBox="0 0 400 500" role="img" aria-label={title} className={className} preserveAspectRatio="xMidYMid slice">
    <title>{title}</title>
    <rect width="400" height="500" fill={bg} />
    {children}
  </svg>
);

/* ------------------------------------------------------------------ */
/* Korean Skincare — glass skin, dew, serum                            */
/* ------------------------------------------------------------------ */

export function SerumBottleArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#fbf4d6">
      <defs>
        <linearGradient id="ks-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#74070E" stopOpacity=".92" />
          <stop offset="1" stopColor="#310E10" />
        </linearGradient>
        <radialGradient id="ks-dew" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".5" stopColor="#F4E382" stopOpacity=".25" />
          <stop offset="1" stopColor="#947268" stopOpacity=".15" />
        </radialGradient>
      </defs>
      <circle cx="330" cy="90" r="120" fill="#F4E382" opacity=".5" />
      <circle cx="60" cy="420" r="90" fill="#947268" opacity=".22" />
      {/* dew drops */}
      {[
        [60, 90, 14], [110, 60, 9], [330, 250, 12], [355, 320, 8], [50, 260, 10], [90, 330, 7], [300, 430, 11],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="url(#ks-dew)" stroke="#947268" strokeOpacity=".3" />
          <circle cx={x - r / 3} cy={y - r / 3} r={r / 4} fill="#fff" opacity=".9" />
        </g>
      ))}
      {/* serum bottle */}
      <g>
        <rect x="150" y="170" width="100" height="220" rx="26" fill="url(#ks-glass)" />
        <rect x="150" y="170" width="36" height="220" rx="18" fill="#fff" opacity=".14" />
        <rect x="178" y="120" width="44" height="58" rx="8" fill="#310E10" />
        <rect x="192" y="132" width="16" height="90" rx="8" fill="#F4E382" opacity=".85" />
        {/* dropper pipette inside */}
        <path d="M200 222 l0 120" stroke="#F4E382" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="200" cy="352" rx="9" ry="12" fill="#F4E382" opacity=".8" />
      </g>
      {/* liquid ripple base */}
      <path d="M40 452 q80 -26 160 0 t160 0 v48 h-320z" fill="#947268" opacity=".25" />
      <path d="M40 466 q80 -20 160 0 t160 0 v34 h-320z" fill="#74070E" opacity=".2" />
    </Svg>
  );
}

export function DropletsArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#F4E382">
      <defs>
        <radialGradient id="dp-g" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset=".6" stopColor="#F4E382" stopOpacity=".3" />
          <stop offset="1" stopColor="#74070E" stopOpacity=".25" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill="#fbf4d6" />
      {Array.from({ length: 28 }).map((_, i) => {
        const x = 40 + ((i * 97) % 330);
        const y = 40 + ((i * 61) % 430);
        const r = 8 + ((i * 13) % 22);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill="url(#dp-g)" stroke="#947268" strokeOpacity=".28" />
            <circle cx={x - r / 3} cy={y - r / 3} r={Math.max(2, r / 5)} fill="#fff" opacity=".85" />
          </g>
        );
      })}
      <path d="M0 430 q100 -40 200 0 t200 0 v70 h-400z" fill="#74070E" opacity=".16" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* French Skincare — silk, linen, marble, quiet luxury                 */
/* ------------------------------------------------------------------ */

export function SilkArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#F4E3B2">
      {[0, 1, 2, 3, 4].map(i => (
        <path
          key={i}
          d={`M-40 ${90 + i * 90} C 100 ${40 + i * 90}, 240 ${150 + i * 90}, 440 ${70 + i * 90}`}
          fill="none"
          stroke={i % 2 ? "#947268" : "#fffbe9"}
          strokeOpacity={i % 2 ? 0.35 : 0.85}
          strokeWidth={38 - i * 4}
          strokeLinecap="round"
        />
      ))}
      <circle cx="320" cy="110" r="60" fill="#fffbe9" opacity=".55" />
      <circle cx="80" cy="400" r="46" fill="#947268" opacity=".18" />
    </Svg>
  );
}

export function CreamJarArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#F4E3B2">
      <ellipse cx="200" cy="430" rx="150" ry="26" fill="#947268" opacity=".25" />
      {/* marble slab */}
      <rect x="60" y="330" width="280" height="90" rx="14" fill="#fffbe9" />
      <path d="M80 350 q60 18 130 4 t120 10" stroke="#947268" strokeOpacity=".3" strokeWidth="3" fill="none" />
      {/* jar */}
      <g>
        <rect x="140" y="210" width="120" height="130" rx="26" fill="#fffbe9" stroke="#947268" strokeOpacity=".4" strokeWidth="3" />
        <rect x="132" y="178" width="136" height="42" rx="18" fill="#947268" />
        <rect x="132" y="178" width="136" height="16" rx="8" fill="#fff" opacity=".22" />
        <ellipse cx="200" cy="275" rx="34" ry="22" fill="#F4E3B2" />
        <path d="M176 274 q12 -14 24 0 t24 0" stroke="#947268" strokeOpacity=".5" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      {/* soft light */}
      <circle cx="320" cy="90" r="80" fill="#fffbe9" opacity=".8" />
      <circle cx="90" cy="120" r="34" fill="#947268" opacity=".14" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Makeup — pigment, lipstick, palettes                                */
/* ------------------------------------------------------------------ */

export function LipstickBulletArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#fbf4d6">
      <circle cx="90" cy="90" r="70" fill="#45462A" opacity=".14" />
      {/* pigment strokes */}
      <path d="M60 400 q90 -34 280 -10" stroke="#74070E" strokeWidth="26" strokeLinecap="round" fill="none" opacity=".85" />
      <path d="M50 440 q120 -26 300 -6" stroke="#947268" strokeWidth="16" strokeLinecap="round" fill="none" opacity=".6" />
      {/* lipstick */}
      <g transform="rotate(-14 200 240)">
        <rect x="176" y="240" width="48" height="120" rx="8" fill="#310E10" />
        <rect x="182" y="220" width="36" height="26" rx="4" fill="#45462A" />
        <path d="M184 222 v-64 q0 -18 18 -18 q18 6 18 24 v58 z" fill="#74070E" />
        <path d="M184 178 q10 -6 18 -4 v48 h-18 z" fill="#fff" opacity=".18" />
      </g>
      <circle cx="330" cy="150" r="34" fill="#74070E" opacity=".9" />
      <circle cx="330" cy="150" r="22" fill="#947268" />
    </Svg>
  );
}

export function PaletteQuadArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#45462A">
      <rect x="70" y="120" width="260" height="260" rx="30" fill="#310E10" />
      {[
        ["#74070E", 110, 160], ["#947268", 230, 160], ["#F4E382", 110, 280], ["#F4E3B2", 230, 280],
      ].map(([c, x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="60" height="60" rx="14" fill={c as string} />
          <path d={`M${Number(x) + 10} ${Number(y) + 40} q20 -18 40 -24`} stroke="#310E10" strokeOpacity=".25" strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* brush */}
      <g transform="rotate(24 320 420)">
        <rect x="310" y="330" width="14" height="120" rx="7" fill="#947268" />
        <path d="M310 330 q7 -34 14 0 z" fill="#F4E382" />
      </g>
      <circle cx="70" cy="70" r="40" fill="#F4E382" opacity=".25" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Perfumes — amber glass, mist                                        */
/* ------------------------------------------------------------------ */

export function PerfumeBottleArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#947268">
      <defs>
        <linearGradient id="pf-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4E382" stopOpacity=".9" />
          <stop offset="1" stopColor="#74070E" />
        </linearGradient>
      </defs>
      <circle cx="330" cy="100" r="110" fill="#F4E3B2" opacity=".3" />
      <circle cx="60" cy="430" r="80" fill="#310E10" opacity=".3" />
      {/* mist */}
      {[
        [70, 140, 16], [110, 110, 10], [150, 90, 7], [95, 180, 8],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fffbe9" opacity=".5" />
      ))}
      {/* faceted bottle */}
      <g>
        <polygon points="140,220 260,220 290,300 290,420 110,420 110,300" fill="url(#pf-liquid)" />
        <polygon points="140,220 200,220 200,420 110,420 110,300" fill="#fff" opacity=".14" />
        <rect x="170" y="168" width="60" height="56" rx="8" fill="#310E10" />
        <rect x="182" y="128" width="36" height="44" rx="10" fill="#F4E3B2" />
        {/* atomizer */}
        <rect x="150" y="150" width="30" height="12" rx="6" fill="#310E10" />
      </g>
      <ellipse cx="200" cy="446" rx="120" ry="16" fill="#310E10" opacity=".3" />
    </Svg>
  );
}

export function MistArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#310E10">
      {Array.from({ length: 22 }).map((_, i) => {
        const x = 30 + ((i * 83) % 340);
        const y = 40 + ((i * 107) % 420);
        const r = 6 + ((i * 17) % 40);
        return <circle key={i} cx={x} cy={y} r={r} fill={i % 3 ? "#947268" : "#F4E3B2"} opacity={0.12 + (i % 4) * 0.06} />;
      })}
      <path d="M-20 380 q120 -80 220 -20 t220 -30" stroke="#F4E382" strokeOpacity=".25" strokeWidth="10" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Offers — bold ink editorial                                         */
/* ------------------------------------------------------------------ */

export function OfferMarkArt({ title, className }: ArtProps) {
  return (
    <Svg title={title} className={className} bg="#310E10">
      <circle cx="320" cy="80" r="90" fill="#74070E" opacity=".5" />
      <circle cx="60" cy="440" r="70" fill="#947268" opacity=".25" />
      <g fontFamily="Georgia, serif" fontWeight="700">
        <text x="52" y="250" fontSize="180" fill="#F4E382">%</text>
        <text x="60" y="360" fontSize="54" fill="#F4E3B2" opacity=".9">honest</text>
        <text x="60" y="420" fontSize="54" fill="#947268">offers</text>
      </g>
      <rect x="52" y="270" width="180" height="8" rx="4" fill="#74070E" />
    </Svg>
  );
}
