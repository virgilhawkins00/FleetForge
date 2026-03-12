export default {
  displayName: 'gcp-integration',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/gcp-integration',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.spec.ts'],
};

