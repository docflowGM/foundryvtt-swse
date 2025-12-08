/**
 * store-shared.js - Hardened helpers and Rendarr dialogue
 *
 * Defensive helpers:
 * - normalizeNumber / getCostValue / getCostDisplay
 * - safeString / safeImg / safeSystem
 * - tryRender / isValidItemForStore
 *
 * Also contains Rendarr dialogue and utility helpers for categorization/sorting.
 */

export function normalizeNumber(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object") {
    if ("value" in value) return normalizeNumber(value.value);
    return null;
  }
  const s = String(value).trim();
  if (s.length === 0) return null;
  const lower = s.toLowerCase();
  const placeholders = ["varies","see","negotiat","included","—","-","n/a","na","unknown","special"];
  for (const p of placeholders) if (lower.includes(p)) return null;
  let cleaned = s.replace(/[,¢$€£₹]/g,"");
  cleaned = cleaned.replace(/\s*cr\b/i,"");
  cleaned = cleaned.replace(/\(.+\)/g,"");
  cleaned = cleaned.replace(/[^\d.\-]/g,"");
  if (cleaned === "" || cleaned === "-" || cleaned === "—") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function getCostValue(item) {
  if (!item) return null;
  const sys = safeSystem(item);
  if (!sys) return null;
  const maybe = sys.cost ?? sys.price ?? item.cost ?? null;
  return normalizeNumber(maybe);
}

export function getCostDisplay(item, opts={}) {
  const currencySuffix = opts.suffix ?? " cr";
  const sys = safeSystem(item);
  const rawSource = sys ? (sys.cost ?? sys.price ?? item.cost ?? null) : (item?.cost ?? null);
  const num = getCostValue(item);
  if (num !== null) {
    try { return num.toLocaleString() + currencySuffix; } catch(e) { return String(num) + currencySuffix; }
  }
  if (rawSource === undefined || rawSource === null || String(rawSource).trim() === "") return "—";
  return String(rawSource).trim();
}

export function safeString(value, fallback="") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

export function safeImg(item) {
  if (!item) return "icons/svg/mystery-man.svg";
  if (typeof item.img === "string" && item.img.trim().length>0) return item.img;
  const sys = safeSystem(item);
  if (sys && typeof sys.img === "string" && sys.img.trim().length>0) return sys.img;
  return "icons/svg/mystery-man.svg";
}

export function safeSystem(item) {
  if (!item || typeof item !== "object") return null;
  const sys = item.system ?? item.data ?? null;
  if (!sys || typeof sys !== "object") return null;
  return sys;
}

export function tryRender(fn, context="store") {
  try { return fn(); } catch(err) { swseLogger.error(`SWSE Store (${context}) — render error:`, err); return null; }
}

export function isValidItemForStore(item) {
  if (!item) return false;
  if (!safeSystem(item) && (!item.name || item.name.trim()==="")) return false;
  if (item.flags && item.flags.swse && item.flags.swse.excludeFromStore) return false;
  return true;
}

/* ---------------- RENDARR DIALOGUE (preserved) ---------------- */

export function getRendarrDialogue() {
    return {
        weapons: [
            "Ah, looking for something with a bit of kick, are we? I've got just the thing!",
            "Weapons! Now we're talking! Nothing says 'hello' like a well-aimed blaster bolt!",
            "You've got good taste, lad! These beauties never let you down!",
            "Excellent choice! Though I hope you won't be pointing any of these at me, eh?",
            "The finest armaments this side of the Core Worlds, I assure you!",
            "A weapon is only as good as the person wielding it... but these are VERY good!",
            "Now these'll make those scoundrels think twice before crossing you!",
            "Hah! I remember when I used to sling one of these myself. Good times!",
            "Quality craftsmanship! Not like those cheap knockoffs from Nar Shaddaa.",
            "You'll be the most well-armed customer I've had all week!",
            "These babies pack more punch than a Wookiee with a grudge!"
        ],
        armor: [
            "Smart thinking! Can't spend credits if you're dead, now can you?",
            "Armor! The difference between a close call and a funeral!",
            "Ah, the cautious type! I like that in a customer!",
            "Nothing wrong with a little extra protection, especially these days!",
            "These'll keep you in one piece! Trust me, I've seen the alternative!"
        ],
        grenades: [
            "Ah, for when you need to make a big impression! Very big!",
            "Explosives! Handle with care... or don't, I'm not responsible!",
            "Planning a party, are we? These'll really liven things up!"
        ],
        medical: [
            "Wise investment! Can't enjoy your purchases if you're dead!",
            "Medical supplies! For when things don't go according to plan!",
            "Ah, the responsible shopper! I like your style!"
        ],
        tech: [
            "Ah, a tech enthusiast! I've got gadgets that'll make your life easier!",
            "Technology! The civilized person's toolkit!",
            "These little beauties can get you out of all sorts of trouble!"
        ],
        tools: [
            "Tools! For when you need to fix things instead of destroying them!",
            "Ah, a practical soul! I appreciate that!",
            "Every good technician needs quality tools! And here they are!"
        ],
        survival: [
            "Planning a trip into the wilds? I admire your bad decisions.",
            "Survival gear—perfect for when everything inevitably goes wrong.",
            "I used this model once. Still got the scars."
        ],
        security: [
            "Security gear—keep others out, or keep yourself in. No judgment.",
            "Good locks make good neighbors. Angry neighbors, but still."
        ],
        equipment: [
            "General equipment aisle! The backbone of any adventurer.",
            "Boring? Maybe. Useful? Absolutely.",
            "This stuff keeps missions running. Heroes love to forget that part."
        ],
        droids: [
            "Droids! Loyal, tireless, and they never complain about working conditions!",
            "Ah, looking for a mechanical companion? Best decision you'll ever make!"
        ],
        vehicles: [
            "Vehicles! For when walking just won't cut it!",
            "Ah, shopping for wheels! Or repulsorlifts! Or hyperdrives!"
        ],
        services: [
            "Services! The necessities of civilized life!",
            "Ah, need something done? I know a guy. Or I *am* the guy."
        ],
        cart: [
            "Ah, reviewing your selections! Take your time, no rush!",
            "The cart! Where dreams become purchases!"
        ],
        gm: [
            "Ah, the GM controls! Changing the rules, are we?",
            "The secret back room! Don't tell the customers!"
        ],
        purchase: [
            "Excellent choice! You won't regret it!",
            "Sold! Pleasure doing business with you!"
        ],
        welcome: [
            "Welcome to my shop, lad! Spend to your heart's desire!",
            "Ah, a customer! Welcome! Everything's for sale!"
        ]
    };
}

export function getRandomDialogue(context) {
    const dialogues = getRendarrDialogue()[context];
    if (!dialogues || dialogues.length === 0) {
        return "I've got what you need, lad!";
    }
    return dialogues[Math.floor(Math.random() * dialogues.length)];
}

/* ---------------- Categorization / Sorting helpers ---------------- */

export function categorizeEquipment(item) {
    const name = (item?.name || "").toString().toLowerCase();
    const desc = (item?.system?.description || "").toString().toLowerCase();
    const text = name + " " + desc;
    if (text.includes("grenade") || text.includes("detonator")) return "grenades";
    if (text.includes("medpac") || text.includes("bacta")) return "medical";
    if (text.includes("comlink") || text.includes("datapad")) return "tech";
    if (text.includes("tool") || text.includes("kit")) return "tools";
    return "equipment";
}

export function sortWeapons(weapons) {
    // simple alphabetical fallback
    return weapons.sort((a,b) => (a.name || "").localeCompare(b.name || ""));
}

export function sortArmor(armors) {
    return armors.sort((a,b) => (a.name || "").localeCompare(b.name || ""));
}

export function getRarityClass(availability) {
    if (!availability) return null;
    const normalized = availability.toString().toLowerCase();
    if (normalized.includes('rare')) return 'rare';
    if (normalized.includes('illegal')) return 'illegal';
    if (normalized.includes('military')) return 'military';
    if (normalized.includes('restricted')) return 'restricted';
    return null;
}

export function getRarityLabel(rarityClass) {
    const labels = { 'rare': 'Rare', 'illegal': 'Illegal', 'military': 'Military', 'restricted': 'Restricted' };
    return labels[rarityClass] || '';
}
