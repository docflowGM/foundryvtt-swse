/**
 * CP9A read-only deployment precondition audit. The historical source-data
 * *.db files do not prove a v13 LevelDB compendium is installed or shipped.
 * Never count a source-certified record as operational unless the runtime
 * Foundry pack and its document can be independently read.
 */
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function auditVehiclePackDelivery(root='.') {
  const manifest=JSON.parse(readFileSync(resolve(root,'system.json'),'utf8'));
  const packaging=readFileSync(resolve(root,'scripts/build/package-system.js'),'utf8');
  const ids=['vehicles-space-transports','vehicles-capital-ships'];
  const findings=[];
  for(const name of ids){
    const pack=manifest.packs.find(x=>x.name===name);
    const expected=`packs/${name}`;
    const legacy=`${expected}.db`;
    const deployedDir=resolve(root,expected);
    const unpacked=existsSync(deployedDir)&&statSync(deployedDir).isDirectory();
    const source=existsSync(resolve(root,legacy));
    findings.push({
      name,manifestPath:pack?.path??null,packKind:pack?.type??null,
      legacyDbSourceExists:source,
      v13LevelDbDirectoryExists:unpacked,
      manifestPathCorrect:pack?.path===expected&&pack?.type==='Actor',
      liveFoundryPackDocumentVerified:false,
      condition:unpacked?'DIRECTORY_PRESENT_NOT_RUNTIME_VERIFIED':'DECLARED_LEVELDB_PATH_MISSING'
    });
  }
  const packZipEntry=/['"]packs\/['"]/.test(packaging);
  const deploymentReady=findings.every(x=>x.v13LevelDbDirectoryExists&&x.liveFoundryPackDocumentVerified)&&packZipEntry;
  return {schema:'swse.vehicle.phase2c.cp9a.pack-delivery-audit.v1',
    releaseBuildIncludesPacks:packZipEntry,manifestShips:findings,
    deploymentReady,stockAttackRuntimeCertificationAllowed:deploymentReady,
    reasons: [
      ...(!packZipEntry?['ZIP_PACKAGE_LIST_DOES_NOT_INCLUDE_PACKS']:[]),
      ...findings.filter(x=>!x.v13LevelDbDirectoryExists).map(x=>x.name+':NO_LEVELDB_DIRECTORY'),
      'NO_VERIFIED_FOUNDRY_V13_RUNTIME_PACK_DOCUMENT_READBACK'
    ]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=process.argv.includes('--repo-root')?process.argv[process.argv.indexOf('--repo-root')+1]:'.';
 console.log(JSON.stringify(auditVehiclePackDelivery(root),null,2));
}
