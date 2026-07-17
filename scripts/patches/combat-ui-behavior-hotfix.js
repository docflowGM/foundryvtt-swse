import { SWSEChat } from '/systems/foundryvtt-swse/scripts/chat/swse-chat.js';
import { rollAttack } from '/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js';
import { buildFullAttackSequence, FULL_ATTACK_PACKAGES, getEquippedWeapons, getWeaponGroup } from '/systems/foundryvtt-swse/scripts/combat/multi-attack.js';
import { ActionEconomyConsumption } from '/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js';
import { showRollModifiersDialog } from '/systems/foundryvtt-swse/scripts/rolls/roll-config.js';

const CHAT_OUTCOME_PATCH = Symbol.for('swse.combatUiBehaviorHotfix.chatOutcome.v1');
const DELEGATE_PATCH = Symbol.for('swse.combatUiBehaviorHotfix.delegate.v2');
let registered = false;

const DROID_ONLY_UNLOCK_ACTIONS = new Map([
  ['distracting droid', ['Distracting Droid']],
  ['feign haywire', ['Feign Haywire']],
  ['logic upgrade skill swap', ['Logic Upgrade: Skill Swap', 'Logic Upgrade - Skill Swap', 'Logic Upgrade Skill Swap']],
  ['droid shield mastery', ['Droid Shield Mastery']],
  ['sensor link', ['Sensor Link']],
  ['erratic target', ['Erratic Target']],
  ['link', ['Link']],
  ['shield surge', ['Shield Surge']]
]);

const UNLOCK_ONLY_ACTIONS = new Map([
  ['crush pinned opponent', ['Crush Pinned Opponent']],
  ['pin', ['Pin']],
  ['trip', ['Trip']],
  ['throw', ['Throw']]
]);

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

function sheetFromElement(element, actor = null) {
  const appRoot = element?.closest?.('[data-appid], [data-application-id]');
  const appId = appRoot?.dataset?.appid || appRoot?.dataset?.applicationId || '';
  if (appId && ui?.windows) {
    const app = Object.values(ui.windows).find(win => String(win?.appId ?? win?.id ?? '') === String(appId));
    if (app?.actor || app?.document) return app;
  }
  return actor?.sheet ?? null;
}

function actorFromElement(element) {
  const actorId = element?.dataset?.actorId || element?.closest?.('[data-swse-actor-id]')?.dataset?.swseActorId || '';
  if (actorId) return actorFromId(actorId);
  const sheet = sheetFromElement(element);
  if (sheet?.actor) return sheet.actor;
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

function actionNameFromRow(row) {
  return row?.querySelector?.('.action-name')?.textContent?.trim()
    || row?.dataset?.actionName
    || row?.dataset?.actionId
    || row?.dataset?.actionKey
    || row?.textContent?.trim()
    || '';
}

function canonicalActionKey(row) {
  const name = actionNameFromRow(row);
  return normalize(name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\b(ref|available|unlimited|full round|full-round|standard|move|swift|reaction|free)\b/ig, ' '));
}

function rowScore(row) {
  const button = row.querySelector?.('[data-action="swse-v2-use-action"], button');
  let score = 0;
  if (button) score += 4;
  if (!row.classList?.contains('is-disabled') && !button?.disabled) score += 2;
  if (button?.dataset?.actionId) score += 1;
  return score;
}

function isActorDroid(actor) {
  const text = [
    actor?.type,
    actor?.system?.species,
    actor?.system?.species?.name,
    actor?.system?.details?.species,
    actor?.system?.details?.species?.name,
    ...(Array.isArray(actor?.system?.tags) ? actor.system.tags : []),
    ...(Array.isArray(actor?.system?.traits) ? actor.system.traits : [])
  ].join(' ').toLowerCase();
  return actor?.type === 'droid' || /\bdroid\b|\bconstruct\b/.test(text);
}

function actorHasUnlock(actor, aliases = []) {
  const wanted = new Set((aliases || []).map(normalize).filter(Boolean));
  if (!wanted.size) return false;
  for (const item of actor?.items ?? []) {
    const candidates = [
      item?.name,
      item?.system?.slug,
      item?.system?.key,
      item?.flags?.swse?.slug,
      item?.flags?.['foundryvtt-swse']?.slug
    ].map(normalize).filter(Boolean);
    if (candidates.some(candidate => wanted.has(candidate))) return true;
  }
  return false;
}

function gatingAliasesForAction(actionKey) {
  return DROID_ONLY_UNLOCK_ACTIONS.get(actionKey) ?? UNLOCK_ONLY_ACTIONS.get(actionKey) ?? null;
}

function shouldHideAction(actor, actionKey) {
  if (DROID_ONLY_UNLOCK_ACTIONS.has(actionKey) && !isActorDroid(actor)) return true;
  const aliases = gatingAliasesForAction(actionKey);
  return !!aliases && !actorHasUnlock(actor, aliases);
}

function dedupeAndGateCombatActions(actor, combatRoot) {
  const rows = Array.from(combatRoot.querySelectorAll('.combat-action-row'));
  const kept = new Map();

  for (const row of rows) {
    const key = canonicalActionKey(row);
    if (!key) continue;
    row.dataset.swseCanonicalActionKey = key;

    if (shouldHideAction(actor, key)) {
      row.remove();
      continue;
    }

    const prior = kept.get(key);
    if (!prior) {
      kept.set(key, row);
      continue;
    }

    if (rowScore(row) > rowScore(prior)) {
      prior.remove();
      kept.set(key, row);
    } else {
      row.remove();
    }
  }

  for (const group of combatRoot.querySelectorAll('.combat-action-group')) {
    const count = group.querySelectorAll('.combat-action-row').length;
    const countEl = group.querySelector('.group-meta span:first-child');
    if (countEl) countEl.textContent = String(count);
    if (!count) group.remove();
  }
}

function repairCombatTabWeaponDisplay(app, html) {
  const actor = actorFromApp(app);
  const root = rootFromHtml(html);
  if (!actor || !root?.querySelectorAll) return;
  const combatRoot = root.querySelector('[data-combat-tab-root]');
  if (!combatRoot) return;
  combatRoot.dataset.swseActorId = actor.id;
  combatRoot.querySelectorAll('.combat-action-row, [data-action="swse-v2-use-action"]').forEach(el => { el.dataset.actorId = actor.id; });
  dedupeAndGateCombatActions(actor, combatRoot);

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

function multiAttackKind(element) {
  const row = element.closest?.('.combat-action-row, .swse-combat-action-card, .action-row, .swse-concept-action-row--combat') ?? element;
  const text = [row?.dataset?.actionId, row?.dataset?.actionKey, row?.dataset?.swseCanonicalActionKey, row?.querySelector?.('.action-name')?.textContent, element?.title, element?.textContent].join(' ');
  const key = compact(text);
  if (key.includes('tripleattack')) return 'triple';
  if (key.includes('doubleattack')) return 'double';
  return null;
}

function fallbackMultiAttackPlan(actor, packageType, weapon) {
  const penalty = packageType === FULL_ATTACK_PACKAGES.TRIPLE_ATTACK ? -10 : -5;
  const count = packageType === FULL_ATTACK_PACKAGES.TRIPLE_ATTACK ? 3 : 2;
  return {
    legal: !!weapon,
    packageType,
    actionType: 'full-round',
    warnings: weapon ? [] : ['No weapon equipped. Equip a weapon before using this attack.'],
    breakdown: [`${packageType === FULL_ATTACK_PACKAGES.TRIPLE_ATTACK ? 'Triple' : 'Double'} Attack fallback: ${penalty} per attack.`],
    attacks: Array.from({ length: count }, (_, index) => ({
      weapon,
      label: `${weapon?.name ?? 'Weapon'} — Attack ${index + 1}`,
      weaponGroup: getWeaponGroup(weapon),
      basePenalty: penalty,
      reduction: 0,
      finalPenalty: penalty,
      penaltySource: packageType === FULL_ATTACK_PACKAGES.TRIPLE_ATTACK ? 'Triple Attack' : 'Double Attack'
    }))
  };
}

async function executeMultiAttackFromElement(element, kind) {
  const actor = actorFromElement(element);
  if (!actor) {
    ui?.notifications?.warn?.('Could not resolve actor for multiattack. Reopen the sheet and try again.');
    return;
  }

  const equipped = getEquippedWeapons(actor);
  const packageType = kind === 'triple' ? FULL_ATTACK_PACKAGES.TRIPLE_ATTACK : FULL_ATTACK_PACKAGES.DOUBLE_ATTACK;
  let plan = buildFullAttackSequence(actor, { requestedPackage: packageType, primaryWeapon: equipped.primary });
  if (!plan?.legal) plan = fallbackMultiAttackPlan(actor, packageType, equipped.primary);
  if (!plan?.legal || !plan.attacks?.length) {
    ui?.notifications?.warn?.(plan?.warnings?.join(' ') || 'No legal multiattack sequence is available.');
    return;
  }

  const actionName = kind === 'triple' ? 'Triple Attack' : 'Double Attack';
  let spend = null;
  let rolled = 0;

  for (let index = 0; index < plan.attacks.length; index += 1) {
    const step = plan.attacks[index];
    const weapon = step.weapon;
    const options = await showRollModifiersDialog({
      title: `${actionName}: ${step.label}`,
      rollType: 'attack',
      actor,
      weapon,
      sourceElement: element,
      showCover: true,
      showConcealment: true,
      showForcePoint: true
    });

    if (!options) {
      if (!rolled && spend?.rollback) await spend.rollback();
      return;
    }

    if (!spend) {
      spend = await ActionEconomyConsumption.spend(actor, 'full-round', {
        actionName,
        actionId: kind === 'triple' ? 'triple-attack' : 'double-attack',
        source: 'combat-ui-behavior-hotfix'
      }, { notify: true });
      if (spend?.allowed === false || spend?.permitted === false) return;
    }

    const result = await rollAttack(actor, weapon, {
      ...options,
      sourceElement: element,
      sequencePenalty: Number(step.finalPenalty ?? 0) + Number(options.sequencePenalty ?? 0),
      actionId: kind === 'triple' ? 'triple-attack' : 'double-attack',
      actionName,
      actionData: {
        packageType,
        attackIndex: index + 1,
        attackCount: plan.attacks.length,
        penaltySource: step.penaltySource,
        basePenalty: step.basePenalty,
        reduction: step.reduction,
        finalPenalty: step.finalPenalty
      },
      rollNote: [options.rollNote, `${actionName} ${index + 1}/${plan.attacks.length}: ${step.penaltySource} ${step.finalPenalty}`].filter(Boolean).join(' | ')
    });

    if (!result && !rolled && spend?.rollback) {
      await spend.rollback();
      return;
    }
    if (result) rolled += 1;
  }
}

function installCombatActionDelegate() {
  if (globalThis[DELEGATE_PATCH]) return;
  globalThis[DELEGATE_PATCH] = true;
  document.addEventListener('click', event => {
    const element = event.target?.closest?.('[data-action="swse-v2-use-action"], .combat-action-row, .swse-combat-action-card, .action-row, .swse-concept-action-row--combat');
    const kind = element ? multiAttackKind(element) : null;
    if (!element || !kind) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    executeMultiAttackFromElement(element, kind).catch(err => {
      console.error(`SWSE | ${kind === 'triple' ? 'Triple' : 'Double'} Attack execution failed`, err);
      ui?.notifications?.error?.(`${kind === 'triple' ? 'Triple' : 'Double'} Attack failed: ${err.message}`);
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
