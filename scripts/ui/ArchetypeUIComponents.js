/**
 * ArchetypeUIComponents
 *
 * Reusable UI components for displaying archetype information
 * in character sheets, dialogs, and tooltips.
 *
 * Components included:
 * - Affinity bar chart
 * - Prestige path recommendations dialog
 * - Archetype suggestion explanation tooltip
 * - Build identity card
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import {
  getActorAffinity,
  getPrimaryArchetype,
  formatAffinityForDisplay,
  getPrestigePathRecommendations
} from "/systems/foundryvtt-swse/scripts/engine/suggestion/ArchetypeSuggestionIntegration.js';

// ─────────────────────────────────────────────────────────────
// AFFINITY DISPLAY COMPONENT
// ─────────────────────────────────────────────────────────────

/**
 * Render archetype affinity bars
 *
 * Displays top 3 archetypes with colored progress bars
 *
 * @param {Actor} actor
 * @param {Object} options
 * @returns {Promise<string>} HTML snippet
 */
export async function renderAffinityBars(actor, options = {}) {
  try {
    const topN = options.topN || 3;
    const showPercent = options.showPercent !== false;

    const affinityResult = await getActorAffinity(actor);

    if (Object.keys(affinityResult.affinity).length === 0) {
      return '<p class="no-affinity">Character build not yet established.</p>';
    }

    const display = formatAffinityForDisplay(affinityResult.affinity, topN);

    let html = '<div class="affinity-bars">';

    for (const item of display) {
      const barLength = Math.round(item.score * 20); // 0-20 chars
      const barFull = '████'.repeat(Math.floor(barLength / 4));
      const barPart = ['', '▁', '▂', '▃'][Math.round((barLength % 4) * 3 / 4)] || '';
      const bar = (barFull + barPart).padEnd(5, '░');

      html += `
        <div class="affinity-bar-item">
          <div class="affinity-bar-name">${item.name}</div>
          <div class="affinity-bar-visual">${bar}</div>
          ${showPercent ? `<div class="affinity-bar-percent">${item.percentage}%</div>` : ''}
        </div>
      `;
    }

    html += '</div>';
    return html;
  } catch (err) {
    SWSELogger.warn('[ArchetypeUIComponents] Error rendering affinity bars:', err);
    return '<p class="error">Error loading affinity display.</p>';
  }
}

// ─────────────────────────────────────────────────────────────
// BUILD IDENTITY CARD
// ─────────────────────────────────────────────────────────────

/**
 * Render build identity card
 *
 * Displays primary archetype with description and prestige hints
 *
 * @param {Actor} actor
 * @returns {Promise<string>} HTML snippet
 */
export async function renderBuildIdentityCard(actor) {
  try {
    const primary = await getPrimaryArchetype(actor);

    if (!primary) {
      return `
        <div class="build-identity-card unspecialized">
          <h3>Build Identity</h3>
          <p>Character build not yet established.</p>
          <small>Build identity will form as you make selections.</small>
        </div>
      `;
    }

    const hints = await getPrestigePathRecommendations(actor);
    const prestigeHints = hints.filter(h => h.strength === 'primary');

    let html = `
      <div class="build-identity-card established">
        <h3>Build Identity</h3>
        <div class="build-identity-name">${primary.name}</div>
        <div class="build-identity-notes">${primary.notes}</div>
    `;

    if (prestigeHints.length > 0) {
      html += `
        <div class="build-identity-prestige">
          <h4>Prestige Path Recommendations</h4>
          <ul>
      `;

      for (const hint of prestigeHints) {
        const options = hint.prestigeOptions.join(' • ');
        html += `<li>${options}</li>`;
      }

      html += '</ul></div>';
    }

    html += '</div>';
    return html;
  } catch (err) {
    SWSELogger.warn('[ArchetypeUIComponents] Error rendering build identity card:', err);
    return '<p class="error">Error loading build identity.</p>';
  }
}

// ─────────────────────────────────────────────────────────────
// PRESTIGE PATH DIALOG
// ─────────────────────────────────────────────────────────────

/**
 * Create and show prestige path recommendations dialog
 *
 * @param {Actor} actor
 * @param {Object} options
 * @returns {Promise<void>}
 */
export async function showPrestigePathDialog(actor, options = {}) {
  try {
    const primary = await getPrimaryArchetype(actor);
    const allHints = await getPrestigePathRecommendations(actor);

    if (allHints.length === 0) {
      ui.notifications.info('No prestige paths currently available for this build.');
      return;
    }

    // Separate primary and secondary hints
    const primaryHints = allHints.filter(h => h.strength === 'primary');
    const secondaryHints = allHints.filter(h => h.strength === 'secondary');

    const html = `
      <div class="prestige-path-dialog">
        <h2>Prestige Path Recommendations</h2>

        ${primary ? `
          <div class="prestige-identity">
            <p><strong>Build Identity:</strong> ${primary.name}</p>
            <p>${primary.notes}</p>
          </div>
        ` : ''}

        ${primaryHints.length > 0 ? `
          <div class="prestige-hints-primary">
            <h3>Recommended Paths (Strong Alignment)</h3>
            ${primaryHints.map(hint => `
              <div class="prestige-hint-item primary">
                <h4>${hint.prestigeOptions.join(' • ')}</h4>
                <p>${hint.explanation}</p>
                <div class="prestige-hint-affinity">
                  Alignment: ${Math.round(hint.affinity * 100)}%
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${secondaryHints.length > 0 ? `
          <div class="prestige-hints-secondary">
            <h3>Alternative Paths (Partial Alignment)</h3>
            ${secondaryHints.map(hint => `
              <div class="prestige-hint-item secondary">
                <h4>${hint.prestigeOptions.join(' • ')}</h4>
                <p>${hint.explanation}</p>
                <div class="prestige-hint-affinity">
                  Alignment: ${Math.round(hint.affinity * 100)}%
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="prestige-note">
          <small>These are recommendations based on your current build. You can always
          choose a different prestige path if you prefer!</small>
        </div>
      </div>
    `;

    const dialog = new SWSEDialogV2({
      title: `Prestige Paths for ${actor.name}`,
      content: html,
      buttons: {
        close: {
          icon: '<i class="fa-solid fa-times"></i>',
          label: 'Close',
          callback: () => {}
        }
      },
      default: 'close'
    });

    dialog.render(true);
  } catch (err) {
    SWSELogger.error('[ArchetypeUIComponents] Error showing prestige dialog:', err);
    ui.notifications.error('Error loading prestige path recommendations.');
  }
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP/EXPLANATION COMPONENT
// ─────────────────────────────────────────────────────────────

/**
 * Render archetype explanation as tooltip hint
 *
 * Shows on hover or in suggestion details
 *
 * @param {string} explanation - Explanation text
 * @param {Object} options
 * @returns {string} HTML snippet
 */
export function renderExplanationTooltip(explanation, options = {}) {
  const icon = options.icon || '✨';
  const maxWidth = options.maxWidth || '300px';

  return `
    <div class="archetype-explanation-tooltip" style="max-width: ${maxWidth}">
      <span class="explanation-icon">${icon}</span>
      <span class="explanation-text">${explanation}</span>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// CHARACTER SHEET INTEGRATION
// ─────────────────────────────────────────────────────────────

/**
 * Register archetype UI section on character sheet
 *
 * Usage:
 * ```javascript
 * Hooks.on('renderApplicationV2', async (sheet) => {
 *   registerArchetypeUISection(sheet);
 * });
 * ```
 *
 * @param {ActorSheet} sheet
 * @returns {Promise<void>}
 */
export async function registerArchetypeUISection(sheet) {
  try {
    const actor = sheet.actor;

    if (!actor.isCharacter) {
      return;
    }

    // Find the target element (adjust selector as needed for your sheet)
    const targetElement = sheet.element.querySelector('.character-details, .sheet-body, .details-section');

    if (!targetElement) {
      SWSELogger.debug('[ArchetypeUIComponents] No suitable target element found for archetype UI');
      return;
    }

    // Render affinity section
    const affinityHtml = await renderAffinityBars(actor, { topN: 3 });
    const identityHtml = await renderBuildIdentityCard(actor);

    const fullHtml = `
      <section class="archetype-ui-section">
        <h3 class="archetype-section-title">
          <i class="fa-solid fa-compass"></i> Build Analysis
        </h3>

        <div class="archetype-ui-content">
          ${identityHtml}

          <div class="affinity-section">
            <h4>Archetype Affinity</h4>
            ${affinityHtml}
          </div>
        </div>
      </section>
    `;

    // Append to sheet
    targetElement.insertAdjacentHTML('beforeend', fullHtml);

    SWSELogger.log(`[ArchetypeUIComponents] Registered archetype UI for ${actor.name}`);
  } catch (err) {
    SWSELogger.error('[ArchetypeUIComponents] Error registering archetype UI:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// CSS STYLES (add to your stylesheet)
// ─────────────────────────────────────────────────────────────

/**
 * Add these styles to your CSS file:
 *
 * /.archetype-ui-section {
 *   border: 2px solid #8b4513;
 *   border-radius: 6px;
 *   padding: 16px;
 *   margin-bottom: 16px;
 *   background: linear-gradient(135deg, #fffbf0 0%, #f5e6d3 100%);
 * }
 *
 * .archetype-section-title {
 *   font-size: 18px;
 *   font-weight: bold;
 *   color: #654321;
 *   margin-bottom: 12px;
 * }
 *
 * .affinity-bars {
 *   display: flex;
 *   flex-direction: column;
 *   gap: 8px;
 * }
 *
 * .affinity-bar-item {
 *   display: flex;
 *   gap: 12px;
 *   align-items: center;
 * }
 *
 * .affinity-bar-name {
 *   min-width: 150px;
 *   font-weight: 500;
 * }
 *
 * .affinity-bar-visual {
 *   font-family: monospace;
 *   color: #ff8c00;
 *   font-weight: bold;
 * }
 *
 * .affinity-bar-percent {
 *   min-width: 40px;
 *   text-align: right;
 *   color: #666;
 * }
 *
 * .build-identity-card {
 *   background: white;
 *   border: 1px solid #ddd;
 *   border-radius: 4px;
 *   padding: 12px;
 *   margin-bottom: 12px;
 * }
 *
 * .build-identity-card.unspecialized {
 *   opacity: 0.7;
 *   font-style: italic;
 *   color: #999;
 * }
 *
 * .build-identity-card.established {
 *   background: #f0f8ff;
 *   border-color: #87ceeb;
 * }
 *
 * .build-identity-name {
 *   font-size: 18px;
 *   font-weight: bold;
 *   color: #0066cc;
 *   margin-bottom: 4px;
 * }
 *
 * .build-identity-notes {
 *   font-size: 13px;
 *   color: #333;
 *   margin-bottom: 8px;
 * }
 *
 * .build-identity-prestige h4 {
 *   font-size: 12px;
 *   font-weight: bold;
 *   color: #666;
 *   margin-bottom: 4px;
 * }
 *
 * .build-identity-prestige ul {
 *   margin: 0;
 *   padding-left: 16px;
 *   font-size: 12px;
 * }
 *
 * .prestige-path-dialog {
 *   padding: 16px;
 * }
 *
 * .prestige-identity {
 *   background: #e8f4f8;
 *   border-left: 4px solid #0088cc;
 *   padding: 12px;
 *   margin-bottom: 16px;
 *   border-radius: 4px;
 * }
 *
 * .prestige-hints-primary {
 *   margin-bottom: 16px;
 * }
 *
 * .prestige-hints-secondary {
 *   opacity: 0.85;
 * }
 *
 * .prestige-hint-item {
 *   background: white;
 *   border: 1px solid #ddd;
 *   border-radius: 4px;
 *   padding: 12px;
 *   margin-bottom: 8px;
 * }
 *
 * .prestige-hint-item.primary {
 *   border-left: 4px solid #ffb600;
 *   background: #fffbf0;
 * }
 *
 * .prestige-hint-item.secondary {
 *   border-left: 4px solid #ccc;
 * }
 *
 * .prestige-hint-item h4 {
 *   margin: 0 0 6px 0;
 *   font-size: 14px;
 * }
 *
 * .prestige-hint-item p {
 *   margin: 0 0 6px 0;
 *   font-size: 12px;
 *   color: #333;
 * }
 *
 * .prestige-hint-affinity {
 *   font-size: 11px;
 *   color: #666;
 * }
 *
 * .prestige-note {
 *   background: #f5f5f5;
 *   border: 1px solid #ddd;
 *   border-radius: 4px;
 *   padding: 8px;
 *   margin-top: 16px;
 *   text-align: center;
 *   color: #666;
 * }
 *
 * .archetype-explanation-tooltip {
 *   display: inline-flex;
 *   gap: 6px;
 *   align-items: center;
 *   background: #fffbf0;
 *   border: 1px solid #ffb600;
 *   border-radius: 4px;
 *   padding: 8px;
 *   font-size: 12px;
 * }
 *
 * .explanation-icon {
 *   flex-shrink: 0;
 * }
 *
 * .explanation-text {
 *   color: #333;
 * }
 */
