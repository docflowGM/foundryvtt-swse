// scripts/governance/actor-engine/internal/actor-engine-validation.js
// Internal module for validation and normalization
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { MutationInterceptor } from "/systems/foundryvtt-swse/scripts/governance/mutation/MutationInterceptor.js";

/**
 * ValidationEngineModule
 * Handles validation and normalization of mutations
 */
export const ValidationEngineModule = {
  /**
   * PHASE 3: Strict enforcement check for derived writes
   * Validates that writes to system.derived.* only happen during:
   * - DerivedCalculator (marked with _isDerivedCalcCycle = true)
   * - Designated mutation phases with isDerivedCalculatorCall option
   *
   * PHASE 3 HARDENING: In strict mode, throws error. In normal mode, warns only.
   *
   * @param {Object} changes - Update changes to validate
   * @param {Actor} actor - Actor being updated
   * @param {Object} options - Update options
   * @throws {Error} If violation detected in strict mode
   * @private
   */
  _validateDerivedWriteAuthority(changes, actor, options = {}) {
    const derivedPaths = [];

    const checkObject = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (path.startsWith('system.derived.')) {
          derivedPaths.push(path);
        }
        if (typeof value === 'object' && value !== null) {
          checkObject(value, path);
        }
      }
    };

    checkObject(changes);

    // Enforce derived write authority
    if (derivedPaths.length > 0 &&
        !actor._isDerivedCalcCycle &&
        !options.isDerivedCalculatorCall) {
      const violationList = derivedPaths.slice(0, 5).join(', ');
      const enforcementLevel = MutationInterceptor.getEnforcementLevel();
      const message = (
        `[SSOT VIOLATION] Attempted direct write to derived paths: ${violationList}${derivedPaths.length > 5 ? '...' : ''}\n` +
        `Only DerivedCalculator may write system.derived.*\n` +
        `Caller: ${new Error().stack.split('\n')[2]}`
      );

      if (enforcementLevel === 'strict') {
        // PHASE 3: Hard enforcement in strict mode
        throw new Error(message);
      } else {
        // PHASE 3: Warning-only in normal/log-only mode
        SWSELogger.warn(message);
      }
    }
  },

  /**
   * Normalize incoming mutation to canonical contract paths
   * @private
   */
  _normalizeMutationForContract(updateData, actor) {
    if (!updateData || typeof updateData !== 'object') {
      return { normalizedUpdateData: updateData, warnings: [] };
    }

    const warnings = [];
    const normalized = foundry.utils.deepClone(updateData);
    const flat = foundry.utils.flattenObject(normalized);

    // ========================================
    // Normalize Phase 3 domains
    // ========================================

    // 1. Abilities: .value → .base
    const abilityWarnings = this._normalizeAbilityPathsForContract(flat);
    warnings.push(...abilityWarnings);

    // 2. Class: Remove redundant scalar paths
    const classWarnings = this._normalizeClassPathsForContract(flat);
    warnings.push(...classWarnings);

    // 3. Skills: Coerce only touched leaf paths
    const skillWarnings = this._normalizeSkillStructureForContract(flat, actor);
    warnings.push(...skillWarnings);

    // 4. XP: Normalize naming
    const xpWarnings = this._normalizeXpPathsForContract(flat);
    warnings.push(...xpWarnings);

    // Unflatten back to nested form
    const normalizedUpdateData = foundry.utils.expandObject(flat);

    return { normalizedUpdateData, warnings };
  },

  /**
   * Initialize canonical base shapes for domains touched by this mutation.
   *
   * Called AFTER normalization to ensure canonical structure exists before apply.
   * Only initializes required containers for touched domains.
   *
   * @param {Object} updateData - Normalized update data
   * @param {Actor} actor - Target actor
   * @private
   */
  _initializeCanonicalShapesForTouchedDomains(updateData, actor) {
    if (!updateData || typeof updateData !== 'object') return;

    const flat = foundry.utils.flattenObject(updateData);
    const touched = new Set();

    // Detect which domains are being touched
    for (const key of Object.keys(flat)) {
      if (key.startsWith('system.abilities.')) touched.add('abilities');
      if (key.startsWith('system.class')) touched.add('class');
      if (key.startsWith('system.skills.')) touched.add('skills');
      if (key.startsWith('system.xp.') || key.startsWith('system.experience')) touched.add('xp');
      if (key.startsWith('system.hp')) touched.add('hp');
    }

    // Initialize required structures for touched domains
    if (touched.has('abilities')) {
      this._ensureCanonicalAbilityShapes(actor);
    }
    if (touched.has('skills')) {
      this._ensureCanonicalSkillShapes(actor, flat);
    }
    if (touched.has('xp')) {
      this._ensureCanonicalXpShape(actor);
    }
    if (touched.has('hp')) {
      this._ensureCanonicalHpShape(actor);
    }
  },

  /**
   * Validate that normalized mutation plan complies with canonical contract.
   *
   * Checks for coherence issues, conflicting paths, required structures.
   * Warns but does not fail - allows callers to proceed with visibility.
   *
   * @param {Object} updateData - Normalized update data
   * @param {Actor} actor - Target actor
   * @returns {Object} {isValid, warnings}
   * @private
   */
  _validateCanonicalMutationPlan(updateData, actor) {
    if (!updateData || typeof updateData !== 'object') {
      return { isValid: true, warnings: [] };
    }

    const warnings = [];
    const flat = foundry.utils.flattenObject(updateData);

    // Check for conflicting canonical/legacy paths
    if (flat['system.abilities.str.base'] && flat['system.abilities.str.value']) {
      warnings.push('Conflict: both system.abilities.str.base and .value present in mutation');
    }
    if (flat['system.xp.total'] && flat['system.experience']) {
      warnings.push('Conflict: both system.xp.total and system.experience present in mutation');
    }

    // Check for incomplete skill objects being set
    for (const key of Object.keys(flat)) {
      if (key.match(/^system\.skills\.\w+\.\w+$/)) {
        const skillMatch = key.match(/^system\.skills\.(\w+)\.(\w+)$/);
        if (skillMatch) {
          const skillKey = skillMatch[1];
          const propKey = skillMatch[2];
          // If only one property is being set, that's usually ok (partial updates)
          // But warn if it looks like incomplete initialization
          if (!['trained', 'miscMod', 'focused', 'selectedAbility', 'favorite'].includes(propKey)) {
            warnings.push(`Unusual skill property: system.skills.${skillKey}.${propKey}`);
          }
        }
      }
    }

    return { isValid: warnings.length === 0, warnings };
  },

  // ========================================
  // Domain-specific normalization helpers
  // ========================================

  /**
   * Normalize ability paths: .value → .base with warnings
   * @private
   */
  _normalizeAbilityPathsForContract(flat) {
    const warnings = [];
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const toDelete = [];

    for (const key of Object.keys(flat)) {
      const match = key.match(/^system\.abilities\.([a-z]+)\.value$/);
      if (match && abilityKeys.includes(match[1])) {
        const abilityKey = match[1];
        const newPath = `system.abilities.${abilityKey}.base`;

        if (!(newPath in flat)) {
          flat[newPath] = flat[key];
          warnings.push(
            `[NORMALIZE] Deprecated ability path ${key} → ${newPath} ` +
            `(value=${flat[key]})`
          );
        } else {
          warnings.push(
            `[CONFLICT] Both ${key} and ${newPath} present; using .base`
          );
        }
        toDelete.push(key);
      }
    }

    for (const path of toDelete) {
      delete flat[path];
    }

    return warnings;
  },

  /**
   * Normalize class paths: remove redundant scalar paths
   * @private
   */
  _normalizeClassPathsForContract(flat) {
    const warnings = [];

    // If system.className is present without system.class, that's a legacy-only write
    // We'll keep it for now but warn
    if (flat['system.className'] && !flat['system.class']) {
      warnings.push(
        `[LEGACY] system.className write without system.class (deprecated scalar path)`
      );
    }

    if (flat['system.classes'] && !flat['system.class']) {
      warnings.push(
        `[LEGACY] system.classes write without system.class (deprecated array path)`
      );
    }

    return warnings;
  },

  /**
   * Normalize touched skill leaf paths without backfilling untouched properties.
   * @private
   */
  _normalizeSkillStructureForContract(flat, actor) {
    const warnings = [];
    const canonicalProps = new Set(['trained', 'miscMod', 'focused', 'selectedAbility', 'favorite']);

    for (const key of Object.keys(flat)) {
      const match = key.match(/^system\.skills\.(\w+)\.(\w+)$/);
      if (!match) continue;

      const skillKey = match[1];
      const prop = match[2];
      if (!canonicalProps.has(prop)) continue;

      const currentSkill = actor?.system?.skills?.[skillKey] ?? {};

      if (prop === 'miscMod') {
        const coerced = Number(flat[key]);
        const fallback = Number.isFinite(Number(currentSkill.miscMod)) ? Number(currentSkill.miscMod) : 0;
        if (!Number.isFinite(coerced)) {
          warnings.push(
            `[COERCE] Skill ${skillKey}.miscMod invalid (${flat[key]}); preserving current value`
          );
          flat[key] = fallback;
        } else if (typeof flat[key] !== 'number') {
          warnings.push(
            `[COERCE] Skill ${skillKey}.miscMod ${JSON.stringify(flat[key])} -> ${coerced}`
          );
          flat[key] = coerced;
        }
      } else if (prop === 'trained' || prop === 'focused' || prop === 'favorite') {
        if (typeof flat[key] !== 'boolean') {
          const raw = flat[key];
          flat[key] = raw === true || raw === 'true' || raw === 1 || raw === '1' || raw === 'on';
          warnings.push(
            `[COERCE] Skill ${skillKey}.${prop} ${JSON.stringify(raw)} -> ${flat[key]}`
          );
        }
      } else if (prop === 'selectedAbility' && typeof flat[key] !== 'string') {
        const raw = flat[key];
        flat[key] = raw == null ? '' : String(raw);
        warnings.push(
          `[COERCE] Skill ${skillKey}.selectedAbility ${JSON.stringify(raw)} -> ${JSON.stringify(flat[key])}`
        );
      }
    }

    return warnings;
  },

  /**
   * Normalize XP paths: system.experience → system.xp.total
   * @private
   */
  _normalizeXpPathsForContract(flat) {
    const warnings = [];

    if ('system.experience' in flat && !('system.xp.total' in flat)) {
      flat['system.xp.total'] = flat['system.experience'];
      warnings.push(
        `[NORMALIZE] Legacy XP path system.experience → system.xp.total ` +
        `(value=${flat['system.experience']})`
      );
      delete flat['system.experience'];
    } else if ('system.experience' in flat && 'system.xp.total' in flat) {
      warnings.push(
        `[CONFLICT] Both system.experience and system.xp.total present; using xp.total`
      );
      delete flat['system.experience'];
    }

    return warnings;
  },

  // ========================================
  // Canonical shape initialization helpers
  // ========================================

  /**
   * Ensure actor has canonical ability object shapes
   * @private
   */
  _ensureCanonicalAbilityShapes(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.abilities) actor.system.abilities = {};

    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    for (const key of abilityKeys) {
      if (!actor.system.abilities[key]) {
        actor.system.abilities[key] = {
          base: 10,
          racial: 0,
          temp: 0,
          total: 10,
          mod: 0
        };
      } else {
        // Ensure all expected properties exist
        if (actor.system.abilities[key].base === undefined) {
          actor.system.abilities[key].base = actor.system.abilities[key].value || 10;
        }
        if (actor.system.abilities[key].racial === undefined) {
          actor.system.abilities[key].racial = 0;
        }
        if (actor.system.abilities[key].temp === undefined) {
          actor.system.abilities[key].temp = 0;
        }
      }
    }
  },

  /**
   * Ensure touched skills have canonical object shapes
   * @private
   */
  _ensureCanonicalSkillShapes(actor, flatUpdateData) {
    if (!actor.system) actor.system = {};
    if (!actor.system.skills) actor.system.skills = {};

    // Find which skills are being touched
    const skillKeys = new Set();
    for (const key of Object.keys(flatUpdateData)) {
      const match = key.match(/^system\.skills\.(\w+)\./);
      if (match) {
        skillKeys.add(match[1]);
      }
    }

    // Initialize touched skills to canonical shape
    for (const skillKey of skillKeys) {
      if (!actor.system.skills[skillKey]) {
        actor.system.skills[skillKey] = {
          trained: false,
          miscMod: 0,
          focused: false,
          selectedAbility: '',
          favorite: false
        };
      } else {
        // Ensure all properties exist
        if (actor.system.skills[skillKey].trained === undefined) {
          actor.system.skills[skillKey].trained = false;
        }
        if (actor.system.skills[skillKey].miscMod === undefined) {
          actor.system.skills[skillKey].miscMod = 0;
        }
        if (actor.system.skills[skillKey].focused === undefined) {
          actor.system.skills[skillKey].focused = false;
        }
        if (actor.system.skills[skillKey].selectedAbility === undefined) {
          actor.system.skills[skillKey].selectedAbility = '';
        }
      }
    }
  },

  /**
   * Ensure canonical XP object shape
   * @private
   */
  _ensureCanonicalXpShape(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.xp) {
      actor.system.xp = { total: 0 };
    }
    if (actor.system.xp.total === undefined) {
      actor.system.xp.total = 0;
    }
  },

  /**
   * Ensure canonical HP object shape
   * @private
   */
  _ensureCanonicalHpShape(actor) {
    if (!actor.system) actor.system = {};
    if (!actor.system.hp) {
      actor.system.hp = {
        value: 1,
        max: 1,
        temp: 0
      };
    }
    if (actor.system.hp.value === undefined) actor.system.hp.value = 1;
    if (actor.system.hp.max === undefined) actor.system.hp.max = 1;
  },

  /**
   * PHASE 3A: Normalize legacy ability paths to canonical schema.
   * Converts deprecated system.abilities.<key>.value → system.abilities.<key>.base
   * This allows old progression/saved data to work with new schema without immediate migration.
   *
   * @param {Object} updateData - The update data object (may be nested)
   * @private
   */
  _normalizeAbilityPaths(updateData) {
    if (!updateData || typeof updateData !== 'object') return;

    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const flat = foundry.utils.flattenObject(updateData);
    const toDelete = [];

    for (const key of Object.keys(flat)) {
      // Match system.abilities.<key>.value
      const match = key.match(/^system\.abilities\.([a-z]+)\.value$/);
      if (match && abilityKeys.includes(match[1])) {
        const abilityKey = match[1];
        const newPath = `system.abilities.${abilityKey}.base`;

        // Only normalize if the canonical .base path isn't already being set
        if (!(newPath in flat)) {
          flat[newPath] = flat[key];
          SWSELogger.warn(`[ABILITY NORMALIZATION] Converted legacy path ${key} → ${newPath}`, {
            abilityKey,
            value: flat[key]
          });
        }

        toDelete.push(key);
      }
    }

    // Remove legacy paths from update
    for (const path of toDelete) {
      delete flat[path];
    }

    // Unflatten back to nested form if we made changes
    if (toDelete.length > 0) {
      const updated = foundry.utils.expandObject(flat);
      Object.assign(updateData, updated);
    }
  },

  /**
   * PHASE 3D: Normalize legacy XP/experience paths to canonical schema.
   * Converts deprecated system.experience → system.xp.total
   * This allows old progression/saved data to work with new naming without immediate migration.
   *
   * @param {Object} updateData - The update data object (may be nested)
   * @private
   */
  _normalizeXpPaths(updateData) {
    if (!updateData || typeof updateData !== 'object') return;

    const flat = foundry.utils.flattenObject(updateData);
    const toDelete = [];

    // Check for legacy system.experience path
    if ('system.experience' in flat && !('system.xp.total' in flat)) {
      flat['system.xp.total'] = flat['system.experience'];
      SWSELogger.warn(`[XP NORMALIZATION] Converted legacy path system.experience → system.xp.total`, {
        value: flat['system.experience']
      });
      toDelete.push('system.experience');
    }

    // Remove legacy paths from update
    for (const path of toDelete) {
      delete flat[path];
    }

    // Unflatten back to nested form if we made changes
    if (toDelete.length > 0) {
      const updated = foundry.utils.expandObject(flat);
      Object.assign(updateData, updated);
    }
  }
};
