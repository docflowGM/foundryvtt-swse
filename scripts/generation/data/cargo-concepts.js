/**
 * PHASE 8D-2 correction pass — NARRATIVE cargo/mission-object pool for
 * `jobs/cargo-concept.js`.
 *
 * CORRECTED (independent review, round 2): the original 24-entry table
 * duplicated the shared Galactic Commodity Catalog with its own
 * free-text strings for ordinary tradeable goods (medical supplies,
 * restricted weapons, spice, droid parts, fuel cells, ...). Those now
 * resolve as COMMODITY cargo against `data/galactic-commodities.js` by
 * `commodityId` (see `jobs/cargo-concept.js`'s `pickCommodityCargo()`)
 * instead of a second, drifting vocabulary.
 *
 * This trimmed table keeps ONLY genuinely non-commodity mission
 * objects — things with no stable per-unit market identity a Trade
 * Resolver could ever price or route: sealed correspondence, case
 * files, unknown contents, and living beings. `tags` still carry a
 * legality flavor (`legal`/`gray-area`/`illegal`) for soft biasing.
 */

export const NARRATIVE_CARGO_CONCEPTS = Object.freeze([
  { value: 'a sealed diplomatic pouch', weight: 2, tags: ['legal'] },
  { value: 'evidence in a sealed evidence locker', weight: 2, tags: ['legal', 'gray-area'] },
  { value: 'an unmarked crate -- contents unknown to the crew', weight: 3, tags: ['gray-area', 'illegal'] },
  { value: 'a shipment of live cargo (animals)', weight: 2, tags: ['gray-area'] },
  { value: 'a group of passengers requiring discreet transport', weight: 2, tags: ['gray-area'] },
  { value: 'refugees seeking passage off-world', weight: 2, tags: ['legal', 'gray-area'] },
  { value: 'a one-off prototype device, still in testing', weight: 2, tags: ['gray-area'] },
  { value: 'a case of experimental research samples', weight: 1, tags: ['gray-area'] },
  { value: 'a crate of confiscated contraband, bound for disposal', weight: 1, tags: ['legal'] },
  { value: 'a locked case of counterfeit credits', weight: 1, tags: ['illegal'] },
  { value: 'a strongbox of hard currency', weight: 2, tags: ['legal'] }
]);
