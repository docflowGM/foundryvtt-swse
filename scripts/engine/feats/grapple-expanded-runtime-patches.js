import { DamageSystem } from "/systems/foundryvtt-swse/scripts/combat/damage-system.js";
import { GrappleStateEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";

let registered = false;

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeName(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeName(item?.name) === wanted);
}

function grappleRules(actor) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
    const itemRules = item?.system?.abilityMeta?.grappleRules;
    if (!Array.isArray(itemRules)) continue;
    for (const rule of itemRules) rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
  }
  return rules;
}

function findGrappleRule(actor, type, predicate = null) {
  return grappleRules(actor).find(rule => rule?.type === type && (!predicate || predicate(rule))) ?? null;
}

function boneCrusherRule(actor) {
  return findGrappleRule(actor, 'CONDITION_SHIFT_ON_GRAPPLE_DAMAGE', rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === 'bone crusher')
    ?? (actorHasFeat(actor, 'Bone Crusher') ? { source: 'Bone Crusher', steps: 1 } : null);
}

function actorId(actor) {
  return actor?.id ?? actor?._id ?? null;
}

function actorFromId(id) {
  if (!id) return null;
  return game?.actors?.get?.(id) ?? null;
}

function packetSourceActor(packet = {}) {
  return packet.sourceActor
    ?? packet.options?.sourceActor
    ?? packet.attacker
    ?? packet.workflowContext?.actor
    ?? packet.workflowContext?.sourceActor
    ?? actorFromId(packet.sourceActorId ?? packet.options?.sourceActorId ?? packet.workflowContext?.actorId);
}

function wasDamageApplied(result = {}, packet = {}) {
  const values = [
    result?.applied,
    result?.resolution?.damageToHP,
    result?.damageToHP,
    packet?.amount
  ];
  return values.some(value => Number(value) > 0);
}

function targetIsGrappled(target) {
  if (!target) return false;
  return GrappleStateEngine.hasState(target, 'grappled') || GrappleStateEngine.hasState(target, 'pinned');
}

async function postBoneCrusherMessage({ attacker, target, shift, source = 'Bone Crusher' } = {}) {
  if (!attacker || !target || !shift) return null;
  return createChatMessage({
    speaker: ChatMessage.getSpeaker?.({ actor: attacker }) ?? { alias: attacker?.name ?? source },
    content: `<section class="swse-chat-card swse-grapple-feat-card swse-bone-crusher-card"><header class="swse-chat-card__header"><strong>${source}</strong></header><div class="swse-chat-card__body"><p><strong>${attacker.name}</strong> damaged Grappled opponent <strong>${target.name}</strong>. ${source} moves the target -1 step on the Condition Track.</p></div></section>`,
    flags: {
      'foundryvtt-swse': {
        grappleFeatAction: true,
        boneCrusher: true,
        actorId: actorId(attacker),
        targetId: actorId(target),
        shift
      }
    }
  });
}

async function applyBoneCrusherIfEligible(result, packet = {}, target = null) {
  const defender = target ?? packet.target ?? packet.targetActor ?? actorFromId(packet.targetActorId ?? packet.options?.targetActorId);
  const attacker = packetSourceActor(packet);
  if (!attacker || !defender || actorId(attacker) === actorId(defender)) return null;
  if (packet.options?.skipBoneCrusher === true || packet.flags?.skipBoneCrusher === true) return null;
  if (!wasDamageApplied(result, packet)) return null;
  if (!targetIsGrappled(defender)) return null;

  const rule = boneCrusherRule(attacker);
  if (!rule) return null;

  const steps = Math.max(1, Number(rule.steps ?? 1) || 1);
  const shift = await ActorEngine.applyConditionShift(defender, steps, rule.sourceName ?? rule.source ?? 'Bone Crusher');
  if (shift?.applied) {
    Hooks.callAll?.('swse.boneCrusherApplied', { attacker, target: defender, rule, shift, packet, result });
    await postBoneCrusherMessage({ attacker, target: defender, shift, source: rule.sourceName ?? rule.source ?? 'Bone Crusher' });
  }
  return shift;
}

export function registerGrappleExpandedRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalApplyPacketToActor = DamageSystem.applyPacketToActor?.bind(DamageSystem);
  if (typeof originalApplyPacketToActor === 'function') {
    DamageSystem.applyPacketToActor = async function swseGrappleExpandedApplyPacketToActor(actor, packet = {}) {
      const result = await originalApplyPacketToActor(actor, packet);
      try {
        await applyBoneCrusherIfEligible(result, packet, actor);
      } catch (err) {
        console.warn('[GrappleExpandedRuntime] Bone Crusher application failed', err);
      }
      return result;
    };
  }

  globalThis.SWSE ??= {};
  globalThis.SWSE.GrappleExpandedRuntime = {
    applyBoneCrusherIfEligible,
    boneCrusherRule,
    targetIsGrappled
  };
  if (globalThis.game?.swse) game.swse.GrappleExpandedRuntime = globalThis.SWSE.GrappleExpandedRuntime;
}

export default registerGrappleExpandedRuntimePatches;
