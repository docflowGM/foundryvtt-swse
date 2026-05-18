/**
 * Talent tree mentor commentary
 *
 * This module keeps mentor flavor separate from the talent step renderer. The
 * selected mentor remains the speaking voice, while the tree profile supplies
 * mechanical context and alignment tension. Every tree gets an informative read:
 * exact tree groups handle known SWSE talent trees, and the fallback classifier
 * covers future/custom trees without switching mentors or mutating any theme.
 */

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, limit = 190) {
  const text = cleanText(value);
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1)).trim()}...` : text;
}

function sentence(value) {
  const text = cleanText(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

const TREE_GROUPS = [
  {
    names: ['Lightsaber Combat', 'Lightsaber Forms', 'Jedi Weapon Master', 'Jedi Battlemaster'],
    domain: 'jedi',
    role: 'lightsaber discipline',
    mechanic: 'It improves lightsaber-centered offense, defense, forms, and the ability to turn positioning into control.',
    advice: 'It is strongest when the character expects to stand in melee often and wants both protection and decisive pressure.',
    values: ['discipline', 'defense', 'melee'],
  },
  {
    names: ['Jedi Consular', 'Jedi Guardian', 'Jedi Sentinel', 'Jedi Shadow', 'Jedi Watchman', 'Jedi Archivist', 'Jedi Healer', 'Jedi Refugee', 'Jedi Artisan', 'Jedi Instructor', 'Jedi Investigator', 'Knight\'s Resolve', 'Knight\'s Armor'],
    domain: 'jedi',
    role: 'Jedi discipline',
    mechanic: 'It develops a Jedi role through restraint, awareness, Force technique, protection, investigation, or service.',
    advice: 'Choose it when the build should feel guided by duty, patience, and a clear function in the party.',
    values: ['discipline', 'light', 'force'],
  },
  {
    names: ['Force Adept', 'Force Item', 'Mystic', 'Telepath', 'Shaper', 'Beastwarden'],
    domain: 'force',
    role: 'Force tradition',
    mechanic: 'It expands nonstandard Force practice, spiritual perception, crafted focus, or unusual relationships with living beings.',
    advice: 'It fits characters who want the Force to solve problems through insight and adaptation rather than direct weapon mastery.',
    values: ['force', 'mystic'],
  },
  {
    names: ['Dark Side Devotee', 'Sith', 'Sith Alchemy', 'Sith Commander', 'Imperial Inquisitor', 'Disgrace', 'Exile'],
    domain: 'dark',
    role: 'dark-side power',
    mechanic: 'It turns fear, pain, anger, corruption, and domination into aggressive pressure and battlefield leverage.',
    advice: 'It can be powerful, but it asks the character to win by embracing risk, intimidation, and moral consequence.',
    values: ['dark', 'force', 'coercion'],
  },
  {
    names: ['Armor Specialist', 'Protection', 'Loyal Protector', 'Vanguard', 'Survivor'],
    domain: 'military',
    role: 'defensive combat',
    mechanic: 'It improves durability, protection, and the ability to stay functional while enemies focus fire on you or your allies.',
    advice: 'It is strongest for characters who expect to hold space, protect others, or survive long fights.',
    values: ['defense', 'combat'],
  },
  {
    names: ['Commando', 'Mandalorian Warrior', 'Weapon Master', 'Weapon Specialist', 'Military Tactics', 'Republic Commando', 'Mercenary', 'Enforcement', 'Military Engineer', 'Squad Leader', 'Squadron Leader', 'Trooper', 'Carbineer', 'Sharpshooter', 'Veteran', 'Critical Master', 'Gunner', 'Turret'],
    domain: 'military',
    role: 'battlefield doctrine',
    mechanic: 'It improves battlefield reliability through weapons, squad tactics, suppression, fire support, or tactical positioning.',
    advice: 'It rewards a clear combat job: break targets, anchor a squad, exploit openings, or make allies safer.',
    values: ['combat', 'tactics'],
  },
  {
    names: ['Brawler', 'Duelist', 'Fencing', 'Gladiatorial Combat', 'Master of Teras Kasi', 'Melee Duelist', 'Melee Specialist', 'Brute Squad', 'Martial Arts Forms', 'Shockboxer', 'Unarmed Mastery', 'Warrior'],
    domain: 'martial',
    role: 'personal combat',
    mechanic: 'It improves close-quarters control, dueling pressure, unarmed technique, or melee finishing power.',
    advice: 'It fits characters who want their body, blade, or chosen weapon to be the center of the fight.',
    values: ['melee', 'combat'],
  },
  {
    names: ['Awareness', 'Camouflage', 'Fringer', 'Hyperspace Explorer', 'Pathfinder', 'Reconnaissance', 'Surveillance', 'Master Scout', 'Mobile Scout', 'Outsider', 'Advance Patrol', 'Anticipation'],
    domain: 'scout',
    role: 'field craft',
    mechanic: 'It improves scouting, survival, ambush avoidance, mobility, perception, and control of uncertain terrain.',
    advice: 'It is strongest when the character wants to act first because they noticed danger before anyone else did.',
    values: ['survival', 'awareness'],
  },
  {
    names: ['Bounty Hunter', 'Gand Findsman', 'Force Hunter', 'Assassin', 'GenoHaradan', 'Malkite Poisoner', 'Infiltration', 'Spy', 'Espionage', 'Master of Intrigue', 'Sabotage'],
    domain: 'intrigue',
    role: 'covert pressure',
    mechanic: 'It improves pursuit, assassination, infiltration, poison, surveillance, or quiet control of a target before open combat begins.',
    advice: 'It rewards patience, preparation, and characters who prefer to decide the fight before the enemy knows there is one.',
    values: ['stealth', 'control'],
  },
  {
    names: ['Expert Pilot', 'Spacer', 'Naval Officer', 'Rocket Jumper', 'Run and Gun', 'Blockade Runner', 'Privateer', 'Piracy', 'Wingman'],
    domain: 'pilot',
    role: 'spacefaring action',
    mechanic: 'It improves piloting, mobility, starship action, boarding pressure, or fighting while the battlefield refuses to stand still.',
    advice: 'It fits characters who expect speed, vehicles, ships, or movement tricks to define their best scenes.',
    values: ['mobility', 'ships'],
  },
  {
    names: ['Gunslinger', 'Pistoleer', 'Outlaw', 'Brigand', 'Ambusher', 'Opportunist', 'Misfortune', 'Fortune', 'Trickery', 'Gambling Leader', 'Improviser', 'Unpredictable', 'Recklessness'],
    domain: 'scoundrel',
    role: 'dirty advantage',
    mechanic: 'It improves opportunism, trick shots, luck, misdirection, risk-taking, and turning bad odds into sudden advantage.',
    advice: 'It works best when the player wants the character to win through timing and nerve rather than clean procedure.',
    values: ['luck', 'cunning'],
  },
  {
    names: ['Smuggling', 'Procurement', 'Outlaw Tech', 'Slicer', 'Fugitive Commander', 'Provocateur'],
    domain: 'underworld',
    role: 'underworld leverage',
    mechanic: 'It improves illicit access, black-market tools, misdirection, slicing, getaway planning, or turning society\'s blind spots into assets.',
    advice: 'It fits characters who want resources, contacts, and trouble to become part of their toolkit.',
    values: ['cunning', 'resources'],
  },
  {
    names: ['Infamy', 'Influence', 'Inspiration', 'Leadership', 'Lineage', 'Mastermind', 'Corporate Power', 'Ideologue', 'Collaborator', 'Rebel Recruiter', 'Revolutionary', 'Superior Skills', 'Skill Challenge', 'Versatility', 'Bothan SpyNet'],
    domain: 'social',
    role: 'social command',
    mechanic: 'It turns words, reputation, command presence, ideology, and networks into practical power in and out of combat.',
    advice: 'It is strongest when the character wants allies, enemies, and bystanders to change the shape of the encounter.',
    values: ['presence', 'leadership'],
  },
  {
    names: ['Advanced Medicine', 'Jedi Healer'],
    domain: 'medical',
    role: 'medical support',
    mechanic: 'It improves recovery, triage, stabilizing allies, and keeping the group functional when the fight gets ugly.',
    advice: 'It rewards a player who wants saving lives to matter as much as dealing damage.',
    values: ['support', 'healing'],
  },
  {
    names: ['Autonomy', 'Specialized Droid', 'Droid Commander', 'Elite Droid', 'Override', 'Implant'],
    domain: 'droid',
    role: 'machine logic',
    mechanic: 'It improves droid independence, command protocols, upgrades, systems control, or cybernetic specialization.',
    advice: 'It is strongest when the character is built around precision, upgrades, and reliable technical function.',
    values: ['droid', 'systems'],
  },
  {
    names: ['Yuuzhan Vong Biotech'],
    domain: 'vong',
    role: 'living technology',
    mechanic: 'It uses organic tools, biotechnology, and alien adaptation instead of standard machines or familiar weapons.',
    advice: 'It is an unusual path that should define the character concept rather than merely decorate it.',
    values: ['alien', 'craft'],
  },
];

const TREE_PROFILE_BY_KEY = new Map();
for (const group of TREE_GROUPS) {
  for (const name of group.names) {
    TREE_PROFILE_BY_KEY.set(normalizeKey(name), group);
  }
}

const TREE_OVERRIDES = {
  'lightsaber-combat': {
    jedi: 'The lightsaber is an elegant and precise weapon. Mastering it takes time and patience. This tree can shape both offense and defense, so invest where your role in the fight is clearest.',
    pirate: 'Aye, so ye want to put yer faith in a glowing blade. Fine choice if ye can close the distance, but do not forget - a fancy sword still needs a survivor holdin\' it.',
    sith: 'A lightsaber is not a symbol. It is a verdict. This tree teaches precision, defense, and the moment when hesitation should end.',
    protocol: '[Observation] Lightsaber Combat increases both survivability and decisive melee output. A balanced investment can preserve the master while ending threats efficiently.',
  },
  'influence': {
    protocol: '[Declaration] The power of your words is formidable, master. This tree can convince opponents to surrender, weaken resolve, and turn a conflict before the blade is drawn.',
    jedi: 'Influence can calm a room or bend it. Use this tree to guide others toward better choices, not to make their choices for them.',
    pirate: 'Words be cheaper than tibanna gas and twice as useful. This tree helps ye win a fight before anyone draws, if ye can sell the story proper.',
    sith: 'Influence is power without wasted motion. Let others believe they chose the path while you decide where it leads.',
  },
  'infamy': {
    jedi: 'Infamy trades trust for fear. A Jedi should stay wary of chicanery and underhanded tricks; justice is what we seek, not victory that hollows the spirit.',
    pirate: 'Infamy? Har! A reputation opens doors, empties rooms, and makes fools think twice. Just mind that the loudest name draws the biggest guns.',
    protocol: '[Caution] Infamy weaponizes reputation. It can discourage opposition, but it may also degrade diplomatic outcomes and long-term trust.',
  },
  'sith': {
    jedi: 'I do not know why you are trying to draw power from the dark side, but tread carefully. Rage answers quickly, then asks for more than you meant to give.',
    pirate: 'That be dark currents, matey. Power, aye, but the sort that leaves teeth marks on the soul. Use it and it may start usin\' you back.',
    sith: 'Good. The Sith path rewards will, hunger, and the courage to seize what weaker beings only request.',
  },
  'dark-side-devotee': {
    jedi: 'This tree studies the dark side directly. It can make fear and anger into weapons, but those weapons cut inward if you stop questioning them.',
    sith: 'Devotion is how power stops being borrowed and starts becoming yours. Let this tree sharpen your fear into command.',
  },
  'jedi-guardian': {
    pirate: 'Aye, ye really be a Jedi knight now? Goin\' to protect the innocent, are ye? If so, this tree gives ye the hide and nerve to stand where blaster fire lands.',
    sith: 'Guardian discipline wastes strength on protection, but it does teach endurance. Study it if you must learn why defenders are difficult to break.',
  },
  'misfortune': {
    jedi: 'Misfortune twists openings out of another being\'s failure. Useful, yes, but be sure you are not learning to delight in the fall.',
    pirate: 'Now this is proper fun. Misfortune lets ye turn another fool\'s bad day into yer payday.',
  },
  'smuggling': {
    jedi: 'Smuggling is born from hiding truth and cargo alike. If you walk this path, understand whether you are protecting the vulnerable or merely avoiding consequence.',
    pirate: 'Finally, a respectable education. Smuggling is about routes, nerve, and knowin\' which customs officer looks hungry enough to bargain.',
  },
  'jedi-healer': {
    medic: 'This tree understands that survival is not glory, it is responsibility. Healing changes the whole encounter because an ally who stands again can still choose.',
    jedi: 'Healing is not a lesser path. To preserve life when fear demands violence is one of the clearest expressions of the Force.',
  },
  'override': {
    protocol: '[Security Advisory] Override talents can seize control of hostile systems. This is powerful, but all command intrusion should be treated as a high-risk protocol.',
    droid: '[Directive] Override expands command authority over machines and systems. Efficient use can end a threat before organic improvisation complicates the field.',
  },
};

const MENTOR_PROFILES = [
  {
    key: 'jedi',
    test: /miraj|jedi|knight|master|seeker|vera|riquis|force mystic|shaman/,
    label: 'Jedi counsel',
    aligned: ['jedi', 'force', 'medical'],
    wary: ['military', 'martial', 'social', 'scout', 'pilot', 'droid', 'vong'],
    opposed: ['dark', 'underworld', 'scoundrel', 'intrigue'],
  },
  {
    key: 'sith',
    test: /malbada|miedo|sith|dark lord|inquisitor/,
    label: 'Sith doctrine',
    aligned: ['dark', 'military', 'martial', 'social'],
    wary: ['scoundrel', 'intrigue', 'pilot', 'droid', 'vong'],
    opposed: ['jedi', 'medical'],
  },
  {
    key: 'protocol',
    test: /j0|j0-n1|protocol|butler/,
    label: 'Protocol analysis',
    aligned: ['social', 'droid', 'medical', 'noble'],
    wary: ['underworld', 'scoundrel', 'dark', 'intrigue'],
    opposed: [],
  },
  {
    key: 'pirate',
    test: /salty|pirate|privateer|captain|smuggler|scoundrel|outlaw|rogue|hutt|crime|silvertongue|lucky jack/,
    label: 'Spacer read',
    aligned: ['scoundrel', 'underworld', 'pilot', 'social'],
    wary: ['jedi', 'military', 'martial', 'droid', 'intrigue'],
    opposed: [],
  },
  {
    key: 'soldier',
    test: /breach|mandalorian|soldier|trooper|commander|admiral|officer|shield|vanguard|theron|korr|axiom/,
    label: 'Tactical read',
    aligned: ['military', 'martial', 'protection', 'pilot'],
    wary: ['social', 'scoundrel', 'underworld', 'dark', 'jedi', 'force'],
    opposed: [],
  },
  {
    key: 'scout',
    test: /lead|scout|pathfinder|delta|sniper|operative|spy|infiltration|marl|argent/,
    label: 'Field read',
    aligned: ['scout', 'intrigue', 'pilot', 'martial'],
    wary: ['social', 'dark', 'jedi', 'underworld'],
    opposed: [],
  },
  {
    key: 'medic',
    test: /kyber|medic|healer|doctor|pacifist/,
    label: 'Triage read',
    aligned: ['medical', 'jedi', 'social'],
    wary: ['military', 'martial', 'dark', 'intrigue', 'underworld'],
    opposed: ['dark'],
  },
  {
    key: 'droid',
    test: /seraphim|droid|ai|logic/,
    label: 'Systems read',
    aligned: ['droid', 'tech', 'military', 'social'],
    wary: ['force', 'jedi', 'dark', 'scoundrel'],
    opposed: [],
  },
  {
    key: 'gladiator',
    test: /pegar|gladiator|zhen|kharjo|duelist|empty hand/,
    label: 'Arena read',
    aligned: ['martial', 'military'],
    wary: ['social', 'intrigue', 'underworld', 'force', 'jedi', 'dark'],
    opposed: [],
  },
  {
    key: 'tech',
    test: /engineer|rax|spark|saboteur|tech|slicer/,
    label: 'Technical read',
    aligned: ['droid', 'underworld', 'military', 'intrigue', 'vong'],
    wary: ['jedi', 'dark', 'force', 'social'],
    opposed: [],
  },
];

function getTreeProfile(tree = {}, visual = {}) {
  const treeName = tree?.name || 'this talent tree';
  const exact = TREE_PROFILE_BY_KEY.get(normalizeKey(treeName));
  if (exact) return { ...exact, treeName };

  const source = `${treeName} ${tree?.id || ''} ${tree?.category || ''} ${(tree?.tags || []).join(' ')} ${tree?.description || tree?.system?.description || ''}`.toLowerCase();
  const visualKey = visual?.key || '';

  if (visualKey === 'sith' || /sith|dark|rage|fear|corrupt|inquisitor/.test(source)) {
    return {
      treeName,
      domain: 'dark',
      role: 'dark-side pressure',
      mechanic: 'It turns fear, aggression, or coercion into direct pressure on the scene.',
      advice: 'It is powerful when the player wants a dangerous and confrontational path.',
      values: ['dark'],
    };
  }
  if (visualKey === 'jedi' || /jedi|force|lightsaber|mystic/.test(source)) {
    return {
      treeName,
      domain: 'jedi',
      role: 'Force discipline',
      mechanic: 'It uses Force training, discipline, or lightsaber practice to define a clear heroic role.',
      advice: 'It fits characters whose identity is built around the Force or principled protection.',
      values: ['force'],
    };
  }
  if (visualKey === 'military' || /weapon|armor|soldier|commando|trooper|tactic|squad|battle/.test(source)) {
    return {
      treeName,
      domain: 'military',
      role: 'battlefield doctrine',
      mechanic: 'It improves reliable combat function, tactical pressure, or the ability to hold a battlefield role.',
      advice: 'It fits characters who want their contribution in a fight to be obvious and repeatable.',
      values: ['combat'],
    };
  }
  if (visualKey === 'noble' || /lead|influence|command|corporate|reputation|infamy|inspire/.test(source)) {
    return {
      treeName,
      domain: 'social',
      role: 'social command',
      mechanic: 'It uses presence, command, reputation, or networks to change how others act.',
      advice: 'It fits players who want words and status to matter as much as weapons.',
      values: ['presence'],
    };
  }
  if (visualKey === 'scoundrel' || /smuggl|outlaw|trick|fortune|gambl|slicer|piracy|misfortune/.test(source)) {
    return {
      treeName,
      domain: 'scoundrel',
      role: 'cunning advantage',
      mechanic: 'It converts risk, improvisation, tricks, or illicit access into practical advantage.',
      advice: 'It fits characters who want flexible answers and unpredictable turns.',
      values: ['cunning'],
    };
  }
  if (visualKey === 'scout' || /scout|surviv|path|recon|aware|camouflage|fringer/.test(source)) {
    return {
      treeName,
      domain: 'scout',
      role: 'field craft',
      mechanic: 'It improves awareness, survival, movement, and preparedness under uncertain conditions.',
      advice: 'It fits characters who want to notice danger early and keep options open.',
      values: ['survival'],
    };
  }
  if (visualKey === 'droid' || /droid|processor|system|override|implant|mechanical/.test(source)) {
    return {
      treeName,
      domain: 'droid',
      role: 'systems specialization',
      mechanic: 'It improves technical reliability, command logic, upgrades, or machine interaction.',
      advice: 'It fits characters who want precision, repeatability, and upgrade-driven identity.',
      values: ['systems'],
    };
  }

  return {
    treeName,
    domain: 'general',
    role: 'specialized training',
    mechanic: 'It adds a focused package of talents that should support the role this character is already becoming.',
    advice: 'Use the legal options to decide whether this path strengthens the concept or merely distracts from it.',
    values: ['general'],
  };
}

function getMentorProfile(shellOrMentor) {
  const mentor = shellOrMentor?.mentor || shellOrMentor?.progressionSession?.mentor || shellOrMentor || {};
  const name = mentor?.name || mentor?.displayName || mentor?.mentorId || mentor?.id || 'Your mentor';
  const title = mentor?.title || mentor?.description || '';
  const keySource = `${mentor?.id || ''} ${mentor?.mentorId || ''} ${name} ${title}`;
  const normalized = normalizeKey(keySource);
  const profile = MENTOR_PROFILES.find(entry => entry.test.test(normalized)) || {
    key: 'general',
    label: 'Mentor read',
    aligned: [],
    wary: ['dark', 'underworld', 'scoundrel', 'intrigue'],
    opposed: [],
  };
  return {
    ...profile,
    name,
    title,
    normalized,
  };
}

function getStance(profile, treeProfile) {
  const domain = treeProfile?.domain || 'general';
  if (profile?.opposed?.includes(domain)) return 'opposed';
  if (profile?.aligned?.includes(domain)) return 'aligned';
  if (profile?.wary?.includes(domain)) return 'wary';
  if (domain === 'dark' && profile?.key === 'jedi') return 'opposed';
  if (domain === 'jedi' && profile?.key === 'sith') return 'opposed';
  return 'neutral';
}

function getStanceLabel(stance) {
  switch (stance) {
    case 'aligned': return 'Approved insight';
    case 'opposed': return 'Cautious objection';
    case 'wary': return 'Qualified warning';
    default: return 'Context read';
  }
}

function getTone(profile, stance, treeProfile) {
  if (profile?.key === 'protocol' || profile?.key === 'droid') return 'analytical';
  if (profile?.key === 'sith') return stance === 'opposed' ? 'cold' : 'intense';
  if (profile?.key === 'pirate') return 'wry';
  if (profile?.key === 'soldier') return 'decisive';
  if (profile?.key === 'scout') return 'steady';
  if (profile?.key === 'medic') return stance === 'opposed' ? 'concerned' : 'gentle';
  if (profile?.key === 'jedi') return stance === 'opposed' ? 'concerned' : 'calm';
  if (treeProfile?.domain === 'dark') return 'intense';
  return 'thoughtful';
}

function getPickClause(recommendation = null) {
  const topTalent = recommendation?.topTalentName;
  const legalCount = Number(recommendation?.legalChoiceCount);
  if (topTalent) return ` The strongest legal signal right now is ${topTalent}.`;
  if (Number.isFinite(legalCount) && legalCount > 0) return ` The holomap shows ${legalCount} legal option${legalCount === 1 ? '' : 's'} right now.`;
  return ' Open the holomap to see which branches are actually legal right now.';
}

function renderOverride(profile, treeProfile, recommendation) {
  const override = TREE_OVERRIDES[normalizeKey(treeProfile?.treeName)];
  if (!override) return '';
  return override[profile.key] || override[profile.family] || override.general || '';
}

function renderGenericLine(profile, treeProfile, stance) {
  const name = treeProfile.treeName;
  const role = treeProfile.role;

  if (profile.key === 'protocol') {
    if (stance === 'opposed' || stance === 'wary') return `[Caution] ${name} is a ${role} path. It is operationally useful, but its social and ethical side effects should be evaluated before commitment.`;
    return `[Analysis] ${name} is a ${role} path. It provides a clear functional package if its legal talents match the master's current objectives.`;
  }

  if (profile.key === 'droid') {
    return `[Diagnostic] ${name} maps to ${role}. Select it only if the output profile improves the unit's assigned battlefield or support function.`;
  }

  if (profile.key === 'pirate') {
    if (treeProfile.domain === 'jedi') return `Aye, ${name} is a proper noble road, if ye have the patience for it. It can make ye steadier, harder to crack, and annoyingly heroic.`;
    if (treeProfile.domain === 'dark') return `${name} sails in black water. There be power there, sure enough, but power that starts whisperin' orders back.`;
    if (stance === 'aligned') return `${name}? Now that has some bite. It gives ye tools to survive, outtalk, outfly, or outfox the poor fool on the other side.`;
    return `${name} may not be my usual kind of trouble, but I can see the use. Learn what it does, then decide if it pays better than the safer road.`;
  }

  if (profile.key === 'jedi') {
    if (treeProfile.domain === 'dark') return `${name} draws from dangerous emotions. It can grant power quickly, but you must understand what fear and anger will demand in return.`;
    if (treeProfile.domain === 'underworld' || treeProfile.domain === 'scoundrel' || treeProfile.domain === 'intrigue') return `${name} teaches leverage from uncertainty and weakness. It may be useful, but be careful that cleverness does not become cruelty.`;
    if (stance === 'aligned') return `${name} can deepen discipline and purpose. Let the legal talents guide you toward protection, awareness, and a role you can carry with humility.`;
    return `${name} is not outside wisdom if you approach it with clarity. Study what it offers, then choose only what serves more than your pride.`;
  }

  if (profile.key === 'sith') {
    if (treeProfile.domain === 'jedi') return `${name} wastes much breath on restraint, but even restraint can teach you how defenders endure. Learn the lesson, then decide whether to surpass it.`;
    if (stance === 'aligned') return `${name} offers power that can be applied immediately. Choose the talent that increases control over the enemy, not merely ornament over yourself.`;
    return `${name} is a tool. If it does not strengthen your will or sharpen your victory, it is sentiment wearing armor.`;
  }

  if (profile.key === 'soldier') {
    if (stance === 'aligned') return `${name} has a clean battlefield purpose. If you can explain its job under fire, it is probably worth considering.`;
    if (treeProfile.domain === 'dark') return `${name} can break enemies fast, but unstable power is a liability if it cannot follow orders.`;
    return `${name} is outside standard doctrine, but not useless. Identify the mission problem it solves before spending the talent.`;
  }

  if (profile.key === 'scout') {
    if (stance === 'aligned') return `${name} improves how you read, reach, or survive the field. That is the kind of advantage that keeps a team alive.`;
    if (treeProfile.domain === 'dark') return `${name} may hit hard, but it can make you predictable. Anger is easy to track.`;
    return `${name} might work if it gives you options when the plan breaks. If it only looks impressive, leave it on the map.`;
  }

  if (profile.key === 'medic') {
    if (treeProfile.domain === 'dark') return `${name} treats harm as a source of strength. I cannot approve of that, but I can tell you it creates pressure by making fear part of the fight.`;
    if (stance === 'aligned') return `${name} keeps people standing or gives them a reason to stand again. That is never a small thing.`;
    return `${name} has use if it prevents suffering or shortens danger. Measure it by who survives because you chose it.`;
  }

  if (profile.key === 'gladiator') {
    if (stance === 'aligned') return `${name} speaks the language of the arena. It helps when the answer must come from stance, timing, and nerve.`;
    return `${name} is not my favorite road, but every path has a duel inside it. Find the part that wins when pressure closes in.`;
  }

  if (profile.key === 'tech') {
    if (stance === 'aligned') return `${name} has useful systems logic. It gives you a mechanism to solve the problem instead of merely surviving it.`;
    return `${name} is not my usual toolkit, but I can respect a clean function. Make sure the legal talent actually changes what you can do.`;
  }

  if (stance === 'aligned') return `${name} fits the direction your mentor understands best. It gives you a focused way to strengthen that identity.`;
  if (stance === 'opposed') return `${name} is not a direction your mentor fully approves of, but they can still explain the power it offers and the cost it may carry.`;
  if (stance === 'wary') return `${name} can be useful, but your mentor wants you to understand the trade before calling it wisdom.`;
  return `${name} is a specialized route. Your mentor can read the shape of it, even if it is not their own path.`;
}

export function buildTalentTreeMentorRead({ tree = {}, shell = null, mentor = null, visual = {}, recommendation = null } = {}) {
  const treeProfile = getTreeProfile(tree, visual);
  const mentorProfile = getMentorProfile(mentor || shell);
  const stance = getStance(mentorProfile, treeProfile);
  const pickClause = getPickClause(recommendation);

  const override = renderOverride(mentorProfile, treeProfile, recommendation);
  const baseLine = override || renderGenericLine(mentorProfile, treeProfile, stance);
  const description = truncateText(tree?.description || tree?.system?.description || '', 170);
  const descriptionClause = description ? ` Archive note: ${description}` : '';
  const text = `${sentence(baseLine)}${pickClause}`;

  const analysis = `${sentence(treeProfile.mechanic)} ${sentence(treeProfile.advice)}${descriptionClause}`;

  return {
    mentorName: mentorProfile.name,
    text,
    analysis,
    tone: getTone(mentorProfile, stance, treeProfile),
    treeName: treeProfile.treeName,
    role: treeProfile.role,
    stance,
    stanceLabel: getStanceLabel(stance),
    legalChoiceCount: recommendation?.legalChoiceCount ?? null,
    topTalentName: recommendation?.topTalentName || null,
    isRecommended: !!recommendation?.isTopSuggestion,
  };
}

export { getTreeProfile as classifyTalentTreeForMentorRead };
