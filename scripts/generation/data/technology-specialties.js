/**
 * PHASE 8D-3A R2 fix 10 (technology production refinement) — centralized,
 * generator-only catalog of notable technology specialties a world can be
 * known for.
 *
 * Distinct from `technologyLevel` (the civilization's general capability)
 * and `technologyAccess` (how broadly galactic technology reaches this
 * world): a specialty describes a specific area the world is NOTABLY
 * capable in, independent of both -- a `frontier`-level world can still
 * have a real "salvage and reclamation technology" specialty, and a
 * `cutting-edge` world need not have any specialty at all.
 *
 * `tags` deliberately reuse the SAME economy-sector vocabulary
 * `data/planet-economies.js` already establishes (`shipbuilding`,
 * `droids`, `military-industrial`, `medical`, `energy`, `mining`,
 * `agriculture`, `trade`, `security`, `financial-services`, `cultural`,
 * `salvage`, `entertainment`, `education`, `technology`, `research`,
 * `urban`, `rural`, `frontier`, `industrial`, `mysterious`) rather than
 * inventing a second, competing tag vocabulary -- so a specialty can be
 * softly preferred by the exact same region/world-class/economy context
 * every other generation-preference pick already reads.
 */

export const TECHNOLOGY_SPECIALTIES = Object.freeze([
  { value: 'starship engineering', weight: 2, tags: ['shipbuilding', 'technology', 'industrial'] },
  { value: 'hyperdrive systems', weight: 1, tags: ['shipbuilding', 'technology'] },
  { value: 'droid engineering', weight: 2, tags: ['droids', 'technology'] },
  { value: 'artificial intelligence research', weight: 1, tags: ['droids', 'technology', 'research'] },
  { value: 'weapons research and development', weight: 2, tags: ['military-industrial', 'technology'] },
  { value: 'starfighter design', weight: 1, tags: ['military-industrial', 'shipbuilding', 'technology'] },
  { value: 'medical and bacta research', weight: 2, tags: ['medical', 'technology'] },
  { value: 'cybernetics', weight: 1, tags: ['medical', 'technology'] },
  { value: 'cloning technology', weight: 1, tags: ['medical', 'technology', 'mysterious'] },
  { value: 'biotechnology', weight: 1, tags: ['medical', 'technology', 'research'] },
  { value: 'energy and reactor systems', weight: 2, tags: ['energy', 'technology'] },
  { value: 'computer systems and slicing', weight: 2, tags: ['technology', 'urban'] },
  { value: 'communications technology', weight: 1, tags: ['technology', 'trade'] },
  { value: 'security and surveillance systems', weight: 1, tags: ['security', 'technology', 'urban'] },
  { value: 'financial and data systems', weight: 1, tags: ['financial-services', 'technology'] },
  { value: 'agricultural technology', weight: 1, tags: ['agriculture', 'technology', 'rural'] },
  { value: 'terraforming technology', weight: 1, tags: ['technology', 'agriculture'] },
  { value: 'mining and extraction technology', weight: 2, tags: ['mining', 'technology', 'industrial'] },
  { value: 'salvage and reclamation technology', weight: 1, tags: ['salvage', 'technology', 'frontier'] },
  { value: 'stealth technology', weight: 1, tags: ['military-industrial', 'technology', 'mysterious'] },
  { value: 'archaeotech recovery', weight: 1, tags: ['cultural', 'technology', 'mysterious'] },
  { value: 'vehicle and speeder engineering', weight: 1, tags: ['manufacturing', 'technology'] },
  { value: 'holotech and entertainment systems', weight: 1, tags: ['entertainment', 'technology', 'urban'] },
  { value: 'educational and research infrastructure', weight: 1, tags: ['education', 'technology', 'research'] }
]);
