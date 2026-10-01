#!/usr/bin/env node
/**
 * Phase 3H-2 — talent semantic authority (derived system metadata): for every canonical talent, the semantic tags its PUBLISHED RULE supports (Phase 11 vocabulary only),
 * each with matched evidence, plus the audit trail for every legacy tag that does not survive.
 *
 * Direction of authority: published rule -> rule meaning -> derived certified semantic tags. Archetype recommendations are never input here
 * (the archetype cross-check, tools/qa-talent-semantic-vs-archetypes.mjs, runs afterwards and cannot write back).
 *
 * One pin: `force`. Executable code counts "Force talents" by this tag (prerequisite-checker, prerequisite-evaluator), so its membership is held at today's set;
 * every disagreement with the rule text is itemised as a defect candidate for the mechanical-certification phase, not silently "fixed".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, read, parse, TALENTS, HOMEBREW, TREES, vocabulary, classifyTag, ALIASES } from './talent-semantic-common.mjs';
import { deriveTags } from './talent-semantic-rules.mjs';
import { loadIdentityOf } from './apply-talent-phase-3g.mjs';

export const OUT_JSON = 'data/audits/talent-phase-3h-semantic-authority.json', OUT_MD = 'docs/audits/talent-phase-3h-semantic-authority.md';
const descOf = t => (t.system.description && typeof t.system.description === 'object') ? t.system.description.value : t.system.description;
export const PINNED = { force: 'executable: prerequisite-checker / prerequisite-evaluator count Force talents by the `force` tag' };

export function authorityRow(t, ctx) {
  const treeName = ctx.trees.get(t.system.treeId)?.name ?? '';
  const derived = deriveTags({ benefit: t.system.benefit, description: descOf(t), treeName }, ctx.vocab);
  const current = Array.isArray(t.system.tags) ? t.system.tags : [];
  const tagMap = new Map(derived.map(d => [d.tag, d]));
  const pins = [];
  const oldForce = current.includes('force'), derivedForce = tagMap.has('force');
  if (oldForce && !derivedForce) { tagMap.set('force', { tag: 'force', confidence: 'PINNED', evidence: [{ source: 'runtime-pin', rule: PINNED.force, snippet: 'present on the current talent; rule text does not name the Force' }] }); pins.push({ tag: 'force', action: 'KEPT_AGAINST_TEXT' }); }
  if (!oldForce && derivedForce) { tagMap.delete('force'); pins.push({ tag: 'force', action: 'WITHHELD_FROM_TEXT_EVIDENCE', evidence: derived.find(d => d.tag === 'force').evidence }); }
  const proposed = [...tagMap.keys()].sort();
  const removed = [], aliases = [];
  for (const tag of current) {
    if (proposed.includes(tag)) continue;
    const c = classifyTag(tag, ctx.vocab);
    if (c.disposition === 'MAP_ALIAS') { if (proposed.includes(c.target)) { aliases.push({ from: tag, to: c.target }); continue; } removed.push({ tag, disposition: 'UNSUPPORTED', reason: `alias of ${c.target}; the rule text does not support ${c.target}` }); continue; }
    if (c.disposition === 'KEEP_CANONICAL') { removed.push({ tag, disposition: 'UNSUPPORTED', reason: 'in the vocabulary but the published rule text does not support it' }); continue; }
    removed.push({ tag, disposition: c.disposition, reason: c.kind ?? c.disposition });
  }
  const added = proposed.filter(x => !current.includes(x) && !aliases.some(a => a.to === x));
  return {
    id: t._id, canonicalIdentity: ctx.identityOf.get(t._id) ?? null, name: t.name, treeName,
    status: proposed.length ? 'TAGGED' : 'MISSING_SEMANTIC_TAGS',
    current, proposed, added, removed, aliasesNormalized: aliases, pins,
    tags: [...tagMap.values()].sort((a, b) => a.tag.localeCompare(b.tag)).map(d => ({ tag: d.tag, confidence: d.confidence, evidence: d.evidence }))
  };
}

export function buildAuthority() {
  const vocab = vocabulary(), talents = parse(read(TALENTS)), homebrew = parse(read(HOMEBREW)), trees = new Map(parse(read(TREES)).map(t => [t._id, t]));
  const ctx = { vocab, trees, identityOf: loadIdentityOf() };
  const rows = talents.map(t => authorityRow(t, ctx)).sort((a, b) => a.id.localeCompare(b.id));
  const tagCount = {}; for (const r of rows) for (const x of r.proposed) tagCount[x] = (tagCount[x] ?? 0) + 1;
  const conf = {}; for (const r of rows) for (const x of r.tags) conf[x.confidence] = (conf[x.confidence] ?? 0) + 1;
  const removedBy = {}; for (const r of rows) for (const x of r.removed) removedBy[x.disposition] = (removedBy[x.disposition] ?? 0) + 1;
  const forceMismatch = rows.filter(r => r.pins.length);
  const changed = rows.filter(r => JSON.stringify(r.current) !== JSON.stringify(r.proposed));
  return {
    schemaVersion: 1, phase: '3H-2', status: 'SEMANTIC_AUTHORITY', productionMutationPerformed: false,
    authority: 'published talent rule text (benefit/description) + semantic tree/domain; Phase 11 vocabulary only; archetype recommendations and legacy tags are never evidence',
    rules: 'tools/talent-semantic-rules.mjs', vocabulary: 'data/canonical/semantic-tag-vocabulary.json',
    counts: {
      canonicalTalents: rows.length, homebrewExcluded: homebrew.length, tagged: rows.filter(r => r.proposed.length).length, missingSemanticTags: rows.filter(r => !r.proposed.length).length,
      proposedTagInstances: rows.reduce((n, r) => n + r.proposed.length, 0), vocabularyTagsUsed: Object.keys(tagCount).length, vocabularyTagsUnused: vocab.filter(t => !tagCount[t]),
      talentsWhoseTagsChange: changed.length, tagsAdded: rows.reduce((n, r) => n + r.added.length, 0), tagsRemoved: rows.reduce((n, r) => n + r.removed.length, 0),
      aliasesNormalized: rows.reduce((n, r) => n + r.aliasesNormalized.length, 0), removedByDisposition: removedBy, evidenceConfidence: conf, forcePinDisagreements: forceMismatch.length,
      forceKeptAgainstText: forceMismatch.filter(r => r.pins[0].action === 'KEPT_AGAINST_TEXT').length, forceWithheldFromText: forceMismatch.filter(r => r.pins[0].action === 'WITHHELD_FROM_TEXT_EVIDENCE').length,
      tagUsage: Object.fromEntries(Object.entries(tagCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
    },
    rows
  };
}
const renderMd = a => { const c = a.counts; return ['# Phase 3H-2 — talent semantic authority (derived system metadata)', '',
  `${c.canonicalTalents} canonical talents (${c.homebrewExcluded} homebrew excluded). **${c.tagged}** receive at least one rule-evidenced tag; **${c.missingSemanticTags}** have no vocabulary concept in their rule text (MISSING_SEMANTIC_TAGS — an honest outcome, not a gap to fill by guessing).`, '',
  `- ${c.proposedTagInstances} proposed tag instances over ${c.vocabularyTagsUsed} vocabulary tags (unused by any talent: ${c.vocabularyTagsUnused.join(', ') || 'none'}).`,
  `- ${c.talentsWhoseTagsChange} talents change; ${c.tagsAdded} tags added, ${c.tagsRemoved} legacy tags removed, ${c.aliasesNormalized} aliases normalized.`,
  `- evidence confidence (tag assignments): ${JSON.stringify(c.evidenceConfidence)} — MEDIUM = general wording, itemised for owner review.`,
  `- removed legacy tags by disposition: ${JSON.stringify(c.removedByDisposition)}.`,
  `- \`force\` pin (executable Force-talent counting): ${c.forcePinDisagreements} talents disagree with their rule text (${c.forceKeptAgainstText} keep \`force\` against the text, ${c.forceWithheldFromText} do not receive it although the text names the Force) — defect candidates for Phase 3I.`, '',
  '## Tag usage', '', '| Tag | Talents |', '|---|---:|', ...Object.entries(c.tagUsage).map(([k, v]) => `| \`${k}\` | ${v} |`), '',
  `Per-talent evidence (matched snippets, removed-tag audit, alias normalization, pins) is in \`${OUT_JSON}\`.`, ''].join('\n'); };
export function main(argv = process.argv.slice(2)) {
  const a = buildAuthority(), json = JSON.stringify(a, null, 1) + '\n', md = renderMd(a);
  if (argv.includes('--check')) { if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || read(OUT_JSON) !== json || read(OUT_MD) !== md) { console.error('[3h-authority] STALE'); return 1; } console.log('[3h-authority] PASS'); return 0; }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md); console.log(JSON.stringify({ ...a.counts, tagUsage: undefined }, null, 1)); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
