import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Bounty_Hunter',
  classId: 'bounty_hunter',
  displayName: "Bounty Hunter",
  mentorKey: "Bounty Hunter",
  archetypes: [
  {
    "id": "tracker",
    "name": "Tracker",
    "notes": "Classic pursuit-focused bounty hunter.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.4,
      "controller": 0.3,
      "striker": 0.3
    },
    "attributeBias": {
      "wis": 0.4,
      "dex": 0.35,
      "con": 0.25
    }
  },
  {
    "id": "guns_for_hire",
    "name": "Guns-for-Hire",
    "notes": "Combat-first bounty hunter motivated by contracts and pay.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "utility": 0.2,
      "controller": 0.2
    },
    "attributeBias": {
      "dex": 0.4,
      "con": 0.3,
      "str": 0.2,
      "wis": 0.1
    }
  },
  {
    "id": "close_quarters_enforcer",
    "name": "Close-Quarters Enforcer",
    "notes": "Close-range capture and intimidation specialist.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "defender": 0.2,
      "controller": 0.2
    },
    "attributeBias": {
      "str": 0.45,
      "con": 0.35,
      "dex": 0.2
    }
  },
  {
    "id": "tech_hunter",
    "name": "Tech Hunter",
    "notes": "Technology-driven hunter relying on gadgets and traps.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.5,
      "controller": 0.3,
      "striker": 0.2
    },
    "attributeBias": {
      "int": 0.45,
      "dex": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "silent_tracker",
    "name": "Silent Tracker",
    "notes": "Stealth-focused hunter specializing in pursuit and capture.",
    "mechanicalBias": {},
    "roleBias": {
      "scout": 1.2,
      "striker": 0.3,
      "utility": 0.4,
      "controller": 0.3
    },
    "attributeBias": {
      "wis": 0.35,
      "dex": 0.35,
      "con": 0.2,
      "int": 0.1
    }
  },
  {
    "id": "gunslinger_hunter",
    "name": "Gunslinger Hunter",
    "notes": "Combat-heavy bounty hunter relying on speed and firepower.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.6,
      "controller": 0.2,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.4,
      "con": 0.25,
      "str": 0.2,
      "wis": 0.15
    }
  },
  {
    "id": "tech_bounty_hunter",
    "name": "Tech Bounty Hunter",
    "notes": "Gadget-focused hunter using technology and traps to secure targets.",
    "mechanicalBias": {},
    "roleBias": {
      "utility": 0.5,
      "controller": 0.3,
      "striker": 0.2
    },
    "attributeBias": {
      "int": 0.4,
      "dex": 0.3,
      "wis": 0.2,
      "con": 0.1
    }
  }
]
});

export default survey;
