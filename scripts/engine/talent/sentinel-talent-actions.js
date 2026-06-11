import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createEffectOnActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

const NS = 'swse';

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
}

function slug(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hasTalent(actor, name) {
  return !!actor?.items?.some?.(item => item?.type === 'talent' && String(item?.name ?? '').toLowerCase() === String(name ?? '').toLowerCase());
}

function countTalent(actor, name) {
  return Array.from(actor?.items ?? []).filter(item => item?.type === 'talent' && String(item?.name ?? '').toLowerCase() === String(name ?? '').toLowerCase()).length;
}

function getLevel(actor) {
  return Number(actor?.system?.level?.heroic ?? actor?.system?.details?.level ?? actor?.system?.level ?? actor?.system?.classes?.total ?? 1) || 1;
}

function getClassLevel(actor) {
  const classes = actor?.system?.classes;
  if (classes && typeof classes === 'object') {
    for (const [key, value] of Object.entries(classes)) {
      if (key === 'total') continue;
      const name = String(value?.name ?? key ?? '').toLowerCase();
      if (/jedi|sentinel/.test(name)) {
        const n = Number(value?.levels ?? value?.level ?? value?.value ?? 0);
        if (Number.isFinite(n) && n > 0) return Math.floor(n);
      }
    }
  }
  for (const item of Array.from(actor?.items ?? [])) {
    if (item?.type !== 'class') continue;
    if (!/jedi|sentinel/i.test(String(item?.name ?? ''))) continue;
    const n = Number(item?.system?.levels ?? item?.system?.level ?? item?.system?.value ?? 0);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return getLevel(actor);
}

function getAbilityMod(actor, key) {
  return Number(actor?.system?.derived?.attributes?.[key]?.mod ?? actor?.system?.abilities?.[key]?.mod ?? actor?.system?.attributes?.[key]?.mod ?? 0) || 0;
}

function getAbilityScore(actor, key) {
  const candidates = [
    actor?.system?.derived?.attributes?.[key]?.value,
    actor?.system?.derived?.attributes?.[key]?.score,
    actor?.system?.abilities?.[key]?.value,
    actor?.system?.abilities?.[key]?.score,
    actor?.system?.attributes?.[key]?.value,
    actor?.system?.attributes?.[key]?.score
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 10;
}

function getBab(actor) {
  const candidates = [
    actor?.system?.derived?.bab,
    actor?.system?.bab,
    actor?.system?.baseAttackBonus,
    actor?.system?.attributes?.bab?.value,
    actor?.system?.combat?.baseAttackBonus
  ];
  for (const candidate of candidates) {
    const n = Number(candidate?.value ?? candidate?.total ?? candidate);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return 0;
}

function getDefense(actor, key) {
  const def = actor?.system?.derived?.defenses?.[key] ?? actor?.system?.defenses?.[key] ?? actor?.system?.attributes?.[key];
  return Number(def?.value ?? def?.total ?? def ?? 10) || 10;
}

function getDarkSideScore(actor) {
  const candidates = [
    actor?.system?.darkSideScore?.value,
    actor?.system?.darkSide?.score,
    actor?.system?.darkSide?.value,
    actor?.system?.details?.darkSideScore,
    actor?.system?.force?.darkSideScore,
    actor?.system?.resources?.darkSide?.value
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function actorTokens() {
  return Array.from(canvas?.tokens?.placeables ?? []).filter(token => token?.actor);
}

function targetDistance(sourceActor, targetToken) {
  const sourceToken = sourceActor?.getActiveTokens?.()?.[0] ?? canvas?.tokens?.controlled?.[0] ?? null;
  if (!sourceToken || !targetToken || typeof canvas?.grid?.measureDistance !== 'function') return null;
  try { return canvas.grid.measureDistance(sourceToken, targetToken); }
  catch (_err) { return null; }
}

function tokenOptions(sourceActor, { relation = 'any', maxSquares = null, includeSelf = false } = {}) {
  return actorTokens().map(token => {
    const actor = token.actor;
    const dist = targetDistance(sourceActor, token);
    return {
      id: token.id,
      actorId: actor.id,
      name: token.name ?? actor.name,
      actorName: actor.name,
      disposition: token.document?.disposition ?? token.disposition ?? 0,
      distance: dist,
      darkSideScore: getDarkSideScore(actor),
      hidden: token.document?.hidden === true
    };
  }).filter(row => {
    if (!includeSelf && row.actorId === sourceActor?.id) return false;
    if (relation === 'enemy' && row.disposition >= 0) return false;
    if (relation === 'ally' && row.disposition < 0) return false;
    if (Number.isFinite(Number(maxSquares)) && row.distance !== null && Number(row.distance) > Number(maxSquares)) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

async function promptToken(actor, title, { relation = 'any', maxSquares = null, note = '', fallbackLabel = 'target', requireDarkSide = false, includeSelf = false } = {}) {
  const options = tokenOptions(actor, { relation, maxSquares, includeSelf });
  const optionsHtml = options.map(row => {
    const dist = row.distance === null ? '' : ` (${row.distance} squares)`;
    const ds = row.darkSideScore > 0 ? ` · DSS ${row.darkSideScore}` : '';
    return `<option value="token:${esc(row.id)}">${esc(row.name)}${esc(dist)}${esc(ds)}</option>`;
  }).join('');
  const content = `<form class="swse-dialog swse-sentinel-target-dialog">
    ${note ? `<p>${esc(note)}</p>` : ''}
    <div class="form-group"><label>Target</label><select name="targetRef">${optionsHtml}<option value="manual">Manual entry / not on scene</option></select></div>
    <div class="form-group"><label>${esc(fallbackLabel)}</label><input name="manualName" type="text" placeholder="Manual target name" /></div>
    ${requireDarkSide ? '<label class="checkbox"><input type="checkbox" name="confirmDarkSide" /> Target has a Dark Side Score of 1 or higher</label>' : ''}
    <p class="notes">Line of sight, concealment, exact range, and special target traits remain GM/player adjudicated when the scene cannot prove them.</p>
  </form>`;
  return SWSEDialogV2.prompt({
    title,
    content,
    label: 'Continue',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      const ref = String(fd.get('targetRef') || 'manual');
      const manualName = String(fd.get('manualName') || '').trim();
      const confirmedDarkSide = fd.get('confirmDarkSide') === 'on';
      if (ref.startsWith('token:')) {
        const token = canvas?.tokens?.get?.(ref.slice(6)) ?? null;
        if (token?.actor) return { token, actor: token.actor, name: token.name ?? token.actor.name, manual: false, confirmedDarkSide };
      }
      return { token: null, actor: null, name: manualName || fallbackLabel, manual: true, confirmedDarkSide };
    }
  });
}

async function postCard(actor, title, body, flags = {}) {
  const content = `<section class="swse-chat-card swse-chat-card--sentinel-talent">
    <header class="swse-chat-card__header"><strong>${esc(title)}</strong><span>Jedi Sentinel Talent</span></header>
    <div class="swse-chat-card__body">${body}</div>
  </section>`;
  return SWSEChat.postHTML({ actor, content, flags: { swse: { sentinelTalent: true, ...flags } } });
}

function isForcePowerItem(item) {
  return item?.type === 'force-power' || /force-power/i.test(String(item?.type ?? ''));
}

function forcePowerOptions(actor) {
  return Array.from(actor?.items ?? [])
    .filter(item => isForcePowerItem(item) && item?.system?.spent !== true && item?.system?.discarded !== true)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function hasDarkSideDescriptor(item) {
  const values = [
    item?.system?.descriptor,
    item?.system?.descriptors,
    item?.system?.tags,
    item?.system?.keywords,
    item?.system?.discipline,
    item?.system?.darkSideOption === true ? 'dark side' : '',
    item?.name
  ].flat().map(value => String(value ?? '').toLowerCase()).join(' ');
  return values.includes('dark side') || values.includes('dark_side') || values.includes('dark-side');
}

async function loadDarkSideForcePowerOptions(actor) {
  const owned = Array.from(actor?.items ?? [])
    .filter(item => isForcePowerItem(item) && hasDarkSideDescriptor(item))
    .map(item => ({ id: `owned:${item.id}`, name: item.name, source: 'Owned', item }));
  const pack = game?.packs?.get?.('foundryvtt-swse.forcepowers') ?? game?.packs?.get?.('swse.forcepowers') ?? null;
  const packed = [];
  if (pack) {
    const docs = await pack.getDocuments();
    for (const doc of docs) {
      const data = doc?.toObject ? doc.toObject() : doc;
      if (!isForcePowerItem(data) || !hasDarkSideDescriptor(data)) continue;
      packed.push({ id: `pack:${doc.id ?? data._id}`, name: data.name, source: 'Compendium', item: doc });
    }
  }
  const seen = new Set();
  return [...owned, ...packed]
    .filter(row => {
      const key = String(row.name || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function spendReadyForcePower(actor, powerId, source) {
  const power = actor?.items?.get?.(powerId) ?? null;
  if (!power || !isForcePowerItem(power)) throw new Error('A ready Force Power is required.');
  await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
    _id: power.id,
    'system.spent': true,
    'system.discarded': true,
    'system.lastSpent': Date.now(),
    'flags.swse.lastSpentBy': source
  }], { source, render: false });
  return power;
}

function isBeastActor(actor) {
  const text = `${actor?.type ?? ''} ${actor?.system?.type ?? ''} ${actor?.system?.creatureType ?? ''} ${actor?.system?.details?.type ?? ''} ${actor?.system?.details?.species ?? ''}`.toLowerCase();
  return text.includes('beast') || text.includes('mount') || text.includes('creature');
}

function looksLikeLightsaber(payload = {}) {
  const weapon = payload.weapon ?? payload.item ?? payload.actionData?.weapon ?? null;
  const text = `${weapon?.name ?? ''} ${weapon?.type ?? ''} ${weapon?.system?.weaponType ?? ''} ${weapon?.system?.group ?? ''} ${payload.actionId ?? ''}`.toLowerCase();
  return text.includes('lightsaber');
}

function looksLikeMelee(payload = {}) {
  const weapon = payload.weapon ?? payload.item ?? payload.actionData?.weapon ?? null;
  const text = `${weapon?.name ?? ''} ${weapon?.type ?? ''} ${weapon?.system?.rangeType ?? ''} ${weapon?.system?.weaponType ?? ''} ${weapon?.system?.group ?? ''}`.toLowerCase();
  return text.includes('melee') || text.includes('lightsaber');
}

function looksLikeForcePower(payload = {}) {
  const item = payload.power ?? payload.item ?? payload.actionData?.power ?? null;
  const text = `${item?.name ?? ''} ${item?.type ?? ''} ${payload.actionId ?? ''} ${payload.domain ?? ''}`.toLowerCase();
  return text.includes('force-power') || text.includes('force power') || item?.type === 'force-power';
}

function payloadHasDescriptor(payload = {}, descriptor = '') {
  const d = descriptor.toLowerCase();
  const item = payload.power ?? payload.item ?? payload.actionData?.power ?? null;
  const values = [
    payload.descriptor,
    payload.descriptors,
    payload.forceDescriptor,
    payload.forceDescriptors,
    item?.system?.descriptor,
    item?.system?.descriptors,
    item?.system?.tags,
    item?.system?.keywords,
    item?.system?.description,
    item?.name
  ].flat().map(v => String(v ?? '').toLowerCase()).join(' ');
  return values.includes(d);
}

export class SentinelTalentActions {
  static hasTalent(actor, name) { return hasTalent(actor, name); }

  static _encounterId() {
    return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
  }

  static async announcePassiveTalent(actor, title, html, flags = {}) {
    return postCard(actor, title, html, { talentName: title, ...flags });
  }

  static async announceClearMind(actor) {
    return postCard(actor, 'Clear Mind', '<p>You may reroll any opposed Use the Force check made to oppose Sense Force checks. You must keep the reroll, even if it is worse.</p>', { talentName: 'Clear Mind' });
  }

  static async promptDarkDeception(actor) {
    if (!hasTalent(actor, 'Dark Deception')) {
      ui?.notifications?.warn?.('Dark Deception talent required.');
      return null;
    }
    const wisdomScore = getAbilityScore(actor, 'wis');
    const currentDss = getDarkSideScore(actor);
    const active = actor.getFlag?.(NS, 'darkDeception.active') === true;
    const nextActive = !active;
    await actor.setFlag(NS, 'darkDeception', { active: nextActive, effectiveDarkSideScore: wisdomScore, actualDarkSideScore: currentDss, updatedAt: Date.now() });
    await postCard(actor, 'Dark Deception', `<p>${nextActive ? 'Activated' : 'Deactivated'} Dark Deception.</p><p>When another character attempts to sense ${esc(actor.name)} through the Force in any way, ${esc(actor.name)} may choose to act as though their Dark Side Score equals their Wisdom score.</p><p><strong>Current actual DSS:</strong> ${currentDss}. <strong>Masked DSS while chosen:</strong> ${wisdomScore}.</p><p>Deception is a class skill for this character.</p>`, { talentName: 'Dark Deception', active: nextActive, effectiveDarkSideScore: wisdomScore });
    return { success: true, active: nextActive, effectiveDarkSideScore: wisdomScore };
  }

  static async announceDarkSideSense(actor) {
    return postCard(actor, 'Dark Side Sense', '<p>You may reroll any Use the Force check made to sense the presence and relative location of characters with a Dark Side Score of 1 or higher. You must keep the reroll, even if it is worse.</p>', { talentName: 'Dark Side Sense' });
  }

  static async announceDarkSideScourge(actor) {
    const bonus = Math.max(1, getAbilityMod(actor, 'cha'));
    return postCard(actor, 'Dark Side Scourge', `<p>Against creatures with a Dark Side Score of 1 or higher, your melee attacks deal extra damage equal to your Charisma bonus, minimum +1.</p><p><strong>Current bonus:</strong> +${bonus} damage, if the target qualifies.</p>`, { talentName: 'Dark Side Scourge', bonus });
  }

  static async announceResistTheDarkSide(actor) {
    return postCard(actor, 'Resist the Dark Side', '<p>You gain a +5 Force bonus to all Defense scores against Force Powers with the [Dark Side] descriptor and against Force Powers from a dark Force-user. This is conditional and should not be applied as a global permanent defense bonus.</p>', { talentName: 'Resist the Dark Side' });
  }

  static async promptForceHaze(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Force Haze')) {
      ui?.notifications?.warn?.('Force Haze talent required.');
      return null;
    }
    const maxCreatures = Math.max(1, getClassLevel(actor));
    const rows = tokenOptions(actor, { relation: 'ally', includeSelf: true });
    const optionsHtml = rows.map(row => {
      const dist = row.distance === null ? '' : ` (${row.distance} squares)`;
      const self = row.actorId === actor.id ? ' — self' : '';
      return `<option value="${esc(row.id)}">${esc(row.name)}${esc(self)}${esc(dist)}</option>`;
    }).join('');
    const content = `<form class="swse-dialog swse-force-haze-dialog">
      <p>Spend 1 Force Point and make a Use the Force check. You can hide up to ${maxCreatures} creature${maxCreatures === 1 ? '' : 's'} in line of sight. Force Haze lasts up to 1 minute.</p>
      <div class="form-group"><label>Hidden creatures</label><select name="tokenIds" multiple size="8">${optionsHtml}</select></div>
      <label class="checkbox"><input type="checkbox" name="vehicle" /> Hide one vehicle instead while on board (GM confirms size restriction)</label>
      <p class="notes">If an opponent moves into line of sight of a hidden creature, compare this UTF result to that opponent's Will Defense. On success, hidden creatures have Total Concealment against that opponent.</p>
    </form>`;
    const choice = await SWSEDialogV2.prompt({
      title: 'Force Haze',
      content,
      label: 'Create Haze',
      callback: (html) => {
        const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
        const form = root?.querySelector?.('form') ?? root;
        const fd = new FormData(form);
        return { tokenIds: fd.getAll('tokenIds').slice(0, maxCreatures).map(String), vehicle: fd.get('vehicle') === 'on' };
      }
    });
    if (!choice) return null;

    const modResult = await showRollModifiersDialog({ title: 'Force Haze — Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Force Haze requires spending 1 Force Point.');
      return null;
    }
    const roll = await rollSkillCheck(actor, 'useTheForce', { ...modResult, source: 'force-haze', skillUse: { key: 'force-haze', label: 'Force Haze' }, sourceElement, showRollCompanion: true });
    if (!roll) return null;
    const total = Number(roll.roll?.total ?? roll.total ?? 0) || 0;
    const chosenTokens = choice.tokenIds.map(id => canvas?.tokens?.get?.(id)).filter(Boolean);
    const hidden = chosenTokens.map(token => ({ tokenId: token.id, actorId: token.actor?.id ?? null, name: token.name ?? token.actor?.name ?? 'Hidden ally' }));
    const persistent = hasTalent(actor, 'Persistent Haze');
    const unseenEyes = hasTalent(actor, 'Unseen Eyes');
    await actor.setFlag(NS, 'forceHaze', {
      active: true,
      rollTotal: total,
      hidden,
      vehicle: choice.vehicle,
      maxCreatures,
      persistent,
      unseenEyes,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      dismissedWhenHiddenCreatureAttacks: !persistent
    });
    for (const token of chosenTokens) {
      if (!token.actor) continue;
      await createEffectOnActor(token.actor, {
        name: `Force Haze (${actor.name})`,
        icon: 'icons/svg/invisible.svg',
        changes: [],
        disabled: false,
        duration: { seconds: 60 },
        flags: { swse: { talentName: 'Force Haze', sourceActorId: actor.id, sourceActorName: actor.name, totalConcealmentCheck: total, persistentHaze: persistent, unseenEyes, dismissedWhenAttacks: !persistent } }
      }, { source: 'force-haze' });
    }
    const names = hidden.length ? hidden.map(h => esc(h.name)).join(', ') : (choice.vehicle ? 'one eligible vehicle' : 'eligible creatures chosen manually');
    const extra = `${persistent ? '<p><strong>Persistent Haze:</strong> attackers lose their own concealment; non-attackers remain concealed.</p>' : '<p>The haze is dismissed instantly if anyone hidden by it attacks.</p>'}${unseenEyes ? '<p><strong>Unseen Eyes:</strong> hidden allies can reroll Perception checks and gain +2 damage against foes unaware of them.</p>' : ''}`;
    await postCard(actor, 'Force Haze', `<p>${esc(actor.name)} creates a Force Haze with a Use the Force result of <strong>${total}</strong>.</p><p><strong>Hidden:</strong> ${names}</p><p>Compare ${total} to the Will Defense of opponents that move into line of sight of any hidden creature. On success, hidden creatures have Total Concealment against that opponent.</p>${extra}`, { talentName: 'Force Haze', roll: total, hidden });
    return { success: true, roll: total, hidden };
  }

  static async promptDampenPresence(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Dampen Presence')) {
      ui?.notifications?.warn?.('Dampen Presence talent required.');
      return null;
    }
    const target = await promptToken(actor, 'Dampen Presence', { relation: 'any', fallbackLabel: 'sentient creature', note: 'Use after interacting with a sentient creature. If your UTF check exceeds Will Defense, it does not remember the interaction once you are gone.' });
    if (!target) return null;
    const dc = target.actor ? getDefense(target.actor, 'will') + (getLevel(target.actor) > getLevel(actor) ? 5 : 0) : 10;
    const modResult = await showRollModifiersDialog({ title: 'Dampen Presence — Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', { ...modResult, dc, source: 'dampen-presence', skillUse: { key: 'dampen-presence', label: 'Dampen Presence' }, targetContext: { targetName: target.name, willDefense: dc }, sourceElement });
    if (!roll) return null;
    const total = Number(roll.roll?.total ?? roll.total ?? 0) || 0;
    const success = total > dc;
    if (success && target.actor) {
      await createEffectOnActor(target.actor, { name: `Dampen Presence (${actor.name})`, icon: 'icons/svg/silenced.svg', changes: [], disabled: false, duration: { rounds: 999 }, flags: { swse: { talentName: 'Dampen Presence', sourceActorId: actor.id, mindAffecting: true, memorySuppressed: true, note: 'Target does not remember interacting with the source once the source is gone.' } } }, { source: 'dampen-presence' });
    }
    await postCard(actor, 'Dampen Presence', `<p>${success ? 'Success' : 'Failure'} against <strong>${esc(target.name)}</strong> (${total} vs Will DC ${dc}; must exceed).</p>${success ? '<p><strong>Effect:</strong> the target does not remember interacting with you once you are gone. Mind-Affecting.</p>' : ''}`, { talentName: 'Dampen Presence', success, roll: total, dc });
    return { success, roll: total, dc };
  }

  static async promptDarkRetaliation(actor) {
    if (!hasTalent(actor, 'Dark Retaliation')) {
      ui?.notifications?.warn?.('Dark Retaliation talent required.');
      return null;
    }
    const flag = actor.getFlag?.(NS, 'encounterUses.darkRetaliation') ?? {};
    if (flag?.encounterId === this._encounterId() && flag?.used === true) {
      ui?.notifications?.warn?.('Dark Retaliation has already been used this encounter.');
      return null;
    }
    const powers = forcePowerOptions(actor);
    const powerOptions = powers.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    const content = `<form class="swse-dialog"><p>Spend 1 Force Point to activate a ready Force Power as a Reaction after being targeted by a Force Power with the [Dark Side] descriptor.</p><div class="form-group"><label>Force Power to activate</label><select name="powerId">${powerOptions}<option value="manual">Manual / not tracked</option></select></div></form>`;
    const choice = await SWSEDialogV2.prompt({ title: 'Dark Retaliation', content, label: 'Retaliate', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      return { powerId: String(new FormData(form).get('powerId') || 'manual') };
    }});
    if (!choice) return null;
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Dark Retaliation requires spending 1 Force Point.');
      return null;
    }
    let powerName = 'a Force Power';
    if (choice.powerId !== 'manual') {
      const power = await spendReadyForcePower(actor, choice.powerId, 'dark-retaliation');
      powerName = power.name;
    }
    await actor.setFlag(NS, 'encounterUses.darkRetaliation', { encounterId: this._encounterId(), used: true, powerName, usedAt: Date.now() });
    await postCard(actor, 'Dark Retaliation', `<p>${esc(actor.name)} spends a Force Point and activates <strong>${esc(powerName)}</strong> as a Reaction to being targeted by a [Dark Side] Force Power.</p><p>Resolve the selected Force Power normally against eligible targets.</p>`, { talentName: 'Dark Retaliation', powerName });
    return { success: true, powerName };
  }

  static async promptGradualResistance(actor) {
    if (!hasTalent(actor, 'Gradual Resistance')) {
      ui?.notifications?.warn?.('Gradual Resistance talent required.');
      return null;
    }
    const content = `<form class="swse-dialog"><p>After you take damage from a Force Power, identify that power. You gain +2 Force bonus to all Defenses against that Force Power until the end of the encounter.</p><div class="form-group"><label>Force Power</label><input name="powerName" type="text" placeholder="Move Object, Force Lightning, etc." /></div></form>`;
    const choice = await SWSEDialogV2.prompt({ title: 'Gradual Resistance', content, label: 'Record Resistance', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      return { powerName: String(new FormData(form).get('powerName') || '').trim() || 'the triggering Force Power' };
    }});
    if (!choice) return null;
    await createEffectOnActor(actor, { name: `Gradual Resistance: ${choice.powerName}`, icon: 'icons/svg/shield.svg', changes: [], disabled: false, duration: { rounds: 999 }, flags: { swse: { talentName: 'Gradual Resistance', forcePowerName: choice.powerName, manualDefenseAdjustment: true, forceDefenseBonus: 2, appliesOnlyAgainstNamedForcePower: true, encounterId: this._encounterId() } } }, { source: 'gradual-resistance' });
    await postCard(actor, 'Gradual Resistance', `<p>${esc(actor.name)} gains a +2 Force bonus to all Defenses against <strong>${esc(choice.powerName)}</strong> until the end of the encounter.</p><p>This is conditional; it is not a global defense bonus.</p>`, { talentName: 'Gradual Resistance', forcePowerName: choice.powerName });
    return { success: true, powerName: choice.powerName };
  }

  static async promptReapRetribution(actor) {
    if (!hasTalent(actor, 'Reap Retribution')) {
      ui?.notifications?.warn?.('Reap Retribution talent required.');
      return null;
    }
    const source = await promptToken(actor, 'Reap Retribution', { relation: 'enemy', fallbackLabel: 'Force Power user', note: 'Use after you take damage from a Force Power. Choose the creature that used the Force Power against you.' });
    if (!source) return null;
    await createEffectOnActor(actor, { name: `Reap Retribution: ${source.name}`, icon: 'icons/svg/blood.svg', changes: [], disabled: false, duration: { rounds: 999 }, flags: { swse: { talentName: 'Reap Retribution', targetActorId: source.actor?.id ?? null, targetName: source.name, bonusDamage: 2, encounterId: this._encounterId(), note: 'Deal +2 damage against the creature that used the triggering Force Power against you.' } } }, { source: 'reap-retribution' });
    await postCard(actor, 'Reap Retribution', `<p>${esc(actor.name)} deals +2 damage against <strong>${esc(source.name)}</strong> until the end of the encounter.</p><p>Trigger: ${esc(actor.name)} took damage from a Force Power used by that creature.</p>`, { talentName: 'Reap Retribution', targetActorId: source.actor?.id ?? null });
    return { success: true, targetName: source.name };
  }

  static async promptSentinelsGambit(actor) {
    if (!hasTalent(actor, "Sentinel's Gambit")) {
      ui?.notifications?.warn?.("Sentinel's Gambit talent required.");
      return null;
    }
    const flag = actor.getFlag?.(NS, 'encounterUses.sentinelsGambit') ?? {};
    const improvedExtraUses = hasTalent(actor, "Improved Sentinel's Gambit") ? Math.max(1, Math.floor(getClassLevel(actor) / 2)) : 0;
    const maxUses = 1 + improvedExtraUses;
    const usedCount = flag?.encounterId === this._encounterId() ? Math.max(0, Number(flag?.usedCount ?? (flag?.used ? 1 : 0)) || 0) : 0;
    if (usedCount >= maxUses) {
      ui?.notifications?.warn?.(`Sentinel's Gambit has no uses remaining this encounter (${usedCount}/${maxUses}).`);
      return null;
    }
    const target = await promptToken(actor, "Sentinel's Gambit", { relation: 'enemy', maxSquares: 1, fallbackLabel: 'adjacent dark-side opponent', requireDarkSide: true, note: 'Choose an adjacent opponent with Dark Side Score 1+.' });
    if (!target) return null;
    const dss = target.actor ? getDarkSideScore(target.actor) : (target.confirmedDarkSide ? 1 : 0);
    if (dss < 1 && !target.confirmedDarkSide) {
      ui?.notifications?.warn?.("Sentinel's Gambit requires a target with Dark Side Score 1+.");
      return null;
    }
    if (target.actor) {
      await createEffectOnActor(target.actor, { name: `Sentinel's Gambit (${actor.name})`, icon: 'icons/svg/eye.svg', changes: [], disabled: false, duration: { rounds: 1, turns: 1 }, flags: { swse: { talentName: "Sentinel's Gambit", sourceActorId: actor.id, sourceActorName: actor.name, deniedDexToReflexAgainstSource: true, expiresEndOfSourceNextTurn: true } } }, { source: 'sentinels-gambit' });
    }
    const nextUsedCount = usedCount + 1;
    await actor.setFlag(NS, 'encounterUses.sentinelsGambit', { encounterId: this._encounterId(), used: nextUsedCount >= maxUses, usedCount: nextUsedCount, maxUses, targetName: target.name, targetActorId: target.actor?.id ?? null, usedAt: Date.now() });
    await postCard(actor, "Sentinel's Gambit", `<p><strong>${esc(target.name)}</strong> loses its Dexterity bonus to Reflex Defense against ${esc(actor.name)}'s attacks until the end of ${esc(actor.name)}'s next turn.</p><p><strong>Encounter uses:</strong> ${nextUsedCount}/${maxUses}${improvedExtraUses ? ` (includes +${improvedExtraUses} from Improved Sentinel's Gambit)` : ''}.</p>`, { talentName: "Sentinel's Gambit", targetActorId: target.actor?.id ?? null, usedCount: nextUsedCount, maxUses });
    return { success: true, targetName: target.name };
  }

  static async promptSteelResolve(actor) {
    if (!hasTalent(actor, 'Steel Resolve')) {
      ui?.notifications?.warn?.('Steel Resolve talent required.');
      return null;
    }
    const bab = getBab(actor);
    const maxPenalty = Math.max(1, Math.min(5, bab || 5));
    const content = `<form class="swse-dialog"><p>When you use a Standard Action to make a melee attack, take an attack penalty and gain twice that value as an insight bonus to Will Defense until the start of your next turn. The bonus cannot exceed your Base Attack Bonus.</p><div class="form-group"><label>Attack penalty</label><input name="penalty" type="range" min="1" max="${maxPenalty}" value="1" step="1" oninput="this.nextElementSibling.value=this.value" /><output>1</output></div><p class="notes">Current detected BAB cap: ${bab}. If BAB could not be detected, GM confirms the cap.</p></form>`;
    const choice = await SWSEDialogV2.prompt({ title: 'Steel Resolve', content, label: 'Apply Steel Resolve', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      return { penalty: Math.max(1, Math.min(maxPenalty, Number(new FormData(form).get('penalty') || 1) || 1)) };
    }});
    if (!choice) return null;
    const willBonus = Math.min(Math.max(0, bab || choice.penalty * 2), choice.penalty * 2);
    await createEffectOnActor(actor, { name: `Steel Resolve (+${willBonus} Will)`, icon: 'icons/svg/shield.svg', changes: [{ key: 'system.defenses.will.bonus', mode: 2, value: String(willBonus), priority: 20 }], disabled: false, duration: { rounds: 1, turns: 1 }, flags: { swse: { talentName: 'Steel Resolve', meleeAttackPenalty: -choice.penalty, insightWillBonus: willBonus, expiresStartOfSourceNextTurn: true } } }, { source: 'steel-resolve' });
    await postCard(actor, 'Steel Resolve', `<p>${esc(actor.name)} takes a -${choice.penalty} penalty on the triggering standard-action melee attack and gains a +${willBonus} insight bonus to Will Defense until the start of their next turn.</p><p>The attack penalty must be applied to the melee attack roll.</p>`, { talentName: 'Steel Resolve', penalty: choice.penalty, willBonus });
    return { success: true, penalty: choice.penalty, willBonus };
  }

  static async announceDarkSideBane(actor) {
    const bonus = Math.max(1, getAbilityMod(actor, 'cha'));
    return postCard(actor, 'Dark Side Bane', `<p>When you use a damage-dealing Force Power against a creature with Dark Side Score 1+, you deal extra damage on a successful hit equal to your Charisma bonus, minimum +1.</p><p><strong>Current bonus:</strong> +${bonus} damage if the target qualifies.</p>`, { talentName: 'Dark Side Bane', bonus });
  }

  static async announceMasterOfTheGreatHunt(actor) {
    return postCard(actor, 'Master of the Great Hunt', '<p>You gain a +1 Force bonus on attack rolls and deal +1 die of damage on Lightsaber attacks made against a Beast with a Dark Side Score of 1 or higher.</p>', { talentName: 'Master of the Great Hunt' });
  }

  static async announcePersistentHaze(actor) {
    return postCard(actor, 'Persistent Haze', '<p>When anyone concealed by your Force Haze attacks, only that attacker loses Total Concealment. Other concealed allies remain hidden without a new Use the Force check.</p>', { talentName: 'Persistent Haze' });
  }

  static async announcePrimeTargets(actor) {
    return postCard(actor, 'Prime Targets', '<p>When you hit a target with a Lightsaber attack, if that target has not been attacked since the end of your last turn, you deal +1 die of damage.</p><p>This is target-history dependent and should be confirmed at the table when the attack resolves.</p>', { talentName: 'Prime Targets' });
  }

  static async announceSensePrimalForce(actor) {
    return postCard(actor, 'Sense Primal Force', '<p>When within a natural wilderness area, you can use Sense Surroundings to detect targets out to a 30-square radius, regardless of line of sight.</p>', { talentName: 'Sense Primal Force' });
  }

  static async announceImprovedSentinelStrike(actor) {
    return postCard(actor, 'Improved Sentinel Strike', '<p>Your Sentinel Strike damage dice are d8s instead of d6s. This upgrades the existing Sentinel Strike conditional damage path; it does not create a separate always-on damage bonus.</p>', { talentName: 'Improved Sentinel Strike', dieSize: 8 });
  }

  static async announceImprovedSentinelsGambit(actor) {
    const extraUses = Math.max(1, Math.floor(getClassLevel(actor) / 2));
    return postCard(actor, "Improved Sentinel's Gambit", `<p>You can use Sentinel's Gambit an additional number of times per encounter equal to half your Class Level (minimum 1).</p><p><strong>Detected extra uses:</strong> +${extraUses}. Use the Sentinel's Gambit action to spend them from the shared encounter tracker.</p>`, { talentName: "Improved Sentinel's Gambit", extraUses });
  }

  static async announceRebukeTheDark(actor) {
    return postCard(actor, 'Rebuke the Dark', '<p>When using the Rebuke Force Power against a Force Power with the [Dark Side] descriptor, roll two dice for the Rebuke attempt and keep the better result.</p><p>This applies only to Rebuke attempts against [Dark Side] Force Powers.</p>', { talentName: 'Rebuke the Dark' });
  }

  static async promptTaintOfTheDarkSide(actor) {
    if (!hasTalent(actor, 'Taint of the Dark Side')) {
      ui?.notifications?.warn?.('Taint of the Dark Side talent required.');
      return null;
    }
    const current = actor.getFlag?.(NS, 'taintOfTheDarkSide') ?? {};
    const options = await loadDarkSideForcePowerOptions(actor);
    if (!options.length) {
      await postCard(actor, 'Taint of the Dark Side', '<p>No [Dark Side] Force Powers were found in the actor or force power compendium. Add one manually, then record it as the Taint of the Dark Side power.</p>', { talentName: 'Taint of the Dark Side' });
      return { success: false, reason: 'no-dark-side-powers-found' };
    }
    const rows = options.map(row => `<option value="${esc(row.id)}" ${current?.powerName === row.name ? 'selected' : ''}>${esc(row.name)} — ${esc(row.source)}</option>`).join('');
    const content = `<form class="swse-dialog"><p>Choose one Force Power with the [Dark Side] descriptor to add to your Force Power Suite. Once per encounter, you can use that chosen power without increasing your Dark Side Score unless you spend a Force Point or Destiny Point to modify it.</p><div class="form-group"><label>Dark Side Force Power</label><select name="powerRef">${rows}</select></div><p class="notes">If the selected power is from the compendium and not already owned, it will be added to the actor's Force Power Suite.</p></form>`;
    const choice = await SWSEDialogV2.prompt({ title: 'Taint of the Dark Side', content, label: 'Choose Power', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      return { powerRef: String(new FormData(form).get('powerRef') || '') };
    }});
    if (!choice) return null;
    const selected = options.find(row => row.id === choice.powerRef) ?? null;
    if (!selected) return null;
    let ownedItem = selected.id.startsWith('owned:') ? selected.item : Array.from(actor?.items ?? []).find(item => isForcePowerItem(item) && String(item.name).toLowerCase() === String(selected.name).toLowerCase());
    if (!ownedItem && selected.item) {
      const data = selected.item.toObject ? selected.item.toObject() : selected.item;
      data.system = foundry.utils.mergeObject(data.system || {}, { inSuite: true, grantedBy: 'Taint of the Dark Side' }, { inplace: false, recursive: true });
      data.flags = foundry.utils.mergeObject(data.flags || {}, { swse: { taintOfTheDarkSideGranted: true } }, { inplace: false, recursive: true });
      const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', [data], { source: 'taint-of-the-dark-side', render: false });
      ownedItem = Array.isArray(created) ? created[0] : created;
    }
    await actor.setFlag(NS, 'taintOfTheDarkSide', { powerId: ownedItem?.id ?? null, powerName: selected.name, selectedAt: Date.now() });
    await postCard(actor, 'Taint of the Dark Side', `<p><strong>${esc(selected.name)}</strong> is recorded as ${esc(actor.name)}'s Taint of the Dark Side power.</p><p>Once per encounter, using this specific [Dark Side] Force Power does not increase Dark Side Score unless it is modified by a Force Point or Destiny Point.</p>`, { talentName: 'Taint of the Dark Side', powerId: ownedItem?.id ?? null, powerName: selected.name });
    return { success: true, powerId: ownedItem?.id ?? null, powerName: selected.name };
  }

  static async announceSentinelStrike(actor) {
    const dice = Math.min(5, Math.max(1, countTalent(actor, 'Sentinel Strike')));
    const dieSize = hasTalent(actor, 'Improved Sentinel Strike') ? 8 : 6;
    return postCard(actor, 'Sentinel Strike', `<p>When you attack a flat-footed opponent, or one denied its Dexterity bonus to Reflex Defense against you, with a damage-dealing Force Power or a Lightsaber, you deal +${dice}d${dieSize} damage.</p><p>This does not affect Force Powers with the [Dark Side] descriptor. Multiple Sentinel Strike selections stack to a maximum of 5 dice. Improved Sentinel Strike upgrades those dice to d8s.</p>`, { talentName: 'Sentinel Strike', dice, dieSize });
  }

  static async announceSentinelsObservation(actor) {
    return postCard(actor, "Sentinel's Observation", '<p>If you have Concealment against a target, you gain a +2 circumstance bonus on attack rolls against that target.</p>', { talentName: "Sentinel's Observation" });
  }

  static async announceUnseenEyes(actor) {
    return postCard(actor, 'Unseen Eyes', '<p>Whenever you use Force Haze, allies hidden by it can reroll Perception checks and keep the better result. Hidden allies also gain +2 damage rolls against foes that are unaware of them.</p>', { talentName: 'Unseen Eyes' });
  }

  static registerHooks() {
    if (globalThis.SWSE?.__sentinelTalentActionsRegistered) return;
    globalThis.SWSE = globalThis.SWSE ?? {};
    globalThis.SWSE.__sentinelTalentActionsRegistered = true;

    Hooks.on('swse.attack-resolved', async (payload = {}) => {
      try {
        const actor = payload.attacker ?? payload.actor ?? payload.sourceActor ?? null;
        if (!actor) return;
        const hit = payload.hit === true || payload.hitResult === true || payload.success === true;
        const damage = Number(payload.damage ?? payload.damageTotal ?? payload.totalDamage ?? 0) || 0;
        if (!hit || damage <= 0) return;
        const targetActor = payload.targetActor ?? payload.target?.actor ?? payload.target ?? null;
        const targetName = payload.target?.name ?? payload.targetActor?.name ?? payload.targetName ?? targetActor?.name ?? 'target';
        const dss = getDarkSideScore(targetActor);
        const chaBonus = Math.max(1, getAbilityMod(actor, 'cha'));
        const lightsaber = looksLikeLightsaber(payload);
        const melee = looksLikeMelee(payload);
        const forcePower = looksLikeForcePower(payload);
        const forceDarkSide = payloadHasDescriptor(payload, 'dark side');
        const targetDeniedDex = payload.targetFlatFooted === true || payload.flatFooted === true || payload.targetDeniedDex === true || payload.context?.targetFlatFooted === true;

        if (hasTalent(actor, 'Dark Side Scourge') && melee && dss >= 1) {
          ui?.notifications?.info?.(`Dark Side Scourge: +${chaBonus} melee damage may apply against ${targetName}.`);
        }
        if (hasTalent(actor, 'Dark Side Bane') && forcePower && dss >= 1) {
          ui?.notifications?.info?.(`Dark Side Bane: +${chaBonus} Force Power damage may apply against ${targetName}.`);
        }
        if (hasTalent(actor, 'Master of the Great Hunt') && lightsaber && dss >= 1 && isBeastActor(targetActor)) {
          ui?.notifications?.info?.(`Master of the Great Hunt: +1 attack and +1 damage die apply against ${targetName}.`);
        }
        if (hasTalent(actor, 'Prime Targets') && lightsaber) {
          ui?.notifications?.info?.('Prime Targets: if this target has not been attacked since the end of your last turn, add +1 damage die.');
        }
        if (hasTalent(actor, 'Sentinel Strike') && (lightsaber || (forcePower && !forceDarkSide)) && targetDeniedDex) {
          const dice = Math.min(5, Math.max(1, countTalent(actor, 'Sentinel Strike')));
          const dieSize = hasTalent(actor, 'Improved Sentinel Strike') ? 8 : 6;
          ui?.notifications?.info?.(`Sentinel Strike: +${dice}d${dieSize} damage applies against the denied-Dex/flat-footed target.`);
        }
      } catch (err) {
        console.warn('[SWSE] Sentinel attack hook failed:', err);
      }
    });
  }
}

export function registerSentinelTalentActions() {
  SentinelTalentActions.registerHooks();
}
