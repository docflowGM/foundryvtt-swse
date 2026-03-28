/**
 * PanelContextValidator
 *
 * Dev-mode contract validation for panel context objects.
 * Ensures each panel has the required shape before render.
 * Fails loudly in dev mode, degrades gracefully in production.
 */

export class PanelContextValidator {
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
      'totalWeight'
    ]);

    if (!Array.isArray(panel.entries)) {
      console.error('[PanelValidator] inventoryPanel.entries is not an array', panel);
    }
  }

  static validateTalentPanel(panel) {
    this.validateRequired(panel, 'talentPanel', [
      'entries',
      'hasEntries',
      'totalCount'
    ]);

    if (!Array.isArray(panel.entries)) {
      console.error('[PanelValidator] talentPanel.entries is not an array', panel);
    }
  }

  static validateFeatPanel(panel) {
    this.validateRequired(panel, 'featPanel', [
      'entries',
      'hasEntries',
      'totalCount'
    ]);

    if (!Array.isArray(panel.entries)) {
      console.error('[PanelValidator] featPanel.entries is not an array', panel);
    }
  }

  static validateManeuverPanel(panel) {
    this.validateRequired(panel, 'maneuverPanel', [
      'entries',
      'hasEntries',
      'totalCount'
    ]);

    if (!Array.isArray(panel.entries)) {
      console.error('[PanelValidator] maneuverPanel.entries is not an array', panel);
    }
  }
}
