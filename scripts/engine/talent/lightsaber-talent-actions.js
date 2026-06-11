import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createEffectOnActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

const NS = 'swse';
const BLOCK_DEFLECT_FLAG = 'blockDeflectUseState';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

function encounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function turnKey(actor) {
  const combat = game?.combat;
  const ownTurn = combat?.combatant?.actor?.id === actor?.id;
  return `${encounterId()}:${combat?.round ?? 'noround'}:${ownTurn ? combat?.turn ?? 'turn' : 'between-turns'}`;
}

function currentBlockDeflectState(actor) {
  const flag = actor?.getFlag?.(NS, BLOCK_DEFLECT_FLAG) ?? {};
  const key = turnKey(actor);
  if (flag?.turnKey !== key || flag?.encounterId !== encounterId()) return { turnKey: key, encounterId: encounterId(), uses: 0 };
  return { turnKey: key, encounterId: encounterId(), uses: Math.max(0, Number(flag?.uses ?? 0) || 0) };
}

async function postCard(actor, title, body, flags = {}) {
  const content = `<section class="swse-chat-card swse-chat-card--lightsaber-talent">
    <header class="swse-chat-card__header"><strong>${esc(title)}</strong><span>Lightsaber Combat Talent</span></header>
    <div class="swse-chat-card__body">${body}</div>
  </section>`;
  return SWSEChat.postHTML({ actor, content, flags: { swse: { lightsaberTalent: true, ...flags } } });
}

function weaponOptions(actor) {
  return Array.from(actor?.items ?? [])
    .filter(item => ['weapon', 'lightsaber'].includes(String(item?.type ?? '').toLowerCase()) || /lightsaber/i.test(String(item?.name ?? '')))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function promptAttackRollDc(title, { note = '', includeArea = false, includeProtectAdjacent = false, includeCortosis = false } = {}) {
  const content = `<form class="swse-dialog swse-lightsaber-defense-dialog">
    ${note ? `<p>${esc(note)}</p>` : ''}
    <div class="form-group"><label>Incoming attack roll result / DC</label><input name="dc" type="number" min="1" step="1" value="20" /></div>
    ${includeArea ? '<label class="checkbox"><input type="checkbox" name="area" /> This is an area attack/autofire/Force Lightning-style barrage</label>' : ''}
    ${includeProtectAdjacent ? '<label class="checkbox"><input type="checkbox" name="protectAdjacent" /> Spend 1 Force Point to protect an adjacent character instead of yourself</label>' : ''}
    ${includeCortosis ? '<label class="checkbox"><input type="checkbox" name="cortosis" /> I am using a Cortosis Gauntlet for Block</label>' : ''}
    <p class="notes">You must be aware of the attack and not Flat-Footed. Lightsaber requirements remain table-adjudicated unless a talent explicitly changes them.</p>
  </form>`;
  return SWSEDialogV2.prompt({
    title,
    content,
    label: 'Roll Use the Force',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      return {
        dc: Math.max(1, Number(fd.get('dc') || 20) || 20),
        area: fd.get('area') === 'on',
        protectAdjacent: fd.get('protectAdjacent') === 'on',
        cortosis: fd.get('cortosis') === 'on'
      };
    }
  });
}

async function promptNamedTarget(title, note = '') {
  const content = `<form class="swse-dialog swse-lightsaber-target-dialog">
    ${note ? `<p>${esc(note)}</p>` : ''}
    <div class="form-group"><label>Target</label><input name="targetName" type="text" placeholder="Target name" /></div>
    <p class="notes">Exact range, line of sight, adjacency, target type, and weapon context remain GM/player adjudicated when the scene cannot prove them.</p>
  </form>`;
  return SWSEDialogV2.prompt({
    title,
    content,
    label: 'Continue',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      return { targetName: String(fd.get('targetName') || 'target').trim() || 'target' };
    }
  });
}

export class LightsaberTalentActions {
  static hasTalent(actor, name) { return hasTalent(actor, name); }

  static _lightsaberDefenseBonus(actor) {
    return Math.max(1, Math.min(3, countTalent(actor, 'Lightsaber Defense') || 1));
  }

  static async _recordBlockDeflectUse(actor, kind, success) {
    const state = currentBlockDeflectState(actor);
    await actor?.setFlag?.(NS, BLOCK_DEFLECT_FLAG, {
      ...state,
      uses: state.uses + 1,
      lastKind: kind,
      lastSuccess: success === true,
      updatedAt: Date.now()
    });
  }

  static async promptBlock(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Block')) {
      ui?.notifications?.warn?.('Block talent required.');
      return null;
    }
    const hasCortosis = hasTalent(actor, 'Cortosis Gauntlet Block');
    const choice = await promptAttackRollDc('Block', {
      includeArea: true,
      includeProtectAdjacent: true,
      includeCortosis: hasCortosis,
      note: 'Reaction: negate a melee attack with a Use the Force check against the attack roll result.'
    });
    if (!choice) return null;

    if (choice.protectAdjacent) {
      const spend = await ActorEngine.spendForcePoints(actor, 1);
      if (!spend?.spent) {
        ui?.notifications?.warn?.('Block against an adjacent character requires spending 1 Force Point.');
        return null;
      }
    }

    const state = currentBlockDeflectState(actor);
    const penalty = -5 * state.uses;
    const modResult = await showRollModifiersDialog({ title: 'Block - Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', {
      ...modResult,
      customModifier: Number(modResult.customModifier || 0) + penalty,
      dc: choice.dc,
      source: 'block-talent',
      skillUse: { key: 'block', label: 'Block' },
      targetContext: { targetName: 'incoming melee attack', attackRollDc: choice.dc },
      sourceElement
    });
    if (!roll) return null;
    const success = roll.success === true;
    await this._recordBlockDeflectUse(actor, 'Block', success);
    if (success) {
      await actor?.setFlag?.(NS, 'lastSuccessfulBlock', { encounterId: encounterId(), round: game?.combat?.round ?? null, turn: game?.combat?.turn ?? null, usedAt: Date.now(), area: choice.area });
    }
    await postCard(actor, 'Block', `<p>${esc(actor.name)} attempts to Block a melee attack (${roll.roll?.total ?? '?'} vs DC ${choice.dc}).</p>
      <p><strong>${success ? 'Success' : 'Failure'}:</strong> ${success ? (choice.area ? 'For a melee area attack, take half damage if the attack hit or no damage if it missed.' : 'The melee attack is negated.') : 'The melee attack is not negated.'}</p>
      ${penalty ? `<p><strong>Cumulative Block/Deflect penalty:</strong> ${penalty}</p>` : ''}
      ${choice.protectAdjacent ? '<p><strong>Adjacent ally:</strong> 1 Force Point spent to protect an adjacent character.</p>' : ''}
      ${choice.cortosis ? '<p><strong>Cortosis Gauntlet:</strong> if this successfully Blocks a lightsaber attack, the attacking lightsaber is deactivated.</p>' : ''}
      <p><strong>Requirements:</strong> active lightsaber unless using Cortosis Gauntlet Block, aware of attack, not Flat-Footed.</p>`,
      { talentName: 'Block', success, dc: choice.dc, penalty, protectAdjacent: choice.protectAdjacent });
    return { success, roll: roll.roll, dc: choice.dc, penalty };
  }

  static async promptDeflect(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Deflect')) {
      ui?.notifications?.warn?.('Deflect talent required.');
      return null;
    }
    const choice = await promptAttackRollDc('Deflect', {
      includeArea: true,
      includeProtectAdjacent: true,
      note: 'Reaction: negate a ranged attack with a Use the Force check against the attack roll result.'
    });
    if (!choice) return null;

    if (choice.protectAdjacent) {
      const spend = await ActorEngine.spendForcePoints(actor, 1);
      if (!spend?.spent) {
        ui?.notifications?.warn?.('Deflect against an adjacent character requires spending 1 Force Point.');
        return null;
      }
    }

    const state = currentBlockDeflectState(actor);
    const penalty = -5 * state.uses;
    const modResult = await showRollModifiersDialog({ title: 'Deflect - Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', {
      ...modResult,
      customModifier: Number(modResult.customModifier || 0) + penalty,
      dc: choice.dc,
      source: 'deflect-talent',
      skillUse: { key: 'deflect', label: 'Deflect' },
      targetContext: { targetName: 'incoming ranged attack', attackRollDc: choice.dc },
      sourceElement
    });
    if (!roll) return null;
    const success = roll.success === true;
    await this._recordBlockDeflectUse(actor, 'Deflect', success);
    if (success) {
      await actor?.setFlag?.(NS, 'lastSuccessfulDeflect', { encounterId: encounterId(), round: game?.combat?.round ?? null, turn: game?.combat?.turn ?? null, usedAt: Date.now(), area: choice.area });
    }
    await postCard(actor, 'Deflect', `<p>${esc(actor.name)} attempts to Deflect a ranged attack (${roll.roll?.total ?? '?'} vs DC ${choice.dc}).</p>
      <p><strong>${success ? 'Success' : 'Failure'}:</strong> ${success ? (choice.area ? 'For autofire/Force Lightning-style barrages, take half damage if the attack hit or no damage if it missed.' : 'The ranged attack is negated.') : 'The ranged attack is not negated.'}</p>
      ${penalty ? `<p><strong>Cumulative Block/Deflect penalty:</strong> ${penalty}</p>` : ''}
      ${choice.protectAdjacent ? '<p><strong>Adjacent ally:</strong> 1 Force Point spent to protect an adjacent character.</p>' : ''}
      <p><strong>Limits:</strong> requires active lightsaber, awareness, not Flat-Footed; cannot negate Colossal (Frigate)+ vehicle attacks unless point-defense.</p>`,
      { talentName: 'Deflect', success, dc: choice.dc, penalty, protectAdjacent: choice.protectAdjacent });
    return { success, roll: roll.roll, dc: choice.dc, penalty };
  }

  static async promptLightsaberDefense(actor) {
    if (!hasTalent(actor, 'Lightsaber Defense')) {
      ui?.notifications?.warn?.('Lightsaber Defense talent required.');
      return null;
    }
    const bonus = this._lightsaberDefenseBonus(actor);
    await createEffectOnActor(actor, {
      name: `Lightsaber Defense (+${bonus} Reflex)`,
      icon: 'icons/svg/shield.svg',
      changes: [{ key: 'system.defenses.reflex.misc', mode: 2, value: String(bonus), priority: 20 }],
      disabled: false,
      duration: { rounds: 1, turns: 1 },
      flags: { swse: { talentName: 'Lightsaber Defense', deflectionBonus: bonus, expiresStartOfSourceNextTurn: true, requiresActiveLightsaber: true, notFlatFooted: true } }
    }, { source: 'lightsaber-defense' });
    await postCard(actor, 'Lightsaber Defense', `<p>${esc(actor.name)} gains a +${bonus} deflection bonus to Reflex Defense until the start of their next turn.</p><p>Requires a drawn and ignited lightsaber; the bonus does not apply while Flat-Footed or unaware.</p>`, { talentName: 'Lightsaber Defense', bonus });
    return { success: true, bonus };
  }

  static async promptLightsaberThrow(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Lightsaber Throw')) {
      ui?.notifications?.warn?.('Lightsaber Throw talent required.');
      return null;
    }
    const weapons = weaponOptions(actor).filter(w => /lightsaber/i.test(String(w.name ?? '') + ' ' + String(w.system?.group ?? '') + ' ' + String(w.system?.weaponType ?? '')));
    const weaponList = weapons.length ? `<div class="form-group"><label>Lightsaber</label><select name="weaponId">${weapons.map(w => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}</select></div>` : '';
    const content = `<form class="swse-dialog"><p>Throw a lightsaber as a Standard Action; it is treated as a thrown weapon, not an improvised weapon.</p>${weaponList}<label class="checkbox"><input type="checkbox" name="pullBack" /> Target is within 6 squares and I want to pull the lightsaber back with a Swift Action now</label><p class="notes">The thrown attack itself uses the normal attack roller/range penalties. This helper handles the optional DC 20 Use the Force pull-back.</p></form>`;
    const choice = await SWSEDialogV2.prompt({ title: 'Lightsaber Throw', content, label: 'Use Lightsaber Throw', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      return { weaponId: String(fd.get('weaponId') || ''), pullBack: fd.get('pullBack') === 'on' };
    }});
    if (!choice) return null;
    let pullBackResult = null;
    if (choice.pullBack) {
      const modResult = await showRollModifiersDialog({ title: 'Lightsaber Throw Pull-Back - DC 20 Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
      if (modResult !== null) {
        pullBackResult = await rollSkillCheck(actor, 'useTheForce', { ...modResult, dc: 20, source: 'lightsaber-throw-pullback', skillUse: { key: 'lightsaber-throw-pullback', label: 'Lightsaber Throw Pull-Back' }, sourceElement });
      }
    }
    await postCard(actor, 'Lightsaber Throw', `<p>${esc(actor.name)} may throw a lightsaber as a Standard Action using normal thrown-weapon range penalties.</p>${choice.pullBack ? `<p><strong>Pull-back:</strong> DC 20 Use the Force ${pullBackResult ? (pullBackResult.success ? 'succeeded' : 'failed') : 'was not rolled'}.</p>` : '<p>If the target is within 6 squares, the lightsaber can be pulled back as a Swift Action with DC 20 Use the Force.</p>'}`, { talentName: 'Lightsaber Throw', pullBack: choice.pullBack, pullBackSuccess: pullBackResult?.success ?? null });
    return { success: true, pullBackResult };
  }

  static async promptRedirectShot(actor) {
    if (!hasTalent(actor, 'Redirect Shot')) {
      ui?.notifications?.warn?.('Redirect Shot talent required.');
      return null;
    }
    const flag = actor?.getFlag?.(NS, 'redirectShot') ?? {};
    const roundKey = `${encounterId()}:${game?.combat?.round ?? 'noround'}`;
    if (flag?.roundKey === roundKey && flag?.used === true) {
      ui?.notifications?.warn?.('Redirect Shot has already been used this round.');
      return null;
    }
    const target = await promptNamedTarget('Redirect Shot', 'Use after successfully Deflecting a single blaster bolt. Autofire barrages and other projectiles cannot be redirected.');
    if (!target) return null;
    await actor?.setFlag?.(NS, 'redirectShot', { roundKey, used: true, targetName: target.targetName, usedAt: Date.now() });
    await postCard(actor, 'Redirect Shot', `<p>${esc(actor.name)} redirects a deflected blaster bolt toward <strong>${esc(target.targetName)}</strong>.</p><p>Make the immediate ranged attack using normal range penalties, not counting the distance the bolt traveled to reach you. If it hits, it deals normal weapon damage.</p>`, { talentName: 'Redirect Shot', targetName: target.targetName });
    return { success: true, targetName: target.targetName };
  }

  static async promptPrecision(actor) {
    if (!hasTalent(actor, 'Precision')) {
      ui?.notifications?.warn?.('Precision talent required.');
      return null;
    }
    const target = await promptNamedTarget('Precision', 'Use as a Standard Action with a lightsaber melee attack against an adjacent opponent.');
    if (!target) return null;
    await postCard(actor, 'Precision', `<p>${esc(actor.name)} makes a lightsaber attack against adjacent target <strong>${esc(target.targetName)}</strong>.</p><p>If the attack hits, it deals normal damage and reduces the target's speed to 2 squares until the end of ${esc(actor.name)}'s next turn.</p>`, { talentName: 'Precision', targetName: target.targetName });
    return { success: true, targetName: target.targetName };
  }

  static async promptRiposte(actor) {
    if (!hasTalent(actor, 'Riposte')) {
      ui?.notifications?.warn?.('Riposte talent required.');
      return null;
    }
    const flag = actor?.getFlag?.(NS, 'encounterUses.riposte') ?? {};
    if (flag?.encounterId === encounterId() && flag?.used === true) {
      ui?.notifications?.warn?.('Riposte has already been used this encounter.');
      return null;
    }
    const target = await promptNamedTarget('Riposte', 'Use after successfully negating a non-area melee attack with Block.');
    if (!target) return null;
    await actor?.setFlag?.(NS, 'encounterUses.riposte', { encounterId: encounterId(), used: true, targetName: target.targetName, usedAt: Date.now() });
    await postCard(actor, 'Riposte', `<p>${esc(actor.name)} makes a lightsaber attack against <strong>${esc(target.targetName)}</strong>, whose non-area melee attack was successfully negated with Block.</p><p>Once per encounter. Cannot be used against melee area attacks such as Whirlwind Attack.</p>`, { talentName: 'Riposte', targetName: target.targetName });
    return { success: true, targetName: target.targetName };
  }

  static async announceCortosisGauntletBlock(actor) {
    return postCard(actor, 'Cortosis Gauntlet Block', '<p>You may use Block without a lightsaber while wearing a Cortosis Gauntlet. If you successfully Block a lightsaber attack with it, the attacking lightsaber is deactivated.</p>', { talentName: 'Cortosis Gauntlet Block' });
  }

  static async announcePreciseRedirect(actor) {
    return postCard(actor, 'Precise Redirect', '<p>When you successfully Redirect a blaster bolt and hit the new target, the redirected attack deals +1 die of damage.</p><p>This is a triggered rider, not a permanent damage bonus.</p>', { talentName: 'Precise Redirect' });
  }

  static async announceShotoFocus(actor) {
    return postCard(actor, 'Shoto Focus', '<p>When wielding both a one-handed lightsaber and a short lightsaber or guard shoto, you gain +2 competence bonus on attack rolls made with the short lightsaber or guard shoto.</p><p>This is weapon/loadout-contextual and is not applied as a global attack bonus.</p>', { talentName: 'Shoto Focus' });
  }

  static async announceWeaponSpecializationLightsabers(actor) {
    return postCard(actor, 'Weapon Specialization (Lightsabers)', '<p>You gain +2 bonus on melee damage rolls with lightsabers. This is applied in lightsaber damage context, not as a global damage modifier.</p>', { talentName: 'Weapon Specialization (Lightsabers)' });
  }

  static registerHooks() {
    if (globalThis.SWSE?.__lightsaberTalentActionsRegistered) return;
    globalThis.SWSE = globalThis.SWSE ?? {};
    globalThis.SWSE.__lightsaberTalentActionsRegistered = true;

    Hooks.on('combatTurn', async (combat, _prior, current) => {
      try {
        const actor = current?.combatant?.actor ?? combat?.combatant?.actor ?? null;
        if (!actor) return;
        await actor.unsetFlag?.(NS, BLOCK_DEFLECT_FLAG);
      } catch (err) {
        console.warn('[SWSE] Failed to reset Block/Deflect use state:', err);
      }
    });
  }
}

export function registerLightsaberTalentActions() {
  LightsaberTalentActions.registerHooks();
}
