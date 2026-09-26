'use strict';
const shop = window.CanvasShopify;
let products = [], live = false, filter = 'all', query = '', selectedProduct;
let bag = [];
try {
  const saved = JSON.parse(localStorage.getItem('cc-shopify-bag') || '[]');
  if (Array.isArray(saved) && saved.length) bag = shop.validLines(saved);
} catch { bag = []; }
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
function money(amount, currency = 'EGP') { return new Intl.NumberFormat('en-EG', { style: 'currency', currency }).format(amount); }
function toast(message) { $('.toast').textContent = message; $('.toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => $('.toast').classList.remove('show'), 4500); }
function persistBag() { try { localStorage.setItem('cc-shopify-bag', JSON.stringify(bag)); } catch {} }
function variantById(id) { for (const product of products) { const variant = product.variants.find(value => value.id === id); if (variant) return { product, variant }; } return null; }
function renderFilters() {
  const categories = [...new Set(products.map(product => product.category))];
  $('.filters').innerHTML = '<button class="filter active" data-filter="all">All</button>' + categories.map(category => `<button class="filter" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
  filter = 'all';
}
function renderProducts() {
  const matches = products.filter(product => (filter === 'all' || product.category === filter) && product.name.toLowerCase().includes(query));
  $('#product-grid').innerHTML = matches.map(product => {
    const variant = product.variants.find(value => value.available) || product.variants[0];
    const minimum = Math.min(...product.variants.map(value => value.price));
    const available = product.variants.some(value => value.available);
    return `<article class="product-card" data-id="${escapeHtml(product.id)}" tabindex="0" aria-label="View ${escapeHtml(product.name)}"><div class="product-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy"><span class="product-tag">${!live ? 'Coming soon' : available ? 'Available' : 'Sold out'}</span><button class="quick-add" data-view="${escapeHtml(product.id)}">View details</button></div><div class="product-meta"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)}</p><strong>${variant ? `${product.variants.length > 1 ? 'From ' : ''}${money(minimum, variant.currency)}` : 'Unavailable'}</strong></div></article>`;
  }).join('');
  $('.empty-state').hidden = matches.length > 0;
  $('.empty-state').textContent = products.length ? 'No pieces match that search.' : 'New pieces are coming soon.';
}
function openProduct(id) {
  selectedProduct = products.find(product => product.id === id);
  if (!selectedProduct) return;
  const p = selectedProduct;
  $('.modal-content').innerHTML = `<div class="modal-grid"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"><div class="modal-info"><p class="eyebrow">${escapeHtml(p.category)}</p><h2>${escapeHtml(p.name)}</h2><div class="price"></div><p class="product-description">${escapeHtml(p.desc)}</p><div class="option"><label for="variant-select">Choose your piece</label><select id="variant-select">${p.variants.map(v => `<option value="${escapeHtml(v.id)}" ${live && !v.available ? 'disabled' : ''}>${escapeHtml(v.name)}${live && !v.available ? ' — sold out' : ''}</option>`).join('')}</select></div><button class="button primary" data-modal-add>Add to bag</button></div></div>`;
  const available = p.variants.find(v => v.available);
  if (available) $('#variant-select').value = available.id;
  updateVariant();
  $('.product-modal').showModal();
}
function updateVariant() {
  const variant = selectedProduct?.variants.find(v => v.id === $('#variant-select')?.value);
  $('.modal-info .price').textContent = variant ? money(variant.price, variant.currency) : 'Unavailable';
  const button = $('[data-modal-add]');
  button.disabled = !live || !variant?.available;
  button.textContent = !live ? 'Ordering opens soon' : variant?.available ? 'Add to bag' : 'Sold out';
  if (variant) $('.modal-grid img').src = variant.image;
}
function renderCart() {
  $('.cart-count').textContent = bag.reduce((sum, line) => sum + line.quantity, 0);
  $('.cart-items').innerHTML = bag.map(line => {
    const match = variantById(line.merchandiseId);
    if (!match) return `<div class="cart-item"><div><h4>Item no longer available</h4><button data-remove="${escapeHtml(line.merchandiseId)}">Remove</button></div></div>`;
    const { product, variant } = match;
    return `<div class="cart-item"><img src="${escapeHtml(variant.image)}" alt="${escapeHtml(product.name)}"><div><h4>${escapeHtml(product.name)}</h4><p>${escapeHtml(variant.name)} · ${money(variant.price, variant.currency)}</p>${live && !variant.available ? '<p>Sold out — remove to continue</p>' : ''}<div class="quantity"><button data-qty="${line.quantity - 1}" data-variant="${escapeHtml(variant.id)}" aria-label="Decrease quantity">−</button><span>${line.quantity}</span><button data-qty="${line.quantity + 1}" data-variant="${escapeHtml(variant.id)}" aria-label="Increase quantity" ${line.quantity >= 10 ? 'disabled' : ''}>+</button></div><button data-remove="${escapeHtml(variant.id)}">Remove</button></div><strong>${money(variant.price * line.quantity, variant.currency)}</strong></div>`;
  }).join('');
  $('.cart-footer').hidden = bag.length === 0;
  $('.cart-empty').hidden = bag.length > 0;
  const currencies = new Set(bag.map(line => variantById(line.merchandiseId)?.variant.currency).filter(Boolean));
  const total = bag.reduce((sum, line) => sum + (variantById(line.merchandiseId)?.variant.price || 0) * line.quantity, 0);
  $('.cart-total').textContent = currencies.size <= 1 ? money(total, [...currencies][0] || 'EGP') : 'Calculated at checkout';
  $('.checkout').disabled = !live || !bag.length || bag.some(line => !variantById(line.merchandiseId)?.variant.available);
}
function addToBag(id) {
  const match = variantById(id);
  if (!live || !match?.variant.available) return;
  const existing = bag.find(line => line.merchandiseId === id);
  if (existing?.quantity >= 10 || (!existing && bag.length >= 100)) { toast('Please review the quantities in your bag.'); return; }
  if (existing) existing.quantity++;
  else bag.push({ merchandiseId: id, quantity: 1 });
  persistBag(); renderCart(); toast('Added to your bag');
}
function openCart() { $('.cart-drawer').classList.add('open'); $('.cart-drawer').setAttribute('aria-hidden', 'false'); $('.cart-button').setAttribute('aria-expanded', 'true'); $('.overlay').hidden = false; $('.cart-drawer').focus(); }
function closeCart() { $('.cart-drawer').classList.remove('open'); $('.cart-drawer').setAttribute('aria-hidden', 'true'); $('.cart-button').setAttribute('aria-expanded', 'false'); $('.overlay').hidden = true; }
async function loadCatalog() {
  $('.catalog-notice').textContent = 'LOADING THE LATEST DROP…';
  try {
    products = await shop.products(); live = true;
    $('.catalog-notice').textContent = 'THE LATEST DROP · CHECKOUT THROUGH SHOPIFY';
  } catch (error) {
    products = window.CANVAS_CATALOG_PREVIEW || []; live = false;
    $('.catalog-notice').textContent = error.code === 'STORE_LOCKED' ? 'CATALOG PREVIEW · ORDERING OPENS SOON' : 'CATALOG PREVIEW · ORDERING TEMPORARILY UNAVAILABLE';
  }
  renderFilters(); renderProducts(); renderCart();
}
$('.filters').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; $('.filter.active')?.classList.remove('active'); button.classList.add('active'); filter = button.dataset.filter; renderProducts(); });
$('#product-search').addEventListener('input', event => { query = event.target.value.trim().toLowerCase(); renderProducts(); });
$('#product-grid').addEventListener('click', event => { const card = event.target.closest('[data-id]'); if (card) openProduct(card.dataset.id); });
$('#product-grid').addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('.product-card')) openProduct(event.target.dataset.id); });
$('.modal-content').addEventListener('change', event => { if (event.target.id === 'variant-select') updateVariant(); });
$('.modal-content').addEventListener('click', event => { if (event.target.closest('[data-modal-add]')) { addToBag($('#variant-select').value); $('.product-modal').close(); } });
$('.modal-close').addEventListener('click', () => $('.product-modal').close());
$('.cart-button').addEventListener('click', openCart);
$('.close-cart').addEventListener('click', closeCart);
$('.overlay').addEventListener('click', closeCart);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCart(); });
$('.cart-items').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]'), quantity = event.target.closest('[data-qty]');
  if (remove) bag = bag.filter(line => line.merchandiseId !== remove.dataset.remove);
  else if (quantity) {
    const line = bag.find(item => item.merchandiseId === quantity.dataset.variant);
    const value = Number(quantity.dataset.qty);
    if (!line || !Number.isInteger(value) || value < 0 || value > 10) return;
    line.quantity = value; bag = bag.filter(item => item.quantity > 0);
  } else return;
  persistBag(); renderCart();
});
$('.checkout').addEventListener('click', async () => {
  if (!live || !bag.length) return;
  const button = $('.checkout'); button.disabled = true; button.textContent = 'Opening secure checkout…';
  try { const result = await shop.checkout(bag); window.location.assign(result.url); }
  catch (error) { toast(error.message); button.textContent = 'Continue to checkout'; renderCart(); }
});
$('.newsletter').addEventListener('submit', event => { event.preventDefault(); toast('Email updates are opening soon.'); });
$('.search-toggle').addEventListener('click', () => { $('#shop').scrollIntoView({ behavior: 'smooth' }); $('#product-search').focus(); });
$('.menu-button').addEventListener('click', event => { const open = $('.nav').classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', open); });
document.querySelectorAll('.nav a').forEach(link => link.addEventListener('click', () => { $('.nav').classList.remove('open'); $('.menu-button').setAttribute('aria-expanded', 'false'); }));
loadCatalog();
