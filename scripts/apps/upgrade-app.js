/**
 * SWSE Item Upgrade Application (ApplicationV2)
 *
 * Contract:
 * - UI emits intent only
 * - Item mutations route through actor-owned APIs when owned
 * - Actor credits updates route through ActorEngine
 */

import { ActorEngine } from '../actors/engine/actor-engine.js';
import { GearTemplatesEngine } from './gear-templates-engine.js';
import { UpgradeRulesEngine } from './upgrade-rules-engine.js';

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
    const isPoweredArmor = this.item?.type === 'armor' && UpgradeRulesEngine.isPoweredArmor(this.item);

    const appliedTemplate = this.#getAppliedTemplate();
    const availableTemplates = this.#getAvailableTemplates();
    const availableUpgrades = await this.#getAvailableUpgrades();

    return {
      ...options,
      item: this.item,
      system,
      npc: this.npc,
      welcomeMessage: this.#getWelcomeMessage(),
      examinMsg: this.#getExamineMessage(),
      installedUpgrades,
      availableUpgrades,
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

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) {return;}

    root.querySelectorAll('.install-upgrade').forEach((el) =>
      el.addEventListener('click', this.#onInstallUpgrade.bind(this))
    );
    root.querySelectorAll('.remove-upgrade').forEach((el) =>
      el.addEventListener('click', this.#onRemoveUpgrade.bind(this))
    );
    root.querySelectorAll('.apply-template').forEach((el) =>
      el.addEventListener('click', this.#onApplyTemplate.bind(this))
    );
    root.querySelectorAll('.remove-template').forEach((el) =>
      el.addEventListener('click', this.#onRemoveTemplate.bind(this))
    );

    root.querySelector('.close-btn')?.addEventListener('click', () => this.close());
  }

  /* ------------------------------------------------------------------ */
  /* NPC CONFIGURATION                                                   */
  /* ------------------------------------------------------------------ */

  #getNPCForItemType(itemType) {
    switch (itemType) {
      case 'weapon':
        return {
          name: 'Delta',
          title: 'Weapons Specialist',
          image: 'systems/foundryvtt-swse/assets/icons/mentor.webp',
          upgradeType: 'Weapon Upgrade'
        };
      case 'armor':
        return {
          name: 'Breach',
          title: 'Armor Technician',
          image: 'systems/foundryvtt-swse/assets/icons/breach.webp',
          upgradeType: 'Armor Upgrade'
        };
      default:
        return {
          name: 'Rendarr',
          title: 'Equipment Merchant',
          image: 'systems/foundryvtt-swse/assets/icons/rendarr.webp',
          upgradeType: 'Universal Upgrade'
        };
    }
  }

  #getWelcomeMessage() {
    const name = this.npc?.name ?? 'Technician';
    const itemName = this.item?.name ?? 'that';
    return `${name}: Let's take a look at ${itemName}.`;
  }

  #getExamineMessage() {
    const type = this.item?.type ?? 'item';
    return `Examining ${type} upgrade slots and compatible parts...`;
  }

  /* ------------------------------------------------------------------ */
  /* UPGRADE DISCOVERY                                                   */
  /* ------------------------------------------------------------------ */

  async #getAvailableUpgrades() {
    const upgrades = [];

    const world = game.items.filter((i) => i.system?.isUpgrade === true);
    const pack = game.packs.get('foundryvtt-swse.equipment');
    const compendium = pack ? await pack.getDocuments() : [];

    for (const upgrade of [...world, ...compendium]) {
      if (!this.#isCompatibleUpgrade(upgrade)) {continue;}
      upgrades.push(this.#formatUpgrade(upgrade));
    }

    return upgrades;
  }

  #isCompatibleUpgrade(upgrade) {
    const category = upgrade.system?.upgradeType;
    return category === this.npc.upgradeType;
  }

  #formatUpgrade(upgrade) {
    const cost = Number(upgrade.system.cost ?? 0);
    return {
      id: upgrade.id,
      name: upgrade.name,
      cost,
      calculatedCost: cost,
      slotsRequired: Number(upgrade.system.upgradeSlots ?? 1),
      availability: upgrade.system.availability ?? 'Standard',
      description: upgrade.system.description ?? '',
      notes: null
    };
  }

  async #findUpgrade(id) {
    const world = game.items.get(id);
    if (world) {return world;}

    const pack = game.packs.get('foundryvtt-swse.equipment');
    return pack ? await pack.getDocument(id) : null;
  }

  /* ------------------------------------------------------------------ */
  /* INSTALL / REMOVE UPGRADES                                           */
  /* ------------------------------------------------------------------ */

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
    const credits = Number(actor.system.credits ?? 0);
    const tokens = Number(actor.system.modificationTokens ?? 0);

    // Build atomic update: deduct credits and tokens (if tokens exist)
    const updateData = { 'system.credits': credits - cost };
    if (actor.system.modificationTokens !== undefined) {
      updateData['system.modificationTokens'] = Math.max(0, tokens - 1);
    }

    await ActorEngine.updateActor(actor, updateData, { diff: true });

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

    if (actor.updateOwnedItem && this.item.isEmbedded) {await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled });} else {await this.item.update({ 'system.installedUpgrades': nextInstalled });}

    ui.notifications.info('Upgrade installed successfully.');
    this.render({ force: true });
  }

  async #onRemoveUpgrade(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    const index = Number(event.currentTarget?.dataset?.upgradeIndex ?? event.currentTarget?.dataset?.index);
    const installed = this.item.system.installedUpgrades ?? [];

    if (!Number.isInteger(index) || !installed[index]) {return;}

    const confirmed = await SWSEDialogV2.confirm({
      title: 'Remove Upgrade',
      content: `<p>Remove <strong>${installed[index].name}</strong>? No credits will be refunded.</p>`
    });

    if (!confirmed) {return;}

    const nextInstalled = installed.toSpliced ? installed.toSpliced(index, 1) : (() => {
      const copy = [...installed];
      copy.splice(index, 1);
      return copy;
    })();

    if (actor?.updateOwnedItem && this.item.isEmbedded) {await actor.updateOwnedItem(this.item, { 'system.installedUpgrades': nextInstalled });} else {await this.item.update({ 'system.installedUpgrades': nextInstalled });}

    ui.notifications.info('Upgrade removed.');
    this.render({ force: true });
  }

  /* ------------------------------------------------------------------ */
  /* GEAR TEMPLATES                                                      */
  /* ------------------------------------------------------------------ */

  #getAppliedTemplate() {
    const templateKey = this.item.system.gearTemplate;
    if (!templateKey) {return null;}

    const template = GearTemplatesEngine._getTemplateByKey(templateKey);
    if (!template) {return null;}

    const cost = this.item.system.templateCost || 0;

    return {
      key: templateKey,
      name: template.name,
      manufacturer: template.manufacturer || 'N/A',
      description: template.description,
      costAdjustment: cost
    };
  }

  #getAvailableTemplates() {
    const templates = GearTemplatesEngine.getAvailableTemplates(this.item);

    return templates.map((template) => {
      const costPreview = GearTemplatesEngine.calculateTemplateCost(this.item, template);
      const validation = GearTemplatesEngine.canApplyTemplate(this.item, template.key);

      return {
        key: template.key,
        name: template.name,
        manufacturer: template.manufacturer || 'N/A',
        description: template.description,
        cost: costPreview,
        costPreview,
        restrictions: this.#formatRestrictions(template.restrictions),
        incompatible: !validation.valid,
        incompatibilityReason: validation.reason
      };
    });
  }

  #formatRestrictions(restrictions) {
    if (!restrictions || restrictions.length === 0) {return null;}

    const restrictionMap = {
      stunOrIon: 'Requires Stun or Ion setting',
      stun: 'Requires Stun setting',
      advancedMeleeOrSimpleMelee: 'Advanced Melee or Simple Melee only',
      preLegacyPowered: 'Pre-Legacy powered weapons only',
      blaster: 'Blaster weapons only',
      simpleMelee: 'Simple Melee weapons only',
      fortBonus: 'Requires Fortitude bonus',
      rangedEnergy: 'Ranged Energy weapons only',
      meleeSlashingPiercing: 'Melee Slashing/Piercing only',
      meleeNonEnergy: 'Melee non-Energy only',
      rangedStun: 'Ranged with Stun only'
    };

    return restrictions.map((r) => restrictionMap[r] || r).join(', ');
  }

  async #onApplyTemplate(event) {
    event.preventDefault();

    const templateKey = event.currentTarget?.dataset?.templateKey;
    const templateName = event.currentTarget?.dataset?.templateName;
    const templateCost = Number(event.currentTarget?.dataset?.templateCost || 0);

    const actor = this.item.actor;
    if (!actor) {
      ui.notifications.warn('Item must be owned by a character to apply templates.');
      return;
    }

    const validation = GearTemplatesEngine.canApplyTemplate(this.item, templateKey);
    if (!validation.valid) {
      ui.notifications.warn(validation.reason);
      return;
    }

    const credits = Number(actor.system.credits || 0);
    const tokens = Number(actor.system.modificationTokens ?? 0);
    if (credits < templateCost) {
      ui.notifications.warn(`Not enough credits! Need ${templateCost}, have ${credits}.`);
      return;
    }

    // Check tokens if actor has token system
    if (actor.system.modificationTokens !== undefined && tokens <= 0) {
      ui.notifications.warn('Insufficient Modification Tokens. You need at least 1 token to apply this template.');
      return;
    }

    const confirmed = await SWSEDialogV2.confirm({
      title: 'Apply Gear Template',
      content: `<p>Apply <strong>${templateName}</strong> template to <strong>${this.item.name}</strong>?</p>
                <p>Cost: <strong>${templateCost} credits</strong></p>
                <p class="warning">Templates are rare and represent unique manufacturing. This cannot be reversed without GM intervention.</p>`
    });

    if (!confirmed) {return;}

    // Build atomic update: deduct credits and tokens (if tokens exist)
    const updateData = { 'system.credits': credits - templateCost };
    if (actor.system.modificationTokens !== undefined) {
      updateData['system.modificationTokens'] = Math.max(0, tokens - 1);
    }

    await ActorEngine.updateActor(actor, updateData, { diff: true });
    await GearTemplatesEngine.applyTemplate(this.item, templateKey);
    this.render({ force: true });
  }

  async #onRemoveTemplate(event) {
    event.preventDefault();

    const confirmed = await SWSEDialogV2.confirm({
      title: 'Remove Gear Template',
      content: `<p>Remove template from <strong>${this.item.name}</strong>?</p>
                <p class="warning">No credits will be refunded. This action cannot be undone.</p>`
    });

    if (!confirmed) {return;}

    await GearTemplatesEngine.removeTemplate(this.item);
    this.render({ force: true });
  }
}
