/**
 * Ambient HoloNews seed library.
 *
 * This library intentionally generates low-stakes, ordinary galactic news.
 * The point is background texture: port advisories, market blurbs, weather,
 * civic notices, maintenance schedules, entertainment updates, and travel
 * paperwork. The player characters should still feel exceptional when the GM
 * writes a custom HoloNews story about what they did.
 *
 * Ambient entries never mark themselves as breaking news. Breaking News is a
 * GM-authored override handled by the Bulletin console metadata.
 */

const SOURCES = [
  'Galaxy News Net',
  'Sector Civic Wire',
  'Port Authority Desk',
  'Mid Rim Trade Review',
  'Outer Rim Local',
  'Core Worlds Public Channel',
  'HoloSports Desk',
  'Commerce Guild Bulletin',
  'Transit Advisory Service',
  'Agricultural Exchange Wire',
  'WeatherNet Relay',
  'Municipal Affairs Feed',
  'Shipping Lane Digest',
  'CultureNet Evening Edition',
  'Droid Service Journal',
  'Bureau of Standards Notice',
  'Freighter Traffic Report',
  'Regional Markets Minute',
  'Public Works Bulletin',
  'University Research Wire'
];

const DATELINES = [
  { name: 'Coruscant', sector: 'Core Worlds' },
  { name: 'Corellia', sector: 'Core Worlds' },
  { name: 'Duro', sector: 'Core Worlds' },
  { name: 'Chandrila', sector: 'Core Worlds' },
  { name: 'Kuat', sector: 'Core Worlds' },
  { name: 'Brentaal', sector: 'Inner Rim' },
  { name: 'Alderaan', sector: 'Core Worlds' },
  { name: 'Fondor', sector: 'Colonies' },
  { name: 'Bestine', sector: 'Inner Rim' },
  { name: 'Rodia', sector: 'Mid Rim' },
  { name: 'Ryloth', sector: 'Outer Rim' },
  { name: 'Taris', sector: 'Outer Rim' },
  { name: 'Onderon', sector: 'Inner Rim' },
  { name: 'Dantooine', sector: 'Outer Rim' },
  { name: 'Tatooine', sector: 'Outer Rim' },
  { name: 'Mon Cala', sector: 'Outer Rim' },
  { name: 'Ord Mantell', sector: 'Mid Rim' },
  { name: 'Bespin', sector: 'Outer Rim' },
  { name: 'Nal Hutta', sector: 'Hutt Space' },
  { name: 'Nar Shaddaa', sector: 'Hutt Space' },
  { name: 'Bothawui', sector: 'Mid Rim' },
  { name: 'Sullust', sector: 'Outer Rim' },
  { name: 'Ithor', sector: 'Mid Rim' },
  { name: 'Manaan', sector: 'Mid Rim' },
  { name: 'Eriadu', sector: 'Outer Rim' }
];

const STORIES = [
  {
    category: 'traffic',
    priority: 'normal',
    headline: ({ place }) => `${place} Port Authority Revises Docking Window Schedule`,
    deck: ({ place }) => `Port officials on ${place} announced minor schedule revisions for commercial docking windows after routine berth inspections ran long.`,
    body: ({ place }) => `Port officials on ${place} announced minor schedule revisions for commercial docking windows after routine berth inspections ran long. Passenger liners and licensed freighters may see brief queue adjustments, but authorities say standard cargo handling will continue throughout the cycle. Travelers are advised to confirm bay assignments before arrival.`
  },
  {
    category: 'weather',
    priority: 'low',
    headline: ({ place }) => `Weather Office Issues Routine Visibility Advisory Near ${place}`,
    deck: ({ place }) => `The local weather office reports haze, wind shear, or sensor interference near several approach lanes around ${place}.`,
    body: ({ place }) => `The local weather office reports haze, wind shear, or sensor interference near several approach lanes around ${place}. Flight controllers say the advisory is precautionary and mostly affects small craft using older navigation packages. Commercial pilots are being asked to follow updated beacon guidance.`
  },
  {
    category: 'commerce',
    priority: 'normal',
    headline: ({ place }) => `${place} Market Index Closes Slightly Higher On Foodstuffs`,
    deck: ({ place }) => `Local commodity monitors say foodstuff futures on ${place} moved slightly higher after warehouse clerks reported stronger than expected demand.`,
    body: ({ place }) => `Local commodity monitors say foodstuff futures on ${place} moved slightly higher after warehouse clerks reported stronger than expected demand. Analysts described the movement as modest and seasonal, with little effect expected beyond wholesalers, ship victualers, and small provisioning firms.`
  },
  {
    category: 'civic',
    priority: 'low',
    headline: ({ place }) => `Civic Council On ${place} Extends Permit Filing Hours`,
    deck: ({ place }) => `The civic council on ${place} extended permit filing hours for traders, contractors, and neighborhood associations.`,
    body: ({ place }) => `The civic council on ${place} extended permit filing hours for traders, contractors, and neighborhood associations. Officials say the change is intended to reduce wait times at public terminals following a routine software update. Residents may still use standard appointment queues.`
  },
  {
    category: 'transit',
    priority: 'normal',
    headline: ({ place }) => `Transit Authority Adds Extra Shuttle Stops Around ${place}`,
    deck: ({ place }) => `Regional transit coordinators added several temporary shuttle stops around ${place} during peak commuter hours.`,
    body: ({ place }) => `Regional transit coordinators added several temporary shuttle stops around ${place} during peak commuter hours. The added service is expected to remain in place through the end of the local work cycle while maintenance crews adjust routing signals near the main terminal.`
  },
  {
    category: 'labor',
    priority: 'normal',
    headline: ({ place }) => `${place} Loading Crews Approve Revised Break Schedule`,
    deck: ({ place }) => `Dockside loading crews on ${place} approved a revised break schedule after talks with warehouse supervisors.`,
    body: ({ place }) => `Dockside loading crews on ${place} approved a revised break schedule after talks with warehouse supervisors. Cargo guild representatives called the agreement practical and said most freight operators should see no change in posted delivery estimates.`
  },
  {
    category: 'utility',
    priority: 'low',
    headline: ({ place }) => `Power Grid Office Schedules Overnight Calibration On ${place}`,
    deck: ({ place }) => `Utility officials on ${place} scheduled an overnight calibration for several district power relays.`,
    body: ({ place }) => `Utility officials on ${place} scheduled an overnight calibration for several district power relays. The office says residential lights may flicker in a few blocks, but no broad outage is expected. Medical centers and traffic beacons have been placed on reserve supply as a routine precaution.`
  },
  {
    category: 'entertainment',
    priority: 'low',
    headline: ({ place }) => `${place} Holovid Awards Announces Local Nominees`,
    deck: ({ place }) => `The ${place} holovid awards committee released this cycle's local nominees for documentary, drama, and short-form comedy.`,
    body: ({ place }) => `The ${place} holovid awards committee released this cycle's local nominees for documentary, drama, and short-form comedy. Entertainment analysts expect a quiet awards season, though several small studios are reportedly pleased with the added subscription traffic.`
  },
  {
    category: 'sports',
    priority: 'low',
    headline: ({ place }) => `${place} Junior Swoop League Announces Rescheduled Match`,
    deck: ({ place }) => `The junior swoop league on ${place} rescheduled a regional match after track crews requested extra surface checks.`,
    body: ({ place }) => `The junior swoop league on ${place} rescheduled a regional match after track crews requested extra surface checks. League officials said tickets remain valid and promised a revised concession voucher for spectators affected by the change.`
  },
  {
    category: 'education',
    priority: 'low',
    headline: ({ place }) => `${place} Technical College Opens Droid Maintenance Seminar`,
    deck: ({ place }) => `A technical college on ${place} opened registration for a short seminar on common droid maintenance errors.`,
    body: ({ place }) => `A technical college on ${place} opened registration for a short seminar on common droid maintenance errors. Instructors say the course is intended for household owners, small garages, and cargo supervisors who want to reduce preventable service calls.`
  },
  {
    category: 'medical',
    priority: 'normal',
    headline: ({ place }) => `Clinic Network On ${place} Requests More Routine Bacta Donations`,
    deck: ({ place }) => `The clinic network on ${place} asked residents to schedule routine bacta and plasma donations where local law allows.`,
    body: ({ place }) => `The clinic network on ${place} asked residents to schedule routine bacta and plasma donations where local law allows. Medical administrators emphasized that the request is seasonal and not connected to an emergency. Donor centers will extend hours for the next two local evenings.`
  },
  {
    category: 'legal',
    priority: 'low',
    headline: ({ place }) => `${place} Magistrate Clarifies Small Freight Tariff Rule`,
    deck: ({ place }) => `A magistrate on ${place} issued a clarification on small freight tariff classifications for local haulers.`,
    body: ({ place }) => `A magistrate on ${place} issued a clarification on small freight tariff classifications for local haulers. The ruling affects forms, labels, and terminal fees, but officials say it should not change most cargo prices for ordinary passengers or independent crews.`
  },
  {
    category: 'agriculture',
    priority: 'normal',
    headline: ({ place }) => `${place} Agricultural Office Reports Average Grain Yield`,
    deck: ({ place }) => `Agricultural monitors near ${place} reported average grain yields after a stable growing cycle.`,
    body: ({ place }) => `Agricultural monitors near ${place} reported average grain yields after a stable growing cycle. Export brokers described the result as reassuring but not remarkable. Local diners may see small menu changes as farms clear storage space for the next planting rotation.`
  },
  {
    category: 'shipping',
    priority: 'normal',
    headline: ({ place }) => `Shipping Lane Desk Posts Minor Container Backlog Near ${place}`,
    deck: ({ place }) => `The shipping lane desk near ${place} posted a minor container backlog after customs scanners received a firmware update.`,
    body: ({ place }) => `The shipping lane desk near ${place} posted a minor container backlog after customs scanners received a firmware update. Officials estimate the delay in hours rather than days. Freight houses are asking captains to keep manifests current and avoid duplicate filings.`
  },
  {
    category: 'public-safety',
    priority: 'low',
    headline: ({ place }) => `${place} Safety Office Reminds Citizens To Tag Pet Droids`,
    deck: ({ place }) => `The public safety office on ${place} reminded citizens to update registration tags on pet and companion droids.`,
    body: ({ place }) => `The public safety office on ${place} reminded citizens to update registration tags on pet and companion droids. Officials say most missing-unit reports involve outdated contact codes rather than theft or malfunction. Registration kiosks will waive late fees for one local week.`
  },
  {
    category: 'culture',
    priority: 'low',
    headline: ({ place }) => `${place} Museum Extends Textile Exhibit By Popular Demand`,
    deck: ({ place }) => `A museum on ${place} extended a textile and trade-route exhibit after strong school attendance.`,
    body: ({ place }) => `A museum on ${place} extended a textile and trade-route exhibit after strong school attendance. Curators said the added dates will include guided tours, student workshops, and a small display of restored shipping labels from several regional archives.`
  },
  {
    category: 'droids',
    priority: 'normal',
    headline: ({ place }) => `Droid Service Centers On ${place} Report Long Waits For Motivator Repairs`,
    deck: ({ place }) => `Droid service centers on ${place} reported longer wait times for common motivator repairs.`,
    body: ({ place }) => `Droid service centers on ${place} reported longer wait times for common motivator repairs. Shop owners blame a shipment of mislabeled parts and say basic cleaning, memory checks, and restraining bolt replacement appointments remain available.`
  },
  {
    category: 'municipal',
    priority: 'low',
    headline: ({ place }) => `${place} Announces New Queue Numbers For Public Records Office`,
    deck: ({ place }) => `The public records office on ${place} announced a new queue-number system for licenses, liens, and registry extracts.`,
    body: ({ place }) => `The public records office on ${place} announced a new queue-number system for licenses, liens, and registry extracts. Officials say the change should reduce duplicate appointments and help visitors estimate how long routine paperwork will take.`
  },
  {
    category: 'tourism',
    priority: 'low',
    headline: ({ place }) => `${place} Tourism Board Promotes Off-Season Walking Routes`,
    deck: ({ place }) => `The tourism board on ${place} promoted several off-season walking routes, small markets, and family restaurants.`,
    body: ({ place }) => `The tourism board on ${place} promoted several off-season walking routes, small markets, and family restaurants. Travel clerks say the campaign is aimed at budget visitors and crews with one or two idle days between cargo assignments.`
  },
  {
    category: 'standards',
    priority: 'low',
    headline: ({ place }) => `Standards Bureau On ${place} Updates Cargo Label Examples`,
    deck: ({ place }) => `The standards bureau on ${place} updated sample cargo labels for foodstuffs, textiles, and low-risk machine parts.`,
    body: ({ place }) => `The standards bureau on ${place} updated sample cargo labels for foodstuffs, textiles, and low-risk machine parts. The bureau says the update is instructional and does not create new penalties. Printable templates are available at licensed terminal kiosks.`
  }
];

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildSeed(index) {
  const dateline = DATELINES[index % DATELINES.length];
  const story = STORIES[Math.floor(index / DATELINES.length) % STORIES.length];
  const source = SOURCES[(index + Math.floor(index / DATELINES.length)) % SOURCES.length];
  const place = dateline.name;
  const sequence = index + 1;
  const topic = story.category;

  return {
    id: `holonews-${String(sequence).padStart(3, '0')}`,
    source,
    dateline: place,
    sector: dateline.sector,
    category: topic,
    priority: story.priority,
    tone: 'ambient',
    era: 'any',
    headline: story.headline({ place, sector: dateline.sector, source }),
    deck: story.deck({ place, sector: dateline.sector, source }),
    body: story.body({ place, sector: dateline.sector, source }),
    tags: ['holonews', 'ambient', topic, dateline.sector.toLowerCase().replace(/\s+/g, '-')],
    breakingNews: false,
    ambient: true
  };
}

export const HOLONEWS_SEED_EVENTS = Array.from({ length: 500 }, (_, index) => buildSeed(index));

export class HolonewsGenerator {
  static all() {
    return HOLONEWS_SEED_EVENTS;
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
      .sort((a, b) => ['low', 'normal', 'high', 'critical'].indexOf(a) - ['low', 'normal', 'high', 'critical'].indexOf(b))
      .map((priority) => ({ value: priority, label: titleCase(priority) }));
  }

  static #filter(filters = {}) {
    const query = String(filters.query || filters.q || '').trim().toLowerCase();
    const excludeIds = new Set(Array.isArray(filters.excludeIds) ? filters.excludeIds.filter(Boolean) : []);
    return HOLONEWS_SEED_EVENTS.filter((entry) => {
      if (excludeIds.has(entry.id)) return false;
      if (filters.category && entry.category !== filters.category) return false;
      if (filters.priority && entry.priority !== filters.priority) return false;
      if (filters.sector && entry.sector !== filters.sector) return false;
      if (query) {
        const haystack = [
          entry.id,
          entry.source,
          entry.dateline,
          entry.sector,
          entry.category,
          entry.priority,
          entry.headline,
          entry.deck,
          entry.body,
          ...(entry.tags ?? [])
        ].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
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
        breakingNews,
        holonewsSeedId: seed.id,
        newsSource: overrides.authorName ?? seed.source,
        dateline: overrides.dateline ?? seed.dateline,
        sector: overrides.sector ?? seed.sector,
        newsTone: seed.tone,
        newsEra: seed.era,
        newsCategory: seed.category,
        newsDeck: seed.deck,
        tags: seed.tags ?? []
      }
    };
  }
}
