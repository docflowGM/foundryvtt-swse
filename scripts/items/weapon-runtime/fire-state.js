// Phase 5D-G -- temporal firing state (pure).
// Canonical data says WHAT temporal restriction a weapon form has and HOW it resets; owned Item state (see
// engine/combat/fire-state-store.js) says whether THIS weapon is ready right now. Nothing here reads a name, mutates anything, or
// caches combat state: every function is (constraints, ownedState, clock, context) -> answer.
//
// Behavior families (never weapon names):
//   per-round-limit           maxShotsPerRound                         at most N shots in one round
//   cooldown                  cooldownRounds > 0                       unavailable for N rounds after firing
//   alternate-round           firesOnAlternatingRounds                 may fire only every other round (cooldown of at least 1)
//   reload-required           reloadRequiredAfterEachShot              unavailable after each shot until reloaded
//   post-shot-reset           postShotResetAction                      an action is required after each shot before the next
//   ability-triggered-reset   `*Reset.requiredActionBeforeNextShot` + PROHIBITED/TRIGGERS_*_RESET_* ability relation:
//                             firing WITH a named ability requires an action before the next shot
//   prepared-required         preparedAttack.required                  a preparation action (prime/brace) must precede the shot
//   prepared-attack           preparedAttack (optional)                a player-chosen priming action; once matured the NEXT attack gets the
//                                                                       prepared effect (extra weapon dice, resource units) and consumes it
//
// Combat clock: {combatId, round} from the active combat only. With no active combat there is no round number and none is invented:
// round-based families (per-round-limit, cooldown, alternate-round) are NOT enforced; state-based families (reload-required, resets)
// still apply because they do not depend on a clock.
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export const TEMPORAL_FAMILY = Object.freeze({
  PER_ROUND_LIMIT: 'per-round-limit', COOLDOWN: 'cooldown', ALTERNATE_ROUND: 'alternate-round', RELOAD_REQUIRED: 'reload-required',
  POST_SHOT_RESET: 'post-shot-reset', ABILITY_TRIGGERED_RESET: 'ability-triggered-reset', PREPARED_REQUIRED: 'prepared-required',
  PREPARED_ATTACK: 'prepared-attack',
});

const SIZE_ORDER = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
const sizeIndex = (s) => SIZE_ORDER.indexOf(String(s ?? '').trim().toLowerCase());

/** Classify the structured temporal mechanics of the selected form. Pure; returns a frozen list of family records. */
export function resolveTemporalConstraints(def, operation = null, abilityInteractions = []) {
  const out = [];
  const fc = def?.firingConstraints ?? null;
  if (fc) {
    const max = num(fc.maxShotsPerRound);
    if (max !== null) out.push({ family: TEMPORAL_FAMILY.PER_ROUND_LIMIT, maxShots: max });
    const cd = num(fc.cooldownRounds) ?? 0;
    if (fc.firesOnAlternatingRounds === true) out.push({ family: TEMPORAL_FAMILY.ALTERNATE_ROUND, cooldownRounds: Math.max(1, cd) });
    else if (cd > 0) out.push({ family: TEMPORAL_FAMILY.COOLDOWN, cooldownRounds: cd });
    if (fc.reloadRequiredAfterEachShot === true) out.push({ family: TEMPORAL_FAMILY.RELOAD_REQUIRED, reloadAction: fc.reloadAction ?? null });
    if (typeof fc.postShotResetAction === 'string' && fc.postShotResetAction) out.push({ family: TEMPORAL_FAMILY.POST_SHOT_RESET, action: fc.postShotResetAction });
  }
  // ability-triggered reset: the operation carries the required action; the ability relation names which ability triggers it
  const resetEntries = Object.values(operation ?? {}).filter((v) => v && typeof v === 'object' && typeof v.requiredActionBeforeNextShot === 'string');
  for (const rel of asArray(abilityInteractions)) {
    if (!/^TRIGGERS_.*RESET/.test(String(rel?.relation ?? ''))) continue;
    const entry = resetEntries[0];
    if (!entry) continue;
    out.push({ family: TEMPORAL_FAMILY.ABILITY_TRIGGERED_RESET, ability: rel.ability, action: entry.requiredActionBeforeNextShot });
  }
  const prep = def?.preparedAttack ?? null;
  // required when the data says so, or when it states what happens if the form is NOT prepared (brace: cannot fire at Medium or smaller)
  if (prep && (prep.required === true || prep.unpreparedRestriction)) {
    const costs = asArray(prep.actionCost).map(String);
    out.push({
      family: TEMPORAL_FAMILY.PREPARED_REQUIRED, preparationId: prep.id ?? 'prepare', actions: costs.length ? costs : ['swift'],
      timing: prep.timing ?? null, exemptAboveWielderSize: prep.unpreparedRestriction?.cannotFireIfWielderSizeAtMost ?? null,
    });
  }
  // optional prepared attack (Bryar "primed shot"): the player CHOOSES to prime; nothing is forced on an ordinary attack
  if (prep && !(prep.required === true || prep.unpreparedRestriction)) {
    out.push({
      family: TEMPORAL_FAMILY.PREPARED_ATTACK, preparationId: prep.id ?? 'prepared-attack', action: String(prep.activationAction ?? 'swift'),
      diceDelta: num(prep.damageDiceDelta) ?? 0, resourceUnits: num(prep.resourceUnitsOnPreparedAttack),
      prohibitsMultiShot: prep.prohibitsMultiShotAbilities === true, expires: prep.expires ?? null, matures: prep.matures ?? null,
    });
  }
  return Object.freeze(out.map((r) => Object.freeze(r)));
}

const sameCombat = (state, clock) => !!clock && !!state && state.combatId === clock.combatId;

/**
 * Is the weapon mechanically ready to fire, and which actions must be paid first?
 * @param {Array} constraints  resolveTemporalConstraints()
 * @param {object|null} state  owned fire state (flags.swse.fireState)
 * @param {{combatId:string, round:number}|null} clock  active combat clock or null
 * @param {{wielderSize?:string, triggeredAbilities?:string[]}} [ctx]
 * @returns {{ready:boolean, blockers:Array, requiredActions:Array, notes:Array}}
 */
export function evaluateReadiness(constraints, state, clock, ctx = {}) {
  const blockers = [], requiredActions = [], notes = [];
  let prepared = null;
  for (const c of asArray(constraints)) {
    switch (c.family) {
      case TEMPORAL_FAMILY.PREPARED_ATTACK: {
        // matures at the start of the wielder's next turn (a later round of the SAME combat); out of combat nothing can mature
        const p = state?.primed;
        const live = !!clock && sameCombat(state, clock) && p && p.id === c.preparationId;
        const matured = !!live && clock.round > p.round;
        prepared = { constraint: c, primed: !!live, matured };
        if (live && !matured) notes.push({ family: c.family, note: 'primed: matures at the start of your next turn' });
        break;
      }
      case TEMPORAL_FAMILY.RELOAD_REQUIRED:
        if (state?.needsReload === true) blockers.push({ family: c.family, reason: 'awaiting-reload', reloadAction: c.reloadAction ?? state.reloadAction ?? null });
        break;
      case TEMPORAL_FAMILY.COOLDOWN:
      case TEMPORAL_FAMILY.ALTERNATE_ROUND:
        if (!clock) { notes.push({ family: c.family, note: 'no-active-combat: round-based restriction not enforced' }); break; }
        if (sameCombat(state, clock) && Number.isFinite(state.unavailableThroughRound) && clock.round <= state.unavailableThroughRound) {
          blockers.push({ family: c.family, reason: 'unavailable-this-round', availableRound: state.unavailableThroughRound + 1, currentRound: clock.round });
        }
        break;
      case TEMPORAL_FAMILY.PER_ROUND_LIMIT:
        if (!clock) { notes.push({ family: c.family, note: 'no-active-combat: per-round limit not enforced' }); break; }
        if (sameCombat(state, clock) && state.lastRound === clock.round && (state.shots ?? 0) >= c.maxShots) {
          blockers.push({ family: c.family, reason: 'round-shot-limit', maxShots: c.maxShots, currentRound: clock.round });
        }
        break;
      case TEMPORAL_FAMILY.POST_SHOT_RESET:
        if (state?.resetPending && state.resetPending.family === c.family) requiredActions.push({ action: state.resetPending.action, count: 1, family: c.family, reason: 'reset-after-shot' });
        break;
      case TEMPORAL_FAMILY.ABILITY_TRIGGERED_RESET:
        if (state?.resetPending && state.resetPending.family === c.family) requiredActions.push({ action: state.resetPending.action, count: 1, family: c.family, reason: `reset-after-${state.resetPending.ability ?? 'ability'}` });
        break;
      case TEMPORAL_FAMILY.PREPARED_REQUIRED: {
        const exempt = c.exemptAboveWielderSize && sizeIndex(ctx.wielderSize) > sizeIndex(c.exemptAboveWielderSize) && sizeIndex(ctx.wielderSize) >= 0;
        if (exempt) { notes.push({ family: c.family, note: 'wielder size exempts the preparation requirement' }); break; }
        const prepared = !!clock && sameCombat(state, clock) && state?.prepared?.round === clock.round && state.prepared.id === c.preparationId;
        if (!prepared) for (const a of c.actions) requiredActions.push({ action: a, count: 1, family: c.family, reason: `prepare:${c.preparationId}`, preparationId: c.preparationId });
        break;
      }
      default: break;
    }
  }
  return { ready: blockers.length === 0, blockers, requiredActions, notes, prepared };
}

/**
 * Owned state after a shot was fired. `paid` = the requiredActions that were just spent (clears the resets/preparation they satisfy).
 * @param {{triggeredAbilities?:string[]}} ctx  normalized ability names that were active on this shot
 */
export function stateAfterFire(constraints, state, clock, ctx = {}, paid = []) {
  const next = { v: 1, ...(state ?? {}) };
  // any attack consumes the priming: a matured one is spent by the prepared shot, an unmatured one is lost by attacking early
  delete next.primed;
  const sameRound = sameCombat(state, clock) && state?.lastRound === clock?.round;
  if (clock) { next.combatId = clock.combatId; next.shots = sameRound ? (state.shots ?? 0) + 1 : 1; next.lastRound = clock.round; }
  else { next.combatId = null; next.lastRound = null; next.shots = 1; }
  const paidFamilies = new Set(asArray(paid).map((p) => p.family));
  if (paidFamilies.has(TEMPORAL_FAMILY.POST_SHOT_RESET) || paidFamilies.has(TEMPORAL_FAMILY.ABILITY_TRIGGERED_RESET)) delete next.resetPending;
  if (paidFamilies.has(TEMPORAL_FAMILY.PREPARED_REQUIRED) && clock) {
    const prep = asArray(constraints).find((c) => c.family === TEMPORAL_FAMILY.PREPARED_REQUIRED);
    next.prepared = { id: prep?.preparationId ?? 'prepare', round: clock.round };
  }
  for (const c of asArray(constraints)) {
    if ((c.family === TEMPORAL_FAMILY.COOLDOWN || c.family === TEMPORAL_FAMILY.ALTERNATE_ROUND) && clock) next.unavailableThroughRound = clock.round + c.cooldownRounds;
    if (c.family === TEMPORAL_FAMILY.RELOAD_REQUIRED) { next.needsReload = true; if (c.reloadAction) next.reloadAction = c.reloadAction; }
    if (c.family === TEMPORAL_FAMILY.POST_SHOT_RESET) next.resetPending = { family: c.family, action: c.action };
    if (c.family === TEMPORAL_FAMILY.ABILITY_TRIGGERED_RESET && asArray(ctx.triggeredAbilities).includes(String(c.ability ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-'))) {
      next.resetPending = { family: c.family, action: c.action, ability: c.ability };
    }
  }
  return next;
}

/** After a reload action: the weapon is mechanically loaded again. */
export const stateAfterReload = (state) => { const next = { v: 1, ...(state ?? {}) }; delete next.needsReload; delete next.reloadAction; return next; };

/** Can the wielder prime now? Priming is a player-chosen action; it needs the combat clock (nothing matures out of combat). */
export function evaluatePrime(constraints, state, clock) {
  const c = asArray(constraints).find((x) => x.family === TEMPORAL_FAMILY.PREPARED_ATTACK);
  if (!c) return { ok: false, reason: 'not-primable' };
  if (!clock) return { ok: false, reason: 'no-active-combat', constraint: c };
  if (sameCombat(state, clock) && state?.primed?.id === c.preparationId) return { ok: false, reason: 'already-primed', constraint: c };
  return { ok: true, constraint: c, requiredActions: [{ action: c.action, count: 1, family: c.family, reason: `prime:${c.preparationId}` }] };
}
export const statePrimed = (state, constraint, clock) => ({ v: 1, ...(state ?? {}), combatId: clock.combatId, primed: { id: constraint.preparationId, round: clock.round } });

/**
 * Autofire-only brace (Core Rulebook, Autofire-Only Weapons): braced by two swift actions immediately before the attack. A form whose
 * firingConstraints.braceRule demands a stock state cannot be braced unless that state holds (owned state `stock`; unknown = not extended).
 * Forms that are not autofire-only keep the free `braced` flag they always had.
 */
export function evaluateBrace(brace, state, ctx = {}) {
  if (!brace?.available) return { applies: false, legal: true, requiredActions: [] };
  if (brace.stockRule && state?.stock !== brace.stockRule) return { applies: true, legal: false, reason: 'stock-not-extended', requiredActions: [] };
  // Phase 5D-I-A: a tripod/mount-only brace is refused only when the weapon is KNOWN not to be mounted; an unknown mount state is `pending`
  // (the caller asks once) -- never a blanket prohibition
  if (brace.mountRule && ctx.mounted === false) return { applies: true, legal: false, reason: 'tripod-or-mount-required', requiredActions: [] };
  return { applies: true, legal: true, ...(brace.mountRule && typeof ctx.mounted !== 'boolean' ? { pending: 'mount-state' } : {}), requiredActions: brace.actions.map((a) => ({ action: a, count: 1, family: 'brace', reason: 'brace' })) };
}
