#!/bin/bash
# Runs every test suite against this repo: ./run.sh            (all suites)
#                                         ./run.sh e2e8.js     (one or more)
# Serves the app on :8765, starts the Firebase emulators (Firestore :8181, Auth :9099), clears them between
# suites, and prints each suite's result. Exits non-zero if any suite fails. One-time setup: ./setup.sh
T=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$T/.." && pwd)
SUITES=${@:-"rules.test.mjs team-tab.js e2e1.js e2e2.js e2e3.js e2e4.js e2e5.js e2e6.js e2e7.js e2e8.js e2e9.js e2e10.js e2e11.js e2e12.js e2e13.js e2e14.js e2e15.js e2e16.js e2e17.js e2e18.js e2e19.js e2e20.js e2e21.js e2e22.js e2e23.js e2e24.js e2e25.js"}
if [ -x "$T/.jdk/Contents/Home/bin/java" ]; then export JAVA_HOME="$T/.jdk/Contents/Home"; else J=$(ls -d "$T"/.jdk/*/Contents/Home 2>/dev/null | head -1); [ -n "$J" ] && export JAVA_HOME="$J"; fi
[ -n "$JAVA_HOME" ] && export PATH="$JAVA_HOME/bin:$PATH"
export PATH="$T/node_modules/.bin:$PATH"
java -version >/dev/null 2>&1 || { echo "No Java runtime for the Firebase emulator. Run ./setup.sh first."; exit 2; }
mkdir -p "$T/out/shots"
cp "$REPO/firestore.rules" "$T/out/firestore.rules" # the emulator loads the repo's current rules (firebase-tools needs them inside tests/)
(cd "$REPO" && exec python3 -m http.server 8765 >/dev/null 2>&1) & SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
cat > "$T/out/inner.sh" <<IN
#!/bin/bash
cd "$T"; fail=0
for s in $SUITES; do
  [ -f "\$s" ] || { echo "===== \$s: not found"; fail=1; continue; }
  curl -s -X DELETE "http://127.0.0.1:8181/emulator/v1/projects/mustang-splits/databases/(default)/documents" >/dev/null
  curl -s -X DELETE "http://127.0.0.1:9099/emulator/v1/projects/mustang-splits/accounts" >/dev/null
  echo "===== \$s"; node "\$s" "$T/out" > "$T/out/\$s.log" 2>&1; c=\$?
  grep -h "^[0-9]*/[0-9]* passed\|^all passed\|FAIL\|CRASH" "$T/out/\$s.log" | head -20
  echo "== exit \$c"; [ \$c -ne 0 ] && fail=1
done
echo; [ \$fail -eq 0 ] && echo "ALL SUITES PASSED" || echo "SOME SUITES FAILED (logs in tests/out/)"
exit \$fail
IN
chmod +x "$T/out/inner.sh"
cd "$T" && firebase emulators:exec --project mustang-splits --only firestore,auth "$T/out/inner.sh" 2>&1 | grep -v "^i \|^⚠\|^✔\|^$\|emulators:\|Shutting\|Stopping\|functions\|Running script\|firestore-debug"
exit ${PIPESTATUS[0]}
