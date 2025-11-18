/**
 * Script to rebuild armor.db with correct SWSE armor data
 * Run with: node scripts/fix-armor-data.js
 */

const fs = require('fs');
const path = require('path');

// Armor type constants
const LIGHT = 'light';
const MEDIUM = 'medium';
const HEAVY = 'heavy';

// Standard armor check penalties and speed penalties by type
const ARMOR_PROPERTIES = {
  light: { checkPenalty: -2, speedPenalty: 0 },
  medium: { checkPenalty: -5, speedPenalty: 2 },
  heavy: { checkPenalty: -10, speedPenalty: 2 }
};

// Complete armor data from SWSE rulebooks
const armorData = [
  // LIGHT ARMOR - Core Rulebook
  {
    id: 'armor-armored-flight-suit',
    name: 'Armored Flight Suit',
    armorType: LIGHT,
    defenseBonus: 5,
    fortBonus: 2,
    maxDexBonus: 3,
    weight: 10,
    cost: 4000,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>A combat-ready Flight Suit that provides additional protection against vacuum for limited periods, this armor comes in various models, including the Corellian TX-3 (favored by various pirate gangs) and the Imperial TIE flight suit (worn by TIE Fighter pilots throughout the Empire).</p>
      <p>An Armored Flight Suit provides up to 10 hours of life support, allowing its wearer to survive in the vacuum of space or any other hostile environment.</p>`
  },
  {
    id: 'armor-blast-helmet-and-vest',
    name: 'Blast Helmet and Vest',
    armorType: LIGHT,
    defenseBonus: 2,
    fortBonus: 0,
    maxDexBonus: 5,
    weight: 3,
    cost: 500,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>This armor consists of a lightweight helmet and a composite vest that, when worn together, offer limited protection against incoming attacks.</p>`
  },
  {
    id: 'armor-combat-jumpsuit',
    name: 'Combat Jumpsuit',
    armorType: LIGHT,
    defenseBonus: 4,
    fortBonus: 0,
    maxDexBonus: 4,
    weight: 8,
    cost: 1500,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>This heavily padded jumpsuit is designed to provide limited protection against physical and energy trauma without overly restricting the wearer's movement.</p>`
  },
  {
    id: 'armor-padded-flight-suit',
    name: 'Padded Flight Suit',
    armorType: LIGHT,
    defenseBonus: 3,
    fortBonus: 1,
    maxDexBonus: 4,
    weight: 5,
    cost: 2000,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>Favored by Starfighter pilots all over the galaxy, the one-piece padded Flight Suit protects against decompression, g-force, and harmful environments. It provides limited protection against attacks as well.</p>
      <p>A Padded Flight Suit comes with a matching helmet and gloves that seal around the wearer and provide up to 10 hours of life support, allowing them to survive in the vacuum of space or any other hostile environment.</p>`
  },
  {
    id: 'armor-stormtrooper-armor',
    name: 'Stormtrooper Armor',
    armorType: LIGHT,
    defenseBonus: 6,
    fortBonus: 2,
    maxDexBonus: 3,
    weight: 10,
    cost: 8000,
    availability: 'Military, Rare',
    sourcebook: 'Core Rulebook',
    description: `<p>Worn by the elite soldiers of The Galactic Empire, Stormtrooper Armor comes in a variety of models based around a standard white-and black shell. Filled with electronics that assist and augment the Stormtrooper in their duties, it includes rudimentary environmental protection, three-phase sonic filtering, and visual amplification.</p>
      <p>Variants of this armor also exist, including Snowtrooper Armor, Sandtrooper Armor, and Clone Trooper Armor. Each has slightly different details, but all include the basic characteristics common to all Stormtrooper Armor.</p>
      <p><strong>Special:</strong> Stormtrooper Armor grants a wearer who has the Armor Proficiency (Light) feat a +2 Equipment bonus on Perception checks, as well as Low-Light Vision. Includes an integrated Comlink in the helmet.</p>`
  },
  {
    id: 'armor-vonduun-crabshell',
    name: 'Vonduun Crabshell',
    armorType: LIGHT,
    defenseBonus: 5,
    fortBonus: 5,
    maxDexBonus: 4,
    weight: 5,
    cost: 0,
    availability: 'Rare',
    sourcebook: 'Core Rulebook',
    description: `<p>Yuuzhan Vong warriors wear this bioengineered "living armor" into battle. The armor clings to its wearer's body like a parasite until its wearer dies or decides to remove it.</p>
      <p>It is not found anywhere except in the hands of The Yuuzhan Vong Empire.</p>`
  },

  // LIGHT ARMOR - Knights of the Old Republic Campaign Guide
  {
    id: 'armor-fiber-armor',
    name: 'Fiber Armor',
    armorType: LIGHT,
    defenseBonus: 4,
    fortBonus: 1,
    maxDexBonus: 2,
    weight: 10,
    cost: 3000,
    availability: 'Licensed',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Initially used on worlds where traditional armor plating was in short supply, Fiber Armor is specially designed to channel Energy-weapon attacks away from the body. The various metal fibers woven into the exterior of this armor cause it to absorb and harmlessly disperse Energy damage.</p>
      <p><strong>Special:</strong> Once per encounter, a character Fighting Defensively while wearing Fiber Armor can gain Damage Reduction 10 against a single ranged Energy attack as a Reaction.</p>`
  },
  {
    id: 'armor-light-battle-armor',
    name: 'Light Battle Armor',
    armorType: LIGHT,
    defenseBonus: 5,
    fortBonus: 2,
    maxDexBonus: 3,
    weight: 10,
    cost: 3500,
    availability: 'Military',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Similar to denser suits of Battle Armor, this stripped-down Light Battle Armor is frequently used by soldiers who lack extensive armor training, but need a slight edge in combat.</p>`
  },
  {
    id: 'armor-light-powered-battle-armor',
    name: 'Light Powered Battle Armor',
    armorType: LIGHT,
    defenseBonus: 4,
    fortBonus: 2,
    maxDexBonus: 3,
    weight: 12,
    cost: 6500,
    availability: 'Military',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Designed to be augmented with additional components and weapons, Light Powered Battle Armor comes prewired with special connections to power auxiliary accessories. Light Powered Battle Armor comes with a Helmet Package preinstalled.</p>
      <p><strong>Special:</strong> When using the Equipment Modification rules, Light Powered Battle Armor has 2 free Upgrade Slots (as does all Powered Armor).</p>`
  },
  {
    id: 'armor-mandalorian-combat-suit',
    name: 'Mandalorian Combat Suit',
    armorType: LIGHT,
    defenseBonus: 4,
    fortBonus: 1,
    maxDexBonus: 5,
    weight: 8,
    cost: 0,
    availability: 'Military, Rare',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Favored by The Mandalorians before the beginning of the Neo-Crusader movement, this vacuum-sealed suit has metal composite plates attached, providing protection in battle with a maximum range of movement.</p>
      <p><strong>Special:</strong> A helmet is included in this package, providing any wearer who has the Armor Proficiency (Light) feat with an internal Comlink and a Helmet Package. The suit can also provide its wearer with up to 10 hours of life support. This armor comes with a Jet Pack and has five unused Upgrade Slots.</p>`
  },
  {
    id: 'armor-neo-crusader-light-armor',
    name: 'Neo-Crusader Light Armor',
    armorType: LIGHT,
    defenseBonus: 6,
    fortBonus: 2,
    maxDexBonus: 3,
    weight: 42,
    cost: 0,
    availability: 'Rare',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>The basic issue Armor of the Mandalorian ground forces, Neo-Crusader Light Armor includes a helmet, boots, and gauntlets. The helmet provides any wearer who has the Armor Proficiency (Light) feat with an internal Comlink and a Helmet Package.</p>
      <p><strong>Special:</strong> The suit can also provide its wearer with up to 10 hours of life support, allowing the wearer to survive in the Vacuum of space or in any other hostile environment. This armor comes with a Jet Pack and has four unused Upgrade Slots.</p>`
  },
  {
    id: 'armor-republic-light-armor',
    name: 'Republic Light Armor',
    armorType: LIGHT,
    defenseBonus: 4,
    fortBonus: 1,
    maxDexBonus: 3,
    weight: 7,
    cost: 0,
    availability: 'Military',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Standard-issue armor for Republic forces not expecting heavy combat. Republic Light Armor includes a helmet and boots.</p>
      <p><strong>Special:</strong> The helmet provides any wearer who has the Armor Proficiency (Light) feat with an attached Comlink. This simple armor is not upgradable.</p>`
  },

  // LIGHT ARMOR - Scum and Villainy
  {
    id: 'armor-half-vest',
    name: 'Half-Vest',
    armorType: LIGHT,
    defenseBonus: 1,
    fortBonus: 0,
    maxDexBonus: 5,
    weight: 2,
    cost: 250,
    availability: 'Restricted',
    sourcebook: 'Scum and Villainy',
    description: `<p>The Koromondain Mark 45 protective vest is usually worn by smugglers who are expecting trouble but don't want to be seen wearing Armor in public. Lightweight, flexible, and easily hidden under clothing (+5 Equipment bonus to Stealth checks made to conceal the armor).</p>
      <p><strong>Special:</strong> Once per encounter as a Free Action, the wearer can negate the bonus damage on any attack made against them while they are denied their Dexterity bonus to their Reflex Defense (such as when being targeted by an attacker with the Sneak Attack Talent).</p>`
  },
  {
    id: 'armor-light-beskargam',
    name: "Light Beskar'gam",
    armorType: LIGHT,
    defenseBonus: 5,
    fortBonus: 2,
    maxDexBonus: 3,
    weight: 10,
    cost: 33500,
    availability: 'Licensed, Rare',
    sourcebook: 'Scum and Villainy',
    description: `<p>The Beskar'gam is the traditional suit of Mandalorian Armor. Unlike the Neo-Crusader Light Armor, most suits of Beskar'gam are individually tailored to the wearer. True Beskar'gam is made of Mandalorian Iron (Beskar) which is strong enough to deflect blaster fire and even Lightsabers.</p>
      <p><strong>Special:</strong> A suit of Beskar'gam grants favorable circumstances on Persuasion checks made to Intimidate, and if the wearer has DR than the wearer can apply its benefit against attacks made by Lightsabers. Though not Powered Armor, Beskar'gam Armor has two free Upgrade Slots.</p>
      <p><em>Note: Gamemasters can reduce the cost by 30,000 credits for Mandalorian heroes.</em></p>`
  },
  {
    id: 'armor-shadowsuit',
    name: 'Shadowsuit',
    armorType: LIGHT,
    defenseBonus: 1,
    fortBonus: 1,
    maxDexBonus: 5,
    weight: 2,
    cost: 600,
    availability: 'Military',
    sourcebook: 'Scum and Villainy',
    description: `<p>Used by assassins and burglars, the Shadowsuit manufactured by Ayelixe/Krongbing Textiles is little more than a black body stocking covering the wearer's entire body. Made from Shadowsilk that absorbs light and sound.</p>
      <p><strong>Special:</strong> A Shadowsuit grants a +5 Equipment bonus to Stealth checks whenever the wearer has Concealment from darkness or low-light conditions.</p>`
  },

  // LIGHT ARMOR - Clone Wars Campaign Guide
  {
    id: 'armor-thinsuit',
    name: 'Thinsuit',
    armorType: LIGHT,
    defenseBonus: 0,
    fortBonus: 0,
    maxDexBonus: 6,
    weight: 1,
    cost: 900,
    availability: 'Standard',
    sourcebook: 'Clone Wars Campaign Guide',
    description: `<p>Insulating against extreme pressure and temperature, a Thinsuit is a skintight garment that covers the entire body except for the face, which is covered by a Breath Mask that provides 1 hour of breathable air.</p>
      <p><strong>Special:</strong> The Thinsuit comes with an Environmental System that allows the wearer to remain comfortable in Extreme Heat and Extreme Cold. Provides a +5 bonus to Fortitude Defense when resisting Extreme Temperatures. This Armor can be worn beneath clothing or other Armor.</p>`
  },
  {
    id: 'armor-tracker-utility-vest',
    name: 'Tracker Utility Vest',
    armorType: LIGHT,
    defenseBonus: 1,
    fortBonus: 0,
    maxDexBonus: 5,
    weight: 0.5,
    cost: 300,
    availability: 'Standard',
    sourcebook: 'Clone Wars Campaign Guide',
    description: `<p>The Tracker Utility Vest is a simple garment that allows hunters and guides to carry a wide assortment of small Equipment without discomforting the wearer.</p>
      <p><strong>Special:</strong> Features pockets, pouches, and straps capable of carrying up to twenty-four small objects weighing no more than 1 kilogram each. Their cumulative weight is halved for purposes of calculating the wearer's total carried weight.</p>`
  },

  // LIGHT ARMOR - Legacy Era Campaign Guide
  {
    id: 'armor-galactic-alliance-armor',
    name: 'Galactic Alliance Armor',
    armorType: LIGHT,
    defenseBonus: 4,
    fortBonus: 1,
    maxDexBonus: 3,
    weight: 9,
    cost: 6000,
    availability: 'Military',
    sourcebook: 'Legacy Era Campaign Guide',
    description: `<p>For over 100 years, The Galactic Alliance has used variations of its own Light Armor design, usually in dark blue hues with black accents. Combines a padded armor base with a reinforced breastplate and fully armored gauntlets.</p>
      <p>Some front-line troopers also use a fully enclosed helmet with a Helmet Package, but this varies by unit.</p>`
  },

  // LIGHT ARMOR - Jedi Academy Training Manual
  {
    id: 'armor-blinding-helmet',
    name: 'Blinding Helmet',
    armorType: LIGHT,
    defenseBonus: 0,
    fortBonus: 0,
    maxDexBonus: null,
    weight: 2,
    cost: 200,
    availability: 'Rare',
    sourcebook: 'Jedi Academy Training Manual',
    description: `<p>Typically used during Jedi training, the WJ-880 Blinding Helmet covers the wearer's eyes, requiring the wearer to rely on The Force for a sense of his or her surroundings.</p>
      <p><strong>Special:</strong> Though technically considered armor, few Jedi would wear the Blinding Helmet into combat, as doing so grants all targets Total Concealment from the wearer. The Blinding Helmet can be worn in tandem with clothing or other Armor.</p>`
  },
  {
    id: 'armor-light-dark-armor',
    name: 'Light Dark Armor',
    armorType: LIGHT,
    defenseBonus: 4,
    fortBonus: 3,
    maxDexBonus: 3,
    weight: 10,
    cost: 10000,
    availability: 'Rare',
    sourcebook: 'Jedi Academy Training Manual',
    description: `<p>Dark Armor is the generic name given to various suits of armor possessed and worn by the Sith. Each suit of Dark Armor is unique, having been created for and often modified by an individual Sith Lord through various processes, including Sith Alchemy.</p>
      <p>Dark Armor is not just another piece of protective gear; to many Sith Lords, the armor is nearly as important as their Lightsabers.</p>
      <p><strong>Special:</strong> A suit of Light Dark Armor automatically comes with a single enhancement from the Sith Alchemy Specialist Talent.</p>`
  },
  {
    id: 'armor-light-jedi-battle-armor',
    name: 'Light Jedi Battle Armor',
    armorType: LIGHT,
    defenseBonus: 3,
    fortBonus: 3,
    maxDexBonus: 4,
    weight: 6,
    cost: 4000,
    availability: 'Rare',
    sourcebook: 'Jedi Academy Training Manual',
    description: `<p>Designed to match the needs of the individual Jedi who wears it, a suit of Jedi Battle Armor is a rare sight in the galaxy. Mostly popularized during the days of The Great Sith War and The Jedi Civil War, Jedi Battle Armor protects vital areas while not hindering the movements of the wearer.</p>`
  },

  // LIGHT ARMOR - Rebellion Era Campaign Guide
  {
    id: 'armor-kzz-riot-armor',
    name: 'KZZ Riot Armor',
    armorType: LIGHT,
    defenseBonus: 2,
    fortBonus: 2,
    maxDexBonus: 5,
    weight: 6,
    cost: 2500,
    availability: 'Military',
    sourcebook: 'Rebellion Era Campaign Guide',
    description: `<p>KZZ Riot Armor is manufactured by Merr-Sonn Munitions for the Espos of The Corporate Sector Authority. It consists of a reinforced blast helmet and vest and a small shield; the shield is strapped to the wearer's arm and does not interfere with their ability to use the associated hand.</p>
      <p>The vest and helmet are brown, giving rise to the Espos' nickname, "Boys in Brown." While more expensive than a Combat Jumpsuit, KZZ Riot Armor offers the maneuverability of a typical Blast Helmet and Vest and is lighter than a Combat Jumpsuit.</p>`
  },
  {
    id: 'armor-seatrooper-armor',
    name: 'Seatrooper Armor',
    armorType: LIGHT,
    defenseBonus: 4,
    fortBonus: 2,
    maxDexBonus: 2,
    weight: 14,
    cost: 6750,
    availability: 'Military',
    sourcebook: 'Rebellion Era Campaign Guide',
    description: `<p>Developed specifically for engagements on Mon Calamari and Tibrin, the aquatic armor worn by Imperial Seatroopers is pressure-sealed to a maximum of ten atmospheres (about 660 feet underwater) and incorporates a Rebreather.</p>
      <p><strong>Special:</strong> In addition to the +2 Equipment bonus to Fortitude Defense provided by standard Stormtrooper Armor, Seatrooper Armor provides a +2 Equipment bonus to Swim checks because of its underwater Propulsion Pack and swim flippers.</p>`
  },
  {
    id: 'armor-shield-gauntlet',
    name: 'Shield Gauntlet',
    armorType: LIGHT,
    defenseBonus: 0,
    fortBonus: 0,
    maxDexBonus: null,
    weight: 1,
    cost: 1500,
    availability: 'Rare',
    sourcebook: 'Rebellion Era Campaign Guide',
    description: `<p>While Energy Shields have fallen out of use in much of the galaxy, they can still be found among the nobility of Kilia IV. The Kilian Rangers use Shield Gauntlets to both provide defense and remind themselves and others of their oaths.</p>
      <p><strong>Special:</strong> A Shield Gauntlet can be worn even if you are wearing other Armor, although you cannot wear any items that cover your hands. A Shield Gauntlet provides no benefit to the untrained, but those with certain Talents (see Kilian Ranger Talent Tree) can use it to deflect ranged attacks. The Shield Gauntlet can be worn in tandem with clothing or other Armor.</p>`
  },

  // LIGHT ARMOR - Galaxy at War
  {
    id: 'armor-marine-armor',
    name: 'Marine Armor',
    armorType: LIGHT,
    defenseBonus: 5,
    fortBonus: 2,
    maxDexBonus: 3,
    weight: 12,
    cost: 5000,
    availability: 'Restricted',
    sourcebook: 'Galaxy at War',
    description: `<p>This Light Armor is employed by The Rebel Alliance during the Galactic Civil War. It provides decent protection for front-line troops during ship-boarding actions and house-to-house fighting, and even in Zero-Gravity, in Vacuum, or underwater.</p>
      <p><strong>Special:</strong> The Armor's sealed life-support system allows the wearer to survive for up to 24 hours in the Vacuum of space or otherwise hostile environments. The magnetic boot soles reduce the wearer's Speed by 2 squares. A small propulsion system on the backpack allows the wearer to reroll any failed Swim checks and maneuver without penalty in Zero-Gravity.</p>`
  },
  {
    id: 'armor-microbe-armor',
    name: 'Microbe Armor',
    armorType: LIGHT,
    defenseBonus: 2,
    fortBonus: 0,
    maxDexBonus: 3,
    weight: 6,
    cost: 4000,
    availability: 'Licensed',
    sourcebook: 'Galaxy at War',
    description: `<p>Created by Creshaldyne Industries, this Armor is a sleeveless vest of soft material. Pouches within the armor hold a saline solution containing specialized microorganisms, which absorb intense heat or Radiation.</p>
      <p><strong>Special:</strong> Microbe Armor provides Damage Reduction 2 against Energy and Fire damage. If you are using the Armor Upgrades options from Scum and Villainy, Microbe Armor has two Upgrade Slots.</p>`
  },
  {
    id: 'armor-stun-cloak',
    name: 'Stun Cloak',
    armorType: LIGHT,
    defenseBonus: 1,
    fortBonus: 0,
    maxDexBonus: 5,
    weight: 2,
    cost: 3500,
    availability: 'Licensed',
    sourcebook: 'Galaxy at War',
    description: `<p>This cloak is a Weapon as much as a form of protection. Lined with microfilaments attached to a power cell, the Stun Cloak can emit a powerful electric shock to any character who Grapples or Grabs, or is Grappled or Grabbed, by the wearer.</p>
      <p><strong>Special:</strong> If the wearer successfully makes a Grapple or Grab attack, or is successfully Grappled or Grabbed by an enemy, the Stun Cloak deals 3d8 points of Stun damage. The interior is insulated to prevent accidental shocks to the wearer.</p>`
  },

  // LIGHT ARMOR - Web Enhancements
  {
    id: 'armor-light-pressure-suit',
    name: 'Light Pressure Suit',
    armorType: LIGHT,
    defenseBonus: 5,
    fortBonus: 2,
    maxDexBonus: 3,
    weight: 10,
    cost: 4000,
    availability: 'Rare',
    sourcebook: 'Web Enhancements',
    description: `<p>Although not their intended purpose, Pressure Suits can protect a non-Skakoan from the harmful effects of Skako's dense, oxygen-poor atmosphere. All Pressure Suits incorporate a vocalizer that distorts the wearer's speech patterns, making it difficult to tell one suit-wearing Skakoan from another.</p>
      <p><strong>Special:</strong> Reduces the wearer's Speed by 2 Squares.</p>`
  },

  // ENERGY SHIELDS - Knights of the Old Republic Campaign Guide
  // Note: Energy Shields are special - they provide Shield Rating (SR) instead of armor bonus
  // They only protect against Energy damage and must be activated as a Swift Action
  {
    id: 'armor-energy-shield-sr5',
    name: 'Energy Shield (SR 5)',
    armorType: LIGHT,
    defenseBonus: 0, // Energy shields don't provide armor bonus - they provide Shield Rating
    fortBonus: 0,
    maxDexBonus: 4,
    weight: 1,
    cost: 500,
    availability: 'Standard',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Energy Shields project a thin layer of shielding over an individual character. This shield provides a Shield Rating of 5.</p>
      <p><strong>Special:</strong> Must be activated as a Swift Action. Has 5 charges, can only be activated once per encounter. Only protects against Energy damage. Does not reduce speed. While activated, imposes armor check penalty but does not reduce speed like normal Light Armor.</p>`
  },
  {
    id: 'armor-energy-shield-sr10',
    name: 'Energy Shield (SR 10)',
    armorType: LIGHT,
    defenseBonus: 0,
    fortBonus: 0,
    maxDexBonus: 4,
    weight: 1,
    cost: 2000,
    availability: 'Standard',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Energy Shields project a thin layer of shielding over an individual character. This shield provides a Shield Rating of 10.</p>
      <p><strong>Special:</strong> Must be activated as a Swift Action. Has 5 charges, can only be activated once per encounter. Only protects against Energy damage. Does not reduce speed.</p>`
  },
  {
    id: 'armor-energy-shield-sr15',
    name: 'Energy Shield (SR 15)',
    armorType: MEDIUM,
    defenseBonus: 0,
    fortBonus: 0,
    maxDexBonus: 3,
    weight: 1,
    cost: 4500,
    availability: 'Standard',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Energy Shields project a thin layer of shielding over an individual character. This shield provides a Shield Rating of 15.</p>
      <p><strong>Special:</strong> Must be activated as a Swift Action. Has 5 charges, can only be activated once per encounter. Only protects against Energy damage. Does not reduce speed (unlike normal Medium Armor).</p>`
  },
  {
    id: 'armor-energy-shield-sr20',
    name: 'Energy Shield (SR 20)',
    armorType: MEDIUM,
    defenseBonus: 0,
    fortBonus: 0,
    maxDexBonus: 3,
    weight: 1,
    cost: 8000,
    availability: 'Standard',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Energy Shields project a thin layer of shielding over an individual character. This shield provides a Shield Rating of 20.</p>
      <p><strong>Special:</strong> Must be activated as a Swift Action. Has 5 charges, can only be activated once per encounter. Only protects against Energy damage. Does not reduce speed (unlike normal Medium Armor).</p>`
  },
  {
    id: 'armor-energy-shield-sr25',
    name: 'Energy Shield (SR 25)',
    armorType: HEAVY,
    defenseBonus: 0,
    fortBonus: 0,
    maxDexBonus: 2,
    weight: 1,
    cost: 12500,
    availability: 'Standard',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Energy Shields project a thin layer of shielding over an individual character. This shield provides a Shield Rating of 25.</p>
      <p><strong>Special:</strong> Must be activated as a Swift Action. Has 5 charges, can only be activated once per encounter. Only protects against Energy damage. Does not reduce speed (unlike normal Heavy Armor).</p>`
  },
  {
    id: 'armor-energy-shield-sr30',
    name: 'Energy Shield (SR 30)',
    armorType: HEAVY,
    defenseBonus: 0,
    fortBonus: 0,
    maxDexBonus: 2,
    weight: 1,
    cost: 18000,
    availability: 'Standard',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>Energy Shields project a thin layer of shielding over an individual character. This shield provides a Shield Rating of 30.</p>
      <p><strong>Special:</strong> Must be activated as a Swift Action. Has 5 charges, can only be activated once per encounter. Only protects against Energy damage. Does not reduce speed (unlike normal Heavy Armor).</p>`
  },
];

/**
 * Generate a Foundry VTT pack entry for armor
 */
function generateArmorEntry(armor) {
  const props = ARMOR_PROPERTIES[armor.armorType];

  return {
    _id: armor.id,
    name: armor.name,
    type: 'armor',
    img: 'icons/svg/shield.svg',
    system: {
      armorType: armor.armorType,
      defenseBonus: armor.defenseBonus,
      maxDexBonus: armor.maxDexBonus,
      armorCheckPenalty: props.checkPenalty,
      fortBonus: armor.fortBonus,
      speedPenalty: props.speedPenalty,
      weight: armor.weight,
      cost: armor.cost,
      equipped: false,
      description: armor.description,
      // Additional metadata
      sourcebook: armor.sourcebook,
      availability: armor.availability
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: {
      default: 0
    },
    flags: {}
  };
}

/**
 * Main function to rebuild armor.db
 */
function rebuildArmorPack() {
  const packPath = path.join(__dirname, '..', 'packs', 'armor.db');

  // Generate all armor entries
  const entries = armorData.map(armor => generateArmorEntry(armor));

  // Convert to NDJSON format (one JSON object per line)
  const ndjson = entries.map(entry => JSON.stringify(entry)).join('\n');

  // Write to file
  fs.writeFileSync(packPath, ndjson + '\n', 'utf8');

  console.log(`✓ Successfully rebuilt armor.db with ${entries.length} armor entries`);
  console.log(`  - Light armor: ${entries.filter(e => e.system.armorType === 'light').length}`);
  console.log(`  - Medium armor: ${entries.filter(e => e.system.armorType === 'medium').length}`);
  console.log(`  - Heavy armor: ${entries.filter(e => e.system.armorType === 'heavy').length}`);
}

// Run the script
try {
  rebuildArmorPack();
} catch (error) {
  console.error('Error rebuilding armor pack:', error);
  process.exit(1);
}
