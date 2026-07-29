#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${HOME}/.nvm/versions/node/v22.23.1/bin/node"
BETTER_SQLITE3_PATH=""
CLEAN_MARVEEN_ROOT=""
TEST_LOG=""

usage() {
  cat <<'EOF'
Usage:
  verify-phase3.sh [--node-bin PATH] [--better-sqlite3-path PATH]
                   [--clean-marveen-root PATH]

Runs only temporary databases, loopback mock peers and a disposable child
service. It does not patch Marveen and does not install, stop, restart, enable
or disable any service.
EOF
}

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "PASS: $*"
}

cleanup() {
  [[ -z "${TEST_LOG}" ]] || rm -f "${TEST_LOG}"
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --node-bin)
      [[ $# -ge 2 ]] || fail "--node-bin requires a path"
      NODE_BIN="$2"
      shift 2
      ;;
    --better-sqlite3-path)
      [[ $# -ge 2 ]] || fail "--better-sqlite3-path requires a path"
      BETTER_SQLITE3_PATH="$2"
      shift 2
      ;;
    --clean-marveen-root)
      [[ $# -ge 2 ]] || fail "--clean-marveen-root requires a path"
      CLEAN_MARVEEN_ROOT="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
done

[[ -x "${NODE_BIN}" ]] || fail "Node binary is missing: ${NODE_BIN}"
NODE_VERSION="$("${NODE_BIN}" --version)"
[[ "${NODE_VERSION}" == v22.* ]] \
  || fail "Phase 3 requires Node 22, found ${NODE_VERSION}"
pass "Node runtime is ${NODE_VERSION}"

if [[ -z "${BETTER_SQLITE3_PATH}" ]]; then
  candidates=(
    "${SOURCE_ROOT}/node_modules/better-sqlite3"
    "${HOME}/bela-codex-preflight/bela-codex-bridge-0.2.1/node_modules/better-sqlite3"
    "${HOME}/bela-codex-preflight/bela-codex-bridge-0.1.8/node_modules/better-sqlite3"
    "${HOME}/.local/share/bela-codex-bridge/current/node_modules/better-sqlite3"
  )
  for candidate in "${candidates[@]}"; do
    if [[ -d "${candidate}" ]]; then
      BETTER_SQLITE3_PATH="${candidate}"
      break
    fi
  done
fi
[[ -n "${BETTER_SQLITE3_PATH}" && -d "${BETTER_SQLITE3_PATH}" ]] \
  || fail "Node 22 better-sqlite3 module was not found; pass --better-sqlite3-path"

NODE_OPTIONS=--no-warnings \
MARVEEN_CODEX_BRIDGE_BETTER_SQLITE3_PATH="${BETTER_SQLITE3_PATH}" \
  "${NODE_BIN}" -e '
    const Better = require(process.env.MARVEEN_CODEX_BRIDGE_BETTER_SQLITE3_PATH)
    const db = new Better(":memory:")
    const row = db.prepare("SELECT 1 AS ok").get()
    db.close()
    if (row.ok !== 1) process.exit(1)
  ' || fail "better-sqlite3 is not loadable by the fixed Node 22 runtime"
pass "production better-sqlite3 driver loads under Node 22"

required_files=(
  config/config.example.json
  migrations/001_federation_durability.sql
  migrations/002_inbox_orchestration.sql
  package-lock.json
  src/config.mjs
  src/durability-store.mjs
  src/inbox-orchestrator.mjs
  src/main.mjs
  src/runtime-loader.mjs
  src/service.mjs
  src/sqlite-driver.mjs
  systemd/marveen-codex-bridge-federation.service.in
  test/main-process.test.mjs
  test/service-e2e.test.mjs
  test/sqlite-driver-parity.test.mjs
)
for file in "${required_files[@]}"; do
  [[ -f "${SOURCE_ROOT}/${file}" ]] \
    || fail "required Phase 3 file is missing: ${file}"
done
pass "Phase 3 source, configuration and service surface is complete"

NODE_OPTIONS=--no-warnings "${NODE_BIN}" -e '
  const fs = require("node:fs")
  const path = require("node:path")
  const root = process.argv[1]
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json")))
  const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json")))
  const example = JSON.parse(fs.readFileSync(path.join(root, "config/config.example.json")))
  if (pkg.version !== "0.3.0-phase3.1") throw new Error("wrong package version")
  if (pkg.dependencies?.["better-sqlite3"] !== "11.10.0") {
    throw new Error("better-sqlite3 must be pinned")
  }
  if (lock.packages?.[""]?.dependencies?.["better-sqlite3"] !== "11.10.0") {
    throw new Error("lockfile does not pin better-sqlite3")
  }
  if (example.version !== 1 || example.systemId !== "codex") {
    throw new Error("invalid example config")
  }
' "${SOURCE_ROOT}" || fail "package lock or example configuration is invalid"
pass "dependency and example configuration metadata is pinned"

while IFS= read -r file; do
  NODE_OPTIONS=--no-warnings "${NODE_BIN}" --check "${file}" >/dev/null
done < <(find "${SOURCE_ROOT}/src" "${SOURCE_ROOT}/test" -type f -name '*.mjs' -print)
pass "all JavaScript modules pass Node syntax checking"

if rg -n \
  'systemctl|bela-start|tmux (kill|new)|(^|[[:space:]])patch([[:space:]]|$)' \
  -g '!verify-phase2.sh' -g '!verify-phase3.sh' \
  "${SOURCE_ROOT}/scripts" >/dev/null; then
  fail "verification scripts contain a forbidden live-system mutation command"
fi
pass "verification scripts contain no live service or Marveen mutation"

if [[ -n "${CLEAN_MARVEEN_ROOT}" ]]; then
  "${SOURCE_ROOT}/scripts/verify-marveen-contract.sh" \
    --marveen-root "${CLEAN_MARVEEN_ROOT}" \
    --strict-baseline \
    --node-bin "${NODE_BIN}"
  pass "clean Marveen 1.25.1 Federation baseline is compatible"
fi

TEST_LOG="$(mktemp)"
(
  cd "${SOURCE_ROOT}"
  MARVEEN_CODEX_BRIDGE_BETTER_SQLITE3_PATH="${BETTER_SQLITE3_PATH}" \
    NODE_OPTIONS=--no-warnings \
    "${NODE_BIN}" --test test/*.test.mjs
) | tee "${TEST_LOG}"
grep -Eq '^(#|ℹ) tests 65$' "${TEST_LOG}" \
  || fail "expected exactly 65 tests"
grep -Eq '^(#|ℹ) pass 65$' "${TEST_LOG}" \
  || fail "expected exactly 65 passing tests"
grep -Eq '^(#|ℹ) fail 0$' "${TEST_LOG}" \
  || fail "test failures were reported"
grep -Eq '^(#|ℹ) skipped 0$' "${TEST_LOG}" \
  || fail "tests were skipped"
grep -Eq '^(#|ℹ) cancelled 0$' "${TEST_LOG}" \
  || fail "tests were cancelled"
pass "all 65 Phase 1-3 tests pass with no skip"

echo "RESULT: PHASE 3 STANDALONE FEDERATION SERVICE PASS"
