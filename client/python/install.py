import subprocess
import sys
import shutil
import os.path
def run(cmd):
    print(">", " ".join(cmd))
    subprocess.check_call(cmd,cwd=os.path.dirname(os.path.dirname(__file__)))
def check(cmd):
    return shutil.which(cmd) is not None
if not check("node"):
    print("❌ Node.js not found in PATH")
    sys.exit(1)
if not check("npm"):
    print("❌ npm not found in PATH")
    sys.exit(1)
print("✅ Node:", subprocess.check_output(["node", "-v"]).decode().strip())
print("✅ npm:", subprocess.check_output(["npm", "-v"]).decode().strip())
print("📦 Installing project dependencies (no-save)...")
run([
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
    "npm", "install",
    "electron@31.3.0",
    "@electron/packager"
])
print("📦 Installing Capacitor deps...")
run([
    "npm", "install",
    "@capacitor/cli",
    "@capacitor/core",
    "@capacitor/android",
    "@capacitor/assets"
])
print("✅ All dependencies installed successfully.")