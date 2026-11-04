/**
 * Saboteur — Master Saboteur (Force Unleashed Campaign Guide).
 * At Saboteur class level 10, Mechanics checks to disable a device or
 * handle explosives may be rerolled, keeping the better result.
 *
 * Since there is no per-use cost and the better result always wins, the
 * in-system Mechanics applications take the beneficial reroll automatically.
 * The original and reroll remain available for the chat/GM audit.
 *
 * No general Mechanics, repair, jury-rig, or other skill use is affected.
 */
const classKey = name => String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const itemsOf = actor => Array.from(actor?.items?.contents ?? actor?.items ?? []);
const eligibleUses = new Set(['disable-device','handle-explosives']);

export function masterSaboteurClassLevel(actor) {
  return itemsOf(actor).filter(item => item?.type === 'class'
    && classKey(item?.system?.className || item?.system?.class_name || item?.name) === 'saboteur')
    .reduce((max,item) => {
      const level = Number(item?.system?.level);
      return Number.isSafeInteger(level) && level > 0 ? Math.max(max,level) : max;
    },0);
}

export function canMasterSaboteurReroll(actor, application) {
  return eligibleUses.has(application) && masterSaboteurClassLevel(actor) >= 10;
}

/**
 * Caller supplies the ordinary d20 roller; no second RNG, bonuses, or chat
 * side effects are invented by this helper.
 */
export async function rollMasterSaboteurMechanicsCheck({actor,application,rollD20}={}) {
  if (typeof rollD20 !== 'function') throw new Error('A Mechanics d20 roll authority is required');
  const original = await rollD20();
  if (!Number.isFinite(original?.total)) throw new Error('Mechanics roll returned an invalid total');
  if (!canMasterSaboteurReroll(actor,application)) {
    return {roll:original,original,reroll:null,rerolled:false,kept:'original'};
  }
  const reroll = await rollD20();
  if (!Number.isFinite(reroll?.total)) throw new Error('Master Saboteur reroll returned an invalid total');
  const useReroll = reroll.total > original.total;
  return {
    roll:useReroll?reroll:original,
    original,reroll,rerolled:true,
    kept:useReroll?'reroll':'original',
  };
}

export function masterSaboteurRerollSummary(result) {
  if (!result?.rerolled) return null;
  return {
    source:'Saboteur — Master Saboteur',
    original:result.original.total,
    reroll:result.reroll.total,
    kept:result.kept,
    selected:result.roll.total,
  };
}
