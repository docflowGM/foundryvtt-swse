#!/usr/bin/env node
// Phase 5C-2: deterministic feat production generator. Reads ONLY data/canonical/feats.json and writes
//   packs/feats.db, packs/feats.db.sha256, data/feat-catalog.json (generated compatibility projection),
//   data/feat-effects.json, data/feat-choice-options.json, data/feat-metadata.json, data/feat-combat-actions.json,
//   data/feat-validity-registry.json (generated companion files), data/migrations/feat-canonical-aliases.json.
// Nothing here reads packs, the catalog, fixes or audits. `--check` fails on any byte of drift (hand-edited generated output).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT, readText, sha, clone, cmp } from './lib/canonical-weapons-shared.mjs';
import { CANONICAL_FEATS } from './build-canonical-feats.mjs';
import { CANONICAL_WEAPONS } from './lib/canonical-weapons-shared.mjs';

export const OUT = {
  pack: 'packs/feats.db', packSha: 'packs/feats.db.sha256', catalog: 'data/feat-catalog.json',
  featEffects: 'data/feat-effects.json', choiceOptions: 'data/feat-choice-options.json', featMetadata: 'data/feat-metadata.json',
  combatActions: 'data/feat-combat-actions.json', validityRegistry: 'data/feat-validity-registry.json',
  aliases: 'data/migrations/feat-canonical-aliases.json', buckets: 'data/feat-buckets-and-subbuckets.json',
};

const html = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A feat that did not exist in the pre-cutover catalog: built from the certified content authority only. */
function newFeatSystem(r) {
  const pub = r.certifiedPublications[0];
  const c = pub.content;
  const prereq = c.canonicalPrerequisites || 'None';
  const rules = c.canonicalRulesShape ?? [];
  const benefit = rules.join(' ');
  // same-name distinct identities need distinct slugs (slug backs the swse.feat.<slug> canonical uuid)
  const slug = r.sameNameCollisionType === 'DISTINCT_FEAT_IDENTITIES' ? `${r.normalizedName}-${r.phase1APrimaryPublication.sourceKey}` : r.normalizedName;
  const src = r.primaryPublication.source;
  const bucket = r.semantic.finalTags.includes('melee') || r.semantic.finalTags.includes('ranged') ? 'Combat' : 'Skills';
  return {
    description: `<p><strong>Prerequisites:</strong> ${html(prereq)}</p>\n<p><strong>Effect:</strong> ${html(benefit)}</p>`,
    source: src, slug, featType: 'general', subType: 'STATE',
    prerequisites: prereq, prerequisite: prereq, prerequisitesText: prereq,
    benefit, effect: benefit, normalText: '', special: '', shortSummary: c.quickSummary,
    sourcebook: src, page: r.primaryPublication.page, referenceBooks: [src],
    tags: ['feat', 'general'], bonus_feat_for: [], uses: { current: 0, max: 0, perDay: false }, costNumeric: 0,
    executionModel: 'PASSIVE', grantsActions: [], grantsBonuses: { skills: {}, combat: {}, other: {} },
    toggleable: false, toggled: false, variable: false, variableValue: 0, archetype: '', playstyle: '', tier: 0,
    iconPath: 'icons/svg/upgrade.svg', bucket, subbucket: '', secondaryBuckets: [], taxonomyConfidence: 'medium', taxonomyReviewed: false,
    taxonomy: { bucket, subbucket: '', secondaryBuckets: [], tags: [], confidence: 'medium', reviewed: false, sourceReviewReason: 'Created by the Phase 5C cutover from the certified content authority; taxonomy review pending.' },
  };
}

export function projectFeatDoc(r, corpusVersion) {
  const p = r.production;
  const system = p.legacySystemCapture ? clone(p.legacySystemCapture) : newFeatSystem(r);
  // certified provenance (321 page / 93 source corrections) and canonical display name
  system.source = r.primaryPublication.source; system.sourcebook = r.primaryPublication.source; system.page = r.primaryPublication.page;
  // legacy system.tags stay (runtime consumers read some of them); certified semantics are carried alongside
  system.semanticTags = [...r.semantic.finalTags];
  const flags = clone(p.flags);
  flags.swse = { ...(flags.swse ?? {}), canonicalFeat: { canonicalId: r.canonicalId, identityKey: r.identityKey, corpusVersion } };
  return { _id: p.id, name: r.displayName, type: 'feat', img: p.img, system, effects: clone(p.effects), folder: p.folder, sort: p.sort, ownership: { default: p.ownershipDefault }, flags };
}

/** GENERATED_COMPATIBILITY: the picker bucket taxonomy view derived from the generated feat documents (system.bucket / system.subbucket). */
function bucketView(docs) {
  const by = {};
  for (const d of docs) ((by[d.system.bucket] ??= {})[d.system.subbucket] ??= []).push(d.name);
  const bucketSummary = {};
  for (const b of Object.keys(by).sort()) {
    const subbuckets = {};
    for (const sb of Object.keys(by[b]).sort()) subbuckets[sb] = { count: by[b][sb].length, feats: [...by[b][sb]].sort(cmp) };
    bucketSummary[b] = { count: Object.values(subbuckets).reduce((n, x) => n + x.count, 0), subbuckets };
  }
  return { intent: 'Feat picker bucket taxonomy, GENERATED from data/canonical/feats.json via the generated feat documents. Do not edit.', totalFeats: docs.length, bucketSummary };
}

const j2 = (o) => JSON.stringify(o, null, 2);

/**
 * Weapon-valued feat options are DERIVED from data/canonical/weapons.json (one-way dependency feats -> weapons): every specific weapon
 * option resolves to exactly one canonical weapon identity. Generic choices stay structural (weaponGroups).
 */
export function exoticWeaponOptions(corpus, weaponsCorpus) {
  const overrides = corpus.companions.exoticCategoryOverrides?.overrides ?? {};
  const lists = { melee: [], ranged: [] }, identities = {};
  for (const i of weaponsCorpus.identities.filter((x) => x.weaponGroup === 'Exotic Weapon')) {
    const cat = overrides[i.canonicalName] ?? i.canonicalStats.attackProfiles[0].schemaFamily.branch;
    if (!lists[cat]) throw new Error(`exotic weapon ${i.canonicalName}: no option category for branch ${cat}`);
    lists[cat].push(i.canonicalName);
    identities[i.canonicalName] = { identityKey: i.identityKey, productionId: i.production.id };
  }
  const lightsaber = weaponsCorpus.identities.filter((x) => x.weaponGroup === 'Lightsaber');
  for (const i of lightsaber) identities[i.canonicalName] = { identityKey: i.identityKey, productionId: i.production.id };
  return { melee: lists.melee.sort(cmp), ranged: lists.ranged.sort(cmp), lightsaberLikeRepositoryEntries: lightsaber.map((i) => i.canonicalName).sort(cmp), identities: Object.fromEntries(Object.entries(identities).sort(([a], [b]) => cmp(a, b))) };
}

export function generate(corpus, weaponsCorpus = JSON.parse(readText(CANONICAL_WEAPONS))) {
  const ids = corpus.identities;
  const docs = ids.map((r) => projectFeatDoc(r, corpus.schemaVersion)).sort((a, b) => cmp(a._id, b._id));
  const packText = docs.map((d) => JSON.stringify(d)).join('\n') + '\n';
  const catalogText = j2(docs) + '\n';
  // feat-effects: definitions derive from each identity's automation capture
  const defs = {};
  for (const r of ids) if (r.production.automation) defs[r.production.automation.featKey] = r.production.automation.definition;
  const effs = Object.values(defs).flatMap((d) => d.effects ?? []);
  const fxMeta = { ...corpus.companions.featEffects._meta, generatedFrom: CANONICAL_FEATS, featCount: docs.length, featsWithEffects: Object.keys(defs).length, effectCount: effs.length, generatedEffectIds: effs.filter((e) => e._provenance?.generatedId).length, transferTrueEffects: effs.filter((e) => e.transfer === true).length };
  const aliases = {
    schemaVersion: '5C.1', role: 'MIGRATION_ALIAS_ONLY',
    purpose: 'Maps retired pre-cutover feat ids to their canonical feat (plus, for implementation derivatives, the explicit choice). Contains no feat definitions; nothing may read it to define a feat.',
    canonicalWeaponProficiencyId: corpus.counts.weaponProficiencyCanonicalId,
    aliases: corpus.retiredProductionRecords.map((x) => ({ oldId: x.oldId, oldName: x.oldName, disposition: x.disposition, canonicalFeatId: x.parentCanonicalId ?? x.replacementCanonicalId ?? null, choice: x.choice ?? null })),
  };
  return {
    [OUT.pack]: packText,
    [OUT.packSha]: `${crypto.createHash('sha256').update(packText).digest('hex')}  packs/feats.db\n`,
    [OUT.catalog]: catalogText,
    [OUT.featEffects]: j2({ _meta: fxMeta, definitions: defs }) + '\n',
    [OUT.choiceOptions]: j2(Object.fromEntries(Object.entries(corpus.companions.choiceOptions).flatMap(([k, v]) => (k === 'weaponGroups' ? [[k, v], ['exoticWeapons', exoticWeaponOptions(corpus, weaponsCorpus)]] : [[k, v]])))) + '\n',
    [OUT.featMetadata]: j2(corpus.companions.featMetadata) + '\n',
    [OUT.combatActions]: j2(corpus.companions.combatActions) + '\n',
    [OUT.validityRegistry]: j2(corpus.companions.validityRegistry) + '\n',
    [OUT.aliases]: j2(aliases) + '\n',
    [OUT.buckets]: j2(bucketView(docs)) + '\n',
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const corpus = JSON.parse(readText(CANONICAL_FEATS));
  const out = generate(corpus);
  if (process.argv.includes('--check')) {
    const bad = Object.entries(out).filter(([f, t]) => !fs.existsSync(path.join(ROOT, f)) || readText(f) !== t).map(([f]) => f);
    if (bad.length) { console.error(`feat production drift (generated files differ from data/canonical/feats.json):\n${bad.join('\n')}`); process.exit(1); }
    console.log(`feat production OK: ${Object.keys(out).length} generated files match the canonical corpus`);
  } else {
    for (const [f, t] of Object.entries(out)) { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), t); }
    console.log(`generated ${Object.keys(out).length} feat production files from ${CANONICAL_FEATS} (${corpus.identities.length} feats; pack sha256 ${sha(out[OUT.pack])})`);
  }
}
