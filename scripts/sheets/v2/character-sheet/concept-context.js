import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { CANONICAL_SKILL_DEFS, canonicalizeSkillKey, normalizeSkillMap } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";
function toSignedClass(value) {
  const n = Number(value) || 0;
  return n > 0 ? 'mod--positive' : n < 0 ? 'mod--negative' : 'mod--zero';
}

function toCountBadge(value) {
  const n = Number(value) || 0;
  return n > 0 ? String(n) : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function excerpt(value, maxLength = 220) {
  const text = normalizeText(value);
  if (!text) return 'No dossier notes on file.';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function titleCase(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Unknown';
}

function humanizeSkillLabel(key, fallback = '') {
  const value = fallback || key;
  const spaced = String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return titleCase(spaced || key);
}

function isCanonicalSkillKey(key) {
  return !!key && Object.prototype.hasOwnProperty.call(CANONICAL_SKILL_DEFS, key);
}

function getDerivedSkillMap(context) {
  const raw = context?.derived?.skills;

  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw
        .map((value) => [canonicalizeSkillKey(value?.key ?? value?.id ?? value?.label), value])
        .filter(([key, value]) => isCanonicalSkillKey(key) && value && typeof value === 'object' && !Array.isArray(value))
    );
  }

  if (!raw || typeof raw !== 'object') return {};

  const listRows = Array.isArray(raw.list) ? raw.list : [];
  const objectRows = Object.entries(raw)
    .filter(([key, value]) => {
      if (!isCanonicalSkillKey(key)) return false;
      return value && typeof value === 'object' && !Array.isArray(value);
    });
  const listEntries = listRows
    .map((value) => [canonicalizeSkillKey(value?.key ?? value?.id ?? value?.label), value])
    .filter(([key, value]) => isCanonicalSkillKey(key) && value && typeof value === 'object' && !Array.isArray(value));

  return Object.fromEntries([...objectRows, ...listEntries]);
}

function buildStatusChips({ healthPanel, forceSensitive, inventoryPanel, armorSummaryPanel }) {
  const chips = [];
  const condition = healthPanel?.currentConditionPenalty;
  const hp = healthPanel?.hp;

  if (condition?.step > 0) {
    chips.push({ label: `Condition ${condition.label}`, tone: 'warn' });
  } else {
    chips.push({ label: 'Condition Normal', tone: 'ok' });
  }

  if ((Number(hp?.temp) || 0) > 0) {
    chips.push({ label: `Temp HP +${hp.temp}`, tone: 'accent' });
  }

  if ((Number(healthPanel?.bonusHp?.value) || 0) > 0) {
    chips.push({ label: `Bonus HP +${healthPanel.bonusHp.value}`, tone: 'accent' });
  }

  if ((Number(healthPanel?.shield?.current) || 0) > 0) {
    chips.push({ label: `Shield ${healthPanel.shield.current}/${healthPanel.shield.max}`, tone: 'neutral' });
  }

  if (forceSensitive) {
    chips.push({ label: 'Force-Sensitive', tone: 'force' });
  }

  const equippedCount = asArray(inventoryPanel?.entries).filter(entry => entry?.equipped).length;
  if (equippedCount > 0) {
    chips.push({ label: `${equippedCount} Equipped Items`, tone: 'neutral' });
  }

  if (armorSummaryPanel?.equippedArmor?.name) {
    chips.push({ label: armorSummaryPanel.equippedArmor.name, tone: 'accent-soft' });
  }

  return chips;
}


function buildCombatStatusStrip(context, combat) {
  const chips = [];
  const hp = context.healthPanel?.hp ?? {};
  const hpValue = Number(hp.value) || 0;
  const hpMax = Number(hp.max) || 0;
  const hpTemp = Number(hp.temp) || 0;
  const hpPct = hpMax > 0 ? hpValue / hpMax : 1;
  const conditionStep = Number(context.healthPanel?.currentConditionPenalty?.step) || 0;
  const conditionLabel = context.healthPanel?.currentConditionPenalty?.label || 'Normal';
  const hasAttacks = !!combat?.hasAnyAttacks;
  const hasWeapons = asArray(combat?.attacks).length > 0;
  const hasArmor = !!context.armorSummaryPanel?.equippedArmor?.name;
  const secondWind = context.secondWindPanel ?? context.healthPanel?.secondWind ?? {};
  const secondWindUsed = !!(secondWind.used || secondWind.isUsed || secondWind.spent);

  chips.push(conditionStep > 0
    ? { label: `CT ${conditionLabel}`, tone: conditionStep >= 3 ? 'danger' : 'warn', tooltip: 'ConditionTrack' }
    : { label: 'CT Normal', tone: 'ok', tooltip: 'ConditionTrack' });

  if (hpMax > 0 && hpPct <= 0.25) chips.push({ label: 'Critical HP', tone: 'danger', tooltip: 'HitPoints' });
  else if (hpMax > 0 && hpPct <= 0.5) chips.push({ label: 'Wounded', tone: 'warn', tooltip: 'HitPoints' });
  else chips.push({ label: 'Vitals Stable', tone: 'ok', tooltip: 'HitPoints' });

  if (hpTemp > 0) chips.push({ label: `Temp HP +${hpTemp}`, tone: 'accent', tooltip: 'HitPoints' });
  chips.push(secondWindUsed
    ? { label: 'Second Wind Used', tone: 'neutral', tooltip: 'SecondWind' }
    : { label: 'Second Wind Ready', tone: 'ok', tooltip: 'SecondWind' });
  chips.push(hasArmor
    ? { label: 'Armor Equipped', tone: 'accent', tooltip: 'ReflexDefense' }
    : { label: 'No Armor', tone: 'neutral', tooltip: 'ReflexDefense' });
  chips.push(hasWeapons
    ? { label: `${asArray(combat?.attacks).length} Weapon Attacks`, tone: 'accent', tooltip: 'BaseAttackBonus' }
    : hasAttacks
      ? { label: 'Unarmed Ready', tone: 'neutral', tooltip: 'BaseAttackBonus' }
      : { label: 'No Attacks', tone: 'danger', tooltip: 'BaseAttackBonus' });

  return chips;
}

function buildInventoryGroups(inventoryPanel) {
  const grouped = inventoryPanel?.grouped ?? {};
  const order = ['Weapons', 'Armor', 'Equipment'];

  return order
    .map((label) => {
      const entries = asArray(grouped[label]).map((entry) => ({
        ...entry,
        quantity: Number(entry?.quantity) || 1,
        weight: Number(entry?.weight) || 0,
        value: Number(entry?.value) || 0,
        tags: asArray(entry?.tags)
      }));

      return {
        id: label.toLowerCase(),
        label,
        count: entries.length,
        entries,
        hasEntries: entries.length > 0
      };
    })
    .filter((group) => group.hasEntries);
}

function buildActionGroups(combatActions) {
  return asArray(combatActions?.groups).map((group) => ({
    label: group?.label || 'Actions',
    count: Number(group?.count) || 0,
    subgroups: asArray(group?.subgroups).map((subgroup) => ({
      label: subgroup?.label || 'Actions',
      count: Number(subgroup?.count) || 0,
      items: asArray(subgroup?.items).slice(0, 5).map((item) => ({
        key: item?.key,
        name: item?.name || 'Unnamed Action',
        sourceName: item?.sourceName || '',
        executable: !!item?.executable,
        useLabel: item?.useLabel || 'Use',
        description: normalizeText(item?.description),
        itemId: item?.itemId || '',
        resources: asArray(item?.resources)
      }))
    }))
  }));
}

function buildAbilityTab(abilities) {
  const entries = asArray(abilities)
    .map((ability) => ({
      key: ability.key,
      label: ability.label,
      base: Number(ability.base) || 0,
      racial: Number(ability.racial) || 0,
      temp: Number(ability.temp) || 0,
      total: Number(ability.total) || 0,
      mod: Number(ability.mod) || 0,
      modClass: ability.modClass || toSignedClass(ability.mod)
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  const primary = entries[0] ?? null;
  const secondary = entries[1] ?? null;
  const lowest = entries.length ? entries[entries.length - 1] : null;
  const totalScore = entries.reduce((sum, ability) => sum + ability.total, 0);
  const totalMods = entries.reduce((sum, ability) => sum + ability.mod, 0);

  if (primary) primary.isPrimary = true;
  if (secondary && secondary.key !== primary?.key) secondary.isSecondary = true;
  if (lowest && lowest.key !== primary?.key && lowest.key !== secondary?.key) lowest.isLowest = true;

  return {
    entries,
    summaryCards: [
      { label: 'Primary', value: primary ? `${primary.label} ${primary.total}` : '—' },
      { label: 'Secondary', value: secondary ? `${secondary.label} ${secondary.total}` : '—' },
      { label: 'Lowest', value: lowest ? `${lowest.label} ${lowest.total}` : '—' },
      { label: 'Modifier Sum', value: totalMods >= 0 ? `+${totalMods}` : String(totalMods) },
      { label: 'Ability Total', value: String(totalScore || 0) },
      { label: 'Ready Profile', value: entries.length ? `${entries.length} tracked abilities` : 'No data' }
    ]
  };
}

function buildSkillUseGroups(grouped) {
  return Object.entries(grouped ?? {})
    .map(([label, rows]) => ({
      label,
      entries: asArray(rows).map((row) => ({
        ...row,
        description: excerpt(row?.description, 120),
        blockedReason: normalizeText(row?.blockedReason),
        category: row?.category || label,
        timeLabel: row?.timeLabel || '',
        timeClass: row?.timeClass || '',
        actionType: row?.actionType || '',
        actionTypeLabel: row?.actionTypeLabel || { label: 'Use', icon: '•', action: 'Use' },
        sourceType: row?.sourceType || '',
        sourceLabel: row?.sourceLabel || '',
        skillTrained: !!row?.skillTrained,
        requiresTrained: !!row?.requiresTrained,
        isBlocked: !!row?.isBlocked,
        useKey: row?.useKey || row?.key || ''
      }))
    }))
    .filter(group => group.entries.length > 0);
}

function buildSkillsTab(context, abilities, identity) {
  const rawAbilityChoices = asArray(context.derived?.identity?.abilities).length
    ? asArray(context.derived?.identity?.abilities)
    : asArray(abilities);
  const abilityChoices = rawAbilityChoices
    .map((ab) => ({ key: ab?.key || '', label: ab?.label || titleCase(ab?.key) }))
    .filter((ab) => ab.key);
  const abilityMap = new Map(abilityChoices.map((ab) => [ab.key, ab.label]));
  const derivedSkills = getDerivedSkillMap(context);
  const systemSkills = normalizeSkillMap(context.system?.skills ?? context.actor?.system?.skills, { includeDefaults: true });

  const entries = Object.keys(CANONICAL_SKILL_DEFS)
    .map((key) => {
      const skill = derivedSkills[key] ?? {};
      const systemSkill = systemSkills[key] ?? {};
      const defaultAbility = CANONICAL_SKILL_DEFS[key]?.defaultAbility || skill?.defaultAbility || systemSkill?.selectedAbility || '';
      const candidateAbility = skill?.selectedAbility || skill?.ability || skill?.abilityKey || systemSkill?.selectedAbility || defaultAbility;
      const selectedAbility = abilityMap.has(candidateAbility) ? candidateAbility : defaultAbility;
      const skillTooltipKey = humanizeSkillLabel(key, skill?.label).replace(/\s+/g, '');
      const abilityAccentClass = selectedAbility ? `swse-ability-accent--${selectedAbility}` : 'swse-ability-accent--none';
      const extraUsesGrouped = buildSkillUseGroups(skill?.extraUsesGrouped ?? systemSkill?.extraUsesGrouped);
      const extraUsesCount = extraUsesGrouped.reduce((sum, group) => sum + group.entries.length, 0);
      const total = Number.isFinite(Number(skill?.total)) ? Number(skill.total) : Number(systemSkill?.total) || 0;
      const abilityMod = Number(skill?.abilityMod) || 0;
      const miscMod = Number.isFinite(Number(systemSkill?.miscMod)) ? Number(systemSkill.miscMod) : Number(skill?.miscMod) || 0;

      return {
        key,
        label: humanizeSkillLabel(key, skill?.label),
        total,
        totalClass: toSignedClass(total),
        selectedAbility,
        defaultAbility,
        abilityAccentClass,
        selectedAbilityLabel: abilityMap.get(selectedAbility) || titleCase(selectedAbility),
        abilityMod,
        abilityModClass: toSignedClass(abilityMod),
        halfLevel: Number(skill?.halfLevel) || 0,
        halfLevelClass: toSignedClass(skill?.halfLevel),
        miscMod,
        miscModClass: toSignedClass(miscMod),
        tooltipKey: skillTooltipKey,
        breakdown: {
          ability: abilityMap.get(selectedAbility) || titleCase(selectedAbility),
          abilityMod,
          halfLevel: Number(skill?.halfLevel) || 0,
          trained: systemSkill?.trained === true || skill?.trained === true ? 5 : 0,
          focus: systemSkill?.focused === true || skill?.focused === true ? 5 : 0,
          misc: miscMod,
          armor: Number(skill?.armorPenalty) || 0,
          total
        },
        armorPenalty: Number(skill?.armorPenalty) || 0,
        trained: systemSkill?.trained === true || skill?.trained === true,
        focused: systemSkill?.focused === true || skill?.focused === true,
        favorite: systemSkill?.favorite === true || skill?.favorite === true,
        extraUsesGrouped,
        extraUsesCount,
        hasExtraUses: extraUsesCount > 0,
        abilityChoices
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const highlights = [...entries]
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, 6)
    .map((skill) => ({ label: skill.label, total: skill.total, totalClass: skill.totalClass }));

  const level = Number(identity?.level) || Number(context.actor?.system?.level) || 1;
  const halfLevel = Math.floor(level / 2);
  const abilityTotals = new Map(asArray(abilities).map((ability) => [ability.key, Number(ability.mod) || 0]));
  const customEntries = asArray(context.system?.customSkills ?? context.actor?.system?.customSkills).map((skill, index) => {
    const abilityKey = skill?.ability || 'int';
    const abilityMod = Number(abilityTotals.get(abilityKey)) || 0;
    const miscMod = Number(skill?.miscMod) || 0;
    const total = abilityMod + halfLevel + (skill?.trained ? 5 : 0) + (skill?.focused ? 5 : 0) + miscMod;

    const abilityAccentClass = abilityKey ? `swse-ability-accent--${abilityKey}` : 'swse-ability-accent--none';

    return {
      id: skill?.id || `custom-${index}`,
      index,
      label: skill?.label || `Custom Skill ${index + 1}`,
      ability: abilityKey,
      abilityAccentClass,
      abilityLabel: abilityMap.get(abilityKey) || titleCase(abilityKey),
      abilityMod,
      halfLevel,
      trained: !!skill?.trained,
      focused: !!skill?.focused,
      miscMod,
      total,
      totalClass: toSignedClass(total),
      notes: normalizeText(skill?.notes),
      abilityChoices
    };
  });

  return {
    entries,
    highlights,
    customEntries,
    hasCustomEntries: customEntries.length > 0,
    hasEntries: entries.length > 0,
    summaryCards: [
      { label: 'Tracked Skills', value: String(entries.length) },
      { label: 'Trained', value: String(entries.filter((skill) => skill.trained).length) },
      { label: 'Focused', value: String(entries.filter((skill) => skill.focused).length) },
      { label: 'Favorites', value: String(entries.filter((skill) => skill.favorite).length) },
      { label: 'Extra Uses', value: String(entries.reduce((sum, skill) => sum + skill.extraUsesCount, 0)) },
      { label: 'Custom Skills', value: String(customEntries.length) }
    ]
  };
}

function buildTalentsTab(context) {
  const featEntries = asArray(context.featPanel?.entries).map((feat) => ({
    id: feat?.id || '',
    name: feat?.name || 'Unnamed Feat',
    source: feat?.source || '',
    description: excerpt(feat?.description, 160)
  }));

  const talentGroups = Object.entries(context.talentPanel?.grouped ?? {})
    .map(([label, entries]) => ({
      label,
      count: asArray(entries).length,
      entries: asArray(entries).map((talent) => ({
        id: talent?.id || '',
        name: talent?.name || 'Unnamed Talent',
        source: talent?.source || '',
        description: excerpt(talent?.description, 160)
      }))
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    featEntries,
    talentGroups,
    featCount: featEntries.length,
    talentCount: talentGroups.reduce((sum, group) => sum + group.count, 0),
    treeCount: talentGroups.length,
    canEditTalents: !!context.talentPanel?.canEdit,
    canEditFeats: !!context.featPanel?.canEdit
  };
}

function normalizeForcePower(power, discarded = false) {
  const tags = asArray(power?.system?.tags ?? power?.tags).map((tag) => String(tag));
  return {
    id: power?.id || '',
    name: power?.name || 'Unnamed Power',
    discarded,
    tags,
    tagString: tags.join(' '),
    summary: excerpt(power?.system?.summary || power?.system?.description || power?.summary, 160)
  };
}

function normalizeForceFeature(entry, fallbackLabel) {
  return {
    id: entry?.id || '',
    name: entry?.name || fallbackLabel,
    prerequisite: normalizeText(entry?.system?.prerequisite || entry?.prerequisite),
    summary: excerpt(entry?.system?.summary || entry?.summary || entry?.system?.description, 160)
  };
}

function buildForceTab(context) {
  const actor = context.actor;
  const hand = asArray(context.forcePowersPanel?.hand).map((power) => normalizeForcePower(power, false));
  const discard = asArray(context.forcePowersPanel?.discard).map((power) => normalizeForcePower(power, true));
  const techniques = asArray(context.forcePowersPanel?.techniques).map((entry) => normalizeForceFeature(entry, 'Unnamed Technique'));
  const secrets = asArray(context.forcePowersPanel?.secrets).map((entry) => normalizeForceFeature(entry, 'Unnamed Secret'));
  const tags = Array.from(new Set([...hand, ...discard].flatMap((power) => power.tags))).sort((a, b) => a.localeCompare(b));
  const forcefulRecoveryPending = MetaResourceFeatResolver.getForcefulRecoveryPending(actor);
  const forcefulRecovery = forcefulRecoveryPending ? {
    pending: true,
    source: forcefulRecoveryPending.source || 'Forceful Recovery',
    note: forcefulRecoveryPending.note || 'Regain one expended Force power after catching a Second Wind.',
    recoverableCount: discard.length,
    hasRecoverable: discard.length > 0
  } : { pending: false, recoverableCount: discard.length, hasRecoverable: discard.length > 0 };

  return {
    metrics: [
      { label: 'Force Points', value: `${Number(context.forcePointsValue) || 0}/${Number(context.forcePointsMax) || 0}` },
      { label: 'Destiny Points', value: `${Number(context.destinyPointsValue) || 0}/${Number(context.destinyPointsMax) || 0}` },
      { label: 'Available Powers', value: String(hand.length) },
      { label: 'Discarded', value: String(discard.length) },
      { label: 'Techniques', value: String(techniques.length) },
      { label: 'Secrets', value: String(secrets.length) },
      { label: 'Dark Side', value: `${Number(context.darkSidePanel?.value) || 0}/${Number(context.darkSidePanel?.max) || 0}` },
      { label: 'Force Tags', value: String(tags.length) }
    ],
    hand,
    discard,
    techniques,
    secrets,
    tags,
    hasAnything: hand.length > 0 || discard.length > 0 || techniques.length > 0 || secrets.length > 0,
    forcefulRecovery,
    constructionAvailable: !!context.lightsaberConstructionAvailable,
    constructionDeferred: !!context.lightsaberConstructionDeferred
  };
}

function buildRelationshipsTab(context) {
  const entries = asArray(context.relationshipsPanel?.relationships).map((rel, index) => {
    const typeLabel = rel?.type ? titleCase(rel.type) : 'Unclassified';
    return {
      uuid: rel?.uuid || '',
      img: rel?.img || 'icons/svg/mystery-man.svg',
      name: rel?.name || `Relationship ${index + 1}`,
      type: rel?.type || 'unknown',
      typeLabel,
      typeKey: slugify(rel?.type || 'unknown'),
      notes: normalizeText(rel?.notes)
    };
  });

  const summaryMap = new Map();
  for (const entry of entries) {
    const current = summaryMap.get(entry.typeLabel) || 0;
    summaryMap.set(entry.typeLabel, current + 1);
  }

  const summary = Array.from(summaryMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    entries,
    summary,
    canAdd: !!context.relationshipsPanel?.hasAvailableFollowerSlots,
    notes: context.relationshipsPanel?.relationshipNotes || ''
  };
}

export function buildConceptSheetViewModel(context = {}) {
  const actor = context.actor ?? {};
  const flags = actor?.flags?.swse?.character ?? {};
  const identity = context.biographyPanel?.identity ?? {};
  const defenses = asArray(context.defensePanel?.defenses);
  const abilities = asArray(context.abilities);
  const languages = asArray(context.languagesPanel?.entries);
  const inventoryEntries = asArray(context.inventoryPanel?.entries);
  const talentEntries = asArray(context.talentPanel?.entries);
  const featEntries = asArray(context.featPanel?.entries);
  const relationshipEntries = asArray(context.relationshipsPanel?.relationships);
  const attackEntries = asArray(context.combat?.attacks);
  const unarmedAttack = context.combat?.unarmedAttack ?? null;
  const unarmedAttackEntry = unarmedAttack ? {
    id: 'virtual-unarmed-attack',
    name: unarmedAttack.name || 'Unarmed Attack',
    sourceType: 'unarmed',
    virtual: true,
    attackTotal: Number(unarmedAttack.attackTotal ?? unarmedAttack.attackBonus ?? context.bab ?? 0) || 0,
    attackBonus: Number(unarmedAttack.attackTotal ?? unarmedAttack.attackBonus ?? context.bab ?? 0) || 0,
    damageFormula: unarmedAttack.damageFormula || [unarmedAttack.damage, unarmedAttack.damageType].filter(Boolean).join(' ') || '1d4',
    damage: unarmedAttack.damageFormula || unarmedAttack.damage || '1d4',
    critRange: unarmedAttack.critRange || '20',
    critMult: unarmedAttack.critMult || 'x2',
    range: unarmedAttack.range || 'Melee',
    weaponName: unarmedAttack.name || 'Unarmed Attack',
    weaponType: unarmedAttack.weaponType || 'Simple · Melee',
    tags: [
      ...(unarmedAttack.martialArtsStep ? [`Martial Arts ${unarmedAttack.martialArtsStep}`] : []),
      ...(unarmedAttack.noProvokeOpportunity ? ['No AoO'] : [])
    ],
    actionType: 'standard',
    notes: unarmedAttack.notes || ''
  } : null;
  const fpValue = Number(context.forcePointsValue) || 0;
  const fpMax = Number(context.forcePointsMax) || 0;
  const dpValue = Number(context.destinyPointsValue) || 0;
  const dpMax = Number(context.destinyPointsMax) || 0;
  const hpValue = Number(context.healthPanel?.hp?.value) || 0;
  const hpMax = Number(context.healthPanel?.hp?.max) || 0;
  const hpTemp = Number(context.healthPanel?.hp?.temp) || 0;
  const percentHp = hpMax > 0 ? Math.max(0, Math.min(100, Math.round((hpValue / hpMax) * 100))) : 0;
  const skillCount = asArray(context.skillsPanel?.skills).length || Object.keys(context.derived?.skills ?? {}).length;
  const gearGroups = buildInventoryGroups(context.inventoryPanel);
  const actionGroups = buildActionGroups(context.combatActions);
  const equippedEntries = inventoryEntries.filter((entry) => entry?.equipped);
  const totalWeight = Number(context.inventoryPanel?.totalWeight) || 0;
  const credits = Number(actor?.system?.credits) || 0;
  const biography = flags?.biography || '';
  const campaignLog = flags?.campaignLog || '';
  const profileSummary = flags?.profileSummary || '';
  const abilitiesTab = buildAbilityTab(abilities);
  const skills = buildSkillsTab(context, abilities, identity);
  const talents = buildTalentsTab(context);
  const force = buildForceTab(context);
  const relationships = buildRelationshipsTab(context);

  const conditionStep = Number(context.healthPanel?.currentConditionPenalty?.step) || 0;
  const isWounded = hpMax > 0 && hpValue <= Math.ceil(hpMax * 0.5);
  const readinessLabel = context.xpLevelReady
    ? 'Promotion Ready'
    : conditionStep > 0 || isWounded
      ? 'Field Wounded'
      : 'Field Ready';
  const readinessClass = context.xpLevelReady
    ? 'mod--positive'
    : conditionStep > 0 || isWounded
      ? 'mod--negative'
      : 'mod--positive';
  const readinessNote = context.xpLevelReady
    ? 'Experience threshold reached. Level-up procedures are available from the dossier header.'
    : conditionStep > 0
      ? `Condition track shifted to ${context.healthPanel?.currentConditionPenalty?.label || 'Impaired'}.`
      : isWounded
        ? 'Health integrity is below optimal combat readiness.'
        : 'Telemetry reports stable vitals and no immediate advancement triggers.';
  const dossierTags = [
    { label: context.classDisplay || identity.class || 'Unclassified', tone: 'accent' },
    { label: identity.species || 'Unknown Species', tone: 'neutral' },
    { label: identity.background || 'Unrecorded Background', tone: 'accent-soft' },
    { label: identity.homeworld ? `Origin ${identity.homeworld}` : 'Origin Unknown', tone: 'neutral' },
    { label: `Level ${Number(identity.level) || Number(actor?.system?.level) || 1}`, tone: 'ok' }
  ];

  if (context.forceSensitive) {
    dossierTags.push({ label: 'Force-Sensitive', tone: 'force' });
  }

  const tabs = [
    { id: 'overview', label: 'Summary', icon: 'fa-solid fa-file-lines', active: true },
    { id: 'abilities', label: 'Abilities', icon: 'fa-solid fa-dna', count: toCountBadge(abilities.length) },
    { id: 'skills', label: 'Skills', icon: 'fa-solid fa-crosshairs', count: toCountBadge(skillCount) },
    { id: 'combat', label: 'Combat', icon: 'fa-solid fa-burst', count: toCountBadge(attackEntries.length + (unarmedAttackEntry ? 1 : 0) || actionGroups.length) },
    { id: 'talents', label: 'Talents', icon: 'fa-solid fa-diagram-project', count: toCountBadge(talentEntries.length + featEntries.length) },
    { id: 'gear', label: 'Gear', icon: 'fa-solid fa-toolbox', count: toCountBadge(inventoryEntries.length) },
    { id: 'biography', label: 'Biography', icon: 'fa-solid fa-book-open' },
    { id: 'relationships', label: 'Relationships', icon: 'fa-solid fa-network-wired', count: toCountBadge(relationshipEntries.length) }
  ];

  if (context.forceSensitive) {
    tabs.splice(5, 0, { id: 'force', label: 'Force', icon: 'fa-solid fa-sparkles', count: toCountBadge(fpMax) });
  }

  return {
    identity: {
      name: identity.name || actor?.name || 'Unnamed Operative',
      player: identity.player || 'Unassigned',
      species: identity.species || 'Unknown Species',
      classDisplay: context.classDisplay || identity.class || 'Unclassified',
      level: Number(identity.level) || Number(actor?.system?.level) || 1,
      size: identity.size || 'Medium',
      homeworld: identity.homeworld || 'Unknown',
      background: identity.background || 'Unrecorded',
      profession: identity.profession || '—',
      age: identity.age || '—',
      gender: identity.gender || '—',
      height: identity.height || '—',
      weight: identity.weight || '—'
    },
    tabs,
    abilities: abilities.map((ability) => ({
      key: ability.key,
      label: ability.label,
      shortLabel: ability.label?.slice(0, 3)?.toUpperCase?.() || ability.key?.toUpperCase?.() || '—',
      total: Number(ability.total) || 0,
      mod: Number(ability.mod) || 0,
      modClass: ability.modClass || toSignedClass(ability.mod)
    })),
    abilitiesTab,
    defenses: defenses.map((def) => ({
      ...def,
      totalClass: toSignedClass((Number(def?.total) || 0) - 10)
    })),
    quickStats: [
      { label: 'Initiative', value: Number(context.initiativeTotal) || 0, valueClass: toSignedClass(context.initiativeTotal), dataAction: 'roll-initiative' },
      { label: 'Base Attack', value: Number(context.bab) || 0, valueClass: toSignedClass(context.bab), tooltip: 'BaseAttackBonus' },
      { label: 'Perception', value: Number(context.perceptionTotal) || 0, valueClass: toSignedClass(context.perceptionTotal), dataAction: 'roll-skill', dataSkill: 'perception' },
      { label: 'Grapple', value: Number(context.grappleBonus) || 0, valueClass: toSignedClass(context.grappleBonus) },
      { label: 'Speed', value: Number(context.speed) || 0, suffix: 'sq', valueClass: toSignedClass(0), tooltip: 'Speed' },
      { label: 'Damage Threshold', value: Number(context.derived?.damageThreshold) || 0, valueClass: toSignedClass((Number(context.derived?.damageThreshold) || 0) - 10), tooltip: 'DamageThreshold' }
    ],
    vitals: {
      hpValue,
      hpMax,
      hpTemp,
      hpPercent: percentHp,
      hpState: context.healthPanel?.stateLabel || 'Stable',
      xpTotal: Number(context.xpData?.total) || 0,
      xpPercent: Number(context.xpData?.percentRounded) || 0,
      fpValue,
      fpMax,
      dpValue,
      dpMax,
      conditionLabel: context.healthPanel?.currentConditionPenalty?.label || 'Normal'
    },
    summary: {
      cards: [
        { label: 'Profession', value: identity.profession || 'Unlisted' },
        { label: 'Homeworld', value: identity.homeworld || 'Unknown' },
        { label: 'Background', value: identity.background || 'Unrecorded' },
        { label: 'Player', value: identity.player || 'Unassigned' },
        { label: 'Class Track', value: context.classDisplay || identity.class || 'Unclassified' },
        { label: 'Languages', value: languages.length ? languages.join(' · ') : 'Basic only' }
      ],
      heroMetrics: [
        { label: 'Health', value: `${hpValue}/${hpMax || 0}`, valueClass: readinessClass },
        { label: 'Skills', value: String(skillCount || 0), valueClass: 'mod--zero' },
        { label: 'Attacks', value: String(attackEntries.length + (unarmedAttackEntry ? 1 : 0)), valueClass: 'mod--zero' },
        { label: 'Assets', value: String(relationshipEntries.length || 0), valueClass: 'mod--zero' }
      ],
      dossierTags,
      readinessLabel,
      readinessClass,
      readinessNote,
      missionBrief: excerpt(profileSummary || biography || campaignLog || actor?.system?.notes, 320),
      statusChips: buildStatusChips(context),
      notesPreview: excerpt(actor?.system?.notes, 240),
      biographyPreview: excerpt(biography || campaignLog || profileSummary, 260),
      languages,
      quickReadouts: [
        { label: 'Credits', value: credits.toLocaleString() },
        { label: 'Encumbrance', value: totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : 'Untracked' },
        { label: 'Equipped', value: String(equippedEntries.length) },
        { label: 'Allies', value: String(relationshipEntries.length) }
      ]
    },
    skills,
    talents,
    force,
    relationships,
    combat: {
      telemetry: [
        { label: 'Initiative', value: Number(context.initiativeTotal) || 0, valueClass: toSignedClass(context.initiativeTotal), tooltip: 'Initiative' },
        { label: 'Base Attack', value: Number(context.bab) || 0, valueClass: toSignedClass(context.bab), tooltip: 'BaseAttackBonus' },
        { label: 'Speed', value: Number(context.speed) || 0, suffix: 'sq', valueClass: toSignedClass(0), tooltip: 'Speed' },
        { label: 'Damage Threshold', value: Number(context.derived?.damageThreshold) || 0, valueClass: toSignedClass((Number(context.derived?.damageThreshold) || 0) - 10), tooltip: 'DamageThreshold' }
      ],
      attacks: attackEntries.map((attack) => ({
        ...attack,
        weaponId: attack?.weaponId ?? attack?.itemId ?? attack?.sourceId ?? null,
        weaponName: attack?.weaponName ?? attack?.name ?? '',
        weaponType: attack?.weaponType ?? attack?.type ?? attack?.sourceType ?? '',
        attackTotalClass: toSignedClass(attack?.attackTotal),
        tags: asArray(attack?.tags)
      })),
      unarmedAttack: unarmedAttackEntry ? {
        ...unarmedAttackEntry,
        attackTotalClass: toSignedClass(unarmedAttackEntry.attackTotal),
        tags: asArray(unarmedAttackEntry.tags)
      } : null,
      hasAnyAttacks: attackEntries.length > 0 || !!unarmedAttackEntry,
      actionGroups,
      notes: context.combatNotesPanel?.combatNotes || '',
      statusStrip: buildCombatStatusStrip(context, {
        attacks: attackEntries,
        hasAnyAttacks: attackEntries.length > 0 || !!unarmedAttackEntry
      })
    },
    gear: {
      credits,
      totalWeight,
      totalItems: inventoryEntries.length,
      equippedEntries,
      groups: gearGroups,
      equippedArmor: context.armorSummaryPanel?.equippedArmor || null,
      ledgerWeight: context.equipmentLedgerPanel?.totalEquipmentWeight || '',
      hasUpgradeableItems: !!context.inventoryPanel?.hasUpgradeableItems
    },
    biography: {
      profileCards: [
        { label: 'Player', value: identity.player || 'Unassigned' },
        { label: 'Species', value: identity.species || 'Unknown Species' },
        { label: 'Background', value: identity.background || 'Unrecorded' },
        { label: 'Homeworld', value: identity.homeworld || 'Unknown' },
        { label: 'Profession', value: identity.profession || '—' },
        { label: 'Age', value: identity.age || '—' },
        { label: 'Gender', value: identity.gender || '—' },
        { label: 'Height', value: identity.height || '—' },
        { label: 'Weight', value: identity.weight || '—' }
      ],
      biography,
      campaignLog,
      profileSummary,
      languages,
      notesPreview: excerpt(actor?.system?.notes, 220)
    }
  };
}
