/**
 * scripts/sheets/v2/npc/NPCPanelValidators.js
 *
 * NPC Panel Validators
 * Contract enforcement for NPC panel contexts
 * Returns {valid: boolean, errors: string[]}
 */

export const NPCPanelValidators = {
  /**
   * PORTRAIT PANEL
   */
  validatePortraitPanel(panelData) {
    const errors = [];

    if (typeof panelData.imagePath !== 'string') {
      errors.push('imagePath must be string');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * BIOGRAPHY PANEL
   */
  validateNpcBiographyPanel(panelData) {
    const errors = [];

    if (typeof panelData.name !== 'string') {
      errors.push('name must be string');
    }
    if (typeof panelData.age !== 'string') {
      errors.push('age must be string');
    }
    if (typeof panelData.gender !== 'string') {
      errors.push('gender must be string');
    }
    if (typeof panelData.species !== 'string') {
      errors.push('species must be string');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * HEALTH PANEL
   */
  validateHealthPanel(panelData) {
    const errors = [];

    if (typeof panelData.currentHealth !== 'number') {
      errors.push('currentHealth must be number');
    }
    if (typeof panelData.maxHealth !== 'number') {
      errors.push('maxHealth must be number');
    }
    if (typeof panelData.healthPercent !== 'number') {
      errors.push('healthPercent must be number');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * DEFENSE PANEL
   */
  validateDefensePanel(panelData) {
    const errors = [];

    if (typeof panelData.defense !== 'number') {
      errors.push('defense must be number');
    }
    if (typeof panelData.flatFooted !== 'number') {
      errors.push('flatFooted must be number');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * ABILITIES PANEL
   */
  validateAbilitiesPanel(panelData) {
    const errors = [];
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

    for (const ability of abilities) {
      if (!panelData[ability]) {
        errors.push(`${ability} required`);
      } else {
        if (typeof panelData[ability].score !== 'number') {
          errors.push(`${ability}.score must be number`);
        }
        if (typeof panelData[ability].modifier !== 'number') {
          errors.push(`${ability}.modifier must be number`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * SKILLS PANEL
   */
  validateSkillsPanel(panelData) {
    const errors = [];

    if (!Array.isArray(panelData.entries)) {
      errors.push('entries must be array');
    }
    if (typeof panelData.hasEntries !== 'boolean') {
      errors.push('hasEntries must be boolean');
    }
    if (typeof panelData.totalCount !== 'number') {
      errors.push('totalCount must be number');
    }

    if (Array.isArray(panelData.entries)) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.name !== 'string') {
          errors.push(`entry[${idx}].name must be string`);
        }
        if (typeof entry.bonus !== 'number') {
          errors.push(`entry[${idx}].bonus must be number`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * INVENTORY PANEL
   */
  validateInventoryPanel(panelData) {
    const errors = [];

    if (!Array.isArray(panelData.entries)) {
      errors.push('entries must be array');
    }
    if (typeof panelData.hasEntries !== 'boolean') {
      errors.push('hasEntries must be boolean');
    }
    if (typeof panelData.totalCount !== 'number') {
      errors.push('totalCount must be number');
    }

    if (Array.isArray(panelData.entries)) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.id !== 'string') {
          errors.push(`entry[${idx}].id must be string`);
        }
        if (typeof entry.name !== 'string') {
          errors.push(`entry[${idx}].name must be string`);
        }
        if (typeof entry.quantity !== 'number') {
          errors.push(`entry[${idx}].quantity must be number`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * TALENT PANEL
   */
  validateTalentPanel(panelData) {
    const errors = [];

    if (!Array.isArray(panelData.entries)) {
      errors.push('entries must be array');
    }
    if (typeof panelData.hasEntries !== 'boolean') {
      errors.push('hasEntries must be boolean');
    }
    if (typeof panelData.totalCount !== 'number') {
      errors.push('totalCount must be number');
    }

    if (Array.isArray(panelData.entries)) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.id !== 'string') {
          errors.push(`entry[${idx}].id must be string`);
        }
        if (typeof entry.name !== 'string') {
          errors.push(`entry[${idx}].name must be string`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * FEAT PANEL
   */
  validateFeatPanel(panelData) {
    const errors = [];

    if (!Array.isArray(panelData.entries)) {
      errors.push('entries must be array');
    }
    if (typeof panelData.hasEntries !== 'boolean') {
      errors.push('hasEntries must be boolean');
    }
    if (typeof panelData.totalCount !== 'number') {
      errors.push('totalCount must be number');
    }

    if (Array.isArray(panelData.entries)) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.id !== 'string') {
          errors.push(`entry[${idx}].id must be string`);
        }
        if (typeof entry.name !== 'string') {
          errors.push(`entry[${idx}].name must be string`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * LANGUAGES PANEL
   */
  validateLanguagesPanel(panelData) {
    const errors = [];

    if (!Array.isArray(panelData.entries)) {
      errors.push('entries must be array');
    }
    if (typeof panelData.hasEntries !== 'boolean') {
      errors.push('hasEntries must be boolean');
    }
    if (typeof panelData.totalCount !== 'number') {
      errors.push('totalCount must be number');
    }

    if (Array.isArray(panelData.entries)) {
      panelData.entries.forEach((entry, idx) => {
        if (typeof entry.id !== 'string') {
          errors.push(`entry[${idx}].id must be string`);
        }
        if (typeof entry.name !== 'string') {
          errors.push(`entry[${idx}].name must be string`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * COMBAT NOTES PANEL
   */
  validateNpcCombatNotesPanel(panelData) {
    const errors = [];

    if (typeof panelData.tactics !== 'string') {
      errors.push('tactics must be string');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * COMBAT PANEL
   */
  validateCombatPanel(panelData) {
    const errors = [];

    if (typeof panelData.initiative !== 'number') {
      errors.push('initiative must be number');
    }
    if (typeof panelData.armorClass !== 'number') {
      errors.push('armorClass must be number');
    }

    return { valid: errors.length === 0, errors };
  }
};
