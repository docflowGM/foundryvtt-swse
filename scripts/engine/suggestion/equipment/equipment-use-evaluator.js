/**
 * Equipment Use Evaluator
 *
 * Store-facing equipment scoring helper. This separates rules eligibility from
 * recommendation value:
 * - Can the actor attempt to use the item at all?
 * - Is the actor trained enough to make full use of the linked skill uses?
 * - Can the actor realistically hit the expected DCs?
 * - Is the purchase efficient for current credits?
 */

const SKILL_KEY_ALIASES = {
  acrobatics: 'acrobatics',
  climb: 'climb',
  deception: 'deception',
  endurance: 'endurance',
  gatherinformation: 'gatherInformation',
  initiative: 'initiative',
  jump: 'jump',
  knowledgelifesciences: 'knowledgeLifeSciences',
  knowledgetechnology: 'knowledgeTechnology',
  mechanics: 'mechanics',
  perception: 'perception',
  persuasion: 'persuasion',
  pilot: 'pilot',
  ride: 'ride',
  stealth: 'stealth',
  survival: 'survival',
  swim: 'swim',
  treatinjury: 'treatInjury',
  usecomputer: 'useComputer',
  usetheforce: 'useTheForce'
};

const SKILL_DEFAULT_ABILITIES = {
  acrobatics: 'dex',
  climb: 'str',
  deception: 'cha',
  endurance: 'con',
  gatherInformation: 'cha',
  initiative: 'dex',
  jump: 'str',
  mechanics: 'int',
  perception: 'wis',
  persuasion: 'cha',
  pilot: 'dex',
  ride: 'dex',
  stealth: 'dex',
  survival: 'wis',
  swim: 'str',
  treatInjury: 'wis',
  useComputer: 'int',
  useTheForce: 'cha'
};

const USE_BENCHMARKS = {
  all: { label: 'General skill support', dc: null, trainedOnly: false, benchmark: false },
  first_aid: { label: 'First Aid', dc: 15, trainedOnly: false, benchmark: false },
  critical_care: { label: 'Critical Care', dc: 20, trainedOnly: true, benchmark: false },
  perform_surgery: { label: 'Perform Surgery', dc: 20, trainedOnly: true, benchmark: false },
  revivify: { label: 'Revivify', dc: 25, trainedOnly: true, benchmark: false },
  treat_disease: { label: 'Treat Disease', dc: 20, trainedOnly: true, benchmark: true },
  treat_poison: { label: 'Treat Poison', dc: 20, trainedOnly: true, benchmark: true },
  treat_radiation: { label: 'Treat Radiation', dc: 20, trainedOnly: true, benchmark: true },
  disable_device: { label: 'Disable Device', dc: 20, trainedOnly: true, benchmark: true },
  build_object: { label: 'Build Object', dc: 20, trainedOnly: true, benchmark: true },
  repair_object: { label: 'Repair Object', dc: 20, trainedOnly: true, benchmark: false },
  repair_droid: { label: 'Repair Droid', dc: 20, trainedOnly: true, benchmark: false },
  repair_vehicle: { label: 'Repair Vehicle', dc: 20, trainedOnly: true, benchmark: true },
  jury_rig: { label: 'Jury-Rig', dc: 25, trainedOnly: true, benchmark: false },
  reprogram_droid: { label: 'Reprogram Droid', dc: 20, trainedOnly: true, benchmark: true },
  modify_droid: { label: 'Modify Droid', dc: 20, trainedOnly: true, benchmark: true },
  handle_explosives: { label: 'Handle Explosives', dc: 10, trainedOnly: true, benchmark: false },
  set_explosive: { label: 'Set Explosive', dc: 10, trainedOnly: true, benchmark: false },
  improve_access: { label: 'Improve Access', dc: 20, trainedOnly: true, benchmark: true },
  copy_reprogram_code_cylinder: { label: 'Copy/Reprogram Code Cylinder', dc: 20, trainedOnly: false, benchmark: true },
  access_reprogram_electronic_device: { label: 'Access/Reprogram Electronic Device', dc: 20, trainedOnly: false, benchmark: true },
  cover_tracks: { label: 'Cover Tracks', dc: 20, trainedOnly: true, benchmark: true },
  decrypt_scrambled_transmission: { label: 'Decrypt Scrambled Transmission', dc: 30, trainedOnly: false, benchmark: false },
  overcome_communication_jamming: { label: 'Overcome Communication Jamming', dc: 20, trainedOnly: false, benchmark: true },
  hide_communication_device: { label: 'Hide Communication Device', dc: 15, trainedOnly: false, benchmark: true },
  endure_extreme_temperatures: { label: 'Endure Extreme Temperatures', dc: 20, trainedOnly: false, benchmark: false },
  climb: { label: 'Climb', dc: 15, trainedOnly: false, benchmark: true },
  swim: { label: 'Swim', dc: 15, trainedOnly: false, benchmark: true },
  tread_water: { label: 'Tread Water', dc: 10, trainedOnly: false, benchmark: true },
  track: { label: 'Track', dc: 20, trainedOnly: false, benchmark: true },
  spot: { label: 'Spot/Observe', dc: 15, trainedOnly: false, benchmark: true },
  search: { label: 'Search', dc: 15, trainedOnly: false, benchmark: true },
  listen: { label: 'Listen', dc: 15, trainedOnly: false, benchmark: true },
  sneak: { label: 'Sneak', dc: 15, trainedOnly: false, benchmark: true },
  conceal: { label: 'Conceal Item', dc: 15, trainedOnly: false, benchmark: true }
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

function numberValue(value, fallback = 0) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['total', 'value', 'mod', 'modifier', 'current', 'base']) {
      if (value[key] !== undefined && value[key] !== null && value[key] !== '') return numberValue(value[key], fallback);
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function canonicalSkillKey(skill) {
  const compact = normalize(skill).replace(/_/g, '');
  return SKILL_KEY_ALIASES[compact] || skill || '';
}

function readAbilityMod(system = {}, ability = '') {
  const key = normalize(ability);
  const attr = system.attributes?.[key] || {};
  const abilityData = system.abilities?.[key] || {};
  const direct = attr.mod ?? attr.modifier ?? attr.totalMod ?? abilityData.mod ?? abilityData.modifier;
  if (Number.isFinite(Number(direct))) return Number(direct);
  const score = attr.total ?? attr.value ?? abilityData.total ?? abilityData.value ?? abilityData.score;
  if (Number.isFinite(Number(score))) return Math.floor((Number(score) - 10) / 2);
  return 0;
}

function actorLevel(actor) {
  const sys = actor?.system || {};
  return numberValue(sys.level?.value ?? sys.level ?? sys.details?.level?.value, 1);
}

function skillCandidates(skillKey) {
  const canonical = canonicalSkillKey(skillKey);
  return Array.from(new Set([
    skillKey,
    canonical,
    normalize(skillKey),
    normalize(canonical),
    normalize(skillKey).replace(/_/g, ''),
    normalize(canonical).replace(/_/g, '')
  ].filter(Boolean)));
}

function getActorSkillState(actor, skillKey) {
  const sys = actor?.system || {};
  const skills = sys.skills || {};
  const canonical = canonicalSkillKey(skillKey);
  let skill = null;
  for (const key of skillCandidates(skillKey)) {
    if (skills[key]) {
      skill = skills[key];
      break;
    }
  }

  const trained = skill?.trained === true
    || skill?.isTrained === true
    || numberValue(skill?.rank ?? skill?.ranks, 0) > 0
    || numberValue(skill?.trainedValue, 0) > 0;

  let total = numberValue(skill?.total ?? skill?.mod ?? skill?.value ?? skill?.bonus, NaN);
  if (!Number.isFinite(total)) {
    const ability = SKILL_DEFAULT_ABILITIES[canonical] || 'int';
    total = Math.floor(actorLevel(actor) / 2) + readAbilityMod(sys, ability) + (trained ? 5 : 0);
  }

  return {
    skill: canonical,
    label: skill?.label || skill?.name || canonical,
    total,
    trained,
    canUseUntrained: skill?.untrained !== false,
    source: skill ? 'actor-skill' : 'derived-fallback'
  };
}

function parseDc(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value);
  const dcMatch = text.match(/dc\s*(\d+)/i);
  if (dcMatch) return Number(dcMatch[1]);
  const plain = text.match(/\b(\d{1,2})\b/);
  return plain ? Number(plain[1]) : null;
}

function benchmarkForHook(hook = {}) {
  const key = normalize(hook.useKey || hook.application || hook.name || 'all');
  const bench = USE_BENCHMARKS[key] || USE_BENCHMARKS[key.replace(/^use_/, '')] || USE_BENCHMARKS.all;
  const dc = parseDc(hook.dc ?? hook.targetDc ?? hook.difficulty) ?? bench.dc;
  const trainedOnly = hook.trainedOnly === true
    || hook.requiresTraining === true
    || bench.trainedOnly === true
    || /trained/i.test(String(hook.note || hook.label || ''));
  return {
    key,
    label: hook.label || hook.application || bench.label || String(hook.useKey || 'Skill use'),
    dc,
    trainedOnly,
    benchmark: bench.benchmark === true
  };
}

function hookBonusValue(hook = {}, item = {}) {
  const direct = hook.bonus?.value ?? hook.bonusValue ?? hook.modifier?.value;
  const fromHook = numberValue(direct, 0);
  if (fromHook) return fromHook;
  const caps = item?.system?.capabilities || {};
  const capCandidates = [
    caps.perceptionEquipmentBonus,
    caps.potentialUseComputerEquipmentBonus,
    caps.equipmentBonus,
    caps.skillBonus
  ];
  for (const candidate of capCandidates) {
    const n = numberValue(candidate, 0);
    if (n) return n;
  }
  return 0;
}

function successProbability(total, dc) {
  if (!Number.isFinite(Number(dc))) return null;
  const needed = Number(dc) - Number(total);
  if (needed <= 1) return 1;
  if (needed > 20) return 0;
  return clamp((21 - needed) / 20, 0, 1);
}

function successLabel(probability, take10Works = false) {
  if (take10Works) return 'take10-success';
  if (probability == null) return 'unknown-dc';
  if (probability >= 0.75) return 'reliable';
  if (probability >= 0.5) return 'reasonable';
  if (probability >= 0.25) return 'risky';
  return 'poor';
}

function useValueFromHook(hook, item, actor) {
  const benchmark = benchmarkForHook(hook);
  const skillState = getActorSkillState(actor, hook.skill || '');
  const bonus = hookBonusValue(hook, item);
  const totalWithItem = skillState.total + bonus;
  const trainingOverride = hook.trainingOverride === true
    || hook.allowsUntrained === true
    || item?.system?.capabilities?.trainingOverride === true
    || item?.system?.capabilities?.untrainedSkillOverride === true;
  const trainingBlocked = benchmark.trainedOnly && !skillState.trained && !trainingOverride;
  const attemptable = !trainingBlocked && (skillState.canUseUntrained || skillState.trained || trainingOverride);
  const probability = successProbability(totalWithItem, benchmark.dc);
  const take10Works = benchmark.dc != null && totalWithItem + 10 >= benchmark.dc;

  let benefit = 0;
  const mode = normalize(hook.mode || 'modifies');
  if (mode === 'enables' || mode === 'requires' || hook.required === true) benefit += 3.5;
  if (mode === 'modifies') benefit += 1.5;
  if (bonus > 0) benefit += Math.min(4, bonus * 0.9);
  if (hook.consumes) benefit -= 0.75;
  if (benchmark.dc == null) benefit += skillState.trained ? 1.5 : 0.75;
  else if (take10Works) benefit += 4;
  else benefit += (probability ?? 0.35) * 4;
  if (benchmark.trainedOnly && skillState.trained) benefit += 2;
  if (trainingBlocked) benefit -= 5;
  if (!attemptable) benefit -= 2;

  return {
    skill: skillState.skill,
    skillLabel: skillState.label,
    skillTotal: skillState.total,
    trained: skillState.trained,
    canUseUntrained: skillState.canUseUntrained,
    useKey: benchmark.key,
    useLabel: benchmark.label,
    targetDc: benchmark.dc,
    benchmarkDc: benchmark.benchmark,
    trainedOnly: benchmark.trainedOnly,
    equipmentBonus: bonus,
    effectiveTotal: totalWithItem,
    trainingOverride,
    trainingBlocked,
    canAttempt: attemptable,
    fullUse: attemptable && (!benchmark.trainedOnly || skillState.trained || trainingOverride),
    successProbability: probability,
    take10Works,
    successLabel: successLabel(probability, take10Works),
    mode: normalize(hook.mode || 'modifies'),
    consumes: hook.consumes || null,
    benefit: clamp(benefit, -6, 10),
    source: hook.source || item?.name || ''
  };
}

function budgetValue(item, storeContext = {}) {
  const sys = item?.system || {};
  const cost = numberValue(item?.finalCost ?? item?.cost ?? sys.finalCost ?? sys.costNumeric ?? sys.value ?? sys.cost, 0);
  const credits = Math.max(0, numberValue(storeContext?.credits, 0));
  if (!cost) return { cost, credits, affordable: true, ratio: 0, efficiency: 0, adjustment: 0, label: 'unknown-cost' };
  const ratio = credits > 0 ? cost / credits : Infinity;
  const affordable = credits >= cost;
  let adjustment = 0;
  if (!credits) adjustment = -5;
  else if (ratio <= 0.1) adjustment = 3;
  else if (ratio <= 0.3) adjustment = 2;
  else if (ratio <= 0.75) adjustment = 1;
  else if (ratio <= 1.0) adjustment = -1;
  else if (ratio <= 2.0) adjustment = -5;
  else adjustment = -8;
  return {
    cost,
    credits,
    affordable,
    ratio,
    efficiency: cost > 0 ? 1 / Math.max(1, cost) : 0,
    adjustment,
    label: !affordable ? 'not-affordable' : ratio <= 0.3 ? 'high-value' : ratio <= 0.75 ? 'fair' : 'expensive'
  };
}

function buildExplanations(profile) {
  const explanations = [];
  const best = profile.bestUse;
  if (best) {
    if (best.trainingBlocked) {
      explanations.push(`Requires trained ${best.skillLabel || best.skill}; you can carry it, but cannot make full use yet.`);
    } else if (best.targetDc != null) {
      const pct = Math.round((best.successProbability ?? 0) * 100);
      const dcText = best.benchmarkDc ? `benchmark DC ${best.targetDc}` : `DC ${best.targetDc}`;
      explanations.push(`${best.useLabel}: ${best.effectiveTotal >= 0 ? '+' : ''}${best.effectiveTotal} vs ${dcText} (${best.take10Works ? 'Take 10 succeeds' : `${pct}% check success`}).`);
    } else if (best.trained) {
      explanations.push(`Supports trained ${best.skillLabel || best.skill} use.`);
    }

    if (best.equipmentBonus > 0) {
      explanations.push(`Adds +${best.equipmentBonus} equipment bonus when applicable.`);
    }
  }

  if (profile.creditEfficiency?.cost > 0) {
    if (!profile.creditEfficiency.affordable) explanations.push('Benefit is blocked by current credits.');
    else if (profile.creditEfficiency.label === 'high-value') explanations.push('Strong benefit for a small credit outlay.');
    else if (profile.creditEfficiency.label === 'expensive') explanations.push('Major purchase: benefit must justify the credit hit.');
  }

  return explanations.slice(0, 4);
}

export function buildEquipmentUseProfile(item, actor, storeContext = {}) {
  const hooks = Array.isArray(item?.system?.skillHooks) ? item.system.skillHooks : [];
  const hookProfiles = hooks
    .filter(hook => hook && hook.skill)
    .map(hook => useValueFromHook(hook, item, actor));

  hookProfiles.sort((a, b) => b.benefit - a.benefit || (b.equipmentBonus || 0) - (a.equipmentBonus || 0));
  const bestUse = hookProfiles[0] || null;
  const benefitScore = hookProfiles.length
    ? clamp(hookProfiles.reduce((sum, entry) => sum + Math.max(-2, entry.benefit), 0) / Math.max(1, Math.sqrt(hookProfiles.length)), -8, 14)
    : 0;
  const canUse = hookProfiles.length ? hookProfiles.some(entry => entry.canAttempt) : true;
  const fullUse = hookProfiles.length ? hookProfiles.some(entry => entry.fullUse && !entry.trainingBlocked) : true;
  const trainedFit = hookProfiles.length
    ? hookProfiles.filter(entry => entry.trained || !entry.trainedOnly || entry.trainingOverride).length / hookProfiles.length
    : 1;
  const successFit = hookProfiles.length
    ? hookProfiles.reduce((sum, entry) => sum + (entry.take10Works ? 1 : (entry.successProbability ?? (entry.trained ? 0.7 : 0.35))), 0) / hookProfiles.length
    : 0.5;
  const creditEfficiency = budgetValue(item, storeContext);

  let adjustment = benefitScore + creditEfficiency.adjustment;
  if (!canUse) adjustment -= 8;
  else if (!fullUse) adjustment -= 4;
  if (trainedFit >= 0.75) adjustment += 2;
  if (successFit >= 0.75) adjustment += 3;
  else if (successFit < 0.25 && hookProfiles.length) adjustment -= 3;

  const profile = {
    hookCount: hookProfiles.length,
    canUse,
    fullUse,
    trainedFit: clamp(trainedFit, 0, 1),
    successFit: clamp(successFit, 0, 1),
    benefitScore,
    adjustment: clamp(adjustment, -14, 16),
    bestUse,
    uses: hookProfiles.slice(0, 5),
    creditEfficiency,
    labels: {
      canUse: canUse ? 'usable' : 'not-usable-yet',
      fullUse: fullUse ? 'full-use' : 'partial-use',
      trainedFit: trainedFit >= 0.75 ? 'trained-fit' : trainedFit >= 0.35 ? 'partial-training-fit' : 'poor-training-fit',
      successFit: successFit >= 0.75 ? 'reliable' : successFit >= 0.5 ? 'reasonable' : successFit >= 0.25 ? 'risky' : 'poor'
    }
  };
  profile.explanations = buildExplanations(profile);
  return profile;
}

export function scoreEquipmentUseValue(item, actor, storeContext = {}) {
  return buildEquipmentUseProfile(item, actor, storeContext);
}

export default buildEquipmentUseProfile;
