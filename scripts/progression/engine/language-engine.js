/**
 * Language Progression Engine
 * Centralized system for managing character languages across all progression sources:
 * - Species automatic languages
 * - Background languages
 * - INT modifier languages
 * - Feat languages (Linguist)
 * - Class languages
 * - Talent languages
 * - Prestige class languages
 * - Droid languages
 */

import { SWSELogger } from '../../utils/logger.js';
import { LanguageRegistry } from '../../registries/language-registry.js';

export class LanguageEngine {

    static async _toLanguageId(name) {
        const rec = await LanguageRegistry.getByName(name);
        return rec?.internalId || null;
    }

    static async _syncLanguageIds(actor, names) {
        const ids = [];
        for (const n of names) {
            const id = await this._toLanguageId(n);
            if (id) {ids.push(id);}
        }
        await actor.update({ 'system.languageIds': ids }).catch(() => {});
        return ids;
    }

    /**
     * Get all known languages for an actor
     */
    static getKnownLanguages(actor) {
        return actor.system.languages || [];
    }

    /**
     * Grant a language to an actor
     */
    static async grantLanguage(actor, language) {
        const known = this.getKnownLanguages(actor);

        // Check if already known
        if (known.includes(language)) {
            SWSELogger.log(`Language already known: ${language}`);
            return false;
        }

        const updated = [...known, language];

        await actor.update({
            'system.languages': updated
        });
        await this._syncLanguageIds(actor, updated);

        SWSELogger.log(`Granted language: ${language}`);
        return true;
    }

    /**
     * Grant multiple languages
     */
    static async grantLanguages(actor, languages) {
        const results = [];

        for (const language of languages) {
            const result = await this.grantLanguage(actor, language);
            results.push({ language, granted: result });
        }

        return results;
    }

    /**
     * Apply languages from species
     */
    static async applySpeciesLanguages(actor, speciesName) {
        const speciesPack = game.packs.get('foundryvtt-swse.species');
        if (!speciesPack) {return [];}

        const speciesIndex = speciesPack.index.find(s => s.name === speciesName);
        if (!speciesIndex) {
            SWSELogger.warn(`Species not found: ${speciesName}`);
            return [];
        }

        const speciesDoc = await speciesPack.getDocument(speciesIndex._id);
        if (!speciesDoc) {return [];}

        const languages = speciesDoc.system?.languages || [];
        const results = await this.grantLanguages(actor, languages);

        SWSELogger.log(`Applied ${languages.length} species languages for ${speciesName}`);
        return results;
    }

    /**
     * Apply languages from background
     */
    static async applyBackgroundLanguages(actor, backgroundName) {
        const bgPack = game.packs.get('foundryvtt-swse.backgrounds');
        if (!bgPack) {return [];}

        const bgIndex = bgPack.index.find(b => b.name === backgroundName);
        if (!bgIndex) {
            SWSELogger.warn(`Background not found: ${backgroundName}`);
            return [];
        }

        const bgDoc = await bgPack.getDocument(bgIndex._id);
        if (!bgDoc) {return [];}

        const languages = bgDoc.system?.languages || [];
        const results = await this.grantLanguages(actor, languages);

        SWSELogger.log(`Applied ${languages.length} background languages for ${backgroundName}`);
        return results;
    }

    /**
     * Apply languages from INT modifier
     * SWSE rule: Characters gain 1 bonus language per INT modifier at 1st level
     */
    static async applyIntModLanguages(actor) {
        const intMod = actor.system.attributes?.int?.mod || 0;

        if (intMod <= 0) {
            SWSELogger.log('No INT modifier languages (INT mod is 0 or negative)');
            return [];
        }

        // Note: Actual language selection UI would be needed
        // This just logs that languages are available
        SWSELogger.log(`${intMod} bonus languages available from INT modifier`);

        return intMod;
    }

    /**
     * Apply languages from Linguist feat
     * Linguist feat grants +2 languages per feat
     */
    static async applyLinguistLanguages(actor) {
        const linguistFeats = actor.items.filter(i =>
            i.type === 'feat' && i.name === 'Linguist'
        );

        const bonusLanguages = linguistFeats.length * 2;

        SWSELogger.log(`${bonusLanguages} bonus languages from Linguist feat(s)`);

        return bonusLanguages;
    }

    /**
     * Calculate total bonus languages available to a character
     * Includes: INT mod + Linguist feat
     */
    static calculateBonusLanguagesAvailable(actor) {
        const intMod = actor.system.attributes?.int?.mod || 0;
        const linguistBonuses = this.applyLinguistLanguages(actor);

        return Math.max(0, intMod) + linguistBonuses;
    }

    /**
     * Finalize all languages (called at end of level-up/chargen)
     * Deduplicates and validates languages
     */
    static async finalizeLanguages(actor) {
        const known = this.getKnownLanguages(actor);

        // Remove duplicates
        const unique = [...new Set(known)];

        if (unique.length !== known.length) {
            await actor.update({
                'system.languages': unique
            });

            await this._syncLanguageIds(actor, unique);

            SWSELogger.log(`Deduplicated languages (${known.length} → ${unique.length})`);
        }

        // Keep IDs in sync even when no changes occurred
        if (!Array.isArray(actor.system.languageIds) || actor.system.languageIds.length !== unique.length) {
            await this._syncLanguageIds(actor, unique);
        }

        SWSELogger.log(`Actor knows ${unique.length} languages`);
        return unique;
    }

    /**
     * Get language selection choices for INT mod bonus
     */
    static getAllLanguageChoices() {
        // This would need to come from your language list
        // Common SWSE languages:
        const commonLanguages = [
            'Basic',
            'Shyriiwook',
            'Ewokese',
            'Mon Calamari',
            'Neimodian',
            'Gunganese',
            'Bothan',
            'Wookiee',
            'Droid Binary',
            'Old Corellian',
            'Lianorm',
            'Kel Dor',
            'Sullustan'
        ];

        return commonLanguages;
    }

    /**
     * Create a language selection dialog for INT mod bonus
     */
    static async createLanguageSelectionDialog(actor, availableCount) {
        return new Promise((resolve) => {
            // This would create a dialog for the player to select languages
            // For now, just log that this is needed
            SWSELogger.log(`Language selection needed: choose ${availableCount} languages`);
            resolve([]);
        });
    }

    /**
     * Validate languages (check they're valid in system)
     */
    static async validateLanguages(actor) {
        const known = this.getKnownLanguages(actor);
        const allLanguages = this.getAllLanguageChoices();

        const invalid = known.filter(lang => !allLanguages.includes(lang));

        if (invalid.length > 0) {
            SWSELogger.warn(`Invalid languages found: ${invalid.join(', ')}`);
        }

        return {
            valid: invalid.length === 0,
            invalidLanguages: invalid
        };
    }

    /**
     * Remove a language from actor
     */
    static async removeLanguage(actor, language) {
        const known = this.getKnownLanguages(actor);
        const updated = known.filter(l => l !== language);

        await actor.update({
            'system.languages': updated
        });

        SWSELogger.log(`Removed language: ${language}`);
        return true;
    }

    /**
     * Get formatted list of languages for display
     */
    static getLanguagesForDisplay(actor) {
        const known = this.getKnownLanguages(actor);

        return known.map(lang => ({
            name: lang,
            display: lang
        }));
    }
}
