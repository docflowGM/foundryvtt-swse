/**
 * DamageLogFormatter — Transparent Damage Mitigation Chat Messages
 *
 * Formats damage resolution results into clear, visual chat messages.
 * Shows the complete pipeline: Roll → SR → DR → Temp HP → HP
 *
 * Goal: Make damage mitigation transparent and understandable to players.
 */

export class DamageLogFormatter {
  /**
   * Create a detailed damage log message.
   *
   * @param {Object} params
   * @param {Object} params.mitigationResult - DamageMitigationManager.resolve() result
   * @param {Actor} params.attacker - Attacking actor
   * @param {Actor} params.target - Target actor
   * @param {Item} params.weapon - Weapon used (optional)
   * @returns {string} HTML for ChatMessage
   */
  static formatDamageLog({
    mitigationResult,
    attacker,
    target,
    weapon = null
  }) {
    if (!mitigationResult || !target) {
      return '<div class="damage-log">Invalid damage result</div>';
    }

    const damage = mitigationResult.originalDamage;
    const hpDamage = mitigationResult.hpDamage;
    const sr = mitigationResult.shield;
    const dr = mitigationResult.damageReduction;
    const tempHP = mitigationResult.tempHP;

    // Build the pipeline visualization
    const pipeline = this._buildPipeline(mitigationResult);

    // Build the summary table
    const breakdown = this._buildBreakdown(mitigationResult);

    // Build the HTML
    const html = `
      <div class="damage-log-container">
        <div class="damage-log-header">
          <div class="damage-attacker">
            ${attacker ? `<strong>${attacker.name}</strong>` : 'Unknown'}
            ${weapon ? ` — ${weapon.name}` : ''}
          </div>
          <div class="damage-arrow">→</div>
          <div class="damage-target">
            <strong>${target.name}</strong>
          </div>
        </div>

        <div class="damage-pipeline">
          ${pipeline}
        </div>

        <div class="damage-breakdown">
          ${breakdown}
        </div>

        ${this._buildFooter(mitigationResult, target)}
      </div>
    `;

    return html;
  }

  /**
   * Build the damage pipeline visualization.
   * Shows: 20 damage → [SR -5] → [DR -3] → [Temp -4] → 8 HP
   * @private
   */
  static _buildPipeline(result) {
    const steps = [];

    // Start: Original damage
    steps.push({
      value: result.originalDamage,
      label: `<strong>${result.originalDamage}</strong> dmg`,
      type: 'start'
    });

    // Shield Rating
    if (result.shield.applied > 0) {
      steps.push({
        value: result.afterShield,
        label: `<span class="sr-label">SR</span> -${result.shield.applied}`,
        type: 'mitigation'
      });
    }

    // Damage Reduction
    if (result.damageReduction.applied > 0) {
      steps.push({
        value: result.afterDR,
        label: `<span class="dr-label">DR</span> -${result.damageReduction.applied}`,
        type: 'mitigation'
      });
    }

    // Temporary HP
    if (result.tempHP.absorbed > 0) {
      steps.push({
        value: result.afterTempHP,
        label: `<span class="temp-label">Temp</span> -${result.tempHP.absorbed}`,
        type: 'mitigation'
      });
    }

    // Final: HP damage
    steps.push({
      value: result.hpDamage,
      label: `<strong>${result.hpDamage}</strong> HP`,
      type: 'end'
    });

    // Render pipeline
    const pipelineHTML = steps
      .map((step, idx) => {
        const stepHTML = `<div class="pipeline-step ${step.type}">
          <div class="step-value">${step.value}</div>
          <div class="step-label">${step.label}</div>
        </div>`;

        const arrow = idx < steps.length - 1
          ? '<div class="pipeline-arrow">→</div>'
          : '';

        return stepHTML + arrow;
      })
      .join('');

    return `<div class="pipeline">${pipelineHTML}</div>`;
  }

  /**
   * Build detailed breakdown table.
   * @private
   */
  static _buildBreakdown(result) {
    const rows = [];

    rows.push(this._breakdownRow('Original Damage', result.originalDamage, '#fff'));

    if (result.shield.applied > 0) {
      rows.push(this._breakdownRow(
        `Shield Rating (${result.shield.source || 'Unknown'})`,
        `-${result.shield.applied}`,
        '#00d9ff',
        result.shield.degraded > 0 ? ` [degraded -${result.shield.degraded}]` : ''
      ));
    }

    if (result.damageReduction.applied > 0) {
      rows.push(this._breakdownRow(
        `Damage Reduction (${result.damageReduction.source || 'Unknown'})`,
        `-${result.damageReduction.applied}`,
        '#00ff99',
        result.damageReduction.bypassed ? ' [bypassed]' : ''
      ));
    }

    if (result.tempHP.absorbed > 0) {
      rows.push(this._breakdownRow(
        'Temporary HP Absorbed',
        `-${result.tempHP.absorbed}`,
        '#ffaa00'
      ));
    }

    rows.push(this._breakdownRow(
      'Final Damage to HP',
      result.hpDamage,
      result.hpDamage === 0 ? '#00ff99' : '#ff4444',
      result.mitigated ? ' (mitigated)' : ''
    ));

    return `
      <table class="breakdown-table">
        ${rows.join('')}
      </table>
    `;
  }

  /**
   * Create a breakdown row.
   * @private
   */
  static _breakdownRow(label, value, color = '#ccc', suffix = '') {
    return `
      <tr class="breakdown-row">
        <td class="breakdown-label">${label}</td>
        <td class="breakdown-value" style="color: ${color};">
          <strong>${value}</strong>${suffix}
        </td>
      </tr>
    `;
  }

  /**
   * Build footer with actor status.
   * @private
   */
  static _buildFooter(result, target) {
    const hp = target.system.hp || {};
    const hpBefore = Math.max(0, hp.value + result.hpDamage);
    const hpAfter = hp.value;

    let status = '';
    if (hpAfter <= 0) {
      status = '<span class="status-critical">UNCONSCIOUS</span>';
    } else if (hpAfter <= hp.max * 0.25) {
      status = '<span class="status-critical">CRITICAL</span>';
    } else if (hpAfter <= hp.max * 0.5) {
      status = '<span class="status-warning">INJURED</span>';
    } else {
      status = '<span class="status-normal">OK</span>';
    }

    return `
      <div class="damage-footer">
        <div class="hp-change">
          ${hpBefore} → ${hpAfter} HP
        </div>
        <div class="actor-status">
          Status: ${status}
        </div>
      </div>
    `;
  }

  /**
   * Create a chat message and post it.
   *
   * @param {Object} params - Same as formatDamageLog
   * @param {Object} [options] - ChatMessage options
   */
  static async postDamageLog({
    mitigationResult,
    attacker,
    target,
    weapon = null
  }, options = {}) {
    const html = this.formatDamageLog({
      mitigationResult,
      attacker,
      target,
      weapon
    });

    const speaker = attacker
      ? ChatMessage.getSpeaker({ actor: attacker })
      : ChatMessage.getSpeaker({ actor: target });

    await ChatMessage.create({
      speaker,
      content: html,
      type: 'other',
      ...options
    });
  }
}
