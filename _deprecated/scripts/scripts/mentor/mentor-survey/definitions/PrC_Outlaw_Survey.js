import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Outlaw',
  classId: 'outlaw',
  displayName: "Outlaw",
  mentorKey: "Outlaw",
  archetypes: [
  {
    "id": "notorious_gunslinger",
    "name": "Notorious Gunslinger",
    "notes": "Infamous outlaw whose reputation is as deadly as their aim.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "controller": 0.2,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.45,
      "cha": 0.3,
      "con": 0.25
    }
  },
  {
    "id": "rebel_outlaw",
    "name": "Rebel Outlaw",
    "notes": "Defiant freedom fighter operating outside formal command.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.4,
      "support": 0.3,
      "controller": 0.3
    },
    "attributeBias": {
      "dex": 0.35,
      "cha": 0.3,
      "con": 0.2,
      "wis": 0.15
    }
  },
  {
    "id": "shadow_smuggler",
    "name": "Shadow Smuggler",
    "notes": "Illicit operator thriving in shadows and grey markets.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.4,
      "controller": 0.3,
      "striker": 0.3
    },
    "attributeBias": {
      "dex": 0.35,
      "cha": 0.3,
      "int": 0.2,
      "con": 0.15
    }
  }
]
});

export default survey;
