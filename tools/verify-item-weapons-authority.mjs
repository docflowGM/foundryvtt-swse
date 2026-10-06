#!/usr/bin/env node
/**
 * Verifies data/audits/item-canonicalization-rolling-authority.json (Phase 0-1 weapons,
 * Phase 0-2 armor, Phase 0-3A equipment, Phase 0-3B medical, Phase 0-3C explosives, Phase 0-3D cybernetics, Phase 0-3E upgrades, Phase 0-3F gear templates, Phase 0-3G lightsaber components, Phase 0-3H droid systems, Phase 0-3I ammunition boundary, Phase 0 completion manifest, Phase 1 weapons content 1A-1L) against the weapons, armor and equipment packs. Read-only. Fails on any drift between the certified authority
 * and the pack so that execution phases cannot silently run against a changed repo.
 */
import fs from 'node:fs';
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
    if (!(c1.openContentAdjudications || []).some((r) => r.subject === 'BlasTech 500 Riot Gun')) fail('1 Riot Gun adjudication must remain open');
  }
  if (!errors.length) console.log(`Phase 1 weapons content OK: ${c1.books.length} books (${c1.books.map((b) => b.phase).join(',')}), ${tot.claims} claims / ${claimsByName.size} identities (${tot.present} present, ${tot.missing} missing; ${tot.INCORRECT} incorrect, ${tot.INCOMPLETE} incomplete)`);
}

// ---- Phase 2 weapons numeric/stat/schema authority (2A Core in the rolling authority; later books may be standalone) ----
const s2 = auth.phases['2-weapons-numeric-stat-schema'];
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
      if (r.weaponGroup !== q1.weaponGroup || r.source.descriptionPage !== q1.source.descriptionPage || (r.source.statTablePage ?? null) !== (q1.source.statTablePage ?? null)) fail(`${w} group/pages differ from Phase 1`);
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
      if (!Array.isArray(s.triggeredEffects) || !same(s.triggeredEffects, (s.attackProfiles || []).flatMap((x) => x.triggeredEffects || []))) fail(`${w} canonicalStats.triggeredEffects must equal the profile-level triggered effects`);
      if (!(s.technologyClassification && Array.isArray(s.technologyClassification.tags) && Array.isArray(s.technologyClassification.rules))) fail(`${w} missing/invalid technologyClassification`);
      if (!('deliveryMethod' in s) || !(s.deliveryMethod === null || (s.deliveryMethod && C.deliveryMethod.fields.every((f2) => f2 in s.deliveryMethod)))) fail(`${w} missing/invalid deliveryMethod`);
      if (!Array.isArray(r.conditionalQualities) || r.conditionalQualities.some((q) => !C.conditionalQualities.shape.every((f2) => f2 in q))) fail(`${w} conditionalQualities must use {quality,state,when,scope,effect}`);
      if (!Array.isArray(s.payloadProfiles)) fail(`${w} missing payloadProfiles`);
      else for (const pl of s.payloadProfiles) {
        if (!C.payloadProfiles.fields.every((f) => f in pl) || !(pl.damage || pl.effect)) fail(`${w} payload ${pl.id} incomplete`);
        else if (pl.damage) { dice(pl.damage, `${w} payload ${pl.id}`); if (!TYPE_MODES.has(pl.damageType.mode) || !STUN_CAP.has(pl.stun.capability)) fail(`${w} payload ${pl.id} invalid damageType/stun`); }
      }
      if (s.resource.kind !== 'none') {
        for (const k2 of C.resourceLifecycle.fields) if (!(k2 in s.resource) || !(s.resource[k2] === null || typeof s.resource[k2] === 'boolean')) fail(`${w} resource.${k2} must be present as boolean or null`);
      }
      if (!Array.isArray(s.defensiveInteractions) || s.defensiveInteractions.some((e) => !C.defensiveInteractions.entryFields.every((f) => f in e))) fail(`${w} missing/invalid canonicalStats.defensiveInteractions`);
      for (const cd of r.conditionalDamageProfiles || []) {
        const op = cd.operation || 'replace';
        if (!cd.id || !cd.condition || !C.conditionalDamage.operations.includes(op)) fail(`${w} invalid conditionalDamageProfile ${cd.id}`);
        else if (op === 'replace') dice(cd.damage, `${w} conditional ${cd.id}`);
        else if (op === 'add-dice' && !(Number.isInteger(cd.diceCountDelta) && Number.isInteger(cd.dieSize))) fail(`${w} conditional ${cd.id} add-dice needs diceCountDelta/dieSize`);
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
          } else if (ap.length !== 1 || ap[0].id !== 'primary' || !(same(ap[0].damage, s.baseDamage) || ap[0].damage.mode === 'inherited') || !same(ap[0].damageType, s.damageType) || !same(ap[0].range, s.range)) fail(`${w} primary attack profile must mirror canonicalStats baseDamage/damageType/range`);
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
    if (s2.schemaVersion !== 'weapon-authority-schema-v2.6') fail('schemaVersion must be weapon-authority-schema-v2.6');
  }
  // Standalone book authorities (not merged into the rolling record unless the owner says so)
  for (const sb of s2.standaloneBookAuthorities || []) {
    const sa = JSON.parse(fs.readFileSync(path.join(ROOT, sb.file), 'utf8'));
    if (!fs.existsSync(path.join(ROOT, sb.doc))) fail(`${sb.phase} missing doc ${sb.doc}`);
    if (typeof sa.scope === 'object' && (sa.scope.rollingAuthorityMutationAuthorized !== false || sa.scope.productionMutationAuthorized !== false || sa.scope.recordCreationAuthorized !== false)) fail(`${sb.phase} standalone scope flags must stay false`);
    if (sb.rollingMergeAuthorized !== false) fail(`${sb.phase} standalone book must not be rolling-merged without owner instruction`);
    const p1b = auth.phases['1-weapons-content'].books.find((x) => x.book === sa.book);
    const p1 = new Map(p1b.records.map((r) => [r.canonicalName, r]));
    const t = checkBook(sa, p1, sb.phase, { mirrorProfiles: !!sb.mirrorProfiles });
    const c = sa.counts;
    if (sa.records.length !== c.canonicalWeaponClaims || sa.records.length !== sb.claims || t.present !== c.repoPresent || sa.records.length - t.present !== c.repoMissing || t.present !== sb.repoPresent) fail(`${sb.phase} counts mismatch`);
    const tallies = { accurateBaseClaims: t.accurate, inaccurateBaseClaims: t.inaccurate, arcBaseClaims: t.arc, ignoresDRBaseClaims: t.ign, areaEffectClaims: t.area, areaEffectBaseClaims: t.area, baseAccurateClaims: t.accurate, baseInaccurateClaims: t.inaccurate, baseArcClaims: t.arc, biotechClaims: t.biotech, doubleWeaponClaims: t.dbl, autofireOnlyClaims: t.auto };
    for (const [k, v] of Object.entries(tallies)) if (k in c && c[k] !== v) fail(`${sb.phase} counts.${k} ${c[k]} != computed ${v}`);
    if (sa.verification.sourceTables) { const tableSum = sa.verification.sourceTables.reduce((m, x) => m + x.claims, 0); if (tableSum !== sa.records.length) fail(`${sb.phase} source table claims ${tableSum} != records ${sa.records.length}`); }
    // Lightfoil-style DR bypass must come from the lightsaber group only
    for (const r of sa.records) if (r.qualities.ignoresDR && r.weaponGroup !== 'Lightsaber') fail(`${sb.phase} ${r.canonicalName} ignoresDR outside the Lightsaber group`);
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
      if (!rg.conflictGate || !(auth.phases['1-weapons-content'].openContentAdjudications || []).some((q) => q.subject === 'BlasTech 500 Riot Gun')) fail('2E BlasTech 500 Riot Gun must stay production-gated with the open adjudication');
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
  if (errors.length === e0) console.log(`Phase 2 weapons stat/schema OK: ${s2.books.map((b) => `${b.phase} ${b.book} (${b.records.length})`).join('; ')}`);
}

if (errors.length) { console.error(`FAIL (${errors.length})\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`weapons authority OK: ${p.canonicalWeapons.length} canonical, ${pack.size} repo records, all covered once`);
