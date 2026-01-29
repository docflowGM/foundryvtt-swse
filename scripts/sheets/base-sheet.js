// ==================================================
// SWSEBaseActor
// Shared logic for all SWSE entities
// ==================================================

export class SWSEBaseActor extends Actor {

  prepareBaseData() {
    this._prepareResources();
    this._prepareDamageTrack();
  }

  prepareDerivedData() {
    this.system.derived = {};
    this._applyDamageTrackPenalties();
  }

  /* -------------------------------------------- */
  /* Resources (HP / Hull / Force / Destiny)      */
  /* -------------------------------------------- */

  _prepareResources() {
    const sys = this.system;

    sys.hp ??= { current: 0, max: 0 };
    sys.damageTrack ??= { step: 0 }; // 0 = normal
  }

  /* -------------------------------------------- */
  /* Damage Track (Shared by ALL actor types)     */
  /* -------------------------------------------- */

  _prepareDamageTrack() {
    const dt = this.getDamageThreshold();
    this.system.derived.damageThreshold = dt;
  }

  getDamageThreshold() {
    // Override in subclasses
    return 0;
  }

  advanceDamageTrack(steps = 1) {
    const track = this.system.damageTrack;
    track.step = Math.clamp(track.step + steps, 0, this.getMaxDamageTrackStep());
  }

  getMaxDamageTrackStep() {
    return 5;
  }

  _applyDamageTrackPenalties() {
    const step = this.system.damageTrack?.step ?? 0;
    this.system.derived.damagePenalty = this.getDamageTrackPenalty(step);
  }

  getDamageTrackPenalty(step) {
    // Default SWSE penalties
    if (step >= 5) return -10;
    if (step === 4) return -5;
    if (step === 3) return -2;
    if (step === 2) return -1;
    return 0;
  }
}