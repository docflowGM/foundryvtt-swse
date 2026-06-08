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
 *   - One combined chat card is posted after all attacks resolve.
 */

import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
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
// Internal: combined chat card
// ─────────────────────────────────────────────────────────────────────────────

function _outcomeLabel(result) {
  if (result.isCritical) {return 'Critical Hit';}
  if (result.isHit === true) {return 'Hit';}
  if (result.isHit === false) {return 'Miss';}
  return '—';
}

function _outcomeColor(result) {
  if (result.isCritical) {return '#c70;';}
  if (result.isHit === true) {return '#2a7;';}
  if (result.isHit === false) {return '#a33;';}
  return '#666;';
}

/**
 * Post a single combined chat card for the full attack sequence.
 *
 * @param {Actor} actor
 * @param {Object} sequence - from buildFullAttackSequence()
 * @param {Array}  results  - array of attackResult objects from rollAttack()
 * @param {Actor|null} target
 */
async function _postCombinedCard(actor, sequence, results, target) {
  const pkgLabel = {
    [FULL_ATTACK_PACKAGES.NORMAL]:        'Full Attack',
    [FULL_ATTACK_PACKAGES.DOUBLE_ATTACK]: 'Double Attack',
    [FULL_ATTACK_PACKAGES.TRIPLE_ATTACK]: 'Triple Attack',
    [FULL_ATTACK_PACKAGES.TWO_WEAPON]:    'Two-Weapon Attack',
    [FULL_ATTACK_PACKAGES.DOUBLE_WEAPON]: 'Double-Weapon Attack',
  }[sequence.packageType] ?? 'Full Attack';

  const targetLine = target
    ? `<div style="font-size:0.85em;color:#555;margin-bottom:6px">Target: <b>${target.name}</b></div>`
    : '';

  const attackRows = results.map((res, i) => {
    const plan = sequence.attacks[i];
    const label = plan?.label ?? `Attack ${i + 1}`;
    const total = res.total ?? '?';
    const outcome = _outcomeLabel(res);
    const color = _outcomeColor(res);
    const defLine = res.targetReflex != null
      ? ` vs Reflex ${res.targetReflex}`
      : '';
    const penLine = (plan?.finalPenalty ?? 0) !== 0
      ? `<span style="color:#888;font-size:0.8em"> (penalty ${plan.finalPenalty})</span>`
      : '';

    // Roll Damage button — shown for any hit or critical
    const canRollDamage = res.isHit === true || res.isCritical === true;
    const weaponId = res.weaponId ?? res.weapon?.id ?? plan?.weapon?.id ?? '';
    const critMult = res.critMultiplier ?? 2;
    const damageBtn = canRollDamage && weaponId
      ? `<button type="button" class="btn swse-roll-damage"
                 data-actor-id="${actor.id}"
                 data-weapon-id="${weaponId}"
                 data-is-crit="${res.isCritical === true}"
                 data-crit-mult="${critMult}"
                 style="margin-left:6px;padding:2px 7px;font-size:0.8em;cursor:pointer;
                        background:#1a4a2a;border:1px solid #2a7;border-radius:3px;color:#2da">
           ▸ Damage${res.isCritical ? ` ×${critMult}` : ''}
         </button>`
      : '';

    // Reaction buttons — only if there's a target with available reactions for this attack
    const rxnCtx = res.reactionContext;
    const rxnBtns = (rxnCtx?.reactions?.length && rxnCtx.defenderId)
      ? rxnCtx.reactions.map(rxn => `
          <button type="button" class="btn swse-chat-reaction-pill"
                  data-swse-reaction-key="${rxn.key}"
                  data-swse-defender-id="${rxnCtx.defenderId}"
                  data-swse-attacker-id="${actor.id}"
                  data-swse-dc="${total}"
                  data-swse-attack-total="${total}"
                  data-swse-trigger="ON_ATTACK_DECLARED"
                  style="margin-left:4px;padding:2px 7px;font-size:0.8em;cursor:pointer;
                         background:#1a2a4a;border:1px solid #48f;border-radius:3px;color:#8af">
            ${rxn.glyph ?? '↩'} ${rxn.label}
          </button>`).join('')
      : '';

    return `
      <div style="padding:4px 6px;border-bottom:1px solid #ddd">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:bold">${label}${penLine}</span>
          <span>
            <b style="font-size:1.1em">${total}</b>${defLine}
            &nbsp;<span style="color:${color};font-weight:bold">${outcome}</span>
            ${damageBtn}
          </span>
        </div>
        ${rxnBtns ? `<div style="margin-top:3px">${rxnBtns}</div>` : ''}
      </div>`;
  }).join('');

  const breakdownRows = sequence.breakdown.length
    ? `<div style="margin-top:6px;font-size:0.8em;color:#666">
         ${sequence.breakdown.map(b => `<div>• ${b}</div>`).join('')}
       </div>`
    : '';

  const content = `
    <div class="swse-full-attack-card" style="font-family:var(--font-primary,sans-serif)">
      <div style="font-size:1.05em;font-weight:bold;margin-bottom:4px">
        ${actor.name} — ${pkgLabel}
      </div>
      ${targetLine}
      <div style="border:1px solid #ccc;border-radius:4px;overflow:hidden">
        ${attackRows}
      </div>
      ${breakdownRows}
    </div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { swse: { fullAttack: true, packageType: sequence.packageType } },
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

    // 2. Spend economy (full-round by default, overridable for "Full Attack as Standard Action" talents)
    const actionType = options.actionCostOverride ?? sequence.actionType ?? 'full-round';
    const sheet = options.sheet ?? null;

    if (sheet && typeof sheet._applyActionEconomy === 'function') {
      const allowed = await sheet._applyActionEconomy(actionType, {
        source: 'full-attack-executor',
        actionId:   options.actionId   ?? 'full-attack',
        actionName: options.actionName ?? sequence.packageType,
      });
      if (!allowed) {return null;}
    }

    // 3. Resolve shared target (first token target, or null)
    const target = options.target
      ?? game.user?.targets?.first?.()?.actor
      ?? null;

    // 4. Roll each attack — suppressChat so we post one combined card
    const rollOptions = {
      suppressChat:    true,
      target,
      sourceElement:   options.sourceElement ?? null,
      sheet,
      showRollCompanion: false,
      // Carry through any preroller modifiers the caller set
      customModifier:  options.customModifier  ?? 0,
      situationalBonus: options.situationalBonus ?? 0,
      targetContext:   options.targetContext   ?? null,
    };

    const results = [];
    for (const attack of sequence.attacks) {
      try {
        const result = await rollAttack(actor, attack.weapon, {
          ...rollOptions,
          sequencePenalty: attack.finalPenalty,
        });
        if (result) {results.push(result);}
      } catch (err) {
        console.error('[FullAttackExecutor] rollAttack failed for attack:', attack.label, err);
      }
    }

    if (results.length === 0) {
      ui.notifications.warn('Full Attack: no attacks resolved.');
      return null;
    }

    // 5. Post combined chat card
    await _postCombinedCard(actor, sequence, results, target);

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

