/**
 * Executable-equivalence probes (Phase 3H design, reused by Phase 11-2A).
 *
 * Talent `system.tags` are read by executable code (not only by suggestion scoring). Rather than trusting a hand-made list of readers, every probe
 * here runs the REAL runtime function (or, for logic that is private to a module, the function source extracted from that module) on a talent with its
 * current tags and again with the proposed tags. A semantic-tag migration may only proceed where every probe signature is identical.
 *
 * Probes: droid-acquisition gate, talent-data-resolver (choice/execution metadata), item-classification (4 predicates), combat-feature classifier,
 * prerequisite-checker tree-identity extraction (real private function source), structural Force-talent classification (tag-independent), Sith lightsaber-form lookup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read, parse, TALENTS, TREES } from './talent-tag-io.mjs';
import { loadRuntime } from './census-talent-prerequisite-identity.mjs';

const sliceFunction = (src, name) => {
  const i = src.indexOf(`function ${name}(`); if (i < 0) throw new Error(`probe: function ${name} not found`);
  let depth = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1); }
  throw new Error(`probe: unbalanced ${name}`);
};

// Logic that lives inline in runtime modules. The probe asserts the module still contains these exact fragments, so a change there fails the probe loudly.
const INLINE_GUARDS = [
  ['scripts/engine/talent/sith-talent-actions.js', "haystack.includes('lightsaber form') || haystack.includes('lightsaber_forms') || haystack.includes('lightsaber-forms')"]
];
// Force-talent identity is STRUCTURAL (Phase 12 consumer correction): these consumers must call the tree-authority classifier and must no longer contain
// the retired tag / regex heuristics. A semantic tag change can therefore never change whether a talent counts as a Force talent.
const FORCE_TALENT_CONSUMERS = ['scripts/data/prerequisite-checker.js', 'scripts/engine/progression/prerequisites/prerequisite-evaluator.js', 'scripts/engine/talent/force-adept-talent-actions.js'];
const RETIRED_FORCE_HEURISTICS = ["tags?.includes('force')", "tags.includes('force')", '/force|mystic|telepath|adept|jedi|sith/i'];

export async function createProbe() {
  const talents = parse(read(TALENTS)), trees = parse(read(TREES));
  const { restore } = await loadRuntime(talents, trees);
  for (const [rel, frag] of INLINE_GUARDS) if (!read(rel).includes(frag)) throw new Error(`probe guard: ${rel} no longer contains the audited fragment — re-audit this tag consumer`);
  for (const rel of FORCE_TALENT_CONSUMERS) {
    const src0 = read(rel);
    if (!src0.includes('countForceTalents')) throw new Error(`probe guard: ${rel} no longer routes Force-talent counting through tree-authority`);
    for (const frag of RETIRED_FORCE_HEURISTICS) if (src0.includes(frag)) throw new Error(`probe guard: ${rel} reintroduced a tag/regex Force-talent heuristic (${frag})`);
  }
  const g = await import('/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js');
  const r = await import('/systems/foundryvtt-swse/scripts/items/talent-data-resolver.js');
  const ic = await import('/systems/foundryvtt-swse/scripts/utils/item-classification.js');
  const cf = await import('/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js');
  const ta = await import('/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js');
  const { normalizeTalentTreeId } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-normalizer.js');
  const src = read('scripts/data/prerequisite-checker.js');
  const { TalentTreeDB } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-db.js');
  const { canonicalTalentId, canonicalTalentUuid, sourceIdentityOf } = await import('/systems/foundryvtt-swse/scripts/data/talent-source-identity.js');
  await TalentTreeDB.build();
  const treeIdsOf = new Function('normalizeTalentTreeId', 'TalentTreeDB', 'canonicalTalentId', 'sourceIdentityOf', `${sliceFunction(src, 'normalizeTextTokens')}\n${sliceFunction(src, 'getCanonicalTalentTreeIds')}\nreturn getCanonicalTalentTreeIds;`)(normalizeTalentTreeId, TalentTreeDB, canonicalTalentId, sourceIdentityOf);
  // Tree identity only matters against REAL tree ids (a prerequisite names a tree); extra tokens that are not any tree's id can never match.
  const universe = new Set(trees.flatMap(t => [...treeIdsOf({ treeId: t.name }), ...treeIdsOf({ treeId: t._id }), ...treeIdsOf({ treeId: t.system?.talent_tree ?? t.name })]));
  const tokenToTrees = new Map();
  for (const t of trees) for (const k of [...treeIdsOf({ treeId: t.name }), ...treeIdsOf({ treeId: t._id }), ...treeIdsOf({ treeId: t.system?.talent_tree ?? t.name })]) (tokenToTrees.get(k) ?? tokenToTrees.set(k, new Set()).get(k)).add(t._id);
  const realTreeIds = item => [...new Set([...treeIdsOf(item.system), ...treeIdsOf(item)].filter(x => universe.has(x)))].sort().join('|');
  const actor = { type: 'character', name: 'Probe', system: {}, items: [], flags: {} };
  const omit = (o, keys) => JSON.parse(JSON.stringify(o, (k, v) => keys.includes(k) ? undefined : v));

  function signature(t, tags) {
    const item = { ...t, type: 'talent', system: { ...t.system, tags } };
    const tg = Array.isArray(tags) ? tags : [];
    const sig = {
      droidGate: String(g.getDroidAcquisitionBlockReason(actor, item, {}) ?? ''),
      resolved: JSON.stringify(omit(r.resolveTalentData(item), ['tags', 'tagsText'])),
      classification: [ic.isForcePowerItem(item), ic.isClassFeatureItem(item), ic.isFeatLikeItem(item), ic.isTalentLikeItem(item)].join(),
      combatCandidate: String(cf.isCombatFeatureCandidate(item)),
      combatFeature: JSON.stringify(omit(cf.classifyCombatFeatureItem(actor, item), ['tags'])),
      treeIdentity: realTreeIds({ ...item, flags: { ...(item.flags ?? {}), core: { ...(item.flags?.core ?? {}), sourceId: canonicalTalentUuid(t._id) } } }), // as the finalizer embeds it: source-linked
      // Force-talent identity is structural: this signature must be IDENTICAL for any tag array (checker, evaluator and Mystic Mastery share one classifier).
      forceTalent: ta.isForceTalent(item),
      lightsaberFormLookup: (() => { const hs = [item.system.tree, item.system.talent_tree, item.system.category, item.system.treeId, ...tg].join(' ').toLowerCase(); return hs.includes('lightsaber form') || hs.includes('lightsaber_forms') || hs.includes('lightsaber-forms'); })()
    };
    return sig;
  }
  /** keys whose signature differs */
  const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);
  return { signature, diff, restore, treeIdsOf, tokenToTrees };
}
