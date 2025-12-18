/**
 * Unified Hit Resolution Engine
 * AUTO-GENERATED
 */

export class SWSEHit {
  static resolve({
    attacker,
    target,
    roll,
    attackBonus,
    defenseType = "reflex"
  }) {

    const defense = target.system.defenses[defenseType]?.value ?? 10;
    const total = roll.total + attackBonus;

    return {
      hit: total >= defense,
      total,
      defense,
      margin: total - defense
    };
  }
}
