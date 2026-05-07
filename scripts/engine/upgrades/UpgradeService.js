/**
 * UpgradeService — Facade for all upgrade app data computation
 *
 * Rules:
 * - All data building happens here, not in the UI
 * - UI receives vm.* only and sends commands only
 * - Droids and vehicles are adapted through this layer regardless of shape
 * - No direct item/actor mutation — mutations go through UpgradeCommands
 */

import { CustomizationWorkflow } from '/systems/foundryvtt-swse/scripts/engine/customization/customization-workflow.js';
import { DroidCustomizationEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/droid-customization-engine.js';
import { VehicleCustomizationEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/vehicle-customization-engine.js';
import { LedgerService } from '/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

const CATEGORY_LABELS = {
  weapons: 'Weapons',
  armor: 'Armor',
  gear: 'Gear',
  lightsabers: 'Lightsabers',
  droids: 'Droids',
  vehicles: 'Vehicles'
};

const MENTOR_MAP = {
  weapons: { name: "Zam Wesell", role: "Master Weaponsmith", text: "Every weapon has potential waiting to be unlocked. Let me show you." },
  armor: { name: "Mandalore", role: "Master Armorer", text: "Your armor is your life. Let us make it worthy of the fight ahead." },
  gear: { name: "Dexter Jettster", role: "Equipment Specialist", text: "The right modification at the right time can be the difference between life and death." },
  lightsabers: { name: "Master Yoda", role: "Lightsaber Sage", text: "The crystal is the heart of the blade. Choose with care, you must." },
  droids: { name: "C-3PO", role: "Droid Specialist", text: "We droids are quite capable of incredible upgrades when given proper attention." },
  vehicles: { name: "Han Solo", role: "Master Mechanic", text: "She may not look like much, but she's got it where it counts. Trust me." }
};

export class UpgradeService {
  static #workflow = null;

  static get workflow() {
    if (!this.#workflow) this.#workflow = new CustomizationWorkflow();
    return this.#workflow;
  }

  // ─── Entry Point ─────────────────────────────────────────────────────────────

  static async buildUpgradeAppData({ actor, mode, focusedItemId = null, selectedCategoryId = null, selectedItemId = null }) {
    const allRecords = this.collectOwnedUpgradeRecords(actor);
    const applicableRecords = this.filterApplicableRecords(allRecords);
    const scopedRecords = this.applyModeScope({ mode, focusedItemId, records: applicableRecords });

    if (mode === 'single-item' && scopedRecords.length === 0) {
      return {
        activeCategoryId: null,
        activeItemId: null,
        vm: {
          mode, actorId: actor.id, focusedItemId,
          categories: [], items: [], selectedItem: null,
          mentor: this.buildUnavailableMentorVm(),
          footer: this.buildDisabledFooter(),
          unavailableMessage: 'This item has no valid upgrades.'
        }
      };
    }

    if (mode === 'actor' && scopedRecords.length === 0) {
      return {
        activeCategoryId: null,
        activeItemId: null,
        vm: {
          mode, actorId: actor.id, focusedItemId: null,
          categories: [], items: [], selectedItem: null,
          mentor: this.buildEmptyMentorVm(),
          footer: this.buildDisabledFooter(),
          unavailableMessage: 'No upgradeable items available.'
        }
      };
    }

    const categoryBuckets = this.bucketRecordsByCategory(scopedRecords);
    const visibleCategories = this.computeVisibleCategories(categoryBuckets);
    const activeCategoryId = this.resolveActiveCategoryId({ mode, focusedItemId, selectedCategoryId, visibleCategories, scopedRecords });

    visibleCategories.forEach(c => { c.active = c.id === activeCategoryId; });

    const visibleItems = this.getItemsForCategory({ records: scopedRecords, categoryId: activeCategoryId, mode, focusedItemId });
    const activeItemId = this.resolveActiveItemId({ mode, focusedItemId, selectedItemId, visibleItems });

    visibleItems.forEach(i => { i.selected = i.id === activeItemId; });

    const selectedRecord = scopedRecords.find(r => r.id === activeItemId) || null;
    const selectedItemDetail = selectedRecord ? await this.buildSelectedItemDetail(actor, selectedRecord) : null;
    const footer = this.buildFooter({ actor, selectedItemDetail });

    return {
      activeCategoryId,
      activeItemId,
      vm: {
        mode, actorId: actor.id, focusedItemId,
        categories: visibleCategories,
        items: visibleItems,
        selectedItem: selectedItemDetail,
        mentor: this.buildMentorVm(selectedRecord),
        footer,
        unavailableMessage: null
      }
    };
  }

  // ─── Record Collection ────────────────────────────────────────────────────────

  static collectOwnedUpgradeRecords(actor) {
    if (!actor) return [];
    const records = [];

    if (actor.items) {
      for (const item of actor.items) {
        records.push({
          sourceType: 'item',
          id: item.id,
          actorId: actor.id,
          name: item.name,
          document: item,
          rawType: item.type,
          system: item.system
        });
      }
    }

    // Droid actors represent themselves as an upgradeable entity
    if (actor.type === 'droid') {
      records.push({
        sourceType: 'droid-actor',
        id: `droid-actor-${actor.id}`,
        actorId: actor.id,
        name: actor.name,
        document: actor,
        rawType: 'droid-actor',
        system: actor.system
      });
    }

    // Vehicle actors represent themselves as an upgradeable entity
    if (actor.type === 'vehicle') {
      records.push({
        sourceType: 'vehicle-actor',
        id: `vehicle-actor-${actor.id}`,
        actorId: actor.id,
        name: actor.name,
        document: actor,
        rawType: 'vehicle-actor',
        system: actor.system
      });
    }

    return records;
  }

  // ─── Applicability ────────────────────────────────────────────────────────────

  static filterApplicableRecords(records) {
    return records.filter(record => {
      const category = this.resolveCategory(record);
      if (!category) return false;
      const upgrades = this.getAvailableUpgradesForRecord(null, record);
      return Array.isArray(upgrades) && upgrades.length > 0;
    });
  }

  static getItemApplicability(actor, itemOrRecord) {
    const record = this.normalizeOwnedRecord(actor, itemOrRecord);
    if (!record) return { upgradeable: false };
    const category = this.resolveCategory(record);
    if (!category) return { upgradeable: false };
    const availableUpgrades = this.getAvailableUpgradesForRecord(actor, record);
    return {
      upgradeable: availableUpgrades.length > 0,
      category,
      availableUpgradeCount: availableUpgrades.length
    };
  }

  static getUpgradeAppSummary(actor) {
    const records = this.collectOwnedUpgradeRecords(actor);
    const applicableRecords = this.filterApplicableRecords(records);
    return { totalApplicableItems: applicableRecords.length };
  }

  static normalizeOwnedRecord(actor, itemOrRecord) {
    if (!itemOrRecord) return null;
    if (itemOrRecord.sourceType) return itemOrRecord;
    return {
      sourceType: 'item',
      id: itemOrRecord.id,
      actorId: actor?.id ?? null,
      name: itemOrRecord.name,
      document: itemOrRecord,
      rawType: itemOrRecord.type,
      system: itemOrRecord.system
    };
  }

  // ─── Category Resolution ──────────────────────────────────────────────────────

  static resolveCategory(record) {
    if (record.sourceType === 'droid-actor') return 'droids';
    if (record.sourceType === 'vehicle-actor') return 'vehicles';
    if (record.rawType === 'droid') return 'droids';
    if (this.isLightsaber(record)) return 'lightsabers';
    if (this.isWeapon(record)) return 'weapons';
    if (this.isArmor(record)) return 'armor';
    if (this.isGear(record)) return 'gear';
    return null;
  }

  static isLightsaber(record) {
    if (record.rawType !== 'weapon') return false;
    const sys = record.system ?? {};
    return sys.weaponType === 'lightsaber' ||
           sys.weaponCategory === 'lightsaber' ||
           sys.isLightsaber === true ||
           record.document?.flags?.['foundryvtt-swse']?.isLightsaber === true;
  }

  static isWeapon(record) {
    return record.rawType === 'weapon' && !this.isLightsaber(record);
  }

  static isArmor(record) {
    return record.rawType === 'armor';
  }

  static isGear(record) {
    return record.rawType === 'equipment';
  }

  static isDroid(record) {
    return record.sourceType === 'droid-actor' || record.rawType === 'droid';
  }

  static isVehicle(record) {
    return record.sourceType === 'vehicle-actor';
  }

  // ─── Available Upgrades ───────────────────────────────────────────────────────

  static getAvailableUpgradesForRecord(actor, record) {
    try {
      if (record.sourceType === 'droid-actor') {
        const result = DroidCustomizationEngine.getAvailableSystems(record.document);
        if (!result.success) return [];
        return (result.systems ?? [])
          .filter(s => !s.installed)
          .map(s => ({
            key: s.id,
            id: s.id,
            name: s.name,
            description: s.description ?? '',
            cost: s.cost ?? 0,
            slotCost: 1,
            restriction: 'common',
            allowed: true,
            alreadyInstalled: false
          }));
      }

      if (record.sourceType === 'vehicle-actor') {
        const result = VehicleCustomizationEngine.getVehicleCustomizationState(record.document);
        if (!result.success) return [];
        return (result.systems ?? [])
          .filter(s => s.compatible !== false && !s.installed)
          .map(s => ({
            key: s.id,
            id: s.id,
            name: s.name,
            description: s.description ?? '',
            cost: s.cost ?? 0,
            slotCost: s.slot ?? 1,
            restriction: 'common',
            allowed: true,
            alreadyInstalled: false
          }));
      }

      // Standard item — use CustomizationWorkflow
      const item = record.document;
      if (!item) return [];
      const state = this.workflow.getFullCustomizationState(item);
      if (state.error) return [];
      const upgrades = state.availableUpgrades ?? [];
      return upgrades.filter(u => u.visible !== false);
    } catch {
      return [];
    }
  }

  static getCurrentUpgrades(actor, record) {
    try {
      if (record.sourceType === 'droid-actor') {
        return Object.keys(record.system?.installedSystems ?? {}).map(key => ({
          id: key, name: key, slotsUsed: 1, description: ''
        }));
      }
      if (record.sourceType === 'vehicle-actor') {
        return Object.keys(record.system?.installedSystems ?? {}).map(key => ({
          id: key, name: key, slotsUsed: 1, description: ''
        }));
      }
      const state = this.workflow.getFullCustomizationState(record.document);
      if (state.error) return [];
      return (state.installedUpgrades ?? []).map(u => ({
        id: u.upgradeKey ?? u.id ?? u.key,
        name: u.name ?? u.upgradeKey ?? 'Unknown',
        slotsUsed: u.slotsUsed ?? u.slotCost ?? 1,
        description: u.description ?? '',
        cost: u.cost ?? 0
      }));
    } catch {
      return [];
    }
  }

  static getSlotUsage(actor, record) {
    try {
      if (record.sourceType === 'droid-actor' || record.sourceType === 'vehicle-actor') {
        const count = Object.keys(record.system?.installedSystems ?? {}).length;
        return { used: count, max: 10, remaining: Math.max(0, 10 - count) };
      }
      const state = this.workflow.getFullCustomizationState(record.document);
      if (state.error) return { used: 0, max: 0, remaining: 0 };
      const slots = state.slots ?? {};
      const used = slots.used ?? 0;
      const total = slots.total ?? 0;
      return { used, max: total, remaining: Math.max(0, total - used) };
    } catch {
      return { used: 0, max: 0, remaining: 0 };
    }
  }

  static getCostSummary(actor, record, availableUpgrades) {
    return {
      pendingCost: 0,
      totalInstalled: this.getCurrentUpgrades(actor, record).length
    };
  }

  static getDescription(record) {
    return record.system?.description ?? record.document?.system?.description ?? '';
  }

  static getDisplayStats(record) {
    if (record.sourceType === 'droid-actor') {
      return {
        degree: record.system?.degree ?? '—',
        size: record.system?.droidSystems?.size ?? '—'
      };
    }
    if (record.sourceType === 'vehicle-actor') {
      return {
        type: record.system?.type ?? '—',
        speed: record.system?.speed?.base ?? '—'
      };
    }
    const sys = record.system ?? {};
    if (this.isLightsaber(record) || record.rawType === 'weapon') {
      return { damage: sys.damage ?? '—', type: sys.weaponCategory ?? sys.meleeOrRanged ?? '—', cost: sys.cost ?? '—' };
    }
    if (record.rawType === 'armor') {
      return { reflexDef: sys.reflexDefense ?? '—', fortDef: sys.fortitudeDefense ?? '—', cost: sys.cost ?? '—' };
    }
    return { cost: sys.cost ?? '—' };
  }

  // ─── Mode Scoping ─────────────────────────────────────────────────────────────

  static applyModeScope({ mode, focusedItemId, records }) {
    if (mode !== 'single-item') return records;
    return records.filter(r => r.id === focusedItemId);
  }

  // ─── Category Bucketing ───────────────────────────────────────────────────────

  static bucketRecordsByCategory(records) {
    const buckets = { weapons: [], armor: [], gear: [], lightsabers: [], droids: [], vehicles: [] };
    for (const record of records) {
      const cat = this.resolveCategory(record);
      if (cat && buckets[cat]) buckets[cat].push(record);
    }
    return buckets;
  }

  // ─── Visible Categories ───────────────────────────────────────────────────────

  static computeVisibleCategories(categoryBuckets) {
    return Object.entries(categoryBuckets)
      .filter(([, records]) => records.length > 0)
      .map(([id, records]) => ({
        id,
        label: CATEGORY_LABELS[id],
        count: records.length,
        visible: true,
        active: false
      }));
  }

  // ─── Active Category Resolution ───────────────────────────────────────────────

  static resolveActiveCategoryId({ mode, focusedItemId, selectedCategoryId, visibleCategories, scopedRecords }) {
    if (!visibleCategories.length) return null;
    if (mode === 'single-item' && focusedItemId) {
      const record = scopedRecords.find(r => r.id === focusedItemId);
      return record ? this.resolveCategory(record) : visibleCategories[0].id;
    }
    if (visibleCategories.some(c => c.id === selectedCategoryId)) return selectedCategoryId;
    return visibleCategories[0].id;
  }

  // ─── Item List for Category ───────────────────────────────────────────────────

  static getItemsForCategory({ records, categoryId, mode, focusedItemId }) {
    if (!categoryId) return [];
    const filtered = records.filter(r => this.resolveCategory(r) === categoryId);
    if (mode === 'single-item' && focusedItemId) {
      return filtered.filter(r => r.id === focusedItemId).map(r => this.buildItemListRowVm(r, true));
    }
    return filtered.map(r => this.buildItemListRowVm(r, false));
  }

  // ─── Active Item Resolution ───────────────────────────────────────────────────

  static resolveActiveItemId({ mode, focusedItemId, selectedItemId, visibleItems }) {
    if (!visibleItems.length) return null;
    if (mode === 'single-item' && focusedItemId) return focusedItemId;
    if (visibleItems.some(i => i.id === selectedItemId)) return selectedItemId;
    return visibleItems[0].id;
  }

  // ─── Item List Row VM ─────────────────────────────────────────────────────────

  static buildItemListRowVm(record, selected) {
    const doc = record.document;
    return {
      id: record.id,
      name: record.name,
      type: record.rawType,
      category: this.resolveCategory(record),
      upgradeable: true,
      selected,
      equipped: doc?.system?.equipped ?? doc?.system?.isEquipped ?? false,
      summary: this.buildItemSummary(record),
      ui: {
        icon: doc?.img ?? 'icons/svg/item-bag.svg',
        rarity: doc?.system?.restriction ?? doc?.system?.rarity ?? 'common',
        displayType: this.getDisplayTypeName(record)
      }
    };
  }

  static buildItemSummary(record) {
    if (record.sourceType === 'droid-actor') return `${record.system?.degree ?? ''} Droid`.trim();
    if (record.sourceType === 'vehicle-actor') return record.system?.type ?? 'Vehicle';
    const sys = record.system ?? {};
    if (this.isLightsaber(record)) return `${sys.damage ?? '—'} • Lightsaber`;
    if (record.rawType === 'weapon') return `${sys.damage ?? '—'} dmg`;
    if (record.rawType === 'armor') return `Ref +${sys.reflexDefense ?? 0}`;
    return sys.cost ? `${sys.cost} cr` : '';
  }

  static getDisplayTypeName(record) {
    if (record.sourceType === 'droid-actor') return 'Droid';
    if (record.sourceType === 'vehicle-actor') return 'Vehicle';
    if (this.isLightsaber(record)) return 'Lightsaber';
    const typeNames = { weapon: 'Weapon', armor: 'Armor', equipment: 'Gear', droid: 'Droid' };
    return typeNames[record.rawType] ?? record.rawType ?? '—';
  }

  // ─── Selected Item Detail ─────────────────────────────────────────────────────

  static async buildSelectedItemDetail(actor, record) {
    const currentUpgrades = this.getCurrentUpgrades(actor, record);
    const availableUpgrades = this.getAvailableUpgradesForRecord(actor, record);
    const slotUsage = this.getSlotUsage(actor, record);
    const costSummary = this.getCostSummary(actor, record, availableUpgrades);

    const base = {
      id: record.id,
      name: record.name,
      category: this.resolveCategory(record),
      description: this.getDescription(record),
      stats: this.getDisplayStats(record),
      currentUpgrades,
      availableUpgrades,
      slotUsage,
      costSummary,
      lightsaberData: null
    };

    if (this.isLightsaber(record)) {
      base.lightsaberData = this.buildLightsaberVm(actor, record);
    }

    return base;
  }

  // ─── Lightsaber VM ────────────────────────────────────────────────────────────

  static buildLightsaberVm(actor, record) {
    const doc = record.document;
    const sys = doc?.system ?? {};
    const flags = doc?.flags?.['foundryvtt-swse'] ?? {};
    return {
      chassisOptions: sys.chassisOptions ?? [],
      crystalOptions: sys.crystalOptions ?? [],
      colorOptions: [
        { id: 'blue', label: 'Blue', hex: '#4499ff' },
        { id: 'green', label: 'Green', hex: '#44ff44' },
        { id: 'red', label: 'Red', hex: '#ff4444' },
        { id: 'purple', label: 'Purple', hex: '#aa44ff' },
        { id: 'yellow', label: 'Yellow', hex: '#ffff44' },
        { id: 'white', label: 'White', hex: '#f8f8ff' },
        { id: 'cyan', label: 'Cyan', hex: '#00ffff' },
        { id: 'orange', label: 'Orange', hex: '#ff8800' }
      ],
      selectedChassisId: sys.chassisId ?? null,
      selectedCrystalId: sys.crystalId ?? null,
      selectedColorId: flags.bladeColor ?? sys.bladeColor ?? 'blue',
      renderMode: 'standard'
    };
  }

  // ─── Footer ───────────────────────────────────────────────────────────────────

  static buildFooter({ actor, selectedItemDetail }) {
    const creditsAvailable = this.getActorAvailableCredits(actor);
    const pendingCost = selectedItemDetail?.costSummary?.pendingCost ?? 0;
    const creditsAfter = creditsAvailable - pendingCost;
    const usedSlots = selectedItemDetail?.slotUsage?.used ?? 0;
    const maxSlots = selectedItemDetail?.slotUsage?.max ?? 0;
    const canApply = !!selectedItemDetail && this.canApplySelectedUpgradeSet(actor, selectedItemDetail);
    return {
      creditsAvailable,
      creditsCost: pendingCost,
      creditsAfter,
      slotUsage: { used: usedSlots, max: maxSlots },
      canApply
    };
  }

  static getActorAvailableCredits(actor) {
    return Number(actor?.system?.credits ?? 0);
  }

  static canApplySelectedUpgradeSet(actor, selectedItemDetail) {
    const hasUpgrades = (selectedItemDetail?.availableUpgrades?.filter(u => u.allowed !== false).length ?? 0) > 0;
    const hasSlots = (selectedItemDetail?.slotUsage?.remaining ?? 0) > 0 || (selectedItemDetail?.slotUsage?.max ?? 0) === 0;
    return hasUpgrades;
  }

  // ─── Mentor VMs ───────────────────────────────────────────────────────────────

  static buildMentorVm(record) {
    if (!record) return this.buildEmptyMentorVm();
    const cat = this.resolveCategory(record);
    const mentor = MENTOR_MAP[cat] ?? MENTOR_MAP.gear;
    return { ...mentor, image: 'icons/svg/aura.svg' };
  }

  static buildEmptyMentorVm() {
    return { name: 'Upgrade Workshop', role: 'Specialist', text: 'Bring me your gear and I will make it worthy of the galaxy.', image: 'icons/svg/aura.svg' };
  }

  static buildUnavailableMentorVm() {
    return { name: 'Upgrade Workshop', role: 'Specialist', text: 'This item cannot be upgraded at this time.', image: 'icons/svg/aura.svg' };
  }

  static buildDisabledFooter() {
    return { creditsAvailable: 0, creditsCost: 0, creditsAfter: 0, slotUsage: { used: 0, max: 0 }, canApply: false };
  }

  static buildEmptyViewModel() {
    return {
      mode: 'actor', actorId: null, focusedItemId: null,
      categories: [], items: [], selectedItem: null,
      mentor: this.buildEmptyMentorVm(),
      footer: this.buildDisabledFooter(),
      unavailableMessage: 'No actor available.'
    };
  }

  // ─── Mutations (routed through ActorEngine) ───────────────────────────────────

  static async applyUpgrade({ actor, itemId, upgradeId }) {
    // Droid actor upgrade
    if (itemId?.startsWith('droid-actor-')) {
      const installedSystems = { ...(actor.system?.installedSystems ?? {}) };
      installedSystems[upgradeId] = true;
      await ActorEngine.applyMutationPlan(actor, { set: { 'system.installedSystems': installedSystems } });
      return { success: true };
    }

    // Vehicle actor upgrade
    if (itemId?.startsWith('vehicle-actor-')) {
      const installedSystems = { ...(actor.system?.installedSystems ?? {}) };
      installedSystems[upgradeId] = true;
      await ActorEngine.applyMutationPlan(actor, { set: { 'system.installedSystems': installedSystems } });
      return { success: true };
    }

    // Standard item upgrade
    const item = actor.items.get(itemId);
    if (!item) throw new Error(`Item ${itemId} not found on actor`);

    const state = this.workflow.getFullCustomizationState(item);
    const upgrade = (state.availableUpgrades ?? []).find(u => u.key === upgradeId);
    if (!upgrade) throw new Error(`Upgrade ${upgradeId} not found or not applicable`);
    if (!upgrade.allowed) throw new Error(`Upgrade ${upgradeId} not allowed: ${upgrade.reason}`);

    const customState = state.customState ?? {};
    const installed = customState.installedUpgrades ?? item.system?.installedUpgrades ?? [];
    const nextInstalled = [...installed, {
      upgradeKey: upgrade.key,
      name: upgrade.name,
      slotsUsed: upgrade.slotCost ?? 1,
      cost: upgrade.cost ?? 0,
      restriction: upgrade.restriction ?? 'common',
      description: upgrade.description ?? ''
    }];

    if (item.isEmbedded && actor) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: item.id, 'system.installedUpgrades': nextInstalled }]);
    } else {
      // @mutation-exception: world-item - updating unowned item from world compendium
      await item.update({ 'system.installedUpgrades': nextInstalled });
    }

    if ((upgrade.cost ?? 0) > 0) {
      const fundCheck = LedgerService.validateFunds(actor, upgrade.cost);
      if (fundCheck.ok) {
        const creditPlan = LedgerService.buildCreditDelta(actor, upgrade.cost);
        await ActorEngine.applyMutationPlan(actor, creditPlan);
      }
    }

    return { success: true };
  }

  static async removeUpgrade({ actor, itemId, upgradeIndex }) {
    // Droid actor system removal
    if (itemId?.startsWith('droid-actor-') || itemId?.startsWith('vehicle-actor-')) {
      const installedSystems = { ...(actor.system?.installedSystems ?? {}) };
      const keys = Object.keys(installedSystems);
      if (keys[upgradeIndex] !== undefined) {
        delete installedSystems[keys[upgradeIndex]];
        await ActorEngine.applyMutationPlan(actor, { set: { 'system.installedSystems': installedSystems } });
      }
      return { success: true };
    }

    const item = actor.items.get(itemId);
    if (!item) throw new Error(`Item ${itemId} not found on actor`);

    const customState = this.workflow.getFullCustomizationState(item)?.customState ?? {};
    const installed = customState.installedUpgrades ?? item.system?.installedUpgrades ?? [];
    if (!installed[upgradeIndex]) throw new Error(`Upgrade at index ${upgradeIndex} not found`);

    const nextInstalled = installed.filter((_, i) => i !== upgradeIndex);

    if (item.isEmbedded && actor) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: item.id, 'system.installedUpgrades': nextInstalled }]);
    } else {
      // @mutation-exception: world-item - updating unowned item from world compendium
      await item.update({ 'system.installedUpgrades': nextInstalled });
    }

    return { success: true };
  }

  static async setLightsaberField({ actor, itemId, field, value }) {
    const item = actor?.items?.get(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);
    const update = { [field]: value };
    if (item.isEmbedded && actor) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: item.id, ...update }]);
    } else {
      // @mutation-exception: world-item - updating unowned item from world compendium
      await item.update(update);
    }
    return { success: true };
  }
}
