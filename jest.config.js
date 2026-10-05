module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // SDK приходит исходниками на TypeScript (так его берёт и Metro)
  transformIgnorePatterns: ['/node_modules/(?!@tugen/)'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { allowJs: true } }] },
};
