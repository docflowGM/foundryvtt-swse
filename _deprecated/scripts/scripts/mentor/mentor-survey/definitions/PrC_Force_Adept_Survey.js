import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Force_Adept',
  classId: 'force_adept',
  displayName: "Force Adept",
  mentorKey: "Force Adept",
  archetypes: [
  {
    "id": "mystic_seer",
    "name": "Mystic Seer",
    "notes": "Force mystic focused on foresight, visions, and esoteric knowledge.",
    "mechanicalBias": {
      "forceDC": 0.5
    },
    "roleBias": {
      "controller": 0.2,
      "support": 1,
      "utility": 0.3
    },
    "attributeBias": {
      "wis": 0.45,
      "cha": 0.3,
      "int": 0.25
    }
  },
  {
    "id": "force_savant",
    "name": "Force Savant",
    "notes": "Aggressive Force-user pushing raw power beyond orthodox limits.",
    "mechanicalBias": {
      "forceDC": 0.4
    },
    "roleBias": {
      "striker": 0.4,
      "controller": 0.2
    },
    "attributeBias": {
      "wis": 0.4,
      "cha": 0.35,
      "con": 0.15,
      "dex": 0.1
    }
  },
  {
    "id": "tradition_keeper",
    "name": "Tradition Keeper",
    "notes": "Guardian of non-Jedi Force traditions and ancient rites.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.4,
      "controller": 0.2,
      "utility": 0.4
    },
    "attributeBias": {
      "wis": 0.4,
      "int": 0.35,
      "cha": 0.25
    }
  }
]
});

export default survey;
