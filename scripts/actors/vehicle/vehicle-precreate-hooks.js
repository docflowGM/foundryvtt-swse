/**
 * Phase 4E P0: canonical vehicle creation is source-only and fail-closed.
 * No legacy normalization, name-derived published category, or implicit
 * installed weapon Item creation occurs at Actor creation.
 */
import { classifyVehicleActorSource } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-runtime-contract.js";
import { isLedgerUpdateAllowed } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
import { checkProvenanceUpdate, claimsPublishedSource } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-source-identity.js";
import { hasManagedWeaponFlag } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { UNIVERSAL_VEHICLE_PACKS } from "/systems/foundryvtt-swse/scripts/domain/vehicles/universal-vehicle-pack-registry.js";

let registered = false;

/**
 * Foundry preCreateActor is cancellable by returning false.
 * Keep this synchronous: a promise returning false cannot veto reliably.
 * The empty Phase 4D scratch shell remains valid.
 */
export function validateVehicleCreation(document, data) {
  const assessment = classifyVehicleActorSource(document, data);
  if (assessment.kind === 'invalid-canonical') {
    const reason = 'UNIVERSAL_VEHICLE_SOURCE_INVALID: ' + assessment.errors.join(',');
    console.error('[foundryvtt-swse] Vehicle creation denied: ' + reason);
    return false;
  }
  return undefined;
}

/** preUpdateActor: the install ledger changes only through VehicleInstallationService. */
export function guardVehicleInstallationLedger(actor, changes) {
  // Applies to every Actor type: construction projects live on the designer character.
  if (!actor) return undefined;
  if (isLedgerUpdateAllowed(actor.id, changes)) return undefined;
  console.error('[foundryvtt-swse] Vehicle installation ledger write denied: UNAUTHORIZED_LEDGER_WRITE');
  return false;
}

/**
 * Apply an update's changes (dotted or nested, with -= deletions) to a plain copy of the
 * Actor source, the way Foundry would, so the result can be validated BEFORE it persists.
 */
export function applyChangesToCopy(source, changes) {
  const out = structuredClone(source);
  const setPath = (path, value) => {
    const keys = path.split('.');
    let node = out;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i].replace(/^(-=|==)/, '');
      if (node[k] === null || typeof node[k] !== 'object') node[k] = {};
      node = node[k];
    }
    const last = keys.at(-1);
    if (last.startsWith('-=')) delete node[last.slice(2)];
    else if (last.startsWith('==')) node[last.slice(2)] = value;
    else node[last] = value;
  };
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj ?? {})) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length && !/^(-=|==)/.test(k)) walk(v, path);
      else setPath(path, v);
    }
  };
  walk(changes, '');
  return out;
}

/**
 * preUpdateActor: (1) published identity, source record and printed statistics are immutable,
 * and (2) an ordinary update may not persist ANY state that would make the runtime contract
 * reject the vehicle (e.g. current HP above the printed maximum, a forged mirror, a stock
 * weapon row). A vehicle that is already invalid is not trapped: repairs remain possible.
 */
/**
 * Does an Actor update touch flags.swse.vehicleEnvironment (its state or audit history) in ANY accepted shape?
 * Handles dotted keys at any depth, nested objects, parent-object updates (flags / flags.swse), and Foundry's
 * deletion (-=) and replacement (==) markers on any segment. Fail-closed: a parent deleted or replaced with a marker,
 * or any key that resolves to the environment path or beneath it, counts as touching it. A plain parent object merges,
 * so it touches only when it carries the next segment.
 */
const ENV_PATH = ['flags', 'swse', 'vehicleEnvironment'];
const stripMarker = k => String(k).replace(/^(-=|==)/, '');
const hasMarker = k => /^(-=|==)/.test(String(k));
export function updateTouchesVehicleEnvironment(changes) {
  const walk = (node, matched, forced) => {
    if (!node || typeof node !== 'object') return false;
    for (const [rawKey, value] of Object.entries(node)) {
      let m = matched, f = forced, ok = true;
      for (const seg of String(rawKey).split('.')) {
        if (!seg) continue;
        if (hasMarker(seg)) f = true; // deletion / replacement of this segment and everything under it
        const name = stripMarker(seg);
        if (m < ENV_PATH.length) { if (name === ENV_PATH[m]) m++; else { ok = false; break; } }
      }
      if (!ok) continue;
      if (m >= ENV_PATH.length) return true; // at or beneath the environment flag
      if (f) return true; // a marker on a PARENT of the environment flag (flags / swse) removes or replaces it
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return true; // a parent overwritten by a non-object
      if (walk(value, m, f)) return true;
    }
    return false;
  };
  return walk(changes, 0, false);
}

/** The vehicle operating environment is GM-adjudicated: only a GM user may change flags.swse.vehicleEnvironment. */
export function guardVehicleEnvironment(actor, changes, _options, userId) {
  if (actor?.type !== 'vehicle') return undefined;
  if (!updateTouchesVehicleEnvironment(changes)) return undefined;
  const user = globalThis.game?.users?.get?.(userId) ?? (userId === undefined ? globalThis.game?.user : null);
  if (user?.isGM === true) return undefined;
  console.error('[foundryvtt-swse] Vehicle environment change denied: GM_REQUIRED');
  return false;
}

export function guardVehicleProvenance(actor, changes) {
  const verdict = checkProvenanceUpdate(actor, changes);
  if (!verdict.ok) {
    console.error('[foundryvtt-swse] Vehicle provenance update denied: UNIVERSAL_VEHICLE_PROVENANCE_IMMUTABLE ' + verdict.paths.join(','));
    return false;
  }
  if (actor?.type !== 'vehicle' || !claimsPublishedSource(actor)) return undefined;
  const source = typeof actor.toObject === 'function' ? actor.toObject() : actor._source ?? actor;
  if (classifyVehicleActorSource(source, undefined, { mode: 'runtime' }).kind !== 'canonical') return undefined;
  const after = classifyVehicleActorSource(applyChangesToCopy(source, changes), undefined, { mode: 'runtime' });
  if (after.kind === 'invalid-canonical') {
    console.error('[foundryvtt-swse] Vehicle update denied: UNIVERSAL_VEHICLE_SOURCE_INVALID ' + after.errors.join(','));
    return false;
  }
  return undefined;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Shipyard-managed weapon Items are representations of sealed installations: their authority fields are not editable. */
/* ------------------------------------------------------------------------------------------------------------------ */
const PROTECTED_WEAPON_ITEM_PATHS = ['name', 'system.damage', 'system.vehicleMount', 'system.arc', 'flags.swse.vehicleInstalledWeapon', 'flags.swse.vehicleStockWeapon'];

/** Every dotted path an update touches, with '-=' / '==' markers resolved to the key they act on. */
function touchedPaths(changes, prefix = '', out = []) {
  if (changes === null || typeof changes !== 'object') { out.push(prefix); return out; }
  const keys = Object.keys(changes);
  if (!keys.length && prefix) out.push(prefix);
  for (const raw of keys) {
    const key = raw.replace(/^(-=|==)/, '');
    const path = prefix ? `${prefix}.${key}` : key;
    const v = changes[raw];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !raw.startsWith('-=')) touchedPaths(v, path, out); else out.push(path);
  }
  return out;
}
const related = (a, b) => a === b || a.startsWith(b + '.') || b.startsWith(a + '.');

export function updateTouchesShipyardWeaponItem(changes) {
  return touchedPaths(changes).some(p => PROTECTED_WEAPON_ITEM_PATHS.some(q => related(p, q)));
}

/** Refuse edits to the authority fields of a Shipyard-managed weapon Item (damage, name, mount, identity flag). */
export function guardShipyardWeaponItem(item, changes) {
  if (item?.parent?.type !== 'vehicle' || !hasManagedWeaponFlag(item)) return undefined;
  if (!updateTouchesShipyardWeaponItem(changes)) return undefined;
  console.error('[foundryvtt-swse] Shipyard weapon Item update denied: SHIPYARD_WEAPON_ITEM_IS_MANAGED (reconcile through the Shipyard instead)');
  return false;
}

/** Arms the published stock weapons of a newly created source-backed vehicle (runs only on the creating client). */
export async function armStockWeaponsOnCreate(actor, _options, userId) {
  if (actor?.type !== 'vehicle' || userId !== globalThis.game?.user?.id) return;
  if (!claimsPublishedSource(actor)) return;
  try {
    const { VehicleInstallationService } = await import('/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-installation-service.js');
    const r = await VehicleInstallationService.syncWeaponItems(actor);
    if (!r.success) console.warn('[foundryvtt-swse] Stock weapon arming incomplete; use "Resync weapons" on the vehicle sheet:', r.reasons);
  } catch (err) { console.warn('[foundryvtt-swse] Stock weapon arming failed; use "Resync weapons" on the vehicle sheet:', err); }
  // ship logistics: ONE-TIME initial consumables for a vehicle created just now by this user (a separate step: its failure never affects weapon arming)
  try {
    const { VehicleLogisticsService } = await import('/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-logistics-service.js');
    await VehicleLogisticsService.initializeOnCreate(actor, userId);
  } catch (err) { console.warn('[foundryvtt-swse] Ship logistics initialization failed; a GM can initialize supplies on the vehicle sheet:', err); }
}

export function registerVehiclePreCreateHooks() {
  if (registered) return;
  registered = true;
  Hooks.on('preCreateActor', validateVehicleCreation);
  Hooks.on('preUpdateActor', guardVehicleInstallationLedger);
  Hooks.on('preUpdateActor', guardVehicleProvenance);
  Hooks.on('preUpdateActor', guardVehicleEnvironment);
  Hooks.on('preUpdateItem', guardShipyardWeaponItem);
  // Published factory weapons: when a source-backed vehicle is created, its creating user arms the executable stock
  // groups (owned Items that merely represent verified source groups; no purchase, no ledger entry).
  Hooks.on('createActor', armStockWeaponsOnCreate);
  // Printed firing groups are still reference evidence on their own: only executable, verified groups become Items,
  // and what they may do is re-derived from the source record at every use (never from the Item).
}

/**
 * Category ownership follows the same 11-pack registry used by the pack
 * builder/browser. Never recreate an incomplete category list in this hook.
 */
export async function getVehicleCategoryMapping() {
  return Object.fromEntries(UNIVERSAL_VEHICLE_PACKS.flatMap(
    spec => spec.categories.map(category => [category, spec.name])
  ));
}

export function getCanonicalCategories() {
  return {
    planetary: UNIVERSAL_VEHICLE_PACKS.filter(spec => spec.family !== 'starship')
      .flatMap(spec => spec.categories),
    starships: UNIVERSAL_VEHICLE_PACKS.filter(spec => spec.family === 'starship')
      .flatMap(spec => spec.categories)
  };
}
