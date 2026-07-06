import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

const AUTOFIRE_RIDERS = ['burstFire', 'autofireAssault', 'autofireSweep'];
const AUTOFIRE_RIDER_METADATA = {
  burstFire: {
    label: 'Burst Fire',
    riderForAttackMode: 'autofire',
    mutationOf: 'autofire',
    mutationGroup: 'autofireRiderMutation',
    exclusiveAttackOptionGroup: 'autofireRiderMutation',
    selectionField: 'autofireRiderMutation',
    selectionSurface: 'autofireRiderPicker'
  },
  autofireAssault: {
    label: 'Autofire Assault',
    riderForAttackMode: 'autofire',
    mutationOf: 'autofire',
    mutationGroup: 'autofireRiderMutation',
    exclusiveAttackOptionGroup: 'autofireRiderMutation',
    selectionField: 'autofireRiderMutation',
    selectionSurface: 'autofireRiderPicker'
  },
  autofireSweep: {
    label: 'Autofire Sweep',
    riderForAttackMode: 'autofire',
    mutationOf: 'autofire',
    mutationGroup: 'autofireRiderMutation',
    exclusiveAttackOptionGroup: 'autofireRiderMutation',
    selectionField: 'autofireRiderMutation',
    selectionSurface: 'autofireRiderPicker'
  }
};

function cloneOptions(options = {}) {
  const deepClone = globalThis.foundry?.utils?.deepClone;
  return deepClone ? deepClone(options) : JSON.parse(JSON.stringify(options ?? {}));
}

function selectedAutofireRider(options = {}) {
  const combat = options.combatOptions ?? {};
  const attack = options.attackOptions ?? {};
  const explicit = options.autofireRiderMutation
    ?? combat.autofireRiderMutation
    ?? attack.autofireRiderMutation
    ?? combat.autofireMutation
    ?? attack.autofireMutation
    ?? combat.autofireRider
    ?? attack.autofireRider;
  if (AUTOFIRE_RIDERS.includes(String(explicit))) return String(explicit);

  const selected = AUTOFIRE_RIDERS.filter(id => combat[id] === true || attack[id] === true || options[id] === true);
  return selected[0] ?? '';
}

function normalizeAutofireRiderSelection(options = {}) {
  const selected = selectedAutofireRider(options);
  if (!selected) return options;

  const next = cloneOptions(options);
  next.combatOptions = { ...(next.combatOptions ?? {}) };
  next.attackOptions = { ...(next.attackOptions ?? {}) };
  next.autofireRiderMutation = selected;
  next.combatOptions.autofireRiderMutation = selected;
  next.attackOptions.autofireRiderMutation = selected;

  for (const rider of AUTOFIRE_RIDERS) {
    const enabled = rider === selected;
    next.combatOptions[rider] = enabled;
    next.attackOptions[rider] = enabled;
  }
  next.flags = Array.isArray(next.flags) ? [...new Set([...next.flags, 'autofireRiderMutationSelected'])] : ['autofireRiderMutationSelected'];
  return next;
}

function decorateAutofireRiderOption(option) {
  const meta = AUTOFIRE_RIDER_METADATA[option?.id];
  if (!meta) return option;
  return {
    ...option,
    ...meta,
    control: option.control || 'rider-choice'
  };
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseAutofireRiderSelectionPatched === true) return;
  const originalSummarize = CombatOptionResolver.summarizeAttackOptions?.bind(CombatOptionResolver);
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect !== 'function') return;

  if (typeof originalSummarize === 'function') {
    CombatOptionResolver.summarizeAttackOptions = function patchedSummarizeAttackOptions(actor, weapon, options = {}) {
      const normalized = normalizeAutofireRiderSelection(options);
      const summary = originalSummarize(actor, weapon, normalized) ?? [];
      return summary.map(decorateAutofireRiderOption);
    };
  }

  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, options = {}) {
    const normalized = normalizeAutofireRiderSelection(options);
    const result = originalCollect(actor, weapon, normalized) ?? {};
    const selected = selectedAutofireRider(normalized);
    if (selected) {
      result.flags ??= {};
      result.flags.autofireRiderMutation = selected;
      result.flags.autofireRiderExclusiveGroup = 'autofireRiderMutation';
      result.breakdown ??= [];
      if (!result.breakdown.some(entry => entry?.type === 'autofireRiderMutation' && entry?.value === selected)) {
        result.breakdown.push({ label: `Autofire rider: ${AUTOFIRE_RIDER_METADATA[selected]?.label ?? selected}`, value: selected, type: 'autofireRiderMutation' });
      }
    }
    return result;
  };

  CombatOptionResolver.__swseAutofireRiderSelectionPatched = true;
}

export function registerWeaponAutofireRiderRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  SWSELogger.log('[WeaponAutofireRiderRuntime] Runtime patches registered');
}

export default registerWeaponAutofireRiderRuntimePatches;
