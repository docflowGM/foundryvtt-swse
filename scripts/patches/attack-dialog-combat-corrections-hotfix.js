import { CombatOptionResolver } from '/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js';
import {
  getWeaponBranch as canonicalGetWeaponBranch,
  defaultAttackAttributeForBranch as canonicalDefaultAttackAttributeForBranch
} from '/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js';

const PATCH_KEY = 'swseAttackDialogCombatCorrectionsV1';
// RANGED_TEXT_RE is still used by formLooksRanged() below, which inspects a
// raw attack-dialog DOM form, not weapon item data -- a genuinely different
// purpose from weapon branch classification (now delegated to the
// canonical authority), so it is kept.
const RANGED_TEXT_RE = /\b(blaster|rifle|pistol|carbine|bowcaster|slugthrower|launcher|grenade|missile|rocket|ranged)\b/i;
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

// Math Integrity Freeze, Batch 2B: branch inference delegated to the
// canonical authority (scripts/items/weapon-branch-resolver.js) instead of
// this file's own independent conflict-aware heuristic (a near-duplicate of
// weapon-data-resolver.js's old normalizeBranch()).
function inferWeaponBranch(weapon) {
  return canonicalGetWeaponBranch(weapon);
}

// This mutates the live weapon item's in-memory system fields (meleeOrRanged
// /weaponRangeType/rangeType/range) on every attack-dialog render, which is
// itself a pre-existing architectural wart this batch does not expand the
// scope to remove (CombatOptionResolver's own methods, patched below, read
// those raw fields directly rather than the canonical resolver). Batch 2B
// fixes it to always write the CORRECT branch instead of a second,
// independently wrong-precedence one, and stops it violating the explicit
// Attack-Ability Policy: attackAttribute was previously overwritten to "dex"
// on ANY ranged weapon whose attackAttribute was already "str" (even an
// intentional player override) -- attackAttribute must only ever be filled
// when genuinely absent, never rewritten based on branch.
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
    } else if (branch === 'melee') {
      const range = String(weapon.system.range ?? '').trim().toLowerCase();
      if (!range || range === 'ranged') weapon.system.range = 'melee';
    }
    if (!weapon.system.attackAttribute) {
      weapon.system.attackAttribute = canonicalDefaultAttackAttributeForBranch(branch);
    }
  } catch (_err) {
    // Some synthetic item system objects can be sealed; inference still returns.
  }

  return branch;
}

// Math Integrity Freeze, Attack Bonus round: this file used to carry its own
// copy of a class-name/level BAB estimator (classLevelsFromActor/
// estimateBabForClass/estimatedBabFromClasses/resolveActorBab), gated on
// `original > 0` rather than `original !== null`. SchemaAdapters.getBAB()
// (schema-adapters.js) already implements the identical estimator as its
// own documented not-yet-prepared fallback -- but correctly, treating a
// legitimately-derived 0 (e.g. a level-1 3/4-BAB-progression character,
// where floor(1 * 0.75) === 0) as authoritative rather than "missing."
// Because this file's copy treated ANY non-positive canonical value as
// missing, it would silently substitute a guessed class-based BAB for a
// real, correctly-computed zero (or negative) BAB -- and, via
// patchSchemaAdapters() below, it did so by monkey-patching
// SchemaAdapters.getBAB() GLOBALLY, reaching the live resolveAttackBonus()
// roll path for every actor in the game, not just this dialog's preview.
// That is exactly the "no known-wrong fallback formula" / "one domain, one
// authority" violation the freeze exists to catch. The fix is to delete the
// duplicate estimator entirely and read the one certified authority
// (SchemaAdapters.getBAB()) directly wherever this file previously called
// its own resolveActorBab()/prepareActorBabForRollConfig() -- see
// patchSWSERollEntrypoints() below (roll-config.js's dialog preview no
// longer needs a BAB bootstrap of any kind -- see that file instead).

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
  // Relabel only -- the checkbox keeps its "aiming" name. It used to be
  // renamed to "aimIgnoresCover", which silently broke both the submit
  // handler's data.get('aiming') and the live preview's context.aim lookup
  // for every ranged attack dialog (the one case Aim actually matters for)
  // the moment this patch ran, since neither ever looked for the renamed
  // field.
  const label = nearestLabel(aim);
  const title = label?.querySelector('b');
  const note = label?.querySelector('small');
  if (title) title.textContent = 'Aim';
  if (note) note.textContent = 'No direct attack bonus. Enables Careful Shot/Deadeye and other Aim-gated feats/talents; ignores the target\'s cover bonus on the next ranged attack (checking this sets Target Cover to No Cover).';
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

// Math Integrity Freeze, Attack Bonus round (blocker fix): this file used
// to carry its own SECOND live-preview sync (syncAttackDialogBase/
// installCanonicalPreviewSync/selectedSituationalTotal/rebuildBreakdown),
// racing via a MutationObserver + setTimeout(0) against roll-config.js's
// OWN native preview updater (wireRollConfigDialog's update()) — two
// independently-computed "preview" numbers for the same dialog, on top of
// a THIRD divergent formula that used to live in wireRollConfigDialog
// itself. Worse, this file's copy located the actor/weapon by matching
// DISPLAYED NAME TEXT in the DOM (findActorForAttackForm/
// findWeaponForAttackForm) — fragile by construction (duplicate names,
// i18n, DOM structure changes) — and silently left the wrong number on
// screen when that lookup failed. roll-config.js now owns a single correct
// preview (built from the real actor/weapon objects passed in by closure,
// not DOM text matching), calling the exact same
// computeFinalAttackComposition() seam the real roll uses — so this file's
// copy was deleted rather than kept as a "second opinion." The cosmetic
// DOM patches below (option filtering, ranged-only rules, cover panel
// copy) are unrelated to attack-bonus math and are unchanged.

function patchRollConfigForm(form) {
  if (!form || form.dataset.swseAttackDialogCombatCorrections === 'true') return;
  form.dataset.swseAttackDialogCombatCorrections = 'true';
  removeFilteredOptionCards(form);
  removeDefensiveStancePanel(form);
  patchDuplicateStaticOptions(form);
  patchRangedOnlyRules(form);
  clarifyCoverPanel(form);
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
      normalizeWeaponForCombat(weapon);
      return originalRollAttack.call(this, actor, weapon, options);
    };

    const originalRollAutofire = SWSERoll.rollAutofire;
    if (typeof originalRollAutofire === 'function') {
      SWSERoll.rollAutofire = async function patchedRollAutofire(actor, weapon, options = {}) {
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
  patchCombatOptionResolver();
  installDialogObserver();
  patchSWSERollEntrypoints();
  Hooks.once?.('ready', () => {
    patchSWSERollEntrypoints();
    scanRollConfigForms(document);
  });
}
