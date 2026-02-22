/**
 * Shared SWSE Vehicle Combat Utilities
 * Includes:
 *  - RAW Vehicle Condition Track (6 steps)
 *  - ActiveEffect templates for CT penalties
 *  - Distance & angle utilities for dogfighting, collisions, etc.
 */

export const VEHICLE_CT_STATES = [
  { step: 0, label: 'Normal', penalty: 0 },
  { step: 1, label: '-2', penalty: -2 },
  { step: 2, label: '-5', penalty: -5 },
  { step: 3, label: '-10', penalty: -10 },
  { step: 4, label: '-20', penalty: -20 },
  { step: 5, label: 'Destroyed', penalty: -99 }
];

/**
 * Get RAW penalty for vehicle CT step.
 */
export function getVehicleCTPenalty(step) {
  const s = VEHICLE_CT_STATES[Math.clamp(step, 0, 5)];
  return s?.penalty ?? 0;
}

/**
 * Create the Active Effect that should represent a given CT step.
 * Vehicles do not share character CT AEs.
 */
export function createVehicleCTEffect(step, originUUID = null) {
  const s = VEHICLE_CT_STATES[Math.clamp(step, 0, 5)];
  if (!s) {return null;}

  if (step === 5) {
    // Destroyed AE
    return {
      label: 'Destroyed',
      icon: 'icons/svg/skull.svg',
      origin: originUUID,
      disabled: false,
      changes: [
        { key: 'system.vehicle.speed', mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: 0 },
        { key: 'system.vehicle.operational', mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: false },
        { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -20 }
      ],
      flags: { swse: { vehicleCT: step } }
    };
  }

  return {
    label: `Vehicle Condition Track ${s.label}`,
    icon: 'icons/svg/hazard.svg',
    origin: originUUID,
    disabled: false,
    changes: [
      { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: s.penalty },
      { key: 'system.vehicle.handling', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: s.penalty }
    ],
    flags: { swse: { vehicleCT: step } }
  };
}

/**
 * Check if a vehicle is destroyed (CT step 5).
 */
export function vehicleIsDestroyed(actor) {
  const ct = actor.system.conditionTrack?.current ?? 0;
  return ct >= 5;
}

/**
 * Measure distance (in squares) between two tokens.
 */
export function measureSquares(aToken, bToken) {
  if (!aToken || !bToken || !canvas.grid) {return 0;}
  const dist = canvas.grid.measureDistance(aToken, bToken);
  const perSq = canvas.scene.grid.distance || 5;
  return Math.round(dist / perSq);
}

/**
 * Measure 2D distance in world units.
 */
export function measureDistance(aToken, bToken) {
  if (!aToken || !bToken) {return 0;}
  const dx = aToken.center.x - bToken.center.x;
  const dy = aToken.center.y - bToken.center.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute angle from token A to token B (for dogfighting).
 */
export function computeAngle(aToken, bToken) {
  if (!aToken || !bToken) {return 0;}
  return Math.atan2(bToken.center.y - aToken.center.y, bToken.center.x - aToken.center.x);
}

/**
 * Returns whether two facing angles are within X degrees of alignment.
 */
export function anglesCloseEnough(a, b, toleranceDeg = 30) {
  const diff = Math.abs((a - b + Math.PI * 2) % (Math.PI * 2));
  const tolerance = toleranceDeg * (Math.PI / 180);
  return diff <= tolerance || diff >= (Math.PI * 2 - tolerance);
}

/**
 * Normalize angle between 0 and 2π.
 */
export function normalizeAngle(a) {
  return (a % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
}

/**
 * Check facing relative to target.
 * Vehicles may have firing arcs and rear blind spots.
 */
export function facingTowards(attacker, target, toleranceDeg = 60) {
  const aTok = attacker.getActiveTokens()[0];
  const tTok = target.getActiveTokens()[0];
  if (!aTok || !tTok) {return false;}

  const facing = normalizeAngle(aTok.document.rotation * (Math.PI / 180));
  const angleToTarget = computeAngle(aTok, tTok);

  return anglesCloseEnough(facing, angleToTarget, toleranceDeg);
}
