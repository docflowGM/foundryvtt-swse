import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

const NS = 'swse';
const BONUS_PATH = 'bonusForcePoints';
const GUARDIAN_PATH = 'guardianSpirit';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function hasTalent(actor, name) {
  return !!actor?.items?.some?.(i => i.type === 'talent' && i.name === name);
}

function heroicHalf(actor) {
  const heroic = Number(actor?.system?.level?.heroic ?? actor?.system?.details?.level ?? actor?.system?.level ?? 1) || 1;
  return Math.floor(heroic / 2);
}

export class GuardianSpiritActions {
  static hasTalent(actor, name) { return hasTalent(actor, name); }

  static _encounterId() {
    return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
  }

  static _normalizeEntries(pool = {}) {
    const entries = Array.isArray(pool.entries) ? pool.entries.map((entry, index) => ({
      id: String(entry?.id ?? `bonus-${index}`),
      source: String(entry?.source ?? 'Bonus Force Point'),
      value: Math.max(0, Number(entry?.value ?? 0) || 0),
      max: Math.max(0, Number(entry?.max ?? entry?.value ?? 0) || 0),
      restrictions: entry?.restrictions ?? entry?.restriction ?? '',
      expires: entry?.expires ?? '',
      encounterId: entry?.encounterId ?? null,
      createdAt: entry?.createdAt ?? null
    })).filter(entry => entry.value > 0) : [];

    const legacyValue = Math.max(0, Number(pool.value ?? 0) || 0);
    const entryTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
    if (!entries.length && legacyValue > 0) {
      entries.push({
        id: 'legacy-bonus-force-points',
        source: Array.isArray(pool.sources) && pool.sources.length ? pool.sources.join(', ') : 'Bonus Force Point',
        value: legacyValue,
        max: Math.max(legacyValue, Number(pool.max ?? legacyValue) || legacyValue),
        restrictions: pool.note ?? '',
        expires: '',
        encounterId: null,
        createdAt: null
      });
    } else if (legacyValue > entryTotal) {
      entries.push({
        id: 'legacy-bonus-force-points',
        source: 'Bonus Force Point',
        value: legacyValue - entryTotal,
        max: legacyValue - entryTotal,
        restrictions: pool.note ?? '',
        expires: '',
        encounterId: null,
        createdAt: null
      });
    }
    return entries;
  }

  static _buildPool(entries = [], note = '') {
    const clean = entries.filter(entry => Math.max(0, Number(entry.value) || 0) > 0);
    const value = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.value) || 0), 0);
    const max = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.max ?? entry.value) || 0), 0);
    const sources = [...new Set(clean.map(entry => entry.source).filter(Boolean))];
    return {
      value,
      max: Math.max(value, max),
      sources,
      entries: clean,
      note: note || 'Bonus Force Points are spent before normal Force Points and may have source-specific restrictions.'
    };
  }

  static getBonusForcePoints(actor) {
    const pool = actor?.getFlag?.(NS, BONUS_PATH) ?? {};
    const entries = this._normalizeEntries(pool);
    return this._buildPool(entries, pool.note ?? '');
  }

  static async setBonusForcePointEntries(actor, entries, note = '') {
    const pool = this._buildPool(entries, note);
    await actor.setFlag(NS, BONUS_PATH, pool);
    return pool;
  }

  static async addBonusForcePointEntry(actor, entry, note = '') {
    const current = this.getBonusForcePoints(actor);
    const entries = [...(current.entries ?? []), {
      id: entry.id ?? `${String(entry.source ?? 'bonus').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      source: entry.source ?? 'Bonus Force Point',
      value: Math.max(0, Number(entry.value ?? 1) || 1),
      max: Math.max(0, Number(entry.max ?? entry.value ?? 1) || 1),
      restrictions: entry.restrictions ?? '',
      expires: entry.expires ?? '',
      encounterId: entry.encounterId ?? null,
      createdAt: entry.createdAt ?? Date.now()
    }];
    return this.setBonusForcePointEntries(actor, entries, note || current.note);
  }

  static async adjustBonusForcePoints(actor, delta, source = 'Manual') {
    const amount = Number(delta || 0);
    if (amount === 0) return this.getBonusForcePoints(actor);
    if (amount < 0) {
      await this.spendBonusForcePoints(actor, Math.abs(amount));
      return this.getBonusForcePoints(actor);
    }
    const current = this.getBonusForcePoints(actor);
    return this.addBonusForcePointEntry(actor, {
      source,
      value: amount,
      max: amount,
      restrictions: 'Manual bonus Force Point adjustment.',
      expires: ''
    }, current.note);
  }

  static async spendBonusForcePoints(actor, amount = 1) {
    const current = this.getBonusForcePoints(actor);
    let remaining = Math.max(0, Number(amount) || 0);
    const entries = [];
    let spent = 0;
    for (const entry of current.entries ?? []) {
      if (remaining <= 0) {
        entries.push(entry);
        continue;
      }
      const value = Math.max(0, Number(entry.value) || 0);
      const use = Math.min(value, remaining);
      spent += use;
      remaining -= use;
      const left = value - use;
      if (left > 0) entries.push({ ...entry, value: left });
    }
    await this.setBonusForcePointEntries(actor, entries, current.note);
    return { spent, remaining: entries.reduce((sum, entry) => sum + Number(entry.value || 0), 0) };
  }

  static async claimGuardianBonusForcePoint(actor) {
    if (!hasTalent(actor, 'Guardian Spirit')) {
      ui?.notifications?.warn?.('Guardian Spirit talent required.');
      return null;
    }
    const current = this.getBonusForcePoints(actor);
    const entries = (current.entries ?? []).filter(entry => entry.source !== 'Guardian Spirit');
    entries.push({
      id: 'guardian-spirit-daily',
      source: 'Guardian Spirit',
      value: 1,
      max: 1,
      restrictions: 'Usable only to improve a Force Power or activate a Force Technique or Force Secret; lost if unused by the next day.',
      expires: 'daily-rest-cycle',
      encounterId: null,
      createdAt: Date.now()
    });
    await this.setBonusForcePointEntries(actor, entries, 'Guardian Spirit bonus Force Point is source-restricted. Bonus Force Points are spent before normal Force Points.');
    await this._post(actor, 'Guardian Spirit Bonus Force Point', 'Gained 1 bonus Force Point from Guardian Spirit. Spend bonus Force Points before normal Force Points; this one has Guardian Spirit restrictions.');
    return this.getBonusForcePoints(actor);
  }

  static async manifest(actor) {
    if (!hasTalent(actor, 'Manifest Guardian Spirit')) {
      ui?.notifications?.warn?.('Manifest Guardian Spirit talent required.');
      return null;
    }
    const fp = Number(actor?.system?.forcePoints?.value ?? 0) || 0;
    const bonus = this.getBonusForcePoints(actor).value;
    if ((fp + bonus) < 1) {
      ui?.notifications?.warn?.('No Force Points available to manifest your Guardian Spirit.');
      return null;
    }
    await ActorEngine.spendForcePoints(actor, 1);
    await actor.setFlag(NS, GUARDIAN_PATH, {
      manifested: true,
      manifestedAt: Date.now(),
      source: 'Manifest Guardian Spirit',
      note: 'Guardian Spirit is manifested for this encounter. GM/player adjudicates location and morale bonuses.'
    });
    await this._post(actor, 'Manifest Guardian Spirit', 'Guardian Spirit manifested for the encounter. Position and aura bonuses are GM/player adjudicated.');
    return { manifested: true };
  }

  static async vitalEncouragement(actor) {
    if (!hasTalent(actor, 'Vital Encouragement')) {
      ui?.notifications?.warn?.('Vital Encouragement talent required.');
      return null;
    }
    const used = actor.getFlag(NS, 'encounterUses.guardianSpirit.vitalEncouragement') === true;
    if (used) {
      ui?.notifications?.warn?.('Vital Encouragement has already been used this encounter.');
      return null;
    }
    const amount = 10 + heroicHalf(actor);
    const currentTemp = Number(actor?.system?.hp?.temp ?? actor?.system?.health?.temp ?? 0) || 0;
    const update = { 'system.hp.temp': Math.max(currentTemp, amount) };
    await ActorEngine.updateActor(actor, update, { source: 'vital-encouragement' });
    await actor.setFlag(NS, 'encounterUses.guardianSpirit.vitalEncouragement', true);
    await this._post(actor, 'Vital Encouragement', `Gained ${amount} Bonus Hit Points. Bonus Hit Points from multiple sources do not stack and expire at encounter end.`);
    return { bonusHitPoints: amount };
  }

  static getCrucialAdviceState(actor) {
    const encounterId = this._encounterId();
    const flag = actor?.getFlag?.(NS, 'encounterUses.guardianSpirit.crucialAdvice') ?? {};
    const used = flag?.encounterId === encounterId && flag?.used === true;
    return { encounterId, used, remaining: used ? 0 : 1 };
  }

  static async promptCrucialAdvice(actor) {
    if (!hasTalent(actor, 'Crucial Advice')) {
      ui?.notifications?.warn?.('Crucial Advice talent required.');
      return null;
    }
    const state = this.getCrucialAdviceState(actor);
    if (state.used) {
      ui?.notifications?.warn?.('Crucial Advice has already been used this encounter.');
      return null;
    }
    const skills = Object.entries(actor?.system?.skills ?? {})
      .map(([key, data]) => ({ key, label: data?.label ?? key.replace(/([a-z])([A-Z])/g, '$1 $2') }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const content = `<form class="swse-dialog swse-crucial-advice-dialog">
      <p>Once per encounter, after failing a Skill Check, reroll it with a +2 circumstance bonus.</p>
      <div class="form-group"><label>Failed Skill</label><select name="skillKey">
        ${skills.map(skill => `<option value="${esc(skill.key)}">${esc(skill.label)}</option>`).join('')}
      </select></div>
      <p class="notes">For multi-result skill checks, failure means achieving less than the minimum DC.</p>
    </form>`;
    const result = await SWSEDialogV2.prompt({
      title: 'Crucial Advice — Skill Reroll',
      content,
      label: 'Reroll Skill',
      callback: (html) => {
        const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
        const form = root?.querySelector?.('form') ?? root;
        const fd = new FormData(form);
        return { skillKey: String(fd.get('skillKey') || 'useTheForce') };
      }
    });
    if (!result) return null;
    return this.crucialAdviceReroll(actor, result.skillKey);
  }

  static async crucialAdviceReroll(actor, skillKey = 'useTheForce') {
    if (!hasTalent(actor, 'Crucial Advice')) {
      ui?.notifications?.warn?.('Crucial Advice talent required.');
      return null;
    }
    const state = this.getCrucialAdviceState(actor);
    if (state.used) {
      ui?.notifications?.warn?.('Crucial Advice has already been used this encounter.');
      return null;
    }
    const result = await rollSkillCheck(actor, skillKey, {
      customModifier: 2,
      source: 'crucial-advice',
      companionSource: null,
      showRollCompanion: true
    });
    if (result) {
      await actor.setFlag(NS, 'encounterUses.guardianSpirit.crucialAdvice', {
        encounterId: state.encounterId,
        used: true,
        skillKey,
        usedAt: Date.now()
      });
    }
    return result;
  }

  static async _post(actor, title, body) {
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<section class="swse-chat-card"><header><strong>${esc(title)}</strong></header><p>${esc(body)}</p></section>`,
      flags: { swse: { guardianSpirit: true } }
    });
  }
}

globalThis.SWSE = globalThis.SWSE ?? {};
globalThis.SWSE.GuardianSpiritActions = GuardianSpiritActions;
