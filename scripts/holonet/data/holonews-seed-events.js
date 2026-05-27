/**
 * Atomized ambient HoloNews wire generator.
 *
 * The GM-facing HoloNews desk needs ordinary, low-stakes background texture:
 * travel advisories, civic notices, shipping delays, sports blurbs, weather,
 * market movement, droid service waits, utility work, and other mundane stories.
 *
 * This file intentionally does not hand-author a fixed list of dramatic stories.
 * Instead it builds stable wire copy from atom pools:
 * - 300 planet/location atoms
 * - 300 system/region atoms
 * - 300 source atoms
 * - 300 story lead atoms
 * - 300 story detail atoms
 *
 * Ambient entries never mark themselves as breaking news. Breaking News is a
 * GM-authored override handled by the Bulletin console metadata.
 */

export const HOLONEWS_ATOM_POOL_SIZE = 300;
export const HOLONEWS_SYNTHETIC_STORY_COUNT = 9000;

const SECTORS = [
  'Core Worlds',
  'Colonies',
  'Inner Rim',
  'Expansion Region',
  'Mid Rim',
  'Outer Rim',
  'Hutt Space',
  'Corporate Sector',
  'Wild Space',
  'Tingel Arm',
  'Hydian Fringe',
  'Perlemian Corridor'
];

const PRIORITY_ORDER = ['low', 'normal', 'high', 'critical'];

const TOPIC_DEFINITIONS = [
  { category: 'traffic', priority: 'normal', noun: 'docking schedules', verb: 'revises', subject: 'port authority' },
  { category: 'weather', priority: 'low', noun: 'visibility advisory', verb: 'extends', subject: 'weather office' },
  { category: 'commerce', priority: 'normal', noun: 'commodity index', verb: 'posts', subject: 'market desk' },
  { category: 'civic', priority: 'low', noun: 'permit hours', verb: 'updates', subject: 'civic council' },
  { category: 'transit', priority: 'normal', noun: 'shuttle routing', verb: 'adjusts', subject: 'transit office' },
  { category: 'labor', priority: 'normal', noun: 'dock shift schedule', verb: 'approves', subject: 'loading guild' },
  { category: 'utility', priority: 'low', noun: 'relay calibration', verb: 'schedules', subject: 'utility office' },
  { category: 'entertainment', priority: 'low', noun: 'local holovid listing', verb: 'announces', subject: 'culture desk' },
  { category: 'sports', priority: 'low', noun: 'junior league fixture', verb: 'reschedules', subject: 'sports committee' },
  { category: 'education', priority: 'low', noun: 'technical seminar', verb: 'opens', subject: 'college registrar' },
  { category: 'medical', priority: 'normal', noun: 'clinic donation hours', verb: 'expands', subject: 'clinic network' },
  { category: 'legal', priority: 'low', noun: 'small freight rule', verb: 'clarifies', subject: 'magistrate' },
  { category: 'agriculture', priority: 'normal', noun: 'crop yield estimate', verb: 'reports', subject: 'agricultural office' },
  { category: 'shipping', priority: 'normal', noun: 'container backlog', verb: 'logs', subject: 'shipping lane desk' },
  { category: 'public-safety', priority: 'low', noun: 'registration reminder', verb: 'issues', subject: 'safety office' },
  { category: 'culture', priority: 'low', noun: 'museum exhibit', verb: 'extends', subject: 'museum board' },
  { category: 'droids', priority: 'normal', noun: 'motivator repair queue', verb: 'reports', subject: 'droid service center' },
  { category: 'municipal', priority: 'low', noun: 'records office queue', verb: 'revises', subject: 'public records office' },
  { category: 'tourism', priority: 'low', noun: 'walking route campaign', verb: 'promotes', subject: 'tourism board' },
  { category: 'standards', priority: 'low', noun: 'cargo label examples', verb: 'updates', subject: 'standards bureau' },
  { category: 'food', priority: 'low', noun: 'street vendor permit window', verb: 'reopens', subject: 'food licensing desk' },
  { category: 'maintenance', priority: 'normal', noun: 'landing-light inspection', verb: 'continues', subject: 'maintenance office' },
  { category: 'communications', priority: 'normal', noun: 'relay packet timing', verb: 'normalizes', subject: 'comm relay bureau' },
  { category: 'banking', priority: 'low', noun: 'branch service hours', verb: 'standardizes', subject: 'credit union desk' },
  { category: 'real-estate', priority: 'low', noun: 'warehouse lease notice', verb: 'publishes', subject: 'property registrar' }
];

const PLANET_PREFIXES = [
  'Arel', 'Besh', 'Canto', 'Daro', 'Eshka', 'Fenn', 'Garel', 'Harlo', 'Iona', 'Jorra',
  'Keth', 'Lorra', 'Mavi', 'Neral', 'Orra', 'Prenn', 'Quell', 'Ravo', 'Sela', 'Toma',
  'Ubrik', 'Vanto', 'Wess', 'Xand', 'Yora', 'Zenn', 'Arda', 'Bora', 'Cresh', 'Dova'
];

const PLANET_SUFFIXES = [
  'Minor', 'Prime', 'Station', 'Reach', 'Junction', 'Haven', 'Crossing', 'Depot', 'Landing', 'Market'
];

const PLANET_TERRAINS = [
  'temperate agri-world', 'dry trade moon', 'orbital depot', 'mining settlement', 'rainy port world',
  'cold refueling station', 'university enclave', 'warehouse moon', 'coastal city-world', 'desert township',
  'forest colony', 'industrial satellite', 'canyon world', 'harbor moon', 'frontier service hub'
];

const SYSTEM_PREFIXES = [
  'Aurek', 'Besh', 'Cresh', 'Dorn', 'Esk', 'Forn', 'Grek', 'Herf', 'Isk', 'Jenth',
  'Krill', 'Leth', 'Mern', 'Nesh', 'Osk', 'Peth', 'Qek', 'Resh', 'Senth', 'Trill',
  'Usk', 'Vev', 'Wesk', 'Xesh', 'Yirt', 'Zerek', 'Arkan', 'Bril', 'Cyrn', 'Drell'
];

const SYSTEM_SUFFIXES = [
  'Run', 'Circuit', 'Loop', 'Approach', 'Spur', 'Passage', 'Corridor', 'Reach', 'Locality', 'Shelf'
];

const SYSTEM_AUTHORITIES = [
  'regional traffic office', 'port coordination bureau', 'sector civil desk', 'shipping advisory board',
  'transit safety authority', 'municipal liaison channel', 'freight routing committee', 'standards review office',
  'commerce liaison desk', 'public works bureau'
];

const SOURCE_PREFIXES = [
  'Galaxy', 'Sector', 'Port', 'Trade', 'Transit', 'Market', 'Civic', 'Culture', 'Weather', 'Utility',
  'Freight', 'Municipal', 'Droid', 'Medical', 'Sports', 'Education', 'Standards', 'Agricultural',
  'Commuter', 'Regional', 'Local', 'Hyperlane', 'Dockside', 'Administrative', 'Public'
];

const SOURCE_SUFFIXES = [
  'News Net', 'Civic Wire', 'Authority Desk', 'Review', 'Local', 'Public Channel', 'Desk', 'Bulletin',
  'Advisory Service', 'Exchange Wire', 'Relay', 'Affairs Feed', 'Lane Digest', 'Evening Edition',
  'Service Journal', 'Notice', 'Traffic Report', 'Markets Minute', 'Works Bulletin', 'Observer',
  'Morning Dispatch', 'Registry Feed', 'Signal', 'Ledger', 'Roundup'
];

const LEAD_PATTERNS = [
  ({ topic, place, system }) => `${titleCase(topic.subject)} ${titleCase(topic.verb)} ${titleCase(topic.noun)} On ${place}`,
  ({ topic, place, system }) => `${place} ${titleCase(topic.noun)} Receives Routine Update`,
  ({ topic, place, system }) => `${titleCase(topic.subject)} Posts Minor ${titleCase(topic.noun)} Notice Near ${system.name}`,
  ({ topic, place, system }) => `${place} Officials Confirm Ordinary ${titleCase(topic.noun)} Change`,
  ({ topic, place, system }) => `${titleCase(topic.noun)} Adjusted Along ${system.name}`,
  ({ topic, place, system }) => `${titleCase(topic.subject)} Says ${place} Change Remains Routine`,
  ({ topic, place, system }) => `${place} Residents Advised To Check ${titleCase(topic.noun)}`,
  ({ topic, place, system }) => `${system.name} Offices Publish ${titleCase(topic.noun)} Reminder`,
  ({ topic, place, system }) => `${place} Service Counters Update ${titleCase(topic.noun)}`,
  ({ topic, place, system }) => `Minor ${titleCase(topic.noun)} Change Reported Near ${place}`,
  ({ topic, place, system }) => `${titleCase(topic.subject)} Opens Public Comment On ${titleCase(topic.noun)}`,
  ({ topic, place, system }) => `${place} Clerks Note Small Adjustment To ${titleCase(topic.noun)}`
];

const DECK_PATTERNS = [
  ({ topic, place, system }) => `Local officials say the change is routine and should only affect a small number of residents, licensed operators, or visiting crews around ${place}.`,
  ({ topic, place, system }) => `The update covers ordinary service planning near ${place} and along the ${system.name}, with no emergency declaration attached.`,
  ({ topic, place, system }) => `Administrators described the notice as procedural, saying most travelers and merchants will notice little beyond revised terminal prompts.`,
  ({ topic, place, system }) => `The advisory was posted after clerks completed a standard review of ${topic.noun} data for the current local cycle.`,
  ({ topic, place, system }) => `Officials say the matter is expected to remain narrow, boring, and largely confined to normal public-service channels.`,
  ({ topic, place, system }) => `Residents were encouraged to check appointment kiosks, public boards, or licensed comm terminals before making routine plans.`
];

const DETAIL_OPENERS = [
  'Officials emphasized that the update is not connected to any known emergency.',
  'Clerks said the revision should reduce duplicate filings and shorten routine queues.',
  'A spokesperson said most affected citizens will only see updated signage or terminal prompts.',
  'The office asked travelers to keep documents current and avoid submitting duplicate forms.',
  'Several small businesses welcomed the notice, though most said they expect no major change.',
  'Administrators called the matter seasonal and described the timing as unremarkable.',
  'A short maintenance window may affect older public terminals, but backups are already scheduled.',
  'The advisory is expected to expire automatically unless renewed by ordinary committee vote.',
  'Local service droids have been updated with the revised notice for visitor assistance.',
  'Public counters will remain open during normal hours unless otherwise posted.'
];

const DETAIL_MIDDLES = [
  'Freight captains were reminded to keep manifest numbers visible during routine inspections.',
  'Passenger traffic is expected to remain within ordinary projections for the rest of the cycle.',
  'Residents with existing appointments do not need to refile unless contacted by a clerk.',
  'The change follows a minor data audit requested by the local administrative office.',
  'No broad price change is expected, according to market observers familiar with the filing.',
  'Small vendors may see a one-cycle delay while terminal codes refresh.',
  'The public records kiosk will carry translated notices in the most common local languages.',
  'Routine enforcement officers were told to issue warnings before citations during the transition.',
  'The local chamber described the notice as dull but useful for planning.',
  'A follow-up memo is expected after the next scheduled committee session.'
];

const DETAIL_CLOSERS = [
  'Further updates will be posted through standard public channels.',
  'Visitors are advised to confirm details before making special trips.',
  'Officials say the next review is already on the ordinary calendar.',
  'The change is expected to pass quietly unless local demand shifts.',
  'Residents can request printed copies at participating service counters.',
  'Licensed operators should watch for routine comm updates over the next cycle.',
  'The office says old forms will be accepted through the grace period.',
  'No additional action is required for most households or visiting crews.',
  'A brief summary is available at authorized terminal kiosks.',
  'Public comments may be submitted through the usual civic queue.'
];

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function padAtom(index) {
  return String(index + 1).padStart(3, '0');
}

function buildPlanetAtom(index) {
  const prefix = PLANET_PREFIXES[index % PLANET_PREFIXES.length];
  const suffix = PLANET_SUFFIXES[Math.floor(index / PLANET_PREFIXES.length) % PLANET_SUFFIXES.length];
  const sector = SECTORS[index % SECTORS.length];
  const terrain = PLANET_TERRAINS[(index * 7) % PLANET_TERRAINS.length];
  const name = `${prefix} ${suffix}`;
  return {
    id: `planet-${padAtom(index)}`,
    name,
    sector,
    terrain,
    tags: ['location', slugify(name), slugify(sector), slugify(terrain)]
  };
}

function buildSystemAtom(index) {
  const prefix = SYSTEM_PREFIXES[index % SYSTEM_PREFIXES.length];
  const suffix = SYSTEM_SUFFIXES[Math.floor(index / SYSTEM_PREFIXES.length) % SYSTEM_SUFFIXES.length];
  const sector = SECTORS[(index * 5 + 2) % SECTORS.length];
  const authority = SYSTEM_AUTHORITIES[(index * 11) % SYSTEM_AUTHORITIES.length];
  const name = `${prefix} ${suffix}`;
  return {
    id: `system-${padAtom(index)}`,
    name,
    sector,
    authority,
    tags: ['system', slugify(name), slugify(sector), slugify(authority)]
  };
}

function buildSourceAtom(index) {
  const prefix = SOURCE_PREFIXES[index % SOURCE_PREFIXES.length];
  const suffix = SOURCE_SUFFIXES[Math.floor(index / SOURCE_PREFIXES.length) % SOURCE_SUFFIXES.length];
  const name = `${prefix} ${suffix}`;
  return {
    id: `source-${padAtom(index)}`,
    name,
    tags: ['source', slugify(name)]
  };
}

function buildStoryLeadAtom(index) {
  const topic = TOPIC_DEFINITIONS[index % TOPIC_DEFINITIONS.length];
  const headlinePattern = LEAD_PATTERNS[Math.floor(index / TOPIC_DEFINITIONS.length) % LEAD_PATTERNS.length];
  const deckPattern = DECK_PATTERNS[(index * 7) % DECK_PATTERNS.length];
  return {
    id: `lead-${padAtom(index)}`,
    category: topic.category,
    priority: topic.priority,
    topic,
    headlinePattern,
    deckPattern,
    tags: ['lead', topic.category, topic.priority]
  };
}

function buildStoryDetailAtom(index) {
  return {
    id: `detail-${padAtom(index)}`,
    opener: DETAIL_OPENERS[index % DETAIL_OPENERS.length],
    middle: DETAIL_MIDDLES[Math.floor(index / DETAIL_OPENERS.length) % DETAIL_MIDDLES.length],
    closer: DETAIL_CLOSERS[(index * 13) % DETAIL_CLOSERS.length],
    tags: ['detail']
  };
}

export const HOLONEWS_PLANET_ATOMS = Array.from({ length: HOLONEWS_ATOM_POOL_SIZE }, (_, index) => buildPlanetAtom(index));
export const HOLONEWS_SYSTEM_ATOMS = Array.from({ length: HOLONEWS_ATOM_POOL_SIZE }, (_, index) => buildSystemAtom(index));
export const HOLONEWS_SOURCE_ATOMS = Array.from({ length: HOLONEWS_ATOM_POOL_SIZE }, (_, index) => buildSourceAtom(index));
export const HOLONEWS_STORY_LEAD_ATOMS = Array.from({ length: HOLONEWS_ATOM_POOL_SIZE }, (_, index) => buildStoryLeadAtom(index));
export const HOLONEWS_STORY_DETAIL_ATOMS = Array.from({ length: HOLONEWS_ATOM_POOL_SIZE }, (_, index) => buildStoryDetailAtom(index));

function pickAtom(pool, index, multiplier, offset = 0) {
  return pool[((index * multiplier) + offset) % pool.length];
}

function buildSeed(index) {
  const sequence = index + 1;
  const planet = pickAtom(HOLONEWS_PLANET_ATOMS, index, 37, 3);
  const system = pickAtom(HOLONEWS_SYSTEM_ATOMS, index, 53, 11);
  const source = pickAtom(HOLONEWS_SOURCE_ATOMS, index, 71, 5);
  const lead = pickAtom(HOLONEWS_STORY_LEAD_ATOMS, index, 97, 17);
  const detail = pickAtom(HOLONEWS_STORY_DETAIL_ATOMS, index, 113, 23);
  const place = planet.name;
  const topic = lead.topic;
  const sector = planet.sector || system.sector;
  const context = { topic, place, sector, system, planet, source };
  const headline = lead.headlinePattern(context);
  const deck = lead.deckPattern(context);
  const body = `${deck} ${detail.opener} ${detail.middle} ${detail.closer}`;
  const category = lead.category;

  return {
    id: `holonews-atom-${String(sequence).padStart(5, '0')}`,
    source: source.name,
    dateline: place,
    sector,
    system: system.name,
    category,
    priority: lead.priority,
    tone: 'ambient',
    era: 'any',
    headline,
    deck,
    body,
    tags: [
      'holonews',
      'ambient',
      'atomized',
      category,
      slugify(sector),
      slugify(system.name),
      ...planet.tags,
      ...system.tags,
      ...source.tags,
      ...lead.tags,
      ...detail.tags
    ],
    breakingNews: false,
    ambient: true,
    atomized: true,
    atoms: {
      planet: planet.id,
      system: system.id,
      source: source.id,
      lead: lead.id,
      detail: detail.id
    }
  };
}

export const HOLONEWS_SEED_EVENTS = Array.from({ length: HOLONEWS_SYNTHETIC_STORY_COUNT }, (_, index) => buildSeed(index));

export class HolonewsGenerator {
  static all() {
    return HOLONEWS_SEED_EVENTS;
  }

  static atomCounts() {
    return {
      planets: HOLONEWS_PLANET_ATOMS.length,
      systems: HOLONEWS_SYSTEM_ATOMS.length,
      sources: HOLONEWS_SOURCE_ATOMS.length,
      storyLeads: HOLONEWS_STORY_LEAD_ATOMS.length,
      storyDetails: HOLONEWS_STORY_DETAIL_ATOMS.length,
      variants: HOLONEWS_SEED_EVENTS.length
    };
  }

  static atomStats() {
    const counts = this.atomCounts();
    return [
      { label: 'Planet atoms', value: counts.planets },
      { label: 'System atoms', value: counts.systems },
      { label: 'Source atoms', value: counts.sources },
      { label: 'Story lead atoms', value: counts.storyLeads },
      { label: 'Story detail atoms', value: counts.storyDetails },
      { label: 'Generated variants', value: counts.variants }
    ];
  }

  static count(filters = {}) {
    return this.#filter(filters).length;
  }

  static getById(id) {
    return HOLONEWS_SEED_EVENTS.find((entry) => entry.id === id) ?? null;
  }

  static window(offset = 0, limit = 12, filters = {}) {
    const pool = this.#filter(filters);
    if (!pool.length) return [];
    const start = Math.max(0, Number(offset) || 0) % pool.length;
    const size = Math.max(1, Number(limit) || 12);
    return Array.from({ length: Math.min(size, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
  }

  static sample(limit = 12, filters = {}) {
    const pool = this.#filter(filters);
    const size = Math.max(1, Number(limit) || 12);
    return pool.slice(0, size);
  }

  static categories() {
    return [...new Set(HOLONEWS_SEED_EVENTS.map((entry) => entry.category))]
      .sort()
      .map((category) => ({ value: category, label: titleCase(category) }));
  }

  static sectors() {
    return [...new Set(HOLONEWS_SEED_EVENTS.map((entry) => entry.sector))]
      .sort()
      .map((sector) => ({ value: sector, label: sector }));
  }

  static priorities() {
    return [...new Set(HOLONEWS_SEED_EVENTS.map((entry) => entry.priority))]
      .sort((a, b) => PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b))
      .map((priority) => ({ value: priority, label: titleCase(priority) }));
  }

  static #filter(filters = {}) {
    const query = String(filters.query || filters.q || '').trim().toLowerCase();
    const excludeIds = new Set(Array.isArray(filters.excludeIds) ? filters.excludeIds.filter(Boolean) : []);
    const excludeCategories = new Set(Array.isArray(filters.excludeCategories) ? filters.excludeCategories.filter(Boolean) : []);
    const excludeSectors = new Set(Array.isArray(filters.excludeSectors) ? filters.excludeSectors.filter(Boolean) : []);
    const excludePriorities = new Set(Array.isArray(filters.excludePriorities) ? filters.excludePriorities.filter(Boolean) : []);
    const excludeAtomIds = new Set(Array.isArray(filters.excludeAtomIds) ? filters.excludeAtomIds.filter(Boolean) : []);
    const excludeKeywords = (Array.isArray(filters.excludeKeywords) ? filters.excludeKeywords : [])
      .map((keyword) => String(keyword || '').trim().toLowerCase())
      .filter(Boolean);

    return HOLONEWS_SEED_EVENTS.filter((entry) => {
      if (excludeIds.has(entry.id)) return false;
      if (excludeCategories.has(entry.category)) return false;
      if (excludeSectors.has(entry.sector)) return false;
      if (excludePriorities.has(entry.priority)) return false;
      if ([entry.id, ...Object.values(entry.atoms ?? {})].some((id) => excludeAtomIds.has(id))) return false;
      if (filters.category && entry.category !== filters.category) return false;
      if (filters.priority && entry.priority !== filters.priority) return false;
      if (filters.sector && entry.sector !== filters.sector) return false;
      const haystack = [
        entry.id,
        entry.source,
        entry.dateline,
        entry.sector,
        entry.system,
        entry.category,
        entry.priority,
        entry.headline,
        entry.deck,
        entry.body,
        ...(entry.tags ?? []),
        ...Object.values(entry.atoms ?? {})
      ].join(' ').toLowerCase();
      if (excludeKeywords.length && excludeKeywords.some((keyword) => haystack.includes(keyword))) return false;
      if (query && !haystack.includes(query)) return false;
      return true;
    });
  }

  static toBulletinData(seed, overrides = {}) {
    if (!seed) return null;
    const breakingNews = overrides.breakingNews === true;
    const priority = breakingNews ? 'critical' : (overrides.priority ?? seed.priority ?? 'normal');
    return {
      title: overrides.title ?? seed.headline,
      body: overrides.body ?? seed.body,
      category: overrides.category ?? 'holonews',
      priority,
      authorName: overrides.authorName ?? seed.source ?? 'Galaxy News Net',
      metadata: {
        holonews: true,
        ambientHolonews: seed.ambient === true,
        atomizedHolonews: seed.atomized === true,
        breakingNews,
        holonewsSeedId: seed.id,
        holonewsAtoms: seed.atoms ?? {},
        newsSource: overrides.authorName ?? seed.source,
        dateline: overrides.dateline ?? seed.dateline,
        sector: overrides.sector ?? seed.sector,
        system: overrides.system ?? seed.system,
        newsTone: seed.tone,
        newsEra: seed.era,
        newsCategory: seed.category,
        newsDeck: seed.deck,
        tags: seed.tags ?? []
      }
    };
  }
}
