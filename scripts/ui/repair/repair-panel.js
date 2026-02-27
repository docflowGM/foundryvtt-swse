/**
 * PHASE 5C-5: Repair Panel UI
 *
 * Application for viewing and applying repairs.
 *
 * Display:
 *   - Actor integrity status
 *   - Violation list
 *   - Repair proposals
 *   - Action buttons
 *
 * Integration:
 *   - Calls ActorRepairEngine for analysis
 *   - Calls ActorEngine for execution
 *   - Shows governance context
 */

import { ActorRepairEngine } from '../../engine/repair/actor-repair-engine.js';
import { IntegrityDashboard } from '../../governance/ui/integrity-dashboard.js';
import { GovernanceSystem } from '../../governance/governance-system.js';
import { SWSELogger } from '../../utils/logger.js';

export class RepairPanel extends Application {
  constructor(actor, options = {}) {
    super(options);

    if (!actor) {
      throw new Error('RepairPanel requires an actor');
    }

    this.actor = actor;
    this.analysis = null;
    this.dashboard = null;
  }

  /**
   * Default application options
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'repair-panel',
      template: 'modules/foundryvtt-swse/templates/repair-panel.html',
      width: 600,
      height: 800,
      resizable: true,
      minimizable: true,
      title: 'Character Integrity & Repair'
    });
  }

  /**
   * Prepare data for rendering
   */
  async getData() {
    // Get integrity analysis
    this.dashboard = IntegrityDashboard.getState(this.actor);
    this.analysis = ActorRepairEngine.analyze(this.actor);

    // Get governance info
    const governance = GovernanceSystem.initializeGovernance(this.actor);

    return {
      actor: this.actor,
      dashboard: this.dashboard,
      analysis: this.analysis,
      governance: {
        mode: governance.enforcementMode,
        modeLabel: this._getModeLabel(governance.enforcementMode),
        approvedBy: governance.approvedBy,
        reason: governance.reason
      },
      canRepair: game.user.isGM,
      isCompliant: this.dashboard.compliance.isCompliant,
      severityColor: this._getSeverityColor(this.dashboard.severity.overall),
      recommendations: this.dashboard.recommendations
    };
  }

  /**
   * Activate event listeners
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Apply individual proposals
    html.on('click', '[data-action="apply-proposal"]', async (e) => {
      const proposalId = e.currentTarget.dataset.proposalId;
      await this._applyProposal(proposalId);
    });

    // Apply all critical proposals
    html.on('click', '[data-action="apply-all-critical"]', async (e) => {
      await this._applyAllCritical();
    });

    // Refresh analysis
    html.on('click', '[data-action="refresh"]', async (e) => {
      this.render(true);
    });

    // Close panel
    html.on('click', '[data-action="close"]', (e) => {
      this.close();
    });
  }

  /**
   * Apply single proposal
   * @private
   */
  async _applyProposal(proposalId) {
    if (!game.user.isGM) {
      ui.notifications.error('Only GMs can apply repairs');
      return;
    }

    const proposal = this.analysis.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      ui.notifications.error('Proposal not found');
      return;
    }

    try {
      // Show confirmation
      const confirmed = await this._confirmRepair(proposal);
      if (!confirmed) return;

      // Apply repair
      const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');
      const result = await ActorEngine.applyRepair(this.actor, proposal);

      if (result.success) {
        ui.notifications.info(`✓ Repair applied: ${proposal.reason}`);
        this.render(true); // Refresh display
      } else {
        ui.notifications.warn(`✗ Repair not applied: ${result.reason}`);

        // Show suggestion if available
        if (result.suggestion) {
          this._showSuggestion(result.suggestion);
        }
      }

    } catch (err) {
      SWSELogger.error('[5C-5] Repair application failed:', err);
      ui.notifications.error(`Repair failed: ${err.message}`);
    }
  }

  /**
   * Apply all critical proposals
   * @private
   */
  async _applyAllCritical() {
    if (!game.user.isGM) {
      ui.notifications.error('Only GMs can apply repairs');
      return;
    }

    const criticalProposals = this.analysis.proposals.filter(p => p.priority === 'critical');

    if (criticalProposals.length === 0) {
      ui.notifications.info('No critical repairs to apply');
      return;
    }

    try {
      const confirmed = await this._confirmBulkRepair(criticalProposals);
      if (!confirmed) return;

      const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');

      let applied = 0;
      let failed = 0;

      for (const proposal of criticalProposals) {
        try {
          const result = await ActorEngine.applyRepair(this.actor, proposal);
          if (result.success) {
            applied++;
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
          SWSELogger.warn(`[5C-5] Failed to apply ${proposal.id}:`, err);
        }
      }

      ui.notifications.info(`Applied ${applied}/${criticalProposals.length} repairs`);
      this.render(true); // Refresh

    } catch (err) {
      SWSELogger.error('[5C-5] Bulk repair failed:', err);
      ui.notifications.error(`Bulk repair failed: ${err.message}`);
    }
  }

  /**
   * Show repair confirmation dialog
   * @private
   */
  async _confirmRepair(proposal) {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Confirm Repair',
        content: `<p>Apply repair: <strong>${proposal.reason}</strong>?</p>`,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply',
            callback: () => resolve(true)
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(false)
          }
        },
        default: 'no'
      }).render(true);
    });
  }

  /**
   * Show bulk repair confirmation
   * @private
   */
  async _confirmBulkRepair(proposals) {
    return new Promise((resolve) => {
      const list = proposals.map(p => `<li>${p.reason}</li>`).join('');
      new Dialog({
        title: 'Apply Multiple Repairs',
        content: `<p>Apply ${proposals.length} critical repairs?</p><ul>${list}</ul>`,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply All',
            callback: () => resolve(true)
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(false)
          }
        },
        default: 'no'
      }).render(true);
    });
  }

  /**
   * Show suggestion modal
   * @private
   */
  _showSuggestion(suggestion) {
    let content = '';

    if (suggestion.type === 'suggestAcquisition') {
      content = `<p>Consider acquiring <strong>${suggestion.candidateName}</strong> before ${this.actor.name} can use the dependent item.</p>`;
    } else if (suggestion.type === 'classAdjustment') {
      content = `<p>Consider reviewing ${this.actor.name}'s class. A different class selection might resolve multiple violations.</p>`;
    }

    new Dialog({
      title: 'Repair Suggestion',
      content: content,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: 'OK',
          callback: () => {}
        }
      }
    }).render(true);
  }

  /**
   * Get color for severity level
   * @private
   */
  _getSeverityColor(severity) {
    const colors = {
      'none': '#28a745',
      'warning': '#ffc107',
      'error': '#dc3545',
      'structural': '#721c24'
    };
    return colors[severity] || '#999999';
  }

  /**
   * Get label for governance mode
   * @private
   */
  _getModeLabel(mode) {
    const labels = {
      'normal': 'Normal - Enforcement Active',
      'override': 'Override - Enforcement Disabled',
      'freeBuild': 'Free Build - No Restrictions'
    };
    return labels[mode] || mode;
  }

  /**
   * Open repair panel for actor
   * @static
   */
  static async openForActor(actor) {
    const panel = new RepairPanel(actor);
    panel.render(true);
    return panel;
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.RepairPanel = RepairPanel;
}
