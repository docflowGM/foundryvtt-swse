/**
 * DroidSheetV2 — Complete Droid Sheet UI
 * Displays and edits droid configuration: systems, modifications, appendages, costs
 *
 * PHASE 6B-2: All mutations route through ActorEngine
 * - No direct actor.update() calls
 * - All UI actions → descriptor → plan → single atomic update
 * - Derived recalculation handled by engine
 */

import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

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
    html.find('select[name="degree"]').on('change', async (e) => {
      const descriptor = {
        type: 'update-field',
        field: 'system.droidSystems.degree',
        value: e.currentTarget.value
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('select[name="size"]').on('change', async (e) => {
      const descriptor = {
        type: 'update-field',
        field: 'system.droidSystems.size',
        value: e.currentTarget.value
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    // Locomotion/Processor/Armor selection
    html.find('select[name="locomotion"]').on('change', async (e) => {
      const descriptor = {
        type: 'update-field',
        field: 'system.droidSystems.locomotion.id',
        value: e.currentTarget.value
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('select[name="processor"]').on('change', async (e) => {
      const descriptor = {
        type: 'update-field',
        field: 'system.droidSystems.processor.id',
        value: e.currentTarget.value
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('select[name="armor"]').on('change', async (e) => {
      const descriptor = {
        type: 'update-field',
        field: 'system.droidSystems.armor.id',
        value: e.currentTarget.value
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    // Credit inputs
    html.find('input[name="credits-total"]').on('change', async (e) => {
      const total = Math.max(0, Number(e.currentTarget.value) || 0);
      const descriptor = {
        type: 'update-field',
        field: 'system.droidSystems.credits.total',
        value: total
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('input[name="credits-spent"]').on('change', async (e) => {
      const spent = Math.max(0, Number(e.currentTarget.value) || 0);
      const descriptor = {
        type: 'update-field',
        field: 'system.droidSystems.credits.spent',
        value: spent
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    // Modification toggle
    html.find('[data-action="toggle-mod"]').on('click', async (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const descriptor = {
        type: 'toggle-mod',
        modIndex: idx,
        enabled: !(this.actor.system.droidSystems?.mods?.[idx]?.enabled !== false)
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    // Remove modification
    html.find('[data-action="remove-mod"]').on('click', async (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const descriptor = {
        type: 'remove-mod',
        modIndex: idx
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    // Remove appendage/sensor/weapon/accessory
    html.find('[data-action="remove-appendage"]').on('click', async (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const descriptor = {
        type: 'remove-appendage',
        appendageIndex: idx
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('[data-action="remove-sensor"]').on('click', async (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const descriptor = {
        type: 'remove-sensor',
        sensorIndex: idx
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('[data-action="remove-weapon"]').on('click', async (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const descriptor = {
        type: 'remove-weapon',
        weaponIndex: idx
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('[data-action="remove-accessory"]').on('click', async (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const descriptor = {
        type: 'remove-accessory',
        accessoryIndex: idx
      };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    // Add buttons
    html.find('[data-action="add-mod"]').on('click', async () => {
      const descriptor = { type: 'add-mod' };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('[data-action="add-appendage"]').on('click', async () => {
      const descriptor = { type: 'add-appendage' };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('[data-action="add-sensor"]').on('click', async () => {
      const descriptor = { type: 'add-sensor' };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('[data-action="add-weapon"]').on('click', async () => {
      const descriptor = { type: 'add-weapon' };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    html.find('[data-action="add-accessory"]').on('click', async () => {
      const descriptor = { type: 'add-accessory' };
      const plan = DroidEngine.buildConfigurationPlan(this.actor, descriptor);
      await ActorEngine.updateActor(plan.actor, plan.updateData);
    });

    // PHASE 4 STEP 3: Entry point for live droid modifications
    html.find('[data-action="open-modifications"]').on('click', async () => {
      const { DroidModificationApp } = await import('../../apps/droid-modification-app.js');
      new DroidModificationApp(this.actor).render(true);
    });
  }
}
