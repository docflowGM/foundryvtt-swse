import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Elite_Trooper',
  classId: 'elite_trooper',
  displayName: "Elite Trooper",
  mentorKey: "Elite Trooper",
  archetypes: [
  {
    "id": "heavy_assault",
    "name": "Heavy Assault",
    "notes": "Overwhelming firepower shock trooper.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "defender": 0.2,
      "controller": 0.2
    },
    "attributeBias": {
      "str": 0.4,
      "con": 0.35,
      "dex": 0.25
    }
  },
  {
    "id": "shock_commander",
    "name": "Shock Commander",
    "notes": "Elite frontline commander leading assault units.",
    "mechanicalBias": {},
    "roleBias": {
      "support": 0.4,
      "striker": 0.4,
      "controller": 0.2
    },
    "attributeBias": {
      "cha": 0.35,
      "str": 0.3,
      "con": 0.25,
      "wis": 0.1
    }
  },
  {
    "id": "elite_enforcer",
    "name": "Elite Enforcer",
    "notes": "High-threat personal enforcer for elite operations.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.2,
      "striker": 0.5,
      "defender": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "str": 0.4,
      "con": 0.35,
      "dex": 0.25
    }
  },
  {
    "id": "specops_commando",
    "name": "SpecOps Commando",
    "notes": "Elite special forces operative for covert strike missions.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.4,
      "controller": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.35,
      "int": 0.25,
      "wis": 0.2,
      "con": 0.2
    }
  },
  {
    "id": "bodyguard_enforcer",
    "name": "Bodyguard Enforcer",
    "notes": "Elite protector and high-threat enforcer.",
    "mechanicalBias": {},
    "roleBias": {
      "defender": 0.6,
      "support": 0.2,
      "controller": 0.2
    },
    "attributeBias": {
      "con": 0.4,
      "str": 0.3,
      "wis": 0.2,
      "dex": 0.1
    }
  },
  {
    "id": "heavy_weapons_specialist",
    "name": "Heavy Weapons Specialist",
    "notes": "Maximum firepower shock trooper.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.6,
      "controller": 0.2,
      "defender": 0.2
    },
    "attributeBias": {
      "str": 0.35,
      "con": 0.35,
      "dex": 0.2,
      "wis": 0.1
    }
  },
  {
    "id": "infiltrator",
    "name": "Infiltrator",
    "notes": "Stealth-focused elite trooper for deep infiltration.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "striker": 0.2,
      "utility": 0.3
    },
    "attributeBias": {
      "dex": 0.35,
      "wis": 0.3,
      "int": 0.25,
      "con": 0.1
    }
  },
  {
    "id": "sharpshooter",
    "name": "Sharpshooter",
    "notes": "Elite long-range marksman eliminating priority targets.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.6,
      "controller": 0.2,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.45,
      "wis": 0.35,
      "con": 0.2
    }
  }
]
});

export default survey;
