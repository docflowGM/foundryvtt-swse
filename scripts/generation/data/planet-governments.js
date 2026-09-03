/**
 * PHASE 8D-2 foundation — procedural planet government pool for
 * `planets/planet-government.js`. Representative catalog (24 entries),
 * not exhaustive — establishing the shape, not the full production
 * list. `tags` loosely reuse `organization-metadata.js`'s
 * `ORGANIZATION_FAMILY` values so a caller can softly bias toward a
 * government that fits an already-rolled dominant Faction on the world,
 * without a hard coupling between the two systems.
 */

export const PLANET_GOVERNMENTS = Object.freeze([
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
  { value: 'uninhabited -- no government', weight: 2, tags: [] }
]);
