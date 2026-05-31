const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_PUBLIC_ENV_KEYS = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_DATABASE_URL",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_CF_WORKER_URL",
  "EXPO_PUBLIC_GORANI_WORKER_API_KEY",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
];

function parseDotenvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const normalized = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
  const separatorIndex = normalized.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  const key = normalized.slice(0, separatorIndex).trim();
  let value = normalized.slice(separatorIndex + 1).trim();

  if (!key) {
    return null;
  }

  const quote = value[0];
  if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
    value = value.slice(1, -1);
  } else {
    const commentIndex = value.indexOf(" #");
    if (commentIndex !== -1) {
      value = value.slice(0, commentIndex).trimEnd();
    }
  }

  return [key, value];
}

function loadPublicEnv({ applyToProcess = false } = {}) {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env file is required for release APK builds.");
  }

  const parsed = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const entry = parseDotenvLine(line);
    if (!entry) {
      continue;
    }

    const [key, value] = entry;
    parsed[key] = value;
    if (applyToProcess) {
      process.env[key] = value;
    }
  }

  const missing = REQUIRED_PUBLIC_ENV_KEYS.filter((key) => !parsed[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required EXPO_PUBLIC env keys: ${missing.join(", ")}`);
  }

  return { envPath, keys: REQUIRED_PUBLIC_ENV_KEYS, parsed };
}

function main() {
  try {
    loadPublicEnv();
    console.log("All required EXPO_PUBLIC env keys are present.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  REQUIRED_PUBLIC_ENV_KEYS,
  loadPublicEnv,
};
