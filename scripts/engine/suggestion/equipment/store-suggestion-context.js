/**
 * Store Suggestion Context
 *
 * Store-facing adapter for the progression suggestion intelligence. This keeps
 * store recommendations aligned with the same build identity/loadout signals
 * used by feat, talent, Force, and class suggestions without making the store
 * depend on progression UI state.
 */

import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
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
  if (/medical|medpac|medkit|surgery|first aid/.test(text)) tags.push('medical', 'support');
  if (/toolkit|tool kit|mechanic|repair/.test(text)) tags.push('toolkit', 'tech');
  if (/security kit|slicer|computer|interface|spike/.test(text)) tags.push('security', 'tech');
  if (/survival|field kit|breath mask|sensor|climbing/.test(text)) tags.push('survival', 'fieldcraft');
  if (/dual|two weapon|offhand|off-hand|jar'?kai/.test(text)) tags.push('dual_wield');

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

  return {
    actorId: actor?.id || null,
    actorName: actor?.name || '',
    credits: Math.max(0, numberValue(credits, 0)),
    buildIntent,
    equipmentProfile,
    routeProfile,
    routeSummary: summarizeRouteConfidenceProfile(routeProfile),
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

  return {
    tags,
    routeFit,
    loadoutFit: {
      score: normalizedLoadout,
      matches: loadoutMatches.slice(0, 6),
      adjustment: loadoutAdjustment
    },
    budget,
    adjustment: routeAdjustment + loadoutAdjustment + budget.adjustment,
    cappedAdjustment: Math.max(-8, Math.min(12, routeAdjustment + loadoutAdjustment + budget.adjustment)),
    explanations: buildStoreContextExplanations(routeFit, loadoutMatches, budget)
  };
}

export function buildStoreContextExplanations(routeFit, loadoutMatches = [], budget = {}) {
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

  if (budget?.explanation) explanations.push(budget.explanation);
  return explanations.slice(0, 3);
}

export default buildStoreSuggestionContext;
