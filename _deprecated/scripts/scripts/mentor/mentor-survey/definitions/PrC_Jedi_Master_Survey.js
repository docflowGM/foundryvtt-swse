import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Jedi_Master',
  classId: 'jedi_master',
  displayName: "Jedi Master",
  mentorKey: "Jedi Master",
  archetypes: [
  {
    "id": "force_paragon",
    "name": "Force Paragon",
    "notes": "Peak embodiment of Force mastery and balance.",
    "mechanicalBias": {
      "forceDC": 0.5
    },
    "roleBias": {
      "support": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "wis": 0.45,
      "cha": 0.35,
      "con": 0.2
    }
  },
  {
    "id": "battle_sage",
    "name": "Battle Sage",
    "notes": "Strategist blending Force insight with battlefield command.",
    "mechanicalBias": {
      "forceDC": 0.4
    },
    "roleBias": {
      "controller": 0.4,
      "support": 0.2
    },
    "attributeBias": {
      "wis": 0.4,
      "int": 0.3,
      "cha": 0.3
    }
  },
  {
    "id": "spiritual_guide",
    "name": "Spiritual Guide",
    "notes": "Mentor-focused Jedi Master guiding allies and students.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.5,
      "controller": 0.2,
      "utility": 0.3
    },
    "attributeBias": {
      "wis": 0.4,
      "cha": 0.35,
      "int": 0.25
    }
  }
]
});

export default survey;
