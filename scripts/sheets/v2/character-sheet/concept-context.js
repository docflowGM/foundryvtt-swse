import { WeaponVisualProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { CapabilityRegistry } from "/systems/foundryvtt-swse/scripts/engine/capabilities/capability-registry.js";
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

function hasForceSensitivityAccess(context = {}, identity = {}) {
  const actor = context.actor ?? {};
  try {
    if (CapabilityRegistry.isForceSensitive(actor)) return true;
  } catch (_err) {
    // Fall through to direct shape checks; sheet rendering must never fail on capability lookup.
  }

  const system = context.system ?? actor.system ?? {};
  if (context.forceSensitive === true || system.forceSensitive === true || system.progression?.forceSensitive === true) return true;

  const unlockedDomains = system.progression?.unlockedDomains;
  if (Array.isArray(unlockedDomains) && unlockedDomains.includes('force')) return true;

  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const isForcePositiveText = (value) => {
    const text = normalize(value);
    return !!text && (text.includes('force sensitive') || text.includes('force sensitivity') || text.includes('force training')) && !text.includes('non force sensitive');
  };

  const speciesVariant = system.speciesVariant || actor.flags?.swse?.speciesVariant;
  if (speciesVariant) {
    if (isForcePositiveText(speciesVariant.label || speciesVariant.name || speciesVariant.id)) return true;
    const variantSpecial = Array.isArray(speciesVariant.special) ? speciesVariant.special : [];
    if (variantSpecial.some(isForcePositiveText)) return true;
  }

  const speciesTraits = [
    ...(Array.isArray(system.speciesTraits) ? system.speciesTraits : []),
    ...(Array.isArray(system.speciesRules?.traits) ? system.speciesRules.traits : []),
    ...(Array.isArray(system.speciesRules?.special) ? system.speciesRules.special : [])
  ];
  if (speciesTraits.some((trait) => isForcePositiveText(trait?.name || trait?.label || trait))) return true;

  const identitySpecies = identity?.species || system.species || system.race;
  if (typeof identitySpecies === 'object') {
    const special = Array.isArray(identitySpecies.special) ? identitySpecies.special : [];
    const traits = Array.isArray(identitySpecies.traits) ? identitySpecies.traits : [];
    if ([...special, ...traits].some((trait) => isForcePositiveText(trait?.name || trait?.label || trait))) return true;
  }

  const itemList = Array.from(actor.items ?? []);
  return itemList.some((item) => {
    if (!item) return false;
    if (item.type === 'class') {
      const classTags = [
        ...(Array.isArray(item.system?.tags) ? item.system.tags : []),
        ...(Array.isArray(item.system?.metadata?.tags) ? item.system.metadata.tags : []),
        ...(Array.isArray(item.system?.startingFeats) ? item.system.startingFeats : []),
        ...(Array.isArray(item.system?.features) ? item.system.features : [])
      ];
      if (item.system?.forceSensitive === true || classTags.some((entry) => isForcePositiveText(entry?.name || entry?.label || entry))) return true;
    }
    if (item.type === 'species') {
      const special = Array.isArray(item.system?.special) ? item.system.special : [];
      const traits = Array.isArray(item.system?.traits) ? item.system.traits : [];
      const canonicalTraits = Array.isArray(item.system?.canonicalTraits) ? item.system.canonicalTraits : [];
      if ([...special, ...traits, ...canonicalTraits].some((trait) => isForcePositiveText(trait?.name || trait?.label || trait))) return true;
    }
    return item.type === 'feat' && isForcePositiveText(item.name);
  });
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

  // The keyed derived map is the engine-owned source of truth.  The optional
  // .list mirror is display-only and may be rebuilt during a transient repaint;
  // it must never override keyed totals/modifiers.
  const merged = Object.fromEntries(listEntries);
  for (const [key, value] of objectRows) merged[key] = value;
  return merged;
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
      const entries = asArray(grouped[label]).map((entry) => {
        const itemLike = {
          ...entry,
          type: entry?.type || entry?.itemType || (label === 'Weapons' ? 'weapon' : label === 'Armor' ? 'armor' : entry?.type),
          system: entry?.system || entry?.raw?.system || entry
        };
        const visualProfile = WeaponVisualProfileResolver.resolve(itemLike, { actor: inventoryPanel?.actor });
        const activated = visualProfile?.active === true || itemLike.system?.activated === true || itemLike.system?.active === true;

        return {
          ...entry,
          quantity: Number(entry?.quantity) || 1,
          weight: Number(entry?.weight) || 0,
          value: Number(entry?.value) || 0,
          tags: asArray(entry?.tags),
          isLightsaber: visualProfile?.isLightsaber === true,
          activated,
          activationLabel: activated ? 'Deactivate' : 'Activate',
          bladeColor: visualProfile?.bladeColor || null,
          bladeHex: visualProfile?.bladeHex || null
        };
      });

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
      items: asArray(subgroup?.items).map((item) => ({
        key: item?.key || item?.id || '',
        name: item?.name || 'Unnamed Action',
        sourceName: item?.sourceName || item?.source || '',
        actionType: item?.actionType || item?.type || '',
        cost: item?.cost ?? '',
        executable: item?.executable !== false,
        useLabel: item?.useLabel || 'Use',
        description: normalizeText(item?.description || item?.notes),
        itemId: item?.itemId || '',
        resources: asArray(item?.resources),
        relatedSkills: asArray(item?.relatedSkills)
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
      enhancement: Number(ability.enhancement ?? ability.misc) || 0,
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
  const hasForceAccess = hasForceSensitivityAccess(context, identity);
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
    .filter((key) => key !== 'useTheForce' || hasForceAccess)
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
      const derivedAbilityMod = Number(context.derived?.attributes?.[selectedAbility]?.mod);
      const abilityMod = Number.isFinite(Number(skill?.abilityMod))
        ? Number(skill.abilityMod)
        : (Number.isFinite(derivedAbilityMod) ? derivedAbilityMod : 0);
      const miscMod = Number.isFinite(Number(systemSkill?.miscMod)) ? Number(systemSkill.miscMod) : Number(skill?.miscMod) || 0;

      return {
        key,
        label: CANONICAL_SKILL_DEFS[key]?.label || humanizeSkillLabel(key, skill?.label),
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

function buildTalentsTab(context, options = {}) {
  const featEntries = asArray(context.featPanel?.entries).map((feat) => ({
    id: feat?.id || '',
    name: feat?.name || 'Unnamed Feat',
    source: feat?.source || '',
    description: excerpt(feat?.description, 160),
    virtual: feat?.virtual === true
  }));

  const speciesAbilityEntries = options.isDroidActor ? [] : asArray(context.racialAbilitiesPanel?.entries).map((ability, index) => ({
    id: ability?.id || ability?.uuid || ability?.key || `species-ability-${index}`,
    name: ability?.name || ability?.label || 'Species Ability',
    source: ability?.source || ability?.species || 'Species',
    description: excerpt(ability?.description || ability?.summary || ability?.system?.description, 160),
    virtual: ability?.virtual === true
  }));

  const talentGroups = Object.entries(context.talentPanel?.grouped ?? {})
    .map(([label, entries]) => ({
      label,
      count: asArray(entries).length,
      entries: asArray(entries).map((talent) => ({
        id: talent?.id || '',
        name: talent?.name || 'Unnamed Talent',
        source: talent?.source || '',
        description: excerpt(talent?.description, 160),
        virtual: talent?.virtual === true
      }))
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const talentCount = talentGroups.reduce((sum, group) => sum + group.count, 0);

  return {
    featEntries,
    speciesAbilityEntries,
    talentGroups,
    featCount: featEntries.length,
    speciesAbilityCount: speciesAbilityEntries.length,
    talentCount,
    abilityCount: featEntries.length + speciesAbilityEntries.length + talentCount,
    treeCount: talentGroups.length,
    canEditTalents: !!context.talentPanel?.canEdit,
    canEditFeats: !!context.featPanel?.canEdit
  };
}

function forceText(value) {
  return (typeof value === 'string' ? value : String(value || '')).replace(/<[^>]*>/g, '').trim();
}

function forceTextExcerpt(value, max = 160) {
  const text = forceText(value);
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text;
}

function getForceDescriptorTokens(power) {
  const system = power?.system ?? {};
  return [
    system.discipline,
    ...(Array.isArray(system.descriptor) ? system.descriptor : []),
    ...(Array.isArray(system.tags) ? system.tags : []),
    ...(Array.isArray(power?.tags) ? power.tags : []),
    power?.name
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
}

function getForceCardP(power, isForm = false) {
  if (isForm) return 'form';
  const tokens = getForceDescriptorTokens(power).join(' ');
  if (tokens.includes('dark')) return 'dark';
  if (tokens.includes('light') || tokens.includes('vital') || tokens.includes('healing')) return 'light';
  if (tokens.includes('telekinetic') || tokens.includes('tk') || tokens.includes('move object') || tokens.includes('slam') || tokens.includes('thrust') || tokens.includes('grip')) return 'tk';
  if (tokens.includes('mind') || tokens.includes('telepathic') || tokens.includes('illusion')) return 'mind';
  return 'neutral';
}

function getForceDescriptorLabels(power, p) {
  const system = power?.system ?? {};
  const labels = Array.isArray(system.descriptor)
    ? system.descriptor.map((v) => String(v)).filter(Boolean)
    : [];
  if (!labels.length) {
    if (p === 'dark') labels.push('Dark Side');
    else if (p === 'light') labels.push('Light Side');
    else if (p === 'tk') labels.push('Telekinetic');
    else if (p === 'mind') labels.push('Mind-Affecting');
  }
  return labels.slice(0, 3);
}

function getForceSymbol(power, p) {
  if (p === 'dark') return '⚡';
  if (p === 'light') return '✦';
  if (p === 'tk') return '◎';
  if (p === 'mind') return '◉';
  if (p === 'form') return '◆';
  return '✧';
}

function getForceDcRows(power) {
  const system = power?.system ?? {};
  const chart = Array.isArray(system.dcChart) ? system.dcChart : [];
  if (chart.length) {
    return chart.map((row) => ({
      dc: row.dc ?? row.min ?? '',
      effect: forceText(row.description || row.effect || row.effectSummary || '')
    })).filter((row) => row.dc || row.effect);
  }
  const tiers = Array.isArray(system.resolution?.tiers) ? system.resolution.tiers : [];
  return tiers.map((row) => ({
    dc: row.min ?? row.dc ?? '',
    effect: forceText(row.description || row.effect || row.effectSummary || '')
  })).filter((row) => row.dc || row.effect);
}

function normalizeForcePower(power, discarded = false, options = {}) {
  const isForm = options.type === 'form';
  const p = getForceCardP(power, isForm);
  const dcRows = getForceDcRows(power);
  const system = power?.system ?? {};
  const rawTags = system.tags ?? power?.tags;
  const tags = (Array.isArray(rawTags) ? rawTags : []).map((tag) => String(tag));
  const descriptorLabels = getForceDescriptorLabels(power, p);
  const desc = forceText(system.effect || system.description || power?.description || power?.summary || '');
  const blurb = forceTextExcerpt(system.summary || system.effect || system.description || power?.summary || '', 150);

  return {
    id: power?.id || '',
    name: power?.name || 'Unnamed Power',
    img: power?.img || '',
    virtual: power?.virtual === true,
    canUse: power?.virtual !== true && !!power?.id,
    p,
    type: isForm ? 'form' : 'force',
    sym: getForceSymbol(power, p),
    tags,
    descriptorLabels,
    form: forceText(system.form || system.lightsaberForm || power?.form || ''),
    tagString: [...tags, ...descriptorLabels].join(' '),
    blurb,
    desc,
    dcRows,
    hasDcRows: dcRows.length > 0,
    fpOk: p !== 'dark',
    discarded,
    // Legacy fields kept for backward compat with old force-tab
    summary: forceTextExcerpt(system.summary || system.description || power?.summary || '', 160)
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

export function buildForceTab(context) {
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

  // Force Suite: split hand into force powers vs lightsaber form powers
  const forceSuiteHand = hand.filter((power) => power.type !== 'form');
  const forceSuiteForms = hand.filter((power) => power.type === 'form');

  // Resolve Use the Force total from the skills panel
  const skillsEntries = asArray(context.skillsPanel?.skills ?? context.skillsPanel?.entries);
  const utfSkill = skillsEntries.find((skill) => {
    const key = String(skill?.key || skill?.id || skill?.name || '').toLowerCase().replace(/[\s\-_]/g, '');
    return key === 'usetheforce';
  });
  const utfTotal = utfSkill?.total ?? context.useTheForceTotal ?? '—';

  // Actor subtitle from identity
  const identity = context.biographyPanel?.identity ?? {};
  const actorSubtitle = [
    context.classDisplay || identity.class,
    identity.level ? `Level ${Number(identity.level) || Number(context.actor?.system?.level) || 1}` : null,
    identity.species
  ].filter(Boolean).join(' · ');

  const forceSuite = {
    actorName: actor?.name || 'Unknown Force User',
    actorSubtitle,
    utfTotal,
    forcePointsValue: Number(context.forcePointsValue) || 0,
    forcePointsMax: Number(context.forcePointsMax) || 0,
    destinyPointsValue: Number(context.destinyPointsValue) || 0,
    destinyPointsMax: Number(context.destinyPointsMax) || 0,
    darkSideValue: Number(context.darkSidePanel?.value) || 0,
    darkSideMax: Number(context.darkSidePanel?.max) || 0,
    forcePowers: forceSuiteHand,
    formPowers: forceSuiteForms,
    discarded: discard,
    counts: {
      force: forceSuiteHand.length,
      form: forceSuiteForms.length,
      discard: discard.length
    },
    forcefulRecovery,
    hasDarkSideScore: (Number(context.darkSidePanel?.value) || 0) > 0
  };

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
    forceSuite,
    constructionAvailable: !!context.lightsaberConstructionAvailable,
    constructionDeferred: !!context.lightsaberConstructionDeferred
  };
}

function normalizeStarshipManeuver(entry, discarded = false) {
  const system = entry?.system ?? {};
  const rawTags = system.tags ?? system.descriptor ?? entry?.tags ?? [];
  const tags = (Array.isArray(rawTags) ? rawTags : String(rawTags || '').split(/[,;]/))
    .map((tag) => String(tag || '').trim())
    .filter(Boolean);
  const descriptorLabels = tags.slice(0, 3);
  const desc = forceText(system.effect || system.benefit || system.description || system.normalText || entry?.description || entry?.summary || '');
  const blurb = forceTextExcerpt(system.summary || system.effect || system.benefit || system.description || entry?.summary || '', 150);
  const dcRows = getForceDcRows({ system });

  return {
    id: entry?.id || entry?._id || '',
    name: entry?.name || 'Unnamed Maneuver',
    img: entry?.img || '',
    virtual: entry?.virtual === true,
    canUse: entry?.virtual !== true && !!(entry?.id || entry?._id),
    p: 'neutral',
    type: 'starship-maneuver',
    sym: '✦',
    tags,
    descriptorLabels,
    form: forceText(system.category || system.descriptor || entry?.category || ''),
    tagString: tags.join(' '),
    blurb,
    desc,
    dcRows,
    hasDcRows: dcRows.length > 0,
    fpOk: true,
    discarded: discarded || system.spent === true,
    summary: forceTextExcerpt(system.summary || system.description || entry?.summary || '', 160)
  };
}

function buildStarshipSuiteTab(context) {
  const actor = context.actor;
  const suiteIds = new Set(Array.isArray(actor?.system?.starshipManeuverSuite?.maneuvers)
    ? actor.system.starshipManeuverSuite.maneuvers.map((value) => String(value))
    : []);
  const maneuverItems = asArray(actor?.items?.contents || Array.from(actor?.items || []))
    .filter((item) => String(item?.type || '').toLowerCase() === 'maneuver')
    .filter((item) => !suiteIds.size || suiteIds.has(String(item.id || item._id)) || suiteIds.has(String(item.name || '')));

  const fallbackEntries = asArray(context.starshipManeuversPanel?.entries).map((entry) => ({ ...entry, virtual: true }));
  const sourceEntries = maneuverItems.length ? maneuverItems : fallbackEntries;
  const ready = sourceEntries.filter((entry) => entry?.system?.spent !== true).map((entry) => normalizeStarshipManeuver(entry, false));
  const spent = sourceEntries.filter((entry) => entry?.system?.spent === true).map((entry) => normalizeStarshipManeuver(entry, true));

  const skillsEntries = asArray(context.skillsPanel?.skills ?? context.skillsPanel?.entries);
  const pilotSkill = skillsEntries.find((skill) => {
    const key = String(skill?.key || skill?.id || skill?.name || '').toLowerCase().replace(/[\s\-_]/g, '');
    return key === 'pilot';
  });
  const pilotTotal = pilotSkill?.total ?? context.pilotTotal ?? '—';

  const identity = context.biographyPanel?.identity ?? {};
  const actorSubtitle = [
    context.classDisplay || identity.class,
    identity.level ? `Level ${Number(identity.level) || Number(context.actor?.system?.level) || 1}` : null,
    identity.species
  ].filter(Boolean).join(' · ');

  const starshipSuite = {
    actorName: actor?.name || 'Unknown Pilot',
    actorSubtitle,
    pilotTotal,
    forcePointsValue: Number(context.forcePointsValue) || 0,
    forcePointsMax: Number(context.forcePointsMax) || 0,
    maneuvers: ready,
    spent,
    counts: {
      maneuvers: ready.length,
      spent: spent.length,
      total: ready.length + spent.length,
    },
  };

  return {
    hasAnything: ready.length > 0 || spent.length > 0,
    entries: [...ready, ...spent],
    starshipSuite,
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
  const isDroidActor = context.isDroidActor === true || actor?.type === 'droid' || actor?.system?.isDroid === true;
  const flags = actor?.flags?.swse?.character ?? {};
  const identity = context.biographyPanel?.identity ?? {};
  const droidDegreeLabel = context.droid?.degree?.label || actor?.system?.droidSystems?.degree || actor?.system?.droidDegree || '';
  const droidChassisLabel = actor?.system?.droidSystems?.chassis?.name || actor?.system?.droidModel || actor?.system?.droidType || identity.species || 'Droid Chassis';
  const identityKindLabel = isDroidActor ? 'Droid Chassis' : 'Species';
  const defenses = asArray(context.defensePanel?.defenses);
  const abilities = asArray(context.abilities);
  const languages = asArray(context.languagesPanel?.entries);
  const inventoryEntries = asArray(context.inventoryPanel?.entries);
  const talentEntries = asArray(context.talentPanel?.entries);
  const featEntries = asArray(context.featPanel?.entries);
  const relationshipEntries = asArray(context.relationshipsPanel?.relationships);
  const statusFeedEntries = asArray(flags?.statusFeed)
    .map((entry, index) => ({
      id: entry?.id || `status-${index}`,
      label: normalizeText(entry?.label || entry?.title || 'Status Update'),
      detail: normalizeText(entry?.detail || entry?.message || ''),
      value: normalizeText(entry?.value || ''),
      timestamp: normalizeText(entry?.timestamp || entry?.time || ''),
      tone: entry?.tone || 'neutral'
    }))
    .filter((entry) => entry.label)
    .slice(0, 8);
  const attackEntries = asArray(context.combat?.attacks);
  const unarmedAttack = context.combat?.unarmedAttack ?? null;
  const unarmedAttackEntry = unarmedAttack ? {
    id: 'virtual-unarmed-attack',
    name: unarmedAttack.name || 'Unarmed Strike',
    sourceType: 'unarmed',
    virtual: true,
    attackTotal: Number(unarmedAttack.attackTotal ?? unarmedAttack.attackBonus ?? context.bab ?? 0) || 0,
    attackBonus: Number(unarmedAttack.attackTotal ?? unarmedAttack.attackBonus ?? context.bab ?? 0) || 0,
    damageFormula: unarmedAttack.damageFormula || [unarmedAttack.damage, unarmedAttack.damageType].filter(Boolean).join(' ') || '1d4',
    damage: unarmedAttack.damageFormula || unarmedAttack.damage || '1d4',
    critRange: unarmedAttack.critRange || '20',
    critMult: unarmedAttack.critMult || 'x2',
    range: unarmedAttack.range || 'Melee',
    weaponName: unarmedAttack.name || 'Unarmed Strike',
    weaponType: unarmedAttack.weaponType || 'Unarmed · Melee',
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
  const virtualUnarmedLoadoutEntry = unarmedAttackEntry ? {
    ...unarmedAttackEntry,
    id: 'swse-virtual-unarmed',
    type: 'weapon',
    typeLabel: 'Innate Weapon',
    equipped: true,
    quantity: 1,
    weight: 0,
    value: 0,
    hasAttackProfile: true,
    isVirtual: true,
    virtual: true,
    isNaturalWeapon: true,
    canEdit: false,
    canInspect: false,
    activationLabel: '',
    attackTotalClass: toSignedClass(unarmedAttackEntry.attackTotal),
    tags: Array.from(new Set(['Always Available', 'Unarmed', ...asArray(unarmedAttackEntry.tags)]))
  } : null;
  const equippedEntries = [
    ...(virtualUnarmedLoadoutEntry ? [virtualUnarmedLoadoutEntry] : []),
    ...inventoryEntries.filter((entry) => entry?.equipped)
  ];
  const totalWeight = Number(context.inventoryPanel?.totalWeight) || 0;
  const credits = Number(actor?.system?.credits) || 0;
  const biography = flags?.biography || '';
  const campaignLog = flags?.campaignLog || '';
  const profileSummary = flags?.profileSummary || '';
  const forceAccess = hasForceSensitivityAccess(context, identity);
  const abilitiesTab = buildAbilityTab(abilities);
  const skills = buildSkillsTab(context, abilities, identity);
  const talents = buildTalentsTab(context, { isDroidActor });
  const force = buildForceTab(context);
  const starship = buildStarshipSuiteTab(context);
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
  const homeworldText = normalizeText(identity.homeworld);
  const hasKnownHomeworld = !!homeworldText && !['unknown', '—', '-', 'none', 'n/a'].includes(homeworldText.toLowerCase());
  const dossierTags = [
    { label: context.classDisplay || identity.class || (isDroidActor ? 'Droid' : 'Unclassified'), tone: 'accent' },
    { label: isDroidActor ? droidChassisLabel : (identity.species || 'Unknown Species'), tone: 'neutral' },
    ...(isDroidActor && droidDegreeLabel ? [{ label: droidDegreeLabel, tone: 'accent-soft' }] : []),
    ...(!isDroidActor ? [{ label: identity.background || 'Unrecorded Background', tone: 'accent-soft' }] : []),
    { label: hasKnownHomeworld ? `From ${homeworldText}` : (isDroidActor ? 'Manufacturer Unknown' : 'From Parts Unknown'), tone: 'neutral' },
    { label: `Level ${Number(identity.level) || Number(actor?.system?.level) || 1}`, tone: 'ok' }
  ];

  if (forceAccess) {
    dossierTags.push({ label: 'Force-Sensitive', tone: 'force' });
  }

  const speciesAbilityCount = isDroidActor ? 0 : asArray(context.racialAbilitiesPanel?.entries).length;
  const starshipManeuverCount = starship.starshipSuite?.counts?.total || 0;
  const tabs = [
    { id: 'overview', label: 'Summary', icon: 'fa-solid fa-file-lines', active: true },
    { id: 'abilities', label: 'Attributes', icon: 'fa-solid fa-dna', count: toCountBadge(abilities.length) },
    { id: 'skills', label: 'Skills', icon: 'fa-solid fa-crosshairs', count: toCountBadge(skillCount) },
    { id: 'combat', label: 'Combat', icon: 'fa-solid fa-burst', count: toCountBadge(attackEntries.length + (unarmedAttackEntry ? 1 : 0) || actionGroups.length) },
    { id: 'talents', label: 'Abilities', icon: 'fa-solid fa-diagram-project', count: toCountBadge(talentEntries.length + featEntries.length + speciesAbilityCount) },
    ...(isDroidActor ? [{
      id: 'droid-systems',
      label: 'Droid Systems',
      icon: 'fa-solid fa-robot',
      count: toCountBadge((context.droid?.resolvedSystems?.summary?.weaponizedPartCount || 0) + (context.droid?.resolvedSystems?.summary?.skillModifierCount || 0) || '')
    }] : []),
    { id: 'gear', label: 'Gear', icon: 'fa-solid fa-toolbox', count: toCountBadge(inventoryEntries.length) },
    { id: 'biography', label: 'Biography', icon: 'fa-solid fa-book-open' }
  ];

  let suiteInsertIndex = 5;
  if (forceAccess) {
    tabs.splice(suiteInsertIndex, 0, { id: 'force', label: 'Force', icon: 'fa-solid fa-sparkles', count: toCountBadge(fpMax) });
    suiteInsertIndex += 1;
  }
  if (starship.hasAnything) {
    tabs.splice(suiteInsertIndex, 0, { id: 'starship', label: 'Starship', icon: 'fa-solid fa-rocket', count: toCountBadge(starshipManeuverCount) });
  }

  return {
    identity: {
      name: identity.name || actor?.name || 'Unnamed Operative',
      player: identity.player || 'Unassigned',
      species: isDroidActor ? droidChassisLabel : (identity.species || 'Unknown Species'),
      speciesLabel: identityKindLabel,
      droidChassis: isDroidActor ? droidChassisLabel : '',
      droidDegree: isDroidActor ? (droidDegreeLabel || 'Unclassified Droid') : '',
      classDisplay: context.classDisplay || identity.class || (isDroidActor ? 'Droid' : 'Unclassified'),
      level: Number(identity.level) || Number(actor?.system?.level) || 1,
      size: identity.size || 'Medium',
      homeworld: identity.homeworld || 'Unknown',
      background: identity.background || 'Unrecorded',
      profession: identity.profession || '—',
      age: identity.age || '—',
      gender: identity.gender || '—',
      height: identity.height || '—',
      weight: identity.weight || '—',
      forceSensitive: forceAccess
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
      conditionLabel: context.healthPanel?.currentConditionPenalty?.label || 'Normal',
      speed: Number(context.speed) || 0
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
        { label: 'XP', value: (Number(context.xpData?.total) || 0).toLocaleString() },
        { label: 'Encumbrance', value: totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : 'Untracked' },
        { label: 'Equipped', value: String(equippedEntries.length) }
      ],
      statusFeedEntries
    },
    skills,
    talents,
    force,
    starship,
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
      profileCards: isDroidActor ? [
        { label: 'Operator', value: identity.player || 'Unassigned' },
        { label: 'Droid Chassis', value: droidChassisLabel },
        { label: 'Droid Degree', value: droidDegreeLabel || 'Unclassified Droid' },
        { label: 'Manufacturer', value: actor?.system?.manufacturer || identity.homeworld || 'Unknown' },
        { label: 'Function', value: actor?.system?.droidFunction || identity.profession || '—' },
        { label: 'Size', value: identity.size || actor?.system?.size || 'Medium' }
      ] : [
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
