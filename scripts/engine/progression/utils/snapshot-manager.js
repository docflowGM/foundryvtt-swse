/**
 * SnapshotManager
 * Saves and restores complete actor states for rollback/undo functionality.
 * Essential safety mechanism for level-up and character creation.
 * PHASE 10: All mutations route through ActorEngine for governance.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class SnapshotManager {

    /**
     * Capture full actor snapshot before major operations
     * @param {Actor} actor - The actor to snapshot
     * @param {string} label - Description of snapshot (e.g. "Before Level-Up")
     * @returns {Promise<Object>} The snapshot object
     */
    static async createSnapshot(actor, label = 'Character Snapshot') {
        try {
            const snapshot = {
                timestamp: Date.now(),
                label,
                actorId: actor.id,
                actorName: actor.name,
                level: actor.system.level || 1,
                actorData: actor.toObject(false)
            };

            // Store in actor flags (persistent across sessions)
            const history = actor.getFlag('foundryvtt-swse', 'snapshots') || [];

            // Keep only last 10 snapshots to avoid bloat
            if (history.length >= 10) {
                history.shift();
            }

            history.push(snapshot);

            await actor.setFlag('foundryvtt-swse', 'snapshots', history);

            SWSELogger.log(`Snapshot created: "${label}" for ${actor.name}`);
            return snapshot;
        } catch (err) {
            SWSELogger.error('Failed to create snapshot:', err);
            throw err;
        }
    }

    /**
     * List all snapshots for an actor
     * @param {Actor} actor - The actor
     * @returns {Array} Array of snapshot objects
     */
    static getSnapshots(actor) {
        return actor.getFlag('foundryvtt-swse', 'snapshots') || [];
    }

    /**
     * Get a specific snapshot by timestamp or index
     * @param {Actor} actor - The actor
     * @param {number|string} identifier - Timestamp or array index
     * @returns {Object|null} The snapshot or null
     */
    static getSnapshot(actor, identifier) {
        const snapshots = this.getSnapshots(actor);

        if (typeof identifier === 'number' && identifier < snapshots.length) {
            return snapshots[identifier];
        }

        if (typeof identifier === 'number') {
            return snapshots.find(s => s.timestamp === identifier);
        }

        return null;
    }

    /**
     * Get the most recent snapshot
     * @param {Actor} actor - The actor
     * @returns {Object|null} The latest snapshot or null
     */
    static getLatestSnapshot(actor) {
        const snapshots = this.getSnapshots(actor);
        return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    }

    /**
     * Restore actor to a previous snapshot
     * PHASE 10: Routes through ActorEngine.restoreFromSnapshot() for atomic governance
     * @param {Actor} actor - The actor
     * @param {number|string} identifier - Timestamp or array index
     * @returns {Promise<boolean>} True if restored, false otherwise
     */
    static async restoreSnapshot(actor, identifier) {
        try {
            const snapshot = this.getSnapshot(actor, identifier);

            if (!snapshot) {
                SWSELogger.warn(`Snapshot not found for actor ${actor.name}`);
                ui.notifications?.error('Snapshot not found.');
                return false;
            }

            // Full restore - replace actor data with snapshot
            // This resets: items, system, flags (except snapshots themselves)
            const actorDataToRestore = foundry.utils.deepClone(snapshot.actorData);

            // Preserve the snapshots flag so we don't lose history
            const preservedSnapshots = actor.getFlag('foundryvtt-swse', 'snapshots');

            // PHASE 10: Route through ActorEngine with snapshot metadata
            // ActorEngine.restoreFromSnapshot() handles atomic restoration
            if (globalThis.SWSE?.ActorEngine?.restoreFromSnapshot) {
                await globalThis.SWSE.ActorEngine.restoreFromSnapshot(actor, actorDataToRestore, {
                    meta: { guardKey: 'snapshot-restore' }
                });
            } else {
                throw new Error('ActorEngine.restoreFromSnapshot is required for snapshot restoration. Ensure ActorEngine is initialized before snapshot restore.');
            }

            // Restore snapshots flag
            if (preservedSnapshots) {
                await actor.setFlag('foundryvtt-swse', 'snapshots', preservedSnapshots);
            }

            const dateStr = new Date(snapshot.timestamp).toLocaleString();
            SWSELogger.log(`Restored snapshot: "${snapshot.label}" (${dateStr})`);
            ui.notifications?.info(`✓ Restored to: ${snapshot.label}`);

            return true;
        } catch (err) {
            SWSELogger.error('Failed to restore snapshot:', err);
            ui.notifications?.error(`Failed to restore: ${err.message}`);
            throw err;
        }
    }

    /**
     * Delete a specific snapshot
     * @param {Actor} actor - The actor
     * @param {number|string} identifier - Timestamp or array index
     * @returns {Promise<boolean>} True if deleted, false otherwise
     */
    static async deleteSnapshot(actor, identifier) {
        try {
            const snapshots = this.getSnapshots(actor);
            const index = typeof identifier === 'number' && identifier < snapshots.length
                ? identifier
                : snapshots.findIndex(s => s.timestamp === identifier);

            if (index === -1) {
                return false;
            }

            snapshots.splice(index, 1);
            await actor.setFlag('foundryvtt-swse', 'snapshots', snapshots);

            SWSELogger.log(`Snapshot deleted for ${actor.name}`);
            return true;
        } catch (err) {
            SWSELogger.error('Failed to delete snapshot:', err);
            return false;
        }
    }

    /**
     * Clear all snapshots for an actor
     * @param {Actor} actor - The actor
     * @returns {Promise<boolean>} True if cleared
     */
    static async clearSnapshots(actor) {
        try {
            await actor.setFlag('foundryvtt-swse', 'snapshots', []);
            SWSELogger.log(`Snapshots cleared for ${actor.name}`);
            return true;
        } catch (err) {
            SWSELogger.error('Failed to clear snapshots:', err);
            return false;
        }
    }

    /**
     * Get snapshot list formatted for UI display
     * @param {Actor} actor - The actor
     * @returns {Array} Array of formatted snapshots for display
     */
    static getSnapshotsForDisplay(actor) {
        return this.getSnapshots(actor).map((snap, idx) => ({
            index: idx,
            timestamp: snap.timestamp,
            label: snap.label,
            dateStr: new Date(snap.timestamp).toLocaleString(),
            level: snap.level,
            display: `${snap.label} (Level ${snap.level}) - ${new Date(snap.timestamp).toLocaleString()}`
        }));
    }
}
