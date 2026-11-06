module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^react-native$': '<rootDir>/test-mocks/react-native.js',
  },
  // SDK приходит исходниками на TypeScript (так его берёт и Metro)
  transformIgnorePatterns: ['/node_modules/(?!@tugen/)'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { allowJs: true } }] },
};
