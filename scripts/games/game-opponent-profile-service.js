import {
  defaultForceIntuitionChance,
  defaultForceSensitiveNpcChance,
  randomPazaakProfession,
  randomPazaakTableFact,
  randomPazaakPersonalityId,
  resolvePazaakAiPersonality
} from './games/pazaak/pazaak-ai-personalities.js';
import { getGameSettingsSnapshot } from './game-settings.js';

const FALLBACK_LIVING_NAMES = [
  'Rax Venn Daal', 'Lyra Korr Sol', 'Jarek Solan Marr', 'Nyssa Val Marr', 'Torvan Kree Ossik',
  'Kaela Vire Noor', 'Dax Pell Korr', 'Mira Sol Daal', 'Voren Kess Marr', 'Elra Venn Ash'
];

const FALLBACK_DROID_NAMES = [
  'RX-44', 'P3-L9', 'R8-K5', 'C7-M4', 'D7-P3', 'K2-R6', 'M5-T8', 'BX-9R', 'T4-M9', 'HK-5Q'
];

let chargenNameCache = null;

function randomItem(items = [], fallback = '') {
  const list = Array.isArray(items) ? items.filter(item => item != null && String(item).trim()) : [];
  if (!list.length) return fallback;
  return list[Math.floor(Math.random() * list.length)];
}

async function loadChargenNames() {
  if (chargenNameCache) return chargenNameCache;
  try {
    const module = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js');
    const CharacterGenerator = module?.default;
    chargenNameCache = {
      living: Array.isArray(CharacterGenerator?.RANDOM_NAMES) ? CharacterGenerator.RANDOM_NAMES.slice() : FALLBACK_LIVING_NAMES.slice(),
      droid: Array.isArray(CharacterGenerator?.RANDOM_DROID_NAMES) ? CharacterGenerator.RANDOM_DROID_NAMES.slice() : FALLBACK_DROID_NAMES.slice()
    };
  } catch (_err) {
    chargenNameCache = { living: FALLBACK_LIVING_NAMES.slice(), droid: FALLBACK_DROID_NAMES.slice() };
  }
  return chargenNameCache;
}

export class GameOpponentProfileService {
  static async randomName(kind = 'living') {
    const names = await loadChargenNames();
    const list = kind === 'droid' ? names.droid : names.living;
    return randomItem(list, kind === 'droid' ? 'RX-44' : 'Wandering Gambler');
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
