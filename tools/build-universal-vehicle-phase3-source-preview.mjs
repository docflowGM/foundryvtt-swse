/**
 * Phase 3 accepted SOURCE preview, not a production native pack builder.
 * Outputs all 429 source-only records with approved immutable provenance amendments.
 * No runtime normalization, compendium output, Actor creation or weapon activation.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {resolveUniversalVehicleProvenanceEntries} from './lib/universal-vehicle-source-provenance.mjs';

export const UNIVERSAL_BOOK_STAGES=[
 'a-core-rulebook','b-starships-of-the-galaxy','c-clone-wars','d-kotor','e-force-unleashed','f-scum-and-villainy','g-galaxy-at-war',
 'h-galaxy-of-intrigue','i-jedi-academy-training-manual','j-legacy-era-campaign-guide','k-rebellion-era-campaign-guide',
 'l-threats-of-the-galaxy','m-unknown-regions','n-scavengers-guide-to-droids'
];

export function buildPhase3AcceptedSourcePreview(repoRoot=process.cwd()){
 const source=path.join(repoRoot,'data/audits/vehicles');
 const readJSON=filename=>JSON.parse(readFileSync(path.join(source,filename),'utf8'));
 const amendment=readJSON('swse-universal-phase3-vulture-provenance-amendment.json');
 const risk=readJSON('swse-universal-phase3-targeted-exceptions.json');
 const queue=readJSON('swse-universal-phase3-source-pdf-qa-queue.json');
 if(risk.globalGate?.phase3SourceAcceptance!=='ACCEPTED_FOR_PHASE4A_SOURCE_PREPARATION'
  ||risk.globalGate?.phase4ActorImportAuthorized!==false
  ||risk.globalGate?.phase4NativePackRegistrationAuthorized!==false
  ||risk.globalGate?.phase4CutoverAuthorized!==false
  ||risk.globalGate?.unresolvedCriticalProvenance?.length!==0)
  throw new Error('Phase 3 effective source acceptance or no-cutover guard missing');
 if(queue.pdfFieldQA?.total!==48||queue.pdfFieldQA?.verified!==48||queue.pdfFieldQA?.pending!==0)
  throw new Error('Focused PDF QA queue is not closed');
 const stages=UNIVERSAL_BOOK_STAGES.map(s=>readJSON('swse-universal-phase2'+s+'-staged.json'));
 if(stages.some(x=>x.productionPacksChanged!==false||x.generatedActorsChanged!==false))
  throw new Error('Pre-cutover source stage has production pack or Actor changes');
 const frozen=stages.flatMap(x=>x.records);
 const resolved=resolveUniversalVehicleProvenanceEntries(frozen,amendment,'phase2-staged');
 const originalCensus=readFileSync(path.join(source,'swse-universal-phase1-publication-census.ndjson'),'utf8')
  .trim().split('\n').map(JSON.parse);
 const effectiveCensus=resolveUniversalVehicleProvenanceEntries(originalCensus,amendment,'phase1-census');
 const keys=resolved.map(x=>x.identity.sourceEntryKey);
 const censusKeys=effectiveCensus.map(x=>x.sourceEntryKey);
 if(stages.length!==14||resolved.length!==429||new Set(keys).size!==429
  ||effectiveCensus.length!==429||new Set(censusKeys).size!==429
  ||keys.slice().sort().join('\n')!==censusKeys.slice().sort().join('\n'))
   throw new Error('Universal 429-record source/census identity reconciliation failed');
 const vulture=resolved.find(x=>x.identity.sourceEntryKey===amendment.sourceEntryKey);
 const vultureCensus=effectiveCensus.find(x=>x.sourceEntryKey===amendment.sourceEntryKey);
 if(vulture.publication.page!==181||vulture.identity.name!=='"Vulture" Droid Starfighter'
  ||vultureCensus.pdfPhysicalPage!==182||vultureCensus.printedStatblockStartPage!==181
  ||vultureCensus.printedName!==vulture.identity.name)
  throw new Error('Required approved Vulture provenance amendment not applied');
 for(const record of resolved){
  if(Object.hasOwn(record.armament??{},'weaponMounts'))throw new Error('Uncertified weapon mount in source projection '+record.identity.sourceEntryKey);
  if((record.armament?.firingGroups??[]).some(g=>!Array.isArray(g.mountKeys)||g.mountKeys.length!==0))
   throw new Error('Source weapon groups unexpectedly imply physical mount execution '+record.identity.sourceEntryKey);
 }
 return {records:resolved,effectiveCensus,summary:{
  acceptedFor:"Phase 4A source-only canonical assembly",
  sourceRecords:429,sourceBooks:14,pdfFieldQAVerified:48,
  namedTargetedRisks:10,approvedProvenanceAmendments:1,
  physicalMountCertificationsPromoted:0,productionNativePacksChanged:false,
  phase4ImportAuthorized:false,phase4CutoverAuthorized:false
 }};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const args=process.argv.slice(2);
 if(args.length!==1||!['--check','--emit-ndjson'].includes(args[0])){
  process.stderr.write('Usage: node tools/build-universal-vehicle-phase3-source-preview.mjs --check|--emit-ndjson\n');
  process.exitCode=2;
 }else{
  const result=buildPhase3AcceptedSourcePreview();
  if(args[0]==='--check')process.stdout.write(JSON.stringify(result.summary,null,2)+'\n');
  else process.stdout.write(result.records.map(x=>JSON.stringify(x)).join('\n')+'\n');
 }
}
