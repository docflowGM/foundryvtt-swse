/**
 * PHASE 8D-2 foundation — procedural planet history-hook pool for
 * `planets/planet-history-hooks.js`. A history hook is a short
 * GENERATE-tier narrative seed a GM can build a session around ("this
 * world was the site of..."); it is never a citation to real, specific
 * Star Wars canon lore, and never implies a specific statblock,
 * Faction, or NPC — those stay entirely up to the GM (or a later,
 * separate generator) to attach. All generated history is campaign
 * fiction — never implied to be canon.
 *
 * PHASE 8D-3A production expansion: grown from 26 representative
 * entries to a ~115-entry production catalog covering the six
 * categories the phase spec named — settlement, warfare, Force
 * history (kept deliberately UNCOMMON via low weights, per the phase's
 * own instruction), disaster, economy, and mystery. Era-neutral
 * throughout (a "military garrison" or "occupation government," never
 * a specific named real-world faction) per the phase's own era-
 * neutrality instruction.
 */

export const PLANET_HISTORY_HOOKS = Object.freeze([
  // --- original representative entries (unchanged) ---
  { value: 'site of a forgotten battle from a past galactic conflict', weight: 3, tags: ['military-paramilitary'] },
  { value: 'home to a long-abandoned Force-tradition enclave', weight: 2, tags: ['force-tradition', 'mysterious'] },
  { value: 'recently annexed by a larger power', weight: 3, tags: ['government-bureaucracy', 'military-paramilitary'] },
  { value: 'a disputed border world claimed by two factions', weight: 3, tags: ['military-paramilitary'] },
  { value: 'founded by refugees fleeing another conflict', weight: 2, tags: ['community-tribe'] },
  { value: 'once a thriving trade hub now in decline', weight: 2, tags: ['business-professional', 'trade'] },
  { value: 'the site of a natural disaster within living memory', weight: 2, tags: [] },
  { value: 'rumored to hide pre-Republic ruins', weight: 2, tags: ['mysterious'] },
  { value: 'a former penal colony, still shaped by that legacy', weight: 1, tags: ['enforcement', 'frontier'] },
  { value: 'the birthplace of a locally famous historical figure', weight: 2, tags: [] },
  { value: 'devastated by an industrial accident decades ago', weight: 1, tags: [] },
  { value: 'liberated from occupation within the last generation', weight: 2, tags: ['military-paramilitary'] },
  { value: 'the site of a still-unresolved political assassination', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'settled only recently by corporate colonists', weight: 2, tags: ['business-professional'] },
  { value: 'home to a persecuted minority community', weight: 2, tags: ['community-tribe'] },
  { value: 'the location of a famous (or infamous) peace treaty', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'plagued by an unsolved string of disappearances', weight: 1, tags: ['mysterious', 'criminal'] },
  { value: 'a former Separatist or Rebel stronghold', weight: 2, tags: ['military-paramilitary'] },
  { value: 'sacred to the native species, resented by newcomers', weight: 2, tags: ['community-tribe', 'religion'] },
  { value: 'the site of an infamous heist still talked about locally', weight: 1, tags: ['crime-syndicate'] },
  { value: 'a strategic hyperspace lane junction, fought over for generations', weight: 2, tags: ['military-paramilitary', 'trade'] },
  { value: 'home to a reclusive noble house in decline', weight: 1, tags: ['noble-house'] },
  { value: 'recently discovered/opened to outside contact', weight: 2, tags: ['frontier'] },
  { value: 'a graveyard world littered with old starship wreckage', weight: 1, tags: ['mysterious', 'void'] },
  { value: 'the site of a still-simmering labor dispute', weight: 1, tags: ['business-professional'] },
  { value: 'no notable history -- an unremarkable world', weight: 3, tags: [] },

  // --- settlement ---
  { value: 'founded generations ago as a frontier colony', weight: 3, tags: ['frontier', 'community-tribe'] },
  { value: 'settled by exiled nobility seeking a fresh start', weight: 1, tags: ['noble-house'] },
  { value: 'built up around a single company\'s operations', weight: 2, tags: ['business-professional'] },
  { value: 'established as a military colony, still shaped by that legacy', weight: 2, tags: ['military-paramilitary'] },
  { value: 'founded by a religious sect seeking isolation', weight: 1, tags: ['religion', 'community-tribe'] },
  { value: 'grew rapidly during a long-past mining boom', weight: 2, tags: ['mining'] },
  { value: 'the site of a failed early agricultural settlement', weight: 1, tags: ['agriculture', 'rural'] },
  { value: 'settled in waves by several unrelated colonist groups', weight: 2, tags: ['community-tribe'] },
  { value: 'originally an unauthorized squatter settlement, later legitimized', weight: 1, tags: ['frontier'] },
  { value: 'founded as a penal labor colony', weight: 1, tags: ['enforcement', 'frontier'] },
  { value: 'settled by veterans after a past conflict ended', weight: 1, tags: ['military-paramilitary'] },
  { value: 'grew from a single trading post into a proper settlement', weight: 2, tags: ['trade', 'frontier'] },
  { value: 'colonized under a since-defunct terraforming initiative', weight: 1, tags: ['terraformed'] },
  { value: 'settled by survivors of a long-forgotten shipwreck', weight: 1, tags: ['mysterious', 'frontier'] },

  // --- warfare ---
  { value: 'the site of an ancient, largely forgotten battlefield', weight: 2, tags: ['military-paramilitary', 'battlefield'] },
  { value: 'recently occupied by an outside military power', weight: 2, tags: ['military-paramilitary'] },
  { value: 'recently liberated after a long occupation', weight: 2, tags: ['military-paramilitary'] },
  { value: 'repeatedly contested by rival powers over generations', weight: 2, tags: ['military-paramilitary'] },
  { value: 'once home to a major military stronghold, since decommissioned', weight: 1, tags: ['military-paramilitary'] },
  { value: 'the site of an old, abandoned weapons-testing range', weight: 1, tags: ['military-paramilitary', 'wasteland'] },
  { value: 'devastated by orbital bombardment during a past conflict', weight: 1, tags: ['battlefield', 'wasteland'] },
  { value: 'the location of a famous last stand still honored locally', weight: 1, tags: ['military-paramilitary'] },
  { value: 'a former staging ground for a since-ended insurgency', weight: 1, tags: ['military-paramilitary'] },
  { value: 'scarred by an old scorched-earth military campaign', weight: 1, tags: ['battlefield', 'wasteland'] },
  { value: 'the site of a famous, decisive fleet engagement overhead', weight: 1, tags: ['military-paramilitary', 'void'] },
  { value: 'still recovering from a recent, brief border skirmish', weight: 1, tags: ['military-paramilitary'] },

  // --- Force history (kept deliberately uncommon) ---
  { value: 'home to a forgotten Jedi enclave, long since abandoned', weight: 1, tags: ['force-tradition', 'jedi'] },
  { value: 'the site of a minor Sith archaeological find', weight: 1, tags: ['force-tradition', 'sith'] },
  { value: 'a modest Force pilgrimage site, known to a few traditions', weight: 1, tags: ['force-tradition', 'religion'] },
  { value: 'home to a small, obscure ancient Force tradition', weight: 1, tags: ['force-tradition', 'mysterious'] },
  { value: 'the site of a minor, half-remembered Force-related incident', weight: 1, tags: ['force-tradition', 'mysterious'] },

  // --- disaster ---
  { value: 'recovering from a devastating plague within living memory', weight: 1, tags: [] },
  { value: 'scarred by an old reactor catastrophe', weight: 1, tags: ['industrial', 'wasteland'] },
  { value: 'the site of a failed terraforming attempt', weight: 1, tags: ['terraformed', 'wasteland'] },
  { value: 'still recovering from a regional ecosystem collapse', weight: 1, tags: [] },
  { value: 'struck by a significant asteroid impact generations ago', weight: 1, tags: ['wasteland', 'asteroid'] },
  { value: 'devastated by a since-contained industrial contamination event', weight: 1, tags: ['industrial'] },
  { value: 'the site of a famous, deadly mining collapse', weight: 1, tags: ['mining'] },
  { value: 'recovering from a severe, prolonged drought', weight: 1, tags: ['desert', 'wasteland'] },
  { value: 'the site of a catastrophic dam or levee failure', weight: 1, tags: ['ocean', 'wasteland'] },
  { value: 'scarred by a runaway wildfire that reshaped the land', weight: 1, tags: ['forest', 'wasteland'] },

  // --- economy ---
  { value: 'the site of a collapsed mining boom, now mostly abandoned', weight: 2, tags: ['mining', 'frontier'] },
  { value: 'home to abandoned shipyards from a past economic golden age', weight: 1, tags: ['shipbuilding', 'industrial'] },
  { value: 'suffered a long, slow trade-route decline', weight: 2, tags: ['trade'] },
  { value: 'revitalized by the recent discovery of a new hyperlane', weight: 1, tags: ['trade', 'frontier'] },
  { value: 'the site of a hostile corporate takeover, still resented locally', weight: 1, tags: ['business-professional'] },
  { value: 'once a monoculture economy, still recovering from its collapse', weight: 1, tags: ['agriculture'] },
  { value: 'the site of a famous market crash that ruined many locals', weight: 1, tags: ['financial-services'] },
  { value: 'boomed briefly during a since-ended resource rush', weight: 1, tags: ['mining', 'frontier'] },
  { value: 'the former hub of a now-defunct trade guild', weight: 1, tags: ['trade', 'business-professional'] },
  { value: 'still paying off debts from an ambitious infrastructure project', weight: 1, tags: ['government-bureaucracy'] },

  // --- mystery ---
  { value: 'home to a vanished precursor civilization, long gone', weight: 1, tags: ['mysterious', 'ancient'] },
  { value: 'the site of a deserted colony no one has resettled', weight: 1, tags: ['mysterious', 'frontier'] },
  { value: 'dotted with unknown ruins of uncertain origin', weight: 2, tags: ['mysterious', 'ancient'] },
  { value: 'the source of an unexplained signal picked up decades ago', weight: 1, tags: ['mysterious'] },
  { value: 'the last known location of a lost expedition', weight: 1, tags: ['mysterious'] },
  { value: 'the site of an unsolved mass disappearance generations back', weight: 1, tags: ['mysterious', 'criminal'] },
  { value: 'home to local legends of a lost treasure hoard', weight: 1, tags: ['mysterious'] },
  { value: 'the subject of persistent, unverified ghost-ship sightings overhead', weight: 1, tags: ['mysterious', 'void'] },
  { value: 'rumored to have been visited by something inexplicable, once', weight: 1, tags: ['mysterious'] },
  { value: 'the site of a still-unexplained mechanical anomaly', weight: 1, tags: ['mysterious', 'industrial'] },

  // --- politics / society ---
  { value: 'the site of a historic, still-celebrated declaration of independence', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'the site of a famous political reform movement', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'once ruled by a since-deposed dynasty', weight: 1, tags: ['noble-house', 'government-bureaucracy'] },
  { value: 'the site of a historic labor uprising that changed local law', weight: 1, tags: ['business-professional'] },
  { value: 'formerly governed under a strict, now-abolished caste system', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'the site of a famous, still-debated referendum', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'once the seat of a small regional government, now diminished', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'the site of an infamous corruption scandal, still remembered', weight: 1, tags: ['government-bureaucracy', 'crime-syndicate'] },

  // --- cultural / religious ---
  { value: 'the site of a historic religious schism', weight: 1, tags: ['religion'] },
  { value: 'home to descendants of a persecuted diaspora community', weight: 1, tags: ['community-tribe'] },
  { value: 'the site of a famous cultural renaissance generations ago', weight: 1, tags: ['civilian'] },
  { value: 'once home to a now-vanished local tradition or custom', weight: 1, tags: ['mysterious', 'community-tribe'] },
  { value: 'the site of a historic first-contact encounter with another species', weight: 1, tags: ['community-tribe'] },
  { value: 'commemorates a locally famous act of heroism', weight: 1, tags: ['civilian'] },
  { value: 'the site of a still-observed historic tragedy anniversary', weight: 1, tags: [] },

  // --- misc frontier / colonial history ---
  { value: 'briefly cut off from galactic trade routes for a generation', weight: 1, tags: ['frontier'] },
  { value: 'the site of a famous, successful native uprising against colonizers', weight: 1, tags: ['community-tribe', 'military-paramilitary'] },
  { value: 'settled and re-settled multiple times after repeated abandonments', weight: 1, tags: ['frontier'] },
  { value: 'the site of a historic treaty renegotiation still felt locally', weight: 1, tags: ['government-bureaucracy'] },
  { value: 'once a quarantine world, since reopened to travelers', weight: 1, tags: ['enforcement'] },
  { value: 'the site of a historic prison break still discussed locally', weight: 1, tags: ['enforcement', 'criminal'] }
]);
