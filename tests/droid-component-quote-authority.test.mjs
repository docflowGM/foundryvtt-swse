import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDroidSizeFactors, getDroidPriceFactor, getDroidAccessoryWeightFactor,
  resolveDroidComponentQuote
} from '../scripts/domain/droids/droid-component-quote-authority.js';

const expected = {
  fine: [20, .1], diminutive: [10, .2], tiny: [5, .4],
  small: [2, 1], medium: [1, 1], large: [2, 2],
  huge: [5, 5], gargantuan: [10, 10], colossal: [20, 20]
};

test('all nine official errata factors; no unrecognized-size medium fallback', () => {
  for (const [size, [price, accessoryWeight]] of Object.entries(expected)) {
    assert.equal(getDroidPriceFactor(size), price, size);
    assert.equal(getDroidAccessoryWeightFactor(size), accessoryWeight, size);
    assert.deepEqual(getDroidSizeFactors(size.toUpperCase()), { price, accessoryWeight });
  }
  assert.equal(getDroidSizeFactors('unknown'), null);
  assert.equal(getDroidPriceFactor('unknown'), null);
  assert.equal(getDroidAccessoryWeightFactor(undefined), null);
});

function sourcePart(cost, weight, sourcePath = 'accessories.armor') {
  return { definition: { id: 'source-part', cost, weight }, sourcePath, category: 'armor' };
}

test('errata accessory weight uses different factor than credit price', () => {
  for (const [size, credits, kg] of [
    ['small', 800, 2], ['tiny', 2000, .8], ['fine', 8000, .2],
    ['medium', 400, 2], ['huge', 2000, 10]
  ]) {
    const quote = resolveDroidComponentQuote({
      ...sourcePart(factor => 400 * factor, factor => 2 * factor), size
    });
    assert.equal(quote.status, 'OK');
    assert.equal(quote.credits, credits);
    assert.ok(Math.abs(quote.kg - kg) < 1e-9);
  }
});

test('fixed printed component mass is not size multiplied', () => {
  const quote = resolveDroidComponentQuote({ ...sourcePart(250, 12), size: 'small' });
  assert.equal(quote.status, 'OK');
  assert.equal(quote.credits, 250);
  assert.equal(quote.kg, 12);
});

test('locomotion keeps normal mass factor and requires chosen speed', () => {
  const part = {
    definition: { costFormula: (speed, factor) => 20 * factor * speed ** 2,
      weightFormula: factor => 10 * factor },
    sourcePath: 'locomotion', category: 'locomotion', size: 'small'
  };
  assert.equal(resolveDroidComponentQuote(part).status, 'BLOCKED');
  assert.deepEqual(resolveDroidComponentQuote({ ...part, speed: 6 }), {
    status: 'OK', credits: 1440, kg: 20, blockingReason: null
  });
});

test('missing price, weight and construction offset never become free purchases', () => {
  for (const entry of [
    sourcePart(undefined, 1),
    sourcePart(500, undefined),
    sourcePart('5000+', 10),
    sourcePart(-500, 1),
    sourcePart(300, 'unlisted')
  ]) assert.equal(resolveDroidComponentQuote({ ...entry, size: 'medium' }).status, 'BLOCKED');
  assert.deepEqual(
    resolveDroidComponentQuote({ ...sourcePart(0, 0), size: 'medium' }),
    { status: 'OK', credits: 0, kg: 0, blockingReason: null }
  );
});

test('listed variants must be explicitly selected', () => {
  const part = {
    definition: { id: 'remote-processor', rangeOptions: [
      { range: '5 km', cost: 1000, weight: 10 },
      { range: '50 km', cost: 10000, weight: 100 }
    ] },
    sourcePath: 'processors', category: 'processor', size: 'medium'
  };
  assert.equal(resolveDroidComponentQuote(part).status, 'BLOCKED');
  assert.equal(resolveDroidComponentQuote({ ...part, variant: 'unknown' }).status, 'BLOCKED');
  assert.deepEqual(resolveDroidComponentQuote({ ...part, variant: '50 km' }), {
    status: 'OK', credits: 10000, kg: 100, blockingReason: null
  });
});

test('appendage enhancements need selected base values', () => {
  const part = {
    definition: { cost: cost => cost * 2, weight: weight => weight },
    sourcePath: 'appendageEnhancements', category: 'appendage', size: 'small'
  };
  assert.equal(resolveDroidComponentQuote(part).status, 'BLOCKED');
  const quote = resolveDroidComponentQuote({
    ...part, appendageBaseCost: 100, appendageBaseWeight: 3
  });
  assert.deepEqual(quote, { status: 'OK', credits: 200, kg: 3, blockingReason: null });
});

test('source unknown component definition fails closed', () => {
  assert.equal(resolveDroidComponentQuote({ size: 'medium' }).status, 'BLOCKED');
  assert.equal(resolveDroidComponentQuote({ ...sourcePart(50, 1), size: 'not-a-size' }).status, 'BLOCKED');
});

test('incomplete multi-variant source fields cannot silently sell the cheapest tier', () => {
  const hiddenCore = resolveDroidComponentQuote({
    definition: { id: 'hidden-core', cost: 200, costWithHigherDefense: 400, weight: 1 },
    size: 'medium', category: 'processor', sourcePath: 'processorEnhancements'
  });
  assert.equal(hiddenCore.status, 'BLOCKED');
  const personalityDownloader = resolveDroidComponentQuote({
    definition: { id: 'personality-downloader', cost: 5000, costIncrement: 1000,
      weight: 2, weightIncrement: 1 },
    size: 'medium', category: 'processor', sourcePath: 'processorEnhancements'
  });
  assert.equal(personalityDownloader.status, 'BLOCKED');
});

test('minimum printed chassis size is enforced during quotation', () => {
  const shield = {
    definition: { id: 'sr10-shield-generator', sizeMinimum: 'small',
      cost: factor => 5000 * factor, weight: factor => 20 * factor },
    category: 'shield', sourcePath: 'accessories.shields'
  };
  assert.equal(resolveDroidComponentQuote({ ...shield, size: 'tiny' }).status, 'BLOCKED');
  assert.deepEqual(resolveDroidComponentQuote({ ...shield, size: 'small' }), {
    status: 'OK', credits: 10000, kg: 20, blockingReason: null
  });
});
