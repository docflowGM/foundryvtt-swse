/**
 * CHARACTER DATA ANALYSIS
 *
 * Shows exactly what the suggestion engine reads from character actors:
 * - Full ability score breakdowns
 * - BAB/Defense calculations
 * - Class mechanics
 * - Item/feat/talent registry
 * - Prestige affinity inference
 * - Mechanical bias computation
 *
 * This is what will be passed to _computeIdentityProjectionScore(),
 * _computeAffinityAlignment(), and scoreCandidate()
 */

// ─────────────────────────────────────────────────────────────────
// MECHANICAL CALCULATIONS
// ─────────────────────────────────────────────────────────────────

class MechanicsCalculator {
  /**
   * Calculate ability modifier from ability score
   */
  static getModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Calculate BAB from character data
   */
  static calculateBAB(level, progressionType = 'moderate') {
    const progressions = {
      fast: Math.floor((level * 1) / 1),      // +1 per level (e.g., Jedi)
      moderate: Math.floor((level * 3) / 4),  // +3/4 per level (Soldier, Scoundrel)
      slow: Math.floor((level * 1) / 2)       // +1/2 per level (Commoner)
    };
    return progressions[progressionType] || progressions.moderate;
  }

  /**
   * Calculate Defense from armor + dex mod + misc bonuses
   */
  static calculateDefense(armorBonus, dexMod, miscBonus = 0) {
    return 10 + armorBonus + dexMod + miscBonus;
  }

  /**
   * Determine prestige affinities from class progression
   */
  static inferPrestigeAffinities(classes) {
    const prestigeMap = {
      'Jedi': [
        { prestige: 'Jedi Master', confidence: 0.95, synergy: classes.includes('Soldier') ? 0.70 : 1.0 },
        { prestige: 'Sith Lord', confidence: 0.70, synergy: 0.85 },
        { prestige: 'Jedi Knight', confidence: 0.60, synergy: 0.80 }
      ],
      'Soldier': [
        { prestige: 'Weapon Master', confidence: 0.95, synergy: 1.0 },
        { prestige: 'Master of Arms', confidence: 0.85, synergy: 1.0 },
        { prestige: 'Armored Jedi', confidence: 0.60, synergy: classes.includes('Jedi') ? 0.85 : 0.4 }
      ],
      'Scout': [
        { prestige: 'Ace Pilot', confidence: 0.90, synergy: 1.0 },
        { prestige: 'Gunslinger', confidence: 0.80, synergy: classes.includes('Scoundrel') ? 0.95 : 0.7 },
        { prestige: 'Force Scout', confidence: 0.50, synergy: classes.includes('Jedi') ? 0.85 : 0.1 }
      ],
      'Scoundrel': [
        { prestige: 'Scoundrel Leader', confidence: 0.90, synergy: classes.includes('Noble') ? 0.95 : 0.8 },
        { prestige: 'Assassin', confidence: 0.75, synergy: 1.0 },
        { prestige: 'Crime Lord', confidence: 0.60, synergy: 0.85 }
      ],
      'Noble': [
        { prestige: 'Officer', confidence: 0.95, synergy: 1.0 },
        { prestige: 'Senator', confidence: 0.80, synergy: 0.9 },
        { prestige: 'Crime Lord', confidence: 0.50, synergy: classes.includes('Scoundrel') ? 0.9 : 0.2 }
      ]
    };

    const affinities = [];
    for (const cls of classes) {
      if (prestigeMap[cls]) {
        affinities.push(...prestigeMap[cls]);
      }
    }

    // Deduplicate and sort by confidence
    const unique = {};
    affinities.forEach(aff => {
      if (!unique[aff.prestige] || aff.confidence > unique[aff.prestige].confidence) {
        unique[aff.prestige] = aff;
      }
    });

    return Object.values(unique).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Compute mechanical bias from archetype and class combo
   */
  static computeMechanicalBias(archetype, primaryAbility, classes) {
    const bias = {};

    // Theme affinity based on archetype
    if (archetype.id === 'guardian-defender') {
      bias.lightsaber = 0.85;
      bias.force = 0.75;
      bias.defense = 0.80;
      bias.melee = 0.90;
    } else if (archetype.id === 'noble-diplomat') {
      bias.leadership = 0.90;
      bias.influence = 0.85;
      bias.negotiation = 0.80;
      bias.charisma = 0.95;
    } else if (archetype.id === 'soldier-weapon-master') {
      bias.melee = 0.95;
      bias['multiple-attacks'] = 0.85;
      bias.strength = 0.90;
      bias.weapons = 0.92;
    } else if (archetype.id === 'scout-ace-pilot') {
      bias.flight = 0.90;
      bias.pilot = 0.88;
      bias.vehicle = 0.85;
      bias.dexterity = 0.85;
    }

    // Role affinity based on classes
    bias.roles = {};
    if (classes.includes('Jedi')) {
      bias.roles.warrior = 0.90;
      bias.roles.protector = 0.85;
    }
    if (classes.includes('Soldier')) {
      bias.roles.warrior = 0.95;
      bias.roles.combatant = 0.90;
    }
    if (classes.includes('Noble')) {
      bias.roles.leader = 0.95;
      bias.roles.diplomat = 0.90;
    }
    if (classes.includes('Scout')) {
      bias.roles.scout = 0.95;
      bias.roles.pilot = 0.90;
    }

    return bias;
  }
}

// ─────────────────────────────────────────────────────────────────
// CHARACTER PROFILES WITH FULL MECHANICS
// ─────────────────────────────────────────────────────────────────

function buildCharacterProfile(characterName, data) {
  const profile = {
    name: characterName,
    level: data.level,
    classes: data.classes,
    experience: data.level * 1000, // Placeholder XP

    // ──────────────────────────────────────────────────────────────
    // ABILITY SCORES & MODIFIERS
    // ──────────────────────────────────────────────────────────────
    abilities: {
      str: { score: data.abilities.str, modifier: MechanicsCalculator.getModifier(data.abilities.str) },
      dex: { score: data.abilities.dex, modifier: MechanicsCalculator.getModifier(data.abilities.dex) },
      con: { score: data.abilities.con, modifier: MechanicsCalculator.getModifier(data.abilities.con) },
      int: { score: data.abilities.int, modifier: MechanicsCalculator.getModifier(data.abilities.int) },
      wis: { score: data.abilities.wis, modifier: MechanicsCalculator.getModifier(data.abilities.wis) },
      cha: { score: data.abilities.cha, modifier: MechanicsCalculator.getModifier(data.abilities.cha) }
    },

    primaryAbility: data.primaryAbility,
    primaryModifier: MechanicsCalculator.getModifier(data.abilities[data.primaryAbility]),

    // ──────────────────────────────────────────────────────────────
    // ATTACK & DEFENSE
    // ──────────────────────────────────────────────────────────────
    baseAttackBonus: {
      value: MechanicsCalculator.calculateBAB(data.level, data.babProgression || 'moderate'),
      progression: data.babProgression || 'moderate',
      breakdown: `${data.level} levels × ${data.babProgression === 'fast' ? '1.0' : data.babProgression === 'slow' ? '0.5' : '0.75'} = ${MechanicsCalculator.calculateBAB(data.level, data.babProgression || 'moderate')}`
    },

    defense: {
      base: 10,
      armorBonus: data.armor?.bonus || 0,
      dexModifier: MechanicsCalculator.getModifier(data.abilities.dex),
      miscBonus: data.defenseBonus || 0,
      total: MechanicsCalculator.calculateDefense(
        data.armor?.bonus || 0,
        MechanicsCalculator.getModifier(data.abilities.dex),
        data.defenseBonus || 0
      ),
      breakdown: `10 + ${data.armor?.bonus || 0} (armor) + ${MechanicsCalculator.getModifier(data.abilities.dex)} (DEX mod) + ${data.defenseBonus || 0} (misc) = ${MechanicsCalculator.calculateDefense(data.armor?.bonus || 0, MechanicsCalculator.getModifier(data.abilities.dex), data.defenseBonus || 0)}`
    },

    // ──────────────────────────────────────────────────────────────
    // HIT POINTS & RESOURCES
    // ──────────────────────────────────────────────────────────────
    hitPoints: {
      current: data.hitPoints || 0,
      max: data.hitPointsMax || 50 + (MechanicsCalculator.getModifier(data.abilities.con) * data.level),
      conModifier: MechanicsCalculator.getModifier(data.abilities.con)
    },

    // ──────────────────────────────────────────────────────────────
    // OWNED ITEMS & FEATS/TALENTS
    // ──────────────────────────────────────────────────────────────
    ownedItems: data.ownedItems || {},
    ownedFeats: data.ownedFeats || [],
    ownedTalents: data.ownedTalents || [],
    ownedSkills: data.ownedSkills || [],

    // ──────────────────────────────────────────────────────────────
    // PRESTIGE AFFINITIES (inferred from class combo)
    // ──────────────────────────────────────────────────────────────
    prestigeAffinities: MechanicsCalculator.inferPrestigeAffinities(data.classes),

    // ──────────────────────────────────────────────────────────────
    // ARCHETYPE & IDENTITY
    // ──────────────────────────────────────────────────────────────
    archetype: data.archetype,

    // ──────────────────────────────────────────────────────────────
    // MECHANICAL BIAS (what the engine looks for)
    // ──────────────────────────────────────────────────────────────
    mechanicalBias: MechanicsCalculator.computeMechanicalBias(
      data.archetype,
      data.primaryAbility,
      data.classes
    ),

    // ──────────────────────────────────────────────────────────────
    // AFFINITY INDEX (populated from item/feat/talent registry)
    // ──────────────────────────────────────────────────────────────
    affinityIndex: data.affinityIndex || {},
    maxFrequency: data.maxFrequency || 8,

    // ──────────────────────────────────────────────────────────────
    // RACE & PHYSICAL TRAITS
    // ──────────────────────────────────────────────────────────────
    race: data.race,
    raceTraits: data.raceTraits || [],

    // ──────────────────────────────────────────────────────────────
    // SKILL PROFICIENCIES
    // ──────────────────────────────────────────────────────────────
    skillProficiencies: data.skillProficiencies || {}
  };

  return profile;
}

// ─────────────────────────────────────────────────────────────────
// CHARACTER DATA & PROFILES
// ─────────────────────────────────────────────────────────────────

const ARCHETYPES = {
  'guardian-defender': {
    id: 'guardian-defender',
    name: 'Jedi Guardian - Defender',
    roles: ['warrior', 'protector']
  },
  'noble-diplomat': {
    id: 'noble-diplomat',
    name: 'Noble - Diplomat',
    roles: ['leader', 'diplomat']
  },
  'soldier-weapon-master': {
    id: 'soldier-weapon-master',
    name: 'Soldier - Weapon Master',
    roles: ['warrior']
  },
  'scout-ace-pilot': {
    id: 'scout-ace-pilot',
    name: 'Scout - Ace Pilot',
    roles: ['pilot', 'scout']
  }
};

const CHARACTER_1 = buildCharacterProfile('Human Jedi 3', {
  level: 3,
  classes: ['Jedi'],
  race: 'Human',
  primaryAbility: 'str',
  babProgression: 'moderate',
  archetype: ARCHETYPES['guardian-defender'],
  armor: { name: 'Light Robes', bonus: 2 },
  defenseBonus: 0,
  abilities: {
    str: 15,
    dex: 13,
    con: 14,
    int: 10,
    wis: 8,
    cha: 13
  },
  ownedItems: {
    'weapon-proficiency-lightsaber': true
  },
  ownedFeats: [],
  ownedTalents: [],
  ownedSkills: ['Acrobatics', 'Perception'],
  affinityIndex: {
    'weapon-focus-lightsaber': {
      frequency: 7,
      confidence: 0.875,
      roleAffinity: { warrior: 1.0, protector: 0.8 }
    },
    'combat-expertise': {
      frequency: 6,
      confidence: 0.75,
      roleAffinity: { warrior: 0.9, protector: 1.0 }
    },
    'block-force': {
      frequency: 8,
      confidence: 1.0,
      roleAffinity: { protector: 1.0, warrior: 0.5 }
    },
    'deflect': {
      frequency: 7,
      confidence: 0.875,
      roleAffinity: { protector: 1.0, warrior: 0.7 }
    }
  },
  maxFrequency: 8,
  skillProficiencies: {
    'Acrobatics': { trained: true, modifier: 1 },
    'Initiative': { trained: false, modifier: 1 },
    'Perception': { trained: true, modifier: -1 }
  }
});

const CHARACTER_2 = buildCharacterProfile('Twi\'lek Noble/Officer', {
  level: 7,
  classes: ['Noble', 'Scoundrel', 'Officer'],
  race: 'Twi\'lek',
  primaryAbility: 'cha',
  babProgression: 'moderate',
  archetype: ARCHETYPES['noble-diplomat'],
  armor: { name: 'Diplomat Outfit', bonus: 0 },
  defenseBonus: 2,
  abilities: {
    str: 6,
    dex: 13,
    con: 14,
    int: 14,
    wis: 10,
    cha: 22
  },
  ownedItems: {},
  ownedFeats: ['Skill Focus (Persuasion)'],
  ownedTalents: [],
  ownedSkills: ['Persuasion', 'Deception', 'Insight'],
  affinityIndex: {
    'skill-focus-persuasion': {
      frequency: 6,
      confidence: 1.0,
      roleAffinity: { leader: 1.0, diplomat: 1.0 }
    },
    'command-presence': {
      frequency: 6,
      confidence: 1.0,
      roleAffinity: { leader: 1.0, diplomat: 0.9 }
    },
    'grant-command-bonus': {
      frequency: 6,
      confidence: 1.0,
      roleAffinity: { leader: 1.0, diplomat: 0.8 }
    }
  },
  maxFrequency: 6,
  skillProficiencies: {
    'Persuasion': { trained: true, modifier: 6 },
    'Deception': { trained: true, modifier: 6 },
    'Insight': { trained: true, modifier: 0 }
  }
});

const CHARACTER_3 = buildCharacterProfile('Wookiee Melee Bruiser', {
  level: 7,
  classes: ['Soldier', 'Scout', 'Scoundrel', 'Jedi'],
  race: 'Wookiee',
  primaryAbility: 'str',
  babProgression: 'moderate',
  archetype: ARCHETYPES['soldier-weapon-master'],
  armor: { name: 'Combat Armor', bonus: 3 },
  defenseBonus: 0,
  abilities: {
    str: 26,
    dex: 10,
    con: 16,
    int: 14,
    wis: 10,
    cha: 6
  },
  ownedItems: {
    'double-attack': true
  },
  ownedFeats: ['Power Attack'],
  ownedTalents: [],
  ownedSkills: ['Athletics', 'Intimidation'],
  affinityIndex: {
    'weapon-focus-any': {
      frequency: 7,
      confidence: 1.0,
      roleAffinity: { warrior: 1.0 }
    },
    'power-attack': {
      frequency: 6,
      confidence: 0.857,
      roleAffinity: { warrior: 1.0 }
    },
    'double-attack': {
      frequency: 7,
      confidence: 1.0,
      roleAffinity: { warrior: 1.0 }
    },
    'triple-attack': {
      frequency: 5,
      confidence: 0.714,
      roleAffinity: { warrior: 1.0 }
    }
  },
  maxFrequency: 7,
  skillProficiencies: {
    'Athletics': { trained: true, modifier: 8 },
    'Intimidation': { trained: true, modifier: -2 },
    'Melee': { trained: true, modifier: 6 }
  }
});

const CHARACTER_4 = buildCharacterProfile('Duros Ace Pilot', {
  level: 19,
  classes: ['Scout', 'Ace Pilot'],
  race: 'Duros',
  primaryAbility: 'dex',
  babProgression: 'moderate',
  archetype: ARCHETYPES['scout-ace-pilot'],
  armor: { name: 'Flight Suit', bonus: 1 },
  defenseBonus: 1,
  abilities: {
    str: 10,
    dex: 30,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10
  },
  ownedItems: {},
  ownedFeats: ['Pilot Focus', 'Evasive Maneuvers'],
  ownedTalents: [],
  ownedSkills: ['Pilot', 'Perception', 'Acrobatics'],
  affinityIndex: {
    'pilot-focus': {
      frequency: 5,
      confidence: 1.0,
      roleAffinity: { pilot: 1.0, scout: 0.8 }
    },
    'evasive-maneuvers': {
      frequency: 5,
      confidence: 1.0,
      roleAffinity: { pilot: 1.0, scout: 0.9 }
    },
    'starship-dodge': {
      frequency: 5,
      confidence: 1.0,
      roleAffinity: { pilot: 1.0, scout: 0.8 }
    }
  },
  maxFrequency: 5,
  skillProficiencies: {
    'Pilot': { trained: true, modifier: 14 },
    'Perception': { trained: true, modifier: 10 },
    'Acrobatics': { trained: true, modifier: 10 }
  }
});

// ─────────────────────────────────────────────────────────────────
// DISPLAY UTILITY
// ─────────────────────────────────────────────────────────────────

function displayCharacterAnalysis(character) {
  console.log('\n' + '═'.repeat(80));
  console.log(`📊 CHARACTER FULL ANALYSIS: ${character.name}`);
  console.log('═'.repeat(80));

  console.log('\n┌─ IDENTITY SNAPSHOT ─────────────────────────────────────────────────────────┐');
  console.log(`│ Level: ${character.level} | Classes: ${character.classes.join(', ')}`);
  console.log(`│ Race: ${character.race} | Archetype: ${character.archetype.name}`);
  console.log(`│ Primary Ability: ${character.primaryAbility.toUpperCase()} (${character.abilities[character.primaryAbility].score})`);
  console.log('└' + '─'.repeat(78) + '┘');

  console.log('\n┌─ ABILITY SCORES & MODIFIERS ────────────────────────────────────────────────┐');
  const scores = character.abilities;
  console.log(`│ STR: ${String(scores.str.score).padStart(2)} (${String(scores.str.modifier).padStart(+2)}) │ DEX: ${String(scores.dex.score).padStart(2)} (${String(scores.dex.modifier).padStart(+2)}) │ CON: ${String(scores.con.score).padStart(2)} (${String(scores.con.modifier).padStart(+2)}) │`);
  console.log(`│ INT: ${String(scores.int.score).padStart(2)} (${String(scores.int.modifier).padStart(+2)}) │ WIS: ${String(scores.wis.score).padStart(2)} (${String(scores.wis.modifier).padStart(+2)}) │ CHA: ${String(scores.cha.score).padStart(2)} (${String(scores.cha.modifier).padStart(+2)}) │`);
  console.log('└' + '─'.repeat(78) + '┘');

  console.log('\n┌─ COMBAT MECHANICS ──────────────────────────────────────────────────────────┐');
  console.log(`│ BAB: +${character.baseAttackBonus.value}`);
  console.log(`│     ${character.baseAttackBonus.breakdown}`);
  console.log(`│`);
  console.log(`│ Defense: ${character.defense.total}`);
  console.log(`│     ${character.defense.breakdown}`);
  console.log(`│`);
  console.log(`│ HP: ${character.hitPoints.current}/${character.hitPoints.max} (CON mod: ${character.hitPoints.conModifier})`);
  console.log('└' + '─'.repeat(78) + '┘');

  console.log('\n┌─ PRESTIGE AFFINITIES (inferred) ────────────────────────────────────────────┐');
  character.prestigeAffinities.forEach((aff, idx) => {
    const bar = '█'.repeat(Math.round(aff.confidence * 20)) + '░'.repeat(20 - Math.round(aff.confidence * 20));
    console.log(`│ ${idx + 1}. ${aff.prestige.padEnd(30)} [${bar}] ${(aff.confidence * 100).toFixed(0)}%`);
  });
  console.log('└' + '─'.repeat(78) + '┘');

  console.log('\n┌─ OWNED ITEMS & FEATS ───────────────────────────────────────────────────────┐');
  const ownedCount = Object.keys(character.ownedItems).length + character.ownedFeats.length + character.ownedTalents.length;
  if (ownedCount === 0) {
    console.log('│ (none)');
  } else {
    Object.keys(character.ownedItems).forEach(item => {
      console.log(`│ ✓ ${item} (item/chain)`);
    });
    character.ownedFeats.forEach(feat => {
      console.log(`│ ✓ ${feat} (feat)`);
    });
    character.ownedTalents.forEach(talent => {
      console.log(`│ ✓ ${talent} (talent)`);
    });
  }
  console.log('└' + '─'.repeat(78) + '┘');

  console.log('\n┌─ MECHANICAL BIAS (what engine looks for) ───────────────────────────────────┐');
  console.log('│ Theme Affinities:');
  Object.entries(character.mechanicalBias).forEach(([theme, value]) => {
    if (typeof value === 'number') {
      const bar = '▓'.repeat(Math.round(value * 10)) + '░'.repeat(10 - Math.round(value * 10));
      console.log(`│   ${theme.padEnd(25)} [${bar}] ${(value * 100).toFixed(0)}%`);
    }
  });
  if (character.mechanicalBias.roles) {
    console.log('│ Role Affinities:');
    Object.entries(character.mechanicalBias.roles).forEach(([role, value]) => {
      const bar = '▓'.repeat(Math.round(value * 10)) + '░'.repeat(10 - Math.round(value * 10));
      console.log(`│   ${role.padEnd(25)} [${bar}] ${(value * 100).toFixed(0)}%`);
    });
  }
  console.log('└' + '─'.repeat(78) + '┘');

  console.log('\n┌─ AFFINITY INDEX (for suggestions) ──────────────────────────────────────────┐');
  console.log('│ Item → Frequency/Confidence/Roles');
  Object.entries(character.affinityIndex).slice(0, 5).forEach(([itemId, data]) => {
    const freq = `${data.frequency}/${character.maxFrequency}`;
    const conf = (data.confidence * 100).toFixed(0);
    const roles = Object.entries(data.roleAffinity || {})
      .map(([role, aff]) => `${role}:${(aff * 100).toFixed(0)}%`)
      .join(', ');
    console.log(`│ ${itemId.padEnd(30)} freq=${freq.padEnd(5)} conf=${conf}% roles={${roles}}`);
  });
  if (Object.keys(character.affinityIndex).length > 5) {
    console.log(`│ ... and ${Object.keys(character.affinityIndex).length - 5} more`);
  }
  console.log('└' + '─'.repeat(78) + '┘');

  console.log('\n┌─ SKILL PROFICIENCIES ───────────────────────────────────────────────────────┐');
  Object.entries(character.skillProficiencies).forEach(([skill, data]) => {
    const trained = data.trained ? '✓ trained' : '  untrained';
    console.log(`│ ${skill.padEnd(20)} ${trained} | modifier: ${String(data.modifier).padStart(2)}`);
  });
  console.log('└' + '─'.repeat(78) + '┘');
}

// ─────────────────────────────────────────────────────────────────
// EXECUTION
// ─────────────────────────────────────────────────────────────────

function runAnalysis() {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + '🔍 CHARACTER DATA ANALYSIS FOR SUGGESTION ENGINE' + ' '.repeat(18) + '║');
  console.log('║' + ' '.repeat(13) + 'What does the engine read from Foundry actors?' + ' '.repeat(20) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  displayCharacterAnalysis(CHARACTER_1);
  displayCharacterAnalysis(CHARACTER_2);
  displayCharacterAnalysis(CHARACTER_3);
  displayCharacterAnalysis(CHARACTER_4);

  // Summary table
  console.log('\n\n' + '═'.repeat(80));
  console.log('📋 QUICK REFERENCE TABLE');
  console.log('═'.repeat(80));

  const characters = [CHARACTER_1, CHARACTER_2, CHARACTER_3, CHARACTER_4];
  const rows = [
    ['Character', 'Level', 'Classes', 'BAB', 'DEF', 'HP', 'Primary', 'Top Prestige'],
    ['─'.repeat(20), '─'.repeat(5), '─'.repeat(20), '─'.repeat(4), '─'.repeat(4), '─'.repeat(8), '─'.repeat(8), '─'.repeat(20)]
  ];

  characters.forEach(char => {
    rows.push([
      char.name.substring(0, 20),
      String(char.level),
      char.classes.join('/').substring(0, 20),
      `+${char.baseAttackBonus.value}`,
      String(char.defense.total),
      `${char.hitPoints.current}/${char.hitPoints.max.toString().substring(0, 5)}`,
      char.primaryAbility.toUpperCase(),
      char.prestigeAffinities[0]?.prestige || 'None'
    ]);
  });

  rows.forEach(row => {
    console.log(
      row[0].padEnd(20) +
      row[1].padEnd(7) +
      row[2].padEnd(22) +
      row[3].padEnd(6) +
      row[4].padEnd(6) +
      row[5].padEnd(10) +
      row[6].padEnd(10) +
      row[7]
    );
  });

  console.log('═'.repeat(80));
  console.log('\n✅ CHARACTER PROFILES READY FOR SCORING ENGINE\n');
}

runAnalysis();
