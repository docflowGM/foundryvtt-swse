/**
 * Content Contracts — Phase 6 Work Package B
 *
 * Machine-readable contracts for progression authoring.
 * Enables validation, documentation, and tooling for all content types.
 *
 * Contracts defined:
 * 1. NodeMetadata — What goes in the node registry
 * 2. TemplateDefinition — Template JSON structure
 * 3. TargetPath — Prestige/goal target definitions
 * 4. AdvisoryMetadata — Mentor/suggestion metadata
 * 5. PrerequisitePayload — Prerequisite rule format
 */

export class ContentContracts {
  /**
   * Contract: Node Registry Entry
   *
   * All progression nodes must conform to this schema.
   * Registry is immutable; violating this breaks the system.
   */
  static nodeMetadataContract = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Progression Node Metadata',
    type: 'object',
    required: [
      'nodeId',
      'label',
      'category',
      'modes',
      'subtypes',
      'activationPolicy',
      'dependsOn',
      'invalidates',
      'selectionKey',
      'optional',
    ],
    properties: {
      nodeId: {
        type: 'string',
        description: 'Unique node identifier (kebab-case)',
        pattern: '^[a-z][a-z0-9-]*$',
      },
      label: {
        type: 'string',
        description: 'User-facing node label',
        minLength: 1,
        maxLength: 50,
      },
      category: {
        type: 'string',
        enum: ['canonical', 'conditional', 'prerequisite', 'level-event'],
        description: 'Node categorization',
      },
      modes: {
        type: 'array',
        items: {
          enum: ['chargen', 'levelup', 'template'],
        },
        description: 'Modes where this node is active',
      },
      subtypes: {
        type: 'array',
        items: {
          enum: ['actor', 'droid', 'npc', 'follower', 'nonheroic'],
        },
        description: 'Actor subtypes where this node is active',
      },
      activationPolicy: {
        type: 'string',
        enum: ['canonical', 'prerequisite', 'conditional', 'level-event'],
        description: 'How this node becomes active',
      },
      dependsOn: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[a-z][a-z0-9-]*$',
        },
        description: 'Node IDs that must complete before this',
      },
      invalidates: {
        type: 'object',
        additionalProperties: {
          enum: ['purge', 'dirty', 'recompute', 'warn'],
        },
        description: 'Downstream invalidation: { nodeId: behavior }',
      },
      selectionKey: {
        type: ['string', 'null'],
        description: 'Key in draftSelections (null if no selection)',
      },
      optional: {
        type: 'boolean',
        description: 'Can player skip this node?',
      },
      isSkippable: {
        type: 'boolean',
        description: 'Alternate flag for skippable',
      },
      isFinal: {
        type: 'boolean',
        description: 'Is this a terminal node?',
      },
      supportLevel: {
        type: 'string',
        enum: ['full', 'partial', 'structural', 'unsupported'],
        description: 'Support status for this node',
        default: 'full',
      },
    },
    additionalProperties: false,
  };

  /**
   * Contract: Template Definition
   *
   * All templates must conform to this structure.
   * Validated on load via TemplateValidator.
   */
  static templateDefinitionContract = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Character Template Definition',
    type: 'object',
    required: ['id', 'name', 'className'],
    properties: {
      // Identity
      id: {
        type: 'string',
        description: 'Unique template ID',
        pattern: '^[a-z0-9_]+$',
      },
      name: {
        type: 'string',
        description: 'User-facing template name',
      },
      description: {
        type: 'string',
        description: 'Long-form template description',
      },

      // Core selections
      species: {
        type: 'string',
        description: 'Species ID or name',
      },
      className: {
        type: 'string',
        description: 'Class name',
      },
      class: {
        type: 'string',
        description: 'Class ID (alternate)',
      },
      background: {
        type: 'string',
        description: 'Background ID or name',
      },

      // Abilities and attributes
      abilityScores: {
        type: 'object',
        properties: {
          str: { type: 'number', minimum: 3, maximum: 18 },
          dex: { type: 'number', minimum: 3, maximum: 18 },
          con: { type: 'number', minimum: 3, maximum: 18 },
          int: { type: 'number', minimum: 3, maximum: 18 },
          wis: { type: 'number', minimum: 3, maximum: 18 },
          cha: { type: 'number', minimum: 3, maximum: 18 },
        },
      },

      // Selections
      trainedSkills: {
        type: 'array',
        items: { type: 'string' },
        description: 'Skill IDs',
      },
      feats: {
        type: 'array',
        items: { type: 'string' },
      },
      talents: {
        type: 'array',
        items: { type: 'string' },
      },
      languages: {
        type: 'array',
        items: { type: 'string' },
      },

      // Force/powers
      forcePowers: {
        type: 'array',
        items: { type: 'string' },
      },
      forceTechniques: {
        type: 'array',
        items: { type: 'string' },
      },
      forceSecrets: {
        type: 'array',
        items: { type: 'string' },
      },

      // Metadata
      archetype: {
        type: 'string',
        description: 'Build archetype (for advisory)',
      },
      role: {
        type: 'string',
        description: 'Character role (for advisory)',
      },
      mentor: {
        type: 'string',
        description: 'Mentor ID for this template',
      },
      prestigeTarget: {
        type: 'string',
        description: 'Target prestige class',
      },

      // Gating
      minLevel: {
        type: 'number',
        minimum: 1,
        description: 'Minimum level for this template',
      },
      requiresType: {
        type: 'string',
        enum: ['actor', 'droid', 'npc', 'follower', 'nonheroic'],
        description: 'Required actor type',
      },

      // Support
      supportLevel: {
        type: 'string',
        enum: ['full', 'beta', 'legacy'],
        default: 'full',
      },

      // Compendium references (ID-based)
      classRef: {
        type: 'object',
        properties: {
          pack: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
        },
      },
      speciesRef: {
        type: 'object',
        properties: {
          pack: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },

    additionalProperties: false,
  };

  /**
   * Contract: Target Path Definition
   *
   * Prestige classes and build targets must conform.
   * Used by advisory system to guide progression.
   */
  static targetPathContract = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Target Path / Prestige Definition',
    type: 'object',
    required: ['id', 'name', 'category'],
    properties: {
      id: {
        type: 'string',
        description: 'Unique target ID',
      },
      name: {
        type: 'string',
        description: 'Target name',
      },
      category: {
        type: 'string',
        enum: ['prestige-class', 'build-archetype', 'role-specialization'],
        description: 'Type of target',
      },

      // Prerequisites
      minimumLevel: {
        type: 'number',
        description: 'Level at which target is available',
      },
      requiredClass: {
        type: ['string', 'array'],
        description: 'Prerequisite class(es)',
      },
      requiredFeats: {
        type: 'array',
        items: { type: 'string' },
        description: 'Feat prerequisites',
      },
      requiredAbilities: {
        type: 'object',
        description: 'Minimum ability scores',
      },

      // Milestones
      milestones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            level: { type: 'number' },
            achievement: { type: 'string' },
            suggestions: { type: 'array', items: { type: 'string' } },
          },
        },
        description: 'Level-by-level guidance',
      },

      // Advisory hooks
      advisoryTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for advisory system',
      },
      mentorBias: {
        type: 'string',
        description: 'Mentor preference for this target',
      },

      // Support
      supportLevel: {
        type: 'string',
        enum: ['full', 'partial', 'structural'],
        default: 'full',
      },
    },

    additionalProperties: false,
  };

  /**
   * Contract: Advisory Metadata
   *
   * Mentor, suggestion, and forecast metadata must conform.
   */
  static advisoryMetadataContract = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Advisory Metadata',
    type: 'object',
    required: ['domain', 'tags'],
    properties: {
      domain: {
        type: 'string',
        enum: [
          'class',
          'feat',
          'talent',
          'skill',
          'language',
          'force-power',
          'forcetechnique',
          'force-secret',
          'archetype',
          'role',
          'prestige',
        ],
        description: 'Content domain',
      },

      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Semantic tags (Warrior, Rogue, Support, etc.)',
      },

      mentorBiases: {
        type: 'object',
        additionalProperties: {
          type: 'string',
          enum: ['favor', 'caution', 'neutral'],
        },
        description: '{ mentorId: bias }',
      },

      cautionCategories: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['multiclass-heavy', 'feat-intensive', 'force-dependent', 'unoptimal'],
        },
        description: 'Warnings to surface',
      },

      templateAffinities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Templates this fits well into',
      },

      roleAssociations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Character roles this supports',
      },

      archetypeAssociations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Archetypes this reinforces',
      },

      synergies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            with: { type: 'string' },
            benefit: { type: 'string' },
          },
        },
        description: 'Known synergies with other content',
      },
    },

    additionalProperties: false,
  };

  /**
   * Contract: Prerequisite Payload
   *
   * All prerequisites must conform to this structure.
   * Used by PrerequisiteChecker.
   */
  static prerequisitePayloadContract = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Prerequisite Payload',
    type: 'object',
    properties: {
      minimumAbilities: {
        type: 'object',
        properties: {
          str: { type: 'number', minimum: 3, maximum: 18 },
          dex: { type: 'number', minimum: 3, maximum: 18 },
          con: { type: 'number', minimum: 3, maximum: 18 },
          int: { type: 'number', minimum: 3, maximum: 18 },
          wis: { type: 'number', minimum: 3, maximum: 18 },
          cha: { type: 'number', minimum: 3, maximum: 18 },
        },
      },

      requiredClass: {
        type: ['string', 'array'],
        description: 'Class requirement(s)',
      },

      forbiddenClass: {
        type: ['string', 'array'],
      },

      requiredFeats: {
        type: 'array',
        items: { type: 'string' },
      },

      requiredLevel: {
        type: 'number',
        minimum: 1,
      },

      requiresForce: {
        type: 'boolean',
        description: 'Must have Force Sensitivity',
      },

      requiresMulticlass: {
        type: 'boolean',
        description: 'Must be multiclassed',
      },

      customValidator: {
        type: 'string',
        description: 'Reference to custom validator function',
      },
    },

    additionalProperties: false,
  };

  /**
   * Validate a piece of content against its contract.
   *
   * @param {string} contentType - 'node' | 'template' | 'target' | 'advisory' | 'prerequisite'
   * @param {Object} content - Content to validate
   * @returns {Object} { valid: boolean, errors: [], warnings: [] }
   */
  static validate(contentType, content) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const contract = this._getContract(contentType);
    if (!contract) {
      result.errors.push(`Unknown content type: ${contentType}`);
      result.valid = false;
      return result;
    }

    // Check required fields
    for (const field of contract.required || []) {
      if (!(field in content)) {
        result.errors.push(`Missing required field: ${field}`);
        result.valid = false;
      }
    }

    // Check field types and constraints
    for (const [field, fieldSchema] of Object.entries(contract.properties || {})) {
      if (field in content) {
        const fieldValidation = this._validateField(field, content[field], fieldSchema);
        if (!fieldValidation.valid) {
          result.errors.push(...fieldValidation.errors);
          result.valid = false;
        }
        result.warnings.push(...fieldValidation.warnings);
      }
    }

    // Check for unknown fields
    if (contract.additionalProperties === false) {
      for (const field of Object.keys(content)) {
        if (!(field in (contract.properties || {}))) {
          result.warnings.push(`Unknown field: ${field}`);
        }
      }
    }

    return result;
  }

  /**
   * Validate a single field value.
   * @private
   */
  static _validateField(fieldName, value, schema) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Type check
    if (schema.type && !this._checkType(value, schema.type)) {
      result.errors.push(`Field ${fieldName}: expected ${schema.type}, got ${typeof value}`);
      result.valid = false;
    }

    // Enum check
    if (schema.enum && !schema.enum.includes(value)) {
      result.errors.push(
        `Field ${fieldName}: value "${value}" not in allowed values: ${schema.enum.join(', ')}`
      );
      result.valid = false;
    }

    // Pattern check
    if (schema.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        result.errors.push(`Field ${fieldName}: value "${value}" does not match pattern ${schema.pattern}`);
        result.valid = false;
      }
    }

    // Range checks
    if (schema.minimum !== undefined && value < schema.minimum) {
      result.errors.push(`Field ${fieldName}: value ${value} is less than minimum ${schema.minimum}`);
      result.valid = false;
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      result.errors.push(`Field ${fieldName}: value ${value} exceeds maximum ${schema.maximum}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Check if value matches type spec.
   * @private
   */
  static _checkType(value, typeSpec) {
    if (Array.isArray(typeSpec)) {
      return typeSpec.some((t) => this._checkType(value, t));
    }

    if (typeSpec === 'null') return value === null;
    if (typeSpec === 'boolean') return typeof value === 'boolean';
    if (typeSpec === 'object') return typeof value === 'object' && value !== null;
    if (typeSpec === 'array') return Array.isArray(value);
    if (typeSpec === 'number') return typeof value === 'number';
    if (typeSpec === 'string') return typeof value === 'string';
    if (typeSpec === 'integer') return Number.isInteger(value);

    return false;
  }

  /**
   * Get contract for a content type.
   * @private
   */
  static _getContract(contentType) {
    const contracts = {
      node: this.nodeMetadataContract,
      template: this.templateDefinitionContract,
      target: this.targetPathContract,
      advisory: this.advisoryMetadataContract,
      prerequisite: this.prerequisitePayloadContract,
    };

    return contracts[contentType];
  }

  /**
   * Generate human-readable contract documentation.
   *
   * @param {string} contentType - Content type to document
   * @returns {string} Formatted documentation
   */
  static documentContract(contentType) {
    const contract = this._getContract(contentType);
    if (!contract) {
      return `Unknown content type: ${contentType}`;
    }

    const lines = [];
    lines.push(`# ${contract.title}`);
    lines.push('');
    lines.push(`**Type:** ${contract.type}`);
    lines.push('');

    if (contract.required && contract.required.length > 0) {
      lines.push('**Required Fields:**');
      for (const field of contract.required) {
        lines.push(`- ${field}`);
      }
      lines.push('');
    }

    if (contract.properties) {
      lines.push('**Properties:**');
      for (const [field, schema] of Object.entries(contract.properties)) {
        lines.push(`- **${field}** (${schema.type || 'any'})`);
        if (schema.description) {
          lines.push(`  ${schema.description}`);
        }
        if (schema.enum) {
          lines.push(`  Allowed: ${schema.enum.join(', ')}`);
        }
      }
    }

    return lines.join('\n');
  }
}
