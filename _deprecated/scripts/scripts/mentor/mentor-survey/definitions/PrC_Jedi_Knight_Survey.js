import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Jedi_Knight',
  classId: 'jedi_knight',
  displayName: "Jedi Knight",
  mentorKey: "Jedi Knight",
  archetypes: [
  {
    "id": "battle_master",
    "name": "Battle Master",
    "notes": "Jedi Knight who commands and coordinates allies in combat.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "offense": 1.1,
      "striker": 0.4,
      "support": 0.2
    },
    "attributeBias": {
      "str": 0.3,
      "cha": 0.3,
      "wis": 0.25,
      "con": 0.15
    }
  },
  {
    "id": "force_duelist",
    "name": "Force Duelist",
    "notes": "Elite Force-enhanced duelist focused on one-on-one combat.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "controller": 0.3,
      "utility": 0.1
    },
    "attributeBias": {
      "dex": 0.4,
      "wis": 0.3,
      "con": 0.2,
      "cha": 0.1
    }
  },
  {
    "id": "lightsaber_vanguard",
    "name": "Lightsaber Vanguard",
    "notes": "Frontline assault Jedi leading charges with lightsaber mastery.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.2,
      "defense": 1.1,
      "striker": 0.5,
      "defender": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "str": 0.35,
      "dex": 0.3,
      "con": 0.2,
      "wis": 0.15
    }
  },
  {
    "id": "jedi_shadow",
    "name": "Jedi Shadow",
    "notes": "Advanced covert Jedi specializing in hunting Dark Side threats.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.2,
      "utility": 0.4
    },
    "attributeBias": {
      "dex": 0.35,
      "wis": 0.35,
      "int": 0.2,
      "cha": 0.1
    }
  },
  {
    "id": "jedi_watchman",
    "name": "Jedi Watchman",
    "notes": "Urban investigator and Jedi intelligence operative.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.3,
      "utility": 0.3
    },
    "attributeBias": {
      "dex": 0.3,
      "wis": 0.3,
      "int": 0.25,
      "cha": 0.15
    }
  },
  {
    "id": "jedi_battlemaster",
    "name": "Jedi Battlemaster",
    "notes": "Elite Jedi combat commander and instructor.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.4,
      "support": 0.2
    },
    "attributeBias": {
      "str": 0.3,
      "cha": 0.3,
      "wis": 0.25,
      "con": 0.15
    }
  }
]
});

export default survey;
