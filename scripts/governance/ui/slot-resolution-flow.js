/**
 * PHASE 4: Slot Resolution Flow
 * Handles slot overflow when slots disappear (e.g., species change)
 *
 * When a slot changes:
 * 1. Detect overflow (total filled > total available)
 * 2. Enter resolution mode
 * 3. Player chooses which items to remove
 * 4. Route mutations through ActorEngine
 * 5. Integrity re-evaluates
 *
 * Refund rule:
 * Only refund slot if slot still structurally exists.
 * If slot no longer exists (species bonus lost), no refund.
 */

import { SWSELogger } from '../utils/logger.js';
import { ActorEngine } from '../actor-engine/actor-engine.js';

export class SlotResolutionFlow {

  /**
   * Detect if an actor has slot overflow.
   * Compare total slots vs total items in each category.
   * @static
   */
  static detectOverflow(actor, slotChanges = {}) {
    if (!actor) return { hasOverflow: false, overflowByType: {} };

    const overflowByType = {};
    let hasOverflow = false;

    // Check each slot type (feat, talent, etc.)
    const slotTypes = [
      { type: 'feat', key: 'feats', itemType: 'feat' },
      { type: 'talent', key: 'talents', itemType: 'talent' },
      { type: 'forcePower', key: 'forcePowers', itemType: 'forcePower' }
    ];

    for (const slotDef of slotTypes) {
      // Get slot availability (from progression or slotEngine)
      const availableSlots = this._getAvailableSlots(actor, slotDef.type);
      const filledSlots = actor.items.filter(i => i.type === slotDef.itemType).length;

      if (filledSlots > availableSlots) {
        overflowByType[slotDef.type] = {
          available: availableSlots,
          filled: filledSlots,
          excess: filledSlots - availableSlots
        };
        hasOverflow = true;
      }
    }

    return { hasOverflow, overflowByType };
  }

  /**
   * Get available slots for a type.
   * @private
   */
  static _getAvailableSlots(actor, slotType) {
    // This is a stub - actual implementation depends on SlotEngine
    // For now, read from actor.system.progression.slots or similar
    const slots = actor.system.progression?.slots || {};
    return slots[slotType] || 0;
  }

  /**
   * Launch slot resolution modal.
   * @static
   */
  static async launch(actor, overflowInfo) {
    if (!actor || !overflowInfo.hasOverflow) {
      return;
    }

    const modal = new SlotResolutionModal(actor, overflowInfo);
    await modal.render(true);
  }

  /**
   * Calculate refund for removed slot.
   * @static
   */
  static calculateRefund(actor, slotType, itemRemoved) {
    // Only refund if slot still structurally exists
    const slots = actor.system.progression?.slots || {};
    const slotExists = slots[slotType] !== undefined;

    if (!slotExists) {
      SWSELogger.log('[SLOT] No refund - slot no longer exists:', {
        actor: actor.name,
        slotType: slotType,
        itemRemoved: itemRemoved.name
      });
      return 0;
    }

    // If slot exists, refund 1 slot
    return 1;
  }
}

/**
 * Internal modal implementation.
 * @private
 */
class SlotResolutionModal extends foundry.applications.api.DialogV2 {

  constructor(actor, overflowInfo) {
    super({
      window: {
        title: `Resolve Slot Overflow — ${actor.name}`,
        icon: 'fas fa-object-group',
        resizable: true
      }
    });

    this.actor = actor;
    this.overflowInfo = overflowInfo;
  }

  /**
   * Render modal content.
   */
  async _renderHTML(options) {
    const { overflowByType } = this.overflowInfo;

    let content = `
      <div class="swse-slot-resolution">
        <p class="swse-resolution-header">
          <strong>You have excess items due to slot changes.</strong>
          <br/>
          Select items to remove to match available slots.
        </p>

        <div class="swse-overflow-sections">
    `;

    for (const [slotType, overflow] of Object.entries(overflowByType)) {
      const items = this.actor.items.filter(i => this._matchesSlotType(i, slotType));
      const excessCount = overflow.excess;

      content += `
        <div class="swse-overflow-section">
          <h3>${slotType.toUpperCase()}</h3>
          <p class="swse-overflow-stat">
            Available: ${overflow.available} | Have: ${overflow.filled} | Excess: ${excessCount}
          </p>
          <p class="swse-overflow-instruction">
            Select ${excessCount} item${excessCount === 1 ? '' : 's'} to remove:
          </p>
          <div class="swse-item-selector">
      `;

      for (const item of items) {
        content += `
          <label class="swse-item-choice">
            <input type="checkbox" name="remove-item" value="${item.id}">
            <span class="swse-item-label">${item.name}</span>
          </label>
        `;
      }

      content += `
          </div>
        </div>
      `;
    }

    content += `
        </div>

        <div class="swse-resolution-actions">
          <button class="swse-resolve-confirm" id="resolve-confirm">Confirm Removal</button>
          <button class="swse-resolve-cancel" id="resolve-cancel">Cancel</button>
        </div>
      </div>
    `;

    return content;
  }

  /**
   * Match item to slot type.
   * @private
   */
  _matchesSlotType(item, slotType) {
    const mapping = {
      feat: 'feat',
      talent: 'talent',
      forcePower: 'forcePower'
    };

    return item.type === mapping[slotType];
  }

  /**
   * Attach event listeners.
   */
  activateListeners(html) {
    html.getElementById('resolve-confirm')?.addEventListener('click', () => {
      this._handleConfirm();
    });

    html.getElementById('resolve-cancel')?.addEventListener('click', () => {
      this.close();
    });
  }

  /**
   * Handle confirmation.
   * @private
   */
  async _handleConfirm() {
    const selected = Array.from(
      document.querySelectorAll('input[name="remove-item"]:checked')
    ).map(el => el.value);

    if (selected.length === 0) {
      ui.notifications.warn('Please select items to remove');
      return;
    }

    try {
      // Delete through ActorEngine
      await ActorEngine.deleteEmbeddedDocuments(this.actor, 'Item', selected);

      SWSELogger.log('[SLOT-RESOLUTION] Items removed:', {
        actor: this.actor.name,
        count: selected.length
      });

      ui.notifications.info('Items removed successfully');
      this.close();

    } catch (err) {
      SWSELogger.error('[SLOT-RESOLUTION] Failed to remove items:', err);
      ui.notifications.error('Failed to remove items');
    }
  }
}

// CSS for slot resolution
export const SLOT_RESOLUTION_STYLES = `
.swse-slot-resolution {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.swse-resolution-header {
  margin: 0 0 16px 0;
  font-size: 0.95em;
  color: #333;
  line-height: 1.6;
}

.swse-overflow-sections {
  margin-bottom: 20px;
}

.swse-overflow-section {
  margin-bottom: 20px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 2px;
  background: #f9f9f9;
}

.swse-overflow-section h3 {
  margin: 0 0 8px 0;
  font-size: 0.95em;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.swse-overflow-stat {
  margin: 0 0 8px 0;
  font-size: 0.85em;
  color: #666;
  font-weight: 500;
}

.swse-overflow-instruction {
  margin: 8px 0;
  font-size: 0.85em;
  color: #666;
}

.swse-item-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.swse-item-choice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.2s;
}

.swse-item-choice:hover {
  background: #e8e8e8;
}

.swse-item-choice input {
  cursor: pointer;
}

.swse-item-label {
  font-size: 0.9em;
  color: #333;
}

.swse-resolution-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ddd;
}

.swse-resolve-confirm,
.swse-resolve-cancel {
  padding: 8px 16px;
  border: none;
  border-radius: 2px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.swse-resolve-confirm {
  background: #4caf50;
  color: white;
  flex: 1;
}

.swse-resolve-confirm:hover {
  background: #388e3c;
}

.swse-resolve-cancel {
  background: #e0e0e0;
  color: #333;
  flex: 0.5;
}

.swse-resolve-cancel:hover {
  background: #cccccc;
}
`;
