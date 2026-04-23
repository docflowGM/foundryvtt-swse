import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const HYDRATION_TRACE_WINDOW_MS = 8000;

function cloneSafe(value) {
  try {
    return foundry.utils.deepClone(value);
  } catch (_err) {
    return value;
  }
}

export function isHydrationSensitivePath(path) {
  if (!path || typeof path !== 'string') return false;
  return (
    path === 'system.conditionTrack.current' ||
    path.startsWith('system.skills.') ||
    path.startsWith('system.defenses.')
  );
}

export function collectHydrationSensitivePaths(updateData) {
  if (!updateData || typeof updateData !== 'object') return [];
  const flat = foundry.utils.flattenObject(updateData);
  return Object.keys(flat).filter(isHydrationSensitivePath);
}

export function captureHydrationSnapshot(actor) {
  if (!actor) {
    return { error: 'no actor' };
  }

  const system = actor.system ?? {};
  const derived = system.derived ?? {};
  const defenses = system.defenses ?? {};
  const derivedDefenses = derived.defenses ?? {};
  const derivedSkills = derived.skills ?? {};
  const conditionCurrent = Number(system.conditionTrack?.current ?? 0) || 0;
  const conditionPenalty = Number(derived.damage?.conditionPenalty ?? 0) || 0;

  const snapshot = {
    actorId: actor.id,
    actorName: actor.name,
    conditionTrack: {
      current: conditionCurrent,
      persistent: cloneSafe(system.conditionTrack?.persistentSteps ?? system.conditionTrack?.persistent ?? null),
      derivedPenalty: conditionPenalty
    },
    defenses: {
      fortitude: {
        ability: defenses.fortitude?.ability ?? null,
        classBonus: defenses.fortitude?.classBonus ?? null,
        misc: defenses.fortitude?.misc?.user?.extra ?? defenses.fortitude?.miscMod ?? null,
        total: derivedDefenses.fortitude?.total ?? null
      },
      reflex: {
        ability: defenses.reflex?.ability ?? null,
        armor: defenses.reflex?.armor ?? null,
        classBonus: defenses.reflex?.classBonus ?? null,
        misc: defenses.reflex?.misc?.user?.extra ?? defenses.reflex?.miscMod ?? null,
        total: derivedDefenses.reflex?.total ?? null
      },
      will: {
        ability: defenses.will?.ability ?? null,
        classBonus: defenses.will?.classBonus ?? null,
        misc: defenses.will?.misc?.user?.extra ?? defenses.will?.miscMod ?? null,
        total: derivedDefenses.will?.total ?? null
      },
      flatFooted: derivedDefenses.flatFooted?.total ?? null,
      damageThreshold: derived.damageThreshold?.total ?? derivedDefenses.damageThreshold?.total ?? null
    }
  };

  const sampleSkillKeys = ['acrobatics', 'initiative', 'perception', 'useTheForce'];
  const skillState = {};
  for (const key of sampleSkillKeys) {
    const base = system.skills?.[key];
    const derivedSkill = derivedSkills?.[key];
    if (!base && !derivedSkill) continue;
    skillState[key] = {
      trained: base?.trained ?? null,
      focused: base?.focused ?? null,
      miscMod: base?.miscMod ?? null,
      selectedAbility: base?.selectedAbility ?? null,
      total: derivedSkill?.total ?? derivedSkill ?? null
    };
  }
  snapshot.skills = skillState;

  return snapshot;
}

export function summarizeDefensePanel(panel) {
  const defenses = Array.isArray(panel?.defenses) ? panel.defenses : [];
  return defenses.map((entry) => ({
    key: entry?.key ?? null,
    systemKey: entry?.systemKey ?? null,
    total: entry?.total ?? null,
    armorBonus: entry?.armorBonus ?? null,
    abilityKey: entry?.abilityKey ?? null,
    abilityMod: entry?.abilityMod ?? null,
    classDef: entry?.classDef ?? null,
    miscMod: entry?.miscMod ?? null,
    conditionPenalty: entry?.conditionPenalty ?? null
  }));
}

export function summarizeBiographyPanel(panel) {
  return {
    identity: {
      name: panel?.identity?.name ?? null,
      class: panel?.identity?.class ?? null,
      species: panel?.identity?.species ?? null,
      level: panel?.identity?.level ?? null,
      background: panel?.identity?.background ?? null
    },
    biographyLength: typeof panel?.biography === 'string' ? panel.biography.length : null
  };
}

export function recordHydrationMutation(sheet, info = {}) {
  const payload = {
    timestamp: Date.now(),
    isoTime: new Date().toISOString(),
    actorId: sheet?.actor?.id ?? info.actorId ?? null,
    actorName: sheet?.actor?.name ?? info.actorName ?? null,
    ...cloneSafe(info)
  };

  if (sheet) {
    sheet._lastHydrationMutation = payload;
  }
  globalThis.SWSE_LAST_HYDRATION_MUTATION = payload;
  return payload;
}

export function getRecentHydrationMutation(sheet, maxAgeMs = HYDRATION_TRACE_WINDOW_MS) {
  const payload = sheet?._lastHydrationMutation ?? globalThis.SWSE_LAST_HYDRATION_MUTATION ?? null;
  if (!payload?.timestamp) return null;
  if ((Date.now() - payload.timestamp) > maxAgeMs) return null;
  return payload;
}

export function emitHydrationWarning(stage, data = {}) {
  SWSELogger.warn(`[HYDRATION TRACE] ${stage}`, data);
}

export function emitHydrationError(stage, data = {}) {
  SWSELogger.error(`[HYDRATION TRACE] ${stage}`, data);
}
