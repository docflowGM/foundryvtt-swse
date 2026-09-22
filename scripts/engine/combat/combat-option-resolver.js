import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import {
  isNaturalWeaponOnly as canonicalIsNaturalWeaponOnly
} from "/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js";
// Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 4):
// these were previously private copies defined in this file; extracted
// verbatim (pure move, no behavior change) into a neutral shared module so
// the groundwork Action Authority (ActionAvailabilityEngine) can delegate
// to the SAME classification logic instead of maintaining a second,
// independently-drifting implementation.
import {
  normalizeKey, getAttackType, normalizeRangeBand, getRangeBand, contextManeuver,
  weaponText, weaponDamageText, isVehicleWeapon, targetText, targetHasOwnedItem,
  weaponMatchesGroup, textMatchesAny, isUnarmedWeapon, isAreaAttackContext,
  weaponSupportsAutofire, actorItems, getSelectedChoiceValues,
  weaponMatchesSelectedChoice, actorHasFeatSelectedChoiceMatchingWeapon
} from "/systems/foundryvtt-swse/scripts/engine/combat/weapon-target-gate-classifiers.js";

const ATTACK_OPTION_RULE = "ATTACK_OPTION";

const DEFAULT_ATTACK_OPTIONS = {
  powerAttack: { id: "powerAttack", label: "Power Attack", control: "slider", max: 5, resource: "baseAttackBonus", requiresAttackType: "melee", attackModifierFormula: "-value", damageModifierFormula: "value", summary: "Trade attack bonus for bonus melee damage." },
  meleeDefense: { id: "meleeDefense", label: "Melee Defense", control: "slider", max: 5, resource: "baseAttackBonus", requiresAttackType: "melee", attackModifierFormula: "-value", defenseModifier: { target: "defense.reflex", type: "dodge", valueFormula: "value", duration: "untilStartOfNextTurn" }, summary: "Trade attack bonus for a dodge bonus to Reflex Defense until your next turn." },
  rapidShot: { id: "rapidShot", label: "Rapid Shot", control: "toggle", requiresAttackType: "ranged", attackModifier: -2, damageDiceStepBonus: 1, summary: "Take -2 on a ranged attack to deal +1 die of damage." },
  rapidStrike: { id: "rapidStrike", label: "Rapid Strike", control: "toggle", requiresAttackType: "melee", attackModifier: -2, damageDiceStepBonus: 1, summary: "Take -2 on a melee attack to deal +1 die of damage." },
  carefulShot: { id: "carefulShot", label: "Careful Shot", control: "toggle", requiresAttackType: "ranged", requiresAim: true, attackModifier: 1, summary: "When aiming with a ranged weapon, gain +1 on the attack roll." },
  deadeye: { id: "deadeye", label: "Deadeye", control: "toggle", requiresAttackType: "ranged", requiresAim: true, damageExtraWeaponDice: 1, summary: "When aiming with a ranged weapon, deal +1 weapon die of damage." },
  burstFire: { id: "burstFire", label: "Burst Fire", control: "toggle", requiresAttackType: "ranged", requiresAutofire: true, attackModifier: -5, damageExtraWeaponDice: 2, ammunitionCost: 5, summary: "Use autofire against one target: -5 attack, +2 weapon dice, spend five shots." },
  farShot: { id: "farShot", label: "Far Shot", control: "passive", requiresAttackType: "ranged", rangePenaltyAdjustment: "oneStepCloser", summary: "Treat short, medium, and long range as one range band closer." },
  preciseShot: { id: "preciseShot", label: "Precise Shot", control: "flag", requiresAttackType: "ranged", suppresses: ["firingIntoMeleePenalty"], summary: "Ignore the attack penalty for firing into melee where that penalty is applied." },
  runningAttack: { id: "runningAttack", label: "Running Attack", control: "flag", summary: "Movement-dependent attack option. Exposed as a combat flag; movement validation is not automated yet." },
  powerfulCharge: { id: "powerfulCharge", label: "Powerful Charge", control: "toggle", requiresAttackType: "melee", requiresCharge: true, attackModifier: 2, damageModifierFormula: "halfLevel", summary: "When charging with a melee attack, gain +2 attack and add half level to damage." },
  chargingFire: { id: "chargingFire", label: "Charging Fire", control: "flag", requiresAttackType: "ranged", requiresCharge: true, suppresses: ["chargeAttackBonus"], defenseModifier: { target: "defense.reflex", type: "untyped", value: -2, duration: "untilStartOfNextTurn" }, summary: "Make a ranged attack at the end of a charge without the normal charge attack bonus." },
  improvedDisarm: { id: "improvedDisarm", label: "Improved Disarm", control: "toggle", requiresAttackType: "melee", requiresManeuver: "disarm", attackModifier: 5, suppresses: ["failedDisarmCounterattack"], summary: "Gain +5 on melee attacks made specifically to disarm." },
  mightySwing: { id: "mightySwing", label: "Mighty Swing", control: "toggle", requiresAttackType: "melee", requiresSwiftActions: 2, damageExtraWeaponDice: 1, summary: "Spend two swift actions to add one weapon die to your next melee attack." }
};

function scalarText(value) { if (value == null) return ""; if (["string", "number", "boolean"].includes(typeof value)) return String(value); if (typeof value === "object") { for (const key of ["value", "id", "key", "slug", "name", "label", "type"]) if (value[key] != null && value[key] !== value) return scalarText(value[key]); } return ""; }
function lowerScalar(value) { return scalarText(value).trim().toLowerCase(); }
function camelize(value) { const key = normalizeKey(value); return key.replace(/-([a-z0-9])/g, (_m, c) => c.toUpperCase()); }
// Math Integrity Freeze, Attack Bonus round 8 correction #1 (Blocker 1):
// this used to accept ANY abilityMeta.rules entry carrying an `option` or
// `id` field, regardless of its own declared `type` -- real shipped packs
// carry 180+ non-ATTACK_OPTION rules (RUNTIME_CONTEXT_REFERENCE, TALENT_
// RULE, HIT_RIDER, CRITICAL_RIDER, ZONE_ATTACK_PENALTY, DEFENSE_BONUS, ...)
// that also happen to carry an `id` for THEIR OWN unrelated purposes --
// Oath of Duty, Force Warning, Healing Boost, Enhance Cover, and dozens
// more were all silently eligible to render as "Your Attack Options"
// checkboxes. Only an explicit `type: 'ATTACK_OPTION'` may enter this
// pipeline. abilityMeta.primitives[]/abilityMeta.attackOption remain
// supported as dedicated, single-purpose compatibility slots (no shipped
// record uses either today -- verified against every pack), but a
// primitive still requires its own explicit ATTACK_OPTION type, and the
// singular `attackOption` slot's presence is itself the declaration (it is
// not a mixed-type collection like `rules`) -- it is normalized to carry
// the type explicitly, and rejected outright if it declares a conflicting
// one. This is the one shared extraction contract; the coverage-report
// tool (tools/report-attack-option-coverage.mjs) imports it directly
// rather than re-implementing its own parser, so the two can never
// disagree about what counts as a generic ATTACK_OPTION record.
export function extractAttackOptionRules(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const rules = [];
  const pushIfAttackOption = (rule) => {
    if (!rule || typeof rule !== "object") return;
    if (rule.type !== ATTACK_OPTION_RULE) return;
    rules.push(rule);
  };
  if (Array.isArray(meta.rules)) meta.rules.forEach(pushIfAttackOption);
  if (Array.isArray(meta.primitives)) {
    for (const primitive of meta.primitives) {
      if (primitive?.type !== ATTACK_OPTION_RULE) continue;
      const data = primitive.data && typeof primitive.data === "object" ? primitive.data : primitive;
      pushIfAttackOption(data.type === ATTACK_OPTION_RULE ? data : { ...data, type: ATTACK_OPTION_RULE });
    }
  }
  if (meta.attackOption && typeof meta.attackOption === "object") {
    const declaredType = meta.attackOption.type;
    if (declaredType === undefined || declaredType === ATTACK_OPTION_RULE) {
      pushIfAttackOption(declaredType === ATTACK_OPTION_RULE ? meta.attackOption : { ...meta.attackOption, type: ATTACK_OPTION_RULE });
    }
  }
  return rules;
}
function getFeatRules(item) { return extractAttackOptionRules(item); }
function asArray(value) { if (value === undefined || value === null) return []; return Array.isArray(value) ? value : [value]; }
function actorBAB(actor) { const value = Number(SchemaAdapters.getBAB(actor) ?? actor?.system?.attributes?.bab?.value ?? actor?.system?.bab ?? 0); return Number.isFinite(value) ? Math.max(0, value) : 0; }
function actorLevel(actor) { const candidates = [actor?.system?.details?.level, actor?.system?.level, actor?.system?.attributes?.level, actor?.system?.progression?.level, actor?.system?.progression?.characterLevel]; for (const candidate of candidates) { const value = Number(candidate); if (Number.isFinite(value) && value > 0) return value; } return 1; }
function actorAbilityMod(actor, ability) { const key = String(ability || '').toLowerCase().slice(0, 3); if (!key) return 0; const numeric = Number(SchemaAdapters.getAbilityMod?.(actor, key) ?? 0); return Number.isFinite(numeric) ? numeric : 0; }
function getRangePenaltyAdjustment(option, context = {}) { if (option.rangePenaltyAdjustment !== "oneStepCloser") return 0; const band = getRangeBand(context); if (band === "short") return 2; if (band === "medium") return 3; if (band === "long") return 5; return 0; }
// Math Integrity Freeze, Batch 2B: delegated to the canonical natural/
// unarmed authority (scripts/items/weapon-branch-resolver.js).
function isNaturalWeapon(weapon) { if (!weapon) return false; if (weapon?.system?.properties?.naturalWeapon === true || weapon?.system?.properties?.["natural-weapon"] === true) return true; return canonicalIsNaturalWeaponOnly(weapon); }
function isPointBlankContext(context = {}) { return context.pointBlankRange === true || context.isPointBlank === true || getRangeBand(context) === "point-blank"; }
function modifierAppliesToWeaponRoll(item, modifier, weapon, context = {}) { if (!modifier || modifier.enabled === false) return false; const predicates = Array.isArray(modifier.predicates) ? modifier.predicates : []; for (const predicate of predicates) { switch (predicate) { case "attack.weapon-matches-selected-choice": if (!weaponMatchesSelectedChoice(item, weapon, context)) return false; break; case "attack.with-ranged": if (getAttackType(weapon, context) !== "ranged") return false; break; case "attack.with-melee": if (getAttackType(weapon, context) !== "melee") return false; break; case "range.within-point-blank": if (!isPointBlankContext(context)) return false; break; default: return false; } } return true; }
function collectModifierRollBonuses(item, weapon, context = {}) { const result = { attackBonus: 0, damageBonus: 0, breakdown: [] }; const modifiers = item?.system?.abilityMeta?.modifiers; if (!Array.isArray(modifiers)) return result; for (const modifier of modifiers) { if (!modifierAppliesToWeaponRoll(item, modifier, weapon, context)) continue; const value = Number(modifier.value ?? 0); if (!Number.isFinite(value) || value === 0) continue; const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target]; for (const target of targets.map(t => String(t || ""))) { if (target === "attack" || target === "attack.bonus") { const selectedChoiceOnly = (modifier.predicates || []).includes("attack.weapon-matches-selected-choice"); if (!selectedChoiceOnly) continue; result.attackBonus += value; result.breakdown.push({ label: modifier.description || item.name, value, type: "attack" }); } else if (["damage", "damage.weapon", "damage.ranged", "damage.melee"].includes(target)) { result.damageBonus += value; result.breakdown.push({ label: modifier.description || item.name, value, type: "damage" }); } } } return result; }
function ruleAppliesToWeapon(rule, item, weapon, context = {}) { if (!rule || rule.enabled === false) return false; if (rule.selectedChoice === true && !weaponMatchesSelectedChoice(item, weapon, context)) return false; if (rule.weaponGroups && !weaponMatchesGroup(weapon, rule.weaponGroups, context)) return false; if (rule.groups && !weaponMatchesGroup(weapon, rule.groups, context)) return false; if (rule.requiresWeaponGroups && !weaponMatchesGroup(weapon, rule.requiresWeaponGroups, context)) return false; if (rule.requiresWeaponText && !textMatchesAny(weaponText(weapon), rule.requiresWeaponText)) return false; if (rule.weaponText && !textMatchesAny(weaponText(weapon), rule.weaponText)) return false; if (rule.requiresAttackType && getAttackType(weapon, context) !== String(rule.requiresAttackType).toLowerCase()) return false; if (rule.requiresDamageType && !textMatchesAny(weaponDamageText(weapon), rule.requiresDamageType)) return false; if (rule.excludesDamageType && textMatchesAny(weaponDamageText(weapon), rule.excludesDamageType)) return false; return true; }

function collectWeaponRuleModifiers(actor, weapon, context = {}) {
  const result = { attackBonus: 0, attackAbilityBonus: 0, damageBonus: 0, damageExtraWeaponDice: 0, damageDiceStepBonus: 0, damageDieStepIncreases: 0, criticalDamageDieStepBonus: 0, criticalThreatNaturalMin: null, criticalMultiplierMin: null, targetEffectsOnHit: [], targetEffectsOnCritical: [], flags: {}, breakdown: [] };
  const appliedStackingKeys = new Set();
  for (const item of actorItems(actor)) {
    const rules = item?.system?.abilityMeta?.rules;
    if (Array.isArray(rules)) for (const rule of rules) {
      switch (rule?.type) {
        case "WEAPON_DAMAGE_DIE_STEP": {
          if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue;
          const value = Number(rule.value ?? rule.steps ?? 0);
          if (!Number.isFinite(value) || value === 0) continue;
          result.damageExtraWeaponDice += value;
          result.damageDiceStepBonus += value;
          result.breakdown.push({ label: rule.label || item.name, value, type: "damageExtraWeaponDice" });
          break;
        }
        case "WEAPON_DAMAGE_DIE_SIZE_STEP": {
          if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue;
          const value = Number(rule.value ?? rule.steps ?? 0);
          if (!Number.isFinite(value) || value === 0) continue;
          result.damageDieStepIncreases += value;
          result.breakdown.push({ label: rule.label || item.name, value, type: "damageDieStepIncrease" });
          break;
        }
        case "WEAPON_PROPERTY_OVERRIDE": {
          if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue;
          const property = normalizeKey(rule.property ?? rule.key ?? rule.flag ?? 'property');
          if (!property) continue;
          result.flags[`weaponProperty.${property}`] = rule.value ?? true;
          result.breakdown.push({ label: rule.label || item.name, value: 0, type: "weaponProperty" });
          break;
        }
        case "BRACE_AUTOFIRE_ALLOWED": {
          if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue;
          result.flags.braceAutofireAllowed = true;
          result.breakdown.push({ label: rule.label || item.name, value: 0, type: "braceAutofireAllowed" });
          break;
        }
        case "EFFECTIVE_WEAPON_SIZE": {
          if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue;
          result.flags.effectiveWeaponSize = rule.size ?? rule.value ?? 'medium';
          result.breakdown.push({ label: rule.label || item.name, value: 0, type: "effectiveWeaponSize" });
          break;
        }
        case "UNARMED_DAMAGE_STEP": { if (!isUnarmedWeapon(weapon, context) || weapon?.flags?.swse?.martialArtsDamageApplied === true) continue; const value = Number(rule.value ?? rule.steps ?? rule.params?.steps ?? 0); if (!Number.isFinite(value) || value === 0) continue; result.damageDieStepIncreases += value; result.breakdown.push({ label: item.name, value, type: "damageDieStepIncrease" }); break; }
        case "UNARMED_EXTRA_WEAPON_DICE": { if (!isUnarmedWeapon(weapon, context) || weapon?.flags?.swse?.unarmedExtraWeaponDiceApplied === true) continue; const stackingKey = String(rule.stackingKey || rule.stackKey || rule.id || ""); if (stackingKey && rule.stacking === "highest" && appliedStackingKeys.has(stackingKey)) continue; const value = Number(rule.value ?? rule.dice ?? rule.extraDice ?? rule.params?.dice ?? 0); if (!Number.isFinite(value) || value === 0) continue; if (stackingKey && rule.stacking === "highest") appliedStackingKeys.add(stackingKey); result.damageExtraWeaponDice += value; result.damageDiceStepBonus += value; result.breakdown.push({ label: rule.label || item.name, value, type: "damageExtraWeaponDice" }); break; }
        case "UNARMED_DOES_NOT_PROVOKE_AOO": { if (!isUnarmedWeapon(weapon, context)) continue; result.flags.unarmedDoesNotProvokeAoO = true; break; }
        case "ATTACK_ABILITY_SUBSTITUTION": { if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue; const from = String(rule.fromAbility || "str").toLowerCase().slice(0, 3); const to = String(rule.toAbility || "dex").toLowerCase().slice(0, 3); const fromMod = actorAbilityMod(actor, from); const toMod = actorAbilityMod(actor, to); const value = rule.useBetter === false ? (toMod - fromMod) : Math.max(0, toMod - fromMod); if (!value) continue; const previous = Number(result.flags._attackAbilitySubstitutionValue || 0); if (value <= previous) continue; const delta = value - previous; result.attackAbilityBonus += delta; result.flags._attackAbilitySubstitutionValue = value; result.flags._attackAbilitySubstitutionSource = item.name; result.breakdown.push({ label: item.name, value: delta, type: "attackAbilitySubstitution" }); break; }
        case "ATTACK_ABILITY_BONUS": { if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue; const ability = String(rule.ability || "str").toLowerCase().slice(0, 3); const value = actorAbilityMod(actor, ability); if (!value) continue; result.attackAbilityBonus += value; result.breakdown.push({ label: item.name, value, type: "attackAbilityBonus" }); break; }
        case "WEAPON_ATTACK_BONUS": { if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue; const value = Number(rule.value ?? rule.bonus ?? rule.params?.bonus ?? 0); if (!Number.isFinite(value) || value === 0) continue; result.attackBonus += value; result.breakdown.push({ label: rule.label || item.name, value, type: "attack" }); break; }
        case "WEAPON_DAMAGE_BONUS": { if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue; const value = Number(rule.value ?? rule.bonus ?? rule.params?.bonus ?? 0); if (!Number.isFinite(value) || value === 0) continue; result.damageBonus += value; result.breakdown.push({ label: rule.label || item.name, value, type: "damage" }); break; }
        case "CRITICAL_DAMAGE_DIE_STEP": { if (rule.requiresUnarmed && !isUnarmedWeapon(weapon, context)) continue; if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue; const value = Number(rule.value ?? rule.steps ?? 0); if (!Number.isFinite(value) || value === 0) continue; result.criticalDamageDieStepBonus += value; result.breakdown.push({ label: item.name, value, type: "criticalDamageDieStepBonus" }); break; }
        case "EXTEND_CRITICAL_RANGE": { const params = rule.params ?? {}; const rawGroups = [...asArray(rule.weaponGroups), ...asArray(rule.groups), params.proficiency, params.weaponGroup].filter(Boolean); const expandedGroups = []; for (const group of rawGroups) { const key = normalizeKey(group); if (!key) continue; expandedGroups.push(key); if (key.endsWith("-weapons")) expandedGroups.push(key.replace(/-weapons$/, "")); if (key.endsWith("-weapon")) expandedGroups.push(key.replace(/-weapon$/, "")); } if (rule.selectedChoice === true && !weaponMatchesSelectedChoice(item, weapon, context)) continue; if (expandedGroups.length && !weaponMatchesGroup(weapon, expandedGroups, context)) continue; const by = Number(rule.by ?? rule.value ?? params.by ?? 1); if (!Number.isFinite(by) || by <= 0) continue; const threshold = Math.max(2, 20 - by); result.criticalThreatNaturalMin = result.criticalThreatNaturalMin ? Math.min(result.criticalThreatNaturalMin, threshold) : threshold; result.breakdown.push({ label: rule.label || item.name, value: threshold, type: "criticalThreatNaturalMin" }); break; }
        case "CRITICAL_RIDER": { if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue; const effects = Array.isArray(rule.targetEffectsOnCritical) ? rule.targetEffectsOnCritical : Array.isArray(rule.effects) ? rule.effects : []; if (!effects.length) continue; result.targetEffectsOnCritical.push(...effects.map(effect => ({ ...effect, sourceName: item.name, sourceRule: rule.id || rule.type }))); result.breakdown.push({ label: rule.label || item.name, value: 0, type: "criticalRider" }); break; }
        case "HIT_RIDER": { if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue; const effects = Array.isArray(rule.targetEffectsOnHit) ? rule.targetEffectsOnHit : Array.isArray(rule.effects) ? rule.effects : []; if (!effects.length) continue; result.targetEffectsOnHit.push(...effects.map(effect => ({ ...effect, sourceName: item.name, sourceRule: rule.id || rule.type }))); result.breakdown.push({ label: rule.label || item.name, value: 0, type: "hitRider" }); break; }
        case "WEAPON_CRITICAL_MULTIPLIER_MIN": { if (!ruleAppliesToWeapon(rule, item, weapon, context)) continue; const value = Number(rule.value ?? rule.multiplier ?? rule.minimum ?? 0); if (!Number.isFinite(value) || value <= 0) continue; result.criticalMultiplierMin = Math.max(result.criticalMultiplierMin || 0, value); if (Array.isArray(rule.targetEffectsOnCritical)) result.targetEffectsOnCritical.push(...rule.targetEffectsOnCritical.map(effect => ({ ...effect, sourceName: item.name }))); result.breakdown.push({ label: item.name, value, type: "criticalMultiplierMin" }); break; }
        default: break;
      }
    }
    const modifierRollBonuses = collectModifierRollBonuses(item, weapon, context); result.attackBonus += modifierRollBonuses.attackBonus || 0; result.damageBonus += modifierRollBonuses.damageBonus || 0; result.breakdown.push(...(modifierRollBonuses.breakdown || []));
  }
  return result;
}

function collectCombinedFeatModifiers(actor, weapon, context = {}) { const result = { attackAbilityBonus: 0, breakdown: [], flags: {} }; if (!actor || !weapon) return result; const weaponGroup = lowerScalar(weapon?.system?.weaponCategory ?? weapon?.system?.type ?? ''); const alreadyCoveredByWF = weaponGroup === 'light' || weaponGroup === 'light-melee' || weaponGroup === 'lightsaber' || weaponMatchesGroup(weapon, ['light', 'light-melee', 'lightsaber'], context); if (alreadyCoveredByWF) return result; const hasWF = actorItems(actor).some(i => String(i?.type ?? '').toLowerCase() === 'feat' && String(i?.name ?? '').trim().toLowerCase() === 'weapon finesse'); if (!hasWF) return result; if (!actorHasFeatSelectedChoiceMatchingWeapon(actor, ['weapon focus'], weapon, context)) return result; const traits = Array.isArray(weapon?.system?.traits) ? weapon.system.traits.map(t => String(t?.name ?? t ?? '').toLowerCase()) : []; if (traits.includes('two-handed') || traits.includes('twohanded')) return result; if (weaponGroup === 'heavy' || weaponGroup === 'vehicle') return result; const delta = Math.max(0, actorAbilityMod(actor, 'dex') - actorAbilityMod(actor, 'str')); if (!delta) return result; result.attackAbilityBonus = delta; result.flags._attackAbilitySubstitutionValue = delta; result.flags._attackAbilitySubstitutionSource = 'Weapon Focus + Weapon Finesse (combined feat)'; result.breakdown.push({ label: 'Weapon Focus + Weapon Finesse (combined feat)', value: delta, type: 'attackAbilitySubstitution' }); return result; }
// Math Integrity Freeze, Attack Bonus round 8 correction #1 (Blocker 3/
// option-state model expansion): getAttackOptionsWithState()'s discovery
// probe forces the three simple boolean context gates (aim/charge/
// autofire/isPointBlank) true via ATTACK_OPTION_PROBE_CONTEXT_OVERRIDES,
// but target-state gates (requiresTargetType/Feat/Talent/Item/Text/
// FlatFooted/DeniedDexBonus) and requiresOption cannot be probe-satisfied
// the same way -- they inspect a real target actor or another option's
// live value, not a flat boolean. This internal-only flag (set SOLELY by
// getAttackOptionsWithState()'s probe pass below, never by a real caller)
// tells this function to treat those specific gates as satisfied for
// DISCOVERY purposes only, so an option blocked ONLY by one of them is
// found (and can be given a truthful "Requires a target" / "Requires X to
// be selected first" reason) rather than vanishing as if unowned. Every
// other gate (weapon group, attack type, weapon text, ...) is NEVER
// bypassed by this flag -- an option genuinely wrong for this weapon still
// never appears, probe or not.
function optionAllowedForWeapon(option, actor, weapon, context = {}) { const probingDiscoveryGates = context.__probeDiscoveryGates === true; const attackType = getAttackType(weapon, context); if (option.requiresAttackType && option.requiresAttackType !== "any" && attackType !== "unknown" && attackType !== option.requiresAttackType) return false; if (option.requiresManeuver && contextManeuver(context) !== normalizeKey(option.requiresManeuver)) return false; if (option.requiresAim && context.aim !== true) return false; if (option.requiresCharge && context.charge !== true) return false; if (option.requiresAutofire && !weaponSupportsAutofire(weapon, context)) return false; if (option.requiresUnarmed && !isUnarmedWeapon(weapon, context)) return false; if (option.requiresWeaponGroups && !weaponMatchesGroup(weapon, option.requiresWeaponGroups, context)) return false; if (option.requiresWeaponText && !textMatchesAny(weaponText(weapon), option.requiresWeaponText)) return false; if (option.requiresVehicleWeapon && !isVehicleWeapon(weapon, context)) return false; if (option.requiresFeatSelectedChoiceMatch && !actorHasFeatSelectedChoiceMatchingWeapon(actor, option.requiresFeatSelectedChoiceMatch, weapon, context)) return false; if (option.requiresDamageType && !textMatchesAny(weaponDamageText(weapon), option.requiresDamageType)) return false; if (option.excludesDamageType && textMatchesAny(weaponDamageText(weapon), option.excludesDamageType)) return false; if (!probingDiscoveryGates && option.requiresTargetType && !textMatchesAny(targetText(context), option.requiresTargetType)) return false; if (!probingDiscoveryGates && option.requiresTargetFeat && !targetHasOwnedItem(context, option.requiresTargetFeat, ['feat'])) return false; if (!probingDiscoveryGates && option.requiresTargetTalent && !targetHasOwnedItem(context, option.requiresTargetTalent, ['talent'])) return false; if (!probingDiscoveryGates && option.requiresTargetItem && !targetHasOwnedItem(context, option.requiresTargetItem)) return false; if (!probingDiscoveryGates && option.requiresTargetText && !textMatchesAny(targetText(context), option.requiresTargetText)) return false; if (!probingDiscoveryGates && option.requiresOption) { const combat = context?.combatOptions ?? context?.attackOptions ?? {}; if (!combat?.[option.requiresOption]) return false; } if (option.requiresRangeBand) { const allowed = Array.isArray(option.requiresRangeBand) ? option.requiresRangeBand : [option.requiresRangeBand]; const band = getRangeBand(context); if (!allowed.map(normalizeRangeBand).includes(band)) return false; } if (option.requiresContextFlags) { const required = Array.isArray(option.requiresContextFlags) ? option.requiresContextFlags : [option.requiresContextFlags]; const flags = new Set([...(Array.isArray(context.flags) ? context.flags : []), ...(Array.isArray(context.contextFlags) ? context.contextFlags : [])].map(String)); for (const flag of required.map(String)) if (context[flag] !== true && !flags.has(flag)) return false; } if (!probingDiscoveryGates && option.requiresTargetFlatFooted) { const target = context?.target; const flatFooted = context.targetFlatFooted === true || context.flatFootedTarget === true || target?.system?.derived?.isFlatFooted === true; if (!flatFooted) return false; } if (!probingDiscoveryGates && option.requiresTargetDeniedDexBonus) { const target = context?.target; const deniedDex = context.targetDeniedDexBonus === true || context.deniedDexBonus === true || context.targetFlatFooted === true || target?.system?.derived?.deniedDexBonus === true || target?.system?.derived?.isFlatFooted === true; if (!deniedDex) return false; } if (option.requiresOpportunityAttack && context.opportunityAttack !== true && context.attackOfOpportunity !== true && context.isAttackOfOpportunity !== true) return false; if (option.requiresAreaAttack && !isAreaAttackContext(weapon, context)) return false; if (option.excludesWeaponGroups && weaponMatchesGroup(weapon, option.excludesWeaponGroups, context)) return false; if (option.excludesAreaAttack && (context.isAreaAttack === true || context.areaAttack === true || weapon?.system?.areaAttack === true || weapon?.system?.isAreaAttack === true)) return false; return true; }
function hydrateOption(raw, actor, weapon, context = {}) { const id = camelize(raw.option ?? raw.id ?? raw.key ?? raw.name); const defaults = DEFAULT_ATTACK_OPTIONS[id] ?? {}; const merged = foundry?.utils?.mergeObject ? foundry.utils.mergeObject(foundry.utils.deepClone(defaults), raw, { inplace: false }) : { ...defaults, ...raw }; merged.id = id; merged.label = merged.label ?? raw.label ?? id; merged.control = merged.control ?? raw.inputType ?? "toggle"; merged.attackType = getAttackType(weapon, context); if (merged.control === "slider") { const bab = actorBAB(actor); const ruleMax = Number(merged.max ?? merged.maximum ?? 5); merged.min = Number(merged.min ?? 0); merged.max = Math.max(0, Math.min(bab, Number.isFinite(ruleMax) ? ruleMax : bab)); merged.step = Number(merged.step ?? 1); merged.value = Math.max(merged.min, Math.min(Number(context?.combatOptions?.[id] ?? context?.attackOptions?.[id] ?? 0), merged.max)); merged.disabled = merged.max <= 0; } else if (merged.control === "toggle") merged.checked = Boolean(context?.combatOptions?.[id] ?? context?.attackOptions?.[id]); if (merged.requiresAim && !context?.aim) merged.warning = merged.warning ?? "Requires Aim."; if (merged.requiresCharge && !context?.charge) merged.warning = merged.warning ?? "Requires a charge context."; if (merged.requiresManeuver && contextManeuver(context) !== normalizeKey(merged.requiresManeuver)) merged.warning = merged.warning ?? `Requires ${merged.requiresManeuver}.`; if (merged.requiresAutofire && !weaponSupportsAutofire(weapon, context)) merged.warning = merged.warning ?? "Requires an autofire-capable weapon or autofire attack mode."; if (merged.control === "passive") { merged.checked = true; merged.value = 1; } return merged; }
function selectedValue(options, id) { const combat = options?.combatOptions ?? options?.attackOptions ?? {}; const value = combat?.[id]; if (value === undefined || value === null || value === false || value === "") return 0; if (value === true) return 1; const numeric = Number(value); return Number.isFinite(numeric) ? numeric : 0; }

// Math Integrity Freeze, Attack Bonus round 8: probe context used to
// DISCOVER an owned option whose only blocking gate is one of the
// player-toggleable ones (Aim/Charge/Autofire) -- assuming every such gate
// is satisfied surfaces every option the actor could possibly reach from
// this dialog, without inventing eligibility for weapon-group/attack-type/
// target mismatches (those gates are NOT probed, so an option genuinely
// wrong for this weapon/attack-type/target never appears at all, satisfying
// "actor does NOT own it / it can never apply here: do not show it").
const ATTACK_OPTION_PROBE_CONTEXT_OVERRIDES = Object.freeze({ aim: true, charge: true, autofire: true, isPointBlank: true, __probeDiscoveryGates: true });

// Human-readable reasons for the gates a player can resolve from THIS
// dialog: the three simple boolean toggles (Aim/Charge/Autofire), a
// target-state gate (now resolvable via the Target Context panel -- round
// 8 correction #1, Blocker 3), and requiresOption (another combat option's
// live value, also submitted from this same form). Any other unmet
// requirement (weapon group, attack type, maneuver, opportunity-attack,
// ...) is NOT reasoned here -- those options never reach this function at
// all, since they are excluded by the (unprobed) gates in
// optionAllowedForWeapon() before this runs.
function unmetToggleableReasons(option, weapon, context) {
  const reasons = [];
  if (option.requiresAim && context.aim !== true) reasons.push('Requires Aim');
  if (option.requiresCharge && context.charge !== true) reasons.push('Requires Charge');
  if (option.requiresAutofire && !weaponSupportsAutofire(weapon, context)) reasons.push('Requires an autofire-capable weapon or autofire mode');
  const hasTargetGate = option.requiresTargetType || option.requiresTargetFeat || option.requiresTargetTalent
    || option.requiresTargetItem || option.requiresTargetText || option.requiresTargetFlatFooted || option.requiresTargetDeniedDexBonus;
  if (hasTargetGate) {
    const target = context?.target ?? context?.targetActor ?? null;
    reasons.push(target ? "Target does not meet this option's requirement" : 'Requires a target');
  }
  if (option.requiresOption) {
    const combat = context?.combatOptions ?? context?.attackOptions ?? {};
    if (!combat?.[option.requiresOption]) reasons.push(`Requires ${option.requiresOption} to be selected first`);
  }
  return reasons;
}

export class CombatOptionResolver {
  static getAvailableAttackOptions(actor, weapon, context = {}) { const options = []; for (const item of actorItems(actor)) for (const rule of getFeatRules(item)) { const option = hydrateOption(rule, actor, weapon, context); if (!option?.id) continue; if (!optionAllowedForWeapon(option, actor, weapon, context)) continue; option.sourceItemId = item.id; option.sourceName = item.name; if (!options.some(existing => existing.id === option.id)) options.push(option); } return options.sort((a, b) => String(a.label).localeCompare(String(b.label))); }
  static summarizeAttackOptions(actor, weapon, options = {}) { const available = this.getAvailableAttackOptions(actor, weapon, options); return available.map(option => { const value = option.control === "passive" ? 1 : selectedValue(options, option.id); return { ...option, selectedValue: value, active: option.control === "passive" || value > 0 || (option.control === "flag" && Boolean(options?.combatOptions?.[option.id])) }; }); }

  /**
   * Math Integrity Freeze, Attack Bonus round 8 (Attack Context + Dynamic
   * Combat Option Presentation Authority): getAvailableAttackOptions()
   * silently omits an owned option the instant ONE unmet context gate
   * (Aim/Charge/Autofire) fails, indistinguishable from the actor simply
   * not owning it or the weapon being wrong for it. A player who owns
   * Careful Shot never sees it at all before checking Aim, with no
   * indication it exists. This returns every option the actor could reach
   * from the current weapon/attack-type (the real, always-enforced gates),
   * annotated with a presentation `state` ('available' | 'disabled') and,
   * when disabled, a human `reason` naming exactly which toggleable
   * context gate (Aim/Charge/Autofire) is still unmet -- so the dialog can
   * show it rather than hide it.
   * @returns {Array} options with `.state` and `.reason` (null when available)
   */
  static getAttackOptionsWithState(actor, weapon, context = {}) {
    const probeContext = { ...context, ...ATTACK_OPTION_PROBE_CONTEXT_OVERRIDES };
    const probed = this.getAvailableAttackOptions(actor, weapon, probeContext);
    const availableIds = new Set(this.getAvailableAttackOptions(actor, weapon, context).map(o => o.id));
    return probed.map(option => {
      if (availableIds.has(option.id)) return { ...option, state: 'available', reason: null };
      const reasons = unmetToggleableReasons(option, weapon, context);
      // Every probed-but-unavailable option must be explained by a
      // toggleable gate -- if none applies, the probe and the real
      // evaluation disagreed for a reason this function doesn't model
      // (a defensive fallback, not expected to fire in practice).
      return { ...option, state: 'disabled', reason: reasons.join('; ') || 'Not currently available' };
    });
  }

  /**
   * Math Integrity Freeze, Attack Bonus round 8: which of the generic,
   * non-feat-gated attack CONTEXT toggles (Aim, Charge, Flanking) are
   * relevant to show for this actor + weapon. The base SWSE rule is a
   * straight melee/ranged split (Aim is ranged-only; Flanking is
   * melee-only), EXCEPT Charge: the ordinary melee Charge +2 is melee-only,
   * but the CHARGE CONTEXT ITSELF also matters for a ranged attacker who
   * owns something like Charging Fire (requiresAttackType: 'ranged',
   * requiresCharge: true) -- "is Charge context meaningful" is therefore a
   * different question from "does the ordinary melee Charge +2 apply," and
   * must not be collapsed into one boolean. Detected by probing whether ANY
   * currently-reachable option (ignoring the charge gate itself, via
   * getAttackOptionsWithState's probe) declares requiresCharge -- not by
   * hardcoding "Charging Fire" by name, so any future ranged-charge option
   * is picked up the same way.
   *
   * Math Integrity Freeze, Attack Bonus round 8 correction #1 (Blocker 4):
   * Point Blank is NOT a player-toggleable generic context -- it is a range
   * STATE, already owned by the Range Band selector (which the ranged
   * dialog already renders and already offers a "Point Blank" value for).
   * A separate toggleable pointBlank context here would be a second,
   * independently-settable authority for the same fact, capable of
   * producing an impossible combination (rangeBand: 'medium' AND
   * isPointBlank: true). This method therefore no longer advertises
   * pointBlank at all; callers derive isPointBlank from the selected range
   * band (normalizeRangeBand(rangeBand) === 'point-blank'), the one place
   * that fact is recorded.
   * @returns {{aim: boolean, charge: boolean, flanking: boolean}}
   */
  static getAvailableAttackContexts(actor, weapon, context = {}) {
    const attackType = getAttackType(weapon, context);
    const reachable = this.getAttackOptionsWithState(actor, weapon, context);
    const chargeRelevantForRanged = attackType !== 'melee' && reachable.some(o => o.requiresCharge === true);
    return {
      aim: attackType === 'ranged',
      flanking: attackType === 'melee',
      charge: attackType === 'melee' || chargeRelevantForRanged
    };
  }
  static collectAttackModifiers(actor, weapon, options = {}) { const active = this.summarizeAttackOptions(actor, weapon, options); const result = { attackBonus: 0, attackAbilityBonus: 0, damageBonus: 0, damageDiceStepBonus: 0, damageExtraWeaponDice: 0, damageDieStepIncreases: 0, ammunitionCost: 0, defenseModifiers: [], targetEffectsOnHit: [], criticalThreatNaturalMin: null, criticalMultiplierMin: null, criticalDamageDieStepBonus: 0, targetDefenseType: null, targetEffectsOnCritical: [], flags: {}, breakdown: [], attackContributions: [] };
    for (const option of active) { const value = option.control === "passive" ? 1 : option.selectedValue; const flagActive = option.control === "flag" ? Boolean(options?.combatOptions?.[option.id] ?? options?.attackOptions?.[option.id]) : true; if (option.control === "flag" && !flagActive) continue; if (option.control !== "flag" && option.control !== "passive" && value <= 0) continue; let attack = 0; if (Number.isFinite(Number(option.attackModifier))) attack += Number(option.attackModifier) * value; if (option.attackModifierFormula === "-value") attack -= value; if (option.attackModifierFormula === "heroicLevel") attack += actorLevel(actor) * value; if (option.attackModifierFormula === "halfLevel") attack += Math.floor(actorLevel(actor) / 2) * value; if (typeof option.attackModifierFormula === "string" && option.attackModifierFormula.startsWith("context.")) { const key = option.attackModifierFormula.slice("context.".length); const contextValue = Number(options?.[key] ?? options?.combatOptions?.[key] ?? options?.attackOptions?.[key] ?? 0); if (Number.isFinite(contextValue)) { const max = Number(option.maxContextValue ?? option.max ?? contextValue); const multiplier = Number(option.contextMultiplier ?? 1); attack += Math.max(0, Math.min(contextValue, Number.isFinite(max) ? max : contextValue)) * multiplier; } } attack += getRangePenaltyAdjustment(option, options); if (option.attackAbilityBonus) { const abilityRule = option.attackAbilityBonus; const ability = String(abilityRule.ability ?? abilityRule.key ?? 'str').toLowerCase().slice(0, 3); const multiplier = Number(abilityRule.multiplier ?? 1) || 1; const minimum = Number(abilityRule.minimum ?? 0) || 0; const abilityValue = Math.max(minimum, actorAbilityMod(actor, ability) * multiplier); if (Number.isFinite(abilityValue) && abilityValue !== 0) attack += abilityValue * value; } if (attack) { result.attackBonus += attack; result.breakdown.push({ label: option.label, value: attack, type: "attack" }); } let damage = 0; if (Number.isFinite(Number(option.damageModifier))) damage += Number(option.damageModifier) * value; if (option.damageModifierFormula === "value") damage += value; if (option.damageModifierFormula === "halfLevel") damage += Math.floor(actorLevel(actor) / 2) * value; if (option.damageModifierFormula === "halfLevelMinusOne") damage += Math.max(0, Math.floor(actorLevel(actor) / 2) - 1) * value; if (["level", "classLevel", "characterLevel", "heroicLevel", "actorLevel"].includes(option.damageModifierFormula)) damage += actorLevel(actor) * value; if (typeof option.damageModifierFormula === "string" && option.damageModifierFormula.startsWith("context.")) { const key = option.damageModifierFormula.slice("context.".length); const contextValue = Number(options?.[key] ?? options?.combatOptions?.[key] ?? options?.attackOptions?.[key] ?? 0); if (Number.isFinite(contextValue)) damage += contextValue * value; } if (option.damageAbilityBonus) { const abilityRule = option.damageAbilityBonus; const ability = String(abilityRule.ability ?? abilityRule.key ?? 'str').toLowerCase().slice(0, 3); const multiplier = Number(abilityRule.multiplier ?? 1) || 1; const minimum = Number(abilityRule.minimum ?? 0) || 0; const abilityValue = Math.max(minimum, actorAbilityMod(actor, ability) * multiplier); if (Number.isFinite(abilityValue) && abilityValue !== 0) damage += abilityValue * value; } if (damage) { result.damageBonus += damage; result.breakdown.push({ label: option.label, value: damage, type: "damage" }); } const extraWeaponDice = Number(option.damageExtraWeaponDice ?? option.damageDiceStepBonus ?? 0) * value; if (extraWeaponDice) { result.damageExtraWeaponDice += extraWeaponDice; result.damageDiceStepBonus += extraWeaponDice; result.breakdown.push({ label: `${option.label} extra weapon dice`, value: extraWeaponDice, type: "damageExtraWeaponDice" }); } const ammunitionCost = Number(option.ammunitionCost ?? option.ammoCost ?? 0) * value; if (Number.isFinite(ammunitionCost) && ammunitionCost > 0) { result.ammunitionCost += ammunitionCost; result.breakdown.push({ label: `${option.label} ammunition`, value: ammunitionCost, type: "ammunitionCost" }); } if (option.defenseModifier && value > 0) { const defenseValue = Number(option.defenseModifier.value ?? value); const defense = { ...option.defenseModifier, value: Number.isFinite(defenseValue) ? defenseValue : value }; result.defenseModifiers.push(defense); result.breakdown.push({ label: `${option.label} ${defense.target ?? "defense"}`, value, type: "defense" }); } if (Array.isArray(option.targetEffectsOnHit) && value > 0) for (const effect of option.targetEffectsOnHit) { const resolved = { ...effect, sourceOption: option.id, sourceName: option.label }; if (typeof resolved.valueFormula === "string" && resolved.valueFormula === "selectedValue") resolved.value = value; if (typeof resolved.valueFormula === "string" && resolved.valueFormula === "negativeSelectedValue") resolved.value = -Math.abs(value); result.targetEffectsOnHit.push(resolved); } const criticalThreshold = Number(option.criticalThreatNaturalMin ?? option.criticalThreatMin ?? 0); if (Number.isFinite(criticalThreshold) && criticalThreshold > 1) { result.criticalThreatNaturalMin = result.criticalThreatNaturalMin ? Math.min(result.criticalThreatNaturalMin, criticalThreshold) : criticalThreshold; result.breakdown.push({ label: `${option.label} critical threshold`, value: criticalThreshold, type: "criticalThreatNaturalMin" }); } const criticalMultiplierMin = Number(option.criticalMultiplierMin ?? option.critMultiplierMin ?? 0); if (Number.isFinite(criticalMultiplierMin) && criticalMultiplierMin > 0) result.criticalMultiplierMin = Math.max(result.criticalMultiplierMin || 0, criticalMultiplierMin); const criticalDamageStep = Number(option.criticalDamageDieStepBonus ?? 0) * value; if (Number.isFinite(criticalDamageStep) && criticalDamageStep !== 0) result.criticalDamageDieStepBonus += criticalDamageStep; if (Array.isArray(option.targetEffectsOnCritical)) result.targetEffectsOnCritical.push(...option.targetEffectsOnCritical.map(effect => ({ ...effect, sourceOption: option.id, sourceName: option.label }))); if (option.targetDefenseType) result.targetDefenseType = String(option.targetDefenseType).toLowerCase(); if (option.suppressDamageAbilityAndLevel === true || option.damageMode === "baseOnly") { result.flags.damageBaseOnly = true; result.breakdown.push({ label: `${option.label} base damage only`, value: 0, type: "damageMode" }); } if (Array.isArray(option.suppresses)) for (const suppressed of option.suppresses) result.flags[`suppresses.${suppressed}`] = true; if (option.control === "flag") result.flags[option.id] = true; }
    const ruleModifiers = collectWeaponRuleModifiers(actor, weapon, options); result.attackBonus += ruleModifiers.attackBonus || 0; result.attackAbilityBonus += ruleModifiers.attackAbilityBonus || 0; result.damageBonus += ruleModifiers.damageBonus || 0; result.damageExtraWeaponDice += ruleModifiers.damageExtraWeaponDice || 0; result.damageDiceStepBonus += ruleModifiers.damageDiceStepBonus || 0; result.damageDieStepIncreases += ruleModifiers.damageDieStepIncreases || 0; result.criticalDamageDieStepBonus += ruleModifiers.criticalDamageDieStepBonus || 0; if (ruleModifiers.criticalThreatNaturalMin) result.criticalThreatNaturalMin = result.criticalThreatNaturalMin ? Math.min(result.criticalThreatNaturalMin, ruleModifiers.criticalThreatNaturalMin) : ruleModifiers.criticalThreatNaturalMin; result.criticalMultiplierMin = Math.max(result.criticalMultiplierMin || 0, ruleModifiers.criticalMultiplierMin || 0) || null; result.targetEffectsOnHit.push(...(ruleModifiers.targetEffectsOnHit || [])); result.targetEffectsOnCritical.push(...(ruleModifiers.targetEffectsOnCritical || [])); result.breakdown.push(...(ruleModifiers.breakdown || [])); Object.assign(result.flags, ruleModifiers.flags || {}); const combinedMods = collectCombinedFeatModifiers(actor, weapon, options); const alreadySubstituted = Number(result.flags._attackAbilitySubstitutionValue || 0); const combinedDelta = combinedMods.attackAbilityBonus || 0; if (combinedDelta > alreadySubstituted) { result.attackAbilityBonus += combinedDelta - alreadySubstituted; result.breakdown.push(...(combinedMods.breakdown || [])); Object.assign(result.flags, combinedMods.flags || {}); } return result; }
}

export default CombatOptionResolver;
