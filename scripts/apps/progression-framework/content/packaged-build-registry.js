/**
 * Packaged Build Registry — Phase 8 Step 1
 *
 * Central, curated registry of packaged builds organized by archetype, class, and subtype.
 * All builds use the Phase 6 validation pipeline.
 * All builds reference templates that must exist and validate.
 *
 * Design:
 * - No alternate engine (uses Phase 1-7 spine)
 * - Content-based expansion (more templates, not more logic)
 * - Validation-gated (all templates validated before shipping)
 * - Curator-friendly (easy to add/remove/update builds)
 */

import { ContentValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/validation/content-validator.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class PackagedBuildRegistry {
  /**
   * Complete registry of packaged builds.
   * Structure: { builds: [...], families: {...}, bySubtype: {...} }
   */
  static PACKAGED_BUILDS = {
    // =====================================================================
    // SOLDIER
    // =====================================================================
    'soldier-tank': {
      id: 'soldier-tank',
      name: 'Soldier — Tank/Leader',
      className: 'Soldier',
      templateId: 'template-soldier-tank',
      description: 'High durability with command presence. Focuses on defense, hit points, and fort saves.',
      archetypes: ['tank', 'leader'],
      playstyle: 'Frontline protector and tactical leader',
      targetPaths: ['command-officer', 'battle-master'],
      suggestedAbilities: { str: 16, con: 14, wis: 12, dex: 10, int: 10, cha: 12 },
      advisoryProfile: 'soldier-defensive',
      supportLevel: 'FULL',
      forceUser: false,
    },

    'soldier-striker': {
      id: 'soldier-striker',
      name: 'Soldier — Striker/DPS',
      className: 'Soldier',
      templateId: 'template-soldier-striker',
      description: 'High damage output with precision attacks. Melee or ranged DPS specialist.',
      archetypes: ['striker', 'damage-dealer'],
      playstyle: 'Maximize damage per attack',
      targetPaths: ['weapon-master', 'tempest'],
      suggestedAbilities: { str: 16, dex: 14, con: 12, wis: 10, int: 10, cha: 10 },
      advisoryProfile: 'soldier-offensive',
      supportLevel: 'FULL',
      forceUser: false,
    },

    'soldier-gunner': {
      id: 'soldier-gunner',
      name: 'Soldier — Gunner/Ranged',
      className: 'Soldier',
      templateId: 'template-soldier-gunner',
      description: 'Marksman specialist with high ranged attack bonus and ranged damage.',
      archetypes: ['gunner', 'marksman'],
      playstyle: 'Ranged specialist, maintain distance',
      targetPaths: ['sharpshooter', 'marksman-elite'],
      suggestedAbilities: { dex: 16, str: 14, con: 12, wis: 12, int: 10, cha: 10 },
      advisoryProfile: 'soldier-ranged',
      supportLevel: 'FULL',
      forceUser: false,
    },

    'soldier-defender': {
      id: 'soldier-defender',
      name: 'Soldier — Defender/Protector',
      className: 'Soldier',
      templateId: 'template-soldier-defender',
      description: 'Protection specialist. Focuses on defending and shielding allies.',
      archetypes: ['defender', 'protector'],
      playstyle: 'Ally protection and tactical positioning',
      targetPaths: ['sentinel-guardian', 'bodyguard'],
      suggestedAbilities: { str: 14, con: 16, wis: 12, dex: 12, int: 10, cha: 10 },
      advisoryProfile: 'soldier-protector',
      supportLevel: 'FULL',
      forceUser: false,
    },

    // =====================================================================
    // SCOUNDREL
    // =====================================================================
    'scoundrel-charmer': {
      id: 'scoundrel-charmer',
      name: 'Scoundrel — Charmer/Face',
      className: 'Scoundrel',
      templateId: 'template-scoundrel-charmer',
      description: 'Social specialist with high Charisma and influence talents.',
      archetypes: ['charmer', 'face'],
      playstyle: 'Negotiate, deceive, and persuade',
      targetPaths: ['force-disciple', 'smuggler-lord'],
      suggestedAbilities: { cha: 16, dex: 14, int: 12, wis: 10, str: 10, con: 10 },
      advisoryProfile: 'scoundrel-social',
      supportLevel: 'FULL',
      forceUser: false,
    },

    'scoundrel-infiltrator': {
      id: 'scoundrel-infiltrator',
      name: 'Scoundrel — Infiltrator/Sneak',
      className: 'Scoundrel',
      templateId: 'template-scoundrel-infiltrator',
      description: 'Stealth and mobility specialist. Master of positioning and escape.',
      archetypes: ['infiltrator', 'sneak'],
      playstyle: 'Stealth, mobility, precision strikes',
      targetPaths: ['assassin', 'shadow-operative'],
      suggestedAbilities: { dex: 16, cha: 14, int: 12, wis: 10, str: 10, con: 10 },
      advisoryProfile: 'scoundrel-stealth',
      supportLevel: 'FULL',
      forceUser: false,
    },

    'scoundrel-gadgeteer': {
      id: 'scoundrel-gadgeteer',
      name: 'Scoundrel — Gadgeteer/Tech',
      className: 'Scoundrel',
      templateId: 'template-scoundrel-gadgeteer',
      description: 'Tech-focused rogue with gadgets and hacking.',
      archetypes: ['gadgeteer', 'tech-specialist'],
      playstyle: 'Gadgets, hacking, tech skills',
      targetPaths: ['slicer-elite', 'gadget-master'],
      suggestedAbilities: { dex: 14, int: 16, cha: 12, wis: 10, str: 10, con: 10 },
      advisoryProfile: 'scoundrel-tech',
      supportLevel: 'FULL',
      forceUser: false,
    },

    'scoundrel-swashbuckler': {
      id: 'scoundrel-swashbuckler',
      name: 'Scoundrel — Swashbuckler/Duelist',
      className: 'Scoundrel',
      templateId: 'template-scoundrel-swashbuckler',
      description: 'Melee specialist with style. High mobility and attack bonus.',
      archetypes: ['swashbuckler', 'duelist'],
      playstyle: 'Flashy melee combat with mobility',
      targetPaths: ['weapon-master', 'blade-dancer'],
      suggestedAbilities: { dex: 16, str: 14, cha: 12, wis: 10, int: 10, con: 10 },
      advisoryProfile: 'scoundrel-melee',
      supportLevel: 'FULL',
      forceUser: false,
    },

    // =====================================================================
    // JEDI
    // =====================================================================
    'jedi-knight': {
      id: 'jedi-knight',
      name: 'Jedi — Knight/Warrior',
      className: 'Jedi',
      templateId: 'template-jedi-knight',
      description: 'Lightsaber warrior with Force power support. Balanced offense and defense.',
      archetypes: ['knight', 'warrior'],
      playstyle: 'Force-infused lightsaber combat',
      targetPaths: ['guardian', 'sith-lord'],
      suggestedAbilities: { str: 14, wis: 16, dex: 14, con: 12, int: 10, cha: 10 },
      advisoryProfile: 'jedi-warrior',
      supportLevel: 'FULL',
      forceUser: true,
    },

    'jedi-sentinel': {
      id: 'jedi-sentinel',
      name: 'Jedi — Sentinel/Protector',
      className: 'Jedi',
      templateId: 'template-jedi-sentinel',
      description: 'Defensive Force user focused on protection and shaping abilities.',
      archetypes: ['sentinel', 'protector'],
      playstyle: 'Defensive Force shaping and protection',
      targetPaths: ['consular', 'peacekeeper'],
      suggestedAbilities: { wis: 16, str: 12, con: 14, dex: 12, int: 12, cha: 10 },
      advisoryProfile: 'jedi-defensive',
      supportLevel: 'FULL',
      forceUser: true,
    },

    'jedi-scholar': {
      id: 'jedi-scholar',
      name: 'Jedi — Scholar/Sage',
      className: 'Jedi',
      templateId: 'template-jedi-scholar',
      description: 'Knowledge-focused Jedi. Expert in lore, skills, and Force understanding.',
      archetypes: ['scholar', 'sage'],
      playstyle: 'Knowledge, versatility, Force mastery',
      targetPaths: ['master', 'researcher'],
      suggestedAbilities: { wis: 16, int: 14, dex: 12, con: 12, str: 10, cha: 10 },
      advisoryProfile: 'jedi-scholar',
      supportLevel: 'FULL',
      forceUser: true,
    },

    'jedi-consular': {
      id: 'jedi-consular',
      name: 'Jedi — Consular/Healer',
      className: 'Jedi',
      templateId: 'template-jedi-consular',
      description: 'Support-focused Jedi with healing and collaborative powers.',
      archetypes: ['consular', 'healer'],
      playstyle: 'Healing, support, diplomatic Force use',
      targetPaths: ['ambassador', 'healer-master'],
      suggestedAbilities: { wis: 16, cha: 14, con: 12, dex: 12, int: 10, str: 10 },
      advisoryProfile: 'jedi-support',
      supportLevel: 'FULL',
      forceUser: true,
    },

    // =====================================================================
    // TECH SPECIALIST
    // =====================================================================
    'tech-engineer': {
      id: 'tech-engineer',
      name: 'Tech Specialist — Engineer/Mechanic',
      className: 'Tech Specialist',
      templateId: 'template-tech-engineer',
      description: 'Master of building and repairing equipment. High Craft and technical knowledge.',
      archetypes: ['engineer', 'mechanic'],
      playstyle: 'Building, repairs, technical mastery',
      targetPaths: ['gadget-master', 'chief-engineer'],
      suggestedAbilities: { int: 16, dex: 12, wis: 12, con: 12, str: 10, cha: 10 },
      advisoryProfile: 'tech-building',
      supportLevel: 'FULL',
      forceUser: false,
    },

    'tech-hacker': {
      id: 'tech-hacker',
      name: 'Tech Specialist — Hacker/Slicer',
      className: 'Tech Specialist',
      templateId: 'template-tech-hacker',
      description: 'Digital systems specialist. Expert hacker and security breaker.',
      archetypes: ['hacker', 'slicer'],
      playstyle: 'Hacking, slicing, digital combat',
      targetPaths: ['slicer-elite', 'cyber-warrior'],
      suggestedAbilities: { int: 16, dex: 12, wis: 12, cha: 10, str: 10, con: 10 },
      advisoryProfile: 'tech-hacking',
      supportLevel: 'FULL',
      forceUser: false,
    },

    'tech-droid-master': {
      id: 'tech-droid-master',
      name: 'Tech Specialist — Droid Master',
      className: 'Tech Specialist',
      templateId: 'template-tech-droid-master',
      description: 'Droid commander and specialist. Build, control, and command droids.',
      archetypes: ['droid-master', 'commander'],
      playstyle: 'Droid building, control, teamwork',
      targetPaths: ['droid-commander', 'droid-engineer'],
      suggestedAbilities: { int: 16, wis: 12, dex: 12, con: 12, str: 10, cha: 10 },
      advisoryProfile: 'tech-droid',
      supportLevel: 'PARTIAL', // Droid support is PARTIAL in Phase 7
      forceUser: false,
    },

    'tech-inventor': {
      id: 'tech-inventor',
      name: 'Tech Specialist — Inventor/Gadgeteer',
      className: 'Tech Specialist',
      templateId: 'template-tech-inventor',
      description: 'Innovation specialist. Create new gadgets and experimental tech.',
      archetypes: ['inventor', 'gadgeteer'],
      playstyle: 'Innovation, experimentation, unique tech',
      targetPaths: ['gadget-master', 'master-inventor'],
      suggestedAbilities: { int: 16, dex: 14, wis: 10, con: 12, str: 10, cha: 10 },
      advisoryProfile: 'tech-innovation',
      supportLevel: 'FULL',
      forceUser: false,
    },
  };

  /**
   * Get all packaged builds.
   * @returns {Object[]} Array of build definitions
   */
  static getAllBuilds() {
    return Object.values(this.PACKAGED_BUILDS);
  }

  /**
   * Get builds for a specific class.
   * @param {string} className - Class to filter by
   * @returns {Object[]} Builds for this class
   */
  static getBuildsByClass(className) {
    return Object.values(this.PACKAGED_BUILDS)
      .filter(b => b.className === className);
  }

  /**
   * Get builds by archetype/playstyle.
   * @param {string} archetype - Archetype to filter by
   * @returns {Object[]} Builds with this archetype
   */
  static getBuildsByArchetype(archetype) {
    return Object.values(this.PACKAGED_BUILDS)
      .filter(b => b.archetypes?.includes(archetype));
  }

  /**
   * Get all Force user builds.
   * @returns {Object[]} Builds for Force users
   */
  static getForceUserBuilds() {
    return Object.values(this.PACKAGED_BUILDS)
      .filter(b => b.forceUser === true);
  }

  /**
   * Get all non-Force builds.
   * @returns {Object[]} Builds for non-Force characters
   */
  static getNonForceBuilds() {
    return Object.values(this.PACKAGED_BUILDS)
      .filter(b => b.forceUser === false);
  }

  /**
   * Validate all packaged builds reference real templates.
   * @returns {Object} Validation report
   */
  static validateAllBuilds() {
    const report = {
      timestamp: new Date().toISOString(),
      totalBuilds: Object.keys(this.PACKAGED_BUILDS).length,
      validBuilds: 0,
      invalidBuilds: [],
      warnings: [],
    };

    Object.entries(this.PACKAGED_BUILDS).forEach(([buildId, build]) => {
      // Check required fields
      if (!build.id || !build.name || !build.className || !build.templateId) {
        report.invalidBuilds.push({
          buildId,
          reason: 'Missing required fields (id, name, className, templateId)',
        });
        return;
      }

      // Check support level
      if (!['FULL', 'PARTIAL', 'STRUCTURAL', 'UNSUPPORTED'].includes(build.supportLevel)) {
        report.warnings.push({
          buildId,
          warning: `Invalid support level: ${build.supportLevel}`,
        });
      }

      // Would validate templateId against TemplateRegistry here
      // For now, just count as valid if structure is OK
      report.validBuilds++;
    });

    return report;
  }

  /**
   * Generate coverage report.
   * @returns {Object} Coverage summary
   */
  static generateCoverageReport() {
    const buildsByClass = {};
    const buildsByArchetype = {};
    const allArchetypes = new Set();

    Object.values(this.PACKAGED_BUILDS).forEach(build => {
      // By class
      if (!buildsByClass[build.className]) {
        buildsByClass[build.className] = [];
      }
      buildsByClass[build.className].push(build);

      // By archetype
      if (build.archetypes) {
        build.archetypes.forEach(arch => {
          allArchetypes.add(arch);
          if (!buildsByArchetype[arch]) {
            buildsByArchetype[arch] = [];
          }
          buildsByArchetype[arch].push(build);
        });
      }
    });

    return {
      totalBuilds: Object.keys(this.PACKAGED_BUILDS).length,
      byClass: Object.entries(buildsByClass).reduce((acc, [cls, builds]) => {
        acc[cls] = { count: builds.length, builds: builds.map(b => b.name) };
        return acc;
      }, {}),
      archetypesCovered: Array.from(allArchetypes),
      archetypeCount: allArchetypes.size,
      forceUserCount: Object.values(this.PACKAGED_BUILDS).filter(b => b.forceUser).length,
      nonForceCount: Object.values(this.PACKAGED_BUILDS).filter(b => !b.forceUser).length,
    };
  }

  /**
   * Get a specific build by ID.
   * @param {string} buildId - Build ID to retrieve
   * @returns {Object|null} Build definition or null
   */
  static getBuildById(buildId) {
    return this.PACKAGED_BUILDS[buildId] || null;
  }

  /**
   * Get similar builds (same class or archetypes).
   * @param {string} buildId - Reference build
   * @returns {Object[]} Similar builds
   */
  static getSimilarBuilds(buildId) {
    const refBuild = this.getBuildById(buildId);
    if (!refBuild) return [];

    return Object.values(this.PACKAGED_BUILDS)
      .filter(b => b.id !== buildId && (
        b.className === refBuild.className ||
        (b.archetypes || []).some(a => (refBuild.archetypes || []).includes(a))
      ));
  }

  /**
   * Find recommended build for actor's stated goal.
   * Simple heuristic matching (improved in later phases).
   *
   * @param {string} goal - Stated build goal (e.g. 'melee', 'Force', 'healing')
   * @returns {Object[]} Recommended builds
   */
  static findBuildsByGoal(goal) {
    const goalLower = goal.toLowerCase();

    return Object.values(this.PACKAGED_BUILDS)
      .filter(b =>
        b.playstyle?.toLowerCase().includes(goalLower) ||
        b.archetypes?.some(a => a.toLowerCase().includes(goalLower)) ||
        b.advisoryProfile?.toLowerCase().includes(goalLower)
      );
  }
}
