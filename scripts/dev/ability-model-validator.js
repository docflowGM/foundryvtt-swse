/**
 * AbilityModelValidator (dev-only)
 * Logs warnings for malformed ability UI models during migration.
 *
 * Rules:
 * - Never throws.
 * - Never mutates.
 * - Never blocks rendering.
 */

function _warn(group, msg, payload) {
  // eslint-disable-next-line no-console
  console.warn(`[AbilityValidator] ${group}: ${msg}`, payload);
}

function _isDevMode() {
  try {
    if (globalThis?.CONFIG?.debug?.swse) return true;
  } catch (_err) {}
  try {
    return !!globalThis?.game?.settings?.get?.('swse', 'devMode');
  } catch (_err) {}
  return false;
}

function _req(obj, key) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function _validateUsesData(usesData, path) {
  if (!usesData) return _warn('usesData', `missing at ${path}`, usesData);
  for (const k of ['isLimited', 'max', 'current', 'refreshLabel']) {
    if (!_req(usesData, k)) _warn('usesData', `missing ${k} at ${path}`, usesData);
  }
}

function _validateSpecialActionData(sad, path) {
  if (!sad) return;
  if (!_req(sad, 'typeLabel')) _warn('specialActionData', `missing typeLabel at ${path}`, sad);
  if (sad.uses) {
    if (!_req(sad.uses, 'current') || !_req(sad.uses, 'max')) {
      _warn('specialActionData.uses', `malformed uses at ${path}.uses`, sad.uses);
    }
  }
}

function _validateRollData(rollData, path) {
  if (!rollData) return;
  if (!_req(rollData, 'canRoll')) _warn('rollData', `missing canRoll at ${path}`, rollData);
  if (rollData.canRoll) {
    for (const k of ['skillName', 'modifier']) {
      if (!_req(rollData, k)) _warn('rollData', `missing ${k} at ${path}`, rollData);
    }
  }
  if (rollData.conditionalBonus) {
    if (!_req(rollData.conditionalBonus, 'condition') || !_req(rollData.conditionalBonus, 'bonus')) {
      _warn('rollData.conditionalBonus', `malformed conditionalBonus at ${path}.conditionalBonus`, rollData.conditionalBonus);
    }
  }
}

function _validateAbility(ability, path) {
  for (const k of ['id', 'name', 'description', 'typeLabel', 'typeBadgeClass', 'actionType', 'tags', 'icon']) {
    if (!_req(ability, k)) _warn('ability', `missing ${k} at ${path}`, ability);
  }

  _validateUsesData(ability.usesData, `${path}.usesData`);
  _validateSpecialActionData(ability.specialActionData, `${path}.specialActionData`);
  _validateRollData(ability.rollData, `${path}.rollData`);

  if (ability.isMultiOption) {
    if (!Array.isArray(ability.subAbilities)) _warn('subAbilities', `expected array at ${path}.subAbilities`, ability.subAbilities);
    for (let i = 0; i < (ability.subAbilities || []).length; i++) {
      _validateAbility(ability.subAbilities[i], `${path}.subAbilities[${i}]`);
    }
  }
}

export class AbilityModelValidator {
  static validatePanelModel(panelModel) {
    if (!_isDevMode()) return;

    if (!panelModel || typeof panelModel !== 'object') {
      return _warn('panel', 'panelModel is not an object', panelModel);
    }

    if (!Array.isArray(panelModel.all)) _warn('panel', 'missing all[]', panelModel);
    if (!panelModel.byType) _warn('panel', 'missing byType', panelModel);
    if (!panelModel.byId) _warn('panel', 'missing byId', panelModel);

    const all = panelModel.all || [];
    for (let i = 0; i < all.length; i++) {
      _validateAbility(all[i], `panel.all[${i}]`);
    }
  }
}
