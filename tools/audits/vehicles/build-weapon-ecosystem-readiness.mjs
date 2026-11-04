#!/usr/bin/env node
/**
 * Unified weapon-family readiness matrix (Complete Weapon Ecosystem Addendum).
 *
 * Joins the AUTHORED inventory (data/audits/vehicles/weapon-ecosystem-inventory.json: families, configurations, the facts the
 * sourcebooks establish, and named blockers) with facts COMPUTED from code and data:
 *   - source certification: data/vehicle-modifications/certification*.json + p6a/reconciliation.json;
 *   - aftermarket installation: the certified effects registry (scripts/domain/vehicles/vehicle-modification-effects.js) and the
 *     test file that exercises it (which must exist);
 *   - stock execution: data/audits/vehicles/stock-weapon-coverage.json (the runtime executability gate's output).
 * Stock-group coverage and aftermarket-catalog coverage are reported SEPARATELY and never added together.
 *
 * Stock groups are assigned to families by their printed LABEL through the inventory's regular expressions. That classification
 * is for REPORTING ONLY; it never decides a mechanic (the runtime gate reads the structured source record).
 *
 * Usage: node tools/audits/vehicles/build-weapon-ecosystem-readiness.mjs --write | --check
 */
import fs from 'node:fs';
import { EFFECTS } from '../../../scripts/domain/vehicles/vehicle-modification-effects.js';

const MODE = process.argv[2];
if (!['--write', '--check'].includes(MODE)) { console.error('usage: --write|--check'); process.exit(2); }
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

const inventory = readJson('data/audits/vehicles/weapon-ecosystem-inventory.json');
const catalog = readJson('data/vehicle-modifications/weapon-systems.json');
const cert = { ...readJson('data/vehicle-modifications/certification-p6a.json').rows, ...readJson('data/vehicle-modifications/certification.json').rows };
const recon = Object.fromEntries(readJson('data/audits/vehicles/p6a/reconciliation.json').records.map(r => [r.catalogId, r]));
const coverage = readJson('data/audits/vehicles/stock-weapon-coverage.json');
const ranges = readJson('data/vehicle-weapon-ranges.json');
const catalogById = new Map(catalog.map(c => [c.id, c]));
const rangeSlugs = new Set(ranges.map(r => r.slug));

/** Stock partition: the FIRST matching family in this order owns a group (most specific first). Overlay kinds never own a group. */
const PARTITION_ORDER = ['hapan-triple-ion-cannon', 'ion-pulse-cannon', 'superlaser', 'autoblasters', 'shieldbuster-torpedoes', 'armor-piercing-concussion-missiles',
  'proton-grenade-launcher', 'proton-torpedoes', 'concussion-missiles', 'gravity-mines', 'space-mines', 'ion-bombs', 'tractor-beams', 'gravity-well-projectors', 'docking-guns',
  'anti-aircraft-flak-pod', 'composite-beam-cannon', 'microtractor-pressor', 'harpoon-gun', 'discord-missile', 'chaff-gun', 'defoliator', 'energy-bomblet-generator',
  'heavy-ordnance-launcher', 'droid-jammer', 'mass-driver-and-projectile-cannons', 'laser-cannons', 'blaster-cannons', 'turbolasers', 'ion-cannons'];
const OVERLAY_KINDS = new Set(['configuration', 'attack-mode']);
const byId = new Map(inventory.rows.map(r => [r.id, r]));
for (const id of PARTITION_ORDER) if (!byId.has(id)) throw new Error('partition names an unknown family ' + id);
const matchers = row => (row.stockLabelPatterns ?? []).map(p => new RegExp(p, 'i'));
const partitionOf = label => PARTITION_ORDER.find(id => matchers(byId.get(id)).some(re => re.test(label))) ?? null;

const stockGroups = coverage.vehicles.flatMap(v => (v.groups ?? []).map(g => ({ ...g, sourceEntryKey: v.sourceEntryKey })));
const owned = new Map(), unclassified = [];
for (const g of stockGroups) { const id = partitionOf(g.label); if (id) (owned.get(id) ?? owned.set(id, []).get(id)).push(g); else unclassified.push(g); }
const tally = gs => ({ groups: gs.length, offlineExecutable: gs.filter(g => g.offlineExecutable).length, vehicles: new Set(gs.map(g => g.sourceEntryKey)).size,
  vehiclesWithExecutableGroup: new Set(gs.filter(g => g.offlineExecutable).map(g => g.sourceEntryKey)).size });

const certRank = s => (s === 'MECHANIC_SPECIFIED' ? 2 : s === 'SOURCE_VERIFIED' ? 1 : 0);
const defaultWeaponTest = 'tests/vehicle-universal-phase4e-p21-weapon-slice.test.mjs';

const rows = inventory.rows.map(row => {
  const cats = row.catalogIds.map(id => {
    const c = catalogById.get(id); if (!c) throw new Error(`inventory names an unknown catalog id ${id}`);
    const status = cert[id]?.status ?? null;
    // a weapon OPTION (point defense) is purchased WITH an eligible weapon; it counts as installed-as-an-option, tested by its own file
    const installable = (EFFECTS[id]?.kind === 'weapon' || EFFECTS[id]?.kind === 'weapon-option') && status === 'MECHANIC_SPECIFIED';
    const testFile = installable ? (EFFECTS[id].testFile ?? defaultWeaponTest) : null;
    return { id, category: c.category, certification: status, reconciliation: recon[id]?.disposition ?? null, installable, testFile };
  });
  const weaponRows = cats.filter(c => c.category === 'Weapon');
  // Certification is judged on the INSTALLABLE rows (the weapons); consumable ammunition rows are SOURCE_VERIFIED by design (V-P6A-06)
  // and are reported on their own line.
  const judged = weaponRows.length ? weaponRows : cats;
  const sourceCertification = !cats.length ? 'NO_CATALOG_ROW'
    : judged.every(c => c.certification === 'MECHANIC_SPECIFIED') ? 'MECHANIC_SPECIFIED'
    : judged.every(c => certRank(c.certification) >= 1) ? 'SOURCE_VERIFIED'
    : judged.some(c => certRank(c.certification) >= 1) ? 'PARTIALLY_SOURCE_VERIFIED' : 'UNCERTIFIED';
  const installed = weaponRows.filter(c => c.installable);
  for (const c of installed) if (!fs.existsSync(c.testFile)) throw new Error(`${c.id}: effect test ${c.testFile} does not exist`);
  const aftermarket = !weaponRows.length ? 'NOT_APPLICABLE' : installed.length === weaponRows.length ? 'OFFLINE_TESTED_INSTALL_FIRE_REMOVE'
    : installed.length ? 'PARTIAL' : 'NOT_INSTALLABLE';
  const stock = OVERLAY_KINDS.has(row.kind) ? { ...tally(stockGroups.filter(g => matchers(row).some(re => re.test(g.label)))), basis: 'OVERLAY: also counted in its base-weapon row' }
    : { ...tally(owned.get(row.id) ?? []), basis: 'PARTITION: owned by this family' };
  const DAMAGE_LABEL = { 'ordinary-damage': 'ORDINARY_DAMAGE', 'ion-damage': 'ION_LIFECYCLE', 'ammunition-limited-damage': 'AMMUNITION_LIMITED_DAMAGE' };
  const plain = row.mechanic in DAMAGE_LABEL;
  const overlay = OVERLAY_KINDS.has(row.kind);
  // A configuration is "STOCK_PRINTED_VALUES_ONLY" when published statblocks print its combined result (e.g. "double laser cannons 4d10x2")
  // and the gate runs those printed numbers as written: the configuration itself (buying it, switching it, its rules) is not implemented.
  const attack = aftermarket === 'OFFLINE_TESTED_INSTALL_FIRE_REMOVE' && (plain || overlay) ? 'OFFLINE_TESTED'
    : overlay ? (row.evidence?.stock ? 'OFFLINE_TESTED_STOCK_ONLY' : stock.offlineExecutable > 0 ? 'STOCK_PRINTED_VALUES_ONLY' : 'NOT_IMPLEMENTED')
    : stock.offlineExecutable > 0 && plain ? 'OFFLINE_TESTED_STOCK_ONLY' : 'NOT_IMPLEMENTED';
  const damageOrEffect = attack === 'NOT_IMPLEMENTED' ? 'NOT_IMPLEMENTED' : `${attack}:${overlay ? 'CONFIGURATION' : DAMAGE_LABEL[row.mechanic] ?? 'SPECIAL'}`;
  const evidence = row.evidence ?? {};
  for (const [k, f] of Object.entries(evidence)) if (!fs.existsSync(f)) throw new Error(`${row.id}: evidence ${k} -> ${f} does not exist`);
  for (const code of row.blockers) if (!inventory.blockerCatalog[code]) throw new Error(`${row.id}: unknown blocker ${code}`);
  const rangeStatus = row.rangeSlug ? (rangeSlugs.has(row.rangeSlug) ? 'TABLE_10_2_ROW_PRESENT' : 'RANGE_ROW_MISSING') : 'NO_PUBLISHED_RANGE_ROW';
  const open = row.blockers.map(code => ({ code, ...inventory.blockerCatalog[code] }));
  return {
    id: row.id, name: row.name, kind: row.kind, mechanic: row.mechanic, sources: row.sources, established: row.established,
    sourceCertification, catalogRows: cats,
    stock, aftermarket: { status: aftermarket, weaponRows: weaponRows.length, installable: installed.length, consumableRows: cats.length - weaponRows.length },
    attackExecution: attack, damageOrEffectExecution: damageOrEffect,
    resourceTracking: row.resources, rangeTable: { slug: row.rangeSlug ?? null, status: rangeStatus },
    configurations: row.applicableConfigurations, evidence,
    liveFoundryVerification: 'NOT_VERIFIED',
    overall: open.length ? 'NOT_FULLY_OPERATIONAL' : 'OFFLINE_OPERATIONAL_LIVE_PENDING',
    openBlockers: open, nextSlice: row.nextSlice
  };
});

// A base weapon is not "fully operational" while a configuration or mode its source allows for it is not implemented: the family's own
// attack, damage and range can be tested and the family still be incomplete.
const CONFIG_ROW = { double: 'double-cannons', triple: 'triple-cannons', quad: 'quad-cannons', 'fire-linked': 'fire-linked-weapons', 'optional-fire-link': 'optional-fire-link',
  'cannon-enhancements': 'cannon-enhancements', 'point-defense': 'point-defense', autofire: 'autofire', autoblaster: 'autoblasters', 'launcher-capacity': 'launcher-capacity' };
const rowById = new Map(rows.map(r => [r.id, r]));
for (const r of rows) {
  if (OVERLAY_KINDS.has(r.kind) || !r.configurations.length) continue;
  const missing = r.configurations.filter(c => !['OFFLINE_TESTED', 'OFFLINE_TESTED_STOCK_ONLY'].includes(rowById.get(CONFIG_ROW[c])?.attackExecution));
  if (!missing.length) continue;
  r.openBlockers.push({ code: 'APPLICABLE_CONFIGURATIONS_NOT_IMPLEMENTED', class: 'ENGINEERING', text: `Configurations or modes the source allows for this family that have no tested implementation: ${missing.join(', ')}.` });
  r.overall = 'NOT_FULLY_OPERATIONAL';
}

const partitioned = PARTITION_ORDER.concat(inventory.rows.filter(r => !OVERLAY_KINDS.has(r.kind) && !PARTITION_ORDER.includes(r.id) && (r.stockLabelPatterns ?? []).length).map(r => r.id));
const stockPartitionTotals = tally([...owned.values()].flat());
const output = {
  schema: 'swse.vehicle.weapon-ecosystem-readiness.v1',
  note: 'GENERATED by tools/audits/vehicles/build-weapon-ecosystem-readiness.mjs from the authored inventory and computed facts. Stock-group coverage and aftermarket-catalog coverage are separate columns and are never summed. LIVE_VERIFIED is false for every row. A family is OFFLINE_OPERATIONAL_LIVE_PENDING only with zero open blockers.',
  totals: {
    inventoryRows: rows.length,
    catalogWeaponRows: catalog.length,
    catalogRowsCoveredByInventory: new Set(rows.flatMap(r => r.catalogRows.map(c => c.id))).size,
    aftermarketInstallableRows: rows.flatMap(r => r.catalogRows).filter(c => c.installable).length,
    stockGroups: stockGroups.length,
    stockGroupsOwnedByAFamily: stockPartitionTotals.groups,
    stockGroupsUnclassified: unclassified.length,
    stockOfflineExecutableGroups: stockGroups.filter(g => g.offlineExecutable).length,
    familiesFullyOperationalOffline: rows.filter(r => r.overall === 'OFFLINE_OPERATIONAL_LIVE_PENDING').length,
    liveVerifiedFamilies: 0
  },
  unclassifiedStockLabels: Object.entries(unclassified.reduce((m, g) => ((m[g.label.toLowerCase()] = (m[g.label.toLowerCase()] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([label, groups]) => ({ label, groups })),
  blockerCatalog: inventory.blockerCatalog,
  rows
};

const cell = v => String(v).replace(/\|/g, '\\|');
const ABBREV = { 'Starships of the Galaxy': 'SotG', 'Core Rulebook': 'Core', 'Clone Wars Campaign Guide': 'CWCG', 'Rebellion Era Campaign Guide': 'RECG', 'Legacy Era Campaign Guide': 'LECG', 'Galaxy at War': 'GaW', 'Threats of the Galaxy': 'ToG' };
const shortSource = sources => sources.slice(0, 2).map(x => `${ABBREV[x.book] ?? x.book}${x.printedPages ? ` p. ${x.printedPages}` : ''}${/Table 3-5|Table 10-2/.test(x.section) ? ` (${x.section.match(/Table [\d-]+/)[0]})` : ''}`).join('; ');
const md = [
  '# Weapon ecosystem readiness matrix',
  '',
  'Generated by `tools/audits/vehicles/build-weapon-ecosystem-readiness.mjs` from `data/audits/vehicles/weapon-ecosystem-inventory.json` (authored) and facts computed from code and data. **Stock-group coverage and aftermarket-catalog coverage are separate columns; they are never added together.** OFFLINE tests are not live Foundry V13 verification (0 families live-verified). "Configurations / modes" lists the configurations the source allows for the family, subject to the restrictions in its established facts (for example only light ion cannons and light turbolasers autofire; only blaster cannons, laser cannons and light ion cannons can be point-defense weapons).',
  '',
  '## Totals',
  '',
  ...Object.entries(output.totals).map(([k, v]) => `- ${k}: **${v}**`),
  '',
  '## Matrix',
  '',
  '| Family | Kind | Published source | Source certification | Stock groups (executable / total) | Aftermarket (installable / weapon rows) | Attack | Damage or effect | Resources | Configurations / modes | Live | Open blockers |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${cell(r.name)} | ${r.kind} | ${cell(shortSource(r.sources))} | ${r.sourceCertification} | ${r.stock.offlineExecutable} / ${r.stock.groups}${r.stock.basis.startsWith('OVERLAY') ? ' (overlay)' : ''} | ${r.aftermarket.status === 'NOT_APPLICABLE' ? 'n/a' : `${r.aftermarket.installable} / ${r.aftermarket.weaponRows}`} | ${r.attackExecution} | ${cell(r.damageOrEffectExecution)} | ${r.resourceTracking} | ${r.configurations.join(', ') || '-'} | ${r.liveFoundryVerification} | ${r.openBlockers.map(b => b.code).join(', ') || '-'} |`),
  '',
  '## Blockers',
  '',
  ...Object.entries(inventory.blockerCatalog).map(([code, b]) => `- **${code}** (${b.class}): ${b.text}`),
  '',
  '## Stock groups not owned by any family (label did not match)',
  '',
  ...(output.unclassifiedStockLabels.length ? output.unclassifiedStockLabels.map(u => `- ${u.label}: ${u.groups}`) : ['- none']),
  '',
  '## Established source facts, by family',
  '',
  ...rows.flatMap(r => [`### ${r.name}`, '', `Sources: ${r.sources.map(s => `${s.book}${s.printedPages ? ` pp. ${s.printedPages}` : ''} - ${s.section}`).join('; ')}`, '', ...r.established.map(e => `- ${e}`), ''])
].join('\n');

const files = { 'data/audits/vehicles/weapon-ecosystem-readiness.json': JSON.stringify(output, null, 1) + '\n', 'docs/audits/vehicles/weapon-ecosystem-readiness.md': md + '\n' };
let stale = false;
for (const [path, text] of Object.entries(files)) {
  if (MODE === '--write') fs.writeFileSync(path, text);
  else if (!fs.existsSync(path) || fs.readFileSync(path, 'utf8') !== text) { console.error(`stale: ${path}`); stale = true; }
}
if (stale) process.exit(1);
console.log(MODE === '--write' ? 'wrote' : 'up to date', JSON.stringify(output.totals));
