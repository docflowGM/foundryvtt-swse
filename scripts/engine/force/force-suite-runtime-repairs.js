import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { promptForcePowerRollOptions } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/force-roll-dialog.js";

let registered = false;
const TELEKINETIC_MESSAGE_PATCH_FLAG = Symbol.for('swse.forceSuiteRuntimeRepairs.telekineticMessage.v1');

function normalizeName(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*\(\d+\)\s*$/, '');
}

function actorHasTalent(actor, talentName) {
  const wanted = normalizeName(talentName);
  return Array.from(actor?.items ?? []).some(item => item?.type === 'talent' && normalizeName(item?.name) === wanted);
}

function encounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function readTelepathicIntruderState(actor) {
  return actor?.getFlag?.('foundryvtt-swse', 'telepathicIntruder')
    ?? actor?.flags?.['foundryvtt-swse']?.telepathicIntruder
    ?? actor?.flags?.swse?.telepathicIntruder
    ?? null;
}

function actorFromTarget(target) {
  return target?.actor ?? target ?? null;
}

function targetActorFromOptions(options = {}) {
  return actorFromTarget(options.targetActor
    ?? options.target
    ?? options.targetContext?.actor
    ?? game?.user?.targets?.first?.()
    ?? null);
}

function isMindAffectingPower(power, descriptors = []) {
  if (typeof ForceExecutor.isMindAffectingForcePower === 'function' && ForceExecutor.isMindAffectingForcePower(power)) return true;
  const system = power?.system ?? {};
  const haystack = [
    power?.name,
    system.discipline,
    system.category,
    system.subcategory,
    system.effect,
    system.summary,
    system.description,
    ...(Array.isArray(descriptors) ? descriptors : []),
    ...(Array.isArray(system.descriptor) ? system.descriptor : []),
    ...(Array.isArray(system.descriptors) ? system.descriptors : []),
    ...(Array.isArray(system.tags) ? system.tags : [])
  ].join(' ').toLowerCase();
  return /mind[-\s]?affecting|mind|telepathic|illusion|influence|mind trick|fear/.test(haystack);
}

function stateStillCurrent(state) {
  if (!state) return false;
  if (state.encounterId && state.encounterId !== encounterId()) return false;
  if (state.expires === 'end_next_turn' && game?.combat?.started) {
    const createdRound = Number(state.round ?? game.combat.round ?? 0) || 0;
    const currentRound = Number(game.combat.round ?? 0) || 0;
    if (createdRound > 0 && currentRound > createdRound + 1) return false;
  }
  return true;
}

function installTelepathicIntruderBonus() {
  ForceExecutor._getTelepathicIntruderBonus = function getTelepathicIntruderBonus(actor, power, descriptors = [], options = {}) {
    if (!actor || !power) return 0;
    if (!actorHasTalent(actor, 'Telepathic Intruder')) return 0;
    if (!isMindAffectingPower(power, descriptors)) return 0;

    const state = readTelepathicIntruderState(actor);
    if (!stateStillCurrent(state)) return 0;

    const target = targetActorFromOptions(options);
    if (!target?.id) return 0;
    if (state.targetActorId && String(state.targetActorId) !== String(target.id)) return 0;

    return Number(state.bonus ?? 2) || 2;
  };
}

function installTelekineticRepeatActionRepair() {
  // force-executor.js currently passes telekineticPowerRepeatAction while the
  // local value is named telekineticRepeatAction. In a module, that unresolved
  // identifier throws after the roll resolves but before the chat card posts.
  // A global binding prevents the ReferenceError; the message wrapper below
  // rebuilds the actual action payload so the Telekinetic Power repeat button
  // still appears when a natural 20 qualifies.
  if (!Object.prototype.hasOwnProperty.call(globalThis, 'telekineticPowerRepeatAction')) {
    globalThis.telekineticPowerRepeatAction = null;
  }

  if (ForceExecutor[TELEKINETIC_MESSAGE_PATCH_FLAG]) return;
  const originalGenerateForcePowerRollMessage = ForceExecutor._generateForcePowerRollMessage;
  if (typeof originalGenerateForcePowerRollMessage !== 'function') return;

  ForceExecutor._generateForcePowerRollMessage = async function patchedGenerateForcePowerRollMessage(
    actor,
    power,
    roll,
    total,
    baseDC,
    success,
    isCritical,
    extra = {}
  ) {
    let patchedExtra = extra || {};
    if (!patchedExtra.telekineticPowerRepeatAction && isCritical === true && patchedExtra.freeActionRepeat !== true) {
      try {
        const descriptors = Array.isArray(patchedExtra.forceDescriptors) && patchedExtra.forceDescriptors.length
          ? patchedExtra.forceDescriptors
          : (typeof this._getPowerDescriptors === 'function' ? this._getPowerDescriptors(power) : []);
        const talentContext = typeof this._buildForceTalentContext === 'function'
          ? this._buildForceTalentContext(actor, power, descriptors, patchedExtra)
          : {};
        const isTelekinetic = talentContext?.isTelekinetic ?? (typeof this._isTelekineticPower === 'function' ? this._isTelekineticPower(power, descriptors) : false);
        const hasTalent = talentContext?.hasTelekineticPower ?? actorHasTalent(actor, 'Telekinetic Power');
        const repeatAction = typeof this._buildTelekineticPowerRepeatAction === 'function'
          ? this._buildTelekineticPowerRepeatAction(actor, power, { isCritical, isTelekinetic, hasTalent, freeRepeat: false })
          : null;
        if (repeatAction) patchedExtra = { ...patchedExtra, telekineticPowerRepeatAction: repeatAction };
      } catch (err) {
        console.warn('SWSE | Telekinetic Power repeat action repair failed', err);
      }
    }

    return originalGenerateForcePowerRollMessage.call(this, actor, power, roll, total, baseDC, success, isCritical, patchedExtra);
  };

  ForceExecutor[TELEKINETIC_MESSAGE_PATCH_FLAG] = true;
}

function rootFromHtml(html) {
  return html instanceof HTMLElement ? html : html?.[0] ?? html;
}

function actorFromApp(app) {
  const candidate = app?.actor ?? app?.document ?? null;
  return candidate?.items ? candidate : null;
}

function forcePowerByName(actor, name) {
  const wanted = normalizeName(name);
  if (!wanted) return null;
  return Array.from(actor?.items ?? []).find(item => item?.type === 'force-power' && normalizeName(item?.name) === wanted) ?? null;
}

function repairForceCardIds(app, html) {
  const actor = actorFromApp(app);
  const root = rootFromHtml(html);
  if (!actor || !root?.querySelectorAll) return;
  if (!root.querySelector('[data-force-suite-tab]')) return;

  for (const card of root.querySelectorAll('.force-card')) {
    const currentId = card.dataset.itemId || '';
    const name = card.querySelector('.force-name, .fc-name')?.textContent?.trim() || '';
    const power = currentId ? actor.items?.get?.(currentId) : forcePowerByName(actor, name);
    if (!power?.id) continue;

    card.dataset.itemId = power.id;
    card.querySelectorAll('[data-action="activate-force"]').forEach(button => {
      button.dataset.itemId = power.id;
      button.dataset.actorId = actor.id;
    });

    card.querySelectorAll('.fc-use--recorded').forEach(span => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fc-use';
      button.dataset.action = 'activate-force';
      button.dataset.itemId = power.id;
      button.dataset.actorId = actor.id;
      button.dataset.swseRuntimeRepaired = 'true';
      button.textContent = '▶ USE POWER';
      span.replaceWith(button);
    });
  }
}

async function executeRepairedForceButton(button) {
  const actor = game?.actors?.get?.(button.dataset.actorId) ?? null;
  const itemId = button.dataset.itemId || '';
  const power = actor?.items?.get?.(itemId) ?? null;
  if (!actor || !power) {
    ui?.notifications?.warn?.('Could not resolve this Force Power from the actor. Reopen the sheet and try again.');
    return;
  }

  const isRecovery = power.system?.discarded ?? false;
  const rollOptions = isRecovery ? null : await promptForcePowerRollOptions({ actor, power, sourceElement: button });
  if (!isRecovery && !rollOptions) return;

  button.disabled = true;
  const result = isRecovery
    ? await ForceExecutor.activateForce(actor, itemId, true)
    : await ForceExecutor.executeForcePower(actor, itemId, rollOptions);
  button.disabled = false;

  if (result?.success === false) ui?.notifications?.warn?.(result?.error || `${power.name} failed.`);
  else ui?.notifications?.info?.(`${power.name} ${isRecovery ? 'recovered' : 'used'}`);
  actor.sheet?.render?.(false);
}

function installForceCardClickRepair() {
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('[data-action="activate-force"][data-swse-runtime-repaired="true"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    executeRepairedForceButton(button).catch(err => {
      console.error('SWSE | repaired Force Power action failed', err);
      ui?.notifications?.error?.(`Force Power failed: ${err.message}`);
      button.disabled = false;
    });
  }, true);
}

export function registerForceSuiteRuntimeRepairs() {
  installTelepathicIntruderBonus();
  installTelekineticRepeatActionRepair();
  if (registered) return;
  registered = true;
  installForceCardClickRepair();
  Hooks.on('renderSWSEV2CharacterSheet', repairForceCardIds);
  Hooks.on('renderApplicationV2', repairForceCardIds);
}
