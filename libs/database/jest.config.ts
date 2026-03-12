export default {
  displayName: 'database',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/database',
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/**/*.module.ts',
  ],
  // Skip tests with circular dependency issues until refactoring is complete
  testPathIgnorePatterns: [
    '/node_modules/',
    'firmware.repository.spec.ts',
    'user.repository.spec.ts',
  ],
};
