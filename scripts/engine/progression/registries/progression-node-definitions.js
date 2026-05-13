// Extracted from scripts/engine/progression/registries/progression-node-registry.js.

import { ActivationPolicy, InvalidationBehavior } from './progression-node-types.js';

/**
 * Progression node registry
 * Maps all candidate nodes with their metadata
 */
export const PROGRESSION_NODE_REGISTRY = Object.freeze({
  // ============================================================================
  // CHARGEN CANONICAL SEQUENCE (13 steps)
  // ============================================================================

  intro: {
    nodeId: 'intro',
    label: 'Datapad Boot',
    icon: 'fa-circle-notch',
    category: 'canonical',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic', 'beast'],

    /** Activation policy: always owed in chargen */
    activationPolicy: ActivationPolicy.CANONICAL,

    /** This is the initial step — has no dependencies */
    dependsOn: [],

    /** Intro doesn't invalidate anything downstream */
    invalidates: [],

    selectionKey: null,
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  species: {
    nodeId: 'species',
    label: 'Species',
    icon: 'fa-dna',
    category: 'canonical',
    modes: ['chargen'],
    subtypes: ['actor', 'npc', 'follower', 'nonheroic'],

    activationPolicy: ActivationPolicy.CANONICAL,
    dependsOn: [],

    /** Species changes invalidate:
     * - Languages (species may affect language grants)
     * - Background (context-dependent)
     * - Summary (needs recompute)
     */
    invalidates: ['languages', 'background', 'summary'],
    invalidationBehavior: {
      languages: InvalidationBehavior.RECOMPUTE,
      background: InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'species',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  'droid-builder': {
    nodeId: 'droid-builder',
    label: 'Droid Systems',
    icon: 'fa-robot',
    category: 'canonical',
    modes: ['chargen'],
    subtypes: ['droid'],

    activationPolicy: ActivationPolicy.CANONICAL,
    dependsOn: [],
    invalidates: ['languages', 'summary'],
    invalidationBehavior: {
      languages: InvalidationBehavior.RECOMPUTE,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'droid',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  attribute: {
    nodeId: 'attribute',
    label: 'Attributes',
    icon: 'fa-chart-bar',
    category: 'canonical',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic', 'beast'],

    activationPolicy: ActivationPolicy.CANONICAL,

    /** Attributes depend on: mode/subtype only */
    dependsOn: [],

    /** Attribute changes invalidate almost everything:
     * - Skills (INT affects trained count, skill modifiers)
     * - Feat legality (prereqs may depend on attributes)
     * - Talent legality (prereqs may depend on attributes)
     * - Prestige readiness (may be blocked by attributes)
     * - Languages (some may be INT-gated)
     * - Summary (stats changed)
     */
    invalidates: [
      'skills',
      'general-feat',
      'class-feat',
      'general-talent',
      'class-talent',
      'languages',
      'force-powers',
      'force-secrets',
      'force-techniques',
      'starship-maneuvers',
      'summary',
    ],
    invalidationBehavior: {
      skills: InvalidationBehavior.RECOMPUTE,
      'general-feat': InvalidationBehavior.DIRTY,
      'class-feat': InvalidationBehavior.DIRTY,
      'general-talent': InvalidationBehavior.DIRTY,
      'class-talent': InvalidationBehavior.DIRTY,
      languages: InvalidationBehavior.DIRTY,
      'force-powers': InvalidationBehavior.DIRTY,
      'force-secrets': InvalidationBehavior.DIRTY,
      'force-techniques': InvalidationBehavior.DIRTY,
      'starship-maneuvers': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'attributes',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  class: {
    nodeId: 'class',
    label: 'Class',
    icon: 'fa-shield-alt',
    category: 'canonical',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic', 'beast'],

    activationPolicy: ActivationPolicy.CANONICAL,

    /** Class depends on: species (may be species-gated), but droid types skip this dependency */
    dependsOn: ['species'],

    /** Class changes invalidate:
     * - L1 Survey (survey is class-specific and must rebind to new mentor)
     * - Skills (class determines class skills)
     * - Class Feats (owed picks may change)
     * - Class Talents (owed picks may change)
     * - Force access (may be class-gated)
     * - Starship access (may be class-gated)
     * - Summary
     */
    invalidates: [
      'l1-survey',
      'skills',
      'class-feat',
      'class-talent',
      'force-powers',
      'force-secrets',
      'force-techniques',
      'starship-maneuvers',
      'summary',
    ],
    invalidationBehavior: {
      'l1-survey': InvalidationBehavior.PURGE,
      skills: InvalidationBehavior.RECOMPUTE,
      'class-feat': InvalidationBehavior.PURGE,
      'class-talent': InvalidationBehavior.PURGE,
      'force-powers': InvalidationBehavior.DIRTY,
      'force-secrets': InvalidationBehavior.DIRTY,
      'force-techniques': InvalidationBehavior.DIRTY,
      'starship-maneuvers': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'class',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  'l1-survey': {
    nodeId: 'l1-survey',
    label: 'Survey',
    icon: 'fa-comments',
    category: 'canonical',
    modes: ['chargen'],
    subtypes: ['actor', 'npc', 'follower', 'nonheroic'],

    activationPolicy: ActivationPolicy.CANONICAL,
    dependsOn: ['class'],
    invalidates: ['summary'],
    invalidationBehavior: {
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'survey',
    optional: false,
    isSkippable: true,
    isFinal: false,
  },

  background: {
    nodeId: 'background',
    label: 'Background',
    icon: 'fa-book',
    category: 'canonical',
    modes: ['chargen'],
    subtypes: ['actor', 'npc', 'follower', 'nonheroic'],

    activationPolicy: ActivationPolicy.CANONICAL,

    /** Background may depend on class (contextually) and species (language grants) */
    dependsOn: ['species', 'class'],

    /** Background changes invalidate:
     * - Skills (class skills list changes)
     * - Languages (may grant languages)
     * - Feats (may grant feats)
     * - Summary
     */
    invalidates: ['skills', 'languages', 'general-feat', 'summary'],
    invalidationBehavior: {
      skills: InvalidationBehavior.RECOMPUTE,
      languages: InvalidationBehavior.RECOMPUTE,
      'general-feat': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'background',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  skills: {
    nodeId: 'skills',
    label: 'Skills',
    icon: 'fa-book-open',
    category: 'canonical',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'follower', 'nonheroic', 'beast'],

    activationPolicy: ActivationPolicy.CANONICAL,

    /** Skills depend on class, background, attributes */
    dependsOn: ['class', 'background', 'attribute'],

    /** Skill changes invalidate:
     * - Feat legality (some feats require trained skills)
     * - Talent legality (some talents require trained skills)
     * - Summary
     */
    invalidates: [
      'general-feat',
      'class-feat',
      'general-talent',
      'class-talent',
      'force-powers',
      'force-secrets',
      'force-techniques',
      'summary',
    ],
    invalidationBehavior: {
      'general-feat': InvalidationBehavior.DIRTY,
      'class-feat': InvalidationBehavior.DIRTY,
      'general-talent': InvalidationBehavior.DIRTY,
      'class-talent': InvalidationBehavior.DIRTY,
      'force-powers': InvalidationBehavior.DIRTY,
      'force-secrets': InvalidationBehavior.DIRTY,
      'force-techniques': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'skills',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  'general-feat': {
    nodeId: 'general-feat',
    label: 'General Feat',
    icon: 'fa-star',
    category: 'canonical',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'follower', 'nonheroic', 'beast'],

    activationPolicy: ActivationPolicy.CANONICAL,

    /** Feats depend on class, attributes, skills, prior feats */
    dependsOn: ['class', 'attribute', 'skills', 'general-feat'],

    /** Feat changes invalidate:
     * - Later feats (chains)
     * - Force/talent/special access (may grant access)
     * - Summary
     */
    invalidates: [
      'class-feat',
      'general-talent',
      'class-talent',
      'force-powers',
      'force-secrets',
      'force-techniques',
      'languages',
      'starship-maneuvers',
      'summary',
    ],
    invalidationBehavior: {
      'class-feat': InvalidationBehavior.DIRTY,
      'general-talent': InvalidationBehavior.DIRTY,
      'class-talent': InvalidationBehavior.DIRTY,
      'force-powers': InvalidationBehavior.DIRTY,
      'force-secrets': InvalidationBehavior.DIRTY,
      'force-techniques': InvalidationBehavior.DIRTY,
      languages: InvalidationBehavior.DIRTY,
      'starship-maneuvers': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'feats',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  'class-feat': {
    nodeId: 'class-feat',
    label: 'Class Feat',
    icon: 'fa-star-half-alt',
    category: 'canonical',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic', 'beast'],

    activationPolicy: ActivationPolicy.CANONICAL,
    dependsOn: ['class', 'attribute', 'skills', 'general-feat'],
    invalidates: [
      'general-talent',
      'class-talent',
      'force-powers',
      'force-secrets',
      'force-techniques',
      'languages',
      'starship-maneuvers',
      'summary',
    ],
    invalidationBehavior: {
      'general-talent': InvalidationBehavior.DIRTY,
      'class-talent': InvalidationBehavior.DIRTY,
      'force-powers': InvalidationBehavior.DIRTY,
      'force-secrets': InvalidationBehavior.DIRTY,
      'force-techniques': InvalidationBehavior.DIRTY,
      languages: InvalidationBehavior.DIRTY,
      'starship-maneuvers': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'feats',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  'general-talent': {
    nodeId: 'general-talent',
    label: 'Heroic Talent',
    icon: 'fa-gem',
    category: 'canonical',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic'],

    activationPolicy: ActivationPolicy.CANONICAL,
    dependsOn: ['class', 'general-feat', 'class-feat'],
    invalidates: [
      'class-talent',
      'force-powers',
      'force-secrets',
      'force-techniques',
      'starship-maneuvers',
      'summary',
    ],
    invalidationBehavior: {
      'class-talent': InvalidationBehavior.DIRTY,
      'force-powers': InvalidationBehavior.DIRTY,
      'force-secrets': InvalidationBehavior.DIRTY,
      'force-techniques': InvalidationBehavior.DIRTY,
      'starship-maneuvers': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'talents',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  'class-talent': {
    nodeId: 'class-talent',
    label: 'Class Talent',
    icon: 'fa-gem',
    category: 'canonical',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic'],

    activationPolicy: ActivationPolicy.CANONICAL,
    dependsOn: ['class', 'general-feat', 'class-feat', 'general-talent'],
    invalidates: [
      'force-powers',
      'force-secrets',
      'force-techniques',
      'starship-maneuvers',
      'summary',
    ],
    invalidationBehavior: {
      'force-powers': InvalidationBehavior.DIRTY,
      'force-secrets': InvalidationBehavior.DIRTY,
      'force-techniques': InvalidationBehavior.DIRTY,
      'starship-maneuvers': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'talents',
    optional: false,
    isSkippable: false,
    isFinal: false,
  },

  languages: {
    nodeId: 'languages',
    label: 'Languages',
    icon: 'fa-language',
    category: 'canonical',
    modes: ['chargen'],
    subtypes: ['actor', 'npc', 'follower', 'nonheroic', 'beast'],

    activationPolicy: ActivationPolicy.CANONICAL,
    dependsOn: ['species', 'background', 'attribute', 'general-feat', 'class-feat'],
    invalidates: ['summary'],
    invalidationBehavior: {
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'languages',
    optional: false,
    isSkippable: true,
    isFinal: false,
  },

  summary: {
    nodeId: 'summary',
    label: 'Summary',
    icon: 'fa-list-check',
    category: 'canonical',
    modes: ['chargen'],
    subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic', 'beast'],

    activationPolicy: ActivationPolicy.CANONICAL,

    /** Summary depends on everything (reads all selections) */
    dependsOn: [
      'species',
      'droid-builder',
      'attribute',
      'class',
      'l1-survey',
      'background',
      'skills',
      'general-feat',
      'class-feat',
      'general-talent',
      'class-talent',
      'languages',
      'force-powers',
      'force-secrets',
      'force-techniques',
      'starship-maneuvers',
    ],

    /** Summary doesn't invalidate anything — it's the endpoint */
    invalidates: [],

    selectionKey: 'summary',
    optional: false,
    isSkippable: false,
    isFinal: true,
  },

  // ============================================================================
  // CONDITIONAL NODES
  // ============================================================================

  'force-powers': {
    nodeId: 'force-powers',
    label: 'Force Powers',
    icon: 'fa-hand-sparkles',
    category: 'conditional',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'follower'],

    /** Force powers appear only if Force Sensitivity is owned */
    activationPolicy: ActivationPolicy.PREREQUISITE,

    dependsOn: ['general-feat', 'class-feat', 'class'],
    invalidates: ['force-secrets', 'summary'],
    invalidationBehavior: {
      'force-secrets': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'forcePowers',
    optional: true,
    isSkippable: true,
    isFinal: false,
  },

  'force-secrets': {
    nodeId: 'force-secrets',
    label: 'Force Secrets',
    icon: 'fa-eye-slash',
    category: 'conditional',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'follower'],

    activationPolicy: ActivationPolicy.PREREQUISITE,
    dependsOn: ['force-powers'],
    invalidates: ['force-techniques', 'summary'],
    invalidationBehavior: {
      'force-techniques': InvalidationBehavior.DIRTY,
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'forceSecrets',
    optional: true,
    isSkippable: true,
    isFinal: false,
  },

  'force-techniques': {
    nodeId: 'force-techniques',
    label: 'Force Techniques',
    icon: 'fa-book-sparkles',
    category: 'conditional',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'follower'],

    activationPolicy: ActivationPolicy.PREREQUISITE,
    dependsOn: ['force-powers', 'force-secrets'],
    invalidates: ['summary'],
    invalidationBehavior: {
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'forceTechniques',
    optional: true,
    isSkippable: true,
    isFinal: false,
  },

  'starship-maneuvers': {
    nodeId: 'starship-maneuvers',
    label: 'Starship Maneuvers',
    icon: 'fa-rocket',
    category: 'conditional',
    modes: ['chargen', 'levelup'],
    subtypes: ['actor', 'npc', 'follower'],

    activationPolicy: ActivationPolicy.PREREQUISITE,
    dependsOn: ['general-feat', 'class-feat'],
    invalidates: ['summary'],
    invalidationBehavior: {
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: 'starshipManeuvers',
    optional: true,
    isSkippable: true,
    isFinal: false,
  },

  'final-droid-configuration': {
    nodeId: 'final-droid-configuration',
    label: 'Final Droid Configuration',
    icon: 'fa-robot',
    category: 'conditional',
    modes: ['chargen'],
    subtypes: ['droid'],

    /** Appears only if droid build is deferred and pending */
    activationPolicy: ActivationPolicy.CONDITIONAL,

    dependsOn: ['droid-builder'],
    invalidates: ['summary'],
    invalidationBehavior: {
      summary: InvalidationBehavior.RECOMPUTE,
    },

    selectionKey: null,
    optional: false,
    isSkippable: false,
    isFinal: false,
  },
});
