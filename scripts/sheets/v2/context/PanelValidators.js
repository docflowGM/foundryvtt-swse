/**
 * PANEL_VALIDATORS
 *
 * Panel-specific validation logic.
 * Each validator enforces the contract defined in PANEL_REGISTRY.
 *
 * Validators return: { valid: boolean, errors: string[] }
 */

/**
 * Validate healthPanel contract
 */
export function validateHealthPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('healthPanel is null/undefined');
    return { valid: false, errors };
  }

  // HP object structure
  if (!panelData.hp || typeof panelData.hp !== 'object') {
    errors.push('healthPanel.hp must be an object');
  } else {
    if (typeof panelData.hp.value !== 'number') errors.push('hp.value must be number');
    if (typeof panelData.hp.max !== 'number') errors.push('hp.max must be number');
    if (typeof panelData.hp.percent !== 'number') errors.push('hp.percent must be number');
    if (typeof panelData.hp.stateClass !== 'string') errors.push('hp.stateClass must be string');
    if (typeof panelData.hp.canEdit !== 'boolean') errors.push('hp.canEdit must be boolean');
  }

  // Bonus HP
  if (!panelData.bonusHp || typeof panelData.bonusHp !== 'object') {
    errors.push('healthPanel.bonusHp must be an object');
  } else {
    if (typeof panelData.bonusHp.value !== 'number') errors.push('bonusHp.value must be number');
    if (typeof panelData.bonusHp.hasBonus !== 'boolean') errors.push('bonusHp.hasBonus must be boolean');
  }

  // Condition track
  if (!panelData.conditionTrack || typeof panelData.conditionTrack !== 'object') {
    errors.push('healthPanel.conditionTrack must be an object');
  } else {
    if (typeof panelData.conditionTrack.current !== 'number') errors.push('conditionTrack.current must be number');
    if (typeof panelData.conditionTrack.max !== 'number') errors.push('conditionTrack.max must be number');
  }

  // Condition slots array
  if (!Array.isArray(panelData.conditionSlots)) {
    errors.push('healthPanel.conditionSlots must be an array');
  } else if (panelData.conditionSlots.length !== 6) {
    errors.push(`conditionSlots must have exactly 6 slots, got ${panelData.conditionSlots.length}`);
  }

  // Shield
  if (!panelData.shield || typeof panelData.shield !== 'object') {
    errors.push('healthPanel.shield must be an object');
  } else {
    if (typeof panelData.shield.max !== 'number') errors.push('shield.max must be number');
    if (typeof panelData.shield.current !== 'number') errors.push('shield.current must be number');
    if (typeof panelData.shield.rating !== 'string') errors.push('shield.rating must be string');
  }

  // Damage reduction
  if (typeof panelData.damageReduction !== 'string' && panelData.damageReduction !== null) {
    errors.push('damageReduction must be string or null');
  }

  // Boolean flags
  if (typeof panelData.showConditionTrack !== 'boolean') errors.push('showConditionTrack must be boolean');
  if (typeof panelData.showShield !== 'boolean') errors.push('showShield must be boolean');
  if (typeof panelData.showDamageReduction !== 'boolean') errors.push('showDamageReduction must be boolean');

  // Display strings
  if (typeof panelData.stateLabel !== 'string') errors.push('stateLabel must be string');
  if (typeof panelData.stateClass !== 'string') errors.push('stateClass must be string');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate defensePanel contract
 */
export function validateDefensePanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('defensePanel is null/undefined');
    return { valid: false, errors };
  }

  // Defenses array
  if (!Array.isArray(panelData.defenses)) {
    errors.push('defensePanel.defenses must be an array');
  } else if (panelData.defenses.length !== 3) {
    errors.push(`defenses must have exactly 3 items (Ref, Fort, Will), got ${panelData.defenses.length}`);
  } else {
    panelData.defenses.forEach((def, idx) => {
      if (typeof def.name !== 'string') errors.push(`defense[${idx}].name must be string`);
      if (typeof def.value !== 'number') errors.push(`defense[${idx}].value must be number`);
    });
  }

  // Flags
  if (typeof panelData.hasDefenses !== 'boolean') errors.push('hasDefenses must be boolean');
  if (typeof panelData.canEdit !== 'boolean') errors.push('canEdit must be boolean');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate biographyPanel contract
 */
export function validateBiographyPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('biographyPanel is null/undefined');
    return { valid: false, errors };
  }

  // Identity object
  if (!panelData.identity || typeof panelData.identity !== 'object') {
    errors.push('biographyPanel.identity must be an object');
  } else {
    if (typeof panelData.identity.name !== 'string') errors.push('identity.name must be string');
    if (typeof panelData.identity.class !== 'string') errors.push('identity.class must be string');
    if (typeof panelData.identity.level !== 'number') errors.push('identity.level must be number');
  }

  // Biography text
  if (typeof panelData.biography !== 'string') {
    errors.push('biography must be string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate inventoryPanel contract (standard ledger)
 */
export function validateInventoryPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('inventoryPanel is null/undefined');
    return { valid: false, errors };
  }

  // Entries array
  if (!Array.isArray(panelData.entries)) {
    errors.push('inventoryPanel.entries must be an array');
  } else {
    panelData.entries.forEach((entry, idx) => {
      if (typeof entry.id !== 'string') errors.push(`entry[${idx}].id must be string`);
      if (typeof entry.name !== 'string') errors.push(`entry[${idx}].name must be string`);
      if (typeof entry.quantity !== 'number') errors.push(`entry[${idx}].quantity must be number`);
      if (typeof entry.weight !== 'number') errors.push(`entry[${idx}].weight must be number`);
    });
  }

  // Flags
  if (typeof panelData.hasEntries !== 'boolean') errors.push('hasEntries must be boolean');
  if (typeof panelData.totalWeight !== 'number') errors.push('totalWeight must be number');
  if (typeof panelData.emptyMessage !== 'string') errors.push('emptyMessage must be string');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate talentPanel contract (standard ledger with optional grouping)
 */
export function validateTalentPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('talentPanel is null/undefined');
    return { valid: false, errors };
  }

  // Entries array
  if (!Array.isArray(panelData.entries)) {
    errors.push('talentPanel.entries must be an array');
  } else {
    panelData.entries.forEach((entry, idx) => {
      if (typeof entry.id !== 'string') errors.push(`entry[${idx}].id must be string`);
      if (typeof entry.name !== 'string') errors.push(`entry[${idx}].name must be string`);
    });
  }

  // Grouped object (optional but recommended for display)
  if (panelData.grouped && typeof panelData.grouped !== 'object') {
    errors.push('talentPanel.grouped must be an object');
  }

  // Flags
  if (typeof panelData.hasEntries !== 'boolean') errors.push('hasEntries must be boolean');
  if (typeof panelData.totalCount !== 'number') errors.push('totalCount must be number');
  if (typeof panelData.emptyMessage !== 'string') errors.push('emptyMessage must be string');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate featPanel contract (standard ledger)
 */
export function validateFeatPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('featPanel is null/undefined');
    return { valid: false, errors };
  }

  // Entries array
  if (!Array.isArray(panelData.entries)) {
    errors.push('featPanel.entries must be an array');
  } else {
    panelData.entries.forEach((entry, idx) => {
      if (typeof entry.id !== 'string') errors.push(`entry[${idx}].id must be string`);
      if (typeof entry.name !== 'string') errors.push(`entry[${idx}].name must be string`);
    });
  }

  // Flags
  if (typeof panelData.hasEntries !== 'boolean') errors.push('hasEntries must be boolean');
  if (typeof panelData.totalCount !== 'number') errors.push('totalCount must be number');
  if (typeof panelData.emptyMessage !== 'string') errors.push('emptyMessage must be string');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate maneuverPanel contract (standard ledger)
 */
export function validateManeuverPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('maneuverPanel is null/undefined');
    return { valid: false, errors };
  }

  // Entries array
  if (!Array.isArray(panelData.entries)) {
    errors.push('maneuverPanel.entries must be an array');
  } else {
    panelData.entries.forEach((entry, idx) => {
      if (typeof entry.id !== 'string') errors.push(`entry[${idx}].id must be string`);
      if (typeof entry.name !== 'string') errors.push(`entry[${idx}].name must be string`);
    });
  }

  // Flags
  if (typeof panelData.hasEntries !== 'boolean') errors.push('hasEntries must be boolean');
  if (typeof panelData.totalCount !== 'number') errors.push('totalCount must be number');
  if (typeof panelData.emptyMessage !== 'string') errors.push('emptyMessage must be string');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate secondWindPanel contract
 */
export function validateSecondWindPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('secondWindPanel is null/undefined');
    return { valid: false, errors };
  }

  // Healing value
  if (typeof panelData.healing !== 'number') {
    errors.push('secondWindPanel.healing must be number');
  }

  // Uses tracking
  if (typeof panelData.uses !== 'number') errors.push('uses must be number');
  if (typeof panelData.max !== 'number') errors.push('max must be number');

  // Flags
  if (typeof panelData.hasUses !== 'boolean') errors.push('hasUses must be boolean');
  if (typeof panelData.canEdit !== 'boolean') errors.push('canEdit must be boolean');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate portraitPanel contract
 */
export function validatePortraitPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('portraitPanel is null/undefined');
    return { valid: false, errors };
  }

  // Image path
  if (typeof panelData.img !== 'string') {
    errors.push('portraitPanel.img must be string');
  }

  // Character name
  if (typeof panelData.name !== 'string') {
    errors.push('portraitPanel.name must be string');
  }

  // Edit flag
  if (typeof panelData.canEdit !== 'boolean') {
    errors.push('canEdit must be boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate darkSidePanel contract
 */
export function validateDarkSidePanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('darkSidePanel is null/undefined');
    return { valid: false, errors };
  }

  // Value and max
  if (typeof panelData.value !== 'number') {
    errors.push('darkSidePanel.value must be number');
  }
  if (typeof panelData.max !== 'number') {
    errors.push('darkSidePanel.max must be number');
  }

  // Segments array
  if (!Array.isArray(panelData.segments)) {
    errors.push('darkSidePanel.segments must be an array');
  } else if (panelData.max && panelData.segments.length !== panelData.max) {
    errors.push(`segments array length (${panelData.segments.length}) must match max (${panelData.max})`);
  }

  // Edit flag
  if (typeof panelData.canEdit !== 'boolean') {
    errors.push('canEdit must be boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate forcePowersPanel contract
 */
export function validateForcePowersPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('forcePowersPanel is null/undefined');
    return { valid: false, errors };
  }

  // Hand array
  if (!Array.isArray(panelData.hand)) {
    errors.push('forcePowersPanel.hand must be an array');
  }

  // Discard array
  if (!Array.isArray(panelData.discard)) {
    errors.push('forcePowersPanel.discard must be an array');
  }

  // Secrets array
  if (!Array.isArray(panelData.secrets)) {
    errors.push('forcePowersPanel.secrets must be an array');
  }

  // Techniques array
  if (!Array.isArray(panelData.techniques)) {
    errors.push('forcePowersPanel.techniques must be an array');
  }

  // Flags
  if (typeof panelData.hasHand !== 'boolean') errors.push('hasHand must be boolean');
  if (typeof panelData.hasDiscard !== 'boolean') errors.push('hasDiscard must be boolean');
  if (typeof panelData.hasSecrets !== 'boolean') errors.push('hasSecrets must be boolean');
  if (typeof panelData.hasTechniques !== 'boolean') errors.push('hasTechniques must be boolean');
  if (typeof panelData.canEdit !== 'boolean') errors.push('canEdit must be boolean');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate starshipManeuversPanel contract
 */
export function validateStarshipManeuversPanel(panelData) {
  const errors = [];

  if (!panelData) {
    errors.push('starshipManeuversPanel is null/undefined');
    return { valid: false, errors };
  }

  // Entries array
  if (!Array.isArray(panelData.entries)) {
    errors.push('starshipManeuversPanel.entries must be an array');
  } else {
    panelData.entries.forEach((entry, idx) => {
      if (typeof entry.id !== 'string') errors.push(`entry[${idx}].id must be string`);
      if (typeof entry.name !== 'string') errors.push(`entry[${idx}].name must be string`);
    });
  }

  // Flags
  if (typeof panelData.hasEntries !== 'boolean') errors.push('hasEntries must be boolean');
  if (typeof panelData.totalCount !== 'number') errors.push('totalCount must be number');
  if (typeof panelData.emptyMessage !== 'string') errors.push('emptyMessage must be string');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Run validator for a panel by key
 */
export function validatePanel(panelKey, panelData) {
  const validators = {
    healthPanel: validateHealthPanel,
    defensePanel: validateDefensePanel,
    biographyPanel: validateBiographyPanel,
    inventoryPanel: validateInventoryPanel,
    talentPanel: validateTalentPanel,
    featPanel: validateFeatPanel,
    maneuverPanel: validateManeuverPanel,
    secondWindPanel: validateSecondWindPanel,
    portraitPanel: validatePortraitPanel,
    darkSidePanel: validateDarkSidePanel,
    forcePowersPanel: validateForcePowersPanel,
    starshipManeuversPanel: validateStarshipManeuversPanel
  };

  const validator = validators[panelKey];
  if (!validator) {
    return {
      valid: false,
      errors: [`Unknown panel: ${panelKey}`]
    };
  }

  return validator(panelData);
}
