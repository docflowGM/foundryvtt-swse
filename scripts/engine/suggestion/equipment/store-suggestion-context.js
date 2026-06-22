/**
 * Store Suggestion Context
 *
 * Store-facing adapter for the progression suggestion intelligence. This keeps
 * store recommendations aligned with the same build identity/loadout signals
 * used by feat, talent, Force, and class suggestions without making the store
 * depend on progression UI state.
 */

import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { buildWeaponInvestmentProfile } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/weapon-investment-profile.js";
import { BuildIntent } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIntent.js";
import { buildEquipmentLoadoutProfile, getLoadoutTagWeight } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment-loadout-profile.js";
import {
  buildRouteConfidenceProfile,
  scoreCandidateRouteFit,
  summarizeRouteConfidenceProfile
} from "/systems/foundryvtt-swse/scripts/engine/suggestion/build-route-confidence-profile.js";

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
  const raw = value?.value ?? value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function unique(values = []) {
  return Array.from(new Set(values.map(normalize).filter(Boolean)));
}

function summarizeActorStoreState(actor, credits = 0) {
  const items = Array.from(actor?.items || [])
    .map(item => {
      const sys = item.system || {};
      return [
        item.id || item._id || '',
        item.type || '',
        item.name || '',
        sys.equipped === true ? 'eq' : '',
        sys.quantity ?? sys.qty ?? '',
        sys.group || sys.weaponGroup || sys.category || '',
        sys.armorType || sys.armor_type || '',
        sys.modifiedTime || item.modifiedTime || item.updatedTime || ''
      ].join(':');
    })
    .sort()
    .join('|');
  const sys = actor?.system || {};
  const version = actor?._stats?.modifiedTime || actor?.modifiedTime || actor?.updatedTime || '';
  return [actor?.id || '', version, numberValue(credits, 0), numberValue(sys.credits, 0), items].join('::');
}

export function buildStoreSuggestionContextCacheKey(actor, options = {}) {
  return summarizeActorStoreState(actor, options.credits ?? 0);
}

function itemText(item) {
  const sys = item?.system || {};
  return [
    item?.name,
    item?.type,
    sys.group,
    sys.weaponGroup,
    sys.category,
    sys.subcategory,
    sys.type,
    sys.subtype,
    sys.role,
    sys.description,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function getStoreItemCost(item) {
  const sys = item?.system || {};
  const candidates = [
    item?.finalCost,
    item?.cost,
    sys.finalCost,
    sys.final_cost,
    sys.finalPrice,
    sys.final_price,
    sys.price,
    sys.cost,
    sys.credits,
    sys.purchasePrice,
    sys.purchase_price,
  ];

  for (const candidate of candidates) {
    const n = numberValue(candidate, NaN);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function extractStoreItemTags(item) {
  const sys = item?.system || {};
  const tags = [];
  const add = value => { if (value != null) tags.push(value); };

  add(item?.type);
  add(sys.group);
  add(sys.weaponGroup);
  add(sys.weapon_group);
  add(sys.category);
  add(sys.subcategory);
  add(sys.type);
  add(sys.subtype);
  add(sys.role);
  add(sys.armorCategory);
  add(sys.armor_category);

  if (Array.isArray(sys.tags)) tags.push(...sys.tags);
  if (Array.isArray(sys.keywords)) tags.push(...sys.keywords);
  if (Array.isArray(sys.traits)) tags.push(...sys.traits);

  const text = itemText(item);
  if (/lightsaber|light saber|saber/.test(text)) tags.push('lightsaber', 'melee', 'jedi_gear', 'force');
  if (/pistol|hold\s*-?out/.test(text)) tags.push('pistol', 'ranged');
  if (/rifle|carbine/.test(text)) tags.push('rifle', 'ranged');
  if (/heavy weapon|launcher|repeating blaster|missile/.test(text)) tags.push('heavy_weapon', 'ranged');
  if (/grenade|detonator|detonite|mine|explosive|charge/.test(text)) tags.push('grenade', 'explosives', 'area_damage');
  if (/vibro|sword|staff|blade|melee/.test(text)) tags.push('melee');
  if (/armor|vest|suit|battle armor|combat jumpsuit/.test(text)) tags.push('armor', 'defense');
  if (/heavy armor|battle armor|powered armor/.test(text) || /heavy/i.test(String(sys.armorType || sys.armor_type || sys.category || ''))) tags.push('heavy_armor', 'armor', 'defense');
  if (/medium armor/.test(text) || /medium/i.test(String(sys.armorType || sys.armor_type || sys.category || ''))) tags.push('medium_armor', 'armor', 'defense');
  if (/light armor|combat jumpsuit|armored flight suit/.test(text) || /light/i.test(String(sys.armorType || sys.armor_type || sys.category || ''))) tags.push('light_armor', 'armor', 'defense');
  if (/medical|medpac|medkit|surgery|first aid/.test(text)) tags.push('medical', 'support');
  if (/toolkit|tool kit|mechanic|repair/.test(text)) tags.push('toolkit', 'tech');
  if (/security kit|slicer|computer|interface|spike/.test(text)) tags.push('security', 'tech');
  if (/survival|field kit|breath mask|sensor|climbing/.test(text)) tags.push('survival', 'fieldcraft');
  if (/dual|two weapon|offhand|off-hand|jar'?kai/.test(text)) tags.push('dual_wield');
  if (/droid|astromech|protocol|probe|battle droid|assassin droid/.test(text) || item?.type === 'droid') tags.push('droid', 'asset');
  if (/astromech|utility droid|repair droid|mechanic/.test(text)) tags.push('astromech', 'tech', 'repair');
  if (/protocol|translator|diplomat|etiquette/.test(text)) tags.push('protocol', 'social', 'leadership');
  if (/medical droid|surgical droid|medic/.test(text)) tags.push('medical', 'support');
  if (/probe|recon|scout|sensor|surveillance/.test(text)) tags.push('scout', 'fieldcraft', 'perception');
  if (/battle droid|combat droid|assassin droid|war droid|destroyer droid/.test(text)) tags.push('combat_droid', 'martial');
  if (/vehicle|starship|ship|speeder|swoop|walker|transport|freighter|shuttle|fighter/.test(text) || item?.type === 'vehicle') tags.push('vehicle', 'asset', 'mobility');
  if (/starfighter|fighter|interceptor|bomber/.test(text)) tags.push('starfighter', 'pilot', 'combat');
  if (/transport|freighter|shuttle|courier/.test(text)) tags.push('transport', 'pilot', 'party_asset');
  if (/speeder|swoop|bike|landspeeder/.test(text)) tags.push('speeder', 'pilot', 'fieldcraft');
  if (/walker|tank|gunship/.test(text)) tags.push('military_vehicle', 'heavy_weapon', 'martial');

  return unique(tags);
}

export async function buildStoreSuggestionContext(actor, options = {}) {
  const equipmentProfile = options.equipmentProfile || buildEquipmentLoadoutProfile(actor);
  let buildIntent = options.buildIntent || null;
  if (!buildIntent) {
    try {
      buildIntent = await BuildIntent.analyze(actor, options.pendingData || {});
    } catch (_err) {
      buildIntent = {};
    }
  }

  const routeProfile = options.routeProfile || buildRouteConfidenceProfile(actor, buildIntent, { equipmentProfile });
  let credits = numberValue(options.credits, NaN);
  if (!Number.isFinite(credits)) {
    try { credits = LedgerService.getCurrentCredits(actor); }
    catch (_err) { credits = 0; }
  }

  const weaponInvestmentProfile = options.weaponInvestmentProfile
    || buildWeaponInvestmentProfile(actor, { equipmentProfile });

  return {
    actorId: actor?.id || null,
    actorName: actor?.name || '',
    credits: Math.max(0, numberValue(credits, 0)),
    buildIntent,
    equipmentProfile,
    routeProfile,
    routeSummary: summarizeRouteConfidenceProfile(routeProfile),
    weaponInvestmentProfile,
    generatedAt: Date.now()
  };
}

export function scoreStoreItemBudgetFit(item, storeContext = {}) {
  const cost = getStoreItemCost(item);
  const credits = Math.max(0, numberValue(storeContext?.credits, 0));
  if (!cost || cost <= 0) {
    return { cost, credits, label: 'unknown', adjustment: 0, affordable: true, ratio: 0, explanation: null };
  }

  const ratio = credits > 0 ? cost / credits : Infinity;
  let label = 'standard';
  let adjustment = 0;
  let affordable = credits >= cost;

  if (!credits) {
    label = 'no_budget';
    adjustment = -6;
    affordable = false;
  } else if (ratio <= 0.25) {
    label = 'cheap';
    adjustment = 2;
  } else if (ratio <= 0.75) {
    label = 'affordable';
    adjustment = 1;
  } else if (ratio <= 1.0) {
    label = 'major_purchase';
    adjustment = -1;
  } else if (ratio <= 2.0) {
    label = 'over_budget';
    adjustment = -5;
  } else {
    label = 'far_over_budget';
    adjustment = -8;
  }

  const explanation = affordable
    ? (label === 'major_purchase' ? 'Major purchase for current credits' : 'Within current credits')
    : 'Currently outside available credits';

  return { cost, credits, label, adjustment, affordable, ratio, explanation };
}


const STORE_OFF_ROUTE_LANE_TAGS = new Set([
  'grenade', 'grenades', 'explosives', 'explosive', 'area_damage', 'area_pressure',
  'heavy_weapon', 'artillery', 'autofire', 'burst', 'military_armor', 'heavy_armor'
]);

const STORE_ROUTE_PROTECTION_TAGS = new Set([
  'lightsaber', 'jedi', 'force', 'melee', 'pistol', 'rifle', 'armor', 'defense',
  'tech', 'medical', 'fieldcraft', 'stealth', 'social', 'leadership',
  'droid', 'vehicle', 'pilot', 'transport', 'party_asset', 'repair'
]);

function routeEntry(profile, route) {
  return profile?.routes?.[normalize(route)] || null;
}

function hasRouteConfidence(profile, routes = [], minScore = 0.34) {
  for (const route of routes) {
    const entry = routeEntry(profile, route);
    if (entry && Number(entry.score || 0) >= minScore && !entry.accessOnly) return true;
  }
  return false;
}

function hasLoadoutEvidence(storeContext = {}, tags = []) {
  const profile = storeContext?.equipmentProfile || {};
  const weights = profile.tagWeights || {};
  return tags.some(tag => Number(weights[normalize(tag)] || weights[String(tag)] || 0) >= 0.55);
}

function evaluateStoreRouteGuard(tags = [], storeContext = {}, item = {}) {
  const tagSet = new Set((tags || []).map(normalize).filter(Boolean));
  const routeProfile = storeContext?.routeProfile || {};
  const explanations = [];
  let adjustment = 0;
  let label = 'clear';

  const isTacticalSideLane = [...tagSet].some(tag => STORE_OFF_ROUTE_LANE_TAGS.has(tag));
  const isForceOrJediPrimary = hasRouteConfidence(routeProfile, ['jedi', 'force', 'force_power', 'lightsaber'], 0.45);
  const hasExplosiveEvidence = hasRouteConfidence(routeProfile, ['explosives', 'heavy_weapon', 'ranged'], 0.42)
    || hasLoadoutEvidence(storeContext, ['grenade', 'explosives', 'heavy_weapon', 'area_damage']);

  if (isTacticalSideLane && isForceOrJediPrimary && !hasExplosiveEvidence) {
    adjustment -= 10;
    label = 'off_route_tactical';
    explanations.push('Off-route tactical item: not promoted without explosives/heavy-weapon evidence.');
  }

  const armorItem = tagSet.has('armor') || tagSet.has('heavy_armor') || /armor|shield|vest|suit/i.test(String(item?.name || ''));
  const armorRoute = hasRouteConfidence(routeProfile, ['armor', 'defense'], 0.38) || hasLoadoutEvidence(storeContext, ['armor', 'defense']);
  const mobilityOrDexRoute = hasRouteConfidence(routeProfile, ['mobility', 'stealth'], 0.48);
  if (armorItem && !armorRoute && mobilityOrDexRoute && tagSet.has('heavy_armor')) {
    adjustment -= 6;
    label = label === 'clear' ? 'armor_caution' : label;
    explanations.push('Heavy armor is cautious for a mobility route unless armor investment appears.');
  }

  const protectedMatch = [...tagSet].some(tag => STORE_ROUTE_PROTECTION_TAGS.has(tag));
  if (label === 'clear' && protectedMatch) {
    adjustment += 0;
  }

  return { label, adjustment, explanations };
}

export function scoreStoreItemContextFit(item, storeContext = {}, options = {}) {
  const tags = extractStoreItemTags(item);
  const candidate = {
    id: item?.id,
    name: item?.name,
    type: item?.type,
    tags,
    system: { ...(item?.system || {}), tags },
    context: { allTags: tags }
  };

  const routeFit = scoreCandidateRouteFit(candidate, storeContext?.routeProfile, options);
  let loadoutScore = 0;
  const loadoutMatches = [];
  for (const tag of tags) {
    const weight = getLoadoutTagWeight(storeContext?.equipmentProfile, tag);
    if (weight > 0) {
      loadoutScore += weight;
      loadoutMatches.push({ tag, weight });
    }
  }

  loadoutMatches.sort((a, b) => b.weight - a.weight || a.tag.localeCompare(b.tag));
  const normalizedLoadout = Math.max(0, Math.min(1, loadoutScore / 4));
  const routeAdjustment = routeFit.label === 'primary' ? Math.min(8, 2 + routeFit.score * 8)
    : routeFit.label === 'secondary' ? Math.min(5, 1 + routeFit.score * 6)
      : routeFit.label === 'latent' ? Math.min(3, routeFit.score * 5)
        : 0;
  const loadoutAdjustment = Math.min(6, normalizedLoadout * 6);
  const budget = scoreStoreItemBudgetFit(item, storeContext);
  const routeGuard = evaluateStoreRouteGuard(tags, storeContext, item);
  const rawAdjustment = routeAdjustment + loadoutAdjustment + budget.adjustment + routeGuard.adjustment;

  return {
    tags,
    routeFit,
    routeGuard,
    loadoutFit: {
      score: normalizedLoadout,
      matches: loadoutMatches.slice(0, 6),
      adjustment: loadoutAdjustment
    },
    budget,
    adjustment: rawAdjustment,
    cappedAdjustment: Math.max(-12, Math.min(12, rawAdjustment)),
    explanations: buildStoreContextExplanations(routeFit, loadoutMatches, budget, routeGuard)
  };
}

export function buildStoreContextExplanations(routeFit, loadoutMatches = [], budget = {}, routeGuard = null) {
  const explanations = [];
  if (routeFit?.label === 'primary') {
    explanations.push(`Strong match for your ${routeFit.topLabel || routeFit.topRoute || 'current'} route`);
  } else if (routeFit?.label === 'secondary') {
    explanations.push(`Supports a secondary ${routeFit.topLabel || routeFit.topRoute || 'build'} lane`);
  } else if (routeFit?.label === 'latent') {
    explanations.push('Opens or supports a latent side lane');
  }

  const topLoadout = loadoutMatches?.[0];
  if (topLoadout?.tag) {
    explanations.push(`Matches your current loadout: ${String(topLoadout.tag).replace(/_/g, ' ')}`);
  }

  if (routeGuard?.explanations?.length) explanations.push(...routeGuard.explanations);
  if (budget?.explanation) explanations.push(budget.explanation);
  return explanations.slice(0, 4);
}

export default buildStoreSuggestionContext;
