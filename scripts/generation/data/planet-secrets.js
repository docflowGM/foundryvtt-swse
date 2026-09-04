/**
 * PHASE 8D-3A production — planet-level GM-only secret pool for
 * `planets/planet-hooks.js`. Distinct from `npc-secrets.js` (a
 * secret a specific PERSON is hiding) -- these are secrets about the
 * WORLD itself: a hidden history, a buried threat, a truth the public
 * face of the planet doesn't reflect. Purely a GM-facing hook, matching
 * `npc-secrets.js`'s own "never revealed automatically" discipline --
 * generating one here never creates a Journal entry, an Intel record,
 * or any other canonical fact.
 */

export const PLANET_SECRETS = Object.freeze([
  { value: 'the official history omits a massacre the government would rather forget', weight: 2, tags: ['government-bureaucracy', 'post-war'] },
  { value: 'a Force nexus lies undiscovered beneath the surface', weight: 1, tags: ['force-tradition', 'mysterious'] },
  { value: 'the government is a puppet administration for an offworld power', weight: 2, tags: ['government-bureaucracy', 'occupied'] },
  { value: 'a precursor ruin beneath the capital has never been fully excavated', weight: 1, tags: ['ancient', 'mysterious'] },
  { value: 'local law enforcement is quietly on a crime syndicate\'s payroll', weight: 2, tags: ['enforcement', 'crime-syndicate'] },
  { value: 'an old weapon cache from a past conflict was never recovered', weight: 2, tags: ['military', 'post-war'] },
  { value: 'the world\'s prosperity depends on a resource that is quietly running out', weight: 2, tags: ['economic-crisis', 'trade'] },
  { value: 'a noble house here maintains a bloodline no one is supposed to know still exists', weight: 1, tags: ['noble-house', 'mysterious'] },
  { value: 'the planet\'s stated population figures are deliberately falsified', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'a research facility conducted illegal experiments that were covered up', weight: 1, tags: ['research', 'hazard'] },
  { value: 'a religious order here guards a secret its own followers don\'t know', weight: 1, tags: ['religion', 'mysterious'] },
  { value: 'a fugitive of galactic significance is hiding in plain sight', weight: 2, tags: ['criminal', 'mysterious'] },
  { value: 'the planet was terraformed over the ruins of an earlier failed colony', weight: 1, tags: ['terraformed', 'mysterious'] },
  { value: 'a corporation quietly owns the local government through shell interests', weight: 2, tags: ['business-professional', 'trade'] },
  { value: 'a plague outbreak decades ago was deliberately suppressed from galactic records', weight: 1, tags: ['plague', 'government-bureaucracy'] },
  { value: 'an ancient burial ground beneath a populated district was built over, not moved', weight: 1, tags: ['sacred', 'ancient'] },
  { value: 'a splinter faction is secretly stockpiling weapons for an uprising', weight: 2, tags: ['rebellious', 'military-paramilitary'] },
  { value: 'the planet\'s official defense strength is far weaker than it publicly claims', weight: 1, tags: ['military', 'unstable'] },
  { value: 'a black-market network smuggles through the main starport with official cover', weight: 2, tags: ['black-market', 'trade'] },
  { value: 'a decades-old disappearance was never actually solved, only closed', weight: 1, tags: ['mysterious', 'criminal'] },
  { value: 'the world\'s current government came to power through a quietly-buried coup', weight: 1, tags: ['government-bureaucracy', 'succession-crisis'] },
  { value: 'an experimental droid population was never properly decommissioned', weight: 1, tags: ['droids', 'technology'] },
  { value: 'a sacred site\'s true history contradicts the officially sanctioned version', weight: 1, tags: ['sacred', 'religion'] },
  { value: 'the planet secretly hosts a black site for an intelligence agency', weight: 1, tags: ['government-bureaucracy', 'mysterious'] },
  { value: 'a natural resource here has quietly attracted the attention of a hostile power', weight: 2, tags: ['mining', 'contested'] },
  { value: 'a founding myth of the local culture is a deliberate fabrication', weight: 1, tags: ['cultural', 'mysterious'] },
  { value: 'a hidden faction has infiltrated the highest levels of local administration', weight: 2, tags: ['government-bureaucracy', 'criminal'] },
  { value: 'nothing of particular note is being hidden here', weight: 3, tags: [] }
]);
