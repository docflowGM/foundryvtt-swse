import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Charlatan',
  classId: 'charlatan',
  displayName: "Charlatan",
  mentorKey: "Charlatan",
  archetypes: [
  {
    "id": "silver_tongued_grifter",
    "name": "Silver-Tongued Grifter",
    "notes": "Smooth-talking manipulator relying on charm and misdirection.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.4,
      "controller": 0.3,
      "utility": 0.3
    },
    "attributeBias": {
      "cha": 0.5,
      "int": 0.25,
      "wis": 0.15,
      "dex": 0.1
    }
  },
  {
    "id": "master_of_disguise",
    "name": "Master of Disguise",
    "notes": "Identity-shifting con artist and social infiltrator.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "support": 0.2,
      "utility": 0.4
    },
    "attributeBias": {
      "cha": 0.45,
      "int": 0.3,
      "dex": 0.15,
      "wis": 0.1
    }
  },
  {
    "id": "holostar_propagandist",
    "name": "Holostar Propagandist",
    "notes": "Media manipulator shaping public opinion through holonet influence.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "support": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "cha": 0.5,
      "int": 0.3,
      "wis": 0.2
    }
  }
]
});

export default survey;
