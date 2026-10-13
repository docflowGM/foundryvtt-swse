// Phase 5D-I-D-B1 -- mounting a weapon on a HOST weapon (Micro Grenade Launcher / Grenade Launcher on a rifle, Targeting Laser on a Medium or larger weapon).
// The canonical record states WHAT a weapon may be mounted on (a rifle; a weapon of at least a size), HOW (a Mechanics check against a DC) and how long it takes
// (minutes). This module reads those structured facts and validates a chosen host by its canonical identity; it never reads a weapon name. The check itself
// is rolled through the existing skill-roll authority by FireStateStore.mountOnHost; the time is the GM's circumstance (reported, never simulated).

import { sizeIndexOf as sizeIndex } from './wielding-size.js';

/**
 * The structured mount rule of a canonical weapon, or null when it declares none.
 *   hostGroup     'rifles' when the record says it can be mounted on a rifle (canMountOnRifle / rifleMountable)
 *   minHostSize   the smallest host size (mountableOnMinimumWeaponSize)
 *   check         { skill, dc, timeMinutes } from mountMechanicsDC / mountTimeMinutes, else from the configuration transition that mounts it
 *   standalone    canUseStandalone (it may also be used on its own)
 */
export function mountRuleOf(operation, configurationStates = []) {
  const op = operation ?? {};
  const hostGroup = (op.canMountOnRifle === true || op.rifleMountable === true) ? 'rifles' : null;
  const minHostSize = typeof op.mountableOnMinimumWeaponSize === 'string' && sizeIndex(op.mountableOnMinimumWeaponSize) >= 0 ? op.mountableOnMinimumWeaponSize : null;
  if (!hostGroup && !minHostSize) return null;
  const transition = (Array.isArray(configurationStates) ? configurationStates : []).map((c) => c?.transition).find((t) => t && Number.isFinite(t.dc)) ?? null;
  const dc = Number.isFinite(op.mountMechanicsDC) ? op.mountMechanicsDC : (Number.isFinite(transition?.dc) ? transition.dc : null);
  const timeMinutes = Number.isFinite(op.mountTimeMinutes) ? op.mountTimeMinutes : (Number.isFinite(transition?.timeMinutes) ? transition.timeMinutes : null);
  const skill = dc === null ? null : String(transition?.skill ?? 'Mechanics').toLowerCase();
  return Object.freeze({
    hostGroup, minHostSize,
    check: dc === null ? null : Object.freeze({ skill, dc, timeMinutes }),
    standalone: op.canUseStandalone === true,
    configurationId: (Array.isArray(configurationStates) ? configurationStates : []).find((c) => c?.transition && /mount/i.test(String(c.transition.effect ?? '')))?.id ?? null,
  });
}

/**
 * Is `host` an eligible host for a weapon with `rule`? `hostFacts` = { source, groupKey, size, mountedHostId } of the candidate host, resolved from its
 * CANONICAL identity (a legacy / custom weapon cannot be verified and is refused rather than guessed).
 */
export function hostEligibility(rule, hostFacts, { sameItem = false } = {}) {
  if (!rule) return { ok: false, reason: 'not-mountable' };
  if (sameItem) return { ok: false, reason: 'host-is-the-weapon' };
  if (hostFacts?.source !== 'canonical') return { ok: false, reason: 'host-not-canonical' };
  if (hostFacts.mountedHostId) return { ok: false, reason: 'host-is-itself-mounted' };
  if (rule.hostGroup && hostFacts.groupKey !== rule.hostGroup) return { ok: false, reason: `host-not-${rule.hostGroup}` };
  if (rule.minHostSize && !(sizeIndex(hostFacts.size) >= sizeIndex(rule.minHostSize))) return { ok: false, reason: 'host-too-small', minHostSize: rule.minHostSize };
  return { ok: true };
}
