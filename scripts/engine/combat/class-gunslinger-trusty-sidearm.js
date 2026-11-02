/**
 * Gunslinger — Trusty Sidearm, SWSE Core Rulebook p. 216.
 *
 * At Gunslinger level 2, and at every two Gunslinger levels afterward, add
 * floor(classLevel / 2) to damage while wielding a pistol. The canonical
 * damage compositor applies this additive contribution INSIDE its normal
 * critical multiplier; do not double it again after the roll.
 */
const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g,'');
const itemsOf = actor => Array.from(actor?.items?.contents ?? actor?.items ?? []);

export function gunslingerClassLevel(actor) {
  return itemsOf(actor).filter(item => item?.type === 'class'
    && normalize(item?.system?.className || item?.system?.class_name || item?.name) === 'gunslinger')
    .reduce((max,item) => {
      const level=Number(item?.system?.level);
      return Number.isSafeInteger(level) && level > 0 ? Math.max(max,level) : max;
    },0);
}
export function trustySidearmDamageBonus(actor, {isPistol=false}={}) {
  if(isPistol!==true) return 0;
  return Math.min(5,Math.floor(gunslingerClassLevel(actor)/2));
}
