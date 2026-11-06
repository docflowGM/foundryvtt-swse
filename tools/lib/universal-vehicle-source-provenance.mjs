/**
 * Additive Phase 3 correction of ONE known Core source-provenance error.
 * The original 316-ship source, Phase 1 census, and staged records are historical;
 * their bytes must not be rewritten to disguise the original misidentification.
 * This resolver is mandatory for downstream Phase 4A canonical assembly.
 */
export function resolveUniversalVehicleProvenance(input, amendment, projection) {
  const allowed = new Set(['phase1-ledger','phase1-census','phase2-staged','historic-ship']);
  if (!allowed.has(projection)) throw new Error('Unknown vehicle provenance projection: '+projection);
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Vehicle provenance input must be an object');
  const key = input.identity?.sourceEntryKey ?? input.sourceEntryKey;
  if (key !== amendment?.sourceEntryKey) return input;
  if (amendment.schema !== 'swse.vehicle.universal.phase3.provenance-amendment.v1'
   || amendment.disposition !== 'APPROVED_SOURCE_FACT_CORRECTION'
   || amendment.sourceEntryKey !== 'core-vulture-class-droid-starfighter'
   || amendment.sourcePdfSha256 !== '509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9') {
    throw new Error('Unapproved vehicle provenance amendment');
  }
  const original=amendment.frozenHistoricalClaim;
  const fixed=amendment.correctedPublishedClaim;
  const book=input.publication?.book ?? input.sourceBook;
  if (book!==amendment.sourceBook) throw new Error('Vulture source book mismatch');
  const check=(actual,expected,field)=>{if(actual!==expected) throw new Error('Vulture frozen '+projection+' '+field+' anchor mismatch: '+String(actual))};
  const result=structuredClone(input);
  if (projection==='phase1-ledger' || projection==='phase1-census') {
    check(input.printedName,original.printedName,'printedName');
    check(input.printedStatblockStartPage,original.printedStatblockStartPage,'printedStatblockStartPage');
    check(input.pdfPhysicalPage,original.pdfPhysicalPage,'pdfPhysicalPage');
    const actualSha=projection==='phase1-ledger'?input.provenance?.sourcePdfSha256:input.sourcePdfSha256;
    check(actualSha,amendment.sourcePdfSha256,'sourcePdfSha256');
    result.printedName=fixed.printedName;
    result.printedStatblockStartPage=fixed.printedStatblockStartPage;
    result.pdfPhysicalPage=fixed.pdfPhysicalPage;
  } else if(projection==='phase2-staged') {
    check(input.identity?.name,original.printedName,'identity.name');
    check(input.publication?.page,original.printedStatblockStartPage,'publication.page');
    check(input.publication?.printedTitle,original.printedName,'publication.printedTitle');
    if(!input.publication?.entryNotes?.includes(amendment.sourcePdfSha256)) throw new Error('Vulture staged source SHA anchor missing');
    result.identity.name=fixed.printedName;
    result.publication.printedTitle=fixed.printedName;
    result.publication.page=fixed.printedStatblockStartPage;
    result.publication.entryNotes=(input.publication.entryNotes??'')+
      ' | Phase 3 accepted original PDF provenance amendment '+amendment.id+': printed p181 / physical PDF p182.';
    result.text ??= {};
    result.text.sourceNotes=(result.text.sourceNotes??'')+
      ' | Effective printed source: Core Rulebook p181, heading '+fixed.printedName+
      '; historical Phase 1 p180 remains audit-only.';
  } else if(projection==='historic-ship') {
    check(input.name,original.printedName,'name');
    check(input.printedPage,original.printedStatblockStartPage,'printedPage');
    check(input.sourceEvidence?.pdfPhysicalPage,original.pdfPhysicalPage,'sourceEvidence.pdfPhysicalPage');
    check(input.sourceEvidence?.pdfSha256,amendment.sourcePdfSha256,'sourceEvidence.pdfSha256');
    result.name=fixed.printedName;
    result.printedPage=fixed.printedStatblockStartPage;
    result.sourceEvidence.printedPages=[fixed.printedStatblockStartPage];
    result.sourceEvidence.sourcePdfStartPageIndex=fixed.printedStatblockStartPage;
    result.sourceEvidence.pdfPhysicalPage=fixed.pdfPhysicalPage;
  }
  return result;
}

export function resolveUniversalVehicleProvenanceEntries(records, amendment, projection) {
  if (!Array.isArray(records)) throw new Error('Expected list of source entries');
  const keys=records.map(x=>x.identity?.sourceEntryKey??x.sourceEntryKey);
  if(new Set(keys).size!==keys.length) throw new Error('Duplicate publication keys before provenance resolution');
  const matches=keys.filter(x=>x===amendment.sourceEntryKey).length;
  if(matches!==1) throw new Error('Expected one Core Vulture source key, found '+matches);
  const result=records.map(r=>resolveUniversalVehicleProvenance(r,amendment,projection));
  if(result.length!==records.length||new Set(result.map(x=>x.identity?.sourceEntryKey??x.sourceEntryKey)).size!==result.length)
   throw new Error('Identity drift during provenance resolution');
  return result;
}
