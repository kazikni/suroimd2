import subprocess
import sys
import shutil
import os.path
def run(cmd):
    print(">", " ".join(cmd))
    subprocess.run(cmd,cwd=os.path.dirname(os.path.dirname(__file__)))
def check(cmd):
    return shutil.which(cmd) is not None
if not check("node"):
    print("❌ Node.js not found in PATH")
    sys.exit(1)
print("📦 Installing project dependencies (no-save)...")
run([
    "cmd", "/c",
    "npm", "install",
    "vite",
    "@sveltejs/vite-plugin-svelte",
    "fdir",
    "sass",
    "canvas",
    "maxrects-packer",
    "minimatch",
    "types",
    "semver"
])
print("📦 Installing Electron deps...")
run([
    "cmd", "/c",
    "npm", "install",
    "electron@31.3.0",
    "@electron/packager"
])
print("📦 Installing Capacitor deps...")
run([
    "cmd", "/c",
    "npm", "install",
    "@capacitor/cli",
    "@capacitor/core",
    "@capacitor/android",
    "@capacitor/assets"
])
print("✅ All dependencies installed successfully.")