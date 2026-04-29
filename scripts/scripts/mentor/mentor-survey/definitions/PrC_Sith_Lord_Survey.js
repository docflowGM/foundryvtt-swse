import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Sith_Lord',
  classId: 'sith_lord',
  displayName: "Sith Lord",
  mentorKey: "Sith Lord",
  archetypes: [
  {
    "id": "dark_overlord",
    "name": "Dark Overlord",
    "notes": "Authoritative Sith ruler dominating through the Force.",
    "mechanicalBias": {
      "forceDC": 0.4
    },
    "roleBias": {
      "controller": 0.4,
      "striker": 0.2
    },
    "attributeBias": {
      "wis": 0.4,
      "cha": 0.35,
      "con": 0.25
    }
  },
  {
    "id": "force_tyrant",
    "name": "Force Tyrant",
    "notes": "Sith who rules through overwhelming destructive power.",
    "mechanicalBias": {
      "forceDC": 0.5
    },
    "roleBias": {
      "striker": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "wis": 0.4,
      "con": 0.3,
      "cha": 0.3
    }
  },
  {
    "id": "master_manipulator",
    "name": "Master Manipulator",
    "notes": "Grand strategist Sith operating through schemes and proxies.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "support": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "cha": 0.45,
      "int": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "sith_sorcerer",
    "name": "Sith Sorcerer",
    "notes": "Ritual-focused Sith manipulating the Force on a grand scale.",
    "mechanicalBias": {
      "forceDC": 0.6
    },
    "roleBias": {
      "controller": 0.3,
      "support": 0.1
    },
    "attributeBias": {
      "wis": 0.45,
      "cha": 0.35,
      "int": 0.2
    }
  }
]
});

export default survey;
