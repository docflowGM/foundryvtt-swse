import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  auditPostHydration, auditRepo, PILOT_TARGETS, PINNED_POST_WRITE_BLOBS, hashGitBlob
} from '../tools/audits/vehicles/verify_phase2c_cp8_post_hydration.mjs';

const root = new URL('../', import.meta.url);
const ledger = JSON.parse(readFileSync(new URL('../data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json', import.meta.url)));
const packs = Object.fromEntries(Object.keys(PINNED_POST_WRITE_BLOBS).filter(p=>p.endsWith('.db')).map(p=>
  [p, readFileSync(new URL('../'+p, import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse)]));
const check = (source=ledger, records=packs)=>auditPostHydration({ledger:source,packs:records});
const altered=()=>structuredClone(packs);
function row(packs,id){
  const target=PILOT_TARGETS.find(t=>t.id===id);
  return packs[target.pack].find(x=>x._id===id);
}
const error = (result,code)=>assert.ok(result.errors.some(x=>x.code===code),JSON.stringify(result.errors));

test('CP8C real four-record source parity passes and trusted attack count remains zero',()=>{
  const r=auditRepo(root.pathname);
  assert.equal(r.ok,true,JSON.stringify(r.errors));
  assert.equal(r.entries.length,4);
  assert.equal(r.operationalCertification,false);
  assert.equal(r.trustedRuntimeStockAttackGroups,0);
});
test('post-hydration input blob SHAs are immutable pinned Git object IDs',()=>{
  for(const sha of Object.values(PINNED_POST_WRITE_BLOBS))assert.match(sha,/^[a-f0-9]{40}$/);
  assert.equal(hashGitBlob('test\n'),'9daeafb9864cf43055ae93beb0afd6c7d144bfa4');
});
test('four certified source records match the exact existing pack identities',()=>{
  assert.equal(new Set(PILOT_TARGETS.map(t=>t.id)).size,4);
  assert.equal(ledger.entries.filter(x=>x.fullFieldCertified&&x.fullWeaponMountReconciled).length,4);
  assert.equal(check().ok,true);
});
test('Ghtroc stock weapon is one fixed-forward double-laser installed system, not two',()=>{
  const ship=row(packs,'4d5b3422047f5eb8'),w=ship.system.weapons[0];
  assert.equal(ship.system.weapons.length,1);
  assert.equal(w.id,'4d5b3422047f5eb8-weapon-1');
  assert.equal(w.hardwareCount,1);
  assert.equal(w.mountCount,1);
  assert.equal(w.operatorStation,'gunner');
  assert.equal(w.firingArc,'fixed-forward');
  assert.equal(w.damage,'4d10x2');
  assert.equal(w.printedAttackTotal,'+1');
  assert.equal(w.autofirePrintedTotal,'-4');
});
test('published flat total is not an additive gunner attack bonus',()=>{
  const w=row(packs,'4d5b3422047f5eb8').system.weapons[0];
  assert.equal(Object.hasOwn(w,'attackBonus'),false);
  assert.equal(Object.hasOwn(w,'bonus'),false);
  assert.equal(check().ok,true);
});
test('missing single gun, tampered arc or operator station blocks',()=>{
  const p=altered(),s=row(p,'4d5b3422047f5eb8');
  s.system.weapons=[];
  error(check(ledger,p),'WEAPON_GROUP_COUNT');
  const q=altered(),w=row(q,'4d5b3422047f5eb8').system.weapons[0];
  w.firingArc='turret';
  error(check(ledger,q),'FIXED_FORWARD_ARC');
  const g=altered(),t=row(g,'4d5b3422047f5eb8').system.weapons[0];
  t.operatorStation='pilot';
  error(check(ledger,g),'WEAPON_STATION');
});
test('injecting extra attack enhancement into printed weapon row blocks',()=>{
  const p=altered(),w=row(p,'4d5b3422047f5eb8').system.weapons[0];
  w.attackBonus='+1';
  error(check(ledger,p),'INVALID_PRINTED_TOTAL_ADDED_TO_WEAPON');
});
test('turning published unarmed Action VI into armed stock blocks',()=>{
  const p=altered(),ship=row(p,'97c5c070d93b7a0a');
  ship.system.weapons.push({name:'Aftermarket Cannon'});
  error(check(ledger,p),'WEAPON_GROUP_COUNT');
});
test('tampered CR70 published INT or crew complement fails closed',()=>{
  const p=altered(),s=row(p,'18cd29422b66693d');
  s.system.attributes.int.base=10;
  error(check(ledger,p),'ABILITY_int');
  const p2=altered(),s2=row(p2,'18cd29422b66693d');
  s2.system.crew='18 (normal)';
  error(check(ledger,p2),'CREW_RANGE_OR_COUNT');
});
test('source provenance must be present, exact and unforgeable from a caller flag',()=>{
  const p=altered(),s=row(p,'4d5b3422047f5eb8');
  s.system.stockSourceEntryKey='not-the-certification-ledger';
  error(check(ledger,p),'SOURCE_KEY');
});
test('source certification cannot be replaced with pack field similarities',()=>{
  const l=structuredClone(ledger);
  l.entries.find(x=>x.sourceEntryKey.includes('ghtroc-industries')).fullFieldCertified=false;
  error(check(l,packs),'CERTIFICATE_COUNT_CHANGED');
});
