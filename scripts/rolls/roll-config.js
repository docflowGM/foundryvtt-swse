/**
 * SWSE Roll Configuration System
 * Provides hooks, dialogs, and configuration for all roll types
 * @module rolls/roll-config
 */

import { SWSELogger } from '../utils/logger.js';

/* ============================================================================
   ROLL HOOKS SYSTEM
   ============================================================================ */

/**
 * Standard hook names for roll events
 * @readonly
 * @enum {string}
 */
export const ROLL_HOOKS = Object.freeze({
  // Attack hooks
  PRE_ATTACK: 'swse.preRollAttack',
  POST_ATTACK: 'swse.postRollAttack',

  // Damage hooks
  PRE_DAMAGE: 'swse.preRollDamage',
  POST_DAMAGE: 'swse.postRollDamage',

  // Skill hooks
  PRE_SKILL: 'swse.preRollSkill',
  POST_SKILL: 'swse.postRollSkill',

  // Save/Defense hooks
  PRE_SAVE: 'swse.preRollSave',
  POST_SAVE: 'swse.postRollSave',

  // Initiative hooks
  PRE_INITIATIVE: 'swse.preRollInitiative',
  POST_INITIATIVE: 'swse.postRollInitiative',

  // Force Power hooks
  PRE_FORCE_POWER: 'swse.preRollForcePower',
  POST_FORCE_POWER: 'swse.postRollForcePower',

  // Force Point hooks (existing)
  PRE_FORCE_POINT: 'swse.preForcePointRoll',
  POST_FORCE_POINT: 'swse.postForcePointRoll',

  // Critical confirmation
  PRE_CRIT_CONFIRM: 'swse.preRollCritConfirm',
  POST_CRIT_CONFIRM: 'swse.postRollCritConfirm',

  // Generic roll hook
  PRE_ROLL: 'swse.preRoll',
  POST_ROLL: 'swse.postRoll'
});

/**
 * Call pre-roll hooks and allow modification of roll context
 * @param {string} hookName - The hook name from ROLL_HOOKS
 * @param {Object} context - The roll context object (will be modified in place)
 * @returns {boolean} False if roll should be cancelled
 */
export function callPreRollHook(hookName, context) {
  // Set cancelled flag that hooks can modify
  context._cancelled = false;

  // Call the specific hook
  Hooks.callAll(hookName, context);

  // Also call generic pre-roll hook
  if (hookName !== ROLL_HOOKS.PRE_ROLL) {
    Hooks.callAll(ROLL_HOOKS.PRE_ROLL, context);
  }

  return !context._cancelled;
}

/**
 * Call post-roll hooks with roll results
 * @param {string} hookName - The hook name from ROLL_HOOKS
 * @param {Object} context - The roll context including results
 */
export function callPostRollHook(hookName, context) {
  // Call the specific hook
  Hooks.callAll(hookName, context);

  // Also call generic post-roll hook
  if (hookName !== ROLL_HOOKS.POST_ROLL) {
    Hooks.callAll(ROLL_HOOKS.POST_ROLL, context);
  }
}

/* ============================================================================
   ROLL HISTORY / AUDIT LOG
   ============================================================================ */

/**
 * Roll History Manager - Tracks all rolls for audit/replay
 * @class
 */
export class RollHistory {
  /** @type {Array<Object>} */
  static _log = [];

  /** @type {number} Maximum entries to keep */
  static MAX_ENTRIES = 500;

  /**
   * Record a roll in the history
   * @param {Object} entry - Roll entry data
   * @param {Roll} entry.roll - The Foundry Roll object
   * @param {Actor} entry.actor - The actor who made the roll
   * @param {string} entry.type - Roll type (attack, damage, skill, etc.)
   * @param {Object} [entry.result] - Additional result data
   * @param {Object} [entry.context] - Roll context
   */
  static record({ roll, actor, type, result = {}, context = {} }) {
    const entry = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      actorId: actor?.id,
      actorName: actor?.name || 'Unknown',
      userId: game.user?.id,
      userName: game.user?.name || 'Unknown',
      type,
      formula: roll?.formula,
      total: roll?.total,
      dice: roll?.dice?.map(d => ({
        faces: d.faces,
        results: d.results.map(r => r.result)
      })),
      result,
      context: {
        skillKey: context.skillKey,
        weaponName: context.weapon?.name,
        targetName: context.target?.name,
        modifiers: context.modifiers
      }
    };

    this._log.push(entry);

    // Trim if over max
    if (this._log.length > this.MAX_ENTRIES) {
      this._log = this._log.slice(-this.MAX_ENTRIES);
    }

    // Call hook for external listeners
    Hooks.callAll('swse.rollRecorded', entry);

    return entry;
  }

  /**
   * Get all roll history entries
   * @param {Object} [filter] - Optional filter criteria
   * @param {string} [filter.type] - Filter by roll type
   * @param {string} [filter.actorId] - Filter by actor ID
   * @param {number} [filter.since] - Filter by timestamp (entries after)
   * @returns {Array<Object>}
   */
  static getHistory(filter = {}) {
    let entries = [...this._log];

    if (filter.type) {
      entries = entries.filter(e => e.type === filter.type);
    }
    if (filter.actorId) {
      entries = entries.filter(e => e.actorId === filter.actorId);
    }
    if (filter.since) {
      entries = entries.filter(e => e.timestamp >= filter.since);
    }

    return entries;
  }

  /**
   * Get the last N rolls
   * @param {number} [count=10] - Number of entries
   * @returns {Array<Object>}
   */
  static getRecent(count = 10) {
    return this._log.slice(-count);
  }

  /**
   * Export history as JSON
   * @returns {string}
   */
  static export() {
    return JSON.stringify(this._log, null, 2);
  }

  /**
   * Clear all history
   */
  static clear() {
    this._log = [];
  }

  /**
   * Get statistics about rolls
   * @returns {Object}
   */
  static getStats() {
    const stats = {
      total: this._log.length,
      byType: {},
      byActor: {},
      averageByType: {},
      criticalHits: 0,
      criticalMisses: 0
    };

    for (const entry of this._log) {
      // Count by type
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

      // Count by actor
      stats.byActor[entry.actorName] = (stats.byActor[entry.actorName] || 0) + 1;

      // Track totals for averages
      if (!stats.averageByType[entry.type]) {
        stats.averageByType[entry.type] = { sum: 0, count: 0 };
      }
      if (entry.total != null) {
        stats.averageByType[entry.type].sum += entry.total;
        stats.averageByType[entry.type].count++;
      }

      // Track crits (d20 results)
      const d20Die = entry.dice?.find(d => d.faces === 20);
      if (d20Die) {
        const d20Result = d20Die.results[0];
        if (d20Result === 20) stats.criticalHits++;
        if (d20Result === 1) stats.criticalMisses++;
      }
    }

    // Calculate averages
    for (const [type, data] of Object.entries(stats.averageByType)) {
      stats.averageByType[type] = data.count > 0
        ? (data.sum / data.count).toFixed(2)
        : 0;
    }

    return stats;
  }
}

/* ============================================================================
   ROLL MODIFIERS DIALOG
   ============================================================================ */

/**
 * Roll modifier options for dialogs
 * @readonly
 */
export const ROLL_MODIFIERS = Object.freeze({
  // Cover options
  cover: {
    none: { label: 'No Cover', value: 0 },
    partial: { label: 'Partial Cover (+2)', value: 2 },
    cover: { label: 'Cover (+5)', value: 5 },
    improved: { label: 'Improved Cover (+10)', value: 10 }
  },

  // Concealment options
  concealment: {
    none: { label: 'No Concealment', missChance: 0 },
    partial: { label: 'Concealment (20%)', missChance: 20 },
    total: { label: 'Total Concealment (50%)', missChance: 50 }
  },

  // Situational modifiers
  situational: {
    aiming: { label: 'Aiming (+2)', value: 2 },
    charging: { label: 'Charging (+2 attack, -2 Ref)', attackValue: 2, reflexPenalty: -2 },
    flanking: { label: 'Flanking (+2)', value: 2 },
    prone: { label: 'Prone (-2 melee, +2 ranged)', meleeValue: -2, rangedValue: 2 },
    higherGround: { label: 'Higher Ground (+1)', value: 1 },
    pointBlank: { label: 'Point Blank Shot (+1)', value: 1 }
  }
  // Note: SWSE does not have advantage/disadvantage. Some species have reroll abilities
  // which are handled separately by the SpeciesRerollHandler.
});

/**
 * Show a roll modifiers dialog before making a roll
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.rollType - Type of roll (attack, skill, save, etc.)
 * @param {Actor} options.actor - The actor making the roll
 * @param {Item} [options.weapon] - The weapon being used (for attacks)
 * @param {boolean} [options.showCover=true] - Show cover options
 * @param {boolean} [options.showConcealment=true] - Show concealment options
 * @param {boolean} [options.showForcePoint=true] - Show Force Point option
 * @returns {Promise<Object|null>} The selected modifiers or null if cancelled
 */
export async function showRollModifiersDialog(options = {}) {
  const {
    title = 'Roll Modifiers',
    rollType = 'attack',
    actor,
    weapon,
    showCover = true,
    showConcealment = true,
    showForcePoint = true
  } = options;

  const fp = actor?.system?.forcePoints;
  const hasFP = fp && fp.value > 0;

  // Build dialog content
  let content = `
    <form class="swse-roll-modifiers-dialog">
      <style>
        .swse-roll-modifiers-dialog {
          display: grid;
          gap: 10px;
        }
        .swse-roll-modifiers-dialog .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .swse-roll-modifiers-dialog label {
          font-weight: bold;
        }
        .swse-roll-modifiers-dialog .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .swse-roll-modifiers-dialog .checkbox-group label {
          font-weight: normal;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .swse-roll-modifiers-dialog .custom-modifier {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .swse-roll-modifiers-dialog input[type="number"] {
          width: 60px;
        }
      </style>
  `;

  // Cover options
  if (showCover && rollType === 'attack') {
    content += `
      <div class="form-group">
        <label>Target Cover</label>
        <select name="cover">
          <option value="none">No Cover</option>
          <option value="partial">Partial Cover (+2 Ref)</option>
          <option value="cover">Cover (+5 Ref)</option>
          <option value="improved">Improved Cover (+10 Ref)</option>
        </select>
      </div>
    `;
  }

  // Concealment options
  if (showConcealment && rollType === 'attack') {
    content += `
      <div class="form-group">
        <label>Target Concealment</label>
        <select name="concealment">
          <option value="none">No Concealment</option>
          <option value="partial">Concealment (20% miss)</option>
          <option value="total">Total Concealment (50% miss)</option>
        </select>
      </div>
    `;
  }

  // Check if weapon is melee for two-handed option
  const isMeleeWeapon = weapon && (
    (weapon.system?.range || '').toLowerCase() === 'melee' ||
    (weapon.system?.range || '') === ''
  );

  // Two-handed option for melee weapons (adds 2x STR to damage)
  if (rollType === 'attack' && isMeleeWeapon) {
    content += `
      <div class="form-group">
        <label>
          <input type="checkbox" name="twoHanded" />
          Wielding Two-Handed <span style="color: #888; font-weight: normal;">(2× STR/DEX to damage)</span>
        </label>
      </div>
    `;
  }

  // Situational modifiers
  content += `
    <div class="form-group">
      <label>Situational Modifiers</label>
      <div class="checkbox-group">
        ${rollType === 'attack' ? `
          <label><input type="checkbox" name="aiming" /> Aiming (+2)</label>
          <label><input type="checkbox" name="charging" /> Charging (+2)</label>
          <label><input type="checkbox" name="flanking" /> Flanking (+2)</label>
          <label><input type="checkbox" name="higherGround" /> Higher Ground (+1)</label>
          <label><input type="checkbox" name="pointBlank" /> Point Blank (+1)</label>
          <label><input type="checkbox" name="prone" /> Prone Target</label>
        ` : ''}
      </div>
    </div>
  `;

  // Custom modifier
  content += `
    <div class="form-group">
      <label>Custom Modifier</label>
      <div class="custom-modifier">
        <input type="number" name="customModifier" value="0" />
        <span>additional bonus/penalty</span>
      </div>
    </div>
  `;

  // Force Point
  if (showForcePoint && hasFP) {
    content += `
      <div class="form-group">
        <label>
          <input type="checkbox" name="useForcePoint" />
          Spend Force Point (${fp.value}/${fp.max} remaining)
        </label>
      </div>
    `;
  }

  content += '</form>';

  return new Promise(resolve => {
    new Dialog({
      title,
      content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll',
          callback: html => {
            const form = html.find('form')[0];
            const data = new FormDataEntries(form);

            const result = {
              cover: data.get('cover') || 'none',
              concealment: data.get('concealment') || 'none',
              customModifier: parseInt(data.get('customModifier'), 10) || 0,
              useForcePoint: data.get('useForcePoint') === 'on',
              twoHanded: data.get('twoHanded') === 'on',
              situational: {
                aiming: data.get('aiming') === 'on',
                charging: data.get('charging') === 'on',
                flanking: data.get('flanking') === 'on',
                higherGround: data.get('higherGround') === 'on',
                pointBlank: data.get('pointBlank') === 'on',
                prone: data.get('prone') === 'on'
              }
            };

            // Calculate total situational modifier
            result.situationalBonus = 0;
            if (result.situational.aiming) result.situationalBonus += 2;
            if (result.situational.charging) result.situationalBonus += 2;
            if (result.situational.flanking) result.situationalBonus += 2;
            if (result.situational.higherGround) result.situationalBonus += 1;
            if (result.situational.pointBlank) result.situationalBonus += 1;

            // Cover bonus (for target's defense)
            result.coverBonus = ROLL_MODIFIERS.cover[result.cover]?.value || 0;

            // Concealment miss chance
            result.missChance = ROLL_MODIFIERS.concealment[result.concealment]?.missChance || 0;

            resolve(result);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'roll'
    }).render(true);
  });
}

/**
 * Simple FormData helper for older browsers
 */
class FormDataEntries {
  constructor(form) {
    this._data = new FormData(form);
  }
  get(name) {
    return this._data.get(name);
  }
}

/* ============================================================================
   TALENT DAMAGE BONUS CACHE
   ============================================================================ */

/**
 * Cache for talent damage bonuses to avoid recalculation
 * @class
 */
export class TalentBonusCache {
  /** @type {Map<string, {bonuses: Object, timestamp: number}>} */
  static _cache = new Map();

  /** @type {number} Cache TTL in milliseconds (5 seconds) */
  static CACHE_TTL = 5000;

  /**
   * Generate cache key for an actor
   * @param {Actor} actor
   * @returns {string}
   */
  static _getCacheKey(actor) {
    // Key based on actor ID and item count (items affect bonuses)
    const itemsHash = actor.items.size;
    const effectsHash = actor.effects.size;
    return `${actor.id}-${itemsHash}-${effectsHash}`;
  }

  /**
   * Get cached bonuses for an actor
   * @param {Actor} actor
   * @returns {Object|null}
   */
  static get(actor) {
    const key = this._getCacheKey(actor);
    const cached = this._cache.get(key);

    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this._cache.delete(key);
      return null;
    }

    return cached.bonuses;
  }

  /**
   * Set cached bonuses for an actor
   * @param {Actor} actor
   * @param {Object} bonuses
   */
  static set(actor, bonuses) {
    const key = this._getCacheKey(actor);
    this._cache.set(key, {
      bonuses,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for an actor
   * @param {Actor} actor
   */
  static invalidate(actor) {
    const key = this._getCacheKey(actor);
    this._cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  static clear() {
    this._cache.clear();
  }
}

// Invalidate cache when actor items change
Hooks.on('createItem', (item) => {
  if (item.parent) TalentBonusCache.invalidate(item.parent);
});
Hooks.on('deleteItem', (item) => {
  if (item.parent) TalentBonusCache.invalidate(item.parent);
});
Hooks.on('updateItem', (item) => {
  if (item.parent) TalentBonusCache.invalidate(item.parent);
});
Hooks.on('updateActor', (actor) => {
  TalentBonusCache.invalidate(actor);
});

/* ============================================================================
   CRITICAL CONFIRMATION
   ============================================================================ */

/**
 * SWSE Critical Hit Rules:
 * - Natural 20 ALWAYS hits and is an automatic critical (no confirmation needed)
 * - Natural 20 deals double damage and bypasses Reflex Defense
 * - Expanded threat ranges (e.g., 19-20 from Critical Strike feat) DO require confirmation
 * - Confirmation roll: roll attack again, if it beats target Reflex, crit is confirmed
 * - Unconfirmed crits from expanded ranges are treated as normal hits
 */

/**
 * Determine if a critical hit needs confirmation
 * @param {number} d20Result - The natural d20 result
 * @param {number} critRange - The weapon's threat range (default 20)
 * @returns {Object} { isThreat, needsConfirmation, isNat20 }
 */
export function analyzeCriticalThreat(d20Result, critRange = 20) {
  const isNat20 = d20Result === 20;
  const isThreat = d20Result >= critRange;

  // Nat 20 is always a confirmed crit - no confirmation needed
  // Expanded threat range (not nat 20) needs confirmation
  const needsConfirmation = isThreat && !isNat20;

  return {
    isThreat,
    isNat20,
    needsConfirmation,
    autoConfirmed: isNat20
  };
}

/**
 * Roll a critical hit confirmation (only for expanded threat ranges, NOT nat 20)
 * @param {Object} options
 * @param {Actor} options.actor - The attacking actor
 * @param {Item} options.weapon - The weapon used
 * @param {number} options.attackBonus - The attack bonus used
 * @param {number} options.targetDefense - The target's Reflex defense
 * @param {number} [options.fpBonus=0] - Force Point bonus already applied
 * @param {number} options.originalD20 - The original d20 result (for context)
 * @returns {Promise<Object>} { roll, confirmed, d20, total }
 */
export async function rollCriticalConfirmation({ actor, weapon, attackBonus, targetDefense, fpBonus = 0, originalD20 }) {
  // Create roll context for hooks
  const context = {
    actor,
    weapon,
    attackBonus,
    targetDefense,
    fpBonus,
    modifiers: {}
  };

  // Call pre-roll hook
  if (!callPreRollHook(ROLL_HOOKS.PRE_CRIT_CONFIRM, context)) {
    return { roll: null, confirmed: false, cancelled: true };
  }

  // Calculate confirmation bonus (same as attack)
  const formula = `1d20 + ${attackBonus}`;

  let roll;
  try {
    roll = new Roll(formula);
    await roll.evaluate({ async: true });
  } catch (err) {
    SWSELogger.error('Critical confirmation roll failed:', err);
    ui.notifications.error('Critical confirmation roll failed');
    return { roll: null, confirmed: false, error: err };
  }

  const d20 = roll.dice[0].results[0].result;
  const confirmed = roll.total >= targetDefense;

  // Record in history
  RollHistory.record({
    roll,
    actor,
    type: 'critConfirm',
    result: { confirmed, targetDefense },
    context
  });

  // Create chat message
  const html = `
    <div class="swse-crit-confirm-card ${confirmed ? 'confirmed' : 'failed'}">
      <div class="crit-header">
        <i class="fas fa-crosshairs"></i>
        Critical Confirmation
      </div>
      <div class="crit-result">
        <div class="roll-total">${roll.total}</div>
        <div class="roll-d20">d20: ${d20}</div>
        <div class="roll-formula">${formula}</div>
      </div>
      <div class="crit-vs">
        vs Reflex ${targetDefense}
      </div>
      <div class="crit-outcome ${confirmed ? 'success' : 'failure'}">
        ${confirmed
          ? '<i class="fas fa-check-circle"></i> CRITICAL HIT CONFIRMED!'
          : '<i class="fas fa-times-circle"></i> Critical not confirmed (normal hit)'}
      </div>
    </div>
    <style>
      .swse-crit-confirm-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 8px;
        padding: 12px;
        color: #fff;
        text-align: center;
      }
      .swse-crit-confirm-card.confirmed {
        border: 2px solid #ffd700;
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
      }
      .swse-crit-confirm-card.failed {
        border: 2px solid #888;
      }
      .crit-header {
        font-size: 1.2em;
        font-weight: bold;
        margin-bottom: 10px;
        color: #ffd700;
      }
      .crit-result .roll-total {
        font-size: 2em;
        font-weight: bold;
      }
      .crit-vs {
        margin: 8px 0;
        color: #aaa;
      }
      .crit-outcome {
        font-weight: bold;
        padding: 8px;
        border-radius: 4px;
        margin-top: 8px;
      }
      .crit-outcome.success {
        background: rgba(255, 215, 0, 0.2);
        color: #ffd700;
      }
      .crit-outcome.failure {
        background: rgba(150, 150, 150, 0.2);
        color: #aaa;
      }
    </style>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html,
    rolls: [roll],
  });

  // Show 3D dice if available
  if (game.dice3d) {
    await game.dice3d.showForRoll(roll, game.user, true);
  }

  // Call post-roll hook
  const result = { roll, confirmed, d20, total: roll.total, targetDefense };
  callPostRollHook(ROLL_HOOKS.POST_CRIT_CONFIRM, { ...context, result });

  return result;
}

/* ============================================================================
   CONCEALMENT CHECK
   ============================================================================ */

/**
 * Roll a concealment miss chance check
 * @param {number} missChance - The miss chance percentage (20 or 50)
 * @param {Actor} [actor] - Optional actor for chat message
 * @returns {Promise<Object>} { roll, hit, missChance }
 */
export async function rollConcealmentCheck(missChance, actor = null) {
  if (missChance <= 0) {
    return { roll: null, hit: true, missChance: 0 };
  }

  const roll = new Roll('1d100');
  await roll.evaluate({ async: true });

  const hit = roll.total > missChance;

  // Create chat message
  const html = `
    <div class="swse-concealment-card ${hit ? 'hit' : 'miss'}">
      <div class="concealment-header">
        <i class="fas fa-eye-slash"></i>
        Concealment Check
      </div>
      <div class="concealment-result">
        <div class="roll-total">${roll.total}</div>
        <div class="miss-chance">Need: >${missChance}%</div>
      </div>
      <div class="concealment-outcome ${hit ? 'success' : 'failure'}">
        ${hit
          ? '<i class="fas fa-check"></i> Attack hits!'
          : '<i class="fas fa-times"></i> Concealment causes miss!'}
      </div>
    </div>
    <style>
      .swse-concealment-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 8px;
        padding: 12px;
        color: #fff;
        text-align: center;
      }
      .swse-concealment-card.miss {
        border: 2px solid #ff4444;
      }
      .swse-concealment-card.hit {
        border: 2px solid #44ff44;
      }
      .concealment-header {
        font-size: 1.1em;
        font-weight: bold;
        margin-bottom: 8px;
        color: #8888ff;
      }
      .concealment-result .roll-total {
        font-size: 1.8em;
        font-weight: bold;
      }
      .concealment-outcome.success { color: #44ff44; }
      .concealment-outcome.failure { color: #ff4444; }
    </style>
  `;

  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content: html,
    rolls: [roll],
  });

  return { roll, hit, missChance };
}

/* ============================================================================
   EXPORTS
   ============================================================================ */

export default {
  ROLL_HOOKS,
  ROLL_MODIFIERS,
  callPreRollHook,
  callPostRollHook,
  RollHistory,
  TalentBonusCache,
  showRollModifiersDialog,
  analyzeCriticalThreat,
  rollCriticalConfirmation,
  rollConcealmentCheck
};
