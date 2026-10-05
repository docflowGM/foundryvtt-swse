#!/usr/bin/env node
/**
 * Verifies data/audits/item-canonicalization-rolling-authority.json (Phase 0-1 weapons,
 * Phase 0-2 armor, Phase 0-3A equipment, Phase 0-3B medical, Phase 0-3C explosives, Phase 0-3D cybernetics, Phase 0-3E upgrades) against the weapons, armor and equipment packs. Read-only. Fails on any drift between the certified authority
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

// ---- Phase 0-3C explosives / demolitions (authority-only) ----
const ex = auth.phases['0-3c-explosives-demolitions'];
if (ex) {
  const exPack = new Map(fs.readFileSync(path.join(ROOT, 'packs/equipment.db'), 'utf8').split('\n').filter(Boolean)
    .map((l) => JSON.parse(l)).map((r) => [r._id, r.name]));
  const eqScope = new Set([...(auth.phases['0-3a-general-equipment']?.repoReconciliation || []).map((r) => r.id),
    ...(auth.phases['0-3a-general-equipment']?.deferredRepoRecords || []).map((r) => r.id)]);
  const exKeys = new Set();
  for (const r of ex.records) {
    if (exKeys.has(r.canonicalId)) fail(`duplicate explosives canonical id ${r.canonicalId}`);
    exKeys.add(r.canonicalId);
    if (r.disposition === 'KEEP') {
      if (exPack.get(r.repo.id) !== r.repo.name) fail(`explosives KEEP ${r.repo.id}: pack "${exPack.get(r.repo.id)}" vs "${r.repo.name}"`);
      if (eqScope.has(r.repo.id)) fail(`explosives ${r.repo.id} is also claimed by Phase 0-3A`);
    } else if (r.disposition === 'ADD') {
      if (r.repo.present || exPack.has(r.repo.suggestedId)) fail(`explosives ADD ${r.canonicalName} already exists in the pack`);
    } else fail(`explosives ${r.canonicalId}: unexpected disposition ${r.disposition}`);
  }
  const exDispo = count(ex.records, (r) => r.disposition);
  if (exDispo.KEEP !== ex.counts.KEEP || exDispo.ADD !== ex.counts.ADD || ex.records.length !== ex.counts.canonicalIdentities) fail(`explosives counts ${JSON.stringify(exDispo)}`);
  if (!errors.length) console.log(`explosives authority OK: ${ex.records.length} canonical (${exDispo.KEEP} KEEP, ${exDispo.ADD} ADD pending), ${exPack.size} equipment records untouched`);
}

// ---- Phase 0-3B medical / treatment equipment ----
const med = auth.phases['0-3b-medical-treatment'];
if (med) {
  const readMed = (n) => fs.readFileSync(path.join(ROOT, `packs/${n}.db`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const medPack = new Map(readMed('equipment').map((r) => [r._id, r.name]));
  const medSub = new Map(readMed('equipment-medical').map((r) => [r._id, r.name]));
  const medExecuted = med.execution?.status === 'EXECUTED_RENAMES';
  const scoped = new Set([
    ...(auth.phases['0-3a-general-equipment']?.repoReconciliation || []).map((r) => r.id),
    ...(auth.phases['0-3a-general-equipment']?.deferredRepoRecords || []).map((r) => r.id),
    ...((auth.phases['0-3c-explosives-demolitions']?.records || []).filter((r) => r.repo.present).map((r) => r.repo.id))]);
  const medIds = new Set();
  for (const r of med.records) {
    const id = r.repo.id;
    if (medIds.has(id)) fail(`medical duplicate id ${id}`);
    medIds.add(id);
    if (scoped.has(id)) fail(`medical ${id} also claimed by another equipment phase`);
    const expected = medExecuted && r.disposition === 'EDIT' ? r.canonicalName : r.repo.name;
    if (medPack.get(id) !== expected) fail(`medical name drift ${id}: expected "${expected}" vs pack "${medPack.get(id)}"`);
    if (medSub.get(id) !== medPack.get(id)) fail(`medical subpack/aggregate mismatch ${id}`);
    if (r.disposition === 'KEEP' && medPack.get(id) !== r.canonicalName) fail(`medical KEEP ${r.canonicalName} != repo name`);
  }
  for (const id of medSub.keys()) if (!medIds.has(id)) fail(`equipment-medical record ${id} not covered by Phase 0-3B`);
  const md = count(med.records, (r) => r.disposition);
  if (md.KEEP !== med.counts.KEEP || md.EDIT !== med.counts.EDIT || med.records.length !== med.counts.canonicalIdentities) fail(`medical counts ${JSON.stringify(md)}`);
  if (!errors.length) console.log(`medical authority OK: ${med.records.length} canonical (${md.KEEP} KEEP, ${md.EDIT} EDIT) cover all ${medSub.size} equipment-medical records`);
}

// ---- Phase 0-3D cybernetics / implants (authority-only; cleanups dependency-gated) ----
const cy = auth.phases['0-3d-cybernetics-implants'];
if (cy) {
  const cyPack = new Map(fs.readFileSync(path.join(ROOT, 'packs/equipment.db'), 'utf8').split('\n').filter(Boolean)
    .map((l) => JSON.parse(l)).map((r) => [r._id, r.name]));
  const cyIds = new Set();
  const cyKeys = new Set();
  for (const r of cy.records) {
    if (cyKeys.has(r.canonicalId)) fail(`cybernetics duplicate canonical id ${r.canonicalId}`);
    cyKeys.add(r.canonicalId);
    if (r.disposition === 'ADD') {
      if (r.repo.present || cyPack.has(r.repo.suggestedId)) fail(`cybernetics ADD ${r.canonicalName} already exists in the pack`);
      continue;
    }
    for (const m of (r.repo.matches || [r.repo])) {
      cyIds.add(m.id);
      if (cyPack.get(m.id) !== m.name) fail(`cybernetics ${m.id}: pack "${cyPack.get(m.id)}" vs "${m.name}"`);
    }
  }
  const gated = cy.execution?.gatedCleanup || {};
  for (const [id, g] of Object.entries(gated)) {
    cyIds.add(id);
    // Until a cleanup is marked executed, the gated record must still exist (no blind deletion).
    if (!g.executed && !cyPack.has(id)) fail(`cybernetics gated record ${id} missing but cleanup not marked executed`);
    if (g.executed && cyPack.has(id)) fail(`cybernetics cleanup of ${id} marked executed but record still in pack`);
  }
  const prefixed = [...cyPack.keys()].filter((id) => /^(cyber-|implant-)/.test(id));
  for (const id of prefixed) if (!cyIds.has(id)) fail(`repo record ${id} not covered by Phase 0-3D`);
  const cd = count(cy.records, (r) => r.disposition);
  if (cd.KEEP !== cy.counts.KEEP || cd.EDIT !== cy.counts.EDIT || cd.ADD !== cy.counts.ADD || cy.records.length !== cy.counts.canonicalIdentities) fail(`cybernetics counts ${JSON.stringify(cd)}`);
  if (!errors.length) console.log(`cybernetics authority OK: ${cy.records.length} canonical (${cd.KEEP} KEEP, ${cd.EDIT} EDIT, ${cd.ADD} ADD pending), ${prefixed.length} cyber-/implant- repo records covered, 2 dependency-gated cleanups pending`);
}

// ---- Phase 0-3E upgrades / modifications (authority-only) ----
const up = auth.phases['0-3e-upgrades-modifications'];
if (up) {
  const lines = (n) => fs.readFileSync(path.join(ROOT, `packs/${n}.db`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const upPack = new Map(lines('equipment').map((r) => [r._id, r.name]));
  const upSub = new Map(['equipment-comlinks', 'equipment-medical', 'equipment-other', 'equipment-security', 'equipment-survival', 'equipment-tech', 'equipment-tools'].flatMap((n) => lines(n)).map((r) => [r._id, r.name]));
  const knownCollisions = new Set((up.nameCollisions || []).map((c) => c.canonicalIdentityKey));
  const upKeys = new Set();
  const upIds = new Set();
  const eq3a = new Map((auth.phases['0-3a-general-equipment']?.canonicalRecords || []).map((c) => [c.canonicalName + '|' + c.phase0Disposition, c]));
  for (const r of up.records) {
    if (upKeys.has(r.canonicalIdentityKey)) fail(`upgrades duplicate identity key ${r.canonicalIdentityKey}`);
    upKeys.add(r.canonicalIdentityKey);
    if (r.ownership === '0-3A') {
      const e = r.repo.existingCanonicalId;
      if (e) { if (!upPack.has(e)) fail(`upgrades cross-reference ${e} not in pack`); } else if (!eq3a.has(r.canonicalName + '|ADD')) fail(`upgrades cross-reference ${r.canonicalName} is not a 0-3A ADD`);
      continue;
    }
    if (r.phase0Disposition === 'EDIT') {
      const id = r.repo.id;
      upIds.add(id);
      if (upPack.get(id) !== r.repo.name) fail(`upgrades ${id}: pack "${upPack.get(id)}" vs "${r.repo.name}"`);
    } else if (r.phase0Disposition === 'ADD') {
      if (r.repo.presentInEquipmentCompendium) fail(`upgrades ADD ${r.canonicalName} claims a compendium match`);
      else if ([...upPack.values()].includes(r.canonicalName) && !knownCollisions.has(r.canonicalIdentityKey)) fail(`upgrades ADD ${r.canonicalName} collides with an existing record name and is not a recorded nameCollision`);
    } else fail(`upgrades ${r.canonicalName}: unexpected disposition ${r.phase0Disposition}`);
  }
  for (const d of up.repoReversePass.equipmentCompendium) {
    upIds.add(d.id);
    const g = up.execution?.gatedCleanup?.[d.id];
    if (g && !g.executed && !upPack.has(d.id)) fail(`upgrades gated record ${d.id} missing but cleanup not marked executed`);
    if (!upPack.has(d.survivor)) fail(`upgrades survivor ${d.survivor} missing`);
  }
  const upgradeRecords = [...upPack.keys()].filter((id) => id.startsWith('upgrade-'));
  for (const id of upgradeRecords) if (!upIds.has(id)) fail(`upgrade-* record ${id} not covered by Phase 0-3E`);
  for (const id of upgradeRecords) if (upSub.get(id) !== upPack.get(id)) fail(`upgrade record ${id} subpack/aggregate mismatch`);
  const ud = count(up.records, (r) => r.phase0Disposition);
  if (ud.EDIT !== up.counts.ownedByDisposition.EDIT || ud.ADD !== up.counts.ownedByDisposition.ADD || up.records.length !== up.counts.canonicalModificationEntries) fail(`upgrades counts ${JSON.stringify(ud)}`);
  for (const [k, n] of [['armor', 29], ['universal', 19], ['weapon', 23]]) {
    const have = JSON.parse(fs.readFileSync(path.join(ROOT, `data/upgrades/${k}-upgrades.json`), 'utf8')).length;
    if (have !== up.repoReversePass.upgradeJsonCatalogs[k].records || have !== n) fail(`data/upgrades/${k}-upgrades.json has ${have} records, authority expects ${up.repoReversePass.upgradeJsonCatalogs[k].records}`);
  }
  if (!errors.length) console.log(`upgrades authority OK: ${up.records.length} entries (${ud.EDIT} EDIT, ${ud.ADD} ADD pending, ${ud.CROSS_REFERENCE} cross-refs), ${upgradeRecords.length} upgrade-* records covered, JSON catalog counts match`);
}

if (errors.length) { console.error(`FAIL (${errors.length})\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`weapons authority OK: ${p.canonicalWeapons.length} canonical, ${pack.size} repo records, all covered once`);
