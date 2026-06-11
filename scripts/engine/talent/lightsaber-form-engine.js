import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createEffectOnActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

const NS = 'swse';
const ACTIVE_FORM_FLAG = 'activeLightsaberForm';
const ACTIVE_EFFECT_FLAG = 'lightsaberFormStanceEffect';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slug(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeTalentName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*\((\d+)\)\s*$/, '');
}

function encounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function roundKey() {
  return `${encounterId()}:${game?.combat?.round ?? 'noround'}`;
}

function actorHasTalent(actor, name) {
  const wanted = normalizeTalentName(name);
  return Array.from(actor?.items ?? []).some(item => item?.type === 'talent' && normalizeTalentName(item?.name) === wanted);
}

function actorAbilityMod(actor, ability) {
  const key = String(ability || '').toLowerCase().slice(0, 3);
  const system = actor?.system ?? {};
  const candidates = [
    system.abilities?.[key]?.mod,
    system.abilities?.[key]?.modifier,
    system.attributes?.[key]?.mod,
    system.attributes?.[key]?.modifier,
    system.stats?.[key]?.mod,
    system[key]?.mod
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  const score = Number(system.abilities?.[key]?.value ?? system.attributes?.[key]?.value ?? system.stats?.[key]?.value ?? 10);
  return Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0;
}

function isLightsaberWeapon(weapon) {
  const system = weapon?.system ?? {};
  const properties = Array.isArray(system.properties) ? system.properties : [];
  const text = [
    weapon?.name,
    weapon?.type,
    system.weaponGroup,
    system.group,
    system.weaponCategory,
    system.category,
    system.subcategory,
    system.subtype,
    system.weaponType,
    system.type,
    ...properties
  ].map(value => String(value ?? '').toLowerCase()).join(' ');
  return text.includes('lightsaber');
}

async function postCard(actor, title, body, flags = {}) {
  const content = `<section class="swse-chat-card swse-chat-card--lightsaber-form">
    <header class="swse-chat-card__header"><strong>${esc(title)}</strong><span>Lightsaber Form</span></header>
    <div class="swse-chat-card__body">${body}</div>
  </section>`;
  return SWSEChat.postHTML({ actor, content, flags: { swse: { lightsaberForm: true, ...flags } } });
}

export const LIGHTSABER_FORMS = Object.freeze({
  ataru: {
    slug: 'ataru', name: 'Ataru', kind: 'form',
    summary: 'While this form is active, use Dexterity instead of Strength for lightsaber damage; double Dexterity when wielded two-handed.'
  },
  'djem-so': {
    slug: 'djem-so', name: 'Djem So', kind: 'form',
    summary: 'While this form is active, once per round when hit by a melee attack, spend a Force Point as a Reaction to attack that opponent.'
  },
  'jar-kai': {
    slug: 'jar-kai', name: "Jar'Kai", kind: 'form',
    summary: 'While this form is active, using Lightsaber Defense while wielding two lightsabers doubles the normal deflection bonus.'
  },
  juyo: {
    slug: 'juyo', name: 'Juyo', kind: 'form',
    summary: 'While this form is active, once per encounter spend a Force Point as a Swift Action to designate a target; reroll first attack each round against it.'
  },
  makashi: {
    slug: 'makashi', name: 'Makashi', kind: 'form',
    summary: 'While this form is active, using Lightsaber Defense with a single one-handed lightsaber increases its deflection bonus by +2, max +5.'
  },
  niman: {
    slug: 'niman', name: 'Niman', kind: 'form',
    summary: 'While this form is active and you wield a lightsaber, gain +1 Reflex Defense and +1 Will Defense.'
  },
  shien: {
    slug: 'shien', name: 'Shien', kind: 'form',
    summary: 'While this form is active, gain +5 on ranged attack rolls made with Redirect Shot.'
  },
  'shii-cho': {
    slug: 'shii-cho', name: 'Shii-Cho', kind: 'form',
    summary: 'While this form is active, Block/Deflect cumulative penalties are -2 per previous attempt instead of -5.'
  },
  sokan: {
    slug: 'sokan', name: 'Sokan', kind: 'form',
    summary: 'While this form is active, Take 10 on Acrobatics checks to Tumble while threatened; threatened/occupied squares count as 1 square.'
  },
  soresu: {
    slug: 'soresu', name: 'Soresu', kind: 'form',
    summary: 'While this form is active, reroll a failed Use the Force check when using Block or Deflect; keep the reroll.'
  },
  trakata: {
    slug: 'trakata', name: 'Trakata', kind: 'form',
    summary: 'While this form is active, spend two Swift Actions while wielding a lightsaber to make a Deception check to Feint in combat.'
  },
  vaapad: {
    slug: 'vaapad', name: 'Vaapad', kind: 'form',
    summary: 'While this form is active, lightsaber attacks threaten a critical hit on natural 19-20. A natural 19 is not an automatic hit.'
  }
});

const FORM_ALIASES = Object.freeze({
  ataru: 'ataru',
  'djem so': 'djem-so', djemso: 'djem-so', 'djem-so': 'djem-so',
  "jar'kai": 'jar-kai', jarkai: 'jar-kai', 'jar-kai': 'jar-kai',
  juyo: 'juyo', makashi: 'makashi', niman: 'niman', shien: 'shien',
  'shii cho': 'shii-cho', shiicho: 'shii-cho', 'shii-cho': 'shii-cho',
  sokan: 'sokan', soresu: 'soresu', trakata: 'trakata', vaapad: 'vaapad'
});

function normalizeFormSlug(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return FORM_ALIASES[raw] ?? FORM_ALIASES[slug(raw)] ?? slug(raw);
}

export class LightsaberFormEngine {
  static forms = LIGHTSABER_FORMS;

  static normalizeFormSlug(value) { return normalizeFormSlug(value); }

  static hasForm(actor, formSlugOrName) {
    const form = LIGHTSABER_FORMS[normalizeFormSlug(formSlugOrName)];
    return !!form && actorHasTalent(actor, form.name);
  }

  static getKnownForms(actor) {
    const forms = Object.values(LIGHTSABER_FORMS)
      .filter(form => actorHasTalent(actor, form.name))
      .map(form => ({ ...form, active: this.isActiveForm(actor, form.slug) }));
    return forms;
  }

  static getActiveForm(actor) {
    const flag = actor?.getFlag?.(NS, ACTIVE_FORM_FLAG) ?? actor?.flags?.[NS]?.[ACTIVE_FORM_FLAG] ?? null;
    const form = LIGHTSABER_FORMS[normalizeFormSlug(flag?.slug ?? flag?.name ?? '')];
    if (!form || !actorHasTalent(actor, form.name)) return null;
    return { ...form, activatedAt: flag?.activatedAt ?? null };
  }

  static isActiveForm(actor, formSlugOrName) {
    const active = this.getActiveForm(actor);
    return !!active && active.slug === normalizeFormSlug(formSlugOrName);
  }

  static requireActiveForm(actor, formSlugOrName) {
    const form = LIGHTSABER_FORMS[normalizeFormSlug(formSlugOrName)];
    if (!form) return { ok: false, error: `Unknown lightsaber form: ${formSlugOrName}` };
    if (!actorHasTalent(actor, form.name)) return { ok: false, error: `${actor?.name ?? 'Actor'} does not know ${form.name}.` };
    if (!this.isActiveForm(actor, form.slug)) return { ok: false, error: `${form.name} must be the actor's active Lightsaber Form. Only one form can be active at a time.` };
    return { ok: true, form };
  }

  static async _clearStanceEffects(actor) {
    const effects = Array.from(actor?.effects ?? []).filter(effect => effect?.flags?.[NS]?.[ACTIVE_EFFECT_FLAG] === true);
    if (effects.length) await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', effects.map(effect => effect.id), { source: 'lightsaber-form-clear-effects' });
  }

  static async clearActiveForm(actor) {
    await this._clearStanceEffects(actor);
    await actor?.unsetFlag?.(NS, ACTIVE_FORM_FLAG);
    await postCard(actor, 'Lightsaber Form Cleared', `<p>${esc(actor?.name ?? 'The character')} leaves their active Lightsaber Form.</p>`, { action: 'clear-active-form' });
    return { success: true, activeForm: null };
  }

  static async setActiveForm(actor, formSlugOrName) {
    const slugValue = normalizeFormSlug(formSlugOrName);
    const form = LIGHTSABER_FORMS[slugValue];
    if (!form) return { success: false, error: `Unknown lightsaber form: ${formSlugOrName}` };
    if (!actorHasTalent(actor, form.name)) return { success: false, error: `${actor?.name ?? 'Actor'} does not know ${form.name}.` };

    await this._clearStanceEffects(actor);
    await actor?.setFlag?.(NS, ACTIVE_FORM_FLAG, { slug: form.slug, name: form.name, activatedAt: Date.now() });

    if (form.slug === 'niman') {
      await createEffectOnActor(actor, {
        name: 'Lightsaber Form: Niman',
        icon: 'icons/svg/shield.svg',
        changes: [
          { key: 'system.defenses.reflex.misc', mode: 2, value: '1', priority: 20 },
          { key: 'system.defenses.will.misc', mode: 2, value: '1', priority: 20 }
        ],
        disabled: false,
        duration: {},
        flags: { swse: { [ACTIVE_EFFECT_FLAG]: true, activeLightsaberForm: 'niman', requiresLightsaber: true } }
      }, { source: 'lightsaber-form-niman' });
    }

    await postCard(actor, `Lightsaber Form: ${form.name}`, `<p>${esc(actor?.name ?? 'The character')} adopts <strong>${esc(form.name)}</strong>.</p><p>${esc(form.summary)}</p><p><em>Only one Lightsaber Form can be active at a time. Switching forms replaces the previous form; inactive forms provide no benefits.</em></p>`, { action: 'set-active-form', form: form.slug });
    return { success: true, activeForm: form };
  }

  static getBlockDeflectPenaltyPerPreviousUse(actor) {
    return this.isActiveForm(actor, 'shii-cho') ? 2 : 5;
  }

  static getLightsaberDefenseBonus(actor, baseBonus = 1) {
    let bonus = Number(baseBonus) || 1;
    if (this.isActiveForm(actor, 'makashi')) bonus = Math.min(5, bonus + 2);
    if (this.isActiveForm(actor, 'jar-kai')) bonus = bonus * 2;
    return Math.max(1, bonus);
  }

  static getLightsaberDefenseNotes(actor) {
    const active = this.getActiveForm(actor);
    if (!active) return [];
    if (active.slug === 'makashi') return ['Makashi active: Lightsaber Defense bonus includes +2, maximum +5. Requires single one-handed lightsaber.'];
    if (active.slug === 'jar-kai') return ["Jar'Kai active: Lightsaber Defense bonus is doubled. Requires wielding two lightsabers."];
    return [];
  }

  static getWeaponModifiers(actor, weapon, context = {}) {
    const result = {
      attackBonus: 0,
      damageBonus: 0,
      criticalThreatNaturalMin: null,
      targetEffectsOnHit: [],
      targetEffectsOnCritical: [],
      flags: {},
      breakdown: []
    };
    if (!isLightsaberWeapon(weapon)) return result;
    const active = this.getActiveForm(actor);
    if (!active) return result;

    if (active.slug === 'vaapad') {
      result.criticalThreatNaturalMin = 19;
      result.breakdown.push({ label: 'Vaapad', value: 19, type: 'criticalThreatNaturalMin' });
    }

    const redirected = context?.redirectShot === true || context?.redirectedBlasterBolt === true || context?.flags?.redirectShot === true;
    if (active.slug === 'shien' && redirected) {
      result.attackBonus += 5;
      result.breakdown.push({ label: 'Shien', value: 5, type: 'attack' });
    }

    return result;
  }

  static getDamageAbilityOverride(actor, weapon, baseSelector = '') {
    if (!this.isActiveForm(actor, 'ataru')) return null;
    if (!isLightsaberWeapon(weapon)) return null;
    const selector = String(baseSelector || '').toLowerCase();
    const strengthBased = selector === 'str' || selector === 'str2' || selector === '2str' || selector === '';
    if (!strengthBased) return null;
    return selector === 'str2' || selector === '2str' ? '2dex' : 'dex';
  }

  static async promptDjemSo(actor) {
    const active = this.requireActiveForm(actor, 'djem-so');
    if (!active.ok) {
      ui?.notifications?.warn?.(active.error);
      return null;
    }
    const key = roundKey();
    const flag = actor?.getFlag?.(NS, 'djemSoReaction') ?? {};
    if (flag?.roundKey === key && flag?.used === true) {
      ui?.notifications?.warn?.('Djem So has already been used this round.');
      return null;
    }
    const spend = await ActorEngine.spendForcePoints(actor, 1, { allowOncePerRoundOverride: true, source: 'djem-so' });
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Djem So requires spending 1 Force Point.');
      return null;
    }
    await actor?.setFlag?.(NS, 'djemSoReaction', { roundKey: key, used: true, usedAt: Date.now() });
    await postCard(actor, 'Djem So', `<p>${esc(actor.name)} spends 1 Force Point as a Reaction after being hit by a melee attack and may make an immediate attack against that opponent.</p>`, { talentName: 'Djem So', forcePointSpent: true });
    return { success: true, forcePointSpent: true };
  }

  static async promptJuyo(actor) {
    const active = this.requireActiveForm(actor, 'juyo');
    if (!active.ok) {
      ui?.notifications?.warn?.(active.error);
      return null;
    }
    const flag = actor?.getFlag?.(NS, 'juyoDesignatedTarget') ?? {};
    if (flag?.encounterId === encounterId() && flag?.used === true) {
      ui?.notifications?.warn?.('Juyo has already designated a target this encounter.');
      return null;
    }
    const content = `<form class="swse-dialog"><p>Spend 1 Force Point as a Swift Action to designate one opponent in line of sight for the remainder of the encounter.</p><div class="form-group"><label>Designated opponent</label><input name="targetName" type="text" placeholder="Target name" /></div><p class="notes">Against this target, reroll your first attack roll each round and keep the better result.</p></form>`;
    const choice = await SWSEDialogV2.prompt({ title: 'Juyo', content, label: 'Designate', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const formEl = root?.querySelector?.('form') ?? root;
      const fd = new FormData(formEl);
      return { targetName: String(fd.get('targetName') || 'designated opponent').trim() || 'designated opponent' };
    }});
    if (!choice) return null;
    const targetName = choice.targetName;
    const spend = await ActorEngine.spendForcePoints(actor, 1);
    if (!spend?.spent) {
      ui?.notifications?.warn?.('Juyo requires spending 1 Force Point.');
      return null;
    }
    await actor?.setFlag?.(NS, 'juyoDesignatedTarget', { encounterId: encounterId(), used: true, targetName, usedAt: Date.now() });
    await postCard(actor, 'Juyo', `<p>${esc(actor.name)} designates <strong>${esc(targetName)}</strong> as their Juyo target for this encounter.</p><p>Reroll your first attack roll each round against that opponent, keeping the better result.</p>`, { talentName: 'Juyo', forcePointSpent: true, targetName });
    return { success: true, forcePointSpent: true, targetName };
  }

  static async announceSokan(actor) {
    const active = this.requireActiveForm(actor, 'sokan');
    if (!active.ok) {
      ui?.notifications?.warn?.(active.error);
      return null;
    }
    await postCard(actor, 'Sokan', '<p>While Sokan is your active Lightsaber Form, you may Take 10 on Acrobatics checks to Tumble, even when distracted or threatened. Threatened or occupied squares you Tumble through count as only 1 square of movement.</p>', { talentName: 'Sokan' });
    return { success: true };
  }

  static async promptTrakata(actor) {
    const active = this.requireActiveForm(actor, 'trakata');
    if (!active.ok) {
      ui?.notifications?.warn?.(active.error);
      return null;
    }
    await postCard(actor, 'Trakata', '<p>While Trakata is your active Lightsaber Form, spend two Swift Actions while wielding a lightsaber to make a Deception check to Feint in combat by shutting off and reigniting the blade.</p><p>Use the normal Deception skill roll dialog for the opposed Feint check.</p>', { talentName: 'Trakata', actionCost: 'two-swift' });
    return { success: true };
  }

  static async announceActiveFormBenefit(actor, formSlugOrName) {
    const active = this.requireActiveForm(actor, formSlugOrName);
    if (!active.ok) {
      ui?.notifications?.warn?.(active.error);
      return null;
    }
    const form = active.form;
    await postCard(actor, form.name, `<p>${esc(form.summary)}</p><p><em>${esc(form.name)} is currently active. Inactive Lightsaber Forms grant no benefits.</em></p>`, { talentName: form.name, form: form.slug });
    return { success: true };
  }

  static async announcePassiveForm(actor, formSlugOrName) {
    return this.announceActiveFormBenefit(actor, formSlugOrName);
  }
}

export default LightsaberFormEngine;
