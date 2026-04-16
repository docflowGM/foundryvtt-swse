import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Medic',
  classId: 'medic',
  displayName: "Medic",
  mentorKey: "Medic",
  archetypes: [
  {
    "id": "battlefield_medic",
    "name": "Battlefield Medic",
    "notes": "Frontline medical specialist stabilizing allies under fire.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.6,
      "controller": 0.2,
      "utility": 0.2
    },
    "attributeBias": {
      "wis": 0.4,
      "int": 0.3,
      "con": 0.2,
      "cha": 0.1
    }
  },
  {
    "id": "chief_surgeon",
    "name": "Chief Surgeon",
    "notes": "High-end medical expert specializing in complex treatment.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.5,
      "utility": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "int": 0.45,
      "wis": 0.35,
      "cha": 0.2
    }
  },
  {
    "id": "support_field_officer",
    "name": "Support Field Officer",
    "notes": "Medic providing frontline support and morale stabilization.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.5,
      "controller": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "wis": 0.35,
      "cha": 0.3,
      "int": 0.25,
      "con": 0.1
    }
  }
]
});

export default survey;
