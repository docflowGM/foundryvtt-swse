import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const normalize = value => String(value ?? '').trim().toLowerCase();

function intentEffect(actor, powerItem, { category, target = 'all', amount, label, duration, effectType = 'forcePowerModifier' }) {
  return {
    label: `${powerItem.name}${label ? ` ${label}` : ''}`,
    icon: powerItem.img || 'icons/svg/magic.svg',
    origin: actor.uuid,
    disabled: false,
    transfer: false,
    duration,
    changes: [],
    flags: {
      swse: { effectType },
      'foundryvtt-swse': {
        effectIntent: {
          category,
          target,
          operation: 'increase',
          amount,
          bonusType: 'force',
          application: 'always',
          scope: 'self',
          transfer: true
        }
      }
    }
  };
}

function allDefenseEffects(actor, powerItem, amount, duration) {
  return ['reflex', 'fortitude', 'will'].map(defense => intentEffect(actor, powerItem, {
    category: 'defense',
    target: defense,
    amount,
    duration,
    label: `(+${amount} ${defense})`,
    effectType: 'defenseBonus'
  }));
}

function battleStrikeDamageDice(rollTotal) {
  if (rollTotal >= 20) return '3d6';
  if (rollTotal >= 15) return '2d6';
  if (rollTotal >= 10) return '1d6';
  return null;
}

function battleStrikeEffect(actor, powerItem, rollTotal) {
  const extraDamage = battleStrikeDamageDice(Number(rollTotal) || 0);
  if (!extraDamage) return [];
  return [{
    label: `${powerItem.name} (+1 attack, +${extraDamage} damage on next hit)`,
    icon: powerItem.img || 'icons/svg/sword.svg',
    origin: actor.uuid,
    disabled: false,
    transfer: false,
    duration: { type: 'turns', duration: 1 },
    changes: [],
    flags: {
      swse: { effectType: 'nextAttackModifier' },
      'foundryvtt-swse': {
        forcePowerNextAttack: {
          attackBonus: 1,
          extraDamageFormula: extraDamage,
          bonusType: 'force',
          consumeOn: 'next-qualifying-attack',
          sourcePowerId: powerItem.id,
          sourcePowerName: powerItem.name
        }
      }
    }
  }];
}

export const PHASE4_FORCE_MODIFIER_RULES = Object.freeze({
  'battle strike': Object.freeze({
    automation: 'pending-next-attack',
    sourceVerified: true,
    sourcebook: 'Saga Edition Core Rulebook',
    page: 97
  }),
  battlemind: Object.freeze({
    automation: 'active-effect',
    sourceVerified: true,
    correction: 'defenses-and-damage-not-attack'
  }),
  prescience: Object.freeze({
    automation: 'assisted',
    sourceVerified: false,
    correction: 'remove-dead-system-derived-insight-write'
  }),
  'force weapon': Object.freeze({
    automation: 'assisted',
    sourceVerified: false,
    correction: 'remove-dead-system-derived-weaponBonus-write'
  }),
  'force strike': Object.freeze({
    automation: 'disabled-alias',
    sourceVerified: false,
    correction: 'do-not-confuse-with-battle-strike'
  })
});

export function installPhase4ForceModifierAutomation(ForcePowerEffectsEngine) {
  if (!ForcePowerEffectsEngine || ForcePowerEffectsEngine.__phase4ModifierAutomationInstalled) return;
  const previous = ForcePowerEffectsEngine._buildEffectDataForPower.bind(ForcePowerEffectsEngine);

  ForcePowerEffectsEngine._buildEffectDataForPower = function phase4ModifierBuilder(actor, powerItem, rollTotal) {
    const name = normalize(powerItem?.name);

    if (name === 'battle strike') return battleStrikeEffect(actor, powerItem, rollTotal);

    if (name === 'battlemind') {
      const heroicLevel = Number(actor?.system?.derived?.heroicLevel ?? actor?.system?.level ?? 1) || 1;
      const bonus = Math.max(0, Math.floor(heroicLevel / 2));
      if (!bonus) return [];
      const duration = this._parseDuration?.(powerItem.system?.duration) || { type: 'rounds', rounds: 1 };
      return [
        ...allDefenseEffects(actor, powerItem, bonus, duration),
        intentEffect(actor, powerItem, {
          category: 'damage',
          target: 'all',
          amount: bonus,
          duration,
          label: `(+${bonus} damage)`,
          effectType: 'damageBonus'
        })
      ];
    }

    if (name === 'prescience' || name === 'force weapon' || name === 'force strike') {
      SWSELogger.warn(`SWSE | Force Powers | ${powerItem.name} remains assisted; dead or ambiguous modifier automation was suppressed.`);
      return [];
    }

    return previous(actor, powerItem, rollTotal);
  };

  Object.defineProperty(ForcePowerEffectsEngine, '__phase4ModifierAutomationInstalled', { value: true, configurable: false });
  SWSELogger.log('SWSE | Force Powers | Phase 4 modifier automation installed');
}

export function getBattleStrikeDamageDice(rollTotal) {
  return battleStrikeDamageDice(rollTotal);
}
