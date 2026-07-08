import { SchemaAdapters } from '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js';
import { CombatOptionResolver } from '/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js';
import { resolveAttackBonus } from '/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js';

const PATCH_KEY = 'swseAttackDialogCombatCorrectionsV1';
const RANGED_CATEGORIES = new Set(['heavy', 'pistol', 'pistols', 'rifle', 'rifles', 'ranged', 'ranged-exotic', 'simple-ranged']);
const MELEE_CATEGORIES = new Set(['advanced', 'advanced-melee', 'lightsaber', 'melee', 'melee-exotic', 'natural', 'simple-melee', 'unarmed']);
const RANGED_TEXT_RE = /\b(blaster|rifle|pistol|carbine|bowcaster|slugthrower|launcher|grenade|missile|rocket|ranged)\b/i;
const MELEE_TEXT_RE = /\b(lightsaber|vibro|sword|blade|knife|staff|pike|spear|club|melee|unarmed|claw|bite)\b/i;
const FILTERED_ATTACK_OPTION_IDS = new Set([
  'armoreddefense',
  'improvedarmoreddefense',
  'defensivestance',
  'fightdefensively',
  'totaldefense'
]);

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function compactKey(value = '') {
  return normalizeKey(value).replace(/-/g, '');
}

function bool(value) {
  return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function signNumber(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? '+' : ''}${n}`;
}

function weaponText(weapon) {
  const system = weapon?.system ?? {};
  const fields = [
    weapon?.name,
    system.name,
    system.meleeOrRanged,
    system.weaponRangeType,
    system.rangeType,
    system.range,
    system.weaponCategory,
    system.category,
    system.weaponGroup,
    system.group,
    system.proficiency,
    system.proficiencyGroup,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    system.rangeProfile,
    system.rangeProfileName,
    ...(Array.isArray(system.properties) ? system.properties : []),
    ...(Array.isArray(system.traits) ? system.traits : [])
  ];
  return fields.map(value => String(value ?? '')).filter(Boolean).join(' ');
}

function inferWeaponBranch(weapon) {
  const system = weapon?.system ?? {};
  const explicit = normalizeKey(system.meleeOrRanged ?? system.weaponRangeType ?? system.rangeType ?? '');
  const category = normalizeKey(system.weaponCategory ?? system.category ?? system.weaponGroup ?? system.group ?? system.proficiency ?? system.proficiencyGroup ?? '');
  const text = weaponText(weapon);

  if (explicit === 'ranged' || explicit.includes('ranged')) return 'ranged';
  if (explicit === 'melee') {
    if (!MELEE_CATEGORIES.has(category) && (RANGED_CATEGORIES.has(category) || RANGED_TEXT_RE.test(text))) return 'ranged';
    return 'melee';
  }

  if (RANGED_CATEGORIES.has(category) || RANGED_TEXT_RE.test(text)) return 'ranged';
  if (MELEE_CATEGORIES.has(category) || MELEE_TEXT_RE.test(text)) return 'melee';
  return null;
}

function normalizeWeaponForCombat(weapon) {
  const branch = inferWeaponBranch(weapon);
  if (!branch || !weapon?.system) return branch;

  try {
    weapon.system.meleeOrRanged = branch;
    weapon.system.weaponRangeType = branch;
    weapon.system.rangeType = branch;
    if (branch === 'ranged') {
      const range = String(weapon.system.range ?? '').trim().toLowerCase();
      if (!range || range === 'melee') weapon.system.range = 'ranged';
      if (!weapon.system.attackAttribute || String(weapon.system.attackAttribute).toLowerCase() === 'str') {
        weapon.system.attackAttribute = 'dex';
      }
    } else if (branch === 'melee') {
      const range = String(weapon.system.range ?? '').trim().toLowerCase();
      if (!range || range === 'ranged') weapon.system.range = 'melee';
      if (!weapon.system.attackAttribute) weapon.system.attackAttribute = 'str';
    }
  } catch (_err) {
    // Some synthetic item system objects can be sealed; inference still returns.
  }

  return branch;
}

function classLevelsFromActor(actor) {
  const out = [];
  const push = (name, level) => {
    const className = String(name ?? '').trim();
    const lvl = Number(level ?? 0) || 0;
    if (className && lvl > 0) out.push({ className, level: lvl });
  };

  const progression = actor?.system?.progression?.classLevels;
  if (Array.isArray(progression)) {
    for (const entry of progression) {
      push(entry?.class ?? entry?.name ?? entry?.className ?? entry?.id ?? entry?.classId, entry?.level ?? entry?.levels ?? entry?.value);
    }
  }

  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (item?.type !== 'class') continue;
      const system = item.system ?? {};
      push(system.className ?? system.name ?? system.classId ?? item.name, system.level ?? system.levels ?? system.value);
    }
  } catch (_err) {
    // no-op
  }

  const merged = new Map();
  for (const entry of out) {
    const key = compactKey(entry.className);
    if (!key) continue;
    merged.set(key, { className: entry.className, level: Math.max(merged.get(key)?.level ?? 0, entry.level) });
  }
  return [...merged.values()];
}

function estimateBabForClass(className, level) {
  const key = compactKey(className);
  const lvl = Math.max(0, Number(level) || 0);
  if (!lvl) return 0;

  if (key === 'nonheroic') {
    const table = [0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15];
    return table[Math.min(table.length, lvl) - 1] ?? 0;
  }

  if (/soldier|jedi|elite|gunslinger|weaponmaster|duelist|martialarts|brawler|enforcer|bodyguard|knight|master|ace|officer|vanguard/.test(key)) {
    return lvl;
  }

  // Saga heroic non-full-BAB classes use the 3/4 attack progression.
  return Math.floor(lvl * 0.75);
}

function estimatedBabFromClasses(actor) {
  const levels = classLevelsFromActor(actor);
  if (!levels.length) return 0;
  return levels.reduce((total, entry) => total + estimateBabForClass(entry.className, entry.level), 0);
}

function resolveActorBab(actor) {
  const system = actor?.system ?? {};
  const candidates = [
    system.derived?.bab,
    system.derived?.bab?.total,
    system.derived?.bab?.value,
    system.bab,
    system.bab?.total,
    system.bab?.value,
    system.baseAttackBonus,
    system.baseAttack,
    system.attributes?.bab?.value,
    system.combat?.bab,
    system.derived?.combat?.bab
  ];

  for (const candidate of candidates) {
    const n = finiteNumber(candidate);
    if (n !== null && n > 0) return n;
  }

  return estimatedBabFromClasses(actor);
}

function prepareActorBabForRollConfig(actor) {
  const bab = resolveActorBab(actor);
  if (!actor?.system || !(bab > 0)) return bab || 0;
  try {
    actor.system.baseAttackBonus = bab;
    if (!actor.system.bab || typeof actor.system.bab !== 'object') actor.system.bab = {};
    actor.system.bab.total = bab;
    actor.system.bab.value = bab;
  } catch (_err) {
    // Dialog fallback only; do not persist or fail rolls if the model is sealed.
  }
  return bab;
}

function optionId(option) {
  return compactKey(option?.id ?? option?.option ?? option?.key ?? option?.name ?? option?.label ?? '');
}

function optionIsPreAttackEligible(option) {
  const id = optionId(option);
  if (!id) return false;
  if (FILTERED_ATTACK_OPTION_IDS.has(id)) return false;
  const label = compactKey(option?.label ?? option?.name ?? '');
  if (FILTERED_ATTACK_OPTION_IDS.has(label)) return false;
  return true;
}

function patchSchemaAdapters() {
  if (SchemaAdapters[PATCH_KEY]) return;
  const originalGetBAB = SchemaAdapters.getBAB;
  SchemaAdapters.getBAB = function patchedGetBAB(actor) {
    const original = finiteNumber(originalGetBAB?.call?.(this, actor));
    if (original !== null && original > 0) return original;
    const fallback = resolveActorBab(actor);
    return fallback > 0 ? fallback : (original ?? 0);
  };
  SchemaAdapters[PATCH_KEY] = true;
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver[PATCH_KEY]) return;

  const originalGetAvailable = CombatOptionResolver.getAvailableAttackOptions;
  CombatOptionResolver.getAvailableAttackOptions = function patchedGetAvailableAttackOptions(actor, weapon, context = {}) {
    normalizeWeaponForCombat(weapon);
    const options = originalGetAvailable.call(this, actor, weapon, context) ?? [];
    return options.filter(optionIsPreAttackEligible);
  };

  const originalCollect = CombatOptionResolver.collectAttackModifiers;
  CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, options = {}) {
    normalizeWeaponForCombat(weapon);
    const result = originalCollect.call(this, actor, weapon, options) ?? {};
    result.attackBonus ??= 0;
    result.breakdown ??= [];
    result.flags ??= {};

    const attackOptions = options.attackOptions ?? {};
    const combatOptions = options.combatOptions ?? {};
    const autofire = bool(attackOptions.autofire) || bool(combatOptions.autofire) || options.attackMode === 'autofire' || options.autofire === true;
    const burstFire = bool(attackOptions.burstFire) || bool(combatOptions.burstFire) || options.burstFire === true;
    const braced = bool(attackOptions.braceAutofire) || bool(attackOptions.bracedAutofire) || bool(combatOptions.braceAutofire) || bool(combatOptions.bracedAutofire) || options.braced === true || options.bracedAutofire === true;

    if (autofire && !burstFire) {
      const alreadyApplied = result.breakdown.some(row => compactKey(row?.label ?? row?.type ?? '').includes('autofire'));
      if (!alreadyApplied) {
        const penalty = braced ? -2 : -5;
        result.attackBonus += penalty;
        result.flags.autofire = true;
        result.flags.bracedAutofire = braced;
        result.breakdown.push({ label: braced ? 'Autofire (braced)' : 'Autofire', value: penalty, type: 'attack' });
      }
    }

    return result;
  };

  CombatOptionResolver[PATCH_KEY] = true;
}

function nearestLabel(input) {
  return input?.closest?.('label, .swse-roll-config-option') ?? null;
}

function removeNamedInput(form, name) {
  const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
  const label = nearestLabel(input);
  if (label) label.remove();
}

function setFirstTextNode(label, text) {
  if (!label) return;
  for (const node of Array.from(label.childNodes ?? [])) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      node.textContent = text;
      return;
    }
  }
  label.insertBefore(document.createTextNode(text), label.firstChild ?? null);
}

function formLooksRanged(form) {
  const text = [
    form.closest('.swse-roll-config-shell')?.querySelector('.rcd-formula-chips')?.textContent,
    form.querySelector('.swse-roll-config-source')?.textContent,
    form.textContent
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  if (/\branged\b/.test(text)) return true;
  if (/\bmelee\b/.test(text) && !RANGED_TEXT_RE.test(text)) return false;
  return RANGED_TEXT_RE.test(text);
}

function removeFilteredOptionCards(form) {
  for (const option of Array.from(form.querySelectorAll('.swse-roll-config-option'))) {
    const text = compactKey(option.textContent ?? '');
    if (FILTERED_ATTACK_OPTION_IDS.has(text) || [...FILTERED_ATTACK_OPTION_IDS].some(id => text.includes(id))) {
      option.remove();
    }
  }
}

function removeDefensiveStancePanel(form) {
  for (const section of Array.from(form.querySelectorAll('section.swse-roll-config-panel'))) {
    const heading = compactKey(section.querySelector('h4,h5')?.textContent ?? '');
    if (heading === 'defensivestance') section.remove();
  }
}

function clarifyCoverPanel(form) {
  const coverSelect = form.querySelector('[name="cover"]');
  const concealmentSelect = form.querySelector('[name="concealment"]');
  if (!coverSelect && !concealmentSelect) return;

  setFirstTextNode(coverSelect?.closest('label'), 'Target Cover');
  setFirstTextNode(concealmentSelect?.closest('label'), 'Target Concealment');

  const section = coverSelect?.closest('section.swse-roll-config-panel') ?? concealmentSelect?.closest('section.swse-roll-config-panel');
  if (section && !section.querySelector('[data-swse-cover-note]')) {
    const note = document.createElement('p');
    note.className = 'swse-roll-config-note';
    note.dataset.swseCoverNote = 'true';
    note.textContent = 'These are the target\'s cover/concealment against the character making this attack. Cover raises the target defense; concealment is a miss chance.';
    section.appendChild(note);
  }
}

function patchAimToggle(form) {
  const aim = form.querySelector('[name="aiming"]');
  if (!aim) return;
  aim.name = 'aimIgnoresCover';
  const label = nearestLabel(aim);
  const title = label?.querySelector('b');
  const note = label?.querySelector('small');
  if (title) title.textContent = 'Aim';
  if (note) note.textContent = 'No attack bonus. Aim ignores the target\'s cover bonus on the next ranged attack; checking this sets Target Cover to No Cover.';
  aim.addEventListener('change', () => {
    if (!aim.checked) return;
    const cover = form.querySelector('[name="cover"]');
    if (cover) cover.value = 'none';
    form.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function addBraceAutofireToggle(form) {
  const autofire = form.querySelector('[name="attackOptions.autofire"]');
  if (!autofire || form.querySelector('[name="attackOptions.braceAutofire"]')) return;
  const autofireLabel = nearestLabel(autofire);
  if (!autofireLabel) return;

  const label = document.createElement('label');
  label.className = 'swse-roll-config-option';
  label.innerHTML = '<input type="checkbox" name="attackOptions.braceAutofire" /> <span><b>Brace Autofire</b><small>Spend the brace setup for autofire-only fire: autofire penalty is -2 instead of -5.</small></span>';
  autofireLabel.insertAdjacentElement('afterend', label);
}

function patchDuplicateStaticOptions(form) {
  if (form.querySelector('[name="combatOptions.burstFire"]')) removeNamedInput(form, 'attackOptions.burstFire');
  if (form.querySelector('[name="combatOptions.rapidShot"]')) removeNamedInput(form, 'attackOptions.rapidShot');
}

function patchRangedOnlyRules(form) {
  if (!formLooksRanged(form)) return;
  removeNamedInput(form, 'charging');
  removeNamedInput(form, 'flanking');
  patchAimToggle(form);
  addBraceAutofireToggle(form);
}

function findActorForAttackForm(form) {
  const shell = form.closest('.swse-roll-config-shell') ?? form;
  const actorName = shell.querySelector('.rcd-header .rcd-actor')?.textContent?.trim();
  if (!actorName) return null;
  return game?.actors?.find?.(actor => actor?.name === actorName) ?? null;
}

function findWeaponForAttackForm(form, actor) {
  const sourceName = form.querySelector('.swse-roll-config-panel--summary .swse-roll-config-source b')?.textContent?.trim()
    || form.querySelector('.swse-roll-config-source b')?.textContent?.trim();
  if (!sourceName || !actor?.items) return null;
  return Array.from(actor.items).find(item => item?.type === 'weapon' && item?.name === sourceName) ?? null;
}

function selectedSituationalTotal(form) {
  let total = 0;
  for (const name of ['charging', 'flanking', 'higherGround', 'pointBlank']) {
    if (!form.querySelector(`[name="${name}"]`)?.checked) continue;
    total += name === 'higherGround' || name === 'pointBlank' ? 1 : 2;
  }
  return total;
}

function replaceText(root, selector, text) {
  root.querySelector(selector)?.replaceChildren(document.createTextNode(text));
}

function rebuildBreakdown(form, components, base, custom, situational) {
  const box = form.querySelector('[data-rcd-breakdown]');
  if (!box) return;
  box.replaceChildren();
  const addRow = (label, value, className = 'rcd-bd-row') => {
    const row = document.createElement('div');
    row.className = className;
    const left = document.createElement('span');
    left.className = className === 'rcd-bd-total' ? 'rcd-bd-total-label' : 'rcd-bd-label';
    left.textContent = label;
    const right = document.createElement('span');
    right.className = className === 'rcd-bd-total' ? 'rcd-bd-total-val' : 'rcd-bd-val';
    right.textContent = signNumber(value);
    if (label === 'Custom') right.dataset.rcdCustomBd = '';
    if (label === 'Situational') right.dataset.rcdSituationalBd = '';
    if (className === 'rcd-bd-total') right.dataset.rcdBdTotal = '';
    row.append(left, right);
    box.appendChild(row);
  };

  for (const [label, value] of Object.entries(components || {})) addRow(label, value);
  addRow('Custom', custom);
  addRow('Situational', situational);
  addRow('Total', base + custom + situational, 'rcd-bd-total');
}

function syncAttackDialogBase(form) {
  if (!form?.classList?.contains('swse-roll-config-v2')) return;
  const actor = findActorForAttackForm(form);
  const weapon = findWeaponForAttackForm(form, actor);
  if (!actor || !weapon) return;

  const branch = normalizeWeaponForCombat(weapon) || (formLooksRanged(form) ? 'ranged' : 'melee');
  prepareActorBabForRollConfig(actor);
  const resolved = resolveAttackBonus(actor, weapon, null, { attackType: branch, weapon });
  const base = Number(resolved?.total ?? 0) || 0;
  const custom = Number(form.querySelector('[name="customModifier"]')?.value ?? 0) || 0;
  const situational = selectedSituationalTotal(form);
  const total = base + custom + situational;

  form.dataset.baseTotal = String(base);
  const shell = form.closest('.swse-roll-config-shell') ?? form;
  replaceText(shell, '.rcd-formula-text', `1d20 ${signNumber(total)}`);
  replaceText(shell, '.rcd-formula-base-mod', `base ${signNumber(base)}`);
  replaceText(form, '.rcd-check-card[data-check-mode="roll"] .rcd-check-total', `1d20 ${signNumber(base)}`);
  replaceText(form, '[data-rcd-preview-total]', signNumber(total));
  replaceText(form, '[data-rcd-formula]', `1d20 ${signNumber(total)}`);
  rebuildBreakdown(form, resolved?.components ?? { 'Canonical Attack': base }, base, custom, situational);
}

function installCanonicalPreviewSync(form) {
  if (form.dataset.swseCanonicalAttackPreview === 'true') return;
  form.dataset.swseCanonicalAttackPreview = 'true';
  const update = () => setTimeout(() => syncAttackDialogBase(form), 0);
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

function patchRollConfigForm(form) {
  if (!form || form.dataset.swseAttackDialogCombatCorrections === 'true') return;
  form.dataset.swseAttackDialogCombatCorrections = 'true';
  removeFilteredOptionCards(form);
  removeDefensiveStancePanel(form);
  patchDuplicateStaticOptions(form);
  patchRangedOnlyRules(form);
  clarifyCoverPanel(form);
  installCanonicalPreviewSync(form);
}

function scanRollConfigForms(root = document) {
  root.querySelectorAll?.('form.swse-roll-config-v2')?.forEach(patchRollConfigForm);
}

function installDialogObserver() {
  if (globalThis[`${PATCH_KEY}Observer`]) return;
  const start = () => {
    scanRollConfigForms(document);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes ?? [])) {
          if (node?.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('form.swse-roll-config-v2')) patchRollConfigForm(node);
          scanRollConfigForms(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    globalThis[`${PATCH_KEY}Observer`] = observer;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

async function patchSWSERollEntrypoints() {
  try {
    const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
    if (!SWSERoll || SWSERoll[PATCH_KEY]) return;

    const originalRollAttack = SWSERoll.rollAttack;
    SWSERoll.rollAttack = async function patchedRollAttack(actor, weapon, options = {}) {
      prepareActorBabForRollConfig(actor);
      normalizeWeaponForCombat(weapon);
      return originalRollAttack.call(this, actor, weapon, options);
    };

    const originalRollAutofire = SWSERoll.rollAutofire;
    if (typeof originalRollAutofire === 'function') {
      SWSERoll.rollAutofire = async function patchedRollAutofire(actor, weapon, options = {}) {
        prepareActorBabForRollConfig(actor);
        normalizeWeaponForCombat(weapon);
        const attackOptions = options.attackOptions ?? {};
        const braced = options.braced === true || bool(attackOptions.braceAutofire) || bool(attackOptions.bracedAutofire);
        return originalRollAutofire.call(this, actor, weapon, { ...options, braced });
      };
    }

    SWSERoll[PATCH_KEY] = true;
  } catch (err) {
    console.warn('[SWSE] Attack dialog combat corrections could not patch SWSERoll entrypoints', err);
  }
}

export function registerAttackDialogCombatCorrectionsHotfix() {
  if (globalThis[PATCH_KEY]) return;
  globalThis[PATCH_KEY] = true;
  patchSchemaAdapters();
  patchCombatOptionResolver();
  installDialogObserver();
  patchSWSERollEntrypoints();
  Hooks.once?.('ready', () => {
    patchSWSERollEntrypoints();
    scanRollConfigForms(document);
  });
}
