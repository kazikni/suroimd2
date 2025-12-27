import { join } from "https://deno.land/std@0.204.0/path/mod.ts";
import { emptyDir, ensureDir } from "https://deno.land/std@0.204.0/fs/mod.ts";

function run(cmd: string[], cwd?: string) {
    const isWindows = Deno.build.os === "windows";

    const command = isWindows
      ? new Deno.Command("cmd", {
          args: ["/c", ...cmd],
          cwd,
          stdout: "inherit",
          stderr: "inherit",
        })
      : new Deno.Command(cmd[0], {
          args: cmd.slice(1),
          cwd,
          stdout: "inherit",
          stderr: "inherit",
        });

    return command.output();
}

console.log("🚀 Building Vite bundle...");

// STEP 1 — Vite build
const vite = await run([Deno.execPath(), "task", "build"]);
if (!vite.success) {
    console.error("❌ Vite build failed");
    Deno.exit(1);
}

console.log("📦 Syncing Capacitor (Android)...");

// STEP 2 — Capacitor sync
const sync = await run(["npm", "exec", "--", "cap", "sync", "android"]);
if (!sync.success) {
    console.error("❌ Capacitor sync failed");
    Deno.exit(1);
}

console.log("🤖 Building APK (debug)...");

// STEP 3 — Gradle build
const gradleCmd =
    Deno.build.os === "windows"
      ? ["gradlew.bat", "assembleDebug"]
      : ["./gradlew", "assembleDebug"];

const gradle = await run(gradleCmd, "android");
if (!gradle.success) {
    console.error("❌ Gradle build failed");
    Deno.exit(1);
}

// STEP 4 — Copy APK to release folder
const apkSrc = join(
    Deno.cwd(),
    "android/app/build/outputs/apk/debug/app-debug.apk",
);

const outDir = join(Deno.cwd(), "release/android");
const apkDst = join(outDir, "suroimd-debug.apk");

await ensureDir(outDir);
await emptyDir(outDir);
await Deno.copyFile(apkSrc, apkDst);

console.log("✅ APK generated successfully!");
console.log(`📦 Output: ${apkDst}`);
