/**
 * Telekinetic Prodigy Runtime Patches
 *
 * Keeps Telekinetic Savant and Telekinetic Prodigy separated:
 * - Savant: Swift Action recovery of a spent [Telekinetic] Force Power.
 * - Prodigy: one extra [Telekinetic] Force Power slot only when the current
 *   Force Training selection includes Move Object.
 */

import { ForcePowerStep } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/force-power-step.js";
import { TalentStep } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

const TELEKINETIC_TALENT_TEXT = {
  telekineticsavant: {
    name: 'Telekinetic Savant',
    prerequisite: '',
    description: 'Once per encounter as a Swift Action, you may return one Force Power with the [Telekinetic] descriptor to your suite without spending a Force Point. You may take this Talent multiple times. Each time you select it, you may use this Talent one additional time per encounter.',
    benefit: 'Swift Action, once per encounter per selection: recover one spent [Telekinetic] Force Power without spending a Force Point.',
    repeatable: true
  },
  telekineticprodigy: {
    name: 'Telekinetic Prodigy',
    prerequisite: 'Telekinetic Savant',
    description: 'When you take the Force Training Feat and select Move Object as one of your Force Powers, you can also select one extra Force Power to add to your Force Power Suite for free. This extra Force Power must contain the [Telekinetic] descriptor. You can only gain one extra Force Power each time you take the Force Training Feat, regardless of how many times you choose the Move Object Force Power. If you increase your Wisdom score at a later time and select the Move Object power, you only gain an additional power if you did not take the Move Object power when you first chose that Feat. Otherwise, you gain an additional Force Power as normal.',
    benefit: 'When the current Force Training selection includes Move Object, grant one extra [Telekinetic] Force Power slot for that Force Training event only.',
    repeatable: false
  }
};

function normalizeName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeTrigger(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getTelekineticTalentCorrection(talentOrName) {
  const key = normalizeName(typeof talentOrName === 'object'
    ? (talentOrName?.name || talentOrName?.label || talentOrName?.id || talentOrName?._id)
    : talentOrName);
  return TELEKINETIC_TALENT_TEXT[key] || null;
}

function applyTelekineticTalentCorrection(talent) {
  const correction = getTelekineticTalentCorrection(talent);
  if (!correction || !talent || typeof talent !== 'object') return talent;
  const system = {
    ...(talent.system || {}),
    description: correction.description,
    benefit: correction.benefit,
    prerequisite: correction.prerequisite,
    prerequisites: correction.prerequisite,
    summary: correction.benefit,
    repeatable: correction.repeatable,
    canRepeat: correction.repeatable,
    allowDuplicates: correction.repeatable
  };
  return {
    ...talent,
    name: correction.name,
    description: correction.description,
    benefit: correction.benefit,
    prerequisite: correction.prerequisite,
    prerequisites: correction.prerequisite,
    repeatable: correction.repeatable,
    system,
    flags: {
      ...(talent.flags || {}),
      swse: {
        ...(talent.flags?.swse || {}),
        telekineticTalentTextCorrected: true
      }
    }
  };
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

function registerTalentPickerTextPatch() {
  if (!TalentStep?.prototype) {
    SWSELogger.warn('[TelekineticTalentText] TalentStep unavailable; picker text patch not applied');
    return;
  }
  if (TalentStep.prototype.__swseTelekineticTalentTextPatched === true) return;

  const originalGetTalent = TalentStep.prototype._getTalent;
  if (typeof originalGetTalent === 'function') {
    TalentStep.prototype._getTalent = function patchedGetTalent(talentId) {
      return applyTelekineticTalentCorrection(originalGetTalent.call(this, talentId));
    };
  }

  const originalGetTalentDescription = TalentStep.prototype._getTalentDescription;
  if (typeof originalGetTalentDescription === 'function') {
    TalentStep.prototype._getTalentDescription = function patchedGetTalentDescription(talent) {
      const correction = getTelekineticTalentCorrection(talent);
      return correction?.description || originalGetTalentDescription.call(this, talent);
    };
  }

  const originalGetTalentBenefit = TalentStep.prototype._getTalentBenefit;
  if (typeof originalGetTalentBenefit === 'function') {
    TalentStep.prototype._getTalentBenefit = function patchedGetTalentBenefit(talent) {
      const correction = getTelekineticTalentCorrection(talent);
      return correction?.benefit || originalGetTalentBenefit.call(this, talent);
    };
  }

  const originalGetTalentPrerequisiteText = TalentStep.prototype._getTalentPrerequisiteText;
  if (typeof originalGetTalentPrerequisiteText === 'function') {
    TalentStep.prototype._getTalentPrerequisiteText = function patchedGetTalentPrerequisiteText(talent) {
      const correction = getTelekineticTalentCorrection(talent);
      return correction?.prerequisite ?? originalGetTalentPrerequisiteText.call(this, talent);
    };
  }

  const originalBuildCanonicalTalentSelection = TalentStep.prototype._buildCanonicalTalentSelection;
  if (typeof originalBuildCanonicalTalentSelection === 'function') {
    TalentStep.prototype._buildCanonicalTalentSelection = function patchedBuildCanonicalTalentSelection(talent) {
      return originalBuildCanonicalTalentSelection.call(this, applyTelekineticTalentCorrection(talent));
    };
  }

  TalentStep.prototype.__swseTelekineticTalentTextPatched = true;
}

export function registerTelekineticProdigyRuntimePatches() {
  if (registered) return;
  registered = true;

  if (!ForcePowerStep?.prototype) {
    SWSELogger.warn('[TelekineticProdigyRuntime] ForcePowerStep unavailable; patch not applied');
  } else if (ForcePowerStep.prototype.__swseTelekineticProdigyRuntimePatched !== true) {
    const originalGetTelekineticProdigyResolution = ForcePowerStep.prototype._getTelekineticProdigyResolution;
    if (typeof originalGetTelekineticProdigyResolution === 'function') {
      ForcePowerStep.prototype._getTelekineticProdigyResolution = function patchedTelekineticProdigyResolution(actor) {
        const result = originalGetTelekineticProdigyResolution.call(this, actor);
        return suppressProdigyOnlyRetroactiveSlot(result);
      };
    }

    ForcePowerStep.prototype.__swseTelekineticProdigyRuntimePatched = true;
  }

  registerTalentPickerTextPatch();

  globalThis.SWSE ??= {};
  globalThis.SWSE.TelekineticProdigyRuntime = {
    patched: true,
    correctedTalentText: Object.keys(TELEKINETIC_TALENT_TEXT)
  };
  SWSELogger.log('[TelekineticProdigyRuntime] Force Training-only Prodigy slot and talent picker text patches registered');
}

export default registerTelekineticProdigyRuntimePatches;
