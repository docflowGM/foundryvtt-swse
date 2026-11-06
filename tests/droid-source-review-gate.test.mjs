import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { DROID_SOURCE_REVIEW_ROWS } from '../scripts/data/generated-droid-component-source-status.js';
import { resolveDroidComponentSourceReview } from '../scripts/domain/droids/droid-component-source-review.js';
import { resolveDroidBuilderQuote } from '../scripts/domain/droids/droid-component-quote-authority.js';
import { DROID_SYSTEMS } from '../scripts/data/droid-systems.js';
registerFoundryPathLoader();
const { resolveDroidPartQuote } = await import('../scripts/data/droid-part-schema.js');

const ledger = JSON.parse(fs.readFileSync('data/audits/droids/component-mechanical-certification-ledger.json', 'utf8'));

test('runtime snapshot exactly matches all 122 audited names and PASS/HOLD decisions', () => {
  const expected = ledger.identitySourceDecisions
    .map(({ canonicalId, canonicalName, sourceDecision }) => [canonicalId, canonicalName, sourceDecision]);
  assert.deepEqual(DROID_SOURCE_REVIEW_ROWS, expected);
  assert.equal(new Set(DROID_SOURCE_REVIEW_ROWS.map(row => row[0])).size, 122);
  assert.equal(DROID_SOURCE_REVIEW_ROWS.filter(row => row[2] === 'PASS').length, 99);
  assert.equal(DROID_SOURCE_REVIEW_ROWS.filter(row => row[2] === 'HOLD').length, 23);
});

test('normal first locomotion has narrow initial-build safe numeric subset, not universal PASS', () => {
  const walking = DROID_SYSTEMS.locomotion.find(part => part.id === 'walking');
  assert.equal(resolveDroidComponentSourceReview(walking).decision, 'BLOCKED');
  const caseOne = {
    operationPhase: 'INITIAL_BUILD', locomotionSlotOrdinal: 1, restrictedLocomotion: false
  };
  assert.equal(resolveDroidComponentSourceReview(walking, caseOne).decision, 'SOURCE_SAFE_SUBSET');
  for (const changes of [
    { operationPhase: 'POST_CREATION_INSTALL' },
    { locomotionSlotOrdinal: 2 },
    { restrictedLocomotion: true }
  ]) {
    assert.equal(resolveDroidComponentSourceReview(walking, { ...caseOne, ...changes }).decision, 'BLOCKED');
  }
  assert.equal(resolveDroidBuilderQuote({
    definition: walking, category: 'locomotion', size: 'medium', speed: 6, ...caseOne
  }).status, 'OK');
  assert.equal(resolveDroidBuilderQuote({
    definition: walking, category: 'locomotion', size: 'medium', speed: 6
  }).status, 'NEEDS_SOURCE_ADJUDICATION');
});

test('source HOLD components fail closed even when numeric legacy definitions exist', () => {
  const rocket = DROID_SYSTEMS.appendageEnhancements.find(part => part.id === 'rocket-arm');
  assert.ok(rocket);
  assert.equal(resolveDroidComponentSourceReview(rocket).sourceDecision, 'HOLD');
  assert.equal(resolveDroidBuilderQuote({
    definition: rocket, category: 'appendageEnhancement', size: 'medium', operationPhase: 'INITIAL_BUILD'
  }).status, 'NEEDS_SOURCE_ADJUDICATION');
});

test('PASS physical source identity is not the same as installation approval', () => {
  const review = resolveDroidComponentSourceReview({ id: 'plasteel-shell' });
  assert.equal(review.decision, 'SOURCE_REVIEW_PASS');
  assert.equal(review.canonicalId, 'droid-plasteel-shell');
  assert.equal(resolveDroidPartQuote({
    type: 'droid', system: { droidSystems: { size: 'small' } }
  }, 'plasteel-shell').credits, 800);
});

test('explicit crosswalk identifies shield variants, while unmatched catalog elements block', () => {
  assert.equal(resolveDroidComponentSourceReview({ id: 'sr10-shield-generator' }).canonicalId, 'droid-shield-generator-sr-10');
  assert.equal(resolveDroidComponentSourceReview({ id: 'remote' }).canonicalId, 'droid-remote-processor');
  assert.equal(resolveDroidComponentSourceReview({ id: 'projectile-appendage' }).sourceDecision, 'HOLD');
  assert.equal(resolveDroidComponentSourceReview({ id: 'military' }).decision, 'BLOCKED');
  assert.equal(resolveDroidComponentSourceReview({ id: 'manipulator-arm' }).sourceDecision, 'UNRECONCILED');
});

test('three legacy translator aliases do NOT authorize the four published tiers', () => {
  for (const id of ['basic-translator', 'advanced-translator', 'universal-translator']) {
    const decision = resolveDroidComponentSourceReview({ id });
    assert.equal(decision.decision, 'BLOCKED', id);
    assert.equal(decision.canonicalId, 'droid-translator-unit', id);
    assert.match(decision.blockingReason, /published variants/);
    const def = DROID_SYSTEMS.accessories.translators.find(p => p.id === id);
    assert.equal(resolveDroidBuilderQuote({
      definition: def, category: 'accessory', subcategory: 'translators',
      size: 'medium', operationPhase: 'INITIAL_BUILD'
    }).status, 'NEEDS_SOURCE_ADJUDICATION');
  }
});
