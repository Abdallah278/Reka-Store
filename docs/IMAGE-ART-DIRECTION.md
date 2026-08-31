# Reka Store — image art-direction map

Palette: canvas `#F4E382` · burgundy `#74070E` · olive `#45462A` · clay `#947268` · ink `#310E10`
(+ derived surfaces: cream `#FBF4D6`, soft clay `#D9C5B6`, warm skin `#C9A08C / #A97B67`).

## Status of imagery (honest)

* No licensed photography was supplied by the owner and no image-generation
  credentials (`BUILT_IN_FORGE_API_KEY`) exist in this environment.
* Pinterest / reference sites were treated as **mood only**; nothing was
  downloaded, hot-linked or copied.
* Therefore every visual slot renders an **original SVG composition** from
  `client/src/storefront/art/BeautyArt.tsx`, drawn entirely in the palette
  (stylised portrait, lips, compact, brush, texture, hands + serum, botanical,
  vanity still-life, eye close-up). They are intentionally illustrative, not
  photo-realistic, so nothing reads as fake photography.
* Real photography replaces them without code changes in two places: the
  **hero** (store settings → banner upload) and **product images** (product
  uploads). The remaining slots are keyed by name below for a later swap.

## Per-section map

| Section | Slot | Subject (final photo brief) | Crop / ratio | Dominant palette | Treatment | Current fallback |
|---|---|---|---|---|---|---|
| Hero | main plane | Woman, ¾ profile, burgundy lip, warm side light, clay/cream backdrop | 4:5 | clay + skin + burgundy | `.brand-tone` warm multiply overlay, ink shadow | `PortraitArt` |
| Hero | lip card | Macro of lips + lipstick bullet | 4:5 | canvas + burgundy | none (card on canvas) | `LipsArt` |
| Hero | circle | Blush compact, top-down | 1:1 circle | clay + ink | canvas ring | `CompactArt` |
| Manifesto | masked reveal | Hand holding glass serum bottle, warm light | 4:5 | soft clay + canvas | scroll-linked clip reveal | `HandsArt` |
| Categories | Lips / Face / Eyes / Tools | Category macro (lips / cream texture / eye + olive shadow / brush) | 4:5 | per card | ink gradient at foot for legibility | `LipsArt`, `TextureArt`, `EyeArt`, `BrushArt` |
| Collection | product cards | Product still-life on cream or clay, soft shadow | 4:5 | cream/clay + product colour | warm overlay, grayscale-40% when sold out | product upload → else category art |
| Journal | 6 panels | Vanity still-life, eye, texture, portrait on clay, brush, hands | 4:3 / 5:4 / 4:5 | mixed but always warm | ink gradient foot | `VanityArt`, `EyeArt`, `TextureArt`, `PortraitArt(clay)`, `BrushArt`, `HandsArt` |
| Strip | 6 tilted tiles | Alternating macro / portrait | 4:5 & 1:1 | palette | cream frame, ±4° rotate, scroll drift | mixed art |
| Closing | circle | Petal / botanical | 1:1 circle | canvas + burgundy + olive | canvas ring on ink | `BotanicalArt` |
| Console | none | — | — | — | — | — |

## Photo selection / generation checklist

Prefer: golden or warm side light · cream, clay or canvas backgrounds ·
burgundy lip/nail/wardrobe accents · olive botanicals · muted natural skin ·
adult subjects, editorial not sexualised · no logos, no celebrities, no
user-generated-content look.

Avoid: cool blue/cyan light, neon purple, bright green, hard white seamless,
multicolour props.

If a shot is slightly off-palette, use the existing `.brand-tone` overlay
(canvas → burgundy → ink multiply at 14–22 %) rather than a heavy filter, so
skin and makeup stay natural.

## Accessibility

Every art component sets `role="img"` and a descriptive `aria-label`;
photographs get explicit `alt` text; all slots use fixed aspect-ratio
containers (no layout shift) and `loading="lazy"` except the hero.
