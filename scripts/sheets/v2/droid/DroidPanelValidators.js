/**
 * scripts/sheets/v2/droid/DroidPanelValidators.js
 * Droid Panel Validators - Contract enforcement
 */

export const DroidPanelValidators = {
  validatePortraitPanel(panelData) {
    const errors = [];
    if (typeof panelData.imagePath !== 'string') errors.push('imagePath must be string');
    return { valid: errors.length === 0, errors };
  },

  validateDroidSummaryPanel(panelData) {
    const errors = [];
    if (typeof panelData.droidType !== 'string') errors.push('droidType must be string');
    if (typeof panelData.restrictionLevel !== 'number') errors.push('restrictionLevel must be number');
    if (typeof panelData.maxModificationPoints !== 'number') errors.push('maxModificationPoints must be number');
    if (typeof panelData.usedModificationPoints !== 'number') errors.push('usedModificationPoints must be number');
    return { valid: errors.length === 0, errors };
  },

  validateAbilitiesPanel(panelData) {
    const errors = [];
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    for (const ability of abilities) {
      if (!panelData[ability]) {
        errors.push(`${ability} required`);
      } else {
        if (typeof panelData[ability].score !== 'number') errors.push(`${ability}.score must be number`);
        if (typeof panelData[ability].modifier !== 'number') errors.push(`${ability}.modifier must be number`);
      }
    }
    return { valid: errors.length === 0, errors };
  },

  validateDefensesPanel(panelData) {
    const errors = [];
    if (typeof panelData.defense !== 'number') errors.push('defense must be number');
    if (typeof panelData.flatFooted !== 'number') errors.push('flatFooted must be number');
    return { valid: errors.length === 0, errors };
  },

  validateSkillsPanel(panelData) {
    const errors = [];
    if (!Array.isArray(panelData.entries)) errors.push('entries must be array');
    if (typeof panelData.hasEntries !== 'boolean') errors.push('hasEntries must be boolean');
    if (typeof panelData.totalCount !== 'number') errors.push('totalCount must be number');
    if (Array.isArray(panelData.entries)) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.name !== 'string') errors.push(`entry[${idx}].name must be string`);
        if (typeof entry.bonus !== 'number') errors.push(`entry[${idx}].bonus must be number`);
      });
    }
    return { valid: errors.length === 0, errors };
  },

  validateProtocolsPanel(panelData) {
    const errors = [];
    if (!Array.isArray(panelData.entries)) errors.push('entries must be array');
    if (typeof panelData.hasEntries !== 'boolean') errors.push('hasEntries must be boolean');
    if (Array.isArray(panelData.entries)) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.id !== 'string') errors.push(`entry[${idx}].id must be string`);
        if (typeof entry.name !== 'string') errors.push(`entry[${idx}].name must be string`);
      });
    }
    return { valid: errors.length === 0, errors };
  },

  validateCustomizationsPanel(panelData) {
    const errors = [];
    if (!Array.isArray(panelData.entries)) errors.push('entries must be array');
    if (typeof panelData.totalCost !== 'number') errors.push('totalCost must be number');
    return { valid: errors.length === 0, errors };
  },

  validateProgrammingPanel(panelData) {
    const errors = [];
    if (!Array.isArray(panelData.entries)) errors.push('entries must be array');
    return { valid: errors.length === 0, errors };
  },

  validateInventoryPanel(panelData) {
    const errors = [];
    if (!Array.isArray(panelData.entries)) errors.push('entries must be array');
    if (typeof panelData.hasEntries !== 'boolean') errors.push('hasEntries must be boolean');
    if (Array.isArray(panelData.entries)) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.id !== 'string') errors.push(`entry[${idx}].id must be string`);
        if (typeof entry.name !== 'string') errors.push(`entry[${idx}].name must be string`);
        if (typeof entry.quantity !== 'number') errors.push(`entry[${idx}].quantity must be number`);
      });
    }
    return { valid: errors.length === 0, errors };
  },

  validateCombatPanel(panelData) {
    const errors = [];
    if (typeof panelData.initiative !== 'number') errors.push('initiative must be number');
    if (typeof panelData.armorClass !== 'number') errors.push('armorClass must be number');
    return { valid: errors.length === 0, errors };
  },

  validateDroidNotesPanel(panelData) {
    const errors = [];
    if (typeof panelData.notes !== 'string') errors.push('notes must be string');
    return { valid: errors.length === 0, errors };
  }
};
