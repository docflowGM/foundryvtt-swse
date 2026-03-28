/**
 * PanelContextValidator
 *
 * Dev-mode contract validation for panel context objects.
 * Ensures each panel has the required shape before render.
 *
 * Strict mode checks:
 * - Required keys present and correct types
 * - No live Document objects in partial-facing context
 * - Arrays are arrays, numbers are numbers, strings are strings
 * - Empty-state booleans are explicit
 *
 * Fails loudly in dev mode, degrades gracefully in production.
 */

export class PanelContextValidator {
  /**
   * Check if value is a live Foundry Document
   * @private
   */
  static isDocument(val) {
    return val && typeof val === 'object' &&
           (val instanceof foundry.documents?.BaseDocument ||
            val?.documentName !== undefined ||
            val?.isDocument === true);
  }

  /**
   * Detect live Document objects in panel context (not allowed)
   * @private
   */
  static detectDocumentLeakage(obj, panelName, path = '') {
    const leaks = [];

    if (this.isDocument(obj)) {
      leaks.push(path);
      return leaks;
    }

    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return leaks;
    }

    for (const [key, val] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      if (this.isDocument(val)) {
        leaks.push(newPath);
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        leaks.push(...this.detectDocumentLeakage(val, panelName, newPath));
      }
    }

    return leaks;
  }

  static validateRequired(panel, panelName, requiredKeys) {
    const missing = requiredKeys.filter(key => {
      const keys = key.split('.');
      let val = panel;
      for (const k of keys) {
        val = val?.[k];
      }
      return val === undefined || val === null;
    });

    if (missing.length > 0) {
      const msg = `[PanelValidator] ${panelName} missing required keys: ${missing.join(', ')}`;
      console.error(msg, { panel, missing });
      if (CONFIG?.SWSE?.strictPanelMode) {
        throw new Error(msg);
      }
    }
  }

  static validateNoDocuments(panel, panelName) {
    const leaks = this.detectDocumentLeakage(panel, panelName);
    if (leaks.length > 0) {
      const msg = `[PanelValidator] ${panelName} contains live Documents at: ${leaks.join(', ')}. Only plain objects allowed.`;
      console.error(msg, { panel, leaks });
      if (CONFIG?.SWSE?.strictPanelMode) {
        throw new Error(msg);
      }
    }
  }

  static validateArrayField(panel, panelName, fieldPath) {
    const keys = fieldPath.split('.');
    let val = panel;
    for (const k of keys) {
      val = val?.[k];
    }

    if (val !== undefined && val !== null && !Array.isArray(val)) {
      const msg = `[PanelValidator] ${panelName}.${fieldPath} must be an array, got ${typeof val}`;
      console.error(msg, { panel, fieldPath, val });
      if (CONFIG?.SWSE?.strictPanelMode) {
        throw new Error(msg);
      }
    }
  }

  static validateBooleanField(panel, panelName, fieldPath) {
    const keys = fieldPath.split('.');
    let val = panel;
    for (const k of keys) {
      val = val?.[k];
    }

    if (val !== undefined && typeof val !== 'boolean') {
      const msg = `[PanelValidator] ${panelName}.${fieldPath} must be boolean, got ${typeof val}`;
      console.warn(msg); // Warn instead of error for flexibility
    }
  }

  static validateNumberField(panel, panelName, fieldPath) {
    const keys = fieldPath.split('.');
    let val = panel;
    for (const k of keys) {
      val = val?.[k];
    }

    if (val !== undefined && typeof val !== 'number') {
      const msg = `[PanelValidator] ${panelName}.${fieldPath} must be number, got ${typeof val}`;
      console.warn(msg);
    }
  }

  static validateHealthPanel(panel) {
    this.validateRequired(panel, 'healthPanel', [
      'hp.value',
      'hp.max',
      'hp.percent',
      'hp.stateClass',
      'conditionTrack.current',
      'conditionTrack.max',
      'conditionSlots'
    ]);

    if (!Array.isArray(panel.conditionSlots)) {
      console.error('[PanelValidator] healthPanel.conditionSlots is not an array', panel);
    }

    if (panel.conditionSlots.length !== 6) {
      console.warn('[PanelValidator] healthPanel.conditionSlots should have 6 slots, got', panel.conditionSlots.length);
    }
  }

  static validateDefensePanel(panel) {
    this.validateRequired(panel, 'defensePanel', [
      'defenses',
      'hasDefenses',
      'canEdit'
    ]);

    if (!Array.isArray(panel.defenses)) {
      console.error('[PanelValidator] defensePanel.defenses is not an array', panel);
    }

    panel.defenses?.forEach((def, idx) => {
      if (!def.key || !def.label || def.total === undefined) {
        console.warn(`[PanelValidator] defensePanel.defenses[${idx}] missing key, label, or total`, def);
      }
    });
  }

  static validateBiographyPanel(panel) {
    this.validateRequired(panel, 'biographyPanel', [
      'identity.name',
      'identity.class',
      'identity.level',
      'biography'
    ]);
  }

  static validateInventoryPanel(panel) {
    this.validateRequired(panel, 'inventoryPanel', [
      'entries',
      'hasEntries',
      'totalWeight',
      'emptyMessage',
      'canEdit'
    ]);

    this.validateNoDocuments(panel, 'inventoryPanel');
    this.validateArrayField(panel, 'inventoryPanel', 'entries');
    this.validateBooleanField(panel, 'inventoryPanel', 'hasEntries');
    this.validateNumberField(panel, 'inventoryPanel', 'totalWeight');

    if (panel.entries && Array.isArray(panel.entries)) {
      panel.entries.forEach((row, idx) => {
        if (!row.id || !row.name || !row.type) {
          console.warn(`[PanelValidator] inventoryPanel.entries[${idx}] missing id/name/type`, row);
        }
      });
    }
  }

  static validateTalentPanel(panel) {
    this.validateRequired(panel, 'talentPanel', [
      'entries',
      'hasEntries',
      'totalCount',
      'emptyMessage',
      'canEdit'
    ]);

    this.validateNoDocuments(panel, 'talentPanel');
    this.validateArrayField(panel, 'talentPanel', 'entries');
    this.validateBooleanField(panel, 'talentPanel', 'hasEntries');
    this.validateNumberField(panel, 'talentPanel', 'totalCount');

    if (panel.entries && Array.isArray(panel.entries)) {
      panel.entries.forEach((row, idx) => {
        if (!row.id || !row.name) {
          console.warn(`[PanelValidator] talentPanel.entries[${idx}] missing id/name`, row);
        }
      });
    }
  }

  static validateFeatPanel(panel) {
    this.validateRequired(panel, 'featPanel', [
      'entries',
      'hasEntries',
      'totalCount',
      'emptyMessage',
      'canEdit'
    ]);

    this.validateNoDocuments(panel, 'featPanel');
    this.validateArrayField(panel, 'featPanel', 'entries');
    this.validateBooleanField(panel, 'featPanel', 'hasEntries');
    this.validateNumberField(panel, 'featPanel', 'totalCount');

    if (panel.entries && Array.isArray(panel.entries)) {
      panel.entries.forEach((row, idx) => {
        if (!row.id || !row.name) {
          console.warn(`[PanelValidator] featPanel.entries[${idx}] missing id/name`, row);
        }
      });
    }
  }

  static validateManeuverPanel(panel) {
    this.validateRequired(panel, 'maneuverPanel', [
      'entries',
      'hasEntries',
      'totalCount',
      'emptyMessage',
      'canEdit'
    ]);

    this.validateNoDocuments(panel, 'maneuverPanel');
    this.validateArrayField(panel, 'maneuverPanel', 'entries');
    this.validateBooleanField(panel, 'maneuverPanel', 'hasEntries');
    this.validateNumberField(panel, 'maneuverPanel', 'totalCount');

    if (panel.entries && Array.isArray(panel.entries)) {
      panel.entries.forEach((row, idx) => {
        if (!row.id || !row.name) {
          console.warn(`[PanelValidator] maneuverPanel.entries[${idx}] missing id/name`, row);
        }
      });
    }
  }
}
