/**
 * full-attack-card-renderer.js — pure HTML rendering for a combined Full
 * Attack chat card (Phase 5 rolling-system alignment).
 *
 * Deliberately has no dependency on attacks.js or
 * meta-resource-feat-resolver.js: both full-attack-executor.js (posts the
 * initial card) and meta-resource-feat-resolver.js (re-renders after a
 * per-attack reroll) import this module, so it must not import either of
 * them back — doing so would create an import cycle
 * (meta-resource-feat-resolver.js -> X -> attacks.js -> meta-resource-feat-resolver.js,
 * since attacks.js already imports MetaResourceFeatResolver). Only depends
 * on the message-state schema helpers and the zero-dependency workflow
 * context serializer.
 *
 * Renders exclusively from already-resolved, stored data (an attack
 * entry's active revision) — never recalculates attack math, hit/critical
 * state, or totals. This is what "chat consumes resolved data rather than
 * reconstructing it" means in practice: the SAME function renders a row at
 * initial post time and after a reroll, so there is exactly one place that
 * turns stored state into markup.
 */

import { encodeCombatWorkflowContext, summarizeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";
import { getActiveRevision } from "/systems/foundryvtt-swse/scripts/engine/combat/full-attack-message-state.js";
import { FULL_ATTACK_PACKAGES } from "/systems/foundryvtt-swse/scripts/combat/multi-attack.js";

function _packageLabel(packageType) {
  return {
    [FULL_ATTACK_PACKAGES.NORMAL]:        'Full Attack',
    [FULL_ATTACK_PACKAGES.DOUBLE_ATTACK]: 'Double Attack',
    [FULL_ATTACK_PACKAGES.TRIPLE_ATTACK]: 'Triple Attack',
    [FULL_ATTACK_PACKAGES.TWO_WEAPON]:    'Two-Weapon Attack',
    [FULL_ATTACK_PACKAGES.DOUBLE_WEAPON]: 'Double-Weapon Attack',
  }[packageType] ?? 'Full Attack';
}

// Both take a revision's stored `outcome` shape ({hit, critical, ...}).
function _outcomeLabel(outcome) {
  if (outcome?.critical) {return 'Critical Hit';}
  if (outcome?.hit === true) {return 'Hit';}
  if (outcome?.hit === false) {return 'Miss';}
  return '—';
}

function _outcomeColor(outcome) {
  if (outcome?.critical) {return '#c70;';}
  if (outcome?.hit === true) {return '#2a7;';}
  if (outcome?.hit === false) {return '#a33;';}
  return '#666;';
}

/**
 * Render one attack row purely from its stored authoritative state (the
 * entry's active revision) — used both when the combined card is first
 * posted and when it is re-rendered after a reroll, so a rerolled row is
 * built by the exact same code as the original row, not a second,
 * drifting copy of it. Never recalculates attack math; every value here
 * (total, hit/critical, ledger) is read from `entry`/`revision`, not
 * recomputed.
 *
 * Reaction buttons are intentionally NOT reproduced on re-render: a
 * reaction window is tied to the original declared-attack event, and
 * `res.reactionContext` carries live Actor references that must not be
 * persisted to message flags anyway (see full-attack-message-state.js's
 * schema comments) — they are shown once, at initial declaration, and
 * omitted from any later re-render of that row.
 *
 * @param {Actor} actor
 * @param {Object} entry - one attack entry ({revisions, activeRevision, ...}).
 * @param {Object} [rxnCtx] - optional, only supplied at initial-post time.
 */
function renderFullAttackRow(actor, entry, rxnCtx = null) {
  const revision = getActiveRevision(entry);
  const total = revision?.rollResult?.total ?? '?';
  const outcomeLabel = _outcomeLabel(revision?.outcome);
  const color = _outcomeColor(revision?.outcome);
  const targetDefense = revision?.outcome?.targetDefense;
  const defLine = targetDefense != null ? ` vs Reflex ${targetDefense}` : '';
  const penLine = entry.penaltyText ? `<span style="color:#888;font-size:0.8em"> ${entry.penaltyText}</span>` : '';

  const weapon = entry.weaponUuid && typeof fromUuidSync === 'function' ? fromUuidSync(entry.weaponUuid) : null;
  const target = entry.targetUuid && typeof fromUuidSync === 'function' ? fromUuidSync(entry.targetUuid) : null;
  const isHit = revision?.outcome?.hit === true;
  const isCritical = revision?.outcome?.critical === true;
  const canRollDamage = isHit || isCritical;
  const weaponId = weapon?.id ?? entry.weaponUuid ?? '';
  const critMult = revision?.outcome?.critMultiplier ?? 2;
  const storedWorkflowContext = revision?.damageContext?.workflowContext ?? null;
  const workflowSummary = summarizeCombatWorkflowContext(storedWorkflowContext, {
    actor,
    weapon,
    target,
    targetId: target?.id ?? null,
    targetName: target?.name ?? entry.targetName ?? null,
    isCritical,
    critMultiplier: critMult,
    hit: revision?.outcome?.hit ?? null,
    natural1: Number(revision?.rollResult?.naturalD20) === 1,
    natural20: Number(revision?.rollResult?.naturalD20) === 20
  }) ?? {};
  const workflowAttack = workflowSummary.attack ?? {};
  const workflowDamage = workflowSummary.damage ?? {};
  const workflowResources = workflowSummary.resources ?? {};
  const workflowTags = Array.isArray(workflowSummary.contextTags) ? workflowSummary.contextTags.join('|') : '';
  const workflowContextEncoded = encodeCombatWorkflowContext(storedWorkflowContext, {
    actor,
    weapon,
    target,
    targetId: target?.id ?? null,
    targetName: target?.name ?? entry.targetName ?? null,
    isCritical,
    critMultiplier: critMult,
    hit: revision?.outcome?.hit ?? null
  });
  const damageBtn = canRollDamage && weaponId
    ? `<button type="button" class="btn swse-roll-damage"
               data-actor-id="${actor.id}"
               data-weapon-id="${weaponId}"
               data-target="${target?.id ?? ''}"
               data-workflow-id="${workflowSummary.workflowId ?? ''}"
               data-action-id="${workflowSummary.actionId ?? ''}"
               data-attack-mode="${workflowAttack.mode ?? ''}"
               data-context-tags="${workflowTags}"
               data-hit="${workflowDamage.hit ?? ''}"
               data-natural-1="${workflowDamage.natural1 === true}"
               data-natural-20="${workflowDamage.natural20 === true}"
               data-area-attack="${workflowAttack.isArea === true}"
               data-burst-fire="${workflowAttack.isBurstFire === true}"
               data-autofire="${workflowAttack.isAutofire === true}"
               data-stun="${workflowAttack.isStun === true}"
               data-ion="${workflowAttack.isIon === true}"
               data-ammo-cost="${Number(workflowResources.ammoCost ?? 0) || 0}"
               data-workflow-context="${workflowContextEncoded}"
               data-is-crit="${isCritical}"
               data-crit-mult="${critMult}"
               data-attack-instance-id="${entry.attackInstanceId}"
               data-expected-revision="${entry.activeRevision}"
               style="margin-left:6px;padding:2px 7px;font-size:0.8em;cursor:pointer;
                      background:#1a4a2a;border:1px solid #2a7;border-radius:3px;color:#2da">
         ▸ Damage${isCritical ? ` ×${critMult}` : ''}
       </button>`
    : '';

  // Reroll button — only when this attack has at least one eligible,
  // still-usable reroll option (the SAME eligibility list rollAttack()
  // already computed via MetaResourceFeatResolver.buildAttackRerollChatOptions
  // for the single-attack path; nothing new is invented here). Absent
  // entirely (not merely disabled) when no rule grants a reroll, per
  // "do not add a universal player reroll merely because the chat card
  // can support one."
  const rerollOptions = Array.isArray(entry.attackRerollOptions) ? entry.attackRerollOptions : [];
  const rerollBtns = rerollOptions.map(opt => `
      <button type="button" class="btn swse-full-attack-reroll-btn"
              data-actor-id="${actor.id}"
              data-weapon-id="${weaponId}"
              data-sequence-id="${entry.sequenceId ?? ''}"
              data-attack-instance-id="${entry.attackInstanceId}"
              data-expected-revision="${entry.activeRevision}"
              data-rule-id="${opt.id ?? ''}"
              data-source-id="${opt.sourceId ?? ''}"
              data-source-name="${opt.sourceName ?? ''}"
              data-cost="${opt.cost ?? 'forcePoint'}"
              data-outcome="${opt.outcome ?? ''}"
              data-once-per="${opt.rule?.oncePer ?? ''}"
              data-original-total="${total}"
              data-original-natural-d20="${revision?.rollResult?.naturalD20 ?? ''}"
              data-target-defense="${targetDefense ?? ''}"
              data-critical-threshold="${entry.criticalThreshold ?? 20}"
              data-crit-multiplier="${critMult}"
              data-formula="${opt.formula ?? revision?.rollResult?.formula ?? '1d20'}"
              style="margin-left:6px;padding:2px 7px;font-size:0.8em;cursor:pointer;
                     background:#2a1a4a;border:1px solid #96f;border-radius:3px;color:#c9f">
        ⟲ ${opt.label ?? 'Reroll'}
      </button>`).join('');

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

  // Revision history: original result is still shown (concise, not
  // recalculated) whenever the active revision isn't revision 0.
  const historyLine = entry.activeRevision > 0
    ? `<div style="font-size:0.75em;color:#888;margin-top:2px">Rerolled (revision ${entry.activeRevision}) — original: ${entry.revisions[0]?.rollResult?.total ?? '?'}</div>`
    : '';

  return `
    <div class="swse-full-attack-row" data-attack-instance-id="${entry.attackInstanceId}" style="padding:4px 6px;border-bottom:1px solid #ddd">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:bold">${entry.label}${penLine}</span>
        <span>
          <b style="font-size:1.1em">${total}</b>${defLine}
          &nbsp;<span style="color:${color};font-weight:bold">${outcomeLabel}</span>
          ${damageBtn}${rerollBtns}
        </span>
      </div>
      ${historyLine}
      ${rxnBtns ? `<div style="margin-top:3px">${rxnBtns}</div>` : ''}
    </div>`;
}

/**
 * Render the whole combined card's content from stored attack entries —
 * used at initial post AND at reroll-re-render time. Never reconstructs
 * attack math; only formats already-resolved values.
 */
export function renderFullAttackCardContent(actor, target, packageType, attackEntries, breakdown = [], reactionContextsByAttackInstanceId = null) {
  const pkgLabel = _packageLabel(packageType);
  const targetLine = target
    ? `<div style="font-size:0.85em;color:#555;margin-bottom:6px">Target: <b>${target.name}</b></div>`
    : '';
  const attackRows = attackEntries
    .map(entry => renderFullAttackRow(actor, entry, reactionContextsByAttackInstanceId?.get?.(entry.attackInstanceId) ?? null))
    .join('');
  const breakdownRows = breakdown.length
    ? `<div style="margin-top:6px;font-size:0.8em;color:#666">
         ${breakdown.map(b => `<div>• ${b}</div>`).join('')}
       </div>`
    : '';

  return `
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
}
