import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'L1_Noble',
  classId: 'noble',
  displayName: "Noble",
  mentorKey: "Noble",
  archetypes: [
  {
    "id": "battlefield_commander",
    "name": "Battlefield Commander",
    "notes": "Combat-oriented Noble focused on improving allies' accuracy, morale, and coordination.",
    "mechanicalBias": {
      "moraleBonus": 3,
      "initiative": 2,
      "commandAuthority": 3
    },
    "roleBias": {
      "support": 3,
      "leader": 3
    },
    "attributeBias": {
      "cha": 3,
      "int": 2
    }
  },
  {
    "id": "master_orator",
    "name": "Master Orator",
    "notes": "Charisma-maximizing Noble focused on persuasion, negotiation, and narrative control.",
    "mechanicalBias": {
      "socialManipulation": 3,
      "skillUtility": 3,
      "networkInfluence": 3
    },
    "roleBias": {
      "support": 2,
      "controller": 3
    },
    "attributeBias": {
      "cha": 3,
      "int": 1
    }
  },
  {
    "id": "tactical_coordinator",
    "name": "Tactical Coordinator",
    "notes": "Optimized around granting allies extra actions, improving initiative flow, and battlefield coordination.",
    "mechanicalBias": {
      "initiative": 3,
      "allySupport": 2
    },
    "roleBias": {
      "support": 3,
      "leader": 2
    },
    "attributeBias": {
      "cha": 2,
      "int": 2,
      "dex": 1
    }
  },
  {
    "id": "political_strategist",
    "name": "Political Strategist",
    "notes": "Resource-focused Noble emphasizing contacts, influence networks, and long-term strategic advantage.",
    "mechanicalBias": {
      "skillUtility": 3,
      "resourceControl": 3,
      "networkInfluence": 3
    },
    "roleBias": {
      "utility": 3,
      "support": 2
    },
    "attributeBias": {
      "int": 3,
      "cha": 2
    }
  },
  {
    "id": "inspirational_supporter",
    "name": "Inspirational Supporter",
    "notes": "Defensive support Noble focused on morale bonuses and helping allies recover from condition penalties.",
    "mechanicalBias": {
      "moraleBonus": 3,
      "damageMitigationAura": 3
    },
    "roleBias": {
      "support": 3,
      "defender": 1
    },
    "attributeBias": {
      "cha": 3,
      "wis": 1
    }
  }
]
});

export default survey;
