import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Improviser',
  classId: 'improviser',
  displayName: "Improviser",
  mentorKey: "Improviser",
  archetypes: [
  {
    "id": "field_engineer",
    "name": "Field Engineer",
    "notes": "On-the-fly engineer solving problems with whatever is available.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.5,
      "controller": 0.3,
      "support": 0.2
    },
    "attributeBias": {
      "int": 0.45,
      "dex": 0.25,
      "wis": 0.2,
      "con": 0.1
    }
  },
  {
    "id": "combat_improviser",
    "name": "Combat Improviser",
    "notes": "Battlefield opportunist turning chaos into advantage.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.3,
      "utility": 0.3
    },
    "attributeBias": {
      "int": 0.35,
      "dex": 0.3,
      "con": 0.2,
      "wis": 0.15
    }
  },
  {
    "id": "holo_hacker",
    "name": "Holo-Hacker",
    "notes": "Electronic warfare expert manipulating holographic and sensor systems.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.6,
      "controller": 0.3,
      "support": 0.1
    },
    "attributeBias": {
      "int": 0.5,
      "dex": 0.25,
      "wis": 0.25
    }
  }
]
});

export default survey;
