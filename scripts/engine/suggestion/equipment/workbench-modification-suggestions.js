/**
 * Workbench Modification Suggestions
 *
 * Scores modifications/templates in the customization workbench. Unlike store
 * item suggestions, this deliberately assumes the target item is intended for
 * use because the player opened the workbench to modify that item.
 */

import { scoreCandidateRouteFit } from "/systems/foundryvtt-swse/scripts/engine/suggestion/build-route-confidence-profile.js";
import { scoreStoreItemBudgetFit } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/store-suggestion-context.js";
import { scoreWeaponInvestmentFit } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/weapon-investment-profile.js";
import { evaluateArmorBenefit } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/armor-benefit-simulator.js";

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

function unique(values = []) {
  return Array.from(new Set(values.map(normalize).filter(Boolean)));
}

function itemText(item = {}) {
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
    sys.armorType,
    sys.armor_type,
    sys.description
  ].filter(Boolean).join(' ').toLowerCase();
}

function targetCategory(targetItem = {}) {
  const text = itemText(targetItem);
  if (targetItem.type === 'armor' || targetItem.type === 'bodysuit' || /armor|shield|vest|suit/.test(text)) return 'armor';
  if (targetItem.type === 'blaster' || targetItem.type === 'weapon' || /weapon|blaster|pistol|rifle|lightsaber|vibro|sword|blade/.test(text)) return 'weapon';
  return 'gear';
}

function targetTags(targetItem = {}) {
  const sys = targetItem.system || {};
  const tags = [
    targetItem.type,
    sys.group,
    sys.weaponGroup,
    sys.weapon_group,
    sys.weaponSubtype,
    sys.weapon_subtype,
    sys.category,
    sys.subcategory,
    sys.armorType,
    sys.armor_type,
    ...(Array.isArray(sys.tags) ? sys.tags : [])
  ];
  const text = itemText(targetItem);
  if (/lightsaber|light saber|saber/.test(text)) tags.push('lightsaber', 'jedi', 'force', 'melee');
  if (/pistol|hold\s*-?out/.test(text)) tags.push('pistol', 'ranged');
  if (/rifle|carbine/.test(text)) tags.push('rifle', 'ranged');
  if (/heavy weapon|launcher|repeating blaster|missile/.test(text)) tags.push('heavy_weapon', 'ranged');
  if (/grenade|detonator|explosive|mine/.test(text)) tags.push('grenade', 'explosives', 'area_damage');
  if (/vibro|sword|staff|blade|melee/.test(text)) tags.push('melee');
  if (/armor|shield|vest|suit/.test(text)) tags.push('armor', 'defense');
  if (/tool|kit|computer|slicer|security|sensor|medical|medpac/.test(text)) tags.push('tech', 'utility');
  return unique(tags);
}

function effectTags(modification = {}, targetItem = {}) {
  const effect = String(modification.effect || modification.rulesText || modification.description || '').toLowerCase();
  const name = String(modification.name || '').toLowerCase();
  const text = `${name} ${effect}`;
  const tags = [];

  if (/attack|target|aim|accur/.test(text)) tags.push('accuracy', 'attack');
  if (/damage|dmg|sharpen|edge|vibro/.test(text)) tags.push('damage');
  if (/autofire|burst|suppress/.test(text)) tags.push('autofire', 'ranged');
  if (/stealth|camouflage|sound|dampen/.test(text)) tags.push('stealth');
  if (/speed|move|mobility|joint|quick/.test(text)) tags.push('mobility');
  if (/dr|ed|reflect|reactive|plating|reinforced|resist|insulation|protect/.test(text)) tags.push('defense', 'armor');
  if (/medical|med\b|diagnostic|treat|heal/.test(text)) tags.push('medical', 'support');
  if (/sensor|percep|scan|tracking/.test(text)) tags.push('fieldcraft', 'perception');
  if (/computer|slicer|encrypt|secure|data|comlink|interface/.test(text)) tags.push('tech');
  if (/battery|power|cell|charge|reload|shots/.test(text)) tags.push('sustain', 'utility');
  if (/grip|balance|control|counterweight/.test(text)) tags.push('accuracy', 'control');
  if (/temperature|environment|seal|survival/.test(text)) tags.push('survival', 'fieldcraft');

  const tTags = targetTags(targetItem);
  if (tTags.includes('lightsaber')) tags.push('lightsaber', 'melee', 'jedi');
  if (tTags.includes('pistol')) tags.push('pistol', 'ranged');
  if (tTags.includes('rifle')) tags.push('rifle', 'ranged');
  if (tTags.includes('melee')) tags.push('melee');
  if (tTags.includes('armor')) tags.push('armor', 'defense');
  return unique(tags);
}

function estimateEffectValue(modification = {}, targetItem = {}) {
  const effect = String(modification.effect || modification.rulesText || '').toLowerCase();
  const name = String(modification.name || '').toLowerCase();
  const text = `${name} ${effect}`;
  let score = 0;
  const reasons = [];

  const attackMatch = effect.match(/\+\s*(\d+)\s*(?:attack|atk)/i);
  if (attackMatch) {
    const value = numberValue(attackMatch[1], 1);
    score += Math.min(12, 5 + value * 3);
    reasons.push(`adds +${value} attack accuracy`);
  }
  const damageMatch = effect.match(/\+\s*(\d+)\s*(?:damage|dmg)/i);
  if (damageMatch) {
    const value = numberValue(damageMatch[1], 1);
    score += Math.min(12, 4 + value * 3);
    reasons.push(`adds +${value} damage`);
  }
  if (/autofire|burst/.test(text)) {
    score += 7;
    reasons.push('adds a new firing mode');
  }
  if (/dr|plating|reinforced|reflect|reactive|energy dampener|ed\b/.test(text)) {
    score += 7;
    reasons.push('improves defensive profile');
  }
  if (/speed|mobility|joint|quick release/.test(text)) {
    score += 5;
    reasons.push('improves mobility or handling');
  }
  if (/stealth|sensor|percep|medical|med\b|encrypt|secure|comlink|computer|slicer|battery|power|charge/.test(text)) {
    score += 4;
    reasons.push('adds utility beyond raw combat stats');
  }
  if (!score) {
    score = 3;
    reasons.push('adds a narrow utility feature');
  }

  const category = targetCategory(targetItem);
  if (category === 'weapon' && /attack|damage|autofire|grip|balance|target|battery/.test(text)) score += 2;
  if (category === 'armor' && /dr|defense|mobility|stealth|medical|sensor|comlink|power/.test(text)) score += 2;
  if (category === 'gear' && /sensor|power|stealth|encrypt|release|seal|tactical|ergonomic/.test(text)) score += 2;

  return { score: Math.max(0, Math.min(18, score)), reasons: reasons.slice(0, 3) };
}

function scoreCostEfficiency(cost = 0, effectScore = 0, slotCost = 1, storeContext = {}) {
  const safeCost = Math.max(0, numberValue(cost, 0));
  const safeSlots = Math.max(1, numberValue(slotCost, 1));
  const perPoint = effectScore > 0 ? safeCost / effectScore : safeCost;
  let adjustment = 0;
  const reasons = [];

  if (safeCost <= 0) {
    adjustment += 2;
    reasons.push('no listed credit cost');
  } else if (perPoint <= 45) {
    adjustment += 4;
    reasons.push('efficient credits per useful benefit');
  } else if (perPoint <= 110) {
    adjustment += 2;
    reasons.push('reasonable cost for the projected benefit');
  } else if (perPoint >= 300) {
    adjustment -= 5;
    reasons.push('expensive for the projected benefit');
  } else if (perPoint >= 180) {
    adjustment -= 2;
    reasons.push('cost is high for the benefit');
  }

  if (safeSlots === 1) adjustment += 2;
  else if (safeSlots >= 3) {
    adjustment -= 4;
    reasons.push('uses several upgrade slots');
  } else if (safeSlots === 2) {
    adjustment -= 1;
    reasons.push('uses two upgrade slots');
  }

  const budget = scoreStoreItemBudgetFit({ system: { cost: safeCost } }, storeContext);
  adjustment += Math.max(-5, Math.min(2, budget.adjustment || 0));
  if (budget?.explanation) reasons.push(budget.explanation);

  return { adjustment, perPoint, slotCost: safeSlots, cost: safeCost, reasons: reasons.slice(0, 3), budget };
}

function tierFromScore(score) {
  if (score >= 36) return { key: 'strong', label: 'Strong Fit' };
  if (score >= 27) return { key: 'good', label: 'Good Upgrade' };
  if (score >= 18) return { key: 'side', label: 'Useful Side Upgrade' };
  if (score >= 10) return { key: 'weak', label: 'Low Value' };
  return { key: 'poor', label: 'Poor Fit' };
}

function buildCandidate(modification = {}, targetItem = {}) {
  const tags = unique([...targetTags(targetItem), ...effectTags(modification, targetItem)]);
  return {
    name: modification.name,
    label: modification.name,
    tags,
    system: { tags, effect: modification.effect, description: modification.description },
    context: { allTags: tags }
  };
}

function armorSpecificNotes(targetItem, modification, actor, options = {}) {
  if (targetCategory(targetItem) !== 'armor') return [];
  const notes = [];
  try {
    const benefit = evaluateArmorBenefit(targetItem, actor, options);
    if (benefit?.netDefenseDelta < 0) notes.push('Caution: this armor currently reduces your practical defenses before modifications.');
    else if (benefit?.netDefenseDelta === 0) notes.push('Baseline armor benefit is neutral; utility mods may be the main reason to customize it.');
    else if (benefit?.netDefenseDelta > 0) notes.push('This armor already provides a practical defensive gain, so upgrades build on a useful platform.');
    if (benefit?.dexCapLoss > 0 && /mobility|joint|stealth|speed/i.test(`${modification?.name || ''} ${modification?.effect || ''}`)) {
      notes.push('This helps address mobility pressure from the armor profile.');
    }
  } catch (_err) {
    // Optional explanation only.
  }
  return notes.slice(0, 2);
}

export function scoreWorkbenchModification({ actor, targetItem, modification, storeContext = {}, options = {} } = {}) {
  if (!targetItem || !modification) return null;
  const category = targetCategory(targetItem);
  const candidate = buildCandidate(modification, targetItem);
  const effect = estimateEffectValue(modification, targetItem);
  const routeFit = scoreCandidateRouteFit(candidate, storeContext?.routeProfile, options);
  const cost = numberValue(modification.costCredits ?? modification.costPreview ?? modification.cost, 0);
  const slotCost = numberValue(modification.slotCost, category === 'gear' ? 1 : 1);
  const efficiency = scoreCostEfficiency(cost, effect.score, slotCost, storeContext);

  let score = 8 + effect.score + efficiency.adjustment;
  const explanations = [
    'Workbench analysis assumes this item is intended for use.',
    ...effect.reasons
  ];

  if (routeFit?.label === 'primary') {
    score += 8;
    explanations.push(`reinforces your ${routeFit.topLabel || routeFit.topRoute || 'primary'} route`);
  } else if (routeFit?.label === 'secondary') {
    score += 5;
    explanations.push(`supports a secondary ${routeFit.topLabel || routeFit.topRoute || 'build'} lane`);
  } else if (routeFit?.label === 'latent') {
    score += 2;
    explanations.push('supports a latent side lane');
  } else {
    score -= 2;
    explanations.push('does not strongly match a current route');
  }

  if (category === 'weapon') {
    const investment = scoreWeaponInvestmentFit(targetItem, actor, {
      ...options,
      weaponInvestmentProfile: storeContext?.weaponInvestmentProfile,
      assumeTargetUsed: true
    });
    if (investment?.adjustment > 0) {
      score += Math.min(7, Math.max(1, investment.adjustment / 2));
      explanations.push('target weapon matches existing weapon investment');
    } else if (investment?.group) {
      explanations.push('weapon investment is still light for this group');
    }
  }

  const armorNotes = armorSpecificNotes(targetItem, modification, actor, { ...options, storeContext });
  if (armorNotes.length) explanations.push(...armorNotes);

  if (options.disabled) {
    score -= 12;
    explanations.push('cannot be selected until enough upgrade slots are available');
  }
  if (options.installed) {
    score += 3;
    explanations.push('already installed on this item');
  }

  const finalScore = Math.max(0, Math.min(48, Math.round(score)));
  const tier = tierFromScore(finalScore);
  return {
    score: finalScore,
    tier: tier.key,
    tierLabel: tier.label,
    routeFit,
    effectScore: effect.score,
    costEfficiency: efficiency,
    targetAssumption: 'intended-use',
    explanations: Array.from(new Set(explanations.concat(efficiency.reasons))).slice(0, 5)
  };
}

export function applyWorkbenchModificationSuggestions({ actor, targetItem, cards = [], storeContext = {}, options = {} } = {}) {
  return (cards || []).map(card => {
    const suggestion = scoreWorkbenchModification({
      actor,
      targetItem,
      modification: card,
      storeContext,
      options: {
        ...options,
        disabled: !!card.disabled,
        installed: !!card.installed
      }
    });
    return { ...card, suggestion };
  });
}

export default scoreWorkbenchModification;
