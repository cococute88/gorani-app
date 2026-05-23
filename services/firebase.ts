import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Database | null = null;

const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseDatabaseUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  databaseURL: firebaseDatabaseUrl,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
};

const missingFirebaseEnvNames = [
  ["EXPO_PUBLIC_FIREBASE_API_KEY", firebaseApiKey],
  ["EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseAuthDomain],
  ["EXPO_PUBLIC_FIREBASE_DATABASE_URL", firebaseDatabaseUrl],
  ["EXPO_PUBLIC_FIREBASE_PROJECT_ID", firebaseProjectId],
  ["EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseStorageBucket],
  ["EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", firebaseMessagingSenderId],
  ["EXPO_PUBLIC_FIREBASE_APP_ID", firebaseAppId],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

export function getFirebaseEnvDiagnostics() {
  return {
    hasApiKey: Boolean(firebaseApiKey),
    hasAuthDomain: Boolean(firebaseAuthDomain),
    hasDatabaseUrl: Boolean(firebaseDatabaseUrl),
    projectId: firebaseProjectId ?? "-",
    hasStorageBucket: Boolean(firebaseStorageBucket),
    hasMessagingSenderId: Boolean(firebaseMessagingSenderId),
    hasAppId: Boolean(firebaseAppId),
  };
}

function getFirebaseConfig(): FirebaseOptions {
  if (missingFirebaseEnvNames.length > 0) {
    throw new Error(`Firebase 설정값 누락: ${missingFirebaseEnvNames.join(", ")}. README의 Firebase 설정 단계를 확인해 주세요.`);
  }

  return firebaseConfig;
}

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
  cachedApp = app;
  return app;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }

  cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

export function getFirebaseDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  cachedDb = getDatabase(getFirebaseApp());
  return cachedDb;
}
