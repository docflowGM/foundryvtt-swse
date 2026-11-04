#!/usr/bin/env node
/**
 * Stock (factory) weapon coverage across the published vehicle corpus.
 *
 * Reads the canonical vehicle records and applies the SAME strict group assessment the runtime uses
 * (scripts/domain/vehicles/vehicle-stock-weapon-groups.js). Output: data/audits/vehicles/stock-weapon-coverage.json and
 * docs/audits/vehicles/stock-weapon-coverage.md. --write | --check.
 *
 * Three different claims, never conflated:
 *   SOURCE_VERIFIED     the published group's configuration is established by the source record (damage and operator
 *                       printed and readable, attack total printed);
 *   OFFLINE_EXECUTABLE  the group passes the executability gate AND the automated corpus test
 *                       (tests/vehicle-universal-phase4e-p25-stock-weapons.test.mjs, CORPUS) drives every such group through
 *                       arm -> attack -> damage; that test asserts this file's executable count;
 *   LIVE_VERIFIED       tested in Foundry V13 - false for every vehicle until that testing happens.
 * A vehicle is never labelled playable because its data exists or its weapons display on a sheet.
 */
import fs from 'node:fs';
import { assessStockWeaponGroups } from '../../../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';

const MODE = process.argv[2];
if (!['--write', '--check'].includes(MODE)) { console.error('usage: --write|--check'); process.exit(2); }
const records = fs.readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n').map(JSON.parse);
const CAPITAL = new Set(['Colossal (frigate)', 'Colossal (cruiser)', 'Colossal (station)']);

const vehicles = records.map(r => {
  const groups = assessStockWeaponGroups(r).groups.map(g => ({
    groupKey: g.groupKey, label: g.label, printedAttackTotal: g.attackBonusPrinted, printedDamage: g.damage?.raw ?? null, damageType: g.damage?.type ?? null, payloadCount: Number.isFinite(g.evidence?.payloadCount) ? g.evidence.payloadCount : null,
    kinds: [g.battery ? 'weapon-battery' : null, /fire[- ]?linked/i.test(g.label ?? '') || g.evidence?.fireLink !== undefined || g.evidence?.fireLinkOption !== undefined ? 'fire-linked' : null,
      g.reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED') || g.ammunition ? 'ammunition-limited' : null, g.reasons.includes('STOCK_DAMAGE_AREA_OR_SPLASH') || g.area ? 'area-or-splash' : null, g.damage?.type === 'ion' ? 'ion' : null].filter(Boolean),
    ammunitionStatus: g.ammunition ? 'complete' : g.ammunitionPending ? 'allocation-required' : g.reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED') ? 'incomplete' : null,
    scaleRestriction: g.area ? 'starship-scale-only' : null, area: g.area ? { kind: g.area.kind, squares: g.area.squares } : null,
    operator: g.operator,
    sourceVerified: !!(g.damage && g.operator && g.attackBonusPrinted !== null && (!g.battery || g.battery.independentWeapon)),
    offlineExecutable: g.executable, liveVerified: false,
    itemReadiness: g.executable ? 'ARMED_AT_IMPORT' : 'NOT_ARMED', crewReadiness: g.executable ? `${g.operator} station (generic or assigned crew)` : 'NOT_APPLICABLE',
    attackReadiness: g.executable ? 'OFFLINE_EXECUTABLE' : 'REFUSED', damageReadiness: g.executable ? 'OFFLINE_EXECUTABLE' : 'REFUSED',
    battery: g.battery ? { gunners: g.battery.gunners, weaponCount: g.battery.weaponCount, fullBattery: g.battery.fullBattery, independentWeapon: g.battery.independentWeapon } : undefined,
    executableModes: g.executable ? (g.modes ? Object.entries(g.modes).filter(([, m]) => m.executable).map(([k]) => k) : ['single']) : [],
    capitalShipPenaltyApplies: g.executable && CAPITAL.has(r.classification.printedSize),
    refusals: g.reasons
  }));
  const exec = groups.filter(g => g.offlineExecutable).length;
  return { sourceEntryKey: r.identity.sourceEntryKey, name: r.identity.name, book: r.publication.book, page: r.publication.page,
    category: r.classification.primaryCategory, size: r.classification.printedSize,
    groupCount: groups.length, sourceVerifiedGroups: groups.filter(g => g.sourceVerified).length, offlineExecutableGroups: exec,
    status: exec === 0 ? 'NO_EXECUTABLE_STOCK_GROUP' : exec === groups.length ? 'OFFLINE_EXECUTABLE_ALL_GROUPS' : 'OFFLINE_EXECUTABLE_PARTIAL',
    liveVerified: false, groups };
});

const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const allGroups = vehicles.flatMap(v => v.groups.map(g => ({ ...g, book: v.book, category: v.category })));
const reasons = {};
for (const g of allGroups) for (const r of g.refusals) reasons[r] = (reasons[r] ?? 0) + 1;
const byBook = {};
for (const v of vehicles) { const b = byBook[v.book] ??= { vehicles: 0, groups: 0, executableGroups: 0, vehiclesWithExecutable: 0 }; b.vehicles++; b.groups += v.groupCount; b.executableGroups += v.offlineExecutableGroups; if (v.offlineExecutableGroups) b.vehiclesWithExecutable++; }
const byCategory = {};
for (const v of vehicles) { const b = byCategory[v.category] ??= { vehicles: 0, vehiclesWithExecutable: 0 }; b.vehicles++; if (v.offlineExecutableGroups) b.vehiclesWithExecutable++; }

const doc = {
  schema: 'swse.vehicle.stock-weapon-coverage.v1',
  note: 'Generated by tools/audits/vehicles/build-stock-weapon-coverage.mjs from the canonical records and the runtime executability gate. OFFLINE_EXECUTABLE counts are asserted by the p25 CORPUS test; LIVE_VERIFIED is false everywhere.',
  totals: {
    vehicles: vehicles.length, groups: allGroups.length,
    sourceVerifiedGroups: allGroups.filter(g => g.sourceVerified).length,
    offlineExecutableGroups: allGroups.filter(g => g.offlineExecutable).length,
    vehiclesWithOfflineExecutableGroup: vehicles.filter(v => v.offlineExecutableGroups > 0).length,
    vehiclesAllGroupsExecutable: vehicles.filter(v => v.status === 'OFFLINE_EXECUTABLE_ALL_GROUPS').length,
    liveVerifiedVehicles: 0
  },
  // Core p. 170 weapon batteries (printed as "battery (N gunners)"). A group is counted ONCE however many modes it supports:
  // FULL-BATTERY needs the printed gunners and the printed number of identical weapons (never inferred); INDEPENDENT-WEAPON
  // (one weapon, no assistance, no margin hits) needs only the printed gunners and a printed total that reconciles exactly.
  batteries: {
    printedBatteryGroups: allGroups.filter(g => g.battery).length,
    weaponCountPrinted: allGroups.filter(g => g.battery && g.battery.weaponCount !== null).length,
    executableGroups: allGroups.filter(g => g.battery && g.offlineExecutable).length,
    fullBatteryExecutable: allGroups.filter(g => g.executableModes.includes('full-battery')).length,
    independentWeaponExecutable: allGroups.filter(g => g.executableModes.includes('independent-weapon')).length,
    independentWeaponOnly: allGroups.filter(g => g.executableModes.length === 1 && g.executableModes[0] === 'independent-weapon').length,
    bothModes: allGroups.filter(g => g.executableModes.length === 2).length
  },
  // The kinds of weapon the source distinguishes. A group can belong to several (overlapping, never summed): an ion battery,
  // a fire-linked missile launcher. Only the source-certified classification decides: a name can only deny.
  kinds: Object.fromEntries(['weapon-battery', 'fire-linked', 'ammunition-limited', 'area-or-splash', 'ion'].map(k => [k, { groups: allGroups.filter(g => g.kinds.includes(k)).length, executable: allGroups.filter(g => g.kinds.includes(k) && g.offlineExecutable).length }])),
  // Launchers and finite ammunition (P6C-3D). Core: the statblock "Payload" is the vehicle's COMPLEMENT of missiles/torpedoes; a
  // launcher's capacity is a different figure (Starships of the Galaxy pp. 45-46).
  ammunition: {
    limitedGroups: allGroups.filter(g => g.kinds.includes('ammunition-limited')).length,
    payloadPrinted: allGroups.filter(g => g.kinds.includes('ammunition-limited') && g.payloadCount !== null).length,
    complete: allGroups.filter(g => g.ammunitionStatus === 'complete').length,
    completeAndExecutable: allGroups.filter(g => g.ammunitionStatus === 'complete' && g.offlineExecutable).length,
    pendingGmAllocation: allGroups.filter(g => g.ammunitionStatus === 'allocation-required').length,
    incomplete: allGroups.filter(g => g.ammunitionStatus === 'incomplete').length,
    executable: allGroups.filter(g => g.kinds.includes('ammunition-limited') && g.offlineExecutable).length
  },
  // Ordinary splash / burst (Core, Vehicle Combat): resolved against a single target at STARSHIP scale; refused at character scale.
  area: {
    ordinaryAreaGroups: allGroups.filter(g => g.area).length,
    executableAtStarshipScaleOnly: allGroups.filter(g => g.area && g.offlineExecutable).length
  },
  // Core pp. 159-160 ion damage: typed ONLY where the source states it (printed damage line / structured evidence).
  ion: {
    typedByTheSource: allGroups.filter(g => g.damageType === 'ion').length,
    offlineExecutable: allGroups.filter(g => g.damageType === 'ion' && g.offlineExecutable).length
  },
  refusalReasons: Object.fromEntries(Object.entries(reasons).sort((a, b) => b[1] - a[1])),
  byBook, byCategory, vehicles
};
const json = JSON.stringify(doc, null, 1) + '\n';

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const t = doc.totals;
let md = `# Stock weapon coverage (published vehicles)\n\nGenerated by \`tools/audits/vehicles/build-stock-weapon-coverage.mjs\`; do not edit. Data: \`data/audits/vehicles/stock-weapon-coverage.json\`.\n\n`;
md += `Three claims are kept apart: **SOURCE_VERIFIED** (the published configuration is established), **OFFLINE_EXECUTABLE** (the group passes the runtime gate and the automated corpus test drives it through arm -> attack -> damage) and **LIVE_VERIFIED** (tested in Foundry V13: none yet).\n\n`;
md += `| Measure | Count |\n|---|---|\n| Published vehicles | ${t.vehicles} |\n| Published attack groups | ${t.groups} |\n| Groups SOURCE_VERIFIED | ${t.sourceVerifiedGroups} (${pct(t.sourceVerifiedGroups, t.groups)}%) |\n| Groups OFFLINE_EXECUTABLE | ${t.offlineExecutableGroups} (${pct(t.offlineExecutableGroups, t.groups)}%) |\n| Vehicles with at least one OFFLINE_EXECUTABLE group | ${t.vehiclesWithOfflineExecutableGroup} (${pct(t.vehiclesWithOfflineExecutableGroup, t.vehicles)}%) |\n| Vehicles with every group executable | ${t.vehiclesAllGroupsExecutable} |\n| Vehicles LIVE_VERIFIED | ${t.liveVerifiedVehicles} |\n\n`;
const b = doc.batteries;
md += `## Weapon batteries (Core p. 170)\n\n| Measure | Groups |\n|---|---|\n| Printed weapon batteries ("battery (N gunners)") | ${b.printedBatteryGroups} |\n| ... printing the number of identical weapons | ${b.weaponCountPrinted} |\n| ... OFFLINE_EXECUTABLE in at least one mode (each group counted once) | ${b.executableGroups} |\n| ... full-battery mode executable (assistance, margin hits; needs the printed weapon count) | ${b.fullBatteryExecutable} |\n| ... independent-weapon mode executable (one weapon; no assistance, no margin hits) | ${b.independentWeaponExecutable} |\n| ... independent-weapon ONLY | ${b.independentWeaponOnly} |\n| ... both modes | ${b.bothModes} |\n\nThe printed total of a battery already contains the printed gunners' assistance (+2 per assisting gunner). Full-battery mode applies it once and adds margin hits capped by the printed weapon count; independent-weapon mode removes exactly that assistance. The two counts are independent quantities and neither is inferred from the other. Fire-linked weapons that a statblock calls "batteries" are not weapon batteries (Starships of the Galaxy, Fire-Linked Weapons). Named gunners on a full battery are refused (BATTERY_ASSIGNED_CREW_ROSTER_UNMODELED). Refusal reasons overlap.\n\n`;
const kinds = doc.kinds, am = doc.ammunition;
md += `## Weapon kinds the source distinguishes (overlapping; never summed)\n\n| Kind | Groups | OFFLINE_EXECUTABLE |\n|---|---|---|\n${Object.entries(kinds).map(([k, v]) => `| ${k} | ${v.groups} | ${v.executable} |`).join('\n')}\n\nFire-linked weapons are not weapon batteries (Starships of the Galaxy, Fire-Linked Weapons) and get no battery rules. Ordinary energy weapons are every executable group that is none of these kinds.\n\n`;
md += `## Launchers and finite ammunition (P6C-3D)\n\n| Measure | Groups |\n|---|---|\n| Ammunition-limited groups | ${am.limitedGroups} |\n| ... printing a payload count | ${am.payloadPrinted} |\n| COMPLETE family (payload printed, launcher identified by its exact designation with a certified capacity, ONE launcher verified) | ${am.complete} |\n| ... of those OFFLINE_EXECUTABLE | ${am.completeAndExecutable} |\n| Payload and launcher identified, launcher count NOT verified (needs a GM-certified allocation; not armed, not counted) | ${am.pendingGmAllocation} |\n| Incomplete (no printed payload and/or launcher not identified) | ${am.incomplete} |\n| OFFLINE_EXECUTABLE ammunition-limited groups | ${am.executable} |\n\nThe ledger (payload, capacity, loaded, reserve, expended; conservation payload = loaded + reserve + expended) runs outside the optional blaster-charge house rule; a launch spends one unit atomically and idempotently per attack, a refused or failed attack spends nothing, the follow-up of a locked-on projectile spends nothing, and reloading is a GM operation that moves reserve to loaded. No published group has a verified single launcher yet, so none is executable; the machinery is proven on a digest-verified synthetic fixture (tests p30).\n\n`;
const ar = doc.area;
md += `## Ordinary splash / burst (starship-scale rule)\n\n| Measure | Groups |\n|---|---|\n| Groups printing an ordinary "N-square" splash or burst | ${ar.ordinaryAreaGroups} |\n| ... OFFLINE_EXECUTABLE (starship scale only) | ${ar.executableAtStarshipScaleOnly} |\n\nPUBLISHED_RULE (Core, Vehicle Combat): area attacks, including splash and burst-radius weapons, are resolved as attacks on a single target in starship scale unless the weapon is specifically listed as having a starship-scale area attack. The encounter is in starship scale only when it involves vehicles only; with characters on foot it is character scale, where the multi-target area engine does not exist, so these attacks are refused. Explicit starship-scale areas, unsized radii and hit/miss riders stay refused.\n\n`;
const ion = doc.ion;
md += `## Ion damage (Core pp. 159-160)\n\n| Measure | Groups |\n|---|---|\n| Groups whose source types the damage as ion (printed damage line / evidence) | ${ion.typedByTheSource} |\n| ... OFFLINE_EXECUTABLE (also passing every other gate) | ${ion.offlineExecutable} |\n\nA weapon name alone never types damage as ion: a group named "ion" whose printed damage line does not say ion stays refused (STOCK_DAMAGE_ION_UNVERIFIED). Target-side ordering with shield rating and damage reduction follows the existing damage engine pending owner question V-P6C-04.\n\n`;
md += `## Why groups are refused (a group can have several reasons)\n\n| Reason | Groups |\n|---|---|\n${Object.entries(doc.refusalReasons).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n`;
md += `## By book\n\n| Book | Vehicles | Groups | Executable groups | Vehicles with an executable group |\n|---|---|---|---|---|\n${Object.entries(byBook).map(([k, v]) => `| ${k} | ${v.vehicles} | ${v.groups} | ${v.executableGroups} | ${v.vehiclesWithExecutable} |`).join('\n')}\n\n`;
md += `## By category\n\n| Category | Vehicles | With an executable group |\n|---|---|---|\n${Object.entries(byCategory).sort((a, b) => b[1].vehicles - a[1].vehicles).map(([k, v]) => `| ${k} | ${v.vehicles} | ${v.vehiclesWithExecutable} |`).join('\n')}\n\n`;
md += `## Vehicles with executable stock weapons\n\n| Vehicle | Book | Groups executable / printed | Executable groups |\n|---|---|---|---|\n${vehicles.filter(v => v.offlineExecutableGroups).map(v => `| ${v.name} | ${v.book} p. ${v.page} | ${v.offlineExecutableGroups} / ${v.groupCount} | ${v.groups.filter(g => g.offlineExecutable).map(g => `${g.label} (${g.printedDamage}, ${g.operator}, +${g.printedAttackTotal})`).join('; ')} |`).join('\n')}\n`;

const outputs = [['data/audits/vehicles/stock-weapon-coverage.json', json], ['docs/audits/vehicles/stock-weapon-coverage.md', md]];
if (MODE === '--write') { for (const [f, c] of outputs) fs.writeFileSync(f, c); console.log(JSON.stringify(t)); }
else {
  const stale = outputs.filter(([f, c]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== c).map(o => o[0]);
  if (stale.length) { console.error('stale: ' + stale.join(', ') + ' (run --write)'); process.exit(1); }
  console.log('stock weapon coverage up to date ' + JSON.stringify(t));
}
