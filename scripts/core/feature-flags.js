/**
 * Feature Flags & Labels - Phase 6 Trust & Safety
 *
 * Provides a system for marking features as:
 * - Recommended: Core, well-tested features
 * - Advanced: Powerful features requiring expertise
 * - Experimental: New or unstable features
 *
 * Usage:
 *   getFeatureLabel('chargen') → 'Recommended'
 *   getFeatureStatus('talent-tree') → 'stable'
 *   featureIsEnabled('legacy-combat-system') → false (if experimental)
 */

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Feature registry with stability and recommendation levels
 */
const FEATURES = {
  // Character Generation
  chargen: {
    label: 'Recommended',
    status: 'stable',
    description: 'Guided character generation system'
  },
  'chargen-mentor': {
    label: 'Recommended',
    status: 'stable',
    description: 'In-app guidance during character creation'
  },

  // Combat
  'combat-automation': {
    label: 'Recommended',
    status: 'stable',
    description: 'Automatic attack roll calculation and action suggestions'
  },
  'vehicle-combat': {
    label: 'Advanced',
    status: 'stable',
    description: 'Vehicle-scale combat and starship rules'
  },

  // Progression
  'levelup-system': {
    label: 'Recommended',
    status: 'stable',
    description: 'Guided level-up and advancement'
  },
  'multiclass-support': {
    label: 'Advanced',
    status: 'stable',
    description: 'Multiclass character support'
  },
  'prestige-classes': {
    label: 'Advanced',
    status: 'stable',
    description: 'Prestige class progression'
  },

  // Force Powers
  'force-powers': {
    label: 'Recommended',
    status: 'stable',
    description: 'Force power system and manifestation'
  },
  'force-power-custom': {
    label: 'Advanced',
    status: 'experimental',
    description: 'Custom Force power creation and effects'
  },

  // Talents
  'talent-tree': {
    label: 'Advanced',
    status: 'stable',
    description: 'Talent tree visualization and selection'
  },
  'talent-tree-custom': {
    label: 'Advanced',
    status: 'experimental',
    description: 'Creating and importing custom talent trees'
  },

  // Automation
  'active-effects': {
    label: 'Recommended',
    status: 'stable',
    description: 'Automated effect application and bonuses'
  },
  'auto-skills': {
    label: 'Recommended',
    status: 'stable',
    description: 'Automatic skill calculation from attributes'
  },

  // UI & Tools
  'action-palette': {
    label: 'Recommended',
    status: 'stable',
    description: 'Quick-access combat action buttons'
  },
  'store-ui': {
    label: 'Advanced',
    status: 'stable',
    description: 'In-system item store interface'
  },
  'pdf-export': {
    label: 'Advanced',
    status: 'experimental',
    description: 'Character sheet PDF export'
  },

  // System Utilities
  'import-export': {
    label: 'Advanced',
    status: 'stable',
    description: 'Character import/export'
  },
  'compendium-browser': {
    label: 'Advanced',
    status: 'stable',
    description: 'Browse and search all system content'
  },

  // Experimental
  'destiny-system': {
    label: 'Advanced',
    status: 'experimental',
    description: 'Destiny point tracking and effects'
  },
  'follower-system': {
    label: 'Experimental',
    status: 'experimental',
    description: 'NPC follower and companion system'
  },
  'mentor-system': {
    label: 'Experimental',
    status: 'experimental',
    description: 'AI-assisted guidance and explanations'
  }
};

/**
 * Get feature label (Recommended, Advanced, Experimental)
 * @param {string} featureKey
 * @returns {string} Label or 'Unknown'
 */
export function getFeatureLabel(featureKey) {
  return FEATURES[featureKey]?.label || 'Unknown';
}

/**
 * Get feature status (stable, experimental, deprecated)
 * @param {string} featureKey
 * @returns {string} Status
 */
export function getFeatureStatus(featureKey) {
  return FEATURES[featureKey]?.status || 'unknown';
}

/**
 * Get feature description
 * @param {string} featureKey
 * @returns {string} Description
 */
export function getFeatureDescription(featureKey) {
  return FEATURES[featureKey]?.description || '';
}

/**
 * Check if feature is enabled (experimental features can be disabled)
 * @param {string} featureKey
 * @returns {boolean} True if enabled
 */
export function featureIsEnabled(featureKey) {
  const status = getFeatureStatus(featureKey);

  // Experimental features need explicit opt-in (currently all enabled for Phase 6)
  if (status === 'experimental') {
    try {
      const enabled = game?.settings?.get?.(SYSTEM_ID, `enable-${featureKey}`);
      return enabled !== false; // Default to enabled
    } catch {
      return true; // Default enabled
    }
  }

  // Stable features always enabled
  return status === 'stable' || status === 'deprecated';
}

/**
 * Get all features with specific label
 * @param {string} label - 'Recommended', 'Advanced', 'Experimental'
 * @returns {Array} Features with that label
 */
export function getFeaturesByLabel(label) {
  return Object.entries(FEATURES)
    .filter(([_, feature]) => feature.label === label)
    .map(([key, feature]) => ({ key, ...feature }));
}

/**
 * Format feature info for UI display
 * @param {string} featureKey
 * @returns {Object} {label, icon, color, description}
 */
export function getFeatureDisplayInfo(featureKey) {
  const feature = FEATURES[featureKey];
  if (!feature) {
    return {
      label: 'Unknown',
      icon: '❓',
      color: '#666',
      description: 'Unknown feature'
    };
  }

  const labelConfig = {
    Recommended: { icon: '✓', color: '#4CAF50' },
    Advanced: { icon: '⚙', color: '#FFC107' },
    Experimental: { icon: '⚗', color: '#FF9800' }
  };

  const config = labelConfig[feature.label] || { icon: '?', color: '#999' };

  return {
    label: feature.label,
    icon: config.icon,
    color: config.color,
    status: feature.status,
    description: feature.description,
    badge: `${config.icon} ${feature.label}`
  };
}

/**
 * Get all features
 * @returns {Object} All features by key
 */
export function getAllFeatures() {
  return foundry.utils.deepClone(FEATURES);
}

/**
 * Register feature-related settings
 */
export function registerFeatureSettings() {
  // Register experimental feature toggles
  const experimentalFeatures = getFeaturesByLabel('Experimental');
  for (const feature of experimentalFeatures) {
    game.settings.register(SYSTEM_ID, `enable-${feature.key}`, {
      name: `Enable: ${feature.description}`,
      hint: 'This is an experimental feature. Enable to use.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });
  }
}

/**
 * Create a feature badge for HTML display
 * @param {string} featureKey
 * @returns {string} HTML badge
 */
export function createFeatureBadge(featureKey) {
  const info = getFeatureDisplayInfo(featureKey);
  return `
    <span class="feature-badge feature-badge--${info.label.toLowerCase()}"
          title="${info.description}"
          style="color: ${info.color}">
      ${info.badge}
    </span>
  `;
}

/**
 * Make available to GM console
 */
export function registerFeatureFlagsConsole() {
  if (typeof window !== 'undefined') {
    window.SWSEFeatures = {
      getFeatureLabel,
      getFeatureStatus,
      getFeatureDescription,
      featureIsEnabled,
      getFeaturesByLabel,
      getFeatureDisplayInfo,
      getAllFeatures,
      createFeatureBadge
    };
  }
}
