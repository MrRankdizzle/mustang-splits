#!/bin/bash
# One-time setup for the tests (nothing here is part of the app): npm packages, and a Java runtime for the
# Firebase emulator if this Mac has none (downloaded into tests/.jdk, which git ignores), and WebKit for e2e34.
# Needs Node and Chrome.
set -e; T=$(cd "$(dirname "$0")" && pwd); cd "$T"
npm ci
npx playwright-core install webkit # 3.6.1: Safari's engine, for the tile layout suite (e2e34) and its screenshots
if ! java -version >/dev/null 2>&1 && ! ls -d "$T"/.jdk/*/Contents/Home >/dev/null 2>&1; then
  ARCH=$(uname -m); [ "$ARCH" = "arm64" ] && ARCH=aarch64 || ARCH=x64
  echo "Downloading a Java 21 runtime (Eclipse Temurin) for the Firebase emulator..."
  curl -fL "https://api.adoptium.net/v3/binary/latest/21/ga/mac/$ARCH/jre/hotspot/normal/eclipse" -o "$T/.jdk.tgz"
  mkdir -p "$T/.jdk" && tar -xzf "$T/.jdk.tgz" -C "$T/.jdk" && rm "$T/.jdk.tgz"
fi
echo "Ready. Run ./run.sh"
