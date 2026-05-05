/**
 * Canonical Background Event ability data.
 *
 * Event backgrounds are mini-feature sets: each grants one class-skill choice
 * from its relevant skills plus a special ability. This module enriches the
 * existing background records without replacing the authoring JSON/compendium.
 */

export const BACKGROUND_EVENT_ABILITIES = Object.freeze({
  bankrupt: {
    id: 'bankrupt',
    type: 'BackgroundEvent',
    name: 'Bankrupt',
    relevantSkills: ['Deception', 'Gather Information', 'Survival'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'bankrupt-urban-survival',
        name: 'Urban Survival',
        type: 'substitution',
        description: 'Use Survival to sustain yourself in urban or civilized environments.',
        skill: 'Survival',
        appliesTo: ['urban_survival', 'civilized_survival'],
        requiresRuntime: true
      }
    ]
  },
  conspiracy: {
    id: 'conspiracy',
    type: 'BackgroundEvent',
    name: 'Conspiracy',
    relevantSkills: ['Deception', 'Stealth', 'Use Computer'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'conspiracy-sense-reroll',
        name: 'Sense Deception or Influence Reroll',
        type: 'reroll',
        description: 'Reroll any Perception check made to Sense Deception or Sense Influence, keeping the better result.',
        skill: 'Perception',
        appliesTo: ['Sense Deception', 'Sense Influence'],
        keep: 'better',
        requiresRuntime: true
      }
    ]
  },
  crippled: {
    id: 'crippled',
    type: 'BackgroundEvent',
    name: 'Crippled',
    relevantSkills: ['Endurance', 'Mechanics', 'Treat Injury'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'crippled-damage-threshold-stability',
        name: 'Damage Threshold Stability',
        type: 'defense_rule',
        description: 'When your Fortitude Defense is reduced by moving down the Condition Track, your Damage Threshold remains unchanged as if you had no conditions.',
        target: 'damageThreshold',
        condition: 'condition_track_fortitude_penalty',
        requiresRuntime: true
      }
    ]
  },
  disgraced: {
    id: 'disgraced',
    type: 'BackgroundEvent',
    name: 'Disgraced',
    relevantSkills: ['Deception', 'Gather Information', 'Stealth'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'disgraced-deceptive-appearance-easier',
        name: 'Easier Deceptive Appearance',
        type: 'difficulty_step',
        description: 'Deceptive Appearances you create for yourself are one step easier to pass.',
        skill: 'Deception',
        appliesTo: ['Deceptive Appearance'],
        stepAdjustment: -1,
        requiresRuntime: true
      }
    ]
  },
  enslaved: {
    id: 'enslaved',
    type: 'BackgroundEvent',
    name: 'Enslaved',
    relevantSkills: ['Climb', 'Endurance', 'Jump'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'enslaved-grapple-bonus',
        name: 'Grapple Survivor',
        type: 'bonus',
        description: 'Gain a +2 competence bonus on Grapple checks.',
        target: 'grapple',
        bonusType: 'competence',
        value: 2,
        requiresRuntime: false
      }
    ]
  },
  exiled: {
    id: 'exiled',
    type: 'BackgroundEvent',
    name: 'Exiled',
    relevantSkills: ['Gather Information', 'Knowledge (Galactic Lore)', 'Survival'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'exiled-hyperspace-half-time',
        name: 'Half-Time Hyperspace Plotting',
        type: 'time_reduction',
        description: 'Plot a safe hyperspace course in half the normal time (30 seconds, or 5 rounds).',
        appliesTo: ['hyperspace_plotting'],
        multiplier: 0.5,
        minimumTime: '30 seconds / 5 rounds',
        requiresRuntime: true
      },
      {
        id: 'exiled-skill-focus-galactic-lore',
        name: 'Skill Focus (Knowledge (Galactic Lore))',
        type: 'conditional_feat',
        description: 'Gain Skill Focus (Knowledge (Galactic Lore)) if trained in Knowledge (Galactic Lore).',
        featName: 'Skill Focus (Knowledge (Galactic Lore))',
        featSlug: 'skill-focus-knowledge-galactic-lore',
        condition: {
          type: 'trained_skill',
          skill: 'Knowledge (Galactic Lore)'
        },
        requiresRuntime: true
      }
    ]
  },
  imprisoned: {
    id: 'imprisoned',
    type: 'BackgroundEvent',
    name: 'Imprisoned',
    relevantSkills: ['Acrobatics', 'Gather Information', 'Stealth'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'imprisoned-black-market-half-time',
        name: 'Black Market Contacts',
        type: 'time_reduction',
        description: 'Obtain Black Market goods in half the usual time, minimum 1 day.',
        appliesTo: ['black_market_acquisition'],
        multiplier: 0.5,
        minimumTime: '1 day',
        requiresRuntime: true
      }
    ]
  },
  marooned: {
    id: 'marooned',
    type: 'BackgroundEvent',
    name: 'Marooned',
    relevantSkills: ['Ride', 'Survival', 'Swim'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'marooned-self-care-no-penalty',
        name: 'Self-Reliant First Aid',
        type: 'penalty_immunity',
        description: 'Take no penalty when making Treat Injury checks to administer First Aid to yourself, or Mechanics checks to Repair yourself if you are a Droid.',
        skills: ['Treat Injury', 'Mechanics'],
        appliesTo: ['self_first_aid', 'self_repair'],
        requiresRuntime: true
      }
    ]
  },
  orphaned: {
    id: 'orphaned',
    type: 'BackgroundEvent',
    name: 'Orphaned',
    relevantSkills: ['Gather Information', 'Survival', 'Treat Injury'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'orphaned-untrained-force-point-die',
        name: 'Hard-Learned Adaptability',
        type: 'force_point_bonus_die',
        description: 'When spending a Force Point on an untrained skill check, add an extra +1d6 to the check.',
        appliesTo: ['untrained_skill_check'],
        die: '1d6',
        requiresRuntime: true
      }
    ]
  },
  scarred: {
    id: 'scarred',
    type: 'BackgroundEvent',
    name: 'Scarred',
    relevantSkills: ['Deception', 'Persuasion', 'Treat Injury'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'scarred-intimidate-favorable-circumstances',
        name: 'Intimidating Scars',
        type: 'favorable_circumstances',
        description: 'When making a Persuasion check to Intimidate, you always have Favorable Circumstances.',
        skill: 'Persuasion',
        appliesTo: ['Intimidate'],
        requiresRuntime: true
      }
    ]
  },
  widowed: {
    id: 'widowed',
    type: 'BackgroundEvent',
    name: 'Widowed',
    relevantSkills: ['Gather Information', 'Knowledge (Galactic Lore)', 'Use Computer'],
    skillChoiceCount: 1,
    specialAbilities: [
      {
        id: 'widowed-gather-information-take-20',
        name: 'Patient Investigation',
        type: 'take_20_permission',
        description: 'You can Take 20 on Gather Information checks, but it takes 20 times as long as normal.',
        skill: 'Gather Information',
        timeMultiplier: 20,
        requiresRuntime: true
      }
    ]
  }
});

export function getBackgroundEventAbility(idOrName) {
  const key = String(idOrName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return BACKGROUND_EVENT_ABILITIES[key] || null;
}

export function hydrateBackgroundEvent(background) {
  if (!background || String(background.category || '').toLowerCase() !== 'event') {
    return background;
  }

  const event = getBackgroundEventAbility(background.id || background.slug || background.name);
  if (!event) {
    return background;
  }

  return {
    ...background,
    type: background.type || event.type,
    backgroundType: 'event',
    relevantSkills: event.relevantSkills || background.relevantSkills || [],
    skillChoiceCount: event.skillChoiceCount ?? background.skillChoiceCount ?? 1,
    specialAbilities: event.specialAbilities || background.specialAbilities || [],
    mechanicalEffect: background.mechanicalEffect || event.specialAbilities?.[0] || null,
    eventAbilitySource: 'scripts/data/background-events.js'
  };
}

export default BACKGROUND_EVENT_ABILITIES;
