// Phase 5D-I-C-B -- falling-object damage authority (Core Rulebook "Damage to Objects" falling-object-by-size table).
// A hurled object (Tactical Tractor Beam) deals FALLING-OBJECT damage by the object's size category -- never the beam's own 3d6. This module is the
// single authority for that lookup. The Core table's damage column is not legible in the repo's OCR text layer (reference/sourcebooks/Core Rulebook),
// so no damage value is certified here: `FALLING_OBJECT_TABLE` is null, and `fallingObjectDamage` REFUSES (reason `falling-object-table-uncertified`)
// instead of inventing values. The lookup mechanism is complete and accepts a certified table the moment one is supplied (data completeness: owner
// final certification). Pure: no mutation, no dice.
import { sizeRankOf } from '/systems/foundryvtt-swse/scripts/items/weapon-runtime/control-rules.js';

/** @type {Readonly<Record<string,string>>|null} size token -> damage formula; null until the Core table is certified from the PDF */
export const FALLING_OBJECT_TABLE = null;

/**
 * @param {string} size                object size category token
 * @param {{table?:Record<string,string>|null}} [opts]  an explicit certified table (tests inject a fixture; production passes none)
 * @returns {{ok:true, formula:string, size:string, authority:string}|{ok:false, reason:string}}
 */
export function fallingObjectDamage(size, { table = FALLING_OBJECT_TABLE } = {}) {
  if (sizeRankOf(size) === null) return { ok: false, reason: 'object-size-unobserved' };
  if (!table) return { ok: false, reason: 'falling-object-table-uncertified' };
  const key = String(size).trim().toLowerCase();
  const formula = table[key];
  if (typeof formula !== 'string' || !/^\d+d\d+(\s*[+-]\s*\d+)?$/.test(formula)) return { ok: false, reason: 'falling-object-size-not-in-table' };
  return { ok: true, formula, size: key, authority: 'falling-object-by-object-size' };
}
