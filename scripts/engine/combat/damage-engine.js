/**
 * DamageEngine — Phase C Combat Resolution
 * Apply damage, check DT, adjust CT, handle massive damage
 */

export class DamageEngine {
  static async applyDamage(actor, damage, options = {}) {
    const {
      damageType = 'normal',
      bypassDT = false,
      targetTempHP = true,
      forceMassiveDamageCheck = false
    } = options;

    if (!actor || damage < 0) return { success: false, reason: 'Invalid actor or negative damage' };

    const hp = actor.system.hp || {};
    const derived = actor.system.derived || {};
    const dt = derived.damageThreshold || 0;
    let finalDamage = damage;

    // Temp HP first
    if (targetTempHP && (hp.temp || 0) > 0) {
      const tempAbsorbed = Math.min(hp.temp, finalDamage);
      finalDamage -= tempAbsorbed;
      hp.temp = (hp.temp || 0) - tempAbsorbed;
    }

    // DT check (unless bypassed)
    if (!bypassDT && dt > 0 && finalDamage <= dt) {
      return {
        success: true,
        absorbed: damage,
        finalHP: hp.value,
        reason: `Damage (${damage}) absorbed by DT (${dt})`
      };
    }

    // Reduce final damage by DT
    if (!bypassDT && dt > 0) {
      finalDamage -= dt;
    }

    // Apply to HP
    const oldHP = hp.value || 0;
    const newHP = Math.max(0, oldHP - finalDamage);
    hp.value = newHP;

    // Check massive damage
    const isMassiveDamage = forceMassiveDamageCheck || finalDamage >= (derived.hp?.max || 1) / 2;
    if (isMassiveDamage && newHP > 0) {
      await this._handleMassiveDamage(actor, finalDamage);
    }

    // Auto-adjust CT if HP ≤ 0
    if (newHP <= 0) {
      await this._autoAdjustConditionTrack(actor);
    }

    await actor.update({
      'system.hp': hp
    });

    return {
      success: true,
      damageApplied: finalDamage,
      oldHP,
      newHP,
      isMassiveDamage,
      reason: 'Damage applied'
    };
  }

  static async _handleMassiveDamage(actor, damage) {
    const ct = actor.system.conditionTrack || {};
    const current = Number(ct.current ?? 0);

    // Massive damage: move CT forward 1 step
    const next = Math.min(5, current + 1);
    await actor.update({ 'system.conditionTrack.current': next });

    return { ctMoved: true, from: current, to: next };
  }

  static async _autoAdjustConditionTrack(actor) {
    const ct = actor.system.conditionTrack || {};
    await actor.update({ 'system.conditionTrack.current': 5 }); // Helpless
  }

  static getDamageThreshold(actor) {
    return actor.system.derived?.damageThreshold || 0;
  }

  static getHPStatus(actor) {
    const hp = actor.system.hp || {};
    const max = hp.max || 1;
    const current = hp.value || 0;

    return {
      current,
      max,
      temp: hp.temp || 0,
      percent: Math.round((current / max) * 100),
      isDead: current <= 0,
      isCritical: current <= max * 0.25
    };
  }
}
