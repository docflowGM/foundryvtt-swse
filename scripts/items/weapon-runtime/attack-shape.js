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
import { resolveAreaShape } from './area-shape.js';
import { buildWeaponDescriptor } from './weapon-descriptor.js';
import { wieldingConstraintsOf, opportunityChoices, resolveReach } from './owned-state.js';
import { evaluateCondition } from './condition-policy.js';
export const normalizeToken = (v) => String(v ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
export function resolveAttackShape(runtime, { hostAugmentations = null, context = {}, feats = null } = {}) {
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
  // conditional quality (e.g. Lightsaber Pike / Long-Handle Lightsaber become double weapons for a wielder with the unlocking ability):
  // the structured condition is evaluated by the condition policy against the wielder's ability identities
  let conditional = null;
  for (const q of asArray(resolved.conditionalQualities)) {
    if (q?.quality !== 'doubleWeapon' || q.state !== true || !q.when) continue;
    const ev = evaluateCondition(q.when, { ...context, feats: context.feats ?? feats ?? [], configurationId: resolved.selection?.configurationId ?? null, answers: context.answers });
    if (ev.value === true) { conditional = { available: true }; break; }
    if (ev.value === null) conditional = conditional ?? { available: null, pending: ev.pending };
  }
  const doubleWeapon = Object.freeze({
    isDouble: profileDouble || host?.available === true || conditional?.available === true,
    pending: host?.available === null || (conditional?.available === null && !profileDouble),
    via: profileDouble ? 'profile' : host?.available === true ? 'host-configuration' : conditional?.available === true ? 'conditional-quality' : null,
    endId: profileDouble ? runtime.profile.id : null,
    hostEnds: host?.available === true ? Object.freeze(host.doubleWeapon.ends.map((e) => Object.freeze({ id: e.id, identityKey: e.identityKey, profileId: e.profileId }))) : null,
    hostConfigurationId: host?.configurationId ?? null,
    pendingConditions: Object.freeze(asArray(host?.pending)),
  });

  const proficiency = runtime.profile.definition?.schemaFamily?.proficiency ?? null;
  const fireModes = Object.freeze({ single: !autofireOnly, autofire, autofireOnly, burstEligible: autofire });
  const areaShape = resolveAreaShape(def.area, def.attackResolution, { rateOfFire: def.rateOfFire, operation: op });
  const descriptor = buildWeaponDescriptor(resolved, def, { area: areaShape, fireModes });
  const cs = resolved.canonicalStats ?? {};
  const profileIds = asArray(cs.attackProfiles).map((p) => p.id);
  const configurationId = resolved.selection?.configurationId ?? null;
  return Object.freeze({
    // Phase 5D-I-B: facts the OWNED weapon state is read against (hands, attacks of opportunity, reach, configuration, state machine, usage, crew).
    // Pure structure of the selected form; the CURRENT state lives on the owned Item (fire-state-store), never here.
    wielding: wieldingConstraintsOf(op),
    opportunity: Object.freeze({
      branch: runtime.branch ?? null,
      isPistol: descriptor.tokens.includes('pistol'),
      isCarbine: descriptor.families.includes('blaster-carbine'),
      // the weapon's own declaration: top-level, or the mounted-on-rifle block while that configuration is selected (Vibrobayonet)
      declared: op.canMakeAttacksOfOpportunity === true || (configurationId === 'mounted-on-rifle' && op.mountedOnRifle?.canMakeAttacksOfOpportunity === true),
      choices: Object.freeze(opportunityChoices(op.attackOfOpportunityChoices, op.attackOfOpportunityProfiles, profileIds)),
    }),
    reach: resolveReach(op, { profileId: runtime.profile.id, configurationId, assembled: configurationId !== 'disassembled', extendedProfileId: asArray(cs.modeProfiles).find((m) => Number.isFinite(m?.reachBonusSquares))?.attackProfileId ?? null }),
    configuration: Object.freeze({
      id: configurationId,
      defaultId: asArray(cs.configurationStates).find((c) => c.default === true)?.id ?? null,
      transitionAction: asArray(cs.configurationStates).find((c) => c.id === configurationId)?.transitionAction ?? null,
      // a configuration that states attackUsable:false (a disassembled weapon) cannot be attacked with; null / absent = not stated
      usable: asArray(cs.configurationStates).find((c) => c.id === configurationId)?.attackUsable !== false,
      ids: Object.freeze(asArray(cs.configurationStates).map((c) => c.id)),
    }),
    machine: cs.stateMachine ?? null,
    requirements: Object.freeze(asArray(def.activationRequirements)),
    crew: Object.freeze({ regulation: op.crewRegulation ?? null, requiresSecondCrewRegulation: op.requiresSecondCrewRegulation === true, normallyRequiresTripod: op.normallyRequiresTripod === true }),
    loadedPayload: Object.freeze({ delegates: op.damageTypeAndBurstDeterminedByGrenade === true, family: cs.ammo?.acceptedPayloadFamily ?? null, excludes: op.cannotFireThermalDetonators === true ? ['weapon-thermal-detonator'] : [] }),
    descriptor,
    // Phase 5D-H: what the selected form IS, as structured tokens (ability scopes join to this, never to a name)
    // Phase 5D-I-A: the selected form's area shape (geometry + detonation timing) so attack legality can validate the player's timer choice
    area: areaShape,
    abilityRelations: Object.freeze(asArray(resolved.abilityInteractions ?? resolved.canonicalStats?.abilityInteractions).map((r) => Object.freeze({ ability: String(r?.ability ?? ''), abilityToken: normalizeToken(r?.ability), abilityType: r?.abilityType ?? null, relation: r?.relation ?? null }))),
    operation: op,
    damageTypes: Object.freeze(asArray(def.damageType?.types).map(normalizeToken)),
    stunCapability: def.stun?.capability ?? 'none',
    source: 'canonical',
    identityKey: runtime.identityKey,
    profileId: runtime.profile.id,
    configurationId: resolved.selection?.configurationId ?? null,
    branch: runtime.branch ?? null,
    groupKey: GROUP_BY_PROFICIENCY[proficiency] ?? null,
    exoticIdentity: def.schemaFamily?.exoticWeaponIdentity ?? null,
    fireModes,
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
      // Phase 5D-I-A: operation.cannotBraceWithoutTripodOrMount (Heavy Repeating Blaster): bracing needs a tripod / mount
      mountRule: op.cannotBraceWithoutTripodOrMount === true ? 'tripod-or-mount' : null,
    }),
    // Phase 5D-I-A: operation.rangeStepReductionPreparation (E-Web missile launcher): spend the structured actions before an attack to treat
    // the target's range as `steps` band(s) shorter. The cost is the structured requiredActions list, never the prose.
    // Phase 5D-I-A: operation.strengthModifierAppliesToDamage (bow, sling): the Strength modifier applies to this ranged weapon's damage
    strengthAppliesToDamage: op.strengthModifierAppliesToDamage === true,
    rangePreparation: rangePreparationOf(op),
    // Phase 5D-I-A: profiles the weapon can use underwater (Energy Lance: melee + plasma-bolt). null = the weapon declares no restriction.
    environment: Object.freeze({ underwaterUsableProfiles: Array.isArray(op.underwaterUsableProfiles) ? Object.freeze(op.underwaterUsableProfiles.map(String)) : null }),
    // Phase 5D-I-A: a persistent stun SETTING that costs an action to switch to (Shockboxing Gloves: set to stun as a swift action)
    stunSetting: stunSettingOf(def, resolved, op),
    // temporal firing constraints (families in fire-state.js); owned readiness state lives on the Item, never here
    temporal: resolveTemporalConstraints(def, op, resolved.abilityInteractions ?? resolved.canonicalStats?.abilityInteractions),
    dualWield: Object.freeze({
      eligibleAsSecondWeapon: op.eligibleAsSecondWeaponForTwoWeaponFighting === true,
      handsRemainFree: op.handsRemainFree === true,
      wornNotHeld: op.wornNotHeld === true,
    }),
  });
}

const COSTLY_ACTIONS = new Set(['swift', 'move', 'standard', 'full-round', 'full_round', 'fullround', 'reaction']);
/**
 * The stun-setting switch of the selected form. `action` is the structured stun.activation.action; `persistent` means the setting stays
 * until changed (timing 'persistent-setting'). `weaponHasSwitch` = some profile of this weapon has such a costly persistent setting, so
 * every attack with the weapon records which setting is in effect (a later stun attack is only free while the setting is still stun).
 */
function stunSettingOf(def, resolved, op) {
  const act = def?.stun?.activation ?? null;
  const costly = (a) => COSTLY_ACTIONS.has(String(a?.action ?? '').toLowerCase());
  const cs = resolved?.canonicalStats ?? {};
  const profiles = asArray(cs.attackProfiles);
  // Phase 5D-I-B: a persistent SETTING can also be an attack profile of a weapon that has other attack profiles and no timed state machine:
  //   - its mode states a switch action (modeProfiles[].switchAction; operation.configurationSwitchAction is the weapon-level copy):
  //     Interchangeable Weapon System "switches among ... modes as a standard action"; Dual-Phase Lightsaber's blade settings
  //   - or the profile's own activation is a costly action (Dual-Phase extended blade: swift)
  // A weapon with a state machine (Retrosaber) uses the machine; a special attack (Venom Spit) is its own action, not a setting.
  const noMachine = !cs.stateMachine;
  const modes = asArray(cs.modeProfiles);
  const modeOf = (p) => modes.find((m) => m?.attackProfileId === p?.id || asArray(m?.attackProfileIds).includes(p?.id)) ?? null;
  const modeAction = (p) => { const m = modes.length > 1 ? modeOf(p) : null; if (!m) return null; const a = costly({ action: m.switchAction }) ? m.switchAction : (costly({ action: op?.configurationSwitchAction }) ? op.configurationSwitchAction : null); return a; };
  const profileAction = (p) => asArray(p?.activationRequirements).find((r) => r?.type === 'action' && costly(r))?.action ?? null;
  const settingAction = (p) => (noMachine && profiles.length > 1 && (p?.kind ?? 'attack') === 'attack' && !asArray(p?.activationRequirements).some((r) => r?.type === 'usage-limit')) ? (modeAction(p) ?? profileAction(p)) : null;
  const selected = profiles.find((p) => p.id === resolved?.selection?.profileId) ?? null;
  // operation.stunSwitchAction is the weapon-level copy of the same published action; the profile activation is authoritative
  const stunPersistent = act?.timing === 'persistent-setting' && (costly(act) || COSTLY_ACTIONS.has(String(act?.action == null ? op?.stunSwitchAction ?? '' : '').toLowerCase()));
  const profileSetting = selected ? settingAction(selected) : null;
  const persistent = stunPersistent || !!profileSetting;
  const weaponHasSwitch = profiles.some((p) => (p?.stun?.activation?.timing === 'persistent-setting' && costly(p.stun.activation)) || !!settingAction(p));
  const action = stunPersistent ? String(act.action ?? op?.stunSwitchAction).toLowerCase() : profileSetting ? String(profileSetting).toLowerCase() : null;
  // a profile-based setting starts in the weapon's default mode: that profile is free until another setting has been used
  const defaultMode = modes.find((m) => m?.id === cs.operatingModes?.default) ?? null;
  const baselineProfileId = profiles.some((p) => settingAction(p)) ? (defaultMode?.attackProfileId ?? profiles[0]?.id ?? null) : null;
  return Object.freeze({ persistent, action, weaponHasSwitch, baselineProfileId });
}

function rangePreparationOf(op) {
  const rp = op?.rangeStepReductionPreparation;
  if (!rp || !Number.isInteger(rp.steps) || rp.steps < 1) return null;
  const actions = asArray(rp.requiredActions).filter((a) => a && typeof a.action === 'string' && Number.isInteger(a.count) && a.count > 0).map((a) => Object.freeze({ action: a.action, count: a.count }));
  return Object.freeze({ steps: rp.steps, stacksWithFarShot: rp.stacksWithFarShot === true, requiredActions: Object.freeze(actions), complete: actions.length > 0 });
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
