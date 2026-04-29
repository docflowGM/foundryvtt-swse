/* ============================================================
 * Store data — Rendarr's Exchange
 * Items use Aurebesh-glyph display names (VT323 substitutes).
 * Each item: id, name, glyph (single letter), category, slot, rarity, price (base), tags,
 *   stats {}, desc, reviews [{author, species, stars, text, helpful, reply?, verified}]
 * ============================================================ */

window.STORE_ITEMS = [
  /* ---------- Weapons ---------- */
  {
    id: 'wpn-blaster-dl44',
    name: 'DL-44 Heavy Blaster',
    glyph: 'B',
    category: 'weapons',
    slot: 'Pistol · 1H',
    rarity: 'uncommon',
    price: 750,
    tags: ['energy','smuggler-favorite'],
    stats: { Damage: '3d8', Range: 'Pistol', Stun: 'Yes', 'Crit DC': '19', Weight: '1.4 kg' },
    desc: 'BlasTech\'s sidearm of choice for people who do most of their negotiating point-blank. Modified gas chamber, scope rail, mag-coupler.',
    reviews: [
      { author: 'Jaxin V.', species: 'Human · Smuggler', stars: 5, text: 'Punched a hole through a Trandoshan and a bulkhead behind him. Worth every credit. Recoil will dislocate your wrist if you fire it one-handed sober.', helpful: 412, verified: true,
        reply: 'Drink first. Got it. — Rendarr' },
      { author: 'M. Th\'orinn', species: 'Mirialan · Bounty', stars: 4, text: 'Reliable. Iron sights are a joke at distance. Bring your own optics.', helpful: 188, verified: true },
      { author: 'Anonymous', species: 'Pilot', stars: 5, text: 'Don\'t tell my captain I\'m carrying.', helpful: 87, verified: false }
    ]
  },
  {
    id: 'wpn-vibroblade',
    name: 'Echani Vibroblade',
    glyph: 'V',
    category: 'weapons',
    slot: 'Melee · 1H',
    rarity: 'uncommon',
    price: 420,
    tags: ['melee','vibro','silent'],
    stats: { Damage: '2d6+1', Type: 'Slashing', 'Crit DC': '19', Weight: '1.1 kg', Material: 'Phrik alloy' },
    desc: 'Ultrasonic edge that hums through plastoid like it owes it money. Echani forge-mark on the pommel — collectors care, customs does not.',
    reviews: [
      { author: 'Sirra K.', species: 'Echani · Duelist', stars: 5, text: 'Balance is correct. Edge held through three duels and a kitchen.', helpful: 244, verified: true },
      { author: 'B. Mott', species: 'Human · Mercenary', stars: 4, text: 'Battery housing scratches up if you carry on a hip. Use a back rig.', helpful: 91, verified: true }
    ]
  },
  {
    id: 'wpn-rifle-e11',
    name: 'E-11 Service Rifle',
    glyph: 'E',
    category: 'weapons',
    slot: 'Rifle · 2H',
    rarity: 'common',
    price: 1100,
    tags: ['energy','imperial-surplus','automatic'],
    stats: { Damage: '3d8', Range: 'Rifle', Modes: 'SA / Auto', 'Crit DC': '19', Weight: '2.6 kg' },
    desc: 'Standard-issue Imperial carbine. Stock folds. Sights are functional. Surplus crates fall off transports all the time, apparently.',
    reviews: [
      { author: 'R. Calder', species: 'Human · Veteran', stars: 3, text: 'Iron sights wander. Heat shroud loosens after a long burst. Cheap if you don\'t plan to keep it.', helpful: 156, verified: true },
      { author: 'T-7K1', species: 'Astromech · Hobbyist', stars: 4, text: 'Disassembles cleanly. Found three different unit serials inside. Concerning.', helpful: 612, verified: true,
        reply: 'Sold as-is. — Rendarr' }
    ]
  },
  {
    id: 'wpn-bowcaster',
    name: 'Wookiee Bowcaster',
    glyph: 'W',
    category: 'weapons',
    slot: 'Rifle · 2H',
    rarity: 'rare',
    price: 1850,
    tags: ['energy','heavy','two-handed'],
    stats: { Damage: '3d10', Range: 'Rifle', 'Min Str': '12', 'Crit DC': '19', Weight: '5.2 kg' },
    desc: 'Hand-strung Kashyyyk hardwood frame, polarized quarrels. If you can\'t draw it, don\'t buy it.',
    reviews: [
      { author: 'Korraban', species: 'Wookiee · Hunter', stars: 5, text: '*satisfied roar*', helpful: 304, verified: true },
      { author: 'P. Estrin', species: 'Twi\'lek · Crew', stars: 2, text: 'Dislocated my shoulder. Returned. Rendarr would not refund handling fee.', helpful: 88, verified: true,
        reply: 'Read the size chart. — Rendarr' }
    ]
  },
  {
    id: 'wpn-disruptor',
    name: 'Tenloss DXR-6 Disruptor',
    glyph: 'D',
    category: 'weapons',
    slot: 'Rifle · 2H',
    rarity: 'illegal',
    price: 12500,
    tags: ['disruptor','molecular','contraband'],
    stats: { Damage: '5d6 + disrupt', Range: 'Rifle', Effect: 'Ignores DR', 'Crit DC': '20' },
    desc: 'Molecular-disruption rifle. Outlawed in seven sectors. Rendarr will sell you one and an alibi for the going rate.',
    reviews: [
      { author: '[REDACTED]', species: 'Operative', stars: 5, text: 'Performs as advertised. Kindly remove this review.', helpful: 19, verified: false,
        reply: 'No. — R.' },
      { author: 'B. Vex', species: 'Bothan · Spook', stars: 4, text: 'Battery cycle is brutal. One shot per encounter, plan accordingly.', helpful: 142, verified: true }
    ]
  },
  {
    id: 'wpn-thermal',
    name: 'Class-A Thermal Detonator',
    glyph: 'T',
    category: 'weapons',
    slot: 'Throwable',
    rarity: 'restricted',
    price: 2000,
    tags: ['explosive','area','one-shot'],
    stats: { Damage: '8d6', Radius: '4 sq', Save: 'Ref DC 20', Weight: '0.6 kg' },
    desc: 'Baradium-core grenade. The pin sticks. That\'s a feature.',
    reviews: [
      { author: 'L. Jett', species: 'Human · Demolitions', stars: 5, text: 'Did exactly what it said it would. Twice the radius the manual claims. Also: there is no manual.', helpful: 521, verified: true },
      { author: '[deleted]', species: '—', stars: 1, text: 'Account inactive.', helpful: 4, verified: false }
    ]
  },

  /* ---------- Armor ---------- */
  {
    id: 'arm-mando-chest',
    name: 'Mandalorian Chestplate',
    glyph: 'M',
    category: 'armor',
    slot: 'Body · Heavy',
    rarity: 'rare',
    price: 4200,
    tags: ['beskar-trim','heavy','signature-cut'],
    stats: { 'DR': '6', 'Max Dex': '+2', 'Stealth': '−4', 'Weight': '11 kg' },
    desc: 'Field-repaired chestplate, beskar trim along the gorget, durasteel core. Provenance is what the seller says it is.',
    reviews: [
      { author: 'V. Den-Sho', species: 'Human · Hunter', stars: 5, text: 'Took a slug at the sternum. Bruised. Alive. Rendarr threw in a polish kit.', helpful: 287, verified: true },
      { author: 'A. Krieg', species: 'Zabrak · Mercenary', stars: 4, text: 'Strap rivet on the left pauldron is creator-original — scratches, age. Either authentic or a very good fake. Either way it works.', helpful: 132, verified: true }
    ]
  },
  {
    id: 'arm-flight-suit',
    name: 'Insulated Flight Suit',
    glyph: 'F',
    category: 'armor',
    slot: 'Body · Light',
    rarity: 'common',
    price: 380,
    tags: ['vacuum-rated','flight','underlayer'],
    stats: { 'DR': '2', 'Max Dex': '+6', 'Vac Rating': '20 min', 'Weight': '2.1 kg' },
    desc: 'Standard pilot rig. Vac-rated for short EVAs. Smells like the previous owner. They\'re fine.',
    reviews: [
      { author: 'K. Ree', species: 'Twi\'lek · Pilot', stars: 4, text: 'Crotch zipper is in a stupid place. Otherwise great.', helpful: 76, verified: true }
    ]
  },
  {
    id: 'arm-stormtrooper',
    name: 'Stormtrooper Armor (Refit)',
    glyph: 'S',
    category: 'armor',
    slot: 'Full Suit',
    rarity: 'restricted',
    price: 2800,
    tags: ['imperial','plastoid','disguise'],
    stats: { 'DR': '5', 'Max Dex': '+1', 'Stealth': '−6', 'Helmet HUD': 'Y', 'Weight': '14 kg' },
    desc: 'Plastoid composite, refitted seals. Helmet HUD is partially functional. Sizing has been known to be optimistic.',
    reviews: [
      { author: 'D. Marn', species: 'Human · Spy', stars: 3, text: 'Visor fogs. They all do. Bring a shemagh.', helpful: 211, verified: true },
      { author: 'Blynt', species: 'Sullustan · Smuggler', stars: 5, text: 'Nobody looks at you twice. You don\'t need to be the right shape — you need to be the right SILHOUETTE.', helpful: 380, verified: true }
    ]
  },
  {
    id: 'arm-cortosis-weave',
    name: 'Cortosis-Weave Robe',
    glyph: 'C',
    category: 'armor',
    slot: 'Body · Light',
    rarity: 'rare',
    price: 5400,
    tags: ['anti-saber','arcane-resistant','jedi-friendly'],
    stats: { 'DR': '3', 'Max Dex': '+5', 'Saber DR': '+5', 'Weight': '3.4 kg' },
    desc: 'Cortosis fiber woven into a long robe. Will short out a lightsaber blade for one swing. After that you\'re wearing a smouldering bathrobe.',
    reviews: [
      { author: 'M. Talvar', species: 'Echani · Duelist', stars: 5, text: 'Saved my life exactly once. That\'s the deal with cortosis.', helpful: 466, verified: true }
    ]
  },

  /* ---------- Equipment ---------- */
  {
    id: 'eq-medpac',
    name: 'Field Medpac',
    glyph: 'H',
    category: 'equipment',
    slot: 'Pouch',
    rarity: 'common',
    price: 90,
    tags: ['consumable','medical','x3 charges'],
    stats: { Heal: '2d8+2', Charges: '3', 'Use Time': 'Std action', Weight: '0.4 kg' },
    desc: 'Standard kolto pen, bacta patches, suture spray. Three uses, then it\'s a paperweight.',
    reviews: [
      { author: 'Ress P.', species: 'Human · Medic', stars: 4, text: 'Genuine bacta. I checked. Rendarr does not water it down. Anymore.', helpful: 188, verified: true,
        reply: 'Slander. — Rendarr' }
    ]
  },
  {
    id: 'eq-stim',
    name: 'Battle Stim',
    glyph: 'X',
    category: 'equipment',
    slot: 'Injectable',
    rarity: 'uncommon',
    price: 240,
    tags: ['consumable','combat','side-effects'],
    stats: { Buff: '+2 Str/Dex 1 min', After: 'Fatigued', Charges: '1' },
    desc: 'Adrenaline cocktail. Hits hard. Crashes harder. Don\'t take two.',
    reviews: [
      { author: 'J. Vass', species: 'Human · Mercenary', stars: 5, text: 'Took two. Don\'t take two.', helpful: 612, verified: true }
    ]
  },
  {
    id: 'eq-comlink',
    name: 'Encrypted Comlink',
    glyph: 'L',
    category: 'equipment',
    slot: 'Wrist',
    rarity: 'common',
    price: 120,
    tags: ['utility','encrypted','starter'],
    stats: { Range: 'Planetary', Encryption: 'Tier-3', Weight: '0.1 kg' },
    desc: 'Wrist-cuff comlink with rolling encryption keys. Not Imperial-cracked. Yet.',
    reviews: [
      { author: 'P. Volok', species: 'Bith · Slicer', stars: 4, text: 'Solid hardware. Default key library is two years stale — load your own.', helpful: 99, verified: true }
    ]
  },
  {
    id: 'eq-slicer-spike',
    name: 'Slicer Spike',
    glyph: 'I',
    category: 'equipment',
    slot: 'Tool',
    rarity: 'restricted',
    price: 680,
    tags: ['tool','intrusion','fragile'],
    stats: { Bonus: '+5 to Computer Use', Charges: '5', Weight: '0.2 kg' },
    desc: 'Hardware bypass spike for civilian and military terminals. Five clean uses before the heat sink fries.',
    reviews: [
      { author: 'V. Otonn', species: 'Sullustan · Slicer', stars: 4, text: 'Don\'t leave it plugged in. It WILL melt.', helpful: 178, verified: true }
    ]
  },
  {
    id: 'eq-grappling',
    name: 'Magnetic Grapple Line',
    glyph: 'G',
    category: 'equipment',
    slot: 'Belt',
    rarity: 'common',
    price: 220,
    tags: ['utility','climbing','30m'],
    stats: { Range: '30 m', 'Tensile': '500 kg', Weight: '0.8 kg' },
    desc: 'Mag-grapple, 30m monofilament line. Auto-retract. Don\'t fire it at people, the warranty doesn\'t cover that.',
    reviews: [
      { author: 'A. Voth', species: 'Human · Operative', stars: 5, text: 'Fired it at people. Warranty was right.', helpful: 256, verified: false }
    ]
  },
  {
    id: 'eq-jetpack',
    name: 'Z-6 Jetpack',
    glyph: 'J',
    category: 'equipment',
    slot: 'Back',
    rarity: 'rare',
    price: 6800,
    tags: ['flight','fuel','status-symbol'],
    stats: { Flight: '20 min', 'Top Spd': '120 kph', 'Missile': 'Optional', Weight: '8 kg' },
    desc: 'Mitrinomon Z-6, refurbished. Fuel cells included. Missile mount sold separately, also illegally, also by Rendarr.',
    reviews: [
      { author: 'Korr Beska', species: 'Human · Hunter', stars: 5, text: 'Fuel gauge is OPTIMISTIC. Trust the warning klaxon, not the dial. Otherwise — life-changing.', helpful: 522, verified: true }
    ]
  },

  /* ---------- Droids ---------- */
  {
    id: 'drd-astro',
    name: 'R-Series Astromech (Refurb)',
    glyph: 'R',
    category: 'droids',
    slot: 'Companion',
    rarity: 'uncommon',
    price: 3400,
    tags: ['astromech','starship','memory-wipe'],
    stats: { Skills: 'Repair, Astrog., Slice', 'HP': '40', Wipes: '12 (heavy)', Weight: '38 kg' },
    desc: 'Industrial Automaton R-unit. Memory wiped twelve times. Has a personality despite that. Kicks if you reach for the third leg without warning.',
    reviews: [
      { author: 'C. Tannis', species: 'Human · Pilot', stars: 4, text: 'Speaks ONLY in profanity for the first three startups. After that, fine.', helpful: 311, verified: true,
        reply: 'Reset the language module. I keep telling people. — Rendarr' }
    ]
  },
  {
    id: 'drd-protocol',
    name: 'Protocol Droid (3PO-series)',
    glyph: 'P',
    category: 'droids',
    slot: 'Companion',
    rarity: 'uncommon',
    price: 2100,
    tags: ['protocol','translator','etiquette'],
    stats: { Languages: '6,000,000+', 'HP': '24', 'Combat': 'No', Weight: '54 kg' },
    desc: 'Cybot Galactica chassis, translator matrix patched to current Hutt dialects. Restraining bolt sold separately. You\'ll want one.',
    reviews: [
      { author: 'D. Lafren', species: 'Human · Diplomat', stars: 3, text: 'Translates at appropriate moments and also during personal arguments. Restraining bolt: required.', helpful: 198, verified: true }
    ]
  },

  /* ---------- Vehicles ---------- */
  {
    id: 'veh-speeder-bike',
    name: 'Aratech 74-Z Speeder Bike',
    glyph: 'Z',
    category: 'vehicles',
    slot: 'Vehicle · 1 seat',
    rarity: 'uncommon',
    price: 7200,
    tags: ['speeder','single-seat','registry-clean'],
    stats: { 'Top Spd': '500 kph', 'Hover': '25 m', 'HP': '60', 'Crew': '1' },
    desc: 'Aratech 74-Z, ex-scout-trooper rig, registry recently and very thoroughly cleaned. New paint over old paint.',
    reviews: [
      { author: 'F. Domm', species: 'Human · Scout', stars: 5, text: 'Thrust governor was clipped on delivery. Felt like cheating until the swoop gangs found out.', helpful: 412, verified: true }
    ]
  },
  {
    id: 'veh-landspeeder',
    name: 'X-34 Landspeeder',
    glyph: 'L',
    category: 'vehicles',
    slot: 'Vehicle · 2 seat',
    rarity: 'common',
    price: 4900,
    tags: ['landspeeder','two-seat','farm-stock'],
    stats: { 'Top Spd': '250 kph', 'Hover': '1 m', 'HP': '70', 'Crew': '1+1' },
    desc: 'SoroSuub X-34, two-seat. The thing every backwater kid sells to leave their backwater. The seller in this case is no exception.',
    reviews: [
      { author: 'Wyll T.', species: 'Human · Farmer', stars: 4, text: 'Repulsor coils are old. Whines on inclines. Otherwise perfect first speeder.', helpful: 87, verified: true }
    ]
  }
];

/* "Customers like you also bought" — manual curated map of related ids per item.
   Falls back to category overlap if not specified. */
window.STORE_RECS = {
  'wpn-blaster-dl44': ['eq-stim', 'arm-flight-suit', 'wpn-vibroblade'],
  'wpn-vibroblade':   ['arm-cortosis-weave', 'eq-medpac', 'wpn-blaster-dl44'],
  'wpn-rifle-e11':    ['arm-stormtrooper', 'eq-medpac', 'wpn-thermal'],
  'wpn-bowcaster':    ['arm-mando-chest', 'eq-stim', 'wpn-disruptor'],
  'wpn-disruptor':    ['eq-slicer-spike', 'arm-cortosis-weave', 'wpn-thermal'],
  'wpn-thermal':      ['eq-stim', 'wpn-rifle-e11', 'wpn-disruptor'],
  'arm-mando-chest':  ['wpn-bowcaster', 'eq-jetpack', 'wpn-blaster-dl44'],
  'arm-flight-suit':  ['veh-speeder-bike', 'wpn-blaster-dl44', 'eq-comlink'],
  'arm-stormtrooper': ['wpn-rifle-e11', 'eq-comlink', 'wpn-thermal'],
  'arm-cortosis-weave':['wpn-vibroblade', 'wpn-disruptor', 'eq-stim'],
  'eq-medpac':        ['eq-stim', 'arm-flight-suit', 'eq-comlink'],
  'eq-stim':          ['eq-medpac', 'wpn-vibroblade', 'arm-mando-chest'],
  'eq-comlink':       ['eq-slicer-spike', 'arm-flight-suit', 'eq-grappling'],
  'eq-slicer-spike':  ['eq-comlink', 'wpn-disruptor', 'drd-astro'],
  'eq-grappling':     ['eq-jetpack', 'arm-flight-suit', 'eq-comlink'],
  'eq-jetpack':       ['arm-mando-chest', 'wpn-bowcaster', 'eq-grappling'],
  'drd-astro':        ['drd-protocol', 'eq-slicer-spike', 'veh-landspeeder'],
  'drd-protocol':     ['drd-astro', 'eq-comlink', 'veh-landspeeder'],
  'veh-speeder-bike': ['arm-flight-suit', 'wpn-blaster-dl44', 'eq-jetpack'],
  'veh-landspeeder':  ['drd-protocol', 'arm-flight-suit', 'wpn-blaster-dl44']
};

/* Player-owned inventory — for the Sell tab */
window.STORE_INVENTORY = [
  { id: 'inv-1', name: 'Holdout Blaster (worn)',  glyph: 'h', category: 'weapons',   slot: 'Pistol · 1H',    rarity: 'common',    base: 220,  cond: 'Worn',  qty: 1 },
  { id: 'inv-2', name: 'Sand-Worn Cloak',          glyph: 'c', category: 'armor',     slot: 'Body · Light',   rarity: 'common',    base: 60,   cond: 'Used',  qty: 1 },
  { id: 'inv-3', name: 'Spice Vial (unmarked)',    glyph: 'p', category: 'equipment', slot: 'Contraband',     rarity: 'restricted',base: 900,  cond: 'Sealed',qty: 4 },
  { id: 'inv-4', name: 'Imperial Code Cylinder',   glyph: 'i', category: 'equipment', slot: 'ID · Officer',   rarity: 'rare',      base: 2400, cond: 'Active',qty: 1 },
  { id: 'inv-5', name: 'Twin Vibroknives',         glyph: 'k', category: 'weapons',   slot: 'Melee · Off-h.', rarity: 'uncommon',  base: 280,  cond: 'Mint',  qty: 1 },
  { id: 'inv-6', name: 'Mid-Rim Star Charts',      glyph: 's', category: 'equipment', slot: 'Data Spike',     rarity: 'uncommon',  base: 460,  cond: 'Current',qty: 1 },
  { id: 'inv-7', name: 'Wookiee Pelt (uncleared)', glyph: 'w', category: 'equipment', slot: 'Trophy',         rarity: 'illegal',   base: 1800, cond: 'Frozen',qty: 1 }
];

/* Floor chatter ticker */
window.STORE_RUMORS = [
  '◆ <em>HUTT CARTEL</em> levies <em>+8%</em> wartime markup on all Outer Rim energy weapons',
  '◆ Imperial inspection sweep flagged at <em>Kessel docks</em> — slicer kits at <em>−10%</em> until Friday',
  '<span class="hot">▲ HOT</span> Beskar trim — Mandalorian salvage caravan 6 days out, prices <em>climbing</em>',
  '◆ <em>RENDARR</em> still does NOT haggle on disruptors. Don\'t ask',
  '◆ Buy-back rate on <em>code cylinders</em> up — Imperial defectors are common this month',
  '<span class="hot">▲ HOT</span> Republic credits at <em>0.6×</em> Imperial — bring local notes',
  '◆ Floor camera 3 is <em>down</em>. Floor camera 3 is <em>always</em> down',
  '◆ Repeat customers get a <em>Rendarr scowl</em> — that\'s the loyalty program',
  '◆ Speeder bike with cleaned registry: <em>3 in stock</em>, expect 1 by tomorrow',
  '◆ <em>NO REFUNDS</em> on thermal detonators. Obviously'
];

/* Greeter quotes — first impression rotated */
window.STORE_GREETINGS = [
  "Boot the terminal, friend. I don't care why you're here, I care what you're spending.",
  "If it's on the floor, it's for sale. If it's behind the curtain, ask. If it's locked, don't.",
  "Browsing's free. Touching the disruptors is not.",
  "Imperial? Republic? Hutt notes? I'll take any of them. Not all together.",
  "You break it before you buy it, you bought it twice. House rule."
];

/* Modal Rendarr lines, picked by purchase shape */
window.STORE_RENDARR_PURCHASE = {
  big:    "That's the kind of haul that pays my rent for the quarter. Pleasure doing business.",
  medium: "Solid pick. Don't get caught with half of that on station.",
  small:  "Small order. Rounds out a slow afternoon. Take your receipt.",
  cheap:  "I've sold pastries for more. Get out of here, you bother me less when you're shopping."
};
