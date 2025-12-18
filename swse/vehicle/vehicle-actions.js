/**
 * Vehicle Action Economy Schema
 * AUTO-GENERATED
 */

export class SWSEVehicleActions {
  static base = {
    pilot: true,
    gunner: true,
    engineer: true,
    shields: true,
    command: true
  };

  static reset(actor) {
    return actor.update({ "system.vehicle.actions": foundry.utils.deepClone(this.base) });
  }

  static consume(actor, role) {
    const path = `system.vehicle.actions.${role}`;
    if (!actor.system.vehicle?.actions?.[role]) return false;

    return actor.update({ [path]: false });
  }

  static has(actor, role) {
    return !!actor.system.vehicle?.actions?.[role];
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.VehicleActions = SWSEVehicleActions;
});
