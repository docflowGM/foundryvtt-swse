/**
 * Saboteur — Destructive (The Force Unleashed Campaign Guide, p. 48).
 *
 * Starting at Saboteur class level 2, damage to vehicles and unattended
 * objects is doubled. This is a damage-roll multiplier before target
 * mitigation, not a permanent attack bonus or an HP damage adjustment.
 *
 * Pure rules helper: the combat pipeline owns target classification and
 * damage packets. Do not infer that a non-vehicle Actor is unattended from
 * token disposition or an actor name.
 */
const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g,'');
const itemsOf = actor => Array.from(actor?.items?.contents || actor?.items || []);

export function saboteurClassLevel(actor) {
  const levels = itemsOf(actor)
    .filter(item => item?.type === 'class'
      && normalize(item?.system?.className || item?.system?.class_name || item?.name) === 'saboteur')
    .map(item => Number(item?.system?.level));
  return levels.reduce((max,level) => Number.isSafeInteger(level) && level > 0
    ? Math.max(max,level) : max,0);
}

export function resolveSaboteurDestructive({attacker,target,targetCategory,unattendedTarget=false}={}) {
  const level=saboteurClassLevel(attacker);
  const category=normalize(targetCategory);
  const appliesToVehicle=category==='vehicle';
  const isObject=category==='object' || category==='device';
  const unattended=target?.system?.unattended===true
    || target?.system?.isUnattended===true
    || target?.flags?.swse?.unattended===true
    || unattendedTarget===true;
  const eligible=level>=2 && (appliesToVehicle || (isObject && unattended));
  return {
    applies:eligible,
    multiplier:eligible?2:1,
    saboteurLevel:level,
    targetCategory:category||'unknown',
    reason:eligible?'Saboteur Destructive (Force Unleashed p. 48)':null,
  };
}
