import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'PrC_Sith_Apprentice',
  classId: 'sith_apprentice',
  displayName: "Sith Apprentice",
  mentorKey: "Sith Apprentice",
  archetypes: [
  {
    "id": "dark_acolyte",
    "name": "Dark Acolyte",
    "notes": "Force-focused Sith devoted to raw dark side power.",
    "mechanicalBias": {
      "forceDC": 0.5
    },
    "roleBias": {
      "striker": 0.3,
      "controller": 0.2
    },
    "attributeBias": {
      "wis": 0.4,
      "cha": 0.35,
      "con": 0.15,
      "dex": 0.1
    }
  },
  {
    "id": "aggressive_disciple",
    "name": "Aggressive Disciple",
    "notes": "Violent Sith apprentice emphasizing lightsaber aggression.",
    "mechanicalBias": {
      "forceDC": 0.3
    },
    "roleBias": {
      "striker": 0.6,
      "controller": 0.1
    },
    "attributeBias": {
      "str": 0.35,
      "dex": 0.25,
      "wis": 0.25,
      "con": 0.15
    }
  },
  {
    "id": "manipulative_student",
    "name": "Manipulative Student",
    "notes": "Scheming Sith using deception and influence to control others.",
    "mechanicalBias": {},
    "roleBias": {
      "controller": 0.5,
      "support": 0.3,
      "utility": 0.2
    },
    "attributeBias": {
      "cha": 0.45,
      "wis": 0.3,
      "int": 0.25
    }
  }
]
});

export default survey;
