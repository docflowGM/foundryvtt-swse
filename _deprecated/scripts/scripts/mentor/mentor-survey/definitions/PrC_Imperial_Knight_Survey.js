import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Imperial_Knight',
  classId: 'imperial_knight',
  displayName: "Imperial Knight",
  mentorKey: "Imperial Knight",
  archetypes: [
  {
    "id": "emperors_shield",
    "name": "Emperor\u2019s Shield",
    "notes": "Defensive Imperial Knight bodyguard archetype.",
    "mechanicalBias": {
      "burstDamage": 0.4,
      "forceDC": 0.4
    },
    "roleBias": {
      "offense": 1,
      "defense": 1.4,
      "support": 1.1,
      "utility": 0.8,
      "controller": 0.2
    },
    "attributeBias": {
      "con": 0.35,
      "cha": 0.35,
      "wis": 0.2,
      "str": 0.1
    }
  },
  {
    "id": "knight_inquisitor",
    "name": "Knight Inquisitor",
    "notes": "Anti\u2013Force-user hunter and duelist.",
    "mechanicalBias": {
      "forceSecret": 0.5,
      "burstDamage": 0.2
    },
    "roleBias": {
      "offense": 1.3,
      "defense": 1.2,
      "support": 0.8,
      "utility": 0.9,
      "controller": 0.3
    },
    "attributeBias": {
      "wis": 0.35,
      "cha": 0.3,
      "str": 0.2,
      "con": 0.15
    }
  },
  {
    "id": "errant_knight",
    "name": "Errant Knight",
    "notes": "Independent Imperial Knight operative.",
    "mechanicalBias": {
      "burstDamage": 0.3,
      "forceDC": 0.4
    },
    "roleBias": {
      "offense": 1.1,
      "defense": 1.1,
      "support": 1,
      "utility": 1,
      "controller": 0.3
    },
    "attributeBias": {
      "cha": 0.3,
      "wis": 0.3,
      "dex": 0.2,
      "con": 0.2
    }
  },
  {
    "id": "imperial_knight_inquisitor",
    "name": "Imperial Knight Inquisitor",
    "notes": "Imperial Knight specializing in rooting out Force threats and corruption.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "offense": 1.1,
      "striker": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "wis": 0.35,
      "cha": 0.3,
      "dex": 0.2,
      "con": 0.15
    }
  },
  {
    "id": "imperial_knight_errant",
    "name": "Imperial Knight Errant",
    "notes": "Independent Imperial Knight acting beyond strict court duties.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.1,
      "support": 0.3,
      "striker": 0.4,
      "controller": 0.3
    },
    "attributeBias": {
      "dex": 0.3,
      "cha": 0.3,
      "wis": 0.25,
      "con": 0.15
    }
  }
]
});

export default survey;
