/**
 * Simple test script to verify FeatEffectsEngine parsing logic
 * Run with: node test-feat-effects.js
 */

// Mock the patterns from FeatEffectsEngine
const testFeats = [
    {
        name: "Stealthy",
        benefit: "You gain a +2 bonus on Stealth checks and may reroll a failed Stealth check once per encounter.",
        expected: { skill: true, skillName: "stealth", bonus: 2 }
    },
    {
        name: "Toughness",
        benefit: "You gain +5 hit points.",
        expected: { hp: true, bonus: 5 }
    },
    {
        name: "Indomitable Will",
        benefit: "You gain a +2 bonus on Will Defense against mind-affecting effects and may reroll a failed Will Defense check once per encounter.",
        expected: { defense: false } // conditional - should be skipped
    },
    {
        name: "Forceful Throw",
        benefit: "You gain a +2 bonus on Use the Force checks made to activate Move Object.",
        expected: { skill: false } // conditional - should be skipped
    }
];

// Test skill parsing
function testSkillBonuses(benefit) {
    const conditionalPhrases = ['made to', 'to activate', 'made for', 'when making', 'when you make'];
    const skillPattern = /\+(\d+)\s+(?:bonus\s+)?(?:on|to)\s+(?:all\s+)?([a-z\s]+?)\s+(?:checks?|skill)/gi;

    const skillMap = {
        'stealth': 'stealth',
        'perception': 'perception',
        'use the force': 'useTheForce'
    };

    const results = [];
    let match;

    while ((match = skillPattern.exec(benefit)) !== null) {
        const bonus = parseInt(match[1]);
        const skillNameRaw = match[2].trim().toLowerCase();
        const skillKey = skillMap[skillNameRaw];

        if (!skillKey) continue;

        const matchStart = match.index;
        const contextWindow = benefit.substring(matchStart, matchStart + 150).toLowerCase();
        const isConditional = conditionalPhrases.some(phrase => contextWindow.includes(phrase));

        if (isConditional) {
            console.log(`  ❌ Skipped conditional: ${skillNameRaw} +${bonus}`);
            continue;
        }

        results.push({ skillKey, bonus });
        console.log(`  ✓ Found skill bonus: ${skillNameRaw} +${bonus}`);
    }

    return results;
}

// Test defense parsing
function testDefenseBonuses(benefit) {
    const conditionalPhrases = ['against', 'while', 'when', 'if you', 'during', 'once per', 'until'];
    const defensePattern = /\+(\d+)\s+(?:bonus\s+)?(?:to|on)\s+(reflex|fortitude|will)\s+defense/gi;

    const results = [];
    let match;

    while ((match = defensePattern.exec(benefit)) !== null) {
        const bonus = parseInt(match[1]);
        const defenseType = match[2].toLowerCase();

        const matchStart = match.index;
        const contextWindow = benefit.substring(matchStart, matchStart + 100).toLowerCase();
        const isConditional = conditionalPhrases.some(phrase => contextWindow.includes(phrase));

        if (isConditional) {
            console.log(`  ❌ Skipped conditional: ${defenseType} defense +${bonus}`);
            continue;
        }

        results.push({ defenseType, bonus });
        console.log(`  ✓ Found defense bonus: ${defenseType} defense +${bonus}`);
    }

    return results;
}

// Test HP parsing
function testHPBonuses(benefit) {
    const hpPattern = /\+(\d+)\s+(?:hit\s+points?|hp)/gi;
    const results = [];
    let match;

    while ((match = hpPattern.exec(benefit)) !== null) {
        const bonus = parseInt(match[1]);
        results.push({ bonus });
        console.log(`  ✓ Found HP bonus: +${bonus}`);
    }

    return results;
}

// Run tests
console.log("Testing FeatEffectsEngine Parsing Logic\n");
console.log("=" .repeat(50));

let passed = 0;
let failed = 0;

testFeats.forEach(feat => {
    console.log(`\nTesting: ${feat.name}`);
    console.log(`Benefit: ${feat.benefit}`);

    const skillResults = testSkillBonuses(feat.benefit);
    const defenseResults = testDefenseBonuses(feat.benefit);
    const hpResults = testHPBonuses(feat.benefit);

    // Verify expectations
    let testPassed = true;

    if (feat.expected.skill !== undefined) {
        if (feat.expected.skill && skillResults.length === 0) {
            console.log(`  ❌ FAIL: Expected skill bonus, found none`);
            testPassed = false;
        } else if (!feat.expected.skill && skillResults.length > 0) {
            console.log(`  ❌ FAIL: Expected no skill bonus, found one`);
            testPassed = false;
        } else if (feat.expected.skill && skillResults.length > 0) {
            if (skillResults[0].bonus !== feat.expected.bonus) {
                console.log(`  ❌ FAIL: Expected bonus ${feat.expected.bonus}, got ${skillResults[0].bonus}`);
                testPassed = false;
            }
        }
    }

    if (feat.expected.defense !== undefined) {
        if (feat.expected.defense && defenseResults.length === 0) {
            console.log(`  ❌ FAIL: Expected defense bonus, found none`);
            testPassed = false;
        } else if (!feat.expected.defense && defenseResults.length > 0) {
            console.log(`  ❌ FAIL: Expected no defense bonus, found one`);
            testPassed = false;
        }
    }

    if (feat.expected.hp !== undefined) {
        if (feat.expected.hp && hpResults.length === 0) {
            console.log(`  ❌ FAIL: Expected HP bonus, found none`);
            testPassed = false;
        } else if (!feat.expected.hp && hpResults.length > 0) {
            console.log(`  ❌ FAIL: Expected no HP bonus, found one`);
            testPassed = false;
        } else if (feat.expected.hp && hpResults.length > 0) {
            if (hpResults[0].bonus !== feat.expected.bonus) {
                console.log(`  ❌ FAIL: Expected bonus ${feat.expected.bonus}, got ${hpResults[0].bonus}`);
                testPassed = false;
            }
        }
    }

    if (testPassed) {
        console.log(`  ✅ PASS`);
        passed++;
    } else {
        failed++;
    }
});

console.log("\n" + "=".repeat(50));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log("✅ All tests passed!");
    process.exit(0);
} else {
    console.log("❌ Some tests failed");
    process.exit(1);
}
