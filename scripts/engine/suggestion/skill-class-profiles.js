import { canonicalizeSkillKey } from '/systems/foundryvtt-swse/scripts/utils/skill-normalization.js';

function canon(list = []) {
  return list.map((entry) => canonicalizeSkillKey(entry) || entry).filter(Boolean);
}

export const CORE_CLASS_SKILL_PROFILES = {
  scout: {
    locked: canon(['Perception', 'Mechanics']),
    conditional: canon(['Initiative', 'Pilot', 'Stealth', 'Survival']),
    branches: {
      pilot: canon(['Pilot', 'Mechanics']),
      ace: canon(['Pilot', 'Initiative']),
      vehicle: canon(['Pilot', 'Mechanics']),
      stealth: canon(['Stealth', 'Perception']),
      infiltrator: canon(['Stealth', 'Perception']),
      sniper: canon(['Stealth', 'Initiative']),
      recon: canon(['Stealth', 'Perception', 'Initiative']),
      explorer: canon(['Survival', 'Perception']),
      wilderness: canon(['Survival', 'Perception'])
    }
  },
  scoundrel: {
    locked: canon(['Perception', 'Initiative']),
    conditional: canon(['Stealth', 'Deception', 'Mechanics', 'Persuasion']),
    branches: {
      stealth: canon(['Stealth', 'Initiative']),
      infiltrator: canon(['Stealth', 'Deception']),
      ambush: canon(['Stealth', 'Initiative']),
      social: canon(['Deception', 'Persuasion']),
      diplomat: canon(['Persuasion', 'Deception']),
      liar: canon(['Deception', 'Persuasion']),
      slicer: canon(['Mechanics', 'Use Computer']),
      tech: canon(['Mechanics', 'Use Computer'])
    }
  },
  soldier: {
    locked: canon(['Perception', 'Initiative']),
    conditional: canon(['Mechanics', 'Pilot', 'Knowledge (Tactics)', 'Endurance']),
    branches: {
      officer: canon(['Knowledge (Tactics)', 'Perception']),
      commander: canon(['Knowledge (Tactics)', 'Persuasion']),
      pilot: canon(['Pilot', 'Initiative']),
      ace: canon(['Pilot', 'Initiative']),
      engineer: canon(['Mechanics', 'Knowledge (Technology)']),
      tech: canon(['Mechanics', 'Knowledge (Technology)']),
      frontline: canon(['Endurance', 'Initiative'])
    }
  },
  noble: {
    locked: canon(['Persuasion', 'Perception']),
    conditional: canon(['Gather Information', 'Deception', 'Knowledge (Bureaucracy)']),
    branches: {
      social: canon(['Gather Information', 'Deception']),
      diplomat: canon(['Gather Information', 'Persuasion']),
      manipulator: canon(['Deception', 'Gather Information']),
      spy: canon(['Deception', 'Stealth']),
      leader: canon(['Persuasion', 'Knowledge (Tactics)'])
    }
  },
  jedi: {
    locked: canon(['Use the Force', 'Perception']),
    conditional: canon(['Initiative', 'Acrobatics', 'Treat Injury']),
    branches: {
      traditional: canon(['Initiative', 'Acrobatics']),
      guardian: canon(['Initiative', 'Acrobatics']),
      consular: canon(['Treat Injury', 'Knowledge (Galactic Lore)']),
      support: canon(['Treat Injury', 'Persuasion']),
      agile: canon(['Acrobatics', 'Initiative'])
    }
  }
};

export function getCoreClassSkillProfile(classRef) {
  const raw = String(classRef?.name || classRef?.label || classRef?.id || classRef || '').toLowerCase();
  if (!raw) return null;
  if (raw.includes('scout')) return CORE_CLASS_SKILL_PROFILES.scout;
  if (raw.includes('scoundrel')) return CORE_CLASS_SKILL_PROFILES.scoundrel;
  if (raw.includes('soldier')) return CORE_CLASS_SKILL_PROFILES.soldier;
  if (raw.includes('noble')) return CORE_CLASS_SKILL_PROFILES.noble;
  if (raw.includes('jedi')) return CORE_CLASS_SKILL_PROFILES.jedi;
  return null;
}

export function collectProfileBiasSkills(profile, biasTags = []) {
  const normalizedTags = (biasTags || []).map((tag) => String(tag || '').toLowerCase());
  const results = new Set([...(profile?.locked || []), ...(profile?.conditional || [])]);
  for (const tag of normalizedTags) {
    const branch = profile?.branches?.[tag];
    if (Array.isArray(branch)) branch.forEach((skill) => results.add(skill));
  }
  return Array.from(results);
}
