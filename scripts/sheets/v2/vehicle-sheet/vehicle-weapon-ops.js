/**
 * Weapon operations of a vehicle on the V2 sheet: the firing mode of autofire-capable weapons (WE-5) -- and the entry point for the
 * other per-weapon controls. The view reads the SAME weapon authority the attack uses; the action calls VehicleFireModeService (swift
 * action through ActionEconomyConsumption, persisted through ActorEngine). Nothing here decides a rule.
 */
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { stockAmmoReadinessRows } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-stock-ammo-readiness.js";
import { readPersistedFireMode } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-fire-mode.js";

export function buildWeaponOpsView(actor, { isGM = false } = {}) {
  const canAct = actor?.isOwner === true || isGM === true;
  const items = actor?.items?.contents ?? (actor?.items ? [...actor.items] : []);
  const fireModes = [];
  for (const item of items) {
    if (item?.type !== 'weapon') continue;
    const a = resolveVehicleWeaponAuthority(item);
    if (!a?.ok || a.autofireCapable !== true) continue;
    const mode = readPersistedFireMode(actor, item.id);
    fireModes.push({
      itemId: item.id, name: item.name, mode, modeLabel: mode === 'autofire' ? 'Autofire' : 'Single fire',
      canSwitchToAutofire: canAct && mode !== 'autofire', canSwitchToSingle: canAct && mode === 'autofire',
      disabledReason: canAct ? '' : 'Only the vehicle\'s owner or the GM can change the firing mode.',
      cost: 'Swift action to set autofire (switching back is free)', burstNote: 'Burst Fire: -5 attack, +2 dice; needs a named gunner who has the Burst Fire feat (set to autofire first).'
    });
  }
  // GM launcher configuration: only launcher groups whose source leaves ammunition facts missing (or already configured) are listed
  const ammoRows = isGM ? stockAmmoReadinessRows(actor).filter(r => r.state === 'GM_CONFIGURED_EXECUTABLE' || r.configurable).map(r => ({
    ...r, isConfigured: r.state === 'GM_CONFIGURED_EXECUTABLE', stateLabel: r.state === 'GM_CONFIGURED_EXECUTABLE' ? 'GM-configured (not canonical)' : 'Unresolved: ammunition facts missing',
    summary: r.config ? `${r.config.launchers} launcher(s) x ${r.config.capacity}, payload ${r.config.payload}, loaded at setup ${r.config.loaded}` : ''
  })) : [];
  return { canAct, fireModes, hasFireModes: fireModes.length > 0, isGM, ammoRows, hasAmmoRows: ammoRows.length > 0 };
}

export async function runWeaponAction({ action, itemId, vehicle }, deps) {
  const { service, notify } = deps;
  const weapon = vehicle?.items?.get?.(itemId) ?? [...(vehicle?.items ?? [])].find(i => i.id === itemId);
  if (!weapon && !String(action).startsWith('ammo-config')) { notify.warn('That weapon is no longer on the vehicle.'); return { ok: false, reason: 'WEAPON_NOT_FOUND' }; }
  if (action === 'fire-mode-autofire' || action === 'fire-mode-single') {
    const mode = action === 'fire-mode-autofire' ? 'autofire' : 'single';
    const r = await (service.fireMode ?? service).setMode({ vehicle, weapon, mode });
    if (r.ok) notify.info(r.unchanged ? `${weapon.name} is already set to ${mode === 'autofire' ? 'autofire' : 'single fire'}.` : mode === 'autofire' ? `${weapon.name} set to autofire (swift action).` : `${weapon.name} set back to single fire (no action cost).`);
    else notify.warn(`${weapon.name}: ${r.reason}`);
    return r;
  }
  if (action === 'ammo-config' || action === 'ammo-config-clear') {
    const groupKey = itemId;
    if (action === 'ammo-config-clear') {
      const r = await service.ammoConfig.clear({ vehicle, groupKey });
      if (r.success) notify.info('GM launcher configuration removed.'); else notify.warn(r.reasons?.join(', ') ?? 'refused');
      return r;
    }
    const row = stockAmmoReadinessRows(vehicle).find(x => x.groupKey === groupKey);
    const input = await deps.askAmmoConfig?.(row);
    if (!input) return { success: false, reasons: ['CANCELLED'] };
    const r = await service.ammoConfig.configure({ vehicle, groupKey, input: input.values, reason: input.reason });
    if (r.success) notify.info(r.warning ? `Configured. ${r.warning}` : 'Launcher configured (GM-configured, not canonical).'); else notify.warn(r.reasons?.join(', ') ?? 'refused');
    return r;
  }
  return { ok: false, reason: 'UNKNOWN_ACTION' };
}

export function bindWeaponActions(root, vehicle, deps) {
  for (const btn of root.querySelectorAll('[data-weapon-action]')) {
    btn.addEventListener('click', async ev => {
      ev.preventDefault();
      btn.disabled = true;
      try { await runWeaponAction({ action: btn.dataset.weaponAction, itemId: btn.dataset.itemId, vehicle }, deps); }
      finally { btn.disabled = false; }
    });
  }
}
