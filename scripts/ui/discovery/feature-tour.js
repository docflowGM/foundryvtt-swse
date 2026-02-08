/**
 * Feature Tour
 *
 * Single-modal, first-launch overview of system features.
 * Separate content for players vs GMs. Entirely skippable.
 */

import { DiscoveryUserState } from './user-state.js';

const SYSTEM_ID = 'foundryvtt-swse';
const TOUR_CLASS = 'swse-discovery-tour';

function _loc(key) {
  return game.i18n.localize(key);
}

function _getItems() {
  const isGM = game.user.isGM;
  const prefix = isGM ? 'SWSE.Discovery.Tour.GM' : 'SWSE.Discovery.Tour.Player';
  const items = [];
  // Up to 5 bullet points
  for (let i = 1; i <= 5; i++) {
    const key = `${prefix}.Item${i}`;
    const text = _loc(key);
    // If the key returns itself, the entry doesn't exist
    if (text !== key) {items.push(text);}
  }
  return items;
}

function _createModal() {
  const isGM = game.user.isGM;
  const prefix = isGM ? 'SWSE.Discovery.Tour.GM' : 'SWSE.Discovery.Tour.Player';

  const overlay = document.createElement('div');
  overlay.classList.add(`${TOUR_CLASS}__overlay`);

  const modal = document.createElement('div');
  modal.classList.add(TOUR_CLASS);
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', _loc(`${prefix}.Title`));

  const title = document.createElement('h2');
  title.classList.add(`${TOUR_CLASS}__title`);
  title.textContent = _loc(`${prefix}.Title`);
  modal.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.classList.add(`${TOUR_CLASS}__subtitle`);
  subtitle.textContent = _loc(`${prefix}.Subtitle`);
  modal.appendChild(subtitle);

  const items = _getItems();
  if (items.length) {
    const list = document.createElement('ul');
    list.classList.add(`${TOUR_CLASS}__list`);
    for (const text of items) {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    }
    modal.appendChild(list);
  }

  const actions = document.createElement('div');
  actions.classList.add(`${TOUR_CLASS}__actions`);

  const skipBtn = document.createElement('button');
  skipBtn.classList.add(`${TOUR_CLASS}__skip`);
  skipBtn.type = 'button';
  skipBtn.textContent = _loc('SWSE.Discovery.Tour.Skip');
  actions.appendChild(skipBtn);

  modal.appendChild(actions);
  overlay.appendChild(modal);

  return { overlay, skipBtn };
}

export const FeatureTour = {

  /**
   * Show the tour if this is the user's first launch and the setting allows it.
   * Call once on 'ready' hook.
   */
  async show() {
    // Check disabled setting
    try {
      if (game.settings.get(SYSTEM_ID, 'disableTour')) {return;}
    } catch { /* setting not registered yet, continue */ }

    if (DiscoveryUserState.isTourCompleted()) {return;}

    const { overlay, skipBtn } = _createModal();
    document.body.appendChild(overlay);

    // Focus the skip button for keyboard users
    skipBtn.focus();

    // Close handler
    const close = async () => {
      overlay.remove();
      await DiscoveryUserState.completeTour();
    };

    skipBtn.addEventListener('click', close);

    // Also close on Escape
    const onKey = (ev) => {
      if (ev.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        close();
      }
    };
    document.addEventListener('keydown', onKey);

    // Click outside modal closes
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) {close();}
    });
  }
};
