#!/usr/bin/env node
// Pass 3C: tag census, cross-domain factual analysis, literal policy-compliance check, broad-tag review, closeout.
// Facts only: no recommendation, no tag creation/retirement, no semantic ruling. Deterministic and byte-stable. No production mutation.
// Compliance violations are LITERAL checks against existing owner authority only (vocabulary, hard implications, owner NO_CHANGE/ADD decisions,
// Pass 2 rejections and doNotInfer lists, baseline-prefix preservation, duplicate tags).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { DETECTORS, BROAD_TAGS } from './talent-feat-pass3b-detectors.mjs';
import { POLICY_DEFINES, POLICY_PARTIAL } from './talent-feat-owner-policy-map.mjs';

export const OUT = {
  censusJson: 'data/audits/talent-feat-pass3c-tag-census.json', censusMd: 'docs/audits/talent-feat-pass3c-tag-census.md',
  crossJson: 'data/audits/talent-feat-pass3c-cross-domain-analysis.json', crossMd: 'docs/audits/talent-feat-pass3c-cross-domain-analysis.md',
  closeJson: 'data/audits/talent-feat-pass3c-closeout.json', closeMd: 'docs/audits/talent-feat-pass3c-closeout.md'
};
export const RARE_MAX = 5; // factual threshold: a tag on <= 5 records is labelled RARE
export const COTAG_DIFF_MIN = 0.25; // factual threshold: absolute difference in P(co-tag | tag) between domains
const AUTH = 'data/audits/talent-feat-pass3b-semantic-authority.json';
const OVERLAY = 'data/audits/talent-feat-pass3b-owner-adjudication.json';
const DISC = 'data/audits/talent-feat-pass3b-exact-mechanic-convergence.json';
const P2 = 'data/audits/feat-tags-pass2-semantic-authority.json';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const r3 = (x) => Math.round(x * 1000) / 1000;
const topN = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).slice(0, n);

export function buildAll() {
  const auth = readJson(AUTH), overlay = readJson(OVERLAY), disc = readJson(DISC), p2 = readJson(P2);
  const vocab = auth.sharedVocabulary && Array.isArray(auth.sharedVocabulary.tags) ? auth.sharedVocabulary.tags : readJson('data/audits/talent-feat-pass3b-mechanic-baseline.json').sharedVocabulary;
  const recs = auth.records, N = recs.length;
  const dom = { FEAT: recs.filter(r => r.domain === 'FEAT'), TALENT: recs.filter(r => r.domain === 'TALENT') };
  const stat = new Map(vocab.map(t => [t, { tag: t, FEAT: 0, TALENT: 0, co: { FEAT: new Map(), TALENT: new Map(), ALL: new Map() } }]));
  for (const r of recs) {
    const ts = [...new Set(r.finalTags)].filter(t => stat.has(t));
    for (const t of ts) {
      const s = stat.get(t); s[r.domain]++;
      for (const u of ts) if (u !== t) { for (const k of [r.domain, 'ALL']) s.co[k].set(u, (s.co[k].get(u) || 0) + 1); }
    }
  }
  const detByTag = new Map(); for (const d of DETECTORS) { if (!detByTag.has(d.tag)) detByTag.set(d.tag, []); detByTag.get(d.tag).push(d.id); }
  const dstat = new Map(disc.detectorStats.map(d => [d.id, d]));
  const impl = (t) => ({ asAntecedent: REQUIRED_IMPLICATIONS.filter(([a]) => a === t).map(([, b]) => b), asConsequent: REQUIRED_IMPLICATIONS.filter(([, b]) => b === t).map(([a]) => a) });
  const census = vocab.map(t => {
    const s = stat.get(t), total = s.FEAT + s.TALENT, ids = detByTag.get(t) || [];
    return {
      tag: t, records: total, feats: s.FEAT, talents: s.TALENT, pctOfCorpus: r3(100 * total / N), pctOfFeats: r3(100 * s.FEAT / dom.FEAT.length), pctOfTalents: r3(100 * s.TALENT / dom.TALENT.length),
      domainStatus: total === 0 ? 'UNUSED' : s.FEAT === 0 ? 'TALENT_ONLY' : s.TALENT === 0 ? 'FEAT_ONLY' : 'BOTH_DOMAINS', rareStatus: total === 0 ? 'UNUSED' : total <= RARE_MAX ? 'RARE' : 'NOT_RARE',
      topCoTags: topN(s.co.ALL, 5).map(([x, c]) => ({ tag: x, records: c })), topCoTagsFeat: topN(s.co.FEAT, 5).map(([x, c]) => ({ tag: x, records: c })), topCoTagsTalent: topN(s.co.TALENT, 5).map(([x, c]) => ({ tag: x, records: c })),
      implicationParticipation: impl(t), detectorCoverage: { detectors: ids, detectorCount: ids.length, recordsMatchedByDetectors: ids.reduce((a, id) => a + (dstat.get(id)?.detected || 0), 0) }
    };
  });
  // cross-domain
  const cross = vocab.map(t => {
    const s = stat.get(t), f = s.FEAT, k = s.TALENT, diffs = [];
    if (f && k) for (const u of new Set([...s.co.FEAT.keys(), ...s.co.TALENT.keys()])) {
      const pf = (s.co.FEAT.get(u) || 0) / f, pt = (s.co.TALENT.get(u) || 0) / k;
      if (Math.abs(pf - pt) >= COTAG_DIFF_MIN) diffs.push({ coTag: u, featRate: r3(pf), talentRate: r3(pt), difference: r3(pf - pt) });
    }
    diffs.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference) || cmp(a.coTag, b.coTag));
    const ds = detByTag.get(t) || [];
    return { tag: t, feats: f, talents: k, featRatePct: r3(100 * f / dom.FEAT.length), talentRatePct: r3(100 * k / dom.TALENT.length), rateRatioFeatOverTalent: k && f ? r3((f / dom.FEAT.length) / (k / dom.TALENT.length)) : null,
      domainStatus: f && k ? 'BOTH_DOMAINS' : f ? 'FEAT_ONLY' : k ? 'TALENT_ONLY' : 'UNUSED', coTagDifferences: diffs,
      detectorPerDomain: ds.map(id => ({ id, FEAT: dstat.get(id)?.perDomain?.FEAT || null, TALENT: dstat.get(id)?.perDomain?.TALENT || null })) };
  });
  // policy compliance (literal)
  const viol = []; const V = (rule, r, detail) => viol.push({ state: 'PASS3C_POLICY_VIOLATION', rule, domain: r.domain, canonicalId: r.canonicalId, name: r.name, detail });
  const vs = new Set(vocab), byKey = new Map(recs.map(r => [`${r.domain}:${r.canonicalId}`, r]));
  const p2by = new Map(p2.assignments.map(a => [a.canonicalId, a]));
  for (const r of recs) {
    const ft = r.finalTags;
    if (new Set(ft).size !== ft.length) V('NO_DUPLICATE_TAGS', r, 'duplicate tag in finalTags');
    for (const t of ft) if (!vs.has(t)) V('SHARED_VOCABULARY_ONLY', r, `unknown tag ${t}`);
    for (const [a, b] of REQUIRED_IMPLICATIONS) if (ft.includes(a) && !ft.includes(b)) V('HARD_IMPLICATION', r, `${a} requires ${b}`);
    if (JSON.stringify(ft.slice(0, r.baselineTags.length)) !== JSON.stringify(r.baselineTags)) V('BASELINE_PREFIX_PRESERVED', r, 'baseline tags removed or reordered');
    if (r.domain === 'FEAT') { const a = p2by.get(r.canonicalId); if (a) { for (const x of a.pass2Adjudication?.doNotInfer || []) if (ft.includes(x) && !r.baselineTags.includes(x) && !(overlay.decisions.some(d => d.domain === 'FEAT' && d.canonicalId === r.canonicalId && d.tag === x && d.ownerAction === 'ADD'))) V('PASS2_DO_NOT_INFER', r, `${x} present`); for (const j of a.pass2Rejections || []) if (ft.includes(j.rejectedTag) && !a.finalTags.includes(j.rejectedTag)) V('PASS2_REJECTED_TAG_ABSENT', r, `${j.rejectedTag} present`); } }
  }
  for (const d of overlay.decisions) {
    const r = byKey.get(`${d.domain}:${d.canonicalId}`);
    if (!r) { viol.push({ state: 'PASS3C_POLICY_VIOLATION', rule: 'DECISION_TARGETS_RECORD', domain: d.domain, canonicalId: d.canonicalId, name: d.name, detail: 'record missing' }); continue; }
    const has = r.finalTags.includes(d.tag), had = r.baselineTags.includes(d.tag);
    if (d.ownerAction === 'ADD' && !has) V('OWNER_ADD_PRESENT', r, `${d.tag} missing`);
    if (d.ownerAction === 'NO_CHANGE' && has && !had) V('OWNER_NO_CHANGE_RESPECTED', r, `${d.tag} added despite NO_CHANGE`);
  }
  viol.sort((a, b) => cmp(a.rule, b.rule) || cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId));
  // broad-tag review
  const broadFlag = new Set([...BROAD_TAGS, ...disc.tagDefinitionAudit.filter(a => a.broad).map(a => a.tag)]);
  const broad = [...broadFlag].sort(cmp).map(t => {
    const c = census.find(x => x.tag === t), full = POLICY_DEFINES[t] || [], part = POLICY_PARTIAL[t] || [];
    const status = full.length ? 'OWNER_DEFINED' : part.length ? 'PARTIALLY_OWNER_DEFINED' : 'PHASE3D_OWNER_DEFINITION_REQUIRED';
    return { tag: t, listedByOwner: BROAD_TAGS.includes(t), records: c.records, feats: c.feats, talents: c.talents, pctOfCorpus: c.pctOfCorpus, controllingPolicies: full, partialPolicies: part, state: status };
  });
  return { auth, vocab, census, cross, viol, broad, N, dom };
}

const tb = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.join(' | ')} |`)];
const c = (x) => '`' + x + '`';
export function buildOutputs() {
  const { census, cross, viol, broad, N, dom, vocab } = buildAll();
  const base = { schemaVersion: '1.0', basis: { authority: AUTH, overlay: OVERLAY, corpus: N, feats: dom.FEAT.length, talents: dom.TALENT.length, vocabulary: vocab.length }, note: 'Facts only. No recommendation, no tag created or retired, no semantic ruling.' };
  const summary = {
    unusedTags: census.filter(x => x.domainStatus === 'UNUSED').map(x => x.tag), featOnlyTags: census.filter(x => x.domainStatus === 'FEAT_ONLY').map(x => x.tag), talentOnlyTags: census.filter(x => x.domainStatus === 'TALENT_ONLY').map(x => x.tag),
    rareTags: census.filter(x => x.rareStatus === 'RARE').map(x => x.tag), tagsWithNoDetector: census.filter(x => x.detectorCoverage.detectorCount === 0).length
  };
  const censusObj = { ...base, kind: 'TALENT_FEAT_PASS3C_TAG_CENSUS', status: 'CENSUS_FACTS_ONLY', thresholds: { RARE_MAX }, summary, tags: census };
  const crossObj = { ...base, kind: 'TALENT_FEAT_PASS3C_CROSS_DOMAIN_ANALYSIS', status: 'FACTS_ONLY', thresholds: { COTAG_DIFF_MIN }, summary: { featOnly: summary.featOnlyTags.length, talentOnly: summary.talentOnlyTags.length, both: cross.filter(x => x.domainStatus === 'BOTH_DOMAINS').length, tagsWithCoTagDomainDifferences: cross.filter(x => x.coTagDifferences.length).length }, tags: cross };
  const byRule = {}; for (const v of viol) byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  const needDef = broad.filter(b => b.state === 'PHASE3D_OWNER_DEFINITION_REQUIRED');
  const closeObj = { ...base, kind: 'TALENT_FEAT_PASS3C_CLOSEOUT', status: viol.length ? 'PASS3C_OPEN_POLICY_VIOLATIONS' : 'PASS3C_COMPLETE_ZERO_LITERAL_VIOLATIONS',
    counts: { vocabulary: vocab.length, policyViolations: viol.length, domainOnlyTags: summary.featOnlyTags.length + summary.talentOnlyTags.length, rareTags: summary.rareTags.length, unusedTags: summary.unusedTags.length, broadTagsReviewed: broad.length, broadTagsOwnerDefined: broad.filter(b => b.state === 'OWNER_DEFINED').length, broadTagsPartial: broad.filter(b => b.state === 'PARTIALLY_OWNER_DEFINED').length, broadTagsDefinitionRequired: needDef.length },
    violationsByRule: byRule, violations: viol, broadTagReview: broad, phase3dMayStart: viol.length === 0 };
  const L1 = ['# Pass 3C — Tag Census (facts only)', '', `Corpus ${N} (${dom.FEAT.length} feats / ${dom.TALENT.length} talents); vocabulary ${vocab.length}. RARE means <= ${RARE_MAX} records. No recommendation is made.`, '',
    `Unused: ${summary.unusedTags.length}; feat-only: ${summary.featOnlyTags.length}; talent-only: ${summary.talentOnlyTags.length}; rare: ${summary.rareTags.length}; tags with no detector: ${summary.tagsWithNoDetector}.`, '',
    ...tb(['Tag', 'Records', 'Feats', 'Talents', '% corpus', 'Domain', 'Rare', 'Top co-tags', 'Implications', 'Detectors (matched)'], census.map(x => [c(x.tag), x.records, x.feats, x.talents, x.pctOfCorpus, x.domainStatus, x.rareStatus, x.topCoTags.map(y => `${y.tag}:${y.records}`).join(', ') || '—', [...x.implicationParticipation.asAntecedent.map(y => `→${y}`), ...x.implicationParticipation.asConsequent.map(y => `←${y}`)].join(' ') || '—', `${x.detectorCoverage.detectorCount} (${x.detectorCoverage.recordsMatchedByDetectors})`])), ''];
  const L2 = ['# Pass 3C — Cross-Domain Analysis (facts only)', '', `Domain-only tags: ${summary.featOnlyTags.length} feat-only, ${summary.talentOnlyTags.length} talent-only. Co-tag differences listed where |P(co-tag|tag, feat) − P(co-tag|tag, talent)| >= ${COTAG_DIFF_MIN}.`, '',
    `Feat-only: ${summary.featOnlyTags.map(c).join(', ') || '—'}`, '', `Talent-only: ${summary.talentOnlyTags.map(c).join(', ') || '—'}`, '',
    ...tb(['Tag', 'Feat %', 'Talent %', 'Feat/Talent ratio', 'Domain', 'Co-tag differences (feat vs talent rate)'], cross.map(x => [c(x.tag), x.featRatePct, x.talentRatePct, x.rateRatioFeatOverTalent ?? '—', x.domainStatus, x.coTagDifferences.slice(0, 4).map(d => `${d.coTag} ${d.featRate}/${d.talentRate}`).join('; ') || '—'])), ''];
  const L3 = ['# Pass 3C — Closeout', '', `Status: ${c(closeObj.status)}. Literal policy violations: **${viol.length}**. Phase 3D may start: **${closeObj.phase3dMayStart}**.`, '',
    ...Object.entries(closeObj.counts).map(([k, v]) => `- ${k}: ${v}`), '', '## Violations by rule', '', ...(Object.keys(byRule).length ? Object.entries(byRule).map(([k, v]) => `- ${k}: ${v}`) : ['- none']), '',
    '## Broad-tag review', '', ...tb(['Tag', 'Owner-listed', 'Records', 'Feats', 'Talents', '% corpus', 'State', 'Policies'], broad.map(b => [c(b.tag), b.listedByOwner ? 'yes' : 'no', b.records, b.feats, b.talents, b.pctOfCorpus, b.state, [...b.controllingPolicies, ...b.partialPolicies].join(', ') || '—'])), ''];
  const J = (o) => JSON.stringify(o, null, 2) + '\n';
  return { [OUT.censusJson]: J(censusObj), [OUT.censusMd]: L1.join('\n'), [OUT.crossJson]: J(crossObj), [OUT.crossMd]: L2.join('\n'), [OUT.closeJson]: J(closeObj), [OUT.closeMd]: L3.join('\n'), _closeObj: closeObj };
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs(); const files = Object.keys(out).filter(k => !k.startsWith('_'));
  if (process.argv.includes('--check')) { for (const f of files) if (fs.readFileSync(path.join(ROOT, f), 'utf8') !== out[f]) { console.error(`Pass 3C output differs: ${f}`); process.exit(1); } console.log('PASS 3C OUTPUTS MATCH A FRESH RUN'); }
  else { for (const f of files) fs.writeFileSync(path.join(ROOT, f), out[f]); const k = out._closeObj; console.log(`PASS 3C: violations ${k.counts.policyViolations}; domain-only ${k.counts.domainOnlyTags}; rare ${k.counts.rareTags}; broad ${k.counts.broadTagsReviewed} (defined ${k.counts.broadTagsOwnerDefined}, partial ${k.counts.broadTagsPartial}, required ${k.counts.broadTagsDefinitionRequired})`); }
}
