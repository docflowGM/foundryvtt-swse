// scripts/sheets/v2/shared/resource-bar-animations.js

function _num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function _pct(value, max) {
  const safeMax = Math.max(1, _num(max) || 1);
  const ratio = (_num(value) / safeMax) * 100;
  return Math.max(0, Math.min(100, ratio));
}

function _snapshot(actor) {
  const system = actor?.system ?? {};
  const derived = system?.derived ?? {};
  const xp = derived?.xp ?? {};
  return {
    level: Math.max(0, _num(system?.level)),
    hp: Math.max(0, _num(system?.hp?.value)),
    hpMax: Math.max(1, _num(system?.hp?.max) || 1),
    temp: Math.max(0, _num(system?.hp?.temp)),
    shield: Math.max(0, _num(derived?.shield?.current)),
    shieldMax: Math.max(0, _num(derived?.shield?.max)),
    xp: Math.max(0, _num(xp?.total)),
    xpPercent: Math.max(0, _num(xp?.progressPercent)),
    levelReady: _num(xp?.progressPercent) >= 100
  };
}

function _bounceClass(element, className, duration = 700) {
  if (!(element instanceof HTMLElement)) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), duration);
}

function _forEach(root, selector, fn) {
  if (!(root instanceof HTMLElement)) return;
  for (const el of root.querySelectorAll(selector)) fn(el);
}

function _animateWidth(element, fromPct, toPct, duration = 900, easing = 'cubic-bezier(.2,.8,.3,1)') {
  if (!(element instanceof HTMLElement)) return;

  const from = Math.max(0, Math.min(100, Number(fromPct) || 0));
  const to = Math.max(0, Math.min(100, Number(toPct) || 0));

  element.style.transition = 'none';
  element.style.width = `${from}%`;
  void element.offsetWidth;

  window.requestAnimationFrame(() => {
    element.style.transition = `width ${duration}ms ${easing}`;
    element.style.width = `${to}%`;
  });
}

function _animateTempOverlay(container, previous, current) {
  if (!(container instanceof HTMLElement)) return;
  const overlay = container.querySelector('.resource-bar__temp, .swse-hp-visual__temp');
  if (!(overlay instanceof HTMLElement)) return;

  const prevBase = _pct(previous.hp, previous.hpMax);
  const currBase = _pct(current.hp, current.hpMax);
  const prevWidth = _pct(previous.temp, previous.hpMax);
  const currWidth = _pct(current.temp, current.hpMax);

  overlay.style.transition = 'none';
  overlay.style.left = `${prevBase}%`;
  overlay.style.width = `${prevWidth}%`;
  void overlay.offsetWidth;

  window.requestAnimationFrame(() => {
    overlay.style.transition = 'left 650ms cubic-bezier(.2,.8,.3,1), width 650ms cubic-bezier(.2,.8,.3,1)';
    overlay.style.left = `${currBase}%`;
    overlay.style.width = `${currWidth}%`;
  });
}

function _animateHp(root, previous, current) {
  _forEach(root, '[data-resource-visual="hp"]', container => {
    const fill = container.querySelector('.resource-bar__fill, .swse-hp-visual__fill');
    _animateWidth(fill, _pct(previous.hp, previous.hpMax), _pct(current.hp, current.hpMax), 650);
    _animateTempOverlay(container, previous, current);
  });
}

function _animateShield(root, previous, current) {
  _forEach(root, '[data-resource-visual="shield"]', container => {
    const fill = container.querySelector('.resource-bar__fill, .swse-shield-visual__fill');
    if (!fill) return;
    const prevPct = previous.shieldMax > 0 ? _pct(previous.shield, previous.shieldMax) : 0;
    const currPct = current.shieldMax > 0 ? _pct(current.shield, current.shieldMax) : 0;
    _animateWidth(fill, prevPct, currPct, 700);
  });
}

function _animateXp(root, previous, current) {
  _forEach(root, '[data-resource-visual="xp"]', container => {
    const fill = container.querySelector('.resource-bar__fill, .xp-progress-fill');
    if (!(fill instanceof HTMLElement)) return;

    const prevPct = Math.max(0, Math.min(100, _num(previous.xpPercent)));
    const currPct = Math.max(0, Math.min(100, _num(current.xpPercent)));
    const leveledUp = current.level > previous.level || (current.xp > previous.xp && currPct < prevPct);

    if (leveledUp) {
      fill.style.transition = 'none';
      fill.style.width = `${prevPct}%`;
      void fill.offsetWidth;

      window.requestAnimationFrame(() => {
        fill.style.transition = 'width 700ms linear';
        fill.style.width = '100%';

        window.setTimeout(() => {
          fill.style.transition = 'none';
          fill.style.width = '0%';
          void fill.offsetWidth;

          window.requestAnimationFrame(() => {
            fill.style.transition = 'width 1200ms linear';
            fill.style.width = `${currPct}%`;
          });
        }, 725);
      });
      return;
    }

    _animateWidth(fill, prevPct, currPct, 1200, 'linear');
  });
}

export function applyResourceBarAnimations(sheet, root) {
  if (!(root instanceof HTMLElement)) return;

  const actor = sheet?.actor ?? sheet?.document;
  if (!actor) return;

  const current = _snapshot(actor);
  const previous = sheet._swseResourceBarSnapshot ?? null;
  sheet._swseResourceBarSnapshot = current;

  if (!previous) return;

  _animateHp(root, previous, current);
  _animateShield(root, previous, current);
  _animateXp(root, previous, current);

  if (current.hp < previous.hp) {
    _forEach(root, '[data-resource-visual="hp"]', el => _bounceClass(el, 'swse-resource-flash--damage', 650));
  } else if (current.hp > previous.hp) {
    _forEach(root, '[data-resource-visual="hp"]', el => _bounceClass(el, 'swse-resource-flash--heal', 700));
  }

  if (current.temp > previous.temp) {
    _forEach(root, '[data-resource-visual="hp"]', el => _bounceClass(el, 'swse-resource-flash--temp-gain', 700));
  } else if (current.temp < previous.temp) {
    _forEach(root, '[data-resource-visual="hp"]', el => _bounceClass(el, 'swse-resource-flash--temp-loss', 550));
  }

  if (current.shield < previous.shield) {
    _forEach(root, '[data-resource-visual="shield"]', el => _bounceClass(el, 'swse-resource-flash--shield-hit', 650));
  } else if (current.shield > previous.shield) {
    _forEach(root, '[data-resource-visual="shield"]', el => _bounceClass(el, 'swse-resource-flash--shield-recharge', 800));
  }

  if (current.xp > previous.xp) {
    _forEach(root, '[data-resource-visual="xp"]', el => _bounceClass(el, 'swse-resource-flash--xp-gain', 900));
  }

  if (!previous.levelReady && current.levelReady) {
    _forEach(root, '[data-resource-visual="xp"]', el => _bounceClass(el, 'swse-resource-flash--xp-level', 1100));
  }
}
