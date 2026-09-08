/**
 * PHASE 8D-2 correction pass — the shared Galactic Commodity Catalog.
 *
 * ONE commodity vocabulary, not three: `planets/planet-trade.js`'s
 * Trade Resolver (planet imports/exports/shortages/illicit trade)
 * reads this catalog, and it is the SAME catalog a future Cargo/
 * smuggling/piracy Job generator is meant to read too -- explicitly
 * built as shared infrastructure per the correction request, not a
 * planet-specific hardcoded string list. "Use every part of the
 * buffalo": Planet Trade / Cargo Jobs / Smuggling all read one
 * catalog, never three drifting copies of similar data.
 *
 * Each entry: `{ id, name, category, tags, legality, rarity,
 * producedBy, demandedBy, scarcityOn }`.
 *  - `legality`: `'legal'` / `'restricted'` / `'illegal'` -- a GENERATE-
 *    tier flavor fact only, never itself a mechanical rule; feeds
 *    `jobs/job-legality-visibility.js`'s existing vocabulary loosely,
 *    not formally coupled to it.
 *  - `rarity`: `'common'` / `'uncommon'` / `'rare'` / `'very-rare'` --
 *    used as a pick-weight multiplier by the Trade Resolver so
 *    iconic/precious materials (kyber crystals, cortosis, phrik) stay
 *    genuinely uncommon rather than showing up on a third of rolled
 *    worlds.
 *  - `producedBy`/`demandedBy`/`scarcityOn`: arrays of short slugs
 *    matched against a world's rolled economy `sector` slugs (see
 *    `data/planet-economies.js`'s own `sector` field) AND its
 *    `WORLD_CLASS` `biomes`/`tags` (`planet-quality-tables.js`) --
 *    deliberately the SAME two vocabularies already established
 *    elsewhere in this pass, not a third one.
 *
 * PHASE 8D-3A production expansion: grown from ~113 to a ~165-entry
 * production catalog across all 14 categories, including new entries
 * cross-referencing the economy sectors `data/planet-economies.js`
 * introduced in the same pass (`entertainment`/`luxury`/`research`/
 * `education`/`salvage`/`security`) so every economy sector a planet
 * can roll has at least one matching commodity. Expanding this list
 * further later never requires touching the Trade Resolver, only this
 * data file.
 */

export const COMMODITY_CATEGORY = Object.freeze({
  FOOD_AGRICULTURE: 'food-agriculture',
  MINERALS_RAW_MATERIALS: 'minerals-raw-materials',
  ENERGY_FUEL: 'energy-fuel',
  INDUSTRIAL_GOODS: 'industrial-goods',
  TECHNOLOGY: 'technology',
  DROIDS: 'droids',
  VEHICLES_TRANSPORTATION: 'vehicles-transportation',
  SHIPBUILDING: 'shipbuilding',
  MEDICINE_BIOTECHNOLOGY: 'medicine-biotechnology',
  LUXURY_GOODS: 'luxury-goods',
  CULTURAL_GOODS: 'cultural-goods',
  INFORMATION_SERVICES: 'information-services',
  MILITARY_GOODS: 'military-goods',
  BLACK_MARKET: 'black-market-commodities'
});

export const COMMODITY_LEGALITY = Object.freeze({ LEGAL: 'legal', RESTRICTED: 'restricted', ILLEGAL: 'illegal' });
export const COMMODITY_RARITY = Object.freeze({ COMMON: 'common', UNCOMMON: 'uncommon', RARE: 'rare', VERY_RARE: 'very-rare' });

const L = COMMODITY_LEGALITY;
const R = COMMODITY_RARITY;
const C = COMMODITY_CATEGORY;

export const GALACTIC_COMMODITIES = Object.freeze([
  // --- food & agriculture ---------------------------------------------
  { id: 'grain', name: 'Grain', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'grassland', 'rural'], demandedBy: ['urban', 'ecumenopolis', 'industrial'], scarcityOn: ['desert', 'barren-rock', 'ecumenopolis'] },
  { id: 'processed-foodstuffs', name: 'Processed Foodstuffs', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'manufacturing'], demandedBy: ['urban', 'ecumenopolis', 'frontier'], scarcityOn: ['desert', 'barren-rock', 'gas-giant'] },
  { id: 'preserved-rations', name: 'Preserved Rations', category: C.FOOD_AGRICULTURE, tags: ['agricultural', 'military'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'military-industrial'], demandedBy: ['military-industrial', 'frontier'], scarcityOn: [] },
  { id: 'livestock-bantha-nerf', name: 'Livestock (bantha/nerf herds)', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'grassland', 'rural'], demandedBy: ['urban'], scarcityOn: [] },
  { id: 'seafood', name: 'Seafood', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'water', 'ocean', 'coastal'], demandedBy: ['urban'], scarcityOn: ['desert', 'barren-rock'] },
  { id: 'fresh-produce', name: 'Fresh Produce', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'forest', 'grassland'], demandedBy: ['urban', 'ecumenopolis'], scarcityOn: ['desert', 'ecumenopolis'] },
  { id: 'exotic-spices', name: 'Exotic Culinary Spices', category: C.FOOD_AGRICULTURE, tags: ['agricultural', 'luxury'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['agriculture', 'jungle', 'tropical'], demandedBy: ['urban', 'tourism'], scarcityOn: [] },
  { id: 'nutrient-paste', name: 'Nutrient Paste', category: C.FOOD_AGRICULTURE, tags: ['agricultural', 'military'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing', 'agriculture'], demandedBy: ['frontier', 'military-industrial'], scarcityOn: [] },
  { id: 'blue-milk-dairy', name: 'Blue Milk & Dairy Products', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'rural'], demandedBy: ['urban'], scarcityOn: [] },
  { id: 'luxury-foodstuffs', name: 'Luxury Foodstuffs', category: C.FOOD_AGRICULTURE, tags: ['agricultural', 'luxury'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['agriculture', 'tourism'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },

  // --- minerals & raw materials ----------------------------------------
  { id: 'iron-ore', name: 'Iron Ore', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['mining', 'mountain', 'volcanic'], demandedBy: ['manufacturing', 'industrial'], scarcityOn: [] },
  { id: 'copper-ore', name: 'Copper Ore', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['mining', 'mountain'], demandedBy: ['manufacturing', 'technology'], scarcityOn: [] },
  { id: 'precious-metals', name: 'Precious Metals', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'luxury'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['mining', 'mountain'], demandedBy: ['financial-services', 'luxury'], scarcityOn: [] },
  { id: 'industrial-minerals', name: 'Industrial Minerals', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['mining', 'barren-rock'], demandedBy: ['manufacturing', 'industrial'], scarcityOn: [] },
  { id: 'gemstones', name: 'Gemstones', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'luxury'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['mining', 'mountain'], demandedBy: ['luxury', 'financial-services'], scarcityOn: [] },
  { id: 'raw-crystals', name: 'Raw Crystals', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['mining', 'crystal'], demandedBy: ['technology'], scarcityOn: [] },
  { id: 'radioactive-ores', name: 'Radioactive Ores', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'hazard'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['mining', 'volcanic'], demandedBy: ['energy', 'military-industrial'], scarcityOn: [] },
  { id: 'rare-earth-elements', name: 'Rare-Earth Elements', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials'], legality: L.LEGAL, rarity: R.RARE, producedBy: ['mining'], demandedBy: ['technology', 'shipbuilding'], scarcityOn: [] },
  { id: 'tibanna-gas', name: 'Tibanna Gas', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'energy'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['energy', 'gas-giant', 'gas'], demandedBy: ['military-industrial', 'energy'], scarcityOn: [] },
  { id: 'durasteel-feedstock', name: 'Durasteel Feedstock', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'industrial'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['mining'], demandedBy: ['manufacturing', 'shipbuilding'], scarcityOn: [] },
  { id: 'cortosis-ore', name: 'Cortosis Ore', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'military'], legality: L.RESTRICTED, rarity: R.VERY_RARE, producedBy: ['mining'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'phrik-ore', name: 'Phrik Ore', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'military'], legality: L.RESTRICTED, rarity: R.VERY_RARE, producedBy: ['mining'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'kyber-crystals', name: 'Kyber Crystals', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'force'], legality: L.RESTRICTED, rarity: R.VERY_RARE, producedBy: ['mining', 'crystal'], demandedBy: ['force-tradition'], scarcityOn: [] },
  { id: 'construction-stone', name: 'Construction Stone', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['mining', 'mountain', 'barren-rock'], demandedBy: ['urban', 'manufacturing'], scarcityOn: [] },
  { id: 'transparisteel-materials', name: 'Transparisteel Materials', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'industrial'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['mining', 'manufacturing'], demandedBy: ['shipbuilding', 'urban'], scarcityOn: [] },

  // --- energy & fuel -----------------------------------------------------
  { id: 'reactor-fuel', name: 'Reactor Fuel', category: C.ENERGY_FUEL, tags: ['energy'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['energy'], demandedBy: ['military-industrial', 'urban'], scarcityOn: [] },
  { id: 'hyperdrive-fuel', name: 'Hyperdrive Fuel', category: C.ENERGY_FUEL, tags: ['energy'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['energy', 'gas-giant'], demandedBy: ['trade', 'shipbuilding'], scarcityOn: ['frontier'] },
  { id: 'starship-fuel', name: 'Starship Fuel', category: C.ENERGY_FUEL, tags: ['energy'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['energy'], demandedBy: ['trade', 'shipbuilding'], scarcityOn: ['frontier'] },
  { id: 'power-cells', name: 'Power Cells', category: C.ENERGY_FUEL, tags: ['energy', 'technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['energy', 'manufacturing'], demandedBy: ['urban', 'military-industrial'], scarcityOn: [] },
  { id: 'refined-petrochemicals', name: 'Refined Petrochemicals', category: C.ENERGY_FUEL, tags: ['energy'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['energy', 'mining'], demandedBy: ['manufacturing'], scarcityOn: [] },
  { id: 'industrial-gases', name: 'Industrial Gases', category: C.ENERGY_FUEL, tags: ['energy'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['energy', 'gas-giant'], demandedBy: ['manufacturing', 'urban'], scarcityOn: [] },
  { id: 'geothermal-energy-products', name: 'Geothermal Energy Products', category: C.ENERGY_FUEL, tags: ['energy'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['energy', 'volcanic', 'lava'], demandedBy: ['urban'], scarcityOn: [] },

  // --- industrial goods ----------------------------------------------
  { id: 'durasteel', name: 'Durasteel', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing', 'mining'], demandedBy: ['shipbuilding', 'urban', 'ecumenopolis'], scarcityOn: [] },
  { id: 'duranium', name: 'Duranium', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing'], demandedBy: ['shipbuilding'], scarcityOn: [] },
  { id: 'transparisteel', name: 'Transparisteel', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing'], demandedBy: ['urban', 'shipbuilding'], scarcityOn: [] },
  { id: 'structural-composites', name: 'Structural Composites', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['urban', 'shipbuilding'], scarcityOn: [] },
  { id: 'machine-parts', name: 'Machine Parts', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['mining', 'agriculture', 'urban'], scarcityOn: ['frontier'] },
  { id: 'reactor-components', name: 'Reactor Components', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured', 'technology'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing', 'technology'], demandedBy: ['energy', 'shipbuilding'], scarcityOn: [] },
  { id: 'repulsorlift-components', name: 'Repulsorlift Components', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing', 'technology'], demandedBy: ['urban', 'shipbuilding'], scarcityOn: [] },
  { id: 'power-converters', name: 'Power Converters', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing', 'technology'], demandedBy: ['urban', 'frontier'], scarcityOn: ['frontier'] },
  { id: 'mining-equipment', name: 'Mining Equipment', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['mining'], scarcityOn: [] },
  { id: 'agricultural-equipment', name: 'Agricultural Equipment', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured', 'agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['agriculture', 'rural', 'frontier'], scarcityOn: [] },
  { id: 'refinery-equipment', name: 'Refinery Equipment', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing'], demandedBy: ['mining', 'energy'], scarcityOn: [] },

  // --- technology ------------------------------------------------------
  { id: 'computers', name: 'Computer Systems', category: C.TECHNOLOGY, tags: ['technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['technology'], demandedBy: ['urban', 'financial-services'], scarcityOn: ['frontier'] },
  { id: 'datapads', name: 'Datapads', category: C.TECHNOLOGY, tags: ['technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['technology'], demandedBy: ['urban'], scarcityOn: ['frontier'] },
  { id: 'communications-systems', name: 'Communications Systems', category: C.TECHNOLOGY, tags: ['technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['technology'], demandedBy: ['urban', 'trade'], scarcityOn: ['frontier'] },
  { id: 'sensor-systems', name: 'Sensor Systems', category: C.TECHNOLOGY, tags: ['technology', 'military'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['technology'], demandedBy: ['military-industrial', 'shipbuilding'], scarcityOn: [] },
  { id: 'navigation-computers', name: 'Navigation Computers', category: C.TECHNOLOGY, tags: ['technology'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['technology'], demandedBy: ['shipbuilding', 'trade'], scarcityOn: [] },
  { id: 'hyperdrive-components', name: 'Hyperdrive Components', category: C.TECHNOLOGY, tags: ['technology', 'shipbuilding'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['technology', 'shipbuilding'], demandedBy: ['shipbuilding', 'trade'], scarcityOn: [] },
  { id: 'encryption-hardware', name: 'Encryption Hardware', category: C.TECHNOLOGY, tags: ['technology'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['technology'], demandedBy: ['financial-services', 'military-industrial'], scarcityOn: [] },
  { id: 'medical-technology', name: 'Medical Technology', category: C.TECHNOLOGY, tags: ['technology', 'medical'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['technology', 'medical'], demandedBy: ['urban'], scarcityOn: ['frontier'] },
  { id: 'processors', name: 'Processors', category: C.TECHNOLOGY, tags: ['technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['technology'], demandedBy: ['droids', 'urban'], scarcityOn: [] },

  // --- droids ------------------------------------------------------------
  { id: 'labor-droids', name: 'Labor Droids', category: C.DROIDS, tags: ['droids'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['droids'], demandedBy: ['mining', 'agriculture'], scarcityOn: [] },
  { id: 'protocol-droids', name: 'Protocol Droids', category: C.DROIDS, tags: ['droids'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['droids'], demandedBy: ['urban', 'financial-services'], scarcityOn: [] },
  { id: 'astromech-units', name: 'Astromech Units', category: C.DROIDS, tags: ['droids'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['droids'], demandedBy: ['shipbuilding', 'trade'], scarcityOn: [] },
  { id: 'medical-droids', name: 'Medical Droids', category: C.DROIDS, tags: ['droids', 'medical'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['droids', 'medical'], demandedBy: ['urban', 'frontier'], scarcityOn: ['frontier'] },
  { id: 'security-droids', name: 'Security Droids', category: C.DROIDS, tags: ['droids', 'military'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['droids'], demandedBy: ['military-industrial', 'urban'], scarcityOn: [] },
  { id: 'industrial-droids', name: 'Industrial Droids', category: C.DROIDS, tags: ['droids'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['droids'], demandedBy: ['manufacturing', 'mining'], scarcityOn: [] },
  { id: 'replacement-droid-parts', name: 'Replacement Droid Parts', category: C.DROIDS, tags: ['droids'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['droids', 'manufacturing'], demandedBy: ['droids', 'frontier'], scarcityOn: ['frontier'] },

  // --- vehicles & transportation ---------------------------------------
  { id: 'landspeeders', name: 'Landspeeders', category: C.VEHICLES_TRANSPORTATION, tags: ['manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['urban', 'rural'], scarcityOn: [] },
  { id: 'cargo-haulers', name: 'Cargo Haulers', category: C.VEHICLES_TRANSPORTATION, tags: ['manufactured', 'trade'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['trade', 'mining'], scarcityOn: [] },
  { id: 'repulsorlift-vehicles', name: 'Repulsorlift Vehicles', category: C.VEHICLES_TRANSPORTATION, tags: ['manufactured'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing', 'technology'], demandedBy: ['urban'], scarcityOn: [] },
  { id: 'speeder-components', name: 'Speeder Components', category: C.VEHICLES_TRANSPORTATION, tags: ['manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['urban', 'frontier'], scarcityOn: [] },
  { id: 'starfighter-parts', name: 'Starfighter Parts', category: C.VEHICLES_TRANSPORTATION, tags: ['manufactured', 'military'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['shipbuilding', 'military-industrial'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'freighter-components', name: 'Freighter Components', category: C.VEHICLES_TRANSPORTATION, tags: ['manufactured', 'trade'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['shipbuilding'], demandedBy: ['trade'], scarcityOn: [] },

  // --- shipbuilding ------------------------------------------------------
  { id: 'starship-hull-sections', name: 'Starship Hull Sections', category: C.SHIPBUILDING, tags: ['shipbuilding'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['shipbuilding'], demandedBy: ['shipbuilding'], scarcityOn: [] },
  { id: 'sub-light-engines', name: 'Sub-Light Engines', category: C.SHIPBUILDING, tags: ['shipbuilding'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['shipbuilding', 'technology'], demandedBy: ['shipbuilding'], scarcityOn: [] },
  { id: 'shield-generators', name: 'Shield Generators', category: C.SHIPBUILDING, tags: ['shipbuilding', 'military'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['shipbuilding', 'military-industrial'], demandedBy: ['shipbuilding', 'military-industrial'], scarcityOn: [] },
  { id: 'weapon-mounts', name: 'Starship Weapon Mounts', category: C.SHIPBUILDING, tags: ['shipbuilding', 'military'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['shipbuilding', 'military-industrial'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'starships', name: 'Starships (finished vessels)', category: C.SHIPBUILDING, tags: ['shipbuilding', 'luxury'], legality: L.LEGAL, rarity: R.RARE, producedBy: ['shipbuilding'], demandedBy: ['trade', 'military-industrial'], scarcityOn: [] },

  // --- medicine & biotechnology ------------------------------------------
  { id: 'bacta', name: 'Bacta', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['medical', 'swamp', 'jungle'], demandedBy: ['urban', 'military-industrial', 'frontier'], scarcityOn: ['frontier'] },
  { id: 'medical-supplies', name: 'Medical Supplies', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['medical'], demandedBy: ['urban', 'frontier', 'barren-rock'], scarcityOn: ['frontier', 'barren-rock'] },
  { id: 'pharmaceuticals', name: 'Pharmaceuticals', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['medical', 'technology'], demandedBy: ['urban'], scarcityOn: [] },
  { id: 'surgical-equipment', name: 'Surgical Equipment', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical', 'technology'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['medical', 'technology'], demandedBy: ['urban'], scarcityOn: ['frontier'] },
  { id: 'prosthetics-cybernetics', name: 'Prosthetics & Cybernetics', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical', 'technology'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['medical', 'technology'], demandedBy: ['urban', 'military-industrial'], scarcityOn: [] },
  { id: 'vaccines', name: 'Vaccines', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['medical'], demandedBy: ['urban', 'frontier'], scarcityOn: ['frontier'] },
  { id: 'cloning-supplies', name: 'Cloning Supplies', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical', 'restricted'], legality: L.RESTRICTED, rarity: R.RARE, producedBy: ['medical', 'technology'], demandedBy: ['military-industrial'], scarcityOn: [] },

  // --- luxury goods ------------------------------------------------------
  { id: 'fine-textiles', name: 'Fine Textiles', category: C.LUXURY_GOODS, tags: ['luxury', 'manufactured'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing', 'agriculture'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },
  { id: 'exotic-wood', name: 'Exotic Wood', category: C.LUXURY_GOODS, tags: ['luxury', 'raw-materials'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['forest', 'jungle'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },
  { id: 'rare-vintages', name: 'Rare Vintages & Spirits', category: C.LUXURY_GOODS, tags: ['luxury'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['agriculture', 'tourism'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },
  { id: 'perfumes', name: 'Perfumes & Fragrances', category: C.LUXURY_GOODS, tags: ['luxury'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['agriculture', 'manufacturing'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },
  { id: 'jewelry', name: 'Jewelry', category: C.LUXURY_GOODS, tags: ['luxury'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['mining', 'manufacturing'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },
  { id: 'exotic-pets', name: 'Exotic Pets', category: C.LUXURY_GOODS, tags: ['luxury'], legality: L.RESTRICTED, rarity: R.RARE, producedBy: ['jungle', 'wilderness', 'wildlife'], demandedBy: ['noble-house'], scarcityOn: [] },
  { id: 'collectible-artifacts', name: 'Collectible Artifacts', category: C.LUXURY_GOODS, tags: ['luxury', 'cultural'], legality: L.LEGAL, rarity: R.RARE, producedBy: ['cultural', 'ancient', 'ruin'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },

  // --- cultural goods ------------------------------------------------------
  { id: 'literature', name: 'Literature & Historical Texts', category: C.CULTURAL_GOODS, tags: ['cultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['cultural', 'urban'], demandedBy: ['urban'], scarcityOn: [] },
  { id: 'holodramas', name: 'Holodramas & Entertainment Media', category: C.CULTURAL_GOODS, tags: ['cultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['cultural', 'urban'], demandedBy: ['urban', 'frontier'], scarcityOn: [] },
  { id: 'music-recordings', name: 'Music Recordings', category: C.CULTURAL_GOODS, tags: ['cultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['cultural', 'urban'], demandedBy: ['urban'], scarcityOn: [] },
  { id: 'religious-objects', name: 'Religious/Ceremonial Objects', category: C.CULTURAL_GOODS, tags: ['cultural', 'religion'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['cultural', 'religion', 'holy'], demandedBy: ['religion'], scarcityOn: [] },
  { id: 'traditional-crafts', name: 'Traditional Crafts', category: C.CULTURAL_GOODS, tags: ['cultural'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['cultural', 'rural', 'community-tribe'], demandedBy: ['tourism', 'urban'], scarcityOn: [] },
  { id: 'archaeological-reproductions', name: 'Archaeological Reproductions', category: C.CULTURAL_GOODS, tags: ['cultural'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['cultural', 'ancient', 'ruin'], demandedBy: ['tourism'], scarcityOn: [] },

  // --- information & services ---------------------------------------------
  { id: 'banking-services', name: 'Banking Services', category: C.INFORMATION_SERVICES, tags: ['services'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['financial-services'], demandedBy: ['urban', 'trade'], scarcityOn: [] },
  { id: 'investment-capital', name: 'Investment Capital', category: C.INFORMATION_SERVICES, tags: ['services'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['financial-services'], demandedBy: ['manufacturing', 'shipbuilding'], scarcityOn: [] },
  { id: 'mercenary-services', name: 'Mercenary Services', category: C.INFORMATION_SERVICES, tags: ['services', 'military'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['military-industrial'], demandedBy: ['frontier'], scarcityOn: [] },
  { id: 'security-services', name: 'Security Services', category: C.INFORMATION_SERVICES, tags: ['services'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['military-industrial', 'urban'], demandedBy: ['urban', 'trade'], scarcityOn: [] },
  { id: 'intelligence-services', name: 'Intelligence Services', category: C.INFORMATION_SERVICES, tags: ['services'], legality: L.RESTRICTED, rarity: R.RARE, producedBy: ['military-industrial'], demandedBy: ['government-bureaucracy'], scarcityOn: [] },
  { id: 'engineering-expertise', name: 'Engineering Expertise', category: C.INFORMATION_SERVICES, tags: ['services', 'technology'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['technology', 'shipbuilding'], demandedBy: ['urban', 'shipbuilding'], scarcityOn: [] },
  { id: 'ship-repair-services', name: 'Ship Repair Services', category: C.INFORMATION_SERVICES, tags: ['services', 'shipbuilding'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['shipbuilding'], demandedBy: ['trade'], scarcityOn: [] },
  { id: 'tourism-hospitality', name: 'Tourism & Hospitality', category: C.INFORMATION_SERVICES, tags: ['services'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['tourism'], demandedBy: [], scarcityOn: [] },

  // --- military goods (restricted/controlled) -----------------------------
  { id: 'small-arms', name: 'Small Arms', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['military-industrial'], demandedBy: ['military-industrial', 'frontier'], scarcityOn: [] },
  { id: 'blaster-components', name: 'Blaster Components', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['military-industrial', 'manufacturing'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'armor-plating', name: 'Armor Plating', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['military-industrial'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'explosives', name: 'Explosives', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['military-industrial', 'mining'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'military-electronics', name: 'Military Electronics', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.RARE, producedBy: ['military-industrial', 'technology'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'military-vehicles', name: 'Military Vehicles', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.RARE, producedBy: ['military-industrial'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'munitions', name: 'Munitions', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['military-industrial'], demandedBy: ['military-industrial'], scarcityOn: [] },

  // --- black-market commodities (illegal) ---------------------------------
  { id: 'stolen-technology', name: 'Stolen Technology', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.RARE, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'forged-identification', name: 'Forged Identification', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'restricted-weapons', name: 'Restricted Weapons', category: C.BLACK_MARKET, tags: ['illicit', 'criminal', 'military'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'illegal-droid-modifications', name: 'Illegal Droid Modifications', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.RARE, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'contraband-medicine', name: 'Contraband Medicine', category: C.BLACK_MARKET, tags: ['illicit', 'criminal', 'medical'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['black-market'], demandedBy: ['black-market', 'frontier'], scarcityOn: [] },
  { id: 'stolen-artifacts', name: 'Stolen Artifacts', category: C.BLACK_MARKET, tags: ['illicit', 'criminal', 'cultural'], legality: L.ILLEGAL, rarity: R.RARE, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'pirated-data', name: 'Pirated Data', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'counterfeit-parts', name: 'Counterfeit Parts', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'spice', name: 'Spice', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['spice', 'black-market'], demandedBy: ['black-market'], scarcityOn: [] },

  // ================================================================
  // PHASE 8D-3A production expansion (~55 new entries) -- filling
  // remaining category gaps and cross-referencing the new economy
  // sector slugs (`entertainment`/`luxury`/`research`/`education`/
  // `salvage`/`security`) `data/planet-economies.js` introduced, so no
  // sector exists with zero matching commodities.
  // ================================================================

  // --- food & agriculture (more) ---
  { id: 'root-vegetables', name: 'Root Vegetables', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'rural'], demandedBy: ['urban'], scarcityOn: ['desert', 'ecumenopolis'] },
  { id: 'orchard-fruit', name: 'Orchard Fruit', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'grassland'], demandedBy: ['urban'], scarcityOn: ['desert'] },
  { id: 'seed-stock', name: 'Seed Stock', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture'], demandedBy: ['agriculture', 'frontier'], scarcityOn: ['frontier'] },
  { id: 'animal-feed', name: 'Animal Feed', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture'], demandedBy: ['agriculture', 'rural'], scarcityOn: [] },
  { id: 'bantha-hide-wool', name: 'Bantha Hide & Wool', category: C.FOOD_AGRICULTURE, tags: ['agricultural'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['agriculture', 'rural'], demandedBy: ['urban', 'manufacturing'], scarcityOn: [] },
  { id: 'nutrient-cultures', name: 'Nutrient Cultures', category: C.FOOD_AGRICULTURE, tags: ['agricultural', 'technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing', 'research'], demandedBy: ['frontier', 'military-industrial'], scarcityOn: [] },

  // --- minerals & raw materials (more) ---
  { id: 'carbonite', name: 'Carbonite', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'industrial'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['mining', 'industrial'], demandedBy: ['manufacturing', 'shipbuilding'], scarcityOn: [] },
  { id: 'ceramic-composites', name: 'Ceramic Composites', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials', 'industrial'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['mining', 'manufacturing'], demandedBy: ['shipbuilding', 'urban'], scarcityOn: [] },
  { id: 'raw-ore-generic', name: 'Bulk Ore', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['mining'], demandedBy: ['manufacturing', 'industrial'], scarcityOn: [] },
  { id: 'sand-and-silicates', name: 'Sand & Silicates', category: C.MINERALS_RAW_MATERIALS, tags: ['raw-materials'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['mining', 'desert'], demandedBy: ['manufacturing', 'technology'], scarcityOn: [] },

  // --- energy & fuel (more) ---
  { id: 'energy-storage-cells', name: 'Energy Storage Cells', category: C.ENERGY_FUEL, tags: ['energy', 'technology'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['energy', 'technology'], demandedBy: ['urban', 'frontier'], scarcityOn: ['frontier'] },
  { id: 'fuel-precursors', name: 'Fuel Precursor Chemicals', category: C.ENERGY_FUEL, tags: ['energy'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['energy', 'mining'], demandedBy: ['energy', 'shipbuilding'], scarcityOn: [] },
  { id: 'coolant-fluids', name: 'Reactor Coolant Fluids', category: C.ENERGY_FUEL, tags: ['energy', 'industrial'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['energy', 'manufacturing'], demandedBy: ['military-industrial', 'urban'], scarcityOn: [] },

  // --- industrial goods (more) ---
  { id: 'industrial-machinery', name: 'Industrial Machinery', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['mining', 'agriculture', 'energy'], scarcityOn: ['frontier'] },
  { id: 'construction-equipment', name: 'Construction Equipment', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['urban', 'frontier'], scarcityOn: ['frontier'] },
  { id: 'communications-array-components', name: 'Communications Array Components', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'technology'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing', 'technology'], demandedBy: ['urban', 'frontier'], scarcityOn: ['frontier'] },
  { id: 'scrap-metal', name: 'Scrap Metal', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'salvage'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['salvage'], demandedBy: ['manufacturing', 'salvage'], scarcityOn: [] },
  { id: 'salvaged-components', name: 'Salvaged Components', category: C.INDUSTRIAL_GOODS, tags: ['industrial', 'salvage'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['salvage'], demandedBy: ['frontier', 'manufacturing'], scarcityOn: [] },

  // --- technology (more) ---
  { id: 'memory-modules', name: 'Memory Modules', category: C.TECHNOLOGY, tags: ['technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['technology'], demandedBy: ['urban', 'droids'], scarcityOn: ['frontier'] },
  { id: 'scientific-instruments', name: 'Scientific Instruments', category: C.TECHNOLOGY, tags: ['technology', 'research'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['technology', 'research'], demandedBy: ['research'], scarcityOn: [] },
  { id: 'security-systems-hardware', name: 'Security Systems Hardware', category: C.TECHNOLOGY, tags: ['technology', 'security'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['technology', 'security'], demandedBy: ['security', 'urban'], scarcityOn: [] },
  { id: 'holo-projectors', name: 'Holoprojectors', category: C.TECHNOLOGY, tags: ['technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['technology'], demandedBy: ['urban', 'entertainment'], scarcityOn: ['frontier'] },

  // --- droids (more) ---
  { id: 'generic-droid-components', name: 'Droid Components', category: C.DROIDS, tags: ['droids', 'technology'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['droids', 'technology'], demandedBy: ['droids', 'manufacturing'], scarcityOn: ['frontier'] },
  { id: 'combat-droid-chassis', name: 'Combat Droid Chassis', category: C.DROIDS, tags: ['droids', 'military'], legality: L.RESTRICTED, rarity: R.RARE, producedBy: ['droids', 'military-industrial'], demandedBy: ['military-industrial'], scarcityOn: [] },

  // --- vehicles & transportation (more) ---
  { id: 'generic-vehicle-components', name: 'Vehicle Components', category: C.VEHICLES_TRANSPORTATION, tags: ['manufactured'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['manufacturing'], demandedBy: ['urban', 'frontier'], scarcityOn: [] },
  { id: 'avionics-systems', name: 'Avionics Systems', category: C.VEHICLES_TRANSPORTATION, tags: ['manufactured', 'technology'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['manufacturing', 'technology'], demandedBy: ['shipbuilding'], scarcityOn: [] },

  // --- shipbuilding (more) ---
  { id: 'docking-clamp-assemblies', name: 'Docking Clamp Assemblies', category: C.SHIPBUILDING, tags: ['shipbuilding'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['shipbuilding'], demandedBy: ['trade', 'shipbuilding'], scarcityOn: [] },
  { id: 'hyperdrive-motivators', name: 'Hyperdrive Motivators', category: C.SHIPBUILDING, tags: ['shipbuilding', 'technology'], legality: L.LEGAL, rarity: R.RARE, producedBy: ['shipbuilding', 'technology'], demandedBy: ['shipbuilding', 'trade'], scarcityOn: [] },

  // --- medicine & biotechnology (more) ---
  { id: 'lab-supplies', name: 'Laboratory Supplies', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical', 'research'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['medical', 'research'], demandedBy: ['research', 'medical'], scarcityOn: ['frontier'] },
  { id: 'biological-samples', name: 'Biological Samples', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical', 'research'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['research', 'medical'], demandedBy: ['research'], scarcityOn: [] },
  { id: 'nutrient-supplements', name: 'Nutrient Supplements', category: C.MEDICINE_BIOTECHNOLOGY, tags: ['medical'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['medical', 'agriculture'], demandedBy: ['frontier', 'urban'], scarcityOn: ['frontier'] },

  // --- luxury goods (more) ---
  { id: 'luxury-groundspeeders', name: 'Luxury Groundspeeders', category: C.LUXURY_GOODS, tags: ['luxury', 'manufactured'], legality: L.LEGAL, rarity: R.RARE, producedBy: ['luxury', 'manufacturing'], demandedBy: ['noble-house'], scarcityOn: [] },
  { id: 'designer-apparel', name: 'Designer Apparel', category: C.LUXURY_GOODS, tags: ['luxury'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['luxury', 'manufacturing'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },
  { id: 'fine-art', name: 'Fine Art', category: C.LUXURY_GOODS, tags: ['luxury', 'cultural'], legality: L.LEGAL, rarity: R.RARE, producedBy: ['cultural', 'luxury'], demandedBy: ['noble-house', 'urban'], scarcityOn: [] },

  // --- cultural goods (more) ---
  { id: 'educational-texts-holocrons', name: 'Educational Texts & Holocrons', category: C.CULTURAL_GOODS, tags: ['cultural', 'education'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['education', 'cultural'], demandedBy: ['education', 'urban'], scarcityOn: ['frontier'] },
  { id: 'gaming-and-gambling-equipment', name: 'Gaming & Gambling Equipment', category: C.CULTURAL_GOODS, tags: ['cultural', 'entertainment'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['entertainment'], demandedBy: ['entertainment', 'tourism'], scarcityOn: [] },
  { id: 'sporting-goods', name: 'Sporting Goods', category: C.CULTURAL_GOODS, tags: ['cultural', 'entertainment'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['entertainment', 'manufacturing'], demandedBy: ['urban'], scarcityOn: [] },

  // --- information & services (more) ---
  { id: 'private-security-contracts', name: 'Private Security Contracts', category: C.INFORMATION_SERVICES, tags: ['services', 'security'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['security'], demandedBy: ['urban', 'trade'], scarcityOn: [] },
  { id: 'educational-services', name: 'Educational Services', category: C.INFORMATION_SERVICES, tags: ['services', 'education'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['education'], demandedBy: ['urban'], scarcityOn: ['frontier'] },
  { id: 'research-contracts', name: 'Research Contracts', category: C.INFORMATION_SERVICES, tags: ['services', 'research'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['research'], demandedBy: ['technology', 'medical'], scarcityOn: [] },
  { id: 'archaeological-consulting', name: 'Archaeological Consulting', category: C.INFORMATION_SERVICES, tags: ['services', 'cultural'], legality: L.LEGAL, rarity: R.UNCOMMON, producedBy: ['cultural'], demandedBy: ['tourism', 'cultural'], scarcityOn: [] },

  // --- military goods (more) ---
  { id: 'targeting-systems', name: 'Targeting Systems', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.RARE, producedBy: ['military-industrial', 'technology'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'body-armor-components', name: 'Body Armor Components', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.UNCOMMON, producedBy: ['military-industrial'], demandedBy: ['military-industrial', 'security'], scarcityOn: [] },
  { id: 'military-vehicle-components', name: 'Military Vehicle Components', category: C.MILITARY_GOODS, tags: ['military', 'restricted', 'controlled'], legality: L.RESTRICTED, rarity: R.RARE, producedBy: ['military-industrial'], demandedBy: ['military-industrial'], scarcityOn: [] },
  { id: 'field-rations-military', name: 'Military Field Rations', category: C.MILITARY_GOODS, tags: ['military'], legality: L.LEGAL, rarity: R.COMMON, producedBy: ['military-industrial', 'agriculture'], demandedBy: ['military-industrial', 'frontier'], scarcityOn: [] },

  // --- black-market commodities (more) ---
  { id: 'unregistered-blasters', name: 'Unregistered Blasters', category: C.BLACK_MARKET, tags: ['illicit', 'criminal', 'military'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'stolen-vehicles', name: 'Stolen Vehicles', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'illicit-cybernetics', name: 'Illicit Cybernetics', category: C.BLACK_MARKET, tags: ['illicit', 'criminal', 'medical'], legality: L.ILLEGAL, rarity: R.RARE, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'trafficked-goods', name: 'Trafficked Goods (sensitive)', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.RARE, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'illegal-spice-derivatives', name: 'Illegal Spice Derivatives', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['spice', 'black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'counterfeit-currency', name: 'Counterfeit Currency', category: C.BLACK_MARKET, tags: ['illicit', 'criminal'], legality: L.ILLEGAL, rarity: R.RARE, producedBy: ['black-market'], demandedBy: ['black-market'], scarcityOn: [] },
  { id: 'illegal-surveillance-gear', name: 'Illegal Surveillance Gear', category: C.BLACK_MARKET, tags: ['illicit', 'criminal', 'security'], legality: L.ILLEGAL, rarity: R.UNCOMMON, producedBy: ['black-market'], demandedBy: ['black-market', 'security'], scarcityOn: [] }
]);
