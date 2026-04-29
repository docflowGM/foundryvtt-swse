import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Gunslinger',
  classId: 'gunslinger',
  displayName: "Gunslinger",
  mentorKey: "Gunslinger",
  archetypes: [
  {
    "id": "notorious_gunslinger",
    "name": "Notorious Gunslinger",
    "notes": "Feared and famous gunfighter with a deadly reputation.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "controller": 0.2,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.45,
      "cha": 0.3,
      "con": 0.25
    }
  },
  {
    "id": "precision_shooter",
    "name": "Precision Shooter",
    "notes": "Accuracy-focused marksman emphasizing perfect shots.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
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
    "id": "dual_wield_specialist",
    "name": "Dual-Wield Specialist",
    "notes": "High-rate dual-pistol specialist.",
    "mechanicalBias": {},
    "roleBias": {
      "offense": 1.3,
      "striker": 0.6,
      "controller": 0.3,
      "utility": 0.1
    },
    "attributeBias": {
      "dex": 0.45,
      "con": 0.3,
      "str": 0.25
    }
  },
  {
    "id": "duelist_gunslinger",
    "name": "Duelist Gunslinger",
    "notes": "Fast-draw pistol duelist focused on lethal accuracy.",
    "mechanicalBias": {},
    "roleBias": {
      "striker": 0.6,
      "controller": 0.2,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.45,
      "cha": 0.3,
      "con": 0.25
    }
  },
  {
    "id": "trick_shooter",
    "name": "Trick Shooter",
    "notes": "Creative shooter manipulating the battlefield with precision shots.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.4,
      "striker": 0.4,
      "utility": 0.2
    },
    "attributeBias": {
      "dex": 0.4,
      "int": 0.3,
      "cha": 0.3
    }
  },
  {
    "id": "precision_marksman",
    "name": "Precision Marksman",
    "notes": "Long-range firearm specialist delivering surgical kills.",
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
  }
]
});

export default survey;
