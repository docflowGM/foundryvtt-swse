/**
 * SWSE Multi-Attack System
 *
 * Handles Full Attack actions including:
 * - Two-weapon fighting / Double weapons
 * - Double Attack feat
 * - Triple Attack feat
 * - Dual Weapon Mastery feats (I, II, III)
 *
 * @module combat/multi-attack
 */

import { swseLogger } from "../utils/logger.js";

/**
 * Weapon groups for Double/Triple Attack feats
 * @readonly
 */
export const WEAPON_GROUPS = Object.freeze({
  SIMPLE: 'simple',
  PISTOLS: 'pistols',
  RIFLES: 'rifles',
  LIGHTSABERS: 'lightsabers',
  HEAVY: 'heavy',
  ADVANCED_MELEE: 'advanced-melee',
  EXOTIC: 'exotic'
});

/**
 * Multi-attack feat types
 * @readonly
 */
export const MULTI_ATTACK_FEATS = Object.freeze({
  DOUBLE_ATTACK: 'double attack',
  TRIPLE_ATTACK: 'triple attack',
  DUAL_WEAPON_MASTERY_I: 'dual weapon mastery i',
  DUAL_WEAPON_MASTERY_II: 'dual weapon mastery ii',
  DUAL_WEAPON_MASTERY_III: 'dual weapon mastery iii'
});

/**
 * Determine the weapon group for a weapon
 * @param {Item} weapon - The weapon item
 * @returns {string|null} The weapon group or null
 */
export function getWeaponGroup(weapon) {
  if (!weapon) return null;

  const name = (weapon.name || '').toLowerCase();
  const proficiency = weapon.system?.proficiency?.toLowerCase() || '';
  const subcategory = weapon.system?.subcategory?.toLowerCase() || '';
  const range = (weapon.system?.range || '').toLowerCase();

  // Check proficiency field first (most reliable)
  if (proficiency) {
    if (proficiency.includes('simple')) return WEAPON_GROUPS.SIMPLE;
    if (proficiency.includes('pistol')) return WEAPON_GROUPS.PISTOLS;
    if (proficiency.includes('rifle')) return WEAPON_GROUPS.RIFLES;
    if (proficiency.includes('lightsaber')) return WEAPON_GROUPS.LIGHTSABERS;
    if (proficiency.includes('heavy')) return WEAPON_GROUPS.HEAVY;
    if (proficiency.includes('advanced') && proficiency.includes('melee')) return WEAPON_GROUPS.ADVANCED_MELEE;
    if (proficiency.includes('exotic')) return WEAPON_GROUPS.EXOTIC;
  }

  // Check subcategory
  if (subcategory) {
    if (subcategory.includes('simple')) return WEAPON_GROUPS.SIMPLE;
    if (subcategory.includes('exotic')) return WEAPON_GROUPS.EXOTIC;
  }

  // Fallback to name-based detection
  if (name.includes('lightsaber') || name.includes('lightfoil')) {
    return WEAPON_GROUPS.LIGHTSABERS;
  }
  if (name.includes('pistol') || name.includes('hold-out') || name.includes('blaster pistol')) {
    return WEAPON_GROUPS.PISTOLS;
  }
  if (name.includes('rifle') || name.includes('carbine') || name.includes('bowcaster')) {
    return WEAPON_GROUPS.RIFLES;
  }
  if (name.includes('cannon') || name.includes('launcher') || name.includes('repeating') ||
      name.includes('heavy blaster') || name.includes('e-web')) {
    return WEAPON_GROUPS.HEAVY;
  }
  if (name.includes('vibro') || name.includes('force pike') || name.includes('electrostaff')) {
    return WEAPON_GROUPS.ADVANCED_MELEE;
  }
  if (range === 'melee') {
    // Simple melee weapons
    if (name.includes('knife') || name.includes('club') || name.includes('staff') ||
        name.includes('spear') || name.includes('bayonet')) {
      return WEAPON_GROUPS.SIMPLE;
    }
    return WEAPON_GROUPS.ADVANCED_MELEE;
  }

  // Default ranged to pistols if short range
  const rangeMatch = range.match(/(\d+)/);
  if (rangeMatch) {
    const rangeNum = parseInt(rangeMatch[1]);
    if (rangeNum <= 20) return WEAPON_GROUPS.PISTOLS;
    if (rangeNum <= 60) return WEAPON_GROUPS.RIFLES;
    return WEAPON_GROUPS.HEAVY;
  }

  return null;
}

/**
 * Check if a weapon is a double weapon (two ends)
 * @param {Item} weapon - The weapon item
 * @returns {boolean}
 */
export function isDoubleWeapon(weapon) {
  if (!weapon) return false;

  const name = (weapon.name || '').toLowerCase();
  const properties = weapon.system?.properties || [];

  // Check properties array
  if (properties.some(p => p.toLowerCase().includes('double'))) {
    return true;
  }

  // Check system flag
  if (weapon.system?.isDoubleWeapon) {
    return true;
  }

  // Name-based detection for common double weapons
  const doubleWeaponNames = [
    'double-bladed lightsaber',
    'double bladed lightsaber',
    'quarterstaff',
    'electrostaff',
    'double vibroblade',
    'sith tremor sword'
  ];

  return doubleWeaponNames.some(dw => name.includes(dw));
}

/**
 * Parse a feat name to extract weapon group (e.g., "Double Attack (Rifles)" -> "rifles")
 * @param {string} featName - The feat name
 * @returns {string|null} The weapon group or null
 */
export function extractWeaponGroupFromFeat(featName) {
  if (!featName) return null;

  const lowerName = featName.toLowerCase();

  // Match pattern like "Double Attack (Rifles)" or "Double Attack - Lightsabers"
  const parenMatch = lowerName.match(/\(([^)]+)\)/);
  const dashMatch = lowerName.match(/[-–]\s*(\w+)/);

  let group = parenMatch?.[1]?.trim() || dashMatch?.[1]?.trim();
  if (!group) return null;

  // Normalize group name
  group = group.toLowerCase();
  if (group.includes('simple')) return WEAPON_GROUPS.SIMPLE;
  if (group.includes('pistol')) return WEAPON_GROUPS.PISTOLS;
  if (group.includes('rifle')) return WEAPON_GROUPS.RIFLES;
  if (group.includes('lightsaber')) return WEAPON_GROUPS.LIGHTSABERS;
  if (group.includes('heavy')) return WEAPON_GROUPS.HEAVY;
  if (group.includes('advanced') || group.includes('melee')) return WEAPON_GROUPS.ADVANCED_MELEE;
  if (group.includes('exotic')) return WEAPON_GROUPS.EXOTIC;

  return group;
}

/**
 * Get all Double Attack weapon groups an actor has
 * @param {Actor} actor - The actor
 * @returns {Set<string>} Set of weapon groups
 */
export function getDoubleAttackGroups(actor) {
  const groups = new Set();

  for (const item of actor.items) {
    if (item.type !== 'feat') continue;

    const name = item.name?.toLowerCase() || '';
    if (!name.includes('double attack')) continue;

    const group = extractWeaponGroupFromFeat(item.name);
    if (group) {
      groups.add(group);
    }
  }

  return groups;
}

/**
 * Get all Triple Attack weapon groups an actor has
 * @param {Actor} actor - The actor
 * @returns {Set<string>} Set of weapon groups
 */
export function getTripleAttackGroups(actor) {
  const groups = new Set();

  for (const item of actor.items) {
    if (item.type !== 'feat') continue;

    const name = item.name?.toLowerCase() || '';
    if (!name.includes('triple attack')) continue;

    const group = extractWeaponGroupFromFeat(item.name);
    if (group) {
      groups.add(group);
    }
  }

  return groups;
}

/**
 * Get the actor's Dual Weapon Mastery level (0, 1, 2, or 3)
 * @param {Actor} actor - The actor
 * @returns {number} DWM level (0 = none, 1 = DWM I, 2 = DWM II, 3 = DWM III)
 */
export function getDualWeaponMasteryLevel(actor) {
  let level = 0;

  for (const item of actor.items) {
    if (item.type !== 'feat') continue;

    const name = item.name?.toLowerCase() || '';

    if (name.includes('dual weapon mastery iii') || name.includes('dual weapon mastery 3')) {
      level = Math.max(level, 3);
    } else if (name.includes('dual weapon mastery ii') || name.includes('dual weapon mastery 2')) {
      level = Math.max(level, 2);
    } else if (name.includes('dual weapon mastery i') || name.includes('dual weapon mastery 1') ||
               name === 'dual weapon mastery') {
      level = Math.max(level, 1);
    }
  }

  return level;
}

/**
 * Calculate the dual weapon penalty based on DWM level
 * @param {number} dwmLevel - Dual Weapon Mastery level (0-3)
 * @returns {number} The penalty (negative number)
 */
export function getDualWeaponPenalty(dwmLevel) {
  switch (dwmLevel) {
    case 3: return 0;    // DWM III: no penalty
    case 2: return -2;   // DWM II: -2 penalty
    case 1: return -5;   // DWM I: -5 penalty
    default: return -10; // No DWM: -10 penalty
  }
}

/**
 * Check if actor has a specific weapon equipped for off-hand
 * @param {Actor} actor - The actor
 * @returns {Item|null} The off-hand weapon or null
 */
export function getOffhandWeapon(actor) {
  // Look for weapons marked as off-hand or secondary
  for (const item of actor.items) {
    if (item.type !== 'weapon') continue;
    if (!item.system?.equipped) continue;

    if (item.system?.isOffhand || item.system?.slot === 'offhand') {
      return item;
    }
  }

  return null;
}

/**
 * Get equipped weapons for full attack
 * @param {Actor} actor - The actor
 * @returns {Object} { primary: Item, offhand: Item|null, isDoubleWeapon: boolean }
 */
export function getEquippedWeapons(actor) {
  const equipped = {
    primary: null,
    offhand: null,
    isDoubleWeapon: false
  };

  const equippedWeapons = actor.items.filter(i =>
    i.type === 'weapon' && i.system?.equipped
  );

  if (equippedWeapons.length === 0) {
    return equipped;
  }

  // Find primary weapon (not marked as offhand)
  equipped.primary = equippedWeapons.find(w => !w.system?.isOffhand) || equippedWeapons[0];

  // Check if primary is a double weapon
  if (equipped.primary && isDoubleWeapon(equipped.primary)) {
    equipped.isDoubleWeapon = true;
    // Double weapon counts as both primary and offhand
    equipped.offhand = equipped.primary;
  } else {
    // Look for separate offhand weapon
    equipped.offhand = equippedWeapons.find(w =>
      w.system?.isOffhand || (w.id !== equipped.primary?.id && equippedWeapons.length > 1)
    );
  }

  return equipped;
}

/**
 * Calculate full attack configuration for an actor
 * @param {Actor} actor - The actor
 * @param {Item} primaryWeapon - The primary weapon being used
 * @param {Item} [offhandWeapon] - Optional offhand weapon
 * @returns {Object} Full attack configuration
 */
export function calculateFullAttackConfig(actor, primaryWeapon, offhandWeapon = null) {
  const config = {
    attacks: [],
    totalPenalty: 0,
    breakdown: [],
    isFullAttack: true,
    dwmLevel: 0,
    hasDoubleAttack: false,
    hasTripleAttack: false,
    usingDualWeapons: false,
    usingDoubleWeapon: false
  };

  if (!actor || !primaryWeapon) {
    return config;
  }

  const primaryGroup = getWeaponGroup(primaryWeapon);
  const doubleAttackGroups = getDoubleAttackGroups(actor);
  const tripleAttackGroups = getTripleAttackGroups(actor);
  const dwmLevel = getDualWeaponMasteryLevel(actor);

  config.dwmLevel = dwmLevel;

  // Check if using double weapon or two weapons
  const isDouble = isDoubleWeapon(primaryWeapon);
  const hasTwoWeapons = offhandWeapon && offhandWeapon.id !== primaryWeapon.id;
  const usingMultipleWeapons = isDouble || hasTwoWeapons || (offhandWeapon && isDouble);

  config.usingDoubleWeapon = isDouble;
  config.usingDualWeapons = usingMultipleWeapons;

  // Base attacks
  // Attack 1: Primary weapon
  config.attacks.push({
    weapon: primaryWeapon,
    label: isDouble ? `${primaryWeapon.name} (Primary End)` : primaryWeapon.name,
    attackNumber: 1,
    source: 'primary'
  });

  // If using two weapons or double weapon, add second attack
  if (usingMultipleWeapons) {
    const dualPenalty = getDualWeaponPenalty(dwmLevel);
    config.totalPenalty += dualPenalty;

    if (dualPenalty !== 0) {
      config.breakdown.push(`Dual Weapons: ${dualPenalty}`);
    } else {
      config.breakdown.push(`Dual Weapons: no penalty (DWM III)`);
    }

    config.attacks.push({
      weapon: offhandWeapon || primaryWeapon,
      label: isDouble
        ? `${primaryWeapon.name} (Secondary End)`
        : (offhandWeapon?.name || 'Off-hand'),
      attackNumber: 2,
      source: 'offhand'
    });
  }

  // Check for Double Attack with matching weapon group
  const hasDoubleAttack = primaryGroup && doubleAttackGroups.has(primaryGroup);
  config.hasDoubleAttack = hasDoubleAttack;

  if (hasDoubleAttack) {
    config.totalPenalty += -5;
    config.breakdown.push(`Double Attack: -5`);

    config.attacks.push({
      weapon: primaryWeapon,
      label: `${primaryWeapon.name} (Double Attack)`,
      attackNumber: config.attacks.length + 1,
      source: 'doubleAttack'
    });
  }

  // Check for Triple Attack with matching weapon group
  const hasTripleAttack = primaryGroup && tripleAttackGroups.has(primaryGroup) && hasDoubleAttack;
  config.hasTripleAttack = hasTripleAttack;

  if (hasTripleAttack) {
    config.totalPenalty += -5;
    config.breakdown.push(`Triple Attack: -5`);

    config.attacks.push({
      weapon: primaryWeapon,
      label: `${primaryWeapon.name} (Triple Attack)`,
      attackNumber: config.attacks.length + 1,
      source: 'tripleAttack'
    });
  }

  // Number attacks
  config.attacks.forEach((atk, idx) => {
    atk.attackNumber = idx + 1;
  });

  return config;
}

/**
 * Show dialog to configure full attack options
 * @param {Actor} actor - The actor
 * @param {Object} equippedWeapons - From getEquippedWeapons()
 * @returns {Promise<Object|null>} Configuration or null if cancelled
 */
export async function showFullAttackDialog(actor, equippedWeapons) {
  const { primary, offhand, isDoubleWeapon } = equippedWeapons;

  if (!primary) {
    ui.notifications.warn("No weapon equipped for Full Attack.");
    return null;
  }

  const config = calculateFullAttackConfig(actor, primary, offhand);

  // Build dialog content
  const attackList = config.attacks.map((atk, i) =>
    `<li>Attack ${i + 1}: ${atk.label}</li>`
  ).join('');

  const penaltyInfo = config.totalPenalty !== 0
    ? `<p class="penalty-warning"><strong>Total Penalty:</strong> ${config.totalPenalty} on all attacks</p>`
    : `<p class="no-penalty"><strong>No penalty</strong> on attacks</p>`;

  const breakdownHtml = config.breakdown.length > 0
    ? `<ul class="breakdown">${config.breakdown.map(b => `<li>${b}</li>`).join('')}</ul>`
    : '';

  const content = `
    <div class="swse-full-attack-dialog">
      <style>
        .swse-full-attack-dialog { padding: 10px; }
        .swse-full-attack-dialog h4 { margin: 5px 0; }
        .swse-full-attack-dialog ul { margin: 5px 0; padding-left: 20px; }
        .swse-full-attack-dialog .penalty-warning { color: #f44; font-weight: bold; }
        .swse-full-attack-dialog .no-penalty { color: #4f4; }
        .swse-full-attack-dialog .breakdown { font-size: 0.9em; color: #888; }
      </style>

      <h4>Full Attack Action</h4>
      <p>You will make <strong>${config.attacks.length} attack(s)</strong>:</p>
      <ul>${attackList}</ul>

      ${penaltyInfo}
      ${breakdownHtml}

      <hr>
      <p><em>Full Attack uses your entire turn (Full-Round Action).</em></p>
    </div>
  `;

  return new Promise(resolve => {
    new Dialog({
      title: "Full Attack",
      content,
      buttons: {
        attack: {
          icon: '<i class="fas fa-crosshairs"></i>',
          label: `Attack (${config.attacks.length}x)`,
          callback: () => resolve(config)
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "attack"
    }).render(true);
  });
}

/**
 * Generate chat card HTML for full attack results
 * @param {Actor} actor - The actor
 * @param {Array} results - Array of attack results
 * @param {Object} config - Full attack configuration
 * @returns {string} HTML content
 */
export function generateFullAttackCard(actor, results, config) {
  const attacksHtml = results.map((result, i) => {
    const atk = config.attacks[i];
    const isHit = result.isHit;
    const isCrit = result.critConfirmed;
    const outcomeClass = isCrit ? 'critical' : (isHit ? 'hit' : (isHit === false ? 'miss' : ''));

    return `
      <div class="full-attack-entry ${outcomeClass}">
        <div class="attack-header">
          <span class="attack-number">#${i + 1}</span>
          <span class="attack-label">${atk.label}</span>
        </div>
        <div class="attack-result">
          <span class="roll-total">${result.total}</span>
          <span class="roll-d20">(d20: ${result.d20}${result.isNat20 ? ' ★' : ''})</span>
          ${result.targetReflex ? `<span class="vs-defense">vs ${result.targetReflex}</span>` : ''}
        </div>
        <div class="attack-outcome">
          ${isCrit
            ? `<i class="fas fa-star"></i> CRITICAL! (×${result.critMultiplier})`
            : isHit
              ? '<i class="fas fa-check"></i> Hit'
              : isHit === false
                ? '<i class="fas fa-times"></i> Miss'
                : ''}
        </div>
      </div>
    `;
  }).join('');

  const summaryHtml = `
    <div class="full-attack-summary">
      <span class="total-attacks">${results.length} Attacks</span>
      <span class="hits">${results.filter(r => r.isHit).length} Hits</span>
      <span class="crits">${results.filter(r => r.critConfirmed).length} Crits</span>
      ${config.totalPenalty ? `<span class="penalty">${config.totalPenalty} penalty</span>` : ''}
    </div>
  `;

  return `
    <div class="swse-full-attack-card">
      <div class="card-header">
        <i class="fas fa-crosshairs"></i>
        <h3>Full Attack</h3>
      </div>

      ${summaryHtml}

      <div class="attacks-list">
        ${attacksHtml}
      </div>

      <div class="breakdown-info">
        ${config.breakdown.map(b => `<span>${b}</span>`).join(' | ')}
      </div>
    </div>

    <style>
      .swse-full-attack-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 8px;
        padding: 12px;
        color: #fff;
      }
      .swse-full-attack-card .card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        border-bottom: 1px solid #333;
        padding-bottom: 8px;
      }
      .swse-full-attack-card .card-header h3 {
        margin: 0;
        color: #ff8c00;
      }
      .swse-full-attack-card .full-attack-summary {
        display: flex;
        gap: 15px;
        margin-bottom: 10px;
        font-size: 0.9em;
      }
      .swse-full-attack-card .full-attack-summary .hits { color: #4f4; }
      .swse-full-attack-card .full-attack-summary .crits { color: #ffd700; }
      .swse-full-attack-card .full-attack-summary .penalty { color: #f44; }
      .swse-full-attack-card .full-attack-entry {
        background: rgba(0,0,0,0.3);
        border-radius: 4px;
        padding: 8px;
        margin: 5px 0;
        border-left: 3px solid #666;
      }
      .swse-full-attack-card .full-attack-entry.hit { border-left-color: #4f4; }
      .swse-full-attack-card .full-attack-entry.miss { border-left-color: #f44; }
      .swse-full-attack-card .full-attack-entry.critical { border-left-color: #ffd700; background: rgba(255, 215, 0, 0.1); }
      .swse-full-attack-card .attack-header {
        display: flex;
        gap: 10px;
        font-weight: bold;
      }
      .swse-full-attack-card .attack-number { color: #888; }
      .swse-full-attack-card .attack-result {
        display: flex;
        gap: 10px;
        margin: 5px 0;
      }
      .swse-full-attack-card .roll-total { font-size: 1.3em; font-weight: bold; }
      .swse-full-attack-card .roll-d20 { color: #aaa; }
      .swse-full-attack-card .vs-defense { color: #888; }
      .swse-full-attack-card .attack-outcome { font-size: 0.9em; }
      .swse-full-attack-card .attack-outcome .fa-star { color: #ffd700; }
      .swse-full-attack-card .attack-outcome .fa-check { color: #4f4; }
      .swse-full-attack-card .attack-outcome .fa-times { color: #f44; }
      .swse-full-attack-card .breakdown-info {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #333;
        font-size: 0.8em;
        color: #888;
      }
    </style>
  `;
}

// Export all functions
export default {
  WEAPON_GROUPS,
  MULTI_ATTACK_FEATS,
  getWeaponGroup,
  isDoubleWeapon,
  extractWeaponGroupFromFeat,
  getDoubleAttackGroups,
  getTripleAttackGroups,
  getDualWeaponMasteryLevel,
  getDualWeaponPenalty,
  getOffhandWeapon,
  getEquippedWeapons,
  calculateFullAttackConfig,
  showFullAttackDialog,
  generateFullAttackCard
};
