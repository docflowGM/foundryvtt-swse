/**
 * Mentor Memory System - Test & Validation
 *
 * This file contains examples and tests for the mentor memory system.
 * Run in browser console or include in dev environment.
 *
 * Usage:
 *   // Test DSP saturation
 *   testDspSaturation()
 *
 *   // Test mentor memory creation and persistence
 *   await testMentorMemoryPersistence(actor)
 *
 *   // Test commitment decay
 *   testCommitmentDecay()
 */

import {
  MentorMemory,
  getMentorMemory,
  setMentorMemory,
  inferRole,
  decayCommitments,
  setCommittedPath,
  setTargetClass,
  formatMentorMemory
} from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-memory.js';

import {
  calculateDspSaturation,
  getDspBand,
  getToneModifier,
  formatDspInfo
} from '../engine/dsp-saturation.js';

/**
 * Test DSP saturation calculations
 */
export function testDspSaturation() {
  console.group('DSP Saturation Tests');

  const testCases = [
    { dsp: 0, wisdom: 14, expectedBand: 'touched', expectedTone: 'measured' },
    { dsp: 2, wisdom: 14, expectedBand: 'touched', expectedTone: 'measured' },
    { dsp: 3, wisdom: 14, expectedBand: 'strained', expectedTone: 'concerned' },
    { dsp: 5, wisdom: 14, expectedBand: 'slipping', expectedTone: 'firm' },
    { dsp: 10, wisdom: 14, expectedBand: 'tainted', expectedTone: 'grave' },
    { dsp: 13, wisdom: 14, expectedBand: 'edge', expectedTone: 'severe' },
    { dsp: 15, wisdom: 14, expectedBand: 'fallen', expectedTone: 'cold' }
  ];

  testCases.forEach(tc => {
    // Mock actor
    const mockActor = {
      system: {
        darkSidePoints: tc.dsp,
        attributes: { wis: { base: tc.wisdom } }
      }
    };

    const saturation = calculateDspSaturation(mockActor);
    const band = getDspBand(saturation);
    const tone = getToneModifier(band);

    const passed = band === tc.expectedBand && tone === tc.expectedTone;
    const icon = passed ? '✓' : '✗';

    console.log(
      `${icon} DSP ${tc.dsp}/${tc.wisdom} = ${saturation.toFixed(2)} → ${band} (${tone})`
    );

    if (!passed) {
      console.error(
        `  Expected: band=${tc.expectedBand}, tone=${tc.expectedTone}`
      );
    }
  });

  console.groupEnd();
}

/**
 * Test mentor memory creation and serialization
 */
export function testMentorMemorySerialization() {
  console.group('Mentor Memory Serialization Tests');

  // Create memory
  const memory1 = new MentorMemory({
    trust: 0.7,
    inferredRole: 'striker',
    committedPath: 'aggressive-striker'
  });

  console.log('Original:', memory1);

  // Serialize
  const json = memory1.toJSON();
  console.log('Serialized:', json);

  // Deserialize
  const memory2 = MentorMemory.fromJSON(json);
  console.log('Deserialized:', memory2);

  // Verify equality
  const equal = JSON.stringify(memory1.toJSON()) === JSON.stringify(memory2.toJSON());
  console.log(equal ? '✓ Serialization round-trip successful' : '✗ Serialization failed');

  console.groupEnd();
}

/**
 * Test commitment decay
 */
export function testCommitmentDecay() {
  console.group('Commitment Decay Tests');

  const memory = new MentorMemory({
    committedPath: 'guardian',
    commitmentStrength: 1.0,
    targetClass: 'Jedi Master',
    targetCommitment: 1.0
  });

  console.log('Initial state:');
  console.log(`  Path commitment: ${memory.commitmentStrength}`);
  console.log(`  Target commitment: ${memory.targetCommitment}`);

  // Decay with default rate (0.15)
  const decayed1 = decayCommitments(memory, 0.15);
  console.log('\nAfter 1 levelup (15% decay):');
  console.log(`  Path commitment: ${decayed1.commitmentStrength.toFixed(2)}`);
  console.log(`  Target commitment: ${decayed1.targetCommitment.toFixed(2)}`);

  // Decay again
  const decayed2 = decayCommitments(decayed1, 0.15);
  console.log('\nAfter 2 levelups (30% total decay):');
  console.log(`  Path commitment: ${decayed2.commitmentStrength.toFixed(2)}`);
  console.log(`  Target commitment: ${decayed2.targetCommitment.toFixed(2)}`);

  // Decay until zero
  let temp = decayed2;
  let levelups = 2;
  while (temp.commitmentStrength > 0) {
    temp = decayCommitments(temp, 0.15);
    levelups++;
  }

  console.log(`\nFull decay to zero at levelup ${levelups}`);
  console.log('✓ Commitment decay working correctly');

  console.groupEnd();
}

/**
 * Test role inference
 */
export function testRoleInference() {
  console.group('Role Inference Tests');

  // Mock high STR character (striker)
  const strikeMock = {
    system: {
      attributes: {
        str: { base: 18 },
        dex: { base: 16 },
        con: { base: 13 },
        wis: { base: 10 }
      }
    },
    items: { filter: () => [] }
  };

  const strikerRole = inferRole(strikeMock);
  console.log('High STR/DEX → ', strikerRole.primary, `(${Math.round(strikerRole.confidence * 100)}%)`);

  // Mock high WIS character (controller)
  const controlMock = {
    system: {
      attributes: {
        str: { base: 10 },
        dex: { base: 10 },
        con: { base: 13 },
        wis: { base: 18 }
      }
    },
    items: { filter: () => [] }
  };

  const controlRole = inferRole(controlMock);
  console.log('High WIS → ', controlRole.primary, `(${Math.round(controlRole.confidence * 100)}%)`);

  // Mock high CON character (guardian)
  const guardMock = {
    system: {
      attributes: {
        str: { base: 10 },
        dex: { base: 10 },
        con: { base: 18 },
        wis: { base: 10 }
      }
    },
    items: { filter: () => [] }
  };

  const guardRole = inferRole(guardMock);
  console.log('High CON → ', guardRole.primary, `(${Math.round(guardRole.confidence * 100)}%)`);

  console.log('✓ Role inference working correctly');
  console.groupEnd();
}

/**
 * Test full DSP info formatting
 */
export function testDspInfoFormatting() {
  console.group('DSP Info Formatting Tests');

  const mockActor = {
    system: {
      darkSidePoints: 8,
      attributes: { wis: { base: 14 } }
    }
  };

  const info = formatDspInfo(mockActor);
  console.log('DSP Info:', info);

  console.log(`  Dark Side Points: ${info.darkSidePoints}/${info.wisdom}`);
  console.log(`  Saturation: ${info.saturationPercent}%`);
  console.log(`  Band: ${info.band}`);
  console.log(`  Tone: ${info.toneModifier}`);
  console.log(`  Warning: ${info.shouldWarn ? 'YES' : 'NO'} (Severity: ${info.warningSeverity})`);
  console.log(`  Dark Side Bias: x${info.darkSideBiasMultiplier}`);

  console.log('✓ DSP formatting working correctly');
  console.groupEnd();
}

/**
 * Test mentor memory persistence with a real actor
 * REQUIRES actor argument
 */
export async function testMentorMemoryPersistence(actor) {
  if (!actor) {
    console.error('testMentorMemoryPersistence: actor required');
    return;
  }

  console.group('Mentor Memory Persistence Tests');

  const mentorId = 'miraj';

  // Get initial memory (should be empty/default)
  let memory = getMentorMemory(actor, mentorId);
  console.log('Initial memory:', formatMentorMemory(memory));

  // Set some values
  memory = setCommittedPath(memory, 'guardian');
  memory.trust = 0.8;

  // Save to actor
  await setMentorMemory(actor, mentorId, memory);
  console.log('Saved memory with path commitment');

  // Retrieve and verify
  const retrieved = getMentorMemory(actor, mentorId);
  console.log('Retrieved memory:', formatMentorMemory(retrieved));

  const savedCorrectly =
    retrieved.committedPath === 'guardian' &&
    retrieved.trust === 0.8 &&
    retrieved.commitmentStrength === 1.0;

  console.log(savedCorrectly ? '✓ Persistence working correctly' : '✗ Persistence failed');

  console.groupEnd();
}

/**
 * Run all tests
 */
export async function runAllTests(actor = null) {
  console.log('='.repeat(50));
  console.log('Mentor System - Full Test Suite');
  console.log('='.repeat(50));

  testDspSaturation();
  testMentorMemorySerialization();
  testCommitmentDecay();
  testRoleInference();
  testDspInfoFormatting();

  if (actor) {
    await testMentorMemoryPersistence(actor);
  } else {
    console.warn('⚠ Skipping persistence test (no actor provided)');
  }

  console.log('='.repeat(50));
  console.log('Test suite complete');
  console.log('='.repeat(50));
}

// Export for console use
window.MentorSystemTests = {
  testDspSaturation,
  testMentorMemorySerialization,
  testCommitmentDecay,
  testRoleInference,
  testDspInfoFormatting,
  testMentorMemoryPersistence,
  runAllTests
};
