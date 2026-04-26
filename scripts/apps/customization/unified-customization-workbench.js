import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { CustomizationWorkflow } from "/systems/foundryvtt-swse/scripts/engine/customization/customization-workflow.js";
import { UPGRADE_CATALOG, getUpgradeDefinition } from "/systems/foundryvtt-swse/scripts/engine/customization/upgrade-catalog.js";
import { TEMPLATE_CATALOG, getTemplateDefinition } from "/systems/foundryvtt-swse/scripts/engine/customization/template-engine.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

const CATEGORY_DEFS = {
  weapons: { id: "weapons", label: "Weapons", icon: "fas fa-sword", color: "accent-blue" },
  armor: { id: "armor", label: "Armor", icon: "fas fa-shield-alt", color: "accent-cyan" },
  gear: { id: "gear", label: "Gear", icon: "fas fa-toolbox", color: "accent-green" }
};

const STRIP_AREA_LABELS = {
  damage: "Strip Damage",
  range: "Strip Range",
  design: "Strip Design",
  stun_setting: "Strip Stun Setting",
  autofire: "Strip Autofire",
  defensive_material: "Strip Defensive Material",
  joint_protection: "Strip Joint Protection"
};

export class UnifiedCustomizationWorkbench extends ModificationModalShell {
  constructor(actor, item, options = {}) {
    super(actor, item, options);

    this.workflow = new CustomizationWorkflow();
    this.eligibleCategories = this._buildEligibleCategories();
    this.activeCategory = options.activeCategory || this._categorizeItem(item) || this.eligibleCategories[0]?.id || "weapons";
    this.selectedItemIdByCategory = new Map();
    this.searchQueryByCategory = new Map();

    for (const category of this.eligibleCategories) {
      const categoryItems = this._getItemsForCategory(category.id);
      const initialItem = categoryItems.find((entry) => entry.id === item?.id) || categoryItems[0] || null;
      if (initialItem) this.selectedItemIdByCategory.set(category.id, initialItem.id);
    }

    if (item?.id && this._categorizeItem(item)) {
      this.selectedItemIdByCategory.set(this._categorizeItem(item), item.id);
    }
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    id: "swse-unified-customization-workbench",
    classes: ["swse", "unified-customization-workbench", "swse-theme-holo"],
    window: {
      icon: "fas fa-tools",
      title: "Customization Workbench",
      resizable: true
    },
    position: { width: 1180, height: 820 }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/apps/unified-customization-workbench.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const selectedItem = this._getSelectedItem();
    const selectedState = selectedItem ? this.workflow.getFullCustomizationState(selectedItem) : null;
    const inventoryItems = this._buildInventoryEntries(this.activeCategory);
    const summary = selectedItem ? this.workflow.getSummaryView(selectedItem) : null;
    const mentor = this._buildMentorContext(selectedItem, selectedState);

    return {
      ...context,
      eligibleCategories: this.eligibleCategories.map((category) => ({
        ...category,
        active: category.id === this.activeCategory
      })),
      hasMultipleCategories: this.eligibleCategories.length > 1,
      activeCategory: this.activeCategory,
      activeCategoryLabel: CATEGORY_DEFS[this.activeCategory]?.label || this.activeCategory,
      activeCategoryCount: inventoryItems.length,
      searchQuery: this.searchQueryByCategory.get(this.activeCategory) || "",
      inventoryItems,
      selectedItem,
      selectedItemSummary: summary,
      selectedItemState: selectedState,
      selectedItemMeta: selectedItem ? this._buildSelectedItemMeta(selectedItem, selectedState) : null,
      mentor,
      structuralActions: selectedItem ? this._buildStructuralActions(selectedItem) : [],
      installedUpgrades: selectedItem ? this._buildInstalledUpgradeEntries(selectedItem) : [],
      availableUpgrades: selectedItem ? this._buildAvailableUpgradeEntries(selectedItem) : [],
      appliedTemplates: selectedItem ? this._buildAppliedTemplateEntries(selectedItem) : [],
      availableTemplates: selectedItem ? this._buildAvailableTemplateEntries(selectedItem) : [],
      footer: selectedItem ? this._buildFooterContext(selectedItem, selectedState) : this._buildEmptyFooter(),
      noSelectionMessage: selectedItem ? null : "No eligible customizable item is selected for this category.",
      isCorruptState: Boolean(selectedState?.slots?.isCorruptState)
    };
  }

  attachEventListeners(root) {
    super.attachEventListeners(root);

    root.querySelectorAll("[data-category]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const category = button.dataset.category;
        if (!CATEGORY_DEFS[category]) return;
        this.activeCategory = category;
        if (!this.selectedItemIdByCategory.get(category)) {
          const first = this._getItemsForCategory(category)[0];
          if (first) this.selectedItemIdByCategory.set(category, first.id);
        }
        this.render({ force: true });
      });
    });

    root.querySelectorAll("[data-item-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;
        this.selectedItemIdByCategory.set(this.activeCategory, itemId);
        this.item = this.actor.items.get(itemId) || this.item;
        this.render({ force: true });
      });
    });

    root.querySelector('[data-action="search-items"]')?.addEventListener("input", (event) => {
      this.searchQueryByCategory.set(this.activeCategory, event.currentTarget.value || "");
      const first = this._getItemsForCategory(this.activeCategory)[0] || null;
      if (first) this.selectedItemIdByCategory.set(this.activeCategory, first.id);
      this.render({ force: true });
    });

    root.querySelector('[data-action="clear-search"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      this.searchQueryByCategory.set(this.activeCategory, "");
      const first = this._getItemsForCategory(this.activeCategory)[0] || null;
      if (first) this.selectedItemIdByCategory.set(this.activeCategory, first.id);
      this.render({ force: true });
    });

    root.querySelectorAll('[data-action="install-upgrade"]').forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const upgradeKey = button.dataset.upgradeKey;
        if (upgradeKey) await this._handleInstallUpgrade(upgradeKey);
      });
    });

    root.querySelectorAll('[data-action="remove-upgrade"]').forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const instanceId = button.dataset.instanceId;
        if (instanceId) await this._handleRemoveUpgrade(instanceId);
      });
    });

    root.querySelectorAll('[data-action="strip-area"]').forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const areaKey = button.dataset.areaKey;
        if (areaKey) await this._handleStripArea(areaKey);
      });
    });

    root.querySelector('[data-action="size-increase"]')?.addEventListener("click", async (event) => {
      event.preventDefault();
      await this._handleSizeIncrease();
    });

    root.querySelectorAll('[data-action="apply-template"]').forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const templateKey = button.dataset.templateKey;
        if (templateKey) await this._handleApplyTemplate(templateKey);
      });
    });

    root.querySelector('[data-action="refresh-workbench"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      this.render({ force: true });
    });

    root.querySelector('[data-action="close-workbench"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      this.close();
    });
  }

  get title() {
    const selectedItem = this._getSelectedItem();
    return selectedItem ? `Customization Workbench — ${selectedItem.name}` : "Customization Workbench";
  }

  _categorizeItem(item) {
    if (!item) return null;
    if (item.type === "blaster") return "weapons";
    if (item.type === "weapon" && item.system?.weaponType !== "lightsaber") return "weapons";
    if (item.type === "armor" || item.type === "bodysuit") return "armor";
    if (item.type === "equipment" || item.type === "gear") return "gear";
    return null;
  }

  _buildEligibleCategories() {
    const entries = [];
    for (const category of Object.values(CATEGORY_DEFS)) {
      const count = this._getItemsForCategory(category.id).length;
      if (count > 0) entries.push({ ...category, count });
    }
    return entries;
  }

  _getItemsForCategory(category) {
    const items = Array.from(this.actor?.items ?? []).filter((item) => this._categorizeItem(item) === category);
    const query = (this.searchQueryByCategory.get(category) || "").trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const haystack = [
        item.name,
        item.type,
        item.system?.weaponSubtype,
        item.system?.weightClass,
        item.system?.restriction
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  _getSelectedItem() {
    const selectedId = this.selectedItemIdByCategory.get(this.activeCategory);
    const categoryItems = this._getItemsForCategory(this.activeCategory);
    const selectedItem = categoryItems.find((entry) => entry.id === selectedId) || categoryItems[0] || null;
    if (selectedItem) {
      this.selectedItemIdByCategory.set(this.activeCategory, selectedItem.id);
      this.item = selectedItem;
    }
    return selectedItem;
  }

  _buildInventoryEntries(category) {
    return this._getItemsForCategory(category).map((item) => {
      const summary = this.workflow.getSummaryView(item);
      return {
        id: item.id,
        name: item.name,
        img: item.img || "icons/svg/item-bag.svg",
        subtitle: this._buildInventorySubtitle(item, summary),
        active: item.id === this.selectedItemIdByCategory.get(category),
        customized: Boolean(summary?.customized),
        slotsText: `${summary?.slots?.free ?? 0}/${summary?.slots?.total ?? 0} slots`,
        restriction: summary?.restriction?.effective || "common"
      };
    });
  }

  _buildInventorySubtitle(item, summary) {
    const bits = [];
    if (item.type === "blaster") bits.push("blaster");
    if (item.type === "weapon") bits.push(item.system?.weaponSubtype || "weapon");
    if (item.type === "armor" || item.type === "bodysuit") bits.push(item.system?.weightClass || "armor");
    if (item.type === "equipment" || item.type === "gear") bits.push(item.type);
    if (summary?.summary?.upgrades) bits.push(`${summary.summary.upgrades} upgrade${summary.summary.upgrades === 1 ? "" : "s"}`);
    if (summary?.summary?.templates) bits.push(`${summary.summary.templates} template${summary.summary.templates === 1 ? "" : "s"}`);
    return bits.filter(Boolean).join(" · ");
  }

  _buildMentorContext(item, fullState) {
    const categoryDef = CATEGORY_DEFS[this.activeCategory] || { label: this.activeCategory };
    const slots = fullState?.slots || {};
    const defaultLine = item
      ? `${item.name} is on the bench. Watch your slot budget, mind your credits, and do not burn a strip operation just to chase a shiny upgrade.`
      : `No eligible ${categoryDef.label.toLowerCase()} selected. Pull something onto the slab and the workbench will start talking sense.`;

    let line = defaultLine;
    if (item?.type === "blaster") {
      line = `${item.name} is a blaster frame. Balance range, power, and legal heat. If you strip ${fullState?.strippable?.includes("autofire") ? "autofire" : "the wrong subsystem"}, you will gain room — and lose capability.`;
    } else if (item?.type === "weapon") {
      line = `${item.name} is a melee platform. Structural changes buy slots by giving something up. Damage and design strips are permanent choices, so make them like a quartermaster, not a gambler.`;
    } else if (item?.type === "armor" || item?.type === "bodysuit") {
      line = `${item.name} is armor. Powered rigs start with more slot headroom, but every extra system changes what the shell is for. Joint protection and defensive material are expensive to give away.`;
    } else if (item && (item.type === "equipment" || item.type === "gear")) {
      line = `${item.name} is utility gear. Templates and upgrades can push it into rarer or more restricted territory fast, so watch the legality readout before you commit credits.`;
    }

    return {
      name: this.activeCategory === "weapons" ? "RYNN-K7 · QUARTERMASTER" : "WORKBENCH ADVISOR",
      role: this.activeCategory === "weapons" ? "MENTOR" : "SYSTEM",
      channel: `${categoryDef.label.toUpperCase()} · secure relay`,
      line,
      slotSummary: `${slots.freeSlots ?? 0}/${slots.totalAvailable ?? 0} free slots`
    };
  }

  _buildItemStatStrip(item, fullState) {
    const summary = this.workflow.getSummaryView(item);
    const restriction = fullState?.restriction || { effectiveRestriction: "common", isRare: false };
    const installed = item.flags?.["foundryvtt-swse"]?.customization?.installedUpgrades?.length || 0;
    return [
      { label: "Base Cost", value: this._formatCredits(summary?.cost?.base ?? 0) },
      { label: "Effective", value: this._formatCredits(summary?.cost?.effective ?? 0) },
      { label: "Slots", value: `${fullState?.slots?.freeSlots ?? 0}/${fullState?.slots?.totalAvailable ?? 0}` },
      { label: "Installed", value: String(installed) },
      { label: "Restriction", value: restriction.effectiveRestriction },
      { label: "Rarity", value: restriction.isRare ? "rare" : "standard" }
    ].slice(0, 4);
  }

  _buildSelectedItemMeta(item, fullState) {
    const summary = this.workflow.getSummaryView(item);
    const restriction = fullState?.restriction || { effectiveRestriction: "common", isRare: false };
    return {
      img: item.img || "icons/svg/item-bag.svg",
      name: item.name,
      categoryLabel: this.activeCategory,
      subtitle: this._buildInventorySubtitle(item, summary),
      baseCost: this._formatCredits(summary?.cost?.base ?? 0),
      effectiveValue: this._formatCredits(summary?.cost?.effective ?? 0),
      restriction: restriction.effectiveRestriction,
      rare: restriction.isRare,
      slotsText: `${fullState?.slots?.freeSlots ?? 0} / ${fullState?.slots?.totalAvailable ?? 0}`,
      upgradesCount: summary?.summary?.upgrades ?? 0,
      templatesCount: summary?.summary?.templates ?? 0,
      stats: this._buildItemStatStrip(item, fullState)
    };
  }

  _buildStructuralActions(item) {
    const profile = this.workflow.profileResolver.getNormalizedProfile(item);
    const actions = [];

    const sizePreview = this.workflow.previewSizeIncrease(item, this.actor);
    actions.push({
      type: "size",
      isSizeAction: true,
      key: "size_increase",
      label: "Increase Size",
      description: profile.category === "armor"
        ? "Increase armor weight class one step to gain +1 upgrade slot."
        : "Increase item size one step to gain +1 upgrade slot.",
      allowed: sizePreview.success,
      blockedReason: sizePreview.reason || null,
      costText: sizePreview.success ? this._formatCredits(sizePreview.preview.operationCost) : null,
      dcText: sizePreview.success ? `DC ${sizePreview.preview.mechanics.dc}` : null,
      timeText: sizePreview.success ? this._formatHours(sizePreview.preview.mechanics.timeHours) : null
    });

    const stripAreas = this.workflow.slotEngine.getStrippableAreas(item);
    for (const areaKey of stripAreas) {
      const preview = this.workflow.previewStrip(item, this.actor, areaKey);
      actions.push({
        type: "strip",
        isSizeAction: false,
        key: areaKey,
        label: STRIP_AREA_LABELS[areaKey] || this._startCase(areaKey.replace(/_/g, " ")),
        description: preview.success ? preview.preview.downgrade : preview.reason,
        allowed: preview.success,
        blockedReason: preview.reason || null,
        costText: preview.success ? this._formatCredits(preview.preview.operationCost) : null,
        dcText: preview.success ? `DC ${preview.preview.mechanics.dc}` : null,
        timeText: preview.success ? this._formatHours(preview.preview.mechanics.timeHours) : null
      });
    }

    return actions;
  }

  _buildInstalledUpgradeEntries(item) {
    const customState = item.flags?.["foundryvtt-swse"]?.customization || {};
    const installed = customState.installedUpgrades || [];
    return installed.map((instance) => {
      const definition = getUpgradeDefinition(instance.upgradeKey) || {};
      const preview = this.workflow.previewRemove(item, this.actor, instance.instanceId);
      return {
        instanceId: instance.instanceId,
        name: definition.name || instance.upgradeKey,
        slotText: `${instance.slotCost ?? 0} slot${(instance.slotCost ?? 0) === 1 ? "" : "s"}`,
        description: definition.description || "",
        slotCost: instance.slotCost ?? 0,
        installedAt: instance.installedAt ? new Date(instance.installedAt).toLocaleString() : "Unknown",
        operationCost: this._formatCredits(instance.operationCost ?? 0),
        removalCost: preview.success ? this._formatCredits(preview.preview.removalCost) : null,
        removalDc: preview.success ? `DC ${preview.preview.mechanics.dc}` : null,
        removalTime: preview.success ? this._formatHours(preview.preview.mechanics.timeHours) : null,
        canRemove: preview.success,
        removeReason: preview.reason || null
      };
    });
  }

  _buildAvailableUpgradeEntries(item) {
    const report = this.workflow.getUpgradeEligibilityReport(item);
    const actorCredits = this.actor?.system?.credits ?? 0;
    return (report.upgrades || []).map((entry) => {
      const definition = getUpgradeDefinition(entry.key) || {};
      const preview = this.workflow.previewInstall(item, this.actor, entry.key);
      const canAfford = preview.success ? preview.preview.actor.canAfford : actorCredits >= (definition.baseCost ?? 0);
      return {
        key: entry.key,
        slotText: `${entry.slotCost ?? 0} slot${(entry.slotCost ?? 0) === 1 ? "" : "s"}`,
        name: entry.name,
        description: definition.description || "",
        slotCost: entry.slotCost ?? 0,
        cost: this._formatCredits(definition.cost ?? 0),
        restriction: definition.restriction || "common",
        affectedAreas: (entry.affectedAreas || []).join(", "),
        eligible: entry.eligible,
        canAfford,
        actionable: entry.eligible && canAfford,
        reason: entry.reason || (canAfford ? null : "Insufficient credits"),
        dcText: preview.success ? `DC ${preview.preview.mechanics.dc}` : null,
        timeText: preview.success ? this._formatHours(preview.preview.mechanics.timeHours) : null
      };
    });
  }

  _buildAppliedTemplateEntries(item) {
    const customState = item.flags?.["foundryvtt-swse"]?.customization || {};
    return (customState.appliedTemplates || []).map((instance) => {
      const definition = getTemplateDefinition(instance.templateKey) || {};
      return {
        instanceId: instance.instanceId,
        name: definition.name || instance.templateKey,
        description: definition.description || "",
        source: definition.source || instance.source || "unknown",
        restriction: definition.restriction || "common",
        rare: Boolean(definition.rarity),
        stackOrder: instance.stackOrder ?? 0
      };
    });
  }

  _buildAvailableTemplateEntries(item) {
    return Object.values(TEMPLATE_CATALOG).map((templateDef) => {
      const eligibility = this.workflow.canApplyTemplate(item, templateDef.key);
      const preview = this.workflow.previewTemplate(item, templateDef.key);
      return {
        key: templateDef.key,
        name: templateDef.name,
        description: templateDef.description,
        source: templateDef.source,
        restriction: templateDef.restriction,
        rare: Boolean(templateDef.rarity),
        eligible: eligibility.eligible,
        actionable: eligibility.eligible,
        reason: eligibility.reason || null,
        costImpact: preview.success ? this._formatSignedCredits(preview.preview.cost.costImpact) : null
      };
    });
  }

  _buildFooterContext(item, selectedState) {
    const restriction = selectedState?.restriction || { effectiveRestriction: "common", isRare: false };
    const walletValue = Number(this.actor?.system?.credits ?? 0);
    const effectiveValueNumber = Number(this.workflow.costEngine.getTotalEffectiveItemValue(item) || 0);
    const slotsUsed = Number(selectedState?.slots?.usedSlots ?? 0);
    const slotsTotal = Number(selectedState?.slots?.totalAvailable ?? 0);
    const slotPct = slotsTotal > 0 ? Math.min(100, Math.round((slotsUsed / slotsTotal) * 100)) : 0;
    return {
      wallet: this._formatCredits(walletValue),
      walletValue,
      effectiveValue: this._formatCredits(effectiveValueNumber),
      effectiveValueValue: effectiveValueNumber,
      afterValue: this._formatCredits(walletValue - effectiveValueNumber),
      restriction: restriction.effectiveRestriction,
      rare: restriction.isRare,
      slotsText: `${selectedState?.slots?.freeSlots ?? 0} free / ${slotsTotal} total`,
      slotsUsed,
      slotsTotal,
      slotPct,
      overflow: Boolean(selectedState?.slots?.isOverflowing),
      customized: Boolean(this.workflow.getSummaryView(item)?.customized)
    };
  }

  _buildEmptyFooter() {
    const walletValue = Number(this.actor?.system?.credits ?? 0);
    return {
      wallet: this._formatCredits(walletValue),
      walletValue,
      effectiveValue: this._formatCredits(0),
      effectiveValueValue: 0,
      afterValue: this._formatCredits(walletValue),
      restriction: "common",
      rare: false,
      slotsText: "0 free / 0 total",
      slotsUsed: 0,
      slotsTotal: 0,
      slotPct: 0,
      overflow: false,
      customized: false
    };
  }

  async _handleInstallUpgrade(upgradeKey) {
    const item = this._getSelectedItem();
    if (!item) return;

    const preview = this.workflow.previewInstall(item, this.actor, upgradeKey);
    if (!preview.success) {
      ui.notifications.warn(preview.reason || "Upgrade cannot be installed.");
      return;
    }

    const mechanicsTotal = await this._promptMechanicsCheck({
      title: `Install ${preview.preview.upgrade.name}`,
      summary: [
        `Cost: ${this._formatCredits(preview.preview.upgrade.installCost)}`,
        `Slots: ${preview.preview.upgrade.slotCost}`,
        `After Slots: ${preview.preview.slots.freeAfter}`,
        `Difficulty: DC ${preview.preview.mechanics.dc}`,
        `Time: ${this._formatHours(preview.preview.mechanics.timeHours)}`
      ]
    });
    if (mechanicsTotal === null) return;

    const result = await this.workflow.applyInstall(item, this.actor, upgradeKey, { total: mechanicsTotal });
    await this._handleOperationResult(result, `${preview.preview.upgrade.name} installed.`);
  }

  async _handleRemoveUpgrade(instanceId) {
    const item = this._getSelectedItem();
    if (!item) return;

    const preview = this.workflow.previewRemove(item, this.actor, instanceId);
    if (!preview.success) {
      ui.notifications.warn(preview.reason || "Upgrade cannot be removed.");
      return;
    }

    const mechanicsTotal = await this._promptMechanicsCheck({
      title: `Remove ${preview.preview.upgrade.name}`,
      summary: [
        `Removal Cost: ${this._formatCredits(preview.preview.removalCost)}`,
        `Refund / Recovery: ${this._formatCredits(preview.preview.removalCost)}`,
        `Difficulty: DC ${preview.preview.mechanics.dc}`,
        `Time: ${this._formatHours(preview.preview.mechanics.timeHours)}`
      ]
    });
    if (mechanicsTotal === null) return;

    const result = await this.workflow.applyRemove(item, this.actor, instanceId, { total: mechanicsTotal });
    await this._handleOperationResult(result, `${preview.preview.upgrade.name} removed.`);
  }

  async _handleStripArea(areaKey) {
    const item = this._getSelectedItem();
    if (!item) return;

    const preview = this.workflow.previewStrip(item, this.actor, areaKey);
    if (!preview.success) {
      ui.notifications.warn(preview.reason || "Area cannot be stripped.");
      return;
    }

    const mechanicsTotal = await this._promptMechanicsCheck({
      title: `${STRIP_AREA_LABELS[areaKey] || this._startCase(areaKey)}`,
      summary: [
        `Downgrade: ${preview.preview.downgrade}`,
        `Cost: ${this._formatCredits(preview.preview.operationCost)}`,
        `Difficulty: DC ${preview.preview.mechanics.dc}`,
        `Time: ${this._formatHours(preview.preview.mechanics.timeHours)}`,
        `Result: +1 upgrade slot`
      ]
    });
    if (mechanicsTotal === null) return;

    const result = await this.workflow.applyStrip(item, this.actor, areaKey, { total: mechanicsTotal });
    await this._handleOperationResult(result, `${STRIP_AREA_LABELS[areaKey] || this._startCase(areaKey)} complete.`);
  }

  async _handleSizeIncrease() {
    const item = this._getSelectedItem();
    if (!item) return;

    const preview = this.workflow.previewSizeIncrease(item, this.actor);
    if (!preview.success) {
      ui.notifications.warn(preview.reason || "Size increase is not allowed.");
      return;
    }

    const mechanicsTotal = await this._promptMechanicsCheck({
      title: "Increase Item Size",
      summary: [
        `Operation Cost: ${this._formatCredits(preview.preview.operationCost)}`,
        `Resulting Item Value: ${this._formatCredits(preview.preview.resultingItemValue)}`,
        `Difficulty: DC ${preview.preview.mechanics.dc}`,
        `Time: ${this._formatHours(preview.preview.mechanics.timeHours)}`,
        `Result: +1 upgrade slot`
      ]
    });
    if (mechanicsTotal === null) return;

    const result = await this.workflow.applySizeIncrease(item, this.actor, { total: mechanicsTotal });
    await this._handleOperationResult(result, "Size increase applied.");
  }

  async _handleApplyTemplate(templateKey) {
    const item = this._getSelectedItem();
    if (!item) return;

    const preview = this.workflow.previewTemplate(item, templateKey);
    if (!preview.success) {
      ui.notifications.warn(preview.reason || "Template cannot be applied.");
      return;
    }

    const confirmed = await SWSEDialogV2.confirm({
      title: `Apply ${preview.preview.template.name}`,
      content: `
        <div class="swse-workbench-dialog">
          <p>${preview.preview.template.description}</p>
          <ul>
            <li>Cost Impact: ${this._formatSignedCredits(preview.preview.cost.costImpact)}</li>
            <li>Restriction: ${preview.preview.legality.currentRestriction} → ${preview.preview.legality.newRestriction}</li>
            <li>Rare: ${preview.preview.rarity ? "Yes" : "No"}</li>
          </ul>
        </div>
      `,
      defaultYes: true
    });
    if (!confirmed) return;

    const result = await this.workflow.applyTemplate(item, templateKey, this.actor);
    await this._handleOperationResult(result, `${preview.preview.template.name} applied.`);
  }

  async _promptMechanicsCheck({ title, summary = [] }) {
    const defaultTotal = Number(this.actor?.system?.skills?.mechanics?.total ?? 0);
    return SWSEDialogV2.prompt({
      title,
      content: `
        <div class="swse-workbench-dialog">
          <ul class="swse-workbench-dialog__summary">
            ${summary.map((line) => `<li>${line}</li>`).join("")}
          </ul>
          <div class="swse-workbench-dialog__field">
            <label for="workbench-mechanics-total">Mechanics Total</label>
            <input id="workbench-mechanics-total" name="mechanicsTotal" type="number" value="${defaultTotal}" />
          </div>
        </div>
      `,
      label: "Confirm",
      callback: (html) => {
        const input = html.find('[name="mechanicsTotal"]')?.[0];
        if (!input) return null;
        const total = Number(input.value);
        return Number.isFinite(total) ? total : null;
      }
    });
  }

  async _handleOperationResult(result, successMessage) {
    if (!result?.success) {
      if (result?.failureData) {
        ui.notifications.warn(result.reason || "Operation failed.");
      } else {
        ui.notifications.error(result?.reason || "Operation failed.");
      }
      return;
    }

    ui.notifications.info(successMessage);
    this.render({ force: true });

    for (const app of Object.values(this.actor?.apps || {})) {
      try {
        app.render?.(false);
      } catch (err) {
        SWSELogger.warn("Failed to refresh actor app after customization", err);
      }
    }

    try {
      this.item?.sheet?.render?.(false);
    } catch (err) {
      SWSELogger.warn("Failed to refresh item sheet after customization", err);
    }
  }

  _formatCredits(value) {
    const safe = Number(value) || 0;
    return `${safe.toLocaleString()} cr`;
  }

  _formatSignedCredits(value) {
    const safe = Number(value) || 0;
    const prefix = safe > 0 ? "+" : "";
    return `${prefix}${safe.toLocaleString()} cr`;
  }

  _formatHours(value) {
    const safe = Number(value) || 0;
    return `${safe} hour${safe === 1 ? "" : "s"}`;
  }

  _startCase(value) {
    return String(value || "")
      .split(" ")
      .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
      .join(" ");
  }
}

export default UnifiedCustomizationWorkbench;
