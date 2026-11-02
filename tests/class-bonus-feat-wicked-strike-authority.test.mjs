import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bindings = JSON.parse(fs.readFileSync(path.join(root,'data/generated/class-feat-list-bindings.json'),'utf8')).lists;
const feats = fs.readFileSync(path.join(root,'packs/feats.db'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const canonicalById = new Map(feats.map(f=>[f._id,f]));
const wickedStrike = '5bef5e65e532ba7c';

test('Scum & Villainy clarification p.21: Wicked Strike is a Jedi and Noble class bonus feat', () => {
  assert.equal(canonicalById.get(wickedStrike)?.name, 'Wicked Strike');
  for(const key of ['jedi_feats','noble_feats']){
    assert.ok(bindings[key].featNames.includes('Wicked Strike'),key);
    assert.equal(bindings[key].featIds.filter(id=>id===wickedStrike).length,1,key);
  }
  for(const key of ['scoundrel_feats','scout_feats','soldier_feats']){
    assert.ok(!bindings[key].featIds.includes(wickedStrike),key);
  }
});

test('all five class bonus-feat pools contain unique existing canonical feat IDs', () => {
  assert.equal(canonicalById.size,feats.length);
  assert.equal(feats.length,353);
  const keys=['jedi_feats','noble_feats','scoundrel_feats','scout_feats','soldier_feats'];
  assert.deepEqual(Object.keys(bindings).sort(),keys.sort());
  for(const key of keys){
    const ids=bindings[key].featIds;
    assert.equal(new Set(ids).size,ids.length,`duplicate bonus feat in ${key}`);
    for(const id of ids) assert.ok(canonicalById.has(id),`${key}: missing canonical feat ID ${id}`);
  }
});
