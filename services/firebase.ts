import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Firebase 설정값 누락: ${name}. README의 Firebase 설정 단계를 확인해 주세요.`);
  }
  return value;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requiredEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: requiredEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  databaseURL: requiredEnv("EXPO_PUBLIC_FIREBASE_DATABASE_URL"),
  projectId: requiredEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: requiredEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requiredEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const firebaseDb = getDatabase(app);
