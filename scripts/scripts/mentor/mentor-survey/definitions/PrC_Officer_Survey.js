import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Officer',
  classId: 'officer',
  displayName: "Officer",
  mentorKey: "Officer",
  archetypes: [
  {
    "id": "tactical_commander",
    "name": "Tactical Commander",
    "notes": "Battlefield tactician directing allied actions.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.4,
      "controller": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "int": 0.4,
      "cha": 0.35,
      "wis": 0.25
    }
  },
  {
    "id": "support_officer",
    "name": "Support Officer",
    "notes": "Morale and logistics-focused officer.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.5,
      "utility": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "cha": 0.4,
      "int": 0.35,
      "wis": 0.25
    }
  },
  {
    "id": "strategic_leader",
    "name": "Strategic Leader",
    "notes": "High-level planner shaping long-term engagements.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "support": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "int": 0.45,
      "cha": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "strategic_commander",
    "name": "Strategic Commander",
    "notes": "High-level battlefield commander coordinating allied actions.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.5,
      "controller": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "int": 0.4,
      "cha": 0.35,
      "wis": 0.25
    }
  },
  {
    "id": "logistics_officer",
    "name": "Logistics Officer",
    "notes": "Operational planner focused on supply lines and coordination.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.5,
      "support": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "int": 0.45,
      "cha": 0.3,
      "wis": 0.25
    }
  }
]
});

export default survey;
