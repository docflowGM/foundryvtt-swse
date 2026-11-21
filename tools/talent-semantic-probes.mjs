/**
 * Phase 3H executable-equivalence probes.
 *
 * Talent `system.tags` are read by executable code (not only by suggestion scoring). Rather than trusting a hand-made list of readers, every probe
 * here runs the REAL runtime function (or, for logic that is private to a module, the function source extracted from that module) on a talent with its
 * current tags and again with the proposed tags. A semantic-tag migration may only proceed where every probe signature is identical.
 *
 * Probes: droid-acquisition gate, talent-data-resolver (choice/execution metadata), item-classification (4 predicates), combat-feature classifier,
 * prerequisite-checker tree-identity extraction (real private function source), Force-talent counting, Mystic Mastery Force-talent regex, Sith lightsaber-form lookup.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read, parse, TALENTS, TREES } from './talent-semantic-common.mjs';
import { loadRuntime } from './census-talent-prerequisite-identity.mjs';

const sliceFunction = (src, name) => {
  const i = src.indexOf(`function ${name}(`); if (i < 0) throw new Error(`probe: function ${name} not found`);
  let depth = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1); }
  throw new Error(`probe: unbalanced ${name}`);
};

// Logic that lives inline in runtime modules. The probe asserts the module still contains these exact fragments, so a change there fails the probe loudly.
const INLINE_GUARDS = [
  ['scripts/data/prerequisite-checker.js', "t.system?.isForce || t.system?.tags?.includes('force')"],
  ['scripts/engine/progression/prerequisites/prerequisite-evaluator.js', "t.system.tags.includes('force')"],
  ['scripts/engine/talent/force-adept-talent-actions.js', '/force|mystic|telepath|adept|jedi|sith/i.test([item?.system?.category, item?.system?.talent_tree, item?.system?.tree, ...(Array.isArray(item?.system?.tags) ? item.system.tags : [])].join(\' \'))'],
  ['scripts/engine/talent/sith-talent-actions.js', "haystack.includes('lightsaber form') || haystack.includes('lightsaber_forms') || haystack.includes('lightsaber-forms')"]
];

export async function createProbe() {
  const talents = parse(read(TALENTS)), trees = parse(read(TREES));
  const { restore } = await loadRuntime(talents, trees);
  for (const [rel, frag] of INLINE_GUARDS) if (!read(rel).includes(frag)) throw new Error(`probe guard: ${rel} no longer contains the audited fragment — re-audit this tag consumer`);
  const g = await import('/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js');
  const r = await import('/systems/foundryvtt-swse/scripts/items/talent-data-resolver.js');
  const ic = await import('/systems/foundryvtt-swse/scripts/utils/item-classification.js');
  const cf = await import('/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js');
  const { normalizeTalentTreeId } = await import('/systems/foundryvtt-swse/scripts/data/talent-tree-normalizer.js');
  const src = read('scripts/data/prerequisite-checker.js');
  const treeIdsOf = new Function('normalizeTalentTreeId', `${sliceFunction(src, 'normalizeTextTokens')}\n${sliceFunction(src, 'getCanonicalTalentTreeIds')}\nreturn getCanonicalTalentTreeIds;`)(normalizeTalentTreeId);
  // Tree identity only matters against REAL tree ids (a prerequisite names a tree); extra tokens that are not any tree's id can never match.
  const universe = new Set(trees.flatMap(t => [...treeIdsOf({ treeId: t.name }), ...treeIdsOf({ treeId: t._id }), ...treeIdsOf({ treeId: t.system?.talent_tree ?? t.name })]));
  const tokenToTrees = new Map();
  for (const t of trees) for (const k of [...treeIdsOf({ treeId: t.name }), ...treeIdsOf({ treeId: t._id }), ...treeIdsOf({ treeId: t.system?.talent_tree ?? t.name })]) (tokenToTrees.get(k) ?? tokenToTrees.set(k, new Set()).get(k)).add(t._id);
  const realTreeIds = item => [...new Set([...treeIdsOf(item.system), ...treeIdsOf(item)].filter(x => universe.has(x)))].sort().join('|');
  const actor = { type: 'character', name: 'Probe', system: {}, items: [], flags: {} };
  const omit = (o, keys) => JSON.parse(JSON.stringify(o, (k, v) => keys.includes(k) ? undefined : v));
  const forceRe = /force|mystic|telepath|adept|jedi|sith/i;

  function signature(t, tags) {
    const item = { ...t, type: 'talent', system: { ...t.system, tags } };
    const tg = Array.isArray(tags) ? tags : [];
    const sig = {
      droidGate: String(g.getDroidAcquisitionBlockReason(actor, item, {}) ?? ''),
      resolved: JSON.stringify(omit(r.resolveTalentData(item), ['tags', 'tagsText'])),
      classification: [ic.isForcePowerItem(item), ic.isClassFeatureItem(item), ic.isFeatLikeItem(item), ic.isTalentLikeItem(item)].join(),
      combatCandidate: String(cf.isCombatFeatureCandidate(item)),
      combatFeature: JSON.stringify(omit(cf.classifyCombatFeatureItem(actor, item), ['tags'])),
      treeIdentity: realTreeIds(item),
      forceTalentCount: !!(item.system.isForce || tg.includes('force')),
      mysticMasteryForceTalent: forceRe.test([item.system.category, item.system.talent_tree, item.system.tree, ...tg].join(' ')),
      lightsaberFormLookup: (() => { const hs = [item.system.tree, item.system.talent_tree, item.system.category, item.system.treeId, ...tg].join(' ').toLowerCase(); return hs.includes('lightsaber form') || hs.includes('lightsaber_forms') || hs.includes('lightsaber-forms'); })()
    };
    return sig;
  }
  /** keys whose signature differs */
  const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);
  return { signature, diff, restore, treeIdsOf, tokenToTrees };
}
