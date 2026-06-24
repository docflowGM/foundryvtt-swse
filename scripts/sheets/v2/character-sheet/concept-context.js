import { WeaponVisualProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { LightsaberFormEngine } from "/systems/foundryvtt-swse/scripts/engine/talent/lightsaber-form-engine.js";
import { CapabilityRegistry } from "/systems/foundryvtt-swse/scripts/engine/capabilities/capability-registry.js";
import { getLightsaberFormAccentKey } from "/systems/foundryvtt-swse/scripts/engine/force/lightsaber-form-accents.js";
import { resolveForceCardSummary } from "/systems/foundryvtt-swse/scripts/engine/force/force-card-summaries.js";
import { CANONICAL_SKILL_DEFS, canonicalizeSkillKey, normalizeSkillMap } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";
import { isClassFeatureItem } from "/systems/foundryvtt-swse/scripts/utils/item-classification.js";
import { ProgressionReconciler } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js";
import { getForceAlchemyLaunchForTalentName, getForceAlchemyRite } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-data.js";
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


const ATHLETICS_COMPONENT_KEYS = ['acrobatics', 'climb', 'jump', 'swim'];

function athleticsConsolidationActive() {
  try { return game.settings.get('foundryvtt-swse', 'athleticsConsolidation') === true; }
  catch (_err) { return false; }
}

function buildConsolidatedAthleticsSkill({ derivedSkills = {}, systemSkills = {}, context = {}, abilityMap = new Map() } = {}) {
  const componentRows = ATHLETICS_COMPONENT_KEYS.map((key) => ({
    key,
    system: systemSkills?.[key] ?? {},
    derived: derivedSkills?.[key] ?? {}
  }));
  const existingSystem = systemSkills?.athletics ?? {};
  const existingDerived = derivedSkills?.athletics ?? {};
  const selectedAbility = abilityMap.has(existingSystem.selectedAbility)
    ? existingSystem.selectedAbility
    : (abilityMap.has(existingDerived.selectedAbility)
      ? existingDerived.selectedAbility
      : (abilityMap.has(existingDerived.ability) ? existingDerived.ability : 'dex'));
  const derivedAbilityMod = Number(context.derived?.attributes?.[selectedAbility]?.mod);
  const abilityMod = Number.isFinite(Number(existingDerived?.abilityMod))
    ? Number(existingDerived.abilityMod)
    : (Number.isFinite(derivedAbilityMod) ? derivedAbilityMod : 0);
  const componentTotals = componentRows
    .map(({ system, derived }) => Number(derived?.total ?? system?.total))
    .filter(Number.isFinite);
  const total = Number.isFinite(Number(existingDerived?.total))
    ? Number(existingDerived.total)
    : (componentTotals.length ? Math.max(...componentTotals) : Number(existingSystem?.total) || 0);

  return {
    ...existingSystem,
    ...existingDerived,
    key: 'athletics',
    label: 'Athletics',
    selectedAbility,
    ability: selectedAbility,
    abilityMod,
    total,
    trained: existingSystem.trained === true || existingDerived.trained === true || componentRows.some(({ system, derived }) => system?.trained === true || derived?.trained === true),
    focused: existingSystem.focused === true || existingDerived.focused === true || componentRows.some(({ system, derived }) => system?.focused === true || derived?.focused === true),
    favorite: existingSystem.favorite === true || existingDerived.favorite === true || componentRows.some(({ system, derived }) => system?.favorite === true || derived?.favorite === true),
    miscMod: Number.isFinite(Number(existingSystem.miscMod))
      ? Number(existingSystem.miscMod)
      : componentRows.reduce((sum, { system }) => sum + (Number(system?.miscMod) || 0), 0),
    extraUsesGrouped: existingDerived.extraUsesGrouped ?? existingSystem.extraUsesGrouped,
    extraUses: existingDerived.extraUses ?? existingSystem.extraUses,
    extraUsesCount: existingDerived.extraUsesCount ?? existingSystem.extraUsesCount
  };
}

function buildStatusChips({ healthPanel, secondWindPanel, forceSensitive, inventoryPanel, armorSummaryPanel }) {
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

  const swUses = Number(secondWindPanel?.uses);
  const swMax = Number(secondWindPanel?.max);
  if (Number.isFinite(swUses) || Number.isFinite(swMax)) {
    const safeUses = Math.max(0, Number.isFinite(swUses) ? swUses : 0);
    const safeMax = Math.max(1, Number.isFinite(swMax) && swMax > 0 ? swMax : 1);
    chips.push({
      label: `Second Wind ${safeUses}/${safeMax}`,
      tone: safeUses > 0 ? 'ok' : 'warn'
    });
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
  const rawSwMax = Number(secondWind.max ?? secondWind.maximum ?? context.actor?.system?.secondWind?.max);
  const rawSwUses = Number(secondWind.uses ?? secondWind.remaining ?? context.actor?.system?.secondWind?.uses);
  const swMax = Math.max(1, Number.isFinite(rawSwMax) && rawSwMax > 0 ? rawSwMax : 1);
  const swUses = Math.max(0, Math.min(swMax, Number.isFinite(rawSwUses) ? rawSwUses : swMax));
  const secondWindUsed = swUses <= 0 || !!(secondWind.used || secondWind.isUsed || secondWind.spent);

  chips.push(conditionStep > 0
    ? { label: `CT ${conditionLabel}`, tone: conditionStep >= 3 ? 'danger' : 'warn', tooltip: 'ConditionTrack' }
    : { label: 'CT Normal', tone: 'ok', tooltip: 'ConditionTrack' });

  if (hpMax > 0 && hpPct <= 0.25) chips.push({ label: 'Critical HP', tone: 'danger', tooltip: 'HitPoints' });
  else if (hpMax > 0 && hpPct <= 0.5) chips.push({ label: 'Wounded', tone: 'warn', tooltip: 'HitPoints' });
  else chips.push({ label: 'Vitals Stable', tone: 'ok', tooltip: 'HitPoints' });

  if (hpTemp > 0) chips.push({ label: `Temp HP +${hpTemp}`, tone: 'accent', tooltip: 'HitPoints' });
  chips.push(secondWindUsed
    ? { label: `Second Wind ${swUses}/${swMax}`, tone: 'neutral', tooltip: 'SecondWind' }
    : { label: `Second Wind ${swUses}/${swMax}`, tone: 'ok', tooltip: 'SecondWind' });
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
          isLightsaber: visualProfile?.isLightsaber === true || entry?.isLightsaber === true,
          isEnergyShield: entry?.isEnergyShield === true,
          shieldRating: Number(entry?.shieldRating) || 0,
          currentSR: Number(entry?.currentSR) || 0,
          activated,
          canToggleActivated: entry?.canToggleActivated === true || visualProfile?.isLightsaber === true || entry?.isEnergyShield === true,
          activationLabel: activated ? 'Deactivate' : 'Activate',
          activationTitle: activated
            ? (entry?.isEnergyShield ? 'Deactivate energy shield' : 'Deactivate lightsaber blade')
            : (entry?.isEnergyShield ? 'Activate energy shield' : 'Activate lightsaber blade'),
          activationStateLabel: activated
            ? (entry?.isEnergyShield ? 'Shield Active' : 'Blade Active')
            : (entry?.isEnergyShield ? 'Shield Inactive' : 'Blade Inactive'),
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

function normalizeCombatActionLaneKey(value = '') {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw) return 'free';
  if (raw.includes('full')) return 'full-round';
  if (raw.includes('standard')) return 'standard';
  if (raw.includes('move')) return 'move';
  if (raw.includes('swift')) return 'swift';
  if (raw.includes('reaction') || raw === 'rx') return 'reaction';
  if (raw.includes('free')) return 'free';
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'free';
}

function buildActionGroups(combatActions, actionEconomy = {}) {
  const economySteps = new Map(asArray(actionEconomy?.steps).map((step) => [normalizeCombatActionLaneKey(step?.key || step?.label), step]));
  const resolveAvailability = (laneKey) => {
    const normalized = normalizeCombatActionLaneKey(laneKey);
    if (normalized === 'free') {
      return {
        available: true,
        className: 'is-available',
        label: 'Unlimited',
        tooltip: 'Free actions are unlimited, subject to GM discretion.'
      };
    }
    const step = economySteps.get(normalized);
    if (!actionEconomy?.active || !step) {
      return {
        available: true,
        className: 'is-reference',
        label: 'Reference',
        tooltip: 'Add this actor to the combat tracker to spend actions from the sheet.'
      };
    }
    const available = step.canSpend !== false && !String(step.state || '').toLowerCase().includes('used');
    return {
      available,
      className: available ? 'is-available' : 'is-spent',
      label: step.stateLabel || (available ? 'Available' : 'Spent'),
      tooltip: step.tooltip || ''
    };
  };

  const normalizeItem = (item, fallbackLaneKey = '') => {
    const laneKey = normalizeCombatActionLaneKey(item?.actionType || item?.type || item?.cost || fallbackLaneKey);
    const availability = resolveAvailability(laneKey);
    const executable = item?.executable !== false;
    return {
      key: item?.key || item?.id || '',
      name: item?.name || 'Unnamed Action',
      sourceName: item?.sourceName || item?.source || '',
      actionType: item?.actionType || item?.type || '',
      laneKey,
      cost: item?.cost ?? '',
      executable,
      economyAvailable: availability.available,
      canUseNow: executable && availability.available,
      unavailableReason: executable ? (availability.available ? '' : `${availability.label} action unavailable`) : 'This action cannot be used from the sheet.',
      useLabel: item?.useLabel || 'Use',
      description: normalizeText(item?.description || item?.notes),
      itemId: item?.itemId || '',
      resources: asArray(item?.resources),
      relatedSkills: asArray(item?.relatedSkills)
    };
  };

  const laneOrder = ['full-round', 'standard', 'move', 'swift', 'reaction', 'free'];
  return asArray(combatActions?.groups).map((group, index) => {
    const groupKey = normalizeCombatActionLaneKey(group?.key || group?.id || group?.label || `actions-${index}`);
    const availability = resolveAvailability(groupKey);
    const subgroups = asArray(group?.subgroups).map((subgroup) => ({
      label: subgroup?.label || 'Actions',
      count: Number(subgroup?.count) || 0,
      items: asArray(subgroup?.items).map((item) => normalizeItem(item, groupKey))
    }));
    const directItems = asArray(group?.items).map((item) => normalizeItem(item, groupKey));
    const flattenedItems = directItems.length
      ? directItems
      : subgroups.flatMap((subgroup) => subgroup.items);

    return {
      key: groupKey,
      sortIndex: laneOrder.includes(groupKey) ? laneOrder.indexOf(groupKey) : laneOrder.length + index,
      label: group?.label || 'Actions',
      count: Number(group?.count) || flattenedItems.length,
      availabilityLabel: availability.label,
      availabilityClass: availability.className,
      availabilityTooltip: availability.tooltip,
      isAvailable: availability.available,
      items: flattenedItems,
      subgroups
    };
  })
    .filter((group) => group.items.length > 0 || group.subgroups.length > 0)
    .sort((a, b) => a.sortIndex - b.sortIndex || a.label.localeCompare(b.label));
}

function buildSheetProgressionAudit(actor) {
  try {
    return ProgressionReconciler.safeReconcileActor(actor, { output: 'sheet' });
  } catch (err) {
    console.warn('[SWSE] Progression audit unavailable for character sheet', err);
    return {
      status: 'unavailable',
      warnings: ['Progression audit unavailable'],
      abilityIncreases: {
        expected: 0,
        filled: 0,
        open: 0,
        hasOpenSlots: false,
        slots: [],
        openSlots: []
      },
      classChoices: {
        expected: 0,
        filled: 0,
        open: 0,
        hasOpenSlots: false,
        openSlots: []
      },
      generalFeats: { expected: 0, filled: 0, current: 0, open: 0, overfilled: 0, slots: [], openSlots: [], overfilledSlots: [] },
      classFeats: { expected: 0, filled: 0, current: 0, open: 0, overfilled: 0, slots: [], openSlots: [], overfilledSlots: [] },
      heroicTalents: { expected: 0, filled: 0, current: 0, open: 0, overfilled: 0, slots: [], openSlots: [], overfilledSlots: [] },
      classTalents: { expected: 0, filled: 0, current: 0, open: 0, overfilled: 0, slots: [], openSlots: [], overfilledSlots: [] },
      trainingLedgers: [],
      byClass: [],
      tasks: []
    };
  }
}

function buildAbilityTab(abilities, progressionAudit = {}) {
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

  const abilityAudit = progressionAudit?.abilityIncreases || {};
  const openIncreaseCount = Number(abilityAudit.open || 0) || 0;
  const expectedIncreaseCount = Number(abilityAudit.expected || 0) || 0;
  const filledIncreaseCount = Number(abilityAudit.filled || 0) || 0;
  const openIncreaseSlots = asArray(abilityAudit.openSlots);

  return {
    entries,
    summaryCards: [
      { label: 'Primary', value: primary ? `${primary.label} ${primary.total}` : '—' },
      { label: 'Secondary', value: secondary ? `${secondary.label} ${secondary.total}` : '—' },
      { label: 'Lowest', value: lowest ? `${lowest.label} ${lowest.total}` : '—' },
      { label: 'Modifier Sum', value: totalMods >= 0 ? `+${totalMods}` : String(totalMods) },
      { label: 'Ability Total', value: String(totalScore || 0) },
      { label: 'Ability Increases', value: expectedIncreaseCount ? `${filledIncreaseCount}/${expectedIncreaseCount} resolved` : 'None due' }
    ],
    abilityIncreasePanel: {
      expected: expectedIncreaseCount,
      filled: filledIncreaseCount,
      open: openIncreaseCount,
      hasOpenSlots: openIncreaseCount > 0,
      slots: asArray(abilityAudit.slots),
      openSlots: openIncreaseSlots,
      statusLabel: openIncreaseCount > 0 ? `${openIncreaseCount} unresolved` : 'Resolved',
      hint: openIncreaseCount > 0
        ? 'These are progression-created ability score increase slots that have not been recorded as resolved.'
        : 'Ability score increase accounting is resolved for recorded progression levels.'
    }
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

  const athleticsOn = athleticsConsolidationActive();
  const visibleSkillKeys = Object.keys(CANONICAL_SKILL_DEFS)
    .filter((key) => {
      if (key === 'useTheForce' && !hasForceAccess) return false;
      if (athleticsOn) return !ATHLETICS_COMPONENT_KEYS.includes(key);
      return key !== 'athletics';
    });

  const entries = visibleSkillKeys
    .map((key) => {
      const isConsolidatedAthletics = athleticsOn && key === 'athletics';
      const consolidatedAthletics = isConsolidatedAthletics
        ? buildConsolidatedAthleticsSkill({ derivedSkills, systemSkills, context, abilityMap })
        : null;
      const skill = consolidatedAthletics ?? (derivedSkills[key] ?? {});
      const systemSkill = consolidatedAthletics ?? (systemSkills[key] ?? {});
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
        abilityChoices: abilityChoices.map(ab => ({ ...ab }))
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
      abilityChoices: abilityChoices.map(ab => ({ ...ab }))
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


function normalizeFeatureType(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classItemName(item = {}) {
  return normalizeText(item.system?.class_name || item.system?.name || item.name || 'Class');
}

function classItemId(item = {}) {
  return String(item.system?.classId || item.system?.id || item.id || classItemName(item)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function actorClassLevel(actor, classItem = {}) {
  const direct = Number(classItem.system?.level ?? classItem.system?.classLevel ?? classItem.system?.levels ?? 0) || 0;
  const classNameKey = slugify(classItemName(classItem));
  const classIdKey = slugify(classItemId(classItem));
  const progressionLevels = asArray(actor?.system?.progression?.classLevels)
    .filter((entry) => {
      const entryName = slugify(entry?.class || entry?.name || entry?.className || '');
      const entryId = slugify(entry?.classId || entry?.id || entry?.class || '');
      return (!!entryName && entryName === classNameKey) || (!!entryId && entryId === classIdKey);
    })
    .map((entry) => Number(entry?.level ?? entry?.classLevel ?? 0) || 0);
  return Math.max(direct, ...progressionLevels, 0);
}

function classProgressionRows(classItem = {}) {
  const system = classItem.system ?? {};
  return asArray(
    system.levelProgression
    || system.level_progression
    || system.progression?.levelProgression
    || system.progression?.levels
    || system.progression
  );
}

function featureName(feature = {}) {
  return normalizeText(feature.name || feature.label || feature.id || 'Class Feature');
}

function featureType(feature = {}) {
  return normalizeFeatureType(feature.type || feature.featureType || feature.kind || feature.category || 'class_feature');
}

function shouldRenderClassFeature(feature = {}) {
  const name = featureName(feature);
  if (!name) return false;
  const type = featureType(feature);
  const nameKey = normalizeFeatureType(name);

  if (type.includes('talent') || type.includes('feat choice') || type === 'feat' || type === 'bonus feat') return false;
  if (type.includes('skill choice') || type.includes('trained skill')) return false;
  if (type.includes('proficiency') || type === 'feat grant' || type === 'starting feat') return false;
  if (nameKey === 'talent' || nameKey === 'feat' || nameKey === 'bonus feat') return false;

  return type.includes('class feature')
    || type.includes('scaling feature')
    || type.includes('feature')
    || type === 'passive'
    || type === 'grant'
    || type === '';
}

function parseClassSource(source = '') {
  const text = normalizeText(source);
  const match = text.match(/^(.*?)(?:\s+(?:level\s*)?(\d+))$/i);
  if (!match) return { sourceClass: text, classLevel: 0 };
  return {
    sourceClass: normalizeText(match[1]) || text,
    classLevel: Number(match[2]) || 0
  };
}

function classFeatureDescription(feature = {}, fallback = '') {
  return excerpt(
    feature.description
    || feature.summary
    || feature.benefit
    || feature.effect
    || feature.details
    || feature.notes
    || fallback,
    180
  );
}

function actorClassFeatureRows(actor = {}) {
  const rows = [];
  const items = Array.from(actor?.items ?? []);

  for (const item of items.filter(isClassFeatureItem)) {
    const sourceText = normalizeText(item.system?.source || item.system?.sourcebook || item.flags?.swse?.sourceClass || 'Class Feature');
    const parsed = parseClassSource(sourceText);
    const sourceClass = normalizeText(item.system?.sourceClass || item.system?.className || item.flags?.swse?.sourceClass || parsed.sourceClass || 'Class Feature');
    const classLevel = Number(item.system?.classLevel ?? item.flags?.swse?.progression?.classLevel ?? parsed.classLevel ?? 0) || 0;
    const type = featureType(item.system || {});
    const label = classLevel > 0 ? `${sourceClass} ${classLevel}` : sourceText;
    rows.push({
      id: item.id || item.uuid || `class-feature-${slugify(item.name)}`,
      itemId: item.id || '',
      uuid: item.uuid || '',
      name: item.name || 'Class Feature',
      source: sourceText || label,
      sourceClass,
      classLevel,
      levelLabel: label || 'Class Feature',
      type,
      typeLabel: titleCase(type || 'class feature'),
      description: classFeatureDescription(item.system || {}, `Class feature from ${label || sourceClass}.`),
      virtual: false
    });
  }

  for (const classItem of items.filter((item) => item?.type === 'class')) {
    const sourceClass = classItemName(classItem);
    const currentLevel = actorClassLevel(actor, classItem);
    if (currentLevel <= 0) continue;

    for (const levelRow of classProgressionRows(classItem)) {
      const classLevel = Number(levelRow?.level ?? levelRow?.classLevel ?? 0) || 0;
      if (classLevel <= 0 || classLevel > currentLevel) continue;
      const features = asArray(levelRow.features || levelRow.classFeatures || levelRow.grants);
      features.forEach((feature, index) => {
        if (!shouldRenderClassFeature(feature)) return;
        const name = featureName(feature);
        const type = featureType(feature);
        rows.push({
          id: `class-feature-${slugify(sourceClass)}-${classLevel}-${slugify(name)}-${index}`,
          itemId: '',
          uuid: '',
          name,
          source: `${sourceClass} ${classLevel}`,
          sourceClass,
          classLevel,
          levelLabel: `${sourceClass} ${classLevel}`,
          type,
          typeLabel: titleCase(type || 'class feature'),
          description: classFeatureDescription(feature, `Class feature from ${sourceClass} level ${classLevel}.`),
          virtual: true
        });
      });
    }
  }

  const byKey = new Map();
  for (const row of rows) {
    const key = `${slugify(row.sourceClass)}::${slugify(row.name)}`;
    const previous = byKey.get(key);
    if (previous && !previous.virtual && row.virtual) {
      if (!previous.classLevel && row.classLevel) {
        previous.classLevel = row.classLevel;
        previous.levelLabel = row.levelLabel;
        previous.source = previous.source || row.source;
      }
      continue;
    }
    if (!previous || (previous.virtual && !row.virtual)) {
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => a.sourceClass.localeCompare(b.sourceClass) || a.classLevel - b.classLevel || a.name.localeCompare(b.name));
}

function groupClassFeatures(entries = []) {
  const groups = new Map();
  for (const entry of entries) {
    const label = entry.sourceClass || 'Class Features';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(entry);
  }
  return Array.from(groups.entries())
    .map(([label, groupEntries]) => ({
      label,
      count: groupEntries.length,
      entries: groupEntries.sort((a, b) => a.classLevel - b.classLevel || a.name.localeCompare(b.name))
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildTalentsTab(context, options = {}) {
  const classFeatureEntries = actorClassFeatureRows(context.actor);
  const classFeatureGroups = groupClassFeatures(classFeatureEntries);

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
    classFeatureEntries,
    classFeatureGroups,
    featCount: featEntries.length,
    speciesAbilityCount: speciesAbilityEntries.length,
    talentCount,
    classFeatureCount: classFeatureEntries.length,
    abilityCount: featEntries.length + speciesAbilityEntries.length + talentCount + classFeatureEntries.length,
    treeCount: talentGroups.length,
    canEditTalents: !!context.talentPanel?.canEdit,
    canEditFeats: !!context.featPanel?.canEdit
  };
}

function forceText(value) {
  const raw = typeof value === 'string'
    ? value
    : typeof value?.value === 'string'
      ? value.value
      : String(value || '');
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
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
  if (isForm) {
    const system = power?.system ?? {};
    const formKey = getLightsaberFormAccentKey(system.form, system.lightsaberForm, system.discipline, power?.form, power?.name);
    return formKey ? `form-${formKey}` : 'form';
  }
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
    else if (String(p || '').startsWith('form')) labels.push('Lightsaber Form');
  }
  return labels.slice(0, 3);
}

function getForceSymbol(power, p) {
  if (p === 'dark') return '⚡';
  if (p === 'light') return '✦';
  if (p === 'tk') return '◎';
  if (p === 'mind') return '◉';
  if (String(p || '').startsWith('form')) return '◆';
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

function isTelekineticForcePowerEntry(power) {
  const system = power?.system ?? {};
  const values = [
    ...(Array.isArray(system.descriptor) ? system.descriptor : []),
    ...(Array.isArray(system.descriptors) ? system.descriptors : []),
    ...(Array.isArray(system.tags) ? system.tags : []),
    system.discipline,
    system.category,
    system.subcategory
  ]
    .filter(value => value != null)
    .map(value => String(value).trim().toLowerCase().replace(/[\s_-]+/g, '-'));
  return values.includes('telekinetic') || values.includes('telekinesis');
}

function isMindAffectingForcePowerEntry(power) {
  const system = power?.system ?? {};
  const values = [
    power?.name,
    ...(Array.isArray(system.descriptor) ? system.descriptor : []),
    ...(Array.isArray(system.descriptors) ? system.descriptors : []),
    ...(Array.isArray(system.tags) ? system.tags : []),
    system.discipline,
    system.category,
    system.subcategory,
    system.effect,
    system.summary
  ].filter(Boolean).join(' ').toLowerCase();
  return /mind[-\s]?affecting|mind|telepathic|illusion|influence|mind trick|fear/.test(values);
}

function isLightsaberFormForcePowerEntry(power) {
  const system = power?.system ?? {};
  const values = [
    power?.name,
    power?.type,
    system.type,
    ...(Array.isArray(system.descriptor) ? system.descriptor : []),
    ...(Array.isArray(system.descriptors) ? system.descriptors : []),
    ...(Array.isArray(system.tags) ? system.tags : []),
    system.discipline,
    system.category,
    system.subcategory,
    system.powerType,
    system.form,
    system.lightsaberForm,
    system.effect,
    system.summary
  ].filter(Boolean).join(' ').toLowerCase();
  return /lightsaber[-\s]?form|form power|shii-cho|makashi|soresu|ataru|shien|djem so|niman|juyo|vaapad/.test(values);
}

function getTalentMaxUses(actor, talentName) {
  if (!actor?.items) return 0;
  const wanted = String(talentName ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  let total = 0;
  for (const item of actor.items) {
    const rawName = String(item?.name ?? '').trim();
    const normalized = rawName.toLowerCase().replace(/\s+/g, ' ');
    const base = normalized.replace(/\s*\(\d+\)\s*$/, '');
    if (base !== wanted) continue;
    const parenthetical = normalized.match(/\((\d+)\)/)?.[1];
    const systemQty = Number(item?.system?.quantity ?? item?.system?.rank ?? item?.system?.ranks ?? item?.system?.uses?.max ?? 0) || 0;
    total += Math.max(1, Number(parenthetical ?? systemQty ?? 1) || 1);
  }
  return total;
}

function getTelekineticSavantMaxUses(actor) {
  if (!actor?.items) return 0;
  let total = 0;
  for (const item of actor.items) {
    const rawName = String(item?.name ?? '').trim();
    const normalized = rawName.toLowerCase().replace(/\s+/g, ' ');
    if (!/^telekinetic savant(?:\s*\((\d+)\))?$/.test(normalized)) continue;
    const parenthetical = normalized.match(/\((\d+)\)/)?.[1];
    const systemQty = Number(item?.system?.quantity ?? item?.system?.rank ?? item?.system?.ranks ?? item?.system?.uses?.max ?? 0) || 0;
    total += Math.max(1, Number(parenthetical ?? systemQty ?? 1) || 1);
  }
  return total;
}

function getTelekineticSavantState(actor) {
  const max = getTelekineticSavantMaxUses(actor);
  const encounterId = game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
  const flag = actor?.getFlag?.('foundryvtt-swse', 'telekineticSavantUses') ?? actor?.flags?.['foundryvtt-swse']?.telekineticSavantUses ?? {};
  const used = flag?.encounterId === encounterId ? Math.max(0, Number(flag.used ?? 0) || 0) : 0;
  return { max, used, remaining: Math.max(0, max - used), encounterId };
}

function getInfluenceSavantState(actor) {
  const max = getTalentMaxUses(actor, 'Influence Savant');
  const encounterId = game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
  const flag = actor?.getFlag?.('foundryvtt-swse', 'influenceSavantUses') ?? actor?.flags?.['foundryvtt-swse']?.influenceSavantUses ?? {};
  const used = flag?.encounterId === encounterId ? Math.max(0, Number(flag.used ?? 0) || 0) : 0;
  return { max, used, remaining: Math.max(0, max - used), encounterId };
}

function getLightsaberFormSavantState(actor) {
  const max = getTalentMaxUses(actor, 'Lightsaber Form Savant');
  const encounterId = game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
  const flag = actor?.getFlag?.('foundryvtt-swse', 'lightsaberFormSavantUses') ?? actor?.flags?.['foundryvtt-swse']?.lightsaberFormSavantUses ?? {};
  const used = flag?.encounterId === encounterId ? Math.max(0, Number(flag.used ?? 0) || 0) : 0;
  return { max, used, remaining: Math.max(0, max - used), encounterId };
}


function actorHasTalentByName(actor, talentName) {
  const wanted = String(talentName ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!wanted || !actor?.items) return false;
  return Array.from(actor.items).some(item => item?.type === 'talent' && String(item.name ?? '').trim().toLowerCase().replace(/\s+/g, ' ') === wanted);
}

function getForceTalentActionState(actor) {
  const forceFlowFlag = actor?.getFlag?.('foundryvtt-swse', 'forceFlowTemporaryForcePoints') ?? actor?.flags?.['foundryvtt-swse']?.forceFlowTemporaryForcePoints ?? {};
  const encounterId = game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
  const forceFlowTemporary = forceFlowFlag?.encounterId === encounterId ? Math.max(0, Number(forceFlowFlag.total ?? 0) || 0) : 0;
  const alchemyLaunches = Array.from(actor?.items ?? [])
    .filter(item => item?.type === 'talent')
    .map(item => {
      const launch = getForceAlchemyLaunchForTalentName(item?.name);
      if (!launch) return null;
      const rite = getForceAlchemyRite(launch.riteId);
      return {
        talentId: item.id || item._id || '',
        talentName: item.name || launch.talent,
        label: item.name || launch.talent,
        riteId: launch.riteId,
        category: launch.category,
        summary: rite?.summary || 'Open the Force Artifact / Sith Alchemy workbench for this talent.',
        actionLabel: launch.category === 'sith' ? 'Sith Alchemy' : launch.category === 'darkside' ? 'Dark Talisman' : launch.category === 'force' ? 'Force Talisman' : 'Workbench',
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const order = { force: 10, darkside: 20, sith: 30, mutation: 40, specialist: 50, combat: 60 };
      const delta = (order[a.category] || 99) - (order[b.category] || 99);
      return delta || a.label.localeCompare(b.label);
    });
  const seenAlchemy = new Set();
  const uniqueAlchemyLaunches = alchemyLaunches.filter(entry => {
    const key = `${entry.riteId}:${entry.category}`;
    if (seenAlchemy.has(key)) return false;
    seenAlchemy.add(key);
    return true;
  });

  return {
    aversion: { available: actorHasTalentByName(actor, 'Aversion') },
    illusion: {
      available: actorHasTalentByName(actor, 'Illusion'),
      illusionBond: actorHasTalentByName(actor, 'Illusion Bond'),
      masquerade: actorHasTalentByName(actor, 'Masquerade')
    },
    link: { available: actorHasTalentByName(actor, 'Link') },
    suppressForce: { available: actorHasTalentByName(actor, 'Suppress Force') },
    telepathicLink: { available: actorHasTalentByName(actor, 'Telepathic Link') },
    telepathicInfluence: { available: actorHasTalentByName(actor, 'Telepathic Influence') },
    forceFlow: { available: actorHasTalentByName(actor, 'Force Flow'), temporary: forceFlowTemporary },
    forceAlchemy: {
      available: uniqueAlchemyLaunches.length > 0,
      launches: uniqueAlchemyLaunches,
      primary: uniqueAlchemyLaunches[0] || null,
      hasForceTalisman: uniqueAlchemyLaunches.some(entry => entry.category === 'force'),
      hasSithAlchemy: uniqueAlchemyLaunches.some(entry => entry.category === 'sith'),
    }
  };
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
  const blurb = resolveForceCardSummary(power, system.summary || system.effect || system.description || power?.summary || '');

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
    telekinetic: isTelekineticForcePowerEntry(power),
    mindAffecting: isMindAffectingForcePowerEntry(power),
    lightsaberForm: isForm || isLightsaberFormForcePowerEntry(power),
    discarded,
    // Legacy fields kept for backward compat with old force-tab
    summary: forceTextExcerpt(system.summary || system.description || power?.summary || '', 160)
  };
}


function normalizeForceRegimen(regimen, discarded = false) {
  const system = regimen?.system ?? {};
  const category = String(system.category || '').trim() || 'force-training';
  const tags = [category === 'lightsaber-training' ? 'Lightsaber' : 'Force', 'Regimen'];
  const dcRows = Array.isArray(system.dcTiers) ? system.dcTiers.map((tier) => ({ dc: tier.dc, effect: tier.effect })) : [];
  return {
    id: regimen?.id || regimen?._id || '',
    name: regimen?.name || 'Unnamed Force Regimen',
    img: regimen?.img || '',
    p: category === 'lightsaber-training' ? 'form' : 'force',
    type: category === 'lightsaber-training' ? 'lightsaber-regimen' : 'force-regimen',
    category,
    categoryLabel: category === 'lightsaber-training' ? 'Lightsaber Regimen' : 'Force Regimen',
    tags,
    tagString: tags.join(' '),
    blurb: resolveForceCardSummary(regimen, system.summary || system.effect || system.descriptionText || system.description || ''),
    summary: forceTextExcerpt(system.summary || system.descriptionText || system.description || '', 160),
    desc: forceText(system.descriptionText || system.effect || system.description || ''),
    time: system.time || '',
    targets: system.targets || system.target || '',
    requirements: system.requirements || '',
    duration: system.duration || '',
    sourcebook: system.sourcebook || '',
    learnedBy: system.learnedBy || '',
    activeLimit: system.activeLimit || '',
    checkLabel: humanizeSkillLabel(system.check?.skill || 'useTheForce', 'Use the Force'),
    metadataRows: [
      { label: 'Time', value: system.time || '' },
      { label: 'Targets', value: system.targets || system.target || '' },
      { label: 'Requirements', value: system.requirements || '' },
      { label: 'Duration', value: system.duration || '' },
      { label: 'Active Limit', value: system.activeLimit ? String(system.activeLimit) : '' },
      { label: 'Check', value: humanizeSkillLabel(system.check?.skill || 'useTheForce', 'Use the Force') },
      { label: 'Learned By', value: system.learnedBy || '' },
      { label: 'Source', value: system.sourcebook || '' }
    ].filter((row) => row.value),
    dcRows,
    hasDcRows: dcRows.length > 0,
    discarded,
    activeTier: system.activeTier || null,
    activeRollTotal: system.activeRollTotal ?? null,
    activeEffectText: system.activeTier?.effect || '',
    canUse: !discarded && !!(regimen?.id || regimen?._id),
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
  const hand = asArray(context.forcePowersPanel?.hand).map((power) => {
    const tags = power?.system?.tags ?? power?.tags ?? [];
    const isLightsaberForm = Array.isArray(tags) ? tags.includes('lightsaber-form') : String(tags).includes('lightsaber-form');
    return normalizeForcePower(power, false, isLightsaberForm ? { type: 'form' } : {});
  });
  const discard = asArray(context.forcePowersPanel?.discard).map((power) => normalizeForcePower(power, true));
  const techniques = asArray(context.forcePowersPanel?.techniques).map((entry) => normalizeForceFeature(entry, 'Unnamed Technique'));
  const secrets = asArray(context.forcePowersPanel?.secrets).map((entry) => normalizeForceFeature(entry, 'Unnamed Secret'));
  const regimens = asArray(context.forcePowersPanel?.regimens).map((entry) => normalizeForceRegimen(entry, false));
  const regimenDiscard = asArray(context.forcePowersPanel?.regimenDiscard).map((entry) => normalizeForceRegimen(entry, true));
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
  const forceSuiteRegimens = regimens.filter((regimen) => regimen.type === 'force-regimen');
  const forceSuiteLightsaberRegimens = regimens.filter((regimen) => regimen.type === 'lightsaber-regimen');

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

  const FORCE_TRADITION_OPTIONS = [
    { value: '', label: 'Unaffiliated' },
    { value: 'jedi-order', label: 'Jedi Order' },
    { value: 'sith', label: 'Sith' },
    { value: 'aing-tii', label: 'Aing-Tii Monks' },
    { value: 'zeison-sha', label: 'Zeison Sha' },
    { value: 'baran-do', label: 'Baran Do Sages' },
    { value: 'matukai', label: 'Matukai' },
    { value: 'witches-of-dathomir', label: 'Witches of Dathomir' },
    { value: 'imperial-inquisitors', label: 'Imperial Inquisitors' },
    { value: 'potentium', label: 'Potentium' },
    { value: 'dark-side-adepts', label: 'Dark Side Adepts' }
  ];
  const forceTradition = String(
    actor?.system?.forceTradition
    ?? actor?.system?.progression?.forceTradition
    ?? actor?.flags?.swse?.forceTradition
    ?? ''
  ).trim();

  const telekineticSavant = getTelekineticSavantState(actor);
  telekineticSavant.recoverableCount = discard.filter((power) => power.telekinetic).length;
  telekineticSavant.hasRecoverable = telekineticSavant.recoverableCount > 0;
  telekineticSavant.available = telekineticSavant.max > 0 && telekineticSavant.remaining > 0 && telekineticSavant.hasRecoverable;

  const influenceSavant = getInfluenceSavantState(actor);
  influenceSavant.recoverableCount = discard.filter((power) => power.mindAffecting).length;
  influenceSavant.hasRecoverable = influenceSavant.recoverableCount > 0;
  influenceSavant.available = influenceSavant.max > 0 && influenceSavant.remaining > 0 && influenceSavant.hasRecoverable;

  const lightsaberFormSavant = getLightsaberFormSavantState(actor);
  lightsaberFormSavant.recoverableCount = discard.filter((power) => power.lightsaberForm).length;
  lightsaberFormSavant.hasRecoverable = lightsaberFormSavant.recoverableCount > 0;
  lightsaberFormSavant.available = lightsaberFormSavant.max > 0 && lightsaberFormSavant.remaining > 0 && lightsaberFormSavant.hasRecoverable;

  const knownLightsaberForms = LightsaberFormEngine.getKnownForms(actor);
  const activeLightsaberForm = LightsaberFormEngine.getActiveForm(actor);
  const lightsaberFormState = {
    known: knownLightsaberForms,
    active: activeLightsaberForm,
    hasKnown: knownLightsaberForms.length > 0,
    activeName: activeLightsaberForm?.name || 'None',
    activeSummary: activeLightsaberForm?.summary || 'Choose one known Lightsaber Form to make it active. Only the active form grants benefits.',
    ruleNote: 'Only one Lightsaber Form can be active at a time. Switching forms replaces the previous form; inactive forms provide no benefits.'
  };

  const forceSuite = {
    actorName: actor?.name || 'Unknown Force User',
    actorSubtitle,
    utfTotal,
    forceTradition,
    forceTraditionOptions: FORCE_TRADITION_OPTIONS,
    forceTraditionLabel: FORCE_TRADITION_OPTIONS.find((o) => o.value === forceTradition)?.label ?? (forceTradition || 'Unaffiliated'),
    forcePointsValue: Number(context.forcePointsValue) || 0,
    forcePointsMax: Number(context.forcePointsMax) || 0,
    destinyPointsValue: Number(context.destinyPointsValue) || 0,
    destinyPointsMax: Number(context.destinyPointsMax) || 0,
    darkSideValue: Number(context.darkSidePanel?.value) || 0,
    darkSideMax: Number(context.darkSidePanel?.max) || 0,
    forcePowers: forceSuiteHand.map(p => ({ ...p })),
    formPowers: forceSuiteForms.map(p => ({ ...p })),
    discarded: discard.map(p => ({ ...p })),
    regimens: forceSuiteRegimens.map(r => ({ ...r })),
    lightsaberRegimens: forceSuiteLightsaberRegimens.map(r => ({ ...r })),
    regimenDiscard: regimenDiscard.map(r => ({ ...r })),
    hasForcePowers: forceSuiteHand.length > 0,
    hasFormPowers: forceSuiteForms.length > 0,
    hasRegimens: forceSuiteRegimens.length > 0,
    hasLightsaberRegimens: forceSuiteLightsaberRegimens.length > 0,
    hasDiscarded: discard.length > 0,
    counts: {
      force: forceSuiteHand.length,
      form: forceSuiteForms.length,
      regimen: regimens.length,
      regimenDiscard: regimenDiscard.length,
      discard: discard.length
    },
    forcefulRecovery,
    telekineticSavant,
    influenceSavant,
    lightsaberFormSavant,
    lightsaberFormState,
    forceTalentActions: getForceTalentActionState(actor),
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
      { label: 'Regimens', value: String(regimens.length) },
      { label: 'Dark Side', value: `${Number(context.darkSidePanel?.value) || 0}/${Number(context.darkSidePanel?.max) || 0}` },
      { label: 'Force Tags', value: String(tags.length) }
    ],
    hand,
    discard,
    techniques,
    secrets,
    regimens,
    regimenDiscard,
    tags,
    hasAnything: hand.length > 0 || discard.length > 0 || techniques.length > 0 || secrets.length > 0 || regimens.length > 0 || regimenDiscard.length > 0,
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
  const swUses = Number(context.secondWindPanel?.uses ?? 0) || 0;
  const swMax = Math.max(1, Number(context.secondWindPanel?.max ?? 1) || 1);
  const swHealing = Number(context.secondWindPanel?.healing ?? context.secondWindPanel?.totalHealing ?? 0) || 0;
  const currentConditionCardCount = asArray(context.healthPanel?.currentConditions?.cards).length;
  const percentHp = hpMax > 0 ? Math.max(0, Math.min(100, Math.round((hpValue / hpMax) * 100))) : 0;
  const skillCount = asArray(context.skillsPanel?.skills).length || Object.keys(context.derived?.skills ?? {}).length;
  const gearGroups = buildInventoryGroups(context.inventoryPanel);
  const actionGroups = buildActionGroups(context.combatActions, context.actionEconomy);
  const actorItems = Array.from(actor?.items ?? []);
  const itemById = new Map(actorItems.map((item) => [item.id, item]));
  const buildAttackView = (attack = {}) => {
    const weaponId = attack?.weaponId ?? attack?.itemId ?? attack?.sourceId ?? null;
    const item = weaponId ? itemById.get(weaponId) : null;
    const visualProfile = item ? WeaponVisualProfileResolver.resolve(item, { actor }) : null;
    const railHex = visualProfile?.primaryHex || attack?.visualColorHex || attack?.colorHex || '';
    const rangeLabel = normalizeText(attack?.range || attack?.rangeLabel || item?.system?.rangeFormatted || item?.system?.range?.label || item?.system?.range?.value || 'Melee');
    const ammoCurrent = item?.system?.ammo?.current ?? item?.system?.ammunition?.current ?? item?.system?.charges?.value ?? item?.system?.charges?.current ?? attack?.ammoCurrent;
    const ammoMax = item?.system?.ammo?.max ?? item?.system?.ammunition?.max ?? item?.system?.charges?.max ?? attack?.ammoMax;
    const ammoLabel = ammoCurrent !== undefined && ammoCurrent !== null && ammoCurrent !== ''
      ? `${ammoCurrent}${ammoMax !== undefined && ammoMax !== null && ammoMax !== '' ? ` / ${ammoMax}` : ''}`
      : '';
    const damageType = normalizeText(attack?.damageType || item?.system?.damageType || item?.system?.weapon?.damageType || '');
    return {
      ...attack,
      weaponId,
      weaponName: attack?.weaponName ?? attack?.name ?? '',
      weaponType: attack?.weaponType ?? attack?.type ?? attack?.sourceType ?? '',
      attackTotalClass: toSignedClass(attack?.attackTotal),
      tags: asArray(attack?.tags),
      rangeLabel,
      ammoLabel,
      damageType,
      visualKind: visualProfile?.kind || '',
      visualColorHex: railHex,
      weaponRailStyle: railHex ? `--weapon-rail: ${railHex};` : ''
    };
  };
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
  const progressionAudit = buildSheetProgressionAudit(actor);
  const abilitiesTab = buildAbilityTab(abilities, progressionAudit);
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
    { id: 'talents', label: 'Abilities', icon: 'fa-solid fa-diagram-project', count: toCountBadge(talents.abilityCount || (talentEntries.length + featEntries.length + speciesAbilityCount)) },
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
    progressionAudit,
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
        { label: 'Effects', value: String(currentConditionCardCount || 0), valueClass: currentConditionCardCount ? 'mod--negative' : 'mod--zero' },
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
        { label: 'Second Wind', value: `${swUses}/${swMax}${swHealing ? ` · ${swHealing} HP` : ''}` },
        { label: 'Effects', value: String(currentConditionCardCount || 0) }
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
      attacks: attackEntries.map(buildAttackView),
      unarmedAttack: unarmedAttackEntry ? {
        ...unarmedAttackEntry,
        attackTotalClass: toSignedClass(unarmedAttackEntry.attackTotal),
        tags: asArray(unarmedAttackEntry.tags),
        rangeLabel: unarmedAttackEntry.range || 'Melee',
        ammoLabel: '',
        damageType: 'Bludgeoning',
        visualKind: 'unarmed',
        visualColorHex: '',
        weaponRailStyle: '--weapon-rail: rgba(99, 255, 180, 0.88);'
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
      hasUpgradeableItems: !!context.inventoryPanel?.hasUpgradeableItems,
      lightsaberConstructionAvailable: !!context.lightsaberConstructionAvailable,
      lightsaberConstructionDeferred: !!context.lightsaberConstructionDeferred,
      lightsaberConstructionBlockedReason: context.lightsaberConstructionBlockedReason || null
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
