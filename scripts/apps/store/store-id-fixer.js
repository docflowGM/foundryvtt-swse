/**
 * SWSE Store ID Fixer
 * Diagnostic and repair utility for items/actors with missing or invalid IDs
 */

import { SWSELogger } from '../../utils/logger.js';

/**
 * Scan all store items and actors for missing IDs
 * @returns {Object} Report of items with invalid IDs
 */
export async function scanForInvalidIds() {
    const report = {
        items: [],
        actors: [],
        timestamp: new Date().toISOString()
    };

    // Scan world items
    for (const item of game.items) {
        if (!item.id && !item._id) {
            report.items.push({
                source: 'world',
                name: item.name || 'Unknown',
                type: item.type,
                uuid: item.uuid
            });
        }
    }

    // Scan compendium packs for items
    const packNames = ['foundryvtt-swse.weapons', 'foundryvtt-swse.armor', 'foundryvtt-swse.equipment'];
    for (const packName of packNames) {
        const pack = game.packs.get(packName);
        if (pack) {
            const documents = await pack.getDocuments();
            for (const item of documents) {
                if (!item.id && !item._id) {
                    report.items.push({
                        source: packName,
                        name: item.name || 'Unknown',
                        type: item.type,
                        uuid: item.uuid
                    });
                }
            }
        }
    }

    // Scan world actors
    for (const actor of game.actors) {
        if (!actor.id && !actor._id) {
            report.actors.push({
                source: 'world',
                name: actor.name || 'Unknown',
                type: actor.type,
                uuid: actor.uuid
            });
        }
    }

    // Scan compendium packs for actors
    const actorPackNames = ['foundryvtt-swse.vehicles', 'foundryvtt-swse.droids'];
    for (const packName of actorPackNames) {
        const pack = game.packs.get(packName);
        if (pack) {
            try {
                const documents = await pack.getDocuments();
                for (const actor of documents) {
                    if (!actor.id && !actor._id) {
                        report.actors.push({
                            source: packName,
                            name: actor.name || 'Unknown',
                            type: actor.type,
                            uuid: actor.uuid
                        });
                    }
                }
            } catch (err) {
                SWSELogger.error(`SWSE Store | Error scanning ${packName}:`, err);
            }
        }
    }

    return report;
}

/**
 * Attempt to fix items/actors with missing IDs
 * This will re-import them from compendium or regenerate IDs
 * @param {Object} report - Report from scanForInvalidIds()
 * @returns {Object} Repair results
 */
export async function fixInvalidIds(report) {
    if (!game.user.isGM) {
        ui.notifications.error("Only GMs can repair item IDs.");
        return { success: false, message: "Permission denied" };
    }

    const results = {
        itemsFixed: 0,
        actorsFixed: 0,
        errors: []
    };

    // Note: In Foundry VTT, items and actors from compendium packs should
    // always have valid IDs. If they don't, it indicates a deeper issue
    // with the compendium pack itself.

    // For world items, we can potentially fix them by recreating
    for (const itemInfo of report.items) {
        if (itemInfo.source === 'world') {
            try {
                // Get the item by UUID
                const item = await fromUuid(itemInfo.uuid);
                if (item) {
                    // Delete and recreate the item to generate a new ID
                    const itemData = item.toObject();
                    await item.delete();
                    await Item.create(itemData);
                    results.itemsFixed++;
                    SWSELogger.log(`Fixed item: ${itemInfo.name}`);
                }
            } catch (err) {
                results.errors.push({
                    item: itemInfo.name,
                    error: err.message
                });
                SWSELogger.error(`Failed to fix item ${itemInfo.name}:`, err);
            }
        } else {
            // Compendium items with missing IDs indicate pack corruption
            results.errors.push({
                item: itemInfo.name,
                error: `Compendium pack ${itemInfo.source} contains corrupted item. Pack needs to be rebuilt.`
            });
        }
    }

    // Similar process for actors
    for (const actorInfo of report.actors) {
        if (actorInfo.source === 'world') {
            try {
                const actor = await fromUuid(actorInfo.uuid);
                if (actor) {
                    const actorData = actor.toObject();
                    await actor.delete();
                    await Actor.create(actorData);
                    results.actorsFixed++;
                    SWSELogger.log(`Fixed actor: ${actorInfo.name}`);
                }
            } catch (err) {
                results.errors.push({
                    actor: actorInfo.name,
                    error: err.message
                });
                SWSELogger.error(`Failed to fix actor ${actorInfo.name}:`, err);
            }
        } else {
            results.errors.push({
                actor: actorInfo.name,
                error: `Compendium pack ${actorInfo.source} contains corrupted actor. Pack needs to be rebuilt.`
            });
        }
    }

    return results;
}

/**
 * Display a diagnostic report in the console
 * @param {Object} report - Report from scanForInvalidIds()
 */
export function displayReport(report) {
    console.group(`%c SWSE Store ID Diagnostic Report - ${report.timestamp}`, 'color: #4fc3f7; font-weight: bold; font-size: 14px');

    if (report.items.length === 0 && report.actors.length === 0) {
        SWSELogger.log('%c✓ All items and actors have valid IDs', 'color: #4caf50; font-weight: bold');
    } else {
        if (report.items.length > 0) {
            console.group(`%c⚠ Found ${report.items.length} item(s) with invalid IDs`, 'color: #ff9800; font-weight: bold');
            for (const item of report.items) {
                SWSELogger.log(`  • ${item.name} (${item.type}) from ${item.source}`);
            }
            console.groupEnd();
        }

        if (report.actors.length > 0) {
            console.group(`%c⚠ Found ${report.actors.length} actor(s) with invalid IDs`, 'color: #ff9800; font-weight: bold');
            for (const actor of report.actors) {
                SWSELogger.log(`  • ${actor.name} (${actor.type}) from ${actor.source}`);
            }
            console.groupEnd();
        }

        SWSELogger.log('%cRun `await SWSEStore.fixInvalidIds(report)` to attempt automatic repair (GM only)', 'color: #2196f3; font-style: italic');
    }

    console.groupEnd();
    return report;
}

/**
 * Quick diagnostic command for console
 * Usage: await SWSEStore.diagnoseIds()
 */
export async function diagnoseIds() {
    const report = await scanForInvalidIds();
    displayReport(report);
    return report;
}
