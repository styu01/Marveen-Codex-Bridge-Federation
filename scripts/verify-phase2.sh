#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${HOME}/.nvm/versions/node/v22.23.1/bin/node"
CLEAN_MARVEEN_ROOT=""
TEST_LOG=""

usage() {
  cat <<'EOF'
Usage:
  verify-phase2.sh [--node-bin PATH] [--clean-marveen-root PATH]

This command only uses temporary test databases and loopback mock servers.
It does not install, stop, restart, patch or configure any service.
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
[[ "${NODE_VERSION}" == v22.* ]] || fail "Phase 2 requires Node 22, found ${NODE_VERSION}"
pass "Node runtime is ${NODE_VERSION}"

required_files=(
  contracts/durability-v1.md
  contracts/federation-v1.md
  migrations/001_federation_durability.sql
  src/durability-store.mjs
  src/federation-contract.mjs
  src/outbox-delivery.mjs
  src/peer-config.mjs
  test/durability-store.test.mjs
  test/federation-contract.test.mjs
  test/outbox-delivery.test.mjs
)
for file in "${required_files[@]}"; do
  [[ -f "${SOURCE_ROOT}/${file}" ]] || fail "required Phase 2 file is missing: ${file}"
done
pass "Phase 2 source surface is complete"

rg -q "PRAGMA synchronous = FULL" "${SOURCE_ROOT}/src/durability-store.mjs" \
  || fail "SQLite FULL synchronous mode is missing"
rg -q "UNIQUE\\(peer_id, peer_ref\\)" \
  "${SOURCE_ROOT}/migrations/001_federation_durability.sql" \
  || fail "persistent inbox dedup constraint is missing"
rg -q "UNIQUE\\(peer_id, message_key\\)" \
  "${SOURCE_ROOT}/migrations/001_federation_durability.sql" \
  || fail "persistent outbox idempotency constraint is missing"
rg -q "lease_expires_at_ms" \
  "${SOURCE_ROOT}/migrations/001_federation_durability.sql" \
  || fail "outbox lease fields are missing"
rg -q "MAX_ACK_BODY_BYTES = 64 \\* 1024" \
  "${SOURCE_ROOT}/src/outbox-delivery.mjs" \
  || fail "bounded peer acknowledgement is missing"
pass "durability, lease and response-bound invariants are present"

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
  NODE_OPTIONS=--no-warnings "${NODE_BIN}" --test test/*.test.mjs
) | tee "${TEST_LOG}"
grep -Eq '^(#|ℹ) tests 42$' "${TEST_LOG}" \
  || fail "expected exactly 42 tests"
grep -Eq '^(#|ℹ) pass 42$' "${TEST_LOG}" \
  || fail "expected exactly 42 passing tests"
grep -Eq '^(#|ℹ) fail 0$' "${TEST_LOG}" \
  || fail "test failures were reported"
grep -Eq '^(#|ℹ) skipped 0$' "${TEST_LOG}" \
  || fail "skipped test count is missing"
grep -Eq '^(#|ℹ) cancelled 0$' "${TEST_LOG}" \
  || fail "cancelled test count is missing"
pass "Phase 1 and Phase 2 tests pass"

echo "RESULT: PHASE 2 FEDERATION DURABILITY PASS"
