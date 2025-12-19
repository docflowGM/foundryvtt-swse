/**
 * Build script for SWSE themes
 * Compiles each theme individually for lazy loading
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const themes = [
  'holo',
  'high-contrast',
  'starship',
  'sand-people',
  'jedi',
  'high-republic'
];

const themesDir = path.join(__dirname, '..', '..', 'styles', 'src', 'themes');
const distDir = path.join(__dirname, '..', '..', 'styles', 'themes');

// Ensure themes directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building themes...');

themes.forEach(theme => {
  const inputFile = path.join(themesDir, `_${theme}.scss`);
  const outputFile = path.join(distDir, `swse-theme-${theme}.css`);

  if (!fs.existsSync(inputFile)) {
    console.warn(`Warning: Theme file not found: ${inputFile}`);
    return;
  }

  try {
    // Compile SCSS to CSS
    console.log(`  Compiling ${theme}...`);
    execSync(`sass ${inputFile} ${outputFile} --no-source-map`, { stdio: 'inherit' });

    // Optimize with PostCSS
    execSync(`postcss ${outputFile} --replace --use autoprefixer cssnano`, { stdio: 'inherit' });

    console.log(`  ✓ ${theme} compiled successfully`);
  } catch (error) {
    console.error(`  ✗ Error compiling ${theme}:`, error.message);
    process.exit(1);
  }
});

console.log('All themes built successfully!');
