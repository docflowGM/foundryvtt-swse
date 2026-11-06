/**
 * CP9B trusted read-only probe of the Foundry-registered, installed vehicle
 * compendiums. A successful result is NOT a trusted world-Actor clone binding.
 * Never consume editable actor.system.stockSourceEntryKey as proof of origin.
 */
export const PILOT_SOURCE_DOCUMENTS=Object.freeze([
  Object.freeze({pack:'foundryvtt-swse.vehicles-space-transports',id:'97c5c070d93b7a0a',
    key:'sotg-corellian-engineering-corporation-action-vi-bulk-transport',page:58,weapons:0}),
  Object.freeze({pack:'foundryvtt-swse.vehicles-capital-ships',id:'18cd29422b66693d',
    key:'sotg-corellian-engineering-corporation-cr70-corvette',page:75,weapons:0}),
  Object.freeze({pack:'foundryvtt-swse.vehicles-space-transports',id:'4d5b3422047f5eb8',
    key:'sotg-ghtroc-industries-class-720-freighter',page:88,weapons:1}),
  Object.freeze({pack:'foundryvtt-swse.vehicles-space-transports',id:'28f748f51896aa1b',
    key:'sotg-corellian-engineering-corporation-consular-class-cruiser',page:126,weapons:0})
]);
export async function verifyPilotVehiclePacksAtRuntime(foundryGame=globalThis.game) {
  const results=[];
  for(const expected of PILOT_SOURCE_DOCUMENTS) {
    const pack=foundryGame?.packs?.get?.(expected.pack);
    if(!pack){
      results.push({id:expected.id,pack:expected.pack,ok:false,reason:'FOUNDRY_PACK_NOT_REGISTERED'});
      continue;
    }
    let doc;
    try{doc=await pack.getDocument(expected.id);}
    catch(error){results.push({id:expected.id,pack:expected.pack,ok:false,reason:'DOCUMENT_READ_FAILED'});continue;}
    if(!doc || doc.id!==expected.id || doc.type!=='vehicle'){
      results.push({id:expected.id,pack:expected.pack,ok:false,reason:'CANONICAL_DOCUMENT_MISSING'});
      continue;
    }
    const s=doc.system??{};
    const gun=s.weapons?.[0];
    const canonical=s.stockSourceEntryKey===expected.key &&
      s.page===expected.page && s.sourcebook==='Starships of the Galaxy' &&
      Array.isArray(s.weapons) && s.weapons.length===expected.weapons &&
      s.carried_craft==='None' && s.vehicleHasCarriedCraft===false &&
      (expected.weapons===0 || (gun?.id===expected.id+'-weapon-1' &&
        gun.sourceEntryKey===expected.key && gun.operatorStation==='gunner' &&
        gun.firingArc==='fixed-forward' && gun.damage==='4d10x2' &&
        !Object.prototype.hasOwnProperty.call(gun,'attackBonus') &&
        !Object.prototype.hasOwnProperty.call(gun,'bonus')));
    results.push({id:expected.id,pack:expected.pack,ok:canonical,
      reason:canonical?'SOURCE_FIELD_PROBE_MATCH':'SOURCE_FIELD_PROBE_MISMATCH',
      uuid:doc.uuid??null});
  }
  return {schema:'swse.vehicle.phase2c.cp9b.live-compendium-readback.v1',
    sourceDocumentsMatched:results.filter(r=>r.ok).length,
    allFourPackDocumentsMatch:results.length===4 && results.every(r=>r.ok),
    actorInstanceBindingAuthorized:false,
    strictStockAttackGroupsAuthorized:0,results};
}
