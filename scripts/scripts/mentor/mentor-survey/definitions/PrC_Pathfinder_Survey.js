import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Pathfinder',
  classId: 'pathfinder',
  displayName: "Pathfinder",
  mentorKey: "Pathfinder",
  archetypes: [
  {
    "id": "jungle_recon_specialist",
    "name": "Jungle Recon Specialist",
    "notes": "Environmental reconnaissance expert in dense or hostile terrain.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.4,
      "controller": 0.3,
      "striker": 0.3
    },
    "attributeBias": {
      "wis": 0.35,
      "dex": 0.3,
      "con": 0.2,
      "int": 0.15
    }
  },
  {
    "id": "forward_spotter",
    "name": "Forward Spotter",
    "notes": "Battlefield observer coordinating allied fire and movement.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.4,
      "controller": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "wis": 0.4,
      "int": 0.3,
      "dex": 0.3
    }
  },
  {
    "id": "speeder_interceptor",
    "name": "Speeder Interceptor",
    "notes": "Fast-response pursuit specialist using speeders and light vehicles.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.1,
      "striker": 0.4,
      "utility": 0.3,
      "controller": 0.3
    },
    "attributeBias": {
      "dex": 0.45,
      "con": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "forward_recon",
    "name": "Forward Recon",
    "notes": "Advanced reconnaissance operative operating ahead of main forces.",
    "mechanicalBias": {},
    "roleBias": {
      "scout": 1.3,
      "controller": 0.3,
      "utility": 0.4,
      "striker": 0.3
    },
    "attributeBias": {
      "dex": 0.35,
      "wis": 0.3,
      "con": 0.2,
      "int": 0.15
    }
  },
  {
    "id": "deep_insertion_scout",
    "name": "Deep Insertion Scout",
    "notes": "Long-range infiltration and intelligence-gathering specialist.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "scout": 1.2,
      "utility": 0.4,
      "striker": 0.2
    },
    "attributeBias": {
      "dex": 0.35,
      "int": 0.3,
      "wis": 0.25,
      "con": 0.1
    }
  }
]
});

export default survey;
