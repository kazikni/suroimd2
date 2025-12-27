#!/usr/bin/env python3
import subprocess
import shutil
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANDROID_DIR = ROOT / "android"
RELEASE_DIR = ROOT / "release" / "android"

def run(cmd, cwd=None):
    print(">", " ".join(cmd))
    subprocess.check_call(cmd, cwd=cwd)

print("🚀 Building Vite bundle...")

# STEP 1 — Vite build
run(["deno", "task", "build"], cwd=ROOT)

print("📦 Syncing Capacitor (Android)...")

# STEP 2 - ICON
run(["npx", "@capacitor/assets", "generate", "--android", "--assetPath", "public"], cwd=ROOT)

# STEP 3 — Capacitor sync
run(["npm", "exec", "--", "cap", "sync", "android"], cwd=ROOT)

print("🤖 Building APK (debug)...")

# STEP 4 — Gradle build
gradle_cmd = ["gradlew.bat", "assembleDebug"] if os.name == "nt" else ["./gradlew", "assembleDebug"]
run(gradle_cmd, cwd=ANDROID_DIR)

# STEP 5 — Copy APK
apk_src = ANDROID_DIR / "app/build/outputs/apk/debug/app-debug.apk"
apk_dst = RELEASE_DIR / "suroimd-debug.apk"

RELEASE_DIR.mkdir(parents=True, exist_ok=True)

if apk_dst.exists():
    apk_dst.unlink()

shutil.copy(apk_src, apk_dst)

print("✅ APK generated successfully!")
print(f"📦 Output: {apk_dst}")
