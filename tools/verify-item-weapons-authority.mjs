#!/usr/bin/env node
/**
 * Verifies data/audits/item-canonicalization-rolling-authority.json (Phase 0-1 weapons,
 * Phase 0-2 armor, Phase 0-3A equipment, Phase 0-3B medical, Phase 0-3C explosives, Phase 0-3D cybernetics, Phase 0-3E upgrades, Phase 0-3F gear templates, Phase 0-3G lightsaber components, Phase 0-3H droid systems, Phase 0-3I ammunition boundary, Phase 0 completion manifest, Phase 1 weapons content 1A-1L) against the weapons, armor and equipment packs. Read-only. Fails on any drift between the certified authority
 * and the pack so that execution phases cannot silently run against a changed repo.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// ---- Phase 0-3F gear templates (authority-only) ----
const gt = auth.phases['0-3f-gear-templates'];
if (gt) {
  const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/gear-templates.json'), 'utf8'));
  const container = { general: 'generalTemplates', weapon: 'weaponTemplates', armor: 'armorTemplates' };
  const ids = new Set();
  for (const r of gt.records) {
    if (ids.has(r.canonicalId)) fail(`gear template duplicate id ${r.canonicalId}`);
    ids.add(r.canonicalId);
    const l = r.legacyJson;
    if (l.present) {
      const entry = legacy[container[r.templateType]]?.[l.key];
      if (!entry) { fail(`gear template ${r.canonicalName}: ${container[r.templateType]}.${l.key} missing from data/gear-templates.json`); continue; }
      if (entry.name !== l.name) fail(`gear template ${l.key} name drift: "${entry.name}" vs "${l.name}"`);
      if (l.disposition === 'KEEP' && entry.name !== r.canonicalName) fail(`gear template KEEP ${r.canonicalName} != legacy name`);
      if (l.disposition === 'EDIT' && entry.name === r.canonicalName) fail(`gear template EDIT ${r.canonicalName} already canonical in legacy JSON`);
    } else if (r.phase0Disposition !== 'ADD') fail(`gear template ${r.canonicalName} not in legacy JSON but not ADD`);
  }
  for (const ro of gt.repoOnlyRecords) {
    if (legacy[ro.container]?.[ro.key]?.name !== ro.name) fail(`gear template repo-only ${ro.container}.${ro.key} missing or renamed`);
  }
  const legacyTotal = Object.values(legacy).reduce((n, v) => n + Object.keys(v).length, 0);
  const accounted = gt.records.filter((r) => r.legacyJson.present).length + gt.repoOnlyRecords.length;
  if (legacyTotal !== gt.counts.legacyJsonRecords || accounted !== legacyTotal) fail(`gear template legacy JSON has ${legacyTotal} records, ${accounted} accounted, authority expects ${gt.counts.legacyJsonRecords}`);
  // Runtime catalog keys (read by source text; the module uses Foundry-absolute imports).
  const rtSrc = fs.readFileSync(path.join(ROOT, 'scripts/data/gear-templates.js'), 'utf8');
  const rtBlock = rtSrc.match(/export const ITEM_TEMPLATE_CATALOG = \{([\s\S]*?)\n\};/)?.[1] || '';
  const rtKeys = [...rtBlock.matchAll(/^  ([a-z_0-9]+):\s*\{/gm)].map((m) => m[1]).sort();
  const authKeys = gt.records.flatMap((r) => r.runtime.keys).sort();
  if (JSON.stringify(rtKeys) !== JSON.stringify(authKeys)) fail(`gear template runtime keys ${JSON.stringify(rtKeys)} != authority ${JSON.stringify(authKeys)}`);
  const ucSrc = fs.readFileSync(path.join(ROOT, 'scripts/engine/customization/upgrade-catalog.js'), 'utf8');
  const ucBlock = ucSrc.match(/export const TEMPLATE_CATALOG = \{([\s\S]*?)\n\};/)?.[1] || '';
  const ucKeys = [...ucBlock.matchAll(/^  ([a-z_0-9]+):\s*\{/gm)].map((m) => m[1]).sort();
  if (JSON.stringify(ucKeys) !== JSON.stringify(rtKeys)) fail(`TEMPLATE_CATALOG keys ${JSON.stringify(ucKeys)} differ from ITEM_TEMPLATE_CATALOG`);
  const gd = count(gt.records, (r) => r.phase0Disposition);
  if (gd.KEEP !== gt.counts.legacyJsonKEEP || gd.EDIT !== gt.counts.legacyJsonEDIT || gd.ADD !== gt.counts.legacyJsonADD || gt.records.length !== gt.counts.canonicalTemplates) fail(`gear template counts ${JSON.stringify(gd)}`);
  if (!errors.length) console.log(`gear template authority OK: ${gt.records.length} canonical (${gd.KEEP} KEEP, ${gd.EDIT} EDIT, ${gd.ADD} ADD pending), ${legacyTotal} legacy JSON records accounted for, ${rtKeys.length} runtime keys in both runtime catalogs`);
}

// ---- Phase 0-3G lightsaber components (authority-only) ----
const ls = auth.phases['0-3g-lightsaber-components'];
if (ls) {
  const rd = (n) => fs.readFileSync(path.join(ROOT, `packs/${n}.db`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const lsPacks = { 'lightsaber-crystal': rd('lightsaber-crystals'), 'lightsaber-accessory': rd('lightsaber-accessories') };
  const want = { 'lightsaber-crystal': ls.counts.canonicalCrystals, 'lightsaber-accessory': ls.counts.canonicalAccessories };
  const lsNames = new Set();
  for (const [fam, recs] of Object.entries(lsPacks)) {
    if (recs.length !== want[fam]) fail(`${fam} pack has ${recs.length} records, authority expects ${want[fam]}`);
    if (new Set(recs.map((r) => r._id)).size !== recs.length || new Set(recs.map((r) => r.name)).size !== recs.length) fail(`${fam} pack has duplicate ids or names`);
    const byName = new Map(recs.map((r) => [r.name, r._id]));
    const canon = ls.records.filter((r) => r.family === fam);
    for (const c of canon) {
      lsNames.add(`${fam}|${c.canonicalName}`);
      if (byName.get(c.canonicalName) !== c.repo.id) fail(`${fam} ${c.canonicalName}: pack id "${byName.get(c.canonicalName)}" vs authority repo.id "${c.repo.id}"`);
    }
    for (const r of recs) if (!canon.some((c) => c.canonicalName === r.name)) fail(`${fam} pack record "${r.name}" is not a canonical identity`);
  }
  if (lsNames.size !== ls.counts.canonicalTotal || ls.records.length !== ls.counts.canonicalTotal) fail(`lightsaber component counts mismatch`);
  const st = ls.stragglersInWeaponsPack;
  const upgradesInWeapons = rd('weapons').filter((r) => r.type === 'weaponUpgrade');
  if (!st.executed) {
    const listed = new Set(st.records.map((r) => r.id));
    for (const r of upgradesInWeapons) if (!listed.has(r._id)) fail(`unlisted weaponUpgrade ${r._id} appeared in packs/weapons.db`);
    for (const id of listed) if (!upgradesInWeapons.some((r) => r._id === id)) fail(`straggler ${id} missing from packs/weapons.db but cleanup not marked executed`);
  } else if (upgradesInWeapons.length) fail('weapons straggler cleanup marked executed but weaponUpgrade records remain in packs/weapons.db');
  if (!errors.length) console.log(`lightsaber components authority OK: ${ls.records.length} canonical (${want['lightsaber-crystal']} crystals, ${want['lightsaber-accessory']} accessories) exactly cover their packs; ${upgradesInWeapons.length} flagged stragglers pending cleanup`);
}

// ---- Phase 0-3H droid systems (authority-only; dedicated droid subsystem, not packs/equipment.db) ----
const dr = auth.phases['0-3h-droid-systems'];
if (dr) {
  const norm = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const ids = new Set();
  const names = new Set();
  for (const r of dr.records) {
    if (ids.has(r.canonicalId) || names.has(r.canonicalName)) fail(`droid duplicate canonical ${r.canonicalId}`);
    ids.add(r.canonicalId); names.add(r.canonicalName);
  }
  const dd = count(dr.records, (r) => r.disposition);
  for (const k of ['KEEP', 'EDIT', 'ADD']) if ((dd[k] || 0) !== dr.counts[k]) fail(`droid ${k} count ${dd[k]} != ${dr.counts[k]}`);
  if (dr.records.length !== dr.counts.canonicalIdentities || dr.counts.repoOnlyUnsupportedOrConvenience !== dr.repoOnlyRecords.length) fail('droid counts mismatch');
  // Load the live registry: droid-part-schema.js uses a Foundry-absolute import, so rewrite it to a file URL in a temp copy.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'droid-verify-'));
  try {
    const systemsUrl = pathToFileURL(path.join(ROOT, 'scripts/data/droid-systems.js')).href;
    const src = fs.readFileSync(path.join(ROOT, 'scripts/data/droid-part-schema.js'), 'utf8').replace('/systems/foundryvtt-swse/scripts/data/droid-systems.js', systemsUrl);
    const tmpFile = path.join(tmp, 'droid-part-schema.mjs');
    fs.writeFileSync(tmpFile, src);
    const mod = await import(pathToFileURL(tmpFile).href);
    const systems = (await import(systemsUrl)).DROID_SYSTEMS;
    const parts = mod.getAllDroidPartDefinitions();
    const regNames = new Set(parts.map((p) => norm(p.name)));
    const m = dr.registryMeasurement;
    if (parts.length !== m.registryParts) fail(`droid registry has ${parts.length} parts, authority measured ${m.registryParts}`);
    const rawIds = new Set();
    const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.id && o.name) rawIds.add(o.id); else Object.values(o).forEach(walk); } };
    walk(systems);
    if (rawIds.size !== m.rawSourceIds) fail(`droid-systems.js has ${rawIds.size} raw ids, authority measured ${m.rawSourceIds}`);
    const overlay = mod.getDroidPartRuleOverlay ? Object.keys(mod.getDroidPartRuleOverlay()) : [];
    for (const ro of dr.repoOnlyRecords) {
      if (!rawIds.has(ro.repoId) && !overlay.includes(ro.repoId)) fail(`droid repo-only ${ro.repoId} is in neither droid-systems.js nor the schema overlay`);
    }
    const knownDiff = new Set(Object.keys(m.keepButDisplayNameDiffers));
    for (const r of dr.records) {
      if (r.disposition === 'KEEP' && !regNames.has(norm(r.canonicalName)) && !knownDiff.has(r.canonicalName)) fail(`droid KEEP ${r.canonicalName} has no registry name match and is not a recorded display-name difference`);
      if (r.disposition === 'ADD' && regNames.has(norm(r.canonicalName))) fail(`droid ADD ${r.canonicalName} already exists in the registry`);
    }
    for (const r of dr.records.filter((x) => x.disposition === 'EDIT')) for (const ref of r.repo.repo) {
      const id = ref.split(' / ')[0];
      if (/^[a-z0-9-]+$/.test(id) && !rawIds.has(id) && !parts.some((p) => p.id === id)) fail(`droid EDIT ${r.canonicalName}: ${id} not found in the droid layers`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  if (!errors.length) console.log(`droid systems authority OK: ${dr.records.length} canonical (${dd.KEEP} KEEP, ${dd.EDIT} EDIT, ${dd.ADD} ADD pending), ${dr.repoOnlyRecords.length} repo-only flagged, live registry unchanged`);
}

// ---- Phase 0-3I ammunition / consumables boundary ----
const am = auth.phases['0-3i-ammunition-consumables-boundary'];
if (am) {
  const eqIds = new Set(fs.readFileSync(path.join(ROOT, 'packs/equipment.db'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)._id));
  const owned = new Set((auth.phases['0-3a-general-equipment']?.repoReconciliation || []).filter((r) => r.phase0Disposition === 'KEEP').map((r) => r.id));
  for (const it of am.canonicalStandaloneSupportItems) {
    if (!eqIds.has(it.repoId)) fail(`ammo boundary: ${it.repoId} missing from packs/equipment.db`);
    if (!owned.has(it.repoId)) fail(`ammo boundary: ${it.repoId} is not a 0-3A KEEP record`);
  }
  if (am.counts.ADD !== 0 || am.counts.newCanonicalStandaloneIdentities !== 0) fail('ammo boundary must introduce no new identities');
  if (!errors.length) console.log(`ammunition boundary OK: ${am.canonicalStandaloneSupportItems.length} support items owned by 0-3A, 0 new identities`);
}

// ---- Phase 0 character-item completion manifest ----
const pc = auth.phase0Completion;
if (pc) {
  const P = auth.phases;
  const folded = {
    '0-1': P['0-1-weapons'].canonicalWeapons.length,
    '0-2': P['0-2-armor'].canonicalArmor.length,
    '0-3A': P['0-3a-general-equipment'].canonicalRecords.length,
    '0-3B': P['0-3b-medical-treatment'].records.length,
    '0-3C': P['0-3c-explosives-demolitions'].records.length,
    '0-3D': P['0-3d-cybernetics-implants'].records.length,
    '0-3E': P['0-3e-upgrades-modifications'].records.filter((r) => r.ownership === '0-3E').length,
    '0-3F': P['0-3f-gear-templates'].records.length,
    '0-3G': P['0-3g-lightsaber-components'].records.length,
    '0-3H': P['0-3h-droid-systems'].records.length,
    '0-3I': P['0-3i-ammunition-consumables-boundary'].counts.newCanonicalStandaloneIdentities
  };
  for (const t of pc.tranches) if (folded[t.phase] !== t.canonical) fail(`completion manifest ${t.phase} says ${t.canonical}, folded authority has ${folded[t.phase]}`);
  if (pc.tranches.length !== Object.keys(folded).length) fail('completion manifest tranche count mismatch');
  const review = (P['0-2-armor'].repoOnlyArmor || []).filter((r) => r.phase0Disposition === 'REVIEW').map((r) => r.repoName).sort();
  const listed = [...pc.phase0Closure.unresolvedItems].sort();
  if (JSON.stringify(review) !== JSON.stringify(listed) || pc.phase0Closure.unresolvedIdentityReviews !== review.length) fail(`completion manifest unresolved reviews ${JSON.stringify(listed)} != armor REVIEW ${JSON.stringify(review)}`);
  if (!errors.length) console.log(`Phase 0 completion OK: ${pc.tranches.length} tranches reconcile with the folded authorities; ${review.length} open identity reviews (${review.join(', ')})`);
}

// ---- Phase 1 weapons content authority (rolling) ----
const c1 = auth.phases['1-weapons-content'];
// Retrosaber (Jedi Academy p. 50) is defined in prose only; the sourcebook prints no stat-table row for it.
const NO_STAT_TABLE = new Set(['Retrosaber']);
// Threats of the Galaxy prints these weapons in adversary/feature text, not in a weapons stat table.
const NO_STAT_TABLE_BOOKS = new Set(['Threats of the Galaxy']);
if (c1) {
  const byName = new Map(p.canonicalWeapons.map((w) => [w.canonicalName, w]));
  const claimsByName = new Map();
  const tot = { claims: 0, present: 0, missing: 0, INCORRECT: 0, INCOMPLETE: 0 };
  for (const b of c1.books) {
    const disc = {};
    let present = 0;
    for (const r of b.records) {
      const w = byName.get(r.canonicalName);
      if (!w) { fail(`${b.phase} ${r.canonicalName} is not a Phase 0-1 canonical weapon`); continue; }
      if (!w.sources.some((s) => s.book === b.book)) fail(`${b.phase} ${r.canonicalName} not sourced from ${b.book} in Phase 0-1`);
      if (!claimsByName.has(r.canonicalName)) claimsByName.set(r.canonicalName, []);
      claimsByName.get(r.canonicalName).push(b.phase);
      disc[r.phase1Discrepancy] = (disc[r.phase1Discrepancy] || 0) + 1;
      if (r.source.book !== b.book || !r.source.descriptionPage || (!r.source.statTablePage && !NO_STAT_TABLE.has(r.canonicalName) && !NO_STAT_TABLE_BOOKS.has(b.book))) fail(`${b.phase} ${r.canonicalName} missing provenance`);
      if (!r.canonicalPlayerText?.trim() || !r.summary?.trim() || r.canonicalPlayerText === r.summary) fail(`${b.phase} ${r.canonicalName} text/summary invalid`);
      const absent = w.phase0Disposition === 'ADD';
      if (r.repo.present === absent) fail(`${b.phase} ${r.canonicalName} repo.present disagrees with Phase 0 ${w.phase0Disposition}`);
      if (r.repo.present) {
        present++;
        if (r.repo.id !== w.repo.matchedId || !pack.has(r.repo.id)) fail(`${b.phase} ${r.canonicalName} repo id ${r.repo.id} != Phase 0 ${w.repo.matchedId} or not in pack`);
        if (pack.get(r.repo.id) !== r.repo.currentName) fail(`${b.phase} ${r.canonicalName} currentName ${r.repo.currentName} != pack ${pack.get(r.repo.id)}`);
        if (r.phase1Discrepancy === 'MISSING_RECORD') fail(`${b.phase} ${r.canonicalName} present but MISSING_RECORD`);
      } else if (r.phase1Discrepancy !== 'MISSING_RECORD') fail(`${b.phase} ${r.canonicalName} absent but not MISSING_RECORD`);
      if (r.repo.phase0NameNormalizationPending !== (w.phase0Disposition === 'EDIT')) fail(`${b.phase} ${r.canonicalName} rename-pending flag disagrees with Phase 0`);
    }
    const c = b.counts;
    const claims = c.canonicalWeapons ?? c.canonicalWeaponClaims;
    const exp = { MISSING_RECORD: c.repoMissing, DESCRIPTION_INCORRECT: c.descriptionIncorrect, DESCRIPTION_INCOMPLETE: c.descriptionIncomplete };
    for (const [k, v] of Object.entries(exp)) if ((disc[k] || 0) !== v) fail(`${b.phase} ${k} count ${disc[k] || 0} != ${v}`);
    if (b.records.length !== claims || present !== c.repoPresent || c.repoPresent + c.repoMissing !== claims) fail(`${b.phase} count mismatch`);
    tot.claims += b.records.length; tot.present += present; tot.missing += exp.MISSING_RECORD;
    tot.INCORRECT += exp.DESCRIPTION_INCORRECT; tot.INCOMPLETE += exp.DESCRIPTION_INCOMPLETE;
  }
  const ac = c1.aggregateCounts;
  if (tot.claims !== ac.sourceBookClaims || tot.present !== ac.repoPresentClaims || tot.missing !== ac.repoMissingClaims
    || tot.INCORRECT !== ac.descriptionIncorrectClaims || tot.INCOMPLETE !== ac.descriptionIncompleteClaims) fail(`1 aggregate counts mismatch ${JSON.stringify(tot)} vs ${JSON.stringify(ac)}`);
  if (claimsByName.size !== ac.uniqueProductionIdentities || tot.claims - claimsByName.size !== ac.crossPublishedDuplicateClaims) fail('1 unique identity / duplicate count mismatch');
  if (c1.uniqueIdentityIndex.length !== claimsByName.size) fail('1 uniqueIdentityIndex size mismatch');
  for (const u of c1.uniqueIdentityIndex) {
    const n = claimsByName.get(u.canonicalName);
    if (!n || n.length !== u.claimCount || u.sourceClaims.length !== u.claimCount) fail(`1 uniqueIdentityIndex claim count wrong for ${u.canonicalName}`);
  }
  const dupes = [...claimsByName].filter(([, v]) => v.length > 1).map(([k]) => k).sort();
  const ruled = c1.crossPublishedIdentityRulings.map((r) => r.canonicalIdentity).sort();
  if (JSON.stringify(dupes) !== JSON.stringify(ruled)) fail(`1 cross-published claims ${JSON.stringify(dupes)} != rulings ${JSON.stringify(ruled)}`);
  for (const r of c1.crossPublishedIdentityRulings) {
    const w = byName.get(r.canonicalIdentity);
    if (!w || w.repo.matchedId !== r.repoId) fail(`1 ruling ${r.canonicalIdentity} repoId ${r.repoId} != Phase 0 ${w?.repo.matchedId}`);
  }
  const conflicts = c1.crossPublishedIdentityRulings.filter((r) => /CONFLICT/.test(r.ruling)).map((r) => r.canonicalIdentity).sort();
  const open = (c1.openContentAdjudications || []).map((r) => r.subject).sort();
  if (JSON.stringify(conflicts) !== JSON.stringify(open)) fail(`1 conflict rulings ${JSON.stringify(conflicts)} != open adjudications ${JSON.stringify(open)}`);
  if (c1.status === 'PHASE_1_WEAPONS_PROVENANCE_CONTENT_COMPLETE') {
    const fin = { claims: 209, unique: 203, dup: 6, present: 156, missing: 53 };
    if (tot.claims !== fin.claims || claimsByName.size !== fin.unique || tot.claims - claimsByName.size !== fin.dup || tot.present !== fin.present || tot.missing !== fin.missing
      || tot.present + tot.missing !== tot.claims) fail(`1 final reconciliation failed ${JSON.stringify(tot)} unique=${claimsByName.size}`);
    const want = ['BlasTech 500 Riot Gun', 'Flechette Launcher', 'Guard Shoto', 'Lightsaber Pike', 'Long-Handle Lightsaber', 'Stunning Gauntlet'];
    if (JSON.stringify(dupes) !== JSON.stringify(want)) fail(`1 final duplicate set ${JSON.stringify(dupes)}`);
    if (c1.books.length !== 12) fail('1 final status requires 12 weapon sourcebooks');
    if (!(c1.openContentAdjudications || []).some((r) => r.subject === 'BlasTech 500 Riot Gun' && r.status === 'RESOLVED_BY_PLANNER_RULING_PHASE_3B' && /Rebellion Era/.test(r.resolution))) fail('1 Riot Gun adjudication must be recorded as resolved by the Phase 3B planner ruling');
  }
  if (!errors.length) console.log(`Phase 1 weapons content OK: ${c1.books.length} books (${c1.books.map((b) => b.phase).join(',')}), ${tot.claims} claims / ${claimsByName.size} identities (${tot.present} present, ${tot.missing} missing; ${tot.INCORRECT} incorrect, ${tot.INCOMPLETE} incomplete)`);
}

// ---- Phase 2 weapons numeric/stat/schema authority (2A Core in the rolling authority; later books may be standalone) ----
const s2 = auth.phases['2-weapons-numeric-stat-schema'];
const AMMO_RUNTIME_KEYS = ['currentShots', 'loadedAmmoRef', 'loadedAmmoQuantity', 'chamberedPayloadRef'];
if (s2) {
  const e0 = errors.length;
  const QUALS = ['accurate', 'inaccurate', 'arc', 'ignoresDR', 'areaEffect', 'autofireOnly', 'doubleWeapon', 'thrown', 'reach'];
  const C = s2.schemaContract;
  const STUN_CAP = new Set(C.stun.capabilities), STUN_MODE = new Set(C.stun.damageModes), DMG_MODES = new Set(C.baseDamage.modes);
  const TYPE_MODES = new Set(C.damageType.modes), DR_MODES = new Set(C.damageReductionInteraction.modes), AVAIL = new Set(C.availability.restrictionVocabulary);
  const ROF = new Set(C.rateOfFire.values);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const dice = (d, where) => {
    if (d.mode === 'dice') {
      if (!Number.isInteger(d.diceCount) || !Number.isInteger(d.dieSize) || !Number.isInteger(d.flatBonus)) fail(`${where} dice damage needs integer diceCount/dieSize/flatBonus`);
      else if (d.formula !== `${d.diceCount}d${d.dieSize}${d.flatBonus ? (d.flatBonus > 0 ? '+' : '') + d.flatBonus : ''}`) fail(`${where} formula ${d.formula} disagrees with structured dice`);
    } else if (d.mode === 'fixed') {
      if (d.diceCount !== 0 || d.dieSize !== null || !Number.isInteger(d.flatBonus) || d.flatBonus < 0 || d.formula !== String(d.flatBonus)) fail(`${where} fixed damage needs diceCount 0, dieSize null, integer flatBonus and formula equal to it`);
    } else if (d.mode === 'double') {
      if (d.profiles !== undefined) {
        if (!Array.isArray(d.profiles) || d.profiles.length !== 2) fail(`${where} double damage needs two profiles`);
        else { d.profiles.forEach((q, i) => dice(q, `${where}[${i}]`)); if (d.formula !== d.profiles.map((q) => q.formula).join('/')) fail(`${where} double formula mismatch`); }
      } else if (!/^\d+d\d+\/\d+d\d+$/.test(d.formula || '')) fail(`${where} double damage needs profiles or a NdN/NdN formula`);
    } else if (!DMG_MODES.has(d.mode)) fail(`${where} unknown damage mode ${d.mode}`);
  };
  const BANDS = C.range.allowedBands.vocabulary;
  const RANGE_MODES = new Set(C.range.modes);
  const PEN = new Set(C.range.penaltyApplication.vocabulary);
  /** Expected allowedBands for a qualities/qualityParameters pair (book-specific Inaccurate lives in qualityParameters). */
  const expectedBands = (ql, qp, w) => {
    let b = [...BANDS];
    if (ql.inaccurate) {
      const ab = qp?.inaccurate?.allowedBands ?? (qp?.inaccurate?.longAllowed === false ? ['pointBlank', 'short', 'medium'] : undefined);
      if (!Array.isArray(ab) || !ab.every((x) => BANDS.includes(x))) { fail(`${w} Inaccurate needs qualityParameters.inaccurate.allowedBands`); return b; }
      b = b.filter((x) => ab.includes(x));
    }
    if (ql.arc) b = b.filter((x) => x !== 'pointBlank');
    return b;
  };
  const rangeCheck = (rg, ql, qp, w) => {
    if (!RANGE_MODES.has(rg.mode)) { fail(`${w} unknown range mode ${rg.mode}`); return; }
    if (!('penaltyApplication' in rg) || !(rg.penaltyApplication === null || PEN.has(rg.penaltyApplication))) fail(`${w} range.penaltyApplication missing/invalid`);
    else if (rg.mode === 'ranged' && rg.penaltyApplication === null) fail(`${w} ranged range needs penaltyApplication`);
    else if (rg.mode === 'melee' && rg.penaltyApplication !== null) fail(`${w} melee range penaltyApplication must be null`);
    if (rg.mode === 'fixed-maximum' && !Number.isInteger(rg.maxSquares)) fail(`${w} fixed-maximum range needs maxSquares`);
    if (!('hardMaxSquares' in rg) || !(rg.hardMaxSquares === null || (Number.isInteger(rg.hardMaxSquares) && rg.hardMaxSquares > 0))) fail(`${w} range.hardMaxSquares missing/invalid`);
    if (rg.mode === 'ranged' && rg.profileId === null) {
      if (rg.bands !== null || rg.allowedBands !== null) fail(`${w} ranged range without a printed profile must have null bands/allowedBands`);
      return;
    }
    if (rg.mode !== 'ranged') return;
    const prof = C.range.canonicalProfiles[rg.profileId];
    if (!prof || !same(rg.bands, prof)) fail(`${w} range bands differ from the canonical profile ${rg.profileId}`);
    if (!same(rg.basePenalties, C.range.basePenalties)) fail(`${w} base penalties differ from contract`);
    const want = expectedBands(ql, qp, w);
    if (!same(rg.allowedBands, want)) fail(`${w} range.allowedBands ${JSON.stringify(rg.allowedBands)} != expected ${JSON.stringify(want)} from qualities/qualityParameters`);
    const qe = rg.qualityEffects;
    if (qe.pointBlankAllowed !== want.includes('pointBlank') || qe.mediumAllowed !== want.includes('medium') || qe.longAllowed !== want.includes('long') || (qe.shortPenaltyOverride === 0) !== ql.accurate) fail(`${w} range qualityEffects disagree with allowedBands/qualities`);
  };
  /** Checks one weapon book against its Phase 1 records. Returns {present, ign, tallies}. */
  const AMMO_OVERLAY = (() => {
    const ref = s2.ammoNormalizationOverlay;
    if (!ref || !fs.existsSync(path.join(ROOT, ref.file))) { fail('v2.9 ammo normalization overlay missing'); return new Map(); }
    const ov = JSON.parse(fs.readFileSync(path.join(ROOT, ref.file), 'utf8'));
    if (ov.entries.length !== ref.entries || ov.entries.length !== 209 || new Set(ov.entries.map((e) => e.sourceClaimKey)).size !== 209) fail('v2.9 ammo overlay must have exactly 209 distinct source-claim entries');
    return new Map(ov.entries.map((e) => [`${e.phase}|${e.canonicalName}`, e]));
  })();
  const AMMO_SEEN = new Set();
  const AC = C.ammo;
  const checkBook = (b, p1, label, opts = {}) => {
    const seen = new Set();
    const t = { present: 0, biotech: 0, ign: 0, accurate: 0, inaccurate: 0, arc: 0, area: 0, dbl: 0, auto: 0 };
    for (const r of b.records) {
      const n = r.canonicalName, w = `${label} ${n}`;
      if (seen.has(n)) fail(`${w} duplicate`); seen.add(n);
      const q1 = p1.get(n);
      if (!q1) { fail(`${w} has no Phase 1 record`); continue; }
      const pick = (x) => [x.present, x.id, x.currentName, x.phase0NameNormalizationPending];
      if (!same(pick(r.repo), pick(q1.repo))) fail(`${w} repo mapping differs from Phase 1`);
      const go = opts.groupOverrides?.[n];
      const groupOk = go ? (go.phase1 === q1.weaponGroup && go.phase2 === r.weaponGroup) : r.weaponGroup === q1.weaponGroup;
      if (!groupOk || r.source.descriptionPage !== q1.source.descriptionPage || (r.source.statTablePage ?? null) !== (q1.source.statTablePage ?? null)) fail(`${w} group/pages differ from Phase 1`);
      if (r.repo.present) t.present++;
      const s = r.canonicalStats, ql = r.qualities;
      if (!same(Object.keys(ql).sort(), [...QUALS].sort()) || QUALS.some((k) => typeof ql[k] !== 'boolean')) fail(`${w} quality vocabulary incomplete`);
      for (const k of ['stun', 'operatingModes', 'damageType', 'availability', 'range', 'damageReductionInteraction', 'baseDamage', 'resource']) if (!s[k]) fail(`${w} missing canonicalStats.${k}`);
      if (!s.stun || !s.baseDamage || !s.damageType || !s.availability || !s.damageReductionInteraction || !s.range || !s.operatingModes) continue;
      dice(s.baseDamage, `${w} baseDamage`);
      if (!STUN_CAP.has(s.stun.capability) || !STUN_MODE.has(s.stun.damageMode) || typeof s.stun.hasStunSetting !== 'boolean') fail(`${w} invalid stun object`);
      if (s.stun.hasStunSetting !== (s.stun.capability === 'setting' || s.stun.capability === 'optional-per-attack')) fail(`${w} hasStunSetting disagrees with capability`);
      const stunAct = (st, sw) => {
        if (!('activation' in st)) fail(`${sw} stun.activation missing`);
        else if ((st.capability === 'none') !== (st.activation === null)) fail(`${sw} stun.activation must be null exactly when capability is none`);
        else if (st.activation && !C.stun.activation.shape.timing.includes(st.activation.timing)) fail(`${sw} invalid stun.activation.timing ${st.activation.timing}`);
        else if (st.capability === 'optional-per-attack' && st.activation?.timing !== 'attack-declaration') fail(`${sw} optional-per-attack stun must be declared at attack time`);
        else if (st.capability === 'setting' && st.activation?.timing !== 'persistent-setting') fail(`${sw} stun setting must be persistent-setting`);
      };
      stunAct(s.stun, w);
      if (s.stun.damageMode === 'explicit' && s.stun.damage && s.stun.damage.mode !== 'modifier') dice(s.stun.damage, `${w} stun`);
      if (!TYPE_MODES.has(s.damageType.mode)) fail(`${w} invalid damageType mode`);
      if ((s.damageType.mode === 'and' || s.damageType.mode === 'or') && s.damageType.types.length < 2) fail(`${w} and/or damage type needs 2+ types`);
      if (!(AVAIL.has(s.availability.restriction) || (s.availability.restriction === null && s.costCredits === null && !q1.source.statTablePage)) || typeof s.availability.rare !== 'boolean') fail(`${w} invalid availability`);
      if (!DR_MODES.has(s.damageReductionInteraction.mode)) fail(`${w} invalid DR mode`);
      if (ql.ignoresDR !== (s.damageReductionInteraction.mode === 'ignore')) fail(`${w} ignoresDR disagrees with damageReductionInteraction.mode`);
      if (ql.ignoresDR) t.ign++;
      if (s.technologyClassification?.tags?.includes('biotech')) t.biotech++;
      for (const [k, key] of [['accurate', 'accurate'], ['inaccurate', 'inaccurate'], ['arc', 'arc'], ['doubleWeapon', 'dbl'], ['autofireOnly', 'auto']]) if (ql[k]) t[key]++;
      // area tally: the areaEffect quality, or a profile whose geometry is enabled (CR-1 Blast Cannon: conditional splash with areaEffect=false)
      if (ql.areaEffect || s.attackProfiles?.some((x) => x.area?.enabled)) t.area++;
      const rof = s.rateOfFire;
      if (rof !== null && !(Array.isArray(rof) && rof.length && rof.every((x) => ROF.has(x)))) fail(`${w} invalid rateOfFire`);
      if (ql.autofireOnly && !same(rof, ['A'])) fail(`${w} autofireOnly requires rateOfFire ["A"]`);
      if (rof && rof.includes('Special') && (!same(rof, ['Special']) || !r.operation?.specialRateOfFire)) fail(`${w} Special rate of fire must be exactly ["Special"] with operation.specialRateOfFire`);
      if (r.operation?.specialRateOfFire && !(rof && rof.includes('Special'))) fail(`${w} operation.specialRateOfFire requires rateOfFire ["Special"]`);
      const qp = r.qualityParameters;
      if (!qp || !same(Object.keys(qp).sort(), ['accurate', 'arc', 'inaccurate'])) fail(`${w} missing qualityParameters`);
      if (!Array.isArray(r.conditionalDamageProfiles)) fail(`${w} missing conditionalDamageProfiles`);
      if (!Array.isArray(s.modeProfiles)) fail(`${w} missing canonicalStats.modeProfiles`);
      if (!Array.isArray(r.proficiencyRules) || r.proficiencyRules.some((q) => !C.proficiencyRules.fields.every((f) => f in q) || !Array.isArray(q.classifications))) fail(`${w} missing/invalid proficiencyRules`);
      if (s.objectDurability !== null && !(s.objectDurability && C.objectDurability.fields.every((f) => f in s.objectDurability))) fail(`${w} invalid objectDurability`);
      if (!Array.isArray(s.integratedAccessories) || s.integratedAccessories.some((a) => !C.integratedAccessories.fields.every((f) => f in a))) fail(`${w} invalid integratedAccessories`);
      if (!Array.isArray(s.wieldingRules) || s.wieldingRules.some((q) => !q.id || !(q.effect || q.choice || q.condition))) fail(`${w} missing/invalid wieldingRules`);
      if (s.stateMachine !== null) {
        const sm = s.stateMachine;
        if (!sm || !Array.isArray(sm.states) || !sm.states.includes(sm.initialState) || !Array.isArray(sm.transitions) || sm.transitions.some((t2) => !sm.states.includes(t2.from) || !sm.states.includes(t2.to))) fail(`${w} invalid stateMachine`);
      }
      if (!Array.isArray(s.configurationStates) || s.configurationStates.some((q) => !q.id || !('attackUsable' in q))) fail(`${w} missing/invalid configurationStates`);
      if (!('constructionRules' in s) || !(s.constructionRules === null || typeof s.constructionRules === 'object')) fail(`${w} missing/invalid constructionRules`);
      if (!Array.isArray(s.resourceProfiles) || s.resourceProfiles.some((q) => !q.id || !q.kind) || (s.resourceProfiles.length > 0) !== (s.resource.kind === 'multiple')) fail(`${w} resourceProfiles[] must be a list that is non-empty exactly when resource.kind is "multiple"`);
      if (!Array.isArray(s.triggeredEffects) || !same(s.triggeredEffects, (s.attackProfiles || []).flatMap((x) => x.triggeredEffects || []))) fail(`${w} canonicalStats.triggeredEffects must equal the profile-level triggered effects`);
      if (!(s.technologyClassification && Array.isArray(s.technologyClassification.tags) && Array.isArray(s.technologyClassification.rules))) fail(`${w} missing/invalid technologyClassification`);
      if (!('deliveryMethod' in s) || !(s.deliveryMethod === null || (s.deliveryMethod && C.deliveryMethod.fields.every((f2) => f2 in s.deliveryMethod)))) fail(`${w} missing/invalid deliveryMethod`);
      if (!Array.isArray(r.conditionalQualities) || r.conditionalQualities.some((q) => !C.conditionalQualities.shape.every((f2) => f2 in q))) fail(`${w} conditionalQualities must use {quality,state,when,scope,effect}`);
      if (!Array.isArray(s.payloadProfiles)) fail(`${w} missing payloadProfiles`);
      else for (const pl of s.payloadProfiles) {
        if (!C.payloadProfiles.fields.every((f) => f in pl) || !(pl.damage || pl.effect)) fail(`${w} payload ${pl.id} incomplete`);
        else if (pl.damage) { dice(pl.damage, `${w} payload ${pl.id}`); if (!TYPE_MODES.has(pl.damageType.mode) || !STUN_CAP.has(pl.stun.capability)) fail(`${w} payload ${pl.id} invalid damageType/stun`); }
      }
      {
        const am = s.ammo, ent = AMMO_OVERLAY.get(`${label}|${n}`);
        if (!('ammo' in s)) fail(`${w} missing canonicalStats.ammo`);
        else if (!ent) fail(`${w} has no v2.9 ammo overlay entry`);
        else {
          AMMO_SEEN.add(`${label}|${n}`);
          if (!same(am, ent.ammo)) fail(`${w} canonicalStats.ammo differs from the v2.9 overlay`);
          const hasRanged = s.attackProfiles.some((x) => x.range.mode !== 'melee');
          if (ent.hasRangedAttackProfile !== hasRanged) fail(`${w} overlay hasRangedAttackProfile disagrees with the attack profiles`);
          if ((am === null) === hasRanged) fail(`${w} ammo must be null exactly for pure melee weapons`);
          if (am) {
            if (!AC.fields.filter((f2) => f2 !== 'profiles').every((f2) => f2 in am) || !AC.modes.includes(am.mode) || !AC.statuses.includes(am.status) || !AC.damageSourceValues.includes(am.damageSource) || typeof am.payloadDerived !== 'boolean') fail(`${w} ammo object incomplete or outside the contract vocabularies`);
            if (am.capacityShots !== null && !(Number.isInteger(am.capacityShots) && am.capacityShots > 0)) fail(`${w} ammo.capacityShots must be a positive integer or null`);
            if (am.status === 'not-stated' && (am.capacityShots !== null || am.type !== null)) fail(`${w} not-stated ammo must not guess a type or capacity`);
            if (am.payloadDerived !== (am.damageSource === 'loaded-ammo' || am.damageSource === 'loaded-ammo-modified-by-weapon')) fail(`${w} ammo.payloadDerived disagrees with damageSource`);
            if (am.mode === 'multiple' !== Array.isArray(am.profiles)) fail(`${w} ammo.profiles[] must exist exactly for mode "multiple"`);
            for (const k2 of AC.runtimeStateNotCanonical) if (k2 in am) fail(`${w} ammo must not carry runtime state ${k2}`);
            if (am.scopedToAttackProfiles && !am.scopedToAttackProfiles.every((id) => s.attackProfiles.some((x) => x.id === id && x.range.mode !== 'melee'))) fail(`${w} ammo scopedToAttackProfiles must name ranged attack profiles`);
            if (am.capacityShots !== null && s.resource.capacityShots != null && am.capacityShots !== s.resource.capacityShots) fail(`${w} ammo.capacityShots ${am.capacityShots} disagrees with resource.capacityShots ${s.resource.capacityShots}`);
          }
          for (const pl of s.payloadProfiles) if (typeof pl.damageMultiplier !== 'number' || !(pl.damageMultiplier > 0)) fail(`${w} payload ${pl.id} damageMultiplier missing/invalid`);
        }
      }
      if (s.resource.kind !== 'none') {
        for (const k2 of C.resourceLifecycle.fields) if (!(k2 in s.resource) || !(s.resource[k2] === null || typeof s.resource[k2] === 'boolean')) fail(`${w} resource.${k2} must be present as boolean or null`);
      }
      if (!Array.isArray(s.defensiveInteractions) || s.defensiveInteractions.some((e) => !C.defensiveInteractions.entryFields.every((f) => f in e))) fail(`${w} missing/invalid canonicalStats.defensiveInteractions`);
      for (const cd of r.conditionalDamageProfiles || []) {
        const op = cd.operation || 'replace';
        if (!cd.id || !cd.condition || !C.conditionalDamage.operations.includes(op)) fail(`${w} invalid conditionalDamageProfile ${cd.id}`);
        else if (op === 'replace') dice(cd.damage, `${w} conditional ${cd.id}`);
        else if (op === 'add-dice' && !(Number.isInteger(cd.diceCountDelta) && (Number.isInteger(cd.dieSize) || (cd.dieSize === 'same-as-selected-grenade' && cd.diceCountDelta < 0)))) fail(`${w} conditional ${cd.id} add-dice needs diceCountDelta/dieSize`);
      }
      if (!('consumption' in s.resource)) fail(`${w} missing resource.consumption`);
      if (s.baseDamage.mode === 'conditional' && !r.conditionalDamageProfiles?.length) fail(`${w} conditional damage needs conditionalDamageProfiles`);
      rangeCheck(s.range, ql, qp, w);
      // attack profiles (schema v2.2): per-attack decomposition
      const ap = s.attackProfiles;
      const PKEYS = C.attackProfiles.profileShape, KINDS = new Set(C.attackProfiles.kinds), RES = new Set(C.attackProfiles.attackResolution.modes), MISS = new Set(C.attackProfiles.attackResolution.onMiss);
      if (!Array.isArray(ap) || !ap.length || new Set(ap.map((x) => x.id)).size !== ap.length) fail(`${w} attackProfiles need unique ids`);
      else {
        for (const x of ap) {
          const pw = `${w} profile ${x.id}`;
          const miss = PKEYS.filter((k) => !(k in x));
          if (miss.length) { fail(`${pw} missing ${miss.join(',')}`); continue; }
          if (!KINDS.has(x.kind)) fail(`${pw} invalid kind ${x.kind}`);
          if (!x.schemaFamily.branch || !x.schemaFamily.proficiency) fail(`${pw} incomplete schemaFamily`);
          dice(x.damage, `${pw} damage`);
          if (!TYPE_MODES.has(x.damageType.mode) || (x.damageType.mode === 'unspecified' && x.damageType.types.length)) fail(`${pw} invalid damageType`);
          if (!STUN_CAP.has(x.stun.capability) || !STUN_MODE.has(x.stun.damageMode)) fail(`${pw} invalid stun`);
          stunAct(x.stun, pw);
          if (!Array.isArray(x.criticalEffects) || x.criticalEffects.some((q) => !C.criticalEffects.fields.every((f2) => f2 in q))) fail(`${pw} invalid criticalEffects`);
          if (typeof x.damageMultiplier !== 'number' || !(x.damageMultiplier > 0)) fail(`${pw} damageMultiplier missing/invalid`);
          if (!Array.isArray(x.conditionalRangeRules) || x.conditionalRangeRules.some((q) => !q.when || q.operation !== 'scale-range' || !(q.multiplier > 0) || !q.appliesTo)) fail(`${pw} invalid conditionalRangeRules`);
          if (!Array.isArray(x.activationRequirements) || x.activationRequirements.some((q) => !q.type)) fail(`${pw} invalid activationRequirements`);
          if (!Array.isArray(x.triggeredEffects) || x.triggeredEffects.some((q) => !q.trigger || !(q.effect || q.damage || q.resolution))) fail(`${pw} invalid triggeredEffects`);
          if (x.modifierPolicy !== null && typeof x.modifierPolicy !== 'object') fail(`${pw} invalid modifierPolicy`);
          if (x.rateOfFire !== null && !(Array.isArray(x.rateOfFire) && x.rateOfFire.every((y) => ROF.has(y)))) fail(`${pw} invalid rateOfFire`);
          if (!same(Object.keys(x.qualities).sort(), [...QUALS].sort())) fail(`${pw} quality vocabulary incomplete`);
          if (!RES.has(x.attackResolution.mode) || !MISS.has(x.attackResolution.onMiss) || !Array.isArray(x.attackResolution.ignoredDefenseComponents) || !x.attackResolution.defense) fail(`${pw} invalid attackResolution`);
          if (typeof x.area.enabled !== 'boolean' || !['shape', 'radiusSquares', 'lengthSquares', 'widthAtEndSquares', 'widthSquares', 'heightSquares', 'notes'].every((k) => k in x.area)) fail(`${pw} invalid area`);
          else if (!x.area.enabled && ['shape', 'radiusSquares', 'lengthSquares', 'widthAtEndSquares', 'widthSquares', 'heightSquares', 'notes'].some((k) => x.area[k] !== null)) fail(`${pw} area.enabled=false requires null geometry`);
          if (x.resourceConsumption !== null && !x.resourceConsumption?.resource) fail(`${pw} invalid resourceConsumption`);
          if (x.stun.damageMode === 'same-as-active-profile' && !s.modeProfiles.length && ap.length < 2) fail(`${pw} same-as-active-profile needs multiple profiles`);
          rangeCheck(x.range, x.qualities, qp, pw);
          if (!Array.isArray(x.conditionalModifiers) || x.conditionalModifiers.some((m) => !C.conditionalModifiers.fields.every((f) => f in m) || !new RegExp(C.conditionalModifiers.targetPattern).test(m.target) || !Number.isInteger(m.value))) fail(`${pw} invalid conditionalModifiers`);
          const pr = x.preparedAttack;
          if (pr !== null && !(('activationAction' in pr) ? C.preparedAttack.fields.every((f) => f in pr) : (pr.id && Array.isArray(pr.actionCost) && pr.timing))) fail(`${pw} invalid preparedAttack`);
          if (!Array.isArray(x.damageComponents)) fail(`${pw} damageComponents must be an array`);
          else for (const dc of x.damageComponents) {
            if (!C.damageComponents.fields.every((f) => f in dc) || !C.damageComponents.resolutions.includes(dc.resolution)) fail(`${pw} invalid damage component ${dc.id}`);
            else { dice(dc.damage, `${pw} component ${dc.id}`); if (!TYPE_MODES.has(dc.damageType.mode)) fail(`${pw} component ${dc.id} invalid damageType`); }
          }
          const fc = x.firingConstraints;
          if (fc !== null && (!C.firingConstraints.fields.every((f) => f in fc) || typeof fc.firesOnAlternatingRounds !== 'boolean' || typeof fc.prohibitsMultiShotAbilities !== 'boolean' || typeof fc.reloadRequiredAfterEachShot !== 'boolean')) fail(`${pw} invalid firingConstraints`);
          if (x.rateOfFire?.includes('Special') && fc === null) fail(`${pw} Special rate of fire requires firingConstraints`);
        }
        const ids = new Set(ap.map((x) => x.id));
        for (const m of s.modeProfiles) {
          if (!m.id || !m.label || !('attackProfileId' in m)) fail(`${w} modeProfile ${m.id} incomplete`);
          else if (m.attackProfileId !== null && !ids.has(m.attackProfileId)) fail(`${w} modeProfile ${m.id} links unknown profile ${m.attackProfileId}`);
        }
        if (opts.mirrorProfiles) {
          if (s.baseDamage.mode === 'double') {
            if (!same(ap.map((x) => x.id), ['end1', 'end2']) || !same(ap.map((x) => x.damage), s.baseDamage.profiles)) fail(`${w} double weapon profiles must be end1/end2 matching baseDamage.profiles`);
          } else if (s.baseDamage.mode === 'alternate-profiles') {
            if (ap.length < 2) fail(`${w} alternate-profiles needs 2+ attack profiles`);
          } else if (ap.length !== 1 || ap[0].id !== 'primary' || !(same(ap[0].damage, s.baseDamage) || ap[0].damage.mode === 'inherited' || (s.baseDamage.mode === 'ammunition' && s.payloadProfiles.length === 1 && same(ap[0].damage, s.payloadProfiles[0].damage) && same(ap[0].damageType, s.payloadProfiles[0].damageType))) || !(same(ap[0].damageType, s.damageType) || (s.baseDamage.mode === 'ammunition' && s.payloadProfiles.length === 1 && same(ap[0].damageType, s.payloadProfiles[0].damageType))) || !same(ap[0].range, s.range)) fail(`${w} primary attack profile must mirror canonicalStats baseDamage/damageType/range (or, for a payload-derived delivery system, the single loaded payload)`);
        }
        if (s.baseDamage.mode === 'alternate-profiles' && ap.length < 2) fail(`${w} alternate-profiles needs 2+ attack profiles`);
      }
      const fam = r.schemaFamily;
      if (!fam || !fam.branch || !fam.subcategory || !fam.proficiency) fail(`${w} missing schemaFamily`);
      if (opts.coreNoBaseRangeQualities && (ql.accurate || ql.inaccurate || ql.arc)) fail(`${w} Core must not assert base accurate/inaccurate/arc`);
    }
    for (const n of p1.keys()) if (!seen.has(n)) fail(`${label} missing ${n}`);
    return t;
  };

  for (const b of s2.books) {
    const p1 = new Map(auth.phases['1-weapons-content'].books.find((x) => x.phase === '1A').records.map((r) => [r.canonicalName, r]));
    const t = checkBook(b, p1, b.phase, { coreNoBaseRangeQualities: true, mirrorProfiles: true });
    if (b.records.length !== b.counts.claims || t.present !== b.counts.repoPresent || b.records.length - t.present !== b.counts.repoMissing) fail(`${b.phase} counts mismatch`);
    if (t.ign !== 3) fail(`2A expected 3 ignoresDR lightsabers, found ${t.ign}`);
    if (b.records.find((r) => r.canonicalName === 'Bowcaster').canonicalStats.range.mode !== 'unresolved') fail('2A Bowcaster range must remain unresolved');
    if (b.records.length !== 48 || t.present !== 35) fail('2A Core hard checkpoint must be 48 records / 35 present / 13 missing');
    if (s2.schemaVersion !== 'weapon-authority-schema-v2.9') fail('schemaVersion must be weapon-authority-schema-v2.9');
  }
  // Standalone book authorities (not merged into the rolling record unless the owner says so)
  for (const sb of s2.standaloneBookAuthorities || []) {
    const sa = JSON.parse(fs.readFileSync(path.join(ROOT, sb.file), 'utf8'));
    if (!fs.existsSync(path.join(ROOT, sb.doc))) fail(`${sb.phase} missing doc ${sb.doc}`);
    if (typeof sa.scope === 'object' && (sa.scope.rollingAuthorityMutationAuthorized !== false || sa.scope.productionMutationAuthorized !== false || sa.scope.recordCreationAuthorized !== false)) fail(`${sb.phase} standalone scope flags must stay false`);
    if (sb.rollingMergeAuthorized !== false) fail(`${sb.phase} standalone book must not be rolling-merged without owner instruction`);
    const p1b = auth.phases['1-weapons-content'].books.find((x) => x.book === sa.book || x.book === sa.book.replace(/^The /, ''));
    const p1 = new Map(p1b.records.map((r) => [r.canonicalName, r]));
    const t = checkBook(sa, p1, sb.phase, { mirrorProfiles: !!sb.mirrorProfiles, groupOverrides: sb.phase1GroupOverrides });
    const c = sa.counts;
    if (sa.records.length !== c.canonicalWeaponClaims || sa.records.length !== sb.claims || t.present !== c.repoPresent || sa.records.length - t.present !== c.repoMissing || t.present !== sb.repoPresent) fail(`${sb.phase} counts mismatch`);
    const tallies = { accurateBaseClaims: t.accurate, inaccurateBaseClaims: t.inaccurate, arcBaseClaims: t.arc, ignoresDRBaseClaims: t.ign, areaEffectClaims: t.area, areaEffectBaseClaims: t.area, baseAccurateClaims: t.accurate, baseInaccurateClaims: t.inaccurate, baseArcClaims: t.arc, biotechClaims: t.biotech, doubleWeaponClaims: t.dbl, autofireOnlyClaims: t.auto };
    for (const [k, v] of Object.entries(tallies)) if (k in c && c[k] !== v) fail(`${sb.phase} counts.${k} ${c[k]} != computed ${v}`);
    if (sa.verification.sourceTables) { const tableSum = sa.verification.sourceTables.reduce((m, x) => m + x.claims, 0); if (tableSum !== sa.records.length) fail(`${sb.phase} source table claims ${tableSum} != records ${sa.records.length}`); }
    // Lightfoil-style DR bypass must come from the lightsaber group only
    for (const r of sa.records) if (r.qualities.ignoresDR && r.weaponGroup !== 'Lightsaber' && !sb.ignoresDRNonLightsaberAllowed?.includes(r.canonicalName)) fail(`${sb.phase} ${r.canonicalName} ignoresDR outside the Lightsaber group`);
    for (const r of sa.records) if (r.canonicalStats.rateOfFire?.includes('Special') && !sb.specialRateOfFireAllowed?.includes(r.canonicalName)) fail(`${sb.phase} unexpected Special rate of fire on ${r.canonicalName}`);
    const mass = sa.records.find((r) => r.canonicalName === 'Massassi Lanvarok');
    if (mass && !(mass.canonicalStats.attackProfiles.map((x) => x.id).join() === 'disc,melee' && mass.canonicalStats.baseDamage.mode === 'alternate-profiles')) fail(`${sb.phase} Massassi Lanvarok must carry disc and melee profiles`);
    if (sb.phase === '2D') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      if (f('CR-1 Blast Cannon').canonicalStats.range.penaltyApplication !== 'damage') fail('2D CR-1 Blast Cannon range penalties apply to damage');
      if (f('Bryar Pistol').canonicalStats.attackProfiles[0].preparedAttack?.damageDiceDelta !== 1 || f('Bryar Rifle').canonicalStats.attackProfiles[0].preparedAttack?.resourceUnitsOnPreparedAttack !== 5) fail('2D Bryar prepared attack missing');
      if (f('Neuronic Whip').canonicalStats.attackProfiles[0].damageComponents.length !== 2) fail('2D Neuronic Whip needs two independent damage components');
      for (const n of ['DX-2 Disruptor Pistol', 'DXR-6 Disruptor Rifle']) if (f(n).canonicalStats.attackProfiles[0].firingConstraints?.firesOnAlternatingRounds !== true) fail(`2D ${n} fires only on alternating rounds`);
      for (const n of ['Bryar Rifle', 'CR-1 Blast Cannon', 'Flechette Launcher', 'Stokhli Spray Stick']) if (!same(f(n).qualityParameters.inaccurate.allowedBands, ['pointBlank', 'short', 'medium'])) fail(`2D ${n} Inaccurate must exclude Long only (Core/KOTOR definition)`);
      if (!['Guard Shoto', 'Lightsaber Pike'].every((n) => f(n).canonicalStats.defensiveInteractions.length === 1)) fail('2D Guard Shoto / Lightsaber Pike defensiveInteractions');
    }
    if (sb.phase === '2L') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      const p0 = (n) => f(n).canonicalStats.attackProfiles[0];
      const same2 = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
      if (sa.records.filter((r) => r.schemaFamily.branch === 'melee').length !== 2 || sa.records.filter((r) => r.schemaFamily.branch === 'ranged').length !== 2 || sa.counts.deliverySystemClaims !== 1 || sa.records.filter((r) => r.canonicalStats.stun.capability === 'native-stun').length !== 1) fail('2L 2 melee + 2 ranged, 1 delivery system, 1 native stun');
      if (sa.records.some((r) => r.canonicalName === 'Lightwhip' || r.canonicalName === 'Saberdart Launcher')) fail('2L must not duplicate Lightwhip or add Saberdart Launcher');
      const dd = f('Datadagger');
      if (dd.repo.present || dd.canonicalStats.ammo !== null || dd.canonicalStats.baseDamage.formula !== '1d4' || dd.canonicalStats.damageType.types.join() !== 'piercing' || dd.operation.concealment?.equipmentBonus !== 5 || dd.operation.concealment?.skill !== 'Stealth' || dd.operation.concealment?.touchExaminerCircumstanceBonusDenied !== true || dd.canonicalStats.costCredits !== 500) fail('2L Datadagger missing, 1d4 Piercing, 500 cr, +5 Stealth concealment with no touch-examiner circumstance bonus, ammo null');
      const lm = f('Light Concussion Missile Launcher'), lcs = lm.canonicalStats;
      const pl = lcs.payloadProfiles.find((q) => q.id === 'light-concussion-missile');
      if (lcs.baseDamage.mode !== 'ammunition' || lcs.damageType.mode !== 'varies' || !pl || pl.damage.formula !== '4d10' || pl.damageMultiplier !== 2 || pl.damageType.types.join() !== 'slashing' || pl.area.radiusSquares !== 2 || pl.costCredits !== 800 || pl.weightKg !== 10) fail('2L launcher base damage is payload-derived; the Light Concussion Missile payload owns 4d10 x2 Slashing, 2-square splash, 800 cr, 10 kg');
      if (lm.qualities.inaccurate || p0('Light Concussion Missile Launcher').damageMultiplier !== 2 || p0('Light Concussion Missile Launcher').damage.formula !== '4d10') fail('2L launcher is not Inaccurate; its resolved missile profile mirrors the payload 4d10 x2');
      const la = lcs.ammo;
      if (la.type !== 'light-concussion-missile' || la.capacityShots !== null || la.consumesPerAttack !== 1 || la.damageSource !== 'loaded-ammo' || la.payloadDerived !== true || !same2(la.acceptedAmmoIdentities, ['Light Concussion Missile']) || lcs.resource.capacityShots !== null) fail('2L launcher ammo: missile type, one per attack, NO invented capacity, damage from loaded ammo');
      if (!p0('Light Concussion Missile Launcher').conditionalModifiers.some((q) => q.value === -10) || lm.operation.rapidShotAllowed !== false || !p0('Light Concussion Missile Launcher').firingConstraints?.prohibitsMultiShotAbilities) fail('2L launcher -10 vs smaller than Huge and Rapid Shot prohibited');
      const so = f('Sonic Stunner'), sc = so.canonicalStats;
      if (sc.baseDamage.mode !== 'none' || sc.stun.capability !== 'native-stun' || sc.stun.damage?.formula !== '3d6' || sc.damageType.types.join() !== 'energy' || !sc.damageType.qualifiers.includes('sonic') || sc.ammo.status !== 'not-stated' || sc.ammo.type !== null || sc.ammo.capacityShots !== null || so.operation.targeting?.deafTargetsCanBeHarmed !== true || so.operation.audibility?.onlyTargetHearsAttack !== true) fail('2L Sonic Stunner native 3d6 stun only, Energy (sonic), ammo not stated (no invented type/capacity), audible only to the target, harms deaf targets');
      const sw = f('Sith Sword'), ws = sw.canonicalStats;
      if (ws.ammo !== null || ws.baseDamage.formula !== '1d8' || ws.costCredits !== 3000 || ws.damageType.types.join() !== 'slashing,piercing' || ws.damageType.mode !== 'or' || sw.qualities.ignoresDR || JSON.stringify(sw.canonicalStats).includes('19-20') || !ws.defensiveInteractions.some((q) => /does not ignore/.test(q.effect))) fail('2L Sith Sword 1d8 / 3,000 / Slashing OR Piercing, no 19-20 crit, lightsabers do not ignore its DR, ammo null');
      if (!sw.proficiencyRules.some((q) => q.classificationForRules === 'lightsaber' && q.doesNotChangeBaseWeaponGroup === true) || sw.operation.darkSideEmpowerment?.cost?.ForcePoint !== 1 || sw.operation.darkSideEmpowerment?.activationAction !== 'swift' || sw.operation.darkSideEmpowerment?.darkSideScoreIncrease !== 1 || !p0('Sith Sword').triggeredEffects.some((q) => q.id === 'dark-side-empowerment' && q.sideEffect?.darkSideScoreIncrease === 1) || sw.weaponGroup !== 'Simple Weapon') fail('2L Sith Sword lightsaber classification for talents (group unchanged), 1 Force Point swift dark-side empowerment with +1 Dark Side Score');
      const mel = ['Datadagger', 'Sith Sword'].every((n) => f(n).canonicalStats.ammo === null);
      if (!mel) fail('2L pure melee weapons use ammo null');
    }
    if (sb.phase === '2I') {
      const am = (n) => sa.records.find((r) => r.canonicalName === n).canonicalStats.ammo;
      if (am('Energy Lance').scopedToAttackProfiles?.join() !== 'plasma-bolt' || am('Energy Lance').capacityShots !== 50 || am('SG-4 Blaster Rifle').mode !== 'multiple' || am('SG-4 Blaster Rifle').profiles.length !== 2) fail('2I ammo: Energy Lance scoped to plasma-bolt, SG-4 two ammo profiles');
    }
    if (sb.phase === '2J') {
      const m = sa.records.find((r) => r.canonicalName === 'Micro Grenade Launcher').canonicalStats.ammo;
      if (m.damageSource !== 'loaded-ammo-modified-by-weapon' || m.payloadDerived !== true || m.capacityShots !== 4) fail('2J Micro Grenade Launcher ammo: payload from loaded grenade, modified by the weapon, 4 grenades');
    }
    if (sb.phase === '2K') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      const p0 = (n) => f(n).canonicalStats.attackProfiles[0];
      const same2 = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
      if (sa.records.some((r) => r.schemaFamily.branch !== 'ranged') || sa.records.some((r) => !r.repo.present)) fail('2K must be 4 ranged, all repo-present');
      if (sa.records.some((r) => r.qualities.accurate) || !same2(sa.records.filter((r) => r.qualities.inaccurate).map((r) => r.canonicalName), ['Blaster, Wrist', 'Snare Pistol'])) fail('2K no base Accurate; Inaccurate only Wrist Blaster and Snare Pistol');
      const fixedAll = sa.records.flatMap((r) => [r.canonicalStats.baseDamage, ...r.canonicalStats.attackProfiles.map((q) => q.damage)].filter((q) => q.mode === 'fixed').map(() => r.canonicalName));
      if (!fixedAll.length || fixedAll.some((n) => n !== 'Darter') || sa.counts.fixedDamageClaims !== 1) fail('2K only the Darter uses fixed damage');
      const dt = f('Darter').canonicalStats;
      if (dt.baseDamage.mode !== 'fixed' || dt.baseDamage.flatBonus !== 1 || dt.baseDamage.formula !== '1' || p0('Darter').damage.flatBonus !== 1 || f('Darter').qualities.inaccurate || dt.damageType.types.join() !== 'piercing' || dt.range.hardMaxSquares !== 40 || f('Darter').operation.maximumRangeIncrement !== 'short' || !p0('Darter').triggeredEffects.some((q) => q.effect === 'deliver-loaded-toxin') || f('Darter').operation.poisonDeliveryRequiresDamage !== true || sa.records.some((r) => r.canonicalName === 'Surveillance Tagger')) fail('2K Darter fixed damage 1, Piercing, not Inaccurate, Short-increment maximum, poison on damage only, no tagger identity');
      for (const n of ['Blaster, Wrist', 'Snare Pistol']) if (!same2(f(n).canonicalStats.range.allowedBands, ['pointBlank', 'short']) || !same2(f(n).qualityParameters.inaccurate.allowedBands, ['pointBlank', 'short'])) fail(`2K ${n} Inaccurate forbids Medium and Long (book-local rule)`);
      const wb = f('Blaster, Wrist');
      if (wb.canonicalStats.resource.capacityShots !== 1 || wb.operation.sensorDetection?.check !== 'Use Computer' || wb.operation.sensorDetection?.dc !== 25 || wb.repo.id !== 'weapon-wrist-blaster') fail('2K Wrist Blaster one shot, DC 25 Use Computer sensor detection, preserved repo id');
      const sp = f('Snare Pistol');
      if (sp.canonicalStats.baseDamage.mode !== 'none' || sp.canonicalStats.stun.capability !== 'native-stun' || sp.canonicalStats.stun.damage?.formula !== '1d4' || sp.canonicalStats.damageType.types.join() !== 'bludgeoning' || p0('Snare Pistol').attackResolution.mode !== 'grab' || sp.operation.escapeAcrobaticsDC !== 15 || sp.operation.breakStrengthDC !== 20 || !same2(sp.operation.allowedFeats, ['Pin', 'Trip']) || !same2(sp.operation.disallowedFeats, ['Crush', 'Throw', 'Bone Crusher']) || sp.canonicalStats.resource.capacityShots !== 2 || sp.canonicalStats.resource.replacementCostCredits !== 25 || sp.canonicalStats.resource.replacementWeightKg !== 1) fail('2K Snare Pistol native 1d4 stun, Bludgeoning, grab, DC 15/20 escape, feat restrictions, 2-shot cartridge');
      const xn = f('Xerrol Nightstinger');
      if (xn.weaponGroup !== 'Exotic Weapon' || xn.schemaFamily.proficiency !== 'exotic' || xn.canonicalStats.range.profileId !== 'rifles' || xn.qualities.accurate || xn.canonicalStats.resource.capacityShots !== 5 || xn.canonicalStats.resource.replacementCostCredits !== 1000 || xn.operation.firingDoesNotRevealShooterPosition !== true || !p0('Xerrol Nightstinger').triggeredEffects.some((q) => q.id === 'concealed-shot-origin')) fail('2K Xerrol Nightstinger Exotic Weapon with rifle ranges, no Accurate, 5-shot 1,000-credit canister, invisible shots');
      if (!sb.phase1GroupOverrides?.['Xerrol Nightstinger']) fail('2K Xerrol Nightstinger group override must be recorded in the registry');
      for (const r of sa.records) for (const rg of [r.canonicalStats.range, ...r.canonicalStats.attackProfiles.map((q) => q.range)]) if (rg.profileId === 'pistols' && !same2(rg.bands.medium, [41, 60])) fail(`2K ${r.canonicalName} pistol bands must be the canonical profile`);
    }
    if (sb.phase === '2J') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      const p0 = (n) => f(n).canonicalStats.attackProfiles[0];
      const same2 = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
      if (sa.records.some((r) => r.schemaFamily.branch !== 'ranged') || sa.records.length !== 9 || sa.records.some((r) => !r.repo.present)) fail('2J must be 9 ranged, all repo-present');
      if (!same2(sa.records.filter((r) => r.qualities.accurate).map((r) => r.canonicalName), ['Blaster Rifle, Sniper']) || !same2(sa.records.filter((r) => r.qualities.inaccurate).map((r) => r.canonicalName).sort(), ['Micro Grenade Launcher', 'Neural Inhibitor'])) fail('2J base Accurate (Sniper) / Inaccurate (Neural Inhibitor, Micro Grenade Launcher) sets');
      if (sa.records.filter((r) => r.qualities.areaEffect).length !== 3 || sa.records.filter((r) => r.canonicalStats.stun.capability === 'native-stun').length !== 3 || sa.records.filter((r) => r.qualities.autofireOnly).map((r) => r.canonicalName).join() !== 'Subrepeating Blaster') fail('2J 3 area-effect, 3 native-stun, 1 autofire-only (Subrepeating Blaster)');
      const ni = f('Neural Inhibitor'), nt = p0('Neural Inhibitor').triggeredEffects[0];
      if (ni.canonicalStats.damageType.types.join() !== 'piercing' || ni.canonicalStats.range.profileId !== null || nt?.initialSecondaryAttack?.roll !== '1d20+5' || nt.initialSecondaryAttack.defense !== 'fortitude' || nt.onSecondaryAttackSuccess?.conditionTrackSteps !== -1 || nt.onSecondaryAttackFailure?.nextAttackBonusIncrement !== 1 || nt.onSecondaryAttackFailure?.cumulative !== true || nt.cure?.skill !== 'Treat Injury' || nt.cure?.dc !== 20 || !nt.termination.some((q) => q.condition === 'target-falls-unconscious') || nt.recurrence?.timing !== 'beginning-of-target-turn') fail('2J Neural Inhibitor Piercing, no assigned range profile, persistent 1d20+5 Fortitude poison, -1 CT, cumulative +1, DC 20 Treat Injury cure, ends on unconsciousness');
      for (const n of ['Pulse Rifle', 'Deck Sweeper']) if (p0(n).area.shape !== 'cone' || p0(n).area.lengthSquares !== 6 || f(n).canonicalStats.range.mode !== 'fixed-maximum' || f(n).canonicalStats.range.maxSquares !== 6 || f(n).canonicalStats.resource.capacityShots !== 5 || p0(n).attackResolution.onMiss !== 'half-damage') fail(`2J ${n} fixed 6-square cone, half on miss, 5-shot pack`);
      const ds = f('Deck Sweeper').canonicalStats;
      if (ds.baseDamage.mode !== 'none' || ds.stun.capability !== 'native-stun' || ds.stun.damage?.formula !== '3d6' || ds.attackProfiles[0].preparedAttack?.actionCost?.join() !== 'swift' || ds.attackProfiles[0].preparedAttack?.required !== true || ds.attackProfiles[0].preparedAttack?.unpreparedRestriction?.weaponWillNotFire !== true) fail('2J Deck Sweeper native 3d6 stun only, mandatory same-turn swift prime');
      const el = f('Electronet'), ec = el.canonicalStats;
      if (el.weaponGroup !== 'Heavy Weapon (Ammunition)' || ec.deliveryMethod?.requiredLauncher !== 'grenade-launcher' || ec.attackProfiles[0].area.widthSquares !== 2 || ec.attackProfiles[0].area.heightSquares !== 2 || ec.stun.damage?.formula !== '3d8' || ec.baseDamage.mode !== 'none' || !ec.attackProfiles[0].triggeredEffects.some((q) => q.id === 'grab-on-hit') || !ec.attackProfiles[0].triggeredEffects.some((q) => q.id === 'ongoing-net-shock' && q.attackRollRequired === false && q.damage.formula === '3d8')) fail('2J Electronet grenade-launcher ammunition, 2x2 area, native 3d8 stun, grab on hit, recurring 3d8 stun while trapped');
      const sr = f('Subrepeating Blaster');
      if (!sr.qualities.autofireOnly || !same2(sr.canonicalStats.rateOfFire, ['A']) || sr.canonicalStats.resource.capacityShots !== 50 || sr.canonicalStats.integratedAccessories.length !== 1 || sr.canonicalStats.integratedAccessories[0].id !== 'retractable-stock' || p0('Subrepeating Blaster').firingConstraints?.braceRule?.requiresRetractableStockState !== 'extended') fail('2J Subrepeating Blaster autofire-only ROF A, 50 shots, included retractable stock required extended to brace');
      const rm = f('Squib Battering Ram');
      if (rm.repo.id !== 'weapon-battering-ram' || rm.canonicalStats.resource.requiredUnits !== 4 || !rm.canonicalStats.wieldingRules.some((q) => q.minimumOperators === 2) || !p0('Squib Battering Ram').activationRequirements.some((q) => q.type === 'operators' && q.minimum === 2) || !p0('Squib Battering Ram').activationRequirements.some((q) => q.normalDamageWhen === 'stationary-unattended-object')) fail('2J Squib Battering Ram two operators, four power packs, stationary-object restriction, preserved repo id');
      const mg = f('Micro Grenade Launcher'), md = mg.conditionalDamageProfiles[0];
      if (mg.canonicalStats.availability.restriction !== 'illegal' || mg.canonicalStats.baseDamage.mode !== 'special' || md?.diceCountDelta !== -2 || mg.canonicalStats.resource.capacityShots !== 4 || mg.canonicalStats.resource.reloadAction !== 'full-round-action' || mg.canonicalStats.payloadProfiles.length !== 1 || !mg.canonicalStats.payloadProfiles[0].specialEffects.some((q) => q.effect === 'inherit-selected-grenade-normal-rules') || mg.canonicalStats.configurationStates.length !== 2 || mg.canonicalStats.configurationStates.find((q) => q.id === 'rifle-mounted')?.transition?.dc !== 15 || mg.canonicalStats.configurationStates.find((q) => q.id === 'rifle-mounted')?.transition?.timeMinutes !== 1) fail('2J Micro Grenade Launcher Illegal, -2 dice payload transform, payload inheritance, 4 grenades full-round reload, rifle-mount 1 minute DC 15');
      const sn = f('Snare Rifle');
      if (sn.canonicalStats.baseDamage.mode !== 'none' || sn.canonicalStats.stun.damage?.formula !== '1d6' || sn.canonicalStats.damageType.types.join() !== 'bludgeoning' || p0('Snare Rifle').attackResolution.mode !== 'grab' || sn.operation.escapeAcrobaticsDC !== 15 || sn.operation.breakStrengthDC !== 20 || !same2(sn.operation.allowedFeats, ['Pin', 'Trip']) || !same2(sn.operation.disallowedFeats, ['Crush', 'Throw']) || sn.canonicalStats.resource.capacityShots !== 5 || sn.canonicalStats.resource.replacementCostCredits !== 50) fail('2J Snare Rifle native 1d6 stun, Bludgeoning, ranged grab, DC 15/20 escape, Pin/Trip allowed, Crush/Throw disallowed, 5-shot cartridge');
      const sp = f('Blaster Rifle, Sniper');
      if (sp.repo.id !== 'weapon-sniper-blaster-rifle' || !p0('Blaster Rifle, Sniper').conditionalModifiers.some((q) => q.target === 'attackRoll' && q.value === -5 && /not-aimed/.test(q.condition)) || sp.canonicalStats.resource.capacityShots !== 10 || !sp.operation.upgradeRestrictions?.includes('rapid-recycler') || sp.canonicalStats.integratedAccessories.length !== 0) fail('2J Sniper Blaster Rifle Accurate, -5 unless Aimed, 10 shots, no Rapid Recycler, no mandatory bipod/scope');
    }
    if (sb.phase === '2I') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      const pr = (n, id) => f(n).canonicalStats.attackProfiles.find((q) => q.id === id);
      const same2 = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
      if (sa.records.filter((r) => r.schemaFamily.branch === 'melee').length !== 4 || sa.records.filter((r) => r.schemaFamily.branch === 'ranged').length !== 8) fail('2I must be 4 melee + 8 ranged');
      if (!same2(sa.records.filter((r) => r.qualities.accurate).map((r) => r.canonicalName), ['Siang Lance']) || !same2(sa.records.filter((r) => r.qualities.inaccurate).map((r) => r.canonicalName), ['Flechette Launcher'])) fail('2I base Accurate (Siang Lance) / Inaccurate (Flechette Launcher) sets');
      if (sa.records.filter((r) => r.crossPublishedSources?.length).length !== 2 || sa.counts.crossPublishedIdentityClaims !== 2) fail('2I exactly two cross-published identities');
      const rg = f('BlasTech 500 Riot Gun');
      if (rg.conflictGate?.status !== 'RESOLVED_BY_PLANNER_RULING_PHASE_3B' || !(auth.phases['1-weapons-content'].openContentAdjudications || []).some((q) => q.subject === 'BlasTech 500 Riot Gun') || rg.qualities.inaccurate) fail('2I BlasTech 500 Riot Gun stays conflict-gated and un-Inaccurate in this book');
      if (rg.canonicalStats.costCredits !== 1200 || rg.canonicalStats.weightKg !== 2.2 || !rg.canonicalStats.modeProfiles.some((m) => m.conditionalModifiers?.some((c) => c.value === -1)) || !rg.canonicalStats.modeProfiles.some((m) => m.conditionalModifiers?.some((c) => c.value === 2 && c.type === 'equipment'))) fail('2I Riot Gun 1200 cr / 2.2 kg, -1 single-shot, +2 equipment autofire');
      const fl = f('Flechette Launcher');
      if (!fl.crossPublishedSources.some((c) => /Force Unleashed/.test(c.book) && c.page === 199) || fl.canonicalStats.attackProfiles[0].area.radiusSquares !== 1 || !fl.canonicalStats.attackProfiles[0].firingConstraints?.prohibitsMultiShotAbilities || fl.canonicalStats.resource.capacityShots !== 4) fail('2I Flechette Launcher same identity as Force Unleashed, 1-square splash, 4-shot canister, no multi-shot');
      for (const n of ['Merr-Sonn PLX-2M Portable Missile Launcher', 'Miniature Proton Torpedo Launcher']) if (f(n).qualities.inaccurate || !f(n).qualities.areaEffect) fail(`2I ${n} is Area Attack and not Inaccurate`);
      const mp = f('Miniature Proton Torpedo Launcher').canonicalStats;
      if (mp.baseDamage.mode !== 'ammunition' || mp.payloadProfiles[0]?.damage.formula !== '6d10' || mp.payloadProfiles[0]?.damageMultiplier !== 1 || pr('Miniature Proton Torpedo Launcher', 'area').damageMultiplier !== 1 || pr('Miniature Proton Torpedo Launcher', 'single-target').damageMultiplier !== 2 || pr('Miniature Proton Torpedo Launcher', 'single-target').damage.formula !== '6d10' || pr('Miniature Proton Torpedo Launcher', 'area').area.radiusSquares !== 2 || mp.resource.capacityShots !== 4) fail('2I Mini Proton Torpedo: persistent 6d10, single-target profile x2, 2-square area, 4 torpedoes');
      if (!pr('Miniature Proton Torpedo Launcher', 'single-target').conditionalModifiers.some((m) => m.value === -10)) fail('2I Mini Proton Torpedo single-target -10 against targets smaller than Huge');
      const px = f('Merr-Sonn PLX-2M Portable Missile Launcher').canonicalStats;
      if (px.attackProfiles[0].area.radiusSquares !== 3 || px.resource.capacityShots !== 6 || px.modeProfiles.length !== 3 || f('Merr-Sonn PLX-2M Portable Missile Launcher').operation.encumbranceException?.ignoreWeaponWeight !== true) fail('2I PLX-2M 3-square burst, six missiles, three modes, encumbrance exception');
      const sg = f('SG-4 Blaster Rifle').canonicalStats;
      const sb2 = sg.attackProfiles.find((q) => q.id === 'blaster'), sh = sg.attackProfiles.find((q) => q.id === 'harpoon');
      if (sg.attackProfiles.length !== 2 || sg.baseDamage.formula !== '3d8' || sb2.damage.formula !== '3d8' || sh.damage.formula !== '2d6' || sg.stun.damage?.formula !== '2d8' || sg.stun.damageMode !== 'explicit') fail('2I SG-4 keeps separate 3d8 blaster and 2d6 harpoon profiles with explicit 2d8 stun');
      if (sb2.conditionalRangeRules[0]?.when?.environment !== 'underwater' || sb2.conditionalRangeRules[0]?.multiplier !== 0.5 || sh.conditionalRangeRules[0]?.when?.environment !== 'not-underwater' || sh.conditionalRangeRules[0]?.multiplier !== 0.5) fail('2I SG-4 opposite half-range rules (blaster underwater, harpoon out of water)');
      if (sg.resourceProfiles.length !== 2 || !same2(sg.resourceProfiles.map((q) => q.usedByAttackProfiles?.[0]), ['blaster', 'harpoon']) || sg.resourceProfiles[0].capacityShots !== 50) fail('2I SG-4 independent power pack and harpoon resource profiles');
      const el = f('Energy Lance').canonicalStats;
      if (el.resourceProfiles.length !== 2 || el.resourceProfiles[0].quantityRequired !== 2 || el.resourceProfiles[1].capacityShots !== 50 || el.attackProfiles.length !== 2) fail('2I Energy Lance two energy cells plus separate 50-shot plasma power pack, melee + plasma profiles');
      if (f('Power Lance').canonicalStats.attackProfiles.length !== 1 || f('Power Lance').canonicalStats.resource.quantityRequired !== 2 || f('Power Lance').canonicalStats.resourceProfiles.length !== 0) fail('2I Power Lance is the lance without a plasma mode, two energy cells');
      for (const n of ['Energy Lance', 'Power Lance']) if (!f(n).canonicalStats.wieldingRules.some((q) => q.id === 'mounted-medium-one-hand') || !f(n).canonicalStats.wieldingRules.some((q) => q.effect?.attackRollModifier === -1)) fail(`2I ${n} mounted one-hand and -1 unmounted Medium rules`);
      const ax = f('Axe');
      if (!ax.qualities.thrown || !ax.canonicalStats.attackProfiles.some((q) => q.id === 'thrown') || ax.canonicalStats.baseDamage.formula !== '1d8') fail('2I Axe 1d8 and throwable');
      const gd = f('Gaderffii');
      if (!gd.qualities.doubleWeapon || gd.canonicalStats.attackProfiles.length !== 2 || gd.canonicalStats.modeProfiles[0]?.attackRollModifierEach !== -10 || gd.repo.id !== 'weapon-tusken-gaderffii-stick') fail('2I Gaderffii double weapon, -10 each end full-round, preserved repo id');
      const sl = f('Siang Lance');
      if (sl.canonicalStats.resource.capacityShots !== 100 || sl.canonicalStats.range.profileId !== 'rifles' || sl.canonicalStats.stun.damageMode !== 'same-as-base' || sl.canonicalStats.attackProfiles.find((q) => q.id === 'bayonet-aao')?.damage.formula !== 'Core Bayonet') fail('2I Siang Lance 100 shots, rifle range, base-matched stun, bayonet inherits Core Bayonet');
      const cg = f('Concussion Grenade').canonicalStats.attackProfiles[0];
      if (cg.damage.formula !== '8d6' || cg.area.radiusSquares !== 2 || cg.attackResolution.onMiss !== 'half-damage' || f('Concussion Grenade').canonicalStats.damageType.types.join() !== 'bludgeoning') fail('2I Concussion Grenade 8d6 bludgeoning 2-square burst, half on miss');
      const gg = f('Gas Grenade').canonicalStats;
      if (gg.baseDamage.mode !== 'none' || gg.stun.capability !== 'native-stun' || gg.stun.damage?.formula !== '4d6' || gg.damageType.mode !== 'none' || gg.attackProfiles[0].attackResolution.defense !== 'fortitude' || gg.attackProfiles[0].area.radiusSquares !== 4 || f('Gas Grenade').operation.conditionTrackOnHit !== -2 || f('Gas Grenade').operation.conditionTrackWithEvasion !== -1) fail('2I Gas Grenade no lethal damage, native 4d6 stun, Fortitude 4-square blast, -2 CT (-1 Evasion)');
      for (const r of sa.records) {
        if (r.canonicalStats.attackProfiles.some((q) => q.damageMultiplier !== 1 && !(r.canonicalName === 'Miniature Proton Torpedo Launcher' && q.id === 'single-target'))) fail(`2I ${r.canonicalName} unexpected damage multiplier`);
        if (r.canonicalStats.attackProfiles.some((q) => q.conditionalRangeRules.length) && r.canonicalName !== 'SG-4 Blaster Rifle') fail(`2I ${r.canonicalName} unexpected conditionalRangeRules`);
        if (r.canonicalStats.resourceProfiles.length && !['Energy Lance', 'SG-4 Blaster Rifle'].includes(r.canonicalName)) fail(`2I ${r.canonicalName} unexpected resourceProfiles`);
      }
    }
    if (sb.phase === '2H') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      const p0 = (n) => f(n).canonicalStats.attackProfiles[0];
      const pid = (n, id) => f(n).canonicalStats.attackProfiles.find((q) => q.id === id);
      const same2 = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
      if (sa.records.filter((r) => r.schemaFamily.branch === 'melee').length !== 5 || sa.records.filter((r) => r.schemaFamily.branch === 'ranged').length !== 9) fail('2H must be 5 melee + 9 ranged');
      if (!same2(sa.records.filter((r) => r.qualities.accurate).map((r) => r.canonicalName).sort(), ['Magna Caster', 'Targeting Blaster Rifle', 'Verpine Shatter Gun'])) fail('2H base Accurate set');
      if (!same2(sa.records.filter((r) => r.qualities.inaccurate).map((r) => r.canonicalName).sort(), ['Black-Powder Pistol', 'Crossbow', 'Survival Knife'])) fail('2H base Inaccurate set');
      if (!same2(sa.records.filter((r) => r.canonicalStats.attackProfiles.some((q) => q.id === 'thrown')).map((r) => r.canonicalName).sort(), ['Electropole', 'Survival Knife'])) fail('2H explicitly throwable melee set');
      if (sa.records.filter((r) => r.canonicalStats.stun.capability === 'native-stun').length !== 1 || sa.counts.nativeStunOnlyClaims !== 1) fail('2H exactly one native-stun-only weapon');
      for (const n of ['Black-Powder Pistol', 'Crossbow', 'Survival Knife']) if (!same2(f(n).qualityParameters.inaccurate.allowedBands, ['pointBlank', 'short', 'medium'])) fail(`2H ${n} Inaccurate must exclude Long only`);
      for (const r of sa.records) {
        if (!r.canonicalStats.technologyClassification || !('deliveryMethod' in r.canonicalStats) || !Array.isArray(r.canonicalStats.wieldingRules) || !Array.isArray(r.canonicalStats.triggeredEffects)) fail(`2H ${r.canonicalName} missing v2.6 record fields`);
        for (const q of r.canonicalStats.attackProfiles) for (const k of ['criticalEffects', 'activationRequirements', 'triggeredEffects', 'conditionalModifiers']) if (!Array.isArray(q[k])) fail(`2H ${r.canonicalName}/${q.id} missing ${k}[]`);
        if (r.canonicalStats.range.hardMaxSquares != null && r.canonicalName !== 'Stun Pistol' && r.canonicalStats.stun.rangeRule?.hardMaxSquares == null) fail(`2H ${r.canonicalName} must not turn a legacy repo range string into a hard maximum`);
      }
      const bs = f('Blastsword');
      if (bs.canonicalStats.size !== 'Medium' || !bs.canonicalStats.wieldingRules.some((q) => /Finesse/.test(q.scope || '') && q.effect === 'counts-as-light-weapon') || bs.operation.requiresPowerPack !== true) fail('2H Blastsword stays Medium and counts as light only for Weapon Finesse');
      const cs = f('Contact Stunner').canonicalStats;
      if (cs.baseDamage.formula !== '1d4' || cs.stun.damageMode !== 'explicit' || cs.stun.damage?.formula !== '2d8' || f('Contact Stunner').operation.concealmentEquipmentBonus !== 5 || f('Contact Stunner').operation.concealmentSkill !== 'Stealth') fail('2H Contact Stunner 1d4 normal / explicit 2d8 stun and +5 Stealth concealment');
      const ep = f('Electropole');
      if (ep.canonicalStats.baseDamage.formula !== '2d8' || !pid('Electropole', 'thrown') || ep.canonicalStats.resource.requiredUnits !== 2 || !ep.proficiencyRules.some((q) => /Gungan/.test(q.condition) && /simple/.test(q.condition)) || ep.repo.id !== 'weapon-gungan-electropole') fail('2H Electropole 2d8, thrown profile, two energy cells, Gungan simple-proficiency substitution, preserved repo id');
      const sk = f('Survival Knife');
      if (!sk.qualities.thrown || !sk.qualities.inaccurate || sk.operation.alwaysDetermineNorth !== true || JSON.stringify(sk).match(/storageCapacity|capacity(Items|Kg|Cm)/)) fail('2H Survival Knife thrown+Inaccurate, compass only, no invented storage capacity');
      const vs = f('Vibro-Saw');
      if (!vs.qualities.ignoresDR || vs.canonicalStats.damageReductionInteraction.mode !== 'ignore' || vs.canonicalStats.resource.requiredUnits !== 2) fail('2H Vibro-Saw ignores DR and takes two energy cells');
      const bp = f('Black-Powder Pistol'), bf = p0('Black-Powder Pistol').firingConstraints;
      if (bp.canonicalStats.resource.capacityShots !== 1 || bp.canonicalStats.resource.reloadAction !== 'full-round' || !bf?.reloadRequiredAfterEachShot || !bf.prohibitsMultiShotAbilities || bf.maxShotsPerRound !== 1 || bp.canonicalStats.resource.purchaseQuantityShots !== 50 || bp.canonicalStats.resource.purchaseCostCredits !== 5) fail('2H Black-Powder Pistol one-shot full-round reload, multi-shot prohibition, 50-shot package');
      const fg = bp.canonicalStats.constructionRules;
      if (fg?.searchCheck?.dc !== 20 || fg?.craftCheck?.dc !== 15 || fg?.baseOutputShots !== 5 || fg?.extraOutputPerPointsOverDC !== 5) fail('2H Black-Powder Pistol foraging procedure');
      for (const n of ['Concussion Rifle', 'Squib Tensor Rifle']) if (p0(n).attackResolution.defense !== 'fortitude') fail(`2H ${n} must target Fortitude Defense`);
      if (!JSON.stringify(f('Concussion Rifle').canonicalStats.attackProfiles[0].triggeredEffects).match(/prone/i)) fail('2H Concussion Rifle knocks prone on a hit');
      if (f('Concussion Rifle').canonicalStats.resource.capacityShots !== 25 || f('Concussion Rifle').canonicalStats.range.profileId !== 'rifles') fail('2H Concussion Rifle 25 shots / rifle range');
      const sq = f('Squib Tensor Rifle');
      if (sq.canonicalStats.range.profileId !== 'rifles' || sq.canonicalStats.resource.capacityShots !== 15 || !JSON.stringify(sq.canonicalStats.attackProfiles[0].triggeredEffects).match(/condition/i) || !sq.proficiencyRules.some((q) => /Squib/.test(q.condition))) fail('2H Squib Tensor Rifle rifle range, 15 shots, -1 condition track on every hit, Squib rifle proficiency');
      const cb = f('Crossbow').canonicalStats;
      if (cb.resource.capacityShots !== 1 || cb.range.profileId !== 'simple-weapons') fail('2H Crossbow one bolt / simple-weapon range');
      if (!JSON.stringify(p0('Heavy Slugthrower Pistol').conditionalModifiers).match(/Rapid Shot/) || f('Heavy Slugthrower Pistol').canonicalStats.resource.capacityShots !== 8) fail('2H Heavy Slugthrower Pistol extra -1 with multi-shot feats, 8-shot clip');
      const mc = f('Magna Caster');
      if (mc.canonicalStats.range.profileId !== 'heavy-weapons' || mc.canonicalStats.resource.capacityShots !== 10 || !JSON.stringify(mc).match(/snip/i)) fail('2H Magna Caster exotic range classification, 10-bolt case, +5 Stealth to snipe');
      const sp = f('Stun Pistol');
      if (sp.canonicalStats.baseDamage.mode !== 'none' && sp.canonicalStats.baseDamage.formula) fail('2H Stun Pistol must have no lethal base damage');
      if (sp.canonicalStats.stun.capability !== 'native-stun' || sp.canonicalStats.stun.damage?.formula !== '3d6' || sp.canonicalStats.range.hardMaxSquares !== 20 || sp.canonicalStats.resource.capacityShots !== 50) fail('2H Stun Pistol native 3d6 stun, 20-square maximum, 50 shots');
      const tb = f('Targeting Blaster Rifle');
      const ad = tb.conditionalDamageProfiles.find((q) => q.id === 'aimed-damage-die-upgrade');
      if (tb.canonicalStats.baseDamage.formula !== '3d6' || tb.canonicalStats.attackProfiles[0].damage.formula !== '3d6' || ad?.fromDieSize !== 6 || ad?.toDieSize !== 8 || ad?.damage?.formula !== '3d8' || ad?.condition?.type !== 'aimed-before-attack') fail('2H Targeting Blaster Rifle base 3d6 with aim d6->d8 for that attack only');
      if (tb.canonicalStats.resource.capacityShots !== 50 || !JSON.stringify(tb).match(/folding stock/i)) fail('2H Targeting Blaster Rifle 50 shots, explicitly no folding stock');
      const vp = f('Verpine Shatter Gun');
      if (vp.canonicalStats.damageType.types.join() !== 'energy' || vp.canonicalStats.range.profileId !== 'pistols' || !vp.proficiencyRules.some((q) => /Verpine/.test(q.condition)) || vp.repo.id !== 'weapon-verpine-shattergun') fail('2H Verpine Shatter Gun Energy type, pistol range, Verpine proficiency, preserved repo id');
      const vce = JSON.stringify(vp.canonicalStats.attackProfiles[0].criticalEffects);
      if (!vce.includes('1d10') && !vce.match(/10/) || !vce.match(/after|post/i)) fail('2H Verpine Shatter Gun +1d10 critical added after multiplication');
    }
    if (sb.phase === '2G') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      const p0 = (n) => f(n).canonicalStats.attackProfiles[0];
      const ce = (n) => p0(n).criticalEffects[0];
      if (ce('Blaster Carbine, Hunting')?.fromDieSize !== 8 || ce('Blaster Carbine, Hunting')?.toDieSize !== 10 || ce('Blaster Rifle, Heavy Assault')?.fromDieSize !== 10 || ce('Blaster Rifle, Heavy Assault')?.toDieSize !== 12) fail('2G critical die-size upgrades (d8->d10 Hunting Carbine, d10->d12 Heavy Assault Rifle)');
      if (f('Blaster Rifle, Heavy Assault').canonicalStats.baseDamage.dieSize !== 10) fail('2G critical effects must not mutate persistent base damage');
      const sp = f('Blaster Carbine, Sporting');
      if (sp.qualities.inaccurate !== true || !sp.conditionalQualities.some((q) => q.quality === 'inaccurate' && q.state === false && q.when?.wieldedHands === 2)) fail('2G Sporting Carbine keeps table Inaccurate with a two-handed conditional override');
      for (const n of ['Razor Bug', 'Thud Bug']) {
        const r = f(n);
        if (!r.canonicalStats.technologyClassification.tags.includes('biotech') || r.canonicalStats.deliveryMethod?.rangeClassification !== 'simple-weapon' || r.canonicalStats.range.profileId !== 'simple-weapons' || r.qualities.thrown) fail(`2G ${n} biotech, thrown by hand but simple-weapon ranges`);
      }
      const hb = f('Heavy Blaster Cannon');
      if (hb.canonicalStats.size !== 'Huge' || hb.canonicalStats.attackProfiles[0].preparedAttack?.temporaryOverrides?.effectiveWeaponSize !== 'Large') fail('2G Heavy Blaster Cannon: canonical Huge with braced effective size Large');
      const bb = f('Blaster Pistol, Bluebolt').canonicalStats.stun;
      if (bb.rangeRule?.hardMaxSquares !== 8 || p0('Blaster Pistol, Bluebolt').resourceConsumption.stunUnits !== 2) fail('2G Bluebolt 8-square stun exception and 2-shot stun consumption');
      if (f('Concealed Dart Launcher').canonicalStats.range.profileId !== 'pistols' || f('Concealed Dart Launcher').canonicalStats.stun.capability !== 'native-stun' || f('Concealed Dart Launcher').canonicalStats.stun.rangeRule?.sourceExceptionToStandardStunSettingSixSquareCap !== true) fail('2G Concealed Dart Launcher pistol ranges and uncapped native stun');
      if (p0('ARC-9965 Blaster Rifle').resourceConsumption.autofireUnits !== 10) fail('2G ARC-9965 autofire consumes 10 shots');
      const dbl = f('Blaster Carbine, Double-Barreled');
      const ds = dbl.canonicalStats.attackProfiles.find((q) => q.id === 'double-shot');
      if (!ds || ds.resourceConsumption.multiplier !== 2 || !ds.qualities.areaEffect || !ds.firingConstraints.prohibitsMultiShotAbilities || !dbl.canonicalStats.modeProfiles.some((m) => m.attackProfileId === 'double-shot' && m.switchAction === 'swift')) fail('2G Double-Barreled double-shot mode');
      const sw = f('Shock Whip').canonicalStats.triggeredEffects;
      if (!sw.some((q) => q.id === 'grabbed-target-shock' && q.attackRollRequired === false && q.damage.formula === '2d6')) fail('2G Shock Whip automatic 2d6 shock');
      if (f('Tehkla Blade').schemaFamily.branch !== 'melee' || f('Tehkla Blade').publishedName !== "Tehk'la blade") fail("2G Tehkla Blade is a melee weapon with its published spelling");
      if (!f('Long-Handle Lightsaber').crossPublishedSources?.length || f('Long-Handle Lightsaber').canonicalStats.attackProfiles.length !== 1) fail('2G Long-Handle Lightsaber keeps only its Legacy claim and its cross-publication record');
      if (f('Long-Handle Lightsaber').canonicalStats.wieldingRules.some((q) => /cannot|only|always/i.test(q.effect || ''))) fail('2G Long-Handle Lightsaber is not permanently two-handed');
    }
    if (sb.phase === '2F') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      const sm = f('Retrosaber').canonicalStats;
      if (sm.costCredits !== null || sm.weightKg !== null || sm.size !== null || sm.availability.restriction !== null) fail('2F Retrosaber cost/weight/size/availability must stay unpublished (null)');
      if (!same(sm.stateMachine.states, ['normal', 'overcharge', 'burnout']) || !sm.stateMachine.transitions.every((t2) => t2.from !== 'burnout' || t2.to === 'normal') || !sm.stateMachine.locks?.some((l) => l.state === 'burnout')) fail('2F Retrosaber forced overcharge -> burnout -> normal state machine with burnout lockout');
      if (sm.constructionRules?.baseConstructionDC !== 25) fail('2F Retrosaber construction DC 25');
      const lw = f('Lightwhip').canonicalStats.attackProfiles[0].triggeredEffects.find((q) => q.modifierPolicy);
      if (!lw || !lw.modifierPolicy.exclude?.length) fail('2F Lightwhip delayed damage must record its excluded modifiers');
      const sn = f('San-Ni Staff').canonicalStats.stun;
      if (sn.capability !== 'optional-per-attack' || sn.activation?.timing !== 'attack-declaration') fail('2F San-Ni Staff stun is declared per attack');
      if (f('Wan-Shen').canonicalStats.configurationStates.find((q) => q.id === 'disassembled')?.components !== 4) fail('2F Wan-Shen disassembles into four components');
      const gl = f('Lightsaber, Great').canonicalStats.wieldingRules;
      if (gl.some((q) => /cannot|prohibit|only/i.test(q.effect || ''))) fail('2F Great Lightsaber size gate must not be a wielding prohibition');
      for (const n of ['Long-Handle Lightsaber', 'Lightsaber Pike']) if (f(n).canonicalStats.attackProfiles.find((q) => q.id === 'haft-end')?.damageType.mode !== 'unspecified') fail(`2F ${n} haft-end damage type must stay unspecified`);
      const lh = f('Long-Handle Lightsaber').canonicalStats.attackProfiles;
      if (!lh.find((q) => q.id === 'haft-end')?.activationRequirements.some((q) => q.type === 'feat' && q.id === 'Long Haft Form')) fail('2F Long-Handle haft end requires Long Haft Form');
      if (f('Lightsaber, Great').qualities.doubleWeapon || f('Long-Handle Lightsaber').qualities.doubleWeapon) fail('2F no unconditional double-weapon quality on Great/Long-Handle');
      const dsc = f('Discblade');
      if (dsc.canonicalStats.range.profileId !== 'thrown-weapons' || dsc.qualities.thrown !== true || /return/i.test(JSON.stringify(dsc.qualities))) fail('2F Discblade uses thrown-weapon range and has no innate returning quality');
      if (f('Guard Shoto').canonicalStats.defensiveInteractions.find((q) => /phrik/.test(q.id))?.condition !== 'handle-is-phrik-laced') fail('2F Guard Shoto phrik DR protection must stay conditional');
      for (const n of ['Guard Shoto', 'Lightsaber Pike', 'Long-Handle Lightsaber']) if (!f(n).crossPublishedSources?.length) fail(`2F ${n} must keep its cross-publication record`);
    }
    if (sb.phase === '2E') {
      const f = (n) => sa.records.find((r) => r.canonicalName === n);
      const ap0 = (n) => f(n).canonicalStats.attackProfiles[0];
      const rg = f('BlasTech 500 Riot Gun');
      if (rg.conflictGate?.status !== 'RESOLVED_BY_PLANNER_RULING_PHASE_3B' || !(auth.phases['1-weapons-content'].openContentAdjudications || []).some((q) => q.subject === 'BlasTech 500 Riot Gun')) fail('2E BlasTech 500 Riot Gun claim gate must be recorded as resolved by the planner ruling');
      if (!ap0('BlasTech 500 Riot Gun').conditionalModifiers.some((m) => m.value === -2 && /single-shot/.test(m.condition))) fail('2E Riot Gun single-shot -2 modifier missing');
      const dfn = f('Gee-Tech 12 Defender Microblaster').canonicalStats;
      if (dfn.range.hardMaxSquares !== 3 || dfn.resource.integrated !== true || dfn.resource.rechargeable !== false || dfn.resource.disposableWhenDepleted !== true || dfn.resource.capacityShots !== 2) fail('2E Defender hard max range / integrated disposable power pack');
      const fl = f('SoroSuub Firelance Blaster Rifle').canonicalStats.stun;
      if (fl.damageMode !== 'explicit' || fl.damage?.formula !== '4d6') fail('2E Firelance must keep explicit 4d6 stun');
      const wr = f('Wrist Rocket Launcher');
      if (wr.weaponGroup !== 'Exotic Weapon' || wr.canonicalStats.payloadProfiles.length !== 7 || sa.counts.wristRocketPayloadProfiles !== 7) fail('2E Wrist Rocket Launcher: Exotic Weapon with 7 payload profiles');
      if (f('Merr-Sonn Model 434 DeathHammer').canonicalStats.objectDurability?.damageReductionEquipmentBonus !== 2 || f('BlasTech DH-23 Outback Blaster Pistol').canonicalStats.objectDurability?.strength !== 17) fail('2E object durability');
      if (f('BlasTech DLT-20A "Longbarrel" Blaster Rifle').canonicalStats.integratedAccessories.length !== 1) fail('2E DLT-20A integrated scope');
      if (f('Vibroknucklers').canonicalStats.baseDamage.mode !== 'modifier' || !f('Vibroknucklers').proficiencyRules.some((q) => q.simultaneous)) fail('2E Vibroknucklers modifier damage / simultaneous proficiency');
      if (ap0('Stunning Gauntlet').damage.mode !== 'inherited') fail('2E Stunning Gauntlet inherited damage');
      for (const n of ['BlasTech 500 Riot Gun', 'BlasTech DT-12 Heavy Blaster Pistol', 'Gee-Tech 12 Defender Microblaster']) if (!same(f(n).qualityParameters.inaccurate.allowedBands, ['pointBlank', 'short', 'medium'])) fail(`2E ${n} Inaccurate must exclude Long only`);
    }
    if (sb.phase === '2C') {
      const g = (n) => sa.records.find((r) => r.canonicalName === n);
      for (const n of ['Scatter Gun', 'Ascension Gun', 'Blaster Rifle, Heavy Variable']) if (!same(g(n).qualityParameters.inaccurate.allowedBands, ['pointBlank', 'short'])) fail(`2C ${n} Inaccurate must exclude Medium and Long (book-specific definition)`);
      if (g('Interchangeable Weapon System').canonicalStats.attackProfiles.length !== 3 || g('Blaster Rifle, Variable').canonicalStats.modeProfiles.length !== 3) fail('2C IWS / Variable rifle mode structure missing');
    }
    if (!errors.length) console.log(`Phase 2 standalone ${sb.phase} ${sa.book} OK: ${sa.records.length} records (${t.present} present, ${sa.records.length - t.present} missing)`);
  }
  if (AMMO_SEEN.size !== 209 || [...AMMO_OVERLAY.keys()].some((k) => !AMMO_SEEN.has(k))) fail(`v2.9 ammo overlay must cover exactly the 209 source claims (covered ${AMMO_SEEN.size})`);
  else {
    const ovm = [...AMMO_OVERLAY.values()];
    const cnt = (fn) => ovm.filter(fn).length;
    if (cnt((e) => e.ammo === null) !== 76 || cnt((e) => e.ammo?.status === 'established') !== 102 || cnt((e) => e.ammo?.status === 'self-contained') !== 20 || cnt((e) => e.ammo?.status === 'not-stated') !== 10 || cnt((e) => e.ammo?.status === 'partially-established') !== 1 || cnt((e) => e.ammo?.mode === 'multiple') !== 4) fail('v2.9 ammo overlay status totals (76 null / 102 established / 20 self-contained / 10 not-stated / 1 partial / 4 multiple)');
  }
  if (errors.length === e0) console.log(`Phase 2 weapons stat/schema OK: ${s2.books.map((b) => `${b.phase} ${b.book} (${b.records.length})`).join('; ')}`);
}


// Phase 3A: cross-publication reconciliation, recomputed from the certified Phase 1/Phase 2 claims
const p3 = auth.phases['3-weapons-canonical-authority'];
if (p3) {
  const e3 = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const a3 = p3.subphases['3A'];
  const rec3 = JSON.parse(fs.readFileSync(path.join(ROOT, a3.file), 'utf8'));
  if (!fs.existsSync(path.join(ROOT, a3.doc))) fail('3A missing doc');
  if (p3.productionMutationAuthorized !== false) fail('3A production mutation must stay unauthorized');
  const claims = new Map();
  const addClaims = (b, ph) => { for (const r of b.records) { const k = r.canonicalName; if (!claims.has(k)) claims.set(k, []); claims.get(k).push({ ph, r }); } };
  addClaims(s2.books[0], '2A');
  for (const sb of s2.standaloneBookAuthorities) addClaims(JSON.parse(fs.readFileSync(path.join(ROOT, sb.file), 'utf8')), sb.phase);
  const p1all = auth.phases['1-weapons-content'].books.flatMap((b) => b.records.map((r) => r.canonicalName));
  const dupNames = [...new Set(p1all.filter((n, i) => p1all.indexOf(n) !== i))].sort();
  if (p1all.length !== 209 || new Set(p1all).size !== 203 || rec3.inputCounts.phase1SourceClaims !== 209 || rec3.inputCounts.phase1UniqueProductionIdentities !== 203 || rec3.inputCounts.crossPublicationDuplicateClaims !== 6 || dupNames.length !== 6) fail('3A input counts must reconcile 209 claims -> 203 identities with exactly six duplicated identities');
  if (!same(rec3.records.map((q) => q.canonicalIdentity).sort(), dupNames)) fail(`3A identities ${rec3.records.map((q) => q.canonicalIdentity).sort()} must equal the six Phase 1 cross-published identities ${dupNames}`);
  if (rec3.outputCounts.crossPublishedIdentitiesReviewed !== 6 || rec3.outputCounts.resolvedIdentities !== 6 || rec3.outputCounts.unresolvedCrossPublicationConflicts !== 0 || rec3.outputCounts.explicitSourceConflictsCarriedForward !== 0 || rec3.outputCounts.resolvedCompatibleOrAdditive !== rec3.records.filter((q) => !q.conflictHistory?.length).length || rec3.outputCounts.resolvedByPrecedenceRuling !== rec3.records.filter((q) => q.conflictHistory?.length).length || rec3.outputCounts.resolvedByPrecedenceRuling !== 2 || rec3.records.some((q) => q.conflicts?.length)) fail('3A output counts (6 resolved: 4 compatible/additive + 2 by precedence ruling, 0 unresolved)');
  const dmgStr = (r) => `${r.canonicalStats.damageType.types.map((t) => t[0].toUpperCase() + t.slice(1)).join(r.canonicalStats.damageType.mode === 'and' ? ' AND ' : ' OR ')}`;
  const field = {
    weaponGroup: (r) => r.weaponGroup, size: (r) => r.canonicalStats.size, costCredits: (r) => r.canonicalStats.costCredits, baseDamage: (r) => r.canonicalStats.baseDamage.formula, weightKg: (r) => r.canonicalStats.weightKg, damageType: dmgStr,
    rare: (r) => r.canonicalStats.availability.rare, ignoresDR: (r) => r.qualities.ignoresDR, reach: (r) => r.qualities.reach, inaccurate: (r) => r.qualities.inaccurate, areaEffect: (r) => r.qualities.areaEffect, rateOfFire: (r) => r.canonicalStats.rateOfFire,
    availability: (r) => r.canonicalStats.availability.restriction,
  };
  for (const q of rec3.records) {
    const n = q.canonicalIdentity, cl = claims.get(n) || [];
    if (cl.length !== 2) { fail(`3A ${n} needs exactly two certified claims, found ${cl.length}`); continue; }
    const p1r = auth.phases['1-weapons-content'].books.flatMap((b) => b.records).find((x) => x.canonicalName === n);
    if ((q.repoId ?? null) !== (p1r.repo.id ?? null)) fail(`3A ${n} repoId ${q.repoId} differs from Phase 1 ${p1r.repo.id}`);
    for (const src of q.sources) if (!cl.some((c) => c.r.source.book === src.book && c.r.source.descriptionPage === src.page)) fail(`3A ${n} source ${src.book} p.${src.page} is not a certified claim`);
    if (!same(q.sources.map((x) => `${x.book}|${x.page}`).sort(), cl.map((c) => `${c.r.source.book}|${c.r.source.descriptionPage}`).sort())) fail(`3A ${n} sources must be exactly the two certified claims`);
    const facts = q.compatibleFacts || q.canonicalMerge || {};
    const keyMap = { availability: 'availability' };
    for (const [k, val] of Object.entries(facts)) {
      const fn = field[k]; if (!fn) continue;
      for (const c of cl) { const got = fn(c.r); const norm = (x) => (typeof x === 'string' ? x.toLowerCase() : x); if (k === 'baseDamage' && got === '-' && /^none/i.test(String(val))) continue; if (got !== undefined && got !== null && !same(norm(got), norm(val)) && !(k === 'availability' && typeof val === 'string' && val.toLowerCase() === 'rare')) fail(`3A ${n} stated ${k}=${JSON.stringify(val)} but ${c.ph} claim says ${JSON.stringify(got)}`); }
    }
    // conflicts: recompute differing fields between the two claims
    const differ = [];
    for (const k of ['costCredits', 'weightKg', 'size', 'baseDamage', 'damageType', 'weaponGroup', 'availability', 'inaccurate', 'ignoresDR', 'reach', 'areaEffect', 'rateOfFire']) { const [x, y] = cl.map((c) => field[k](c.r)); if (!same(x, y) && x !== null && y !== null) differ.push(k === 'availability' ? 'availability.restriction' : k === 'inaccurate' ? 'qualities.inaccurate' : k); }
    const listed = (q.conflictHistory || []).map((c) => c.field).filter((f2) => f2 !== 'singleShotAttackPenalty' && !/^defensiveInteractions\./.test(f2)).sort();
    if (!same(listed, differ.sort())) fail(`3A ${n} listed conflicts ${JSON.stringify(listed)} disagree with certified claim differences ${JSON.stringify(differ)}`);
    for (const c of q.conflictHistory || []) if (c.disposition !== 'RESOLVED_LATER_PUBLICATION_PRECEDENCE' || !c.controllingSource || c.resolvedValue === undefined) fail(`3A ${n} conflict ${c.field} must be resolved with a controlling source and value`);
    if ((q.conflictHistory?.length || 0) > 0 !== (q.reconciliationStatus === 'RESOLVED_BY_PLANNER_RULING_LATER_PUBLICATION')) fail(`3A ${n} reconciliationStatus disagrees with its conflict history`);
  }
  const g = (n) => rec3.records.find((q) => q.canonicalIdentity === n);
  const cw = claims.get('BlasTech 500 Riot Gun').find((c) => c.ph === '2E').r, rb = claims.get('BlasTech 500 Riot Gun').find((c) => c.ph === '2I').r;
  const ss = (r) => r.canonicalStats.modeProfiles.find((m) => m.id === 'single-shot')?.conditionalModifiers?.[0]?.value;
  const rg = g('BlasTech 500 Riot Gun');
  const sp = rg.conflictHistory.find((c) => c.field === 'singleShotAttackPenalty');
  if (ss(cw) !== sp?.cloneWars || ss(rb) !== sp?.rebellionEra || cw.canonicalStats.costCredits !== rg.conflictHistory.find((c) => c.field === 'costCredits').cloneWars || rb.canonicalStats.costCredits !== rg.conflictHistory.find((c) => c.field === 'costCredits').rebellionEra || cw.canonicalStats.weightKg !== rg.conflictHistory.find((c) => c.field === 'weightKg').cloneWars || rb.canonicalStats.weightKg !== rg.conflictHistory.find((c) => c.field === 'weightKg').rebellionEra) fail('3A Riot Gun conflict values must equal the certified Clone Wars / Rebellion Era values');
  if (rb.canonicalStats.ammo?.capacityShots !== 50 || cw.canonicalStats.ammo?.status !== 'not-stated' || !rb.canonicalStats.modeProfiles.some((m) => m.conditionalModifiers?.some((c) => c.value === 2 && c.type === 'equipment'))) fail('3A Riot Gun Rebellion-only +2 autofire and 50-shot pack');
  const gs = claims.get('Guard Shoto'); const gc = g('Guard Shoto').conflictHistory.find((c) => c.field === 'availability.restriction');
  if (gc.forceUnleashed !== gs.find((c) => c.ph === '2D').r.canonicalStats.availability.restriction || gc.jediAcademy.split(' ')[0] !== gs.find((c) => c.ph === '2F').r.canonicalStats.availability.restriction) fail('3A Guard Shoto availability conflict values');
  const gt = claims.get('Stunning Gauntlet').find((c) => c.ph === '2B').r;
  if (!gt.canonicalStats.variantsByWeaponSize?.length || !gt.canonicalStats.variantsByWearerSize?.length) fail('3A Stunning Gauntlet KOTOR weapon-size rows and derived wearer variants must remain');
  if (!claims.get('Long-Handle Lightsaber').some((c) => c.r.canonicalStats.attackProfiles.some((p) => p.id === 'haft-end')) || !claims.get('Lightsaber Pike').some((c) => c.r.canonicalStats.attackProfiles.some((p) => p.id === 'haft-end' && p.damageType.mode === 'unspecified' && !p.qualities.ignoresDR))) fail('3A Long Haft Form haft-end profile (1d6, unspecified type, no DR bypass) must exist in the certified claims');
  // Planner rulings (Phase 3B): the phrik divergence stays recorded as resolved
  for (const n of ['Guard Shoto', 'Lightsaber Pike']) if (!rec3.claudeReadback.findingsResolvedByPlannerRuling.some((f2) => f2.identity === n && /phrik/.test(f2.id) && f2.resolution)) fail(`3A ${n} phrik finding must stay recorded with its planner resolution`);
  if (!g('Guard Shoto').conflictHistory.some((c) => c.field === 'defensiveInteractions.lightsaberDrCondition' && /phrik-laced/.test(c.resolvedValue)) || !g('Lightsaber Pike').rulingsApplied?.some((q) => q.ruling === 'NO_CONFLICT')) fail('3A phrik rulings (Guard Shoto conditional, Lightsaber Pike intrinsic)');
  if (rec3.claudeReadback.planner.ruledResolved !== 6 || rec3.claudeReadback.planner.ruledConflictGated !== 0 || rec3.status !== 'PHASE_3A_RESOLVED_WITH_PHASE_3B_PLANNER_RULINGS') fail('3A readback must record 6 resolved / 0 gated planner rulings');
  if (errors.length === e3) console.log(`Phase 3A cross-publication reconciliation OK: ${rec3.records.length} identities (${rec3.outputCounts.resolvedCompatibleOrAdditive} compatible/additive + ${rec3.outputCounts.resolvedByPrecedenceRuling} by precedence ruling, ${rec3.outputCounts.unresolvedCrossPublicationConflicts} unresolved)`);
}


// Phase 3B: 203-identity canonical authority, recomputed independently and compared with the deterministic builder
const p3b = p3 && p3.subphases && p3.subphases['3B'];
if (p3b && typeof p3b === 'object') {
  const e3b = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const sorted = (x) => (Array.isArray(x) ? x.map(sorted) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(x[k])])) : x);
  const sha256 = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(sorted(x))).digest('hex');
  const raw = fs.readFileSync(path.join(ROOT, p3b.file), 'utf8');
  const d3b = JSON.parse(raw);
  if (!fs.existsSync(path.join(ROOT, p3b.doc))) fail('3B missing doc');
  // determinism / currency: the committed files must equal two independent builder runs
  const { buildPhase3B } = await import('./build-item-weapons-phase-3b-canonical-authority.mjs');
  const b1 = buildPhase3B(), b2 = buildPhase3B();
  if (b1.json !== b2.json || b1.md !== b2.md) fail('3B builder output is not deterministic');
  if (raw !== b1.json) fail('3B committed authority differs from the builder output (stale or hand-edited)');
  if (fs.readFileSync(path.join(ROOT, p3b.doc), 'utf8') !== b1.md) fail('3B committed markdown differs from the builder output');
  if (d3b.status !== 'WEAPON_PHASE_3B_203_IDENTITY_CANONICAL_AUTHORITY_CERTIFIED' || d3b.productionMutationAuthorized !== false || d3b.authorityOnly !== true) fail('3B status / authority-only flags');
  // production baseline unchanged
  for (const f of ['packs/weapons.db', 'template.json']) if (d3b.productionBaseline[f] !== sha256(fs.readFileSync(path.join(ROOT, f), 'utf8'))) fail(`3B production file ${f} changed since 3B certification`);
  // independent recomputation of the join
  const p1c = auth.phases['1-weapons-content'];
  const uidx = p1c.uniqueIdentityIndex;
  const nb = (b) => b.replace(/^The /, '');
  const p1by = new Map(); for (const b of p1c.books) for (const r of b.records) p1by.set(`${nb(r.source.book)}|${r.canonicalName}`, r);
  const p2by = new Map();
  const reg = (b, ph) => { for (const r of b.records) p2by.set(`${nb(r.source.book)}|${r.canonicalName}`, { ph, r }); };
  reg(s2.books[0], '2A'); for (const sb of s2.standaloneBookAuthorities) reg(JSON.parse(fs.readFileSync(path.join(ROOT, sb.file), 'utf8')), sb.phase);
  const ovl = JSON.parse(fs.readFileSync(path.join(ROOT, s2.ammoNormalizationOverlay.file), 'utf8'));
  const ovBy = new Map(ovl.entries.map((e) => [`${e.phase}|${e.canonicalName}`, e]));
  const ids = d3b.identities;
  const nClaims = ids.reduce((m, i) => m + i.sourceClaims.length, 0);
  if (ids.length !== 203 || uidx.length !== 203 || nClaims !== 209 || p1by.size !== 209 || p2by.size !== 209 || ovBy.size !== 209) fail(`3B counts ${ids.length}/${nClaims} (index ${uidx.length}, phase1 ${p1by.size}, phase2 ${p2by.size}, overlay ${ovBy.size})`);
  if (d3b.counts.uniqueCanonicalIdentities !== 203 || d3b.counts.certifiedSourceClaims !== 209 || d3b.counts.singleClaimIdentities !== 197 || d3b.counts.twoClaimIdentities !== 6 || d3b.counts.sourceBooks !== 12) fail('3B declared counts');
  if (ids.filter((i) => i.sourceClaims.length === 1).length !== 197 || ids.filter((i) => i.sourceClaims.length === 2).length !== 6) fail('3B must be exactly 197 one-claim and 6 two-claim identities');
  const six = ['BlasTech 500 Riot Gun', 'Flechette Launcher', 'Guard Shoto', 'Lightsaber Pike', 'Long-Handle Lightsaber', 'Stunning Gauntlet'];
  if (!same(ids.filter((i) => i.sourceClaims.length === 2).map((i) => i.canonicalName).sort(), six)) fail('3B the six two-claim identities must be exactly the known six');
  if (new Set(ids.map((i) => i.identityKey)).size !== 203 || new Set(ids.map((i) => i.canonicalName)).size !== 203) fail('3B identity keys / names must be unique');
  if (!same(ids.map((i) => [i.canonicalName, i.identityKey]), [...ids].map((i) => [i.canonicalName, i.identityKey]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)))) fail('3B identities must be sorted by canonicalName then identityKey');
  const REQ = ['identityKey', 'canonicalName', 'repo', 'sourceClaims', 'firstPublication', 'canonicalPlayerText', 'summary', 'weaponGroup', 'schemaFamily', 'canonicalStats', 'qualities', 'conditionalQualities', 'proficiencyRules', 'operation', 'sourceFootnotes', 'crossPublication', 'repoComparison', 'ambiguities', 'mergeAudit'];
  const seenClaims = new Set();
  for (const i of ids) {
    const w = `3B ${i.canonicalName}`;
    for (const k of REQ) if (!(k in i)) fail(`${w} missing ${k}`);
    if (typeof i.canonicalPlayerText !== 'string' || !i.canonicalPlayerText.trim() || typeof i.summary !== 'string' || !i.summary.trim()) fail(`${w} needs canonicalPlayerText and summary`);
    const u = uidx.find((x) => x.identityKey === i.identityKey);
    if (!u || u.canonicalName !== i.canonicalName || u.claimCount !== i.sourceClaims.length || (u.repoId ?? null) !== (i.repo.id ?? null) || u.repoPresent !== i.repo.present) fail(`${w} differs from the Phase 1 unique identity index`);
    for (const c of i.sourceClaims) {
      const k = `${nb(c.book)}|${c.canonicalName}`;
      if (seenClaims.has(k)) fail(`${w} duplicate source claim ${k}`); seenClaims.add(k);
      const a = p1by.get(k), b = p2by.get(k);
      if (!a || !b) { fail(`${w} claim ${k} lacks a Phase 1 or Phase 2 claim`); continue; }
      if (c.canonicalPlayerText !== a.canonicalPlayerText || c.summary !== a.summary) fail(`${w} source claim text must equal the certified Phase 1 claim`);
      if (c.phase2Ref.sha256 !== sha256(b.r) || c.phase2 !== b.ph) fail(`${w} claim ${k} Phase 2 snapshot hash differs from the certified claim`);
      if (!ovBy.get(`${b.ph}|${b.r.canonicalName}`)) fail(`${w} claim ${k} has no v2.9 ammo overlay entry`);
      if (!['sole', 'controlling', 'compatible', 'additive', 'superseded-conflict'].includes(c.relationship)) fail(`${w} claim relationship ${c.relationship}`);
    }
    if (i.sourceClaims.length === 1) {
      const a = p1by.get(`${nb(i.sourceClaims[0].book)}|${i.sourceClaims[0].canonicalName}`), b = p2by.get(`${nb(i.sourceClaims[0].book)}|${i.sourceClaims[0].canonicalName}`);
      if (i.canonicalPlayerText !== a.canonicalPlayerText || i.summary !== a.summary) fail(`${w} one-claim identity must reuse the certified Phase 1 text and summary unchanged`);
      if (!same(sorted(i.canonicalStats), sorted(b.r.canonicalStats)) || !same(sorted(i.qualities), sorted(b.r.qualities))) fail(`${w} one-claim identity mechanics must equal the certified Phase 2 claim`);
    }
    const am = i.canonicalStats.ammo, hasRanged = i.canonicalStats.attackProfiles.some((q) => q.range.mode !== 'melee');
    if ((am === null) === hasRanged) fail(`${w} ammo must be null exactly for pure melee identities`);
    if (am && am.capacityShots === 0) fail(`${w} ammo must never carry capacityShots 0`);
    if (am && am.status === 'not-stated' && (am.type !== null || am.capacityShots !== null)) fail(`${w} not-stated ammo must stay empty (never filled from repo data)`);
    if (am?.payloadDerived && ['loaded-ammo', 'loaded-ammo-modified-by-weapon'].includes(am.damageSource)) {
      if (['dice', 'double', 'fixed'].includes(i.canonicalStats.baseDamage.mode)) fail(`${w} payload-derived delivery system must not own payload damage as intrinsic launcher baseDamage (v2.9 separation)`);
      for (const q of i.canonicalStats.attackProfiles) if (q.damage.mode === 'dice' && !i.canonicalStats.payloadProfiles.some((pl) => pl.damage?.formula === q.damage.formula && same(pl.damageType, q.damageType))) fail(`${w} resolved attack profile ${q.id} damage must come from a loaded payload profile`);
    }
    for (const k of AMMO_RUNTIME_KEYS) if (am && k in am) fail(`${w} ammo must not carry runtime state ${k}`);
    if (i.crossPublication.claimCount !== i.sourceClaims.length || i.mergeAudit.claimCount !== i.sourceClaims.length) fail(`${w} crossPublication/mergeAudit claim counts`);
  }
  if (seenClaims.size !== 209 || [...p1by.keys()].some((k) => !seenClaims.has(k))) fail('3B all 209 Phase 1 claims must appear exactly once');
  const g = (n) => ids.find((i) => i.canonicalName === n);
  // planner rulings
  const gs = g('Guard Shoto');
  if (gs.canonicalStats.availability.restriction !== 'common' || gs.canonicalStats.availability.rare !== true) fail('3B Guard Shoto availability must resolve to Jedi Academy (common, Rare)');
  const gsd = gs.canonicalStats.defensiveInteractions.filter((q) => /^incoming-lightsaber-does-not-ignore/.test(q.effect));
  if (gsd.length !== 1 || gsd[0].condition !== 'handle-is-phrik-laced' || !gs.canonicalStats.defensiveInteractions.some((q) => q.value === 2 && q.id === 'block-deflect-bonus')) fail('3B Guard Shoto lightsaber-DR resistance must be phrik-handle conditional; +2 Block/Deflect independent');
  if (!gs.crossPublication.conflictHistory.some((h) => h.field === 'availability.restriction' && h.forceUnleashed === 'illegal') || gs.sourceClaims.find((c) => c.phase2 === '2D').relationship !== 'superseded-conflict') fail('3B Guard Shoto Force Unleashed values must stay preserved as the superseded claim');
  const pk = g('Lightsaber Pike'); const pkd = pk.canonicalStats.defensiveInteractions;
  if (pkd.length !== 1 || pkd[0].condition !== null || !/does-not-ignore/.test(pkd[0].effect) || !pk.canonicalStats.attackProfiles.some((q) => q.id === 'haft-end' && q.damageType.mode === 'unspecified' && !q.qualities.ignoresDR)) fail('3B Lightsaber Pike lightsaber-DR resistance must stay active (intrinsic phrik haft) and keep the Long Haft Form haft end');
  const rg = g('BlasTech 500 Riot Gun'), rgs = rg.canonicalStats, ssv = rgs.modeProfiles.find((m) => m.id === 'single-shot')?.conditionalModifiers?.[0]?.value, afb = rgs.modeProfiles.find((m) => m.id === 'autofire')?.conditionalModifiers?.[0];
  if (rgs.costCredits !== 1200 || rgs.weightKg !== 2.2 || rg.qualities.inaccurate !== false || ssv !== -1 || afb?.value !== 2 || afb?.type !== 'equipment' || rgs.ammo?.type !== 'power-pack' || rgs.ammo?.capacityShots !== 50 || 'conflictGate' in rg) fail('3B Riot Gun must resolve to the Rebellion Era values (1,200 / 2.2 kg / not Inaccurate / -1 / +2 equipment autofire / 50-shot power pack)');
  const cwc = rg.sourceClaims.find((c) => c.phase2 === '2E'), cwr = p2by.get('Clone Wars Campaign Guide|BlasTech 500 Riot Gun').r;
  if (cwc?.relationship !== 'superseded-conflict' || cwr.canonicalStats.costCredits !== 1000 || cwr.canonicalStats.weightKg !== 4.5 || cwr.qualities.inaccurate !== true || !rg.crossPublication.conflictHistory.some((h) => h.field === 'costCredits' && h.cloneWars === 1000)) fail('3B Riot Gun Clone Wars values must stay preserved as the superseded claim');
  const bc = g('Bowcaster');
  if (bc.canonicalStats.range.profileId !== null || bc.canonicalStats.range.mode !== 'unresolved' || !bc.ambiguities.some((a) => a.field === 'canonicalStats.range.profileId' && a.blocksProductionRangeMutation === true)) fail('3B Bowcaster range must stay source-unresolved with a recorded ambiguity (never silently rifles)');
  const cr = g('CR-1 Blast Cannon');
  if (cr.qualities.areaEffect !== false || !cr.conditionalDamageProfiles.some((q) => q.operation === 'area-toggle' && q.area?.radiusSquares === 1 && q.area?.enabled === true)) fail('3B CR-1 base areaEffect must stay false with a structured nonadjacent 1-square splash');
  const cg = g('Concussion Grenade');
  if (cg.sourceClaims[0].descriptionPage !== 48 || !same(cg.sourceClaims[0].descriptionPages, [48, 49])) fail('3B Concussion Grenade description must start on p.48 and continue on p.49');
  const xn = g('Xerrol Nightstinger');
  if (xn.weaponGroup !== 'Exotic Weapon' || xn.schemaFamily.proficiency !== 'exotic' || xn.canonicalStats.range.profileId !== 'rifles') fail('3B Xerrol Nightstinger must be Exotic proficiency with rifle range');
  const sg = g('Stunning Gauntlet'), sgs = sg.canonicalStats;
  const wv = (sz) => sgs.variantsByWearerSize?.find((v) => v.wearerSize === sz);
  if (sgs.sizeRule !== 'two_sizes_smaller_than_wearer' || sgs.costCredits !== null || sgs.weightKg !== null || sgs.size !== null) fail('3B Stunning Gauntlet keeps the two-sizes-smaller sizeRule and no single fixed size/cost/weight line');
  if (!same(sgs.variantsByWearerSize?.map((v) => v.wearerSize), ['Medium', 'Large', 'Huge']) || !(wv('Medium')?.weaponSize === 'Tiny' && wv('Medium').costCredits === 200 && wv('Medium').weightKg === 0.4) || !(wv('Large')?.weaponSize === 'Small' && wv('Large').costCredits === 200 && wv('Large').weightKg === 0.4) || !(wv('Huge')?.weaponSize === 'Medium' && wv('Huge').costCredits === 300 && wv('Huge').weightKg === 0.5)) fail('3B Stunning Gauntlet wearer variants: Medium -> Tiny 200/0.4, Large -> Small 200/0.4, Huge -> Medium 300/0.5');
  if (!same(sgs.variantsByWeaponSize?.map((v) => [v.weaponSize, v.costCredits, v.weightKg]), [['Tiny', 200, 0.4], ['Small', 200, 0.4], ['Medium', 300, 0.5]])) fail('3B Stunning Gauntlet weapon-size rows (Tiny from Clone Wars, Small/Medium from KOTOR)');
  if (sg.ambiguities.length) fail('3B Stunning Gauntlet variants are complementary published data, not an ambiguity');
  const lh = g('Long-Handle Lightsaber');
  if (!lh.canonicalStats.attackProfiles.some((q) => q.id === 'haft-end' && q.damage.formula === '1d6') || !lh.conditionalDamageProfiles.some((q) => q.damage?.formula === '2d10') || lh.canonicalStats.resource.kind !== 'energy-cell') fail('3B Long-Handle Lightsaber two-handed choice, haft end and energy cell');
  if (ids.some((i) => i.ambiguities.some((a) => /OWNERSHIP_UNRESOLVED|VARIANT_DISCREPANCY/.test(a.status)))) fail('3B launcher damage ownership and Stunning Gauntlet variant questions must be resolved, not parked as ambiguities');
  const LAUNCH = { 'Missile Launcher': ['standard-missile', '6d6', 'slashing', 130, 'burst', 2], 'E-Web Missile Launcher': ['e-web-missile', '6d6', 'slashing', 198, 'rectangle', null], 'Merr-Sonn PLX-2M Portable Missile Launcher': ['arakyd-3t3-missile', '8d6', 'energy', 49, 'burst', 3], 'Miniature Proton Torpedo Launcher': ['miniature-proton-torpedo', '6d10', 'energy', 49, 'blast', 2] };
  for (const [n, [pid, fm, ty, pg, shape, rad]] of Object.entries(LAUNCH)) {
    const l = g(n), ls = l.canonicalStats, pl = ls.payloadProfiles.find((q) => q.id === pid);
    if (ls.baseDamage.mode !== 'ammunition' || ls.damageType.mode !== 'varies' || !pl || pl.damage.formula !== fm || pl.damageType.types.join() !== ty || pl.damageMultiplier !== 1 || pl.area.shape !== shape || (rad !== null && pl.area.radiusSquares !== rad) || ls.ammo.damageSource === 'weapon' || ls.ammo.payloadDerived !== true || l.sourceClaims[0].descriptionPage !== pg) fail(`3B ${n}: launcher baseDamage must be ammunition/payload-derived with the ${pid} payload owning ${fm} ${ty} (${shape}) and descriptionPage ${pg}`);
    if (!ls.attackProfiles.every((q) => q.damage.mode !== 'dice' || q.damage.formula === fm)) fail(`3B ${n}: resolved attack profiles must mirror the payload`);
    if (ls.payloadProfiles.some((q) => q.costCredits !== undefined || q.weightKg !== undefined)) fail(`3B ${n}: per-missile cost/weight must not be inferred from the published pack`);
  }
  if (g('E-Web Missile Launcher').canonicalStats.payloadProfiles[0].area.widthSquares !== 2 || g('E-Web Missile Launcher').canonicalStats.payloadProfiles[0].area.heightSquares !== 2 || g('Miniature Proton Torpedo Launcher').canonicalStats.ammo.damageSource !== 'loaded-ammo-modified-by-weapon') fail('3B E-Web 2x2 payload area; Mini Proton Torpedo single-target is a launcher transform of the payload');
  const mpt = g('Miniature Proton Torpedo Launcher').canonicalStats, st = mpt.attackProfiles.find((q) => q.id === 'single-target');
  if (st.damageMultiplier !== 2 || st.area.enabled !== false || !st.conditionalModifiers.some((q) => q.value === -10) || mpt.payloadProfiles[0].damageMultiplier !== 1 || mpt.modeProfiles.find((m) => m.id === 'single-target')?.payloadTransform?.owner !== 'launcher') fail('3B Mini Proton Torpedo single-target must stay a launcher-specific transform (x2, no area, -10 vs smaller than Huge) of the selected payload');
  if (g('Merr-Sonn PLX-2M Portable Missile Launcher').canonicalStats.modeProfiles.length !== 3 || g('Merr-Sonn PLX-2M Portable Missile Launcher').canonicalStats.ammo.capacityShots !== 6) fail('3B PLX-2M keeps its targeting modes and six-missile capacity on the launcher');
  const lm = g('Light Concussion Missile Launcher');
  if (lm.canonicalStats.baseDamage.mode !== 'ammunition' || lm.canonicalStats.payloadProfiles[0]?.damageMultiplier !== 2) fail('3B launcher/payload separation (Light Concussion Missile Launcher) must survive the merge');
  if (errors.length === e3b) console.log(`Phase 3B canonical authority OK: ${ids.length} identities / ${nClaims} claims (197 single, 6 two-claim), ${ids.filter((i) => i.ambiguities.length).length} identities carry explicit ambiguities, builder byte-stable`);
}


// Phase 3C: production disposition ledger, recomputed independently from Phase 3B, packs/weapons.db and the reference scan
const p3c = p3 && p3.subphases && p3.subphases['3C'];
if (p3c && typeof p3c === 'object') {
  const e3c = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const sorted = (x) => (Array.isArray(x) ? x.map(sorted) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(x[k])])) : x);
  const sha256 = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(sorted(x))).digest('hex');
  const raw = fs.readFileSync(path.join(ROOT, p3c.file), 'utf8');
  const L = JSON.parse(raw);
  if (!fs.existsSync(path.join(ROOT, p3c.doc))) fail('3C missing doc');
  const { buildPhase3C } = await import('./build-item-weapons-phase-3c-production-disposition-ledger.mjs');
  const c1 = buildPhase3C(), c2 = buildPhase3C();
  if (c1.json !== c2.json || c1.md !== c2.md) fail('3C builder output is not deterministic');
  if (raw !== c1.json) fail('3C committed ledger differs from the builder output (stale, hand-edited or an input changed since it was generated)');
  if (fs.readFileSync(path.join(ROOT, p3c.doc), 'utf8') !== c1.md) fail('3C committed markdown differs from the builder output');
  if (L.status !== 'WEAPON_PHASE_3C_PRODUCTION_DISPOSITION_LEDGER_CERTIFIED' || L.productionMutationAuthorized !== false || L.authorityOnly !== true) fail('3C status / authority-only flags');
  // inputs: Phase 3B hash, production baseline
  const p3bText = fs.readFileSync(path.join(ROOT, 'data/audits/item-weapons-phase-3b-canonical-authority.json'), 'utf8');
  const P3 = JSON.parse(p3bText);
  if (L.inputs.phase3b.sha256 !== sha256(p3bText)) fail('3C Phase 3B input hash differs: Phase 3B changed after the ledger was generated');
  const dbText = fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8');
  if (L.inputs.production['packs/weapons.db'] !== sha256(dbText) || L.inputs.production['template.json'] !== sha256(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8'))) fail('3C production baseline hash differs: packs/weapons.db or template.json changed after the ledger baseline');
  const prod = dbText.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const W = prod.filter((r) => r.type === 'weapon'), NW = prod.filter((r) => r.type !== 'weapon'), byId = new Map(W.map((r) => [r._id, r]));
  if (W.length !== 186 || L.inputs.production.weaponRecords !== 186 || L.inputs.production.nonWeaponRecords !== NW.length) fail('3C production weapon record counts');
  // identity coverage
  const ids = P3.identities, led = L.canonical;
  if (ids.length !== 203 || led.length !== 203 || L.counts.canonicalIdentities !== 203 || L.counts.sourceClaims !== 209) fail(`3C canonical identity counts (${led.length}/${ids.length})`);
  const keyOf = (x) => x.identityKey;
  if (!same(led.map(keyOf).slice().sort(), ids.map(keyOf).slice().sort()) || new Set(led.map(keyOf)).size !== 203) fail('3C every Phase 3B identity key must appear exactly once, unchanged');
  const idByKey = new Map(ids.map((i) => [i.identityKey, i]));
  // repo mapping / coverage
  const mapped = ids.filter((i) => i.repo.present).map((i) => i.repo.id);
  if (new Set(mapped).size !== mapped.length || mapped.length !== 151 || mapped.some((m) => !byId.has(m))) fail('3C mapped repo records must be 151 unique live weapon records');
  const repoOnlyExpected = W.map((r) => r._id).filter((x) => !mapped.includes(x)).sort();
  const ro = L.repoOnlyRecords;
  if (!same(ro.map((r) => r.repoId).slice().sort(), repoOnlyExpected) || new Set(ro.map((r) => r.repoId)).size !== ro.length) fail('3C every live weapon record must be mapped to one canonical identity or appear exactly once in repoOnlyRecords');
  if (mapped.length + ro.length !== W.length || L.counts.productionWeaponRecordsCovered !== W.length) fail('3C production coverage (mapped + repo-only) must equal the live weapon records');
  if (!same(L.outOfScopePackRecords.map((r) => r.repoId).sort(), NW.map((r) => r._id).sort())) fail('3C non-weapon pack records must be listed as out of scope');
  if (L.counts.repoPresent !== 151 || L.counts.repoMissing !== 52) fail('3C repo present/missing counts');
  // dispositions
  const PRIM = ['KEEP', 'CREATE', 'RENAME', 'UPDATE', 'MERGE', 'REVIEW_PRECEDENCE'];
  const roBy = new Map(ro.map((r) => [r.repoId, r]));
  const create = led.filter((c) => c.primaryDisposition === 'CREATE');
  if (create.length !== 52 || L.counts.byPrimaryDisposition.CREATE !== 52 || !same(create.map(keyOf).sort(), ids.filter((i) => !i.repo.present).map(keyOf).sort())) fail('3C CREATE must be exactly the 52 repo-missing identities');
  const unresolved = (i) => (i.crossPublication.conflictHistory || []).some((h) => h.disposition !== 'RESOLVED_LATER_PUBLICATION_PRECEDENCE') || i.ambiguities.some((a) => /^CROSS_PUBLICATION/.test(a.status));
  const reviewExpected = ids.filter(unresolved).map(keyOf).sort();
  if (L.counts.byPrimaryDisposition.REVIEW_PRECEDENCE !== 0 || reviewExpected.length !== 0 || led.some((c) => c.primaryDisposition === 'REVIEW_PRECEDENCE')) fail('3C REVIEW_PRECEDENCE must be 0 (no unresolved published contradiction remains)');
  for (const c of led) {
    const i = idByKey.get(c.identityKey), w = `3C ${c.canonicalName}`;
    if (!i) { fail(`${w} identity key ${c.identityKey} does not exist in Phase 3B`); continue; }
    if (!PRIM.includes(c.primaryDisposition)) fail(`${w} unknown primary disposition`);
    if (c.productionMutationAuthorized !== false) fail(`${w} must keep productionMutationAuthorized false`);
    if (c.canonicalName !== i.canonicalName || c.repo.present !== i.repo.present || c.repo.id !== i.repo.id) fail(`${w} differs from Phase 3B`);
    if (!Array.isArray(c.actions) || !c.actions.length || c.actions.some((a) => !['type', 'canonicalPaths', 'repoPaths', 'reason', 'sourceAuthority', 'representability', 'blocked', 'blockReason'].every((k) => k in a))) fail(`${w} actions must be structured`);
    const types = c.actions.map((a) => a.type);
    const repoRec = i.repo.present ? byId.get(i.repo.id) : null;
    if (!i.repo.present) { if (c.primaryDisposition !== 'CREATE' || !same(types, ['CREATE_RECORD'])) fail(`${w} a repo-missing identity must be CREATE with only CREATE_RECORD`); continue; }
    if (c.primaryDisposition === 'CREATE') fail(`${w} a repo-present identity cannot be CREATE`);
    const nameDiffers = repoRec.name !== i.canonicalName;
    if (nameDiffers !== types.includes('RENAME')) fail(`${w} RENAME action must exist exactly when the production name differs from the canonical name`);
    const substantive = types.filter((t) => !['RENAME', 'NO_CHANGE', 'REFERENCE_MIGRATION_REQUIRED'].includes(t));
    if (c.primaryDisposition === 'KEEP' && (substantive.length || nameDiffers || !same(types, ['NO_CHANGE']))) fail(`${w} KEEP cannot carry any required mutation`);
    if (c.primaryDisposition === 'RENAME' && (substantive.length || !nameDiffers)) fail(`${w} RENAME requires a real name mismatch and no substantive update action`);
    if (c.primaryDisposition === 'UPDATE' && !substantive.length) fail(`${w} UPDATE needs at least one substantive action`);
    if (c.primaryDisposition === 'MERGE') {
      const md = c.mergeDetail; const targets = ro.filter((r) => r.disposition === 'MERGE_INTO_CANONICAL' && r.targetRepoId === i.repo.id).map((r) => r.repoId).sort();
      if (!md || md.survivorRepoId !== i.repo.id || !md.mergedRepoIds.length || !same([...md.mergedRepoIds].sort(), targets) || md.mergedRepoIds.some((m) => !byId.has(m) || m === i.repo.id) || !md.mergedRepoIds.every((m) => types.includes('MERGE_RECORDS'))) fail(`${w} MERGE must name its survivor and at least one distinct live merged record`);
    } else if (types.includes('MERGE_RECORDS')) fail(`${w} MERGE_RECORDS only belongs to a MERGE identity`);
    // recomputed simple field facts must be reflected as actions
    const cs = i.canonicalStats, sys = repoRec.system;
    const need = [];
    if (cs.costCredits !== null && Number(sys.cost) !== cs.costCredits) need.push(['UPDATE_STATS', 'canonicalStats.costCredits']);
    if (cs.weightKg !== null && Number(sys.weight) !== cs.weightKg) need.push(['UPDATE_STATS', 'canonicalStats.weightKg']);
    if (['dice', 'fixed', 'double'].includes(cs.baseDamage.mode) && String(sys.damage).replace(/\s/g, '').toLowerCase() !== cs.baseDamage.formula.toLowerCase()) need.push(['UPDATE_DAMAGE', 'canonicalStats.baseDamage']);
    if (cs.damageType.mode === 'single' && !cs.damageType.qualifiers.length && sys.damageType !== cs.damageType.types[0]) need.push(['UPDATE_DAMAGE_TYPE', 'canonicalStats.damageType']);
    if (cs.ammo && cs.ammo.mode !== 'multiple' && cs.ammo.capacityShots !== null && sys.ammunition?.max !== cs.ammo.capacityShots) need.push(['UPDATE_AMMO', 'canonicalStats.ammo']);
    for (const [t, p] of need) if (!c.actions.some((a) => a.type === t && a.canonicalPaths.includes(p))) fail(`${w} missing required ${t} for ${p} (production differs from canonical)`);
    // source-unresolved fields never filled from the repo
    if (cs.range.mode === 'unresolved' || (cs.range.mode === 'ranged' && cs.range.profileId === null)) {
      const bf = c.blockedFields.find((b) => b.canonicalPath === 'canonicalStats.range.profileId');
      if (!bf || bf.productionValueMayNotBecomeCanonical !== true || bf.status !== 'SOURCE_UNRESOLVED_NO_MUTATION') fail(`${w} source-unresolved range profile must be a blocked field`);
      if (c.actions.some((a) => a.canonicalPaths.includes('canonicalStats.range.profileId'))) fail(`${w} must not mutate or fill the source-unresolved range profile from production`);
      if (bf && bf.repoValue !== repoRec.system.rangeProfile) fail(`${w} blocked range field must keep the live production value as evidence only`);
    }
    if (i.canonicalStats.ammo?.status === 'not-stated' && c.actions.some((a) => a.type === 'UPDATE_AMMO' && a.canonicalPaths.includes('canonicalStats.ammo') && !a.blocked && a.representability === 'DIFFERS')) fail(`${w} not-stated ammo must not receive a value-setting action`);
  }
  if (led.filter((c) => c.primaryDisposition === 'MERGE').length !== ro.filter((r) => r.disposition === 'MERGE_INTO_CANONICAL').map((r) => r.targetRepoId).filter((v, i2, a) => a.indexOf(v) === i2).length) fail('3C MERGE identities must equal the distinct merge survivors');
  const bd = Object.fromEntries(PRIM.map((p) => [p, led.filter((c) => c.primaryDisposition === p).length]));
  if (!same(bd, L.counts.byPrimaryDisposition) || Object.values(bd).reduce((a, b) => a + b, 0) !== 203) fail('3C byPrimaryDisposition counts');
  // reverse ledger
  const ROD = ['MERGE_INTO_CANONICAL', 'REMOVE_UNSUPPORTED', 'RETAIN_SPECIAL_NONCANONICAL_ROLE', 'REVIEW_MAPPING'];
  const { scanReferences } = await import('./lib/item-weapons-reference-scan.mjs');
  const scan = scanReferences(ROOT, W.map((r) => ({ id: r._id, name: r.name })));
  for (const r of ro) {
    const w = `3C repo-only ${r.repoId}`;
    if (!ROD.includes(r.disposition) || r.productionMutationAuthorized !== false) fail(`${w} disposition / mutation flag`);
    if (r.disposition === 'REMOVE_UNSUPPORTED' && (mapped.includes(r.repoId) || !r.reason)) fail(`${w} REMOVE_UNSUPPORTED cannot target a canonical mapped record and needs a reason`);
    if (r.disposition === 'MERGE_INTO_CANONICAL') { const t = ids.find((i) => i.canonicalName === r.targetCanonicalIdentity); if (!t || t.repo.id !== r.targetRepoId || r.targetRepoId === r.repoId || !r.reason) fail(`${w} merge target must be a distinct canonical mapped record`); }
    if (r.disposition === 'RETAIN_SPECIAL_NONCANONICAL_ROLE' && !r.reason) fail(`${w} special retained role needs an explicit reason`);
    const refs = scan.references.get(r.repoId) || [], total = refs.reduce((m, x) => m + x.count, 0);
    const want = total ? 'BLOCKED_PENDING_MIGRATION' : 'NO_REFERENCES_FOUND';
    if (r.dependencyGate.status !== want || r.dependencyGate.referenceTotal !== total || !same(r.dependencyGate.references, refs)) fail(`${w} dependency gate must match the recomputed reference scan (${want}, ${total} references)`);
    if (r.disposition === 'MERGE_INTO_CANONICAL' && roBy.get(r.repoId) !== r) fail(`${w} duplicated`);
  }
  if (L.counts.repoOnlyRecords !== ro.length || L.counts.recordsWithDependencyGates !== ro.filter((r) => r.dependencyGate.status === 'BLOCKED_PENDING_MIGRATION').length) fail('3C repo-only / dependency gate counts');
  if (errors.length === e3c) console.log(`Phase 3C production disposition ledger OK: ${led.length} identities (${PRIM.map((p) => `${p} ${bd[p]}`).join(', ')}), ${ro.length} repo-only records (${ro.filter((r) => r.disposition === 'MERGE_INTO_CANONICAL').length} merge, ${ro.filter((r) => r.disposition === 'REMOVE_UNSUPPORTED').length} remove), ${L.counts.recordsWithDependencyGates} dependency-gated, ledger byte-stable`);
}

// Phase 3D: global freeze, recomputed independently from the committed 3B/3C artifacts, Phase 1/2 claims and the live pack
const p3d = p3 && p3.subphases && p3.subphases['3D'];
if (p3d && typeof p3d === 'object') {
  const e3d = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const raw = fs.readFileSync(path.join(ROOT, p3d.file), 'utf8');
  const F = JSON.parse(raw);
  if (!fs.existsSync(path.join(ROOT, p3d.doc))) fail('3D missing doc');
  const mod = await import('./build-item-weapons-phase-3d-global-freeze.mjs');
  let d1 = null, d2 = null;
  try { d1 = mod.buildPhase3D(); d2 = mod.buildPhase3D(); } catch (e) { fail(`3D freeze rebuild failed: ${e.message}`); }
  if (d1) {
    if (d1.json !== d2.json || d1.md !== d2.md) fail('3D freeze builder output is not deterministic');
    if (raw !== d1.json) fail('3D committed freeze differs from the builder output (stale, hand-edited, or a 3B/3C/Phase 1-2/production input changed since it was generated)');
    if (fs.readFileSync(path.join(ROOT, p3d.doc), 'utf8') !== d1.md) fail('3D committed markdown differs from the builder output');
  }
  // independent recomputation of the headline counts from first principles
  const rawProd = fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8');
  const liveAll = rawProd.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const liveW = liveAll.filter((r) => r.type === 'weapon');
  const B = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/item-weapons-phase-3b-canonical-authority.json'), 'utf8'));
  const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/item-weapons-phase-3c-production-disposition-ledger.json'), 'utf8'));
  const claimIds = new Map();
  for (const i of B.identities) for (const c of i.sourceClaims) { const k = `${String(c.book).replace(/^The /, '')}|${c.canonicalName}`; claimIds.set(k, (claimIds.get(k) || []).concat(i.identityKey)); }
  const phase1Total = auth.phases['1-weapons-content'].books.reduce((m, b) => m + b.records.length, 0);
  const phase2Total = auth.phases['2-weapons-numeric-stat-schema'].books[0].records.length + auth.phases['2-weapons-numeric-stat-schema'].standaloneBookAuthorities.reduce((m, sb) => m + JSON.parse(fs.readFileSync(path.join(ROOT, sb.file), 'utf8')).records.length, 0);
  if (phase1Total !== 209) fail(`3D Phase 1 claim count ${phase1Total} != 209`);
  if (phase2Total !== 209) fail(`3D Phase 2 claim count ${phase2Total} != 209`);
  if (claimIds.size !== 209 || [...claimIds.values()].some((v) => v.length !== 1)) fail('3D every claim must map to exactly one 3B identity');
  if (B.identities.length !== 203) fail(`3D canonical identity count ${B.identities.length} != 203`);
  const per = new Map(); for (const v of claimIds.values()) per.set(v[0], (per.get(v[0]) || 0) + 1);
  if ([...per.values()].filter((n) => n === 1).length !== 197 || [...per.values()].filter((n) => n === 2).length !== 6) fail('3D claim split must be 197 one-claim + 6 two-claim identities');
  if (B.identities.filter((i) => i.repo.present).length !== 151 || B.identities.filter((i) => !i.repo.present).length !== 52) fail('3D repo present/missing must be 151/52');
  const cb = {}; for (const c of C.canonical) cb[c.primaryDisposition] = (cb[c.primaryDisposition] || 0) + 1;
  if (cb.CREATE !== 52 || cb.UPDATE !== 149 || cb.MERGE !== 2 || cb.KEEP || cb.RENAME || cb.REVIEW_PRECEDENCE) fail(`3D 3C dispositions drifted: ${JSON.stringify(cb)}`);
  if (liveW.length !== 186 || liveAll.length - liveW.length !== 4) fail('3D live pack must hold 186 weapon + 4 out-of-scope records');
  const cov = new Map();
  for (const i of B.identities) if (i.repo.present) cov.set(i.repo.id, (cov.get(i.repo.id) || 0) + 1);
  for (const r of C.repoOnlyRecords) cov.set(r.repoId, (cov.get(r.repoId) || 0) + 1);
  for (const r of liveW) if (cov.get(r._id) !== 1) fail(`3D live weapon ${r._id} covered ${cov.get(r._id) || 0} times`);
  if (cov.size !== 186) fail(`3D coverage references ${cov.size} records, not 186`);
  const roM = C.repoOnlyRecords.filter((r) => r.disposition === 'MERGE_INTO_CANONICAL').length, roR = C.repoOnlyRecords.filter((r) => r.disposition === 'REMOVE_UNSUPPORTED').length;
  if (C.repoOnlyRecords.length !== 35 || roM !== 2 || roR !== 33) fail('3D repo-only census must be 35 = 2 merge + 33 remove');
  for (const r of C.repoOnlyRecords) {
    if (r.dependencyGate?.status !== 'BLOCKED_PENDING_MIGRATION') fail(`3D cleanup ${r.repoId} lost its dependency gate`);
    if (!liveW.some((w) => w._id === r.repoId)) fail(`3D cleanup ${r.repoId} was already removed from the pack`);
    if (r.productionMutationAuthorized !== false) fail(`3D cleanup ${r.repoId} authorises mutation`);
  }
  const bf = C.canonical.flatMap((c) => c.blockedFields.map((f) => ({ c, f })));
  if (bf.length !== 25 || new Set(bf.map((x) => x.c.identityKey)).size !== 21) fail('3D source-unresolved fields must be 25 across 21 identities');
  for (const { c, f } of bf) if (f.status !== 'SOURCE_UNRESOLVED_NO_MUTATION' || f.productionValueMayNotBecomeCanonical !== true || !f.reason) fail(`3D blocked field ${c.identityKey} ${f.canonicalPath} lost its guard`);
  if (!bf.some(({ c, f }) => c.canonicalName === 'Bowcaster' && /range/.test(f.canonicalPath))) fail('3D Bowcaster range must stay source-unresolved');
  if (!bf.some(({ c, f }) => c.canonicalName === 'Retrosaber' && /cost|weight|availability/i.test(f.canonicalPath))) fail('3D Retrosaber cost/weight/availability must stay source-unresolved');
  if (B.identities.some((i) => i.crossPublication?.unresolvedConflicts?.length)) fail('3D unresolved cross-publication contradiction');
  // production files unchanged from the certified baseline
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  if (sh(rawProd) !== B.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== B.productionBaseline['template.json']) fail('3D production file (packs/weapons.db or template.json) differs from the certified baseline');
  // freeze flags and status
  if (F.productionMutationAuthorized !== false || F.authorityOnly !== true || F.identityKeysUnchangedThrough3CAndFreeze !== true) fail('3D authority-only / mutation flags');
  const g = F.combatGlovesVisualCheck?.status;
  const wantStatus = g === 'CONFIRMED_WEARER_SIZE' ? 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN' : 'WEAPON_PHASE_3D_VERIFIED_FREEZE_PENDING_COMBAT_GLOVES_VISUAL_CONFIRMATION';
  if (g === 'CONFIRMED_WEARER_SIZE') { const ev = F.combatGlovesVisualCheck.evidence; if (!ev || ev.source !== 'Core Rulebook' || ev.printedPage !== 123 || ev.section !== 'UNARMED' || !same(ev.rows.map((r) => [r.heading, r.costCredits, r.weightKg]), [['Unarmed, Small character', 150, 0.4], ['Unarmed, Medium character', 250, 0.5]])) fail('3D Combat Gloves confirmation must record the printed p.123 UNARMED wearer-size rows'); }
  if (F.status === 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN' && g !== 'CONFIRMED_WEARER_SIZE') fail('3D FROZEN is only valid when the Combat Gloves visual check is CONFIRMED_WEARER_SIZE');
  if (F.status !== wantStatus || p3d.status !== wantStatus) fail(`3D freeze status must be ${wantStatus} for the Combat Gloves check state ${g}`);
  if (p3.productionMutationAuthorized !== false || p3d.productionMutationAuthorized !== false) fail('3D rolling authority must keep production mutation unauthorized');
  if (p3.subphases['3B'].status !== 'WEAPON_PHASE_3B_203_IDENTITY_CANONICAL_AUTHORITY_CERTIFIED' || p3.subphases['3C'].status !== 'WEAPON_PHASE_3C_PRODUCTION_DISPOSITION_LEDGER_CERTIFIED' || p3.subphases['3A'].status !== 'PHASE_3A_COMPLETE_RESOLVED') fail('3D rolling authority must carry 3A/3B/3C certified statuses');
  if (F.claimTrace.length !== 209 || F.identityTrace.length !== 203 || F.liveWeaponCoverage.length !== 186 || F.cleanupGates.length !== 35 || F.sourceUnresolvedFields.length !== 25) fail('3D freeze trace section sizes');
  if (errors.length === e3d) console.log(`Phase 3D global freeze OK: 209 claims -> 203 identities (197/6), 151/52 repo, CREATE 52/UPDATE 149/MERGE 2, 186 live covered once, 35 cleanup gates, 25 unresolved fields, production unchanged, status ${F.status}`);
}

// Phase 4A: Simple Weapon semantic tags (rolling planner authority). The planner owns finalTags; this only verifies them.
const P4A = 'data/audits/item-weapons-phase-4a-simple-semantic-rolling.json';
if (fs.existsSync(path.join(ROOT, P4A))) {
  const e4 = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const S = JSON.parse(fs.readFileSync(path.join(ROOT, P4A), 'utf8'));
  if (!fs.existsSync(path.join(ROOT, 'docs/audits/item-weapons-phase-4a-simple-semantic-rolling.md'))) fail('4A missing markdown companion');
  if (S.authorityOnly !== true || S.productionMutationAuthorized !== false || S.implementationContract?.runtimeCodeMutationAuthorized !== false || S.implementationContract?.nextCategoryAuthorized !== false) fail('4A authority-only / mutation flags');
  // Phase 3D must remain frozen and production unchanged
  const frz = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/item-weapons-phase-3d-global-freeze.json'), 'utf8'));
  if (frz.status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN' || auth.phases['3-weapons-canonical-authority'].subphases['3D'].status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') fail('4A requires Phase 3D to remain frozen');
  const b3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/item-weapons-phase-3b-canonical-authority.json'), 'utf8'));
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  if (sh(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8')) !== b3.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== b3.productionBaseline['template.json']) fail('4A production file changed (packs/weapons.db or template.json)');
  // certified feat/talent-used vocabulary, recomputed from the three authorities
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const used = new Set();
  for (const a of J('data/audits/feat-tags-pass2-semantic-authority.json').assignments) for (const t of a.finalTags || []) used.add(t);
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'finalTags' && Array.isArray(v)) v.forEach((t) => used.add(t)); else walk(v); } };
  walk(J('data/audits/talent-phase-12-1-semantic-tag-authority.json').batches);
  for (const a of J('data/audits/talent-phase-12-final-ontology-adjudication.json').assignments) for (const t of a.finalTags || []) used.add(t);
  if (used.size !== S.vocabularyPolicy.derivedAllowedTagCount || used.size !== 183) fail(`4A feat/talent-used vocabulary is ${used.size}, expected 183`);
  const REJECT = ['accuracy', 'area_damage', 'condition_track', 'explosives', 'grenade', 'rifle', 'thrown'];
  if (!same([...S.vocabularyPolicy.knownRuntimeOrWeaponTagsExplicitlyNotAllowed].sort(), REJECT)) fail('4A rejected runtime-tag list changed');
  for (const t of REJECT) if (used.has(t)) fail(`4A rejected tag ${t} is now used by certified feats/talents; the vocabulary policy needs planner review`);
  // Phase 3B Simple Weapon census
  const simple = b3.identities.filter((i) => i.weaponGroup === 'Simple Weapon').sort((x, y) => (x.canonicalName < y.canonicalName ? -1 : 1));
  if (simple.length !== 49 || S.categoryCensus.canonicalSimpleWeaponIdentities !== 49) fail(`4A Phase 3B Simple Weapon identities ${simple.length}, expected 49`);
  const sPresent = simple.filter((i) => i.repo.present).length;
  if (sPresent !== S.categoryCensus.repoPresent || simple.length - sPresent !== S.categoryCensus.repoMissing) fail('4A Simple Weapon repo present/missing census');
  const byKey = new Map(simple.map((i) => [i.identityKey, i]));
  const asg = S.assignments;
  const seen = new Set();
  const REQ = asg.length;
  const tagsUsed = new Set();
  let tagTotal = 0, present = 0;
  asg.forEach((a, idx) => {
    const w = `4A ${a.canonicalName}`;
    if (seen.has(a.identityKey)) fail(`${w} occurs more than once`); seen.add(a.identityKey);
    const i = byKey.get(a.identityKey);
    if (!i) { fail(`${w} (${a.identityKey}) is not a Phase 3B Simple Weapon identity`); return; }
    if (i.canonicalName !== a.canonicalName) fail(`${w} name differs from Phase 3B (${i.canonicalName})`);
    if (a.repo.present !== i.repo.present || (a.repo.id || null) !== (i.repo.id || null)) fail(`${w} repo mapping differs from Phase 3B`);
    if (a.repo.present) present++;
    if (simple[idx] && simple[idx].identityKey !== a.identityKey) fail(`${w} is out of alphabetical Simple Weapon order`);
    const c0 = i.sourceClaims[0];
    if (a.source.book.replace(/^The /, '') !== c0.book.replace(/^The /, '')) fail(`${w} source book differs from Phase 3B`);
    if (!Array.isArray(a.finalTags) || !a.finalTags.length) fail(`${w} has no finalTags`);
    if (new Set(a.finalTags).size !== a.finalTags.length) fail(`${w} duplicate tags`);
    for (const t of a.finalTags) {
      tagTotal++; tagsUsed.add(t);
      if (!used.has(t)) fail(`${w} tag ${t} is not used by any certified feat/talent`);
      if (REJECT.includes(t)) fail(`${w} uses rejected runtime-only tag ${t}`);
      if (t === 'simple_weapon' || t === 'simple-weapon') fail(`${w} must not carry a Simple Weapon batch tag`);
      if (!a.rationale || typeof a.rationale[t] !== 'string' || !a.rationale[t].trim()) fail(`${w} tag ${t} has no rationale`);
    }
    for (const t of Object.keys(a.rationale || {})) if (!a.finalTags.includes(t)) fail(`${w} rationale for ${t} has no tag`);
    if (!Array.isArray(a.ontologyGapCandidates)) fail(`${w} ontologyGapCandidates must be an array`);
  });
  if (seen.size !== REQ) fail('4A duplicate assignment identity');
  // rounds ledger, recomputed from the assignments
  const rp = S.rollingProgress, rounds = S.rounds || [];
  const total = rounds.reduce((m, r) => m + r.assignmentCount, 0);
  if (total !== REQ || rp.adjudicatedTotal !== REQ || rp.remaining !== 49 - REQ) fail('4A rolling progress counts');
  if (rp.nextCanonicalName !== (simple[REQ] ? simple[REQ].canonicalName : null)) fail(`4A next canonical name must be ${simple[REQ]?.canonicalName ?? null}`);
  let off = 0, cumTags = 0, cumGaps = 0; const cumSet = new Set();
  rounds.forEach((r, ri) => {
    const sl = asg.slice(off, off + r.assignmentCount); off += r.assignmentCount;
    const w = `4A round ${r.round}`;
    if (r.round !== ri + 1 || !sl.length) { fail(`${w} ledger order`); return; }
    if (sl[0].canonicalName !== r.firstCanonicalName || sl[sl.length - 1].canonicalName !== r.lastCanonicalName) fail(`${w} first/last identity`);
    const pr = sl.filter((a) => a.repo.present).length;
    if (pr !== r.repoPresent || sl.length - pr !== r.repoMissing) fail(`${w} repo present/missing`);
    const tags = sl.reduce((m, a) => m + a.finalTags.length, 0), gaps = sl.reduce((m, a) => m + a.ontologyGapCandidates.length, 0);
    if (tags !== r.tagAssignments || gaps !== r.ontologyGapCandidates) fail(`${w} tag/gap counts`);
    cumTags += tags; cumGaps += gaps; sl.forEach((a) => a.finalTags.forEach((t) => cumSet.add(t)));
    if (ri === rounds.length - 1) {
      const rt = new Set(sl.flatMap((a) => a.finalTags));
      if (rp.round !== r.round || rp.adjudicatedThisRound !== sl.length || rp.firstCanonicalName !== r.firstCanonicalName || rp.lastCanonicalName !== r.lastCanonicalName || rp.roundRepoPresent !== pr || rp.roundRepoMissing !== sl.length - pr || rp.totalFinalTagAssignmentsThisRound !== tags || rp.ontologyGapCandidatesThisRound !== gaps || rp.distinctTagsUsedThisRound !== rt.size || !same([...rt].sort(), [...rp.tagsUsedThisRound].sort())) fail('4A rollingProgress does not match the latest round');
    }
  });
  if (off !== REQ) fail('4A rounds do not cover every assignment');
  if (rp.totalFinalTagAssignmentsCumulative !== cumTags || rp.distinctTagsUsedCumulative !== cumSet.size || rp.ontologyGapCandidatesCumulative !== cumGaps || !same([...cumSet].sort(), [...rp.tagsUsedCumulative].sort())) fail('4A cumulative tag/gap counts');
  if (rounds.length && rounds[0].firstCanonicalName !== simple[0].canonicalName) fail('4A first canonical name');
  // earlier planner rulings are pinned: a later round may not change them
  const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
  const pins = [[0, 12, '23e2ffd7c3ffa19f0e44997a125972d2942555193999f4405cb385a8caa4ed1d'], [12, 24, '13a49a0d2a19c94bdaa3768bbb5c55406df8fcc7f26894f73ae09939dbbc8fcf'], [24, 36, '38977ba85cb2bd96e8e3d8d92f1a3e726fe54db44a60f2e7af2557361c445b3a']];
  for (const [lo, hi, want] of pins) if (asg.length >= hi && sh(JSON.stringify(canon(asg.slice(lo, hi)))) !== want) fail(`4A round ${lo / 12 + 1} planner rulings changed after adjudication`);
  // ontology gaps stay gaps, never tags
  for (const a of asg) for (const g of a.ontologyGapCandidates) if (a.finalTags.some((t) => t.toLowerCase() === String(g.concept).toLowerCase())) fail(`4A ${a.canonicalName} converted ontology gap ${g.concept} into a tag`);
  if (REQ === 49) {
    // Simple Weapon category complete: certified status, exact census, recomputed completion summary
    if (S.status !== 'WEAPON_TAG_PHASE_4A_SIMPLE_SEMANTIC_AUTHORITY_CERTIFIED' || S.simpleWeaponPlannerAuthorityComplete !== true) fail('4A complete authority must carry the certified status');
    if (!same(simple.map((i) => i.identityKey), asg.map((a) => a.identityKey))) fail('4A all 49 Phase 3B Simple Weapon identities must appear exactly once in order');
    if (present !== 28 || REQ - present !== 21) fail('4A final repo present/missing must be 28/21');
    const cs = S.completionSummary, gl = asg.flatMap((a) => a.ontologyGapCandidates.map((g) => ({ canonicalName: a.canonicalName, concept: g.concept })));
    if (cs.adjudicatedIdentities !== 49 || cs.repoPresent !== 28 || cs.repoMissing !== 21 || cs.totalFinalTagAssignments !== tagTotal || cs.distinctTagsUsed !== tagsUsed.size || cs.ontologyGapConcepts !== gl.length || !same(cs.ontologyGaps, gl)) fail('4A completionSummary does not match the recomputed assignments');
    if (tagTotal !== 222 || tagsUsed.size !== 57 || !same(gl.map((g) => g.concept), ['OBJECT_DR_BYPASS', 'TRIP_COMPATIBILITY', 'LIGHTSABER_RESISTANCE', 'BREACHING_OR_OBJECT_ONLY_WEAPON', 'EXTENDED_MELEE_REACH'])) fail('4A final totals must be 222 assignments, 57 distinct tags, 5 ontology gaps');
    if (rp.nextCanonicalName !== null || rp.remaining !== 0) fail('4A complete authority has no next identity');
  }
  if (errors.length === e4) console.log(`Phase 4A Simple Weapon semantic tags OK: ${REQ}/49 adjudicated in ${rounds.length} round(s) (${present} repo-present / ${REQ - present} missing), ${tagTotal} assignments, ${tagsUsed.size} distinct tags from the ${used.size}-tag certified feat/talent vocabulary, ${cumGaps} ontology gaps, next ${rp.nextCanonicalName}`);
}

// Phase 4B: Lightsaber semantic tags (rolling planner authority; standard Lightsaber is the comparison baseline)
const P4B = 'data/audits/item-weapons-phase-4b-lightsaber-semantic-rolling.json';
if (fs.existsSync(path.join(ROOT, P4B))) {
  const e4b = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
  const S = J(P4B);
  if (!fs.existsSync(path.join(ROOT, 'docs/audits/item-weapons-phase-4b-lightsaber-semantic-rolling.md'))) fail('4B missing markdown companion');
  const ic = S.implementationContract || {};
  if (S.authorityOnly !== true || S.productionMutationAuthorized !== false || ic.productionMutationAuthorized !== false || ic.runtimeCodeMutationAuthorized !== false || ic.claudeMayCreateNewTags !== false || (ic.unrepresentedMechanicsAreTags !== undefined && ic.unrepresentedMechanicsAreTags !== false)) fail('4B authority-only / mutation flags');
  const b3 = J('data/audits/item-weapons-phase-3b-canonical-authority.json');
  if (J('data/audits/item-weapons-phase-3d-global-freeze.json').status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') fail('4B requires Phase 3D to remain frozen');
  if (sh(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8')) !== b3.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== b3.productionBaseline['template.json']) fail('4B production file changed (packs/weapons.db or template.json)');
  // certified feat/talent-used vocabulary, recomputed
  const used = new Set();
  for (const a of J('data/audits/feat-tags-pass2-semantic-authority.json').assignments) for (const t of a.finalTags || []) used.add(t);
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'finalTags' && Array.isArray(v)) v.forEach((t) => used.add(t)); else walk(v); } };
  walk(J('data/audits/talent-phase-12-1-semantic-tag-authority.json').batches);
  for (const a of J('data/audits/talent-phase-12-final-ontology-adjudication.json').assignments) for (const t of a.finalTags || []) used.add(t);
  if (used.size !== 183 || S.vocabularyPolicy.derivedAllowedTagCount !== 183) fail(`4B feat/talent-used vocabulary is ${used.size}, expected 183`);
  const REJECT = ['accuracy', 'area_damage', 'condition_track', 'explosives', 'grenade', 'rifle', 'thrown'];
  const SHARED = ['lightsaber', 'melee', 'offense_melee'];
  if (!same(S.lightsaberComparisonPolicy.sharedTags, SHARED) || S.lightsaberComparisonPolicy.baselineIdentityKey !== 'weapon-lightsaber' || S.lightsaberComparisonPolicy.baselineDamage !== '2d8') fail('4B comparison policy / baseline changed');
  // Phase 3B lightsaber census
  const saber = b3.identities.filter((i) => i.weaponGroup === 'Lightsaber').sort((x, y) => (x.canonicalName < y.canonicalName ? -1 : 1));
  if (saber.length !== 16 || S.categoryCensus.canonicalLightsaberIdentities !== 16 || saber.filter((i) => i.repo.present).length !== S.categoryCensus.repoPresent || S.categoryCensus.repoMissing !== saber.filter((i) => !i.repo.present).length) fail('4B Lightsaber census must match the 16 Phase 3B identities');
  const asg = S.assignments, byKey = new Map(saber.map((i) => [i.identityKey, i])), seen = new Set();
  const REQ = asg.length;
  let tagTotal = 0; const tagsUsed = new Set(); const unrep = [];
  asg.forEach((a, idx) => {
    const w = `4B ${a.canonicalName}`;
    if (seen.has(a.identityKey)) fail(`${w} occurs more than once`); seen.add(a.identityKey);
    const i = byKey.get(a.identityKey);
    if (!i) { fail(`${w} (${a.identityKey}) is not a Phase 3B Lightsaber identity`); return; }
    if (i.canonicalName !== a.canonicalName || a.repo.present !== i.repo.present || (a.repo.id || null) !== (i.repo.id || null)) fail(`${w} identity/name/repo differs from Phase 3B`);
    if (saber[idx] && saber[idx].identityKey !== a.identityKey) fail(`${w} is out of alphabetical Lightsaber order`);
    if (!i.sourceClaims.some((c) => c.book.replace(/^The /, '') === a.source.book.replace(/^The /, '') && c.descriptionPage === a.source.descriptionPage)) fail(`${w} source book/page matches no Phase 3B source claim`);
    // every tag-bearing value must be an exact certified feat/talent-used tag
    const fields = { sharedTags: a.sharedTags, advantageTags: a.advantageTags, tradeoffTags: a.tradeoffTags, finalTags: a.finalTags, 'conditionalSynergyTags[].tag': (a.conditionalSynergyTags || []).map((c) => c.tag) };
    for (const [f, vals] of Object.entries(fields)) {
      if (!Array.isArray(vals)) { fail(`${w} ${f} must be an array`); continue; }
      for (const t of vals) { if (!used.has(t)) fail(`${w} ${f} value "${t}" is not used by any certified feat/talent`); if (REJECT.includes(t)) fail(`${w} ${f} uses rejected runtime-only tag ${t}`); }
    }
    if (!same(a.sharedTags, SHARED)) fail(`${w} sharedTags must be exactly ${SHARED.join(', ')}`);
    if (!same(a.finalTags, [...a.sharedTags, ...a.advantageTags])) fail(`${w} finalTags must equal sharedTags plus advantageTags (positive specializations only)`);
    for (const t of a.tradeoffTags) if (a.finalTags.includes(t)) fail(`${w} tradeoff tag ${t} was promoted into finalTags`);
    for (const t of a.advantageTags) if (a.tradeoffTags.includes(t)) fail(`${w} tag ${t} is both advantage and tradeoff`);
    if (new Set(a.finalTags).size !== a.finalTags.length) fail(`${w} duplicate finalTags`);
    for (const t of a.finalTags) { tagTotal++; tagsUsed.add(t); if (typeof a.rationale?.[t] !== 'string' || !a.rationale[t].trim()) fail(`${w} tag ${t} has no rationale`); }
    for (const t of Object.keys(a.rationale || {})) if (!a.finalTags.includes(t)) fail(`${w} rationale for ${t} has no tag`);
    for (const c of a.conditionalSynergyTags || []) { if (a.finalTags.includes(c.tag)) fail(`${w} conditional tag ${c.tag} was promoted into finalTags`); if (!c.condition || !c.reason) fail(`${w} conditional tag ${c.tag} needs a condition and reason`); }
    for (const m of a.unrepresentedMechanics || []) {
      if (!m.mechanic || !/^[A-Z][A-Z0-9_]*$/.test(String(m.representationStatus)) || !m.note) fail(`${w} unrepresented mechanic shape`);
      const all = [...a.sharedTags, ...a.advantageTags, ...a.tradeoffTags, ...a.finalTags, ...(a.conditionalSynergyTags || []).map((c) => c.tag)];
      if (all.some((t) => t === m.mechanic || t.toLowerCase() === String(m.mechanic).toLowerCase())) fail(`${w} unrepresented mechanic text was converted into a tag`);
      unrep.push(m.mechanic);
    }
    if (!a.relativeToStandard || !Array.isArray(a.relativeToStandard.pros) || !Array.isArray(a.relativeToStandard.cons) || !a.relativeToStandard.recommendationFit) fail(`${w} relativeToStandard comparison missing`);
  });
  const base = asg.find((a) => a.identityKey === 'weapon-lightsaber');
  if (!base || base.advantageTags.length || base.tradeoffTags.length || !same(base.finalTags, SHARED) || base.systemDesignContext?.comparisonRole !== 'DEFAULT_JEDI_BASELINE') fail('4B standard Lightsaber must remain the undifferentiated default baseline');
  // progress counters recomputed
  const rp = S.rollingProgress;
  const thisN = rp.adjudicatedThisRound;
  if (rp.adjudicatedTotal !== REQ || rp.remaining !== 16 - REQ || rp.nextCanonicalName !== (saber[REQ] ? saber[REQ].canonicalName : null) || thisN < 1 || thisN > REQ) fail('4B rolling progress counts / next identity');
  else if (asg[REQ - thisN].canonicalName !== rp.firstCanonicalName || asg[REQ - 1].canonicalName !== rp.lastCanonicalName) fail('4B this-round first/last identity');
  const sl = asg.slice(Math.max(0, REQ - thisN));
  const condTotal = asg.reduce((m, a) => m + (a.conditionalSynergyTags || []).length, 0);
  if (rp.totalFinalTagAssignmentsThisRound !== sl.reduce((m, a) => m + a.finalTags.length, 0) || rp.totalFinalTagAssignmentsCumulative !== tagTotal || rp.distinctTagsUsedCumulative !== tagsUsed.size || !same([...tagsUsed].sort(), [...rp.tagsUsedCumulative].sort()) || rp.conditionalSynergyAssignmentsCumulative !== condTotal) fail('4B rolling progress tag counts');
  if (REQ >= 8 && sh(JSON.stringify(canon(asg.slice(0, 8).map(({ ruleSelectors, ...rest }) => rest)))) !== '5a7666017416dab6731589bd639af901402222fdf82e9f362c0f1500506d0738') fail('4B round 1 planner rulings changed after adjudication');
  // rule-selector layer (exact weapon / family / ability matching; never semantic tags)
  const RET = J('data/audits/item-weapons-phase-4b-lightsaber-round1-selector-retrofit.json');
  const RELATIONS = ['POSITIVE_WEAPON_MODIFIER', 'NEGATIVE_WEAPON_MODIFIER', 'EXPLICIT_WEAPON_FAMILY_MATCH', 'UNLOCKS_DOUBLE_WEAPON_MODE'];
  const names = (f) => new Set(fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).name));
  const talentNames = names('packs/talents.db'), featNames = names('packs/feats.db');
  if (RET.productionMutationAuthorized !== false || RET.authorityOnly !== true || RET.semanticTagInvariant?.round1SemanticRulingsChanged !== false) fail('4B selector retrofit flags');
  const retBy = new Map(RET.assignments.map((x) => [x.identityKey, x]));
  asg.forEach((a, idx) => {
    const w = `4B selectors ${a.canonicalName}`, q = a.ruleSelectors;
    if (!q) { fail(`${w} missing ruleSelectors (every Lightsaber needs them)`); return; }
    if (!q) return;
    if (q.exactIdentity !== `weapon:${a.identityKey}`) fail(`${w} exactIdentity must be weapon:${a.identityKey}`);
    if (q.weaponGroup !== 'weapon-group:lightsaber' || q.proficiency !== 'weapon-proficiency:lightsabers') fail(`${w} must retain weapon-group:lightsaber and weapon-proficiency:lightsabers`);
    if (!Array.isArray(q.families) || !q.families.length || q.families.some((f) => !/^weapon-family:[a-z0-9-]+$/.test(f))) fail(`${w} families malformed`);
    for (const l of q.explicitAbilityLinks || []) {
      if (!['feat', 'talent'].includes(l.abilityType) || !/^[A-Z][A-Z0-9_]*$/.test(String(l.relation))) fail(`${w} ability link shape (${l.abilityName})`);
      if (!(l.abilityType === 'talent' ? talentNames : featNames).has(l.abilityName)) fail(`${w} ${l.abilityType} "${l.abilityName}" does not exist in the production ${l.abilityType} pack`);
    }
    const r = retBy.get(a.identityKey);
    if (idx < 8 && (!r || !same(canon(r.ruleSelectors), canon(q)))) fail(`${w} differs from the planner selector retrofit`);
    // selectors are never tags
    const tagVals = [...a.sharedTags, ...a.advantageTags, ...a.tradeoffTags, ...a.finalTags, ...(a.conditionalSynergyTags || []).map((c) => c.tag)];
    const selVals = [q.exactIdentity, q.weaponGroup, q.proficiency, ...q.families];
    if (tagVals.some((t) => selVals.includes(t) || /[:]/.test(t))) fail(`${w} a rule selector leaked into a semantic tag field`);
  });
  if (RET.assignments.length !== 8 || !same(RET.assignments.map((x) => x.identityKey), asg.slice(0, 8).map((a) => a.identityKey))) fail('4B selector retrofit must cover exactly the 8 Round 1 identities');
  const gs = asg.find((a) => a.identityKey === 'lightsaber-chassis-guard-shoto')?.ruleSelectors;
  if (!gs || !gs.families.includes('weapon-family:shoto') || !['Shoto Focus', 'Shoto Master'].every((n) => gs.explicitAbilityLinks.some((l) => l.abilityName === n && l.relation === 'EXPLICIT_WEAPON_FAMILY_MATCH'))) fail('4B Guard Shoto must resolve through weapon-family:shoto and link Shoto Focus and Shoto Master');
  const pk = asg.find((a) => a.identityKey === 'lightsaber-chassis-pike')?.ruleSelectors;
  if (!pk || !pk.explicitAbilityLinks.some((l) => l.abilityType === 'feat' && l.abilityName === 'Long Haft Strike' && l.sourceCrossReferenceAlias === 'Long Haft Form' && l.relation === 'UNLOCKS_DOUBLE_WEAPON_MODE')) fail('4B Lightsaber Pike must link feat Long Haft Strike (alias Long Haft Form)');
  if (REQ === 16) {
    if (S.status !== 'WEAPON_TAG_PHASE_4B_LIGHTSABER_COMPLETE_PLANNER_AUTHORITY' || rp.categoryComplete !== true || rp.remaining !== 0 || rp.nextCanonicalName !== null) fail('4B complete authority: status, categoryComplete, no next identity');
    if (tagTotal !== 74 || tagsUsed.size !== 23 || condTotal !== 2 || asg.filter((a) => a.repo.present).length !== 16) fail('4B final totals must be 74 assignments, 23 distinct tags, 2 conditional assignments, 16 repo-present');
    const sh2 = asg.find((a) => a.identityKey === 'lightsaber-chassis-short');
    const b3s = b3.identities.find((i) => i.identityKey === 'lightsaber-chassis-short');
    const thrown = (b3s.canonicalStats.attackProfiles || []).some((p) => p.qualities?.thrown) || b3s.qualities?.thrown;
    if (!sh2 || !thrown || !['ranged', 'offense_ranged'].every((t) => sh2.finalTags.includes(t)) || !sh2.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Shoto Focus') || !sh2.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Shoto Master') || sh2.finalTags.includes('dual_wield')) fail('4B Lightsaber, Short must carry ranged/offense_ranged only because Phase 3B certifies thrown, keep its Shoto links, and no dual_wield');
    const lw = asg.find((a) => a.identityKey === 'lightsaber-chassis-lightwhip');
    if (!lw || !['Pin', 'Trip'].every((n) => lw.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === n && l.relation === 'SUPPORTED')) || !['Crush', 'Throw'].every((n) => lw.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === n && l.relation === 'PROHIBITED'))) fail('4B Lightwhip must support Pin/Trip and prohibit Crush/Throw');
    const lh = asg.find((a) => a.identityKey === 'lightsaber-chassis-longhandle');
    if (!lh || !lh.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Long Haft Strike' && l.sourceCrossReferenceAlias === 'Long Haft Form') || lh.finalTags.includes('double_weapon')) fail('4B Long-Handle Lightsaber must link Long Haft Strike (alias Long Haft Form) with double_weapon conditional only');
    if (sh(JSON.stringify(canon(asg))) !== 'acaffa08ec366a0988a1e1d1b93d01863eebac3198935ee922f61b879407b942') fail('4B complete planner authority changed after adjudication');
  }
  if (errors.length === e4b) console.log(`Phase 4B Lightsaber semantic tags OK: ${REQ}/16 adjudicated, ${tagTotal} assignments, ${tagsUsed.size} distinct tags, ${unrep.length} unrepresented mechanics (plain text, not tags), baseline = Lightsaber, next ${rp.nextCanonicalName}`);
}

// Phase 4C: Pistol semantic tags + rule selectors + comparison data (rolling planner authority)
const P4C = 'data/audits/item-weapons-phase-4c-pistol-semantic-rolling.json';
if (fs.existsSync(path.join(ROOT, P4C))) {
  const e4c = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
  const S = J(P4C);
  if (!fs.existsSync(path.join(ROOT, 'docs/audits/item-weapons-phase-4c-pistol-semantic-rolling.md'))) fail('4C missing markdown companion');
  const ic = S.implementationContract || {};
  if (S.authorityOnly !== true || S.productionMutationAuthorized !== false || ic.productionMutationAuthorized !== false || ic.runtimeCodeMutationAuthorized !== false || ic.claudeMayCreateNewSemanticTags !== false || S.vocabularyPolicy?.ruleSelectorsAreSemanticTags !== false || S.vocabularyPolicy?.recommendationProfileValuesAreSemanticTags !== false || S.vocabularyPolicy?.rawDamageOrCapacityMayCreateSemanticTags !== false) fail('4C authority-only / mutation / vocabulary flags');
  const b3 = J('data/audits/item-weapons-phase-3b-canonical-authority.json');
  if (J('data/audits/item-weapons-phase-3d-global-freeze.json').status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') fail('4C requires Phase 3D to remain frozen');
  if (sh(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8')) !== b3.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== b3.productionBaseline['template.json']) fail('4C production file changed (packs/weapons.db or template.json)');
  const used = new Set();
  for (const a of J('data/audits/feat-tags-pass2-semantic-authority.json').assignments) for (const t of a.finalTags || []) used.add(t);
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'finalTags' && Array.isArray(v)) v.forEach((t) => used.add(t)); else walk(v); } };
  walk(J('data/audits/talent-phase-12-1-semantic-tag-authority.json').batches);
  for (const a of J('data/audits/talent-phase-12-final-ontology-adjudication.json').assignments) for (const t of a.finalTags || []) used.add(t);
  if (used.size !== 183 || S.vocabularyPolicy.derivedAllowedTagCount !== 183) fail(`4C feat/talent-used vocabulary is ${used.size}, expected 183`);
  const REJECT = ['accuracy', 'area_damage', 'condition_track', 'explosives', 'grenade', 'rifle', 'thrown'];
  const SHARED = ['pistol', 'ranged'];
  const pp = S.pistolComparisonPolicy;
  if (S.baseline.pistolComparisonIdentityKey !== 'weapon-blaster-pistol' || pp.baselineDamage !== '3d6' || pp.baselineStunDamage !== '2d6' || pp.baselineCapacityShots !== 100 || !same(pp.baselineRateOfFire, ['S'])) fail('4C baseline Blaster Pistol policy changed');
  const pist = b3.identities.filter((i) => i.weaponGroup === 'Pistol').sort((x, y) => (x.canonicalName < y.canonicalName ? -1 : 1));
  if (pist.length !== 30 || S.categoryCensus.canonicalPistolIdentities !== 30 || pist.filter((i) => i.repo.present).length !== S.categoryCensus.repoPresent || pist.filter((i) => !i.repo.present).length !== S.categoryCensus.repoMissing) fail('4C Pistol census must match the 30 Phase 3B identities');
  const lines = (f) => new Set(fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).name));
  const talentNames = lines('packs/talents.db'), featNames = lines('packs/feats.db');
  const ENUM = /^[A-Z][A-Z0-9_]*$/;
  const asg = S.assignments, byKey = new Map(pist.map((i) => [i.identityKey, i])), seen = new Set();
  const REQ = asg.length; let tagTotal = 0; const tagsUsed = new Set(), tradeUsed = new Set();
  const bn = (b) => String(b).replace(/^The /, '');
  asg.forEach((a, idx) => {
    const w = `4C ${a.canonicalName}`;
    if (seen.has(a.identityKey)) fail(`${w} occurs more than once`); seen.add(a.identityKey);
    const i = byKey.get(a.identityKey);
    if (!i) { fail(`${w} (${a.identityKey}) is not a Phase 3B Pistol identity`); return; }
    if (i.canonicalName !== a.canonicalName) fail(`${w} name differs from Phase 3B (${i.canonicalName})`);
    const claim = i.sourceClaims.find((c) => bn(c.book) === bn(a.source.book));
    if (!claim || ![claim.descriptionPage, claim.statTablePage].some((pg) => pg === a.source.descriptionPage || pg === a.source.statTablePage)) fail(`${w} source book/page matches no Phase 3B source claim`);
    const fields = { sharedTags: a.sharedTags, advantageTags: a.advantageTags, tradeoffTags: a.tradeoffTags, finalTags: a.finalTags };
    for (const [f, vals] of Object.entries(fields)) {
      if (!Array.isArray(vals)) { fail(`${w} ${f} must be an array`); continue; }
      for (const t of vals) { if (!used.has(t)) fail(`${w} ${f} value "${t}" is not used by any certified feat/talent`); if (REJECT.includes(t)) fail(`${w} ${f} uses rejected runtime-only tag ${t}`); }
    }
    if (!same(a.sharedTags, SHARED)) fail(`${w} sharedTags must be exactly ${SHARED.join(', ')}`);
    if (!same(a.finalTags, [...a.sharedTags, ...a.advantageTags])) fail(`${w} finalTags must equal sharedTags plus advantageTags`);
    for (const t of a.tradeoffTags) { tradeUsed.add(t); if (a.finalTags.includes(t)) fail(`${w} tradeoff tag ${t} was promoted into finalTags`); if (a.advantageTags.includes(t)) fail(`${w} tag ${t} is both advantage and tradeoff`); }
    if (new Set(a.finalTags).size !== a.finalTags.length) fail(`${w} duplicate finalTags`);
    for (const t of a.finalTags) { tagTotal++; tagsUsed.add(t); if (typeof a.rationale?.[t] !== 'string' || !a.rationale[t].trim()) fail(`${w} tag ${t} has no rationale`); }
    for (const t of Object.keys(a.rationale || {})) if (!a.finalTags.includes(t)) fail(`${w} rationale for ${t} has no tag`);
    const q = a.ruleSelectors;
    if (!q) fail(`${w} missing ruleSelectors`);
    else {
      if (q.exactIdentity !== `weapon:${a.identityKey}`) fail(`${w} exactIdentity must be weapon:${a.identityKey}`);
      if (q.weaponGroup !== 'weapon-group:pistol' || q.proficiency !== 'weapon-proficiency:pistols') fail(`${w} must retain weapon-group:pistol and weapon-proficiency:pistols`);
      if (!Array.isArray(q.families) || !q.families.length || q.families.some((f) => !/^weapon-family:[a-z0-9-]+$/.test(f))) fail(`${w} families malformed`);
      for (const l of q.explicitAbilityLinks || []) {
        if (!['feat', 'talent', 'talent-family'].includes(l.abilityType) || !ENUM.test(l.relation || '') || !l.abilityName) fail(`${w} ability link shape (${l.abilityName})`);
        else if (l.abilityType !== 'talent-family' && !(l.abilityType === 'talent' ? talentNames : featNames).has(l.abilityName)) fail(`${w} ${l.abilityType} "${l.abilityName}" does not exist in the production ${l.abilityType} pack`);
      }
      for (const r of q.abilityRestrictions || []) if (!r.selector || !ENUM.test(r.relation || '') || !r.reason) fail(`${w} abilityRestriction shape`);
      const selVals = [q.exactIdentity, q.weaponGroup, q.proficiency, ...q.families, ...(q.abilityRestrictions || []).map((r) => r.selector)];
      const tagVals = [...a.sharedTags, ...a.advantageTags, ...a.tradeoffTags, ...a.finalTags];
      if (tagVals.some((t) => selVals.includes(t) || /:/.test(t))) fail(`${w} a rule selector leaked into a semantic tag field`);
    }
    const c = a.relativeToStandardPistol, cs = i.canonicalStats;
    if (!c || !c.damage || !c.capacity || !c.stun || !c.range || !c.concealment || !c.multiAttackCompatibility || !c.actionEconomy || !c.recommendationFit) fail(`${w} relativeToStandardPistol incomplete`);
    else {
      if (cs.baseDamage.mode === 'dice' && c.damage.canonical !== cs.baseDamage.formula && !String(c.damage.canonical).startsWith(`${cs.baseDamage.formula} `)) fail(`${w} comparison damage ${c.damage.canonical} != Phase 3B ${cs.baseDamage.formula}`);
      if (cs.baseDamage.mode === 'none') {
        const sf = cs.stun?.damage?.formula;
        if (!sf || !String(c.damage.canonical).includes(sf)) fail(`${w} stun-only comparison damage "${c.damage.canonical}" must carry the Phase 3B stun formula ${sf}`);
      }
      const am = cs.ammo || {};
      if (/^ESTABLISHED(_[A-Z_]+)?$/.test(c.capacity.status)) {
        const sv = c.capacity.shots;
        if (typeof sv === 'number') { if (am.mode === 'single' && sv !== am.capacityShots) fail(`${w} comparison capacity ${sv} != Phase 3B ${am.capacityShots}`); }
        else if (Array.isArray(sv) && sv.length && sv.every((n) => typeof n === 'number')) { if (am.mode === 'single' && !sv.includes(am.capacityShots)) fail(`${w} comparison capacities ${sv} do not include Phase 3B ${am.capacityShots}`); }
        else fail(`${w} established capacity needs a number or list of numbers`);
      }
      else if (/^NOT_STATED(_[A-Z_]+)?$/.test(c.capacity.status)) { if (c.capacity.shots !== null || am.status !== 'not-stated') fail(`${w} NOT_STATED capacity must be null and match Phase 3B not-stated ammo`); }
      else fail(`${w} capacity status`);
      if (a.identityKey !== 'weapon-blaster-pistol' && c.damage.relation === 'BASELINE') fail(`${w} only the standard Blaster Pistol is BASELINE`);
    }
    for (const m of a.unrepresentedMechanics || []) if (!m.mechanic || !ENUM.test(m.representationStatus || '') || !m.note) fail(`${w} unrepresented mechanic shape`);
  });
  // adjudicated set must be exactly the first N Phase 3B Pistol identities (within-round listing order is the planner's)
  if (!same(asg.map((a) => a.identityKey).sort(), pist.slice(0, REQ).map((i) => i.identityKey).sort())) fail('4C adjudicated identities must be exactly the first N alphabetical Phase 3B Pistol identities');
  if (REQ === 30) {
    const rpc = S.rollingProgress;
    if (rpc.categoryComplete !== true || rpc.remaining !== 0 || rpc.nextCanonicalName !== null || asg.filter((a) => byKey.get(a.identityKey)?.repo.present).length !== 30) fail('4C complete authority: categoryComplete, 30/30 repo-present, no next identity');
    if (tagTotal !== 164 || tagsUsed.size !== 34) fail('4C final totals must be 164 assignments and 34 distinct tags');
    const sub = asg.find((a) => a.identityKey === 'weapon-subrepeating-blaster');
    const rr = sub?.ruleSelectors.conditionalRules?.find((r) => r.proficiencyTreatment === 'rifle');
    if (!sub || !rr || rr.rangeTreatment !== 'rifle' || rr.weaponFamilyPromotion !== false || sub.ruleSelectors.families.some((f) => /rifle/.test(f)) || sub.ruleSelectors.weaponGroup !== 'weapon-group:pistol') fail('4C Subrepeating Blaster: extended stock changes proficiency/range treatment only and must not promote it to the rifle weapon group or family');
  }
  const base = asg.find((a) => a.identityKey === 'weapon-blaster-pistol');
  if (!base || base.tradeoffTags.length || base.relativeToStandardPistol.damage.canonical !== '3d6' || base.relativeToStandardPistol.capacity.shots !== 100 || base.relativeToStandardPistol.stun.canonical !== '2d6') fail('4C standard Blaster Pistol must remain the baseline (3d6 / 2d6 stun / 100 shots)');
  const sid = asg.find((a) => a.identityKey === 'weapon-sidearm-blaster-pistol');
  if (!sid || !sid.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Rapid Shot' && l.relation === 'TRIGGERS_SWIFT_RESET_BEFORE_NEXT_SHOT') || !sid.tradeoffTags.includes('swift_action') || sid.finalTags.includes('swift_action')) fail('4C Sidearm must keep the Rapid Shot reset link as a directional tradeoff, not a positive tag');
  // progress counters (cumulative) recomputed from the assignments
  const rp = S.rollingProgress, thisN = rp.adjudicatedThisRound;
  if (rp.adjudicatedTotal !== REQ || rp.remaining !== 30 - REQ || rp.nextCanonicalName !== (pist[REQ] ? pist[REQ].canonicalName : null) || thisN < 1 || thisN > REQ) fail('4C rolling progress counts / next identity');
  else if (asg[REQ - thisN].canonicalName !== rp.firstCanonicalNameThisRound || asg[REQ - 1].canonicalName !== rp.lastCanonicalNameThisRound) fail('4C this-round first/last identity');
  if (rp.totalFinalTagAssignments !== tagTotal || rp.distinctFinalTagsUsed !== tagsUsed.size || !same([...tagsUsed].sort(), [...rp.finalTagsUsed].sort()) || !same([...tradeUsed].sort(), [...rp.tradeoffTagsUsed].sort())) fail('4C rolling progress tag counts');
  // earlier planner rulings are pinned
  const pins = [[0, 10, 'b344890cea4cb4d45a3d8c769b33c830660a88aae2ed946c374ba0f4f52b27ac']];
  for (const [lo, hi, want] of pins) if (REQ >= hi && sh(JSON.stringify(canon(asg.slice(lo, hi)))) !== want) fail(`4C round ${lo / 10 + 1} planner rulings changed after adjudication`);
  if (errors.length === e4c) console.log(`Phase 4C Pistol semantic tags OK: ${REQ}/30 adjudicated, ${tagTotal} assignments, ${tagsUsed.size} distinct tags, selectors + comparison data cross-checked against Phase 3B, baseline = Blaster Pistol, next ${rp.nextCanonicalName}`);
}

// Phase 4D: Rifle semantic tags + rule selectors + comparison data (rolling planner authority)
const P4D = 'data/audits/item-weapons-phase-4d-rifle-semantic-rolling.json';
if (fs.existsSync(path.join(ROOT, P4D))) {
  const e4d = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
  const S = J(P4D);
  if (!fs.existsSync(path.join(ROOT, 'docs/audits/item-weapons-phase-4d-rifle-semantic-rolling.md'))) fail('4D missing markdown companion');
  const ic = S.implementationContract || {};
  if (S.authorityOnly !== true || S.productionMutationAuthorized !== false || ic.productionMutationAuthorized !== false || ic.runtimeCodeMutationAuthorized !== false || ic.claudeMayCreateNewSemanticTags !== false || S.vocabularyPolicy?.ruleSelectorsAreSemanticTags !== false || S.vocabularyPolicy?.recommendationProfileValuesAreSemanticTags !== false || S.vocabularyPolicy?.rawDamageCapacityRangeAndROFCreateSemanticTags !== false) fail('4D authority-only / mutation / vocabulary flags');
  const b3 = J('data/audits/item-weapons-phase-3b-canonical-authority.json');
  if (J('data/audits/item-weapons-phase-3d-global-freeze.json').status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') fail('4D requires Phase 3D to remain frozen');
  if (sh(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8')) !== b3.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== b3.productionBaseline['template.json']) fail('4D production file changed (packs/weapons.db or template.json)');
  const used = new Set();
  for (const a of J('data/audits/feat-tags-pass2-semantic-authority.json').assignments) for (const t of a.finalTags || []) used.add(t);
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'finalTags' && Array.isArray(v)) v.forEach((t) => used.add(t)); else walk(v); } };
  walk(J('data/audits/talent-phase-12-1-semantic-tag-authority.json').batches);
  for (const a of J('data/audits/talent-phase-12-final-ontology-adjudication.json').assignments) for (const t of a.finalTags || []) used.add(t);
  if (used.size !== 183 || S.vocabularyPolicy.derivedAllowedTagCount !== 183) fail(`4D feat/talent-used vocabulary is ${used.size}, expected 183`);
  const REJECT = ['rifle', 'accuracy', 'area_damage', 'autofire', 'condition_track', 'explosives', 'grenade', 'thrown', 'ion', 'sonic'];
  const SHARED = ['ranged'];
  const bl = S.baseline;
  if (bl.comparisonIdentityKey !== 'weapon-blaster-rifle' || bl.damage !== '3d8' || bl.stunDamage !== '2d8' || bl.capacityShots !== 50 || !same(bl.rateOfFire, ['S', 'A'])) fail('4D baseline Blaster Rifle policy changed');
  // the Rifle category is Phase 3B groups "Rifle" and "Rifle (Special)" (38 identities, all repo-present)
  const rif = b3.identities.filter((i) => i.weaponGroup === 'Rifle' || i.weaponGroup === 'Rifle (Special)').sort((x, y) => (x.canonicalName.toLowerCase() < y.canonicalName.toLowerCase() ? -1 : 1)); // planner order is case-insensitive (Scatter Gun precedes SG-4)
  if (rif.length !== 38 || S.categoryCensus.canonicalRifleIdentities !== 38 || rif.filter((i) => i.repo.present).length !== S.categoryCensus.repoPresent || S.categoryCensus.repoMissing !== 0 || S.categoryCensus.phase3BBlobSha === undefined) fail('4D Rifle census must match the 38 Phase 3B Rifle identities');
  const lines = (f) => new Set(fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).name));
  const talentNames = lines('packs/talents.db'), featNames = lines('packs/feats.db');
  const ENUM = /^[A-Z][A-Z0-9_]*$/;
  const asg = S.assignments, byKey = new Map(rif.map((i) => [i.identityKey, i])), seen = new Set();
  const REQ = asg.length; let tagTotal = 0; const tagsUsed = new Set(), tradeUsed = new Set();
  const bn = (b) => String(b).replace(/^The /, '');
  const selCheck = (w, q, group, prof) => {
    if (q.weaponGroup !== group || q.proficiency !== prof) fail(`${w} selector group/proficiency must be ${group} / ${prof}`);
    if (!Array.isArray(q.families) || !q.families.length || q.families.some((f) => !/^weapon-family:[a-z0-9-]+$/.test(f))) fail(`${w} families malformed`);
  };
  asg.forEach((a) => {
    const w = `4D ${a.canonicalName}`;
    if (seen.has(a.identityKey)) fail(`${w} occurs more than once`); seen.add(a.identityKey);
    const i = byKey.get(a.identityKey);
    if (!i) { fail(`${w} (${a.identityKey}) is not a Phase 3B Rifle identity`); return; }
    if (i.canonicalName !== a.canonicalName) fail(`${w} name differs from Phase 3B (${i.canonicalName})`);
    const sb = a.source.book || a.source.controllingBook;
    const claim = i.sourceClaims.find((c) => bn(c.book) === bn(sb));
    if (!claim || ![claim.descriptionPage, claim.statTablePage].some((pg) => pg === a.source.descriptionPage || pg === a.source.statTablePage)) fail(`${w} source book/page matches no Phase 3B source claim`);
    const cond = (a.conditionalSynergyTags || []).map((c) => c.tag);
    const fields = { sharedTags: a.sharedTags, advantageTags: a.advantageTags, tradeoffTags: a.tradeoffTags, finalTags: a.finalTags, 'conditionalSynergyTags[].tag': cond };
    for (const [f, vals] of Object.entries(fields)) {
      if (!Array.isArray(vals)) { fail(`${w} ${f} must be an array`); continue; }
      for (const t of vals) { if (!used.has(t)) fail(`${w} ${f} value "${t}" is not used by any certified feat/talent`); if (REJECT.includes(t)) fail(`${w} ${f} uses rejected runtime-only tag ${t}`); }
    }
    if (!same(a.sharedTags, SHARED)) fail(`${w} sharedTags must be exactly ${SHARED.join(', ')}`);
    if (!same(a.finalTags, [...a.sharedTags, ...a.advantageTags])) fail(`${w} finalTags must equal sharedTags plus advantageTags`);
    for (const t of a.tradeoffTags) { tradeUsed.add(t); if (a.finalTags.includes(t)) fail(`${w} tradeoff tag ${t} was promoted into finalTags`); if (a.advantageTags.includes(t)) fail(`${w} tag ${t} is both advantage and tradeoff`); }
    for (const c of a.conditionalSynergyTags || []) { if (a.finalTags.includes(c.tag)) fail(`${w} conditional tag ${c.tag} was promoted into finalTags`); if (!c.condition || !c.reason) fail(`${w} conditional tag ${c.tag} needs a condition and reason`); }
    if (new Set(a.finalTags).size !== a.finalTags.length) fail(`${w} duplicate finalTags`);
    for (const t of a.finalTags) { tagTotal++; tagsUsed.add(t); if (typeof a.rationale?.[t] !== 'string' || !a.rationale[t].trim()) fail(`${w} tag ${t} has no rationale`); }
    for (const t of Object.keys(a.rationale || {})) if (!a.finalTags.includes(t)) fail(`${w} rationale for ${t} has no tag`);
    const q = a.ruleSelectors;
    if (!q) fail(`${w} missing ruleSelectors`);
    else {
      if (q.exactIdentity !== `weapon:${a.identityKey}`) fail(`${w} exactIdentity must be weapon:${a.identityKey}`);
      selCheck(w, q, 'weapon-group:rifle', 'weapon-proficiency:rifles');
      for (const l of q.explicitAbilityLinks || []) {
        if (!['feat', 'talent', 'talent-family'].includes(l.abilityType) || !ENUM.test(l.relation || '') || !l.abilityName) fail(`${w} ability link shape (${l.abilityName})`);
        else if (l.abilityType !== 'talent-family' && !(l.abilityType === 'talent' ? talentNames : featNames).has(l.abilityName)) fail(`${w} ${l.abilityType} "${l.abilityName}" does not exist in the production ${l.abilityType} pack`);
      }
      for (const r of q.abilityRestrictions || []) if (!r.selector || !ENUM.test(r.relation || '') || !r.reason) fail(`${w} abilityRestriction shape`);
      for (const m of q.modeSelectors || []) { if (!m.mode) fail(`${w} modeSelector needs a mode`); selCheck(`${w} mode ${m.mode}`, m, m.weaponGroup, m.proficiency); }
      const selVals = [q.exactIdentity, q.weaponGroup, q.proficiency, ...q.families, ...(q.abilityRestrictions || []).map((r) => r.selector), ...(q.modeSelectors || []).flatMap((m) => [m.weaponGroup, m.proficiency, ...m.families])];
      const tagVals = [...a.sharedTags, ...a.advantageTags, ...a.tradeoffTags, ...a.finalTags, ...cond];
      if (tagVals.some((t) => selVals.includes(t) || /:/.test(t))) fail(`${w} a rule selector leaked into a semantic tag field`);
    }
    const c = a.relativeToStandardRifle, cs = i.canonicalStats;
    if (!c || !c.damage || !c.capacity || !c.stun || !c.range || !c.fireModes || !c.actionEconomy || !c.recommendationFit) fail(`${w} relativeToStandardRifle incomplete`);
    else {
      if (cs.baseDamage.mode === 'dice' && !String(c.damage.canonical).includes(cs.baseDamage.formula)) fail(`${w} comparison damage "${c.damage.canonical}" does not contain Phase 3B ${cs.baseDamage.formula}`);
      if (cs.baseDamage.mode === 'none') { const sf = cs.stun?.damage?.formula; if (!sf || !String(c.damage.canonical).includes(sf)) fail(`${w} stun-only comparison damage must carry the Phase 3B stun formula ${sf}`); }
      const am = cs.ammo || {}, sv = c.capacity.shots;
      if (typeof sv === 'number') { if (am.mode === 'single' && sv !== am.capacityShots) fail(`${w} comparison capacity ${sv} != Phase 3B ${am.capacityShots}`); }
      else if (Array.isArray(sv)) { if (am.mode === 'single' && !sv.includes(am.capacityShots)) fail(`${w} comparison capacities ${sv} do not include Phase 3B ${am.capacityShots}`); }
      else if (sv === null) { if (am.mode === 'single' && am.capacityShots !== null && am.status === 'established') fail(`${w} capacity is null although Phase 3B establishes ${am.capacityShots}`); }
      else if (typeof sv === 'string') { const caps = (am.profiles || []).map((pr) => pr.capacityShots); const nums = (sv.match(/\d+/g) || []).map(Number); if (am.mode !== 'multiple' || !nums.length || nums.some((n) => !caps.includes(n))) fail(`${w} multi-profile capacity "${sv}" must match the Phase 3B ammunition profiles (${caps})`); }
      else fail(`${w} capacity shots shape`);
      if (a.identityKey !== 'weapon-blaster-rifle' && c.damage.relation === 'BASELINE') fail(`${w} only the standard Blaster Rifle is BASELINE`);
    }
    for (const m of a.unrepresentedMechanics || []) if (!m.mechanic || !ENUM.test(m.representationStatus || '') || !m.note) fail(`${w} unrepresented mechanic shape`);
  });
  const base = asg.find((a) => a.identityKey === 'weapon-blaster-rifle');
  if (!base || base.tradeoffTags.length || base.relativeToStandardRifle.damage.canonical !== '3d8' || base.relativeToStandardRifle.capacity.shots !== 50 || base.relativeToStandardRifle.stun.canonical !== '2d8') fail('4D standard Blaster Rifle must remain the baseline (3d8 / 2d8 stun / 50 shots)');
  // named-ability exactness: Riflemaster only on its four printed cases, Sport Hunter only on the Sporting Blaster Rifle
  const RM = ['weapon-blaster-carbine', 'weapon-blaster-rifle', 'weapon-heavy-blaster-rifle', 'weapon-light-repeating-blaster'];
  for (const a of asg) {
    const links = a.ruleSelectors?.explicitAbilityLinks || [];
    if (links.some((l) => l.abilityName === 'Riflemaster') && !RM.includes(a.identityKey)) fail(`4D ${a.canonicalName} must not carry Riflemaster (exact printed cases only)`);
    if (links.some((l) => l.abilityName === 'Sport Hunter' && l.relation === 'EXPLICIT_WEAPON_BENEFIT') && !['weapon-sporting-blaster-rifle', 'weapon-slugthrower-rifle'].includes(a.identityKey)) fail(`4D ${a.canonicalName} must not carry an EXPLICIT Sport Hunter benefit (printed cases: Sporting Blaster Rifle, Slugthrower Rifle)`);
  }
  for (const k of RM) if (asg.some((a) => a.identityKey === k) && !asg.find((a) => a.identityKey === k).ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Riflemaster')) fail(`4D ${k} must carry its exact Riflemaster link`);
  const spo = asg.find((a) => a.identityKey === 'weapon-sporting-blaster-rifle');
  if (spo && !spo.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Sport Hunter')) fail('4D Sporting Blaster Rifle must carry its Sport Hunter link');
  const iws = asg.find((a) => a.identityKey === 'weapon-interchangeable-weapon-system');
  if (iws) { const aa = iws.ruleSelectors.modeSelectors?.find((m) => m.mode === 'anti-armor'); if (!aa || aa.weaponGroup !== 'weapon-group:heavy-weapon' || aa.proficiency !== 'weapon-proficiency:heavy-weapons' || iws.ruleSelectors.modeSelectors.filter((m) => m.weaponGroup === 'weapon-group:rifle').length !== 2) fail('4D Interchangeable Weapon System needs mode-specific selectors (rifle for blaster/sniper, Heavy Weapons for anti-armor)'); }
  // adjudicated set must be exactly the first N Phase 3B Rifle identities
  if (!same(asg.map((a) => a.identityKey).sort(), rif.slice(0, REQ).map((i) => i.identityKey).sort())) fail('4D adjudicated identities must be exactly the first N alphabetical Phase 3B Rifle identities');
  const rp = S.rollingProgress, thisN = rp.adjudicatedThisRound;
  if (rp.adjudicatedTotal !== REQ || rp.remaining !== 38 - REQ || rp.nextCanonicalName !== (rif[REQ] ? rif[REQ].canonicalName : null) || thisN < 1 || thisN > REQ) fail('4D rolling progress counts / next identity');
  else if (asg[REQ - thisN].canonicalName !== rp.firstCanonicalName || asg[REQ - 1].canonicalName !== rp.lastCanonicalName) fail('4D this-round first/last identity');
  const thisTags = asg.slice(REQ - thisN).reduce((m, a) => m + a.finalTags.length, 0);
  if (rp.totalFinalTagAssignmentsThisRound !== thisTags || rp.totalFinalTagAssignmentsCumulative !== tagTotal || rp.distinctFinalTagsUsedCumulative !== tagsUsed.size || !same([...tagsUsed].sort(), [...rp.finalTagsUsedCumulative].sort()) || !same([...tradeUsed].sort(), [...rp.tradeoffTagsUsedCumulative].sort())) fail('4D rolling progress tag counts');
  // earlier planner rulings are pinned (rounds 1-2 = the first 20 assignments)
  if (REQ >= 30 && sh(JSON.stringify(canon(asg.slice(0, 30)))) !== '0039dea39dd646a5dbdd8676ad468637620a1ce780c35024f42cd76eb13aa684') fail('4D rounds 1-3 planner rulings changed after adjudication');
  if (REQ >= 20 && sh(JSON.stringify(canon(asg.slice(0, 20)))) !== '75e2a19dfa46e3b2eafc486fedf5ff57ede0fe4065bcc5f7c5e03376cc4c92fb') fail('4D rounds 1-2 planner rulings changed after adjudication');
  if (REQ === 38) {
    if (rp.remaining !== 0 || rp.nextCanonicalName !== null || rp.categoryComplete !== true) fail('4D complete authority: categoryComplete, no next identity');
    if (tagTotal !== 213 || tagsUsed.size !== 35) fail('4D final totals must be 213 assignments and 35 distinct tags');
    if (asg.filter((a) => byKey.get(a.identityKey)?.repo.present).length !== 38) fail('4D all 38 Rifle identities must be repo-present');
    const sg = asg.find((a) => a.identityKey === 'weapon-slugthrower-rifle'), tb = asg.find((a) => /targeting/.test(a.identityKey) && a.canonicalName === 'Targeting Blaster Rifle');
    if (!sg || !sg.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Sport Hunter')) fail('4D Slugthrower Rifle must carry its Sport Hunter join');
    if (tb && tb.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Sport Hunter')) fail('4D Targeting Blaster Rifle must not be granted Sport Hunter from descriptive text');
    const sn = asg.find((a) => a.canonicalName === 'Snare Rifle');
    if (!sn || !['Pin', 'Trip'].every((n) => sn.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === n && !/PROHIBIT/.test(l.relation)))) fail('4D Snare Rifle must support Pin and Trip');
  }
  if (errors.length === e4d) console.log(`Phase 4D Rifle semantic tags OK: ${REQ}/38 adjudicated, ${tagTotal} assignments, ${tagsUsed.size} distinct tags, exact Riflemaster/Sport Hunter joins, mode-aware selectors, comparison data cross-checked against Phase 3B, next ${rp.nextCanonicalName}`);
}

// Phase 4E: Advanced Melee semantic tags + rule selectors + comparison data (rolling planner authority)
const P4E = 'data/audits/item-weapons-phase-4e-advanced-melee-semantic-rolling.json';
if (fs.existsSync(path.join(ROOT, P4E))) {
  const e4e = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
  const S = J(P4E);
  if (!fs.existsSync(path.join(ROOT, 'docs/audits/item-weapons-phase-4e-advanced-melee-semantic-rolling.md'))) fail('4E missing markdown companion');
  const ic = S.implementationContract || {};
  if (S.authorityOnly !== true || S.productionMutationAuthorized !== false || ic.productionMutationAuthorized !== false || ic.runtimeCodeMutationAuthorized !== false || ic.claudeMayCreateNewSemanticTags !== false || S.vocabularyPolicy?.weaponGroupIsSemanticTag !== false || S.vocabularyPolicy?.rawDamageCreatesSemanticTag !== false || S.vocabularyPolicy?.structuralSelectorsAreSemanticTags !== false) fail('4E authority-only / mutation / vocabulary flags');
  const b3 = J('data/audits/item-weapons-phase-3b-canonical-authority.json');
  if (J('data/audits/item-weapons-phase-3d-global-freeze.json').status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') fail('4E requires Phase 3D to remain frozen');
  if (sh(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8')) !== b3.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== b3.productionBaseline['template.json']) fail('4E production file changed (packs/weapons.db or template.json)');
  const used = new Set();
  for (const a of J('data/audits/feat-tags-pass2-semantic-authority.json').assignments) for (const t of a.finalTags || []) used.add(t);
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'finalTags' && Array.isArray(v)) v.forEach((t) => used.add(t)); else walk(v); } };
  walk(J('data/audits/talent-phase-12-1-semantic-tag-authority.json').batches);
  for (const a of J('data/audits/talent-phase-12-final-ontology-adjudication.json').assignments) for (const t of a.finalTags || []) used.add(t);
  if (used.size !== 183 || S.vocabularyPolicy.allowedSemanticTagCount !== 183) fail(`4E feat/talent-used vocabulary is ${used.size}, expected 183`);
  const REJECT = ['advanced_melee', 'thrown', 'condition_track', 'accuracy', 'area_damage', 'rifle', 'autofire', 'explosives', 'grenade', 'ion', 'sonic', 'aquatic'];
  const bl = S.baseline;
  if (bl.comparisonIdentityKey !== 'weapon-vibroblade' || bl.damage !== '2d6' || bl.stun !== 'none') fail('4E baseline Vibroblade policy changed');
  const adv = b3.identities.filter((i) => i.weaponGroup === 'Advanced Melee Weapon').sort((x, y) => (x.canonicalName.toLowerCase() < y.canonicalName.toLowerCase() ? -1 : 1));
  const advPresent = adv.filter((i) => i.repo.present), advMissing = adv.filter((i) => !i.repo.present);
  const cc = S.categoryCensus;
  if (adv.length !== 22 || cc.canonicalAdvancedMeleeIdentities !== 22 || advPresent.length !== cc.repoPresent || advMissing.length !== cc.repoMissing || !same(advPresent.map((i) => i.canonicalName).sort(), [...cc.repoPresentIdentities].sort()) || !same(advMissing.map((i) => i.canonicalName).sort(), [...cc.repoMissingIdentities].sort())) fail('4E Advanced Melee census must match the 22 Phase 3B identities (5 present / 17 missing)');
  if (!adv.find((i) => i.identityKey === bl.comparisonIdentityKey)?.repo.present) fail('4E baseline Vibroblade must be a repo-present Advanced Melee identity');
  const lines = (f) => new Set(fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).name));
  const talentNames = lines('packs/talents.db'), featNames = lines('packs/feats.db');
  const ENUM = /^[A-Z][A-Z0-9_]*$/;
  const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const asg = S.assignments, byKey = new Map(adv.map((i) => [i.identityKey, i])), seen = new Set();
  const REQ = asg.length; let tagTotal = 0; const tagsUsed = new Set();
  const bn = (b) => String(b).replace(/^The /, '');
  asg.forEach((a) => {
    const w = `4E ${a.canonicalName}`;
    const key = a.phase3BIdentityKey;
    if (seen.has(key)) fail(`${w} occurs more than once`); seen.add(key);
    const i = byKey.get(key);
    if (!i) { fail(`${w} (${key}) is not a Phase 3B Advanced Melee identity`); return; }
    if (i.canonicalName !== a.canonicalName) fail(`${w} name differs from Phase 3B (${i.canonicalName})`);
    if (a.repo.present !== i.repo.present || (a.repo.id || null) !== (i.repo.id || null)) fail(`${w} repo mapping differs from Phase 3B`);
    const claim = i.sourceClaims.find((c) => bn(c.book) === bn(a.source.book));
    if (!claim || ![claim.descriptionPage, claim.statTablePage].some((pg) => pg === a.source.descriptionPage || pg === a.source.statTablePage)) fail(`${w} source book/page matches no Phase 3B source claim`);
    const fields = { sharedTags: a.sharedTags, advantageTags: a.advantageTags, tradeoffTags: a.tradeoffTags, finalTags: a.finalTags };
    for (const [f, vals] of Object.entries(fields)) {
      if (!Array.isArray(vals)) { fail(`${w} ${f} must be an array`); continue; }
      for (const t of vals) { if (!used.has(t)) fail(`${w} ${f} value "${t}" is not used by any certified feat/talent`); if (REJECT.includes(t)) fail(`${w} ${f} uses rejected tag ${t}`); }
    }
    if (!a.sharedTags.includes('melee') || a.sharedTags.some((t) => !['melee', 'offense_melee'].includes(t))) fail(`${w} sharedTags must be melee (+ offense_melee)`);
    if (!same(a.finalTags, [...a.sharedTags, ...a.advantageTags])) fail(`${w} finalTags must equal sharedTags plus advantageTags`);
    if (!a.finalTags.includes('melee') || !a.finalTags.includes('offense_melee')) fail(`${w} every Advanced Melee weapon carries melee and offense_melee`);
    for (const t of a.tradeoffTags) { if (a.finalTags.includes(t)) fail(`${w} tradeoff tag ${t} was promoted into finalTags`); if (a.advantageTags.includes(t)) fail(`${w} tag ${t} is both advantage and tradeoff`); }
    if (new Set(a.finalTags).size !== a.finalTags.length) fail(`${w} duplicate finalTags`);
    for (const t of a.finalTags) { tagTotal++; tagsUsed.add(t); if (typeof a.rationale?.[t] !== 'string' || !a.rationale[t].trim()) fail(`${w} tag ${t} has no rationale`); }
    for (const t of Object.keys(a.rationale || {})) if (!a.finalTags.includes(t)) fail(`${w} rationale for ${t} has no tag`);
    const q = a.ruleSelectors;
    if (!q) fail(`${w} missing ruleSelectors`);
    else {
      if (q.exactCanonicalSelector !== `canonical-weapon:${slug(a.canonicalName)}`) fail(`${w} exactCanonicalSelector must be canonical-weapon:${slug(a.canonicalName)}`);
      if (q.phase3BIdentityKey !== key || (q.repoIdentityKey || null) !== (i.repo.id || null)) fail(`${w} selector identity / repo keys must match Phase 3B (repoIdentityKey is null for missing production records)`);
      if (q.weaponGroup !== 'weapon-group:advanced-melee' || q.proficiency !== 'weapon-proficiency:advanced-melee') fail(`${w} must retain weapon-group:advanced-melee and weapon-proficiency:advanced-melee`);
      if (!Array.isArray(q.families) || !q.families.length || q.families.some((f) => !/^weapon-family:[a-z0-9-]+$/.test(f))) fail(`${w} families malformed`);
      for (const l of q.explicitAbilityLinks || []) {
        if (!['feat', 'talent', 'talent-family'].includes(l.abilityType) || !ENUM.test(l.relation || '') || !l.abilityName) fail(`${w} ability link shape (${l.abilityName})`);
        else if (l.abilityType !== 'talent-family' && !(l.abilityType === 'talent' ? talentNames : featNames).has(l.abilityName)) fail(`${w} ${l.abilityType} "${l.abilityName}" does not exist in the production ${l.abilityType} pack`);
      }
      for (const p of q.profileSelectors || []) if (!p.profile) fail(`${w} profileSelector needs a profile`);
      const selVals = [q.exactCanonicalSelector, q.weaponGroup, q.proficiency, ...q.families, ...(q.profileSelectors || []).flatMap((p) => [p.proficiency, ...(p.families || [])].filter(Boolean))];
      if ([...a.sharedTags, ...a.advantageTags, ...a.tradeoffTags, ...a.finalTags].some((t) => selVals.includes(t) || /:/.test(t))) fail(`${w} a rule selector leaked into a semantic tag field`);
    }
    const c = a.relativeToVibroblade, cs = i.canonicalStats;
    if (!c || !c.damage || !c.stun || !c.hands || !c.doubleWeapon || !c.rangedProfile || !c.recommendationFit) fail(`${w} relativeToVibroblade incomplete`);
    else {
      if (cs.baseDamage.mode === 'dice' && !String(c.damage.canonical).includes(cs.baseDamage.formula)) fail(`${w} comparison damage "${c.damage.canonical}" does not contain Phase 3B ${cs.baseDamage.formula}`);
      if (cs.baseDamage.mode === 'none') { const sf = cs.stun?.damage?.formula; if (!sf || !String(c.damage.canonical).includes(sf)) fail(`${w} stun-only comparison damage must carry the Phase 3B stun formula ${sf}`); }
      if (c.stun.available !== (cs.stun.capability !== 'none')) fail(`${w} stun availability differs from Phase 3B`);
      if (!!c.doubleWeapon.available !== !!i.qualities?.doubleWeapon) fail(`${w} double-weapon availability differs from Phase 3B`);
      if (!!c.rangedProfile.available !== (cs.attackProfiles || []).some((p) => p.schemaFamily?.branch === 'ranged')) fail(`${w} ranged-profile availability differs from Phase 3B attack profiles`);
    }
    for (const m of a.unrepresentedMechanics || []) if (!m.mechanic || !ENUM.test(m.representationStatus || '') || !m.note) fail(`${w} unrepresented mechanic shape`);
  });
  const bs = asg.find((a) => a.phase3BIdentityKey === 'weapon-vibroblade');
  if (bs && (bs.tradeoffTags.length || bs.relativeToVibroblade.damage.canonical !== '2d6' || bs.relativeToVibroblade.stun.available)) fail('4E Vibroblade must remain the plain baseline');
  const need = (name, keyName, test, msg) => { const a = asg.find((x) => x.canonicalName === name); if (a && !test(a)) fail(`4E ${name}: ${msg}`); };
  need('San-Ni Staff', 'block', (a) => a.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Block' && l.relation === 'EXPLICIT_WEAPON_COMPATIBILITY') && a.ruleSelectors.weaponGroup === 'weapon-group:advanced-melee' && !a.ruleSelectors.families.some((f) => /lightsaber/.test(f)), 'Block compatibility must be an explicit link and must not make it a lightsaber');
  need('Power Hammer', 'pa', (a) => ['Double Attack', 'Triple Attack', 'Rapid Strike'].every((n) => a.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === n && l.relation === 'EXTRA_ATTACK_PENALTY')) && a.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Power Attack' && l.relation === 'EXPLICIT_WEAPON_BENEFIT') && !a.finalTags.includes('damage_bonus'), 'Power Attack join, the three -2 penalties, and no intrinsic damage_bonus');
  need('Energy Lance', 'profiles', (a) => a.ruleSelectors.profileSelectors?.some((p) => p.profile === 'plasma-bolt' && p.proficiency === 'weapon-proficiency:rifles') && a.ruleSelectors.profileSelectors.some((p) => p.profile === 'melee' && p.proficiency === 'weapon-proficiency:advanced-melee'), 'melee profile uses Advanced Melee, plasma profile uses Rifles');
  need('Electropole', 'gungan', (a) => a.ruleSelectors.profileSelectors?.some((p) => p.profile === 'gungan-alternate-proficiency'), 'Gungan alternate proficiency stays a structural selector');
  need('Shock Stick', 'bayonet', (a) => a.ruleSelectors.profileSelectors?.some((p) => p.profile === 'mounted-bayonet') && a.ruleSelectors.proficiency === 'weapon-proficiency:advanced-melee', 'bayonet proficiency waiver is configuration-specific');
  if (!same(asg.map((a) => a.phase3BIdentityKey).sort(), adv.slice(0, REQ).map((i) => i.identityKey).sort())) fail('4E adjudicated identities must be exactly the first N alphabetical Phase 3B Advanced Melee identities');
  const rp = S.rollingProgress, thisN = rp.adjudicatedThisRound;
  if (rp.adjudicatedTotal !== REQ || rp.remaining !== 22 - REQ || rp.nextCanonicalName !== (adv[REQ] ? adv[REQ].canonicalName : null) || thisN < 1 || thisN > REQ) fail('4E rolling progress counts / next identity');
  else if (asg[REQ - thisN].canonicalName !== rp.firstCanonicalName || asg[REQ - 1].canonicalName !== rp.lastCanonicalName) fail('4E this-round first/last identity');
  const slice = asg.slice(Math.max(0, REQ - thisN)), sliceTags = new Set(slice.flatMap((a) => a.finalTags));
  if (rp.totalFinalTagAssignmentsThisRound !== slice.reduce((m, a) => m + a.finalTags.length, 0) || rp.distinctFinalTagsUsedThisRound !== sliceTags.size || !same([...sliceTags].sort(), [...rp.finalTagsUsedThisRound].sort())) fail('4E rolling progress tag counts');
  if (REQ >= 10 && sh(JSON.stringify(canon(asg.slice(0, 10)))) !== '9159f3758e098bf5614ed457a590db5a6b556c600dbf8c6c239cc72eccb6743b') fail('4E round 1 planner rulings changed after adjudication');
  if (REQ === 22) {
    // Advanced Melee category complete: exact totals and the named completion rulings
    if (rp.categoryComplete !== true || rp.remaining !== 0 || rp.nextCanonicalName !== null || S.status !== 'WEAPON_TAG_PHASE_4E_ADVANCED_MELEE_COMPLETE_PLANNER_AUTHORITY') fail('4E complete authority: status, categoryComplete, no next identity');
    if (tagTotal !== 109 || tagsUsed.size !== 28 || rp.totalFinalTagAssignmentsCumulative !== tagTotal || rp.distinctFinalTagsUsedCumulative !== tagsUsed.size) fail('4E final totals must be 109 assignments and 28 distinct tags');
    if (asg.filter((a) => a.repo.present).length !== 5 || asg.filter((a) => !a.repo.present).length !== 17 || asg.some((a) => !a.repo.present && ((a.repo.id || null) !== null || a.ruleSelectors.repoIdentityKey !== null))) fail('4E 17 missing identities must stay explicit with no repo id (no production records invented)');
    const aby = (n) => asg.find((a) => a.canonicalName === n);
    const sw = aby('Shock Whip'), vk = aby('Vibroknucklers'), vr = aby('Vibrorapier'), vb = aby('Vibrobayonet'), dv = aby('Double Vibroblade'), vd = aby('Vibroblade, Double'), ss = aby('Shockstaff'), vi = aby('Vibrodagger');
    if (!sw?.ruleSelectors.explicitAbilityLinks.some((l) => l.abilityName === 'Trip' && featNames.has('Trip'))) fail('4E Shock Whip must link the Trip feat');
    if (!vk || !['unarmed', 'martial_arts', 'damage_bonus'].every((t) => vk.finalTags.includes(t))) fail('4E Vibroknucklers must bridge unarmed / Martial Arts builds');
    if (!vr || !['stealth', 'infiltration'].every((t) => vr.finalTags.includes(t))) fail('4E Vibrorapier must carry its silent-operation stealth/infiltration role');
    if (!vb || !vb.finalTags.includes('attack_of_opportunity')) fail('4E Vibrobayonet must preserve attack-of-opportunity threat');
    if (!dv || !vd || dv.phase3BIdentityKey === vd.phase3BIdentityKey) fail('4E the two published Double Vibroblade identities must stay distinct');
    if (vi && (vi.finalTags.includes('concealment') || vi.finalTags.includes('stealth'))) fail('4E Vibrodagger must not gain concealment/stealth from size alone');
    if (ss && /DR\s*\d+/i.test(JSON.stringify(ss.relativeToVibroblade) + ss.canonicalMechanicSummary)) fail('4E Shockstaff must not invent a numeric DR value');
    if (sh(JSON.stringify(canon(asg))) !== '6bfb8e16349d883554dc90271d9a62703083c37ad57a02846e6a5f27099c3066') fail('4E complete planner authority changed after adjudication');
  }
  if (errors.length === e4e) console.log(`Phase 4E Advanced Melee semantic tags OK: ${REQ}/22 adjudicated (${asg.filter((a) => a.repo.present).length} repo-present / ${asg.filter((a) => !a.repo.present).length} repo-missing), ${tagTotal} assignments, ${tagsUsed.size} distinct tags, selectors + comparison data cross-checked against Phase 3B, baseline = Vibroblade, next ${rp.nextCanonicalName}`);
}

// Phase 4F: Heavy Weapons semantic tags + rule selectors (planner authority; payload- and mode-aware)
const P4F = 'data/audits/item-weapons-phase-4f-heavy-semantic-rolling.json';
if (fs.existsSync(path.join(ROOT, P4F))) {
  const e4f = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  const S = J(P4F);
  if (!fs.existsSync(path.join(ROOT, 'docs/audits/item-weapons-phase-4f-heavy-semantic-rolling.md'))) fail('4F missing markdown companion');
  const ic = S.implementationContract || {};
  if (S.authorityOnly !== true || S.productionMutationAuthorized !== false || ic.productionMutationAuthorized !== false || S.completionCertification?.productionMutationAuthorized !== false) fail('4F authority-only / mutation flags');
  const b3 = J('data/audits/item-weapons-phase-3b-canonical-authority.json');
  if (J('data/audits/item-weapons-phase-3d-global-freeze.json').status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') fail('4F requires Phase 3D to remain frozen');
  if (sh(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8')) !== b3.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== b3.productionBaseline['template.json']) fail('4F production file changed (packs/weapons.db or template.json)');
  const used = new Set();
  for (const a of J('data/audits/feat-tags-pass2-semantic-authority.json').assignments) for (const t of a.finalTags || []) used.add(t);
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'finalTags' && Array.isArray(v)) v.forEach((t) => used.add(t)); else walk(v); } };
  walk(J('data/audits/talent-phase-12-1-semantic-tag-authority.json').batches);
  for (const a of J('data/audits/talent-phase-12-final-ontology-adjudication.json').assignments) for (const t of a.finalTags || []) used.add(t);
  if (used.size !== 183) fail(`4F feat/talent-used vocabulary is ${used.size}, expected 183`);
  const REJECT = ['grenade', 'explosives', 'area_damage', 'accuracy', 'autofire', 'rifle', 'thrown', 'condition_track', 'telekinesis', 'teamwork_crew'];
  // Heavy Weapons proficiency surface: Phase 3B groups Heavy Weapon (15) + Heavy Weapon (Ammunition) + the Rifle (Special) hybrid
  const surface = b3.identities.filter((i) => i.weaponGroup === 'Heavy Weapon' || i.weaponGroup === 'Heavy Weapon (Ammunition)' || i.identityKey === 'weapon-interchangeable-weapon-system');
  const primary = surface.filter((i) => i.weaponGroup === 'Heavy Weapon');
  const sc = S.scope;
  if (surface.length !== 17 || primary.length !== 15 || sc.totalHeavyProficiencySurface !== 17 || sc.primaryHeavyWeaponGroupIdentities !== 15 || sc.heavyProficiencyAdjunctIdentities !== 2 || !same([...sc.adjunctIdentities].sort(), ['Electronet', 'Interchangeable Weapon System']) || surface.filter((i) => i.repo.present).length !== sc.repoPresent || sc.repoMissing !== 0) fail('4F Heavy Weapons surface must match Phase 3B (15 primary + 2 adjunct = 17, all repo-present)');
  const lines = (f) => new Set(fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).name));
  const talentNames = lines('packs/talents.db'), featNames = lines('packs/feats.db');
  const ENUM = /^[A-Z][A-Z0-9_]*$/;
  const asg = S.assignments, byKey = new Map(surface.map((i) => [i.identityKey, i])), seen = new Set();
  let tagTotal = 0, condTotal = 0; const tagsUsed = new Set();
  const bn = (b) => String(b).replace(/^The /, '');
  const HYBRID = 'weapon-interchangeable-weapon-system';
  asg.forEach((a) => {
    const w = `4F ${a.canonicalName}`;
    if (seen.has(a.identityKey)) fail(`${w} occurs more than once`); seen.add(a.identityKey);
    const i = byKey.get(a.identityKey);
    if (!i) { fail(`${w} (${a.identityKey}) is not a Phase 3B Heavy Weapons proficiency identity`); return; }
    if (i.canonicalName !== a.canonicalName) fail(`${w} name differs from Phase 3B (${i.canonicalName})`);
    const claim = i.sourceClaims.find((c) => bn(c.book) === bn(a.source.book));
    if (!claim || ![claim.descriptionPage, claim.statTablePage].some((pg) => pg !== null && (pg === a.source.descriptionPage || pg === a.source.statTablePage))) fail(`${w} source book/page matches no Phase 3B source claim`);
    const cond = (a.conditionalSemanticTags || []);
    for (const [f, vals] of Object.entries({ finalTags: a.finalTags, tradeoffTags: a.tradeoffTags, 'conditionalSemanticTags[].tag': cond.map((c) => c.tag) })) {
      if (!Array.isArray(vals)) { fail(`${w} ${f} must be an array`); continue; }
      for (const t of vals) { if (!used.has(t)) fail(`${w} ${f} value "${t}" is not used by any certified feat/talent`); if (REJECT.includes(t)) fail(`${w} ${f} uses rejected tag ${t}`); }
    }
    if (new Set(a.finalTags).size !== a.finalTags.length) fail(`${w} duplicate finalTags`);
    for (const t of a.tradeoffTags) if (a.finalTags.includes(t)) fail(`${w} tradeoff tag ${t} was promoted into finalTags`);
    for (const c of cond) { if (a.finalTags.includes(c.tag)) fail(`${w} conditional tag ${c.tag} was promoted into finalTags`); if (!c.condition || !c.reason) fail(`${w} conditional tag needs a condition and reason`); condTotal++; }
    if (!a.finalTags.includes('ranged') && a.identityKey !== HYBRID) fail(`${w} must carry ranged`);
    a.finalTags.forEach((t) => { tagTotal++; tagsUsed.add(t); });
    // rationale is optional in the compact shape; when present it must be in exact parity with finalTags
    if (a.rationale) {
      for (const t of a.finalTags) if (typeof a.rationale[t] !== 'string' || !a.rationale[t].trim()) fail(`${w} tag ${t} has no rationale`);
      for (const t of Object.keys(a.rationale)) if (!a.finalTags.includes(t)) fail(`${w} rationale for ${t} has no tag`);
    }
    // heavy_weapon semantics: global for Heavy Weapon group, payload-contextual for ammunition, conditional (anti-armor) for the hybrid
    if (a.identityKey === HYBRID) {
      if (a.finalTags.includes('heavy_weapon') || !cond.some((c) => c.tag === 'heavy_weapon' && /anti-armor/.test(c.condition))) fail(`${w} heavy_weapon must be conditional on anti-armor mode only`);
    } else if (!a.finalTags.includes('heavy_weapon')) fail(`${w} must carry heavy_weapon`);
    const q = a.ruleSelectors;
    if (!q) fail(`${w} missing ruleSelectors`);
    else {
      if (q.exactIdentity !== `weapon:${a.identityKey}`) fail(`${w} exactIdentity must be weapon:${a.identityKey}`);
      const wantG = a.identityKey === HYBRID ? ['weapon-group:rifle', 'weapon-proficiency:rifles'] : ['weapon-group:heavy-weapon', 'weapon-proficiency:heavy-weapons'];
      if (q.weaponGroup !== wantG[0] || q.proficiency !== wantG[1]) fail(`${w} selector group/proficiency must be ${wantG.join(' / ')}`);
      if (!Array.isArray(q.families) || !q.families.length || q.families.some((f) => !/^weapon-family:[a-z0-9-]+$/.test(f))) fail(`${w} families malformed`);
      for (const l of q.explicitAbilityLinks || []) {
        if (!['feat', 'talent', 'talent-family'].includes(l.abilityType) || !ENUM.test(l.relation || '') || !l.abilityName) fail(`${w} ability link shape (${l.abilityName})`);
        else if (l.abilityType !== 'talent-family' && !(l.abilityType === 'talent' ? talentNames : featNames).has(l.abilityName)) fail(`${w} ${l.abilityType} "${l.abilityName}" does not exist in the production pack`);
      }
      for (const m of q.modeSelectors || []) if (!m.mode) fail(`${w} modeSelector needs a mode`);
      const selVals = [q.exactIdentity, q.weaponGroup, q.proficiency, ...q.families, ...(q.modeSelectors || []).flatMap((m) => [m.weaponGroup, m.proficiency, ...(m.families || [])].filter(Boolean))];
      if ([...a.finalTags, ...a.tradeoffTags, ...cond.map((c) => c.tag)].some((t) => selVals.includes(t) || /:/.test(t))) fail(`${w} a rule selector leaked into a semantic tag field`);
    }
    // optional comparison data cross-checked against Phase 3B
    const c = a.relativeToBlasterCannon, am = i.canonicalStats.ammo || {};
    if (c) {
      const sv = c.capacity?.shots;
      if (typeof sv === 'number' && am.mode === 'single' && sv !== am.capacityShots) fail(`${w} comparison capacity ${sv} != Phase 3B ${am.capacityShots}`);
      if (sv === null && am.mode === 'single' && am.status === 'established' && am.capacityShots !== null) fail(`${w} capacity is null although Phase 3B establishes ${am.capacityShots}`);
    }
    for (const m of a.unrepresentedMechanics || []) if (typeof m !== 'string' && (!m.mechanic || !ENUM.test(m.representationStatus || '') || !m.note)) fail(`${w} unrepresented mechanic shape`);
  });
  // named rulings
  const by = (k) => asg.find((a) => a.identityKey === k);
  const bc = by('weapon-blaster-cannon');
  if (!bc || !same(bc.finalTags, ['heavy_weapon', 'ranged', 'offense_ranged', 'burst_damage']) || bc.tradeoffTags.length) fail('4F Blaster Cannon must remain the Heavy Weapon baseline');
  if (S.baseline.comparisonIdentityKey !== 'weapon-blaster-cannon') fail('4F baseline identity changed');
  const el = by('weapon-electronet');
  if (el && (el.ruleSelectors.weaponGroup !== 'weapon-group:heavy-weapon' || !el.ruleSelectors.families.includes('weapon-family:grenade-launcher-ammunition'))) fail('4F Electronet is Heavy Weapon ammunition for a grenade launcher');
  const gl = by('weapon-grenade-launcher');
  if (gl && gl.finalTags.some((t) => ['stun', 'nonlethal', 'control', 'grab', 'restrain'].includes(t))) fail('4F Grenade Launcher must inherit payload semantics dynamically, not statically');
  const mo = by('weapon-mortar-launcher');
  if (mo && !['cover', 'positioning'].every((t) => mo.finalTags.includes(t))) fail('4F Mortar Launcher must carry cover + positioning');
  const tb = by('weapon-tactical-tractor-beam');
  if (tb && (tb.finalTags.includes('telekinesis') || !['grab', 'control', 'positioning'].every((t) => tb.finalTags.includes(t)))) fail('4F Tactical Tractor Beam is technological grab/control, not telekinesis');
  if (!same(asg.map((a) => a.identityKey).sort(), surface.map((i) => i.identityKey).sort())) fail('4F must adjudicate exactly the 17 Heavy Weapons proficiency identities');
  // progress counters
  const rp = S.rollingProgress;
  if (rp.adjudicatedTotal !== asg.length || rp.remaining !== 17 - asg.length || rp.categoryComplete !== (asg.length === 17) || rp.totalFinalTagAssignmentsCumulative !== tagTotal || rp.conditionalSemanticTagAssignmentsCumulative !== condTotal) fail('4F rolling progress counts');
  const cumTags = new Set([...tagsUsed, ...asg.flatMap((a) => (a.conditionalSemanticTags || []).map((c) => c.tag))]);
  if (rp.distinctSemanticTagsUsedCumulative !== cumTags.size || !same([...cumTags].sort(), [...rp.semanticTagsUsedCumulative].sort())) fail('4F distinct semantic tag counts');
  if (asg.length === 17 && (tagTotal !== 105 || condTotal !== 1 || cumTags.size !== 25 || S.status !== 'WEAPON_TAG_PHASE_4F_HEAVY_COMPLETE_PLANNER_AUTHORITY')) fail('4F final totals must be 105 final-tag assignments, 1 conditional assignment and 25 distinct tags');
  if (errors.length === e4f) console.log(`Phase 4F Heavy Weapons semantic tags OK: ${asg.length}/17 adjudicated (15 primary + 2 adjunct), ${tagTotal} assignments + ${condTotal} conditional, ${cumTags.size} distinct tags, payload-/mode-aware heavy_weapon semantics, selectors cross-checked against Phase 3B`);
}

// ---- Phase 4G Exotic census (scope freeze only; no semantic rulings) ----
const P4G = 'data/audits/item-weapons-phase-4g-exotic-census.json';
if (fs.existsSync(path.join(ROOT, P4G))) {
  const e4g = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  const C = J(P4G);
  if (!fs.existsSync(path.join(ROOT, 'docs/audits/item-weapons-phase-4g-exotic-census.md'))) fail('4G missing markdown companion');
  if (C.status !== 'WEAPON_TAG_PHASE_4G_EXOTIC_CENSUS_FROZEN' || C.authorityOnly !== true || C.semanticAdjudicationStarted !== false || C.productionMutationAuthorized !== false) fail('4G census status / authority-only flags');
  const b3 = J('data/audits/item-weapons-phase-3b-canonical-authority.json');
  if (J('data/audits/item-weapons-phase-3d-global-freeze.json').status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') fail('4G requires Phase 3D to remain frozen');
  if (sh(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8')) !== b3.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== b3.productionBaseline['template.json']) fail('4G production file changed (packs/weapons.db or template.json)');
  const surface = b3.identities.filter((i) => i.weaponGroup === 'Exotic Weapon');
  const ids = C.identities || [];
  if (!same(ids.map((i) => i.identityKey).sort(), surface.map((i) => i.identityKey).sort())) fail('4G census must equal the Phase 3B Exotic Weapon group exactly');
  if (new Set(ids.map((i) => i.identityKey)).size !== ids.length) fail('4G duplicate census identity');
  const cnt = (f) => ids.filter(f).length;
  const want = { canonicalExoticProficiencyIdentities: ids.length, repoPresent: cnt((i) => i.repo?.present === true), repoMissing: cnt((i) => i.repo?.present === false), meleeProfileIdentities: cnt((i) => i.profileKind === 'melee'), rangedProfileIdentities: cnt((i) => i.profileKind === 'ranged'), hybridProfileIdentities: cnt((i) => i.profileKind === 'hybrid'), identitiesWithAlternateProficiencyOrHandling: cnt((i) => i.alternateProficiencyOrHandling) };
  for (const [k, v] of Object.entries(want)) if (C.counts[k] !== v) fail(`4G count ${k} ${C.counts[k]} != recomputed ${v}`);
  if (ids.length !== 32 || want.repoPresent !== 18 || want.repoMissing !== 14 || want.meleeProfileIdentities !== 15 || want.rangedProfileIdentities !== 15 || want.hybridProfileIdentities !== 2 || want.identitiesWithAlternateProficiencyOrHandling !== 10 || C.counts.separatePayloadAdjunctIdentities !== 0) fail('4G frozen census totals changed (32 / 18+14 / 15+15+2 / 10 after the 4H-A4 Tehk\'la correction / 0)');
  if (!(C.phase4hAmendments || []).some((x) => x.id === '4H-A4') || !/Nagai/.test(ids.find((i) => i.identityKey === 'unmapped::Tehkla Blade')?.alternateProficiencyOrHandling || '')) fail('4G census must carry the explicit 4H-A4 Tehk\'la/Nagai amendment');
  const ph = new Set(b3.identities.map((i) => i.identityKey));
  for (const i of ids) { if (i.assignments || i.finalTags || i.ruleSelectors) fail(`4G ${i.canonicalName} carries semantic rulings (census is scope-only)`); if (!ph.has(i.identityKey)) fail(`4G ${i.identityKey} not in Phase 3B`); }
  if (errors.length === e4g) console.log(`Phase 4G Exotic census OK: ${ids.length} identities (${want.repoPresent} present / ${want.repoMissing} missing; ${want.meleeProfileIdentities} melee / ${want.rangedProfileIdentities} ranged / ${want.hybridProfileIdentities} hybrid), ${want.identitiesWithAlternateProficiencyOrHandling} alternate-proficiency cases, no semantic rulings, matches Phase 3B Exotic Weapon group`);
}

// ---- Phase 4G Exotic semantic rolling authority (planner-owned tags; verified only) ----
const P4GR = 'data/audits/item-weapons-phase-4g-exotic-semantic-rolling.json';
if (fs.existsSync(path.join(ROOT, P4GR))) {
  const e4r = errors.length;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const sh = (t) => crypto.createHash('sha256').update(t).digest('hex');
  const S = J(P4GR), C = J('data/audits/item-weapons-phase-4g-exotic-census.json'), b3 = J('data/audits/item-weapons-phase-3b-canonical-authority.json');
  if (!fs.existsSync(path.join(ROOT, 'docs/audits/item-weapons-phase-4g-exotic-semantic-rolling.md'))) fail('4G rolling missing markdown companion');
  if (S.productionMutationAuthorized !== false || S.repositoryImplementationCertified !== false) fail('4G rolling authority-only flags');
  if (sh(fs.readFileSync(path.join(ROOT, 'packs/weapons.db'), 'utf8')) !== b3.productionBaseline['packs/weapons.db'] || sh(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')) !== b3.productionBaseline['template.json']) fail('4G rolling production file changed');
  const used = new Set();
  for (const a of J('data/audits/feat-tags-pass2-semantic-authority.json').assignments) for (const t of a.finalTags || []) used.add(t);
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'finalTags' && Array.isArray(v)) v.forEach((t) => used.add(t)); else walk(v); } };
  walk(J('data/audits/talent-phase-12-1-semantic-tag-authority.json').batches);
  for (const a of J('data/audits/talent-phase-12-final-ontology-adjudication.json').assignments) for (const t of a.finalTags || []) used.add(t);
  if (used.size !== 183) fail(`4G feat/talent vocabulary is ${used.size}, expected 183`);
  const REJECT = ['grenade', 'explosives', 'area_damage', 'accuracy', 'autofire', 'rifle', 'thrown', 'reach', 'pistol', 'finesse', 'condition_track', 'ion', 'sonic', 'telekinesis', 'teamwork_crew'];
  const lines = (f) => new Set(fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).name));
  const abilityNames = new Set([...lines('packs/feats.db'), ...lines('packs/talents.db')]);
  const ENUM = /^[A-Z][A-Z0-9_]*$/;
  const cen = C.identities, byKey = new Map(b3.identities.map((i) => [i.identityKey, i]));
  const asg = S.assignments, N = asg.length;
  if (!same(asg.map((a) => a.identityKey), cen.slice(0, N).map((i) => i.identityKey))) fail('4G rolling must adjudicate the census in order, without gaps');
  let tagTotal = 0; const tagsUsed = new Set(); const gap4g = [], caseFix4g = [];
  asg.forEach((a, idx) => {
    const w = a.canonicalName, c = cen[idx];
    if (a.index !== idx + 1) fail(`4G ${w} index`);
    if (!c || a.identityKey !== c.identityKey || String(a.canonicalName).replace(/'/g, '') !== c.canonicalName || a.repo?.present !== c.repo.present || a.repo?.id !== c.repo.id || !same({ ...a.source, book: String(a.source?.book).replace(/^The /, '') }, { ...c.source, book: String(c.source?.book).replace(/^The /, '') })) fail(`4G ${w} identity/repo/source differs from the frozen census`);
    const i = byKey.get(a.identityKey);
    if (!i || i.weaponGroup !== 'Exotic Weapon') fail(`4G ${w} is not an Exotic Weapon identity in Phase 3B`);
    if (!same([...a.finalTags].sort(), [...new Set([...a.sharedTags, ...a.advantageTags])].sort())) fail(`4G ${w} finalTags must equal sharedTags + advantageTags (as a set)`);
    if (new Set(a.finalTags).size !== a.finalTags.length) fail(`4G ${w} duplicate tags`);
    if (a.identityKey === 'weapon-siang-lance') {
      const cx = (a.conditionalSynergyTags || []).filter((x) => x.tag === 'exotic_weapon');
      if (a.finalTags.includes('exotic_weapon') || cx.length !== 1 || !/ranged lance profile/.test(cx[0].condition)) fail('4G Siang Lance: exotic_weapon must be conditional on the ranged lance profile only (bayonet is Simple)');
    } else if (!a.finalTags.includes('exotic_weapon') || !a.sharedTags.includes('exotic_weapon')) fail(`4G ${w} must carry exotic_weapon (unconditional ruling)`);
    if (a.tradeoffTags.some((t) => a.finalTags.includes(t))) fail(`4G ${w} tradeoff tag promoted to final`);
    for (const ct of a.conditionalSynergyTags || []) if (!ct.tag || !ct.condition || !ct.reason || a.finalTags.includes(ct.tag)) fail(`4G ${w} conditional tag shape / promoted into finalTags (${ct.tag})`);
    if (a.finalTags.includes('dual_wield') && a.identityKey === 'unmapped::Darkstick') fail('4G Darkstick must not carry dual_wield (multiple darksticks count as one weapon)');
    for (const t of [...a.finalTags, ...a.tradeoffTags, ...(a.conditionalSynergyTags || []).map((x) => x.tag || x)]) {
      if (!used.has(t)) fail(`4G ${w} tag "${t}" is not in the certified feat/talent vocabulary`);
      if (REJECT.includes(t) || /[:\s]/.test(t)) fail(`4G ${w} rejected/structural tag "${t}"`);
    }
    a.finalTags.forEach((t) => tagsUsed.add(t)); tagTotal += a.finalTags.length;
    const q = a.ruleSelectors;
    if (!q) { fail(`4G ${w} missing ruleSelectors`); return; }
    if (!same(q.exact, [`weapon:${a.identityKey}`])) fail(`4G ${w} exact selector`);
    if (!same(q.group, ['weapon-group:exotic'])) fail(`4G ${w} group selector`);
    if (!q.proficiency?.length || q.proficiency.some((x) => !/^weapon-proficiency:[a-z0-9-]+$/.test(x))) fail(`4G ${w} proficiency selector`);
    if (!q.families?.length || q.families.some((x) => !/^weapon-family:[a-z0-9-]+$/.test(x))) fail(`4G ${w} families malformed`);
    for (const m of q.modes || []) if (!m.mode || !m.attackProfile) fail(`4G ${w} mode shape`);
    for (const l of q.explicitAbilityInteractions || []) {
      if (!ENUM.test(l.interaction || '')) fail(`4G ${w} ability interaction enum (${l.ability})`);
      else if (!abilityNames.has(l.ability)) fail(`4G ${w} ability interaction "${l.ability}" is not an exact canonical ability name`);
    }
    if (!a.proficiencyRoutes?.canonical?.length || !a.recommendation?.fit || !a.recommendation.eligibleWithoutPenaltyWhen?.length) fail(`4G ${w} proficiency/recommendation shape`);
    const hasAlt = a.proficiencyRoutes.alternate.length > 0;
    if (hasAlt !== !!c.alternateProficiencyOrHandling) fail(`4G ${w} alternate proficiency route must match the census (${!!c.alternateProficiencyOrHandling})`);
    if (hasAlt && a.proficiencyRoutes.alternate.some((r) => !r.condition || !r.requirement || !r.result)) fail(`4G ${w} alternate route needs condition + requirement + result`);
    if (hasAlt && !(q.speciesOverrides || []).length && !(q.abilityOverrides || []).length) fail(`4G ${w} alternate route needs a machine-readable speciesOverrides/abilityOverrides selector (runtime must not parse prose)`);
    for (const o of [...(q.speciesOverrides || []), ...(q.abilityOverrides || [])]) if (!o.effect || !(o.species || o.ability)) fail(`4G ${w} override shape`);
    // profile-kind sanity vs census
    const melee = a.finalTags.includes('offense_melee'), ranged = a.finalTags.includes('offense_ranged');
    if (c.profileKind === 'melee' && ranged && !(q.modes || []).some((m) => /ranged|thrown/.test(m.attackProfile))) fail(`4G ${w} ranged tag without a ranged/thrown mode`);
    if (c.profileKind === 'ranged' && melee) fail(`4G ${w} melee tag on a ranged-profile census identity`);
  });
  // Round 1 is frozen; Round 2 named rulings
  if (N >= 5 && sh(JSON.stringify(asg.slice(0, 5))) !== 'b565ac4c92bf19a058a7f6933d2a537690c42f7b5881c5ce2188fff31febd320') fail('4G Round 1 assignments changed after planner certification');
  if (N >= 10 && sh(JSON.stringify(asg.slice(0, 10))) !== 'ea580e5a483658679b06a879833ca3e9c13cf8de257fcccd97bcba73d5fa82d9') fail('4G Rounds 1-2 assignments changed after planner certification');
  const g4 = (k) => asg.find((a) => a.identityKey === k);
  const fl = g4('weapon-flamethrower'), ds = g4('weapon-deck-sweeper'), db = g4('weapon-discblade'), sk = g4('unmapped::Felucian Skullblade'), fi = g4('unmapped::Fira');
  if (fl && (!same(fl.tradeoffTags, ['action_economy', 'setup']) || fl.finalTags.some((t) => ['action_economy', 'setup', 'full_round_action', 'area_damage', 'control'].includes(t)))) fail('4G Flamethrower: reload tradeoffs stay out of finalTags; no full_round_action/area_damage/control');
  if (ds && (ds.finalTags.includes('area_damage') || !['stun', 'nonlethal', 'swift_action', 'setup'].every((t) => ds.finalTags.includes(t)))) fail('4G Deck Sweeper: stun/nonlethal + swift_action/setup prime, no area_damage');
  if (db && db.finalTags.some((t) => ['force', 'telekinesis', 'pistol', 'area_damage'].includes(t))) fail('4G Discblade base weapon must not carry talent-granted force/pistol/area semantics');
  if (sk && (['force', 'lightsaber', 'block', 'melee_defense', 'defense'].some((t) => sk.finalTags.includes(t)) || !['force', 'lightsaber', 'block', 'melee_defense', 'defense'].every((t) => (sk.conditionalSynergyTags || []).some((c) => c.tag === t)))) fail('4G Felucian Skullblade: Force-imbued block semantics conditional only');
  if (fi && !['damage_bonus', 'sustained_damage', 'targeting'].every((t) => fi.finalTags.includes(t))) fail('4G Fira must carry damage_bonus + sustained_damage + targeting');
  const bw = g4('weapon-bowcaster'), cr = g4('weapon-cr-1-blast-cannon'), ce = g4('unmapped::Cesta'), at = g4('unmapped::Atlatl'), dk = g4('unmapped::Darkstick');
  if (bw && (bw.finalTags.includes('burst_damage') || bw.ruleSelectors.rangeAuthority !== 'SOURCE_UNRESOLVED')) fail('4G Bowcaster: no burst_damage from flavor text; range stays SOURCE_UNRESOLVED');
  if (cr && (cr.finalTags.includes('area_damage') || cr.finalTags.includes('inaccurate') || !cr.finalTags.includes('damage_bonus'))) fail('4G CR-1: damage_bonus (adjacent rider) yes; area_damage/inaccurate no');
  if (ce && !ce.finalTags.includes('precision')) fail('4G Cesta must carry precision (Accurate energy balls)');
  if (at && at.finalTags.includes('precision')) fail('4G Atlatl must not borrow Cesta precision');
  if (dk && (!dk.finalTags.includes('damage_bonus') || dk.finalTags.includes('concealment') || dk.finalTags.includes('defense') || !['concealment', 'defense'].every((t) => (dk.conditionalSynergyTags || []).some((c) => c.tag === t)))) fail('4G Darkstick: damage_bonus global; concealment/defense conditional only');
  const by4 = (k) => asg.find((a) => a.identityKey === k), has4 = (a, ...t) => t.every((x) => a.finalTags.includes(x)), no4 = (a, ...t) => !t.some((x) => a.finalTags.includes(x));
  const r4 = [['unmapped::Garrote', (a) => has4(a, 'grab', 'control', 'sustained_damage') && no4(a, 'restrain', 'condition_track'), 'Garrote: grab/sustained_damage, no restrain/condition_track'],
    ['weapon-magna-caster', (a) => has4(a, 'precision', 'sniper', 'stealth'), 'Magna Caster: precision + sniper + stealth'],
    ['weapon-massassi-lanvarok', (a) => no4(a, 'precision') && a.tradeoffTags.includes('precision'), 'Massassi Lanvarok: precision is a tradeoff only'],
    ['weapon-neural-inhibitor', (a) => has4(a, 'poison', 'control') && no4(a, 'sustained_damage', 'condition_track'), 'Neural Inhibitor: no sustained_damage/condition_track'],
    ['unmapped::Neuronic Whip', (a) => has4(a, 'stun', 'nonlethal', 'damage_bonus', 'positioning'), 'Neuronic Whip: stun/nonlethal + damage_bonus + positioning'],
    ['weapon-pulse-rifle', (a) => has4(a, 'burst_damage') && no4(a, 'rifle', 'area_damage'), 'Pulse Rifle: burst_damage, no rifle/area_damage'],
    ['weapon-wookiee-ryyk-blade', (a) => has4(a, 'survival', 'exploration'), 'Ryyk Blade: survival + exploration'],
    ['unmapped::Shyarn', (a) => has4(a, 'precision'), 'Shyarn: precision (Rapid Strike penalty removal)'],
    ['weapon-sith-lanvarok', (a) => has4(a, 'dual_wield') && no4(a, 'precision', 'pistol'), 'Sith Lanvarok: dual_wield, precision tradeoff only'],
    ['weapon-squib-tensor-rifle', (a) => has4(a, 'targeting', 'control') && no4(a, 'rifle', 'condition_track'), 'Squib Tensor Rifle: targeting, no rifle/condition_track'],
    ['unmapped::Tehkla Blade', (a) => has4(a, 'damage_bonus', 'sustained_damage', 'targeting'), 'Tehk\'la Blade: delayed bleeding rider'],
    ['weapon-verpine-shattergun', (a) => has4(a, 'precision', 'critical_hit', 'damage_bonus') && no4(a, 'stealth', 'durability', 'pistol') && a.tradeoffTags.includes('durability'), 'Verpine Shatter Gun: durability is a tradeoff only, no stealth/pistol'],
    ['unmapped::Vibro-Saw', (a) => same(a.finalTags, ['exotic_weapon', 'melee', 'offense_melee']), 'Vibro-Saw: no damage_reduction/damage_bonus (DR bypass is an ontology gap)'],
    ['weapon-wrist-rocket-launcher', (a) => same(a.finalTags, ['exotic_weapon', 'ranged', 'offense_ranged']) && same([...a.tradeoffTags].sort(), ['action_economy', 'setup']), 'Wrist Rocket Launcher: no static payload tags; reload tradeoffs only'],
    ['weapon-xerrol-nightstinger', (a) => has4(a, 'stealth', 'sniper') && no4(a, 'precision', 'concealment', 'rifle'), 'Xerrol Nightstinger: stealth + sniper, no precision/concealment/rifle'],
    ['unmapped::Zhaboka', (a) => has4(a, 'double_weapon', 'full_attack', 'precision') && no4(a, 'dual_wield'), 'Zhaboka: double_weapon + full_attack, no dual_wield']];
  const tk = by4('unmapped::Tehkla Blade'), ml = by4('weapon-massassi-lanvarok'), xn = by4('weapon-xerrol-nightstinger'), vs = by4('unmapped::Vibro-Saw'), sl = by4('weapon-sith-lanvarok'), sg = by4('weapon-siang-lance');
  const ovr = (a, key, who) => (a?.ruleSelectors?.speciesOverrides || []).some((o) => o.species === who && (key ? o.treatAsGroup === key : true));
  if (N === 32) {
    if (!ovr(tk, 'simple', 'Nagai') || !tk.proficiencyRoutes.alternate.some((r) => /Nagai/.test(r.condition)) || tk.ruleSelectors.sourceAuthorityGap?.status !== 'CORRECTED_IN_PHASE_4H' || !same(tk.finalTags, ['exotic_weapon', 'melee', 'offense_melee', 'damage_bonus', 'sustained_damage', 'targeting'])) fail('4H-A4 Tehk\'la Blade: Nagai simple route must exist structurally with unchanged semantic tags');
    if (!ovr(ml, 'advanced-melee', 'Massassi') || ml.ruleSelectors.sourceConflict?.status !== 'FROZEN_PHASE3B_RULING_CONTROLS') fail('4H-A5 Massassi Lanvarok: frozen advanced-melee ruling + visible source conflict must remain');
    if (!ovr(by4('weapon-wookiee-ryyk-blade'), null, 'Wookiee') || !ovr(by4('weapon-squib-tensor-rifle'), 'rifle', 'Squib') || !ovr(by4('weapon-verpine-shattergun'), 'pistol', 'Verpine') || !(sg.ruleSelectors.abilityOverrides || []).some((o) => o.ability === 'Siang Lance Mastery' && o.treatAsGroup === 'rifle' && o.attackBonus === 1)) fail('4H-A2 Ryyk/Squib/Verpine/Siang alternate-proficiency selectors must remain machine-readable');
    if (xn.ruleSelectors.group?.[0] !== 'weapon-group:exotic' || xn.finalTags.includes('rifle')) fail('4H-A6 Xerrol Nightstinger: Phase 3B Exotic classification controls; no rifle tag');
    if (!(vs.guardrails || []).some((g) => /ontology gap/i.test(g)) || vs.finalTags.includes('damage_reduction') || vs.finalTags.includes('damage_bonus')) fail('4H-A7 Vibro-Saw: DR bypass stays structural / ontology gap');
    if (sl.ruleSelectors.explicitAbilityInteractions[0].ability !== 'Two-Weapon Fighting') fail('4H-A3 Sith Lanvarok must reference the exact ability name Two-Weapon Fighting');
    if (!['4H-A2', '4H-A3', '4H-A4'].every((id) => (S.phase4hCorrections || []).some((x) => x.id === id))) fail('4H corrections ledger missing');
  }
  for (const [k, ok, msg] of r4) { const a = by4(k); if (a && !ok(a)) fail(`4G ${msg}`); }
  const cp = S.census || {};
  if (cp.adjudicated !== N || cp.remaining !== 32 - N || cp.nextIdentity !== (cen[N]?.canonicalName ?? null)) fail('4G rolling progress counters');
  if (cp.canonicalExoticProficiencyIdentities !== 32 || cp.repoPresent !== 18 || cp.repoMissing !== 14 || cp.meleeProfile !== 15 || cp.rangedProfile !== 15 || cp.hybridProfile !== 2 || cp.alternateProficiencyOrHandlingCases !== 10) fail('4G rolling census totals differ from the frozen census');
  if (N === 32 && (S.status !== 'WEAPON_TAG_PHASE_4G_EXOTIC_32_IDENTITY_PLANNER_AUTHORITY_COMPLETE' || S.qa?.status !== 'PASS' || S.qa?.distinctSemanticTagsUsed !== 41 || S.qa.forbiddenPseudoTagsFound.length)) fail('4G complete: status / QA / 41 distinct tags');
  if (N === 32) { const u41 = new Set(asg.flatMap((a) => [...a.finalTags, ...a.tradeoffTags, ...(a.conditionalSynergyTags || []).map((x) => x.tag)])); if (u41.size !== 41 || !same([...u41].sort(), [...S.qa.semanticTagsUsed].sort())) fail(`4G complete: distinct semantic tags (final + tradeoff + conditional) ${u41.size} must equal the planner QA list of 41`); }
  const rr = (S.rounds || []).reduce((n, r) => n + r.identityCount, 0);
  if (rr !== N) fail('4G rolling round ledger does not sum to the adjudicated count');
  if (errors.length === e4r) console.log(`Phase 4G Exotic semantic tags OK: ${N}/32 adjudicated in ${S.rounds.length} round(s), ${tagTotal} assignments, ${tagsUsed.size} distinct tags from the 183-tag vocabulary, exotic_weapon unconditional, selectors/routes cross-checked against the census and Phase 3B, next ${cp.nextIdentity}`);
}

// ---- Phase 4H-A authority reconciliation (cross-category census; builder byte-stable) ----
if (fs.existsSync(path.join(ROOT, 'data/audits/item-weapons-phase-4h-authority-reconciliation.json'))) {
  const e4h = errors.length;
  try {
    const mod = await import('./build-item-weapons-phase-4h-reconciliation.mjs');
    const out = mod.buildPhase4HA();
    if (fs.readFileSync(path.join(ROOT, mod.OUT_JSON), 'utf8') !== out.json || fs.readFileSync(path.join(ROOT, mod.OUT_MD), 'utf8') !== out.md) fail('4H-A reconciliation outputs are stale or hand-edited (rebuild with tools/build-item-weapons-phase-4h-reconciliation.mjs)');
    const R = JSON.parse(out.json);
    if (R.status !== mod.STATUS || R.productionMutationAuthorized !== false) fail('4H-A status / authority-only flags');
    const need = ['DH23_DESCRIPTION_PAGE', 'MASSASSI_LANVAROK_SPECIES_CONFLICT', 'XERROL_NIGHTSTINGER_GROUP', 'TEHKLA_NAGAI_ROUTE', 'VIBRO_SAW_DR_BYPASS', 'SITH_LANVAROK_KISSAI_FAMILIARITY'];
    if (!need.every((id) => R.carriedDiscrepancies.some((d) => d.id === id))) fail('4H-A carried-discrepancy ledger is incomplete');
    if (errors.length === e4h) console.log(`Phase 4H-A reconciliation OK: ${R.census.categoryRecords} category records -> ${R.census.uniqueIdentities} unique identities (${R.census.repoPresent} present / ${R.census.repoMissing} missing), 0 missing, 0 unexpected, duplicate ${R.census.duplicates.map((d) => d.canonicalName).join(', ')}, ${R.carriedDiscrepancies.length} carried discrepancies, builder byte-stable`);
  } catch (e) { fail(`4H-A reconciliation: ${e.message}`); }
}

if (errors.length) { console.error(`FAIL (${errors.length})\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`weapons authority OK: ${p.canonicalWeapons.length} canonical, ${pack.size} repo records, all covered once`);
