/**
 * ModifierBreakdownDialog — Shows where skill/defense modifiers come from
 *
 * Displays:
 * - Feat bonuses
 * - Talent bonuses
 * - Encumbrance penalties
 * - Species traits
 * - Conditions
 */

export class ModifierBreakdownDialog extends Dialog {
  constructor(actor, modifiers, skillName, options = {}) {
    const title = `${skillName} Modifiers`;

    // Build modifier list HTML
    let content = '<div style="padding: 12px;">';

    if (!modifiers || modifiers.length === 0) {
      content += '<div style="opacity: 0.6; font-style: italic;">No modifiers applied.</div>';
    } else {
      content += '<table style="width: 100%; font-size: 0.85em;">';
      content += '<tr style="border-bottom: 1px solid #ddd;"><th style="text-align: left; padding: 4px;">Source</th><th style="text-align: right; padding: 4px;">Value</th></tr>';

      let total = 0;
      for (const mod of modifiers) {
        const value = mod.value || 0;
        total += value;
        const sign = value >= 0 ? '+' : '';
        const color = value >= 0 ? '#2e7d32' : '#c62828';

        content += `<tr style="border-bottom: 1px solid #eee;">`;
        content += `<td style="padding: 6px 4px; word-break: break-word;">${mod.description || mod.sourceName}</td>`;
        content += `<td style="text-align: right; padding: 6px 4px; color: ${color}; font-weight: bold;">${sign}${value}</td>`;
        content += `</tr>`;
      }

      content += '<tr style="border-top: 2px solid #ddd; font-weight: bold;">';
      content += `<td style="padding: 8px 4px;">Total</td>`;
      content += `<td style="text-align: right; padding: 8px 4px; color: #0066cc;">${total >= 0 ? '+' : ''}${total}</td>`;
      content += '</tr>';
      content += '</table>';
    }

    content += '</div>';

    const dialogOptions = {
      title,
      content,
      buttons: {
        close: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Close',
          callback: () => {}
        }
      },
      default: 'close',
      ...options
    };

    super(dialogOptions);
  }

  static async show(actor, modifiers, skillName) {
    const dialog = new this(actor, modifiers, skillName);
    dialog.render(true);
  }
}
