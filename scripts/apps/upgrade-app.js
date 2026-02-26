/**
 * SWSE Item Upgrade Application (ApplicationV2)
 *
 * Contract:
 * - UI emits intent only
 * - Item mutations route through actor-owned APIs when owned
 * - Actor credits updates route through ActorEngine
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { GearTemplatesEngine } from "/systems/foundryvtt-swse/scripts/apps/gear-templates-engine.js";
import { UpgradeRulesEngine } from "/systems/foundryvtt-swse/scripts/apps/upgrade-rules-engine.js";
import { mergeMutationPlans } from "/systems/foundryvtt-swse/scripts/governance/mutation/merge-mutations.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SWSEUpgradeApp extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(item, options = {}) {
    super(options);
    this.item = item;
    this.itemType = item?.type;
    this.npc = this.#getNPCForItemType(this.itemType);
  }

  static DEFAULT_OPTIONS = {
    id: 'swse-upgrade-app',
    classes: ['swse', 'swse-app', 'swse-upgrade-app', 'swse-theme-holo'],
    position: { width: 700, height: 600 },
    window: { resizable: true }
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/upgrade/upgrade-app.hbs'
    }
  };

  async _prepareContext(options) {
    const system = this.item?.system ?? {};
    const installedUpgrades = system.installedUpgrades ?? [];

    const totalSlots = UpgradeRulesEngine.getBaseUpgradeSlots(this.item);
    const usedSlots = installedUpgrades.reduce((sum, u) => sum + Number(u.slotsUsed ?? 1), 0);

    return {
      ...options,
      item: this.item,
      system,
      npc: this.npc,
      installedUpgrades,
      totalSlots,
      usedSlots,
      availableSlots: Math.max(0, totalSlots - usedSlots),
      appliedTemplate: this.#getAppliedTemplate(),
      availableTemplates: this.#getAvailableTemplates(),
      availableUpgrades: await this.#getAvailableUpgrades()
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    root.querySelectorAll('.install-upgrade')
      .forEach(el => el.addEventListener('click', this.#onInstallUpgrade.bind(this)));

    root.querySelectorAll('.remove-upgrade')
      .forEach(el => el.addEventListener('click', this.#onRemoveUpgrade.bind(this)));

    root.querySelectorAll('.apply-template')
      .forEach(el => el.addEventListener('click', this.#onApplyTemplate.bind(this)));

    root.querySelectorAll('.remove-template')
      .forEach(el => el.addEventListener('click', this.#onRemoveTemplate.bind(this)));
  }

  /* ---------------------------------------------- */
  /* INSTALL UPGRADE                               */
  /* ---------------------------------------------- */

  async #onInstallUpgrade(event) {
    event.preventDefault();

    const upgradeId = event.currentTarget?.dataset?.upgradeId;
    const actor = this.item?.actor;
    if (!actor) {
      ui.notifications.error('Item must be owned to install upgrades.');
      return;
    }

    const upgrade = await this.#findUpgrade(upgradeId);
    if (!upgrade) {
      ui.notifications.error('Upgrade not found.');
      return;
    }

    const validation = UpgradeRulesEngine.validateUpgradeInstallation(this.item, upgrade, actor);
    if (!validation.valid) {
      ui.notifications.warn(validation.reason);
      return;
    }

    const cost = validation.cost;
    const slots = validation.slotsNeeded;
    const tokens = Number(actor.system.modificationTokens ?? 0);

    const fundValidation = LedgerService.validateFunds(actor, cost);
    if (!fundValidation.ok) {
      ui.notifications.error(`Insufficient credits: ${fundValidation.reason}`);
      return;
    }

    try {
      const creditPlan = LedgerService.buildCreditDelta(actor, cost);

      let finalPlan = creditPlan;
      if (actor.system.modificationTokens !== undefined) {
        const tokenPlan = {
          set: {
            'system.modificationTokens': Math.max(0, tokens - 1)
          }
        };
        finalPlan = mergeMutationPlans(creditPlan, tokenPlan);
      }

      const installed = this.item.system.installedUpgrades ?? [];
      const nextInstalled = [
        ...installed,
        {
          id: upgrade.id,
          name: upgrade.name,
          slotsUsed: slots,
          cost,
          restriction: upgrade.system.restriction ?? 'common',
          description: upgrade.system.description ?? ''
        }
      ];

      await ActorEngine.applyMutationPlan(actor, finalPlan);

      if (actor?.updateOwnedItem && this.item.isEmbedded) {
        await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled });
      } else {
        await this.item.update({ 'system.installedUpgrades': nextInstalled });
      }

      ui.notifications.info('Upgrade installed successfully.');
      this.render({ force: true });

    } catch (err) {
      ui.notifications.error(`Upgrade installation failed: ${err.message}`);
      console.error(err);
    }
  }

  /* ---------------------------------------------- */
  /* REMOVE UPGRADE                                */
  /* ---------------------------------------------- */

  async #onRemoveUpgrade(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    const index = Number(event.currentTarget?.dataset?.upgradeIndex ?? event.currentTarget?.dataset?.index);
    const installed = this.item.system.installedUpgrades ?? [];

    if (!Number.isInteger(index) || !installed[index]) return;

    const nextInstalled = installed.toSpliced
      ? installed.toSpliced(index, 1)
      : installed.filter((_, i) => i !== index);

    if (actor?.updateOwnedItem && this.item.isEmbedded) {
      await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled });
    } else {
      await this.item.update({ 'system.installedUpgrades': nextInstalled });
    }

    ui.notifications.info('Upgrade removed.');
    this.render({ force: true });
  }

  /* ---------------------------------------------- */
  /* APPLY TEMPLATE                                */
  /* ---------------------------------------------- */

  async #onApplyTemplate(event) {
    event.preventDefault();

    const templateKey = event.currentTarget?.dataset?.templateKey;
    const templateName = event.currentTarget?.dataset?.templateName;
    const templateCost = GearTemplatesEngine.getTemplateCost(templateKey);

    const actor = this.item.actor;
    if (!actor) {
      ui.notifications.warn('Item must be owned by a character.');
      return;
    }

    const validation = GearTemplatesEngine.canApplyTemplate(this.item, templateKey);
    if (!validation.valid) {
      ui.notifications.warn(validation.reason);
      return;
    }

    const tokens = Number(actor.system.modificationTokens ?? 0);

    const fundValidation = LedgerService.validateFunds(actor, templateCost);
    if (!fundValidation.ok) {
      ui.notifications.error(`Insufficient credits: ${fundValidation.reason}`);
      return;
    }

    if (actor.system.modificationTokens !== undefined && tokens <= 0) {
      ui.notifications.warn('Insufficient Modification Tokens.');
      return;
    }

    try {
      const creditPlan = LedgerService.buildCreditDelta(actor, templateCost);

      let finalPlan = creditPlan;
      if (actor.system.modificationTokens !== undefined) {
        const tokenPlan = {
          set: {
            'system.modificationTokens': Math.max(0, tokens - 1)
          }
        };
        finalPlan = mergeMutationPlans(creditPlan, tokenPlan);
      }

      await ActorEngine.applyMutationPlan(actor, finalPlan, { diff: true });

      await GearTemplatesEngine.applyTemplate(this.item, templateKey);

      ui.notifications.info(`${templateName} template applied.`);
      this.render({ force: true });

    } catch (err) {
      ui.notifications.error(`Template application failed: ${err.message}`);
    }
  }

  async #onRemoveTemplate(event) {
    event.preventDefault();
    await GearTemplatesEngine.removeTemplate(this.item);
    this.render({ force: true });
  }

  /* ---------------------------------------------- */
  /* HELPERS                                        */
  /* ---------------------------------------------- */

  async #getAvailableUpgrades() {
    return [];
  }

  async #findUpgrade(id) {
    const world = game.items.get(id);
    if (world) return world;
    const pack = game.packs.get('foundryvtt-swse.equipment');
    return pack ? await pack.getDocument(id) : null;
  }

  #getNPCForItemType(type) {
    return { name: 'Technician', upgradeType: 'Universal Upgrade' };
  }

  #getAppliedTemplate() { return null; }
  #getAvailableTemplates() { return []; }

}