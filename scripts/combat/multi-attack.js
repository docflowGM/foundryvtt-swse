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

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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
  if (!weapon) {return null;}

  const name = (weapon.name || '').toLowerCase();
  const proficiency = weapon.system?.proficiency?.toLowerCase() || '';
  const subcategory = weapon.system?.subcategory?.toLowerCase() || '';
  const range = (weapon.system?.range || '').toLowerCase();

  // Check proficiency field first (most reliable)
  if (proficiency) {
    if (proficiency.includes('simple')) {return WEAPON_GROUPS.SIMPLE;}
    if (proficiency.includes('pistol')) {return WEAPON_GROUPS.PISTOLS;}
    if (proficiency.includes('rifle')) {return WEAPON_GROUPS.RIFLES;}
    if (proficiency.includes('lightsaber')) {return WEAPON_GROUPS.LIGHTSABERS;}
    if (proficiency.includes('heavy')) {return WEAPON_GROUPS.HEAVY;}
    if (proficiency.includes('advanced') && proficiency.includes('melee')) {return WEAPON_GROUPS.ADVANCED_MELEE;}
    if (proficiency.includes('exotic')) {return WEAPON_GROUPS.EXOTIC;}
  }

  // Check subcategory
  if (subcategory) {
    if (subcategory.includes('simple')) {return WEAPON_GROUPS.SIMPLE;}
    if (subcategory.includes('exotic')) {return WEAPON_GROUPS.EXOTIC;}
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
    const rangeNum = parseInt(rangeMatch[1], 10);
    if (rangeNum <= 20) {return WEAPON_GROUPS.PISTOLS;}
    if (rangeNum <= 60) {return WEAPON_GROUPS.RIFLES;}
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
  if (!weapon) {return false;}

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
  if (!featName) {return null;}

  const lowerName = featName.toLowerCase();

  // Match pattern like "Double Attack (Rifles)" or "Double Attack - Lightsabers"
  const parenMatch = lowerName.match(/\(([^)]+)\)/);
  const dashMatch = lowerName.match(/[-–]\s*(\w+)/);

  let group = parenMatch?.[1]?.trim() || dashMatch?.[1]?.trim();
  if (!group) {return null;}

  // Normalize group name
  group = group.toLowerCase();
  if (group.includes('simple')) {return WEAPON_GROUPS.SIMPLE;}
  if (group.includes('pistol')) {return WEAPON_GROUPS.PISTOLS;}
  if (group.includes('rifle')) {return WEAPON_GROUPS.RIFLES;}
  if (group.includes('lightsaber')) {return WEAPON_GROUPS.LIGHTSABERS;}
  if (group.includes('heavy')) {return WEAPON_GROUPS.HEAVY;}
  if (group.includes('advanced') || group.includes('melee')) {return WEAPON_GROUPS.ADVANCED_MELEE;}
  if (group.includes('exotic')) {return WEAPON_GROUPS.EXOTIC;}

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
    if (item.type !== 'feat') {continue;}

    const name = item.name?.toLowerCase() || '';
    if (!name.includes('double attack')) {continue;}

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
    if (item.type !== 'feat') {continue;}

    const name = item.name?.toLowerCase() || '';
    if (!name.includes('triple attack')) {continue;}

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
    if (item.type !== 'feat') {continue;}

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
    if (item.type !== 'weapon') {continue;}
    if (!item.system?.equipped) {continue;}

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
 *
 * SWSE Full Attack Rules:
 * - Double Attack: 2 attacks with ONE weapon, each at -5 penalty
 * - Triple Attack: 3 attacks with ONE weapon, each at -10 penalty
 * - Two-Weapon Fighting: 2 attacks (one per weapon/end), each at -10 (reduced by DWM)
 * - Combining: Player chooses which weapon makes which extra attack
 * - Penalties are PER SOURCE, not cumulative across sources
 *
 * @param {Actor} actor - The actor
 * @param {Item} primaryWeapon - The primary weapon being used
 * @param {Item} [offhandWeapon] - Optional offhand weapon
 * @param {Object} [options] - Configuration options
 * @param {string} [options.doubleAttackWeapon='primary'] - Which weapon uses Double/Triple Attack
 * @returns {Object} Full attack configuration
 */
export function calculateFullAttackConfig(actor, primaryWeapon, offhandWeapon = null, options = {}) {
  const config = {
    attacks: [],
    breakdown: [],
    isFullAttack: true,
    dwmLevel: 0,
    hasDoubleAttack: false,
    hasTripleAttack: false,
    usingDualWeapons: false,
    usingDoubleWeapon: false,
    doubleAttackPenalty: 0,
    twoWeaponPenalty: 0
  };

  if (!actor || !primaryWeapon) {
    return config;
  }

  const primaryGroup = getWeaponGroup(primaryWeapon);
  const offhandGroup = offhandWeapon ? getWeaponGroup(offhandWeapon) : null;
  const doubleAttackGroups = getDoubleAttackGroups(actor);
  const tripleAttackGroups = getTripleAttackGroups(actor);
  const dwmLevel = getDualWeaponMasteryLevel(actor);

  config.dwmLevel = dwmLevel;

  // Check if using double weapon or two weapons
  const isDouble = isDoubleWeapon(primaryWeapon);
  const hasTwoWeapons = offhandWeapon && offhandWeapon.id !== primaryWeapon.id;
  const usingMultipleWeapons = isDouble || hasTwoWeapons;

  config.usingDoubleWeapon = isDouble;
  config.usingDualWeapons = usingMultipleWeapons;

  // Calculate two-weapon penalty (applies only to two-weapon attacks)
  const twoWeaponPenalty = usingMultipleWeapons ? getDualWeaponPenalty(dwmLevel) : 0;
  config.twoWeaponPenalty = twoWeaponPenalty;

  // Check for Double/Triple Attack with matching weapon group
  // Player can choose which weapon to use for Double/Triple Attack
  const doubleAttackWeapon = options.doubleAttackWeapon || 'primary';
  const selectedWeapon = doubleAttackWeapon === 'offhand' && offhandWeapon ? offhandWeapon : primaryWeapon;
  const selectedGroup = doubleAttackWeapon === 'offhand' && offhandGroup ? offhandGroup : primaryGroup;

  const hasDoubleAttack = selectedGroup && doubleAttackGroups.has(selectedGroup);
  const hasTripleAttack = selectedGroup && tripleAttackGroups.has(selectedGroup) && hasDoubleAttack;

  config.hasDoubleAttack = hasDoubleAttack;
  config.hasTripleAttack = hasTripleAttack;

  // Determine penalty for Double/Triple Attack
  // Double Attack = -5 on all attacks made with it
  // Triple Attack = -10 on all attacks made with it (includes Double Attack prerequisite)
  config.doubleAttackPenalty = hasTripleAttack ? -10 : (hasDoubleAttack ? -5 : 0);

  // Build attack list
  // Attack 1: Primary weapon (standard attack, no penalty unless using Double/Triple Attack)
  const primaryLabel = isDouble ? `${primaryWeapon.name} (Primary End)` : primaryWeapon.name;
  const primaryPenalty = (doubleAttackWeapon === 'primary' && hasDoubleAttack) ? config.doubleAttackPenalty : 0;

  config.attacks.push({
    weapon: primaryWeapon,
    label: primaryLabel,
    attackNumber: 1,
    source: 'primary',
    penalty: primaryPenalty,
    penaltySource: primaryPenalty !== 0 ? (hasTripleAttack ? 'Triple Attack' : 'Double Attack') : null
  });

  // If using Double/Triple Attack, add extra attacks with that weapon
  if (hasDoubleAttack) {
    // Double Attack gives 1 extra attack
    config.attacks.push({
      weapon: selectedWeapon,
      label: `${selectedWeapon.name} (Double Attack)`,
      attackNumber: 2,
      source: 'doubleAttack',
      penalty: config.doubleAttackPenalty,
      penaltySource: hasTripleAttack ? 'Triple Attack' : 'Double Attack'
    });

    if (hasTripleAttack) {
      // Triple Attack gives 1 more extra attack (total 3 with this weapon)
      config.attacks.push({
        weapon: selectedWeapon,
        label: `${selectedWeapon.name} (Triple Attack)`,
        attackNumber: 3,
        source: 'tripleAttack',
        penalty: config.doubleAttackPenalty,
        penaltySource: 'Triple Attack'
      });
    }

    config.breakdown.push(
      hasTripleAttack
        ? `Triple Attack: -10 on all ${selectedWeapon.name} attacks`
        : `Double Attack: -5 on all ${selectedWeapon.name} attacks`
    );
  }

  // If using two weapons or double weapon, add attack with other weapon/end
  if (usingMultipleWeapons) {
    const offhandLabel = isDouble
      ? `${primaryWeapon.name} (Secondary End)`
      : (offhandWeapon?.name || 'Off-hand');

    config.attacks.push({
      weapon: offhandWeapon || primaryWeapon,
      label: offhandLabel,
      attackNumber: config.attacks.length + 1,
      source: 'offhand',
      penalty: twoWeaponPenalty,
      penaltySource: twoWeaponPenalty !== 0
        ? `Two-Weapon${dwmLevel > 0 ? ` (DWM ${['I', 'II', 'III'][dwmLevel - 1]})` : ''}`
        : 'Two-Weapon (DWM III)'
    });

    if (twoWeaponPenalty !== 0) {
      config.breakdown.push(`Two-Weapon Fighting: ${twoWeaponPenalty} on off-hand attack`);
    } else {
      config.breakdown.push(`Two-Weapon Fighting: no penalty (DWM III)`);
    }

    // If the off-hand weapon has Double/Triple Attack AND player chose offhand
    if (doubleAttackWeapon === 'offhand' && hasDoubleAttack) {
      // Already handled above - the Double/Triple attacks are with the offhand weapon
    }
  }

  // Re-number attacks
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
  const { primary, offhand, isDoubleWeapon: isDouble } = equippedWeapons;

  if (!primary) {
    ui.notifications.warn('No weapon equipped for Full Attack.');
    return null;
  }

  // Check if player can choose which weapon uses Double/Triple Attack
  const primaryGroup = getWeaponGroup(primary);
  const offhandGroup = offhand ? getWeaponGroup(offhand) : null;
  const doubleAttackGroups = getDoubleAttackGroups(actor);

  const primaryHasDoubleAttack = primaryGroup && doubleAttackGroups.has(primaryGroup);
  const offhandHasDoubleAttack = offhandGroup && doubleAttackGroups.has(offhandGroup);
  const canChooseWeapon = primaryHasDoubleAttack && offhandHasDoubleAttack && offhand;

  // Default to primary weapon for Double/Triple Attack
  let selectedDoubleAttackWeapon = 'primary';

  // Calculate initial config
  let config = calculateFullAttackConfig(actor, primary, offhand, {
    doubleAttackWeapon: selectedDoubleAttackWeapon
  });

  // Build dialog content
  const buildAttackList = (cfg) => cfg.attacks.map((atk, i) => {
    const penaltyText = atk.penalty !== 0 ? ` <span class="penalty">(${atk.penalty})</span>` : '';
    const sourceText = atk.penaltySource ? ` <span class="source">[${atk.penaltySource}]</span>` : '';
    return `<li>Attack ${i + 1}: ${atk.label}${penaltyText}${sourceText}</li>`;
  }).join('');

  const weaponChoiceHtml = canChooseWeapon ? `
    <div class="form-group">
      <label>Use Double/Triple Attack with:</label>
      <select name="doubleAttackWeapon">
        <option value="primary">${primary.name}</option>
        <option value="offhand">${offhand.name}</option>
      </select>
    </div>
  ` : '';

  const breakdownHtml = config.breakdown.length > 0
    ? `<ul class="breakdown">${config.breakdown.map(b => `<li>${b}</li>`).join('')}</ul>`
    : '';

  const content = `
    <div class="swse-full-attack-dialog">
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
