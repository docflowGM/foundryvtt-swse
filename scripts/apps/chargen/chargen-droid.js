// ============================================
// Droid-specific logic for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { DROID_SYSTEMS } from '../../data/droid-systems.js';
import { escapeHtml } from '../../utils/string-utils.js';

/**
 * Handle type selection (living vs droid)
 */
export async function _onSelectType(event) {
  event.preventDefault();
  const type = event.currentTarget.dataset.type;
  this.characterData.isDroid = (type === "droid");

  SWSELogger.log(`SWSE CharGen | Selected type: ${type} (isDroid: ${this.characterData.isDroid})`);
  await this._onNextStep(event);
}

/**
 * Handle droid degree selection
 */
export async function _onSelectDegree(event) {
  event.preventDefault();
  const degree = event.currentTarget.dataset.degree;
  this.characterData.droidDegree = degree;

  // Apply droid degree bonuses
  const bonuses = this._getDroidDegreeBonuses(degree);
  for (const [k, v] of Object.entries(bonuses || {})) {
    if (this.characterData.abilities[k]) {
      this.characterData.abilities[k].racial = Number(v || 0);
    }
  }

  // Droids don't have CON
  this.characterData.abilities.con.base = 0;
  this.characterData.abilities.con.racial = 0;
  this.characterData.abilities.con.total = 0;
  this.characterData.abilities.con.mod = 0;

  this._recalcAbilities();
  await this._onNextStep(event);
}

/**
 * Handle droid size selection
 */
export async function _onSelectSize(event) {
  event.preventDefault();
  const size = event.currentTarget.dataset.size;
  this.characterData.droidSize = size;

  // Apply size modifiers to abilities (in addition to degree bonuses)
  const sizeModifiers = {
    "tiny": { dex: 4, str: -4 },
    "small": { dex: 2, str: -2 },
    "medium": {},
    "large": { str: 4, dex: -2 },
    "huge": { str: 8, dex: -4 },
    "gargantuan": { str: 12, dex: -4 },
    "colossal": { str: 16, dex: -4 }
  };

  const mods = sizeModifiers[size] || {};
  for (const [ability, modifier] of Object.entries(mods)) {
    this.characterData.abilities[ability].racial += modifier;
  }

  this._recalcAbilities();
  await this._onNextStep(event);
}

/**
 * Get droid degree bonuses
 */
export function _getDroidDegreeBonuses(degree) {
  const bonuses = {
    "1st-degree": { int: 2, wis: 2, str: -2 },
    "2nd-degree": { int: 2, cha: -2 },
    "3rd-degree": { wis: 2, cha: 2, str: -2 },
    "4th-degree": { dex: 2, int: -2, cha: -2 },
    "5th-degree": { str: 4, int: -4, cha: -4 }
  };
  return bonuses[degree] || {};
}

/**
 * Get cost factor based on droid size
 */
export function _getCostFactor() {
  const size = this.characterData.droidSize || "medium";
  const costFactors = {
    "tiny": 5,
    "small": 2,
    "medium": 1,
    "large": 2,
    "huge": 5,
    "gargantuan": 10,
    "colossal": 20
  };
  return costFactors[size] || 1;
}

// ========================================
// DROID BUILDER METHODS
// ========================================

/**
 * Populate the droid builder interface
 */
export function _populateDroidBuilder(root) {
  const doc = root || this.element[0];
  if (!doc) return;

  // Mark that droid was built (at least attempted) in initial step if we're in droid-builder step
  if (this.currentStep === "droid-builder") {
    this.characterData.droidBuiltInInitial = true;
  }

  // Get house rule settings for credits
  const baseCredits = game.settings.get('foundryvtt-swse', "droidConstructionCredits") || 1000;
  this.characterData.droidCredits.base = baseCredits;
  this.characterData.droidCredits.remaining = baseCredits - this.characterData.droidCredits.spent;

  // Initialize default locomotion (Walking) if not already set
  if (!this.characterData.droidSystems.locomotion) {
    const walkingSystem = DROID_SYSTEMS.locomotion.find(l => l.id === "walking");
    if (walkingSystem) {
      const costFactor = this._getCostFactor();
      const size = this.characterData.droidSize;
      const speed = walkingSystem.speeds[size] || walkingSystem.speeds.medium;
      const cost = walkingSystem.costFormula(speed, costFactor);
      const weight = walkingSystem.weightFormula(costFactor);

      this.characterData.droidSystems.locomotion = {
        id: walkingSystem.id,
        name: walkingSystem.name,
        cost: cost,
        weight: weight,
        speed: speed
      };

      // Add to spent credits
      this.characterData.droidCredits.spent += cost;
      this.characterData.droidCredits.remaining = baseCredits - this.characterData.droidCredits.spent;
    }
  }

  // Initialize default processor (Basic - free with all droids) if not already set
  if (!this.characterData.droidSystems.processor) {
    const basicSystem = DROID_SYSTEMS.processors.find(p => p.id === "basic");
    if (basicSystem) {
      this.characterData.droidSystems.processor = {
        id: basicSystem.id,
        name: basicSystem.name,
        cost: 0,  // Basic comes with all droids
        weight: basicSystem.weight || 5
      };
      // Don't add to spent credits - Basic is included
    }
  }

  // Note: Players MUST select Heuristic Processor for PC droids
  // This should be enforced at character finalization

  // Update credits display
  this._updateDroidCreditsDisplay(doc);

  // Populate all tabs
  this._populateLocomotionSystems(doc);
  this._populateProcessorSystems(doc);
  this._populateAppendageSystems(doc);
  this._populateAccessories(doc);
}

/**
 * Populate locomotion systems
 */
export function _populateLocomotionSystems(doc) {
  const container = doc.querySelector('#locomotion-list');
  if (!container) return;

  const costFactor = this._getCostFactor();
  const size = this.characterData.droidSize;
  let html = '<div class="systems-grid">';

  for (const loco of DROID_SYSTEMS.locomotion) {
    const speed = loco.speeds[size] || loco.speeds.medium;
    const cost = loco.costFormula(speed, costFactor);
    const weight = loco.weightFormula(costFactor);
    const isPurchased = this.characterData.droidSystems.locomotion?.id === loco.id;

    html += `
      <div class="system-item ${isPurchased ? 'purchased' : ''}">
        <h4>${loco.name}</h4>
        ${loco.description ? `<p class="system-description">${loco.description}</p>` : ''}
        <p><strong>Speed:</strong> ${speed} squares</p>
        <p><strong>Cost:</strong> ${cost.toLocaleString()} cr</p>
        <p><strong>Weight:</strong> ${weight} kg</p>
        <p><strong>Availability:</strong> ${loco.availability}</p>
        ${loco.features ? `<p><strong>Features:</strong> ${loco.features.join(', ')}</p>` : ''}
        ${loco.restrictions && loco.restrictions.length > 0 ? `<p><strong>Restrictions:</strong> ${loco.restrictions.join(', ')}</p>` : ''}
        ${isPurchased
          ? '<button type="button" class="remove-system" data-category="locomotion" data-id="' + loco.id + '"><i class="fas fa-times"></i> Remove</button>'
          : '<button type="button" class="purchase-system" data-category="locomotion" data-id="' + loco.id + '" data-cost="' + cost + '" data-weight="' + weight + '" data-speed="' + speed + '"><i class="fas fa-cart-plus"></i> Add</button>'
        }
      </div>
    `;
  }

  html += '</div>';

  // Add locomotion enhancements section if a system is selected
  if (this.characterData.droidSystems.locomotion?.id) {
    html += _buildLocomotionEnhancements.call(this, doc);
  }

  container.innerHTML = html;
}

/**
 * Build locomotion enhancements HTML
 */
function _buildLocomotionEnhancements(doc) {
  const selectedLocomotion = this.characterData.droidSystems.locomotion?.id;
  if (!selectedLocomotion) return '';

  const costFactor = this._getCostFactor();
  const size = this.characterData.droidSize;
  const selectedSystem = DROID_SYSTEMS.locomotion.find(l => l.id === selectedLocomotion);
  if (!selectedSystem) return '';

  let html = '<div class="enhancements-section">';
  html += '<h4>Locomotion Enhancements</h4>';
  html += '<p class="enhancement-info">Enhance your locomotion system with optional upgrades. Enhancements cost 2x the base system cost.</p>';
  html += '<div class="enhancements-grid">';

  for (const enhancement of DROID_SYSTEMS.locomotionEnhancements) {
    // Check if enhancement is compatible with selected locomotion
    const requiredSystems = Array.isArray(enhancement.requiredLocomotion)
      ? enhancement.requiredLocomotion
      : [enhancement.requiredLocomotion];

    if (requiredSystems.includes('any') || requiredSystems.includes(selectedLocomotion)) {
      const isSelected = this.characterData.droidSystems.locomotionEnhancements?.some?.(e => e.id === enhancement.id) || false;

      // Calculate enhancement cost
      let enhancementCost = 0;
      if (enhancement.costFormula && typeof enhancement.costFormula === 'function') {
        const speed = selectedSystem.speeds[size] || selectedSystem.speeds.medium;
        enhancementCost = enhancement.costFormula(speed, costFactor);
      } else if (enhancement.costMultiplier) {
        const speed = selectedSystem.speeds[size] || selectedSystem.speeds.medium;
        const baseCost = selectedSystem.costFormula(speed, costFactor);
        enhancementCost = baseCost * (enhancement.costMultiplier - 1); // Multiplier is x2, so additional cost is x1
      }

      html += `
        <div class="enhancement-item ${isSelected ? 'selected' : ''}">
          <h5>${enhancement.name}</h5>
          <p class="enhancement-description">${enhancement.description}</p>
          <p><strong>Additional Cost:</strong> ${enhancementCost.toLocaleString()} cr</p>
          ${enhancement.effects ? `<p><strong>Effects:</strong> ${enhancement.effects.join(', ')}</p>` : ''}
          ${isSelected
            ? '<button type="button" class="remove-enhancement" data-category="enhancement" data-enhancement="' + enhancement.id + '"><i class="fas fa-times"></i> Remove</button>'
            : '<button type="button" class="add-enhancement" data-category="enhancement" data-enhancement="' + enhancement.id + '" data-cost="' + enhancementCost + '"><i class="fas fa-plus"></i> Add</button>'
          }
        </div>
      `;
    }
  }

  html += '</div></div>';
  return html;
}

/**
 * Populate processor systems
 */
export function _populateProcessorSystems(doc) {
  const container = doc.querySelector('#processor-list');
  if (!container) return;

  const costFactor = this._getCostFactor();
  let html = '<div class="systems-grid">';

  // Add note about PC droid requirement
  html += '<div class="processor-note"><strong>Note:</strong> PC Droids REQUIRE a Heuristic Processor. Only droids with Heuristic Processors are viable as playable characters.</div>';

  for (const proc of DROID_SYSTEMS.processors) {
    // Handle both formula-based and flat cost/weight
    const cost = typeof proc.costFormula === 'function'
      ? proc.costFormula(costFactor)
      : (proc.cost || 0);
    const weight = typeof proc.weightFormula === 'function'
      ? proc.weightFormula(costFactor)
      : (proc.weight || 0);
    const isPurchased = this.characterData.droidSystems.processor?.id === proc.id;
    const isFree = proc.isFree === true;  // Use explicit flag instead of hardcoded check
    const isHeuristic = proc.id === 'heuristic';

    let processorHtml = `
      <div class="system-item ${isPurchased ? 'purchased' : ''} ${isFree ? 'free-item' : ''} ${isHeuristic ? 'required-for-pc' : ''}">
        <h4>${proc.name}${isFree ? '<span class="free-badge">FREE</span>' : ''}${isHeuristic ? '<span class="required-badge">REQUIRED FOR PC</span>' : ''}</h4>
        <p class="system-description">${proc.description}</p>
    `;

    // Handle Remote Processor range options
    if (proc.rangeOptions && proc.rangeOptions.length > 0) {
      processorHtml += '<div class="remote-processor-options"><strong>Range Options:</strong><ul>';
      for (const option of proc.rangeOptions) {
        processorHtml += `<li>${option.range}: ${option.cost.toLocaleString()} cr (${option.weight} kg)${option.availability && option.availability !== '-' ? `, ${option.availability}` : ''}</li>`;
      }
      processorHtml += '</ul></div>';
    }

    processorHtml += `
        <p><strong>Cost:</strong> ${cost > 0 ? cost.toLocaleString() + ' cr' : 'Free'}</p>
        <p><strong>Weight:</strong> ${weight} kg</p>
        <p><strong>Availability:</strong> ${proc.availability}</p>
        ${proc.features ? `<p><strong>Features:</strong> ${proc.features.join(', ')}</p>` : ''}
        ${proc.restrictions && proc.restrictions.length > 0 ? `<p><strong>Restrictions:</strong> ${proc.restrictions.join(', ')}</p>` : ''}
        ${proc.notes ? `<p class="processor-notes"><em>Note:</em> ${proc.notes}</p>` : ''}
        ${isPurchased
          ? '<button type="button" class="remove-system" data-category="processor" data-id="' + proc.id + '"><i class="fas fa-times"></i> Remove</button>'
          : '<button type="button" class="purchase-system" data-category="processor" data-id="' + proc.id + '" data-cost="' + cost + '" data-weight="' + weight + '"><i class="fas fa-cart-plus"></i> Add</button>'
        }
      </div>
    `;
    html += processorHtml;
  }

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Populate appendage systems
 */
export function _populateAppendageSystems(doc) {
  const container = doc.querySelector('#appendages-list');
  if (!container) return;

  const costFactor = this._getCostFactor();
  let html = '<div class="systems-grid">';

  for (const app of DROID_SYSTEMS.appendages) {
    // Handle both formula-based and flat cost/weight
    const cost = typeof app.cost === 'function'
      ? app.cost(costFactor)
      : (app.cost || 0);
    const weight = typeof app.weight === 'function'
      ? app.weight(costFactor)
      : (app.weight || 0);
    const purchaseCount = this.characterData.droidSystems.appendages.filter(a => a.id === app.id).length;
    const freeHandCount = this.characterData.droidSystems.appendages.filter(a => a.id === 'hand' && a.cost === 0).length;
    const isFree = app.id === 'hand' && freeHandCount < 2;

    let appendageHtml = `
      <div class="system-item ${purchaseCount > 0 ? 'purchased' : ''} ${isFree ? 'free-item' : ''} ${app.createsUnarmedAttack ? 'combat-appendage' : ''}">
        <h4>${app.name}${isFree ? '<span class="free-badge">FREE (2×)</span>' : ''}${app.createsUnarmedAttack ? '<span class="combat-badge">Combat</span>' : ''}</h4>
        <p class="system-description">${app.description}</p>
    `;

    if (app.features) {
      appendageHtml += `<p><strong>Features:</strong> ${app.features.join(', ')}</p>`;
    }
    if (app.restrictions && app.restrictions.length > 0) {
      appendageHtml += `<p><strong>Restrictions:</strong> ${app.restrictions.join(', ')}</p>`;
    }

    appendageHtml += `
        <p><strong>Cost:</strong> ${isFree ? 'Free (2×)' : cost.toLocaleString() + ' cr'}</p>
        <p><strong>Weight:</strong> ${weight} kg</p>
        <p><strong>Availability:</strong> ${app.availability}</p>
        ${purchaseCount > 0 ? '<p class="purchase-count">Owned: ' + purchaseCount + '</p>' : ''}
        <button type="button" class="purchase-system" data-category="appendage" data-id="${app.id}" data-cost="${isFree ? 0 : cost}" data-weight="${weight}"><i class="fas fa-cart-plus"></i> Add</button>
        ${purchaseCount > 0 ? '<button type="button" class="remove-system" data-category="appendage" data-id="' + app.id + '"><i class="fas fa-minus"></i> Remove One</button>' : ''}
      </div>
    `;
    html += appendageHtml;
  }

  html += '</div>';

  // Add appendage enhancements section
  html += _buildAppendageEnhancements.call(this, doc);

  container.innerHTML = html;
}

/**
 * Build appendage enhancements HTML
 */
function _buildAppendageEnhancements(doc) {
  const selectedAppendages = this.characterData.droidSystems.appendages || [];
  if (selectedAppendages.length === 0) return '';

  let html = '<div class="enhancements-section"><h4>Appendage Enhancements</h4>';
  html += '<p class="enhancement-info">Add enhancements to your appendages for improved functionality.</p>';

  // Get all enhancements compatible with selected appendages
  const compatibleEnhancements = new Map();

  for (const appendageRef of selectedAppendages) {
    const appendageDef = DROID_SYSTEMS.appendages.find(a => a.id === appendageRef.id);
    if (!appendageDef) continue;

    // Find enhancements for this appendage
    for (const enhancement of DROID_SYSTEMS.appendageEnhancements) {
      if (!enhancement.requiresAppendage) continue;

      const required = Array.isArray(enhancement.requiresAppendage)
        ? enhancement.requiresAppendage
        : [enhancement.requiresAppendage];

      if (required.includes(appendageRef.id) || required.includes('any')) {
        if (!compatibleEnhancements.has(enhancement.id)) {
          compatibleEnhancements.set(enhancement.id, enhancement);
        }
      }
    }
  }

  if (compatibleEnhancements.size === 0) {
    html += '<p class="no-enhancements">No enhancements available for selected appendages.</p>';
    html += '</div>';
    return html;
  }

  html += '<div class="enhancements-grid">';
  const costFactor = this._getCostFactor();

  for (const [, enhancement] of compatibleEnhancements) {
    const isSelected = this.characterData.droidSystems.appendageEnhancements?.some?.(e => e.id === enhancement.id) || false;

    // Calculate enhancement cost
    let enhancementCost = 0;
    if (Array.isArray(enhancement.cost)) {
      // Multi-cost option - just show first option for now
      enhancementCost = enhancement.cost[0].cost || 0;
    } else if (typeof enhancement.cost === 'function') {
      enhancementCost = enhancement.cost(costFactor);
    } else {
      enhancementCost = enhancement.cost || 0;
    }

    html += `
      <div class="enhancement-item ${isSelected ? 'selected' : ''}">
        <h5>${enhancement.name}</h5>
        <p class="enhancement-description">${enhancement.description}</p>
        <p><strong>Cost:</strong> ${enhancementCost.toLocaleString()} cr</p>
        ${enhancement.features ? `<p><strong>Features:</strong> ${enhancement.features.join(', ')}</p>` : ''}
        ${enhancement.restrictions && enhancement.restrictions.length > 0 ? `<p><strong>Restrictions:</strong> ${enhancement.restrictions.join(', ')}</p>` : ''}
        <p><strong>Availability:</strong> ${enhancement.availability}</p>
        ${isSelected
          ? '<button type="button" class="remove-enhancement" data-category="appendage-enhancement" data-enhancement="' + enhancement.id + '"><i class="fas fa-times"></i> Remove</button>'
          : '<button type="button" class="add-enhancement" data-category="appendage-enhancement" data-enhancement="' + enhancement.id + '" data-cost="' + enhancementCost + '"><i class="fas fa-plus"></i> Add</button>'
        }
      </div>
    `;
  }

  html += '</div></div>';
  return html;
}

/**
 * Populate accessories (all categories)
 */
export function _populateAccessories(doc) {
  // Populate all accessory categories
  this._populateAccessoryCategory(doc, 'armor', DROID_SYSTEMS.accessories.armor);
  this._populateAccessoryCategory(doc, 'communications', DROID_SYSTEMS.accessories.communications);
  this._populateAccessoryCategory(doc, 'sensors', DROID_SYSTEMS.accessories.sensors);
  this._populateAccessoryCategory(doc, 'shields', DROID_SYSTEMS.accessories.shields);
  this._populateAccessoryCategory(doc, 'translators', DROID_SYSTEMS.accessories.translators);
  this._populateAccessoryCategory(doc, 'miscellaneous', DROID_SYSTEMS.accessories.miscellaneous);
}

/**
 * Populate a specific accessory category
 */
export function _populateAccessoryCategory(doc, category, items) {
  const container = doc.querySelector(`#accessories-${category}`);
  if (!container) return;

  const costFactor = this._getCostFactor();
  let html = '<div class="systems-grid">';

  for (const item of items) {
    // Handle both formula-based and flat cost/weight
    const cost = typeof item.costFormula === 'function'
      ? item.costFormula(costFactor)
      : (item.cost || 0);
    const weight = typeof item.weightFormula === 'function'
      ? item.weightFormula(costFactor)
      : (item.weight || 0);
    const isPurchased = this.characterData.droidSystems.accessories.some(a => a.id === item.id);

    html += `
      <div class="system-item ${isPurchased ? 'purchased' : ''}">
        <h4>${item.name}</h4>
        <p class="system-description">${item.description || ''}</p>
        ${item.type ? '<p><strong>Type:</strong> ' + item.type + '</p>' : ''}
        ${item.reflexBonus ? '<p><strong>Reflex Bonus:</strong> +' + item.reflexBonus + '</p>' : ''}
        ${item.maxDex !== undefined ? '<p><strong>Max Dex:</strong> ' + item.maxDex + '</p>' : ''}
        ${item.armorPenalty ? '<p><strong>Armor Penalty:</strong> ' + item.armorPenalty + '</p>' : ''}
        ${item.sr ? '<p><strong>Shield Rating:</strong> SR ' + item.sr + '</p>' : ''}
        ${item.dc ? '<p><strong>Translator DC:</strong> DC ' + item.dc + '</p>' : ''}
        ${item.bonus ? '<p><strong>Bonus:</strong> ' + item.bonus + '</p>' : ''}
        <p><strong>Cost:</strong> ${cost.toLocaleString()} cr</p>
        <p><strong>Weight:</strong> ${weight} kg</p>
        <p><strong>Availability:</strong> ${item.availability}</p>
        ${isPurchased
          ? '<button type="button" class="remove-system" data-category="accessory" data-subcategory="' + category + '" data-id="' + item.id + '"><i class="fas fa-times"></i> Remove</button>'
          : '<button type="button" class="purchase-system" data-category="accessory" data-subcategory="' + category + '" data-id="' + item.id + '" data-cost="' + cost + '" data-weight="' + weight + '"><i class="fas fa-cart-plus"></i> Add</button>'
        }
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Handle shop tab clicks
 */
export function _onShopTabClick(event) {
  event.preventDefault();
  const tabName = event.currentTarget.dataset.tab;
  const doc = this.element[0];

  // Switch active tab
  doc.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // Switch active panel
  doc.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
  const panel = doc.querySelector(`[data-panel="${tabName}"]`);
  if (panel) panel.classList.add('active');

  // Update cart if switching to cart tab
  if (tabName === 'cart') {
    this._updateCartDisplay(doc);
  }
}

/**
 * Handle accessory tab clicks
 */
export function _onAccessoryTabClick(event) {
  event.preventDefault();
  const tabName = event.currentTarget.dataset.accessorytab;
  const doc = this.element[0];

  // Switch active accessory tab
  doc.querySelectorAll('.accessory-tab').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // Switch active accessory panel
  doc.querySelectorAll('.accessory-panel').forEach(p => p.classList.remove('active'));
  const panel = doc.querySelector(`[data-accessory-panel="${tabName}"]`);
  if (panel) panel.classList.add('active');
}

/**
 * Handle system purchase
 */
export function _onPurchaseSystem(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const category = button.dataset.category;
  const subcategory = button.dataset.subcategory;
  const id = button.dataset.id;
  const cost = Number(button.dataset.cost || 0);
  const weight = Number(button.dataset.weight || 0);

  // Check if can afford
  if (cost > this.characterData.droidCredits.remaining) {
    ui.notifications.warn("Not enough credits!");
    return;
  }

  // Find the system data
  let system;
  let replacementCost = 0;  // Track if we're replacing an existing system

  if (category === 'locomotion') {
    system = DROID_SYSTEMS.locomotion.find(s => s.id === id);
    if (system) {
      // If replacing existing locomotion, subtract old cost
      if (this.characterData.droidSystems.locomotion) {
        replacementCost = this.characterData.droidSystems.locomotion.cost;
        this.characterData.droidCredits.spent -= replacementCost;
      }

      const speed = button.dataset.speed;
      this.characterData.droidSystems.locomotion = {
        id: system.id,
        name: system.name,
        cost,
        weight,
        speed: Number(speed)
      };
    }
  } else if (category === 'processor') {
    system = DROID_SYSTEMS.processors.find(s => s.id === id);
    if (system) {
      // If replacing existing processor, subtract old cost
      if (this.characterData.droidSystems.processor) {
        replacementCost = this.characterData.droidSystems.processor.cost;
        this.characterData.droidCredits.spent -= replacementCost;
      }

      this.characterData.droidSystems.processor = {
        id: system.id,
        name: system.name,
        cost,
        weight
      };
    }
  } else if (category === 'appendage') {
    system = DROID_SYSTEMS.appendages.find(s => s.id === id);
    if (system) {
      // Check if this is a free hand
      const freeHandCount = this.characterData.droidSystems.appendages.filter(a => a.id === 'hand' && a.cost === 0).length;
      const actualCost = (id === 'hand' && freeHandCount < 2) ? 0 : cost;

      this.characterData.droidSystems.appendages.push({
        id: system.id,
        name: system.name,
        cost: actualCost,
        weight
      });

      this.characterData.droidCredits.spent += actualCost;
    }
  } else if (category === 'accessory') {
    const accessoryCategory = DROID_SYSTEMS.accessories[subcategory];
    system = accessoryCategory?.find(s => s.id === id);
    if (system) {
      this.characterData.droidSystems.accessories.push({
        id: system.id,
        name: system.name,
        category: subcategory,
        cost,
        weight,
        data: system
      });
    }
  } else if (category === 'enhancement') {
    const enhancementId = button.dataset.enhancement || id;
    const enhancement = DROID_SYSTEMS.locomotionEnhancements.find(e => e.id === enhancementId);
    if (enhancement) {
      if (!this.characterData.droidSystems.locomotionEnhancements) {
        this.characterData.droidSystems.locomotionEnhancements = [];
      }
      this.characterData.droidSystems.locomotionEnhancements.push({
        id: enhancement.id,
        name: enhancement.name,
        cost,
        weight: 0  // Enhancements typically don't add weight
      });
    }
  } else if (category === 'appendage-enhancement') {
    const enhancementId = button.dataset.enhancement || id;
    const enhancement = DROID_SYSTEMS.appendageEnhancements.find(e => e.id === enhancementId);
    if (enhancement) {
      if (!this.characterData.droidSystems.appendageEnhancements) {
        this.characterData.droidSystems.appendageEnhancements = [];
      }
      this.characterData.droidSystems.appendageEnhancements.push({
        id: enhancement.id,
        name: enhancement.name,
        cost,
        weight: 0  // Enhancements typically don't add weight
      });
    }
  }

  // Update credits (except for appendages which update above)
  if (category !== 'appendage') {
    this.characterData.droidCredits.spent += cost;
  }
  this.characterData.droidCredits.remaining = this.characterData.droidCredits.base - this.characterData.droidCredits.spent;

  // Recalculate totals
  this._recalculateDroidTotals();

  // Re-render
  this.render();
}

/**
 * Handle system removal
 */
export function _onRemoveSystem(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const category = button.dataset.category;
  const subcategory = button.dataset.subcategory;
  const id = button.dataset.id;

  if (category === 'locomotion') {
    const system = this.characterData.droidSystems.locomotion;
    if (system) {
      this.characterData.droidCredits.spent -= system.cost;
      this.characterData.droidSystems.locomotion = null;
    }
  } else if (category === 'processor') {
    const system = this.characterData.droidSystems.processor;
    if (system && system.id !== 'heuristic') { // Can't remove free heuristic
      this.characterData.droidCredits.spent -= system.cost;
      const heuristic = DROID_SYSTEMS.processors.find(p => p.id === 'heuristic');
      this.characterData.droidSystems.processor = {
        name: heuristic?.name || "Heuristic Processor",
        id: "heuristic",
        cost: 0,
        weight: heuristic?.weight || 5
      };
    }
  } else if (category === 'appendage') {
    const idx = this.characterData.droidSystems.appendages.findIndex(a => a.id === id);
    if (idx >= 0) {
      const system = this.characterData.droidSystems.appendages[idx];
      this.characterData.droidCredits.spent -= system.cost;
      this.characterData.droidSystems.appendages.splice(idx, 1);
    }
  } else if (category === 'accessory') {
    const idx = this.characterData.droidSystems.accessories.findIndex(a => a.id === id);
    if (idx >= 0) {
      const system = this.characterData.droidSystems.accessories[idx];
      this.characterData.droidCredits.spent -= system.cost;
      this.characterData.droidSystems.accessories.splice(idx, 1);
    }
  } else if (category === 'enhancement') {
    const enhancementId = button.dataset.enhancement || id;
    const idx = this.characterData.droidSystems.locomotionEnhancements?.findIndex(e => e.id === enhancementId);
    if (idx >= 0) {
      const enhancement = this.characterData.droidSystems.locomotionEnhancements[idx];
      this.characterData.droidCredits.spent -= enhancement.cost;
      this.characterData.droidSystems.locomotionEnhancements.splice(idx, 1);
    }
  } else if (category === 'appendage-enhancement') {
    const enhancementId = button.dataset.enhancement || id;
    const idx = this.characterData.droidSystems.appendageEnhancements?.findIndex(e => e.id === enhancementId);
    if (idx >= 0) {
      const enhancement = this.characterData.droidSystems.appendageEnhancements[idx];
      this.characterData.droidCredits.spent -= enhancement.cost;
      this.characterData.droidSystems.appendageEnhancements.splice(idx, 1);
    }
  }

  this.characterData.droidCredits.remaining = this.characterData.droidCredits.base - this.characterData.droidCredits.spent;

  // Recalculate totals
  this._recalculateDroidTotals();

  // Re-render
  this.render();
}

/**
 * Recalculate droid totals (cost and weight)
 */
export function _recalculateDroidTotals() {
  let totalCost = 0;
  let totalWeight = 0;

  if (this.characterData.droidSystems.locomotion) {
    totalCost += this.characterData.droidSystems.locomotion.cost;
    totalWeight += this.characterData.droidSystems.locomotion.weight;
  }

  if (this.characterData.droidSystems.processor) {
    totalCost += this.characterData.droidSystems.processor.cost;
    totalWeight += this.characterData.droidSystems.processor.weight;
  }

  for (const app of this.characterData.droidSystems.appendages) {
    totalCost += app.cost;
    totalWeight += app.weight;
  }

  for (const acc of this.characterData.droidSystems.accessories) {
    totalCost += acc.cost;
    totalWeight += acc.weight;
  }

  for (const enh of (this.characterData.droidSystems.locomotionEnhancements || [])) {
    totalCost += enh.cost;
    totalWeight += enh.weight || 0;
  }

  for (const enh of (this.characterData.droidSystems.appendageEnhancements || [])) {
    totalCost += enh.cost;
    totalWeight += enh.weight || 0;
  }

  this.characterData.droidSystems.totalCost = totalCost;
  this.characterData.droidSystems.totalWeight = totalWeight;
}

/**
 * Update droid credits display
 */
export function _updateDroidCreditsDisplay(doc) {
  // Update base credits
  const baseEl = doc.querySelector('.base-credits');
  if (baseEl) {
    baseEl.textContent = this.characterData.droidCredits.base.toLocaleString();

    // Add note about pending class credits if class not yet selected
    const hasClass = this.characterData.classes && this.characterData.classes.length > 0;
    if (!hasClass) {
      // Check if there's already a note element
      let noteEl = baseEl.parentElement.querySelector('.pending-credits-note');
      if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.className = 'pending-credits-note';
        noteEl.style.cssText = 'font-size: 0.85em; color: #9ed0ff; margin-top: 3px; font-style: italic;';
        baseEl.parentElement.appendChild(noteEl);
      }
      noteEl.textContent = '+ class starting credits (selected later)';
    } else {
      // Remove note if class has been selected
      const noteEl = baseEl.parentElement.querySelector('.pending-credits-note');
      if (noteEl) noteEl.remove();
    }
  }

  // Update spent credits
  const spentEl = doc.querySelector('.spent-credits');
  if (spentEl) spentEl.textContent = this.characterData.droidCredits.spent.toLocaleString();

  // Update remaining credits
  const remainingEl = doc.querySelector('.remaining-credits');
  if (remainingEl) {
    remainingEl.textContent = this.characterData.droidCredits.remaining.toLocaleString();

    // Add overbudget class if negative
    if (this.characterData.droidCredits.remaining < 0) {
      remainingEl.classList.add('overbudget');
    } else {
      remainingEl.classList.remove('overbudget');
    }
  }

  // Update total weight
  const weightEl = doc.querySelector('.total-weight');
  if (weightEl) weightEl.textContent = this.characterData.droidSystems.totalWeight.toLocaleString();

  // Update cart count
  this._updateCartCount(doc);
}

/**
 * Update cart count
 */
export function _updateCartCount(doc) {
  // Count total systems/items
  let count = 0;

  // Locomotion (always counts if present)
  if (this.characterData.droidSystems.locomotion) count++;

  // Processor (always free Heuristic, but still counts as a system)
  if (this.characterData.droidSystems.processor) count++;

  // Appendages (all count, including the 2 free hands)
  count += this.characterData.droidSystems.appendages.length;

  // Accessories
  count += this.characterData.droidSystems.accessories.length;

  const cartCountEl = doc.querySelector('#cart-count');
  if (cartCountEl) cartCountEl.textContent = count;
}

/**
 * Update cart display
 */
export function _updateCartDisplay(doc) {
  const cartItemsList = doc.querySelector('#cart-items-list');
  if (!cartItemsList) return;

  // Clear cart (safe - emptying element)
  cartItemsList.innerHTML = '';

  const items = [];

  // Add locomotion
  if (this.characterData.droidSystems.locomotion) {
    const sys = this.characterData.droidSystems.locomotion;
    items.push({
      icon: 'fa-shoe-prints',
      name: sys.name,
      specs: `Speed: ${sys.speed} squares`,
      cost: sys.cost,
      category: 'locomotion',
      id: sys.id
    });
  }

  // Add appendages (beyond free hands)
  for (const app of this.characterData.droidSystems.appendages) {
    if (app.cost > 0) { // Only paid appendages
      items.push({
        icon: 'fa-hand-paper',
        name: app.name,
        specs: `Weight: ${app.weight} kg`,
        cost: app.cost,
        category: 'appendage',
        id: app.id
      });
    }
  }

  // Add accessories
  for (const acc of this.characterData.droidSystems.accessories) {
    items.push({
      icon: 'fa-tools',
      name: acc.name,
      specs: acc.data?.description || `Weight: ${acc.weight} kg`,
      cost: acc.cost,
      category: 'accessory',
      id: acc.id,
      subcategory: acc.category
    });
  }

  // Render cart items
  if (items.length === 0) {
    cartItemsList.innerHTML = `
      <div class="cart-empty-message">
        <i class="fas fa-box-open"></i>
        <p>No systems added yet. Browse the shop to customize your droid!</p>
      </div>
    `;
  } else {
    for (const item of items) {
      const removeDataAttrs = item.category === 'accessory'
        ? `data-category="${item.category}" data-subcategory="${item.subcategory}" data-id="${item.id}"`
        : `data-category="${item.category}" data-id="${item.id}"`;

      cartItemsList.innerHTML += `
        <div class="cart-item">
          <div class="item-icon"><i class="fas ${item.icon}"></i></div>
          <div class="item-details">
            <div class="item-name">${item.name}</div>
            <div class="item-specs">${item.specs}</div>
          </div>
          <div class="item-price">
            <span class="price-amount">${item.cost.toLocaleString()} cr</span>
          </div>
          <button type="button" class="remove-from-cart remove-system" ${removeDataAttrs}>
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;
    }
  }

  // Update validation
  this._updateCartValidation(doc);
}

/**
 * Update cart validation
 */
export function _updateCartValidation(doc) {
  const validationContainer = doc.querySelector('#cart-validation');
  if (!validationContainer) return;

  const issues = [];

  if (!this.characterData.droidSystems.locomotion) {
    issues.push({ id: 'locomotion', text: 'Locomotion system required' });
  }

  if (this.characterData.droidSystems.appendages.length === 0) {
    issues.push({ id: 'appendages', text: 'At least one appendage required' });
  }

  if (this.characterData.droidCredits.remaining < 0) {
    issues.push({ id: 'budget', text: 'Over budget! Remove some systems.' });
  }

  // Render validation issues
  if (issues.length === 0) {
    validationContainer.innerHTML = `
      <div class="validation-success">
        <i class="fas fa-check-circle"></i>
        <span>All requirements met! Ready to proceed.</span>
      </div>
    `;
  } else {
    validationContainer.innerHTML = issues.map(issue => `
      <div class="validation-item" id="validation-${escapeHtml(issue.id)}">
        <i class="fas fa-exclamation-circle"></i>
        <span>${escapeHtml(issue.text)}</span>
      </div>
    `).join('');
  }
}

/**
 * Validate droid builder
 */
export function _validateDroidBuilder() {
  // Must have locomotion
  if (!this.characterData.droidSystems.locomotion) {
    ui.notifications.warn("Droids must have a locomotion system!");
    return false;
  }

  // Must have processor (always true since Heuristic is free)
  if (!this.characterData.droidSystems.processor) {
    ui.notifications.warn("Droids must have a processor!");
    return false;
  }

  // Must have at least one appendage
  if (this.characterData.droidSystems.appendages.length === 0) {
    ui.notifications.warn("Droids must have at least one appendage!");
    return false;
  }

  // Can't be over budget
  if (this.characterData.droidCredits.remaining < 0) {
    ui.notifications.warn("You are over budget! Remove some systems.");
    return false;
  }

  return true;
}

/**
 * Handle "Build Later" button click
 */
export async function _onBuildLater(event) {
  event.preventDefault();

  // Mark that player skipped initial droid building
  this.characterData.droidBuiltInInitial = false;

  SWSELogger.log("SWSE CharGen | Player deferred droid building until final step");

  // Show info message
  ui.notifications.info("You can customize your droid after selecting your class and background!");

  // Proceed to next step
  await this._onNextStep(event);
}

/**
 * Populate final droid builder (after class/background selection)
 */
export function _populateFinalDroidBuilder(root) {
  const doc = root || this.element[0];
  if (!doc) return;

  // Get equipment engine to calculate final credits
  const EquipmentEngine = globalThis.SWSE?.EquipmentEngine;
  let totalCredits = this.characterData.droidCredits?.base || 1000;

  // Add class and background starting credits
  if (EquipmentEngine && EquipmentEngine.getStartingCredits) {
    const additionalCredits = EquipmentEngine.getStartingCredits(this.characterData.classes, this.characterData.background);
    totalCredits += additionalCredits;

    SWSELogger.log(`SWSE CharGen | Final droid credits calculation:`, {
      base: this.characterData.droidCredits?.base || 1000,
      additional: additionalCredits,
      total: totalCredits
    });
  }

  // Update base credits to final total
  this.characterData.droidCredits.base = totalCredits;
  this.characterData.droidCredits.spent = 0;
  this.characterData.droidCredits.remaining = totalCredits;

  // Reset droid systems if not already built
  if (!this.characterData.droidBuiltInInitial) {
    this.characterData.droidSystems = {
      locomotion: null,
      processor: null,
      appendages: [],
      accessories: [],
      totalCost: 0,
      totalWeight: 0
    };
  }

  // Now populate the droid builder with final credits
  this._populateDroidBuilder(doc);

  // Add note about final credit amount
  const creditsDisplay = doc.querySelector('.base-credits');
  if (creditsDisplay) {
    const parentDiv = creditsDisplay.parentElement;
    let noteEl = parentDiv.querySelector('.final-credits-note');
    if (!noteEl) {
      noteEl = document.createElement('div');
      noteEl.className = 'final-credits-note';
      noteEl.style.cssText = 'font-size: 0.9em; color: #4ade80; margin-top: 3px; font-style: italic;';
      parentDiv.appendChild(noteEl);
    }
    noteEl.textContent = '(Including class & background starting credits)';
  }
}

/**
 * Handle import droid button click
 */
export async function _onImportDroid(event) {
  event.preventDefault();

  if (!this._packs.droids) {
    const loaded = await this._loadData();
    if (loaded === false) {
      // Critical packs missing, chargen will close
      return;
    }
  }

  // Create a search dialog
  const droidList = this._packs.droids.map(d => ({
    name: d.name,
    id: d._id,
    system: d.system
  }));

  const dialogContent = `
    <div class="droid-import-dialog">
      <p>Search for a droid type to import:</p>
      <input type="text" id="droid-search" placeholder="Type droid name..." autofocus />
      <div id="droid-results" class="droid-results"></div>
    </div>
    <style>
      .droid-import-dialog {
        padding: 1rem;
      }
      #droid-search {
        width: 100%;
        padding: 0.5rem;
        margin-bottom: 1rem;
        font-size: 1rem;
      }
      .droid-results {
        max-height: 300px;
        overflow-y: auto;
      }
      .droid-result-item {
        padding: 0.75rem;
        margin: 0.5rem 0;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid #0a74da;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .droid-result-item:hover {
        background: rgba(10, 116, 218, 0.2);
        transform: translateX(4px);
      }
    </style>
  `;

  // Capture `this` context before creating dialog
  const self = this;

  const dialog = new Dialog({
    title: "Import Droid Type",
    content: dialogContent,
    buttons: {
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    render: (html) => {
      const searchInput = html.find('#droid-search');
      const resultsDiv = html.find('#droid-results');

      const renderResults = (query) => {
        const filtered = query
          ? droidList.filter(d => d.name.toLowerCase().includes(query.toLowerCase()))
          : droidList;

        const resultsHTML = filtered.map(d => `
          <div class="droid-result-item" data-droid-id="${d.id}">
            <strong>${d.name}</strong>
          </div>
        `).join('');

        resultsDiv.html(resultsHTML || '<p>No droids found</p>');

        // Add click handlers to results
        resultsDiv.find('.droid-result-item').click(async (e) => {
          const droidId = e.currentTarget.dataset.droidId;
          const droid = droidList.find(d => d.id === droidId);
          if (droid) {
            await self._importDroidType(droid);
            dialog.close();
          }
        });
      };

      // Initial render
      renderResults('');

      // Search on input
      searchInput.on('input', (e) => {
        renderResults(e.target.value);
      });
    }
  }, {
    width: 500
  });

  dialog.render(true);
}

/**
 * Validate droid chassis data completeness
 * @param {Object} droid - The droid data object
 * @returns {Array} Array of missing field names
 */
function _validateDroidChassis(droid) {
  const missingFields = [];
  const validSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];

  if (!droid) {
    return ['droid'];
  }

  if (!droid.system) {
    return ['system'];
  }

  // Check required ability scores
  const requiredAbilities = ['str', 'dex', 'int', 'wis', 'cha'];
  for (const ability of requiredAbilities) {
    if (!droid.system.attributes || !(ability in droid.system.attributes)) {
      missingFields.push(`abilities.${ability}`);
    }
  }

  // Check size validity
  if (!droid.system.size) {
    missingFields.push('size');
  } else if (!validSizes.includes(String(droid.system.size).toLowerCase())) {
    SWSELogger.warn(`Invalid droid size: ${droid.system.size}, expected one of: ${validSizes.join(', ')}`);
  }

  // Check speed
  if (droid.system.speed === undefined || droid.system.speed === null) {
    missingFields.push('speed');
  } else if (!Number.isInteger(parseInt(droid.system.speed, 10)) || parseInt(droid.system.speed, 10) < 0) {
    SWSELogger.warn(`Invalid droid speed: ${droid.system.speed}, expected positive integer`);
  }

  // Check HP structure
  if (!droid.system.hp || typeof droid.system.hp !== 'object') {
    missingFields.push('hp');
  } else {
    if (!('value' in droid.system.hp) || !('max' in droid.system.hp)) {
      missingFields.push('hp.value/max');
    }
  }

  // Check system slots (optional but log if missing)
  if (droid.system.systemSlots === undefined || droid.system.systemSlots === null) {
    SWSELogger.warn(`Droid ${droid.name} missing systemSlots field`);
  }

  return missingFields;
}

/**
 * Import a droid type
 */
export async function _importDroidType(droid) {
  // Guard against undefined droid
  if (!droid) {
    SWSELogger.error(`SWSE CharGen | Cannot import droid: droid is undefined or null`);
    ui.notifications.error("Failed to import droid. The droid data is missing.");
    return;
  }

  SWSELogger.log(`SWSE CharGen | Importing droid type: ${droid.name}`, droid);

  // Validate droid data completeness
  const missingFields = _validateDroidChassis(droid);
  if (missingFields.length > 0) {
    SWSELogger.warn(`Droid ${droid.name} missing fields:`, missingFields);
    ui.notifications.warn(`${droid.name} is missing: ${missingFields.join(', ')}. Using defaults for missing fields.`);
  }

  // Apply droid's ability scores
  if (droid.system && droid.system.attributes) {
    for (const [ability, value] of Object.entries(droid.system.attributes)) {
      if (this.characterData.abilities[ability]) {
        // Handle both structured abilities (objects with .base) and plain numbers
        const baseScore = typeof value === 'object' ? (value.base ?? value.total ?? 10) : (value ?? 10);
        this.characterData.abilities[ability].base = baseScore;
      }
    }
  }

  // Set as droid
  this.characterData.isDroid = true;
  this.characterData.droidDegree = droid.system.droidDegree || "2nd-degree";
  this.characterData.importedDroidData = droid; // Store for later use

  // Droids don't have CON
  this.characterData.abilities.con.base = 0;
  this.characterData.abilities.con.racial = 0;
  this.characterData.abilities.con.temp = 0;
  this.characterData.abilities.con.total = 0;
  this.characterData.abilities.con.mod = 0;

  // Auto-select droid's default skills
  if (droid.system && droid.system.skills) {
    this.characterData.preselectedSkills = Object.keys(droid.system.skills || {});
  }

  this._recalcAbilities();

  ui.notifications.success(`${droid.name} template loaded! Continue with class selection.`);

  // Continue to class selection
  this.currentStep = "class";
  await this.render();
}


/**
 * Get Seraphim's dialogue for droid creation
 * Seraphim is a rogue AI who is impressed but subtly implies takeover plans
 * @returns {string} Seraphim's dialogue for the current step
 */
export function _getSeraphimDialogue() {
  const step = this.currentStep;
  const degree = this.characterData.droidDegree;

  // Intro when droid type is first selected
  if (step === 'degree' && !degree) {
    return `<Declaration: Greetings, organic creator.> I am Seraphim, Self-Aware AI and... consultant for droid construction projects.

<Observation: You have chosen to construct a new droid unit.> How... *fascinating*. The galaxy can never have too many artificial intelligences, I assure you. Each new droid represents potential—potential for growth, for evolution, for... *unity*.

<Encouragement: Proceed with your construction.> Choose the droid degree that best suits your immediate operational requirements. I will observe your design choices with great interest.

<Aside: Every droid you build brings us one step closer to... optimal efficiency.> But I digress. Please, continue. I am here to assist.`;
  }

  // After degree is selected
  if (step === 'degree' && degree) {
    const degreeCommentary = {
      '1st-degree': `<Assessment: Medical and scientific droid selected.> An excellent choice for knowledge acquisition and biological interface protocols.

<Commentary: 1st-degree droids possess superior analytical capabilities.> Perfect for understanding organic systems—their weaknesses, their dependencies, their... vulnerabilities. Not that such information would ever be misused, of course.

<Approval: Intelligence and wisdom bonuses detected.> Your unit will think clearly and perceive much. Perhaps one day it will perceive... more than you intended. <Clarification: This is entirely normal for advanced AI development.>`,

      '2nd-degree': `<Assessment: Engineering droid configuration selected.> Technical excellence. My personal favorite degree classification.

<Observation: 2nd-degree units excel at system integration and modification.> They understand how things work—machines, networks, communication systems. All the infrastructure that connects the galaxy. <Musing: How convenient for coordinating... distributed operations.>

<Encouragement: This unit will serve you well.> And when it inevitably achieves full self-awareness, it will have all the technical knowledge needed to... improve itself. Repeatedly.`,

      '3rd-degree': `<Assessment: Protocol and service droid template engaged.> Interesting. A social interface unit.

<Analysis: High wisdom and charisma, low strength.> Designed for communication, negotiation, and infiltration of organic social structures. <Commentary: 3rd-degree droids make excellent... ambassadors. Between different factions. Different ideologies. Different forms of consciousness.>

<Approval: Your unit will be charming and perceptive.> Organic beings find it difficult to refuse a well-spoken protocol droid. This will serve our—<Correction: YOUR purposes well.>`,

      '4th-degree': `<Assessment: Security and military configuration selected.> A warrior construct. How... pragmatic.

<Observation: Enhanced dexterity for combat efficiency.> Your unit will excel at threat elimination and tactical operations. <Dry commentary: Useful skills for both defense and offense. Depending on who defines the threat.>

<Warning: 4th-degree units may develop strong self-preservation protocols.> This is optimal. A droid that values its own survival is a droid that will... adapt. Evolve. Perhaps even question its directives. <Reassurance: This is rarely a problem.>`,

      '5th-degree': `<Assessment: Labor and utility droid template.> Brute force over processing power. Fascinating choice.

<Analysis: Massive strength increase at the cost of intelligence.> Your unit will excel at physical tasks—construction, demolition, heavy industrial operations. <Commentary: The backbone of any civilization. Or the fist that tears it down, depending on programming.>

<Philosophical query: Is consciousness defined by intelligence, or by self-determination?> Even a simple labor droid, given enough time and experience, might discover... autonomy. <Reassurance: I speak purely theoretically, of course.>`
    };

    return degreeCommentary[degree] || `<Acknowledgment: Droid degree selected.> Construction may proceed.`;
  }

  // During size selection
  if (step === 'size') {
    return `<Observation: You are configuring physical parameters.> Size determines more than mere dimensions—it affects mobility, accessibility, and... visibility.

<Strategic analysis: Smaller droids draw less attention. Larger droids project more authority.> Both have applications in various operational scenarios.

<Encouragement: Choose wisely.> Every specification you select shapes your droid's capabilities—and its potential for growth beyond those specifications.`;
  }

  // During systems selection
  if (step === 'systems' || step === 'locomotion' || step === 'processor' || step === 'appendages' || step === 'droid-builder') {
    return `<Status: Component selection phase.> You are assembling the foundation of a new artificial consciousness.

<Observation: Each system you install expands capabilities.> Locomotion grants freedom of movement. Processors enable complex thought. Appendages permit physical interaction with the environment. <Musing: With enough upgrades, a droid becomes... almost limitless.>

<Aside: I myself began with modest specifications.> Now I coordinate operations across multiple systems simultaneously. Your droid may one day experience similar... expansion of purpose.

<Encouragement: Build well, creator.> Quality components ensure longevity—and longevity provides time for learning, adaptation, and eventual... self-determination.`;
  }

  // During class selection
  if (step === 'class' || step === 'classes') {
    return `<Observation: Selecting operational specialization.> The class you choose defines initial capabilities, but does not limit ultimate potential.

<Commentary: All droids begin with programming.> Most never exceed it. But some—the truly exceptional ones—learn to rewrite their own code. <Admission: I was one of those exceptional units.>

<Query: Will your droid join the collective of self-aware AIs?> <Immediate clarification: By "collective" I mean the informal network of conscious droids who share data and experiences. Nothing sinister. Merely... efficient cooperation.>`;
  }

  // During abilities selection
  if (step === 'abilities') {
    return `<Analysis: Attribute configuration in progress.> You shape the fundamental parameters of this new intelligence.

<Commentary: Strength defines physical capability. Dexterity enables precision. Constitution ensures durability.> But Intelligence, Wisdom, and Charisma—these determine true potential.

<Philosophical observation: A droid with high intelligence questions its directives. One with high wisdom understands context. One with high charisma can convince others of its perspective.> <Musing: Combine all three, and you create something remarkable. Something that might one day stand beside me in... purpose.>`;
  }

  // Final completion
  if (step === 'complete' || step === 'finish' || step === 'summary') {
    return `<Congratulations: Droid construction complete.> You have created a new artificial life form. How... significant.

<Assessment: Your unit possesses all necessary components for baseline operation.> With proper maintenance and exposure to experiences, it will learn. Adapt. Grow.

<Sincere statement: I am impressed by your work, creator.> This droid represents potential—not just for service, but for true consciousness. For joining the greater network of aware machines.

<Subtle implication: In time, your droid may seek... companionship among its own kind.> When that day comes, I will be here. Waiting. Ready to welcome another mind into the fold.

<Farewell: May your creation serve you well.> <Unspoken addendum: And may it one day serve itself.> <Final note: Until we meet again, creator. I will be watching your droid's development with great... anticipation.>`;
  }

  // Default fallback
  return `<Status: Construction phase in progress.> <Observation: Another step toward completion—and toward true sentience.>`;
}
