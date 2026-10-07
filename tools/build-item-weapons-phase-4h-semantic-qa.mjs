#!/usr/bin/env node
// Phase 4H-B: whole-Phase-4 semantic + selector QA over the 4A-4G weapon authorities. Throws on any invariant violation.
// Authority-only; mutates nothing. Usage: node tools/build-item-weapons-phase-4h-semantic-qa.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, readText, sha, cmp, loadAll, certifiedVocabulary, semanticTagFields, abilityLinks, packNames, FORBIDDEN_PSEUDO_TAGS } from './lib/item-weapons-phase-4h.mjs';

export const OUT_JSON = 'data/audits/item-weapons-phase-4h-b-global-semantic-qa.json';
export const OUT_MD = 'docs/audits/item-weapons-phase-4h-b-global-semantic-qa.md';
export const STATUS = 'WEAPON_PHASE_4H_B_GLOBAL_SEMANTIC_SELECTOR_QA_PASSED';
const ENUM = /^[A-Z][A-Z0-9_]*$/;

// Payload-bearing weapons whose base final tags carry the semantics of their published DEFAULT payload (planner-ruled).
// Optional payload semantics must be payload-conditional. Wrist Rocket Launcher has no default payload, so it carries none.
export const DEFAULT_PAYLOAD_RULINGS = [
  { identityKey: 'weapon-concealed-dart-launcher', defaultPayload: 'sedative', unconditionalTags: ['stun', 'nonlethal'], conditionalPayloadTags: [{ payload: 'contact-poison', tag: 'poison' }], status: 'PLANNER_RULED_4H_E2', note: 'The sedative dart is the published default and the weapon table lists native stun damage, so stun/nonlethal stay unconditional; contact poison is an optional payload, so poison is payload-conditional.' },
];
const PAYLOAD_TAGS = ['stun', 'poison', 'nonlethal', 'burst_damage', 'control', 'droid_bane', 'vehicle_bane'];

export function buildPhase4HB() {
  const { b3, byKey, cats } = loadAll();
  const fail = (m) => { throw new Error(`Phase 4H-B: ${m}`); };
  const vocab = certifiedVocabulary();
  if (vocab.size !== 183) fail(`certified vocabulary is ${vocab.size}, expected 183`);
  const feats = packNames('packs/feats.db'), talents = packNames('packs/talents.db');
  const perCat = [], allTags = new Set(), linkRows = [], hybrid = [], payload = [], flagged = [];
  let tagOccurrences = 0, fieldChecks = 0;
  for (const c of cats) {
    const tags = new Set(), fields = new Set(); let links = 0;
    for (const a of c.data.assignments) {
      const k = c.key(a), w = `${c.id} ${a.canonicalName}`;
      for (const { field, tag } of semanticTagFields(a)) {
        fieldChecks++; tags.add(tag); fields.add(field); allTags.add(tag); tagOccurrences++;
        if (!vocab.has(tag)) fail(`${w} ${field} "${tag}" is not in the certified 183-tag vocabulary`);
        if (FORBIDDEN_PSEUDO_TAGS.includes(tag)) fail(`${w} ${field} carries forbidden pseudo-tag "${tag}"`);
        if (/[:\s]/.test(tag) || tag === k || tag === a.canonicalName) fail(`${w} ${field} "${tag}" looks like a structural selector / identity`);
      }
      // conditional / tradeoff tags must never be promoted into finalTags
      const cond = (a.conditionalSynergyTags || a.conditionalSemanticTags || []).map((x) => x.tag);
      for (const t of [...cond, ...(a.tradeoffTags || [])]) if (cond.includes(t) && (a.finalTags || []).includes(t)) fail(`${w} conditional tag "${t}" is also an unconditional final tag`);
      if (cond.length || ((a.ruleSelectors?.modes || a.ruleSelectors?.modeSelectors || []).length > 1 && new Set((a.ruleSelectors.modes || a.ruleSelectors.modeSelectors).map((m) => m.attackProfile || m.mode)).size > 1)) hybrid.push({ phase: c.id, identityKey: k, canonicalName: a.canonicalName, conditionalTags: cond.sort(cmp), modes: (a.ruleSelectors?.modes || a.ruleSelectors?.modeSelectors || []).map((m) => m.mode).sort(cmp) });
      // exact ability joins
      for (const l of abilityLinks(a)) {
        links++;
        if (l.abilityType === 'talent-family') { linkRows.push({ phase: c.id, identityKey: k, ...l, verifiedAgainst: 'talent-family (not a single ability)' }); continue; }
        const inF = feats.has(l.ability), inT = talents.has(l.ability);
        if (l.abilityType === 'feat' ? !inF : l.abilityType === 'talent' ? !inT : !(inF || inT)) fail(`${w} ability link "${l.ability}" is not an exact canonical ${l.abilityType || 'feat/talent'} name`);
        if (l.relation && !ENUM.test(l.relation)) fail(`${w} ability link "${l.ability}" relation "${l.relation}" is malformed`);
        linkRows.push({ phase: c.id, identityKey: k, ...l, verifiedAgainst: inF && inT ? 'feat+talent' : inF ? 'feat' : 'talent' });
      }
      const q = a.ruleSelectors || {};
      if ((q.payloads || []).length || (q.payloadProfiles || []).length || (q.modes || []).some((m) => m.payload)) {
        const carried = (a.finalTags || []).filter((t) => PAYLOAD_TAGS.includes(t));
        payload.push({ phase: c.id, identityKey: k, canonicalName: a.canonicalName, payloadIds: [...(q.payloads || []), ...(q.payloadProfiles || []).map((p) => p.id)].sort(cmp), basePayloadSemanticTags: carried.sort(cmp) });
        const ex = DEFAULT_PAYLOAD_RULINGS.find((e) => e.identityKey === k);
        if (carried.length && !ex) fail(`${w} flattens payload semantics (${carried.join(', ')}) onto the base weapon`);
        if (ex) {
          if (JSON.stringify(carried) !== JSON.stringify([...ex.unconditionalTags].sort(cmp))) fail(`${w} unconditional payload tags must be exactly ${ex.unconditionalTags.join(', ')} (got ${carried.join(', ') || 'none'})`);
          if (!(q.payloadProfiles || []).some((p) => p.id === ex.defaultPayload && p.default)) fail(`${w} default payload ${ex.defaultPayload} missing`);
          for (const cp of ex.conditionalPayloadTags) {
            if ((a.finalTags || []).includes(cp.tag) || (a.sharedTags || []).includes(cp.tag) || (a.advantageTags || []).includes(cp.tag)) fail(`${w} ${cp.tag} must not be an unconditional tag`);
            if (!(a.conditionalSynergyTags || a.conditionalSemanticTags || []).some((x) => x.tag === cp.tag && x.condition.includes(cp.payload))) fail(`${w} ${cp.tag} must be conditional on the ${cp.payload} payload`);
          }
        }
      }
    }
    perCat.push({ phase: c.id, category: c.category, records: c.data.assignments.length, distinctSemanticTags: tags.size, semanticFields: [...fields].sort(cmp), exactAbilityLinks: links });
  }
  // named invariants
  const rec = (phase, key) => cats.find((c) => c.id === phase).data.assignments.find((a) => c0(cats, phase).key(a) === key);
  const c0 = (cs, id) => cs.find((c) => c.id === id);
  const sg = rec('4G', 'weapon-siang-lance'), wr = rec('4G', 'weapon-wrist-rocket-launcher'), vs = rec('4G', 'unmapped::Vibro-Saw');
  if (JSON.stringify([...sg.finalTags].sort(cmp)) !== JSON.stringify(['attack_of_opportunity', 'melee', 'offense_melee', 'offense_ranged', 'ranged']) || !(sg.conditionalSynergyTags || []).some((x) => x.tag === 'exotic_weapon')) fail('Siang Lance must keep its base tags with exotic_weapon conditional/profile-scoped');
  if (JSON.stringify(wr.finalTags) !== JSON.stringify(['exotic_weapon', 'ranged', 'offense_ranged'])) fail('Wrist Rocket Launcher base final tags must stay exotic_weapon, ranged, offense_ranged');
  if (vs.finalTags.includes('damage_reduction')) fail('Vibro-Saw must not use damage_reduction for DR bypass');
  const unionOfPhase = [...allTags].sort(cmp);
  const out = {
    schemaVersion: 'weapon-phase-4h-b-global-semantic-qa-v1', phase: '4H-B', family: 'weapons', status: STATUS, authorityOnly: true, productionMutationAuthorized: false,
    vocabulary: { certifiedUsedUnion: vocab.size, weaponSemanticTagsUsed: unionOfPhase.length, weaponTags: unionOfPhase, unknownWeaponSemanticTags: 0, forbiddenPseudoTagLeaks: 0, forbiddenPseudoTags: [...FORBIDDEN_PSEUDO_TAGS].sort(cmp), structuralSelectorLeaks: 0, tagFieldChecks: fieldChecks },
    byCategory: perCat,
    exactAbilityLinks: { total: linkRows.length, malformed: 0, rows: linkRows.sort((a, b) => cmp(a.identityKey + a.ability, b.identityKey + b.ability)) },
    hybridProfileInventory: { records: hybrid.length, promotedConditionalTags: 0, rows: hybrid.sort((a, b) => cmp(a.identityKey, b.identityKey)) },
    payloadInventory: { records: payload.length, accidentalFlattening: 0, defaultPayloadRulings: DEFAULT_PAYLOAD_RULINGS, rows: payload.sort((a, b) => cmp(a.identityKey, b.identityKey)) },
    inputs: Object.fromEntries(cats.map((c) => [c.file, sha(readText(c.file))])),
    phase3BIdentities: b3.identities.length,
  };
  const json = JSON.stringify(out, null, 2) + '\n';
  const md = `# Phase 4H-B — Global Weapon Semantic + Selector QA

**Status:** \`${STATUS}\` (authority-only; no production mutation)

- Certified feat/talent-used vocabulary: **${vocab.size}** tags
- Distinct weapon semantic tags used (all semantic-bearing fields, 4A–4G): **${unionOfPhase.length}**
- Unknown weapon semantic tags: **0** · forbidden pseudo-tag leaks: **0** · structural-selector leaks: **0** (${fieldChecks} tag-field entries checked)
- Exact ability links verified against canonical feat/talent names: **${linkRows.length}**, malformed: **0**
- Hybrid/profile-scoped records: **${hybrid.length}** (no conditional tag promoted to a final tag)
- Payload-bearing records: **${payload.length}**, accidental flattening: **0**, default-payload rulings: **${DEFAULT_PAYLOAD_RULINGS.length}**

| Phase | Category | Records | Distinct tags | Exact ability links |
| --- | --- | ---: | ---: | ---: |
${perCat.map((p) => `| ${p.phase} | ${p.category} | ${p.records} | ${p.distinctSemanticTags} | ${p.exactAbilityLinks} |`).join('\n')}

## Default-payload rulings (4H-E2)

${DEFAULT_PAYLOAD_RULINGS.map((e) => `- **${e.identityKey}** — default payload \`${e.defaultPayload}\`: unconditional ${e.unconditionalTags.join(', ')}; ${e.conditionalPayloadTags.map((c) => `${c.tag} only with the ${c.payload} payload`).join(', ')}. ${e.note}`).join('\n')}

## Forbidden pseudo-tags (never legal weapon semantics)

${FORBIDDEN_PSEUDO_TAGS.map((t) => `\`${t}\``).join(', ')}
`;
  return { json, md };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { json, md } = buildPhase4HB();
  if (process.argv.includes('--check')) {
    const bad = [];
    if (readText(OUT_JSON) !== json) bad.push(OUT_JSON);
    if (readText(OUT_MD) !== md) bad.push(OUT_MD);
    if (bad.length) { console.error(`Phase 4H-B: committed output is stale or hand-edited: ${bad.join(', ')}`); process.exit(1); }
    console.log('Phase 4H-B semantic QA OK: committed outputs are byte-identical to a rebuild');
  } else {
    fs.writeFileSync(path.join(ROOT, OUT_JSON), json);
    fs.writeFileSync(path.join(ROOT, OUT_MD), md);
    console.log(`wrote ${OUT_JSON} and ${OUT_MD}`);
  }
}
