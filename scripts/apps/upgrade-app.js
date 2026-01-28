/**
 * SWSE Item Upgrade Application (Foundry v13+)
 * Handles weapon, armor, and equipment upgrades via Item mutation only.
 * Mechanical effects are resolved in actor-data-model derived data.
 * Implements complete SWSE upgrade slot rules.
 */

import { UpgradeRulesEngine } from "./upgrade-rules-engine.js";
import { GearTemplatesEngine } from "./gear-templates-engine.js";

export class SWSEUpgradeApp extends FormApplication {

  constructor(object, options = {}) {
    super(object, options);
    this.item = object;
    this.itemType = object.type;
    this.npc = this._getNPCForItemType(this.itemType);
  }

  /* ------------------------------------------------------------------ */
  /* NPC CONFIGURATION                                                   */
  /* ------------------------------------------------------------------ */

  _getNPCForItemType(itemType) {
    switch (itemType) {
      case "weapon":
        return {
          name: "Delta",
          title: "Weapons Specialist",
          image: "systems/foundryvtt-swse/assets/icons/mentor.webp",
          upgradeType: "Weapon Upgrade"
        };
      case "armor":
        return {
          name: "Breach",
          title: "Armor Technician",
          image: "systems/foundryvtt-swse/assets/icons/breach.webp",
          upgradeType: "Armor Upgrade"
        };
      default:
        return {
          name: "Rendarr",
          title: "Equipment Merchant",
          image: "systems/foundryvtt-swse/assets/icons/rendarr.webp",
          upgradeType: "Universal Upgrade"
        };
    }
  }

  /* ------------------------------------------------------------------ */
  /* DEFAULT OPTIONS                                                     */
  /* ------------------------------------------------------------------ */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-upgrade-app",
      template: "systems/foundryvtt-swse/templates/apps/upgrade/upgrade-app.hbs",
      width: 700,
      height: 600,
      resizable: true,
      closeOnSubmit: false,
      classes: ["swse", "swse-upgrade-app"]
    });
  }

  /* ------------------------------------------------------------------ */
  /* DATA                                                               */
  /* ------------------------------------------------------------------ */

  async getData() {
    const system = this.item.system;

    const installedUpgrades = system.installedUpgrades ?? [];

    // Use rules engine to calculate proper slot count
    const totalSlots = UpgradeRulesEngine.getBaseUpgradeSlots(this.item);
    const usedSlots = installedUpgrades.reduce(
      (sum, u) => sum + Number(u.slotsUsed ?? 1), 0
    );
    const isPoweredArmor = this.item.type === "armor" && UpgradeRulesEngine.isPoweredArmor(this.item);

    // Gear Templates
    const appliedTemplate = this._getAppliedTemplate();
    const availableTemplates = this._getAvailableTemplates();

    return {
      item: this.item,
      system,
      npc: this.npc,
      installedUpgrades,
      availableUpgrades: await this._getAvailableUpgrades(),
      totalSlots,
      usedSlots,
      availableSlots: Math.max(0, totalSlots - usedSlots),
      isPoweredArmor,
      strippedFeatures: system.strippedFeatures ?? {},
      restriction: UpgradeRulesEngine.getEffectiveRestriction(this.item),
      appliedTemplate,
      availableTemplates
    };
  }

  /* ------------------------------------------------------------------ */
  /* UPGRADE DISCOVERY                                                   */
  /* ------------------------------------------------------------------ */

  async _getAvailableUpgrades() {
    const upgrades = [];

    // World items
    const world = game.items.filter(i => i.system?.isUpgrade === true);

    // Compendium items
    const pack = game.packs.get("foundryvtt-swse.equipment");
    const compendium = pack ? await pack.getDocuments() : [];

    for (const upgrade of [...world, ...compendium]) {
      if (!this._isCompatibleUpgrade(upgrade)) continue;
      upgrades.push(this._formatUpgrade(upgrade));
    }

    return upgrades;
  }

  _isCompatibleUpgrade(upgrade) {
    const category = upgrade.system?.upgradeType;
    return category === this.npc.upgradeType;
  }

  _formatUpgrade(upgrade) {
    return {
      id: upgrade.id,
      name: upgrade.name,
      cost: Number(upgrade.system.cost ?? 0),
      slotsRequired: Number(upgrade.system.upgradeSlots ?? 1),
      availability: upgrade.system.availability ?? "Standard",
      description: upgrade.system.description ?? ""
    };
  }

  /* ------------------------------------------------------------------ */
  /* LISTENERS                                                          */
  /* ------------------------------------------------------------------ */

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".install-upgrade").on("click", this._onInstallUpgrade.bind(this));
    html.find(".remove-upgrade").on("click", this._onRemoveUpgrade.bind(this));
    html.find(".apply-template").on("click", this._onApplyTemplate.bind(this));
    html.find(".remove-template").on("click", this._onRemoveTemplate.bind(this));
    html.find(".close-btn").on("click", () => this.close());
  }

  /* ------------------------------------------------------------------ */
  /* INSTALL UPGRADE                                                     */
  /* ------------------------------------------------------------------ */

  async _onInstallUpgrade(event) {
    event.preventDefault();

    const { upgradeId } = event.currentTarget.dataset;
    const actor = this.item.actor;

    if (!actor) {
      ui.notifications.error("Item must be owned to install upgrades.");
      return;
    }

    const upgrade = await this._findUpgrade(upgradeId);
    if (!upgrade) {
      ui.notifications.error("Upgrade not found.");
      return;
    }

    // Validate using rules engine
    const validation = UpgradeRulesEngine.validateUpgradeInstallation(this.item, upgrade, actor);
    if (!validation.valid) {
      ui.notifications.warn(validation.reason);
      return;
    }

    const cost = validation.cost;
    const slots = validation.slotsNeeded;
    const credits = Number(actor.system.credits ?? 0);

    const newCredits = credits - cost;

    await actor.update(
      { "system.credits": newCredits },
      { diff: true }
    );

    const installed = this.item.system.installedUpgrades ?? [];
    await this.item.update({
      "system.installedUpgrades": [
        ...installed,
        {
          id: upgrade.id,
          name: upgrade.name,
          slotsUsed: slots,
          cost,
          restriction: upgrade.system.restriction ?? "common"
        }
      ]
    });

    ui.notifications.info("Upgrade installed successfully.");
    this.render(false);
  }

  /* ------------------------------------------------------------------ */
  /* REMOVE UPGRADE                                                      */
  /* ------------------------------------------------------------------ */

  async _onRemoveUpgrade(event) {
    event.preventDefault();

    const index = Number(event.currentTarget.dataset.index);
    const installed = this.item.system.installedUpgrades ?? [];

    if (!Number.isInteger(index) || !installed[index]) return;

    const confirmed = await Dialog.confirm({
      title: "Remove Upgrade",
      content: `<p>Remove <strong>${installed[index].name}</strong>? No credits will be refunded.</p>`
    });

    if (!confirmed) return;

    installed.splice(index, 1);
    await this.item.update({ "system.installedUpgrades": installed });

    ui.notifications.info("Upgrade removed.");
    this.render(false);
  }

  /* ------------------------------------------------------------------ */
  /* GEAR TEMPLATES                                                      */
  /* ------------------------------------------------------------------ */

  _getAppliedTemplate() {
    const templateKey = this.item.system.gearTemplate;
    if (!templateKey) return null;

    const template = GearTemplatesEngine._getTemplateByKey(templateKey);
    if (!template) return null;

    const cost = this.item.system.templateCost || 0;

    return {
      key: templateKey,
      name: template.name,
      manufacturer: template.manufacturer || 'N/A',
      description: template.description,
      costAdjustment: cost
    };
  }

  _getAvailableTemplates() {
    const templates = GearTemplatesEngine.getAvailableTemplates(this.item);

    return templates.map(template => {
      const costPreview = GearTemplatesEngine.calculateTemplateCost(this.item, template);
      const validation = GearTemplatesEngine.canApplyTemplate(this.item, template.key);

      return {
        key: template.key,
        name: template.name,
        manufacturer: template.manufacturer || 'N/A',
        description: template.description,
        cost: costPreview,
        costPreview,
        restrictions: this._formatRestrictions(template.restrictions),
        incompatible: !validation.valid,
        incompatibilityReason: validation.reason
      };
    });
  }

  _formatRestrictions(restrictions) {
    // Ensure restrictions is an array
    if (!restrictions) return null;

    const restrictionArray = Array.isArray(restrictions)
      ? restrictions
      : (typeof restrictions === 'string' ? [restrictions] : []);

    if (restrictionArray.length === 0) return null;

    const restrictionMap = {
      'stunOrIon': 'Requires Stun or Ion setting',
      'stun': 'Requires Stun setting',
      'advancedMeleeOrSimpleMelee': 'Advanced Melee or Simple Melee only',
      'preLegacyPowered': 'Pre-Legacy powered weapons only',
      'blaster': 'Blaster weapons only',
      'simpleMelee': 'Simple Melee weapons only',
      'fortBonus': 'Requires Fortitude bonus',
      'rangedEnergy': 'Ranged Energy weapons only',
      'meleeSlashingPiercing': 'Melee Slashing/Piercing only',
      'meleeNonEnergy': 'Melee non-Energy only',
      'rangedStun': 'Ranged with Stun only'
    };

    return restrictionArray.map(r => restrictionMap[r] || r).join(', ');
  }

  async _onApplyTemplate(event) {
    event.preventDefault();

    const templateKey = event.currentTarget.dataset.templateKey;
    const templateName = event.currentTarget.dataset.templateName;
    const templateCost = Number(event.currentTarget.dataset.templateCost || 0);

    const actor = this.item.actor;

    // Check if item is owned
    if (!actor) {
      ui.notifications.warn("Item must be owned by a character to apply templates.");
      return;
    }

    // Validate template application
    const validation = GearTemplatesEngine.canApplyTemplate(this.item, templateKey);
    if (!validation.valid) {
      ui.notifications.warn(validation.reason);
      return;
    }

    // Check if actor has enough credits
    const credits = Number(actor.system.credits || 0);
    if (credits < templateCost) {
      ui.notifications.warn(`Not enough credits! Need ${templateCost}, have ${credits}.`);
      return;
    }

    // Confirm application
    const confirmed = await Dialog.confirm({
      title: "Apply Gear Template",
      content: `<p>Apply <strong>${templateName}</strong> template to <strong>${this.item.name}</strong>?</p>
                <p>Cost: <strong>${templateCost} credits</strong></p>
                <p class="warning">Templates are rare and represent unique manufacturing. This cannot be reversed without GM intervention.</p>`
    });

    if (!confirmed) return;

    // Deduct credits
    await actor.update({ "system.credits": credits - templateCost });

    // Apply template
    await GearTemplatesEngine.applyTemplate(this.item, templateKey);

    this.render(false);
  }

  async _onRemoveTemplate(event) {
    event.preventDefault();

    const confirmed = await Dialog.confirm({
      title: "Remove Gear Template",
      content: `<p>Remove template from <strong>${this.item.name}</strong>?</p>
                <p class="warning">No credits will be refunded. This action cannot be undone.</p>`
    });

    if (!confirmed) return;

    await GearTemplatesEngine.removeTemplate(this.item);
    this.render(false);
  }

  /* ------------------------------------------------------------------ */
  /* UTIL                                                               */
  /* ------------------------------------------------------------------ */

  async _findUpgrade(id) {
    const world = game.items.get(id);
    if (world) return world;

    const pack = game.packs.get("foundryvtt-swse.equipment");
    return pack ? await pack.getDocument(id) : null;
  }
}