import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ConditionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionEngine.js";
import { createEffectOnActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { GuardianSpiritActions } from "/systems/foundryvtt-swse/scripts/engine/talent/guardian-spirit-actions.js";

const NS = 'swse';
const ADEP_FLAG = 'adeptNegotiatorCondition';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slug(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function naturalD20(roll) {
  const direct = Number(roll?.natural ?? roll?.d20 ?? roll?.terms?.[0]?.results?.[0]?.result);
  if (Number.isFinite(direct) && direct >= 1 && direct <= 20) return direct;
  try {
    const dice = Array.from(roll?.dice ?? []);
    const d20 = dice.find(die => Number(die?.faces) === 20);
    const value = Number(d20?.results?.find?.(r => r?.active !== false)?.result ?? d20?.results?.[0]?.result);
    if (Number.isFinite(value) && value >= 1 && value <= 20) return value;
  } catch (_err) {}
  return null;
}

function hasTalent(actor, name) {
  return !!actor?.items?.some?.(item => item?.type === 'talent' && String(item?.name ?? '').toLowerCase() === String(name ?? '').toLowerCase());
}

function getLevel(actor) {
  return Number(actor?.system?.level?.heroic ?? actor?.system?.details?.level ?? actor?.system?.level ?? 1) || 1;
}

function getAbilityMod(actor, key) {
  return Number(actor?.system?.derived?.attributes?.[key]?.mod ?? actor?.system?.abilities?.[key]?.mod ?? actor?.system?.attributes?.[key]?.mod ?? 0) || 0;
}

function getDefense(actor, key) {
  const def = actor?.system?.derived?.defenses?.[key] ?? actor?.system?.defenses?.[key] ?? actor?.system?.attributes?.[key];
  return Number(def?.value ?? def?.total ?? def ?? 10) || 10;
}

function getSkillLabel(actor, key) {
  const skill = actor?.system?.skills?.[key] ?? actor?.system?.derived?.skills?.[key];
  return skill?.label ?? String(key ?? 'Skill').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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

function tokenOptions(sourceActor, { relation = 'any', maxSquares = null } = {}) {
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
      hidden: token.document?.hidden === true
    };
  }).filter(row => {
    if (row.actorId === sourceActor?.id) return false;
    if (relation === 'enemy' && row.disposition >= 0) return false;
    if (relation === 'ally' && row.disposition < 0) return false;
    if (Number.isFinite(Number(maxSquares)) && row.distance !== null && Number(row.distance) > Number(maxSquares)) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

async function promptToken(actor, title, { relation = 'any', maxSquares = null, note = '', fallbackLabel = 'Name' } = {}) {
  const options = tokenOptions(actor, { relation, maxSquares });
  const optionsHtml = options.map(row => {
    const dist = row.distance === null ? '' : ` (${row.distance} squares)`;
    return `<option value="token:${esc(row.id)}">${esc(row.name)}${esc(dist)}</option>`;
  }).join('');
  const content = `<form class="swse-dialog swse-consular-target-dialog">
    ${note ? `<p>${esc(note)}</p>` : ''}
    <div class="form-group">
      <label>Target</label>
      <select name="targetRef">
        ${optionsHtml}
        <option value="manual">Manual entry / not on scene</option>
      </select>
    </div>
    <div class="form-group"><label>${esc(fallbackLabel)}</label><input name="manualName" type="text" placeholder="Manual target name" /></div>
    <p class="notes">Line of sight, language, willingness, and exact range remain GM/player adjudicated when the scene cannot prove them.</p>
  </form>`;
  const result = await SWSEDialogV2.prompt({
    title,
    content,
    label: 'Continue',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      const ref = String(fd.get('targetRef') || 'manual');
      const manualName = String(fd.get('manualName') || '').trim();
      if (ref.startsWith('token:')) {
        const token = canvas?.tokens?.get?.(ref.slice(6)) ?? null;
        if (token?.actor) return { token, actor: token.actor, name: token.name ?? token.actor.name, manual: false };
      }
      return { token: null, actor: null, name: manualName || fallbackLabel || 'target', manual: true };
    }
  });
  return result;
}

async function postCard(actor, title, body, flags = {}) {
  const content = `<section class="swse-chat-card swse-chat-card--force-talent">
    <header class="swse-chat-card__header"><strong>${esc(title)}</strong><span>Jedi Consular Talent</span></header>
    <div class="swse-chat-card__body">${body}</div>
  </section>`;
  return SWSEChat.postHTML({ actor, content, flags: { swse: { consularTalent: true, ...flags } } });
}

export const AdeptNegotiatorSchema = Object.freeze({
  id: 'adept-negotiator',
  talentName: 'Adept Negotiator',
  actionType: 'standard',
  descriptor: 'Mind-Affecting',
  rangeSquares: 12,
  targetRules: {
    intelligenceMinimum: 3,
    mustSeeHearUnderstand: true,
    starshipTarget: false,
    appliesToSpecificCharacter: true
  },
  roll: {
    baseSkill: 'persuasion',
    forcePersuasionReplacementSkill: 'useTheForce',
    targetDefense: 'will',
    higherLevelDefenseBonus: 5
  },
  conditionTrack: {
    baseSteps: 1,
    masterNegotiatorAdditionalSteps: 1,
    hpDamage: false,
    physicalDamage: false,
    brokenResolveAtEndTrack: true
  }
});

export class ConsularTalentActions {
  static hasTalent(actor, name) { return hasTalent(actor, name); }

  static _encounterId() {
    return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
  }

  static _usesUtfForNegotiation(actor) {
    return hasTalent(actor, 'Force Persuasion');
  }

  static _turnKey() {
    return `${this._encounterId()}:${game?.combat?.round ?? 'noround'}:${game?.combat?.turn ?? 'noturn'}`;
  }

  static _forcePowerItems(actor) {
    return Array.from(actor?.items ?? []).filter(item => item?.type === 'force-power');
  }

  static _isFarseeing(item) {
    return slug(item?.name) === 'farseeing' || slug(item?.system?.slug) === 'farseeing';
  }

  static _findReadyFarseeing(actor) {
    return this._forcePowerItems(actor).find(item => this._isFarseeing(item) && item?.system?.spent !== true && item?.system?.discarded !== true) ?? null;
  }

  static _findSpentFarseeing(actor) {
    return this._forcePowerItems(actor).filter(item => this._isFarseeing(item) && (item?.system?.spent === true || item?.system?.discarded === true));
  }

  static async _spendReadyFarseeing(actor, source = 'farseeing-talent') {
    const farseeing = this._findReadyFarseeing(actor);
    if (!farseeing) throw new Error('A ready use of Farseeing is required.');
    await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
      _id: farseeing.id,
      'system.spent': true,
      'system.discarded': true,
      'system.lastSpent': Date.now(),
      'flags.swse.lastSpentBy': source
    }], { source, render: false });
    return farseeing;
  }

  static async _spendNormalForcePoint(actor, source = 'force-talent-normal-fp') {
    const current = SchemaAdapters.getForcePoints(actor);
    if (current <= 0) throw new Error('This talent requires 1 normal Force Point; temporary/bonus Force Points cannot be used.');
    await ActorEngine.updateActor(actor, SchemaAdapters.setForcePointsUpdate(Math.max(0, current - 1)), { source });
    return { spent: 1, remaining: Math.max(0, current - 1) };
  }

  static async _grantNormalForcePoint(actor, amount = 1, source = 'force-talent-grant-fp') {
    if (!actor || amount <= 0) return { granted: 0 };
    const current = SchemaAdapters.getForcePoints(actor);
    await ActorEngine.updateActor(actor, SchemaAdapters.setForcePointsUpdate(current + amount), { source });
    return { granted: amount, total: current + amount };
  }

  static _targetInt(actor) {
    return Number(actor?.system?.abilities?.int?.value ?? actor?.system?.attributes?.int?.value ?? actor?.system?.abilities?.int?.total ?? 10) || 10;
  }

  static async promptAdeptNegotiator(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Adept Negotiator')) {
      ui?.notifications?.warn?.('Adept Negotiator talent required.');
      return null;
    }
    const target = await promptToken(actor, 'Adept Negotiator', {
      relation: 'enemy',
      maxSquares: AdeptNegotiatorSchema.rangeSquares,
      fallbackLabel: 'opponent',
      note: 'Choose one opponent with Intelligence 3+ within 12 squares that can see, hear, and understand you.'
    });
    if (!target) return null;
    if (target.actor && this._targetInt(target.actor) < 3) {
      ui?.notifications?.warn?.('Adept Negotiator requires an Intelligence 3+ target.');
      return null;
    }

    const useUtf = this._usesUtfForNegotiation(actor);
    const skillKey = useUtf ? 'useTheForce' : 'persuasion';
    const targetWill = target.actor ? getDefense(target.actor, 'will') : 10;
    const higherLevel = target.actor ? getLevel(target.actor) > getLevel(actor) : false;
    const dc = targetWill + (higherLevel ? 5 : 0);
    const modResult = await showRollModifiersDialog({
      title: `Adept Negotiator — ${getSkillLabel(actor, skillKey)}`,
      rollType: skillKey === 'useTheForce' ? 'force' : 'skill',
      actor,
      skillKey,
      sourceElement,
      sheet: null,
      showCover: false,
      showConcealment: false
    });
    if (modResult === null) return null;

    const roll = await rollSkillCheck(actor, skillKey, {
      ...modResult,
      dc,
      source: 'adept-negotiator',
      skillUse: { key: 'adept-negotiator', label: 'Adept Negotiator' },
      targetContext: {
        targetName: target.name,
        targetActorId: target.actor?.id ?? null,
        willDefense: targetWill,
        higherLevelBonus: higherLevel ? 5 : 0,
        conditionTrackOnly: true,
        mindAffecting: true
      },
      sourceElement,
      showRollCompanion: true
    });
    if (!roll) return null;
    return this.resolveAdeptNegotiator(actor, target, { roll, dc, skillKey, useUtf, higherLevel });
  }

  static async resolveAdeptNegotiator(actor, target, { roll, dc, skillKey, useUtf = false, higherLevel = false } = {}) {
    const total = Number(roll?.roll?.total ?? roll?.total ?? 0) || 0;
    const success = total >= Number(dc ?? 0);
    const targetName = target?.name ?? target?.actor?.name ?? 'target';
    if (!success) {
      await postCard(actor, 'Adept Negotiator', `<p>${esc(actor.name)} failed to weaken <strong>${esc(targetName)}</strong> (${total} vs Will DC ${dc}).</p><p><strong>Effect:</strong> no Condition Track movement.</p>`, { talentName: 'Adept Negotiator', success: false });
      return { success: false, roll: total, dc };
    }

    const hasMaster = hasTalent(actor, 'Master Negotiator');
    const steps = AdeptNegotiatorSchema.conditionTrack.baseSteps + (hasMaster ? AdeptNegotiatorSchema.conditionTrack.masterNegotiatorAdditionalSteps : 0);
    let conditionResult = null;
    let brokenResolve = false;
    const targetActor = target?.actor ?? null;
    if (targetActor) {
      const before = ConditionEngine.calculateConditionStep(targetActor, { source: 'adept-negotiator-precheck' });
      const oldStep = Number(before?.currentStep ?? 0) || 0;
      const maxStep = Number(before?.maxStep ?? 5) || 5;
      const newStep = Math.min(maxStep, oldStep + steps);
      conditionResult = await ConditionEngine.applyConditionStep(targetActor, newStep, { source: 'adept-negotiator-condition-track' });
      brokenResolve = newStep >= maxStep;
      await targetActor.setFlag(NS, ADEP_FLAG, {
        sourceActorId: actor.id,
        sourceActorName: actor.name,
        previousStep: oldStep,
        currentStep: newStep,
        intendedSteps: steps,
        appliedSteps: Math.max(0, newStep - oldStep),
        maxStep,
        brokenResolve,
        mindAffecting: true,
        conditionTrackOnly: true,
        noHpDamage: true,
        noPhysicalDamage: true,
        combatId: this._encounterId(),
        appliedAt: Date.now()
      });
      await createEffectOnActor(targetActor, {
        name: brokenResolve ? `Adept Negotiator: Broken Resolve (${actor.name})` : `Adept Negotiator (${actor.name})`,
        icon: 'icons/svg/downgrade.svg',
        changes: [],
        disabled: false,
        duration: { rounds: 999, seconds: null },
        flags: {
          swse: {
            source: 'talent',
            talentName: 'Adept Negotiator',
            sourceActorId: actor.id,
            sourceActorName: actor.name,
            mindAffecting: true,
            conditionTrackOnly: true,
            noHpDamage: true,
            noPhysicalDamage: true,
            previousStep: oldStep,
            currentStep: newStep,
            stepsMoved: Math.max(0, newStep - oldStep),
            masterNegotiator: hasMaster,
            brokenResolve,
            note: brokenResolve ? 'At the end of the Condition Track, target cannot attack the source or allies unless attacked first.' : 'Condition Track movement from Adept Negotiator.'
          }
        }
      }, { source: 'adept-negotiator' });
    }

    const conditionLine = targetActor
      ? `<p><strong>Condition Track:</strong> ${esc(targetName)} moves ${steps} intended step${steps === 1 ? '' : 's'} down the track${hasMaster ? ' (Master Negotiator included)' : ''}. ${brokenResolve ? 'Broken Resolve restriction applies.' : ''}</p>`
      : `<p><strong>Condition Track:</strong> GM applies ${steps} step${steps === 1 ? '' : 's'} to ${esc(targetName)}. No HP damage is dealt.</p>`;
    await postCard(actor, 'Adept Negotiator', `
      <p>${esc(actor.name)} succeeds against <strong>${esc(targetName)}</strong> (${total} vs Will DC ${dc}${higherLevel ? ', including +5 higher-level bonus' : ''}).</p>
      ${conditionLine}
      <p><strong>Important:</strong> This is Condition Track movement only. It is not physical damage, does not roll damage, does not reduce HP, and affects the specific character rather than a starship.</p>
      <p><strong>Roll Skill:</strong> ${esc(getSkillLabel(actor, skillKey))}${useUtf ? ' via Force Persuasion' : ''}. <strong>Descriptor:</strong> Mind-Affecting.</p>`,
      { talentName: 'Adept Negotiator', success: true, conditionTrackOnly: true, targetActorId: targetActor?.id ?? null });
    return { success: true, roll: total, dc, conditionResult, conditionTrackOnly: true };
  }

  static async promptSkilledAdvisor(actor) {
    if (!hasTalent(actor, 'Skilled Advisor')) {
      ui?.notifications?.warn?.('Skilled Advisor talent required.');
      return null;
    }
    const ally = await promptToken(actor, 'Skilled Advisor', { relation: 'ally', fallbackLabel: 'ally', note: 'Choose a willing ally who can hear and understand your advice. You cannot advise yourself.' });
    if (!ally) return null;
    const skills = Object.entries(actor?.system?.skills ?? {}).map(([key, data]) => ({ key, label: data?.label ?? getSkillLabel(actor, key) })).sort((a, b) => a.label.localeCompare(b.label));
    const content = `<form class="swse-dialog swse-skilled-advisor-dialog">
      <p>Grant a +5 bonus on the ally's next Skill Check. Spend a Force Point to increase this to +10.</p>
      <div class="form-group"><label>Skill</label><select name="skillKey">${skills.map(s => `<option value="${esc(s.key)}">${esc(s.label)}</option>`).join('')}</select></div>
      <label class="checkbox"><input type="checkbox" name="useForcePoint" /> Spend 1 Force Point for +10 instead</label>
      <p class="notes">Full-Round Action · Mind-Affecting · applies to the ally's next chosen Skill Check.</p>
    </form>`;
    const choice = await SWSEDialogV2.prompt({ title: 'Skilled Advisor', content, label: 'Advise Ally', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      return { skillKey: String(fd.get('skillKey') || 'useTheForce'), useForcePoint: fd.get('useForcePoint') === 'on' };
    }});
    if (!choice) return null;
    return this.applySkilledAdvisor(actor, ally, choice);
  }

  static async applySkilledAdvisor(actor, ally, { skillKey = 'useTheForce', useForcePoint = false } = {}) {
    if (useForcePoint) {
      const spend = await ActorEngine.spendForcePoints(actor, 1);
      if (!spend?.spent) {
        ui?.notifications?.warn?.('No Force Point available for Skilled Advisor +10.');
        return null;
      }
    }
    const bonus = useForcePoint ? 10 : 5;
    const allyActor = ally?.actor ?? null;
    if (allyActor) {
      await createEffectOnActor(allyActor, {
        name: `Skilled Advisor: +${bonus} ${getSkillLabel(allyActor, skillKey)}`,
        icon: 'icons/svg/aura.svg',
        changes: [{ key: `system.skills.${skillKey}.bonus`, mode: 2, value: String(bonus), priority: 20 }],
        disabled: false,
        duration: { rounds: 1, turns: 1 },
        flags: { swse: { talentName: 'Skilled Advisor', sourceActorId: actor.id, mindAffecting: true, nextSkillCheckOnly: true, skillKey, bonus, forcePointSpent: useForcePoint } }
      }, { source: 'skilled-advisor' });
    }
    await postCard(actor, 'Skilled Advisor', `<p>${esc(actor.name)} advises <strong>${esc(ally?.name ?? allyActor?.name ?? 'an ally')}</strong>.</p><p><strong>Effect:</strong> +${bonus} on the ally's next ${esc(getSkillLabel(allyActor ?? actor, skillKey))} check.${useForcePoint ? ' One Force Point was spent.' : ''}</p><p><strong>Descriptor:</strong> Mind-Affecting.</p>`, { talentName: 'Skilled Advisor', bonus, skillKey });
    return { success: true, bonus, skillKey };
  }

  static async promptAdversaryLore(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Adversary Lore')) {
      ui?.notifications?.warn?.('Adversary Lore talent required.');
      return null;
    }
    const target = await promptToken(actor, 'Adversary Lore', { relation: 'enemy', maxSquares: 12, fallbackLabel: 'enemy', note: 'Target one creature within 12 squares and line of sight.' });
    if (!target) return null;
    const dc = target.actor ? getDefense(target.actor, 'will') : 10;
    const modResult = await showRollModifiersDialog({ title: 'Adversary Lore — Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', { ...modResult, dc, source: 'adversary-lore', skillUse: { key: 'adversary-lore', label: 'Adversary Lore' }, targetContext: { targetName: target.name, willDefense: dc }, sourceElement });
    if (!roll) return null;
    const total = Number(roll.roll?.total ?? 0) || 0;
    const success = roll.success === true;
    const hasKnowWeakness = hasTalent(actor, 'Know Weakness');
    if (success && target.actor) {
      await createEffectOnActor(target.actor, {
        name: `Adversary Lore (${actor.name})`,
        icon: 'icons/svg/target.svg',
        changes: [],
        disabled: false,
        duration: { rounds: 1, turns: 1 },
        flags: { swse: { talentName: 'Adversary Lore', sourceActorId: actor.id, manualDefenseAdjustment: true, reflexPenaltyAgainstSourceAndAudibleAllies: -2, knowWeaknessBonusDamage: hasKnowWeakness ? '1d6' : null, expiresEndOfSourceNextTurn: true } }
      }, { source: 'adversary-lore' });
      if (hasKnowWeakness) {
        await createEffectOnActor(target.actor, {
          name: `Know Weakness (${actor.name})`,
          icon: 'icons/svg/blood.svg',
          changes: [],
          disabled: false,
          duration: { rounds: 1, turns: 1 },
          flags: { swse: { talentName: 'Know Weakness', sourceActorId: actor.id, bonusDamage: '1d6', appliesToAttacksFromAudibleAllies: true, expiresEndOfSourceNextTurn: true } }
        }, { source: 'know-weakness' });
      }
    }
    const knowWeaknessLine = success && hasKnowWeakness ? '<p><strong>Know Weakness:</strong> successful attacks by you or allies who can hear and understand you deal +1d6 damage to this target until the end of your next turn.</p>' : '';
    await postCard(actor, 'Adversary Lore', `<p>${success ? 'Success' : 'Failure'} against <strong>${esc(target.name)}</strong> (${total} vs Will DC ${dc}).</p>${success ? '<p><strong>Effect:</strong> target takes a -2 penalty to Reflex Defense against you and allies who can hear and understand you until the end of your next turn. This is target-scoped and is not applied as a global Reflex penalty.</p>' : ''}${knowWeaknessLine}`, { talentName: 'Adversary Lore', success, knowWeakness: success && hasKnowWeakness });
    return { success, roll: total, dc, knowWeakness: success && hasKnowWeakness };
  }

  static async promptCleanseMind(actor) {
    if (!hasTalent(actor, 'Cleanse Mind')) {
      ui?.notifications?.warn?.('Cleanse Mind talent required.');
      return null;
    }
    const ally = await promptToken(actor, 'Cleanse Mind', { relation: 'ally', fallbackLabel: 'ally', note: 'Choose one allied target in line of sight and remove one ongoing Mind-Affecting effect.' });
    if (!ally) return null;
    return this.cleanseMind(actor, ally);
  }

  static async cleanseMind(actor, ally) {
    const allyActor = ally?.actor ?? null;
    if (!allyActor) {
      await postCard(actor, 'Cleanse Mind', `<p>Remove one ongoing Mind-Affecting effect from <strong>${esc(ally?.name ?? 'the ally')}</strong>. GM applies the removal because no actor document was selected.</p>`, { talentName: 'Cleanse Mind' });
      return { success: true, manual: true };
    }
    const candidates = Array.from(allyActor.effects ?? []).filter(effect => {
      const f = effect.flags?.swse ?? {};
      const text = `${effect.name ?? effect.label ?? ''} ${f.talentName ?? ''} ${f.source ?? ''}`.toLowerCase();
      return f.mindAffecting === true || f.adeptNegotiator === true || /adept negotiator|mind trick|demand surrender|weaken resolve|broken resolve|suppress force|aversion|illusion/.test(text);
    });
    const adept = allyActor.getFlag?.(NS, ADEP_FLAG) ?? null;
    const optionHtml = [
      ...(adept ? [`<option value="adept-condition">Adept Negotiator Condition Track effect</option>`] : []),
      ...candidates.map(effect => `<option value="effect:${esc(effect.id)}">${esc(effect.name ?? effect.label ?? 'Mind-Affecting Effect')}</option>`),
      '<option value="manual">Manual GM-adjudicated effect</option>'
    ].join('');
    const content = `<form class="swse-dialog"><p>Choose one ongoing Mind-Affecting effect to remove.</p><div class="form-group"><label>Effect</label><select name="choice">${optionHtml}</select></div></form>`;
    const result = await SWSEDialogV2.prompt({ title: 'Cleanse Mind', content, label: 'Cleanse', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      return { choice: String(new FormData(form).get('choice') || 'manual') };
    }});
    if (!result) return null;
    if (result.choice === 'adept-condition' && adept) {
      const previous = Number(adept.previousStep ?? allyActor.system?.conditionTrack?.current ?? 0) || 0;
      await ConditionEngine.applyConditionStep(allyActor, previous, { source: 'cleanse-mind-adept-negotiator' });
      const ids = candidates.filter(e => /adept negotiator|broken resolve/i.test(String(e.name ?? e.label ?? ''))).map(e => e.id).filter(Boolean);
      if (ids.length) await ActorEngine.deleteEmbeddedDocuments(allyActor, 'ActiveEffect', ids, { source: 'cleanse-mind' });
      await allyActor.unsetFlag?.(NS, ADEP_FLAG);
    } else if (result.choice.startsWith('effect:')) {
      const id = result.choice.slice(7);
      await ActorEngine.deleteEmbeddedDocuments(allyActor, 'ActiveEffect', [id], { source: 'cleanse-mind' });
    }
    await postCard(actor, 'Cleanse Mind', `<p>${esc(actor.name)} removes one Mind-Affecting effect from <strong>${esc(allyActor.name)}</strong>.</p><p><strong>Action:</strong> Swift Action.</p>`, { talentName: 'Cleanse Mind', targetActorId: allyActor.id });
    return { success: true };
  }

  static async promptConsularsVitality(actor) {
    if (!hasTalent(actor, "Consular's Vitality")) {
      ui?.notifications?.warn?.("Consular's Vitality talent required.");
      return null;
    }
    const ally = await promptToken(actor, "Consular's Vitality", { relation: 'ally', maxSquares: 12, fallbackLabel: 'ally', note: 'Grant one ally within 12 squares and line of sight Bonus Hit Points until the beginning of your next turn.' });
    if (!ally) return null;
    const amount = Math.max(0, 5 + getAbilityMod(actor, 'cha'));
    if (ally.actor) {
      const currentTemp = Number(ally.actor.system?.hp?.temp ?? ally.actor.system?.health?.temp ?? 0) || 0;
      await ActorEngine.updateActor(ally.actor, { 'system.hp.temp': Math.max(currentTemp, amount) }, { source: 'consulars-vitality' });
      await createEffectOnActor(ally.actor, { name: `Consular's Vitality (${actor.name})`, icon: 'icons/svg/heal.svg', changes: [], disabled: false, duration: { rounds: 1, turns: 1 }, flags: { swse: { talentName: "Consular's Vitality", sourceActorId: actor.id, bonusHitPoints: amount, expiresBeginningOfSourceNextTurn: true } } }, { source: 'consulars-vitality' });
    }
    await createEffectOnActor(actor, { name: "Consular's Vitality UTF Penalty", icon: 'icons/svg/downgrade.svg', changes: [{ key: 'system.skills.useTheForce.bonus', mode: 2, value: '-5', priority: 20 }], disabled: false, duration: { rounds: 1, turns: 1 }, flags: { swse: { talentName: "Consular's Vitality", useTheForcePenalty: -5, expiresBeginningOfSourceNextTurn: true } } }, { source: 'consulars-vitality' });
    await postCard(actor, "Consular's Vitality", `<p><strong>${esc(ally?.name ?? 'Ally')}</strong> gains ${amount} Bonus Hit Points until the beginning of your next turn.</p><p>${esc(actor.name)} takes a -5 penalty on Use the Force checks until the beginning of their next turn.</p>`, { talentName: "Consular's Vitality", bonusHitPoints: amount });
    return { success: true, bonusHitPoints: amount };
  }

  static async promptConsularsWisdom(actor) {
    if (!hasTalent(actor, "Consular's Wisdom")) {
      ui?.notifications?.warn?.("Consular's Wisdom talent required.");
      return null;
    }
    const flag = actor.getFlag?.(NS, 'encounterUses.consularsWisdom') ?? {};
    if (flag?.encounterId === this._encounterId() && flag?.used === true) {
      ui?.notifications?.warn?.("Consular's Wisdom has already been used this encounter.");
      return null;
    }
    const ally = await promptToken(actor, "Consular's Wisdom", { relation: 'ally', fallbackLabel: 'ally', note: 'Choose one ally in line of sight who can hear and understand you.' });
    if (!ally) return null;
    const bonus = Math.max(0, getAbilityMod(actor, 'wis'));
    if (ally.actor) {
      await createEffectOnActor(ally.actor, { name: `Consular's Wisdom (${actor.name})`, icon: 'icons/svg/shield.svg', changes: [], disabled: false, duration: { rounds: 999 }, flags: { swse: { talentName: "Consular's Wisdom", sourceActorId: actor.id, manualDefenseAdjustment: true, mindAffectingWillBonus: bonus, appliesVs: 'Mind-Affecting effects', encounterId: this._encounterId() } } }, { source: 'consulars-wisdom' });
    }
    await actor.setFlag(NS, 'encounterUses.consularsWisdom', { encounterId: this._encounterId(), used: true, usedAt: Date.now(), targetName: ally.name, bonus });
    await postCard(actor, "Consular's Wisdom", `<p><strong>${esc(ally?.name ?? 'Ally')}</strong> adds your Wisdom bonus (${bonus}) to Will Defense against Mind-Affecting effects until the end of the encounter.</p><p>This is a conditional defense bonus and is not applied globally.</p>`, { talentName: "Consular's Wisdom", bonus });
    return { success: true, bonus };
  }

  static async promptEntreatAid(actor) {
    if (!hasTalent(actor, 'Entreat Aid')) {
      ui?.notifications?.warn?.('Entreat Aid talent required.');
      return null;
    }
    const ally = await promptToken(actor, 'Entreat Aid', { relation: 'ally', maxSquares: 1, fallbackLabel: 'adjacent ally', note: 'Choose one adjacent ally. That ally uses Aid Another as a Reaction to assist your next Skill Check before the end of your turn.' });
    if (!ally) return null;
    const turnKey = this._turnKey();
    const flag = actor.getFlag?.(NS, 'entreatAid') ?? {};
    const used = Array.isArray(flag.usedThisTurn) && flag.turnKey === turnKey ? flag.usedThisTurn : [];
    const allyKey = ally.actor?.id ?? ally.name;
    if (used.includes(allyKey)) {
      ui?.notifications?.warn?.(`${ally.name} has already aided you since the end of your last turn.`);
      return null;
    }
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Entreat Aid requires spending 1 Force Point.');
      return null;
    }
    await actor.setFlag(NS, 'entreatAid', { turnKey, usedThisTurn: [...used, allyKey], pending: { allyName: ally.name, allyActorId: ally.actor?.id ?? null, createdAt: Date.now(), expires: 'end-of-turn' } });
    await postCard(actor, 'Entreat Aid', `<p>${esc(actor.name)} spends a Force Point. <strong>${esc(ally.name)}</strong> may use Aid Another as a Reaction to assist ${esc(actor.name)}'s next Skill Check before the end of this turn.</p><p>The benefit is lost if the Skill Check is not made before the end of the turn.</p>`, { talentName: 'Entreat Aid', allyActorId: ally.actor?.id ?? null });
    return { success: true, allyName: ally.name };
  }

  static async promptForceOfWill(actor) {
    if (!hasTalent(actor, 'Force of Will')) {
      ui?.notifications?.warn?.('Force of Will talent required.');
      return null;
    }
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Force of Will requires spending 1 Force Point.');
      return null;
    }
    const allies = tokenOptions(actor, { relation: 'ally', maxSquares: 6 });
    const affected = [];
    for (const row of allies) {
      const token = canvas?.tokens?.get?.(row.id);
      const allyActor = token?.actor ?? null;
      if (!allyActor) continue;
      affected.push(allyActor.name);
      await createEffectOnActor(allyActor, {
        name: `Force of Will (${actor.name})`,
        icon: 'icons/svg/shield.svg',
        changes: [],
        disabled: false,
        duration: { rounds: 999 },
        flags: { swse: { talentName: 'Force of Will', sourceActorId: actor.id, mindAffecting: true, manualDefenseAdjustment: true, insightWillBonus: 2, rangeSquares: 6, expires: 'encounter', note: 'Ally keeps this +2 insight Will bonus only while within 6 squares of the source and while the source is conscious/alive.' } }
      }, { source: 'force-of-will' });
    }
    const list = affected.length ? affected.map(esc).join(', ') : 'all eligible allies within 6 squares (GM adjudicates)';
    await postCard(actor, 'Force of Will', `<p>${esc(actor.name)} spends a Force Point to grant a +2 insight bonus to Will Defense to <strong>${list}</strong> for the remainder of the encounter.</p><p>Affected allies must remain within 6 squares and lose the bonus if ${esc(actor.name)} is knocked unconscious or killed. Mind-Affecting.</p><p>${esc(actor.name)}'s personal +2 insight Will Defense is a passive benefit of the talent.</p>`, { talentName: 'Force of Will', affected });
    return { success: true, affected };
  }

  static async promptGuidingStrikes(actor) {
    if (!hasTalent(actor, 'Guiding Strikes')) {
      ui?.notifications?.warn?.('Guiding Strikes talent required.');
      return null;
    }
    const target = await promptToken(actor, 'Guiding Strikes', { relation: 'enemy', fallbackLabel: 'target damaged by your lightsaber', note: 'Use after you deal damage with a lightsaber attack on your turn. Choose the damaged target.' });
    if (!target) return null;
    if (target.actor) {
      await createEffectOnActor(target.actor, {
        name: `Guiding Strikes (${actor.name})`,
        icon: 'icons/svg/sword.svg',
        changes: [],
        disabled: false,
        duration: { rounds: 1, turns: 1 },
        flags: { swse: { talentName: 'Guiding Strikes', sourceActorId: actor.id, meleeAttackBonusForAdjacentAllies: 2, expiresStartOfSourceNextTurn: true, note: 'Allies adjacent to this target at activation gain +2 circumstance bonus to melee attack rolls against it.' } }
      }, { source: 'guiding-strikes' });
    }
    await postCard(actor, 'Guiding Strikes', `<p>Allies adjacent to <strong>${esc(target.name)}</strong> gain a +2 circumstance bonus to melee attack rolls against that target until the start of ${esc(actor.name)}'s next turn.</p><p>Requirement: ${esc(actor.name)} dealt damage to that target with a lightsaber attack this turn.</p>`, { talentName: 'Guiding Strikes', targetActorId: target.actor?.id ?? null });
    return { success: true, targetName: target.name };
  }

  static async promptImprovedConsularsVitality(actor) {
    if (!hasTalent(actor, "Improved Consular's Vitality")) {
      ui?.notifications?.warn?.("Improved Consular's Vitality talent required.");
      return null;
    }
    return this.promptConsularsVitality(actor);
  }

  static async promptRenewVision(actor) {
    if (!hasTalent(actor, 'Renew Vision')) {
      ui?.notifications?.warn?.('Renew Vision talent required.');
      return null;
    }
    const flag = actor.getFlag?.(NS, 'encounterUses.renewVision') ?? {};
    if (flag?.encounterId === this._encounterId() && flag?.used === true) {
      ui?.notifications?.warn?.('Renew Vision has already been used this encounter.');
      return null;
    }
    const spent = this._findSpentFarseeing(actor);
    if (!spent.length) {
      ui?.notifications?.info?.('No expended uses of Farseeing to recover.');
      return null;
    }
    await ActorEngine.updateEmbeddedDocuments(actor, 'Item', spent.map(power => ({ _id: power.id, 'system.spent': false, 'system.discarded': false, 'system.lastRecovered': Date.now(), 'flags.swse.lastRecoverySource': 'renew-vision' })), { source: 'renew-vision', render: false });
    await actor.setFlag(NS, 'encounterUses.renewVision', { encounterId: this._encounterId(), used: true, recovered: spent.length, usedAt: Date.now() });
    await postCard(actor, 'Renew Vision', `<p>${esc(actor.name)} regains all expended uses of <strong>Farseeing</strong> (${spent.length} recovered).</p><p><strong>Action:</strong> Swift Action · once per encounter.</p>`, { talentName: 'Renew Vision', recovered: spent.length });
    return { success: true, recovered: spent.length };
  }

  static async promptVisionaryAttack(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Visionary Attack')) {
      ui?.notifications?.warn?.('Visionary Attack talent required.');
      return null;
    }
    const target = await promptToken(actor, 'Visionary Attack', { relation: 'enemy', maxSquares: 12, fallbackLabel: 'target of missed attack', note: 'Use as a Reaction after you or an ally within 12 squares misses. Choose the target of the missed attack.' });
    if (!target) return null;
    const farseeing = await this._spendReadyFarseeing(actor, 'visionary-attack');
    const dc = target.actor ? getDefense(target.actor, 'will') : 10;
    const modResult = await showRollModifiersDialog({ title: 'Visionary Attack — Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', { ...modResult, dc, source: 'visionary-attack', skillUse: { key: 'visionary-attack', label: 'Visionary Attack' }, targetContext: { targetName: target.name, willDefense: dc }, sourceElement });
    if (!roll) return null;
    const total = Number(roll.roll?.total ?? 0) || 0;
    const success = roll.success === true;
    await createEffectOnActor(actor, { name: 'Visionary Attack UTF Penalty', icon: 'icons/svg/downgrade.svg', changes: [{ key: 'system.skills.useTheForce.bonus', mode: 2, value: '-5', priority: 20 }], disabled: false, duration: { rounds: 1, turns: 1 }, flags: { swse: { talentName: 'Visionary Attack', cumulativeUtfPenalty: -5, expiresBeginningOfSourceNextTurn: true } } }, { source: 'visionary-attack' });
    await postCard(actor, 'Visionary Attack', `<p>${esc(actor.name)} expends <strong>${esc(farseeing.name)}</strong> and rolls Use the Force against <strong>${esc(target.name)}</strong> (${total} vs Will DC ${dc}).</p>${success ? '<p><strong>Success:</strong> the attacker may reroll the missed attack roll. This attack can only benefit from Visionary Attack once.</p>' : '<p><strong>Failure:</strong> no reroll is granted.</p>'}<p>${esc(actor.name)} takes a cumulative -5 penalty on Use the Force checks until the beginning of their next turn.</p>`, { talentName: 'Visionary Attack', success });
    return { success, roll: total, dc };
  }

  static async promptVisionaryDefense(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Visionary Defense')) {
      ui?.notifications?.warn?.('Visionary Defense talent required.');
      return null;
    }
    const attacker = await promptToken(actor, 'Visionary Defense', { relation: 'enemy', maxSquares: 12, fallbackLabel: 'attacker', note: 'Use as a Reaction after you or an ally within 12 squares is targeted, before the attack result is known. Choose the attacker.' });
    if (!attacker) return null;
    const protectedTarget = await promptToken(actor, 'Visionary Defense — Protected Target', { relation: 'ally', maxSquares: 12, fallbackLabel: 'protected target', note: 'Choose the target of the incoming attack, or use manual entry if not represented by a token.' });
    if (!protectedTarget) return null;
    const farseeing = await this._spendReadyFarseeing(actor, 'visionary-defense');
    const dc = attacker.actor ? getDefense(attacker.actor, 'will') : 10;
    const modResult = await showRollModifiersDialog({ title: 'Visionary Defense — Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', { ...modResult, dc, source: 'visionary-defense', skillUse: { key: 'visionary-defense', label: 'Visionary Defense' }, targetContext: { targetName: attacker.name, willDefense: dc }, sourceElement });
    if (!roll) return null;
    const total = Number(roll.roll?.total ?? 0) || 0;
    const success = roll.success === true;
    if (success && protectedTarget.actor) {
      await createEffectOnActor(protectedTarget.actor, { name: `Visionary Defense (${actor.name})`, icon: 'icons/svg/shield.svg', changes: [], disabled: false, duration: { rounds: 1, turns: 1 }, flags: { swse: { talentName: 'Visionary Defense', sourceActorId: actor.id, forceReflexBonus: 5, oneAttackOnly: true, attackerName: attacker.name } } }, { source: 'visionary-defense' });
    }
    await createEffectOnActor(actor, { name: 'Visionary Defense UTF Penalty', icon: 'icons/svg/downgrade.svg', changes: [{ key: 'system.skills.useTheForce.bonus', mode: 2, value: '-5', priority: 20 }], disabled: false, duration: { rounds: 1, turns: 1 }, flags: { swse: { talentName: 'Visionary Defense', cumulativeUtfPenalty: -5, expiresBeginningOfSourceNextTurn: true } } }, { source: 'visionary-defense' });
    await postCard(actor, 'Visionary Defense', `<p>${esc(actor.name)} expends <strong>${esc(farseeing.name)}</strong> and rolls Use the Force against <strong>${esc(attacker.name)}</strong> (${total} vs Will DC ${dc}).</p>${success ? `<p><strong>Success:</strong> ${esc(protectedTarget.name)} gains a +5 Force bonus to Reflex Defense against this attack only.</p>` : '<p><strong>Failure:</strong> no Reflex bonus is granted.</p>'}<p>${esc(actor.name)} takes a cumulative -5 penalty on Use the Force checks until the beginning of their next turn.</p>`, { talentName: 'Visionary Defense', success });
    return { success, roll: total, dc };
  }

  static async promptWatchCircleInitiate(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'WatchCircle Initiate')) {
      ui?.notifications?.warn?.('WatchCircle Initiate talent required.');
      return null;
    }
    const ally = await promptToken(actor, 'WatchCircle Initiate', { relation: 'ally', fallbackLabel: 'ally', note: 'Choose one ally within line of sight to receive 1 Force Point if your DC 15 Use the Force check succeeds.' });
    if (!ally) return null;
    const farseeing = await this._spendReadyFarseeing(actor, 'watchcircle-initiate');
    const modResult = await showRollModifiersDialog({ title: 'WatchCircle Initiate — DC 15 Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', { ...modResult, dc: 15, source: 'watchcircle-initiate', skillUse: { key: 'watchcircle-initiate', label: 'WatchCircle Initiate' }, sourceElement });
    if (!roll) return null;
    const total = Number(roll.roll?.total ?? 0) || 0;
    const success = roll.success === true;
    let transfer = null;
    if (success) {
      try {
        await this._spendNormalForcePoint(actor, 'watchcircle-initiate-normal-fp');
        if (ally.actor) transfer = await this._grantNormalForcePoint(ally.actor, 1, 'watchcircle-initiate-grant-fp');
      } catch (err) {
        ui?.notifications?.warn?.(err.message);
        await postCard(actor, 'WatchCircle Initiate', `<p>Use the Force succeeds (${total} vs DC 15), but the Force Point transfer could not complete: ${esc(err.message)}</p>`, { talentName: 'WatchCircle Initiate', success: false, transferFailed: true });
        return { success: false, transferFailed: true, error: err.message };
      }
    }
    await postCard(actor, 'WatchCircle Initiate', `<p>${esc(actor.name)} expends <strong>${esc(farseeing.name)}</strong> and rolls Use the Force (${total} vs DC 15).</p>${success ? `<p><strong>Success:</strong> ${esc(actor.name)} loses 1 normal Force Point and ${esc(ally.name)} gains 1 Force Point.${ally.actor ? '' : ' GM applies the gain manually.'}</p>` : '<p><strong>Failure:</strong> no Force Point is transferred.</p>'}<p>This counts as using Farseeing, replacing Farseeing's normal rules and effects.</p>`, { talentName: 'WatchCircle Initiate', success, allyActorId: ally.actor?.id ?? null });
    return { success, roll: total, transfer };
  }

  static async promptAcrobaticRecovery(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Acrobatic Recovery')) {
      ui?.notifications?.warn?.('Acrobatic Recovery talent required.');
      return null;
    }
    const modResult = await showRollModifiersDialog({ title: 'Acrobatic Recovery - DC 20 Acrobatics', rollType: 'skill', actor, skillKey: 'acrobatics', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'acrobatics', { ...modResult, dc: 20, source: 'acrobatic-recovery', skillUse: { key: 'acrobatic-recovery', label: 'Acrobatic Recovery' }, sourceElement });
    if (!roll) return null;
    const total = Number(roll.roll?.total ?? roll.total ?? 0) || 0;
    const success = total >= 20;
    await postCard(actor, 'Acrobatic Recovery', success
      ? '<p>' + esc(actor.name) + ' succeeds on a DC 20 Acrobatics check (' + total + ') and remains standing instead of falling Prone.</p>'
      : '<p>' + esc(actor.name) + ' fails the DC 20 Acrobatics check (' + total + '); the Prone effect proceeds.</p>',
      { talentName: 'Acrobatic Recovery', success, dc: 20 });
    return { success, roll: total, dc: 20 };
  }

  static async promptBattleMeditation(actor, { improved = false } = {}) {
    if (!hasTalent(actor, 'Battle Meditation')) {
      ui?.notifications?.warn?.('Battle Meditation talent required.');
      return null;
    }
    const useImproved = improved === true || hasTalent(actor, 'Improved Battle Meditation');
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Battle Meditation requires spending 1 Force Point.');
      return null;
    }
    const range = useImproved ? 12 : 6;
    const allies = tokenOptions(actor, { relation: 'ally', maxSquares: range });
    const enemies = useImproved ? tokenOptions(actor, { relation: 'enemy', maxSquares: range }) : [];
    const affectedAllies = [actor.name];
    await createEffectOnActor(actor, {
      name: 'Battle Meditation',
      icon: 'icons/svg/aura.svg',
      changes: [],
      disabled: false,
      duration: { rounds: 999 },
      flags: { swse: { talentName: 'Battle Meditation', sourceActorId: actor.id, insightAttackBonus: 1, rangeSquares: range, mindAffecting: true, starshipScaleGunners: true, manualAttackAdjustment: true, expires: 'encounter' } }
    }, { source: 'battle-meditation' });
    for (const row of allies) {
      const token = canvas?.tokens?.get?.(row.id);
      const allyActor = token?.actor ?? null;
      if (!allyActor) continue;
      affectedAllies.push(allyActor.name);
      await createEffectOnActor(allyActor, {
        name: 'Battle Meditation (' + actor.name + ')',
        icon: 'icons/svg/aura.svg',
        changes: [],
        disabled: false,
        duration: { rounds: 999 },
        flags: { swse: { talentName: 'Battle Meditation', sourceActorId: actor.id, insightAttackBonus: 1, rangeSquares: range, mindAffecting: true, starshipScaleGunners: true, manualAttackAdjustment: true, expires: 'encounter', note: 'Retain the bonus only while within the Battle Meditation radius and while the source is conscious/alive.' } }
      }, { source: 'battle-meditation' });
    }
    const affectedEnemies = [];
    for (const row of enemies) {
      const token = canvas?.tokens?.get?.(row.id);
      const enemyActor = token?.actor ?? null;
      if (!enemyActor) continue;
      affectedEnemies.push(enemyActor.name);
      await createEffectOnActor(enemyActor, {
        name: 'Improved Battle Meditation Penalty (' + actor.name + ')',
        icon: 'icons/svg/downgrade.svg',
        changes: [],
        disabled: false,
        duration: { rounds: 999 },
        flags: { swse: { talentName: 'Improved Battle Meditation', sourceActorId: actor.id, attackPenalty: -1, rangeSquares: range, mindAffecting: true, manualAttackAdjustment: true, expires: 'encounter', note: 'Opponent suffers -1 attack while within the Battle Meditation radius.' } }
      }, { source: 'improved-battle-meditation' });
    }
    const improvedLine = useImproved
      ? '<p><strong>Improved effect:</strong> enemies within ' + range + ' squares suffer a -1 penalty on attack rolls while in the radius.' + (affectedEnemies.length ? ' Current enemies tagged: ' + esc(affectedEnemies.join(', ')) + '.' : '') + '</p>'
      : '';
    await postCard(actor, useImproved ? 'Improved Battle Meditation' : 'Battle Meditation',
      '<p>' + esc(actor.name) + ' spends 1 Force Point and enters Battle Meditation.</p>'
      + '<p><strong>Allied effect:</strong> ' + esc(affectedAllies.join(', ')) + ' gain a +1 insight bonus on attack rolls while eligible and within ' + range + ' squares until the end of the encounter. This also affects allied Gunners at Starship Scale.</p>'
      + improvedLine
      + '<p><strong>Descriptor:</strong> Mind-Affecting. Range changes after activation remain GM/player adjudicated.</p>',
      { talentName: useImproved ? 'Improved Battle Meditation' : 'Battle Meditation', rangeSquares: range, affectedAllies, affectedEnemies });
    return { success: true, rangeSquares: range, affectedAllies, affectedEnemies };
  }

  static async promptResilience(actor) {
    if (!hasTalent(actor, 'Resilience')) {
      ui?.notifications?.warn?.('Resilience talent required.');
      return null;
    }
    const before = ConditionEngine.calculateConditionStep(actor, { source: 'resilience-precheck' });
    const oldStep = Number(before?.currentStep ?? 0) || 0;
    const newStep = Math.max(0, oldStep - 2);
    if (newStep === oldStep) {
      ui?.notifications?.info?.('Resilience: you are already at the top of the Condition Track.');
      await postCard(actor, 'Resilience', '<p>No Condition Track recovery was needed.</p>', { talentName: 'Resilience' });
      return { success: false, oldStep, newStep };
    }
    const result = await ConditionEngine.applyConditionStep(actor, newStep, { source: 'resilience' });
    await postCard(actor, 'Resilience', '<p>' + esc(actor.name) + ' spends a Full-Round Action to move +2 steps up the Condition Track.</p><p><strong>Condition Track:</strong> ' + oldStep + ' to ' + (result?.newStep ?? newStep) + '.</p>', { talentName: 'Resilience', oldStep, newStep: result?.newStep ?? newStep });
    return { success: true, oldStep, newStep: result?.newStep ?? newStep };
  }

  static async promptCloseManeuvering(actor) {
    if (!hasTalent(actor, 'Close Maneuvering')) {
      ui?.notifications?.warn?.('Close Maneuvering talent required.');
      return null;
    }
    const target = await promptToken(actor, 'Close Maneuvering', { relation: 'enemy', fallbackLabel: 'designated target', note: 'Designate one target. Until the start of your next turn, your movement does not provoke Attacks of Opportunity from that target if you end adjacent to it.' });
    if (!target) return null;
    await actor.setFlag(NS, 'closeManeuvering', { targetName: target.name, targetActorId: target.actor?.id ?? null, round: game.combat?.round ?? null, turn: game.combat?.turn ?? null, expires: 'start-of-next-turn', usedAt: Date.now() });
    await postCard(actor, 'Close Maneuvering', '<p>' + esc(actor.name) + ' designates <strong>' + esc(target.name) + '</strong>. Movement does not provoke Attacks of Opportunity from that target until the start of ' + esc(actor.name) + "'s next turn, provided movement ends adjacent to that target.</p>", { talentName: 'Close Maneuvering', targetActorId: target.actor?.id ?? null });
    return { success: true, targetName: target.name };
  }

  static async promptExposingStrike(actor) {
    if (!hasTalent(actor, 'Exposing Strike')) {
      ui?.notifications?.warn?.('Exposing Strike talent required.');
      return null;
    }
    const target = await promptToken(actor, 'Exposing Strike', { relation: 'enemy', fallbackLabel: 'target damaged by your lightsaber', note: 'Use after you deal damage with a lightsaber. Spend 1 Force Point to make that target Flat-Footed until the end of your next turn.' });
    if (!target) return null;
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Exposing Strike requires spending 1 Force Point.');
      return null;
    }
    if (target.actor) {
      await createEffectOnActor(target.actor, {
        name: 'Exposing Strike: Flat-Footed (' + actor.name + ')',
        icon: 'icons/svg/eye.svg',
        changes: [],
        disabled: false,
        duration: { rounds: 1, turns: 1 },
        flags: { swse: { talentName: 'Exposing Strike', sourceActorId: actor.id, flatFooted: true, expiresEndOfSourceNextTurn: true, note: "Target is Flat-Footed until the end of the source actor's next turn." } }
      }, { source: 'exposing-strike' });
    }
    await postCard(actor, 'Exposing Strike', '<p>' + esc(actor.name) + ' spends 1 Force Point after damaging <strong>' + esc(target.name) + '</strong> with a lightsaber.</p><p><strong>Effect:</strong> ' + esc(target.name) + ' is Flat-Footed until the end of ' + esc(actor.name) + "'s next turn.</p>", { talentName: 'Exposing Strike', targetActorId: target.actor?.id ?? null });
    return { success: true, targetName: target.name };
  }

  static async promptGrenadeDefense(actor, { sourceElement = null } = {}) {
    if (!hasTalent(actor, 'Grenade Defense')) {
      ui?.notifications?.warn?.('Grenade Defense talent required.');
      return null;
    }
    const choice = await SWSEDialogV2.prompt({
      title: 'Grenade Defense',
      content: '<form class="swse-dialog swse-grenade-defense-dialog"><p>Enter the incoming grenade attack roll. You will make a Use the Force check against that DC.</p><div class="form-group"><label>Incoming Attack Roll DC</label><input name="dc" type="number" min="1" value="20" /></div><p class="notes">Reaction - Move Light Object application - success negates the grenade attack. Whether or not successful, you take -5 on UTF checks until the start of your next turn.</p></form>',
      label: 'Roll Use the Force',
      callback: (html) => {
        const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
        const form = root?.querySelector?.('form') ?? root;
        const fd = new FormData(form);
        return { dc: Math.max(1, Number(fd.get('dc') || 20) || 20) };
      }
    });
    if (!choice) return null;
    const modResult = await showRollModifiersDialog({ title: 'Grenade Defense - Use the Force', rollType: 'force', actor, skillKey: 'useTheForce', sourceElement, showCover: false, showConcealment: false });
    if (modResult === null) return null;
    const roll = await rollSkillCheck(actor, 'useTheForce', { ...modResult, dc: choice.dc, source: 'grenade-defense', skillUse: { key: 'grenade-defense', label: 'Grenade Defense' }, sourceElement });
    if (!roll) return null;
    const total = Number(roll.roll?.total ?? roll.total ?? 0) || 0;
    const success = total >= choice.dc;
    await createEffectOnActor(actor, { name: 'Grenade Defense UTF Penalty', icon: 'icons/svg/downgrade.svg', changes: [{ key: 'system.skills.useTheForce.bonus', mode: 2, value: '-5', priority: 20 }], disabled: false, duration: { rounds: 1, turns: 1 }, flags: { swse: { talentName: 'Grenade Defense', useTheForcePenalty: -5, expiresStartOfSourceNextTurn: true } } }, { source: 'grenade-defense' });
    await postCard(actor, 'Grenade Defense', '<p>' + esc(actor.name) + ' rolls Use the Force against the incoming grenade attack (' + total + ' vs DC ' + choice.dc + ').</p>' + (success ? '<p><strong>Success:</strong> the grenade is hurled aside and the attack is negated.</p>' : '<p><strong>Failure:</strong> the grenade attack is not negated.</p>') + '<p>Regardless of outcome, ' + esc(actor.name) + ' takes -5 on Use the Force checks until the start of their next turn.</p>', { talentName: 'Grenade Defense', success, dc: choice.dc });
    return { success, roll: total, dc: choice.dc };
  }

  static async promptImmovable(actor) {
    if (!hasTalent(actor, 'Immovable')) {
      ui?.notifications?.warn?.('Immovable talent required.');
      return null;
    }
    await createEffectOnActor(actor, {
      name: 'Immovable',
      icon: 'icons/svg/anchor.svg',
      changes: [],
      disabled: false,
      duration: { rounds: 1, turns: 1 },
      flags: { swse: { talentName: 'Immovable', involuntaryMovementPenalty: -5, expiresStartOfSourceNextTurn: true, note: 'Enemies attempting to move you involuntarily take -5 on the attack roll or skill check for that attempt.' } }
    }, { source: 'immovable' });
    await postCard(actor, 'Immovable', '<p>Until the start of ' + esc(actor.name) + "'s next turn, anyone attempting to move them involuntarily takes a -5 penalty to the relevant attack roll or skill check.</p>", { talentName: 'Immovable' });
    return { success: true };
  }

  static async promptMobileCombatant(actor) {
    if (!hasTalent(actor, 'Mobile Combatant')) {
      ui?.notifications?.warn?.('Mobile Combatant talent required.');
      return null;
    }
    const target = await promptToken(actor, 'Mobile Combatant', { relation: 'enemy', fallbackLabel: 'adjacent opponent', note: 'Use after ending movement adjacent to an opponent. If the target moves or withdraws before your next turn, you may move with it up to your speed.' });
    if (!target) return null;
    await actor.setFlag(NS, 'mobileCombatant', { targetName: target.name, targetActorId: target.actor?.id ?? null, speed: actor.system?.movement?.speed ?? actor.system?.speed ?? null, round: game.combat?.round ?? null, turn: game.combat?.turn ?? null, expires: 'beginning-of-next-turn', usedAt: Date.now() });
    await postCard(actor, 'Mobile Combatant', '<p>' + esc(actor.name) + ' shadows <strong>' + esc(target.name) + '</strong>. If that opponent Moves or Withdraws before the beginning of ' + esc(actor.name) + "'s next turn, " + esc(actor.name) + ' may move with it up to their current speed, ending closer if the target moves farther.</p><p>Normal Attack of Opportunity rules for the first square of movement still apply unless the target Withdraws or avoids AoO with Acrobatics.</p>', { talentName: 'Mobile Combatant', targetActorId: target.actor?.id ?? null });
    return { success: true, targetName: target.name };
  }

  static async announcePassiveTalent(actor, title, html, flags = {}) {
    return postCard(actor, title, html, { talentName: title, ...flags });
  }

  static async announceCollectiveVisions(actor) {
    return postCard(actor, 'Collective Visions', '<p>When you use Farseeing, or a Force Power or Talent that has Farseeing as a prerequisite, other Force-users with Farseeing in their Force Power Suite can Aid Another on your Use the Force check as a Reaction if they are within 6 squares.</p>', { talentName: 'Collective Visions' });
  }

  static async announceAggressiveNegotiator(actor) {
    return postCard(actor, 'Aggressive Negotiator', '<p>After you damage an opponent with a Lightsaber attack, you can Take 10 on Persuasion checks before the end of your next turn, even if you normally could not.</p><p>This talent is also watched passively from attack resolution hooks when available.</p>', { talentName: 'Aggressive Negotiator' });
  }

  static _looksLikeLightsaber(payload = {}) {
    const weapon = payload.weapon ?? payload.item ?? payload.actionData?.weapon ?? null;
    const text = `${weapon?.name ?? ''} ${weapon?.type ?? ''} ${weapon?.system?.weaponType ?? ''} ${weapon?.system?.group ?? ''} ${payload.actionId ?? ''}`.toLowerCase();
    return text.includes('lightsaber');
  }

  static registerHooks() {
    if (globalThis.SWSE?.__consularTalentActionsRegistered) return;
    globalThis.SWSE = globalThis.SWSE ?? {};
    globalThis.SWSE.__consularTalentActionsRegistered = true;
    Hooks.on('swse.attack-resolved', async (payload = {}) => {
      try {
        const actor = payload.attacker ?? payload.actor ?? payload.sourceActor ?? null;
        if (!actor) return;
        const hit = payload.hit === true || payload.hitResult === true || payload.success === true;
        const damage = Number(payload.damage ?? payload.damageTotal ?? payload.totalDamage ?? 0) || 0;
        if (!hit || damage <= 0 || !this._looksLikeLightsaber(payload)) return;
        if (hasTalent(actor, 'Aggressive Negotiator')) {
          await actor.setFlag(NS, 'aggressiveNegotiatorTake10', { active: true, combatId: this._encounterId(), round: game.combat?.round ?? null, turn: game.combat?.turn ?? null, expires: 'end-of-next-turn', triggeredAt: Date.now() });
          ui?.notifications?.info?.('Aggressive Negotiator active: you may Take 10 on Persuasion checks before the end of your next turn.');
        }
        if (hasTalent(actor, 'Guiding Strikes')) {
          await actor.setFlag(NS, 'guidingStrikesAvailable', { active: true, combatId: this._encounterId(), round: game.combat?.round ?? null, turn: game.combat?.turn ?? null, targetName: payload.target?.name ?? payload.targetActor?.name ?? payload.targetName ?? 'damaged target', triggeredAt: Date.now() });
          ui?.notifications?.info?.('Guiding Strikes available: use a Swift Action before the end of your turn.');
        }
        if (hasTalent(actor, "Improved Consular's Vitality")) {
          await actor.setFlag(NS, 'improvedConsularsVitalityAvailable', { active: true, combatId: this._encounterId(), round: game.combat?.round ?? null, turn: game.combat?.turn ?? null, expires: 'start-of-next-turn', triggeredAt: Date.now() });
          ui?.notifications?.info?.("Improved Consular's Vitality available: use Consular's Vitality as a Free Action until the start of your next turn.");
        }

        const targetActor = payload.targetActor ?? payload.target?.actor ?? payload.target ?? null;
        const targetName = payload.target?.name ?? payload.targetActor?.name ?? payload.targetName ?? targetActor?.name ?? 'damaged target';

        if (hasTalent(actor, 'Exposing Strike')) {
          await actor.setFlag(NS, 'exposingStrikeAvailable', { active: true, combatId: this._encounterId(), round: game.combat?.round ?? null, turn: game.combat?.turn ?? null, targetName, targetActorId: targetActor?.id ?? null, expires: 'end-of-next-turn', triggeredAt: Date.now() });
          ui?.notifications?.info?.('Exposing Strike available: spend a Force Point to make the damaged target Flat-Footed.');
        }

        if (hasTalent(actor, 'Guardian Strike') && targetActor?.id) {
          await createEffectOnActor(targetActor, {
            name: `Guardian Strike (${actor.name})`,
            icon: 'icons/svg/sword.svg',
            changes: [],
            disabled: false,
            duration: { rounds: 1, turns: 1 },
            flags: { swse: { talentName: 'Guardian Strike', sourceActorId: actor.id, sourceActorName: actor.name, attackPenaltyAgainstOthers: -2, expiresBeginningOfSourceNextTurn: true, note: 'Target takes -2 on attack rolls against any target other than the source.' } }
          }, { source: 'guardian-strike' });
        }

        const d20 = naturalD20(payload.roll ?? payload.attackRoll ?? payload.context?.attackRoll ?? null);
        const critical = payload.isCritical === true || payload.critical === true || payload.context?.isCritical === true || d20 === 20;
        if (critical && hasTalent(actor, 'Forceful Warrior')) {
          await GuardianSpiritActions.addBonusForcePointEntry(actor, {
            source: 'Forceful Warrior',
            value: 1,
            max: 1,
            restrictions: 'Temporary Force Point from a critical hit with a lightsaber; lost at the end of the encounter if unused.',
            expires: 'encounter',
            encounterId: this._encounterId(),
            createdAt: Date.now()
          }, 'Temporary and bonus Force Points are spent before normal Force Points.');
          ui?.notifications?.info?.('Forceful Warrior: gained 1 temporary Force Point for a lightsaber critical hit.');
        }
      } catch (err) {
        console.warn('[SWSE] Consular attack hook failed:', err);
      }
    });
  }
}

export function registerConsularTalentActions() {
  ConsularTalentActions.registerHooks();
}
