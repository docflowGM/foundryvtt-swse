// Phase 5D-I-D-F -- power-source REQUIREMENTS of canonical weapons.
// "It requires an energy cell / two energy cells / a power pack / four power packs to operate" is a REQUIREMENT of the weapon, not a
// per-shot ammunition cost: the published text states no capacity, no charge counter and no consumption per attack, so none is invented
// here. Ammunition spent per shot stays with the canonical resource cost + AmmoSystem; this module only says WHAT the weapon needs.
//
// Whether the source is installed is owned Item state the player confirms (FireStateStore.setPowerSourceState) or an explicit attack
// option. UNKNOWN is not FALSE: only an explicit "missing" confirmation makes the weapon inoperable; an unconfirmed source never blocks.
// Four operation keys (requiresEnergyCell / requiresEnergyCells / requiresPowerPack / requiresPowerPacks) share this one reader.

/** operation key -> the kind of source it names (a boolean `true` means one; a positive integer is the count). */
export const POWER_SOURCE_KEYS = Object.freeze({
  requiresEnergyCell: 'energy-cell',
  requiresEnergyCells: 'energy-cell',
  requiresPowerPack: 'power-pack',
  requiresPowerPacks: 'power-pack',
});

export const POWER_SOURCE_STATES = Object.freeze(['installed', 'missing']);

/**
 * The structured power-source requirement of a canonical record's operation block, or null.
 * @param {object} operation  ResolvedWeapon.operation
 * @returns {{kind:'energy-cell'|'power-pack', count:number, keys:string[]}|null}
 */
export function powerSourceRequirementOf(operation) {
  const op = operation ?? {};
  let kind = null, count = 0;
  const keys = [];
  for (const [key, k] of Object.entries(POWER_SOURCE_KEYS)) {
    if (!(key in op)) continue;
    const v = op[key];
    const n = v === true ? 1 : (Number.isInteger(v) && v > 0 ? v : 0);
    if (!n) continue; // a malformed / false value declares no requirement
    if (kind && kind !== k) continue; // a record names one kind; a second kind is ignored rather than guessed
    kind = k; count = Math.max(count, n); keys.push(key);
  }
  return kind ? Object.freeze({ kind, count, keys: Object.freeze(keys) }) : null;
}

/** "2 energy cells" / "a power pack" */
export function powerSourceLabel(req) {
  if (!req) return '';
  const noun = req.kind === 'energy-cell' ? 'energy cell' : 'power pack';
  if (req.count !== 1) return `${req.count} ${noun}s`;
  return req.kind === 'energy-cell' ? 'an energy cell' : 'a power pack';
}

/**
 * Installed / missing / unknown. Precedence: an explicit attack option for THIS attack > the player-confirmed owned state > unknown.
 * Absence of a recorded state is "unknown", never "missing".
 * @returns {{state:'installed'|'missing'|'unknown', source:'option'|'owned'|null}}
 */
export function powerSourceStatus(ownedState, rollOptions = {}) {
  const opt = rollOptions?.powerSourceInstalled;
  if (opt === true || opt === 'installed') return { state: 'installed', source: 'option' };
  if (opt === false || opt === 'missing') return { state: 'missing', source: 'option' };
  const owned = ownedState?.powerSource;
  if (POWER_SOURCE_STATES.includes(owned)) return { state: owned, source: 'owned' };
  return { state: 'unknown', source: null };
}
