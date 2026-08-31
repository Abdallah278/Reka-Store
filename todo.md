# Project TODO

- [x] Apply UI UX Pro Max guidance from the provided repository to the design system and UX workflow
- [x] Establish Arabic-first RTL storefront shell with elegant makeup brand visual direction
- [x] Build responsive catalog with category filters and product details
- [x] Display prices, galleries, and highly visible sold-out status
- [x] Add WhatsApp inquiry buttons with prefilled product name and price
- [x] Create protected owner dashboard using the existing DashboardLayout component
- [x] Add product create, edit, delete, publish, and sold-out controls
- [x] Support multiple product images with secure persistent storage
- [x] Add editable store name, logo, WhatsApp number, homepage banner, and core color palette
- [x] Add persistent database schema, queries, mutations, and admin-only authorization
- [x] Add empty, loading, success, and error states for storefront and dashboard flows
- [x] Add Vitest coverage for admin procedures
- [x] Verify desktop layout, RTL accessibility, keyboard focus, and WhatsApp flow; mobile layout remains to be checked with owner content
- [x] Run typecheck, tests, and production build
- [x] Save final checkpoint and deliver project version

- [x] Implement a real storefront image gallery with thumbnail switching for multiple product images
- [x] Apply both saved brand colors through global storefront theme variables
- [x] Add explicit error states and retry actions for storefront and dashboard queries
- [x] Add behavior tests for admin create/update/delete and save settings procedures
- [x] Verify storefront and admin layouts at mobile viewport sizes

- [x] Rename public brand and copy to Reka Store in English
- [x] Replace storefront palette with #F4E382, #74070E, #45462A, #947268, and #310E10
- [x] Update document language metadata and admin-facing brand labels for the new English identity
- [x] Re-run typecheck, tests, build, and responsive preview after the Reka Store redesign

- [x] Finish converting all public storefront copy, fallbacks, aria labels, modal text, and empty/error states to English
- [x] Wire saved primary and accent colors into live shared theme tokens instead of hardcoded storefront colors
- [x] Add explicit dashboard query error states and retry actions for products, settings, and categories
- [x] Align the palette exactly to the requested colors, including #45462A, and remove unnecessary off-palette colors
- [x] Convert remaining admin labels, helper text, toasts, and accessibility text to English
- [x] Capture a successful mobile and wider responsive preview after the redesign

- [x] Replace remaining off-palette hardcoded colors in Admin and global theme tokens with the requested Reka palette or intentional palette neutrals

- [x] Prepare a Claude rebuild prompt for a new editorial 3D feminine Reka Store direction based on the provided references

- [x] Define a secure separated admin architecture with server-side owner authorization and no public admin exposure
- [x] Decide whether to use a private admin subdomain/app sharing the existing backend or a fully separate deployment

- [x] Write a production-oriented Claude prompt for separating the public storefront from a protected owner-only admin app

- [x] Add five real department routes (/korean-skincare, /french-skincare, /makeup, /perfumes, /offers) each with its own identity colour, hero art, motion system, categories, ritual and editorial content
- [x] Extend the product model with department, genuine original price, offer expiry, brand, SKU, variant label and product notes (additive migration 0004)
- [x] Build the request-order cart (sessionStorage, sold-out guarded) and the delivery-information checkout
- [x] Create orders server-side before the WhatsApp handoff, with recalculated prices, immutable item snapshots, RKS references and a pending_contact → … → completed status workflow
- [x] Generate the complete URL-encoded WhatsApp order message from server data only, with a copy/reopen fallback on /order/:reference
- [x] Add owner console Orders (filters, detail, manual transfer/paid confirmation, private notes, history) and Reviews moderation pages
- [x] Add honest moderated reviews — approved-only display, "No reviews yet" neutral state, nothing seeded
- [x] Fix dev-server Vite config resolution (function config was spread as an object, breaking /src module serving)
- [x] Verify 375/390/768/1024/1280 widths across 10 routes with zero horizontal overflow, plus reduced-motion rendering (docs/screenshots-v2)
- [x] Re-run typecheck (clean), Vitest (137 passing) and all three production builds
