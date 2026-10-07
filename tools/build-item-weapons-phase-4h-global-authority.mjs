#!/usr/bin/env node
// Phase 4H-C: deterministic combined weapon semantic authority — ONE record per Phase 3B canonical identity (203).
// Joins Phase 3B identity/provenance with the 4A-4G planner authorities. Authority-only; mutates no production file.
// Cross-category identities (Interchangeable Weapon System) are one record with nested per-category authorities.
// Usage: node tools/build-item-weapons-phase-4h-global-authority.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, readText, readJson, sha, cmp, loadAll, semanticTagFields, abilityLinks } from './lib/item-weapons-phase-4h.mjs';
import { buildPhase4HA } from './build-item-weapons-phase-4h-reconciliation.mjs';
import { buildPhase4HB } from './build-item-weapons-phase-4h-semantic-qa.mjs';

export const OUT_JSON = 'data/audits/item-weapons-phase-4h-global-semantic-authority.json';
export const OUT_MD = 'docs/audits/item-weapons-phase-4h-global-semantic-authority.md';
export const STATUS = 'WEAPON_PHASE_4H_C_GLOBAL_SEMANTIC_AUTHORITY_COMBINED';
export const EXPECTED = { identities: 203, categoryRecords: 204, repoPresent: 151, repoMissing: 52 };

// Derived (not planner-authored) structural selectors for 4A Simple Weapons, which predate the selector layer.
const GROUP_SELECTORS = { 'Simple Weapon': ['weapon-group:simple', 'weapon-proficiency:simple-weapons'] };
// Handled explicitly; every other planner field is carried verbatim under plannerMetadata.
const HANDLED = new Set(['identityKey', 'phase3BIdentityKey', 'canonicalName', 'repo', 'source', 'sharedTags', 'advantageTags', 'tradeoffTags', 'finalTags', 'conditionalSynergyTags', 'conditionalSemanticTags', 'ruleSelectors', 'proficiencyRoutes', 'index']);
const one = (v) => (Array.isArray(v) ? v[0] : v);
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function normalizeSelectors(q, b3rec) {
  if (!q) {
    const [g, p] = GROUP_SELECTORS[b3rec.weaponGroup] || [];
    return { derivedFromPhase3B: true, exact: `weapon:${b3rec.identityKey}`, group: g || null, proficiency: p ? [p] : [], families: [], modes: [], payloads: [], speciesOverrides: [], abilityOverrides: [], attributeRequirements: [] };
  }
  return {
    derivedFromPhase3B: false,
    exact: `weapon:${b3rec.identityKey}`,
    exactAsAuthored: one(q.exactIdentity ?? q.exactCanonicalSelector ?? q.exact),
    group: one(q.weaponGroup ?? q.group),
    proficiency: arr(q.proficiency),
    families: arr(q.families),
    modes: arr(q.modes ?? q.modeSelectors ?? q.profileSelectors),
    payloads: [...arr(q.payloads), ...arr(q.payloadProfiles).map((p) => `payload:${p.id}`)],
    speciesOverrides: arr(q.speciesOverrides),
    abilityOverrides: arr(q.abilityOverrides),
    attributeRequirements: arr(q.attributeRequirements),
  };
}

export function buildPhase4HC() {
  const fail = (m) => { throw new Error(`Phase 4H-C: ${m}`); };
  // prerequisites must be current and passing
  const A = buildPhase4HA(), B = buildPhase4HB();
  const EXACT_ALIAS_PHASES = new Set(['4E']); // 4E authored name-slug selectors (canonical-weapon:<slug>); normalized to weapon:<identityKey> here, authored form kept as exactAsAuthored
  for (const [f, o, n] of [['data/audits/item-weapons-phase-4h-authority-reconciliation.json', A.json, '4H-A'], ['data/audits/item-weapons-phase-4h-b-global-semantic-qa.json', B.json, '4H-B']]) if (readText(f) !== o) fail(`${n} output is stale; rebuild it first`);
  const recon = JSON.parse(A.json), { b3, byKey, cats } = loadAll();
  const byIdentity = new Map();
  for (const c of cats) for (const a of c.data.assignments) { const k = c.key(a); byIdentity.set(k, [...(byIdentity.get(k) || []), { c, a }]); }
  if (byIdentity.size !== EXPECTED.identities) fail(`expected ${EXPECTED.identities} identities, found ${byIdentity.size}`);
  const discrepancies = recon.carriedDiscrepancies;
  const records = [];
  let categoryRecords = 0;
  for (const i of [...b3.identities].sort((x, y) => cmp(x.identityKey, y.identityKey))) {
    const hits = byIdentity.get(i.identityKey);
    if (!hits) fail(`${i.identityKey} missing from Phase 4`);
    categoryRecords += hits.length;
    // primary authority = the category matching the Phase 3B weapon group (IWS: Rifle (Special) -> 4D)
    const primary = hits.find((h) => h.c.groups.includes(i.weaponGroup)) || fail(`${i.identityKey}: no authority matches Phase 3B group ${i.weaponGroup}`);
    const authorities = hits.sort((x, y) => cmp(x.c.id, y.c.id)).map(({ c, a }) => {
      const cond = (a.conditionalSynergyTags || a.conditionalSemanticTags || []).map((x) => ({ tag: x.tag, condition: x.condition, reason: x.reason ?? null }));
      const meta = {}; for (const [k, v] of Object.entries(a)) if (!HANDLED.has(k)) meta[k] = v;
      return {
        phase: c.id, category: c.category, primary: c === primary.c,
        source: a.source || null,
        semantic: { sharedTags: a.sharedTags || null, advantageTags: a.advantageTags || null, tradeoffTags: a.tradeoffTags || [], finalTags: a.finalTags, conditionalTags: cond },
        ruleSelectors: a.ruleSelectors || null,
        proficiencyRoutes: a.proficiencyRoutes || null,
        abilityInteractions: abilityLinks(a).map((l) => ({ ability: l.ability, abilityType: l.abilityType, relation: l.relation, via: l.via })),
        plannerMetadata: meta,
      };
    });
    const P = authorities.find((x) => x.primary);
    { const ex = normalizeSelectors(P.ruleSelectors, i).exactAsAuthored; if (ex && ex !== `weapon:${i.identityKey}` && !EXACT_ALIAS_PHASES.has(P.phase)) fail(`${i.identityKey}: authored exact selector ${ex} does not match its Phase 3B identity`); }
    const gaps = authorities.flatMap((x) => [...arr(x.plannerMetadata.ontologyGapCandidates), ...arr(x.plannerMetadata.unrepresentedMechanics), ...arr(x.plannerMetadata.ontologyGaps)].map((g) => ({ phase: x.phase, gap: g })));
    records.push({
      identityKey: i.identityKey, canonicalName: i.canonicalName,
      repo: { present: i.repo.present, id: i.repo.id },
      phase3B: { weaponGroup: i.weaponGroup, schemaFamily: i.schemaFamily, sourceClaims: i.sourceClaims.map((c) => ({ book: c.book, publishedName: c.publishedName, descriptionPage: c.descriptionPage, statTablePage: c.statTablePage })), mechanicsRecordSha256: sha(JSON.stringify(i.canonicalStats ?? null)), mechanicsPointer: `${'data/audits/item-weapons-phase-3b-canonical-authority.json'}#identities[${i.identityKey}].canonicalStats` },
      categories: authorities.map((x) => ({ phase: x.phase, category: x.category, primary: x.primary })),
      semantic: P.semantic,
      selectors: normalizeSelectors(P.ruleSelectors, i),
      proficiency: {
        reconciliation: (() => {
          const ns = normalizeSelectors(P.ruleSelectors, i);
          const planner = ns.speciesOverrides.length + ns.abilityOverrides.length + ns.modes.filter((m) => m.condition || m.classifications || m.nativeProficiency || m.proficiency).length + arr(P.ruleSelectors?.conditionalRules).length;
          const rules = (i.proficiencyRules || []).length, routes = (P.proficiencyRoutes?.alternate ?? []).length;
          if (routes && !ns.speciesOverrides.length && !ns.abilityOverrides.length) fail(`${i.identityKey}: planner alternate route lacks a machine-readable override`);
          return { phase3BStructuredRules: rules, plannerAlternateRoutes: routes, plannerMachineReadableOverrides: planner, status: rules && !planner ? 'PHASE_3B_STRUCTURED_ONLY' : rules || planner ? 'REPRESENTED' : 'NONE_REQUIRED' };
        })(),
        normal: P.proficiencyRoutes?.canonical ?? [{ type: 'weapon-group', selectors: normalizeSelectors(P.ruleSelectors, i).proficiency, phase3BGroup: i.weaponGroup }],
        alternateRoutesPhase3B: i.proficiencyRules || [],
        alternateRoutesPlanner: P.proficiencyRoutes?.alternate ?? [],
        speciesOverrides: normalizeSelectors(P.ruleSelectors, i).speciesOverrides,
        abilityOverrides: normalizeSelectors(P.ruleSelectors, i).abilityOverrides,
      },
      abilityInteractions: authorities.flatMap((x) => x.abilityInteractions.map((l) => ({ phase: x.phase, ...l }))),
      ontologyGapsAndUnrepresentedMechanics: gaps,
      authorityDiscrepancies: discrepancies.filter((d) => d.identityKey === i.identityKey),
      authorities,
    });
  }
  const repoPresent = records.filter((r) => r.repo.present).length;
  if (records.length !== EXPECTED.identities || categoryRecords !== EXPECTED.categoryRecords || repoPresent !== EXPECTED.repoPresent) fail('combined counts drifted');
  if (new Set(records.map((r) => r.identityKey)).size !== records.length) fail('duplicate identity in combined authority');
  const inputs = { ...recon.inputs, 'data/audits/item-weapons-phase-4h-authority-reconciliation.json': sha(A.json), 'data/audits/item-weapons-phase-4h-b-global-semantic-qa.json': sha(B.json) };
  const tagSet = new Set(records.flatMap((r) => r.authorities.flatMap((x) => semanticTagFields({ finalTags: x.semantic.finalTags, tradeoffTags: x.semantic.tradeoffTags, conditionalSynergyTags: x.semantic.conditionalTags }).map((f) => f.tag))));
  const out = {
    schemaVersion: 'weapon-phase-4h-c-global-semantic-authority-v1', phase: '4H-C', family: 'weapons', status: STATUS, authorityOnly: true, productionMutationAuthorized: false,
    purpose: 'One record per Phase 3B canonical weapon identity combining identity/provenance (Phase 3B) with semantic tags, exact selectors, proficiency routes, ability interactions and recommendation metadata (Phase 4A-4G). Structured mechanics stay in Phase 3B (pointer + hash) to avoid a parallel copy.',
    counts: { uniqueIdentities: records.length, categoryRecords, repoPresent, repoMissing: records.length - repoPresent, crossCategoryIdentities: records.filter((r) => r.authorities.length > 1).map((r) => r.identityKey), distinctSemanticTags: tagSet.size, derivedSelectorRecords: records.filter((r) => r.selectors.derivedFromPhase3B).length, alternateRouteIdentities: records.filter((r) => r.proficiency.reconciliation.status !== 'NONE_REQUIRED').length, phase3BStructuredOnlyRouteIdentities: records.filter((r) => r.proficiency.reconciliation.status === 'PHASE_3B_STRUCTURED_ONLY').map((r) => r.identityKey) },
    records, inputs,
  };
  const json = JSON.stringify(out, null, 2) + '\n';
  const groups = [...new Set(records.map((r) => r.phase3B.weaponGroup))].sort(cmp);
  const md = `# Phase 4H-C — Combined Weapon Semantic Authority (203 identities)

**Status:** \`${STATUS}\` (authority-only; no production mutation)

- Unique canonical identities: **${records.length}** (category records ${categoryRecords}; cross-category: ${out.counts.crossCategoryIdentities.join(', ')})
- Repo-present / repo-missing: **${repoPresent} / ${records.length - repoPresent}**
- Distinct semantic tags (all fields): **${tagSet.size}**
- Records with derived (not planner-authored) structural selectors: **${out.counts.derivedSelectorRecords}** (4A Simple Weapons, which predate the selector layer)
- Alternate-proficiency identities: **${out.counts.alternateRouteIdentities}** (Phase 3B-structured only: ${out.counts.phase3BStructuredOnlyRouteIdentities.join(', ') || 'none'})
- Structured mechanics remain in Phase 3B (\`mechanicsPointer\` + hash per record); this file adds the semantic/selector/proficiency layer only.

| Phase 3B group | Identities |
| --- | ---: |
${groups.map((g) => `| ${g} | ${records.filter((r) => r.phase3B.weaponGroup === g).length} |`).join('\n')}

## Inputs

${Object.entries(inputs).map(([k, v]) => `- ${k}: \`${v}\``).join('\n')}
`;
  return { json, md };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { json, md } = buildPhase4HC();
  if (process.argv.includes('--check')) {
    const bad = [];
    if (readText(OUT_JSON) !== json) bad.push(OUT_JSON);
    if (readText(OUT_MD) !== md) bad.push(OUT_MD);
    if (bad.length) { console.error(`Phase 4H-C: committed output is stale or hand-edited: ${bad.join(', ')}`); process.exit(1); }
    console.log('Phase 4H-C combined authority OK: committed outputs are byte-identical to a rebuild');
  } else {
    fs.writeFileSync(path.join(ROOT, OUT_JSON), json);
    fs.writeFileSync(path.join(ROOT, OUT_MD), md);
    console.log(`wrote ${OUT_JSON} and ${OUT_MD}`);
  }
}
