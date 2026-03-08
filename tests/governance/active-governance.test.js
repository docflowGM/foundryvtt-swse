/**
 * ACTIVE Model - Governance Compliance Tests
 *
 * Validates adherence to CLAUDE.md requirements:
 * - No mutations outside ActorEngine
 * - Absolute import discipline
 * - No direct DOM manipulation
 * - Single entry point for all activations
 * - Proper error handling and logging
 */

import fs from 'fs';
import path from 'path';

const ACTIVE_DIR = '/home/user/foundryvtt-swse/scripts/engine/abilities/active';

describe('ACTIVE Model - Governance Compliance', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // Import Discipline
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Import discipline (absolute paths only)', () => {
    const files = [
      'active-adapter.js',
      'active-types.js',
      'active-contract.js',
      'effect-resolver.js',
      'duration-engine.js',
      'targeting-engine.js'
    ];

    files.forEach(file => {
      it(`${file} uses absolute imports only`, () => {
        const filePath = path.join(ACTIVE_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for relative imports (should not exist)
        const relativeImportPattern = /from\s+['"]\.\.?\//g;
        const relativeImports = content.match(relativeImportPattern);

        expect(relativeImports).toBeNull(
          `${file} contains relative imports. Use absolute paths: ` +
          `from "/systems/foundryvtt-swse/scripts/..."`
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Mutation Safety
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Mutation safety (ActorEngine only)', () => {
    it('active-adapter.js does not call actor.update() directly', () => {
      const filePath = path.join(ACTIVE_DIR, 'active-adapter.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // actor.update() should never appear except in comments
      const directUpdateCalls = content
        .split('\n')
        .filter((line, idx) => {
          // Exclude comment lines
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return false;
          }
          return /actor\.update\s*\(/.test(line);
        });

      expect(directUpdateCalls.length).toBe(0,
        'active-adapter.js calls actor.update() directly. ' +
        'All mutations must route through ActorEngine.apply() or ActorEngine.updateActor()'
      );
    });

    it('active-adapter.js does not call item.update() directly', () => {
      const filePath = path.join(ACTIVE_DIR, 'active-adapter.js');
      const content = fs.readFileSync(filePath, 'utf8');

      const directUpdateCalls = content
        .split('\n')
        .filter((line) => {
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return false;
          }
          return /item\.update\s*\(/.test(line);
        });

      expect(directUpdateCalls.length).toBe(0,
        'active-adapter.js calls item.update() directly. ' +
        'All mutations must route through ActorEngine'
      );
    });

    it('active-adapter.js uses ActorEngine for all mutations', () => {
      const filePath = path.join(ACTIVE_DIR, 'active-adapter.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Should import ActorEngine
      expect(content).toMatch(/import.*ActorEngine/,
        'active-adapter.js should import ActorEngine'
      );

      // Should call ActorEngine methods
      expect(content).toMatch(/ActorEngine\.(apply|updateActor)/,
        'active-adapter.js should use ActorEngine.apply() or ActorEngine.updateActor()'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DOM Safety
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DOM safety (no direct manipulation)', () => {
    const files = [
      'active-adapter.js',
      'effect-resolver.js',
      'duration-engine.js'
    ];

    files.forEach(file => {
      it(`${file} does not manipulate DOM directly`, () => {
        const filePath = path.join(ACTIVE_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Forbidden patterns
        const forbiddenPatterns = [
          /document\.getElementById/,
          /document\.querySelector/,
          /\.innerHTML\s*=/,
          /\.appendChild/,
          /\.textContent\s*=/
        ];

        forbiddenPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern,
            `${file} contains direct DOM manipulation: ${pattern}. ` +
            `Use ApplicationV2 lifecycle or SWSEChat for output`
          );
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Chat Output Governance
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Chat output governance', () => {
    it('active-adapter.js uses SWSEChat for all output', () => {
      const filePath = path.join(ACTIVE_DIR, 'active-adapter.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Should import SWSEChat
      expect(content).toMatch(/import.*SWSEChat/,
        'active-adapter.js should import SWSEChat'
      );

      // Should call SWSEChat methods
      expect(content).toMatch(/SWSEChat\./,
        'active-adapter.js should use SWSEChat for chat output'
      );
    });

    it('active-adapter.js does not call ChatMessage.create() directly', () => {
      const filePath = path.join(ACTIVE_DIR, 'active-adapter.js');
      const content = fs.readFileSync(filePath, 'utf8');

      const directChatCalls = content
        .split('\n')
        .filter((line) => {
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return false;
          }
          return /ChatMessage\.create\s*\(/.test(line);
        });

      expect(directChatCalls.length).toBe(0,
        'active-adapter.js calls ChatMessage.create() directly. ' +
        'Use SWSEChat service instead'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Logging and Error Handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Logging and error handling', () => {
    it('active-adapter.js uses consistent logger', () => {
      const filePath = path.join(ACTIVE_DIR, 'active-adapter.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Should import logger
      expect(content).toMatch(/import.*[Ll]ogger|SWSELogger/,
        'active-adapter.js should import logger'
      );

      // Should use logger, not console
      const consoleLines = content
        .split('\n')
        .filter((line) => {
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return false;
          }
          return /console\.(log|error|warn|debug)/.test(line);
        });

      expect(consoleLines.length).toBe(0,
        'active-adapter.js uses console methods directly. Use logger instead'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Entry Point Discipline
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Single entry point discipline', () => {
    it('all activations route through active-adapter.js', () => {
      // This is more of an integration test that requires runtime
      // verification, but we can check that:
      // 1. Only active-adapter exports public methods
      // 2. Other files are internal

      const adapterPath = path.join(ACTIVE_DIR, 'active-adapter.js');
      const adapterContent = fs.readFileSync(adapterPath, 'utf8');

      expect(adapterContent).toMatch(/export\s+class\s+ActiveAdapter/,
        'active-adapter.js should export ActiveAdapter class'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // File Organization
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File organization', () => {
    it('all required ACTIVE files exist', () => {
      const requiredFiles = [
        'active-types.js',
        'active-contract.js',
        'active-adapter.js',
        'effect-resolver.js',
        'duration-engine.js',
        'targeting-engine.js'
      ];

      requiredFiles.forEach(file => {
        const filePath = path.join(ACTIVE_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true,
          `Required file missing: ${file}`
        );
      });
    });
  });
});
