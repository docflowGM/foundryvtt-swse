import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { DualWieldCombatShapeResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/dual-wield-combat-shape-resolver.js";
import { CombinedFullAttackPlanner } from "/systems/foundryvtt-swse/scripts/engine/combat/combined-full-attack-planner.js";

let registered = false;

export function registerDualWieldRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalCollectAttackModifiers = CombatOptionResolver.collectAttackModifiers.bind(CombatOptionResolver);
  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, options = {}) {
    const result = originalCollectAttackModifiers(actor, weapon, options);
    return DualWieldCombatShapeResolver.annotateModifierResult(result, actor, weapon, options);
  };

  globalThis.SWSE ??= {};
  globalThis.SWSE.DualWieldCombatShapeResolver = DualWieldCombatShapeResolver;
  globalThis.SWSE.CombinedFullAttackPlanner = CombinedFullAttackPlanner;
  if (globalThis.game?.swse) {
    globalThis.game.swse.DualWieldCombatShapeResolver = DualWieldCombatShapeResolver;
    globalThis.game.swse.CombinedFullAttackPlanner = CombinedFullAttackPlanner;
  }
}

export default registerDualWieldRuntimePatches;
