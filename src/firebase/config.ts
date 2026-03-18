import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, Persistence } from 'firebase/auth';
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

// Firebase v12 removed getReactNativePersistence.
// Custom AsyncStorage-backed persistence — session survives app restarts.
// Cast to Persistence (public type) to satisfy initializeAuth; the _xxx methods
// are the internal interface Firebase calls at runtime.
const asyncStoragePersistence = {
  type: 'LOCAL' as const,
  async _isAvailable() { return true; },
  async _set(key: string, value: string) { await AsyncStorage.setItem(key, value); },
  async _get(key: string) { return AsyncStorage.getItem(key); },
  async _remove(key: string) { await AsyncStorage.removeItem(key); },
  _addListener(_key: string, _listener: unknown) {},
  _removeListener(_key: string, _listener: unknown) {},
} as unknown as Persistence;

// Prevent re-initialisation during Metro hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth    = initializeAuth(app, { persistence: asyncStoragePersistence });
export const db      = getFirestore(app);
export const storage = getStorage(app);
