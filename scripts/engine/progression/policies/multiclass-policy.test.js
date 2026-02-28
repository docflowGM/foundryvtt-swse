/**
 * Multiclass Policy Tests — Feature Flag Model
 *
 * Comprehensive test suite for granular multiclass policy configuration.
 * Tests all 8 feature-flag combinations across multiclass scenarios.
 *
 * Run with: npm test -- --grep "Multiclass Policy"
 */

import { MulticlassPolicy } from "./multiclass-policy.js";

describe("Multiclass Policy — Feature Flags", () => {
  let mockActor;
  let mockClassData;
  let settingsMap;

  beforeEach(() => {
    // Mock global game.settings with feature flags
    settingsMap = {
      multiclassEnhancedEnabled: false,
      multiclassRetraining: false,
      multiclassExtraStartingFeats: false,
      multiclassBonusSkillDelta: false
    };

    global.game = {
      settings: {
        get: (namespace, key) => {
          if (namespace === "foundryvtt-swse") {
            return settingsMap[key];
          }
          return null;
        }
      }
    };

    // Mock actor with progression system
    mockActor = {
      name: "Test Character",
      system: {
        progression: {
          classLevels: []
        }
      }
    };

    // Mock class data
    mockClassData = {
      id: "soldier",
      name: "Soldier",
      baseClass: true,
      prestigeClass: false,
      trainedSkills: 2,
      classSkills: ["Acrobatics", "Athletic", "Climb"],
      startingFeatures: [
        { id: "f1", type: "feat", name: "Armor Proficiency" },
        { id: "f2", type: "feat", name: "Simple Weapons" }
      ]
    };
  });

  describe("Scenario 1: All Flags OFF (RAW Behavior)", () => {
    it("should return RAW policy when all flags disabled", () => {
      // All flags off = RAW
      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, {});

      expect(policy.mode).toBe("RAW");
      expect(policy.startingFeatGrants).toBe(1);
      expect(policy.retrainAllowed).toBe(false);
      expect(policy.bonusSkillTrainings).toBe(0);
    });
  });

  describe("Scenario 2: Retraining ONLY", () => {
    beforeEach(() => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassRetraining = true;
      settingsMap.multiclassExtraStartingFeats = false;
      settingsMap.multiclassBonusSkillDelta = false;
    });

    it("should enable retraining when flag ON, keep other features OFF", () => {
      mockActor.system.progression.classLevels = [
        { class: "Scoundrel", baseClass: true }
      ];

      const context = {
        classDataCache: {
          "Scoundrel": {
            id: "scoundrel",
            baseClass: true,
            trainedSkills: 3,
            classSkills: ["Deception"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, context);

      expect(policy.mode).toBe("ENHANCED");
      expect(policy.retrainAllowed).toBe(true);
      expect(policy.startingFeatGrants).toBe(1); // Still 1, not full
      expect(policy.bonusSkillTrainings).toBe(0); // No delta
      expect(policy.flags.retraining).toBe(true);
      expect(policy.flags.extraStartingFeats).toBe(false);
      expect(policy.flags.bonusSkillDelta).toBe(false);
    });
  });

  describe("Scenario 3: Extra Starting Feats ONLY", () => {
    beforeEach(() => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassRetraining = false;
      settingsMap.multiclassExtraStartingFeats = true;
      settingsMap.multiclassBonusSkillDelta = false;
    });

    it("should grant full starting feat list when flag ON", () => {
      mockActor.system.progression.classLevels = [
        { class: "Scoundrel", baseClass: true }
      ];

      const context = {
        classDataCache: {
          "Scoundrel": {
            id: "scoundrel",
            baseClass: true,
            trainedSkills: 3,
            classSkills: ["Deception"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, context);

      expect(policy.mode).toBe("ENHANCED");
      expect(policy.startingFeatGrants).toBe(2); // Full list
      expect(policy.retrainAllowed).toBe(false); // Retraining OFF
      expect(policy.bonusSkillTrainings).toBe(0); // No delta
      expect(policy.flags.extraStartingFeats).toBe(true);
      expect(policy.flags.retraining).toBe(false);
    });
  });

  describe("Scenario 4: Bonus Skill Delta ONLY", () => {
    beforeEach(() => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassRetraining = false;
      settingsMap.multiclassExtraStartingFeats = false;
      settingsMap.multiclassBonusSkillDelta = true;
    });

    it("should grant delta skill trainings when flag ON", () => {
      mockActor.system.progression.classLevels = [
        { class: "Soldier", baseClass: true }
      ];

      const newClassData = {
        id: "jedi",
        baseClass: true,
        trainedSkills: 5, // More than Soldier's 2
        classSkills: ["Force"],
        startingFeatures: []
      };

      const context = {
        classDataCache: {
          "Soldier": {
            id: "soldier",
            baseClass: true,
            trainedSkills: 2,
            classSkills: ["Athletic"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, newClassData, context);

      expect(policy.mode).toBe("ENHANCED");
      expect(policy.bonusSkillTrainings).toBe(3); // 5 - 2 = 3
      expect(policy.startingFeatGrants).toBe(1); // Just 1, not full
      expect(policy.retrainAllowed).toBe(false); // No retraining
      expect(policy.flags.bonusSkillDelta).toBe(true);
    });

    it("should not grant negative delta", () => {
      mockActor.system.progression.classLevels = [
        { class: "Soldier", baseClass: true }
      ];

      const newClassData = {
        id: "scoundrel",
        baseClass: true,
        trainedSkills: 1, // Less than Soldier's 2
        classSkills: ["Deception"],
        startingFeatures: []
      };

      const context = {
        classDataCache: {
          "Soldier": {
            id: "soldier",
            baseClass: true,
            trainedSkills: 2,
            classSkills: ["Athletic"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, newClassData, context);

      expect(policy.bonusSkillTrainings).toBe(0); // max(0, 1-2) = 0
    });
  });

  describe("Scenario 5: All Three Flags ON", () => {
    beforeEach(() => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassRetraining = true;
      settingsMap.multiclassExtraStartingFeats = true;
      settingsMap.multiclassBonusSkillDelta = true;
    });

    it("should enable all enhanced features", () => {
      mockActor.system.progression.classLevels = [
        { class: "Soldier", baseClass: true }
      ];

      const newClassData = {
        id: "jedi",
        baseClass: true,
        trainedSkills: 5,
        classSkills: ["Force", "Insight"],
        startingFeatures: [
          { id: "f1", type: "feat" },
          { id: "f2", type: "feat" }
        ]
      };

      const context = {
        classDataCache: {
          "Soldier": {
            id: "soldier",
            baseClass: true,
            trainedSkills: 2,
            classSkills: ["Athletic"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, newClassData, context);

      expect(policy.mode).toBe("ENHANCED");
      expect(policy.retrainAllowed).toBe(true);
      expect(policy.startingFeatGrants).toBe(2); // Full list
      expect(policy.bonusSkillTrainings).toBe(3); // Delta
      expect(policy.flags.retraining).toBe(true);
      expect(policy.flags.extraStartingFeats).toBe(true);
      expect(policy.flags.bonusSkillDelta).toBe(true);
    });

    it("should aggregate skill pools correctly", () => {
      mockActor.system.progression.classLevels = [
        { class: "Soldier", baseClass: true }
      ];

      const context = {
        classDataCache: {
          "Soldier": {
            id: "soldier",
            baseClass: true,
            trainedSkills: 2,
            classSkills: ["Acrobatics", "Athletic"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, context);

      expect(policy.skillSelectionPool.has("Acrobatics")).toBe(true);
      expect(policy.skillSelectionPool.has("Athletic")).toBe(true);
      expect(policy.skillSelectionPool.has("Climb")).toBe(true);
    });
  });

  describe("Scenario 6: Prestige Class Isolation (CRITICAL)", () => {
    beforeEach(() => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassRetraining = true;
      settingsMap.multiclassExtraStartingFeats = true;
      settingsMap.multiclassBonusSkillDelta = true;
    });

    it("should apply RAW rules to prestige classes regardless of flags", () => {
      const prestigeClassData = {
        id: "jedi-knight",
        baseClass: false,
        prestigeClass: true,
        trainedSkills: 2,
        classSkills: ["Force"],
        startingFeatures: [{ id: "f1", type: "feat" }]
      };

      mockActor.system.progression.classLevels = [
        { class: "Soldier", baseClass: true }
      ];

      const context = {
        classDataCache: {
          "Soldier": {
            id: "soldier",
            baseClass: true,
            trainedSkills: 2,
            classSkills: ["Athletic"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, prestigeClassData, context);

      expect(policy.mode).toBe("RAW");
      expect(policy.startingFeatGrants).toBe(0); // Prestige: 0 feats
      expect(policy.retrainAllowed).toBe(false); // No retraining
      expect(policy.bonusSkillTrainings).toBe(0); // No delta
    });

    it("should ignore all flags for prestige classes", () => {
      const prestigeClassData = {
        id: "bounty-hunter",
        baseClass: false,
        prestigeClass: true,
        trainedSkills: 3,
        classSkills: ["Perception"],
        startingFeatures: []
      };

      mockActor.system.progression.classLevels = [
        { class: "Commando", baseClass: true }
      ];

      const context = {
        classDataCache: {
          "Commando": {
            id: "commando",
            baseClass: true,
            trainedSkills: 2,
            classSkills: ["Survival"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, prestigeClassData, context);

      // Even though delta would be 1 and flags are ON, prestige gets RAW
      expect(policy.bonusSkillTrainings).toBe(0);
    });
  });

  describe("Scenario 7: Remove/Re-add Exploit Prevention", () => {
    beforeEach(() => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassExtraStartingFeats = true;
      settingsMap.multiclassBonusSkillDelta = true;
    });

    it("should track enabled flags in exploit guard", () => {
      mockActor.system.progression.classLevels = [
        { class: "Soldier", baseClass: true }
      ];

      const context = {
        classDataCache: {
          "Soldier": {
            id: "soldier",
            baseClass: true,
            trainedSkills: 2,
            classSkills: ["Athletic"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, context);

      expect(policy.exploitGuard).toBeDefined();
      expect(policy.exploitGuard.enabledFlags).toEqual({
        retraining: false,
        extraFeats: true,
        bonusSkills: true
      });
    });

    it("should prevent duplicate grants by comparing enabled flags", () => {
      // First application with certain flags
      const firstPolicy = {
        mode: "ENHANCED",
        bonusSkillTrainings: 2,
        exploitGuard: {
          enabledFlags: {
            extraFeats: true,
            bonusSkills: true
          }
        }
      };

      mockActor.system.progression.multiclassHistory = {
        jedi: {
          classId: "jedi",
          deltaSkillTrainings: 2,
          enabledFlags: {
            extraFeats: true,
            bonusSkills: true
          }
        }
      };

      const validation = MulticlassPolicy.validateHistoryEntry(
        mockActor,
        "jedi",
        firstPolicy
      );

      expect(validation.valid).toBe(false);
    });
  });

  describe("Scenario 8: Attribute Increase + Enhanced Multiclass", () => {
    beforeEach(() => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassExtraStartingFeats = true;
    });

    it("should track multiclass and ability increases independently", () => {
      mockActor.system.progression = {
        classLevels: [{ class: "Soldier" }],
        multiclassHistory: {}
      };

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, {});

      // Multiclass policy applied
      const history = MulticlassPolicy.recordPolicyApplication(
        mockActor,
        "soldier",
        policy
      );

      expect(history.soldier).toBeDefined();
      expect(history.soldier.startingFeatGrants).toBe(2);

      // History should not interfere with ability increases
      expect(mockActor.system.progression.multiclassHistory).not.toBeDefined();
    });
  });

  describe("Configuration API", () => {
    it("should return RAW configuration when enhanced disabled", () => {
      settingsMap.multiclassEnhancedEnabled = false;

      const config = MulticlassPolicy.getConfiguration();

      expect(config.mode).toBe("RAW");
      expect(config.enabled).toBe(false);
      expect(config.flags.retraining).toBe(false);
      expect(config.flags.extraStartingFeats).toBe(false);
      expect(config.flags.bonusSkillDelta).toBe(false);
    });

    it("should return enhanced configuration with individual flags", () => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassRetraining = true;
      settingsMap.multiclassExtraStartingFeats = false;
      settingsMap.multiclassBonusSkillDelta = true;

      const config = MulticlassPolicy.getConfiguration();

      expect(config.mode).toBe("ENHANCED");
      expect(config.enabled).toBe(true);
      expect(config.flags.retraining).toBe(true);
      expect(config.flags.extraStartingFeats).toBe(false);
      expect(config.flags.bonusSkillDelta).toBe(true);
    });

    it("should generate human-readable description", () => {
      settingsMap.multiclassEnhancedEnabled = true;
      settingsMap.multiclassRetraining = true;
      settingsMap.multiclassExtraStartingFeats = true;

      const description = MulticlassPolicy.getDescription();

      expect(description).toContain("Enhanced");
      expect(description).toContain("skill retraining");
      expect(description).toContain("full starting feats");
    });
  });

  describe("Exploit Prevention Matrix", () => {
    it("should allow new grants if no previous entry", () => {
      mockActor.system.progression = {
        multiclassHistory: {}
      };

      const policyResult = {
        mode: "ENHANCED",
        bonusSkillTrainings: 2
      };

      const validation = MulticlassPolicy.validateHistoryEntry(
        mockActor,
        "jedi",
        policyResult
      );

      expect(validation.valid).toBe(true);
    });

    it("should prevent duplicate delta skill grants", () => {
      mockActor.system.progression = {
        multiclassHistory: {
          jedi: { deltaSkillTrainings: 2, mode: "ENHANCED" }
        }
      };

      const policyResult = {
        mode: "ENHANCED",
        bonusSkillTrainings: 2
      };

      const validation = MulticlassPolicy.validateHistoryEntry(
        mockActor,
        "jedi",
        policyResult
      );

      expect(validation.valid).toBe(false);
    });
  });
});
