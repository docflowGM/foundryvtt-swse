/**
 * P6B custom-starship compatibility: the effective-statistics basis of a custom-constructed vehicle.
 *
 * A custom vehicle carries a digest-sealed construction record (flags.swse.vehicleConstruction) whose
 * installed systems were planned with the same planner and effects registry as published hulls. This module
 * turns that record into the record shape computeEffectiveStatistics reads, so certified effects apply to
 * custom ships through the one authority (getEffectiveVehicleDerived) instead of being shown but not applied.
 *
 * Frame abilities (size, Dexterity, Intelligence) come from the stock-frame table the design was built on
 * (SotG Tables 3-8/3-9), never from the mutable actor system data. A stock frame includes no cargo space,
 * hyperdrive, weapons or shields (SotG p. 52), so those stay absent/unavailable. No Foundry globals.
 */
import STOCK_FRAMES from '../../../data/canonical/vehicles/construction/stock-frames.json' with { type: 'json' };
import { verifyConstructionRecord } from './custom-vehicle-construction.js';
import { readCertifiedInstallations } from './vehicle-installation-ledger.js';

const FRAMES = new Map((STOCK_FRAMES.frames ?? []).map(f => [f.id, f]));
const finite = v => typeof v === 'number' && Number.isFinite(v);
export const constructionSourceKey = record => `custom-construction:${record.designId}`;

/**
 * @returns {null|{record:object, entries:object[], construction:object}} null unless the record verifies, is
 * APPROVED and names a known stock frame.
 */
export function resolveConstructionEffectiveSource(construction) {
  if (!construction || !verifyConstructionRecord(construction) || construction.approval?.status !== 'APPROVED') return null;
  const frame = FRAMES.get(construction.frame?.id);
  if (!frame) return null;
  const d = construction.derived ?? {};
  const key = constructionSourceKey(construction);
  const record = {
    identity: { sourceEntryKey: key, name: construction.name },
    classification: { printedSize: frame.size },
    hyperspace: { capability: 'unavailable' },
    defenses: { reflex: finite(d.reflexDefense) ? d.reflexDefense : null, fortitude: finite(d.fortitudeDefense) ? d.fortitudeDefense : null, shieldRating: 0,
      damageReduction: finite(d.damageReduction) ? d.damageReduction : null },
    durability: { hitPoints: finite(d.hitPoints) ? d.hitPoints : null, damageThreshold: finite(d.damageThreshold) ? d.damageThreshold : null },
    abilities: { dex: finite(frame.dexterity) ? frame.dexterity : null, int: finite(frame.intelligence) ? frame.intelligence : null,
      initiativePrinted: finite(d.initiative) ? d.initiative : null },
    movement: { speedModes: [] },
    fieldStates: { 'defenses.shieldRating': 'explicit-zero' }
  };
  // Same sealed-entry verification as a published hull's ledger, against the construction key the planner used.
  const { entries } = readCertifiedInstallations({ swse: { vehicleInstallations: construction.installedSystems ?? [] } }, key);
  return { record, entries, construction };
}
