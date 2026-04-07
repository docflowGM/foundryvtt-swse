// scripts/sheets/v2/shared/resource-number-animations.js

function _num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function _clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function _snapshot(actor) {
  const system = actor?.system ?? {};
  const derived = system?.derived ?? {};
  const shield = derived?.shield ?? {};

  return {
    hp: Math.max(0, _num(system?.hp?.value)),
    hpMax: Math.max(1, _num(system?.hp?.max) || 1),
    temp: Math.max(0, _num(system?.hp?.temp)),
    shieldCurrent: Math.max(0, _num(shield?.current)),
    shieldMax: Math.max(0, _num(shield?.max))
  };
}

function _flash(el, className, duration = 720) {
  if (!(el instanceof HTMLElement)) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), duration);
}

function _tweenInt(fromValue, toValue, duration, onUpdate, onDone) {
  const from = Math.round(_num(fromValue));
  const to = Math.round(_num(toValue));

  if (from === to) {
    onUpdate(to);
    if (typeof onDone === 'function') onDone();
    return;
  }

  const start = performance.now();
  const delta = to - from;
  let lastValue = from;

  const tick = now => {
    const rawT = _clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - rawT, 3);
    const next = rawT >= 1 ? to : Math.round(from + (delta * eased));

    if (next !== lastValue || rawT >= 1) {
      lastValue = next;
      onUpdate(next);
    }

    if (rawT < 1) {
      window.requestAnimationFrame(tick);
      return;
    }

    if (typeof onDone === 'function') onDone();
  };

  window.requestAnimationFrame(tick);
}

function _setHpText(el, hp, hpMax, temp) {
  if (!(el instanceof HTMLElement)) return;
  const safeHp = Math.max(0, Math.round(_num(hp)));
  const safeHpMax = Math.max(1, Math.round(_num(hpMax)) || 1);
  const safeTemp = Math.max(0, Math.round(_num(temp)));
  el.textContent = safeTemp > 0
    ? `${safeHp} / ${safeHpMax} (+${safeTemp})`
    : `${safeHp} / ${safeHpMax}`;
}

function _setShieldText(el, current, max) {
  if (!(el instanceof HTMLElement)) return;
  const safeCurrent = Math.max(0, Math.round(_num(current)));
  const safeMax = Math.max(0, Math.round(_num(max)));
  el.textContent = `SR ${safeCurrent} / ${safeMax}`;
}

function _setHpChipPrimary(el, hp, hpMax) {
  if (!(el instanceof HTMLElement)) return;
  el.textContent = `${Math.max(0, Math.round(_num(hp)))} / ${Math.max(1, Math.round(_num(hpMax)) || 1)}`;
}

function _setTempChip(el, temp) {
  if (!(el instanceof HTMLElement)) return;
  el.textContent = `+${Math.max(0, Math.round(_num(temp)))}`;
}

function _setShieldChip(el, current, max) {
  if (!(el instanceof HTMLElement)) return;
  el.textContent = `${Math.max(0, Math.round(_num(current)))} / ${Math.max(0, Math.round(_num(max)))}`;
}

function _setShieldStat(el, current, max) {
  if (!(el instanceof HTMLElement)) return;
  const safeCurrent = Math.max(0, Math.round(_num(current)));
  const safeMax = Math.max(0, Math.round(_num(max)));
  el.textContent = safeMax > 0 ? `${safeCurrent} / ${safeMax}` : `${safeCurrent}`;
}

function _animateHpBlock(root, previous, current) {
  const hpBars = Array.from(root.querySelectorAll('[data-resource-visual="hp"]'));
  const hpTexts = hpBars
    .map(bar => bar.querySelector('.resource-bar__text'))
    .filter(el => el instanceof HTMLElement);

  const primaryChip = root.querySelector('.hp-summary-chip--primary .hp-summary-chip__value');
  const tempChip = root.querySelector('.hp-summary-chip--temp .hp-summary-chip__value');

  _tweenInt(previous.hp, current.hp, 780, value => {
    for (const el of hpTexts) _setHpText(el, value, current.hpMax, current.temp);
    _setHpChipPrimary(primaryChip, value, current.hpMax);
  });

  _tweenInt(previous.temp, current.temp, 700, value => {
    for (const el of hpTexts) _setHpText(el, current.hp, current.hpMax, value);
    _setTempChip(tempChip, value);
  });

  if (current.hp > previous.hp) {
    for (const el of hpTexts) _flash(el, 'swse-resource-number-pop--heal', 820);
    _flash(primaryChip, 'swse-resource-number-pop--heal', 820);
  } else if (current.hp < previous.hp) {
    for (const el of hpTexts) _flash(el, 'swse-resource-number-pop--damage', 760);
    _flash(primaryChip, 'swse-resource-number-pop--damage', 760);
  }

  if (current.temp > previous.temp) {
    for (const el of hpTexts) _flash(el, 'swse-resource-number-pop--temp-gain', 760);
    _flash(tempChip, 'swse-resource-number-pop--temp-gain', 760);
  } else if (current.temp < previous.temp) {
    for (const el of hpTexts) _flash(el, 'swse-resource-number-pop--temp-loss', 700);
    _flash(tempChip, 'swse-resource-number-pop--temp-loss', 700);
  }
}

function _animateShieldBlock(root, previous, current) {
  const shieldBars = Array.from(root.querySelectorAll('[data-resource-visual="shield"]'));
  const shieldTexts = shieldBars
    .map(bar => bar.querySelector('.resource-bar__text'))
    .filter(el => el instanceof HTMLElement);

  const shieldChip = root.querySelector('.hp-summary-chip--shield .hp-summary-chip__value');
  const shieldStat = root.querySelector('.survivability-stat[title="Shield Rating"] .stat-value');

  _tweenInt(previous.shieldCurrent, current.shieldCurrent, 760, value => {
    for (const el of shieldTexts) _setShieldText(el, value, current.shieldMax);
    _setShieldChip(shieldChip, value, current.shieldMax);
    _setShieldStat(shieldStat, value, current.shieldMax);
  });

  if (current.shieldCurrent > previous.shieldCurrent) {
    for (const el of shieldTexts) _flash(el, 'swse-resource-number-pop--shield-up', 860);
    _flash(shieldChip, 'swse-resource-number-pop--shield-up', 860);
    _flash(shieldStat, 'swse-resource-number-pop--shield-up', 860);
  } else if (current.shieldCurrent < previous.shieldCurrent) {
    for (const el of shieldTexts) _flash(el, 'swse-resource-number-pop--shield-down', 760);
    _flash(shieldChip, 'swse-resource-number-pop--shield-down', 760);
    _flash(shieldStat, 'swse-resource-number-pop--shield-down', 760);
  }
}

export function applyResourceNumberAnimations(sheet, root) {
  if (!(root instanceof HTMLElement)) return;

  const actor = sheet?.actor ?? sheet?.document;
  if (!actor) return;

  const current = _snapshot(actor);
  const previous = sheet._swseResourceNumberSnapshot ?? null;
  sheet._swseResourceNumberSnapshot = current;

  if (!previous) return;

  _animateHpBlock(root, previous, current);
  _animateShieldBlock(root, previous, current);
}
