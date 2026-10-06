#!/usr/bin/env node
/**
 * Verifies data/audits/item-canonicalization-rolling-authority.json (Phase 0-1 weapons,
 * Phase 0-2 armor, Phase 0-3A equipment, Phase 0-3B medical, Phase 0-3C explosives, Phase 0-3D cybernetics, Phase 0-3E upgrades, Phase 0-3F gear templates, Phase 0-3G lightsaber components, Phase 0-3H droid systems, Phase 0-3I ammunition boundary, Phase 0 completion manifest, Phase 1 weapons content 1A-1I) against the weapons, armor and equipment packs. Read-only. Fails on any drift between the certified authority
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
  if (!errors.length) console.log(`Phase 1 weapons content OK: ${c1.books.length} books (${c1.books.map((b) => b.phase).join(',')}), ${tot.claims} claims / ${claimsByName.size} identities (${tot.present} present, ${tot.missing} missing; ${tot.INCORRECT} incorrect, ${tot.INCOMPLETE} incomplete)`);
}

if (errors.length) { console.error(`FAIL (${errors.length})\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`weapons authority OK: ${p.canonicalWeapons.length} canonical, ${pack.size} repo records, all covered once`);
