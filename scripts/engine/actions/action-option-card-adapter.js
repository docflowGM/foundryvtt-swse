/**
 * ActionOptionCardAdapter — the single conversion seam (V2 combat runtime
 * convergence, Phase 3, Blocker 2) between the Action Authority's discovery
 * output (ActionDefinition + ActionEntitlement, resolved via
 * ActorActionResolver) and ActionAvailabilityEngine's tri-state evaluation
 * on one side, and the legacy-compatible option-card view model
 * `scripts/rolls/roll-config.js`'s `optionCard()` renderer expects on the
 * other.
 *
 * This is a PURE, read-only conversion: no actor mutation, no requirement
 * evaluation of its own (delegates entirely to ActionAvailabilityEngine),
 * no roll math. It exists so a future production replacement of
 * CombatOptionResolver.getAttackOptionsWithState() has exactly ONE place
 * that translates the new authority's shape into the old dialog's
 * contract, rather than every call site re-deriving it ad hoc.
 *
 * NOT wired into roll-config.js in this round -- per explicit reviewer
 * instruction, this is presentation-shape groundwork proven by
 * tests/action-authority-presentation-reconciliation.test.mjs, not a live
 * replacement. CombatOptionResolver.getAttackOptionsWithState() remains
 * the certified, live authority for the current production dialog.
 *
 * Why the raw rule (via entitlement.configuration.rule), not the
 * ActionDefinition, supplies slider bounds/summary text: ActionDefinition
 * v1 deliberately does not model `max`/`summary` (see
 * action-definition.js's ActionDefinitionPresentation doc comment and
 * actor-action-resolver.js's correction #4 comment) -- those are
 * per-grant configuration, preserved losslessly on the entitlement
 * specifically so two sources granting the same logical action are never
 * forced to agree on content the schema doesn't canonicalize. A card is
 * therefore always built from BOTH the canonical definition (id/domain/
 * label/control -- content every grant of this action agrees on) and one
 * specific entitlement's raw rule (bounds/summary -- content a specific
 * grant supplies).
 */
import { ActionAvailabilityEngine } from '/systems/foundryvtt-swse/scripts/engine/actions/action-availability-engine.js';
import { actorBAB, camelize } from '/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js';

// V2 combat runtime convergence, Phase 3, Blocker 2 (presentation-shape
// reconciliation) found a real, previously-invisible divergence:
// ActionDefinition.id (action-definition-normalizer.js) is built with
// weapon-target-gate-classifiers.js's normalizeKey(), which produces
// KEBAB-case ("power-attack") -- a neutral, unrelated identity scheme
// chosen for the Action Authority's own registry, not for legacy
// compatibility. The live dialog's combatOptions storage keys and
// `name="combatOptions.${id}"` form fields are built by this file's own
// hydrateOption() using camelize() (normalizeKey() further reflattened to
// CAMELCASE, e.g. "powerAttack"). These are NOT the same string for any
// multi-word option id, and were never compared directly by the earlier
// state-level/entitlement reconciliation layers (which only compared "does
// state X agree", never combatOptions key identity) -- so this divergence
// would have silently orphaned every stored slider/toggle value the
// instant a caller wired this adapter's `definition.id` in as the
// combatOptions key. The card's `id` (and therefore its combatOptions
// read/write key) MUST be the legacy camelCase id, derived here from the
// SAME raw rule identifier legacy itself reads (never a fresh, potentially
// divergent identifier) -- `definition.id` remains available separately
// (see `actionId` below) for Action Authority bookkeeping only.

// ActionAvailabilityEngine's honest state vocabulary is wider than the
// legacy dialog's binary available/disabled model (see action-definition.js
// ACTION_STATES doc comment: 'external-workflow' and 'unsupported' are new,
// truthful states for gates the dialog structurally cannot evaluate at all
// -- legacy has no equivalent and simply never encodes them). This map is
// the adapter's only opinion about how to degrade those two new states
// into the old binary model: both render as a disabled card carrying
// ActionAvailabilityEngine's own reason text, since a real gate this
// dialog cannot resolve is never presentable as usable. 'hidden' has no
// entry -- callers must check for it and omit the card entirely (see
// toAttackOptionCard's doc comment below), matching legacy's own
// getAvailableAttackOptions()/getAttackOptionsWithState() omission of
// anything the actor doesn't own or that structurally cannot apply here.
const ENGINE_STATE_TO_CARD_STATE = Object.freeze({
  available: 'available',
  passive: 'available',
  disabled: 'disabled',
  'external-workflow': 'disabled',
  unsupported: 'disabled'
});

/**
 * @param {import('./action-definition.js').ActionDefinition} definition
 * @param {import('./action-definition.js').ActionEntitlement} entitlement -
 *   the specific grant this card represents (supplies rule.max/summary/
 *   etc. -- content the v1 schema does not canonicalize on the shared
 *   definition).
 * @param {object} context - forwarded verbatim to
 *   ActionAvailabilityEngine.evaluate() ({ actor, weapon, aim, charge,
 *   target|targetActor, combatOptions|attackOptions, ... })
 * @returns {object|null} a legacy-compatible option-card view model
 *   matching roll-config.js's optionCard() contract (id, label, control,
 *   summary, state, reason, disabled, checked, value/min/max/step), or
 *   `null` when ActionAvailabilityEngine reports 'hidden' -- callers must
 *   treat a null return as "omit this card," exactly as legacy silently
 *   omits an option that does not apply here.
 */
export function toAttackOptionCard(definition, entitlement, context = {}) {
  const availability = ActionAvailabilityEngine.evaluate(definition, context);
  if (availability.state === 'hidden') return null;

  const rule = entitlement?.configuration?.rule ?? {};
  const control = definition.presentation.control;
  // The legacy-compatible, camelCase presentation/storage id -- see the
  // divergence explained above. Falls back to the canonical definition id
  // only if the entitlement carries no raw rule at all (should not happen
  // for a real ATTACK_OPTION grant, but never silently produces an empty
  // combatOptions key).
  const rawIdentifier = rule.option ?? rule.id ?? rule.key ?? rule.name;
  const id = rawIdentifier ? camelize(rawIdentifier) : definition.id;
  const cardState = ENGINE_STATE_TO_CARD_STATE[availability.state] ?? 'disabled';
  const gateDisabled = cardState === 'disabled';

  const card = {
    id,
    // The Action Authority's own canonical domain-qualified identity
    // (kebab-case) -- diagnostic-only, never read by optionCard() or used
    // as a combatOptions key.
    actionId: `${definition.domain}:${definition.id}`,
    label: definition.presentation.label,
    control,
    summary: rule.summary ?? '',
    state: cardState,
    reason: gateDisabled ? availability.reason : null,
    disabled: gateDisabled,
    // Diagnostic-only, never read by optionCard(): the actual engine
    // state before this adapter's binary degradation, so a caller (or a
    // reconciliation test) can tell an honestly-unsupported/external-
    // workflow gate apart from a genuinely re-checkable disabled one.
    engineState: availability.state,
    sourceItemId: entitlement?.source?.id ?? null,
    sourceName: entitlement?.source?.name ?? null
  };

  const rawCombatOptions = context?.combatOptions ?? context?.attackOptions ?? {};

  if (control === 'slider') {
    const bab = actorBAB(context.actor);
    const ruleMax = Number(rule.max ?? rule.maximum ?? 5);
    card.min = Number(rule.min ?? 0);
    card.max = Math.max(0, Math.min(bab, Number.isFinite(ruleMax) ? ruleMax : bab));
    card.step = Number(rule.step ?? 1);
    card.value = Math.max(card.min, Math.min(Number(rawCombatOptions?.[id] ?? 0), card.max));
    // Matches hydrateOption(): a slider clamped to a 0 ceiling (BAB 0, or
    // a 0/negative rule.max) is presented disabled regardless of gate
    // state -- there is no usable range to select from.
    if (card.max <= 0) { card.disabled = true; card.state = 'disabled'; card.reason = card.reason ?? 'Not currently available'; }
  } else if (control === 'passive') {
    card.checked = true;
    card.value = 1;
  } else {
    // toggle | flag
    card.checked = Boolean(rawCombatOptions?.[id]);
  }

  return card;
}

/**
 * Convenience batch form: builds one card per definition/entitlement pair,
 * omitting `hidden` entries (see toAttackOptionCard's doc comment).
 * @param {Array<{definition: object, entitlement: object}>} entries
 * @param {object} context
 */
export function toAttackOptionCards(entries, context = {}) {
  return entries
    .map(({ definition, entitlement }) => toAttackOptionCard(definition, entitlement, context))
    .filter(Boolean);
}

export default toAttackOptionCard;
