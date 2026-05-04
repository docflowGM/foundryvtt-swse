/**
 * CustomRollEngine
 *
 * V2-safe custom roll coordinator.
 * - UI collects intent only.
 * - Formula construction and roll execution live here.
 * - Roll execution delegates through the unified RollEngine/RollCore path.
 * - Chat output routes through SWSEChat.
 */

import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

export const CUSTOM_ROLL_DICE = Object.freeze(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']);

export const CUSTOM_ROLL_MODES = Object.freeze([
  { value: 'publicroll', label: 'Public Roll' },
  { value: 'gmroll', label: 'GM Roll' },
  { value: 'blindroll', label: 'Blind GM Roll' },
  { value: 'selfroll', label: 'Private / Self Roll' }
]);

const DEFAULT_DIE = 'd20';
const DEFAULT_ROLL_MODE = 'publicroll';

function coerceNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeModifier(value) {
  return Math.trunc(coerceNumber(value, 0));
}

function normalizeDc(value) {
  if (value === null || value === undefined || value === '') return null;
  const dc = Math.trunc(coerceNumber(value, NaN));
  return Number.isFinite(dc) ? dc : null;
}

function appendModifier(baseFormula, modifier) {
  const mod = normalizeModifier(modifier);
  if (!mod) return baseFormula;
  const sign = mod >= 0 ? '+' : '-';
  return `(${baseFormula}) ${sign} ${Math.abs(mod)}`;
}

function getDefaultRollMode() {
  const current = game?.settings?.get?.('core', 'rollMode');
  return CUSTOM_ROLL_MODES.some(mode => mode.value === current) ? current : DEFAULT_ROLL_MODE;
}

function getActorSpeaker(actor = null) {
  if (actor) return SWSEChat.speaker({ actor });
  return ChatMessage.getSpeaker();
}

export class CustomRollEngine {
  static getDiceOptions() {
    return CUSTOM_ROLL_DICE.map(die => ({ value: die, label: die.toUpperCase(), selected: die === DEFAULT_DIE }));
  }

  static getRollModeOptions() {
    const current = getDefaultRollMode();
    return CUSTOM_ROLL_MODES.map(mode => ({ ...mode, selected: mode.value === current }));
  }

  static getDefaultRollMode() {
    return getDefaultRollMode();
  }

  static buildFormula({ rollSource = 'die', die = DEFAULT_DIE, customFormula = '', modifier = 0 } = {}) {
    const source = rollSource === 'formula' ? 'formula' : 'die';

    let baseFormula;
    if (source === 'formula') {
      baseFormula = String(customFormula ?? '').trim();
      if (!baseFormula) {
        throw new Error('Enter a custom formula or switch to a die roll.');
      }
    } else {
      const normalizedDie = CUSTOM_ROLL_DICE.includes(String(die)) ? String(die) : DEFAULT_DIE;
      baseFormula = `1${normalizedDie}`;
    }

    return appendModifier(baseFormula, modifier);
  }

  static resolveChatVisibility(rollMode = getDefaultRollMode()) {
    const mode = CUSTOM_ROLL_MODES.some(entry => entry.value === rollMode) ? rollMode : getDefaultRollMode();
    const gmIds = ChatMessage.getWhisperRecipients('GM').map(user => user.id);

    switch (mode) {
      case 'gmroll':
        return { rollMode: mode, whisper: gmIds, blind: false };
      case 'blindroll':
        return { rollMode: mode, whisper: gmIds, blind: true };
      case 'selfroll':
        return { rollMode: mode, whisper: [game.user.id], blind: false };
      case 'publicroll':
      default:
        return { rollMode: 'publicroll', whisper: null, blind: false };
    }
  }

  static getDefaultActor() {
    return canvas?.tokens?.controlled?.[0]?.actor ?? game?.user?.character ?? null;
  }

  static async execute({
    actor = null,
    rollSource = 'die',
    die = DEFAULT_DIE,
    customFormula = '',
    modifier = 0,
    dc = null,
    rollMode = getDefaultRollMode(),
    label = 'Custom Roll'
  } = {}) {
    const rollingActor = actor ?? this.getDefaultActor();
    const customModifier = normalizeModifier(modifier);
    const targetDc = normalizeDc(dc);
    const formula = this.buildFormula({ rollSource, die, customFormula, modifier: customModifier });

    const roll = await RollEngine.safeRoll(formula, {}, {
      actor: rollingActor,
      domain: 'custom-roll',
      chat: false,
      flavor: label,
      context: {
        rollType: 'custom-roll',
        label,
        rollSource,
        die,
        customFormula,
        customModifier,
        dc: targetDc
      }
    });

    const hasDc = targetDc !== null;
    const passed = hasDc ? roll.total >= targetDc : null;
    const outcomeLabel = hasDc ? (passed ? 'Success' : 'Failure') : '';
    const category = hasDc ? (passed ? 'success' : 'fail') : 'neutral';
    const visibility = this.resolveChatVisibility(rollMode);

    await SWSEChat.postRoll({
      roll,
      actor: rollingActor,
      speaker: getActorSpeaker(rollingActor),
      flavor: label,
      rollMode: visibility.rollMode,
      whisper: visibility.whisper,
      blind: visibility.blind,
      flags: {
        swse: {
          rollType: 'custom-roll',
          customRoll: true,
          dc: targetDc,
          passed
        }
      },
      context: {
        rollType: 'custom-roll',
        label,
        rollLabel: label,
        customModifier,
        dc: targetDc,
        hasDc,
        passed,
        outcomeLabel,
        category,
        rollMode: visibility.rollMode,
        sourceLabel: rollSource === 'formula' ? 'Custom Formula' : die.toUpperCase(),
        formula
      }
    });

    return {
      roll,
      formula,
      actor: rollingActor,
      dc: targetDc,
      passed,
      outcomeLabel,
      rollMode: visibility.rollMode
    };
  }
}

export default CustomRollEngine;
