/**
 * scripts/houserules/houserules-manifest.js
 *
 * Canonical registry for every SWSE houlerule setting.
 *
 * Each entry documents:
 *   key           - Foundry settings key (must match registered key exactly)
 *   name          - Display name
 *   category      - UI category grouping
 *   description   - GM-visible description
 *   type          - 'string' | 'number' | 'boolean' | 'object' | 'array'
 *   choices       - null or { value: 'Label' } map
 *   default       - Default value
 *   status        - 'wired' | 'partial' | 'unwired' | 'legacy'
 *   tags          - Array of string tags; valid values:
 *                    'RAW'          - Rule exists in core SWSE RAW
 *                    'house-rule'   - House rule / community variant
 *                    'automation'   - Setting gates automation (not purely cosmetic)
 *                    'experimental' - Feature incomplete or untested
 *                    'requires-tokens' - Only relevant when tokens are on canvas
 *                    'theater-friendly' - Works well without tokens
 *                    'partial'      - Wired but mechanic has gaps
 *   presetVisible - Include in preset export/import
 *   config        - Whether visible in standard Foundry settings UI
 */

export const HOUSERULE_MANIFEST = [

  // ─── CHARACTER CREATION ─────────────────────────────────────────────────────

  {
    key: 'abilityScoreMethod',
    name: 'Ability Score Generation Method',
    category: 'characterCreation',
    description: 'Determines how ability scores are generated for new characters.',
    type: 'string',
    choices: {
      '4d6drop': '4d6 Drop Lowest',
      organic: 'Organic (24d6)',
      pointbuy: 'Point Buy',
      array: 'Standard Array',
      '3d6': '3d6 Straight',
      '2d6plus6': '2d6+6'
    },
    default: '4d6drop',
    status: 'wired',
    tags: ['RAW', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'pointBuyPool',
    name: 'Point Buy Pool',
    category: 'characterCreation',
    description: 'Total ability score points available under the point buy system.',
    type: 'number',
    choices: null,
    default: 32,
    status: 'wired',
    tags: ['automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'allowAbilityReroll',
    name: 'Allow Ability Score Reroll',
    category: 'characterCreation',
    description: 'Allows players to reroll low stat sets during character creation.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: true,
    config: true
  },
  {
    key: 'allowPlayersNonheroic',
    name: 'Allow Non-Heroic Player Characters',
    category: 'characterCreation',
    description: 'If enabled, players can access the NPC (non-heroic) character generator.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },
  {
    key: 'maxStartingCredits',
    name: 'Max Starting Credits',
    category: 'characterCreation',
    description: 'Players receive maximum starting credits instead of rolling.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },
  {
    key: 'characterCreation',
    name: 'Character Creation Settings (Internal)',
    category: 'characterCreation',
    description: 'Internal structured config object used by the character creation wizard.',
    type: 'object',
    choices: null,
    default: {},
    status: 'partial',
    tags: ['automation'],
    presetVisible: true,
    config: false
  },

  // ─── BACKGROUNDS ────────────────────────────────────────────────────────────

  {
    key: 'enableBackgrounds',
    name: 'Enable Backgrounds System',
    category: 'characterCreation',
    description: 'Allow characters to select Event, Occupation, and Planet backgrounds during creation.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'backgroundSelectionCount',
    name: 'Number of Background Selections',
    category: 'characterCreation',
    description: 'How many backgrounds each character may choose.',
    type: 'number',
    choices: { 1: '1 Background (Standard)', 2: '2 Backgrounds', 3: '3 Backgrounds' },
    default: 1,
    status: 'wired',
    tags: ['automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'allowCustomPlanetUTF',
    name: 'Custom Planet Builder: Allow Use the Force',
    category: 'characterCreation',
    description: 'Allows Use the Force to appear in the Create Custom Planet skill selection list.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },
  {
    key: 'backgroundSkillGrantMode',
    name: 'Background Skill Grant Mode',
    category: 'characterCreation',
    description: 'Controls whether background skills are chosen RAW-style or all granted automatically.',
    type: 'string',
    choices: {
      raw_choice: 'RAW: choose listed background skills',
      grant_all_listed_skills: 'House Rule: grant all listed background skills'
    },
    default: 'raw_choice',
    status: 'wired',
    tags: ['RAW', 'automation'],
    presetVisible: true,
    config: true
  },

  // ─── DROIDS ─────────────────────────────────────────────────────────────────

  {
    key: 'droidPointBuyPool',
    name: 'Droid Point Buy Pool',
    category: 'characterCreation',
    description: 'Point buy total for droid characters.',
    type: 'number',
    choices: null,
    default: 20,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'livingPointBuyPool',
    name: 'Living Point Buy Pool',
    category: 'characterCreation',
    description: 'Point buy total for living (non-droid) characters.',
    type: 'number',
    choices: null,
    default: 25,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'droidConstructionCredits',
    name: 'Droid Construction Credits',
    category: 'characterCreation',
    description: 'Base credit budget for custom-built droid characters.',
    type: 'number',
    choices: null,
    default: 1000,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'allowDroidOverflow',
    name: 'Allow Droid Budget Overflow',
    category: 'characterCreation',
    description: 'Lets unused droid construction credits carry over as general starting credits.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },
  {
    key: 'allowDroidDestiny',
    name: 'Allow Droids to Have Destiny',
    category: 'characterCreation',
    description: 'Lets droid characters have Destiny Points like organics.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },

  // ─── HIT POINTS ─────────────────────────────────────────────────────────────

  {
    key: 'hpGeneration',
    name: 'HP Generation Method',
    category: 'characterCreation',
    description: 'How HP is calculated when leveling up.',
    type: 'string',
    choices: {
      roll: 'Roll Hit Die',
      average: 'Take Average',
      maximum: 'Take Maximum',
      average_minimum: 'Roll with Minimum Average'
    },
    default: 'average',
    status: 'wired',
    tags: ['automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'maxHPLevels',
    name: 'Levels with Maximum HP',
    category: 'characterCreation',
    description: 'Number of early levels granted automatic max HP.',
    type: 'number',
    choices: null,
    default: 1,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'levelUpHpRecoveryMode',
    name: 'HP on Level Up',
    category: 'characterCreation',
    description: 'Controls whether current HP changes when max HP increases during level-up.',
    type: 'string',
    choices: {
      none: 'Default: keep current HP unchanged',
      refillToMax: 'House Rule: refill to new maximum',
      increaseCurrentByMaxGain: 'House Rule: add the max-HP gain to current HP'
    },
    default: 'none',
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },

  // ─── DEATH & DYING ──────────────────────────────────────────────────────────

  {
    key: 'deathSystem',
    name: 'Death System',
    category: 'combat',
    description: 'How character death is determined. Standard uses -10 HP. Three Strikes uses death saves. Negative CON uses negative constitution score.',
    type: 'object',
    choices: null,
    default: {
      system: 'standard',
      strikesUntilDeath: 3,
      returnToHP: 0,
      strikeRemoval: 'never',
      displayStrikes: false,
      deathAtNegativeCon: false,
      massiveDamageThreshold: 0
    },
    status: 'partial',
    tags: ['RAW', 'automation', 'partial'],
    presetVisible: true,
    config: true
  },
  {
    key: 'deathSaveDC',
    name: 'Death Save DC',
    category: 'combat',
    description: 'DC for death saves used in the Three Strikes death system.',
    type: 'number',
    choices: null,
    default: 10,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },

  // ─── COMBAT RULES ───────────────────────────────────────────────────────────

  {
    key: 'conditionTrackCap',
    name: 'Condition Track Damage Cap',
    category: 'combat',
    description: 'Maximum condition track steps that can be moved by a single hit. Set to 0 for unlimited (RAW).',
    type: 'number',
    choices: null,
    default: 0,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'criticalHitVariant',
    name: 'Critical Hit Variant',
    category: 'combat',
    description: 'How critical hits deal damage.',
    type: 'string',
    choices: {
      standard: 'Standard (Double Damage)',
      maxplus: 'Maximum + Roll',
      exploding: 'Exploding Dice',
      trackonly: 'Condition Track Only'
    },
    default: 'standard',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'diagonalMovement',
    name: 'Diagonal Movement Cost',
    category: 'combat',
    description: 'How diagonal movement is calculated on the grid.',
    type: 'string',
    choices: {
      swse: 'All 2 squares (SWSE Default)',
      alternating: '1-2-1 Alternating (3.5 Style)',
      simplified: 'All 1 square (Simplified)'
    },
    default: 'swse',
    status: 'wired',
    tags: ['RAW', 'requires-tokens'],
    presetVisible: true,
    config: true
  },
  {
    key: 'weaponRangeReduction',
    name: 'Weapon Range Reduction',
    category: 'combat',
    description: 'Apply a global range reduction to all weapon ranges.',
    type: 'string',
    choices: {
      none: 'No Reduction',
      quarter: '25% Range',
      half: '50% Range',
      threequarter: '75% Range'
    },
    default: 'none',
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'weaponRangeMultiplier',
    name: 'Weapon Range Multiplier',
    category: 'combat',
    description: 'Multiplier applied to all weapon ranges. 1.0 = RAW. 0.5 = half ranges (more tactical). 2.0 = double ranges.',
    type: 'number',
    choices: null,
    default: 1.0,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'fightDefensivelyActionMode',
    name: 'Fight Defensively Action Mode',
    category: 'combat',
    description: 'Controls the action cost for Fight Defensively. RAW uses a standard action. RAI allows it alongside an attack at -5. Swift makes it a free swift-action stance.',
    type: 'string',
    choices: {
      default: 'Default RAW: standard action defensive stance',
      rai: 'RAI: can accompany a normal attack at -5',
      swift: 'House Rule: swift action defensive stance'
    },
    default: 'default',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'armoredDefenseForAll',
    name: 'Armored Defense for All',
    category: 'combat',
    description: 'All characters can apply armor bonus to Reflex Defense, not just those with the Armored Defense talent.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'trackBlasterCharges',
    name: 'Track Blaster Charges',
    category: 'combat',
    description: 'Enable tracking of blaster power cell usage and charges in combat.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },

  // ─── SECOND WIND ────────────────────────────────────────────────────────────

  {
    key: 'secondWindImproved',
    name: 'Improved Second Wind',
    category: 'combat',
    description: 'Second Wind also moves the character up the Condition Track in addition to restoring HP.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'secondWindRecovery',
    name: 'Second Wind Recovery Timing',
    category: 'combat',
    description: 'When Second Wind uses recover.',
    type: 'string',
    choices: {
      encounter: 'After Each Encounter',
      short: 'After a Short Rest',
      extended: 'After an Extended Rest'
    },
    default: 'encounter',
    status: 'wired',
    tags: ['RAW', 'house-rule'],
    presetVisible: true,
    config: true
  },
  {
    key: 'secondWindWebEnhancement',
    name: 'Web Enhancement: Second Wind Formula',
    category: 'combat',
    description: 'Uses the alternate Second Wind healing formula: 5 + (CHA Mod) + 1d4 instead of standard.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: true,
    config: true
  },

  // ─── SKILLS & FEATS ─────────────────────────────────────────────────────────

  {
    key: 'feintSkill',
    name: 'Feint Skill',
    category: 'skills',
    description: 'Which skill is used to oppose Will Defense when feinting.',
    type: 'string',
    choices: {
      deception: 'Deception (Standard)',
      persuasion: 'Persuasion'
    },
    default: 'deception',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'skillFocusVariant',
    name: 'Skill Focus Variant',
    category: 'skills',
    description: 'Defines how Skill Focus calculates its bonus.',
    type: 'string',
    choices: {
      normal: 'Normal (+5)',
      scaled: 'Scaled (+½ Level, Max +5)',
      delayed: 'Delayed (Activates at Set Level)'
    },
    default: 'normal',
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'skillFocusActivationLevel',
    name: 'Delayed Skill Focus Activation Level',
    category: 'skills',
    description: 'Character level at which Delayed Skill Focus activates. Only applies when Skill Focus Variant is Delayed.',
    type: 'number',
    choices: null,
    default: 7,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'knowledgeSkillMode',
    name: 'Knowledge Skills Consolidation',
    category: 'skills',
    description: 'How Knowledge skills are presented. Standard keeps them separate. Consolidated merges them into one. Simplified offers fewer options.',
    type: 'string',
    choices: {
      standard: 'Standard (Separate Knowledge Skills)',
      consolidated: 'Consolidated (Single Knowledge Skill)',
      simplified: 'Simplified (Limited Knowledge Options)'
    },
    default: 'standard',
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'athleticsConsolidation',
    name: 'Athletics & Acrobatics Consolidation',
    category: 'skills',
    description: 'Merge Athletics and Acrobatics into a single consolidated skill.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'skillFocusRestriction',
    name: 'Skill Focus Restriction',
    category: 'skills',
    description: 'Internal object controlling Skill Focus restrictions (e.g. Use the Force level cap).',
    type: 'object',
    choices: null,
    default: { useTheForce: 0, scaling: 'normal' },
    status: 'partial',
    tags: ['automation', 'partial'],
    presetVisible: true,
    config: false
  },

  // ─── FORCE & DARK SIDE ──────────────────────────────────────────────────────

  {
    key: 'forceTrainingAttribute',
    name: 'Force Training Ability',
    category: 'force',
    description: 'Which ability modifies Force Power selection slots granted by Force Training feat.',
    type: 'string',
    choices: { wisdom: 'Wisdom', charisma: 'Charisma' },
    default: 'wisdom',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'useTheForceAttribute',
    name: 'Use the Force Ability',
    category: 'force',
    description: 'Which ability is used for Use the Force checks and Force power execution scaling.',
    type: 'string',
    choices: { charisma: 'Charisma', wisdom: 'Wisdom' },
    default: 'charisma',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'blockDeflectTalents',
    name: 'Block + Deflect Behavior',
    category: 'force',
    description: 'Determines whether Block and Deflect are separate talents or combined into one.',
    type: 'string',
    choices: { separate: 'Separate (Standard)', combined: 'Combined into One Talent' },
    default: 'separate',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'blockMechanicalAlternative',
    name: 'Block Mechanic Alternative',
    category: 'force',
    description: 'Non-Jedi can use melee weapons to block incoming melee attacks as a Reaction, using the same mechanics as Unarmed Parry.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'forceSensitiveJediOnly',
    name: 'Force Sensitive Jedi Restriction',
    category: 'force',
    description: 'Restricts the Force Sensitive feat to Jedi classes only.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'darkSideMaxMultiplier',
    name: 'Dark Side Max Score Multiplier',
    category: 'force',
    description: 'Maximum Dark Side Score = Wisdom score × this multiplier.',
    type: 'number',
    choices: null,
    default: 1,
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'darkSidePowerIncreaseScore',
    name: 'Auto-Increase Dark Side Score',
    category: 'force',
    description: 'Using a [Dark Side] power automatically increases the user\'s Dark Side Score by 1.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['RAW', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'darkInspirationEnabled',
    name: 'Enable Dark Inspiration',
    category: 'force',
    description: 'Allows Force-sensitive characters to use Dark Inspiration to cast dark side powers at the cost of a Dark Side Point.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'experimental'],
    presetVisible: false,
    config: true
  },
  {
    key: 'forcePointRecovery',
    name: 'Force Point Recovery',
    category: 'force',
    description: 'When Force Points refresh.',
    type: 'string',
    choices: {
      level: 'On Level Up',
      extended: 'After Extended Rest',
      session: 'Each Session'
    },
    default: 'level',
    status: 'wired',
    tags: ['RAW', 'house-rule'],
    presetVisible: true,
    config: true
  },
  {
    key: 'darkSideTemptation',
    name: 'Dark Side Temptation',
    category: 'force',
    description: 'How Dark Side temptation is handled. Strict = RAW rules. Lenient = broader interpretation. Narrative = GM discretion only.',
    type: 'string',
    choices: {
      strict: 'Strict RAW - Core rules only',
      lenient: 'Lenient - Broader interpretation',
      narrative: 'Narrative Only - GM discretion'
    },
    default: 'strict',
    status: 'wired',
    tags: ['RAW', 'house-rule'],
    presetVisible: true,
    config: true
  },
  {
    key: 'allowSuiteReselection',
    name: 'Allow Suite Reselection on Level Up',
    category: 'force',
    description: 'When enabled, Force Powers and Starship Maneuvers may be fully reselected during level up.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },

  // ─── COMBAT FEATS ───────────────────────────────────────────────────────────

  {
    key: 'weaponFinesseDefault',
    name: 'Default Weapon Finesse',
    category: 'combat',
    description: 'All characters automatically gain Weapon Finesse (use DEX for melee attacks with light weapons).',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'pointBlankShotDefault',
    name: 'Default Point Blank Shot',
    category: 'combat',
    description: 'All characters automatically gain Point Blank Shot.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'powerAttackDefault',
    name: 'Default Power Attack',
    category: 'combat',
    description: 'All characters automatically gain Power Attack.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'preciseShotDefault',
    name: 'Default Precise Shot',
    category: 'combat',
    description: 'All characters automatically gain Precise Shot.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'dodgeDefault',
    name: 'Default Dodge',
    category: 'combat',
    description: 'All characters automatically gain the Dodge feat.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },

  // ─── TALENTS ────────────────────────────────────────────────────────────────

  {
    key: 'groupDeflectBlock',
    name: 'Group Block/Deflect Display',
    category: 'advancement',
    description: 'Display Block and Deflect talents grouped together in generators and talent trees.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },
  {
    key: 'talentTreeRestriction',
    name: 'Talent Tree Access Rules',
    category: 'advancement',
    description: 'Determines which talent trees are selectable. Current Class Only is RAW.',
    type: 'string',
    choices: {
      current: 'Current Class Only',
      all: 'Any Class With Levels',
      unrestricted: 'Unrestricted'
    },
    default: 'current',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'talentEveryLevel',
    name: 'Talent Every Level',
    category: 'advancement',
    description: 'Characters gain a talent at every level rather than only at odd levels.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'talentEveryLevelExtraL1',
    name: 'Talent Every Level - Extra at Level 1',
    category: 'advancement',
    description: 'When Talent Every Level is enabled, grant an extra bonus talent at character creation (Level 1 only).',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'talentDoubleLevels',
    name: 'Talent Double Level Option',
    category: 'advancement',
    description: 'Characters may choose to gain 2 talents at certain levels. Requires Talent Every Level.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'experimental'],
    presetVisible: false,
    config: true
  },
  {
    key: 'crossClassSkillTraining',
    name: 'Cross-Class Skill Training',
    category: 'advancement',
    description: 'Allow characters to train skills not listed as class skills.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'retrainingEnabled',
    name: 'Retraining System',
    category: 'advancement',
    description: 'Allow characters to retrain feats, skills, and talents between sessions.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: true,
    config: true
  },

  // ─── MULTICLASS ─────────────────────────────────────────────────────────────

  {
    key: 'multiclassBonusChoice',
    name: 'Multi-class Bonus Selection',
    category: 'advancement',
    description: 'Determines the bonus gained when taking a second base class. RAW default is a single starting feat.',
    type: 'string',
    choices: {
      single_feat: 'Single Starting Feat (RAW Default)',
      single_skill: 'Single Trained Skill (House Rule)',
      feat_or_skill: 'Feat OR Skill Choice (House Rule)',
      all_feats: 'All Starting Feats (House Rule)'
    },
    default: 'single_feat',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },

  // ─── ABILITY INCREASES ──────────────────────────────────────────────────────

  {
    key: 'abilityIncreaseMethod',
    name: 'Ability Increase Method',
    category: 'advancement',
    description: 'How ability score increases are applied at levels 4/8/12/16/20.',
    type: 'string',
    choices: {
      standard: 'Standard (1 to 2 attributes)',
      flexible: 'Flexible (2 to 1 or 1 to 2)'
    },
    default: 'flexible',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },

  // ─── ACTION ECONOMY ─────────────────────────────────────────────────────────

  {
    key: 'actionEconomyMode',
    name: 'Action Economy Enforcement Mode',
    category: 'combat',
    description: 'Controls how strictly the action economy is enforced. Strict = automation blocks invalid actions. Loose = warns but allows. None = no enforcement.',
    type: 'string',
    choices: {
      strict: 'Strict (Block Invalid Actions)',
      loose: 'Loose (Warn Only)',
      none: 'None (No Enforcement)'
    },
    default: 'loose',
    status: 'wired',
    tags: ['automation', 'requires-tokens'],
    presetVisible: true,
    config: true
  },

  // ─── SPACE COMBAT ───────────────────────────────────────────────────────────

  {
    key: 'spaceInitiativeSystem',
    name: 'Space Combat Initiative',
    category: 'vehicles',
    description: 'Determines whether initiative in space combat is per-person or per-ship.',
    type: 'string',
    choices: {
      individual: 'Individual (Standard)',
      shipBased: 'Ship-Based (Crew + Role Priority)'
    },
    default: 'individual',
    status: 'wired',
    tags: ['RAW', 'house-rule'],
    presetVisible: true,
    config: true
  },
  {
    key: 'initiativeRolePriority',
    name: 'Ship Role Priority Order',
    category: 'vehicles',
    description: 'Defines the order of crew actions during ship-based initiative.',
    type: 'array',
    choices: null,
    default: ['pilot', 'shields', 'weapons', 'engineering', 'other'],
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: false
  },
  {
    key: 'weaponsOperatorsRollInit',
    name: 'Weapons Operators Roll Initiative',
    category: 'vehicles',
    description: 'Weapons operators roll their own initiative when multiple people man weapons positions.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },

  // ─── EXPERIENCE ─────────────────────────────────────────────────────────────

  {
    key: 'enableExperienceSystem',
    name: 'Enable Experience System',
    category: 'advancement',
    description: 'Enable XP tracking. When disabled, the XP panel is hidden from all sheets.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },

  // ─── PRESET TRACKING ────────────────────────────────────────────────────────

  {
    key: 'houserulePreset',
    name: 'Active Houlerule Preset',
    category: 'presets',
    description: 'The identifier of the currently active preset configuration.',
    type: 'string',
    choices: null,
    default: 'standard',
    status: 'partial',
    tags: [],
    presetVisible: false,
    config: false
  },

  // ─── GRAPPLE ────────────────────────────────────────────────────────────────

  {
    key: 'grappleEnabled',
    name: 'Enable Grapple',
    category: 'combat',
    description: 'Enables specialized grapple mechanics in combat.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'grappleVariant',
    name: 'Grapple Variant',
    category: 'combat',
    description: 'Chooses the grapple rule variant.',
    type: 'string',
    choices: {
      standard: 'Standard SWSE',
      simplified: 'Simplified',
      opposed: 'Opposed Check'
    },
    default: 'standard',
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'grappleDCBonus',
    name: 'Grapple DC Bonus per BAB',
    category: 'combat',
    description: 'The grapple escape DC increases by this amount per point of opponent BAB.',
    type: 'number',
    choices: null,
    default: 1,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },

  // ─── RECOVERY & HEALING ─────────────────────────────────────────────────────

  {
    key: 'recoveryEnabled',
    name: 'Enable Recovery & Healing',
    category: 'recovery',
    description: 'Enables specialized recovery mechanics during rest.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'recoveryHPType',
    name: 'Recovery HP Amount',
    category: 'recovery',
    description: 'How much HP is recovered per rest period.',
    type: 'string',
    choices: {
      standard: 'Standard (Class Hit Die)',
      slow: 'Slow (Half Hit Die)',
      fast: 'Fast (Full Hit Die + CON)',
      custom: 'Custom Amount'
    },
    default: 'standard',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'customRecoveryHP',
    name: 'Custom Recovery HP',
    category: 'recovery',
    description: 'Fixed HP recovered per rest. Only active when Recovery HP Amount = Custom.',
    type: 'number',
    choices: null,
    default: 5,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'recoveryVitality',
    name: 'Recover Vitality Points',
    category: 'recovery',
    description: 'Also recover Vitality Points on rest.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'recoveryVitalityAmount',
    name: 'Vitality Recovery Amount',
    category: 'recovery',
    description: 'How many Vitality Points are recovered per rest.',
    type: 'number',
    choices: null,
    default: 5,
    status: 'partial',
    tags: ['automation', 'partial'],
    presetVisible: false,
    config: true
  },
  {
    key: 'recoveryTiming',
    name: 'Recovery Timing',
    category: 'recovery',
    description: 'When recovery applies during rest periods.',
    type: 'string',
    choices: {
      afterRest: 'After Extended Rest Only',
      perDay: 'Once Per Day',
      both: 'After Rest + Additional Daily'
    },
    default: 'afterRest',
    status: 'partial',
    tags: ['automation', 'partial'],
    presetVisible: false,
    config: true
  },
  {
    key: 'recoveryRequiresFullRest',
    name: 'Recovery Requires Full Rest',
    category: 'recovery',
    description: 'Must be a full night rest (8 hours) instead of a short rest.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },

  // ─── CONDITION TRACK ────────────────────────────────────────────────────────

  {
    key: 'conditionTrackEnabled',
    name: 'Enable Enhanced Condition Track',
    category: 'combat',
    description: 'Enables advanced condition track mechanics.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'conditionTrackStartDamage',
    name: 'Condition Track Start Damage',
    category: 'combat',
    description: 'Damage threshold before condition track penalties begin to apply.',
    type: 'number',
    choices: null,
    default: 0,
    status: 'partial',
    tags: ['automation', 'partial'],
    presetVisible: false,
    config: true
  },
  {
    key: 'conditionTrackProgression',
    name: 'Condition Track Step Damage',
    category: 'combat',
    description: 'HP damage needed to advance one condition track step.',
    type: 'number',
    choices: null,
    default: 5,
    status: 'partial',
    tags: ['automation', 'partial'],
    presetVisible: false,
    config: true
  },
  {
    key: 'conditionTrackVariant',
    name: 'Condition Track Variant',
    category: 'combat',
    description: 'Chooses the condition track rule set.',
    type: 'string',
    choices: {
      swseStandard: 'SWSE Standard (Default)',
      simplified: 'Simplified 4-Step',
      criticalConditions: 'Critical Conditions Enhanced'
    },
    default: 'swseStandard',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'conditionTrackAutoApply',
    name: 'Auto-Apply Condition Effects',
    category: 'combat',
    description: 'Automatically apply status effects when the condition track advances.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['automation', 'requires-tokens'],
    presetVisible: false,
    config: true
  },

  // ─── FLANKING ───────────────────────────────────────────────────────────────

  {
    key: 'flankingEnabled',
    name: 'Enable Flanking',
    category: 'combat',
    description: 'Enables flanking bonuses in combat.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation', 'requires-tokens'],
    presetVisible: true,
    config: true
  },
  {
    key: 'flankingBonus',
    name: 'Flanking Bonus Type',
    category: 'combat',
    description: 'The benefit provided by flanking.',
    type: 'string',
    choices: {
      plusTwo: '+2 Attack Bonus',
      plusThree: '+3 Attack Bonus',
      halfDamageReduction: 'Half Damage Reduction',
      acBonus: '+1 AC Penalty'
    },
    default: 'plusTwo',
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'flankingRequiresConsciousness',
    name: 'Flanking Requires Consciousness',
    category: 'combat',
    description: 'The flanking ally must be conscious and aware to provide the flanking benefit.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['RAW', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'flankingLargeCreatures',
    name: 'Flanking Large Creatures',
    category: 'combat',
    description: 'Controls whether large creatures can be flanked.',
    type: 'string',
    choices: {
      all: 'All Creatures',
      sameSizeOnly: 'Same Size Only',
      mediumOrSmaller: 'Medium or Smaller'
    },
    default: 'all',
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'flankingDiagonalCounts',
    name: 'Diagonal Adjacency Counts',
    category: 'combat',
    description: 'Diagonally adjacent allies can provide flanking.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },

  // ─── SKILL TRAINING ─────────────────────────────────────────────────────────

  {
    key: 'skillTrainingEnabled',
    name: 'Enable Training-Based Skill Advancement',
    category: 'skills',
    description: 'Allows skills to improve through earned training points.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'trainingPointsPerLevel',
    name: 'Training Points Per Level',
    category: 'skills',
    description: 'How many training points characters gain each level.',
    type: 'string',
    choices: {
      two: '2 Points',
      three: '3 Points',
      standard: 'Standard (5 + INT mod)'
    },
    default: 'three',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'trainingPointsPerRest',
    name: 'Training Points Per Rest',
    category: 'skills',
    description: 'Bonus training points awarded for downtime or extended rest.',
    type: 'number',
    choices: null,
    default: 0,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'skillTrainingCap',
    name: 'Training Cap Per Skill',
    category: 'skills',
    description: 'Maximum training points that can be spent on a single skill.',
    type: 'string',
    choices: {
      none: 'Unlimited',
      classSkillOnly: 'Class Skills Only',
      maxLevel: 'Max Equal to Character Level'
    },
    default: 'none',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'trainingCostScale',
    name: 'Training Cost Scale',
    category: 'skills',
    description: 'How expensive it is to spend training points.',
    type: 'string',
    choices: {
      linear: 'Linear (1 point = +1)',
      exponential: 'Exponential (Costs increase)',
      byDC: 'By Skill DC'
    },
    default: 'linear',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'trainingRequiresTrainer',
    name: 'Training Requires Trainer',
    category: 'skills',
    description: 'Characters need an NPC trainer to spend training points.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule'],
    presetVisible: false,
    config: true
  },

  // ─── STATUS EFFECTS ─────────────────────────────────────────────────────────

  {
    key: 'statusEffectsEnabled',
    name: 'Enable Status Effects',
    category: 'combat',
    description: 'Enables the condition/status effect tracking system.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'statusEffectsList',
    name: 'Status Effects List',
    category: 'combat',
    description: 'Which set of status effects is available in your campaign.',
    type: 'string',
    choices: {
      combatConditions: 'Combat Conditions',
      expanded: 'Expanded Status Effects',
      custom: 'Custom List'
    },
    default: 'combatConditions',
    status: 'partial',
    tags: ['automation', 'partial'],
    presetVisible: false,
    config: true
  },
  {
    key: 'autoApplyFromConditionTrack',
    name: 'Auto-Apply from Condition Track',
    category: 'combat',
    description: 'Condition track automatically applies matching status effects.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['automation', 'requires-tokens'],
    presetVisible: false,
    config: true
  },
  {
    key: 'statusEffectDurationTracking',
    name: 'Status Effect Duration Tracking',
    category: 'combat',
    description: 'How long status effects last before automatic removal.',
    type: 'string',
    choices: {
      rounds: 'Rounds (Combat)',
      scenes: 'Scenes',
      manual: 'Manual Removal Only'
    },
    default: 'manual',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'autoRemoveOnRest',
    name: 'Auto-Remove Effects on Rest',
    category: 'combat',
    description: 'Automatically remove temporary status effects when characters rest.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },

  // ─── HEALING SKILL ──────────────────────────────────────────────────────────

  {
    key: 'healingSkillEnabled',
    name: 'Enable Healing Skill Integration',
    category: 'recovery',
    description: 'Enables Treat Injury skill checks to provide direct HP recovery.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'firstAidEnabled',
    name: 'Allow First Aid (DC 15)',
    category: 'recovery',
    description: 'Enables First Aid as a Full-Round Action requiring a Medpac.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'firstAidHealingType',
    name: 'First Aid Healing Formula',
    category: 'recovery',
    description: 'How much HP First Aid restores.',
    type: 'string',
    choices: {
      levelOnly: 'Character Level',
      levelPlusDC: 'Character Level + (Check - DC)',
      fixed: 'Fixed Amount'
    },
    default: 'levelPlusDC',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'firstAidFixedAmount',
    name: 'First Aid Fixed Healing',
    category: 'recovery',
    description: 'HP restored by First Aid when Fixed Amount formula is selected.',
    type: 'number',
    choices: null,
    default: 10,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'longTermCareEnabled',
    name: 'Allow Long-Term Care',
    category: 'recovery',
    description: 'Enables 8-hour healing care treatment.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'longTermCareHealing',
    name: 'Long-Term Care Healing',
    category: 'recovery',
    description: 'How much HP Long-Term Care heals.',
    type: 'string',
    choices: {
      characterLevel: 'Character Level',
      conBonus: 'CON Bonus per Level',
      fixed: 'Fixed Amount'
    },
    default: 'characterLevel',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'longTermCareFixedAmount',
    name: 'Long-Term Care Fixed Healing',
    category: 'recovery',
    description: 'HP healed by Long-Term Care when Fixed Amount is selected.',
    type: 'number',
    choices: null,
    default: 5,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'longTermCareMultipleTargets',
    name: 'Long-Term Care Max Simultaneous Targets',
    category: 'recovery',
    description: 'Maximum number of creatures that can receive Long-Term Care at the same time.',
    type: 'number',
    choices: { 1: '1 (Untrained Only)', 6: '6 (Trained)' },
    default: 1,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'performSurgeryEnabled',
    name: 'Allow Perform Surgery (DC 20)',
    category: 'recovery',
    description: 'Enables Surgery: requires 1 hour, Surgery Kit, and trained Treat Injury.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'performSurgeryHealing',
    name: 'Surgery Healing Formula',
    category: 'recovery',
    description: 'How much damage Surgery removes.',
    type: 'string',
    choices: {
      conBonus: 'CON Bonus × Level',
      fixed: 'Fixed Amount',
      automatic: 'Fully Heal'
    },
    default: 'conBonus',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'performSurgeryFixedAmount',
    name: 'Surgery Fixed Healing',
    category: 'recovery',
    description: 'HP healed by Surgery when Fixed Amount formula is selected.',
    type: 'number',
    choices: null,
    default: 20,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'surgeryFailureDamage',
    name: 'Damage on Surgery Failure',
    category: 'recovery',
    description: 'The creature takes Damage Threshold worth of damage on a failed Surgery check.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['RAW', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'revivifyEnabled',
    name: 'Allow Revivify (DC 25)',
    category: 'recovery',
    description: 'Allows a trained healer to revive a dying creature within a short window after death.',
    type: 'boolean',
    choices: null,
    default: true,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'revivifyWindow',
    name: 'Revivify Time Window',
    category: 'recovery',
    description: 'How many rounds after death Revivify can still be attempted. ⚠ Experimental: this setting is registered but the round-count enforcement mechanic is not yet implemented.',
    type: 'number',
    choices: null,
    default: 1,
    status: 'unwired',
    tags: ['automation', 'experimental'],
    presetVisible: false,
    config: true
  },
  {
    key: 'criticalCareEnabled',
    name: 'Allow Critical Care (DC 20)',
    category: 'recovery',
    description: 'Enables repeated Medpac use within 24 hours (trained healer, with escalating penalties).',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'criticalCareHealing',
    name: 'Critical Care Healing Formula',
    category: 'recovery',
    description: 'How much Critical Care heals.',
    type: 'string',
    choices: {
      levelPlusDC: 'Level + (Check - DC)',
      fixed: 'Fixed Amount'
    },
    default: 'levelPlusDC',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'criticalCareFixedAmount',
    name: 'Critical Care Fixed Healing',
    category: 'recovery',
    description: 'HP healed by Critical Care when Fixed Amount formula is selected.',
    type: 'number',
    choices: null,
    default: 15,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },

  // ─── RESTRICTIONS ───────────────────────────────────────────────────────────

  {
    key: 'bannedSpecies',
    name: 'Banned Species/Races',
    category: 'characterCreation',
    description: 'Comma-separated list of species that players cannot select during character creation. GMs may always select any species.',
    type: 'string',
    choices: null,
    default: '',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },

  // ─── MASSIVE DAMAGE ─────────────────────────────────────────────────────────

  {
    key: 'enableEnhancedMassiveDamage',
    name: 'Enable Enhanced Massive Damage',
    category: 'combat',
    description: 'Master toggle for the Enhanced Massive Damage module. All threshold-related rules require this enabled.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'persistentDTPenalty',
    name: 'Persistent Damage Threshold Penalty',
    category: 'combat',
    description: 'When a single attack exceeds Damage Threshold, apply a persistent CT penalty that requires medical treatment to remove.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'persistentDTPenaltyCap',
    name: 'Persistent CT Penalty Cap',
    category: 'combat',
    description: 'Maximum persistent CT penalty steps that can accumulate.',
    type: 'number',
    choices: null,
    default: 3,
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'doubleThresholdPenalty',
    name: 'Double Threshold Penalty',
    category: 'combat',
    description: 'When damage ≥ 2× Damage Threshold, apply −2 CT steps instead of −1.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'stunThresholdRule',
    name: 'Stun Damage Threshold Variant',
    category: 'combat',
    description: 'Stun damage ≥ DT moves −2 CT. Stun damage ≥ 2× DT causes immediate unconsciousness.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'eliminateInstantDeath',
    name: 'Eliminate Instant Death',
    category: 'combat',
    description: 'Instead of instant death from HP overflow, target drops to 0 HP and the bottom of the CT. Good for heroic campaigns.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'modifyDamageThresholdFormula',
    name: 'Modify Damage Threshold Formula',
    category: 'combat',
    description: 'Overrides the RAW DT formula with an enhanced version that includes heroic level and size modifier.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'damageThresholdFormulaType',
    name: 'Damage Threshold Formula Type',
    category: 'combat',
    description: 'Which enhanced DT formula to use when Modify DT Formula is enabled.',
    type: 'string',
    choices: {
      fullLevel: 'Full Heroic Level',
      halfLevel: 'Half Heroic Level (rounded down)'
    },
    default: 'fullLevel',
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: true
  },

  // ─── FORCE / VEHICLE SPECIALS ────────────────────────────────────────────────

  {
    key: 'limitMoveObjectDamage',
    name: 'Limit Move Object Damage',
    category: 'force',
    description: 'Override Move Object force power damage rules. ⚠ Experimental: registered but the damage-override mechanic is not yet implemented.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'unwired',
    tags: ['house-rule', 'experimental'],
    presetVisible: false,
    config: true
  },
  {
    key: 'enableGlancingHit',
    name: 'Enable Glancing Hit Rule',
    category: 'combat',
    description: 'When an attack hits by margin ≤ 1, damage is halved. CT penalty only applies if halved damage still ≥ DT.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'enableLastGrasp',
    name: 'Enable Last Grasp',
    category: 'vehicles',
    description: 'When a vehicle is reduced to 0 HP, a PC pilot with Force Points can spend one to take a final Standard Action.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'enableEmergencyPatch',
    name: 'Enable Emergency Patch',
    category: 'vehicles',
    description: 'During engineer phase, spend a Force Point and make DC 20 Mechanics to downgrade one subsystem damage tier. Once per encounter per vehicle.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'enableSubsystemRepairCost',
    name: 'Enable Subsystem Repair Cost',
    category: 'vehicles',
    description: 'Repairing subsystems outside combat costs 15% of vehicle base cost per tier repaired.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },

  // ─── VEHICLE SYSTEMS ────────────────────────────────────────────────────────

  {
    key: 'enableScaleEngine',
    name: 'Enable Scale Engine',
    category: 'vehicles',
    description: 'Enables character/starship scale conversions for distance, speed, and damage.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'enableSWES',
    name: 'Enable Subsystem Engine (SWES)',
    category: 'vehicles',
    description: 'Vehicles have individually damageable subsystems. Subsystem damage escalates when DT is exceeded.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation', 'experimental'],
    presetVisible: true,
    config: true
  },
  {
    key: 'enableEnhancedShields',
    name: 'Enable Enhanced Shields',
    category: 'vehicles',
    description: 'Directional shield management with four zones (fore/aft/port/starboard).',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation', 'experimental'],
    presetVisible: true,
    config: true
  },
  {
    key: 'enableEnhancedEngineer',
    name: 'Enable Enhanced Engineer',
    category: 'vehicles',
    description: 'Power allocation system for vehicles. Engineers distribute a power budget across weapons, shields, and engines.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation', 'experimental'],
    presetVisible: true,
    config: true
  },
  {
    key: 'enableEnhancedPilot',
    name: 'Enable Enhanced Pilot',
    category: 'vehicles',
    description: 'Pilot maneuver system including Evasive Action, Attack Run, All-Out Movement, and Trick Maneuver.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation', 'experimental'],
    presetVisible: true,
    config: true
  },
  {
    key: 'enableEnhancedCommander',
    name: 'Enable Enhanced Commander',
    category: 'vehicles',
    description: 'Commander tactical orders including Coordinate Fire, Inspire Crew, Tactical Advantage, and Battle Analysis.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation', 'experimental'],
    presetVisible: true,
    config: true
  },
  {
    key: 'enableVehicleTurnController',
    name: 'Enable Vehicle Turn Controller',
    category: 'vehicles',
    description: 'Phase-based crew action sequencing for vehicle combat turns.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation', 'experimental'],
    presetVisible: true,
    config: true
  },

  // ─── SKILL PROGRESSION ──────────────────────────────────────────────────────

  {
    key: 'skillProgressionMode',
    name: 'Skill Progression Mode',
    category: 'skills',
    description: 'Standard SWSE trained/untrained model or 3.5-style rank-based skill progression.',
    type: 'string',
    choices: {
      swse_standard: 'Standard SWSE (trained/untrained)',
      ranked_35_style: '3.5-Style Ranked Skills'
    },
    default: 'swse_standard',
    status: 'wired',
    tags: ['RAW', 'house-rule', 'automation'],
    presetVisible: true,
    config: true
  },
  {
    key: 'skillRankClassSkillPolicy',
    name: 'Class Skill Eligibility Policy',
    category: 'skills',
    description: 'Determines which skills count as class skills for rank spending cost.',
    type: 'string',
    choices: {
      current_class_plus_backgrounds: 'Current Level Class + Backgrounds (Recommended)',
      union_any_class: 'Any Class Ever Taken (Partial)',
      backgrounds_only: 'Backgrounds Only (Partial)'
    },
    default: 'current_class_plus_backgrounds',
    status: 'partial',
    tags: ['automation', 'partial'],
    presetVisible: false,
    config: true
  },
  {
    key: 'prestigeClassSkillPolicy',
    name: 'Prestige Class Skill Inheritance',
    category: 'skills',
    description: 'Controls how prestige classes determine class skill lists and skill point grants.',
    type: 'string',
    choices: {
      inherit_entry_tree_class: 'Inherit from Entry Talent Tree\'s Core Class (Recommended)',
      inherit_entry_class: 'Inherit from Entry Class (Partial)',
      inherit_best_heroic_class: 'Inherit Best Heroic Class (Partial)',
      no_new_class_skills: 'No New Class Skills on Prestige (Partial)'
    },
    default: 'inherit_entry_tree_class',
    status: 'partial',
    tags: ['automation', 'partial'],
    presetVisible: false,
    config: true
  },
  {
    key: 'disableHalfLevelSkillBonus',
    name: 'Disable Half-Level Skill Bonus',
    category: 'skills',
    description: 'When enabled, removes the universal +½ heroic level contribution from all skill checks.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: true,
    config: true
  },

  // ─── ORPHAN / SETTINGS SETTINGS ─────────────────────────────────────────────
  // These are registered in scripts/settings/house-rules.js

  {
    key: 'enableFollowerBackgrounds',
    name: 'Enable Follower Backgrounds',
    category: 'characterCreation',
    description: 'Followers can select from available backgrounds during creation.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'enableDarkSideTreeAccess',
    name: 'Dark Side Prestige Access to Lightsaber Trees',
    category: 'force',
    description: 'Sith Apprentice and Sith Lord gain automatic access to Lightsaber Combat and Lightsaber Forms talent trees.',
    type: 'boolean',
    choices: null,
    default: false,
    status: 'wired',
    tags: ['house-rule', 'automation'],
    presetVisible: false,
    config: true
  },
  {
    key: 'classTreeOverrides',
    name: 'Class Tree Access Overrides',
    category: 'advancement',
    description: 'Programmatic overrides for class → talent tree access. Format: { "classId": ["treeId1", "treeId2"] }.',
    type: 'object',
    choices: null,
    default: {},
    status: 'wired',
    tags: ['automation'],
    presetVisible: false,
    config: false
  }
];

/* ============================================================================ */
/*                         VALIDATION UTILITY                                   */
/* ============================================================================ */

/**
 * Build a quick lookup map of manifest entries by key.
 * @returns {Map<string, object>}
 */
export function buildManifestIndex() {
  const index = new Map();
  for (const entry of HOUSERULE_MANIFEST) {
    index.set(entry.key, entry);
  }
  return index;
}

/**
 * Validate the manifest against the live Foundry settings registry.
 * Safe to call at any time; logs warnings to console only.
 *
 * Usage:
 *   import { validateHouseruleManifest } from '.../houserules-manifest.js';
 *   validateHouseruleManifest();
 *
 * Or from the browser console:
 *   game.swse?.houserules?.audit?.();
 *
 * @returns {{ errors: string[], warnings: string[], ok: boolean }}
 */
export function validateHouleruleManifest() {
  const errors = [];
  const warnings = [];
  const NS = 'foundryvtt-swse';

  if (!game?.settings?.settings) {
    warnings.push('validateHouleruleManifest: Foundry settings not ready, skipping validation.');
    return { errors, warnings, ok: true };
  }

  const registeredKeys = new Set(
    [...game.settings.settings.keys()]
      .filter(k => k.startsWith(`${NS}.`))
      .map(k => k.slice(NS.length + 1))
  );

  // 1. Check each manifest entry is registered
  for (const entry of HOULERULE_MANIFEST) {
    if (!registeredKeys.has(entry.key)) {
      errors.push(`[manifest] Key "${entry.key}" is in the manifest but NOT registered in game.settings.`);
    }
  }

  // 2. Check registered SWSE settings have a manifest entry
  const manifestKeys = new Set(HOULERULE_MANIFEST.map(e => e.key));
  const ignoredKeys = new Set([
    // Internal or non-houlerule settings that live in the same namespace
    'debugMode', 'enableSuiteTrace', 'enableSuggestionTrace',
    'governanceVisibilityMode', 'metaTuningConfig', 'systemVersion',
    'automaticSalePercentage', 'storeDiscount', 'storeMarkup',
    'startingCreditMode', 'resetResourcesOnCombat', 'prestigeClassLevelThreshold'
  ]);

  for (const key of registeredKeys) {
    if (!manifestKeys.has(key) && !ignoredKeys.has(key)) {
      warnings.push(`[manifest] Registered setting "${key}" has no manifest entry. Consider adding it.`);
    }
  }

  // 3. Warn about unwired/partial settings
  for (const entry of HOULERULE_MANIFEST) {
    if (entry.status === 'unwired') {
      warnings.push(`[wiring] "${entry.key}" (${entry.name}) is registered but not wired to any mechanic.`);
    } else if (entry.status === 'partial') {
      warnings.push(`[wiring] "${entry.key}" (${entry.name}) is partially wired — mechanic has gaps.`);
    }
  }

  // 4. Check preset values
  try {
    const presetsModule = globalThis._swseManifestPresetsCache;
    if (presetsModule?.HOULERULE_PRESETS) {
      for (const [presetId, preset] of Object.entries(presetsModule.HOULERULE_PRESETS)) {
        for (const key of Object.keys(preset.settings ?? {})) {
          if (!registeredKeys.has(key)) {
            errors.push(`[preset:${presetId}] Key "${key}" is in preset but NOT registered in game.settings.`);
          }
        }
      }
    }
  } catch (_) {
    // preset validation is best-effort
  }

  // Report
  const ok = errors.length === 0;

  if (errors.length > 0) {
    console.error('SWSE Houlerule Manifest — ERRORS:', errors);
  }
  if (warnings.length > 0) {
    console.warn('SWSE Houlerule Manifest — WARNINGS:', warnings);
  }
  if (ok && warnings.length === 0) {
    console.info('SWSE Houlerule Manifest — ✓ All settings valid.');
  }

  return { errors, warnings, ok };
}

// Re-export alias so existing HOULERULE_MANIFEST references still work
export { HOULERULE_MANIFEST as HOUSERULE_MANIFEST };
