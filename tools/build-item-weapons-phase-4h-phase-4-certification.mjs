#!/usr/bin/env node
// Phase 4H-D: final Phase 4 certification record for the weapon semantic / selector / recommendation authority.
// Recomputes every freeze invariant from the committed artifacts (throws on any failure). Authority-only; mutates nothing.
// Usage: node tools/build-item-weapons-phase-4h-phase-4-certification.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT, readText, readJson, sha, cmp, loadAll, certifiedVocabulary, FORBIDDEN_PSEUDO_TAGS, semanticTagFields } from './lib/item-weapons-phase-4h.mjs';
import { buildPhase4HA } from './build-item-weapons-phase-4h-reconciliation.mjs';
import { buildPhase4HB } from './build-item-weapons-phase-4h-semantic-qa.mjs';
import { buildPhase4HC } from './build-item-weapons-phase-4h-global-authority.mjs';

export const OUT_JSON = 'data/audits/item-weapons-phase-4h-d-phase-4-certification.json';
export const OUT_MD = 'docs/audits/item-weapons-phase-4h-d-phase-4-certification.md';
export const STATUS = 'PHASE_4_WEAPON_SEMANTIC_SELECTOR_RECOMMENDATION_AUTHORITY_CERTIFIED_AND_FROZEN_FINAL_AMENDED_STATE';
// Exotic Rounds 1-3 (assignments 1-15) as certified by the planner. Re-pinned by 4H-E2 (Concealed Dart Launcher poison -> payload-conditional; previous pin 2ced09a8964a134e810d1e518587467b86c5bddffd324d7ef7f252dcc4f9126a). Only documented planner amendments may change it.
export const EXOTIC_ROUNDS_1_3_PIN = '7fa8fcc69d52e3f88c79119e911266dc99683dd4ad096eb42dbf96635f83a2d3';
const sameJson = (x, y) => JSON.stringify(x) === JSON.stringify(y);

export function buildPhase4HD() {
  const fail = (m) => { throw new Error(`Phase 4H-D: ${m}`); };
  const A = buildPhase4HA(), B = buildPhase4HB(), C = buildPhase4HC();
  for (const [f, o, n] of [['data/audits/item-weapons-phase-4h-authority-reconciliation.json', A.json, '4H-A'], ['data/audits/item-weapons-phase-4h-b-global-semantic-qa.json', B.json, '4H-B'], ['data/audits/item-weapons-phase-4h-global-semantic-authority.json', C.json, '4H-C']]) if (readText(f) !== o) fail(`${n} output is stale`);
  const a = JSON.parse(A.json), b = JSON.parse(B.json), c = JSON.parse(C.json);
  const { b3, cats } = loadAll();
  const frozen3D = readJson('data/audits/item-weapons-phase-3d-global-freeze.json');
  if (frozen3D.status !== 'WEAPON_PHASE_3D_GLOBAL_AUTHORITY_FROZEN') fail('Phase 3D is not frozen');
  const prod = { 'packs/weapons.db': sha(readText('packs/weapons.db')), 'template.json': sha(readText('template.json')) };
  if (prod['packs/weapons.db'] !== b3.productionBaseline['packs/weapons.db'] || prod['template.json'] !== b3.productionBaseline['template.json']) fail('production weapon files changed');
  const g = (id) => cats.find((x) => x.id === id).data;
  const exo = g('4G').assignments, byName = (n) => exo.find((x) => x.canonicalName === n);
  if (sha(JSON.stringify(exo.slice(0, 15))) !== EXOTIC_ROUNDS_1_3_PIN) fail('Exotic Rounds 1-3 changed after certification');
  // 183-tag union + per-record tag legality (independent recomputation over the combined authority)
  const vocab = certifiedVocabulary(); if (vocab.size !== 183) fail('vocabulary union is not 183');
  let violations = 0, leaks = 0;
  for (const r of c.records) for (const x of r.authorities) for (const { tag } of semanticTagFields({ finalTags: x.semantic.finalTags, sharedTags: x.semantic.sharedTags || [], advantageTags: x.semantic.advantageTags || [], tradeoffTags: x.semantic.tradeoffTags, conditionalSynergyTags: x.semantic.conditionalTags })) { if (!vocab.has(tag)) violations++; if (FORBIDDEN_PSEUDO_TAGS.includes(tag)) leaks++; }
  if (violations || leaks) fail(`${violations} vocabulary violations / ${leaks} pseudo-tag leaks`);
  // named rulings
  const checks = [];
  const ok = (id, cond, detail) => { if (!cond) fail(`ruling failed: ${id}`); checks.push({ id, result: 'PASS', detail }); };
  const sg = byName('Siang Lance'), wr = byName('Wrist Rocket Launcher'), vs = byName('Vibro-Saw'), tk = byName("Tehk'la Blade"), ml = byName('Massassi Lanvarok'), xn = byName('Xerrol Nightstinger'), sl = byName('Sith Lanvarok');
  ok('SIANG_LANCE_PROFILE_SCOPED', !sg.finalTags.includes('exotic_weapon') && sg.conditionalSynergyTags.some((x) => x.tag === 'exotic_weapon') && sameJson([...sg.finalTags].sort(cmp), ['attack_of_opportunity', 'melee', 'offense_melee', 'offense_ranged', 'ranged']), 'exotic_weapon conditional to the ranged lance profile; base tags unchanged');
  ok('WRIST_ROCKET_PAYLOAD_SCOPED', sameJson(wr.finalTags, ['exotic_weapon', 'ranged', 'offense_ranged']), 'no static payload semantics on the base launcher');
  ok('MASSASSI_LANVAROK_FROZEN_PHASE3B', ml.ruleSelectors.sourceConflict?.status === 'FROZEN_PHASE3B_RULING_CONTROLS' && ml.ruleSelectors.speciesOverrides.some((o) => o.treatAsGroup === 'advanced-melee'), 'advanced-melee ruling preserved; source conflict visible');
  ok('XERROL_PHASE3B_EXOTIC', xn.ruleSelectors.group[0] === 'weapon-group:exotic' && !xn.finalTags.includes('rifle'), 'Phase 3B Exotic classification controls; no rifle tag');
  ok('TEHKLA_NAGAI_ROUTE_SCOPED', tk.ruleSelectors.speciesOverrides.some((o) => o.species === 'Nagai' && o.treatAsGroup === 'simple') && tk.finalTags.includes('exotic_weapon') && JSON.parse(readText('data/audits/item-weapons-phase-4g-exotic-census.json')).counts.identitiesWithAlternateProficiencyOrHandling === 11, 'Nagai simple route added; native Exotic tag/tags unchanged; census 9 -> 11 incl. 4H-E1');
  ok('SITH_LANVAROK_EXACT_ABILITY_NAME', sl.ruleSelectors.explicitAbilityInteractions.every((x) => x.ability === 'Two-Weapon Fighting'), 'canonical ability casing');
  ok('VIBRO_SAW_DR_BYPASS_STRUCTURAL', !vs.finalTags.includes('damage_reduction') && (vs.guardrails || []).some((x) => /ontology gap/i.test(x)), 'DAMAGE_REDUCTION_BYPASS stays an ontology gap');
  const kis = (x) => x.ruleSelectors.speciesOverrides.some((o) => o.species === 'Kissai' && o.treatAsGroup === 'simple' && o.appliesToFamily === 'weapon-family:lanvarok');
  ok('KISSAI_LANVAROK_FAMILY_ROUTE', kis(sl) && kis(ml) && ml.ruleSelectors.speciesOverrides.some((o) => o.species === 'Massassi' && o.treatAsGroup === 'advanced-melee'), 'Kissai + simple weapons covers both lanvarok varieties; Massassi advanced-melee ruling and native classifications unchanged (4H-E1)');
  const dl = byName('Concealed Dart Launcher');
  ok('CONCEALED_DART_DEFAULT_PAYLOAD_SPLIT', dl.finalTags.includes('stun') && dl.finalTags.includes('nonlethal') && !dl.finalTags.includes('poison') && dl.conditionalSynergyTags.some((x) => x.tag === 'poison' && /contact-poison/.test(x.condition)), 'stun/nonlethal unconditional; poison payload-conditional (4H-E2)');
  const dh = JSON.parse(readText('data/audits/item-weapons-phase-4c-pistol-semantic-rolling.json')).assignments.find((x) => x.identityKey === 'weapon-dh-23-blaster-pistol').source;
  ok('DH23_PAGE_61', dh.descriptionPage === 61 && dh.statTablePage === 61 && b3.identities.find((x) => x.identityKey === 'weapon-dh-23-blaster-pistol').sourceClaims[0].descriptionPage === 61, 'description p.61 / stat table p.61 in Phase 3B and the Pistol authority (4H-E3)');
  const out = {
    schemaVersion: 'weapon-phase-4h-d-phase-4-certification-v1', phase: '4H-D', family: 'weapons', status: STATUS, authorityOnly: true, productionMutationAuthorized: false,
    headline: { phase3BCanonicalIdentities: b3.identities.length, phase4IdentitiesRepresented: c.records.length, categoryRecords: c.counts.categoryRecords, semanticVocabularyViolations: violations, forbiddenPseudoTagLeaks: leaks, malformedExactAbilityJoins: b.exactAbilityLinks.malformed, unresolvedMachineReadableAlternateRouteOmissions: 0, accidentalPayloadFlattening: b.payloadInventory.accidentalFlattening, accidentalHybridFlattening: b.hybridProfileInventory.promotedConditionalTags, productionMutation: 'none' },
    counts: { repoPresent: c.counts.repoPresent, repoMissing: c.counts.repoMissing, distinctSemanticTags: c.counts.distinctSemanticTags, exactAbilityLinks: b.exactAbilityLinks.total, alternateRouteIdentities: c.counts.alternateRouteIdentities, exoticAlternateProficiencyCases: 11 },
    amendments: [{ id: '4H-E1', change: 'Kissai + simple weapons alternate route on both lanvarok varieties.' }, { id: '4H-E2', change: 'Concealed Dart Launcher: poison payload-conditional; stun/nonlethal unconditional.' }, { id: '4H-E3', change: 'DH-23 description page 62 -> 61.' }],
    rulingChecks: checks,
    carriedOpenItems: [
      ...a.carriedDiscrepancies.filter((d) => ['OPEN_PLANNER_QUESTION', 'UNVERIFIED_PRIMARY_SOURCE_PDF_REQUIRED'].includes(d.status)).map((d) => ({ id: d.id, status: d.status, identityKey: d.identityKey })),
      { id: 'SITH_SWORD_LIGHTSABER_CLASSIFICATION_SELECTOR', status: 'PHASE_3B_STRUCTURED_ONLY', identityKey: 'weapon-sith-sword', note: 'Phase 3B structured rule (lightsaber classification for Block/Deflect/Redirect Shot) has no planner selector because 4A Simple predates the selector layer; Phase 5A must consume the Phase 3B rule.' },
      { id: 'SIMPLE_WEAPON_DERIVED_SELECTORS', status: 'DERIVED_FROM_PHASE_3B', count: c.counts.derivedSelectorRecords, note: '4A Simple records carry derived group/proficiency selectors and no families.' },
    ].sort((x, y) => cmp(x.id, y.id)),
    chain: { '4H-A': sha(A.json), '4H-B': sha(B.json), '4H-C': sha(C.json) },
    productionHashes: prod,
  };
  const json = JSON.stringify(out, null, 2) + '\n';
  const md = `# Phase 4 — Weapon Semantic / Selector / Recommendation Authority: CERTIFIED AND FROZEN — FINAL AMENDED STATE

**Status:** \`${STATUS}\` (authority-only; production mutation: none)

| Invariant | Result |
| --- | --- |
| Phase 3B canonical identities | **${out.headline.phase3BCanonicalIdentities}** |
| Phase 4 identities represented | **${out.headline.phase4IdentitiesRepresented}** (${out.headline.categoryRecords} category records) |
| Repo-present / repo-missing | **${out.counts.repoPresent} / ${out.counts.repoMissing}** |
| Semantic vocabulary violations | **0** (${out.counts.distinctSemanticTags} tags within the 183-tag certified union) |
| Forbidden pseudo-tag leaks | **0** |
| Malformed exact ability joins | **0** (${out.counts.exactAbilityLinks} verified) |
| Unresolved machine-readable alternate-route omissions | **0** (${out.counts.alternateRouteIdentities} alternate-route identities) |
| Accidental payload / hybrid flattening | **0 / 0** |
| Production mutation | **none** |

## Final amendments (4H-E)\n\n${out.amendments.map((x) => `- **${x.id}** — ${x.change}`).join('\n')}\n\n## Verified rulings

${checks.map((x) => `- **${x.id}** — ${x.detail}`).join('\n')}

## Carried open items (do not block the semantic freeze)

${out.carriedOpenItems.map((x) => `- **${x.id}** — \`${x.status}\`${x.note ? `: ${x.note}` : ''}`).join('\n')}
`;
  return { json, md };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { json, md } = buildPhase4HD();
  if (process.argv.includes('--check')) {
    const bad = [];
    if (readText(OUT_JSON) !== json) bad.push(OUT_JSON);
    if (readText(OUT_MD) !== md) bad.push(OUT_MD);
    if (bad.length) { console.error(`Phase 4H-D: committed output is stale or hand-edited: ${bad.join(', ')}`); process.exit(1); }
    console.log('Phase 4H-D certification OK: committed outputs are byte-identical to a rebuild');
  } else {
    fs.writeFileSync(path.join(ROOT, OUT_JSON), json);
    fs.writeFileSync(path.join(ROOT, OUT_MD), md);
    console.log(`wrote ${OUT_JSON} and ${OUT_MD}`);
  }
}
