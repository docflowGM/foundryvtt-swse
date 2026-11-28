/**
 * Vehicle sheet Edit-form field contract: the single list of paths the shell form may write, per vehicle kind.
 * Every rendered [name] input must be in this contract (or explicitly exempt in the contract test) so a Save can never
 * silently drop a field the sheet displayed as editable.
 *
 * The scale/hyperdrive fields below are canonical: they are written by the vehicle import normalizer
 * (engine/import/vehicle-import-normalizer.js) and read by sheets/holonet consumers, so a custom vehicle may edit them.
 * `system.hull.*` remains the LEGACY hit-point mirror (derived builder reads system.hp first); resolving that fork is an
 * open engineering decision and is intentionally not changed here.
 */
export const VEHICLE_WRITABLE_EXACT = Object.freeze(new Set([
  'name', 'img',
  'system.category', 'system.type', 'system.size', 'system.challengeLevel', 'system.cost', 'system.availability',
  'system.hull.value', 'system.hull.max', 'system.shields.value', 'system.shields.max', 'system.shieldRating',
  'system.damageReduction', 'system.reflexDefense', 'system.fortitudeDefense', 'system.damageThreshold', 'system.armorBonus',
  'system.speed', 'system.maxVelocity', 'system.maneuver', 'system.hyperdrive',
  'system.hyperdrive_class', 'system.backup_class',
  'system.starshipSpeed', 'system.characterScaleSpeed', 'system.starshipScaleSpeed',
  'system.characterScaleFightingSpace', 'system.starshipScaleFightingSpace', 'system.maxVelocityKmh',
  'system.crew', 'system.crewQuality', 'system.passengers', 'system.cargo', 'system.payload', 'system.cover',
  'system.notes', 'system.description', 'system.details.notes'
]));

export const VEHICLE_WRITABLE_PATTERNS = Object.freeze([
  /^system\.weapons\.\d+\.(name|arc|attackBonus|damage|range|fireControl|notes)$/,
  /^system\.attributes\.(str|dex|int|wis|cha)\.(base|racial|temp)$/
]);

/** Source-backed (canonical) vehicles: published facts stay locked; only runtime state and notes are editable. */
export const VEHICLE_CANONICAL_WRITABLE = Object.freeze(new Set([
  'name', 'img', 'system.hp.value', 'system.shields.value', 'system.notes', 'system.details.notes', 'system.description'
]));

/** Nullable-integer fields: a blank input clears the value instead of storing an empty string. */
const NULLABLE_INTEGER = new Set(['system.characterScaleSpeed', 'system.starshipScaleSpeed', 'system.maxVelocityKmh']);

export function isVehicleFieldWritable(path, kind) {
  return kind === 'canonical'
    ? VEHICLE_CANONICAL_WRITABLE.has(path)
    : VEHICLE_WRITABLE_EXACT.has(path) || VEHICLE_WRITABLE_PATTERNS.some((pattern) => pattern.test(path));
}

export function coerceVehicleFieldValue(path, raw) {
  if (!NULLABLE_INTEGER.has(path)) return raw;
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
