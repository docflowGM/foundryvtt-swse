/**
 * FEAT PROGRESSION STATE
 * Manages feat selections stored in actor.system.progression.feats
 *
 * Tracks which feats have been selected through progression (not starting feats).
 */

import { SWSELogger } from '../../utils/logger.js';

export const FeatState = {

    /**
     * Get all feats from progression state
     */
    getFeats(actor) {
        return actor.system.progression?.feats || [];
    },

    /**
     * Get feat names as array
     */
    getFeatNames(actor) {
        return Array.isArray(this.getFeats(actor)) ? [...this.getFeats(actor)] : [];
    },

    /**
     * Check if a feat is in progression state
     */
    hasFeat(actor, featName) {
        const feats = this.getFeats(actor);
        return Array.isArray(feats) && feats.includes(featName);
    },

    /**
     * Add a feat to progression state
     */
    async addFeat(actor, featName) {
        if (!featName) {return false;}

        const feats = this.getFeats(actor);
        const featList = Array.isArray(feats) ? [...feats] : [];

        if (featList.includes(featName)) {
            return false; // Already added
        }

        featList.push(featName);

        await actor.update({
            'system.progression.feats': featList
        });

        SWSELogger.log(`Added feat to progression: ${featName}`);
        return true;
    },

    /**
     * Remove a feat from progression state
     */
    async removeFeat(actor, featName) {
        if (!featName) {return false;}

        const feats = this.getFeats(actor);
        const featList = Array.isArray(feats) ? [...feats] : [];

        const index = featList.indexOf(featName);
        if (index === -1) {
            return false; // Not found
        }

        featList.splice(index, 1);

        await actor.update({
            'system.progression.feats': featList
        });

        SWSELogger.log(`Removed feat from progression: ${featName}`);
        return true;
    },

    /**
     * Add multiple feats
     */
    async addMultiple(actor, featNames) {
        if (!Array.isArray(featNames)) {
            return [];
        }

        const results = [];
        for (const featName of featNames) {
            const success = await this.addFeat(actor, featName);
            results.push({ feat: featName, added: success });
        }

        return results;
    },

    /**
     * Get count of feats
     */
    getCount(actor) {
        const feats = this.getFeats(actor);
        return Array.isArray(feats) ? feats.length : 0;
    },

    /**
     * Clear all feats
     */
    async clear(actor) {
        await actor.update({
            'system.progression.feats': []
        });

        SWSELogger.log('Cleared all feats from progression');
    },

    /**
     * Normalize feats list
     */
    normalize(feats) {
        if (!feats) {return [];}
        if (!Array.isArray(feats)) {return [];}

        return feats
            .map(feat => String(feat).trim())
            .filter(feat => feat.length > 0)
            .filter((feat, index, arr) => arr.indexOf(feat) === index); // Deduplicate
    }
};

export default FeatState;
