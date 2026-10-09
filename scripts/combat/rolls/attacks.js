import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ReactionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js";
import { mergeCombatWorkflowContextIntoRollOptions, summarizeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";
import { resolveDamagePacketType } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";
import { AmmoSystem } from "/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js";
import { prepareCoreAttackOptionRollContext, spendCoreAttackOptionCosts } from "/systems/foundryvtt-swse/scripts/engine/feats/core-attack-option-action-economy.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { damageContextForReaction, damageTypesFromContext } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";
// Canonical roll math — both this file and weapons-engine.js delegate here so
// tooltips/breakdowns always reflect the same formula as actual rolls.
import {
  resolveAttackBonus,
  resolveDamageComposition,
  buildDamageFormula,
  resolveCriticalMultiplier,
  getTargetActorFromOptions
} from "/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js";
import { rollDamage as canonicalRollDamage } from "/systems/foundryvtt-swse/scripts/combat/rolls/damage.js";
import { isAreaAttack } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { AttackOutcomeResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-outcome-resolver.js";
import { buildLedgerFromComponents, buildInvocationLedgerEntry, buildModifierLedger } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/modifier-breakdown-builder.js";
import { ModifierUtils } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js";
import { AttackRollDiagnostics } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-roll-diagnostics.js";
import { resolveVehicleAttackBonus, resolveAbstractCrewAttackBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/vehicle-attack-math.js";
import { resolveAttackDomain } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-domain-router.js";
import { GrappleStateEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { normalizeRangeBand } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/canonical-range.js";
import { SIZE_RANK } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/condition-policy.js";
import { WeaponRuntimeError, ERROR_CODES, reportWeaponRuntimeError } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/errors.js";
import { FireStateStore } from "/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js";
import { summarizeAreaShape, validateDetonationTimer } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/area-shape.js";
import { abilityProhibitedForShape } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-shape.js";
import { resolveWielding, resolveOpportunityEligibility, crewRegulationFor } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/owned-state.js";
import { evaluateProfileRequirements, forgoesDoubleStrength, slugOfIdentity } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/activation-requirements.js";
import { abilityKeysOfActor } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/ability-selector.js";
import { resolveAttackWeaponRuntime, assertAttackFormResolvable, resolveAttackResourceCost, weaponFormRecord, resolveCanonicalDamage, effectiveDamageMode, resolveAttackShapeFor, resolveCanonicalAttackProficiency, attackSelectionOf, shapeOfWeapon } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-consumer.js";
import { passiveDefenseAdjustment, resolveDisarmProtection } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-weapon-context.js";
import { rangeGate, grabAttackPenalty } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/control-rules.js";
import { resolveAttackStageModifiers, evaluateAttackOutcomeSpecials, summarizeMechanics, alternateDefenseOf, canonicalSizeName, resolveTargetRequirements, askSpecialQuestion, thresholdAdjustmentOf, targetRulesOf, isEffectOnlyForm } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/special-mechanics.js";
import { createModifier, ModifierType, ModifierSource } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";

// ============================================
// FILE: rolls/attacks.js (Upgraded for SWSE v13+)
// - Uses new Active Effects engine
// - Uses updated Actor data model
// - Integrates CT penalties, attack penalties, cover, etc.
// - Performance optimized, fail-safe, RAW-accurate
//
// Attack/damage bonus math lives in combat-roll-math.js (resolveAttackBonus /
// resolveDamageBonus). weapons-engine.js calls the same resolvers for
// tooltips, so breakdowns and rolls always agree.
// ============================================

function hasFightingDefensivelyEffect(actor) {
  return Array.from(actor?.effects ?? []).some(effect => effect?.flags?.swse?.combatAction === 'fighting-defensively');
}

/**
 * Math Integrity Freeze, Attack Bonus round (blocker fix): the single
 * shared seam for "what is this attack's actual bonus, and its full
 * contribution ledger" — domain routing (character/vehicle-gunner/
 * abstract-crew), the baseline resolver call, and every invocation-only
 * addition (Fighting Defensively, Grabbed/Grappled, custom modifier,
 * situational bonus, multi/full-attack sequence penalty). rollAttack()
 * below and the attack dialog's live preview
 * (attack-dialog-combat-corrections-hotfix.js#syncAttackDialogBase) both
 * call this SAME function so a displayed preview can never diverge from
 * what actually gets rolled — no second, independently-maintained
 * approximation of this composition may exist anywhere else. Pure/no side
 * effects (no ammo spend, no action-economy cost, no roll) so it is safe
 * to call from a dialog's live input/change handler on every keystroke.
 *
 * @returns {Promise<{ok:true, atkBonus:number, attackDomain:string, isVehicleAttack:boolean, attackBonusResolution:Object, attackComponentLedger:Array, sequencePenalty:number, fightingDefensivelyPenalty:number, grappleStatePenalty:number} | {ok:false, reason:string, domainResolution:Object, attackBonusResolution?:Object}>}
 */
export async function computeFinalAttackComposition(actor, weapon, rollOptions = {}) {
  // Phase 5D-A: resolve the canonical weapon/selected profile ONCE here so the live preview and the real roll feed the
  // identical runtime (profile branch + dynamic proficiency) into resolveAttackBonus(). A canonical identity/selection
  // error fails closed (ok:false); legacy/custom weapons pass through untouched.
  // Phase 5D-I-B: an attack that names no configuration / profile uses the state the OWNED weapon is in (the weapon remembers it)
  rollOptions = FireStateStore.applyOwnedSelection(actor, weapon, rollOptions);
  const canonical = withCanonicalWeaponRuntime(weapon, rollOptions);
  if (canonical.error) return { ok: false, reason: 'weapon-runtime-error', weaponRuntimeError: canonical.error };
  rollOptions = canonical.rollOptions;
  const domainResolution = resolveAttackDomain({
    actor,
    item: weapon,
    operator: rollOptions.operator ?? null,
    vehicle: rollOptions.vehicleActor ?? null,
    sourceContext: { vehicleActor: rollOptions.vehicleActor ?? null, abstractCrewQuality: rollOptions.abstractCrewQuality ?? null }
  });
  for (const warning of domainResolution.warnings ?? []) {
    console.warn(`[SWSE] Attack domain routing: ${warning}`);
  }
  if (!domainResolution.ok) {
    return { ok: false, reason: domainResolution.reason, domainResolution };
  }
  const attackDomain = domainResolution.domain;
  const isVehicleAttack = attackDomain !== 'character';
  let attackBonusResolution;
  if (attackDomain === 'vehicle-actor-gunner') {
    const { gunnerActor, vehicleActor } = domainResolution.normalizedContext;
    attackBonusResolution = await resolveVehicleAttackBonus(gunnerActor, vehicleActor, weapon, rollOptions);
  } else if (attackDomain === 'vehicle-abstract-crew') {
    const { vehicleActor, crewQuality } = domainResolution.normalizedContext;
    attackBonusResolution = await resolveAbstractCrewAttackBonus(vehicleActor, weapon, crewQuality, rollOptions);
  } else {
    attackBonusResolution = resolveAttackBonus(actor, weapon, null, rollOptions);
  }
  if (isVehicleAttack) {
    for (const warning of attackBonusResolution.warnings ?? []) {
      console.warn(`[SWSE] Vehicle attack formula (${attackDomain}): ${warning}`);
    }
    if (attackBonusResolution.error) {
      return { ok: false, reason: attackBonusResolution.error, domainResolution, attackBonusResolution };
    }
  }
  const sequencePenalty = Number(rollOptions.sequencePenalty ?? 0);
  const fightingDefensivelyPenalty = getFightingDefensivelyAttackPenalty(actor, rollOptions);
  // SWSE RAW: -2 on attack rolls while Grabbed/Grappled, except attacks
  // with natural or light weapons (Pinned is excluded -- its attacks are
  // already prevented by Pin's own action legality, not merely penalized).
  // See the Grapple domain section of
  // docs/audits/v2-math-integrity-authority-ledger.md, addendum 8.
  const grappleStatePenalty = GrappleStateEngine.getAttackPenalty(actor, weapon);
  // Math Integrity Freeze, Attack Bonus round 3 (blocker fix): for a
  // CHARACTER attack, contextual tactical contributions (Charge, Flanking --
  // rollOptions.situationalContributions, built by roll-config.js#
  // computeAttackSituationalContext) are now resolved INSIDE
  // combat-roll-math.js#resolveAttackBonus(), together with every other
  // typed/collision-eligible attack contribution (Basic Effect Intent, a
  // typed combat-option contribution such as Relentless Attack) in ONE
  // shared ModifierUtils.resolveStacking() pass -- see that function's own
  // doc comment for the full cross-channel rationale. Re-resolving and
  // re-adding them here would double-count them, since
  // attackBonusResolution.total already includes their resolved
  // contribution. vehicle-attack-math.js's resolvers were NOT part of that
  // unification (vehicle attack formula is a separate, already-certified
  // authority, out of this round's scope) and never consume
  // situationalContributions at all, so a vehicle gunner attack's Charge/
  // Flanking contributions must still be resolved and added here, exactly
  // as before this round.
  const situationalContributions = Array.isArray(rollOptions.situationalContributions) ? rollOptions.situationalContributions : [];
  const situationalDetail = isVehicleAttack
    ? ModifierUtils.getModifierDetail(situationalContributions, 'global.attack')
    : { total: 0, applied: [], breakdown: [] };
  const suppressedSituational = isVehicleAttack
    ? situationalContributions
        .filter(mod => mod && mod.enabled !== false && !situationalDetail.applied.includes(mod))
        .map(modifier => ({ modifier, reason: `suppressed: another ${modifier.type} contribution already applies (highestOnly stacking)` }))
    : [];
  // Legacy compatibility path: a caller that still passes a raw numeric
  // rollOptions.situationalBonus (instead of typed situationalContributions)
  // is honored as an explicit untyped override, kept separate from the typed
  // contributions above rather than treated as their primary semantic source.
  const legacySituationalBonus = Number(rollOptions.situationalBonus || 0);
  const atkBonus = attackBonusResolution.total + fightingDefensivelyPenalty + grappleStatePenalty + Number(rollOptions.customModifier || 0) + situationalDetail.total + legacySituationalBonus + sequencePenalty;
  // Component ledger: baseline (resolver) components plus invocation-only
  // additions, clearly separated so a tooltip never claims an invocation-only
  // modifier is part of the static weapon baseline. Vehicle attacks already
  // arrive in full ledger shape from the vehicle resolvers; character
  // attacks are adapted from the legacy {label: value} map, plus the typed
  // attack-modifier ledger resolveAttackBonus() already built.
  const attackLedgerDomain = isVehicleAttack ? 'vehicle.attack' : 'combat.attack';
  const attackComponentLedger = [
    ...(isVehicleAttack ? attackBonusResolution.ledger : buildLedgerFromComponents(attackBonusResolution.components, 'combat.attack', 'baseline')),
    buildInvocationLedgerEntry('fighting-defensively', 'Fighting Defensively', fightingDefensivelyPenalty, attackLedgerDomain),
    buildInvocationLedgerEntry('grapple-state-penalty', 'Grabbed/Grappled', grappleStatePenalty, attackLedgerDomain),
    buildInvocationLedgerEntry('custom-modifier', 'Custom Modifier', rollOptions.customModifier, attackLedgerDomain),
    ...(isVehicleAttack ? buildModifierLedger(situationalDetail.applied, suppressedSituational, attackLedgerDomain) : (attackBonusResolution.typedModifierLedger ?? [])),
    buildInvocationLedgerEntry('situational-bonus', 'Situational Bonus (legacy)', legacySituationalBonus, attackLedgerDomain),
    buildInvocationLedgerEntry('sequence-penalty', 'Sequence Penalty', sequencePenalty, attackLedgerDomain)
  ].filter(Boolean);

  // Phase 5D-G: non-mutating readiness of the selected form (cooldown / reload / reset / preparation) for previews
  const readiness = FireStateStore.previewReadiness(actor, weapon, rollOptions.weaponRuntime, rollOptions);
  return { ok: true, atkBonus, attackDomain, isVehicleAttack, attackBonusResolution, attackComponentLedger, sequencePenalty, fightingDefensivelyPenalty, grappleStatePenalty, domainResolution, readiness };
}

/**
 * Phase 5D-I-B: a weapon that declares attack-of-opportunity CHOICES (Siang Lance: a ranged shot or its bayonet) makes the wielder pick one when
 * the attack is an attack of opportunity. The choice names the attack profile it makes (structured map on the weapon); the selected profile is
 * what the whole workflow uses afterwards -- nothing is rebuilt later from Item defaults. An unnamed choice is asked once; an unanswered one refuses.
 */
async function resolveOpportunityChoice(weapon, rollOptions) {
  if (rollOptions.attackOfOpportunity !== true) return { rollOptions };
  let shape;
  try { shape = shapeOfWeapon(weapon, attackSelectionOf(rollOptions)); } catch { return { rollOptions }; }
  const choices = shape.source === 'canonical' ? shape.opportunity.choices : [];
  if (!choices.length) return { rollOptions };
  let picked = choices.find((c) => c.choice === rollOptions.aooChoice) ?? choices.find((c) => c.profileId === rollOptions.profileId);
  if (!picked) {
    const alternate = choices[1] ?? choices[0];
    const ans = await askSpecialQuestion({ id: 'aoo-choice', family: 'opportunity-choice', question: `Make this attack of opportunity with the ${alternate.choice.replace(/-/g, ' ')}? (no: ${choices[0].choice.replace(/-/g, ' ')})` });
    if (ans !== true && ans !== false) return { rollOptions, refusal: 'choose which attack to make as the attack of opportunity.' };
    picked = ans === true ? alternate : choices[0];
  }
  return { rollOptions: { ...rollOptions, profileId: picked.profileId, aooChoice: picked.choice } };
}

/**
 * Phase 5D-A: pure canonical weapon/profile resolution for an attack. Legacy/custom weapons return the options untouched;
 * a canonical weapon returns options carrying the resolved weaponRuntime and the selected profile's branch as attackType.
 * A canonical identity/selection error is returned (never thrown, never a legacy fallback) so callers fail closed.
 */
function withCanonicalWeaponRuntime(weapon, rollOptions) {
  try {
    const weaponRuntime = resolveAttackWeaponRuntime(weapon, rollOptions);
    if (weaponRuntime.source !== 'canonical') return { rollOptions };
    // Phase 5D-C/5D-D: refuse before any cost if the selected damage mode or range band does not exist for the selected form
    // Phase 5D-E: a native-stun form deals stun damage only (structured stun capability) -- the effective mode is what is
    // validated, costed, recorded in the carried form and tagged on the workflow context
    const damageMode = effectiveDamageMode(weaponRuntime, rollOptions.damageMode ?? null);
    assertAttackFormResolvable(weaponRuntime, { damageMode: damageMode ?? null, rangeBand: rollOptions.rangeBand ?? null });
    // Phase 5D-D: the selected form's canonical per-attack resource units feed the existing AmmoSystem cost rule (read-only here;
    // spending still happens exactly once, in AmmoSystem.spendForWorkflow). 'pending' leaves the existing rule untouched.
    // Phase 5D-F: attack-shape legality of the selected form (firing constraints / fire modes) -- refused BEFORE any cost is spent
    const shape = resolveAttackShapeFor(weaponRuntime, rollOptions);
    assertAttackShapeLegal(shape, rollOptions);
    const resource = resolveAttackResourceCost(weaponRuntime, { damageMode: damageMode ?? null });
    const canonicalAmmoUnits = resource && resource.status !== 'pending' ? resource.units : undefined;
    return { rollOptions: { ...rollOptions, ...(damageMode === 'stun' ? { damageMode } : {}), weaponRuntime, canonicalResource: resource, canonicalAutofireUnits: shape.autofireUnits ?? undefined, ...(canonicalAmmoUnits !== undefined ? { canonicalAmmoUnits } : {}), ...(weaponRuntime.branch ? { attackType: weaponRuntime.branch } : {}) } };
  } catch (err) {
    if (!(err instanceof WeaponRuntimeError)) throw err;
    return { error: err };
  }
}

/**
 * Phase 5D-E: attack-stage special mechanics of the selected canonical form. Pure resolution + at most one stored answer per
 * PROMPT mechanic (answers ride in the workflow context and are never re-asked). Observable conditions (target size) are
 * evaluated automatically and fed into the EXISTING typed-modifier pipeline as situational contributions.
 * Legacy/custom weapons: untouched.
 */
async function prepareCanonicalSpecialMechanics(weapon, rollOptions, actor = weapon?.actor ?? null) {
  const runtime = rollOptions.weaponRuntime;
  if (runtime?.source !== 'canonical') return { rollOptions, mechanics: [], answers: {}, unresolved: [], areaShape: null };
  let cd = null;
  // Phase 5D-I-B: a payload-delegating launcher fires the LOADED canonical grenade (explicit choice, else the owned loaded identity)
  const loadedIdentityKey = rollOptions.loadedIdentityKey ?? FireStateStore.readFireState(weapon)?.loadedIdentityKey ?? undefined;
  try {
    cd = resolveCanonicalDamage(weapon, { weaponForm: { ...weaponFormRecord(runtime, rollOptions.damageMode ?? null), ...(loadedIdentityKey ? { loadedIdentityKey } : {}) }, damageMode: rollOptions.damageMode ?? null, weaponRuntime: runtime });
  } catch (err) {
    if (!(err instanceof WeaponRuntimeError)) throw err;
    if (err.code === ERROR_CODES.PAYLOAD_NOT_ACCEPTED) return { rollOptions, mechanics: [], answers: {}, unresolved: [], refusal: { reason: 'payload-not-accepted', failed: [`loaded payload: ${loadedIdentityKey}`] } };
    return { rollOptions, mechanics: [], answers: {}, unresolved: [] }; // form-level errors are reported by the existing validators
  }
  const mechanics = cd.mechanics ?? [];
  const carried = rollOptions.special?.answers ?? rollOptions.workflowContext?.special?.answers ?? {};
  const target = getTargetActorFromOptions(rollOptions);
  // Phase 5D-F: the multi-attack abilities actually in use on THIS attack (sequence package + active Rapid Shot/Strike option)
  const activeUses = [];
  if (rollOptions.packageType === 'doubleAttack') activeUses.push('double-attack');
  if (rollOptions.packageType === 'tripleAttack') activeUses.push('triple-attack');
  if (optionActive(rollOptions, 'rapidShot')) activeUses.push('rapid-shot');
  if (optionActive(rollOptions, 'rapidStrike')) activeUses.push('rapid-strike');
  // Phase 5D-I-B: what the OWNED weapon state already says (hands, mount, this round's crew adjudication) -- read once, never rediscovered later
  const shape = resolveAttackShapeFor(runtime, rollOptions);
  const owned = FireStateStore.readFireState(weapon) ?? {};
  const wield = resolveWielding(shape.wielding, { option: rollOptions.wieldedHands, state: owned });
  const ownedFacts = { wieldedHands: wield.hands, mounted: typeof owned.mounted === 'boolean' ? owned.mounted : undefined, crewRegulated: FireStateStore.storedCrewRegulation(actor, weapon) };
  const stage = await resolveAttackStageModifiers(mechanics, { targetSize: target?.system?.size ?? null, answers: carried, activeUses, attackContext: buildAttackConditionContext(actor, target, rollOptions, ownedFacts) });
  if (typeof stage.answers['fact:crewRegulated'] === 'boolean' && carried['fact:crewRegulated'] === undefined) await FireStateStore.recordCrewRegulation(actor, weapon, stage.answers['fact:crewRegulated']);
  if (stage.unresolved.length) ui?.notifications?.warn?.(`${weapon?.name ?? 'Weapon'}: ${stage.unresolved.length} conditional attack modifier(s) could not be evaluated and were not applied (GM adjudication).`);
  // Phase 5D-I-A: target eligibility from the selected profile's structured activation requirements. Only a definite "no" refuses (before any
  // cost); an unobserved fact is asked once and stored with the other special answers.
  const targetReqs = runtime.profile?.definition?.activationRequirements ?? [];
  let refusal = null;
  const targetContext = (() => { const c = buildAttackConditionContext(actor, target, rollOptions); const t = String(target?.type ?? ''); const disp = rollOptions.targetDisposition ?? ((n) => (n === -1 ? 'hostile' : n === 1 ? 'friendly' : n === 0 ? 'neutral' : undefined))(target?.token?.disposition ?? target?.prototypeToken?.disposition);
    return { ...c, ...(disp ? { targetDisposition: disp } : {}), ...(['character', 'npc', 'droid'].includes(t) ? { targetType: 'character' } : t === 'vehicle' ? { targetType: 'vehicle' } : {}) }; })();
  let answersWithTarget = { ...stage.answers };
  let tr = resolveTargetRequirements(targetReqs, { context: targetContext, answers: answersWithTarget });
  for (const e of tr.evaluated.filter((x) => x.result === null)) {
    const ans = await askSpecialQuestion({ id: e.prompt, family: 'target-requirement', question: `Does this attack meet the target requirement "${e.condition.replace(/[-_]/g, ' ')}"?` });
    if (ans === true || ans === false) answersWithTarget[e.prompt] = ans;
  }
  tr = resolveTargetRequirements(targetReqs, { context: targetContext, answers: answersWithTarget });
  if (!tr.legal) refusal = { reason: 'target-requirement-not-met', failed: tr.evaluated.filter((e) => e.result === false).map((e) => e.condition) };
  else if (tr.evaluated.some((e) => e.result === null)) stage.unresolved.push(...tr.evaluated.filter((e) => e.result === null).map((e) => ({ id: e.prompt, family: 'target-requirement', reason: 'condition-not-observable-and-unanswered' })));
  // Phase 5D-I-B: owned-state legality of the selected form, resolved in the documented order and BEFORE any cost:
  //   hands -> attack-of-opportunity eligibility -> tripod / mount -> the profile's remaining activation requirements (feat identity,
  //   proficiency, wielding, choice, operators). Only a definite "no" refuses; an unobserved fact is asked once and stored.
  const refuseOnce = (reason, failed) => { refusal ??= { reason, failed: [].concat(failed) }; };
  if (!wield.legal) refuseOnce('wielding', `wielding: ${wield.reason}`);
  if (rollOptions.attackOfOpportunity === true) {
    const keys = abilityKeysOfActor(actor);
    const eligibility = resolveOpportunityEligibility({ ...shape.opportunity, stock: owned.stock, isNatural: false, isUnarmed: false, hasMartialArtsI: keys.includes('martial-arts-i') });
    if (!eligibility.eligible) refuseOnce('attack-of-opportunity', `attack of opportunity: ${eligibility.reason}`);
  }
  if (shape.crew?.normallyRequiresTripod) {
    let mountedNow = typeof rollOptions.mounted === 'boolean' ? rollOptions.mounted : (typeof owned.mounted === 'boolean' ? owned.mounted : undefined);
    if (mountedNow === undefined) {
      const ans = await askSpecialQuestion({ id: 'requirement:mounted', family: 'activation-requirement', question: `Is ${weapon?.name ?? 'the weapon'} mounted on a tripod? (it can normally be fired only when mounted)` });
      if (ans === true || ans === false) { mountedNow = ans; await FireStateStore.setMounted(actor, weapon, ans); }
    }
    if (mountedNow === false) refuseOnce('tripod-required', 'mount: tripod-required');
  }
  const abilityKeys = abilityKeysOfActor(actor);
  const proficientNow = (() => { try { return resolveCanonicalAttackProficiency(runtime, actor).proficient === true; } catch { return false; } })();
  const requirementCtx = () => ({ hands: wield.hands, aoo: rollOptions.attackOfOpportunity === true, proficient: proficientNow, abilityKeys, operators: Number.isFinite(Number(rollOptions.operators)) ? Number(rollOptions.operators) : undefined, answers: answersWithTarget });
  let reqs = evaluateProfileRequirements(targetReqs, requirementCtx());
  for (const e of reqs.evaluated.filter((x) => x.result === null && x.prompt)) {
    const ans = await askSpecialQuestion({ id: e.prompt, family: 'activation-requirement', question: e.question });
    if (ans === true || ans === false) answersWithTarget[e.prompt] = ans;
  }
  reqs = evaluateProfileRequirements(targetReqs, requirementCtx());
  if (!reqs.legal) refuseOnce('activation-requirement-not-met', reqs.evaluated.filter((e) => e.result === false).map((e) => `${e.type}: ${e.key}`));
  else for (const e of reqs.evaluated.filter((x) => x.result === null)) stage.unresolved.push({ id: e.prompt ?? `${e.type}:${e.key}`, family: 'activation-requirement', reason: e.detail ?? 'condition-not-observable-and-unanswered' });
  // Phase 5D-I-C-B: weapon CONTROL gates, resolved before any cost (a definite "no" refuses; nothing is guessed):
  //   weapon lock  -- a weapon holding a target (Shock Whip) cannot attack anything else
  //   range gate   -- a ranged grab weapon with a maximum grab range (Snare Pistol / Rifle: Short) refuses a longer band
  //   grab penalty -- an attack the weapon declares is treated as a grab (Garrote) takes the grab attack penalty (Grabber / Entangler by canonical identity)
  const controlMech = mechanics.find((m) => m.family === 'grab-grapple' && m.declaration);
  if (controlMech) {
    const decl = controlMech.declaration;
    if (decl.lockWeapon) {
      const { weaponLockFor } = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapon-control-effects.js');
      const lock = weaponLockFor(actor, weapon, target?.id ?? null);
      if (lock.locked) refuseOnce('weapon-locked', 'weapon: holding another target');
    }
    if (decl.grab?.ranged && decl.grab.maxBand && rollOptions.rangeBand) {
      const g = rangeGate(decl, normalizeRangeBand(rollOptions.rangeBand));
      if (!g.ok) refuseOnce('beyond-maximum-grab-range', `range: ${g.reason}`);
    }
    if (decl.treatedAs?.attack === 'grab' && decl.grab && !decl.grab.noGrabPenalty) {
      stage.contributions.push({ id: 'grab-attack-penalty', value: grabAttackPenalty(abilityKeysOfActor(actor)), how: 'weapon-control' });
    }
  }
  const ownedExtras = {
    ...(wield.hands ? { wieldedHands: wield.hands } : {}),
    ...(rollOptions.attackOfOpportunity === true ? { opportunity: { choice: rollOptions.aooChoice ?? undefined, profileId: runtime.profile.id } } : {}),
    ...(forgoesDoubleStrength(targetReqs) ? { forgoDoubleStrength: true } : {}),
    ...(shape.reach && (shape.reach.bonusSquares > 0 || shape.reach.absoluteSquares !== null) ? { reach: { bonusSquares: shape.reach.bonusSquares, ...(shape.reach.absoluteSquares !== null ? { absoluteSquares: shape.reach.absoluteSquares } : {}) } } : {}),
  };
  stage.answers = answersWithTarget;
  // Phase 5D-G: the selected form's (payload ?? profile) area shape drives the EXISTING area rules: attack.isArea, the miss rule
  // (half damage) and the no-critical-doubling rule read the workflow context, so the canonical shape is what sets them
  // Phase 5D-I-A: the thrower's chosen detonation timer rides in the carried area shape so every affected target / the later damage
  // roll sees the same detonation (a contact-detonated form ignores any timer)
  const timerChoice = validateDetonationTimer(cd.areaShape?.detonation, rollOptions.detonationTimer);
  const areaShape = cd.areaShape && timerChoice.rounds !== null && timerChoice.rounds !== undefined
    ? Object.freeze({ ...cd.areaShape, detonation: Object.freeze({ ...cd.areaShape.detonation, chosenRounds: timerChoice.rounds }) })
    : cd.areaShape;
  let nextOptions = rollOptions;
  if (areaShape?.isArea) {
    nextOptions = { ...nextOptions, isAreaAttack: true, areaAttack: true, ruleData: { ...(nextOptions.ruleData ?? {}), areaAttack: true, ...(areaShape.halfDamageOnMiss ? { halfDamageOnMiss: true } : {}) } };
  }
  if (stage.contributions.length) {
    const contributions = stage.contributions.map((c) => createModifier({
      source: ModifierSource.ITEM, sourceId: c.id, sourceName: `${weapon?.name ?? 'Weapon'} (${c.id})`,
      target: 'global.attack', type: ModifierType.UNTYPED, value: c.value
    }));
    nextOptions = { ...nextOptions, situationalContributions: [...(Array.isArray(nextOptions.situationalContributions) ? nextOptions.situationalContributions : []), ...contributions] };
  }
  return { rollOptions: nextOptions, mechanics, answers: stage.answers, unresolved: stage.unresolved, drIgnore: stage.drIgnore, areaShape, refusal, ownedExtras, loadedIdentityKey: cd.delegatedFrom ? loadedIdentityKey : undefined };
}

/**
 * Phase 5D-I-A: the facts of THIS attack that condition-policy conditions read. Only OBSERVED facts are present: an absent key means
 * "not observed" (never "false"), so the condition is asked once as a stored PROMPT instead of being silently decided.
 * Observable: fire mode, range band, explicit aim / brace / mounted / wielding / adjacency choices of the attack, the attacker's
 * Strength score and size, the target's size, an attack of opportunity.
 */
export function buildAttackConditionContext(actor, target, rollOptions = {}, extras = {}) {
  const ctx = {};
  const fm = rollOptions.fireMode;
  const autofire = rollOptions.autofire === true || rollOptions.attackMode === 'autofire' || fm === 'autofire' || fm === 'burst' || optionActive(rollOptions, 'burstFire');
  ctx.fireMode = autofire ? 'autofire' : 'single';
  const band = normalizeRangeBand(rollOptions.rangeBand);
  if (band) ctx.rangeBand = band;
  const aim = rollOptions.aim ?? rollOptions.isAiming ?? rollOptions.aimed;
  if (typeof aim === 'boolean') ctx.aimedBeforeAttack = aim;
  if (typeof rollOptions.braced === 'boolean') ctx.braced = rollOptions.braced;
  if (typeof rollOptions.mounted === 'boolean') ctx.mounted = rollOptions.mounted;
  if (typeof rollOptions.crewRegulated === 'boolean') ctx.crewRegulated = rollOptions.crewRegulated;
  if (Number.isFinite(Number(rollOptions.wieldedHands))) ctx.wieldedHands = Number(rollOptions.wieldedHands);
  // Phase 5D-I-B: facts the OWNED weapon state observes (mounted, hands, this round's crew adjudication) fill what the attack did not state
  for (const [k, v] of Object.entries(extras)) if (v !== undefined && ctx[k] === undefined) ctx[k] = v;
  if (rollOptions.adjacent === true || rollOptions.distance === 'adjacent') ctx.distance = 'adjacent';
  else if (rollOptions.adjacent === false || (typeof rollOptions.distance === 'string' && rollOptions.distance)) ctx.distance = rollOptions.distance ?? 'not-adjacent';
  ctx.events = rollOptions.attackOfOpportunity === true ? ['attack-of-opportunity'] : [];
  // Strength is observed only when the actor actually carries ability data (getAbilityScore answers 10 for an actor with none)
  const hasStr = actor?.system?.derived?.attributes?.str?.total !== undefined || actor?.system?.attributes?.str !== undefined || actor?.system?.abilities?.str !== undefined;
  const str = hasStr ? Number(SchemaAdapters.getAbilityScore?.(actor, 'str')) : NaN;
  if (Number.isFinite(str) && str > 0) ctx.actorStr = str;
  const size = canonicalSizeName(actor?.system?.size);
  if (size) { ctx.actorSize = size; ctx.actorSizeRank = SIZE_RANK[size]; }
  const tSize = canonicalSizeName(target?.system?.size);
  if (tSize) ctx.targetSizeRank = SIZE_RANK[tSize];
  return ctx;
}

/**
 * Phase 5D-I-C-C: the TARGET-side defense stage of an attack, resolved BEFORE any cost:
 *   disarm  -- a held weapon that cannot be disarmed / dropped refuses the disarm attack categorically; a disarm-defense equipment bonus raises Reflex
 *   passive -- a held weapon whose persistent setting imposes a Reflex penalty against ADJACENT attackers (Dual-Phase, extended blade)
 * Never mutates the target. An unobserved adjacency is asked once; an unanswered fact applies nothing (never read as true).
 * @returns {Promise<{refusal?:{reason:string,detail:string}, rollOptions:object}>}
 */
async function resolveTargetSideDefense(actor, weapon, rollOptions) {
  const target = getTargetActorFromOptions(rollOptions);
  if (!target) return { rollOptions };
  let adjustment = 0;
  const maneuver = String(rollOptions.maneuver ?? rollOptions.actionId ?? '').trim().toLowerCase();
  if (maneuver === 'disarm') {
    const ask = async (id, question) => askSpecialQuestion({ id, family: 'disarm-target', question });
    const d = await resolveDisarmProtection(target, { itemId: rollOptions.disarmItemId ?? null, ask });
    if (d.refused) return { refusal: { reason: 'disarm-refused', detail: String(d.reason).replace(/-/g, ' ') }, rollOptions };
    adjustment += d.defenseBonus;
    if (d.unresolved.length) ui?.notifications?.warn?.(`${weapon?.name ?? 'Weapon'}: which item the disarm is aimed at was not stated; its protections were not applied (GM adjudication).`);
  }
  const defenseKey = normalizeDefenseKey(rollOptions.targetContext?.defenseType ?? 'reflex');
  if (defenseKey === 'reflex') {
    const adjacent = rollOptions.adjacent === true || rollOptions.distance === 'adjacent' ? true : (rollOptions.adjacent === false || (typeof rollOptions.distance === 'string' && rollOptions.distance)) ? false : null;
    let passive = passiveDefenseAdjustment(target, { defenseType: 'reflex', attackerAdjacent: adjacent });
    if (passive.applies === null) {
      const ans = await askSpecialQuestion({ id: `passive-defense:adjacent:${target.id ?? ''}`, family: 'passive-defense', question: `Is ${actor?.name ?? 'the attacker'} adjacent to ${target.name ?? 'the target'}? (its extended blade imposes a Reflex Defense penalty against adjacent attackers)` });
      if (ans === true || ans === false) passive = passiveDefenseAdjustment(target, { defenseType: 'reflex', attackerAdjacent: ans });
      else ui?.notifications?.warn?.(`${target.name ?? 'Target'}: whether the attacker is adjacent was not stated; the contextual Reflex penalty was not applied.`);
    }
    adjustment += passive.adjustment;
  }
  return { rollOptions: adjustment ? { ...rollOptions, passiveDefenseAdjustment: adjustment } : rollOptions };
}

/**
 * Phase 5D-I-A: attack-stage special mechanics for a caller that composes its own attack (Autofire). Returns the situational
 * contributions the existing typed-modifier pipeline folds into computeFinalAttackComposition() -- the same objects rollAttack builds.
 */
export async function resolveCanonicalAttackStage(actor, weapon, rollOptions = {}) {
  const canonical = withCanonicalWeaponRuntime(weapon, rollOptions);
  if (canonical.error) return { situationalContributions: undefined, answers: {}, unresolved: [] };
  const stage = await prepareCanonicalSpecialMechanics(weapon, canonical.rollOptions, actor);
  return { situationalContributions: stage.rollOptions.situationalContributions, answers: stage.answers ?? {}, unresolved: stage.unresolved ?? [], areaShape: stage.areaShape ?? null, refusal: stage.refusal ?? null };
}

const SHAPE_OPTION_ABILITIES = Object.freeze({ rapidShot: 'Rapid Shot', burstFire: 'Burst Fire' });
const optionActive = (rollOptions, id) => { const v = (rollOptions.combatOptions ?? rollOptions.attackOptions ?? {})[id]; return !!v && v !== '0' && v !== 0; };

/**
 * Phase 5D-F: structured firing constraints / fire modes of the selected canonical form decide whether this attack SHAPE is legal.
 *   - Rapid Shot / Burst Fire (abilities that expend multiple shots) on a form that prohibits them (constraint or declared PROHIBITED)
 *   - Burst Fire on a form that cannot autofire
 *   - a normal single attack on an autofire-only form
 * Throws a WeaponRuntimeError; rollAttack's existing canonical error path refuses before any ammunition/action cost.
 */
function assertAttackShapeLegal(shape, rollOptions) {
  if (shape?.source !== 'canonical') return;
  const burst = optionActive(rollOptions, 'burstFire');
  const autofireMode = rollOptions.autofire === true || rollOptions.attackMode === 'autofire' || rollOptions.fireMode === 'autofire' || burst;
  for (const [id, ability] of Object.entries(SHAPE_OPTION_ABILITIES)) {
    if (!optionActive(rollOptions, id)) continue;
    const bad = abilityProhibitedForShape(shape, ability, { expendsMultipleShots: true });
    if (bad) throw new WeaponRuntimeError(ERROR_CODES.ATTACK_SHAPE_ILLEGAL, `${ability} cannot be used with ${shape.identityKey}/${shape.profileId}: ${bad.reason}`, { identityKey: shape.identityKey, profileId: shape.profileId, ability, reason: bad.reason });
  }
  if (burst && !shape.fireModes.autofire) throw new WeaponRuntimeError(ERROR_CODES.ATTACK_SHAPE_ILLEGAL, `Burst Fire requires an autofire-capable form; ${shape.identityKey}/${shape.profileId} cannot autofire`, { identityKey: shape.identityKey, profileId: shape.profileId, ability: 'Burst Fire', reason: 'form-cannot-autofire' });
  // Phase 5D-I-A: environment legality. A weapon that declares which profiles work underwater refuses the others ONLY when the attack is
  // explicitly underwater; an unknown environment never restricts anything.
  const usable = shape.environment?.underwaterUsableProfiles;
  if (rollOptions.underwater === true && usable && !usable.includes(shape.profileId)) throw new WeaponRuntimeError(ERROR_CODES.ATTACK_SHAPE_ILLEGAL, `${shape.identityKey}/${shape.profileId} cannot be used underwater (usable: ${usable.join(', ')})`, { identityKey: shape.identityKey, profileId: shape.profileId, reason: 'profile-unusable-underwater', usable: [...usable] });
  // Phase 5D-I-A: a timer-detonated grenade accepts the thrower's chosen timer only within the published range (the choice itself is the player's)
  const timer = validateDetonationTimer(shape.area?.detonation, rollOptions.detonationTimer);
  if (!timer.ok) throw new WeaponRuntimeError(ERROR_CODES.ATTACK_SHAPE_ILLEGAL, `${shape.identityKey}/${shape.profileId}: the detonation timer must be ${timer.min}-${timer.max} rounds`, { identityKey: shape.identityKey, profileId: shape.profileId, reason: timer.reason, min: timer.min, max: timer.max });
  if (shape.fireModes.autofireOnly && !autofireMode) throw new WeaponRuntimeError(ERROR_CODES.ATTACK_SHAPE_ILLEGAL, `${shape.identityKey}/${shape.profileId} can only fire in autofire mode`, { identityKey: shape.identityKey, profileId: shape.profileId, reason: 'autofire-only' });
}

function describeReadinessBlockers(blockers = []) {
  return blockers.map((b) => {
    if (b.reason === 'awaiting-reload') return `it must be reloaded${b.reloadAction ? ` (${b.reloadAction} action)` : ''}`;
    if (b.reason === 'unavailable-this-round') return `it cannot fire in round ${b.currentRound}; it is ready again in round ${b.availableRound}`;
    if (b.reason === 'round-shot-limit') return `it has already fired its limit (${b.maxShots}) this round`;
    if (b.reason === 'configuration-not-usable') return `it is in the ${b.configurationId} configuration and cannot attack until it is changed`;
    if (b.reason === 'state-machine') return `it is in the ${b.from} state and cannot change to ${b.to} (${b.detail === 'locked' ? 'locked' : 'no such transition'})`;
    if (b.reason === 'usage-exhausted') return b.detail === 'manual-reset-required' ? `its ${b.per ?? 'usage'} limit is used and needs a GM reset` : `its ${b.per ?? 'usage'} limit is used until ${b.resetsAt}`;
    return b.reason;
  }).join('; ');
}

function getFightingDefensivelyAttackPenalty(actor, options = {}) {
  const active = options?.fightingDefensively === true || hasFightingDefensivelyEffect(actor);
  if (!active) return 0;
  const preparedPenalty = Number(actor?.system?.attackPenalty ?? 0) || 0;
  return preparedPenalty <= -5 ? 0 : -5;
}

function normalizeDefenseKey(value = 'reflex') {
  const key = String(value || 'reflex').toLowerCase();
  if (key === 'fort' || key === 'fortitude') return 'fortitude';
  if (key === 'will') return 'will';
  if (key === 'dc') return 'dc';
  return 'reflex';
}

// Math Integrity Freeze, round 8: the single target-defense authority for
// every attack in the game (not just Grapple). Two actor-type contracts,
// never blended into one fallback chain that "happens to" prioritize
// correctly:
//   - a prepared V2 actor (one that has actually run DerivedCalculator):
//     the canonical SchemaAdapters.getDefenseTotalIfPrepared() value, full
//     stop -- delegated to, not re-read inline, so this function and
//     SchemaAdapters can never independently drift on what "prepared"
//     means.
//   - a legacy/statblock actor type that genuinely never runs the V2
//     derived pipeline (SchemaAdapters reports "not prepared", i.e. null):
//     an explicit, separately-scoped compatibility fallback to the legacy
//     system.defenses.<key>.total/.value fields. This branch never
//     competes with prepared derived data -- it only runs when derived is
//     entirely absent.
// Round 7 fixed the PRIORITY (derived before legacy) but still read
// system.derived.defenses.<key>.total inline here, a second copy of what
// SchemaAdapters.getDefenseTotalIfPrepared() already computes -- correct by
// coincidence, not by construction. This round removes that duplication.
// See docs/audits/v2-math-integrity-authority-ledger.md's Grapple domain
// section, "Certification-correction addendum 8".
function getTargetDefenseValue(actor, key) {
  const prepared = SchemaAdapters.getDefenseTotalIfPrepared(actor, key);
  if (prepared !== null) return prepared;
  const legacy = actor.system?.defenses?.[key]?.total ?? actor.system?.defenses?.[key]?.value ?? null;
  const number = Number(legacy);
  return Number.isFinite(number) ? number : null;
}

export function getTargetReflex(actor = null) {
  if (!actor) return null;
  return getTargetDefenseValue(actor, 'reflex');
}

export function getTargetDefense(actor = null, defenseType = 'reflex') {
  if (!actor) return null;
  const key = normalizeDefenseKey(defenseType);
  if (key === 'dc') return null;
  return getTargetDefenseValue(actor, key);
}

export function resolveTargetContext(options = {}, fallbackTarget = null) {
  const ctx = options.targetContext ?? null;
  const mode = String(ctx?.mode || '').toLowerCase();
  if (mode === 'manual') {
    const value = Number(ctx?.defenseValue);
    return { target: null, targetName: ctx?.label || 'Manual Target', defenseType: normalizeDefenseKey(ctx?.defenseType || 'reflex'), defenseValue: Number.isFinite(value) ? value + Number(ctx?.coverBonus || 0) : null, mode: 'manual', adjustment: 0 };
  }
  if (mode === 'none') {
    return { target: null, targetName: 'GM adjudication', defenseType: normalizeDefenseKey(ctx?.defenseType || 'reflex'), defenseValue: null, mode: 'none', adjustment: 0 };
  }
  const target = fallbackTarget;
  const defenseType = normalizeDefenseKey(ctx?.defenseType || 'reflex');
  const base = getTargetDefense(target, defenseType);
  // Purely additive, opt-in adjustment on top of the canonical target
  // defense value -- e.g. a Grab/Grapple-specific Reflex resistance bonus
  // (Grapple Resistance, Grab Back) that must be part of the SAME hit
  // determination this function feeds, not a second, independent
  // recomputation layered on afterward by the caller. Defaults to 0, so
  // every existing caller that doesn't pass targetContext.defenseAdjustment
  // is unaffected. Returned as `adjustment` so callers (see
  // roll.swseAttackContext.defenseAdjustment below) can report truthfully
  // what was actually applied, rather than a hardcoded 0.
  // Phase 5D-I-C-C: attack-contextual PASSIVE defense of the target's held weapon (Dual-Phase extended blade vs an adjacent attacker, a disarm-defense
  // equipment bonus against a disarm attack). Reflex only, computed once per attack by resolveTargetSideDefense; the target's stored defense is never changed.
  const passive = defenseType === 'reflex' ? (Number(options.passiveDefenseAdjustment ?? 0) || 0) : 0;
  const adjustment = (Number(ctx?.defenseAdjustment ?? 0) || 0) + passive;
  const defenseValue = Number.isFinite(base) ? base + adjustment : base;
  return { target, targetName: target?.name ?? '', defenseType, defenseValue, mode: target ? 'token' : 'none', adjustment };
}

function buildReactionContextForAttack(attacker, defender, weapon, attackTotal) {
  if (!attacker || !defender) return null;

  const damageContext = damageContextForReaction({ weapon });

  const available = ReactionEngine.getAvailableReactions(defender, {
    attacker,
    weapon,
    attackType: damageContext.attackType,
    damageType: damageContext.damageType,
    damageTypes: damageContext.damageTypes,
    originalDamageTypes: damageContext.originalDamageTypes,
    sonicCannotBeDeflected: damageContext.sonicCannotBeDeflected,
    cannotBeNegatedBy: damageContext.cannotBeNegatedBy,
    trigger: 'ON_ATTACK_DECLARED'
  });

  if (!available.length) return null;

  return {
    attacker,
    attackerId: attacker.id,
    defender,
    defenderId: defender.id,
    defenderName: defender.name,
    timerLabel: '6.0 s',
    reason: `Incoming ${damageContext.attackType} attack total ${attackTotal}.`,
    damageType: damageContext.damageType,
    damageTypes: damageContext.damageTypes,
    originalDamageTypes: damageContext.originalDamageTypes,
    reactions: available.map(reaction => ({
      ...reaction,
      available: true,
      sublabel: reaction.key === 'block' || reaction.key === 'deflect' ? `DC ${attackTotal} · UTF` : ''
    }))
  };
}

// Damage SSOT migration: die-size-step/extra-weapon-dice formula assembly
// now lives in exactly one place (combat-roll-math.js#buildDamageFormula(),
// which internally reuses the canonical stepDamageDieFormula()/
// buildExtraWeaponDiceFormula()) — this file's own former copies are
// removed rather than left as unused dead code.

/**
 * Roll an attack with a weapon using SWSE rules.
 *
 * Cost/commit stages for this workflow:
 * - On declaration: core attack-option action costs (spendCoreAttackOptionCosts).
 * - On declaration: ammunition (AmmoSystem.spendForWorkflow), after action costs.
 * - On successful roll execution: both costs are kept; the catch block below
 *   rolls both back if anything in the try block throws (including the
 *   attack roll itself failing), so a formula/roll error cannot leave costs
 *   spent for an attack that never happened.
 * - Hit/damage resolution is a separate workflow (rollDamage) and is not
 *   gated by this function's cost transaction.
 */
export async function rollAttack(actor, weapon, options = {}) {
  let rollOptions = prepareCoreAttackOptionRollContext(mergeCombatWorkflowContextIntoRollOptions(options, options?.combatContext ?? options?.workflowContext ?? null));
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  // Phase 5D-A: canonical weapon/profile resolution is pure -- do it BEFORE any action-option or ammunition cost so an
  // unresolvable canonical identity/selection never spends anything (and needs no rollback).
  // Phase 5D-I-B: owned state selection (configuration / persistent setting / machine state), then the attack-of-opportunity choice
  rollOptions = FireStateStore.applyOwnedSelection(actor, weapon, rollOptions);
  const opportunity = await resolveOpportunityChoice(weapon, rollOptions);
  if (opportunity.refusal) { ui?.notifications?.warn?.(`${weapon.name}: ${opportunity.refusal}`); return null; }
  rollOptions = opportunity.rollOptions;
  const canonical = withCanonicalWeaponRuntime(weapon, rollOptions);
  if (canonical.error) {
    reportWeaponRuntimeError(canonical.error, { notify: false });
    ui?.notifications?.error?.(`Attack could not be resolved: ${canonical.error.message}`);
    return null;
  }
  rollOptions = canonical.rollOptions;
  const targetSide = await resolveTargetSideDefense(actor, weapon, rollOptions);
  if (targetSide.refusal) { ui?.notifications?.warn?.(`${weapon?.name ?? 'Weapon'} cannot make this attack (${targetSide.refusal.detail}).`); return null; }
  rollOptions = targetSide.rollOptions;
  const specialStage = await prepareCanonicalSpecialMechanics(weapon, rollOptions, actor);
  if (specialStage.refusal) {
    ui?.notifications?.warn?.(`${weapon?.name ?? 'Weapon'} cannot make this attack (${String(specialStage.refusal.reason).replace(/-/g, ' ')}): ${specialStage.refusal.failed.map((c) => String(c).replace(/[-_]/g, ' ')).join('; ')}.`);
    return null;
  }
  rollOptions = specialStage.rollOptions;

  // Phase 5D-G: temporal firing state (cooldown / alternate rounds / reload / resets / preparation) of the selected canonical form.
  // Read-only here and BEFORE every cost: a weapon on cooldown or awaiting reload fails closed with nothing mutated.
  const readiness = FireStateStore.previewReadiness(actor, weapon, rollOptions.weaponRuntime, rollOptions);
  if (!readiness.ready) {
    ui?.notifications?.warn?.(`${weapon.name} cannot fire yet: ${describeReadinessBlockers(readiness.blockers)}`);
    return null;
  }

  // Phase 5D-H: optional prepared attack. Priming is the player's choice (FireStateStore.primePreparedAttack); once it has matured the
  // NEXT attack carries it automatically (its structured extra weapon dice / resource units flow through the ordinary option + ammo
  // pipeline and the workflow context to damage). It cannot combine with an ability that expends more than one shot, and the
  // `preparedAttack` option cannot be asserted without a matured priming.
  const preparedRequested = !!(rollOptions.combatOptions?.preparedAttack ?? rollOptions.attackOptions?.preparedAttack);
  if (readiness.prepared?.matured) {
    const multi = CombatOptionResolver.summarizeAttackOptions(actor, weapon, rollOptions).filter((o) => o.active && o.expendsMultipleShots);
    if (readiness.prepared.constraint.prohibitsMultiShot && (multi.length || rollOptions.autofire || rollOptions.fireMode === 'autofire' || rollOptions.fireMode === 'burst')) {
      ui?.notifications?.warn?.(`${weapon.name}: a primed shot cannot be combined with an ability that consumes more than one shot (${multi.map((o) => o.label).join(', ') || 'autofire'}). Drop it, or fire without the primed shot is not possible until it is spent.`);
      return null;
    }
    rollOptions = { ...rollOptions, combatOptions: { ...(rollOptions.combatOptions ?? rollOptions.attackOptions ?? {}), preparedAttack: true }, preparedShot: true };
  } else if (preparedRequested) {
    ui?.notifications?.warn?.(`${weapon.name} is not primed: a prepared attack needs the priming action and its maturing turn first.`);
    return null;
  }

  const workflowContext = summarizeCombatWorkflowContext(rollOptions.combatContext ?? rollOptions.workflowContext ?? rollOptions, {
    actor,
    weapon,
    target: rollOptions.target ?? null,
    targetId: rollOptions.targetId ?? rollOptions.targetContext?.actorId ?? null,
    damageMode: rollOptions.damageMode ?? null,
    damageType: rollOptions.damageType ?? null,
    isStun: rollOptions.stun === true || rollOptions.damageMode === 'stun',
    isIon: rollOptions.ion === true,
    contextTags: rollOptions.damageMode === 'stun' || rollOptions.stun === true ? ['stun'] : []
  });
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, rollOptions);
  // Phase 5D-D: non-mutating ammunition validation BEFORE any cost is committed, so insufficient ammunition for the selected
  // form can never leave a transient action-option spend behind (the only mutation point stays AmmoSystem.spendForWorkflow below).
  const ammoPreflight = AmmoSystem.preflightAmmunition(actor, weapon, AmmoSystem.resolveAmmoCost({ weapon, workflowContext, options: rollOptions, optionModifiers }), rollOptions);
  if (!ammoPreflight.ok) {
    ui?.notifications?.error?.(ammoPreflight.message || `${weapon.name} does not have enough ammunition.`);
    return null;
  }
  let actionOptionSpend = await spendCoreAttackOptionCosts(actor, weapon, rollOptions);
  if (actionOptionSpend?.allowed === false || actionOptionSpend?.permitted === false) {
    ui?.notifications?.warn?.(actionOptionSpend.reason || 'Selected attack option action cost could not be paid.');
    return null;
  }
  // Phase 5D-G: required preparation / reset actions (prime, brace, reset the trigger) are paid through the existing action economy;
  // a failure here rolls back the option cost and stops before ammunition is touched. Later failures roll both back together.
  const temporalSpend = readiness.requiredActions.length
    ? await FireStateStore.spendRequiredActions(actor, readiness.requiredActions, { weaponName: weapon.name })
    : { ok: true, paid: [], rollback: async () => {} };
  if (!temporalSpend.ok) {
    await actionOptionSpend?.rollback?.();
    ui?.notifications?.warn?.(`${weapon.name} cannot fire: the required ${temporalSpend.failed?.action ?? ''} action (${temporalSpend.failed?.reason ?? 'reset'}) could not be paid.`);
    return null;
  }
  if (readiness.requiredActions.length) {
    const baseSpend = actionOptionSpend;
    actionOptionSpend = { ...(baseSpend ?? {}), rollback: async () => { await temporalSpend.rollback(); await baseSpend?.rollback?.(); } };
  }
  let ammoSpend = null;

  try {
  ammoSpend = await AmmoSystem.spendForWorkflow(actor, weapon, {
    workflowContext,
    options: rollOptions,
    optionModifiers
  });
  if (ammoSpend?.success === false) {
    await actionOptionSpend?.rollback?.();
    ui?.notifications?.error?.(ammoSpend.message || `${weapon.name} does not have enough ammunition.`);
    return null;
  }

  // attack-domain-router.js decides which existing math authority this
  // attack belongs to (character / vehicle-actor-gunner / vehicle-abstract-
  // crew) from normalized actor/item/context — not from which UI button
  // fired it — so a generic or future attack initiator can't silently rout
  // a vehicle actor through the character formula (the pre-Phase-3 defect)
  // just because it didn't go through crew-skill-router.js. The router only
  // selects an authority; the math still lives in combat-roll-math.js /
  // vehicle-attack-math.js exactly as before. computeFinalAttackComposition()
  // is the single shared seam for this — see its own doc comment.
  const composition = await computeFinalAttackComposition(actor, weapon, rollOptions);
  if (!composition.ok) {
    if (composition.attackBonusResolution?.error) {
      if (ammoSpend?.spent) await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
      await actionOptionSpend?.rollback?.();
      ui?.notifications?.error?.(composition.reason === 'invalid-vehicle-actor'
        ? 'Vehicle attack could not be resolved: the vehicle actor is missing or invalid, so its Intelligence modifier cannot be sourced.'
        : 'Vehicle attack could not be resolved: no valid gunner/operator actor.');
      return null;
    }
    if (composition.weaponRuntimeError) {
      // defensive: rollAttack pre-resolves, so this only fires if the registry changed mid-roll
      if (ammoSpend?.spent) await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
      reportWeaponRuntimeError(composition.weaponRuntimeError, { notify: false });
    }
    await actionOptionSpend?.rollback?.();
    ui?.notifications?.error?.(composition.weaponRuntimeError
      ? `Attack could not be resolved: ${composition.weaponRuntimeError.message}`
      : 'Attack could not be resolved: no valid attack-domain context (' + composition.reason + ').');
    return null;
  }
  const { atkBonus, attackDomain, isVehicleAttack, attackBonusResolution, attackComponentLedger, sequencePenalty, domainResolution } = composition;

  const rollFormula = `1d20 + ${atkBonus}`;
  const roll = await RollEngine.safeRoll(rollFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.attack', context: { weaponId: weapon?.id ?? null } });

  // Phase 5D-E: the selected canonical form's structured attack-resolution defense (Fortitude/Will) is the defense the roll is
  // compared to, through the existing target-defense authority; Reflex stays the default. An explicit targetContext still wins.
  const canonicalDefense = alternateDefenseOf(specialStage.mechanics);
  const resolvedDefenseType = canonicalDefense ?? optionModifiers.targetDefenseType ?? null;
  const targetContextOptions = resolvedDefenseType && !rollOptions.targetContext
    ? { ...rollOptions, targetContext: { defenseType: resolvedDefenseType } }
    : rollOptions;
  const resolvedTarget = resolveTargetContext(targetContextOptions, getTargetActorFromOptions(rollOptions));
  const target = resolvedTarget.target;
  const targetReflex = resolvedTarget.defenseValue;
  const d20 = roll?.dice?.[0]?.results?.[0]?.result ?? null;
  const criticalThreshold = Number(optionModifiers.criticalThreatNaturalMin ?? 20);
  // Damage SSOT migration ("CRITICAL MULTIPLIER SSOT"): this used to be an
  // inline Math.max(weapon base, optionModifiers.criticalMultiplierMin)
  // that never considered RULES.MODIFY_CRITICAL_MULTIPLIER (the actor/
  // rule-aware source combat-utils.js's own getCriticalMultiplier() reads,
  // independently, without knowing about CombatOptionResolver's own
  // criticalMultiplierMin) — see docs/audits/v2-damage-modifier-authority-
  // audit-correction-1.md §2. resolveCriticalMultiplier() is now the one
  // function that considers both sources; the resolved value below is
  // carried forward into damageWorkflowContext so a later Damage-button
  // click reuses this exact multiplier instead of re-deriving it.
  const critMultiplier = resolveCriticalMultiplier(actor, weapon, rollOptions, optionModifiers);
  // AttackOutcomeResolver is the single authority for hit/critical/natural-1/
  // natural-20 interpretation — chat, damage workflow, rerolls, and reactions
  // all read from this same outcome object rather than re-deriving it.
  const outcome = AttackOutcomeResolver.resolve({
    naturalD20: d20,
    total: roll.total,
    targetDefense: targetReflex,
    criticalThreshold,
    critMultiplier
  });
  const isHit = outcome.hit;
  const isCritical = outcome.critical;
  // Phase 5D-G: the shot was fired -- record owned fire state (cooldown, reload, reset, preparation) for the next attack
  await FireStateStore.commitFired(actor, weapon, rollOptions.weaponRuntime, rollOptions, temporalSpend.paid);
  const reactionContext = buildReactionContextForAttack(actor, target, weapon, roll.total);
  const attackRerollOptions = MetaResourceFeatResolver.buildAttackRerollChatOptions(actor, weapon, roll, {
    ...rollOptions,
    formula: rollFormula,
    weaponId: weapon.id,
    isHit,
    target,
    // Carried through so a reroll can build a fresh, non-merged
    // AttackOutcomeResolver verdict instead of only replacing the total.
    targetDefense: targetReflex,
    criticalThreshold,
    critMultiplier
  });

  const damageWorkflowContext = summarizeCombatWorkflowContext(workflowContext, {
    actor,
    weapon,
    target,
    targetId: target?.id ?? null,
    targetName: resolvedTarget.targetName ?? target?.name ?? '',
    isCritical,
    critMultiplier,
    hit: isHit,
    natural1: outcome.automaticMiss,
    natural20: outcome.automaticHit,
    defense: resolvedTarget.defenseType ?? workflowContext?.attack?.defense ?? null,
    // Phase 5D-C: carry the exact canonical attack form to the later Damage roll (null/absent for legacy weapons)
    weaponForm: weaponFormRecord(rollOptions.weaponRuntime, rollOptions.damageMode ?? null) ? { ...weaponFormRecord(rollOptions.weaponRuntime, rollOptions.damageMode ?? null), ...(specialStage.loadedIdentityKey ? { loadedIdentityKey: specialStage.loadedIdentityKey } : {}) } : undefined,
    // Phase 5D-F: this attack's place in its sequence and the shape it was made with (damage clicked from attack #2 reads attack #2)
    attackShape: rollOptions.weaponRuntime?.source === 'canonical' ? {
      fireMode: rollOptions.fireMode ?? (optionActive(rollOptions, 'burstFire') ? 'burst' : (rollOptions.autofire === true || rollOptions.attackMode === 'autofire') ? 'autofire' : 'single'),
      attackIndex: Number.isFinite(rollOptions.sequenceIndex) ? rollOptions.sequenceIndex : 0,
      sequenceId: rollOptions.sequenceId ?? undefined, sequenceLength: Number.isFinite(rollOptions.sequenceLength) ? rollOptions.sequenceLength : 1,
      packageType: rollOptions.packageType ?? undefined, handRole: rollOptions.handRole ?? undefined, endId: rollOptions.weaponRuntime.endId ?? undefined,
      area: summarizeAreaShape(specialStage.areaShape),
      // Phase 5D-I-B: the owned-state facts this attack was resolved with (damage must not rediscover them from a possibly changed Item)
      ...(specialStage.ownedExtras ?? {}),
    } : undefined,
    ...(specialStage.areaShape?.isArea ? { isArea: true, ruleData: { areaAttack: true, ...(specialStage.areaShape.halfDamageOnMiss ? { halfDamageOnMiss: true } : {}) } } : {}),
    // Phase 5D-E: carry the special-mechanic state (classified mechanics, stored answers, evaluated CT riders) to Damage/Apply
    special: (specialStage.mechanics.length || Object.keys({ ...specialStage.answers, ...(rollOptions.answers ?? {}) }).length) ? {
      mechanics: summarizeMechanics(specialStage.mechanics), answers: { ...specialStage.answers, ...(rollOptions.answers ?? {}) }, unresolved: specialStage.unresolved, drInteraction: specialStage.drIgnore ? 'ignore' : undefined,
      attackTotal: roll.total,
      ...(normalizeRangeBand(rollOptions.rangeBand) ? { rangeBand: normalizeRangeBand(rollOptions.rangeBand) } : {}),
      // Phase 5D-I-C-A: attack-specific threshold-stage adjustment and per-target-class damage rules travel to Apply Damage (the stored DT is never touched)
      ...(thresholdAdjustmentOf(specialStage.mechanics) ? { thresholdAdjustment: thresholdAdjustmentOf(specialStage.mechanics) } : {}),
      ...(targetRulesOf(specialStage.mechanics) ? { targetRules: targetRulesOf(specialStage.mechanics) } : {}),
      records: evaluateAttackOutcomeSpecials(specialStage.mechanics, {
        provenance: weaponFormRecord(rollOptions.weaponRuntime, rollOptions.damageMode ?? null),
        hit: isHit, attackTotal: roll.total,
        defenses: { reflex: getTargetDefense(target, 'reflex'), fortitude: getTargetDefense(target, 'fortitude'), will: getTargetDefense(target, 'will'), ...(Number.isFinite(resolvedTarget.defenseValue) ? { [resolvedTarget.defenseType]: resolvedTarget.defenseValue } : {}) }
      })
    } : undefined
  });

  const attackMessage = rollOptions.suppressChat ? null : await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`,
    flags: { swse: {
      attackRoll: true,
      weaponId: weapon.id,
      attackRerollOptions,
      workflowContext: damageWorkflowContext,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
      targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
      actionOptionSpend,
      // Reroll-supersession state (Phase 3 rolling-system alignment): a
      // successful reroll (meta-resource-feat-resolver.js
      // resolveAttackRerollButton) flips authoritative to false and stamps
      // superseded/supersededBy here.
      authoritative: true,
      superseded: false,
      supersededBy: null,
      revision: 0,
      // Full-attack/multi-attack sequence identity (Phase 4). Present only
      // when the caller declared a sequence (e.g. Double/Triple Attack via
      // combat-feature-handlers.js); null for an ordinary single attack.
      // Lets a reroll of one message in a sequence be proven independent of
      // its siblings, which already post as separate messages on this path.
      sequenceId: rollOptions.sequenceId ?? null,
      attackInstanceId: rollOptions.attackInstanceId ?? null,
      sequenceIndex: rollOptions.sequenceIndex ?? null,
      sequenceLength: rollOptions.sequenceLength ?? null
    } },
    context: {
      type: 'attack',
      weaponId: weapon.id,
      weapon,
      workflowContext: damageWorkflowContext,
      actionId: rollOptions.actionId ?? damageWorkflowContext?.actionId ?? null,
      actionName: workflowContext?.actionName ?? null,
      attackRerollOptions,
      target,
      targetName: resolvedTarget.targetName ?? target?.name ?? '',
      targetContext: resolvedTarget,
      targetDefense: resolvedTarget.defenseType === 'dc' ? 'DC' : resolvedTarget.defenseType === 'fortitude' ? 'Fortitude' : resolvedTarget.defenseType === 'will' ? 'Will' : 'Reflex',
      dc: targetReflex,
      passed: isHit,
      success: isHit,
      outcomeLabel: isCritical ? 'Critical Hit' : isHit === true ? 'Hit' : isHit === false ? 'Miss' : '',
      isCritical,
      critMultiplier,
      reactionContext,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
      targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
      sourceElement: rollOptions?.sourceElement ?? null,
      companionSource: rollOptions?.companionSource ?? null,
      sheet: rollOptions?.sheet ?? null,
      showRollCompanion: rollOptions?.showRollCompanion !== false,
      // Phase 5D-I-C-A: an effect-only form has no damage roll; its card action applies the outcome effects instead
      ...(isEffectOnlyForm(specialStage.mechanics) ? { damageActionLabel: 'Apply Effects' } : {})
    }
  });

  if (outcome.automaticMiss) {
    await ForceExecutor.handleForceFlowNaturalOne(actor, { source: weapon?.name ?? 'Attack', rollType: 'attack roll' });
  }
  if (outcome.automaticHit) {
    await ForceExecutor.grantTelepathicInfluenceForcePoint(actor);
  }

  const attackResult = {
    roll,
    message: attackMessage,
    attackDomain,
    total: roll.total,
    atkBonus,
    sequencePenalty,
    isHit,
    isCritical,
    critThreat: isCritical,
    outcome,
    componentLedger: attackComponentLedger,
    concealmentMiss: false,
    concealmentMissChance: 0,
    confirmationRoll: null,
    d20,
    target,
    targetReflex,
    resolvedTarget,
    weaponId: weapon.id,
    weapon,
    critMultiplier,
    reactionContext,
    attackRerollOptions,
    workflowContext: damageWorkflowContext,
    actionId: rollOptions.actionId ?? damageWorkflowContext?.actionId ?? null,
    actionData: rollOptions.actionData ?? null,
    // Full-attack/multi-attack sequence identity (Phase 4 rolling-system
    // alignment): stable ids threaded through from the declaring caller
    // (e.g. combat-feature-handlers.js#executeCombatFeatureMultiattack) so
    // one attack in a sequence can be identified/rerolled independently of
    // its siblings. Both are null for an ordinary single attack.
    sequenceId: rollOptions.sequenceId ?? null,
    attackInstanceId: rollOptions.attackInstanceId ?? null,
    sequenceIndex: rollOptions.sequenceIndex ?? null,
    sequenceLength: rollOptions.sequenceLength ?? null,
    targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
    targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
  };
  roll.swseAttackContext = {
    attackBonus: atkBonus,
    sequencePenalty,
    isHit,
    isCritical,
    natural1: outcome.automaticMiss,
    natural20: outcome.automaticHit,
    critMultiplier: attackResult.critMultiplier,
    targetDefenseValue: targetReflex,
    targetDefenseType: resolvedTarget.defenseType ?? null,
    defenseAdjustment: resolvedTarget.adjustment ?? 0,
    workflowContext: damageWorkflowContext,
    actionId: attackResult.actionId
  };
  attackResult.ammoSpend = ammoSpend;
  attackResult.actionOptionSpend = actionOptionSpend;

  AttackRollDiagnostics.record({
    domain: 'combat.attack',
    // attackType now mirrors attack-domain-router.js's own vocabulary
    // ('character' | 'vehicle-actor-gunner' | 'vehicle-abstract-crew') so a
    // diagnostics snapshot shows exactly which resolver was selected and,
    // via domainReason/domainWarnings, why — rather than re-deriving a
    // coarser vehicle/character guess independently here.
    attackType: attackDomain,
    resolverSelected: domainResolution.resolver,
    domainReason: domainResolution.reason,
    domainWarnings: domainResolution.warnings,
    messageId: attackMessage?.id ?? null,
    messageRevision: attackMessage?.getFlag?.('swse', 'revision') ?? 0,
    messageAuthoritative: attackMessage?.getFlag?.('swse', 'authoritative') ?? null,
    messageSuperseded: attackMessage?.getFlag?.('swse', 'superseded') ?? null,
    actor,
    vehicleActor: rollOptions?.vehicleActor ?? (actor?.type === 'vehicle' ? actor : null),
    operator: rollOptions?.operator ?? rollOptions?.gunner ?? (actor?.type !== 'vehicle' ? actor : null),
    crewStation: rollOptions?.crewStation ?? null,
    item: weapon,
    target,
    naturalD20: d20,
    finalTotal: roll.total,
    formula: rollFormula,
    componentLedger: attackComponentLedger,
    forcePointReceipt: null,
    transactions: { ammoSpend, actionOptionSpend },
    outcome,
    damageWorkflowMetadata: damageWorkflowContext
  });

  return attackResult;
  } catch (err) {
    if (ammoSpend?.spent) {
      await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
    }
    await actionOptionSpend?.rollback?.();
    throw err;
  }
}

/**
 * Roll damage for a weapon.
 *
 * Damage SSOT migration ("ROLL WRAPPERS BECOME ORCHESTRATION ONLY"): this
 * used to be a second, independent damage-formula builder — confirmed
 * divergent from damage.js#rollDamage() (it read die-step/extra-dice
 * fields damage.js's live path silently dropped, but it was ALSO missing
 * the Inquisition extra-die contribution damage.js's version has). Per the
 * command's explicit instruction ("There must not be two Damage formulas
 * afterward... collapsed into one, or one becomes a thin wrapper of the
 * other"), this is now a thin delegate to the single canonical
 * damage.js#rollDamage() — same composition, same formula, same chat
 * card — rather than a second hand-maintained approximation of it.
 */
export async function rollDamage(actor, weapon, options = {}) {
  return canonicalRollDamage(actor, weapon, options);
}

/**
 * Roll full attack (attack roll + optional crit threat handling)
 */
export async function rollFullAttack(actor, weapon, options = {}) {
  const attack = await rollAttack(actor, weapon, options);
  if (!attack) {return null;}

  const result = { attack, damage: null };

  // AttackOutcomeResolver (inside rollAttack above) already determined
  // critical threat from the natural d20; reuse that verdict instead of
  // re-deriving it here (attack.dice does not exist on the attack result —
  // this previously threw when this codepath ran).
  if (attack.outcome?.criticalThreat) {
    ui.notifications.info('Critical Threat!');
  }

  return result;
}

/* ============= Phase 4: Narration Wrappers ============= */

/**
 * Helper: get first targeted token name
 */
function _firstTargetName() {
  try {
    const t = Array.from(game.user.targets ?? []);
    if (!t.length) return null;
    return t[0]?.name ?? t[0]?.document?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Roll attack + damage together with narration
 * Does NOT reference defenses; narration is supplemental only
 */
export async function rollAttackAndDamageWithNarration(actor, weapon, options = {}) {
  const rollOptions = prepareCoreAttackOptionRollContext(options);
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  const targetName = _firstTargetName();
  // Math Integrity Freeze, Attack Bonus round 6: this used to call
  // resolveAttackBonus(...).total directly, bypassing
  // computeFinalAttackComposition() -- the shared seam rollAttack() (the
  // dialog/roll/chat path) and the attack dialog's own live preview both
  // already go through. That meant this exported entry point silently
  // dropped every invocation-only addition computeFinalAttackComposition()
  // layers on top of the resolver's own total (Fighting Defensively,
  // grapple-state penalty, custom modifier, sequence penalty, the legacy
  // situationalBonus override) for anyone who called it. No current caller
  // reaches this function, so it was a dormant divergence, not a
  // reproduced bug -- but the freeze does not leave a known alternate
  // attack-roll formula in place for a future caller to find. Only the
  // attack side changes here; Damage composition below is untouched.
  const composition = await computeFinalAttackComposition(actor, weapon, rollOptions);
  if (!composition.ok) {
    ui?.notifications?.error?.('Attack could not be resolved: no valid attack-domain context (' + composition.reason + ').');
    return null;
  }
  const atkBonus = composition.atkBonus;
  // optionModifiers still needed for die-formula and effect modifiers below.
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, rollOptions);
  const workflowContext = summarizeCombatWorkflowContext(rollOptions.combatContext ?? rollOptions.workflowContext ?? null, { actor, weapon });
  const actionOptionSpend = await spendCoreAttackOptionCosts(actor, weapon, rollOptions);
  if (actionOptionSpend?.allowed === false || actionOptionSpend?.permitted === false) {
    ui?.notifications?.warn?.(actionOptionSpend.reason || 'Selected attack option action cost could not be paid.');
    return null;
  }
  let ammoSpend = null;

  try {
  ammoSpend = await AmmoSystem.spendForWorkflow(actor, weapon, {
    workflowContext,
    options: rollOptions,
    optionModifiers
  });
  if (ammoSpend?.success === false) {
    await actionOptionSpend?.rollback?.();
    ui?.notifications?.error?.(ammoSpend.message || `${weapon.name} does not have enough ammunition.`);
    return null;
  }

  const rollFormula = `1d20 + ${atkBonus}`;
  const attackRoll = await RollEngine.safeRoll(rollFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.attack', context: { weaponId: weapon?.id ?? null } });

  // Post attack roll card
  const target = getTargetActorFromOptions(rollOptions);
  const targetReflex = getTargetReflex(target);
  const attackD20 = attackRoll?.dice?.[0]?.results?.[0]?.result ?? null;
  const attackCritThreshold = Number(optionModifiers.criticalThreatNaturalMin ?? 20);
  const attackCritMultiplier = resolveCriticalMultiplier(actor, weapon, rollOptions, optionModifiers);
  // Same AttackOutcomeResolver used by rollAttack(), so narration and this
  // combined attack+damage path agree on natural-1/natural-20/critical rules.
  const outcome = AttackOutcomeResolver.resolve({
    naturalD20: attackD20,
    total: attackRoll.total,
    targetDefense: targetReflex,
    criticalThreshold: attackCritThreshold,
    critMultiplier: attackCritMultiplier
  });
  const isHit = outcome.hit;
  const isCritical = outcome.critical;

  // Damage SSOT migration ("ROLL WRAPPERS BECOME ORCHESTRATION ONLY" /
  // "Resolve rollAttackAndDamageWithNarration() dead damage path"): this
  // used to build its damage formula BEFORE the attack roll resolved
  // isCritical, so the old code could never apply a critical multiplier or
  // critical-only die-step to this path's damage roll at all — confirmed
  // dead code (zero live callers, per the original Damage audit), so this
  // was a dormant divergence, not a reproduced live bug. Reordered so the
  // canonical composition is resolved AFTER the attack outcome is known,
  // matching how the live rollAttack() -> rollDamage() two-step flow
  // already sequences things, and delegating to the same
  // resolveDamageComposition()/buildDamageFormula() seam instead of a
  // third hand-rolled formula builder.
  const damageContext = { ...rollOptions, target, isCritical, critMultiplier: attackCritMultiplier };
  const damageComposition = resolveDamageComposition(actor, weapon, damageContext);
  const dmgFormula = buildDamageFormula(damageComposition, { isAreaAttack: isAreaAttack(weapon, damageContext) });
  const damageRoll = await RollEngine.safeRoll(dmgFormula, actor?.getRollData?.() ?? {}, { actor, domain: 'combat.damage' });

  const atkTotal = attackRoll?.total;
  const dmgTotal = damageRoll?.total;
  const reactionContext = buildReactionContextForAttack(actor, target, weapon, attackRoll.total);
  const attackRerollOptions = MetaResourceFeatResolver.buildAttackRerollChatOptions(actor, weapon, attackRoll, {
    ...rollOptions,
    formula: rollFormula,
    weaponId: weapon.id,
    isHit,
    target,
    targetDefense: targetReflex,
    criticalThreshold: attackCritThreshold,
    critMultiplier: attackCritMultiplier
  });

  await SWSEChat.postRoll({
    roll: attackRoll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`,
    flags: { swse: {
      attackRoll: true,
      weaponId: weapon.id,
      attackRerollOptions,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || [],
      targetEffectsOnCritical: optionModifiers.targetEffectsOnCritical || [],
      actionOptionSpend,
      authoritative: true,
      superseded: false,
      supersededBy: null,
      revision: 0
    } },
    context: {
      type: 'attack',
      weaponId: weapon.id,
      weapon,
      attackRerollOptions,
      target,
      targetName: target?.name ?? '',
      targetDefense: 'Reflex',
      dc: targetReflex,
      passed: isHit,
      success: isHit,
      outcomeLabel: isCritical ? 'Critical Hit' : isHit === true ? 'Hit' : isHit === false ? 'Miss' : '',
      isCritical,
      critMultiplier: attackCritMultiplier,
      reactionContext,
      targetEffectsOnHit: optionModifiers.targetEffectsOnHit || []
    }
  });

  if (outcome.automaticMiss) {
    await ForceExecutor.handleForceFlowNaturalOne(actor, { source: weapon?.name ?? 'Attack', rollType: 'attack roll' });
  }
  if (outcome.automaticHit) {
    await ForceExecutor.grantTelepathicInfluenceForcePoint(actor);
  }

  // Post damage roll card
  await SWSEChat.postRoll({
    roll: damageRoll,
    actor,
    flavor: `${weapon.name} Damage`,
    context: { type: 'damage', weaponId: weapon.id, weapon, damageType: weapon.system?.damageType ?? weapon.system?.damage?.type ?? '' }
  });

  // Post supplemental narration (gated by setting)
  if (typeof atkTotal === "number" && typeof dmgTotal === "number") {
    try {
      const { ActionChatEngine } = await import("/systems/foundryvtt-swse/scripts/chat/action-chat-engine.js");
      await ActionChatEngine.narrationAttack(actor, weapon.name ?? "Weapon", atkTotal, dmgTotal, { targetName });
    } catch {
      // Narration engine not available; continue anyway
    }
  }

  return { attack: attackRoll, damage: damageRoll, outcome, ammoSpend, actionOptionSpend };
  } catch (err) {
    if (ammoSpend?.spent) {
      await AmmoSystem.rollbackSpend(actor, weapon, ammoSpend);
    }
    await actionOptionSpend?.rollback?.();
    throw err;
  }
}
