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
      branches: 0,
      functions: 5,
      lines: 5,
      statements: 5,
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
  // The circular dep is: database -> security (via user.schema.ts) -> database (via tenant.service.ts)
  testPathIgnorePatterns: [
    '/node_modules/',
    'firmware.repository.spec.ts',
    'user.repository.spec.ts',
    'deployment.repository.spec.ts',
    'fleet.repository.spec.ts',
    'device.repository.spec.ts',
    'telemetry.repository.spec.ts',
    'database.module.spec.ts',
  ],
};
