# Contributing to SWSE (Star Wars Saga Edition for Foundry VTT)

Thank you for your interest in contributing to the SWSE system! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Migration Guide](#migration-guide)
- [Architecture Overview](#architecture-overview)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Foundry VTT (v11-v13)
- Git
- A code editor (VS Code recommended)

### Repository Structure

```
foundryvtt-swse/
├── index.js                 # Main entry point
├── system.json              # System manifest
├── package.json             # Node dependencies
├── scripts/                 # JavaScript source code
│   ├── actors/             # Actor documents and sheets
│   ├── items/              # Item documents and sheets
│   ├── combat/             # Combat system
│   ├── apps/               # Applications (chargen, levelup, etc.)
│   ├── utils/              # Utility functions
│   ├── core/               # Core system functionality
│   └── migration/          # Migration scripts
├── styles/                  # CSS/SCSS styles
├── templates/               # Handlebars templates
├── lang/                    # Localization files
├── docs/                    # Documentation
├── migrations/              # Migration documentation
└── tools/                   # Development tools
```

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/docflowGM/foundryvtt-swse.git
cd foundryvtt-swse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Styles

```bash
npm run build:styles
```

### 4. Watch for Style Changes (Optional)

```bash
npm run watch:styles
```

### 5. Link to Foundry

Create a symbolic link from your Foundry Data/systems directory to this repository:

```bash
# Linux/Mac
ln -s /path/to/foundryvtt-swse /path/to/FoundryVTT/Data/systems/swse

# Windows (run as administrator)
mklink /D "C:\Users\YourName\AppData\Local\FoundryVTT\Data\systems\swse" "C:\path\to\foundryvtt-swse"
```

### 6. Enable Dev Mode

In Foundry, enable dev mode for additional logging:

```javascript
game.settings.set('swse', 'devMode', true);
```

## Code Style

### JavaScript

- Use ES6+ features (const/let, arrow functions, async/await)
- Use JSDoc comments for functions and classes
- Use meaningful variable names
- Keep functions small and focused
- Use early returns to avoid deep nesting

```javascript
/**
 * Updates an actor's HP value atomically.
 * @param {Actor} actor - The actor to update
 * @param {number} newHP - The new HP value
 * @returns {Promise<Actor>} The updated actor
 */
async function updateActorHP(actor, newHP) {
  if (!actor) {
    throw new Error('Actor is required');
  }

  if (newHP < 0) {
    throw new Error('HP cannot be negative');
  }

  return applyActorUpdateAtomic(actor, { 'system.hp.value': newHP });
}
```

### Imports

Always use explicit imports:

```javascript
// Good
import { swseLogger } from './utils/logger.js';
import { applyActorUpdateAtomic } from './utils/actor-utils.js';

// Bad
import * as Utils from './utils/index.js';
```

### Actor Updates

**Always** use the atomic update helpers:

```javascript
// Good - Atomic update
await applyActorUpdateAtomic(actor, { 'system.hp.value': 20 });

// Good - Batch updates
await batchActorUpdates(actor, [
  { 'system.hp.value': 20 },
  { 'system.credits': 1000 }
]);

// Good - Safe update with rollback
await safeActorUpdate(actor, { 'system.hp.value': 20 });

// Bad - Direct update
await actor.update({ 'system.hp.value': 20 });
```

### Error Handling

Always handle errors appropriately:

```javascript
try {
  await someOperation();
} catch (err) {
  swseLogger.error('Operation failed:', err);
  ui.notifications.error('Operation failed. Check console for details.');
  // Re-throw if caller needs to know
  throw err;
}
```

### Async/Await

Use async/await instead of promises:

```javascript
// Good
async function loadData() {
  const data = await fetch('/api/data');
  return data.json();
}

// Bad
function loadData() {
  return fetch('/api/data')
    .then(response => response.json());
}
```

## Making Changes

### Branch Naming

- Feature: `feature/short-description`
- Bug fix: `fix/short-description`
- Refactor: `refactor/short-description`
- Documentation: `docs/short-description`

### Commit Messages

Use conventional commit format:

```
type(scope): brief description

Detailed description if needed.

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(combat): Add support for grappling mechanics
fix(chargen): Fix species selection not applying bonuses
refactor(actor-engine): Use atomic updates for all actor changes
docs(migration): Add migration guide documentation
```

## Testing

### Manual Testing

Before submitting a PR, test the following:

1. **Character Creation**
   - [ ] Create a new character
   - [ ] Select species, class, skills
   - [ ] Choose feats and talents
   - [ ] Verify attributes are calculated correctly

2. **Level Up**
   - [ ] Level up a character
   - [ ] Select new class features
   - [ ] Verify HP, skills, and abilities update correctly

3. **Combat**
   - [ ] Roll attacks and damage
   - [ ] Apply conditions
   - [ ] Test Force powers
   - [ ] Verify initiative works

4. **Vehicle Sheets**
   - [ ] Open vehicle sheet
   - [ ] Modify vehicle
   - [ ] Test vehicle combat

5. **Error Handling**
   - [ ] Check console for errors
   - [ ] Verify no data corruption
   - [ ] Test with invalid inputs

### Unit Tests

(Coming soon - we're working on adding Jest-based unit tests)

### Browser Console

Check the browser console for:
- Errors (red)
- Warnings (yellow)
- Validation issues
- Performance problems

## Submitting Changes

### Pull Request Process

1. **Create a branch** from the latest `main`
2. **Make your changes** following code style guidelines
3. **Test thoroughly** using the manual testing checklist
4. **Update documentation** if needed
5. **Create a pull request** with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots/videos if UI changes
   - Testing checklist completed

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #(issue number)

## Testing
- [ ] Character creation tested
- [ ] Level up tested
- [ ] Combat tested
- [ ] No console errors
- [ ] Documentation updated

## Screenshots
(if applicable)
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release

## Migration Guide

When making changes that require data migration:

1. **Document the change** in `migrations/README.md`
2. **Create a migration script** in `scripts/migration/`
3. **Add migration to index.js** imports
4. **Test the migration** on a test world
5. **Mark as completed** in migration docs

See [migrations/README.md](./migrations/README.md) for details.

## Architecture Overview

### Core Systems

#### Actor Engine

Located in `scripts/actors/engine/actor-engine.js`, provides centralized actor updates.

```javascript
await game.swse.ActorEngine.updateActor(actor, updateData);
```

#### Data Models

Located in `scripts/data-models/`, define the data schema for actors and items.

- `character-data-model.js` - Character/NPC/Droid data
- `vehicle-data-model.js` - Vehicle data
- `item-data-models.js` - Item data (weapons, armor, feats, etc.)

#### Combat System

Located in `scripts/combat/`, handles combat mechanics.

- `swse-combat.js` - Combat document
- `damage-system.js` - Damage calculation
- `combat-automation.js` - Automated combat actions

#### Progression System

Located in `scripts/apps/progression/` and `scripts/progression/`, handles character progression.

- `progression-engine.js` - Core progression logic
- `chargen/` - Character generation apps
- `levelup/` - Level-up apps

### Global Namespaces

The system exposes functionality via:

- `game.swse` - Main namespace for Foundry integration
- `window.SWSE` - Additional utilities and tools
- `globalThis.SWSE` - Legacy compatibility

### Utility Functions

Located in `scripts/utils/`:

- `actor-utils.js` - Atomic actor updates
- `logger.js` - Logging utilities
- `notifications.js` - User notifications
- `performance-utils.js` - Performance monitoring
- `cache-manager.js` - Caching

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Implement feature in appropriate directory
3. Add to relevant app or sheet
4. Update documentation
5. Test thoroughly
6. Submit PR

### Fixing a Bug

1. Identify root cause
2. Create fix branch
3. Implement fix
4. Add test to prevent regression
5. Verify fix doesn't break other features
6. Submit PR

### Updating Documentation

1. Locate relevant documentation file in `docs/` or root
2. Make updates
3. Verify links work
4. Submit PR

## Resources

- [Foundry VTT API Documentation](https://foundryvtt.com/api/)
- [Star Wars Saga Edition Wiki](https://swse.fandom.com/)
- [Project Issues](https://github.com/docflowGM/foundryvtt-swse/issues)
- [Migration Guide](./migrations/README.md)

## Questions?

If you have questions:

1. Check existing documentation
2. Search closed issues
3. Ask on the project's Discord (if available)
4. Open a discussion on GitHub

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Thank you for contributing to SWSE! Your help makes this system better for everyone.
