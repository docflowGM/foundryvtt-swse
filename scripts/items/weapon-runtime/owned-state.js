// Phase 5D-I-B -- OWNED weapon state (pure).
// Canonical data says what a weapon CAN do; this module says what to do with the facts about what state the weapon is CURRENTLY in.
// The persisted record is the one owned-state authority that already exists (`flags.swse.fireState` on the owned Item, written by
// FireStateStore through ActorEngine) -- these functions only read/transform that record; nothing here touches an Item, an actor, the
// registry, chat or dice. Nothing mutable is ever stored in the canonical registry.
//
// Owned-state fields (all optional; only what RAW or a player choice requires):
//   wielded        'one-handed' | 'two-handed'              the player's current hands choice (never inferred from weapon size)
//   mounted        boolean                                   on a tripod / mount / rifle host
//   stock          'extended' | 'retracted'                  retractable stock (5D-H)
//   configurationId  string                                  current configuration (Amphistaff quarterstaff / spear / whip ...)
//   settingProfile string                                    persistent setting currently in effect (stun setting, extended blade) (5D-I-A)
//   machine        { state, since, combatId }                timed state machine position (Retrosaber normal / overcharge / burnout)
//   usage          { [ledgerKey]: { uses: [{ at }] } }       usage-limit ledger (Venom Spit once per 24 standard hours)
//   crew           { regulation: { combatId, round, value } } crew adjudication for the current combat round
//   loadedIdentityKey  string                                canonical identity of the loaded payload (grenade launcher)
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);

export const WIELDED = Object.freeze({ ONE: 'one-handed', TWO: 'two-handed' });
export const STOCK = Object.freeze({ EXTENDED: 'extended', RETRACTED: 'retracted' });

/** Shallow patch of an owned-state record (v stays 1). */
export const patchOwnedState = (state, patch) => ({ v: 1, ...(state ?? {}), ...patch });

// ---------------------------------------------------------------------------------------------------------------------------------
// Wielding (hands)
// ---------------------------------------------------------------------------------------------------------------------------------
/** The structured wielding constraints of a canonical weapon, read from its operation block. */
export function wieldingConstraintsOf(operation) {
  const op = operation ?? {};
  return Object.freeze({
    requiresTwoHands: op.requiresTwoHands === true,
    cannotWieldTwoHanded: op.cannotWieldTwoHanded === true || op.cannotBeWieldedTwoHanded === true,
  });
}

/**
 * The hands the wielder is ACTUALLY using for this attack.
 *   explicit attack option (1 | 2 | 'one-handed' | 'two-handed')  >  owned state  >  a weapon that requires two hands  >  unknown
 * Weapon size never decides the current state; canonical data only CONSTRAINS what is legal.
 * @returns {{hands:1|2|undefined, source:'option'|'state'|'required'|null, legal:boolean, reason?:string, constraints:object}}
 */
export function resolveWielding(constraints, { option, state } = {}) {
  const c = constraints ?? { requiresTwoHands: false, cannotWieldTwoHanded: false };
  const parse = (v) => (v === 2 || v === '2' || v === WIELDED.TWO ? 2 : v === 1 || v === '1' || v === WIELDED.ONE ? 1 : undefined);
  let hands, source = null;
  if (parse(option) !== undefined) { hands = parse(option); source = 'option'; }
  else if (parse(state?.wielded) !== undefined) { hands = parse(state.wielded); source = 'state'; }
  else if (c.requiresTwoHands) { hands = 2; source = 'required'; }
  if (c.cannotWieldTwoHanded && hands === 2) return { hands, source, legal: false, reason: 'cannot-wield-two-handed', constraints: c };
  if (c.requiresTwoHands && hands === 1) return { hands, source, legal: false, reason: 'requires-two-hands', constraints: c };
  return { hands, source, legal: true, constraints: c };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Threat / attacks of opportunity (Core Rulebook: Attacks of Opportunity, Threatened Squares)
// ---------------------------------------------------------------------------------------------------------------------------------
/**
 * Core Rulebook: "You can only make attacks of opportunity with melee weapons, natural weapons, pistols, carbines, and any weapon
 * with a folded stock" (and unarmed with Martial Arts I). A weapon's own declaration (Siang Lance) widens it.
 * @param {{branch?:string, isNatural?:boolean, isUnarmed?:boolean, isPistol?:boolean, isCarbine?:boolean, stock?:string, declared?:boolean, hasMartialArtsI?:boolean}} f
 */
export function resolveOpportunityEligibility(f = {}) {
  if (f.isUnarmed) return f.hasMartialArtsI === true ? { eligible: true, via: 'unarmed-martial-arts-i' } : { eligible: false, reason: 'unarmed-requires-martial-arts-i' };
  if (f.branch === 'melee') return { eligible: true, via: 'melee-weapon' };
  if (f.isNatural) return { eligible: true, via: 'natural-weapon' };
  if (f.isPistol) return { eligible: true, via: 'pistol' };
  if (f.isCarbine) return { eligible: true, via: 'carbine' };
  if (f.stock === STOCK.RETRACTED) return { eligible: true, via: 'folded-stock' };
  if (f.declared === true) return { eligible: true, via: 'weapon-declared' };
  return { eligible: false, reason: 'weapon-cannot-make-attacks-of-opportunity' };
}

/**
 * The attack-of-opportunity choices a weapon declares (Siang Lance), mapped to the profile each choice makes.
 * `choices` = operation.attackOfOpportunityChoices, `profiles` = operation.attackOfOpportunityProfiles ({choice: profileId}).
 * A choice with no mapped (existing) profile is NOT offered (never guessed from names).
 */
export function opportunityChoices(choices, profiles, profileIds) {
  const ids = new Set(asArray(profileIds));
  return asArray(choices).map((c) => ({ choice: String(c), profileId: profiles?.[c] ?? null })).filter((x) => x.profileId && ids.has(x.profileId));
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Reach
// ---------------------------------------------------------------------------------------------------------------------------------
/**
 * Reach of the SELECTED form (squares added to / replacing the ordinary adjacent threat). Structured operation keys only:
 *   reachBonusSquares / reachIncreaseSquares   weapon-wide wielder reach +N (the two keys echo the same fact: the larger one, never summed)
 *   reachSquares (+ reachProfileIds)           absolute reach of a whip-like form; restricted to the listed profiles when present
 *   extendedReachBonusSquares                  reach bonus of an extended setting (applies only while the extended profile is selected)
 * `extendedProfileId` names the profile the extended setting selects (the profile whose activation is the setting switch).
 * @returns {{bonusSquares:number, absoluteSquares:number|null, sources:string[]}}
 */
export function resolveReach(operation, { profileId = null, extendedProfileId = null, configurationId = null, assembled = true } = {}) {
  const op = operation ?? {};
  const sources = [];
  const wide = Math.max(num(op.reachBonusSquares) ?? 0, num(op.reachIncreaseSquares) ?? 0);
  let bonus = 0;
  if (wide > 0 && assembled) { bonus = Math.max(bonus, wide); sources.push(num(op.reachBonusSquares) !== null ? 'reachBonusSquares' : 'reachIncreaseSquares'); }
  const ext = num(op.extendedReachBonusSquares);
  if (ext && extendedProfileId && profileId === extendedProfileId) { bonus = Math.max(bonus, ext); sources.push('extendedReachBonusSquares'); }
  let absolute = null;
  const abs = num(op.reachSquares);
  if (abs !== null) {
    const listed = asArray(op.reachProfileIds);
    if (!listed.length || (profileId !== null && listed.includes(profileId)) || (configurationId !== null && listed.includes(configurationId))) { absolute = abs; sources.push('reachSquares'); }
  }
  return Object.freeze({ bonusSquares: bonus, absoluteSquares: absolute, sources });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Timed state machine (Retrosaber: normal -> overcharge -> burnout -> normal)
// ---------------------------------------------------------------------------------------------------------------------------------
// Duration vocabulary of the certified `stateMachine.transitions[].duration` tokens, in combat ROUNDS counted from the round the state
// was entered (round granularity -- the combat clock is a round counter): the wielder dials up in round r; "until the end of the
// wielder's next turn" covers rounds r and r+1; the following "one-round" burnout is round r+2; the weapon is normal again from r+3.
export const DURATION_ROUNDS = Object.freeze({ 'until-end-of-wielder-next-turn': 2, 'one-round': 1 });

const transitionsInto = (sm, to) => asArray(sm?.transitions).find((t) => t.to === to);
const forcedOut = (sm, from) => asArray(sm?.transitions).find((t) => t.from === from && t.forced === true);

/**
 * Current state of a certified state machine at `clock`, from the persisted position. No clock (no active combat) or a position from
 * another combat -> the initial state (nothing is invented outside combat).
 * @returns {{state:string, enteredAt:number|null, expired:boolean}}
 */
export function currentMachineState(sm, machine, clock) {
  const initial = sm?.initialState ?? null;
  if (!sm || !machine || !clock || machine.combatId !== clock.combatId || !Number.isFinite(machine.since)) return { state: initial, enteredAt: null, expired: !!machine };
  let state = machine.state, enteredAt = machine.since;
  for (let guard = 0; guard < 8; guard += 1) {
    const out = forcedOut(sm, state);
    if (!out) break;
    const dur = DURATION_ROUNDS[transitionsInto(sm, state)?.duration];
    if (!Number.isInteger(dur) || clock.round < enteredAt + dur) break;
    enteredAt += dur; state = out.to;
  }
  return { state, enteredAt, expired: false };
}

/** Is a player transition `from -> to` legal (declared, not forced, not locked by the current state)? */
export function machineTransitionAllowed(sm, from, to) {
  const locked = asArray(sm?.locks).some((l) => l.state === from && asArray(l.prohibits).includes(`transition-to-${to}`));
  if (locked) return { allowed: false, reason: 'locked' };
  const t = asArray(sm?.transitions).find((x) => x.from === from && x.to === to && x.forced !== true);
  return t ? { allowed: true, transition: t } : { allowed: false, reason: 'no-such-transition' };
}

/** The persisted machine position after a player transition at `clock` (null clock -> not persisted). */
export const machineAfterTransition = (to, clock) => (clock ? { state: to, since: clock.round, combatId: clock.combatId } : null);

// ---------------------------------------------------------------------------------------------------------------------------------
// Usage-limit ledger (Venom Spit: once per 24 standard hours)
// ---------------------------------------------------------------------------------------------------------------------------------
/** Window in seconds of a structured `per` token (`N-standard-hours`); null = a period this ledger cannot measure. */
export function usagePeriodSeconds(per) {
  const m = /^(\d+)-standard-hours$/.exec(String(per ?? ''));
  return m ? Number(m[1]) * 3600 : null;
}

/**
 * Is the use available? `worldTime` is the campaign clock in seconds (Foundry game.time.worldTime) or null when the system has none.
 * Without a campaign clock the period cannot be measured, so a recorded use stays used until a GM/manual reset (never approximated).
 * @returns {{available:boolean, reason?:'used'|'manual-reset-required', usedAt?:number|null, resetsAt?:number|null}}
 */
export function evaluateUsage(req, ledger, { worldTime = null } = {}) {
  const limit = num(req?.uses) ?? 1;
  const window = usagePeriodSeconds(req?.per);
  const uses = asArray(ledger?.uses);
  if (window === null || !Number.isFinite(worldTime)) {
    return uses.length >= limit ? { available: false, reason: 'manual-reset-required', usedAt: uses.at(-1)?.at ?? null, resetsAt: null } : { available: true };
  }
  const inWindow = uses.filter((u) => Number.isFinite(u.at) && u.at > worldTime - window);
  if (inWindow.length < limit) return { available: true };
  const oldest = Math.min(...inWindow.map((u) => u.at));
  return { available: false, reason: 'used', usedAt: inWindow.at(-1).at, resetsAt: oldest + window };
}

/** The ledger after recording a use. Old uses outside the measurable window are dropped. */
export function recordUsage(req, ledger, { worldTime = null } = {}) {
  const window = usagePeriodSeconds(req?.per);
  const keep = asArray(ledger?.uses).filter((u) => window !== null && Number.isFinite(worldTime) && Number.isFinite(u.at) && u.at > worldTime - window);
  return { uses: [...keep, { at: Number.isFinite(worldTime) ? worldTime : null }] };
}

/** Stable ledger key of a usage-limit requirement of a profile. */
export const usageKey = (profileId, req) => `${profileId}:${req?.per ?? 'unlimited'}`;

// ---------------------------------------------------------------------------------------------------------------------------------
// Crew adjudication for the current combat round
// ---------------------------------------------------------------------------------------------------------------------------------
/** The stored regulation answer if it is still valid for this combat round (a different round / combat / no clock -> undefined: ask again). */
export function crewRegulationFor(state, clock) {
  const r = state?.crew?.regulation;
  if (!r || !clock || r.combatId !== clock.combatId || r.round !== clock.round || typeof r.value !== 'boolean') return undefined;
  return r.value;
}
export const crewRegulationRecord = (value, clock) => (clock ? { combatId: clock.combatId, round: clock.round, value: value === true } : null);
