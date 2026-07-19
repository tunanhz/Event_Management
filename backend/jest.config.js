/**
 * Jest configuration for the Event Management backend.
 *
 * Tests live in `src/__tests__` and run against an in-memory MongoDB instance
 * (see `src/__tests__/setup/`), so no external database is required.
 * The HTML report is written to `docs/test/test-report-BE.html` at the repo root.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/src/__tests__/setup/env.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  // Mongo binary download + Express boot make the first suite slow on a cold cache.
  testTimeout: 30000,
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.qa.ts', '!src/scripts/**', '!src/server.ts'],
  coverageDirectory: '<rootDir>/coverage',
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Event Management — Backend Test Report',
        outputPath: '<rootDir>/../docs/test/test-report-BE.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: false,
        sort: 'status',
      },
    ],
  ],
};
