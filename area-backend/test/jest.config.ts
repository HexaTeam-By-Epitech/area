export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }],
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^src/(.*)$': '<rootDir>/../src/$1',
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(?:@faker-js)/)'
    ],
};
