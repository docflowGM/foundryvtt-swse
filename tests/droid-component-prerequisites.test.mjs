import test from 'node:test';
import assert from 'node:assert/strict';
import { DROID_SYSTEMS } from '../scripts/data/droid-systems.js';
import {
  evaluateDroidComponentPrerequisites as prerequisites
} from '../scripts/domain/droids/droid-component-prerequisites.js';
import {
  resolveDroidBuilderQuote
} from '../scripts/domain/droids/droid-component-quote-authority.js';
import { quoteDroidBuilderSelection } from '../scripts/domain/droids/droid-builder-quote-consumer.js';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
registerFoundryPathLoader();
const { resolveDroidPartQuote } = await import('../scripts/data/droid-part-schema.js');

const armor = DROID_SYSTEMS.accessories.hardenedsystems.find(x => x.id === 'hardened-systems-x2');
const extraLegs = DROID_SYSTEMS.locomotionEnhancements.find(x => x.id === 'extra-legs');
const gyro = DROID_SYSTEMS.locomotionEnhancements.find(x => x.id === 'gyroscopic-stabilizers');
const receiver = DROID_SYSTEMS.processorEnhancements.find(x => x.id === 'remote-receiver');
const backup = DROID_SYSTEMS.processorEnhancements.find(x => x.id === 'backup-processor');
const projectile = DROID_SYSTEMS.appendageEnhancements.find(x => x.id === 'projectile-appendage');

test('typed sizeRestriction blocks hardened systems on Small, permits prerequisite on Large', () => {
  assert.deepEqual(prerequisites({ definition: armor, size: 'small' }), {
    status: 'BLOCKED', blockingReason: 'Requires a large or larger droid chassis',
    blockingField: 'sizeRestriction'
  });
  assert.equal(prerequisites({ definition: armor, size: 'large' }).status, 'PREREQUISITES_MET');
  // Numeric prices do not override the prerequisite. Source review was PASS.
  assert.equal(resolveDroidBuilderQuote({
    definition: armor, category: 'accessory', subcategory: 'hardenedsystems',
    size: 'small'
  }).status, 'BLOCKED');
  assert.equal(quoteDroidBuilderSelection({
    definition: armor, category: 'accessory', subcategory: 'hardenedsystems',
    size: 'large', droidSystems: {}
  }).status, 'OK');
});

test('Garage uses the SAME size precondition gate, not a separate preview-only guard', () => {
  const actor = size => ({
    type: 'droid', system: { droidSystems: { size }, installedSystems: {} }
  });
  assert.equal(resolveDroidPartQuote(actor('small'), 'hardened-systems-x2').status, 'BLOCKED');
  assert.equal(resolveDroidPartQuote(actor('large'), 'hardened-systems-x2').status, 'OK');
});

test('locomotion prerequisites use one canonical, correctly spelled source field', () => {
  assert.equal(Object.hasOwn(extraLegs, 'requiresLocomtion'), false);
  assert.equal(extraLegs.requiredLocomotion, 'walking');
  assert.equal(prerequisites({
    definition: extraLegs, size: 'medium',
    droidSystems: { locomotion: { id: 'tracked' } }
  }).blockingField, 'requiredLocomotion');
  assert.equal(prerequisites({
    definition: extraLegs, size: 'medium',
    droidSystems: { locomotion: { id: 'walking' } }
  }).status, 'PREREQUISITES_MET');
  assert.equal(prerequisites({
    definition: gyro, size: 'medium'
  }).status, 'BLOCKED', 'any still requires a real selected locomotion system');
  assert.equal(prerequisites({
    definition: gyro, size: 'medium',
    droidSystems: { locomotion: { id: 'stationary' } }
  }).status, 'PREREQUISITES_MET');
});

test('requiredSystems is checked against selected and installed identities, not UI labels', () => {
  assert.equal(prerequisites({
    definition: receiver, size: 'medium',
    droidSystems: { processor: { id: 'heuristic' } }
  }).blockingField, 'requiredSystems');
  assert.equal(prerequisites({
    definition: receiver, size: 'medium',
    droidSystems: { processor: { id: 'remote' } }
  }).status, 'PREREQUISITES_MET');
  assert.equal(prerequisites({
    definition: backup, size: 'medium',
    droidSystems: { processor: { id: 'remote' } }
  }).blockingField, 'requiredSystems');
  assert.equal(prerequisites({
    definition: backup, size: 'medium',
    droidSystems: { processor: { id: 'remote' } },
    installedComponentIds: ['remote-receiver']
  }).status, 'PREREQUISITES_MET');
});

test('type-only appendage identity never proves physical host; only unique instance can', () => {
  const chassis = {
    appendages: [
      { id: 'hand', instanceId: 'new-hand-left', slot: 'left-arm' },
      { id: 'hand', instanceId: 'new-hand-right', slot: 'right-arm' }
    ]
  };
  const input = { definition: projectile, size: 'medium', droidSystems: chassis };
  assert.equal(prerequisites(input).blockingField, 'requiresAppendage');
  assert.equal(prerequisites({ ...input, selectedAppendage: { id: 'hand' } }).status, 'BLOCKED');
  assert.equal(prerequisites({
    ...input, selectedAppendage: { id: 'claw', instanceId: 'new-hand-left' }
  }).status, 'BLOCKED');
  assert.equal(prerequisites({
    ...input, selectedAppendage: { id: 'hand', instanceId: 'new-hand-left' }
  }).status, 'PREREQUISITES_MET');
  assert.equal(prerequisites({
    ...input, droidSystems: { appendages: [chassis.appendages[0], chassis.appendages[0]] },
    selectedAppendage: { id: 'hand', instanceId: 'new-hand-left' }
  }).status, 'BLOCKED', 'duplicate instance identity is never an authorized host');
  // Even with a valid appendage target, its separate printed PRICE HOLD survives.
  const quote = resolveDroidBuilderQuote({
    ...input, category: 'appendageEnhancement', selectedAppendage: {
      id: 'hand', instanceId: 'new-hand-left'
    }
  });
  assert.equal(quote.status, 'NEEDS_SOURCE_ADJUDICATION');
});

test('published source prerequisites do not claim a legal host or retail permission', () => {
  const passing = prerequisites({
    definition: { id: 'hardened-systems-x2', sizeRestriction: 'large', availability: 'Military' },
    size: 'huge'
  });
  assert.deepEqual(passing, {
    status: 'PREREQUISITES_MET', blockingReason: null, blockingField: null
  });
});
