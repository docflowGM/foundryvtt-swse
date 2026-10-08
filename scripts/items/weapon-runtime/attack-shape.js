// Phase 5D-F -- canonical attack SHAPE capability.
// "Weapons declare what they are. Abilities declare what they apply to."
// This module answers, from the SELECTED canonical form only, what attack shapes the weapon can take part in:
//   fire modes (single / autofire / Burst-Fire eligibility), multi-shot ability legality (Rapid Shot, Burst Fire, Double/Triple
//   Attack), double-weapon ends (profile-level quality or a valid host configuration), dual-wield facts (second-weapon
//   eligibility), and the proficiency-group / exotic-identity selectors that a feat choice joins against.
// Existing systems (multi-attack.js planner, full-attack-executor, CombatOptionResolver, rollAutofire) decide HOW the sequence
// executes. Pure: no actor/item mutation, no dice, no spending. Never reads a weapon name or Item-level projection.

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
import { resolveTemporalConstraints } from './fire-state.js';
export const normalizeToken = (v) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** canonical schemaFamily.proficiency -> the proficiency-group token multi-attack feats are chosen against */
const GROUP_BY_PROFICIENCY = Object.freeze({
  simple: 'simple', pistols: 'pistols', rifles: 'rifles', 'heavy-weapons': 'heavy', lightsabers: 'lightsabers',
  'advanced-melee': 'advanced-melee', exotic: 'exotic',
});

/** Token a feat choice (free text / label) names -> multi-attack group token. Mirrors the choice vocabulary, not weapon names. */
export function groupTokenFromChoice(text) {
  const t = normalizeToken(text);
  if (!t) return null;
  if (t.includes('simple')) return 'simple';
  if (t.includes('pistol')) return 'pistols';
  if (t.includes('rifle')) return 'rifles';
  if (t.includes('lightsaber')) return 'lightsabers';
  if (t.includes('heavy')) return 'heavy';
  if (t.includes('advanced')) return 'advanced-melee';
  if (t === 'exotic' || t.includes('exotic-weapon')) return 'exotic';
  return null;
}

/**
 * @param {object} runtime  resolveAttackWeaponRuntime() result (canonical)
 * @param {object} [opts]
 * @param {Function} [opts.hostAugmentations] (runtime, ctx) => resolveHostAugmentations result (supplied by attack-consumer)
 * @param {object}   [opts.context]           condition context / stored answers for host-configuration conditions
 */
export function resolveAttackShape(runtime, { hostAugmentations = null, context = {} } = {}) {
  if (runtime?.source !== 'canonical') return Object.freeze({ source: runtime?.source ?? 'legacy' });
  const def = runtime.profile.definition ?? {};
  const resolved = runtime.resolved;
  const op = resolved.operation ?? {};
  const rof = asArray(def.rateOfFire).map(String);
  const fc = def.firingConstraints ?? null;
  const modeId = resolved.selection?.modeId ?? null;

  // autofire-only: the structured constraint, or a rate of fire that lists Autofire without Single shot (rateOfFire ['A'])
  const autofireOnly = fc?.autofireOnly === true || (rof.length > 0 && rof.includes('A') && !rof.includes('S'));
  const autofire = rof.includes('A') || /autofire/i.test(String(modeId ?? '')) || autofireOnly;

  // ability prohibitions the weapon declares (structured relation PROHIBITED), keyed by ability name token
  const prohibited = asArray(resolved.abilityInteractions ?? resolved.canonicalStats?.abilityInteractions)
    .filter((a) => a?.relation === 'PROHIBITED').map((a) => normalizeToken(a.ability));
  const prohibitsMulti = fc?.prohibitsMultiShotAbilities === true;

  // double weapon: profile-level quality (native / configuration-specific profile) OR a valid host configuration
  const profileDouble = def.qualities?.doubleWeapon === true;
  let host = null;
  if (typeof hostAugmentations === 'function') {
    const augs = asArray(hostAugmentations(runtime, context));
    host = augs.find((a) => a.active && a.doubleWeapon) ?? null;
  }
  const doubleWeapon = Object.freeze({
    isDouble: profileDouble || host?.available === true,
    pending: host?.available === null,
    via: profileDouble ? 'profile' : host?.available === true ? 'host-configuration' : null,
    endId: profileDouble ? runtime.profile.id : null,
    hostEnds: host?.available === true ? Object.freeze(host.doubleWeapon.ends.map((e) => Object.freeze({ id: e.id, identityKey: e.identityKey, profileId: e.profileId }))) : null,
    hostConfigurationId: host?.configurationId ?? null,
    pendingConditions: Object.freeze(asArray(host?.pending)),
  });

  const proficiency = runtime.profile.definition?.schemaFamily?.proficiency ?? null;
  return Object.freeze({
    source: 'canonical',
    identityKey: runtime.identityKey,
    profileId: runtime.profile.id,
    configurationId: resolved.selection?.configurationId ?? null,
    branch: runtime.branch ?? null,
    groupKey: GROUP_BY_PROFICIENCY[proficiency] ?? null,
    exoticIdentity: def.schemaFamily?.exoticWeaponIdentity ?? null,
    fireModes: Object.freeze({ single: !autofireOnly, autofire, autofireOnly, burstEligible: autofire }),
    autofireUnits: Number.isFinite(def.resourceConsumption?.autofireUnits) ? def.resourceConsumption.autofireUnits : null,
    multiShot: Object.freeze({
      prohibited: prohibitsMulti,
      maxShotsPerRound: Number.isFinite(fc?.maxShotsPerRound) ? fc.maxShotsPerRound : null,
      alternatingRounds: fc?.firesOnAlternatingRounds === true,
      reloadRequiredAfterEachShot: fc?.reloadRequiredAfterEachShot === true,
      prohibitedAbilities: Object.freeze(prohibited),
      reason: prohibitsMulti ? 'firing-constraint' : null,
    }),
    doubleWeapon,
    // autofire-only brace (Core: two swift actions immediately before the attack); a braceRule may demand a stock state
    brace: Object.freeze({
      available: autofireOnly,
      actions: Object.freeze(['swift', 'swift']),
      stockRule: fc?.braceRule?.cannotBraceWhenStockNotExtended === true ? String(fc.braceRule.requiresRetractableStockState ?? 'extended') : null,
    }),
    // temporal firing constraints (families in fire-state.js); owned readiness state lives on the Item, never here
    temporal: resolveTemporalConstraints(def, op, resolved.abilityInteractions ?? resolved.canonicalStats?.abilityInteractions),
    dualWield: Object.freeze({
      eligibleAsSecondWeapon: op.eligibleAsSecondWeaponForTwoWeaponFighting === true,
      handsRemainFree: op.handsRemainFree === true,
      wornNotHeld: op.wornNotHeld === true,
    }),
  });
}

/** Is `abilityName` (feat/talent name or option id) a multi-shot ability this form cannot use? Structure-only: constraint flag or declared PROHIBITED relation. */
export function abilityProhibitedForShape(shape, abilityName, { expendsMultipleShots = false } = {}) {
  if (shape?.source !== 'canonical') return null;
  const token = normalizeToken(abilityName);
  if (token && shape.multiShot.prohibitedAbilities.includes(token)) return { prohibited: true, reason: 'ability-interaction-prohibited', ability: abilityName };
  if (expendsMultipleShots && shape.multiShot.prohibited) return { prohibited: true, reason: 'firing-constraint', ability: abilityName };
  return null;
}

/**
 * Firing-constraint legality of `attackCount` shots made with ONE weapon form in one sequence (Double/Triple Attack and other
 * multi-shot packages). Structure only: prohibitsMultiShotAbilities, maxShotsPerRound. Returns a reason string or null.
 */
export function sequenceConstraintViolation(shape, attackCount) {
  if (shape?.source !== 'canonical' || !(attackCount > 1)) return null;
  if (shape.multiShot.prohibited) return 'this weapon form prohibits abilities that expend multiple shots';
  if (shape.multiShot.maxShotsPerRound !== null && attackCount > shape.multiShot.maxShotsPerRound) return `this weapon form allows at most ${shape.multiShot.maxShotsPerRound} shot(s) per round`;
  return null;
}

/**
 * Join a feat's chosen selector to the selected canonical form: the identity (exotic weapon) or the proficiency group.
 * `choice` = { groups:Set<string>, identities:Set<string> } extracted from the feat's own choice record.
 */
export function featChoiceMatchesShape(choice, shape) {
  if (shape?.source !== 'canonical') return false;
  if (choice?.identities?.size && (choice.identities.has(shape.identityKey) || (shape.exoticIdentity && choice.identities.has(normalizeToken(shape.exoticIdentity))))) return true;
  // an exotic weapon is never matched by a bare group token: SWSE chooses exotic weapons individually (identity), not as a group
  return !!(shape.groupKey && shape.groupKey !== 'exotic' && choice?.groups?.has(shape.groupKey));
}

/** Structured selector tokens of an owned feat's choice (selectedChoice object/array/string); the feat NAME parenthetical is accepted as the legacy carrier of the same choice. */
export function featChoiceSelectors(item, { actor = null, choiceKind = null } = {}) {
  const groups = new Set(), identities = new Set();
  const sys = item?.system ?? {};
  const raw = [sys.selectedChoice, sys.selectedChoices, sys.choiceMeta?.selectedChoice, sys.choiceMeta?.choice, sys.abilityMeta?.selectedChoice].filter((x) => x != null);
  // repeatable choices live at the actor-level storage path declared by the feat's choice metadata (flags.swse.choices.<kind>)
  const stored = choiceKind ? actor?.flags?.swse?.choices?.[choiceKind] : undefined;
  if (stored != null && !raw.length) raw.push(stored);
  const visit = (v) => {
    if (v == null) return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    if (typeof v === 'string') { const g = groupTokenFromChoice(v); if (g) groups.add(g); else if (v.trim()) identities.add(normalizeToken(v)); return; }
    if (typeof v === 'object') {
      if (v.weaponIdentity) identities.add(normalizeToken(v.weaponIdentity));
      if (v.identityKey) identities.add(String(v.identityKey));
      for (const k of ['group', 'weaponGroup', 'value', 'id', 'label', 'name']) { const g = groupTokenFromChoice(v[k]); if (g) { groups.add(g); break; } }
      if (v.weapon && !v.weaponIdentity) identities.add(normalizeToken(v.weapon));
    }
  };
  raw.forEach(visit);
  // the name parenthetical is only the legacy carrier: it never overrides a structured choice
  const paren = raw.length ? null : /\(([^)]+)\)/.exec(String(item?.name ?? ''));
  if (paren) visit(paren[1]);
  return { groups, identities };
}


/** Selection ids (profile/configuration/mode/payload/end) a gate or ability evaluates against: the carried form record, overridden by explicit ids. */
export function canonicalSelectionFromContext(context = {}) {
  const form = context.weaponForm ?? context.workflowContext?.weaponForm ?? context.combatContext?.weaponForm ?? {};
  const sel = {};
  for (const k of ['profileId', 'configurationId', 'modeId', 'payloadId', 'endId']) { const v = context[k] ?? form[k]; if (v != null && v !== '') sel[k] = v; }
  const answers = context.answers ?? context.special?.answers ?? context.workflowContext?.special?.answers ?? context.combatContext?.special?.answers;
  if (answers) sel.answers = answers;
  return sel;
}
