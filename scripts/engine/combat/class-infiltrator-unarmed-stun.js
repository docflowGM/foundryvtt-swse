/**
 * Infiltrator — Unarmed Stun, The Force Unleashed Campaign Guide, p. 49.
 * The attacker declares stun BEFORE the attack; an eligible unarmed strike
 * deals stun damage and adds +1/+2/+3 weapon dice at class levels 2/6/10.
 * Natural weapons are not automatically ordinary unarmed strikes.
 *
 * No actor updates; the current weapon and class items are the authority.
 */
import { isNaturalOrUnarmedWeapon, isNaturalWeaponOnly } from '../../items/weapon-branch-resolver.js';
const normalize = x => String(x ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const actorItems = a => Array.from(a?.items?.contents || a?.items || []);

export function infiltratorClassLevel(actor) {
  return actorItems(actor).filter(item =>
    item?.type === 'class'
    && normalize(item?.system?.className || item?.system?.class_name || item?.name) === 'infiltrator'
  ).reduce((max,item) => {
    const level = Number(item?.system?.level);
    return Number.isSafeInteger(level) && level > 0 ? Math.max(max,level) : max;
  },0);
}

export function isInfiltratorUnarmedStrike(weapon) {
  return !!weapon && isNaturalOrUnarmedWeapon(weapon) && !isNaturalWeaponOnly(weapon);
}

export function infiltratorUnarmedStunDice(actor, weapon, damageMode) {
  if (damageMode !== 'stun' || !isInfiltratorUnarmedStrike(weapon)) return 0;
  const level = infiltratorClassLevel(actor);
  if (level < 2) return 0;
  return level >= 10 ? 3 : level >= 6 ? 2 : 1;
}

export function canDeclareInfiltratorUnarmedStun(actor, weapon) {
  return infiltratorUnarmedStunDice(actor,weapon,'stun') > 0;
}
