import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

export const FORCE_TRADITION_OPTIONS = [
  { value: '', label: 'No Tradition', note: 'No Force tradition is currently selected.', none: true },
  { value: 'the jensaarai', label: 'The Jensaarai', note: 'Hidden armored defenders who blend Jedi and Sith teachings into a single creed.' },
  { value: 'the witches of dathomir', label: 'The Witches of Dathomir', note: 'Clan mystics who shape the Force through spoken spells and ritual chants.' },
  { value: 'the jal shey', label: 'The Jal Shey', note: 'Detached scholars who master the Force through reason and intellect over emotion.' },
  { value: 'the keetael', label: 'The Keetael', note: 'A secretive circle of Force-attuned healers and keepers of old lore.' },
  { value: 'the krath', label: 'The Krath', note: 'Sith-inspired sorcerers wielding dark-side magic and ancient rituals.' },
  { value: 'the luka sene', label: 'The Luka Sene', note: 'Miraluka sense-adepts, unrivaled masters of Force sight and perception.' },
  { value: 'the order of shasa', label: 'The Order of Shasa', note: 'Aquatic mystics of Manaan awakened to the Force through a sacred power.' },
  { value: 'the agents of ossus', label: 'The Agents of Ossus', note: 'Guardians who safeguard the ancient Jedi knowledge left on Ossus.' },
  { value: 'the felucian shamans', label: 'The Felucian Shamans', note: 'Primal healers who channel the living Force of Felucia’s jungles.' },
  { value: 'the bando gora', label: 'The Bando Gora', note: 'A death-worshipping cult that twists the dark side through fear and pain.' },
  { value: 'the believers', label: 'The Believers', note: 'A Cularin dark-side cult devoted to a prophesied master of shadow.' },
  { value: 'the korunnai', label: 'The Korunnai', note: 'Force-sensitive clans of Haruun Kal, bonded to their jungle world.' },
  { value: 'the disciples of twilight', label: 'The Disciples of Twilight', note: 'Shadow-walkers who seek balance between the light and dark sides.' },
  { value: 'the ember of vahl', label: 'The Ember of Vahl', note: 'Fire-wielding dark-side assassins sworn to a vengeful goddess.' },
  { value: 'the aing tii monks', label: 'The Aing-Tii Monks', note: 'Enigmatic monks who bend space and see beyond light and dark.' },
  { value: 'the baran do sages', label: 'The Baran Do Sages', note: 'Kel Dor seers who foresee danger and disaster through the Force.' },
  { value: 'the iron knights', label: 'The Iron Knights', note: 'Crystalline Shard beings who fight as Force-attuned warriors in droid bodies.' },
  { value: 'the matukai', label: 'The Matukai', note: 'Ascetics who unite body and Force through relentless physical discipline.' },
  { value: 'the seyugi dervishes', label: 'The Seyugi Dervishes', note: 'Warrior-mystics whose whirling battle dances channel the Force.' },
  { value: 'the shapers of kro var', label: 'The Shapers of Kro Var', note: 'Elementalists who command earth, wind, fire, and water through will.' },
  { value: 'the tyia', label: 'The Tyia', note: 'Peaceful mystics who follow the Force as a quiet guiding life-path.' },
  { value: 'the wardens of the sky', label: 'The Wardens of the Sky', note: 'Vigilant protectors who shield their people through watchfulness and the Force.' },
  { value: 'the fallanassi', label: 'The Fallanassi / White Current', note: 'Illusionists who flow with the White Current to weave flawless illusions.' },
  { value: 'the zeison sha', label: 'The Zeison Sha', note: 'Self-taught survivors who hurl discblades with raw telekinetic force.' },
  { value: 'the kilian rangers', label: 'The Kilian Rangers', note: 'Armored knights bonded to steed and blade through the Force.' },
  { value: 'the blazing chain', label: 'The Blazing Chain', note: 'A militant order bound by oath and Force-forged discipline.' },
];

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function normalizeTraditionValue(value) {
  return String(value ?? '').toLowerCase().trim();
}

function getActorFromSheetApp(app) {
  return app?.actor || app?.document || null;
}

function getCurrentTradition(actor) {
  return normalizeTraditionValue(
    actor?.system?.forceTradition
    ?? actor?.system?.progression?.forceTradition
    ?? actor?.flags?.['foundryvtt-swse']?.forceTradition
    ?? actor?.flags?.swse?.forceTradition
    ?? ''
  );
}

function getTraditionLabel(value) {
  const normalized = normalizeTraditionValue(value);
  return FORCE_TRADITION_OPTIONS.find((option) => option.value === normalized)?.label || (value ? String(value) : 'No Tradition');
}

function buildPickerHtml(currentValue) {
  const current = normalizeTraditionValue(currentValue);
  const cards = FORCE_TRADITION_OPTIONS.map((option) => {
    const checked = option.value === current ? 'checked' : '';
    const active = option.value === current ? ' is-selected' : '';
    const none = option.none ? ' data-none' : '';
    const search = `${option.label} ${option.note} ${option.value}`.toLowerCase();
    return `
      <label class="swse-force-tradition-picker__option${active}"${none} data-search="${escapeHtml(search)}">
        <input type="radio" name="forceTradition" value="${escapeHtml(option.value)}" ${checked}>
        <span class="swse-force-tradition-picker__copy">
          <strong>${escapeHtml(option.label)}</strong>
          <small>${escapeHtml(option.note)}</small>
        </span>
      </label>`;
  }).join('');

  return `
    <form class="swse-force-tradition-picker">
      <p class="swse-force-tradition-picker__hint">Choose the actor's Force tradition. This updates <code>system.forceTradition</code> and gates Force-tradition talent-tree access.</p>
      <div class="swse-force-tradition-picker__search">
        <input type="text" name="forceTraditionSearch" placeholder="Filter traditions…" autocomplete="off">
        <span class="swse-force-tradition-picker__count"></span>
      </div>
      <div class="swse-force-tradition-picker__grid">${cards}</div>
    </form>`;
}

function getDialogRoot(html) {
  return html?.[0] || html?.element || (html instanceof HTMLElement ? html : document);
}

function bindPickerInteractions(html) {
  const root = getDialogRoot(html);
  const picker = root.querySelector?.('.swse-force-tradition-picker');
  if (!picker || picker.dataset.forceTraditionPickerBound === 'true') return;
  picker.dataset.forceTraditionPickerBound = 'true';

  const search = picker.querySelector('input[name="forceTraditionSearch"]');
  const count = picker.querySelector('.swse-force-tradition-picker__count');
  const grid = picker.querySelector('.swse-force-tradition-picker__grid');
  const options = () => Array.from(grid?.querySelectorAll('.swse-force-tradition-picker__option') ?? []);
  const visibleOptions = () => options().filter(option => !option.hidden);
  const updateCount = () => {
    if (!count) return;
    count.textContent = `${visibleOptions().length} / ${FORCE_TRADITION_OPTIONS.length}`;
  };

  updateCount();

  search?.addEventListener('input', () => {
    const query = normalizeTraditionValue(search.value);
    for (const option of options()) {
      option.hidden = !!query && !String(option.dataset.search ?? '').includes(query);
    }
    updateCount();
  });

  grid?.addEventListener('change', event => {
    if (!event.target?.matches?.('input[name="forceTradition"]')) return;
    for (const option of options()) option.classList.remove('is-selected');
    event.target.closest('.swse-force-tradition-picker__option')?.classList.add('is-selected');
  });
}

function selectedTraditionFromHtml(html) {
  const root = getDialogRoot(html);
  const selected = root.querySelector?.('input[name="forceTradition"]:checked');
  return normalizeTraditionValue(selected?.value ?? '');
}

export async function openForceTraditionPicker(actor, { renderSheet = null } = {}) {
  if (!actor?.isOwner) {
    ui.notifications?.warn?.('You do not have permission to edit this actor.');
    return null;
  }

  const current = getCurrentTradition(actor);
  const buttons = {
    cancel: {
      icon: '<i class="fa-solid fa-times"></i>',
      label: game?.i18n?.localize?.('Cancel') ?? 'Cancel',
      callback: () => null
    },
    ok: {
      icon: '<i class="fa-solid fa-check"></i>',
      label: 'Save Tradition',
      callback: (html) => selectedTraditionFromHtml(html)
    }
  };

  const result = await SWSEDialogV2.wait({
    title: 'Choose Force Tradition',
    content: buildPickerHtml(current),
    buttons,
    default: 'ok',
    render: bindPickerInteractions
  }, {
    width: 760,
    classes: ['swse-force-tradition-picker-dialog']
  });

  if (result === null || result === undefined) return null;
  const selected = normalizeTraditionValue(result);
  await ActorEngine.updateActor(actor, {
    'system.forceTradition': selected,
    'system.progression.forceTradition': selected,
    'flags.foundryvtt-swse.forceTradition': selected,
    'flags.swse.forceTradition': selected,
  }, {
    meta: { guardKey: 'force-tradition-picker-save' },
    source: 'force-tradition-picker'
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
