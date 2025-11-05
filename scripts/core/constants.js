/**
 * SWSE System Constants
 */

export const CONDITION_PENALTIES = {
  "normal": 0,
  "-1": -1,
  "-2": -2,
  "-5": -5,
  "-10": -10,
  "helpless": -10
};

export const SIZE_MODIFIERS = {
  "fine": -8,
  "diminutive": -4,
  "tiny": -2,
  "small": -1,
  "medium": 0,
  "large": 1,
  "huge": 2,
  "gargantuan": 4,
  "colossal": 8
};

export const SIZE_AC_MODIFIERS = {
  "fine": 8,
  "diminutive": 4,
  "tiny": 2,
  "small": 1,
  "medium": 0,
  "large": -1,
  "huge": -2,
  "gargantuan": -4,
  "colossal": -8
};

export const BAB_PROGRESSIONS = {
  "slow": 0.5,
  "medium": 0.75,
  "fast": 1.0
};

export const SAVE_PROGRESSIONS = {
  "slow": level => Math.floor(level / 3),
  "fast": level => Math.floor(level / 2) + 2
};

export const SKILL_ABILITY_MAP = {
  acrobatics: 'dex',
  climb: 'str',
  deception: 'cha',
  endurance: 'con',
  gatherInformation: 'cha',
  initiative: 'dex',
  jump: 'str',
  knowledge: 'int',
  mechanics: 'int',
  perception: 'wis',
  persuasion: 'cha',
  pilot: 'dex',
  ride: 'dex',
  stealth: 'dex',
  survival: 'wis',
  swim: 'str',
  treatInjury: 'wis',
  useComputer: 'int',
  useTheForce: 'cha'
};

export const FORCE_POWER_LEVELS = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 30,
  6: 35
};

export const CARRYING_CAPACITY_MULTIPLIERS = {
  "fine": 0.125,
  "diminutive": 0.25,
  "tiny": 0.5,
  "small": 0.75,
  "medium": 1,
  "large": 2,
  "huge": 4,
  "gargantuan": 8,
  "colossal": 16
};
