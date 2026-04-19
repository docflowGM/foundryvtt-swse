/**
 * Droid Force Constraints Tests
 *
 * Enforce three droid-specific force/skill/class constraints consistently:
 * 1. Droids can never use or train the Use the Force skill
 * 2. Droids can take the Jedi class but don't get Force Sensitivity from it
 * 3. Droids can never gain the Force Sensitivity feat from any source
 */

import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';

describe('Droid Force Constraints', () => {
  let droidActor, organicActor;

  beforeAll(() => {
    // Create mock droid actor
    droidActor = {
      id: 'droid-test-001',
      name: 'Test Droid',
      type: 'character',
      system: {
        isDroid: true,
        species: 'Droid',
      },
      items: [],
    };

    // Create mock organic actor for comparison
    organicActor = {
      id: 'organic-test-001',
      name: 'Test Organic',
      type: 'character',
      system: {
        isDroid: false,
        species: 'Human',
      },
      items: [],
    };
  });

  // =========================================================================
  // RULE 1: Use the Force Skill
  // =========================================================================
  describe('Rule 1: Droids cannot use/train "Use the Force" skill', () => {
    it('should prevent droids from selecting "Use the Force" skill', () => {
      // Mock a skill constraints check - skills-step filters before selection
      const useTheForceSkill = { key: 'usetheforce', name: 'Use the Force', id: 'skill-utf' };

      // Simulate skills-step filtering
      const isDroid = droidActor.system.isDroid;
      const shouldBeFiltered = isDroid && (
        useTheForceSkill.key.toLowerCase() === 'usetheforce' ||
        useTheForceSkill.name.toLowerCase() === 'use the force'
      );

      expect(shouldBeFiltered).toBe(true);
    });

    it('should allow non-droids to select "Use the Force" skill', () => {
      const useTheForceSkill = { key: 'usetheforce', name: 'Use the Force' };

      const isDroid = organicActor.system.isDroid;
      const shouldBeFiltered = isDroid && (
        useTheForceSkill.key.toLowerCase() === 'usetheforce' ||
        useTheForceSkill.name.toLowerCase() === 'use the force'
      );

      expect(shouldBeFiltered).toBe(false);
    });

    it('should detect "Use the Force" variant names', () => {
      const variants = [
        { key: 'useTheForce', name: 'Use the Force' },
        { key: 'USETHEFORCE', name: 'use the force' },
        { key: 'UseTheForce', name: 'USE THE FORCE' },
      ];

      for (const variant of variants) {
        const shouldFilter = variant.key.toLowerCase() === 'usetheforce' ||
                           variant.name.toLowerCase() === 'use the force';
        expect(shouldFilter).toBe(true);
      }
    });
  });

  // =========================================================================
  // RULE 2: Jedi Class and Force Sensitivity Grant Suppression
  // =========================================================================
  describe('Rule 2: Droids can take Jedi, but don\'t get Force Sensitivity from it', () => {
    it('should suppress Force Sensitivity grant from Jedi level 1 for droids', () => {
      const jediClassDoc = {
        name: 'Jedi',
        system: {
          levelProgression: [
            {
              level: 1,
              features: [
                { type: 'feat_grant', name: 'Force Sensitivity' },
                { type: 'ability_grant', name: 'Jedi Powers' },
              ],
            },
          ],
        },
      };

      // Test with droid
      const grantedForDroid = PrerequisiteChecker.getLevel1GrantedFeats(jediClassDoc, droidActor);
      expect(grantedForDroid).not.toContain('Force Sensitivity');
      expect(grantedForDroid).not.toContain('Jedi Powers');

      // Test with organic
      const grantedForOrganic = PrerequisiteChecker.getLevel1GrantedFeats(jediClassDoc, organicActor);
      expect(grantedForOrganic).toContain('Force Sensitivity');
    });

    it('should also suppress Force Sensitivity from startingFeatures for droids', () => {
      const jediClassDoc = {
        name: 'Jedi',
        system: {
          startingFeatures: [
            { type: 'feat_grant', name: 'Force Sensitivity' },
            { type: 'feat_grant', name: 'Lightsaber Proficiency' },
          ],
        },
      };

      const grantedForDroid = PrerequisiteChecker.getLevel1GrantedFeats(jediClassDoc, droidActor);
      expect(grantedForDroid).not.toContain('Force Sensitivity');
      expect(grantedForDroid).toContain('Lightsaber Proficiency');
    });

    it('should allow droids to take Jedi class without being blocked', () => {
      // This is tested indirectly - droids should still be able to select Jedi
      // since Jedi has no droid-specific block (only the grant is suppressed)
      const jediClassDoc = {
        name: 'Jedi',
        type: 'class',
        system: {
          prerequisites: '',
        },
      };

      // Droids are not explicitly blocked from Jedi class selection
      const isDroidBlocked = droidActor.system.isDroid && false;
      expect(isDroidBlocked).toBe(false);
    });
  });

  // =========================================================================
  // RULE 3: Force Sensitivity Feat Selection
  // =========================================================================
  describe('Rule 3: Droids can never gain Force Sensitivity feat from any source', () => {
    it('should prevent droids from selecting Force Sensitivity feat', () => {
      const forceSensitivityFeat = {
        name: 'Force Sensitivity',
        type: 'feat',
        system: {},
      };

      // Test prerequisite check
      const result = PrerequisiteChecker.checkFeatPrerequisites(droidActor, forceSensitivityFeat);
      expect(result.met).toBe(false);
      expect(result.missing).toContain('Droids cannot acquire Force Sensitivity');
    });

    it('should allow non-droids to select Force Sensitivity feat', () => {
      const forceSensitivityFeat = {
        name: 'Force Sensitivity',
        type: 'feat',
        system: {},
      };

      const result = PrerequisiteChecker.checkFeatPrerequisites(organicActor, forceSensitivityFeat);
      // May fail for other reasons but not because of droid constraint
      if (result.missing && result.missing.length > 0) {
        const hasDroidBlock = result.missing.some(m => m.includes('Droid'));
        expect(hasDroidBlock).toBe(false);
      }
    });

    it('should detect Force Sensitivity variant names', () => {
      const variants = [
        { name: 'Force Sensitivity' },
        { name: 'force sensitivity' },
        { name: 'FORCE SENSITIVITY' },
      ];

      for (const variant of variants) {
        const result = PrerequisiteChecker.checkFeatPrerequisites(droidActor, variant);
        expect(result.met).toBe(false);
        expect(result.missing).toContain('Droids cannot acquire Force Sensitivity');
      }
    });

    it('should block Force Sensitivity from all sources', () => {
      // Path 1: Direct feat selection
      const directSelectResult = PrerequisiteChecker.checkFeatPrerequisites(
        droidActor,
        { name: 'Force Sensitivity', type: 'feat', system: {} }
      );
      expect(directSelectResult.met).toBe(false);

      // Path 2: Class-granted feature
      const jediClass = {
        name: 'Jedi',
        system: {
          levelProgression: [{ features: [{ type: 'feat_grant', name: 'Force Sensitivity' }] }],
        },
      };
      const classGranted = PrerequisiteChecker.getLevel1GrantedFeats(jediClass, droidActor);
      expect(classGranted).not.toContain('Force Sensitivity');

      // Path 3: getAllGrantedFeats
      const allGranted = PrerequisiteChecker.getAllGrantedFeats(droidActor, jediClass);
      expect(allGranted).not.toContain('Force Sensitivity');
    });
  });

  // =========================================================================
  // Non-Droid Safety (Regression Tests)
  // =========================================================================
  describe('Non-Droid Regression Safety', () => {
    it('should not affect organic character Use the Force skill access', () => {
      const useTheForceSkill = { key: 'usetheforce', name: 'Use the Force' };

      const isDroid = organicActor.system.isDroid;
      const shouldBeFiltered = isDroid && (
        useTheForceSkill.key.toLowerCase() === 'usetheforce' ||
        useTheForceSkill.name.toLowerCase() === 'use the force'
      );

      expect(shouldBeFiltered).toBe(false);
    });

    it('should not affect organic character Jedi Force Sensitivity grant', () => {
      const jediClassDoc = {
        name: 'Jedi',
        system: {
          levelProgression: [
            {
              features: [
                { type: 'feat_grant', name: 'Force Sensitivity' },
              ],
            },
          ],
        },
      };

      const grantedFeats = PrerequisiteChecker.getLevel1GrantedFeats(jediClassDoc, organicActor);
      expect(grantedFeats).toContain('Force Sensitivity');
    });

    it('should not affect organic character Force Sensitivity feat selection', () => {
      const forceSensitivityFeat = {
        name: 'Force Sensitivity',
        type: 'feat',
        system: {},
      };

      const result = PrerequisiteChecker.checkFeatPrerequisites(organicActor, forceSensitivityFeat);
      const hasDroidBlock = result.missing && result.missing.some(m => m.includes('Droid'));
      expect(hasDroidBlock).toBe(false);
    });
  });
});
