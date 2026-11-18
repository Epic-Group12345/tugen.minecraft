module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^react-native$': '<rootDir>/test-mocks/react-native.js',
    // react-native-svg нужен SDK, а в Node его нативные части не грузятся: тестам — заглушка
    '^react-native-svg$': '<rootDir>/test-mocks/react-native-svg.js',
  },
  // SDK приходит исходниками на TypeScript (так его берёт и Metro)
  transformIgnorePatterns: ['/node_modules/(?!@tugen/)'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { allowJs: true } }] },
};
