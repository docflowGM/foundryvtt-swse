import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Droid_Commander',
  classId: 'droid_commander',
  displayName: "Droid Commander",
  mentorKey: "Droid Commander",
  archetypes: [
  {
    "id": "battle_droid_coordinator",
    "name": "Battle Droid Coordinator",
    "notes": "Tactical commander specializing in coordinated droid forces.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.6,
      "support": 0.3,
      "utility": 0.1
    },
    "attributeBias": {
      "int": 0.5,
      "cha": 0.3,
      "wis": 0.2
    }
  },
  {
    "id": "droid_overmind",
    "name": "Droid Overmind",
    "notes": "Centralized intelligence directing multiple droids simultaneously.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.7,
      "utility": 0.3
    },
    "attributeBias": {
      "int": 0.6,
      "wis": 0.25,
      "cha": 0.15
    }
  },
  {
    "id": "mechanized_tactician",
    "name": "Mechanized Tactician",
    "notes": "Battlefield strategist integrating droids into mixed forces.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "support": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "int": 0.45,
      "cha": 0.3,
      "wis": 0.25
    }
  }
]
});

export default survey;
