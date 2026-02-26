/**
 * PHASE 4: Integrity Banner
 * Sheet-level UI component for displaying prerequisite violations
 *
 * Displays at the top of character sheets:
 * - Warning icon + violation count
 * - "Fix Issues" button linking to RebuildOrchestrator
 * - Governance badge (OM/FB) if applicable
 *
 * This is READ-ONLY UI. Does not compute legality.
 * Only reads from MissingPrereqsTracker.
 */

import { GovernanceSystem } from '../governance-system.js';
import { MissingPrereqsTracker } from '../integrity/missing-prereqs-tracker.js';
import { RebuildOrchestrator } from './rebuild-orchestrator.js';

export class IntegrityBanner {

  /**
   * Prepare context for banner rendering.
   * Called from sheet's prepareContext().
   * @static
   */
  static prepareBannerContext(actor, user = game.user) {
    if (!actor) return null;

    GovernanceSystem.initializeGovernance(actor);

    const tracking = MissingPrereqsTracker.getMissingPrerequisites(actor);
    const brokenItems = tracking.brokenItems || [];
    const summary = tracking.summary || { count: 0, byType: {} };

    // Only show if there are violations
    if (brokenItems.length === 0) {
      return null;
    }

    // Check if user should see it
    if (!user.isGM && !this._shouldPlayerSeeBanner(actor, user)) {
      return null;
    }

    const governance = GovernanceSystem.getGoveranceBadge(actor);

    return {
      visible: true,
      count: brokenItems.length,
      summary: summary,
      brokenItems: brokenItems,
      governance: governance,
      canFix: user.isGM || actor.isOwner,
      enforcementActive: GovernanceSystem.isEnforcementActive(actor)
    };
  }

  /**
   * Determine if player should see integrity banner.
   * @private
   */
  static _shouldPlayerSeeBanner(actor, user) {
    // If user owns the actor, they always see it
    if (actor.isOwner) return true;

    // Otherwise, check visibility setting
    return GovernanceSystem.shouldShowGovernanceBadge(actor, user);
  }

  /**
   * Render the integrity banner as HTML.
   * Can be embedded in sheet template or rendered dynamically.
   * @static
   */
  static renderBannerHTML(actor, user = game.user) {
    const context = this.prepareBannerContext(actor, user);
    if (!context) return '';

    const violationText = context.count === 1 ? 'violation' : 'violations';
    const governance = context.governance
      ? ` <span class="swse-governance-badge ${context.governance.class}" title="${context.governance.title}">${context.governance.label}</span>`
      : '';

    const fixButton = context.canFix
      ? `<button class="swse-integrity-banner-fix" data-actor-id="${actor.id}">Fix Issues</button>`
      : '';

    return `
      <div class="swse-integrity-banner ${context.enforcementActive ? 'enforcement-active' : 'enforcement-inactive'}">
        <span class="swse-integrity-icon">⚠</span>
        <span class="swse-integrity-text">
          ${context.count} invalid ${violationText} detected.
          ${governance}
        </span>
        ${fixButton}
      </div>
    `;
  }

  /**
   * Attach click handlers to banner elements.
   * Call from sheet's activateListeners().
   * @static
   */
  static activateListeners(html, actor) {
    html.querySelector('.swse-integrity-banner-fix')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await RebuildOrchestrator.launch(actor);
    });
  }

  /**
   * Get summary text for banner.
   * @static
   */
  static getSummaryText(summary) {
    const items = [];

    for (const [type, count] of Object.entries(summary.byType || {})) {
      items.push(`${count} ${type}`);
    }

    return items.join(', ');
  }
}

// CSS for integrity banner (can be embedded in main stylesheet)
export const INTEGRITY_BANNER_STYLES = `
.swse-integrity-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin: 0 0 16px 0;
  border-left: 4px solid #d32f2f;
  background: #ffebee;
  border-radius: 2px;
  font-weight: 500;
  color: #c62828;
}

.swse-integrity-banner.enforcement-inactive {
  border-left-color: #f57c00;
  background: #ffe0b2;
  color: #e65100;
}

.swse-integrity-icon {
  font-size: 1.5em;
  flex-shrink: 0;
}

.swse-integrity-text {
  flex: 1;
  font-size: 0.95em;
}

.swse-integrity-banner-fix {
  padding: 6px 12px;
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 2px;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.85em;
  transition: background 0.2s;
  white-space: nowrap;
}

.swse-integrity-banner-fix:hover {
  background: #b71c1c;
}

.swse-governance-badge {
  display: inline-block;
  padding: 2px 6px;
  margin-left: 4px;
  border-radius: 2px;
  font-size: 0.75em;
  font-weight: 700;
  font-family: monospace;
  letter-spacing: 0.5px;
}

.swse-governance-badge.swse-governance-freebuild {
  background: #4caf50;
  color: white;
}

.swse-governance-badge.swse-governance-override {
  background: #2196f3;
  color: white;
}
`;
