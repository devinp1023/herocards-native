import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// getReactNativePersistence is in the RN bundle (dist/rn/index.js) loaded at runtime
// via metro.config.js package exports. TS types don't include it, so we pull it
// from the runtime module directly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth');
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyCND0fQv2JUNBE4YR7bxkMuwsucnlYmH9M',
  authDomain:        'hero-cards-1f345.firebaseapp.com',
  projectId:         'hero-cards-1f345',
  storageBucket:     'hero-cards-1f345.firebasestorage.app',
  messagingSenderId: '270324583342',
  appId:             '1:270324583342:web:f72095eaf4a08f5dc2563f',
};

// Prevent re-initialisation during Metro hot reload.
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApps()[0];

// getReactNativePersistence returns a CLASS (constructor), which is what Firebase's
// _getInstance() requires — it calls `new cls()` internally.
// Our previous plain-object persistence caused "Expected a class definition" because
// plain objects fail the `cls instanceof Function` check.
// metro.config.js sets unstable_enablePackageExports + react-native condition so
// firebase/auth resolves to dist/rn/index.js which exports getReactNativePersistence.
export const auth = isNewApp
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db      = getFirestore(app);
export const storage = getStorage(app);
