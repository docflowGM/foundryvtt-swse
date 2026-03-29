/**
 * scripts/sheets/v2/npc/PANEL_REGISTRY.js
 *
 * NPC Panel Registry
 * Single source of truth defining all NPC sheet panels
 * Metadata: required/optional keys, builder names, template paths, validators, assertions
 */

export const PANEL_REGISTRY = [
  {
    panelName: 'portraitPanel',
    displayName: 'Portrait',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/character/panels/portrait-panel.hbs',
    builderMethod: 'buildPortraitPanel',
    validatorMethod: 'validatePortraitPanel',
    requiredKeys: ['imagePath'],
    optionalKeys: [],
    rootSelector: '.portrait-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  {
    panelName: 'npcBiographyPanel',
    displayName: 'Biography',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/biography-panel.hbs',
    builderMethod: 'buildNpcBiographyPanel',
    validatorMethod: 'validateNpcBiographyPanel',
    requiredKeys: ['name', 'age', 'gender', 'species'],
    optionalKeys: ['playerName', 'npcRole', 'npcLevel'],
    rootSelector: '.npc-biography-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  {
    panelName: 'healthPanel',
    displayName: 'Health',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/character/panels/health-panel.hbs',
    builderMethod: 'buildHealthPanel',
    validatorMethod: 'validateHealthPanel',
    requiredKeys: ['currentHealth', 'maxHealth', 'healthPercent'],
    optionalKeys: ['damageConditionStep'],
    rootSelector: '.health-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  {
    panelName: 'defensePanel',
    displayName: 'Defense',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/character/panels/defense-panel.hbs',
    builderMethod: 'buildDefensePanel',
    validatorMethod: 'validateDefensePanel',
    requiredKeys: ['defense', 'flatFooted'],
    optionalKeys: ['shields'],
    rootSelector: '.defense-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  {
    panelName: 'abilitiesPanel',
    displayName: 'Abilities',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/abilities-panel.hbs',
    builderMethod: 'buildAbilitiesPanel',
    validatorMethod: 'validateAbilitiesPanel',
    requiredKeys: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
    optionalKeys: [],
    rootSelector: '.abilities-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  {
    panelName: 'skillsPanel',
    displayName: 'Skills',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/skills-panel.hbs',
    builderMethod: 'buildSkillsPanel',
    validatorMethod: 'validateSkillsPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount'],
    optionalKeys: [],
    rootSelector: '.skills-panel',
    svgBacked: false,
    rowContract: {
      name: 'string (skill name)',
      bonus: 'number (skill bonus)',
      ability: 'string (ability modifier)'
    },
    postRenderAssertions: []
  },

  {
    panelName: 'inventoryPanel',
    displayName: 'Inventory',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/inventory-panel.hbs',
    builderMethod: 'buildInventoryPanel',
    validatorMethod: 'validateInventoryPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount'],
    optionalKeys: ['totalWeight'],
    rootSelector: '.inventory-panel',
    svgBacked: false,
    rowContract: {
      id: 'string (item ID)',
      name: 'string (item name)',
      quantity: 'number (item quantity)',
      weight: 'number (item weight)'
    },
    postRenderAssertions: ['rowsHaveDataId']
  },

  {
    panelName: 'talentPanel',
    displayName: 'Talents',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/talents-panel.hbs',
    builderMethod: 'buildTalentPanel',
    validatorMethod: 'validateTalentPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount'],
    optionalKeys: [],
    rootSelector: '.talent-panel',
    svgBacked: false,
    rowContract: {
      id: 'string (talent ID)',
      name: 'string (talent name)',
      source: 'string (source book)'
    },
    postRenderAssertions: ['rowsHaveDataId']
  },

  {
    panelName: 'featPanel',
    displayName: 'Feats',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/feats-panel.hbs',
    builderMethod: 'buildFeatPanel',
    validatorMethod: 'validateFeatPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount'],
    optionalKeys: [],
    rootSelector: '.feat-panel',
    svgBacked: false,
    rowContract: {
      id: 'string (feat ID)',
      name: 'string (feat name)',
      source: 'string (source book)'
    },
    postRenderAssertions: ['rowsHaveDataId']
  },

  {
    panelName: 'languagesPanel',
    displayName: 'Languages',
    type: 'ledger',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/languages-panel.hbs',
    builderMethod: 'buildLanguagesPanel',
    validatorMethod: 'validateLanguagesPanel',
    requiredKeys: ['entries', 'hasEntries', 'totalCount'],
    optionalKeys: [],
    rootSelector: '.languages-panel',
    svgBacked: false,
    rowContract: {
      id: 'string (language ID)',
      name: 'string (language name)'
    },
    postRenderAssertions: ['rowsHaveDataId']
  },

  {
    panelName: 'npcCombatNotesPanel',
    displayName: 'Combat Notes',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/combat-notes-panel.hbs',
    builderMethod: 'buildNpcCombatNotesPanel',
    validatorMethod: 'validateNpcCombatNotesPanel',
    requiredKeys: ['tactics'],
    optionalKeys: ['strengths', 'weaknesses', 'specialAbilities'],
    rootSelector: '.npc-combat-notes-panel',
    svgBacked: false,
    postRenderAssertions: []
  },

  {
    panelName: 'combatPanel',
    displayName: 'Combat',
    type: 'display',
    templatePath: 'systems/foundryvtt-swse/templates/v2/npc/panels/combat-panel.hbs',
    builderMethod: 'buildCombatPanel',
    validatorMethod: 'validateCombatPanel',
    requiredKeys: ['initiative', 'armorClass'],
    optionalKeys: ['baseAttack'],
    rootSelector: '.combat-panel',
    svgBacked: false,
    postRenderAssertions: []
  }
];
