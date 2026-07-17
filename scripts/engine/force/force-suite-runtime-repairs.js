import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DerivedCalculator } from "/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js";
import { promptForcePowerRollOptions } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/force-roll-dialog.js";

let registered = false;
const TELEKINETIC_MESSAGE_PATCH_FLAG = Symbol.for('swse.forceSuiteRuntimeRepairs.telekineticMessage.v1');
const FORCE_EXECUTOR_ROLLBACK_PATCH_FLAG = Symbol.for('swse.forceSuiteRuntimeRepairs.rollback.v1');
const SKILL_FOCUS_NON_STACK_PATCH_FLAG = Symbol.for('swse.forceSuiteRuntimeRepairs.skillFocusNonStack.v1');

function normalizeName(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*\(\d+\)\s*$/, '');
}

function normalizeChoiceKey(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function actorHasTalent(actor, talentName) {
  const wanted = normalizeName(talentName);
  return Array.from(actor?.items ?? []).some(item => item?.type === 'talent' && normalizeName(item?.name) === wanted);
}

function actorHasSkillFocusForSkill(actor, skillKey) {
  const wanted = normalizeChoiceKey(skillKey);
  if (!wanted) return false;
  for (const item of actor?.items ?? []) {
    if (item?.type !== 'feat') continue;
    if (normalizeName(item?.name) !== 'skill focus') continue;
    const choices = [
      item?.system?.selectedChoice,
      item?.flags?.swse?.selectedChoice,
      item?.flags?.['foundryvtt-swse']?.selectedChoice,
      item?.system?.choice,
      item?.system?.focusedSkill,
      item?.system?.skill
    ];
    for (const choice of choices) {
      if (!choice) continue;
      if (typeof choice === 'string') {
        if (normalizeChoiceKey(choice) === wanted) return true;
        continue;
      }
      const choiceValues = [choice.id, choice.key, choice.value, choice.slug, choice.label, choice.name, choice.skill, choice.target];
      if (choiceValues.some(value => normalizeChoiceKey(value) === wanted)) return true;
    }
  }
  return false;
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

function installForcePowerErrorRollback() {
  if (ForceExecutor[FORCE_EXECUTOR_ROLLBACK_PATCH_FLAG]) return;
  const originalExecuteForcePower = ForceExecutor.executeForcePower;
  if (typeof originalExecuteForcePower !== 'function') return;

  ForceExecutor.executeForcePower = async function patchedExecuteForcePower(actor, powerId, options = {}) {
    const beforePower = actor?.items?.get?.(powerId) ?? null;
    const wasDiscarded = beforePower?.system?.discarded === true;
    const startedAt = Date.now();
    let result;

    try {
      result = await originalExecuteForcePower.call(this, actor, powerId, options);
    } catch (err) {
      result = { success: false, error: err?.message || String(err) };
      console.error('SWSE | Force power execution threw outside executor catch', err);
    }

    // A failed Use the Force check is still a real power use. Only rollback when
    // the executor reports an internal/runtime error, which is represented by an
    // error string on the result object.
    if (result?.error) {
      const currentPower = actor?.items?.get?.(powerId) ?? null;
      const shouldRestoreReady = currentPower && !wasDiscarded && currentPower.system?.discarded === true;
      if (shouldRestoreReady) {
        try {
          await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
            _id: powerId,
            'system.discarded': false,
            'system.lastUseError': result.error,
            'flags.foundryvtt-swse.lastForcePowerExecutionError': {
              message: result.error,
              at: Date.now(),
              restoredReadyState: true
            }
          }], { source: 'force-power-error-rollback', render: false });
        } catch (rollbackErr) {
          console.error('SWSE | Force power error rollback failed', {
            actorId: actor?.id,
            actorName: actor?.name,
            powerId,
            powerName: beforePower?.name,
            originalError: result.error,
            rollbackError: rollbackErr
          });
        }
      }

      console.error('SWSE | Force power execution failed before completion', {
        actorId: actor?.id,
        actorName: actor?.name,
        powerId,
        powerName: beforePower?.name ?? currentPower?.name,
        error: result.error,
        restoredReadyState: shouldRestoreReady,
        durationMs: Date.now() - startedAt
      });
    }

    return result;
  };

  ForceExecutor[FORCE_EXECUTOR_ROLLBACK_PATCH_FLAG] = true;
}

function suppressDuplicateSkillFocusInUpdates(updates, actor) {
  const skills = updates?.['system.derived.skills'];
  if (!skills || typeof skills !== 'object') return;

  for (const [skillKey, skill] of Object.entries(skills)) {
    if (!skill || skill.focused !== true) continue;
    if (!actorHasSkillFocusForSkill(actor, skillKey)) continue;

    const featBonus = Number(skill.featBonus) || 0;
    const focusBonus = Number(skill.focusBonus) || 0;
    const parts = Array.isArray(skill.math?.parts) ? skill.math.parts : (Array.isArray(skill.breakdown) ? skill.breakdown : []);
    const modifierPart = parts.find(part => part?.key === 'modifiers')
      ?? parts.find(part => /feat|equipment|effect|modifier/i.test(String(part?.label || part?.source || '')));
    const modifierValue = Number(modifierPart?.value) || 0;
    const duplicateAmount = focusBonus > 0 && Math.max(featBonus, modifierValue) >= 5 ? 5 : 0;
    if (!duplicateAmount) continue;

    skill.total = (Number(skill.total) || 0) - duplicateAmount;
    skill.featBonus = featBonus - duplicateAmount;
    skill.skillFocusNonStacking = true;
    skill.duplicateSkillFocusSuppressed = duplicateAmount;

    if (modifierPart) modifierPart.value = modifierValue - duplicateAmount;
    if (skill.math) {
      skill.math.total = skill.total;
      const recomputed = parts.reduce((sum, part) => sum + (Number(part?.value) || 0), 0);
      skill.math.verified = Math.abs(recomputed - skill.total) <= 0.001;
      skill.math.skillFocusNonStacking = true;
      skill.math.duplicateSkillFocusSuppressed = duplicateAmount;
    }
  }
}

function installSkillFocusNonStackingGuard() {
  if (DerivedCalculator[SKILL_FOCUS_NON_STACK_PATCH_FLAG]) return;
  const originalComputeAll = DerivedCalculator.computeAll;
  if (typeof originalComputeAll !== 'function') return;

  DerivedCalculator.computeAll = async function patchedComputeAll(actor, ...args) {
    const updates = await originalComputeAll.call(this, actor, ...args);
    try {
      suppressDuplicateSkillFocusInUpdates(updates, actor);
    } catch (err) {
      console.warn('SWSE | Skill Focus non-stacking guard failed', err);
    }
    return updates;
  };

  DerivedCalculator.clearCaches?.();
  DerivedCalculator[SKILL_FOCUS_NON_STACK_PATCH_FLAG] = true;
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

function signed(value) {
  const n = Number(value) || 0;
  return n >= 0 ? `+${n}` : String(n);
}

function repairSkillMathDisplay(app, html) {
  const actor = actorFromApp(app);
  const root = rootFromHtml(html);
  if (!actor || !root?.querySelectorAll) return;
  const rows = root.querySelectorAll('.swse-concept-skill-row[data-skill]');
  if (!rows.length) return;

  for (const row of rows) {
    const key = row.dataset.skill;
    const skill = actor.system?.derived?.skills?.[key];
    if (!skill) continue;
    const parts = Array.isArray(skill.math?.parts) ? skill.math.parts : (Array.isArray(skill.breakdown) ? skill.breakdown : []);
    const suffix = skill.duplicateSkillFocusSuppressed
      ? ` | Skill Focus non-stacking: suppressed duplicate +${skill.duplicateSkillFocusSuppressed}`
      : '';
    const title = parts.length
      ? `${row.dataset.label || key} = ${signed(skill.total)} (${parts.map(part => `${part.label || part.key}: ${signed(part.value)}`).join(' | ')})${suffix}`
      : `${row.dataset.label || key} = ${signed(skill.total)}${suffix}`;
    row.querySelector('.swse-concept-skill-stat--total')?.setAttribute('title', title);

    const breakdown = row.querySelector('.swse-concept-skill-breakdown');
    if (!breakdown) continue;
    const existing = new Set(Array.from(breakdown.querySelectorAll('[data-runtime-skill-part]')).map(el => el.dataset.runtimeSkillPart));
    for (const part of parts) {
      const partKey = String(part?.key || part?.label || '').trim();
      const value = Number(part?.value) || 0;
      if (!partKey || value === 0 || existing.has(partKey)) continue;
      if (['ability', 'halfLevel', 'trained', 'focus', 'misc', 'armor'].includes(partKey)) continue;
      const chip = document.createElement('span');
      chip.dataset.runtimeSkillPart = partKey;
      chip.textContent = `${part.label || partKey} ${signed(value)}`;
      breakdown.appendChild(chip);
    }
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
  installForcePowerErrorRollback();
  installSkillFocusNonStackingGuard();
  if (registered) return;
  registered = true;
  installForceCardClickRepair();
  Hooks.on('renderSWSEV2CharacterSheet', repairForceCardIds);
  Hooks.on('renderSWSEV2CharacterSheet', repairSkillMathDisplay);
  Hooks.on('renderApplicationV2', repairForceCardIds);
  Hooks.on('renderApplicationV2', repairSkillMathDisplay);
}
