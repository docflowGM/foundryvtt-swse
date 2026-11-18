/**
 * ForcePointsService - Authoritative Force Point rules engine
 *
 * UNIFIED ARCHITECTURE LOCK-IN:
 * - Die size authority: ModifierEngine (domain: "force.dieSize") plus explicit Force Point feat rule context
 * - Dice count authority: Heroic level scaling (1/2/3 dice)
 * - Max FP authority: Base (5/6/7) + floor(totalLevel / 2)
 * - Death rescue authority: DamageResolutionEngine
 * - Mutation authority: ActorEngine (sole)
 *
 * Stateless service responsible for:
 * - Force Point max calculation (prestige-aware)
 * - Heroic level scaling (dice count)
 * - Death rescue eligibility (with alreadyRescued guard)
 * - Spend validation
 *
 * Does NOT perform:
 * - Mutations (that's ActorEngine)
 * - Dice rolling (that's RollCore)
 * - Chat messages (that's renderers)
 */

import { getTotalLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { ForceRules } from "/systems/foundryvtt-swse/scripts/engine/force/ForceRules.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ForcePointFeatRules } from "/systems/foundryvtt-swse/scripts/engine/feats/force-point-feat-rules.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";

const DIE_STEPS = Object.freeze(['d4', 'd6', 'd8', 'd10', 'd12']);

export class ForcePointsService {

  /**
   * Upgrade a die size by a number of steps along the standard damage-die ladder.
   * Pure helper — shared by any caller that needs to apply a die-size upgrade
   * (e.g. Strong in the Force) to a Force Point bonus die.
   *
   * @param {string} dieSize - Starting die size, e.g. "d6"
   * @param {number} steps - Number of steps to upgrade (0 = no change)
   * @returns {string} Upgraded die size
   */
  static upgradeDieSize(dieSize = 'd6', steps = 0) {
    const normalized = String(dieSize || 'd6').trim().toLowerCase();
    const index = DIE_STEPS.indexOf(normalized);
    if (index < 0) return normalized;
    const offset = Math.max(0, Number(steps) || 0);
    return DIE_STEPS[Math.min(DIE_STEPS.length - 1, index + offset)];
  }

  /**
   * Calculate maximum Force Points for an actor
   * AUTHORITATIVE FORMULA: base + floor(totalLevel / 2)
   *
   * Base determination:
   * - Base 5: No prestige classes
   * - Base 6: Any prestige class (except Shaper)
   * - Base 7: Force Disciple, Jedi Master, or Sith Lord
   *
   * @param {Actor} actor - The actor to calculate for
   * @returns {number} Max Force Points
   */
  static getMax(actor) {
    if (!actor) return 0;

    // Get total character level (heroic + nonheroic)
    const totalLevel = getTotalLevel(actor);

    // No levels = no Force Points
    if (totalLevel === 0) {
      return 0;
    }

    // Determine Force Point base (5, 6, or 7)
    const base = this._getForcePointBase(actor);

    // Check for daily Force Points setting override
    const useDailyForcePoints = ForceRules.dailyForcePoints();

    const featBonus = Math.max(
      Number(MetaResourceFeatResolver.getForcePointMaxBonus(actor) ?? 0) || 0,
      Number(ForcePointFeatRules.getForcePointMaxBonus(actor) ?? 0) || 0
    );

    if (useDailyForcePoints) {
      // Daily FP mode: band-based (1-5: 1 FP, 6-10: 2 FP, 11-15: 3 FP, 16+: 4 FP)
      // Note: Uses total level even in daily mode
      if (totalLevel >= 16) return 4 + featBonus;
      if (totalLevel >= 11) return 3 + featBonus;
      if (totalLevel >= 6) return 2 + featBonus;
      return 1 + featBonus;
    } else {
      // Standard mode: base + floor(totalLevel / 2)
      return base + Math.floor(totalLevel / 2) + featBonus;
    }
  }

  /**
   * Determine Force Point base (5, 6, or 7)
   *
   * Rules:
   * - Base 5: Standard heroic characters
   * - Base 6: Characters with prestige classes (except Shaper)
   * - Base 7: Force Disciple, Jedi Master, or Sith Lord
   * - Once unlocked, never downgrades (persistent via flags)
   *
   * @private
   * @param {Actor} actor - The actor
   * @returns {number} Base (5, 6, or 7)
   */
  static _getForcePointBase(actor) {
    if (!actor) return 5;

    // Check persistent flags (once unlocked, never downgrades)
    const hasBase7 = actor.getFlag?.('swse', 'hasBase7FP');
    if (hasBase7) return 7;

    const hasBase6 = actor.getFlag?.('swse', 'hasPrestigeFPBonus');
    if (hasBase6) return 6;

    // Check current classes for prestige markers
    const classItems = actor.items?.filter?.(i => i.type === 'class') || [];
    if (!Array.isArray(classItems) || classItems.length === 0) return 5;

    let highestBase = 5;

    for (const classItem of classItems) {
      if (!classItem) continue;

      // Try ClassesDB first
      try {
        const ClassesDB = globalThis.SWSE?.ClassesDB;
        if (ClassesDB?.fromItem) {
          const classDef = ClassesDB.fromItem(classItem);
          if (classDef) {
            if (classDef.forcePointBase === 7) {
              highestBase = 7;
            } else if (!classDef.baseClass && classDef.grantsForcePoints !== false) {
              highestBase = Math.max(highestBase, 6);
            }
            continue;
          }
        }
      } catch (err) {
        // Fall through to item data check
      }

      // Fallback to item system data
      const isPrestige = classItem.system?.base_class === false;
      const grantsForcePoints = classItem.system?.grants_force_points !== false;
      const forcePointBase = classItem.system?.force_point_base;

      if (forcePointBase === 7) {
        highestBase = 7;
      } else if (isPrestige && grantsForcePoints) {
        highestBase = Math.max(highestBase, 6);
      }
    }

    return highestBase;
  }

  /**
   * Get remaining Force Points for an actor
   *
   * @param {Actor} actor - The actor
   * @returns {number} Current Force Points remaining
   */
  static getRemaining(actor) {
    return SchemaAdapters.getForcePoints(actor);
  }

  /**
   * Check if actor has Force Points available to spend
   *
   * @param {Actor} actor - The actor to check
   * @param {number} pointsToSpend - How many to spend (default 1)
   * @returns {boolean} Whether actor can spend
   */
  static canSpend(actor, pointsToSpend = 1, context = {}) {
    if (context?.useKind) return this.authorizeSpend(actor, { ...context, requestedCount: pointsToSpend }).valid;
    // Unclassified availability cannot treat restricted bonus points as cash.
    return Number.isInteger(pointsToSpend) && pointsToSpend > 0 && this.getRemaining(actor) >= pointsToSpend;
  }

  static _bonusEntries(actor) {
    const pool = actor?.getFlag?.('swse', 'bonusForcePoints') ?? actor?.flags?.swse?.bonusForcePoints ?? {};
    // Entries are the actual wallet. Do not fabricate a freely spendable entry
    // from a legacy aggregate or pool note.
    return Array.isArray(pool.entries) ? pool.entries.filter(entry =>
      entry && typeof entry.id === 'string' && entry.id.length > 0 &&
      Number.isInteger(Number(entry.value)) && Number(entry.value) > 0
    ) : [];
  }

  static _eligibleBonusEntries(actor, context = {}) {
    const now = Date.now();
    const combat = globalThis.game?.combat;
    return this._bonusEntries(actor).filter(entry => {
      // The current producers of restricted JATM and Guardian Spirit benefits
      // do not yet provide a certified, event-linked entitlement receipt.
      // Until they do, only explicitly unrestricted and unexpired entries
      // can pay a generic spend. In particular, no free-text matching.
      if (entry.restrictions || entry.restriction) return false;
      if (entry.encounterId && (!combat?.started || combat.id !== entry.encounterId)) return false;
      if (entry.round != null && Number(entry.round) !== Number(combat?.round)) return false;
      if (entry.expires) {
        if (typeof entry.expires !== 'number' || !Number.isFinite(entry.expires) || now >= entry.expires) return false;
      }
      return true;
    });
  }

  static getBonusRemaining(actor, context = {}) {
    return this._eligibleBonusEntries(actor, context).reduce((sum, entry) => sum + Number(entry.value), 0);
  }

  static getAvailableTotal(actor, context = {}) {
    return this.getRemaining(actor) + this.getBonusRemaining(actor, context);
  }

  /**
   * Pure RAW authorization. ActorEngine invokes this AGAIN under its actor
   * mutation gate; preflight decisions are never write permits.
   * Unsupported source-specific exceptions are refused until certified.
   */
  static authorizeSpend(actor, context = {}) {
    const reject = (message, allowance = 0) => ({
      valid: false, message, allowance, normalSpent: 0, bonusEntriesSpent: [],
      countsTowardRoundLimit: true, roundKey: null
    });
    if (!actor?.id) return reject('Actor identity required');
    const count = Number(context.requestedCount ?? context.amount ?? 1);
    if (!Number.isInteger(count) || count !== 1) return reject('A standard Force Point expenditure must be exactly one point');
    // A death-rescue reaction is evaluated against the lethal damage event,
    // not against an already-unconscious final condition-track snapshot.
    if (context.useKind !== 'avoid-death' && this._isSpendingPrevented(actor)) {
      return reject('Actor is unable to spend Force Points');
    }

    const useKind = context.useKind;
    const reactionKinds = new Set(['recover-one-force-power', 'recover-one-maneuver', 'avoid-death']);
    const timing = reactionKinds.has(useKind) ? 'reaction' : useKind === 'reduce-dark-side-score' ? 'swift' : 'free';

    if (useKind === 'roll-bonus') {
      const domain = String(context.rollDomain ?? context.domain ?? '');
      if (!/^(attack\.|skill\.|ability\.|force-power\.activation|force-regimen\.activation|initiative\b|pilot\.)/.test(domain)) {
        return reject('A roll-bonus spend requires a supported attack, skill, or ability check domain');
      }
      // The Core descriptor rule applies only to a UTF activation check.
      if (domain === 'force-power.activation') {
        const item = Array.from(actor.items ?? []).find(i => i.id === context.targetItemInstanceId);
        if (!item || item.type !== 'force-power') return reject('Owned Force Power activation identity required');
        const descriptors = [ ...(Array.isArray(item.system?.descriptors) ? item.system.descriptors : []),
          ...(Array.isArray(item.system?.tags) ? item.system.tags : []) ].map(x => String(x).toLowerCase());
        if (descriptors.includes('dark side')) return reject('Dark-side activation cannot use a Force Point bonus');
        if (descriptors.includes('light side') && DSPEngine.getValue(actor) > 0) {
          return reject('Light-side activation cannot use a Force Point bonus with Dark Side Score');
        }
      }
    } else if (useKind === 'recover-one-force-power' || useKind === 'recover-one-maneuver') {
      const item = Array.from(actor.items ?? []).find(i => i.id === context.targetItemInstanceId);
      const power = useKind === 'recover-one-force-power';
      if (!item || (power ? !['force-power', 'lightsaber-form-power'].includes(item.type) : item.type !== 'starship-maneuver') ||
          (item.system?.spent !== true && item.system?.discarded !== true)) {
        return reject('A specific owned spent suite instance is required for recovery');
      }
    } else if (useKind === 'avoid-death') {
      // Never accept a caller's verifiedDamageEvent boolean as proof.
      // The damage owner must persist an eligible, matching event receipt.
      // Until that consumer is cut over, death-rescue spending fails closed.
      const event = actor.getFlag?.('swse', 'forceDeathRescueEvent');
      if (!context.sourceEventId || event?.id !== context.sourceEventId ||
          event?.actorId !== actor.id || event?.state !== 'eligible') {
        return reject('Actor-owned lethal damage event receipt required');
      }
    } else if (useKind === 'reduce-dark-side-score') {
      const dsp = DSPEngine.getValue(actor);
      if (!(dsp > 0)) return reject('No Dark Side Score to reduce');
    } else {
      return reject('Unsupported or unclassified Force Point use');
    }

    const combat = globalThis.game?.combat;
    let roundKey = null;
    if (combat?.started) {
      if (!combat.id || !Number.isInteger(Number(combat.round)) || Number(combat.round) < 1) {
        return reject('Combat round identity unavailable');
      }
      roundKey = `${combat.id}:${combat.round}`;
      const activeId = combat.combatant?.actor?.id ?? combat.combatant?.actorId;
      if (timing !== 'reaction' && activeId !== actor.id) {
        // Force Readiness is an owned feat, but does not waive any other FP
        // restriction or round cap.
        const ownsReadiness = Array.from(actor.items ?? []).some(i => i.type === 'feat' &&
          i.system?.disabled !== true &&
          (i.system?.canonicalId === '8a78270d15aa4738' || i.system?.slug === 'force-readiness'));
        if (useKind !== 'roll-bonus' || timing !== 'free' || !ownsReadiness) {
          return reject('This Force Point use is not permitted off turn');
        }
      }
      const journal = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
      if ((journal.receipts ?? []).some(r => r.roundKey === roundKey &&
          r.countsTowardRoundLimit && r.state === 'committed')) {
        return reject('One counted Force Point has already been spent this round');
      }
    }

    const journal = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
    if (context.requestId && (journal.receipts ?? []).some(r => r.requestId === context.requestId)) {
      return reject('Force Point request identifier has already been used');
    }
    const bonusEntries = this._eligibleBonusEntries(actor, context);
    const chosen = bonusEntries.find(e => Number(e.value) >= 1);
    const normalSpent = chosen ? 0 : 1;
    const bonusEntriesSpent = chosen ? [{ id: chosen.id, source: chosen.source ?? '', amount: 1, entry: { ...chosen } }] : [];
    if (normalSpent > this.getRemaining(actor)) return reject('No eligible Force Point available', this.getAvailableTotal(actor, context));
    return {
      valid: true, message: 'Authorized Force Point expenditure', allowance: 1,
      normalSpent, bonusEntriesSpent, countsTowardRoundLimit: true, roundKey, useKind,
      actionTiming: timing
    };
  }

  /**
   * Get Force Point scaling dice configuration for an actor
   *
   * AUTHORITY: Heroic level scaling only
   * - Dice count: 1d (level 1-7), 2d (level 8-14), 3d (level 15+)
   * - Die size: From ModifierEngine plus contextual Force Point feat rules
   *
   * Usage: player rolls N dice, takes highest result
   *
   * @async
   * @param {Actor} actor - The actor
   * @param {Object} context - Force Point spend context, such as reason/weapon
   * @returns {Promise<Object>} { diceCount: number, dieSize: string }
   */
  static async getScalingDice(actor, context = {}) {
    if (!actor) return { diceCount: 1, dieSize: 'd6' };

    // Get heroic level for dice count scaling
    const heroicLevel = actor.system?.level?.heroic ?? 0;

    let diceCount = 1;
    if (heroicLevel >= 15) {
      diceCount = 3;
    } else if (heroicLevel >= 8) {
      diceCount = 2;
    }

    // Get die size from ModifierEngine and Force Point feat context.
    const dieSize = await this.getDieSize(actor, context);

    return { diceCount, dieSize };
  }

  /**
   * Get die size for Force Point rolls (d6, d8, d10, etc.)
   *
   * AUTHORITY: ModifierEngine (domain: "force.dieSize") plus feat-rule context
   * - Default is d6
   * - Strong in the Force raises qualifying FP dice to d8
   * - Gungan Weapon Master can raise Atlatl/Cesta attack FP dice by one step
   *
   * @async
   * @param {Actor} actor - The actor
   * @param {Object} context - Force Point spend context
   * @returns {Promise<string>} Die size like 'd6', 'd8', or 'd10'
   */
  static async getDieSize(actor, context = {}) {
    if (!actor) return 'd6';

    let dieSize = 6;
    try {
      // Query ModifierEngine for generic die size upgrades.
      const dieSizeModifier = await ModifierEngine.aggregateTarget(actor, 'force.dieSize', { context });
      if (Number(dieSizeModifier) >= 8) dieSize = Math.max(dieSize, Number(dieSizeModifier));
    } catch (err) {
      // Fall through to feat metadata.
    }

    const metaDieSize = Number(MetaResourceFeatResolver.getForcePointDieSize(actor, context) ?? 0) || 0;
    if (metaDieSize >= 8) dieSize = Math.max(dieSize, metaDieSize);

    const featDieSize = Number(ForcePointFeatRules.getForcePointDieSize(actor, context) ?? 0) || 0;
    if (featDieSize >= 8) dieSize = Math.max(dieSize, featDieSize);

    return `d${Math.max(6, dieSize)}`;
  }

  /**
   * Check if actor is eligible for death rescue via Force Point
   *
   * Death rescue eligibility requires:
   * - HP at or below 0
   * - Damage >= damage threshold
   * - Actor has Force Points remaining
   * - Not already rescued in this damage resolution
   *
   * @param {Actor} actor - The actor to check
   * @param {Object} damageContext - Context about the damage event
   * @param {number} damageContext.damage - Total damage taken
   * @param {number} damageContext.hp - Current HP after damage
   * @param {number} damageContext.threshold - Damage threshold for death
   * @param {boolean} damageContext.alreadyRescued - Whether already rescued this resolution (deprecated, use flag)
   * @returns {boolean} Whether rescue is available
   */
  static canRescue(actor, damageContext = {}) {
    if (!actor) return false;

    const { damage = 0, hp = SchemaAdapters.getHP(actor), threshold = 15 } = damageContext;

    // Check if already rescued this resolution (via flag)
    const alreadyRescuedFlag = actor.getFlag?.('foundryvtt-swse', 'alreadyRescuedThisResolution') || false;
    if (alreadyRescuedFlag) {
      return false;
    }

    // Must be at death threshold (HP <= 0 AND damage >= threshold)
    if (hp > 0 || damage < threshold) {
      return false;
    }

    // Must have Force Points
    if (!this.canSpend(actor, 1)) {
      return false;
    }

    return true;
  }

  /**
   * Validate Force Point spend attempt
   * Returns detailed validation result
   *
   * @param {Actor} actor - The actor attempting to spend
   * @param {Object} context - Spend context
   * @param {string} context.reason - Reason for spend (skill, attack, rescue, etc.)
   * @param {number} context.amount - Amount to spend (default 1)
   * @returns {Object} { valid: boolean, message: string, allowance: number }
   */
  static validateSpend(actor, context = {}) {
    return this.authorizeSpend(actor, context);
  }

  /**
   * Check if actor is prevented from spending Force Points
   * E.g., by stun, freeze, or other disabling condition
   *
   * @private
   * @param {Actor} actor - The actor to check
   * @returns {boolean} Whether spending is prevented
   */
  static _isSpendingPrevented(actor) {
    // Core p.149: steps 3 and 4 impose penalties; only step 5 is helpless.
    // This is the narrow helpless guard, not a substitute for action-timing
    // adjudication or effect-specific restrictions in authorizeSpend.
    const conditionCurrent = actor.system?.conditionTrack?.current ?? 0;
    if (conditionCurrent >= 5) {
      return true;
    }

    // Check active effects that prevent spending
    // (placeholder for future effect system integration)
    return false;
  }

  // --- Pure calculation helpers (no mutation, no logging) ---

  /** Calculate gain result without mutating. Returns { newValue, actualGain, currentFP, maxFP }. */
  static calcGain(actor, amount) {
    const currentFP = actor.system.forcePoints?.value || 0;
    const maxFP = actor.system.forcePoints?.max || 10;
    const newValue = Math.min(maxFP, currentFP + amount);
    return { newValue, actualGain: newValue - currentFP, currentFP, maxFP };
  }

  /** Calculate spend result without mutating. Returns { newValue, actualSpent, currentFP }. */
  static calcSpend(actor, amount) {
    const currentFP = actor.system.forcePoints?.value || 0;
    const newValue = Math.max(0, currentFP - amount);
    return { newValue, actualSpent: currentFP - newValue, currentFP };
  }

  /** Calculate destiny spend result without mutating. Returns { newValue, actualSpent, currentDP }. */
  static calcDestinySpend(actor, amount) {
    const currentDP = actor.system.destinyPoints?.value || 0;
    const newValue = Math.max(0, currentDP - amount);
    return { newValue, actualSpent: currentDP - newValue, currentDP };
  }

  /**
   * Get Force Point bonus formula for display/logging
   * E.g., "1d6", "2d6 (highest)", "3d8 (highest)"
   *
   * @async
   * @param {Actor} actor - The actor
   * @param {Object} context - Force Point spend context
   * @returns {Promise<string>} Display formula
   */
  static async getFormulaDisplay(actor, context = {}) {
    if (!actor) return '1d6';

    const { diceCount, dieSize } = await this.getScalingDice(actor, context);
    if (diceCount === 1) {
      return `1${dieSize}`;
    }
    return `${diceCount}${dieSize} (take highest)`;
  }

}
