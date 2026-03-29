/**
 * PANEL_REGISTRY
 *
 * Manifest of all SVG-backed character sheet panels.
 * Maps panel keys to their contracts, templates, builders, and validation expectations.
 *
 * This is the single source of truth for panel architecture.
 */

export const PANEL_REGISTRY = {
  healthPanel: {
    name: 'Health & Conditions',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs',
    builder: 'buildHealthPanel',
    requiredKeys: [
      'hp.value',
      'hp.max',
      'hp.percent',
      'hp.stateClass',
      'conditionTrack.current',
      'conditionTrack.max',
      'conditionSlots'
    ],
    postRenderAssertions: {
      rootSelector: '.swse-panel--health',
      expectedElements: {
        '.hp-bar': 1,
        '.condition-slot': 6
      }
    }
  },

  defensePanel: {
    name: 'Defenses',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs',
    builder: 'buildDefensePanel',
    requiredKeys: [
      'defenses',
      'hasDefenses',
      'canEdit'
    ],
    postRenderAssertions: {
      rootSelector: '.swse-panel--defenses',
      expectedElements: {
        '.defense-row': '3..3'  // Exactly 3 defenses
      }
    }
  },

  biographyPanel: {
    name: 'Character Identity & Biography',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/character-record-header.hbs',
    builder: 'buildBiographyPanel',
    requiredKeys: [
      'identity.name',
      'identity.class',
      'identity.level',
      'biography'
    ],
    postRenderAssertions: {
      rootSelector: '.swse-panel--identity',
      expectedElements: {
        '.record-field': '6..20'  // At least 6 fields
      }
    }
  },

  inventoryPanel: {
    name: 'Inventory & Gear',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-panel.hbs',
    builder: 'buildInventoryPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalWeight'
    ],
    postRenderAssertions: {
      rootSelector: '.inventory-panel',
      optionalElements: {
        '.ledger-row': '0..99'  // 0 or more rows
      }
    }
  },

  talentPanel: {
    name: 'Talents',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-known-panel.hbs',
    builder: 'buildTalentPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalCount'
    ],
    postRenderAssertions: {
      rootSelector: '.talents-panel',
      optionalElements: {
        '.talent-row': '0..99'  // 0 or more rows
      }
    }
  },

  featPanel: {
    name: 'Feats',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs',
    builder: 'buildFeatPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalCount'
    ],
    postRenderAssertions: {
      rootSelector: '.feats-panel',
      optionalElements: {
        '.feat-row': '0..99'  // 0 or more rows
      }
    }
  },

  maneuverPanel: {
    name: 'Maneuvers',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/maneuvers-panel.hbs',
    builder: 'buildManeuverPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalCount'
    ],
    postRenderAssertions: {
      rootSelector: '.maneuvers-panel',
      optionalElements: {
        '.maneuver-row': '0..99'  // 0 or more rows
      }
    }
  },

  secondWindPanel: {
    name: 'Second Wind',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs',
    builder: 'buildSecondWindPanel',
    requiredKeys: [
      'healing',
      'uses',
      'max',
      'hasUses',
      'canEdit'
    ],
    postRenderAssertions: {
      rootSelector: '.swse-second-wind-panel',
      expectedElements: {
        '.sw-healing-display': 1,
        '.sw-uses-tracker': 1,
        '.sw-recover-btn': 1
      }
    }
  },

  portraitPanel: {
    name: 'Portrait',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/portrait-panel.hbs',
    builder: 'buildPortraitPanel',
    requiredKeys: [
      'img',
      'name',
      'canEdit'
    ],
    postRenderAssertions: {
      rootSelector: '.portrait-panel',
      expectedElements: {
        '.portrait-image': 1
      }
    }
  },

  darkSidePanel: {
    name: 'Dark Side Points',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs',
    builder: 'buildDarkSidePanel',
    requiredKeys: [
      'value',
      'max',
      'segments',
      'canEdit'
    ],
    postRenderAssertions: {
      rootSelector: '.swse-panel--dark-side',
      expectedElements: {
        '.dsp-numbered-track': 1,
        '.dsp-track-box': '1..20'  // 1 to max possible (20)
      }
    }
  },

  forcePowersPanel: {
    name: 'Force Powers & Techniques',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/force-powers-known-panel.hbs',
    builder: 'buildForcePowersPanel',
    requiredKeys: [
      'hand',
      'discard',
      'secrets',
      'techniques',
      'hasHand',
      'hasDiscard',
      'hasSecrets',
      'hasTechniques',
      'canEdit'
    ],
    postRenderAssertions: {
      rootSelector: '.force-powers-known-panel',
      optionalElements: {
        '.power-row': '0..99',
        '.secret-row': '0..99',
        '.technique-row': '0..99'
      }
    }
  }
};

/**
 * Get a panel definition by key
 */
export function getPanel(panelKey) {
  return PANEL_REGISTRY[panelKey];
}

/**
 * Get all panel keys
 */
export function getPanelKeys() {
  return Object.keys(PANEL_REGISTRY);
}

/**
 * Validate that all required keys exist in a panel
 */
export function validatePanelContract(panelKey, panelData) {
  const def = PANEL_REGISTRY[panelKey];
  if (!def) {
    console.warn(`Unknown panel: ${panelKey}`);
    return false;
  }

  const missing = def.requiredKeys.filter(key => {
    const keys = key.split('.');
    let val = panelData;
    for (const k of keys) {
      val = val?.[k];
    }
    return val === undefined || val === null;
  });

  if (missing.length > 0) {
    console.error(`[Panel Contract] ${panelKey} missing: ${missing.join(', ')}`, panelData);
    return false;
  }

  return true;
}
