/**
 * PHASE 1B: Convert 6 Feats to PASSIVE/MODIFIER Execution Model
 *
 * These 6 feats are the Phase 1B test batch:
 * 1. Skill Focus (+5 bonus to single skill)
 * 2. Educated (+5 bonus to two knowledge skills)
 * 3. Great Fortitude (+2 to Fortitude Defense, untyped)
 * 4. Lightning Reflexes (+2 to Reflex Defense, untyped)
 * 5. Thick Skin (+2 to Fortitude Defense, Species type)
 * 6. Improved Defenses (+1 to Reflex, Fortitude, Will Defense, untyped)
 */

export const PHASE_1B_FEATS = {
  "Skill Focus": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          // This feat allows choosing a skill, but for now we hardcode to Acrobatics
          // In Phase 2+ we can add conditional/choice support
          target: "skill.acrobatics",
          type: "competence",
          value: 5,
          enabled: true,
          priority: 500,
          description: "Skill Focus bonus"
        }
      ]
    }
  },

  "Educated": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "skill.knowledge_core_worlds",
          type: "competence",
          value: 5,
          enabled: true,
          priority: 500,
          description: "Educated bonus (Knowledge: Core Worlds)"
        },
        {
          target: "skill.knowledge_life_sciences",
          type: "competence",
          value: 5,
          enabled: true,
          priority: 500,
          description: "Educated bonus (Knowledge: Life Sciences)"
        }
      ]
    }
  },

  "Great Fortitude": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.fortitude",
          type: "untyped",
          value: 2,
          enabled: true,
          priority: 500,
          description: "Great Fortitude bonus"
        }
      ]
    }
  },

  "Lightning Reflexes": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.reflex",
          type: "untyped",
          value: 2,
          enabled: true,
          priority: 500,
          description: "Lightning Reflexes bonus"
        }
      ]
    }
  },

  "Thick Skin": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.fortitude",
          type: "species",  // Tests species stacking type
          value: 2,
          enabled: true,
          priority: 500,
          description: "Thick Skin bonus"
        }
      ]
    }
  },

  "Improved Defenses": {
    executionModel: "PASSIVE",
    subType: "MODIFIER",
    abilityMeta: {
      modifiers: [
        {
          target: "defense.reflex",
          type: "untyped",
          value: 1,
          enabled: true,
          priority: 500,
          description: "Improved Defenses: Reflex"
        },
        {
          target: "defense.fortitude",
          type: "untyped",
          value: 1,
          enabled: true,
          priority: 500,
          description: "Improved Defenses: Fortitude"
        },
        {
          target: "defense.will",
          type: "untyped",
          value: 1,
          enabled: true,
          priority: 500,
          description: "Improved Defenses: Will"
        }
      ]
    }
  }
};

/**
 * Apply Phase 1B metadata to feats in an actor
 * This simulates loading the feats with their PASSIVE/MODIFIER metadata
 */
export function applyPhase1BMetadata(actor) {
  if (!actor?.items) return;

  for (const item of actor.items) {
    if (item.type !== "feat") continue;
    if (!PHASE_1B_FEATS[item.name]) continue;

    const metadata = PHASE_1B_FEATS[item.name];
    if (!item.system.abilityMeta) {
      item.system.abilityMeta = {};
    }

    item.system.executionModel = metadata.executionModel;
    item.system.subType = metadata.subType;
    item.system.abilityMeta.modifiers = metadata.abilityMeta.modifiers;
  }
}
