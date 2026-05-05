import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Master_Privateer',
  classId: 'master_privateer',
  displayName: "Master Privateer",
  mentorKey: "Master Privateer",
  archetypes: [
  {
    "id": "letter_of_marque_captain",
    "name": "Letter of Marque Captain",
    "notes": "Semi-legal privateer operating under official sanction.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.4,
      "controller": 0.3,
      "utility": 0.3
    },
    "attributeBias": {
      "cha": 0.4,
      "int": 0.35,
      "dex": 0.25
    }
  },
  {
    "id": "freebooter_admiral",
    "name": "Freebooter Admiral",
    "notes": "Commander of multiple vessels operating beyond the law.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "support": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "cha": 0.4,
      "int": 0.35,
      "wis": 0.25
    }
  },
  {
    "id": "trade_war_corsair",
    "name": "Trade War Corsair",
    "notes": "Commerce-raiding captain targeting enemy trade routes.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.3,
      "utility": 0.3
    },
    "attributeBias": {
      "dex": 0.35,
      "cha": 0.3,
      "int": 0.25,
      "con": 0.1
    }
  }
]
});

export default survey;
