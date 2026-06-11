import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { isEnergyShieldItem, resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

const NS = 'swse';
const SHIELD_EXPERT_FLAG = 'shieldExpertUses';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hasTalent(actor, name) {
  return !!actor?.items?.some?.(item => item?.type === 'talent' && String(item?.name ?? '').toLowerCase() === String(name ?? '').toLowerCase());
}

function encounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function isActiveEnergyShield(item) {
  if (!item || item.type !== 'armor' || !isEnergyShieldItem(item)) return false;
  const armor = resolveArmorData(item);
  const max = Number(armor.shieldRating ?? 0) || 0;
  if (max <= 0) return false;
  return armor.activated === true || Number(armor.currentSR ?? 0) > 0 || item.system?.equipped === true;
}

function energyShieldRows(actor) {
  return Array.from(actor?.items ?? [])
    .filter(isActiveEnergyShield)
    .map(item => {
      const armor = resolveArmorData(item);
      const max = Number(armor.shieldRating ?? 0) || 0;
      const current = Math.max(0, Math.min(max, Number(armor.currentSR ?? item.system?.currentSR ?? 0) || 0));
      return { item, id: item.id ?? item._id, name: item.name, current, max };
    })
    .filter(row => row.id && row.max > 0)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function postCard(actor, title, body, flags = {}) {
  const content = `<section class="swse-chat-card swse-chat-card--armor-talent">
    <header class="swse-chat-card__header"><strong>${esc(title)}</strong><span>Armor Specialist Talent</span></header>
    <div class="swse-chat-card__body">${body}</div>
  </section>`;
  return SWSEChat.postHTML({ actor, content, flags: { swse: { armorTalent: true, ...flags } } });
}

async function promptShield(actor, rows) {
  if (rows.length === 1) return rows[0];
  const options = rows.map(row => `<option value="${esc(row.id)}">${esc(row.name)} — SR ${row.current}/${row.max}</option>`).join('');
  const content = `<form class="swse-dialog swse-shield-expert-dialog">
    <div class="form-group">
      <label>Active Energy Shield</label>
      <select name="shieldId">${options}</select>
    </div>
    <p class="notes">Shield Expert restores 10 SR up to the shield's maximum once per encounter.</p>
  </form>`;
  const result = await SWSEDialogV2.prompt({
    title: 'Shield Expert',
    content,
    label: 'Restore SR',
    callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      const shieldId = String(fd.get('shieldId') || '');
      return rows.find(row => row.id === shieldId) ?? null;
    }
  });
  return result;
}

export class ArmorTalentActions {
  static hasTalent(actor, name) { return hasTalent(actor, name); }

  static _encounterId() { return encounterId(); }

  static _shieldExpertState(actor) {
    const flag = actor?.getFlag?.(NS, SHIELD_EXPERT_FLAG) ?? {};
    const encounter = this._encounterId();
    if (flag?.encounterId !== encounter) return { encounterId: encounter, used: 0 };
    return { encounterId: encounter, used: Math.max(0, Number(flag?.used ?? 0) || 0) };
  }

  static async promptShieldExpert(actor) {
    if (!hasTalent(actor, 'Shield Expert')) {
      ui?.notifications?.warn?.('Shield Expert talent required.');
      return null;
    }

    const state = this._shieldExpertState(actor);
    if (state.used >= 1) {
      ui?.notifications?.warn?.('Shield Expert has already been used this encounter.');
      return null;
    }

    const rows = energyShieldRows(actor);
    if (!rows.length) {
      ui?.notifications?.warn?.('Shield Expert requires an active Energy Shield with a Shield Rating.');
      return null;
    }

    const choice = await promptShield(actor, rows);
    if (!choice) return null;

    const restored = Math.max(0, Math.min(10, choice.max - choice.current));
    if (restored <= 0) {
      ui?.notifications?.warn?.(`${choice.name} is already at maximum SR.`);
      return null;
    }

    const nextSR = Math.min(choice.max, choice.current + restored);
    await ActorEngine.updateOwnedItems(actor, [{
      _id: choice.id,
      'system.currentSR': nextSR,
      'system.activated': true
    }], { source: 'ShieldExpert.restoreSR' });

    await actor?.setFlag?.(NS, SHIELD_EXPERT_FLAG, {
      encounterId: state.encounterId,
      used: state.used + 1,
      lastShieldId: choice.id,
      lastShieldName: choice.name,
      restored,
      updatedAt: Date.now()
    });

    await postCard(actor, 'Shield Expert', `<p>${esc(actor.name)} restores <strong>${restored} SR</strong> to ${esc(choice.name)}.</p>
      <p><strong>Shield SR:</strong> ${choice.current} → ${nextSR} / ${choice.max}</p>
      <p><strong>Use:</strong> once per encounter, Swift Action.</p>`,
      { talentName: 'Shield Expert', restored, shieldId: choice.id });

    return { restored, currentSR: nextSR, maxSR: choice.max, shield: choice.item };
  }
}

globalThis.SWSE = globalThis.SWSE ?? {};
globalThis.SWSE.ArmorTalentActions = ArmorTalentActions;
