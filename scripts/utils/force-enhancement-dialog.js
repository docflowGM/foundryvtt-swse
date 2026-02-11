import { ForceEnhancementDetector } from './force-enhancement-detector.js';

/**
 * Force Enhancement Dialog
 * Prompts the player to select Force Techniques and Force Secrets to apply to a Force Power
 */

export class ForceEnhancementDialog {

  /**
   * Show the enhancement selection dialog
   * @param {Actor} actor - The actor using the power
   * @param {Item} power - The force power being used
   * @param {Array} techniques - Array of applicable technique items
   * @param {Array} secrets - Array of applicable secret items
   * @returns {Promise<Object>} Selected enhancements { techniques: [], secrets: [] }
   */
  static async promptEnhancements(actor, power, techniques, secrets) {
    if (techniques.length === 0 && secrets.length === 0) {
      return { techniques: [], secrets: [] };
    }

    return new Promise((resolve) => {
      const dialog = new SWSEDialogV2({
        title: `Enhance: ${power.name}`,
        content: this._buildDialogContent(actor, power, techniques, secrets),
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply Selected',
            callback: (html) => {
              const selected = this._parseSelections(html, techniques, secrets);
              resolve(selected);
            }
          },
          none: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Use Without Enhancements',
            callback: () => resolve({ techniques: [], secrets: [] })
          }
        },
        default: 'apply',
        render: (html) => {
          this._activateListeners(html, actor);
        }
      }, {
        width: 600,
        height: 'auto',
        classes: ['swse-force-enhancement-dialog']
      });

      dialog.render(true);
    });
  }

  /**
   * Build the dialog HTML content
   * @private
   */
  static _buildDialogContent(actor, power, techniques, secrets) {
    let html = `
      <div class="force-enhancement-content">
        <p class="enhancement-intro">
          <strong>${power.name}</strong> can be enhanced with the following abilities you possess:
        </p>
    `;

    // Force Techniques Section
    if (techniques.length > 0) {
      html += `
        <div class="enhancement-section">
          <h3><i class="fas fa-hand-sparkles"></i> Force Techniques</h3>
          <div class="enhancement-list">
      `;

      techniques.forEach((tech, index) => {
        const description = ForceEnhancementDetector.getEnhancementDescription(tech);
        html += `
          <div class="enhancement-item">
            <label class="enhancement-checkbox">
              <input type="checkbox"
                     data-type="technique"
                     data-index="${index}"
                     data-id="${tech.id}"
                     checked />
              <img src="${tech.img}" class="enhancement-icon" />
              <div class="enhancement-info">
                <div class="enhancement-name">${tech.name}</div>
                <div class="enhancement-desc">${description}</div>
              </div>
            </label>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // Force Secrets Section
    if (secrets.length > 0) {
      html += `
        <div class="enhancement-section">
          <h3><i class="fas fa-star"></i> Force Secrets</h3>
          <div class="enhancement-list">
      `;

      secrets.forEach((secret, index) => {
        const description = ForceEnhancementDetector.getEnhancementDescription(secret);
        const cost = secret.system.cost || 'Force Point or Destiny Point';

        html += `
          <div class="enhancement-item secret">
            <label class="enhancement-checkbox">
              <input type="checkbox"
                     data-type="secret"
                     data-index="${index}"
                     data-id="${secret.id}" />
              <img src="${secret.img}" class="enhancement-icon" />
              <div class="enhancement-info">
                <div class="enhancement-name">${secret.name}</div>
                <div class="enhancement-cost"><strong>Cost:</strong> ${cost}</div>
                <div class="enhancement-desc">${description}</div>
              </div>
            </label>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // Resources Display
    const fp = actor.system.forcePoints || { value: 0, max: 0 };
    const dp = actor.system.destinyPoints || { value: 0, max: 0 };

    html += `
        <div class="enhancement-resources">
          <div class="resource-display">
            <i class="fas fa-bolt"></i>
            <strong>Force Points:</strong> ${fp.value}/${fp.max}
          </div>
          <div class="resource-display">
            <i class="fas fa-star"></i>
            <strong>Destiny Points:</strong> ${dp.value}/${dp.max}
          </div>
        </div>
      </div>

      <style>
        .force-enhancement-content {
          max-height: 600px;
          overflow-y: auto;
          padding: 10px;
        }

        .enhancement-intro {
          margin-bottom: 15px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }

        .enhancement-section {
          margin-bottom: 20px;
        }

        .enhancement-section h3 {
          margin: 10px 0;
          padding: 5px 10px;
          background: linear-gradient(90deg, rgba(100, 150, 255, 0.3), transparent);
          border-left: 3px solid #6496ff;
        }

        .enhancement-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .enhancement-item {
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }

        .enhancement-item:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: #6496ff;
        }

        .enhancement-item.secret {
          border-left: 3px solid #ffd700;
        }

        .enhancement-checkbox {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          cursor: pointer;
          width: 100%;
        }

        .enhancement-checkbox input[type="checkbox"] {
          margin-top: 4px;
          width: 18px;
          height: 18px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .enhancement-icon {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          border: 1px solid #666;
          flex-shrink: 0;
        }

        .enhancement-info {
          flex: 1;
        }

        .enhancement-name {
          font-weight: bold;
          font-size: 1.1em;
          margin-bottom: 5px;
          color: #6496ff;
        }

        .enhancement-cost {
          font-size: 0.9em;
          color: #ffd700;
          margin-bottom: 5px;
        }

        .enhancement-desc {
          font-size: 0.9em;
          color: #ccc;
          line-height: 1.4;
        }

        .enhancement-resources {
          margin-top: 20px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          display: flex;
          gap: 20px;
          justify-content: center;
        }

        .resource-display {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .resource-display i {
          color: #ffd700;
        }
      </style>
    `;

    return html;
  }

  /**
   * Parse the selected enhancements from the dialog
   * @private
   */
  static _parseSelections(html, techniques, secrets) {
    const selected = {
      techniques: [],
      secrets: []
    };

    // Convert to DOM element if needed
    const element = html instanceof HTMLElement ? html : html[0];
    if (!element) {return selected;}

    // Get all checked technique checkboxes
    element.querySelectorAll('input[data-type="technique"]:checked').forEach(el => {
      const index = parseInt(el.dataset.index, 10);
      if (techniques[index]) {
        selected.techniques.push(techniques[index]);
      }
    });

    // Get all checked secret checkboxes
    element.querySelectorAll('input[data-type="secret"]:checked').forEach(el => {
      const index = parseInt(el.dataset.index, 10);
      if (secrets[index]) {
        selected.secrets.push(secrets[index]);
      }
    });

    return selected;
  }

  /**
   * Activate event listeners for the dialog
   * @private
   */
  static _activateListeners(html, actor) {
    // Convert to DOM element if needed
    const element = html instanceof HTMLElement ? html : html[0];
    if (!element) {return;}

    // Add hover effects for descriptions
    element.querySelectorAll('.enhancement-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.classList.add('hovered');
      });
      item.addEventListener('mouseleave', () => {
        item.classList.remove('hovered');
      });
    });

    // Warn if selecting secrets but insufficient resources
    element.querySelectorAll('input[data-type="secret"]').forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
        if (event.currentTarget.checked) {
          const fp = actor.system.forcePoints?.value || 0;
          const dp = actor.system.destinyPoints?.value || 0;

          if (fp === 0 && dp === 0) {
            ui.notifications.warn('You have no Force Points or Destiny Points to spend on Force Secrets!');
            event.currentTarget.checked = false;
          }
        }
      });
    });
  }

  /**
   * Quick check helper - returns true if user wants to use enhancements
   * @param {Actor} actor
   * @param {Item} power
   * @returns {Promise<Object|null>} Selected enhancements or null if none available
   */
  static async checkAndPrompt(actor, power) {
    const { techniques, secrets } = ForceEnhancementDetector.detectEnhancements(actor, power);

    if (techniques.length === 0 && secrets.length === 0) {
      return null;
    }

    return await this.promptEnhancements(actor, power, techniques, secrets);
  }
}
