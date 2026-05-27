import {
  defaultForceIntuitionChance,
  defaultForceSensitiveNpcChance,
  randomPazaakProfession,
  randomPazaakTableFact,
  randomPazaakPersonalityId,
  resolvePazaakAiPersonality
} from './games/pazaak/pazaak-ai-personalities.js';
import { getGameSettingsSnapshot } from './game-settings.js';

export class GameOpponentProfileService {
  static async randomName(kind = 'living') {
    try {
      const module = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      const picker = kind === 'droid' ? module?.getRandomDroidName : module?.getRandomName;
      if (typeof picker === 'function') {
        const name = await picker();
        if (String(name ?? '').trim()) return name;
      }
    } catch (_err) {
      // Fall through to safe generic labels below.
    }
    return kind === 'droid' ? 'RX-44' : 'Wandering Gambler';
  }

  static rollForceSensitive(settings = getGameSettingsSnapshot()) {
    const enabled = settings.allowAiForceSensitive !== false;
    if (!enabled) return false;
    const chance = Number(settings.aiForceSensitiveChance ?? defaultForceSensitiveNpcChance()) || 0;
    return chance > 0 && Math.random() < Math.max(0, Math.min(1, chance));
  }

  static async buildPazaakAiOpponentProfile({ difficulty = null, fairness = null, personality = null, kind = null } = {}) {
    const settings = getGameSettingsSnapshot();
    const opponentKind = kind || (Math.random() < 0.58 ? 'droid' : 'living');
    const personalityId = personality && personality !== 'random'
      ? String(personality)
      : randomPazaakPersonalityId({ allowForceTouched: true });
    const personalityData = resolvePazaakAiPersonality(personalityId);
    const forceSensitive = this.rollForceSensitive(settings);
    return {
      name: await this.randomName(opponentKind),
      kind: opponentKind,
      profession: randomPazaakProfession(),
      tableFact: randomPazaakTableFact(),
      difficulty: difficulty || settings.defaultAiDifficulty || 'medium',
      fairness: fairness || settings.defaultAiFairness || 'fair',
      personality: personalityId,
      personalityLabel: personalityData.label || personalityId,
      personalityQuality: personalityData.quality || '',
      forceSensitive,
      forceSensitivityChance: Number(settings.aiForceIntuitionChance ?? defaultForceIntuitionChance()) || 0.05
    };
  }
}
