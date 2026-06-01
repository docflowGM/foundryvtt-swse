/**
 * Shipyard Builder / Vehicle Modification Application
 *
 * Store construction mode for custom starships.  This UI is deliberately thin:
 * - real frame/modification data comes from VehicleModificationManager
 * - credits come from LedgerService
 * - rule gates use VehicleModificationManager.canInstallModification()
 * - purchase mutates through StoreEngine.purchase() + VehicleFactory.buildMutationPlan()
 * - approval-gated builds create draft vehicle actors for the GM approval queue
 */

import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { VehicleModificationManager } from "/systems/foundryvtt-swse/scripts/apps/vehicle-modification-manager.js";
import SWSEApplication from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import { StoreEngine } from "/systems/foundryvtt-swse/scripts/engine/store/store-engine.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { VehicleFactory } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-factory.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { createActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const CATEGORY_META = Object.freeze({
  movement: { key: 'movement', label: 'Movement & Propulsion', tab: 'Movement', icon: 'fa-rocket' },
  defense: { key: 'defense', label: 'Defense Systems', tab: 'Defense', icon: 'fa-shield-halved' },
  weapon: { key: 'weapon', label: 'Weapon Systems', tab: 'Weapons', icon: 'fa-crosshairs' },
  accessory: { key: 'accessory', label: 'Accessories', tab: 'Accessories', icon: 'fa-screwdriver-wrench' }
});

const CATEGORY_ORDER = Object.keys(CATEGORY_META);

function normalizeCategory(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.startsWith('movement')) return 'movement';
  if (raw.startsWith('defense')) return 'defense';
  if (raw.startsWith('weapon')) return 'weapon';
  if (raw.startsWith('accessor')) return 'accessory';
  return raw || 'accessory';
}

function formatCredits(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '0 cr';
  return `${number.toLocaleString()} cr`;
}

function formatSignedCredits(value) {
  const number = Number(value ?? 0);
  const prefix = number > 0 ? '+' : '';
  return `${prefix}${number.toLocaleString()} cr`;
}

function cssSafe(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'misc';
}

function numberOrZero(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export class VehicleModificationApp extends SWSEApplication {
  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null; // wallet / owner actor
    this.targetVehicle = options.targetVehicle ?? options.vehicleActor ?? null;
    this.stockShip = null;
    this.modifications = [];
    this.originalModifications = [];
    this.removedModifications = [];
    this.baseVehicleCost = 0;
    this.focusedModId = null;
    this.selectedCategory = 'all';
    this.query = '';
    this.compatOnly = false;
    this.contextMode = options.contextMode || 'storeConstruction';
    this.mode = options.mode || 'shipyard';
    this.isSubmitting = false;
    this._restoreSearchFocus = false;
    this._hydratedExistingVehicle = false;
  }

  static DEFAULT_OPTIONS = {
    id: 'swse-vehicle-modification',
    classes: ['swse', 'swse-vehicle-mod-app', 'swse-shipyard-builder-app'],
    tag: 'div',
    template: 'systems/foundryvtt-swse/templates/apps/vehicle-modification.hbs',
    position: { width: 1240, height: 820 },
    window: {
      title: 'Shipyard Builder',
      resizable: true,
      frame: true
    },
    popOut: true
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    if (!VehicleModificationManager._initialized) {
      await VehicleModificationManager.init();
    }

    if (!VehicleModificationManager._initialized) {
      return {
        ...context,
        actor: this.actor,
        loadError: true,
        errorMessage: 'Failed to load vehicle modification data. Check the browser console for details.'
      };
    }

    this._hydrateExistingVehicleState();

    const credits = this._currentCredits();
    const epStats = this._epStats();
    const costSummary = this._costSummary();
    const frameCost = costSummary.frame;
    const modificationCost = costSummary.modifications;
    const buildTotal = costSummary.total;
    const remainingCredits = credits - costSummary.netCost;
    const warnings = this._buildWarnings({ remainingCredits, epStats });
    const requiresApproval = this._requiresApproval(buildTotal);
    const hasChanges = !this._isModifyExisting() || this._hasExistingBuildChanges();
    const canSubmit = Boolean(this.stockShip) && remainingCredits >= 0 && epStats.remaining >= 0 && !this.isSubmitting && hasChanges;
    const focusedMod = this._focusedModification();

    return {
      ...context,
      actor: this.actor,
      loadError: false,
      contextMode: this.contextMode,
      isModifyExisting: this._isModifyExisting(),
      appTitle: this._isModifyExisting() ? 'Shipyard Refit' : 'Shipyard Builder',
      subtitle: this._isModifyExisting() ? `Modify Existing · ${this.targetVehicle?.name || 'Selected Vehicle'}` : `Store Construction Mode · Marl Skindar's Outfitting Yard`,
      walletLabel: this._isModifyExisting() ? 'Owner Credits' : 'Player Credits',
      totalLabel: this._isModifyExisting() ? 'Net Refit Cost' : 'Build Total',
      closeLabel: this._isModifyExisting() ? 'Back to Shipyard' : 'Back to Store',
      hasChanges,
      playerCredits: credits,
      playerCreditsLabel: formatCredits(credits),
      stockShips: this._frameRows(),
      hasFrame: Boolean(this.stockShip),
      frame: this._frameSummary(),
      categories: this._categoryTabs(),
      selectedCategory: this.selectedCategory,
      query: this.query,
      compatOnly: this.compatOnly,
      compatOnlyClass: this.compatOnly ? 'on' : '',
      systemGroups: this._systemGroups(),
      installedGroups: this._installedGroups(),
      removedGroups: this._removedGroups(),
      installedCount: this.modifications.length,
      modCountLabel: `${this.modifications.length} mod${this.modifications.length === 1 ? '' : 's'}`,
      focused: focusedMod,
      hasFocused: Boolean(focusedMod),
      ep: {
        ...epStats,
        fillPct: `${Math.max(0, Math.min(100, epStats.available > 0 ? (epStats.used / epStats.available) * 100 : 0))}%`,
        fillClass: epStats.remaining <= 0 && epStats.used > 0 ? 'full' : epStats.used / Math.max(1, epStats.available) > 0.75 ? 'warn' : 'ok',
        label: `${epStats.remaining} remaining`
      },
      cost: {
        ...costSummary,
        frame: frameCost,
        frameLabel: formatCredits(frameCost),
        modifications: modificationCost,
        modificationsLabel: formatCredits(modificationCost),
        total: buildTotal,
        totalLabel: formatCredits(buildTotal),
        vehicleValueLabel: formatCredits(costSummary.vehicleValue),
        grossCostLabel: formatCredits(costSummary.grossCost),
        resaleCreditLabel: formatCredits(costSummary.resaleCredit),
        netCostLabel: formatSignedCredits(costSummary.netCost),
        credits,
        creditsLabel: formatCredits(credits),
        remaining: remainingCredits,
        remainingLabel: formatSignedCredits(remainingCredits),
        remainingClass: remainingCredits < 0 ? 'neg' : remainingCredits === 0 ? 'neu' : 'pos'
      },
      checklist: this._checklist(remainingCredits),
      warnings,
      warningCount: warnings.length,
      validity: this._validity({ remainingCredits, epStats }),
      requiresApproval,
      approvalNotice: requiresApproval ? this._approvalReason(buildTotal) : '',
      canSubmit,
      submitDisabled: canSubmit ? '' : 'disabled',
      submitLabel: this._submitLabel(requiresApproval),
      footerStatus: this._footerStatus({ remainingCredits, epStats, requiresApproval })
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    root.querySelectorAll('[data-action]').forEach((element) => {
      element.addEventListener('click', (event) => this._handleAction(event));
    });

    const search = root.querySelector('[data-role="shipyard-search"]');
    if (search) {
      search.addEventListener('input', (event) => {
        this.query = event.currentTarget.value || '';
        this._restoreSearchFocus = true;
        this.render(false);
      });

      if (this._restoreSearchFocus) {
        queueMicrotask(() => {
          search.focus();
          const cursor = String(search.value || '').length;
          search.setSelectionRange?.(cursor, cursor);
        });
        this._restoreSearchFocus = false;
      }
    }
  }

  async _handleAction(event) {
    const target = event.currentTarget;
    const action = target?.dataset?.action;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();

    switch (action) {
      case 'select-frame':
        return this._selectFrame(target.dataset.frameName);
      case 'change-frame':
        return this._changeFrame();
      case 'focus-mod':
        return this._focusModification(target.dataset.modId);
      case 'install-mod':
        return this._installModification(target.dataset.modId);
      case 'remove-mod':
        return this._removeModification(target.dataset.modId);
      case 'set-filter':
        this.selectedCategory = target.dataset.filter || 'all';
        return this.render(false);
      case 'toggle-compatible':
        this.compatOnly = !this.compatOnly;
        return this.render(false);
      case 'reset-filters':
        this.selectedCategory = 'all';
        this.query = '';
        this.compatOnly = false;
        return this.render(false);
      case 'submit-build':
        return this._submitBuild();
      case 'close-builder':
        return this.close();
      default:
        return undefined;
    }
  }


  _isModifyExisting() {
    return this.contextMode === 'modifyExisting';
  }

  _clone(value) {
    return foundry.utils.deepClone(value ?? null);
  }

  _modKey(mod = {}) {
    return String(mod?.id || mod?.name || '').trim();
  }

  _normalizeStoredModification(mod = {}, sourceStatus = 'existing') {
    const base = mod?.id ? (VehicleModificationManager.getModification(mod.id) || {}) : {};
    const merged = { ...base, ...this._clone(mod) };
    const nonstandard = Boolean(merged.nonstandard ?? this._isNonstandard(merged));
    const finalCost = numberOrZero(merged.finalCost ?? VehicleModificationManager.calculateModificationCost(merged, this.stockShip, nonstandard, this.modifications));
    return {
      ...merged,
      category: normalizeCategory(merged.category),
      finalCost,
      nonstandard,
      sourceStatus
    };
  }

  _synthesizeStockShipFromVehicle(vehicle) {
    const system = vehicle?.system ?? {};
    const attrs = system.attributes ?? {};
    const cost = system.cost;
    const costValue = typeof cost === 'number'
      ? cost
      : typeof cost === 'object'
        ? numberOrZero(cost.new ?? cost.value)
        : numberOrZero(String(cost || '').replace(/[^0-9.-]/g, ''));
    const unused = numberOrZero(system.unusedEmplacementPoints ?? system.remainingCustomizationEmplacementPoints ?? 0);
    const used = numberOrZero(system.emplacementPoints ?? system.usedCustomizationEmplacementPoints ?? 0);
    return {
      name: system.buildMetadata?.frameName || system.shipyard?.frameName || vehicle?.name || 'Existing Vehicle',
      size: system.size || 'Colossal',
      strength: numberOrZero(attrs.str?.base ?? system.strength ?? 10),
      dexterity: numberOrZero(attrs.dex?.base ?? system.dexterity ?? 10),
      intelligence: numberOrZero(attrs.int?.base ?? system.intelligence ?? 10),
      speedCharacter: system.speedCharacter || system.speed || '',
      speedStarship: system.speedStarship || system.speed || '',
      hitPoints: numberOrZero(system.hull?.max ?? system.hp?.max ?? 1),
      dr: numberOrZero(system.damageReduction ?? system.dr ?? 0),
      armor: numberOrZero(system.armor ?? system.armorBonus ?? 0),
      cost: costValue,
      costModifier: numberOrZero(system.costModifier ?? system.stockShip?.costModifier ?? 1) || 1,
      crew: numberOrZero(system.crew ?? 1),
      passengers: numberOrZero(system.passengers ?? 0),
      cargoCapacity: system.cargoCapacity || system.cargo || '',
      consumables: system.consumables || '',
      emplacementPoints: used,
      unusedEmplacementPoints: unused
    };
  }

  _hydrateExistingVehicleState() {
    if (!this._isModifyExisting() || this._hydratedExistingVehicle) return;
    this._hydratedExistingVehicle = true;

    const vehicle = this.targetVehicle;
    if (!vehicle || vehicle.type !== 'vehicle') return;

    const system = vehicle.system ?? {};
    const flagBuild = vehicle.getFlag?.('foundryvtt-swse', 'shipyardBuild') || vehicle.flags?.['foundryvtt-swse']?.shipyardBuild || null;
    const modData = system.modificationData || system.shipyard || flagBuild || {};
    const stockShip = modData.stockShip || system.stockShip || flagBuild?.stockShip || this._synthesizeStockShipFromVehicle(vehicle);
    const frameName = stockShip?.name || system.buildMetadata?.frameName || system.shipyard?.frameName || vehicle.name;
    this.stockShip = VehicleModificationManager.getStockShip(frameName) || stockShip;

    const storedMods = Array.isArray(modData.modifications)
      ? modData.modifications
      : Array.isArray(modData.installedModifications)
        ? modData.installedModifications
        : Array.isArray(flagBuild?.modifications)
          ? flagBuild.modifications
          : [];

    this.originalModifications = storedMods.map((mod) => this._normalizeStoredModification(mod, 'existing'));
    this.modifications = this.originalModifications.map((mod) => this._clone(mod));
    this.removedModifications = [];
    this.baseVehicleCost = numberOrZero(modData.frameCost ?? modData.costs?.frameCost ?? this.stockShip?.cost ?? system.cost?.new ?? system.cost ?? 0);
  }

  _originalModIds() {
    return new Set(this.originalModifications.map((mod) => this._modKey(mod)).filter(Boolean));
  }

  _addedModifications() {
    if (!this._isModifyExisting()) return this.modifications;
    const originalIds = this._originalModIds();
    return this.modifications.filter((mod) => !originalIds.has(this._modKey(mod)) || mod.sourceStatus === 'added');
  }

  _grossInstallCost() {
    if (!this._isModifyExisting()) return numberOrZero(this.stockShip?.cost) + this.modifications.reduce((sum, mod) => sum + numberOrZero(mod.finalCost), 0);
    return this._addedModifications().reduce((sum, mod) => sum + numberOrZero(mod.finalCost), 0);
  }

  _resaleCredit() {
    if (!this._isModifyExisting()) return 0;
    return this.removedModifications.reduce((sum, mod) => sum + LedgerService.calculateResale(numberOrZero(mod.finalCost)), 0);
  }

  _hasExistingBuildChanges() {
    if (!this._isModifyExisting()) return true;
    return this._addedModifications().length > 0 || this.removedModifications.length > 0;
  }

  _costSummary() {
    const frameCost = this._isModifyExisting() ? this.baseVehicleCost : numberOrZero(this.stockShip?.cost);
    const modificationCost = this.modifications.reduce((sum, mod) => sum + numberOrZero(mod.finalCost), 0);
    const fullTotal = this._isModifyExisting() ? frameCost + modificationCost : frameCost + modificationCost;
    const grossCost = this._isModifyExisting() ? this._grossInstallCost() : fullTotal;
    const resaleCredit = this._resaleCredit();
    const netCost = Math.max(0, grossCost - resaleCredit);
    return {
      frame: frameCost,
      modifications: modificationCost,
      total: this._isModifyExisting() ? netCost : fullTotal,
      vehicleValue: fullTotal,
      grossCost,
      resaleCredit,
      netCost
    };
  }

  _submitLabel(requiresApproval) {
    if (this._isModifyExisting()) {
      if (requiresApproval) return 'Apply Restricted Refit';
      return 'Apply Shipyard Refit';
    }
    return requiresApproval ? 'Submit for GM Approval' : 'Submit for Purchase';
  }

  _currentCredits() {
    if (!this.actor) return 0;
    return numberOrZero(LedgerService.getCurrentCredits(this.actor));
  }

  _frameRows() {
    return VehicleModificationManager.getStockShips().map((ship) => ({
      ...ship,
      typeClass: `shipyard-frame--${this._frameType(ship)}`,
      selectedClass: this.stockShip?.name === ship.name ? 'selected' : '',
      costLabel: formatCredits(ship.cost),
      costModifierLabel: `×${numberOrZero(ship.costModifier) || 1} mod`,
      unusedEP: numberOrZero(ship.unusedEmplacementPoints),
      hp: numberOrZero(ship.hitPoints),
      dr: numberOrZero(ship.dr),
      crew: numberOrZero(ship.crew)
    }));
  }

  _frameType(ship) {
    const size = String(ship?.size || '').toLowerCase();
    const name = String(ship?.name || '').toLowerCase();
    if (size.includes('frigate') || name.includes('corvette')) return 'frigate';
    if (name.includes('fighter') || name.includes('interceptor') || name.includes('bomber')) return 'starfighter';
    if (name.includes('freighter') || name.includes('shuttle') || name.includes('gunship')) return 'transport';
    return 'colossal';
  }

  _frameSummary() {
    const f = this.stockShip;
    if (!f) return null;
    return {
      ...f,
      costLabel: formatCredits(f.cost),
      sizeLabel: f.size || '—',
      speedLabel: `${f.speedCharacter || '—'} / ${f.speedStarship || '—'}`,
      crewPassLabel: `${numberOrZero(f.crew)} / ${numberOrZero(f.passengers)}`,
      costModifierLabel: `×${numberOrZero(f.costModifier) || 1}`,
      stats: [
        { label: 'STR', value: numberOrZero(f.strength) },
        { label: 'DEX', value: numberOrZero(f.dexterity) },
        { label: 'INT', value: numberOrZero(f.intelligence) },
        { label: 'HP', value: numberOrZero(f.hitPoints) },
        { label: 'DR', value: numberOrZero(f.dr) },
        { label: 'Armor', value: `+${numberOrZero(f.armor)}` },
        { label: 'Speed', value: `${f.speedCharacter || '—'} / ${f.speedStarship || '—'}`, wide: true },
        { label: 'Crew / Pass', value: `${numberOrZero(f.crew)} / ${numberOrZero(f.passengers)}`, wide: true },
        { label: 'Cargo', value: f.cargoCapacity || '—', wide: true },
        { label: 'Cost Modifier', value: `×${numberOrZero(f.costModifier) || 1}`, wide: true }
      ]
    };
  }

  _categoryTabs() {
    return [
      { key: 'all', label: 'All', activeClass: this.selectedCategory === 'all' ? 'on' : '' },
      ...CATEGORY_ORDER.map((key) => ({
        key,
        label: CATEGORY_META[key].tab,
        activeClass: this.selectedCategory === key ? 'on' : ''
      }))
    ];
  }

  _systemGroups() {
    if (!this.stockShip) return [];

    const query = String(this.query || '').trim().toLowerCase();
    const groups = [];

    for (const key of CATEGORY_ORDER) {
      if (this.selectedCategory !== 'all' && this.selectedCategory !== key) continue;

      const systems = VehicleModificationManager.getModificationsByCategory(key)
        .filter((mod) => this._matchesQuery(mod, query))
        .map((mod) => this._decorateModification(mod))
        .filter((mod) => !this.compatOnly || mod.compatible || mod.installed);

      if (!systems.length) continue;
      groups.push({
        key,
        label: CATEGORY_META[key].label,
        count: systems.length,
        systems
      });
    }

    return groups;
  }

  _matchesQuery(mod, query) {
    if (!query) return true;
    const haystack = [mod.name, mod.description, mod.effect, mod.availability, mod.sizeRestriction]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  }

  _decorateModification(mod) {
    const installed = this._isInstalled(mod.id);
    const installedRecord = this.modifications.find((entry) => entry.id === mod.id);
    const nonstandard = this._isNonstandard(mod);
    const cost = installedRecord?.finalCost ?? VehicleModificationManager.calculateModificationCost(mod, this.stockShip, nonstandard, this.modifications);
    const eligibility = this._installEligibility(mod);
    const category = normalizeCategory(mod.category);
    const isFocused = this.focusedModId === mod.id;
    const isRestricted = this._isApprovalAvailability(mod);

    return {
      ...mod,
      category,
      categoryLabel: CATEGORY_META[category]?.tab ?? category,
      cssCategory: cssSafe(category),
      installed,
      installedClass: installed ? 'installed' : '',
      focusedClass: isFocused ? 'focused' : '',
      cantClass: !eligibility.canInstall && !installed ? 'cant' : '',
      compatible: eligibility.canInstall,
      blockingReason: eligibility.reason,
      nonstandard,
      cost,
      costLabel: formatCredits(cost),
      baseCostLabel: formatCredits(mod.cost || 0),
      ep: numberOrZero(mod.emplacementPoints),
      epLabel: `${numberOrZero(mod.emplacementPoints)} EP`,
      availabilityLabel: mod.availability || 'Common',
      restrictedBadge: isRestricted,
      militaryBadge: String(mod.availability || '').toLowerCase() === 'military',
      zeroEpBadge: numberOrZero(mod.emplacementPoints) === 0,
      nonstandardBadge: nonstandard,
      actionLabel: installed ? 'Installed' : eligibility.canInstall ? 'Install' : 'Blocked'
    };
  }


  _removedGroups() {
    if (!this._isModifyExisting() || !this.removedModifications.length) return [];
    const byCategory = new Map();
    for (const mod of this.removedModifications) {
      const key = normalizeCategory(mod.category);
      if (!byCategory.has(key)) byCategory.set(key, []);
      const resale = LedgerService.calculateResale(numberOrZero(mod.finalCost));
      byCategory.get(key).push({
        ...this._decorateModification(mod),
        resaleLabel: formatCredits(resale),
        costLabel: formatCredits(mod.finalCost)
      });
    }
    return CATEGORY_ORDER
      .filter((key) => byCategory.has(key))
      .map((key) => ({ key, label: CATEGORY_META[key]?.label ?? key, systems: byCategory.get(key) }));
  }

  _installedGroups() {
    if (!this.stockShip || !this.modifications.length) return [];
    const byCategory = new Map();
    for (const mod of this.modifications) {
      const key = normalizeCategory(mod.category);
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(this._decorateModification(mod));
    }
    return CATEGORY_ORDER
      .filter((key) => byCategory.has(key))
      .map((key) => ({ key, label: CATEGORY_META[key]?.label ?? key, systems: byCategory.get(key) }));
  }

  _focusedModification() {
    const base = VehicleModificationManager.getModification(this.focusedModId);
    if (!base || !this.stockShip) return null;

    const mod = this._decorateModification(base);
    const adjustedBase = base.costType === 'base'
      ? numberOrZero(base.cost) * (numberOrZero(this.stockShip.costModifier) || 1)
      : numberOrZero(base.cost);
    const costSummary = this._costSummary();
    const remainingBefore = this._currentCredits() - costSummary.netCost;
    const installedRecord = this.modifications.find((entry) => entry.id === mod.id);
    const removalCredit = this._isModifyExisting() && installedRecord?.sourceStatus === 'existing'
      ? LedgerService.calculateResale(numberOrZero(mod.cost))
      : numberOrZero(mod.cost);
    const after = mod.installed
      ? remainingBefore + removalCredit
      : remainingBefore - numberOrZero(mod.cost);
    const epRemaining = this._epStats().remaining;
    const compatClass = mod.installed ? 'compat-inst' : mod.compatible ? 'compat-can' : 'compat-no';
    const compatIcon = mod.installed ? 'fa-check-circle' : mod.compatible ? 'fa-circle-plus' : 'fa-ban';
    const compatText = mod.installed ? 'Installed — can remove below' : mod.compatible ? 'Can install' : mod.blockingReason;

    return {
      ...mod,
      adjustedBaseLabel: formatCredits(adjustedBase),
      finalCostLabel: formatCredits(mod.cost),
      afterInstallLabel: formatCredits(after),
      afterClass: after < 0 && !mod.installed ? 'neg' : after === 0 ? 'neu' : 'pos',
      costModifierLabel: `×${numberOrZero(this.stockShip.costModifier) || 1}`,
      showCostModifier: base.costType === 'base',
      nonstandardCostLabel: formatCredits(adjustedBase * 5),
      epRemainingLabel: `${epRemaining} EP remaining`,
      epBadgeClass: numberOrZero(mod.emplacementPoints) > epRemaining && !mod.installed ? 'ep-short' : 'ep-ok',
      effectLabel: base.effect || '—',
      description: base.description || 'No description available.',
      availabilityLabel: base.availability || 'Common',
      sizeRestrictionLabel: base.sizeRestriction || '',
      hasSizeRestriction: Boolean(base.sizeRestriction),
      hasWeaponStats: Boolean(base.weaponType || base.damage),
      weaponTypeLabel: base.weaponType || '—',
      damageLabel: base.damage || '—',
      compatClass,
      compatIcon,
      compatText,
      requiresApproval: this._isApprovalAvailability(base),
      showInstall: !mod.installed,
      showRemove: mod.installed,
      installDisabled: mod.compatible ? '' : 'disabled'
    };
  }

  _epStats() {
    if (!this.stockShip) {
      return { used: 0, available: 0, total: 0, remaining: 0, usedByStock: 0, totalAvailable: 0 };
    }
    return VehicleModificationManager.calculateEmplacementPointsTotal(this.modifications, this.stockShip);
  }

  _buildTotal() {
    return this._costSummary().total;
  }

  _installEligibility(mod) {
    if (!this.stockShip) return { canInstall: false, reason: 'Select a frame first.' };
    if (this._isInstalled(mod.id)) return { canInstall: false, reason: 'Already installed.' };

    const managerCheck = VehicleModificationManager.canInstallModification(mod, this.stockShip, this.modifications);
    if (!managerCheck.canInstall) return managerCheck;

    const cost = VehicleModificationManager.calculateModificationCost(mod, this.stockShip, this._isNonstandard(mod), this.modifications);
    const currentNet = this._costSummary().netCost;
    const projectedNet = Math.max(0, currentNet + cost);
    const remaining = this._currentCredits() - projectedNet;
    if (remaining < 0) {
      return { canInstall: false, reason: `Need ${formatCredits(Math.abs(remaining))} more credits.` };
    }

    return { canInstall: true, reason: '' };
  }

  _isInstalled(modId) {
    return this.modifications.some((mod) => mod.id === modId);
  }

  _isNonstandard(mod) {
    if (!mod || !this.stockShip) return false;
    return VehicleModificationManager.isNonstandardModification(mod, this.stockShip);
  }

  _isApprovalAvailability(mod) {
    const availability = String(mod?.availability || '').toLowerCase();
    return availability === 'restricted' || availability === 'military' || availability === 'illegal';
  }

  _approvalRelevantModifications() {
    return this._isModifyExisting() ? this._addedModifications() : this.modifications;
  }

  _requiresApproval(totalCost = this._buildTotal()) {
    if (!this.stockShip) return false;
    if (this._approvalRelevantModifications().some((mod) => this._isApprovalAvailability(mod))) return true;
    if (SettingsHelper.getSafe('store.requireGMApproval', false) === true) return true;
    const threshold = Number(SettingsHelper.getSafe('storeApprovalThreshold', 0)) || 0;
    return threshold > 0 && totalCost >= threshold;
  }

  _approvalReason(totalCost = this._buildTotal()) {
    const restricted = this._approvalRelevantModifications().filter((mod) => this._isApprovalAvailability(mod));
    if (restricted.length) return `${restricted.length} restricted/military modification${restricted.length === 1 ? '' : 's'} require GM review.`;
    if (SettingsHelper.getSafe('store.requireGMApproval', false) === true) return 'Store policy currently requires GM approval.';
    const threshold = Number(SettingsHelper.getSafe('storeApprovalThreshold', 0)) || 0;
    if (threshold > 0 && totalCost >= threshold) return `Value is at or above the ${formatCredits(threshold)} approval threshold.`;
    return 'GM approval required.';
  }

  _checklist(remainingCredits) {
    const hasHyperdrive = this.modifications.some((mod) => String(mod.id || '').startsWith('hyperdrive-'));
    const hasShield = this.modifications.some((mod) => VehicleModificationManager.isShieldModification(mod));
    const hasWeapon = this.modifications.some((mod) => normalizeCategory(mod.category) === 'weapon');
    const selected = Boolean(this.stockShip);
    const item = (done, optional = false) => ({
      done,
      optional,
      iconClass: optional && !done ? 'fa-circle ck-opt' : done ? 'fa-check-circle ck-done' : 'fa-circle ck-miss'
    });
    return {
      frame: item(selected),
      hyperdrive: item(hasHyperdrive, !hasHyperdrive),
      shields: item(hasShield, !hasShield),
      weapons: item(hasWeapon, !hasWeapon),
      budget: item(selected && remainingCredits >= 0, !selected)
    };
  }

  _buildWarnings({ remainingCredits, epStats }) {
    const warnings = [];
    if (remainingCredits < 0) {
      warnings.push({ tone: 'neg', icon: 'fa-exclamation-circle', text: `Over budget by ${formatCredits(Math.abs(remainingCredits))}.` });
    }
    if (this.stockShip && epStats.remaining < 0) {
      warnings.push({ tone: 'neg', icon: 'fa-exclamation-circle', text: `EP exceeded: ${epStats.used}/${epStats.available} used.` });
    }
    const nonstandard = this.modifications.filter((mod) => mod.nonstandard === true);
    if (nonstandard.length) {
      warnings.push({ tone: 'warn', icon: 'fa-triangle-exclamation', text: `${nonstandard.length} nonstandard modification${nonstandard.length === 1 ? '' : 's'} at 5× cost: ${nonstandard.map((mod) => mod.name).join(', ')}.` });
    }
    const approval = this._approvalRelevantModifications().filter((mod) => this._isApprovalAvailability(mod));
    if (approval.length) {
      const text = this._isModifyExisting()
        ? `${approval.length} restricted/military modification${approval.length === 1 ? '' : 's'} will be recorded in the transaction audit for GM review.`
        : `${approval.length} restricted/military modification${approval.length === 1 ? '' : 's'} will be routed to GM approval.`;
      warnings.push({ tone: 'warn', icon: 'fa-gavel', text });
    }
    return warnings;
  }

  _validity({ remainingCredits, epStats }) {
    if (!this.stockShip) return { chipClass: 'chip-none', iconClass: 'fa-circle', label: 'Select a Frame' };
    if (remainingCredits < 0) return { chipClass: 'chip-bad', iconClass: 'fa-times-circle', label: 'Over Budget' };
    if (epStats.remaining < 0) return { chipClass: 'chip-bad', iconClass: 'fa-times-circle', label: 'Over EP' };
    return { chipClass: 'chip-valid', iconClass: 'fa-check-circle', label: 'Build Valid' };
  }

  _footerStatus({ remainingCredits, epStats, requiresApproval }) {
    if (!this.stockShip) return 'Select a vessel frame to begin';
    if (remainingCredits < 0) return `Over budget by ${formatCredits(Math.abs(remainingCredits))} — remove modifications`;
    if (epStats.remaining < 0) return `Over EP by ${Math.abs(epStats.remaining)} — remove modifications`;
    if (this._isModifyExisting() && !this._hasExistingBuildChanges()) return 'No refit changes staged';
    const reviewSuffix = requiresApproval ? (this._isModifyExisting() ? ' · restricted mods logged' : ' · GM approval required') : '';
    return `${this._isModifyExisting() ? 'Refit valid' : 'Build valid'} · ${formatCredits(remainingCredits)} remaining · ${this.modifications.length} mod(s)${reviewSuffix}`;
  }

  async _selectFrame(frameName) {
    if (this._isModifyExisting()) {
      ui.notifications.warn('Existing vehicle refits cannot change the base frame.');
      return;
    }
    const frame = VehicleModificationManager.getStockShip(frameName);
    if (!frame) {
      ui.notifications.warn('Ship frame not found.');
      return;
    }
    this.stockShip = frame;
    this.modifications = [];
    this.focusedModId = null;
    this.selectedCategory = 'all';
    this.query = '';
    this.compatOnly = false;
    await this.render(true);
  }

  async _changeFrame() {
    if (this._isModifyExisting()) {
      ui.notifications.warn('Existing vehicle refits cannot change the base frame.');
      return;
    }
    if (this.stockShip && this.modifications.length) {
      const confirmed = await SWSEDialogV2.confirm({
        title: 'Change Frame?',
        content: '<p>Changing the frame resets all installed modifications for this build.</p>',
        defaultYes: false
      });
      if (!confirmed) return;
    }
    this.stockShip = null;
    this.modifications = [];
    this.focusedModId = null;
    await this.render(true);
  }

  async _focusModification(modId) {
    this.focusedModId = modId || null;
    await this.render(false);
  }

  async _installModification(modId) {
    const mod = VehicleModificationManager.getModification(modId);
    if (!mod) {
      ui.notifications.warn('Modification not found.');
      return;
    }

    const removedOriginal = this.removedModifications.find((entry) => entry.id === mod.id);
    if (removedOriginal) {
      this.removedModifications = this.removedModifications.filter((entry) => entry.id !== mod.id);
      this.modifications.push({ ...this._clone(removedOriginal), sourceStatus: 'existing' });
      this.focusedModId = mod.id;
      await this.render(false);
      return;
    }

    const eligibility = this._installEligibility(mod);
    if (!eligibility.canInstall) {
      ui.notifications.warn(eligibility.reason || 'This modification cannot be installed.');
      this.focusedModId = mod.id;
      await this.render(false);
      return;
    }

    const nonstandard = this._isNonstandard(mod);
    const finalCost = VehicleModificationManager.calculateModificationCost(mod, this.stockShip, nonstandard, this.modifications);
    this.modifications.push({
      ...foundry.utils.deepClone(mod),
      category: normalizeCategory(mod.category),
      finalCost,
      nonstandard,
      sourceStatus: this._isModifyExisting() ? 'added' : 'newBuild',
      installedAt: Date.now()
    });
    this.focusedModId = mod.id;
    await this.render(false);
  }

  async _removeModification(modId) {
    const removed = this.modifications.find((mod) => mod.id === modId);
    this.modifications = this.modifications.filter((mod) => mod.id !== modId);
    if (this._isModifyExisting() && removed) {
      const wasOriginal = this.originalModifications.some((mod) => mod.id === modId);
      if (wasOriginal && !this.removedModifications.some((mod) => mod.id === modId)) {
        this.removedModifications.push({ ...this._clone(removed), sourceStatus: 'removed' });
      }
    }
    if (this.focusedModId === modId) this.focusedModId = modId;
    await this.render(false);
  }

  _buildSpec(totalCost = this._buildTotal()) {
    const costSummary = this._costSummary();
    return {
      stockShip: foundry.utils.deepClone(this.stockShip),
      modifications: foundry.utils.deepClone(this.modifications),
      removedModifications: foundry.utils.deepClone(this.removedModifications),
      addedModifications: foundry.utils.deepClone(this._addedModifications()),
      condition: 'new',
      totalCost: this._isModifyExisting() ? costSummary.vehicleValue : totalCost,
      transactionCost: costSummary.netCost,
      grossCost: costSummary.grossCost,
      resaleCredit: costSummary.resaleCredit,
      name: this._isModifyExisting()
        ? (this.targetVehicle?.name || `${this.stockShip?.name || 'Vehicle'} (Refit)`)
        : `${this.stockShip?.name || 'Custom Starship'} (Custom)`,
      ownerActorId: this.actor?.id ?? null,
      ownerActorName: this.actor?.name ?? null,
      existingVehicleActorId: this.targetVehicle?.id ?? null,
      existingVehicleActorName: this.targetVehicle?.name ?? null,
      contextMode: this.contextMode
    };
  }

  _purchaseItem(totalCost) {
    return {
      id: `custom-starship-${Date.now()}`,
      name: `${this.stockShip.name} (Custom)`,
      type: 'vehicle',
      finalCost: totalCost,
      cost: totalCost,
      condition: 'new',
      customBuild: true
    };
  }

  async _submitExistingModification() {
    if (!this.targetVehicle || this.targetVehicle.type !== 'vehicle') {
      ui.notifications.warn('No existing vehicle actor is linked for this refit.');
      return false;
    }
    if (!this._hasExistingBuildChanges()) {
      ui.notifications.warn('No refit changes are staged.');
      return false;
    }

    const costSummary = this._costSummary();
    const epStats = this._epStats();
    const remaining = this._currentCredits() - costSummary.netCost;
    if (remaining < 0) {
      ui.notifications.warn(`Insufficient credits. Need ${formatCredits(Math.abs(remaining))} more.`);
      return false;
    }
    if (epStats.remaining < 0) {
      ui.notifications.warn(`Insufficient emplacement points. Remove ${Math.abs(epStats.remaining)} EP worth of modifications.`);
      return false;
    }

    const requiresApproval = this._requiresApproval(costSummary.netCost);
    const title = requiresApproval ? 'Apply Restricted Shipyard Refit?' : 'Apply Shipyard Refit?';
    const content = `
      <p><strong>${this.targetVehicle.name}</strong></p>
      <p>Install cost: ${formatCredits(costSummary.grossCost)} · Removal credit: ${formatCredits(costSummary.resaleCredit)}</p>
      <p>Net refit cost: <strong>${formatCredits(costSummary.netCost)}</strong></p>
      <p>${requiresApproval ? `${this._approvalReason(costSummary.netCost)} The refit will be recorded in the Transaction Engine audit.` : 'This will update the vehicle and charge the owner wallet through the Transaction Engine.'}</p>
    `;

    const confirmed = await SWSEDialogV2.confirm({ title, content, defaultYes: !requiresApproval });
    if (!confirmed) return false;

    const buildSpec = this._buildSpec(costSummary.netCost);
    const vehiclePlan = VehicleFactory.buildExistingModificationMutationPlan(this.targetVehicle, buildSpec);
    const result = await TransactionEngine.executeAssetCustomizationTransaction({
      actor: this.actor,
      assetActor: this.targetVehicle,
      assetMutationPlan: vehiclePlan,
      cost: costSummary.grossCost,
      resaleCredit: costSummary.resaleCredit,
      reason: `Shipyard refit: ${this.targetVehicle.name}`,
      transactionContext: 'owned-customization',
      audit: {
        source: 'Shipyard Builder - Modify Existing',
        itemName: `${this.targetVehicle.name} refit`,
        itemNames: [`${this.targetVehicle.name} refit`],
        itemCount: this._addedModifications().length + this.removedModifications.length,
        ownerActorId: this.actor?.id ?? null,
        ownerActorName: this.actor?.name ?? null,
        vehicleActorId: this.targetVehicle.id,
        vehicleActorName: this.targetVehicle.name,
        shipyard: {
          frameName: this.stockShip?.name ?? null,
          grossCost: costSummary.grossCost,
          resaleCredit: costSummary.resaleCredit,
          netCost: costSummary.netCost,
          ep: epStats,
          addedModifications: this._addedModifications().map((mod) => ({ id: mod.id, name: mod.name, cost: mod.finalCost })),
          removedModifications: this.removedModifications.map((mod) => ({ id: mod.id, name: mod.name, resale: LedgerService.calculateResale(numberOrZero(mod.finalCost)) }))
        }
      }
    }, {
      source: 'VehicleModificationApp.submitExistingRefit',
      validate: true,
      rederive: true
    });

    if (!result.success) {
      ui.notifications.error(`Refit failed: ${result.error}`);
      return false;
    }

    ui.notifications.info(`${this.targetVehicle.name} refit complete.`);
    return true;
  }

  async _submitBuild() {
    if (this.isSubmitting) return;
    if (!this.stockShip) {
      ui.notifications.warn('Select a vessel frame first.');
      return;
    }

    if (this._isModifyExisting()) {
      this.isSubmitting = true;
      let closedAfterSubmit = false;
      await this.render(false);
      try {
        const submitted = await this._submitExistingModification();
        if (submitted) {
          closedAfterSubmit = true;
          await this.close();
        }
      } catch (err) {
        SWSELogger.error('SWSE Shipyard | Failed to apply shipyard refit:', err);
        ui.notifications.error('Failed to apply shipyard refit. See console for details.');
      } finally {
        this.isSubmitting = false;
        if (!closedAfterSubmit && this.rendered) await this.render(false);
      }
      return;
    }

    const costSummary = this._costSummary();
    const totalCost = costSummary.netCost;
    const epStats = this._epStats();
    const remaining = this._currentCredits() - totalCost;
    if (remaining < 0) {
      ui.notifications.warn(`Insufficient credits. Need ${formatCredits(Math.abs(remaining))} more.`);
      return;
    }
    if (epStats.remaining < 0) {
      ui.notifications.warn(`Insufficient emplacement points. Remove ${Math.abs(epStats.remaining)} EP worth of modifications.`);
      return;
    }

    const requiresApproval = this._requiresApproval(totalCost);
    const title = requiresApproval ? 'Submit Starship for GM Approval?' : 'Purchase Custom Starship?';
    const content = `
      <p><strong>${this.stockShip.name} (Custom)</strong></p>
      <p>Frame: ${formatCredits(this.stockShip.cost)} · Modifications: ${formatCredits(totalCost - numberOrZero(this.stockShip.cost))}</p>
      <p>Total: <strong>${formatCredits(totalCost)}</strong></p>
      <p>${requiresApproval ? this._approvalReason(totalCost) : 'This will deduct credits and create the vehicle actor through the store transaction engine.'}</p>
    `;

    const confirmed = await SWSEDialogV2.confirm({ title, content, defaultYes: !requiresApproval });
    if (!confirmed) return;

    this.isSubmitting = true;
    let closedAfterSubmit = false;
    await this.render(false);

    try {
      if (requiresApproval) {
        const submitted = await this._submitForApproval(totalCost);
        if (submitted) {
          closedAfterSubmit = true;
          await this.close();
        }
        return;
      }

      const item = this._purchaseItem(totalCost);
      const eligible = StoreEngine.canPurchase({
        actor: this.actor,
        items: [item],
        totalCost
      });

      if (!eligible.canPurchase) {
        ui.notifications.warn(eligible.reason || 'Cannot complete purchase.');
        return;
      }

      const buildSpec = this._buildSpec(totalCost);
      const result = await StoreEngine.purchase({
        actor: this.actor,
        items: [item],
        totalCost,
        transactionContext: 'store-purchase',
        itemGrantCallback: async () => [VehicleFactory.buildMutationPlan(buildSpec)]
      });

      if (!result.success) {
        ui.notifications.error(`Purchase failed: ${result.error}`);
        return;
      }

      ui.notifications.info(`${this.stockShip.name} purchased. Check your actors list.`);
      closedAfterSubmit = true;
      await this.close();
    } catch (err) {
      SWSELogger.error('SWSE Shipyard | Failed to submit custom starship:', err);
      ui.notifications.error('Failed to submit custom starship. See console for details.');
    } finally {
      this.isSubmitting = false;
      if (!closedAfterSubmit && this.rendered) await this.render(false);
    }
  }

  async _submitForApproval(totalCost) {
    const buildSpec = this._buildSpec(totalCost);
    const draftData = VehicleFactory.buildVehicleActorData(buildSpec);
    draftData.ownership = { default: 0 };
    draftData.flags = {
      ...(draftData.flags || {}),
      'foundryvtt-swse': {
        ...(draftData.flags?.['foundryvtt-swse'] || {}),
        pendingApproval: true,
        draftOnly: true,
        approvalType: 'vehicle',
        ownerPlayerId: game.user?.id ?? null,
        ownerActorId: this.actor?.id ?? null,
        ownerActorName: this.actor?.name ?? null
      }
    };

    const draftVehicle = await createActor(draftData);
    if (!draftVehicle) {
      ui.notifications.error('Failed to create draft vehicle for approval.');
      return false;
    }

    const pendingRecord = {
      id: `pending_vehicle_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: 'vehicle',
      draftActorId: draftVehicle.id,
      modificationData: buildSpec,
      vehicleTemplateName: this.stockShip.name,
      ownerPlayerId: game.user?.id ?? null,
      ownerActorId: this.actor?.id ?? null,
      ownerActorName: this.actor?.name ?? null,
      costCredits: totalCost,
      requestedAt: Date.now(),
      draftData: {
        name: draftVehicle.name,
        type: 'vehicle',
        baseTemplate: this.stockShip.name,
        cost: totalCost,
        details: this.modifications.map((mod) => `${mod.name} — ${formatCredits(mod.finalCost)}`).join('\n'),
        description: `Custom ${this.stockShip.name} built by ${this.actor?.name || 'Unknown Actor'}`
      },
      metadata: {
        source: 'shipyard-builder',
        contextMode: this.contextMode,
        approvalReason: this._approvalReason(totalCost)
      }
    };

    const pendingPurchases = SettingsHelper.getArray('pendingCustomPurchases', []);
    pendingPurchases.push(pendingRecord);
    await SettingsHelper.set('pendingCustomPurchases', pendingPurchases);
    Hooks.callAll?.('swseStoreApprovalRequested', { approval: pendingRecord, actor: this.actor });

    ui.notifications.info('Vehicle design submitted for GM approval. Awaiting review.');
    return true;
  }

  static async open(actor, options = {}) {
    if (!VehicleModificationManager._initialized) {
      await VehicleModificationManager.init();
    }
    return new this({ actor, mode: 'shipyard', contextMode: 'storeConstruction', ...options }).render(true);
  }
}
