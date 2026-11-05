import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withEnforcerResourcesActorLock} from '../scripts/engine/progression/utils/enforcer-resources-transaction-guard.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const deferred=()=>{
  let resolve;
  const promise=new Promise(done=>{resolve=done;});
  return {promise,resolve};
};

test('two overlapping Enforcer decisions on the same actor cannot both reach the ledger',async()=>{
  const entered=deferred(),release=deferred();
  const actor={id:'enforcer-1',uuid:'Actor.enforcer-1'};
  const first=withEnforcerResourcesActorLock(actor,async()=>{
    entered.resolve();
    await release.promise;
    return 'delivered';
  });
  await entered.promise;
  await assert.rejects(
    withEnforcerResourcesActorLock({id:'enforcer-1',uuid:'Actor.enforcer-1'},async()=> 'deferred'),
    /already in progress/,
  );
  release.resolve();
  assert.equal(await first,'delivered');
  assert.equal(await withEnforcerResourcesActorLock(actor,async()=> 'new decision'),'new decision');
});

test('a failure releases the Enforcer lock; independent recipients can run concurrently',async()=>{
  const actorA={id:'enforcer-A'};
  const actorB={id:'enforcer-B'};
  await assert.rejects(
    withEnforcerResourcesActorLock(actorA,async()=>{throw new Error('ActorEngine refused');}),
    /ActorEngine refused/,
  );
  const a=deferred(),b=deferred();
  const first=withEnforcerResourcesActorLock(actorA,async()=>{await a.promise;return 'A';});
  const second=withEnforcerResourcesActorLock(actorB,async()=>{await b.promise;return 'B';});
  a.resolve();b.resolve();
  assert.deepEqual(await Promise.all([first,second]),['A','B']);
  await assert.rejects(withEnforcerResourcesActorLock(null,async()=>0),/valid recipient/);
});

test('Enforcer delivery and deferral use the same lock with ledger read inside it',()=>{
  const code=fs.readFileSync(path.join(ROOT,'scripts/engine/progression/utils/enforcer-equipment-delivery.js'),'utf8');
  assert.match(code,/static async defer[\s\S]*?return withEnforcerResourcesActorLock\(actor,async\(\)=>\{[\s\S]*?pendingEnforcerResources\(actor\)/);
  assert.match(code,/static async deliver[\s\S]*?return withEnforcerResourcesActorLock\(actor,async\(\)=>\{[\s\S]*?pendingEnforcerResources\(actor\)/);
  assert.match(code,/transactional:true/);
});
