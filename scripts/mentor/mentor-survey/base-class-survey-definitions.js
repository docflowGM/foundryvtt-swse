import { buildSurveyDefinition } from './definition-builder.js';

const BASE_CLASS_KEYS = new Set(['jedi', 'noble', 'scout', 'soldier', 'scoundrel']);

const CLASS_META = {
  jedi: {
    displayName: 'Jedi',
    mentorKey: 'Jedi',
    archetypeLabel: 'Force Mystic',
    opening: 'You are not simply adding techniques. You are stepping into a discipline that asks what you will do with power, restraint, and responsibility.',
    paths: [
      path('guardian', 'Guardian', 'Stand between danger and the people who need protection.', ['Guardian', 'Defense', 'Lightsaber'], { mechanicalBias: { reactionDefense: 2, damageReduction: 1 }, roleBias: { defender: 2, support: 1 }, attributeBias: { wisdom: 1, constitution: 1 } }, { featBias: ['melee_defense', 'force_training'], talentBias: ['lightsaber-combat', 'guardian'], skillBias: ['useTheForce', 'perception'] }),
      path('consular', 'Consular', 'Seek understanding first, then use insight to shape the moment.', ['Wisdom', 'Insight', 'Force'], { mechanicalBias: { forceDC: 2, skillUtility: 1, socialManipulation: 1 }, roleBias: { controller: 2, support: 1 }, attributeBias: { wisdom: 2, charisma: 1 } }, { featBias: ['force_training', 'skill_focus_use_the_force'], talentBias: ['consular', 'force'], skillBias: ['useTheForce', 'knowledge', 'persuasion'] }),
      path('sentinel', 'Sentinel', 'Blend the Force with practical skill, awareness, mobility, and quiet action.', ['Skills', 'Awareness', 'Mobility'], { mechanicalBias: { skillUtility: 2, evasion: 1, tacticalAwareness: 1 }, roleBias: { flex: 2, skirmisher: 1 }, attributeBias: { dexterity: 1, wisdom: 1, intelligence: 1 } }, { featBias: ['skill_training', 'force_training'], talentBias: ['sentinel', 'mobility'], skillBias: ['useTheForce', 'stealth', 'perception'] }),
      path('battle_mystic', 'Battle Mystic', 'Carry the Force into battle with decisive movement, power, and controlled aggression.', ['Force', 'Combat', 'Momentum'], { mechanicalBias: { forceDC: 1, burstDamage: 2, accuracy: 1 }, roleBias: { striker: 2, controller: 1 }, attributeBias: { charisma: 1, wisdom: 1, dexterity: 1 } }, { featBias: ['force_training', 'weapon_focus_lightsabers'], talentBias: ['lightsaber-combat', 'force'], skillBias: ['useTheForce', 'initiative'] }),
      path('peacekeeper', 'Peacekeeper', 'Resolve conflict, strengthen allies, and carry calm into places that have forgotten it.', ['Support', 'Peace', 'Leadership'], { mechanicalBias: { allySupport: 2, socialManipulation: 1, reactionDefense: 1 }, roleBias: { support: 2, controller: 1 }, attributeBias: { charisma: 2, wisdom: 1 } }, { featBias: ['coordinated_attack', 'force_training'], talentBias: ['support', 'consular'], skillBias: ['persuasion', 'useTheForce'] }),
    ],
  },
  noble: {
    displayName: 'Noble', mentorKey: 'Noble', archetypeLabel: 'Social Leader',
    opening: 'A Noble path is not just status. It is influence, responsibility, leverage, and the ability to move people when blasters cannot.',
    paths: [
      path('inspiring_leader', 'Inspiring Leader', 'Turn confidence into action and make allies better than they were alone.', ['Leadership', 'Support', 'Presence'], { mechanicalBias: { allySupport: 2, socialManipulation: 1 }, roleBias: { support: 2, leader: 2 }, attributeBias: { charisma: 2 } }, { skillBias: ['persuasion', 'knowledgeTactics'], featBias: ['coordinated_attack'], talentBias: ['leadership'] }),
      path('diplomat', 'Diplomat', 'Win breathing room, allies, and concessions before a fight ever begins.', ['Diplomacy', 'Influence', 'Peace'], { mechanicalBias: { socialManipulation: 2, networkInfluence: 1 }, roleBias: { social: 2, support: 1 }, attributeBias: { charisma: 2, wisdom: 1 } }, { skillBias: ['persuasion', 'deception', 'gatherInfo'], talentBias: ['influence'] }),
      path('tactician', 'Tactician', 'Read the field, coordinate the team, and make the right move at the right moment.', ['Tactics', 'Command', 'Teamwork'], { mechanicalBias: { tacticalAwareness: 2, allySupport: 1 }, roleBias: { support: 1, controller: 1 }, attributeBias: { intelligence: 2, charisma: 1 } }, { skillBias: ['knowledgeTactics', 'initiative'], featBias: ['coordinated_attack'], talentBias: ['tactics'] }),
      path('resource_broker', 'Resource Broker', 'Use contacts, credits, and favors to solve problems others cannot reach.', ['Resources', 'Contacts', 'Leverage'], { mechanicalBias: { networkInfluence: 2, skillUtility: 1 }, roleBias: { utility: 2, social: 1 }, attributeBias: { charisma: 1, intelligence: 1 } }, { skillBias: ['gatherInfo', 'persuasion'], talentBias: ['wealth', 'contacts'] }),
    ],
  },
  scout: {
    displayName: 'Scout', mentorKey: 'Scout', archetypeLabel: 'Mobile Skill Expert',
    opening: 'A Scout survives by seeing first, moving first, and knowing how to live where maps and plans fail.',
    paths: [
      path('pathfinder', 'Pathfinder', 'Find the route, read the terrain, and keep the group alive beyond safe borders.', ['Exploration', 'Survival', 'Awareness'], { mechanicalBias: { skillUtility: 2, tacticalAwareness: 1 }, roleBias: { utility: 2, scout: 2 }, attributeBias: { wisdom: 2, dexterity: 1 } }, { skillBias: ['survival', 'perception', 'endurance'], talentBias: ['survival'] }),
      path('mobile_skirmisher', 'Mobile Skirmisher', 'Stay hard to pin down while striking from the angles enemies ignore.', ['Mobility', 'Ranged', 'Speed'], { mechanicalBias: { evasion: 2, accuracy: 1 }, roleBias: { skirmisher: 2, striker: 1 }, attributeBias: { dexterity: 2 } }, { skillBias: ['initiative', 'acrobatics'], featBias: ['mobility'], talentBias: ['skirmisher'] }),
      path('watchful_tracker', 'Watchful Tracker', 'Notice what others miss and turn signs, tracks, and instincts into advantage.', ['Tracking', 'Perception', 'Instinct'], { mechanicalBias: { tacticalAwareness: 2, skillUtility: 1 }, roleBias: { utility: 1, controller: 1 }, attributeBias: { wisdom: 2 } }, { skillBias: ['perception', 'survival', 'initiative'], talentBias: ['tracking'] }),
      path('frontier_generalist', 'Frontier Generalist', 'Solve strange problems with practical skills, nerve, and adaptability.', ['Skills', 'Adaptability', 'Utility'], { mechanicalBias: { skillUtility: 2, evasion: 1 }, roleBias: { flex: 2, utility: 1 }, attributeBias: { intelligence: 1, dexterity: 1, wisdom: 1 } }, { skillBias: ['mechanics', 'survival', 'pilot'], featBias: ['skill_training'] }),
    ],
  },
  soldier: {
    displayName: 'Soldier', mentorKey: 'Soldier', archetypeLabel: 'Combat Tank',
    opening: 'A Soldier path is discipline under fire. It is armor, weapons, tactics, and the will to keep fighting when the line starts to break.',
    paths: [
      path('frontline_defender', 'Frontline Defender', 'Hold the line, absorb pressure, and keep enemies focused on you.', ['Defense', 'Armor', 'Durability'], { mechanicalBias: { damageReduction: 2, reactionDefense: 1 }, roleBias: { defender: 2 }, attributeBias: { constitution: 2, strength: 1 } }, { featBias: ['toughness', 'improved_defenses'], talentBias: ['armor', 'defender'], skillBias: ['endurance'] }),
      path('weapon_specialist', 'Weapon Specialist', 'Master your weapon until every shot or strike feels inevitable.', ['Weapons', 'Accuracy', 'Damage'], { mechanicalBias: { accuracy: 2, singleTargetDamage: 2 }, roleBias: { striker: 2 }, attributeBias: { dexterity: 1, strength: 1 } }, { featBias: ['weapon_focus', 'point_blank_shot'], talentBias: ['weapon_specialist'], skillBias: ['initiative'] }),
      path('battlefield_tactician', 'Battlefield Tactician', 'Use combat training to control the field and make the squad more dangerous.', ['Tactics', 'Command', 'Pressure'], { mechanicalBias: { tacticalAwareness: 2, allySupport: 1 }, roleBias: { controller: 1, support: 1 }, attributeBias: { intelligence: 1, charisma: 1 } }, { skillBias: ['knowledgeTactics', 'initiative'], talentBias: ['tactics'], featBias: ['coordinated_attack'] }),
      path('shock_trooper', 'Shock Trooper', 'Hit fast, hit hard, and force enemies to react to your momentum.', ['Offense', 'Momentum', 'Assault'], { mechanicalBias: { burstDamage: 2, accuracy: 1 }, roleBias: { striker: 2, skirmisher: 1 }, attributeBias: { strength: 1, dexterity: 1, constitution: 1 } }, { featBias: ['power_attack', 'charging_fire'], talentBias: ['assault'], skillBias: ['initiative', 'jump'] }),
    ],
  },
  scoundrel: {
    displayName: 'Scoundrel', mentorKey: 'Scoundrel', archetypeLabel: 'Roguish Operator',
    opening: 'A Scoundrel survives with timing, nerve, misdirection, and the sense to see openings before anyone else.',
    paths: [
      path('trickster', 'Trickster', 'Win by making the enemy believe the wrong thing at the worst possible time.', ['Deception', 'Misdirection', 'Social'], { mechanicalBias: { socialManipulation: 2, skillUtility: 1 }, roleBias: { controller: 1, social: 2 }, attributeBias: { charisma: 2, intelligence: 1 } }, { skillBias: ['deception', 'persuasion'], talentBias: ['misfortune'] }),
      path('shadow_operator', 'Shadow Operator', 'Move quietly, strike from advantage, and leave before anyone understands what happened.', ['Stealth', 'Precision', 'Underworld'], { mechanicalBias: { evasion: 1, singleTargetDamage: 2, skillUtility: 1 }, roleBias: { skirmisher: 2, striker: 1 }, attributeBias: { dexterity: 2 } }, { skillBias: ['stealth', 'deception', 'initiative'], talentBias: ['stealth'], featBias: ['point_blank_shot'] }),
      path('lucky_survivor', 'Lucky Survivor', 'Lean into nerve, improvisation, and the impossible break at the perfect moment.', ['Luck', 'Survival', 'Improvisation'], { mechanicalBias: { evasion: 2, reactionDefense: 1 }, roleBias: { flex: 2 }, attributeBias: { dexterity: 1, charisma: 1 } }, { skillBias: ['initiative', 'deception'], talentBias: ['fortune'] }),
      path('smooth_operator', 'Smooth Operator', 'Get into rooms, conversations, and opportunities others never reach.', ['Contacts', 'Charm', 'Opportunity'], { mechanicalBias: { networkInfluence: 2, socialManipulation: 1 }, roleBias: { social: 2, utility: 1 }, attributeBias: { charisma: 2 } }, { skillBias: ['gatherInfo', 'persuasion', 'deception'], talentBias: ['contacts'] }),
    ],
  },
};

const DEPARTURE_OPTIONS = {
  jedi: {
    text: 'What about your old path as a Jedi made you seek this new training?',
    options: [
      departure('force_was_not_enough', 'The Force was not enough by itself.', 'You need practical tools beyond meditation, intuition, and the lightsaber.', ['Practical', 'Broadened Path'], pos({ skillUtility: 2, tacticalAwareness: 1 }, { flex: 1 }, { intelligence: 1 }), neg({ forceDC: -1 }, { controller: -1 })),
      departure('needed_worldly_methods', 'I needed a more worldly way to act.', 'You are not rejecting the Jedi path, but you want methods that work in the messy parts of the galaxy.', ['Practical', 'Worldly'], pos({ skillUtility: 2, networkInfluence: 1 }, { utility: 1 }, { intelligence: 1, charisma: 1 }), neg({}, { mystic: -1 })),
      departure('protect_with_new_tools', 'I still protect others, but I need new tools.', 'Your old purpose remains, but your methods are expanding.', ['Protection', 'Evolution'], pos({ reactionDefense: 1, allySupport: 1 }, { defender: 1, support: 1 }, { wisdom: 1 }), neg()),
      departure('small_step_not_new_identity', 'This is a useful branch, not a new identity.', 'You want this class to add options while leaving the Jedi identity at the center.', ['Splash', 'Options'], pos({ skillUtility: 1 }, { flex: 1 }, {}), neg({ forceDC: -0.25 }, {})),
    ],
  },
  noble: {
    text: 'What about your old path as a Noble made you seek this new training?',
    options: [
      departure('words_not_enough', 'Words were not enough.', 'Influence mattered, but some problems demanded direct capability.', ['Action', 'Directness'], pos({ accuracy: 1, reactionDefense: 1, tacticalAwareness: 1 }, { striker: 1, defender: 1 }, { dexterity: 1, strength: 1 }), neg({ socialManipulation: -1 }, { social: -1, leader: -0.5 })),
      departure('status_felt_hollow', 'Status felt hollow without purpose.', 'You want your influence to serve something more grounded than rank, leverage, or reputation.', ['Purpose', 'Service'], pos({ allySupport: 1, tacticalAwareness: 1 }, { support: 1 }, { wisdom: 1 }), neg({ networkInfluence: -1 }, { social: -0.5 })),
      departure('resources_had_limits', 'Resources and contacts had limits.', 'Credits, favors, and title could not solve everything, so you need capability that belongs to you.', ['Self-Reliance', 'Capability'], pos({ skillUtility: 1, accuracy: 1 }, { flex: 1 }, { dexterity: 1, intelligence: 1 }), neg({ networkInfluence: -1 }, {})),
      departure('lead_differently', 'I still lead, but I need to lead differently.', 'You are transforming leadership into action, service, and example.', ['Leadership', 'Transformation'], pos({ allySupport: 2, reactionDefense: 1 }, { support: 1, leader: 1 }, { charisma: 1, wisdom: 1 }), neg()),
    ],
  },
  scout: {
    text: 'What about your old path as a Scout made you seek this new training?',
    options: [
      departure('instinct_not_enough', 'Instinct was not enough.', 'Awareness kept you alive, but you need a stronger answer when survival is not the only goal.', ['Growth', 'Purpose'], pos({ tacticalAwareness: 1, reactionDefense: 1 }, { support: 1, defender: 1 }, { wisdom: 1 }), neg({ skillUtility: -0.5 }, { utility: -0.5 })),
      departure('lone_path_too_narrow', 'The lone path became too narrow.', 'You want to do more than range ahead and survive alone.', ['Team', 'Connection'], pos({ allySupport: 1, socialManipulation: 1 }, { support: 1, social: 1 }, { charisma: 1 }), neg({}, { loneWolf: -1 })),
      departure('needed_more_force', 'I found something that changed me.', 'Discovery pushed you toward a new identity, not just another route.', ['Discovery', 'Change'], pos({ forceDC: 1, skillUtility: 1 }, { controller: 1 }, { wisdom: 1 }), neg({}, { mundaneUtility: -1 })),
      departure('sharpen_what_i_do', 'I want to sharpen what I already do.', 'This new class should enhance your speed, awareness, and adaptability instead of replacing them.', ['Reinforce', 'Mobility'], pos({ evasion: 1, skillUtility: 1 }, { skirmisher: 1, flex: 1 }, { dexterity: 1, wisdom: 1 }), neg()),
    ],
  },
  soldier: {
    text: 'What about your old path as a Soldier made you seek this new training?',
    options: [
      departure('weapons_not_everything', 'Weapons could not solve everything.', 'You learned that some battles require more than armor, aim, and force.', ['Broadened Tools', 'Restraint'], pos({ skillUtility: 1, socialManipulation: 1, tacticalAwareness: 1 }, { controller: 1, support: 1 }, { wisdom: 1, charisma: 1 }), neg({ singleTargetDamage: -1 }, { striker: -0.5 })),
      departure('survived_without_purpose', 'I survived battles but needed purpose.', 'You are looking for a reason to fight, not just better ways to win.', ['Purpose', 'Code'], pos({ allySupport: 1, reactionDefense: 1 }, { defender: 1, support: 1 }, { wisdom: 1 }), neg({ burstDamage: -0.75 }, {})),
      departure('beyond_strength', 'I needed something beyond physical strength.', 'Training and toughness mattered, but you want a deeper source of capability.', ['Growth', 'Depth'], pos({ forceDC: 1, skillUtility: 1 }, { flex: 1 }, { wisdom: 1, charisma: 1 }), neg({ damageReduction: -0.5, singleTargetDamage: -0.5 }, { bruteForce: -1 })),
      departure('ultimate_guardian', 'I want to become the ultimate battlefield guardian.', 'Your new class should reinforce the protective combat role you already understand.', ['Guardian', 'Reinforce'], pos({ reactionDefense: 2, damageReduction: 1 }, { defender: 2 }, { constitution: 1, wisdom: 1 }), neg()),
    ],
  },
  scoundrel: {
    text: 'What about your old path as a Scoundrel made you seek this new training?',
    options: [
      departure('luck_not_enough', 'Luck stopped being enough.', 'Timing and nerve helped you survive, but you need discipline when the odds turn cruel.', ['Discipline', 'Stability'], pos({ reactionDefense: 1, tacticalAwareness: 1 }, { defender: 1 }, { wisdom: 1 }), neg({ evasion: -0.5 }, { luck: -1 })),
      departure('cleverness_needs_purpose', 'My cleverness needed a better purpose.', 'You want your edge to serve something larger than escape, credits, or advantage.', ['Purpose', 'Redirection'], pos({ allySupport: 1, skillUtility: 1 }, { support: 1, flex: 1 }, { wisdom: 1, charisma: 1 }), neg({ socialManipulation: -0.5 }, { selfish: -1 })),
      departure('out_of_shadows', 'I needed a cleaner way out of the shadows.', 'You are moving away from ambushes, scams, and hidden exits toward a more open path.', ['Change', 'Redemption'], pos({ socialManipulation: 1, reactionDefense: 1 }, { support: 1 }, { charisma: 1, wisdom: 1 }), neg({ singleTargetDamage: -0.5, evasion: -0.5 }, { stealthFirst: -1 })),
      departure('focus_my_edge', 'I want to keep my edge, but focus it.', 'This is not a rejection of who you were. It is refinement.', ['Reinforce', 'Precision'], pos({ evasion: 1, skillUtility: 1, accuracy: 1 }, { skirmisher: 1, flex: 1 }, { dexterity: 1 }), neg()),
    ],
  },
};

const RELATIONSHIP_QUESTION = {
  id: 'relationship_to_past',
  text: 'How should this class connect to the path you have already walked?',
  mentorClarification: 'Your past still matters. This answer tells me whether your new training should reinforce that path, balance it, redirect it, or stay as a limited tool.',
  options: [
    option('reinforce', 'It reinforces who I already am.', 'Your new class should strengthen the identity you have already built.', ['Reinforce', 'Continuity'], pos({ tacticalAwareness: 1 }, { flex: 1 }, {}), { classSurveyMode: 'reinforce' }),
    option('balance', 'It balances what I am missing.', 'Your new class should cover gaps and give you tools your previous path lacked.', ['Balance', 'Coverage'], pos({ skillUtility: 1, reactionDefense: 1 }, { flex: 1 }, {}), { classSurveyMode: 'balance' }),
    option('pivot', 'It changes my direction.', 'Your new class marks a real change in who the character is becoming.', ['Pivot', 'Change'], pos({ skillUtility: 1, tacticalAwareness: 1 }, { flex: 1 }, {}), { classSurveyMode: 'pivot' }),
    option('splash', 'It gives me options without changing my core path.', 'You want useful tools from the new class without making it your main identity.', ['Splash', 'Options'], pos({ skillUtility: 0.5 }, { utility: 0.5 }, {}), { classSurveyMode: 'splash', recommendationStyle: 'minimalInvestment' }),
  ],
};

const SHORT_TERM_GOAL_QUESTION = {
  id: 'short_term_goal',
  text: 'What is your short-term goal?',
  mentorClarification: 'This is not your destiny. It is your next foothold. The first lesson you choose tells me where guidance will help most.',
  options: [
    option('survive_danger', 'Survive dangerous fights.', 'You want the next few choices to make you harder to drop when danger gets close.', ['Survival', 'Defense'], pos({ reactionDefense: 2, damageReduction: 1 }, { defender: 1 }, { constitution: 1 }), { featBias: ['toughness', 'improved_defenses'], talentBias: ['defender'], goal: 'survival' }),
    option('fight_better', 'Fight more effectively.', 'You want training that lets you hit harder, hit smarter, or control the fight.', ['Combat', 'Pressure'], pos({ accuracy: 2, singleTargetDamage: 1 }, { striker: 1 }, { dexterity: 1, strength: 1 }), { featBias: ['weapon_focus', 'point_blank_shot'], talentBias: ['combat'], goal: 'combat' }),
    option('use_signature_tools', 'Use this class defining tools more often.', 'You want the parts that make this class special to show up at the table soon.', ['Signature', 'Identity'], pos({ skillUtility: 1, tacticalAwareness: 1 }, { flex: 1 }, {}), { goal: 'signatureTools' }),
    option('support_allies', 'Protect or support allies.', 'You want choices that help the whole party survive, move, or succeed.', ['Support', 'Team'], pos({ allySupport: 2, reactionDefense: 1 }, { support: 2 }, { charisma: 1, wisdom: 1 }), { featBias: ['coordinated_attack'], talentBias: ['support'], goal: 'support' }),
    option('discipline', 'Become more disciplined.', 'You want focus, steadiness, and better control under pressure.', ['Discipline', 'Control'], pos({ tacticalAwareness: 1, reactionDefense: 1 }, { controller: 1 }, { wisdom: 1 }), { featBias: ['improved_defenses'], talentBias: ['discipline'], goal: 'discipline' }),
    option('long_term_dream', 'Move closer to my long-term dream.', 'You have a future version of the character in mind, and this class should help you take the next careful step toward it.', ['Dream', 'Future'], pos({ tacticalAwareness: 1, skillUtility: 1 }, { flex: 1 }, {}), { recommendationStyle: 'futureAware', prioritizePrereqs: true, goal: 'longTermDream' }),
  ],
};

function path(id, label, text, tags, biasLayers, biases = {}) {
  return option(id, label, text, tags, biasLayers, biases);
}

function departure(id, label, text, tags, positiveBias = pos(), negativeBias = neg()) {
  return option(id, label, text, tags, mergeBias(positiveBias, negativeBias), {
    departureSignal: id,
    deprioritize: negativeBias,
  });
}

function option(id, label, text, tags, biasLayers = pos(), biases = {}) {
  return {
    id,
    label,
    hint: text,
    detailRailTitle: label,
    detailRailText: text,
    detailTags: tags,
    biasLayers,
    biases,
  };
}

function pos(mechanicalBias = {}, roleBias = {}, attributeBias = {}) {
  return { mechanicalBias, roleBias, attributeBias };
}

function neg(mechanicalBias = {}, roleBias = {}, attributeBias = {}) {
  return { mechanicalBias, roleBias, attributeBias };
}

function mergeBias(...layers) {
  const out = { mechanicalBias: {}, roleBias: {}, attributeBias: {} };
  for (const layer of layers) {
    for (const key of ['mechanicalBias', 'roleBias', 'attributeBias']) {
      for (const [biasKey, value] of Object.entries(layer?.[key] || {})) {
        out[key][biasKey] = (out[key][biasKey] || 0) + Number(value || 0);
      }
    }
  }
  return out;
}

function normalizeBaseClassKey(value) {
  const raw = String(value?.name || value?.className || value?.id || value || '').trim().toLowerCase();
  if (!raw) return null;
  const compact = raw.replace(/[^a-z0-9]+/g, '');
  const aliases = {
    jedi: 'jedi',
    noble: 'noble',
    scout: 'scout',
    soldier: 'soldier',
    scoundrel: 'scoundrel',
  };
  return aliases[compact] || null;
}

function buildReasonQuestion(targetMeta) {
  return {
    id: 'new_class_reason',
    text: `What first draws your character toward the ${targetMeta.displayName} path?`,
    mentorClarification: 'This question is not asking what reward you want. It is asking what need brought you here, and what this new path is supposed to solve for your character.',
    options: [
      option('protect_or_help', 'I want to help people in a new way.', 'This path is about service, protection, or making a difference where your old training fell short.', ['Service', 'Purpose'], pos({ allySupport: 1, reactionDefense: 1 }, { support: 1 }, { wisdom: 1, charisma: 1 }), { reason: 'service' }),
      option('gain_capability', 'I need capabilities I did not have.', 'You are adding this class because it opens tools your previous path could not provide.', ['Capability', 'Growth'], pos({ skillUtility: 1, accuracy: 1 }, { flex: 1 }, {}), { reason: 'capability' }),
      option('change_identity', 'My character is changing.', 'This class marks an important shift in who the character is becoming.', ['Identity', 'Change'], pos({ tacticalAwareness: 1, skillUtility: 1 }, { flex: 1 }, { wisdom: 1 }), { reason: 'identityShift' }),
      option('pursue_mastery', 'I want to master this new discipline.', 'You are drawn to what this class uniquely does, and you want it to matter soon.', ['Mastery', targetMeta.archetypeLabel], pos({ tacticalAwareness: 1, accuracy: 1 }, { striker: 0.5, flex: 0.5 }, {}), { reason: 'mastery' }),
    ],
  };
}

function buildDepartureQuestion(previousKey) {
  return DEPARTURE_OPTIONS[previousKey] || {
    id: 'departure_from_old_path',
    text: 'What about your old path made you seek this new training?',
    mentorClarification: 'This answer tells me what you are moving away from. It creates a soft deprioritization, not a permanent rejection.',
    options: [
      departure('needed_more_options', 'I needed more options.', 'Your previous path still matters, but it did not cover every problem you expect to face.', ['Options', 'Balance'], pos({ skillUtility: 1 }, { flex: 1 }, {}), neg()),
      departure('wanted_new_direction', 'I wanted a new direction.', 'You are using this new class to redirect your build and story.', ['Change', 'Direction'], pos({ tacticalAwareness: 1 }, { flex: 1 }, { wisdom: 1 }), neg()),
    ],
  };
}

function buildPathQuestion(targetMeta) {
  return {
    id: 'new_class_shape',
    text: `What kind of ${targetMeta.displayName} are you becoming?`,
    mentorClarification: 'This question guides your near future. It does not decide your destiny forever; it tells me which version of this new path should come into focus first.',
    options: targetMeta.paths,
  };
}

export function getBaseClassSurveyDefinition(targetClass, previousClass) {
  const targetKey = normalizeBaseClassKey(targetClass);
  const previousKey = normalizeBaseClassKey(previousClass);
  if (!targetKey || !previousKey || targetKey === previousKey) return null;
  const targetMeta = CLASS_META[targetKey];
  const previousMeta = CLASS_META[previousKey];
  if (!targetMeta || !previousMeta) return null;

  const archetypes = targetMeta.paths.map((entry) => ({
    id: entry.id,
    name: entry.label,
    notes: entry.detailRailText || entry.hint,
    mechanicalBias: entry.biasLayers?.mechanicalBias || {},
    roleBias: entry.biasLayers?.roleBias || {},
    attributeBias: entry.biasLayers?.attributeBias || {},
  }));

  const definition = buildSurveyDefinition({
    surveyId: `BaseClass_${previousKey}_to_${targetKey}`,
    classId: targetKey,
    displayName: targetMeta.displayName,
    mentorKey: targetMeta.mentorKey,
    archetypes,
    resolveQuestions() {
      return [
        buildReasonQuestion(targetMeta),
        buildDepartureQuestion(previousKey),
        RELATIONSHIP_QUESTION,
        buildPathQuestion(targetMeta),
        SHORT_TERM_GOAL_QUESTION,
      ];
    },
  });

  definition.surveyType = 'base-class';
  definition.previousClassId = previousKey;
  definition.previousClassDisplayName = previousMeta.displayName;
  definition.targetClassId = targetKey;
  definition.targetClassDisplayName = targetMeta.displayName;
  definition.openingText = targetMeta.opening;
  return definition;
}

export function normalizeBaseClassSurveyKey(value) {
  return normalizeBaseClassKey(value);
}

export { BASE_CLASS_KEYS };
