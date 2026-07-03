import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { CombatFeatDamageRuleResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/combat-feat-damage-rule-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getActorFromMessage(message) {
  return message?.actor
    ?? game?.actors?.get?.(message?.speaker?.actor)
    ?? null;
}

function getWeaponFromActor(actor, weaponId) {
  if (!actor || !weaponId) return null;
  return actor.items?.get?.(weaponId)
    ?? Array.from(actor.items ?? []).find(item => String(item.id ?? item._id ?? '') === String(weaponId))
    ?? null;
}

function getTargetActorFromWorkflowContext(workflowContext = {}, messageContext = {}) {
  const target = messageContext?.target ?? workflowContext?.target ?? null;
  if (target) return target;
  const id = workflowContext?.targetId ?? workflowContext?.targetActorId ?? messageContext?.targetId ?? null;
  if (!id) return null;
  const actor = game?.actors?.get?.(id);
  if (actor) return actor;
  const combatant = Array.from(game?.combat?.combatants ?? []).find(c => String(c.actorId ?? c.actor?.id ?? '') === String(id) || String(c.tokenId ?? c.token?.id ?? '') === String(id));
  return combatant?.actor ?? null;
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseCombatFeatDamagePatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original !== 'function') return;

  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, context = {}) {
    const modifiers = original(actor, weapon, context) ?? {};
    try {
      const baseFormula = weapon?.system?.damage ?? weapon?.system?.damageFormula ?? weapon?.damage ?? '1d6';
      const featParts = CombatFeatDamageRuleResolver.getDamageFormulaParts(actor, weapon, context, baseFormula);
      if (featParts.flatBonus) {
        modifiers.damageBonus = asNumber(modifiers.damageBonus, 0) + featParts.flatBonus;
        modifiers.combatFeatDamageBreakdown = [
          ...(Array.isArray(modifiers.combatFeatDamageBreakdown) ? modifiers.combatFeatDamageBreakdown : []),
          ...featParts.breakdown.filter(entry => entry.type === 'damage')
        ];
      }
      if (featParts.extraWeaponDice) {
        modifiers.damageExtraWeaponDice = asNumber(modifiers.damageExtraWeaponDice, 0) + featParts.extraWeaponDice;
        modifiers.combatFeatDamageBreakdown = [
          ...(Array.isArray(modifiers.combatFeatDamageBreakdown) ? modifiers.combatFeatDamageBreakdown : []),
          ...featParts.breakdown.filter(entry => entry.type === 'damageDice')
        ];
      }
    } catch (err) {
      SWSELogger.warn('[CombatFeatDamageRuntime] Failed to apply combat feat damage modifiers', { error: err });
    }
    return modifiers;
  };

  CombatOptionResolver.__swseCombatFeatDamagePatched = true;
}

function registerChatHooks() {
  Hooks.on('createChatMessage', async (message) => {
    try {
      const flags = message?.flags?.swse ?? message?.getFlag?.('swse') ?? {};
      const context = message?.context ?? {};
      if (flags.attackRoll === true || context?.type === 'attack') {
        const actor = getActorFromMessage(message);
        const weapon = getWeaponFromActor(actor, flags.weaponId ?? context.weaponId);
        const workflowContext = flags.workflowContext ?? context.workflowContext ?? {};
        const isHit = workflowContext?.hit === true || context?.success === true || context?.passed === true;
        if (actor && weapon && isHit) {
          const target = getTargetActorFromWorkflowContext(workflowContext, context);
          await CombatFeatDamageRuleResolver.recordAttackComboAttack(actor, weapon, {
            ...workflowContext,
            workflowContext,
            target,
            targetId: target?.id ?? workflowContext?.targetId ?? context?.targetId ?? null,
            isHit: true
          });
        }
        return;
      }

      if (flags.damageRoll === true || context?.type === 'damage') {
        const actor = getActorFromMessage(message);
        if (actor) await CombatFeatDamageRuleResolver.clearPendingComboDamageSkips(actor);
      }
    } catch (err) {
      SWSELogger.warn('[CombatFeatDamageRuntime] Chat hook failed', { error: err });
    }
  });
}

export function registerCombatFeatDamageRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  registerChatHooks();
  SWSELogger.log('[CombatFeatDamageRuntime] Runtime patches registered');
}

export default registerCombatFeatDamageRuntimePatches;
