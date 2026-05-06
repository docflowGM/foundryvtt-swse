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

async function handleLegacyDamageRollButton(event, button, message) {
  event.preventDefault();

  const actor = actorFromId(message?.speaker?.actor);
  const weaponId = button.dataset.weaponId;
  const weapon = itemFromActor(actor, weaponId);

  if (!actor || !weapon) {
    ui?.notifications?.warn?.('Damage roll context could not be resolved.');
    return;
  }

  const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
  await SWSERoll.rollDamage(actor, weapon, {
    isCritical: button.dataset.isCrit === 'true',
    critMultiplier: Number.parseInt(button.dataset.critMult, 10) || 2,
    twoHanded: button.dataset.twoHanded === 'true'
  });
}

async function handleCombatDamageRollButton(event, button) {
  event.preventDefault();

  const attacker = actorFromId(button.dataset.attacker);
  const target = actorFromId(button.dataset.target);
  const weapon = itemFromActor(attacker, button.dataset.weapon);

  if (!attacker || !weapon) {
    ui?.notifications?.warn?.('Damage roll context could not be resolved.');
    return;
  }

  const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
  await SWSERoll.rollDamage(attacker, weapon, { target });
}

async function handleApplyDamageButton(event, button) {
  event.preventDefault();

  const amount = Number.parseInt(button.dataset.amount, 10);
  if (!Number.isFinite(amount)) {
    ui?.notifications?.warn?.('Damage amount could not be resolved.');
    return;
  }

  const { DamageSystem } = await import('/systems/foundryvtt-swse/scripts/combat/damage-system.js');
  await DamageSystem.applyToSelected(amount, { checkThreshold: true });
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
      reactionKey,
      attackerId: (attacker?.id ?? attackerId) || null,
      defenderId: (defender?.id ?? defenderId) || null,
      trigger: button.dataset.swseTrigger || button.dataset.trigger || 'ON_ATTACK_DECLARED'
    }
  });
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
    bind(root, '.species-reroll-btn', 'SpeciesReroll', handleSpeciesRerollButton, message);

    return true;
  }
}

export function registerChatInteractionBridge() {
  globalThis.SWSE = globalThis.SWSE || {};
  globalThis.SWSE.ChatInteractionBridge = ChatInteractionBridge;
  return ChatInteractionBridge.register();
}

export default ChatInteractionBridge;
