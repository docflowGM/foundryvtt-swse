// ============================================
// FILE: scripts/data/force-points.js
// Force Point Calculation - Actor Derived
// ============================================
//
// This module implements the AUTHORITATIVE Force Point calculation.
//
// CRITICAL DESIGN DECISIONS (DO NOT CHANGE):
// 1. Force Points are a PROGRESSION resource, not a Force ability
// 2. They are calculated from total character level + prestige status
// 3. They are INDEPENDENT of Force Sensitivity feat
// 4. They are INDEPENDENT of current class
// 5. Once prestige base is unlocked (6), it NEVER downgrades to 5
//
// Force Point Formula:
// - Base = 5 (standard heroic characters)
// - Base = 6 (characters who have unlocked any prestige class)
// - Base = 7 (Force Disciple, Jedi Master, Sith Lord only)
// - Max FP = Base + floor(Total Character Level / 2)
//
// Special Cases:
// - Shaper prestige class does NOT grant the base 6 increase
// - Force Disciple, Jedi Master, Sith Lord grant base 7 (not 6)
//
// This calculation is actor-derived and deterministic.
// It should be recalculated on:
// - Actor creation
// - Class addition
// - Level change
// ============================================

import { ClassesDB } from './classes-db.js';
import { SWSELogger } from '../utils/logger.js';

/**
 * Calculate maximum Force Points for an actor.
 * This is the ONLY authoritative way to determine FP.
 *
 * @param {Object} actor - Actor document
 * @returns {number} - Maximum Force Points
 */
export function calculateMaxForcePoints(actor) {
    if (!actor) {
        SWSELogger.warn('[ForcePoints] calculateMaxForcePoints called with null actor');
        return 5;  // Default baseline
    }

    // Get total character level
    const totalLevel = getTotalCharacterLevel(actor);

    // Determine base Force Points (5, 6, or 7)
    const base = getForcePointBase(actor);

    // Calculate max FP
    const maxFP = base + Math.floor(totalLevel / 2);

    return maxFP;
}

/**
 * Get total character level across all classes.
 *
 * @param {Object} actor - Actor document
 * @returns {number} - Total level
 */
function getTotalCharacterLevel(actor) {
    if (!actor) {return 0;}

    // Try various ways to get level (different actor types may store it differently)
    if (actor.system?.level) {
        return actor.system.level;
    }

    if (actor.system?.heroicLevel) {
        return actor.system.heroicLevel;
    }

    // Sum up levels from all class items
    const classItems = actor.items.filter(i => i.type === 'class');
    if (classItems.length > 0) {
        return classItems.reduce((sum, classItem) => {
            const level = classItem.system?.level || 0;
            return sum + level;
        }, 0);
    }

    // Default to level 1
    return 1;
}

/**
 * Get the Force Point base for an actor.
 *
 * Rules:
 * - Base 5: Characters with only base classes
 * - Base 6: Characters with any prestige class (except Shaper)
 * - Base 7: Characters with Force Disciple, Jedi Master, or Sith Lord
 * - Once unlocked, the highest base persists forever
 *
 * @param {Object} actor - Actor document
 * @returns {number} - Force Point base (5, 6, or 7)
 */
function getForcePointBase(actor) {
    if (!actor) {return 5;}

    // Check persistent flags (once unlocked, never downgrades)
    const hasBase7 = actor.getFlag?.('swse', 'hasBase7FP');
    if (hasBase7) {return 7;}

    const hasBase6 = actor.getFlag?.('swse', 'hasPrestigeFPBonus');
    if (hasBase6) {return 6;}

    // Check current classes
    const classItems = actor.items?.filter?.(i => i.type === 'class') || [];
    if (!Array.isArray(classItems)) {return 5;}

    let highestBase = 5;

    for (const classItem of classItems) {
        // Get class definition from ClassesDB
        const classDef = ClassesDB.fromItem?.(classItem);

        if (!classDef) {
            // Fallback: Check item data directly if ClassesDB not available
            const isPrestige = classItem.system?.base_class === false;
            const grantsForcePoints = classItem.system?.grants_force_points !== false;
            const forcePointBase = classItem.system?.force_point_base;

            if (forcePointBase === 7) {
                highestBase = Math.max(highestBase, 7);
                actor.setFlag?.('swse', 'hasBase7FP', true);
            } else if (isPrestige && grantsForcePoints) {
                highestBase = Math.max(highestBase, 6);
                actor.setFlag?.('swse', 'hasPrestigeFPBonus', true);
            }
            continue;
        }

        // Check if this class grants a special Force Point base
        if (classDef.forcePointBase === 7) {
            highestBase = Math.max(highestBase, 7);
            actor.setFlag?.('swse', 'hasBase7FP', true);
        } else if (!classDef.baseClass && classDef.grantsForcePoints) {
            // Prestige class that grants FP bonus
            highestBase = Math.max(highestBase, 6);
            if (highestBase === 6) {
                actor.setFlag?.('swse', 'hasPrestigeFPBonus', true);
            }
        }
    }

    return highestBase;
}

/**
 * Check if actor has the prestige Force Point bonus.
 *
 * Rules:
 * - Returns true if actor has ANY prestige class
 * - EXCEPT: Shaper does not count (grants_force_points: false)
 * - Once unlocked, this bonus persists (even if prestige class is removed)
 *
 * @param {Object} actor - Actor document
 * @returns {boolean} - True if base should be 6
 * @deprecated Use getForcePointBase() instead
 */
function hasPrestigeForcePointBonus(actor) {
    if (!actor) {return false;}

    // Check actor flag (persistent marker)
    if (actor.getFlag?.('swse', 'hasPrestigeFPBonus')) {
        return true;
    }

    // Check current classes
    const classItems = actor.items.filter(i => i.type === 'class');

    for (const classItem of classItems) {
        // Get class definition from ClassesDB
        const classDef = ClassesDB.fromItem?.(classItem);

        if (!classDef) {
            // Fallback: Check item data directly if ClassesDB not available
            const isPrestige = classItem.system?.base_class === false;
            const grantsForcePoints = classItem.system?.grants_force_points !== false;

            if (isPrestige && grantsForcePoints) {
                // Set persistent flag
                actor.setFlag?.('swse', 'hasPrestigeFPBonus', true);
                return true;
            }
            continue;
        }

        // Check if this is a prestige class that grants FP bonus
        if (!classDef.baseClass && classDef.grantsForcePoints) {
            // Set persistent flag
            actor.setFlag?.('swse', 'hasPrestigeFPBonus', true);
            return true;
        }
    }

    return false;
}

/**
 * Recalculate and update actor's Force Points.
 * Should be called whenever level or class changes.
 *
 * @param {Object} actor - Actor document
 * @returns {Promise<void>}
 */
export async function updateActorForcePoints(actor) {
    if (!actor) {return;}

    const maxFP = calculateMaxForcePoints(actor);

    // Update actor's max FP
    await actor.update({
        'system.forcePoints.max': maxFP
    });

    SWSELogger.log(`[ForcePoints] Updated ${actor.name}: maxFP = ${maxFP}`);
}

/**
 * Initialize Force Points for a new actor.
 * Sets both max and current to the calculated value.
 *
 * @param {Object} actor - Actor document
 * @returns {Promise<void>}
 */
export async function initializeActorForcePoints(actor) {
    if (!actor) {return;}

    const maxFP = calculateMaxForcePoints(actor);

    // Set both max and current
    await actor.update({
        'system.forcePoints.max': maxFP,
        'system.forcePoints.value': maxFP
    });

    SWSELogger.log(`[ForcePoints] Initialized ${actor.name}: FP = ${maxFP}/${maxFP}`);
}

/**
 * Check if actor should gain prestige FP bonus upon taking a class.
 * Used during class selection/level-up.
 *
 * @param {Object} actor - Actor document
 * @param {string} classId - Class ID being added
 * @returns {boolean} - True if this class grants the bonus
 */
export function checksIfClassGrantsPrestigeBonus(classId) {
    if (!classId) {return false;}

    const classDef = ClassesDB.get?.(classId);
    if (!classDef) {
        SWSELogger.warn(`[ForcePoints] Unknown class ID: ${classId}`);
        return false;
    }

    // Prestige class that grants FP bonus (not Shaper)
    return !classDef.baseClass && classDef.grantsForcePoints;
}

/**
 * Debug utility: Log FP calculation details for an actor.
 *
 * @param {Object} actor - Actor document
 */
export function debugForcePointCalculation(actor) {
    if (!actor) {return;}

    const totalLevel = getTotalCharacterLevel(actor);
    const hasPrestige = hasPrestigeForcePointBonus(actor);
    const base = hasPrestige ? 6 : 5;
    const maxFP = calculateMaxForcePoints(actor);

    console.log('=== Force Point Calculation Debug ===');
    console.log(`Actor: ${actor.name}`);
    console.log(`Total Level: ${totalLevel}`);
    console.log(`Has Prestige Bonus: ${hasPrestige}`);
    console.log(`Base: ${base}`);
    console.log(`Calculation: ${base} + floor(${totalLevel} / 2) = ${maxFP}`);
    console.log(`Current FP: ${actor.system?.forcePoints?.value || 0}`);
    console.log(`Max FP: ${actor.system?.forcePoints?.max || 0}`);
    console.log('Classes:');

    const classItems = actor.items.filter(i => i.type === 'class');
    for (const classItem of classItems) {
        const classDef = ClassesDB.fromItem?.(classItem);
        console.log(`  - ${classItem.name} (Level ${classItem.system?.level || 0})`);
        if (classDef) {
            console.log(`    Base Class: ${classDef.baseClass}`);
            console.log(`    Grants FP Bonus: ${classDef.grantsForcePoints}`);
        }
    }

    console.log('=====================================');
}

/**
 * CRITICAL RULES (DO NOT VIOLATE):
 *
 * ❌ DO NOT:
 * - Check Force Sensitivity feat for FP calculation
 * - Read force_points from class level progression
 * - Allow FP base to downgrade from 6 to 5
 * - Store FP calculations in class items
 * - Use class-specific FP formulas
 *
 * ✅ ALWAYS:
 * - Calculate from total character level only
 * - Use prestige status (excluding Shaper) for base
 * - Recalculate on level/class change
 * - Store only in actor.system.forcePoints
 * - Keep calculation deterministic and stateless
 *
 * This ensures:
 * - Multiclass works correctly
 * - Scout levels don't break FP
 * - Prestige unlocks work once
 * - No silent failures
 * - Future-proof for homebrew
 */
