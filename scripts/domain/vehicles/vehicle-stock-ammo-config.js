/**
 * GM-configured launchers for published stock groups whose source leaves the ammunition incomplete (owner direction 2026-11-04).
 *
 * A stock launcher group is source-complete only when the record prints its payload, names an exactly-designated launcher with a certified
 * capacity, and the launcher count is verified. Where that is missing, a GM may supply exactly the missing OPERATIONAL facts on the world
 * Actor. The configuration completes the SAME launcher family and the SAME ledger the printed path uses (vehicle-ammunition-ledger.js); it
 * never edits the publication record, never invents a default quantity, and is reported apart from canonical coverage:
 *
 *   CANONICAL_SOURCE_CERTIFIED  every required fact is printed (the group is executable with no configuration)
 *   GM_CONFIGURED_EXECUTABLE    a valid GM configuration supplies the missing facts (this module)
 *   UNRESOLVED                  required facts are absent and no configuration exists
 *
 * Only the four ammunition refusals can be lifted; any other refusal (damage, arc, range table, operator, attack total...) still blocks.
 * Pure of Foundry globals.
 */
import { LAUNCHER_DESIGNATIONS } from './vehicle-ammunition-ledger.js';
import { LAUNCHER_CAPACITY } from './vehicle-launcher-capacity.js';

export const STOCK_AMMO_CONFIG_FLAG = 'stockAmmoConfig';
export const STOCK_AMMO_CONFIG_SCHEMA = 'swse.vehicle.stockAmmoConfig.v1';
export const READINESS = Object.freeze({ CANONICAL: 'CANONICAL_SOURCE_CERTIFIED', GM_CONFIGURED: 'GM_CONFIGURED_EXECUTABLE', UNRESOLVED: 'UNRESOLVED' });
export const AMMO_LIFTABLE = Object.freeze(new Set(['STOCK_AMMUNITION_LIMITED_UNTRACKED', 'STOCK_AMMUNITION_PAYLOAD_NOT_PRINTED', 'STOCK_LAUNCHER_IDENTITY_NOT_ESTABLISHED', 'STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED']));
export const CONFIG_REASONS = Object.freeze({
  NOT_CONFIGURABLE: 'STOCK_AMMO_GROUP_NOT_GM_CONFIGURABLE', REASON_REQUIRED: 'STOCK_AMMO_CONFIG_REASON_REQUIRED', PAYLOAD_REQUIRED: 'STOCK_AMMO_PAYLOAD_REQUIRED',
  PAYLOAD_CONTRADICTS_SOURCE: 'STOCK_AMMO_PAYLOAD_CONTRADICTS_SOURCE', LAUNCHERS_REQUIRED: 'STOCK_AMMO_LAUNCHER_COUNT_REQUIRED', LAUNCHERS_CONTRADICT_SOURCE: 'STOCK_AMMO_LAUNCHER_COUNT_CONTRADICTS_SOURCE',
  CAPACITY_REQUIRED: 'STOCK_AMMO_MAGAZINE_CAPACITY_REQUIRED', CAPACITY_CONTRADICTS_CATALOG: 'STOCK_AMMO_CAPACITY_CONTRADICTS_CATALOG', AMMUNITION_REQUIRED: 'STOCK_AMMO_AMMUNITION_TYPE_REQUIRED',
  LOADED_INVALID: 'STOCK_AMMO_LOADED_INVALID', EXISTS: 'STOCK_AMMO_CONFIG_EXISTS', INVALID: 'STOCK_AMMO_CONFIG_INVALID', GM_ONLY: 'STOCK_AMMO_CONFIG_GM_ONLY'
});

const isInt = n => Number.isInteger(n) && n >= 0;
const fail = reason => ({ ok: false, reason });
const slug = s => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Is this assessed group blocked ONLY by the four ammunition facts (so a GM configuration could complete it)? */
export function isGmConfigurable(reasons, { battery = null } = {}) {
  return !battery && reasons.length > 0 && reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED') && reasons.every(r => AMMO_LIFTABLE.has(r));
}

/** What the source already establishes for a group, and what a GM must still supply. */
export function describeNeeds(group) {
  const designation = LAUNCHER_DESIGNATIONS[String(group?.label ?? '').trim().toLowerCase()];
  const cap = designation ? LAUNCHER_CAPACITY[designation.launcherId] : null;
  const printedPayload = group?.evidence?.payloadCount;
  const printedLaunchers = group?.evidence?.hardwareCount;
  return {
    payload: isInt(printedPayload) && printedPayload >= 1 ? { printed: printedPayload } : { needed: true },
    launcher: designation && cap ? { catalog: designation.launcherId, ammunition: designation.ammunition, capacity: cap.standard, guided: designation.guided === true } : { needed: ['ammunition', 'magazineCapacity'] },
    launchers: isInt(printedLaunchers) && printedLaunchers >= 1 && !group?.battery ? { printed: printedLaunchers } : { needed: true }
  };
}

/**
 * Validate GM input against the source and build the configuration. Printed facts are never overridden: a contradicting value is refused.
 * @returns {{ok:true, config:object}|{ok:false, reason:string}}
 */
export function planStockAmmoConfig({ group, sourceEntryKey, input = {}, reason, by = null, now = Date.now() } = {}) {
  if (!group?.gmConfigurable) return fail(CONFIG_REASONS.NOT_CONFIGURABLE);
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (!why) return fail(CONFIG_REASONS.REASON_REQUIRED);
  const need = describeNeeds(group);
  let payload;
  if (need.payload.printed !== undefined) {
    if (input.payload !== undefined && input.payload !== null && Number(input.payload) !== need.payload.printed) return fail(CONFIG_REASONS.PAYLOAD_CONTRADICTS_SOURCE);
    payload = need.payload.printed;
  } else {
    payload = Number(input.payload);
    if (!Number.isInteger(payload) || payload < 1) return fail(CONFIG_REASONS.PAYLOAD_REQUIRED);
  }
  let launcherId, ammunition, capacity, guided, capacitySource;
  if (need.launcher.catalog) {
    if (input.magazineCapacity !== undefined && input.magazineCapacity !== null && Number(input.magazineCapacity) !== need.launcher.capacity) return fail(CONFIG_REASONS.CAPACITY_CONTRADICTS_CATALOG);
    ({ catalog: launcherId, ammunition, capacity, guided } = { ...need.launcher, catalog: need.launcher.catalog });
    capacitySource = 'certified launcher catalog';
  } else {
    capacity = Number(input.magazineCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) return fail(CONFIG_REASONS.CAPACITY_REQUIRED);
    ammunition = String(input.ammunition ?? '').trim();
    if (!ammunition) return fail(CONFIG_REASONS.AMMUNITION_REQUIRED);
    launcherId = `gm:${slug(group.label)}`;
    guided = false;                                    // a GM-selected launcher is never assumed to be a guided projectile weapon
    capacitySource = 'GM supplied';
  }
  let launchers;
  if (need.launchers.printed !== undefined) {
    if (input.launchers !== undefined && input.launchers !== null && Number(input.launchers) !== need.launchers.printed) return fail(CONFIG_REASONS.LAUNCHERS_CONTRADICT_SOURCE);
    launchers = need.launchers.printed;
  } else {
    launchers = Number(input.launchers);
    if (!Number.isInteger(launchers) || launchers < 1) return fail(CONFIG_REASONS.LAUNCHERS_REQUIRED);
  }
  const max = Math.min(payload, capacity * launchers);
  const loaded = input.loaded === undefined || input.loaded === null ? max : Number(input.loaded);
  if (!Number.isInteger(loaded) || loaded < 0 || loaded > max) return fail(CONFIG_REASONS.LOADED_INVALID);
  return { ok: true, config: {
    schema: STOCK_AMMO_CONFIG_SCHEMA, state: READINESS.GM_CONFIGURED, groupKey: group.groupKey, sourceEntryKey: sourceEntryKey ?? null, label: group.label,
    launcherId, ammunition, guided, capacity, capacitySource, launchers, payload, loaded,
    supplied: { payload: need.payload.printed === undefined, launcher: !need.launcher.catalog, launchers: need.launchers.printed === undefined },
    configuredBy: by, reason: why, at: now } };
}

/** Does a stored configuration still match the source group? (A hand-edited or stale record is refused, not trusted.) */
export function validateStockAmmoConfig(config, group, sourceEntryKey) {
  if (!config || config.schema !== STOCK_AMMO_CONFIG_SCHEMA || config.state !== READINESS.GM_CONFIGURED) return fail(CONFIG_REASONS.INVALID);
  if (config.groupKey !== group?.groupKey || (sourceEntryKey && config.sourceEntryKey !== sourceEntryKey)) return fail(CONFIG_REASONS.INVALID);
  for (const k of ['payload', 'capacity', 'launchers', 'loaded']) if (!isInt(config[k])) return fail(CONFIG_REASONS.INVALID);
  if (config.payload < 1 || config.capacity < 1 || config.launchers < 1 || config.loaded > Math.min(config.payload, config.capacity * config.launchers)) return fail(CONFIG_REASONS.INVALID);
  const need = describeNeeds(group);
  if (need.payload.printed !== undefined && config.payload !== need.payload.printed) return fail(CONFIG_REASONS.PAYLOAD_CONTRADICTS_SOURCE);
  if (need.launchers.printed !== undefined && config.launchers !== need.launchers.printed) return fail(CONFIG_REASONS.LAUNCHERS_CONTRADICT_SOURCE);
  if (need.launcher.catalog && (config.launcherId !== need.launcher.catalog || config.capacity !== need.launcher.capacity)) return fail(CONFIG_REASONS.CAPACITY_CONTRADICTS_CATALOG);
  if (!need.launcher.catalog && (!String(config.launcherId).startsWith('gm:') || config.guided !== false || !String(config.ammunition ?? '').trim())) return fail(CONFIG_REASONS.INVALID);
  return { ok: true };
}

/** The launcher family a valid configuration completes: the same shape resolveLauncherFamily returns for a printed group. */
export function familyFromConfig(config) {
  return { payload: config.payload, launcherId: config.launcherId, ammunition: config.ammunition, guided: config.guided === true, capacity: config.capacity,
    capacitySource: config.capacitySource, launchers: config.launchers, allocation: 'gm-configured', initialLoaded: config.loaded, gmConfigured: true };
}

export const readStockAmmoConfigs = vehicle => vehicle?.flags?.swse?.[STOCK_AMMO_CONFIG_FLAG] ?? vehicle?.getFlag?.('swse', STOCK_AMMO_CONFIG_FLAG) ?? {};
