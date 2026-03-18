const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase 10 ships environment-specific bundles via package.json "exports" conditions:
//   "react-native" → dist/rn/index.js  (Hermes-safe, has getReactNativePersistence)
//   "browser"      → browser bundle    (uses IndexedDB/localStorage — crashes on Hermes)
//
// Enable package exports so Metro honours the "exports" field, then put "react-native"
// first in the condition list so ALL Firebase packages load their RN-safe bundles
// consistently (prevents the "Component auth has not been registered yet" mismatch).
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  'react-native',
  'require',
  'default',
];

module.exports = config;
