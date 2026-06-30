import { SkillChallengeState } from './SkillChallengeState.js';

const SETTING_NAMESPACE = 'foundryvtt-swse';
const SETTING_KEY = 'skillChallengeState';

function canUseFoundrySettings() {
  return Boolean(globalThis.game?.settings);
}

function hasSetting(namespace, key) {
  return Boolean(globalThis.game?.settings?.settings?.has?.(`${namespace}.${key}`));
}

function clone(value) {
  return globalThis.foundry?.utils?.deepClone ? globalThis.foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value ?? null));
}

function sortChallenges(challenges = []) {
  const rank = { active: 0, draft: 1, failed: 2, succeeded: 3, cancelled: 4 };
  return [...challenges].sort((a, b) => {
    const statusDiff = (rank[a.status] ?? 99) - (rank[b.status] ?? 99);
    if (statusDiff) return statusDiff;
    return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
  });
}

/**
 * Register world persistence for GM Skill Challenges.
 *
 * The setting is intentionally internal/config:false. Phase 3.5B exposes a GM
 * tracker UI, not a public settings panel. This mirrors the Holonet/Intel style
 * of storing GM-authored operational state in world settings.
 */
export function registerSkillChallengeSettings() {
  if (!canUseFoundrySettings() || hasSetting(SETTING_NAMESPACE, SETTING_KEY)) return;

  globalThis.game.settings.register(SETTING_NAMESPACE, SETTING_KEY, {
    name: 'Skill Challenge State (internal)',
    hint: 'Stores GM-authored Skill Challenge tracker state for the GM Datapad.',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });
}

export class SkillChallengeStore {
  static settingNamespace = SETTING_NAMESPACE;
  static settingKey = SETTING_KEY;

  static canUseFoundrySettings() {
    return canUseFoundrySettings();
  }

  static ensureRegistered() {
    registerSkillChallengeSettings();
  }

  static async getAll() {
    if (!this.canUseFoundrySettings()) return [];
    this.ensureRegistered();
    const value = globalThis.game.settings.get(SETTING_NAMESPACE, SETTING_KEY);
    const rows = Array.isArray(value) ? value : [];
    return sortChallenges(rows.map(entry => SkillChallengeState.normalize(entry)));
  }

  static async getActiveChallenges() {
    const challenges = await this.getAll();
    return challenges.filter(challenge => challenge.status === 'active');
  }

  static async getById(challengeId) {
    const id = String(challengeId ?? '').trim();
    if (!id) return null;
    const challenges = await this.getAll();
    return challenges.find(challenge => challenge.id === id) ?? null;
  }

  static async saveAll(challenges = []) {
    if (!this.canUseFoundrySettings()) return [];
    if (globalThis.game?.user?.isGM !== true) {
      globalThis.ui?.notifications?.warn?.('Only a GM can update Skill Challenges.');
      return this.getAll();
    }

    this.ensureRegistered();
    const normalized = sortChallenges((Array.isArray(challenges) ? challenges : []).map(entry => SkillChallengeState.normalize(entry)));
    await globalThis.game.settings.set(SETTING_NAMESPACE, SETTING_KEY, clone(normalized));
    return normalized;
  }

  static async saveChallenge(challenge) {
    const normalized = SkillChallengeState.normalize(challenge);
    const existing = await this.getAll();
    const index = existing.findIndex(entry => entry.id === normalized.id);
    const next = [...existing];
    if (index >= 0) next[index] = normalized;
    else next.push(normalized);
    await this.saveAll(next);
    return normalized;
  }

  static async deleteChallenge(challengeId) {
    const id = String(challengeId ?? '').trim();
    if (!id) return false;
    const existing = await this.getAll();
    const next = existing.filter(entry => entry.id !== id);
    await this.saveAll(next);
    return next.length !== existing.length;
  }

  static async clearCompleted() {
    const existing = await this.getAll();
    const next = existing.filter(entry => !['succeeded', 'failed', 'cancelled'].includes(entry.status));
    await this.saveAll(next);
    return existing.length - next.length;
  }
}

export default SkillChallengeStore;
