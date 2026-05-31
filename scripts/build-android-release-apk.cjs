const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { loadPublicEnv } = require("./check-public-env.cjs");

function main() {
  try {
    loadPublicEnv({ applyToProcess: true });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log("All required EXPO_PUBLIC env keys are present.");
  console.log("Building release APK with public env loaded into the Gradle process.");

  const androidDir = path.resolve(__dirname, "..", "android");
  const command = process.platform === "win32" ? "cmd.exe" : "./gradlew";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "gradlew.bat", "assembleRelease"] : ["assembleRelease"];
  const result = spawnSync(command, args, {
    cwd: androidDir,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "production",
    },
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  console.log("Release APK: android/app/build/outputs/apk/release/app-release.apk");
}

main();
