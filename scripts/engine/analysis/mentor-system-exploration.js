/**
 * MENTOR SYSTEM ARCHITECTURE EXPLORATION
 * Complete analysis of dialogue generation, signal flow, and integration patterns
 */

export class MentorSystemExploration {
  static EXPLORATION_REPORT = {
    executedAt: new Date().toISOString(),

    // ===== SECTION 1: MENTOR SYSTEM OVERVIEW =====

    overview: {
      purpose:
        'Provides personalized character progression narratives based on archetype, decisions, and character state',
      architecture: 'Layered responsibility model with separation of concerns',
      phases: [
        'Character Generation (chargen)',
        'Level Up (levelup)',
        'Prestige Class (prestige)',
        'Free Dialogue (dialogue)'
      ]
    },

    // ===== SECTION 2: DATA FLOW & ARCHITECTURE =====

    dataFlow: {
      title: 'Complete Signal Flow',
      layers: [
        {
          name: 'Layer 1: SuggestionEngine (Decision Facts)',
          responsible: [
            'Determines recommendation tier (1-6)',
            'Assigns reasonCode (PRESTIGE_PREREQ, CHAIN_CONTINUATION, etc)',
            'Builds semantic reasonSignals (facts, no text)',
            'Selects initial atoms'
          ],
          output: 'SUGGESTION object with tier, reasonCode, reasonSignals, atoms',
          example: {
            tier: 6,
            reasonCode: 'PRESTIGE_PREREQ',
            reasonSignals: {
              alignment: 'prestige',
              prestigeSupport: true,
              conviction: 0.95,
              matchedSkills: ['useTheForce']
            },
            atoms: ['CommitmentDeclared', 'GoalAdvancement', 'DependencyChain']
          }
        },
        {
          name: 'Layer 2: MentorReasonSelector (Signal → Atoms)',
          responsible: [
            'Receives reasonSignals from Layer 1',
            'Maps semantic signals to mentor reason atoms',
            'Determines advisory intensity based on conviction',
            'Selects which reason codes to emphasize'
          ],
          output: '{atoms, intensity, selectedReasons}',
          intensity_levels: {
            'very_high': 'Emphatic, absolute endorsement (conviction 0.9+)',
            'high': 'Strong, definitive guidance (conviction 0.7+)',
            'medium': 'Neutral, suggestive guidance (conviction 0.5+)',
            'low': 'Mild, tentative guidance (conviction 0.3+)',
            'very_low': 'Minimal, optional observation (conviction <0.3)'
          }
        },
        {
          name: 'Layer 3: MentorJudgmentEngine (Atoms → Explanation)',
          responsible: [
            'Receives atoms from Layer 2 (e.g., CommitmentDeclared, DependencyChain)',
            'Maps atoms to mentor-specific phrases (from mentor-atom-phrases.js)',
            'Applies intensity variants (very_high, high, medium, low, very_low)',
            'Combines phrases into coherent explanation',
            'Applies mentor personality'
          ],
          output: 'Natural language explanation with mentor voice',
          example_output:
            '"Your dedication defines your path. This is essential to what comes next."'
        },
        {
          name: 'Layer 4: UI Display',
          responsible: [
            'Renders mentor portrait + explanation',
            'Applies CSS styling based on intensity',
            'Provides "Why?" inspection panels (for reasonSignals)'
          ],
          output: 'Rendered mentor dialogue in character progression UI'
        }
      ]
    },

    // ===== SECTION 3: KEY COMPONENTS & FILES =====

    components: {
      'mentor-resolver.js': {
        purpose: 'Lazy mentor binding—resolves correct mentor for context',
        key_function: 'resolveFor(actor, context)',
        context_phases: {
          chargen: 'Character creation → uses class mentor or Ol Salty',
          levelup: 'Level up → uses starting class mentor',
          prestige: 'Prestige class → uses prestige mentor or class fallback',
          dialogue: 'Free chat → uses currently active mentor'
        },
        priority_order: 'Override > Phase-specific > Class-based > Default (Ol Salty)'
      },

      'mentor-reason-atoms.js': {
        purpose: 'Semantic WHY factors—explains mentor decisions without text',
        scope:
          'Pattern alignment, commitment, synergy, dependencies, risk, readiness',
        key_atoms: [
          'CommitmentDeclared (soft commitment detected)',
          'GoalAdvancement (moves toward objective)',
          'DependencyChain (prerequisite awareness)',
          'PatternConflict (deviates from archetype)',
          'SynergyPresent (mechanical interaction)',
          'RecentChoiceImpact (builds on last choice)',
          'ReadinessMet (prerequisites satisfied)'
        ],
        design_principle:
          'Never enumerated in dialogue. Exposed only in UI inspection panels.'
      },

      'mentor-intensity-atoms.js': {
        purpose: 'Advisory confidence levels (not correctness, only conviction)',
        scale: [
          'very_low (barely warrants comment)',
          'low (light nudge)',
          'medium (worth considering)',
          'high (stand behind)',
          'very_high (what I recommend)'
        ],
        affects: 'Tone and phrasing only, never content'
      },

      'mentor-atom-phrases.js': {
        purpose: 'Maps atoms → mentor-specific phrases with intensity variants',
        structure:
          '{mentorName: {atom: {very_high: "...", high: "...", medium: "...", low: "...", very_low: "..."}}',
        mentor_personalities: [
          'Miraj (Jedi): Mystical, force-aware, path-focused',
          'Lead (Scout): Practical, tactical, survival-focused',
          'Others: Each class has unique mentor with unique voice'
        ],
        example: {
          atom: 'CommitmentDeclared',
          Miraj_phrases: {
            very_high: 'Your dedication defines your path.',
            high: 'Your commitment is evident.',
            medium: 'You show commitment to this direction.',
            low: 'You are pursuing this path.',
            very_low: 'This reflects your choices.'
          },
          Lead_phrases: {
            very_high: "You're serious about this path.",
            high: "You're committed to this direction.",
            medium: "You're pursuing a clear goal.",
            low: 'You are making deliberate choices.',
            very_low: "You're picking a direction."
          }
        }
      },

      'mentor-judgment-engine.js': {
        purpose: 'Combines atoms into coherent mentor-voiced explanation',
        key_function: 'buildExplanation(atoms, mentorName, context, intensity)',
        algorithm: [
          '1. Get phrase for each atom (mentor-specific, intensity-scaled)',
          '2. Filter nulls',
          '3. Combine phrases by grammar rules',
          '4. Capitalize and return'
        ],
        fallback: 'Generic explanation if no phrases match'
      },

      'mentor-dialogues.js': {
        purpose: 'Main entry point and utilities',
        key_functions: [
          'getMentorForClass(className)',
          'getMentorGreeting(mentor, level, actor)',
          'getMentorGuidance(mentor, choiceType)',
          'getLevel1Class(actor)',
          'setLevel1Class(actor, className)'
        ]
      },

      'mentor-dialogues.data.js': {
        purpose: 'Immutable mentor data (MENTORS object)',
        mentor_structure: {
          name: 'String',
          title: 'String (formal role)',
          description: 'String (short bio)',
          portrait: 'URL to image',
          levelGreetings: '{1-20 levels of level-up messages}',
          classGuidance: 'String (generic class selection advice)',
          talentGuidance: 'String (talent selection context)',
          abilityGuidance: 'String (ability/attribute context)',
          skillGuidance: 'String (skill selection context)',
          forcePowerGuidance: 'String (force power context)',
          multiclassGuidance: 'String (multiclass context)',
          hpGuidance: 'String (HP/resilience context)',
          mentorStory: {
            mentorClasses: 'Array of class IDs this mentor tracks',
            mentorDSPPercent: 'Mentor dark side comfort level (0-1)',
            dspTolerance: 'Mentor tolerance for DSP distance',
            dspSensitivity: 'none|strict|loose|inverted',
            tiers: '{tier1-tier5: [list of story responses]}',
            dspBlocked: '[responses when DSP distance too great]'
          }
        }
      },

      'mentor-story-resolver.js': {
        purpose: 'Resolves mentor self-disclosure stories (career progression)',
        based_on: [
          'Character level (normalized to 20-level lifespan)',
          'Mentor-relevant classes (summed across those classes)',
          'DSP gating (mentor tolerance for dark side corruption)',
          'Mentor tier (1-5 based on progress)'
        ]
      }
    },

    // ===== SECTION 4: SIGNAL EXAMPLES =====

    signalExamples: {
      prestige_signal: {
        reasonSignals: {
          alignment: 'prestige',
          prestigeSupport: true,
          conviction: 0.8,
          matchedSkills: ['useTheForce']
        },
        atoms_derived: ['CommitmentDeclared', 'GoalAdvancement', 'DependencyChain'],
        intensity: 'very_high',
        mentor_Miraj_output:
          '"Your dedication defines your path. This moves you toward your destiny. This is essential to what comes next."',
        mentor_Lead_output:
          '"You are serious about this path. This is critical to your mission. This is essential to your progression."'
      },

      mentor_bias_signal: {
        reasonSignals: {
          alignment: 'mentor',
          mentorBiasType: 'melee',
          conviction: 0.6,
          matchedAttributes: ['str', 'dex']
        },
        atoms_derived: ['PatternAlignment', 'SynergyPresent', 'ReadinessMet'],
        intensity: 'medium',
        output:
          '"This reflects your established approach. This works well with your selections. You have what you need for this."'
      },

      chain_continuation_signal: {
        reasonSignals: {
          mechanicalSynergy: true,
          chainContinuation: true,
          conviction: 0,
          matchedSkills: []
        },
        atoms_derived: ['SynergyPresent', 'RecentChoiceImpact'],
        intensity: 'medium',
        output:
          '"This works well with your selections. This continues your recent direction."'
      }
    },

    // ===== SECTION 5: CURRENT DIALOG OBSERVATION =====

    dialogueCharacteristics: {
      tones: {
        Miraj:
          'Mystical, force-aware, philosophical, emphasizes destiny and balance',
        Lead: 'Practical, tactical, mission-focused, emphasizes readiness and success',
        Scoundrel:
          'Pragmatic, survivor-focused, emphasizes adaptability and survival'
      },
      patterns: {
        _how_choice_matters: 'Explained via atoms (CommitmentDeclared, GoalAdvancement, etc)',
        _when_warning: 'PatternConflict or GoalDeviation atoms with high intensity',
        _when_encouraging:
          'CommitmentDeclared, GoalAdvancement, SynergyPresent atoms with high intensity',
        _fallback: 'Generic intensity-scaled explanation if atoms missing',
        _never_appears: [
          'Specific feat/talent names (no micro-text)',
          'Numerical values',
          'Game mechanic explanation',
          'Lists or enumerations'
        ]
      }
    },

    // ===== SECTION 6: INTEGRATION OPPORTUNITY =====

    integrationOpportunity: {
      title: 'Where BuildAnalysisEngine Fits',
      context: 'Character progression evaluation moments',
      phases: [
        'After level-up (mentor reacts to new abilities)',
        'After prestige class selection (mentor validates path)',
        'In mentor dialogue (player asks mentor about build)',
        'Optionally: in SuggestionEngine flow (could inform tier assignment)'
      ],
      analysis_signals_map: {
        'ATTR_PRIORITY_MISMATCH': {
          maps_to_atoms: ['PatternConflict'],
          intensity: 'medium',
          mentor_would_say:
            '"This diverges from your established pattern. You are stronger when focused."'
        },
        'PRESTIGE_PROGRESS_STALLED': {
          maps_to_atoms: ['CommitmentIgnored', 'GoalDeviation'],
          intensity: 'high',
          mentor_would_say:
            '"You committed to this path. But I see you drifting. Reconsider your choices."'
        },
        'RECOMMENDED_FEATURE_MISSING': {
          maps_to_atoms: ['SynergyMissing'],
          intensity: 'low',
          mentor_would_say: '"You might consider abilities that strengthen this direction."'
        },
        'FORCE_ENGAGEMENT_EXPECTATION': {
          maps_to_atoms: ['CommitmentIgnored', 'ReadinessMissing'],
          intensity: 'medium_to_high',
          mentor_would_say:
            '"You chose the Force path. But you avoid its development. Decide what you are."'
        },
        'DEFENSE_INADEQUATE': {
          maps_to_atoms: ['ReadinessMissing', 'OpportunityCostIncurred'],
          intensity: 'high',
          mentor_would_say:
            '"You are fragile. This is not weakness—it is a choice. Own it or correct it."'
        }
      },

      proposed_integration_layer: {
        name: 'MentorAnalysisAdapter',
        purpose: 'Bridges BuildAnalysisEngine signals → Mentor decision input',
        responsibilities: [
          'Invoke BuildAnalysisEngine.analyze(actor) at appropriate moments',
          'Convert ConflictSignals → atoms for MentorJudgmentEngine',
          'Map severity to intensity',
          'Inject into mentor context',
          'Allow mentor to use analysis or ignore it'
        ],
        key_constraint: 'Read-only—analysis never mutates actor or mentor state'
      }
    },

    // ===== SECTION 7: MENTOR-SPECIFIC PERSONALITIES =====

    mentorPersonalities: [
      {
        name: 'Miraj',
        class: 'Jedi',
        voice:
          'Mystical, force-aware, philosophical, emphasizes destiny and inner journey',
        phrase_style: 'Metaphorical, destination-focused, destiny language',
        example_phrases: [
          'Your dedication defines your path.',
          'This moves you toward your destiny.',
          'This is essential to what comes next.',
          'This contradicts your core path.'
        ]
      },
      {
        name: 'Lead',
        class: 'Scout',
        voice:
          'Practical, tactical, mission-focused, emphasizes readiness and success',
        phrase_style:
          'Direct, objective-focused, survival/success language',
        example_phrases: [
          "You are serious about this path.",
          'This is critical to your mission.',
          'This is the right tactical call.',
          'You need to prepare for what comes next.'
        ]
      },
      {
        name: 'Ol Salty (Scoundrel)',
        class: 'Scoundrel',
        voice:
          'Pragmatic, survivor-focused, emphasizes adaptability and opportunities',
        phrase_style:
          'Sarcastic, opportunity-focused, survival/advantage language',
        example_phrases: [
          'You play the angles here.',
          'This keeps you in the game.',
          'Smart move—smart people survive.',
          "Don't get caught with your hand in the wrong cookie jar."
        ]
      }
    ],

    // ===== SECTION 8: INTEGRATION CHECKLIST =====

    integrationChecklist: {
      design_phase: [
        '✅ MentorAdvisoryBridge designed (maps analysis signals to mentor atoms)',
        '✅ Signal-to-atom mapping defined',
        '✅ Severity-to-intensity mapping defined',
        '? Identify exact UI/dialogue moments where analysis should inject'
      ],
      implementation_phase: [
        '□ Create MentorAnalysisAdapter (non-invasive injection point)',
        '□ Implement call to BuildAnalysisEngine.analyze() at decision moments',
        '□ Wire adapter into mentor evaluation context',
        '□ Create adapter-to-MentorJudgmentEngine bridge',
        '□ Validate atoms and intensity are recognized',
        '□ Test mentor dialogue generation from analysis signals'
      ],
      validation_phase: [
        '□ Test on sample characters at different alignment levels',
        '□ Verify mentor dialogues reflect build analysis',
        '□ Validate read-only constraint (analysis never mutates state)',
        '□ Check fallback behavior when analysis signals are missing',
        '□ Ensure mentor can ignore analysis if desired'
      ]
    },

    // ===== SECTION 9: KEY INSIGHTS FOR INTEGRATION =====

    keyInsights: [
      {
        insight:
          'Atoms are semantic—never appear in text. They guide phrase selection.',
        implication:
          'BuildAnalysis signals must map to existing atoms, not create new narrative logic.'
      },
      {
        insight: 'Intensity reflects CONFIDENCE, not correctness.',
        implication:
          'High conflict signals should map to high intensity only if analysis is very certain. Otherwise, temper it.'
      },
      {
        insight: 'Mentor personality is DISTINCT across all layers.',
        implication:
          'Same atoms produce completely different phrases for Miraj (mystical) vs Lead (tactical). Integration must preserve this.'
      },
      {
        insight: 'Mentor has OPTION to use or ignore analysis.',
        implication:
          'Analysis should never force mentor direction. It should inform, not mandate.'
      },
      {
        insight: 'DSP gating and story tiers EXIST independently.',
        implication:
          'BuildAnalysis input should NOT replace mentorStory or DSP logic. It should complement them.'
      }
    ]
  };

  /**
   * Generate summary of mentor system for quick reference
   */
  static generateSummary() {
    return `
MENTOR SYSTEM ARCHITECTURE — QUICK REFERENCE

═══════════════════════════════════════════════════════════════

LAYER STRUCTURE (Data flows downward):

  Layer 1: SuggestionEngine (Tier Assignment)
    ↓ Outputs: reasonSignals (semantic facts)

  Layer 2: MentorReasonSelector (Signal → Atoms)
    ↓ Outputs: atoms + intensity

  Layer 3: MentorJudgmentEngine (Atoms → Text)
    ↓ Outputs: mentor-voiced explanation

  Layer 4: UI Display
    ↓ Final: Rendered dialogue

═══════════════════════════════════════════════════════════════

KEY COMPONENTS:

  MentorResolver: Lazy binding (phase + class → mentor)
  REASON_ATOMS: Semantic WHY factors (CommitmentDeclared, etc)
  INTENSITY_ATOMS: Advisory confidence (very_low → very_high)
  mentor-atom-phrases.js: Mentor-specific phrase library
  MentorJudgmentEngine: Combines atoms into explanations

═══════════════════════════════════════════════════════════════

MENTOR PERSONALITIES:

  Miraj (Jedi): Mystical, force-aware, destiny-focused
  Lead (Scout): Practical, tactical, mission-focused
  Ol' Salty (Scoundrel): Pragmatic, survivor-focused

═══════════════════════════════════════════════════════════════

INTEGRATION POINT:

  BuildAnalysisEngine signals → MentorAdvisoryBridge
    → maps to atoms + intensity
    → injected into mentor context
    → MentorJudgmentEngine generates dialogue

═══════════════════════════════════════════════════════════════

CRITICAL CONSTRAINTS:

  ✓ Atoms are semantic (never appear in text)
  ✓ Intensity reflects confidence, not correctness
  ✓ Read-only (analysis never mutates state)
  ✓ Mentor can ignore analysis (advisory only)
  ✓ Preserve existing DSP/story/tier logic
  ✓ Each mentor personality must remain distinct

═══════════════════════════════════════════════════════════════
`;
  }

  /**
   * Export as JSON for reference
   */
  static exportJSON() {
    return JSON.stringify(this.EXPLORATION_REPORT, null, 2);
  }
}
