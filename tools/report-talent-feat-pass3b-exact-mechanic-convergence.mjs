#!/usr/bin/env node
// Pass 3B exact-mechanic convergence DISCOVERY report (report-only). Compares how feats and talents represent the same explicit mechanics.
// Three separate evidence channels: (1) rule-trigger detection, (2) cross-domain mechanic bundles, (3) tag-definition reverse audit.
// Detectors identify records that invoke a mechanic; they never assign tags. Only previously certified owner rulings receive an automatic
// terminal state; every new disagreement is PASS3B_OWNER_REVIEW (or evidence-only when confidence/comparators are insufficient).
// AUTHORITY BOUNDARY: the owner defines semantics and adjudicates; this tool only executes deterministic analysis, applies explicit prior owner
// rulings, and reports evidence. It never decides equivalence, intentional divergence, domain specificity, tag meaning, ontology need, or tag changes.
// Writes only the report JSON/MD. No production mutation, no overlay, no tag changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, REQUIRED_IMPLICATIONS } from './validate-feat-tags-semantic-authority.mjs';
import { BASELINE3B_PATH, SOURCE_FILES, sha, buildBaseline3B } from './build-talent-feat-pass3b-mechanic-baseline.mjs';
import { DETECTORS, AUX, BUNDLES, BROAD_TAGS, GAP_CONCEPTS, FAMILIES } from './talent-feat-pass3b-detectors.mjs';
import { OWNER_NAMED_CHAINS } from './report-feat-tags-pass2-family-analysis.mjs';

export const REPORT_JSON = 'data/audits/talent-feat-pass3b-exact-mechanic-convergence.json';
export const REPORT_MD = 'docs/audits/talent-feat-pass3b-exact-mechanic-convergence.md';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// A detector whose overall tagged-rate is below this is not an established tagging convention; its misses are reported once as a
// tag-convention question (P3) instead of one owner-review item per record.
export const CONVENTION_MIN_RATE = 0.5;
// Statuses this tool may ASSIGN. PASS3B_EXACT_CONVERGENCE / PASS3B_DOMAIN_SPECIFIC / PASS3B_TEXT_MATCH_NOT_MECHANIC are owner rulings and are never assigned to new findings;
// PASS3B_INTENTIONAL_DIVERGENCE is assigned only where an already-issued owner ruling names the record.
// PASS3B_OWNER_APPROVED / PASS3B_OWNER_NO_CHANGE are derived only from explicit owner decisions in the cumulative owner overlay.
const ASSIGNABLE_STATES = ['PASS3B_OWNER_REVIEW', 'PASS3B_OWNER_APPROVED', 'PASS3B_OWNER_NO_CHANGE', 'PASS3B_PRIOR_OWNER_RULING', 'PASS3B_INTENTIONAL_DIVERGENCE', 'PASS3B_INVARIANT_VIOLATION', 'PASS3B_ONTOLOGY_GAP_CANDIDATE'];
const PRECEDENTS = [
  'Prerequisite inheritance is not semantic inheritance.',
  'Martial Arts I `attack_of_opportunity` does not propagate to Martial Arts II / III.',
  'Residual Pin / Crush / Throw / Trip tag-set asymmetry is intentional; Power Attack / Powerful Charge / Bantha Rush, the ranged precision family and the Tech Specialist family are intentional divergences.',
  'Generic skill mechanics remain `skills`; a specific mechanically targeted skill gets its exact skill tag.',
  'Skill exclusions and examples inside a generic skill rule do not create positive exact-skill tags.',
  'Crew-role "pilot" is not the Pilot skill.',
  'Movement-mode Climb Speed / Swim Speed is not the Climb / Swim skill; "jump to lightspeed" / "hyperspace jump" is not the Jump skill.',
  'A natural-20 trigger may be `critical_success` without being `critical_hit`.',
  'Treat Injury as an explicit recovery/removal mechanism may justify `treat_injury` without implying `medical`, `medicine`, `healing` or `condition_removal`.',
  '`use_the_force -> force`; generic "use the Force" prose is not the Use the Force skill.',
  'A referenced DC from another skill (for example Treat Injury DC) is not an exact-skill interaction.'
];

const excerptAround = (text, re, w = 130) => {
  const m = re.exec(text); if (!m) return null;
  const s = Math.max(0, m.index - w), e = Math.min(text.length, m.index + m[0].length + w);
  return (s ? '…' : '') + text.slice(s, e).replace(/\s+/g, ' ').trim() + (e < text.length ? '…' : '');
};
const lead = (text, n = 220) => String(text).replace(/\s+/g, ' ').trim().slice(0, n) + (String(text).length > n ? '…' : '');
const rid = (r) => `${r.domain}:${r.canonicalId}`;

function priorRulings(baseline) {
  const byName = new Map(); // name -> ids (feat domain)
  for (const r of baseline.records) if (r.domain === 'FEAT') (byName.get(r.name) || byName.set(r.name, []).get(r.name)).push(r.canonicalId);
  const tagRulings = new Map(); // domain:id|tag -> ruling
  const familyRulings = new Map(); // domain:id -> {label, ruling}
  const p2 = readJson('data/audits/feat-tags-pass2-owner-adjudication.json');
  for (const x of p2.rejectedFindings) tagRulings.set(`FEAT:${x.canonicalId}|${x.rejectedTag}`, { source: 'Pass 2 rejected finding', ruling: x.ruling, reason: x.reason });
  for (const c of p2.tagChanges) for (const t of c.remove) tagRulings.set(`FEAT:${c.canonicalId}|${t}`, { source: 'Pass 2 owner correction (tag removed)', ruling: c.ruling, reason: c.reason });
  const chainByLabel = new Map(OWNER_NAMED_CHAINS);
  for (const fr of p2.familyReviews) {
    if (fr.ruling !== 'PASS2_INTENTIONAL_DIVERGENCE') continue;
    const names = fr.label === 'martial-arts' ? ['Martial Arts I', 'Martial Arts II', 'Martial Arts III'] : (chainByLabel.get(fr.label) || []);
    const ids = names.flatMap(n => byName.get(n) || []);
    const members = ids.map(id => baseline.records.find(r => r.domain === 'FEAT' && r.canonicalId === id));
    if (members.length < 2) continue;
    // The owner ruled the tag-set asymmetry among these members: exactly the tags carried by some members but not all.
    const union = new Set(members.flatMap(m => m.tags));
    const divergent = new Set([...union].filter(t => !members.every(m => m.tags.includes(t))));
    for (const id of ids) familyRulings.set(`FEAT:${id}`, { source: `Pass 2 family review: ${fr.label}`, ruling: fr.ruling, reason: fr.reason, divergentTags: [...divergent].sort() });
  }
  const p3 = readJson('data/audits/talent-feat-pass3a-skill-owner-adjudication.json');
  for (const d of p3.dispositions) tagRulings.set(`TALENT:${d.canonicalId}|${d.tag}`, { source: 'Pass 3A owner disposition', ruling: d.state, reason: d.reason });
  return { tagRulings, familyRulings };
}

export function buildReport(baseline, ownerOverlay = null) {
  const records = baseline.records;
  const vocab = new Set(baseline.sharedVocabulary);
  for (const d of DETECTORS) if (!vocab.has(d.tag)) throw new Error(`detector ${d.id} targets tag ${d.tag} outside the shared vocabulary`);
  const byKey = new Map(records.map(r => [rid(r), r]));
  const prior = priorRulings(baseline);

  // ---- Hard invariants across the combined corpus ----
  const invariantViolations = [];
  for (const r of records) for (const [a, b] of REQUIRED_IMPLICATIONS) if (r.tags.includes(a) && !r.tags.includes(b)) invariantViolations.push({ state: 'PASS3B_INVARIANT_VIOLATION', domain: r.domain, canonicalId: r.canonicalId, name: r.name, rule: `${a} -> ${b}`, tags: r.tags });
  const unknownOrRetired = records.filter(r => r.tags.some(t => !vocab.has(t))).map(r => ({ domain: r.domain, canonicalId: r.canonicalId, name: r.name }));

  // ---- Detection pass ----
  const fired = new Map(); // detector.id -> Map(rid -> excerpt)
  const auxFired = new Map(Object.keys(AUX).map(k => [`aux:${k}`, new Map()]));
  for (const d of DETECTORS) fired.set(d.id, new Map());
  for (const r of records) {
    const text = r.evidence || '';
    if (!text) continue;
    for (const d of DETECTORS) if (d.re.test(text)) fired.get(d.id).set(rid(r), excerptAround(text, d.re));
    for (const [k, re] of Object.entries(AUX)) if (re.test(text)) auxFired.get(`aux:${k}`).set(rid(r), excerptAround(text, re));
  }
  const firedOf = (key) => key.startsWith('aux:') ? auxFired.get(key) : fired.get(key);

  // ---- Per-detector statistics (both domains) ----
  const detStats = DETECTORS.map(d => {
    const per = {};
    for (const dom of ['FEAT', 'TALENT']) {
      const recs = records.filter(r => r.domain === dom);
      const det = recs.filter(r => fired.get(d.id).has(rid(r)));
      const tagged = recs.filter(r => r.tags.includes(d.tag));
      per[dom] = { recordsWithText: recs.filter(r => r.evidence).length, detected: det.length, detectedAndTagged: det.filter(r => r.tags.includes(d.tag)).length, detectedNotTagged: det.filter(r => !r.tags.includes(d.tag)).length, tagged: tagged.length, taggedNotDetected: tagged.filter(r => !fired.get(d.id).has(rid(r))).length };
    }
    const det = per.FEAT.detected + per.TALENT.detected, conv = per.FEAT.detectedAndTagged + per.TALENT.detectedAndTagged;
    return { id: d.id, family: d.family, tag: d.tag, confidence: d.confidence, note: d.note ?? null, detected: det, convergent: conv, notTagged: det - conv, taggedRate: det ? Number((conv / det).toFixed(3)) : null, perDomain: per };
  });
  const statOf = new Map(detStats.map(s => [s.id, s]));

  // ---- Channel 1: rule-trigger candidates ----
  const items = new Map(); // `${rid}|${tag}` -> item
  const evidenceOnly = [];
  const conventionGroups = new Map();
  const summarize = (r) => ({ canonicalId: r.canonicalId, domain: r.domain, name: r.name, source: r.source, page: r.page, tags: r.tags });
  const comparators = (detId, tag, domain, n = 3) => [...fired.get(detId).keys()].map(k => byKey.get(k)).filter(r => r.domain !== domain && r.tags.includes(tag)).sort((a, b) => cmp(a.canonicalId, b.canonicalId)).slice(0, n)
    .map(r => ({ ...summarize(r), excerpt: fired.get(detId).get(rid(r)), evidenceTier: r.evidenceTier }));
  const comparatorCount = (detId, tag, domain) => [...fired.get(detId).keys()].filter(k => { const r = byKey.get(k); return r.domain !== domain && r.tags.includes(tag); }).length;
  const implicationNote = (tag) => { const out = REQUIRED_IMPLICATIONS.filter(([a, b]) => a === tag || b === tag).map(([a, b]) => `${a} -> ${b}`); return out.length ? out.join('; ') : null; };
  const priorFor = (r, tag) => prior.tagRulings.get(`${r.domain}:${r.canonicalId}|${tag}`) || null;
  const familyPriorFor = (r) => prior.familyRulings.get(rid(r)) || null;

  const addItem = (r, d, channel, extra) => {
    const key = `${rid(r)}|${d.tag}`;
    const have = items.get(key);
    if (have) { if (!have.channels.includes(channel)) have.channels.push(channel); if (extra.bundle) (have.bundles ||= []).push(extra.bundle); return have; }
    const st = statOf.get(d.id);
    const cmpRecs = comparators(d.id, d.tag, r.domain), cmpN = comparatorCount(d.id, d.tag, r.domain);
    const other = r.domain === 'FEAT' ? 'TALENT' : 'FEAT';
    const item = {
      state: null, priority: null, priorityBasis: null, family: d.family, familyName: FAMILIES[d.family], mechanic: d.id, comparedTag: d.tag, detectorConfidence: d.confidence,
      domain: r.domain, canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, evidenceTier: r.evidenceTier,
      canonicalMechanicText: r.evidence, matchedExcerpt: fired.get(d.id).get(rid(r)), currentTags: [...r.tags],
      comparisonRecords: cmpRecs.map(c => ({ ...c, canonicalMechanicText: byKey.get(`${c.domain}:${c.canonicalId}`).evidence })), comparisonTags: [...new Set(cmpRecs.flatMap(c => c.tags))].sort(), comparatorsInOtherDomain: cmpN,
      detectableCommonality: { detector: d.id, pattern: d.re.source, detectorNote: d.note ?? null },
      exactTagDifference: { comparedTag: d.tag, thisRecordCarriesTag: false, thisDomain: r.domain, otherDomain: other, otherDomainRecordsMatchingDetector: [...fired.get(d.id).keys()].filter(k => byKey.get(k).domain === other).length, otherDomainRecordsMatchingDetectorAndCarryingTag: cmpN, detectorTaggedRateOverall: st.taggedRate },
      applicableInvariant: implicationNote(d.tag), priorOwnerPrecedent: null, channels: [channel], ...(extra.bundle ? { bundles: [extra.bundle] } : {})
    };
    items.set(key, item);
    return item;
  };

  for (const d of DETECTORS) {
    for (const [k, ex] of fired.get(d.id)) {
      const r = byKey.get(k);
      if (r.tags.includes(d.tag)) continue;
      if (d.confidence !== 'LOW' && (statOf.get(d.id).taggedRate ?? 1) < CONVENTION_MIN_RATE) {
        const g = conventionGroups.get(d.id) || conventionGroups.set(d.id, { mechanic: d.id, family: d.family, tag: d.tag, confidence: d.confidence, records: [] }).get(d.id);
        g.records.push({ ...summarize(r), evidenceTier: r.evidenceTier, excerpt: ex });
        continue;
      }
      if (d.confidence === 'LOW') { evidenceOnly.push({ class: 'LOW_CONFIDENCE_LEXICAL', mechanic: d.id, tag: d.tag, ...summarize(r), excerpt: ex }); continue; }
      const cmpN = comparatorCount(d.id, d.tag, r.domain);
      if (!cmpN) { evidenceOnly.push({ class: 'NO_CROSS_DOMAIN_COMPARATOR', mechanic: d.id, tag: d.tag, confidence: d.confidence, ...summarize(r), excerpt: ex }); continue; }
      addItem(r, d, 'CHANNEL_1_RULE_TRIGGER', {});
    }
  }

  // ---- Channel 2: cross-domain mechanic bundles ----
  const bundleReports = [];
  for (const b of BUNDLES) {
    const inAll = [...firedOf(b.all[0]).keys()].filter(k => b.all.every(x => firedOf(x).has(k)) && (!b.any || b.any.some(x => firedOf(x).has(k))));
    const members = inAll.map(k => byKey.get(k)).sort((x, y) => cmp(x.domain, y.domain) || cmp(x.canonicalId, y.canonicalId));
    const perTag = {};
    for (const t of b.comparedTags) {
      perTag[t] = {};
      for (const dom of ['FEAT', 'TALENT']) { const m = members.filter(r => r.domain === dom); perTag[t][dom] = { members: m.length, carrying: m.filter(r => r.tags.includes(t)).length }; }
    }
    const mismatches = [];
    for (const t of b.comparedTags) for (const r of members) {
      if (r.tags.includes(t)) continue;
      const others = members.filter(o => o.domain !== r.domain), otherCarriers = others.filter(o => o.tags.includes(t));
      if (!otherCarriers.length) continue;
      if (!b.tight || otherCarriers.length / others.length < 0.5) continue; // loose bundle or other domain does not establish the convention
      // Bundle items are attributed to the bundle itself (pseudo-detector), never to a detector that did not fire on the record.
      const lead0 = DETECTORS.find(x => x.id === b.all[0]);
      if (!lead0) continue; // aux-only bundles are table-only
      const pid = `bundle:${b.id}>${t}`;
      if (!fired.has(pid)) {
        fired.set(pid, new Map(members.map(m => [rid(m), fired.get(lead0.id).get(rid(m)) ?? null])));
        const carrying = members.filter(m => m.tags.includes(t)).length;
        statOf.set(pid, { id: pid, taggedRate: Number((carrying / members.length).toFixed(3)) });
      }
      const det = { id: pid, family: lead0.family, tag: t, confidence: lead0.confidence, re: lead0.re, note: `bundle: ${b.label}` };
      mismatches.push({ id: rid(r), tag: t, bundleId: b.id });
      const prio = b.all.every(x => !x.startsWith('aux:') && statOf.get(x)?.confidence === 'HIGH') ? 'P1' : 'P2';
      const it = addItem(r, det, 'CHANNEL_2_CROSS_DOMAIN_BUNDLE', { bundle: b.id });
      it.bundleHint = prio;
    }
    bundleReports.push({ id: b.id, label: b.label, requires: b.all, anyOf: b.any || [], comparedTags: b.comparedTags, members: { FEAT: members.filter(r => r.domain === 'FEAT').length, TALENT: members.filter(r => r.domain === 'TALENT').length }, tagCarriage: perTag, mismatchCount: mismatches.length,
      memberRecords: members.slice(0, 400).map(r => ({ ...summarize(r), comparedTagsCarried: b.comparedTags.filter(t => r.tags.includes(t)) })) });
  }

  // ---- Resolve states / priorities ----
  for (const it of items.values()) {
    const r = byKey.get(`${it.domain}:${it.canonicalId}`);
    const tag = it.comparedTag;
    const pr = priorFor(r, tag), fam = familyPriorFor(r);
    if (pr) { it.state = 'PASS3B_PRIOR_OWNER_RULING'; it.priorOwnerPrecedent = pr; it.priority = null; }
    else if (fam && fam.divergentTags.includes(tag)) { it.state = 'PASS3B_INTENTIONAL_DIVERGENCE'; it.priorOwnerPrecedent = fam; it.priority = null; }
    else {
      it.state = 'PASS3B_OWNER_REVIEW';
      const p1 = it.detectorConfidence === 'HIGH' || it.bundleHint === 'P1';
      it.priority = p1 ? 1 : 2;
      it.priorityBasis = p1 ? 'detector confidence HIGH (or tight HIGH-only bundle) with a same-mechanic comparator in the other domain' : 'detector confidence MEDIUM with a same-mechanic comparator in the other domain';
    }
    delete it.bundleHint;
  }

  // ---- Explicit owner decisions (cumulative overlay): the only source of PASS3B_OWNER_APPROVED / PASS3B_OWNER_NO_CHANGE ----
  const decisionByKey = new Map((ownerOverlay?.decisions || []).map(d => [`${d.domain}:${d.canonicalId}|${d.tag}`, d]));
  const matchedDecisions = new Set();
  for (const it of items.values()) {
    const d = decisionByKey.get(`${it.domain}:${it.canonicalId}|${it.comparedTag}`);
    if (!d) continue;
    matchedDecisions.add(d.decisionId);
    it.state = d.ownerAction === 'ADD' ? 'PASS3B_OWNER_APPROVED' : 'PASS3B_OWNER_NO_CHANGE';
    it.priority = null; it.priorityBasis = null;
    it.ownerDecision = { decisionId: d.decisionId, batch: d.batch, ownerAction: d.ownerAction, policy: d.ownerPolicyApplied };
  }
  const decisionsWithoutDiscoveryItem = [...decisionByKey.values()].filter(d => !matchedDecisions.has(d.decisionId)).map(d => ({ decisionId: d.decisionId, ownerAction: d.ownerAction, batch: d.batch, evidenceReference: d.detectorEvidenceReference }));

  // ---- Channel 3: tag-definition reverse audit ----
  const tagAudit = [];
  const usage = (tag, dom) => records.filter(r => r.domain === dom && r.tags.includes(tag));
  const cooc = (list) => { const c = {}; for (const r of list) for (const t of r.tags) c[t] = (c[t] || 0) + 1; return c; };
  const cosine = (a, b, n1, n2) => { const keys = new Set([...Object.keys(a), ...Object.keys(b)]); let dot = 0, na = 0, nb = 0; for (const k of keys) { const x = (a[k] || 0) / n1, y = (b[k] || 0) / n2; dot += x * y; na += x * x; nb += y * y; } return na && nb ? dot / Math.sqrt(na * nb) : null; };
  const sample = (list, n) => { const s = [...list].sort((a, b) => cmp(a.canonicalId, b.canonicalId)); if (s.length <= n) return s; return Array.from({ length: n }, (_, i) => s[Math.floor(i * s.length / n)]); };
  for (const tag of baseline.sharedVocabulary) {
    const f = usage(tag, 'FEAT'), t = usage(tag, 'TALENT');
    const cf = cooc(f), ct = cooc(t);
    const top = (c, n) => Object.entries(c).filter(([k]) => k !== tag).sort((x, y) => y[1] - x[1] || cmp(x[0], y[0])).slice(0, n).map(([k, v]) => `${k}:${v}`);
    const cs = f.length >= 5 && t.length >= 5 ? Number(cosine(cf, ct, f.length, t.length).toFixed(3)) : null;
    const broad = BROAD_TAGS.includes(tag);
    const n = broad ? 5 : 2;
    let state, note = null;
    if (!f.length && !t.length) state = 'UNUSED';
    else if (!f.length || !t.length) {
      const otherDom = f.length ? 'TALENT' : 'FEAT';
      const fireN = DETECTORS.filter(d => d.tag === tag && d.confidence !== 'LOW').reduce((n, d) => n + [...fired.get(d.id).keys()].filter(k => byKey.get(k).domain === otherDom).length, 0);
      state = 'USED_BY_ONE_DOMAIN_ONLY';
      note = `Carried only by ${f.length ? 'feats' : 'talents'}; ${fireN} ${otherDom.toLowerCase()} record(s) match a non-LOW detector for this tag (see Channel 1). No domain-specificity ruling is made.`;
    } else if (broad) { state = 'PASS3B_OWNER_REVIEW'; note = 'Owner-named broad tag; cross-domain usage evidence supplied for the owner.'; }
    else if (cs !== null && cs < 0.5 && f.length >= 10 && t.length >= 10) { state = 'PASS3B_OWNER_REVIEW'; note = 'Measured co-tag profile cosine below 0.5 between domains (both domains >= 10 uses).'; }
    else state = 'NO_FLAG';
    const sm = (r) => ({ canonicalId: r.canonicalId, name: r.name, source: r.source, page: r.page, tags: r.tags, excerpt: lead(r.evidence) });
    tagAudit.push({ tag, state, priority: state === 'PASS3B_OWNER_REVIEW' ? 3 : null, broad, feats: f.length, talents: t.length, cooccurrenceCosine: cs, topCooccurFeat: top(cf, 6), topCooccurTalent: top(ct, 6), note, sampleFeats: sample(f, n).map(sm), sampleTalents: sample(t, n).map(sm) });
  }

  // ---- Ontology-gap screen ----
  const gaps = GAP_CONCEPTS.map(c => {
    const hit = (dom) => records.filter(r => r.domain === dom && r.evidence && c.re.test(r.evidence));
    const f = hit('FEAT'), t = hit('TALENT');
    const carriage = (list) => { const m = {}; for (const r of list) for (const x of r.tags) m[x] = (m[x] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).slice(0, 3).map(([tag, n]) => ({ tag, records: n, rate: Number((n / list.length).toFixed(3)) })); };
    const cf = carriage(f), ct = carriage(t);
    // Literal screen only: wording recurs (>= 5 records) in both domains and no single tag is carried by a majority of the matching records in at least one domain.
    const literal = f.length >= 5 && t.length >= 5 && ((cf[0]?.rate ?? 0) < 0.5 || (ct[0]?.rate ?? 0) < 0.5);
    return { id: c.id, wording: c.label, pattern: c.re.source, feats: f.length, talents: t.length, mostCarriedTags: { FEAT: cf, TALENT: ct }, state: literal ? 'PASS3B_ONTOLOGY_GAP_CANDIDATE' : 'NOT_FLAGGED', screenCriterion: 'recurs in >=5 records per domain and no tag is carried by >=50% of matching records in at least one domain', sampleIds: { FEAT: f.slice(0, 3).map(r => r.canonicalId), TALENT: t.slice(0, 3).map(r => r.canonicalId) } };
  });

  const conventionQuestions = [...conventionGroups.values()].map(g => {
    const st = statOf.get(g.mechanic);
    const tagged = [...fired.get(g.mechanic).keys()].map(k => byKey.get(k)).filter(r => r.tags.includes(g.tag)).sort((a, b) => cmp(a.canonicalId, b.canonicalId));
    return { state: 'PASS3B_OWNER_REVIEW', priority: 3, kind: 'TAG_CONVENTION_QUESTION', mechanic: g.mechanic, family: g.family, familyName: FAMILIES[g.family], comparedTag: g.tag, detectorConfidence: g.confidence,
      question: `Detector ${g.mechanic} matches ${st.detected} record(s); ${st.convergent} (${Math.round((st.taggedRate ?? 0) * 100)}%) carry \`${g.tag}\` and ${g.records.length} do not. Owner: what does \`${g.tag}\` mark? Records are listed, not individually flagged.`,
      detected: st.detected, carrying: st.convergent, untagged: g.records.length, untaggedByDomain: { FEAT: g.records.filter(r => r.domain === 'FEAT').length, TALENT: g.records.filter(r => r.domain === 'TALENT').length },
      taggedExamples: tagged.slice(0, 4).map(r => ({ ...summarize(r), excerpt: fired.get(g.mechanic).get(rid(r)) })), untaggedExamples: g.records.slice(0, 6),
      untaggedRecordIds: g.records.map(r => `${r.domain}:${r.canonicalId}`).sort(), implicationRuleApplies: implicationNote(g.tag) };
  }).sort((a, b) => cmp(a.family, b.family) || cmp(a.mechanic, b.mechanic));

  // ---- Assemble ----
  const itemList = [...items.values()].sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9) || cmp(a.family, b.family) || cmp(a.mechanic, b.mechanic) || cmp(a.comparedTag, b.comparedTag) || cmp(a.domain, b.domain) || cmp(a.canonicalId, b.canonicalId));
  const byState = {};
  for (const it of itemList) byState[it.state] = (byState[it.state] || 0) + 1;
  const reviewItems = itemList.filter(i => i.state === 'PASS3B_OWNER_REVIEW');
  const ownerDecided = itemList.filter(i => ['PASS3B_OWNER_APPROVED', 'PASS3B_OWNER_NO_CHANGE'].includes(i.state));
  const exactConvergence = detStats.reduce((n, s) => n + s.convergent, 0);
  const familyRollup = Object.keys(FAMILIES).map(fk => {
    const ds = detStats.filter(s => s.family === fk);
    const ids = ds.map(s => s.id);
    const involved = (dom) => new Set(DETECTORS.filter(d => ids.includes(d.id)).flatMap(d => [...fired.get(d.id).keys()].filter(k => byKey.get(k).domain === dom))).size;
    const rv = reviewItems.filter(i => i.family === fk);
    return { family: fk, name: FAMILIES[fk], detectors: ds.length, tagsExpected: [...new Set(ds.map(s => s.tag))].sort(), recordsScanned: records.filter(r => r.evidence).length, featsInvolved: involved('FEAT'), talentsInvolved: involved('TALENT'),
      detections: ds.reduce((n, s) => n + s.detected, 0), convergent: ds.reduce((n, s) => n + s.convergent, 0), ownerReview: rv.length, ownerReviewP1: rv.filter(i => i.priority === 1).length, ownerReviewP2: rv.filter(i => i.priority === 2).length };
  });
  const tagReview = tagAudit.filter(a => a.state === 'PASS3B_OWNER_REVIEW');
  const dashboard = {
    combinedCorpus: records.length, feats: records.filter(r => r.domain === 'FEAT').length, talents: records.filter(r => r.domain === 'TALENT').length, sharedVocabulary: vocab.size,
    hardImplicationViolations: invariantViolations.length, unknownOrRetiredTagRecords: unknownOrRetired.length, mechanicFamiliesScanned: Object.keys(FAMILIES).length, detectors: DETECTORS.length, bundles: BUNDLES.length,
    tagAndDetectorCoOccurrences: exactConvergence, ownerReviewCandidates: reviewItems.length + tagReview.length + conventionQuestions.length, ownerReviewRecordItems: reviewItems.length, ownerReviewRecordItemsByPriority: { P1: reviewItems.filter(i => i.priority === 1).length, P2: reviewItems.filter(i => i.priority === 2).length }, ownerReviewTagDefinitionItems: tagReview.length, ownerReviewTagConventionQuestions: conventionQuestions.length, recordsBehindConventionQuestions: conventionQuestions.reduce((n, q) => n + q.untagged, 0),
    ownerDecidedItems: ownerDecided.length, ownerDecisionsWithoutDiscoveryItem: decisionsWithoutDiscoveryItem.length, priorRulingOrIntentionalDivergence: itemList.filter(i => ['PASS3B_PRIOR_OWNER_RULING', 'PASS3B_INTENTIONAL_DIVERGENCE'].includes(i.state)).length, tagsUsedByOneDomainOnly: tagAudit.filter(a => a.state === 'USED_BY_ONE_DOMAIN_ONLY').length,
    ontologyGapCandidates: gaps.filter(g => g.state === 'PASS3B_ONTOLOGY_GAP_CANDIDATE').length, evidenceOnlyLowConfidence: evidenceOnly.filter(e => e.class === 'LOW_CONFIDENCE_LEXICAL').length, evidenceOnlyNoComparator: evidenceOnly.filter(e => e.class === 'NO_CROSS_DOMAIN_COMPARATOR').length, itemStates: byState
  };
  return {
    schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3B_EXACT_MECHANIC_CONVERGENCE', status: 'DISCOVERY_REPORT_ONLY_NO_MUTATION',
    note: 'Evidence only. Detectors identify records that match explicit wording; they never assign tags. Only already-issued owner rulings produce automatic states. Feat evidence is a certified rules-shape paraphrase (or Pass 1 summary) and talent evidence is the certified Benefit text, so detector recall differs by domain; evidence tier is recorded on every item.',
    baseline: BASELINE3B_PATH, assignableStates: ASSIGNABLE_STATES, authorityBoundary: 'Claude executes deterministic analysis and applies explicit owner rulings; it does not make semantic decisions. Grouping is evidence organization only and does not imply that records must converge.', dashboard, hardInvariants: { rules: REQUIRED_IMPLICATIONS.map(([a, b]) => `${a} -> ${b}`), violations: invariantViolations, unknownOrRetiredTagRecords: unknownOrRetired },
    precedentRules: PRECEDENTS, familyRollup, detectorStats: detStats, bundles: bundleReports, ownerReviewItems: reviewItems, ownerDecidedItems: ownerDecided, ownerDecisionsWithoutDiscoveryItem: decisionsWithoutDiscoveryItem, tagConventionQuestions: conventionQuestions, resolvedByPriorRuling: itemList.filter(i => ['PASS3B_PRIOR_OWNER_RULING', 'PASS3B_INTENTIONAL_DIVERGENCE'].includes(i.state)),
    tagDefinitionAudit: tagAudit, ontologyGapScreen: gaps, evidenceOnly
  };
}

function renderMd(rep) {
  const d = rep.dashboard;
  const L = ['# Talent/Feat Pass 3B — Exact Mechanic Convergence (discovery, report-only)', '',
    '## Dashboard', '', '```',
    `Combined corpus: ${d.combinedCorpus}`, `  Feats: ${d.feats}`, `  Talents: ${d.talents}`, '', `Shared vocabulary: ${d.sharedVocabulary}`, '',
    `Hard implication violations: ${d.hardImplicationViolations}`, `Unknown/retired tag records: ${d.unknownOrRetiredTagRecords}`, '',
    `Mechanic families scanned: ${d.mechanicFamiliesScanned} (${d.detectors} detectors, ${d.bundles} cross-domain bundles)`, '',
    `Records where mechanic wording and the compared tag co-occur (count only; not adjudicated): ${d.tagAndDetectorCoOccurrences}`, '',
    `Owner-review candidates: ${d.ownerReviewCandidates}`, `  record-level (P1 ${d.ownerReviewRecordItemsByPriority.P1} / P2 ${d.ownerReviewRecordItemsByPriority.P2}): ${d.ownerReviewRecordItems}`, `  tag-definition (P3): ${d.ownerReviewTagDefinitionItems}`, `  tag-convention questions (P3; ${d.recordsBehindConventionQuestions} untagged matches listed, not individually flagged): ${d.ownerReviewTagConventionQuestions}`, '',
    `Findings decided by explicit owner rulings (approved / no change): ${d.ownerDecidedItems}`, `Prior-ruling / intentional-divergence matches: ${d.priorRulingOrIntentionalDivergence}`, `Tags carried by only one domain (count only; no ruling made): ${d.tagsUsedByOneDomainOnly}`, '',
    `Ontology-gap candidates: ${d.ontologyGapCandidates}`, `Evidence-only (not owner review): low-confidence ${d.evidenceOnlyLowConfidence}; no cross-domain comparator ${d.evidenceOnlyNoComparator}`, '```', '',
    '**Authority boundary:** this report contains evidence only. It makes no equivalence, intentional-divergence, domain-specificity, tag-meaning or ontology decision, proposes no tag change, and applies nothing to production. Groups organize evidence and do not imply that records must converge. Every new discrepancy is `PASS3B_OWNER_REVIEW`.', '',
    '## Hard shared invariants (literal checks of owner-certified implication rules)', '', rep.hardInvariants.violations.length ? `**${rep.hardInvariants.violations.length} violation(s)** — reported before any softer analysis:` : 'Zero violations across the combined corpus.', '', ...rep.hardInvariants.rules.map(r => `- \`${r}\``), '',
    ...rep.hardInvariants.violations.map(v => `- PASS3B_INVARIANT_VIOLATION: ${v.domain} ${v.name} (\`${v.canonicalId}\`) ${v.rule}`), '',
    '## Reusable precedent rules (already ruled; not reopened)', '', ...rep.precedentRules.map(p => `- ${p}`), '',
    '## Mechanic families', '', '| Family | Detectors | Feats involved | Talents involved | Detections | Convergent | Review P1 | Review P2 |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rep.familyRollup.map(f => `| ${f.family}. ${f.name} | ${f.detectors} | ${f.featsInvolved} | ${f.talentsInvolved} | ${f.detections} | ${f.convergent} | ${f.ownerReviewP1} | ${f.ownerReviewP2} |`), ''];
  for (const f of rep.familyRollup) {
    const items = rep.ownerReviewItems.filter(i => i.family === f.family);
    L.push(`### ${f.family}. ${f.name}`, '', `Tags expected: ${f.tagsExpected.map(t => `\`${t}\``).join(', ')}. Records with evidence text: ${f.recordsScanned}; feats involved ${f.featsInvolved}; talents involved ${f.talentsInvolved}; detections ${f.detections}; already convergent ${f.convergent}; owner review ${f.ownerReview}.`, '',
      '| Detector | Tag | Conf | Detected (F/T) | Tagged (F/T) | Detected, not tagged (F/T) | Tagged rate |', '| --- | --- | --- | --- | --- | --- | ---: |',
      ...rep.detectorStats.filter(s => s.family === f.family).map(s => `| ${s.id} | \`${s.tag}\` | ${s.confidence} | ${s.perDomain.FEAT.detected}/${s.perDomain.TALENT.detected} | ${s.perDomain.FEAT.detectedAndTagged}/${s.perDomain.TALENT.detectedAndTagged} | ${s.perDomain.FEAT.detectedNotTagged}/${s.perDomain.TALENT.detectedNotTagged} | ${s.taggedRate ?? '—'} |`), '');
    const groups = new Map();
    for (const i of items) (groups.get(`${i.mechanic}|${i.comparedTag}|P${i.priority}`) || groups.set(`${i.mechanic}|${i.comparedTag}|P${i.priority}`, []).get(`${i.mechanic}|${i.comparedTag}|P${i.priority}`)).push(i);
    if (groups.size) {
      L.push('Owner-review groups (mechanic → candidate tag):', '');
      for (const [k, g] of groups) {
        const [mech, tag, pr] = k.split('|');
        L.push(`- **${mech}** → \`${tag}\` (${pr}): ${g.length} record(s) [${g.filter(x => x.domain === 'FEAT').length} feat / ${g.filter(x => x.domain === 'TALENT').length} talent]; e.g. ${g.slice(0, 3).map(x => `${x.name} (\`${x.canonicalId}\`)`).join('; ')}`);
      }
      const ex = items[0];
      L.push('', `Representative evidence (facts only): **${ex.name}** (${ex.domain}, ${ex.source} p.${ex.page ?? '—'}, ${ex.evidenceTier}) — "${ex.matchedExcerpt}". Tags: ${ex.currentTags.map(t => `\`${t}\``).join(', ')}; compared tag \`${ex.comparedTag}\` absent. Comparison records carrying it: ${ex.comparisonRecords.map(c => `${c.name} (${c.domain}) [${c.tags.map(t => `\`${t}\``).join(', ')}]`).join('; ') || '—'}.`, '');
    } else L.push('No owner-review items in this family.', '');
  }
  L.push('## Tag-convention questions (detector tagged-rate below 50%)', '', 'Reporting rule (measurable): when a detector\'s tagged-rate is below 50%, its untagged matches are listed once per tag instead of as one owner-review item per record. No record is dropped; IDs are in the JSON.', '',
    '| Mechanic | Tag | Detected | Carrying | Untagged (F/T) | Question |', '| --- | --- | ---: | ---: | --- | --- |',
    ...rep.tagConventionQuestions.map(q => `| ${q.mechanic} | \`${q.comparedTag}\` | ${q.detected} | ${q.carrying} | ${q.untaggedByDomain.FEAT}/${q.untaggedByDomain.TALENT} | ${q.question.replace(/\|/g, '\\|')} |`), '');
  L.push('## Cross-domain mechanic bundles (Channel 2)', '', '| Bundle | Feats | Talents | Compared-tag carriage (feat carrying/members; talent carrying/members) | Mismatches |', '| --- | ---: | ---: | --- | ---: |',
    ...rep.bundles.map(b => `| ${b.label} | ${b.members.FEAT} | ${b.members.TALENT} | ${b.comparedTags.map(t => `\`${t}\` ${b.tagCarriage[t].FEAT.carrying}/${b.tagCarriage[t].FEAT.members}; ${b.tagCarriage[t].TALENT.carrying}/${b.tagCarriage[t].TALENT.members}`).join(' · ')} | ${b.mismatchCount} |`), '',
    '## Tag-definition reverse audit (Channel 3)', '', 'P3 owner-review items are broad tags or tags whose co-tag profile differs strongly between domains. Full per-tag samples are in the JSON.', '',
    '| Tag | State | Feats | Talents | Co-tag cosine | Note |', '| --- | --- | ---: | ---: | ---: | --- |',
    ...rep.tagDefinitionAudit.filter(a => a.state !== 'NO_FLAG' && a.state !== 'UNUSED').map(a => `| \`${a.tag}\` | ${a.state} | ${a.feats} | ${a.talents} | ${a.cooccurrenceCosine ?? '—'} | ${a.note ?? ''} |`), '',
    '## Ontology-gap screen', '', 'Literal wording screen only: it reports recurring wording and the tags those records already carry. It does not conclude that a tag is needed; the owner decides.', '',
    '| Wording | Feats | Talents | Most-carried tags, feats (rate) | Most-carried tags, talents (rate) | State |', '| --- | ---: | ---: | --- | --- | --- |',
    ...rep.ontologyGapScreen.map(g => `| ${g.wording} | ${g.feats} | ${g.talents} | ${g.mostCarriedTags.FEAT.map(x => `\`${x.tag}\` ${x.rate}`).join(', ') || '—'} | ${g.mostCarriedTags.TALENT.map(x => `\`${x.tag}\` ${x.rate}`).join(', ') || '—'} | ${g.state} |`), '',
    'No tag is added by this pass.', '',
    '## Previously ruled matches', '', `${rep.resolvedByPriorRuling.length} candidate(s) matched an already-issued owner ruling and carry the state that ruling implies (listed in the JSON).`, '');
  return L.join('\n');
}

export function buildOutputs() {
  const baseline = readJson(BASELINE3B_PATH);
  // Fail if any source authority changed underneath the committed baseline.
  for (const [f, h] of Object.entries(baseline.sourceSha256)) if (sha(f) !== h) throw new Error(`PASS3B REPORT FAILED: source authority changed since the baseline was built: ${f}`);
  const ov = 'data/audits/talent-feat-pass3b-owner-adjudication.json';
  const rep = buildReport(baseline, fs.existsSync(path.join(ROOT, ov)) ? readJson(ov) : null);
  return { rep, json: JSON.stringify(rep, null, 2) + '\n', md: renderMd(rep) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildOutputs();
  if (process.argv.includes('--check')) {
    const same = fs.readFileSync(path.join(ROOT, REPORT_JSON), 'utf8') === out.json && fs.readFileSync(path.join(ROOT, REPORT_MD), 'utf8') === out.md;
    if (!same) { console.error('Committed Pass 3B report differs from a fresh run'); process.exit(1); }
    console.log('PASS 3B REPORT MATCHES A FRESH RUN');
  } else {
    fs.writeFileSync(path.join(ROOT, REPORT_JSON), out.json);
    fs.writeFileSync(path.join(ROOT, REPORT_MD), out.md);
    const d = out.rep.dashboard;
    console.log(`PASS 3B DISCOVERY: corpus ${d.combinedCorpus}; invariant violations ${d.hardImplicationViolations}; families ${d.mechanicFamiliesScanned}; co-occurrences ${d.tagAndDetectorCoOccurrences}; owner review ${d.ownerReviewCandidates} (record P1 ${d.ownerReviewRecordItemsByPriority.P1}, P2 ${d.ownerReviewRecordItemsByPriority.P2}, tag-def ${d.ownerReviewTagDefinitionItems}); prior-ruled ${d.priorRulingOrIntentionalDivergence}; gaps ${d.ontologyGapCandidates}; evidence-only ${d.evidenceOnlyLowConfidence}+${d.evidenceOnlyNoComparator}`);
  }
}
export { renderMd };
