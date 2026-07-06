import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';

export const FORCE_TRADITION_OPTIONS = [
  { value: '', label: 'No Tradition', note: 'No Force tradition is currently selected.' },
  { value: 'the jensaarai', label: 'The Jensaarai', note: 'Unlocks the Jensaarai Defender tradition tree when eligible.' },
  { value: 'the witches of dathomir', label: 'The Witches of Dathomir', note: 'Unlocks the Dathomiri Witch tradition tree when eligible.' },
  { value: 'the jal shey', label: 'The Jal Shey', note: 'Unlocks the Jal Shey tradition tree when eligible.' },
  { value: 'the keetael', label: 'The Keetael', note: 'Unlocks the Keetael tradition tree when eligible.' },
  { value: 'the krath', label: 'The Krath', note: 'Unlocks the Krath tradition tree when eligible.' },
  { value: 'the luka sene', label: 'The Luka Sene', note: 'Unlocks the Luka Sene tradition tree when eligible.' },
  { value: 'the order of shasa', label: 'The Order of Shasa', note: 'Unlocks the Order of Shasa tradition tree when eligible.' },
  { value: 'the agents of ossus', label: 'The Agents of Ossus', note: 'Unlocks the Agent of Ossus tradition tree when eligible.' },
  { value: 'the felucian shamans', label: 'The Felucian Shamans', note: 'Unlocks the Felucian Shaman tradition tree when eligible.' },
  { value: 'the bando gora', label: 'The Bando Gora', note: 'Unlocks the Bando Gora Captain tradition tree when eligible.' },
  { value: 'the believers', label: 'The Believers', note: 'Unlocks the Believer Disciple tradition tree when eligible.' },
  { value: 'the korunnai', label: 'The Korunnai', note: 'Unlocks the Korunnai Adept tradition tree when eligible.' },
  { value: 'the disciples of twilight', label: 'The Disciples of Twilight', note: 'Unlocks the Disciple of Twilight tradition tree when eligible.' },
  { value: 'the ember of vahl', label: 'The Ember of Vahl', note: 'Unlocks the Ember of Vahl tradition tree when eligible.' },
  { value: 'the aing tii monks', label: 'The Aing-Tii Monks', note: 'Unlocks the Aing-Tii Monk tradition tree when eligible.' },
  { value: 'the baran do sages', label: 'The Baran Do Sages', note: 'Unlocks the Baran-Do Sage tradition tree when eligible.' },
  { value: 'the iron knights', label: 'The Iron Knights', note: 'Unlocks the Iron Knight tradition tree when eligible.' },
  { value: 'the matukai', label: 'The Matukai', note: 'Unlocks the Matukai Adept tradition tree when eligible.' },
  { value: 'the seyugi dervishes', label: 'The Seyugi Dervishes', note: 'Unlocks the Seyugi Dervish tradition tree when eligible.' },
  { value: 'the shapers of kro var', label: 'The Shapers of Kro Var', note: 'Unlocks the Shaper of Kro Var tradition tree when eligible.' },
  { value: 'the tyia', label: 'The Tyia', note: 'Unlocks the Tyia Adept tradition tree when eligible.' },
  { value: 'the wardens of the sky', label: 'The Wardens of the Sky', note: 'Unlocks the Warden of the Sky tradition tree when eligible.' },
  { value: 'the fallanassi', label: 'The Fallanassi / White Current', note: 'Unlocks the White Current Adept tradition tree when eligible.' },
  { value: 'the zeison sha', label: 'The Zeison Sha', note: 'Unlocks the Zeison Sha Warrior tradition tree when eligible.' },
  { value: 'the kilian rangers', label: 'The Kilian Rangers', note: 'Unlocks the Kilian Ranger tradition tree when eligible.' },
  { value: 'the blazing chain', label: 'The Blazing Chain', note: 'Unlocks the Blazing Chain tradition tree when eligible.' },
];

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function getActorFromSheetApp(app) {
  return app?.actor || app?.document || null;
}

function getCurrentTradition(actor) {
  return String(
    actor?.system?.forceTradition
    ?? actor?.system?.progression?.forceTradition
    ?? actor?.flags?.swse?.forceTradition
    ?? ''
  );
}

function getTraditionLabel(value) {
  const normalized = String(value ?? '').toLowerCase().trim();
  return FORCE_TRADITION_OPTIONS.find((option) => option.value === normalized)?.label || (value ? String(value) : 'No Tradition');
}

function buildPickerHtml(currentValue) {
  const current = String(currentValue ?? '').toLowerCase().trim();
  const cards = FORCE_TRADITION_OPTIONS.map((option) => {
    const checked = option.value === current ? 'checked' : '';
    const active = option.value === current ? ' is-selected' : '';
    return `
      <label class="swse-force-tradition-picker__option${active}">
        <input type="radio" name="forceTradition" value="${escapeHtml(option.value)}" ${checked}>
        <span class="swse-force-tradition-picker__copy">
          <strong>${escapeHtml(option.label)}</strong>
          <small>${escapeHtml(option.note)}</small>
        </span>
      </label>`;
  }).join('');

  return `
    <form class="swse-force-tradition-picker">
      <p class="swse-force-tradition-picker__hint">Choose the actor's Force tradition. This updates <code>system.forceTradition</code> and is used by Force tradition talent-tree access.</p>
      <div class="swse-force-tradition-picker__grid">${cards}</div>
    </form>`;
}

export async function openForceTraditionPicker(actor, { renderSheet = null } = {}) {
  if (!actor?.isOwner) {
    ui.notifications?.warn?.('You do not have permission to edit this actor.');
    return null;
  }

  const current = getCurrentTradition(actor);
  const result = await SWSEDialogV2.prompt({
    title: 'Choose Force Tradition',
    label: 'Save Tradition',
    content: buildPickerHtml(current),
    callback: (html) => {
      const root = html?.[0] || html?.element || document;
      const selected = root.querySelector?.('input[name="forceTradition"]:checked');
      return selected?.value ?? '';
    },
    options: {
      width: 720,
      classes: ['swse-force-tradition-picker-dialog']
    }
  });

  if (result === null || result === undefined) return null;
  const selected = String(result ?? '').trim();
  await actor.update({
    'system.forceTradition': selected,
    'system.progression.forceTradition': selected,
    'flags.swse.forceTradition': selected,
  });
  ui.notifications?.info?.(`Force tradition set to ${getTraditionLabel(selected)}.`);
  if (typeof renderSheet === 'function') renderSheet();
  return selected;
}

function ensurePickerButton(root) {
  const select = root.querySelector('.fs-tradition-select[data-action="set-force-tradition"], select[name="system.forceTradition"]');
  if (!select || select.dataset.forceTraditionPickerEnhanced === 'true') return;

  const currentLabel = getTraditionLabel(select.value);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mv fs-tradition-picker-btn';
  button.dataset.action = 'open-force-tradition-picker';
  button.textContent = currentLabel === 'No Tradition' ? 'Choose Tradition' : currentLabel;
  button.title = 'Choose this actor\'s Force tradition';

  select.dataset.forceTraditionPickerEnhanced = 'true';
  select.style.display = 'none';
  select.insertAdjacentElement('afterend', button);
}

function bindForceTraditionPicker(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const actor = getActorFromSheetApp(app);
  if (!actor) return;

  ensurePickerButton(root);

  root.querySelectorAll('[data-action="open-force-tradition-picker"]').forEach((button) => {
    if (button.dataset.forceTraditionPickerBound === 'true') return;
    button.dataset.forceTraditionPickerBound = 'true';
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await openForceTraditionPicker(actor, { renderSheet: () => app.render?.(false) });
    });
  });
}

export function registerForceTraditionPickerHooks() {
  Hooks.on('renderSWSEV2CharacterSheet', bindForceTraditionPicker);
  Hooks.on('renderApplication', (app, html) => {
    if (app?.constructor?.name !== 'SWSEV2CharacterSheet') return;
    bindForceTraditionPicker(app, html);
  });

  globalThis.SWSE ??= {};
  globalThis.SWSE.openForceTraditionPicker = openForceTraditionPicker;
}
