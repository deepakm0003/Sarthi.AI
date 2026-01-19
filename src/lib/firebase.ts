
import {
  initializeApp,
  getApp,
  getApps,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// NOTE:
// Do NOT read env vars via dynamic keys (e.g. process.env[name]) in Next.js client bundles.
// Next/Turbopack only inlines env vars when accessed statically (process.env.NEXT_PUBLIC_...).
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
const firebaseMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();

export const firebaseConfig: FirebaseOptions & { measurementId?: string } = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
  measurementId: firebaseMeasurementId,
};

export const isFirebaseConfigured =
  typeof firebaseApiKey === 'string' &&
  firebaseApiKey.length > 0 &&
  typeof firebaseAuthDomain === 'string' &&
  firebaseAuthDomain.length > 0 &&
  typeof firebaseProjectId === 'string' &&
  firebaseProjectId.length > 0 &&
  typeof firebaseAppId === 'string' &&
  firebaseAppId.length > 0;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
}

export { auth, db, storage };
