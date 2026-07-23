import { HolonetDecryptionService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-decryption-service.js';
import { HolonetIntelService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';
import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';
import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';

const ACTIVE = new WeakMap();
const STYLE_ID = 'swse-gm-datapad-interaction-repairs';

const DIFFICULTY_LEVELS = Object.freeze([
  { value: 'routine', level: 5, description: 'Simple civilian encryption, common access codes, or an obvious physical sequence.' },
  { value: 'standard', level: 12, description: 'Normal professional encryption or a typical secured datapad.' },
  { value: 'challenging', level: 18, description: 'Military, syndicate, intelligence-service, or specialist-grade protection.' },
  { value: 'hard', level: 24, description: 'Layered military encryption, a dangerous vault, or a heavily damaged data source.' },
  { value: 'extreme', level: 30, description: 'Black-operations, ancient masterwork, or exceptionally hostile security.' },
  { value: 'black-vault', level: 35, description: 'The most secure Sith, Imperial, Republic Intelligence, or sealed artifact protection.' }
]);

function titleCase(value = '') {
  return String(value || '').split(/[-_\s]+/g).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function ensureStyles(root) {
  const doc = root?.ownerDocument || document;
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .swse-sheet-v2-shell--gm-datapad input[type="checkbox"] {
      -webkit-appearance: checkbox !important;
      appearance: auto !important;
      box-sizing: border-box !important;
      width: 16px !important;
      min-width: 16px !important;
      max-width: 16px !important;
      height: 16px !important;
      min-height: 16px !important;
      max-height: 16px !important;
      margin: 0 !important;
      padding: 0 !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      accent-color: #7dffb2 !important;
      cursor: pointer !important;
      flex: 0 0 16px !important;
    }

    .swse-sheet-v2-shell--gm-datapad :is(
      .gm-faction-checkbox-label,
      .gm-faction-wizard-actor-row,
      .gm-intel-toggle-card,
      .gm-intel-skill-option,
      .gm-intel-lockbox-head,
      .gm-location-toggle-card,
      .gm-location-import-card,
      .job-inline-check
    ) { cursor: pointer !important; }

    .swse-sheet-v2-shell--gm-datapad :is(
      .gm-faction-wizard-actor-row,
      .gm-intel-toggle-card,
      .gm-intel-skill-option,
      .gm-intel-lockbox-head,
      .gm-location-toggle-card,
      .gm-location-import-card
    ).is-selected {
      border-color: rgba(125, 255, 178, 0.56) !important;
      background: linear-gradient(135deg, rgba(125, 255, 178, 0.12), rgba(3, 12, 22, 0.82)) !important;
      box-shadow: inset 0 0 18px rgba(125, 255, 178, 0.08), 0 0 12px rgba(125, 255, 178, 0.08) !important;
    }

    .swse-sheet-v2-shell--gm-datapad .gm-faction-wizard-actor-row {
      display: grid !important;
      grid-template-columns: 18px minmax(160px, 1fr) minmax(130px, .7fr) 78px !important;
      align-items: center !important;
      gap: 9px !important;
      padding: 9px 10px !important;
      border: 1px solid rgba(112, 226, 255, 0.16) !important;
      border-radius: 9px !important;
      background: rgba(2, 8, 16, 0.72) !important;
    }

    .swse-sheet-v2-shell--gm-datapad .gm-faction-wizard-actor-row > :is(select, input[type="number"]) {
      width: 100% !important;
      min-width: 0 !important;
    }

    .swse-sheet-v2-shell--gm-datapad :is(
      .gm-command-shell-v2,
      .gm-command-surface-stage,
      .gm-command-surface-scrollframe,
      .swse-shell-surface-host,
      .gm-datapad-page
    ) { min-height: 0 !important; min-width: 0 !important; }

    .swse-sheet-v2-shell--gm-datapad :is(.gm-command-surface-scrollframe, .swse-shell-surface-host) {
      overflow-y: auto !important;
      overflow-x: hidden !important;
      overscroll-behavior: contain !important;
      scrollbar-gutter: stable !important;
      touch-action: pan-y !important;
    }

    .swse-sheet-v2-shell--gm-datapad .gm-location-modal-layer.gm-shell-modal-layer {
      position: fixed !important;
      inset: auto !important;
      z-index: 9500 !important;
      display: grid !important;
      place-items: center !important;
      padding: clamp(10px, 2vw, 24px) !important;
      overflow: hidden !important;
      background: rgba(1, 6, 14, 0.88) !important;
      backdrop-filter: blur(7px) saturate(1.12);
    }

    .swse-sheet-v2-shell--gm-datapad .gm-location-modal-layer.gm-shell-modal-layer[hidden] { display: none !important; }

    .swse-sheet-v2-shell--gm-datapad :is(.gm-intel-modal, .gm-location-modal, .gm-wizard-panel) {
      max-width: calc(100% - 20px) !important;
      max-height: calc(100% - 20px) !important;
    }

    .swse-sheet-v2-shell--gm-datapad .gm-decode-failure-help {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      padding: 9px;
      border: 1px solid rgba(112, 226, 255, 0.18);
      border-radius: 10px;
      background: rgba(1, 9, 18, 0.56);
    }

    .swse-sheet-v2-shell--gm-datapad .gm-decode-failure-help span {
      display: block;
      padding: 7px 8px;
      border-radius: 8px;
      color: rgba(221, 250, 255, 0.78);
      font-size: 10px;
      line-height: 1.4;
    }

    .swse-sheet-v2-shell--gm-datapad .gm-decode-failure-help strong { color: #e7fbff; }

    @media (max-width: 760px) {
      .swse-sheet-v2-shell--gm-datapad .gm-faction-wizard-actor-row { grid-template-columns: 18px minmax(0, 1fr) !important; }
      .swse-sheet-v2-shell--gm-datapad .gm-faction-wizard-actor-row > :is(select, input[type="number"]) { grid-column: 2; }
      .swse-sheet-v2-shell--gm-datapad .gm-decode-failure-help { grid-template-columns: 1fr; }
    }
  `;
  doc.head.appendChild(style);
}

function selectedValues(root, name) {
  return Array.from(root?.querySelectorAll?.(`input[type="checkbox"][name="${CSS.escape(name)}"]:checked`) || [])
    .map(input => String(input.value || '').trim())
    .filter(Boolean);
}

function sameValues(a = [], b = []) {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function fixedContainingBlock(element) {
  let current = element?.parentElement || null;
  while (current && current !== element?.ownerDocument?.documentElement) {
    const style = element.ownerDocument.defaultView.getComputedStyle(current);
    if (style.transform !== 'none'
      || style.perspective !== 'none'
      || style.filter !== 'none'
      || style.backdropFilter !== 'none'
      || /paint|layout|strict|content/.test(style.contain || '')
      || /transform|perspective|filter/.test(style.willChange || '')) return current;
    current = current.parentElement;
  }
  return null;
}

export class GMInteractionRepairService {
  static bind({ surfaceId = '', host = null, root = null } = {}) {
    if (!host || !(root instanceof HTMLElement)) return false;
    this.destroy(host);
    ensureStyles(root);

    const abort = new AbortController();
    const signal = abort.signal;
    ACTIVE.set(host, { abort, root, surfaceId });

    this._bindCheckboxFeedback(root, signal);
    this._bindModalBounds(root, signal);
    this._stabilizeViewport(host, root, signal);
    if (surfaceId === 'intel') void this._hydrateIntelWizard(root, signal);
    if (surfaceId === 'jobs') this._bindJobStatusRepair(host, root, signal);
    return true;
  }

  static destroy(host) {
    ACTIVE.get(host)?.abort?.abort?.();
    ACTIVE.delete(host);
  }

  static _bindCheckboxFeedback(root, signal) {
    const sync = (input) => {
      if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;
      input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      [
        input.closest('.gm-faction-wizard-actor-row'),
        input.closest('.gm-intel-toggle-card'),
        input.closest('.gm-intel-skill-option'),
        input.closest('.gm-intel-lockbox-head'),
        input.closest('.gm-location-toggle-card'),
        input.closest('.gm-location-import-card')
      ].filter(Boolean).forEach(container => container.classList.toggle('is-selected', input.checked));
    };
    root.querySelectorAll('input[type="checkbox"]').forEach(sync);
    root.addEventListener('change', event => sync(event.target), { signal, capture: true });
  }

  static _modalLayers(root) {
    return Array.from(root.querySelectorAll('.gm-shell-modal-layer, .gm-wizard-overlay, .gm-intel-modal-layer, .gm-location-modal-layer'));
  }

  static _syncModalBounds(root) {
    const screen = root.querySelector('.gm-datapad-screen') || root.querySelector('.swse-shell-surface-host') || root;
    const rect = screen.getBoundingClientRect();
    for (const layer of this._modalLayers(root)) {
      layer.classList.add('gm-shell-modal-layer');
      const container = fixedContainingBlock(layer);
      const base = container?.getBoundingClientRect?.();
      const left = base ? rect.left - base.left : rect.left;
      const top = base ? rect.top - base.top : rect.top;
      layer.style.setProperty('left', `${Math.round(left)}px`, 'important');
      layer.style.setProperty('top', `${Math.round(top)}px`, 'important');
      layer.style.setProperty('width', `${Math.max(1, Math.round(rect.width))}px`, 'important');
      layer.style.setProperty('height', `${Math.max(1, Math.round(rect.height))}px`, 'important');
      layer.style.setProperty('inset', 'auto', 'important');
    }
  }

  static _syncModalState(root) {
    const view = root.ownerDocument.defaultView;
    const open = this._modalLayers(root).some(layer => !layer.hidden && view.getComputedStyle(layer).display !== 'none');
    root.querySelector('.swse-shell-surface-host')?.classList.toggle('gm-has-modal-open', open);
    root.classList.toggle('gm-has-modal-open', open);
    if (open) this._syncModalBounds(root);
  }

  static _bindModalBounds(root, signal) {
    const view = root.ownerDocument.defaultView;
    const sync = () => {
      this._syncModalBounds(root);
      this._syncModalState(root);
    };
    sync();
    root.addEventListener('click', event => {
      if (!event.target?.closest?.('[data-gm-wizard-open], [data-gm-wizard-close], [data-intel-action], [data-location-action]')) return;
      view.setTimeout(sync, 0);
      view.requestAnimationFrame(sync);
    }, { signal, capture: true });
    view.addEventListener('resize', sync, { signal, passive: true });
    const screen = root.querySelector('.gm-datapad-screen') || root;
    if (view.ResizeObserver && screen instanceof HTMLElement) {
      const observer = new view.ResizeObserver(sync);
      observer.observe(screen);
      signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    }
  }

  static _stabilizeViewport(host, root, signal) {
    const view = root.ownerDocument.defaultView;
    const apply = () => {
      const scrollFrame = root.querySelector('[data-gm-surface-scrollframe], .gm-command-surface-scrollframe');
      const surfaceHost = root.querySelector('.swse-shell-surface-host');
      const stage = root.querySelector('.gm-command-surface-stage');
      const commandShell = root.querySelector('.gm-command-shell-v2');
      [scrollFrame, surfaceHost, stage, commandShell].filter(Boolean).forEach(element => {
        element.style.minHeight = '0';
        element.style.minWidth = '0';
      });
      [scrollFrame, surfaceHost].filter(Boolean).forEach(element => {
        element.style.overflowY = 'auto';
        element.style.overflowX = 'hidden';
        element.style.overscrollBehavior = 'contain';
      });
      root.getBoundingClientRect();
      scrollFrame?.getBoundingClientRect?.();
      this._syncModalBounds(root);
      if (typeof host?._applyGmDatapadPosition === 'function') {
        const element = host.element instanceof HTMLElement ? host.element : host.element?.[0];
        const rect = element?.getBoundingClientRect?.();
        host._applyGmDatapadPosition({
          left: Number(host.position?.left ?? rect?.left ?? 8),
          top: Number(host.position?.top ?? rect?.top ?? 8),
          width: Number(host.position?.width ?? rect?.width ?? 1100),
          height: Number(host.position?.height ?? rect?.height ?? 760)
        });
      }
    };
    view.requestAnimationFrame(() => view.requestAnimationFrame(apply));
    const timer1 = view.setTimeout(apply, 60);
    const timer2 = view.setTimeout(apply, 240);
    view.addEventListener('pageshow', apply, { signal, passive: true });
    view.addEventListener('focus', apply, { signal, passive: true });
    signal.addEventListener('abort', () => {
      view.clearTimeout(timer1);
      view.clearTimeout(timer2);
    }, { once: true });
  }

  static async _hydrateIntelWizard(root, signal) {
    const form = root.querySelector('form[data-intel-form]');
    if (!form || signal.aborted) return;
    const modeSelect = form.querySelector('[data-intel-mode-select-control]');
    const difficultySelect = form.querySelector('[data-intel-difficulty-select]');
    const difficultySummary = form.querySelector('[data-intel-difficulty-summary]');
    const skillGrid = form.querySelector('.gm-intel-skill-grid');
    const skillSummary = form.querySelector('[data-intel-skill-summary]');
    const dcInput = form.elements?.skillGateDc;
    const levelInput = form.elements?.cipherLevel;
    if (!modeSelect || !difficultySelect || !skillGrid || !dcInput || !levelInput) return;

    let selectedSkills = [];
    const recordId = String(form.elements?.recordId?.value || '').trim();
    if (recordId) {
      try {
        const record = await HolonetIntelService.getIntelById(recordId);
        const intel = HolonetIntelService.getIntelMetadata(record);
        selectedSkills = Array.isArray(intel?.skillGate?.skills) ? intel.skillGate.skills : [];
      } catch (_err) {}
    }
    if (!selectedSkills.length) selectedSkills = HolonetDecryptionService.defaultSkillsForMode(modeSelect.value);

    const syncSkillSummary = () => {
      const labels = Array.from(skillGrid.querySelectorAll('input[name="skillGateSkills"]:checked')).map(input => input.dataset.skillLabel || input.value);
      if (skillSummary) skillSummary.textContent = labels.length ? `${labels.length} selected: ${labels.join(', ')}` : 'No skills selected';
    };
    const renderSkills = (values) => {
      const selected = new Set(values);
      skillGrid.replaceChildren();
      for (const option of HolonetDecryptionService.skillOptions({ selected: values })) {
        const label = root.ownerDocument.createElement('label');
        label.className = `gm-intel-skill-option${selected.has(option.value) ? ' is-selected' : ''}`;
        label.title = `Allow players to roll ${option.label} against this Intel.`;
        const input = root.ownerDocument.createElement('input');
        input.type = 'checkbox';
        input.name = 'skillGateSkills';
        input.value = option.value;
        input.dataset.intelSkillOption = '';
        input.dataset.skillLabel = option.label;
        input.checked = selected.has(option.value);
        const icon = root.ownerDocument.createElement('span');
        icon.textContent = option.icon || '•';
        const text = root.ownerDocument.createElement('b');
        text.textContent = option.label;
        label.append(input, icon, text);
        skillGrid.appendChild(label);
      }
      syncSkillSummary();
    };
    renderSkills(selectedSkills);
    skillGrid.addEventListener('change', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.name !== 'skillGateSkills') return;
      input.closest('.gm-intel-skill-option')?.classList.toggle('is-selected', input.checked);
      syncSkillSummary();
    }, { signal });

    let previousDefaults = HolonetDecryptionService.defaultSkillsForMode(modeSelect.value);
    modeSelect.addEventListener('change', () => {
      const current = selectedValues(skillGrid, 'skillGateSkills');
      const nextDefaults = HolonetDecryptionService.defaultSkillsForMode(modeSelect.value);
      if (!current.length || sameValues(current, previousDefaults)) renderSkills(nextDefaults);
      previousDefaults = nextDefaults;
      root.querySelectorAll('[data-intel-mode-summary]').forEach(summary => summary.classList.toggle('is-active', summary.dataset.intelModeSummary === modeSelect.value));
    }, { signal });

    const presets = DIFFICULTY_LEVELS.map(entry => {
      const params = HolonetDecryptionService.levelParams(entry.level);
      return { ...entry, dc: params.dc, summary: `${titleCase(entry.value)} — DC ${params.dc} / Complexity ${entry.level}` };
    });
    const syncDifficulty = () => {
      const dc = Number(dcInput.value || 0);
      const level = Number(levelInput.value || 0);
      const match = presets.find(entry => entry.dc === dc && entry.level === level);
      difficultySelect.value = match?.value || 'custom';
      const selected = match || { description: `Custom values: Reveal DC ${dc}, Cipher Complexity ${level}.` };
      if (difficultySummary) difficultySummary.textContent = selected.description;
    };
    difficultySelect.replaceChildren();
    const custom = root.ownerDocument.createElement('option');
    custom.value = 'custom';
    custom.textContent = 'Custom — use the fields below';
    difficultySelect.appendChild(custom);
    for (const preset of presets) {
      const option = root.ownerDocument.createElement('option');
      option.value = preset.value;
      option.textContent = preset.summary;
      option.dataset.dc = String(preset.dc);
      option.dataset.level = String(preset.level);
      option.dataset.description = preset.description;
      difficultySelect.appendChild(option);
    }
    syncDifficulty();
    difficultySelect.addEventListener('change', () => {
      const preset = presets.find(entry => entry.value === difficultySelect.value);
      if (preset) {
        dcInput.value = String(preset.dc);
        levelInput.value = String(preset.level);
        dcInput.dispatchEvent(new Event('input', { bubbles: true }));
        levelInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      syncDifficulty();
    }, { signal });
    dcInput.addEventListener('input', syncDifficulty, { signal });
    levelInput.addEventListener('input', syncDifficulty, { signal });

    const failType = form.elements?.cipherFailType;
    if (failType && !form.querySelector('.gm-decode-failure-help')) {
      const help = root.ownerDocument.createElement('div');
      help.className = 'gm-decode-failure-help';
      help.innerHTML = '<span><strong>Attempts:</strong> only a failed skill roll spends one attempt. Successful rolls and manual letter guesses do not spend attempts.</span><span><strong>Trace:</strong> only a failed skill roll raises trace by 1. Successful rolls and manual guesses do not raise it. Reaching Trace Max locks the Intel.</span>';
      failType.closest('label')?.parentElement?.appendChild(help);
    }
  }

  static _bindJobStatusRepair(host, root, signal) {
    root.addEventListener('click', async event => {
      const button = event.target?.closest?.('[data-job-status-action], [data-job-transition-action]');
      if (!button || !root.contains(button)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const threadId = String(button.dataset.threadId || '').trim();
      const status = String(button.dataset.status || '').trim();
      if (!threadId || !status) return;
      const note = String(root.querySelector(`[data-job-status-note][data-thread-id="${CSS.escape(threadId)}"]`)?.value || '').trim();
      const thread = await HolonetStorage.getThread(threadId);
      if (!thread) {
        ui.notifications?.error?.('The selected job thread could not be found.');
        return;
      }
      const allowOverride = button.dataset.jobStatusOverride === 'true';
      const result = await HolonetMessengerService._gmTransitionJobStatus({
        thread,
        nextStatus: status,
        statusNote: note,
        requesterId: game.user?.id || null,
        senderRecipientId: null,
        allowOverride
      });
      if (!result) {
        ui.notifications?.warn?.('The job status change did not complete.');
        return;
      }
      host.selectedJobThreadId = threadId;
      await requestShellRender(host, { reason: allowOverride ? 'gm-job-status-override-repair' : 'gm-job-status-transition-repair', surfaceId: 'jobs' });
    }, { signal, capture: true });
  }
}

export default GMInteractionRepairService;
