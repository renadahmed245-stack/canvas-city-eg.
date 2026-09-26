/* Public storefront data only. No Admin API token or payment secrets belong here. */
(function (root) {
  'use strict';
  const STORE = 'canvascityorg.myshopify.com';
  const ENDPOINT = `https://${STORE}/api/2026-07/graphql.json`;
  const VARIANT_FIELDS = `id title availableForSale price { amount currencyCode } selectedOptions { name value } image { url altText }`;
  const PRODUCTS = `query CanvasProducts($after: String) { products(first: 10, after: $after) { nodes { id title handle description productType featuredImage { url altText } priceRange { minVariantPrice { amount currencyCode } } variants(first: 20) { nodes { ${VARIANT_FIELDS} } pageInfo { hasNextPage endCursor } } } pageInfo { hasNextPage endCursor } } }`;
  const VARIANTS = `query CanvasVariants($id: ID!, $after: String) { product(id: $id) { variants(first: 50, after: $after) { nodes { ${VARIANT_FIELDS} } pageInfo { hasNextPage endCursor } } } }`;
  const CREATE_CART = `mutation CanvasCartCreate($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl totalQuantity cost { totalAmount { amount currencyCode } } lines(first: 100) { nodes { quantity merchandise { ... on ProductVariant { id } } } } } userErrors { message } warnings { message } } }`;
  async function graphql(query, variables = {}, fetcher = root.fetch.bind(root)) {
    const response = await fetcher(ENDPOINT, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok || result.errors?.length || !result.data) {
      const locked = result.errors?.some(error => /locked/i.test(error.message));
      const error = new Error(locked ? 'Online ordering opens soon. Please check back shortly.' : 'The store is temporarily unavailable. Please try again.');
      error.code = locked ? 'STORE_LOCKED' : 'STOREFRONT_UNAVAILABLE';
      throw error;
    }
    return result.data;
  }
  function safeImage(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'cdn.shopify.com' ? url.href : 'assets/canvas-city.png'; }
    catch { return 'assets/canvas-city.png'; }
  }
  function normalizeProduct(product) {
    return { id: product.id, name: product.title, handle: product.handle, category: product.productType || 'Art prints', desc: product.description || '', image: safeImage(product.featuredImage?.url), variants: product.variants.nodes.map(variant => ({ id: variant.id, name: variant.title === 'Default Title' ? 'Standard' : variant.title, available: variant.availableForSale === true, price: Number(variant.price.amount), currency: variant.price.currencyCode, image: safeImage(variant.image?.url || product.featuredImage?.url) })) };
  }
  async function products(fetcher) {
    const catalog = []; let after = null;
    do {
      const data = await graphql(PRODUCTS, { after }, fetcher);
      for (const product of data.products.nodes) {
        while (product.variants.pageInfo.hasNextPage) {
          const extra = await graphql(VARIANTS, { id: product.id, after: product.variants.pageInfo.endCursor }, fetcher);
          product.variants.nodes.push(...extra.product.variants.nodes);
          product.variants.pageInfo = extra.product.variants.pageInfo;
        }
        catalog.push(normalizeProduct(product));
      }
      after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
    } while (after);
    return catalog;
  }

  function validLines(lines) {
    if (!Array.isArray(lines) || !lines.length || lines.length > 100) throw new Error('Your bag must contain between 1 and 100 items.');
    const ids = new Set();
    return lines.map(line => {
      if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(line.merchandiseId) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10 || ids.has(line.merchandiseId)) throw new Error('Please review the quantities in your bag.');
      ids.add(line.merchandiseId);
      return { merchandiseId: line.merchandiseId, quantity: line.quantity };
    });
  }
  async function checkout(lines, fetcher) {
    const inputLines = validLines(lines);
    const data = await graphql(CREATE_CART, { input: { lines: inputLines } }, fetcher);
    const result = data.cartCreate;
    if (result.userErrors.length) throw new Error(result.userErrors.map(error => error.message).join(' '));
    if (!result.cart) throw new Error('Checkout is unavailable. Please try again.');
    const returned = result.cart.lines.nodes;
    if (result.warnings?.length || returned.length !== inputLines.length || inputLines.some(line => !returned.some(actual => actual.merchandise.id === line.merchandiseId && actual.quantity === line.quantity))) throw new Error('Availability changed. Refresh the catalog and review your bag before paying.');
    const url = new URL(result.cart.checkoutUrl);
    // The documented Shopify checkout URL comes only from Shopify, never from local storage.
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid checkout address.');
    return { url: url.href, total: result.cart.cost.totalAmount };
  }
  const api = { products, checkout, safeImage, normalizeProduct, validLines, queries: { PRODUCTS, VARIANTS, CREATE_CART }, store: STORE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CanvasShopify = api;
})(typeof window !== 'undefined' ? window : globalThis);
