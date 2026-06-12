import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { rollAttack, rollDamage } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { getClassLevel, getTotalLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

const NS = 'swse';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slug(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizedName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*\((\d+)\)\s*$/, '');
}

function hasTalent(actor, name) {
  const wanted = normalizedName(name);
  return !!actor?.items?.some?.(item => item?.type === 'talent' && normalizedName(item?.name) === wanted);
}

function encounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function abilityMod(actor, key) {
  return Number(actor?.system?.derived?.attributes?.[key]?.mod ?? actor?.system?.abilities?.[key]?.mod ?? actor?.system?.attributes?.[key]?.mod ?? 0) || 0;
}

function useTheForceTotal(actor) {
  return Number(actor?.system?.derived?.skills?.useTheForce?.total ?? actor?.system?.derived?.skillsByKey?.useTheForce?.total ?? actor?.system?.skills?.useTheForce?.total ?? actor?.system?.skills?.useTheForce?.mod ?? 0) || 0;
}

function skillTotal(actor, key) {
  const variants = [
    key,
    String(key ?? '').toLowerCase(),
    String(key ?? '').replace(/[A-Z]/g, m => `-${m.toLowerCase()}`),
    String(key ?? '').replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)
  ];
  for (const variant of variants) {
    const value = actor?.system?.derived?.skills?.[variant]?.total
      ?? actor?.system?.derived?.skillsByKey?.[variant]?.total
      ?? actor?.system?.skills?.[variant]?.total
      ?? actor?.system?.skills?.[variant]?.mod
      ?? actor?.system?.skills?.[variant]?.value;
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function persuasionTotal(actor) {
  return skillTotal(actor, 'persuasion');
}

function characterLevel(actor) {
  return Math.max(1, Number(getTotalLevel(actor) || actor?.system?.level || 1) || 1);
}

function forceAdeptLevel(actor) {
  const direct = getClassLevel(actor, 'force_adept') || getClassLevel(actor, 'force adept') || getClassLevel(actor, 'adept');
  return Math.max(1, Number(direct || characterLevel(actor) || 1) || 1);
}

function wisdomModifier(actor) {
  return abilityMod(actor, 'wis');
}

function defenseTotal(actor, key) {
  const normalized = key === 'fort' ? 'fortitude' : key === 'ref' ? 'reflex' : key;
  return Number(actor?.system?.derived?.defenses?.[normalized]?.total
    ?? actor?.system?.defenses?.[normalized]?.total
    ?? actor?.system?.defenses?.[normalized]?.value
    ?? actor?.system?.[`${normalized}Defense`]
    ?? 10) || 10;
}

function conditionTrackValue(actor) {
  return Math.max(0, Number(actor?.system?.conditionTrack?.current ?? actor?.system?.condition?.track ?? 0) || 0);
}

async function worsenConditionTrack(actor, steps = 1, source = 'force-adept-talent') {
  const before = conditionTrackValue(actor);
  const after = Math.min(5, before + Math.max(0, Number(steps) || 0));
  await ActorEngine.updateActor(actor, { 'system.conditionTrack.current': after }, { source });
  return { before, after };
}

async function grantTemporaryForcePoint(actor, source, expires = 'end_of_turn') {
  const pool = actor.getFlag?.(NS, 'bonusForcePoints') ?? {};
  const entries = Array.isArray(pool.entries) ? [...pool.entries] : [];
  entries.push({
    id: `${slug(source)}-${Date.now()}`,
    source,
    value: 1,
    max: 1,
    restrictions: expires === 'end_of_turn' ? 'Must be spent before the end of this turn.' : 'Must be spent before it expires.',
    expires,
    encounterId: encounterId(),
    round: game?.combat?.round ?? null,
    turn: game?.combat?.turn ?? null,
    createdAt: Date.now()
  });
  const value = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.value) || 0), 0);
  const max = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.max ?? entry.value) || 0), 0);
  await ActorEngine.updateActor(actor, {
    'flags.swse.bonusForcePoints': {
      ...pool,
      value,
      max: Math.max(value, max),
      sources: [...new Set(entries.map(entry => entry.source).filter(Boolean))],
      entries,
      note: 'Bonus Force Points are spent before normal Force Points and may expire by source.'
    }
  }, { source: slug(source) });
  return { granted: 1, total: value };
}

async function applyTemporaryHp(actor, amount, source) {
  const value = Math.max(0, Number(amount) || 0);
  const before = Number(actor?.system?.hp?.temp ?? 0) || 0;
  const after = Math.max(before, value);
  await ActorEngine.updateActor(actor, { 'system.hp.temp': after }, { source: slug(source) });
  return { before, after, amount: value };
}

async function rollPersuasion(actor, title, { dc = null } = {}) {
  const total = persuasionTotal(actor);
  const roll = await RollEngine.safeRoll(`1d20 + ${total}`, actor?.getRollData?.() ?? {}, { actor, domain: `talent.${slug(title)}.persuasion` });
  await SWSEChat.postRoll({
    actor,
    roll,
    flavor: `${title} — Persuasion`,
    context: { category: 'talent', type: 'force-adept-talent', itemName: title, totalLabel: 'Persuasion', dc, success: dc ? Number(roll?.total ?? 0) >= Number(dc) : null }
  });
  return roll;
}

function selectedTargetActors() {
  return Array.from(game?.user?.targets ?? []).map(token => token?.actor).filter(Boolean);
}

function forcePowers(actor) {
  return Array.from(actor?.items ?? []).filter(item => item?.type === 'force-power');
}

function spentForcePowers(actor) {
  return forcePowers(actor).filter(item => item?.system?.spent === true || item?.system?.discarded === true);
}

function readyForcePowers(actor) {
  return forcePowers(actor).filter(item => item?.system?.spent !== true && item?.system?.discarded !== true);
}

function weaponItems(actor) {
  return Array.from(actor?.items ?? []).filter(item => item?.type === 'weapon');
}

function meleeWeaponItems(actor) {
  return weaponItems(actor).filter(item => {
    const system = item?.system ?? {};
    const haystack = [system.weaponType, system.weaponCategory, system.category, system.range, system.rangeProfile, system.subtype, system.group, system.weaponGroup, system.description?.value, item?.name]
      .flat().map(value => String(value ?? '').toLowerCase()).join(' ');
    if (haystack.includes('ranged') || haystack.includes('vehicle')) return false;
    return haystack.includes('melee') || haystack.includes('lightsaber') || haystack.includes('simple') || haystack.includes('advanced') || haystack.includes('sword') || haystack.includes('staff') || haystack.includes('knife');
  });
}

function forceItemState(weapon) {
  return weapon?.getFlag?.(NS, 'forceItem') ?? weapon?.flags?.swse?.forceItem ?? {};
}

function isAttunedToActor(actor, weapon) {
  const state = forceItemState(weapon);
  return String(state?.attuned?.actorId ?? '') === String(actor?.id ?? '');
}

function isEmpoweredForActor(actor, weapon) {
  const state = forceItemState(weapon);
  return String(state?.empowered?.actorId ?? '') === String(actor?.id ?? '');
}

function forcePowerOptions(actor) {
  return forcePowers(actor).sort((a, b) => String(a.name).localeCompare(String(b.name))).map(power => ({ value: power.id, label: power.name }));
}

function powerOptionsByName(actor) {
  const names = [...new Set(forcePowers(actor).map(power => power.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return names.map(name => ({ value: name, label: name }));
}

function weaponOptions(actor, weapons = weaponItems(actor)) {
  return weapons.sort((a, b) => String(a.name).localeCompare(String(b.name))).map(weapon => ({ value: weapon.id, label: weapon.name }));
}

async function postCard(actor, title, body, flags = {}) {
  const content = `<section class="swse-chat-card swse-chat-card--force-adept-talent">
    <header class="swse-chat-card__header"><strong>${esc(title)}</strong><span>Force Talent</span></header>
    <div class="swse-chat-card__body">${body}</div>
  </section>`;
  return SWSEChat.postHTML({ actor, content, flags: { swse: { forceAdeptTalent: true, talentName: title, ...flags } } });
}

function htmlSelect(name, label, options = []) {
  return `<div class="form-group"><label>${esc(label)}</label><select name="${esc(name)}">${options.map(opt => `<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join('')}</select></div>`;
}

async function promptFields(title, body, fields = []) {
  const fieldHtml = fields.map(field => {
    if (field.type === 'select') return htmlSelect(field.name, field.label, field.options ?? []);
    if (field.type === 'checkbox') return `<label class="checkbox"><input type="checkbox" name="${esc(field.name)}" ${field.checked ? 'checked' : ''} /> ${esc(field.label)}</label>`;
    return `<div class="form-group"><label>${esc(field.label)}</label><input type="text" name="${esc(field.name)}" value="${esc(field.value ?? '')}" placeholder="${esc(field.placeholder ?? '')}" /></div>`;
  }).join('');
  const content = `<form class="swse-dialog swse-force-adept-talent-dialog"><p>${body}</p>${fieldHtml}</form>`;
  return SWSEDialogV2.prompt({
    title,
    content,
    label: 'Continue',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      const out = {};
      for (const field of fields) out[field.name] = field.type === 'checkbox' ? fd.get(field.name) === 'on' : String(fd.get(field.name) ?? '');
      return out;
    }
  });
}

async function spendOneForcePoint(actor, title, options = {}) {
  const result = await ActorEngine.spendForcePoints(actor, 1, options);
  if (!result?.spent) {
    ui?.notifications?.warn?.(`${title} requires spending 1 Force Point.`);
    return false;
  }
  return true;
}

async function grantBonusForcePoint(actor, source) {
  const pool = actor.getFlag?.(NS, 'bonusForcePoints') ?? {};
  const entries = Array.isArray(pool.entries) ? [...pool.entries] : [];
  entries.push({
    id: `${slug(source)}-${Date.now()}`,
    source,
    value: 1,
    max: 1,
    restrictions: 'Must be spent before the end of the encounter.',
    expires: 'encounter',
    encounterId: encounterId(),
    createdAt: Date.now()
  });
  const value = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.value) || 0), 0);
  const max = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.max ?? entry.value) || 0), 0);
  await ActorEngine.updateActor(actor, {
    'flags.swse.bonusForcePoints': {
      ...pool,
      value,
      max: Math.max(value, max),
      sources: [...new Set(entries.map(entry => entry.source).filter(Boolean))],
      entries,
      note: 'Bonus Force Points are spent before normal Force Points and may expire by source.'
    }
  }, { source: slug(source) });
  return { granted: 1, total: value };
}

async function increaseDarkSideScore(actor, amount, reason) {
  const delta = Math.max(0, Number(amount) || 0);
  if (!actor || delta <= 0) return null;
  const before = Number(actor?.system?.darkSide?.value ?? actor?.system?.darkSideScore ?? 0) || 0;
  const after = before + delta;
  const log = Array.isArray(actor?.system?.dspLog) ? [...actor.system.dspLog] : [];
  log.push({ reason, delta, before, after, round: game?.combat?.round || 0, timestamp: Date.now() });
  await ActorEngine.updateActor(actor, {
    'system.darkSide.value': after,
    'system.darkSideScore': after,
    'system.dspLog': log
  }, { meta: { guardKey: 'force-adept-dark-side-score' } });
  return { before, after, delta };
}

async function markPowerReady(power) {
  if (!power) return null;
  const updates = {};
  if (power.system?.spent === true) updates['system.spent'] = false;
  if (power.system?.discarded === true) updates['system.discarded'] = false;
  if (Object.keys(updates).length) await power.update(updates);
  return power;
}

async function recoverAllUsesByName(actor, powerName) {
  const wanted = normalizedName(powerName);
  const matches = forcePowers(actor).filter(power => normalizedName(power.name) === wanted);
  for (const power of matches) await markPowerReady(power);
  return matches.length;
}

async function rollUseTheForce(actor, title, { dc = null, keepBetter = false } = {}) {
  const total = useTheForceTotal(actor);
  const first = await RollEngine.safeRoll(`1d20 + ${total}`, actor?.getRollData?.() ?? {}, { actor, domain: `talent.${slug(title)}` });
  let kept = first;
  let second = null;
  if (keepBetter) {
    second = await RollEngine.safeRoll(`1d20 + ${total}`, actor?.getRollData?.() ?? {}, { actor, domain: `talent.${slug(title)}.reroll` });
    kept = Number(second?.total ?? -Infinity) > Number(first?.total ?? -Infinity) ? second : first;
  }
  await SWSEChat.postRoll({
    actor,
    roll: kept,
    flavor: `${title} — Use the Force${dc ? ` vs DC ${dc}` : ''}`,
    context: { category: 'talent', type: 'force-adept-talent', itemName: title, totalLabel: 'Use the Force', dc, originalRoll: first?.total ?? null, rerollTotal: second?.total ?? null }
  });
  return { first, second, kept, success: dc ? Number(kept?.total ?? 0) >= Number(dc) : null };
}

export class ForceAdeptTalentActions {
  static hasTalent(actor, name) { return hasTalent(actor, name); }

  static async execute(actor, kind, actionData = {}, options = {}) {
    const handlers = {
      forcePowerAdept: () => this.promptForcePowerAdept(actor),
      forceTreatment: () => this.promptForceTreatment(actor),
      fortifiedBody: () => this.announceFortifiedBody(actor),
      instrumentOfTheForce: () => this.promptInstrumentOfTheForce(actor),
      longCall: () => this.promptLongCall(actor),
      mysticalLink: () => this.promptMysticalLink(actor),
      attuneWeapon: () => this.promptAttuneWeapon(actor),
      empowerWeapon: () => this.promptEmpowerWeapon(actor),
      forceTalisman: () => this.announceForceTalismanDeferred(actor, false),
      greaterForceTalisman: () => this.announceForceTalismanDeferred(actor, true),
      focusedForceTalisman: () => this.promptFocusedForceTalisman(actor, false),
      greaterFocusedForceTalisman: () => this.promptFocusedForceTalisman(actor, true),
      forceThrow: () => this.promptForceThrow(actor, options),
      primitiveBlock: () => this.announcePrimitiveBlock(actor),
      cowerEnemies: () => this.promptCowerEnemies(actor),
      forceInterrogation: () => this.promptForceInterrogation(actor),
      inquisition: () => this.announceInquisition(actor),
      unsettlingPresence: () => this.promptUnsettlingPresence(actor),
      channelVitality: () => this.promptChannelVitality(actor),
      closedMind: () => this.announceClosedMind(actor),
      esotericTechnique: () => this.promptEsotericTechnique(actor),
      mysticMastery: () => this.announceMysticMastery(actor),
      regimenMastery: () => this.announceRegimenMastery(actor),
      mindProbe: () => this.promptMindProbe(actor),
      perfectTelepathy: () => this.announcePerfectTelepathy(actor),
      psychicCitadel: () => this.announcePsychicCitadel(actor),
      psychicDefenses: () => this.promptPsychicDefenses(actor),
      telepathicIntruder: () => this.promptTelepathicIntruder(actor)
    };
    const handler = handlers[kind];
    if (handler) return handler();
    return postCard(actor, actionData?.name ?? kind, `<p>${esc(actionData?.description ?? 'No Force Adept/Force Item talent handler is registered for this action yet.')}</p>`, { forceAdeptTalentAction: kind });
  }

  static async promptForcePowerAdept(actor) {
    if (!hasTalent(actor, 'Force Power Adept')) return postCard(actor, 'Force Power Adept', '<p>This actor does not have Force Power Adept.</p>');
    const options = powerOptionsByName(actor);
    if (!options.length) return postCard(actor, 'Force Power Adept', '<p>No Force Powers are available on this actor.</p>');
    const previous = actor.getFlag?.(NS, 'forcePowerAdept') ?? {};
    const selectedPowers = Array.isArray(previous?.powers) ? [...previous.powers] : (previous?.powerName ? [previous.powerName] : []);
    const selected = await promptFields('Force Power Adept', 'Choose the Force Power for this Force Power Adept use. The chosen power is remembered on the actor for Force Power activation reminders. If this talent is selected multiple times, record each different Force Power here.', [
      { type: 'select', name: 'powerName', label: 'Force Power', options },
      { type: 'checkbox', name: 'recordOnly', label: 'Record selection only; do not spend a Force Point or roll now', checked: selectedPowers.length > 0 }
    ]);
    if (!selected?.powerName) return null;
    const nextPowers = [...new Set([...selectedPowers, selected.powerName])];
    await actor.setFlag?.(NS, 'forcePowerAdept', { powerName: selected.powerName, powers: nextPowers, recordedAt: Date.now() });
    if (selected.recordOnly) {
      return postCard(actor, 'Force Power Adept', `<p>Recorded <strong>${esc(selected.powerName)}</strong> as a selected Force Power for Force Power Adept.</p><p>Recorded selections: <strong>${nextPowers.map(esc).join(', ')}</strong>.</p><p>When using a selected power, this actor may spend a Force Point to roll two Use the Force checks and keep the better result.</p>`, { powerName: selected.powerName, powers: nextPowers, recordedOnly: true });
    }
    if (!(await spendOneForcePoint(actor, 'Force Power Adept'))) return null;
    const result = await rollUseTheForce(actor, 'Force Power Adept', { keepBetter: true });
    return postCard(actor, 'Force Power Adept', `<p>${esc(actor.name)} spends 1 Force Point while using <strong>${esc(selected.powerName)}</strong>.</p><p>Roll two Use the Force checks and keep the better result. <strong>Kept:</strong> ${result.kept?.total ?? '?'}.</p>`, { powerName: selected.powerName, powers: nextPowers, original: result.first?.total ?? null, reroll: result.second?.total ?? null, kept: result.kept?.total ?? null });
  }

  static async promptForceTreatment(actor) {
    if (!hasTalent(actor, 'Force Treatment')) return postCard(actor, 'Force Treatment', '<p>This actor does not have Force Treatment.</p>');
    const choice = await promptFields('Force Treatment', 'Use Use the Force in place of Treat Injury. Medical Kit and Medpac requirements are waived for First Aid, Treat Disease, Treat Poison, and Treat Radiation.', [
      { type: 'select', name: 'task', label: 'Treatment task', options: [
        { value: 'Treat Injury check', label: 'Treat Injury check' },
        { value: 'First Aid', label: 'First Aid' },
        { value: 'Treat Disease', label: 'Treat Disease' },
        { value: 'Treat Poison', label: 'Treat Poison' },
        { value: 'Treat Radiation', label: 'Treat Radiation' }
      ] },
      { name: 'dc', label: 'Optional DC', placeholder: 'leave blank if unknown' }
    ]);
    if (!choice) return null;
    const dc = Number(choice.dc) || null;
    const result = await rollUseTheForce(actor, 'Force Treatment', { dc });
    return postCard(actor, 'Force Treatment', `<p>${esc(actor.name)} uses Use the Force in place of Treat Injury for <strong>${esc(choice.task)}</strong>.</p><p>This actor is considered trained in Treat Injury for this talent. First Aid, Treat Disease, Treat Poison, and Treat Radiation do not require a Medical Kit or Medpac.</p>${dc ? `<p><strong>Result:</strong> ${result.kept?.total ?? '?'} vs DC ${dc}; ${result.success ? 'success' : 'failure'}.</p>` : `<p><strong>Result:</strong> ${result.kept?.total ?? '?'}.</p>`}`, { task: choice.task, dc, total: result.kept?.total ?? null });
  }

  static async announceFortifiedBody(actor) {
    return postCard(actor, 'Fortified Body', '<p>Passive: this actor is immune to Disease, Poison, and Radiation.</p><p>No numeric defense bonus is applied; this is an immunity/reminder for effects that attempt to apply those afflictions.</p>', { immunities: ['disease', 'poison', 'radiation'], staticSheetPolicy: 'reminder-only' });
  }

  static async promptInstrumentOfTheForce(actor) {
    if (!hasTalent(actor, 'Instrument of the Force')) return postCard(actor, 'Instrument of the Force', '<p>This actor does not have Instrument of the Force.</p>');
    const choice = await promptFields('Instrument of the Force', 'Resolve the Search Your Feelings rider or record Dark Side Score consequences from spending the granted Force Point.', [
      { type: 'select', name: 'mode', label: 'Mode', options: [
        { value: 'grant', label: 'Successful Search Your Feelings: gain encounter Force Point' },
        { value: 'unfavorable', label: 'Spent granted Force Point in unfavorable way: +1 DSS' },
        { value: 'darkside', label: 'Spent granted Force Point on action that already raises DSS: +2 DSS' }
      ] }
    ]);
    if (!choice) return null;
    if (choice.mode === 'grant') {
      const granted = await grantBonusForcePoint(actor, 'Instrument of the Force');
      return postCard(actor, 'Instrument of the Force', `<p>${esc(actor.name)} gains 1 temporary Force Point from a successful Search Your Feelings use.</p><p>The point must be spent before the end of the encounter. Current bonus Force Points: <strong>${granted.total ?? '?'}</strong>.</p>`, { bonusForcePointGranted: true });
    }
    const amount = choice.mode === 'darkside' ? 2 : 1;
    const dss = await increaseDarkSideScore(actor, amount, 'Instrument of the Force bonus Force Point consequence');
    return postCard(actor, 'Instrument of the Force', `<p>Recorded the Dark Side consequence for spending the Instrument of the Force bonus Force Point.</p><p>Dark Side Score ${dss?.before ?? '?'} → <strong>${dss?.after ?? '?'}</strong>.</p>`, { darkSideIncrease: amount });
  }

  static async promptLongCall(actor) {
    if (!hasTalent(actor, 'Long Call')) return postCard(actor, 'Long Call', '<p>This actor does not have Long Call.</p>');
    const maxTargets = Math.max(2, abilityMod(actor, 'cha'));
    const choice = await promptFields('Long Call', 'Use Telepathy through Long Call.', [
      { type: 'select', name: 'mode', label: 'Telepathy use', options: [
        { value: 'willing', label: 'Willing recipient: halve Telepathy DC' },
        { value: 'unwilling', label: 'Unwilling target: reroll and keep better' },
        { value: 'multi', label: `Spend Force Point: contact up to ${maxTargets} targets` }
      ] },
      { name: 'dc', label: 'Original Telepathy DC', placeholder: 'optional' }
    ]);
    if (!choice) return null;
    if (choice.mode === 'multi' && !(await spendOneForcePoint(actor, 'Long Call'))) return null;
    const dc = Number(choice.dc) || null;
    const effectiveDc = choice.mode === 'willing' && dc ? Math.ceil(dc / 2) : dc;
    const result = choice.mode === 'unwilling'
      ? await rollUseTheForce(actor, 'Long Call', { dc: effectiveDc, keepBetter: true })
      : await rollUseTheForce(actor, 'Long Call', { dc: effectiveDc });
    const modeText = choice.mode === 'willing'
      ? `Telepathy DC is reduced by half${dc ? ` (${dc} → ${effectiveDc})` : ''}.`
      : choice.mode === 'multi'
        ? `Spent 1 Force Point to contact up to ${maxTargets} targets with one Use the Force check.`
        : 'Against an unwilling target, roll twice and keep the better result.';
    return postCard(actor, 'Long Call', `<p>${modeText}</p><p><strong>Use the Force:</strong> ${result.kept?.total ?? '?'}${effectiveDc ? ` vs DC ${effectiveDc}` : ''}.</p>`, { mode: choice.mode, dc: effectiveDc, maxTargets });
  }

  static async promptMysticalLink(actor) {
    if (!hasTalent(actor, 'Mystical Link')) return postCard(actor, 'Mystical Link', '<p>This actor does not have Mystical Link.</p>');
    const result = await rollUseTheForce(actor, 'Mystical Link', { dc: 30 });
    if (!result.success) {
      return postCard(actor, 'Mystical Link', `<p>${esc(actor.name)} attempts Mystical Link.</p><p><strong>Use the Force:</strong> ${result.kept?.total ?? '?'} vs DC 30; failure.</p>`, { success: false });
    }
    const choice = await promptFields('Mystical Link', 'The check succeeded. Choose the GM-selected benefit to resolve or record.', [
      { type: 'select', name: 'benefit', label: 'GM-selected benefit', options: [
        { value: 'recoverPower', label: 'Return one spent Force Power to suite' },
        { value: 'bonusForcePoint', label: 'Gain one temporary encounter Force Point' },
        { value: 'encounterUse', label: 'Gain additional use of once/encounter Force-related Talent or Feat' },
        { value: 'extraDie', label: 'Roll additional die on a Use the Force check, keep highest' }
      ] }
    ]);
    if (!choice) return postCard(actor, 'Mystical Link', `<p>Use the Force ${result.kept?.total ?? '?'} succeeds against DC 30. GM selects one listed Mystical Link benefit.</p>`, { success: true });
    if (choice.benefit === 'recoverPower') {
      const spent = spentForcePowers(actor);
      if (!spent.length) return postCard(actor, 'Mystical Link', '<p>The check succeeded, but this actor has no spent Force Powers to recover.</p>', { success: true, benefit: choice.benefit });
      const selected = await promptFields('Mystical Link', 'Choose one spent Force Power to return to the Force Power Suite.', [
        { type: 'select', name: 'powerId', label: 'Spent Force Power', options: spent.map(power => ({ value: power.id, label: power.name })) }
      ]);
      const power = spent.find(p => p.id === selected?.powerId);
      await markPowerReady(power);
      return postCard(actor, 'Mystical Link', `<p>Mystical Link succeeded. <strong>${esc(power?.name ?? 'Selected Force Power')}</strong> was returned to the Force Power Suite.</p>`, { success: true, benefit: choice.benefit, powerId: power?.id ?? null });
    }
    if (choice.benefit === 'bonusForcePoint') {
      const granted = await grantBonusForcePoint(actor, 'Mystical Link');
      return postCard(actor, 'Mystical Link', `<p>Mystical Link succeeded. ${esc(actor.name)} gains 1 temporary Force Point that expires at the end of the encounter.</p><p>Current bonus Force Points: <strong>${granted.total ?? '?'}</strong>.</p>`, { success: true, benefit: choice.benefit });
    }
    await actor.setFlag?.(NS, `mysticalLink.${choice.benefit}`, { encounterId: encounterId(), actorId: actor.id, createdAt: Date.now(), unresolved: true });
    return postCard(actor, 'Mystical Link', `<p>Mystical Link succeeded. GM selected: <strong>${esc(choice.benefit === 'encounterUse' ? 'additional once/encounter use' : 'additional die on Use the Force')}</strong>.</p><p>This benefit has been recorded on the actor for manual resolution.</p>`, { success: true, benefit: choice.benefit, manualResolution: true });
  }

  static async promptAttuneWeapon(actor) {
    if (!hasTalent(actor, 'Attune Weapon')) return postCard(actor, 'Attune Weapon', '<p>This actor does not have Attune Weapon.</p>');
    const weapons = meleeWeaponItems(actor);
    if (!weapons.length) return postCard(actor, 'Attune Weapon', '<p>No melee weapons were found on this actor.</p>');
    const selected = await promptFields('Attune Weapon', 'Spend a Force Point and choose a melee weapon to attune. Attuning takes a Full-Round Action.', [
      { type: 'select', name: 'weaponId', label: 'Melee Weapon', options: weaponOptions(actor, weapons) }
    ]);
    const weapon = weapons.find(w => w.id === selected?.weaponId);
    if (!weapon) return null;
    if (!(await spendOneForcePoint(actor, 'Attune Weapon'))) return null;
    const state = forceItemState(weapon);
    await weapon.setFlag?.(NS, 'forceItem', { ...state, attuned: { actorId: actor.id, actorName: actor.name, attackBonus: 1, createdAt: Date.now() } });
    return postCard(actor, 'Attune Weapon', `<p>${esc(actor.name)} attunes <strong>${esc(weapon.name)}</strong>.</p><p>When wielded by this actor, that weapon gains a +1 Force bonus on attack rolls. This has been stored on the weapon and is read by the attack roller.</p>`, { weaponId: weapon.id, attackBonus: 1 });
  }

  static async promptEmpowerWeapon(actor) {
    if (!hasTalent(actor, 'Empower Weapon')) return postCard(actor, 'Empower Weapon', '<p>This actor does not have Empower Weapon.</p>');
    const weapons = meleeWeaponItems(actor);
    if (!weapons.length) return postCard(actor, 'Empower Weapon', '<p>No melee weapons were found on this actor.</p>');
    const selected = await promptFields('Empower Weapon', 'Spend a Force Point and choose a melee weapon to empower. Empowering takes a Full-Round Action.', [
      { type: 'select', name: 'weaponId', label: 'Melee Weapon', options: weaponOptions(actor, weapons) }
    ]);
    const weapon = weapons.find(w => w.id === selected?.weaponId);
    if (!weapon) return null;
    if (!(await spendOneForcePoint(actor, 'Empower Weapon'))) return null;
    const state = forceItemState(weapon);
    await weapon.setFlag?.(NS, 'forceItem', { ...state, empowered: { actorId: actor.id, actorName: actor.name, extraDamageDie: true, createdAt: Date.now() } });
    return postCard(actor, 'Empower Weapon', `<p>${esc(actor.name)} empowers <strong>${esc(weapon.name)}</strong>.</p><p>When wielded by this actor, the weapon adds one extra die matching its base weapon damage. This has been stored on the weapon and is read by the damage roller.</p>`, { weaponId: weapon.id, extraDamageDie: true });
  }

  static async announceForceTalismanDeferred(actor, greater = false) {
    const title = greater ? 'Greater Force Talisman' : 'Force Talisman';
    if (!hasTalent(actor, title)) return postCard(actor, title, `<p>This actor does not have ${esc(title)}.</p>`);
    return postCard(actor, title, `<p>${esc(title)} is surfaced as a manual talisman creation/equipment card only.</p><p>Full talisman creation, one-active-talisman enforcement, destruction cooldowns, and defense application require the dedicated talisman/item UI. No always-on defense bonus was applied by this action.</p>`, { implementationDeferred: true, requiresDedicatedUi: true, greater });
  }

  static async promptFocusedForceTalisman(actor, greater = false) {
    const title = greater ? 'Greater Focused Force Talisman' : 'Focused Force Talisman';
    if (!hasTalent(actor, title)) return postCard(actor, title, `<p>This actor does not have ${esc(title)}.</p>`);
    const options = powerOptionsByName(actor);
    if (!options.length) return postCard(actor, title, '<p>No Force Powers are available on this actor.</p>');
    const choice = await promptFields(title, 'Focused Force Talisman requires a selected Force Power on the talisman. This action can record that selection or spend a Force Point to recover all expended uses of that selected power.', [
      { type: 'select', name: 'powerName', label: 'Selected Force Power', options },
      { type: 'checkbox', name: 'recordOnly', label: 'Record talisman selection only; do not spend a Force Point now', checked: true }
    ]);
    if (!choice?.powerName) return null;
    await actor.setFlag?.(NS, 'focusedForceTalisman', { powerName: choice.powerName, greater, recordedAt: Date.now() });
    if (choice.recordOnly) {
      return postCard(actor, title, `<p>Recorded <strong>${esc(choice.powerName)}</strong> as the Focused Force Talisman power.</p><p>Creation/equipment state remains manual until talisman UI exists.</p>`, { powerName: choice.powerName, greater, recordedOnly: true });
    }
    if (!(await spendOneForcePoint(actor, title, greater ? { ignoreOnePerTurn: true } : {}))) return null;
    const count = await recoverAllUsesByName(actor, choice.powerName);
    return postCard(actor, title, `<p>${esc(actor.name)} spends 1 Force Point through ${esc(title)} and recovers all expended uses of <strong>${esc(choice.powerName)}</strong>.</p><p><strong>Recovered item count:</strong> ${count}. ${greater ? 'This Force Point does not count against the one-per-turn restriction.' : ''}</p>`, { powerName: choice.powerName, recoveredCount: count, greater });
  }

  static async promptForceThrow(actor, options = {}) {
    if (!hasTalent(actor, 'Force Throw')) return postCard(actor, 'Force Throw', '<p>This actor does not have Force Throw.</p>');
    const weapons = meleeWeaponItems(actor).filter(weapon => isEmpoweredForActor(actor, weapon));
    const allMelee = meleeWeaponItems(actor);
    const eligible = weapons.length ? weapons : allMelee;
    if (!eligible.length) return postCard(actor, 'Force Throw', '<p>No melee weapons were found on this actor. Force Throw requires a Simple or Advanced melee weapon your size or smaller, and the weapon should be Empowered.</p>');
    const selected = await promptFields('Force Throw', `${weapons.length ? 'Choose an Empowered melee weapon to throw.' : 'No actor-flagged Empowered weapon was found; choose a melee weapon and verify Empower Weapon manually.'}`, [
      { type: 'select', name: 'weaponId', label: 'Weapon', options: weaponOptions(actor, eligible) },
      { type: 'checkbox', name: 'rollDamage', label: 'Roll damage if the attack hits or no target defense is available', checked: true }
    ]);
    const weapon = eligible.find(w => w.id === selected?.weaponId);
    if (!weapon) return null;
    const attack = await rollAttack(actor, weapon, {
      ...options,
      attackType: 'thrown',
      weaponCategory: 'thrown',
      actionId: 'force-throw',
      actionName: 'Force Throw',
      customTags: ['force-throw', 'thrown-weapon'],
      showRollCompanion: true
    });
    if (selected.rollDamage && attack?.isHit !== false) {
      await rollDamage(actor, weapon, { ...options, forceThrow: true, attackResult: attack, target: attack?.target ?? null, workflowContext: attack?.workflowContext ?? null });
    }
    const embedded = /piercing|slashing/i.test([weapon?.system?.damageType, weapon?.system?.damageTypes, weapon?.system?.description?.value].flat().join(' '));
    return postCard(actor, 'Force Throw', `<p>${esc(actor.name)} hurls <strong>${esc(weapon.name)}</strong> as a thrown weapon against a target within 6 squares.</p><p>The weapon does not automatically return. ${embedded ? 'If the attack hits, the piercing/slashing weapon becomes embedded and deals one additional die of damage at the end of the target\'s turns and when removed.' : 'If the weapon deals piercing or slashing damage, remember the embedded-weapon rider.'}</p>`, { weaponId: weapon.id, attackTotal: attack?.total ?? null, hit: attack?.isHit ?? null, embeddedRider: embedded });
  }

  static async announcePrimitiveBlock(actor) {
    if (!hasTalent(actor, 'Primitive Block')) return postCard(actor, 'Primitive Block', '<p>This actor does not have Primitive Block.</p>');
    return postCard(actor, 'Primitive Block', '<p>Primitive Block is available as a reaction against an incoming melee attack while an Empowered Weapon is drawn, the actor is aware of the attack, and the actor is not flat-footed.</p><p>Roll Use the Force against the incoming attack roll. Apply the cumulative -5 penalty manually for each Primitive Block use since the start of your last turn. Spend a Force Point only when using Primitive Block to protect an adjacent character.</p>', { reactionKey: 'primitiveBlock', requiresEmpoweredWeapon: true });
  }


  static async promptCowerEnemies(actor) {
    if (!hasTalent(actor, 'Cower Enemies')) return postCard(actor, 'Cower Enemies', '<p>This actor does not have Cower Enemies.</p>');
    const roll = await rollPersuasion(actor, 'Cower Enemies');
    const targets = selectedTargetActors();
    const rows = targets.map(target => `<li><strong>${esc(target.name)}</strong>: compare ${roll?.total ?? '?'} to the normal Intimidate DC/Will Defense.</li>`).join('');
    return postCard(actor, 'Cower Enemies', `<p>${esc(actor.name)} uses Persuasion to Intimidate targets in a 6-square cone instead of a single target.</p>${rows ? `<ul>${rows}</ul>` : '<p>No targets were selected; apply the Persuasion result to eligible creatures in the cone manually.</p>'}<p>All normal limitations of Intimidate still apply.</p>`, { rollTotal: roll?.total ?? null, targetActorIds: targets.map(t => t.id) });
  }

  static async promptForceInterrogation(actor) {
    if (!hasTalent(actor, 'Force Interrogation')) return postCard(actor, 'Force Interrogation', '<p>This actor does not have Force Interrogation.</p>');
    const roll = await rollPersuasion(actor, 'Force Interrogation');
    const target = selectedTargetActors()[0] ?? null;
    return postCard(actor, 'Force Interrogation', `<p>${esc(actor.name)} damaged a creature with a Force Power and immediately makes a Free Action Persuasion check to Intimidate ${target ? `<strong>${esc(target.name)}</strong>` : 'one damaged target'}.</p><p><strong>Persuasion:</strong> ${roll?.total ?? '?'}.</p>${hasTalent(actor, 'Cower Enemies') ? '<p><strong>Cower Enemies:</strong> this can instead affect targets in a 6-square cone when using Intimidate.</p>' : ''}`, { rollTotal: roll?.total ?? null, targetActorId: target?.id ?? null });
  }

  static async announceInquisition(actor) {
    if (!hasTalent(actor, 'Inquisition')) return postCard(actor, 'Inquisition', '<p>This actor does not have Inquisition.</p>');
    return postCard(actor, 'Inquisition', '<p>Runtime: attack and damage rolls receive <strong>+1 attack</strong> and <strong>+1 extra weapon damage die</strong> when the target actor has the Force Sensitivity feat and target context is available to the roller.</p><p>If target context is unavailable, apply the bonus manually against Force-sensitive targets.</p>', { attackBonus: 1, damageExtraWeaponDice: 1, requiresTargetFeat: 'Force Sensitivity' });
  }

  static async promptUnsettlingPresence(actor) {
    if (!hasTalent(actor, 'Unsettling Presence')) return postCard(actor, 'Unsettling Presence', '<p>This actor does not have Unsettling Presence.</p>');
    if (!(await spendOneForcePoint(actor, 'Unsettling Presence'))) return null;
    const result = await rollUseTheForce(actor, 'Unsettling Presence');
    const total = Number(result.kept?.total ?? 0) || 0;
    const enc = encounterId();
    const targets = selectedTargetActors();
    const rows = [];
    for (const target of targets) {
      const will = defenseTotal(target, 'will');
      const affected = total >= will;
      if (affected) {
        await target.setFlag?.(NS, 'forceAdept.unsettlingPresence', { encounterId: enc, sourceActorId: actor.id, sourceActorName: actor.name, attackPenalty: -2, skillPenalty: -2, useTheForceTotal: total, createdAt: Date.now() });
      }
      rows.push(`<li><strong>${esc(target.name)}</strong>: ${total} vs Will ${will}; ${affected ? 'affected (-2 attack/skill while within 6 squares)' : 'not affected'}.</li>`);
    }
    return postCard(actor, 'Unsettling Presence', `<p>${esc(actor.name)} creates an unsettling 6-square aura for the remainder of the encounter.</p><p><strong>Use the Force:</strong> ${total}.</p>${rows.length ? `<ul>${rows.join('')}</ul>` : '<p>No targets were selected. Compare this Use the Force result against each creature that enters the aura.</p>'}<p>Range and line of sight remain GM/player adjudicated.</p>`, { useTheForceTotal: total, targetActorIds: targets.map(t => t.id), forcePointSpent: true });
  }

  static async promptChannelVitality(actor) {
    if (!hasTalent(actor, 'Channel Vitality')) return postCard(actor, 'Channel Vitality', '<p>This actor does not have Channel Vitality.</p>');
    const ct = await worsenConditionTrack(actor, 1, 'channel-vitality');
    const fp = await grantTemporaryForcePoint(actor, 'Channel Vitality', 'end_of_turn');
    return postCard(actor, 'Channel Vitality', `<p>${esc(actor.name)} moves -1 step down the Condition Track and gains one temporary Force Point.</p><p><strong>Condition Track:</strong> ${ct.before} → ${ct.after}.</p><p><strong>Bonus Force Points:</strong> ${fp.total} total. This point expires at the end of the current turn if unspent.</p>`, { conditionBefore: ct.before, conditionAfter: ct.after, bonusForcePointGranted: true, expires: 'end_of_turn' });
  }

  static async announceClosedMind(actor) {
    if (!hasTalent(actor, 'Closed Mind')) return postCard(actor, 'Closed Mind', '<p>This actor does not have Closed Mind.</p>');
    const utf = useTheForceTotal(actor);
    const first = await RollEngine.safeRoll(`1d20 + ${utf}`, actor?.getRollData?.() ?? {}, { actor, domain: 'talent.closed-mind.sample-1' });
    const second = await RollEngine.safeRoll(`1d20 + ${utf}`, actor?.getRollData?.() ?? {}, { actor, domain: 'talent.closed-mind.sample-2' });
    const lower = Math.min(Number(first?.total ?? 0) || 0, Number(second?.total ?? 0) || 0);
    await SWSEChat.postRoll({ actor, roll: first, flavor: 'Closed Mind — First incoming roll sample', context: { category: 'talent', type: 'force-adept-talent', itemName: 'Closed Mind', totalLabel: 'First roll' } });
    await SWSEChat.postRoll({ actor, roll: second, flavor: 'Closed Mind — Second incoming roll sample', context: { category: 'talent', type: 'force-adept-talent', itemName: 'Closed Mind', totalLabel: 'Second roll' } });
    return postCard(actor, 'Closed Mind', `<p>When a creature uses a Mind-Affecting effect against ${esc(actor.name)} that targets Will Defense, the attacker must roll twice and take the lower result.</p><p><strong>Manual lower-of-two sample:</strong> ${lower}. Use this card when the incoming effect is not routed through an automatic Closed Mind-aware caller.</p>`, { lowerResult: lower });
  }

  static async promptEsotericTechnique(actor) {
    if (!hasTalent(actor, 'Esoteric Technique')) return postCard(actor, 'Esoteric Technique', '<p>This actor does not have Esoteric Technique.</p>');
    const amount = 10 + forceAdeptLevel(actor);
    const hp = await applyTemporaryHp(actor, amount, 'Esoteric Technique');
    return postCard(actor, 'Esoteric Technique', `<p>${esc(actor.name)} spent a Force Point to activate a Force Technique or Force Secret and gains bonus Hit Points until the end of the encounter.</p><p><strong>Bonus HP:</strong> ${hp.before} → ${hp.after} (amount ${amount}; higher existing temporary HP preserved).</p>`, { tempHpAmount: amount, tempHpBefore: hp.before, tempHpAfter: hp.after });
  }

  static async announceMysticMastery(actor) {
    const forceTalentCount = Array.from(actor?.items ?? []).filter(item => item?.type === 'talent' && /force|mystic|telepath|adept|jedi|sith/i.test([item?.system?.category, item?.system?.talent_tree, item?.system?.tree, ...(Array.isArray(item?.system?.tags) ? item.system.tags : [])].join(' '))).length;
    const bonus = Math.min(6, Math.max(0, forceTalentCount));
    return postCard(actor, 'Mystic Mastery', `<p>At level gain, ${esc(actor.name)} gains additional Force Points equal to their Force Talents, maximum +6.</p><p><strong>Current estimated Force Talent count:</strong> ${forceTalentCount}; level-up bonus cap result: <strong>+${bonus}</strong>.</p><p>This is a progression/reconciliation benefit; apply during level-up Force Point reconciliation.</p>`, { estimatedForceTalentCount: forceTalentCount, forcePointLevelUpBonus: bonus });
  }

  static async announceRegimenMastery(actor) {
    const title = hasTalent(actor, 'Regimen Mastery') ? 'Regimen Mastery' : 'Regimen Mastery';
    return postCard(actor, title, '<p>Passive: gain a <strong>+5 Force bonus</strong> on Skill Checks made to perform a Force Regimen.</p><p>This is surfaced as a Force Regimen check modifier/reminder until the Force Regimen activation UI consumes the rule directly.</p>', { forceRegimenSkillBonus: 5 });
  }

  static async promptMindProbe(actor) {
    if (!hasTalent(actor, 'Mind Probe')) return postCard(actor, 'Mind Probe', '<p>This actor does not have Mind Probe.</p>');
    const target = selectedTargetActors()[0] ?? null;
    const will = target ? defenseTotal(target, 'will') : null;
    const result = await rollUseTheForce(actor, 'Mind Probe', { dc: will });
    const total = Number(result.kept?.total ?? 0) || 0;
    return postCard(actor, 'Mind Probe', `<p>${esc(actor.name)} uses a Full-Round Action to touch and probe ${target ? `<strong>${esc(target.name)}</strong>` : 'a living adjacent creature'} for information.</p>${target ? `<p><strong>Use the Force:</strong> ${total} vs Will ${will}; ${total >= will ? 'access allowed if the Gather Information DC is also met' : 'unwilling target resists'}.</p>` : `<p><strong>Use the Force:</strong> ${total}. Compare against target Will if unwilling and the base Gather Information DC.</p>`}<p>No bribes are required, and failing by 5 or more does not alert others that the information was sought.</p>`, { targetActorId: target?.id ?? null, useTheForceTotal: total, willDc: will });
  }

  static async announcePerfectTelepathy(actor) {
    if (!hasTalent(actor, 'Perfect Telepathy')) return postCard(actor, 'Perfect Telepathy', '<p>This actor does not have Perfect Telepathy.</p>');
    return postCard(actor, 'Perfect Telepathy', '<p>Passive: when using the Telepathy aspect of Use the Force, this actor may communicate in full sentences and complete thoughts. The target still responds only in basic emotions or single thoughts.</p>', { telepathyUpgrade: true });
  }

  static async announcePsychicCitadel(actor) {
    if (!hasTalent(actor, 'Psychic Citadel')) return postCard(actor, 'Psychic Citadel', '<p>This actor does not have Psychic Citadel.</p>');
    const bonus = forceAdeptLevel(actor);
    return postCard(actor, 'Psychic Citadel', `<p>Passive: DefenseCalculator adds a <strong>+${bonus} Force bonus</strong> to ${esc(actor.name)}'s Will Defense from Psychic Citadel.</p>`, { willDefenseForceBonus: bonus });
  }

  static async promptPsychicDefenses(actor) {
    if (!hasTalent(actor, 'Psychic Defenses')) return postCard(actor, 'Psychic Defenses', '<p>This actor does not have Psychic Defenses.</p>');
    const dice = Math.max(1, wisdomModifier(actor));
    const roll = await RollEngine.safeRoll(`${dice}d6`, actor?.getRollData?.() ?? {}, { actor, domain: 'talent.psychic-defenses' });
    await SWSEChat.postRoll({ actor, roll, flavor: 'Psychic Defenses — Force Damage', context: { category: 'talent', type: 'force-adept-talent', itemName: 'Psychic Defenses', totalLabel: 'Force damage' } });
    return postCard(actor, 'Psychic Defenses', `<p>A creature targeted ${esc(actor.name)} with a [Mind-Affecting] Force Power and automatically takes <strong>${roll?.total ?? '?'} Force damage</strong>.</p><p>Formula: ${dice}d6 from Wisdom modifier ${wisdomModifier(actor)} (minimum 1d6).</p>`, { damageFormula: `${dice}d6`, damageTotal: roll?.total ?? null });
  }

  static async promptTelepathicIntruder(actor) {
    if (!hasTalent(actor, 'Telepathic Intruder')) return postCard(actor, 'Telepathic Intruder', '<p>This actor does not have Telepathic Intruder.</p>');
    const target = selectedTargetActors()[0] ?? null;
    if (!target) return postCard(actor, 'Telepathic Intruder', '<p>Target the creature that was successfully affected by your [Mind-Affecting] Force Power, then use this action again.</p>', { requiresTarget: true });
    await actor.setFlag?.(NS, 'telepathicIntruder', { targetActorId: target.id, targetName: target.name, bonus: 2, bonusType: 'force', expires: 'end_next_turn', encounterId: encounterId(), round: game?.combat?.round ?? null, turn: game?.combat?.turn ?? null, createdAt: Date.now() });
    return postCard(actor, 'Telepathic Intruder', `<p>${esc(actor.name)} records <strong>${esc(target.name)}</strong> as the Telepathic Intruder target until the end of ${esc(actor.name)}'s next turn.</p><p>The Force executor applies a <strong>+2 Force bonus</strong> to [Mind-Affecting] Force Power activation checks against that target when target context is passed.</p>`, { targetActorId: target.id, bonus: 2, expires: 'end_next_turn' });
  }
}

export function registerForceAdeptTalentActions() {
  if (!globalThis.SWSE) globalThis.SWSE = {};
  globalThis.SWSE.ForceAdeptTalentActions = ForceAdeptTalentActions;
}
