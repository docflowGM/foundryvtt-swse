// scripts/governance/mutation/mutation-normalization-service.js
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

/**
 * MutationNormalizationService
 *
 * Pure static service that normalizes an actor update payload to canonical
 * contract paths before it is applied. No actor state is mutated here; no
 * calls to actor.update() are made.
 *
 * Extracted from ActorEngine._normalizeMutationForContract and its five domain
 * helpers as part of refactor C3.2. Behavior is identical to the original.
 */
export class MutationNormalizationService {

  /**
   * Normalize an actor update payload to canonical contract paths.
   *
   * @param {Object} updateData - Raw update payload (flat or nested).
   * @param {Actor}  actor      - Target actor (read-only; used for skill coercion context).
   * @returns {{ normalizedUpdateData: Object, warnings: string[] }}
   */
  static normalizePayload(updateData, actor) {
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
    const abilityWarnings = MutationNormalizationService._normalizeAbilityPaths(flat);
    warnings.push(...abilityWarnings);

    // 2. Class: Remove redundant scalar paths
    const classWarnings = MutationNormalizationService._normalizeClassPaths(flat);
    warnings.push(...classWarnings);

    // 3. Skills: Ensure complete structure
    const skillWarnings = MutationNormalizationService._normalizeSkillStructure(flat, actor);
    warnings.push(...skillWarnings);

    // 4. Defenses: normalize short aliases and legacy misc paths
    const defenseWarnings = MutationNormalizationService._normalizeDefensePaths(flat);
    warnings.push(...defenseWarnings);

    // 5. XP: Normalize naming
    const xpWarnings = MutationNormalizationService._normalizeXpPaths(flat);
    warnings.push(...xpWarnings);

    // Unflatten back to nested form
    const normalizedUpdateData = foundry.utils.expandObject(flat);

    return { normalizedUpdateData, warnings };
  }

  // ========================================
  // Domain normalizers (static, pure)
  // ========================================

  /**
   * Normalize ability paths: system.abilities.[key].value → system.abilities.[key].base
   *
   * @param {Object} flat - Flattened update object (mutated in-place).
   * @returns {string[]} warnings
   * @private
   */
  static _normalizeAbilityPaths(flat) {
    const warnings = [];
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const toDelete = [];

    for (const key of Object.keys(flat)) {
      // Catch both system.abilities.<key>.value and system.attributes.<key>.value
      const match = key.match(/^system\.(?:abilities|attributes)\.([a-z]+)\.value$/);
      if (match && abilityKeys.includes(match[1])) {
        const abilityKey = match[1];
        // Always redirect to canonical system.attributes.<key>.base
        const newPath = `system.attributes.${abilityKey}.base`;

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
  }

  /**
   * Normalize class paths: warn on legacy scalar writes.
   *
   * @param {Object} flat - Flattened update object (not mutated).
   * @returns {string[]} warnings
   * @private
   */
  static _normalizeClassPaths(flat) {
    const warnings = [];

    const hasScalarClass = Object.prototype.hasOwnProperty.call(flat, 'system.class');

    if (Object.prototype.hasOwnProperty.call(flat, 'system.className') && !hasScalarClass) {
      warnings.push(
        `[LEGACY] system.className write without system.class (deprecated scalar path)`
      );
    }

    if (Object.prototype.hasOwnProperty.call(flat, 'system.classes') && !hasScalarClass) {
      warnings.push(
        `[LEGACY] system.classes write without system.class (deprecated array path)`
      );
    }

    return warnings;
  }

  /**
   * Normalize skill structure for live, narrow mutations.
   *
   * IMPORTANT:
   * - Do NOT auto-fill untouched canonical skill properties here.
   * - Live sheet edits frequently mutate only one leaf such as:
   *   system.skills.acrobatics.trained or system.skills.acrobatics.miscMod
   * - Expanding that into a full pseudo-initialization corrupts partial edits
   *   and causes unrelated skill fields to revert or disappear.
   *
   * This helper coerces only the explicitly touched leaf paths.
   * Canonical container initialization is handled separately by
   * _ensureCanonicalSkillShapes() only when an entire skill object is missing.
   *
   * @param {Object} flat  - Flattened update object (mutated in-place).
   * @param {Actor}  actor - Target actor (read-only, for current value fallback).
   * @returns {string[]} warnings
   * @private
   */
  static _normalizeSkillStructure(flat, actor) {
    const warnings = [];
    const canonicalProps = new Set(['trained', 'miscMod', 'focused', 'selectedAbility', 'favorite']);

    for (const key of Object.keys(flat)) {
      const match = key.match(/^system\.skills\.([^.]+)\.([^.]+)$/);
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
        continue;
      }

      if (prop === 'trained' || prop === 'focused' || prop === 'favorite') {
        if (typeof flat[key] !== 'boolean') {
          const raw = flat[key];
          flat[key] = raw === true || raw == 'true' || raw == 1 || raw == '1' || raw === 'on';
          warnings.push(
            `[COERCE] Skill ${skillKey}.${prop} ${JSON.stringify(raw)} -> ${flat[key]}`
          );
        }
        continue;
      }

      if (prop === 'selectedAbility' && typeof flat[key] !== 'string') {
        const raw = flat[key];
        flat[key] = raw == null ? '' : String(raw);
        warnings.push(
          `[COERCE] Skill ${skillKey}.selectedAbility ${JSON.stringify(raw)} -> ${JSON.stringify(flat[key])}`
        );
      }
    }

    return warnings;
  }

  /**
   * Normalize defense paths to canonical schema.
   *
   * Supported legacy aliases:
   * - system.defenses.fort.*   -> system.defenses.fortitude.*
   * - system.defenses.ref.*    -> system.defenses.reflex.*
   * - *.miscMod               -> *.misc.user.extra
   * - system.defenses.reflex.armorBonus -> system.defenses.reflex.armor
   *
   * @param {Object} flat - Flattened update object (mutated in-place).
   * @returns {string[]} warnings
   * @private
   */
  static _normalizeDefensePaths(flat) {
    const warnings = [];
    const aliasMap = {
      fort: 'fortitude',
      ref: 'reflex',
      will: 'will'
    };
    const remaps = [];

    for (const [key, value] of Object.entries(flat)) {
      const match = key.match(/^system\.defenses\.([^.]+)\.(.+)$/);
      if (!match) continue;

      const rawDefenseKey = match[1];
      const remainder = match[2];
      const canonicalDefenseKey = aliasMap[rawDefenseKey] || rawDefenseKey;
      let canonicalRemainder = remainder;

      if (canonicalRemainder === 'miscMod') {
        canonicalRemainder = 'misc.user.extra';
      } else if (canonicalRemainder === 'armorBonus' && canonicalDefenseKey === 'reflex') {
        canonicalRemainder = 'armor';
      }

      const canonicalPath = `system.defenses.${canonicalDefenseKey}.${canonicalRemainder}`;
      if (canonicalPath === key) continue;

      remaps.push([key, canonicalPath, value]);
      warnings.push(`[NORMALIZE] Defense path ${key} -> ${canonicalPath}`);
    }

    for (const [oldPath, newPath, value] of remaps) {
      if (!(newPath in flat)) {
        flat[newPath] = value;
      }
      delete flat[oldPath];
    }

    return warnings;
  }

  /**
   * Normalize XP paths: system.experience → system.xp.total
   *
   * @param {Object} flat - Flattened update object (mutated in-place).
   * @returns {string[]} warnings
   * @private
   */
  static _normalizeXpPaths(flat) {
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
  }
}
