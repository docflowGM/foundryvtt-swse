/**
 * Tooltip Discovery System - Phase 6 First-Run Enhancement
 *
 * Progressive disclosure tooltips with:
 * - Enhanced first-view content (references welcome concepts)
 * - Suggested tooltips after welcome
 * - Discovery tracking
 * - Smart highlights for key UI elements
 *
 * Usage:
 *   Automatically initialized when first-run experience completes
 *   Or: SWSETooltips.suggestTooltips()
 */

import { SWSELogger } from '../utils/logger.js';

const SYSTEM_ID = 'foundryvtt-swse';
const SETTING_KEY = 'tooltips-discovered';

/**
 * Enhanced tooltip content with context and references
 * Maps tooltip selectors to enhanced descriptions
 */
const ENHANCED_TOOLTIPS = {
  '[data-tooltip-key="chargen-start"]': {
    basic: 'Create a new character',
    enhanced: `Start guided character generation. This walks you through:
      • Choosing species and class
      • Distributing ability scores
      • Selecting talents and force powers
      • Adding equipment

      The system auto-calculates skills, defenses, and BAB.`,
    relatedConcepts: ['chargen', 'mentor-system'],
    keyButton: true,
    suggestionPriority: 1
  },

  '[data-tooltip-key="levelup-button"]': {
    basic: 'Advance character to next level',
    enhanced: `Guided advancement system. Choose:
      • Class features and abilities
      • New talent or prestige path
      • Bonus feats and force powers

      Recommendations based on your choices.`,
    relatedConcepts: ['levelup-system', 'talent-tree'],
    keyButton: true,
    suggestionPriority: 2
  },

  '[data-tooltip-key="combat-action"]': {
    basic: 'Initiate combat action',
    enhanced: `Quick-access combat buttons provide:
      • Automatic skill and feat calculations
      • Damage roll suggestions
      • Action suggestions from AI
      • Automatic effect application

      Right-click for advanced options.`,
    relatedConcepts: ['combat-automation', 'action-palette'],
    keyButton: true,
    suggestionPriority: 3
  },

  '[data-tooltip-key="talents-tab"]': {
    basic: 'View character talents',
    enhanced: `Talents provide class-specific abilities. This tab shows:
      • All unlocked talents
      • Talent tree progression
      • Descriptions and mechanics
      • Upgrades available

      Use talent tree to plan advancement.`,
    relatedConcepts: ['talent-tree', 'levelup-system'],
    keyButton: false,
    suggestionPriority: 4
  },

  '[data-tooltip-key="force-powers"]': {
    basic: 'Manage Force powers',
    enhanced: `The Force power system includes:
      • Force power selection
      • Manifestation and usage
      • Resource tracking (Force Points)
      • Upgraded Force powers

      Only available to Force-sensitive classes.`,
    relatedConcepts: ['force-powers'],
    keyButton: false,
    suggestionPriority: 5
  },

  '[data-tooltip-key="defenses"]': {
    basic: 'Character defensive values',
    enhanced: `Defenses auto-calculate from:
      • Armor class worn
      • Dexterity modifier
      • Feats and talents
      • Active effects

      Values update automatically when equipment changes.`,
    relatedConcepts: ['auto-skills', 'active-effects'],
    keyButton: false,
    suggestionPriority: 6
  },

  '[data-tooltip-key="store-button"]': {
    basic: 'Browse item store',
    enhanced: `In-system item store for:
      • Weapons and armor
      • Equipment and gadgets
      • Consumables and miscellaneous

      Search and filter all available items. Add to inventory.`,
    relatedConcepts: ['store-ui', 'compendium-browser'],
    keyButton: false,
    suggestionPriority: 7
  }
};

/**
 * Get discovered tooltips for this world
 */
async function getDiscoveredTooltips() {
  try {
    const discovered = await game.settings.get(SYSTEM_ID, SETTING_KEY);
    return discovered || {};
  } catch {
    return {};
  }
}

/**
 * Mark tooltip as discovered
 */
async function markTooltipDiscovered(key) {
  try {
    const discovered = await getDiscoveredTooltips();
    discovered[key] = {
      discoveredAt: Date.now(),
      count: (discovered[key]?.count || 0) + 1
    };
    await game.settings.set(SYSTEM_ID, SETTING_KEY, discovered);
  } catch (err) {
    SWSELogger.warn('Failed to mark tooltip discovered:', err.message);
  }
}

/**
 * Get enhanced tooltip content
 * Returns basic on first view, adds enhanced context after
 */
export function getEnhancedTooltip(key) {
  const tooltip = ENHANCED_TOOLTIPS[key];
  if (!tooltip) return null;

  return {
    key,
    basic: tooltip.basic,
    enhanced: tooltip.enhanced,
    isKeyButton: tooltip.keyButton,
    priority: tooltip.suggestionPriority,
    concepts: tooltip.relatedConcepts
  };
}

/**
 * Get suggested tooltips (key UI elements user hasn't seen)
 */
export async function getSuggestedTooltips(limit = 3) {
  const discovered = await getDiscoveredTooltips();

  const suggestions = Object.entries(ENHANCED_TOOLTIPS)
    .filter(([key, tooltip]) => {
      // Only suggest key buttons that haven't been discovered
      return tooltip.keyButton && !discovered[key];
    })
    .sort((a, b) => a[1].suggestionPriority - b[1].suggestionPriority)
    .slice(0, limit)
    .map(([key, tooltip]) => ({
      key,
      selector: key,
      suggestion: tooltip.basic,
      enhanced: tooltip.enhanced,
      concepts: tooltip.relatedConcepts
    }));

  return suggestions;
}

/**
 * Show tooltip suggestion overlay
 * Highlights a button and shows enhanced description
 */
function showTooltipSuggestion(element, tooltip) {
  if (!element) return;

  // Highlight element
  element.classList.add('swse-tooltip-suggestion');
  element.setAttribute('data-suggestion-highlight', 'true');

  // Create popover with enhanced content
  const popover = document.createElement('div');
  popover.className = 'swse-tooltip-popover swse-tooltip-suggestion-popover';
  popover.innerHTML = `
    <div class="swse-tooltip-header">
      <span class="swse-tooltip-icon">💡</span>
      <strong>Try this:</strong>
    </div>
    <div class="swse-tooltip-content">
      <p>${tooltip.enhanced}</p>
    </div>
    <div class="swse-tooltip-footer">
      <button class="swse-tooltip-dismiss">Got it</button>
    </div>
  `;

  // Position popover
  const rect = element.getBoundingClientRect();
  popover.style.position = 'fixed';
  popover.style.left = Math.max(10, rect.right + 10) + 'px';
  popover.style.top = (rect.top + rect.height / 2 - 50) + 'px';

  document.body.appendChild(popover);

  // Dismiss handler
  popover.querySelector('.swse-tooltip-dismiss').addEventListener('click', () => {
    element.classList.remove('swse-tooltip-suggestion');
    element.removeAttribute('data-suggestion-highlight');
    popover.remove();
    markTooltipDiscovered(tooltip.key);
  });

  return popover;
}

/**
 * Start progressive tooltip discovery sequence
 * Shows suggestions after welcome completes
 */
export async function startTooltipDiscoverySequence() {
  if (!game?.user?.isGM) return;

  // Wait a bit for UI to settle
  await new Promise(resolve => setTimeout(resolve, 1000));

  const suggestions = await getSuggestedTooltips(3);
  if (suggestions.length === 0) {
    SWSELogger.log('No tooltip suggestions - user has explored all key elements');
    return;
  }

  SWSELogger.log(`Showing ${suggestions.length} tooltip suggestions`);

  // Show suggestions one at a time
  for (const suggestion of suggestions) {
    const element = document.querySelector(suggestion.selector);
    if (element) {
      showTooltipSuggestion(element, suggestion);
      // Wait for dismissal or timeout
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

/**
 * Register tooltip discovery settings
 */
export function registerTooltipSettings() {
  game.settings.register(SYSTEM_ID, SETTING_KEY, {
    name: 'Discovered Tooltips',
    hint: 'Tracks which tooltips user has discovered (internal)',
    scope: 'world',
    config: false,
    type: Object,
    default: {}
  });
}

/**
 * Add CSS for tooltip enhancements
 */
export function injectTooltipStyles() {
  if (document.querySelector('style[data-swse-tooltips]')) {
    return; // Already injected
  }

  const style = document.createElement('style');
  style.setAttribute('data-swse-tooltips', 'true');
  style.textContent = `
    /* Tooltip suggestion highlight */
    [data-suggestion-highlight="true"] {
      animation: swse-pulse-glow 1s infinite;
      box-shadow: 0 0 12px rgba(0, 229, 255, 0.6);
    }

    @keyframes swse-pulse-glow {
      0%, 100% { box-shadow: 0 0 12px rgba(0, 229, 255, 0.6); }
      50% { box-shadow: 0 0 20px rgba(0, 229, 255, 0.9); }
    }

    /* Tooltip popover styling */
    .swse-tooltip-popover {
      background: var(--color-bg-alt, #1a1a1a);
      border: 2px solid var(--color-primary, #00e5ff);
      border-radius: 8px;
      padding: 12px;
      max-width: 280px;
      box-shadow: 0 4px 16px rgba(0, 229, 255, 0.3);
      z-index: 10000;
      font-family: var(--font-family);
    }

    .swse-tooltip-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--color-primary, #00e5ff);
      font-weight: bold;
    }

    .swse-tooltip-icon {
      font-size: 1.2em;
    }

    .swse-tooltip-content {
      font-size: 0.95em;
      line-height: 1.5;
      color: var(--color-text, #ccc);
      margin-bottom: 12px;
    }

    .swse-tooltip-content p {
      margin: 0;
      white-space: pre-wrap;
    }

    .swse-tooltip-footer {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .swse-tooltip-dismiss {
      padding: 6px 12px;
      background: var(--color-primary, #00e5ff);
      color: #000;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 0.9em;
      transition: all 0.2s;
    }

    .swse-tooltip-dismiss:hover {
      background: var(--color-primary-light, #33f0ff);
      transform: scale(1.05);
    }

    .swse-tooltip-dismiss:active {
      transform: scale(0.95);
    }
  `;

  document.head.appendChild(style);
}

/**
 * Make available to console
 */
export function registerTooltipDiscoveryConsole() {
  if (typeof window !== 'undefined') {
    window.SWSETooltips = {
      getEnhancedTooltip,
      getSuggestedTooltips,
      startDiscoverySequence: startTooltipDiscoverySequence,
      markDiscovered: markTooltipDiscovered,
      getDiscovered: getDiscoveredTooltips,
      resetDiscovery: async () => {
        await game.settings.set(SYSTEM_ID, SETTING_KEY, {});
        SWSELogger.log('Tooltip discovery reset - suggestions will show again');
      }
    };
  }
}

/**
 * Integration with first-run experience
 * Call after welcome dialog closes
 */
export async function initializeTooltipDiscovery() {
  if (!game?.user?.isGM) return;

  try {
    injectTooltipStyles();
    registerTooltipDiscoveryConsole();

    // Start suggestion sequence with delay
    setTimeout(() => {
      startTooltipDiscoverySequence();
    }, 2000);

    SWSELogger.log('Tooltip discovery system initialized');
  } catch (err) {
    SWSELogger.error('Failed to initialize tooltip discovery:', err.message);
  }
}
