/**
 * PHASE 8D-2 foundation — procedural planet notable-trait pool for
 * `planets/planet-traits.js`. Representative catalog (26 entries). A
 * trait is a short GENERATE-tier flavor fact distinct from a hazard
 * (danger/risk) or a history hook (past event) — it describes something
 * notable about the world AS IT IS NOW.
 */

export const PLANET_TRAITS = Object.freeze([
  { value: 'rich mineral deposits', weight: 3, tags: ['mountain', 'volcanic', 'desert'] },
  { value: 'unusually strong Force presence', weight: 1, tags: ['force-tradition', 'mysterious'] },
  { value: 'strategic hyperspace lane junction', weight: 3, tags: ['trade', 'military-paramilitary'] },
  { value: 'famous for a unique local delicacy or export good', weight: 2, tags: ['trade', 'civilian'] },
  { value: 'home to a distinctive native species', weight: 3, tags: ['community-tribe'] },
  { value: 'known for extreme climate swings', weight: 2, tags: [] },
  { value: 'heavily fortified border world', weight: 2, tags: ['military-paramilitary'] },
  { value: 'famous ancient ruins/archaeological site', weight: 2, tags: ['mysterious', 'desert'] },
  { value: 'a bustling multi-species melting pot', weight: 3, tags: ['urban', 'cosmopolitan'] },
  { value: 'strict local laws/customs unfamiliar to outsiders', weight: 2, tags: ['government-bureaucracy'] },
  { value: 'renowned shipyards', weight: 2, tags: ['urban', 'trade'] },
  { value: 'famous scenic/tourist destination', weight: 1, tags: ['ocean', 'civilian'] },
  { value: 'isolated -- few visitors, insular culture', weight: 3, tags: ['frontier', 'rural'] },
  { value: 'heavy corporate presence and influence', weight: 3, tags: ['business-professional'] },
  { value: 'known criminal safe haven', weight: 2, tags: ['crime-syndicate'] },
  { value: 'strong local pride / distinct regional identity', weight: 2, tags: [] },
  { value: 'notable for its unusual native wildlife', weight: 2, tags: ['jungle', 'forest'] },
  { value: 'religious pilgrimage destination', weight: 1, tags: ['religion'] },
  { value: 'famous underground/subterranean settlements', weight: 1, tags: ['mountain', 'desert'] },
  { value: 'heavily industrialized and polluted', weight: 2, tags: ['urban', 'volcanic'] },
  { value: 'sparse population spread across vast distances', weight: 2, tags: ['frontier'] },
  { value: 'a hotly contested political flashpoint', weight: 2, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'home to a renowned academy or training institution', weight: 1, tags: ['business-professional', 'force-tradition'] },
  { value: 'unusually advanced local technology', weight: 1, tags: ['urban'] },
  { value: 'famously lawless frontier territory', weight: 2, tags: ['frontier', 'crime-syndicate'] },
  { value: 'unremarkable in most respects', weight: 3, tags: [] }
]);
