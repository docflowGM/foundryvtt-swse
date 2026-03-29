/**
 * Jest Configuration for SWSE Governance Tests
 *
 * Configured for ES modules (type: "module" in package.json)
 * Runs governance compliance tests with minimal setup
 */

export default {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/archived/',
  ],
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/**/*.test.js',
    '!scripts/**/__tests__/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  // Timeout for async tests (governance tests may be slow)
  testTimeout: 10000,
  // Verbose output for governance tests
  verbose: true,
};
