/**
 * PHASE 8D-2 foundation — procedural planet government pool for
 * `planets/planet-government.js`. `tags` loosely reuse
 * `organization-metadata.js`'s `ORGANIZATION_FAMILY` values so a caller
 * can softly bias toward a government that fits an already-rolled
 * dominant Faction on the world, without a hard coupling between the
 * two systems.
 *
 * PHASE 8D-3A production expansion: grown from 24 representative
 * entries to a ~50-entry production catalog covering the eight
 * categories the phase spec named — democratic/republic, monarchic/
 * noble, corporate, military, traditional/community, religious,
 * technocratic, and weak/fractured governments. Era-neutral throughout
 * (no baked-in "Imperial"/"Republic"-era-specific naming beyond the two
 * original entries that already existed before this pass, kept for
 * back-compat) per the phase's own era-neutrality instruction.
 */

export const PLANET_GOVERNMENTS = Object.freeze([
  // --- original representative entries (unchanged) ---
  { value: 'hereditary monarchy', weight: 2, tags: ['noble-house'] },
  { value: 'planetary council', weight: 4, tags: ['government-bureaucracy'] },
  { value: 'corporate oligarchy', weight: 3, tags: ['business-professional'] },
  { value: 'military junta', weight: 2, tags: ['military-paramilitary'] },
  { value: 'Imperial governorship', weight: 3, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'tribal confederation', weight: 3, tags: ['community-tribe'] },
  { value: 'no unified government', weight: 3, tags: ['crime-syndicate'] },
  { value: 'theocracy', weight: 2, tags: ['religion'] },
  { value: 'guild consortium', weight: 2, tags: ['business-professional'] },
  { value: 'elected senate', weight: 3, tags: ['government-bureaucracy'] },
  { value: 'crime-lord fiefdom', weight: 2, tags: ['crime-syndicate'] },
  { value: 'clan-based chiefdom', weight: 2, tags: ['community-tribe'] },
  { value: 'technocracy', weight: 2, tags: ['business-professional'] },
  { value: 'occupied territory', weight: 2, tags: ['military-paramilitary', 'enforcement'] },
  { value: 'free port charter', weight: 2, tags: ['business-professional'] },
  { value: 'planetary magistrate', weight: 2, tags: ['enforcement', 'government-bureaucracy'] },
  { value: 'Force-tradition stewardship', weight: 1, tags: ['force-tradition'] },
  { value: 'refugee provisional council', weight: 2, tags: ['community-tribe'] },
  { value: 'noble house dominion', weight: 2, tags: ['noble-house'] },
  { value: 'mining-cartel administration', weight: 2, tags: ['business-professional'] },
  { value: 'mercenary compact', weight: 1, tags: ['military-paramilitary'] },
  { value: 'contested/disputed rule', weight: 2, tags: ['military-paramilitary', 'crime-syndicate'] },
  { value: 'droid administrative directorate', weight: 1, tags: ['business-professional'] },
  { value: 'uninhabited -- no government', weight: 2, tags: [] },

  // --- democratic / republic ---
  { value: 'representative republic', weight: 3, tags: ['government-bureaucracy'] },
  { value: 'parliamentary republic', weight: 3, tags: ['government-bureaucracy'] },
  { value: 'direct democracy', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'federation of city-states', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'confederated republic', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'elected planetary assembly', weight: 2, tags: ['government-bureaucracy'] },

  // --- monarchic / noble ---
  { value: 'constitutional monarchy', weight: 2, tags: ['noble-house', 'government-bureaucracy'] },
  { value: 'absolute monarchy', weight: 1, tags: ['noble-house'] },
  { value: 'elective monarchy', weight: 1, tags: ['noble-house'] },
  { value: 'noble council', weight: 2, tags: ['noble-house'] },
  { value: 'hereditary oligarchy', weight: 2, tags: ['noble-house', 'business-professional'] },
  { value: 'regency council', weight: 1, tags: ['noble-house'] },

  // --- corporate ---
  { value: 'company administration', weight: 3, tags: ['business-professional'] },
  { value: 'corporate protectorate', weight: 2, tags: ['business-professional', 'military-paramilitary'] },
  { value: 'trade consortium authority', weight: 2, tags: ['business-professional'] },
  { value: 'shareholder council', weight: 2, tags: ['business-professional'] },

  // --- military ---
  { value: 'military governorship', weight: 2, tags: ['military-paramilitary'] },
  { value: 'martial administration', weight: 2, tags: ['military-paramilitary', 'enforcement'] },
  { value: 'garrison command', weight: 1, tags: ['military-paramilitary'] },

  // --- traditional / community ---
  { value: 'council of elders', weight: 2, tags: ['community-tribe'] },
  { value: 'hereditary chieftainship', weight: 2, tags: ['community-tribe', 'noble-house'] },
  { value: 'clan-elder assembly', weight: 2, tags: ['community-tribe'] },

  // --- religious ---
  { value: 'religious council', weight: 2, tags: ['religion'] },
  { value: 'monastic administration', weight: 1, tags: ['religion', 'force-tradition'] },
  { value: 'high-priesthood rule', weight: 1, tags: ['religion'] },

  // --- technocratic ---
  { value: 'scientific council', weight: 1, tags: ['business-professional'] },
  { value: 'automated administrative network', weight: 1, tags: ['business-professional'] },

  // --- weak / fractured ---
  { value: 'city-state federation', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'fractured, competing states', weight: 2, tags: ['military-paramilitary'] },
  { value: 'provisional government', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'revolutionary council', weight: 1, tags: ['military-paramilitary'] },
  { value: 'independent settlements collective', weight: 2, tags: ['community-tribe'] }
]);
