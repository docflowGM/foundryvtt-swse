import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Phase 3G-0/1: pins the structured talent-prerequisite identity census and the identity experiments (read-only audit records).
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const c = rd('data/audits/talent-phase-3g-prerequisite-identity-census.json'), ex = rd('data/audits/talent-phase-3g-identity-experiments.json').experiments;
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('census totals: 331 records, 315 talent leaves (310 swse-flag ids + 5 production ids); no other structured field is consumed', () => {
  assert.equal(c.counts.records, 331); assert.equal(c.counts.talentLeaves, 315);
  assert.deepEqual(c.counts.byIdForm, { SWSE_FLAG_ID: 310, PRODUCTION_ID: 5 });
  assert.deepEqual(c.fieldsConsumedByRuntime, { prerequisitesStructured: 331, structuredPrerequisites: 0, prereqClauses: 0 });
  assert.deepEqual(c.nonTalentStructuredConditions, { skillTrained: 19, attribute: 16, bab: 9 });
});
test('static resolution: 314 unique, 1 ambiguous (Find an Opening -> Seize the Moment), 0 dangling', () => {
  assert.deepEqual(c.counts.byResolution, { UNIQUE: 314, AMBIGUOUS: 1 });
  const amb = c.rows.find(r => r.resolution === 'AMBIGUOUS');
  assert.equal(amb.owner.name, 'Find an Opening'); assert.deepEqual(amb.targetCandidates.map(t => t.tree).sort(), ['Outlaw', 'Provocateur']);
  assert.equal(c.counts.targetNameGloballyUnique, 302); assert.equal(c.counts.targetInSameNameGroup, 12);
});
test('runtime (real checker): embedded finalizer shape 309/5, source-linked 309/5, pending talent-step shape 0/314', () => {
  assert.deepEqual([c.counts.runtime.embeddedFinalizerShape.met, c.counts.runtime.embeddedFinalizerShape.notMet], [309, 5]);
  assert.deepEqual([c.counts.runtime.embeddedSourceLinked.met, c.counts.runtime.embeddedSourceLinked.notMet], [309, 5]);
  assert.deepEqual([c.counts.runtime.pendingTalentStepShape.met, c.counts.runtime.pendingTalentStepShape.notMet], [0, 314]);
  assert.equal(c.counts.runtime.embeddedFinalizerShape.viaNameFallback, 0);
});
test('the five Phase 3D repairs are exactly the five production-id leaves and none is effective at runtime', () => {
  assert.deepEqual(c.phase3dRepairs.sort(), ['Fearsome -> Saga Edition Core Rulebook|Bounty Hunter|Notorious', 'Ruthless Negotiator -> Saga Edition Core Rulebook|Bounty Hunter|Notorious', 'Shared Notoriety -> Saga Edition Core Rulebook|Infamy|Notorious', 'Unsavory Reputation -> Saga Edition Core Rulebook|Infamy|Notorious', 'Weakening Strike -> Saga Edition Core Rulebook|Misfortune|Dastardly Strike']);
  for (const r of c.rows.filter(x => x.idForm === 'PRODUCTION_ID')) { assert.equal(r.runtime.embeddedFinalizerShape.met, false); assert.equal(r.runtime.embeddedSourceLinked.met, false); assert.equal(r.runtime.pendingTalentStepShape.met, false); }
});
test('identity experiments: id leaves resolve only via flags.swse.id on embedded copies; pending never; UUID needs a source link and the legacy form; dead uuid needs a name to fall back', () => {
  assert.equal(ex['E1 swse.talent id vs embedded copy (flags.swse.id kept)'].via, 'id');
  assert.equal(ex['E1b same, embedded copy with flags stripped'].met, false);
  for (const k of Object.keys(ex).filter(k => /^E2/.test(k))) assert.equal(ex[k].met, false, k);
  assert.ok(ex['E4 same-name: prereq swse.talent.seize_the_moment vs EITHER Seize copy'].every(x => x.met), 'a shared swse id is satisfied by either same-name copy');
  assert.equal(ex['E5 uuid prereq vs embedded w/ core.sourceId (id format Compendium.<pack>.<id>)'].via, 'uuid');
  assert.equal(ex['E5b uuid prereq (v13 form with .Item.) vs same sourceId (legacy form)'].met, false);
  assert.equal(ex['E5c uuid prereq vs pending [{uuid}]'].via, 'uuid'); assert.equal(ex['E5d uuid prereq vs pending [{id: compendium _id}] (no uuid)'].met, false);
  assert.equal(ex['E6 dead uuid, name present'].via, 'name'); assert.equal(ex['E6b dead uuid, no name'].met, false);
});
test('the committed census and experiment record are current', () => {
  for (const [tool, args] of [['census-talent-prerequisite-identity.mjs', ['--check']], ['audit-talent-prerequisite-identity-experiments.mjs', ['--check']]]) {
    const r = spawnSync(process.execPath, ['tools/' + tool, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
  }
});
console.log(`\n${n} talent-phase-3g census checks passed`);
