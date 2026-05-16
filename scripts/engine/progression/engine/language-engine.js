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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { LanguageRegistry } from "/systems/foundryvtt-swse/scripts/registries/language-registry.js";
import { CapabilityRegistry } from "/systems/foundryvtt-swse/scripts/engine/capabilities/capability-registry.js";
import { CAPABILITY_SLUGS } from "/systems/foundryvtt-swse/scripts/constants/capability-slugs.js";
import { FeatGrantEntitlementResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js";

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
        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, { 'system.languageIds': ids }).catch(() => {});
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

        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
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
        const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
        await SpeciesRegistry.initialize?.();
        const species = SpeciesRegistry.getByName(speciesName) || SpeciesRegistry.getById(speciesName);
        if (!species) {
            SWSELogger.warn(`Species not found: ${speciesName}`);
            return [];
        }

        const languages = species.languages || [];
        const results = await this.grantLanguages(actor, languages);

        SWSELogger.log(`Applied ${languages.length} species languages for ${speciesName}`);
        return results;
    }

    /**
     * Apply languages from background
     */
    static async applyBackgroundLanguages(actor, backgroundName) {
        const background = await BackgroundRegistry.resolve?.(backgroundName) || await BackgroundRegistry.getByName?.(backgroundName);
        if (!background) {
            SWSELogger.warn(`Background not found: ${backgroundName}`);
            return [];
        }

        const languages = background.languages || background.grants?.languages || [];
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
     * Apply languages from Linguist feat.
     * SWSE rule: each Linguist feat grants 1 + INT modifier languages, minimum 1.
     * The grant is dynamic; if INT modifier increases later, each Linguist instance
     * contributes the new value.
     */
    static async applyLinguistLanguages(actor) {
        const bonusLanguages = FeatGrantEntitlementResolver.totalForGrantType(actor, 'languageSlots');

        SWSELogger.log(`${bonusLanguages} bonus languages from Linguist feat entitlement(s)`);

        return bonusLanguages;
    }

    /**
     * Calculate total bonus languages available to a character.
     * Includes: INT modifier + dynamic Linguist feat entitlements.
     */
    static calculateBonusLanguagesAvailable(actor, options = {}) {
        // SWSE language picks: native language(s) and Basic are automatic known
        // languages. Player-selectable picks are +1 per positive INT modifier plus
        // Linguist, where each Linguist instance grants max(1, 1 + INT modifier).
        const intModLanguages = FeatGrantEntitlementResolver.getIntBonusLanguageCount(actor);
        const linguistBonuses = FeatGrantEntitlementResolver.totalForGrantType(actor, 'languageSlots', options);
        const pendingEntitlements = options?.progressionSession?.draftSelections?.pendingEntitlements
            || options?.shell?.progressionSession?.draftSelections?.pendingEntitlements
            || [];
        const extraPendingLanguagePicks = pendingEntitlements.reduce((total, entry) => {
            const type = String(entry?.type || entry?.kind || '').toLowerCase();
            if (type !== 'language_pick' && type !== 'language_slot') return total;
            const featName = String(entry?.source?.featName || entry?.sourceName || '').toLowerCase();
            // Linguist pending entitlements are already represented by
            // FeatGrantEntitlementResolver when pending feats are included; do not
            // count them twice. Keep this branch for non-feat/class language picks.
            if (featName === 'linguist' || featName.includes('linguist')) return total;
            const quantity = Math.max(1, Number(entry?.quantity ?? entry?.count ?? 1));
            const spent = Math.max(0, Number(entry?.spent ?? entry?.spentSelections?.length ?? 0));
            return total + Math.max(0, quantity - spent);
        }, 0);

        return Math.max(0, intModLanguages) + Math.max(0, linguistBonuses) + Math.max(0, extraPendingLanguagePicks);
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
            await ActorEngine.updateActor(actor, {
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

        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
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
