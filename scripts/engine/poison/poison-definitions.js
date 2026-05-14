export const POISON_DEFINITIONS = {
  'knockout-drugs': {
    key: 'knockout-drugs',
    name: 'Knockout Drugs',
    source: 'Saga Edition Core Rulebook',
    challengeLevel: 2,
    keywords: ['artificial', 'ingested', 'poison'],
    delivery: ['ingested'],
    trigger: 'A creature ingests Knockout Drugs.',
    attack: { bonus: 4, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '', halfOnMiss: false, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 15, requiresMedicalKit: true },
    description: 'When put into food or drink, this poison renders a target unconscious.'
  },
  'paralytic-poison': {
    key: 'paralytic-poison',
    name: 'Paralytic Poison',
    source: 'Saga Edition Core Rulebook',
    challengeLevel: 5,
    keywords: ['artificial', 'contact', 'poison'],
    delivery: ['contact'],
    trigger: 'A creature is injected with the Paralytic Poison.',
    attack: { bonus: 10, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '', halfOnMiss: false, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 16, requiresMedicalKit: true },
    special: { endTrackEffect: 'immobilizedInsteadOfUnconscious' },
    description: 'An injected poison renders a target immobile for a short time.'
  },
  'dioxis': {
    key: 'dioxis',
    name: 'Dioxis',
    source: 'Saga Edition Core Rulebook',
    challengeLevel: 8,
    keywords: ['atmosphere', 'natural', 'poison'],
    delivery: ['inhaled', 'atmosphere'],
    trigger: 'A creature is exposed to Dioxis.',
    attack: { bonus: 10, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '4d6', halfOnMiss: true, conditionTrack: { steps: -1, persistent: true, onMissSteps: 0 } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 23, requiresMedicalKit: true },
    description: 'Dioxis is an inhaled gas often used in assassinations.'
  },
  'sith-poison': {
    key: 'sith-poison',
    name: 'Sith Poison',
    source: 'Star Wars Saga Edition Jedi Academy Training Manual',
    challengeLevel: 10,
    keywords: ['contact', 'ingested', 'poison'],
    delivery: ['contact', 'ingested'],
    trigger: 'A creature takes damage from a weapon coated with, or a substance tainted with, Sith Poison.',
    attack: { bonus: 12, defense: 'fortitude', recurrenceDefense: 'will', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '4d6', halfOnMiss: false, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'onForcePointSpent', until: ['neutralized', 'fiveConsecutiveFailures'] },
    treatment: { skill: 'useTheForce', dc: 25, requiresMedicalKit: false },
    special: { neutralizeAfterConsecutiveFailures: 5, recurrenceEffect: 'darkSideScoreIncrease', recurrenceDarkSideScore: 1 },
    description: 'Sith Poison makes Force-users quicker to anger and more likely to call on the Dark Side.'
  },
  'obah': {
    key: 'obah', name: 'Obah', source: 'Star Wars Saga Edition Galaxy at War', challengeLevel: 6,
    keywords: ['atmosphere', 'poison'], delivery: ['inhaled', 'atmosphere'], trigger: 'A creature is exposed to Obah.',
    attack: { bonus: 8, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '2d12', halfOnMiss: true, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'startOfTurnWhileExposed', until: ['noLongerExposed'] },
    description: 'Obah is a nerve agent capable of paralyzing most species.'
  },
  'null-gas': {
    key: 'null-gas', name: 'Null Gas', source: 'Star Wars Saga Edition Galaxy at War', challengeLevel: 12,
    keywords: ['atmosphere', 'artificial', 'poison'], delivery: ['inhaled', 'atmosphere'], trigger: 'A creature is exposed to Null Gas.',
    attack: { bonus: 14, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '3d10', halfOnMiss: true, conditionTrack: { steps: 0, persistent: false } },
    recurrence: { type: 'startOfTurnWhileExposed', until: ['noLongerExposed'] },
    special: { suffocationAfterRounds: 10 },
    description: 'Null Gas neutralizes oxygen in the air; after 1 minute of exposure a creature is affected as if in a vacuum and must deal with suffocation.'
  },
  'trauger': {
    key: 'trauger', name: 'Trauger', source: 'Star Wars Saga Edition Galaxy at War', challengeLevel: 14,
    keywords: ['atmosphere', 'natural', 'poison'], delivery: ['inhaled', 'atmosphere'], trigger: 'A creature is exposed to Trauger.',
    attack: { bonus: 16, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '5d6', halfOnMiss: true, conditionTrack: { steps: -1, persistent: true, onMissSteps: -1 } },
    recurrence: { type: 'startOfTurnWhileExposed', until: ['noLongerExposed'] },
    description: 'Trauger is a volcanic toxin that causes nausea, vertigo, respiratory failure, convulsions, muscle impairment, blurred vision, or cardiac arrest.'
  },
  'bundar-root': {
    key: 'bundar-root', name: 'Bundar Root', source: 'Star Wars Saga Edition Galaxy of Intrigue', challengeLevel: 1,
    keywords: ['ingested', 'natural', 'poison'], delivery: ['ingested'], trigger: 'A creature ingests Bundar Root.',
    attack: { bonus: 5, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '', halfOnMiss: false, skillPenalty: -5, conditionTrack: { steps: 0, persistent: false } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 15, requiresMedicalKit: true },
    description: 'Bundar Root causes short-term memory loss and affects a victim’s ability to reason.'
  },
  'quongoosh-essence': {
    key: 'quongoosh-essence', name: 'Quongoosh Essence', source: 'Star Wars Saga Edition Galaxy of Intrigue', challengeLevel: 3,
    keywords: ['ingested', 'poison'], delivery: ['ingested'], trigger: 'A creature ingests Quongoosh Essence.',
    attack: { bonus: 5, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '', halfOnMiss: false, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 15, requiresMedicalKit: true },
    special: { endTrackEffect: 'blindedInsteadOfHelpless' },
    description: 'Quongoosh Essence causes paralysis and blindness in its victim.'
  },
  'devaronian-blood-poison': {
    key: 'devaronian-blood-poison', name: 'Devaronian Blood-Poison', source: 'Star Wars Saga Edition Galaxy of Intrigue', challengeLevel: 4,
    keywords: ['contact', 'natural', 'poison'], delivery: ['contact'], trigger: 'A creature comes into contact with Devaronian Blood-Poison.',
    attack: { bonus: 7, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '1d6', halfOnMiss: false, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 16, requiresMedicalKit: true },
    description: 'Devaronian Blood-Poison is a natural contact toxin.'
  },
  'falsins-rot': {
    key: 'falsins-rot', name: "Falsin's Rot", source: 'Star Wars Saga Edition Galaxy of Intrigue', challengeLevel: 7,
    keywords: ['contact', 'natural', 'poison'], delivery: ['contact'], trigger: "A creature comes into contact with Falsin's Rot.",
    attack: { bonus: 10, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '1d8', halfOnMiss: false, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'dailyUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 20, requiresMedicalKit: true },
    special: { advancedConsequence: 'limbLossAfterTwoDaysAtMinusThree' },
    description: "Falsin's Rot is a parasitic fungal infection that can consume a subject if untreated."
  },
  'chuba-poison': {
    key: 'chuba-poison', name: 'Chuba Poison', source: 'Star Wars Saga Edition Galaxy of Intrigue', challengeLevel: 8,
    keywords: ['ingested', 'natural', 'poison'], delivery: ['ingested'], trigger: 'A creature ingests Chuba Poison.',
    attack: { bonus: 10, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '', halfOnMiss: false, conditionTrack: { steps: -1, persistent: false } },
    recurrence: { type: 'none' },
    treatment: { skill: 'treatInjury', dc: 20, requiresMedicalKit: true },
    special: { persistentOnBeatDefenseBy: 10, persistentTreatmentSuccessesRequired: 3 },
    description: 'Chuba Poison can cause a stroke in a creature that ingests it.'
  },
  'irksh-poison': {
    key: 'irksh-poison', name: 'Irksh Poison', source: 'Star Wars Saga Edition Galaxy of Intrigue', challengeLevel: 13,
    keywords: ['ingested', 'poison'], delivery: ['ingested'], trigger: 'A creature ingests Irksh Poison.',
    attack: { bonus: 10, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '8d6', halfOnMiss: true, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 28, requiresMedicalKit: true },
    description: 'Irksh Poison is a deadly Yuuzhan Vong toxin.'
  },
  'trihexalon': {
    key: 'trihexalon', name: 'Trihexalon', source: 'Star Wars Saga Edition Galaxy of Intrigue', challengeLevel: 15,
    keywords: ['contact', 'inhaled', 'poison'], delivery: ['contact', 'inhaled'], trigger: 'A creature is exposed to Trihexalon.',
    attack: { bonus: 20, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '10d6', halfOnMiss: true, conditionTrack: { steps: -2, persistent: true, onMissSteps: -1 } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 30, requiresMedicalKit: true },
    special: { fullDamageConsequence: 'limbLossInContactArea' },
    description: 'Trihexalon causes massive breakdown in organic material.'
  },
  'distilled-trihexalon': {
    key: 'distilled-trihexalon', name: 'Distilled Trihexalon', source: 'Star Wars Saga Edition Dawn of Defiance', challengeLevel: 3,
    keywords: ['artificial', 'contact', 'poison'], delivery: ['contact'], trigger: 'A creature comes into contact with Distilled Trihexalon.',
    attack: { bonus: 5, defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '2d6', halfOnMiss: true, conditionTrack: { steps: 0, persistent: false } },
    recurrence: { type: 'startOfTurnUntilTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dc: 15, requiresMedicalKit: true },
    special: { engineeredExclusion: 'twiLekPoisoner' },
    description: 'A refined chemical weapon engineered to affect all non-Twi’leks in its original scenario.'
  },
  'mantellian-savrip-natural-poison': {
    key: 'mantellian-savrip-natural-poison', name: 'Mantellian Savrip Natural Poison', source: 'Species Trait', challengeLevel: null,
    keywords: ['contact', 'natural', 'poison', 'species'], delivery: ['contact'], trigger: 'A Mantellian Savrip damages a living target with its natural weapons.',
    attack: { formula: '1d20 + @characterLevel', defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '', halfOnMiss: false, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'none' },
    special: { endTrackEffect: 'immobilizedInsteadOfUnconscious' },
    description: 'When a Mantellian Savrip damages a living target with its natural weapons, the poison attacks Fortitude and can move the target down the Condition Track.'
  },
  'malkite-techniques-poison': {
    key: 'malkite-techniques-poison', name: 'Malkite Techniques Poison', source: 'Malkite Poisoner Talent Tree', challengeLevel: null,
    keywords: ['contact', 'poison', 'talent'], delivery: ['contact'], trigger: 'A toxin applied with Malkite Techniques poisons a target struck by a non-energy slashing or piercing weapon.',
    attack: { formula: '1d20 + @heroicLevel', defense: 'fortitude', ignores: ['equipmentFortitude', 'damageReduction', 'shieldRating'] },
    damage: { formula: '1d6 + @halfHeroicLevel', halfOnMiss: false, conditionTrack: { steps: -1, persistent: true } },
    recurrence: { type: 'startOfTurnUntilAttackFailsOrTreated', until: ['treated', 'attackFails'] },
    treatment: { skill: 'treatInjury', dcFormula: '10 + @heroicLevel', requiresMedicalKit: true },
    talentHooks: ['modify-poison', 'numbing-poison', 'undetectable-poison', 'vicious-poison'],
    description: 'Malkite Techniques poison attacks each round until it misses or the victim is cured.'
  }
};
