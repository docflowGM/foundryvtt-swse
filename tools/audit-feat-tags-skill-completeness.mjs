#!/usr/bin/env node
// Skill-tag completeness AUDIT for the feat semantic TAGS authority. REPORT-ONLY: never edits assignments.
// Owner rule: if mechanically operative rules text directly uses, modifies, substitutes for, rerolls, accelerates,
// resists, or otherwise interacts with a specific SWSE skill, that skill should be represented. Prerequisite-only
// mentions never qualify (prerequisite text is not scanned). Generic "all/any skills" mechanics expect `skills`.
// Named applications inherit the parent skill (Intimidate / Change Attitude -> persuasion; Sleight of Hand -> stealth).
// Every finding is advisory: "possible skill interaction not represented — owner review required".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTHORITY_PATH, ROOT, loadContext } from './validate-feat-tags-semantic-authority.mjs';

const OUT_JSON = 'data/audits/feat-tags-skill-completeness-report.json';
const OUT_MD = 'docs/audits/feat-tags-skill-completeness-report.md';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// Lexicon: pattern -> expected tag. Application names map to their parent skill tag.
export const SKILL_LEXICON = [
  ['Acrobatics', /\bacrobatics\b/i, 'acrobatics'], ['Climb', /\bclimb(?:ing)?\b/i, 'climb'], ['Deception', /\bdeception\b|\bfeint\b/i, 'deception'],
  ['Endurance', /\bendurance\b/i, 'endurance'], ['Gather Information', /\bgather information\b/i, 'gather_information'], ['Initiative', /\binitiative\b/i, 'initiative'],
  ['Jump', /\bjump(?:ing)?\b/i, 'jump'], ['Knowledge', /\bknowledge\b/i, 'knowledge'], ['Mechanics', /\bmechanics\b/i, 'mechanics'], ['Perception', /\bperception\b/i, 'perception'],
  ['Persuasion', /\bpersuasion\b/i, 'persuasion'], ['Intimidate (Persuasion)', /\bintimidat\w*\b/i, 'persuasion'], ['Change Attitude (Persuasion)', /\bchange attitude\b/i, 'persuasion'],
  ['Pilot', /\bpilot\b/i, 'pilot'], ['Ride', /\bride\b/i, 'ride'], ['Stealth', /\bstealth\b/i, 'stealth'], ['Sleight of Hand (Stealth)', /\bsleight of hand\b/i, 'stealth'],
  ['Survival', /\bsurvival\b/i, 'survival'], ['Swim', /\bswim(?:ming)?\b/i, 'swim'], ['Treat Injury', /\btreat injury\b/i, 'treat_injury'],
  ['Use Computer', /\buse computer\b/i, 'use_computer'], ['Use the Force', /\buse the force\b/i, 'use_the_force']
];
export const GENERIC_SKILL_PATTERN = /\b(?:all|any|every|each) skills?\b|\bany skill check\b|\ball skill checks\b/i;

// Text sources, in order: content authority (rules shape / summary, never prerequisites), provenance authority if present, Pass 1 mechanic summary.
export function buildTextIndex(auth) {
  const idx = new Map();
  const add = (id, label, text) => { if (!text) return; if (!idx.has(id)) idx.set(id, []); idx.get(id).push({ label, text }); };
  for (const a of auth.assignments) add(a.canonicalId, 'pass1.canonicalMechanicSummary', a.canonicalMechanicSummary);
  const sources = ['data/audits/feat-provenance-canonical-authority.json', 'data/audits/feat-content-canonical-authority.json'].filter(exists);
  const loaded = [];
  if (sources.length) {
    const src = readJson(sources[0]);
    loaded.push(sources[0]);
    const feats = [...Object.values(src.books).flatMap(b => b.feats), ...(src.officialWebSources?.feats || [])];
    for (const f of feats) {
      if (!f.canonicalId || /^FULL_REPRINT/.test(f.identityRole)) continue;
      const shape = [...(f.content?.canonicalRulesShape || []), ...(f.content?.starshipsReprintRulesShape || [])].join(' ');
      add(f.canonicalId, 'content.canonicalRulesShape', shape);
      add(f.canonicalId, 'content.quickSummary', f.content?.quickSummary);
    }
  }
  return { idx, sources: loaded };
}

export function auditSkillCompleteness(auth, textIndex) {
  const findings = [];
  const coverage = { withRulesText: 0, summaryOnly: 0 };
  for (const a of auth.assignments) {
    const entries = textIndex.idx.get(a.canonicalId) || [];
    const hasRules = entries.some(e => e.label.startsWith('content.'));
    coverage[hasRules ? 'withRulesText' : 'summaryOnly']++;
    const text = entries.map(e => e.text).join(' ');
    const tags = new Set(a.finalTags);
    const missing = new Map();
    for (const [skill, re, tag] of SKILL_LEXICON) {
      if (re.test(text) && !tags.has(tag)) { if (!missing.has(tag)) missing.set(tag, []); missing.get(tag).push(skill); }
    }
    const genericMissing = GENERIC_SKILL_PATTERN.test(text) && !tags.has('skills');
    if (missing.size || genericMissing) {
      findings.push({
        canonicalId: a.canonicalId, name: a.name, source: a.primaryPublication.source,
        textBasis: hasRules ? 'RULES_TEXT_AVAILABLE' : 'PASS1_SUMMARY_ONLY',
        possibleMissingTags: [...missing.entries()].map(([tag, via]) => ({ tag, matchedLexicon: [...new Set(via)] })).sort((x, y) => x.tag.localeCompare(y.tag)),
        genericSkillsTagExpected: genericMissing,
        finalTags: a.finalTags,
        status: 'possible skill interaction not represented — owner review required'
      });
    }
  }
  findings.sort((x, y) => x.canonicalId.localeCompare(y.canonicalId));
  return { findings, coverage };
}

export function buildReport(auth) {
  const ti = buildTextIndex(auth);
  const { findings, coverage } = auditSkillCompleteness(auth, ti);
  return {
    schemaVersion: '1.0', kind: 'FEAT_TAGS_SKILL_COMPLETENESS_AUDIT', status: 'REPORT_ONLY_OWNER_REVIEW_REQUIRED',
    note: 'Advisory scan. No tag assignment was added, removed, or changed. Prerequisite text is never scanned. Lexicon matches are lexical and can be false positives (for example a verb sense of "pilot" or "climb").',
    authority: { file: AUTHORITY_PATH, status: auth.status },
    textSources: ti.sources, textCoverage: coverage,
    textLimitation: 'Per-feat rules text is available from the content/provenance authority only where embedded; other feats are scanned against the Pass 1 canonicalMechanicSummary alone (PASS1_SUMMARY_ONLY).',
    lexicon: SKILL_LEXICON.map(([skill, re, tag]) => ({ skill, expectedTag: tag, pattern: re.source })),
    genericSkillPattern: GENERIC_SKILL_PATTERN.source,
    counts: { assignments: auth.assignments.length, findings: findings.length, withGenericSkillsExpected: findings.filter(f => f.genericSkillsTagExpected).length },
    findings
  };
}

function render(rep) {
  const L = ['# Feat Tags — Skill-Tag Completeness Audit (report-only)', '',
    `Authority: \`${rep.authority.file}\` (\`${rep.authority.status}\`; PASS1_COMPLETE / INPUT_TO_PASS2).`, '',
    rep.note, '', rep.textLimitation, '',
    `- Assignments scanned: ${rep.counts.assignments}`, `- Rules-text basis: ${rep.textCoverage.withRulesText}; summary-only basis: ${rep.textCoverage.summaryOnly}`,
    `- Findings needing owner review: **${rep.counts.findings}**`, '',
    '| Feat | Source | Basis | Possible missing tags | Current tags |', '| --- | --- | --- | --- | --- |'];
  for (const f of rep.findings) L.push(`| ${f.name} (\`${f.canonicalId}\`) | ${f.source} | ${f.textBasis} | ${[...f.possibleMissingTags.map(m => `\`${m.tag}\``), ...(f.genericSkillsTagExpected ? ['`skills`'] : [])].join(', ')} | ${f.finalTags.map(t => `\`${t}\``).join(', ')} |`);
  L.push('', 'Every row: possible skill interaction not represented — owner review required. No row is an automatic correction.', '');
  return L.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const auth = readJson(AUTHORITY_PATH);
  loadContext();
  const rep = buildReport(auth);
  fs.writeFileSync(path.join(ROOT, OUT_JSON), JSON.stringify(rep, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, OUT_MD), render(rep));
  console.log(`SKILL COMPLETENESS AUDIT: ${rep.counts.findings} possible unrepresented interactions of ${rep.counts.assignments} (report-only); text basis rules=${rep.textCoverage.withRulesText} summary-only=${rep.textCoverage.summaryOnly}`);
}
