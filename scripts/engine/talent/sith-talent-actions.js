import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
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

function sithClassLevel(actor) {
  const apprentice = getClassLevel(actor, 'sith_apprentice') || getClassLevel(actor, 'apprentice');
  const lord = getClassLevel(actor, 'sith_lord') || getClassLevel(actor, 'lord');
  return Math.max(1, Number(apprentice || 0) + Number(lord || 0));
}

function abilityMod(actor, key) {
  return Number(actor?.system?.derived?.attributes?.[key]?.mod ?? actor?.system?.abilities?.[key]?.mod ?? actor?.system?.attributes?.[key]?.mod ?? 0) || 0;
}

function baseAttackBonus(actor) {
  return Number(actor?.system?.derived?.bab?.total ?? actor?.system?.bab?.total ?? actor?.system?.baseAttackBonus ?? actor?.system?.bab ?? 0) || 0;
}

function rangedAttackBonus(actor) {
  return Number(actor?.system?.derived?.combat?.rangedAttack ?? actor?.system?.combat?.rangedAttack ?? actor?.system?.attackBonus?.ranged?.total ?? (baseAttackBonus(actor) + abilityMod(actor, 'dex'))) || 0;
}

function useTheForceTotal(actor) {
  return Number(actor?.system?.derived?.skills?.useTheForce?.total ?? actor?.system?.derived?.skillsByKey?.useTheForce?.total ?? actor?.system?.skills?.useTheForce?.total ?? actor?.system?.skills?.useTheForce?.mod ?? 0) || 0;
}

function defenseTotal(actor, key) {
  return Number(actor?.system?.derived?.defenses?.[key]?.total ?? actor?.system?.defenses?.[key]?.total ?? actor?.system?.defenses?.[key]?.value ?? actor?.system?.[`${key}Defense`] ?? 10) || 10;
}

function selectedTargetActors() {
  return Array.from(game?.user?.targets ?? []).map(token => token?.actor).filter(Boolean);
}

function forcePowers(actor) {
  return Array.from(actor?.items ?? []).filter(item => item?.type === 'force-power');
}

function isSpentPower(item) {
  return item?.system?.spent === true || item?.system?.discarded === true;
}

function isReadyPower(item) {
  return item?.system?.spent !== true && item?.system?.discarded !== true;
}

function hasDarkSideDescriptor(power) {
  const values = [
    power?.system?.darkSideOption === true ? 'dark side' : '',
    power?.system?.descriptor,
    power?.system?.descriptors,
    power?.system?.tags,
    power?.system?.keywords,
    power?.system?.discipline,
    power?.name
  ].flat().map(value => String(value ?? '').toLowerCase()).join(' ');
  return values.includes('dark side') || values.includes('dark_side') || values.includes('dark-side');
}

async function postCard(actor, title, body, flags = {}) {
  const content = `<section class="swse-chat-card swse-chat-card--sith-talent">
    <header class="swse-chat-card__header"><strong>${esc(title)}</strong><span>Sith Talent</span></header>
    <div class="swse-chat-card__body">${body}</div>
  </section>`;
  return SWSEChat.postHTML({ actor, content, flags: { swse: { sithTalent: true, talentName: title, ...flags } } });
}

async function chooseTargetActor(title, fallbackLabel = 'target') {
  const selected = selectedTargetActors();
  if (selected.length) return selected[0];
  ui?.notifications?.warn?.(`${title} requires a targeted ${fallbackLabel}.`);
  return null;
}

function htmlSelect(name, label, options = []) {
  return `<div class="form-group"><label>${esc(label)}</label><select name="${esc(name)}">${options.map(opt => `<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join('')}</select></div>`;
}

async function promptSelect(title, body, select) {
  const content = `<form class="swse-dialog swse-sith-talent-dialog"><p>${body}</p>${htmlSelect(select.name, select.label, select.options)}</form>`;
  return SWSEDialogV2.prompt({
    title,
    content,
    label: 'Continue',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      return String(new FormData(form).get(select.name) ?? '');
    }
  });
}

async function promptText(title, body, { name = 'value', label = 'Value', placeholder = '' } = {}) {
  const content = `<form class="swse-dialog swse-sith-talent-dialog"><p>${body}</p><div class="form-group"><label>${esc(label)}</label><input type="text" name="${esc(name)}" placeholder="${esc(placeholder)}" /></div></form>`;
  return SWSEDialogV2.prompt({
    title,
    content,
    label: 'Continue',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      return String(new FormData(form).get(name) ?? '').trim();
    }
  });
}

async function rollAndPost(actor, title, formula, context = {}) {
  const roll = await RollEngine.safeRoll(formula, actor?.getRollData?.() ?? {}, { actor, domain: context.domain ?? 'sith-talent' });
  await SWSEChat.postRoll({
    actor,
    roll,
    flavor: title,
    context: {
      category: 'talent',
      type: 'sith-talent',
      itemName: title,
      label: title,
      totalLabel: context.totalLabel ?? 'Total',
      ...context
    }
  });
  return roll;
}

async function applyHealing(actor, amount) {
  const healing = Math.max(0, Number(amount) || 0);
  if (healing <= 0) return 0;
  const result = await ActorEngine.applyHealing(actor, healing, 'sith-talent-healing');
  return Number(result?.applied ?? 0) || 0;
}

async function spendOneForcePoint(actor, title) {
  const spend = await ActorEngine.spendForcePoints(actor, 1);
  if (!spend?.spent) {
    ui?.notifications?.warn?.(`${title} requires spending 1 Force Point.`);
    return false;
  }
  return true;
}

async function findTalentDocumentByName(name) {
  const wanted = normalizedName(name);
  const pack = game?.packs?.get?.('foundryvtt-swse.talents');
  if (!pack) return null;
  const docs = await pack.getDocuments();
  return docs.find(doc => normalizedName(doc?.name) === wanted) ?? null;
}


function characterLevel(actor) {
  return Math.max(1, Number(getTotalLevel(actor) || actor?.system?.level || 1) || 1);
}

function darkSideDevoteeLevel(actor) {
  const direct = getClassLevel(actor, 'dark_side_devotee')
    || getClassLevel(actor, 'dark side devotee')
    || getClassLevel(actor, 'devotee');
  return Math.max(1, Number(direct || characterLevel(actor) || 1) || 1);
}

function skillTotal(actor, key) {
  const camel = String(key ?? '');
  const lower = camel.toLowerCase();
  const variants = [camel, lower, camel.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`), camel.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)];
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

function forcePointLog(actor, reason) {
  return Array.isArray(actor?.system?.dspLog) ? [...actor.system.dspLog, { round: game?.combat?.round || 0, reason, timestamp: Date.now() }] : [{ round: game?.combat?.round || 0, reason, timestamp: Date.now() }];
}

async function increaseDarkSideScore(actor, amount = 1, reason = 'Dark Side talent use') {
  const delta = Math.max(0, Number(amount) || 0);
  if (!actor || delta <= 0) return { before: 0, after: 0, delta: 0 };
  const before = Number(actor?.system?.darkSide?.value ?? actor?.system?.darkSideScore ?? 0) || 0;
  const after = before + delta;
  await ActorEngine.updateActor(actor, {
    'system.darkSide.value': after,
    'system.darkSideScore': after,
    'system.dspLog': forcePointLog(actor, reason)
  }, { meta: { guardKey: 'sith-talent-dark-side-score' } });
  return { before, after, delta };
}

function isLightSidePower(power) {
  const values = [
    power?.system?.lightSideOption === true ? 'light side' : '',
    power?.system?.descriptor,
    power?.system?.descriptors,
    power?.system?.tags,
    power?.system?.keywords,
    power?.system?.discipline,
    power?.name
  ].flat().map(value => String(value ?? '').toLowerCase()).join(' ');
  return values.includes('light side') || values.includes('light_side') || values.includes('light-side');
}

function isBeastActor(actor) {
  const values = [
    actor?.type,
    actor?.system?.npcProfile?.kind,
    actor?.system?.creatureType,
    actor?.system?.speciesType,
    actor?.system?.type,
    actor?.system?.category,
    actor?.system?.biography
  ].flat().map(value => String(value ?? '').toLowerCase()).join(' ');
  return values.includes('beast') || values.includes('mount') || values.includes('creature');
}

function isMeleeWeapon(item) {
  if (!item || item.type !== 'weapon') return false;
  const system = item.system ?? {};
  const haystack = [system.weaponType, system.weaponCategory, system.category, system.range, system.rangeProfile, system.subtype, ...(Array.isArray(system.properties) ? system.properties : []), ...(Array.isArray(system.traits) ? system.traits : [])]
    .map(value => String(value ?? '').toLowerCase())
    .join(' ');
  return haystack.includes('melee') || haystack.includes('lightsaber');
}

function meleeWeaponOptions(actor) {
  return Array.from(actor?.items ?? [])
    .filter(isMeleeWeapon)
    .map(item => ({ value: item.id, label: item.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function actorHpValue(actor) {
  return Number(actor?.system?.hp?.value ?? actor?.system?.hitPoints?.value ?? actor?.system?.attributes?.hp?.value ?? 0) || 0;
}

function actorHpMax(actor) {
  return Number(actor?.system?.hp?.max ?? actor?.system?.hitPoints?.max ?? actor?.system?.attributes?.hp?.max ?? actor?.system?.derived?.hp?.max ?? 0) || 0;
}

function conditionTrackValue(actor) {
  return Math.max(0, Number(actor?.system?.conditionTrack?.current ?? actor?.system?.condition?.track ?? 0) || 0);
}

async function markEncounterUse(actor, key, title) {
  const enc = encounterId();
  const state = actor.getFlag?.(NS, `encounterUses.${key}`) ?? {};
  if (state?.encounterId === enc && state?.used === true) {
    ui?.notifications?.warn?.(`${title} has already been used this encounter.`);
    await postCard(actor, title, `<p>${esc(title)} has already been used this encounter.</p>`, { encounterId: enc, used: true });
    return false;
  }
  await actor.setFlag?.(NS, `encounterUses.${key}`, { encounterId: enc, used: true, usedAt: Date.now() });
  return true;
}

function targetListOrManual(title) {
  const targets = selectedTargetActors();
  if (!targets.length) {
    ui?.notifications?.warn?.(`${title} needs targeted allies to apply automated actor updates. A manual card will be posted instead.`);
  }
  return targets;
}

async function lightsaberFormTalentOptions() {
  const pack = game?.packs?.get?.('foundryvtt-swse.talents');
  if (!pack) return [];
  const docs = await pack.getDocuments();
  return docs
    .filter(doc => {
      const system = doc?.system ?? {};
      const haystack = [system.tree, system.talent_tree, system.category, system.treeId, ...(Array.isArray(system.tags) ? system.tags : [])].join(' ').toLowerCase();
      return haystack.includes('lightsaber form') || haystack.includes('lightsaber_forms') || haystack.includes('lightsaber-forms');
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(doc => ({ value: doc.name, label: doc.name }));
}

export class SithTalentActions {
  static hasTalent(actor, name) { return hasTalent(actor, name); }

  static async execute(actor, kind, actionData = {}, options = {}) {
    const handlers = {
      darkHealing: () => this.promptDarkHealing(actor),
      improvedDarkHealing: () => this.announceImprovedDarkHealing(actor),
      darkHealingField: () => this.promptDarkHealingField(actor),
      darkScourge: () => this.announceDarkScourge(actor),
      darkSideAdept: () => this.promptDarkSideReroll(actor, { master: false }),
      darkSideMaster: () => this.promptDarkSideReroll(actor, { master: true }),
      forceDeception: () => this.announceForceDeception(actor),
      wickedStrike: () => this.promptWickedStrike(actor),
      affliction: () => this.promptAffliction(actor),
      drainForce: () => this.promptDrainForce(actor),
      causeMutation: () => this.announceCauseMutationDeferred(actor),
      rapidAlchemy: () => this.promptRapidAlchemy(actor),
      rapidAlchemySacrifice: () => this.promptRapidAlchemySacrifice(actor),
      sithAlchemy: () => this.announceSithAlchemyDeferred(actor),
      sithAlchemySpecialist: () => this.announceSithAlchemySpecialistDeferred(actor),
      desperateMeasures: () => this.promptDesperateMeasures(actor),
      focusTerror: () => this.promptFocusTerror(actor),
      inciteRage: () => this.promptInciteRage(actor),
      powerOfHatred: () => this.promptPowerOfHatred(actor),
      charmBeast: () => this.promptCharmBeast(actor),
      bondedMount: () => this.promptBondedMount(actor),
      entreatBeast: () => this.promptEntreatBeast(actor),
      soothingPresence: () => this.announceSoothingPresence(actor),
      wildSense: () => this.promptWildSense(actor),
      channelAggression: () => this.promptChannelAggression(actor),
      channelAnger: () => this.promptChannelAnger(actor),
      cripplingStrike: () => this.promptCripplingStrike(actor),
      embraceTheDarkSide: () => this.promptEmbraceTheDarkSide(actor),
      darkSideTalisman: () => this.announceDarkSideTalismanDeferred(actor, false),
      greaterDarkSideTalisman: () => this.announceDarkSideTalismanDeferred(actor, true),
      stolenForm: () => this.promptStolenForm(actor)
    };
    const handler = handlers[kind];
    if (handler) return handler();
    return postCard(actor, actionData?.name ?? kind, `<p>${esc(actionData?.description ?? 'No Sith talent handler is registered for this action yet.')}</p>`, { sithTalentAction: kind });
  }

  static async promptDarkHealing(actor) {
    if (!hasTalent(actor, 'Dark Healing')) return postCard(actor, 'Dark Healing', '<p>This actor does not have Dark Healing.</p>');
    const target = await chooseTargetActor('Dark Healing', 'creature');
    if (!target) return null;
    if (!(await spendOneForcePoint(actor, 'Dark Healing'))) return null;

    const attackBonus = rangedAttackBonus(actor);
    const attackRoll = await rollAndPost(actor, 'Dark Healing — Ranged Attack vs Fortitude', `1d20 + ${attackBonus}`, { totalLabel: 'Attack vs Fortitude', targetDefense: defenseTotal(target, 'fortitude') });
    const fortitude = defenseTotal(target, 'fortitude');
    const hit = Number(attackRoll?.total ?? 0) >= fortitude;
    if (!hit && !hasTalent(actor, 'Improved Dark Healing')) {
      return postCard(actor, 'Dark Healing', `<p>${esc(actor.name)} spends 1 Force Point and attacks <strong>${esc(target.name)}</strong>.</p><p><strong>Attack:</strong> ${attackRoll?.total ?? '?'} vs Fortitude ${fortitude}; miss. No effect.</p>`, { targetActorId: target.id, hit: false });
    }

    const formula = `${sithClassLevel(actor)}d6`;
    const damageRoll = await rollAndPost(actor, 'Dark Healing — Damage', formula, { totalLabel: 'Force Damage' });
    const fullDamage = Number(damageRoll?.total ?? 0) || 0;
    const damage = hit ? fullDamage : Math.floor(fullDamage / 2);
    if (damage > 0) {
      await ActorEngine.applyDamage(target, { amount: damage, type: 'force', source: 'Dark Healing', sourceActor: actor, options: { bypassThreshold: false } });
    }
    const healed = await applyHealing(actor, damage);
    return postCard(actor, hasTalent(actor, 'Improved Dark Healing') ? 'Improved Dark Healing' : 'Dark Healing', `<p>${esc(actor.name)} drains life from <strong>${esc(target.name)}</strong>.</p><p><strong>Attack:</strong> ${attackRoll?.total ?? '?'} vs Fortitude ${fortitude}; ${hit ? 'hit' : 'miss, half damage due to Improved Dark Healing'}.</p><p><strong>Damage:</strong> ${damage}. <strong>Healing applied:</strong> ${healed} HP.</p>`, { targetActorId: target.id, hit, damage, healed });
  }

  static async announceImprovedDarkHealing(actor) {
    return postCard(actor, 'Improved Dark Healing', '<p>Your Dark Healing range is 12 squares, and missed Dark Healing attacks still deal half damage and heal you by the same amount. Use the Dark Healing action to resolve the attack.</p>', { talentName: 'Improved Dark Healing' });
  }

  static async promptDarkHealingField(actor) {
    if (!hasTalent(actor, 'Dark Healing Field')) return postCard(actor, 'Dark Healing Field', '<p>This actor does not have Dark Healing Field.</p>');
    const state = actor.getFlag?.(NS, 'encounterUses.darkHealingField') ?? {};
    const enc = encounterId();
    if (state?.encounterId === enc && state?.used === true) {
      ui?.notifications?.warn?.('Dark Healing Field has already been used this encounter.');
      return postCard(actor, 'Dark Healing Field', '<p>Dark Healing Field has already been used this encounter.</p>', { used: true, encounterId: enc });
    }
    const targets = selectedTargetActors().slice(0, 3);
    if (!targets.length) {
      ui?.notifications?.warn?.('Dark Healing Field requires one to three targeted creatures.');
      return null;
    }
    if (!(await spendOneForcePoint(actor, 'Dark Healing Field'))) return null;

    const utf = useTheForceTotal(actor);
    const sithLevel = sithClassLevel(actor);
    const checkRoll = await RollEngine.safeRoll(`1d20 + ${utf}`, actor?.getRollData?.() ?? {}, { actor, domain: 'sith-talent.dark-healing-field' });
    const checkTotal = Number(checkRoll?.total ?? 0) || 0;
    const rows = [];
    let totalDamage = 0;
    for (const target of targets) {
      const damageRoll = await RollEngine.safeRoll(`${sithLevel}d6`, actor?.getRollData?.() ?? {}, { actor, domain: 'sith-talent.dark-healing-field.damage' });
      const fortitude = defenseTotal(target, 'fortitude');
      const hit = checkTotal >= fortitude;
      const damage = hit ? Number(damageRoll?.total ?? 0) : Math.floor(Number(damageRoll?.total ?? 0) / 2);
      totalDamage += damage;
      if (damage > 0) await ActorEngine.applyDamage(target, { amount: damage, type: 'force', source: 'Dark Healing Field', sourceActor: actor, options: { bypassThreshold: false } });
      rows.push(`<li><strong>${esc(target.name)}</strong>: UTF ${checkTotal || '?'} vs Fortitude ${fortitude}; ${hit ? 'hit' : 'miss, half damage'}; ${damage} Force damage.</li>`);
    }
    await SWSEChat.postRoll({
      actor,
      roll: checkRoll,
      flavor: 'Dark Healing Field — Use the Force',
      context: { category: 'talent', type: 'sith-talent', itemName: 'Dark Healing Field', totalLabel: 'Use the Force' }
    });
    const healed = await applyHealing(actor, Math.floor(totalDamage / 2));
    await actor.setFlag?.(NS, 'encounterUses.darkHealingField', { encounterId: enc, used: true, targetCount: targets.length, totalDamage, healed, usedAt: Date.now() });
    return postCard(actor, 'Dark Healing Field', `<p>${esc(actor.name)} drains life energy from up to three creatures.</p><ul>${rows.join('')}</ul><p><strong>Total damage:</strong> ${totalDamage}. <strong>Healing applied:</strong> ${healed} HP.</p>`, { targetCount: targets.length, totalDamage, healed });
  }

  static async announceDarkScourge(actor) {
    return postCard(actor, 'Dark Scourge', '<p>Against Jedi characters, you gain a +1 Dark Side bonus on attack rolls. This is conditional and is not applied as an always-on attack bonus.</p>', { talentName: 'Dark Scourge', conditionalBonus: 1 });
  }

  static async promptDarkSideReroll(actor, { master = false } = {}) {
    const darkPowers = forcePowers(actor).filter(hasDarkSideDescriptor);
    const selected = darkPowers.length ? await promptSelect(master ? 'Dark Side Master' : 'Dark Side Adept', 'Choose the [Dark Side] Force Power whose Use the Force activation check you are rerolling.', { name: 'powerId', label: 'Dark Side Force Power', options: darkPowers.map(power => ({ value: power.id, label: power.name })) }) : null;
    const power = darkPowers.find(p => p.id === selected) ?? null;
    const utf = useTheForceTotal(actor);
    const first = await RollEngine.safeRoll(`1d20 + ${utf}`, actor?.getRollData?.() ?? {}, { actor, domain: 'sith-talent.dark-side-reroll' });
    const second = await RollEngine.safeRoll(`1d20 + ${utf}`, actor?.getRollData?.() ?? {}, { actor, domain: 'sith-talent.dark-side-reroll' });
    let kept = second;
    let spent = false;
    if (master && Number(first?.total ?? 0) > Number(second?.total ?? 0)) {
      const spend = await SWSEDialogV2.confirm?.({ title: 'Dark Side Master', content: `<p>Spend 1 Force Point to keep the better result (${first.total}) instead of the reroll (${second.total})?</p>` });
      if (spend && await spendOneForcePoint(actor, 'Dark Side Master')) {
        kept = first;
        spent = true;
      }
    }
    return postCard(actor, master ? 'Dark Side Master' : 'Dark Side Adept', `<p>${esc(actor.name)} rerolls a Use the Force check made to activate ${power ? `<strong>${esc(power.name)}</strong>` : 'a [Dark Side] Force Power'}.</p><p><strong>Original:</strong> ${first?.total ?? '?'}. <strong>Reroll:</strong> ${second?.total ?? '?'}. <strong>Kept:</strong> ${kept?.total ?? '?'}${master && spent ? ' after spending 1 Force Point' : ''}.</p><p>${master ? 'Dark Side Master may spend a Force Point to keep the better result.' : 'Dark Side Adept must keep the reroll, even if it is worse.'}</p>`, { powerId: power?.id ?? null, original: first?.total ?? null, reroll: second?.total ?? null, kept: kept?.total ?? null, forcePointSpent: spent });
  }

  static async announceForceDeception(actor) {
    return postCard(actor, 'Force Deception', '<p>You may use your Use the Force modifier instead of Deception, and you are considered Trained in Deception for this talent. Derived skills now mark Deception as a Use the Force substitution when this talent is present.</p>', { talentName: 'Force Deception' });
  }

  static async promptWickedStrike(actor) {
    if (!hasTalent(actor, 'Wicked Strike')) return postCard(actor, 'Wicked Strike', '<p>This actor does not have Wicked Strike.</p>');
    const target = await chooseTargetActor('Wicked Strike', 'critical-hit target');
    if (!target) return null;
    const confirmed = await SWSEDialogV2.confirm?.({ title: 'Wicked Strike', content: `<p>Confirm that ${esc(actor.name)} scored a critical hit with a lightsaber against ${esc(target.name)} and will spend 1 Force Point to move the target -2 steps on the Condition Track.</p>` });
    if (!confirmed) return null;
    if (!(await spendOneForcePoint(actor, 'Wicked Strike'))) return null;
    const current = Math.max(0, Number(target?.system?.conditionTrack?.current ?? 0) || 0);
    const next = Math.min(5, current + 2);
    await ActorEngine.updateActor(target, { 'system.conditionTrack.current': next }, { source: 'wicked-strike' });
    return postCard(actor, 'Wicked Strike', `<p>${esc(actor.name)} spends 1 Force Point after a lightsaber critical hit against <strong>${esc(target.name)}</strong>.</p><p><strong>Condition Track:</strong> ${current} → ${next}.</p>`, { targetActorId: target.id, previousCondition: current, newCondition: next });
  }

  static async promptAffliction(actor) {
    const target = await chooseTargetActor('Affliction', 'Force Power target');
    if (!target) return null;
    const afflictions = target.getFlag?.(NS, 'pendingAfflictions') ?? [];
    const next = Array.isArray(afflictions) ? [...afflictions] : [];
    next.push({ id: `${actor.id}-${Date.now()}`, sourceActorId: actor.id, sourceActorName: actor.name, encounterId: encounterId(), createdAt: Date.now(), triggered: false });
    await target.setFlag?.(NS, 'pendingAfflictions', next);
    return postCard(actor, 'Affliction', `<p>${esc(actor.name)} marks <strong>${esc(target.name)}</strong> with Affliction after damaging a single opponent with a Force Power.</p><p>At the beginning of the target's next turn, before actions, the target takes 2d6 Force damage.</p>`, { targetActorId: target.id });
  }

  static async promptDrainForce(actor) {
    if (!hasTalent(actor, 'Drain Force')) return postCard(actor, 'Drain Force', '<p>This actor does not have Drain Force.</p>');
    const state = actor.getFlag?.(NS, 'encounterUses.drainForce') ?? {};
    const enc = encounterId();
    if (state?.encounterId === enc && state?.used === true) {
      ui?.notifications?.warn?.('Drain Force has already been used this encounter.');
      return postCard(actor, 'Drain Force', '<p>Drain Force has already been used this encounter.</p>', { used: true, encounterId: enc });
    }
    const target = await chooseTargetActor('Drain Force', 'Force-sensitive opponent');
    if (!target) return null;
    const spent = forcePowers(actor).filter(isSpentPower);
    if (!spent.length) {
      return postCard(actor, 'Drain Force', '<p>Drain Force was triggered, but this actor has no spent Force Powers to regain. The target still loses one Force Point if the GM confirms the trigger.</p>', { targetActorId: target.id });
    }
    const powerId = await promptSelect('Drain Force', 'Choose one spent Force Power to regain. The target loses one Force Point.', { name: 'powerId', label: 'Regain Force Power', options: spent.map(power => ({ value: power.id, label: power.name })) });
    if (!powerId) return null;
    const power = spent.find(p => p.id === powerId);
    const targetFp = Number(target?.system?.forcePoints?.value ?? 0) || 0;
    await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: power.id, 'system.spent': false, 'system.discarded': false, 'flags.swse.lastRecoverySource': 'drain-force' }], { source: 'drain-force', render: false });
    await ActorEngine.updateActor(target, { 'system.forcePoints.value': Math.max(0, targetFp - 1) }, { source: 'drain-force' });
    await actor.setFlag?.(NS, 'encounterUses.drainForce', { encounterId: enc, used: true, recoveredPowerId: power.id, recoveredPowerName: power.name, targetActorId: target.id, usedAt: Date.now() });
    return postCard(actor, 'Drain Force', `<p>${esc(actor.name)} reacts after damaging Force-sensitive <strong>${esc(target.name)}</strong>.</p><p><strong>Recovered Force Power:</strong> ${esc(power.name)}.</p><p><strong>${esc(target.name)} Force Points:</strong> ${targetFp} → ${Math.max(0, targetFp - 1)}.</p>`, { targetActorId: target.id, recoveredPowerId: power.id });
  }

  static async announceCauseMutationDeferred(actor) {
    return postCard(actor, 'Cause Mutation', '<p>Cause Mutation is data-cleaned and surfaced as a manual Sith Alchemy workflow. Full mutation/template application is deferred until the system has dedicated Sith Alchemy transformation UI. Record the target creature, selected template, modified CL, medical lab access, required days, and Force Point spend with the GM.</p>', { talentName: 'Cause Mutation', implementationDeferred: true, requiresDedicatedUi: true });
  }

  static async promptRapidAlchemy(actor) {
    if (!hasTalent(actor, 'Rapid Alchemy')) return postCard(actor, 'Rapid Alchemy', '<p>This actor does not have Rapid Alchemy.</p>');
    const options = meleeWeaponOptions(actor);
    if (!options.length) {
      return postCard(actor, 'Rapid Alchemy', '<p>No melee weapons were found on this actor. Add or equip the melee weapon, then use this action again. The GM can also adjudicate the +2 Equipment attack bonus manually for the encounter.</p>', { manual: true });
    }
    const weaponId = await promptSelect('Rapid Alchemy', 'Choose the melee weapon you are alchemically altering for the remainder of the encounter.', { name: 'weaponId', label: 'Melee Weapon', options });
    if (!weaponId) return null;
    const weapon = actor.items.get?.(weaponId) ?? Array.from(actor.items ?? []).find(item => item.id === weaponId);
    const enc = encounterId();
    await actor.setFlag?.(NS, 'rapidAlchemy', { encounterId: enc, weaponId, weaponName: weapon?.name ?? 'Selected weapon', attackBonus: 2, damageBonus: 5, active: true, sacrificePending: false, sacrificed: false, createdAt: Date.now() });
    return postCard(actor, 'Rapid Alchemy', `<p>${esc(actor.name)} alters <strong>${esc(weapon?.name ?? 'a melee weapon')}</strong>.</p><p>For the remainder of the encounter, attacks with that weapon gain a <strong>+2 Equipment bonus</strong>. Use <strong>Rapid Alchemy: Sacrifice Bonus</strong> before a damage roll to trade that attack bonus for <strong>+5 Equipment bonus</strong> on one damage roll with the same weapon.</p>`, { weaponId, weaponName: weapon?.name ?? null, attackBonus: 2 });
  }

  static async promptRapidAlchemySacrifice(actor) {
    const state = actor.getFlag?.(NS, 'rapidAlchemy') ?? null;
    if (!state?.active || state?.encounterId !== encounterId()) {
      return postCard(actor, 'Rapid Alchemy: Sacrifice Bonus', '<p>No active Rapid Alchemy weapon is recorded for this encounter.</p>', { active: false });
    }
    if (state?.sacrificed === true || state?.sacrificePending === true) {
      return postCard(actor, 'Rapid Alchemy: Sacrifice Bonus', '<p>The Rapid Alchemy attack bonus has already been sacrificed or is already pending for the next damage roll.</p>', { alreadySacrificed: true });
    }
    await actor.setFlag?.(NS, 'rapidAlchemy', { ...state, active: false, sacrificePending: true, sacrificed: true, sacrificedAt: Date.now() });
    return postCard(actor, 'Rapid Alchemy: Sacrifice Bonus', `<p>${esc(actor.name)} sacrifices Rapid Alchemy's +2 attack bonus on <strong>${esc(state.weaponName ?? 'the altered weapon')}</strong>.</p><p>The next damage roll made with that weapon gains a <strong>+5 Equipment bonus</strong>.</p>`, { weaponId: state.weaponId, damageBonus: 5 });
  }

  static async announceSithAlchemyDeferred(actor) {
    let dsp = null;
    const record = await SWSEDialogV2.confirm?.({
      title: 'Sith Alchemy',
      content: '<p>Sith Alchemy crafting automation is deferred until the item/transformation UI exists.</p><p>If the character has just completed an Alchemical Transformation, record the required <strong>+1 Dark Side Score</strong> on the character sheet now?</p>'
    });
    if (record) dsp = await increaseDarkSideScore(actor, 1, 'Sith Alchemy transformation');
    return postCard(actor, 'Sith Alchemy', `<p>Sith Alchemy description and prerequisites are cleaned up, but full Sith Alchemy crafting/transformation automation is intentionally deferred because it needs dedicated item, talisman, armor, weapon, mutation, and trait UI.</p><p>Resolve Sith Amulet, Sith Armor, Sith Talisman, and Sith Weapon creation with the GM until that UI exists.</p>${dsp ? `<p><strong>Dark Side Score:</strong> ${dsp.before} → ${dsp.after}.</p>` : '<p>No Dark Side Score increase was recorded from this card.</p>'}`, { talentName: 'Sith Alchemy', implementationDeferred: true, requiresDedicatedUi: true, darkSideScoreDelta: dsp?.delta ?? 0 });
  }

  static async announceSithAlchemySpecialistDeferred(actor) {
    let dsp = null;
    const record = await SWSEDialogV2.confirm?.({
      title: 'Sith Alchemy Specialist',
      content: '<p>Sith Alchemy Specialist trait automation is deferred until the item/trait UI exists.</p><p>If the character has just applied a Sith Alchemy Specialist trait, record the required <strong>+1 Dark Side Score</strong> on the character sheet now?</p>'
    });
    if (record) dsp = await increaseDarkSideScore(actor, 1, 'Sith Alchemy Specialist trait');
    return postCard(actor, 'Sith Alchemy Specialist', `<p>Sith Alchemy Specialist is data-cleaned and surfaced as a manual crafting card. Full trait application is deferred until the Sith Alchemy item/trait UI exists.</p><p>Record the selected object, selected trait, 1 hour work, and Force Point spend with the GM.</p>${dsp ? `<p><strong>Dark Side Score:</strong> ${dsp.before} → ${dsp.after}.</p>` : '<p>No Dark Side Score increase was recorded from this card.</p>'}`, { talentName: 'Sith Alchemy Specialist', implementationDeferred: true, requiresDedicatedUi: true, darkSideScoreDelta: dsp?.delta ?? 0 });
  }

  static async promptCharmBeast(actor) {
    if (!hasTalent(actor, 'Charm Beast')) return postCard(actor, 'Charm Beast', '<p>This actor does not have Charm Beast.</p>');
    const target = selectedTargetActors()[0] ?? null;
    const utf = useTheForceTotal(actor);
    const roll = await rollAndPost(actor, 'Charm Beast — Use the Force as Persuasion', `1d20 + ${utf}`, { totalLabel: 'Use the Force' });
    const targetNote = target ? `<p><strong>Target:</strong> ${esc(target.name)}${isBeastActor(target) ? '' : ' <em>(GM: verify this is an eligible undomesticated beast with Int 2 or less)</em>'}</p>` : '<p>No target selected; GM/player must verify the eligible beast and attitude context.</p>';
    return postCard(actor, 'Charm Beast', `${targetNote}<p>${esc(actor.name)} may use Use the Force in place of Persuasion to change the attitude of an eligible undomesticated creature, and does not take the normal -5 language penalty.</p><p><strong>Use the Force result:</strong> ${roll?.total ?? '?'}</p>`, { targetActorId: target?.id ?? null, useTheForceTotal: roll?.total ?? null });
  }

  static async promptBondedMount(actor) {
    if (!hasTalent(actor, 'Bonded Mount')) return postCard(actor, 'Bonded Mount', '<p>This actor does not have Bonded Mount.</p>');
    const target = await chooseTargetActor('Bonded Mount', 'domesticated beast mount');
    if (!target) return null;
    if (!(await spendOneForcePoint(actor, 'Bonded Mount'))) return null;
    const key = `bondedMounts.${target.id}`;
    const record = { mountActorId: target.id, mountName: target.name, bondedAt: Date.now(), sourceActorId: actor.id, sourceActorName: actor.name };
    await actor.setFlag?.(NS, key, record);
    try { await target.setFlag?.(NS, 'bondedMount', { riderActorId: actor.id, riderName: actor.name, bondedAt: record.bondedAt }); } catch (err) { console.warn('[SWSE] Bonded Mount target flag failed:', err); }
    return postCard(actor, 'Bonded Mount', `<p>${esc(actor.name)} spends 1 Force Point as a Full-Round Action to bond <strong>${esc(target.name)}</strong> as a mount.</p><p>Recorded the bond on the rider${isBeastActor(target) ? '' : '; GM should verify the target is a domesticated Friendly/Helpful beast'}.</p><p>While riding, the mount uses the rider's Reflex and Will Defenses, and the rider benefits from the mount's special senses. Those mounted-state bonuses remain GM/player adjudicated until the mount/rider UI owns mounted state.</p>`, { targetActorId: target.id, forcePointSpent: true });
  }

  static async promptEntreatBeast(actor) {
    if (!hasTalent(actor, 'Entreat Beast')) return postCard(actor, 'Entreat Beast', '<p>This actor does not have Entreat Beast.</p>');
    const target = await chooseTargetActor('Entreat Beast', 'small beast');
    if (!target) return null;
    const task = await promptSelect('Entreat Beast', 'Choose the minor task requested of the beast.', {
      name: 'task',
      label: 'Task',
      options: [
        { value: 'Deliver an Object', label: 'Deliver an Object' },
        { value: 'Retrieve an Object', label: 'Retrieve an Object' },
        { value: 'Manipulate a Small Object', label: 'Manipulate a Small Object' }
      ]
    });
    if (!task) return null;
    const utf = useTheForceTotal(actor);
    const will = defenseTotal(target, 'will');
    const roll = await rollAndPost(actor, 'Entreat Beast — Use the Force vs Will', `1d20 + ${utf}`, { totalLabel: 'Use the Force', targetDefense: will });
    const success = Number(roll?.total ?? 0) >= will;
    return postCard(actor, 'Entreat Beast', `<p>${esc(actor.name)} entreats <strong>${esc(target.name)}</strong> to perform: <strong>${esc(task)}</strong>.</p><p><strong>Use the Force:</strong> ${roll?.total ?? '?'} vs Will ${will}; ${success ? 'success' : 'failure'}.</p><p>Range, line of sight, size, attitude, and the exact task outcome remain GM/player adjudicated.</p>`, { targetActorId: target.id, task, success, useTheForceTotal: roll?.total ?? null });
  }

  static async announceSoothingPresence(actor) {
    if (!hasTalent(actor, 'Soothing Presence')) return postCard(actor, 'Soothing Presence', '<p>This actor does not have Soothing Presence.</p>');
    const target = selectedTargetActors()[0] ?? null;
    return postCard(actor, 'Soothing Presence', `<p>Whenever ${esc(actor.name)} encounters a Beast with an Unfriendly Attitude, that Beast automatically shifts to Indifferent with no Skill Check required.</p>${target ? `<p><strong>Target noted:</strong> ${esc(target.name)}.</p>` : '<p>No target selected; apply this to eligible encountered beasts.</p>'}`, { targetActorId: target?.id ?? null });
  }

  static async promptWildSense(actor) {
    if (!hasTalent(actor, 'Wild Sense')) return postCard(actor, 'Wild Sense', '<p>This actor does not have Wild Sense.</p>');
    const target = await chooseTargetActor('Wild Sense', 'beast');
    if (!target) return null;
    const perception = skillTotal(target, 'perception');
    const roll = await RollEngine.safeRoll(`1d20 + ${perception}`, target?.getRollData?.() ?? {}, { actor: target, domain: 'sith-talent.wild-sense.perception' });
    await SWSEChat.postRoll({
      actor: target,
      roll,
      flavor: 'Wild Sense — Beast Perception',
      context: { category: 'talent', type: 'beastwarden-talent', itemName: 'Wild Sense', totalLabel: 'Beast Perception' }
    });
    await actor.setFlag?.(NS, 'wildSense', { targetActorId: target.id, targetName: target.name, perceptionTotal: roll?.total ?? null, round: game?.combat?.round ?? null, turn: game?.combat?.turn ?? null, expires: 'end-of-turn', usedAt: Date.now() });
    return postCard(actor, 'Wild Sense', `<p>${esc(actor.name)} touches the mind of <strong>${esc(target.name)}</strong>.</p><p><strong>${esc(target.name)} Perception:</strong> ${roll?.total ?? '?'}</p><p>${esc(actor.name)} perceives what the beast perceives and is considered to have line of sight to anything the beast has line of sight to until the end of this turn.</p><p>Beast attitude, 12-square range, and line of sight remain GM/player adjudicated.</p>`, { targetActorId: target.id, perceptionTotal: roll?.total ?? null });
  }

  static async promptChannelAggression(actor) {
    if (!hasTalent(actor, 'Channel Aggression')) return postCard(actor, 'Channel Aggression', '<p>This actor does not have Channel Aggression.</p>');
    const target = await chooseTargetActor('Channel Aggression', 'flanked or no-Dex target');
    if (!target) return null;
    if (!(await spendOneForcePoint(actor, 'Channel Aggression'))) return null;
    const dice = Math.min(10, Math.max(1, darkSideDevoteeLevel(actor)));
    const roll = await RollEngine.safeRoll(`${dice}d6`, actor?.getRollData?.() ?? {}, { actor, domain: 'sith-talent.channel-aggression' });
    const damage = Number(roll?.total ?? 0) || 0;
    if (damage > 0) await ActorEngine.applyDamage(target, { amount: damage, type: 'force', source: 'Channel Aggression', sourceActor: actor, options: { bypassThreshold: false } });
    await SWSEChat.postRoll({ actor, roll, flavor: 'Channel Aggression — Bonus Damage', context: { category: 'talent', type: 'dark-side-devotee-talent', itemName: 'Channel Aggression', totalLabel: 'Bonus Damage' } });
    return postCard(actor, 'Channel Aggression', `<p>${esc(actor.name)} spends 1 Force Point as a Free Action after a qualifying successful attack against <strong>${esc(target.name)}</strong>.</p><p><strong>Bonus damage:</strong> ${damage} (${dice}d6), applied as Force damage.</p><p>GM/player must verify the target was flanked or denied Dexterity bonus to Reflex Defense.</p>`, { targetActorId: target.id, damage, dice, forcePointSpent: true });
  }

  static async promptChannelAnger(actor) {
    if (!hasTalent(actor, 'Channel Anger')) return postCard(actor, 'Channel Anger', '<p>This actor does not have Channel Anger.</p>');
    const existing = actor.getFlag?.(NS, 'channelAnger') ?? null;
    if (existing?.active === true) return postCard(actor, 'Channel Anger', '<p>Channel Anger is already active on this actor.</p>', { alreadyActive: true });
    if (!(await spendOneForcePoint(actor, 'Channel Anger'))) return null;
    const duration = Math.max(1, 5 + abilityMod(actor, 'con'));
    const round = Number(game?.combat?.round ?? 0) || 0;
    const state = { active: true, startedRound: round || null, durationRounds: duration, expiresAfterRound: round ? round + duration : null, meleeAttackBonus: 2, meleeDamageBonus: 2, conditionPenaltyPending: true, createdAt: Date.now() };
    await actor.setFlag?.(NS, 'channelAnger', state);
    return postCard(actor, 'Channel Anger', `<p>${esc(actor.name)} spends 1 Force Point as a Swift Action and enters a rage.</p><p><strong>Effect:</strong> +2 Rage bonus on melee attack rolls and melee damage rolls for ${duration} rounds.</p><p><strong>Restriction:</strong> cannot use Skills requiring patience and concentration, such as Mechanics, Stealth, or Use the Force.</p><p><strong>End:</strong> moves -1 step on the Condition Track when the rage ends${round ? ` after round ${round + duration}` : '; track duration manually outside combat'}.</p>`, { durationRounds: duration, meleeAttackBonus: 2, meleeDamageBonus: 2, forcePointSpent: true });
  }

  static async endChannelAnger(actor) {
    const state = actor.getFlag?.(NS, 'channelAnger') ?? null;
    if (!state?.active) return null;
    const before = conditionTrackValue(actor);
    const after = Math.min(5, before + 1);
    await ActorEngine.updateActor(actor, { 'system.conditionTrack.current': after }, { meta: { guardKey: 'channel-anger-end' } });
    await actor.unsetFlag?.(NS, 'channelAnger');
    return postCard(actor, 'Channel Anger Ends', `<p>${esc(actor.name)}'s rage ends.</p><p><strong>Condition Track:</strong> ${before} → ${after}.</p>`, { beforeCondition: before, afterCondition: after });
  }

  static async promptCripplingStrike(actor) {
    if (!hasTalent(actor, 'Crippling Strike')) return postCard(actor, 'Crippling Strike', '<p>This actor does not have Crippling Strike.</p>');
    const target = await chooseTargetActor('Crippling Strike', 'critical-hit target');
    if (!target) return null;
    if (!(await spendOneForcePoint(actor, 'Crippling Strike'))) return null;
    const hpMax = actorHpMax(target);
    const currentSpeed = Number(target?.system?.derived?.speed?.walk ?? target?.system?.derived?.speed?.total ?? target?.system?.speed?.value ?? target?.system?.speed ?? 0) || 0;
    const crippledSpeed = currentSpeed > 0 ? Math.max(1, Math.floor(currentSpeed / 2)) : null;
    await target.setFlag?.(NS, 'cripplingStrike', { sourceActorId: actor.id, sourceActorName: actor.name, originalSpeed: currentSpeed || null, crippledSpeed, maxHpWhenCrippled: hpMax || null, appliedAt: Date.now(), until: 'fully-healed' });
    return postCard(actor, 'Crippling Strike', `<p>${esc(actor.name)} spends 1 Force Point after a critical hit to cripple <strong>${esc(target.name)}</strong>.</p><p>${crippledSpeed ? `<strong>Speed:</strong> ${currentSpeed} → ${crippledSpeed} until fully healed.` : 'The target is flagged as crippled; adjust speed manually if the actor has no numeric speed path.'}</p><p>GM/player must verify this was triggered by a critical hit.</p>`, { targetActorId: target.id, forcePointSpent: true, originalSpeed: currentSpeed || null, crippledSpeed });
  }

  static async promptEmbraceTheDarkSide(actor) {
    if (!hasTalent(actor, 'Embrace the Dark Side') && !hasTalent(actor, 'Embrace Dark Side')) return postCard(actor, 'Embrace the Dark Side', '<p>This actor does not have Embrace the Dark Side.</p>');
    const darkPowers = forcePowers(actor).filter(hasDarkSideDescriptor);
    const lightPowers = forcePowers(actor).filter(isLightSidePower);
    const selected = darkPowers.length ? await promptSelect('Embrace the Dark Side', 'Choose the [Dark Side] Force Power whose Use the Force activation check you are rerolling.', { name: 'powerId', label: 'Dark Side Force Power', options: darkPowers.map(power => ({ value: power.id, label: power.name })) }) : null;
    const power = darkPowers.find(p => p.id === selected) ?? null;
    const utf = useTheForceTotal(actor);
    const reroll = await RollEngine.safeRoll(`1d20 + ${utf}`, actor?.getRollData?.() ?? {}, { actor, domain: 'sith-talent.embrace-the-dark-side' });
    await SWSEChat.postRoll({ actor, roll: reroll, flavor: 'Embrace the Dark Side — Mandatory Reroll Result', context: { category: 'talent', type: 'dark-side-devotee-talent', itemName: 'Embrace the Dark Side', totalLabel: 'Reroll Result' } });
    return postCard(actor, 'Embrace the Dark Side', `<p>${esc(actor.name)} rerolls a Use the Force check made to activate ${power ? `<strong>${esc(power.name)}</strong>` : 'a [Dark Side] Force Power'} and must keep the reroll result.</p><p><strong>Reroll:</strong> ${reroll?.total ?? '?'}</p><p>${lightPowers.length ? `This actor has ${lightPowers.length} [Light Side] Force Power${lightPowers.length === 1 ? '' : 's'}; the Force executor blocks [Light Side] activation while this talent is present.` : 'This actor can no longer use Force Powers with the [Light Side] descriptor.'}</p>`, { powerId: power?.id ?? null, rerollTotal: reroll?.total ?? null, lightSideBlocked: true });
  }

  static async announceDarkSideTalismanDeferred(actor, greater = false) {
    const title = greater ? 'Greater Dark Side Talisman' : 'Dark Side Talisman';
    if (!hasTalent(actor, title)) return postCard(actor, title, `<p>This actor does not have ${esc(title)}.</p>`);
    return postCard(actor, title, `<p>${esc(title)} is data-cleaned and surfaced as a manual talisman card only.</p><p>Full talisman creation/equipping/defense automation is intentionally deferred until the talisman/item UI exists. Do not apply an always-on defense bonus from this action.</p><p>This talent text does not state that creating this talisman increases Dark Side Score; no Dark Side Score mutation was applied.</p>`, { implementationDeferred: true, requiresDedicatedUi: true, greater });
  }

  static async promptStolenForm(actor) {
    if (!hasTalent(actor, 'Stolen Form')) return postCard(actor, 'Stolen Form', '<p>This actor does not have Stolen Form.</p>');
    const options = await lightsaberFormTalentOptions();
    if (!options.length) {
      const manual = await promptText('Stolen Form', 'No Lightsaber Forms talents were found in the talents compendium. Enter the chosen Lightsaber Forms talent to record it on the actor.', { label: 'Lightsaber Form Talent', placeholder: 'Ataru, Makashi, Soresu...' });
      if (!manual) return null;
      await actor.setFlag?.(NS, `stolenForm.${slug(manual)}`, { talentName: manual, recordedAt: Date.now(), manual: true });
      return postCard(actor, 'Stolen Form', `<p>Recorded <strong>${esc(manual)}</strong> as a Stolen Form selection. Add the granted talent manually if it is not present on the actor.</p>`, { talentName: manual, manual: true });
    }
    const selected = await promptSelect('Stolen Form', 'Choose one Lightsaber Forms talent to gain through Stolen Form. You must still meet that form talent\'s prerequisites.', { name: 'talentName', label: 'Lightsaber Forms Talent', options });
    if (!selected) return null;
    if (hasTalent(actor, selected)) {
      await actor.setFlag?.(NS, `stolenForm.${slug(selected)}`, { talentName: selected, alreadyOwned: true, recordedAt: Date.now() });
      return postCard(actor, 'Stolen Form', `<p>${esc(actor.name)} already has <strong>${esc(selected)}</strong>. Recorded it as a Stolen Form selection for prerequisite/benefit tracking.</p>`, { talentName: selected, alreadyOwned: true });
    }
    const doc = await findTalentDocumentByName(selected);
    if (!doc) {
      await actor.setFlag?.(NS, `stolenForm.${slug(selected)}`, { talentName: selected, manual: true, recordedAt: Date.now() });
      return postCard(actor, 'Stolen Form', `<p>Recorded <strong>${esc(selected)}</strong> as a Stolen Form selection, but the talent document could not be loaded. Add it manually if needed.</p>`, { talentName: selected, manual: true });
    }
    const data = doc.toObject();
    data.flags = foundry.utils.mergeObject(data.flags ?? {}, { swse: { grantedBy: 'Stolen Form', stolenFormSelection: true, originalTalentId: doc.id, selectedAt: Date.now() } }, { inplace: false, recursive: true });
    data.system = foundry.utils.mergeObject(data.system ?? {}, { grantedBy: 'Stolen Form', sourceTalent: 'Stolen Form' }, { inplace: false, recursive: true });
    const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', [data], { source: 'stolen-form' });
    await actor.setFlag?.(NS, `stolenForm.${slug(selected)}`, { talentName: selected, itemId: created?.[0]?.id ?? null, recordedAt: Date.now() });
    return postCard(actor, 'Stolen Form', `<p>${esc(actor.name)} gains <strong>${esc(selected)}</strong> from the Lightsaber Forms Talent Tree via Stolen Form.</p><p>The granted talent was added to the actor and flagged as granted by Stolen Form.</p>`, { talentName: selected, grantedItemId: created?.[0]?.id ?? null });
  }

  static async promptDesperateMeasures(actor) {
    if (!hasTalent(actor, 'Desperate Measures')) return postCard(actor, 'Desperate Measures', '<p>This actor does not have Desperate Measures.</p>');
    if (!(await markEncounterUse(actor, 'desperateMeasures', 'Desperate Measures'))) return null;
    const targets = targetListOrManual('Desperate Measures');
    const rows = targets.map(target => `<li><strong>${esc(target.name)}</strong>: may make an immediate attack at a -5 penalty.</li>`).join('');
    return postCard(actor, 'Desperate Measures', `<p>${esc(actor.name)} instills desperation in allies within 12 squares and line of sight.</p>${rows ? `<ul>${rows}</ul>` : '<p>No allies were targeted; apply the immediate -5 attack option manually to eligible allies.</p>'}<p>Any range, line of sight, ally status, and attack legality remain GM/player adjudicated.</p>`, { targetActorIds: targets.map(t => t.id), oncePerEncounter: true });
  }

  static async promptFocusTerror(actor) {
    if (!hasTalent(actor, 'Focus Terror')) return postCard(actor, 'Focus Terror', '<p>This actor does not have Focus Terror.</p>');
    if (!(await markEncounterUse(actor, 'focusTerror', 'Focus Terror'))) return null;
    const targets = targetListOrManual('Focus Terror');
    const duration = characterLevel(actor);
    const enc = encounterId();
    const round = Number(game?.combat?.round ?? 0) || 0;
    const rows = [];
    for (const target of targets) {
      const before = conditionTrackValue(target);
      const after = Math.max(0, before - 2);
      await ActorEngine.updateActor(target, { 'system.conditionTrack.current': after }, { source: 'focus-terror' });
      await target.setFlag?.(NS, 'sithCommander.focusTerror', { encounterId: enc, sourceActorId: actor.id, sourceActorName: actor.name, attackPenalty: -2, skillPenalty: -2, startedRound: round, durationRounds: duration, expiresAfterRound: round + duration, createdAt: Date.now() });
      rows.push(`<li><strong>${esc(target.name)}</strong>: Condition Track ${before} → ${after}; -2 attack rolls and Skill Checks for ${duration} rounds.</li>`);
    }
    return postCard(actor, 'Focus Terror', `<p>${esc(actor.name)} harnesses allied fear.</p>${rows.length ? `<ul>${rows.join('')}</ul>` : '<p>No allies were targeted; apply +2 condition-track improvement and -2 attack/skill penalties manually to eligible allies.</p>'}<p>Range and line of sight remain GM/player adjudicated.</p>`, { targetActorIds: targets.map(t => t.id), durationRounds: duration });
  }

  static async promptInciteRage(actor) {
    if (!hasTalent(actor, 'Incite Rage')) return postCard(actor, 'Incite Rage', '<p>This actor does not have Incite Rage.</p>');
    if (!(await markEncounterUse(actor, 'inciteRage', 'Incite Rage'))) return null;
    const targets = targetListOrManual('Incite Rage');
    const enc = encounterId();
    const rows = [];
    for (const target of targets) {
      await target.setFlag?.(NS, 'sithCommander.inciteRage', { encounterId: enc, sourceActorId: actor.id, sourceActorName: actor.name, attackBonus: 1, reflexPenalty: -2, createdAt: Date.now() });
      rows.push(`<li><strong>${esc(target.name)}</strong>: +1 rage bonus on attack rolls and -2 Reflex Defense until the encounter ends or ${esc(actor.name)} is unconscious/killed.</li>`);
    }
    return postCard(actor, 'Incite Rage', `<p>${esc(actor.name)} channels anger and hatred into allies.</p>${rows.length ? `<ul>${rows.join('')}</ul>` : '<p>No allies were targeted; apply +1 attack / -2 Reflex manually to eligible allies.</p>'}<p>Range, line of sight, ally status, and source incapacitation remain GM/player adjudicated where the system cannot infer them.</p>`, { targetActorIds: targets.map(t => t.id) });
  }

  static async promptPowerOfHatred(actor) {
    if (!hasTalent(actor, 'Power of Hatred')) return postCard(actor, 'Power of Hatred', '<p>This actor does not have Power of Hatred.</p>');
    if (!(await markEncounterUse(actor, 'powerOfHatred', 'Power of Hatred'))) return null;
    const targets = targetListOrManual('Power of Hatred');
    const amount = characterLevel(actor);
    const enc = encounterId();
    const rows = [];
    for (const target of targets) {
      const hp = actorHpValue(target);
      const max = actorHpMax(target);
      if (max > 0 && hp >= Math.floor(max / 2)) {
        rows.push(`<li><strong>${esc(target.name)}</strong>: not below half HP (${hp}/${max}); no bonus HP applied.</li>`);
        continue;
      }
      const currentTemp = Number(target?.system?.hp?.temp ?? 0) || 0;
      const nextTemp = Math.max(currentTemp, amount);
      await ActorEngine.updateActor(target, { 'system.hp.temp': nextTemp }, { source: 'power-of-hatred' });
      await target.setFlag?.(NS, 'sithCommander.powerOfHatred', { encounterId: enc, sourceActorId: actor.id, sourceActorName: actor.name, amount, previousTempHp: currentTemp, appliedTempHp: nextTemp, createdAt: Date.now() });
      rows.push(`<li><strong>${esc(target.name)}</strong>: temporary HP ${currentTemp} → ${nextTemp}.</li>`);
    }
    return postCard(actor, 'Power of Hatred', `<p>${esc(actor.name)} inflames allied hatred.</p>${rows.length ? `<ul>${rows.join('')}</ul>` : '<p>No allies were targeted; grant bonus hit points manually to eligible allies below half HP.</p>'}<p>Bonus HP from multiple sources do not stack; the system preserves higher existing temporary HP.</p>`, { targetActorIds: targets.map(t => t.id), tempHpAmount: amount });
  }


  static registerHooks() {
    if (globalThis.SWSE?.__sithTalentActionsRegistered) return;
    globalThis.SWSE = globalThis.SWSE ?? {};
    globalThis.SWSE.__sithTalentActionsRegistered = true;

    Hooks.on('combatTurn', async (combat) => {
      try {
        const actor = combat?.combatant?.actor ?? null;
        if (!actor) return;
        const rage = actor.getFlag?.(NS, 'channelAnger') ?? null;
        if (rage?.active === true && Number(rage?.expiresAfterRound ?? 0) > 0 && Number(combat?.round ?? 0) > Number(rage.expiresAfterRound)) {
          await SithTalentActions.endChannelAnger(actor);
        }
        const afflictions = actor.getFlag?.(NS, 'pendingAfflictions') ?? [];
        if (!Array.isArray(afflictions) || !afflictions.length) return;
        const active = afflictions.filter(entry => entry && entry.triggered !== true);
        if (!active.length) return;
        let total = 0;
        const rows = [];
        for (const entry of active) {
          const roll = await RollEngine.safeRoll('2d6', actor?.getRollData?.() ?? {}, { actor, domain: 'sith-talent.affliction' });
          const damage = Number(roll?.total ?? 0) || 0;
          total += damage;
          await ActorEngine.applyDamage(actor, { amount: damage, type: 'force', source: 'Affliction', sourceActor: game?.actors?.get?.(entry.sourceActorId) ?? null, options: { bypassThreshold: false } });
          rows.push(`<li>${damage} Force damage from ${esc(entry.sourceActorName || 'Affliction')}</li>`);
        }
        await actor.unsetFlag?.(NS, 'pendingAfflictions');
        await postCard(actor, 'Affliction', `<p>${esc(actor.name)} suffers Affliction damage at the beginning of their turn, before taking actions.</p><ul>${rows.join('')}</ul><p><strong>Total:</strong> ${total} Force damage.</p>`, { targetActorId: actor.id, totalDamage: total });
      } catch (err) {
        console.warn('[SWSE] Affliction turn-start damage failed:', err);
      }
    });

    Hooks.on('preUpdateActor', async (actor, update) => {
      try {
        const incomingHp = update?.system?.hp?.value ?? update?.system?.hitPoints?.value ?? update?.system?.attributes?.hp?.value;
        if (incomingHp === undefined) return;
        const cripple = actor.getFlag?.(NS, 'cripplingStrike') ?? null;
        const maxHp = actorHpMax(actor);
        if (cripple && maxHp > 0 && Number(incomingHp) >= maxHp) {
          await actor.unsetFlag?.(NS, 'cripplingStrike');
          await postCard(actor, 'Crippling Strike Ends', `<p>${esc(actor.name)} has returned to maximum hit points. Remove the Crippling Strike speed reduction.</p>`, { targetActorId: actor.id });
        }
      } catch (err) {
        console.warn('[SWSE] Crippling Strike cleanup failed:', err);
      }
    });

    Hooks.on('deleteCombat', async (combat) => {
      try {
        for (const combatant of combat?.combatants ?? []) {
          const actor = combatant?.actor;
          if (!actor) continue;
          const power = actor.getFlag?.(NS, 'sithCommander.powerOfHatred') ?? null;
          if (power?.encounterId === combat?.id) {
            const currentTemp = Number(actor?.system?.hp?.temp ?? 0) || 0;
            const applied = Number(power?.appliedTempHp ?? 0) || 0;
            if (applied > 0 && currentTemp <= applied) {
              await ActorEngine.updateActor(actor, { 'system.hp.temp': Math.max(0, Number(power?.previousTempHp ?? 0) || 0) }, { source: 'power-of-hatred-cleanup' });
            }
            await actor.unsetFlag?.(NS, 'sithCommander.powerOfHatred');
          }
          await actor.unsetFlag?.(NS, 'sithCommander.focusTerror');
          await actor.unsetFlag?.(NS, 'sithCommander.inciteRage');
          const rapid = actor.getFlag?.(NS, 'rapidAlchemy') ?? null;
          if (rapid?.encounterId === combat?.id) await actor.unsetFlag?.(NS, 'rapidAlchemy');
        }
      } catch (err) {
        console.warn('[SWSE] Sith encounter cleanup failed:', err);
      }
    });
  }
}

export function registerSithTalentActions() {
  SithTalentActions.registerHooks();
}
