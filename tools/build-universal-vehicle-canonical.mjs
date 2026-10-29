/**
 * Phase 4A canonical SOURCE builder. Deliberately creates no Actors or packs.
 * Source authority is the Phase 3 accepted preview and its fail-closed
 * SHA-anchored Core Vulture provenance resolver; frozen evidence is untouched.
 *
 * Run: node tools/build-universal-vehicle-canonical.mjs --write|--check|--emit-ndjson
 */
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPhase3AcceptedSourcePreview, UNIVERSAL_BOOK_STAGES} from './build-universal-vehicle-phase3-source-preview.mjs';

export const UNIVERSAL_CANONICAL_PATH = 'data/canonical/vehicles/vehicles.json';
export const UNIVERSAL_CANONICAL_MANIFEST_PATH = 'data/canonical/vehicles/vehicles.manifest.json';
const compareKey = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const fail = message => { throw new Error('Phase 4A source gate: ' + message); };

export function assembleUniversalVehicleCanonical(repoRoot=process.cwd()) {
  const {records:accepted,effectiveCensus,summary}=buildPhase3AcceptedSourcePreview(repoRoot);
  const amendment=JSON.parse(readFileSync(path.join(repoRoot,'data/audits/vehicles/swse-universal-phase3-vulture-provenance-amendment.json'),'utf8'));
  const risks=JSON.parse(readFileSync(path.join(repoRoot,'data/audits/vehicles/swse-universal-phase3-targeted-exceptions.json'),'utf8'));
  const qa=JSON.parse(readFileSync(path.join(repoRoot,'data/audits/vehicles/swse-universal-phase3-source-pdf-qa-queue.json'),'utf8'));
  if (UNIVERSAL_BOOK_STAGES.length!==14 || accepted.length!==429 || effectiveCensus.length!==429
    || summary.sourceRecords!==429 || summary.sourceBooks!==14
    || risks.cases?.length!==10 || qa.pdfFieldQA?.total!==48 || qa.pdfFieldQA?.verified!==48
    || qa.pdfFieldQA?.pending!==0 || amendment.disposition!=='APPROVED_SOURCE_FACT_CORRECTION'
    || risks.globalGate?.phase4CanonicalSsotAuthorized!==true
    || risks.globalGate?.phase4ActorImportAuthorized!==false
    || risks.globalGate?.phase4NativePackRegistrationAuthorized!==false
    || risks.globalGate?.phase4CutoverAuthorized!==false) fail('source-only acceptance or guard changed');
  const records=accepted.slice().sort((a,b)=>compareKey(a.identity?.sourceEntryKey,b.identity?.sourceEntryKey));
  const keys=records.map(r=>r.identity?.sourceEntryKey);
  if (new Set(keys).size!==429 || keys.some(k=>typeof k!=='string'||!k)) fail('duplicate or empty source keys');
  const census=new Map(effectiveCensus.map(r=>[r.sourceEntryKey,r]));
  if(census.size!==429)fail('effective census keys not unique');
  const categories={};
  const books=new Set();
  for(const r of records) {
    const k=r.identity.sourceEntryKey,c=census.get(k);
    if(r.schemaVersion!=='swse.vehicle.phase0b.draft-0.5' || r.recordType!=='vehicle-source-entry'
      || !c || r.identity.name!==c.printedName || r.publication?.book!==c.sourceBook
      || r.publication?.page!==c.printedStatblockStartPage || !r.publication?.printedTypeLine
      || !r.classification?.primaryCategory) fail('source schema or effective census mismatch: '+k);
    if(Object.hasOwn(r.armament??{},'weaponMounts') || (r.armament?.firingGroups??[]).some(g=>!Array.isArray(g.mountKeys)||g.mountKeys.length!==0))
      fail('uncertified installed weapons: '+k);
    categories[r.classification.primaryCategory]=(categories[r.classification.primaryCategory]??0)+1;
    books.add(r.publication.book);
  }
  if(books.size!==14 || Object.values(categories).reduce((a,b)=>a+b,0)!==429)
    fail('book/category reconciliation failed');
  for(const q of qa.records) {
    if(q.status!=='pdf-field-verified'||!census.has(q.sourceEntryKey))fail('PDF QA not closed: '+q.sourceEntryKey);
  }
  const vulture=records.find(r=>r.identity.sourceEntryKey===amendment.sourceEntryKey);
  if(!vulture || vulture.identity.name!=='"Vulture" Droid Starfighter'
     || vulture.publication.page!==181 || !vulture.publication.entryNotes?.includes(amendment.id)
     || census.get(amendment.sourceEntryKey)?.pdfPhysicalPage!==182)
    fail('approved Core Vulture correction missing');
  if(records.filter(r=>r.identity.sourceEntryKey.includes('vulture')).length!==2
    || !records.some(r=>r.identity.sourceEntryKey==='sav-tenloss-corporation-hornet-class-interceptor')
    || !records.some(r=>r.identity.sourceEntryKey==='cw-tx-130t-saber-class-fighter-tank')
    || !records.some(r=>r.identity.sourceEntryKey==='fucg-tx-130t-fighter-tank'))
    fail('supplemental or separate publication identity missing');
  const ndjson=records.map(r=>JSON.stringify(r)).join('\n')+'\n';
  const bytes=Buffer.byteLength(ndjson,'utf8');
  const sourceFileGitBlobSha1=createHash('sha1').update('blob '+bytes+'\0').update(ndjson,'utf8').digest('hex');
  const manifest={
    schema:'swse.vehicle.universal.phase4a.source-manifest.v1',
    sourceFile:UNIVERSAL_CANONICAL_PATH,
    sourceFormat:'ndjson',
    generationMethod:'tools/build-universal-vehicle-canonical.mjs --write (Phase 3 effective accepted preview)',
    sourcePreview:'tools/build-universal-vehicle-phase3-source-preview.mjs',
    provenanceResolver:'tools/lib/universal-vehicle-source-provenance.mjs',
    provenanceAmendmentIds:[amendment.id],
    sourceBooks:books.size,
    publicationClaims:records.length,
    pdfFieldQAVerified:qa.pdfFieldQA.verified,
    targetedExceptionsReviewed:risks.cases.length,
    categoryCounts:Object.fromEntries(Object.entries(categories).sort(([a],[b])=>compareKey(a,b))),
    sourceFileGitBlobSha1,
    sourceBytes:bytes,
    certification:'SOURCE_ONLY',
    installedMountsPromoted:0,
    sourceAttackGroupsExecutable:false,
    nativePacksRegistered:false,
    actorsImported:false,
    productionCutoverAuthorized:false
  };
  return {records,ndjson,manifest};
}

export function verifyUniversalVehicleCanonical(repoRoot=process.cwd()) {
  const {ndjson,manifest}=assembleUniversalVehicleCanonical(repoRoot);
  const existing=readFileSync(path.join(repoRoot,UNIVERSAL_CANONICAL_PATH),'utf8');
  const existingManifest=readFileSync(path.join(repoRoot,UNIVERSAL_CANONICAL_MANIFEST_PATH),'utf8');
  if(existing!==ndjson)fail('canonical file drift; run --write and review the diff');
  if(existingManifest!==JSON.stringify(manifest,null,2)+'\n')fail('manifest drift; run --write and review the diff');
  return manifest;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  try{
    const cmd=process.argv.slice(2);
    if(cmd.length!==1 || !['--write','--check','--emit-ndjson'].includes(cmd[0]))
      fail('usage: node tools/build-universal-vehicle-canonical.mjs --write|--check|--emit-ndjson');
    if(cmd[0]==='--check') process.stdout.write(JSON.stringify(verifyUniversalVehicleCanonical(),null,2)+'\n');
    else {
      const {ndjson,manifest}=assembleUniversalVehicleCanonical();
      if(cmd[0]==='--emit-ndjson') process.stdout.write(ndjson);
      else {
        writeFileSync(UNIVERSAL_CANONICAL_PATH,ndjson);
        writeFileSync(UNIVERSAL_CANONICAL_MANIFEST_PATH,JSON.stringify(manifest,null,2)+'\n');
        process.stdout.write('Wrote '+manifest.publicationClaims+' canonical source entries. Git blob SHA-1 '+manifest.sourceFileGitBlobSha1+'\n');
      }
    }
  }catch(error){process.stderr.write(String(error?.stack??error)+'\n');process.exitCode=1;}
}
