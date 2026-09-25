# Canvas City — live Shopify catalog 0.5.0

Connected store: canvascityorg.myshopify.com.

This release replaces the deleted one-product reference with every product published to the public Shopify storefront, including automatic product and variant pagination. New published products appear on refresh without another code change.

## Live verification — 26 September 2026

- The public Storefront API successfully returned all 10 newly uploaded products.
- All 10 were reported available for sale by Shopify, priced at EGP 399 each at the time of verification.
- A real Shopify cart was created for one item, with a returned total of EGP 399 and a Shopify-hosted checkout URL.
- The automated request to the returned checkout page received HTTP 403. No browser checkout completion was verified; the merchant should open checkout in a normal browser and review it.
- No payment information was submitted, no order was placed, and no amount was charged.
- The merchant's supplied screenshots showed Paymob Active and Test mode off. Payment settlement, delivery rates and taxes still require the merchant's final checkout review.

This update does not change Shopify payment-provider settings, product prices, stock quantities, DNS or the live website. The custom frontend is delivered as a ZIP and has not been published by this update.

## How the connection works

`frontend/shopify.js` uses the Shopify Storefront API version 2026-07 without any Admin token or secret. It retrieves the public product catalog, including every product and variant through pagination. Variant price and availability come from Shopify.

The shopping bag stores only variant IDs and quantities in the visitor's browser. Those values represent the buyer's requested items, not trusted prices or payment state. On checkout, Shopify creates a cart, validates items and calculates the payable total, then returns its hosted checkout URL. The customer enters address and payment information in Shopify checkout using the store's configured payment methods. This site does not collect card details, pretend that a redirect proves payment, or write payment status locally.

Changes to prices, stock and variants appear after refreshing the page. Only publicly published products are returned; drafts and unpublished items are not exposed. If Shopify is unavailable or private, the imported preview is displayed with buying disabled. Checkout warnings or changed quantities stop the redirect and ask the customer to review the bag.

The old Paymob backend code and its security tests remain available, disabled by default and unused by the Shopify frontend. Do not enable CHECKOUT_ENABLED for this flow. The old local cart/order endpoints are not used for Shopify sales. Keep exactly one checkout provider active in the frontend.

## Run on Windows

1. Stop the old server using Ctrl+C.
2. Extract this ZIP into a new folder.
3. Open `project/START-CANVAS-CITY.cmd` from File Explorer.
4. Keep the command window open; view http://localhost:3000.

No Shopify keys or payment secrets need to be pasted into the code. Node.js 22+ is required. The launcher installs production dependencies; internet is required.

Manual commands from `backend`:

```sh
npm ci --omit=dev --ignore-scripts
npm start
```

For a static host, run `npm run build` in `project` and deploy `dist`. Keep the CSP headers in `vercel.json` or equivalent headers on another host: Shopify CDN images and the exact Shopify API origin must be allowed. The API connection works in both the Node preview and the static build; there is no need to deploy a database just for this Shopify frontend.

## Finish launch in Shopify

The store is now public. On the updated custom site, refresh the catalog, add an item to the bag, open checkout, and review delivery rates and available payment methods. A final test order/payment needs a deliberate test procedure; it has not been performed. A live provider may require merchant verification outside this code.

The storefront is not yet published by this update. Choose/configure the public hosting domain separately. The newsletter remains inactive, as before.

## Verification

From `backend`: `npm ci --ignore-scripts`, `npm run check`, `npm test`.

Tests cover the existing backend protections plus complete catalog and variant pagination, provider-owned totals, invalid quantities, checkout failure handling, live product/bag UI and locked-store preview. Shopify GraphQL operations passed the supplied Storefront schema validator. UI tests use jsdom and mocked Shopify responses; live API checks also verified catalog loading and real cart creation. A completed purchase has not been verified.

The existing Google Fonts and visual identity are retained. See SECURITY-CHANGES.md for the earlier backend security review; its catalog-only statements describe version 0.3.0 and are superseded by this Shopify connection.

## Shopify references

- https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api
- https://shopify.dev/docs/api/storefront/2026-07/queries/product
- https://shopify.dev/docs/api/storefront/2026-07/mutations/cartCreate
