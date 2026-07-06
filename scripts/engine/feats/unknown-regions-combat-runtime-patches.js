import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function asArray(value) { return Array.isArray(value) ? value : (value === undefined || value === null ? [] : [value]); }
function normalizeKey(value = '') { return String(value ?? '').trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '').toLowerCase(); }
function contextAffirms(value) { return value === true || value === 'true' || value === 1 || value === '1'; }
function actorItems(actor) { try { return Array.from(actor?.items ?? []); } catch (_err) { return []; } }
function collectRules(actor, type) { const out = []; for (const item of actorItems(actor)) { if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue; for (const rule of asArray(item?.system?.abilityMeta?.rules)) { if (rule?.type === type) out.push({ ...rule, sourceName: item.name, sourceId: item.id }); } } return out; }
function abilityModifier(actor, ability) { const key = normalizeKey(ability).slice(0, 3); const n = Number(actor?.system?.abilities?.[key]?.mod ?? actor?.system?.attributes?.[key]?.mod ?? actor?.system?.stats?.[key]?.mod ?? 0); return Number.isFinite(n) ? n : 0; }
function actorHasFeat(actor, featName) { const wanted = normalizeKey(featName); return actorItems(actor).some(item => item?.type === 'feat' && item?.system?.disabled !== true && normalizeKey(item.name) === wanted); }
function optionalRuleEnabled(key, fallback = true) { try { return game?.settings?.get?.('foundryvtt-swse', key) ?? fallback; } catch (_err) { return fallback; } }
function weaponText(weapon, context = {}) { const s = weapon?.system ?? {}; return [context.weaponCategory, context.weaponType, context.weaponGroup, weapon?.name, s.weaponType, s.weaponGroup, s.weaponCategory, s.group, s.category, s.type, s.subtype, Array.isArray(s.traits) ? s.traits.join(' ') : s.traits, Array.isArray(s.properties) ? s.properties.join(' ') : s.properties].map(normalizeKey).filter(Boolean).join(' '); }
function selectedChoices(item) { const raw = [item?.system?.selectedChoice, item?.system?.selectedChoices, item?.system?.choiceMeta?.selectedChoice, item?.system?.abilityMeta?.selectedChoice]; const out = []; const visit = v => { if (!v) return; if (Array.isArray(v)) return v.forEach(visit); if (typeof v === 'string') return out.push(normalizeKey(v)); if (typeof v === 'object') ['value', 'id', 'group', 'weaponGroup', 'label', 'name'].forEach(k => visit(v[k])); }; raw.forEach(visit); return out.filter(Boolean); }
function selectedChoiceMatches(rule, actor, weapon, context = {}) { if (!rule.selectedChoice) return true; const source = actorItems(actor).find(item => item.id === rule.sourceId); const choices = selectedChoices(source); if (!choices.length) return false; const text = weaponText(weapon, context); return choices.some(choice => text.includes(choice) || (choice.includes('pistol') && text.includes('pistol')) || (choice.includes('rifle') && text.includes('rifle')) || (choice.includes('heavy') && text.includes('heavy'))); }

function getReactionMovementResources(actor, context = {}) {
  if (!actor || !contextAffirms(context.meleeAttackMissedYou) && normalizeKey(context.trigger ?? '') !== 'melee-attack-misses-you') return [];
  return collectRules(actor, 'REACTION_MOVEMENT_RESOURCE').map(rule => { const key = `${rule.id}:${rule.sourceId}`; return { id: rule.id, key, source: rule.sourceName ?? rule.source, label: rule.label, type: 'reactionMovementResource', available: EncounterUseTracker.canUse(actor, key, { oncePer: rule.oncePer }), oncePer: rule.oncePer, movement: rule.movement, forcePointRefresh: rule.forcePointRefresh, requiresAwareOfAttacker: rule.requiresAwareOfAttacker === true, advisoryOnly: true, rule }; });
}
async function spendReactionMovementResource(actor, key) { return EncounterUseTracker.checkAndMarkUsed(actor, key, { oncePer: 'encounter' }); }

function getSpecialCombatActions(actor, context = {}) {
  if (!actor) return [];
  return collectRules(actor, 'SPECIAL_COMBAT_ACTION').filter(rule => !context.actionKey || normalizeKey(rule.actionKey) === normalizeKey(context.actionKey)).map(rule => ({ id: rule.id, key: rule.actionKey, name: rule.actionName, source: rule.sourceName ?? rule.source, label: rule.label, type: 'specialCombatAction', actionCost: rule.actionCost, skill: rule.skill, opposedDefense: rule.opposedDefense, successEffect: rule.successEffect, forcePointOption: rule.forcePointOption, consumesForcePoint: rule.consumesForcePoint === true, defenseBonus: rule.defenseBonus, rule }));
}

function getCleaveRiders(actor, context = {}) {
  if (!actor || !contextAffirms(context.cleaveUsed) && normalizeKey(context.trigger ?? '') !== 'after-successful-cleave-feat-use') return [];
  return collectRules(actor, 'CLEAVE_RIDER').map(rule => ({ id: rule.id, source: rule.sourceName ?? rule.source, label: rule.label, type: 'cleaveRider', affectedTargets: rule.affectedTargets, penalty: rule.penalty, rule }));
}

function getGrabGrappleReactionRiders(actor, context = {}) {
  if (!actor) return [];
  const incoming = contextAffirms(context.grabOrGrappleAttackAgainstYou) || normalizeKey(context.trigger ?? '').includes('grab') || normalizeKey(context.trigger ?? '').includes('grapple');
  if (!incoming) return [];
  return [...collectRules(actor, 'GRAB_GRAPPLE_DEFENSE_RIDER'), ...collectRules(actor, 'REACTION_GRAPPLE_COUNTER')].map(rule => ({ id: rule.id, source: rule.sourceName ?? rule.source, label: rule.label, type: normalizeKey(rule.type), defense: rule.defense, defenseBonus: rule.defenseBonus, counterAttack: rule.counterAttack, trigger: rule.trigger, rule }));
}

function getAttackOfOpportunityHitRiders(actor, weapon, context = {}) {
  if (!actor || !contextAffirms(context.attackOfOpportunity) || !contextAffirms(context.hit)) return [];
  return collectRules(actor, 'ATTACK_OF_OPPORTUNITY_HIT_RIDER').filter(rule => selectedChoiceMatches(rule, actor, weapon, context)).map(rule => ({ id: rule.id, source: rule.sourceName ?? rule.source, label: rule.label, type: 'attackOfOpportunityHitRider', compareSameDieRollTo: rule.compareSameDieRollTo, onSuccess: rule.onSuccess, onDamageExceedsThreshold: rule.onDamageExceedsThreshold, selectedChoice: rule.selectedChoice === true, rule }));
}

function getVehicleWeaponAttackRiders(actor, weapon, context = {}) {
  if (!actor) return [];
  const text = weaponText(weapon, context); const ok = /weapon-emplacement|weapon-system|vehicle-weapon|starship-weapon/.test(text) || contextAffirms(context.weaponEmplacement) || contextAffirms(context.weaponSystem) || contextAffirms(context.vehicleWeapon);
  if (!ok) return [];
  const margin = Number(context.attackMargin ?? context.attackTotalOverReflex ?? 0) || 0;
  return collectRules(actor, 'VEHICLE_WEAPON_ATTACK_RIDER').map(rule => ({ id: rule.id, source: rule.sourceName ?? rule.source, label: rule.label, type: 'vehicleWeaponAttackRider', bonusDamage: Math.floor(margin / Number(rule.damagePerExcessAttackMargin?.per ?? 5)) * Number(rule.damagePerExcessAttackMargin?.damage ?? 1), onDamageExceedsThreshold: rule.onDamageExceedsThreshold, rule }));
}

function getForcePointAttackRiders(actor, context = {}) {
  if (!actor || !contextAffirms(context.forcePointSpentOnAttack)) return [];
  if (contextAffirms(context.actorIsDroid)) return [];
  return collectRules(actor, 'FORCE_POINT_ATTACK_RIDER').map(rule => ({ id: rule.id, source: rule.sourceName ?? rule.source, label: rule.label, type: 'forcePointAttackRider', rerollAttack: rule.rerollAttack === true, keep: rule.keep, applyForcePointDieToBetterResult: rule.applyForcePointDieToBetterResult === true, rule }));
}

function getChargeSkillRiders(actor, context = {}) {
  if (!actor || !contextAffirms(context.charge) && normalizeKey(context.actionKey ?? '') !== 'charge') return [];
  if (actorHasFeat(actor, 'Intimidator')) return [];
  return collectRules(actor, 'CHARGE_SKILL_RIDER').map(rule => ({ id: rule.id, source: rule.sourceName ?? rule.source, label: rule.label, type: 'chargeSkillRider', freeActionSkill: rule.freeActionSkill, pathTargets: rule.pathTargets, finalTarget: rule.finalTarget, rule }));
}

function getMountedChargeRiders(actor, context = {}) {
  if (!actor || !contextAffirms(context.mountedCharge) && normalizeKey(context.actionKey ?? '') !== 'mounted-charge') return [];
  return collectRules(actor, 'MOUNTED_CHARGE_RIDER').map(rule => ({ id: rule.id, source: rule.sourceName ?? rule.source, label: rule.label, type: 'mountedChargeRider', mountAttack: rule.mountAttack, regularEndAttackStillAllowed: rule.regularEndAttackStillAllowed === true, featMayBeOnRiderOrMount: rule.featMayBeOnRiderOrMount === true, rule }));
}

function getOptionalRuleCombatActions(actor, context = {}) {
  if (!actor) return [];
  return collectRules(actor, 'OPTIONAL_RULE_COMBAT_ACTION').filter(rule => optionalRuleEnabled(rule.optionalRule?.key, rule.optionalRule?.defaultEnabled !== false)).filter(rule => !context.actionKey || normalizeKey(rule.actionKey) === normalizeKey(context.actionKey)).map(rule => ({ id: rule.id, key: rule.actionKey, name: rule.actionName, source: rule.sourceName ?? rule.source, label: rule.label, type: 'optionalRuleCombatAction', actionCost: rule.actionCost, consumesForcePoint: rule.consumesForcePoint === true, maxAttacks: rule.maxAttacks, preservesNormalMultiattackPenalties: rule.preservesNormalMultiattackPenalties === true, rule }));
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseUnknownRegionsCombatRuntimePatched === true) return;
  CombatOptionResolver.getReactionMovementResources = getReactionMovementResources;
  CombatOptionResolver.spendReactionMovementResource = spendReactionMovementResource;
  CombatOptionResolver.getSpecialCombatActions = getSpecialCombatActions;
  CombatOptionResolver.getCleaveRiders = getCleaveRiders;
  CombatOptionResolver.getGrabGrappleReactionRiders = getGrabGrappleReactionRiders;
  CombatOptionResolver.getAttackOfOpportunityHitRiders = getAttackOfOpportunityHitRiders;
  CombatOptionResolver.getVehicleWeaponAttackRiders = getVehicleWeaponAttackRiders;
  CombatOptionResolver.getForcePointAttackRiders = getForcePointAttackRiders;
  CombatOptionResolver.getChargeSkillRiders = getChargeSkillRiders;
  CombatOptionResolver.getMountedChargeRiders = getMountedChargeRiders;
  CombatOptionResolver.getOptionalRuleCombatActions = getOptionalRuleCombatActions;
  CombatOptionResolver.__swseUnknownRegionsCombatRuntimePatched = true;
}

export function registerUnknownRegionsCombatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {}; game.swse.feats ??= {};
  Object.assign(game.swse.feats, { getReactionMovementResources, spendReactionMovementResource, getSpecialCombatActions, getCleaveRiders, getGrabGrappleReactionRiders, getAttackOfOpportunityHitRiders, getVehicleWeaponAttackRiders, getForcePointAttackRiders, getChargeSkillRiders, getMountedChargeRiders, getOptionalRuleCombatActions });
  SWSELogger.log('[UnknownRegionsCombatRuntime] Runtime helpers registered');
}

export { getReactionMovementResources, spendReactionMovementResource, getSpecialCombatActions, getCleaveRiders, getGrabGrappleReactionRiders, getAttackOfOpportunityHitRiders, getVehicleWeaponAttackRiders, getForcePointAttackRiders, getChargeSkillRiders, getMountedChargeRiders, getOptionalRuleCombatActions };

export default registerUnknownRegionsCombatRuntimePatches;
