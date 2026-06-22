/**
 * Armor Benefit Simulator
 *
 * Store-side armor scoring should answer the practical question:
 * "If this actor wore this armor, would their defenses and mobility improve?"
 *
 * This helper mirrors the armor-related portions of derived defense math without
 * recalculating the entire actor.  Common class/misc/species/state terms cancel
 * out, so the simulator compares only the armor-controlled pieces:
 * - Reflex level/armor contribution
 * - Max Dex cap impact
 * - Fortitude equipment bonus from proficient armor
 * - Armor check penalty only when the actor lacks proficiency for the armor type
 * - Energy shields as SR/cost items rather than body-armor Reflex replacements
 */

import {
  actorHasArmorProficiencyForArmor,
  actorHasArmorProficiencyForType,
  getArmorProficiencyPenalty,
  isEnergyShieldItem,
  normalizeArmorType,
  resolveArmorData
} from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

function number(value, fallback = 0) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['total', 'value', 'mod', 'current', 'base']) {
      if (value[key] !== undefined && value[key] !== null && value[key] !== '') return number(value[key], fallback);
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function itemName(item) {
  return String(item?.name ?? item?.system?.name ?? '').trim();
}

function lowerTokens(...values) {
  return values.filter(Boolean).join(' ').toLowerCase();
}

function hasNamedTalent(actor, exactName) {
  const wanted = String(exactName || '').trim().toLowerCase();
  if (!wanted) return false;
  return Array.from(actor?.items ?? []).some(item => item?.type === 'talent' && String(item?.name || '').trim().toLowerCase() === wanted);
}

function talentText(item) {
  const description = item?.system?.description;
  return lowerTokens(
    item?.name,
    item?.system?.benefit,
    typeof description === 'string' ? description : description?.value,
    item?.system?.category,
    item?.system?.treeId,
    item?.system?.talent_tree,
    item?.system?.tree
  );
}

function hasArmorSpecialistArmorMastery(actor) {
  return Array.from(actor?.items ?? []).some(item => {
    if (item?.type !== 'talent') return false;
    if (String(item?.name || '').trim().toLowerCase() !== 'armor mastery') return false;
    const treeId = String(item?.system?.treeId || '').trim();
    const text = talentText(item);
    return treeId === '17cec542331cb4e4'
      || text.includes('maximum dexterity')
      || text.includes('max dexterity')
      || text.includes('max dex');
  });
}

function hasKnightArmorMastery(actor) {
  return Array.from(actor?.items ?? []).some(item => {
    if (item?.type !== 'talent') return false;
    if (String(item?.name || '').trim().toLowerCase() !== 'armor mastery') return false;
    const treeId = String(item?.system?.treeId || '').trim();
    const text = talentText(item);
    return treeId === 'ea01d740c91888b3'
      || (text.includes('heroic level') && text.includes('half armor bonus'))
      || text.includes('counts as armored and improved armored defense');
  });
}

function hasSecondSkin(actor) {
  return hasNamedTalent(actor, 'Second Skin');
}

function getActorLevel(actor) {
  const system = actor?.system ?? {};
  return Math.max(1,
    number(system.level?.value, NaN)
    || number(system.details?.level?.value, NaN)
    || number(system.heroicLevel, NaN)
    || number(system.level, 1)
  );
}

function getDexMod(actor) {
  const system = actor?.system ?? {};
  const candidates = [
    system.attributes?.dex?.mod,
    system.attributes?.dex?.modifier,
    system.attributes?.dex?.totalMod,
    system.abilities?.dex?.mod,
    system.abilities?.dex?.modifier
  ];
  for (const candidate of candidates) {
    const n = number(candidate, NaN);
    if (Number.isFinite(n)) return n;
  }
  const score = number(system.attributes?.dex?.total ?? system.attributes?.dex?.value ?? system.abilities?.dex?.value, NaN);
  if (Number.isFinite(score)) return Math.floor((score - 10) / 2);
  return 0;
}

function getBodyArmorType(item, armorData = null) {
  if (!item) return '';
  const system = item.system ?? item ?? {};
  const rawType = normalizeArmorType(
    system.armorProficiencyRequired
    || system.armorType
    || system.category
    || system.subtype
    || system.type
    || armorData?.armorType
    || '',
    ''
  );
  if (rawType && rawType !== 'shield') return rawType;
  const text = lowerTokens(itemName(item), system.armorType, system.category, system.subtype, system.type);
  if (text.includes('heavy')) return 'heavy';
  if (text.includes('medium')) return 'medium';
  if (text.includes('light')) return 'light';
  return armorData?.armorType && armorData.armorType !== 'shield' ? armorData.armorType : 'light';
}

function getShieldType(item) {
  return getBodyArmorType(item, resolveArmorData(item));
}

function isArmorProficient(actor, item, armorData = null) {
  const data = armorData ?? resolveArmorData(item);
  if (!data?.isEnergyShield) return actorHasArmorProficiencyForArmor(actor, item);
  const shieldType = getShieldType(item);
  return actorHasArmorProficiencyForType(actor, shieldType);
}

function normalizePenalty(value, fallback = 0) {
  const n = number(value, fallback);
  if (!Number.isFinite(n) || n === 0) return 0;
  return n > 0 ? -n : n;
}

function effectiveArmorCheckPenalty(actor, item, armorData = null, proficient = null) {
  const data = armorData ?? resolveArmorData(item);
  const isProficient = proficient ?? isArmorProficient(actor, item, data);
  if (isProficient) return 0;
  const requiredType = data.isEnergyShield ? getShieldType(item) : getBodyArmorType(item, data);
  const listedPenalty = normalizePenalty(data.armorCheckPenalty, 0);
  const fallbackPenalty = normalizePenalty(getArmorProficiencyPenalty(requiredType), 0);
  return listedPenalty || fallbackPenalty;
}

function equippedBodyArmor(actor) {
  return Array.from(actor?.items ?? []).find(item => item?.type === 'armor' && item?.system?.equipped && !isEnergyShieldItem(item)) ?? null;
}

function simulateBodyArmorContribution(actor, armorItem = null) {
  const heroicLevel = getActorLevel(actor);
  const dexMod = getDexMod(actor);
  const knightArmorMastery = hasKnightArmorMastery(actor);
  const talents = {
    armoredDefense: hasNamedTalent(actor, 'Armored Defense') || knightArmorMastery,
    improvedArmoredDefense: hasNamedTalent(actor, 'Improved Armored Defense') || knightArmorMastery,
    armorMastery: hasArmorSpecialistArmorMastery(actor),
    secondSkin: hasSecondSkin(actor)
  };

  if (!armorItem) {
    return {
      armorName: 'No armor',
      armorType: 'none',
      proficient: true,
      heroicLevel,
      reflexArmorBonus: 0,
      fortitudeArmorBonus: 0,
      maxDexBonus: null,
      effectiveMaxDexBonus: null,
      dexMod,
      effectiveDexMod: dexMod,
      dexLostToCap: 0,
      reflexLevelTerm: heroicLevel,
      reflexContribution: heroicLevel + dexMod,
      fortitudeContribution: 0,
      armorCheckPenalty: 0,
      speedPenalty: 0,
      talents
    };
  }

  const data = resolveArmorData(armorItem);
  const armorType = getBodyArmorType(armorItem, data);
  const proficient = isArmorProficient(actor, armorItem, data);
  let reflexArmorBonus = number(data.reflexBonus, 0);
  let fortitudeArmorBonus = proficient ? number(data.fortitudeBonus, 0) : 0;
  if (proficient && talents.secondSkin) {
    reflexArmorBonus += 1;
    fortitudeArmorBonus += 1;
  }

  let effectiveDexMod = dexMod;
  const maxDex = data.maxDexBonus;
  let effectiveMaxDexBonus = null;
  if (Number.isFinite(Number(maxDex))) {
    effectiveMaxDexBonus = Number(maxDex) + (proficient && talents.armorMastery ? 1 : 0);
    effectiveDexMod = Math.min(dexMod, effectiveMaxDexBonus);
  }

  let reflexLevelTerm;
  if (proficient && talents.improvedArmoredDefense) {
    reflexLevelTerm = Math.max(heroicLevel + Math.floor(reflexArmorBonus / 2), reflexArmorBonus);
  } else if (proficient && talents.armoredDefense) {
    reflexLevelTerm = Math.max(heroicLevel, reflexArmorBonus);
  } else {
    reflexLevelTerm = reflexArmorBonus;
  }

  return {
    armorName: itemName(armorItem),
    armorType,
    proficient,
    heroicLevel,
    reflexArmorBonus,
    fortitudeArmorBonus,
    maxDexBonus: Number.isFinite(Number(maxDex)) ? Number(maxDex) : null,
    effectiveMaxDexBonus,
    dexMod,
    effectiveDexMod,
    dexLostToCap: Math.max(0, dexMod - effectiveDexMod),
    reflexLevelTerm,
    reflexContribution: reflexLevelTerm + effectiveDexMod,
    fortitudeContribution: fortitudeArmorBonus,
    armorCheckPenalty: effectiveArmorCheckPenalty(actor, armorItem, data, proficient),
    speedPenalty: number(data.speedPenalty, 0),
    talents
  };
}

function costOf(item, armorData = null) {
  const data = armorData ?? resolveArmorData(item);
  const system = item?.system ?? {};
  return Math.max(0, number(item?.finalCost, NaN) || number(data.cost, NaN) || number(system.cost, NaN) || number(system.price, NaN) || number(system.value, 0));
}

function protectionPoints(delta) {
  return Math.max(0, delta.reflexDelta) + Math.max(0, delta.fortitudeDelta) * 0.75;
}

function peerValueAdjustment(actor, armor, candidateDelta, options = {}) {
  const peers = Array.isArray(options.peerArmorOptions) ? options.peerArmorOptions : Array.isArray(options.allArmorOptions) ? options.allArmorOptions : [];
  if (peers.length < 2) return { score: 0, band: 'unknown', explanation: null, creditsPerPoint: null, medianCreditsPerPoint: null };

  const data = resolveArmorData(armor);
  if (data.isEnergyShield) return shieldPeerValueAdjustment(actor, armor, candidateDelta, peers);

  const candidateType = getBodyArmorType(armor, data);
  const comparable = peers.filter(peer => {
    if (!peer || peer === armor || peer.type !== 'armor') return false;
    const peerData = resolveArmorData(peer);
    if (peerData.isEnergyShield) return false;
    return getBodyArmorType(peer, peerData) === candidateType;
  });

  const candidatePoints = protectionPoints(candidateDelta);
  const candidateCost = costOf(armor, data);
  if (candidatePoints <= 0 || candidateCost <= 0 || comparable.length < 2) {
    if (candidateCost > 1000 && candidatePoints <= 0) {
      return { score: -8, band: 'no-benefit-expensive', explanation: 'Poor value: you are paying for armor that gives no net defense gain.', creditsPerPoint: null, medianCreditsPerPoint: null };
    }
    return { score: 0, band: 'not-comparable', explanation: null, creditsPerPoint: null, medianCreditsPerPoint: null };
  }

  const ratios = [];
  for (const peer of comparable) {
    const peerData = resolveArmorData(peer);
    const baseline = simulateBodyArmorContribution(actor, equippedBodyArmor(actor));
    const peerSim = simulateBodyArmorContribution(actor, peer);
    const peerDelta = {
      reflexDelta: peerSim.reflexContribution - baseline.reflexContribution,
      fortitudeDelta: peerSim.fortitudeContribution - baseline.fortitudeContribution
    };
    const points = protectionPoints(peerDelta);
    const price = costOf(peer, peerData);
    if (points > 0 && price > 0) ratios.push(price / points);
  }

  if (!ratios.length) return { score: 0, band: 'not-comparable', explanation: null, creditsPerPoint: candidateCost / candidatePoints, medianCreditsPerPoint: null };
  ratios.sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  const creditsPerPoint = candidateCost / candidatePoints;
  const relative = median > 0 ? creditsPerPoint / median : 1;

  if (relative <= 0.65) {
    return { score: 6, band: 'excellent-value', explanation: `Excellent value: about ${Math.round(creditsPerPoint).toLocaleString()} credits per useful defense point.`, creditsPerPoint, medianCreditsPerPoint: median };
  }
  if (relative <= 0.9) {
    return { score: 3, band: 'good-value', explanation: `Good value for its armor class: about ${Math.round(creditsPerPoint).toLocaleString()} credits per useful defense point.`, creditsPerPoint, medianCreditsPerPoint: median };
  }
  if (relative >= 1.8) {
    return { score: -8, band: 'poor-value', explanation: `Poor value for its armor class: about ${Math.round(creditsPerPoint).toLocaleString()} credits per useful defense point.`, creditsPerPoint, medianCreditsPerPoint: median };
  }
  if (relative >= 1.25) {
    return { score: -4, band: 'pricey-value', explanation: `Pricey for its benefit: about ${Math.round(creditsPerPoint).toLocaleString()} credits per useful defense point.`, creditsPerPoint, medianCreditsPerPoint: median };
  }

  return { score: 0, band: 'fair-value', explanation: null, creditsPerPoint, medianCreditsPerPoint: median };
}

function shieldPeerValueAdjustment(actor, armor, shieldDelta, peers = []) {
  const data = resolveArmorData(armor);
  const shieldType = getShieldType(armor);
  const sr = Math.max(0, number(data.shieldRating, 0));
  const price = costOf(armor, data);
  if (!sr || price <= 0) return { score: 0, band: 'not-comparable', explanation: null, creditsPerPoint: null, medianCreditsPerPoint: null };

  const ratios = [];
  for (const peer of peers) {
    if (!peer || peer === armor || peer.type !== 'armor') continue;
    const peerData = resolveArmorData(peer);
    if (!peerData.isEnergyShield) continue;
    if (getShieldType(peer) !== shieldType) continue;
    const peerSr = Math.max(0, number(peerData.shieldRating, 0));
    const peerPrice = costOf(peer, peerData);
    if (peerSr > 0 && peerPrice > 0) ratios.push(peerPrice / peerSr);
  }
  if (!ratios.length) return { score: 0, band: 'not-comparable', explanation: null, creditsPerPoint: price / sr, medianCreditsPerPoint: null };
  ratios.sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  const creditsPerPoint = price / sr;
  const relative = median > 0 ? creditsPerPoint / median : 1;
  if (relative <= 0.7) return { score: 4, band: 'excellent-shield-value', explanation: `Efficient shield value: about ${Math.round(creditsPerPoint).toLocaleString()} credits per SR.`, creditsPerPoint, medianCreditsPerPoint: median };
  if (relative >= 1.4) return { score: -5, band: 'poor-shield-value', explanation: `Expensive shield value: about ${Math.round(creditsPerPoint).toLocaleString()} credits per SR.`, creditsPerPoint, medianCreditsPerPoint: median };
  return { score: 0, band: 'fair-shield-value', explanation: null, creditsPerPoint, medianCreditsPerPoint: median };
}

function scoreBodyArmorDelta(delta, candidate) {
  const weightedDelta = delta.reflexDelta + delta.fortitudeDelta * 0.75;
  let score = 0;

  if (weightedDelta < 0) {
    score -= 22 + Math.min(18, Math.abs(weightedDelta) * 5);
  } else if (weightedDelta === 0) {
    score += 4;
  } else {
    score += 7 + Math.min(24, weightedDelta * 5);
  }

  if (candidate.dexLostToCap > 0) score -= Math.min(14, candidate.dexLostToCap * 4);
  if (candidate.armorCheckPenalty < 0) score -= Math.min(16, Math.abs(candidate.armorCheckPenalty) * 1.5);
  if (candidate.speedPenalty < 0) score -= Math.min(8, Math.abs(candidate.speedPenalty));
  return Math.max(-45, Math.min(35, score));
}

function bodyArmorExplanations(armor, baseline, candidate, delta, value) {
  const explanations = [];
  const weightedDelta = delta.reflexDelta + delta.fortitudeDelta * 0.75;

  if (weightedDelta < 0) {
    explanations.push(`Wearing this would reduce your survivability: Reflex ${formatSigned(delta.reflexDelta)}, Fortitude ${formatSigned(delta.fortitudeDelta)}.`);
  } else if (weightedDelta === 0) {
    explanations.push('Wearing this gives no net Reflex/Fortitude increase, so its value is mostly fringe features or upgrade slots.');
  } else {
    explanations.push(`Wearing this improves your defenses: Reflex ${formatSigned(delta.reflexDelta)}, Fortitude ${formatSigned(delta.fortitudeDelta)}.`);
  }

  if (!candidate.proficient) {
    explanations.push(`You are not proficient with ${candidate.armorType} armor; its armor check penalty applies (${candidate.armorCheckPenalty}).`);
  } else if (candidate.armorCheckPenalty === 0) {
    explanations.push(`You are proficient with ${candidate.armorType} armor, so armor check penalty is ignored.`);
  }

  if (candidate.dexLostToCap > 0) {
    explanations.push(`Max Dex cap cuts ${candidate.dexLostToCap} point${candidate.dexLostToCap === 1 ? '' : 's'} from your Dexterity bonus.`);
  }

  if (candidate.talents.improvedArmoredDefense) {
    explanations.push('Improved Armored Defense lets this armor scale with your heroic level.');
  } else if (candidate.talents.armoredDefense) {
    explanations.push('Armored Defense prevents this armor from falling behind your heroic level.');
  } else if (candidate.heroicLevel >= 6 && candidate.reflexArmorBonus <= candidate.heroicLevel) {
    explanations.push('Without Armored Defense, this armor replaces your heroic Reflex contribution instead of stacking with it.');
  }

  if (value?.explanation) explanations.push(value.explanation);
  return explanations;
}

function formatSigned(value) {
  const n = Number(value) || 0;
  if (n > 0) return `+${n}`;
  return String(n);
}

function evaluateEnergyShield(armor, actor, options = {}) {
  const data = resolveArmorData(armor);
  const shieldType = getShieldType(armor);
  const proficient = isArmorProficient(actor, armor, data);
  const armorCheckPenalty = effectiveArmorCheckPenalty(actor, armor, data, proficient);
  const shieldRating = Math.max(0, number(data.shieldRating, 0));
  const maxDex = Number.isFinite(Number(data.maxDexBonus)) ? Number(data.maxDexBonus) : null;
  const dexMod = getDexMod(actor);
  const dexLostToCap = maxDex === null ? 0 : Math.max(0, dexMod - maxDex);

  let score = shieldRating > 0 ? Math.min(22, 4 + shieldRating * 0.45) : 0;
  if (!proficient && armorCheckPenalty < 0) score -= Math.min(16, Math.abs(armorCheckPenalty) * 1.5);
  if (dexLostToCap > 0) score -= Math.min(8, dexLostToCap * 2);

  const shieldDelta = { reflexDelta: 0, fortitudeDelta: 0, shieldRating };
  const value = shieldPeerValueAdjustment(actor, armor, shieldDelta, options.peerArmorOptions || options.allArmorOptions || []);
  score += value.score;

  const explanations = [];
  if (shieldRating > 0) explanations.push(`Energy shield adds SR ${shieldRating}; it does not replace your body armor Reflex calculation.`);
  else explanations.push('Energy shield listing has no shield rating to evaluate.');
  if (!proficient) explanations.push(`You are not proficient with ${shieldType} energy shields; its armor check penalty applies (${armorCheckPenalty}).`);
  if (dexLostToCap > 0) explanations.push(`Shield max Dex cap can restrict your Dexterity bonus by ${dexLostToCap}.`);
  if (value.explanation) explanations.push(value.explanation);

  return {
    isEnergyShield: true,
    armorType: 'shield',
    shieldType,
    proficient,
    shieldRating,
    reflexDelta: 0,
    fortitudeDelta: 0,
    weightedDefenseDelta: 0,
    maxDexBonus: maxDex,
    dexLostToCap,
    armorCheckPenalty,
    speedPenalty: number(data.speedPenalty, 0),
    scoreAdjustment: Math.max(-30, Math.min(30, score)),
    value,
    explanations
  };
}

export function evaluateArmorBenefit(armor, actor, options = {}) {
  const data = resolveArmorData(armor);
  if (data.isEnergyShield || isEnergyShieldItem(armor)) return evaluateEnergyShield(armor, actor, options);

  const baseline = simulateBodyArmorContribution(actor, equippedBodyArmor(actor));
  const candidate = simulateBodyArmorContribution(actor, armor);
  const delta = {
    reflexDelta: candidate.reflexContribution - baseline.reflexContribution,
    fortitudeDelta: candidate.fortitudeContribution - baseline.fortitudeContribution
  };
  delta.weightedDefenseDelta = delta.reflexDelta + delta.fortitudeDelta * 0.75;

  const value = peerValueAdjustment(actor, armor, delta, options);
  const baseScore = scoreBodyArmorDelta(delta, candidate);
  const scoreAdjustment = Math.max(-45, Math.min(40, baseScore + value.score));

  return {
    isEnergyShield: false,
    armorType: candidate.armorType,
    proficient: candidate.proficient,
    baseline,
    candidate,
    reflexDelta: delta.reflexDelta,
    fortitudeDelta: delta.fortitudeDelta,
    weightedDefenseDelta: delta.weightedDefenseDelta,
    maxDexBonus: candidate.maxDexBonus,
    dexLostToCap: candidate.dexLostToCap,
    armorCheckPenalty: candidate.armorCheckPenalty,
    speedPenalty: candidate.speedPenalty,
    scoreAdjustment,
    value,
    explanations: bodyArmorExplanations(armor, baseline, candidate, delta, value)
  };
}

export default evaluateArmorBenefit;
