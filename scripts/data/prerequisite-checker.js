// ============================================
// FILE: scripts/data/prerequisite-checker.js
// UNIFIED Prerequisite Validator (v3)
// ============================================
//
// THE CANONICAL PREREQUISITE ENGINE
// This is the ONLY place in the system that answers "is this legal?"
//
// Consolidated from THREE validators:
// - PrerequisiteChecker (prestige classes) ✓
// - PrerequisiteRequirements (features: feats, talents)
// - PrerequisiteValidator (normalized format + legacy strings)
//
// ARCHITECTURE: DUAL-MODE UUID-FIRST RESOLUTION
// ============================================
// Phase 1 (CURRENT): UUID-first resolution with slug/name fallback
// - Structured prerequisites can include {uuid?, slug?, name?}
// - Resolution order: UUID → slug → name (with warnings on fallback)
// - FULLY backward compatible (all existing prerequisites work)
// - No compendium data changes required
// - No breaking changes to schema
//
// Phase 2 (FUTURE): Compendium UUID injection
// - Add UUIDs to prestige-prerequisites.js entries
// - Migrate legacy prerequisites to include UUIDs
//
// Phase 3 (FUTURE): Slug deprecation
// - Slugs become optional when UUIDs universalized
// ============================================
//
// Validates all prerequisite types:
// - Character level, BAB, skills, feats, talents, force powers
// - Force techniques, dark side score, species, droid systems
// - Structured prerequisites (25+ condition types)
// - Normalized format prerequisites
// - Legacy string-based prerequisites (Tier 3 - UNCHANGED)
// - Special conditions and houserule grants
//
// Return format (unified):
// { met: boolean, missing: string[], details: object }
//
// Backward compatibility:
// - Tier 3 (legacy string parsing) completely unchanged
// - Existing slug-based prerequisites work (with fallback warnings)
// - Existing name-based prerequisites work (with fallback warnings)
// - No changes to PRESTIGE_PREREQUISITES schema
// - No compendium file modifications
//
// Backward compatibility aliases:
// - valid: getter returning .met
// - reasons: getter returning .missing
// ============================================

import { PRESTIGE_PREREQUISITES } from './prestige-prerequisites.js';
import { TalentTreeDB } from './talent-tree-db.js';
import { normalizeTalentTreeId } from './talent-tree-normalizer.js';
import { SWSELogger } from '../utils/logger.js';
import { normalizeClassPrerequisites } from '../progression/prerequisites/class-prereq-normalizer.js';
import { ClassesDB } from './classes-db.js';

/**
 * MAIN CLASS: PrerequisiteChecker
 * The unified, canonical prerequisite validator for ALL types of prerequisites.
 */
export class PrerequisiteChecker {
    // ============================================================
    // UUID-FIRST RESOLUTION SYSTEM (Dual-mode, fully backward compatible)
    // ============================================================

    /**
     * Cache for logged resolution warnings to avoid spam.
     * Key: JSON.stringify(prereq), Value: true
     * @private
     */
    static #resolutionWarningCache = new Set();

    /**
     * Log a resolution warning once per unique prerequisite.
     * @private
     */
    static _logResolutionWarning(prereq, type, message) {
        const key = JSON.stringify(prereq);
        if (!this.#resolutionWarningCache.has(key)) {
            this.#resolutionWarningCache.add(key);
            SWSELogger.warn(`[PREREQ-RESOLUTION] ${type} fallback: ${message}`);
        }
    }

    /**
     * UUID-FIRST RESOLUTION for structured prerequisites.
     *
     * Resolution order:
     * 1. UUID (if exists) → resolve via document ID
     * 2. Slug (if exists) → resolve via slug lookup
     * 3. Name (if exists) → resolve via case-insensitive name match
     * 4. No resolution path → return null
     *
     * Identity-based comparison:
     * - Compares via document ID (most reliable)
     * - Only uses name matching as final fallback
     *
     * @param {Object} prereq - Prerequisite object {uuid?, slug?, name}
     * @param {string} itemType - Item type: 'feat', 'talent', 'class', etc.
     * @param {Object} actor - Actor document
     * @param {Object} pending - Pending choices (for chargen)
     * @returns {Object} - {resolved: null|item, via: 'uuid'|'slug'|'name', fallback: boolean}
     * @private
     */
    static _resolvePrerequisiteByUuid(prereq, itemType, actor, pending) {
        // PRIMARY PATH: UUID resolution (most reliable)
        if (prereq.uuid) {
            const actorItem = actor.items?.find(i =>
                i.type === itemType && (
                    i.id === prereq.uuid ||
                    i.flags?.core?.sourceId === prereq.uuid
                )
            );
            if (actorItem) {
                return { resolved: actorItem, via: 'uuid', fallback: false };
            }

            // Check pending items (for chargen)
            if (pending && pending.selectedFeats && itemType === 'feat') {
                const pendingItem = pending.selectedFeats.find(i =>
                    i.uuid === prereq.uuid || i.id === prereq.uuid
                );
                if (pendingItem) {
                    return { resolved: pendingItem, via: 'uuid', fallback: false };
                }
            }
            if (pending && pending.selectedTalents && itemType === 'talent') {
                const pendingItem = pending.selectedTalents.find(i =>
                    i.uuid === prereq.uuid || i.id === prereq.uuid
                );
                if (pendingItem) {
                    return { resolved: pendingItem, via: 'uuid', fallback: false };
                }
            }

            // UUID resolution failed (item deleted from compendium?)
            this._logResolutionWarning(prereq, itemType,
                `UUID ${prereq.uuid} not found, trying slug/name fallback`);
        }

        // SECONDARY PATH: Slug resolution (if uuid unavailable)
        if (prereq.slug) {
            const actorItem = actor.items?.find(i =>
                i.type === itemType && i.system?.slug === prereq.slug
            );
            if (actorItem) {
                this._logResolutionWarning(prereq, itemType,
                    `Slug-based resolution (uuid missing from prerequisite)`);
                return { resolved: actorItem, via: 'slug', fallback: true };
            }
        }

        // TERTIARY PATH: Name resolution (legacy compatibility)
        if (prereq.name) {
            const actorItem = actor.items?.find(i =>
                i.type === itemType && i.name?.toLowerCase() === prereq.name?.toLowerCase()
            );
            if (actorItem) {
                this._logResolutionWarning(prereq, itemType,
                    `Name-based resolution (uuid and slug missing from prerequisite)`);
                return { resolved: actorItem, via: 'name', fallback: true };
            }

            // Check pending items (for chargen)
            if (pending) {
                let pendingArray = [];
                if (itemType === 'feat' && pending.selectedFeats) pendingArray = pending.selectedFeats;
                if (itemType === 'talent' && pending.selectedTalents) pendingArray = pending.selectedTalents;

                const pendingItem = pendingArray.find(i =>
                    i.name?.toLowerCase() === prereq.name?.toLowerCase()
                );
                if (pendingItem) {
                    return { resolved: pendingItem, via: 'name', fallback: true };
                }
            }
        }

        // NO RESOLUTION PATH FOUND
        return { resolved: null, via: null, fallback: false };
    }

    // ============================================================
    // DEFENSIVE LOOKUP HELPERS (v2 ID-first, name-fallback)
    // ============================================================

    /**
     * Find class item on actor by classId or className (defensive).
     * Tries classId first (v2), falls back to name-based lookup (v1 compat).
     * @private
     */
    static _findClassItem(actor, classIdOrName) {
        if (!actor?.items) return null;

        // Try classId lookup first (v2 standard)
        if (classIdOrName && classIdOrName.length === 16) {
            const byId = actor.items.find(i => i.type === 'class' && i.system?.classId === classIdOrName);
            if (byId) return byId;
        }

        // Fallback to name lookup (v1 compat + prestige prereq data format)
        return actor.items.find(i => i.type === 'class' && i.name === classIdOrName);
    }

    /**
     * Check prerequisites for ANY item (feat, talent, class, etc.)
     * Routes to appropriate checker based on type.
     *
     * @param {Object} actor - Actor document (or snapshot for v2)
     * @param {string} type - Item type: 'feat', 'talent', 'class', 'prestige'
     * @param {string} itemId - Item ID or name
     * @param {Object} pending - Pending choices (optional, for chargen)
     * @returns {Object} - { met: boolean, missing: string[], details: object }
     */
    static checkPrerequisites(actor, type, itemId, pending = {}) {
        switch (type) {
            case 'feat':
                return this.checkFeatPrerequisites(actor, itemId, pending);
            case 'talent':
                return this.checkTalentPrerequisites(actor, itemId, pending);
            case 'class':
                return this.checkClassLevelPrerequisites(actor, itemId, pending);
            case 'prestige':
                return this.checkPrestigeClassPrerequisites(actor, itemId, pending);
            default:
                return { met: true, missing: [], details: {} };
        }
    }

    /**
     * Check feat prerequisites (primary entry point for feats).
     * Supports both structured and legacy string formats.
     *
     * @param {Object} actor - Actor document
     * @param {Object|string} feat - Feat document or feat name
     * @param {Object} pending - Pending selections
     * @returns {Object} - { met: boolean, missing: string[], details: object }
     */
    static checkFeatPrerequisites(actor, feat, pending = {}) {
        // Support both document and name
        if (typeof feat === 'string') {
            feat = { name: feat, system: {} };
        }

        const prereqData = feat.system?.prerequisite || feat.system?.prerequisites || '';

        // Try structured format first (if exists)
        if (feat.system?.prerequisitesStructured && Array.isArray(feat.system.prerequisitesStructured)) {
            return this._evaluateStructuredPrerequisites(
                feat.system.prerequisitesStructured,
                actor,
                pending,
                feat.name
            );
        }

        // Try normalized format (from prerequisite-normalizer)
        if (prereqData?.parsed) {
            return this._evaluateNormalizedPrerequisites(
                prereqData.parsed,
                actor,
                pending,
                feat.name
            );
        }

        // Fall back to legacy string parsing
        if (typeof prereqData === 'string' && prereqData.trim()) {
            return this._evaluateLegacyStringPrerequisites(
                prereqData,
                actor,
                pending,
                feat.name,
                'feat'
            );
        }

        // No prerequisites
        return { met: true, missing: [], details: {} };
    }

    /**
     * Check talent prerequisites (primary entry point for talents).
     * Supports both structured and legacy string formats.
     *
     * @param {Object} actor - Actor document
     * @param {Object|string} talent - Talent document or talent name
     * @param {Object} pending - Pending selections
     * @returns {Object} - { met: boolean, missing: string[], details: object }
     */
    static checkTalentPrerequisites(actor, talent, pending = {}) {
        // Support both document and name
        if (typeof talent === 'string') {
            talent = { name: talent, system: {} };
        }

        const prereqData = talent.system?.prerequisites || talent.system?.prerequisitesStructured || '';

        // Try structured format first (if exists)
        if (Array.isArray(talent.system?.prerequisitesStructured)) {
            return this._evaluateStructuredPrerequisites(
                talent.system.prerequisitesStructured,
                actor,
                pending,
                talent.name
            );
        }

        // Try normalized format (from prerequisite-normalizer)
        if (prereqData?.parsed) {
            return this._evaluateNormalizedPrerequisites(
                prereqData.parsed,
                actor,
                pending,
                talent.name
            );
        }

        // Fall back to legacy string parsing
        if (typeof prereqData === 'string' && prereqData.trim()) {
            return this._evaluateLegacyStringPrerequisites(
                prereqData,
                actor,
                pending,
                talent.name,
                'talent'
            );
        }

        // No prerequisites
        return { met: true, missing: [], details: {} };
    }

    /**
     * Check class level prerequisites (any class: base or prestige).
     *
     * @param {Object} actor - Actor document
     * @param {Object|string} classDoc - Class document or class name
     * @param {Object} pending - Pending selections
     * @returns {Object} - { met: boolean, missing: string[], details: object }
     */
    static checkClassLevelPrerequisites(actor, classDoc, pending = {}) {
        // Support both document and name
        if (typeof classDoc === 'string') {
            classDoc = { name: classDoc, system: {} };
        }

        const prereqData = classDoc.system?.prerequisites || '';

        // Try structured format first
        if (Array.isArray(classDoc.system?.prerequisitesStructured)) {
            return this._evaluateStructuredPrerequisites(
                classDoc.system.prerequisitesStructured,
                actor,
                pending,
                classDoc.name
            );
        }

        // Try normalized format
        if (prereqData?.parsed) {
            return this._evaluateNormalizedPrerequisites(
                prereqData.parsed,
                actor,
                pending,
                classDoc.name
            );
        }

        // Fall back to legacy string parsing
        if (typeof prereqData === 'string' && prereqData.trim()) {
            return this._evaluateLegacyStringPrerequisites(
                prereqData,
                actor,
                pending,
                classDoc.name,
                'class'
            );
        }

        // No prerequisites
        return { met: true, missing: [], details: {} };
    }

    /**
     * Check prestige class prerequisites.
     *
     * NORMALIZATION ARCHITECTURE:
     * Prerequisites are defined in prestige-prerequisites.js (authoritative source).
     * For raw class documents, use checkClassDocumentPrerequisites() instead.
     * That method normalizes class docs via class-prereq-normalizer.js before checking.
     *
     * @param {Object} actor - Actor document
     * @param {string} className - Prestige class name
     * @param {Object} pending - Pending selections
     * @returns {Object} - { met: boolean, missing: string[], details: object }
     */
    static checkPrestigeClassPrerequisites(actor, className, pending = {}) {
        const prereqs = PRESTIGE_PREREQUISITES[className];

        if (!prereqs) {
            return { met: true, missing: [], details: {} };
        }

        const missing = [];
        const details = {};

        // Check minimum level
        if (prereqs.minLevel) {
            const level = getTotalLevel(actor);
            details.level = { required: prereqs.minLevel, actual: level };
            if (level < prereqs.minLevel) {
                missing.push(`Minimum level ${prereqs.minLevel} (you are level ${level})`);
            }
        }

        // Check minimum BAB
        if (prereqs.minBAB) {
            const bab = getBaseAttackBonus(actor);
            details.bab = { required: prereqs.minBAB, actual: bab };
            if (bab < prereqs.minBAB) {
                missing.push(`Base Attack Bonus +${prereqs.minBAB} (you have +${bab})`);
            }
        }

        // Check trained skills
        if (prereqs.skills) {
            const skillCheck = checkSkills(actor, prereqs.skills);
            details.skills = skillCheck;
            if (!skillCheck.met) {
                missing.push(`Trained in: ${skillCheck.missing.join(', ')}`);
            }
        }

        // Check feats (all required)
        if (prereqs.feats) {
            const featCheck = checkFeats(actor, prereqs.feats);
            details.feats = featCheck;
            if (!featCheck.met) {
                missing.push(`Feats: ${featCheck.missing.join(', ')}`);
            }
        }

        // Check feats (any one of)
        if (prereqs.featsAny) {
            const featAnyCheck = checkFeatsAny(actor, prereqs.featsAny);
            details.featsAny = featAnyCheck;
            if (!featAnyCheck.met) {
                missing.push(`At least one feat from: ${prereqs.featsAny.join(', ')}`);
            }
        }

        // Check talents
        if (prereqs.talents) {
            const talentCheck = checkTalents(actor, prereqs.talents);
            details.talents = talentCheck;
            if (!talentCheck.met) {
                missing.push(talentCheck.message);
            }
        }

        // Check Force Powers
        if (prereqs.forcePowers) {
            const powerCheck = checkForcePowers(actor, prereqs.forcePowers);
            details.forcePowers = powerCheck;
            if (!powerCheck.met) {
                missing.push(`Force Powers: ${powerCheck.missing.join(', ')}`);
            }
        }

        // Check Force Techniques
        if (prereqs.forceTechniques) {
            const techniqueCheck = checkForceTechniques(actor, prereqs.forceTechniques);
            details.forceTechniques = techniqueCheck;
            if (!techniqueCheck.met) {
                missing.push(`${prereqs.forceTechniques.count} Force Technique(s) (you have ${techniqueCheck.actual})`);
            }
        }

        // Check Dark Side Score
        if (prereqs.darkSideScore) {
            const darkSideCheck = checkDarkSideScore(actor, prereqs.darkSideScore);
            details.darkSideScore = darkSideCheck;
            if (!darkSideCheck.met) {
                missing.push(`Dark Side Score must equal Wisdom score (${darkSideCheck.required} needed, you have ${darkSideCheck.actual})`);
            }
        }

        // Check Species
        if (prereqs.species) {
            const speciesCheck = checkSpecies(actor, prereqs.species);
            details.species = speciesCheck;
            if (!speciesCheck.met) {
                missing.push(`Must be: ${prereqs.species.join(' or ')}`);
            }
        }

        // Check Droid Systems
        if (prereqs.droidSystems) {
            const droidCheck = checkDroidSystems(actor, prereqs.droidSystems);
            details.droidSystems = droidCheck;
            if (!droidCheck.met) {
                missing.push(`Droid Systems: ${droidCheck.missing.join(', ')}`);
            }
        }

        // Special conditions
        if (prereqs.special) {
            details.special = prereqs.special;
        }

        return {
            met: missing.length === 0,
            missing,
            details,
            special: prereqs.special || null
        };
    }

    /**
     * Check prestige class prerequisites from a class document.
     *
     * NORMALIZATION LAYER:
     * This is the entry point for checking class documents.
     * It normalizes raw class data via class-prereq-normalizer.js,
     * ensuring the prerequisite engine never interprets raw data directly.
     *
     * @param {Object} actor - Actor document
     * @param {Object} classDoc - Class document from classes.db
     * @param {Object} pending - Pending selections
     * @returns {Object} - { met: boolean, missing: string[], details: object }
     */
    static checkClassDocumentPrerequisites(actor, classDoc, pending = {}) {
        if (!classDoc || !classDoc.name) {
            return { met: true, missing: [], details: {} };
        }

        // Normalize class document → canonical structure
        const normalized = normalizeClassPrerequisites(classDoc);

        if (!normalized) {
            // Not a prestige class, no prerequisites
            return { met: true, missing: [], details: {} };
        }

        // Check against normalized prerequisites
        // (delegates to checkPrestigeClassPrerequisites with class name)
        return this.checkPrestigeClassPrerequisites(actor, classDoc.name, pending);
    }

    /**
     * Evaluate structured prerequisites (25+ condition types).
     * Merged from prerequisite_engine.js.
     *
     * @private
     */
    static _evaluateStructuredPrerequisites(parsed, actor, pending, nameForError) {
        if (!parsed || parsed.length === 0) {
            return { met: true, missing: [], details: {} };
        }

        const missing = [];
        const details = {};

        for (const prereq of parsed) {
            if (!prereq.type) {continue;}

            const result = this._checkStructuredCondition(prereq, actor, pending);
            if (!result.met) {
                missing.push(result.message);
                details[prereq.type] = result;
            }
        }

        return {
            met: missing.length === 0,
            missing,
            details
        };
    }

    /**
     * Evaluate normalized prerequisites (from prerequisite-normalizer).
     * Merged from prerequisite-validator.js.
     *
     * @private
     */
    static _evaluateNormalizedPrerequisites(parsed, actor, pending, nameForError) {
        if (!parsed || parsed.length === 0) {
            return { met: true, missing: [], details: {} };
        }

        const missing = [];
        const details = {};

        for (const prereq of parsed) {
            const result = this._checkNormalizedCondition(prereq, actor, pending);
            if (!result.met) {
                missing.push(result.message);
                details[prereq.type] = result;
            }
        }

        return {
            met: missing.length === 0,
            missing,
            details
        };
    }

    /**
     * Evaluate legacy string prerequisites with OR/AND logic.
     * Uses robust parser from prerequisite-validator.js.
     *
     * @private
     */
    static _evaluateLegacyStringPrerequisites(prereqString, actor, pending, nameForError, type) {
        if (!prereqString || prereqString.trim() === '' || prereqString === 'null') {
            return { met: true, missing: [], details: {} };
        }

        const missing = [];
        const prereqs = this._parseLegacyPrerequisites(prereqString);

        for (const prereq of prereqs) {
            const result = this._checkLegacyCondition(prereq, actor, pending);
            if (!result.met) {
                missing.push(result.message);
            }
        }

        return {
            met: missing.length === 0,
            missing,
            details: { legacy: true, original: prereqString }
        };
    }

    /**
     * Check a single structured condition (from prerequisite_engine.js).
     * @private
     */
    static _checkStructuredCondition(prereq, actor, pending) {
        const type = prereq.type;

        // Handle all 25+ condition types from prerequisite_engine.js
        switch (type) {
            case 'feat':
                return this._checkFeatCondition(prereq, actor, pending);
            case 'talent':
                return this._checkTalentCondition(prereq, actor, pending);
            case 'talentFromTree':
                return this._checkTalentFromTreeCondition(prereq, actor, pending);
            case 'attribute':
                return this._checkAttributeCondition(prereq, actor, pending);
            case 'skillTrained':
                return this._checkSkillTrainedCondition(prereq, actor, pending);
            case 'bab':
                return this._checkBabCondition(prereq, actor, pending);
            case 'level':
                return this._checkLevelCondition(prereq, actor, pending);
            case 'darkSideScore':
                return this._checkDarkSideCondition(prereq, actor, pending);
            case 'species':
                return this._checkSpeciesCondition(prereq, actor, pending);
            case 'droidDegree':
                return this._checkDroidDegreeCondition(prereq, actor, pending);
            case 'isDroid':
                return this._checkIsDroidCondition(prereq, actor, pending);
            case 'forcePower':
                return this._checkForcePowerCondition(prereq, actor, pending);
            case 'forceTechnique':
                return this._checkForceTechniqueCondition(prereq, actor, pending);
            case 'forceSecret':
                return this._checkForceSecretCondition(prereq, actor, pending);
            case 'weaponProficiency':
                return this._checkWeaponProficiencyCondition(prereq, actor, pending);
            case 'darkSideScoreDynamic':
                return this._checkDarkSideDynamicCondition(prereq, actor, pending);
            case 'non_droid':
                return this._checkNonDroidCondition(prereq, actor, pending);
            case 'species_trait':
                return this._checkSpeciesTraitCondition(prereq, actor, pending);
            case 'weapon_focus':
                return this._checkWeaponFocusCondition(prereq, actor, pending);
            case 'weapon_specialization':
                return this._checkWeaponSpecializationCondition(prereq, actor, pending);
            case 'armor_proficiency':
                return this._checkArmorProficiencyCondition(prereq, actor, pending);
            case 'class_level':
                return this._checkClassLevelCondition(prereq, actor, pending);
            case 'featPattern':
                return this._checkFeatPatternCondition(prereq, actor, pending);
            case 'or':
                return this._checkOrCondition(prereq, actor, pending);
            default:
                return { met: true, message: '' };
        }
    }

    /**
     * Check a single normalized condition (from prerequisite-validator.js).
     * @private
     */
    static _checkNormalizedCondition(prereq, actor, pending) {
        const type = prereq.type;

        switch (type) {
            case 'ability': {
                const ability = actor.system?.attributes?.[prereq.ability]?.total ?? 10;
                const met = ability >= (prereq.minimum ?? 10);
                return {
                    met,
                    message: !met ? `Requires ${prereq.ability.toUpperCase()} ${prereq.minimum} (you have ${ability})` : ''
                };
            }
            case 'bab': {
                const bab = actor.system?.bab?.total ?? actor.system?.bab ?? 0;
                const met = bab >= (prereq.minimum ?? 0);
                return {
                    met,
                    message: !met ? `Requires BAB +${prereq.minimum} (you have +${bab})` : ''
                };
            }
            case 'skill_trained': {
                const trained = actor.system?.skills?.[prereq.skill]?.trained ||
                    (pending.selectedSkills || []).some(s => s.key === prereq.skill);
                return {
                    met: trained,
                    message: !trained ? `Requires training in ${prereq.skill}` : ''
                };
            }
            case 'skill_ranks': {
                const ranks = actor.system?.skills?.[prereq.skill]?.ranks ?? 0;
                const met = ranks >= (prereq.ranks ?? 0);
                return {
                    met,
                    message: !met ? `Requires ${prereq.ranks} ranks in ${prereq.skill} (you have ${ranks})` : ''
                };
            }
            case 'feat': {
                const hasFeat = actor.items?.some(i => i.type === 'feat' && i.name === prereq.name) ||
                    (pending.selectedFeats || []).some(f => f.name === prereq.name) ||
                    (pending.grantedFeats || []).includes(prereq.name) ||
                    this.getHouseruleGrantedFeats().includes(prereq.name);
                return {
                    met: hasFeat,
                    message: !hasFeat ? `Requires the feat ${prereq.name}` : ''
                };
            }
            case 'talent': {
                const hasTalent = actor.items?.some(i => i.type === 'talent' && i.name === prereq.name) ||
                    (pending.selectedTalents || []).some(t => t.name === prereq.name);
                return {
                    met: hasTalent,
                    message: !hasTalent ? `Requires the talent ${prereq.name}` : ''
                };
            }
            case 'force_sensitive': {
                const hasFS = actor.items?.some(i => i.type === 'feat' && i.name === 'Force Sensitivity') ||
                    (pending.selectedFeats || []).some(f => f.name === 'Force Sensitivity') ||
                    (pending.grantedFeats || []).includes('Force Sensitivity') ||
                    this.getHouseruleGrantedFeats().includes('Force Sensitivity');
                return {
                    met: hasFS,
                    message: !hasFS ? `Requires Force Sensitivity` : ''
                };
            }
            case 'force_technique': {
                const known = actor.items?.filter(i => i.type === 'feat' && i.system?.tags?.includes('force_technique')).length ?? 0;
                const met = known >= 1;
                return {
                    met,
                    message: !met ? `Requires knowing a Force Technique` : ''
                };
            }
            case 'force_secret': {
                const known = actor.items?.filter(i => i.type === 'feat' && i.system?.tags?.includes('force_secret')).length ?? 0;
                const met = known >= 1;
                return {
                    met,
                    message: !met ? `Requires knowing a Force Secret` : ''
                };
            }
            case 'class_level': {
                const classItem = this._findClassItem(actor, prereq.className);
                const level = classItem?.system?.level ?? 0;
                const met = level >= (prereq.minimum ?? 1);
                return {
                    met,
                    message: !met ? `Requires ${prereq.className} level ${prereq.minimum} (you have ${level})` : ''
                };
            }
            case 'alignment': {
                const lightSide = actor.system?.force?.lightSideScore ?? 0;
                const darkSide = actor.system?.force?.darkSideScore ?? 0;
                const isDark = prereq.alignment?.includes('Dark');
                const isLight = prereq.alignment?.includes('Light');

                let met = true;
                if (isDark && lightSide > darkSide) {met = false;}
                if (isLight && darkSide > lightSide) {met = false;}

                return {
                    met,
                    message: !met ? `Requires ${prereq.alignment} alignment` : ''
                };
            }
            default:
                return { met: true, message: '' };
        }
    }

    /**
     * Check a single legacy string condition.
     * @private
     */
    static _checkLegacyCondition(prereq, actor, pending) {
        switch (prereq.type) {
            case 'or_group':
                return this._checkOrGroupLegacy(prereq, actor, pending);
            case 'ability':
                return this._checkAbilityLegacy(prereq, actor, pending);
            case 'bab':
                return this._checkBABLegacy(prereq, actor, pending);
            case 'level':
                return this._checkLevelLegacy(prereq, actor, pending);
            case 'class':
                return this._checkClassLevelLegacy(prereq, actor, pending);
            case 'skill':
                return this._checkSkillLegacy(prereq, actor, pending);
            case 'skill_rank':
                return this._checkSkillRankLegacy(prereq, actor, pending);
            case 'force_sensitive':
                return this._checkForceSensitiveLegacy(prereq, actor, pending);
            case 'feat':
                return this._checkFeatLegacy(prereq, actor, pending);
            default:
                return { met: true, message: '' };
        }
    }

    // ============================================================
    // STRUCTURED CONDITION CHECKERS (25+ types)
    // ============================================================

    static _checkFeatCondition(prereq, actor, pending) {
        // UUID-FIRST RESOLUTION: Try UUID → slug → name fallback
        const resolution = this._resolvePrerequisiteByUuid(prereq, 'feat', actor, pending);

        if (resolution.resolved) {
            // Found via UUID/slug/name - use identity-based comparison
            return {
                met: true,
                message: ''
            };
        }

        // Not found by UUID/slug/name - check houserule grants (name-based, expected)
        const hasHouseruleFeat = this.getHouseruleGrantedFeats().some(f =>
            f.toLowerCase() === prereq.name?.toLowerCase()
        );

        if (hasHouseruleFeat) {
            return {
                met: true,
                message: ''
            };
        }

        // Not found anywhere
        return {
            met: false,
            message: `Requires feat: ${prereq.name || prereq.slug || prereq.uuid}`
        };
    }

    static _checkTalentCondition(prereq, actor, pending) {
        // UUID-FIRST RESOLUTION: Try UUID → slug → name fallback
        const resolution = this._resolvePrerequisiteByUuid(prereq, 'talent', actor, pending);

        if (resolution.resolved) {
            // Found via UUID/slug/name - use identity-based comparison
            return {
                met: true,
                message: ''
            };
        }

        // Not found anywhere
        return {
            met: false,
            message: `Requires talent: ${prereq.name || prereq.slug || prereq.uuid}`
        };
    }

    static _checkTalentFromTreeCondition(prereq, actor, pending) {
        const allTalents = [
            ...actor.items?.filter(i => i.type === 'talent') || [],
            ...(pending.selectedTalents || [])
        ];

        const matchingTalents = allTalents.filter(t => {
            const treeName = t.system?.talentTree || t.system?.talent_tree;
            if (!treeName) {return false;}
            const normalized = normalizeTalentTreeId(treeName);
            const required = normalizeTalentTreeId(prereq.tree);
            return normalized === required;
        });

        const required = prereq.count || 1;
        const actual = matchingTalents.length;
        const met = actual >= required;

        return {
            met,
            message: !met ? `Requires ${required} talent(s) from ${prereq.tree} (you have ${actual})` : ''
        };
    }

    static _checkAttributeCondition(prereq, actor, pending) {
        const ability = actor.system?.attributes?.[prereq.ability]?.total ?? 10;
        const required = prereq.minimum ?? 10;
        const met = ability >= required;
        return {
            met,
            message: !met ? `Requires ${prereq.ability} ${required} (you have ${ability})` : ''
        };
    }

    static _checkSkillTrainedCondition(prereq, actor, pending) {
        const trained = actor.system?.skills?.[prereq.skill]?.trained ||
            (pending.selectedSkills || []).some(s => s.key === prereq.skill);
        return {
            met: trained,
            message: !trained ? `Requires training in ${prereq.skill}` : ''
        };
    }

    static _checkBabCondition(prereq, actor, pending) {
        const bab = actor.system?.bab ?? 0;
        const required = prereq.minimum ?? 0;
        const met = bab >= required;
        return {
            met,
            message: !met ? `Requires BAB +${required} (you have +${bab})` : ''
        };
    }

    static _checkLevelCondition(prereq, actor, pending) {
        const level = actor.system?.level ?? 1;
        const required = prereq.minimum ?? 1;
        const met = level >= required;
        return {
            met,
            message: !met ? `Requires character level ${required} (you are level ${level})` : ''
        };
    }

    static _checkDarkSideCondition(prereq, actor, pending) {
        const darkSide = actor.system?.force?.darkSideScore ?? 0;
        const required = prereq.minimum ?? 0;
        const met = darkSide >= required;
        return {
            met,
            message: !met ? `Requires Dark Side Score ${required} (you have ${darkSide})` : ''
        };
    }

    static _checkSpeciesCondition(prereq, actor, pending) {
        const species = actor.system?.species || actor.system?.race || '';
        const allowed = prereq.species || [prereq.name];
        const met = allowed.some(s => s.toLowerCase() === species.toLowerCase());
        return {
            met,
            message: !met ? `Requires species: ${allowed.join(' or ')}` : ''
        };
    }

    static _checkDroidDegreeCondition(prereq, actor, pending) {
        const droidDegree = actor.system?.droidDegree ?? 0;
        const required = prereq.minimum ?? 1;
        const met = droidDegree >= required;
        return {
            met,
            message: !met ? `Requires Droid Degree ${required}` : ''
        };
    }

    static _checkIsDroidCondition(prereq, actor, pending) {
        const isDroid = actor.system?.type === 'droid' || actor.type === 'droid';
        return {
            met: isDroid,
            message: !isDroid ? `Requires being a Droid` : ''
        };
    }

    static _checkForcePowerCondition(prereq, actor, pending) {
        const hasPower = actor.items?.some(i =>
            (i.type === 'forcepower' || i.type === 'force-power') && i.name === prereq.name
        );
        return {
            met: hasPower,
            message: !hasPower ? `Requires Force Power: ${prereq.name}` : ''
        };
    }

    static _checkForceTechniqueCondition(prereq, actor, pending) {
        const hasTechnique = actor.items?.some(i =>
            (i.type === 'forcetechnique' || i.type === 'force-technique') && i.name === prereq.name
        );
        return {
            met: hasTechnique,
            message: !hasTechnique ? `Requires Force Technique: ${prereq.name}` : ''
        };
    }

    static _checkForceSecretCondition(prereq, actor, pending) {
        const hasSecret = actor.items?.some(i =>
            i.type === 'feat' && i.system?.tags?.includes('force_secret') && i.name === prereq.name
        );
        return {
            met: hasSecret,
            message: !hasSecret ? `Requires Force Secret: ${prereq.name}` : ''
        };
    }

    static _checkWeaponProficiencyCondition(prereq, actor, pending) {
        const proficiencies = actor.system?.weaponProficiencies || [];
        const hasProficiency = proficiencies.includes(prereq.weapon);
        return {
            met: hasProficiency,
            message: !hasProficiency ? `Requires proficiency with ${prereq.weapon}` : ''
        };
    }

    static _checkDarkSideDynamicCondition(prereq, actor, pending) {
        const darkSide = actor.system?.force?.darkSideScore ?? 0;
        const wisdom = actor.system?.attributes?.wis?.total ?? 10;
        const met = darkSide >= wisdom;
        return {
            met,
            message: !met ? `Dark Side Score must be at least Wisdom (${wisdom})` : ''
        };
    }

    static _checkNonDroidCondition(prereq, actor, pending) {
        const isDroid = actor.system?.type === 'droid' || actor.type === 'droid';
        return {
            met: !isDroid,
            message: isDroid ? `Cannot be a Droid` : ''
        };
    }

    static _checkSpeciesTraitCondition(prereq, actor, pending) {
        const traits = actor.system?.speciesTraits || [];
        const hasTrait = traits.includes(prereq.trait);
        return {
            met: hasTrait,
            message: !hasTrait ? `Requires species trait: ${prereq.trait}` : ''
        };
    }

    static _checkWeaponFocusCondition(prereq, actor, pending) {
        const focuses = actor.items?.filter(i => i.type === 'feat' && i.name === 'Weapon Focus') || [];
        const hasFocus = focuses.some(f => f.system?.weaponType === prereq.weapon);
        return {
            met: hasFocus,
            message: !hasFocus ? `Requires Weapon Focus (${prereq.weapon})` : ''
        };
    }

    static _checkWeaponSpecializationCondition(prereq, actor, pending) {
        const specs = actor.items?.filter(i => i.type === 'feat' && i.name === 'Weapon Specialization') || [];
        const hasSpec = specs.some(f => f.system?.weaponType === prereq.weapon);
        return {
            met: hasSpec,
            message: !hasSpec ? `Requires Weapon Specialization (${prereq.weapon})` : ''
        };
    }

    static _checkArmorProficiencyCondition(prereq, actor, pending) {
        const proficiencies = actor.system?.armorProficiencies || [];
        const hasProficiency = proficiencies.includes(prereq.armor);
        return {
            met: hasProficiency,
            message: !hasProficiency ? `Requires proficiency with ${prereq.armor}` : ''
        };
    }

    static _checkClassLevelCondition(prereq, actor, pending) {
        const classItem = this._findClassItem(actor, prereq.className);
        const level = classItem?.system?.level ?? 0;
        const required = prereq.minimum ?? 1;
        const met = level >= required;
        return {
            met,
            message: !met ? `Requires ${prereq.className} level ${required} (you have ${level})` : ''
        };
    }

    static _checkFeatPatternCondition(prereq, actor, pending) {
        const pattern = new RegExp(prereq.pattern, 'i');
        const matchingFeats = actor.items?.filter(i => i.type === 'feat' && pattern.test(i.name)) || [];
        const required = prereq.count ?? 1;
        const actual = matchingFeats.length;
        const met = actual >= required;
        return {
            met,
            message: !met ? `Requires ${required} feat(s) matching ${prereq.pattern} (you have ${actual})` : ''
        };
    }

    static _checkOrCondition(prereq, actor, pending) {
        const conditions = prereq.conditions || [];
        for (const cond of conditions) {
            const result = this._checkStructuredCondition(cond, actor, pending);
            if (result.met) {return { met: true, message: '' };}
        }
        return {
            met: false,
            message: `Requires one of: ${conditions.map(c => c.name || c.type).join(', ')}`
        };
    }

    // ============================================================
    // LEGACY STRING PARSING & CHECKING
    // ============================================================

    static _parseLegacyPrerequisites(prereqString) {
        const prereqs = [];

        // FIX MEDIUM #2: Normalize whitespace before parsing
        // Collapse multiple spaces to single space for consistent parsing
        const normalized = prereqString.replace(/\s+/g, ' ');

        // Check for OR logic (case-insensitive, handles multiple spaces)
        const hasOr = /\s+or\s+/i.test(normalized);

        if (hasOr) {
            const orGroups = normalized.split(/\s+or\s+/i).map(p => p.trim()).filter(p => p);
            const parsedGroups = orGroups.map(group => {
                // Handle AND/comma/semicolon separation (with normalized whitespace)
                const andParts = group.split(/[,;]|\s+and\s+/i).map(p => p.trim()).filter(p => p);
                return andParts.map(part => this._parseLegacyPrerequisitePart(part)).filter(p => p);
            });
            return [{ type: 'or_group', groups: parsedGroups }];
        } else {
            // Handle AND/comma/semicolon separation (with normalized whitespace)
            const parts = normalized.split(/[,;]|\s+and\s+/i).map(p => p.trim()).filter(p => p);
            for (const part of parts) {
                const prereq = this._parseLegacyPrerequisitePart(part);
                if (prereq) {prereqs.push(prereq);}
            }
            return prereqs;
        }
    }

    static _parseLegacyPrerequisitePart(part) {
        part = part.trim();

        // Ability pattern: "Dex 13", "Strength 15+"
        const abilityPattern = /^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\s+(\d+)/i;
        const abilityMatch = part.match(abilityPattern);
        if (abilityMatch) {
            const abilityMap = {
                'str': 'str', 'strength': 'str',
                'dex': 'dex', 'dexterity': 'dex',
                'con': 'con', 'constitution': 'con',
                'int': 'int', 'intelligence': 'int',
                'wis': 'wis', 'wisdom': 'wis',
                'cha': 'cha', 'charisma': 'cha'
            };
            return {
                type: 'ability',
                ability: abilityMap[abilityMatch[1].toLowerCase()],
                value: parseInt(abilityMatch[2], 10)
            };
        }

        // BAB pattern
        const babPattern = /(?:bab|base attack bonus)\s*\+?\s*(\d+)|(\d+)\s*(?:bab|base attack bonus)/i;
        const babMatch = part.match(babPattern);
        if (babMatch) {
            return {
                type: 'bab',
                value: parseInt(babMatch[1] || babMatch[2], 10)
            };
        }

        // Character level pattern
        const levelPattern = /(?:character\s+)?level\s+(\d+)|(\d+)(?:st|nd|rd|th)?\s+level/i;
        const levelMatch = part.match(levelPattern);
        if (levelMatch) {
            return {
                type: 'level',
                value: parseInt(levelMatch[1] || levelMatch[2], 10)
            };
        }

        // Class level pattern (FIX #1: Use PRESTIGE_PREREQUISITES as dynamic source of truth)
        const classLevelPattern = /^([A-Za-z\s]+?)\s+(?:level\s+)?(\d+)$/i;
        const classLevelMatch = part.match(classLevelPattern);
        if (classLevelMatch) {
            const className = classLevelMatch[1].trim();

            // FIX #1: CRITICAL - Use PRESTIGE_PREREQUISITES as dynamic lookup instead of hardcoded array
            // This ensures all 32 prestige classes (not just 16) are supported without maintenance
            const isPrestigeClass = className in PRESTIGE_PREREQUISITES;

            // Also check base classes (these are base classes, not prestige, but can appear in legacy strings)
            const baseClasses = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier', 'Beast', 'Officer'];
            const isBaseClass = baseClasses.some(c => c.toLowerCase() === className.toLowerCase());

            if (isPrestigeClass || isBaseClass) {
                return {
                    type: 'class',
                    className: className,
                    level: parseInt(classLevelMatch[2], 10)
                };
            } else {
                // FIX #2: Report unrecognized class names instead of silent failure
                SWSELogger.warn(`[CHARGEN PREREQ] Unrecognized class in legacy prerequisite: "${className}". ` +
                    `This will be parsed as a feat requirement. Available prestige classes: ` +
                    `${Object.keys(PRESTIGE_PREREQUISITES).join(', ')}`);
            }
        }

        // Skill rank pattern
        const skillRankPattern = /^(.+?)\s+(\d+)\s+ranks?$/i;
        const skillRankMatch = part.match(skillRankPattern);
        if (skillRankMatch) {
            return {
                type: 'skill_rank',
                skillName: skillRankMatch[1].trim(),
                ranks: parseInt(skillRankMatch[2], 10)
            };
        }

        // Skill training pattern
        const skillPattern = /trained\s+in\s+(.+)/i;
        const skillMatch = part.match(skillPattern);
        if (skillMatch) {
            return {
                type: 'skill',
                skillName: skillMatch[1].trim()
            };
        }

        // Force Sensitive
        if (part.toLowerCase().includes('force sensitive') || part.toLowerCase().includes('force sensitivity')) {
            return { type: 'force_sensitive' };
        }

        // FIX #2: Report unrecognized patterns instead of silently parsing as feat names
        // This helps DMs catch malformed prerequisite data
        SWSELogger.warn(`[CHARGEN PREREQ] Unrecognized prerequisite pattern: "${part}". ` +
            `Parsing as feat requirement, but this may indicate a typo or malformed prerequisite.`);

        // Default: feat name (last resort fallback)
        return { type: 'feat', featName: part };
    }

    static _checkOrGroupLegacy(prereq, actor, pending) {
        const validGroups = [];
        for (const group of prereq.groups) {
            const groupResults = group.map(p => this._checkLegacyCondition(p, actor, pending));
            if (groupResults.every(r => r.met)) {
                validGroups.push(group);
            }
        }
        return {
            met: validGroups.length > 0,
            message: validGroups.length === 0 ? `Requires one of the prerequisite groups` : ''
        };
    }

    static _checkAbilityLegacy(prereq, actor, pending) {
        const ability = actor.system?.attributes?.[prereq.ability]?.total ?? 10;
        const met = ability >= prereq.value;
        return {
            met,
            message: !met ? `Requires ${prereq.ability.toUpperCase()} ${prereq.value} (you have ${ability})` : ''
        };
    }

    static _checkBABLegacy(prereq, actor, pending) {
        const bab = actor.system?.bab ?? 0;
        const met = bab >= prereq.value;
        return {
            met,
            message: !met ? `Requires BAB +${prereq.value} (you have +${bab})` : ''
        };
    }

    static _checkLevelLegacy(prereq, actor, pending) {
        const level = actor.system?.level ?? 1;
        const met = level >= prereq.value;
        return {
            met,
            message: !met ? `Requires character level ${prereq.value} (you are level ${level})` : ''
        };
    }

    static _checkClassLevelLegacy(prereq, actor, pending) {
        const classItem = this._findClassItem(actor, prereq.className);
        const level = classItem?.system?.level ?? 0;
        const met = level >= prereq.level;
        return {
            met,
            message: !met ? `Requires ${prereq.className} level ${prereq.level} (you have ${level})` : ''
        };
    }

    static _checkSkillLegacy(prereq, actor, pending) {
        const skillMap = {
            'acrobatics': 'acrobatics', 'climb': 'climb', 'deception': 'deception',
            'endurance': 'endurance', 'gather information': 'gatherInformation',
            'initiative': 'initiative', 'jump': 'jump', 'knowledge': 'knowledge',
            'mechanics': 'mechanics', 'perception': 'perception', 'persuasion': 'persuasion',
            'pilot': 'pilot', 'ride': 'ride', 'stealth': 'stealth', 'survival': 'survival',
            'swim': 'swim', 'treat injury': 'treatInjury', 'use computer': 'useComputer',
            'use the force': 'useTheForce'
        };
        const skillKey = skillMap[prereq.skillName?.toLowerCase()];
        if (!skillKey) {return { met: true, message: '' };}

        const isTrained = actor.system?.skills?.[skillKey]?.trained || false;
        const isPending = (pending.selectedSkills || []).some(s => s.key === skillKey);
        const met = isTrained || isPending;
        return {
            met,
            message: !met ? `Requires training in ${prereq.skillName}` : ''
        };
    }

    static _checkSkillRankLegacy(prereq, actor, pending) {
        const skillMap = {
            'acrobatics': 'acrobatics', 'climb': 'climb', 'deception': 'deception',
            'endurance': 'endurance', 'gather information': 'gatherInformation',
            'initiative': 'initiative', 'jump': 'jump', 'knowledge': 'knowledge',
            'mechanics': 'mechanics', 'perception': 'perception', 'persuasion': 'persuasion',
            'pilot': 'pilot', 'ride': 'ride', 'stealth': 'stealth', 'survival': 'survival',
            'swim': 'swim', 'treat injury': 'treatInjury', 'use computer': 'useComputer',
            'use the force': 'useTheForce'
        };
        const skillKey = skillMap[prereq.skillName?.toLowerCase()];
        if (!skillKey) {return { met: true, message: '' };}

        const currentRanks = actor.system?.skills?.[skillKey]?.ranks ?? 0;
        const pendingRanks = pending.skillRanks?.[skillKey] ?? 0;
        const totalRanks = currentRanks + pendingRanks;
        const met = totalRanks >= prereq.ranks;
        return {
            met,
            message: !met ? `Requires ${prereq.ranks} ranks in ${prereq.skillName} (you have ${totalRanks})` : ''
        };
    }

    static _checkForceSensitiveLegacy(prereq, actor, pending) {
        const hasForceSensitivityFeat = actor.items?.some(i =>
            i.type === 'feat' && i.name.toLowerCase().includes('force sensitivity')
        );
        const hasForceSensitiveClass = actor.items?.some(i =>
            i.type === 'class' && i.system?.forceSensitive === true
        );
        const pendingClass = pending.selectedClass;
        const pendingForceSensitive = pendingClass?.system?.forceSensitive === true;
        const pendingFeats = pending.selectedFeats || [];
        const pendingForceSensitivityFeat = pendingFeats.some(f =>
            f.name?.toLowerCase().includes('force sensitivity')
        );
        const met = hasForceSensitivityFeat || hasForceSensitiveClass || pendingForceSensitive || pendingForceSensitivityFeat;
        return {
            met,
            message: !met ? `Requires Force Sensitivity` : ''
        };
    }

    static _checkFeatLegacy(prereq, actor, pending) {
        const hasFeat = actor.items?.some(i =>
            i.type === 'feat' && i.name.toLowerCase() === prereq.featName.toLowerCase()
        );
        const hasPending = (pending.selectedFeats || []).some(f =>
            f?.name && f.name.toLowerCase() === prereq.featName.toLowerCase()
        );
        const met = hasFeat || hasPending;
        return {
            met,
            message: !met ? `Requires feat: ${prereq.featName}` : ''
        };
    }

    // ============================================================
    // HELPER METHODS (houserules, filters, etc.)
    // ============================================================

    /**
     * Get all feats granted by houserules.
     */
    static getHouseruleGrantedFeats() {
        const grantedFeats = [];
        const settings = [
            { setting: 'weaponFinesseDefault', name: 'Weapon Finesse' },
            { setting: 'pointBlankShotDefault', name: 'Point Blank Shot' },
            { setting: 'powerAttackDefault', name: 'Power Attack' },
            { setting: 'preciseShotDefault', name: 'Precise Shot' },
            { setting: 'dodgeDefault', name: 'Dodge' }
        ];

        for (const { setting, name } of settings) {
            if (typeof game !== 'undefined' && game.settings.get('foundryvtt-swse', setting)) {
                grantedFeats.push(name);
            }
        }

        if (typeof game !== 'undefined' && game.settings.get('foundryvtt-swse', 'armoredDefenseForAll')) {
            grantedFeats.push('Armored Defense');
        }

        return grantedFeats;
    }

    /**
     * Filter feats to only those an actor qualifies for.
     */
    static filterQualifiedFeats(feats, actor, pending = {}) {
        return feats.map(feat => {
            const check = this.checkFeatPrerequisites(actor, feat, pending);
            return {
                ...feat,
                isQualified: check.met,
                prerequisiteReasons: check.missing
            };
        });
    }

    /**
     * Filter talents to only those an actor qualifies for.
     */
    static filterQualifiedTalents(talents, actor, pending = {}) {
        return talents.map(talent => {
            const check = this.checkTalentPrerequisites(actor, talent, pending);
            return {
                ...talent,
                isQualified: check.met,
                prerequisiteReasons: check.missing
            };
        });
    }

    /**
     * Get feats/talents granted by a class at Level 1.
     */
    static getLevel1GrantedFeats(classDoc) {
        const granted = [];
        if (!classDoc?.system) {return granted;}

        const levelProgression = classDoc.system.levelProgression || [];
        if (levelProgression.length > 0) {
            const level1Features = levelProgression[0].features || [];
            for (const feature of level1Features) {
                if (feature.type === 'feat_grant' && feature.name) {
                    granted.push(feature.name);
                }
            }
        }

        const startingFeatures = classDoc.system.startingFeatures || [];
        for (const feature of startingFeatures) {
            if (feature.type === 'feat_grant' && feature.name) {
                granted.push(feature.name);
            }
        }

        return granted;
    }

    /**
     * Get all feats granted to a character (houserules + level 1 class grants).
     */
    static getAllGrantedFeats(actor, classDoc = null) {
        const granted = new Set();

        const houseruleFeats = this.getHouseruleGrantedFeats();
        houseruleFeats.forEach(f => granted.add(f));

        if (classDoc) {
            const level1Feats = this.getLevel1GrantedFeats(classDoc);
            level1Feats.forEach(f => granted.add(f));
        }

        return Array.from(granted);
    }

    /**
     * Get available prestige classes (legacy, for backward compatibility).
     */
    static getAvailablePrestigeClasses(actor) {
        const results = [];
        for (const className of Object.keys(PRESTIGE_PREREQUISITES)) {
            const check = this.checkPrestigeClassPrerequisites(actor, className);
            results.push({ className, ...check });
        }
        return results;
    }

    /**
     * Get only prestige classes that the actor qualifies for (legacy).
     */
    static getQualifiedPrestigeClasses(actor) {
        return this.getAvailablePrestigeClasses(actor)
            .filter(result => result.met)
            .map(result => result.className);
    }

    /**
     * Get unmet requirements for any item (feat, talent, class, etc).
     * Helper method for suggestion engines and pathway analysis.
     *
     * @param {Object} actor - Actor document
     * @param {Object} doc - Item document (feat, talent, class, etc.)
     * @param {Object} pending - Pending selections (optional)
     * @returns {Array<string>} Array of unmet requirement strings
     */
    static getUnmetRequirements(actor, doc, pending = {}) {
        if (!doc) {return [];}

        // Detect item type and use appropriate checker
        const type = doc.type || '';
        let result = { missing: [] };

        if (type === 'feat') {
            result = this.checkFeatPrerequisites(actor, doc, pending);
        } else if (type === 'talent') {
            result = this.checkTalentPrerequisites(actor, doc, pending);
        } else if (type === 'class') {
            result = this.checkClassLevelPrerequisites(actor, doc, pending);
        } else {
            // Fallback: try as feat first, then talent
            result = this.checkFeatPrerequisites(actor, doc, pending);
            if (result.met) {return [];}
            result = this.checkTalentPrerequisites(actor, doc, pending);
        }

        return result.missing || [];
    }
}

/**
 * LEGACY EXPORT: checkPrerequisites function for backward compatibility.
 * Routes to PrerequisiteChecker.checkPrestigeClassPrerequisites
 */
export function checkPrerequisites(actor, className) {
    return PrerequisiteChecker.checkPrestigeClassPrerequisites(actor, className);
}

/**
 * Get total character level.
 */
function getTotalLevel(actor) {
    if (!actor) {return 0;}

    // v2 Architecture: Trust system.level as source of truth
    // This field is maintained by ActorProgressionUpdater.finalize()
    return actor.system?.level ?? 1;
}

/**
 * Get Base Attack Bonus.
 * v2 Architecture: Trusts progression-owned BAB from system.bab
 */
function getBaseAttackBonus(actor) {
    if (!actor) {return 0;}

    // v2 Architecture: Trust system.bab as source of truth
    // This field is maintained by ActorProgressionUpdater.finalize()
    return actor.system?.bab ?? 0;
}

/**
 * Check if actor has all required trained skills.
 */
function checkSkills(actor, requiredSkills) {
    if (!actor || !requiredSkills || requiredSkills.length === 0) {
        return { met: true, missing: [] };
    }

    const trainedSkills = getTrainedSkills(actor);
    const missing = [];

    for (const skill of requiredSkills) {
        const normalizedSkill = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = trainedSkills.some(s =>
            s.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSkill
        );

        if (!found) {
            missing.push(skill);
        }
    }

    return { met: missing.length === 0, missing };
}

/**
 * Get list of trained skills from actor.
 * Includes both finalized skills (actor.system.skills) and pending skills (actor.system.progression.trainedSkills)
 * This allows prerequisite checking during progression before updates are applied.
 */
function getTrainedSkills(actor) {
    if (!actor) {return [];}

    const skills = [];

    // Check actor.system.skills (finalized skills)
    if (actor.system?.skills) {
        for (const [skillKey, skillData] of Object.entries(actor.system.skills)) {
            if (skillData?.trained || skillData?.rank > 0) {
                skills.push(skillKey);
            }
        }
    }

    // Check pending progression.trainedSkills (from chargen/levelup)
    if (actor.system?.progression?.trainedSkills && Array.isArray(actor.system.progression.trainedSkills)) {
        skills.push(...actor.system.progression.trainedSkills);
    }

    // Check skill items
    const skillItems = actor.items?.filter(i => i.type === 'skill') || [];
    for (const skill of skillItems) {
        if (skill.system?.trained || skill.system?.rank > 0) {
            skills.push(skill.name);
        }
    }

    return skills;
}

/**
 * Check if actor has all required feats.
 * Supports both feat names/IDs and flag-based checks (e.g., { flag: "martialArtsFeat" }).
 */
function checkFeats(actor, requiredFeats) {
    if (!actor || !requiredFeats || requiredFeats.length === 0) {
        return { met: true, missing: [] };
    }

    const actorFeats = getActorFeats(actor);
    const missing = [];

    for (const feat of requiredFeats) {
        // Handle flag-based checks
        if (typeof feat === 'object' && feat.flag) {
            const hasFlag = actorFeats.some(f => f.system?.[feat.flag]);
            if (!hasFlag) {
                missing.push(`Feat with flag: ${feat.flag}`);
            }
            continue;
        }

        // Handle feat name/ID checks
        const normalized = feat.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = actorFeats.some(f => {
            const fname = f.name ? f.name : f.toString();
            return fname.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized;
        });

        if (!found) {
            missing.push(feat.toString());
        }
    }

    return { met: missing.length === 0, missing };
}

/**
 * Check if actor has any one of the required feats.
 * Supports both feat names/IDs and flag-based checks (e.g., { flag: "martialArtsFeat" }).
 */
function checkFeatsAny(actor, requiredFeats) {
    if (!actor || !requiredFeats || requiredFeats.length === 0) {
        return { met: true };
    }

    const actorFeats = getActorFeats(actor);

    for (const feat of requiredFeats) {
        // Handle flag-based checks
        if (typeof feat === 'object' && feat.flag) {
            const hasFlag = actorFeats.some(f => f.system?.[feat.flag]);
            if (hasFlag) {
                return { met: true, found: `Feat with flag: ${feat.flag}` };
            }
            continue;
        }

        // Handle feat name/ID checks
        const normalized = feat.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = actorFeats.some(f => {
            const fname = f.name ? f.name : f.toString();
            return fname.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized;
        });

        if (found) {
            return { met: true, found: feat.toString() };
        }
    }

    return { met: false };
}

/**
 * Get list of feats from actor.
 * Returns feat objects (with name and system properties) to support flag checking.
 */
function getActorFeats(actor) {
    if (!actor) {return [];}

    const feats = [];

    // Check feat items (finalized feats) - include full objects for flag checking
    const featItems = actor.items?.filter(i => i.type === 'feat') || [];
    feats.push(...featItems.map(f => ({
        name: f.name,
        system: f.system
    })));

    // Check pending progression.feats and progression.startingFeats
    // These are typically strings (feat names), wrap them
    if (actor.system?.progression?.feats && Array.isArray(actor.system.progression.feats)) {
        feats.push(...actor.system.progression.feats.map(f =>
            typeof f === 'string' ? { name: f } : f
        ));
    }
    if (actor.system?.progression?.startingFeats && Array.isArray(actor.system.progression.startingFeats)) {
        feats.push(...actor.system.progression.startingFeats.map(f =>
            typeof f === 'string' ? { name: f } : f
        ));
    }

    return feats;
}

/**
 * Check talent requirements.
 * Includes both finalized talents (actor.items) and pending talents (actor.system.progression.talents)
 */
function checkTalents(actor, talentReq) {
    if (!actor || !talentReq) {
        return { met: true };
    }

    // Get finalized talent items
    const actorTalents = actor.items?.filter(i => i.type === 'talent') || [];

    // Also include pending talents from progression (store as names for compatibility)
    const pendingTalentNames = actor.system?.progression?.talents || [];
    const pendingTalents = pendingTalentNames.map(name => ({
        name: typeof name === 'string' ? name : name.name || '',
        system: {}
    }));

    const allTalents = [...actorTalents, ...pendingTalents];

    // Check for specific named talents
    if (talentReq.specific) {
        const missing = [];
        for (const talentName of talentReq.specific) {
            const found = allTalents.some(t =>
                t.name.toLowerCase() === talentName.toLowerCase()
            );
            if (!found) {
                missing.push(talentName);
            }
        }

        if (missing.length > 0) {
            return {
                met: false,
                message: `Talents: ${missing.join(', ')}`
            };
        }
        return { met: true };
    }

    // Check for Force talents only
    if (talentReq.forceTalentsOnly) {
        const forceTalents = allTalents.filter(t =>
            t.system?.isForce || t.system?.tags?.includes('force')
        );

        const actual = forceTalents.length;
        const required = talentReq.count || 0;

        if (actual < required) {
            return {
                met: false,
                message: `${required} Force Talent(s) (you have ${actual})`
            };
        }
        return { met: true, actual, required };
    }

    // Check for talents from specific trees
    if (talentReq.trees) {
        const matchingTalents = [];

        for (const talent of allTalents) {
            const treeName = talent.system?.talentTree || talent.system?.talent_tree;
            if (!treeName) {continue;}

            const normalizedTreeId = normalizeTalentTreeId(treeName);

            for (const requiredTree of talentReq.trees) {
                const requiredTreeId = normalizeTalentTreeId(requiredTree);
                if (normalizedTreeId === requiredTreeId) {
                    matchingTalents.push(talent);
                    break;
                }
            }
        }

        const actual = matchingTalents.length;
        const required = talentReq.count || 1;

        if (actual < required) {
            return {
                met: false,
                message: `${required} talent(s) from: ${talentReq.trees.join(', ')} (you have ${actual})`
            };
        }

        return { met: true, actual, required };
    }

    return { met: true };
}

/**
 * Check Force Power requirements.
 * Includes both finalized powers (actor.items) and pending powers (actor.system.progression.powers)
 */
function checkForcePowers(actor, requiredPowers) {
    if (!actor || !requiredPowers || requiredPowers.length === 0) {
        return { met: true, missing: [] };
    }

    // Get finalized force power items
    const actorPowers = actor.items?.filter(i =>
        i.type === 'forcepower' || i.type === 'force-power'
    ) || [];

    // Also include pending force powers from progression
    const pendingPowerNames = actor.system?.progression?.powers || [];
    const allPowerNames = [
        ...actorPowers.map(p => p.name),
        ...pendingPowerNames
    ];

    const missing = [];

    for (const power of requiredPowers) {
        const normalized = power.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = allPowerNames.some(p =>
            (typeof p === 'string' ? p : p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
        );

        if (!found) {
            missing.push(power);
        }
    }

    return { met: missing.length === 0, missing };
}

/**
 * Check Force Technique count.
 */
function checkForceTechniques(actor, techniqueReq) {
    if (!actor || !techniqueReq) {
        return { met: true };
    }

    const actorTechniques = actor.items?.filter(i =>
        i.type === 'forcetechnique' || i.type === 'force-technique' ||
        i.system?.tags?.includes('force_technique')
    ) || [];

    const actual = actorTechniques.length;
    const required = techniqueReq.count || 1;

    return {
        met: actual >= required,
        actual,
        required
    };
}

/**
 * Check Dark Side Score requirement.
 */
function checkDarkSideScore(actor, requirement) {
    if (!actor) {return { met: true };}

    const darkSideScore = actor.system?.darkSideScore || actor.system?.darksideScore || 0;
    const wisScore = actor.system?.abilities?.wis?.score || 10;

    // Requirement: Dark Side Score must equal Wisdom score
    return {
        met: darkSideScore >= wisScore,
        actual: darkSideScore,
        required: wisScore
    };
}

/**
 * Check species requirement.
 */
function checkSpecies(actor, allowedSpecies) {
    if (!actor || !allowedSpecies || allowedSpecies.length === 0) {
        return { met: true };
    }

    const actorSpecies = actor.system?.species || actor.system?.race || '';

    const normalized = actorSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');
    const met = allowedSpecies.some(s =>
        s.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
    );

    return {
        met,
        actual: actorSpecies,
        required: allowedSpecies
    };
}

/**
 * Check droid systems requirement.
 */
function checkDroidSystems(actor, requiredSystems) {
    if (!actor || !requiredSystems || requiredSystems.length === 0) {
        return { met: true, missing: [] };
    }

    const actorSystems = actor.system?.droidSystems || [];
    const missing = [];

    for (const system of requiredSystems) {
        const normalized = system.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = actorSystems.some(s =>
            (typeof s === 'string' ? s : s.name).toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
        );

        if (!found) {
            missing.push(system);
        }
    }

    return { met: missing.length === 0, missing };
}

/**
 * Get all prestige classes available to an actor.
 *
 * @param {Object} actor - Actor document
 * @returns {Array<Object>} - Array of { className, met, missing, details, special }
 */
export function getAvailablePrestigeClasses(actor) {
    const results = [];

    for (const className of Object.keys(PRESTIGE_PREREQUISITES)) {
        const check = checkPrerequisites(actor, className);
        results.push({
            className,
            ...check
        });
    }

    return results;
}

/**
 * Get only prestige classes that the actor qualifies for.
 *
 * @param {Object} actor - Actor document
 * @returns {Array<string>} - Array of qualified prestige class names
 */
export function getQualifiedPrestigeClasses(actor) {
    return getAvailablePrestigeClasses(actor)
        .filter(result => result.met)
        .map(result => result.className);
}
