import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Ace_Pilot',
  classId: 'ace_pilot',
  displayName: "Ace Pilot",
  mentorKey: "Ace Pilot",
  archetypes: [
  {
    "id": "dogfighter",
    "name": "Dogfighter",
    "notes": "Pure starfighter duel specialist.",
    "mechanicalBias": {
      "pilotMastery": 0.3
    },
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "controller": 0.1
    },
    "attributeBias": {
      "dex": 0.45,
      "int": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "interceptor_ace",
    "name": "Interceptor Ace",
    "notes": "High-speed pursuit and interception specialist.",
    "mechanicalBias": {
      "pilotMastery": 0.4
    },
    "roleBias": {
      "offense": 1.2,
      "striker": 0.5,
      "utility": 0.1
    },
    "attributeBias": {
      "dex": 0.45,
      "con": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "daredevil_pilot",
    "name": "Daredevil Pilot",
    "notes": "Extreme-risk pilot performing dangerous maneuvers.",
    "mechanicalBias": {
      "pilotMastery": 0.4
    },
    "roleBias": {
      "controller": 0.4,
      "striker": 0.2
    },
    "attributeBias": {
      "dex": 0.5,
      "con": 0.3,
      "wis": 0.2
    }
  },
  {
    "id": "starfighter_ace",
    "name": "Starfighter Ace",
    "notes": "Elite dogfighter dominating starship combat.",
    "mechanicalBias": {
      "pilotMastery": 0.6
    },
    "roleBias": {
      "striker": 0.3,
      "support": 0.9,
      "controller": 0.1
    },
    "attributeBias": {
      "dex": 0.45,
      "int": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "freighter_captain",
    "name": "Freighter Captain",
    "notes": "Transport specialist excelling at dangerous runs and escapes.",
    "mechanicalBias": {
      "pilotMastery": 0.3
    },
    "roleBias": {
      "utility": 0.5,
      "support": 0.2
    },
    "attributeBias": {
      "dex": 0.35,
      "int": 0.35,
      "cha": 0.3
    }
  },
  {
    "id": "speeder_ace",
    "name": "Speeder Ace",
    "notes": "High-speed ground vehicle specialist and cavalry scout.",
    "mechanicalBias": {
      "pilotMastery": 0.5
    },
    "roleBias": {
      "striker": 0.3,
      "controller": 1,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.45,
      "con": 0.3,
      "wis": 0.25
    }
  },
  {
    "id": "blockade_runner",
    "name": "Blockade Runner",
    "notes": "Smuggling ace specializing in evading pursuit and blockades.",
    "mechanicalBias": {
      "pilotMastery": 0.3
    },
    "roleBias": {
      "support": 1.2,
      "utility": 0.5,
      "controller": 0.2
    },
    "attributeBias": {
      "dex": 0.35,
      "cha": 0.35,
      "int": 0.3
    }
  },
  {
    "id": "daredevil_racer",
    "name": "Daredevil Racer",
    "notes": "Extreme-speed pilot relying on risky maneuvers.",
    "mechanicalBias": {
      "pilotMastery": 0.4
    },
    "roleBias": {
      "controller": 0.4,
      "striker": 0.2
    },
    "attributeBias": {
      "dex": 0.5,
      "con": 0.3,
      "wis": 0.2
    }
  },
  {
    "id": "walker_ace",
    "name": "Walker Ace",
    "notes": "Heavy ground-vehicle commander and assault pilot.",
    "mechanicalBias": {},
    "roleBias": {
      "defender": 0.5,
      "support": 0.8,
      "controller": 0.3,
      "striker": 0.2
    },
    "attributeBias": {
      "int": 0.35,
      "str": 0.3,
      "dex": 0.2,
      "con": 0.15
    }
  }
]
});

export default survey;
