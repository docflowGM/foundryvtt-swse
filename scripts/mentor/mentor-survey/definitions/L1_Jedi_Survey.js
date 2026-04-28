
import { buildSurveyDefinition } from '../definition-builder.js';

function mergeBiasLayers(archetypes, scalar = 1) {
  const out = { mechanicalBias: {}, roleBias: {}, attributeBias: {} };
  for (const archetype of archetypes || []) {
    for (const layer of ['mechanicalBias', 'roleBias', 'attributeBias']) {
      for (const [key, value] of Object.entries(archetype?.[layer] || {})) {
        const normalizedKey = layer === 'attributeBias'
          ? ({ str:'strength', dex:'dexterity', con:'constitution', int:'intelligence', wis:'wisdom', cha:'charisma' }[key] || key)
          : key;
        out[layer][normalizedKey] = (out[layer][normalizedKey] || 0) + (Number(value || 0) * scalar);
      }
    }
  }
  return out;
}

function answer(data) { return data; }

const archetypes = [
  {
    id: 'precision_striker',
    name: 'Jedi Guardian',
    notes: 'Single-target lightsaber specialist focusing on crit expansion, precision attack chains, and defensive reactions.',
    mechanicalBias: { accuracy: 3, critRange: 3, reactionDefense: 2, evasion: 2 },
    roleBias: { striker: 3, skirmisher: 2 },
    attributeBias: { dex: 3, str: 2, cha: 1 }
  },
  {
    id: 'sentinel_generalist',
    name: 'Jedi Sentinel',
    notes: 'Balanced Jedi build combining combat competence, skill utility, and flexible Force use.',
    mechanicalBias: { skillUtility: 3, accuracy: 2, forceRecovery: 2 },
    roleBias: { flex: 3, skirmisher: 2 },
    attributeBias: { dex: 2, cha: 2, int: 1 }
  },
  {
    id: 'battlefield_controller',
    name: 'Jedi Consular',
    notes: 'Battlefield control Jedi specializing in forced movement, crowd disruption, and action denial.',
    mechanicalBias: { forceDC: 3, areaControl: 3, conditionTrack: 2 },
    roleBias: { controller: 3, support: 1 },
    attributeBias: { cha: 3, wis: 2 }
  },
  {
    id: 'tank_guardian',
    name: 'Jedi Watchman',
    notes: 'Durable frontline Jedi focused on mitigation, defensive reactions, and anchoring combat.',
    mechanicalBias: { damageReduction: 2, reactionDefense: 3 },
    roleBias: { defender: 3 },
    attributeBias: { con: 3, str: 2, wis: 1 }
  },
  {
    id: 'force_burst_striker',
    name: 'Jedi Duelist',
    notes: 'Aggressive damage-focused build leveraging high-impact Force powers and offensive momentum.',
    mechanicalBias: { forceSecret: 3, burstDamage: 3, accuracy: 2 },
    roleBias: { striker: 3, offense: 2 },
    attributeBias: { cha: 3, str: 1, dex: 1 }
  }
];

const q1 = {
  id: 'jedi_path',
  text: 'What type of Jedi do you want to be?',
  options: archetypes.map((entry) => answer({
    id: entry.id,
    label: entry.name,
    detailRailTitle: entry.name,
    detailRailText: entry.notes,
    detailTags: [entry.name, 'Jedi'],
    archetypeHint: entry.id,
    biasLayers: mergeBiasLayers([entry], 0.24),
    biases: { archetype: entry.id }
  }))
};

const q2 = {
  id: 'jedi_combat_style',
  text: 'How do you want to solve problems when the moment turns dangerous?',
  options: [
    answer({
      id: 'lightsaber_combat',
      label: 'Lightsaber Combat',
      detailRailTitle: 'Lightsaber Combat',
      detailRailText: 'You want the blade to be your primary answer. This path favors accuracy, saber pressure, and direct engagement.',
      detailTags: ['Lightsaber', 'Melee', 'Precision'],
      biasLayers: { mechanicalBias: { accuracy: 2, critRange: 1, reactionDefense: 1 }, roleBias: { striker: 1, skirmisher: 1 }, attributeBias: { dexterity: 1, strength: 1, wisdom: 1 } },
      biases: { skillBias: ['initiative', 'perception'], featBias: ['weapon_focus_lightsabers', 'improved_critical_lightsabers'], talentBias: ['lightsaber-combat'] }
    }),
    answer({
      id: 'offensive_force',
      label: 'Offensive Force',
      detailRailTitle: 'Offensive Force',
      detailRailText: 'You want the Force to end fights, not just shape them. This path favors destructive powers and aggressive control.',
      detailTags: ['Force', 'Offense', 'Burst'],
      biasLayers: { mechanicalBias: { forceDC: 2, forceSecret: 1, burstDamage: 2 }, roleBias: { striker: 1, controller: 1 }, attributeBias: { wisdom: 2, charisma: 2 } },
      biases: { skillBias: ['useTheForce', 'knowledge'], featBias: ['force_training', 'skill_focus_use_the_force'], talentBias: ['force'] }
    }),
    answer({
      id: 'defensive_force',
      label: 'Defensive Force',
      detailRailTitle: 'Defensive Force',
      detailRailText: 'You use the Force to endure, shield, and stabilize. This path favors defense, support, and control under pressure.',
      detailTags: ['Force', 'Defense', 'Support'],
      biasLayers: { mechanicalBias: { reactionDefense: 2, damageReduction: 1, forceRecovery: 2 }, roleBias: { defender: 1, support: 1 }, attributeBias: { wisdom: 2, charisma: 2, constitution: 1 } },
      biases: { skillBias: ['useTheForce', 'endurance', 'perception'], featBias: ['force_training', 'improved_defenses'], talentBias: ['guardian', 'force'] }
    }),
    answer({
      id: 'diplomacy',
      label: 'Diplomacy',
      detailRailTitle: 'Diplomacy',
      detailRailText: 'You want words, presence, and influence to matter as much as combat. This path favors social force of personality and calm authority.',
      detailTags: ['Social', 'Persuasion', 'Leadership'],
      biasLayers: { mechanicalBias: { socialManipulation: 2, networkInfluence: 1, skillUtility: 1 }, roleBias: { support: 1, controller: 1 }, attributeBias: { charisma: 2, wisdom: 1 } },
      biases: { skillBias: ['perception', 'knowledge', 'useTheForce'], backgroundBias: ['persuasion', 'deception'] }
    }),
    answer({
      id: 'martial_arts',
      label: 'Martial Arts',
      detailRailTitle: 'Martial Arts',
      detailRailText: 'You want to win fights through movement, discipline, and your own body. This path favors unarmed combat and close-range pressure.',
      detailTags: ['Martial Arts', 'Mobility', 'Close Combat'],
      biasLayers: { mechanicalBias: { evasion: 2, accuracy: 1, singleTargetDamage: 1 }, roleBias: { skirmisher: 1, striker: 1 }, attributeBias: { dexterity: 1, strength: 1, wisdom: 1 } },
      biases: { skillBias: ['acrobatics', 'initiative', 'jump'], featBias: ['martial_arts'], talentBias: ['martial-arts'] }
    })
  ]
};

const q3 = {
  id: 'jedi_fulfillment',
  text: 'How do you gain fulfillment?',
  options: [
    answer({ id:'seeking_knowledge', label:'By seeking more knowledge', detailRailTitle:'Seeker of Knowledge', detailRailText:'You are fulfilled by study, discovery, and the search for deeper truths. This path leans toward learning, research, and intellectual mastery.', detailTags:['Knowledge','Study','Discovery'], biasLayers:{ mechanicalBias:{ skillUtility:2, forceRecovery:1 }, roleBias:{ utility:1 }, attributeBias:{ intelligence:2, wisdom:1 } }, biases:{ skillBias:['knowledge','mechanics','useTheForce'] } }),
    answer({ id:'defending_the_weak', label:'By defending the weak', detailRailTitle:'Protector of Others', detailRailText:'You find meaning in standing between danger and those who need protection. This path leans toward readiness, resilience, and dependable action.', detailTags:['Protection','Duty','Resilience'], biasLayers:{ mechanicalBias:{ reactionDefense:1, damageReduction:1 }, roleBias:{ defender:1, support:1 }, attributeBias:{ constitution:1, wisdom:1, charisma:1 } }, biases:{ skillBias:['endurance','initiative','perception'] } }),
    answer({ id:'strengthening_force_connection', label:'By strengthening my connection to the Force', detailRailTitle:'Devoted to the Force', detailRailText:'You are fulfilled by deepening your spiritual discipline and strengthening your connection to the Force. This path leans toward Force mastery and inner clarity.', detailTags:['Force','Wisdom','Charisma'], biasLayers:{ mechanicalBias:{ forceDC:2, forceRecovery:1 }, roleBias:{ controller:1 }, attributeBias:{ wisdom:2, charisma:2 } }, biases:{ skillBias:['useTheForce','knowledge','perception'] } }),
    answer({ id:'understanding_the_world', label:'By understanding the world around me', detailRailTitle:'Student of the World', detailRailText:'You find purpose in observing, interpreting, and making sense of the world around you. This path leans toward awareness, investigation, and practical understanding.', detailTags:['Awareness','Investigation','Observation'], biasLayers:{ mechanicalBias:{ tacticalAwareness:2, skillUtility:1 }, roleBias:{ utility:1, controller:1 }, attributeBias:{ wisdom:2, intelligence:1 } }, biases:{ skillBias:['perception','knowledge','initiative'] } }),
    answer({ id:'broadening_horizons', label:'By broadening my horizons', detailRailTitle:'Explorer of Possibility', detailRailText:'You grow by stepping beyond what is familiar and pursuing new experiences, places, and disciplines. This path leans toward versatility, travel, and learning beyond the traditional Jedi path.', detailTags:['Explorer','Travel','Versatility'], biasLayers:{ mechanicalBias:{ skillUtility:2, tacticalAwareness:1 }, roleBias:{ flex:1, utility:1 }, attributeBias:{ intelligence:1, dexterity:1, wisdom:1 } }, biases:{ skillBias:['pilot','mechanics','knowledge'], backgroundBias:['stealth','survival','persuasion'] } }),
    answer({ id:'becoming_more_empathetic', label:'By becoming more empathetic', detailRailTitle:'Seeker of Understanding', detailRailText:'You are fulfilled by understanding people more deeply and becoming more compassionate, patient, and perceptive. This path leans toward insight, connection, and emotional wisdom.', detailTags:['Empathy','Insight','Connection'], biasLayers:{ mechanicalBias:{ socialManipulation:1, skillUtility:1 }, roleBias:{ support:1, social:1 }, attributeBias:{ wisdom:1, charisma:2 } }, biases:{ skillBias:['perception','useTheForce','knowledge'], backgroundBias:['persuasion','deception'] } })
  ]
};

const q4 = { id:'jedi_future_path', text:'Where do you see yourself growing toward?', options:[
  answer({ id:'jedi_knight', label:'Protecting the innocent', detailRailTitle:'Jedi Knight', detailRailText:'You see your future in guardianship, courage, and service.', detailTags:['Guardian','Service','Protection'], biasLayers:{ mechanicalBias:{ reactionDefense:1, damageReduction:1 }, roleBias:{ defender:1, support:1 }, attributeBias:{ wisdom:1, constitution:1, charisma:1 } }, biases:{ prestigeBias:['jedi_knight'] } }),
  answer({ id:'imperial_knight', label:'Mastering martial Force techniques', detailRailTitle:'Imperial Knight', detailRailText:'You are drawn toward discipline, battlefield command, and the fusion of blade and Force.', detailTags:['Martial Force','Discipline','Blade'], biasLayers:{ mechanicalBias:{ accuracy:1, forceDC:1 }, roleBias:{ striker:1, controller:1 }, attributeBias:{ strength:1, dexterity:1, wisdom:1 } }, biases:{ prestigeBias:['imperial_knight'] } }),
  answer({ id:'force_adept', label:'Exploring the mysteries of the Force', detailRailTitle:'Force Adept', detailRailText:'Your future lies in secrets, study, and the deeper currents of the Force.', detailTags:['Mysticism','Lore','Force'], biasLayers:{ mechanicalBias:{ forceDC:2, forceRecovery:1 }, roleBias:{ controller:1 }, attributeBias:{ wisdom:2, intelligence:1, charisma:1 } }, biases:{ prestigeBias:['force_adept'] } }),
  answer({ id:'sith_apprentice', label:'Understanding real power', detailRailTitle:'Sith Apprentice', detailRailText:'You are drawn to the question of what power truly means, and what it costs to wield it.', detailTags:['Power','Ambition','Intensity'], biasLayers:{ mechanicalBias:{ burstDamage:1, forceSecret:2 }, roleBias:{ offense:1 }, attributeBias:{ charisma:2, wisdom:1, constitution:1 } }, biases:{ prestigeBias:['sith_apprentice'] } }),
  answer({ id:'melee_duelist', label:"Becoming the galaxy's best swordsman", detailRailTitle:'Melee Duelist', detailRailText:'You want your future to be defined by absolute mastery of the blade.', detailTags:['Dueling','Precision','Blade'], biasLayers:{ mechanicalBias:{ accuracy:2, critRange:1 }, roleBias:{ striker:1 }, attributeBias:{ dexterity:1, strength:1, wisdom:1 } }, biases:{ prestigeBias:['melee_duelist'] } }),
  answer({ id:'no_bias', label:'Wherever the galaxy takes me', detailRailTitle:'Unwritten Path', detailRailText:'You are leaving your future open.', detailTags:['Open Path','Flexible'], biasLayers:{ mechanicalBias:{}, roleBias:{ flex:1 }, attributeBias:{} }, biases:{ prestigeBias:[] } })
]};

const q5Branches = {
  precision_striker: [
    answer({ id:'guardian_1', label:'I am the shield that protects the innocent.', detailRailTitle:'Shield of the Innocent', detailRailText:'You define yourself by protection, guardianship, and service.', detailTags:['Protection','Duty','Service'], biasLayers:{ mechanicalBias:{ reactionDefense:2 }, roleBias:{ defender:1 }, attributeBias:{ constitution:1, wisdom:1, charisma:1 } }, biases:{ skillBias:['endurance','perception','initiative'], talentBias:['lightsaber-combat','guardian'], featBias:['improved_defenses','toughness'] } }),
    answer({ id:'guardian_2', label:'You cannot defeat what you cannot hit.', detailRailTitle:'Untouchable Guardian', detailRailText:'You believe defense is mastery.', detailTags:['Defense','Evasion','Positioning'], biasLayers:{ mechanicalBias:{ evasion:2, reactionDefense:1 }, roleBias:{ defender:1 }, attributeBias:{ dexterity:1, wisdom:1, constitution:1 } }, biases:{ skillBias:['acrobatics','initiative','perception'], featBias:['dodge','mobility'], talentBias:['lightsaber-combat'] } }),
    answer({ id:'guardian_3', label:'I wield an unstoppable force. Are you the immovable object?', detailRailTitle:'Unstoppable Force', detailRailText:'You are a forward-driving guardian who wins by pressure and strength.', detailTags:['Pressure','Strength','Momentum'], biasLayers:{ mechanicalBias:{ singleTargetDamage:1, accuracy:1 }, roleBias:{ striker:1, defender:1 }, attributeBias:{ strength:2, constitution:1, wisdom:1 } }, biases:{ skillBias:['endurance','jump','initiative'], featBias:['power_attack'], talentBias:['guardian','lightsaber-combat'] } }),
    answer({ id:'guardian_4', label:'I care not for negotiation, it only leads to more violence.', detailRailTitle:'War-Tempered Guardian', detailRailText:'You trust direct action over prolonged negotiation.', detailTags:['Action','Pressure','Resolve'], biasLayers:{ mechanicalBias:{ accuracy:1, damageReduction:1 }, roleBias:{ defender:1 }, attributeBias:{ strength:1, wisdom:1, constitution:1 } }, biases:{ skillBias:['initiative','endurance','perception'], featBias:['weapon_focus_lightsabers'], talentBias:['guardian'] } })
  ],
  sentinel_generalist: [
    answer({ id:'sentinel_1', label:'I employ the shadows to stalk my foes.', detailRailTitle:'Shadow Hunter', detailRailText:'You rely on patience, stealth, and positioning.', detailTags:['Stealth','Tracking','Patience'], biasLayers:{ mechanicalBias:{ skillUtility:1, evasion:1 }, roleBias:{ skirmisher:1 }, attributeBias:{ dexterity:2, wisdom:1 } }, biases:{ skillBias:['perception','initiative','acrobatics'], backgroundBias:['stealth','deception','survival'], talentBias:['tracking','mobility'], featBias:['stealth','precision'] } }),
    answer({ id:'sentinel_2', label:'I use the Force to track evil-doers and vanquish them in the night.', detailRailTitle:'Force Tracker', detailRailText:'You blend intuition and pursuit, using the Force as a tool to hunt what others cannot find.', detailTags:['Tracking','Force','Pursuit'], biasLayers:{ mechanicalBias:{ forceRecovery:1, skillUtility:1 }, roleBias:{ skirmisher:1 }, attributeBias:{ wisdom:2, charisma:1, dexterity:1 } }, biases:{ skillBias:['useTheForce','perception','initiative'], backgroundBias:['stealth','survival','deception'], talentBias:['tracking','force'], featBias:['force_training','awareness'] } }),
    answer({ id:'sentinel_3', label:'Learning about the dark side in order to defeat it is the best path.', detailRailTitle:'Student of Darkness', detailRailText:'You believe understanding corruption is necessary to fight it.', detailTags:['Knowledge','Investigation','Resolve'], biasLayers:{ mechanicalBias:{ skillUtility:1, forceRecovery:1 }, roleBias:{ utility:1 }, attributeBias:{ intelligence:2, wisdom:1, charisma:1 } }, biases:{ skillBias:['knowledge','useTheForce','perception'], talentBias:['knowledge','force'], featBias:['skill_focus_use_the_force'] } }),
    answer({ id:'sentinel_4', label:'The dark side corrupts, I purify.', detailRailTitle:'Purifier', detailRailText:'You are uncompromising. Your purpose is to identify corruption and destroy it.', detailTags:['Resolve','Purity','Pursuit'], biasLayers:{ mechanicalBias:{ reactionDefense:1, forceDC:1 }, roleBias:{ defender:1, striker:1 }, attributeBias:{ wisdom:1, charisma:1, dexterity:1 } }, biases:{ skillBias:['useTheForce','perception','endurance'], talentBias:['guardian','force'], featBias:['improved_defenses'] } })
  ],
  battlefield_controller: [
    answer({ id:'consular_1', label:'Knowledge is the most powerful weapon.', detailRailTitle:'Keeper of Knowledge', detailRailText:'You believe truth, study, and understanding outlast brute strength.', detailTags:['Knowledge','Study','Wisdom'], biasLayers:{ mechanicalBias:{ forceDC:1, skillUtility:1 }, roleBias:{ controller:1 }, attributeBias:{ intelligence:2, wisdom:1, charisma:1 } }, biases:{ skillBias:['knowledge','useTheForce','mechanics'], talentBias:['force','knowledge'], featBias:['force_training'] } }),
    answer({ id:'consular_2', label:'Negotiation is the only way to solve problems.', detailRailTitle:'Voice of Peace', detailRailText:'You believe violence is failure, and that real strength lies in ending conflict without bloodshed.', detailTags:['Peace','Influence','Presence'], biasLayers:{ mechanicalBias:{ socialManipulation:1, forceDC:1 }, roleBias:{ support:1, controller:1 }, attributeBias:{ charisma:2, wisdom:1, intelligence:1 } }, biases:{ skillBias:['knowledge','useTheForce','perception'], backgroundBias:['persuasion','deception'], talentBias:['support','force'], featBias:['social','force_support'] } }),
    answer({ id:'consular_3', label:'The Force is the only tool I need.', detailRailTitle:'Force Ascetic', detailRailText:'You trust the Force above all else.', detailTags:['Force','Mastery','Discipline'], biasLayers:{ mechanicalBias:{ forceDC:2, forceRecovery:1 }, roleBias:{ controller:1 }, attributeBias:{ wisdom:2, charisma:2 } }, biases:{ skillBias:['useTheForce','knowledge','perception'], talentBias:['force'], featBias:['force_training','skill_focus_use_the_force'] } }),
    answer({ id:'consular_4', label:'Only fools believe they are strong enough to fight the galaxy.', detailRailTitle:'Realist Sage', detailRailText:'You understand scale, systems, and consequences.', detailTags:['Realism','Strategy','Control'], biasLayers:{ mechanicalBias:{ areaControl:1, skillUtility:1 }, roleBias:{ controller:1 }, attributeBias:{ wisdom:1, intelligence:1, charisma:1 } }, biases:{ skillBias:['knowledge','perception','useTheForce'], talentBias:['control','support'], featBias:['utility','force_support'] } })
  ],
  tank_guardian: [
    answer({ id:'watchman_1', label:'I hold the line.', detailRailTitle:'The Lineholder', detailRailText:'You are steady, unbroken, and dependable.', detailTags:['Line','Duty','Stability'], biasLayers:{ mechanicalBias:{ damageReduction:2 }, roleBias:{ defender:1 }, attributeBias:{ constitution:2, wisdom:1, strength:1 } }, biases:{ skillBias:['endurance','initiative','perception'], talentBias:['guardian'], featBias:['toughness','improved_defenses'] } }),
    answer({ id:'watchman_2', label:'A Jedi\'s life is sacrifice. Never forget that.', detailRailTitle:'Oath of Sacrifice', detailRailText:'You see duty as something costly, and meaningful because of that cost.', detailTags:['Sacrifice','Duty','Protection'], biasLayers:{ mechanicalBias:{ reactionDefense:1, damageReduction:1 }, roleBias:{ support:1, defender:1 }, attributeBias:{ wisdom:1, constitution:1, charisma:1 } }, biases:{ skillBias:['endurance','useTheForce','perception'], talentBias:['guardian','support'], featBias:['toughness'] } }),
    answer({ id:'watchman_3', label:'I never left an ally behind.', detailRailTitle:'Keeper of Allies', detailRailText:'Your loyalty defines you.', detailTags:['Loyalty','Protection','Team'], biasLayers:{ mechanicalBias:{ allySupport:1, reactionDefense:1 }, roleBias:{ support:1, defender:1 }, attributeBias:{ charisma:1, constitution:1, wisdom:1 } }, biases:{ skillBias:['initiative','endurance','perception'], talentBias:['support','guardian'], featBias:['leadership','support'] } }),
    answer({ id:'watchman_4', label:'You will never see me back down from a foe.', detailRailTitle:'Unyielding Watchman', detailRailText:'You are defined by resolve and refusal.', detailTags:['Resolve','Pressure','Endurance'], biasLayers:{ mechanicalBias:{ damageReduction:1, accuracy:1 }, roleBias:{ defender:1, striker:1 }, attributeBias:{ constitution:1, strength:1, wisdom:1 } }, biases:{ skillBias:['endurance','jump','initiative'], talentBias:['guardian'], featBias:['toughness','power_attack'] } })
  ],
  force_burst_striker: [
    answer({ id:'duelist_1', label:'You tried to read my moves, I see.', detailRailTitle:'Unreadable Duelist', detailRailText:'You rely on timing, unpredictability, and technical mastery.', detailTags:['Timing','Technique','Precision'], biasLayers:{ mechanicalBias:{ accuracy:2, critRange:1 }, roleBias:{ striker:1 }, attributeBias:{ dexterity:2, wisdom:1, intelligence:1 } }, biases:{ skillBias:['acrobatics','initiative','perception'], talentBias:['lightsaber-combat'], featBias:['weapon_focus_lightsabers'] } }),
    answer({ id:'duelist_2', label:'The best defense is a good offense.', detailRailTitle:'Aggressive Duelist', detailRailText:'You believe pressure is protection.', detailTags:['Offense','Pressure','Tempo'], biasLayers:{ mechanicalBias:{ singleTargetDamage:2, accuracy:1 }, roleBias:{ striker:1 }, attributeBias:{ dexterity:1, strength:1, wisdom:1 } }, biases:{ skillBias:['initiative','acrobatics','jump'], talentBias:['lightsaber-combat'], featBias:['power_attack'] } }),
    answer({ id:'duelist_3', label:'The best offense is a good defense.', detailRailTitle:'Counter Duelist', detailRailText:'You win by patience, timing, and punishing mistakes.', detailTags:['Defense','Counter','Patience'], biasLayers:{ mechanicalBias:{ reactionDefense:2, accuracy:1 }, roleBias:{ striker:1, defender:1 }, attributeBias:{ dexterity:1, wisdom:1, constitution:1 } }, biases:{ skillBias:['acrobatics','perception','initiative'], talentBias:['lightsaber-combat'], featBias:['dodge','combat_reflexes'] } }),
    answer({ id:'duelist_4', label:'Next time, try to keep up. Its hard to fight in slow motion.', detailRailTitle:'Speed Duelist', detailRailText:'You define mastery through speed, tempo, and effortless movement.', detailTags:['Speed','Tempo','Movement'], biasLayers:{ mechanicalBias:{ evasion:1, accuracy:1, critRange:1 }, roleBias:{ striker:1, skirmisher:1 }, attributeBias:{ dexterity:2, wisdom:1, charisma:1 } }, biases:{ skillBias:['acrobatics','initiative','pilot'], talentBias:['lightsaber-combat'], featBias:['mobility','improved_initiative'] } })
  ]
};

const survey = buildSurveyDefinition({
  surveyId: 'L1_Jedi', classId: 'jedi', displayName: 'Jedi', mentorKey: 'Jedi', archetypes,
  questions: [q1, q2, q3, q4],
  resolveQuestions(answers = {}) {
    const selected = answers?.[q1.id]?.id;
    const branchOptions = q5Branches[selected] || [];
    const q5 = { id: 'jedi_identity_statement', text: 'Which of the following best describes your character?', options: branchOptions };
    return [q1, q2, q3, q4, q5];
  }
});

export default survey;
