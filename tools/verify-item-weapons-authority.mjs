#!/usr/bin/env node
/**
 * Verifies data/audits/item-canonicalization-rolling-authority.json (Phase 0-1 weapons,
 * Phase 0-2 armor, Phase 0-3A equipment) against the weapons, armor and equipment packs. Read-only. Fails on any drift between the certified authority
 * and the pack so that execution phases cannot silently run against a changed repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auth = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/item-canonicalization-rolling-authority.json'), 'utf8'));
const p = auth.phases['0-1-weapons'];
const pack = new Map(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8').split('\n').filter(Boolean)
  .map((l) => JSON.parse(l)).filter((r) => r.type === 'weapon').map((r) => [r._id, r.name]));
const errors = [];
const fail = (m) => errors.push(m);

const count = (arr, f) => arr.reduce((m, x) => { m[f(x)] = (m[f(x)] || 0) + 1; return m; }, {});
if (p.canonicalWeapons.length !== p.canonicalCounts.weapons) fail('canonical count mismatch');
if (JSON.stringify(count(p.canonicalWeapons, (r) => r.phase0Disposition)) !== JSON.stringify(p.canonicalCounts.byDisposition)) fail('canonical disposition counts mismatch');
if (pack.size !== p.repoSnapshot.repoWeaponRecords) fail(`pack has ${pack.size} weapon records, authority expects ${p.repoSnapshot.repoWeaponRecords}`);

const covered = new Map();
for (const r of p.repoWeaponRecords) {
  if (!pack.has(r.id)) fail(`repo record ${r.id} not in pack`);
  else if (pack.get(r.id) !== r.name) fail(`name drift ${r.id}: authority "${r.name}" vs pack "${pack.get(r.id)}"`);
  covered.set(r.id, (covered.get(r.id) || 0) + 1);
}
for (const id of pack.keys()) if (covered.get(id) !== 1) fail(`pack record ${id} covered ${covered.get(id) || 0} times`);
for (const c of p.canonicalWeapons) {
  const m = c.repo;
  if (c.phase0Disposition === 'ADD') { if (m.present) fail(`ADD ${c.canonicalName} claims a repo match`); continue; }
  if (!pack.has(m.matchedId)) { fail(`${c.canonicalName}: ${m.matchedId} not in pack`); continue; }
  if (c.phase0Disposition === 'KEEP' && pack.get(m.matchedId) !== c.canonicalName) fail(`KEEP ${c.canonicalName} != repo name ${pack.get(m.matchedId)}`);
  if (c.phase0Disposition === 'EDIT' && pack.get(m.matchedId) === c.canonicalName) fail(`EDIT ${c.canonicalName} already matches repo name`);
}
const names = p.canonicalWeapons.map((c) => c.canonicalName);
if (new Set(names).size !== names.length) fail('duplicate canonical names');

// ---- Phase 0-2 armor ----
const arm = auth.phases['0-2-armor'];
if (arm) {
  const armorPack = new Map(fs.readFileSync(path.join(ROOT, 'packs/armor.db'), 'utf8').split('\n').filter(Boolean)
    .map((l) => JSON.parse(l)).map((r) => [r._id, r.name]));
  if (armorPack.size !== arm.repoSnapshot.repoArmorRecords) fail(`armor pack has ${armorPack.size} records, authority expects ${arm.repoSnapshot.repoArmorRecords}`);
  const seen = new Map();
  for (const c of arm.canonicalArmor) {
    const id = c.repo.matchedId;
    seen.set(id, (seen.get(id) || 0) + 1);
    if (!armorPack.has(id)) { fail(`armor ${c.canonicalName}: ${id} not in pack`); continue; }
    const executed = arm.execution?.status === 'EXECUTED_RENAMES';
    // matchedName is the pre-rename repo name; once renames are executed the pack must carry the canonical name.
    const expected = executed && c.phase0Disposition === 'EDIT' ? c.canonicalName : c.repo.matchedName;
    if (armorPack.get(id) !== expected) fail(`armor name drift ${id}: expected "${expected}" vs pack "${armorPack.get(id)}"`);
    if (c.phase0Disposition === 'KEEP' && armorPack.get(id) !== c.canonicalName) fail(`armor KEEP ${c.canonicalName} != repo name`);
    if (executed && armorPack.get(id) !== c.canonicalName) fail(`armor ${c.canonicalName} not canonical after executed renames`);
  }
  for (const r of arm.repoOnlyArmor) {
    seen.set(r.repoId, (seen.get(r.repoId) || 0) + 1);
    if (armorPack.get(r.repoId) !== r.repoName) fail(`armor REVIEW record ${r.repoId} missing or renamed`);
  }
  for (const id of armorPack.keys()) if (seen.get(id) !== 1) fail(`armor pack record ${id} covered ${seen.get(id) || 0} times`);
  // Aggregate/subpack name parity (subpacks are derived mirrors of the aggregate).
  for (const sp of ['armor-light', 'armor-medium', 'armor-heavy', 'armor-shields']) {
    for (const r of fs.readFileSync(path.join(ROOT, `packs/${sp}.db`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))) {
      if (armorPack.get(r._id) !== r.name) fail(`armor subpack ${sp} ${r._id}: "${r.name}" vs aggregate "${armorPack.get(r._id)}"`);
    }
  }
  const dispo = count(arm.canonicalArmor, (r) => r.phase0Disposition);
  if (JSON.stringify(dispo) !== JSON.stringify(arm.canonicalCounts.byDisposition)) fail(`armor disposition counts ${JSON.stringify(dispo)} != ${JSON.stringify(arm.canonicalCounts.byDisposition)}`);
  if (!errors.length) console.log(`armor authority OK: ${arm.canonicalArmor.length} canonical + ${arm.repoOnlyArmor.length} REVIEW cover ${armorPack.size} repo records`);
}

// ---- Phase 0-3A general equipment ----
const eq = auth.phases['0-3a-general-equipment'];
if (eq) {
  const readDb = (n) => fs.readFileSync(path.join(ROOT, `packs/${n}.db`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const eqPack = new Map(readDb('equipment').map((r) => [r._id, r.name]));
  if (eqPack.size !== eq.repoSnapshot.totalEquipmentPackRecords) fail(`equipment pack has ${eqPack.size} records, authority expects ${eq.repoSnapshot.totalEquipmentPackRecords}`);
  const executed = eq.execution?.status === 'EXECUTED_RENAMES';
  const keys = new Set();
  for (const c of eq.canonicalRecords) {
    if (keys.has(c.canonicalIdentityKey)) fail(`duplicate canonical identity key ${c.canonicalIdentityKey}`);
    keys.add(c.canonicalIdentityKey);
    if (c.phase0Disposition === 'ADD') { if (c.repo.present) fail(`equipment ADD ${c.canonicalName} claims a repo match`); continue; }
    const id = c.repo.matchedId;
    if (!eqPack.has(id)) { fail(`equipment ${c.canonicalName}: ${id} not in pack`); continue; }
    const expected = executed && c.phase0Disposition === 'EDIT' ? c.canonicalName : c.repo.matchedName;
    if (eqPack.get(id) !== expected) fail(`equipment name drift ${id}: expected "${expected}" vs pack "${eqPack.get(id)}"`);
    if (c.phase0Disposition === 'KEEP' && eqPack.get(id) !== c.canonicalName) fail(`equipment KEEP ${c.canonicalName} != repo name`);
  }
  const covered = new Set(eq.repoReconciliation.map((r) => r.id));
  if (covered.size !== eq.repoReconciliation.length) fail('equipment repoReconciliation has duplicate ids');
  for (const r of eq.repoReconciliation) {
    if (!eqPack.has(r.id)) fail(`equipment repo record ${r.id} not in pack`);
    else if (r.phase0Disposition !== 'EDIT' && eqPack.get(r.id) !== r.name) fail(`equipment ${r.id} name drift "${r.name}" vs "${eqPack.get(r.id)}"`);
  }
  for (const d of eq.deferredRepoRecords) if (eqPack.get(d.id) !== d.name) fail(`equipment deferred ${d.id} missing or renamed`);
  for (const sp of ['equipment-comlinks', 'equipment-medical', 'equipment-other', 'equipment-security', 'equipment-survival', 'equipment-tech', 'equipment-tools']) {
    for (const r of readDb(sp)) if (eqPack.get(r._id) !== r.name) fail(`equipment subpack ${sp} ${r._id}: "${r.name}" vs aggregate "${eqPack.get(r._id)}"`);
  }
  const dispo = count(eq.canonicalRecords, (r) => r.phase0Disposition);
  if (JSON.stringify(Object.entries(dispo).sort()) !== JSON.stringify(Object.entries(eq.canonicalCounts.byDisposition).sort())) fail(`equipment disposition counts ${JSON.stringify(dispo)}`);
  if (!errors.length) console.log(`equipment authority OK: ${eq.canonicalRecords.length} canonical, ${eq.repoReconciliation.length}+${eq.deferredRepoRecords.length} in-scope/deferred of ${eqPack.size} repo records`);
}

if (errors.length) { console.error(`FAIL (${errors.length})\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`weapons authority OK: ${p.canonicalWeapons.length} canonical, ${pack.size} repo records, all covered once`);
