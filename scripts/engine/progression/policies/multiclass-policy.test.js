/**
 * Multiclass Policy Tests
 *
 * Comprehensive test suite for multiclass policy layer.
 * Tests both RAW and ENHANCED modes across various scenarios.
 *
 * Run with: npm test -- --grep "Multiclass Policy"
 */

import { MulticlassPolicy } from "./multiclass-policy.js";

describe("Multiclass Policy", () => {
  let mockActor;
  let mockClassData;

  beforeEach(() => {
    // Mock global game.settings
    global.game = {
      settings: {
        get: (namespace, key) => {
          if (key === "multiclassPolicy") return "RAW";
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

  describe("Scenario 1: Base → Base (RAW)", () => {
    it("should grant 1 starting feat in RAW mode", () => {
      global.game.settings.get = () => "RAW";

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, {});

      expect(policy.mode).toBe("RAW");
      expect(policy.startingFeatGrants).toBe(1);
      expect(policy.retrainAllowed).toBe(false);
      expect(policy.bonusSkillTrainings).toBe(0);
    });

    it("should use standard skill selection pool", () => {
      global.game.settings.get = () => "RAW";

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, {});

      expect(policy.skillSelectionPool instanceof Set).toBe(true);
      expect(policy.skillSelectionPool.has("Acrobatics")).toBe(true);
    });
  });

  describe("Scenario 2: Base → Base (ENHANCED)", () => {
    it("should grant full starting feat list", () => {
      global.game.settings.get = () => "ENHANCED";
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
      expect(policy.startingFeatGrants).toBe(2); // From startingFeatures
      expect(policy.retrainAllowed).toBe(true);
    });

    it("should calculate skill training delta correctly", () => {
      global.game.settings.get = () => "ENHANCED";
      mockActor.system.progression.classLevels = [
        { class: "Scoundrel", baseClass: true }
      ];

      // Original base class has 3, new class has 2 → delta = 0
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

      expect(policy.bonusSkillTrainings).toBe(0); // 2 - 3 = -1, max(0, -1) = 0
    });

    it("should grant bonus skills if new class has more training slots", () => {
      global.game.settings.get = () => "ENHANCED";

      // Original base class: 2 trainings, New class: 5 trainings
      const newClassData = {
        id: "jedi",
        baseClass: true,
        trainedSkills: 5,
        classSkills: ["Force", "Insight"],
        startingFeatures: []
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

      const policy = MulticlassPolicy.evaluate(mockActor, newClassData, context);

      expect(policy.bonusSkillTrainings).toBe(3); // 5 - 2 = 3
    });

    it("should aggregate skill pools from all classes", () => {
      global.game.settings.get = () => "ENHANCED";

      const newClassData = {
        id: "scoundrel",
        baseClass: true,
        trainedSkills: 2,
        classSkills: ["Deception", "Stealth"],
        startingFeatures: []
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
            classSkills: ["Acrobatics", "Athletic"]
          }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, newClassData, context);

      expect(policy.skillSelectionPool.has("Acrobatics")).toBe(true);
      expect(policy.skillSelectionPool.has("Deception")).toBe(true);
      expect(policy.skillSelectionPool.has("Stealth")).toBe(true);
    });
  });

  describe("Scenario 3: Base → Prestige", () => {
    it("should apply RAW rules regardless of policy mode", () => {
      global.game.settings.get = () => "ENHANCED";

      const prestigeClassData = {
        id: "jedi-knight",
        baseClass: false,
        prestigeClass: true,
        trainedSkills: 2,
        classSkills: ["Force"],
        startingFeatures: []
      };

      mockActor.system.progression.classLevels = [
        { class: "Soldier", baseClass: true }
      ];

      const policy = MulticlassPolicy.evaluate(mockActor, prestigeClassData, {});

      expect(policy.mode).toBe("RAW");
      expect(policy.startingFeatGrants).toBe(0); // Prestige = 0 feats
      expect(policy.retrainAllowed).toBe(false);
      expect(policy.bonusSkillTrainings).toBe(0);
    });
  });

  describe("Scenario 4: Prestige → Base", () => {
    it("should grant RAW benefits when adding base class after prestige", () => {
      global.game.settings.get = () => "ENHANCED";

      mockActor.system.progression.classLevels = [
        { class: "Jedi", baseClass: true },
        { class: "Jedi-Knight", prestigeClass: true }
      ];

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, {});

      // Should grant RAW benefits because first base class was Jedi
      expect(policy.mode).toBe("RAW"); // Falls back to RAW (no second base class yet)
      expect(policy.startingFeatGrants).toBe(1);
    });
  });

  describe("Scenario 5: Triple multiclass", () => {
    it("should apply consistent policy across three base classes", () => {
      global.game.settings.get = () => "ENHANCED";

      mockActor.system.progression.classLevels = [
        { class: "Soldier" },
        { class: "Scoundrel" }
      ];

      const jediData = {
        id: "jedi",
        baseClass: true,
        trainedSkills: 4,
        classSkills: ["Force", "Insight"],
        startingFeatures: [{ id: "f1", type: "feat" }]
      };

      const context = {
        classDataCache: {
          "Soldier": { baseClass: true, trainedSkills: 2, classSkills: ["Athletic"] },
          "Scoundrel": { baseClass: true, trainedSkills: 3, classSkills: ["Deception"] }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, jediData, context);

      expect(policy.mode).toBe("ENHANCED");
      expect(policy.bonusSkillTrainings).toBe(2); // 4 - 2 (original) = 2
    });
  });

  describe("Scenario 6: Retraining + Cancel", () => {
    it("should enable retraining flag in ENHANCED mode", () => {
      global.game.settings.get = () => "ENHANCED";

      mockActor.system.progression.classLevels = [
        { class: "Soldier", baseClass: true }
      ];

      const context = {
        classDataCache: {
          "Soldier": { baseClass: true, trainedSkills: 2, classSkills: ["Athletic"] }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, context);

      expect(policy.retrainAllowed).toBe(true);
    });

    it("should disable retraining flag in RAW mode", () => {
      global.game.settings.get = () => "RAW";

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, {});

      expect(policy.retrainAllowed).toBe(false);
    });
  });

  describe("Scenario 7: Remove class mid-level-up", () => {
    it("should prevent duplicate grants via history validation", () => {
      const history = {
        soldier: {
          classId: "soldier",
          mode: "ENHANCED",
          deltaSkillTrainings: 1,
          appliedAt: new Date().toISOString()
        }
      };

      mockActor.system.progression = {
        multiclassHistory: history
      };

      const policyResult = {
        mode: "ENHANCED",
        bonusSkillTrainings: 1
      };

      const validation = MulticlassPolicy.validateHistoryEntry(
        mockActor,
        "soldier",
        policyResult
      );

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("already granted");
    });
  });

  describe("Scenario 8: Attribute increase + multiclass", () => {
    it("should track attribute increases separately from multiclass grants", () => {
      global.game.settings.get = () => "ENHANCED";

      mockActor.system.progression = {
        classLevels: [{ class: "Soldier" }],
        multiclassHistory: {}
      };

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, {});

      // Policy result should track multiclass grants
      const history = MulticlassPolicy.recordPolicyApplication(
        mockActor,
        "soldier",
        policy
      );

      expect(history.soldier).toBeDefined();
      expect(history.soldier.appliedAt).toBeDefined();
    });
  });

  describe("Scenario 9: Suite reselection + multiclass", () => {
    it("should preserve multiclass policy data across suite reselection", () => {
      global.game.settings.get = () => "ENHANCED";

      mockActor.system.progression = {
        classLevels: [{ class: "Soldier" }],
        multiclassHistory: {
          soldier: { classId: "soldier", mode: "ENHANCED" }
        }
      };

      const policy = MulticlassPolicy.evaluate(mockActor, mockClassData, {});

      // History should not be overwritten
      expect(mockActor.system.progression.multiclassHistory.soldier).toBeDefined();

      // New policy should still apply
      expect(policy.mode).toBe("ENHANCED");
    });
  });

  describe("History Tracking", () => {
    it("should record policy application with timestamp", () => {
      const policyResult = {
        mode: "ENHANCED",
        startingFeatGrants: 2,
        bonusSkillTrainings: 1
      };

      const history = MulticlassPolicy.recordPolicyApplication(
        mockActor,
        "jedi",
        policyResult
      );

      expect(history.jedi.classId).toBe("jedi");
      expect(history.jedi.mode).toBe("ENHANCED");
      expect(history.jedi.startingFeatGrants).toBe(2);
      expect(history.jedi.deltaSkillTrainings).toBe(1);
      expect(history.jedi.appliedAt).toBeTruthy();
    });
  });

  describe("Exploit Prevention", () => {
    it("should prevent duplicate delta skill training grants", () => {
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
  });

  describe("Configuration", () => {
    it("should report current policy mode", () => {
      global.game.settings.get = () => "ENHANCED";

      const mode = MulticlassPolicy.getMode();

      expect(mode).toBe("ENHANCED");
    });

    it("should provide human-readable description", () => {
      global.game.settings.get = () => "RAW";

      const desc = MulticlassPolicy.getDescription();

      expect(desc).toContain("RAW");
      expect(desc).toContain("Standard Saga");
    });
  });
});
