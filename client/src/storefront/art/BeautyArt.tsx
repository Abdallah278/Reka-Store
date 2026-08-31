/**
 * Original, palette-native beauty compositions used as TEMPORARY imagery.
 *
 * Reka Store has not yet supplied licensed photography, and no image
 * generation credentials are configured in this environment, so every visual
 * moment on the storefront renders one of these SVG compositions (stylised
 * portraits, lips, textures, botanicals, product still-life). They are drawn
 * entirely from the brand palette so the page reads as one curated system.
 *
 * Replace: the store settings hero upload and product photo uploads take
 * precedence over these. See docs/IMAGE-ART-DIRECTION.md for the per-section map.
 */
import type { SVGProps } from "react";

export const P = {
  canvas: "#F4E382",
  burgundy: "#74070E",
  olive: "#45462A",
  clay: "#947268",
  ink: "#310E10",
  cream: "#FBF4D6",
  claySoft: "#D9C5B6",
  skin: "#C9A08C",
  skinDeep: "#A97B67",
} as const;

type ArtProps = SVGProps<SVGSVGElement> & { title: string };

const base = (title: string, viewBox: string, rest: Omit<ArtProps, "title">) => ({
  viewBox,
  role: "img" as const,
  "aria-label": title,
  preserveAspectRatio: "xMidYMid slice" as const,
  ...rest,
});

/** Portrait — profile of a woman with a burgundy lip and olive botanical, warm side light. */
export function PortraitArt({ title, tone = "canvas", ...rest }: ArtProps & { tone?: "canvas" | "clay" | "ink" }) {
  const bg = tone === "clay" ? P.clay : tone === "ink" ? P.ink : P.canvas;
  return (
    <svg {...base(title, "0 0 400 500", rest)}>
      <defs>
        <radialGradient id="pa-light" cx="30%" cy="20%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pa-skin" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={P.skin} />
          <stop offset="1" stopColor={P.skinDeep} />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={bg} />
      <circle cx="270" cy="330" r="190" fill={P.clay} opacity={tone === "clay" ? 0.35 : 0.5} />
      <rect width="400" height="500" fill="url(#pa-light)" />
      {/* hair mass */}
      <path d="M120 120c-40 40-60 130-30 220 20 55 60 110 130 140 40 18 90 10 120-10-40-40-30-100-40-160-8-45-10-95 5-140-40-70-140-90-185-50z" fill={P.ink} />
      {/* neck + shoulder */}
      <path d="M200 350c10 40 0 80-30 130h210c-20-60-60-100-110-130z" fill="url(#pa-skin)" />
      {/* face */}
      <path d="M150 140c50-40 130-25 150 40 12 40 4 90-20 130-20 32-52 50-88 44-45-8-70-50-75-95-4-45 5-95 33-119z" fill="url(#pa-skin)" />
      {/* cheek blush */}
      <ellipse cx="238" cy="262" rx="30" ry="18" fill={P.burgundy} opacity=".22" />
      {/* brow */}
      <path d="M182 190c25-10 50-8 70 4" stroke={P.ink} strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* eye */}
      <path d="M195 214c15-12 40-12 52 0-14 12-38 12-52 0z" fill={P.ink} />
      <circle cx="222" cy="214" r="6" fill={P.canvas} />
      {/* lashes */}
      <path d="M200 208l-4-8M212 204l-2-9M226 204l1-9M240 208l4-8" stroke={P.ink} strokeWidth="2.5" strokeLinecap="round" />
      {/* nose */}
      <path d="M262 232c8 14 10 30 2 40-6 6-16 4-22-2" stroke={P.skinDeep} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* lips */}
      <path d="M212 300c14-12 32-12 46 0-8 3-14 4-23 4s-15-1-23-4z" fill={P.burgundy} />
      <path d="M212 300c14 14 32 14 46 0-14 4-32 4-46 0z" fill="#5c060b" />
      {/* earring */}
      <circle cx="140" cy="262" r="9" fill={P.canvas} stroke={P.ink} strokeWidth="2" />
      {/* olive leaf sprig */}
      <g transform="translate(300 60) rotate(20)">
        <path d="M0 0c20 10 40 40 50 80" stroke={P.olive} strokeWidth="3" fill="none" strokeLinecap="round" />
        {[0, 1, 2, 3].map(i => (
          <ellipse key={i} cx={10 + i * 12} cy={12 + i * 18} rx="12" ry="5" fill={P.olive} transform={`rotate(${40 + i * 6} ${10 + i * 12} ${12 + i * 18})`} />
        ))}
      </g>
    </svg>
  );
}

/** Lips — bold burgundy lips on canvas with a lipstick bullet, editorial crop. */
export function LipsArt({ title, ...rest }: ArtProps) {
  return (
    <svg {...base(title, "0 0 500 400", rest)}>
      <rect width="500" height="400" fill={P.canvas} />
      <circle cx="120" cy="80" r="140" fill={P.cream} opacity=".8" />
      <path d="M110 220c40-50 90-70 140-46 50-24 100-4 140 46-40 60-100 90-140 90s-100-30-140-90z" fill={P.burgundy} />
      <path d="M110 220c50 10 100 12 140 12s90-2 140-12c-40 60-100 90-140 90s-100-30-140-90z" fill="#5a050a" />
      <path d="M230 180c8-8 18-10 20-4 2-6 12-4 20 4" stroke={P.canvas} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
      <g transform="translate(380 40) rotate(28)">
        <rect x="0" y="0" width="34" height="110" rx="6" fill={P.ink} />
        <path d="M2 0h30l-4-40c-3-8-19-8-22 0z" fill={P.burgundy} />
      </g>
    </svg>
  );
}

/** Compact — circular powder compact with a mirror highlight and blush pan. */
export function CompactArt({ title, ...rest }: ArtProps) {
  return (
    <svg {...base(title, "0 0 400 400", rest)}>
      <rect width="400" height="400" fill={P.clay} />
      <circle cx="200" cy="200" r="150" fill={P.ink} />
      <circle cx="200" cy="200" r="120" fill={P.skin} />
      <circle cx="200" cy="200" r="120" fill={P.burgundy} opacity=".55" />
      <path d="M110 150c40-50 130-50 180 0" stroke={P.canvas} strokeWidth="10" strokeLinecap="round" fill="none" opacity=".5" />
      <circle cx="150" cy="150" r="24" fill={P.canvas} opacity=".55" />
      <path d="M60 330c60-30 120-30 180 0" stroke={P.canvas} strokeWidth="14" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Brush — makeup brush against olive with a swatch of powder. */
export function BrushArt({ title, ...rest }: ArtProps) {
  return (
    <svg {...base(title, "0 0 400 500", rest)}>
      <rect width="400" height="500" fill={P.olive} />
      <circle cx="300" cy="120" r="120" fill={P.canvas} opacity=".85" />
      <g transform="rotate(-28 200 300)">
        <rect x="180" y="200" width="40" height="230" rx="8" fill={P.ink} />
        <rect x="176" y="190" width="48" height="36" rx="6" fill={P.clay} />
        <path d="M176 192c0-60 12-90 24-90s24 30 24 90z" fill={P.claySoft} />
        <path d="M184 192c0-40 8-70 16-70s16 30 16 70z" fill={P.burgundy} opacity=".7" />
      </g>
      <path d="M40 420c40-30 90-30 130 0s90 30 130 0" stroke={P.burgundy} strokeWidth="18" strokeLinecap="round" fill="none" opacity=".9" />
    </svg>
  );
}

/** Texture — skincare cream swirls and a burgundy pigment smear. */
export function TextureArt({ title, ...rest }: ArtProps) {
  return (
    <svg {...base(title, "0 0 500 300", rest)}>
      <defs>
        <linearGradient id="ta-g" x1="0" x2="1">
          <stop offset="0" stopColor={P.cream} />
          <stop offset="1" stopColor={P.claySoft} />
        </linearGradient>
      </defs>
      <rect width="500" height="300" fill="url(#ta-g)" />
      <path d="M-20 200c60-80 140-80 200 0s140 80 200 0 140-80 200 0v120h-600z" fill={P.canvas} opacity=".9" />
      <path d="M40 120c40-40 90-30 120 0s70 40 120 0 90-30 120 0" stroke="#fff" strokeWidth="26" strokeLinecap="round" fill="none" opacity=".7" />
      <path d="M320 60c50-20 110-10 150 30" stroke={P.burgundy} strokeWidth="34" strokeLinecap="round" fill="none" />
      <path d="M330 66c50-20 100-10 135 25" stroke="#5a050a" strokeWidth="10" strokeLinecap="round" fill="none" opacity=".6" />
    </svg>
  );
}

/** Hands — a hand holding a glass bottle / serum, warm side light. */
export function HandsArt({ title, ...rest }: ArtProps) {
  return (
    <svg {...base(title, "0 0 400 500", rest)}>
      <rect width="400" height="500" fill={P.claySoft} />
      <circle cx="90" cy="420" r="160" fill={P.canvas} opacity=".7" />
      <path d="M120 500c-10-90 10-160 60-190 30-18 70-14 100 10 30-30 60-20 60 20-40 40-70 100-70 160z" fill={P.skin} />
      <path d="M150 320c30-20 60-10 80 10" stroke={P.skinDeep} strokeWidth="6" strokeLinecap="round" fill="none" opacity=".6" />
      <g transform="translate(200 140)">
        <rect x="-36" y="0" width="72" height="200" rx="18" fill={P.ink} opacity=".92" />
        <rect x="-16" y="-50" width="32" height="56" rx="6" fill={P.clay} />
        <rect x="-26" y="60" width="52" height="80" rx="4" fill={P.canvas} />
        <text x="0" y="110" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="26" fill={P.burgundy}>
          reka
        </text>
      </g>
      {[0, 1, 2, 3].map(i => (
        <circle key={i} cx={288 + i * 6} cy={140 + i * 70} r="5" fill={P.burgundy} />
      ))}
    </svg>
  );
}

/** Botanical — olive branches and petal shapes on canvas. */
export function BotanicalArt({ title, ...rest }: ArtProps) {
  return (
    <svg {...base(title, "0 0 400 400", rest)}>
      <rect width="400" height="400" fill={P.canvas} />
      <circle cx="200" cy="200" r="150" fill={P.cream} />
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx="200" cy="120" rx="34" ry="80" fill={P.burgundy} opacity=".85" transform={`rotate(${a} 200 200)`} />
      ))}
      <circle cx="200" cy="200" r="34" fill={P.canvas} stroke={P.ink} strokeWidth="4" />
      <g stroke={P.olive} strokeWidth="4" fill={P.olive} strokeLinecap="round">
        <path d="M40 360c60-40 120-60 200-60" fill="none" />
        {[0, 1, 2, 3, 4].map(i => (
          <ellipse key={i} cx={70 + i * 40} cy={345 - i * 12} rx="16" ry="6" transform={`rotate(-25 ${70 + i * 40} ${345 - i * 12})`} />
        ))}
      </g>
    </svg>
  );
}

/** Vanity — still life: mirror, palette, bottles. */
export function VanityArt({ title, ...rest }: ArtProps) {
  return (
    <svg {...base(title, "0 0 600 400", rest)}>
      <rect width="600" height="400" fill={P.ink} />
      <rect x="0" y="300" width="600" height="100" fill={P.clay} />
      <ellipse cx="160" cy="170" rx="90" ry="120" fill={P.canvas} />
      <ellipse cx="160" cy="170" rx="70" ry="98" fill={P.claySoft} />
      <ellipse cx="140" cy="130" rx="18" ry="40" fill="#fff" opacity=".5" />
      <rect x="120" y="290" width="80" height="14" rx="4" fill={P.canvas} />
      <rect x="300" y="240" width="150" height="60" rx="10" fill={P.canvas} />
      {[P.burgundy, P.clay, P.skin, P.olive].map((c, i) => (
        <circle key={c} cx={325 + i * 34} cy="270" r="13" fill={c} />
      ))}
      <rect x="490" y="180" width="50" height="120" rx="12" fill={P.burgundy} />
      <rect x="503" y="160" width="24" height="28" rx="5" fill={P.canvas} />
      <rect x="440" y="120" width="26" height="180" rx="10" fill={P.olive} />
    </svg>
  );
}

/** Eye — close-up eye with lash and olive shadow. */
export function EyeArt({ title, ...rest }: ArtProps) {
  return (
    <svg {...base(title, "0 0 500 300", rest)}>
      <rect width="500" height="300" fill={P.skin} />
      <rect width="500" height="300" fill={P.canvas} opacity=".25" />
      <path d="M90 150c60-70 260-70 320 0-60 70-260 70-320 0z" fill={P.cream} />
      <path d="M120 130c50-40 200-40 250 0" stroke={P.olive} strokeWidth="26" strokeLinecap="round" fill="none" opacity=".85" />
      <circle cx="250" cy="150" r="52" fill={P.olive} />
      <circle cx="250" cy="150" r="40" fill={P.ink} />
      <circle cx="232" cy="134" r="10" fill={P.canvas} />
      <path d="M90 150c60-70 260-70 320 0" stroke={P.ink} strokeWidth="10" strokeLinecap="round" fill="none" />
      {[110, 140, 175, 215, 260, 305, 345, 380].map((x, i) => (
        <path key={x} d={`M${x} ${112 + Math.abs(i - 4) * 4}l${i < 4 ? -10 : 6} -24`} stroke={P.ink} strokeWidth="4" strokeLinecap="round" />
      ))}
      <path d="M110 250c60-30 220-30 280 0" stroke={P.burgundy} strokeWidth="6" strokeLinecap="round" fill="none" opacity=".5" />
    </svg>
  );
}

export const artByKey = {
  portrait: PortraitArt,
  lips: LipsArt,
  compact: CompactArt,
  brush: BrushArt,
  texture: TextureArt,
  hands: HandsArt,
  botanical: BotanicalArt,
  vanity: VanityArt,
  eye: EyeArt,
} as const;

export type ArtKey = keyof typeof artByKey;
