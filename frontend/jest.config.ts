/**
 * Jest configuration for the Event Management frontend.
 *
 * Uses `next/jest`, which wires up SWC (so JSX/TS need no extra transform),
 * CSS Module stubs, next/font mocks and the `@/*` path alias from tsconfig.
 * The HTML report is written to `docs/test/test-report-FE.html` at the repo root.
 */
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/lib/mock*.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  clearMocks: true,
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Event Management — Frontend Test Report',
        outputPath: '<rootDir>/../docs/test/test-report-FE.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: false,
        sort: 'status',
      },
    ],
  ],
};

export default createJestConfig(config);
