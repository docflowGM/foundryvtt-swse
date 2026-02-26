/**
 * PHASE 4: Rebuild Orchestrator
 * Modal for listing and fixing invalid item selections
 *
 * Displays a table of:
 * - Item name, type, missing prerequisites
 * - Action buttons (Remove, Navigate to replacement, View details)
 *
 * After each action:
 * - Routes mutation through ActorEngine
 * - Integrity checker re-runs automatically
 * - Modal updates live
 *
 * Closes when actor.system.missingPrerequisites is empty.
 */

import { SWSELogger } from '../../utils/logger.js';
import { ActorEngine } from '../actor-engine/actor-engine.js';
import { MissingPrereqsTracker } from '../integrity/missing-prereqs-tracker.js';
import { PrerequisiteIntegrityChecker } from '../integrity/prerequisite-integrity-checker.js';

export class RebuildOrchestrator {

  /**
   * Launch the rebuild modal for an actor.
   * @static
   */
  static async launch(actor) {
    if (!actor) throw new Error('RebuildOrchestrator.launch() requires an actor');

    // Check if already open
    if (this._activeOrchestrators.has(actor.id)) {
      SWSELogger.warn('[REBUILD] Orchestrator already open for', actor.name);
      return;
    }

    const modal = new RebuildOrchestratorModal(actor);
    this._activeOrchestrators.set(actor.id, modal);

    await modal.render(true);
  }

  // Track active orchestrators by actor ID
  static _activeOrchestrators = new Map();

  /**
   * Mark orchestrator as closed.
   * @static
   * @private
   */
  static _closeOrchestrator(actorId) {
    this._activeOrchestrators.delete(actorId);
  }
}

/**
 * Internal modal implementation.
 * @private
 */
class RebuildOrchestratorModal extends foundry.applications.api.DialogV2 {

  constructor(actor) {
    super({
      window: {
        title: `Fix Issues — ${actor.name}`,
        icon: 'fas fa-tools',
        resizable: true
      },
      buttons: [
        {
          action: 'close',
          label: 'Close',
          callback: () => this.close()
        }
      ]
    });

    this.actor = actor;
  }

  /**
   * Render dialog content.
   */
  async _renderHTML(options) {
    const tracking = MissingPrereqsTracker.getMissingPrerequisites(this.actor);
    const brokenItems = tracking.brokenItems || [];

    if (brokenItems.length === 0) {
      this.close();
      return '';
    }

    let tableRows = '';

    for (const item of brokenItems) {
      const itemId = item.itemId;
      const itemObj = this.actor.items.get(itemId);

      if (!itemObj) {
        SWSELogger.warn('[REBUILD] Item not found:', itemId);
        continue;
      }

      const missingPrereqsText = (item.missingPrereqs || []).join(', ') || 'Unknown';
      const severityClass = item.severity === 'error' ? 'swse-severity-error' : 'swse-severity-warning';

      tableRows += `
        <tr class="swse-rebuild-item ${severityClass}">
          <td class="swse-item-name">
            <span class="swse-item-icon">${this._getItemIcon(itemObj)}</span>
            <span class="swse-item-label">${itemObj.name}</span>
          </td>
          <td class="swse-item-type">${itemObj.type}</td>
          <td class="swse-missing-prereqs">${missingPrereqsText}</td>
          <td class="swse-item-actions">
            <button class="swse-action-remove" data-item-id="${itemId}" title="Remove this item">
              <i class="fas fa-trash"></i> Remove
            </button>
            <button class="swse-action-details" data-item-id="${itemId}" title="View item details">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }

    const html = `
      <div class="swse-rebuild-orchestrator">
        <p class="swse-rebuild-header">
          You have ${brokenItems.length} item${brokenItems.length === 1 ? '' : 's'} with unmet prerequisites.
          Select items to remove or view details.
        </p>

        <table class="swse-rebuild-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Missing Prerequisites</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="swse-rebuild-footer">
          <em>Note: Removing an item cannot be undone. Changes are permanent.</em>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Get icon for item type.
   * @private
   */
  _getItemIcon(item) {
    const icons = {
      feat: 'fas fa-star',
      talent: 'fas fa-sparkles',
      forcePower: 'fas fa-explosion',
      forceTechnique: 'fas fa-wand-magic-sparkles',
      forceSecret: 'fas fa-mask',
      species: 'fas fa-user',
      class: 'fas fa-briefcase'
    };

    return `<i class="${icons[item.type] || 'fas fa-cube'}"></i>`;
  }

  /**
   * Attach event listeners.
   */
  activateListeners(html) {
    // Remove button
    html.querySelectorAll('.swse-action-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = btn.dataset.itemId;
        this._handleRemoveItem(itemId);
      });
    });

    // Details button
    html.querySelectorAll('.swse-action-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = btn.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) {
          item.sheet.render(true);
        }
      });
    });
  }

  /**
   * Handle item removal.
   * Routes through ActorEngine.
   * @private
   */
  async _handleRemoveItem(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) {
      SWSELogger.error('[REBUILD] Item not found:', itemId);
      return;
    }

    // Confirm removal
    const confirm = await new Promise((resolve) => {
      new foundry.applications.api.DialogV2({
        window: {
          title: 'Confirm Removal',
          icon: 'fas fa-exclamation'
        },
        content: `<p>Are you sure you want to remove <strong>${item.name}</strong>?</p>`,
        buttons: [
          {
            action: 'confirm',
            label: 'Remove',
            callback: () => resolve(true)
          },
          {
            action: 'cancel',
            label: 'Cancel',
            callback: () => resolve(false)
          }
        ]
      }).render(true);
    });

    if (!confirm) return;

    try {
      // Delete through ActorEngine
      // This will trigger integrity checker automatically
      await ActorEngine.deleteEmbeddedDocuments(this.actor, 'Item', [itemId]);

      SWSELogger.log('[REBUILD] Item removed:', {
        actor: this.actor.name,
        item: item.name,
        itemId
      });

      // Re-render modal (will close if no more violations)
      await this._renderHTML({});
      this.render(false);

    } catch (err) {
      SWSELogger.error('[REBUILD] Failed to remove item:', err);
      ui.notifications.error(`Failed to remove ${item.name}`);
    }
  }

  /**
   * Override close to clean up.
   */
  async close(options = {}) {
    RebuildOrchestrator._closeOrchestrator(this.actor.id);
    return super.close(options);
  }
}

// CSS for rebuild orchestrator
export const REBUILD_ORCHESTRATOR_STYLES = `
.swse-rebuild-orchestrator {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.swse-rebuild-header {
  margin: 0 0 16px 0;
  font-size: 0.95em;
  color: #333;
}

.swse-rebuild-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  background: white;
  border: 1px solid #ddd;
}

.swse-rebuild-table thead {
  background: #f5f5f5;
  font-weight: 600;
  border-bottom: 2px solid #ddd;
}

.swse-rebuild-table th {
  padding: 8px 12px;
  text-align: left;
  font-size: 0.85em;
  color: #555;
}

.swse-rebuild-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
  font-size: 0.9em;
}

.swse-rebuild-table tbody tr:hover {
  background: #f9f9f9;
}

.swse-rebuild-item.swse-severity-error {
  background: #ffebee;
}

.swse-rebuild-item.swse-severity-warning {
  background: #fff3e0;
}

.swse-item-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.swse-item-icon {
  font-size: 1.1em;
  color: #666;
}

.swse-item-label {
  color: #333;
}

.swse-item-type {
  color: #666;
  font-size: 0.85em;
  text-transform: capitalize;
}

.swse-missing-prereqs {
  color: #d32f2f;
  font-weight: 500;
  font-size: 0.85em;
}

.swse-item-actions {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}

.swse-action-remove,
.swse-action-details {
  padding: 4px 8px;
  border: none;
  border-radius: 2px;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.2s;
}

.swse-action-remove {
  background: #d32f2f;
  color: white;
}

.swse-action-remove:hover {
  background: #b71c1c;
}

.swse-action-details {
  background: #2196f3;
  color: white;
}

.swse-action-details:hover {
  background: #1976d2;
}

.swse-rebuild-footer {
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 2px;
  font-size: 0.85em;
  color: #856404;
}
`;
