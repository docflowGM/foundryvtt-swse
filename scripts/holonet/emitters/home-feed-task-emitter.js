/**
 * HomeFeedTaskEmitter
 *
 * Bridges derived dashboard/task states into durable Holonet records. The Home
 * surface should never synthesize feed rows locally; it asks Holonet for the
 * feed after this bridge has published any newly-discovered tasks.
 */

import { HolonetEngine } from '../holonet-engine.js';
import { HolonetNotification } from '../contracts/holonet-notification.js';
import { HolonetRecipient } from '../contracts/holonet-recipient.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { HolonetProjectionSurface } from '../contracts/holonet-projection-surface.js';
import { INTENT_TYPE, SOURCE_FAMILY, SURFACE_TYPE, DELIVERY_STATE } from '../contracts/enums.js';

function uniqueStrings(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function toRecipient(id) {
  return HolonetRecipient.fromStableId?.(id) || { id, label: id };
}

function actorTaskFingerprint(actor, task) {
  return [actor?.id ?? 'no-actor', task.key, task.badge ?? '', task.title ?? '', task.body ?? ''].join('|');
}

export class HomeFeedTaskEmitter {
  static _inFlightFingerprints = new Set();
  static _recentFingerprints = new Map();
  static _recentTtlMs = 10_000;

  static _pruneRecent(now = Date.now()) {
    for (const [fingerprint, timestamp] of this._recentFingerprints.entries()) {
      if (now - timestamp > this._recentTtlMs) this._recentFingerprints.delete(fingerprint);
    }
  }

  static async emitHomeTasks({ actor, recipientIds = [], progressionSummary = {}, upgradeSummary = {}, alliesSummary = {}, lightsaberConstructionSummary = {} } = {}) {
    const recipients = uniqueStrings(recipientIds);
    if (!actor || !recipients.length) return [];

    const tasks = this._buildTasks(actor, progressionSummary, upgradeSummary, alliesSummary, lightsaberConstructionSummary);
    const emitted = [];
    const now = Date.now();
    this._pruneRecent(now);

    for (const task of tasks) {
      const fingerprint = actorTaskFingerprint(actor, task);
      if (this._inFlightFingerprints.has(fingerprint)) continue;
      if (this._recentFingerprints.has(fingerprint)) continue;

      this._inFlightFingerprints.add(fingerprint);
      try {
        const alreadyExists = await this._hasMatchingRecord({ actor, task, recipients, fingerprint });
        if (alreadyExists) {
          this._recentFingerprints.set(fingerprint, now);
          continue;
        }

        const ok = await this._publishTask({ actor, task, recipients, fingerprint });
        if (ok) {
          this._recentFingerprints.set(fingerprint, Date.now());
          emitted.push(task.key);
        }
      } finally {
        this._inFlightFingerprints.delete(fingerprint);
      }
    }
    return emitted;
  }

  static _buildTasks(actor, progressionSummary = {}, upgradeSummary = {}, alliesSummary = {}, lightsaberConstructionSummary = {}) {
    const actorId = actor?.id ?? 'unknown';
    const entries = [];

    if (progressionSummary.visible && progressionSummary.enabled && (progressionSummary.badge || progressionSummary.routeId === 'chargen')) {
      const isSetup = progressionSummary.routeId === 'chargen';
      entries.push({
        key: `home-task:${actorId}:progression:${isSetup ? 'setup' : String(progressionSummary.badge || 'available')}`,
        routeId: progressionSummary.routeId || 'progression',
        title: isSetup ? 'Character setup available' : 'Training available',
        body: progressionSummary.description || (isSetup ? 'Complete character creation.' : 'A level-up or training step is available.'),
        badge: progressionSummary.badge ?? null,
        intent: isSetup ? INTENT_TYPE.SYSTEM_HOME_TASK : INTENT_TYPE.TRAINING_AVAILABLE,
        sourceFamily: SOURCE_FAMILY.TRAINING,
        senderLabel: isSetup ? 'Datapad' : 'Training',
        category: 'TASK',
        level: isSetup ? 'warning' : 'info',
        priority: isSetup ? 'high' : 'normal',
        icon: '▲'
      });
    }

    if (upgradeSummary.visible && upgradeSummary.enabled && upgradeSummary.badge && !lightsaberConstructionSummary.available) {
      const count = String(upgradeSummary.badge);
      entries.push({
        key: `home-task:${actorId}:workbench:${count}`,
        routeId: 'workbench',
        title: 'Workbench upgrades available',
        body: `${count} item${count === '1' ? '' : 's'} can be upgraded or modified.`,
        badge: count,
        intent: INTENT_TYPE.WORKBENCH_AVAILABLE,
        sourceFamily: SOURCE_FAMILY.WORKBENCH,
        senderLabel: 'Workbench',
        category: 'TASK',
        level: 'info',
        priority: 'normal',
        icon: '✦'
      });
    }

    if (lightsaberConstructionSummary.available) {
      const route = lightsaberConstructionSummary.route || {
        surface: 'workbench',
        category: 'lightsaber',
        initialCategory: 'lightsaber',
        mode: 'construct',
        routeIntent: 'lightsaber-construction',
        entryPoint: 'home-feed'
      };
      entries.push({
        key: `home-task:${actorId}:lightsaber-construction:available`,
        routeId: 'workbench',
        route,
        title: lightsaberConstructionSummary.title || 'Lightsaber Construction Available',
        body: lightsaberConstructionSummary.body || 'MIRAJ · CRYSTAL-SINGER: The cave is open. You are ready to construct your own lightsaber.',
        badge: 'SABER',
        intent: INTENT_TYPE.WORKBENCH_AVAILABLE,
        sourceFamily: SOURCE_FAMILY.WORKBENCH,
        senderLabel: 'Miraj · Crystal-Singer',
        category: 'TASK',
        level: 'warning',
        priority: 'high',
        icon: '✦'
      });
    }

    const openAllies = Number(alliesSummary.openSlots ?? alliesSummary.pending ?? 0);
    if (openAllies > 0) {
      entries.push({
        key: `home-task:${actorId}:allies:${openAllies}`,
        routeId: 'allies',
        title: 'Allies slot open',
        body: `${openAllies} companion slot${openAllies === 1 ? '' : 's'} can be filled from the Allies app.`,
        badge: String(openAllies),
        intent: INTENT_TYPE.ALLIES_SLOT_OPEN,
        sourceFamily: SOURCE_FAMILY.ALLIES,
        senderLabel: 'Allies',
        category: 'TASK',
        level: 'info',
        priority: 'normal',
        icon: '✹'
      });
    }

    return entries;
  }

  static async _hasMatchingRecord({ actor, task, recipients, fingerprint } = {}) {
    for (const recipientId of recipients) {
      const records = await HolonetEngine.storage.getRecordsByRecipient(recipientId, [DELIVERY_STATE.PUBLISHED]).catch(() => []);
      if (records.some(record => (
        record?.metadata?.homeTaskKey === task.key
        && record?.metadata?.homeTaskFingerprint === fingerprint
        && record?.metadata?.actorId === actor?.id
      ))) return true;
    }
    return false;
  }

  static async _publishTask({ actor, task, recipients, fingerprint } = {}) {
    const recipientObjects = recipients.map(toRecipient).filter(Boolean);
    const record = new HolonetNotification({
      intent: task.intent,
      sender: HolonetSender.system(task.senderLabel || 'Datapad'),
      audience: HolonetAudience.selectedPlayers(recipients),
      recipients: recipientObjects,
      title: task.title,
      body: task.body,
      sourceFamily: task.sourceFamily,
      sourceId: actor?.id ?? null,
      level: task.level ?? 'info',
      icon: task.icon ?? null,
      metadata: {
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? null,
        category: task.category ?? 'TASK',
        priority: task.priority ?? 'normal',
        routeId: task.routeId ?? null,
        route: task.route ?? null,
        workbenchCategory: task.route?.category ?? null,
        initialCategory: task.route?.initialCategory ?? null,
        mode: task.route?.mode ?? null,
        routeIntent: task.route?.routeIntent ?? null,
        entryPoint: task.route?.entryPoint ?? null,
        badge: task.badge ?? null,
        homeTaskKey: task.key,
        homeTaskFingerprint: fingerprint,
        generatedBy: 'HomeFeedTaskEmitter'
      },
      projections: []
    });
    record.projections = [new HolonetProjectionSurface({ surfaceType: SURFACE_TYPE.HOME_FEED, recordId: record.id })];

    return HolonetEngine.publish(record, { skipSocket: false, suppressLocalHook: true });
  }
}
