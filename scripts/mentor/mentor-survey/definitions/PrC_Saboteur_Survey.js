import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Saboteur',
  classId: 'saboteur',
  displayName: "Saboteur",
  mentorKey: "Saboteur",
  archetypes: [
  {
    "id": "explosives_expert",
    "name": "Explosives Expert",
    "notes": "Specialist in precision explosives and controlled destruction.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.6,
      "striker": 0.3,
      "utility": 0.1
    },
    "attributeBias": {
      "int": 0.45,
      "dex": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "covert_disruptor",
    "name": "Covert Disruptor",
    "notes": "Quietly disables infrastructure, alarms, and defenses.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "utility": 0.3,
      "striker": 0.2
    },
    "attributeBias": {
      "dex": 0.35,
      "int": 0.3,
      "wis": 0.25,
      "con": 0.1
    }
  },
  {
    "id": "infrastructure_breaker",
    "name": "Infrastructure Breaker",
    "notes": "Strategic saboteur dismantling enemy infrastructure.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.6,
      "utility": 0.3,
      "striker": 0.1
    },
    "attributeBias": {
      "int": 0.45,
      "dex": 0.25,
      "wis": 0.2,
      "con": 0.1
    }
  },
  {
    "id": "demolition_expert",
    "name": "Demolition Expert",
    "notes": "Explosives specialist disabling structures and defenses.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "striker": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "int": 0.4,
      "dex": 0.3,
      "wis": 0.2,
      "con": 0.1
    }
  }
]
});

export default survey;
