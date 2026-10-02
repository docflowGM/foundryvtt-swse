#!/usr/bin/env node
/**
 * Phase 12 consumer correction — Force-talent classification census (read-only; writes no pack).
 *
 *   node tools/census-talent-force-classification.mjs           write data/audits/talent-phase-12-force-talent-census.json
 *   node tools/census-talent-force-classification.mjs --check   committed census is current
 *
 * For all canonical talents: RAW Force talent (certified tree membership via the tree-authority classifier) versus the two retired heuristics —
 * the semantic `force` tag counter (prerequisite checker / evaluator) and the Mystic Mastery category/tree/tag regex.
 */
import fs from 'node:fs';
import { ROOT, read, parse, TALENTS, TREES } from './talent-tag-io.mjs';
import { loadRuntime } from './census-talent-prerequisite-identity.mjs';

export const OUT = 'data/audits/talent-phase-12-force-talent-census.json';
const OLD_MYSTIC = /force|mystic|telepath|adept|jedi|sith/i;
const tagsOf = t => (Array.isArray(t?.system?.tags) ? t.system.tags : []);

export async function build() {
  const talents = parse(read(TALENTS)), trees = parse(read(TREES));
  const { restore } = await loadRuntime(talents, trees);
  const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js');
  const ta = await import('/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js');
  await TalentTreeDB.build();
  const forceTreeIds = [...ta.getCanonicalForceTalentTreeIds()];
  const forceTrees = forceTreeIds.map(id => TalentTreeDB.trees.get(id)?.name ?? id).sort();
  const rows = talents.map(t => {
    const c = ta.classifyForceTalent(t);
    const tag = tagsOf(t).includes('force'), oldCounter = !!(t.system?.isForce || tag);
    const oldMystic = OLD_MYSTIC.test([t.system?.category, t.system?.talent_tree, t.system?.tree, ...tagsOf(t)].join(' '));
    return { id: t._id, name: t.name, raw: c.isForce, resolved: c.resolved, tag, oldCounter, oldMystic };
  });
  const ids = f => rows.filter(f).map(r => r.id).sort();
  const buckets = {
    rawForce_semanticForce: ids(r => r.raw && r.tag).length,
    rawForce_noSemanticForce: ids(r => r.raw && !r.tag).length,
    nonForce_semanticForce: ids(r => !r.raw && r.tag).length,
    nonForce_noSemanticForce: ids(r => !r.raw && !r.tag).length
  };
  const method = key => ({ total: rows.filter(r => r[key]).length, falsePositives: ids(r => r[key] && !r.raw), falseNegatives: ids(r => !r[key] && r.raw) });
  const out = {
    phase: '12-force-talent-consumer-correction', canonicalTalents: rows.length, forceTalentTrees: forceTrees, forceTalentTreeCount: forceTrees.length,
    rawForceTalents: ids(r => r.raw).length, unresolvedTalents: ids(r => !r.resolved), buckets,
    oldTagCounter: method('oldCounter'), oldMysticRegex: method('oldMystic')
  };
  restore();
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await build();
  const text = JSON.stringify(out, null, 2) + '\n';
  const p = `${ROOT}/${OUT}`;
  if (process.argv.includes('--check')) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { console.error('force-talent census is stale'); process.exit(1); } console.log('force-talent census current'); }
  else { fs.writeFileSync(p, text); console.log(JSON.stringify({ raw: out.rawForceTalents, trees: out.forceTalentTreeCount, buckets: out.buckets, oldTag: [out.oldTagCounter.total, out.oldTagCounter.falsePositives.length, out.oldTagCounter.falseNegatives.length], oldMystic: [out.oldMysticRegex.total, out.oldMysticRegex.falsePositives.length, out.oldMysticRegex.falseNegatives.length], unresolved: out.unresolvedTalents.length })); }
}
