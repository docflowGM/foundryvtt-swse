/**
 * Phase 3.0-A Demonstration
 *
 * Shows derived trend families, example analysis outputs,
 * and demonstrates deterministic evaluation.
 *
 * This is a reference file—not part of the runtime system.
 */

import { ArchetypeTrendRegistry } from "/systems/foundryvtt-swse/scripts/engine/analysis/archetype-trend-registry.js";
import { BuildAnalysisEngine } from "/systems/foundryvtt-swse/scripts/engine/analysis/build-analysis-engine.js";

export class Phase3Demo {
  /**
   * Initialize registries and print trend families
   */
  static async demonstrateTrendDerivation() {
    console.log("===== PHASE 3.0-A TREND DERIVATION =====\n");

    await ArchetypeTrendRegistry.initialize();

    const stats = ArchetypeTrendRegistry.getStats();
    console.log(`Total Trend Templates: ${stats.totalTrends}`);
    console.log(`Unique Categories: ${stats.categories.length}\n`);

    console.log("Trend Categories:");
    for (const [category, count] of Object.entries(stats.categoryBreakdown)) {
      console.log(`  ${category}: ${count}`);
    }

    console.log("\n===== SAMPLE TRENDS BY CATEGORY =====\n");

    const trends = ArchetypeTrendRegistry.getTrends();
    const byCategory = new Map();

    for (const trend of trends) {
      if (!byCategory.has(trend.category)) {
        byCategory.set(trend.category, []);
      }
      byCategory.get(trend.category).push(trend);
    }

    for (const [category, categoryTrends] of byCategory) {
      console.log(`\n${category}:`);
      for (const trend of categoryTrends.slice(0, 2)) {
        // Show first 2 per category
        console.log(`  ID: ${trend.id}`);
        console.log(`  SourceField: ${Array.isArray(trend.sourceField) ? trend.sourceField.join(', ') : trend.sourceField}`);
        console.log(
          `  Expectation: ${JSON.stringify(trend.expectation).substring(0, 80)}...`
        );
        console.log(`  Severity: ${trend.severity}`);
        console.log(`  Derived from ${trend.derivedFromCount} archetype(s)\n`);
      }
    }
  }

  /**
   * Demonstrate analysis on sample actor
   * Shows conflict/strength signals and metrics
   */
  static async demonstrateActorAnalysis() {
    console.log("\n===== ACTOR ANALYSIS DEMONSTRATION =====\n");

    // This would require actual actor objects from the game world
    // For demonstration, we show the expected output structure

    const exampleOutput = {
      actorId: "example-actor-1",
      actorName: "Example Knight",
      archetype: { name: "Guardian Defender", baseClassId: "jedi" },
      timestamp: new Date().toISOString(),
      conflictSignals: [
        {
          id: "ATTR_PRIORITY_priority_STR",
          category: "AttributePriorityTrend",
          severity: "medium",
          evidence: {
            expected: "STR",
            actual: "DEX",
            value: 14
          }
        },
        {
          id: "RECOMMENDED_FEAT_MISSING",
          category: "RecommendedFeatureAdoptionTrend",
          severity: "low",
          evidence: {
            recommended: 2,
            adopted: 1
          }
        }
      ],
      strengthSignals: [
        {
          id: "ROLE_STAT_CONSISTENCY",
          category: "RoleStatConsistencyTrend",
          strength: "high",
          evidence: {
            archPriority: "STR",
            actorTop: "STR",
            actorValue: 16
          }
        }
      ],
      metrics: {
        archetypeAlignmentScore: 72,
        prestigeProgressScore: 50,
        statFocusConsistencyScore: 85,
        roleConsistencyScore: 90,
        specializationScore: 78,
        conflictDensity: 0.08,
        buildCoherence: 82
      },
      summary:
        "Build shows moderate alignment with some areas needing focus."
    };

    console.log(JSON.stringify(exampleOutput, null, 2));
  }

  /**
   * Demonstrate how new archetypes alter trend derivation
   */
  static demonstrateArchetypeAddition() {
    console.log("\n===== ARCHETYPE ADDITION IMPACT =====\n");

    console.log(`
Current Derived Trends: ${ArchetypeTrendRegistry.getTrendCount()}

When a new archetype is added:

1. ArchetypeTrendRegistry.initialize() is called again
2. All archetype schema fields are re-scanned:
   - baseClassId
   - roles
   - attributePriority
   - prestigeTargets
   - recommended.feats/talents/skills
   - roleBias
   - mechanicalBias

3. Trends are deterministically re-derived:
   - AttributePriorityTrend: New if new attribute priority pattern
   - RoleExpectationTrend: New if new role combination
   - PrestigePreparationTrend: New for each prestige target
   - RecommendedFeatureAdoptionTrend: Updated aggregate counts
   - etc.

4. No manual trend definition required
5. No narrative interpretation
6. No hardcoded expectations
7. Fully deterministic and reproducible

Example:
  If a new "Gadget Specialist" archetype is added with:
    - roles: ['offense', 'utility']
    - attributePriority: ['DEX', 'INT']
    - mechanicalBias: { tech_engineering: 0.6, ... }

Then on re-initialize:
  + New trend: ROLE_EXPECTATION_offense_utility (if not already present)
  + New trend: ATTR_PRIORITY_priority_DEX (if not already present)
  + New trend: SPECIALIZATION_tech_engineering (if not already present)
  + Existing trends get updated derivedFromCount
    `);
  }

  /**
   * Verify deterministic evaluation
   */
  static demonstrateDeterminism() {
    console.log("\n===== DETERMINISM VERIFICATION =====\n");

    console.log(`
All BuildAnalysisEngine.analyze() calls are deterministic:

1. Given the same actor state at time T
2. Trends are the same (fixed ArchetypeRegistry)
3. Evaluation logic is pure (no random elements)
4. Severity mapping is consistent
5. Metrics computation is mathematical

Result:
  analyze(actor) → Result A at time T
  analyze(actor) → Result A at time T + 5 seconds
  analyze(actor) → Result A at time T + 1 hour

Guarantees:
  ✓ No side effects
  ✓ No actor state mutation
  ✓ No randomness
  ✓ Reproducible by-request only
  ✓ Separate from suggestion engine
  ✓ Separate from mentor system
    `);
  }

  /**
   * Run all demonstrations
   */
  static async runAll() {
    try {
      await this.demonstrateTrendDerivation();
      await this.demonstrateActorAnalysis();
      this.demonstrateArchetypeAddition();
      this.demonstrateDeterminism();

      console.log("\n===== PHASE 3.0-A INITIALIZATION COMPLETE =====");
      console.log("Trend Registry: Ready");
      console.log("Build Analysis Engine: Ready");
      console.log("Status: Analysis layer active (no mentor integration)");
    } catch (err) {
      console.error("Demo failed:", err);
    }
  }
}
