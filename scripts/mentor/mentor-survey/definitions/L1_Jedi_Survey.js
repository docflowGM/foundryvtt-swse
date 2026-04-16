import { buildSurveyDefinition } from '../definition-builder.js';

const survey = buildSurveyDefinition({
  surveyId: 'L1_Jedi',
  classId: 'jedi',
  displayName: "Jedi",
  mentorKey: "Jedi",
  archetypes: [
  {
    "id": "precision_striker",
    "name": "Precision Striker",
    "notes": "Single-target lightsaber specialist focusing on crit expansion, precision attack chains, and defensive reactions.",
    "mechanicalBias": {
      "accuracy": 3,
      "critRange": 3,
      "reactionDefense": 2,
      "evasion": 2
    },
    "roleBias": {
      "striker": 3,
      "skirmisher": 2
    },
    "attributeBias": {
      "dex": 3,
      "str": 2,
      "cha": 1
    }
  },
  {
    "id": "tank_guardian",
    "name": "Tank Guardian",
    "notes": "Durable frontline Jedi focused on mitigation, defensive reactions, and anchoring combat.",
    "mechanicalBias": {
      "damageReduction": 2,
      "reactionDefense": 3
    },
    "roleBias": {
      "defender": 3
    },
    "attributeBias": {
      "con": 3,
      "str": 2,
      "wis": 1
    }
  },
  {
    "id": "battlefield_controller",
    "name": "Battlefield Controller",
    "notes": "Battlefield control Jedi specializing in forced movement, crowd disruption, and action denial.",
    "mechanicalBias": {
      "forceDC": 3,
      "areaControl": 3,
      "conditionTrack": 2
    },
    "roleBias": {
      "controller": 3,
      "support": 1
    },
    "attributeBias": {
      "cha": 3,
      "wis": 2
    }
  },
  {
    "id": "force_burst_striker",
    "name": "Force Burst Striker",
    "notes": "Aggressive damage-focused build leveraging high-impact Force powers and offensive momentum.",
    "mechanicalBias": {
      "forceSecret": 3,
      "burstDamage": 3,
      "accuracy": 2
    },
    "roleBias": {
      "striker": 3,
      "offense": 2
    },
    "attributeBias": {
      "cha": 3,
      "str": 1,
      "dex": 1
    }
  },
  {
    "id": "sentinel_generalist",
    "name": "Sentinel Generalist",
    "notes": "Balanced Jedi build combining combat competence, skill utility, and flexible Force use.",
    "mechanicalBias": {
      "skillUtility": 3,
      "accuracy": 2,
      "forceRecovery": 2
    },
    "roleBias": {
      "flex": 3,
      "skirmisher": 2
    },
    "attributeBias": {
      "dex": 2,
      "cha": 2,
      "int": 1
    }
  }
]
});

export default survey;
