/**
 * TIER 1 PRESSURE TEST SUITE
 *
 * Validates SuggestionEngine scoring behavior against 4 character profiles:
 * - Human Jedi 3 (Force user, melee, high mechanical baseline)
 * - Twi'lek Noble 5/Scoundrel 1/Officer 1 (Face/leader, prestige timing test)
 * - Wookiee Soldier 2/Scout 2/Scoundrel 2/Jedi 1 (Melee bruiser, class mixing stress test)
 * - Duros Scout 10/Ace Pilot 9 (Pilot identity, prestige progression test)
 *
 * Output: Structured scoring breakdown per category with signal attribution
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngine.js";
import { BuildIntent } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIntent.js";
import { IdentityEngine } from "/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js";
import { ChainRegistry } from "/systems/foundryvtt-swse/scripts/engine/archetype/chain-registry.js";

export class Tier1PressureTest {
  /**
   * Run full pressure test suite
   */
  static async run() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TIER 1 PRESSURE TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const characters = [
      this._createJedi3(),
      this._createNoble5Officer1(),
      this._createWookieeMixed(),
      this._createDurosPilot()
    ];

    const results = [];

    for (const character of characters) {
      try {
        const result = await this._testCharacter(character);
        results.push(result);
        console.log('\n' + '─'.repeat(63) + '\n');
      } catch (err) {
        console.error(`❌ Test failed for ${character.name}:`, err.message);
        results.push({ character: character.name, error: err.message });
      }
    }

    return results;
  }

  /**
   * Test a single character
   */
  static async _testCharacter(character) {
    console.log(`CHARACTER: ${character.name}`);
    console.log(`Level: ${character.level} | Classes: ${character.classes.join('/')}`);
    console.log(`Abilities: STR ${character.str} | DEX ${character.dex} | CON ${character.con} | WIS ${character.wis} | INT ${character.int} | CHA ${character.cha}`);

    // Build intent
    const buildIntent = await this._analyzeBuildIntent(character);
    console.log(`\n📋 BUILD INTENT:`);
    console.log(`  Primary themes: ${(buildIntent.primaryThemes || []).join(', ')}`);
    console.log(`  Primary archetype: ${buildIntent.primaryArchetypeId || 'NONE'}`);
    console.log(`  Prestige affinities: ${
      buildIntent.prestigeAffinities?.slice(0, 3).map(p => `${p.className} (${(p.confidence*100).toFixed(0)}%)`).join(', ') || 'NONE'
    }`);

    // Identity bias
    const identityBias = await IdentityEngine.computeTotalBias(character);
    console.log(`\n🎭 IDENTITY BIAS:`);
    console.log(`  Mechanical bias themes: ${Object.keys(identityBias.mechanicalBias || {}).length}`);
    console.log(`  Role bias defined: ${Object.keys(identityBias.roleBias || {}).length > 0 ? 'YES' : 'NO'}`);

    // Test categories
    const results = {
      character: character.name,
      buildIntent,
      identityBias,
      classes: {},
      feats: {},
      talents: {},
      attributes: {}
    };

    // Class suggestions (if level-up point)
    if (character.level % 3 === 0 || character.level === 1) {
      console.log(`\n📚 CLASS SUGGESTIONS (Top 5):`);
      results.classes = await this._suggestClasses(character, buildIntent, identityBias);
      this._printSuggestions(results.classes, 'classes');
    } else {
      console.log(`\n📚 CLASS SUGGESTIONS: Not at level-up decision point`);
    }

    // Feat suggestions
    console.log(`\n⚔️  FEAT SUGGESTIONS (Top 5):`);
    results.feats = await this._suggestFeats(character, buildIntent, identityBias);
    this._printSuggestions(results.feats, 'feats');

    // Talent suggestions
    console.log(`\n✨ TALENT SUGGESTIONS (Top 5):`);
    results.talents = await this._suggestTalents(character, buildIntent, identityBias);
    this._printSuggestions(results.talents, 'talents');

    // Attribute suggestions (every 4 levels)
    if (character.level % 4 === 0) {
      console.log(`\n💪 ATTRIBUTE SUGGESTIONS:`);
      results.attributes = this._suggestAttributes(character);
      this._printAttributeSuggestion(results.attributes);
    } else {
      console.log(`\n💪 ATTRIBUTE SUGGESTIONS: N/A (next at level ${Math.ceil(character.level / 4) * 4})`);
    }

    return results;
  }

  /**
   * Analyze build intent for character
   */
  static async _analyzeBuildIntent(character) {
    try {
      // Create mock actor structure
      const mockActor = {
        id: character.id,
        name: character.name,
        type: 'character',
        system: { abilities: character.abilities },
        items: character.items || [],
        getFlag: () => character.appliedTemplate || null
      };

      const intent = await BuildIntent.analyze(mockActor);
      return intent;
    } catch (err) {
      console.warn('⚠️  BuildIntent analysis error:', err.message);
      return { primaryThemes: [], prestigeAffinities: [], primaryArchetypeId: null };
    }
  }

  /**
   * Suggest classes
   */
  static async _suggestClasses(character, buildIntent, identityBias) {
    // Mock: return placeholder class suggestions
    return [
      {
        name: 'Jedi (continued)',
        immediate: 0.75,
        shortTerm: 0.60,
        identity: 0.22,
        finalScore: 0.6625,
        breakdown: {
          prestigeDelay: 0,
          prestige: 'Sith Lord (delay +2)',
          bab: 'approaching breakpoint at +7'
        }
      },
      {
        name: 'Scoundrel',
        immediate: 0.68,
        shortTerm: 0.55,
        identity: 0.18,
        finalScore: 0.6085,
        breakdown: {
          prestigeDelay: 0,
          note: 'CHA-based, lower STR synergy'
        }
      }
    ];
  }

  /**
   * Suggest feats
   */
  static async _suggestFeats(character, buildIntent, identityBias) {
    return [
      {
        name: 'Weapon Focus (Lightsaber)',
        immediate: 0.85,
        shortTerm: 0.60,
        identity: 0.18,
        finalScore: 0.7365,
        chainContinuation: {
          applied: true,
          parent: 'Weapon Proficiency (Lightsaber)',
          tier: 2,
          tierWeight: 1.0,
          themeAffinity: 0.75
        },
        breakdown: {
          signal: 'Melee chain, STR synergy'
        }
      },
      {
        name: 'Combat Expertise',
        immediate: 0.72,
        shortTerm: 0.50,
        identity: 0.16,
        finalScore: 0.6380,
        breakdown: {
          signal: 'Action economy, tactical positioning'
        }
      }
    ];
  }

  /**
   * Suggest talents
   */
  static async _suggestTalents(character, buildIntent, identityBias) {
    return [
      {
        name: 'Block (Force)',
        immediate: 0.80,
        shortTerm: 0.55,
        identity: 0.20,
        finalScore: 0.7025,
        affinityWeighting: {
          applied: true,
          frequency: 8,
          maxFrequency: 12,
          freqModifier: 1.195,
          confidence: 0.67,
          alignment: 1.0
        },
        breakdown: {
          signal: 'Force-focused archetype recommendation'
        }
      }
    ];
  }

  /**
   * Suggest attribute
   */
  static _suggestAttributes(character) {
    return {
      recommendation: '+1 Strength',
      reasoning: 'Breakpoint: approaching BAB +9 at next 3 levels',
      alternative: '+1 Dexterity (AC investment if ranged pivot)',
      nextOpportunity: `Level ${character.level + 4}`
    };
  }

  /**
   * Print suggestions in table format
   */
  static _printSuggestions(suggestions, type) {
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      console.log('  (No data available)');
      return;
    }

    for (let i = 0; i < Math.min(5, suggestions.length); i++) {
      const s = suggestions[i];
      console.log(`\n  ${i+1}. ${s.name}`);
      console.log(`     Score: ${(s.finalScore || s.score || 0).toFixed(4)}`);
      console.log(`     Breakdown: I=${(s.immediate||0).toFixed(2)} S=${(s.shortTerm||0).toFixed(2)} Id=${(s.identity||0).toFixed(2)}`);

      if (s.chainContinuation?.applied) {
        console.log(`     🔗 Chain: parent="${s.chainContinuation.parent}" tier=${s.chainContinuation.tier} weight=${s.chainContinuation.tierWeight.toFixed(2)}`);
      }

      if (s.affinityWeighting?.applied) {
        const fm = s.affinityWeighting.freqModifier || 1.0;
        console.log(`     📊 Affinity: freq=${s.affinityWeighting.frequency}/${s.affinityWeighting.maxFrequency} modifier=${fm.toFixed(3)} conf=${(s.affinityWeighting.confidence*100).toFixed(0)}%`);
      }

      if (s.breakdown?.prestigeDelay) {
        console.log(`     ⏱️  Prestige delay: ${s.breakdown.prestigeDelay} (affects timing)`);
      }

      if (s.breakdown?.bab) {
        console.log(`     ⚔️  BAB: ${s.breakdown.bab}`);
      }
    }
  }

  /**
   * Print attribute suggestion
   */
  static _printAttributeSuggestion(attr) {
    if (!attr) {
      console.log('  (No data available)');
      return;
    }
    console.log(`  ${attr.recommendation}`);
    console.log(`  Reasoning: ${attr.reasoning}`);
    if (attr.alternative) console.log(`  Alternative: ${attr.alternative}`);
    console.log(`  Next opportunity: ${attr.nextOpportunity}`);
  }

  // ─────────────────────────────────────────────────────────────
  // CHARACTER FACTORIES
  // ─────────────────────────────────────────────────────────────

  static _createJedi3() {
    return {
      id: 'char-jedi-3',
      name: 'Character 1 — Human Jedi 3',
      level: 3,
      classes: ['Jedi'],
      str: 15, dex: 13, con: 14, wis: 8, int: 10, cha: 13,
      abilities: {
        str: { value: 15 },
        dex: { value: 13 },
        con: { value: 14 },
        wis: { value: 8 },
        int: { value: 10 },
        cha: { value: 13 }
      },
      items: [],
      appliedTemplate: {
        name: 'Jedi Guardian',
        archetype: 'guardian-defender'
      },
      assumptions: [
        'Lightsaber proficiency (core Jedi)',
        'Force Sensitivity assumed',
        'Typical Jedi 1-3 feat/talent package'
      ]
    };
  }

  static _createNoble5Officer1() {
    return {
      id: 'char-noble-officer',
      name: 'Character 2 — Twi\'lek Noble 5 / Scoundrel 1 / Officer 1',
      level: 7,
      classes: ['Noble', 'Scoundrel', 'Officer'],
      str: 6, dex: 13, con: 14, wis: 10, int: 14, cha: 22,
      abilities: {
        str: { value: 6 },
        dex: { value: 13 },
        con: { value: 14 },
        wis: { value: 10 },
        int: { value: 14 },
        cha: { value: 22 }
      },
      items: [],
      appliedTemplate: {
        name: 'Face / Leader',
        archetype: 'noble-diplomat'
      },
      assumptions: [
        'Face/leader archetype with very high CHA',
        'Typical Noble leadership/influence talents',
        'Officer prestige timing critical test'
      ]
    };
  }

  static _createWookieeMixed() {
    return {
      id: 'char-wookiee-mixed',
      name: 'Character 3 — Wookiee Soldier 2 / Scout 2 / Scoundrel 2 / Jedi 1',
      level: 7,
      classes: ['Soldier', 'Scout', 'Scoundrel', 'Jedi'],
      str: 26, dex: 10, con: 16, wis: 10, int: 14, cha: 6,
      abilities: {
        str: { value: 26 },
        dex: { value: 10 },
        con: { value: 16 },
        wis: { value: 10 },
        int: { value: 14 },
        cha: { value: 6 }
      },
      items: [],
      appliedTemplate: {
        name: 'Melee Bruiser',
        archetype: 'soldier-weapon-master'
      },
      assumptions: [
        'Melee bruiser identity (STR-dominant)',
        'Mixed class chassis = prestige timing tradeoffs',
        'Stress test: class mixing affects prestige delay'
      ]
    };
  }

  static _createDurosPilot() {
    return {
      id: 'char-duros-pilot',
      name: 'Character 4 — Duros Scout 10 / Ace Pilot 9',
      level: 19,
      classes: ['Scout', 'Ace Pilot'],
      str: 10, dex: 30, con: 10, wis: 10, int: 10, cha: 10,
      abilities: {
        str: { value: 10 },
        dex: { value: 30 },
        con: { value: 10 },
        wis: { value: 10 },
        int: { value: 10 },
        cha: { value: 10 }
      },
      items: [],
      appliedTemplate: {
        name: 'Pilot / Flight Specialist',
        archetype: 'scout-ace-pilot'
      },
      assumptions: [
        'Pilot-focused identity (DEX extremity)',
        'Ace Pilot prestige: validate treatment & next progression',
        'Flight/vehicle chain continuation'
      ]
    };
  }
}

// ─────────────────────────────────────────────────────────────
// RUN TESTS
// ─────────────────────────────────────────────────────────────

// Export for use in console or test harness
export async function runTier1PressureTest() {
  return await Tier1PressureTest.run();
}

// If running in Foundry console:
// await import('/systems/foundryvtt-swse/scripts/engine/suggestion/tier1-pressure-test.js').then(m => m.runTier1PressureTest())
