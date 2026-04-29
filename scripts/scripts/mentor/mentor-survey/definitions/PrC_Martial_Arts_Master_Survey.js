import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Martial_Arts_Master',
  classId: 'martial_arts_master',
  displayName: "Martial Arts Master",
  mentorKey: "Martial Arts Master",
  archetypes: [
  {
    "id": "unarmed_temple_guardian",
    "name": "Unarmed Temple Guardian",
    "notes": "Stoic unarmed guardian trained to hold ground and protect sacred sites.",
    "mechanicalBias": {},
    "roleBias": {
      "defense": 1.4,
      "support": 1.1,
      "defender": 0.5,
      "controller": 0.3,
      "striker": 0.2
    },
    "attributeBias": {
      "con": 0.4,
      "wis": 0.35,
      "str": 0.25
    }
  },
  {
    "id": "bonecrusher_brawler",
    "name": "Bonecrusher Brawler",
    "notes": "Brutal close-combat specialist relying on overwhelming physical force.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "defender": 0.3,
      "controller": 0.1
    },
    "attributeBias": {
      "str": 0.5,
      "con": 0.3,
      "dex": 0.2
    }
  },
  {
    "id": "zen_duelist",
    "name": "Zen Duelist",
    "notes": "Disciplined martial artist who blends calm, defense, and precise counters.",
    "mechanicalBias": {},
    "roleBias": {
      "defense": 1.3,
      "support": 0.3,
      "controller": 0.4,
      "defender": 0.3
    },
    "attributeBias": {
      "wis": 0.45,
      "dex": 0.3,
      "con": 0.25
    }
  },
  {
    "id": "unarmed_weapon_master",
    "name": "Unarmed Weapon Master",
    "notes": "Peak unarmed combatant turning the body into a weapon.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.6,
      "defender": 0.2,
      "controller": 0.2
    },
    "attributeBias": {
      "str": 0.35,
      "dex": 0.35,
      "con": 0.2,
      "wis": 0.1
    }
  },
  {
    "id": "zen_combatant",
    "name": "Zen Combatant",
    "notes": "Defensive martial artist blending discipline and flow.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "support": 0.3,
      "defender": 0.3
    },
    "attributeBias": {
      "wis": 0.4,
      "dex": 0.3,
      "con": 0.3
    }
  }
]
});

export default survey;
