import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'L1_Scoundrel',
  classId: 'scoundrel',
  displayName: "Scoundrel",
  mentorKey: "Scoundrel",
  archetypes: [
  {
    "id": "opportunistic_precision_striker",
    "name": "Opportunistic Precision Striker",
    "notes": "High-damage build focused on triggering Sneak Attack consistently through positioning and debuffs.",
    "mechanicalBias": {
      "deadlyPrecision": 3,
      "singleTargetDamage": 3,
      "accuracy": 2,
      "critRange": 2
    },
    "roleBias": {
      "striker": 3
    },
    "attributeBias": {
      "dex": 3,
      "cha": 1,
      "int": 1
    }
  },
  {
    "id": "debilitating_trickster",
    "name": "Debilitating Trickster",
    "notes": "Build designed to push enemies down the condition track through trickery and precision strikes.",
    "mechanicalBias": {
      "conditionTrack": 3,
      "deadlyPrecision": 2
    },
    "roleBias": {
      "controller": 3,
      "striker": 1
    },
    "attributeBias": {
      "dex": 2,
      "cha": 2,
      "int": 1
    }
  },
  {
    "id": "gunslinger_duelist",
    "name": "Gunslinger Duelist",
    "notes": "Pistol-focused build emphasizing accuracy stacking and critical hit optimization.",
    "mechanicalBias": {
      "accuracy": 3,
      "critRange": 3,
      "singleTargetDamage": 2
    },
    "roleBias": {
      "striker": 3,
      "skirmisher": 2
    },
    "attributeBias": {
      "dex": 3,
      "cha": 1
    }
  },
  {
    "id": "social_manipulator",
    "name": "Social Manipulator",
    "notes": "Charisma-driven build focused on influence, deception, and non-combat control.",
    "mechanicalBias": {
      "socialManipulation": 3,
      "skillUtility": 3,
      "allySupport": 1
    },
    "roleBias": {
      "support": 3,
      "controller": 2
    },
    "attributeBias": {
      "cha": 3,
      "int": 2
    }
  },
  {
    "id": "saboteur_technician",
    "name": "Saboteur Technician",
    "notes": "Mechanics-focused scoundrel specializing in slicing, sabotage, and technical battlefield disruption.",
    "mechanicalBias": {
      "hackingSkills": 3,
      "skillUtility": 3,
      "areaControl": 2
    },
    "roleBias": {
      "controller": 3,
      "utility": 3
    },
    "attributeBias": {
      "int": 3,
      "dex": 2
    }
  }
]
});

export default survey;
