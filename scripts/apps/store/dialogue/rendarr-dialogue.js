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
    "Step on in! Everything's for sale, nothing's refundable!",
    "I've got what you need, guaranteed—for the right price!",
    "Come to browse or ready to spend? Either way, you're in luck!",
    "Welcome, welcome! My shelves have everything your heart desires!"
  ],

  /* ---------------------------------------------------- */
  /* GM PANEL                                              */
  /* ---------------------------------------------------- */

  gm: [
    "Ah, the Boss is here! Touch nothing, break nothing… or break EVERYTHING.",
    "GM detected! Everybody act natural!",
    "The one who controls reality itself! Need a discount? No? Shame.",
    "Adjusting store settings, eh? Try not to break the economy.",
    "Behold—the GM Tab! Where universes are balanced… poorly.",
    "Careful in there—that's where the real power lives!",
    "The Master of Fate arrives! Time to tweak some numbers?"
  ],

  /* ---------------------------------------------------- */
  /* WHEN PLAYER HAS NO CREDITS                           */
  /* ---------------------------------------------------- */

  broke: [
    "No credits? Tough galaxy out there, lad.",
    "Browsing is free—buying less so.",
    "Empty pockets? Happens. Mostly to adventurers.",
    "No credits? Don't worry, looking is still allowed.",
    "Ah, running on fumes, eh? Can't blame you—adventure's expensive!",
    "Fresh out of funds? Stop back when you've found some treasure!",
    "No shame in window shopping! Come back when the credits flow!"
  ],

  /* ---------------------------------------------------- */
  /* HIGH-COST PURCHASES                                  */
  /* ---------------------------------------------------- */

  big_purchase: [
    "Now THAT'S a hefty transaction! Music to my ears!",
    "Oho! Someone's loaded today!",
    "Your wallet felt that one. I certainly enjoyed it!",
    "You'll remember this one. Your accountant will too.",
    "Big spender! I like your style.",
    "Credits like that don't come around every day! Excellent!",
    "A purchase of that magnitude? Now THAT'S business!"
  ],

  /* ---------------------------------------------------- */
  /* CATEGORY LINES                                       */
  /* ---------------------------------------------------- */

  weapons: [
    "Looking for firepower? My favorite kind of customer!",
    "Weapons galore! Try not to point anything at ME this time.",
    "Blasters, blades, explosives—everything fun and mildly illegal!",
    "Nothing says 'hello' like a well-aimed blaster bolt!",
    "Quality steel and plasma! You've got excellent taste!",
    "The finest armaments this side of the Outer Rim!"
  ],

  armor: [
    "Armor! Nothing beats not dying.",
    "Durasteel fashion—achieve the bulky look!",
    "Protection first… shopping second… survival third.",
    "Smart thinking—can't spend credits if you're dead!",
    "Ah, the cautious type! I like that in a customer!",
    "Nothing wrong with a little extra protection these days!"
  ],

  medical: [
    "Medical supplies! For mistakes—past, present, future.",
    "Healing gear—buy it BEFORE you need it!",
    "Medpacs! Just in case you lose a limb or three.",
    "Wise investment! Can't adventure while injured!",
    "These'll keep you in one piece. Trust me!",
    "Medical supplies—the responsible adventurer's best friend!"
  ],

  tech: [
    "Tech gear! If it lights up or explodes—it's here.",
    "Datapads, scanners, slicer tools—dangerous AND overpriced!",
    "Careful—some of this tech still has a personality.",
    "Ah, a tech enthusiast! Gadgets for every occasion!",
    "Technology—the civilized person's solution to everything!",
    "These beauties can get you out of all sorts of trouble!"
  ],

  tools: [
    "Tools! Fix things, break things… same tools really.",
    "Every engineer starts with debt and a toolkit.",
    "Tools for tinkering, repairing, or voiding warranties.",
    "Ah, a practical soul! I appreciate that!",
    "Quality tools for quality work!",
    "Every good technician needs gear like this!"
  ],

  survival: [
    "Survival gear! For when nature tries to kill you.",
    "Planning something foolish outdoors? Excellent.",
    "Hope you're ready to rough it. This gear helps. Slightly.",
    "The wilds are unforgiving—but this gear helps!",
    "Nothing quite like being prepared for disaster!",
    "Adventure gear for the bold and foolhardy!"
  ],

  security: [
    "Security gear! Keep things OUT. Or IN. No judgment.",
    "Locks, restraints—fun for the whole family!",
    "Hope you've got permits… I certainly don't.",
    "Good locks make good neighbors. Angry but good!",
    "Restraints, locks, locks, restraints—good times!",
    "Keep your valuables safe with this selection!"
  ],

  equipment: [
    "General gear—boring until you desperately need it.",
    "Miscellaneous essentials! You'll thank me later.",
    "If you don't know what you need—it's this aisle.",
    "The backbone of any adventurer's kit!",
    "Practical necessities for the prepared traveler!",
    "These essentials are worth more than you'd think!"
  ],

  droids: [
    "Droids! Loyal, hardworking, occasionally homicidal!",
    "Mechanical companions—cheaper than real friends!",
    "Buy a droid today! Or two—they gossip.",
    "Looking for a mechanical helper? Excellent choice!",
    "Droids—tireless, efficient, and never complain!",
    "Get yourself a droid and never look back!"
  ],

  vehicles: [
    "Vehicles! Because walking is a sign of failure.",
    "Speeders, swoops, starships—if it moves, I sell it.",
    "Buy new or used! Both explode eventually.",
    "Ready to get off your feet? I've got wheels!",
    "Nothing beats personal transportation!",
    "Speeders and starships for the mobile adventurer!"
  ],

  services: [
    "Services! Meals, lodging, medical care—adventuring ain't cheap.",
    "Need a ride? Need a meal? Need alibis? We got options!",
    "Services—because not all gear is physical.",
    "Need someone to fix it? I know a guy!",
    "Professional services for the professional adventurer!",
    "Can't do everything yourself—let me help!"
  ],

  cart: [
    "Checking your cart? Good—don't remove anything expensive.",
    "Ah, reviewing purchases—the best part of my day!",
    "Everything in that cart looks fantastic! Especially the pricey ones.",
    "Fine selection in there!",
    "That's a quality haul you're building!",
    "Ready to commit, or just window shopping?"
  ],

  purchase: [
    "Pleasure doing business!",
    "Credits well spent, lad!",
    "Fine purchase! Try not to break it immediately.",
    "Your new gear awaits! Don't let it down.",
    "Excellent choice! You won't regret it!",
    "Sold! May your adventure be legendary!"
  ],

  /* ---------------------------------------------------- */
  /* WEAPON SUBTYPES                                      */
  /* ---------------------------------------------------- */

  pistols: [
    "Pistols—stylish, compact, and surprisingly loud.",
    "Need a sidearm? These beauties never disappoint!",
    "Perfect for intimidation or last-second regrets.",
    "Reliable, accurate, and fits in your holster!",
    "A good pistol saves the day more often than you'd think!",
    "Compact firepower at its finest!"
  ],

  rifles: [
    "Rifles—because long-range problems deserve long-range solutions!",
    "Nothing beats a rifle. Except a bigger rifle.",
    "Good accuracy, good power, good times.",
    "For when you need precision at distance!",
    "Rifles: the thinking person's weapon!",
    "Long-range dominance, guaranteed!"
  ],

  heavy_weapons: [
    "Heavy weapons! Please sign the explosive liability waiver.",
    "Boom-makers! Wall-breakers! Session-enders!",
    "Handle with care. Or don't—your funeral.",
    "When subtlety is overrated—use these!",
    "Big explosions for big problems!",
    "Warning: may destroy property and sanity!"
  ],

  melee_simple: [
    "Simple melee weapons—classic and reliable!",
    "Good old fashioned hitting sticks!",
    "When in doubt—swing!",
    "Timeless. Effective. Never goes out of style.",
    "Sometimes you can't beat good ol' physics and steel!",
    "Simple, brutal, and honest!"
  ],

  melee_advanced: [
    "Advanced melee—sharp, shiny, overengineered!",
    "Fancy gear for fancy fighters!",
    "Cuts cleaner than my accountant's insults.",
    "Engineering meets combat in beautiful ways!",
    "For those who fight with style AND substance!",
    "Advanced tech, superior performance!"
  ],

  melee_lightsaber: [
    "Lightsabers! Elegant, deadly, limb-lossy!",
    "Careful—these cut through EVERYTHING.",
    "Not responsible for accidental amputations!",
    "The weapon of legends—yours to wield!",
    "Fair warning: these are NOT toys!",
    "Pure energy, pure power, pure awesome!"
  ],

  melee_exotic: [
    "Exotic melee—why be normal?",
    "Whips, nets, weird weapons—true style!",
    "Rare, dangerous, probably illegal.",
    "Stand out from the crowd with style!",
    "Unconventional weapons for unconventional fighters!",
    "Weird, wonderful, and incredibly effective!"
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
