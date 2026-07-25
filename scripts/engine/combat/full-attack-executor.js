/**
 * FullAttackExecutor
 *
 * Single orchestration point for all Full Attack sequences:
 *   - Normal Full Attack
 *   - Double Attack
 *   - Triple Attack
 *   - Two-Weapon Attack
 *   - Double-Weapon Attack
 *
 * Usage from character-sheet._runCanonicalCombatAction():
 *
 *   return await FullAttackExecutor.execute(this.actor, {
 *     requestedPackage: 'doubleAttack',
 *     sheet: this,
 *     sourceElement: options.sourceElement,
 *   });
 *
 * Design invariants:
 *   - This module never decides penalty math — that lives in buildFullAttackSequence().
 *   - Economy is spent AFTER dialog confirmation, BEFORE rolling.
 *   - Each attack uses the canonical rollAttack() from attacks.js with suppressChat:true.
 *   - One combined chat card is posted after all attacks resolve; each row's
 *     HTML is rendered from stored, authoritative attack-entry state by
 *     full-attack-card-renderer.js (also used to re-render a row after a
 *     Phase 5 per-attack reroll — see meta-resource-feat-resolver.js
 *     #resolveFullAttackRerollButton).
 */

import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { AmmoSystem } from "/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";
import { buildInitialAttackEntry, FULL_ATTACK_SCHEMA_VERSION } from "/systems/foundryvtt-swse/scripts/engine/combat/full-attack-message-state.js";
import { renderFullAttackCardContent } from "/systems/foundryvtt-swse/scripts/engine/combat/full-attack-card-renderer.js";
import {
  buildFullAttackSequence,
  showFullAttackDialog,
  getEquippedWeapons,
  getDoubleAttackGroups as _getDoubleAttackGroups,
  getTripleAttackGroups as _getTripleAttackGroups,
  getWeaponGroup        as _getWeaponGroup,
  isDoubleWeapon        as _isDoubleWeapon,
  FULL_ATTACK_PACKAGES,
} from "/systems/foundryvtt-swse/scripts/combat/multi-attack.js";

// ─────────────────────────────────────────────────────────────────────────────
// Internal: cost/ammo helpers
// ─────────────────────────────────────────────────────────────────────────────

function _weaponKey(weapon) {
  return weapon?.id ?? weapon?._id ?? weapon?.uuid ?? weapon?.name ?? '';
}

function _aggregateFullAttackAmmo(actor, sequence, options = {}) {
  const byWeapon = new Map();
  for (const attack of sequence?.attacks ?? []) {
    const weapon = attack?.weapon;
    if (!weapon) continue;
    const amount = AmmoSystem.resolveAmmoCost({
      weapon,
      workflowContext: options.combatContext ?? null,
      options: {
        ...options,
        sequencePenalty: attack.finalPenalty,
        actionId: options.actionId ?? 'full-attack'
      }
    });
    if (!amount) continue;
    const key = _weaponKey(weapon);
    const existing = byWeapon.get(key) ?? { actor, weapon, amount: 0 };
    existing.amount += amount;
    byWeapon.set(key, existing);
  }
  return [...byWeapon.values()];
}

async function _rollbackFullAttackAmmo(actor, spendResults = []) {
  for (const spend of [...spendResults].reverse()) {
    if (!spend?.spent) continue;
    const weapon = actor?.items?.get?.(spend.weaponId) ?? null;
    try {
      await AmmoSystem.rollbackSpend(actor, weapon, spend);
    } catch (err) {
      console.warn('[FullAttackExecutor] Failed to rollback ammunition spend:', err);
    }
  }
}

async function _spendFullAttackEconomy(actor, actionType, sequence, options = {}) {
  const sheet = options.sheet ?? null;
  const metadata = {
    source: 'full-attack-executor',
    actionId: options.actionId ?? 'full-attack',
    actionName: options.actionName ?? sequence.packageType,
    combatContext: options.combatContext ?? null,
    packageType: sequence.packageType,
    attackCount: sequence.attacks?.length ?? 0
  };

  if (sheet && typeof sheet._applyActionEconomy === 'function') {
    const allowed = await sheet._applyActionEconomy(actionType, metadata);
    return {
      allowed: allowed !== false,
      permitted: allowed !== false,
      committed: allowed !== false,
      source: 'sheet',
      rollback: async () => false
    };
  }

  return ActionEconomyConsumption.spend(actor, actionType, metadata, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: combined chat card
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Post a single combined chat card for the full attack sequence.
 *
 * @param {Actor} actor
 * @param {Object} sequence - from buildFullAttackSequence()
 * @param {Array}  results  - array of attackResult objects from rollAttack()
 * @param {Actor|null} target
 */
async function _postCombinedCard(actor, sequence, results, target, sequenceId = null) {
  // Message-state schema (full-attack-v2, Phase 5): one entry per attack,
  // each with its own revisions[] history — see
  // full-attack-message-state.js for the schema authority. Built via the
  // state service's buildInitialAttackEntry() rather than assembled ad hoc
  // here, so the creation-time shape and the reroll-appended shape can
  // never drift apart.
  const reactionContextsByAttackInstanceId = new Map();
  const attackEntries = results.map((res, i) => {
    const plan = sequence.attacks[i];
    const weapon = res.weapon ?? plan?.weapon ?? null;
    const attackInstanceId = res.attackInstanceId ?? `${sequenceId ?? 'seq'}-${i}`;
    if (res.reactionContext) reactionContextsByAttackInstanceId.set(attackInstanceId, res.reactionContext);
    const entry = buildInitialAttackEntry({
      attackInstanceId,
      order: i,
      weaponUuid: weapon?.uuid ?? weapon?.id ?? null,
      weaponName: weapon?.name ?? null,
      targetUuid: target?.uuid ?? target?.id ?? null,
      targetName: target?.name ?? null,
      label: plan?.label ?? `Attack ${i + 1}`,
      penaltyText: (plan?.finalPenalty ?? 0) !== 0 ? `(penalty ${plan.finalPenalty})` : '',
      rollInstanceId: foundry.utils?.randomID?.() ?? null,
      naturalD20: res.d20 ?? null,
      total: res.total ?? null,
      formula: res.roll?.formula ?? null,
      outcome: {
        hit: res.isHit ?? null,
        critical: res.isCritical ?? null,
        criticalThreat: res.outcome?.criticalThreat ?? null,
        automaticHit: res.outcome?.automaticHit ?? null,
        automaticMiss: res.outcome?.automaticMiss ?? null,
        targetDefense: res.targetReflex ?? null,
        critMultiplier: res.critMultiplier ?? 2
      },
      componentLedger: res.componentLedger,
      // reactionContext is intentionally excluded (contains live Actor
      // references — see full-attack-card-renderer.js's docs); workflowContext
      // is already the same serializable shape combat-context-serializer.js
      // guarantees for single-attack messages.
      damageContext: { workflowContext: res.workflowContext ?? null },
      attackRerollOptions: res.attackRerollOptions
    });
    // sequenceId/criticalThreshold aren't part of the persisted per-attack
    // schema (sequenceId lives at the message level; criticalThreshold is
    // re-derived per reroll from the button's own dataset) but the renderer
    // reads them off the in-memory entry for convenience at initial-render
    // time.
    entry.sequenceId = sequenceId;
    entry.criticalThreshold = res.outcome?.criticalThreshold ?? 20;
    return entry;
  });

  const content = renderFullAttackCardContent(actor, target, sequence.packageType, attackEntries, sequence.breakdown, reactionContextsByAttackInstanceId);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { swse: {
      schemaVersion: FULL_ATTACK_SCHEMA_VERSION,
      fullAttack: true,
      packageType: sequence.packageType,
      sequenceId,
      breakdown: sequence.breakdown,
      attacks: attackEntries.map(({ sequenceId: _s, criticalThreshold: _c, ...rest }) => rest)
    } },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export class FullAttackExecutor {
  /**
   * Execute a Full Attack sequence.
   *
   * Flow:
   *   1. Show Full Attack dialog (buildFullAttackSequence preview + confirm).
   *   2. If cancelled → return null (economy untouched).
   *   3. Spend full-round action economy via sheet._applyActionEconomy().
   *   4. Roll each attack with suppressChat:true + sequencePenalty.
   *   5. Post combined chat card.
   *
   * @param {Actor}  actor
   * @param {Object} options
   * @param {string} [options.requestedPackage] - FULL_ATTACK_PACKAGES value (pre-select in dialog)
   * @param {Object} [options.sheet]            - Character sheet instance (for economy)
   * @param {Element}[options.sourceElement]    - Source DOM element
   * @param {string} [options.actionCostOverride] - 'standard'|'full-round' override
   * @param {string} [options.actionId]         - Combat action ID for logging
   * @param {string} [options.actionName]       - Combat action name for logging
   * @returns {Promise<Array|null>} Array of attack results, or null if cancelled/blocked
   */
  static async execute(actor, options = {}) {
    if (!actor) {return null;}

    const equipped = getEquippedWeapons(actor);

    // 1. Show dialog — returns confirmed sequence or null
    const sequence = await showFullAttackDialog(actor, {
      requestedPackage: options.requestedPackage,
      primaryWeapon:    options.primaryWeapon ?? equipped.primary,
      offhandWeapon:    options.offhandWeapon ?? (equipped.isDoubleWeapon ? null : equipped.offhand),
    });

    if (!sequence || !sequence.legal) {
      // Cancelled or illegal — economy untouched
      return null;
    }

    // 2. Preflight ammunition before spending action economy. Individual
    // rollAttack() calls perform the actual spend with rollback support.
    const ammoChecks = _aggregateFullAttackAmmo(actor, sequence, options);
    for (const check of ammoChecks) {
      const preflight = AmmoSystem.preflightAmmunition(actor, check.weapon, check.amount, options);
      if (preflight?.ok === false) {
        ui?.notifications?.error?.(preflight.message || `${check.weapon?.name ?? 'Weapon'} does not have enough ammunition.`);
        return null;
      }
    }

    // 3. Spend economy (full-round by default, overridable for "Full Attack as Standard Action" talents)
    const actionType = options.actionCostOverride ?? sequence.actionType ?? 'full-round';
    const sheet = options.sheet ?? null;

    const economySpend = await _spendFullAttackEconomy(actor, actionType, sequence, { ...options, sheet });
    if (economySpend?.allowed === false || economySpend?.permitted === false) {
      ui?.notifications?.warn?.(economySpend?.reason || 'Full Attack action economy could not be spent.');
      return null;
    }

    // 4. Resolve shared target (first token target, or null)
    const target = options.target
      ?? game.user?.targets?.first?.()?.actor
      ?? null;

    // 5. Roll each attack — suppressChat so we post one combined card.
    // sequenceId/attackInstanceId (Phase 4) are threaded through and
    // recorded on the combined card, and — since Phase 5 — power the
    // interactive per-attack reroll button rendered on each row (see
    // full-attack-card-renderer.js / meta-resource-feat-resolver.js
    // #resolveFullAttackRerollButton). Rerolling one attack updates only
    // that attack's stored revision; siblings and the shared cost/ammo
    // spends below are untouched.
    const sequenceId = foundry.utils?.randomID?.() ?? `seq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const rollOptions = {
      suppressChat:    true,
      target,
      sourceElement:   options.sourceElement ?? null,
      sheet,
      showRollCompanion: false,
      combatContext: options.combatContext ?? null,
      actionData: options.actionData ?? null,
      actionId: options.actionId ?? null,
      // Carry through any preroller modifiers the caller set
      customModifier:  options.customModifier  ?? 0,
      situationalBonus: options.situationalBonus ?? 0,
      targetContext:   options.targetContext   ?? null,
      sequenceId,
      sequenceLength: sequence.attacks.length,
    };

    const results = [];
    const ammoSpends = [];
    for (const [index, attack] of sequence.attacks.entries()) {
      try {
        const result = await rollAttack(actor, attack.weapon, {
          ...rollOptions,
          sequencePenalty: attack.finalPenalty,
          attackInstanceId: `${sequenceId}-${index}`,
          sequenceIndex: index,
        });
        if (!result) {
          await _rollbackFullAttackAmmo(actor, ammoSpends);
          ui.notifications.warn('Full Attack stopped before all attacks resolved; ammunition was rolled back.');
          return null;
        }
        if (result.ammoSpend?.spent) ammoSpends.push(result.ammoSpend);
        results.push(result);
      } catch (err) {
        await _rollbackFullAttackAmmo(actor, ammoSpends);
        console.error('[FullAttackExecutor] rollAttack failed for attack:', attack.label, err);
        ui.notifications.error('Full Attack failed; ammunition was rolled back.');
        return null;
      }
    }

    if (results.length === 0) {
      ui.notifications.warn('Full Attack: no attacks resolved.');
      return null;
    }

    // 6. Post combined chat card
    await _postCombinedCard(actor, sequence, results, target, sequenceId);

    return results;
  }

  /**
   * Convenience: determine which full attack packages are available for an actor.
   * Used by the sheet to decide which lane buttons to show.
   *
   * @param {Actor} actor
   * @returns {Set<string>} Set of FULL_ATTACK_PACKAGES values
   */
  static availablePackages(actor) {
    const available = new Set([FULL_ATTACK_PACKAGES.NORMAL]);

    if (!actor) {return available;}

    const equipped = getEquippedWeapons(actor);
    const {
      getDoubleAttackGroups,
      getTripleAttackGroups,
      getWeaponGroup,
      isDoubleWeapon,
    } = /** @type {any} */ (globalThis._swseMultiAttack ?? {});

    // We import these at the top; re-use them
    const doubleGroups = _getDoubleAttackGroups(actor);
    const tripleGroups = _getTripleAttackGroups(actor);
    const primary = equipped.primary;
    const offhand = equipped.isDoubleWeapon ? null : equipped.offhand;

    if (primary) {
      const grp = _getWeaponGroup(primary);
      if (grp && doubleGroups.has(grp)) {
        available.add(FULL_ATTACK_PACKAGES.DOUBLE_ATTACK);
        if (tripleGroups.has(grp)) {
          available.add(FULL_ATTACK_PACKAGES.TRIPLE_ATTACK);
        }
      }
    }

    if (offhand && primary && offhand.id !== primary.id) {
      available.add(FULL_ATTACK_PACKAGES.TWO_WEAPON);
    }

    if (equipped.isDoubleWeapon || (primary && _isDoubleWeapon(primary))) {
      available.add(FULL_ATTACK_PACKAGES.DOUBLE_WEAPON);
    }

    return available;
  }
}
