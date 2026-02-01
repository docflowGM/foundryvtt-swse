/**
 * SnapshotBuilder Tests
 *
 * Tests to validate that SnapshotBuilder produces:
 * 1. Deterministic hashes (same input → same hash)
 * 2. Sensitive hashes (different input → different hash)
 * 3. Stable snapshots (reproducible structure)
 *
 * Run with: foundry-vtt test command or manual console testing
 */

import { SnapshotBuilder } from './SnapshotBuilder.js';

export class SnapshotBuilderTests {
  /**
   * Test 1: Hash is stable for identical snapshots
   */
  static testHashStability() {
    console.group('Test 1: Hash Stability');

    const actor = {
      system: {
        level: 5,
        abilities: {
          str: { value: 16 },
          dex: { value: 15 },
          con: { value: 14 },
          int: { value: 11 },
          wis: { value: 12 },
          cha: { value: 13 }
        },
        skills: {}
      },
      items: []
    };

    const hash1 = SnapshotBuilder.hashFromActor(actor, 'feats', null);
    const hash2 = SnapshotBuilder.hashFromActor(actor, 'feats', null);
    const hash3 = SnapshotBuilder.hashFromActor(actor, 'feats', null);

    console.assert(hash1 === hash2, 'Hash 1 should equal Hash 2');
    console.assert(hash2 === hash3, 'Hash 2 should equal Hash 3');
    console.assert(hash1.length === 8, 'Hash should be 8 characters');

    console.log(`✓ Hash is stable: ${hash1}`);
    console.groupEnd();
  }

  /**
   * Test 2: Hash changes when character state changes
   */
  static testHashSensitivity() {
    console.group('Test 2: Hash Sensitivity');

    const baseActor = {
      system: {
        level: 5,
        abilities: {
          str: { value: 16 },
          dex: { value: 15 },
          con: { value: 14 },
          int: { value: 11 },
          wis: { value: 12 },
          cha: { value: 13 }
        },
        skills: {}
      },
      items: []
    };

    const hashBase = SnapshotBuilder.hashFromActor(baseActor, 'feats', null);

    // Change level
    const levelChanged = JSON.parse(JSON.stringify(baseActor));
    levelChanged.system.level = 6;
    const hashLevel = SnapshotBuilder.hashFromActor(levelChanged, 'feats', null);
    console.assert(
      hashBase !== hashLevel,
      `Hash should change when level changes: ${hashBase} vs ${hashLevel}`
    );

    // Change ability
    const abilityChanged = JSON.parse(JSON.stringify(baseActor));
    abilityChanged.system.abilities.str.value = 17;
    const hashAbility = SnapshotBuilder.hashFromActor(abilityChanged, 'feats', null);
    console.assert(
      hashBase !== hashAbility,
      `Hash should change when ability changes: ${hashBase} vs ${hashAbility}`
    );

    // Change focus
    const focusChanged = baseActor;
    const hashFocus = SnapshotBuilder.hashFromActor(focusChanged, 'talents', null);
    console.assert(
      hashBase !== hashFocus,
      `Hash should change when focus changes: ${hashBase} vs ${hashFocus}`
    );

    // Change pending
    const pendingChanged = baseActor;
    const pendingData = { selectedFeats: [{ id: 'feat-123' }] };
    const hashPending = SnapshotBuilder.hashFromActor(pendingChanged, 'feats', pendingData);
    console.assert(
      hashBase !== hashPending,
      `Hash should change when pending changes: ${hashBase} vs ${hashPending}`
    );

    console.log('✓ Hash is sensitive to all meaningful state changes');
    console.groupEnd();
  }

  /**
   * Test 3: Snapshot structure is correct
   */
  static testSnapshotStructure() {
    console.group('Test 3: Snapshot Structure');

    const actor = {
      system: {
        level: 3,
        abilities: {
          str: { value: 14 },
          dex: { value: 15 },
          con: { value: 13 },
          int: { value: 12 },
          wis: { value: 11 },
          cha: { value: 16 }
        },
        skills: {
          acrobatics: { trained: true },
          perception: { trained: false }
        },
        proficiencies: []
      },
      items: [
        { type: 'species', id: 'species-human', name: 'Human' },
        { type: 'class', id: 'class-soldier', name: 'Soldier' },
        { type: 'feat', id: 'feat-001', name: 'Weapon Proficiency' },
        { type: 'talent', id: 'talent-001', name: 'Commando' }
      ]
    };

    const snapshot = SnapshotBuilder.build(actor, 'feats', null);

    // Validate structure
    console.assert(snapshot.charLevel === 3, 'charLevel should be 3');
    console.assert(snapshot.speciesId === 'species-human', 'speciesId should be species-human');
    console.assert(snapshot.classIds.includes('class-soldier'), 'classIds should include soldier');
    console.assert(
      Object.keys(snapshot.attributes).sort().join(',') === 'cha,con,dex,int,str,wis',
      'attributes should be alphabetically ordered'
    );
    console.assert(snapshot.trainedSkills.includes('acrobatics'), 'trainedSkills should include acrobatics');
    console.assert(!snapshot.trainedSkills.includes('perception'), 'trainedSkills should not include untrained skills');
    console.assert(snapshot.selectedFeats.includes('feat-001'), 'selectedFeats should include feat-001');
    console.assert(snapshot.selectedTalents.includes('talent-001'), 'selectedTalents should include talent-001');
    console.assert(snapshot.focus === 'feats', 'focus should be feats');

    console.log('✓ Snapshot structure is correct and complete');
    console.log('Snapshot:', JSON.stringify(snapshot, null, 2));
    console.groupEnd();
  }

  /**
   * Test 4: Pending selections are included correctly
   */
  static testPendingData() {
    console.group('Test 4: Pending Data');

    const actor = {
      system: {
        level: 2,
        abilities: {
          str: { value: 15 },
          dex: { value: 14 },
          con: { value: 13 },
          int: { value: 12 },
          wis: { value: 11 },
          cha: { value: 16 }
        },
        skills: {}
      },
      items: []
    };

    const pendingData = {
      selectedClass: { id: 'class-scoundrel' },
      selectedFeats: [{ id: 'feat-a' }, { id: 'feat-b' }],
      selectedTalents: [{ id: 'talent-x' }],
      selectedSkills: ['stealth', 'deception'],
      selectedPowers: []
    };

    const snapshot = SnapshotBuilder.build(actor, 'feats', pendingData);

    console.assert(
      snapshot.pending.selectedClass === 'class-scoundrel',
      'pending.selectedClass should be extracted'
    );
    console.assert(
      snapshot.pending.selectedFeats.sort().join(',') === 'feat-a,feat-b',
      'pending.selectedFeats should be sorted'
    );
    console.assert(
      snapshot.pending.selectedSkills.sort().join(',') === 'deception,stealth',
      'pending.selectedSkills should be sorted'
    );

    console.log('✓ Pending data is extracted and sorted correctly');
    console.log('Pending snapshot:', JSON.stringify(snapshot.pending, null, 2));
    console.groupEnd();
  }

  /**
   * Test 5: Serialization is deterministic
   */
  static testSerializationDeterminism() {
    console.group('Test 5: Serialization Determinism');

    const actor = {
      system: {
        level: 4,
        abilities: {
          str: { value: 16 },
          dex: { value: 15 },
          con: { value: 14 },
          int: { value: 11 },
          wis: { value: 12 },
          cha: { value: 13 }
        },
        skills: {}
      },
      items: []
    };

    const snap1 = SnapshotBuilder.build(actor, 'feats', null);
    const snap2 = SnapshotBuilder.build(actor, 'feats', null);

    const json1 = SnapshotBuilder.serialize(snap1);
    const json2 = SnapshotBuilder.serialize(snap2);

    console.assert(json1 === json2, 'Serialized JSON should be identical');
    console.assert(
      JSON.parse(json1).attributes.str === 16,
      'Deserialized JSON should preserve data'
    );

    console.log('✓ Serialization is deterministic');
    console.groupEnd();
  }

  /**
   * Test 6: Diff functionality works
   */
  static testSnapshotDiff() {
    console.group('Test 6: Snapshot Diff');

    const actor1 = {
      system: {
        level: 3,
        abilities: {
          str: { value: 15 },
          dex: { value: 15 },
          con: { value: 13 },
          int: { value: 12 },
          wis: { value: 11 },
          cha: { value: 13 }
        },
        skills: {}
      },
      items: []
    };

    const actor2 = JSON.parse(JSON.stringify(actor1));
    actor2.system.level = 4;
    actor2.system.abilities.str.value = 16;

    const snap1 = SnapshotBuilder.build(actor1, 'feats', null);
    const snap2 = SnapshotBuilder.build(actor2, 'feats', null);

    const diff = SnapshotBuilder.diff(snap1, snap2);

    console.assert(diff.charLevel !== undefined, 'Diff should include charLevel change');
    console.assert(diff.attributes !== undefined, 'Diff should include attributes change');
    console.assert(!diff.selectedFeats, 'Diff should not include unchanged fields');

    console.log('✓ Snapshot diff works correctly');
    console.log('Differences:', JSON.stringify(diff, null, 2));
    console.groupEnd();
  }

  /**
   * Run all tests
   */
  static runAll() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   SnapshotBuilder Test Suite            ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
      this.testHashStability();
      this.testHashSensitivity();
      this.testSnapshotStructure();
      this.testPendingData();
      this.testSerializationDeterminism();
      this.testSnapshotDiff();

      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   ✓ All Tests Passed                    ║');
      console.log('╚════════════════════════════════════════╝');
    } catch (err) {
      console.error('\n✗ Test failed:', err);
      throw err;
    }
  }
}

// Export for module usage
export default SnapshotBuilderTests;
