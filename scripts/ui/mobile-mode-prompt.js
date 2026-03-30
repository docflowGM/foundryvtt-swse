/**
 * Mobile Mode Prompt
 *
 * One-time prompt for users on mobile-like devices.
 * Only shows if:
 * 1. User has no explicit preference set
 * 2. isMobileCandidate() returns true
 * 3. User hasn't dismissed the prompt before
 *
 * No page reload on selection—just toggles mode and applies class.
 */

/**
 * Register the mobile mode prompt.
 * Call during Hooks.once('ready').
 *
 * @param {Function} isMobileCandidate - Detection function from mobile-mode-detector.js
 */
export function registerMobilePrompt(isMobileCandidate) {
  // If user has already made a choice, don't ask again
  const userChoice = game.user.getFlag("foundryvtt-swse", "mobileModeEnabled");
  if (userChoice !== undefined && userChoice !== null) {
    return;
  }

  // If user dismissed the prompt, don't ask again
  const dismissed = game.user.getFlag("foundryvtt-swse", "mobileModePromptDismissed");
  if (dismissed === true) {
    return;
  }

  // If device is not mobile-like, don't ask
  if (!isMobileCandidate()) {
    return;
  }

  // Show prompt
  new Dialog({
    title: "Enable Touch-Friendly Mode?",
    content: `
      <p>This mode optimizes Foundry VTT for phones and tablets:</p>
      <ul>
        <li>Larger, touch-friendly buttons</li>
        <li>Improved scrolling and layout</li>
        <li>No hover-based interactions</li>
      </ul>
      <p><small>You can change this anytime in settings.</small></p>
    `,
    buttons: {
      yes: {
        label: "Enable",
        callback: async () => {
          await game.user.setFlag("foundryvtt-swse", "mobileModeEnabled", true);
          game.swse.ui.mobileMode.toggleMode();
        }
      },
      no: {
        label: "Not Now"
      },
      never: {
        label: "Don't Ask Again",
        callback: async () => {
          await game.user.setFlag("foundryvtt-swse", "mobileModePromptDismissed", true);
        }
      }
    },
    default: "yes"
  }).render(true);
}
