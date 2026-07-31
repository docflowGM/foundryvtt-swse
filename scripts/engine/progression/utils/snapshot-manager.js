/**
 * SnapshotManager
 * Saves and restores complete actor states for rollback/undo functionality.
 * Essential safety mechanism for level-up and character creation.
 * PHASE 10: All mutations route through ActorEngine for governance.
 *
 * PHASE 10 ADDENDUM (P1-7) — Exact, Failure-Aware Snapshot Restoration.
 * `createSnapshot()` now stamps every new snapshot with `schemaVersion: 2`
 * and `scope: 'full-actor'` — `actor.toObject(false)` already captured
 * flags/ownership/prototypeToken/embedded-document source data before
 * this change; the gap was entirely in the restore path never reading
 * them (see snapshot-service.js's doc comment for the full story). A
 * snapshot recorded before this change (or from any other caller
 * constructing its own ad-hoc snapshot shape) has no `schemaVersion` and
 * is treated as legacy by the restore path: only the fields it actually
 * contains are restored, and the result always reports `exact: false`.
 *
 * `restoreSnapshot()` keeps its original boolean-ish return contract
 * unchanged for existing callers that only ever check truthiness — it
 * now internally delegates to `restoreSnapshotExact()`, so every caller
 * gets deletion-aware root restoration and id-preserving embedded-
 * document restoration "for free," with zero call-site changes required.
 * `restoreSnapshotExact()` is new: it returns the FULL structured result
 * (`success`, `exact`, `failedStep`, `compensationAttempted`, etc.) — use
 * it for any caller that must honestly distinguish a partial/inexact
 * restore from a full one (see docs/audits/droid-authority-consolidation-phase-2.md's
 * "P1-7" section for the list of high-risk callers migrated to it).
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const SYSTEM_ID = 'foundryvtt-swse';
const SNAPSHOT_SCHEMA_VERSION = 2;

function stripNestedSnapshots(actorData = {}) {
    const data = foundry.utils.deepClone(actorData || {});
    try {
        if (data.flags?.[SYSTEM_ID]?.snapshots) delete data.flags[SYSTEM_ID].snapshots;
        if (data.flags?.swse?.snapshots) delete data.flags.swse.snapshots;
    } catch (_err) {
        // Snapshot history is a rollback ledger, not part of the rollback payload.
    }
    return data;
}

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
                schemaVersion: SNAPSHOT_SCHEMA_VERSION,
                scope: 'full-actor',
                timestamp: Date.now(),
                label,
                actorId: actor.id,
                actorName: actor.name,
                level: actor.system.level || 1,
                actorData: stripNestedSnapshots(actor.toObject(false))
            };

            // Store in actor flags (persistent across sessions)
            const history = (foundry.utils.deepClone(actor.getFlag(SYSTEM_ID, 'snapshots') || []))
                .map((entry) => entry?.actorData ? { ...entry, actorData: stripNestedSnapshots(entry.actorData) } : entry);

            // Keep only last 10 snapshots to avoid bloat
            if (history.length >= 10) {
                history.shift();
            }

            history.push(snapshot);

            // Route through ActorEngine for mutation authority
            await ActorEngine.updateActor(actor, {
              'flags.foundryvtt-swse.snapshots': history
            }, { source: 'snapshot-create', skipValidation: true });

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
     * Restore actor to a previous snapshot, exactly and honestly.
     * PHASE 10 ADDENDUM (P1-7): delegates to SnapshotService.restoreFromSnapshot()
     * directly (not through ActorEngine.restoreFromSnapshot()'s indirection —
     * ActorEngine's own version of that method exists for OTHER direct
     * callers and still delegates to the same SnapshotService), and returns
     * the FULL structured result: `{success, exact, failedStep,
     * compensationAttempted, compensationSucceeded, verification, ...}`.
     * The snapshot-history ledger itself is never at risk of being touched
     * — SnapshotService's restoration plan always excludes
     * `flags.foundryvtt-swse.snapshots`/`flags.swse.snapshots` from both
     * restoration and deletion, regardless of what a given snapshot's own
     * (already-history-stripped) `actorData.flags` contains.
     *
     * @param {Actor} actor - The actor
     * @param {number|string} identifier - Timestamp or array index
     * @param {{requireExact?: boolean}} [options] - ROUND-2 CORRECTION:
     *   `requireExact: true` fails the whole restore closed (with bounded
     *   compensation) rather than returning `{success: true, exact: false}`
     *   — pass this from any rollback-purpose caller. See
     *   snapshot-service.js's doc comment for the full policy.
     * @returns {Promise<object>} the structured restoration result — see
     *   scripts/governance/snapshot/snapshot-service.js's doc comment for
     *   the full shape.
     */
    static async restoreSnapshotExact(actor, identifier, options = {}) {
        const snapshot = this.getSnapshot(actor, identifier);

        if (!snapshot) {
            SWSELogger.warn(`Snapshot not found for actor ${actor.name}`);
            return { success: false, code: 'SNAPSHOT_NOT_FOUND', exact: false, actorId: actor?.id ?? null, error: 'Snapshot not found.' };
        }

        const actorDataToRestore = foundry.utils.deepClone(snapshot.actorData ?? {});
        const restoreSnapshotShape = {
            // ROUND-2 CORRECTION: actorId is now carried through so
            // SnapshotService can reject a snapshot being applied to the
            // wrong Actor instead of silently restoring it anyway.
            actorId: snapshot.actorId,
            schemaVersion: snapshot.schemaVersion,
            scope: snapshot.scope ?? 'full-actor',
            name: actorDataToRestore.name,
            img: actorDataToRestore.img,
            system: actorDataToRestore.system,
            flags: actorDataToRestore.flags,
            ownership: actorDataToRestore.ownership,
            prototypeToken: actorDataToRestore.prototypeToken,
            items: actorDataToRestore.items,
            effects: actorDataToRestore.effects
        };

        // Dynamic import avoids a static circular dependency the same way
        // ActorEngine.restoreFromSnapshot() already does.
        const { SnapshotService } = await import('/systems/foundryvtt-swse/scripts/governance/snapshot/snapshot-service.js');
        const result = await SnapshotService.restoreFromSnapshot(actor, restoreSnapshotShape, {
            meta: { guardKey: 'snapshot-restore' },
            requireExact: options.requireExact === true
        });

        if (result.success) {
            const dateStr = new Date(snapshot.timestamp).toLocaleString();
            SWSELogger.log(`Restored snapshot: "${snapshot.label}" (${dateStr})`, { exact: result.exact });
        } else {
            SWSELogger.error(`Failed to restore snapshot "${snapshot.label}" for ${actor.name}`, result);
        }

        return { ...result, snapshotId: snapshot.timestamp };
    }

    /**
     * Restore actor to a previous snapshot.
     * PHASE 10: Routes through restoreSnapshotExact() for exact,
     * deletion-aware, id-preserving restoration. Kept as a thin
     * boolean-returning wrapper for existing callers that only ever check
     * truthiness.
     *
     * ROUND-2 CORRECTION: this used to return `true` whenever
     * `result.success` was true, REGARDLESS of `result.exact` — a
     * `{success: true, exact: false}` inexact restore (e.g. Foundry
     * failed to honor `keepId` on a recreated Item) collapsed into a bare
     * `true`, and every legacy caller that only checks truthiness had no
     * way to know the restore wasn't identity-exact. Fixed: this now
     * requires BOTH `success` and `exact` before reporting success. A
     * legacy snapshot (always `exact: false` by design) is therefore
     * always reported as a failed restore here — callers that must
     * accept a legacy snapshot's partial restore need
     * `restoreSnapshotExact()` and its structured result instead.
     * @param {Actor} actor - The actor
     * @param {number|string} identifier - Timestamp or array index
     * @returns {Promise<boolean>} True only if restored AND identity-exact
     */
    static async restoreSnapshot(actor, identifier) {
        try {
            const result = await this.restoreSnapshotExact(actor, identifier);

            if (!result.success || result.exact !== true) {
                const message = !result.success
                    ? (result.error ? `Failed to restore: ${result.error}` : 'Snapshot not found.')
                    : 'Restore completed but was not identity-exact — manual review recommended.';
                ui.notifications?.error(message);
                return false;
            }

            ui.notifications?.info(`✓ Restored to: ${this.getSnapshot(actor, identifier)?.label ?? 'previous snapshot'}`);

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
            // Route through ActorEngine for mutation authority
            await ActorEngine.updateActor(actor, {
              'flags.foundryvtt-swse.snapshots': snapshots
            }, { source: 'snapshot-delete', skipValidation: true });

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
            // Route through ActorEngine for mutation authority
            await ActorEngine.updateActor(actor, {
              'flags.foundryvtt-swse.snapshots': []
            }, { source: 'snapshot-clear', skipValidation: true });
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
