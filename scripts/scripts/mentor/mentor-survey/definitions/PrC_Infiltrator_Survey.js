import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Infiltrator',
  classId: 'infiltrator',
  displayName: "Infiltrator",
  mentorKey: "Infiltrator",
  archetypes: [
  {
    "id": "stealth_operative",
    "name": "Stealth Operative",
    "notes": "Core infiltration specialist focused on unseen movement.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "utility": 0.4,
      "striker": 0.2
    },
    "attributeBias": {
      "dex": 0.4,
      "int": 0.3,
      "wis": 0.2,
      "con": 0.1
    }
  },
  {
    "id": "shadow_agent",
    "name": "Shadow Agent",
    "notes": "Deep-cover operative maintaining false identities.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "utility": 0.3,
      "support": 0.2
    },
    "attributeBias": {
      "dex": 0.35,
      "cha": 0.3,
      "int": 0.25,
      "wis": 0.1
    }
  },
  {
    "id": "silent_eliminator",
    "name": "Silent Eliminator",
    "notes": "Close-range eliminator operating without detection.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.5,
      "controller": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.45,
      "str": 0.25,
      "con": 0.2,
      "wis": 0.1
    }
  },
  {
    "id": "specops_infiltrator",
    "name": "SpecOps Infiltrator",
    "notes": "Military-trained infiltration and breach specialist.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.35,
      "wis": 0.3,
      "int": 0.25,
      "con": 0.1
    }
  },
  {
    "id": "covert_recon_agent",
    "name": "Covert Recon Agent",
    "notes": "Recon-focused infiltrator providing intelligence to allies.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.5,
      "controller": 0.3,
      "support": 0.2
    },
    "attributeBias": {
      "wis": 0.35,
      "int": 0.3,
      "dex": 0.25,
      "con": 0.1
    }
  }
]
});

export default survey;
