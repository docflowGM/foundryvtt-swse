/**
 * ACTIVE Contract Validator - Unit Tests
 *
 * Validates that ActiveContractValidator correctly enforces schema
 * for both EFFECT and MODE subtypes.
 */

import { ActiveContractValidator } from '../active-contract.js';
import { ACTIVE_SUBTYPES } from '../active-types.js';

describe('ActiveContractValidator', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // Basic Structure Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validates execution model', () => {
    it('rejects non-ACTIVE abilities', () => {
      const ability = {
        name: 'Test',
        system: {
          executionModel: 'PASSIVE',
          abilityMeta: {}
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/executionModel must be "ACTIVE"/);
    });

    it('accepts ACTIVE model', () => {
      const ability = {
        name: 'Test',
        system: {
          executionModel: 'ACTIVE',
          subType: ACTIVE_SUBTYPES.EFFECT,
          abilityMeta: {
            activation: { actionType: 'standard' },
            effect: { type: 'damageRoll' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).not.toThrow();
    });
  });

  describe('validates subType', () => {
    it('rejects unknown subTypes', () => {
      const ability = {
        name: 'Test',
        system: {
          executionModel: 'ACTIVE',
          subType: 'INVALID_SUBTYPE',
          abilityMeta: {}
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/subType must be one of/);
    });

    it('accepts EFFECT subtype', () => {
      const ability = {
        name: 'Test Effect',
        system: {
          executionModel: 'ACTIVE',
          subType: ACTIVE_SUBTYPES.EFFECT,
          abilityMeta: {
            activation: { actionType: 'standard' },
            effect: { type: 'damageRoll' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).not.toThrow();
    });

    it('accepts MODE subtype', () => {
      const ability = {
        name: 'Test Mode',
        system: {
          executionModel: 'ACTIVE',
          subType: ACTIVE_SUBTYPES.MODE,
          abilityMeta: {
            activation: { actionType: 'swift' },
            modeEffect: { modifier: 'melee_defense' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECT Subtype Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('EFFECT subtype validation', () => {
    const baseEffect = {
      name: 'Test Effect',
      system: {
        executionModel: 'ACTIVE',
        subType: ACTIVE_SUBTYPES.EFFECT,
        abilityMeta: {
          activation: { actionType: 'standard' },
          effect: { type: 'damageRoll' }
        }
      }
    };

    it('requires activation field', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            effect: { type: 'damageRoll' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/activation is required/);
    });

    it('requires activation.actionType', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            activation: {},
            effect: { type: 'damageRoll' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/actionType is required/);
    });

    it('validates actionType values', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            activation: { actionType: 'invalid_action' },
            effect: { type: 'damageRoll' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/actionType must be one of/);
    });

    it('requires effect field', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            activation: { actionType: 'standard' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/effect is required/);
    });

    it('validates effect.type', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            activation: { actionType: 'standard' },
            effect: { type: 'invalid_effect_type' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/effect type must be one of/);
    });
  });

  describe('EFFECT cost validation', () => {
    const baseEffect = {
      name: 'Costly Effect',
      system: {
        executionModel: 'ACTIVE',
        subType: ACTIVE_SUBTYPES.EFFECT,
        abilityMeta: {
          activation: { actionType: 'standard' },
          effect: { type: 'damageRoll' }
        }
      }
    };

    it('accepts no cost', () => {
      expect(() => {
        ActiveContractValidator.assert(baseEffect);
      }).not.toThrow();
    });

    it('validates Force Point cost', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            ...baseEffect.system.abilityMeta,
            cost: { forcePoints: 'invalid' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/forcePoints must be a non-negative integer/);
    });

    it('accepts valid Force Point cost', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            ...baseEffect.system.abilityMeta,
            cost: { forcePoints: 1 }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).not.toThrow();
    });
  });

  describe('EFFECT frequency validation', () => {
    const baseEffect = {
      name: 'Frequent Effect',
      system: {
        executionModel: 'ACTIVE',
        subType: ACTIVE_SUBTYPES.EFFECT,
        abilityMeta: {
          activation: { actionType: 'standard' },
          effect: { type: 'damageRoll' }
        }
      }
    };

    it('accepts unlimited frequency', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            ...baseEffect.system.abilityMeta,
            frequency: { type: 'unlimited' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).not.toThrow();
    });

    it('rejects invalid frequency type', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            ...baseEffect.system.abilityMeta,
            frequency: { type: 'invalid_freq' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/frequency type must be one of/);
    });

    it('requires max for limited frequency', () => {
      const ability = {
        ...baseEffect,
        system: {
          ...baseEffect.system,
          abilityMeta: {
            ...baseEffect.system.abilityMeta,
            frequency: { type: 'encounter' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/max is required for limited frequency/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE Subtype Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('MODE subtype validation', () => {
    const baseMode = {
      name: 'Test Mode',
      system: {
        executionModel: 'ACTIVE',
        subType: ACTIVE_SUBTYPES.MODE,
        abilityMeta: {
          activation: { actionType: 'swift' },
          modeEffect: { modifier: 'dodge_bonus' }
        }
      }
    };

    it('requires modeEffect field', () => {
      const ability = {
        ...baseMode,
        system: {
          ...baseMode.system,
          abilityMeta: {
            activation: { actionType: 'swift' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/modeEffect is required/);
    });

    it('requires modeEffect.modifier', () => {
      const ability = {
        ...baseMode,
        system: {
          ...baseMode.system,
          abilityMeta: {
            activation: { actionType: 'swift' },
            modeEffect: {}
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/modeEffect.modifier is required/);
    });

    it('accepts valid MODE ability', () => {
      expect(() => {
        ActiveContractValidator.assert(baseMode);
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('handles null abilityMeta gracefully', () => {
      const ability = {
        name: 'Broken',
        system: {
          executionModel: 'ACTIVE'
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/abilityMeta is required/);
    });

    it('handles missing system gracefully', () => {
      const ability = {
        name: 'Very Broken'
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow();
    });

    it('rejects empty string actionType', () => {
      const ability = {
        name: 'Empty Action',
        system: {
          executionModel: 'ACTIVE',
          subType: ACTIVE_SUBTYPES.EFFECT,
          abilityMeta: {
            activation: { actionType: '' },
            effect: { type: 'damageRoll' }
          }
        }
      };

      expect(() => {
        ActiveContractValidator.assert(ability);
      }).toThrow(/actionType must be one of/);
    });
  });
});
