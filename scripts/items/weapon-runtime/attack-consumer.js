// Phase 5D-A -- live attack consumption of the canonical weapon runtime.
// owned weapon Item -> canonical identity -> WeaponRuntimeResolver -> ResolvedWeapon -> selected ResolvedAttackProfile
//   -> resolveProficiency() (dynamic, profile-specific) -> combat-roll-math.js#resolveAttackBonus().
// Pure and actor-independent until proficiency: nothing here mutates actors/items or spends resources, so callers can
// (and rollAttack does) resolve BEFORE any ammo/action-option cost. Fail-closed: a canonical weapon never falls back to
// name/category/description heuristics; legacy/custom items (no canonical identity) are passed through untouched.
import { WeaponRuntimeError, ERROR_CODES } from './errors.js';
import { getSharedWeaponAuthorityRegistry, getWeaponAuthorityRegistryLoadFailure } from './weapon-authority-registry.js';
import { resolveCanonicalIdentity } from './canonical-identity.js';
import { WeaponRuntimeResolver, getProfile } from './weapon-runtime-resolver.js';
import { resolveProficiency } from './proficiency-resolver.js';
import { resolveDamageProfile } from './damage-profile-resolver.js';
import { resolveCanonicalRange, assertRangeSelectionResolvable } from './canonical-range.js';
import { resolveCanonicalResourceCost } from './canonical-resource.js';
import { extractSpecialMechanics, damageShapeFromMechanics, summarizeMechanics } from './special-mechanics.js';
import { resolveAttackShape } from './attack-shape.js';
import { resolveAreaShape } from './area-shape.js';
import { abilityKeysOfActor } from './ability-selector.js';

const LEGACY = Object.freeze({ source: 'legacy' });
const SELECTION_KEYS = ['profileId', 'configurationId', 'modeId', 'payloadId', 'damageMode', 'endId'];

// The resolver is stateless (registry is immutable); one instance per registry object.
let resolverCache = { registry: null, resolver: null };
function resolverFor(registry) {
  if (resolverCache.registry !== registry) resolverCache = { registry, resolver: new WeaponRuntimeResolver(registry) };
  return resolverCache.resolver;
}

const requestedSelection = (weapon, context) => {
  const req = { weaponId: weapon?.id ?? weapon?._id ?? null };
  for (const k of SELECTION_KEYS) req[k] = context?.[k] ?? null;
  return req;
};
const sameRequest = (a, b) => !!a && !!b && a.weaponId === b.weaponId && SELECTION_KEYS.every((k) => a[k] === b[k]);

const hasCanonicalHint = (weapon) => !!(weapon?.flags?.swse?.canonicalWeapon?.identityKey
  || weapon?._stats?.compendiumSource || weapon?.flags?.core?.sourceId || weapon?.flags?.swse?.sourceId);

/**
 * Resolve the selected canonical weapon/profile for an attack.
 * - legacy/custom item (or no weapon)      -> { source: 'legacy' }
 * - canonical item                         -> { source: 'canonical', resolved, profile, branch, identityKey, requested }
 * - canonical item, bad identity/selection -> throws WeaponRuntimeError (never legacy)
 * - registry failed to load                -> throws for any item that carries a canonical hint
 * A previously resolved context.weaponRuntime is reused only when it was resolved for the same weapon + selection.
 */
export function resolveAttackWeaponRuntime(weapon, context = {}) {
  if (!weapon) return LEGACY;
  const requested = requestedSelection(weapon, context);
  const prior = context?.weaponRuntime;
  if (prior && prior.source && sameRequest(prior.requested, requested)) return prior;

  const registry = getSharedWeaponAuthorityRegistry();
  if (!registry) {
    const failure = getWeaponAuthorityRegistryLoadFailure();
    if (failure && hasCanonicalHint(weapon)) {
      throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_UNAVAILABLE, `canonical weapon registry failed to load (${failure.message}); refusing to treat ${weapon?.name ?? 'weapon'} as legacy`, { cause: failure.code });
    }
    // Never attempted (e.g. headless harness): only an explicit canonical stamp can be recognized, and it cannot be honored.
    if (weapon?.flags?.swse?.canonicalWeapon?.identityKey) {
      throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_UNAVAILABLE, 'canonical weapon registry is not loaded', { identityKey: weapon.flags.swse.canonicalWeapon.identityKey });
    }
    return LEGACY;
  }

  const id = resolveCanonicalIdentity(weapon, registry);
  if (id.kind === 'legacy') return LEGACY;
  const ctx = {};
  for (const k of SELECTION_KEYS) if (k !== 'endId' && context?.[k] != null) ctx[k] = context[k];
  let resolved = resolverFor(registry).resolveIdentity(id.identityKey, weapon, ctx, id.via);
  let resolvedIdentityKey = id.identityKey, hostIdentityKey = null, endId = null;
  if (context?.endId) {
    // Phase 5D-F: a double-weapon END resolves to its own canonical definition. The host item contributes the configuration
    // (e.g. Vibrobayonet mounted on a rifle); the end names the identity/profile that end attacks as. The state exists only
    // while the host configuration is valid -- never a global flag on the host item.
    const augs = resolverFor(registry).resolveHostAugmentations(resolved, { ...(context?.specialContext ?? {}), configurationId: resolved.selection.configurationId, answers: context?.answers });
    const end = augs.filter((a) => a.active && a.available === true).flatMap((a) => a.doubleWeapon?.ends ?? []).find((e) => e.id === context.endId);
    if (!end) {
      throw new WeaponRuntimeError(ERROR_CODES.END_UNAVAILABLE, `double-weapon end ${context.endId} is not available for ${id.identityKey} in configuration ${resolved.selection.configurationId} (host configuration not valid or its conditions are unanswered)`, { identityKey: id.identityKey, endId: context.endId, configurationId: resolved.selection.configurationId });
    }
    hostIdentityKey = id.identityKey; endId = end.id; resolvedIdentityKey = end.identityKey;
    resolved = resolverFor(registry).resolveIdentity(end.identityKey, weapon, { profileId: end.profileId, ...(context?.damageMode != null ? { damageMode: context.damageMode } : {}) }, 'host-end');
  }
  const profile = getProfile(resolved);
  // Phase 5D-D: the selected form's canonical range facet travels with the runtime (one resolution for preview + roll); a
  // profile whose branch contradicts its own range mode is refused here, never guessed.
  const range = resolveCanonicalRange(resolved, profile);
  return Object.freeze({ source: 'canonical', item: weapon, resolved, profile, branch: profile.branch ?? null, range, identityKey: resolvedIdentityKey, ...(hostIdentityKey ? { hostIdentityKey, endId } : {}), requested: Object.freeze(requested) });
}

/** Dynamic, profile-specific proficiency for a canonical runtime (delegates entirely to resolveProficiency). */
export function resolveCanonicalAttackProficiency(runtime, actor, integrations = {}) {
  if (runtime?.source !== 'canonical') throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_MISSING, 'canonical proficiency requires a canonical weapon runtime');
  return resolveProficiency(runtime.resolved, runtime.profile, actor, { proficiencyIntegrations: integrations });
}

/** Small, serializable diagnostics for resolveAttackBonus() results (never the frozen ResolvedWeapon itself). */
export function summarizeAttackRuntime(runtime, proficiency = null) {
  if (runtime?.source !== 'canonical') return { source: runtime?.source ?? 'legacy' };
  return {
    source: 'canonical', identityKey: runtime.identityKey, profileId: runtime.profile.id, branch: runtime.branch,
    range: runtime.range ? { status: runtime.range.status, family: runtime.range.family, allowedBands: [...runtime.range.allowedBands] } : null,
    proficiency: proficiency ? { proficient: proficiency.proficient, penalty: proficiency.penalty, route: proficiency.route, requiredGroup: proficiency.requiredGroup, exoticIdentity: proficiency.exoticIdentity } : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Phase 5D-C -- canonical damage consumption. The runtime says WHAT damage definition applies to the selected attack
// form (dice / fixed / payload dice, damage types, stun definition); the existing damage composition
// (combat-roll-math.js#resolveDamageComposition / buildDamageFormula) remains the only place damage is computed.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Phase 5D-E (native-stun special rule): a form whose canonical stun capability is 'native-stun' deals stun damage only --
 * the structured capability, not the weapon name, decides. Every other form keeps the caller's selection / 'normal'.
 */
export function effectiveDamageMode(runtime, requested = null) {
  if (runtime?.source !== 'canonical') return requested;
  if (runtime.profile?.definition?.stun?.capability === 'native-stun') return 'stun';
  return requested ?? runtime.resolved.selection.damageMode ?? null;
}

/** The exact canonical attack form of a resolved attack, as plain serializable data (survives chat-card transport). */
export function weaponFormRecord(runtime, damageMode = null) {
  if (runtime?.source !== 'canonical') return null;
  const sel = runtime.resolved.selection;
  const rec = { identityKey: runtime.identityKey, profileId: sel.profileId, configurationId: sel.configurationId, modeId: sel.modeId, payloadId: sel.payloadId, damageMode: effectiveDamageMode(runtime, damageMode) };
  if (runtime.endId) { rec.endId = runtime.endId; rec.hostIdentityKey = runtime.hostIdentityKey; }
  for (const k of Object.keys(rec)) if (rec[k] === null || rec[k] === undefined || rec[k] === '') delete rec[k];
  return rec;
}

const FORM_SELECTION_KEYS = ['profileId', 'configurationId', 'modeId', 'payloadId', 'endId'];

/** Selection ids for damage: the carried attack form, overridden only by ids the caller explicitly supplies. */
function damageSelectionContext(context = {}) {
  const form = context.weaponForm ?? context.workflowContext?.weaponForm ?? context.combatContext?.weaponForm ?? null;
  const ctx = {};
  if (form) for (const k of FORM_SELECTION_KEYS) if (form[k] != null) ctx[k] = form[k];
  for (const k of FORM_SELECTION_KEYS) if (context[k] != null && context[k] !== '') ctx[k] = context[k];
  // stored PROMPT answers (host-configuration conditions) travel in the workflow context; the same answers resolve the same end at damage time
  const answers = context.answers ?? context.special?.answers ?? context.workflowContext?.special?.answers ?? context.combatContext?.special?.answers;
  if (answers) ctx.answers = answers;
  return { form, ctx };
}

/** Attack-time check that the selected damage mode exists for the selected form, so nothing is spent on an attack whose damage would later be refused. */
export function assertDamageSelectionResolvable(runtime, damageMode = null) {
  if (runtime?.source !== 'canonical') return;
  const mode = effectiveDamageMode(runtime, damageMode) ?? 'normal';
  resolveDamageProfile(runtime.resolved, runtime.profile, { damageMode: mode });
}

/** Phase 5D-D: every pre-spend validation of the selected canonical form (damage mode, range band) in one place. */
export function assertAttackFormResolvable(runtime, { damageMode = null, rangeBand = null } = {}) {
  if (runtime?.source !== 'canonical') return;
  assertDamageSelectionResolvable(runtime, damageMode);
  if (runtime.range?.status === 'banded' && runtime.branch === 'ranged') assertRangeSelectionResolvable(runtime.range, rangeBand);
}

/** Canonical per-attack resource cost of the selected form (see canonical-resource.js). Pure: never mutates. */
export function resolveAttackResourceCost(runtime, { damageMode = null } = {}) {
  return runtime?.source === 'canonical' ? resolveCanonicalResourceCost(runtime, { damageMode: effectiveDamageMode(runtime, damageMode) }) : null;
}

const DICE_RE = /^\d+d\d+([+-]\d+)?$/;
function baseFormulaOf(d) {
  if (!d) return null;
  if (d.mode === 'dice' || d.mode === 'conditional') {
    if (typeof d.formula === 'string' && DICE_RE.test(d.formula.replace(/\s+/g, ''))) return d.formula.replace(/\s+/g, '');
    if (Number.isFinite(d.diceCount) && Number.isFinite(d.dieSize) && d.diceCount > 0 && d.dieSize > 0) return `${d.diceCount}d${d.dieSize}${d.flatBonus ? (d.flatBonus > 0 ? '+' : '') + d.flatBonus : ''}`;
    return null;
  }
  if (d.mode === 'fixed' && Number.isFinite(d.flatBonus)) return String(d.flatBonus);
  return null;
}

/**
 * Resolve the canonical damage definition for the attack form actually selected (carried through the workflow context)
 * or explicitly supplied. Result.status:
 *   'ordinary'  -> result.base is the damage formula the existing composition must start from
 *   'no-damage' -> the selected form deals no ordinary damage (e.g. Amphistaff Pin/Trip, Venom Spit): refuse, never invent
 *   'special'   -> payload/definition is effect-only ("Special"): refuse, effect subsystem is a later phase
 *   'deferred'  -> damage depends on a later-phase subsystem (ammunition, host weapon, unarmed modifier): the Item-level
 *                  projection remains the compatibility base (documented), canonical types/mode still apply
 * Legacy item -> { source:'legacy' }. Invalid identity/selection/damage mode/payload -> throws (never the default form).
 */
export function resolveCanonicalDamage(weapon, context = {}) {
  const { form, ctx } = damageSelectionContext(context);
  const runtime0 = resolveAttackWeaponRuntime(weapon, ctx);
  if (runtime0.source !== 'canonical') {
    if (form?.identityKey) throw new WeaponRuntimeError(ERROR_CODES.FORM_IDENTITY_MISMATCH, `attack was made with canonical ${form.identityKey} but the weapon no longer resolves canonically`, { identityKey: form.identityKey });
    return LEGACY;
  }
  if (form?.identityKey && form.identityKey !== runtime0.identityKey) {
    throw new WeaponRuntimeError(ERROR_CODES.FORM_IDENTITY_MISMATCH, `attack form belongs to ${form.identityKey} but the weapon is ${runtime0.identityKey}`, { identityKey: runtime0.identityKey, formIdentityKey: form.identityKey });
  }
  // Phase 5D-I-B: a launcher whose damage, damage type and burst are "determined by the grenade" delegates them to the LOADED canonical grenade
  const loadedKey = context.loadedIdentityKey ?? form?.loadedIdentityKey ?? null;
  if (loadedKey && runtime0.resolved.operation?.damageTypeAndBurstDeterminedByGrenade === true) return delegateLoadedPayload(runtime0, loadedKey, context, form);
  const damageMode = effectiveDamageMode(runtime0, context.damageMode ?? form?.damageMode ?? null) ?? 'normal';
  let runtime = runtime0;
  let dp = resolveDamageProfile(runtime.resolved, runtime.profile, { damageMode, damageType: context.damageType ?? null });
  // a form whose damage varies by payload with exactly one payload available has an unambiguous payload
  if (dp.components[0]?.requiresPayload && !ctx.payloadId) {
    const only = runtime.resolved.payloads;
    if (only.length === 1) {
      runtime = resolveAttackWeaponRuntime(weapon, { ...ctx, payloadId: only[0].id });
      dp = resolveDamageProfile(runtime.resolved, runtime.profile, { damageMode, damageType: context.damageType ?? null });
    } else {
      throw new WeaponRuntimeError(ERROR_CODES.PAYLOAD_REQUIRED, `${runtime.identityKey}/${runtime.profile.id} damage depends on a payload and none was selected`, { identityKey: runtime.identityKey, profileId: runtime.profile.id });
    }
  }
  const primary = dp.components[0];
  const dmg = primary?.damage ?? null;
  const dmode = dmg?.mode ?? 'none';
  const base = baseFormulaOf(dmg);
  let status = 'ordinary', reason = null;
  if (base === null) {
    if (dmode === 'none') { status = 'no-damage'; reason = 'no-damage-definition'; }
    else if (dmode === 'special') { status = 'special'; reason = 'special-effect-damage'; }
    else {
      // ammunition-dependent damage: the loaded ammunition's identity is not represented by the live single-counter ammo model
      // (and the canonical payload list is empty or textual), so the Item-level compatibility base stays -- documented, not guessed
      const src = String(runtime.resolved.canonicalStats.ammo?.damageSource ?? '');
      status = 'deferred';
      reason = (dmode === 'ammunition' || src.startsWith('loaded-ammo')) ? 'loaded-ammo-identity-unavailable' : `damage-mode:${dmode}`;
    }
  }
  const types = [...(primary?.damageTypes ?? [])];
  const selectedType = primary?.selectedDamageType ?? null;
  // Phase 5D-E: every structured special mechanic of the selected form, classified (AUTO/PROMPT/DEFER/...) by structure
  const mechanics = extractSpecialMechanics(runtime.profile.definition, {
    damageProfile: dp, operation: runtime.resolved.operation ?? null, formRefused: status === 'no-damage' || status === 'special',
    stunCapability: runtime.profile.definition?.stun?.capability ?? null, payloadEffects: dp.specialEffects, drInteraction: dp.damageReductionInteraction, abilityInteractions: runtime.resolved.abilityInteractions,
  });
  return Object.freeze({
    source: 'canonical', status, reason, base, damageMode: dp.damageMode,
    runtime, selection: weaponFormRecord(runtime, dp.damageMode),
    componentKind: primary?.kind ?? null, payloadId: dp.payloadId,
    damageTypes: Object.freeze(types), damageTypeMode: primary?.damageTypeMode ?? 'none', selectedDamageType: selectedType,
    requiresDamageTypeSelection: primary?.requiresDamageTypeSelection === true,
    specialEffects: dp.specialEffects, area: dp.area,
    // Phase 5D-G: the selected form's (payload ?? profile) attack area shape
    areaShape: resolveAreaShape(dp.area, runtime.profile.definition?.attackResolution, { rateOfFire: runtime.profile.definition?.rateOfFire, operation: runtime.resolved.operation ?? null }),
    mechanics, damageShape: damageShapeFromMechanics(mechanics),
    // what the damage path still does NOT consume (Phase 5D-E consumes multiplier, critical effects and riders)
    deferred: Object.freeze({ extraComponents: dp.components.slice(1).map((c) => c.id), damageMultiplier: dp.damageMultiplier, conditionalModifiers: dp.conditionalModifiers?.length ?? 0, criticalEffects: dp.criticalEffects?.length ?? 0 }),
  });
}

/**
 * Phase 5D-I-B: payload delegation. The launcher keeps its own identity, range, proficiency and resource cost; the damage, damage type, area
 * geometry and special effects are the LOADED grenade's own canonical profile (nothing is copied into the launcher, nothing is invented). A
 * grenade fired from a launcher "always explodes on impact regardless of timers" (Core Rulebook), so its detonation is contact.
 * The loaded identity must be a canonical weapon of the launcher's accepted payload family and not one the launcher is stated unable to fire.
 */
function delegateLoadedPayload(runtime, loadedKey, context, form) {
  const registry = getSharedWeaponAuthorityRegistry();
  const rec = registry?.getByIdentityKey?.(loadedKey);
  const family = runtime.resolved.canonicalStats?.ammo?.acceptedPayloadFamily ?? null;
  const excluded = runtime.resolved.operation?.cannotFireThermalDetonators === true ? ['weapon-thermal-detonator'] : [];
  const accepted = !!rec && !!family && (rec.selectors?.families ?? []).includes(`weapon-family:${family}`) && !excluded.includes(loadedKey);
  if (!accepted) throw new WeaponRuntimeError(ERROR_CODES.PAYLOAD_NOT_ACCEPTED, `${runtime.identityKey} cannot fire ${loadedKey}`, { identityKey: runtime.identityKey, loadedIdentityKey: loadedKey, acceptedFamily: family });
  const payloadItem = { id: `loaded-${loadedKey}`, type: 'weapon', name: loadedKey, flags: { swse: { canonicalWeapon: { identityKey: loadedKey } } }, system: {} };
  const inner = resolveCanonicalDamage(payloadItem, { weaponForm: { identityKey: loadedKey, profileId: rec.canonicalStats.attackProfiles[0].id }, damageMode: context.damageMode ?? form?.damageMode ?? null, damageType: context.damageType ?? null });
  const launcherForm = { ...weaponFormRecord(runtime, inner.damageMode), loadedIdentityKey: loadedKey };
  // Phase 5D-I-C-A: the launcher's OWN source-defined adjustment (Micro Grenade Launcher: "two fewer dice on a successful hit"). Only the dice count of the
  // delegated grenade's formula changes; nothing else of the grenade is copied or altered. A miss (hit === false) keeps the grenade's ordinary dice.
  let adjusted = inner;
  const delta = Number(runtime.resolved.operation?.payloadDamageDiceAdjustment);
  if (Number.isFinite(delta) && delta !== 0 && context.hit !== false && typeof inner.base === 'string') {
    const m = /^(\d+)d(\d+)(.*)$/.exec(inner.base.replace(/\s+/g, ''));
    if (m) {
      const dice = Number(m[1]) + delta;
      adjusted = dice >= 1
        ? { ...inner, base: `${dice}d${m[2]}${m[3]}`, payloadDiceAdjusted: Object.freeze({ delta, from: inner.base }) }
        : { ...inner, base: null, status: 'no-damage', reason: 'payload-dice-adjusted-to-zero' };
    }
  }
  return Object.freeze({
    ...adjusted, runtime, selection: launcherForm,
    delegatedFrom: Object.freeze({ launcher: runtime.identityKey, payload: loadedKey }),
    areaShape: inner.areaShape?.isArea ? Object.freeze({ ...inner.areaShape, detonation: Object.freeze({ timing: 'contact', timerRounds: null }) }) : inner.areaShape,
  });
}

export function summarizeCanonicalDamage(cd) {
  if (cd?.source !== 'canonical') return { source: cd?.source ?? 'legacy' };
  return { source: 'canonical', status: cd.status, reason: cd.reason, base: cd.base, selection: cd.selection, damageMode: cd.damageMode, damageTypes: [...cd.damageTypes], selectedDamageType: cd.selectedDamageType, payloadId: cd.payloadId, deferred: cd.deferred, mechanics: summarizeMechanics(cd.mechanics) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Phase 5D-F -- attack shape helpers. Pure, non-throwing unless noted.
// ---------------------------------------------------------------------------------------------------------------------

/** Canonical attack shape of an already-resolved runtime (host-configuration double weapons included). */
export function resolveAttackShapeFor(runtime, context = {}) {
  if (runtime?.source !== 'canonical') return Object.freeze({ source: runtime?.source ?? 'legacy' });
  const registry = getSharedWeaponAuthorityRegistry();
  return resolveAttackShape(runtime, {
    context,
    // condition context: the wielder's owned abilities by canonical identity (hasFeat conditions join on identity, not display name)
    feats: abilityKeysOfActor(runtime.item?.actor ?? context?.actor ?? null),
    hostAugmentations: (rt, ctx) => registry ? resolverFor(registry).resolveHostAugmentations(rt.resolved, { feats: abilityKeysOfActor(rt.item?.actor ?? ctx?.actor ?? null), ...ctx, configurationId: rt.resolved.selection.configurationId, answers: ctx?.answers }) : [],
  });
}

/**
 * Shape of an owned weapon for gates/planners that cannot throw. Legacy/custom weapons -> { source:'legacy' }; a canonical
 * weapon whose selection cannot be resolved -> { source:'error', error } (callers fail closed, never guess from text).
 */
export function shapeOfWeapon(weapon, context = {}) {
  try {
    const runtime = resolveAttackWeaponRuntime(weapon, context);
    return runtime.source === 'canonical' ? resolveAttackShapeFor(runtime, context) : LEGACY;
  } catch (err) {
    if (!(err instanceof WeaponRuntimeError)) throw err;
    return Object.freeze({ source: 'error', error: err });
  }
}

/** Selection record a plan entry carries so every attack of a sequence resolves the SAME canonical form. */
export function attackSelectionOf(form) {
  const out = {};
  if (!form) return out;
  for (const k of ['profileId', 'configurationId', 'modeId', 'payloadId', 'endId', 'damageMode']) if (form[k] != null) out[k] = form[k];
  return out;
}

/** Proficiency of the actor with the selected canonical form: true/false, or null for legacy weapons (callers keep their legacy read). */
export function canonicalProficiencyOf(weapon, actor, context = {}) {
  try {
    const runtime = resolveAttackWeaponRuntime(weapon, context);
    if (runtime.source !== 'canonical') return null;
    return resolveCanonicalAttackProficiency(runtime, actor).proficient === true;
  } catch (err) {
    if (!(err instanceof WeaponRuntimeError)) throw err;
    return null;
  }
}

/**
 * The ends of a canonical double weapon in its current configuration, each as a form selection:
 *   profile-level double weapon (native or configuration-specific profiles with the doubleWeapon quality) -> the profiles themselves
 *   host configuration (rifle + mounted Vibrobayonet)                                                      -> the host's ends (own identity/profile each)
 * Empty when the weapon is not a double weapon in this configuration.
 */
export function doubleWeaponEnds(weapon, context = {}) {
  let runtime;
  try { runtime = resolveAttackWeaponRuntime(weapon, context); } catch (err) { if (err instanceof WeaponRuntimeError) return []; throw err; }
  if (runtime.source !== 'canonical') return [];
  const resolved = runtime.resolved;
  const cfg = resolved.selection.configurationId;
  const profileEnds = resolved.profiles.filter((p) => p.definition?.qualities?.doubleWeapon === true && (!p.availableIn || (cfg !== null && p.availableIn.includes(cfg))));
  if (profileEnds.length >= 2) {
    return profileEnds.map((p) => ({ endId: p.id, via: 'profile', selection: { profileId: p.id, ...(cfg ? { configurationId: cfg } : {}) } }));
  }
  const shape = resolveAttackShapeFor(runtime, context);
  if (shape.doubleWeapon?.via === 'conditional-quality') {
    // the conditional quality (e.g. Long Haft Strike) turns the weapon's own melee profiles into the two ends
    const ends = resolved.profiles.filter((p) => p.definition?.schemaFamily?.branch === 'melee' && (!p.availableIn || (cfg !== null && p.availableIn.includes(cfg))));
    if (ends.length >= 2) return ends.map((p) => ({ endId: p.id, via: 'conditional-quality', selection: { profileId: p.id, ...(cfg ? { configurationId: cfg } : {}) } }));
  }
  if (shape.doubleWeapon?.via === 'host-configuration') {
    return shape.doubleWeapon.hostEnds.map((e) => ({ endId: e.id, via: 'host-configuration', identityKey: e.identityKey, selection: { profileId: runtime.profile.id, ...(cfg ? { configurationId: cfg } : {}), endId: e.id } }));
  }
  return [];
}
