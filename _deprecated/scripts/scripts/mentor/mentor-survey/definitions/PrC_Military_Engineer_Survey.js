import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Military_Engineer',
  classId: 'military_engineer',
  displayName: "Military Engineer",
  mentorKey: "Military Engineer",
  archetypes: [
  {
    "id": "battlefield_architect",
    "name": "Battlefield Architect",
    "notes": "Designer of defenses, kill zones, and battlefield structures.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "support": 0.2,
      "utility": 0.3
    },
    "attributeBias": {
      "int": 0.5,
      "wis": 0.3,
      "con": 0.2
    }
  },
  {
    "id": "siege_specialist",
    "name": "Siege Specialist",
    "notes": "Expert in destroying fortifications and hardened targets.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.6,
      "striker": 0.3,
      "utility": 0.1
    },
    "attributeBias": {
      "int": 0.45,
      "con": 0.35,
      "str": 0.2
    }
  },
  {
    "id": "vehicle_systems_engineer",
    "name": "Vehicle Systems Engineer",
    "notes": "Specialist in modifying, repairing, and enhancing vehicles.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.5,
      "support": 0.3,
      "controller": 0.2
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
