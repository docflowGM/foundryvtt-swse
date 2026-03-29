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
 * LEDGER PANEL CONTRACT (standardized for entries-based panels):
 * - entries: array of items (InventoryRow, TalentRow, FeatRow, etc.)
 * - hasEntries: boolean (entries.length > 0)
 * - totalCount: number (entries.length, for display)
 * - emptyMessage: string (fallback if no entries)
 * - grouped: optional object {groupKey: [entries]} for grouped displays
 * - canEdit: optional boolean (whether entries can be added/removed/modified)
 *
 * ROW CONTRACTS (standardized shapes for ledger entries):
 * Every row type has a documented contract with required and optional fields.
 * All rows come from RowTransformers, ensuring consistency.
 * See ROW_CONTRACTS below for the full contract definitions.
 *
 * When you want to know about a panel, you look here first. Period.
 * No ad-hoc assumptions about panels. Everything documented in the registry.
 */

/**
 * SVG_STRUCTURE_CONTRACT
 *
 * Universal structure for SVG-backed panels (frame/content/overlay pattern).
 *
 * When svgBacked: true in a panel definition:
 * 1. Frame layer (.swse-panel__frame) - SVG graphics, absolutely positioned under content
 * 2. Content layer (.swse-panel__content) - normal flow content (headers, text, inputs)
 * 3. Overlay layer (.swse-panel__overlay) - absolutely positioned interactive elements (buttons, indicators)
 *
 * This structure ensures:
 * - SVG backgrounds don't interfere with text/input layout
 * - Positioned controls can float over the frame without disrupting content flow
 * - Semantic DOM structure (frame is aria-hidden, content and overlay are interactive)
 *
 * CSS Applied:
 * .swse-panel { position: relative; }
 * .swse-panel__frame { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
 * .swse-panel__content { position: relative; z-index: 1; }
 * .swse-panel__overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; }
 */
export const SVG_STRUCTURE_CONTRACT = {
  frameLayer: {
    selector: '.swse-panel__frame',
    purpose: 'SVG background graphics',
    properties: ['position: absolute', 'z-index: -1', 'aria-hidden: true'],
    content: 'SVG elements or CSS-drawn graphics'
  },
  contentLayer: {
    selector: '.swse-panel__content',
    purpose: 'Normal flow content (headers, text, inputs, buttons)',
    properties: ['position: relative', 'z-index: 1'],
    content: 'Headers, paragraphs, form inputs, descriptive elements'
  },
  overlayLayer: {
    selector: '.swse-panel__overlay',
    purpose: 'Absolutely positioned interactive elements',
    properties: ['position: absolute', 'z-index: 2', 'width: 100%', 'height: 100%'],
    content: 'Condition slots, track boxes, positioned controls'
  }
};

/**
 * ROW_CONTRACTS
 *
 * SINGLE SOURCE OF TRUTH for all row shapes used in ledger panels.
 * Every row type has a standardized contract ensuring consistency across the sheet.
 *
 * All rows are normalized by RowTransformers before being passed to templates.
 */
export const ROW_CONTRACTS = {
  InventoryRow: {
    description: 'Item in inventory/gear panel',
    source: 'RowTransformers.toInventoryRow()',
    requiredFields: [
      'id',        // string: item UUID
      'uuid',      // string: foundry UUID
      'name',      // string: item name
      'type',      // string: item type (equipment, weapon, etc.)
      'quantity',  // number: how many
      'weight'     // number: total weight
    ],
    optionalFields: [
      'img',       // string: item image path
      'value',     // number: cost/value
      'rarity',    // string: common/uncommon/rare/unique
      'equipped',  // boolean: is equipped
      'tags',      // array: extracted tags (rare, unique, exotic, restricted)
      'cssClass'   // string: pre-computed CSS classes for styling
    ],
    displayIn: ['inventoryPanel']
  },

  TalentRow: {
    description: 'Talent entry in talents panel',
    source: 'RowTransformers.toTalentRow()',
    requiredFields: [
      'id',        // string: talent UUID
      'uuid',      // string: foundry UUID
      'name',      // string: talent name
      'source',    // string: where talent comes from
      'tree',      // string: talent tree (General, etc.)
      'group'      // string: grouping key (same as tree, for grouped displays)
    ],
    optionalFields: [
      'img',       // string: talent image
      'cost',      // number: CP cost
      'prerequisites', // string: prerequisites
      'description',   // string: full description
      'sourceType',    // string: source category
      'tags',      // array: tags
      'cssClass'   // string: computed CSS classes
    ],
    displayIn: ['talentPanel']
  },

  FeatRow: {
    description: 'Feat entry in feats panel',
    source: 'RowTransformers.toFeatRow()',
    requiredFields: [
      'id',        // string: feat UUID
      'uuid',      // string: foundry UUID
      'name',      // string: feat name
      'source',    // string: where feat comes from
      'category'   // string: feat category (General, Combat, etc.)
    ],
    optionalFields: [
      'img',       // string: feat image
      'requirements', // string: requirements to take feat
      'description',  // string: full description
      'tags',      // array: tags
      'cssClass'   // string: computed CSS classes
    ],
    displayIn: ['featPanel']
  },

  ManeuverRow: {
    description: 'Maneuver entry in maneuvers panel',
    source: 'RowTransformers.toManeuverRow()',
    requiredFields: [
      'id',        // string: maneuver UUID
      'uuid',      // string: foundry UUID
      'name',      // string: maneuver name
      'source',    // string: where maneuver comes from
      'actionType' // string: standard/move/swift/free
    ],
    optionalFields: [
      'img',       // string: maneuver image
      'difficulty',// string: DC/difficulty rating
      'description', // string: full description
      'tags',      // array: tags
      'cssClass'   // string: computed CSS classes
    ],
    displayIn: ['maneuverPanel']
  },

  StarshipManeuverRow: {
    description: 'Starship maneuver entry',
    source: 'derived.starshipManeuvers.list items, normalized by builder',
    requiredFields: [
      'id',        // string: maneuver UUID
      'name',      // string: maneuver name
      'summary'    // string: one-line description
    ],
    optionalFields: [],
    displayIn: ['starshipManeuversPanel']
  },

  ForcePowerRow: {
    description: 'Force power entry in force powers panel',
    source: 'actor.items filtered by type=force-power',
    requiredFields: [
      'id',        // string: power UUID
      'name'       // string: power name
    ],
    optionalFields: [
      'system.prerequisite', // string: prerequisites
      'system.summary',      // string: one-line summary
      'system.discarded'     // boolean: is discarded/removed
    ],
    displayIn: ['forcePowersPanel']
  },

  ArmorSummaryRow: {
    description: 'Armor summary row in armor display',
    source: 'RowTransformers.toArmorSummaryRow()',
    requiredFields: [
      'id',        // string: armor UUID
      'uuid',      // string: foundry UUID
      'name',      // string: armor name
      'armorType'  // string: Light/Medium/Heavy/etc.
    ],
    optionalFields: [
      'img',       // string: armor image
      'weight',    // number: armor weight
      'isPowered', // boolean: powered armor
      'upgradeSlots', // number: available upgrade slots
      'reflexBonus',  // number: reflex defense bonus
      'fortBonus',    // number: fortitude defense bonus
      'maxDexBonus',  // number: max DEX modifier allowed
      'armorCheckPenalty', // number: attack/skill penalty
      'speedPenalty'  // number: speed reduction
    ],
    displayIn: ['armor-summary-panel']
  },

  LanguageRow: {
    description: 'Language entry in languages panel',
    source: 'system.languages array (strings)',
    requiredFields: [
      'value'      // string: language name
    ],
    optionalFields: [],
    note: 'Simple string array, no UUID/ID structure',
    displayIn: ['languagesPanel']
  },

  RacialAbilityRow: {
    description: 'Racial ability entry',
    source: 'derived.racialAbilities array',
    requiredFields: [
      'id',        // string: ability UUID
      'name'       // string: ability name
    ],
    optionalFields: [
      'summary',   // string: one-line summary
      'description' // string: full description
    ],
    displayIn: ['racialAbilitiesPanel']
  }
};


export const PANEL_REGISTRY = {
  healthPanel: {
    name: 'Health & Conditions',
    type: 'display',  // Shows HP, shield, condition track — not editable as a ledger
    svgBacked: true,
    structure: 'frame + content + overlay (condition-track nested)',
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
    svgStructure: {
      mainFrame: '.swse-panel__frame',
      mainContent: '.swse-panel__content',
      conditionTrackFrame: '.condition-track-frame',
      conditionTrackOverlay: '.condition-track-overlay'
    },
    postRenderAssertions: {
      critical: true,  // Health panel is always critical
      rootSelector: '.swse-panel--health',
      expectedElements: {
        '.swse-panel__frame': 1,        // Main SVG frame
        '.swse-panel__content': 1,      // Main content layer
        '.condition-track-frame': 1,    // Condition track SVG frame
        '.condition-track-overlay': 1,  // Condition track overlay
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
      'totalWeight',
      'emptyMessage'
    ],
    optionalKeys: [
      'grouped',
      'equippedArmor',
      'canEdit'
    ],
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
    structure: 'ledger rows (talent list with counts, grouped view)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-known-panel.hbs',
    builder: 'buildTalentPanel',
    validator: 'validateTalentPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalCount',
      'emptyMessage'
    ],
    optionalKeys: [
      'grouped',
      'canEdit'
    ],
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
      'totalCount',
      'emptyMessage'
    ],
    optionalKeys: [
      'canEdit'
    ],
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
      'totalCount',
      'emptyMessage'
    ],
    optionalKeys: [
      'canEdit'
    ],
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
    note: 'Custom ledger contract: multiple arrays (hand, discard, secrets, techniques) instead of single entries',
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
  },

  starshipManeuversPanel: {
    name: 'Starship Maneuvers',
    type: 'ledger',
    svgBacked: false,
    structure: 'ledger rows (starship maneuver list)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/starship-maneuvers-known-panel.hbs',
    builder: 'buildStarshipManeuversPanel',
    validator: 'validateStarshipManeuversPanel',
    requiredKeys: [
      'entries',
      'hasEntries',
      'totalCount',
      'emptyMessage'
    ],
    optionalKeys: [],
    rowContract: {
      type: 'StarshipManeuverRow',
      shape: ['id', 'name', 'summary']
    },
    postRenderAssertions: {
      critical: false,
      rootSelector: '.starship-maneuvers-known-panel',
      optionalElements: {
        '.maneuver-row': '0..99'
      }
    }
  },

  languagesPanel: {
    name: 'Languages',
    type: 'control',
    svgBacked: false,
    structure: 'editable language list (text inputs)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/languages-panel.hbs',
    builder: 'buildLanguagesPanel',
    validator: 'validateLanguagesPanel',
    requiredKeys: [
      'entries',
      'hasEntries'
    ],
    optionalKeys: [],
    rowContract: {
      type: 'LanguageRow',
      shape: ['value']  // Simple strings
    },
    postRenderAssertions: {
      critical: false,
      rootSelector: '.swse-languages-panel',
      optionalElements: {
        '.language-card': '0..99'
      }
    }
  },

  racialAbilitiesPanel: {
    name: 'Racial Abilities',
    type: 'display',
    svgBacked: false,
    structure: 'ability cards (name + summary)',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/racial-ability-panel.hbs',
    builder: 'buildRacialAbilitiesPanel',
    validator: 'validateRacialAbilitiesPanel',
    requiredKeys: [
      'entries',
      'hasEntries'
    ],
    optionalKeys: [],
    rowContract: {
      type: 'RacialAbilityRow',
      shape: ['id', 'name', 'summary']
    },
    postRenderAssertions: {
      critical: false,
      rootSelector: '.racial-section',
      optionalElements: {
        '.racial-card': '0..99'
      }
    }
  },

  armorSummaryPanel: {
    name: 'Armor Summary',
    type: 'display',
    svgBacked: true,
    structure: 'equipped armor display with bonuses',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/armor-summary-panel.hbs',
    builder: 'buildArmorSummaryPanel',
    validator: 'validateArmorSummaryPanel',
    requiredKeys: [
      'equippedArmor'
    ],
    optionalKeys: [
      'canEdit'
    ],
    postRenderAssertions: {
      critical: false,
      rootSelector: '.armor-summary-panel',
      optionalElements: {
        '.armor-summary': '0..1'
      }
    }
  },

  equipmentLedgerPanel: {
    name: 'Equipment Ledger',
    type: 'ledger',
    svgBacked: false,
    structure: 'table of all equipment items with weight tracking',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/equipment-ledger-panel.hbs',
    builder: 'buildEquipmentLedgerPanel',
    validator: 'validateEquipmentLedgerPanel',
    requiredKeys: [
      'allEquipment',
      'totalEquipmentWeight'
    ],
    optionalKeys: [
      'canEdit'
    ],
    rowContract: {
      type: 'EquipmentRow',
      shape: ['id', 'name', 'category', 'quantity', 'weight', 'cost', 'equipped']
    },
    postRenderAssertions: {
      critical: false,
      rootSelector: '.equipment-ledger-panel',
      optionalElements: {
        '.ledger-row': '0..99'
      }
    }
  },

  combatNotesPanel: {
    name: 'Combat Notes',
    type: 'display',
    svgBacked: true,
    structure: 'text area for special combat actions and notes',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/special-combat-actions-panel.hbs',
    builder: 'buildCombatNotesPanel',
    validator: 'validateCombatNotesPanel',
    requiredKeys: [
      'combatNotes'
    ],
    optionalKeys: [
      'canEdit'
    ],
    postRenderAssertions: {
      critical: false,
      rootSelector: '.special-combat-actions-panel',
      optionalElements: {
        '.combat-notes-textarea': '1'
      }
    }
  },

  relationshipsPanel: {
    name: 'Relationships & Connections',
    type: 'display',
    svgBacked: true,
    structure: 'relationship entries with notes',
    template: 'systems/foundryvtt-swse/templates/actors/character/v2/partials/relationships-panel.hbs',
    builder: 'buildRelationshipsPanel',
    validator: 'validateRelationshipsPanel',
    requiredKeys: [
      'relationships',
      'hasAvailableFollowerSlots'
    ],
    optionalKeys: [
      'relationshipNotes',
      'canEdit'
    ],
    postRenderAssertions: {
      critical: false,
      rootSelector: '.relationships-panel',
      optionalElements: {
        '.relationship-entry': '0..99'
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
