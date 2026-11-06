/**
 * Phase 2C CP8C: independent post-write, SOURCE-FIELD parity checker.
 * This does not certify actor cloning, live gunner station assignments, or
 * operational stock attack eligibility. No rules or production packs mutate.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PINNED_POST_WRITE_BLOBS = Object.freeze({
  'data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json': 'd08ca75b0b30e8b44896588edf3c5ce1cd335557',
  'packs/vehicles-space-transports.db': '65f516504a7ecfa007924e8161c3a876954f13d3',
  'packs/vehicles-capital-ships.db': '8f333b91b684e90f50384dd61a39e5fa80b27994'
});
export const PILOT_TARGETS = Object.freeze([
  { key: 'sotg-corellian-engineering-corporation-action-vi-bulk-transport', pack: 'packs/vehicles-space-transports.db', id: '97c5c070d93b7a0a' },
  { key: 'sotg-corellian-engineering-corporation-cr70-corvette', pack: 'packs/vehicles-capital-ships.db', id: '18cd29422b66693d' },
  { key: 'sotg-ghtroc-industries-class-720-freighter', pack: 'packs/vehicles-space-transports.db', id: '4d5b3422047f5eb8' },
  { key: 'sotg-corellian-engineering-corporation-consular-class-cruiser', pack: 'packs/vehicles-space-transports.db', id: '28f748f51896aa1b' }
]);
const hasOwn = (x,k) => x !== null && typeof x === 'object' && Object.prototype.hasOwnProperty.call(x,k);
const isNum = (a,b) => Number.isFinite(a) && a===b;
const fail = (errors, code, id, expected, observed) => errors.push({code,id,expected,observed});
function expectedInt(value) {return Math.floor((value-10)/2);}
function crewCountMatch(print, text) {
  const observed = String(text ?? '').match(/^\s*(\d+)(?:\s*-\s*(\d+))?/);
  if (!observed) return false;
  if (print.range) return Number(observed[1])===print.range[0] && Number(observed[2])===print.range[1];
  return Number(observed[1])===print.count && observed[2]===undefined;
}
export function auditPostHydration({ledger,packs}) {
  const errors=[],entries=[];
  const certified=ledger.entries.filter(s=>s.fullFieldCertified===true && s.fullWeaponMountReconciled===true);
  if(certified.length!==4)fail(errors,'CERTIFICATE_COUNT_CHANGED','ledger',4,certified.length);
  for (const target of PILOT_TARGETS) {
    const src=certified.find(s=>s.sourceEntryKey===target.key);
    const matches=(packs[target.pack]??[]).filter(x=>x._id===target.id);
    if(!src || matches.length!==1) {
      fail(errors,'SOURCE_OR_PACK_IDENTITY_NOT_UNIQUE',target.key,1,matches.length);
      continue;
    }
    const row=matches[0],s=row.system??{},p=src.printedFacts,issues=[];
    const check=(code,expected,observed)=>{if(JSON.stringify(expected)!==JSON.stringify(observed))fail(issues,code,target.id,expected,observed);};
    check('SOURCEBOOK','Starships of the Galaxy',s.sourcebook);
    check('SOURCE_PAGE',src.printedStatblockStartPage,s.page);
    check('SOURCE_KEY',src.sourceEntryKey,s.stockSourceEntryKey);
    check('SOURCE_VARIANT_VERSION','phase2b-sotg-cp16',s.stockSourceClaimVersion);
    for(const ab of ['str','dex','int']){
      check('ABILITY_'+ab,p.abilities[ab],s.attributes?.[ab]?.base);
      check('ABILITY_MOD_'+ab,expectedInt(p.abilities[ab]),s.attributes?.[ab]?.mod);
    }
    check('HP_MAX',p.durability.hitPoints,s.hp?.max);
    check('HULL_MAX',p.durability.hitPoints,s.hull?.max);
    check('HIT_POINTS',p.durability.hitPoints,s.hitPoints);
    check('DAMAGE_THRESHOLD',p.durability.threshold,s.damageThreshold);
    check('DAMAGE_REDUCTION',p.defenses.damageReduction,s.damageReduction);
    check('REFLEX',p.defenses.reflex,s.reflexDefense);
    check('FLAT_FOOTED',p.defenses.flatFootedReflex,s.flatFooted);
    check('FORTITUDE',p.defenses.fortitude,s.fortitudeDefense);
    check('ARMOR_BONUS',p.defenses.armorBonus,s.armorBonus);
    check('SHIELD_RATING',p.defenses.shieldRating??0,s.shieldRating);
    check('SHIELD_MAX',p.defenses.shieldRating??0,s.shields?.max);
    if(!String(s.size).toLowerCase().startsWith(p.type.split(/\s/)[0].toLowerCase()))
      fail(issues,'SIZE',target.id,p.type,s.size);
    if(!crewCountMatch(p.crew,s.crew))fail(issues,'CREW_RANGE_OR_COUNT',target.id,p.crew,s.crew);
    check('CREW_QUALITY',p.crew.quality,s.crewQuality);
    if(p.crew.typical!==undefined)check('TYPICAL_CREW',p.crew.typical,s.vehicleCrewCount);
    check('CARGO_KG',1000*(p.cargo.number??p.cargo.maximumTons),s.vehicleCargoKg);
    // The published statblocks explicitly say "Carried Craft: None".
    // This is KNOWN absence and must not be encoded as unknown/null.
    if(p.carriedCraft === 'none'){
      check('CARRIED_CRAFT_EXPLICIT_NONE','None',s.carried_craft);
      check('CARRIED_CRAFT_RAW_EXPLICIT_NONE','None',s.vehicleCarriedCraftRaw);
      check('CARRIED_CRAFT_FLAG_KNOWN_FALSE',false,s.vehicleHasCarriedCraft);
    }
    // Unknown/navcomputer source silence is not an asserted absence.
    if(p.hyperspace.navcomputer === 'not stated'){
      check('NAVCOMPUTER_UNSPECIFIED_IS_NULL',null,s.vehicleHasNavicomputer);
    }
    // Object with populated children must remain an object, never a null
    // sentinel that discards known subfields.
    if(s.cost === null || typeof s.cost !== 'object')
      fail(issues,'KNOWN_COST_PARENT_NULL',target.id,'priced new/used object',s.cost);
    if(s.attributes?.int === null || typeof s.attributes?.int !== 'object')
      fail(issues,'KNOWN_INT_PARENT_NULL',target.id,'Int base/mod object',s.attributes?.int);
    check('PRICED_NEW',p.economics.newCredits,s.cost?.new);
    check('PRICED_USED',p.economics.usedCredits,s.cost?.used);
    check('AVAILABILITY',p.economics.availability,s.availability);
    check('HYPERDRIVE',Number(String(p.hyperspace.hyperdrive).replace(/^x/,'')),s.vehicleHyperdriveClass);
    if(p.hyperspace.navcomputer==='printed')check('NAVCOMPUTER',true,s.vehicleHasNavicomputer);
    check('WEAPON_GROUP_COUNT',src.mountAndFiringGroups.length,s.weapons?.length??null);
    check('PRINTED_ARMED',src.mountAndFiringGroups.length>0,s.vehicleHasWeapons);
    const weapon=s.weapons?.[0], group=src.mountAndFiringGroups[0];
    if(group){
      if(weapon){
        check('WEAPON_ID',target.id+'-weapon-1',weapon.id);
        check('WEAPON_GROUP_SOURCE',src.sourceEntryKey+'::ranged-01',weapon.sourceWeaponGroupKey);
        check('WEAPON_DAMAGE',group.damage,weapon.damage);
        check('WEAPON_STATION',group.station,weapon.operatorStation);
        check('SINGLE_PHYSICAL_MOUNT',group.hardwareCount,weapon.mountCount);
        check('FIXED_FORWARD_ARC','fixed-forward',weapon.firingArc);
        check('PRINTED_TOTAL_ONLY','+'+group.attackBonus,weapon.printedAttackTotal);
        check('PRINTED_AUTOFIRE_TOTAL',''+group.autofireBonus,weapon.autofirePrintedTotal);
        if(hasOwn(weapon,'attackBonus') || hasOwn(weapon,'bonus'))
          fail(issues,'INVALID_PRINTED_TOTAL_ADDED_TO_WEAPON',target.id,'no additive attack modifier',weapon);
        const calculated=p.combat.baseAttackBonus+expectedInt(p.abilities.int);
        check('CANONICAL_CREW_BAB_PLUS_VEHICLE_INT',group.attackBonus,calculated);
      }
    }else if(weapon)fail(issues,'UNARMED_SHIP_HAS_WEAPON',target.id,0,s.weapons.length);
    errors.push(...issues);
    entries.push({
      id:target.id,sourceEntryKey:src.sourceEntryKey,
      sourceCertified:true,selectedPackFieldsMatch:issues.length===0,
      publishedWeaponGroups:src.mountAndFiringGroups.length,
      installedWeaponGroups:s.weapons?.length??0,
      trustedRuntimeBindings:0,
      operationalStatus:'NOT_CERTIFIED_PENDING_TRUSTED_CLONE_AND_CREW_STATION_BINDING',
      issues
    });
  }
  return {schema:'swse.vehicle.phase2c.cp8c.post-write-source-parity.v1',
    ok:errors.length===0,fieldCheckStatus:errors.length?'BLOCKED':'SELECTED_STOCK_FIELDS_MATCH_PRINTED_SOURCE',
    operationalCertification:false, trustedRuntimeStockAttackGroups:0,
    fullFoundryV13IntegrationTested:false, entries, errors};
}
export function hashGitBlob(bytes){
  const content=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  return createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex');
}
export function auditRepo(root='.'){
  const files={};
  for(const [path,expectedSha] of Object.entries(PINNED_POST_WRITE_BLOBS)){
    const raw=readFileSync(resolve(root,path)),sha=hashGitBlob(raw);
    if(sha!==expectedSha)throw new Error('POST_WRITE_PIN_CHANGED '+path+' expected '+expectedSha+' got '+sha);
    files[path]=raw.toString('utf8');
  }
  const ledger=JSON.parse(files['data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json']);
  const packs=Object.fromEntries(Object.keys(PINNED_POST_WRITE_BLOBS)
    .filter(x=>x.endsWith('.db'))
    .map(path=>[path,files[path].trim().split(/\r?\n/).filter(Boolean).map(JSON.parse)]));
  return auditPostHydration({ledger,packs});
}
const isMain=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
 const args=process.argv.slice(2),root=args.includes('--repo-root')?args[args.indexOf('--repo-root')+1]:'.';
 const report=auditRepo(root);
 console.log(JSON.stringify(report,null,2));
 if(!report.ok)process.exitCode=1;
}
