/**
 * Phase 2C CP7 - read-only verifier for the first four strict source records.
 * It deliberately does NOT issue runtime stock-weapon bindings. The real
 * repository packs are JSONL, and this script reads them without writing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PINNED_INPUTS = Object.freeze({
  'data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json': 'd08ca75b0b30e8b44896588edf3c5ce1cd335557',
  'packs/vehicles-space-transports.db': 'ea5e48bc2aaba4369f29cfa4ff35a49f7d998c5d',
  'packs/vehicles-capital-ships.db': '9bd523944a37d86454adc3981b4553b7924ae3f4'
});

export const PILOT_CANDIDATES = Object.freeze([
  { sourceEntryKey: 'sotg-corellian-engineering-corporation-action-vi-bulk-transport', pack: 'packs/vehicles-space-transports.db', packId: '97c5c070d93b7a0a', packName: 'Corellian Action VI Bulk Transport' },
  { sourceEntryKey: 'sotg-corellian-engineering-corporation-cr70-corvette', pack: 'packs/vehicles-capital-ships.db', packId: '18cd29422b66693d', packName: 'CR70 Corellian Corvette' },
  { sourceEntryKey: 'sotg-ghtroc-industries-class-720-freighter', pack: 'packs/vehicles-space-transports.db', packId: '4d5b3422047f5eb8', packName: 'Ghtroc 720 Freighter' },
  { sourceEntryKey: 'sotg-corellian-engineering-corporation-consular-class-cruiser', pack: 'packs/vehicles-space-transports.db', packId: '28f748f51896aa1b', packName: 'Corellian Consular-Class Cruiser' }
]);

function addBlock(blockers, code, field, expected, observed) {
  blockers.push({ code, field, expected, observed });
}
const numberIfPresent = x => (x === null || x === undefined || x === '' ? null : Number.isFinite(Number(x)) ? Number(x) : null);

export function auditBindingCandidate({ candidate, source, packRows }) {
  const blockers = [], comparisons = [];
  if (!source || source.sourceEntryKey !== candidate.sourceEntryKey) {
    addBlock(blockers, 'CERTIFIED_SOURCE_IDENTITY_NOT_FOUND', 'sourceEntryKey', candidate.sourceEntryKey, source?.sourceEntryKey ?? null);
    return { sourceEntryKey:candidate.sourceEntryKey, pack:candidate.pack, packId:candidate.packId, sourceCertified:false, fieldParityCertified:false, trustedRuntimeWeaponGroups:0, blockers, comparisons };
  }
  const sourceCertified = source.fullFieldCertified === true && source.fullWeaponMountReconciled === true;
  if (!sourceCertified) addBlock(blockers, 'SOURCE_STRICT_CERTIFICATE_MISSING', 'sourceCertification', true, false);
  const matches = (packRows ?? []).filter(row => row?._id === candidate.packId);
  if (matches.length !== 1 || matches[0]?.name !== candidate.packName) {
    addBlock(blockers, 'PACK_IDENTITY_NOT_UNIQUE_OR_MISMATCHED', '_id/name', `${candidate.packId}/${candidate.packName}`, matches.map(x=>`${x._id}/${x.name}`));
    return { sourceEntryKey:candidate.sourceEntryKey, pack:candidate.pack, packId:candidate.packId, sourceCertified, fieldParityCertified:false, trustedRuntimeWeaponGroups:0, blockers, comparisons };
  }
  const row=matches[0], p=source.printedFacts ?? {}, s=row.system ?? {};
  function matchNumber(code,field,expected,observed) {
    if (expected === undefined || expected === null) return;
    const ev=numberIfPresent(expected), ov=numberIfPresent(observed);
    comparisons.push({field,expected:ev,observed:ov,match:ev===ov});
    if (ev===null || ev!==ov) addBlock(blockers,code,field,ev,ov);
  }
  matchNumber('INT_MISMATCH','attributes.int.base',p.abilities?.int,s.attributes?.int?.base);
  matchNumber('DEX_MISMATCH','attributes.dex.base',p.abilities?.dex,s.attributes?.dex?.base);
  matchNumber('STR_MISMATCH','attributes.str.base',p.abilities?.str,s.attributes?.str?.base);
  matchNumber('HIT_POINTS_MISMATCH','hitPoints',p.durability?.hitPoints,s.hitPoints);
  matchNumber('SHIELD_RATING_MISMATCH','shieldRating',p.defenses?.shieldRating,s.shieldRating);
  const printedSize=String(p.type??'').split(/\s/)[0].toLowerCase();
  const candidateSize=String(s.size??'').split(/\s/)[0].toLowerCase();
  if (printedSize && printedSize!==candidateSize) addBlock(blockers,'SIZE_MISMATCH','size',printedSize,candidateSize);
  const crew=p.crew;
  if (Number.isFinite(crew?.count)) {
    const observed=String(s.crew??'').match(/^\s*(\d+)/)?.[1] ?? null;
    if (observed===null || Number(observed)!==crew.count) addBlock(blockers,'CREW_COUNT_MISMATCH','crew',crew.count,observed===null?null:Number(observed));
  } else if (Array.isArray(crew?.range)) {
    const range=String(s.crew??'').match(/^\s*(\d+)\s*-\s*(\d+)/);
    if (!range || Number(range[1])!==crew.range[0] || Number(range[2])!==crew.range[1]) addBlock(blockers,'CREW_RANGE_MISMATCH','crew',crew.range,s.crew);
  }
  const printedWeaponGroups=Array.isArray(source.mountAndFiringGroups)?source.mountAndFiringGroups.length:0;
  const installedRows=Array.isArray(s.weapons)?s.weapons:[];
  if (printedWeaponGroups!==installedRows.length) addBlock(blockers,'STOCK_WEAPON_GROUP_COUNT_MISMATCH','system.weapons.length',printedWeaponGroups,installedRows.length);
  // A full physical match is not established by a count or name. The
  // underlying weapon-group IDs, arcs and operator stations must be audited.
  if (printedWeaponGroups>0 && installedRows.length>0) addBlock(blockers,'ATTACK_GROUP_PHYSICAL_BINDING_NOT_CERTIFIED','weaponGroupIdentity','trusted source->item mapping','unreviewed');
  if (typeof s.sourcebook !== 'string' || !s.sourcebook.trim() || numberIfPresent(s.page) === null) {
    addBlock(blockers,'PACK_SOURCE_POINTER_MISSING','sourcebook/page',`Starships of the Galaxy p.${source.printedStatblockStartPage}`,{sourcebook:s.sourcebook??null,page:s.page??null});
  }
  // Only comparisons of selected risk fields have been performed here.
  // Never claim full pack-field parity or promote to operational certification.
  return { sourceEntryKey:candidate.sourceEntryKey, pack:candidate.pack, packId:candidate.packId, packName:candidate.packName, sourcePrintedPage:source.printedStatblockStartPage,
    sourceCertified, publishedAttackGroups:printedWeaponGroups, packWeaponGroups:installedRows.length, fieldParityCertified:false, trustedRuntimeWeaponGroups:0,
    status:'IDENTITY_CANDIDATE_ONLY_NO_RUNTIME_BINDING', comparisons, blockers };
}

export function gitBlobSha(data){const buf=Buffer.isBuffer(data)?data:Buffer.from(data);return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');}

export function auditRepository(root) {
  const files={};
  for (const [rel,sha] of Object.entries(PINNED_INPUTS)) {
    const bytes=readFileSync(resolve(root,rel));
    const observed=gitBlobSha(bytes);
    if (observed!==sha) throw new Error(`INPUT_GIT_BLOB_MISMATCH ${rel}: expected ${sha}, got ${observed}`);
    files[rel]=bytes.toString('utf8');
  }
  const ledger=JSON.parse(files['data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json']);
  const packs=Object.fromEntries(Object.entries(files).filter(([p])=>p.startsWith('packs/')).map(([p,raw])=>[p,raw.trim().split(/\r?\n/).filter(Boolean).map((line,index)=>{try{return JSON.parse(line)}catch(e){throw new Error(`INVALID_JSONL ${p}:${index+1}: ${e.message}`)}})]));
  const cert=ledger.entries.filter(x=>x.fullFieldCertified===true && x.fullWeaponMountReconciled===true);
  if (cert.length!==4) throw new Error(`PILOT_CERTIFIED_COUNT_CHANGED: ${cert.length}`);
  const keys=cert.map(x=>x.sourceEntryKey), roster=PILOT_CANDIDATES.map(x=>x.sourceEntryKey);
  if (new Set(keys).size!==4 || !keys.every(x=>roster.includes(x))) throw new Error('PILOT_CERTIFIED_KEYS_CHANGED');
  const entries=PILOT_CANDIDATES.map(c=>auditBindingCandidate({candidate:c,source:cert.find(x=>x.sourceEntryKey===c.sourceEntryKey),packRows:packs[c.pack]}));
  const blockers={};for(const e of entries)for(const b of e.blockers)blockers[b.code]=(blockers[b.code]||0)+1;
  if(entries.some(x=>x.trustedRuntimeWeaponGroups!==0))throw new Error('UNAUTHORIZED_BINDING_ISSUED');
  return {schema:'swse.vehicle.phase2c.cp7.stock-binding-parity.v1',status:'READ_ONLY_SOURCE_TO_PACK_GAP_REVIEW',sourceLedgerSha:PINNED_INPUTS['data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json'],
    correctedSourceClaimScope:318, strictCertifiedSourceClaims:4,packCandidates:entries.length,runtimeStockWeaponBindingsCreated:0,productionPackRecordsChanged:0,blockerCounts:blockers,entries};
}

const executing=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(executing){
  const args=process.argv.slice(2), root=args.includes('--repo-root')?args[args.indexOf('--repo-root')+1]:'.';
  const report=auditRepository(root);
  const output=args.includes('--output')?args[args.indexOf('--output')+1]:null;
  if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,candidates:report.packCandidates,blocked:report.entries.filter(x=>x.blockers.length>0).length,bindings:report.runtimeStockWeaponBindingsCreated,blockerCounts:report.blockerCounts},null,2));
}
