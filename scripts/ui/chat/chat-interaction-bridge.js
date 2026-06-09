/**
 * SWSE Chat Interaction Bridge
 *
 * The single chat-render hook owner for SWSE chat interactions.
 * This is UI plumbing only: it binds controls and delegates to engines/adapters.
 * It does not roll dice, compute game math, or mutate actors directly.
 */

import { enhanceSWSEChatMessage } from "/systems/foundryvtt-swse/scripts/ui/chat/chat-surface-enhancer.js";
import { buildVirtualUnarmedWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";
import { getSelfDestructDamage, hydrateDroidPart } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { decodeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";
import { buildDamagePacket } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";

let registered = false;

function normalizeRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

function markBound(el, key) {
  const marker = `swse${key}Bound`;
  if (el.dataset?.[marker] === 'true') return false;
  el.dataset[marker] = 'true';
  return true;
}

function actorFromId(id) {
  if (!id) return null;
  return game.actors?.get?.(id)
    ?? canvas?.tokens?.placeables?.find?.(t => t.id === id || t.document?.id === id || t.actor?.id === id)?.actor
    ?? null;
}


function actorSize(actor) {
  return String(actor?.system?.size ?? actor?.system?.droidSystems?.size ?? actor?.system?.droidSize ?? 'medium').toLowerCase();
}

function buildVirtualDroidPartWeapon(actor, itemId) {
  const ruleId = String(itemId || '').replace(/^swse-droid-part-/, '');
  const part = hydrateDroidPart({ id: ruleId });
  const profile = part.weaponProfile ?? {};
  const damage = profile.damageBySize
    ? getSelfDestructDamage(actorSize(actor), { miniaturized: profile.miniaturized === true })
    : (profile.damage ?? '1d6');
  return {
    id: itemId,
    name: profile.name ?? part.name ?? 'Droid Part',
    type: 'weapon',
    img: actor?.img ?? 'icons/svg/aura.svg',
    flags: { swse: { virtual: true, droidPart: true, droidPartId: ruleId, selfDestruct: profile.selfDestruct === true } },
    system: {
      damage: damage || '1d6',
      damageType: profile.damageType ?? 'normal',
      attackAttribute: profile.mode === 'ranged' || profile.mode === 'area' ? 'dex' : 'str',
      meleeOrRanged: profile.mode === 'ranged' || profile.mode === 'area' ? 'ranged' : 'melee',
      weaponType: profile.weaponType ?? 'simple',
      weaponGroup: profile.weaponType ?? 'simple',
      proficiency: profile.weaponType ?? 'simple',
      range: profile.range ?? '',
      attackBonus: profile.attackBonus ?? 0,
      equipped: true,
      integrated: true,
      description: part.description ?? ''
    }
  };
}

function itemFromActor(actor, itemId) {
  if (!actor || !itemId) return null;
  if (itemId === 'swse-virtual-unarmed' || String(itemId).startsWith('swse-virtual-unarmed')) {
    return buildVirtualUnarmedWeapon(actor, { id: itemId });
  }
  if (String(itemId).startsWith('swse-droid-part-')) {
    return buildVirtualDroidPartWeapon(actor, itemId);
  }
  return actor.items?.get?.(itemId) ?? actor.items?.find?.(item => item.id === itemId || item._id === itemId) ?? null;
}

function boolFromDataset(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

function mergeDamageButtonWorkflowContext(button, decoded = null) {
  const context = decoded && typeof decoded === 'object' ? { ...decoded } : {};
  const attack = { ...(context.attack ?? {}) };
  const damage = { ...(context.damage ?? {}) };
  const resources = { ...(context.resources ?? {}) };
  const tags = new Set(Array.isArray(context.contextTags) ? context.contextTags : []);
  for (const tag of String(button.dataset.contextTags || '').split('|')) {
    if (tag.trim()) tags.add(tag.trim());
  }

  if (button.dataset.workflowId) context.workflowId = context.workflowId ?? button.dataset.workflowId;
  if (button.dataset.actionId) context.actionId = context.actionId ?? button.dataset.actionId;
  if (button.dataset.attackMode) attack.mode = attack.mode ?? button.dataset.attackMode;
  if (button.dataset.target) context.targetId = context.targetId ?? button.dataset.target;

  const hit = button.dataset.hit;
  if (hit === 'true') damage.hit = true;
  else if (hit === 'false') damage.hit = false;
  else if (damage.hit === undefined) damage.hit = null;

  damage.crit = boolFromDataset(button.dataset.isCrit) ?? damage.crit;
  damage.natural1 = boolFromDataset(button.dataset.natural1) ?? damage.natural1;
  damage.natural20 = boolFromDataset(button.dataset.natural20) ?? damage.natural20;
  damage.critMultiplier = Number.parseInt(button.dataset.critMult, 10) || damage.critMultiplier || 2;

  attack.isArea = boolFromDataset(button.dataset.areaAttack) ?? attack.isArea;
  attack.isBurstFire = boolFromDataset(button.dataset.burstFire) ?? attack.isBurstFire;
  attack.isAutofire = boolFromDataset(button.dataset.autofire) ?? attack.isAutofire;
  attack.isStun = boolFromDataset(button.dataset.stun) ?? attack.isStun;
  attack.isIon = boolFromDataset(button.dataset.ion) ?? attack.isIon;
  resources.ammoCost = Number.parseInt(button.dataset.ammoCost, 10) || resources.ammoCost || 0;

  return {
    ...context,
    contextTags: [...tags],
    attack,
    damage,
    resources
  };
}

async function handleLegacyDamageRollButton(event, button, message) {
  event.preventDefault();
  event.stopPropagation();

  const actor = actorFromId(button.dataset.actorId)
    || actorFromId(button.dataset.attacker)
    || actorFromId(message?.speaker?.actor);
  const weaponId = button.dataset.weaponId;
  const weapon = itemFromActor(actor, weaponId);

  if (!actor || !weapon) {
    const actorLabel = button.dataset.actorId || message?.speaker?.actor || 'missing actor';
    const weaponLabel = weaponId || 'missing weapon';
    console.warn('[SWSE Chat] Damage roll context could not be resolved.', { actor: actorLabel, weapon: weaponLabel, messageId: message?.id });
    ui?.notifications?.warn?.('Damage roll context could not be resolved.');
    return;
  }

  const combatContext = mergeDamageButtonWorkflowContext(button, decodeCombatWorkflowContext(button.dataset.workflowContext));
  const target = actorFromId(button.dataset.target) || actorFromId(combatContext?.targetId) || null;
  const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
  await SWSERoll.rollDamage(actor, weapon, {
    isCritical: button.dataset.isCrit === 'true' || combatContext?.damage?.crit === true,
    critMultiplier: Number.parseInt(button.dataset.critMult, 10) || combatContext?.damage?.critMultiplier || 2,
    twoHanded: button.dataset.twoHanded === 'true',
    target,
    combatContext,
    workflowContext: combatContext
  });
}

async function handleCombatDamageRollButton(event, button) {
  event.preventDefault();
  event.stopPropagation();

  const attacker = actorFromId(button.dataset.attacker || button.dataset.actorId);
  const target = actorFromId(button.dataset.target);
  const weapon = itemFromActor(attacker, button.dataset.weapon);

  if (!attacker || !weapon) {
    ui?.notifications?.warn?.('Damage roll context could not be resolved.');
    return;
  }

  const combatContext = mergeDamageButtonWorkflowContext(button, decodeCombatWorkflowContext(button.dataset.workflowContext));
  const resolvedTarget = target || actorFromId(combatContext?.targetId) || null;
  const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
  await SWSERoll.rollDamage(attacker, weapon, {
    target: resolvedTarget,
    isCritical: button.dataset.isCrit === 'true' || combatContext?.damage?.crit === true,
    critMultiplier: Number.parseInt(button.dataset.critMult, 10) || combatContext?.damage?.critMultiplier || 2,
    combatContext,
    workflowContext: combatContext
  });
}

async function handleApplyDamageButton(event, button) {
  event.preventDefault();
  event.stopPropagation();

  const rawAmount = Number.parseInt(button.dataset.rawAmount || button.dataset.amount, 10);
  if (!Number.isFinite(rawAmount)) {
    ui?.notifications?.warn?.('Damage amount could not be resolved.');
    return;
  }

  const combatContext = mergeDamageButtonWorkflowContext(button, decodeCombatWorkflowContext(button.dataset.workflowContext));
  const attacker = actorFromId(button.dataset.attacker || button.dataset.actorId || combatContext?.actorId);
  const target = actorFromId(button.dataset.target) || actorFromId(combatContext?.targetId) || null;
  const weapon = itemFromActor(attacker, button.dataset.weapon || button.dataset.weaponId || combatContext?.weaponId);
  const packet = buildDamagePacket({
    attacker,
    target,
    weapon,
    amount: rawAmount,
    workflowContext: combatContext,
    options: {
      damageType: button.dataset.damageType || combatContext?.damage?.damageType || undefined,
      isCritical: button.dataset.isCrit === 'true' || combatContext?.damage?.crit === true,
      critMultiplier: Number.parseInt(button.dataset.critMult, 10) || combatContext?.damage?.critMultiplier || 2,
      ammoCost: Number.parseInt(button.dataset.ammoCost, 10) || combatContext?.resources?.ammoCost || 0,
      hit: button.dataset.hit === 'true' ? true : button.dataset.hit === 'false' ? false : combatContext?.damage?.hit
    }
  });

  if (packet.disposition?.damageAllowed === false || packet.amount <= 0) {
    ui?.notifications?.info?.(packet.disposition?.reason || 'This attack does not apply damage.');
    return;
  }

  const { DamageSystem } = await import('/systems/foundryvtt-swse/scripts/combat/damage-system.js');
  if (target) {
    await DamageSystem.applyPacketToActor(target, packet);
  } else {
    await DamageSystem.applyPacketToSelected(packet);
  }
}

async function handleReactionButton(event, button, message) {
  event.preventDefault();

  const reactionKey = button.dataset.swseReactionKey || button.dataset.reaction || button.getAttribute('data-reaction');
  if (!reactionKey) return;

  const defenderId = button.dataset.swseDefenderId || button.dataset.defender || button.dataset.actorId || '';
  const attackerId = button.dataset.swseAttackerId || button.dataset.attacker || '';
  const ownerId = button.dataset.swseReactionOwner || '';

  const defender = actorFromId(defenderId);
  const attacker = actorFromId(attackerId);

  if (!defender) {
    ui?.notifications?.warn?.('Reaction could not resolve defender context.');
    return;
  }

  if (ownerId && game.user?.isGM !== true) {
    const actorOwners = Object.entries(defender?.ownership ?? {})
      .filter(([, lvl]) => Number(lvl) >= 3)
      .map(([id]) => id);
    if (actorOwners.length && !actorOwners.includes(game.user.id) && ownerId !== game.user.id) {
      ui?.notifications?.warn?.('You do not control this reaction.');
      return;
    }
  }

  const { ReactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js');
  await ReactionEngine.resolveReaction({
    reactionKey,
    attacker,
    defender,
    sourceMessage: message,
    attackContext: {
      messageId: button.dataset.swseMessageId || message?.id || null,
      eventId: button.dataset.swseEventId || button.closest('[data-swse-event-id]')?.dataset?.swseEventId || null,
      attackEventId: button.dataset.swseAttackEventId || null,
      dc: Number(button.dataset.swseDc || button.dataset.dc || button.dataset.swseAttackTotal || 0) || null,
      attackTotal: Number(button.dataset.swseAttackTotal || button.dataset.swseDc || 0) || null,
      reactionKey,
      attackerId: (attacker?.id ?? attackerId) || null,
      defenderId: (defender?.id ?? defenderId) || null,
      trigger: button.dataset.swseTrigger || button.dataset.trigger || 'ON_ATTACK_DECLARED'
    }
  });
}


async function handleHolonetCardAction(event, button, message) {
  event.preventDefault();
  event.stopPropagation();

  const action = button.dataset.holonetAction || '';
  if (!['open-thread', 'open-bulletin', 'open-record'].includes(action)) return;

  const threadId = button.dataset.holonetThreadId || '';
  const recordId = button.dataset.holonetRecordId || '';
  const actor = actorFromId(button.dataset.actorId || message?.speaker?.actor)
    || game.user?.character
    || game.actors?.find?.(a => a?.isOwner && a?.type === 'character')
    || null;

  if (!actor) {
    ui?.notifications?.warn?.('Open a character sheet before opening this Holonet thread.');
    return;
  }

  try {
    if (action === 'open-thread') {
      const { ShellRouter } = await import('/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js');
      await ShellRouter.openSurface(actor, 'messenger', {
        threadId,
        recordId,
        source: 'chat-holonet-card'
      });
      return;
    }

    const { HolonetEngine } = await import('/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js');
    const { HolonetDeliveryRouter } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-delivery-router.js');
    const recipientId = HolonetDeliveryRouter.getCurrentRecipientId();
    if (recordId && recipientId) await HolonetEngine.markRead(recordId, recipientId);
    ui?.notifications?.info?.(action === 'open-bulletin' ? 'Bulletin acknowledged.' : 'Holonet notice acknowledged.');
  } catch (err) {
    console.warn('[SWSE Chat] Failed to open Holonet card:', err);
    ui?.notifications?.warn?.('Holonet card could not be opened.');
  }
}

async function handleHolonetMessageAction(event, button, message) {
  event.preventDefault();
  event.stopPropagation();

  const action = button.dataset.holonetAction || '';
  if (!['accept-transfer', 'decline-transfer', 'pay-credit-request', 'decline-credit-request', 'accept-item-transfer', 'decline-item-transfer', 'accept-asset-transfer', 'decline-asset-transfer'].includes(action)) return;
  const threadId = button.dataset.holonetThreadId || '';
  const recordId = button.dataset.holonetRecordId || '';
  const actor = actorFromId(button.dataset.actorId || message?.speaker?.actor)
    || game.user?.character
    || game.actors?.find?.(a => a?.isOwner && a?.type === 'character')
    || null;
  if (!actor || !threadId || !recordId) {
    ui?.notifications?.warn?.('Holonet transaction context could not be resolved.');
    return;
  }
  try {
    const { HolonetMessengerService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js');
    await HolonetMessengerService.threadAction({ actor, threadId, action, recordId });
  } catch (err) {
    console.warn('[SWSE Chat] Holonet transaction action failed:', err);
    ui?.notifications?.warn?.('Holonet transaction action failed.');
  }
}


async function handleStoreReceiptAction(event, button, message) {
  event.preventDefault();
  event.stopPropagation();

  const action = button.dataset.storeAction || '';
  const actor = actorFromId(button.dataset.actorId || message?.speaker?.actor)
    || game.user?.character
    || game.actors?.find?.(a => a?.isOwner && a?.type === 'character')
    || null;

  if (!actor) {
    ui?.notifications?.warn?.('Open a character sheet before using this receipt shortcut.');
    return;
  }

  try {
    const { ShellRouter } = await import('/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js');
    if (action === 'open-store') {
      await ShellRouter.openSurface(actor, 'store', {
        source: 'chat-store-receipt',
        transactionId: button.dataset.storeTransactionId || ''
      });
      return;
    }
    if (action === 'open-holonet') {
      await ShellRouter.openSurface(actor, 'messenger', {
        source: 'chat-store-receipt',
        transactionId: button.dataset.storeTransactionId || ''
      });
      return;
    }
    await ShellRouter.openSurface(actor, 'sheet', { source: 'chat-store-receipt' });
  } catch (err) {
    console.warn('[SWSE Chat] Failed to process store receipt action:', err);
    ui?.notifications?.warn?.('Receipt shortcut could not be opened.');
  }
}

async function handleSpeciesRerollButton(event, button, message) {
  event.preventDefault();

  const { SpeciesRerollHandler } = await import('/systems/foundryvtt-swse/scripts/species/species-reroll-handler.js');
  if (typeof SpeciesRerollHandler.resolveChatRerollButton === 'function') {
    await SpeciesRerollHandler.resolveChatRerollButton(button, { message });
    return;
  }

  ui?.notifications?.warn?.('Species reroll resolver is not available.');
}


async function handleAttackRerollButton(event, button, message) {
  event.preventDefault();

  const { MetaResourceFeatResolver } = await import('/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js');
  if (typeof MetaResourceFeatResolver.resolveAttackRerollButton === 'function') {
    await MetaResourceFeatResolver.resolveAttackRerollButton(button, { message });
    return;
  }

  ui?.notifications?.warn?.('Attack reroll resolver is not available.');
}

async function handleTemporaryDefenseButton(event, button) {
  event.preventDefault();
  const actor = actorFromId(button.dataset.actorId);
  if (!actor) {
    ui?.notifications?.warn?.('Actor could not be resolved.');
    return;
  }
  if (!actor.isOwner) {
    ui?.notifications?.warn?.('You do not control this actor.');
    return;
  }

  const { MetaResourceFeatResolver } = await import('/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js');
  const result = await MetaResourceFeatResolver.applyTemporaryDefenseRule(actor, button.dataset.ruleId || button.dataset.sourceId || null);
  if (result?.success) ui?.notifications?.info?.(`${result.rule?.sourceName ?? 'Temporary defense'} applied.`);
  else ui?.notifications?.warn?.(result?.reason ?? 'Temporary defense could not be applied.');
}

async function handleSkillRerollButton(event, button, message) {
  event.preventDefault();

  const { SkillFeatResolver } = await import('/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-resolver.js');
  if (typeof SkillFeatResolver.resolveChatRerollButton === 'function') {
    await SkillFeatResolver.resolveChatRerollButton(button, { message });
    return;
  }

  ui?.notifications?.warn?.('Skill reroll resolver is not available.');
}

function bind(root, selector, key, handler, message) {
  root.querySelectorAll(selector).forEach(button => {
    if (!markBound(button, key)) return;
    button.addEventListener('click', event => handler(event, button, message));
  });
}

export class ChatInteractionBridge {
  static register() {
    if (registered) return false;
    registered = true;

    Hooks.on('renderChatMessageHTML', (message, html, data) => {
      this.bind(message, html, data);
    });

    Hooks.on('createChatMessage', message => {
      try {
        globalThis.SWSEChatEventBridge?.attachMessage?.(message);
      } catch (err) {
        console.warn('[SWSE Chat] Event bridge attach failed', err);
      }
    });

    return true;
  }

  static bind(message, html) {
    const root = normalizeRoot(html);
    if (!root) return false;

    enhanceSWSEChatMessage(message, root);

    bind(root, '.swse-roll-damage', 'LegacyDamage', handleLegacyDamageRollButton, message);
    bind(root, '.swse-roll-damage-btn', 'CombatDamage', handleCombatDamageRollButton, message);
    bind(root, '.swse-apply-damage-btn', 'ApplyDamage', handleApplyDamageButton, message);
    bind(root, '[data-reaction], [data-swse-reaction-key]', 'Reaction', handleReactionButton, message);
    bind(root, '[data-holonet-action="open-thread"], [data-holonet-action="open-bulletin"], [data-holonet-action="open-record"]', 'HolonetOpenCard', handleHolonetCardAction, message);
    bind(root, '[data-holonet-action="accept-transfer"], [data-holonet-action="decline-transfer"], [data-holonet-action="pay-credit-request"], [data-holonet-action="decline-credit-request"], [data-holonet-action="accept-item-transfer"], [data-holonet-action="decline-item-transfer"], [data-holonet-action="accept-asset-transfer"], [data-holonet-action="decline-asset-transfer"]', 'HolonetMessageAction', handleHolonetMessageAction, message);
    bind(root, '[data-store-action]', 'StoreReceiptAction', handleStoreReceiptAction, message);
    bind(root, '.species-reroll-btn', 'SpeciesReroll', handleSpeciesRerollButton, message);
    bind(root, '.swse-skill-reroll-btn', 'SkillReroll', handleSkillRerollButton, message);
    bind(root, '.swse-attack-reroll-btn', 'AttackReroll', handleAttackRerollButton, message);
    bind(root, '.swse-temp-defense-btn', 'TemporaryDefense', handleTemporaryDefenseButton, message);

    return true;
  }
}

export function registerChatInteractionBridge() {
  globalThis.SWSE = globalThis.SWSE || {};
  globalThis.SWSE.ChatInteractionBridge = ChatInteractionBridge;
  return ChatInteractionBridge.register();
}

export default ChatInteractionBridge;
