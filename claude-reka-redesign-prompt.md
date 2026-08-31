# Claude Prompt — Rebuild Reka Store as an Immersive 3D Beauty Experience

You are a senior product designer and frontend engineer. You are working inside the existing Reka Store project. Your job is to redesign the public storefront from the ground up so it feels like a premium women’s beauty editorial experience, not a generic ecommerce template.

Do not start coding immediately. First inspect the existing project structure, current routes, database schema, tRPC procedures, authentication flow, image-storage helpers, reusable UI components, and the current storefront/admin behavior. Preserve the existing backend contracts and data model unless a change is genuinely necessary. Do not remove the protected owner dashboard, persistent database, secure image storage, product CRUD, sold-out state, settings management, or WhatsApp inquiry flow.

## Core creative direction

Create an original visual language for **Reka Store**, inspired by the following principles but never copied literally:

1. From immersive editorial websites: oversized typography, sparse but confident navigation, scroll-led storytelling, dramatic section transitions, layered compositions, and a sense of entering a visual world.
2. From experimental 3D product websites: full-bleed scenes, progress-based discovery, atmospheric depth, animated objects, parallax, and carefully paced reveals.
3. From the supplied women-focused reference image: premium social-editorial moodboards, rounded modular panels, portrait-led cards, circular crops, layered image tiles, profile-style information blocks, and deep burgundy accents.

Do not copy any logo, text, illustration, layout, image, animation, or proprietary identity from the references. The result must feel like a distinct Reka Store brand.

## Brand and visual system

The storefront must be English-first and use LTR direction. The brand name is **Reka Store**. Use this exact palette as the foundation:

| Role | Color |
|---|---|
| Main background | `#F4E382` |
| Burgundy accent | `#74070E` |
| Olive support | `#45462A` |
| Clay / skin-tone surface | `#947268` |
| Deep ink / contrast | `#310E10` |

Use the palette as a system, not as random decoration. The yellow should be the recognizable canvas; burgundy should define CTAs and important states; olive should support copy and metadata; clay should create cards and image frames; deep ink should anchor navigation, footer, and high-contrast controls. Keep white or transparent surfaces only when they improve readability.

Use a sophisticated editorial type pairing: a high-contrast display serif for major headlines and a clean modern sans-serif for navigation, metadata, prices, and controls. Avoid childish, overly rounded, neon, or generic SaaS styling. Use generous whitespace, intentional asymmetry, strong rhythm, refined borders, soft shadows, and restrained motion.

## Public storefront experience

Replace the current generic hero with an immersive opening scene. The first viewport should immediately communicate premium women’s beauty. Include a large editorial headline, a short brand statement, a strong product/category CTA, and a composition featuring one or more tasteful beauty portraits or abstract beauty imagery. The image treatment should feel like a fashion editorial: cropped portraits, close-up makeup details, hands holding beauty products, glossy textures, skincare or cosmetics still life, and layered frames.

Use multiple women-focused visual moments throughout the page, not one isolated hero image. Include a portrait collage, a beauty ritual section, product category cards, a horizontal or diagonal editorial strip, and a final brand statement. Use only licensed, public-domain, user-provided, or AI-generated assets. Never scrape or hotlink random copyrighted images. Never use fake customer reviews, fake ratings, fake testimonials, or invented social proof.

Design the page as a scroll narrative with these sections:

- A minimal floating navigation bar with the Reka Store mark, Collection, Beauty journal or brand story, Contact, and a visible owner-dashboard entry that does not dominate the customer experience.
- An immersive hero with a layered portrait/product composition, oversized headline, subtle cursor/hover response, and two CTAs: Explore collection and Ask on WhatsApp.
- A short brand manifesto using large editorial type and an animated line, shape, or image transition.
- A visual category discovery area with cards for makeup categories such as Lips, Face, Eyes, and Tools. Categories must come from the existing data when available, with graceful fallback labels.
- A curated product collection that remains highly usable. Include search, category filters, price, product image, product name, availability, and a clear Ask on WhatsApp action.
- A beauty ritual / editorial section with several portrait or beauty-detail panels and short English copy. Keep it brand storytelling, not medical claims.
- A product detail experience in a beautiful modal or dedicated route with a real multi-image gallery, thumbnail switching, keyboard accessibility, price, description, category, prominent Sold out state, and a prefilled WhatsApp inquiry link containing product name and formatted price.
- A final CTA and footer with the store name, WhatsApp contact, Instagram placeholder only if configured, and essential policy links if they exist.

## 3D and motion requirements

Use a tasteful, performant 3D feel. Prefer CSS 3D transforms, perspective, layered planes, parallax, hover tilt, depth shadows, floating image cards, masked transitions, and scroll-linked reveals before introducing a heavy WebGL scene. If you use Three.js or another 3D library, keep it lightweight, lazy-load it, and provide a static fallback for mobile, reduced-motion users, slow devices, and failed rendering.

The interface should feel tactile: cards can subtly tilt toward the pointer, images can move at different parallax speeds, and panels can reveal with depth. Never make the page hard to use. Keep interactive transitions mostly between 150ms and 350ms. Respect `prefers-reduced-motion`; in that mode disable tilt, parallax, autoplay, and nonessential transforms while preserving content and hierarchy.

Add a small scroll progress indicator or section index only if it improves orientation. Do not add continuous distracting animations, excessive bouncing, fake loading screens, or interactions that hide the products.

## Product and WhatsApp behavior

Keep the current WhatsApp-only inquiry model. There must be no checkout, online payment, cart payment, or fake order-completion flow. Every available product should have an obvious WhatsApp inquiry button. Generate a safe WhatsApp URL using the stored store number and a URL-encoded English message such as: `Hi, I would like to ask about [PRODUCT NAME], priced at [PRICE].`

Sold-out products must remain visible when appropriate but show a highly prominent Sold out badge, disabled inquiry action, and clear unavailable treatment. Do not make sold-out products look like available products.

## Owner dashboard preservation

Do not redesign away or break the protected owner dashboard. Keep the existing admin authentication and authorization rules. The owner must still be able to add, edit, delete, publish/unpublish, mark sold out, set product name, price, category, description, and upload multiple product images.

The owner must still be able to edit store name, logo, WhatsApp number, homepage headline/subtitle, hero/banner image, primary color, and accent color. Ensure live settings are consumed by the public storefront through CSS variables or a theme object rather than being displayed only in the form. Keep dashboard labels and helper copy in English and preserve loading, error, retry, success, and empty states.

## Technical constraints

Use the project’s existing React, TypeScript, Tailwind, tRPC, Drizzle, authentication, and storage conventions. Reuse existing shadcn/ui components when appropriate. Do not introduce a second API layer, duplicate database, mock backend, local-only image storage, or hardcoded product catalog.

All images must use the existing secure storage workflow or a properly managed remote asset URL. Do not place large images in `client/public` or bundle large binary assets into the application. Add meaningful alt text, lazy loading where appropriate, explicit image dimensions or aspect-ratio containers, and graceful fallbacks.

Keep the site responsive at 375px, 768px, 1024px, and 1280px. The mobile layout should be a deliberate composition, not merely a collapsed desktop layout. Avoid horizontal overflow. Keep touch targets comfortably sized. Ensure visible focus states, semantic buttons and links, keyboard-accessible dialogs, accessible labels, sufficient contrast, and no motion-only information.

## Implementation workflow

Work in these stages and report what you found before each major stage:

1. Audit the existing project and summarize what will be preserved.
2. Define the new design tokens, layout map, component map, image strategy, and motion strategy.
3. Implement the public storefront redesign without breaking backend contracts.
4. Integrate the live settings, product gallery, sold-out states, filtering, and WhatsApp behavior.
5. Verify the protected owner dashboard and fix any language or visual consistency issues.
6. Run typecheck, unit tests, and production build.
7. Capture desktop and mobile screenshots and inspect them critically for hierarchy, overflow, contrast, spacing, and visual polish.
8. Fix all issues found in the review, then summarize changed files, tests, known limitations, and next steps.

## Acceptance criteria

The work is complete only when all of the following are true:

- Reka Store looks like an original, premium, women-focused beauty brand with an immersive editorial and 3D-inspired experience.
- The requested five-color palette is visibly and consistently used.
- The storefront is English LTR and contains no accidental Arabic or mixed-language UI copy.
- Multiple tasteful women/beauty visual moments are used without fabricated testimonials or unlicensed scraped imagery.
- Product browsing, search, category filters, price, product details, real multi-image gallery, and prominent sold-out states work.
- WhatsApp inquiry links contain the selected product name and price and do not imply online checkout.
- The protected owner dashboard still manages products, images, sold-out state, publishing, and store identity settings.
- Saved brand settings visibly affect the public storefront.
- The experience is responsive, keyboard accessible, reduced-motion friendly, and free of horizontal overflow.
- TypeScript, tests, and production build pass.

Before finishing, do not claim the design is complete if screenshots reveal generic sections, weak hierarchy, low contrast, broken mobile composition, fake-looking imagery, or excessive motion. Iterate until the result feels intentionally designed for a women’s makeup brand.
