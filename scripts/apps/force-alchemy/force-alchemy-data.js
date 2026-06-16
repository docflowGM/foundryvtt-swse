// scripts/apps/force-alchemy/force-alchemy-data.js
// Force Artifact / Sith Alchemy Workbench static rite catalog.

export const FORCE_ALCHEMY_FLAG_SCOPE = 'foundryvtt-swse';
export const FORCE_ALCHEMY_FLAG_KEY = 'forceAlchemy';

export const FORCE_ALCHEMY_CATEGORIES = [
  { id: 'force', label: 'Force Talismans', glyph: '&loz;' },
  { id: 'darkside', label: 'Dark Side', glyph: '&#9790;' },
  { id: 'sith', label: 'Sith Alchemy', glyph: '&#9650;' },
  { id: 'mutation', label: 'Mutation', glyph: '&#9763;' },
  { id: 'specialist', label: 'Specialist', glyph: '&#10070;' },
  { id: 'combat', label: 'Combat Rites', glyph: '&#9889;' }
];

export const FORCE_ALCHEMY_DEFENSES = [
  { id: 'reflex', abbr: 'REF', label: 'Reflex Defense' },
  { id: 'fortitude', abbr: 'FORT', label: 'Fortitude Defense' },
  { id: 'will', abbr: 'WILL', label: 'Will Defense' }
];

export const FORCE_ALCHEMY_TEMPLATES = [
  {
    id: 'sith-abomination',
    name: 'Sith Abomination Template',
    description: 'A living creature is remade into a brutal alchemical horror. Full template mutation is GM-confirmed in a later phase.'
  },
  {
    id: 'chrysalis-beast',
    name: 'Chrysalis Beast Template',
    description: 'A creature is cocooned, altered, and bound through Sith alchemy. Full template mutation is GM-confirmed in a later phase.'
  }
];

export const FORCE_ALCHEMY_SPECIALIST_TRAITS = {
  'dark-armor': [
    { id: 'cortosis-weave', name: 'Cortosis Weave', description: 'Armor is laced with cortosis as a Sith alchemical trait.' },
    { id: 'dark-side-energy', name: 'Dark Side Energy', description: 'Armor channels dark side energy into a defensive trait.' },
    { id: 'dark-side-stealth', name: 'Dark Side Stealth', description: 'Armor drinks light and hides the wearer in shadow.' },
    { id: 'imposing-form', name: 'Imposing Form', description: 'Armor radiates dread and intimidation.' }
  ],
  'sith-weapon': [
    { id: 'jagged-weapon', name: 'Jagged Weapon', description: 'Weapon edges are twisted into cruel alchemical wounds.' },
    { id: 'masters-weapon', name: "Master's Weapon", description: 'Weapon is attuned to its creator.' },
    { id: 'vile-weapon', name: 'Vile Weapon', description: 'Weapon leaves wounds that resist Force healing.' }
  ],
  'sith-abomination': [
    { id: 'damage-reduction', name: 'Damage Reduction', description: 'Creature hide and bone harden into alchemical protection.' },
    { id: 'iron-will', name: 'Iron Will', description: 'Creature mind is bound against outside influence.' },
    { id: 'vile-natural-weapons', name: 'Vile Natural Weapons', description: 'Creature attacks carry vile alchemical trauma.' }
  ]
};

export const FORCE_ALCHEMY_RITES = [
  {
    id: 'force-talisman',
    category: 'force',
    name: 'Force Talisman',
    glyph: '&loz;',
    timing: 'instant',
    action: 'Full-round action',
    targetType: 'portable',
    targetLabel: 'Portable object',
    configType: 'defense',
    requiredTalents: ['Force Talisman'],
    fpCost: 1,
    dspCost: 0,
    creditCost: 0,
    summary: 'Imbue a portable object with protective Force energy. While carried, it grants a +1 Force bonus to one chosen defense.',
    rules: [
      'Spend 1 Force Point as the full-round action completes.',
      'Choose Reflex, Fortitude, or Will Defense.',
      'Only one Force Talisman can be active at a time.',
      'If destroyed, another Force Talisman cannot be created for 24 hours.'
    ],
    resultLabel: '+1 Force bonus to the chosen defense',
    stateKey: 'activeForceTalisman'
  },
  {
    id: 'greater-force-talisman',
    category: 'force',
    name: 'Greater Force Talisman',
    glyph: '&loz;',
    timing: 'instant',
    action: 'Full-round action',
    targetType: 'portable',
    targetLabel: 'Portable object',
    configType: 'none',
    requiredTalents: ['Greater Force Talisman'],
    fpCost: 1,
    dspCost: 0,
    creditCost: 0,
    summary: 'Create a perfected protective talisman that grants a +1 Force bonus to all defenses while carried.',
    rules: [
      'Spend 1 Force Point as the full-round action completes.',
      'Grants +1 Force bonus to Reflex, Fortitude, and Will Defense.',
      'Mutually exclusive with a regular Force Talisman.',
      'If destroyed, another Force Talisman cannot be created for 24 hours.'
    ],
    resultLabel: '+1 Force bonus to all defenses',
    stateKey: 'activeForceTalisman'
  },
  {
    id: 'focused-force-talisman',
    category: 'force',
    name: 'Focused Force Talisman',
    glyph: '&#10038;',
    timing: 'instant',
    action: 'Full-round action',
    targetType: 'portable',
    targetLabel: 'Existing Force Talisman / portable object',
    configType: 'force-power',
    requiredTalents: ['Focused Force Talisman', 'Force Talisman'],
    dynamicPrereqs: ['activeForceTalisman'],
    fpCost: 1,
    dspCost: 0,
    creditCost: 0,
    summary: 'Attune a Force Talisman to one Force Power so expended uses of that power can be refreshed by a Force Point spend.',
    rules: [
      'Requires a Force Talisman state to be active or prepared.',
      'Choose one Force Power from the actor\'s Force suite.',
      'The selected power can be refreshed by spending a Force Point after using it.'
    ],
    resultLabel: 'Selected Force Power refresh flag',
    stateKey: 'focusedForceTalisman'
  },
  {
    id: 'greater-focused-force-talisman',
    category: 'force',
    name: 'Greater Focused Force Talisman',
    glyph: '&#10038;',
    timing: 'instant',
    action: 'Full-round action',
    targetType: 'portable',
    targetLabel: 'Existing Force Talisman / portable object',
    configType: 'force-power',
    requiredTalents: ['Greater Focused Force Talisman', 'Focused Force Talisman', 'Force Talisman'],
    dynamicPrereqs: ['activeForceTalisman'],
    fpCost: 1,
    dspCost: 0,
    creditCost: 0,
    summary: 'Perfect the focused talisman so its refresh Force Point does not count against the one-per-turn restriction.',
    rules: [
      'Requires a Force Talisman state to be active or prepared.',
      'Choose one Force Power from the actor\'s Force suite.',
      'The refresh Force Point does not count against the one-per-turn Force Point limit.'
    ],
    resultLabel: 'Greater selected Force Power refresh flag',
    stateKey: 'focusedForceTalisman'
  },
  {
    id: 'dark-side-talisman',
    category: 'darkside',
    name: 'Dark Side Talisman',
    glyph: '&#9790;',
    timing: 'instant',
    action: 'Full-round action',
    targetType: 'portable',
    targetLabel: 'Portable object',
    configType: 'defense',
    requiredTalents: ['Dark Side Talisman'],
    fpCost: 1,
    dspCost: 0,
    creditCost: 0,
    summary: 'Imbue a portable object with the Dark Side, protecting one chosen defense against Light Side Force Powers.',
    rules: [
      'Spend 1 Force Point as the full-round action completes.',
      'Choose Reflex, Fortitude, or Will Defense.',
      'Grants +2 Force bonus to that defense against Force Powers with the Light Side descriptor.',
      'Only one Dark Side Talisman can be active at a time.'
    ],
    resultLabel: '+2 Force bonus to chosen defense against Light Side Force Powers',
    stateKey: 'activeDarkSideTalisman'
  },
  {
    id: 'greater-dark-side-talisman',
    category: 'darkside',
    name: 'Greater Dark Side Talisman',
    glyph: '&#9790;',
    timing: 'instant',
    action: 'Full-round action',
    targetType: 'portable',
    targetLabel: 'Portable object',
    configType: 'none',
    requiredTalents: ['Greater Dark Side Talisman'],
    fpCost: 1,
    dspCost: 0,
    creditCost: 0,
    summary: 'Create a greater ward that protects all defenses against Light Side Force Powers.',
    rules: [
      'Spend 1 Force Point as the full-round action completes.',
      'Grants +2 Force bonus to all defenses against Light Side Force Powers.',
      'Mutually exclusive with a regular Dark Side Talisman.',
      'If destroyed, another Dark Side Talisman cannot be created for 24 hours.'
    ],
    resultLabel: '+2 Force bonus to all defenses against Light Side Force Powers',
    stateKey: 'activeDarkSideTalisman'
  },
  {
    id: 'sith-talisman',
    category: 'sith',
    name: 'Sith Talisman',
    glyph: '&#9650;',
    timing: 'instant',
    action: 'Full-round action',
    targetType: 'portable',
    targetLabel: 'Portable object',
    configType: 'none',
    requiredTalents: ['Sith Alchemy'],
    fpCost: 1,
    dspCost: 1,
    creditCost: 0,
    summary: 'Imbue a portable object with offensive dark side force, adding damage to Force Powers while carried.',
    rules: [
      'Spend 1 Force Point as the full-round action completes.',
      'First wearing or carrying the talisman increases Dark Side Score by 1.',
      'While carried, add +1d6 damage with Force Powers.',
      'Only one Sith Talisman can be active at a time.'
    ],
    resultLabel: '+1d6 Force Power damage state',
    stateKey: 'activeSithTalisman'
  },
  {
    id: 'sith-amulet',
    category: 'sith',
    name: 'Create Sith Amulet',
    glyph: '&loz;',
    timing: 'downtime',
    action: '1 week crafting',
    targetType: 'materials',
    targetLabel: 'Gems and raw materials',
    configType: 'none',
    requiredTalents: ['Sith Alchemy'],
    fpCost: 1,
    dspCost: 1,
    creditCost: 25000,
    summary: 'Begin or complete a week-long ritual to create a Sith Amulet from gems and rare materials.',
    rules: [
      'Requires 25,000 credits worth of gems and raw materials.',
      'Creation takes 1 week and the work need not be consecutive.',
      'Spend 1 Force Point at completion.',
      'Completing the alchemical transformation increases Dark Side Score by 1.'
    ],
    resultLabel: 'Pending Sith Amulet project',
    stateKey: 'projects'
  },
  {
    id: 'sith-armor',
    category: 'sith',
    name: 'Create Sith Armor',
    glyph: '&#9959;',
    timing: 'downtime',
    action: '1-3 days crafting',
    targetType: 'battle-armor',
    targetLabel: 'Battle Armor',
    configType: 'armor-tier',
    requiredTalents: ['Sith Alchemy'],
    fpCost: 1,
    dspCost: 1,
    creditCost: 0,
    summary: 'Transform a suit of Battle Armor into Light Dark Armor, Dark Armor, or Heavy Dark Armor.',
    rules: [
      'Light Battle Armor becomes Light Dark Armor in 1 day.',
      'Battle Armor becomes Dark Armor in 2 days.',
      'Heavy Battle Armor becomes Heavy Dark Armor in 3 days.',
      'Spend 1 Force Point at completion and increase Dark Side Score by 1.'
    ],
    resultLabel: 'Pending Sith Armor transformation project',
    stateKey: 'projects'
  },
  {
    id: 'sith-weapon',
    category: 'sith',
    name: 'Create Sith Weapon',
    glyph: '&#9876;',
    timing: 'downtime',
    action: '1 hour crafting',
    targetType: 'melee-weapon',
    targetLabel: 'Simple or Advanced Melee Weapon',
    configType: 'none',
    requiredTalents: ['Sith Alchemy'],
    fpCost: 1,
    dspCost: 1,
    creditCost: 0,
    summary: 'Alchemically treat a Simple Melee or Advanced Melee weapon, turning it into a Sith Weapon.',
    rules: [
      'Requires a Simple Melee or Advanced Melee weapon target.',
      'Spend 1 hour imbuing the weapon and 1 Force Point at completion.',
      'Lightsabers do not ignore the Sith Weapon\'s DR.',
      'A proficient wielder can treat it as a lightsaber for Block, Deflect, Redirect Shot, and related talents.',
      'The wielder can spend a Force Point as a swift action to add Dark Side Score to next damage before the end of the encounter, then increase Dark Side Score by 1.'
    ],
    resultLabel: 'Sith Weapon item flag and damage surge action',
    stateKey: 'projects'
  },
  {
    id: 'cause-mutation',
    category: 'mutation',
    name: 'Cause Mutation',
    glyph: '&#9763;',
    timing: 'downtime',
    action: 'CL days crafting',
    targetType: 'creature',
    targetLabel: 'Creature actor',
    configType: 'template',
    requiredTalents: ['Cause Mutation', 'Sith Alchemy'],
    fpCost: 1,
    dspCost: 1,
    creditCost: 0,
    gmGated: true,
    summary: 'Apply the Sith Abomination or Chrysalis Beast template to a willing or unconscious creature in a medical lab.',
    rules: [
      'Requires a willing or unconscious creature and a proper medical lab.',
      'Choose the Sith Abomination Template or Chrysalis Beast Template.',
      'The process requires days equal to the creature\'s modified CL.',
      'Completion spends 1 Force Point and the creature becomes domesticated to the creator only unless already domesticated.'
    ],
    resultLabel: 'GM-gated mutation project',
    stateKey: 'projects'
  },
  {
    id: 'sith-alchemy-specialist',
    category: 'specialist',
    name: 'Sith Alchemy Specialist',
    glyph: '&#10070;',
    timing: 'downtime',
    action: '1 hour crafting',
    targetType: 'alchemical-object',
    targetLabel: 'Alchemical object or creature',
    configType: 'trait',
    requiredTalents: ['Sith Alchemy Specialist', 'Sith Alchemy'],
    fpCost: 1,
    dspCost: 1,
    creditCost: 0,
    summary: 'Modify a Sith alchemical object or creature by adding one permitted specialist trait.',
    rules: [
      'Choose an eligible Dark Armor, Sith Weapon, or Sith Abomination target.',
      'Choose one permitted trait for that target type.',
      'Spend 1 Force Point and 1 hour of uninterrupted work.',
      'Increase Dark Side Score by 1.',
      'The same benefit cannot be applied more than once.'
    ],
    resultLabel: 'Selected specialist trait flag',
    stateKey: 'projects'
  },
  {
    id: 'rapid-alchemy',
    category: 'combat',
    name: 'Rapid Alchemy',
    glyph: '&#9889;',
    timing: 'encounter',
    action: 'Standard action',
    targetType: 'melee-weapon',
    targetLabel: 'Wielded melee weapon',
    configType: 'none',
    requiredTalents: ['Rapid Alchemy'],
    fpCost: 0,
    dspCost: 0,
    creditCost: 0,
    summary: 'Temporarily enhance a wielded melee weapon with a +2 Equipment bonus to attack rolls for the encounter.',
    rules: [
      'Use a standard action and choose a wielded melee weapon.',
      'The chosen weapon gains +2 Equipment bonus to attack rolls for the encounter.',
      'As a free action, sacrifice that attack bonus to gain +5 Equipment bonus on one damage roll with that weapon.',
      'The damage surge must be used before the end of the encounter.'
    ],
    resultLabel: '+2 attack encounter state and consumable +5 damage surge',
    stateKey: 'rapidAlchemy'
  }
];


export function normalizeForceAlchemyKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export const FORCE_ALCHEMY_TALENT_RITE_MAP = [
  { talent: 'Force Talisman', riteId: 'force-talisman', category: 'force' },
  { talent: 'Greater Force Talisman', riteId: 'greater-force-talisman', category: 'force' },
  { talent: 'Focused Force Talisman', riteId: 'focused-force-talisman', category: 'force' },
  { talent: 'Greater Focused Force Talisman', riteId: 'greater-focused-force-talisman', category: 'force' },
  { talent: 'Dark Side Talisman', riteId: 'dark-side-talisman', category: 'darkside' },
  { talent: 'Greater Dark Side Talisman', riteId: 'greater-dark-side-talisman', category: 'darkside' },
  { talent: 'Sith Alchemy', riteId: 'sith-talisman', category: 'sith' },
  { talent: 'Cause Mutation', riteId: 'cause-mutation', category: 'mutation' },
  { talent: 'Sith Alchemy Specialist', riteId: 'sith-alchemy-specialist', category: 'specialist' },
  { talent: 'Rapid Alchemy', riteId: 'rapid-alchemy', category: 'combat' }
].map(entry => ({ ...entry, key: normalizeForceAlchemyKey(entry.talent) }));

export function getForceAlchemyLaunchForTalentName(talentName) {
  const key = normalizeForceAlchemyKey(talentName);
  if (!key) return null;
  const exact = FORCE_ALCHEMY_TALENT_RITE_MAP.find(entry => entry.key === key);
  if (exact) return exact;
  return [...FORCE_ALCHEMY_TALENT_RITE_MAP]
    .sort((a, b) => b.key.length - a.key.length)
    .find(entry => key.startsWith(entry.key) || entry.key.startsWith(key)) ?? null;
}

export function getForceAlchemyRite(riteId) {
  return FORCE_ALCHEMY_RITES.find(rite => rite.id === riteId) ?? null;
}

export function getForceAlchemyCategory(categoryId) {
  return FORCE_ALCHEMY_CATEGORIES.find(category => category.id === categoryId) ?? FORCE_ALCHEMY_CATEGORIES[0];
}
