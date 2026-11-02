/**
 * Officer Share Talent end-of-encounter expiry plan.
 *
 * The talent-effects createItem hook may materialize a separate ActiveEffect
 * linked to the temporary Item via flags['foundryvtt-swse'].talentEffect.
 * Delete both in one governed ActorEngine mutation. Never remove effects from
 * a permanent talent or other encounters; unresolved identities fail closed.
 */
import { isOfficerSharedTalentPrerequisiteWaived } from './officer-share-talent-grant-plan.js';

const entries = value => Array.from(value?.contents || value || []);
const idOf = value => String(value?.id || value?._id || '').trim();
const effectItemId = effect => String(
  effect?.flags?.['foundryvtt-swse']?.talentEffect?.talentItemId
  || effect?.flags?.swse?.talentEffect?.talentItemId || ''
).trim();

export function planOfficerShareTalentExpiry({actor,encounterId}={}) {
  if (!actor?.id || typeof encounterId!=='string' || !encounterId.trim()) {
    throw new Error('Officer Share Talent expiry needs actor and encounter identity');
  }
  const candidates=entries(actor.items).filter(item=>
    item?.flags?.swse?.officerSharedTalent?.encounterId===encounterId
  );
  // Never silently strand an expired benefit if a document/schema update
  // dropped part of the required canonical provenance. Do not guess which
  // Item is safe to remove: require explicit GM recovery instead.
  if(candidates.some(item=>!isOfficerSharedTalentPrerequisiteWaived(item))) {
    throw new Error('Share Talent expiry INDETERMINATE: malformed temporary grant requires GM review');
  }
  const expiring=candidates;
  if(!expiring.length)return {items:[],effects:[]};
  if(expiring.some(item=>!idOf(item)) ||
    new Set(expiring.map(idOf)).size!==expiring.length){
    throw new Error('Cannot safely expire shared talents with ambiguous Item identities');
  }
  const itemIds=new Set(expiring.map(idOf));
  const effects=entries(actor.effects).filter(effect=>itemIds.has(effectItemId(effect)));
  if(effects.some(effect=>!idOf(effect)) ||
    new Set(effects.map(idOf)).size!==effects.length){
    throw new Error('Cannot safely expire shared talents with ambiguous effect identities');
  }
  return {items:[...itemIds],effects:effects.map(idOf)};
}
