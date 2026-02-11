/**
 * UI Helper Utilities for SWSE
 */

import { SWSEDialogV2 } from '../apps/dialogs/swse-dialog-v2.js';

/* ---------------------- Notifications ---------------------- */

export function notify(message, type = 'info') {
  ui.notifications[type](message);
}

/* ---------------------- Confirm Dialog ---------------------- */

export async function confirm(title, content) {
  return SWSEDialogV2.confirm({ title, content });
}

/* ---------------------- Prompt Input Dialog ---------------------- */

export async function prompt(title, label, defaultValue = '') {
  const content = `
    <form class="swse-prompt-form">
      <div class="form-group">
        <label>${label}</label>
        <input type="text" name="input" value="${defaultValue}" autofocus />
      </div>
    </form>
  `;

  const result = await SWSEDialogV2.prompt({
    title,
    content,
    label: 'OK',
    callback: (html) => {
      const root = html?.[0] instanceof HTMLElement ? html[0] : null;
      const input = root?.querySelector?.('[name="input"]');
      return input?.value ?? null;
    }
  });

  // cancel returns null
  return result;
}

/* ---------------------- Generic Custom Dialog ---------------------- */

export async function createDialog(title, content, buttons) {
  // Maintain previous behavior: resolve null on any button press (callers handle via buttons callbacks).
  return SWSEDialogV2.wait({ title, content, buttons });
}
