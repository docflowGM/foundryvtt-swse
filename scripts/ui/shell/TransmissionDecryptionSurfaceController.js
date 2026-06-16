import { HolonetIntelService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export class TransmissionDecryptionSurfaceController {
  constructor(host, actor) {
    this._host = host;
    this._actor = actor;
    this._abort = null;
    this._hookListeners = [];
    this._lastRequestId = '';
  }

  attach(root) {
    this._actor = this._host?.actor ?? this._host?.document ?? this._actor ?? game.user?.character ?? null;
    this.destroy();
    this._abort = new AbortController();
    const { signal } = this._abort;
    const surface = root.querySelector('[data-shell-region="surface-transmission-decryption"]');
    if (!surface) return;
    surface.tabIndex = 0;

    const refresh = (payload = {}) => {
      const type = String(payload?.type || '');
      const intelId = String(payload?.intelId || payload?.recordId || '');
      const activeIntelId = this._intelId(surface);
      if (!type.startsWith('intel-')) return;
      if (intelId && activeIntelId && intelId !== activeIntelId) return;
      void this._render('transmission-holonet-refresh');
    };
    Hooks.on('swseHolonetUpdated', refresh);
    this._hookListeners.push(['swseHolonetUpdated', refresh]);

    surface.addEventListener('click', async (event) => {
      const shellTarget = event.target?.closest?.('[data-transmission-action]');
      if (shellTarget && surface.contains(shellTarget)) {
        event.preventDefault();
        await this._handleShellAction(shellTarget.dataset.transmissionAction, shellTarget, surface);
        return;
      }
      const target = event.target?.closest?.('[data-decrypt-action]');
      if (!target || !surface.contains(target)) return;
      event.preventDefault();
      await this._handleDecryptAction(target.dataset.decryptAction, target, surface);
    }, { signal });

    surface.querySelectorAll('.swse-transmission-manual input[name="plainLetter"]').forEach((input) => {
      input.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await this._guessFromForm(event.currentTarget.closest('.swse-transmission-manual'), surface);
      }, { signal });
    });

    surface.addEventListener('keydown', async (event) => {
      await this._handleKeyboard(event, surface);
    }, { signal });
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
    for (const [hook, fn] of this._hookListeners) Hooks.off(hook, fn);
    this._hookListeners = [];
  }

  async _handleShellAction(action, target, surface) {
    switch (action) {
      case 'back-intel':
        await this._host?.setSurface?.('allies', { activeTab: 'intel', source: 'transmission-decryption' });
        return this._render('transmission-back-to-intel', 'allies');
      case 'toggle-expanded': {
        const state = this._host?.getSurfaceState?.('transmission-decryption') ?? {};
        this._host?.patchSurfaceState?.('transmission-decryption', { expanded: !(state.expanded === true || state.expanded === 'true') }, { render: false });
        return this._render('transmission-toggle-expanded');
      }
      case 'refresh':
        return this._render('transmission-manual-refresh');
      default:
        return null;
    }
  }

  async _handleDecryptAction(action, target, surface) {
    switch (action) {
      case 'select':
        return this._selectCipher(cleanString(target.dataset.cipherLetter), surface);
      case 'attempt':
        return this._attempt(cleanString(target.dataset.skillKey, 'useComputer'), cleanString(target.dataset.cipherLetter), surface);
      case 'guess':
        return this._guessFromForm(target.closest('.swse-transmission-manual'), surface);
      case 'guess-letter':
        return this._guess(this._selectedCipher(surface), cleanString(target.dataset.plainLetter), surface);
      case 'clear-guess':
        return this._guess(this._selectedCipher(surface), '', surface);
      case 'clear-selection':
        return this._selectCipher('', surface);
      case 'claim':
        return this._claim(surface);
      case 'force':
        return this._forceDecrypt(surface);
      case 'refresh':
        return this._render('transmission-console-refresh');
      default:
        return null;
    }
  }

  async _handleKeyboard(event, surface) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = event.target?.tagName?.toLowerCase?.();
    const isTextInput = ['input', 'textarea', 'select'].includes(tag);
    if (event.key === 'Escape') {
      event.preventDefault();
      await this._selectCipher('', surface);
      return;
    }
    if (isTextInput) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const selected = this._selectedCipher(surface);
      if (!selected) return;
      event.preventDefault();
      await this._guess(selected, '', surface);
      return;
    }
    const letter = String(event.key || '').toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;
    const selected = this._selectedCipher(surface);
    if (!selected) return;
    event.preventDefault();
    await this._guess(selected, letter, surface);
  }

  async _selectCipher(cipherLetter = '', surface) {
    const intelId = this._intelId(surface);
    if (!intelId) return;
    const result = await HolonetIntelService.requestIntelCipherSelection(intelId, { cipherLetter });
    this._lastRequestId = result?.requestId || '';
    await this._render('transmission-cipher-select');
  }

  async _attempt(skillKey = 'useComputer', cipherLetter = '', surface) {
    const intelId = this._intelId(surface);
    if (!intelId) return;
    const result = await HolonetIntelService.requestIntelDecryption(intelId, {
      actor: this._actor,
      skillKey,
      targetCipherLetter: cipherLetter || this._selectedCipher(surface)
    });
    this._lastRequestId = result?.requestId || '';
    if (result?.pending) ui.notifications?.info?.('Decryption request sent to the GM host.');
    else if (result?.ok && result?.solved) ui.notifications?.info?.('Transmission decrypted. Lockbox contents may now be claimable.');
    else if (result?.ok) ui.notifications?.info?.('Decryption attempt resolved.');
    await this._render('transmission-decryption-attempt');
  }

  async _guessFromForm(form, surface) {
    if (!form) return;
    const cipherLetter = cleanString(form.querySelector('[name="cipherLetter"]')?.value || this._selectedCipher(surface));
    const plainLetter = cleanString(form.querySelector('[name="plainLetter"]')?.value);
    if (!cipherLetter) return ui.notifications?.warn?.('Select a glyph first.');
    if (!plainLetter) return ui.notifications?.warn?.('Enter a letter hypothesis first.');
    await this._guess(cipherLetter, plainLetter, surface);
  }

  async _guess(cipherLetter = '', plainLetter = '', surface) {
    const intelId = this._intelId(surface);
    if (!intelId) return;
    const result = await HolonetIntelService.requestIntelCipherGuess(intelId, { cipherLetter, plainLetter });
    this._lastRequestId = result?.requestId || '';
    if (result?.pending) ui.notifications?.info?.('Manual glyph hypothesis sent to the GM host.');
    else if (result?.ok && result?.solved) ui.notifications?.info?.('Transmission decrypted. Lockbox contents may now be claimable.');
    await this._render('transmission-cipher-guess');
  }

  async _forceDecrypt(surface) {
    const intelId = this._intelId(surface);
    if (!game.user?.isGM || !intelId) return;
    const result = await HolonetIntelService.forceDecryptIntel(intelId, { reason: 'GM override decrypted the shell-hosted transmission.' });
    if (result?.ok) ui.notifications?.info?.('Transmission decrypted by GM override.');
    await this._render('transmission-force-decrypt');
  }

  async _claim(surface) {
    const intelId = this._intelId(surface);
    if (!intelId || !this._actor) return;
    const result = await HolonetIntelService.claimIntelLockbox(intelId, { actor: this._actor });
    this._lastRequestId = result?.requestId || '';
    if (result?.pending) ui.notifications?.info?.('Lockbox claim request sent to the GM host.');
    else if (result?.ok) ui.notifications?.info?.('Lockbox contents claimed.');
    else ui.notifications?.warn?.('Lockbox contents could not be claimed yet.');
    await this._render('transmission-lockbox-claim');
  }

  _intelId(surface) {
    return cleanString(surface?.dataset?.intelId || this._host?.getSurfaceState?.('transmission-decryption')?.intelId);
  }

  _selectedCipher(surface) {
    return cleanString(surface?.dataset?.currentCipher || surface?.querySelector('[data-current-cipher]')?.dataset?.currentCipher);
  }

  async _render(reason = 'transmission-surface-render', surfaceId = 'transmission-decryption') {
    this._host?.patchSurfaceState?.('transmission-decryption', { lastRequestId: this._lastRequestId }, { render: false });
    if (typeof this._host?.requestSurfaceRender === 'function') {
      await this._host.requestSurfaceRender({ reason, surfaceId });
      return;
    }
    this._host?.render?.(false);
  }
}

export default TransmissionDecryptionSurfaceController;
