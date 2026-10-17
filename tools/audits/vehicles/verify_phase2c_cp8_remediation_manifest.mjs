/**
 * Phase 2C CP8A: read-only source/pack remediation proposal checker.
 * It deliberately does not alter packs, hydrate weapon rows, or authorize stock attacks.
 * This is a pre-mutation checker tied to the CP7 pinned baseline.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitBlobSha } from './audit_phase2c_cp7_stock_bindings.mjs';

const MANIFEST = 'data/audits/vehicles/swse-phase2c-cp8-stock-pack-remediation-manifest.json';
const serial = x => JSON.stringify(x);
const at = (obj, path) => path.split('.').reduce((o, part) => o?.[part], obj);
function observedField(obj, path) {
  let node = obj;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, part))
      return {state:'MISSING', value:null};
    node = node[part];
  }
  return node === null ? {state:'NULL', value:null} : {state:'PRESENT', value:node};
}
function put(obj, path, value) {
  const keys = path.split('.');
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!node[keys[i]] || typeof node[keys[i]] !== 'object') node[keys[i]] = {};
    node = node[keys[i]];
  }
  node[keys.at(-1)] = value;
}
const findCorrection = (entry, field) => entry.suggestedFieldCorrections.find(x => x.path === field);
const assertedValue = (entry, initial, projected, field, expected, errors) => {
  const proposed = at(projected, field);
  if (serial(proposed) !== serial(expected)) errors.push(entry.sourceEntryKey + ': PROJECTED_FIELD_WRONG ' + field);
  const change = findCorrection(entry, field);
  if (change && serial(change.observed) !== serial(at(initial, field)))
    errors.push(entry.sourceEntryKey + ': OBSERVED_FIELD_DRIFT ' + field);
};

/** Validate a snapshot proposal against exact live-source-ledger and pinned pack rows. */
export function validateRemediationManifest({manifest, sourceLedger, packs, blobShas = {}}) {
  const errors = [];
  if (manifest.schema !== 'swse.vehicle.phase2c.cp8.stock-pack-remediation-proposal.v1' ||
      manifest.status !== 'SOURCE_DERIVED_REMEDIATION_PROPOSAL_NOT_APPLIED')
    errors.push('MANIFEST_STATUS_INVALID');
  if (manifest.policy?.sourceAuthoritativePackEditsIssued !== false ||
      manifest.policy?.runtimeTrustedWeaponBindingsIssued !== 0 ||
      manifest.policy?.vehicleDroidModificationRefactorAuthorized !== false)
    errors.push('UNAUTHORIZED_CERTIFICATION_OR_MODIFICATION');
  if (manifest.inputBaseline?.commit !== 'ead923ffe2fcb8b5e563eda10bfd369962b0e8b5')
    errors.push('BASELINE_COMMIT_CHANGED');
  const pins = [
    [manifest.sourceAuthority?.ledgerPath, manifest.sourceAuthority?.ledgerGitBlobSha],
    ...manifest.inputBaseline.packs.map(x => [x.path, x.gitBlobSha])
  ];
  for (const [path, sha] of pins)
    if (!path || !/^[0-9a-f]{40}$/.test(sha ?? '') || blobShas[path] !== sha)
      errors.push('INPUT_GIT_BLOB_CHANGED ' + path);
  if (manifest.entries?.length !== 4 || sourceLedger.entries?.filter(x => x.fullFieldCertified && x.fullWeaponMountReconciled).length !== 4)
    errors.push('PILOT_SIZE_OR_SOURCE_CERTIFICATE_CHANGED');
  const ids = new Set(), sourceKeys = new Set();
  let proposals = 0, armed = 0, unarmed = 0;
  for (const entry of manifest.entries ?? []) {
    const src = sourceLedger.entries.find(x => x.sourceEntryKey === entry.sourceEntryKey);
    const rows = packs[entry.candidatePack?.path] ?? [];
    const matches = rows.filter(x => x._id === entry.candidatePack?.documentId);
    const id = entry.candidatePack?.path + ':' + entry.candidatePack?.documentId;
    if (ids.has(id) || sourceKeys.has(entry.sourceEntryKey)) errors.push('DUPLICATE_TARGET_OR_SOURCE ' + id);
    ids.add(id); sourceKeys.add(entry.sourceEntryKey);
    if (!src || !src.fullFieldCertified || !src.fullWeaponMountReconciled ||
        src.printedName !== entry.printedName || src.printedStatblockStartPage !== entry.printedPage)
      { errors.push('SOURCE_IDENTITY_OR_CERTIFICATE_MISMATCH ' + id); continue; }
    if (matches.length !== 1 || matches[0].name !== entry.candidatePack.documentName)
      { errors.push('PACK_DOCUMENT_IDENTITY_NOT_UNIQUE ' + id); continue; }
    const current = matches[0];
    if (entry.candidatePack.blobSha !== blobShas[entry.candidatePack.path])
      errors.push('PACK_ROW_PIN_MISMATCH ' + id);
    const changedPaths = new Set(), projected = structuredClone(current);
    for (const change of entry.suggestedFieldCorrections ?? []) {
      if (!change.path?.startsWith('system.') || changedPaths.has(change.path))
        errors.push('INVALID_OR_DUPLICATE_CORRECTION_PATH ' + id + ':' + change.path);
      changedPaths.add(change.path);
      const observed = observedField(current, change.path);
      const hasObservedValue = Object.prototype.hasOwnProperty.call(change, 'observed');
      const validObservedState = observed.state === change.observedState &&
        (observed.state === 'MISSING'
          ? !hasObservedValue
          : hasObservedValue && serial(change.observed) === serial(observed.value));
      if (!validObservedState)
        errors.push('STALE_OBSERVED_VALUE ' + id + ':' + change.path);
      if (observed.state !== 'MISSING' && serial(change.expected) === serial(observed.value))
        errors.push('NO_OP_CORRECTION ' + id + ':' + change.path);
      if (change.path === 'system.weapons' || change.path.startsWith('system.weapons.'))
        errors.push('UNREVIEWED_WEAPON_ROW_MUTATION ' + id);
      put(projected, change.path, change.expected);
      proposals++;
    }
    const p = src.printedFacts;
    assertedValue(entry, current, projected, 'system.sourcebook', 'Starships of the Galaxy', errors);
    assertedValue(entry, current, projected, 'system.page', src.printedStatblockStartPage, errors);
    for (const ability of ['str','dex','int']) {
      assertedValue(entry, current, projected, 'system.attributes.'+ability+'.base',p.abilities[ability], errors);
      assertedValue(entry, current, projected, 'system.attributes.'+ability+'.mod',Math.floor((p.abilities[ability]-10)/2),errors);
    }
    assertedValue(entry, current, projected, 'system.hitPoints',p.durability.hitPoints,errors);
    assertedValue(entry, current, projected, 'system.hp.max',p.durability.hitPoints,errors);
    assertedValue(entry, current, projected, 'system.hull.max',p.durability.hitPoints,errors);
    assertedValue(entry, current, projected, 'system.damageThreshold',p.durability.threshold,errors);
    assertedValue(entry, current, projected, 'system.reflexDefense',p.defenses.reflex,errors);
    assertedValue(entry, current, projected, 'system.fortitudeDefense',p.defenses.fortitude,errors);
    assertedValue(entry, current, projected, 'system.damageReduction',p.defenses.damageReduction,errors);
    const sr = p.defenses.shieldRating ?? (p.defenses.shieldStatus?.includes('unshielded') ? 0 : null);
    if (sr === null) errors.push('UNRESOLVED_SOURCE_SHIELD_FACT ' + id);
    else assertedValue(entry, current, projected, 'system.shieldRating',sr,errors);
    assertedValue(entry, current, projected, 'system.vehicleHasHyperdrive',true,errors);
    assertedValue(entry, current, projected, 'system.cost.new',p.economics.newCredits,errors);
    assertedValue(entry, current, projected, 'system.cost.used',p.economics.usedCredits,errors);
    assertedValue(entry, current, projected, 'system.vehicleCargoKg',1000*(p.cargo.number ?? p.cargo.maximumTons),errors);
    assertedValue(entry, current, projected, 'system.vehicleHasWeapons',src.mountAndFiringGroups.length > 0,errors);
    const groups = entry.deferredGroupHydration ?? [];
    if (src.mountAndFiringGroups.length !== groups.length) errors.push('SOURCE_WEAPON_GROUP_CARDINALITY_WRONG ' + id);
    if (groups.length) {
      armed++;
      if (current.system.weapons.length !== 0 || groups.some(x=>x.installedPackWeaponRowId!==null||x.installedOwnedItemId!==null||x.bindingStatus!=='NOT_ISSUED'))
        errors.push('PREMATURE_TRUSTED_WEAPON_BINDING ' + id);
      const group = groups[0], canonical=src.mountAndFiringGroups[0];
      if (group.sourcePrintedGroup.weaponLabel!==canonical.weaponLabel || group.sourcePrintedGroup.damage!==canonical.damage ||
          group.sourcePrintedGroup.hardwareCount!==1 || group.sourcePrintedGroup.station!=='gunner' ||
          !String(group.sourcePrintedGroup.firingArc).includes('fixed-forward'))
        errors.push('PUBLISHED_GHTROC_PHYSICAL_GROUP_MISMATCH ' + id);
    } else {
      unarmed++;
      if (!entry.publishedStockUnarmed || current.system.weapons.length!==0) errors.push('UNARMED_STOCK_WEAPON_MISMATCH ' + id);
    }
    if (entry.targetProfile?.printedType !== p.type || entry.targetProfile?.crew?.quality !== p.crew.quality)
      errors.push('PROPOSAL_SOURCE_FACT_DRIFT ' + id);
  }
  if (proposals !== manifest.summary?.remediationFieldChangesProposed || armed !== 1 || unarmed !== 3)
    errors.push('SUMMARY_COUNT_OR_ARMAMENT_MISMATCH');
  return { ok: errors.length === 0, status: 'PRE_MUTATION_PROPOSAL_ONLY',
    candidates: ids.size, proposedFieldCorrections: proposals,
    stockArmed: armed, stockUnarmed: unarmed, trustedRuntimeBindings: 0, errors };
}

/** The command operates on local repository files but does not write anything. */
export function inspectRepository(root = '.') {
  const read = path => readFileSync(resolve(root, path));
  const manifest = JSON.parse(read(MANIFEST).toString('utf8'));
  const inputPaths = [manifest.sourceAuthority.ledgerPath, ...manifest.inputBaseline.packs.map(x=>x.path)];
  const blobShas = Object.fromEntries(inputPaths.map(p => [p, gitBlobSha(read(p))]));
  const sourceLedger = JSON.parse(read(manifest.sourceAuthority.ledgerPath).toString('utf8'));
  const packs = Object.fromEntries(manifest.inputBaseline.packs.map(({path}) =>
    [path, read(path).toString('utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse)]));
  return validateRemediationManifest({manifest,sourceLedger,packs,blobShas});
}
const main=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if (main) {
  const args=process.argv.slice(2),root=args.includes('--repo-root')?args[args.indexOf('--repo-root')+1]:'.';
  const result=inspectRepository(root);
  console.log(JSON.stringify(result,null,2));
  if (!result.ok) process.exitCode=1;
}
