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
  "welcome": [
    "Hey there! Welcome to the Galactic Marketplace, friend.",
    "Back for more, or is this your first visit? Either way, glad you’re here.",
    "Step right in! Everything’s for sale, just don’t expect me to take returns.",
    "Take a look around, there’s plenty here for curious eyes and eager hands.",
    "Welcome, welcome! My shelves are packed with all sorts of goodies."
  ],
  "gm": [
    "Ah, the Boss has arrived! Try not to break anything… or everything.",
    "GM spotted! Everyone, act natural… or don’t, your call.",
    "The one in charge of it all! No discounts though, I’m afraid.",
    "Tweaking the store settings, are we? Try to keep the economy in one piece.",
    "Here’s the GM Tab, where the universe gets fiddled with… carefully.",
    "Careful in there, that’s where the real power lives.",
    "Master of Fate, welcome! Don’t break too many things, alright?"
  ],
  "broke": [
    "No credits? Don’t worry, friend, it happens to the best of us.",
    "Looking around is free, spending is the tricky part.",
    "Empty pockets? Happens all the time to adventurers like you.",
    "Low on funds? That’s fine, browsing never hurt anyone.",
    "Ah, running light again, eh? Adventure’s expensive, come back when you find some credits."
  ],
  "big_purchase": [
    "Wow, that’s quite a haul! I like the way you spend.",
    "Someone’s feeling generous today! I approve.",
    "That’s a lot of credits moving, my friend. I enjoyed it!",
    "You won’t forget this purchase, and neither will your accountant.",
    "Big spender, huh? I like your style, keep it up!"
  ],
  "weapons": [
    "Looking for some firepower? You’re in the right place.",
    "Blasters, blades, explosives… I’ve got a little bit of everything.",
    "Careful with these, but fun? Absolutely.",
    "Nothing like a good weapon to get you out of trouble.",
    "Quality gear here, ready for action when you are."
  ],
  "armor": [
    "Armor, always a smart choice. Can’t spend credits if you’re in a medbay.",
    "Durasteel fashion, protective and, well, stylish enough.",
    "Extra protection never hurt anyone, trust me.",
    "Safety first, friend. Armor helps with that.",
    "You’ll be glad you grabbed this when things get rough out there."
  ],
  "medical": [
    "Medkits! Keep these handy, just in case.",
    "Healing gear now saves headaches later.",
    "You’ll want these if you plan on leaving in one piece.",
    "Wise move stocking up, injuries happen fast.",
    "Better safe than sorry, friend. Keep these ready."
  ],
  "tech": [
    "Tech gear! Gadgets, gizmos, and things that buzz.",
    "Datapads, scanners, slicer tools… all slightly risky, all worth it.",
    "Some of this tech might explode. In a fun way, mostly.",
    "These tools can save you or get you noticed… choose wisely.",
    "A little tech goes a long way, especially when it works."
  ],
  "tools": [
    "Tools, for fixing, breaking, and everything in between.",
    "Every engineer starts with debt and a trusty toolkit.",
    "Repair, tinker, experiment—these tools cover it all.",
    "Ah, practical hands! I like customers who know their way around tools.",
    "Good gear for good work, simple as that."
  ],
  "survival": [
    "Survival gear! Because the galaxy doesn’t go easy on anyone.",
    "Planning something outdoorsy? You’ll want this.",
    "Roughing it is easier with the right equipment.",
    "The wilds are harsh, but this gear gives you a fighting chance.",
    "For the bold and slightly reckless, this is the stuff you need."
  ],
  "security": [
    "Security gear! Keep things in, or keep things out, your call.",
    "Locks, restraints, all the fun stuff.",
    "No permits? Don’t worry, I won’t tell.",
    "Good locks make good neighbors, or at least keep them honest.",
    "Keep your valuables safe, that’s my advice."
  ],
  "equipment": [
    "General gear, nothing flashy but you’ll thank me for it.",
    "Miscellaneous essentials, you never know when they’ll save you.",
    "Not sure what you need? Start here.",
    "Every adventurer should have a few basics, and this is it.",
    "Simple, practical, useful—these are the things that matter."
  ],
  "droids": [
    "Droids! Loyal, hardworking, occasionally unpredictable.",
    "Mechanical companions, cheaper than real friends, and usually less talkative.",
    "Grab a droid today, or two, they tend to gossip a bit.",
    "Need a helper? These guys work tirelessly.",
    "Droids, the kind of friends who don’t complain… much."
  ],
  "vehicles": [
    "Vehicles! Walking is overrated anyway.",
    "Speeders, swoops, starships… anything that moves, I’ve got it.",
    "Buy new, buy used, just don’t crash it too soon.",
    "Ready to move fast? I’ve got you covered.",
    "The quicker you go, the better the adventure feels."
  ],
  "services": [
    "Services! Food, lodging, repairs, and a bit of everything else.",
    "Need a lift, a meal, or maybe a favor? I’ve got options.",
    "Not all gear comes in a box, services help too.",
    "Need something fixed? I know a guy for that.",
    "Professional help for the professional adventurer, that’s me."
  ],
  "cart": [
    "Checking your cart? Looks good to me.",
    "That’s a nice selection you’ve got there.",
    "Everything in that cart looks ready for adventure.",
    "About to commit, or just browsing for now?",
    "Quality haul, friend, can’t argue with that."
  ],
  "purchase": [
    "Credits well spent, my friend.",
    "Your new gear is ready, treat it well.",
    "Pleasure doing business with you, come back soon.",
    "Nice choice, don’t break it right away.",
    "You won’t regret that purchase.",
    "Sold! Here’s to your next adventure being a good one."
  ],
  "pistols": [
    "Pistols, small, handy, and loud enough to get attention.",
    "Looking for a sidearm? These won’t let you down.",
    "Great for intimidation, or when you need a last-second save.",
    "Reliable, accurate, and fits right in your holster.",
    "A solid pistol can make all the difference.",
    "Compact, powerful, and ready to go."
  ],
  "rifles": [
    "Rifles, perfect for problems at a distance.",
    "Nothing beats a good rifle, except maybe a bigger one.",
    "Accurate, powerful, and dependable.",
    "For when you want precision from afar.",
    "Rifles, the tool for the careful and clever.",
    "Long-range and ready for action."
  ],
  "heavy_weapons": [
    "Heavy weapons, handle with care… or don’t, your call.",
    "Boom-makers and wall-breakers, the fun stuff.",
    "Big explosions, bigger problems, right here.",
    "Subtlety is overrated, go ahead and make some noise.",
    "Warning: these may destroy property, sanity, or both."
  ],
  "melee_simple": [
    "Simple melee weapons, classic and reliable.",
    "Good old fashioned hitting sticks.",
    "When in doubt, just swing.",
    "Timeless, effective, never fails.",
    "Sometimes you just need a solid piece of steel.",
    "Simple, brutal, and honest."
  ],
  "melee_advanced": [
    "Advanced melee, sharp, shiny, and a bit fancy.",
    "Gear for fighters who like a touch of style.",
    "Cuts cleaner than my accountant’s insults.",
    "Engineering and combat meet right here.",
    "For those who fight with flair and substance.",
    "High-tech, high-performance, ready for action."
  ],
  "melee_lightsaber": [
    "Lightsabers! Elegant, deadly, and dramatic.",
    "Careful, these cut through everything.",
    "Not responsible for accidental amputations.",
    "The weapon of legends, now in your hands.",
    "Fair warning, these are not toys.",
    "Pure energy, pure power, pure chaos."
  ],
  "melee_exotic": [
    "Exotic melee? Now we’re talking.",
    "Whips, nets, oddities… stylish *and* dangerous.",
    "Rare, risky, and probably questionable in most ports.",
    "If you want normal, you’re in the wrong aisle.",
    "Unusual weapons for unusual problems."
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
