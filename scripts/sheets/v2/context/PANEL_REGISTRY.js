/**
 * PANEL_REGISTRY
 *
 * SINGLE SOURCE OF TRUTH for all character sheet panel architecture.
 *
 * For EVERY panel in the V2 character sheet, this registry defines:
 * - panel key (e.g. 'healthPanel')
 * - display name
 * - template path
 * - builder method name
 * - validator method name
 * - required context keys (must exist, must not be null/undefined)
 * - optional keys
 * - panel type (display/ledger/control)
 * - SVG-backed? (uses frame/content/overlay pattern)
 * - visibility conditions if conditional
 * - row contract type if ledger-style
 * - post-render DOM expectations
 *
 * When you want to know about a panel, you look here first. Period.
 * No ad-hoc assumptions about panels. Everything documented in the registry.
 */

export const PANEL_REGISTRY = {
  healthPanel: {
    name: 'Health & Conditions',
    type: 'display',  // Shows HP, shield, condition track — not editable as a ledger
    svgBacked: true,
    structure: 'frame + content + overlay (condition-track)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs',
    builder: 'buildHealthPanel',
    validator: 'validateHealthPanel',
    requiredKeys: [
      'hp.value',
      'hp.max',
      'hp.percent',
      'hp.stateClass',
      'hp.canEdit',
      'bonusHp.value',
      'bonusHp.hasBonus',
      'conditionTrack.current',
      'conditionTrack.max',
      'conditionSlots',
      'shield.max',
      'shield.current',
      'shield.rating',
      'damageReduction',
      'showConditionTrack',
      'showShield',
      'showDamageReduction',
      'stateLabel',
      'stateClass'
    ],
    optionalKeys: [
      'shield.source',
      'shield.hasShield'
    ],
    postRenderAssertions: {
      critical: true,  // Health panel is always critical
      rootSelector: '.swse-panel--health',
      expectedElements: {
        '.hp-bar': 1,
        '.condition-slot': 6,
        '.hp-bar-wrapper': 1
      }
    }
  },

  defensePanel: {
    name: 'Defenses',
    type: 'display',
    svgBacked: true,
    structure: 'frame + content (expandable rows)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs',
    builder: 'buildDefensePanel',
    validator: 'validateDefensePanel',
    requiredKeys: [
      'defenses',  // Array of defense objects
      'hasDefenses',
      'canEdit'
    ],
    optionalKeys: [],
    postRenderAssertions: {
      critical: true,
      rootSelector: '.swse-panel--defenses',
      expectedElements: {
        '.defense-row': '3..3'  // Always exactly 3: ref, fort, will
      }
    }
  },

  biographyPanel: {
    name: 'Character Identity & Biography',
    type: 'display',
    svgBacked: false,
    structure: 'text fields (identity, biography blocks)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/character-record-header.hbs',
    builder: 'buildBiographyPanel',
    validator: 'validateBiographyPanel',
    requiredKeys: [
      'identity.name',
      'identity.class',
      'identity.level',
      'biography'
    ],
    optionalKeys: [
      'identity.race',
      'identity.planetOfOrigin',
      'identity.profession'
    ],
    postRenderAssertions: {
      critical: true,
      rootSelector: '.swse-panel--identity',
      expectedElements: {
        '.record-field': '6..20'  // At least 6 fields
      }
    }
  },

  inventoryPanel: {
    name: 'Inventory & Gear',
    type: 'ledger',
    svgBacked: false,
    structure: 'ledger rows (item list with weight tracking)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-panel.hbs',
    builder: 'buildInventoryPanel',
    validator: 'validateInventoryPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalWeight'
    ],
    optionalKeys: [],
    rowContract: {
      type: 'InventoryRow',
      shape: ['id', 'name', 'quantity', 'weight', 'source']
    },
    postRenderAssertions: {
      critical: false,
      rootSelector: '.inventory-panel',
      optionalElements: {
        '.ledger-row': '0..99'  // 0 or more rows
      }
    }
  },

  talentPanel: {
    name: 'Talents',
    type: 'ledger',
    svgBacked: false,
    structure: 'ledger rows (talent list with counts)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-known-panel.hbs',
    builder: 'buildTalentPanel',
    validator: 'validateTalentPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalCount'
    ],
    optionalKeys: [],
    rowContract: {
      type: 'TalentRow',
      shape: ['id', 'name', 'source', 'summary']
    },
    postRenderAssertions: {
      critical: false,
      rootSelector: '.talents-panel',
      optionalElements: {
        '.talent-row': '0..99'  // 0 or more rows
      }
    }
  },

  featPanel: {
    name: 'Feats',
    type: 'ledger',
    svgBacked: false,
    structure: 'ledger rows (feat list with counts)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs',
    builder: 'buildFeatPanel',
    validator: 'validateFeatPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalCount'
    ],
    optionalKeys: [],
    rowContract: {
      type: 'FeatRow',
      shape: ['id', 'name', 'source', 'summary']
    },
    postRenderAssertions: {
      critical: false,
      rootSelector: '.feats-panel',
      optionalElements: {
        '.feat-row': '0..99'  // 0 or more rows
      }
    }
  },

  maneuverPanel: {
    name: 'Maneuvers',
    type: 'ledger',
    svgBacked: false,
    structure: 'ledger rows (maneuver list with counts)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/maneuvers-panel.hbs',
    builder: 'buildManeuverPanel',
    validator: 'validateManeuverPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalCount'
    ],
    optionalKeys: [],
    rowContract: {
      type: 'ManeuverRow',
      shape: ['id', 'name', 'source', 'summary']
    },
    postRenderAssertions: {
      critical: false,
      rootSelector: '.maneuvers-panel',
      optionalElements: {
        '.maneuver-row': '0..99'  // 0 or more rows
      }
    }
  },

  secondWindPanel: {
    name: 'Second Wind',
    type: 'control',
    svgBacked: false,
    structure: 'healing tracker with action button',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs',
    builder: 'buildSecondWindPanel',
    validator: 'validateSecondWindPanel',
    requiredKeys: [
      'healing',
      'uses',
      'max',
      'hasUses',
      'canEdit'
    ],
    optionalKeys: [],
    postRenderAssertions: {
      critical: false,
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
    type: 'control',
    svgBacked: false,
    structure: 'editable image and name display',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/portrait-panel.hbs',
    builder: 'buildPortraitPanel',
    validator: 'validatePortraitPanel',
    requiredKeys: [
      'img',
      'name',
      'canEdit'
    ],
    optionalKeys: [],
    postRenderAssertions: {
      critical: false,
      rootSelector: '.portrait-panel',
      expectedElements: {
        '.portrait-image': 1
      }
    }
  },

  darkSidePanel: {
    name: 'Dark Side Points',
    type: 'control',
    svgBacked: true,
    structure: 'frame + content + SVG-backed numbered track',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs',
    builder: 'buildDarkSidePanel',
    validator: 'validateDarkSidePanel',
    requiredKeys: [
      'value',
      'max',
      'segments',
      'canEdit'
    ],
    optionalKeys: [],
    postRenderAssertions: {
      critical: false,
      rootSelector: '.swse-panel--dark-side',
      expectedElements: {
        '.dsp-numbered-track': 1,
        '.dsp-track-box': '1..20'  // 1 to max possible (20)
      }
    }
  },

  forcePowersPanel: {
    name: 'Force Powers & Techniques',
    type: 'ledger',
    svgBacked: false,
    structure: 'multi-section ledger (hand, discard, secrets, techniques)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/force-powers-known-panel.hbs',
    builder: 'buildForcePowersPanel',
    validator: 'validateForcePowersPanel',
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
    optionalKeys: [],
    rowContract: {
      type: 'ForcePowerRow',
      shape: ['id', 'name', 'system.prerequisite', 'system.summary']
    },
    postRenderAssertions: {
      critical: false,
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
