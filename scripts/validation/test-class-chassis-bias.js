/**
 * Test Harness: Class Chassis Bias Validation
 *
 * This script tests the Class Chassis Bias implementation with 4 hypothetical character builds
 * Run in Foundry GM console: await CLASS_CHASSIS_BIAS_TESTS()
 */

export async function CLASS_CHASSIS_BIAS_TESTS() {
    const { IdentityEngine } = game.modules.get('foundryvtt-swse')?.exports || window.SWSE.api;

    if (!IdentityEngine) {
        console.error('IdentityEngine not available');
        return;
    }

    console.log('🧪 Class Chassis Bias Test Suite\n');
    console.log('Testing 4 hypothetical character builds:\n');

    // Test Case 1: Jedi L1
    console.log('═══════════════════════════════════════════════════════');
    console.log('TEST 1: Jedi L1 (Baseline Jedi)');
    console.log('═══════════════════════════════════════════════════════\n');

    const mockJedi1 = {
        name: 'Jedi L1',
        id: 'test-jedi-1',
        system: {
            details: { level: 1 },
            classes: { jedi: { level: 1 } },
            prestige: {},
            abilities: { str: 10, dex: 12, con: 10, int: 10, wis: 14, cha: 10 },
            skills: { perception: { trained: true } },
            archetype: null
        },
        items: [],
        getFlag: () => null
    };

    console.log('Actor Configuration:');
    console.log('  Base Class: Jedi L1');
    console.log('  No prestige');
    console.log('  Abilities: STR 10, DEX 12, CON 10, INT 10, WIS 14, CHA 10\n');

    testActorChassisBias(IdentityEngine, mockJedi1);

    // Test Case 2: Noble L1
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 2: Noble L1 (Baseline Noble)');
    console.log('═══════════════════════════════════════════════════════\n');

    const mockNoble1 = {
        name: 'Noble L1',
        id: 'test-noble-1',
        system: {
            details: { level: 1 },
            classes: { noble: { level: 1 } },
            prestige: {},
            abilities: { str: 8, dex: 10, con: 8, int: 13, wis: 12, cha: 14 },
            skills: { perception: { trained: true }, persuasion: { trained: true } },
            archetype: null
        },
        items: [],
        getFlag: () => null
    };

    console.log('Actor Configuration:');
    console.log('  Base Class: Noble L1');
    console.log('  No prestige');
    console.log('  Abilities: STR 8, DEX 10, CON 8, INT 13, WIS 12, CHA 14\n');

    testActorChassisBias(IdentityEngine, mockNoble1);

    // Test Case 3: Jedi 4 / Noble 4 (Swim pattern)
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 3: Jedi 4 / Noble 4 (Swim Pattern - Equal Investment)');
    console.log('═══════════════════════════════════════════════════════\n');

    const mockJediNobleSwim = {
        name: 'Jedi 4 / Noble 4',
        id: 'test-swim',
        system: {
            details: { level: 8 },
            classes: { jedi: { level: 4 }, noble: { level: 4 } },
            prestige: {},
            abilities: { str: 10, dex: 12, con: 10, int: 13, wis: 14, cha: 12 },
            skills: { perception: { trained: true }, persuasion: { trained: true } },
            archetype: null
        },
        items: [],
        getFlag: () => null
    };

    console.log('Actor Configuration:');
    console.log('  Base Classes: Jedi L4 / Noble L4 (SWIM pattern: equal levels)');
    console.log('  Total base level: 8 (prestige excluded)');
    console.log('  Ratio: 50% / 50%');
    console.log('  Pattern weight: 0.45 (SWIM)\n');

    testActorChassisBias(IdentityEngine, mockJediNobleSwim);

    // Test Case 4: Jedi 6 / Noble 1 (DIP pattern) with Jedi Knight L1 prestige
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 4: Jedi 6 / Noble 1 + Jedi Knight L1 (DIP + Prestige)');
    console.log('═══════════════════════════════════════════════════════\n');

    const mockJediDip = {
        name: 'Jedi 6 / Noble 1, Jedi Knight 1',
        id: 'test-dip-prestige',
        system: {
            details: { level: 8 },
            classes: { jedi: { level: 6 }, noble: { level: 1 } },
            prestige: { 'jedi-knight': { level: 1 } },
            abilities: { str: 10, dex: 14, con: 11, int: 11, wis: 15, cha: 10 },
            skills: { perception: { trained: true } },
            archetype: null
        },
        items: [],
        getFlag: () => null
    };

    console.log('Actor Configuration:');
    console.log('  Base Classes: Jedi L6 / Noble L1 (DIP pattern: Noble is dip)');
    console.log('  Total base level: 7 (prestige excluded)');
    console.log('  Prestige: Jedi Knight L1 (stacking weight: 1.0)');
    console.log('  Jedi Ratio: 86% → DIVE (weight 0.75)');
    console.log('  Noble Ratio: 14% → DIP (weight 0.15)\n');

    testActorChassisBias(IdentityEngine, mockJediDip);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✓ Test Suite Complete');
    console.log('═══════════════════════════════════════════════════════\n');
}

function testActorChassisBias(IdentityEngine, actor) {
    const classChassisBias = IdentityEngine.computeClassChassisBias(actor);
    const prestigeClassChassisBias = IdentityEngine.computePrestigeClassChassisBias(actor);

    console.log('CLASS CHASSIS BIAS OUTPUT:');
    console.log('');

    if (Object.keys(classChassisBias.mechanicalBias).length > 0 ||
        Object.keys(classChassisBias.roleBias).length > 0) {
        console.log('Base Class Chassis Bias:');
        if (Object.keys(classChassisBias.mechanicalBias).length > 0) {
            console.log('  Mechanical:');
            for (const [key, value] of Object.entries(classChassisBias.mechanicalBias)) {
                console.log(`    ${key}: ${value.toFixed(4)}`);
            }
        }
        if (Object.keys(classChassisBias.roleBias).length > 0) {
            console.log('  Role:');
            for (const [key, value] of Object.entries(classChassisBias.roleBias)) {
                console.log(`    ${key}: ${value.toFixed(4)}`);
            }
        }
    } else {
        console.log('Base Class Chassis Bias: (empty)');
    }

    if (Object.keys(actor.system.prestige).length > 0) {
        console.log('');
        if (Object.keys(prestigeClassChassisBias.mechanicalBias).length > 0 ||
            Object.keys(prestigeClassChassisBias.roleBias).length > 0) {
            console.log('Prestige Class Chassis Bias:');
            if (Object.keys(prestigeClassChassisBias.mechanicalBias).length > 0) {
                console.log('  Mechanical:');
                for (const [key, value] of Object.entries(prestigeClassChassisBias.mechanicalBias)) {
                    console.log(`    ${key}: ${value.toFixed(4)}`);
                }
            }
            if (Object.keys(prestigeClassChassisBias.roleBias).length > 0) {
                console.log('  Role:');
                for (const [key, value] of Object.entries(prestigeClassChassisBias.roleBias)) {
                    console.log(`    ${key}: ${value.toFixed(4)}`);
                }
            }
        } else {
            console.log('Prestige Class Chassis Bias: (empty)');
        }
    }

    // Show total bias for context
    const totalBias = IdentityEngine.computeTotalBias(actor);
    console.log('');
    console.log('TOTAL BIAS (all 8 layers):');
    if (Object.keys(totalBias.mechanicalBias).length > 0) {
        console.log('  Mechanical: {');
        for (const [key, value] of Object.entries(totalBias.mechanicalBias)) {
            console.log(`    ${key}: ${value.toFixed(4)}`);
        }
        console.log('  }');
    }
    if (Object.keys(totalBias.roleBias).length > 0) {
        console.log('  Role: {');
        for (const [key, value] of Object.entries(totalBias.roleBias)) {
            console.log(`    ${key}: ${value.toFixed(4)}`);
        }
        console.log('  }');
    }

    console.log('');
}

// Alias for ease of use in console
window.CLASS_CHASSIS_BIAS_TESTS = CLASS_CHASSIS_BIAS_TESTS;
