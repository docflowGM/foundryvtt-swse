import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Vanguard',
  classId: 'vanguard',
  displayName: "Vanguard",
  mentorKey: "Vanguard",
  archetypes: [
  {
    "id": "shock_entry_specialist",
    "name": "Shock Entry Specialist",
    "notes": "First-in assault specialist for hostile entry operations.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.5,
      "controller": 0.3,
      "defender": 0.2
    },
    "attributeBias": {
      "str": 0.35,
      "dex": 0.3,
      "con": 0.25,
      "wis": 0.1
    }
  },
  {
    "id": "forward_assault_leader",
    "name": "Forward Assault Leader",
    "notes": "Aggressive squad leader pushing the fight forward.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.4,
      "support": 0.3,
      "controller": 0.3
    },
    "attributeBias": {
      "str": 0.3,
      "cha": 0.3,
      "con": 0.25,
      "dex": 0.15
    }
  },
  {
    "id": "urban_breach_operative",
    "name": "Urban Breach Operative",
    "notes": "Close-quarters urban combat specialist.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.35,
      "int": 0.25,
      "con": 0.25,
      "wis": 0.15
    }
  }
]
});

export default survey;
