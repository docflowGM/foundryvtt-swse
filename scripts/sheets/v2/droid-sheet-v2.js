/**
 * DroidSheetV2 — Complete Droid Sheet UI
 * Displays and edits droid configuration: systems, modifications, appendages, costs
 */

import { DroidValidationEngine } from '../../engine/droid-validation-engine.js';
import { DroidModValidator } from '../../engine/droid-mod-validator.js';

export class DroidSheetV2 extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'droid-sheet-v2'],
      template: 'modules/foundryvtt-swse/templates/sheets/droid-sheet-v2.hbs',
      width: 800,
      height: 1000,
      tabs: [
        { navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'systems' }
      ]
    });
  }

  async getData() {
    const data = await super.getData();
    const ds = this.actor.system.droidSystems || {};

    // Validation
    const validation = DroidValidationEngine.validateDroidConfiguration(ds);
    const modValidation = DroidModValidator.validateDroidModifications(ds);

    // Get all systems data
    const { DROID_SYSTEMS } = await import('../../data/droid-systems.js');
    const locomotionOptions = DROID_SYSTEMS.locomotion || [];
    const processorOptions = DROID_SYSTEMS.processor || [];
    const armorOptions = DROID_SYSTEMS.armor || [];

    // Hardpoint info
    const { DROID_HARDPOINT_ALLOCATION } = await import('../../data/droid-modifications.js');
    const degree = ds.degree || 'Third-Degree';
    const size = ds.size || 'medium';
    const maxHardpoints = DROID_HARDPOINT_ALLOCATION[degree]?.[size] || 3;
    const usedHardpoints = (ds.mods || [])
      .filter(m => m.enabled !== false)
      .reduce((sum, m) => sum + (m.hardpointsRequired || 1), 0);

    // Credits
    const credits = ds.credits || {};
    const creditPercent = credits.total > 0 ? Math.round((credits.spent / credits.total) * 100) : 0;

    return foundry.utils.mergeObject(data, {
      droidSystems: ds,
      validation,
      modValidation,
      locomotionOptions: locomotionOptions.map(l => ({ id: l.id, name: l.name })),
      processorOptions: processorOptions.map(p => ({ id: p.id, name: p.name })),
      armorOptions: armorOptions.map(a => ({ id: a.id, name: a.name })),
      currentLocomtion: ds.locomotion,
      currentProcessor: ds.processor,
      currentArmor: ds.armor,
      hardpoints: {
        used: usedHardpoints,
        max: maxHardpoints,
        remaining: maxHardpoints - usedHardpoints,
        available: usedHardpoints < maxHardpoints
      },
      credits: {
        ...credits,
        remaining: credits.total - (credits.spent || 0),
        percent: creditPercent
      },
      modifications: (ds.mods || []).map((m, idx) => ({
        index: idx,
        id: m.id,
        name: m.name,
        hardpoints: m.hardpointsRequired || 1,
        cost: m.costInCredits || 0,
        enabled: m.enabled !== false
      })),
      appendages: (ds.appendages || []).map((a, idx) => ({
        index: idx,
        id: a.id,
        name: a.name
      })),
      sensors: (ds.sensors || []).map((s, idx) => ({
        index: idx,
        name: s.name || s.id
      })),
      weapons: (ds.weapons || []).map((w, idx) => ({
        index: idx,
        name: w.name || w.id,
        quantity: w.quantity || 1
      })),
      accessories: (ds.accessories || []).map((a, idx) => ({
        index: idx,
        name: a.name || a.id
      })),
      degreeOptions: [
        { value: 'Third-Degree', label: 'Third-Degree' },
        { value: 'Second-Degree', label: 'Second-Degree' },
        { value: 'First-Degree', label: 'First-Degree' }
      ],
      sizeOptions: [
        { value: 'tiny', label: 'Tiny' },
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'huge', label: 'Huge' }
      ]
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Degree/Size changes
    html.find('select[name="degree"]').on('change', (e) => {
      this.actor.update({ 'system.droidSystems.degree': e.currentTarget.value });
    });

    html.find('select[name="size"]').on('change', (e) => {
      this.actor.update({ 'system.droidSystems.size': e.currentTarget.value });
    });

    // Locomotion/Processor/Armor selection
    html.find('select[name="locomotion"]').on('change', (e) => {
      const id = e.currentTarget.value;
      this.actor.update({ 'system.droidSystems.locomotion.id': id });
    });

    html.find('select[name="processor"]').on('change', (e) => {
      const id = e.currentTarget.value;
      this.actor.update({ 'system.droidSystems.processor.id': id });
    });

    html.find('select[name="armor"]').on('change', (e) => {
      const id = e.currentTarget.value;
      this.actor.update({ 'system.droidSystems.armor.id': id });
    });

    // Credit inputs
    html.find('input[name="credits-total"]').on('change', (e) => {
      const total = Math.max(0, Number(e.currentTarget.value) || 0);
      this.actor.update({ 'system.droidSystems.credits.total': total });
    });

    html.find('input[name="credits-spent"]').on('change', (e) => {
      const spent = Math.max(0, Number(e.currentTarget.value) || 0);
      this.actor.update({ 'system.droidSystems.credits.spent': spent });
    });

    // Modification toggle
    html.find('[data-action="toggle-mod"]').on('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const mods = this.actor.system.droidSystems?.mods || [];
      if (mods[idx]) {
        mods[idx].enabled = mods[idx].enabled !== false ? false : true;
        this.actor.update({ 'system.droidSystems.mods': mods });
      }
    });

    // Remove modification
    html.find('[data-action="remove-mod"]').on('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const mods = this.actor.system.droidSystems?.mods || [];
      mods.splice(idx, 1);
      this.actor.update({ 'system.droidSystems.mods': mods });
    });

    // Remove appendage/sensor/weapon/accessory
    html.find('[data-action="remove-appendage"]').on('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const appendages = this.actor.system.droidSystems?.appendages || [];
      appendages.splice(idx, 1);
      this.actor.update({ 'system.droidSystems.appendages': appendages });
    });

    html.find('[data-action="remove-sensor"]').on('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const sensors = this.actor.system.droidSystems?.sensors || [];
      sensors.splice(idx, 1);
      this.actor.update({ 'system.droidSystems.sensors': sensors });
    });

    html.find('[data-action="remove-weapon"]').on('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const weapons = this.actor.system.droidSystems?.weapons || [];
      weapons.splice(idx, 1);
      this.actor.update({ 'system.droidSystems.weapons': weapons });
    });

    html.find('[data-action="remove-accessory"]').on('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const accessories = this.actor.system.droidSystems?.accessories || [];
      accessories.splice(idx, 1);
      this.actor.update({ 'system.droidSystems.accessories': accessories });
    });

    // Add buttons
    html.find('[data-action="add-mod"]').on('click', () => this._addModDialog());
    html.find('[data-action="add-appendage"]').on('click', () => this._addAppendageDialog());
    html.find('[data-action="add-sensor"]').on('click', () => this._addSensorDialog());
    html.find('[data-action="add-weapon"]').on('click', () => this._addWeaponDialog());
    html.find('[data-action="add-accessory"]').on('click', () => this._addAccessoryDialog());
  }

  async _addModDialog() {
    const mods = this.actor.system.droidSystems?.mods || [];
    const newMod = {
      id: `mod_${Date.now()}`,
      name: 'New Modification',
      modifiers: [],
      hardpointsRequired: 1,
      costInCredits: 0,
      enabled: true
    };
    mods.push(newMod);
    await this.actor.update({ 'system.droidSystems.mods': mods });
  }

  async _addAppendageDialog() {
    const appendages = this.actor.system.droidSystems?.appendages || [];
    appendages.push({ id: `app_${Date.now()}`, name: 'New Appendage' });
    await this.actor.update({ 'system.droidSystems.appendages': appendages });
  }

  async _addSensorDialog() {
    const sensors = this.actor.system.droidSystems?.sensors || [];
    sensors.push({ id: `sensor_${Date.now()}`, name: 'New Sensor' });
    await this.actor.update({ 'system.droidSystems.sensors': sensors });
  }

  async _addWeaponDialog() {
    const weapons = this.actor.system.droidSystems?.weapons || [];
    weapons.push({ id: `weapon_${Date.now()}`, name: 'New Weapon', quantity: 1 });
    await this.actor.update({ 'system.droidSystems.weapons': weapons });
  }

  async _addAccessoryDialog() {
    const accessories = this.actor.system.droidSystems?.accessories || [];
    accessories.push({ id: `acc_${Date.now()}`, name: 'New Accessory' });
    await this.actor.update({ 'system.droidSystems.accessories': accessories });
  }
}
