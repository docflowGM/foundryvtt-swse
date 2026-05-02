import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function addName(set, value) {
  const normalized = normalizeName(value);
  if (normalized) set.add(normalized);
}

function addItems(set, items) {
  for (const item of items || []) {
    addName(set, item?.name || item?.label || item?.value || item);
  }
}

function readBooleanSetting(key, fallback = false) {
  try {
    return !!HouseRuleService.getBoolean(key, fallback);
  } catch (_err) {
    return !!fallback;
  }
}

function readStringSetting(key, fallback = '') {
  try {
    return HouseRuleService.getString(key, fallback);
  } catch (_err) {
    return fallback;
  }
}

function nextSlotLevel(slots, predicate, currentLevel) {
  const candidates = (slots || [])
    .filter((slot) => !slot?.consumed && (!predicate || predicate(slot)))
    .map((slot) => Number(slot?.levelGranted || currentLevel || 1))
    .sort((a, b) => a - b);
  return candidates.length ? candidates[0] : null;
}

function levelsUntil(nextLevel, currentLevel) {
  if (nextLevel == null) return null;
  return Math.max(0, Number(nextLevel) - Number(currentLevel || 1));
}

export function buildProgressionChoiceContext(actor, pendingData = {}, { kind = 'feat' } = {}) {
  const currentLevel = Number(actor?.system?.level || actor?.system?.details?.level || 1);
  const featEntitlements = new Set();
  const talentEntitlements = new Set();

  addItems(featEntitlements, actor?.items?.filter((i) => i?.type === 'feat') || []);
  addItems(talentEntitlements, actor?.items?.filter((i) => i?.type === 'talent') || []);
  addItems(featEntitlements, pendingData?.selectedFeats);
  addItems(talentEntitlements, pendingData?.selectedTalents);
  addItems(featEntitlements, pendingData?.grantedFeats);
  addItems(talentEntitlements, pendingData?.grantedTalents);
  addItems(featEntitlements, pendingData?.resolvedGrantedFeats);
  addItems(talentEntitlements, pendingData?.resolvedGrantedTalents);

  if (readBooleanSetting('weaponFinesseDefault', false)) addName(featEntitlements, 'Weapon Finesse');
  if (readBooleanSetting('pointBlankShotDefault', false)) addName(featEntitlements, 'Point Blank Shot');
  if (readBooleanSetting('powerAttackDefault', false)) addName(featEntitlements, 'Power Attack');
  if (readBooleanSetting('preciseShotDefault', false)) addName(featEntitlements, 'Precise Shot');
  if (readBooleanSetting('dodgeDefault', false)) addName(featEntitlements, 'Dodge');
  if (readBooleanSetting('armoredDefenseForAll', false)) addName(talentEntitlements, 'Armored Defense');

  const blockDeflectMode = readStringSetting('blockDeflectTalents', 'separate');
  if (blockDeflectMode === 'combined') {
    if (talentEntitlements.has('block') || talentEntitlements.has('deflect') || talentEntitlements.has('block & deflect')) {
      addName(talentEntitlements, 'Block');
      addName(talentEntitlements, 'Deflect');
      addName(talentEntitlements, 'Block & Deflect');
    }
  }

  const progression = actor?.system?.progression || {};
  const featSlots = progression?.featSlots || [];
  const talentSlots = progression?.talentSlots || [];
  const activeSlotContext = pendingData?.activeSlotContext || null;

  const nextGeneralFeatLevel = nextSlotLevel(featSlots, (slot) => slot?.slotType === 'heroic', currentLevel);
  const nextClassFeatLevel = nextSlotLevel(featSlots, (slot) => slot?.slotType === 'class', currentLevel);
  const nextHeroicTalentLevel = nextSlotLevel(talentSlots, (slot) => slot?.slotType === 'heroic', currentLevel);
  const nextClassTalentLevel = nextSlotLevel(talentSlots, (slot) => slot?.slotType === 'class', currentLevel);

  const currentClassNames = new Set(
    (actor?.items || []).filter((i) => i?.type === 'class').map((i) => normalizeName(i?.name))
  );
  addName(currentClassNames, pendingData?.selectedClass?.name || pendingData?.selectedClass);

  const classFeatLookupKeys = (pendingData?.classFeatLookupKeys || pendingData?.classLookupKeys || [])
    .map((value) => normalizeName(value))
    .filter(Boolean);

  return {
    kind,
    currentLevel,
    activeSlotContext,
    featEntitlements,
    talentEntitlements,
    ownedPrereqs: new Set([...featEntitlements, ...talentEntitlements]),
    classFeatLookupKeys,
    currentClassNames,
    timeline: {
      nextGeneralFeatLevel,
      nextClassFeatLevel,
      nextHeroicTalentLevel,
      nextClassTalentLevel,
      levelsUntilNextGeneralFeat: levelsUntil(nextGeneralFeatLevel, currentLevel),
      levelsUntilNextClassFeat: levelsUntil(nextClassFeatLevel, currentLevel),
      levelsUntilNextHeroicTalent: levelsUntil(nextHeroicTalentLevel, currentLevel),
      levelsUntilNextClassTalent: levelsUntil(nextClassTalentLevel, currentLevel)
    },
    blockDeflectMode
  };
}

export function candidateMatchesCurrentClassBonusFeat(candidate, choiceContext) {
  const bonusFor = candidate?.system?.bonus_feat_for || [];
  const values = Array.isArray(bonusFor) ? bonusFor : [bonusFor];
  if (!values.length) return false;
  const normalized = values.map((value) => normalizeName(value)).filter(Boolean);
  return normalized.some((value) => choiceContext?.classFeatLookupKeys?.includes(value) || choiceContext?.currentClassNames?.has(value));
}

export function isAlreadyEntitled(candidate, choiceContext, kind = 'feat') {
  const name = normalizeName(candidate?.name);
  if (!name) return false;
  if (kind === 'talent') {
    return choiceContext?.talentEntitlements?.has(name) || choiceContext?.ownedPrereqs?.has(name);
  }
  return choiceContext?.featEntitlements?.has(name) || choiceContext?.ownedPrereqs?.has(name);
}

export function isCoreEnablingPick(candidate) {
  const name = normalizeName(candidate?.name);
  return [
    'force training',
    'point blank shot',
    'point-blank shot',
    'power attack',
    'precise shot',
    'block',
    'deflect',
    'block & deflect'
  ].includes(name);
}

export function getPackagePriorityBonus(candidate, choiceContext, kind = 'feat') {
  const classNames = [...(choiceContext?.currentClassNames || [])];
  const primaryClass = classNames[0] || '';
  const name = normalizeName(candidate?.name);
  if (!name) return 0;

  const packages = {
    jedi: {
      feat: { 'force training': 0.14, 'skill focus (use the force)': 0.12 },
      talent: { 'block': 0.12, 'deflect': 0.12, 'block & deflect': 0.16, 'lightsaber defense': 0.08, 'force intuition': 0.08, 'battle meditation': 0.08 }
    },
    scout: {
      feat: { 'point blank shot': 0.12, 'precise shot': 0.12, 'improved initiative': 0.08, 'keen shot': 0.08 },
      talent: { 'acute senses': 0.14, 'evasion': 0.14 }
    },
    scoundrel: {
      feat: { 'precise shot': 0.14, 'rapid shot': 0.08 },
      talent: { "fool's luck": 0.16, 'fools luck': 0.16, 'skirmisher': 0.12, 'dastardly strike': 0.1, 'sneak attack': 0.08 }
    },
    soldier: {
      feat: { 'power attack': 0.14, 'point blank shot': 0.12, 'precise shot': 0.12, 'rapid shot': 0.1, 'deadeye': 0.1 },
      talent: { 'armored defense': 0.14, 'improved armored defense': 0.12, 'melee smash': 0.14, 'stunning strike': 0.1 }
    },
    noble: {
      feat: { 'skill focus': 0.08 },
      talent: { 'born leader': 0.16, 'inspire confidence': 0.16, 'bolster ally': 0.1, 'coordinate': 0.08, 'wealth': 0.06 }
    }
  };

  const classPkg = packages[primaryClass];
  if (!classPkg) return 0;
  const kindMap = classPkg[kind] || {};
  if (kindMap[name] != null) return kindMap[name];
  return 0;
}

export function getSlotEfficiencyDelta(candidate, choiceContext, kind = 'feat') {
  const slot = choiceContext?.activeSlotContext || {};
  const timeline = choiceContext?.timeline || {};
  const core = isCoreEnablingPick(candidate);

  if (kind === 'feat') {
    const isClassBonusCandidate = candidateMatchesCurrentClassBonusFeat(candidate, choiceContext);
    if (slot?.slotType === 'heroic' && isClassBonusCandidate) {
      const nextClassFeat = timeline.levelsUntilNextClassFeat;
      if (nextClassFeat != null && nextClassFeat <= 1 && !core) return -0.1;
      if (nextClassFeat != null && nextClassFeat <= 2 && !core) return -0.06;
      if (nextClassFeat != null && nextClassFeat <= 2 && core) return -0.02;
    }
    if (slot?.slotType === 'class' && isClassBonusCandidate) {
      return core ? 0.08 : 0.12;
    }
  }

  if (kind === 'talent') {
    const nextClassTalent = timeline.levelsUntilNextClassTalent;
    if (slot?.slotType === 'heroic') {
      if (nextClassTalent != null && nextClassTalent <= 1 && !core) return -0.06;
      if (nextClassTalent != null && nextClassTalent <= 2 && !core) return -0.03;
    }
    if (slot?.slotType === 'class') {
      return 0.06;
    }
  }

  return 0;
}
