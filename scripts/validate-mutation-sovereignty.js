/**
 * Mutation Sovereignty Validator
 *
 * Validates that all character-affecting mutations in critical paths
 * route through ActorEngine and not through direct actor/item mutations.
 *
 * This is automated proof of mutation sovereignty.
 */

const fs = require('fs');
const path = require('path');

// Critical progression paths that must have ONLY ActorEngine mutations
const PROTECTED_PATHS = [
  'scripts/apps/chargen/chargen-finalizer.js',
  'scripts/apps/levelup/levelup-force-powers.js',
  'scripts/apps/progression-framework/shell/progression-finalizer.js',
  'scripts/infrastructure/hooks/talent-effects-hooks.js',
  'scripts/engine/force/force-power-effects-engine.js',
  'scripts/engine/combat/CombatEngine.js',
  'scripts/talents/DarkSidePowers.js',
  'scripts/houserules/houserule-status-effects.js',
  'scripts/utils/force-power-manager.js',
  'scripts/infrastructure/hooks/actor-hooks.js',
  'scripts/apps/item-selling-system.js',
  'scripts/core/runtime-safety.js'
];

// Forbidden patterns in protected paths
const FORBIDDEN_PATTERNS = [
  {
    pattern: /\bactor\.update\s*\(/,
    message: 'Direct actor.update() found — must use ActorEngine.updateActor()',  // @mutation-exception: Validation script - example detection
    except: ['ActorEngine']
  },
  {
    pattern: /\bactor\.createEmbeddedDocuments\s*\(/,
    message: 'Direct actor.createEmbeddedDocuments() found — must use ActorEngine.createEmbeddedDocuments()',  // @mutation-exception: Validation script - example detection
    except: ['ActorEngine']
  },
  {
    pattern: /\bactor\.deleteEmbeddedDocuments\s*\(/,
    message: 'Direct actor.deleteEmbeddedDocuments() found — must use ActorEngine method',  // @mutation-exception: Validation script - example detection
    except: ['ActorEngine']
  },
  {
    pattern: /\bitem\.delete\s*\(\s*\)/,
    message: 'Direct item.delete() found — must use ActorEngine.deleteEmbeddedDocuments()',
    except: ['ActorEngine']
  }
];

function validateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    return { file: filePath, status: 'MISSING', errors: ['File not found'] };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const errors = [];

  for (const forbiddenCheck of FORBIDDEN_PATTERNS) {
    const matches = content.matchAll(forbiddenCheck.pattern);

    for (const match of matches) {
      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;

      // Check if violation is in an exception context
      const contextStart = Math.max(0, match.index - 200);
      const contextEnd = Math.min(content.length, match.index + 200);
      const context = content.substring(contextStart, contextEnd);

      let isException = false;
      for (const exception of forbiddenCheck.except) {
        if (context.includes(exception)) {
          isException = true;
          break;
        }
      }

      if (!isException) {
        errors.push({
          line: lineNum,
          pattern: forbiddenCheck.pattern.toString(),
          message: forbiddenCheck.message
        });
      }
    }
  }

  return {
    file: filePath,
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors
  };
}

function main() {
  console.log('='.repeat(80));
  console.log('MUTATION SOVEREIGNTY VALIDATION');
  console.log('='.repeat(80));
  console.log('');

  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const filePath of PROTECTED_PATHS) {
    const result = validateFile(filePath);

    if (result.status === 'PASS') {
      console.log(`✅ ${result.file}`);
      passCount++;
    } else {
      console.log(`❌ ${result.file}`);
      failCount++;
      failures.push(result);

      for (const error of result.errors) {
        console.log(`   Line ${error.line}: ${error.message}`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    console.log('\nFAILURES:');
    for (const failure of failures) {
      console.log(`\n${failure.file}:`);
      for (const error of failure.errors) {
        console.log(`  Line ${error.line}: ${error.message}`);
      }
    }
    process.exit(1);
  }

  console.log('\n✅ ALL PROTECTED PATHS ARE MUTATION SOVEREIGN');
  process.exit(0);
}

main();
