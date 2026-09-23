/**
 * Combat Roll Math — Canonical Attack/Damage Resolver
 *
 * ARCHITECTURE: Single source of truth for combat bonus math.
 *
 * Both the actual roll path (attacks.js) and the breakdown/tooltip path
 * (weapons-engine.js → weapon-tooltip.js) delegate to resolveAttackBonus()
 * and resolveDamageBonus() here. This guarantees that sheets, tooltips, and
 * debug breakdowns never under- or over-report compared with the formulas
 * used in actual attack and damage rolls.
 *
 * Import graph:  attacks.js ──┐
 *                              ├──► combat-roll-math.js
 *               weapons-engine.js ┘
 *
 * Do NOT import attacks.js or weapons-engine.js from this module.
 */

import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { isNpcStatblockMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
import { getStockAttackFlatBonus, getStockDamageFormula } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";
import { buildStockDroidDamageFormula } from "/systems/foundryvtt-swse/scripts/domain/droids/stock-droid-damage-formula.js";
import {
  getDamageAbilityContribution,
  getHalfLevelDamageBonus,
  getRangePenalty,
  getWeaponAttackAbility,
  getWeaponAttunementAndUpgradeModifiers,
  getWeaponFlatAttackBonus,
  getWeaponFlatDamageBonus,
  isVehicleWeapon,
  getCriticalMultiplier as getWeaponBaseCriticalMultiplier
} from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { ModifierUtils } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js";
import { getStackingRule } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";
import { buildModifierLedger } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/modifier-breakdown-builder.js";
import { ImplantEffectRules } from "/systems/foundryvtt-swse/scripts/engine/implants/ImplantEffectRules.js";
import { ScopedCombatFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feat/scoped-combat-feat-resolver.js";
import { resolveArmorUsageEffects } from "/systems/foundryvtt-swse/scripts/engine/effects/armor-usage-resolver.js";
import { ResolutionContext } from "/systems/foundryvtt-swse/scripts/engine/resolution/resolution-context.js";
import { RULES } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js";
import { resolveTalentDamageContributions } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-talent-contributions.js";
import { collectSharedDamageDiceTerms } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-item-dice-contributions.js";

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function actorHasTalentNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'talent') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

function actorHasFeatNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'feat') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

function normalizeProficiencyKey(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '')
    .replace(/weapons$/, 'weapon');
}

function weaponProficiencyCandidates(weapon) {
  const system = weapon?.system ?? {};
  const values = [
    weapon?.name,
    system.proficiency,
    system.proficiencyGroup,
    system.weaponProficiency,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.type,
    system.weaponType
  ];
  const candidates = new Set(values.map(normalizeProficiencyKey).filter(Boolean));
  const text = values.filter(Boolean).join(' ').toLowerCase();
  if (text.includes('simple')) candidates.add('simpleweapon');
  if (text.includes('pistol')) candidates.add('pistol');
  if (text.includes('rifle')) candidates.add('rifle');
  if (text.includes('heavy')) candidates.add('heavyweapon');
  if (text.includes('advanced') && text.includes('melee')) candidates.add('advancedmeleeweapon');
  if (text.includes('lightsaber')) candidates.add('lightsaber');
  return candidates;
}

function actorWeaponProficiencyKeys(actor) {
  const keys = new Set();
  const addKey = (value) => {
    const key = normalizeProficiencyKey(value);
    if (key) keys.add(key);
  };

  try {
    const structured = actor?.system?.proficiencies?.weapon;
    if (structured instanceof Set) for (const entry of structured) addKey(entry);
    else if (Array.isArray(structured)) for (const entry of structured) addKey(entry);
    else if (structured && typeof structured === 'object') {
      for (const [key, value] of Object.entries(structured)) if (value === true) addKey(key);
    }

    const legacy = actor?.system?.weaponProficiencies ?? actor?.system?.proficiencies?.weapons;
    if (Array.isArray(legacy)) for (const entry of legacy) addKey(entry);
    else if (legacy && typeof legacy === 'object') {
      for (const [key, value] of Object.entries(legacy)) if (value === true) addKey(key);
    }

    const unlockWeapon = actor?._unlockGrants?.proficiencies?.weapon;
    if (unlockWeapon instanceof Set) for (const entry of unlockWeapon) addKey(entry);
    else if (Array.isArray(unlockWeapon)) for (const entry of unlockWeapon) addKey(entry);

    for (const item of actor?.items ?? []) {
      if (item?.type !== 'feat') continue;
      const name = normalizeProficiencyKey(item.name);
      if (name === 'advancedmeleeweaponproficiency') addKey('advancedmeleeweapon');
      if (name === 'lightsaberproficiency' || name === 'weaponproficiencylightsaber') addKey('lightsaber');
      if (!name.startsWith('weaponproficiency')) continue;
      if (name.includes('simple')) addKey('simpleweapon');
      if (name.includes('pistol')) addKey('pistol');
      if (name.includes('rifle')) addKey('rifle');
      if (name.includes('heavy')) addKey('heavyweapon');
      if (name.includes('advancedmelee')) addKey('advancedmeleeweapon');
      if (name.includes('lightsaber')) addKey('lightsaber');
    }
  } catch (_err) {
    return keys;
  }

  return keys;
}

function actorHasWeaponProficiencyForWeapon(actor, weapon) {
  const candidates = weaponProficiencyCandidates(weapon);
  if (!candidates.size) return false;
  const proficiencies = actorWeaponProficiencyKeys(actor);
  for (const candidate of candidates) {
    if (proficiencies.has(candidate)) return true;
    if (candidate.endsWith('weapon') && proficiencies.has(candidate.replace(/weapon$/, ''))) return true;
    if (proficiencies.has(`${candidate}weapon`)) return true;
  }
  return false;
}

function currentCombatEncounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function inquisitionAttackBonus(actor, context = {}) {
  if (!actorHasTalentNamed(actor, 'Inquisition')) return 0;
  const target = getTargetActorFromOptions(context);
  if (!target || !actorHasFeatNamed(target, 'Force Sensitivity')) return 0;
  return 1;
}

function unsettlingPresenceAttackPenalty(actor) {
  const state = actor?.getFlag?.('swse', 'forceAdept.unsettlingPresence') ?? null;
  if (!state || state.encounterId !== currentCombatEncounterId()) return 0;
  return Number(state.attackPenalty ?? -2) || -2;
}

function actorIsProficientForAttack(actor, weapon) {
  const explicit = weapon?.system?.proficient;
  if (explicit !== false) return true;
  if (ImplantEffectRules.ignoresWeaponProficiencyPenalty(actor, weapon)) return true;
  if (actorHasTalentNamed(actor, 'Spacehound') && isVehicleWeapon(weapon)) return true;
  return actorHasWeaponProficiencyForWeapon(actor, weapon);
}

function shootingIntoMeleePenalty(actor, context = {}) {
  const applies = context.shootingIntoMelee === true
    || context.firingIntoMelee === true
    || context.rangedIntoMelee === true
    || context.targetInMelee === true;
  if (!applies) return 0;
  if (actorHasFeatNamed(actor, 'Precise Shot')) return 0;
  const penalty = Number(context.shootingIntoMeleePenalty ?? context.firingIntoMeleePenalty ?? -5);
  return Number.isFinite(penalty) ? penalty : -5;
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function normalizeRollKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

function buildEffectIntentRollContext(weapon, options = {}, extra = {}) {
  const system = weapon?.system ?? {};
  const weaponGroup = options.weaponGroup
    ?? system.weaponGroup ?? system.group ?? system.proficiencyGroup ?? system.category ?? '';
  const weaponCategory = options.weaponCategory ?? options.attackType
    ?? system.weaponCategory ?? system.category ?? system.type
    ?? system.meleeOrRanged ?? system.weaponRangeType ?? '';
  const damageType = options.damageType ?? system.damageType ?? system.damage?.type ?? '';
  const damageTypes = [
    ...asArray(options.damageTypes),
    ...asArray(system.damageTypes),
    ...asArray(damageType)
  ].map(normalizeRollKey).filter(Boolean);
  return {
    ...(options || {}),
    ...(extra || {}),
    item: weapon,
    itemId: weapon?.id ?? weapon?._id ?? options.itemId ?? options.weaponId ?? '',
    weapon,
    weaponId: weapon?.id ?? weapon?._id ?? options.weaponId ?? '',
    weaponGroup,
    group: weaponGroup,
    weaponCategory,
    category: weaponCategory,
    attackType: weaponCategory,
    damageType,
    damageTypes,
    customTags: Array.isArray(options.customTags) ? options.customTags : []
  };
}

function getBasicEffectIntentBonus(actor, target, weapon, options = {}, extra = {}) {
  try {
    return ModifierEngine.getEffectIntentModifierTotalForContext(
      actor, target, buildEffectIntentRollContext(weapon, options, extra), { includeBroad: true }
    );
  } catch (err) {
    console.warn(`[SWSE] Failed to apply Basic effect intents for ${target}`, err);
    return 0;
  }
}

function actorHpValueForSithEffects(actor) {
  return Number(
    actor?.system?.hp?.value ??
    actor?.system?.hitPoints?.value ??
    actor?.system?.attributes?.hp?.value ?? 1
  ) || 0;
}

function sourceActorStillThreatening(sourceActorId) {
  if (!sourceActorId) return true;
  const source = game?.actors?.get?.(sourceActorId) ?? null;
  if (!source) return true;
  return actorHpValueForSithEffects(source) > 0;
}

function activeSithCommanderEffect(actor, key) {
  const state = actor?.getFlag?.('swse', `sithCommander.${key}`) ?? null;
  if (!state || state.encounterId !== currentCombatEncounterId()) return null;
  if (key === 'focusTerror') {
    const round = Number(game?.combat?.round ?? 0) || 0;
    const expires = Number(state.expiresAfterRound ?? 0) || 0;
    if (expires > 0 && round > expires) return null;
  }
  if (key === 'inciteRage' && !sourceActorStillThreatening(state.sourceActorId)) return null;
  return state;
}

function sithCommanderAttackModifier(actor) {
  let total = 0;
  const focus = activeSithCommanderEffect(actor, 'focusTerror');
  if (focus) total += Number(focus.attackPenalty ?? -2) || -2;
  const rage = activeSithCommanderEffect(actor, 'inciteRage');
  if (rage) total += Number(rage.attackBonus ?? 1) || 1;
  return total;
}

function rapidAlchemyDamageBonusInternal(actor, weapon) {
  const state = rapidAlchemyState(actor);
  if (!state?.sacrificePending) return 0;
  return weaponMatchesId(weapon, state.weaponId) ? Number(state.damageBonus ?? 5) || 5 : 0;
}

function forceItemState(weapon) {
  return weapon?.getFlag?.('swse', 'forceItem') ?? weapon?.flags?.swse?.forceItem ?? null;
}

function forceItemAttackBonus(actor, weapon) {
  const state = forceItemState(weapon);
  if (String(state?.attuned?.actorId ?? '') !== String(actor?.id ?? '')) return 0;
  return Number(state.attuned.attackBonus ?? 1) || 1;
}

function actorFromTargetRef(value) {
  if (!value) return null;
  if (value.actor?.items) return value.actor;
  if (value.items) return value;
  if (typeof value === 'string') return game?.actors?.get?.(value) ?? null;
  return null;
}

function actorFromTokenId(id) {
  if (!id) return null;
  return canvas?.tokens?.placeables?.find?.(token => String(token.id) === String(id) || String(token.document?.id) === String(id))?.actor ?? null;
}

function actorFromCombatantId(id) {
  if (!id) return null;
  const combatant = game?.combat?.combatants?.get?.(id)
    ?? Array.from(game?.combat?.combatants ?? []).find(c => String(c?.id) === String(id));
  return combatant?.actor ?? null;
}

function actorFromTargetContext(ctx = {}) {
  if (!ctx || typeof ctx !== 'object') return null;
  return actorFromTargetRef(ctx.actor)
    ?? actorFromTargetRef(ctx.target)
    ?? actorFromTokenId(ctx.tokenId)
    ?? actorFromCombatantId(ctx.combatantId)
    ?? actorFromTargetRef(ctx.actorId)
    ?? actorFromTargetRef(ctx.targetActorId)
    ?? actorFromTargetRef(ctx.targetId)
    ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported helpers (re-used by attacks.js)
// ─────────────────────────────────────────────────────────────────────────────

export function getTargetActorFromOptions(options = {}) {
  return actorFromTargetRef(options.targetActor)
    ?? actorFromTargetRef(options.target)
    ?? actorFromTargetContext(options.targetContext)
    ?? actorFromTargetContext(options.combatContext?.targetContext)
    ?? actorFromTargetContext(options.workflowContext?.targetContext)
    ?? actorFromTokenId(options.tokenId)
    ?? actorFromTokenId(options.targetTokenId)
    ?? actorFromCombatantId(options.combatantId)
    ?? actorFromTargetRef(options.actorId)
    ?? actorFromTargetRef(options.targetActorId)
    ?? actorFromTargetRef(options.targetId)
    ?? game.user?.targets?.first?.()?.actor
    ?? null;
}

export function weaponMatchesId(weapon, id) {
  if (!weapon || !id) return false;
  return String(weapon.id ?? weapon._id ?? '') === String(id);
}

export function rapidAlchemyState(actor) {
  const state = actor?.getFlag?.('swse', 'rapidAlchemy') ?? null;
  if (!state || state.encounterId !== currentCombatEncounterId()) return null;
  return state;
}

export function rapidAlchemyAttackBonus(actor, weapon) {
  const state = rapidAlchemyState(actor);
  if (!state?.active || state?.sacrificed === true) return 0;
  return weaponMatchesId(weapon, state.weaponId) ? Number(state.attackBonus ?? 2) || 2 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical resolvers
// ─────────────────────────────────────────────────────────────────────────────

export function resolveAttackBonus(actor, weapon, actionId = null, context = {}) {
  // PHASE 3 — Droid Stock-Statblock Authority: a stock-imported droid's
  // integrated weapon Items carry their PUBLISHED attack total in
  // system.attackBonus (see scripts/engine/import/stock-droid-importer-engine.js).
  // getWeaponFlatAttackBonus() below reads that same field as an ordinary
  // flat/enhancement bonus meant to be ADDED to BAB — for a stock droid that
  // would double-count the entire published total on top of BAB. The
  // published total REPLACES the BAB + ability + enhancement + proficiency
  // composition (those are already baked into the printed number), never
  // the whole roll — every situational/runtime modifier below (range,
  // firing into melee, condition track, attack penalty, combat options,
  // rage, talents, state effects, and every scoped/effect-intent bonus)
  // still applies on top of it, exactly as it would for a normal attack
  // roll. Decision logic for WHETHER a weapon uses the flat total lives in
  // getStockAttackFlatBonus() (droid-mode-adapter.js) so it stays a single,
  // unit-testable authority instead of duplicated inline here.
  const stockAttackFlat = getStockAttackFlatBonus(actor, weapon);
  const isStockDroidFlat = stockAttackFlat !== null;

  // Math Integrity Freeze, Attack Bonus round: an NPC statblock's own
  // published flat attack total (weapon.flags.swse.npc.{useFlat,
  // flatAttackBonus}, populated by the NPC importer -- see
  // packs/nonheroic.db) follows the IDENTICAL contract as the stock-droid
  // branch immediately above: the printed number replaces BAB + ability +
  // enhancement + proficiency, never the whole roll. This branch used to be
  // an unconditional early `return` that skipped every situational
  // modifier below it (range, firing into melee, condition track, attack
  // penalty, combat options, rage, talents, state effects, armor ACP) --
  // the stock-droid branch's own doc comment already asserted it "mirrors
  // the NPC statblock-flat pattern," but the NPC branch had never actually
  // been corrected to match. It is folded into the same
  // isFlatOverride/flatOverrideValue composition below instead of returning
  // early, so a publicized-statblock NPC's range/condition-track/combat-
  // option modifiers reach its attack roll exactly like every other actor.
  let npcAttackFlat = null;
  if (!isStockDroidFlat && actor?.type === 'npc' && isNpcStatblockMode(actor)) {
    const npc = weapon?.flags?.swse?.npc;
    if (npc?.useFlat === true && Number.isFinite(npc.flatAttackBonus)) {
      npcAttackFlat = Number(npc.flatAttackBonus) || 0;
    }
  }
  const isNpcFlat = npcAttackFlat !== null;
  const isFlatOverride = isStockDroidFlat || isNpcFlat;
  const flatOverrideValue = isStockDroidFlat ? stockAttackFlat : (isNpcFlat ? npcAttackFlat : 0);

  const bab = isFlatOverride ? 0 : SchemaAdapters.getBAB(actor);
  const attackOptionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);
  const abilityKey = getWeaponAttackAbility(actor, weapon);
  const abilityMod = isFlatOverride ? 0 : (SchemaAdapters.getAbilityMod(actor, abilityKey) + Number(attackOptionModifiers.attackAbilityBonus || 0));

  const miscBonus = isFlatOverride ? 0 : getWeaponFlatAttackBonus(weapon);
  const rangePenalty = getRangePenalty(weapon, context);
  const firingIntoMeleePenalty = shootingIntoMeleePenalty(actor, context);
  const rageModifiers = RageEngine.collectAttackModifiers(actor, weapon, context);
  const ctPenalty = actor.system?.derived?.damage?.conditionPenalty ?? actor.system?.conditionTrack?.penalty ?? 0;
  const attackPenalty = actor.system?.attackPenalty ?? 0;
  const proficient = actorIsProficientForAttack(actor, weapon);
  // A stock-statblock droid's or NPC's published total already assumes
  // whatever proficiency the printed creature has with its own weapon — a
  // proficiency penalty must not be layered on top of either flat total.
  const proficiencyPenalty = isFlatOverride ? 0 : (proficient ? 0 : -5);

  // Math Integrity Freeze, Attack Bonus round (blocker fix): an NPC's
  // flatAttackBonus is authored by the importer from the creature's PRINTED
  // sourcebook attack line (packs/nonheroic.db — e.g. "Goon"/"Dark Jedi"/
  // "Rodian Black Sun Vigo" all carry a persistent, unselected "Weapon
  // Focus" feat item alongside a useFlat weapon). A published SWSE
  // statblock's printed attack bonus already bakes in every PERSISTENT
  // trait the creature always has -- Weapon Focus, Weapon Specialization,
  // and similar scoped feat bonuses foremost among them -- unlike genuinely
  // roll-time/encounter-state modifiers (range, condition track, an
  // actively toggled combat option) which by definition cannot be baked
  // into a static number. No importer doc or rules text was found stating
  // the opposite (a prior audit, docs/audits/rolling-system-alignment-
  // phase-3.md, independently flagged this exact composition question as
  // "ambiguous — preserved, not guessed" for the vehicle-formula case).
  // Layering ScopedCombatFeatResolver's Weapon Focus bonus, or
  // TalentActionLinker's persistent talent bonus, on top of an NPC's
  // already-baked flat total would double-count it the moment that NPC's
  // Weapon Focus selection is ever properly recorded (today it silently
  // doesn't double-count only because imported NPC feat items happen to
  // carry no selection for ScopedCombatFeatResolver to match against --
  // an accident of import data shape, not a guaranteed contract). Both are
  // therefore suppressed for the NPC-flat branch specifically -- NOT the
  // stock-droid branch, whose own established composition contract
  // (already certified in an earlier round) is unchanged here.
  let talentBonus = 0;
  const TalentActionLinker = window.SWSE?.TalentActionLinker;
  if (!isNpcFlat && actionId && TalentActionLinker?.MAPPING) {
    const bonusInfo = TalentActionLinker.calculateBonusForAction(actor, actionId);
    talentBonus = bonusInfo?.value ?? 0;
  }

  let stateBonus = 0;
  try {
    if (actor?.items) {
      const enrichedContext = { weapon, ...context };
      for (const item of actor.items) {
        if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') continue;
        const meta = item.system?.abilityMeta;
        if (!meta?.modifiers || !Array.isArray(meta.modifiers)) continue;
        for (const modifier of meta.modifiers) {
          const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
          const appliesToAttack = targets.some(t => t === 'attack' || t === 'attack.bonus');
          if (!appliesToAttack) continue;
          const predicatesMatch = evaluateStatePredicates(actor, modifier.predicates || [], enrichedContext);
          if (modifier.allowLegacyStateAttackBonus !== true) continue;
          if (predicatesMatch && modifier.value) stateBonus += modifier.value;
        }
      }
    }
  } catch (err) {
    console.error('[SWSE] Error evaluating PASSIVE/STATE in attack bonus:', err);
  }

  // Math Integrity Freeze, Attack Bonus round 3-4 (blocker fixes): typed,
  // collision-eligible attack contributions -- Basic Effect Intent
  // modifiers, situational contextual contributions (Charge, Flanking --
  // built by roll-config.js#computeAttackSituationalContext and threaded
  // through here via context.situationalContributions), any typed
  // combat-option contribution (Relentless Attack's competence bonus, Prime
  // Shot's circumstance bonus -- both emitted via attackOptionModifiers.
  // attackContributions instead of the flat attackBonus number they used to
  // fold into), and the CURRENT weapon's own typed attack.bonus
  // contributions (an attuned lightsaber's +1, an installed crystal/
  // upgrade's attack modifier -- combat-stat-rules.js#
  // getWeaponAttunementAndUpgradeModifiers(), weapon-scoped so another
  // equipped weapon's contributions never leak into this roll) -- must
  // resolve stacking TOGETHER, in ONE pass, not as separately pre-summed
  // numbers added afterward. Previously each was reduced to a scalar in
  // its own isolated stacking pass (or, for the combat-option and weapon
  // channels, not stacking-resolved -- or not even collected -- at all)
  // before being summed here, so a same-type collision across channels --
  // e.g. an Active Effect's +4 competence bonus and Charge's own +2
  // competence bonus -- would silently both apply in full (+6) instead of
  // only the higher winning (+4), per this codebase's own COMPETENCE
  // stacking rule (STACKING_RULES.competence === 'highestOnly'). Mirrors
  // the identical fix already shipped for the Grapple domain
  // (grappling-system.js#_rollGrappleBonus /
  // collectContextualGrappleModifiers's own doc comment) -- reusing the
  // same shared authority (ModifierUtils.resolveStacking()), not a new
  // attack-specific stacking engine.
  //
  // Deliberately NOT included here (structural mirrors of core arithmetic
  // already computed above -- adding them again would double-count them):
  // the weapon's flat enhancement bonus (system.combat.attack.bonus,
  // already read by getWeaponFlatAttackBonus() into miscBonus) and the
  // nonproficiency penalty (already computed into proficiencyPenalty).
  // getWeaponAttunementAndUpgradeModifiers() intentionally never emits
  // either of those two.
  //
  // Target-alias normalization: this project's Modifier vocabulary has two
  // historical spellings for an attack-roll bonus target -- 'global.attack'
  // (Effect Intent, situational, typed combat-option contributions) and
  // 'attack.bonus' (WeaponsEngine's weapon-sourced modifiers). Both must
  // resolve stacking in the SAME pass, not two universes keyed by
  // spelling. Normalized here, in memory only, immediately before
  // stacking resolution -- the original Modifier objects (and any
  // persisted item/actor data) are never mutated, and every other field
  // (source, sourceId, sourceName, type, value, priority) survives
  // verbatim into the ledger for provenance.
  const effectIntentModifiers = ModifierEngine.getEffectIntentModifiersForContext(
    actor, { context: buildEffectIntentRollContext(weapon, context, { rollType: 'attack' }), includeBroad: true }
  );
  const situationalContributions = Array.isArray(context.situationalContributions) ? context.situationalContributions : [];
  const typedCombatOptionContributions = Array.isArray(attackOptionModifiers.attackContributions) ? attackOptionModifiers.attackContributions : [];
  // Math Integrity Freeze, Attack Bonus round 6: the SAME target resolver
  // the rest of this file already exports (getTargetActorFromOptions) is
  // reused here -- not a second target resolver -- so a CONDITIONAL_ATTACK
  // crystal (Heart of the Guardian, Hurikane) sees the roll's authoritative
  // target. No target resolvable at all yields no conditional contribution.
  const resolvedTargetActor = getTargetActorFromOptions(context);
  const weaponAttackContributions = getWeaponAttunementAndUpgradeModifiers(actor, weapon, { targetActor: resolvedTargetActor });
  const ATTACK_TARGET_ALIASES = new Set(['global.attack', 'attack.bonus']);
  const normalizeAttackModifierTarget = (mod) => (mod && mod.target !== 'global.attack' && ATTACK_TARGET_ALIASES.has(mod.target))
    ? { ...mod, target: 'global.attack' }
    : mod;
  const typedAttackModifierPool = ModifierUtils.filterModifiers(
    [...effectIntentModifiers, ...situationalContributions, ...typedCombatOptionContributions, ...weaponAttackContributions]
      .map(normalizeAttackModifierTarget),
    'global.attack', true
  );
  const appliedTypedModifiers = ModifierUtils.resolveStacking(typedAttackModifierPool);
  const typedModifierTotal = ModifierUtils.sumModifiers(appliedTypedModifiers);
  // Math Integrity Freeze, Attack Bonus round 4: the suppression reason
  // must describe the ACTUAL stacking rule that suppressed this
  // contribution (per STACKING_RULES[type]), not a hardcoded "highestOnly"
  // string -- circumstance, for example, uses stackUnlessSameSource, and a
  // suppressed circumstance contribution must never be mislabeled as
  // highestOnly.
  const describeStackingSuppression = (type) => {
    const rule = getStackingRule(type);
    if (rule === 'highestOnly') return `suppressed: another ${type} contribution has an equal or higher value and already applies (highestOnly stacking)`;
    if (rule === 'lowestOnly') return `suppressed: another ${type} contribution has an equal or lower value and already applies (lowestOnly stacking)`;
    if (rule === 'stackUnlessSameSource') return `suppressed: another ${type} contribution from the same source already applies (stackUnlessSameSource stacking)`;
    return `suppressed: another ${type} contribution already applies (${rule} stacking)`;
  };
  const suppressedTypedModifiers = typedAttackModifierPool
    .filter(mod => !appliedTypedModifiers.includes(mod))
    .map(modifier => ({ modifier, reason: describeStackingSuppression(modifier.type) }));
  const typedModifierLedger = buildModifierLedger(appliedTypedModifiers, suppressedTypedModifiers, 'combat.attack');

  const combatOptionBonus = attackOptionModifiers.attackBonus || 0;
  const rageBonus = rageModifiers.attackBonus || 0;
  const sithMod = sithCommanderAttackModifier(actor);
  const inquisitionMod = inquisitionAttackBonus(actor, context);
  const unsettlingMod = unsettlingPresenceAttackPenalty(actor);
  const rapidAlchemyMod = rapidAlchemyAttackBonus(actor, weapon);
  const forceItemMod = forceItemAttackBonus(actor, weapon);
  // Suppressed for the NPC-flat branch — see the talentBonus comment above
  // (same "already baked into the printed total" risk; Weapon Focus is the
  // concrete, data-confirmed case).
  const scopedFeatBonus = isNpcFlat ? 0 : ScopedCombatFeatResolver.getBonus(actor, weapon, 'attack', context);

  // Math Integrity Freeze Batch 2A: worn body armor's Armor Check Penalty
  // (0 when proficient, its own listed value -- or the light/medium/heavy
  // category default when the item carries none -- when not) and every
  // active Energy Shield's ACP (which always applies once active,
  // proficient or not) both apply to attack rolls, not just skills. This
  // was previously missing from attack math entirely.
  const armorUsageEffects = resolveArmorUsageEffects(actor);
  const armorAcpPenalty = armorUsageEffects.attackCheckPenalty || 0;

  const total =
    flatOverrideValue +
    bab + abilityMod + miscBonus + rangePenalty + firingIntoMeleePenalty + attackPenalty + ctPenalty +
    proficiencyPenalty + talentBonus + stateBonus + combatOptionBonus + rageBonus +
    sithMod + inquisitionMod + unsettlingMod + rapidAlchemyMod + forceItemMod + typedModifierTotal + scopedFeatBonus +
    armorAcpPenalty;

  const components = {};
  if (isStockDroidFlat) {
    components['Published Statblock Total'] = stockAttackFlat;
  } else if (isNpcFlat) {
    components['NPC Flat'] = npcAttackFlat;
  } else {
    components['BAB'] = bab;
    components[`Ability (${abilityKey.toUpperCase()})`] = abilityMod;
    if (miscBonus !== 0) components['Enhancement'] = miscBonus;
  }
  if (rangePenalty !== 0) components['Range Penalty'] = rangePenalty;
  if (firingIntoMeleePenalty !== 0) components['Firing Into Melee'] = firingIntoMeleePenalty;
  if (attackPenalty !== 0) components['Attack Penalty'] = attackPenalty;
  if (ctPenalty !== 0) components['CT Penalty'] = ctPenalty;
  if (proficiencyPenalty !== 0) components['Proficiency'] = proficiencyPenalty;
  if (talentBonus !== 0) components['Talent'] = talentBonus;
  if (stateBonus !== 0) components['State'] = stateBonus;
  // Math Integrity Freeze, Attack Bonus round 3: each active combat
  // option's own contribution is surfaced by name (already computed by
  // CombatOptionResolver.collectAttackModifiers()'s breakdown array)
  // instead of collapsed into one anonymous "Combat Option" number -- e.g.
  // Powerful Charge keeps its own provenance-bearing row distinct from any
  // other simultaneously active option. Typed/collision-eligible
  // contributions (Relentless Attack, Prime Shot) are routed through
  // attackContributions/typedModifierLedger above instead, and are
  // deliberately excluded from this loop (their breakdown push was removed
  // at the source) to avoid a duplicate ledger entry.
  for (const entry of (attackOptionModifiers.breakdown || [])) {
    if (entry?.type !== 'attack' || !Number(entry.value)) continue;
    components[entry.label] = (components[entry.label] ?? 0) + Number(entry.value);
  }
  if (rageBonus !== 0) components['Rage'] = rageBonus;
  if (sithMod !== 0) components['Sith Commander'] = sithMod;
  if (inquisitionMod !== 0) components['Inquisition'] = inquisitionMod;
  if (unsettlingMod !== 0) components['Unsettling Presence'] = unsettlingMod;
  if (rapidAlchemyMod !== 0) components['Rapid Alchemy'] = rapidAlchemyMod;
  if (forceItemMod !== 0) components['Force Item'] = forceItemMod;
  if (scopedFeatBonus !== 0) components['Scoped Feat'] = scopedFeatBonus;
  // Named per-source so an active Energy Shield's ACP is explicit in the
  // chat/breakdown, not hidden inside a collapsed misc number.
  for (const part of armorUsageEffects.parts) {
    if (part.effect === 'attackAndSkillCheckPenalty' && part.value) {
      components[part.sourceName] = part.value;
    }
  }

  // vehicle-attack-math.js's resolveVehicleAttackBonus() branches on
  // flags.npcFlat to decide whether a gunner's baseline can be decomposed
  // into Gunner BAB + Vehicle INT — preserved verbatim so that contract is
  // unaffected by this branch no longer being an unconditional early return.
  const flags = isStockDroidFlat ? { stockDroidFlat: true } : (isNpcFlat ? { npcFlat: true } : {});
  return { total, components, flags, typedModifierLedger };
}

// PHASE — Stock-Droid Damage Contract. The damage-side counterpart to the
// stock-attack flat-bonus branch above: a stock-imported droid's integrated
// weapon Items carry their PUBLISHED damage formula in
// flags.swse.stockDroidAttack.publishedDamage (see
// scripts/engine/import/stock-droid-importer-engine.js), but until this
// function existed nothing ever consumed it — resolveDamageBonus() applied
// the normal half-level/ability/enhancement composition on top of the
// weapon's base dice for every actor, droid or not, silently double-
// counting damage that was already baked into the published formula.
// Mirrors getStockAttackFlatBonus()'s pattern: gated by the same
// isDroidStatblockMode()/stockDroidAttack.sourceStatblock contract (see
// getStockDamageFormula() in droid-mode-adapter.js), so an attack and its
// paired damage roll can never disagree about whether a weapon is still
// "stock". Only situational damage modifiers (rage, Rapid Alchemy, effect
// intents, combat options, scoped feats) still apply on top of the
// published formula — half-level, ability, and weapon enhancement are
// withheld exactly like resolveAttackBonus() withholds BAB/ability/
// enhancement for stock attack rolls, because those are already baked into
// the printed damage.
//
// Returns null when the published formula should NOT be used (playable-
// derived mode, non-droid actor, or a weapon with no stock damage
// contract) — callers then fall through to normal damage composition.
export function resolveStockDroidDamageContract(actor, weapon, context = {}) {
  const publishedFormula = getStockDamageFormula(actor, weapon);
  if (publishedFormula === null) return null;

  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);
  const rageMod = RageEngine.collectAttackModifiers(actor, weapon, context).damageBonus || 0;
  const rapidAlchemyMod = rapidAlchemyDamageBonusInternal(actor, weapon);
  const basicEffectBonus = getBasicEffectIntentBonus(actor, 'global.damage', weapon, context, { rollType: 'damage' });
  const combatOptionDamage = optionModifiers.damageBonus || 0;
  const scopedFeatDamage = ScopedCombatFeatResolver.getBonus(actor, weapon, 'damage', context);

  // R4-4 — die-based situational modifiers (Rapid Shot/Rapid Strike's
  // damageDieStepBonus, Deadeye/Burst Fire/Mighty Swing's
  // damageExtraWeaponDice, and — on a confirmed critical hit only —
  // criticalDamageDieStepBonus) must still adjust the published formula's
  // DICE portion, exactly as they adjust an ordinary weapon's dice. Only
  // half-level/ability/enhancement (never die-based) are what the
  // published total already bakes in and must be withheld. Mirrors
  // attacks.js's own criticalStepBonus gating: the critical die-step only
  // applies when this roll is a confirmed critical (context.critical/
  // context.isCritical), the same flag attacks.js's rollDamage()/
  // rollAttackAndDamageWithNarration() already pass through as part of
  // rollOptions.
  const isCriticalRoll = context?.critical === true || context?.isCritical === true;
  const dieStepIncreases = Number(optionModifiers.damageDieStepIncreases || 0)
    + (isCriticalRoll ? Number(optionModifiers.criticalDamageDieStepBonus || 0) : 0);
  const extraWeaponDice = Number(optionModifiers.damageExtraWeaponDice ?? optionModifiers.damageDiceStepBonus ?? 0);
  const formula = buildStockDroidDamageFormula(publishedFormula, { dieStepIncreases, extraWeaponDice });

  const situationalTotal = rageMod + rapidAlchemyMod + basicEffectBonus + combatOptionDamage + scopedFeatDamage;

  const components = { 'Published Statblock Formula': formula };
  if (rageMod !== 0) components['Rage'] = rageMod;
  if (rapidAlchemyMod !== 0) components['Rapid Alchemy'] = rapidAlchemyMod;
  if (basicEffectBonus !== 0) components['Effect Intent'] = basicEffectBonus;
  if (combatOptionDamage !== 0) components['Combat Option'] = combatOptionDamage;
  if (scopedFeatDamage !== 0) components['Scoped Feat'] = scopedFeatDamage;

  return { formula, total: situationalTotal, components, flags: { stockDroidFlat: true, stockDamageFormula: formula } };
}

export function resolveDamageBonus(actor, weapon, context = {}) {
  const stockContract = resolveStockDroidDamageContract(actor, weapon, context);
  if (stockContract) {
    return { total: stockContract.total, components: stockContract.components, flags: stockContract.flags };
  }

  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);

  if (optionModifiers?.flags?.damageBaseOnly === true) {
    const enhancement = getWeaponFlatDamageBonus(weapon);
    const optDmgBonus = optionModifiers.damageBonus || 0;
    const total = enhancement + optDmgBonus;
    const components = { 'Enhancement (Base Only)': enhancement };
    if (optDmgBonus !== 0) components['Combat Option'] = optDmgBonus;
    return { total, components, flags: { damageBaseOnly: true } };
  }

  const halfLvl = getHalfLevelDamageBonus(actor, weapon, { ...context, weapon, isWeaponDamage: true });
  const abilityMod = getDamageAbilityContribution(actor, weapon);
  const enhancement = getWeaponFlatDamageBonus(weapon);
  const rageMod = RageEngine.collectAttackModifiers(actor, weapon, context).damageBonus || 0;
  const rapidAlchemyMod = rapidAlchemyDamageBonusInternal(actor, weapon);
  const basicEffectBonus = getBasicEffectIntentBonus(actor, 'global.damage', weapon, context, { rollType: 'damage' });
  const combatOptionDamage = optionModifiers.damageBonus || 0;
  const scopedFeatDamage = ScopedCombatFeatResolver.getBonus(actor, weapon, 'damage', context);

  const total = halfLvl + enhancement + abilityMod + rageMod + rapidAlchemyMod + basicEffectBonus + combatOptionDamage + scopedFeatDamage;

  const components = {};
  if (halfLvl !== 0) components['½ Level'] = halfLvl;
  components['Ability'] = abilityMod;
  if (enhancement !== 0) components['Enhancement'] = enhancement;
  if (rageMod !== 0) components['Rage'] = rageMod;
  if (rapidAlchemyMod !== 0) components['Rapid Alchemy'] = rapidAlchemyMod;
  if (basicEffectBonus !== 0) components['Effect Intent'] = basicEffectBonus;
  if (combatOptionDamage !== 0) components['Combat Option'] = combatOptionDamage;
  if (scopedFeatDamage !== 0) components['Scoped Feat'] = scopedFeatDamage;

  return { total, components, flags: { damageBaseOnly: false } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Damage Modifier SSOT — resolveDamageComposition() / buildDamageFormula()
//
// Damage audit + Damage audit correction #1
// (docs/audits/v2-damage-modifier-authority-audit.md,
// docs/audits/v2-damage-modifier-authority-audit-correction-1.md) confirmed
// a severe live bug: the production damage-roll path every player reaches
// (sheet Damage button + post-attack chat-card Damage button, both
// damage.js#rollDamage()) never applied damageExtraWeaponDice/
// damageDieStepIncreases/criticalDamageDieStepBonus, while a second,
// narrower rollDamage() in attacks.js applied them correctly but had no
// live UI caller for ordinary weapon attacks. This section is the single
// canonical authority both now delegate to.
//
// resolveDamageBonus() above is UNCHANGED and remains the canonical
// ADDITIVE-ONLY numeric bonus resolver — it does not grow new meaning here.
// resolveDamageComposition() is a HIGHER-LEVEL seam in the same module that
// also owns dice-count/die-step/critical composition, which nothing
// downstream of resolveDamageBonus() previously owned. buildDamageFormula()
// is the one pure formula-string assembler both damage.js and attacks.js
// call instead of each hand-rolling `formulaParts.push(...)` independently.
// ─────────────────────────────────────────────────────────────────────────────

const DAMAGE_DIE_LADDER = [2, 3, 4, 6, 8, 10, 12];

function getPrimaryDamageDieFormula(baseFormula) {
  const match = String(baseFormula ?? '').match(/(?:^|[^\d])(\d*)d(\d+)/i);
  if (!match) return null;
  const sides = Number(match[2]);
  return Number.isFinite(sides) && sides > 0 ? `d${sides}` : null;
}

export function buildExtraWeaponDiceFormula(baseFormula, extraDice) {
  const count = Number(extraDice ?? 0);
  if (!Number.isFinite(count) || count <= 0) return '';
  const die = getPrimaryDamageDieFormula(baseFormula);
  if (!die) return '';
  return ` + ${count}${die}`;
}

export function stepDamageDieFormula(baseFormula, steps = 0) {
  const count = Number(steps ?? 0);
  if (!Number.isFinite(count) || count === 0) return String(baseFormula ?? '1d6');
  return String(baseFormula ?? '1d6').replace(/(\d*)d(\d+)/gi, (match, diceCount, sidesText) => {
    const sides = Number(sidesText);
    const index = DAMAGE_DIE_LADDER.indexOf(sides);
    if (index < 0) return match;
    const nextIndex = Math.max(0, Math.min(DAMAGE_DIE_LADDER.length - 1, index + count));
    return `${diceCount || '1'}d${DAMAGE_DIE_LADDER[nextIndex]}`;
  });
}

// ─── Critical Multiplier SSOT ──────────────────────────────────────────────
// Damage audit correction #1 §2/main command "CRITICAL MULTIPLIER SSOT":
// three independent implementations were confirmed before this fix —
// combat-stat-rules.js#getCriticalMultiplier(weapon, fallback) (weapon-only,
// no actor/rule awareness — damage.js's standalone path used this),
// combat-utils.js#getCriticalMultiplier(actor, weapon) (actor/RULES.
// MODIFY_CRITICAL_MULTIPLIER-aware, but not CombatOptionResolver's own
// criticalMultiplierMin-aware), and attacks.js#rollAttack()'s own inline
// Math.max(weapon base, optionModifiers.criticalMultiplierMin) (that
// resolver-aware, but not RULES.MODIFY_CRITICAL_MULTIPLIER-aware). None
// considered both rule sources. This is the one function that does, and the
// only place either duplicate should be called from going forward.
export function resolveCriticalMultiplier(actor, weapon, context = {}, precomputedOptionModifiers = null) {
  // A prior attack roll (the chat-card Damage button's live path) already
  // resolved a canonical multiplier via this same function inside
  // rollAttack() — reuse it verbatim rather than recomputing, so a
  // standalone re-derivation can never disagree with the attack that
  // produced this damage roll. Only a finite, positive number counts as
  // valid canonical context; anything else falls through to a fresh
  // resolution (covers the sheet Damage button and any direct
  // programmatic damage roll, neither of which has a prior attack roll to
  // borrow from).
  const carried = Number(context?.critMultiplier);
  if (Number.isFinite(carried) && carried > 0) return carried;

  let highest = getWeaponBaseCriticalMultiplier(weapon, 2);

  const optionModifiers = precomputedOptionModifiers ?? CombatOptionResolver.collectAttackModifiers(actor, weapon, context);
  const optionMin = Number(optionModifiers?.criticalMultiplierMin);
  if (Number.isFinite(optionMin) && optionMin > 0) highest = Math.max(highest, optionMin);

  if (actor) {
    try {
      const ctx = new ResolutionContext(actor);
      const multRules = ctx.getRuleInstances(RULES.MODIFY_CRITICAL_MULTIPLIER);
      const weaponProf = weapon?.system?.proficiency;
      for (const rule of multRules) {
        if (rule.proficiency === weaponProf && Number(rule.multiplier) > 0) {
          highest = Math.max(highest, Number(rule.multiplier));
        }
      }
    } catch (_err) {
      // ResolutionContext unavailable (actor without frozen rule snapshots
      // yet, e.g. a test fixture) — weapon+option-derived multiplier above
      // still applies; this is not a hard dependency.
    }
  }

  return highest;
}

// ─── Damage target vocabulary unification ──────────────────────────────────
// Damage audit correction #1 §3/§5: ModifierEngine declares 'global.damage'
// (ModifierTypes.js VALID_TARGET_PATTERNS) as the canonical damage target,
// but real pack data (talents.db) uses four historical alias spellings —
// 'damage' | 'damage.weapon' | 'damage.melee' | 'damage.ranged' — consumed
// by CombatOptionResolver's own collectModifierRollBonuses(), a second,
// independent decision point from ModifierEngine's Effect-Intent registry.
// Normalized here, in memory only, immediately before stacking resolution —
// mirrors resolveAttackBonus()'s own ATTACK_TARGET_ALIASES normalization
// for 'global.attack'/'attack.bonus' above. The original Modifier objects
// (and any persisted item/actor data) are never mutated.
const DAMAGE_TARGET_ALIASES = new Set(['damage', 'damage.weapon', 'damage.melee', 'damage.ranged', 'global.damage']);
function normalizeDamageModifierTarget(mod) {
  return (mod && mod.target !== 'global.damage' && DAMAGE_TARGET_ALIASES.has(mod.target))
    ? { ...mod, target: 'global.damage' }
    : mod;
}

function getDamageEffectIntentModifiers(actor, weapon, context = {}) {
  try {
    return ModifierEngine.getEffectIntentModifiersForContext(
      actor, { context: buildEffectIntentRollContext(weapon, context, { rollType: 'damage' }), includeBroad: true }
    );
  } catch (err) {
    console.warn('[SWSE] Failed to collect damage effect-intent modifiers', err);
    return [];
  }
}

/**
 * Canonical Damage composition seam. Returns a structured object — not
 * merely a formula string — so every contribution category stays
 * distinct and inspectable: a dice-shaped modifier (Deadeye's extra
 * weapon die, Sneak Attack's Nd6) is never collapsed into the flat
 * integer total.
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {Object} [context={}] — same roll-context shape resolveDamageBonus()
 *   already accepts (target, critical/isCritical, twoHanded, ...).
 * @returns {{
 *   bonus: {total:number, components:Object, flags:Object},
 *   dice: {base:string, extraWeaponDice:number, dieStepIncreases:number,
 *     criticalDieStepIncreases:number, talentDice:string[], otherDiceTerms:string[]},
 *   critical: {isCritical:boolean, multiplier:number, bonusFormula:string},
 *   damageTypes: string[],
 *   riders: {onHit:Array, onCritical:Array},
 *   flags: Object,
 *   ledger: Array
 * }}
 */
export function resolveDamageComposition(actor, weapon, context = {}) {
  const bonus = resolveDamageBonus(actor, weapon, context);
  const optionModifiers = CombatOptionResolver.collectAttackModifiers(actor, weapon, context);
  const isCriticalRoll = context?.critical === true || context?.isCritical === true;

  // ── Dice shape ────────────────────────────────────────────────────────
  // A stock-statblock droid's published formula (see
  // resolveStockDroidDamageContract() above) already IS the base dice —
  // die-step/extra-dice still adjust it (R4-4, preserved verbatim), it is
  // simply the starting formula instead of weapon.system.damage.
  const base = bonus.flags?.stockDamageFormula ?? String(weapon?.system?.damage ?? weapon?.system?.damageFormula ?? '1d6');
  const criticalDieStepIncreases = isCriticalRoll ? Number(optionModifiers.criticalDamageDieStepBonus || 0) : 0;
  const dieStepIncreases = Number(optionModifiers.damageDieStepIncreases || 0) + criticalDieStepIncreases;
  // Damage audit correction #1 "COLLAPSE damageExtraWeaponDice /
  // damageDiceStepBonus DUPLICATE SURFACE": every producer in
  // CombatOptionResolver already populates both fields with the identical
  // value (a historical dual-write, not two independent contributions) —
  // this composition reads ONLY the canonical damageExtraWeaponDice field,
  // never damageDiceStepBonus, so a source populating both can never be
  // double-counted.
  const extraWeaponDice = Number(optionModifiers.damageExtraWeaponDice || 0);

  const talentContributions = resolveTalentDamageContributions(actor, context);
  const otherDiceTerms = collectSharedDamageDiceTerms(actor, weapon, context);

  // ── Critical state ───────────────────────────────────────────────────
  const multiplier = resolveCriticalMultiplier(actor, weapon, context, optionModifiers);
  const bonusFormula = isCriticalRoll ? getCriticalDamageBonusFormula(actor, weapon) : '';

  // ── Typed damage-modifier vocabulary unification ────────────────────
  // ONE stacking pool for every typed damage contribution this codebase
  // currently produces (Effect-Intent modifiers + CombatOptionResolver's
  // own item-authored abilityMeta.modifiers matches), instead of two
  // independent per-pool stacking decisions that can never see each
  // other's contributions. Ledger-only today (bonus.total above is left
  // numerically unchanged for backward compatibility — see the module
  // header) but proves, via the no-double-application/collision test
  // matrix, that a future same-typed collision across the two sources
  // would resolve correctly.
  const effectIntentDamageModifiers = getDamageEffectIntentModifiers(actor, weapon, context);
  const typedDamagePool = [...effectIntentDamageModifiers, ...(optionModifiers.damageContributions || [])]
    .map(normalizeDamageModifierTarget);
  const filteredTypedPool = ModifierUtils.filterModifiers(typedDamagePool, 'global.damage', true);
  const appliedTypedModifiers = ModifierUtils.resolveStacking(filteredTypedPool);
  const suppressedTypedModifiers = filteredTypedPool
    .filter(mod => !appliedTypedModifiers.includes(mod))
    .map(modifier => ({ modifier, reason: `suppressed: another ${modifier.type} contribution already applies (${getStackingRule(modifier.type)} stacking)` }));
  const typedModifierLedger = buildModifierLedger(appliedTypedModifiers, suppressedTypedModifiers, 'combat.damage');

  const ledger = [
    ...Object.entries(bonus.components || {}).map(([label, value]) => ({
      id: `bonus-${label}`, label, value: Number(value) || 0, category: 'additive', sourceName: label, applied: true
    })),
    ...(dieStepIncreases !== 0 ? [{ id: 'die-step', label: 'Die-Size Step', value: dieStepIncreases, category: 'dieStep', applied: true }] : []),
    ...(extraWeaponDice !== 0 ? [{ id: 'extra-weapon-dice', label: 'Extra Weapon Dice', value: extraWeaponDice, category: 'extraWeaponDice', applied: true }] : []),
    ...talentContributions.breakdown.map((label, index) => ({ id: `talent-dice-${index}`, label, value: talentContributions.bonusDice[index] ?? null, category: 'additionalDice', applied: true })),
    ...otherDiceTerms.map((term, index) => ({ id: `other-dice-${index}`, label: 'Force Item / Inquisition', value: term, category: 'additionalDice', applied: true })),
    ...(isCriticalRoll ? [{ id: 'critical-multiplier', label: 'Critical Multiplier', value: multiplier, category: 'criticalMultiplier', applied: true }] : []),
    ...(bonusFormula ? [{ id: 'critical-bonus', label: 'Critical Bonus Formula', value: bonusFormula, category: 'criticalAddition', applied: true }] : []),
    ...typedModifierLedger
  ];

  return {
    bonus,
    dice: {
      base,
      extraWeaponDice,
      dieStepIncreases,
      criticalDieStepIncreases,
      talentDice: talentContributions.bonusDice,
      talentBreakdown: talentContributions.breakdown,
      otherDiceTerms
    },
    critical: { isCritical: isCriticalRoll, multiplier, bonusFormula },
    damageTypes: Array.isArray(context.damageTypes) ? context.damageTypes : [],
    riders: {
      onHit: optionModifiers.targetEffectsOnHit || [],
      onCritical: optionModifiers.targetEffectsOnCritical || []
    },
    flags: { ...bonus.flags },
    ledger,
    talentNotifications: talentContributions.notifications
  };
}

// Kept as a private, lazily-imported helper (not a top-level import) to
// avoid combat-roll-math.js importing combat-utils.js — combat-utils.js
// already imports resolveAttackBonus/resolveDamageBonus FROM this module,
// so a static top-level import the other way would be circular. Only the
// critical-bonus-FORMULA string helper is needed here (getCriticalMultiplier
// itself is fully reimplemented above as resolveCriticalMultiplier, not
// borrowed), and it is read-only/pure, so a dynamic import at call time is
// safe and has no behavioral cost beyond the first call.
let _getCriticalDamageBonusFormulaFn = null;
function getCriticalDamageBonusFormula(actor, weapon) {
  if (!actor || !weapon) return '';
  try {
    if (!_getCriticalDamageBonusFormulaFn) {
      // Synchronous fallback: combat-utils.js's own RULES-based lookup is
      // trivially reimplementable here without importing the module — it
      // is exactly the same ResolutionContext/RULES primitives already
      // imported above, so this stays import-cycle-free.
      _getCriticalDamageBonusFormulaFn = (a, w) => {
        try {
          const ctx = new ResolutionContext(a);
          const rules = ctx.getRuleInstances(RULES.CRITICAL_DAMAGE_BONUS);
          const weaponProf = w?.system?.proficiency;
          const bonuses = rules.filter(rule => rule.proficiency === weaponProf && rule.bonus).map(rule => String(rule.bonus));
          return bonuses.length > 0 ? bonuses.join(' + ') : '';
        } catch (_err) {
          return '';
        }
      };
    }
    return _getCriticalDamageBonusFormulaFn(actor, weapon) || '';
  } catch (_err) {
    return '';
  }
}

/**
 * Pure formula-string assembler. The ONLY production function responsible
 * for combining base dice, die-size steps, extra weapon dice, additive
 * numeric damage, talent/special dice, Force Item/Inquisition dice,
 * critical multiplier, critical-only die-step (already folded into
 * composition.dice.dieStepIncreases), and the critical bonus formula, in
 * that order. damage.js#rollDamage() and attacks.js#rollDamage() both call
 * this instead of each hand-rolling their own formulaParts.push(...) —
 * this is the actual fix for the confirmed live dice-shape bug, since
 * there is no longer a second, incomplete builder for a field to be
 * silently unread by.
 *
 * @param {ReturnType<typeof resolveDamageComposition>} composition
 * @param {Object} [options={}]
 * @param {Array<string|number>} [options.extraTerms] — invocation-only,
 *   per-roll additions that are not contribution-producer-sourced (Force
 *   Point bonus, a UI custom modifier) — these have never been modeled as
 *   named contributions anywhere in this codebase (mirrors how
 *   computeFinalAttackComposition() layers Fighting Defensively/custom
 *   modifier onto resolveAttackBonus() as invocation-only additions rather
 *   than folding them into the resolver itself).
 * @param {boolean} [options.isAreaAttack] — RAW: area attacks do not deal
 *   double damage on a critical.
 * @returns {string}
 */
export function buildDamageFormula(composition, options = {}) {
  const { extraTerms = [], isAreaAttack: isArea = false } = options;
  const dice = composition?.dice ?? {};

  const stepped = stepDamageDieFormula(dice.base, dice.dieStepIncreases || 0);
  const extraDiceFormula = buildExtraWeaponDiceFormula(stepped, dice.extraWeaponDice || 0);

  const parts = [`${stepped}${extraDiceFormula}`];

  const bonusTotal = Number(composition?.bonus?.total || 0);
  if (bonusTotal !== 0) parts.push(bonusTotal.toString());

  for (const term of dice.talentDice || []) {
    if (term) parts.push(term);
  }
  for (const term of dice.otherDiceTerms || []) {
    if (term) parts.push(term);
  }
  for (const term of extraTerms) {
    if (term === undefined || term === null || term === '' || term === 0) continue;
    parts.push(String(term));
  }

  let formula = parts.join(' + ');

  const isCritical = composition?.critical?.isCritical === true;
  const multiplier = Number(composition?.critical?.multiplier || 2);
  if (isCritical && !isArea && multiplier > 1) {
    formula = `(${formula}) * ${multiplier}`;
  }
  if (isCritical && composition?.critical?.bonusFormula) {
    formula = `${formula} + (${composition.critical.bonusFormula})`;
  }

  return formula;
}
