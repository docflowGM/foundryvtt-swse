/**
 * HoloNews ambient auto-publisher.
 *
 * This is intentionally GM-controlled and disabled by default. When enabled,
 * only the primary active GM client publishes scheduled ambient HoloNews so
 * multiple connected GMs do not duplicate filler stories. Ambient stories are
 * never promoted to Breaking News by this service.
 */

import { HolonetEngine } from '../holonet-engine.js';
import { HolonetStorage } from './holonet-storage.js';
import { BulletinSource } from '../sources/bulletin-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { DELIVERY_STATE, SOURCE_FAMILY, SURFACE_TYPE } from '../contracts/enums.js';
import { HolonewsGenerator } from '../data/holonews-seed-events.js';
import { HolonewsAtomPolicy } from './holonews-atom-policy.js';
import { ShellMutationGuard } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellMutationGuard.js';

const SYSTEM_ID = 'foundryvtt-swse';
const SETTING_KEY = 'holonewsAutoPublisherPolicy';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_CADENCE_MINUTES = 240;
const MAX_BATCH_SIZE = 5;

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function isoNow() {
  return new Date().toISOString();
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + (Math.max(1, Number(minutes) || DEFAULT_CADENCE_MINUTES) * 60 * 1000)).toISOString();
}

function uniqueValues(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

export class HolonewsAutoPublisher {
  static SETTING_KEY = SETTING_KEY;
  static #timerId = null;
  static #checkInFlight = false;

  static defaultPolicy() {
    return {
      enabled: false,
      cadenceMinutes: DEFAULT_CADENCE_MINUTES,
      maxPerRun: 1,
      hideUsedSeeds: true,
      allowRepeatsWhenExhausted: false,
      query: '',
      category: '',
      sector: '',
      priority: '',
      sourceName: 'Galaxy News Net',
      lastCheckAt: null,
      lastPublishedAt: null,
      nextDueAt: null,
      totalPublished: 0,
      history: []
    };
  }

  static async getPolicy() {
    let raw = {};
    try {
      raw = await game.settings.get(SYSTEM_ID, SETTING_KEY) ?? {};
    } catch (err) {
      console.warn('[HoloNewsAutoPublisher] Could not read policy setting:', err);
    }
    return this.normalizePolicy(raw);
  }

  static normalizePolicy(raw = {}) {
    const base = this.defaultPolicy();
    const policy = {
      ...base,
      ...(raw && typeof raw === 'object' ? raw : {})
    };

    policy.enabled = policy.enabled === true;
    policy.cadenceMinutes = clampInteger(policy.cadenceMinutes, 15, 10080, DEFAULT_CADENCE_MINUTES);
    policy.maxPerRun = clampInteger(policy.maxPerRun, 1, MAX_BATCH_SIZE, 1);
    policy.hideUsedSeeds = policy.hideUsedSeeds !== false;
    policy.allowRepeatsWhenExhausted = policy.allowRepeatsWhenExhausted === true;
    policy.query = String(policy.query || '').trim();
    policy.category = String(policy.category || '').trim();
    policy.sector = String(policy.sector || '').trim();
    policy.priority = String(policy.priority || '').trim();
    policy.sourceName = String(policy.sourceName || 'Galaxy News Net').trim() || 'Galaxy News Net';
    policy.history = Array.isArray(policy.history) ? policy.history.slice(-25) : [];
    policy.totalPublished = clampInteger(policy.totalPublished, 0, 999999, 0);

    return policy;
  }

  static async savePolicy(patch = {}, { resetSchedule = false } = {}) {
    const previous = await this.getPolicy();
    const next = this.normalizePolicy({ ...previous, ...patch });
    const wasDisabled = !previous.enabled && next.enabled;
    const cadenceChanged = Number(previous.cadenceMinutes) !== Number(next.cadenceMinutes);

    if (!next.enabled) {
      next.nextDueAt = null;
    } else if (resetSchedule || wasDisabled || cadenceChanged || !next.nextDueAt) {
      next.nextDueAt = addMinutes(new Date(), next.cadenceMinutes);
    }

    await ShellMutationGuard.withDocumentMutation(null, () => game.settings.set(SYSTEM_ID, SETTING_KEY, next), {
      reason: 'holonews-auto-publisher-save-policy',
      surfaceId: 'holonet'
    });
    return next;
  }

  static initialize() {
    if (!game.user?.isGM) return false;
    if (this.#timerId) return true;

    this.#timerId = window.setInterval(() => {
      this.checkAndPublish({ reason: 'scheduled-interval' });
    }, CHECK_INTERVAL_MS);

    Hooks.once('closeWorld', () => this.stop());
    this.checkAndPublish({ reason: 'startup' });
    console.log('[HoloNewsAutoPublisher] Initialized for GM client');
    return true;
  }

  static stop() {
    if (this.#timerId) {
      window.clearInterval(this.#timerId);
      this.#timerId = null;
    }
  }

  static isPrimaryActiveGm() {
    if (!game.user?.isGM) return false;
    const activeGms = Array.from(game.users ?? [])
      .filter((user) => user?.isGM && user?.active)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return !activeGms.length || activeGms[0]?.id === game.user.id;
  }

  static async checkAndPublish({ reason = 'scheduled', force = false } = {}) {
    if (this.#checkInFlight) return { published: 0, skipped: true, reason: 'check-in-flight' };
    if (!this.isPrimaryActiveGm()) return { published: 0, skipped: true, reason: 'not-primary-gm' };

    this.#checkInFlight = true;
    try {
      let policy = await this.getPolicy();
      const now = new Date();

      if (!force && !policy.enabled) {
        return { published: 0, skipped: true, reason: 'disabled' };
      }

      if (!force) {
        if (!policy.nextDueAt) {
          policy = await this.savePolicy({ ...policy, lastCheckAt: isoNow() }, { resetSchedule: true });
          return { published: 0, skipped: true, reason: 'scheduled-first-run' };
        }
        const nextDue = Date.parse(policy.nextDueAt);
        if (Number.isFinite(nextDue) && nextDue > now.getTime()) {
          await this.savePolicy({ ...policy, lastCheckAt: isoNow() });
          return { published: 0, skipped: true, reason: 'not-due', nextDueAt: policy.nextDueAt };
        }
      }

      return await this.publishAmbientBatch({ policy, reason, force });
    } catch (err) {
      console.error('[HoloNewsAutoPublisher] Scheduled HoloNews publish failed:', err);
      return { published: 0, failed: true, error: err?.message || String(err) };
    } finally {
      this.#checkInFlight = false;
    }
  }

  static async publishNow({ count = 1 } = {}) {
    if (!this.isPrimaryActiveGm()) {
      ui?.notifications?.warn?.('Only the primary active GM client can auto-publish ambient HoloNews.');
      return { published: 0, skipped: true, reason: 'not-primary-gm' };
    }
    const policy = await this.getPolicy();
    const manualPolicy = this.normalizePolicy({ ...policy, maxPerRun: clampInteger(count, 1, MAX_BATCH_SIZE, 1) });
    return this.publishAmbientBatch({ policy: manualPolicy, reason: 'manual-publish-now', force: true });
  }

  static async publishAmbientBatch({ policy, reason = 'scheduled', force = false } = {}) {
    policy = this.normalizePolicy(policy);
    const usedSeedIds = await this.getUsedSeedIds();
    const seedPool = await this.selectSeedPool(policy, usedSeedIds);
    const count = force ? policy.maxPerRun : policy.maxPerRun;
    const seeds = seedPool.slice(0, count);

    if (!seeds.length) {
      const nextPolicy = await this.savePolicy({
        ...policy,
        lastCheckAt: isoNow(),
        nextDueAt: policy.enabled ? addMinutes(new Date(), policy.cadenceMinutes) : policy.nextDueAt,
        history: this.appendHistory(policy.history, {
          at: isoNow(),
          reason,
          published: 0,
          note: 'No eligible ambient wire stories matched the auto-publish policy.'
        })
      });
      return { published: 0, policy: nextPolicy, skipped: true, reason: 'no-eligible-seeds' };
    }

    const published = [];
    for (const seed of seeds) {
      const record = this.createAmbientRecord(seed, policy, { reason });
      const ok = await HolonetEngine.publish(record);
      if (ok) published.push({ seedId: seed.id, recordId: record.id, title: record.title });
      else console.warn('[HoloNewsAutoPublisher] Failed to publish ambient HoloNews seed:', seed.id);
    }

    const nextPolicy = await this.savePolicy({
      ...policy,
      lastCheckAt: isoNow(),
      lastPublishedAt: published.length ? isoNow() : policy.lastPublishedAt,
      nextDueAt: policy.enabled ? addMinutes(new Date(), policy.cadenceMinutes) : policy.nextDueAt,
      totalPublished: Number(policy.totalPublished || 0) + published.length,
      history: this.appendHistory(policy.history, {
        at: isoNow(),
        reason,
        published: published.length,
        seedIds: published.map((entry) => entry.seedId)
      })
    });

    if (published.length) {
      Hooks.callAll('swseHolonews:autoPublished', { published, reason });
    }

    return { published: published.length, records: published, policy: nextPolicy };
  }

  static async getUsedSeedIds() {
    const records = await HolonetStorage.getAllRecords();
    return uniqueValues(records
      .filter((record) => record.sourceFamily === SOURCE_FAMILY.BULLETIN)
      .map((record) => record.metadata?.holonewsSeedId));
  }

  static async selectSeedPool(policy, usedSeedIds = []) {
    const atomPolicy = await HolonewsAtomPolicy.getPolicy();
    const atomFilters = HolonewsAtomPolicy.toGeneratorFilters(atomPolicy);
    const filters = {
      ...atomFilters,
      query: policy.query,
      category: policy.category,
      sector: policy.sector,
      priority: policy.priority,
      excludeIds: policy.hideUsedSeeds ? usedSeedIds : []
    };
    let pool = HolonewsGenerator.sample(HolonewsGenerator.count(filters), filters);

    if (!pool.length && policy.hideUsedSeeds && policy.allowRepeatsWhenExhausted) {
      pool = HolonewsGenerator.sample(HolonewsGenerator.count({ ...filters, excludeIds: [] }), { ...filters, excludeIds: [] });
    }

    return pool;
  }

  static createAmbientRecord(seed, policy, { reason = 'scheduled' } = {}) {
    const now = isoNow();
    const body = [
      seed.content,
      '',
      `<p class="holonews-wire-note">Filed by ${policy.sourceName || 'Galaxy News Net'}.</p>`
    ].join('\n');

    return BulletinSource.toRecord({
      title: seed.title,
      body,
      tags: uniqueValues(['holonews', 'ambient', seed.category, seed.sector, seed.priority]),
      channel: SURFACE_TYPE.HOLONEWS,
      priority: 'normal',
      audience: HolonetAudience.PUBLIC,
      publishedAt: now,
      metadata: {
        holonewsSeedId: seed.id,
        category: seed.category,
        sector: seed.sector,
        generated: true,
        generatedReason: reason,
        ambient: true
      },
      sourceFamily: SOURCE_FAMILY.BULLETIN,
      deliveryState: DELIVERY_STATE.PUBLISHED
    });
  }

  static appendHistory(history = [], entry = {}) {
    return [
      ...(Array.isArray(history) ? history : []),
      entry
    ].slice(-25);
  }
}
