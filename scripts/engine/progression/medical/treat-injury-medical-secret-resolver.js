/**
 * TreatInjuryMedicalSecretResolver
 *
 * Central read-only interpreter for Medical Secret item metadata. Extra skill-use
 * UI and any future Treat Injury roll/action surfaces should use this instead of
 * re-sniffing feat names independently.
 */
export class TreatInjuryMedicalSecretResolver {
  static HOOK_ALIASES = Object.freeze({
    'improved first aid': 'firstAid',
    'improved heal damage': 'healDamage',
    'improved long-term care': 'longTermCare',
    'improved perform surgery': 'performSurgery',
    'improved revivify': 'revivify',
    'improved treatment': 'treatment',
    'personal physician': 'selfTreatment',
  });

  static resolve(actor) {
    const hooks = new Map();
    const medicLevel = this.getMedicClassLevel(actor);
    for (const item of actor?.items?.filter?.((entry) => entry?.type === 'feat') || []) {
      const tags = Array.isArray(item?.system?.tags) ? item.system.tags.map((tag) => String(tag).toLowerCase()) : [];
      const isMedicalSecret = item?.system?.medicalSecret === true || item?.flags?.swse?.medicalSecret === true || tags.includes('medical_secret');
      if (!isMedicalSecret) continue;
      const name = String(item?.name || '').trim();
      const hook = item?.system?.treatInjuryHook || item?.flags?.swse?.treatInjuryHook || this.HOOK_ALIASES[name.toLowerCase()] || null;
      if (!hook) continue;
      hooks.set(hook, { hook, name, medicLevel, itemId: item.id || null, modifiers: this.getModifiersForHook(hook, medicLevel) });
    }
    return hooks;
  }

  static getMedicClassLevel(actor) {
    const medic = actor?.items?.find?.((item) => {
      if (item?.type !== 'class') return false;
      const name = String(item?.name || item?.system?.class_name || item?.system?.classId || '').toLowerCase();
      return name === 'medic' || name.includes('medic');
    });
    return Number(medic?.system?.level ?? medic?.system?.levels ?? medic?.system?.rank ?? 0) || 0;
  }

  static getModifiersForHook(hook, medicLevel = 0) {
    switch (hook) {
      case 'firstAid': return { extraHealingPerDcMargin: true };
      case 'healDamage': return { bonusHealing: medicLevel };
      case 'longTermCare': return { bonusHealing: medicLevel };
      case 'performSurgery': return { timeMultiplier: 0.5 };
      case 'revivify': return { actionType: 'standard' };
      case 'treatment': return { durationHours: 1, patientMultiplier: 2 };
      case 'selfTreatment': return { ignoreSelfPenalty: true };
      default: return {};
    }
  }

  static applicationMatches(application, hook) {
    const text = String(application || '').toLowerCase();
    if (!text) return false;
    switch (hook) {
      case 'firstAid': return text.includes('first aid');
      case 'revivify': return text.includes('revivify');
      case 'longTermCare': return text.includes('long-term care') || text.includes('long term care');
      case 'performSurgery': return text.includes('perform surgery') || text.includes('surgery');
      case 'healDamage': return text.includes('heal damage') || text.includes('perform surgery') || text.includes('surgery');
      case 'treatment': return text.includes('disease') || text.includes('radiation');
      default: return false;
    }
  }

  static noteFor(secret) {
    const medicLevelText = secret?.medicLevel ? ` Medic class level: ${secret.medicLevel}.` : '';
    switch (secret?.hook) {
      case 'firstAid': return `${secret.name}: with a Medpac, the target gains one additional HP for every point by which your Treat Injury check exceeds the DC.`;
      case 'healDamage': return `${secret.name}: successful Surgery to Heal Damage restores additional HP equal to your Medic class level.${medicLevelText}`;
      case 'longTermCare': return `${secret.name}: successful Long-Term Care restores additional HP equal to your Medic class level.${medicLevelText}`;
      case 'performSurgery': return `${secret.name}: you can perform Surgery in half the usual time.`;
      case 'revivify': return `${secret.name}: you can Revivify as a Standard Action instead of a Full-Round Action.`;
      case 'treatment': return `${secret.name}: treat Disease or Radiation in 1 hour instead of 8 hours, and treat up to twice as many patients.`;
      case 'selfTreatment': return `${secret.name}: no penalties when using Treat Injury on yourself.`;
      default: return `${secret?.name || 'Medical Secret'} applies to this Treat Injury use.`;
    }
  }
}
