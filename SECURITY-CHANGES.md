> Version 0.4.0 uses Shopify checkout in the frontend. The legacy Paymob API remains disabled and unused. See README.md for the current integration, locked-store behavior and launch blockers. The review below records version 0.3.0.

# Security review and fixes — 25 September 2026

Scope: the uploaded Canvas City archive, backend version 0.3.0. The visual catalog and product assets are preserved.

| Finding in the original code | Change |
| --- | --- |
| A signed browser payment response could be replayed against an arbitrary local order ID in the URL. | Browser redirects are now display-only and cannot update payment state. |
| Webhook order selection used merchant_order_id, extras or special_reference, none of which was part of the verified transaction HMAC field list. | Save the provider order ID from the server-to-server intention response; select the local order only by the signed transaction order.id. |
| Successful authorizations, voids/refunds or error states could satisfy the old paid test. | Validate settlement flags as well as amount, currency and integration. Ambiguous successes require review. |
| Duplicate or concurrent callbacks used read/modify/write and could overwrite a paid order. | PostgreSQL row lock and transaction protect the state transition; unique provider order and paid transaction indexes prevent reuse. Paid orders cannot be downgraded by checkout initialization or a later failure callback. |
| An older payment callback could clear a newer cart. | Clear a cart only when its items, sizes and quantities still match the paid snapshot. |
| Browser writes lacked an explicit CSRF protocol. | Require the configured Origin, JSON content type and a random session-bound CSRF token; reject cross-site requests. Provider callbacks remain separately authenticated by HMAC. |
| Proxy headers were trusted using a fixed hop count. | Trust no proxies by default; require explicit trusted addresses. Return URLs use configured origin, never request Host or forwarded headers. |
| Development sessions used a shared hardcoded secret; production accepted placeholder secrets. | Random local secret per process; production validates secrets and configuration. Secure prefixed cookies in production; API no-store headers. |
| PostgreSQL certificate verification was disabled. | Verify TLS certificates; optional private CA support; URL SSL flags cannot override verification. |
| CSP allowed arbitrary inline scripts. | Only same-origin scripts/styles (plus the existing Google Fonts CSS/fonts) are allowed. Extract return-page scripts and styles into local files; block framing, objects and base URL overrides. Static deployment gets matching headers. |
| Frontend-only catalog mode did not disable the checkout API. | CHECKOUT_ENABLED defaults to false and is enforced by the server. |
| API limiter ran repeatedly through routers; malformed inputs could become 500 responses. | Apply browser API limiter once, add checkout/newsletter limits, isolate callbacks, validate input types, bound request sizes, return safe 400/413 errors. |
| Upstream payment response text could be retained or logged. | Keep generic payment initialization failures; do not log provider bodies or billing data. |

The original frontend already escaped product/customer-facing strings in its templates, and SQL values were already parameterized. Those protections were retained. This update does not add customer accounts; order status remains accessible only to the originating session.

## Verification performed

- All JavaScript syntax checks pass.
- 16 automated tests pass: CSRF/origin attacks, session and order isolation, server-owned pricing, malformed input, cross-order payment replay, tampered HMACs, repeated callbacks, settlement flags, unknown/pending payments, changed-cart preservation, production configuration, TLS settings and forwarded-IP rate-limit bypass attempts.
- Real migration and parameterized order SQL run against PostgreSQL WASM (PGlite), including unique-constraint rollback and protection of paid state. This is not a live PostgreSQL network or multi-connection lock test.
- npm audit reports zero known vulnerabilities for the installed dependency tree at verification time. This is a dependency advisory check, not proof that the application has no vulnerabilities.
- Static catalog build and local HTTP startup are checked separately.

## Deployment limits

The Windows launcher is provided but has not been executed on Windows in this Linux workspace. Live Paymob payments, merchant-specific wallet/card callback payloads, real database TLS, external proxy behavior and a real multi-connection PostgreSQL deployment were not tested. The storefront remains catalog-only. A future live checkout needs end-to-end staging verification, durable shared abuse controls for multiple replicas, and order/payment reconciliation. No guarantee of complete security is implied.

Existing unlinked orders are not retroactively trusted. Existing refunds, chargebacks and fulfillment require manual processing; there is no automatic dispatch or email receipt system.

## Protocol references

- Paymob intention response and provider order correlation: https://developers.paymob.com/paymob-docs/intention-apis/create-intention
- Paymob transaction HMAC field sequence: https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/hmac

The cross-order replay finding follows from comparing that signed field list with the original local order-selection code.
