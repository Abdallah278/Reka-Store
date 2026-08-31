# Claude Prompt — Secure Reka Store with a Separate Owner Admin App

You are a senior application security engineer, backend engineer, and frontend architect. Work directly inside the existing Reka Store repository. Do not only explain what should be done and do not return a conceptual mockup. Inspect the project, implement the security and architecture changes, run the tests, and report the exact files changed.

## Objective

Rebuild the application architecture so that Reka Store has two clearly separated experiences:

1. **Public storefront:** the customer-facing beauty store. It must contain no visible admin link, no admin navigation, no admin components, and no client-side code that grants or implies administrative access.
2. **Private owner console:** a separate owner-only admin experience that can be deployed on a private subdomain such as `manage.rekastore.com` or on a separate private deployment. It must share the existing protected backend, database, and secure image storage rather than duplicating business data.

The public storefront remains English LTR, premium, women-focused, and WhatsApp-only for inquiries. There must be no online payment, checkout, or fake order-completion flow.

## Important security principle

Do not treat a hidden URL as authentication. A secret-looking route is only defense in depth. Every read or mutation that exposes private information or changes products/settings must be authorized on the server for the verified owner account. The application must fail closed: if the owner identity cannot be verified, deny access.

## First step: audit before coding

Inspect the existing repository and report:

- Current frontend routes and whether the public storefront exposes an admin link.
- Existing authentication, session cookie, OAuth callback, user table, role field, `OWNER_OPEN_ID`, and admin procedures.
- Every tRPC/API procedure that reads or mutates products, categories, settings, images, or other private data.
- Existing database schema, migrations, storage helpers, and deployment assumptions.
- Any place where authorization is performed only in the browser instead of the server.

Then implement the safest practical solution without breaking the existing product catalog or image data.

## Required architecture

Prefer this architecture:

```text
Public storefront frontend
        |
        | public read procedures only
        v
Shared protected backend/API  <----  Private owner console frontend
        |
        +---- persistent database
        +---- secure object/image storage
```

Structure the code so the public storefront and owner console are separable applications or separable deployment targets. If the current environment cannot create two independently deployed frontends in one step, implement a clean separation inside the existing project first, document the exact deployment split, and ensure the backend authorization remains correct regardless of the frontend boundary.

The public route must not render or import the owner dashboard. Remove the public “Owner dashboard” link. The admin console may live behind a private hostname or a hard-to-guess path as an additional layer, but never rely on that alone.

## Owner authorization model

Implement a strict server-side owner check for every admin procedure.

- The only initial owner is the configured `OWNER_OPEN_ID` or an equivalent server-side owner identity.
- A user must be authenticated and must satisfy the owner allowlist and/or an explicitly stored `admin` role.
- Never allow a client request to set its own role to `admin`.
- Never trust `user.role` if it can be changed from a public client procedure.
- Do not expose an admin promotion endpoint.
- Use a reusable `ownerProcedure` or equivalent middleware and apply it to every admin query and mutation.
- Protect admin product reads as well as writes; do not assume that hiding buttons is enough.
- Return consistent `UNAUTHORIZED` or `FORBIDDEN` errors without leaking internal details.
- Verify that unauthenticated users, normal users, and users with forged client state cannot call admin procedures.

If the existing OAuth provider supports stronger authentication controls, document how to enable MFA or passkeys for the owner. Do not invent an MFA implementation that is not actually secure.

## Session, browser, and request security

Review and harden the existing session setup:

- Use secure, HttpOnly, appropriately scoped cookies.
- Use an appropriate SameSite policy and explain it if the admin app is on a separate origin.
- Add CSRF protection for cookie-authenticated state-changing requests, especially if the admin frontend is hosted separately.
- Validate the Origin/Referer where appropriate and use a server-issued CSRF token or an equivalent robust mechanism.
- Never put JWT secrets, owner IDs, database credentials, storage credentials, or privileged API keys in frontend code.
- Do not use localStorage for privileged session tokens.
- Add sensible session expiration and logout behavior.
- Add rate limiting or a documented platform-level equivalent for authentication and admin mutations.
- Add security headers where supported: CSP appropriate to the app, X-Frame-Options or frame-ancestors, Referrer-Policy, Permissions-Policy, and no-sniff protection.
- Ensure production error responses do not expose stack traces, SQL, credentials, or internal file paths.

Do not add security theater that creates a false sense of safety. Explain any platform limitations honestly.

## Admin console requirements

Create a polished, English LTR, responsive private owner console. It must not be accessible to normal users even if they know the URL.

The owner console must support:

- Create, edit, delete, publish/unpublish, and mark products as sold out.
- Product name, price in EGP, category, description, SKU if already supported, and multiple images.
- Secure image upload with MIME validation, file-size limits, generated storage keys, and protection against path traversal or executable uploads.
- Store name, logo, WhatsApp number, homepage headline/subtitle, hero/banner image, and primary/accent colors.
- Clear loading, empty, success, error, retry, and unauthorized states.
- Confirmation before destructive deletion.
- Visible “last updated” metadata where available.
- Audit history for product/settings mutations, recording owner identity, action, target, timestamp, and safe metadata. Do not log secrets or image contents.
- A logout action and a clear session-expired state.

Do not put private analytics, database credentials, raw storage keys, or privileged configuration values into the browser.

## Public storefront requirements

Preserve and improve the existing Reka Store storefront:

- English LTR only.
- Use the established Reka palette: `#F4E382`, `#74070E`, `#45462A`, `#947268`, and `#310E10`.
- Keep the editorial women’s beauty direction, product browsing, categories, prices, product detail gallery, and highly visible sold-out state.
- Use WhatsApp for inquiries only. The URL must contain the selected product name and formatted price. There must be no payment or checkout.
- Do not expose admin links, admin data, unpublished products, private settings, audit logs, or mutation controls.
- Use safe public procedures that return only the data required for the storefront.
- Keep the UI responsive, keyboard accessible, reduced-motion friendly, and free of horizontal overflow.

## Data and database requirements

Preserve existing catalog data. Do not drop tables or delete production data. Use the project’s schema-first migration workflow for any schema changes.

If needed, add:

- An explicit owner/admin authorization record or allowlist structure that cannot be modified by public users.
- An audit log table with least-privilege fields.
- Optional login/session security metadata only if it is genuinely used.

Use parameterized queries and existing Drizzle/tRPC conventions. Do not create test data in the production database. Use mocked database adapters or isolated tests for behavior tests.

## Testing requirements

Add and run tests for all of the following:

1. Unauthenticated users cannot open the owner console or call admin procedures.
2. Authenticated normal users cannot read private admin products or call create, update, delete, save-settings, or upload-image procedures.
3. An authorized owner can call the required admin procedures through the server-side owner check.
4. Client-side attempts to forge an admin role do not work.
5. Public product reads never return unpublished products or private admin fields.
6. WhatsApp links contain the correct encoded product name and price.
7. Invalid image MIME types, oversized uploads, unsafe filenames, and malformed payloads are rejected.
8. Audit records are created for successful product/settings mutations without secrets.
9. Session expiration and logout remove access.

Run typecheck, all unit tests, and a production build. Do not claim success if any command fails.

## Manual security verification

Use a test matrix and report results:

| Scenario | Expected result |
|---|---|
| Open public storefront | Works; no admin link or admin data |
| Visit private admin URL while logged out | Sign-in or unauthorized state; no dashboard data |
| Logged-in normal user visits admin | Forbidden; no private data |
| Normal user calls admin mutation directly | Server rejects it |
| Owner opens admin console | Full management access |
| Owner changes a product price | Storefront reflects the new price |
| Owner marks product sold out | Public badge and disabled inquiry state appear |
| Invalid image upload | Rejected safely |
| Logout or expired session | Admin access is removed |

## Deliverables

Implement the changes directly. Then provide:

- A concise architecture diagram in Markdown.
- The list of changed files and why each changed.
- The exact owner/admin configuration required in production, without exposing secret values.
- Test and build commands with their results.
- Any remaining platform limitation, especially around separate domain deployment, MFA, rate limiting, or WAF.
- A short deployment guide for `rekastore.com` and the private admin hostname.

Do not merely tell me to hide `/admin`. Build the real server-side authorization, remove public exposure, separate the admin experience, and prove it with tests.
