#!/usr/bin/env node
/**
 * Phase 3H-1 — read-only metadata census of every canonical talent (1,187) plus a separate homebrew report (50).
 * Captures identity, tree, source, text fingerprints, structured prerequisites, tags (shape + per-tag disposition), flags, abilityMeta,
 * ActiveEffects, action/choice/modifier-like metadata. Writes only audit artifacts; never touches a pack.
 *   (default) write   --check  the committed census equals a fresh run
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT, read, parse, TALENTS, HOMEBREW, TREES, vocabulary, classifyTag } from './talent-semantic-common.mjs';
import { loadIdentityOf } from './apply-talent-phase-3g.mjs';

export const OUT_JSON = 'data/audits/talent-phase-3h-metadata-census.json', OUT_MD = 'docs/audits/talent-phase-3h-metadata-census.md';
const h = v => crypto.createHash('sha1').update(JSON.stringify(v ?? null)).digest('hex').slice(0, 12);
const descOf = t => (t.system.description && typeof t.system.description === 'object') ? t.system.description.value : t.system.description;
const shapeOf = g => g === undefined ? 'undefined' : g === null ? 'null' : Array.isArray(g) ? (g.length ? (g.every(x => typeof x === 'string') ? 'array<string>' : 'array<mixed>') : 'array<empty>') : typeof g;
const count = (arr, f) => arr.reduce((o, x) => { const k = f(x); o[k] = (o[k] ?? 0) + 1; return o; }, {});
const sortObj = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));

export function rowOf(t, ctx) {
  const s = t.system, tree = ctx.trees.get(s.treeId), am = s.abilityMeta && typeof s.abilityMeta === 'object' ? s.abilityMeta : null;
  const tags = Array.isArray(s.tags) ? s.tags : [];
  const ps = s.prerequisitesStructured;
  return {
    id: t._id, canonicalIdentity: ctx.identityOf.get(t._id) ?? null, name: t.name,
    treeId: s.treeId ?? null, treeName: tree?.name ?? null, treeIdentity: tree ? `${tree.name}|${tree._id}` : null,
    source: s.source ?? null, page: s.page ?? null,
    text: { benefit: h(s.benefit), description: h(descOf(t)), prerequisites: h(s.prerequisites), summary: h(s.summary), benefitLength: String(s.benefit ?? '').length },
    structuredPrerequisiteLeaves: ps ? ps.conditions?.length ?? 0 : 0,
    tags: { shape: shapeOf(s.tags), value: tags, dispositions: tags.map(x => ({ tag: x, ...classifyTag(x, ctx.vocab) })) },
    flags: { keys: Object.keys(t.flags ?? {}).sort(), swseKeys: Object.keys(t.flags?.swse ?? {}).sort(), hash: h(t.flags) },
    abilityMeta: am ? { present: true, hash: h(am), executionModel: s.executionModel ?? null, subType: s.subType ?? null, mechanicsMode: am.mechanicsMode ?? null, manualResolution: am.manualResolution === true,
      requiresSelectedChoice: am.requiresSelectedChoice === true, modifiers: Array.isArray(am.modifiers) ? am.modifiers.length : 0, rules: Array.isArray(am.rules) ? am.rules.length : 0, combatActions: Array.isArray(am.combatActions) ? am.combatActions.length : 0, ownTags: Array.isArray(am.tags) ? am.tags.length : 0 } : { present: false },
    activeEffects: { count: Array.isArray(t.effects) ? t.effects.length : 0, hash: h(t.effects) },
    grantsActions: Array.isArray(s.grantsActions) ? s.grantsActions.length : 0, choiceMeta: !!s.choiceMeta, systemEffectField: s.effect !== undefined || s.effects !== undefined, attackOptionMetadata: !!(am?.attackAbilityRules || am?.areaAttack || am?.riderRules)
  };
}

export function build() {
  const vocab = vocabulary(), talents = parse(read(TALENTS)), homebrew = parse(read(HOMEBREW)), trees = new Map(parse(read(TREES)).map(t => [t._id, t]));
  const ctx = { vocab, trees, identityOf: loadIdentityOf() };
  const rows = talents.map(t => rowOf(t, ctx)).sort((a, b) => a.id.localeCompare(b.id));
  const hb = homebrew.map(t => rowOf(t, ctx)).sort((a, b) => a.id.localeCompare(b.id));
  const tagCount = {}; for (const r of rows) for (const x of r.tags.value) tagCount[x] = (tagCount[x] ?? 0) + 1;
  const tagRows = Object.entries(tagCount).map(([tag, n]) => ({ tag, talents: n, ...classifyTag(tag, vocab) })).sort((a, b) => b.talents - a.talents || a.tag.localeCompare(b.tag));
  const byDisp = count(tagRows, r => r.disposition);
  const instances = count(rows.flatMap(r => r.tags.dispositions), d => d.disposition);
  return {
    schemaVersion: 1, phase: '3H-1', status: 'READ_ONLY_CENSUS', productionMutationPerformed: false,
    counts: {
      canonicalTalents: rows.length, withCanonicalIdentity: rows.filter(r => r.canonicalIdentity).length, homebrewTalents: homebrew.length,
      vocabulary: vocab.length, uniqueLegacyTags: tagRows.length, tagInstances: rows.reduce((n, r) => n + r.tags.value.length, 0),
      tagShapes: count(rows, r => r.tags.shape), untagged: rows.filter(r => !r.tags.value.length).length, noTagsField: rows.filter(r => r.tags.shape === 'undefined').length,
      legacyTagsByDisposition: byDisp, tagInstancesByDisposition: instances,
      legacyTagsInVocabulary: tagRows.filter(r => r.disposition === 'KEEP_CANONICAL').length, vocabularyTagsUnused: vocab.filter(t => !tagCount[t]).length,
      withAbilityMeta: rows.filter(r => r.abilityMeta.present).length, withActiveEffects: rows.filter(r => r.activeEffects.count).length, withGrantsActions: rows.filter(r => r.grantsActions).length,
      withChoiceMeta: rows.filter(r => r.choiceMeta).length, withAbilityMetaOwnTags: rows.filter(r => r.abilityMeta.ownTags).length, withStructuredPrerequisites: rows.filter(r => r.structuredPrerequisiteLeaves).length
    },
    homebrew: { count: hb.length, uniqueTags: new Set(hb.flatMap(r => r.tags.value)).size, ids: hb.map(r => r.id), note: 'reported separately; excluded from the 1,187 production denominator and never modified by Phase 3H' },
    tags: tagRows, rows
  };
}

const renderMd = c => {
  const n = c.counts;
  return ['# Phase 3H-1 — talent metadata census (read-only)', '',
    `**${n.canonicalTalents} / 1,187** canonical talents (${n.withCanonicalIdentity} with certified canonical identity); ${n.homebrewTalents} homebrew reported separately and excluded.`, '',
    '## Tags today', '', `- shape: ${JSON.stringify(n.tagShapes)} — \`system.tags\` is always an array of strings when present.`, `- ${n.uniqueLegacyTags} unique tags, ${n.tagInstances} instances; ${n.untagged} talents untagged (${n.noTagsField} have no \`tags\` field at all).`,
    `- Phase 11 vocabulary: ${n.vocabulary} tags; ${n.legacyTagsInVocabulary} legacy tags are already vocabulary members; ${n.vocabularyTagsUnused} vocabulary tags are not used by any talent today.`, '',
    '## Legacy tag dispositions (unique tags / tag instances)', '', '| Disposition | Unique tags | Instances |', '|---|---:|---:|', ...Object.keys({ ...n.legacyTagsByDisposition, ...n.tagInstancesByDisposition }).sort().map(k => `| ${k} | ${n.legacyTagsByDisposition[k] ?? 0} | ${n.tagInstancesByDisposition[k] ?? 0} |`), '',
    '## Other machine-readable metadata', '', `- \`abilityMeta\`: ${n.withAbilityMeta} talents (own \`abilityMeta.tags\` on ${n.withAbilityMetaOwnTags}); ActiveEffects on ${n.withActiveEffects}; \`grantsActions\` on ${n.withGrantsActions}; \`choiceMeta\` on ${n.withChoiceMeta}; structured prerequisites on ${n.withStructuredPrerequisites}.`,
    `- Executable metadata is inventoried here, **not** changed by Phase 3H.`, '',
    `Per-talent rows (identity, tree, source/page, text fingerprints, tags + dispositions, flags, abilityMeta, effects) are in \`${OUT_JSON}\`.`, ''].join('\n');
};

export function main(argv = process.argv.slice(2)) {
  const c = build(), json = JSON.stringify(c, null, 1) + '\n', md = renderMd(c);
  if (argv.includes('--check')) { if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || read(OUT_JSON) !== json || read(OUT_MD) !== md) { console.error('[3h-census] STALE'); return 1; } console.log(`[3h-census] PASS: ${c.counts.canonicalTalents} talents`); return 0; }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md); console.log(JSON.stringify(c.counts, null, 1)); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
