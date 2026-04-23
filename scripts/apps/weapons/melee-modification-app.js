/**
 * MELEE WEAPON MODIFICATION APPLICATION
 *
 * Customization for non-lightsaber melee weapons with:
 * - Upgrade selection (multi-select)
 * - Accent color customization
 * - Cost preview
 * - Complete modification pipeline integration
 * - SLOT ENFORCEMENT via UpgradeRulesEngine
 *
 * CRITICAL: Routes ALL mutations through ModificationIntentBuilder
 * NO direct item.update() calls
 *
 * Extends ModificationModalShell for unified layout and lifecycle management
 */

import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { ModificationIntentBuilder } from "/systems/foundryvtt-swse/scripts/engine/crafting/modification-intent-builder.js";
import { UpgradeRulesEngine } from "/systems/foundryvtt-swse/scripts/apps/upgrade-rules-engine.js";
import { MELEE_UPGRADES, DEFAULT_MELEE_ACCENT } from "/systems/foundryvtt-swse/scripts/data/melee-upgrades.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class MeleeWeaponModificationApp extends ModificationModalShell {
  constructor(actor, item, options = {}) {
    super(actor, item, options);
    this.actor = actor;
    this.item = item;
    // Start with currently installed upgrades (not multi-select anymore, just showing)
    this.installedUpgrades = item.flags?.swse?.meleeUpgrades || [];
    this.accentColor = item.flags?.swse?.accentColor || DEFAULT_MELEE_ACCENT;

    // NEW: Track what user wants to add (single selection per interaction)
    this.selectedUpgradeToAdd = null;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    id: "swse-melee-modification",
    classes: ["swse", "melee-modification", "swse-theme-holo"],
    window: {
      icon: "fas fa-sword",
      title: "Weapon Customization",
      resizable: true
    },
    position: { width: 900, height: 650 }
  });

  // Use base shell template for 2-panel layout
  // (PARTS inherited from ModificationModalShell)

  /**
   * Override: Handle modification selection
   * Updates selectedUpgradeToAdd and re-renders detail panel
   */
  async selectModification(categoryId, modificationId) {
    this.selectedUpgradeToAdd = modificationId;

    // Re-render to update detail panel and footer
    await this.render({ force: true });
  }

  /**
   * Override: Return header with weapon name
   */
  getHeaderContent() {
    return {
      title: `⚔️ ${this.item.name} Modifications`,
      subtitle: "Select enhancement"
    };
  }

  /**
   * Override: Return { list, detail } for 2-panel layout
   * List: Categories of upgrades
   * Detail: Details of selected upgrade
   */
  getMainContent() {
    const listHTML = this.#renderUpgradeList();
    const detailHTML = this.#renderUpgradeDetail();

    return {
      list: listHTML,
      detail: detailHTML
    };
  }

  /**
   * Override: Return standardized footer contract
   */
  getFooterContent() {
    const totalCost = this.selectedUpgradeToAdd
      ? (MELEE_UPGRADES[this.selectedUpgradeToAdd]?.costCredits || 0)
      : 0;
    const wallet = this.actor?.system?.credits || 0;

    return {
      totalCost,
      wallet,
      canConfirm: this.selectedUpgradeToAdd !== null
    };
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Store upgrade data for template rendering
    context.allUpgrades = Object.entries(MELEE_UPGRADES).map(([id, upgrade]) => ({
      id,
      ...upgrade
    }));
    context.accentColor = this.accentColor;
    context.installedUpgrades = this.installedUpgrades;

    return context;
  }

  /**
   * Render left panel: List of upgrades
   * @private
   */
  #renderUpgradeList() {
    const entries = Object.entries(MELEE_UPGRADES);
    if (entries.length === 0) {
      return `<div class="upgrade-list-empty">No upgrades available</div>`;
    }

    let html = `<div class="upgrade-list">`;

    for (const [id, upgrade] of entries) {
      const isInstalled = this.installedUpgrades.includes(id);
      const isSelected = id === this.selectedUpgradeToAdd;

      html += `
        <div class="upgrade-list-item ${isInstalled ? 'installed' : ''} ${isSelected ? 'active' : ''}"
             data-upgrade-id="${id}">
          <div class="upgrade-list-item-name">${upgrade.name}</div>
          <div class="upgrade-list-item-cost">${upgrade.costCredits}cr</div>
          ${isInstalled ? `<span class="upgrade-list-item-badge">Installed</span>` : ''}
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Render right panel: Details of selected upgrade
   * @private
   */
  #renderUpgradeDetail() {
    if (!this.selectedUpgradeToAdd) {
      return `<div class="upgrade-detail-empty">
        <p>Select an upgrade to view details</p>
      </div>`;
    }

    const upgrade = MELEE_UPGRADES[this.selectedUpgradeToAdd];
    if (!upgrade) {
      return `<div class="upgrade-detail-empty"><p>Upgrade not found</p></div>`;
    }

    const isInstalled = this.installedUpgrades.includes(this.selectedUpgradeToAdd);

    return `
      <div class="upgrade-detail">
        <div class="upgrade-detail-name">${upgrade.name}</div>
        <div class="upgrade-detail-cost">Cost: ${upgrade.costCredits} credits</div>

        ${upgrade.description ? `
          <div class="upgrade-detail-section">
            <h4>Description</h4>
            <p>${upgrade.description}</p>
          </div>
        ` : ''}

        ${upgrade.effect ? `
          <div class="upgrade-detail-section">
            <h4>Effect</h4>
            <p>${upgrade.effect}</p>
          </div>
        ` : ''}

        ${isInstalled ? `
          <div class="upgrade-detail-status installed">✓ Already installed</div>
        ` : ''}
      </div>
    `;
  }

  attachEventListeners(root) {
    // Upgrade list selection
    root.querySelectorAll(".upgrade-list-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const upgradeId = item.dataset.upgradeId;
        this.selectModification(null, upgradeId);
      });
    });

    // Confirm button
    const confirmBtn = root.querySelector('[data-action="confirm"]');
    confirmBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#applyModifications();
    });

    // Cancel button
    const cancelBtn = root.querySelector('[data-action="cancel"]');
    cancelBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.close();
    });
  }

  async #applyModifications() {
    // Validate selection
    if (!this.selectedUpgradeToAdd) {
      ui.notifications.warn("Please select an upgrade to add.");
      return;
    }

    // Validate not already installed
    if (this.installedUpgrades.includes(this.selectedUpgradeToAdd)) {
      ui.notifications.warn("This upgrade is already installed.");
      return;
    }

    // VALIDATION 1: Check slots before proceeding
    const totalSlots = this.item.system?.upgradeSlots || 2;
    const currentUpgrades = this.item.system?.installedUpgrades || [];
    const currentSlotUsage = currentUpgrades.reduce((sum, u) => sum + (u.slotsUsed || 1), 0);
    const newSlotUsage = 1; // Single upgrade being added
    const totalSlotUsage = currentSlotUsage + newSlotUsage;

    if (totalSlotUsage > totalSlots) {
      ui.notifications.warn(
        `Adding this upgrade exceeds available slots. Need ${totalSlotUsage}, have ${totalSlots} available.`
      );
      return;
    }

    // VALIDATION 2: Check credits
    const upgradeToAdd = MELEE_UPGRADES[this.selectedUpgradeToAdd];
    const totalCost = upgradeToAdd?.costCredits || 0;
    const actorCredits = this.actor.system?.credits || 0;

    if (actorCredits < totalCost) {
      ui.notifications.warn(`Insufficient credits. Need ${totalCost}, have ${actorCredits}`);
      return;
    }

    try {
      // Add to installed list
      const newInstalledList = [...this.installedUpgrades, this.selectedUpgradeToAdd];

      // Build intent via builder
      const intent = ModificationIntentBuilder.buildGenericIntent(
        this.actor,
        this.item,
        [
          { path: "flags.swse.meleeUpgrades", value: newInstalledList },
          { path: "flags.swse.accentColor", value: this.accentColor }
        ],
        { type: "credits", amount: totalCost }
      );

      // Add slot validation metadata to intent
      intent.validation = {
        slots: {
          available: totalSlots,
          needed: newSlotUsage,
          currentUsage: currentSlotUsage,
          totalUsage: totalSlotUsage,
          valid: totalSlotUsage <= totalSlots
        },
        credits: {
          available: actorCredits,
          needed: totalCost,
          valid: actorCredits >= totalCost
        }
      };

      // Execute with cost validation
      const result = await ModificationIntentBuilder.executeIntentWithCost(
        this.actor,
        this.item,
        intent,
        totalCost
      );

      if (!result.success) {
        ui.notifications.warn(`Modification failed: ${result.reason}`);
        return;
      }

      ui.notifications.info("⚔️ Weapon customized!");
      this.close();
    } catch (err) {
      SWSELogger.error("Weapon modification failed:", err);
      ui.notifications.error("Unexpected error during modification.");
    }
  }

}
