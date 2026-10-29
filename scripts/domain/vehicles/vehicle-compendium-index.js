/**
 * Foundry CompendiumIndex is a Collection/Map, not necessarily an array.
 * Iterating a raw Map produces [id, entry] pairs. Always read values.
 * This is a pure shared adapter used by browser and Phase 4D audit.
 */
export function getVehicleCompendiumIndexEntries(index) {
  if (!index) return [];
  if (Array.isArray(index)) return index;
  if (Array.isArray(index.contents)) return index.contents;
  if (typeof index.values === 'function') return Array.from(index.values());
  if (typeof index[Symbol.iterator] === 'function') {
    return Array.from(index, value =>
      Array.isArray(value) && value.length === 2 && value[1]?.system
        ? value[1] : value);
  }
  throw new Error('VEHICLE_COMPENDIUM_INDEX_NOT_ITERABLE');
}
