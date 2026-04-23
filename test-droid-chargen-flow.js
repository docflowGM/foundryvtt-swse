/**
 * Test script: Verify droid chargen active-step computation
 *
 * Proof that ActiveStepComputer produces: intro → class → droid-builder → attribute → ...
 * for subtype 'droid'
 */

import { ActiveStepComputer } from './scripts/apps/progression-framework/shell/active-step-computer.js';
import { ProgressionSession } from './scripts/apps/progression-framework/shell/progression-session.js';
import { ProgressionSubtypeAdapterRegistry } from './scripts/apps/progression-framework/adapters/progression-subtype-adapter-registry.js';

async function testDroidChargenFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('DROID CHARGEN FLOW TEST');
  console.log('='.repeat(80));

  // Create a mock actor
  const mockActor = {
    id: 'test-droid-001',
    name: 'Test Droid',
    type: 'character',
    system: { isDroid: true },
    items: [],
  };

  // Create progression session with droid subtype
  const registry = ProgressionSubtypeAdapterRegistry.getInstance();
  const droidAdapter = registry.resolveAdapter('droid');

  const session = new ProgressionSession({
    actor: mockActor,
    mode: 'chargen',
    subtype: 'droid',
    adapter: droidAdapter,
  });

  // Seed the session
  if (droidAdapter.seedSession) {
    await droidAdapter.seedSession(session, mockActor, 'chargen');
  }

  console.log('\n✓ Session created with subtype: droid');
  console.log(`✓ Adapter: ${droidAdapter.constructor.name}`);
  console.log(`✓ Droid context seeded: pointBuyPool=${session.droidContext?.pointBuyPool}`);

  // Compute active steps
  const computer = new ActiveStepComputer();
  const activeStepIds = await computer.computeActiveSteps(
    mockActor,
    'chargen',
    session,
    { subtype: 'droid' }
  );

  console.log('\n' + '-'.repeat(80));
  console.log('ACTIVE STEP COMPUTATION RESULT');
  console.log('-'.repeat(80));

  console.log(`\nTotal active steps: ${activeStepIds.length}`);
  console.log('\nActive step sequence:');
  activeStepIds.forEach((stepId, index) => {
    console.log(`  ${index + 1}. ${stepId}`);
  });

  // Verify the droid priority order
  console.log('\n' + '-'.repeat(80));
  console.log('VERIFICATION');
  console.log('-'.repeat(80));

  const prioritySteps = ['intro', 'class', 'droid-builder', 'attribute'];
  const priorityIndices = prioritySteps.map(s => activeStepIds.indexOf(s));

  console.log('\nDroid priority step order:');
  prioritySteps.forEach((stepId, i) => {
    const idx = priorityIndices[i];
    if (idx >= 0) {
      console.log(`  ✓ ${stepId} at position ${idx + 1}`);
    } else {
      console.log(`  ✗ ${stepId} MISSING`);
    }
  });

  // Check if priority is preserved
  const priorityCorrect = priorityIndices.every((idx, i) => {
    if (i === 0) return true; // intro is first
    return idx < priorityIndices[i + 1]; // each step comes before the next
  });

  if (priorityCorrect && priorityIndices[0] >= 0 && priorityIndices[1] < priorityIndices[2]) {
    console.log('\n✅ RESULT: Droid chargen flow is CORRECT');
    console.log(`   Expected: intro → class → droid-builder → attribute → ...`);
    console.log(`   Actual:   ${activeStepIds.slice(0, 4).join(' → ')} → ...`);
  } else {
    console.log('\n❌ RESULT: Droid chargen flow is INCORRECT');
    console.log(`   Expected: intro → class → droid-builder → attribute → ...`);
    console.log(`   Actual:   ${activeStepIds.slice(0, 4).join(' → ')} → ...`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80) + '\n');

  return {
    activeStepIds,
    isCorrect: priorityCorrect && priorityIndices[0] >= 0 && priorityIndices[1] < priorityIndices[2],
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDroidChargenFlow().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

export { testDroidChargenFlow };
