import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'L1_Scout',
  classId: 'scout',
  displayName: "Scout",
  mentorKey: "Scout",
  archetypes: [
  {
    "id": "mobile_skirmisher",
    "name": "Mobile Skirmisher",
    "notes": "Hit-and-run combatant leveraging movement-based bonuses and positioning.",
    "mechanicalBias": {
      "evasion": 3,
      "accuracy": 2,
      "strikeForce": 3
    },
    "roleBias": {
      "skirmisher": 3,
      "striker": 2
    },
    "attributeBias": {
      "dex": 3,
      "wis": 1,
      "con": 1
    }
  },
  {
    "id": "wilderness_survivalist",
    "name": "Wilderness Survivalist",
    "notes": "Environment-focused build specializing in survival, tracking, and terrain advantage.",
    "mechanicalBias": {
      "combatStamina": 3,
      "tacticalAwareness": 2
    },
    "roleBias": {
      "utility": 3,
      "defender": 1
    },
    "attributeBias": {
      "wis": 3,
      "con": 2
    }
  },
  {
    "id": "recon_sniper",
    "name": "Recon Sniper",
    "notes": "Long-range precision build combining stealth, perception, and ranged accuracy.",
    "mechanicalBias": {
      "singleTargetDamage": 3,
      "accuracy": 3,
      "stealth": 2
    },
    "roleBias": {
      "striker": 3,
      "scout": 3
    },
    "attributeBias": {
      "dex": 3,
      "wis": 1
    }
  },
  {
    "id": "condition_harrier",
    "name": "Condition Harrier",
    "notes": "Mobile combatant designed to apply steady condition track pressure while avoiding retaliation.",
    "mechanicalBias": {
      "conditionTrack": 3,
      "evasion": 2,
      "accuracy": 2
    },
    "roleBias": {
      "controller": 3,
      "skirmisher": 2
    },
    "attributeBias": {
      "dex": 2,
      "wis": 2,
      "con": 1
    }
  },
  {
    "id": "pilot_operative",
    "name": "Pilot Operative",
    "notes": "Scout build oriented toward starship combat, piloting optimization, and initiative control.",
    "mechanicalBias": {
      "pilotMastery": 3,
      "initiative": 2,
      "evasion": 2
    },
    "roleBias": {
      "skirmisher": 1,
      "flex": 3
    },
    "attributeBias": {
      "dex": 3,
      "int": 2
    }
  }
]
});

export default survey;
