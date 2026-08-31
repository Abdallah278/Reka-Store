import type { ComponentType } from "react";
import { DEPARTMENTS, type DepartmentSlug } from "@shared/departments";
import { BotanicalArt, BrushArt, EyeArt, HandsArt, LipsArt, PortraitArt, TextureArt, VanityArt } from "./art/BeautyArt";
import { CreamJarArt, DropletsArt, LipstickBulletArt, MistArt, OfferMarkArt, PaletteQuadArt, PerfumeBottleArt, SerumBottleArt, SilkArt } from "./art/DeptArt";

export { DEPARTMENTS, DEPARTMENT_LIST, isDepartmentSlug, type DepartmentSlug } from "@shared/departments";

type Art = ComponentType<{ title: string; className?: string }>;

export type DeptVisual = {
  slug: DepartmentSlug;
  /** Hero + motif artwork (original SVG, palette-matched). */
  hero: Art;
  motif: Art;
  extra: Art;
  /** Whether the department hero sits on a dark ground (drives text colour). */
  dark: boolean;
  /** Inline styles derived from the department identity colour. */
  heroStyle: React.CSSProperties;
  chipStyle: React.CSSProperties;
  /** Animation class applied to the floating hero motif. */
  motifAnim: string;
  eyebrow: string;
  ritualTitle: string;
  ritual: { step: string; title: string; text: string }[];
  editorial: { eyebrow: string; title: string; text: string; art: Art }[];
};

const d = DEPARTMENTS;

export const DEPT_VISUALS: Record<DepartmentSlug, DeptVisual> = {
  "korean-skincare": {
    slug: "korean-skincare",
    hero: SerumBottleArt,
    motif: DropletsArt,
    extra: HandsArt,
    dark: true,
    heroStyle: { background: `linear-gradient(160deg, ${d["korean-skincare"].color} 0%, #310E10 78%)` },
    chipStyle: { backgroundColor: "color-mix(in srgb, #74070E 12%, transparent)", color: "#74070E" },
    motifAnim: "anim-float",
    eyebrow: "Department 01 · Seoul routine",
    ritualTitle: "The layering ritual",
    ritual: [
      { step: "01", title: "Cleanse, twice", text: "An oil first, a gel after. Skin that starts clean holds everything else better." },
      { step: "02", title: "Tone & essence", text: "Light watery layers, pressed in with palms — this is where the dew comes from." },
      { step: "03", title: "Serum, then seal", text: "Targeted actives, then a moisturizer to keep the whole layer story in place." },
    ],
    editorial: [
      { eyebrow: "Texture", title: "Glass, not gloss", text: "The look is hydration, layered patiently — not shine painted on top.", art: DropletsArt },
      { eyebrow: "Ritual", title: "Ten minutes, honestly", text: "A real routine you'll keep beats a ten-step one you won't.", art: HandsArt },
    ],
  },
  "french-skincare": {
    slug: "french-skincare",
    hero: CreamJarArt,
    motif: SilkArt,
    extra: PortraitArt,
    dark: false,
    heroStyle: { background: `linear-gradient(160deg, ${d["french-skincare"].color} 0%, #fbf4d6 70%)` },
    chipStyle: { backgroundColor: "color-mix(in srgb, #947268 16%, transparent)", color: "#45462A" },
    motifAnim: "anim-drift",
    eyebrow: "Department 02 · Paris apothecary",
    ritualTitle: "La belle routine",
    ritual: [
      { step: "01", title: "Milk, not foam", text: "Gentle cleansing that respects the skin you already have." },
      { step: "02", title: "One good cream", text: "Chosen well, used daily — quiet luxury is mostly consistency." },
      { step: "03", title: "Body included", text: "The French never stop at the jawline. Neither should the ritual." },
    ],
    editorial: [
      { eyebrow: "Mood", title: "Linen light", text: "Soft mornings, marble counters, one shelf of things that earn their place.", art: SilkArt },
      { eyebrow: "Portrait", title: "Skin, comfortable", text: "The goal isn't new skin. It's yours, at ease.", art: PortraitArt },
    ],
  },
  makeup: {
    slug: "makeup",
    hero: LipstickBulletArt,
    motif: PaletteQuadArt,
    extra: BrushArt,
    dark: true,
    heroStyle: { background: `linear-gradient(160deg, ${d.makeup.color} 0%, #310E10 80%)` },
    chipStyle: { backgroundColor: "color-mix(in srgb, #45462A 14%, transparent)", color: "#45462A" },
    motifAnim: "anim-tilt-sway",
    eyebrow: "Department 03 · The studio",
    ritualTitle: "Build your look",
    ritual: [
      { step: "01", title: "Face first", text: "Cream where skin should look like skin. Powder only where it must stay." },
      { step: "02", title: "One colour story", text: "Let cheeks and lips share a family — olive, nude, burgundy." },
      { step: "03", title: "Eyes, last", text: "Finish with definition once the rest of the face has settled." },
    ],
    editorial: [
      { eyebrow: "Pigment", title: "Colour that stays true", text: "Swatched in warm light, chosen for real skin tones.", art: TextureArt },
      { eyebrow: "Tools", title: "Fewer, better brushes", text: "A dense rounded brush does three jobs. Keep the good one.", art: BrushArt },
    ],
  },
  perfumes: {
    slug: "perfumes",
    hero: PerfumeBottleArt,
    motif: MistArt,
    extra: BotanicalArt,
    dark: true,
    heroStyle: { background: `linear-gradient(160deg, ${d.perfumes.color} 0%, #310E10 85%)` },
    chipStyle: { backgroundColor: "color-mix(in srgb, #947268 18%, transparent)", color: "#310E10" },
    motifAnim: "anim-float-slow",
    eyebrow: "Department 04 · The fragrance room",
    ritualTitle: "How to wear it",
    ritual: [
      { step: "01", title: "Warm points", text: "Wrists, neck, behind the ears — where skin warms the notes open." },
      { step: "02", title: "Don't rub", text: "Let it dry. Rubbing breaks the top notes before they've spoken." },
      { step: "03", title: "Layer lightly", text: "An unscented cream underneath makes any fragrance last longer." },
    ],
    editorial: [
      { eyebrow: "Notes", title: "Top, heart, base", text: "The first hour is the introduction. The base is who it really is.", art: MistArt },
      { eyebrow: "Still life", title: "Amber & glass", text: "Bottles that look right on the shelf you already own.", art: BotanicalArt },
    ],
  },
  offers: {
    slug: "offers",
    hero: OfferMarkArt,
    motif: VanityArt,
    extra: LipsArt,
    dark: true,
    heroStyle: { background: `linear-gradient(165deg, ${d.offers.color} 0%, #74070E 130%)` },
    chipStyle: { backgroundColor: "color-mix(in srgb, #F4E382 20%, transparent)", color: "#310E10" },
    motifAnim: "anim-rise",
    eyebrow: "Department 05 · The honest sale",
    ritualTitle: "How offers work here",
    ritual: [
      { step: "01", title: "Real original prices", text: "Every strikethrough is the price the piece actually sold for." },
      { step: "02", title: "Real end dates", text: "A countdown only appears when an offer truly expires." },
      { step: "03", title: "Same WhatsApp flow", text: "Order request first, confirmation and transfer details in chat." },
    ],
    editorial: [
      { eyebrow: "Promise", title: "No invented urgency", text: "If nothing is on offer, this page says so — plainly.", art: EyeArt },
      { eyebrow: "Edit", title: "Good pieces, better prices", text: "Offers rotate through every department, not just leftovers.", art: VanityArt },
    ],
  },
};
