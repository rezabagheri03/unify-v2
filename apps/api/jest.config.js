/** apps/api/jest.config.js */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../tests/api'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEach: [],
  testTimeout: 30_000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@unify/shared-types$': '<rootDir>/../packages/shared-types/src/index.ts',
  },
};
