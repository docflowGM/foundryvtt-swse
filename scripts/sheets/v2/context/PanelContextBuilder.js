/**
 * PanelContextBuilder
 *
 * Dedicated context hydration for SVG-backed character sheet panels.
 * Each panel gets a dedicated builder method that returns a normalized,
 * contract-validated view model for its partial.
 *
 * This separates concerns:
 * - Partials read from specific panel objects only
 * - No reaching into giant sheet context
 * - All collections pre-normalized (arrays, numbers, booleans)
 * - Empty states explicit, not inferred
 */

import { PanelContextValidator } from './PanelContextValidator.js';
import { RowTransformers } from './RowTransformers.js';
import { captureHydrationSnapshot, emitHydrationError, emitHydrationWarning, getRecentHydrationMutation, summarizeBiographyPanel, summarizeDefensePanel } from '/systems/foundryvtt-swse/scripts/utils/hydration-diagnostics.js';
import { validatePanel } from './PanelValidators.js';
import { buildHpViewModel, buildDefensesViewModel, buildAttributesViewModel, buildIdentityViewModel } from '/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/context.js';
import { UpgradeService } from '/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js';
import { FeatChoiceResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js';
import { CurrentConditionResolver } from '/systems/foundryvtt-swse/scripts/engine/effects/current-condition-resolver.js';
import { CANONICAL_SKILL_DEFS, canonicalizeSkillKey } from '/systems/foundryvtt-swse/scripts/utils/skill-normalization.js';
import { isFeatLikeItem, isForcePowerItem, isPlaceholderSheetItem, isTalentLikeItem } from '/systems/foundryvtt-swse/scripts/utils/item-classification.js';

export class PanelContextBuilder {
  constructor(actor, sheetInstance) {
    this.actor = actor;
    this.sheet = sheetInstance;
    this.system = actor.system;
    this.derived = actor.system?.derived ?? {};
  }

  _actorItems() {
    return Array.from(this.actor?.items ?? []);
  }

  /**
   * Validate a panel context and enforce contract
   * In strict mode: throws on validation errors
   * Otherwise: logs warnings and continues
   */
  _validatePanelContext(panelKey, panelData) {
    const result = validatePanel(panelKey, panelData);

    if (!result.valid) {
      const isStrict = CONFIG?.SWSE?.strictMode ?? false;
      const message = `[Panel Contract] ${panelKey} validation failed: ${result.errors.join(', ')}`;

      if (isStrict) {
        console.error(message, panelData);
        throw new Error(message);
      } else {
        console.warn(message, panelData);
      }
    }

    return result;
  }

  /**
   * Build the health & condition track panel context
   *
   * Contract: healthPanel
   * - hp: { value, max, percent, stateClass, canEdit }
   * - bonusHp: { value, hasBonus }
   * - shield: { max, current, rating }
   * - damageReduction: number
   * - conditionTrack: { current, max, canEdit }
   * - conditionSlots: [ { step, label, active, canEdit } ]
   * - showConditionTrack: boolean
   * - showShield: boolean
   * - showDamageReduction: boolean
   * - stateLabel: "Healthy"|"Wounded"|"Damaged"|"Critical"|"Dead"
   */
  buildHealthPanel() {
    // PHASE 7.5: Consume canonical HP view-model instead of computing inline
    // buildHpViewModel is the single source of truth for HP data
    // This ensures header HP bar, HP numeric display, and resource panel all use the same values
    const hpViewModel = buildHpViewModel(this.actor);
    const hpValue = hpViewModel.current;
    const hpMax = hpViewModel.max;
    const hpTemp = hpViewModel.temp;
    const hpPercent = hpViewModel.percent;
    const tempPercent = Math.max(0, Math.min(100, Math.round((hpTemp / hpMax) * 100)));

    let stateClass = 'state--healthy';
    let stateLabel = 'Healthy';
    if (hpValue <= 0) {
      stateClass = 'state--dead';
      stateLabel = 'Dead';
    } else if (this.derived.damage?.conditionHelpless) {
      stateClass = 'state--critical';
      stateLabel = 'Critical';
    } else if (hpValue <= hpMax * 0.5) {
      stateClass = 'state--critical';
      stateLabel = 'Critical';
    } else if (hpValue < hpMax) {
      const healthRatio = hpValue / hpMax;
      if (healthRatio > 0.75) {
        stateClass = 'state--wounded';
        stateLabel = 'Wounded';
      } else {
        stateClass = 'state--damaged';
        stateLabel = 'Damaged';
      }
    }

    const bonusHpValue = Number(this.system.hpBonus) || 0;
    const shieldCurrent = Number(this.derived.shield?.current ?? this.system.currentSR ?? 0) || 0;
    const shieldMax = Number(this.derived.shield?.max ?? this.system.shieldRating ?? shieldCurrent) || 0;
    const shieldPercent = shieldMax > 0 ? Math.max(0, Math.min(100, Math.round((shieldCurrent / shieldMax) * 100))) : 0;
    const damageReductionValue = Number(this.system.damageReduction ?? 0) || 0;

    const ctCurrent = Number(this.derived?.damage?.conditionStep ?? this.system.conditionTrack?.current ?? 0) || 0;
    const ctPersistent = this.system.conditionTrack?.persistent === true;
    const ctMax = 6;

    const conditionDefinitions = [
      { step: 0, label: 'Normal', description: 'No penalties', severityClass: 'severity-normal', penalty: 0 },
      { step: 1, label: '-1', description: 'Def • Atk • Skill • Ability', severityClass: 'severity-low', penalty: -1 },
      { step: 2, label: '-2', description: 'Def • Atk • Skill • Ability', severityClass: 'severity-mid', penalty: -2 },
      { step: 3, label: '-5', description: 'Def • Atk • Skill • Ability', severityClass: 'severity-high', penalty: -5 },
      { step: 4, label: '-10', description: 'Def • Atk • Skill • Ability • Half speed', severityClass: 'severity-critical', penalty: -10 },
      { step: 5, label: 'Helpless', description: 'Unconscious / disabled', severityClass: 'severity-helpless', penalty: null }
    ];

    const conditionSlots = conditionDefinitions.map(def => ({
      ...def,
      active: ctCurrent === def.step,
      canEdit: this.sheet.isEditable
    }));

    const filledSegments = Math.max(0, Math.min(20, Math.round((hpValue / hpMax) * 20)));
    const hpSegments = Array.from({ length: 20 }, (_, index) => {
      let colorClass = 'seg--green';
      if (index < 4) colorClass = 'seg--red';
      else if (index < 8) colorClass = 'seg--orange';
      else if (index < 12) colorClass = 'seg--yellow';
      else if (index < 16) colorClass = 'seg--yellowgreen';
      return {
        index,
        filled: index < filledSegments,
        colorClass
      };
    });

    const currentConditionPenalty = conditionDefinitions.find(def => def.step === ctCurrent) ?? conditionDefinitions[0];
    const currentConditions = CurrentConditionResolver.build(this.actor);
    const currentConditionNotes = currentConditions.notes;

    const panel = {
      hp: {
        value: hpValue,
        max: hpMax,
        temp: hpTemp,
        percent: hpPercent,
        tempPercent,
        stateClass,
        canEdit: this.sheet.isEditable,
        segments: hpSegments
      },
      bonusHp: {
        value: bonusHpValue,
        hasBonus: bonusHpValue > 0
      },
      shield: {
        max: shieldMax,
        current: shieldCurrent,
        rating: String(shieldCurrent),
        hasShield: shieldMax > 0,
        percent: shieldPercent
      },
      damageReduction: damageReductionValue > 0 ? String(damageReductionValue) : null,
      damageReductionValue,
      conditionTrack: {
        current: ctCurrent,
        max: ctMax,
        persistent: ctPersistent,
        canEdit: this.sheet.isEditable
      },
      conditionSlots,
      currentConditionPenalty,
      currentConditions,
      currentConditionNotes,
      hasCurrentConditionNotes: currentConditions.hasCards,
      stateLabel,
      stateClass,
      showConditionTrack: true,
      showShield: true,
      showDamageReduction: true
    };

    this._validatePanelContext('healthPanel', panel);

    return panel;
  }

  /**
   * Build the defenses panel context
   *
   * Contract: defensePanel
   * - defenses: [ { key, label, total, armorBonus, abilityMod, abilityModClass, classDef, miscMod, miscModClass, canEdit } ]
   * - hasDefenses: boolean
   * - canEdit: boolean
   *
   * DATA SOURCE: Reuses existing system.defenses + system.attributes
   * - Does NOT recompute math (all from stored engine data)
   * - Transforms shape only for template compatibility
   */
  buildDefensePanel() {
    // PHASE 8: Canonical defense authority
    // All defense displays now read the same bundle:
    //   - totals from system.derived.defenses.*
    //   - editable overrides from system.defenses.{fortitude|reflex|will}.*
    //   - ability modifiers from system.derived.attributes.*
    const defensesViewModel = buildDefensesViewModel(this.derived);

    const system = this.system;
    const derivedAttributes = this.derived?.attributes ?? {};
    const abilityLabels = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma'
    };
    const defaultFortAbility = system?.isDroid ? 'str' : 'con';
    const defenseKeyMap = [
      { key: 'fort', systemKey: 'fortitude', label: 'Fortitude', defaultAbility: defaultFortAbility },
      { key: 'ref', systemKey: 'reflex', label: 'Reflex', defaultAbility: 'dex' },
      { key: 'will', systemKey: 'will', label: 'Will', defaultAbility: 'wis' }
    ];

    const defenses = defenseKeyMap.map(({ key, systemKey, label, defaultAbility }) => {
      const defenseData = system.defenses?.[systemKey] ?? {};
      const defenseViewModel = defensesViewModel?.[systemKey] ?? {};
      const derivedDefense = this.derived?.defenses?.[systemKey] ?? {};
      const abilityKey = String(defenseData.ability || derivedDefense.abilityKey || defaultAbility || '').toLowerCase();
      const abilityMod = Number(derivedAttributes?.[abilityKey]?.mod ?? derivedDefense?.abilityMod ?? 0) || 0;
      const miscMod = Number(derivedDefense?.miscBonus ?? defenseData.misc?.user?.extra ?? defenseData.miscMod ?? 0) || 0;
      const classDef = Number(derivedDefense?.classBonus ?? defenseData.classBonus ?? 0) || 0;
      const heroicLevel = Number(derivedDefense?.heroicLevel ?? this.derived?.heroicLevel ?? system?.level ?? 0) || 0;
      const levelContribution = Number(derivedDefense?.levelContribution ?? derivedDefense?.armorContribution ?? heroicLevel) || 0;
      const armorBonus = Number(
        systemKey === 'reflex'
          ? (derivedDefense?.armorBonus ?? defenseData.armor ?? 0)
          : (derivedDefense?.armorBonus ?? 0)
      ) || 0;
      const speciesBonus = Number(derivedDefense?.speciesBonus ?? defenseData.speciesBonus ?? 0) || 0;
      const rulesBonus = (Number(derivedDefense?.stateBonus ?? 0) || 0) + (Number(derivedDefense?.adjustment ?? 0) || 0);
      const sizeModifier = Number(derivedDefense?.sizeModifier ?? 0) || 0;
      const conditionPenalty = Number(derivedDefense?.conditionPenalty ?? this.derived?.damage?.conditionPenalty ?? 0) || 0;
      const total = Number(defenseViewModel?.total ?? derivedDefense?.total ?? 10) || 10;
      const abilityModClass = abilityMod > 0 ? 'mod--positive' : abilityMod < 0 ? 'mod--negative' : 'mod--zero';
      const miscModClass = miscMod > 0 ? 'mod--positive' : miscMod < 0 ? 'mod--negative' : 'mod--zero';
      const speciesBonusClass = speciesBonus > 0 ? 'mod--positive' : speciesBonus < 0 ? 'mod--negative' : 'mod--zero';
      const rulesBonusClass = rulesBonus > 0 ? 'mod--positive' : rulesBonus < 0 ? 'mod--negative' : 'mod--zero';
      const sizeModClass = sizeModifier > 0 ? 'mod--positive' : sizeModifier < 0 ? 'mod--negative' : 'mod--zero';

      return {
        key,
        systemKey,
        label,
        total,
        armorBonus,
        heroicLevel,
        levelContribution,
        speciesBonus,
        speciesBonusClass,
        rulesBonus,
        rulesBonusClass,
        sizeModifier,
        sizeModClass,
        armorEditable: systemKey === 'reflex',
        armorPath: systemKey === 'reflex' ? 'system.defenses.reflex.armor' : null,
        abilityKey,
        abilityLabel: abilityLabels[abilityKey] || abilityKey.toUpperCase(),
        abilityPath: `system.defenses.${systemKey}.ability`,
        abilityMod,
        abilityModClass,
        classDef,
        classBonusPath: `system.defenses.${systemKey}.classBonus`,
        miscMod,
        miscModClass,
        miscPath: `system.defenses.${systemKey}.misc.user.extra`,
        conditionPenalty,
        canEdit: this.sheet.isEditable
      };
    });

    const panel = {
      defenses,
      hasDefenses: defenses.length > 0,
      canEdit: this.sheet.isEditable
    };

    const recentHydrationMutation = getRecentHydrationMutation(this.sheet);
    const invalidDefenseEntries = defenses.filter((entry) => !Number.isFinite(Number(entry?.total)));
    if (invalidDefenseEntries.length > 0) {
      emitHydrationError("PANEL_BUILD_DEFENSE_INVALID_TOTAL", {
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        mutation: recentHydrationMutation,
        invalidEntries: invalidDefenseEntries,
        snapshot: captureHydrationSnapshot(this.actor)
      });
    }
    if (recentHydrationMutation) {
      emitHydrationWarning("PANEL_BUILD_DEFENSE", {
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        mutation: recentHydrationMutation,
        snapshot: captureHydrationSnapshot(this.actor),
        panel: summarizeDefensePanel(panel)
      });
    }
    this._validatePanelContext('defensePanel', panel);
    return panel;
  }

  /**
   * Build the biography/character record header panel
   *
   * Contract: biographyPanel
   * - identity: { name, class, level, species, size, age, gender, height, weight, homeworld, profession, background, destinyPoints }
   * - biography: { ... }
   */
  buildBiographyPanel() {
    // PHASE 7.5: Consume canonical identity view-model instead of rebuilding
    // buildIdentityViewModel is the single source of truth for identity data
    // All identity displays use the same prepared bundle
    const identityViewModel = buildIdentityViewModel(this.actor);

    const identity = {
      ...identityViewModel,
      class: String(identityViewModel.classDisplay || identityViewModel.className || '—'),
      player: this.system.flags?.swse?.character?.player || '—',
      canEdit: this.sheet.isEditable
    };

    // Contract requires biography to be a string
    const biography = String(this.system.notes || '');

    const panel = {
      identity,
      biography
    };

    const recentHydrationMutation = getRecentHydrationMutation(this.sheet);
    if (recentHydrationMutation) {
      emitHydrationWarning("PANEL_BUILD_BIOGRAPHY", {
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        mutation: recentHydrationMutation,
        snapshot: captureHydrationSnapshot(this.actor),
        panel: summarizeBiographyPanel(panel)
      });
    }

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('biographyPanel', panel);

    return panel;
  }

  /**
   * Build the inventory/gear panel context
   *
   * Contract: inventoryPanel
   * - entries: [ { id, name, img, type, quantity, weight, equipped, rarity, tags, canEdit, canDelete } ]
   * - grouped: { category: [ entries ] } (Weapons, Armor, Equipment)
   * - hasEntries: boolean
   * - totalWeight: number
   * - equippedArmor: { name, type, defenses, modifiers } | null
   */
  buildInventoryPanel() {
    const items = this._actorItems();

    // Normalize all inventory rows
    const entries = items
      .filter(item => ['weapon', 'lightsaber', 'equipment', 'armor'].includes(item.type))
      .map(item => RowTransformers.toInventoryRow(item, this.sheet.isEditable));

    // Group entries by type category for card-based display
    const typeToCategory = {
      weapon: 'Weapons',
      lightsaber: 'Weapons',
      armor: 'Armor',
      equipment: 'Equipment'
    };

    const grouped = {};
    ['Weapons', 'Armor', 'Equipment'].forEach(cat => {
      grouped[cat] = [];
    });

    entries.forEach(entry => {
      const category = typeToCategory[entry.type] || 'Equipment';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(entry);
    });

    // Calculate total weight
    const totalWeight = entries.reduce((sum, item) => {
      const weight = Number(item.weight) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + (weight * qty);
    }, 0);

    // Find equipped armor
    const equippedArmorItem = items.find(item =>
      item.type === 'armor' && item.system?.equipped === true
    );
    const equippedArmor = equippedArmorItem
      ? RowTransformers.toArmorSummaryRow(equippedArmorItem)
      : null;

    // Compute upgrade eligibility summary for the workshop launch button
    let hasUpgradeableItems = false;
    try {
      const upgradeSummary = UpgradeService.getUpgradeAppSummary(this.actor);
      hasUpgradeableItems = upgradeSummary.totalApplicableItems > 0;
    } catch {
      hasUpgradeableItems = false;
    }

    const panel = {
      entries,
      grouped,
      hasEntries: entries.length > 0,
      totalWeight,
      equippedArmor,
      emptyMessage: 'No equipment found.',
      canEdit: this.sheet.isEditable,
      hasUpgradeableItems
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('inventoryPanel', panel);

    return panel;
  }


  _normalizeManifestNameKey(value = '') {
    return String(value || '')
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '');
  }

  _progressionManifest() {
    const explicit = this.actor?.flags?.swse?.progressionBuildManifest;
    if (explicit && typeof explicit === 'object') return explicit;
    const receipt = this.actor?.flags?.swse?.levelUpFinalizationReceipt
      || this.actor?.flags?.swse?.progressionFinalizationReceipt
      || {};
    if (!receipt || typeof receipt !== 'object') return {};
    return receipt.manifest || receipt.progressionBuildManifest || {};
  }

  _manifestExpectedNames(key) {
    const expected = this._progressionManifest()?.expected || {};
    const raw = expected?.[key];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return entry;
      return entry.name || entry.label || entry.title || entry.id || entry._id || entry.slug || '';
    }).filter(Boolean);
  }

  _manifestSpeciesItems() {
    const expected = this._progressionManifest()?.expected || {};
    return Array.isArray(expected.speciesItems) ? expected.speciesItems : [];
  }

  _appendManifestRows(entries, names, { type = 'feat', source = 'Progression Record', group = 'Progression Record' } = {}) {
    const used = new Set(entries.map((entry) => this._normalizeManifestNameKey(entry?.name || entry?.label || '')));
    const out = [...entries];
    for (const name of names || []) {
      const key = this._normalizeManifestNameKey(name);
      if (!key || used.has(key)) continue;
      used.add(key);
      out.push({
        id: `manifest-${type}-${key}`,
        name,
        label: name,
        type,
        source,
        sourceType: 'progression-manifest',
        group,
        tree: group,
        category: source,
        description: 'Recorded in the progression build plan. If this row is display-only, the underlying actor item was missing and should be repaired by progression finalization.',
        tags: ['Progression Record'],
        virtual: true,
        canEdit: false,
        canDelete: false,
        cssClass: `${type}-row progression-record virtual`,
      });
    }
    return out;
  }

  _normalizeSpeciesAbilityEntry(entry, fallbackSource = 'Species') {
    if (!entry) return null;
    if (typeof entry === 'string') {
      return { name: entry, source: fallbackSource, summary: '' };
    }
    const system = entry.system || {};
    const speciesAbility = system.speciesAbility || system.specialAbility || entry.speciesAbility || entry.specialAbility || {};
    const name = entry.name
      || speciesAbility.name
      || entry.label
      || entry.sourceTrait
      || entry.sourceTraitName
      || entry.id
      || entry.key
      || '';
    if (!name) return null;
    return {
      id: entry.id || entry._id || speciesAbility.id || this._normalizeManifestNameKey(name),
      name,
      source: entry.source
        || system.source
        || speciesAbility.sourceSpecies
        || entry.sourceSpecies
        || fallbackSource,
      summary: entry.summary
        || entry.description
        || system.description
        || speciesAbility.description
        || entry.effect
        || '',
      description: entry.description || system.description || speciesAbility.description || '',
      virtual: entry.virtual === true,
    };
  }

  _collectSpeciesAbilityEntries() {
    const entries = [];
    const add = (value, source = 'Species') => {
      if (!value) return;
      if (Array.isArray(value)) {
        for (const item of value) add(item, source);
        return;
      }
      if (value && typeof value === 'object' && !value.name && !value.label && !value.id && !value.key && !value.system) {
        for (const [key, item] of Object.entries(value)) {
          const next = item && typeof item === 'object' ? { id: key, ...item } : { id: key, name: key, summary: String(item || '') };
          add(next, source);
        }
        return;
      }
      const normalized = this._normalizeSpeciesAbilityEntry(value, source);
      if (normalized) entries.push(normalized);
    };

    add(this.derived?.racialAbilities, 'Derived');
    add(this.actor?.flags?.swse?.activeSpeciesAbilities, 'Species Ability');
    add(this.actor?.flags?.swse?.speciesTraits, 'Species Trait');
    add(this.actor?.flags?.swse?.speciesTraitIds, 'Species Trait');
    add(this.actor?.flags?.swse?.speciesRerolls, 'Species Reroll');

    for (const item of this._actorItems()) {
      if (item?.flags?.swse?.speciesGranted || item?.flags?.swse?.isSpeciesAbility || item?.system?.speciesAbility || item?.system?.specialAbility?.sourceType === 'species') {
        add(item, item.flags?.swse?.sourceSpecies || 'Species Item');
      }
    }

    for (const name of this._manifestExpectedNames('speciesTraits')) {
      add({ name, virtual: true, summary: 'Recorded species trait from the progression build manifest.' }, 'Progression Record');
    }
    for (const name of this._manifestExpectedNames('speciesAbilities')) {
      add({ name, virtual: true, summary: 'Recorded activated species ability from the progression build manifest.' }, 'Progression Record');
    }
    for (const item of this._manifestSpeciesItems()) {
      add({ ...item, virtual: true, summary: item.summary || item.description || 'Recorded in the progression build manifest.' }, 'Progression Record');
    }

    const seen = new Set();
    return entries.filter((entry) => {
      const key = this._normalizeManifestNameKey(entry?.name || entry?.id || '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Build the talents/feats panel context
   *
   * Contract: talentPanel
   * - entries: [ { id, name, img, type, source, cost, tags, canEdit, canDelete } ]
   * - grouped: { groupKey: [ entries ] } if applicable
   * - hasEntries: boolean
   * - totalCount: number
   */
  buildTalentPanel() {
    const items = this._actorItems();

    // Normalize talent rows.  Use semantic classification so progression-granted
    // legacy ability-shaped talents still appear on the sheet. Then append any
    // progression manifest rows that are missing from actor items so the sheet
    // never hides a build-plan grant from the player.
    const itemRows = items
      .filter(item => isTalentLikeItem(item))
      .filter(item => !isPlaceholderSheetItem(item, 'talent'))
      .map(item => RowTransformers.toTalentRow(item, this.sheet.isEditable));
    const entries = this._appendManifestRows(itemRows, this._manifestExpectedNames('talents'), {
      type: 'talent',
      source: 'Progression Record',
      group: 'Progression Record'
    });

    // Group by tree if available
    const grouped = {};
    entries.forEach(entry => {
      const group = entry.group || 'Unclassified';
      grouped[group] ??= [];
      grouped[group].push(entry);
    });

    const panel = {
      entries,
      grouped,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No talents known yet.',
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('talentPanel', panel);

    return panel;
  }

  /**
   * Build the feats panel context
   */
  buildFeatPanel() {
    const items = this._actorItems();

    const itemRows = items
      .filter(item => isFeatLikeItem(item))
      .filter(item => !isPlaceholderSheetItem(item, 'feat'))
      .map(item => {
        const row = RowTransformers.toFeatRow(item, this.sheet.isEditable);
        const choiceStatus = FeatChoiceResolver.getChoiceStatusSync(this.actor, item);
        if (choiceStatus) {
          row.choiceStatus = choiceStatus;
          row.requiresChoice = choiceStatus.required;
          row.choiceMissing = choiceStatus.missing;
          row.choiceLocked = choiceStatus.locked;
          row.choiceEditable = choiceStatus.editable && this.sheet.isEditable;
          row.choiceInvalid = choiceStatus.invalid;
          row.choiceInvalidReasons = choiceStatus.invalidReasons || [];
          row.choiceInvalidReason = row.choiceInvalidReasons.join(' ');
          row.choiceLabel = choiceStatus.selectedChoice?.label
            || choiceStatus.selectedChoice?.weapon
            || choiceStatus.selectedChoice?.group
            || choiceStatus.selectedChoice?.value
            || '';
        }
        return row;
      });

    const manifestFeatNames = [
      ...this._manifestExpectedNames('classAutoGrants'),
      ...this._manifestExpectedNames('feats')
    ];
    const entries = this._appendManifestRows(itemRows, manifestFeatNames, {
      type: 'feat',
      source: 'Progression/Class Grant',
      group: 'Progression Record'
    });

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No feats selected.',
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('featPanel', panel);

    return panel;
  }

  /**
   * Build the maneuvers panel context
   */
  buildManeuverPanel() {
    const items = this._actorItems();

    const entries = items
      .filter(item => item.type === 'maneuver')
      .map(item => RowTransformers.toManeuverRow(item, this.sheet.isEditable));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No maneuvers known yet.',
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('maneuverPanel', panel);

    return panel;
  }

  /**
   * Build the second wind panel context
   *
   * Contract: secondWindPanel
   * - healing: number (HP recovered per use)
   * - uses: number (current uses remaining)
   * - max: number (maximum uses per rest)
   * - hasUses: boolean (uses > 0)
   * - canEdit: boolean
   */
  buildSecondWindPanel() {
    const maxHp = Number(this.system.hp?.max) || 1;
    const baseHealing = Math.ceil(maxHp * 0.25);
    const storedHealing = Number(this.system.secondWind?.healing) || 0;
    const healing = storedHealing > 0 ? storedHealing : baseHealing;
    const uses = Number(this.system.secondWind?.uses) || 0;
    const max = Number(this.system.secondWind?.max) || 1;

    const panel = {
      baseHealing,
      healing,
      totalHealing: healing,
      uses,
      max,
      hasUses: uses > 0,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('secondWindPanel', panel);

    return panel;
  }

  /**
   * Build the portrait panel context
   *
   * Contract: portraitPanel
   * - img: string (image URL)
   * - name: string (character name)
   * - canEdit: boolean
   */
  buildPortraitPanel() {
    const panel = {
      img: this.actor.img || '',
      name: this.actor.name || 'Unnamed',
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('portraitPanel', panel);

    return panel;
  }

  /**
   * Build the dark side points panel context
   *
   * Contract: darkSidePanel
   * - value: number (current dark side points)
   * - max: number (maximum possible)
   * - segments: [ { index, filled, color } ]
   * - canEdit: boolean
   */
  buildDarkSidePanel() {
    const dspValue = Number(this.system.darkSide?.value) || 0;
    const dspMax = Number(this.system.darkSide?.max) || 20;

    // Build segment array (each index is a clickable point)
    const segments = [];
    for (let i = 1; i <= dspMax; i++) {
      segments.push({
        index: i,
        filled: i <= dspValue,
        color: this._getDSPColor(i, dspMax)
      });
    }

    // Danger state: when DSP is within 2 of max
    const isDanger = dspValue >= dspMax - 2;

    const panel = {
      value: dspValue,
      max: dspMax,
      segments,
      danger: isDanger,
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('darkSidePanel', panel);

    return panel;
  }

  /**
   * Generate DSP color based on gradient from dark green (0) to dark red (max)
   * Uses HSL for smooth color transition through the spectrum
   *
   * @private
   * @param {number} index - Current segment index (1-based)
   * @param {number} maxDSP - Maximum DSP value
   * @returns {string} HSL color string
   */
  _getDSPColor(index, maxDSP) {
    const ratio = index / maxDSP;

    // Hue goes from green (120) to red (0)
    const hue = 120 - (120 * ratio);

    // Saturation stays high for vibrancy
    const saturation = 80;

    // Lightness: starts moderate (45%) and darkens toward max
    const lightness = 45 - (ratio * 20);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Build the force powers panel context
   *
   * Contract: forcePowersPanel
   * - hand: Array of available powers
   * - discard: Array of discarded powers
   * - secrets: Array of force secrets
   * - techniques: Array of force techniques
   * - hasHand: boolean
   * - hasDiscard: boolean
   * - hasSecrets: boolean
   * - hasTechniques: boolean
   * - canEdit: boolean
   *
   * NOTE: This panel is a lightweight wrapper around the existing forceSuite data.
   * The actual force item objects come directly from the actor's items collection.
   */
  buildForcePowersPanel() {
    // Extract force powers from actor items semantically.  Existing actors may own
    // Force powers with older item types but valid FORCE_POWER execution metadata.
    const forcePowers = Array.from(this.actor?.items ?? []).filter(i => isForcePowerItem(i));

    // Organize into hand/discard based on system.discarded flag. Append display-only
    // manifest rows if a progression build plan says the actor should know a power
    // but the embedded item was not materialized; finalizer/backfill should repair
    // these, but the player should never see an empty Force store when the build
    // record has the power.
    const handItems = forcePowers.filter(p => !p.system?.discarded);
    const discard = forcePowers.filter(p => p.system?.discarded);
    const hand = this._appendManifestRows(handItems, this._manifestExpectedNames('forcePowers'), {
      type: 'force-power',
      source: 'Progression Record',
      group: 'Force Powers'
    }).map((entry) => {
      if (!entry.virtual) return entry;
      return {
        ...entry,
        system: {
          ...(entry.system || {}),
          executionModel: 'FORCE_POWER',
          summary: entry.description,
          tags: ['Progression Record'],
        },
      };
    });

    // Extract secrets and techniques from derived (pre-computed by actor engine)
    const secrets = this.derived.forceSecrets?.list ?? [];
    const techniques = this.derived.forceTechniques?.list ?? [];

    const panel = {
      hand,
      discard,
      secrets,
      techniques,
      hasHand: hand.length > 0,
      hasDiscard: discard.length > 0,
      hasSecrets: secrets.length > 0,
      hasTechniques: techniques.length > 0,
      canEdit: this.sheet.isEditable
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('forcePowersPanel', panel);

    return panel;
  }

  /**
   * Build the starship maneuvers panel context
   *
   * Contract: starshipManeuversPanel (standard ledger)
   * - entries: [ { id, name, summary } ]
   * - hasEntries: boolean
   * - totalCount: number
   * - emptyMessage: string
   */
  buildStarshipManeuversPanel() {
    // Extract starship maneuvers from derived data
    const maneuvers = this.derived.starshipManeuvers?.list ?? [];

    const entries = maneuvers.map(maneuver => ({
      id: maneuver.id || '',
      name: maneuver.name || '',
      summary: maneuver.summary || ''
    }));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No starship maneuvers known.'
    };

    // Validate contract (strict mode throws, dev mode warns)
    this._validatePanelContext('starshipManeuversPanel', panel);

    return panel;
  }

  _normalizeLanguageDisplayEntry(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
      const candidate = value.name
        || value.label
        || value.language
        || value.value
        || value.slug
        || value.id
        || value._id
        || value.internalId;
      return String(candidate || '').trim();
    }
    return String(value || '').trim();
  }

  _collectLanguageDisplayEntries() {
    const out = [];
    const addMany = (values) => {
      if (!values) return;
      const list = Array.isArray(values) ? values : [values];
      for (const value of list) {
        const label = this._normalizeLanguageDisplayEntry(value);
        if (label) out.push(label);
      }
    };

    addMany(this.system.languages);
    addMany(this.system.languageNames);
    addMany(this.system.languageLabels);
    addMany(this.system.languageData?.knownLanguages);
    addMany(this.system.languageData?.known);
    addMany(this.system.progression?.languages);
    addMany(this.system.progression?.knownLanguages);

    // Defensive fallback for actors finalized before language grants were
    // materialized onto system.languages. The sheet can still read language
    // grants from species/background data already embedded on the actor.
    addMany(this.system.species?.languages);
    addMany(this.system.species?.primary?.languages);
    addMany(this.system.species?.selected?.languages);
    addMany(this.system.speciesVariant?.languages);

    for (const item of this._actorItems()) {
      if (item?.type === 'species') {
        addMany(item.system?.languages);
        addMany(item.system?.canonicalStats?.languages);
        addMany(item.system?.speciesRules?.languages);
      }
      if (item?.type === 'background') {
        addMany(item.system?.languages);
        addMany(item.system?.grants?.languages);
      }
    }

    const seen = new Set();
    return out.filter((label) => {
      const key = String(label || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Build the languages panel context
   *
   * Contract: languagesPanel
   * - entries: [ languageString ]
   * - hasEntries: boolean
   */
  buildLanguagesPanel() {
    const languages = this._collectLanguageDisplayEntries();

    const panel = {
      entries: languages,
      hasEntries: languages.length > 0
    };

    return panel;
  }

  /**
   * Build the racial abilities panel context
   *
   * Contract: racialAbilitiesPanel
   * - entries: [ { name, summary, ... } ]
   * - hasEntries: boolean
   */
  buildRacialAbilitiesPanel() {
    const racialAbilities = this._collectSpeciesAbilityEntries();

    const panel = {
      entries: racialAbilities,
      hasEntries: racialAbilities.length > 0
    };

    return panel;
  }

  /**
   * Build the armor summary panel context
   *
   * Contract: armorSummaryPanel
   * - equippedArmor: { name, armorType, reflexBonus, fortBonus, maxDexBonus, armorCheckPenalty, speedPenalty, weight, isPowered, upgradeSlots } | null
   * - canEdit: boolean
   */
  buildArmorSummaryPanel() {
    const equippedArmorItem = this._actorItems().find(item =>
      item.type === 'armor' && item.system?.equipped === true
    );

    const panel = {
      equippedArmor: equippedArmorItem ? {
        id: equippedArmorItem.id,
        name: equippedArmorItem.name,
        armorType: equippedArmorItem.system?.armorType,
        reflexBonus: equippedArmorItem.system?.reflexBonus,
        fortBonus: equippedArmorItem.system?.fortBonus,
        maxDexBonus: equippedArmorItem.system?.maxDexBonus,
        armorCheckPenalty: equippedArmorItem.system?.armorCheckPenalty,
        speedPenalty: equippedArmorItem.system?.speedPenalty,
        weight: equippedArmorItem.system?.weight,
        isPowered: equippedArmorItem.system?.isPowered,
        upgradeSlots: equippedArmorItem.system?.upgradeSlots
      } : null,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('armorSummaryPanel', panel);
    return panel;
  }

  /**
   * Build the equipment ledger panel context
   *
   * Contract: equipmentLedgerPanel
   * - allEquipment: [ { id, name, category, quantity, weight, cost, equipped } ]
   * - totalEquipmentWeight: string (e.g., "45 lbs")
   * - canEdit: boolean
   */
  buildEquipmentLedgerPanel() {
    let totalEquipmentWeightNum = 0;

    const allEquipment = this._actorItems()
      .filter(item => ['weapon', 'armor', 'equipment'].includes(item.type))
      .map(item => {
        const itemWeight = item.system?.weight ?? 0;
        const itemQty = item.system?.quantity ?? 1;
        const itemCost = item.system?.cost ?? 0;
        totalEquipmentWeightNum += itemWeight * itemQty;
        return {
          id: item.id,
          name: item.name,
          category: item.type === 'weapon' ? 'Weapon' :
                    item.type === 'armor' ? 'Armor' : 'Equipment',
          quantity: itemQty,
          weight: itemWeight ? `${itemWeight} lbs` : '—',
          cost: itemCost > 0 ? itemCost.toLocaleString() : '—',
          equipped: item.system?.equipped ?? false
        };
      })
      .sort((a, b) => {
        if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      });

    const panel = {
      allEquipment,
      totalEquipmentWeight: totalEquipmentWeightNum > 0 ? `${totalEquipmentWeightNum} lbs` : '',
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('equipmentLedgerPanel', panel);
    return panel;
  }

  /**
   * Build the combat notes panel context
   *
   * Contract: combatNotesPanel
   * - combatNotes: string
   * - canEdit: boolean
   */
  buildCombatNotesPanel() {
    const panel = {
      combatNotes: this.actor.flags?.swse?.sheetNotes?.specialCombatActions || '',
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('combatNotesPanel', panel);
    return panel;
  }

  /**
   * Build the relationships panel context
   *
   * Contract: relationshipsPanel
   * - relationships: [ { uuid, img, name, type, notes } ]
   * - hasAvailableFollowerSlots: boolean
   * - relationshipNotes: string
   * - canEdit: boolean
   */
  buildRelationshipsPanel() {
    const relationships = (this.actor.system?.relationships ?? []).map(rel => ({
      uuid: rel.uuid || '',
      img: rel.img || '',
      name: rel.name || '',
      type: rel.type || '',
      notes: rel.notes || ''
    }));

    // Calculate available follower slots (depends on game mechanics)
    // For now, always show the button (can be customized)
    const hasAvailableFollowerSlots = true;

    const panel = {
      relationships,
      hasAvailableFollowerSlots,
      relationshipNotes: this.actor.flags?.swse?.character?.relationshipNotes || '',
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('relationshipsPanel', panel);
    return panel;
  }

  /**
   * Build the combat stats panel context
   *
   * Contract: combatStatsPanel
   * - speed: { value, label }
   * - initiative: { value, label, skillKey }
   * - perception: { value, label, skillKey }
   * - baseAttack: { value, label }
   * - canEdit: boolean
   */
  buildCombatStatsPanel() {
    const speed = {
      value: Number(this.system.speed?.value) || 0,
      label: `${this.system.speed?.value || 0} ft.`
    };

    // Initiative: derived.initiative.total (from DerivedCalculator)
    const initiativeTotal = Number(this.derived.initiative?.total) || 0;
    const initiative = {
      value: initiativeTotal,
      label: `+${initiativeTotal}`,
      skillKey: 'initiative'
    };

    // Perception: derived.skills.perception.total (computed skill)
    const perceptionTotal = Number(this.derived.skills?.perception?.total) || 0;
    const perception = {
      value: perceptionTotal,
      label: `+${perceptionTotal}`,
      skillKey: 'perception'
    };

    // Base Attack Bonus: derived.bab (from BABCalculator)
    const babTotal = Number(this.derived.bab) || 0;
    const baseAttack = {
      value: babTotal,
      label: `+${babTotal}`
    };

    const panel = {
      speed,
      initiative,
      perception,
      baseAttack,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('combatStatsPanel', panel);
    return panel;
  }

  /**
   * Build the resources panel context (Combat Metrics & Resources)
   *
   * PHASE 6: Canonical builder for all combat metrics and heroic resources
   * Consolidates mixed-source context into single display model
   *
   * Contract: resourcesPanel
   * - combatMetrics: { speed, initiative, perception, bab, grappleBonus, damageThreshold }
   * - resources: { forcePoints, destinyPoints, forcePointDie }
   */
  buildResourcesPanel() {
    const system = this.system;
    const derived = this.derived;

    // COMBAT METRICS - engine-owned sources
    const speed = Number(system.speed) || 0;
    const initiativeTotal = Number(derived.initiative?.total) || 0;
    const perceptionTotal = Number(derived.skills?.perception?.total) || 0;

    // BAB: system.baseAttackBonus is the authoritative editable field
    // Fallback to derived.bab only if system value not set
    const bab = Number(system.baseAttackBonus ?? derived.bab) || 0;

    const grappleBonus = Number(derived.grappleBonus) || 0;
    const damageThreshold = Number(derived.damageThreshold) || 0;

    // HEROIC RESOURCES - engine-owned sources
    const forcePointsValue = Number(system.forcePoints?.value) || 0;
    const forcePointsMax = Number(system.forcePoints?.max) || 0;
    const destinyPointsValue = Number(system.destinyPoints?.value) || 0;
    const destinyPointsMax = Number(system.destinyPoints?.max) || 0;

    // Force Point Die configuration (if system has it)
    const forcePointDie = system.forcePointDie || 'd6';

    // Credits
    const credits = Number(system.credits) || 0;

    const panel = {
      combatMetrics: {
        speed,
        initiativeTotal,
        perceptionTotal,
        bab,
        grappleBonus,
        damageThreshold,
        canEdit: this.sheet.isEditable
      },
      resources: {
        forcePointsValue,
        forcePointsMax,
        destinyPointsValue,
        destinyPointsMax,
        forcePointDie,
        credits,
        canEdit: this.sheet.isEditable
      }
    };

    this._validatePanelContext('resourcesPanel', panel);
    return panel;
  }

  /**
   * Build the abilities panel context
   *
   * Contract: abilitiesPanel
   * - abilities: [ { key, label, value, modifier, modifierClass } ]
   */
  buildAbilitiesPanel() {
    // PHASE 7.5: Consume canonical attributes view-model instead of recomputing
    // buildAttributesViewModel is the single source of truth for ability data
    // All ability displays use the same prepared bundle
    const attributesViewModel = buildAttributesViewModel(this.actor);

    const abilities = Object.values(attributesViewModel).map(attr => ({
      ...attr,
      canEdit: this.sheet.isEditable
    }));

    const panel = {
      abilities,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('abilitiesPanel', panel);
    return panel;
  }

  /**
   * Build the skills panel context
   *
   * Contract: skillsPanel
   * - skills: [ { key, label, bonus, trained, canEdit } ]
   */
  buildSkillsPanel() {
    const rawSkills = this.derived.skills || {};
    const skillKeys = Object.keys(CANONICAL_SKILL_DEFS).filter((key) => rawSkills?.[key]);

    const skills = skillKeys.map(key => {
      const skillData = rawSkills?.[key] || {};
      const canonicalKey = canonicalizeSkillKey(key);
      const bonus = Number(skillData.total) || 0;
      const trained = this.system.skills?.[canonicalKey]?.trained === true || skillData.trained === true;

      return {
        key: canonicalKey,
        label: skillData.label || CANONICAL_SKILL_DEFS[canonicalKey]?.label || key,
        bonus,
        trained,
        canEdit: this.sheet.isEditable
      };
    });

    const panel = {
      skills,
      canEdit: this.sheet.isEditable
    };

    this._validatePanelContext('skillsPanel', panel);
    return panel;
  }
}
