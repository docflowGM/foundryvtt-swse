/**
 * Lightsaber Construction / Editing Application
 *
 * Construction mode:
 * - Available to actors who meet lightsaber construction prerequisites
 * - Supports roll or Take 10 when Take 10 would meet the Build DC
 * - Reuses LightsaberConstructionEngine and Miraj attunement flow
 *
 * Edit mode:
 * - Available for any owned lightsaber
 * - Allows crystal / accessory / blade color changes
 * - Does not require construction checks
 * - Self-built sabers can still attune here if not yet attuned
 */

import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { LightsaberConstructionEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js";
import { BLADE_COLOR_MAP, VARIES_COLOR_LIST, DEFAULT_BLADE_COLOR } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";
import { MirajAttunementApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/miraj-attunement-app.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { getActorSheetTheme, buildActorSheetThemeStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { getActorSheetMotionStyle, buildActorSheetMotionStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-motion-registry.js";

const MIRAJ_COPY = {
  construct: "The kyber hums before it sings. Select a chassis, choose a crystal, and let the Force guide your hand through the forge.",
  edit: "A lightsaber is a living promise. Tune the crystal, settle the accessories, and let the blade become truer to the one who carries it.",
  existing: "This blade was not born from your hands. You may refine its crystal and fittings, but you cannot claim attunement through another maker's labor."
};

export class LightsaberConstructionApp extends ModificationModalShell {
  constructor(actor, itemOrOptions = {}, options = {}) {
    const itemLike = itemOrOptions && typeof itemOrOptions === 'object' && ('system' in itemOrOptions || 'type' in itemOrOptions);
    const item = itemLike ? itemOrOptions : null;
    const mergedOptions = itemLike ? options : itemOrOptions || {};
    super(actor, item, mergedOptions);

    this.actor = actor;
    this.item = item;
    this.mode = mergedOptions?.mode || (item ? 'edit' : 'construct');
    this.selectedBladeColor = DEFAULT_BLADE_COLOR;
    this.selectedAccessories = [];
    this.selectedCheckMode = 'roll';
    this._catalogs = { chassis: [], crystals: [], accessories: [] };
    this.selectedChassis = null;
    this.selectedCrystal = null;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    id: "swse-lightsaber-construction",
    classes: ["swse", "lightsaber-construction", "swse-theme-holo"],
    window: {
      icon: "fas fa-lightsaber",
      title: "Lightsaber Forge",
      resizable: true
    },
    position: { width: 980, height: 760 }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/applications/lightsaber/lightsaber-construction.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    this._catalogs = await LightsaberConstructionEngine.getCatalogOptions();
    this.#hydrateSelections();

    const themeKey = getActorSheetTheme(this.actor?.getFlag?.('foundryvtt-swse', 'sheetTheme'));
    const motionStyle = getActorSheetMotionStyle(this.actor?.getFlag?.('foundryvtt-swse', 'sheetMotionStyle'));
    const themeStyleInline = buildActorSheetThemeStyle(themeKey);
    const motionStyleInline = buildActorSheetMotionStyle(motionStyle);

    const colorOptions = this.#resolveColorOptions();
    const buildPreview = this.mode === 'construct' && this.selectedChassis && this.selectedCrystal
      ? await LightsaberConstructionEngine.getBuildPreview(this.actor, this.#getConfig())
      : null;

    const editState = this.item ? LightsaberConstructionEngine.getEditState(this.item) : null;
    const canAttune = this.mode === 'edit' && !!this.item && !!editState?.selfBuilt && editState?.builtBy === this.actor.id && !editState?.attunedBy && ((this.actor.system?.forcePoints?.value ?? this.actor.system?.resources?.forcePoints?.value ?? 0) >= 1);
    const eligibility = LightsaberConstructionEngine.getEligibility(this.actor);

    return {
      ...context,
      actor: this.actor,
      item: this.item,
      mode: this.mode,
      chassis: this._catalogs.chassis,
      crystals: this._catalogs.crystals,
      accessories: this._catalogs.accessories.map(accessory => ({ ...accessory, selected: this.selectedAccessories.includes(accessory.id) })),
      selectedChassis: this.selectedChassis,
      selectedCrystal: this.selectedCrystal,
      selectedAccessories: this.selectedAccessories,
      selectedBladeColor: this.selectedBladeColor,
      selectedCheckMode: this.selectedCheckMode,
      colorOptions,
      colorMap: BLADE_COLOR_MAP,
      bladeColorHex: BLADE_COLOR_MAP[this.selectedBladeColor] || '#00ffff',
      buildPreview,
      canTake10: !!buildPreview?.canTake10,
      take10Total: buildPreview?.take10Total ?? null,
      finalDc: buildPreview?.finalDc ?? null,
      totalCost: buildPreview?.totalCost ?? 0,
      canBuild: !!(this.selectedChassis && this.selectedCrystal && buildPreview?.success && (this.selectedCheckMode !== 'take10' || buildPreview?.canTake10)),
      canAttune,
      isSelfBuilt: !!editState?.selfBuilt,
      isAttuned: !!editState?.attunedBy,
      attunedByActor: editState?.attunedBy === this.actor?.id,
      mirajText: this.mode === 'construct' ? MIRAJ_COPY.construct : (editState?.selfBuilt ? MIRAJ_COPY.edit : MIRAJ_COPY.existing),
      eligibility,
      buildBlockedReason: buildPreview && buildPreview.success === false ? buildPreview.reason : null,
      themeStyleInline,
      motionStyleInline
    };
  }

  attachEventListeners(root) {
    root.style.setProperty('--selected-blade-color', BLADE_COLOR_MAP[this.selectedBladeColor] || '#00ffff');

    root.querySelectorAll('[data-chassis-id]').forEach(el => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        if (this.mode !== 'construct') return;
        const option = this._catalogs.chassis.find(ch => ch.id === el.dataset.chassisId);
        if (!option) return;
        this.selectedChassis = option;
        this.render({ force: true });
      });
    });

    root.querySelectorAll('[data-crystal-id]').forEach(el => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        const option = this._catalogs.crystals.find(ch => ch.id === el.dataset.crystalId);
        if (!option) return;
        this.selectedCrystal = option;
        const preferred = this.#resolvePreferredColor(option);
        if (preferred) this.selectedBladeColor = preferred;
        this.render({ force: true });
      });
    });

    root.querySelectorAll('[data-accessory-id]').forEach(el => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        const id = el.dataset.accessoryId;
        if (this.selectedAccessories.includes(id)) this.selectedAccessories = this.selectedAccessories.filter(value => value !== id);
        else this.selectedAccessories = [...this.selectedAccessories, id];
        this.render({ force: true });
      });
    });

    root.querySelectorAll('[data-color]').forEach(el => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        this.selectedBladeColor = el.dataset.color;
        this.render({ force: true });
      });
    });

    root.querySelectorAll('[data-check-mode]').forEach(el => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        const mode = el.dataset.checkMode;
        if (mode === 'take10' || mode === 'roll') {
          this.selectedCheckMode = mode;
          this.render({ force: true });
        }
      });
    });

    root.querySelector('.ls-build-button')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.#submit();
    });

    root.querySelector('.ls-attune-button')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.#attuneExisting();
    });
  }

  #resolveColorOptions() {
    const crystalColor = this.selectedCrystal?.system?.lightsaber?.bladeColor;
    if (!crystalColor) return [];
    const normalized = String(crystalColor).toLowerCase();
    if (normalized === 'varies' || normalized.includes('varies')) return VARIES_COLOR_LIST;
    const options = normalized.split(/\s+or\s+|\//i).map(part => part.trim()).filter(Boolean);
    return options.length ? options : VARIES_COLOR_LIST;
  }

  #resolvePreferredColor(crystal) {
    const options = this.#resolveColorOptions();
    return options[0] || DEFAULT_BLADE_COLOR;
  }

  #hydrateSelections() {
    if (this.mode === 'edit' && this.item) {
      const editState = LightsaberConstructionEngine.getEditState(this.item);
      this.selectedChassis = this._catalogs.chassis.find(ch => ch.system?.chassisId === editState.chassisId || ch.id === editState.chassisId) || this.#fallbackChassisFromItem();
      this.selectedCrystal = this._catalogs.crystals.find(cr => cr.id === editState.crystalId) || this._catalogs.crystals[0] || null;
      this.selectedAccessories = Array.isArray(editState.accessoryIds) ? [...editState.accessoryIds] : [];
      this.selectedBladeColor = editState.bladeColor || DEFAULT_BLADE_COLOR;
      return;
    }

    if (!this.selectedChassis) {
      this.selectedChassis = this._catalogs.chassis.find(ch => ch.system?.chassisId === 'standard') || this._catalogs.chassis[0] || null;
    }
    if (!this.selectedCrystal) {
      this.selectedCrystal = this._catalogs.crystals.find(cr => /ilum/i.test(cr.name)) || this._catalogs.crystals[0] || null;
    }
    if (!Array.isArray(this.selectedAccessories)) this.selectedAccessories = [];
    if (!this.selectedBladeColor) this.selectedBladeColor = this.#resolvePreferredColor(this.selectedCrystal) || DEFAULT_BLADE_COLOR;
  }

  #fallbackChassisFromItem() {
    if (!this.item) return null;
    const chassisId = this.item.system?.chassisId;
    return this._catalogs.chassis.find(ch => ch.system?.chassisId === chassisId) || {
      id: this.item.id,
      name: this.item.name,
      system: foundry.utils.deepClone(this.item.system ?? {})
    };
  }

  #getConfig() {
    return {
      chassisItemId: this.selectedChassis?.id || this.item?.system?.chassisId,
      crystalItemId: this.selectedCrystal?.id,
      accessoryItemIds: [...this.selectedAccessories],
      bladeColor: this.selectedBladeColor,
      checkMode: this.selectedCheckMode
    };
  }

  async #submit() {
    try {
      if (this.mode === 'construct') {
        const result = await LightsaberConstructionEngine.attemptConstruction(this.actor, this.#getConfig());
        if (!result.success) {
          ui.notifications.error(`Construction failed: ${result.reason}`);
          return;
        }
        const createdWeapon = this.actor.items.get(result.itemId);
        if (!createdWeapon) throw new Error('Created weapon not found in actor items');

        const hasForcePoints = ((this.actor.system?.forcePoints?.value ?? this.actor.system?.resources?.forcePoints?.value ?? 0) >= 1);
        const isBuiltByActor = createdWeapon.flags?.swse?.builtBy === this.actor.id;
        const notYetAttuned = !createdWeapon.flags?.swse?.attunedBy;

        if (hasForcePoints && isBuiltByActor && notYetAttuned) {
          document.documentElement.style.setProperty('--selected-blade-color', BLADE_COLOR_MAP[this.selectedBladeColor] || '#00ffff');
          new MirajAttunementApp(this.actor, createdWeapon).render(true);
        } else {
          ui.notifications.info(`✨ Lightsaber constructed! DC ${result.finalDc}${this.selectedCheckMode === 'take10' ? `, Take 10 ${result.rollTotal}` : `, Roll ${result.rollTotal}`}`);
        }
        this.close();
        return;
      }

      if (!this.item) {
        ui.notifications.warn('No lightsaber selected for editing.');
        return;
      }
      const result = await LightsaberConstructionEngine.applyEdits(this.actor, this.item, this.#getConfig());
      if (!result.success) {
        ui.notifications.error(`Lightsaber update failed: ${result.reason}`);
        return;
      }
      ui.notifications.info('Lightsaber tuning applied.');
      this.close();
      this.actor?.sheet?.render?.(true);
    } catch (err) {
      SWSELogger.error('Lightsaber submit failed:', err);
      ui.notifications.error('Unexpected error during lightsaber flow.');
    }
  }

  async #attuneExisting() {
    if (!this.item) return;
    try {
      document.documentElement.style.setProperty('--selected-blade-color', BLADE_COLOR_MAP[this.selectedBladeColor] || '#00ffff');
      new MirajAttunementApp(this.actor, this.item).render(true);
      this.close();
    } catch (err) {
      SWSELogger.error('Attunement failed:', err);
      ui.notifications.error('Unexpected error during attunement.');
    }
  }
}
