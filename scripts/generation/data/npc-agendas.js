/**
 * PHASE 8D-2 foundation — NPC agenda ("what they're actively pursuing
 * right now") pool for `npc/npc-narrative-generator.js`. Representative
 * catalog (25 entries). Distinct from `npc-motivations.js` ("why") --
 * see `npc-concept.js`'s field-header comment.
 */

export const NPC_AGENDAS = Object.freeze([
  { value: 'quietly building a smuggling network on the side', weight: 2, tags: ['criminal'] },
  { value: 'climbing the ranks of their own organization', weight: 3, tags: ['business', 'military'] },
  { value: 'gathering evidence against a rival', weight: 2, tags: ['criminal', 'business'] },
  { value: 'planning to defect to a rival power', weight: 1, tags: ['military'] },
  { value: 'searching for a lost family member', weight: 2, tags: ['community'] },
  { value: 'quietly undermining a superior they distrust', weight: 2, tags: ['business', 'military'] },
  { value: 'amassing resources for an eventual escape', weight: 2, tags: ['criminal', 'frontier'] },
  { value: 'recruiting others to a growing cause', weight: 2, tags: ['military', 'religion'] },
  { value: 'trying to broker a deal between two hostile parties', weight: 2, tags: ['business'] },
  { value: 'hunting down whoever wronged them', weight: 2, tags: ['criminal', 'military'] },
  { value: 'stockpiling weapons ahead of an expected conflict', weight: 1, tags: ['military'] },
  { value: 'working to expose corruption in local leadership', weight: 2, tags: ['government'] },
  { value: 'trying to buy their way out of a dangerous obligation', weight: 2, tags: ['criminal', 'business'] },
  { value: 'building a reputation as someone not to cross', weight: 2, tags: ['criminal'] },
  { value: 'training a successor to take over their role', weight: 1, tags: ['business', 'military'] },
  { value: 'trying to keep an old secret from coming out', weight: 2, tags: ['mysterious'] },
  { value: 'negotiating safe passage for people fleeing danger', weight: 1, tags: ['community'] },
  { value: 'chasing a rumor about a valuable find', weight: 2, tags: ['criminal', 'business'] },
  { value: 'trying to reconcile with someone they wronged', weight: 1, tags: [] },
  { value: 'infiltrating a rival organization', weight: 1, tags: ['criminal', 'military'] },
  { value: 'setting up an independent operation away from their current employer', weight: 2, tags: ['business', 'criminal'] },
  { value: 'protecting a secret cache of resources', weight: 1, tags: ['criminal', 'frontier'] },
  { value: 'campaigning for a position of local authority', weight: 1, tags: ['government'] },
  { value: 'simply doing their job, no larger agenda at play', weight: 3, tags: [] },
  { value: 'watching and waiting for the right moment to act', weight: 2, tags: ['mysterious'] }
]);
