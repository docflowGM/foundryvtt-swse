import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createEffectOnActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { ForcePointsService } from "/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

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

function actorLevel(actor) {
  const candidates = [actor?.system?.level?.heroic, actor?.system?.heroicLevel, actor?.system?.level, actor?.system?.details?.level];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 1;
}

function abilityMod(actor, key) {
  return Number(actor?.system?.derived?.attributes?.[key]?.mod ?? actor?.system?.abilities?.[key]?.mod ?? actor?.system?.attributes?.[key]?.mod ?? 0) || 0;
}

function encounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function forcePowers(actor) {
  return Array.from(actor?.items ?? []).filter(item => item?.type === 'force-power');
}

function isReadyPower(item) {
  return item?.system?.spent !== true && item?.system?.discarded !== true;
}

function isSpentPower(item) {
  return item?.system?.spent === true || item?.system?.discarded === true;
}

function selectedTargetActors() {
  const targets = Array.from(game?.user?.targets ?? []);
  return targets.map(token => token?.actor).filter(Boolean);
}

async function postCard(actor, title, body, flags = {}) {
  const content = `<section class="swse-chat-card swse-chat-card--jedi-prestige-talent">
    <header class="swse-chat-card__header"><strong>${esc(title)}</strong><span>Jedi Prestige Talent</span></header>
    <div class="swse-chat-card__body">${body}</div>
  </section>`;
  return SWSEChat.postHTML({ actor, content, flags: { swse: { jediPrestigeTalent: true, talentName: title, ...flags } } });
}

async function promptSimple(title, body, fields = []) {
  const fieldHtml = fields.map(field => {
    if (field.type === 'select') {
      return `<div class="form-group"><label>${esc(field.label)}</label><select name="${esc(field.name)}">${(field.options ?? []).map(opt => `<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join('')}</select></div>`;
    }
    if (field.type === 'checkbox') {
      return `<label class="checkbox"><input type="checkbox" name="${esc(field.name)}" ${field.checked ? 'checked' : ''} /> ${esc(field.label)}</label>`;
    }
    return `<div class="form-group"><label>${esc(field.label)}</label><input name="${esc(field.name)}" type="text" value="${esc(field.value ?? '')}" placeholder="${esc(field.placeholder ?? '')}" /></div>`;
  }).join('');
  const content = `<form class="swse-dialog swse-jedi-prestige-dialog"><p>${body}</p>${fieldHtml}</form>`;
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

async function grantBonusForcePoint(targetActor, { source = 'Bonus Force Point', sourceActorId = null, sourceActorName = '', expires = 'encounter', encounter = encounterId() } = {}) {
  if (!targetActor) return { granted: 0 };
  const pool = targetActor.getFlag?.(NS, 'bonusForcePoints') ?? {};
  const entries = Array.isArray(pool.entries) ? [...pool.entries] : [];
  entries.push({
    id: `${slug(source)}-${Date.now()}`,
    source,
    value: 1,
    max: 1,
    restrictions: '',
    expires,
    encounterId: encounter,
    createdAt: Date.now(),
    sourceActorId,
    sourceActorName
  });
  const value = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.value) || 0), 0);
  const max = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.max ?? entry.value) || 0), 0);
  await ActorEngine.updateActor(targetActor, {
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

async function chooseTargetActor(title, fallbackLabel = 'target') {
  const selected = selectedTargetActors();
  if (selected.length) return { actor: selected[0], name: selected[0].name };
  const choice = await promptSimple(title, `No token is targeted. Enter the ${fallbackLabel} name for the chat card.`, [
    { name: 'targetName', label: 'Target name', placeholder: fallbackLabel }
  ]);
  if (!choice) return null;
  return { actor: null, name: choice.targetName || fallbackLabel };
}

async function rollForcePointBonus(actor) {
  const { diceCount, dieSize } = await ForcePointsService.getScalingDice(actor);
  const formula = diceCount <= 1 ? `1${dieSize}` : `${diceCount}${dieSize}kh1`;
  const roll = await RollEngine.safeRoll(formula);
  return { roll, formula, total: Number(roll?.total ?? 0) || 0 };
}

async function rerollSkillKeepBetter(actor, skillKey, title, sourceElement = null) {
  const total = Number(actor?.system?.derived?.skills?.[skillKey]?.total ?? actor?.system?.skills?.[skillKey]?.total ?? 0) || 0;
  const first = await RollEngine.safeRoll(`1d20 + ${total}`);
  const second = await RollEngine.safeRoll(`1d20 + ${total}`);
  const best = Number(second?.total ?? -Infinity) > Number(first?.total ?? -Infinity) ? second : first;
  await postCard(actor, title, `<p>${esc(actor.name)} rolls twice and keeps the better result.</p><p><strong>Rolls:</strong> ${first?.total ?? '?'} and ${second?.total ?? '?'}. <strong>Kept:</strong> ${best?.total ?? '?'}.</p>`, { skillKey, first: first?.total ?? null, second: second?.total ?? null, kept: best?.total ?? null });
  return { success: true, first, second, kept: best };
}

export class JediPrestigeTalentActions {
  static hasTalent(actor, name) { return hasTalent(actor, name); }

  static async execute(actor, kind, actionData = {}, options = {}) {
    const handlers = {
      forceWarning: () => this.announceForceWarning(actor),
      vigilance: () => this.promptVigilance(actor),
      shelteringStance: () => this.announceShelteringStance(actor),
      watchmansAdvance: () => this.announceWatchmansAdvance(actor),
      defensiveCircle: () => this.promptDefensiveCircle(actor),
      forceRevive: () => this.promptForceRevive(actor),
      jediBattleCommander: () => this.announceJediBattleCommander(actor),
      direct: () => this.promptDirect(actor),
      impartKnowledge: () => this.announceImpartKnowledge(actor),
      scholarlyKnowledge: () => this.promptScholarlyKnowledge(actor, options),
      apprenticeBoon: () => this.promptApprenticeBoon(actor),
      shareForceSecret: () => this.promptShareChoice(actor, 'Share Force Secret', 'force secret', { exclude: [] }),
      shareForceTechnique: () => this.promptShareChoice(actor, 'Share Force Technique', 'force technique', { exclude: ['Force Point Recovery'] }),
      shareTalent: () => this.promptShareTalent(actor),
      transferPower: () => this.promptTransferPower(actor),
      jediNetwork: () => this.promptJediNetwork(actor),
      callWeapon: () => this.announceCallWeapon(actor),
      echoesOfTheForce: () => this.announceEchoesOfTheForce(actor),
      jediQuarry: () => this.promptJediQuarry(actor),
      preparedForDanger: () => this.promptPreparedForDanger(actor),
      senseDeception: () => this.promptSenseDeception(actor, options),
      uncloudedJudgement: () => this.promptUncloudedJudgement(actor),
      combatTrance: () => this.promptCombatTrance(actor),
      improvisedWeaponMastery: () => this.announceImprovisedWeaponMastery(actor),
      twinWeaponStyle: () => this.announceTwinWeaponStyle(actor),
      twinWeaponMastery: () => this.announceTwinWeaponMastery(actor),
      coverYourTracks: () => this.announceCoverYourTracks(actor),
      difficultToSense: () => rerollSkillKeepBetter(actor, 'useTheForce', 'Difficult to Sense', options?.sourceElement ?? null),
      forceVeil: () => this.announceForceVeil(actor),
      lightsaberSpecialist: () => this.announceLightsaberSpecialist(actor),
      masterAdvisor: () => this.announceMasterAdvisor(actor),
      forceTreatment: () => this.announceForceTreatment(actor),
      healingBoost: () => this.announceHealingBoost(actor, 1),
      improvedHealingBoost: () => this.announceHealingBoost(actor, 2),
      soothe: () => this.announceSoothe(actor),
      insightOfTheForce: () => this.announceInsightOfTheForce(actor)
    };
    const handler = handlers[kind];
    if (handler) return handler();
    return postCard(actor, actionData?.name ?? kind, `<p>${esc(actionData?.description ?? actionData?.notes ?? 'Talent reminder.')}</p>`, { kind });
  }

  static async announceForceWarning(actor) {
    const wisMod = Math.max(1, abilityMod(actor, 'wis'));
    return postCard(actor, 'Force Warning', `<p>Allies within 12 squares may reroll Initiative at the start of combat but must keep the reroll.</p><p>If allies within 12 squares are Surprised and ${esc(actor.name)} is not, designate up to <strong>${wisMod}</strong> surprised ally/allies; they are no longer Surprised and may act in the Surprise Round.</p>`, { wisdomModifierMinimumOne: wisMod });
  }

  static async promptVigilance(actor) {
    const target = await chooseTargetActor('Vigilance', 'adjacent ally');
    if (!target) return null;
    if (target.actor) {
      await createEffectOnActor(target.actor, {
        name: `Vigilance (${actor.name})`,
        icon: 'icons/svg/shield.svg',
        changes: [{ key: 'system.defenses.reflex.misc', mode: 2, value: '1', priority: 20 }],
        disabled: false,
        duration: {},
        flags: { swse: { talentName: 'Vigilance', sourceActorId: actor.id, deflectionBonus: 1, requiresAdjacency: true, manualAdjacencyCheck: true } }
      }, { source: 'vigilance' });
    }
    return postCard(actor, 'Vigilance', `<p>${esc(actor.name)} designates <strong>${esc(target.name)}</strong> as their Vigilance target.</p><p>The target gains +1 deflection bonus to Reflex Defense as long as they remain adjacent. Changing the target is a Swift Action.</p>${target.actor ? '<p>The reminder effect was applied to the targeted actor.</p>' : ''}`, { targetName: target.name, targetActorId: target.actor?.id ?? null });
  }

  static async announceShelteringStance(actor) {
    return postCard(actor, 'Sheltering Stance', '<p>When adjacent to an ally, you may use Block or Deflect on attacks that target that ally without spending a Force Point.</p><p>The Block/Deflect dialogs include a Sheltering Stance checkbox when this talent is present.</p>', { talentName: 'Sheltering Stance' });
  }

  static async announceWatchmansAdvance(actor) {
    return postCard(actor, "Watchman's Advance", '<p>When acting in the Surprise Round, you and allies can take one extra Move Action. Any character can gain only one extra Move Action during the Surprise Round, no matter how many allies have this talent.</p>', { talentName: "Watchman's Advance" });
  }

  static async promptDefensiveCircle(actor) {
    const targets = [actor, ...selectedTargetActors().filter(a => a?.id !== actor.id)];
    for (const target of targets) {
      await createEffectOnActor(target, {
        name: `Defensive Circle (${actor.name})`,
        icon: 'icons/svg/shield.svg',
        changes: [{ key: 'system.defenses.reflex.misc', mode: 2, value: '2', priority: 20 }],
        disabled: false,
        duration: { rounds: 999 },
        flags: { swse: { talentName: 'Defensive Circle', sourceActorId: actor.id, insightReflexBonus: 2, requiresBattleMeditation: true, expiresWithBattleMeditation: true } }
      }, { source: 'defensive-circle' });
    }
    return postCard(actor, 'Defensive Circle', `<p>${esc(actor.name)} and selected allies affected by Battle Meditation gain +2 insight bonus to Reflex Defense while Battle Meditation persists.</p><p><strong>Applied to:</strong> ${targets.map(a => esc(a.name)).join(', ')}.</p><p>${esc(actor.name)} also gains +1 on Use the Force checks to Block/Deflect for each adjacent ally wielding a lightsaber; that count remains table-adjudicated.</p>`, { appliedActorIds: targets.map(a => a.id) });
  }

  static async promptForceRevive(actor) {
    const target = await chooseTargetActor('Force Revive', 'ally at 0 HP affected by Battle Meditation');
    if (!target) return null;
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Force Revive requires spending 1 Force Point.');
      return null;
    }
    let secondWind = null;
    if (target.actor) {
      secondWind = await ActorEngine.applySecondWind(target.actor, { validateCombat: false, source: 'force-revive' });
    }
    return postCard(actor, 'Force Revive', `<p>${esc(actor.name)} spends 1 Force Point as a Reaction to let <strong>${esc(target.name)}</strong> take Second Wind as a Reaction after being reduced to 0 HP.</p>${secondWind ? `<p><strong>Second Wind:</strong> ${secondWind.success ? `healed ${secondWind.healed} HP` : esc(secondWind.reason || 'not applied')}.</p>` : '<p>No targeted actor was available, so apply the target Second Wind manually.</p>'}`, { targetActorId: target.actor?.id ?? null, secondWindSuccess: secondWind?.success ?? null });
  }

  static async announceJediBattleCommander(actor) {
    return postCard(actor, 'Jedi Battle Commander', '<p>Your Battle Meditation grants +2 insight bonus on attack rolls instead of +1. The Battle Meditation action uses this upgraded value automatically.</p>', { talentName: 'Jedi Battle Commander' });
  }

  static async promptDirect(actor) {
    const target = await chooseTargetActor('Direct', 'ally within 6 squares and line of sight');
    if (!target) return null;
    const spent = target.actor ? forcePowers(target.actor).filter(isSpentPower) : [];
    if (!target.actor || !spent.length) {
      return postCard(actor, 'Direct', `<p>${esc(actor.name)} may return one spent Force Power to <strong>${esc(target.name)}</strong>'s Force Power Suite as a Standard Action.</p><p>No targeted actor with spent Force Powers was available, so choose and ready the ally's spent power manually.</p>`, { targetName: target.name });
    }
    const choice = await promptSimple('Direct', 'Choose the ally Force Power to return to their suite.', [
      { type: 'select', name: 'powerId', label: 'Spent Force Power', options: spent.map(power => ({ value: power.id, label: power.name })) }
    ]);
    if (!choice) return null;
    const power = spent.find(p => p.id === choice.powerId);
    if (!power) return null;
    await ActorEngine.updateEmbeddedDocuments(target.actor, 'Item', [{ _id: power.id, 'system.spent': false, 'system.discarded': false, 'flags.swse.lastRecoverySource': 'direct' }], { source: 'direct', render: false });
    return postCard(actor, 'Direct', `<p>${esc(actor.name)} returns <strong>${esc(power.name)}</strong> to <strong>${esc(target.actor.name)}</strong>'s Force Power Suite.</p>`, { targetActorId: target.actor.id, powerId: power.id });
  }

  static async announceImpartKnowledge(actor) {
    return postCard(actor, 'Impart Knowledge', '<p>Reaction: Aid Another on the Knowledge check of an ally within 6 squares for Knowledge skills you are Trained in.</p>', { talentName: 'Impart Knowledge' });
  }

  static async promptScholarlyKnowledge(actor, options = {}) {
    const knowledge = Object.entries(actor?.system?.derived?.skills ?? {})
      .filter(([key]) => String(key).startsWith('knowledge'))
      .map(([key, data]) => ({ key, label: data?.label ?? key }));
    const choice = await promptSimple('Scholarly Knowledge', 'Choose a trained Knowledge skill to reroll, keeping the better result.', [
      { type: 'select', name: 'skillKey', label: 'Knowledge skill', options: knowledge.map(s => ({ value: s.key, label: s.label })) }
    ]);
    if (!choice) return null;
    return rerollSkillKeepBetter(actor, choice.skillKey, 'Scholarly Knowledge', options?.sourceElement ?? null);
  }

  static async promptApprenticeBoon(actor) {
    const target = await chooseTargetActor('Apprentice Boon', 'ally within 12 squares with lower UTF bonus');
    if (!target) return null;
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Apprentice Boon requires spending 1 Force Point.');
      return null;
    }
    const fpRoll = await rollForcePointBonus(actor);
    return postCard(actor, 'Apprentice Boon', `<p>${esc(actor.name)} spends 1 Force Point as a Reaction to add <strong>+${fpRoll.total}</strong> to <strong>${esc(target.name)}</strong>'s Use the Force check.</p><p><strong>Force Point roll:</strong> ${esc(fpRoll.formula)} = ${fpRoll.total}. Use ${esc(actor.name)}'s level for the dice.</p>`, { targetActorId: target.actor?.id ?? null, bonus: fpRoll.total });
  }

  static async promptShareChoice(actor, title, choiceType, { exclude = [] } = {}) {
    const label = choiceType === 'force secret' ? 'Force Secret' : 'Force Technique';
    const owned = Array.from(actor?.items ?? []).filter(item => slug(item?.type).includes(choiceType.replace(' ', '-')) || String(item?.name ?? '').toLowerCase().includes(choiceType));
    const options = owned.filter(item => !exclude.some(ex => normalizedName(ex) === normalizedName(item.name))).map(item => ({ value: item.id, label: item.name }));
    const target = await chooseTargetActor(title, 'ally within 12 squares trained in Use the Force');
    if (!target) return null;
    let selectedName = `${label} chosen when this talent was taken`;
    if (options.length) {
      const choice = await promptSimple(title, `Choose the ${choiceType} to share until the end of your next turn.`, [
        { type: 'select', name: 'itemId', label, options }
      ]);
      if (!choice) return null;
      selectedName = owned.find(item => item.id === choice.itemId)?.name ?? selectedName;
    }
    return postCard(actor, title, `<p>${esc(actor.name)} grants <strong>${esc(selectedName)}</strong> to <strong>${esc(target.name)}</strong> until the end of ${esc(actor.name)}'s next turn.</p><p>The ally must be within 12 squares and Trained in Use the Force. Force Point Recovery cannot be chosen for Share Force Technique.</p>`, { targetActorId: target.actor?.id ?? null, sharedName: selectedName });
  }

  static async promptShareTalent(actor) {
    const target = await chooseTargetActor('Share Talent', 'ally within 12 squares able to see and hear you');
    if (!target) return null;
    const maxAllies = Math.max(1, Math.floor(actorLevel(actor) / 2));
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Share Talent requires spending 1 Force Point.');
      return null;
    }
    return postCard(actor, 'Share Talent', `<p>${esc(actor.name)} spends 1 Force Point as a Standard Action to share the selected lightsaber/duelist/lightsaber-form talent with eligible allies until the end of the encounter.</p><p><strong>Maximum allies:</strong> ${maxAllies}. Ally must be within 12 squares, able to see and hear you, and Trained in Use the Force.</p><p><strong>Selected/targeted ally:</strong> ${esc(target.name)}.</p>`, { maxAllies, targetActorId: target.actor?.id ?? null });
  }

  static async promptTransferPower(actor) {
    const target = await chooseTargetActor('Transfer Power', 'ally trained in Use the Force');
    if (!target) return null;
    const ready = forcePowers(actor).filter(isReadyPower);
    if (!target.actor || !ready.length) {
      return postCard(actor, 'Transfer Power', `<p>${esc(actor.name)} may spend one use of a Force Power in their suite and add a single-use copy to an ally within 12 squares and line of sight.</p><p>No targeted actor or ready Force Power was available, so resolve manually.</p>`, { targetName: target.name });
    }
    const choice = await promptSimple('Transfer Power', 'Choose a ready Force Power to transfer.', [
      { type: 'select', name: 'powerId', label: 'Ready Force Power', options: ready.map(power => ({ value: power.id, label: power.name })) }
    ]);
    if (!choice) return null;
    const power = ready.find(p => p.id === choice.powerId);
    if (!power) return null;
    await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: power.id, 'system.spent': true, 'system.discarded': true, 'flags.swse.lastSpentBy': 'transfer-power' }], { source: 'transfer-power', render: false });
    const data = power.toObject ? power.toObject() : foundry.utils.deepClone(power);
    delete data._id;
    data.system = foundry.utils.mergeObject(data.system || {}, { spent: false, discarded: false, transferredUse: true, grantedBy: 'Transfer Power' }, { inplace: false, recursive: true });
    data.flags = foundry.utils.mergeObject(data.flags || {}, { swse: { transferPower: { sourceActorId: actor.id, sourceActorName: actor.name, encounterId: encounterId(), removeAfterUse: true, expiresEndOfEncounter: true } } }, { inplace: false, recursive: true });
    await ActorEngine.createEmbeddedDocuments(target.actor, 'Item', [data], { source: 'transfer-power', render: false });
    return postCard(actor, 'Transfer Power', `<p>${esc(actor.name)} spends <strong>${esc(power.name)}</strong> and transfers a single use to <strong>${esc(target.actor.name)}</strong>.</p><p>When the ally uses that power, remove the transferred copy. If unused by the end of the encounter, remove it then.</p>`, { targetActorId: target.actor.id, powerName: power.name });
  }

  static async promptJediNetwork(actor) {
    const flag = actor.getFlag?.(NS, 'jediNetwork') ?? {};
    const choice = await promptSimple('Jedi Network', 'Choose the once-per-game-session network benefit to call upon while in a civilized area.', [
      { type: 'select', name: 'purpose', label: 'Purpose', options: [
        { value: 'equipment', label: 'Acquire Equipment or Funds' },
        { value: 'information', label: 'Obtain Information' },
        { value: 'medical', label: 'Receive Medical Attention' },
        { value: 'safehouse', label: 'Secure Safe House' }
      ] },
      { type: 'checkbox', name: 'overrideUsed', label: 'Allow even though this actor already has a recorded Jedi Network use this session', checked: false }
    ]);
    if (!choice) return null;
    if (flag?.used === true && !choice.overrideUsed) {
      ui?.notifications?.warn?.('Jedi Network is already marked used this session. Reopen and check override if the GM reset the session.');
      return null;
    }
    const cap = actorLevel(actor) * 500;
    await actor.setFlag?.(NS, 'jediNetwork', { used: true, purpose: choice.purpose, cap, usedAt: Date.now() });
    const descriptions = {
      equipment: `obtain equipment/funds up to ${cap} credits, subject to licensing/restriction context`,
      information: 'automatically succeed on Gather Information if DC is 20 or lower and cover the check cost',
      medical: 'receive private medical attention for you and up to three allies for up to 24 hours',
      safehouse: `secure a safe house for you and up to three allies for ${actorLevel(actor)} day(s)`
    };
    return postCard(actor, 'Jedi Network', `<p>${esc(actor.name)} calls on the Jedi Network to <strong>${esc(descriptions[choice.purpose] ?? choice.purpose)}</strong>.</p><p>This use is marked on the actor as the once-per-game-session use. Clear the flag between sessions if needed.</p>`, { purpose: choice.purpose, cap });
  }

  static async announceCallWeapon(actor) {
    return postCard(actor, 'Call Weapon', '<p>You can use Move Light Object to call a lightsaber you built into your hand and ignite it as a Free Action, provided the weapon is in line of sight.</p>', { talentName: 'Call Weapon' });
  }

  static async announceEchoesOfTheForce(actor) {
    return postCard(actor, 'Echoes of the Force', '<p>Use Farseeing on the location you are standing in to view its past. DC is 20 + 1 per day into the past you attempt to scry.</p>', { talentName: 'Echoes of the Force' });
  }

  static async promptJediQuarry(actor) {
    const target = await chooseTargetActor('Jedi Quarry', 'target creature');
    if (!target) return null;
    await actor.setFlag?.(NS, 'jediQuarry', { targetName: target.name, targetActorId: target.actor?.id ?? null, encounterId: encounterId(), active: true, setAt: Date.now() });
    return postCard(actor, 'Jedi Quarry', `<p>${esc(actor.name)} designates <strong>${esc(target.name)}</strong> as their Jedi Quarry.</p><p>Gain +2 Speed whenever spending a Move Action to move, provided you end adjacent to the quarry. This lasts until the target surrenders, reaches 0 HP, reaches the bottom of the Condition Track, or the encounter ends.</p>`, { targetActorId: target.actor?.id ?? null });
  }

  static async promptPreparedForDanger(actor) {
    const farseeing = forcePowers(actor).find(power => slug(power.name) === 'farseeing' && isReadyPower(power));
    const spent = forcePowers(actor).filter(power => isSpentPower(power) && power.id !== farseeing?.id);
    if (!farseeing || !spent.length) {
      return postCard(actor, 'Prepared for Danger', '<p>Spend one unspent Farseeing to regain any one other Force Power as a Swift Action.</p><p>No ready Farseeing and spent recoverable Force Power combination was found on this actor.</p>', { foundReadyFarseeing: !!farseeing, spentCount: spent.length });
    }
    const choice = await promptSimple('Prepared for Danger', 'Spend Farseeing and choose another spent Force Power to recover.', [
      { type: 'select', name: 'powerId', label: 'Recover Force Power', options: spent.map(power => ({ value: power.id, label: power.name })) }
    ]);
    if (!choice) return null;
    const power = spent.find(p => p.id === choice.powerId);
    await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [
      { _id: farseeing.id, 'system.spent': true, 'system.discarded': true, 'flags.swse.lastSpentBy': 'prepared-for-danger' },
      { _id: power.id, 'system.spent': false, 'system.discarded': false, 'flags.swse.lastRecoverySource': 'prepared-for-danger' }
    ], { source: 'prepared-for-danger', render: false });
    return postCard(actor, 'Prepared for Danger', `<p>${esc(actor.name)} spends <strong>Farseeing</strong> to recover <strong>${esc(power.name)}</strong>.</p>`, { recoveredPowerId: power.id });
  }

  static async promptSenseDeception(actor, options = {}) {
    const modResult = await showRollModifiersDialog({ title: 'Sense Deception — Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement: options?.sourceElement ?? null, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', { ...modResult, source: 'sense-deception', skillUse: { key: 'sense-deception', label: 'Sense Deception' }, sourceElement: options?.sourceElement ?? null });
    if (!roll) return null;
    const will = Number(actor?.system?.defenses?.will?.total ?? actor?.system?.derived?.defenses?.will?.total ?? 10) || 10;
    const replacement = Math.max(will, Number(roll.roll?.total ?? 0) || 0);
    return postCard(actor, 'Sense Deception', `<p>${esc(actor.name)} uses Use the Force against a Deception or Persuasion check targeting Will Defense.</p><p><strong>Use the Force:</strong> ${roll.roll?.total ?? '?'}. <strong>Will Defense:</strong> ${will}. <strong>Use as defense:</strong> ${replacement}.</p>`, { will, roll: roll.roll?.total ?? null, replacement });
  }

  static async promptUncloudedJudgement(actor) {
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Unclouded Judgement requires spending 1 Force Point.');
      return null;
    }
    return postCard(actor, 'Unclouded Judgement', `<p>${esc(actor.name)} spends 1 Force Point as a Reaction to negate a Mind-Affecting Force Power or Force Talent targeting them. No skill check is required.</p>`, { forcePointSpent: true });
  }

  static async promptCombatTrance(actor) {
    await createEffectOnActor(actor, {
      name: 'Combat Trance',
      icon: 'icons/svg/sword.svg',
      changes: [],
      disabled: false,
      duration: { rounds: 999 },
      flags: { swse: { talentName: 'Combat Trance', triggeredBy: 'Battle Strike', firstMeleeAttackEachRound: true, expiresIfNoAttackInRound: true, manualAttackBonusFromBattleStrike: true } }
    }, { source: 'combat-trance' });
    return postCard(actor, 'Combat Trance', '<p>After using Battle Strike, apply the Battle Strike attack bonus to your first melee attack each round until the encounter ends. If you do not attack in a round, the effect ends.</p><p>A reminder effect has been placed on the actor.</p>', { talentName: 'Combat Trance' });
  }

  static async announceImprovisedWeaponMastery(actor) { return postCard(actor, 'Improvised Weapon Mastery', '<p>You take no penalty on attack rolls made with Improvised Weapons.</p>', { talentName: 'Improvised Weapon Mastery' }); }
  static async announceTwinWeaponStyle(actor) { return postCard(actor, 'Twin Weapon Style', '<p>As a Standard Action while wielding two weapons or a double weapon, make one attack with each weapon/end. Each attack must be against a different target.</p>', { talentName: 'Twin Weapon Style' }); }
  static async announceTwinWeaponMastery(actor) { return postCard(actor, 'Twin Weapon Mastery', '<p>Whenever you use Twin Weapon Style, you may move 2 squares between each attack. This movement does not provoke Attacks of Opportunity.</p>', { talentName: 'Twin Weapon Mastery' }); }
  static async announceCoverYourTracks(actor) { return postCard(actor, 'Cover Your Tracks', '<p>Anyone attempting to locate you using Gather Information suffers a -5 penalty on those Gather Information checks.</p>', { talentName: 'Cover Your Tracks' }); }
  static async announceForceVeil(actor) { return postCard(actor, 'Force Veil', '<p>Your Force-user concealment reduces the detection radius to 10 kilometers instead of 100 kilometers.</p>', { talentName: 'Force Veil' }); }
  static async announceLightsaberSpecialist(actor) { return postCard(actor, 'Lightsaber Specialist', '<p>Whenever armed with a lightsaber you built, gain +2 morale bonus on Use the Force checks for Block and Deflect. The Block/Deflect dialogs include this checkbox when the talent is present.</p>', { talentName: 'Lightsaber Specialist' }); }
  static async announceMasterAdvisor(actor) { return postCard(actor, 'Master Advisor', '<p>When you use Skilled Advisor, the ally you aid is queued to gain one temporary Force Point at the end of their next turn. If not spent before encounter end, it is lost.</p>', { talentName: 'Master Advisor' }); }
  static async announceForceTreatment(actor) { return postCard(actor, 'Force Treatment', '<p>You may make Use the Force checks in place of Treat Injury checks and are considered Trained in Treat Injury for using this talent. Existing Treat Injury rerolls may reroll the Use the Force check under the same limits.</p>', { talentName: 'Force Treatment' }); }
  static async announceHealingBoost(actor, perLevel) { return postCard(actor, perLevel > 1 ? 'Improved Healing Boost' : 'Healing Boost', `<p>When healing with Vital Transfer, increase the damage healed by ${perLevel} point${perLevel > 1 ? 's' : ''} per class level.</p>`, { perLevel }); }
  static async announceSoothe(actor) { return postCard(actor, 'Soothe', '<p>When using Vital Transfer, you may move the target +1 step on the Condition Track instead of healing damage. When you do, you move -1 step on the Condition Track.</p>', { talentName: 'Soothe' }); }
  static async announceInsightOfTheForce(actor) { return postCard(actor, 'Insight of the Force', '<p>You may make Use the Force checks in place of Knowledge checks for Knowledge skills you are not Trained in. Derived skill totals now mark those untrained Knowledge checks as Use the Force substitutions when beneficial.</p>', { talentName: 'Insight of the Force' }); }

  static registerHooks() {
    if (globalThis.SWSE?.__jediPrestigeTalentActionsRegistered) return;
    globalThis.SWSE = globalThis.SWSE ?? {};
    globalThis.SWSE.__jediPrestigeTalentActionsRegistered = true;
    Hooks.on('combatTurn', async (combat, prior) => {
      try {
        const priorActor = prior?.combatant?.actor ?? prior?.actor ?? null;
        if (!priorActor) return;
        const pending = priorActor.getFlag?.(NS, 'pendingMasterAdvisorForcePoint') ?? null;
        if (!pending || pending.granted === true) return;
        if (pending.encounterId && pending.encounterId !== encounterId()) return;
        const grant = await grantBonusForcePoint(priorActor, { source: 'Master Advisor', sourceActorId: pending.sourceActorId, sourceActorName: pending.sourceActorName, expires: 'encounter', encounter: pending.encounterId ?? encounterId() });
        await priorActor.setFlag?.(NS, 'pendingMasterAdvisorForcePoint', { ...pending, granted: true, grantedAt: Date.now(), grantedAmount: grant.granted });
        await postCard(priorActor, 'Master Advisor', `<p>${esc(priorActor.name)} gains one temporary Force Point from ${esc(pending.sourceActorName || 'Master Advisor')} at the end of their turn. It expires at the end of the encounter if unspent.</p>`, { targetActorId: priorActor.id, granted: grant.granted });
      } catch (err) {
        console.warn('[SWSE] Master Advisor pending grant failed:', err);
      }
    });
  }
}

export function registerJediPrestigeTalentActions() {
  JediPrestigeTalentActions.registerHooks();
}
