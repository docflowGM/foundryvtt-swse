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
  getWeaponFlatAttackBonus,
  getWeaponFlatDamageBonus,
  isVehicleWeapon
} from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { ModifierUtils } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js";
import { buildModifierLedger } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/modifier-breakdown-builder.js";
import { ImplantEffectRules } from "/systems/foundryvtt-swse/scripts/engine/implants/ImplantEffectRules.js";
import { ScopedCombatFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feat/scoped-combat-feat-resolver.js";
import { resolveArmorUsageEffects } from "/systems/foundryvtt-swse/scripts/engine/effects/armor-usage-resolver.js";

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

  // Math Integrity Freeze, Attack Bonus round 3 (blocker fix): typed,
  // collision-eligible attack contributions -- Basic Effect Intent
  // modifiers, situational contextual contributions (Charge, Flanking --
  // built by roll-config.js#computeAttackSituationalContext and threaded
  // through here via context.situationalContributions), and any typed
  // combat-option contribution (Relentless Attack's competence bonus, Prime
  // Shot's circumstance bonus -- both emitted via attackOptionModifiers.
  // attackContributions instead of the flat attackBonus number they used to
  // fold into) -- must resolve stacking TOGETHER, in ONE pass, not as
  // separately pre-summed numbers added afterward. Previously each was
  // reduced to a scalar in its own isolated stacking pass (or, for the
  // combat-option channel, not stacking-resolved at all) before being
  // summed here, so a same-type collision across channels -- e.g. an Active
  // Effect's +4 competence bonus and Charge's own +2 competence bonus --
  // would silently both apply in full (+6) instead of only the higher
  // winning (+4), per this codebase's own COMPETENCE stacking rule
  // (STACKING_RULES.competence === 'highestOnly'). Mirrors the identical
  // fix already shipped for the Grapple domain
  // (grappling-system.js#_rollGrappleBonus /
  // collectContextualGrappleModifiers's own doc comment) -- reusing the
  // same shared authority (ModifierUtils.resolveStacking()), not a new
  // attack-specific stacking engine.
  const effectIntentModifiers = ModifierEngine.getEffectIntentModifiersForContext(
    actor, { context: buildEffectIntentRollContext(weapon, context, { rollType: 'attack' }), includeBroad: true }
  );
  const situationalContributions = Array.isArray(context.situationalContributions) ? context.situationalContributions : [];
  const typedCombatOptionContributions = Array.isArray(attackOptionModifiers.attackContributions) ? attackOptionModifiers.attackContributions : [];
  const typedAttackModifierPool = ModifierUtils.filterModifiers(
    [...effectIntentModifiers, ...situationalContributions, ...typedCombatOptionContributions],
    'global.attack', true
  );
  const appliedTypedModifiers = ModifierUtils.resolveStacking(typedAttackModifierPool);
  const typedModifierTotal = ModifierUtils.sumModifiers(appliedTypedModifiers);
  const suppressedTypedModifiers = typedAttackModifierPool
    .filter(mod => !appliedTypedModifiers.includes(mod))
    .map(modifier => ({ modifier, reason: `suppressed: another ${modifier.type} contribution already applies (highestOnly stacking)` }));
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
