/**
 * Published SWSE Core Rulebook class skill authority (printed pp. 38, 43, 45, 48, 51).
 * Build-time data only: packs/classes.db is the runtime source consumed by ClassesRegistry.
 * The "Knowledge(all skills, taken individually)" label is the existing pack's
 * intentional wildcard; do not expand it into an invented list of skill IDs.
 */
export const CORE_CLASS_SKILL_AUTHORITY = Object.freeze({
  Jedi: Object.freeze({
    trainedSkills: 2,
    classSkills: ['Acrobatics', 'Endurance', 'Initiative', 'Knowledge(all skills, taken individually)', 'Perception', 'Pilot', 'Use the Force'],
    sourcePage: 38,
  }),
  Noble: Object.freeze({
    trainedSkills: 6,
    classSkills: ['Deception', 'Gather Information', 'Initiative', 'Knowledge(all skills, taken individually)', 'Perception', 'Persuasion', 'Pilot', 'Ride', 'Treat Injury', 'Use Computer'],
    sourcePage: 43,
  }),
  Scoundrel: Object.freeze({
    trainedSkills: 4,
    classSkills: ['Acrobatics', 'Deception', 'Gather Information', 'Initiative', 'Knowledge(all skills, taken individually)', 'Mechanics', 'Perception', 'Persuasion', 'Pilot', 'Stealth', 'Use Computer'],
    sourcePage: 45,
  }),
  Scout: Object.freeze({
    trainedSkills: 5,
    classSkills: ['Climb', 'Endurance', 'Initiative', 'Jump', 'Knowledge(all skills, taken individually)', 'Mechanics', 'Perception', 'Pilot', 'Ride', 'Stealth', 'Survival', 'Swim'],
    sourcePage: 48,
  }),
  Soldier: Object.freeze({
    trainedSkills: 3,
    classSkills: ['Climb', 'Endurance', 'Initiative', 'Jump', 'Knowledge (Tactics)', 'Mechanics', 'Perception', 'Pilot', 'Swim', 'Treat Injury', 'Use Computer'],
    sourcePage: 51,
  }),
});
