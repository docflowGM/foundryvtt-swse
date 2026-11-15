import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTemptationActorSerializer } from
  '../scripts/engine/progression/utils/temptation-actor-serializer.js';

test('concurrent same-target FP/DP receipt work runs sequentially without losing a receipt',async()=>{
 const serialize=createTemptationActorSerializer();
 const seen=[],events=[];
 let release;
 const hold=new Promise(resolve=>{release=resolve});
 const first=serialize('Actor.target',async()=>{
   events.push('first:start');
   await hold;
   seen.push('FP-receipt-1');
   events.push('first:end');
 });
 const second=serialize('Actor.target',async()=>{
   events.push('second:start');
   seen.push('DP-receipt-2');
   events.push('second:end');
 });
 const other=serialize('Actor.different',async()=>{
   events.push('other:start');
   seen.push('independent-actor');
 });
 await other;
 assert.ok(events.includes('first:start'));
 assert.equal(events.includes('second:start'),false,'second same-target receipt waits for first');
 release();
 await Promise.all([first,second]);
 assert.deepEqual(events.filter(x=>x!=='other:start'),[
   'first:start','first:end','second:start','second:end'
 ]);
 assert.deepEqual(seen.filter(x=>x!=='independent-actor'),[
   'FP-receipt-1','DP-receipt-2'
 ]);
});

test('failed receipt does not poison queue or discard later committed receipt',async()=>{
 const serialize=createTemptationActorSerializer();
 const failed=serialize('Actor.target',async()=>{throw new Error('ActorEngine mutation failed');});
 const recovered=serialize('Actor.target',async()=> 'later-receipt-applied');
 await assert.rejects(failed,/ActorEngine mutation failed/);
 assert.equal(await recovered,'later-receipt-applied');
 assert.equal(await serialize('Actor.target',async()=>42),42);
});

test('invalid identity or work fails closed',async()=>{
 const serialize=createTemptationActorSerializer();
 await assert.rejects(serialize('',async()=>{}),/stable Actor identity/);
 await assert.rejects(serialize('Actor.target',null),/work must be a function/);
});

test('live Temptation consumer serializes receipt decisions and pending-state mutations',()=>{
 const src=readFileSync(
   new URL('../scripts/engine/combat/sith-lord-temptation-service.js',import.meta.url),
   'utf8'
 );
 assert.match(src,/const serializeActor = createTemptationActorSerializer\(\)/);
 assert.match(src,/return serializeActor\(key\(actor\),action\)/);
 assert.match(src,/static async consumeSpendReceipt\(event\)/);
 assert.match(src,/return locked\(target,async\(\)=>\{/);
 assert.match(src,/static async resolvePending\(target/);
 assert.doesNotMatch(src,/locks\.has\(id\)|Temptation action already running/);
});
