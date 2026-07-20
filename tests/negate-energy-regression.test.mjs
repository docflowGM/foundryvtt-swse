import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dialogSource = await readFile(
  new URL('../scripts/sheets/v2/character-sheet/force-roll-dialog.js', import.meta.url),
  'utf8'
);
const integrationSource = await readFile(
  new URL('../scripts/engine/force/force-power-final-integration.js', import.meta.url),
  'utf8'
);

// Negate Energy is not a fixed-DC power. The incoming Energy damage is the DC.
assert.match(dialogSource, /function isNegateEnergyPower/);
assert.match(dialogSource, /Incoming Energy Damage \(DC\)/);
assert.match(dialogSource, /baseDC:\s*negateEnergy\s*\?\s*incomingDamage/);
assert.match(dialogSource, /The DC is the incoming Energy damage/);
assert.doesNotMatch(dialogSource, /Negate Energy[^\n]{0,120}DC 15/i);

// Eligibility and the successful-use Force Point healing option must be explicit.
assert.match(dialogSource, /Aware of the attack and not Flat-Footed/);
assert.match(dialogSource, /name="negateEnergyHeal"/);
assert.match(dialogSource, /regain HP equal to the negated damage/i);

// Runtime resolution must be instantaneous and compare check total >= damage.
assert.match(integrationSource, /checkTotal\s*>=\s*incomingDamage/);
assert.match(integrationSource, /modifiedDamage:\s*negated\s*\?\s*0\s*:\s*incomingDamage/);
assert.match(integrationSource, /outcome:\s*'negate-energy'/);
assert.match(integrationSource, /removePowerEffects/);
assert.match(integrationSource, /force-power-negate-energy-healing/);
assert.match(integrationSource, /Math\.min\(incomingDamage, hp\.max - hp\.value\)/);

console.log('Negate Energy regression guards passed.');
