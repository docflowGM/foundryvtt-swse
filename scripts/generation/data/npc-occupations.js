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
  occ('automation systems engineer', 'engineer', 1, ['droids', 'technology', 'industrial']),

  // PHASE 8D-3B FINAL CONTENT HYDRATION PASS -- expanded toward the
  // documented production target (250-400).

  // civilian resident / laborer (cont.)
  occ('freight yard laborer', 'dockhand', 1, ['trade', 'industrial']),
  occ('scrap sorter', 'laborer', 1, ['urban', 'industrial']),
  occ('night-shift custodian', 'laborer', 1, ['urban']),
  occ('cargo crane operator', 'cargo loader', 1, ['trade', 'industrial']),
  occ('water reclamation worker', 'laborer', 1, ['industrial']),
  occ('orchard tender', 'farmer', 1, ['agriculture', 'rural']),
  occ('livestock auctioneer', 'rancher', 1, ['agriculture', 'rural', 'trade']),
  occ('grain silo operator', 'farmer', 1, ['agriculture', 'rural']),
  occ('fisher-fleet deckhand', 'fisher', 1, ['agriculture', 'rural']),
  occ('community water-rights clerk', 'clerk', 0.5, ['agriculture', 'government-bureaucracy']),

  // merchant / trade (cont.)
  occ('secondhand goods dealer', 'merchant', 2, ['trade', 'urban']),
  occ('textile importer', 'trader', 1, ['trade']),
  occ('livestock broker', 'trader', 1, ['trade', 'agriculture']),
  occ('scrap metal dealer', 'merchant', 1, ['trade', 'industrial']),
  occ('spare parts wholesaler', 'merchant', 1, ['trade', 'technology']),
  occ('caravan master', 'trader', 1, ['trade', 'frontier']),
  occ('open-air market vendor', 'street vendor', 2, ['trade', 'urban']),
  occ('exotic goods importer', 'trader', 0.5, ['trade']),
  occ('bulk grain trader', 'trader', 1, ['trade', 'agriculture']),
  occ('trade route surveyor', 'trader', 0.5, ['trade', 'frontier']),
  occ('auction house appraiser', 'appraiser', 1, ['trade', 'financial-services']),
  occ('licensed pawnbroker', 'merchant', 1, ['trade', 'urban']),
  occ('freight contract broker', 'trader', 1, ['trade', 'business-professional']),
  occ('street market stall manager', 'shopkeeper', 1, ['trade', 'urban']),

  // technician / mechanic (cont.)
  occ('life-support systems technician', 'technician', 2, ['technology']),
  occ('reactor coolant technician', 'systems engineer', 1, ['technology', 'industrial']),
  occ('astromech maintenance specialist', 'droid technician', 1, ['droids', 'technology']),
  occ('landing gear specialist', 'mechanic', 1, ['technology', 'trade']),
  occ('shield generator technician', 'technician', 1, ['technology', 'military-paramilitary']),
  occ('hull plating fabricator', 'engineer', 1, ['technology', 'industrial']),
  occ('avionics calibration specialist', 'systems engineer', 1, ['technology']),
  occ('holoprojector repair technician', 'technician', 0.5, ['technology']),
  occ('atmospheric processor technician', 'systems engineer', 1, ['technology', 'industrial']),
  occ('speeder tune-up specialist', 'mechanic', 1, ['technology', 'urban']),
  occ('power coupling installer', 'technician', 1, ['technology', 'industrial']),
  occ('gravity generator technician', 'engineer', 0.5, ['technology']),
  occ('field repair specialist', 'mechanic', 1, ['technology', 'frontier']),
  occ('signal relay maintenance crew', 'communications specialist', 1, ['technology']),

  // medical (cont.)
  occ('triage coordinator', 'field medic', 1, ['medical', 'military-paramilitary']),
  occ('pharmaceutical dispenser', 'doctor', 1, ['medical', 'trade']),
  occ('physical therapist', 'doctor', 1, ['medical']),
  occ('emergency response medic', 'field medic', 1, ['medical', 'security']),
  occ('clinic administrator', 'administrator', 1, ['medical', 'government-bureaucracy']),
  occ('prosthetics fitter', 'doctor', 0.5, ['medical', 'technology']),
  occ('public health inspector', 'customs officer', 0.5, ['medical', 'government-bureaucracy']),
  occ('quarantine officer', 'security guard', 0.5, ['medical', 'enforcement']),
  occ('midwife', 'doctor', 1, ['medical']),
  occ('mental health counselor', 'doctor', 0.5, ['medical']),

  // scientist / academic (cont.)
  occ('atmospheric researcher', 'researcher', 1, ['research']),
  occ('geological surveyor', 'surveyor', 1, ['research', 'mining']),
  occ('linguistics specialist', 'academic', 0.5, ['research', 'cultural']),
  occ('materials scientist', 'scientist', 1, ['research', 'technology']),
  occ('planetary ecologist', 'scientist', 1, ['research', 'frontier']),
  occ('museum curator', 'archivist', 0.5, ['cultural', 'education']),
  occ('research grant administrator', 'administrator', 0.5, ['research', 'government-bureaucracy']),
  occ('laboratory technician', 'researcher', 1, ['research', 'technology']),
  occ('field survey assistant', 'surveyor', 1, ['research', 'frontier']),
  occ('history instructor', 'professor', 1, ['education']),
  occ('data cataloguer', 'archivist', 1, ['government-bureaucracy', 'research']),
  occ('doctoral researcher', 'lead researcher', 0.5, ['research', 'academic']),

  // security / enforcement (cont.)
  occ('checkpoint guard', 'security guard', 2, ['security', 'urban']),
  occ('surveillance operator', 'security guard', 1, ['security', 'technology']),
  occ('crowd control officer', 'beat officer', 1, ['enforcement', 'urban']),
  occ('evidence technician', 'investigator', 0.5, ['enforcement']),
  occ('parole officer', 'warden', 0.5, ['enforcement', 'government-bureaucracy']),
  occ('private investigator', 'investigator', 1, ['enforcement', 'business-professional']),
  occ('cybercrime analyst', 'intelligence analyst', 0.5, ['enforcement', 'technology']),
  occ('K-9 unit handler', 'patrol officer', 0.5, ['enforcement']),
  occ('riot response officer', 'patrol officer', 0.5, ['enforcement', 'security']),
  occ('customs canine handler', 'customs officer', 0.5, ['enforcement', 'trade']),
  occ('watch commander', 'police captain', 0.5, ['enforcement', 'government-bureaucracy']),
  occ('bail enforcement agent', 'bounty hunter', 1, ['enforcement', 'crime-syndicate']),

  // military (cont.)
  occ('vehicle crew chief', 'squad leader', 1, ['military-paramilitary']),
  occ('artillery spotter', 'trooper', 1, ['military-paramilitary']),
  occ('field engineer', 'engineer', 1, ['military-paramilitary', 'technology']),
  occ('drill instructor', 'squad leader', 1, ['military-paramilitary']),
  occ('logistics sergeant', 'quartermaster', 1, ['military-paramilitary']),
  occ('signals corps operator', 'communications specialist', 1, ['military-paramilitary', 'technology']),
  occ('perimeter sentry', 'sentry', 2, ['military-paramilitary', 'frontier']),
  occ('mess hall supervisor', 'quartermaster', 0.5, ['military-paramilitary']),
  occ('unit medic', 'field medic', 1, ['military-paramilitary', 'medical']),
  occ('honor guard trooper', 'trooper', 0.5, ['military-paramilitary', 'noble-house']),
  occ('reservist called to duty', 'militia volunteer', 1, ['military-paramilitary']),
  occ('base supply clerk', 'quartermaster', 1, ['military-paramilitary']),
  occ('recon squad member', 'sentry', 1, ['military-paramilitary', 'frontier']),
  occ('demolitions crew member', 'demolitions expert', 0.5, ['military-paramilitary']),

  // pilot / spacefaring (cont.)
  occ('tugboat pilot', 'pilot', 1, ['trade', 'urban']),
  occ('atmospheric ferry pilot', 'shuttle pilot', 1, ['trade', 'urban']),
  occ('cargo hauler pilot', 'freighter captain', 1, ['trade', 'frontier']),
  occ('orbital traffic controller', 'navigator', 1, ['trade', 'technology']),
  occ('escort pilot', 'pilot', 1, ['trade', 'security']),
  occ('deep-space courier pilot', 'freighter captain', 1, ['trade', 'frontier']),
  occ('flight instructor', 'pilot', 0.5, ['education', 'trade']),
  occ('mining barge pilot', 'pilot', 1, ['mining', 'frontier']),
  occ('salvage tug operator', 'pilot', 0.5, ['trade', 'frontier']),
  occ('survey drone operator', 'navigator', 0.5, ['research', 'technology']),

  // slicer / criminal (cont.)
  occ('forger of documents', 'fence (stolen goods)', 0.5, ['crime-syndicate']),
  occ('lookout', 'street tough', 1, ['crime-syndicate']),
  occ('protection racket collector', 'enforcer', 1, ['crime-syndicate']),
  occ('black-market medic', 'doctor', 0.5, ['crime-syndicate', 'medical']),
  occ('getaway driver', 'smuggler crew hand', 1, ['crime-syndicate']),
  occ('safehouse keeper', 'informant', 0.5, ['crime-syndicate']),
  occ('counterfeit goods dealer', 'fence (stolen goods)', 0.5, ['crime-syndicate', 'trade']),
  occ('extortion specialist', 'enforcer', 0.5, ['crime-syndicate']),
  occ('contraband smuggler', 'smuggler', 1.5, ['crime-syndicate', 'trade']),
  occ('freelance hitman', 'assassin', 0.5, ['crime-syndicate']),
  occ('underground fight promoter', 'gang leader', 0.5, ['crime-syndicate', 'entertainment']),
  occ('black-market arms broker', 'weapons dealer', 0.5, ['crime-syndicate', 'military-industrial']),

  // noble / politics (cont.)
  occ('court chronicler', 'chronicler', 0.5, ['noble-house']),
  occ('household finance manager', 'accountant', 0.5, ['noble-house', 'financial-services']),
  occ('electoral campaign volunteer', 'political operative', 1, ['government-bureaucracy']),
  occ('city council aide', 'department head', 1, ['government-bureaucracy']),
  occ('provincial magistrate clerk', 'clerk', 1, ['government-bureaucracy']),
  occ('protocol officer', 'attache', 0.5, ['government-bureaucracy', 'noble-house']),
  occ('district ombudsperson', 'district magistrate', 0.5, ['government-bureaucracy']),
  occ('lobbyist for local guilds', 'political operative', 0.5, ['government-bureaucracy', 'trade']),
  occ('speechwriter', 'political operative', 0.5, ['government-bureaucracy']),
  occ('minor house retainer', 'house steward', 1, ['noble-house']),

  // religious (cont.)
  occ('shrine keeper', 'temple attendant', 1, ['religion']),
  occ('pilgrimage guide', 'priest', 0.5, ['religion', 'frontier']),
  occ('ritual scribe', 'chronicler', 0.5, ['religion']),
  occ('temple groundskeeper', 'groundskeeper', 1, ['religion']),
  occ('meditation instructor', 'novice acolyte', 0.5, ['religion', 'force-tradition']),
  occ('order archivist', 'archivist', 0.5, ['religion', 'force-tradition']),
  occ('traveling missionary', 'priest', 0.5, ['religion', 'frontier']),
  occ('funeral rites officiant', 'priest', 0.5, ['religion']),

  // explorer / frontier (cont.)
  occ('trailblazing cartographer', 'surveyor', 1, ['frontier', 'research']),
  occ('frontier claim registrar', 'clerk', 0.5, ['frontier', 'government-bureaucracy']),
  occ('remote outpost supply runner', 'trader', 1, ['frontier', 'trade']),
  occ('wildlife tracker', 'guide', 1, ['frontier', 'rural']),
  occ('homestead well-driller', 'settler', 0.5, ['frontier', 'rural']),
  occ('frontier trading post operator', 'shopkeeper', 1, ['frontier', 'trade']),
  occ('border patrol scout', 'sentry', 1, ['frontier', 'enforcement']),
  occ('expedition quartermaster', 'quartermaster', 0.5, ['frontier', 'research']),
  occ('remote relay station keeper', 'technician', 0.5, ['frontier', 'technology']),
  occ('frontier land assessor', 'surveyor', 0.5, ['frontier', 'government-bureaucracy']),

  // administrator / bureaucrat (cont.)
  occ('licensing office clerk', 'clerk', 1.5, ['government-bureaucracy']),
  occ('tax assessment officer', 'bureaucratic functionary', 1, ['government-bureaucracy']),
  occ('municipal records keeper', 'clerk of records', 1, ['government-bureaucracy']),
  occ('permit review officer', 'bureaucratic functionary', 1, ['government-bureaucracy']),
  occ('public works coordinator', 'administrator', 1, ['government-bureaucracy', 'industrial']),
  occ('census taker', 'clerk', 0.5, ['government-bureaucracy']),
  occ('zoning board clerk', 'clerk', 0.5, ['government-bureaucracy', 'urban']),
  occ('utilities billing clerk', 'clerk', 1, ['government-bureaucracy']),
  occ('immigration processing officer', 'customs officer', 1, ['government-bureaucracy']),
  occ('local council secretary', 'clerk', 0.5, ['government-bureaucracy']),

  // corporate / financial (cont.)
  occ('junior accountant', 'accountant', 1.5, ['financial-services', 'business-professional']),
  occ('insurance claims adjuster', 'financial analyst', 1, ['financial-services']),
  occ('loan officer', 'broker', 1, ['financial-services']),
  occ('payroll administrator', 'accountant', 1, ['business-professional']),
  occ('supply contract negotiator', 'negotiator', 1, ['business-professional', 'trade']),
  occ('quality assurance inspector', 'technician', 1, ['business-professional', 'industrial']),
  occ('marketing coordinator', 'department director', 0.5, ['business-professional']),
  occ('corporate compliance officer', 'legal counselor', 0.5, ['business-professional', 'government-bureaucracy']),
  occ('procurement specialist', 'broker', 1, ['business-professional', 'trade']),
  occ('junior investment analyst', 'financial analyst', 0.5, ['financial-services']),

  // entertainment / hospitality (cont.)
  occ('bartender', 'server / waitstaff', 2, ['entertainment', 'urban']),
  occ('short-order cook', 'server / waitstaff', 1.5, ['entertainment']),
  occ('hostel proprietor', 'shopkeeper', 1, ['entertainment', 'trade']),
  occ('street musician', 'performer', 1, ['entertainment']),
  occ('event promoter', 'entertainer / holo-performer', 0.5, ['entertainment']),
  occ('holovid technician', 'technician', 0.5, ['entertainment', 'technology']),
  occ('game parlor operator', 'shopkeeper', 1, ['entertainment', 'crime-syndicate']),
  occ('tour guide', 'guide', 1, ['entertainment', 'frontier']),
  occ('freelance columnist', 'journalist / newsnet stringer', 0.5, ['entertainment']),
  occ('costume and prop maker', 'artisan / crafter', 0.5, ['entertainment', 'cultural']),

  // mining / industrial (cont.)
  occ('shaft safety inspector', 'company foreman', 1, ['mining', 'industrial']),
  occ('ore processing supervisor', 'company foreman', 1, ['mining', 'industrial']),
  occ('blast crew technician', 'demolitions expert', 0.5, ['mining']),
  occ('mineral assay technician', 'appraiser', 1, ['mining', 'research']),
  occ('conveyor systems mechanic', 'mechanic', 1, ['mining', 'industrial']),
  occ('strip mine equipment operator', 'miner', 1, ['mining', 'industrial']),
  occ('deep-core prospector', 'prospector', 1, ['mining', 'frontier']),
  occ('mine ventilation technician', 'technician', 0.5, ['mining', 'industrial']),
  occ('tailings management worker', 'laborer', 0.5, ['mining', 'industrial']),
  occ('smelting plant operator', 'factory worker', 1, ['mining', 'industrial']),

  // shipbuilding / weapons (cont.)
  occ('drydock supervisor', 'shipwright', 0.5, ['shipbuilding', 'industrial']),
  occ('hull fabrication welder', 'shipwright', 1, ['shipbuilding', 'industrial']),
  occ('turret systems technician', 'armorer', 0.5, ['military-industrial']),
  occ('munitions inspector', 'ordnance specialist', 0.5, ['military-industrial']),
  occ('blaster gunsmith', 'armorer', 1, ['military-industrial', 'trade']),
  occ('vehicle armor fitter', 'shipwright', 0.5, ['military-industrial']),
  occ('licensed weapons retailer', 'weapons dealer', 0.5, ['military-industrial', 'trade']),
  occ('demolition ordnance technician', 'demolitions expert', 0.5, ['military-industrial']),

  // household / domestic (cont.)
  occ('personal valet', 'household staff', 0.5, ['noble-house']),
  occ('estate chef', 'household staff', 0.5, ['noble-house']),
  occ('household tutor', 'professor', 0.5, ['noble-house', 'education']),
  occ('stable master', 'stable hand', 0.5, ['rural', 'noble-house']),
  occ('household security coordinator', 'security guard', 0.5, ['noble-house', 'security']),
  occ('personal assistant to a business owner', 'household staff', 1, ['business-professional']),

  // droid-adjacent living occupations (cont.)
  occ('droid parts fabricator', 'engineer', 1, ['droids', 'technology', 'industrial']),
  occ('droid behavioral calibration specialist', 'droid technician', 0.5, ['droids', 'technology']),
  occ('astromech fleet supervisor', 'droid technician', 0.5, ['droids', 'technology']),
  occ('droid rental agency clerk', 'clerk', 0.5, ['droids', 'trade']),
  occ('protocol droid trainer', 'droid technician', 0.5, ['droids', 'education']),
  occ('salvaged droid refurbisher', 'droid technician', 1, ['droids', 'trade']),

  // intelligence / investigation
  occ('signals intercept analyst', 'intelligence analyst', 0.5, ['government-bureaucracy', 'military-paramilitary']),
  occ('background check investigator', 'investigator', 1, ['enforcement', 'business-professional']),
  occ('corporate espionage contractor', 'spy', 0.5, ['crime-syndicate', 'business-professional']),
  occ('undercover operative', 'spy', 0.5, ['government-bureaucracy', 'crime-syndicate']),
  occ('counterintelligence liaison', 'intelligence handler', 0.5, ['government-bureaucracy', 'military-paramilitary']),
  occ('surveillance photographer', 'investigator', 0.5, ['enforcement']),
  occ('records verification specialist', 'clerk of records', 0.5, ['government-bureaucracy']),
  occ('fraud investigator', 'investigator', 0.5, ['financial-services', 'enforcement']),
  occ('missing persons investigator', 'detective', 0.5, ['enforcement']),
  occ('polygraph and interrogation specialist', 'intelligence analyst', 0.5, ['government-bureaucracy', 'enforcement']),

  // legal
  occ('contract attorney', 'legal counselor', 1, ['business-professional']),
  occ('public defender', 'legal counselor', 0.5, ['government-bureaucracy']),
  occ('notary and document clerk', 'clerk', 1, ['government-bureaucracy']),
  occ('paralegal researcher', 'legal counselor', 0.5, ['business-professional']),
  occ('mediation specialist', 'negotiator', 0.5, ['government-bureaucracy']),
  occ('court records clerk', 'clerk of records', 0.5, ['government-bureaucracy']),

  // agriculture / terraforming
  occ('hydroponics specialist', 'agricultural specialist', 1, ['agriculture', 'technology']),
  occ('soil reclamation engineer', 'terraforming specialist', 0.5, ['agriculture', 'frontier']),
  occ('crop rotation planner', 'agricultural specialist', 0.5, ['agriculture', 'rural']),
  occ('irrigation systems engineer', 'terraforming specialist', 0.5, ['agriculture', 'technology']),
  occ('livestock geneticist', 'agricultural specialist', 0.5, ['agriculture', 'research']),
  occ('atmospheric seeding technician', 'terraforming specialist', 0.5, ['frontier', 'technology']),
  occ('greenhouse dome manager', 'agricultural specialist', 0.5, ['agriculture', 'technology']),
  occ('pest control specialist', 'agricultural specialist', 0.5, ['agriculture', 'rural']),

  // performing arts / culture
  occ('museum conservator', 'archivist', 0.5, ['cultural', 'education']),
  occ('traditional dance instructor', 'performer', 0.5, ['cultural', 'entertainment']),
  occ('folk musician', 'performer', 0.5, ['cultural', 'entertainment']),
  occ('cultural heritage guide', 'guide', 0.5, ['cultural', 'entertainment']),
  occ('sculptor and monument restorer', 'artisan / crafter', 0.5, ['cultural']),
  occ('oral historian', 'chronicler', 0.5, ['cultural', 'research']),

  // transport / logistics
  occ('freight scheduling coordinator', 'dockmaster', 1, ['trade', 'business-professional']),
  occ('warehouse inventory manager', 'company foreman', 1, ['trade', 'industrial']),
  occ('long-haul speeder trucker', 'trader', 1, ['trade', 'frontier']),
  occ('cargo manifest auditor', 'accountant', 0.5, ['trade', 'financial-services']),
  occ('port scheduling clerk', 'clerk', 1, ['trade', 'government-bureaucracy']),
  occ('supply chain risk analyst', 'financial analyst', 0.5, ['trade', 'business-professional']),
  occ('freight insurance adjuster', 'financial analyst', 0.5, ['trade', 'financial-services']),
  occ('customs documentation specialist', 'customs officer', 1, ['trade', 'government-bureaucracy']),
  occ('shipping container inspector', 'customs officer', 0.5, ['trade', 'security']),
  occ('cross-docking supervisor', 'dockmaster', 0.5, ['trade', 'industrial'])
]);
