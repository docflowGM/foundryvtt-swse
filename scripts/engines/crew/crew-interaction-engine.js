/**
 * CrewInteractionEngine — Phase H
 * Gunner skill linking, pilot integration, crew modifiers
 */

import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

export class CrewInteractionEngine {
  /**
   * Link gunner to vehicle weapon
   */
  static async linkGunnerToWeapon(vehicle, gunner, weaponSlot) {
    const crew = vehicle.system.crew || {};
    crew.gunners = crew.gunners || {};
    crew.gunners[weaponSlot] = {
      gunnerID: gunner.id,
      gunnerName: gunner.name,
      linkedAt: Date.now()
    };

    await ActorEngine.updateActor(vehicle, { 'system.crew': crew });
    return { success: true, gunner: gunner.name, weapon: weaponSlot };
  }

  /**
   * Get gunner's relevant skill for weapon
   */
  static getGunnerWeaponSkill(gunner, weaponType) {
    const skills = gunner.system.skills || {};
    const weaponSkillMap = {
      'blaster': 'rangedAttack',
      'missile': 'rangedAttack',
      'cannon': 'rangedAttack',
      'turret': 'rangedAttack'
    };
    const skillKey = weaponSkillMap[weaponType] || 'rangedAttack';
    return skills[skillKey]?.total || 0;
  }

  /**
   * Apply crew role modifiers (pilot, copilot, engineer bonuses)
   */
  static async applyCrewModifier(actor, role, value) {
    const crew = actor.system.crew || {};
    crew.roles = crew.roles || {};
    crew.roles[role] = { assigned: true, modifier: value };

    // Add as custom modifier
    const customMods = Array.isArray(actor.system.customModifiers)
      ? [...actor.system.customModifiers]
      : [];

    customMods.push({
      id: `crew_${role}_${Date.now()}`,
      source: 'custom',
      sourceName: `Crew: ${role}`,
      target: `skill.pilot`, // Pilot skill generally affected
      type: 'untyped',
      value: value,
      enabled: true
    });

    await ActorEngine.updateActor(actor, {
      'system.crew': crew,
      'system.customModifiers': customMods
    });

    return { success: true, role, modifier: value };
  }

  /**
   * Calculate vehicle weapon attack (uses gunner skill)
   */
  static calculateVehicleWeaponAttack(vehicle, gunner, weaponType) {
    const gunnerSkill = this.getGunnerWeaponSkill(gunner, weaponType);
    const vehicleBonus = vehicle.system.weaponBonus || 0;
    const total = gunnerSkill + vehicleBonus;

    return {
      gunnerSkill,
      vehicleBonus,
      total,
      diceRoll: `d20+${total}`
    };
  }

  /**
   * Get crew complement modifiers
   */
  static getCrewModifiers(vehicle) {
    const mods = [];
    const crew = vehicle.system.crew || {};
    const crewCount = crew.assigned || 0;

    // Efficiency: +1 to vehicle rolls per crew member (max +3)
    if (crewCount > 0) {
      mods.push({
        id: 'crew_efficiency',
        source: 'custom',
        sourceName: `Crew (${crewCount})`,
        target: 'vehicle.attack',
        type: 'untyped',
        value: Math.min(3, crewCount),
        enabled: true
      });
    }

    return mods;
  }
}
