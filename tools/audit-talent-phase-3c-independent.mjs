#!/usr/bin/env node
/**
 * Independent (read-only) Phase 3C audit model.
 *
 * This is a second, deliberately separate implementation of the certified Phase 3B
 * mutation contract. It reads the COMMITTED Phase 3B manifests directly (it does not
 * call buildBookManifest) and never writes production packs. It exists so the
 * primary applicator (tools/apply-talent-phase-3c.mjs) can be cross-checked against a
 * strict, ID-based reference and so idempotence can be tested (apply twice, diff).
 *
 * Usage:
 *   node tools/audit-talent-phase-3c-independent.mjs [--json]
 *
 * Exit code 0 only if every invariant passes.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const KNOWN_DISPOSITIONS = new Set([
  'UPDATE_CONTENT', 'UPDATE_METADATA', 'CREATE', 'REMOVE_CONTAMINATION', 'CORRECT_TREE', 'IDENTITY_SPLIT'
]);
const CREATE_DISPOSITIONS = new Set(['CREATE', 'IDENTITY_SPLIT']);
const STRUCTURAL_FIELDS = new Set(['_record_create', 'system.treeId']);
const CANONICAL_FIELDS = new Set([
  'name', 'system.benefit', 'system.description', 'system.description.value',
  'system.summary', 'system.prerequisites', 'system.source', 'system.page'
]);

const MANIFESTS = [
  'clone-wars-campaign-guide', 'core-rulebook', 'force-unleashed-campaign-guide', 'galaxy-at-war',
  'galaxy-of-intrigue', 'jedi-academy-training-manual', 'knights-of-the-old-republic-campaign-guide',
  'legacy-era-campaign-guide', 'rebellion-era-campaign-guide', 'scavengers-guide-to-droids',
  'scum-and-villainy', 'starships-of-the-galaxy', 'threats-of-the-galaxy', 'unknown-regions'
].map(k => `data/audits/talent-phase-3b-${k}-manifest.json`);

export const BLOCKER_SAME_NAME_IN_TREE = 'projected state has no same-name talent pair inside one tree (repo membership audit hard-fail)';
const clone = v => structuredClone(v);
const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = rel => JSON.parse(readText(rel));
const readPack = rel => readText(rel).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const getPath = (o, p) => p.split('.').reduce((v, k) => (v && typeof v === 'object' ? v[k] : undefined), o);
const fail = m => { throw new Error('[3c-independent] ' + m); };

function setLeaf(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (const k of parts.slice(0, -1)) {
    if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) fail('refusing to clobber non-object parent "' + k + '" while setting ' + dotted);
    cur = cur[k];
  }
  cur[parts.at(-1)] = clone(value);
}

export function loadInputs() {
  return {
    closeout: readJson('data/audits/talent-phase-3b-global-closeout.json'),
    manifests: MANIFESTS.map(rel => ({ rel, manifest: readJson(rel) })),
    talents: readPack('packs/talents.db'),
    trees: readPack('packs/talent_trees.db'),
    classes: readPack('packs/classes.db')
  };
}

export function protectedIds(closeout) {
  return new Set([
    ...closeout.reviewExtras.map(x => x.productionRecordId),
    ...closeout.productionOnlyDeferred.map(x => x.productionRecordId)
  ]);
}

/**
 * Strict reference application.
 * mode 'pre'  : starting from current production (drift + collision checks on).
 * mode 'post' : re-application onto already-repaired production (idempotence probe):
 *               drift checks are skipped and an existing create ID is accepted only if
 *               the record equals the certified template.
 */
export function applyReference(inputs, { mode = 'pre', state = null } = {}) {
  const { closeout, manifests } = inputs;
  const S = state ? clone(state) : { talents: clone(inputs.talents), trees: clone(inputs.trees), classes: clone(inputs.classes) };
  const prot = protectedIds(closeout);
  const T = new Map(S.talents.map(t => [t._id, t]));
  const R = new Map(S.trees.map(t => [t._id, t]));
  const C = new Map(S.classes.map(c => [c._id, c]));
  const uniq = (arr, v) => { if (!arr.includes(v)) arr.push(v); };
  const nameOf = id => T.get(id)?.name;

  for (const { manifest } of manifests) {
    for (const tc of manifest.treeCreates ?? []) {
      if (R.has(tc.createTreeId)) {
        if (mode === 'pre') fail('tree ID collision ' + tc.createTreeId);
        // post-mode: tree already exists; membership is re-asserted by record loop below.
      } else {
        assert.equal(tc.createTemplate._id, tc.createTreeId);
        const doc = clone(tc.createTemplate);
        S.trees.push(doc); R.set(doc._id, doc);
      }
    }

    for (const rec of manifest.records) {
      if (!KNOWN_DISPOSITIONS.has(rec.disposition)) fail('unknown disposition ' + rec.disposition);
      const ex = rec.identityResolution?.productionRecordId ?? null;
      const cr = rec.identityResolution?.createRecordId ?? null;
      if ((ex === null) === (cr === null)) fail('exactly one of production/create ID required: ' + rec.canonicalIdentity);
      if (CREATE_DISPOSITIONS.has(rec.disposition) !== (cr !== null)) fail('disposition/ID-kind mismatch: ' + rec.canonicalIdentity);

      let talent;
      let originalName = null;
      if (ex) {
        talent = T.get(ex);
        if (!talent) fail('missing production record ' + ex);
        if (prot.has(ex)) fail('certified mutation targets protected record ' + ex);
        originalName = talent.name;
        for (const f of rec.mutationFields) {
          if (STRUCTURAL_FIELDS.has(f)) continue;
          if (!CANONICAL_FIELDS.has(f)) fail('mutation field outside canonical surface: ' + f);
          if (!(f in rec.targetFields)) fail('targetFields lacks ' + f);
          if (f === 'system.description.value' && !(talent.system.description && typeof talent.system.description === 'object')) fail('description shape mismatch (object expected) for ' + ex);
          if (f === 'system.description' && talent.system.description && typeof talent.system.description === 'object') fail('description shape mismatch (string expected) for ' + ex);
          if (mode === 'pre' && rec.currentCanonicalFields && f in rec.currentCanonicalFields) {
            assert.deepEqual(getPath(talent, f) ?? null, rec.currentCanonicalFields[f], 'drift at ' + f + ' for ' + rec.canonicalIdentity);
          }
          setLeaf(talent, f, rec.targetFields[f]);
        }
        if (rec.mutationFields.includes('system.treeId')) setLeaf(talent, 'system.treeId', rec.targetTree.treeId);
      } else {
        if (T.has(cr)) {
          if (mode === 'pre') fail('generated ID collision ' + cr);
          assert.deepEqual(T.get(cr), rec.createTemplate, 'post-mode create drifted from template: ' + cr);
          talent = T.get(cr);
        } else {
          talent = clone(rec.createTemplate);
          if (talent._id !== cr) fail('create template ID mismatch ' + cr);
          S.talents.push(talent); T.set(cr, talent);
        }
      }

      const tm = rec.treeMutation;
      if (tm) {
        for (const oldId of tm.removeFromTreeIds ?? []) {
          const old = R.get(oldId);
          if (!old) { if (mode === 'post') continue; fail('source tree missing ' + oldId); }
          old.system.talentIds = old.system.talentIds.filter(i => i !== talent._id);
          // ID-safe name cleanup: only drop a name no remaining member carries.
          const remaining = new Set(old.system.talentIds.map(nameOf));
          for (const n of new Set([originalName, rec.name])) {
            if (n && !remaining.has(n)) old.system.talentNames = old.system.talentNames.filter(x => x !== n);
          }
        }
        if (tm.addToTreeId) {
          const tgt = R.get(tm.addToTreeId);
          if (!tgt) fail('target tree missing ' + tm.addToTreeId);
          uniq(tgt.system.talentIds, tm.addTalentId ?? talent._id);
          if (tm.replaceTalentName) {
            tgt.system.talentNames = tgt.system.talentNames.filter(x => x !== tm.replaceTalentName.from);
            uniq(tgt.system.talentNames, tm.replaceTalentName.to);
          } else uniq(tgt.system.talentNames, tm.addTalentName ?? talent.name);
        }
      }
    }

    for (const con of manifest.treeConsolidations ?? []) {
      const surv = R.get(con.survivorTreeId);
      if (!surv) fail('survivor missing');
      for (const [f, v] of Object.entries(con.survivorTreePatch)) setLeaf(surv, f, v);
      for (const oid of con.deleteObsoleteTreeIds) {
        const ob = R.get(oid);
        if (mode === 'pre' && !ob) fail('obsolete tree missing ' + oid);
        if (ob) {
          for (const i of ob.system.talentIds) if (!surv.system.talentIds.includes(i)) fail('consolidation would orphan ' + i);
          R.delete(oid); S.trees.splice(S.trees.findIndex(t => t._id === oid), 1);
        }
      }
    }

    for (const m of manifest.classAccessMutations ?? []) {
      const cls = C.get(m.classRecordId);
      if (!cls || cls.name !== m.className) fail('class mismatch ' + m.classRecordId);
      for (const [f, v] of Object.entries(m.add)) {
        const arr = getPath(cls, f);
        if (!Array.isArray(arr)) fail('class field not array ' + f);
        uniq(arr, v);
      }
    }
  }
  return S;
}

const flat = (o, pre = '', out = {}) => {
  if (o && typeof o === 'object' && !Array.isArray(o)) { for (const [k, v] of Object.entries(o)) flat(v, pre + k + '.', out); if (!Object.keys(o).length) out[pre.slice(0, -1)] = {}; }
  else out[pre.slice(0, -1)] = o;
  return out;
};

/** Returns [{id, ok, detail}] — every invariant is evaluated, none short-circuit the rest. */
export function checkInvariants(inputs, after, { reference = null } = {}) {
  const { closeout, manifests } = inputs;
  const results = [];
  const check = (id, fn) => {
    try { const detail = fn(); results.push({ id, ok: true, detail: detail ?? '' }); }
    catch (e) { results.push({ id, ok: false, detail: e.message.split('\n')[0] }); }
  };
  const recs = manifests.flatMap(m => m.manifest.records);
  const prot = protectedIds(closeout);
  const TB = new Map(inputs.talents.map(t => [t._id, t]));
  const T = new Map(after.talents.map(t => [t._id, t]));
  const R = new Map(after.trees.map(t => [t._id, t]));
  const RB = new Map(inputs.trees.map(t => [t._id, t]));
  const idOf = r => r.identityResolution.productionRecordId ?? r.identityResolution.createRecordId;

  check('counts: 1024 -> 1272; 932 existing + 248 created + 90 deferred + 2 extras', () => {
    const reused = recs.filter(r => r.identityResolution.productionRecordId).length;
    const created = recs.filter(r => r.identityResolution.createRecordId).length;
    assert.equal(recs.length, 1180); assert.equal(reused, 932); assert.equal(created, 248);
    assert.equal(closeout.productionOnlyDeferred.length, 90); assert.equal(closeout.reviewExtras.length, 2);
    assert.equal(inputs.talents.length, 1024); assert.equal(after.talents.length, 1272);
    assert.equal(reused + created + 90 + 2, 1272);
    return '932+248+90+2=1272';
  });
  check('dispositions equal certified totals and are all known', () => {
    const c = {}; for (const r of recs) c[r.disposition] = (c[r.disposition] ?? 0) + 1;
    assert.deepEqual(c, closeout.counts.dispositions);
    for (const d of Object.keys(c)) assert.ok(KNOWN_DISPOSITIONS.has(d), d);
  });
  check('IDs: reused retain ID, created use certified ID, no collisions, no double assignment', () => {
    const prodIds = recs.map(r => r.identityResolution.productionRecordId).filter(Boolean);
    const genIds = recs.map(r => r.identityResolution.createRecordId).filter(Boolean);
    assert.equal(new Set(prodIds).size, prodIds.length, 'production ID assigned twice');
    assert.equal(new Set(genIds).size, genIds.length, 'generated ID duplicated');
    for (const g of genIds) assert.ok(!TB.has(g), 'generated ID collides with production ' + g);
    for (const p of prodIds) { assert.ok(TB.has(p) && T.has(p)); assert.ok(!prot.has(p), 'certified mutation of protected ' + p); }
    for (const g of genIds) assert.ok(T.has(g));
    assert.equal(new Set(after.talents.map(t => t._id)).size, after.talents.length);
    assert.equal(new Set(after.trees.map(t => t._id)).size, after.trees.length);
  });
  check('Charm Beast split: JATM keeps bab9a1ce285f98b9 in Beastwarden; Core is c919d7682bd9df40 in Dathomiri Witch', () => {
    const jatm = recs.find(r => r.canonicalIdentity === 'Jedi Academy Training Manual|Beastwarden|Charm Beast');
    const core = recs.find(r => r.canonicalIdentity === 'Saga Edition Core Rulebook|Dathomiri Witch|Charm Beast');
    assert.equal(jatm.identityResolution.productionRecordId, 'bab9a1ce285f98b9');
    assert.equal(core.identityResolution.createRecordId, 'c919d7682bd9df40');
    assert.equal(core.identityResolution.productionRecordId, null);
    assert.equal(jatm.disposition === 'IDENTITY_SPLIT', false);
    const claim = id => [...R.values()].filter(t => t.system.talentIds.includes(id)).map(t => t._id);
    assert.deepEqual(claim('bab9a1ce285f98b9'), [jatm.targetTree.treeId]);
    assert.deepEqual(claim('c919d7682bd9df40'), [core.targetTree.treeId]);
    assert.notEqual(jatm.targetTree.treeId, core.targetTree.treeId);
  });
  check('protected 92 records: full serialized deep-equality + tree claims + names unchanged', () => {
    assert.equal(prot.size, 92);
    const claims = (Rs, id) => [...Rs.values()].filter(t => t.system.talentIds.includes(id)).map(t => t._id).sort();
    for (const id of prot) {
      assert.equal(JSON.stringify(T.get(id)), JSON.stringify(TB.get(id)), 'protected record changed ' + id);
      assert.deepEqual(claims(R, id), claims(RB, id), 'protected membership changed ' + id);
      for (const tid of claims(R, id)) assert.ok(R.get(tid).system.talentNames.includes(TB.get(id).name), 'protected name dropped from tree ' + tid);
    }
  });
  check('preservation boundary: existing records change only in certified mutationFields', () => {
    let n = 0;
    for (const r of recs) {
      const id = r.identityResolution.productionRecordId; if (!id) continue;
      const a = flat(TB.get(id)), b = flat(T.get(id));
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
        assert.ok(r.mutationFields.some(f => k === f || k.startsWith(f + '.')), 'unauthorized change ' + k + ' on ' + r.canonicalIdentity);
        n++;
      }
    }
    return n + ' leaf changes, all authorized';
  });
  check('existing records: only canonical/structural mutation fields appear in manifests; description shape preserved', () => {
    for (const r of recs) {
      for (const f of r.mutationFields) assert.ok(STRUCTURAL_FIELDS.has(f) || CANONICAL_FIELDS.has(f), 'non-canonical field ' + f);
      const id = r.identityResolution.productionRecordId; if (!id) continue;
      assert.equal(typeof TB.get(id).system.description, typeof T.get(id).system.description, 'description shape changed ' + id);
      assert.equal(Object.keys(TB.get(id).system).filter(k => !(k in T.get(id).system)).length, 0, 'system key removed on ' + id);
    }
  });
  check('structural markers: _record_create only on creates; system.treeId only on creates and CORRECT_TREE; never written as data', () => {
    for (const r of recs) {
      const hasCreate = r.mutationFields.includes('_record_create');
      assert.equal(hasCreate, CREATE_DISPOSITIONS.has(r.disposition), 'pseudo-op marker mismatch ' + r.canonicalIdentity);
      if (r.mutationFields.includes('system.treeId') && !hasCreate) assert.equal(r.disposition, 'CORRECT_TREE', r.canonicalIdentity);
      if (r.disposition === 'CORRECT_TREE') assert.ok(r.mutationFields.includes('system.treeId'));
    }
    for (const t of after.talents) assert.ok(!('_record_create' in t) && !('_record_create' in t.system));
  });
  check('created records equal certified templates and match targetFields', () => {
    for (const r of recs.filter(x => x.identityResolution.createRecordId)) {
      const t = T.get(r.identityResolution.createRecordId);
      assert.deepEqual(t, r.createTemplate);
      for (const [f, v] of Object.entries(r.targetFields)) assert.deepEqual(getPath(t, f) ?? null, v ?? null, 'template != targetFields at ' + f + ' for ' + r.canonicalIdentity);
      assert.equal(t.system.treeId, r.targetTree.treeId);
    }
  });
  check('bidirectional membership: every canonical talent is in exactly its target tree by ID and by name; treeId agrees', () => {
    const claims = new Map();
    for (const t of after.trees) for (const i of t.system.talentIds) claims.set(i, [...(claims.get(i) ?? []), t._id]);
    for (const r of recs) {
      const id = idOf(r), tree = R.get(r.targetTree.treeId), tal = T.get(id);
      assert.ok(tree, 'target tree missing ' + r.canonicalIdentity);
      assert.deepEqual(claims.get(id), [r.targetTree.treeId], 'claims != [target] for ' + r.canonicalIdentity);
      assert.ok(tree.system.talentNames.includes(tal.name), 'tree lacks display name for ' + r.canonicalIdentity);
      if (/^[0-9a-f]{16}$/.test(tal.system.treeId ?? '') || r.mutationFields.includes('system.treeId')) assert.equal(tal.system.treeId, r.targetTree.treeId, 'talent.treeId != target for ' + r.canonicalIdentity);
    }
  });
  check('touched trees: no duplicate IDs/names, no stale names, names == names of member IDs', () => {
    const touched = new Set(recs.flatMap(r => [r.targetTree.treeId, ...(r.treeMutation?.removeFromTreeIds ?? [])]));
    for (const tid of touched) {
      const t = R.get(tid); if (!t) continue; // consolidated away
      const ids = t.system.talentIds, names = t.system.talentNames;
      assert.equal(new Set(ids).size, ids.length, 'dup ids in ' + t.name);
      assert.equal(new Set(names).size, names.length, 'dup names in ' + t.name);
      for (const i of ids) assert.ok(T.has(i), 'dangling ' + i + ' in ' + t.name);
      const expect = new Set(ids.map(i => T.get(i).name));
      for (const n of names) assert.ok(expect.has(n), 'stale name "' + n + '" in ' + t.name);
      for (const n of expect) assert.ok(names.includes(n), 'missing name "' + n + '" in ' + t.name);
    }
  });
  check('no orphaned talents; no talent claimed by two trees; no talent points at a missing tree by hex treeId', () => {
    const claimed = new Map();
    for (const t of after.trees) for (const i of t.system.talentIds) claimed.set(i, (claimed.get(i) ?? 0) + 1);
    for (const t of after.talents) { assert.equal(claimed.get(t._id), 1, 'talent ' + t._id + ' claimed ' + claimed.get(t._id)); if (/^[0-9a-f]{16}$/.test(t.system.treeId ?? '')) assert.ok(R.has(t.system.treeId), 'dangling treeId ' + t._id); }
  });
  check('GenoHaradan consolidation: certified survivor/obsolete IDs, all members in survivor, none orphaned', () => {
    const cons = manifests.flatMap(m => m.manifest.treeConsolidations ?? []);
    assert.equal(cons.length, 1);
    const c = cons[0], co = closeout.treeConsolidations[0];
    assert.equal(c.survivorTreeId, 'da7b731a3e434a7a'); assert.deepEqual(c.deleteObsoleteTreeIds, ['db1b30c2163d0650']);
    assert.equal(c.survivorTreeId, co.survivorTreeId); assert.deepEqual(c.deleteObsoleteTreeIds, co.deleteObsoleteTreeIds);
    const surv = R.get(c.survivorTreeId); assert.ok(surv); assert.ok(!R.has('db1b30c2163d0650'));
    assert.equal(surv.name, 'GenoHaradan'); assert.equal(surv.system.talent_tree, 'GenoHaradan');
    const before = new Set([...RB.get(c.survivorTreeId).system.talentIds, ...RB.get('db1b30c2163d0650').system.talentIds]);
    for (const i of before) assert.ok(surv.system.talentIds.includes(i), 'orphaned ' + i);
    assert.deepEqual([...surv.system.talentIds].sort(), [...c.survivorTreePatch['system.talentIds']].sort());
    for (const t of after.talents) assert.notEqual(t.system.treeId, 'db1b30c2163d0650');
    for (const i of before) assert.ok(!prot.has(i), 'protected record in consolidation');
    for (const cl of after.classes) assert.ok(!JSON.stringify(cl).includes('db1b30c2163d0650'));
    assert.ok(after.classes.some(cl => cl.name === 'Assassin' && JSON.stringify(cl).includes(c.survivorTreeId)), 'Assassin lacks survivor access');
  });
  check('7 tree creates: certified IDs, no collision, exact members, names, no dup members', () => {
    const tcs = manifests.flatMap(m => m.manifest.treeCreates ?? []);
    assert.equal(tcs.length, 7); assert.equal(closeout.treeCreates.length, 7);
    for (const tc of tcs) {
      const co = closeout.treeCreates.find(x => x.createTreeId === tc.createTreeId); assert.ok(co, 'not in closeout ' + tc.createTreeId);
      assert.ok(!RB.has(tc.createTreeId), 'collision ' + tc.createTreeId);
      const t = R.get(tc.createTreeId);
      assert.equal(t.name, co.displayName); assert.equal(t.system.talent_tree, co.displayName);
      assert.deepEqual([...t.system.talentIds].sort(), [...co.memberTalentIds].sort(), 'members differ ' + t.name);
      assert.equal(new Set(t.system.talentIds).size, t.system.talentIds.length);
      assert.equal(new Set(t.system.talentNames).size, t.system.talentNames.length);
      assert.deepEqual([...t.system.talentNames].sort(), t.system.talentIds.map(i => T.get(i).name).sort());
    }
  });
  check('5 class-access mutations: certified class IDs, prefix preserved, added once, parallel arrays aligned, nothing else changed', () => {
    const cms = manifests.flatMap(m => m.manifest.classAccessMutations ?? []);
    assert.equal(cms.length, 5); assert.equal(closeout.classAccessMutations.length, 5);
    const CB = new Map(inputs.classes.map(c => [c._id, c])), CA = new Map(after.classes.map(c => [c._id, c]));
    const touched = new Set(cms.map(m => m.classRecordId));
    for (const m of cms) for (const [f, v] of Object.entries(m.add)) {
      const b = getPath(CB.get(m.classRecordId), f), a = getPath(CA.get(m.classRecordId), f);
      assert.deepEqual(a.slice(0, b.length), b, 'prefix not preserved ' + f);
      assert.equal(a.filter(x => x === v).length, 1, 'value not present exactly once ' + f);
    }
    for (const id of touched) {
      const s = CA.get(id).system, n = s.talent_trees.length;
      for (const f of ['talentTreeIds', 'talentTreeSourceIds', 'talentTreeUuids']) assert.equal(s[f].length, n, 'parallel array misaligned ' + f + ' on ' + CA.get(id).name);
    }
    for (const [id, c] of CA) if (!touched.has(id)) assert.equal(JSON.stringify(c), JSON.stringify(CB.get(id)), 'untouched class changed ' + id);
    for (const id of touched) {
      const a = flat(CB.get(id)), b = flat(CA.get(id));
      for (const k of Object.keys(b)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) assert.ok(/^system\.talent(_trees|TreeIds|TreeSourceIds|TreeUuids)\./.test(k) || /^system\.talent(_trees|TreeIds|TreeSourceIds|TreeUuids)$/.test(k), 'unrelated class change ' + k);
    }
  });
  check('trees outside the certified surface are unchanged', () => {
    const touched = new Set([
      ...recs.flatMap(r => [r.targetTree.treeId, ...(r.treeMutation?.removeFromTreeIds ?? [])]),
      ...manifests.flatMap(m => (m.manifest.treeConsolidations ?? []).flatMap(c => [c.survivorTreeId, ...c.deleteObsoleteTreeIds]))
    ]);
    for (const [id, t] of RB) if (!touched.has(id)) assert.equal(JSON.stringify(R.get(id)), JSON.stringify(t), 'untouched tree changed ' + id);
  });
  check(BLOCKER_SAME_NAME_IN_TREE, () => {
    // Mirrors tools/audit-talent-tree-membership.mjs `duplicateTalentNamesWithinTree` (a hard failure in CI).
    const bad = [];
    for (const t of after.trees) {
      const seen = new Map();
      for (const i of t.system.talentIds) {
        const k = (T.get(i)?.name ?? '').normalize('NFKD').replace(/[^\w]+/g, '').toLowerCase();
        seen.set(k, [...(seen.get(k) ?? []), i]);
      }
      for (const [k, v] of seen) if (v.length > 1) bad.push(t.name + ': ' + T.get(v[0]).name + ' -> ' + v.join(','));
    }
    assert.equal(bad.length, 0, bad.length + ' same-name pairs within a tree: ' + bad.join(' | '));
  });
  if (reference !== undefined && reference !== null) {
    check('idempotence: second application yields deep-equal state (order-sensitive)', () => {
      assert.deepStrictEqual(reference, after);
      assert.equal(JSON.stringify(reference), JSON.stringify(after), 'serialization unstable');
    });
  }
  return results;
}

export function runAudit() {
  const inputs = loadInputs();
  const first = applyReference(inputs, { mode: 'pre' });
  const second = applyReference(inputs, { mode: 'post', state: first });
  return { inputs, first, second, results: checkInvariants(inputs, first, { reference: second }) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { results } = runAudit();
  if (process.argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
  else for (const r of results) console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.id + (r.detail ? '  [' + r.detail + ']' : ''));
  const bad = results.filter(r => !r.ok);
  console.log(bad.length ? `\n${bad.length} invariant(s) FAILED` : `\nAll ${results.length} invariants passed`);
  process.exit(bad.length ? 1 : 0);
}
