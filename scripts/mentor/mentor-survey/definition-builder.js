import { MENTORS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";

const CORE_CLASS_IDS = new Set(["jedi", "scout", "scoundrel", "noble", "soldier"]);

function deepClone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function normalizeAttributeKey(key) {
  const map = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' };
  return map[key] || key;
}

function titleCaseKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\w/g, (m) => m.toUpperCase());
}

function getMentorVoiceProfile(mentor, classDisplayName) {
  const name = String(mentor?.name || '').toLowerCase();
  const title = String(mentor?.title || '').toLowerCase();
  if (name.includes('salty')) return 'pirate';
  if (name.includes('miraj')) return 'jedi';
  if (name.includes('lead')) return 'soldier';
  if (title.includes('commander') || title.includes('officer') || classDisplayName === 'Officer') return 'commander';
  if (title.includes('lord') || title.includes('kingpin') || title.includes('crime')) return 'schemer';
  if (title.includes('master') || title.includes('adept') || title.includes('disciple')) return 'sage';
  return 'mentor';
}

function line(profile, mentorName, variants) {
  const fallback = variants.mentor;
  return (variants[profile] || fallback || '').replaceAll('{mentor}', mentorName);
}

function topKeys(objects, limit = 4, banned = new Set()) {
  const scores = new Map();
  for (const obj of objects || []) {
    for (const [key, value] of Object.entries(obj || {})) {
      if (banned.has(key)) continue;
      scores.set(key, (scores.get(key) || 0) + Number(value || 0));
    }
  }
  return Array.from(scores.entries()).sort((a,b)=>b[1]-a[1]).slice(0, limit).map(([key]) => key);
}

function mergeBiasLayers(archetypes, scalar = 1) {
  const out = { mechanicalBias: {}, roleBias: {}, attributeBias: {} };
  for (const archetype of archetypes || []) {
    for (const layer of ['mechanicalBias','roleBias','attributeBias']) {
      for (const [key, value] of Object.entries(archetype?.[layer] || {})) {
        const normalizedKey = layer === 'attributeBias' ? normalizeAttributeKey(key) : key;
        out[layer][normalizedKey] = (out[layer][normalizedKey] || 0) + (Number(value || 0) * scalar);
      }
    }
  }
  return out;
}

function findBestArchetypesByKey(archetypes, layer, key, limit = 3) {
  return [...(archetypes || [])]
    .filter((entry) => Number(entry?.[layer]?.[key] || 0) > 0)
    .sort((a, b) => Number(b?.[layer]?.[key] || 0) - Number(a?.[layer]?.[key] || 0))
    .slice(0, limit);
}

function uniqueById(entries) {
  const seen = new Set();
  return (entries || []).filter((entry) => {
    const id = entry?.id || entry?.name;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function buildQuestionText(kind, profile, mentorName, classDisplayName, primaryTerm) {
  const prompts = {
    path: {
      mentor: '"When this path is tested, what do you want {className} to look like in your hands?"',
      jedi: '"When the Force answers you, what sort of {className} do you mean to become?"',
      soldier: '"When the shooting starts, what kind of {className} are you determined to be?"',
      pirate: '"So then, matey — what sort of {className} are ye aiming to become when the blasters start barking?"',
      commander: '"Before we go further, tell me what kind of {className} you intend to be when pressure mounts."',
      sage: '"Name the shape of mastery you seek on the {className} path."',
      schemer: '"Tell me which version of this path best suits the power you plan to claim."'
    },
    role: {
      mentor: '"When your allies look your way, what should they rely on you to do first?"',
      jedi: '"When others turn to you in the storm, what do you believe they should feel from you first?"',
      soldier: '"When your squad needs you, what job do you own without hesitation?"',
      pirate: '"When the crew shouts your name, what trouble are ye there to solve first?"',
      commander: '"When the team leans on you, what responsibility do you claim without wavering?"',
      sage: '"When your companions depend on you, what discipline must define your response?"',
      schemer: '"When the room shifts, what advantage should everyone know you can seize?"'
    },
    mechanics: {
      mentor: '"Which discipline of this path do you want honed to a razor?"',
      jedi: '"Which discipline calls for the most training from you now?"',
      soldier: '"Which battlefield discipline are you drilling until it becomes instinct?"',
      pirate: '"Which trick o’ the trade are ye sharpening until it cuts clean every time?"',
      commander: '"Which specialty do you intend to refine until it becomes doctrine?"',
      sage: '"Which discipline must you cultivate until it answers without thought?"',
      schemer: '"Which edge do you mean to sharpen until no rival can ignore it?"'
    },
    attribute: {
      mentor: '"What trait must sit at the heart of this path if it is going to hold?"',
      jedi: '"What quality within you must lead, if the rest is to remain in balance?"',
      soldier: '"What personal edge keeps this build standing when the pressure turns ugly?"',
      pirate: '"What part of you keeps this whole enterprise afloat when luck turns sour?"',
      commander: '"What quality in you must remain strongest if this path is to succeed?"',
      sage: '"What inner strength must anchor the discipline you are building?"',
      schemer: '"What quality makes you dangerous enough to carry this path to the end?"'
    },
    legacy: {
      mentor: '"And when this build is finished, what story should it tell about you?"',
      jedi: '"When your path is remembered, what truth should others speak of it?"',
      soldier: '"At the end of the campaign, what should people say your build was made to do?"',
      pirate: '"When the smoke clears, what sort of legend are ye hoping this path leaves behind?"',
      commander: '"When your choices have all compounded, what identity should this build carry?"',
      sage: '"When the path is complete, what truth should remain at its center?"',
      schemer: '"When the dust settles, what reputation should this path have earned you?"'
    }
  };
  const raw = line(profile, mentorName, prompts[kind] || prompts.path)
    .replaceAll('{className}', classDisplayName)
    .replaceAll('{primaryTerm}', primaryTerm || titleCaseKey(primaryTerm));
  return raw;
}

function optionFromArchetype(archetype, classDisplayName, scalar = 0.22) {
  return {
    id: `arch_${archetype.id}`,
    label: `${archetype.name} — ${archetype.notes || `A defining ${classDisplayName} path.`}`,
    hint: archetype.notes || '',
    archetypeHint: archetype.id,
    biasLayers: mergeBiasLayers([archetype], scalar),
    biases: { archetype: archetype.id }
  };
}

function optionFromCluster(id, label, hint, archetypes, layerKey, scalar = 0.16) {
  return {
    id,
    label,
    hint,
    archetypeHint: archetypes?.[0]?.id || null,
    clusterKey: layerKey,
    biasLayers: mergeBiasLayers(archetypes, scalar),
    biases: { cluster: layerKey }
  };
}


function optionFromArchetypeIds(id, label, hint, archetypeIds, archetypeMap, scalar = 0.18) {
  const reps = uniqueById((archetypeIds || []).map((entry) => archetypeMap.get(entry)).filter(Boolean));
  return {
    id,
    label,
    hint,
    archetypeHint: reps[0]?.id || null,
    biasLayers: mergeBiasLayers(reps, scalar),
    biases: { archetype: reps[0]?.id || null }
  };
}

const L1_SURVEY_BLUEPRINTS = {
  jedi: {
    combat: {
      text: 'How do you want to handle combat?',
      options: [
        { id: 'protector', label: 'Protector', hint: 'Stand in the front, absorb pressure, and keep allies safe.', archetypeIds: ['tank_guardian'] },
        { id: 'duelist', label: 'Duelist', hint: 'Win clean single-target fights with mobility, reactions, and precision.', archetypeIds: ['precision_striker'] },
        { id: 'caster', label: 'Force Caster', hint: 'Use Force powers to shape the fight and punish clustered enemies.', archetypeIds: ['battlefield_controller','force_burst_striker'] },
        { id: 'flex', label: 'Flexible', hint: 'Stay adaptable so you can fight, move, and solve problems in equal measure.', archetypeIds: ['sentinel_generalist'] }
      ]
    },
    skills: {
      text: 'Which kind of utility matters most?',
      options: [
        { id: 'awareness', label: 'Awareness', hint: 'Spot danger early and stay hard to surprise.', archetypeIds: ['tank_guardian','sentinel_generalist'] },
        { id: 'mobility', label: 'Mobility', hint: 'Move well, reposition, and stay hard to pin down.', archetypeIds: ['precision_striker','sentinel_generalist'] },
        { id: 'presence', label: 'Presence', hint: 'Lean into Force presence, resolve, and social confidence.', archetypeIds: ['battlefield_controller','force_burst_striker'] },
        { id: 'breadth', label: 'Breadth', hint: 'Keep a wider toolkit so the class can answer more situations.', archetypeIds: ['sentinel_generalist'] }
      ]
    },
    archetype: {
      text: 'What role should define you?',
      options: [
        { id: 'frontline', label: 'Frontline', hint: 'You want to anchor the fight and be seen at the center of it.', archetypeIds: ['tank_guardian'] },
        { id: 'skirmish', label: 'Skirmisher', hint: 'You want to dance through engagements and choose your moments.', archetypeIds: ['precision_striker','sentinel_generalist'] },
        { id: 'control', label: 'Controller', hint: 'You want to decide where enemies stand and what they are allowed to do.', archetypeIds: ['battlefield_controller'] },
        { id: 'burst', label: 'Burst', hint: 'You want to hit hard, create momentum, and punish openings.', archetypeIds: ['force_burst_striker'] }
      ]
    },
    future: {
      text: 'What future sounds best right now?',
      options: [
        { id: 'mastery', label: 'Mastery', hint: 'Double down on the core Jedi chassis and become sharper at what already works.', archetypeIds: ['precision_striker','tank_guardian'] },
        { id: 'force', label: 'Force Growth', hint: 'Invest harder into powers, secrets, and a stronger Force identity.', archetypeIds: ['battlefield_controller','force_burst_striker'] },
        { id: 'balance', label: 'Balance', hint: 'Keep your options broad so later prestige choices stay open.', archetypeIds: ['sentinel_generalist'] },
        { id: 'survivability', label: 'Survivability', hint: 'Prioritize durability and consistency before anything flashy.', archetypeIds: ['tank_guardian'] }
      ]
    },
    classSpecific: {
      text: 'What type of Jedi do you want to be?',
      options: [
        { id: 'guardian', label: 'Guardian', hint: 'A durable battlefield protector who wins through steadiness and resolve.', archetypeIds: ['tank_guardian'] },
        { id: 'sentinel', label: 'Sentinel', hint: 'A balanced, practical Jedi who mixes combat, utility, and awareness.', archetypeIds: ['sentinel_generalist'] },
        { id: 'consular', label: 'Consular', hint: 'A Force-centric Jedi who controls space and solves problems with powers.', archetypeIds: ['battlefield_controller'] },
        { id: 'duelist', label: 'Duelist', hint: 'A precise blade specialist who thrives in focused one-on-one fights.', archetypeIds: ['precision_striker'] }
      ]
    }
  },
  noble: {
    combat: { text: 'How do you want to influence a fight?', options: [
      { id:'command', label:'Command', hint:'Lead the team, call the tempo, and make everyone around you stronger.', archetypeIds:['battlefield_commander','tactical_coordinator'] },
      { id:'inspire', label:'Inspire', hint:'Keep morale high and amplify the people doing the heavy lifting.', archetypeIds:['inspirational_supporter'] },
      { id:'outtalk', label:'Outtalk', hint:'Win the fight before it starts by forcing the room to shift your way.', archetypeIds:['master_orator','political_strategist'] },
      { id:'adapt', label:'Adapt', hint:'Stay broad and pick the kind of support the moment actually needs.', archetypeIds:['tactical_coordinator','inspirational_supporter'] }
    ]},
    skills: { text: 'What kind of skill edge do you want?', options: [
      { id:'social', label:'Social', hint:'Charm, persuasion, and political leverage should be your strongest tools.', archetypeIds:['master_orator','political_strategist'] },
      { id:'tactical', label:'Tactical', hint:'You want to read the board, assign jobs, and direct outcomes.', archetypeIds:['battlefield_commander','tactical_coordinator'] },
      { id:'support', label:'Support', hint:'You want to make everyone else better without stealing the spotlight.', archetypeIds:['inspirational_supporter'] },
      { id:'status', label:'Status', hint:'You want authority, reputation, and position to open doors.', archetypeIds:['political_strategist'] }
    ]},
    archetype: { text: 'What role should define you?', options: [
      { id:'leader', label:'Leader', hint:'You want to be the person everyone looks to when decisions matter.', archetypeIds:['battlefield_commander'] },
      { id:'speaker', label:'Speaker', hint:'You want your voice and presence to do the heavy lifting.', archetypeIds:['master_orator'] },
      { id:'planner', label:'Planner', hint:'You want to win by positioning, preparation, and layered advantages.', archetypeIds:['tactical_coordinator','political_strategist'] },
      { id:'anchor', label:'Anchor', hint:'You want to stabilize the group and keep them functioning under pressure.', archetypeIds:['inspirational_supporter'] }
    ]},
    future: { text: 'What future sounds best right now?', options: [
      { id:'command', label:'Higher Command', hint:'You want this build to scale into stronger leadership and battlefield control.', archetypeIds:['battlefield_commander','tactical_coordinator'] },
      { id:'influence', label:'More Influence', hint:'You want your social leverage and political reach to become the focus.', archetypeIds:['master_orator','political_strategist'] },
      { id:'support', label:'Stronger Support', hint:'You want to become the cleanest force multiplier at the table.', archetypeIds:['inspirational_supporter'] },
      { id:'flex', label:'Keep Options Open', hint:'You want room to pivot once the campaign reveals what the party needs.', archetypeIds:['tactical_coordinator','political_strategist'] }
    ]},
    classSpecific: { text: 'What kind of Noble are you building?', options: [
      { id:'commander', label:'Commander', hint:'A battlefield leader who wins by directing allied action.', archetypeIds:['battlefield_commander'] },
      { id:'orator', label:'Orator', hint:'A silver-tongued specialist who changes outcomes with presence and speech.', archetypeIds:['master_orator'] },
      { id:'strategist', label:'Strategist', hint:'A planner who converts setup and positioning into victory.', archetypeIds:['tactical_coordinator','political_strategist'] },
      { id:'patron', label:'Patron', hint:'A supportive noble who empowers allies and keeps the group composed.', archetypeIds:['inspirational_supporter'] }
    ]}
  },
  scoundrel: {
    combat: { text: 'How do you want to win fights?', options: [
      { id:'dirty', label:'Dirty', hint:'You want tricks, debuffs, and disruption to do the real work.', archetypeIds:['debilitating_trickster','saboteur_technician'] },
      { id:'shooting', label:'Shooting', hint:'You want fast accurate ranged damage to define your turns.', archetypeIds:['gunslinger_duelist','opportunistic_precision_striker'] },
      { id:'setup', label:'Setup', hint:'You want to create openings and cash in when enemies slip.', archetypeIds:['opportunistic_precision_striker','debilitating_trickster'] },
      { id:'utility', label:'Utility', hint:'You want combat success to come from clever tools and problem-solving.', archetypeIds:['saboteur_technician','social_manipulator'] }
    ]},
    skills: { text: 'What kind of skill edge matters most?', options: [
      { id:'social', label:'Social', hint:'You want deception, charm, and influence to stay central.', archetypeIds:['social_manipulator'] },
      { id:'tech', label:'Tech', hint:'You want gadgets, sabotage, and systems play to carry weight.', archetypeIds:['saboteur_technician'] },
      { id:'stealth', label:'Stealth', hint:'You want positioning, infiltration, and getting away with things.', archetypeIds:['debilitating_trickster','opportunistic_precision_striker'] },
      { id:'gunplay', label:'Gunplay', hint:'You want your skill package to serve fast and deadly ranged work.', archetypeIds:['gunslinger_duelist'] }
    ]},
    archetype: { text: 'What role should define you?', options: [
      { id:'trickster', label:'Trickster', hint:'You want to win through misdirection and control.', archetypeIds:['debilitating_trickster'] },
      { id:'gunslinger', label:'Gunslinger', hint:'You want to be known for clean and dangerous ranged pressure.', archetypeIds:['gunslinger_duelist'] },
      { id:'operator', label:'Operator', hint:'You want to solve problems with tools, setup, and technical leverage.', archetypeIds:['saboteur_technician'] },
      { id:'face', label:'Face', hint:'You want your social game to be your sharpest weapon.', archetypeIds:['social_manipulator'] }
    ]},
    future: { text: 'What future sounds best right now?', options: [
      { id:'more-damage', label:'More Damage', hint:'You want to press harder into reliable striker output.', archetypeIds:['gunslinger_duelist','opportunistic_precision_striker'] },
      { id:'more-tricks', label:'More Tricks', hint:'You want a deeper bag of control and dirty options.', archetypeIds:['debilitating_trickster','saboteur_technician'] },
      { id:'more-social', label:'More Influence', hint:'You want to scale your face game and narrative leverage.', archetypeIds:['social_manipulator'] },
      { id:'stay-flexible', label:'Stay Flexible', hint:'You want to keep the class broad and opportunistic.', archetypeIds:['saboteur_technician','social_manipulator'] }
    ]},
    classSpecific: { text: 'What kind of Scoundrel are you building?', options: [
      { id:'sharpshooter', label:'Sharpshooter', hint:'A precise opportunist who turns small openings into big damage.', archetypeIds:['opportunistic_precision_striker','gunslinger_duelist'] },
      { id:'saboteur', label:'Saboteur', hint:'A technical troublemaker who controls scenes through gear and disruption.', archetypeIds:['saboteur_technician'] },
      { id:'con-artist', label:'Con Artist', hint:'A manipulator who bends people as easily as situations.', archetypeIds:['social_manipulator'] },
      { id:'trickster', label:'Trickster', hint:'A battlefield nuisance who wins by ruining enemy plans.', archetypeIds:['debilitating_trickster'] }
    ]}
  },
  scout: {
    combat: { text: 'How do you want to fight?', options: [
      { id:'mobile', label:'Mobile', hint:'Keep moving, strike from angles, and avoid static trades.', archetypeIds:['mobile_skirmisher','pilot_operative'] },
      { id:'range', label:'Ranged', hint:'Use distance, sight lines, and clean shots to stay ahead.', archetypeIds:['recon_sniper'] },
      { id:'pressure', label:'Pressure', hint:'Wear targets down with control, conditions, and relentless pursuit.', archetypeIds:['condition_harrier'] },
      { id:'survival', label:'Endurance', hint:'Outlast the environment and the encounter alike.', archetypeIds:['wilderness_survivalist'] }
    ]},
    skills: { text: 'What kind of utility matters most?', options: [
      { id:'tracking', label:'Tracking', hint:'You want to read terrain, follow signs, and never lose the trail.', archetypeIds:['wilderness_survivalist'] },
      { id:'piloting', label:'Piloting', hint:'Vehicle mastery and movement skill should matter every session.', archetypeIds:['pilot_operative'] },
      { id:'stealth', label:'Stealth', hint:'You want infiltration, scouting, and unseen positioning.', archetypeIds:['mobile_skirmisher','recon_sniper'] },
      { id:'fieldcraft', label:'Fieldcraft', hint:'You want broad operational competence in wild or hostile spaces.', archetypeIds:['wilderness_survivalist','condition_harrier'] }
    ]},
    archetype: { text: 'What role should define you?', options: [
      { id:'skirmisher', label:'Skirmisher', hint:'You want to stay in motion and create hard-to-answer turns.', archetypeIds:['mobile_skirmisher'] },
      { id:'sniper', label:'Sniper', hint:'You want patience, vision, and ranged precision to define the class.', archetypeIds:['recon_sniper'] },
      { id:'hunter', label:'Hunter', hint:'You want pursuit, pressure, and steady attrition.', archetypeIds:['condition_harrier','wilderness_survivalist'] },
      { id:'pilot', label:'Pilot', hint:'You want the class to speak through vehicles and speed.', archetypeIds:['pilot_operative'] }
    ]},
    future: { text: 'What future sounds best right now?', options: [
      { id:'specialize', label:'Specialize', hint:'You want to sharpen one lane until it becomes your signature.', archetypeIds:['recon_sniper','pilot_operative'] },
      { id:'survive', label:'Survive Anything', hint:'You want the class to stay resilient across hostile environments.', archetypeIds:['wilderness_survivalist'] },
      { id:'control', label:'Control Space', hint:'You want to dictate movement and pace more aggressively over time.', archetypeIds:['condition_harrier','mobile_skirmisher'] },
      { id:'keep-open', label:'Stay Open', hint:'You want to leave room for later pivots based on the campaign.', archetypeIds:['mobile_skirmisher','pilot_operative'] }
    ]},
    classSpecific: { text: 'What kind of Scout are you building?', options: [
      { id:'pathfinder', label:'Pathfinder', hint:'A field specialist who survives first and guides others through danger.', archetypeIds:['wilderness_survivalist'] },
      { id:'sniper', label:'Sniper', hint:'A long-range eliminator who wins with range and information.', archetypeIds:['recon_sniper'] },
      { id:'skirmisher', label:'Skirmisher', hint:'A fast-moving scout who fights through motion and angles.', archetypeIds:['mobile_skirmisher'] },
      { id:'ace', label:'Ace', hint:'A pilot-first scout whose class identity is tied to vehicles and speed.', archetypeIds:['pilot_operative'] }
    ]}
  },
  soldier: {
    combat: { text: 'How do you want to fight?', options: [
      { id:'heavy', label:'Heavy', hint:'Use raw firepower and area pressure to dominate space.', archetypeIds:['heavy_weapons_specialist'] },
      { id:'breach', label:'Breacher', hint:'Get close, hit hard, and force the fight into your preferred range.', archetypeIds:['close_quarters_breacher'] },
      { id:'rifle', label:'Rifleman', hint:'Lean on precision, range, and disciplined attack routines.', archetypeIds:['precision_rifleman'] },
      { id:'tank', label:'Tank', hint:'Stand up front, absorb punishment, and keep moving anyway.', archetypeIds:['armored_shock_trooper'] }
    ]},
    skills: { text: 'What kind of edge matters most?', options: [
      { id:'durability', label:'Durability', hint:'You want armor, endurance, and staying power to define the class.', archetypeIds:['armored_shock_trooper'] },
      { id:'accuracy', label:'Accuracy', hint:'You want to hit what matters and waste as few actions as possible.', archetypeIds:['precision_rifleman'] },
      { id:'control', label:'Control', hint:'You want to shape enemy behavior through suppression and conditions.', archetypeIds:['battlefield_enforcer','heavy_weapons_specialist'] },
      { id:'pressure', label:'Pressure', hint:'You want every turn to threaten immediate damage.', archetypeIds:['close_quarters_breacher','heavy_weapons_specialist'] }
    ]},
    archetype: { text: 'What role should define you?', options: [
      { id:'frontline', label:'Frontline', hint:'You want to be the one holding the line when the fight turns ugly.', archetypeIds:['armored_shock_trooper'] },
      { id:'striker', label:'Striker', hint:'You want your turns to convert directly into enemy damage.', archetypeIds:['precision_rifleman','close_quarters_breacher'] },
      { id:'controller', label:'Controller', hint:'You want to use weapons to shape the battlefield, not just damage it.', archetypeIds:['heavy_weapons_specialist','battlefield_enforcer'] },
      { id:'bruiser', label:'Bruiser', hint:'You want to be aggressive, physical, and hard to stop once engaged.', archetypeIds:['close_quarters_breacher','armored_shock_trooper'] }
    ]},
    future: { text: 'What future sounds best right now?', options: [
      { id:'bigger-guns', label:'Bigger Guns', hint:'You want more destructive output and stronger weapon scaling.', archetypeIds:['heavy_weapons_specialist','precision_rifleman'] },
      { id:'harder-to-kill', label:'Harder to Kill', hint:'You want to become more dependable under focused enemy pressure.', archetypeIds:['armored_shock_trooper'] },
      { id:'control-more', label:'More Control', hint:'You want conditions, suppression, and battlefield influence to grow.', archetypeIds:['battlefield_enforcer'] },
      { id:'stay-versatile', label:'Stay Versatile', hint:'You want room to pivot depending on party needs and gear.', archetypeIds:['close_quarters_breacher','precision_rifleman'] }
    ]},
    classSpecific: { text: 'What kind of Soldier are you building?', options: [
      { id:'heavy', label:'Heavy Gunner', hint:'A wide-area damage dealer who wins by forcing people out of safe positions.', archetypeIds:['heavy_weapons_specialist'] },
      { id:'shock', label:'Shock Trooper', hint:'A heavily armored frontline soldier who keeps advancing.', archetypeIds:['armored_shock_trooper'] },
      { id:'marksman', label:'Marksman', hint:'A disciplined ranged specialist built around precision fire.', archetypeIds:['precision_rifleman'] },
      { id:'enforcer', label:'Enforcer', hint:'A pressure build that drives enemies down the condition track.', archetypeIds:['battlefield_enforcer'] }
    ]}
  }
};

function buildL1Questions({ classId, archetypes }) {
  const blueprint = L1_SURVEY_BLUEPRINTS[classId];
  if (!blueprint) return null;
  const archetypeMap = new Map((archetypes || []).map((entry) => [entry.id, entry]));
  const entries = [
    ['combat', 'Combat'],
    ['skills', 'Skills'],
    ['archetype', 'Archetype'],
    ['future', 'Future Plans'],
    ['classSpecific', 'Class Focus']
  ];
  return entries.map(([key, fallbackLabel], index) => {
    const question = blueprint[key];
    return {
      id: `${classId}_${key}`,
      text: question?.text || fallbackLabel,
      options: (question?.options || []).map((option) => optionFromArchetypeIds(
        `${classId}_${key}_${option.id}`,
        option.label,
        option.hint,
        option.archetypeIds,
        archetypeMap,
        key === 'classSpecific' ? 0.22 : 0.18
      ))
    };
  }).filter((entry) => entry.options.length);
}


function makeQuestions({ classId, classDisplayName, archetypes, mentor }) {
  const profile = getMentorVoiceProfile(mentor, classDisplayName);
  const topArchetypes = uniqueById(archetypes).slice(0, 4);
  const roleKeys = topKeys(archetypes.map((a) => a.roleBias), 4, new Set(['support']));
  const mechKeys = topKeys(archetypes.map((a) => a.mechanicalBias), 4);
  const attrKeys = topKeys(archetypes.map((a) => a.attributeBias), 4);
  const questionSet = [];

  questionSet.push({
    id: `${classId}_path`,
    text: buildQuestionText('path', profile, mentor.name, classDisplayName),
    options: [
      ...topArchetypes.map((a) => optionFromArchetype(a, classDisplayName, 0.22)),
      { id: `${classId}_path_uncertain`, label: 'I am still feeling out the shape of this path.', hint: 'Keep the guidance broad for now.', biasLayers: { mechanicalBias: {}, roleBias: {}, attributeBias: {} }, biases: {} }
    ]
  });

  questionSet.push({
    id: `${classId}_role`,
    text: buildQuestionText('role', profile, mentor.name, classDisplayName),
    options: roleKeys.map((key) => {
      const reps = findBestArchetypesByKey(archetypes, 'roleBias', key, 3);
      return optionFromCluster(`${classId}_role_${key}`, `${titleCaseKey(key)} — ${reps[0]?.notes || `Lean into the ${titleCaseKey(key).toLowerCase()} side of ${classDisplayName}.`}`, reps[0]?.name || '', reps, key, 0.16);
    })
  });

  questionSet.push({
    id: `${classId}_discipline`,
    text: buildQuestionText('mechanics', profile, mentor.name, classDisplayName),
    options: mechKeys.map((key) => {
      const reps = findBestArchetypesByKey(archetypes, 'mechanicalBias', key, 3);
      return optionFromCluster(`${classId}_discipline_${key}`, `${titleCaseKey(key)} — ${reps[0]?.name || titleCaseKey(key)}`, reps[0]?.notes || `Push ${titleCaseKey(key).toLowerCase()} harder than the rest.`, reps, key, 0.15);
    })
  });

  questionSet.push({
    id: `${classId}_instinct`,
    text: buildQuestionText('attribute', profile, mentor.name, classDisplayName),
    options: attrKeys.map((key) => {
      const reps = findBestArchetypesByKey(archetypes, 'attributeBias', key, 3);
      const attributeLabelMap = {
        strength: 'Power',
        dexterity: 'Precision',
        constitution: 'Hardiness',
        intelligence: 'Know-how',
        wisdom: 'Awareness',
        charisma: 'Presence'
      };
      const normalized = normalizeAttributeKey(key);
      const displayLabel = attributeLabelMap[normalized] || titleCaseKey(normalized);
      return optionFromCluster(`${classId}_instinct_${key}`, `${displayLabel} — ${reps[0]?.name || classDisplayName}`, reps[0]?.notes || `Let ${displayLabel.toLowerCase()} carry this path.`, reps, key, 0.14);
    })
  });

  questionSet.push({
    id: `${classId}_legacy`,
    text: buildQuestionText('legacy', profile, mentor.name, classDisplayName),
    options: topArchetypes.map((a) => ({
      id: `${classId}_legacy_${a.id}`,
      label: `${a.name} — ${a.notes || `Finish as a ${a.name.toLowerCase()}.`}`,
      hint: a.notes || '',
      archetypeHint: a.id,
      biasLayers: mergeBiasLayers([a], 0.20),
      biases: { archetype: a.id, commitment: 1 }
    }))
  });

  return questionSet.filter((q) => q.options?.length);
}

export function buildSurveyDefinition(source) {
  const mentor = MENTORS[source.mentorKey] || MENTORS[source.displayName] || MENTORS.Scoundrel;
  const archetypes = deepClone(source.archetypes || []).map((entry) => ({
    ...entry,
    id: entry.id || entry.slug || entry.name?.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }));
  const surveyType = CORE_CLASS_IDS.has(source.classId) ? 'l1' : 'prestige';
  return {
    surveyId: source.surveyId,
    surveyType,
    classId: source.classId,
    classDisplayName: source.displayName,
    mentorKey: source.mentorKey,
    mentor,
    archetypes,
    questions: (surveyType === 'l1' ? buildL1Questions({ classId: source.classId, archetypes }) : null) || makeQuestions({ classId: source.classId, classDisplayName: source.displayName, archetypes, mentor })
  };
}
