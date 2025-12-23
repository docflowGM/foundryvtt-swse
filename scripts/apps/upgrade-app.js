/**
 * SWSE Item Upgrade Application (Foundry v13+)
 * Handles weapon, armor, and equipment upgrades via Item mutation only.
 * Mechanical effects are resolved in actor-data-model derived data.
 */

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
    const totalSlots = Number(system.upgradeSlots ?? 1);
    const usedSlots = installedUpgrades.reduce(
      (sum, u) => sum + Number(u.slotsUsed ?? 1), 0
    );

    return {
      item: this.item,
      system,
      npc: this.npc,
      installedUpgrades,
      availableUpgrades: await this._getAvailableUpgrades(),
      totalSlots,
      usedSlots,
      availableSlots: Math.max(0, totalSlots - usedSlots)
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

    html.find("[data-install-upgrade]").on("click", this._onInstallUpgrade.bind(this));
    html.find("[data-remove-upgrade]").on("click", this._onRemoveUpgrade.bind(this));
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

    const cost = Number(upgrade.system.cost ?? 0);
    const slots = Number(upgrade.system.upgradeSlots ?? 1);
    const credits = Number(actor.system.credits ?? 0);

    if (credits < cost) {
      ui.notifications.warn("Not enough credits.");
      return;
    }

    const installed = this.item.system.installedUpgrades ?? [];
    const usedSlots = installed.reduce((s, u) => s + (u.slotsUsed ?? 1), 0);
    const maxSlots = Number(this.item.system.upgradeSlots ?? 1);

    if (usedSlots + slots > maxSlots) {
      ui.notifications.warn("Not enough upgrade slots.");
      return;
    }

    await actor.update(
      { "system.credits": credits - cost },
      { diff: true }
    );

    await this.item.update({
      "system.installedUpgrades": [
        ...installed,
        {
          id: upgrade.id,
          name: upgrade.name,
          slotsUsed: slots,
          cost
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
  /* UTIL                                                               */
  /* ------------------------------------------------------------------ */

  async _findUpgrade(id) {
    const world = game.items.get(id);
    if (world) return world;

    const pack = game.packs.get("foundryvtt-swse.equipment");
    return pack ? await pack.getDocument(id) : null;
  }
}