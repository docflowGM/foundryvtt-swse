/**
 * PHASE 8D-2 foundation — cargo/mission-object concept pool for
 * `jobs/cargo-concept.js`. Representative catalog (24 entries). Fills
 * `objective-template.js`'s existing `CARGO`/`ITEM` slot types. `tags`
 * include a legality flavor (`legal`/`gray-area`/`illegal`) so a
 * generator can bias cargo to match a Job's already-rolled legality.
 */

export const CARGO_CONCEPTS = Object.freeze([
  { value: 'a crate of medical supplies', weight: 3, tags: ['legal'] },
  { value: 'a shipment of restricted weapons', weight: 2, tags: ['illegal'] },
  { value: 'a case of stolen data cores', weight: 2, tags: ['illegal'] },
  { value: 'a container of raw spice', weight: 2, tags: ['illegal'] },
  { value: 'a prototype piece of technology', weight: 2, tags: ['gray-area'] },
  { value: 'a collection of rare art or relics', weight: 1, tags: ['gray-area'] },
  { value: 'a shipment of hard currency', weight: 2, tags: ['legal'] },
  { value: 'a cache of forged identification documents', weight: 1, tags: ['illegal'] },
  { value: 'a shipment of agricultural equipment', weight: 2, tags: ['legal'] },
  { value: 'a container of black-market starship parts', weight: 2, tags: ['illegal'] },
  { value: 'a crate of confiscated contraband', weight: 1, tags: ['legal'] },
  { value: 'a sealed diplomatic pouch', weight: 1, tags: ['legal'] },
  { value: 'a shipment of live cargo (animals)', weight: 1, tags: ['gray-area'] },
  { value: 'a case of experimental medical samples', weight: 1, tags: ['gray-area'] },
  { value: 'a shipment of luxury goods', weight: 2, tags: ['legal'] },
  { value: 'stolen corporate research data', weight: 2, tags: ['illegal'] },
  { value: 'a shipment of weapons-grade components', weight: 1, tags: ['illegal'] },
  { value: 'a crate of salvaged droid parts', weight: 2, tags: ['legal', 'gray-area'] },
  { value: 'a container of counterfeit credits', weight: 1, tags: ['illegal'] },
  { value: 'religious/cultural artifacts being repatriated', weight: 1, tags: ['legal'] },
  { value: 'a shipment of refugee supplies', weight: 2, tags: ['legal'] },
  { value: 'evidence in a sealed evidence locker', weight: 2, tags: ['legal', 'gray-area'] },
  { value: 'a case of high-grade fuel cells', weight: 2, tags: ['legal'] },
  { value: 'an unmarked crate -- contents unknown to the crew', weight: 2, tags: ['gray-area', 'illegal'] }
]);
