#!/usr/bin/env python3
import subprocess
import sys
import shutil
import os.path
def run(cmd):
    print(">", " ".join(cmd))
    subprocess.check_call(cmd,cwd=os.path.dirname(os.path.dirname(__file__)))
def check(cmd):
    return shutil.which(cmd) is not None

# ----------------------------------------
# CHECK GO
# ----------------------------------------
if not check("go"):
    print("❌ Go not found in PATH")
    sys.exit(1)

print("✅ Go:", subprocess.check_output(["go", "version"]).decode().strip())

# ----------------------------------------
# INSTALL GO TOOLS (BINARIES)
# ----------------------------------------
print("📦 Installing Go tools...")

run([
    "go", "install",
    "github.com/cespare/reflex@latest"
])

# ----------------------------------------
# INSTALL GO LIBRARIES (MODULE DEPS)
# ----------------------------------------
print("📦 Installing Go libraries...")

run([
    "go", "get",
    "github.com/mattn/go-sqlite3@latest",
    "github.com/gorilla/mux@latest",
    "github.com/gorilla/websocket@latest"
])

print("✅ Go dependencies installed successfully.")
