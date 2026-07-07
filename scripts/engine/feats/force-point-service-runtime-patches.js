import { ForcePointsService } from "/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js";
import { ForcePointFeatRules } from "/systems/foundryvtt-swse/scripts/engine/feats/force-point-feat-rules.js";

let registered = false;

function bonusForcePointTotal(actor) {
  const pool = actor?.getFlag?.('swse', 'bonusForcePoints') ?? actor?.flags?.swse?.bonusForcePoints ?? {};
  if (Array.isArray(pool.entries)) {
    return pool.entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.value ?? 0) || 0), 0);
  }
  return Math.max(0, Number(pool.value ?? 0) || 0);
}

export function registerForcePointServiceRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalGetRemaining = ForcePointsService.getRemaining?.bind(ForcePointsService);
  ForcePointsService.getBonusRemaining = function swseGetBonusForcePointsRemaining(actor) {
    return bonusForcePointTotal(actor);
  };

  ForcePointsService.getAvailableTotal = function swseGetAvailableForcePoints(actor) {
    return (Number(originalGetRemaining?.(actor) ?? 0) || 0) + bonusForcePointTotal(actor);
  };

  ForcePointsService.canSpend = function swseCanSpendIncludingBonus(actor, pointsToSpend = 1) {
    return this.getAvailableTotal(actor) >= pointsToSpend;
  };

  ForcePointsService.validateSpend = function swseValidateSpendIncludingBonus(actor, context = {}) {
    const { reason = 'unknown', amount = 1 } = context;
    if (!actor) {
      return { valid: false, message: 'No actor provided', allowance: 0 };
    }

    const normal = Number(originalGetRemaining?.(actor) ?? 0) || 0;
    const bonus = bonusForcePointTotal(actor);
    const total = normal + bonus;
    if (total < amount) {
      return {
        valid: false,
        message: `Insufficient Force Points: have ${total} (${normal} normal, ${bonus} bonus), need ${amount}`,
        allowance: total
      };
    }

    if ((context.offTurn === true || context.isReaction === true) && !ForcePointFeatRules.canSpendOffTurn(actor)) {
      return {
        valid: false,
        message: 'Force Points cannot be spent outside your turn without Force Readiness or another explicit rule.',
        allowance: 0
      };
    }

    if (typeof this._isSpendingPrevented === 'function' && this._isSpendingPrevented(actor)) {
      return { valid: false, message: 'Force Point spending is prevented', allowance: 0 };
    }

    return {
      valid: true,
      message: `Can spend ${amount} FP for ${reason}`,
      allowance: amount,
      normalAvailable: normal,
      bonusAvailable: bonus,
      totalAvailable: total
    };
  };

  globalThis.SWSE ??= {};
  globalThis.SWSE.ForcePointServiceRuntime = { patched: true };
}

export default registerForcePointServiceRuntimePatches;
