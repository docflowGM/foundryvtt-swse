import { SWSEChat } from '/systems/foundryvtt-swse/scripts/chat/swse-chat.js';
import { FullAttackExecutor } from '/systems/foundryvtt-swse/scripts/engine/combat/full-attack-executor.js';
import { FULL_ATTACK_PACKAGES } from '/systems/foundryvtt-swse/scripts/combat/multi-attack.js';

const CHAT_OUTCOME_PATCH = Symbol.for('swse.combatUiBehaviorHotfix.chatOutcome.v1');
const DELEGATE_PATCH = Symbol.for('swse.combatUiBehaviorHotfix.delegate.v1');
let registered = false;

function normalize(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function compact(value = '') {
  return normalize(value).replace(/\s+/g, '');
}

function rootFromHtml(html) {
  return html instanceof HTMLElement ? html : html?.[0] ?? html ?? null;
}

function actorFromId(id) {
  if (!id) return null;
  return game?.actors?.get?.(id)
    ?? canvas?.tokens?.placeables?.find?.(token => token.id === id || token.document?.id === id || token.actor?.id === id)?.actor
    ?? null;
}

function tokenActorFromId(id) {
  if (!id) return null;
  return canvas?.tokens?.placeables?.find?.(token => token.id === id || token.document?.id === id || token.actor?.id === id)?.actor ?? null;
}

function actorFromApp(app) {
  return app?.actor?.items ? app.actor : app?.document?.items ? app.document : null;
}

function actorFromElement(element) {
  const actorId = element?.dataset?.actorId || element?.closest?.('[data-swse-actor-id]')?.dataset?.swseActorId || '';
  if (actorId) return actorFromId(actorId);
  const appRoot = element?.closest?.('[data-appid], [data-application-id]');
  const appId = appRoot?.dataset?.appid || appRoot?.dataset?.applicationId || '';
  if (appId && ui?.windows) {
    const app = Object.values(ui.windows).find(win => String(win?.appId ?? win?.id ?? '') === String(appId));
    if (app?.actor) return app.actor;
  }
  return canvas?.tokens?.controlled?.[0]?.actor ?? null;
}

function itemFromAnyActor(itemId, actor = null) {
  if (!itemId) return null;
  if (actor?.items?.get?.(itemId)) return actor.items.get(itemId);
  for (const candidate of game?.actors ?? []) {
    const item = candidate?.items?.get?.(itemId);
    if (item) return item;
  }
  return null;
}

function defenseValue(actor, defenseType = 'reflex') {
  if (!actor) return null;
  const key = String(defenseType || 'reflex').toLowerCase() === 'fort' ? 'fortitude' : String(defenseType || 'reflex').toLowerCase();
  if (key === 'dc') return null;
  const value = actor.system?.defenses?.[key]?.total
    ?? actor.system?.derived?.defenses?.[key]?.total
    ?? actor.system?.defenses?.[key]?.value
    ?? actor.system?.derived?.defenses?.[key]?.value
    ?? null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function canSeeDefense(actor) {
  return game?.user?.isGM === true || actor?.isOwner === true;
}

function resolveTargetForChat(context = {}, flags = {}) {
  const targetContext = context.targetContext ?? flags?.swse?.workflowContext?.targetContext ?? {};
  return context.target?.actor
    ?? context.target
    ?? tokenActorFromId(targetContext.tokenId)
    ?? actorFromId(targetContext.actorId)
    ?? actorFromId(flags?.swse?.workflowContext?.targetId)
    ?? actorFromId(context.targetId)
    ?? null;
}

function d20Result(roll) {
  return roll?.dice?.find?.(die => Number(die.faces) === 20)?.results?.[0]?.result
    ?? roll?.dice?.[0]?.results?.[0]?.result
    ?? null;
}

function patchAttackChatPayload(payload = {}) {
  const context = payload.context ?? {};
  if (context.type !== 'attack') return payload;

  const roll = payload.roll;
  const natural = Number(d20Result(roll));
  const target = resolveTargetForChat(context, payload.flags ?? {});
  const defenseType = context.targetContext?.defenseType || payload.flags?.swse?.workflowContext?.attack?.defense || context.targetDefense || 'reflex';
  const resolvedDefense = Number.isFinite(Number(context.dc)) ? Number(context.dc) : defenseValue(target, defenseType);
  const hiddenDefense = target && !canSeeDefense(target);

  let isHit = context.success ?? context.passed ?? null;
  if (natural === 1) isHit = false;
  else if (natural === 20) isHit = true;
  else if (Number.isFinite(resolvedDefense)) isHit = Number(roll?.total) >= resolvedDefense;

  let isCritical = context.isCritical === true;
  if (natural === 1) isCritical = false;
  else if (natural === 20) isCritical = true;
  else if (isHit === false) isCritical = false;

  const outcomeLabel = natural === 1
    ? 'Miss'
    : isCritical
      ? 'Critical Hit'
      : isHit === true
        ? 'Hit'
        : isHit === false
          ? 'Miss'
          : (context.outcomeLabel || '');

  const patchedWorkflow = foundry.utils.mergeObject({ ...(payload.flags?.swse?.workflowContext ?? {}) }, {
    targetId: target?.id ?? payload.flags?.swse?.workflowContext?.targetId ?? null,
    targetName: target?.name ?? payload.flags?.swse?.workflowContext?.targetName ?? '',
    isCritical,
    damage: {
      ...(payload.flags?.swse?.workflowContext?.damage ?? {}),
      hit: isHit,
      crit: isCritical,
      natural1: natural === 1,
      natural20: natural === 20
    },
    attack: {
      ...(payload.flags?.swse?.workflowContext?.attack ?? {}),
      defense: defenseType
    }
  }, { inplace: false, recursive: true });

  const patchedContext = {
    ...context,
    target,
    targetName: target?.name ?? context.targetName ?? '',
    dc: hiddenDefense ? null : resolvedDefense,
    passed: isHit,
    success: isHit,
    isCritical,
    outcomeLabel,
    targetContext: {
      ...(context.targetContext ?? {}),
      actorId: target?.id ?? context.targetContext?.actorId ?? null,
      defenseType,
      defenseValue: hiddenDefense ? null : resolvedDefense,
      defenseHidden: hiddenDefense === true
    },
    workflowContext: patchedWorkflow
  };

  return {
    ...payload,
    context: patchedContext,
    flags: {
      ...(payload.flags ?? {}),
      swse: {
        ...(payload.flags?.swse ?? {}),
        workflowContext: patchedWorkflow
      }
    }
  };
}

function installAttackChatOutcomePatch() {
  if (SWSEChat[CHAT_OUTCOME_PATCH]) return;
  const original = SWSEChat.postRoll;
  if (typeof original !== 'function') return;
  SWSEChat.postRoll = async function patchedPostRoll(payload = {}) {
    return original.call(this, patchAttackChatPayload(payload));
  };
  SWSEChat[CHAT_OUTCOME_PATCH] = true;
}

function isMeleeWeapon(item) {
  const system = item?.system ?? {};
  const branch = String(system.meleeOrRanged ?? system.weaponRangeType ?? system.rangeType ?? system.range ?? '').toLowerCase();
  if (branch === 'ranged') return false;
  if (branch === 'melee') return true;
  const text = [item?.type, item?.name, system.weaponType, system.weaponGroup, system.weaponCategory, system.proficiency, system.category, system.subcategory].join(' ').toLowerCase();
  if (text.includes('lightsaber')) return true;
  if (text.includes('melee')) return true;
  return false;
}

function weaponGroupLabel(item, fallback = '') {
  const system = item?.system ?? {};
  const text = [item?.type, item?.name, system.weaponType, system.weaponGroup, system.weaponCategory, system.proficiency, system.category, system.subcategory].join(' ').toLowerCase();
  if (text.includes('lightsaber')) return 'Lightsaber';
  if (isMeleeWeapon(item) && /heavy[-\s]?weapons?/.test(text)) return 'Melee';
  const raw = fallback || system.weaponGroup || system.weaponType || system.weaponCategory || system.proficiency || '';
  return String(raw || 'Weapon').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function repairCombatTabWeaponDisplay(app, html) {
  const actor = actorFromApp(app);
  const root = rootFromHtml(html);
  if (!actor || !root?.querySelectorAll) return;
  const combatRoot = root.querySelector('[data-combat-tab-root]');
  if (!combatRoot) return;
  combatRoot.dataset.swseActorId = actor.id;
  combatRoot.querySelectorAll('.combat-action-row, [data-action="swse-v2-use-action"]').forEach(el => { el.dataset.actorId = actor.id; });

  for (const card of combatRoot.querySelectorAll('.swse-concept-attack-card')) {
    const button = card.querySelector('[data-action="roll-attack"][data-weapon-id]');
    const item = itemFromAnyActor(button?.dataset?.weaponId, actor);
    if (!item) continue;
    const melee = isMeleeWeapon(item);
    const line = card.querySelector('.swse-concept-attack-card__main > p');
    if (line) {
      const branchLabel = melee ? 'Melee' : 'Ranged';
      line.textContent = `${item.name || 'Weapon'} · ${weaponGroupLabel(item, line.textContent)} · ${branchLabel}`;
    }
    if (melee) {
      card.querySelectorAll('.swse-concept-attack-card__microline span').forEach(span => {
        if (/^\s*ammo\b/i.test(span.textContent || '')) span.remove();
      });
    }
  }
}

function scrubHiddenDefensesInRollDialog(_app, html) {
  if (game?.user?.isGM) return;
  const root = rootFromHtml(html);
  if (!root?.querySelector) return;
  const targetGrid = root.querySelector('.swse-roll-config-grid--target');
  if (!targetGrid) return;
  targetGrid.querySelectorAll('option').forEach(option => {
    option.textContent = String(option.textContent || '').replace(/\s*[·-]\s*Ref\s*\d+/i, '').replace(/\s*[·-]\s*(Fortitude|Will)\s*\d+/i, '');
  });
  const manual = targetGrid.querySelector('[name="targetDefenseValue"]');
  if (manual) {
    manual.value = '';
    manual.placeholder = 'Hidden from players';
  }
  const preview = root.querySelector('[data-rcd-dc-state]');
  if (preview) preview.textContent = 'Target/DC hidden unless you own the target.';
}

function isTripleAttackElement(element) {
  const row = element.closest?.('.combat-action-row, .swse-combat-action-card, .action-row, .swse-concept-action-row--combat') ?? element;
  const text = [row?.dataset?.actionId, row?.dataset?.actionKey, row?.querySelector?.('.action-name')?.textContent, element?.title, element?.textContent].join(' ');
  return compact(text).includes('tripleattack');
}

async function executeTripleAttackFromElement(element) {
  const actor = actorFromElement(element);
  if (!actor) {
    ui?.notifications?.warn?.('Could not resolve actor for Triple Attack. Reopen the sheet and try again.');
    return;
  }
  await FullAttackExecutor.execute(actor, {
    requestedPackage: FULL_ATTACK_PACKAGES.TRIPLE_ATTACK,
    sourceElement: element,
    actionId: 'triple-attack',
    actionName: 'Triple Attack'
  });
}

function installCombatActionDelegate() {
  if (globalThis[DELEGATE_PATCH]) return;
  globalThis[DELEGATE_PATCH] = true;
  document.addEventListener('click', event => {
    const element = event.target?.closest?.('[data-action="swse-v2-use-action"], .combat-action-row, .swse-combat-action-card, .action-row, .swse-concept-action-row--combat');
    if (!element || !isTripleAttackElement(element)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    executeTripleAttackFromElement(element).catch(err => {
      console.error('SWSE | Triple Attack execution failed', err);
      ui?.notifications?.error?.(`Triple Attack failed: ${err.message}`);
    });
  }, true);
}

export function registerCombatUiBehaviorHotfixes() {
  if (registered) return false;
  registered = true;
  installAttackChatOutcomePatch();
  installCombatActionDelegate();
  Hooks.on('renderSWSEV2CharacterSheet', repairCombatTabWeaponDisplay);
  Hooks.on('renderApplicationV2', repairCombatTabWeaponDisplay);
  Hooks.on('renderApplicationV2', scrubHiddenDefensesInRollDialog);
  Hooks.on('renderSWSEDialogV2', scrubHiddenDefensesInRollDialog);
  return true;
}

export default registerCombatUiBehaviorHotfixes;
