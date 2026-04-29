import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Assassin',
  classId: 'assassin',
  displayName: "Assassin",
  mentorKey: "Assassin",
  archetypes: [
  {
    "id": "deathmark_sniper",
    "name": "Deathmark Sniper",
    "notes": "Long-range assassin eliminating targets before detection.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.7,
      "controller": 0.2,
      "utility": 0.1
    },
    "attributeBias": {
      "dex": 0.5,
      "wis": 0.3,
      "con": 0.2
    }
  },
  {
    "id": "shadow_blade",
    "name": "Shadow Blade",
    "notes": "Blade-focused assassin relying on speed and stealth.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.4,
      "striker": 0.6,
      "controller": 0.3,
      "utility": 0.1
    },
    "attributeBias": {
      "dex": 0.45,
      "str": 0.25,
      "con": 0.2,
      "wis": 0.1
    }
  },
  {
    "id": "venomous_infiltrator",
    "name": "Venomous Infiltrator",
    "notes": "Assassin specializing in toxins and weakening effects.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.4,
      "int": 0.3,
      "wis": 0.2,
      "con": 0.1
    }
  },
  {
    "id": "silent_killer",
    "name": "Silent Killer",
    "notes": "Close-quarters execution specialist relying on surprise.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.6,
      "controller": 0.3,
      "utility": 0.1
    },
    "attributeBias": {
      "dex": 0.45,
      "wis": 0.25,
      "con": 0.2,
      "int": 0.1
    }
  },
  {
    "id": "shadow_blade_assassin",
    "name": "Shadow Blade Assassin",
    "notes": "Melee-focused assassin relying on stealth and sudden violence.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.6,
      "controller": 0.3,
      "utility": 0.1
    },
    "attributeBias": {
      "dex": 0.45,
      "str": 0.25,
      "con": 0.2,
      "wis": 0.1
    }
  }
]
});

export default survey;
