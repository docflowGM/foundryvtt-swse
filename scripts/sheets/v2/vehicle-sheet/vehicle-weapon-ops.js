/**
 * Weapon operations of a vehicle on the V2 sheet: the firing mode of autofire-capable weapons (WE-5) -- and the entry point for the
 * other per-weapon controls. The view reads the SAME weapon authority the attack uses; the action calls VehicleFireModeService (swift
 * action through ActionEconomyConsumption, persisted through ActorEngine). Nothing here decides a rule.
 */
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { stockAmmoReadinessRows, stockBatteryReadinessRows } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-stock-ammo-readiness.js";
import * as mineService from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-mine-service.js";
import { readMines } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-mine-service.js";
import * as bombService from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ion-bomb-service.js";
import { VehicleAmmunitionService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-service.js";
import { readFields, interdictionAreaTarget, setActive, removeField } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-interdiction-service.js";
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
      cost: a.autofireSwitchBothWays === true ? 'Swift action to switch between single fire and autofire (either direction)' : 'Swift action to set autofire (switching back is free)', burstNote: 'Burst Fire: -5 attack, +2 dice; needs a named gunner who has the Burst Fire feat (set to autofire first).'
    });
  }
  // GM launcher configuration: only launcher groups whose source leaves ammunition facts missing (or already configured) are listed
  const ammoRows = isGM ? stockAmmoReadinessRows(actor).filter(r => r.state === 'GM_CONFIGURED_EXECUTABLE' || r.configurable).map(r => ({
    ...r, isConfigured: r.state === 'GM_CONFIGURED_EXECUTABLE', stateLabel: r.state === 'GM_CONFIGURED_EXECUTABLE' ? 'GM-configured (not canonical)' : 'Unresolved: ammunition facts missing',
    summary: r.config ? `${r.config.launchers} launcher(s) x ${r.config.capacity}, payload ${r.config.payload}, loaded at setup ${r.config.loaded}` : ''
  })) : [];
  // Gravity well projectors: the projector rows (anyone who can act) and this scene's interdiction fields (GM controls)
  const gravityWeapons = items.filter(i => i?.type === 'weapon' && resolveVehicleWeaponAuthority(i)?.gravityWell === true).map(i => ({ itemId: i.id, name: i.name, canProject: canAct && isGM }));
  const scene = globalThis.canvas?.scene ?? null;
  const fields = isGM ? readFields(scene).map(f => ({ ...f, areaLabel: `columns ${f.area.col}-${f.area.col + 3}, rows ${f.area.row}-${f.area.row + 3}`, stateLabel: f.active ? 'Active' : 'Inactive', toggleLabel: f.active ? 'Deactivate' : 'Activate', own: f.vehicleId === actor?.id })) : [];
  // Space mines: launcher rows and the mines deployed on this scene (GM controls; deployment writes the Scene)
  const mineLaunchers = items.filter(i => i?.type === 'weapon' && resolveVehicleWeaponAuthority(i)?.mine).map(i => ({ itemId: i.id, name: i.name, canDeploy: canAct && isGM }));
  // Ion bomb racks (V-P6C-16): the GM drops a bomb on the square directly beneath the ship
  const bombRacks = items.filter(i => i?.type === 'weapon' && resolveVehicleWeaponAuthority(i)?.ionBomb).map(i => ({ itemId: i.id, name: i.name, canDrop: canAct && isGM }));
  // GM: grant the PUBLISHED starting ammunition to a stock launcher that started without it (house rule off): no credit transaction, never above the payload
  const grantRows = isGM ? items.filter(i => i?.type === 'weapon').map(i => ({ i, f: VehicleAmmunitionService.familyOf(i), l: i?.flags?.swse?.vehicleAmmo })).filter(x => x.f && x.f.origin !== 'aftermarket' && x.l?.initial === 'purchased' && (x.l.granted ?? 0) < x.f.payload)
    .map(x => ({ itemId: x.i.id, name: x.i.name, room: x.f.payload - (x.l.granted ?? 0) })) : [];
  const mines = isGM ? readMines(scene).map(m => ({ ...m, detectionLabel: Number.isFinite(m.detectionDc) ? `notice DC ${m.detectionDc}` : 'no stored notice DC', pendingList: Object.values(m.pending ?? {}).map(p => ({ ...p, name: globalThis.game?.actors?.get?.(p.actorId)?.name ?? p.actorId, status: p.noticed ? 'noticed' : (Object.keys(p.attempts ?? {}).length ? 'not noticed' : 'no reaction yet'), crossing: p.passedThrough && !p.pathTrusted })), squareLabel: `column ${m.square.col}, row ${m.square.row}`, typeLabel: m.type === 'heavy' ? 'Heavy mine' : 'Mine', isCommand: m.detonation === 'command', own: m.vehicleId === actor?.id })) : [];
  // printed batteries: certify the participating-weapon count to enable full-battery mode (GM)
  const batteryRows = isGM ? stockBatteryReadinessRows(actor).map(r => ({ ...r, stateLabel: r.configured ? `Full battery: ${r.weaponCount} weapons (GM-certified, not canonical)` : 'Independent weapon only: the source prints no weapon count' })) : [];
  return { canAct, fireModes, hasFireModes: fireModes.length > 0, batteryRows, hasBatteryRows: batteryRows.length > 0, mineLaunchers, hasMineLaunchers: mineLaunchers.length > 0, grantRows, hasGrantRows: grantRows.length > 0, bombRacks, hasBombRacks: bombRacks.length > 0, mines, hasMines: mines.length > 0, isGM, ammoRows, hasAmmoRows: ammoRows.length > 0, gravityWeapons, hasGravityWeapons: gravityWeapons.length > 0, fields, hasFields: fields.length > 0 };
}

export async function runWeaponAction({ action, itemId, vehicle, actorId = null }, deps) {
  const { service, notify } = deps;
  const weapon = vehicle?.items?.get?.(itemId) ?? [...(vehicle?.items ?? [])].find(i => i.id === itemId);
  if (!weapon && !/^(ammo-config|battery-config|interdiction-|buy-|logistics-|mine-(detonate|remove|notice|resolve|adjudicate))/.test(String(action))) { notify.warn('That weapon is no longer on the vehicle.'); return { ok: false, reason: 'WEAPON_NOT_FOUND' }; }
  // Ship Logistics: the sheet only forwards decisions. Buying opens the same store context; GM controls collect values and call the logistics service.
  if (action === 'buy-fuel' || action === 'buy-supplies') {
    const app = await deps.openAmmunitionStore?.(vehicle, { mode: action === 'buy-fuel' ? 'fuel' : 'supplies' });
    return { ok: !!app, app };
  }
  if (/^logistics-/.test(String(action))) {
    const svc = deps.logistics, say = r => { if (r.success) notify.info('Done.'); else notify.warn(r.reason); return r; };
    if (action === 'logistics-init') return say(await svc.initialize(vehicle));
    if (action === 'logistics-config-fuel') { const v = await deps.askFuelConfig?.(); return v ? say(await svc.gmConfigureFuel(vehicle, v)) : { ok: false, reason: 'CANCELLED' }; }
    if (action === 'logistics-occupants') { const v = await deps.askOccupants?.(); return v ? say(await svc.gmSetOccupants(vehicle, v)) : { ok: false, reason: 'CANCELLED' }; }
    if (action === 'logistics-consumables') { const v = await deps.askConsumablesRemaining?.(); return v ? say(await svc.gmSetConsumables(vehicle, v)) : { ok: false, reason: 'CANCELLED' }; }
    if (action === 'logistics-fuel-event') { const v = await deps.askFuelEvent?.(svc.fuelEvents); return v ? say(await svc.consumeFuel(vehicle, { ...v, eventId: globalThis.foundry?.utils?.randomID?.() })) : { ok: false, reason: 'CANCELLED' }; }
    return { ok: false, reason: 'LOGISTICS_ACTION_UNKNOWN' };
  }
  if (action === 'buy-ammo-all' || action === 'buy-ammo') {
    // both shortcuts open the same store context; the weapon button preselects that launcher (itemId = the launcher's Item id)
    const { ammunitionOffers } = await import("/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-shop.js");
    const offer = action === 'buy-ammo' ? ammunitionOffers(vehicle).find(r => r.itemId === itemId) : null;
    if (action === 'buy-ammo' && !offer) { notify.warn('That weapon does not use purchased ammunition.'); return { ok: false, reason: 'LAUNCHER_NOT_A_FINITE_AMMUNITION_WEAPON' }; }
    const app = await deps.openAmmunitionStore?.(vehicle, { launcherKey: offer?.launcherKey ?? null });
    return { ok: !!app, app };
  }
  if (action === 'fire-mode-autofire' || action === 'fire-mode-single') {
    const mode = action === 'fire-mode-autofire' ? 'autofire' : 'single';
    const r = await (service.fireMode ?? service).setMode({ vehicle, weapon, mode });
    if (r.ok) notify.info(r.unchanged ? `${weapon.name} is already set to ${mode === 'autofire' ? 'autofire' : 'single fire'}.` : mode === 'autofire' ? `${weapon.name} set to autofire (swift action).` : `${weapon.name} set back to single fire (no action cost).`);
    else notify.warn(`${weapon.name}: ${r.reason}`);
    return r;
  }
  if (action === 'gravity-project') {
    const scene = globalThis.canvas?.scene;
    const area = await deps.askInterdictionArea?.(weapon);
    if (!area) return { ok: false, reason: 'CANCELLED' };
    const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
    const target = interdictionAreaTarget(area, scene);
    const r = await SWSERoll.rollAttack(vehicle, weapon, { target, interdictionArea: area });
    return { ok: !!r, result: r };
  }
  if (action === 'battery-config' || action === 'battery-config-clear') {
    const groupKey = itemId;
    if (action === 'battery-config-clear') {
      const r = await service.ammoConfig.clearBattery({ vehicle, groupKey });
      if (r.success) notify.info('Battery weapon-count certification removed.'); else notify.warn(r.reasons?.join(', ') ?? 'refused');
      return r;
    }
    const input = await deps.askBatteryCount?.(stockBatteryReadinessRows(vehicle).find(x => x.groupKey === groupKey));
    if (!input) return { success: false, reasons: ['CANCELLED'] };
    const r = await service.ammoConfig.configureBattery({ vehicle, groupKey, weaponCount: input.weaponCount, reason: input.reason });
    if (r.success) notify.info('Battery certified for full-battery mode (GM-certified, not canonical).'); else notify.warn(r.reasons?.join(', ') ?? 'refused');
    return r;
  }
  if (action === 'ammo-grant') {
    const r = await VehicleAmmunitionService.gmGrantStartingAmmunition(vehicle, weapon);
    if (r.ok) notify.info(`Granted ${r.units} starting round(s) to ${weapon.name}'s reserve (no credits).`); else notify.warn(r.reason);
    return r;
  }
  if (action === 'ion-bomb-drop') {
    const r = await bombService.drop({ vehicle, weapon });
    if (r.ok) notify.info(`Ion bomb dropped at column ${r.square.col}, row ${r.square.row}: ${r.results.length} target(s) in the 10-square radius.`); else notify.warn(r.reason);
    return r;
  }
  if (action === 'mine-deploy') {
    const r = await mineService.deploy({ vehicle, weapon });
    if (r.ok) notify.info(`Mine deployed at column ${r.mine.square.col}, row ${r.mine.square.row} (swift action).`); else notify.warn(r.reason);
    return r;
  }
  if (/^mine-(notice-pilot|notice-operator|resolve|adjudicate)$/.test(String(action))) {
    // GM-mediated reaction workflow (V-P6C-15): the entering ship is named by the row; the operator is the crew actor whose token the GM has selected
    const scene = globalThis.canvas?.scene, ship = globalThis.game?.actors?.get?.(actorId || globalThis.canvas?.tokens?.controlled?.[0]?.actor?.id) ?? null;
    if (!ship) { notify.warn('That ship is no longer available.'); return { ok: false, reason: 'MINE_SHIP_NOT_FOUND' }; }
    let r;
    if (action === 'mine-resolve') r = await mineService.resolveEntry({ scene, mineId: itemId, actor: ship });
    else if (action === 'mine-adjudicate') r = await mineService.adjudicateEntry({ scene, mineId: itemId, actor: ship });
    else r = await mineService.attemptNotice({ scene, mineId: itemId, vehicle: ship, kind: action === 'mine-notice-pilot' ? 'pilot' : 'operator', crewActor: action === 'mine-notice-operator' ? (globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? null) : null });
    if (!r.ok) notify.warn(r.reason);
    else if (action === 'mine-resolve') notify.info(r.avoided ? 'The mine was avoided.' : `The mine detonated: ${r.results.length} ship(s) attacked.`);
    else if (action === 'mine-adjudicate') notify.info('Entry recorded: make the notice reactions, then resolve.');
    else notify.info(r.success ? `Noticed the mine (${r.total} vs DC ${r.dc}): the pilot may choose another square.` : `Did not notice the mine (${r.total} vs DC ${r.dc}).`);
    return r;
  }
  if (action === 'mine-detonate' || action === 'mine-remove') {
    const scene = globalThis.canvas?.scene;
    const r = action === 'mine-remove' ? await mineService.removeMine({ scene, mineId: itemId }) : await mineService.detonate({ scene, mineId: itemId, command: true, vehicle });
    if (r.ok) notify.info(action === 'mine-remove' ? 'Mine removed.' : `Mine detonated: ${r.results.length} ship(s) in the square.`); else notify.warn(r.reason);
    return r;
  }
  if (action === 'interdiction-toggle' || action === 'interdiction-remove') {
    const scene = globalThis.canvas?.scene, f = readFields(scene).find(x => x.id === itemId);
    const r = action === 'interdiction-remove' ? await removeField({ scene, fieldId: itemId }) : await setActive({ scene, fieldId: itemId, active: !(f?.active) });
    if (!r.ok) notify.warn(r.reason); else notify.info(action === 'interdiction-remove' ? 'Interdiction field removed.' : 'Interdiction field updated.');
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
      try { await runWeaponAction({ action: btn.dataset.weaponAction, itemId: btn.dataset.itemId, actorId: btn.dataset.actorId ?? null, vehicle }, deps); }
      finally { btn.disabled = false; }
    });
  }
}
