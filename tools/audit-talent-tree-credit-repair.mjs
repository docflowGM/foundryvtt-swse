#!/usr/bin/env node
/**
 * Phase 11-2C tree-authority repair audit: prerequisite tree credit must come from canonical tree identity + certified multi-tree membership, never from tags.
 *
 * OLD  = the pre-repair checker (function source taken from git) on the Phase 11-2A pack (tags still present)
 * NEW  = the repaired checker on the current pack, talents source-linked as the finalizer embeds them
 * Per talent, over REAL tree tokens only:
 *   restored  = OLD credits that are not primary-field credits but DO mirror certified membership   -> must all be present in NEW
 *   polluting = OLD credits that are neither primary-field credits nor certified membership          -> must all be absent from NEW (false credits)
 * Writes data/audits/talent-phase-11-2c-tree-credit-repair.json (--check to verify freshness).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, read, readJson, parse, TALENTS, TREES } from './talent-tag-io.mjs';
import { loadRuntime } from './census-talent-prerequisite-identity.mjs';

export const OUT = 'data/audits/talent-phase-11-2c-tree-credit-repair.json';
const OLD_COMMIT = 'a5fe0d84a'; // Phase 11-2A production apply: last state in which tags were still tree evidence in the pack AND in the checker
const sliceFunction = (src, name) => { const i = src.indexOf(`function ${name}(`); let d = 0, j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } throw new Error('slice ' + name); };
const git = rel => execSync(`git show ${OLD_COMMIT}:${rel}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

export async function build() {
  const talents = parse(read(TALENTS)), trees = parse(read(TREES)), oldTalents = new Map(parse(git(TALENTS)).map(t => [t._id, t]));
  const { restore } = await loadRuntime(talents, trees);
  const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js');
  const { normalizeTalentTreeId } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-normalizer.js');
  const { canonicalTalentId, canonicalTalentUuid, sourceIdentityOf } = await import('/systems/foundryvtt-swse/scripts/data/talent-source-identity.js');
  TalentTreeDB.isBuilt = false; await TalentTreeDB.build();
  const mk = (src, ...extra) => new Function('normalizeTalentTreeId', 'TalentTreeDB', 'canonicalTalentId', 'sourceIdentityOf', `${sliceFunction(src, 'normalizeTextTokens')}\n${sliceFunction(src, 'getCanonicalTalentTreeIds')}\nreturn getCanonicalTalentTreeIds;`)(normalizeTalentTreeId, TalentTreeDB, canonicalTalentId, sourceIdentityOf);
  const oldFn = mk(git('scripts/data/prerequisite-checker.js')), newSrc = read('scripts/data/prerequisite-checker.js'), newFn = mk(newSrc);
  const tokens = new Map(); for (const t of trees) for (const k of [...newFn({ treeId: t.name }), ...newFn({ treeId: t._id }), ...newFn({ treeId: t.system?.talent_tree ?? t.name })]) (tokens.get(k) ?? tokens.set(k, new Set()).get(k)).add(t._id);
  const members = new Map(trees.map(t => [t._id, new Set(t.system.talentIds)]));
  // The checker compares SPELLED tree tokens: a prerequisite names a tree (by name), a talent matches when any required token appears among its own tokens.
  // So a relationship (talent, tree) is "credited" iff requiredTokens(tree name) intersects the talent's tokens.
  const name = id => trees.find(x => x._id === id)?.name;
  // A prerequisite names a tree by NAME, so same-named trees (e.g. two "Squad Leader" trees) are one prerequisite-visible group.
  const groups = new Map(); for (const x of trees) (groups.get(x.name) ?? groups.set(x.name, []).get(x.name)).push(x);
  const required = new Map([...groups.keys()].map(nm => [nm, newFn({ treeId: nm })]));
  // same-named trees cannot be told apart by a name-spelled prerequisite; their members resolve by the tree `_id` spelling
  const requiredById = new Map([...groups].map(([nm, g]) => [nm, g.flatMap(x => newFn({ treeId: x._id }))]));
  const credited = (fn, item, nm) => { const have = new Set([...fn(item.system ?? {}), ...fn(item)]); return required.get(nm).some(r => have.has(r)) || (groups.get(nm).length > 1 && requiredById.get(nm).some(r => have.has(r))); };
  const noCategory = item => ({ ...item, category: undefined, system: { ...(item.system ?? {}), category: undefined } });
  const restored = [], polluting = [], secondary = [], remaining = [], categoryFieldCredits = [], missingPrimary = [], missingMembership = [];
  for (const t of talents) {
    const linked = { ...t, flags: { ...(t.flags ?? {}), core: { sourceId: canonicalTalentUuid(t._id) } } };
    const oldTags = oldTalents.get(t._id)?.system.tags ?? [], oldItem = { ...t, system: { ...t.system, tags: oldTags } }, fieldsOnly = { ...t, flags: undefined };
    for (const [nm, grp] of groups) {
      const member = grp.some(x => members.get(x._id).has(t._id)), primary = grp.some(x => x._id === t.system.treeId);
      const o = credited(oldFn, oldItem, nm), f = credited(newFn, fieldsOnly, nm), n = credited(newFn, linked, nm);
      if (member && !primary && n) secondary.push({ id: t._id, name: t.name, tree: nm });
      if (member && !n) (primary ? missingPrimary : missingMembership).push({ id: t._id, name: t.name, tree: nm });
      if (o && !f) { const row = { id: t._id, name: t.name, tree: nm, primary }; if (member) { restored.push(row); if (!n) missingMembership.push(row); } else { polluting.push(row); if (n) remaining.push(row); } }
      if (!member && n) (f ? categoryFieldCredits : remaining).push({ id: t._id, name: t.name, tree: nm, viaCategoryField: f && !credited(newFn, noCategory(fieldsOnly), nm) });
    }
  }
  restore();
  const noTags = !/\.tags\b|system\?\.tags/.test(sliceFunction(newSrc, 'getCanonicalTalentTreeIds').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
  return { schemaVersion: 1, phase: '11-2C', status: 'TREE_CREDIT_REPAIR_AUDIT', oldReference: `checker + pack at ${OLD_COMMIT}`,
    counts: { talents: talents.length, primaryTreesResolved: talents.length - new Set(missingPrimary.map(m => m.id)).size, primaryTreesUnresolved: new Set(missingPrimary.map(m => m.id)).size, secondaryMembershipRelationshipsResolvedByAuthority: secondary.length,
      oldTagCreditsMirroringCertifiedMembership: restored.length, ofWhichPrimaryTreeSpelledDifferently: restored.filter(r => r.primary).length, ofWhichRestoredByAuthority: restored.filter(r => !missingMembership.some(m => m.id === r.id && m.tree === r.tree)).length, certifiedRelationshipsNotResolved: missingMembership.length,
      oldPollutingTagCredits: polluting.length, pollutingCreditsRemaining: remaining.length, creditsFromStructuredFieldsWithoutMembership: categoryFieldCredits.length, ofWhichFromTheCategoryField: categoryFieldCredits.filter(c => c.viaCategoryField).length, checkerReadsTagsForTreeIdentity: !noTags },
    primaryUnresolved: missingPrimary, falseCreditsRemaining: remaining, creditsFromStructuredFieldsWithoutMembership: categoryFieldCredits, certifiedRelationshipsUnresolved: missingMembership, restoredRelationships: restored, pollutingCreditsThatStayGone: polluting, secondaryMembership: secondary };
}
export async function main(argv = process.argv.slice(2)) {
  const a = await build(), json = JSON.stringify(a, null, 1) + '\n';
  if (argv.includes('--check')) { if (!fs.existsSync(path.join(ROOT, OUT)) || read(OUT) !== json) { console.error('[tree-credit-repair] STALE'); return 1; } console.log('[tree-credit-repair] PASS'); return 0; }
  fs.writeFileSync(path.join(ROOT, OUT), json); process.stderr.write(JSON.stringify(a.counts, null, 1) + '\n'); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then(c => process.exit(c), e => { console.error(e.stack ?? e); process.exit(1); });
