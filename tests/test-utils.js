/**
 * Test Utilities
 */

export class TestUtils {

  static createMockActor(type = 'character', data = {}) {
    // Merge provided abilities with defaults
    const defaultAbilities = {
      str: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
      dex: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
      con: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
      int: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
      wis: {base: 10, racial: 0, temp: 0, total: 10, mod: 0},
      cha: {base: 10, racial: 0, temp: 0, total: 10, mod: 0}
    };

    const abilities = data.abilities
      ? { ...defaultAbilities, ...data.abilities }
      : defaultAbilities;

    return {
      type: type,
      name: data.name || 'Test Actor',
      system: {
        level: data.level || 1,
        size: data.size || 'medium',
        abilities: abilities,
        hp: data.hp || {value: 20, max: 20, temp: 0},
        conditionTrack: data.conditionTrack || 'normal',
        defenses: {
          reflex: { total: 0, class: 0, ...data.defenses?.reflex },
          fortitude: { total: 0, class: 0, ...data.defenses?.fortitude },
          will: { total: 0, class: 0, ...data.defenses?.will }
        },
        isDroid: data.isDroid || false,
        ...data
      },
      items: [],
      conditionPenalty: data.conditionPenalty || 0
    };
  }

  static createMockItem(type, data = {}) {
    // Handle both old-style (data contains system) and new-style (data is the system object)
    const hasSystemProperty = data.system !== undefined;

    return {
      type: type,
      name: data.name || `Test ${type}`,
      system: hasSystemProperty ? data.system : data
    };
  }
}
