/**
 * Mentor Dialogue Translation Settings UI
 * Provides player-facing settings to enable/disable Aurebesh translation
 */

import { MentorTranslationIntegration } from './mentor-translation-integration.js';

export class MentorTranslationSettings {
  /**
   * Register settings in Foundry
   * Call this during system init hooks
   */
  static registerSettings() {
    game.settings.register('foundryvtt-swse', 'mentorTranslationEnabled', {
      name: 'Enable Mentor Aurebesh Translation',
      hint: 'Display mentor dialogue with Aurebesh-to-English character reveal animation',
      scope: 'user',
      config: true,
      type: Boolean,
      default: true,
      onChange: (value) => {
        MentorTranslationIntegration.settings.enabled = value;
      }
    });

    game.settings.register('foundryvtt-swse', 'mentorTranslationSkipOnClick', {
      name: 'Skip Aurebesh Animation on Click',
      hint: 'Allow players to click dialogue to instantly reveal all text',
      scope: 'user',
      config: true,
      type: Boolean,
      default: true,
      onChange: (value) => {
        MentorTranslationIntegration.settings.skipOnClick = value;
      }
    });

    game.settings.register('foundryvtt-swse', 'mentorTranslationSpeed', {
      name: 'Aurebesh Animation Speed',
      hint: 'Character reveal speed in milliseconds (lower = faster)',
      scope: 'user',
      config: true,
      type: Number,
      default: 25,
      range: {
        min: 5,
        max: 100,
        step: 5
      },
      onChange: (value) => {
        MentorTranslationIntegration.settings.speedMultiplier = value / 25;
      }
    });
  }

  /**
   * Load settings into integration
   * Call this after registering settings
   */
  static loadSettings() {
    MentorTranslationIntegration.settings.enabled =
      game.settings.get('foundryvtt-swse', 'mentorTranslationEnabled');

    MentorTranslationIntegration.settings.skipOnClick =
      game.settings.get('foundryvtt-swse', 'mentorTranslationSkipOnClick');

    const speed = game.settings.get('foundryvtt-swse', 'mentorTranslationSpeed');
    MentorTranslationIntegration.settings.speedMultiplier = speed / 25;
  }

  /**
   * Create a simple settings UI button for the pause menu or character sheet
   */
  static createSettingsButton() {
    const button = document.createElement('button');
    button.id = 'swse-mentor-translation-toggle';
    button.className = 'mentor-translation-settings-btn';
    button.title = 'Mentor Translation Settings';
    button.innerHTML = '<i class="fa-solid fa-closed-captioning"></i>';

    button.addEventListener('click', () => {
      MentorTranslationSettings.openSettingsDialog();
    });

    return button;
  }

  /**
   * Open settings dialog
   */
  static openSettingsDialog() {
    const enabled = game.settings.get('foundryvtt-swse', 'mentorTranslationEnabled');
    const skipOnClick = game.settings.get('foundryvtt-swse', 'mentorTranslationSkipOnClick');
    const speed = game.settings.get('foundryvtt-swse', 'mentorTranslationSpeed');

    const content = `
      <form class="mentor-translation-settings-form">
        <div class="form-group">
          <label for="translation-enabled">
            <input type="checkbox" id="translation-enabled" name="enabled" ${enabled ? 'checked' : ''} />
            Enable Aurebesh Character Reveal
          </label>
          <p class="form-hint">Shows mentor dialogue with Aurebesh-to-English animation</p>
        </div>

        <div class="form-group">
          <label for="skip-on-click">
            <input type="checkbox" id="skip-on-click" name="skipOnClick" ${skipOnClick ? 'checked' : ''} />
            Click to Reveal All Text
          </label>
          <p class="form-hint">Allow skipping animation by clicking the dialogue</p>
        </div>

        <div class="form-group">
          <label for="animation-speed">Animation Speed (ms per character)</label>
          <input type="range" id="animation-speed" name="speed" min="5" max="100" step="5" value="${speed}" />
          <p class="form-hint">Lower values = faster animation</p>
          <p class="speed-preview">Current: ${speed}ms</p>
        </div>

        <p class="form-info">
          <strong>⚡ Pro Tip:</strong> Click dialogue to instantly reveal text anytime
        </p>
      </form>
    `;

    const speedSlider = null;
    const dialog = new SWSEDialogV2({
      title: 'Mentor Translation Settings',
      content,
      buttons: {
        save: {
          icon: '<i class="fa-solid fa-check"></i>',
          label: 'Save',
          callback: (html) => {
            const enabled = html.querySelector('#translation-enabled')?.checked;
            const skipOnClick = html.querySelector('#skip-on-click')?.checked;
            const speed = parseInt(html.querySelector('#animation-speed')?.value);

            game.settings.set('foundryvtt-swse', 'mentorTranslationEnabled', enabled);
            game.settings.set('foundryvtt-swse', 'mentorTranslationSkipOnClick', skipOnClick);
            game.settings.set('foundryvtt-swse', 'mentorTranslationSpeed', speed);

            MentorTranslationSettings.loadSettings();
          }
        },
        cancel: {
          icon: '<i class="fa-solid fa-times"></i>',
          label: 'Close'
        }
      }
    });

    dialog.render(true);

    // Update speed preview on slider change
    setTimeout(() => {
      const slider = document.getElementById('animation-speed');
      const preview = document.querySelector('.speed-preview');
      if (slider && preview) {
        slider.addEventListener('input', (e) => {
          preview.textContent = `Current: ${e.target.value}ms`;
        });
      }
    }, 100);
  }
}

/**
 * CSS for settings UI
 */
const SETTINGS_CSS = `
  .mentor-translation-settings-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 15px 0;
  }

  .mentor-translation-settings-form .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mentor-translation-settings-form label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ddd;
    cursor: pointer;
    user-select: none;
  }

  .mentor-translation-settings-form input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
  }

  .mentor-translation-settings-form input[type="range"] {
    width: 100%;
    height: 6px;
    cursor: pointer;
  }

  .mentor-translation-settings-form .form-hint {
    margin: 0;
    font-size: 0.85em;
    color: #999;
    font-style: italic;
  }

  .mentor-translation-settings-form .speed-preview {
    margin: 0;
    font-size: 0.9em;
    color: #00d9ff;
    font-weight: 500;
  }

  .mentor-translation-settings-form .form-info {
    margin: 0;
    padding: 10px;
    background: rgba(0, 217, 255, 0.1);
    border-left: 3px solid #00d9ff;
    border-radius: 3px;
    color: #ddd;
    font-size: 0.9em;
  }

  .mentor-translation-settings-btn {
    padding: 6px 8px;
    background: rgba(0, 217, 255, 0.1);
    border: 1px solid rgba(0, 217, 255, 0.3);
    border-radius: 3px;
    color: #00d9ff;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1em;
  }

  .mentor-translation-settings-btn:hover {
    background: rgba(0, 217, 255, 0.2);
    border-color: rgba(0, 217, 255, 0.6);
  }
`;

// Inject CSS on module load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = SETTINGS_CSS;
    document.head.appendChild(style);
  });
} else {
  const style = document.createElement('style');
  style.textContent = SETTINGS_CSS;
  document.head.appendChild(style);
}
