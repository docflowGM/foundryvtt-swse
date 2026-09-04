/**
 * PHASE 8D-2 foundation — system-name designation pool for
 * `names/system-name-generator.js`.
 *
 * Confirmed by reconnaissance: `location-library-seeds.js` names every
 * known system after its primary planet (`"system": "Dantooine system"`).
 * That remains the default convention this generator reuses. This small
 * pool exists only for the (rarer) case a caller wants an
 * independently-named system — e.g. a system named for a shared
 * astrographic feature rather than any one world in it — never a
 * replacement for the "<Planet> system" convention.
 */

export const SYSTEM_NAME_DESIGNATIONS = Object.freeze([
  { value: 'Reach', weight: 3, tags: ['frontier', 'void'] },
  { value: 'Cluster', weight: 3, tags: ['trade', 'urban'] },
  { value: 'Expanse', weight: 3, tags: ['frontier', 'mysterious'] },
  { value: 'Drift', weight: 2, tags: ['void', 'mysterious'] },
  { value: 'Corridor', weight: 3, tags: ['trade', 'urban'] },
  { value: 'Belt', weight: 2, tags: ['void', 'mysterious'] },
  { value: 'Reaches', weight: 2, tags: ['frontier', 'void'] },
  { value: 'Marches', weight: 2, tags: ['frontier', 'rural'] },
  { value: 'Sprawl', weight: 2, tags: ['urban', 'trade'] },
  { value: 'Verge', weight: 2, tags: ['frontier', 'mysterious'] },
  { value: 'Span', weight: 2, tags: ['trade', 'urban'] },
  { value: 'Approach', weight: 2, tags: ['frontier', 'void'] }
]);
