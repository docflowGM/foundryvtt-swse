/**
 * rendarr-dialogue.js
 * -------------------
 * Consolidated Rendarr Dialogue System
 * All dialogue + all logic in one file.
 *
 * Features:
 *  - Category-specific lines
 *  - Weapon subtype lines
 *  - Special GM panel lines
 *  - "Broke player" detection
 *  - "Big purchase" detection
 *  - Smart selector function
 */

export const RENDARR_LINES = {

  /* ---------------------------------------------------- */
  /* GENERAL / DEFAULT                                     */
  /* ---------------------------------------------------- */

  welcome: [
    "Welcome to the Galactic Marketplace, lad!",
    "Ahh, returning customer? Or new blood? Either way—welcome!",
    "Step on in! Everything's for sale, nothing's refundable!"
  ],

  /* ---------------------------------------------------- */
  /* GM PANEL                                              */
  /* ---------------------------------------------------- */

  gm: [
    "Ah, the Boss is here! Touch nothing, break nothing… or break EVERYTHING.",
    "GM detected! Everybody act natural!",
    "The one who controls reality itself! Need a discount? No? Shame.",
    "Adjusting store settings, eh? Try not to break the economy.",
    "Behold—the GM Tab! Where universes are balanced… poorly."
  ],

  /* ---------------------------------------------------- */
  /* WHEN PLAYER HAS NO CREDITS                           */
  /* ---------------------------------------------------- */

  broke: [
    "No credits? Tough galaxy out there, lad.",
    "Browsing is free—buying less so.",
    "Empty pockets? Happens. Mostly to adventurers.",
    "No credits? Don't worry, looking is still allowed."
  ],

  /* ---------------------------------------------------- */
  /* HIGH-COST PURCHASES                                  */
  /* ---------------------------------------------------- */

  big_purchase: [
    "Now THAT'S a hefty transaction! Music to my ears!",
    "Oho! Someone's loaded today!",
    "Your wallet felt that one. I certainly enjoyed it!",
    "You'll remember this one. Your accountant will too.",
    "Big spender! I like your style."
  ],

  /* ---------------------------------------------------- */
  /* CATEGORY LINES                                       */
  /* ---------------------------------------------------- */

  weapons: [
    "Looking for firepower? My favorite kind of customer!",
    "Weapons galore! Try not to point anything at ME this time.",
    "Blasters, blades, explosives—everything fun and mildly illegal!"
  ],

  armor: [
    "Armor! Nothing beats not dying.",
    "Durasteel fashion—achieve the bulky look!",
    "Protection first… shopping second… survival third."
  ],

  medical: [
    "Medical supplies! For mistakes—past, present, future.",
    "Healing gear—buy it BEFORE you need it!",
    "Medpacs! Just in case you lose a limb or three."
  ],

  tech: [
    "Tech gear! If it lights up or explodes—it's here.",
    "Datapads, scanners, slicer tools—dangerous AND overpriced!",
    "Careful—some of this tech still has a personality."
  ],

  tools: [
    "Tools! Fix things, break things… same tools really.",
    "Every engineer starts with debt and a toolkit.",
    "Tools for tinkering, repairing, or voiding warranties."
  ],

  survival: [
    "Survival gear! For when nature tries to kill you.",
    "Planning something foolish outdoors? Excellent.",
    "Hope you're ready to rough it. This gear helps. Slightly."
  ],

  security: [
    "Security gear! Keep things OUT. Or IN. No judgment.",
    "Locks, restraints—fun for the whole family!",
    "Hope you've got permits… I certainly don't."
  ],

  equipment: [
    "General gear—boring until you desperately need it.",
    "Miscellaneous essentials! You'll thank me later.",
    "If you don't know what you need—it's this aisle."
  ],

  droids: [
    "Droids! Loyal, hardworking, occasionally homicidal!",
    "Mechanical companions—cheaper than real friends!",
    "Buy a droid today! Or two—they gossip."
  ],

  vehicles: [
    "Vehicles! Because walking is a sign of failure.",
    "Speeders, swoops, starships—if it moves, I sell it.",
    "Buy new or used! Both explode eventually."
  ],

  services: [
    "Services! Meals, lodging, medical care—adventuring ain't cheap.",
    "Need a ride? Need a meal? Need alibis? We got options!",
    "Services—because not all gear is physical."
  ],

  cart: [
    "Checking your cart? Good—don't remove anything expensive.",
    "Ah, reviewing purchases—the best part of my day!",
    "Everything in that cart looks fantastic! Especially the pricey ones."
  ],

  purchase: [
    "Pleasure doing business!",
    "Credits well spent, lad!",
    "Fine purchase! Try not to break it immediately.",
    "Your new gear awaits! Don't let it down."
  ],

  /* ---------------------------------------------------- */
  /* WEAPON SUBTYPES                                      */
  /* ---------------------------------------------------- */

  pistols: [
    "Pistols—stylish, compact, and surprisingly loud.",
    "Need a sidearm? These beauties never disappoint!",
    "Perfect for intimidation or last-second regrets."
  ],

  rifles: [
    "Rifles—because long-range problems deserve long-range solutions!",
    "Nothing beats a rifle. Except a bigger rifle.",
    "Good accuracy, good power, good times."
  ],

  heavy_weapons: [
    "Heavy weapons! Please sign the explosive liability waiver.",
    "Boom-makers! Wall-breakers! Session-enders!",
    "Handle with care. Or don't—your funeral."
  ],

  melee_simple: [
    "Simple melee weapons—classic and reliable!",
    "Good old fashioned hitting sticks!",
    "When in doubt—swing!"
  ],

  melee_advanced: [
    "Advanced melee—sharp, shiny, overengineered!",
    "Fancy gear for fancy fighters!",
    "Cuts cleaner than my accountant's insults."
  ],

  melee_lightsaber: [
    "Lightsabers! Elegant, deadly, limb-lossy!",
    "Careful—these cut through EVERYTHING.",
    "Not responsible for accidental amputations!"
  ],

  melee_exotic: [
    "Exotic melee—why be normal?",
    "Whips, nets, weird weapons—true style!",
    "Rare, dangerous, probably illegal."
  ]
};


/* -------------------------------------------------------- */
/* SMART SELECTOR                                            */
/* -------------------------------------------------------- */

/**
 * Get Rendarr dialogue line based on context and options.
 *
 * @param {string} context - Main category (weapons, armor, etc.)
 * @param {object} options - Configuration object
 *   - subtype: weapon subtype (Pistols, Rifles, etc.)
 *   - isGMPanel: true if GM tab active
 *   - isBroke: true if player has no credits
 *   - bigPurchase: true if purchase > threshold
 * @returns {string} Random dialogue line
 */
export function getRendarrLine(context = "welcome", {
  subtype = null,
  isGMPanel = false,
  isBroke = false,
  bigPurchase = false
} = {}) {

  /* GM mode override */
  if (isGMPanel) {
    const list = RENDARR_LINES["gm"];
    return list[Math.floor(Math.random() * list.length)];
  }

  /* Broke player override */
  if (isBroke) {
    const list = RENDARR_LINES["broke"];
    return list[Math.floor(Math.random() * list.length)];
  }

  /* Big purchase override */
  if (bigPurchase) {
    const list = RENDARR_LINES["big_purchase"];
    return list[Math.floor(Math.random() * list.length)];
  }

  /* Weapon subtype override */
  if (context === "weapons" && subtype) {
    const subKey = {
      "Pistols": "pistols",
      "Rifles": "rifles",
      "Heavy Weapons": "heavy_weapons",
      "Simple Melee": "melee_simple",
      "Advanced Melee": "melee_advanced",
      "Lightsabers": "melee_lightsaber",
      "Exotic Melee": "melee_exotic"
    }[subtype];

    if (subKey && RENDARR_LINES[subKey]) {
      const s = RENDARR_LINES[subKey];
      return s[Math.floor(Math.random() * s.length)];
    }
  }

  /* Normal category lines */
  const list = RENDARR_LINES[context] || RENDARR_LINES["welcome"];
  return list[Math.floor(Math.random() * list.length)];
}
