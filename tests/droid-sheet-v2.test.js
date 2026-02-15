/**
 * DroidSheetV2 UI Tests
 */

import { TestUtils } from './test-utils.js';
import { DroidSheetV2 } from '../scripts/sheets/v2/droid-sheet-v2.js';

describe('DroidSheetV2 UI', () => {

  test('should render droid sheet with systems tab', async () => {
    const droid = TestUtils.createMockActor('droid', { name: 'Test Droid' });
    droid.system.droidSystems = {
      degree: 'Third-Degree',
      size: 'medium',
      locomotion: { id: 'walking', name: 'Walking' },
      processor: { id: 'processor-1', name: 'Standard' },
      armor: { id: 'armor-1', name: 'Durasteel' },
      mods: [],
      appendages: [],
      sensors: [],
      weapons: [],
      accessories: [],
      credits: { total: 5000, spent: 0 }
    };

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    expect(data.actor.name).toBe('Test Droid');
    expect(data.droidSystems.degree).toBe('Third-Degree');
    expect(data.currentLocomtion.id).toBe('walking');
  });

  test('should calculate hardpoint usage', async () => {
    const droid = TestUtils.createMockActor('droid');
    droid.system.droidSystems = {
      degree: 'Third-Degree',
      size: 'medium',
      mods: [
        { id: 'mod1', name: 'Mod 1', hardpointsRequired: 1, enabled: true },
        { id: 'mod2', name: 'Mod 2', hardpointsRequired: 2, enabled: true },
        { id: 'mod3', name: 'Mod 3', hardpointsRequired: 1, enabled: false }
      ]
    };

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    expect(data.hardpoints.used).toBe(3); // 1 + 2 (mod3 disabled)
    expect(data.hardpoints.max).toBe(3);
    expect(data.hardpoints.remaining).toBe(0);
  });

  test('should calculate credit budget', async () => {
    const droid = TestUtils.createMockActor('droid');
    droid.system.droidSystems = {
      credits: { total: 5000, spent: 2000 }
    };

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    expect(data.credits.remaining).toBe(3000);
    expect(data.credits.percent).toBe(40);
  });

  test('should display modifications list', async () => {
    const droid = TestUtils.createMockActor('droid');
    droid.system.droidSystems = {
      mods: [
        { id: 'mod1', name: 'Advanced Sensors', hardpointsRequired: 1, costInCredits: 500, enabled: true },
        { id: 'mod2', name: 'Armor Plating', hardpointsRequired: 2, costInCredits: 1000, enabled: true },
        { id: 'mod3', name: 'Disabled Mod', hardpointsRequired: 1, costInCredits: 300, enabled: false }
      ]
    };

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    expect(data.modifications.length).toBe(3);
    expect(data.modifications[0].name).toBe('Advanced Sensors');
    expect(data.modifications[2].enabled).toBe(false);
  });

  test('should display appendages list', async () => {
    const droid = TestUtils.createMockActor('droid');
    droid.system.droidSystems = {
      appendages: [
        { id: 'app1', name: 'Left Manipulator' },
        { id: 'app2', name: 'Right Manipulator' },
        { id: 'app3', name: 'Head Unit' }
      ]
    };

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    expect(data.appendages.length).toBe(3);
    expect(data.appendages[0].name).toBe('Left Manipulator');
  });

  test('should display sensors, weapons, accessories', async () => {
    const droid = TestUtils.createMockActor('droid');
    droid.system.droidSystems = {
      sensors: [
        { id: 'sensor1', name: 'Visual Sensor' },
        { id: 'sensor2', name: 'Auditory Sensor' }
      ],
      weapons: [
        { id: 'w1', name: 'Blaster Rifle', quantity: 2 },
        { id: 'w2', name: 'Missile Launcher', quantity: 1 }
      ],
      accessories: [
        { id: 'acc1', name: 'Comlink' },
        { id: 'acc2', name: 'Datapad Interface' }
      ]
    };

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    expect(data.sensors.length).toBe(2);
    expect(data.weapons.length).toBe(2);
    expect(data.weapons[0].quantity).toBe(2);
    expect(data.accessories.length).toBe(2);
  });

  test('should show validation errors', async () => {
    const droid = TestUtils.createMockActor('droid');
    droid.system.droidSystems = {
      degree: '',
      size: '',
      mods: []
    };

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    expect(data.validation.errors.length).toBeGreaterThan(0);
  });

  test('should show modification validation warnings', async () => {
    const droid = TestUtils.createMockActor('droid');
    droid.system.droidSystems = {
      degree: 'Third-Degree',
      size: 'medium',
      credits: { total: 1000, spent: 2000, remaining: -1000 },
      mods: []
    };

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    // Should have warnings about budget
    expect(data.modValidation.warnings || data.modValidation.errors.length).toBeGreaterThan(0);
  });

  test('should provide degree and size options', async () => {
    const droid = TestUtils.createMockActor('droid');
    droid.system.droidSystems = {};

    const sheet = new DroidSheetV2(droid);
    const data = await sheet.getData();

    expect(data.degreeOptions.length).toBe(3);
    expect(data.sizeOptions.length).toBe(5);
    expect(data.degreeOptions.some(d => d.value === 'First-Degree')).toBe(true);
    expect(data.sizeOptions.some(s => s.value === 'large')).toBe(true);
  });

});
