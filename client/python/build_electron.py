import subprocess
import shutil
import json
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
ELECTRON = ROOT / "electron"
RELEASE = ROOT / "release"
RESOURCES = RELEASE / "resources"

def run(cmd, cwd=None):
    print(">", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd)

def copy_dir(src, dst):
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)

print("🚀 Building Vite bundle...")

# STEP 1 — Vite build
run(["deno", "task", "build"], cwd=ROOT)

print("📦 Preparing Electron package...")

# STEP 2 — Temp package.json
tmp_pkg = {
    "name": "suroimd2",
    "version": "1.0.0",
    "main": "electron/main.js",
    "author": {"name": "kaklik"},
    "description": "A .io Game",
    "type": "commonjs",
}

pkg_root = ROOT / "package.json"
pkg_release = RESOURCES / "package.json"

RELEASE.mkdir(exist_ok=True)
RESOURCES.mkdir(parents=True, exist_ok=True)

pkg_root.write_text(json.dumps(tmp_pkg, indent=2))
pkg_release.write_text(json.dumps(tmp_pkg, indent=2))

# STEP 3 — Copy resources
copy_dir(DIST, RESOURCES / "main")
copy_dir(ELECTRON, RESOURCES / "electron")

def build_electron(platform):
    print(f"⚡ Building Electron package for {platform}...")

    cmd = [
        "cmd", "/c",
        "npx", "@electron/packager",
        "./release/resources",
        "suroimd2",
        f"--platform={platform}",
        "--arch=x64",
        "--out=release",
        "--overwrite",
        "--icon=dist/favicon.ico",
        "--app-version=1.0.0",
        "--prune=true",
        "--no-asar",
        "--ignore=node_modules",
        "--ignore=deno.lock",
        "--ignore=deno.json",
        "--ignore=package-lock.json",
    ]

    run(cmd, cwd=ROOT)
    print(f"✅ Electron package for {platform} created!")

# STEP 4 — Run builds
build_electron("win32")
build_electron("linux")

# STEP 5 — Cleanup
pkg_root.unlink(missing_ok=True)

print("🧹 Cleaned up temporary files!")