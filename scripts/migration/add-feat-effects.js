/**
 * Migration script to add automatic effects to feats in the compendium
 * This script scans all feats and adds Active Effects for permanent bonuses
 */

import { FeatEffectsEngine } from '../engine/FeatEffectsEngine.js';
import { SWSELogger } from '../utils/logger.js';

export class FeatEffectsMigration {

    /**
     * Run the migration on the feats compendium
     * @param {boolean} dryRun - If true, only report what would be changed
     * @returns {Promise<Object>} Migration results
     */
    static async migrateFeatsCompendium(dryRun = false) {
        const pack = game.packs.get('swse.feats');
        if (!pack) {
            ui.notifications.error('Feats compendium not found');
            return { error: 'Compendium not found' };
        }

        const results = {
            total: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            featsWithEffects: []
        };

        ui.notifications.info(`${dryRun ? 'Analyzing' : 'Migrating'} feats compendium...`);

        // Load all feats
        const documents = await pack.getDocuments();
        results.total = documents.length;

        for (const feat of documents) {
            try {
                // Skip if feat already has effects
                if (feat.effects.size > 0) {
                    results.skipped++;
                    continue;
                }

                // Generate effects
                const effectsData = FeatEffectsEngine.createEffectsForFeat(feat);

                if (effectsData.length > 0) {
                    results.featsWithEffects.push({
                        name: feat.name,
                        effectCount: effectsData.length,
                        effects: effectsData
                    });

                    if (!dryRun) {
                        // Apply effects to the compendium document
                        await feat.createEmbeddedDocuments('ActiveEffect', effectsData);
                        SWSELogger.log(`Added ${effectsData.length} effect(s) to ${feat.name}`);
                    }

                    results.updated++;
                } else {
                    results.skipped++;
                }
            } catch (err) {
                SWSELogger.error(`Error processing ${feat.name}:`, err);
                results.errors++;
            }
        }

        // Report results
        const message = `
            <h3>Feat Effects Migration ${dryRun ? 'Analysis' : 'Complete'}</h3>
            <p><strong>Total Feats:</strong> ${results.total}</p>
            <p><strong>Updated:</strong> ${results.updated}</p>
            <p><strong>Skipped:</strong> ${results.skipped}</p>
            <p><strong>Errors:</strong> ${results.errors}</p>
            ${results.featsWithEffects.length > 0 ? `
                <details>
                    <summary><strong>Feats with Auto-Generated Effects (${results.featsWithEffects.length}):</strong></summary>
                    <ul style="max-height: 400px; overflow-y: auto;">
                        ${results.featsWithEffects.map(f => `
                            <li><strong>${f.name}</strong> (${f.effectCount} effect${f.effectCount > 1 ? 's' : ''})</li>
                        `).join('')}
                    </ul>
                </details>
            ` : ''}
        `;

        new Dialog({
            title: "Feat Effects Migration Results",
            content: message,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "OK"
                }
            }
        }, {
            width: 600
        }).render(true);

        return results;
    }

    /**
     * Scan a single actor and apply missing feat effects
     * @param {Actor} actor - The actor to scan
     * @returns {Promise<number>} Number of effects created
     */
    static async scanActor(actor) {
        if (!actor) {
            ui.notifications.warn('No actor provided');
            return 0;
        }

        return await FeatEffectsEngine.scanAndApplyEffects(actor);
    }

    /**
     * Scan all actors in the world and apply missing feat effects
     * @returns {Promise<Object>} Results summary
     */
    static async scanAllActors() {
        const results = {
            actorsScanned: 0,
            effectsCreated: 0,
            errors: 0
        };

        for (const actor of game.actors) {
            if (actor.type !== 'character') continue;

            try {
                const created = await FeatEffectsEngine.scanAndApplyEffects(actor);
                results.actorsScanned++;
                results.effectsCreated += created;
            } catch (err) {
                SWSELogger.error(`Error scanning ${actor.name}:`, err);
                results.errors++;
            }
        }

        ui.notifications.info(`Scanned ${results.actorsScanned} actors, created ${results.effectsCreated} effects`);
        return results;
    }
}

// Make available globally for console use
globalThis.FeatEffectsMigration = FeatEffectsMigration;
