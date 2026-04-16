import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Crime_Lord',
  classId: 'crime_lord',
  displayName: "Crime Lord",
  mentorKey: "Crime Lord",
  archetypes: [
  {
    "id": "underworld_kingpin",
    "name": "Underworld Kingpin",
    "notes": "Supreme authority over a criminal empire, ruling through fear and loyalty.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "support": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "cha": 0.45,
      "int": 0.35,
      "wis": 0.2
    }
  },
  {
    "id": "shadow_broker",
    "name": "Shadow Broker",
    "notes": "Dealer of secrets and intelligence, manipulating events from the shadows.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "utility": 0.4,
      "support": 0.1
    },
    "attributeBias": {
      "int": 0.45,
      "cha": 0.35,
      "wis": 0.2
    }
  },
  {
    "id": "criminal_mastermind",
    "name": "Criminal Mastermind",
    "notes": "Strategic architect of criminal operations and long-term schemes.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.6,
      "utility": 0.3,
      "support": 0.1
    },
    "attributeBias": {
      "int": 0.5,
      "cha": 0.3,
      "wis": 0.2
    }
  },
  {
    "id": "gang_leader",
    "name": "Gang Leader",
    "notes": "Hands-on boss who commands through presence and violence.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.4,
      "controller": 0.4,
      "striker": 0.2
    },
    "attributeBias": {
      "cha": 0.4,
      "str": 0.3,
      "con": 0.3
    }
  },
  {
    "id": "smuggling_kingpin",
    "name": "Smuggling Kingpin",
    "notes": "Controls illicit trade routes and black-market logistics.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.5,
      "controller": 0.3,
      "support": 0.2
    },
    "attributeBias": {
      "int": 0.4,
      "cha": 0.4,
      "wis": 0.2
    }
  },
  {
    "id": "information_broker",
    "name": "Information Broker",
    "notes": "Pure information-focused criminal operator.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "utility": 0.4,
      "support": 0.1
    },
    "attributeBias": {
      "int": 0.45,
      "cha": 0.35,
      "wis": 0.2
    }
  },
  {
    "id": "information_broker__shadow_master",
    "name": "Information Broker / Shadow Master",
    "notes": "",
    "mechanicalBias": {},
    "roleBias": {},
    "attributeBias": {}
  }
]
});

export default survey;
