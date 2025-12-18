/**
 * components.js
 * --------------
 * Reusable UI component helpers for SWSE Store 2.0.
 *
 * These functions DO NOT modify application state.
 * They only convert store items into UI-ready pieces or
 * update small UI fragments (like the cart badge).
 */

/* -------------------------------------------------- */
/* PRICE FORMATTING                                   */
/* -------------------------------------------------- */

export function formatCredits(amount) {
  if (amount == null || isNaN(amount)) return "—";
  try {
    return amount.toLocaleString();
  } catch {
    return String(amount);
  }
}

export function formatPrice(amount) {
  return formatCredits(amount) + " cr";
}

/* -------------------------------------------------- */
/* RARITY BADGES                                      */
/* -------------------------------------------------- */

export function rarityBadge(item) {
  if (!item.rarityClass) return "";
  const className = `rarity-${item.rarityClass.toLowerCase()}`;
  return `
    <span class="rarity-badge ${className}" title="${item.rarityLabel}">
      <i class="fas fa-star"></i> ${item.rarityLabel}
    </span>
  `;
}

/* -------------------------------------------------- */
/* ITEM → UI CONTEXT                                  */
/* -------------------------------------------------- */

/**
 * Convert a StoreItem into a context object
 * suitable for product-card.hbs rendering.
 */
export function buildProductContext(item) {
  const desc = (item.system?.description || "").slice(0, 140);
  const summary = desc.length >= 140 ? desc + "..." : desc;

  return {
    id: item.id,
    name: item.name,
    img: item.img,
    cost: formatCredits(item.finalCost),
    costRaw: item.finalCost,
    costUsed: item.finalCostUsed ? formatCredits(item.finalCostUsed) : null,
    availability: item.availability,
    rarityClass: item.rarityClass,
    rarityLabel: item.rarityLabel,
    rarityBadge: rarityBadge(item),
    description: summary,
    damage: item.system?.damage || null,
    category: item.category,
    subcategory: item.subcategory,
    type: item.type
  };
}

/**
 * Convert multiple items for bulk rendering.
 */
export function buildProductContexts(items) {
  return items.map(buildProductContext);
}

/* -------------------------------------------------- */
/* CART BADGE UPDATE                                  */
/* -------------------------------------------------- */

export function updateCartBadge(app, count) {
  const badge = app.element.find("#cart-count");
  if (!badge.length) return;

  badge.text(count);

  // highlight animation
  badge.addClass("pulse");
  setTimeout(() => badge.removeClass("pulse"), 450);
}

/* -------------------------------------------------- */
/* EXPANDABLE CARD DETAILS                            */
/* -------------------------------------------------- */

export function attachExpandableDetails(html) {
  html.find(".product-card .details-toggle").on("click", ev => {
    ev.preventDefault();
    ev.stopPropagation();

    const card = ev.currentTarget.closest(".product-card");
    if (!card) return;

    const $card = $(card);
    $card.toggleClass("expanded");
  });
}

/* -------------------------------------------------- */
/* DAMAGE DISPLAY                                     */
/* -------------------------------------------------- */

export function formatDamage(damageString) {
  if (!damageString) return null;
  const clean = String(damageString).trim();
  if (!clean) return null;
  return clean;
}

/* -------------------------------------------------- */
/* STAR RATING (for reviews, Phase 5)                 */
/* -------------------------------------------------- */

export function buildStarRating(rating) {
  if (!rating || rating < 0 || rating > 5) return "";
  const stars = Math.round(rating);
  let html = "";
  for (let i = 0; i < 5; i++) {
    const filled = i < stars ? "fas" : "far";
    html += `<i class="${filled} fa-star"></i>`;
  }
  return html;
}

/* -------------------------------------------------- */
/* AVAILABILITY TAG                                   */
/* -------------------------------------------------- */

export function availabilityTag(availability) {
  if (!availability) return "";

  const normal = availability.toLowerCase().trim();
  let className = "availability-standard";
  let icon = "fa-check-circle";

  if (normal.includes("restricted")) {
    className = "availability-restricted";
    icon = "fa-exclamation-triangle";
  } else if (normal.includes("illegal")) {
    className = "availability-illegal";
    icon = "fa-ban";
  } else if (normal.includes("military")) {
    className = "availability-military";
    icon = "fa-shield-alt";
  } else if (normal.includes("rare")) {
    className = "availability-rare";
    icon = "fa-gem";
  } else if (normal.includes("licensed")) {
    className = "availability-licensed";
    icon = "fa-certificate";
  }

  return `<span class="availability-tag ${className}"><i class="fas ${icon}"></i> ${availability}</span>`;
}

/* -------------------------------------------------- */
/* CATEGORY ICON                                      */
/* -------------------------------------------------- */

export function getCategoryIcon(category) {
  const icons = {
    "Weapons": "fas fa-sword",
    "Armor": "fas fa-shield-alt",
    "Medical": "fas fa-heartbeat",
    "Tech": "fas fa-microchip",
    "Tools": "fas fa-tools",
    "Survival": "fas fa-backpack",
    "Security": "fas fa-lock",
    "Equipment": "fas fa-box",
    "Services": "fas fa-handshake",
    "Droids": "fas fa-robot",
    "Vehicles": "fas fa-rocket"
  };

  return icons[category] || "fas fa-cube";
}

/* -------------------------------------------------- */
/* ABBREVIATE LONG TEXT                               */
/* -------------------------------------------------- */

export function abbreviate(text, maxLen = 25) {
  if (!text) return "";
  const str = String(text);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

/* -------------------------------------------------- */
/* QUANTITY INPUT HELPERS                             */
/* -------------------------------------------------- */

export function formatQuantity(qty) {
  const n = Number(qty);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

/* -------------------------------------------------- */
/* ITEM TYPE DISPLAY                                  */
/* -------------------------------------------------- */

export function formatItemType(type) {
  const types = {
    "weapon": "Weapon",
    "armor": "Armor",
    "equipment": "Equipment",
    "tech": "Tech",
    "tool": "Tool",
    "droid": "Droid",
    "vehicle": "Vehicle",
    "service": "Service"
  };

  return types[type] || type;
}

/* -------------------------------------------------- */
/* BUTTON STATES                                      */
/* -------------------------------------------------- */

export function disableButton($btn, disabled = true) {
  if (disabled) {
    $btn.prop("disabled", true).addClass("disabled");
  } else {
    $btn.prop("disabled", false).removeClass("disabled");
  }
}

/* -------------------------------------------------- */
/* TOOLTIP HELPERS                                    */
/* -------------------------------------------------- */

export function addTooltip($element, text) {
  $element.attr("title", text);
  $element.addClass("tooltip");
}

/* -------------------------------------------------- */
/* ICONS OBJECT (CONSTANTS)                           */
/* -------------------------------------------------- */

export const Icons = {
  credits: `<span class="credits-icon">₢</span>`,
  damage: `<i class="fas fa-bolt"></i>`,
  rarity: `<i class="fas fa-star"></i>`,
  cart: `<i class="fas fa-shopping-cart"></i>`,
  search: `<i class="fas fa-search"></i>`,
  filter: `<i class="fas fa-filter"></i>`,
  sort: `<i class="fas fa-sort"></i>`,
  info: `<i class="fas fa-info-circle"></i>`
};

/* -------------------------------------------------- */
/* NUMBER ANIMATION (Credit Tick-Down)                */
/* -------------------------------------------------- */

/**
 * Animate a number from start to end value.
 * Used for credits tick-down after purchase.
 *
 * @param {jQuery} $element - jQuery element to update
 * @param {number} start - Starting value
 * @param {number} end - Ending value
 * @param {number} duration - Animation duration in ms (default 800)
 */
export function animateNumber($element, start, end, duration = 800) {
  if (!$element || !$element.length) return;

  const range = start - end;
  if (range === 0) {
    $element.text(end.toLocaleString());
    return;
  }

  let startTime = null;

  function tick(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const current = Math.round(start - range * progress);

    try {
      $element.text(current.toLocaleString());
    } catch (err) {
      $element.text(current);
    }

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}
