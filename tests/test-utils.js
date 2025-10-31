/**
 * Test Utilities
 */

export class TestUtils {
  
  static async createMockActor(type = 'character', data = {}) {
    return {
      type: type,
      name: 'Test Actor',
      system: {
        level: 1,
        abilities: {
          str: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
          dex: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
          con: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
          int: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
          wis: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
          cha: {base: 10, racial: 0, temp: 0, total: 10, mod: 0}
        },
        hp: {value: 20, max: 20, temp: 0},
        conditionTrack: 'normal',
        ...data
      },
      items: []
    };
  }
  
  static async createMockItem(type, data = {}) {
    return {
      type: type,
      name: `Test ${type}`,
      system: data
    };
  }
}
