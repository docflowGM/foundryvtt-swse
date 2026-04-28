/**
 * HolonetComposerAssist
 *
 * Lightweight mention/tag picker for textarea-based Bulletin and Messenger editors.
 * Opens when the user types @ or # and inserts a selected token into the text.
 */

import { HolonetEntityDirectoryService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-entity-directory-service.js';

const DEFAULT_TAGS = HolonetEntityDirectoryService.DEFAULT_TAGS;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function selectionQuery(textarea) {
  const cursor = textarea.selectionStart ?? textarea.value.length;
  const before = textarea.value.slice(0, cursor);
  const match = before.match(/(^|\s)([@#])([^\s@#]*)$/);
  if (!match) return null;
  const trigger = match[2];
  const query = match[3] ?? '';
  const start = cursor - query.length - 1;
  return { trigger, query, start, end: cursor };
}

export class HolonetComposerAssist {
  static async attach(root, options = {}) {
    const textareas = Array.from(root.querySelectorAll('textarea[data-holonet-editor]'));
    if (!textareas.length) return;

    const mentionOptions = options.mentionOptions || await HolonetEntityDirectoryService.getMentionOptions();
    const tagOptions = (options.tagOptions || DEFAULT_TAGS).map(token => ({ token, label: token.slice(1), subtitle: 'topic' }));

    for (const textarea of textareas) {
      this.#ensurePicker(textarea, { mentionOptions, tagOptions });
    }
  }

  static #ensurePicker(textarea, { mentionOptions, tagOptions }) {
    if (textarea.dataset.holonetAssistBound === 'true') return;
    textarea.dataset.holonetAssistBound = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'holonet-composer-assist';
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <div class="holonet-composer-assist__header"></div>
      <div class="holonet-composer-assist__list"></div>
    `;
    textarea.insertAdjacentElement('afterend', wrapper);

    let activeIndex = 0;
    let activeItems = [];

    const hide = () => {
      wrapper.hidden = true;
      wrapper.dataset.trigger = '';
      activeItems = [];
      activeIndex = 0;
    };

    const show = (queryState) => {
      const source = queryState.trigger === '@' ? mentionOptions : tagOptions;
      const lower = queryState.query.toLowerCase();
      activeItems = source
        .filter(item => !lower || item.token.toLowerCase().includes(lower) || item.label?.toLowerCase().includes(lower))
        .slice(0, 8);

      if (!activeItems.length) {
        hide();
        return;
      }

      activeIndex = Math.min(activeIndex, activeItems.length - 1);
      wrapper.hidden = false;
      wrapper.dataset.trigger = queryState.trigger;
      wrapper.querySelector('.holonet-composer-assist__header').textContent = queryState.trigger === '@'
        ? 'Insert mention'
        : 'Insert topic tag';
      wrapper.querySelector('.holonet-composer-assist__list').innerHTML = activeItems.map((item, index) => `
        <button type="button" class="holonet-composer-assist__item ${index === activeIndex ? 'is-active' : ''}" data-assist-index="${index}">
          <span class="holonet-composer-assist__token">${escapeHtml(item.token)}</span>
          <span class="holonet-composer-assist__meta">${escapeHtml(item.subtitle || item.group || '')}</span>
        </button>
      `).join('');

      wrapper.querySelectorAll('[data-assist-index]').forEach(button => {
        button.addEventListener('mousedown', event => {
          event.preventDefault();
        });
        button.addEventListener('click', event => {
          event.preventDefault();
          const index = Number(event.currentTarget.dataset.assistIndex);
          const item = activeItems[index];
          const current = selectionQuery(textarea);
          if (!item || !current) return;
          this.#insertToken(textarea, current, item.token);
          hide();
        });
      });
    };

    const refresh = () => {
      const queryState = selectionQuery(textarea);
      if (!queryState) {
        hide();
        return;
      }
      show(queryState);
    };

    textarea.addEventListener('input', refresh);
    textarea.addEventListener('click', refresh);
    textarea.addEventListener('blur', () => {
      setTimeout(() => hide(), 120);
    });
    textarea.addEventListener('keydown', event => {
      if (wrapper.hidden) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex = Math.min(activeItems.length - 1, activeIndex + 1);
        refresh();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        refresh();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        hide();
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const queryState = selectionQuery(textarea);
        const item = activeItems[activeIndex];
        if (!queryState || !item) return;
        event.preventDefault();
        this.#insertToken(textarea, queryState, item.token);
        hide();
      }
    });
  }

  static #insertToken(textarea, queryState, token) {
    const value = textarea.value;
    const before = value.slice(0, queryState.start);
    const after = value.slice(queryState.end);
    const insertion = `${token} `;
    textarea.value = `${before}${insertion}${after}`;
    const cursor = before.length + insertion.length;
    textarea.setSelectionRange(cursor, cursor);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }
}
