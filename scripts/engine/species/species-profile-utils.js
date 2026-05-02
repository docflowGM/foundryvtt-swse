import speciesTraits from "/systems/foundryvtt-swse/data/species-traits.json" with { type: "json" };

function uniq(list = []) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

export function normalizeSpeciesProfileKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const STRUCTURED_SPECIES_INDEX = new Map(
  (Array.isArray(speciesTraits) ? speciesTraits : []).map(entry => [normalizeSpeciesProfileKey(entry?.name), entry])
);

export function getStructuredSpeciesProfile(name) {
  return STRUCTURED_SPECIES_INDEX.get(normalizeSpeciesProfileKey(name)) || null;
}

export const CURATED_SPECIES_MENTOR_PROFILES = {
  human: {
    order: 0,
    confidence: 0.96,
    role: 'Flexible all-arounder',
    shortReason: 'Human is a strong all-around choice if you want flexibility.',
    reasons: [
      'Bonus feat gives you an early build-shaping tool no matter what path you take.',
      'Bonus trained skill keeps a new character useful even before the rest of the build settles in.',
      'Human stays valuable later because flexibility matters at every level.'
    ],
    cautions: [
      'Humans are excellent generalists, but they do not push you toward one extreme specialty on their own.'
    ],
    forecast: 'Bonus feat and bonus skill training keep paying dividends as your build grows.',
    tags: ['generalist', 'flexible', 'beginner-friendly', 'bonus-feat', 'bonus-trained-skill', 'adaptable']
  },
  miraluka: {
    order: 1,
    confidence: 0.93,
    role: 'Force-attuned path',
    shortReason: 'Miraluka is worth a look for a Force-attuned path.',
    reasons: [
      'Force Sight and Force Sensitivity make the species feel immediately tuned toward intuitive or mystical play.',
      'It gives a strong identity early without locking you into only one exact build later.',
      'This is a natural fit for players who want the Force to matter from the start.'
    ],
    cautions: [
      'This recommendation is strongest for players who actually want Force presence to be central to the character.'
    ],
    forecast: 'Miraluka tends to stay relevant as Force powers, perception, and spiritual identity become more important.',
    tags: ['force', 'force-attuned', 'perception', 'wisdom', 'intuitive', 'jedi-synergy']
  },
  wookiee: {
    order: 2,
    confidence: 0.91,
    role: 'Durable front-line fighter',
    shortReason: 'Wookiee fits a durable front-line fighter.',
    reasons: [
      'Strength-forward traits and toughness support a direct martial playstyle from level 1.',
      'Wookiees are easy for new players to understand because their strengths are immediately visible at the table.',
      'This species supports characters who want to hit hard and survive pressure.'
    ],
    cautions: [
      'Wookiee is less ideal if you are aiming for a subtle, social, or highly finesse-driven concept.'
    ],
    forecast: 'A Wookiee usually keeps rewarding melee pressure, durability, and physical presence later in the build.',
    tags: ['martial', 'front-line', 'durable', 'strength', 'melee', 'soldier-synergy']
  },
  'twi-lek': {
    order: 3,
    confidence: 0.90,
    role: 'Social or leadership-focused character',
    shortReason: 'Twi\'lek suits a social or leadership-focused character.',
    reasons: [
      'This species naturally supports characters who want persuasion, presence, and diplomacy to matter.',
      'It gives new players a clear lane into face, leader, or negotiator play.',
      'The social strengths remain useful well beyond chargen.'
    ],
    cautions: [
      'This is a weaker fit if your concept is mostly brute force with little interest in social leverage.'
    ],
    forecast: 'Twi\'lek stays rewarding for builds that lean on charm, leadership, and social problem-solving.',
    tags: ['social', 'leadership', 'charisma', 'diplomat', 'noble-synergy', 'persuasion']
  },
  rodian: {
    order: 4,
    confidence: 0.89,
    role: 'Scouting, hunting, and ranged pressure',
    shortReason: 'Rodian fits scouting, hunting, and ranged pressure.',
    reasons: [
      'Rodians have a clear hunter/scout fantasy that helps new players pick a lane immediately.',
      'Perception-forward play and pursuit-oriented character concepts fit naturally here.',
      'This species makes sense for characters who want to track, spot danger, and pressure from range.'
    ],
    cautions: [
      'Rodian is a weaker opening fit if your concept is mostly social leadership or Force mysticism.'
    ],
    forecast: 'Rodian usually continues to reward alertness, pursuit play, and ranged or scout-oriented growth.',
    tags: ['scout', 'hunter', 'ranged', 'perception', 'survival', 'scout-synergy']
  },
  yarkora: {
    order: 5,
    confidence: 0.88,
    role: 'Cunning, skillful, trickier play',
    shortReason: 'Yarkora fits cunning, skillful, trickier play.',
    reasons: [
      'This species is a strong directional pick for players who want to solve problems with timing, cleverness, and skill use.',
      'It gives a distinctive identity without being as obvious a beginner default as Human.',
      'Yarkora helps signal a more crafty or opportunistic character fantasy.'
    ],
    cautions: [
      'Yarkora is a more directional pick and can be less intuitive than Human for a brand-new player.'
    ],
    forecast: 'Yarkora tends to pay off best when the build grows toward skill leverage, tricky positioning, and cunning play.',
    tags: ['cunning', 'skillful', 'trickster', 'opportunistic', 'scoundrel-synergy', 'clever']
  }
};

export function getCuratedSpeciesMentorProfile(name) {
  return CURATED_SPECIES_MENTOR_PROFILES[normalizeSpeciesProfileKey(name)] || null;
}

function addAll(set, values = []) {
  for (const value of values || []) {
    if (value) set.add(value);
  }
}

function addAbilityTags(tags, abilityScores = {}) {
  const scores = abilityScores || {};
  const positive = Object.entries(scores).filter(([, value]) => Number(value) > 0);
  const negative = Object.entries(scores).filter(([, value]) => Number(value) < 0);

  for (const [key] of positive) {
    switch (key) {
      case 'str': addAll(tags, ['strength', 'martial', 'melee']); break;
      case 'dex': addAll(tags, ['dexterity', 'agile', 'ranged', 'stealth']); break;
      case 'con': addAll(tags, ['constitution', 'durable', 'fortitude']); break;
      case 'int': addAll(tags, ['intelligence', 'tech', 'knowledge']); break;
      case 'wis': addAll(tags, ['wisdom', 'perception', 'intuition']); break;
      case 'cha': addAll(tags, ['charisma', 'social', 'leadership']); break;
      default: break;
    }
  }

  for (const [key] of negative) {
    addAll(tags, [`${key}-penalty`]);
  }
}

const TEXT_TAG_RULES = [
  { pattern: /force sensitivity|force sight|force affinity|force legacy|force awareness|psychometry|use the force|dark side/i, tags: ['force', 'force-attuned'] },
  { pattern: /persuasion|deception|silver tongue|pheromones|presence|performer|mercantile|diplomat/i, tags: ['social', 'charisma'] },
  { pattern: /leader|leadership|command|inspire|dominating presence/i, tags: ['leadership', 'support'] },
  { pattern: /stealth|shadow|spy|sneak|blend/i, tags: ['stealth', 'cunning'] },
  { pattern: /survival|tracker|hunter|scout|keen senses|wilderness|pack instincts/i, tags: ['survival', 'scout'] },
  { pattern: /pilot|flight|glide|aerial/i, tags: ['pilot', 'mobility'] },
  { pattern: /binary|computer|mechanics|industrial|technology|living technology|genetic expertise/i, tags: ['tech', 'knowledge'] },
  { pattern: /natural armor|endurance|resilient|hardy|regeneration|fortitude|massive|bulk/i, tags: ['durable', 'tank'] },
  { pattern: /rage|brute|brutal|claws|natural weapons|charge|ferocity|melee damage/i, tags: ['martial', 'melee'] },
  { pattern: /perception|darkvision|low-light vision|auditory|prescient vision|force sight/i, tags: ['perception', 'senses'] },
  { pattern: /small size/i, tags: ['small'] },
  { pattern: /large size/i, tags: ['large'] }
];

export function buildSpeciesTags(species, structuredProfile = null) {
  const tags = new Set();
  const structured = structuredProfile || getStructuredSpeciesProfile(species?.name);
  const curated = getCuratedSpeciesMentorProfile(species?.name);

  addAll(tags, Array.isArray(species?.tags) ? species.tags : []);
  addAll(tags, Array.isArray(structured?.tags) ? structured.tags : []);
  addAll(tags, curated?.tags || []);

  addAbilityTags(tags, species?.abilityScores || {});

  const size = String(species?.size || '').toLowerCase().trim();
  if (size) addAll(tags, [size]);

  const speed = Number(species?.speed || 0);
  if (speed >= 8) addAll(tags, ['fast', 'mobility']);
  else if (speed > 0 && speed <= 4) addAll(tags, ['slow']);

  const languages = Array.isArray(species?.languages) ? species.languages : [];
  if (languages.length > 1) addAll(tags, ['multilingual']);

  const textChunks = [];
  if (species?.description) textChunks.push(species.description);
  for (const entry of Array.isArray(species?.abilities) ? species.abilities : []) textChunks.push(String(entry || ''));
  if (structured) {
    for (const key of ['structuralTraits', 'conditionalTraits', 'activatedAbilities']) {
      for (const trait of structured[key] || []) {
        if (trait?.name) textChunks.push(String(trait.name));
        if (trait?.description) textChunks.push(String(trait.description));
      }
    }
  }

  const haystack = textChunks.join(' \n ');
  for (const rule of TEXT_TAG_RULES) {
    if (rule.pattern.test(haystack)) addAll(tags, rule.tags);
  }

  if (normalizeSpeciesProfileKey(species?.name) === 'human') {
    addAll(tags, ['generalist', 'flexible', 'beginner-friendly']);
  }

  return uniq(Array.from(tags).map(tag => String(tag).toLowerCase().trim().replace(/\s+/g, '-')));
}

export function buildCuratedOpeningSpeciesSuggestions(availableSpecies = []) {
  const byKey = new Map((availableSpecies || []).map(species => [normalizeSpeciesProfileKey(species?.name), species]));

  return Object.entries(CURATED_SPECIES_MENTOR_PROFILES)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, profile]) => {
      const species = byKey.get(key);
      if (!species) return null;
      return {
        id: species.id,
        name: species.name,
        suggestion: {
          confidence: profile.confidence,
          reason: profile.shortReason,
          reasons: profile.reasons,
          cautions: profile.cautions,
          forecast: profile.forecast,
          rationaleType: 'curated-opening-species',
          curatorRole: profile.role,
          tags: profile.tags,
          source: 'species-first-curation'
        }
      };
    })
    .filter(Boolean);
}
