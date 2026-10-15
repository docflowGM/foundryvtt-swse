/**
 * Species movement — a species may print only some movement modes. "Land speed not printed" is NOT speed 0 (immobile) and NOT
 * the generic default of 6: it is a distinct, explicit state that keeps the printed alternative modes (fly, swim, hover, ...).
 *
 * Pure module: no Foundry globals. Used by the species materializer and by the shared derived-speed code.
 */

const MODE_ORDER = ['walk', 'fly', 'hover', 'glide', 'swim', 'climb', 'burrow'];
const isSpeed = v => typeof v === 'number' && Number.isFinite(v);

/** Printed non-land modes of a movement object (finite numbers only). */
export function alternateMovementModes(movements) {
  const out = {};
  for (const mode of MODE_ORDER) if (mode !== 'walk' && isSpeed(movements?.[mode])) out[mode] = movements[mode];
  return out;
}

/**
 * @param {object} movements  { walk?, fly?, swim?, hover?, ... } as resolved by the species grant ledger
 * @returns {{ landSpeedUnspecified: boolean, walk: number|null, modes: object }}
 */
export function planSpeciesMovement(movements) {
  const modes = alternateMovementModes(movements);
  const walk = isSpeed(movements?.walk) ? movements.walk : null;
  return { landSpeedUnspecified: walk === null && Object.keys(modes).length > 0, walk, modes };
}

/** The mode a speed label leads with when there is no land speed (first printed mode in a fixed order). */
export function primaryMode(modes) {
  return MODE_ORDER.find(mode => isSpeed(modes?.[mode])) ?? null;
}

/**
 * Derived speed state for a character. Ordinary actors keep exactly the previous behaviour (base speed, default 6 only when
 * nothing is recorded). When the species recorded `speciesLandSpeedUnspecified`, there is no walk speed: walk/base/total are
 * null (never 0, never 6) and the printed modes are exposed.
 */
export function describeLandSpeed(system, fallbackBase) {
  if (system?.speciesLandSpeedUnspecified === true) {
    const modes = alternateMovementModes(system.speciesMovement);
    return { landSpeedSpecified: false, base: null, total: null, walk: null, modes, mode: primaryMode(modes) ?? 'walk' };
  }
  return { landSpeedSpecified: true, base: fallbackBase, total: fallbackBase, walk: fallbackBase, modes: {}, mode: 'walk' };
}

/** Player-facing speed line, e.g. "Fly 6 sq, Swim 10 sq" (no land speed) or "6 sq". */
export function formatSpeedLine(speed) {
  if (speed?.landSpeedSpecified === false) {
    const parts = MODE_ORDER.filter(m => isSpeed(speed.modes?.[m])).map(m => `${m[0].toUpperCase()}${m.slice(1)} ${speed.modes[m]} sq`);
    return parts.length ? parts.join(', ') : 'No land speed';
  }
  return `${Number(speed?.walk ?? speed?.total ?? 0) || 0} sq`;
}
