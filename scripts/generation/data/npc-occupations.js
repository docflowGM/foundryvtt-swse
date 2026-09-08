/**
 * PHASE 8D-3B production — NPC occupation catalog.
 *
 * `occupation` is MORE SPECIFIC than `role` (`data/npc-roles.js`'s
 * broad functional categories, e.g. `'technician'`) -- an occupation
 * is the actual job title ("Hyperdrive Maintenance Engineer"). The two
 * stay separate fields on purpose (phase spec §3/§9): `role: 'technician'`
 * + `occupation: 'hyperdrive maintenance engineer'` is the intended
 * shape, never one collapsing into the other. `roleTag` links each
 * entry to the SAME broad role vocabulary `data/npc-roles.js` already
 * uses (its `value` strings) so `npc/npc-occupation.js` can filter
 * occupations to ones plausible for an NPC's already-rolled `role`,
 * rather than maintaining a second, disconnected role taxonomy.
 *
 * Representative catalog (phase target: 250-400; this pass ships a
 * substantial representative set across every `data/npc-roles.js` role
 * category, sized and quality-checked, with further production
 * expansion toward the full target left as documented follow-up work --
 * see the phase completion report).
 */

function occ(value, roleTag, weight, tags) {
  return { value, roleTag, weight, tags };
}

export const NPC_OCCUPATIONS = Object.freeze([
  // civilian resident / laborer
  occ('dockworker', 'laborer', 2, ['trade', 'urban']),
  occ('warehouse hand', 'laborer', 2, ['trade', 'industrial']),
  occ('sanitation worker', 'laborer', 1, ['urban']),
  occ('farmhand', 'farmer', 2, ['agriculture', 'rural']),
  occ('irrigation technician', 'farmer', 1, ['agriculture', 'rural']),
  occ('herd tender', 'rancher', 1, ['agriculture', 'rural', 'frontier']),

  // merchant / trade
  occ('market stall owner', 'merchant', 2, ['trade', 'urban']),
  occ('cargo broker', 'trader', 2, ['trade', 'business-professional']),
  occ('spice trader', 'trader', 1, ['trade', 'crime-syndicate']),
  occ('parts dealer', 'merchant', 2, ['trade', 'technology']),
  occ('import-export agent', 'trader', 1, ['trade', 'government-bureaucracy']),
  occ('street vendor', 'street vendor', 1, ['trade', 'urban']),

  // technician / mechanic
  occ('hyperdrive maintenance engineer', 'technician', 2, ['technology', 'trade']),
  occ('droid repair technician', 'droid technician', 2, ['droids', 'technology']),
  occ('starship mechanic', 'starship mechanic', 2, ['technology', 'trade']),
  occ('power grid technician', 'technician', 1, ['technology', 'industrial']),
  occ('comm relay technician', 'communications specialist', 1, ['technology']),
  occ('vehicle mechanic', 'mechanic', 2, ['technology', 'frontier']),
  occ('sensor array technician', 'sensor operator', 1, ['technology', 'military-paramilitary']),

  // medical
  occ('street physician', 'doctor', 2, ['medical', 'urban']),
  occ('field medic', 'field medic', 2, ['medical', 'military-paramilitary']),
  occ('bacta tank attendant', 'bacta clinic attendant', 1, ['medical']),
  occ('trauma surgeon', 'surgeon', 1, ['medical', 'business-professional']),
  occ('veterinary medic', 'doctor', 1, ['medical', 'agriculture']),

  // scientist / academic
  occ('xenobotanist', 'scientist', 1, ['research', 'frontier']),
  occ('astrocartographer', 'researcher', 1, ['research', 'technology']),
  occ('archivist', 'archivist', 2, ['education', 'government-bureaucracy']),
  occ('university lecturer', 'professor', 1, ['education']),
  occ('field archaeologist', 'archaeologist', 1, ['research', 'cultural']),

  // security / enforcement
  occ('customs inspector', 'customs officer', 2, ['government-bureaucracy', 'enforcement']),
  occ('beat patrol officer', 'beat officer', 2, ['enforcement', 'urban']),
  occ('private security contractor', 'security guard', 2, ['security', 'business-professional']),
  occ('prison warden', 'warden', 1, ['enforcement', 'government-bureaucracy']),
  occ('investigative detective', 'detective', 1, ['enforcement', 'urban']),

  // military
  occ('garrison trooper', 'private soldier', 2, ['military-paramilitary']),
  occ('squadron gunnery sergeant', 'squad leader', 1, ['military-paramilitary']),
  occ('quartermaster corps clerk', 'quartermaster', 1, ['military-paramilitary']),
  occ('reconnaissance scout', 'sentry', 1, ['military-paramilitary', 'frontier']),

  // pilot / spacefaring
  occ('freighter captain', 'freighter captain', 2, ['trade', 'frontier']),
  occ('shuttle pilot', 'shuttle pilot', 1, ['trade', 'urban']),
  occ('system-traffic controller', 'navigator', 1, ['trade', 'technology']),
  occ('survey ship navigator', 'navigator', 1, ['research', 'frontier']),

  // slicer / criminal
  occ('data slicer', 'slicer', 2, ['technology', 'crime-syndicate']),
  occ('information broker', 'informant', 1, ['crime-syndicate']),
  occ('fence for stolen goods', 'fence (stolen goods)', 1, ['crime-syndicate', 'trade']),
  occ('smuggling coordinator', 'smuggler', 2, ['crime-syndicate', 'trade']),
  occ('bounty hunter', 'bounty hunter', 2, ['crime-syndicate', 'frontier']),
  occ('debt collector', 'enforcer', 1, ['crime-syndicate']),

  // noble / politics
  occ('minor noble scion', 'noble scion', 1, ['noble-house']),
  occ('house steward', 'house steward', 1, ['noble-house']),
  occ('provincial senator', 'senator', 1, ['government-bureaucracy']),
  occ('campaign strategist', 'political operative', 1, ['government-bureaucracy']),
  occ('diplomatic attache', 'attache', 1, ['government-bureaucracy', 'noble-house']),

  // religious
  occ('temple caretaker', 'temple attendant', 1, ['religion']),
  occ('itinerant preacher', 'priest', 1, ['religion', 'frontier']),
  occ('order initiate', 'novice acolyte', 1, ['force-tradition']),

  // explorer / frontier
  occ('mineral surveyor', 'surveyor', 2, ['mining', 'frontier']),
  occ('wilderness guide', 'guide', 1, ['frontier', 'rural']),
  occ('homestead pioneer', 'settler', 1, ['frontier', 'rural']),

  // administrator / bureaucrat
  occ('permit clerk', 'clerk', 2, ['government-bureaucracy']),
  occ('records administrator', 'clerk of records', 1, ['government-bureaucracy']),
  occ('district administrator', 'administrator', 2, ['government-bureaucracy']),
  occ('port authority officer', 'customs officer', 1, ['government-bureaucracy', 'trade']),

  // corporate / financial
  occ('corporate auditor', 'accountant', 1, ['financial-services', 'business-professional']),
  occ('logistics foreman', 'company foreman', 1, ['business-professional', 'industrial']),
  occ('shipping fleet manager', 'department director', 1, ['business-professional', 'trade']),
  occ('investment broker', 'broker', 1, ['financial-services']),
  occ('appraisal specialist', 'appraiser', 1, ['financial-services', 'trade']),

  // entertainment / hospitality
  occ('cantina owner', 'shopkeeper', 2, ['entertainment', 'urban']),
  occ('holo-performer', "entertainer / holo-performer", 1, ['entertainment']),
  occ('investigative reporter', 'journalist / newsnet stringer', 1, ['entertainment', 'government-bureaucracy']),
  occ('lounge singer', 'performer', 1, ['entertainment']),

  // mining / industrial
  occ('mining foreman', 'company foreman', 2, ['mining', 'industrial']),
  occ('ore refinery operator', 'factory worker', 1, ['mining', 'industrial']),
  occ('drilling rig operator', 'miner', 1, ['mining', 'frontier']),

  // shipbuilding / weapons
  occ('shipwright', 'shipwright', 1, ['shipbuilding', 'industrial']),
  occ('weapons technician', 'armorer', 1, ['military-industrial']),
  occ('arms dealer', 'weapons dealer', 1, ['military-industrial', 'crime-syndicate']),

  // household / domestic
  occ('household majordomo', 'household staff', 1, ['noble-house']),
  occ('groundskeeper', 'groundskeeper', 1, ['rural', 'noble-house']),

  // droid-adjacent living occupations
  occ('droid programmer', 'droid technician', 1, ['droids', 'technology']),
  occ('automation systems engineer', 'engineer', 1, ['droids', 'technology', 'industrial'])
]);
