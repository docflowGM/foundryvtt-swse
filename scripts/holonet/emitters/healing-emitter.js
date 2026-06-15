/**
 * Healing Emitter
 *
 * Listens to rest/healing/recovery events and emits into Holonet.
 * Hooks into rest completion and GM recovery console actions.
 *
 * Preference checks, deduplication, and publish are delegated to HolonetEmissionService.
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { HealingSource } from '../sources/healing-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class HealingEmitter {
  static #initialized = false;

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    Hooks.on('restCompleted', (data) => {
      this.onRestCompleted(data).catch(err => {
        console.error('[Holonet] Healing emitter failed:', err);
      });
    });

    Hooks.on('swseGmCombatRecoveryCompleted', (data) => {
      this.onGmCombatRecoveryCompleted(data).catch(err => {
        console.error('[Holonet] GM recovery emitter failed:', err);
      });
    });

    console.log('[Holonet] Healing emitter initialized');
  }

  static _actorById(id) {
    if (!id) return null;
    return game.actors?.get?.(String(id).replace(/^Actor\./, '')) ?? null;
  }

  static _ownerUserForActor(actor) {
    if (!actor) return null;
    const direct = Array.from(game.users ?? []).find(user => !user?.isGM && user.character?.id === actor.id);
    if (direct) return direct;

    const ownerActorId = actor.system?.ownedByActorId
      ?? actor.system?.ownerActorId
      ?? actor.system?.storeAcquisition?.ownerActorId
      ?? actor.flags?.['foundryvtt-swse']?.storeAcquisition?.ownerActorId
      ?? null;
    const ownerActor = this._actorById(ownerActorId);
    if (ownerActor) {
      const assigned = Array.from(game.users ?? []).find(user => !user?.isGM && user.character?.id === ownerActor.id);
      if (assigned) return assigned;
      const owner = Array.from(game.users ?? []).find(user => !user?.isGM && Number(ownerActor.ownership?.[user.id] ?? 0) >= 3);
      if (owner) return owner;
    }

    return Array.from(game.users ?? []).find(user => !user?.isGM && Number(actor.ownership?.[user.id] ?? 0) >= 3) ?? null;
  }

  static _entryActor(entry = {}) {
    return this._actorById(entry.id ?? entry.actorId ?? entry.targetActorId);
  }

  static _hpValue(actor) {
    return Number(actor?.system?.hp?.value ?? actor?.system?.hitPoints?.value ?? actor?.system?.hull?.value ?? 0) || 0;
  }

  static _restRows(data = {}) {
    const rows = [];
    for (const entry of Array.isArray(data.healed) ? data.healed : []) {
      rows.push({
        actor: this._entryActor(entry),
        action: data.isFullRest ? 'full-rest' : (data.restType || 'rest'),
        hpRecovered: Number(entry.hpRecovered ?? entry.amountRecovered ?? entry.hp ?? 0) || 0,
        titleAction: data.isFullRest ? 'Rested' : 'Recovered',
        bodyAction: data.isFullRest ? 'rested' : 'recovered through rest',
        previousHp: null,
        newHp: null
      });
    }
    return rows;
  }

  static _gmRows(data = {}) {
    const action = String(data.action || '').toLowerCase();
    const source = Array.isArray(data.recovered) ? data.recovered
      : Array.isArray(data.healed) ? data.healed
        : Array.isArray(data.affected) ? data.affected
          : [];

    return source.map(entry => {
      const actor = this._entryActor(entry);
      const amount = Number(entry.hpRecovered ?? entry.amountRecovered ?? entry.hp ?? data.amount ?? entry.removed ?? 0) || 0;
      let titleAction = 'Updated';
      let body = `${actor?.name || entry.name || 'Your character'} was updated by the GM.`;
      let level = 'success';

      if (action.includes('heal') || action.includes('recovery') || action.includes('rest')) {
        titleAction = action.includes('rest') ? 'Rested' : 'Healed';
        body = amount > 0
          ? `${actor?.name || entry.name || 'Your character'} recovered ${amount} HP from a GM recovery action.`
          : `${actor?.name || entry.name || 'Your character'} was recovered by the GM.`;
      } else if (action.includes('repair')) {
        titleAction = 'Repaired';
        body = amount > 0
          ? `${actor?.name || entry.name || 'Your asset'} was repaired for ${amount} HP by the GM.`
          : `${actor?.name || entry.name || 'Your asset'} was repaired by the GM.`;
      } else if (action.includes('damage')) {
        titleAction = 'Damaged';
        level = 'warning';
        body = amount > 0
          ? `${actor?.name || entry.name || 'Your character'} took ${amount} damage from a GM action.`
          : `${actor?.name || entry.name || 'Your character'} was damaged by the GM.`;
      } else if (action.includes('condition')) {
        titleAction = 'Condition Updated';
        body = `${actor?.name || entry.name || 'Your character'} had their condition track updated by the GM.`;
      } else if (action.includes('status-effect')) {
        titleAction = 'Status Updated';
        body = `${actor?.name || entry.name || 'Your character'} had a status effect ${action.includes('remove') || action.includes('clear') ? 'removed' : 'applied'} by the GM.`;
      } else if (action.includes('second-wind')) {
        titleAction = 'Second Wind Reset';
        body = `${actor?.name || entry.name || 'Your character'} had Second Wind reset by the GM.`;
      }

      return {
        actor,
        action,
        amount,
        hpRecovered: amount,
        titleAction,
        body,
        level,
        previousHp: null,
        newHp: null
      };
    });
  }

  static async _emitRows(rows = [], data = {}, { rest = false } = {}) {
    for (const row of rows) {
      const actor = row.actor;
      if (!actor) continue;
      const ownerUser = this._ownerUserForActor(actor);
      if (!ownerUser) continue;

      const newHp = row.newHp ?? this._hpValue(actor);
      const recovered = Math.max(0, Number(row.hpRecovered ?? row.amount ?? 0) || 0);
      const previousHp = row.previousHp ?? (recovered > 0 ? Math.max(0, newHp - recovered) : undefined);
      const action = row.action || data.action || data.restType || 'gm-recovery';
      const dedupeKey = `healing-${actor.id}-${action}-${data.triggerTime || data.requestId || Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await HolonetEmissionService.emit({
        sourceFamily: SOURCE_FAMILY.HEALING,
        categoryId: HolonetPreferences.CATEGORIES.HEALING,
        dedupeKey,
        skipDedupe: true,
        createRecord: () => {
          const base = {
            actorId: actor.id,
            actorName: actor.name,
            playerUserId: ownerUser.id,
            previousHp,
            newHp,
            amountRecovered: recovered,
            amount: row.amount,
            action,
            reason: rest ? (data.isFullRest ? 'rest-reset' : 'natural-rest') : 'gm-recovery',
            title: `${actor.name} ${row.titleAction || 'Updated'}`,
            body: row.body || (recovered > 0 ? `${actor.name} recovered ${recovered} HP.` : `${actor.name} was updated by the GM.`),
            level: row.level || 'success',
            routeId: 'sheet',
            tab: 'overview',
            sheetAnchor: 'health'
          };
          const record = rest && data.isFullRest
            ? HealingSource.createRestResetNotification(base)
            : rest
              ? HealingSource.createNaturalRestNotification(base)
              : HealingSource.createGmRecoveryNotification(base);
          record.audience = HolonetAudience.singlePlayer(ownerUser.id);
          return record;
        }
      });

      if (result.ok) {
        console.log(`[Holonet] Healing/recovery emitted: ${actor.name} (${action})`);
      } else if (!result.skipped) {
        console.error('[Holonet] Failed to emit healing/recovery event:', result.reason);
      }
    }
  }

  static async onRestCompleted(data = {}) {
    const rows = this._restRows(data);
    if (rows.length) {
      await this._emitRows(rows, data, { rest: true });
      return;
    }

    if (!game.actors) return;
    const fallback = [];
    for (const actor of game.actors) {
      if (actor.type !== 'character') continue;
      if (!this.isEligibleForHealing(actor)) continue;
      const hpRecovered = this.estimateHPRecovered(actor);
      if (hpRecovered <= 0) continue;
      fallback.push({
        actor,
        action: data.isFullRest ? 'full-rest' : 'natural-rest',
        hpRecovered,
        titleAction: data.isFullRest ? 'Rested' : 'Recovered',
        body: `${actor.name} recovered ${hpRecovered} HP through rest and recovery.`
      });
    }
    await this._emitRows(fallback, data, { rest: true });
  }

  static async onGmCombatRecoveryCompleted(data = {}) {
    // performRest emits both restCompleted and swseGmCombatRecoveryCompleted.
    // Let restCompleted own rest messages so players do not receive duplicates.
    if (data.restType || (Array.isArray(data.healed) && data.isFullRest !== undefined)) return;
    const rows = this._gmRows(data);
    await this._emitRows(rows, data, { rest: false });
  }

  static isEligibleForHealing(actor) {
    if (actor.type !== 'character') return false;
    if (actor.system?.isDroid) return false;
    if (actor.system?.isVehicle) return false;
    const currentHp = actor.system?.hp?.value ?? 0;
    return currentHp > 0;
  }

  static estimateHPRecovered(actor) {
    const hitDie = actor.system?.details?.hitDie ?? 8;
    const conMod = actor.system?.attributes?.con?.mod ?? 0;
    return Math.max(1, hitDie + Math.max(0, conMod));
  }
}
