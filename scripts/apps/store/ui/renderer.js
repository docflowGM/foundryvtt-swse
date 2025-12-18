/**
 * renderer.js
 * ------------
 * Responsible for rendering dynamic portions of the SWSE Store UI.
 *
 * Controller passes:
 *   - items          → visible items after filters/sorting
 *   - activeTab      → which panel to update
 *   - index          → full store index
 *   - controller     → state + helper access
 */

import { buildProductContext } from "./components.js";

/* ------------------------------------------------------------------ */
/* TEMPLATE CACHE                                                     */
/* ------------------------------------------------------------------ */

const TEMPLATE_CACHE = new Map();

/**
 * Load and cache a Handlebars template.
 */
async function loadTemplate(path) {
  if (TEMPLATE_CACHE.has(path)) return TEMPLATE_CACHE.get(path);

  try {
    const tpl = await getTemplate(path);
    TEMPLATE_CACHE.set(path, tpl);
    return tpl;
  } catch (err) {
    console.error(`SWSE Store | Failed to load template: ${path}`, err);
    return null;
  }
}

/**
 * Clear the template cache (useful for development).
 */
export function clearTemplateCache() {
  TEMPLATE_CACHE.clear();
}

/* ------------------------------------------------------------------ */
/* MAIN RENDERING ENTRY POINT                                         */
/* ------------------------------------------------------------------ */

/**
 * Re-render the currently active panel.
 *
 * @param {jQuery} html - the root element of the store application
 * @param {Object} ctx - rendering context object
 */
export async function renderStoreUI(html, ctx) {
  const { activeTab, items } = ctx;

  // find the matching .shop-panel
  const panel = html.find(`.shop-panel[data-panel="${activeTab}"]`);
  if (!panel.length) return;

  const productsList = panel.find(".products-list");
  if (!productsList.length) return;

  // Step 1: Clear existing products
  productsList.empty();

  // Step 2: Render based on type
  if (!items || items.length === 0) {
    renderEmptyState(productsList);
    return;
  }

  // Step 3: Render items normally
  await renderProductList(productsList, items);
}

/* ------------------------------------------------------------------ */
/* EMPTY STATE                                                        */
/* ------------------------------------------------------------------ */

function renderEmptyState(container) {
  container.append(`
    <div class="empty-message">
      <i class="fas fa-box-open"></i>
      <p>No items match your filters or search.</p>
    </div>
  `);
}

/* ------------------------------------------------------------------ */
/* PRODUCT CARD RENDERING                                             */
/* ------------------------------------------------------------------ */

const PRODUCT_CARD = "systems/foundryvtt-swse/templates/apps/store/product-card.hbs";

async function renderProductList(container, items) {
  const template = await loadTemplate(PRODUCT_CARD);
  if (!template) {
    console.error("SWSE Store | Product card template failed to load");
    return;
  }

  for (const item of items) {
    try {
      const ctx = buildProductContext(item);
      const html = template(ctx); // apply Handlebars context
      container.append(html);
    } catch (err) {
      console.error(`SWSE Store | Failed to render item: ${item.name}`, err);
    }
  }
}

/* ------------------------------------------------------------------ */
/* CART RENDERING                                                     */
/* ------------------------------------------------------------------ */

export async function renderCart(container, cartItems) {
  const tplPath = "systems/foundryvtt-swse/templates/apps/store/cart-item.hbs";
  const template = await loadTemplate(tplPath);

  container.empty();

  if (!cartItems || cartItems.length === 0) {
    container.append(`
      <div class="empty-message">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty.</p>
      </div>
    `);
    return;
  }

  if (!template) {
    console.error("SWSE Store | Cart item template failed to load");
    return;
  }

  for (const cartItem of cartItems) {
    try {
      const html = template(cartItem);
      container.append(html);
    } catch (err) {
      console.error(`SWSE Store | Failed to render cart item`, err);
    }
  }
}

/* ------------------------------------------------------------------ */
/* CATEGORY HEADER                                                    */
/* ------------------------------------------------------------------ */

export function renderCategoryHeader(panel, category, count) {
  const header = panel.find(".panel-header");
  if (header.length) {
    header.find("h4").text(category);
    header.find(".panel-desc").text(`${count} items`);
  }
}

/* ------------------------------------------------------------------ */
/* FILTERS DROPDOWN                                                   */
/* ------------------------------------------------------------------ */

export function renderAvailabilityFilter(container, options) {
  if (!container.length) return;

  const select = container.find("#shop-availability-filter");
  if (!select.length) return;

  select.empty();
  select.append(`<option value="all">All Availability</option>`);

  for (const opt of options) {
    select.append(`<option value="${opt}">${opt}</option>`);
  }
}

/* ------------------------------------------------------------------ */
/* SORT DROPDOWN                                                      */
/* ------------------------------------------------------------------ */

export function renderSortDropdown(container) {
  if (!container.length) return;

  const select = container.find("#shop-sort-select");
  if (!select.length) return;

  const options = [
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
    { value: "price-asc", label: "Price (Low to High)" },
    { value: "price-desc", label: "Price (High to Low)" },
    { value: "damage-desc", label: "Damage (Highest First)" },
    { value: "availability", label: "Availability" }
  ];

  select.empty();
  for (const opt of options) {
    select.append(`<option value="${opt.value}">${opt.label}</option>`);
  }
}

/* ------------------------------------------------------------------ */
/* ITEM COUNT BADGE                                                   */
/* ------------------------------------------------------------------ */

export function renderItemCount(container, count) {
  const badge = container.find(".item-count-badge");
  if (badge.length) {
    badge.text(count);
  }
}

/* ------------------------------------------------------------------ */
/* STATUS MESSAGE                                                     */
/* ------------------------------------------------------------------ */

export function showMessage(app, message, type = "info") {
  const msg = ui.notifications[type](message);
  return msg;
}

/* ------------------------------------------------------------------ */
/* PURCHASE HISTORY RENDERING                                         */
/* ------------------------------------------------------------------ */

export async function renderPurchaseHistory(container, actor) {
  const tplPath = "systems/foundryvtt-swse/templates/apps/store/purchase-history.hbs";
  const template = await loadTemplate(tplPath);

  if (!actor) {
    container.html(`
      <div class="empty-message">
        <i class="fas fa-ban"></i>
        <p>No actor selected. Cannot view purchase history.</p>
      </div>
    `);
    return;
  }

  const history = actor.getFlag("swse", "purchaseHistory") || [];

  if (!history.length) {
    container.html(`
      <div class="empty-message">
        <i class="fas fa-clock"></i>
        <p>No purchase history found.</p>
      </div>
    `);
    return;
  }

  if (!template) {
    console.error("SWSE Store | Purchase history template failed to load");
    return;
  }

  try {
    const entries = history
      .map(h => ({
        timestamp: new Date(h.timestamp).toLocaleString(),
        total: h.total.toLocaleString(),
        items: h.entries.map(e => ({
          name: e.name,
          qty: e.qty,
          cost: e.cost.toLocaleString(),
          type: e.type,
          condition: e.condition || "new"
        }))
      }))
      .reverse();

    const html = template({ entries });
    container.html(html);
  } catch (err) {
    console.error("SWSE Store | Failed to render purchase history:", err);
    container.html(`
      <div class="empty-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading purchase history.</p>
      </div>
    `);
  }
}
