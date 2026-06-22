/**
 * Build Route Confidence Profile
 *
 * Interprets build evidence as access/support/commitment/anchor instead of
 * treating every matching tag as equal identity. This is intentionally advice
 * only: it never changes legality. It helps hybrid characters (for example a
 * Soldier with Force Sensitivity) keep class chassis identity while still
 * surfacing newly opened Force lanes.
 */

import { getEquipmentLoadoutProfile, getLoadoutTagWeight } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment-loadout-profile.js";

const ROUTE_LABELS = {
  force: 'Force access',
  force_power: 'Force power suite',
  jedi: 'Jedi tradition',
  lightsaber: 'lightsaber combat',
  melee: 'melee pressure',
  ranged: 'ranged pressure',
  pistol: 'pistol sidearm',
  rifle: 'rifle marksmanship',
  heavy_weapon: 'heavy weapons',
  dual_wield: 'dual-wield combat',
  armor: 'armored defense',
  tech: 'technical problem-solving',
  social: 'social influence',
  leadership: 'leadership',
  stealth: 'stealth',
  fieldcraft: 'fieldcraft',
  vehicle: 'vehicle/pilot play',
  explosives: 'explosives',
  medical: 'medical support',
  defense: 'defense',
  mobility: 'mobility'
};

const CATEGORY_WEIGHTS = {
  access: 0.28,
  support: 0.52,
  commitment: 0.82,
  anchor: 1.05
};

const CLASS_ROUTE_HINTS = {
  jedi: ['jedi', 'force', 'lightsaber', 'melee'],
  noble: ['social', 'leadership', 'support'],
  scoundrel: ['stealth', 'social', 'pistol', 'ranged'],
  scout: ['fieldcraft', 'mobility', 'stealth', 'ranged'],
  soldier: ['melee', 'ranged', 'armor', 'heavy_weapon', 'defense'],
  'jedi knight': ['jedi', 'force', 'lightsaber', 'melee'],
  'imperial knight': ['jedi', 'force', 'lightsaber', 'armor', 'melee'],
  'force adept': ['force', 'force_power'],
  'force disciple': ['force', 'force_power', 'support'],
  gunslinger: ['pistol', 'ranged'],
  officer: ['leadership', 'social'],
  'elite trooper': ['armor', 'ranged', 'melee'],
  'ace pilot': ['vehicle', 'ranged'],
  infiltrator: ['stealth', 'tech'],
  'bounty hunter': ['ranged', 'fieldcraft']
};

const FEAT_GATEWAYS = [
  {
    pattern: /^force sensitivity$/i,
    routes: ['force'],
    access: ['force_training', 'use_the_force', 'force_power', 'force_prestige'],
    strength: 1.0,
    label: 'Force Sensitivity opens the Force lane'
  },
  {
    pattern: /^force training$/i,
    routes: ['force', 'force_power'],
    access: ['force_power_suite', 'force_technique', 'force_secret'],
    strength: 1.15,
    repeatable: true,
    label: 'Force Training expands the Force power suite'
  },
  {
    pattern: /^power attack$/i,
    routes: ['melee'],
    access: ['cleave', 'great_cleave', 'strength_melee'],
    strength: 1.0,
    label: 'Power Attack opens the Strength melee chain'
  },
  {
    pattern: /^cleave$/i,
    routes: ['melee'],
    access: ['great_cleave'],
    strength: 0.8,
    label: 'Cleave continues the melee chain'
  },
  {
    pattern: /^dodge$/i,
    routes: ['defense', 'mobility'],
    access: ['mobility_prereq', 'defensive_prereq'],
    strength: 0.9,
    label: 'Dodge opens mobility and defense prerequisites'
  },
  {
    pattern: /^weapon proficiency/i,
    routes: ['ranged', 'melee'],
    access: ['weapon_focus', 'weapon_style'],
    strength: 0.85,
    repeatable: true,
    label: 'Weapon Proficiency opens a weapon group lane'
  },
  {
    pattern: /^weapon focus/i,
    routes: ['ranged', 'melee'],
    access: ['weapon_specialization', 'weapon_talents', 'prestige_prereq'],
    strength: 1.15,
    repeatable: true,
    label: 'Weapon Focus is a major weapon-chain gateway'
  },
  {
    pattern: /^skill focus/i,
    routes: ['tech', 'social', 'fieldcraft', 'medical'],
    access: ['skill_prestige', 'skill_specialist'],
    strength: 0.8,
    repeatable: true,
    label: 'Skill Focus opens skill-specialist lanes'
  }
];

const TALENT_GATEWAY_HINTS = [
  { pattern: /block|deflect|lightsaber defense|lightsaber/i, routes: ['jedi', 'lightsaber', 'melee', 'defense'], strength: 0.95, label: 'Lightsaber talents reinforce Jedi combat' },
  { pattern: /force|telekinetic|mind trick|alter|control|sense/i, routes: ['force', 'force_power'], strength: 0.85, label: 'Force talents reinforce Force commitment' },
  { pattern: /armor|commando|weapon specialist/i, routes: ['armor', 'melee', 'ranged'], strength: 0.75, label: 'Martial talents reinforce combat class routes' },
  { pattern: /inspiration|leadership|influence|command/i, routes: ['leadership', 'social', 'support'], strength: 0.75, label: 'Leadership talents reinforce command routes' },
  { pattern: /slicer|tech|mechanic|computer/i, routes: ['tech'], strength: 0.75, label: 'Technical talents reinforce tech routes' },
  { pattern: /stealth|spy|fortune|misfortune|sneak|ambush/i, routes: ['stealth', 'social'], strength: 0.7, label: 'Rogue talents reinforce stealth/social routes' },
  { pattern: /awareness|survival|tracking|fringer|camouflage/i, routes: ['fieldcraft', 'mobility'], strength: 0.7, label: 'Field talents reinforce scout routes' }
];

const CANDIDATE_NAME_ROUTES = [
  { pattern: /force training/i, routes: ['force', 'force_power'], accessTargets: ['force_training'], repeatable: true },
  { pattern: /force sensitivity/i, routes: ['force'], accessTargets: ['force_access'] },
  { pattern: /cleave|power attack|rapid strike|melee|flurry/i, routes: ['melee'] },
  { pattern: /lightsaber|ataru|djem so|jar'?kai|juyo|niman|shien|shii-cho|soresu|vaapad/i, routes: ['jedi', 'lightsaber', 'melee'] },
  { pattern: /dodge|mobility|reflex/i, routes: ['mobility', 'defense'] },
  { pattern: /weapon focus/i, routes: ['melee', 'ranged'], accessTargets: ['weapon_focus'], repeatable: true },
  { pattern: /weapon proficiency/i, routes: ['melee', 'ranged'], accessTargets: ['weapon_proficiency'], repeatable: true },
  { pattern: /pistol|point-blank|precise shot|rapid shot|deadeye|gunslinger/i, routes: ['pistol', 'ranged'] },
  { pattern: /rifle|sniper/i, routes: ['rifle', 'ranged'] },
  { pattern: /armor|toughness|damage reduction/i, routes: ['armor', 'defense'] },
  { pattern: /grenade|explosive|blast|detonite/i, routes: ['explosives'] },
  { pattern: /mechanic|computer|tech|slicer|engineer/i, routes: ['tech'] },
  { pattern: /persuasion|deception|noble|leadership|command|inspire/i, routes: ['social', 'leadership'] },
  { pattern: /stealth|sneak|infiltrat|spy/i, routes: ['stealth'] },
  { pattern: /pilot|vehicle|starship|ace/i, routes: ['vehicle'] },
  { pattern: /treat injury|medical|medic|healing/i, routes: ['medical', 'support'] },
  { pattern: /dual|two-weapon|jar'?kai/i, routes: ['dual_wield'] }
];

const TAG_TO_ROUTES = {
  force: ['force'],
  force_sensitive: ['force'],
  force_sensitivity: ['force'],
  force_training: ['force', 'force_power'],
  force_capacity: ['force_power'],
  force_execution: ['force_power'],
  use_the_force: ['force_power'],
  force_power: ['force_power'],
  lightsaber: ['jedi', 'lightsaber', 'melee'],
  lightsaber_form: ['jedi', 'lightsaber', 'melee'],
  duelist: ['lightsaber', 'melee'],
  melee: ['melee'],
  offense_melee: ['melee'],
  strength_synergy: ['melee'],
  ability_strength: ['melee'],
  ranged: ['ranged'],
  offense_ranged: ['ranged'],
  pistol: ['pistol', 'ranged'],
  rifle: ['rifle', 'ranged'],
  heavy_weapon: ['heavy_weapon', 'ranged'],
  dual_wield: ['dual_wield'],
  two_weapon_fighting: ['dual_wield'],
  jar_kai: ['dual_wield', 'lightsaber'],
  armor: ['armor', 'defense'],
  defense: ['defense'],
  mobility: ['mobility'],
  tech: ['tech'],
  mechanics: ['tech'],
  use_computer: ['tech'],
  hacking: ['tech'],
  social: ['social'],
  persuasion: ['social'],
  deception: ['social'],
  leadership: ['leadership'],
  ally_support: ['support', 'leadership'],
  stealth: ['stealth'],
  survival: ['fieldcraft'],
  tracking: ['fieldcraft'],
  perception: ['fieldcraft'],
  pilot: ['vehicle'],
  vehicle: ['vehicle'],
  medical: ['medical', 'support'],
  healing: ['medical', 'support'],
  grenade: ['explosives'],
  explosives: ['explosives'],
  area_damage: ['explosives']
};

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return Array.from(new Set((values || []).map(normalize).filter(Boolean)));
}

function actorItems(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (Array.isArray(items.contents)) return items.contents;
  if (typeof items.values === 'function') return Array.from(items.values());
  return Array.from(items || []);
}

function addEvidence(profile, route, category, weight, source, details = {}) {
  const key = normalize(route);
  if (!key) return;
  const cat = CATEGORY_WEIGHTS[category] ? category : 'support';
  const amount = Math.max(0, Number(weight || 0)) * CATEGORY_WEIGHTS[cat];
  if (!Number.isFinite(amount) || amount <= 0) return;

  const entry = profile.routes[key] || {
    route: key,
    label: ROUTE_LABELS[key] || key.replace(/_/g, ' '),
    score: 0,
    categories: { access: 0, support: 0, commitment: 0, anchor: 0 },
    signals: []
  };
  entry.score += amount;
  entry.categories[cat] += amount;
  entry.signals.push({ category: cat, weight: amount, source: String(source || ''), ...details });
  profile.routes[key] = entry;
}

function addEvidenceForRoutes(profile, routes, category, weight, source, details = {}) {
  for (const route of routes || []) addEvidence(profile, route, category, weight, source, details);
}

function itemTags(item) {
  const sys = item?.system || {};
  return unique([
    ...(Array.isArray(item?.tags) ? item.tags : []),
    ...(Array.isArray(sys.tags) ? sys.tags : []),
    ...(Array.isArray(item?.context?.allTags) ? item.context.allTags : []),
    sys.featType,
    sys.subType,
    sys.category,
    sys.group,
    sys.tree,
    sys.talent_tree,
    sys.talentTree,
  ]);
}

function candidateTags(candidate) {
  return unique([
    ...(Array.isArray(candidate?.context?.allTags) ? candidate.context.allTags : []),
    ...(Array.isArray(candidate?.tags) ? candidate.tags : []),
    ...(Array.isArray(candidate?.system?.tags) ? candidate.system.tags : []),
    ...(Array.isArray(candidate?.metadata?.tags) ? candidate.metadata.tags : []),
    candidate?.system?.featType,
    candidate?.system?.category,
    candidate?.system?.group,
    candidate?.system?.tree,
    candidate?.system?.talent_tree,
    candidate?.system?.talentTree,
  ]);
}

function routesFromTags(tags) {
  const out = [];
  for (const tag of tags || []) {
    const key = normalize(tag);
    out.push(...(TAG_TO_ROUTES[key] || []));
  }
  return unique(out);
}

function routesFromName(name) {
  const out = [];
  for (const hint of CANDIDATE_NAME_ROUTES) {
    if (hint.pattern.test(String(name || ''))) out.push(...hint.routes);
  }
  return unique(out);
}

function classEntries(actor, pendingData = {}) {
  const entries = [];
  for (const item of actorItems(actor).filter(item => item?.type === 'class')) {
    entries.push({
      name: item?.name,
      level: Number(item?.system?.level ?? item?.system?.levels ?? item?.system?.rank ?? 1) || 1,
      sort: Number(item?.sort ?? item?.system?.sort ?? 0) || 0,
      createdTime: Number(item?._stats?.createdTime || item?.system?.createdTime || 0) || 0
    });
  }
  const pendingClass = pendingData?.selectedClass || pendingData?.classModel || pendingData?.class;
  if (pendingClass?.name) entries.push({ name: pendingClass.name, level: 1, pending: true, sort: 999999, createdTime: Date.now?.() || 0 });
  return entries.filter(entry => entry.name);
}

function startingClassName(actor, pendingData = {}) {
  const explicit = actor?.system?.startingClass || actor?.system?.details?.startingClass || actor?.flags?.swse?.startingClass || pendingData?.startingClass;
  if (explicit?.name) return explicit.name;
  if (typeof explicit === 'string' && explicit.trim()) return explicit;
  const entries = classEntries(actor, pendingData);
  if (!entries.length) return null;
  return [...entries].sort((a, b) => (a.createdTime - b.createdTime) || (a.sort - b.sort) || a.name.localeCompare(b.name))[0]?.name || null;
}

function routeHintsForClassName(className) {
  const key = normalizeName(className);
  return CLASS_ROUTE_HINTS[key] || [];
}

function countOwnedName(actor, pendingData, name) {
  const target = normalizeName(name);
  let count = 0;
  for (const item of actorItems(actor)) {
    if (normalizeName(item?.name) === target) count += 1;
  }
  for (const value of pendingData?.selectedFeats || []) {
    if (normalizeName(value?.name || value) === target) count += 1;
  }
  for (const value of pendingData?.selectedTalents || []) {
    if (normalizeName(value?.name || value) === target) count += 1;
  }
  return count;
}

function detectFeatGateway(name) {
  return FEAT_GATEWAYS.find(rule => rule.pattern.test(String(name || ''))) || null;
}

function isRepeatableCandidate(candidate) {
  const name = String(candidate?.name || '').trim();
  const sys = candidate?.system || {};
  if (sys?.choiceMeta?.repeatable === true || sys?.repeatable === true || candidate?.repeatable === true) return true;
  const text = `${sys.special || ''} ${sys.description || ''}`;
  if (/can (?:take|gain) this feat (?:more than once|multiple times)/i.test(text)) return true;
  return /^(force training|weapon proficiency|weapon focus|weapon specialization|skill focus|force focus|droid focus)$/i.test(name);
}

function addGatewayEvidence(profile, item, category, pendingData = {}) {
  const name = item?.name || item;
  const gateway = detectFeatGateway(name);
  if (!gateway) return;
  let routes = [...gateway.routes];
  const nameNorm = normalizeName(name);
  if (/lightsaber/.test(nameNorm)) routes.push('lightsaber', 'jedi', 'melee');
  if (/pistol/.test(nameNorm)) routes.push('pistol', 'ranged');
  if (/rifle/.test(nameNorm)) routes.push('rifle', 'ranged');
  if (/heavy weapon/.test(nameNorm)) routes.push('heavy_weapon', 'ranged');
  if (/advanced melee|simple weapons/.test(nameNorm)) routes.push('melee');
  addEvidenceForRoutes(profile, unique(routes), category, gateway.strength, name, {
    gateway: true,
    opens: gateway.access,
    repeatable: gateway.repeatable === true,
    label: gateway.label
  });
  if (gateway.repeatable) {
    profile.repeatableInvestments[normalizeName(name)] = (profile.repeatableInvestments[normalizeName(name)] || 0) + 1;
  }
}

function applyAttributes(profile, actor) {
  const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const routeByAbility = {
    str: ['melee'],
    dex: ['ranged', 'pistol', 'mobility', 'defense'],
    con: ['defense', 'armor'],
    int: ['tech'],
    wis: ['force_power', 'fieldcraft', 'medical'],
    cha: ['force_power', 'social', 'leadership']
  };
  for (const key of keys) {
    const attr = actor?.system?.attributes?.[key];
    const ab = actor?.system?.abilities?.[key];
    const score = Number(attr?.total ?? attr?.value ?? attr?.score ?? attr ?? ab?.total ?? ab?.value ?? ab?.score ?? ab ?? 10);
    if (!Number.isFinite(score) || score < 14) continue;
    const weight = score >= 18 ? 0.5 : score >= 16 ? 0.38 : 0.25;
    addEvidenceForRoutes(profile, routeByAbility[key], 'support', weight, `${key.toUpperCase()} ${score}`, { attribute: key, score });
  }
}

function finalizeProfile(profile) {
  const routeEntries = Object.values(profile.routes).map(entry => {
    const categories = entry.categories || {};
    const nonAccess = (categories.support || 0) + (categories.commitment || 0) + (categories.anchor || 0);
    const hasAnchor = (categories.anchor || 0) > 0;
    const hasCommitment = (categories.commitment || 0) > 0;
    const hasSupport = (categories.support || 0) > 0;
    const accessOnly = (categories.access || 0) > 0 && nonAccess <= 0;
    const score = Math.max(0, Math.min(1, entry.score / 2.6));
    let confidence = 'latent';
    if (score >= 0.7 && (hasAnchor || hasCommitment || (hasSupport && (categories.access || 0) > 0))) confidence = 'primary';
    else if (score >= 0.45 && (hasSupport || hasCommitment || hasAnchor)) confidence = 'secondary';
    else if (score >= 0.2) confidence = 'latent';
    return {
      ...entry,
      score,
      confidence,
      accessOnly,
      hasAnchor,
      hasCommitment,
      hasSupport,
      signals: [...(entry.signals || [])].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 10)
    };
  }).sort((a, b) => b.score - a.score || a.route.localeCompare(b.route));

  profile.routes = Object.fromEntries(routeEntries.map(entry => [entry.route, entry]));
  profile.primaryRoutes = routeEntries.filter(entry => entry.confidence === 'primary').slice(0, 4);
  profile.secondaryRoutes = routeEntries.filter(entry => entry.confidence === 'secondary').slice(0, 5);
  profile.latentRoutes = routeEntries.filter(entry => entry.confidence === 'latent').slice(0, 6);
  profile.diffuse = profile.primaryRoutes.length === 0 && profile.secondaryRoutes.length >= 3;
  profile.forceAccess = !!profile.routes.force;
  profile.forceLaneConfidence = profile.routes.force?.score || profile.routes.force_power?.score || 0;
  profile.forceCommitmentLevel = profile.routes.force?.confidence || profile.routes.force_power?.confidence || (profile.forceAccess ? 'latent' : 'none');
  return profile;
}

export function buildRouteConfidenceProfile(actor, buildIntent = {}, options = {}) {
  const pendingData = options.pendingData || {};
  const equipmentProfile = options.equipmentProfile || getEquipmentLoadoutProfile(actor, options);
  const profile = {
    routes: {},
    repeatableInvestments: {},
    startingClass: startingClassName(actor, pendingData),
    classShape: null,
    primaryRoutes: [],
    secondaryRoutes: [],
    latentRoutes: [],
    diffuse: false,
    forceAccess: false,
    forceLaneConfidence: 0,
    forceCommitmentLevel: 'none'
  };

  const entries = classEntries(actor, pendingData);
  const totalClassLevels = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.level || 0)), 0) || 0;
  const sortedClasses = [...entries].sort((a, b) => (b.level - a.level) || a.name.localeCompare(b.name));
  profile.classShape = {
    entries: sortedClasses,
    total: totalClassLevels,
    top: sortedClasses[0] || null,
    diffuse: sortedClasses.filter(e => e.level > 0).length >= 4 || (sortedClasses.length >= 3 && sortedClasses[0]?.level / Math.max(totalClassLevels, 1) < 0.45)
  };

  if (profile.startingClass) {
    addEvidenceForRoutes(profile, routeHintsForClassName(profile.startingClass), 'anchor', 0.8, `Starting class: ${profile.startingClass}`, { startingClass: true });
  }

  for (const entry of entries) {
    const shape = entry.level >= 4 ? 'commitment' : entry.level >= 2 ? 'support' : 'access';
    const weight = Math.min(1.2, 0.32 + (entry.level * 0.16));
    addEvidenceForRoutes(profile, routeHintsForClassName(entry.name), shape, weight, `${entry.name} ${entry.level}`, { classLevel: entry.level });
  }

  for (const theme of buildIntent?.primaryThemes || []) {
    addEvidenceForRoutes(profile, routesFromTags([theme]).length ? routesFromTags([theme]) : [theme], 'support', 0.45, `Build theme: ${theme}`);
  }

  for (const item of actorItems(actor)) {
    if (item?.type === 'feat') {
      addGatewayEvidence(profile, item, 'access', pendingData);
      const routes = unique([...routesFromTags(itemTags(item)), ...routesFromName(item?.name)]);
      addEvidenceForRoutes(profile, routes, /force training|weapon focus/i.test(item?.name || '') ? 'support' : 'access', 0.45, item?.name, { itemType: 'feat' });
    } else if (item?.type === 'talent') {
      const routes = unique([...routesFromTags(itemTags(item)), ...routesFromName(item?.name)]);
      addEvidenceForRoutes(profile, routes, 'commitment', 0.58, item?.name, { itemType: 'talent' });
      for (const hint of TALENT_GATEWAY_HINTS) {
        if (hint.pattern.test(item?.name || '') || hint.pattern.test(item?.system?.tree || item?.system?.talent_tree || '')) {
          addEvidenceForRoutes(profile, hint.routes, 'commitment', hint.strength, item?.name, { itemType: 'talent', label: hint.label });
        }
      }
    } else if (item?.type === 'power' || item?.type === 'forcePower') {
      addEvidenceForRoutes(profile, ['force', 'force_power'], 'commitment', 0.55, item?.name, { itemType: 'forcePower' });
    }
  }

  for (const value of pendingData?.selectedFeats || []) addGatewayEvidence(profile, { name: value?.name || value }, 'access', pendingData);
  for (const value of pendingData?.selectedTalents || []) {
    addEvidenceForRoutes(profile, routesFromName(value?.name || value), 'support', 0.5, value?.name || value, { pending: true });
  }
  for (const value of pendingData?.selectedForcePowers || pendingData?.forcePowers || []) {
    addEvidenceForRoutes(profile, ['force', 'force_power'], 'commitment', 0.45, value?.name || value, { pending: true });
  }

  // Equipped loadout is active behavior. Possessed inventory is weaker but still useful.
  for (const [tag, value] of Object.entries(equipmentProfile?.tagWeights || {})) {
    const routes = routesFromTags([tag]);
    const category = Number(value) >= 0.75 ? 'support' : 'access';
    addEvidenceForRoutes(profile, routes, category, Math.min(1.1, Number(value) || 0), `Loadout: ${tag}`, { loadout: true });
  }
  if (equipmentProfile?.dualLightsabers) addEvidenceForRoutes(profile, ['dual_wield', 'lightsaber', 'jedi'], 'commitment', 1.0, 'Two equipped lightsabers', { loadout: true });
  if (equipmentProfile?.dualWield) addEvidenceForRoutes(profile, ['dual_wield'], 'support', 0.7, 'Two equipped weapons', { loadout: true });
  if ((equipmentProfile?.weaponGroups?.grenade?.inventoryCount || 0) >= 4) addEvidenceForRoutes(profile, ['explosives'], 'support', 0.45, 'Grenade stock', { loadout: true });

  applyAttributes(profile, actor);
  return finalizeProfile(profile);
}

export function scoreCandidateRouteFit(candidate, profile, options = {}) {
  if (!candidate || !profile) return { score: 0, bonus: 0, label: 'unknown', matches: [], accessOnly: false, repeatableContinuation: false };
  const name = String(candidate?.name || candidate?.label || '').trim();
  const tags = candidateTags(candidate);
  const candidateRoutes = unique([...routesFromTags(tags), ...routesFromName(name), ...routeHintsForClassName(name)]);
  const prereqText = String(candidate?.system?.prerequisite || candidate?.system?.prerequisites || candidate?.system?.requirements || '');

  // Prerequisite text often exposes gateway continuation before metadata does.
  for (const route of routesFromName(prereqText)) candidateRoutes.push(route);
  for (const tag of routesFromTags(unique(prereqText.split(/[^A-Za-z0-9()]+/)))) candidateRoutes.push(tag);

  const matches = [];
  let raw = 0;
  let accessOnly = true;
  for (const route of unique(candidateRoutes)) {
    const entry = profile.routes?.[route];
    if (!entry) continue;
    let routeScore = entry.score || 0;
    if (entry.accessOnly) routeScore *= 0.42;
    else accessOnly = false;
    raw += routeScore;
    matches.push({ route, label: entry.label || route, score: routeScore, confidence: entry.confidence, accessOnly: entry.accessOnly });
  }

  let gatewayMatch = null;
  for (const signalRoute of Object.values(profile.routes || {})) {
    for (const signal of signalRoute.signals || []) {
      const opened = unique(signal.opens || []);
      const nameKey = normalize(name);
      const tagSet = new Set(tags.map(normalize));
      const opensCandidate = opened.some(value => nameKey.includes(normalize(value)) || tagSet.has(normalize(value)));
      if (opensCandidate) {
        raw += signalRoute.accessOnly ? 0.10 : 0.18;
        gatewayMatch = { source: signal.source, opens: opened };
      }
    }
  }

  let repeatableContinuation = false;
  const ownedCount = Number(options.ownedCount ?? 0);
  if (isRepeatableCandidate(candidate) && ownedCount > 0) {
    repeatableContinuation = true;
    const commitment = Math.min(0.18, 0.08 + (ownedCount * 0.04));
    raw += commitment;
  }

  const profileDiffusePenalty = profile.diffuse ? 0.88 : 1.0;
  const score = Math.max(0, Math.min(1, raw * profileDiffusePenalty / 1.8));
  const top = matches.sort((a, b) => b.score - a.score)[0] || null;
  let label = 'offRoute';
  if (score >= 0.62 && !accessOnly) label = 'primary';
  else if (score >= 0.38 && !accessOnly) label = 'secondary';
  else if (score >= 0.18 || repeatableContinuation || gatewayMatch) label = 'latent';
  const bonus = label === 'primary' ? Math.min(0.10, score * 0.10)
    : label === 'secondary' ? Math.min(0.07, score * 0.08)
      : label === 'latent' ? Math.min(0.035, score * 0.06)
        : 0;

  return {
    score,
    bonus,
    label,
    matches: matches.slice(0, 5),
    topRoute: top?.route || null,
    topLabel: top?.label || null,
    accessOnly,
    gatewayMatch,
    repeatableContinuation,
    repeatableOwnedCount: ownedCount
  };
}

export function summarizeRouteConfidenceProfile(profile) {
  if (!profile) return null;
  return {
    startingClass: profile.startingClass || null,
    diffuse: !!profile.diffuse,
    forceAccess: !!profile.forceAccess,
    forceLaneConfidence: profile.forceLaneConfidence || 0,
    forceCommitmentLevel: profile.forceCommitmentLevel || 'none',
    primaryRoutes: (profile.primaryRoutes || []).map(r => ({ route: r.route, label: r.label, score: r.score })),
    secondaryRoutes: (profile.secondaryRoutes || []).map(r => ({ route: r.route, label: r.label, score: r.score })),
    latentRoutes: (profile.latentRoutes || []).map(r => ({ route: r.route, label: r.label, score: r.score }))
  };
}

export function getOwnedRepeatableCount(actor, pendingData = {}, candidate) {
  return countOwnedName(actor, pendingData, candidate?.name || candidate?.label || candidate);
}

export { isRepeatableCandidate };
