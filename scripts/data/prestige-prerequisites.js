// ============================================
// FILE: scripts/data/prestige-prerequisites.js
// Prestige Class Prerequisites - Authoritative Data (Phase 5: Requirements Enriched)
// ============================================
//
// This module defines all prerequisites for prestige classes.
// Prerequisites are checked during level-up to determine which
// prestige classes are available to the character.
//
// PHASE 5 UPGRADE: Each entry now includes a `requirements` array of structured
// prerequisite records compatible with the Phase 2 normalizer and Phase 3 evaluator.
// Legacy fields (minLevel, minBAB, skills, feats, talents, ...) are FULLY PRESERVED.
// Callers that use legacy fields continue to work unchanged.
//
// requirements[].type values:
//   level, bab, skill, feat, force_sensitive, force_talent_count, talent_count,
//   talent, force_power, force_technique_count, dark_side, species, droid,
//   droid_systems, table_state, or
//
// For scoped feats (Skill Focus, Weapon Focus, Weapon Proficiency):
//   { type: 'feat', key, name, choice: { kind, key, name } }
//
// Tree entries in talent_count carry sourceId for stable TalentTreeDB resolution:
//   { key, name, sourceId }
//
// PHASE 2 UPGRADE: Each prestige class now includes a stable uuid field.
// This enables UUID-first resolution (see prerequisite-checker.js).
//
// UUID SCHEME:
// - Prestige classes: swse-prestige-<slug>
// - See uuid-map.js for complete UUID reference.
// ============================================

export const PRESTIGE_PREREQUISITES = {
    'Ace Pilot': {
        uuid: 'swse-prestige-ace-pilot',
        minLevel: 7,
        skills: ['Pilot'],
        feats: ['Vehicular Combat'],
        // Phase 5: structured requirements
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'pilot', name: 'Pilot', trained: true },
            { type: 'feat', key: 'vehicular-combat', name: 'Vehicular Combat' }
        ]
    },

    'Bounty Hunter': {
        uuid: 'swse-prestige-bounty-hunter',
        minLevel: 7,
        skills: ['Survival'],
        talents: {
            count: 2,
            trees: ['Awareness']
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'survival', name: 'Survival', trained: true },
            { type: 'talent_count', count: 2, trees: [
                { key: 'awareness', name: 'Awareness', sourceId: '1c48d1cd9ab1f5c8' }
            ]}
        ]
    },

    'Crime Lord': {
        uuid: 'swse-prestige-crime-lord',
        minLevel: 7,
        skills: ['Deception', 'Persuasion'],
        talents: {
            count: 1,
            trees: ['Fortune', 'Lineage', 'Misfortune']
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'deception', name: 'Deception', trained: true },
            { type: 'skill', key: 'persuasion', name: 'Persuasion', trained: true },
            { type: 'talent_count', count: 1, trees: [
                { key: 'fortune', name: 'Fortune', sourceId: 'cee9b9398682b7d0' },
                { key: 'lineage', name: 'Lineage', sourceId: 'b5bb4154688c66ab' },
                { key: 'misfortune', name: 'Misfortune', sourceId: '67b59e020c1660eb' }
            ]}
        ]
    },

    'Elite Trooper': {
        uuid: 'swse-prestige-elite-trooper',
        minBAB: 7,
        feats: ['Armor Proficiency (Medium)', 'Martial Arts I'],
        featsAny: ['Point-Blank Shot', 'Flurry'],
        talents: {
            count: 1,
            trees: ['Armor Specialist', 'Commando', 'Mercenary', 'Weapon Specialist']
        },
        requirements: [
            { type: 'bab', min: 7 },
            { type: 'feat', key: 'armor-proficiency-medium', name: 'Armor Proficiency (Medium)' },
            { type: 'feat', key: 'martial-arts-i', name: 'Martial Arts I' },
            { type: 'or', conditions: [
                { type: 'feat', key: 'point-blank-shot', name: 'Point-Blank Shot' },
                { type: 'feat', key: 'flurry', name: 'Flurry' }
            ]},
            { type: 'talent_count', count: 1, trees: [
                { key: 'armor_specialist', name: 'Armor Specialist', sourceId: '17cec542331cb4e4' },
                { key: 'commando', name: 'Commando', sourceId: '798ed0945cbdac1c' },
                { key: 'mercenary', name: 'Mercenary', sourceId: '4007fa87192b5884' },
                { key: 'weapon_specialist', name: 'Weapon Specialist', sourceId: '2e9265a596cc43f7' }
            ]}
        ]
    },

    'Force Adept': {
        uuid: 'swse-prestige-force-adept',
        minLevel: 7,
        skills: ['Use the Force'],
        feats: ['Force Sensitivity'],
        talents: {
            count: 3,
            forceTalentsOnly: true
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'use_the_force', name: 'Use the Force', trained: true },
            { type: 'force_sensitive', required: true },
            { type: 'force_talent_count', count: 3 }
        ]
    },

    'Force Disciple': {
        uuid: 'swse-prestige-force-disciple',
        minLevel: 12,
        skills: ['Use the Force'],
        feats: ['Force Sensitivity'],
        talents: {
            count: 2,
            trees: ['Dark Side Devotee', 'Force Adept', 'Force Item']
        },
        forcePowers: ['Farseeing'],
        forceTechniques: {
            count: 1
        },
        requirements: [
            { type: 'level', min: 12 },
            { type: 'skill', key: 'use_the_force', name: 'Use the Force', trained: true },
            { type: 'force_sensitive', required: true },
            { type: 'talent_count', count: 2, trees: [
                { key: 'dark_side_devotee', name: 'Dark Side Devotee', sourceId: '96ef43a3054dcb58' },
                { key: 'force_adept', name: 'Force Adept', sourceId: 'e35ee41362604227' },
                { key: 'force_item', name: 'Force Item', sourceId: '01e443d93e47f9c4' }
            ]},
            { type: 'force_power', key: 'farseeing', name: 'Farseeing' },
            { type: 'force_technique_count', count: 1 }
        ]
    },

    'Gunslinger': {
        uuid: 'swse-prestige-gunslinger',
        minLevel: 7,
        feats: ['Point-Blank Shot', 'Precise Shot', 'Quick Draw', 'Weapon Proficiency (Pistols)'],
        requirements: [
            { type: 'level', min: 7 },
            { type: 'feat', key: 'point-blank-shot', name: 'Point-Blank Shot' },
            { type: 'feat', key: 'precise-shot', name: 'Precise Shot' },
            { type: 'feat', key: 'quick-draw', name: 'Quick Draw' },
            { type: 'feat', key: 'weapon-proficiency', name: 'Weapon Proficiency',
              choice: { kind: 'weapon-group', key: 'pistols', name: 'Pistols' } }
        ]
    },

    'Jedi Knight': {
        uuid: 'swse-prestige-jedi-knight',
        minBAB: 7,
        skills: ['Use the Force'],
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        special: 'Must be a member of The Jedi',
        requirements: [
            { type: 'bab', min: 7 },
            { type: 'skill', key: 'use_the_force', name: 'Use the Force', trained: true },
            { type: 'force_sensitive', required: true },
            { type: 'feat', key: 'weapon-proficiency', name: 'Weapon Proficiency',
              choice: { kind: 'weapon-group', key: 'lightsabers', name: 'Lightsabers' } },
            { type: 'table_state', key: 'must-be-member-jedi',
              raw: 'Must be a member of The Jedi', severity: 'advisory' }
        ]
    },

    'Jedi Master': {
        uuid: 'swse-prestige-jedi-master',
        minLevel: 12,
        skills: ['Use the Force'],
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        forceTechniques: {
            count: 1
        },
        special: 'Must be a member of The Jedi',
        requirements: [
            { type: 'level', min: 12 },
            { type: 'skill', key: 'use_the_force', name: 'Use the Force', trained: true },
            { type: 'force_sensitive', required: true },
            { type: 'feat', key: 'weapon-proficiency', name: 'Weapon Proficiency',
              choice: { kind: 'weapon-group', key: 'lightsabers', name: 'Lightsabers' } },
            { type: 'force_technique_count', count: 1 },
            { type: 'table_state', key: 'must-be-member-jedi',
              raw: 'Must be a member of The Jedi', severity: 'advisory' }
        ]
    },

    'Officer': {
        uuid: 'swse-prestige-officer',
        minLevel: 7,
        skills: ['Knowledge (Tactics)'],
        talents: {
            count: 1,
            trees: ['Leadership', 'Commando', 'Veteran']
        },
        special: 'Must belong to any organization with a military or paramilitary division',
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'knowledge_tactics', name: 'Knowledge (Tactics)', trained: true },
            { type: 'talent_count', count: 1, trees: [
                { key: 'leadership', name: 'Leadership', sourceId: '5964237d22681dc0' },
                { key: 'commando', name: 'Commando', sourceId: '798ed0945cbdac1c' },
                { key: 'veteran', name: 'Veteran', sourceId: '96c390430d7a4975' }
            ]},
            { type: 'table_state', key: 'military-org-membership',
              raw: 'Must belong to any organization with a military or paramilitary division', severity: 'advisory' }
        ]
    },

    'Sith Apprentice': {
        uuid: 'swse-prestige-sith-apprentice',
        minLevel: 7,
        skills: ['Use the Force'],
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        darkSideScore: 'wisdom', // Must equal Wisdom score
        special: 'Must be a member of The Sith',
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'use_the_force', name: 'Use the Force', trained: true },
            { type: 'force_sensitive', required: true },
            { type: 'feat', key: 'weapon-proficiency', name: 'Weapon Proficiency',
              choice: { kind: 'weapon-group', key: 'lightsabers', name: 'Lightsabers' } },
            { type: 'dark_side', min: 'wisdom' },
            { type: 'table_state', key: 'must-be-member-sith',
              raw: 'Must be a member of The Sith', severity: 'advisory' }
        ]
    },

    'Sith Lord': {
        uuid: 'swse-prestige-sith-lord',
        minLevel: 12,
        skills: ['Use the Force'],
        feats: ['Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        forceTechniques: {
            count: 1
        },
        darkSideScore: 'wisdom',
        special: 'Must be a member of The Sith',
        requirements: [
            { type: 'level', min: 12 },
            { type: 'skill', key: 'use_the_force', name: 'Use the Force', trained: true },
            { type: 'force_sensitive', required: true },
            { type: 'feat', key: 'weapon-proficiency', name: 'Weapon Proficiency',
              choice: { kind: 'weapon-group', key: 'lightsabers', name: 'Lightsabers' } },
            { type: 'force_technique_count', count: 1 },
            { type: 'dark_side', min: 'wisdom' },
            { type: 'table_state', key: 'must-be-member-sith',
              raw: 'Must be a member of The Sith', severity: 'advisory' }
        ]
    },

    // Knights of the Old Republic Campaign Guide
    'Corporate Agent': {
        uuid: 'swse-prestige-corporate-agent',
        minLevel: 7,
        skills: ['Gather Information', 'Knowledge (Bureaucracy)'],
        feats: ['Skill Focus (Knowledge (Bureaucracy))'],
        special: 'Must be employed by a major interstellar corporation',
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'gather_information', name: 'Gather Information', trained: true },
            { type: 'skill', key: 'knowledge_bureaucracy', name: 'Knowledge (Bureaucracy)', trained: true },
            { type: 'feat', key: 'skill-focus', name: 'Skill Focus',
              choice: { kind: 'skill', key: 'knowledge-bureaucracy', name: 'Knowledge (Bureaucracy)' } },
            { type: 'table_state', key: 'corporate-employment',
              raw: 'Must be employed by a major interstellar corporation', severity: 'advisory' }
        ]
    },

    'Gladiator': {
        uuid: 'swse-prestige-gladiator',
        minLevel: 7,
        minBAB: 7,
        feats: ['Improved Damage Threshold', 'Weapon Proficiency (Advanced Melee Weapons)'],
        requirements: [
            { type: 'level', min: 7 },
            { type: 'bab', min: 7 },
            { type: 'feat', key: 'improved-damage-threshold', name: 'Improved Damage Threshold' },
            { type: 'feat', key: 'weapon-proficiency', name: 'Weapon Proficiency',
              choice: { kind: 'weapon-group', key: 'advanced-melee-weapons', name: 'Advanced Melee Weapons' } }
        ]
    },

    'Melee Duelist': {
        uuid: 'swse-prestige-melee-duelist',
        minLevel: 7,
        minBAB: 7,
        feats: ['Melee Defense', 'Rapid Strike', 'Weapon Focus (Melee Weapon)'],
        requirements: [
            { type: 'level', min: 7 },
            { type: 'bab', min: 7 },
            { type: 'feat', key: 'melee-defense', name: 'Melee Defense' },
            { type: 'feat', key: 'rapid-strike', name: 'Rapid Strike' },
            { type: 'feat', key: 'weapon-focus', name: 'Weapon Focus',
              choice: { kind: 'weapon-group', key: 'melee-weapon', name: 'Melee Weapon' } }
        ]
    },

    // Force Unleashed Campaign Guide
    'Enforcer': {
        uuid: 'swse-prestige-enforcer',
        minLevel: 7,
        skills: ['Gather Information', 'Perception'],
        talents: {
            count: 1,
            trees: ['Survivor']
        },
        special: 'Must belong to a law enforcement or similar security organization',
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'gather_information', name: 'Gather Information', trained: true },
            { type: 'skill', key: 'perception', name: 'Perception', trained: true },
            { type: 'talent_count', count: 1, trees: [
                { key: 'survivor', name: 'Survivor', sourceId: '9b06340233eb3cdd' }
            ]},
            { type: 'table_state', key: 'law-enforcement-org',
              raw: 'Must belong to a law enforcement or similar security organization', severity: 'advisory' }
        ]
    },

    'Independent Droid': {
        uuid: 'swse-prestige-independent-droid',
        minLevel: 3,
        isDroid: true,
        skills: ['Use Computer'],
        droidSystems: ['Heuristic Processor'],
        requirements: [
            { type: 'level', min: 3 },
            { type: 'droid', required: true },
            { type: 'skill', key: 'use_computer', name: 'Use Computer', trained: true },
            { type: 'droid_systems', systems: ['Heuristic Processor'] }
        ]
    },

    'Infiltrator': {
        uuid: 'swse-prestige-infiltrator',
        minLevel: 7,
        skills: ['Perception', 'Stealth'],
        feats: ['Skill Focus (Stealth)'],
        talents: {
            count: 2,
            trees: ['Camouflage', 'Spy']
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'perception', name: 'Perception', trained: true },
            { type: 'skill', key: 'stealth', name: 'Stealth', trained: true },
            { type: 'feat', key: 'skill-focus', name: 'Skill Focus',
              choice: { kind: 'skill', key: 'stealth', name: 'Stealth' } },
            { type: 'talent_count', count: 2, trees: [
                { key: 'camouflage', name: 'Camouflage', sourceId: '3926d582d2077489' },
                { key: 'spy', name: 'Spy', sourceId: '7c42882a1347ef18' }
            ]}
        ]
    },

    'Master Privateer': {
        uuid: 'swse-prestige-master-privateer',
        minLevel: 7,
        skills: ['Deception', 'Pilot'],
        feats: ['Vehicular Combat'],
        talents: {
            count: 2,
            trees: ['Misfortune', 'Smuggling', 'Spacer']
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'deception', name: 'Deception', trained: true },
            { type: 'skill', key: 'pilot', name: 'Pilot', trained: true },
            { type: 'feat', key: 'vehicular-combat', name: 'Vehicular Combat' },
            { type: 'talent_count', count: 2, trees: [
                { key: 'misfortune', name: 'Misfortune', sourceId: '67b59e020c1660eb' },
                { key: 'smuggling', name: 'Smuggling', sourceId: '9f7ca12cc084737a' },
                { key: 'spacer', name: 'Spacer', sourceId: '5ea8c79492d40713' }
            ]}
        ]
    },

    'Medic': {
        uuid: 'swse-prestige-medic',
        minLevel: 7,
        skills: ['Knowledge (Life Sciences)', 'Treat Injury'],
        feats: ['Surgical Expertise'],
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'knowledge_life_sciences', name: 'Knowledge (Life Sciences)', trained: true },
            { type: 'skill', key: 'treat_injury', name: 'Treat Injury', trained: true },
            { type: 'feat', key: 'surgical-expertise', name: 'Surgical Expertise' }
        ]
    },

    'Saboteur': {
        uuid: 'swse-prestige-saboteur',
        minLevel: 7,
        skills: ['Deception', 'Mechanics', 'Use Computer'],
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'deception', name: 'Deception', trained: true },
            { type: 'skill', key: 'mechanics', name: 'Mechanics', trained: true },
            { type: 'skill', key: 'use_computer', name: 'Use Computer', trained: true }
        ]
    },

    // Scum and Villainy
    'Assassin': {
        uuid: 'swse-prestige-assassin',
        minLevel: 7,
        skills: ['Stealth'],
        feats: ['Sniper'],
        talents: {
            specific: ['Dastardly Strike']
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'stealth', name: 'Stealth', trained: true },
            { type: 'feat', key: 'sniper', name: 'Sniper' },
            { type: 'talent', key: 'dastardly-strike', name: 'Dastardly Strike' }
        ]
    },

    'Charlatan': {
        uuid: 'swse-prestige-charlatan',
        minLevel: 7,
        skills: ['Deception', 'Persuasion'],
        talents: {
            count: 1,
            trees: ['Disgrace', 'Influence', 'Lineage']
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'deception', name: 'Deception', trained: true },
            { type: 'skill', key: 'persuasion', name: 'Persuasion', trained: true },
            { type: 'talent_count', count: 1, trees: [
                { key: 'disgrace', name: 'Disgrace', sourceId: 'e91cc675fbf9ba6e' },
                { key: 'influence', name: 'Influence', sourceId: '8375b9b26b679901' },
                { key: 'lineage', name: 'Lineage', sourceId: 'b5bb4154688c66ab' }
            ]}
        ]
    },

    'Outlaw': {
        uuid: 'swse-prestige-outlaw',
        minLevel: 7,
        skills: ['Stealth', 'Survival'],
        talents: {
            count: 1,
            trees: ['Disgrace', 'Misfortune']
        },
        special: 'You must be wanted by the authorities in at least one star system',
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'stealth', name: 'Stealth', trained: true },
            { type: 'skill', key: 'survival', name: 'Survival', trained: true },
            { type: 'talent_count', count: 1, trees: [
                { key: 'disgrace', name: 'Disgrace', sourceId: 'e91cc675fbf9ba6e' },
                { key: 'misfortune', name: 'Misfortune', sourceId: '67b59e020c1660eb' }
            ]},
            { type: 'table_state', key: 'wanted-by-authorities',
              raw: 'You must be wanted by the authorities in at least one star system', severity: 'advisory' }
        ]
    },

    // Clone Wars Campaign Guide
    'Droid Commander': {
        uuid: 'swse-prestige-droid-commander',
        minLevel: 7,
        isDroid: true,
        skills: ['Knowledge (Tactics)', 'Use Computer'],
        talents: {
            count: 1,
            trees: ['Leadership', 'Commando']
        },
        special: 'Must be a Droid',
        requirements: [
            { type: 'level', min: 7 },
            { type: 'droid', required: true },
            { type: 'skill', key: 'knowledge_tactics', name: 'Knowledge (Tactics)', trained: true },
            { type: 'skill', key: 'use_computer', name: 'Use Computer', trained: true },
            { type: 'talent_count', count: 1, trees: [
                { key: 'leadership', name: 'Leadership', sourceId: '5964237d22681dc0' },
                { key: 'commando', name: 'Commando', sourceId: '798ed0945cbdac1c' }
            ]}
            // 'Must be a Droid' is semantically satisfied by type: 'droid' above
        ]
    },

    'Military Engineer': {
        uuid: 'swse-prestige-military-engineer',
        minBAB: 7,
        skills: ['Mechanics', 'Use Computer'],
        requirements: [
            { type: 'bab', min: 7 },
            { type: 'skill', key: 'mechanics', name: 'Mechanics', trained: true },
            { type: 'skill', key: 'use_computer', name: 'Use Computer', trained: true }
        ]
    },

    'Vanguard': {
        uuid: 'swse-prestige-vanguard',
        minLevel: 7,
        skills: ['Perception', 'Stealth'],
        talents: {
            count: 2,
            trees: ['Camouflage', 'Commando']
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'perception', name: 'Perception', trained: true },
            { type: 'skill', key: 'stealth', name: 'Stealth', trained: true },
            { type: 'talent_count', count: 2, trees: [
                { key: 'camouflage', name: 'Camouflage', sourceId: '3926d582d2077489' },
                { key: 'commando', name: 'Commando', sourceId: '798ed0945cbdac1c' }
            ]}
        ]
    },

    // Legacy Era Campaign Guide
    'Imperial Knight': {
        uuid: 'swse-prestige-imperial-knight',
        minBAB: 7,
        skills: ['Use the Force'],
        feats: ['Armor Proficiency (Medium)', 'Force Sensitivity', 'Weapon Proficiency (Lightsabers)'],
        special: 'Must be a sworn defender of The Fel Empire',
        requirements: [
            { type: 'bab', min: 7 },
            { type: 'skill', key: 'use_the_force', name: 'Use the Force', trained: true },
            { type: 'feat', key: 'armor-proficiency-medium', name: 'Armor Proficiency (Medium)' },
            { type: 'force_sensitive', required: true },
            { type: 'feat', key: 'weapon-proficiency', name: 'Weapon Proficiency',
              choice: { kind: 'weapon-group', key: 'lightsabers', name: 'Lightsabers' } },
            { type: 'table_state', key: 'sworn-defender-fel-empire',
              raw: 'Must be a sworn defender of The Fel Empire', severity: 'advisory' }
        ]
    },

    'Shaper': {
        uuid: 'swse-prestige-shaper',
        minLevel: 7,
        species: ['Yuuzhan Vong'],
        skills: ['Knowledge (Life Sciences)', 'Treat Injury'],
        feats: ['Biotech Specialist'],
        requirements: [
            { type: 'level', min: 7 },
            { type: 'species', key: 'yuuzhan-vong', name: 'Yuuzhan Vong' },
            { type: 'skill', key: 'knowledge_life_sciences', name: 'Knowledge (Life Sciences)', trained: true },
            { type: 'skill', key: 'treat_injury', name: 'Treat Injury', trained: true },
            { type: 'feat', key: 'biotech-specialist', name: 'Biotech Specialist' }
        ]
    },

    // Rebellion Era Campaign Guide
    'Improviser': {
        uuid: 'swse-prestige-improviser',
        minLevel: 7,
        skills: ['Mechanics', 'Use Computer'],
        feats: ['Skill Focus (Mechanics)'],
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'mechanics', name: 'Mechanics', trained: true },
            { type: 'skill', key: 'use_computer', name: 'Use Computer', trained: true },
            { type: 'feat', key: 'skill-focus', name: 'Skill Focus',
              choice: { kind: 'skill', key: 'mechanics', name: 'Mechanics' } }
        ]
    },

    'Pathfinder': {
        uuid: 'swse-prestige-pathfinder',
        minLevel: 7,
        skills: ['Perception', 'Survival'],
        talents: {
            count: 2,
            trees: ['Awareness', 'Camouflage', 'Survivor']
        },
        requirements: [
            { type: 'level', min: 7 },
            { type: 'skill', key: 'perception', name: 'Perception', trained: true },
            { type: 'skill', key: 'survival', name: 'Survival', trained: true },
            { type: 'talent_count', count: 2, trees: [
                { key: 'awareness', name: 'Awareness', sourceId: '1c48d1cd9ab1f5c8' },
                { key: 'camouflage', name: 'Camouflage', sourceId: '3926d582d2077489' },
                { key: 'survivor', name: 'Survivor', sourceId: '9b06340233eb3cdd' }
            ]}
        ]
    },

    // Galaxy at War
    'Martial Arts Master': {
        uuid: 'swse-prestige-martial-arts-master',
        minBAB: 7,
        feats: ['Martial Arts II', 'Melee Defense'],
        featsAny: ['Martial Arts Feat'], // Any one Martial Arts feat
        talents: {
            count: 1,
            trees: ['Brawler', 'Survivor']
        },
        requirements: [
            { type: 'bab', min: 7 },
            { type: 'feat', key: 'martial-arts-ii', name: 'Martial Arts II' },
            { type: 'feat', key: 'melee-defense', name: 'Melee Defense' },
            { type: 'or', conditions: [
                { type: 'feat', key: 'martial-arts-feat', name: 'Martial Arts Feat',
                  isFamilyFeat: true, familyFlag: 'martialArtsFeat' }
            ]},
            { type: 'talent_count', count: 1, trees: [
                { key: 'brawler', name: 'Brawler', sourceId: '67fdd8dce9abd6c1' },
                { key: 'survivor', name: 'Survivor', sourceId: '9b06340233eb3cdd' }
            ]}
        ]
    }
};

/**
 * Get prerequisites for a prestige class.
 *
 * @param {string} className - Prestige class name
 * @returns {Object|null} - Prerequisites object or null
 */
export function getPrerequisites(className) {
    return PRESTIGE_PREREQUISITES[className] || null;
}

/**
 * Check if a class has prerequisites (i.e., is a prestige class).
 *
 * @param {string} className - Class name
 * @returns {boolean} - True if class has prerequisites
 */
export function hasPrerequisites(className) {
    return className in PRESTIGE_PREREQUISITES;
}

/**
 * Get all prestige class names.
 *
 * @returns {Array<string>} - Array of prestige class names
 */
export function getAllPrestigeClassNames() {
    return Object.keys(PRESTIGE_PREREQUISITES);
}
