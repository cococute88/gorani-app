import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from "@firebase/auth";
import { getDatabase, type Database } from "firebase/database";

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Database | null = null;

function requiredConfigValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Firebase 설정값 누락: ${name}. README의 Firebase 설정 단계를 확인해 주세요.`);
  }
  return value;
}

function getFirebaseConfig(): FirebaseOptions {
  return {
    apiKey: requiredConfigValue("EXPO_PUBLIC_FIREBASE_API_KEY", process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    authDomain: requiredConfigValue("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    databaseURL: requiredConfigValue("EXPO_PUBLIC_FIREBASE_DATABASE_URL", process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL),
    projectId: requiredConfigValue("EXPO_PUBLIC_FIREBASE_PROJECT_ID", process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: requiredConfigValue(
      "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    ),
    messagingSenderId: requiredConfigValue(
      "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ),
    appId: requiredConfigValue("EXPO_PUBLIC_FIREBASE_APP_ID", process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  };
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

  const app = getFirebaseApp();

  if (Platform.OS === "web") {
    cachedAuth = getAuth(app);
    return cachedAuth;
  }

  try {
    cachedAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    cachedAuth = getAuth(app);
  }

  return cachedAuth;
}

export function getFirebaseDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  cachedDb = getDatabase(getFirebaseApp());
  return cachedDb;
}
