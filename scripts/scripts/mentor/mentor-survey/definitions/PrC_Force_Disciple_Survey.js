import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Force_Disciple',
  classId: 'force_disciple',
  displayName: "Force Disciple",
  mentorKey: "Force Disciple",
  archetypes: [
  {
    "id": "ascetic_disciple",
    "name": "Ascetic Disciple",
    "notes": "Self-denying Force user focused on discipline and resilience.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.4,
      "controller": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "wis": 0.45,
      "con": 0.3,
      "cha": 0.25
    }
  },
  {
    "id": "living_force_channeler",
    "name": "Living Force Channeler",
    "notes": "Embodiment of the Living Force, channeling energy through self and allies.",
    "mechanicalBias": {
      "forceDC": 0.5
    },
    "roleBias": {
      "support": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "wis": 0.4,
      "cha": 0.35,
      "con": 0.25
    }
  }
]
});

export default survey;
