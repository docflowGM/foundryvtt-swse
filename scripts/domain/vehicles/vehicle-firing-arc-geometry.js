/**
 * Pure geometry check for an already AUTHORIZED firing arc.
 * This function cannot determine whether an arc is printed, source-silent or
 * allowed by GM adjudication; the evidence gate owns that decision.
 * It never guesses a default arc for unknown/missing source data.
 */
export const VEHICLE_FIRING_ARCS=new Set(['forward','aft','port','starboard','turret','omni']);

export function isTargetWithinVehicleArc(attacker, target, arc, tolerance = 75) {
  if (!VEHICLE_FIRING_ARCS.has(arc) || !Number.isFinite(tolerance) || tolerance < 0 || tolerance > 90) return false;
  const attackerToken = attacker?.getActiveTokens?.()?.[0];
  const targetToken = target?.getActiveTokens?.()?.[0];
  if (!attackerToken || !targetToken) return false;
  const a=attackerToken.center, b=targetToken.center;
  const rotation=Number(attackerToken.document?.rotation);
  if (![a?.x,a?.y,b?.x,b?.y,rotation].every(Number.isFinite)) return false;
  const dx=b.x-a.x, dy=b.y-a.y;
  if (dx === 0 && dy === 0) return false; // no bearings for identical centers
  if (arc === 'turret' || arc === 'omni') return true;
  const bearing=Math.atan2(dy,dx)*180/Math.PI;
  const raw=bearing-rotation;
  const deg=((raw+180)%360+360)%360-180;
  if (arc === 'forward') return Math.abs(deg) <= tolerance;
  if (arc === 'aft') return Math.abs(deg) >= 180-tolerance;
  if (arc === 'port') return deg > tolerance && deg < 180-tolerance;
  if (arc === 'starboard') return deg < -tolerance && deg > -(180-tolerance);
  return false;
}