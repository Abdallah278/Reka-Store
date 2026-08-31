/**
 * The five Reka Store departments. Single source of truth shared by the
 * database enum, the API validation, the storefront routes and the console.
 */
export const DEPARTMENT_SLUGS = [
  "korean-skincare",
  "french-skincare",
  "makeup",
  "perfumes",
  "offers",
] as const;

export type DepartmentSlug = (typeof DEPARTMENT_SLUGS)[number];

/** Departments a product can belong to. "offers" is not an assignment —
 *  a product appears in Offers when it has a genuine originalPrice. */
export const ASSIGNABLE_DEPARTMENTS = ["korean-skincare", "french-skincare", "makeup", "perfumes"] as const;
export type AssignableDepartment = (typeof ASSIGNABLE_DEPARTMENTS)[number];

export type DepartmentMeta = {
  slug: DepartmentSlug;
  name: string;
  shortName: string;
  color: string;
  tagline: string;
  intro: string;
  categories: string[];
};

export const DEPARTMENTS: Record<DepartmentSlug, DepartmentMeta> = {
  "korean-skincare": {
    slug: "korean-skincare",
    name: "Korean Skincare",
    shortName: "Korean",
    color: "#74070E",
    tagline: "Glass skin, layer by layer",
    intro:
      "Dewy textures, honest formulas and the quiet discipline of a real routine — cleansers to creams, chosen one layer at a time.",
    categories: ["Cleansers", "Toners", "Serums", "Masks", "Moisturizers"],
  },
  "french-skincare": {
    slug: "french-skincare",
    name: "French Skincare",
    shortName: "French",
    color: "#F4E3B2",
    tagline: "Quiet luxury for everyday skin",
    intro:
      "Parisian minimalism: linen light, milk cleansers and creams that do their work without announcing themselves.",
    categories: ["Cleansing", "Hydration", "Body Care", "Treatments", "Sets"],
  },
  makeup: {
    slug: "makeup",
    name: "Makeup",
    shortName: "Makeup",
    color: "#45462A",
    tagline: "Colour with a point of view",
    intro:
      "An editorial edit of lips, face and eyes — pigment that stays true, tools worth keeping, nothing you won't use.",
    categories: ["Lips", "Face", "Eyes", "Brushes", "Palettes"],
  },
  perfumes: {
    slug: "perfumes",
    name: "Perfumes",
    shortName: "Perfumes",
    color: "#947268",
    tagline: "Worn close, remembered longer",
    intro:
      "Warm clay, amber and glass. Fragrance chosen the way you'd choose jewellery — slowly, and for yourself.",
    categories: ["Women", "Unisex", "Fresh", "Floral", "Woody", "Gift Sets"],
  },
  offers: {
    slug: "offers",
    name: "Offers",
    shortName: "Offers",
    color: "#310E10",
    tagline: "Real prices, honestly reduced",
    intro:
      "Every offer here shows the true original price next to the new one. When it's gone, it's gone — no invented urgency.",
    categories: [],
  },
};

export const DEPARTMENT_LIST = DEPARTMENT_SLUGS.map(s => DEPARTMENTS[s]);
export const isDepartmentSlug = (v: string): v is DepartmentSlug => (DEPARTMENT_SLUGS as readonly string[]).includes(v);
