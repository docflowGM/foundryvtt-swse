/**
 * Feat Icon Resolver
 *
 * Centralizes progression feat icon lookup against the curated assets/feats
 * directory. Exact name matches win; otherwise a conservative token/substring
 * matcher picks a close sibling icon so detail rails and browser cards do not
 * render empty when compendium feat names drift from asset filenames.
 */

const FEAT_ICON_ROOT = 'systems/foundryvtt-swse/assets/feats/';

const FEAT_ICON_FILES = [
  "Accelerated Strike.png",
  "Acrobatic Ally.png",
  "Acrobatic Dodge.png",
  "Acrobatic Strike.png",
  "Adaptable Talent.png",
  "Advantageous Attack.png",
  "Advantageous Cover.png",
  "Aiming Accuracy.png",
  "Ample Foraging.png",
  "Angled Throw.png",
  "Anointed Hunter.png",
  "Armor Proficiency (Heavy).png",
  "Armor Proficiency (Light).png",
  "Armor Proficiency (Medium).png",
  "Artillery Shot.png",
  "Assured Attack.png",
  "Attack Combo (Fire and Strike).png",
  "Attack Combo (Melee).png",
  "Attack Combo (Ranged).png",
  "Autofire Assault.png",
  "Autofire Sweep.png",
  "Bad Feeling.png",
  "Bantha Herder.png",
  "Bantha Rush.png",
  "Battering Attack.png",
  "Battle Meditation.png",
  "Binary Mind.png",
  "Biotech Specialist.png",
  "Biotech Surgery.png",
  "Blaster Barrage.png",
  "Block.png",
  "Bone Crusher.png",
  "Bothan Will.png",
  "Bowcaster Marksman.png",
  "Brillant Defense.png",
  "Brink of Death.png",
  "Burst Fire.png",
  "Burst of Speed.png",
  "Careful Shot.png",
  "Channel Rage.png",
  "Charging Fire.png",
  "Clawed Subspecies.png",
  "Cleave.png",
  "Close Combat Escape.png",
  "Collateral Damage.png",
  "Combat Reflexes.png",
  "Combat Trickery.png",
  "Conditioned.png",
  "Conditioning.png",
  "Confident Success.png",
  "Controlled Rage.png",
  "Coordinated Attack.png",
  "Coordinated Barrage.png",
  "Cornered.png",
  "Critical Strike.png",
  "Crossfire.png",
  "Crush.png",
  "Cunning Attack.png",
  "Cut the Red Tape.png",
  "Cybernetic Surgery.png",
  "Damage Conversion.png",
  "Darkness Dweller.png",
  "Deadeye.png",
  "Deadly Sniper.png",
  "Deceptive Drop.png",
  "Deep Sight.png",
  "Deflect.png",
  "Deft Charge.png",
  "Delay Damage.png",
  "Demoralizing Strike.png",
  "Desperate Gambit.png",
  "Destructive Force.png",
  "Devastating Bellow.png",
  "Disabler.png",
  "Disarming Charm.png",
  "Distracting Droid.png",
  "Disturbing Presence.png",
  "Dive for Cover.png",
  "Dodge.png",
  "Double Attack.png",
  "Dreadful Countenance.png",
  "Dreadful Rage.png",
  "Droid Focus.png",
  "Droid Hunter.png",
  "Droid Shield Mastery.png",
  "Dual Weapon Mastery.png",
  "Duck and Cover.png",
  "Elder's Knowledge.png",
  "Elusive Target.png",
  "Erattic Target.png",
  "Experienced Medic.png",
  "Expert Briber.png",
  "Expert Droid Repair .png",
  "Extra Rage.png",
  "Extra Second Wind.png",
  "Far Shot.png",
  "Fast Surge.png",
  "Fast Swimmer.png",
  "Fast Talker.png",
  "Fatal Hit.png",
  "Feat of Strength.png",
  "Fight Through Pain.png",
  "Flash and Clear.png",
  "Flawless Pilot.png",
  "Fleche.png",
  "Fleet-Footed.png",
  "Flood of Fire.png",
  "Flurry.png",
  "Focused Rage.png",
  "Follow Through.png",
  "Force Boon.png",
  "Force Focus.png",
  "Force Readiness.png",
  "Force Regimen Mastery.png",
  "Force Sensitive.png",
  "Force Training.png",
  "Force of Personality.png",
  "Forceful Blast.png",
  "Forceful Grip.png",
  "Forceful Recovery.png",
  "Forceful Saber Throw.png",
  "Forceful Slam.png",
  "Forceful Strike.png",
  "Forceful Stun.png",
  "Forceful Telekinesis.png",
  "Forceful Throw.png",
  "Forceful Vitality.png",
  "Forceful Warrior.png",
  "Forceful Weapon.png",
  "Forceful Will.png",
  "Forest Stalker.png",
  "Fortifying Recovery.png",
  "Friendly Fire Avoidance.png",
  "Friends in Low Places.png",
  "Frightening Cleave.png",
  "Frightening Presence.png",
  "Fringe Benefits.png",
  "Gearhead.png",
  "Grab Back.png",
  "Grapple Resistance.png",
  "Grappling Strike.png",
  "Grazing Shot.png",
  "Great Fortitude.png",
  "Gungan Weapon Master.png",
  "Gunnery Specialist.png",
  "Halt.png",
  "Hard Target.png",
  "Harm's Way.png",
  "Headstrong.png",
  "Heavy Hitter.png",
  "Heroic Surge.png",
  "Hideous Visage.png",
  "Hobbling Strike.png",
  "Hold Together.png",
  "Hunter's Instincts.png",
  "Hyperblazer.png",
  "Imperceptible Liar.png",
  "Impersonate.png",
  "Impetuous Move.png",
  "Implant Training.png",
  "Improved Charge.png",
  "Improved Damage Threshold.png",
  "Improved Defenses.png",
  "Improved Disarm.png",
  "Improved Grapple.png",
  "Improved Knock Prone.png",
  "Improved Resistance.png",
  "Improved Sleight of Hand.png",
  "Improved Stun.png",
  "Improvised Weapon Mastery.png",
  "Impulsive Flight.png",
  "Increased Agility.png",
  "Indomitable Personality.png",
  "Indomitable Will.png",
  "Indomitable.png",
  "Informer.png",
  "Instinctive Attack.png",
  "Instinctive Defense.png",
  "Intimidating Presence.png",
  "Intimidator.png",
  "Intuitive Initiative.png",
  "Ion Shielding.png",
  "Jack of All Trades.png",
  "Jedi Familiarity.png",
  "Jedi Heritage.png",
  "Justice Seeker.png",
  "Keen Force Mind.png",
  "Keen Scent.png",
  "Knife Trick.png",
  "Knock Heads.png",
  "Knock Prone.png",
  "Lasting Influence.png",
  "Leader of Droids.png",
  "Lightning Draw.png",
  "Lightning Reflexes.png",
  "Linguist.png",
  "Logic Upgrade.png",
  "Long Haft Strike.png",
  "Low Profile.png",
  "Lucky Shot.png",
  "Mandalorian Training.png",
  "Maniacal Charge.png",
  "Martial Arts.png",
  "Master Tracker.png",
  "Master of Disguise.png",
  "Meat Shield.png",
  "Mechanical Martial Arts.png",
  "Melee Defense.png",
  "Metamorph.png",
  "Mighty Swing.png",
  "Mighty Throw.png",
  "Military Training.png",
  "Mind of Reason.png",
  "Mission Specialist.png",
  "Mobile Fighting.png",
  "Mobility.png",
  "Mon Calamari Shipwright.png",
  "Mounted Combat.png",
  "Moving Target.png",
  "Multi-Grab.png",
  "Multi-Targeting .png",
  "Natural Leader.png",
  "Nature Specialist.png",
  "Never Surrender.png",
  "Nikto Survival.png",
  "Noble Fencing Style.png",
  "Officer Candidacy Training.png",
  "Opportunistic Trickery.png",
  "Oppurtunistic Retreat.png",
  "Oppurtunistic Shooter.png",
  "Overwhelming Attack.png",
  "Pall of the Dark Side.png",
  "Perfect Intuition.png",
  "Perfect Swimmer.png",
  "Pin.png",
  "Pincer.png",
  "Pinpoint Accuracy.png",
  "Pistoleer.png",
  "Pitiless Warrior.png",
  "Point Blank Shot.png",
  "Poison Resistance.png",
  "Power Attack.png",
  "Power Blast.png",
  "Powerful Charge.png",
  "Powerful Rage.png",
  "Precise Shot.png",
  "Predictive Defense.png",
  "Prime Shot.png",
  "Primitive Warrior.png",
  "Quick Comeback.png",
  "Quick Draw.png",
  "Quick Skill.png",
  "Rancor Crush.png",
  "Rapid Assault.png",
  "Rapid Reaction.png",
  "Rapid Shot.png",
  "Rapid Strike.png",
  "Rapport.png",
  "Reacitve Awareness.png",
  "Reactive Stealth.png",
  "Read the Winds.png",
  "Recall.png",
  "Reckless Charge.png",
  "Recovering Surge.png",
  "Recurring Success.png",
  "Redirect Shot.png",
  "Regenerative Healing.png",
  "Relentless Attack.png",
  "Resilient Refelxes.png",
  "Resilient Strength.png",
  "Resilient Talent.png",
  "Resilient Will.png",
  "Resolute Stance.png",
  "Resurgence.png",
  "Return Fire.png",
  "Returning Bug.png",
  "Riflemaster.png",
  "Risk Taker.png",
  "Running Attack.png",
  "Saber Throw.png",
  "Sadistic Strike.png",
  "Savage Attack.png",
  "Scavenger.png",
  "Scion of Dorin.png",
  "Sensor Link.png",
  "Shake it Off.png",
  "Sharp Senses.png",
  "Shield Surge.png",
  "Shrewd Bargainer.png",
  "Signature Device.png",
  "Silver Tongue.png",
  "Skill Challenge.png",
  "Skill Focus.png",
  "Skill Training.png",
  "Slammer.png",
  "Slippery Maneuver.png",
  "Sneak Attack.png",
  "Sniper Shot.png",
  "Sniper.png",
  "Spacer's Surge.png",
  "Sport Hunter.png",
  "Spray Shot.png",
  "Spring Attack.png",
  "Staggering Attack.png",
  "Stand Tall.png",
  "Starship Designer.png",
  "Starship Tactics.png",
  "Stay Up.png",
  "Steadying Position.png",
  "Stealthy.png",
  "Strafe.png",
  "Strong Bellow.png",
  "Strong in the Force.png",
  "Stunning Strike.png",
  "Superior Tech.png",
  "Sure Climber.png",
  "Surgical Expertise.png",
  "Surgical Precision.png",
  "Survivor of Ryloth.png",
  "Swarm.png",
  "Tactical Advantage.png",
  "Tactical Genius.png",
  "Targeted Area.png",
  "Tech Specialist.png",
  "Thick Skin.png",
  "Throw.png",
  "Tool Frenzy.png",
  "Toughness.png",
  "Trample.png",
  "Trench Warrior.png",
  "Triple Attack.png",
  "Triple Crit Specialist.png",
  "Triple Crit.png",
  "Trustworthy.png",
  "Tumble Defense.png",
  "Turn and Burn.png",
  "Unleashed.png",
  "Unstoppable Combatant.png",
  "Unstoppable Force.png",
  "Unswerving Resolve.png",
  "Unwavering Resolve.png",
  "Vehicle System Expertise.png",
  "Vehiclular Surge.png",
  "Vehicular Combat.png",
  "Veteran Spacer.png",
  "Vitality Surge.png",
  "Warrior Heritage.png",
  "Wary Defender.png",
  "Weapon Finesse.png",
  "Weapon Focus.png",
  "Weapon Proficency.png",
  "Weapon Specialization.png",
  "Whirlwind Attack.png",
  "Wicked Strike.png",
  "Wilderness First Aid.png",
  "Withdrawl Strike.png",
  "Wookie Grip.png",
  "Wounding Strike.png",
  "Zero Range.png",
  "droidcraft.png",
  "educated.png"
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with'
]);

const ICON_ENTRIES = FEAT_ICON_FILES.map(file => {
  const label = file.replace(/\.[^.]+$/, '');
  const key = normalizeFeatIconKey(label);
  return {
    file,
    label,
    key,
    tokens: tokenizeFeatIconLabel(label),
    path: encodeURI(`${FEAT_ICON_ROOT}${file}`),
  };
});

const ICON_BY_EXACT_KEY = new Map(ICON_ENTRIES.map(entry => [entry.key, entry]));
const ICON_BY_LABEL_LOWER = new Map(ICON_ENTRIES.map(entry => [entry.label.toLowerCase(), entry]));
const RESOLUTION_CACHE = new Map();

function normalizeFeatIconKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeFeatIconLabel(value) {
  const normalized = normalizeFeatIconKey(value);
  if (!normalized) return [];
  return normalized.split(' ').filter(token => token.length > 1 && !STOP_WORDS.has(token));
}


function levenshteinDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i += 1) {
    const current = [i + 1];
    for (let j = 0; j < right.length; j += 1) {
      const cost = left[i] === right[j] ? 0 : 1;
      current[j + 1] = Math.min(
        current[j] + 1,
        previous[j + 1] + 1,
        previous[j] + cost,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function areSimilarFeatIconTokens(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return true;
  if (left.length < 5 || right.length < 5) return false;
  if (left.startsWith(right) || right.startsWith(left)) return true;
  const distance = levenshteinDistance(left, right);
  return distance <= 2 || distance / Math.max(left.length, right.length) <= 0.22;
}

function scoreIconCandidate(queryKey, queryTokens, entry) {
  if (!queryKey || !entry?.key) return 0;
  if (entry.key === queryKey) return 1;

  let score = 0;

  // Strong signal: one full normalized name contains the other.
  if (entry.key.includes(queryKey) || queryKey.includes(entry.key)) {
    const shortLength = Math.min(entry.key.length, queryKey.length);
    const longLength = Math.max(entry.key.length, queryKey.length) || 1;
    score = Math.max(score, 0.72 + (shortLength / longLength) * 0.18);
  }

  if (!queryTokens.length || !entry.tokens.length) return score;

  const entryTokens = new Set(entry.tokens);
  const shared = queryTokens.filter(token => entryTokens.has(token));
  const fuzzyShared = queryTokens.filter(token =>
    token.length >= 4 && entry.tokens.some(candidate => areSimilarFeatIconTokens(token, candidate))
  );
  const sharedWeight = shared.length + (fuzzyShared.length * 0.55);
  const unionSize = new Set([...queryTokens, ...entry.tokens]).size || 1;
  const overlap = sharedWeight / unionSize;

  if (overlap > 0) {
    score = Math.max(score, overlap);
  }

  // Preserve families like Armor Proficiency, Attack Combo, Weapon Focus, etc.
  if (queryTokens[0] && entry.tokens[0] === queryTokens[0]) {
    score += 0.12;
  }

  // Prefer similarly sized labels when multiple siblings share a family token.
  const lengthDelta = Math.abs(entry.tokens.length - queryTokens.length);
  score -= Math.min(lengthDelta * 0.04, 0.16);

  return Math.max(0, Math.min(score, 0.99));
}

function resolveEntryByName(name) {
  const queryKey = normalizeFeatIconKey(name);
  if (!queryKey) return null;

  const exact = ICON_BY_EXACT_KEY.get(queryKey) || ICON_BY_LABEL_LOWER.get(String(name || '').toLowerCase());
  if (exact) return exact;

  const queryTokens = tokenizeFeatIconLabel(name);
  let best = null;
  let bestScore = 0;

  for (const entry of ICON_ENTRIES) {
    const score = scoreIconCandidate(queryKey, queryTokens, entry);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  // A low score can produce misleading art. Require either a strong family match
  // or at least two meaningful shared/prefix tokens.
  if (best && bestScore >= 0.40) return best;
  return null;
}

function normalizeExistingPath(path) {
  const value = String(path || '').trim();
  if (!value || value === 'icons/svg/mystery-man.svg') return '';
  return value;
}

/**
 * Resolve the best icon path for a feat-like object.
 * @param {object|string} featOrName A feat object or raw feat name.
 * @returns {string} Foundry-relative asset path, or an empty string if no safe match exists.
 */
export function resolveFeatIconPath(featOrName) {
  const name = typeof featOrName === 'string'
    ? featOrName
    : (featOrName?.name || featOrName?.label || featOrName?.system?.name || '');

  const cacheKey = normalizeFeatIconKey(name);
  if (RESOLUTION_CACHE.has(cacheKey)) return RESOLUTION_CACHE.get(cacheKey);

  const explicitAsset = normalizeExistingPath(
    typeof featOrName === 'object'
      ? (featOrName?.iconPath || featOrName?.system?.iconPath || featOrName?.system?.assetIcon || featOrName?.flags?.swse?.assetIcon)
      : ''
  );
  if (explicitAsset) {
    RESOLUTION_CACHE.set(cacheKey, explicitAsset);
    return explicitAsset;
  }

  const existingImg = normalizeExistingPath(typeof featOrName === 'object' ? featOrName?.img : '');
  if (existingImg && existingImg.includes('/assets/feats/')) {
    RESOLUTION_CACHE.set(cacheKey, existingImg);
    return existingImg;
  }

  const matched = resolveEntryByName(name);
  const resolved = matched?.path || existingImg || '';
  RESOLUTION_CACHE.set(cacheKey, resolved);
  return resolved;
}

export function attachFeatIconPath(feat) {
  if (!feat) return feat;
  const iconPath = resolveFeatIconPath(feat);
  if (!iconPath) return feat;
  feat.iconPath = iconPath;
  if (!feat.img || feat.img === 'icons/svg/mystery-man.svg') feat.img = iconPath;
  return feat;
}
