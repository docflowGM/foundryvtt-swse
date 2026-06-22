/**
 * Weapon Investment Profile
 *
 * Lightweight store/workbench helper. It summarizes the actor's current weapon
 * inventory and equipment tags so upgrade suggestions can tell whether a target
 * weapon belongs to an already-invested lane. This intentionally does not make
 * legality decisions and does not replace the weapon scoring engine.
 */

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function numberValue(value, fallback = 0) {
  const n = Number(value?.value ?? value);
  return Number.isFinite(n) ? n : fallback;
}

function actorItems(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (Array.isArray(items.contents)) return items.contents;
  if (typeof items.values === 'function') return Array.from(items.values());
  return Array.from(items || []);
}

function isEquipped(item = {}) {
  const sys = item.system || {};
  const values = [
    sys.equipped,
    sys.isEquipped,
    sys.equippable?.equipped,
    sys.carried?.equipped,
    sys.location,
    sys.status
  ];
  return values.some((value) => {
    if (value === true) return true;
    const text = String(value || '').toLowerCase();
    return ['equipped', 'worn', 'held', 'active', 'true', '1', 'yes'].includes(text);
  });
}

function quantity(item = {}) {
  const sys = item.system || {};
  const q = numberValue(sys.quantity ?? sys.qty ?? sys.count ?? sys.amount, 1);
  return q > 0 ? q : 1;
}

function unique(values = []) {
  return Array.from(new Set(values.map(normalize).filter(Boolean)));
}

function textForItem(item = {}) {
  const sys = item.system || {};
  return [
    item.name,
    item.type,
    sys.group,
    sys.weaponGroup,
    sys.weapon_group,
    sys.weaponSubtype,
    sys.weapon_subtype,
    sys.category,
    sys.subcategory,
    sys.type,
    sys.subtype,
    ...(Array.isArray(sys.tags) ? sys.tags : []),
    ...(Array.isArray(sys.traits) ? sys.traits : [])
  ].filter(Boolean).join(' ').toLowerCase();
}

export function classifyWeaponInvestmentGroup(item = {}) {
  const text = textForItem(item);
  if (/lightsaber|light saber|saber/.test(text)) return 'lightsaber';
  if (/heavy weapon|repeating blaster|missile|launcher|grenade launcher|e-web|eweb/.test(text)) return 'heavy_weapon';
  if (/rifle|carbine/.test(text)) return 'rifle';
  if (/pistol|hold\s*-?out/.test(text)) return 'pistol';
  if (/grenade|detonator|detonite|mine|explosive|charge/.test(text)) return 'grenade';
  if (/vibro|sword|staff|blade|melee|spear|axe|club/.test(text)) return 'melee';
  if (/thrown|throwing/.test(text)) return 'thrown';
  return normalize(item.system?.weaponGroup || item.system?.group || item.system?.category || 'weapon') || 'weapon';
}

function tagsForWeapon(item = {}) {
  const group = classifyWeaponInvestmentGroup(item);
  const tags = [group, 'weapon'];
  const text = textForItem(item);
  if (['lightsaber', 'melee'].includes(group)) tags.push('melee', 'offense_melee');
  if (['pistol', 'rifle', 'heavy_weapon'].includes(group)) tags.push('ranged', 'offense_ranged');
  if (group === 'lightsaber') tags.push('force', 'jedi');
  if (group === 'grenade' || /explosive|area/.test(text)) tags.push('explosives', 'area_damage');
  if (/accur|target|scope|sight/.test(text)) tags.push('accuracy');
  if (/autofire|burst|suppress/.test(text)) tags.push('autofire');
  return unique(tags);
}

function addGroup(profile, group, amount, item) {
  const key = normalize(group || 'weapon');
  const entry = profile.groups[key] || { group: key, score: 0, equippedScore: 0, inventoryScore: 0, count: 0, equippedCount: 0, names: [], tags: [] };
  entry.score += amount.score;
  entry.equippedScore += amount.equippedScore;
  entry.inventoryScore += amount.inventoryScore;
  entry.count += amount.count;
  entry.equippedCount += amount.equippedCount;
  if (item.name && !entry.names.includes(item.name)) entry.names.push(item.name);
  entry.tags = unique([...(entry.tags || []), ...tagsForWeapon(item)]);
  profile.groups[key] = entry;
}

export function buildWeaponInvestmentProfile(actor, options = {}) {
  const profile = {
    version: 1,
    totalWeapons: 0,
    equippedWeapons: 0,
    groups: {},
    dominantGroups: [],
    primaryGroup: null,
    allTags: [],
    tagWeights: {}
  };

  for (const item of actorItems(actor)) {
    if (item?.type !== 'weapon') continue;
    const qty = quantity(item);
    const equipped = isEquipped(item);
    const group = classifyWeaponInvestmentGroup(item);
    const base = qty * (equipped ? 1 : 0.35);
    const amount = {
      score: base,
      equippedScore: equipped ? qty : 0,
      inventoryScore: equipped ? 0 : qty * 0.35,
      count: qty,
      equippedCount: equipped ? qty : 0
    };
    addGroup(profile, group, amount, item);
    profile.totalWeapons += qty;
    if (equipped) profile.equippedWeapons += qty;
    for (const tag of tagsForWeapon(item)) {
      const key = normalize(tag);
      profile.tagWeights[key] = Math.max(profile.tagWeights[key] || 0, base);
    }
  }

  const fromLoadout = options.equipmentProfile?.weaponGroups || {};
  for (const [group, data] of Object.entries(fromLoadout)) {
    const key = normalize(group);
    if (!key) continue;
    const score = numberValue(data.equippedCount, 0) + numberValue(data.inventoryCount, 0) * 0.35;
    if (score <= 0) continue;
    const pseudo = { name: (data.names || [key])[0] || key, system: { weaponGroup: key, tags: [key] }, type: 'weapon' };
    addGroup(profile, key, { score, equippedScore: numberValue(data.equippedCount, 0), inventoryScore: numberValue(data.inventoryCount, 0) * 0.35, count: numberValue(data.equippedCount, 0) + numberValue(data.inventoryCount, 0), equippedCount: numberValue(data.equippedCount, 0) }, pseudo);
  }

  profile.dominantGroups = Object.values(profile.groups)
    .sort((a, b) => b.score - a.score || a.group.localeCompare(b.group))
    .slice(0, 6);
  profile.primaryGroup = profile.dominantGroups[0]?.group || null;
  profile.allTags = unique(profile.dominantGroups.flatMap((entry) => entry.tags || []));
  return profile;
}

export function scoreWeaponInvestmentFit(targetItem, actor, options = {}) {
  const profile = options.weaponInvestmentProfile || buildWeaponInvestmentProfile(actor, options);
  const group = classifyWeaponInvestmentGroup(targetItem);
  const tags = tagsForWeapon(targetItem);
  const entry = profile.groups?.[normalize(group)] || null;
  let score = 0;
  const reasons = [];

  if (entry) {
    score += Math.min(1, entry.score / 2);
    reasons.push(`matches current ${group.replace(/_/g, ' ')} investment`);
  }

  for (const tag of tags) {
    const weight = numberValue(profile.tagWeights?.[normalize(tag)], 0);
    if (weight > 0) score += Math.min(0.25, weight * 0.08);
  }

  if (options.assumeTargetUsed) score += 0.15;
  score = Math.max(0, Math.min(1, score));

  let adjustment = 0;
  let label = 'light';
  if (score >= 0.8) { adjustment = 8; label = 'strong'; }
  else if (score >= 0.55) { adjustment = 5; label = 'good'; }
  else if (score >= 0.3) { adjustment = 2; label = 'some'; }
  else if (profile.totalWeapons > 0) { adjustment = -1; label = 'off-lane'; reasons.push('little current investment in this weapon group'); }
  else { label = 'unknown'; reasons.push('no current weapon investment detected'); }

  return {
    group,
    label,
    score,
    adjustment,
    entry,
    reasons: reasons.slice(0, 3),
    profile
  };
}

export default buildWeaponInvestmentProfile;
