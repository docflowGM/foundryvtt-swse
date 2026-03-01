/**
 * PHASE 3.0-B ATOM VOCABULARY COMPLETION
 *
 * Systematic mapping of BuildAnalysisEngine signals → mentor atoms
 * with complete phrase population.
 *
 * Goal: Zero fallback atoms. Every conflict has direct semantic expression.
 */

export class Phase3AtomVocabularyPlan {
  static MAPPING_ANALYSIS = {
    executedAt: new Date().toISOString(),

    // ===== SECTION 1: SIGNAL → ATOM MAPPING =====

    signalToAtomMapping: [
      {
        conflictSignalId: 'ATTR_PRIORITY_priority_*',
        category: 'AttributePriorityTrend',
        severity: 'medium',
        currentMapping: 'PatternConflict ✓ (exists)',
        rationale: 'Actor attribute focus deviates from archetype priority',
        recommendedAtom: 'PatternConflict (EXISTING)',
        newPhrasesNeeded: false
      },

      {
        conflictSignalId: 'ROLE_EXPECTATION_*',
        category: 'RoleExpectationTrend',
        severity: 'medium',
        currentMapping: 'PatternConflict ✓ (exists)',
        rationale: 'Actor role composition deviates from archetype expectation',
        recommendedAtom: 'PatternConflict (EXISTING)',
        newPhrasesNeeded: false
      },

      {
        conflictSignalId: 'PRESTIGE_PREP_*',
        category: 'PrestigePreparationTrend',
        severity: 'high',
        currentMapping: 'CommitmentIgnored (UNDEFINED)',
        rationale: 'Actor is NOT progressing toward detected prestige commitment',
        recommendedAtom: 'CommitmentIgnored (NEW)',
        newPhrasesNeeded: true,
        intensityScaling: {
          very_high: 'Hard pivot away from prestige path',
          high: 'Clear abandonment of prestige trajectory',
          medium: 'Prestige progress stalled or diverted',
          low: 'Minor deviation from prestige preparation',
          very_low: 'Prestige path not prioritized'
        }
      },

      {
        conflictSignalId: 'RECOMMENDED_FEATURE_MISSING',
        category: 'RecommendedFeatureAdoptionTrend',
        severity: 'low',
        currentMapping: 'SynergyMissing (UNDEFINED)',
        rationale: 'Actor lacks recommended feats/talents that would synergize',
        recommendedAtom: 'SynergyMissing (NEW)',
        newPhrasesNeeded: true,
        intensityScaling: {
          very_high: 'Critical abilities are missing—build is incomplete',
          high: 'Major synergy gaps left unfilled',
          medium: 'Recommended abilities not yet adopted',
          low: 'Could benefit from recommended abilities',
          very_low: 'Minor recommendations unaddressed'
        }
      },

      {
        conflictSignalId: 'SKILL_INVESTMENT_ALIGNMENT',
        category: 'SkillInvestmentTrend',
        severity: 'low',
        currentMapping: 'GoalDeviation (partial match)',
        rationale: 'Skill selection diverges from archetype recommendations',
        recommendedAtom: 'RareChoice (EXISTING but incomplete)',
        note: 'Could use RareChoice or new atom ExplorationSignal',
        newPhrasesNeeded: 'Optional (RareChoice exists, may need phrases)'
      },

      {
        conflictSignalId: 'SKILL_FOCUS_VS_BREADTH',
        category: 'SkillInvestmentTrend',
        severity: 'low',
        currentMapping: 'No direct atom',
        rationale: 'Skill distribution pattern (specialization vs dispersion) mismatch',
        recommendedAtom: 'ExplorationSignal or new: SpecializationPattern',
        newPhrasesNeeded: true,
        note: 'Moderate skill count (3+) suggests player is exploring'
      },

      {
        conflictSignalId: 'ROLE_STAT_CONSISTENCY',
        category: 'RoleStatConsistencyTrend',
        severity: 'medium',
        currentMapping: 'PatternConflict ✓ (exists)',
        rationale: 'Attributes do not support assigned roles',
        recommendedAtom: 'PatternConflict (EXISTING)',
        newPhrasesNeeded: false
      },

      {
        conflictSignalId: 'SPECIALIZATION_*',
        category: 'SpecializationConsistencyTrend',
        severity: 'medium',
        currentMapping: 'GoalDeviation (partial) or PatternConflict (partial)',
        rationale: 'Actor abandoning mechanical specialization',
        recommendedAtom: 'GoalDeviation ✓ (exists)',
        newPhrasesNeeded: false,
        note: 'Can use existing GoalDeviation'
      },

      {
        conflictSignalId: 'FEATURE_CHAIN_PROGRESSION',
        category: 'ChainCompletionTrend',
        severity: 'low',
        currentMapping: 'SynergyMissing (UNDEFINED)',
        rationale: 'Sequential ability progression incomplete (feat/talent chains)',
        recommendedAtom: 'SynergyMissing (NEW) or OpportunityCostIncurred',
        newPhrasesNeeded: true,
        note: 'Chains incomplete = synergy opportunities missed'
      },

      {
        conflictSignalId: 'FORCE_ENGAGEMENT_EXPECTATION',
        category: 'ForceEngagementTrend',
        severity: 'medium',
        currentMapping: 'GoalDeviation ✓ (exists) or CommitmentIgnored',
        rationale: 'Force archetype not developing Force powers',
        recommendedAtom: 'CommitmentIgnored (NEW) or GoalDeviation (EXISTING)',
        newPhrasesNeeded: 'CommitmentIgnored needed for stronger expression'
      },

      {
        conflictSignalId: 'NON_FORCE_FOCUS_CONSISTENCY',
        category: 'ForceEngagementTrend',
        severity: 'low',
        currentMapping: 'RareChoice ✓ (exists) or ExplorationSignal',
        rationale: 'Non-Force archetype overinvesting in Force powers',
        recommendedAtom: 'RareChoice (EXISTING) or ExplorationSignal (NEW)',
        newPhrasesNeeded: false,
        note: 'RareChoice sufficient, or use exploration message'
      },

      {
        conflictSignalId: 'DEFENSE_ROLE_CONSISTENCY',
        category: 'DefenseAdequacyTrend',
        severity: 'medium',
        currentMapping: 'ReadinessLacking (UNDEFINED)',
        rationale: 'Defensive-role actor lacks armor/damage mitigation',
        recommendedAtom: 'ReadinessLacking (NEW)',
        newPhrasesNeeded: true,
        intensityScaling: {
          very_high: 'You are fragile—dangerous for a defensive role',
          high: 'Your defensive investment is inadequate',
          medium: 'Defensive preparation is incomplete',
          low: 'Consider defensive improvements',
          very_low: 'Minor defensive gaps'
        }
      },

      {
        conflictSignalId: 'OFFENSE_ROLE_CONSISTENCY',
        category: 'DefenseAdequacyTrend',
        severity: 'medium',
        currentMapping: 'ReadinessLacking (UNDEFINED)',
        rationale: 'Offensive-role actor lacks damage output or weapon investment',
        recommendedAtom: 'ReadinessLacking (NEW) or OpportunityCostIncurred',
        newPhrasesNeeded: true,
        intensityScaling: {
          very_high: 'Your offensive capability is insufficient for this role',
          high: 'Offensive investment is incomplete',
          medium: 'Damage potential could be stronger',
          low: 'Consider offense-building options',
          very_low: 'Minor offense optimization gaps'
        }
      }
    ],

    // ===== SECTION 2: ATOM INVENTORY =====

    atomInventory: {
      fullyImplemented: [
        'CommitmentDeclared ✓',
        'GoalAdvancement ✓',
        'DependencyChain ✓',
        'RecentChoiceImpact ✓',
        'PatternAlignment ✓',
        'SynergyPresent ✓',
        'ReadinessMet ✓',
        'PatternConflict ✓',
        'GoalDeviation ✓',
        'RareChoice ✓'
      ],

      needsPhrasePopulation: [
        'CommitmentIgnored ✗',
        'SynergyMissing ✗',
        'ReadinessLacking ✗',
        'OpportunityCostIncurred ✗',
        'RiskIncreased ✗',
        'RiskMitigated ✗',
        'ThresholdApproaching ✗',
        'ThresholdCrossed ✗',
        'GrowthStageShift ✗',
        'ExplorationSignal ✗',
        'IndecisionSignal ✗',
        'NewOptionRevealed ✗'
      ],

      buildAnalysisRequired: [
        'CommitmentIgnored (prestige path abandonment)',
        'SynergyMissing (incomplete feat/talent chains)',
        'ReadinessLacking (defense/offense inadequacy)',
        'ExplorationSignal (skill misalignment)',
        'OpportunityCostIncurred (optional, high-severity role conflicts)'
      ]
    },

    // ===== SECTION 3: PRIORITY ORDERING =====

    populationPriority: {
      tier1_critical: [
        {
          atom: 'CommitmentIgnored',
          reason: 'Maps to high-severity prestige path abandonment',
          mentors: ['Miraj', 'Lead', 'default'],
          variants: 5,
          totalPhrases: 15
        },
        {
          atom: 'SynergyMissing',
          reason: 'Maps to low-severity feature adoption gaps',
          mentors: ['Miraj', 'Lead', 'default'],
          variants: 5,
          totalPhrases: 15
        },
        {
          atom: 'ReadinessLacking',
          reason: 'Maps to medium-severity role/defense gaps',
          mentors: ['Miraj', 'Lead', 'default'],
          variants: 5,
          totalPhrases: 15
        }
      ],

      tier2_important: [
        {
          atom: 'ExplorationSignal',
          reason: 'Maps to skill investment divergence',
          mentors: ['Miraj', 'Lead', 'default'],
          variants: 5,
          totalPhrases: 15
        }
      ],

      tier3_optional: [
        {
          atom: 'OpportunityCostIncurred',
          reason: 'High-value signal for complex conflicts',
          mentors: ['Miraj', 'Lead', 'default'],
          variants: 5,
          totalPhrases: 15
        },
        {
          atom: 'RiskIncreased',
          reason: 'Future signal for vulnerability warnings',
          mentors: ['Miraj', 'Lead', 'default'],
          variants: 5,
          totalPhrases: 15
        }
      ]
    },

    // ===== SECTION 4: EXAMPLE PHRASE TEMPLATES =====

    examplePhrases: {
      CommitmentIgnored: {
        description: 'Actor abandoning prestige path or stated commitment',
        Miraj: {
          very_high: 'You swore to this path. But I see you drift. Decide what you are.',
          high: 'This abandons your stated commitment.',
          medium: 'You have moved away from this direction.',
          low: 'This diverges from your earlier path.',
          very_low: 'This shifts from what you committed to.'
        },
        Lead: {
          very_high: "You're stepping off the mission. Don't half-commit.",
          high: "You said you'd follow this path. Now you're not.",
          medium: 'This abandons your objective.',
          low: "You're drifting from your goal.",
          very_low: 'This strays from your stated direction.'
        },
        default: {
          very_high: 'You are abandoning your commitment.',
          high: 'This contradicts your earlier stated direction.',
          medium: 'You have moved away from your goal.',
          low: 'This diverges from your commitment.',
          very_low: 'This shifts from your stated path.'
        }
      },

      SynergyMissing: {
        description: 'Actor lacks recommended abilities that would synergize',
        Miraj: {
          very_high: 'Your abilities lack cohesion. Critical synergies remain unfulfilled.',
          high: 'Your selections leave profound gaps.',
          medium: 'You could strengthen this path significantly.',
          low: 'Some synergies remain unexplored.',
          very_low: 'Minor synergistic opportunities remain.'
        },
        Lead: {
          very_high: 'Your loadout is incomplete—you need these pieces.',
          high: 'Your build is missing key combinations.',
          medium: 'You could be stronger with better synergies.',
          low: 'Some abilities would work well together.',
          very_low: 'A few synergies could be better utilized.'
        },
        default: {
          very_high: 'Critical synergies are missing from your build.',
          high: 'Your selection lacks meaningful combinations.',
          medium: 'You could improve synergy significantly.',
          low: 'Some synergies remain unfulfilled.',
          very_low: 'Minor synergistic gaps exist.'
        }
      },

      ReadinessLacking: {
        description: 'Actor unprepared for assigned role (defense/offense/utility)',
        Miraj: {
          very_high: 'You are unprepared for what you have chosen. This is dangerous.',
          high: 'Your preparation is insufficient for this path.',
          medium: 'You lack what this role demands.',
          low: 'Your readiness could be stronger.',
          very_low: 'Minor preparation gaps remain.'
        },
        Lead: {
          very_high: 'You are not combat-ready for this role. You will not survive.',
          high: 'You lack the tools this mission requires.',
          medium: 'You need better preparation for this role.',
          low: 'Your readiness could improve.',
          very_low: 'Some minor readiness gaps exist.'
        },
        default: {
          very_high: 'You are not prepared for this role.',
          high: 'Your preparation is insufficient.',
          medium: 'You lack readiness for this path.',
          low: 'Your readiness could be stronger.',
          very_low: 'Minor preparation gaps remain.'
        }
      },

      ExplorationSignal: {
        description: 'Actor exploring unexpected build directions',
        Miraj: {
          very_high: 'You venture far from your path. There is courage in this.',
          high: 'Your choices suggest you are exploring new directions.',
          medium: 'You are broadening your focus.',
          low: 'You are trying new things.',
          very_low: 'Your direction shifts slightly.'
        },
        Lead: {
          very_high: 'You are taking a completely different approach. Bold move.',
          high: 'You are testing new tactics.',
          medium: 'You are branching out.',
          low: 'You are exploring new options.',
          very_low: 'You are trying something different.'
        },
        default: {
          very_high: 'You are exploring a very different direction.',
          high: 'Your choices suggest experimentation.',
          medium: 'You are broadening your approach.',
          low: 'You are trying new options.',
          very_low: 'Your choices show some variation.'
        }
      }
    },

    // ===== SECTION 5: COVERAGE VALIDATION =====

    coverageValidation: {
      signalsWithDirectAtomMapping: 13,
      signalsWithFallbackMapping: 0,
      signalsRequiringNewAtoms: 4,

      checklist: {
        'ATTR_PRIORITY_* → PatternConflict': 'COVERED ✓',
        'ROLE_EXPECTATION_* → PatternConflict': 'COVERED ✓',
        'PRESTIGE_PREP_* → CommitmentIgnored': 'NEEDS PHRASES',
        'RECOMMENDED_FEATURE_MISSING → SynergyMissing': 'NEEDS PHRASES',
        'SKILL_INVESTMENT_ALIGNMENT → ExplorationSignal': 'NEEDS PHRASES',
        'SKILL_FOCUS_VS_BREADTH → ExplorationSignal': 'NEEDS PHRASES',
        'ROLE_STAT_CONSISTENCY → PatternConflict': 'COVERED ✓',
        'SPECIALIZATION_* → GoalDeviation': 'COVERED ✓',
        'FEATURE_CHAIN_PROGRESSION → SynergyMissing': 'NEEDS PHRASES',
        'FORCE_ENGAGEMENT_EXPECTATION → CommitmentIgnored': 'NEEDS PHRASES',
        'NON_FORCE_FOCUS_CONSISTENCY → RareChoice': 'COVERED ✓',
        'DEFENSE_ROLE_CONSISTENCY → ReadinessLacking': 'NEEDS PHRASES',
        'OFFENSE_ROLE_CONSISTENCY → ReadinessLacking': 'NEEDS PHRASES'
      },

      verdict: 'ZERO ORPHAN SIGNALS. All conflict categories map to atoms.'
    }
  };

  /**
   * Generate phase 3.0-B implementation plan
   */
  static generateImplementationPlan() {
    return `
PHASE 3.0-B IMPLEMENTATION PLAN

═════════════════════════════════════════════════════════════

OBJECTIVE: Populate mentor atom phrases to achieve:
  ✓ Zero fallback atoms
  ✓ Direct semantic mapping for all BuildAnalysis signals
  ✓ Complete expressive coverage
  ✓ Tone parity across mentors

═════════════════════════════════════════════════════════════

TIER 1: CRITICAL (Required for Phase 3.0 Launch)

1. CommitmentIgnored (HIGH severity)
   Maps to: PRESTIGE_PREP_* conflicts
   Mentors: Miraj, Lead, default
   Phrases needed: 5 × 3 = 15

   Example (Miraj, very_high):
   "You swore to this path. But I see you drift. Decide what you are."

2. SynergyMissing (LOW severity)
   Maps to: RECOMMENDED_FEATURE_MISSING, FEATURE_CHAIN_PROGRESSION
   Mentors: Miraj, Lead, default
   Phrases needed: 5 × 3 = 15

   Example (Miraj, high):
   "Your selections leave profound gaps."

3. ReadinessLacking (MEDIUM severity)
   Maps to: DEFENSE_ROLE_CONSISTENCY, OFFENSE_ROLE_CONSISTENCY
   Mentors: Miraj, Lead, default
   Phrases needed: 5 × 3 = 15

   Example (Lead, very_high):
   "You are not combat-ready for this role. You will not survive."

═════════════════════════════════════════════════════════════

TIER 2: IMPORTANT (Recommended for Phase 3.0)

4. ExplorationSignal (LOW severity)
   Maps to: SKILL_INVESTMENT_ALIGNMENT, SKILL_FOCUS_VS_BREADTH
   Mentors: Miraj, Lead, default
   Phrases needed: 5 × 3 = 15

═════════════════════════════════════════════════════════════

TIER 3: OPTIONAL (Post-Launch)

5. OpportunityCostIncurred (for complex conflicts)
6. RiskIncreased (for vulnerability warnings)

═════════════════════════════════════════════════════════════

TOTAL WORK FOR TIER 1 + 2:

  60 new phrase entries (4 atoms × 5 intensities × 3 mentors)
  Estimated effort: LOW (following established patterns)
  File: mentor-atom-phrases.js

═════════════════════════════════════════════════════════════

VALIDATION AFTER POPULATION:

✓ Zero orphan signals (all BuildAnalysis conflicts → atoms)
✓ No fallback dependencies
✓ All intensity levels present
✓ Personality parity (Miraj ≠ Lead ≠ default)
✓ Deterministic phrase resolution
✓ Example outputs for each severity level

═════════════════════════════════════════════════════════════

OUTPUT REQUIRED:

1. Updated mentor-atom-phrases.js
   - 4 new atoms with 15 phrases each
   - Total: 60 new phrases

2. Coverage map showing:
   - Each BuildAnalysis signal → atom → example phrase

3. Example mentor reactions:
   - High-severity conflict (CommitmentIgnored, very_high)
   - Medium-severity drift (ReadinessLacking, medium)
   - Low-severity misalignment (SynergyMissing, low)

4. Confirmation:
   ✓ All signals covered
   ✓ Zero fallbacks
   ✓ Ready for MentorAnalysisAdapter

═════════════════════════════════════════════════════════════

STOP after phrase population.

Do NOT wire MentorAnalysisAdapter until this is complete.

═════════════════════════════════════════════════════════════
`;
  }
}
