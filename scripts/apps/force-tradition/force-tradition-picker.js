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

function uniqueTraditions(values = []) {
  const valid = new Set(FORCE_TRADITION_OPTIONS.map(option => option.value).filter(Boolean));
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = normalizeTraditionValue(value);
    if (!normalized || !valid.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function addTraditionValues(value, out = []) {
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const entry of value) addTraditionValues(entry, out);
    return out;
  }
  if (value instanceof Set) {
    for (const entry of value) addTraditionValues(entry, out);
    return out;
  }
  if (value && typeof value === 'object') {
    out.push(value.value, value.tradition, value.name, value.label, value.id, value.key);
    return out;
  }
  out.push(value);
  return out;
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

function getActorForceTraditionMemberships(actor) {
  const values = [];
  addTraditionValues(getCurrentTradition(actor), values);
  addTraditionValues(actor?.system?.forceTraditions, values);
  addTraditionValues(actor?.system?.progression?.forceTraditions, values);
  addTraditionValues(actor?.system?.progression?.adoptedForceTraditions, values);
  addTraditionValues(actor?.system?.traditions, values);
  addTraditionValues(actor?.flags?.['foundryvtt-swse']?.forceTraditions, values);
  addTraditionValues(actor?.flags?.['foundryvtt-swse']?.adoptedForceTraditions, values);
  addTraditionValues(actor?.flags?.swse?.forceTraditions, values);
  addTraditionValues(actor?.flags?.swse?.adoptedForceTraditions, values);
  return uniqueTraditions(values);
}

function getTraditionLabel(value) {
  const normalized = normalizeTraditionValue(value);
  return FORCE_TRADITION_OPTIONS.find((option) => option.value === normalized)?.label || (value ? String(value) : 'No Tradition');
}

function getTraditionSummary(primary, memberships = []) {
  if (!primary && !memberships.length) return 'No Tradition';
  const labels = memberships.map(getTraditionLabel);
  if (!primary) return `${labels.length} adopted`;
  const secondary = memberships.filter(value => value !== primary);
  return secondary.length ? `${getTraditionLabel(primary)} + ${secondary.length}` : getTraditionLabel(primary);
}

function buildPickerHtml(currentValue, memberships = []) {
  const current = normalizeTraditionValue(currentValue);
  const membershipSet = new Set(uniqueTraditions([current, ...memberships]));
  const cards = FORCE_TRADITION_OPTIONS.map((option) => {
    const checked = option.value === current ? 'checked' : '';
    const active = option.value === current ? ' is-selected is-primary' : '';
    const adopted = option.value && membershipSet.has(option.value) ? ' is-adopted' : '';
    const adoptedChecked = option.value && membershipSet.has(option.value) ? 'checked' : '';
    const none = option.none ? ' data-none' : '';
    const search = `${option.label} ${option.note} ${option.value}`.toLowerCase();
    const controls = option.none
      ? '<span class="swse-force-tradition-picker__control-note">Clears primary and adopted traditions.</span>'
      : `
        <span class="swse-force-tradition-picker__control-pill swse-force-tradition-picker__control-pill--primary">Primary</span>
        <label class="swse-force-tradition-picker__adopted-toggle">
          <input type="checkbox" name="adoptedForceTraditions" value="${escapeHtml(option.value)}" ${adoptedChecked}>
          <span>Adopted</span>
        </label>`;
    return `
      <div class="swse-force-tradition-picker__option${active}${adopted}"${none} data-value="${escapeHtml(option.value)}" data-search="${escapeHtml(search)}">
        <input type="radio" data-role="primary" name="forceTradition" value="${escapeHtml(option.value)}" ${checked}>
        <span class="swse-force-tradition-picker__copy">
          <strong>${escapeHtml(option.label)}</strong>
          <small>${escapeHtml(option.note)}</small>
        </span>
        <span class="swse-force-tradition-picker__controls">${controls}</span>
      </div>`;
  }).join('');

  return `
    <form class="swse-force-tradition-picker">
      <p class="swse-force-tradition-picker__hint">Choose the actor's primary Force tradition and optionally mark adopted traditions for house rules. This keeps <code>system.forceTradition</code> as the primary value and writes all memberships to <code>system.forceTraditions</code> for talent-tree access.</p>
      <div class="swse-force-tradition-picker__summary">
        <strong>Current Membership</strong>
        <span>${escapeHtml(getTraditionSummary(current, Array.from(membershipSet)))}</span>
      </div>
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
  const updateStateClasses = () => {
    const selected = picker.querySelector('input[name="forceTradition"]:checked');
    const primary = normalizeTraditionValue(selected?.value ?? '');
    for (const option of options()) {
      const value = normalizeTraditionValue(option.dataset.value ?? '');
      const adopted = option.querySelector('input[name="adoptedForceTraditions"]')?.checked === true;
      option.classList.toggle('is-selected', value === primary);
      option.classList.toggle('is-primary', value === primary && !!value);
      option.classList.toggle('is-adopted', adopted || (value === primary && !!value));
    }
  };

  updateCount();
  updateStateClasses();

  search?.addEventListener('input', () => {
    const query = normalizeTraditionValue(search.value);
    for (const option of options()) {
      option.hidden = !!query && !String(option.dataset.search ?? '').includes(query);
    }
    updateCount();
  });

  grid?.addEventListener('click', event => {
    if (event.target?.closest?.('.swse-force-tradition-picker__adopted-toggle')) return;
    const option = event.target?.closest?.('.swse-force-tradition-picker__option');
    const primary = option?.querySelector?.('input[name="forceTradition"]');
    if (!option || !primary) return;
    primary.checked = true;
    if (option.hasAttribute('data-none')) {
      picker.querySelectorAll('input[name="adoptedForceTraditions"]').forEach(input => { input.checked = false; });
    }
    updateStateClasses();
  });

  grid?.addEventListener('change', event => {
    if (event.target?.matches?.('input[name="forceTradition"]')) {
      if (event.target.closest('.swse-force-tradition-picker__option')?.hasAttribute('data-none')) {
        picker.querySelectorAll('input[name="adoptedForceTraditions"]').forEach(input => { input.checked = false; });
      }
      updateStateClasses();
      return;
    }
    if (event.target?.matches?.('input[name="adoptedForceTraditions"]')) {
      const none = picker.querySelector('.swse-force-tradition-picker__option[data-none] input[name="forceTradition"]');
      if (event.target.checked && none?.checked) none.checked = false;
      updateStateClasses();
    }
  });
}

function selectedTraditionStateFromHtml(html) {
  const root = getDialogRoot(html);
  const selected = root.querySelector?.('input[name="forceTradition"]:checked');
  const primary = normalizeTraditionValue(selected?.value ?? '');
  const adopted = uniqueTraditions(Array.from(root.querySelectorAll?.('input[name="adoptedForceTraditions"]:checked') ?? []).map(input => input.value));
  const memberships = primary ? uniqueTraditions([primary, ...adopted]) : adopted;
  const adoptedOnly = memberships.filter(value => value !== primary);
  return { primary, adopted: adoptedOnly, memberships };
}

export async function openForceTraditionPicker(actor, { renderSheet = null } = {}) {
  if (!actor?.isOwner) {
    ui.notifications?.warn?.('You do not have permission to edit this actor.');
    return null;
  }

  const current = getCurrentTradition(actor);
  const memberships = getActorForceTraditionMemberships(actor);
  const buttons = {
    cancel: {
      icon: '<i class="fa-solid fa-times"></i>',
      label: game?.i18n?.localize?.('Cancel') ?? 'Cancel',
      callback: () => null
    },
    ok: {
      icon: '<i class="fa-solid fa-check"></i>',
      label: 'Save Traditions',
      callback: (html) => selectedTraditionStateFromHtml(html)
    }
  };

  const result = await SWSEDialogV2.wait({
    title: 'Choose Force Tradition',
    content: buildPickerHtml(current, memberships),
    buttons,
    default: 'ok',
    render: bindPickerInteractions
  }, {
    width: 820,
    classes: ['swse-force-tradition-picker-dialog']
  });

  if (result === null || result === undefined) return null;
  const selected = typeof result === 'object'
    ? result
    : { primary: normalizeTraditionValue(result), adopted: [], memberships: uniqueTraditions([result]) };
  const primary = normalizeTraditionValue(selected.primary);
  const membershipsNext = uniqueTraditions(selected.memberships ?? [primary, ...(selected.adopted ?? [])]);
  const adoptedNext = membershipsNext.filter(value => value !== primary);

  await ActorEngine.updateActor(actor, {
    'system.forceTradition': primary,
    'system.forceTraditions': membershipsNext,
    'system.progression.forceTradition': primary,
    'system.progression.forceTraditions': membershipsNext,
    'system.progression.adoptedForceTraditions': adoptedNext,
    'flags.foundryvtt-swse.forceTradition': primary,
    'flags.foundryvtt-swse.forceTraditions': membershipsNext,
    'flags.foundryvtt-swse.adoptedForceTraditions': adoptedNext,
    'flags.swse.forceTradition': primary,
    'flags.swse.forceTraditions': membershipsNext,
    'flags.swse.adoptedForceTraditions': adoptedNext,
  }, {
    meta: { guardKey: 'force-tradition-picker-save' },
    source: 'force-tradition-picker'
  });

  const notice = primary
    ? `${getTraditionLabel(primary)}${adoptedNext.length ? ` plus ${adoptedNext.length} adopted` : ''}`
    : adoptedNext.length ? `${adoptedNext.length} adopted tradition${adoptedNext.length === 1 ? '' : 's'}` : 'No Tradition';
  ui.notifications?.info?.(`Force traditions set to ${notice}.`);
  if (typeof renderSheet === 'function') renderSheet();
  return { primary, adopted: adoptedNext, memberships: membershipsNext };
}

function ensurePickerButton(root) {
  const select = root.querySelector('.fs-tradition-select[data-action="set-force-tradition"], select[name="system.forceTradition"]');
  if (!select || select.dataset.forceTraditionPickerEnhanced === 'true') return;

  const actor = getActorFromSheetApp(globalThis.ui?.windows?.[root.closest?.('[data-appid]')?.dataset?.appid]);
  const currentLabel = actor ? getTraditionSummary(getCurrentTradition(actor), getActorForceTraditionMemberships(actor)) : getTraditionLabel(select.value);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mv fs-tradition-picker-btn';
  button.dataset.action = 'open-force-tradition-picker';
  button.textContent = currentLabel === 'No Tradition' ? 'Choose Tradition' : currentLabel;
  button.title = 'Choose this actor\'s Force tradition memberships';

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
  const buttonLabel = getTraditionSummary(getCurrentTradition(actor), getActorForceTraditionMemberships(actor));

  root.querySelectorAll('[data-action="open-force-tradition-picker"]').forEach((button) => {
    button.textContent = buttonLabel === 'No Tradition' ? 'Choose Tradition' : buttonLabel;
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
