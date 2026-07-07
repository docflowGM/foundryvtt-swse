/**
 * Telekinetic Prodigy Runtime Patches
 *
 * Keeps Telekinetic Savant and Telekinetic Prodigy separated:
 * - Savant: Swift Action recovery of a spent [Telekinetic] Force Power.
 * - Prodigy: one extra [Telekinetic] Force Power slot only when the current
 *   Force Training selection includes Move Object.
 */

import { ForcePowerStep } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/force-power-step.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function normalizeTrigger(value) {
  return String(value ?? '').trim().toLowerCase();
}

function suppressProdigyOnlyRetroactiveSlot(result = {}) {
  if (normalizeTrigger(result?.trigger) !== 'new-prodigy-retroactive-move-object') return result;
  return {
    ...result,
    slots: 0,
    active: false,
    trigger: '',
    suppressedTrigger: 'new-prodigy-retroactive-move-object',
    rulesCorrection: 'Telekinetic Prodigy grants its bonus slot only when the current Force Training selection includes Move Object.'
  };
}

export function registerTelekineticProdigyRuntimePatches() {
  if (registered) return;
  registered = true;

  if (!ForcePowerStep?.prototype) {
    SWSELogger.warn('[TelekineticProdigyRuntime] ForcePowerStep unavailable; patch not applied');
    return;
  }
  if (ForcePowerStep.prototype.__swseTelekineticProdigyRuntimePatched === true) return;

  const originalGetTelekineticProdigyResolution = ForcePowerStep.prototype._getTelekineticProdigyResolution;
  if (typeof originalGetTelekineticProdigyResolution === 'function') {
    ForcePowerStep.prototype._getTelekineticProdigyResolution = function patchedTelekineticProdigyResolution(actor) {
      const result = originalGetTelekineticProdigyResolution.call(this, actor);
      return suppressProdigyOnlyRetroactiveSlot(result);
    };
  }

  ForcePowerStep.prototype.__swseTelekineticProdigyRuntimePatched = true;
  globalThis.SWSE ??= {};
  globalThis.SWSE.TelekineticProdigyRuntime = { patched: true };
  SWSELogger.log('[TelekineticProdigyRuntime] Force Training-only Prodigy slot patch registered');
}

export default registerTelekineticProdigyRuntimePatches;
