import { WeaponVisualProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js";

/**
 * Holopad-wide roll companion.
 * Displays a stylized in-holopad visual modal for any roll initiated from
 * inside the SWSE shell/holopad/datapad. Chat cards remain authoritative.
 *
 * The companion intentionally reuses the Chat V2 visual contract:
 *   - .swse-chat-card / .swse-roll-card category classes
 *   - --rail for all color identity
 *   - data-ability for skill/ability color rails
 *   - data-descriptor for Force descriptor rails
 *   - weaponVisual.colorHex for attack/damage weapon colors
 *
 * Design constraints:
 *   - NEVER calls new Roll(), Roll.create(), or .roll()
 *   - NEVER replaces or modifies chat cards
 *   - Exactly one companion element per sheet — replaced on each new roll
 */

const COMPANION_CLASS = 'swse-holopad-roll-companion';
const AUTO_DISMISS_MS = 4500;

const HOLOPAD_ROOT_SELECTORS = [
  '.swse-v2-screen--concept',
  '.swse-ui-shell',
  '.swse-character-sheet-wrapper',
  '[data-appid]',
];

const ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const SKILL_ABILITY_FALLBACKS = {
  acrobatics: 'dex',
  climb: 'str',
  deception: 'cha',
  endurance: 'con',
  gatherinformation: 'cha',
  gather_information: 'cha',
  initiative: 'dex',
  jump: 'str',
  knowledge: 'int',
  mechanics: 'int',
  perception: 'wis',
  persuasion: 'cha',
  pilot: 'dex',
  ride: 'dex',
  stealth: 'dex',
  survival: 'wis',
  swim: 'str',
  treatinjury: 'wis',
  treat_injury: 'wis',
  usecomputer: 'int',
  use_computer: 'int',
  usetheforce: 'cha',
  use_the_force: 'cha',
};

const FORCE_DESCRIPTOR_LABELS = {
  light: 'Light Side',
  dark: 'Dark Side',
  tk: 'Telekinetic',
  mind: 'Mind-Affecting',
  form: 'Form',
};

/**
 * Show the holopad roll companion modal inside the sheet that originated the roll.
 *
 * @param {HTMLElement|Application} source - Button element or sheet Application instance
 * @param {object} rollResult - Result object returned by the roll engine
 * @param {object} [options] - Display options
 * @returns {boolean} true if companion was displayed, false if no root found
 */
export function showHolopadRollCompanion(source, rollResult, options = {}) {
  const root = _findHolopadRoot(source, options);
  if (!root) return false;

  const model = _normalizeRollResult(source, rollResult, options);
  const host = _ensureCompanionHost(root);
  _renderCompanion(host, model);
  return true;
}

function _findHolopadRoot(source, options = {}) {
  const explicit = _elementFromSource(options.sourceElement)
    ?? _elementFromSource(options.companionSource)
    ?? _elementFromSource(options.event?.currentTarget)
    ?? _elementFromSource(source);

  const explicitRoot = _rootFromElement(explicit);
  if (explicitRoot) return explicitRoot;

  const appRoot = _rootFromApplication(options.sheet)
    ?? _rootFromApplication(options.application)
    ?? _rootFromApplication(source)
    ?? _rootFromApplication(options.actor?.sheet);
  if (appRoot) return appRoot;

  const actorRoot = _rootFromActor(options.actor ?? source?.actor ?? source);
  if (actorRoot) return actorRoot;

  return _bestVisibleHolopadRoot();
}

function _elementFromSource(source) {
  if (!source) return null;
  if (source instanceof HTMLElement) return source;
  if (source?.currentTarget instanceof HTMLElement) return source.currentTarget;
  if (source?.target instanceof HTMLElement) return source.target;
  if (source?.element instanceof HTMLElement) return source.element;
  if (source?.element?.[0] instanceof HTMLElement) return source.element[0];
  if (source?.querySelector instanceof Function) return source;
  return null;
}

function _rootFromElement(el) {
  if (!(el instanceof HTMLElement)) return null;
  for (const sel of HOLOPAD_ROOT_SELECTORS) {
    const match = el.matches?.(sel) ? el : el.closest?.(sel);
    if (match && _isVisibleElement(match)) return _preferScreenRoot(match);
  }
  return null;
}

function _rootFromApplication(app) {
  if (!app) return null;
  return _rootFromElement(_elementFromSource(app));
}

function _rootFromActor(actor) {
  const actorId = actor?.id ?? actor?.document?.id ?? null;
  const apps = [
    ...Object.values(actor?.apps ?? {}),
    actor?.sheet,
    ...Object.values(globalThis.ui?.windows ?? {}).filter(app => app?.actor?.id === actorId || app?.document?.id === actorId)
  ];

  for (const app of apps) {
    const root = _rootFromApplication(app);
    if (root) return root;
  }

  if (actorId) {
    const actorMarked = document.querySelector(`[data-actor-id="${CSS.escape(actorId)}"], [data-document-id="${CSS.escape(actorId)}"]`);
    const markedRoot = _rootFromElement(actorMarked);
    if (markedRoot) return markedRoot;
  }

  return null;
}

function _bestVisibleHolopadRoot() {
  const roots = [];
  for (const sel of HOLOPAD_ROOT_SELECTORS) {
    document.querySelectorAll(sel).forEach(root => {
      const preferred = _preferScreenRoot(root);
      if (preferred && !roots.includes(preferred) && _isVisibleElement(preferred)) roots.push(preferred);
    });
  }

  if (!roots.length) return null;
  roots.sort((a, b) => _rootScore(b) - _rootScore(a));
  return roots[0];
}

function _preferScreenRoot(root) {
  if (!(root instanceof HTMLElement)) return null;
  if (root.matches?.('.swse-v2-screen--concept, .swse-ui-shell')) return root;
  return root.querySelector?.('.swse-v2-screen--concept, .swse-ui-shell') ?? root;
}

function _isVisibleElement(el) {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function _rootScore(root) {
  const rect = root.getBoundingClientRect();
  const z = Number.parseInt(getComputedStyle(root).zIndex, 10);
  const zScore = Number.isFinite(z) ? z : 0;
  const area = Math.max(0, rect.width) * Math.max(0, rect.height);
  const activeBoost = root.contains(document.activeElement) ? 1000000 : 0;
  const sheetBoost = root.closest('.application, .app, [data-appid]') ? 500000 : 0;
  return activeBoost + sheetBoost + zScore + area / 1000;
}

function _normalizeRollResult(source, result, options = {}) {
  const rawRoll = result?.roll ?? (result?.total != null && (result?.dice || result?.terms || result?.formula) ? result : null);
  const dice = _extractDiceResults(rawRoll);
  const d20 = dice.find(d => d.faces === 20);
  const d20Result = _firstNumber(result?.d20?.result, result?.d20, d20?.result);
  const total = _firstNumber(rawRoll?.total, result?.total);
  const kind = _normalizeKind(options.kind ?? result?.kind ?? result?.type ?? result?.context?.type ?? 'generic');
  const actor = options.actor ?? result?.actor ?? null;
  const weapon = options.weapon ?? options.item ?? result?.weapon ?? result?.context?.weapon ?? null;
  const sourceItem = options.sourceItem ?? options.forcePower ?? options.power ?? result?.sourceItem ?? null;
  const skillKey = _normalizeKey(options.skillKey ?? source?.dataset?.skill ?? result?.skillKey ?? result?.context?.skillKey);
  const abilityKey = _resolveAbilityKey({ source, result, options, actor, kind, skillKey });
  const forceDescriptor = _resolveForceDescriptor({ sourceItem, result, options, kind });
  const railColor = _resolveRailColor({ weapon, actor, result, options });
  const modifier = _resolveModifier(result, rawRoll, d20Result, total);
  const dc = _firstNumber(options.dc, result?.dc, result?.context?.dc, result?.targetDefense, result?.context?.targetDefense);
  const success = result?.success ?? result?.passed ?? result?.context?.success ?? result?.context?.passed ?? null;
  const isHit = result?.isHit ?? result?.context?.isHit ?? null;
  const isCritical = result?.critConfirmed ?? result?.isCritical ?? result?.context?.isCritical ?? (kind === 'attack' && d20Result === 20) ?? false;
  const isFumble = result?.isFumble ?? result?.context?.isFumble ?? (d20Result === 1) ?? false;
  const outcome = _resolveOutcomeLabel({ success, isHit, isCritical, isFumble, result });
  const effectText = options.effectText ?? result?.effectText ?? result?.effect ?? result?.context?.effect ?? null;
  const tierLabel = options.tierLabel ?? result?.tierLabel ?? result?.tier ?? result?.context?.tierLabel ?? null;
  const title = options.title ?? result?.title ?? result?.label ?? _defaultTitle(kind, abilityKey, skillKey);
  const itemName = options.itemName ?? sourceItem?.name ?? weapon?.name ?? result?.itemName ?? result?.powerName ?? result?.power ?? null;
  const actorName = options.actorName ?? actor?.name ?? result?.actorName ?? null;
  const damageType = options.damageType ?? result?.damageType ?? result?.context?.damageType ?? weapon?.system?.damageType ?? weapon?.system?.damage?.type ?? null;
  const typeChipLabel = _resolveTypeChipLabel({ kind, abilityKey, skillKey, forceDescriptor, weapon, itemName, title });
  const totalLabel = _resolveTotalLabel({ kind, damageType, success, total });
  const parts = _buildParts({ rawRoll, d20Result, modifier, dc, total, result });
  const railStyle = railColor ? `--rail: ${_cssSafe(railColor)}; --swse-weapon-visual-color: ${_cssSafe(railColor)};` : '';

  return {
    kind,
    categoryClass: _categoryClass(kind),
    title,
    actorName,
    itemName,
    typeChipLabel,
    totalLabel,
    formula: rawRoll?.formula ?? result?.formula ?? null,
    die: d20Result,
    dice,
    modifier,
    total,
    displayTotal: total != null ? String(total) : (success === true ? '✓' : success === false ? '×' : '—'),
    dc,
    outcome,
    success,
    isHit,
    isCritical,
    isFumble,
    isNatural20: d20Result === 20,
    isNatural1: d20Result === 1,
    tierLabel,
    effectText,
    damageType,
    parts,
    abilityKey,
    abilityBadge: abilityKey ? abilityKey.toUpperCase().slice(0, 3) : '',
    forceDescriptor,
    forceDescriptorLabel: forceDescriptor ? (FORCE_DESCRIPTOR_LABELS[forceDescriptor] ?? _labelize(forceDescriptor)) : '',
    railColor,
    railStyle,
    chatMessageId: result?.chatMessageId ?? result?.messageId ?? result?.message?.id ?? null,
  };
}

function _normalizeKind(value = '') {
  const key = String(value || '').toLowerCase().replace(/[_\s]+/g, '-');
  if (key.includes('force')) return 'force';
  if (key.includes('attack')) return 'attack';
  if (key.includes('damage')) return 'damage';
  if (key.includes('skill')) return 'skill';
  if (key.includes('abil')) return 'ability';
  if (key.includes('init')) return 'initiative';
  if (key.includes('save')) return 'save';
  if (key.includes('defense')) return 'save';
  if (key.includes('starship')) return 'starship-maneuver';
  return key || 'generic';
}

function _categoryClass(kind) {
  const map = {
    force: 'force',
    attack: 'attack',
    damage: 'damage',
    skill: 'skill',
    ability: 'ability',
    initiative: 'initiative',
    save: 'save',
    'starship-maneuver': 'force',
  };
  return map[kind] ?? 'dialogue';
}

function _resolveAbilityKey({ source, result, options, actor, kind, skillKey }) {
  const explicit = _normalizeKey(options.abilityKey ?? options.ability ?? source?.dataset?.ability ?? result?.abilityKey ?? result?.ability ?? result?.context?.abilityKey);
  if (explicit && ABILITY_LABELS[explicit]) return explicit;

  if (skillKey) {
    const actorSkill = actor?.system?.skills?.[skillKey];
    const actorAbility = _normalizeKey(actorSkill?.ability ?? actorSkill?.abilityKey ?? actorSkill?.attribute);
    if (actorAbility && ABILITY_LABELS[actorAbility]) return actorAbility;

    const flat = skillKey.replace(/[^a-z0-9]/g, '');
    const mapped = SKILL_ABILITY_FALLBACKS[skillKey] ?? SKILL_ABILITY_FALLBACKS[flat];
    if (mapped) return mapped;
  }

  if (kind === 'initiative') return 'dex';
  return '';
}

function _resolveForceDescriptor({ sourceItem, result, options, kind }) {
  if (kind !== 'force' && kind !== 'starship-maneuver') return '';
  const values = [];
  const add = value => {
    if (Array.isArray(value)) value.forEach(add);
    else if (value != null && String(value).trim()) values.push(String(value).trim());
  };
  add(options.forceDescriptor);
  add(options.descriptor);
  add(options.descriptors);
  add(result?.forceDescriptor);
  add(result?.descriptor);
  add(result?.descriptors);
  add(result?.tags);
  add(result?.context?.forceDescriptor);
  add(result?.context?.descriptors);
  add(sourceItem?.system?.descriptor);
  add(sourceItem?.system?.descriptors);
  add(sourceItem?.system?.tags);
  add(sourceItem?.name);
  add(options.itemName);
  add(options.title);

  for (const value of values) {
    const key = _forceDescriptorKey(value);
    if (key) return key;
  }
  return kind === 'starship-maneuver' ? 'tk' : 'light';
}

function _forceDescriptorKey(value = '') {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('dark')) return 'dark';
  if (text.includes('tele') || text.includes('move object') || text.includes('grip') || text.includes('push') || text === 'tk') return 'tk';
  if (text.includes('mind') || text.includes('affect') || text.includes('trick')) return 'mind';
  if (text.includes('form') || text.includes('lightsaber') || text.includes('shien') || text.includes('soresu') || text.includes('ataru') || text.includes('djem')) return 'form';
  if (text.includes('light') || text.includes('vital') || text.includes('surge') || text.includes('battle strike')) return 'light';
  return '';
}

function _resolveRailColor({ weapon, actor, result, options }) {
  const explicit = options.railColor
    ?? options.colorHex
    ?? result?.railColor
    ?? result?.weaponVisual?.colorHex
    ?? result?.context?.weaponVisual?.colorHex
    ?? options.weaponVisual?.colorHex;
  if (explicit) return String(explicit);

  if (weapon) {
    try {
      const visual = WeaponVisualProfileResolver.toChatView(WeaponVisualProfileResolver.resolve(weapon, { actor }));
      if (visual?.colorHex) return visual.colorHex;
    } catch {
      // Visual color is optional; category/ability/descriptor colors still apply.
    }
  }
  return '';
}

function _resolveModifier(result, rawRoll, d20Result, total) {
  const explicit = _firstNumber(result?.modifier, result?.context?.modifier, result?.bonus, result?.context?.bonus);
  if (explicit != null) return explicit;
  if (d20Result != null && total != null) return Number(total) - Number(d20Result);
  const terms = rawRoll?.terms ?? [];
  let sum = 0;
  let found = false;
  for (const term of terms) {
    if (typeof term?.number === 'number') {
      sum += term.number;
      found = true;
    }
  }
  return found ? sum : null;
}

function _buildParts({ rawRoll, d20Result, modifier, dc, total, result }) {
  const parts = [];
  if (d20Result != null) parts.push({ label: 'd20', value: d20Result, kind: d20Result === 20 ? 'nat20' : d20Result === 1 ? 'nat1' : '' });
  if (modifier != null) parts.push({ label: 'Modifier', value: _signed(modifier) });
  if (dc != null) parts.push({ label: 'DC', value: dc });
  if (total != null) parts.push({ label: 'Total', value: total });

  const sourceParts = result?.parts ?? result?.context?.parts ?? [];
  if (Array.isArray(sourceParts)) {
    for (const part of sourceParts.slice(0, 6)) {
      const label = part?.label ?? part?.name ?? part?.key;
      if (!label) continue;
      parts.push({ label: String(label), value: part?.value ?? part?.bonus ?? part?.total ?? '' });
    }
  }

  if (!parts.length && rawRoll?.formula) parts.push({ label: 'Formula', value: rawRoll.formula });
  return parts.slice(0, 8);
}

function _resolveTypeChipLabel({ kind, abilityKey, skillKey, forceDescriptor, weapon, itemName, title }) {
  if (kind === 'skill') {
    const skill = _labelize(skillKey || title || 'Skill');
    return `${skill}${abilityKey ? ` · ${abilityKey.toUpperCase()}` : ''}`;
  }
  if (kind === 'ability') return `${ABILITY_LABELS[abilityKey] ?? _labelize(abilityKey) ?? 'Ability'} Check`;
  if (kind === 'force') return `Force${forceDescriptor ? ` · ${FORCE_DESCRIPTOR_LABELS[forceDescriptor] ?? _labelize(forceDescriptor)}` : ''}`;
  if (kind === 'attack') return `${weapon?.name ?? itemName ?? 'Attack'}`;
  if (kind === 'damage') return `Damage`;
  if (kind === 'initiative') return 'Initiative';
  if (kind === 'save') return 'Save';
  if (kind === 'starship-maneuver') return 'Starship Maneuver';
  return _labelize(kind || 'Roll');
}

function _resolveTotalLabel({ kind, damageType, success, total }) {
  if (kind === 'attack') return 'vs Defense';
  if (kind === 'damage') return damageType ? 'Damage' : 'Damage';
  if (kind === 'force') return total != null ? 'UTF Check' : (success === true ? 'Resolved' : 'Force');
  if (kind === 'initiative') return 'Init';
  if (kind === 'save') return 'Save';
  if (kind === 'starship-maneuver') return 'Used';
  return 'Total';
}

function _resolveOutcomeLabel({ success, isHit, isCritical, isFumble, result }) {
  if (isCritical) return { label: 'Critical', state: 'crit' };
  if (isFumble) return { label: 'Fumble', state: 'failure' };
  const label = result?.outcomeLabel ?? result?.context?.outcomeLabel ?? result?.verdict ?? '';
  if (label) return { label: String(label), state: success === false || isHit === false ? 'failure' : 'success' };
  if (isHit === true) return { label: 'Hit', state: 'success' };
  if (isHit === false) return { label: 'Miss', state: 'failure' };
  if (success === true) return { label: 'Success', state: 'success' };
  if (success === false) return { label: 'Failure', state: 'failure' };
  return null;
}

function _defaultTitle(kind, abilityKey, skillKey) {
  if (kind === 'ability') return `${ABILITY_LABELS[abilityKey] ?? 'Ability'} Check`;
  if (kind === 'skill') return `${_labelize(skillKey || 'Skill')} Check`;
  return _labelize(kind || 'Roll');
}

function _extractDiceResults(roll) {
  if (!roll) return [];
  try {
    const termSource = roll.dice ?? roll.terms?.filter(t => Array.isArray(t.results)) ?? [];
    return termSource.flatMap(die => {
      const faces = die.faces ?? die.sides ?? 20;
      return (die.results ?? []).map(r => ({
        faces,
        result: r.result,
        discarded: r.discarded ?? false,
        exploded: r.exploded ?? false,
      }));
    });
  } catch {
    return [];
  }
}

function _ensureCompanionHost(root) {
  let host = root.querySelector(`:scope > .${COMPANION_CLASS}`);
  if (!host) {
    host = document.createElement('div');
    host.className = COMPANION_CLASS;
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'true');
    root.appendChild(host);
  }
  return host;
}

let _dismissTimer = null;

function _renderCompanion(host, model) {
  clearTimeout(_dismissTimer);

  const successState = model.outcome?.state === 'success' ? 'is-success'
    : model.outcome?.state === 'failure' ? 'is-failure'
    : model.outcome?.state === 'crit' ? 'is-critical'
    : model.isCritical ? 'is-critical'
    : model.isFumble ? 'is-fumble'
    : '';

  host.className = [COMPANION_CLASS, `kind-${model.kind}`, successState, 'is-visible']
    .filter(Boolean).join(' ');
  host.dataset.kind = model.kind;
  if (model.abilityKey) host.dataset.ability = model.abilityKey;
  else delete host.dataset.ability;
  if (model.forceDescriptor) host.dataset.descriptor = model.forceDescriptor;
  else delete host.dataset.descriptor;

  const categoryClass = `swse-roll-card--${model.categoryClass}`;
  const abilityAttr = model.abilityKey ? ` data-ability="${_escAttr(model.abilityKey)}"` : '';
  const descriptorAttr = model.forceDescriptor ? ` data-descriptor="${_escAttr(model.forceDescriptor)}"` : '';
  const styleAttr = model.railStyle ? ` style="${_escAttr(model.railStyle)}"` : '';
  const outcomeClass = model.outcome?.state ? ` ${_escAttr(model.outcome.state)}` : '';
  const partsHtml = model.parts.map(part => `
    <span class="part ${part.kind ? `part--${_escAttr(part.kind)}` : ''}">${_esc(part.label)} <b>${_esc(part.value)}</b></span>
  `).join('');

  host.innerHTML = `
    <div class="hrc-inner swse-chat-card swse-roll-card ${categoryClass}" data-expanded="true" data-swse-chat-surface="roll-companion"${abilityAttr}${descriptorAttr}${styleAttr}>
      <span class="corners" aria-hidden="true"><span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span></span>
      <span class="headtick" aria-hidden="true"></span>
      <button type="button" class="hrc-close" aria-label="Dismiss">✕</button>
      <div class="head">
        <span class="type-chip">${model.abilityBadge ? `<span class="ability-hex">${_esc(model.abilityBadge)}</span>` : '<span class="dot"></span>'}${_esc(model.typeChipLabel)}</span>
        <span class="who">${_esc(model.actorName || model.itemName || 'SWSE')}</span>
      </div>
      <h3 class="action">${_esc(model.title || model.itemName || 'Roll Result')}</h3>
      ${model.forceDescriptorLabel ? `<div class="hrc-descriptors"><span class="desc-chip" data-d="${_escAttr(model.forceDescriptor)}">${_esc(model.forceDescriptorLabel)}</span></div>` : ''}
      <div class="body">
        <div class="total" aria-expanded="true">
          <span class="num">${_esc(model.displayTotal)}</span>
          <span class="label">${_esc(model.totalLabel)}</span>
          ${model.damageType ? `<span class="dmg-type">${_esc(model.damageType)}</span>` : ''}
        </div>
        ${partsHtml ? `<div class="breakdown"><div class="parts">${partsHtml}</div></div>` : ''}
      </div>
      <div class="outcome">
        ${model.dc != null ? `<span class="meta"><span class="k">DC</span><span class="v">${_esc(model.dc)}</span></span>` : ''}
        ${model.outcome?.label ? `<span class="verdict ${outcomeClass.trim() || 'success'}">${_esc(model.outcome.label)}</span>` : ''}
      </div>
      ${model.tierLabel ? `<div class="hrc-tier">${_esc(model.tierLabel)}</div>` : ''}
      ${model.effectText ? `<div class="notes">${_esc(model.effectText)}</div>` : ''}
      ${(model.isNatural20 || model.isNatural1 || model.isCritical) ? `<div class="crit-banner">${_esc(model.isNatural20 ? 'Natural 20' : model.isNatural1 ? 'Natural 1' : 'Critical')}</div>` : ''}
    </div>
  `.trim();

  host.querySelector('.hrc-close')?.addEventListener('click', () => _dismissCompanion(host), { once: true });
  _dismissTimer = setTimeout(() => _dismissCompanion(host), AUTO_DISMISS_MS);
}

function _dismissCompanion(host) {
  clearTimeout(_dismissTimer);
  host.classList.remove('is-visible');
}

function _firstNumber(...values) {
  for (const value of values) {
    if (value === '' || value == null) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function _normalizeKey(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function _labelize(value = '') {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function _signed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return `${number >= 0 ? '+' : ''}${number}`;
}

function _cssSafe(value = '') {
  return String(value).replace(/[;{}]/g, '').trim();
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _escAttr(str) {
  return _esc(str).replace(/`/g, '&#96;');
}
