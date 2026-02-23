import { swseLogger } from '../../utils/logger.js';
import { RollEngine } from '../../engine/roll-engine.js';
import { rollDamage } from './damage.js';
import { computeAttackBonus, computeDamageBonus, getCoverBonus, getConcealmentMissChance } from '../utils/combat-utils.js';
import { getEffectiveHalfLevel } from '../../actors/derived/level-split.js';
import { AmmoSystem } from '../../engines/inventory/ammo-system.js';
import {
  ROLL_HOOKS,
  callPreRollHook,
  callPostRollHook,
  RollHistory,
  TalentBonusCache,
  showRollModifiersDialog,
  analyzeCriticalThreat,
  rollCriticalConfirmation,
  rollConcealmentCheck
} from '../../rolls/roll-config.js';
import {
  getEquippedWeapons,
  calculateFullAttackConfig,
import { createChatMessage } from '../../core/document-api-v13.js';
  showFullAttackDialog,
  generateFullAttackCard
} from '../multi-attack.js';

/**
 * SWSERoll — Unified SWSE Rolling Engine for v13+
 *
 * Features:
 * - Modular FP middleware with pre-roll hooks
 * - Centralized attack math (Attack System C)
 * - Hybrid skill breakdown (Skill Mode 3)
 * - FP timing = BEFORE roll
 * - Full Condition Track penalties & Active Effect handling
 * - Clean, modern chat cards
 * - Roll history/audit logging
 * - Critical hit handling (nat 20 auto-crit, expanded ranges need confirmation)
 * - Cover/concealment integration
 * - Advantage/disadvantage support
 * - Pre/post roll hooks for all roll types
 * - Auto-compare attack vs target defense
 *
 * @class
 * @example
 * // Roll an attack
 * const result = await SWSERoll.rollAttack(actor, weapon);
 *
 * // Roll with dialog for modifiers
 * const result = await SWSERoll.rollAttack(actor, weapon, { showDialog: true });
 *
 * // Roll a skill check
 * const result = await SWSERoll.rollSkill(actor, 'acrobatics');
 *
 * // Roll bulk attacks against multiple targets
 * const results = await SWSERoll.rollBulkAttack(actor, weapon, targets);
 */
export class SWSERoll {

  /* ========================================================================== */
  /* UTILITY METHODS                                                            */
  /* ========================================================================== */

  /**
   * Get the currently selected actor from canvas
   * @returns {Actor|null} The selected actor or null
   */
  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  /**
   * Get the current target from user's targets
   * @returns {Actor|null} The target actor or null
   */
  static getTargetActor() {
    const target = game.user.targets.first();
    return target?.actor ?? null;
  }

  /**
   * Safely evaluate a roll with proper error handling
   * @param {string} formula - The roll formula
   * @param {Object} [data={}] - Data for formula substitution
   * @returns {Promise<Roll|null>} The evaluated roll or null on error
   * @private
   */
  static async _safeRoll(formula, data = {}) {
    try {
      const roll = await RollEngine.safeRoll(formula, data);
      if (!roll) {
        ui.notifications.error('Roll failed. Check console for details.');
      }
      return roll;
    } catch (err) {
      swseLogger.error('Roll failed:', formula, err);
      ui.notifications.error('Roll failed. Check console for details.');
      return null;
    }
  }

  /**
   * Resolve Force Point usage BEFORE the roll.
   * Uses Force Point Middleware (FP-O3).
   * @param {Actor} actor - The actor spending the Force Point
   * @param {string} [reason=""] - The reason for spending (for display)
   * @returns {Promise<number>} bonus from FP (0 if not spent)
   */
  static async promptForcePointUse(actor, reason = '') {
    const fp = actor.system.forcePoints;
    if (!fp || fp.value <= 0) {return 0;}

    const confirmed = await new Promise(resolve => {
      new SWSEDialogV2({
        title: 'Spend a Force Point?',
        content: `
          <p>Spend a Force Point to boost your ${reason}?</p>
          <p>FP: ${fp.value}/${fp.max}</p>
          <p>Die: <strong>${fp.die || '1d6'}</strong></p>
        `,
        buttons: {
          yes: { label: 'Use Force Point', callback: () => resolve(true) },
          no:  { label: 'No', callback: () => resolve(false) }
        },
        default: 'no'
      }).render(true);
    });

    if (!confirmed) {return 0;}

    // Build FP context (middleware pattern)
    const fpContext = {
      numDice: this._determineBaseFPDice(actor),
      die: actor.system.forcePoints?.die || 'd6',
      keep: 'highest', // RAW
      flatBonus: 0,
      multiplier: 1,
      reason
    };

    // Allow talents, feats, and AE middleware to modify FP roll
    Hooks.callAll(ROLL_HOOKS.PRE_FORCE_POINT, actor, fpContext);

    // Perform the roll
    const formula = `${fpContext.numDice}${fpContext.die}`;
    const roll = await this._safeRoll(formula);

    if (!roll) {return 0;}

    const diceResults = roll.dice[0].results.map(r => r.result);
    let result = 0;

    switch (fpContext.keep) {
      case 'lowest':
        result = Math.min(...diceResults);
        break;
      case 'sum':
        result = diceResults.reduce((a, b) => a + b, 0);
        break;
      case 'all':
        result = diceResults; // Developer mode
        break;
      case 'highest':
      default:
        result = Math.max(...diceResults);
        break;
    }

    result = result * fpContext.multiplier + fpContext.flatBonus;

    // Get force points with defensive checks
    const currentFP = actor.system.forcePoints?.value ?? 0;
    const maxFP = actor.system.forcePoints?.max ?? 0;
    const newFP = Math.max(0, currentFP - 1);

    // Spend FP with error handling (PHASE 3: Route through ActorEngine)
    try {
      const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');
      await ActorEngine.spendForcePoints(actor, 1);

      // Chat message (use calculated value instead of stale reference)
      await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="swse-forcepoint-roll">
            <h3>Force Point Used</h3>
            <p>Rolled: ${formula}</p>
            <p>Result Applied: <strong>+${result}</strong></p>
            <p>FP Remaining: ${newFP}/${maxFP}</p>
          </div>
        `
      });

      // Post-roll hook
      Hooks.callAll(ROLL_HOOKS.POST_FORCE_POINT, actor, { roll, result, reason });
    } catch (err) {
      console.error('Failed to spend Force Point:', err);
      ui.notifications.error('Failed to spend Force Point. Please try again.');
      return 0; // Return 0 since operation failed
    }

    return result;
  }

  /**
   * Determine base Force Point dice based on character level
   * @param {Actor} actor
   * @returns {number} Number of dice (1-3)
   * @private
   */
  static _determineBaseFPDice(actor) {
    const lvl = actor.system.level ?? 1;
    if (lvl >= 15) {return 3;}
    if (lvl >= 8) {return 2;}
    return 1;
  }

  /* ========================================================================== */
  /* ATTACK ROLLS                                                               */
  /* ========================================================================== */

  /**
   * Roll an attack with full SWSE mechanics
   *
   * Features:
   * - Pre/post roll hooks
   * - Force Point support
   * - Critical hit detection (nat 20 auto-crit, expanded ranges need confirmation)
   * - Cover/concealment integration
   * - Auto-compare vs target defense
   * - Roll history logging
   *
   * @param {Actor} actor - The attacking actor
   * @param {Item} weapon - The weapon being used
   * @param {Object} [options={}] - Attack options
   * @param {boolean} [options.showDialog=false] - Show roll modifiers dialog
   * @param {boolean} [options.skipFP=false] - Skip Force Point prompt
   * @param {Actor} [options.target] - Specific target actor
   * @param {string} [options.cover='none'] - Target's cover level
   * @param {string} [options.concealment='none'] - Target's concealment level
   * @param {number} [options.customModifier=0] - Additional modifier
   * @returns {Promise<Object|null>} Attack result object or null
   */
  static async rollAttack(actor, weapon, options = {}) {
    // Validate inputs
    if (!actor || !weapon) {
      ui.notifications.error('Attack failed: missing actor or weapon.');
      return null;
    }

    try {
      // Get modifiers from dialog if requested
      let modifiers = {
        cover: options.cover || 'none',
        concealment: options.concealment || 'none',
        customModifier: options.customModifier || 0,
        situationalBonus: 0,
        useForcePoint: false
      };

      if (options.showDialog) {
        const dialogResult = await showRollModifiersDialog({
          title: `${weapon.name} Attack`,
          rollType: 'attack',
          actor,
          weapon
        });

        if (!dialogResult) {return null;} // Cancelled
        modifiers = { ...modifiers, ...dialogResult };
      }

      // Create roll context for hooks
      const context = {
        actor,
        weapon,
        target: options.target || this.getTargetActor(),
        modifiers,
        attackBonus: 0,
        formula: '',
        fpBonus: 0
      };

      // Call pre-roll hook (can modify context or cancel roll)
      if (!callPreRollHook(ROLL_HOOKS.PRE_ATTACK, context)) {
        return { cancelled: true };
      }

      // Force Point before roll
      const fpBonus = (options.skipFP || !modifiers.useForcePoint)
        ? 0
        : await this.promptForcePointUse(actor, 'attack roll');
      context.fpBonus = fpBonus;

      // Calculate attack bonus
      const atkBonus = computeAttackBonus(actor, weapon);
      const totalBonus = atkBonus + fpBonus + modifiers.customModifier + modifiers.situationalBonus;
      context.attackBonus = totalBonus;

      // Build formula
      const formula = `1d20 + ${totalBonus}`;
      context.formula = formula;

      // Perform the roll
      const roll = await this._safeRoll(formula);
      if (!roll) {return null;}

      // Get the d20 result
      const d20 = roll.dice[0].results[0].result;

      // Get weapon crit properties
      const critRange = weapon.system?.critRange || 20;
      const critMultiplier = weapon.system?.critMultiplier || 2;

      // Analyze critical threat
      const critAnalysis = analyzeCriticalThreat(d20, critRange);

      // Check concealment
      let concealmentResult = { hit: true };
      const missChance = getConcealmentMissChance(modifiers.concealment);
      if (missChance > 0) {
        concealmentResult = await rollConcealmentCheck(missChance, actor);
      }

      // Get target defense for comparison
      const target = context.target;
      const coverBonus = getCoverBonus(modifiers.cover);
      const targetReflex = target
        ? (target.system?.defenses?.reflex?.total || 10) + coverBonus
        : null;

      // Determine hit/miss
      const isHit = targetReflex !== null
        ? roll.total >= targetReflex && concealmentResult.hit
        : null;

      // Handle critical confirmation for expanded threat ranges
      let critConfirmed = critAnalysis.autoConfirmed;
      let confirmationRoll = null;

      if (critAnalysis.needsConfirmation && isHit !== false && targetReflex !== null) {
        // Roll confirmation for expanded threat range (not nat 20)
        const confirmResult = await rollCriticalConfirmation({
          actor,
          weapon,
          attackBonus: totalBonus,
          targetDefense: targetReflex,
          fpBonus,
          originalD20: d20
        });
        confirmationRoll = confirmResult.roll;
        critConfirmed = confirmResult.confirmed;
      }

      // Build result object
      const result = {
        roll,
        d20,
        total: roll.total,
        attackBonus: totalBonus,
        fpBonus,
        isCritThreat: critAnalysis.isThreat,
        isNat20: critAnalysis.isNat20,
        critConfirmed,
        critMultiplier,
        confirmationRoll,
        targetReflex,
        isHit,
        concealmentMiss: !concealmentResult.hit,
        coverBonus,
        modifiers
      };

      // Record in roll history
      RollHistory.record({
        roll,
        actor,
        type: 'attack',
        result: { isHit, isCrit: critConfirmed, targetReflex },
        context
      });

      // Build chat card
      const bonusString = `${atkBonus >= 0 ? '+' : ''}${atkBonus}`;
      const hitMissHTML = targetReflex !== null ? `
        <div class="attack-vs-defense">
          <span class="vs-label">vs Reflex</span>
          <span class="target-defense">${targetReflex}</span>
          ${coverBonus > 0 ? `<span class="cover-note">(+${coverBonus} cover)</span>` : ''}
        </div>
        <div class="attack-outcome ${isHit ? (critConfirmed ? 'critical' : 'hit') : 'miss'}">
          ${concealmentResult.hit === false
            ? '<i class="fa-solid fa-eye-slash"></i> Miss (Concealment)'
            : isHit
              ? (critConfirmed
                ? `<i class="fa-solid fa-star"></i> CRITICAL HIT! (×${critMultiplier} damage)`
                : '<i class="fa-solid fa-check"></i> Hit!')
              : '<i class="fa-solid fa-times"></i> Miss'}
        </div>
      ` : '';

      const html = `
        <div class="swse-attack-card ${critAnalysis.isThreat ? 'crit-threat' : ''} ${isHit === false ? 'miss' : ''}">
          <div class="attack-header">
            <img src="${weapon.img}" height="40" />
            <h3>${weapon.name} — Attack</h3>
          </div>

          <div class="attack-result">
            <div class="roll-total">${roll.total}</div>
            <div class="roll-d20">d20: ${d20}${critAnalysis.isNat20 ? ' <i class="fa-solid fa-star" title="Natural 20!"></i>' : ''}</div>
            <div class="roll-formula">${formula}</div>
            <div class="roll-bonus">
              Attack Bonus: ${bonusString}
              ${fpBonus ? `, FP +${fpBonus}` : ''}
              ${modifiers.situationalBonus ? `, Sit. +${modifiers.situationalBonus}` : ''}
              ${modifiers.customModifier ? `, Custom ${modifiers.customModifier >= 0 ? '+' : ''}${modifiers.customModifier}` : ''}
            </div>
          </div>

          ${critAnalysis.isThreat ? `
            <div class="crit-banner ${critConfirmed ? 'confirmed' : 'unconfirmed'}">
              ${critConfirmed
                ? (critAnalysis.isNat20
                  ? `<i class="fa-solid fa-star"></i> NATURAL 20 — CRITICAL HIT! (×${critMultiplier})`
                  : `<i class="fa-solid fa-crosshairs"></i> CRITICAL CONFIRMED! (×${critMultiplier})`)
                : `<i class="fa-solid fa-crosshairs"></i> Critical Threat (unconfirmed)`}
            </div>
          ` : ''}

          ${hitMissHTML}

          <button class="swse-roll-damage" data-weapon-id="${weapon.id}" data-is-crit="${critConfirmed}" data-crit-mult="${critMultiplier}" data-two-handed="${modifiers.twoHanded || false}">
            <i class="fa-solid fa-burst"></i> Roll Damage${critConfirmed ? ` (×${critMultiplier})` : ''}
          </button>
        </div>
      `;

      const message = await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: html,
        rolls: [roll]
      });

      result.message = message;

      // Show 3D dice if available
      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }

      // Call post-roll hook
      callPostRollHook(ROLL_HOOKS.POST_ATTACK, { ...context, result });

      return result;

    } catch (err) {
      swseLogger.error('Attack roll failed:', err);
      ui.notifications.error('Attack roll failed. Check console for details.');
      return null;
    }
  }

  /**
   * Roll attacks against multiple targets (for autofire, grenades, etc.)
   * @param {Actor} actor - The attacking actor
   * @param {Item} weapon - The weapon being used
   * @param {Array<Actor>} targets - Array of target actors
   * @param {Object} [options={}] - Attack options (passed to each rollAttack)
   * @returns {Promise<Array<Object>>} Array of attack results
   */
  static async rollBulkAttack(actor, weapon, targets, options = {}) {
    if (!actor || !weapon) {
      ui.notifications.error('Bulk attack failed: missing actor or weapon.');
      return [];
    }

    if (!targets || targets.length === 0) {
      ui.notifications.warn('No targets selected for bulk attack.');
      return [];
    }

    const results = [];

    // Show summary header
    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="swse-bulk-attack-header">
          <h3><i class="fa-solid fa-crosshairs"></i> ${weapon.name} — Attacking ${targets.length} target${targets.length > 1 ? 's' : ''}</h3>
        </div>
      `
    });

    for (const target of targets) {
      const result = await this.rollAttack(actor, weapon, {
        ...options,
        target,
        skipFP: results.length > 0 // Only prompt FP on first attack
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Roll an Autofire attack against a 2×2 area
   *
   * Autofire mechanics:
   * - Targets a 2×2 square area
   * - Single attack roll at -5 penalty (-2 if braced)
   * - Hits deal full damage, misses deal half damage
   * - Consumes 10 shots/slugs
   * - Evasion talent: half damage becomes no damage on miss
   * - Improved Evasion: half damage on hit instead
   *
   * Burst Fire mechanics:
   * - Targets single target instead of area
   * - Single attack roll at -5 penalty
   * - Adds 2 extra dice of the weapon's damage type
   * - Consumes only 5 shots/slugs
   * - Not an area attack, so Evasion doesn't reduce damage
   *
   * @param {Actor} actor - The attacking actor
   * @param {Item} weapon - The weapon being used (must have autofire property)
   * @param {Object} [options={}] - Autofire options
   * @param {Array<Actor>} [options.targets] - Target actors in the area (or single target for Burst Fire)
   * @param {boolean} [options.braced=false] - Whether weapon is braced (-2 instead of -5)
   * @param {boolean} [options.burstFire=false] - Use Burst Fire feat (single target, +2 dice damage, 5 ammo)
   * @param {boolean} [options.showDialog=false] - Show roll modifiers dialog
   * @returns {Promise<Object|null>} Autofire result with area effects
   */
  static async rollAutofire(actor, weapon, options = {}) {
    if (!actor || !weapon) {
      ui.notifications.error('Autofire failed: missing actor or weapon.');
      return null;
    }

    try {
      // Check if weapon has autofire capability
      const hasAutofire = weapon.system?.properties?.includes('autofire') ||
                          weapon.system?.strippedFeatures?.autofire === true;
      if (!hasAutofire) {
        ui.notifications.warn(`${weapon.name} does not have autofire capability.`);
        return null;
      }

      // Get ammunition info
      const ammo = weapon.system?.ammunition;
      const ammoRequired = options.burstFire ? 5 : 10;
      const currentAmmo = ammo?.current ?? 0;

      if (currentAmmo < ammoRequired) {
        ui.notifications.error(
          `${weapon.name} requires ${ammoRequired} shots but only has ${currentAmmo}.`
        );
        return null;
      }

      // Get modifiers from dialog if requested
      let modifiers = {
        customModifier: options.customModifier || 0,
        situationalBonus: 0,
        useForcePoint: false
      };

      if (options.showDialog) {
        const dialogResult = await showRollModifiersDialog({
          title: `${weapon.name} ${options.burstFire ? 'Burst Fire' : 'Autofire'}`,
          rollType: 'attack',
          actor,
          weapon
        });

        if (!dialogResult) {return null;}
        modifiers = { ...modifiers, ...dialogResult };
      }

      // Create roll context for hooks
      const context = {
        actor,
        weapon,
        targets: options.targets || [],
        attackBonus: 0,
        formula: '',
        fpBonus: 0,
        isAutofire: true,
        isBurstFire: options.burstFire || false,
        isBraced: options.braced || false,
        ammoConsumed: ammoRequired
      };

      // Call pre-roll hook
      if (!callPreRollHook(ROLL_HOOKS.PRE_ATTACK, context)) {
        return { cancelled: true };
      }

      // Force Point before roll
      const fpBonus = (options.skipFP || !modifiers.useForcePoint)
        ? 0
        : await this.promptForcePointUse(actor, `${options.burstFire ? 'Burst Fire' : 'Autofire'} attack`);
      context.fpBonus = fpBonus;

      // Calculate attack penalty
      // Autofire: -5 normally, -2 if braced
      // Burst Fire: -5 (same as autofire)
      const autofirePenalty = (options.braced && !options.burstFire) ? -2 : -5;

      // Calculate attack bonus
      const atkBonus = computeAttackBonus(actor, weapon);
      const totalBonus = atkBonus + autofirePenalty + fpBonus + modifiers.customModifier + modifiers.situationalBonus;
      context.attackBonus = totalBonus;

      // Build formula
      const formula = `1d20 + ${totalBonus}`;
      context.formula = formula;

      // Perform the roll
      const roll = await this._safeRoll(formula);
      if (!roll) {return null;}

      // Analyze critical threat (even for autofire)
      const d20 = roll.dice[0].results[0].result;
      const critAnalysis = analyzeCriticalThreat(weapon, d20, roll.total);
      let critConfirmed = false;
      const critMultiplier = 2;

      if (critAnalysis.isThreat && !critAnalysis.isNat20) {
        critConfirmed = await rollCriticalConfirmation(actor, weapon, context.attackBonus);
      } else if (critAnalysis.isNat20) {
        critConfirmed = true;
      }

      // Process damage for each target
      const targetResults = [];

      if (context.targets && context.targets.length > 0) {
        for (const target of context.targets) {
          const targetReflex = target.system?.defenses?.reflex?.total ?? 10;

          // Determine if hit or miss
          const isHit = roll.total >= targetReflex;

          // Roll damage
          let damageRoll = null;

          // Burst Fire adds 2 extra damage dice (same type as weapon)
          if (options.burstFire) {
            // Extract the dice type from weapon damage (e.g., "3d10" -> "d10")
            const baseFormula = weapon.system?.damage ?? '1d6';
            const diceMatch = baseFormula.match(/d(\d+)/);
            const diceType = diceMatch ? diceMatch[0] : 'd6';

            // Temporarily modify weapon damage for burst fire calculation
            const originalDamage = weapon.system?.damage;
            const modifiedDamage = `${baseFormula} + 2${diceType}`;
            await weapon.update({ 'system.damage': modifiedDamage });

            try {
              damageRoll = await rollDamage(actor, weapon, {
                isCrit: critConfirmed,
                critMultiplier: critConfirmed ? critMultiplier : 1
              });
            } finally {
              // Restore original damage formula
              await weapon.update({ 'system.damage': originalDamage });
            }
          } else {
            damageRoll = await rollDamage(actor, weapon, {
              isCrit: critConfirmed,
              critMultiplier: critConfirmed ? critMultiplier : 1
            });
          }

          // Check for Evasion talent
          const hasEvasion = actor.items.some(item =>
            (item.type === 'talent') &&
            (item.name?.toLowerCase().includes('evasion') || item.name?.toLowerCase().includes('improved evasion'))
          );
          const hasImprovedEvasion = actor.items.some(item =>
            (item.type === 'talent') &&
            (item.name?.toLowerCase().includes('improved evasion'))
          );

          // Apply damage reduction for area attacks (not burst fire)
          let finalDamage = damageRoll?.total ?? 0;
          let damageType = 'full';

          if (!options.burstFire) {
            // Area attack - apply Evasion talent rules
            if (isHit) {
              damageType = 'full';
            } else {
              if (hasEvasion) {
                damageType = 'noDamage';
                finalDamage = 0;
              } else {
                damageType = 'half';
                finalDamage = Math.ceil(finalDamage / 2);
              }
            }
          } else {
            // Burst Fire - single target, not an area attack
            // Evasion doesn't apply to burst fire
            if (!isHit) {
              damageType = 'half';
              finalDamage = Math.ceil(finalDamage / 2);
            }
          }

          targetResults.push({
            target,
            roll: roll.total,
            targetReflex,
            isHit,
            damageRoll,
            finalDamage,
            damageType,
            isCrit: critConfirmed
          });
        }
      }

      // Consume ammunition via AmmoSystem
      const ammoResult = await AmmoSystem.consumeAmmunition(actor, weapon, ammoRequired);
      const newAmmo = ammoResult.newAmmo ?? currentAmmo;

      // Build HTML result
      const attackTypeLabel = options.burstFire ? 'Burst Fire' : 'Autofire';
      const penaltyLabel = options.braced && !options.burstFire ? '-2' : '-5';

      const targetHTMLs = targetResults.map(tr => `
        <div class="autofire-target-result">
          <div class="target-name"><strong>${tr.target.name}</strong></div>
          <div class="target-vs-defense">
            Target Reflex: ${tr.targetReflex}
          </div>
          <div class="attack-result">
            <div class="roll-total">${tr.roll}</div>
            ${tr.isHit
              ? `<div class="attack-outcome hit">HIT — Full Damage (${tr.finalDamage})</div>`
              : (options.burstFire
                ? `<div class="attack-outcome miss">MISS — Half Damage (${tr.finalDamage})</div>`
                : `<div class="attack-outcome ${tr.damageType === 'noDamage' ? 'evaded' : 'miss'}">
                    MISS — ${tr.damageType === 'noDamage' ? 'No Damage (Evasion)' : `Half Damage (${tr.finalDamage})`}
                  </div>`)
            }
          </div>
        </div>
      `).join('');

      const html = `
        <div class="swse-autofire-card">
          <div class="header">
            <h3>${weapon.name} — ${attackTypeLabel}</h3>
          </div>

          <div class="attack-info">
            <div class="roll-result">
              <span class="label">Attack Roll:</span>
              <span class="roll">${roll.total}</span>
              <span class="formula">(${formula})</span>
            </div>
            <div class="attack-penalty">
              Penalty: ${penaltyLabel}
              ${options.braced && !options.burstFire ? ' <i title="Weapon is braced">(Braced)</i>' : ''}
              ${fpBonus ? `, FP +${fpBonus}` : ''}
            </div>
            <div class="ammo-consumption">
              Ammunition: ${currentAmmo} → ${newAmmo} (${ammoRequired} shots used)
            </div>
          </div>

          <div class="targets-header">
            <h4>${options.burstFire ? 'Target' : '2×2 Area Targets'}</h4>
          </div>

          ${targetResults.length > 0
            ? targetHTMLs
            : '<div class="no-targets">No targets in area</div>'}

        </div>
      `;

      const message = await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: html,
        rolls: [roll]
      });

      const result = {
        success: true,
        roll,
        formula,
        totalBonus,
        fpBonus,
        targets: targetResults,
        ammoConsumed: ammoRequired,
        newAmmoTotal: newAmmo,
        message
      };

      // Show 3D dice if available
      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }

      // Call post-roll hook
      callPostRollHook(ROLL_HOOKS.POST_ATTACK, { ...context, result });

      return result;

    } catch (err) {
      swseLogger.error('Autofire roll failed:', err);
      ui.notifications.error('Autofire roll failed. Check console for details.');
      return null;
    }
  }

  /**
   * Execute a Full Attack action with multiple attacks
   *
   * Handles:
   * - Two-weapon fighting (double weapons and dual wielding)
   * - Double Attack feat (-5 penalty on all attacks)
   * - Triple Attack feat (additional -5 penalty)
   * - Dual Weapon Mastery I/II/III (reduces two-weapon penalty)
   *
   * @param {Actor} actor - The attacking actor
   * @param {Object} [options={}] - Full attack options
   * @param {Item} [options.primaryWeapon] - Override primary weapon
   * @param {Item} [options.offhandWeapon] - Override offhand weapon
   * @param {boolean} [options.skipDialog=false] - Skip confirmation dialog
   * @param {Actor} [options.target] - The target actor
   * @param {string} [options.cover='none'] - Target's cover level
   * @param {string} [options.concealment='none'] - Target's concealment level
   * @returns {Promise<Object|null>} Full attack result with all attack rolls
   */
  static async rollFullAttack(actor, options = {}) {
    if (!actor) {
      ui.notifications.error('Full Attack failed: no actor selected.');
      return null;
    }

    try {
      // Get equipped weapons
      const equippedWeapons = getEquippedWeapons(actor);

      // Allow overrides
      if (options.primaryWeapon) {
        equippedWeapons.primary = options.primaryWeapon;
      }
      if (options.offhandWeapon) {
        equippedWeapons.offhand = options.offhandWeapon;
      }

      if (!equippedWeapons.primary) {
        ui.notifications.warn('No weapon equipped for Full Attack.');
        return null;
      }

      // Show dialog to confirm full attack configuration
      let config;
      if (options.skipDialog) {
        config = calculateFullAttackConfig(actor, equippedWeapons.primary, equippedWeapons.offhand);
      } else {
        config = await showFullAttackDialog(actor, equippedWeapons);
        if (!config) {return null;} // User cancelled
      }

      // Get target
      const target = options.target || this.getTargetActor();
      const targetReflex = target
        ? (target.system?.defenses?.reflex?.total || 10) + getCoverBonus(options.cover || 'none')
        : null;

      // Create context for hooks
      const context = {
        actor,
        config,
        target,
        targetReflex,
        isFullAttack: true
      };

      // Call pre-roll hook for full attack
      if (!callPreRollHook(ROLL_HOOKS.PRE_ATTACK, context)) {
        return { cancelled: true };
      }

      // Prompt for Force Point once for the entire full attack
      const fpBonus = await this.promptForcePointUse(actor, 'Full Attack');

      // Roll each attack
      const results = [];

      for (const attack of config.attacks) {
        const weapon = attack.weapon;

        // Calculate attack bonus with this attack's specific penalty
        const baseAttackBonus = computeAttackBonus(actor, weapon);
        const attackPenalty = attack.penalty || 0;
        const totalBonus = baseAttackBonus + attackPenalty + fpBonus;

        // Build formula
        const formula = `1d20 + ${totalBonus}`;

        // Roll the attack
        const roll = await this._safeRoll(formula);
        if (!roll) {continue;}

        const d20 = roll.dice[0].results[0].result;

        // Get weapon crit properties
        const critRange = weapon.system?.critRange || 20;
        const critMultiplier = weapon.system?.critMultiplier || 2;

        // Analyze critical threat
        const critAnalysis = analyzeCriticalThreat(d20, critRange);

        // Check concealment
        let concealmentHit = true;
        const missChance = getConcealmentMissChance(options.concealment || 'none');
        if (missChance > 0) {
          const concealResult = await rollConcealmentCheck(missChance, actor);
          concealmentHit = concealResult.hit;
        }

        // Determine hit/miss
        const isHit = targetReflex !== null
          ? roll.total >= targetReflex && concealmentHit
          : null;

        // Handle critical confirmation
        let critConfirmed = critAnalysis.autoConfirmed;
        let confirmationRoll = null;

        if (critAnalysis.needsConfirmation && isHit !== false && targetReflex !== null) {
          const confirmResult = await rollCriticalConfirmation({
            actor,
            weapon,
            attackBonus: totalBonus,
            targetDefense: targetReflex,
            fpBonus: 0, // FP already applied to main roll
            originalD20: d20
          });
          confirmationRoll = confirmResult.roll;
          critConfirmed = confirmResult.confirmed;
        }

        const attackResult = {
          roll,
          d20,
          total: roll.total,
          attackBonus: totalBonus,
          baseBonus: baseAttackBonus,
          penalty: attackPenalty,
          penaltySource: attack.penaltySource,
          weapon,
          label: attack.label,
          source: attack.source,
          isNat20: critAnalysis.isNat20,
          isCritThreat: critAnalysis.isThreat,
          critConfirmed,
          critMultiplier,
          confirmationRoll,
          targetReflex,
          isHit,
          concealmentMiss: !concealmentHit
        };

        results.push(attackResult);

        // Record each attack in history
        RollHistory.record({
          roll,
          actor,
          type: 'attack',
          result: {
            isHit,
            isCrit: critConfirmed,
            targetReflex,
            isFullAttack: true,
            attackNumber: attack.attackNumber
          },
          context: { ...context, weapon, attack }
        });
      }

      // Generate combined chat card
      const cardHtml = generateFullAttackCard(actor, results, config);

      // Create chat message
      const message = await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: cardHtml
      });

      // Show 3D dice if available
      if (game.dice3d) {
        for (const result of results) {
          await game.dice3d.showForRoll(result.roll, game.user, true);
        }
      }

      // Build final result object
      const fullResult = {
        config,
        results,
        message,
        summary: {
          totalAttacks: results.length,
          hits: results.filter(r => r.isHit).length,
          crits: results.filter(r => r.critConfirmed).length,
          misses: results.filter(r => r.isHit === false).length,
          hasDoubleAttack: config.hasDoubleAttack,
          hasTripleAttack: config.hasTripleAttack,
          usingDualWeapons: config.usingDualWeapons
        }
      };

      // Call post-roll hook
      callPostRollHook(ROLL_HOOKS.POST_ATTACK, { ...context, result: fullResult });

      // Notify user
      const summary = fullResult.summary;
      ui.notifications.info(
        `Full Attack: ${summary.hits}/${summary.totalAttacks} hits` +
        (summary.crits > 0 ? ` (${summary.crits} critical!)` : '')
      );

      return fullResult;

    } catch (err) {
      swseLogger.error('Full Attack failed:', err);
      ui.notifications.error('Full Attack failed. Check console for details.');
      return null;
    }
  }

  /* ========================================================================== */
  /* DAMAGE ROLLS                                                               */
  /* ========================================================================== */

  /**
   * Roll damage for a weapon attack
   * @param {Actor} actor - The attacking actor
   * @param {Item} weapon - The weapon used
   * @param {Object} [options={}] - Damage options
   * @param {boolean} [options.isCritical=false] - Is this a critical hit?
   * @param {number} [options.critMultiplier=2] - Critical damage multiplier
   * @param {Actor} [options.target] - The target actor
   * @returns {Promise<Roll|null>} The damage roll
   */
  static async rollDamage(actor, weapon, options = {}) {
    // Get modifiers from dialog if requested
    let modifiers = {
      customModifier: 0,
      useForcePoint: false
    };

    if (options.showDialog) {
      const dialogResult = await showRollModifiersDialog({
        title: `${weapon.name} Damage`,
        rollType: 'damage',
        actor,
        weapon,
        showCover: false,
        showConcealment: false
      });

      if (!dialogResult) {return null;} // Cancelled
      modifiers = { ...modifiers, ...dialogResult };
    }

    const context = {
      actor,
      weapon,
      target: options.target,
      isCritical: options.isCritical || false,
      critMultiplier: options.critMultiplier || 2,
      modifiers
    };

    // Call pre-roll hook
    if (!callPreRollHook(ROLL_HOOKS.PRE_DAMAGE, context)) {
      return null;
    }

    // Force Point if requested
    const fpBonus = modifiers.useForcePoint
      ? await this.promptForcePointUse(actor, 'damage roll')
      : 0;

    const result = await rollDamage(actor, weapon, { ...options, fpBonus });

    // Record in history
    if (result) {
      RollHistory.record({
        roll: result,
        actor,
        type: 'damage',
        result: { total: result.total, isCritical: context.isCritical },
        context
      });
    }

    // Call post-roll hook
    callPostRollHook(ROLL_HOOKS.POST_DAMAGE, { ...context, roll: result });

    return result;
  }

  /* ========================================================================== */
  /* SKILL CHECKS                                                               */
  /* ========================================================================== */

  /**
   * Roll a skill check with full breakdown
   * @param {Actor} actor - The actor making the check
   * @param {string} skillKey - The skill key (e.g., 'acrobatics', 'perception')
   * @param {Object} [options={}] - Skill check options
   * @param {boolean} [options.showDialog=false] - Show modifiers dialog
   * @param {number} [options.dc] - DC to compare against
   * @returns {Promise<Object|null>} Skill check result
   */
  static async rollSkill(actor, skillKey, options = {}) {
    const skill = actor.system.skills[skillKey];
    if (!skill) {
      ui.notifications.warn(`Skill ${skillKey} not found.`);
      return null;
    }

    try {
      // Get modifiers from dialog if requested
      let modifiers = {
        customModifier: 0,
        useForcePoint: false
      };

      if (options.showDialog) {
        const dialogResult = await showRollModifiersDialog({
          title: `${skillKey} Check`,
          rollType: 'skill',
          actor,
          showCover: false,
          showConcealment: false
        });

        if (!dialogResult) {return null;}
        modifiers = { ...modifiers, ...dialogResult };
      }

      // Create context for hooks
      const context = {
        actor,
        skillKey,
        skill,
        modifiers,
        dc: options.dc
      };

      // Call pre-roll hook
      if (!callPreRollHook(ROLL_HOOKS.PRE_SKILL, context)) {
        return { cancelled: true };
      }

      // Force Point
      const fpBonus = modifiers.useForcePoint
        ? await this.promptForcePointUse(actor, `${skillKey} check`)
        : 0;

      const total = skill.total + fpBonus + modifiers.customModifier;

      // Build formula
      const formula = `1d20 + ${total}`;

      const roll = await this._safeRoll(formula);
      if (!roll) {return null;}

      const d20 = roll.dice[0].results[0].result;

      // Breakdown components
      const parts = [];
      const halfLevel = getEffectiveHalfLevel(actor);
      parts.push(`½ Level +${halfLevel}`);

      if (skill.trained) {parts.push(`Trained +5`);}
      if (skill.focused) {parts.push(`Skill Focus +5`);}

      const abilityMod = actor.system.attributes[skill.selectedAbility]?.mod ?? 0;
      parts.push(`${skill.selectedAbility.toUpperCase()} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`);

      const misc = skill.miscMod ?? 0;
      if (misc) {parts.push(`Misc ${misc >= 0 ? '+' : ''}${misc}`);}

      const condition = actor.system.conditionTrack?.penalty ?? 0;
      if (condition) {parts.push(`Condition ${condition}`);}

      if (fpBonus) {parts.push(`FP +${fpBonus}`);}
      if (modifiers.customModifier) {parts.push(`Custom ${modifiers.customModifier >= 0 ? '+' : ''}${modifiers.customModifier}`);}

      // DC comparison
      const dc = options.dc;
      const success = dc != null ? roll.total >= dc : null;

      const result = {
        roll,
        d20,
        total: roll.total,
        skillTotal: skill.total,
        fpBonus,
        dc,
        success,
        modifiers
      };

      // Record in history
      RollHistory.record({
        roll,
        actor,
        type: 'skill',
        result: { skillKey, success, dc },
        context
      });

      // Build chat card
      const dcHTML = dc != null ? `
        <div class="skill-dc">
          <span>vs DC ${dc}</span>
          <span class="dc-result ${success ? 'success' : 'failure'}">
            ${success ? '<i class="fa-solid fa-check"></i> Success' : '<i class="fa-solid fa-times"></i> Failure'}
            (${roll.total - dc >= 0 ? '+' : ''}${roll.total - dc})
          </span>
        </div>
      ` : '';

      const html = `
        <div class="swse-skill-card">
          <h3>${skillKey.toUpperCase()} Check</h3>
          <div class="roll-total">${roll.total}</div>
          <div class="roll-d20">d20: ${d20}${d20 === 20 ? ' <i class="fa-solid fa-star"></i>' : d20 === 1 ? ' <i class="fa-solid fa-skull"></i>' : ''}</div>
          <div class="roll-formula">${formula}</div>
          <div class="roll-breakdown">${parts.join(', ')}</div>
          ${dcHTML}
        </div>
      `;

      const msg = await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: html,
        rolls: [roll],
        flags: { swse: { roll: roll.toJSON() } }
      });

      result.message = msg;

      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }

      // Post-roll hook
      callPostRollHook(ROLL_HOOKS.POST_SKILL, { ...context, result });

      return result;

    } catch (err) {
      swseLogger.error('Skill roll failed:', err);
      ui.notifications.error('Skill roll failed. Check console for details.');
      return null;
    }
  }

  /* ========================================================================== */
  /* SAVE ROLLS                                                                 */
  /* ========================================================================== */

  /**
   * Roll a defense/save check
   * @param {Actor} actor - The actor making the save
   * @param {string} defenseType - 'fortitude', 'reflex', or 'will'
   * @param {Object} [options={}] - Save options
   * @param {number} [options.dc] - DC to beat
   * @returns {Promise<Object|null>} Save result
   */
  static async rollSave(actor, defenseType, options = {}) {
    const defense = actor.system.defenses?.[defenseType];
    if (!defense) {
      ui.notifications.warn(`Defense ${defenseType} not found.`);
      return null;
    }

    try {
      const context = {
        actor,
        defenseType,
        defense,
        dc: options.dc
      };

      // Pre-roll hook
      if (!callPreRollHook(ROLL_HOOKS.PRE_SAVE, context)) {
        return { cancelled: true };
      }

      const formula = `1d20 + ${defense.total}`;
      const roll = await this._safeRoll(formula);
      if (!roll) {return null;}

      const d20 = roll.dice[0].results[0].result;
      const dc = options.dc;
      const success = dc != null ? roll.total >= dc : null;

      const result = {
        roll,
        d20,
        total: roll.total,
        defenseTotal: defense.total,
        dc,
        success
      };

      // Record in history
      RollHistory.record({
        roll,
        actor,
        type: 'save',
        result: { defenseType, success, dc },
        context
      });

      // Chat card
      const dcHTML = dc != null ? `
        <div class="save-dc ${success ? 'success' : 'failure'}">
          vs DC ${dc}: ${success ? 'SUCCESS' : 'FAILURE'}
        </div>
      ` : '';

      const html = `
        <div class="swse-save-card">
          <h3>${defenseType.toUpperCase()} Save</h3>
          <div class="roll-total">${roll.total}</div>
          <div class="roll-d20">d20: ${d20}</div>
          <div class="roll-formula">${formula}</div>
          ${dcHTML}
        </div>
      `;

      const msg = await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: html,
        rolls: [roll]
      });

      result.message = msg;

      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }

      // Post-roll hook
      callPostRollHook(ROLL_HOOKS.POST_SAVE, { ...context, result });

      return result;

    } catch (err) {
      swseLogger.error('Save roll failed:', err);
      ui.notifications.error('Save roll failed. Check console for details.');
      return null;
    }
  }

  /* ========================================================================== */
  /* INITIATIVE ROLLS                                                           */
  /* ========================================================================== */

  /**
   * Roll initiative for an actor
   * @param {Actor} actor - The actor rolling initiative
   * @param {Object} [options={}] - Initiative options
   * @returns {Promise<Object|null>} Initiative result
   */
  static async rollInitiative(actor, options = {}) {
    try {
      const context = { actor };

      if (!callPreRollHook(ROLL_HOOKS.PRE_INITIATIVE, context)) {
        return { cancelled: true };
      }

      const dexMod = actor.system.attributes?.dex?.mod ?? 0;
      const initBonus = actor.system.initiative?.misc ?? 0;
      const total = dexMod + initBonus;

      const formula = `1d20 + ${total}`;
      const roll = await this._safeRoll(formula);
      if (!roll) {return null;}

      const d20 = roll.dice[0].results[0].result;

      const result = {
        roll,
        d20,
        total: roll.total,
        initiativeBonus: total
      };

      // Record in history
      RollHistory.record({
        roll,
        actor,
        type: 'initiative',
        result: { total: roll.total },
        context
      });

      const html = `
        <div class="swse-initiative-card">
          <h3><i class="fa-solid fa-bolt"></i> Initiative</h3>
          <div class="roll-total">${roll.total}</div>
          <div class="roll-formula">${formula}</div>
          <div class="roll-breakdown">DEX ${dexMod >= 0 ? '+' : ''}${dexMod}${initBonus ? `, Misc ${initBonus >= 0 ? '+' : ''}${initBonus}` : ''}</div>
        </div>
      `;

      const msg = await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: html,
        rolls: [roll]
      });

      result.message = msg;

      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }

      callPostRollHook(ROLL_HOOKS.POST_INITIATIVE, { ...context, result });

      return result;

    } catch (err) {
      swseLogger.error('Initiative roll failed:', err);
      ui.notifications.error('Initiative roll failed. Check console for details.');
      return null;
    }
  }

  /* ========================================================================== */
  /* FORCE POWER ROLLS                                                          */
  /* ========================================================================== */

  /**
   * Parse and roll damage dice from effect strings
   * @param {string} effectText - Effect text like "6d6 lightning damage + stun"
   * @param {string} bonusDice - Optional bonus dice to add (e.g., "2d6" from FP effect)
   * @returns {Promise<Object|null>} Damage result or null
   * @private
   */
  static async _parsePowerDamage(effectText, bonusDice = null) {
    if (!effectText) {return null;}

    const damagePattern = /(\d+d\d+)(?:\s+(?:lightning|energy|fire|cold|sonic|force)?\s*(?:damage|healing))?/i;
    const match = effectText.match(damagePattern);

    if (!match) {return null;}

    let formula = match[1];
    let bonusApplied = false;

    if (bonusDice) {
      formula = `${formula} + ${bonusDice}`;
      bonusApplied = true;
    }

    const damageRoll = await this._safeRoll(formula);
    if (!damageRoll) {return null;}

    let damageType = 'damage';
    if (/healing/i.test(effectText)) {damageType = 'healing';} else if (/lightning/i.test(effectText)) {damageType = 'lightning';} else if (/energy/i.test(effectText)) {damageType = 'energy';} else if (/fire/i.test(effectText)) {damageType = 'fire';} else if (/cold/i.test(effectText)) {damageType = 'cold';} else if (/sonic/i.test(effectText)) {damageType = 'sonic';} else if (/force/i.test(effectText)) {damageType = 'force';}

    return {
      formula,
      roll: damageRoll,
      total: damageRoll.total,
      type: damageType,
      bonusApplied
    };
  }

  /**
   * Parse Force Point effect for mechanical bonuses
   * @param {string} fpEffect - Force Point effect text
   * @returns {Object} Parsed mechanics
   * @private
   */
  static _parseFPMechanics(fpEffect) {
    if (!fpEffect) {return {};}

    const result = {};

    const damageBonusPattern = /\+(\d+)(?:d(\d+))?\s*(?:dice|die)?\s*(?:of\s+)?damage/i;
    const damageMatch = fpEffect.match(damageBonusPattern);

    if (damageMatch) {
      const numDice = damageMatch[1];
      const dieSize = damageMatch[2] || '6';
      result.bonusDice = `${numDice}d${dieSize}`;
    }

    const dcPattern = /(?:lower|reduce).*?DC.*?by\s*(\d+)/i;
    const dcMatch = fpEffect.match(dcPattern);

    if (dcMatch) {
      result.dcReduction = parseInt(dcMatch[1], 10);
    }

    if (/double\s+duration/i.test(fpEffect)) {
      result.durationMultiplier = 2;
    } else if (/triple\s+duration/i.test(fpEffect)) {
      result.durationMultiplier = 3;
    }

    if (!result.bonusDice && !result.dcReduction && !result.durationMultiplier) {
      result.customEffect = true;
    }

    return result;
  }

  /**
   * Process force technique and secret enhancements
   * @param {Actor} actor
   * @param {Item} power
   * @param {Object} enhancements
   * @returns {Promise<Object>} Enhancement effects
   * @private
   */
  static async _processEnhancements(actor, power, enhancements) {
    const effects = {
      damageMultiplier: 1,
      rangeMultiplier: 1,
      additionalTargets: 0,
      techniques: [],
      secrets: [],
      displayHTML: ''
    };

    if (!enhancements || (!enhancements.techniques?.length && !enhancements.secrets?.length)) {
      return effects;
    }

    const displayParts = [];

    if (enhancements.techniques?.length > 0) {
      for (const tech of enhancements.techniques) {
        effects.techniques.push(tech);
        displayParts.push(`
          <div class="enhancement-active technique">
            <img src="${tech.img}" class="enhancement-icon" />
            <div class="enhancement-name"><i class="fa-solid fa-hand-sparkles"></i> ${tech.name}</div>
            <div class="enhancement-effect">${tech.system.description}</div>
          </div>
        `);
      }
    }

    if (enhancements.secrets?.length > 0) {
      for (const secret of enhancements.secrets) {
        const useDP = await this._promptSecretCost(actor, secret);

        if (useDP === null) {continue;}

        // PHASE 3: Route resource spending through ActorEngine
        const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');

        if (useDP) {
          const dp = actor.system.destinyPoints?.value || 0;
          if (dp > 0) {
            await ActorEngine.spendDestinyPoints(actor, 1);
          }
        } else {
          const fp = actor.system.forcePoints?.value || 0;
          if (fp > 0) {
            await ActorEngine.spendForcePoints(actor, 1);
          }
        }

        this._applySecretEffect(secret, effects, useDP);

        effects.secrets.push(secret);
        displayParts.push(`
          <div class="enhancement-active secret">
            <img src="${secret.img}" class="enhancement-icon" />
            <div class="enhancement-name"><i class="fa-solid fa-star"></i> ${secret.name}</div>
            <div class="enhancement-cost">${useDP ? 'Destiny Point' : 'Force Point'} spent</div>
            <div class="enhancement-effect">${secret.system.description}</div>
          </div>
        `);
      }
    }

    if (displayParts.length > 0) {
      effects.displayHTML = `
        <div class="force-enhancements-active">
          <div class="enhancements-header">
            <i class="fa-solid fa-magic"></i> Active Enhancements
          </div>
          ${displayParts.join('')}
        </div>
      `;
    }

    return effects;
  }

  /**
   * Prompt for Force Point or Destiny Point cost
   * @private
   */
  static async _promptSecretCost(actor, secret) {
    const fp = actor.system.forcePoints?.value || 0;
    const dp = actor.system.destinyPoints?.value || 0;

    if (dp === 0 && fp > 0) {return false;}
    if (fp === 0 && dp > 0) {return true;}
    if (fp === 0 && dp === 0) {
      ui.notifications.warn(`No Force Points or Destiny Points available for ${secret.name}!`);
      return null;
    }

    return new Promise(resolve => {
      new SWSEDialogV2({
        title: `Activate ${secret.name}`,
        content: `
          <p><strong>${secret.name}</strong></p>
          <p>Available: FP: ${fp}, DP: ${dp}</p>
        `,
        buttons: {
          fp: { label: 'Force Point', callback: () => resolve(false) },
          dp: { label: 'Destiny Point', callback: () => resolve(true) },
          cancel: { label: 'Cancel', callback: () => resolve(null) }
        },
        default: 'fp'
      }).render(true);
    });
  }

  /**
   * Apply force secret effects
   * @private
   */
  static _applySecretEffect(secret, effects, usedDP) {
    const name = secret.name;

    switch (name) {
      case 'Devastating Power':
        effects.damageMultiplier *= usedDP ? 2 : 1.5;
        break;
      case 'Distant Power':
        effects.rangeMultiplier *= usedDP ? 999999 : 10;
        break;
      case 'Multitarget Power':
        const level = effects.actor?.system?.level || 1;
        effects.additionalTargets += usedDP ? Math.floor(level / 4) : 1;
        break;
      case 'Quicken Power':
        effects.actionTimeReduction = usedDP ? 'reaction' : 'swift';
        break;
      case 'Enlarged Power':
        effects.areaMultiplier = usedDP ? 5 : 2;
        break;
    }
  }

  /**
   * Roll Use the Force for a power
   * @param {Actor} actor - The actor using the power
   * @param {Item} power - The Force Power item
   * @param {Object} [enhancements=null] - Force techniques and secrets to apply
   * @returns {Promise<Object|null>} Power roll result
   */
  static async rollUseTheForce(actor, power, enhancements = null) {
    if (!actor || !power) {
      ui.notifications.error('Use the Force failed: missing actor or power.');
      return null;
    }

    const skill = actor.system.skills.useTheForce;
    if (!skill) {
      ui.notifications.warn('Use the Force skill not found.');
      return null;
    }

    try {
      const context = { actor, power, enhancements };

      if (!callPreRollHook(ROLL_HOOKS.PRE_FORCE_POWER, context)) {
        return { cancelled: true };
      }

      const enhancementEffects = await this._processEnhancements(actor, power, enhancements);

      const fpBonus = await this.promptForcePointUse(actor, 'Use the Force check');
      const fpSpent = fpBonus > 0;
      const total = skill.total + fpBonus;
      const formula = `1d20 + ${total}`;

      const fpMechanics = fpSpent && power.system.forcePointEffect
        ? this._parseFPMechanics(power.system.forcePointEffect)
        : {};

      const roll = await this._safeRoll(formula);
      if (!roll) {return null;}

      const d20 = roll.dice[0].results[0].result;

      const dcChart = power.system.dcChart || [];
      let resultTier = null;

      if (dcChart.length > 0) {
        const dcReduction = fpMechanics.dcReduction || 0;
        const adjustedTotal = roll.total + dcReduction;
        const sorted = [...dcChart].sort((a, b) => b.dc - a.dc);
        resultTier = sorted.find(tier => adjustedTotal >= tier.dc);
      }

      let damageResult = null;
      if (resultTier?.effect) {
        const bonusDice = fpMechanics.bonusDice || null;
        damageResult = await this._parsePowerDamage(resultTier.effect, bonusDice);

        if (enhancementEffects.damageMultiplier !== 1 && damageResult) {
          const originalTotal = damageResult.total;
          damageResult.total = Math.floor(damageResult.total * enhancementEffects.damageMultiplier);
          damageResult.enhancementApplied = true;
          damageResult.enhancementNote = `×${enhancementEffects.damageMultiplier} (${originalTotal} → ${damageResult.total})`;
        }
      }

      const parts = [];
      const halfLevel = getEffectiveHalfLevel(actor);
      parts.push(`½ Level +${halfLevel}`);
      if (skill.trained) {parts.push(`Trained +5`);}
      if (skill.focused) {parts.push(`Skill Focus +5`);}
      const abilityMod = actor.system.attributes[skill.selectedAbility]?.mod ?? 0;
      parts.push(`${skill.selectedAbility.toUpperCase()} ${abilityMod >= 0 ? '+' : ''}${abilityMod}`);
      if (skill.miscMod) {parts.push(`Misc ${skill.miscMod >= 0 ? '+' : ''}${skill.miscMod}`);}
      if (fpBonus) {parts.push(`FP +${fpBonus}`);}

      const result = {
        roll,
        d20,
        total: roll.total,
        resultTier,
        damageResult,
        fpSpent,
        fpMechanics,
        enhancementEffects
      };

      // Record in history
      RollHistory.record({
        roll,
        actor,
        type: 'forcePower',
        result: { powerName: power.name, resultTier: resultTier?.dc },
        context
      });

      // Build chat card (abbreviated for space)
      const darkSideWarning = power.system.discipline === 'dark-side'
        ? `<div class="dark-side-warning"><i class="fa-solid fa-skull"></i> Dark Side Power</div>`
        : '';

      const html = `
        <div class="swse-force-power-card">
          <div class="power-header">
            <img src="${power.img}" height="50" />
            <div class="power-title">
              <h3>${power.name}</h3>
              <span class="power-level">Level ${power.system.powerLevel || 1}</span>
            </div>
          </div>
          ${darkSideWarning}
          ${enhancementEffects.displayHTML}
          <div class="utf-result">
            <div class="roll-total">${roll.total}</div>
            <div class="roll-d20">d20: ${d20}</div>
            <div class="roll-breakdown">${parts.join(', ')}</div>
          </div>
          ${resultTier ? `
            <div class="power-result success">
              <h4>DC ${resultTier.dc} Achieved</h4>
              <p>${resultTier.effect}</p>
              ${damageResult ? `<div class="damage-total">${damageResult.total} ${damageResult.type}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;

      const message = await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: html,
        rolls: [roll]
      });

      result.message = message;

      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
        if (damageResult?.roll) {
          await game.dice3d.showForRoll(damageResult.roll, game.user, true);
        }
      }

      callPostRollHook(ROLL_HOOKS.POST_FORCE_POWER, { ...context, result });

      return result;

    } catch (err) {
      swseLogger.error('Force power roll failed:', err);
      ui.notifications.error('Force power roll failed. Check console for details.');
      return null;
    }
  }
}

/* ============================================================================ */
/* CHAT BUTTON HANDLERS                                                         */
/* ============================================================================ */

Hooks.on('renderChatMessageHTML', (message, html, user) => {
  html.querySelector('.swse-roll-damage')?.addEventListener('click', async ev => {
    const btn = ev.currentTarget;
    const weaponId = btn.dataset.weaponId;
    const isCrit = btn.dataset.isCrit === 'true';
    const critMult = parseInt(btn.dataset.critMult, 10) || 2;
    const twoHanded = btn.dataset.twoHanded === 'true';

    const actor = game.actors.get(message.speaker.actor);
    const weapon = actor?.items.get(weaponId);

    if (actor && weapon) {
      await SWSERoll.rollDamage(actor, weapon, {
        isCritical: isCrit,
        critMultiplier: critMult,
        twoHanded
      });
    }
  });
});

/* ============================================================================ */
/* GLOBAL EXPORTS                                                               */
/* ============================================================================ */

// Expose globally for macros
window.SWSERoll = SWSERoll;

// Export roll history and config for external use
export { RollHistory, ROLL_HOOKS };
