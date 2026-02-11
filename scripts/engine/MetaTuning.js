/**
 * SWSE Community Meta Tuning
 *
 * Provides adjustable weights and parameters for the suggestion engine.
 * Allows GMs to customize how suggestions are weighted based on their
 * campaign's meta, house rules, or player preferences.
 *
 * Features:
 * - Adjustable tier weights
 * - Prestige class priority multipliers
 * - Theme emphasis controls
 * - Custom synergy overrides
 */

import { SWSELogger } from '../utils/logger.js';
import SWSEFormApplication from '../apps/base/swse-form-application.js';

// ──────────────────────────────────────────────────────────────
// DEFAULT META TUNING VALUES
// ──────────────────────────────────────────────────────────────

export const DEFAULT_META_TUNING = {
    // Tier weight multipliers (1.0 = default, higher = more important)
    tierWeights: {
        prestigePrereq: 1.0,
        chainContinuation: 1.0,
        skillMatch: 1.0,
        abilityMatch: 1.0,
        classSynergy: 1.0
    },

    // Class suggestion tier weights
    classTierWeights: {
        prestigeNow: 1.0,
        pathContinuation: 1.0,
        prestigeSoon: 1.0,
        mechanicalSynergy: 1.0,
        thematic: 1.0
    },

    // Prestige class priority (0 = disabled, 1 = normal, 2 = high priority)
    prestigePriority: 1.0,

    // Theme emphasis weights
    themeEmphasis: {
        force: 1.0,
        ranged: 1.0,
        melee: 1.0,
        stealth: 1.0,
        social: 1.0,
        tech: 1.0,
        leadership: 1.0,
        exploration: 1.0,
        vehicle: 1.0,
        support: 1.0,
        combat: 1.0,
        tracking: 1.0
    },

    // Suggestion display options
    display: {
        showPrestigeRoadmap: true,
        showPathPreview: true,
        showSuggestionBadges: true,
        showMissingPrereqs: true,
        maxSuggestionsPerCategory: 5
    },

    // Advanced tuning
    advanced: {
        // Minimum confidence for prestige affinity suggestions
        prestigeConfidenceThreshold: 0.3,
        // How many levels ahead to show in path preview
        pathPreviewLevels: 5,
        // Weight given to already-owned items in chain detection
        chainBonus: 1.5,
        // Bonus for matching primary themes
        primaryThemeBonus: 1.2
    }
};

// ──────────────────────────────────────────────────────────────
// META TUNING MANAGER
// ──────────────────────────────────────────────────────────────

export class MetaTuning {

    /**
     * Get the current meta tuning configuration
     * @returns {Object} Current tuning configuration
     */
    static getConfig() {
        try {
            const stored = game.settings.get('foundryvtt-swse', 'suggestionMetaTuning');
            if (stored && typeof stored === 'object') {
                return foundry.utils.mergeObject(
                    foundry.utils.deepClone(DEFAULT_META_TUNING),
                    stored
                );
            }
        } catch (err) {
            SWSELogger.debug('MetaTuning | Using default config');
        }
        return foundry.utils.deepClone(DEFAULT_META_TUNING);
    }

    /**
     * Save meta tuning configuration
     * @param {Object} config - Configuration to save
     */
    static async saveConfig(config) {
        await game.settings.set('foundryvtt-swse', 'suggestionMetaTuning', config);
        SWSELogger.log('MetaTuning | Configuration saved');
    }

    /**
     * Reset to default configuration
     */
    static async resetToDefaults() {
        await game.settings.set('foundryvtt-swse', 'suggestionMetaTuning', {});
        SWSELogger.log('MetaTuning | Reset to defaults');
    }

    /**
     * Get a specific tuning value
     * @param {string} path - Dot-notation path to value (e.g., 'tierWeights.chainContinuation')
     * @returns {*} The tuning value
     */
    static getValue(path) {
        const config = this.getConfig();
        const parts = path.split('.');
        let value = config;
        for (const part of parts) {
            if (value === undefined) {return undefined;}
            value = value[part];
        }
        return value;
    }

    /**
     * Apply tier weight to a suggestion score
     * @param {number} baseTier - Base tier value
     * @param {string} tierType - Type of tier (e.g., 'prestigePrereq')
     * @returns {number} Weighted tier value
     */
    static applyTierWeight(baseTier, tierType) {
        const config = this.getConfig();
        const weight = config.tierWeights[tierType] || 1.0;
        return baseTier * weight;
    }

    /**
     * Apply class tier weight
     * @param {number} baseTier - Base tier value
     * @param {string} tierType - Type of class tier
     * @returns {number} Weighted tier value
     */
    static applyClassTierWeight(baseTier, tierType) {
        const config = this.getConfig();
        const weight = config.classTierWeights[tierType] || 1.0;
        return baseTier * weight;
    }

    /**
     * Get prestige priority multiplier
     * @returns {number} Priority multiplier
     */
    static getPrestigePriority() {
        return this.getConfig().prestigePriority;
    }

    /**
     * Get theme emphasis weight
     * @param {string} theme - Theme name
     * @returns {number} Emphasis weight
     */
    static getThemeEmphasis(theme) {
        const config = this.getConfig();
        return config.themeEmphasis[theme] || 1.0;
    }

    /**
     * Check if a display feature is enabled
     * @param {string} feature - Feature name
     * @returns {boolean}
     */
    static isDisplayEnabled(feature) {
        const config = this.getConfig();
        return config.display[feature] !== false;
    }

    /**
     * Get advanced tuning value
     * @param {string} key - Advanced tuning key
     * @returns {*}
     */
    static getAdvanced(key) {
        const config = this.getConfig();
        return config.advanced[key];
    }
}

// ──────────────────────────────────────────────────────────────
// SETTINGS REGISTRATION
// ──────────────────────────────────────────────────────────────

/**
 * Register meta tuning settings
 */
export function registerMetaTuningSettings() {
    // Main meta tuning object setting
    game.settings.register('foundryvtt-swse', 'suggestionMetaTuning', {
        name: 'Suggestion Engine Meta Tuning',
        hint: 'Advanced configuration for the suggestion engine',
        scope: 'world',
        config: false,
        type: Object,
        default: {}
    });

    // Register the settings menu
    game.settings.registerMenu('foundryvtt-swse', 'metaTuningMenu', {
        name: 'Suggestion Engine Tuning',
        label: 'Configure Suggestion Engine',
        hint: 'Adjust weights and parameters for feat, talent, and class suggestions',
        icon: 'fas fa-sliders-h',
        type: MetaTuningConfig,
        restricted: true
    });
}

// ──────────────────────────────────────────────────────────────
// META TUNING CONFIGURATION UI
// ──────────────────────────────────────────────────────────────

/**
 * Meta Tuning Configuration Application
 */
export class MetaTuningConfig extends SWSEFormApplication {

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
        SWSEFormApplication.DEFAULT_OPTIONS ?? {},
        {
            id: 'swse-meta-tuning-config',
            classes: ['swse', 'swse-app', 'meta-tuning-config'],
            template: 'systems/foundryvtt-swse/templates/apps/meta-tuning-config.hbs',
            position: { width: 600, height: 700 },
            resizable: true,
            title: 'Suggestion Engine Configuration',
            tabs: [{ navSelector: '.config-tabs', contentSelector: '.config-content', initial: 'tiers' }],
            closeOnSubmit: true
        }
    );


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }
async _prepareContext(options) {
        const data = await super._prepareContext(options);
        data.config = MetaTuning.getConfig();
        data.defaults = DEFAULT_META_TUNING;
        return data;
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);
        await MetaTuning.saveConfig(expandedData);
        ui.notifications.info('Suggestion engine configuration saved');
    }

    async _onRender(context, options) {
        const root = this.element;
        if (!(root instanceof HTMLElement)) {return;}

        // Reset button
        const resetBtn = root.querySelector('.reset-defaults');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                const confirmed = await SWSEDialogV2.confirm({
                    title: 'Reset to Defaults',
                    content: '<p>Reset all suggestion engine settings to defaults?</p>'
                });
                if (confirmed) {
                    await MetaTuning.resetToDefaults();
                    this.render(true);
                    ui.notifications.info('Settings reset to defaults');
                }
            });
        }

        // Slider value display update
        root.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', event => {
                const valueDisplay = event.currentTarget.parentElement.querySelector('.slider-value');
                if (valueDisplay) {
                    valueDisplay.textContent = event.currentTarget.value;
                }
            });
        });

        // Preset buttons
        root.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', event => {
                const preset = event.currentTarget.dataset.preset;
                this._applyPreset(preset);
            });
        });
    }

    /**
     * Apply a configuration preset
     * @param {string} preset - Preset name
     */
    _applyPreset(preset) {
        const presets = {
            balanced: DEFAULT_META_TUNING,
            prestigeFocused: {
                ...DEFAULT_META_TUNING,
                prestigePriority: 2.0,
                tierWeights: {
                    ...DEFAULT_META_TUNING.tierWeights,
                    prestigePrereq: 1.5
                },
                classTierWeights: {
                    ...DEFAULT_META_TUNING.classTierWeights,
                    prestigeNow: 1.5,
                    prestigeSoon: 1.3
                }
            },
            combatOptimized: {
                ...DEFAULT_META_TUNING,
                themeEmphasis: {
                    ...DEFAULT_META_TUNING.themeEmphasis,
                    combat: 1.5,
                    ranged: 1.3,
                    melee: 1.3
                }
            },
            forceUser: {
                ...DEFAULT_META_TUNING,
                themeEmphasis: {
                    ...DEFAULT_META_TUNING.themeEmphasis,
                    force: 2.0
                }
            },
            roleplay: {
                ...DEFAULT_META_TUNING,
                themeEmphasis: {
                    ...DEFAULT_META_TUNING.themeEmphasis,
                    social: 1.5,
                    leadership: 1.3,
                    exploration: 1.2
                },
                prestigePriority: 0.5
            }
        };

        if (presets[preset]) {
            const form = this.element?.querySelector('form');
            if (form) {
                const flatData = foundry.utils.flattenObject(presets[preset]);
                for (const [key, value] of Object.entries(flatData)) {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) {
                        input.value = value;
                        if (input.type === 'range') {
                            const valueDisplay = input.parentElement.querySelector('.slider-value');
                            if (valueDisplay) {valueDisplay.textContent = value;}
                        }
                    }
                }
            }
            ui.notifications.info(`Applied "${preset}" preset`);
        }
    }
}

export default MetaTuning;
