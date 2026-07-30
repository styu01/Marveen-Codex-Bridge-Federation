#!/usr/bin/env bash
set -euo pipefail

VERSION="0.3.0-phase7.7"
SOURCE_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
NODE_BIN=""
CODEX_BIN=""
CONFIG_SOURCE=""
ACTIVATE=0
SKIP_DEPENDENCIES=0
SKIP_TESTS=0

usage() {
  cat <<'EOF'
Usage: install-phase7.sh --node-bin PATH --codex-bin PATH [options]

Options:
  --config-source PATH    Install an existing private Federation config.
  --activate              Activate and start the standalone service.
  --prepare-only          Install as candidate only (default).
  --skip-dependencies     Test-only: do not run npm ci.
  --skip-tests            Do not run the packaged mock verification.

The installer never reads or modifies the Marveen source tree.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --node-bin) NODE_BIN="${2:?missing Node path}"; shift 2 ;;
    --codex-bin) CODEX_BIN="${2:?missing Codex path}"; shift 2 ;;
    --config-source) CONFIG_SOURCE="${2:?missing config path}"; shift 2 ;;
    --activate) ACTIVATE=1; shift ;;
    --prepare-only) ACTIVATE=0; shift ;;
    --skip-dependencies) SKIP_DEPENDENCIES=1; shift ;;
    --skip-tests) SKIP_TESTS=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$(id -u)" -ne 0 ]] || { echo "Refusing root installation" >&2; exit 1; }
[[ -n "${HOME:-}" && "${HOME}" = /* && "${HOME}" != "/" ]] \
  || { echo "HOME must be an absolute non-root path" >&2; exit 1; }
[[ -x "${NODE_BIN}" ]] || { echo "--node-bin must be executable" >&2; exit 1; }
[[ -x "${CODEX_BIN}" ]] || { echo "--codex-bin must be executable" >&2; exit 1; }

NODE_REAL="$(readlink -f -- "${NODE_BIN}")"
CODEX_REAL="$(readlink -f -- "${CODEX_BIN}")"
[[ "$("${NODE_REAL}" --version)" == v22.* ]] \
  || { echo "Node 22 is required" >&2; exit 1; }
"${CODEX_REAL}" --version | grep -q '0\.145\.0' \
  || { echo "Codex CLI 0.145.0 is required" >&2; exit 1; }
"${CODEX_REAL}" login status 2>&1 | grep -q '^Logged in using' \
  || { echo "Codex ChatGPT login is required" >&2; exit 1; }

CONFIG_ROOT="${XDG_CONFIG_HOME:-${HOME}/.config}/marveen-codex-bridge"
STATE_ROOT="${XDG_STATE_HOME:-${HOME}/.local/state}/marveen-codex-bridge"
DATA_ROOT="${XDG_DATA_HOME:-${HOME}/.local/share}/marveen-codex-bridge"
SERVICE_ROOT="${XDG_CONFIG_HOME:-${HOME}/.config}/systemd/user"
RELEASES_ROOT="${DATA_ROOT}/releases"
RELEASE_ROOT="${RELEASES_ROOT}/${VERSION}"
CURRENT_LINK="${DATA_ROOT}/current"
CANDIDATE_LINK="${DATA_ROOT}/candidate"
PREVIOUS_LINK="${DATA_ROOT}/previous"
CONFIG_PATH="${CONFIG_ROOT}/config.json"
UNIT_PATH="${SERVICE_ROOT}/marveen-codex-bridge.service"
WORKSPACE_ROOT="${DATA_ROOT}/agents/programozo"
RUNTIME_ROOT="${DATA_ROOT}/runtime"
DATABASE_PATH="${STATE_ROOT}/federation.sqlite3"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"

[[ "${CODEX_HOME}" = /* && "${CODEX_HOME}" != "/" ]] \
  || { echo "CODEX_HOME must be an absolute non-root path" >&2; exit 1; }
case "${CODEX_HOME}" in
  "${HOME}"/*) ;;
  *) echo "CODEX_HOME must stay inside HOME" >&2; exit 1 ;;
esac
if [[ -e "${CODEX_HOME}" || -L "${CODEX_HOME}" ]]; then
  [[ -d "${CODEX_HOME}" && ! -L "${CODEX_HOME}" ]] \
    || { echo "CODEX_HOME must be a real directory, not a symlink" >&2; exit 1; }
else
  install -d -m 0700 "${CODEX_HOME}"
fi
chmod go-rwx "${CODEX_HOME}"

install -d -m 0700 \
  "${CONFIG_ROOT}" "${STATE_ROOT}" "${DATA_ROOT}" "${RELEASES_ROOT}" \
  "${SERVICE_ROOT}" "${WORKSPACE_ROOT}" "${RUNTIME_ROOT}"

STAGE="$(mktemp -d "${RELEASES_ROOT}/.${VERSION}.stage.XXXXXX")"
cleanup() {
  if [[ -n "${STAGE:-}" && -d "${STAGE}" ]]; then
    rm -rf -- "${STAGE}"
  fi
}
trap cleanup EXIT

tar --exclude='./node_modules' --exclude='./.git' -C "${SOURCE_ROOT}" -cf - . \
  | tar -C "${STAGE}" -xf -

if [[ "${SKIP_DEPENDENCIES}" -eq 0 ]]; then
  NPM_CLI="$(readlink -f -- "$(dirname -- "${NODE_REAL}")/../lib/node_modules/npm/bin/npm-cli.js")"
  [[ -f "${NPM_CLI}" ]] || { echo "npm CLI belonging to Node 22 is required" >&2; exit 1; }
  (
    cd "${STAGE}"
    PATH="$(dirname -- "${NODE_REAL}"):${PATH}" \
      "${NODE_REAL}" "${NPM_CLI}" ci --omit=dev --no-audit --no-fund
  )
fi

if [[ "${SKIP_TESTS}" -eq 0 ]]; then
  [[ -d "${STAGE}/node_modules/better-sqlite3" ]] \
    || { echo "better-sqlite3 is missing from staged release" >&2; exit 1; }
  "${STAGE}/scripts/verify-phase7.sh" \
    --node-bin "${NODE_REAL}" \
    --better-sqlite3-path "${STAGE}/node_modules/better-sqlite3" \
    --mock-only
fi

if [[ -e "${RELEASE_ROOT}" ]]; then
  [[ -f "${RELEASE_ROOT}/package.json" ]] \
    || { echo "Existing release target is invalid" >&2; exit 1; }
  INSTALLED_VERSION="$("${NODE_REAL}" -p \
    "JSON.parse(require('fs').readFileSync(process.argv[1])).version" \
    "${RELEASE_ROOT}/package.json")"
  [[ "${INSTALLED_VERSION}" == "${VERSION}" ]] \
    || { echo "Existing release has the wrong version" >&2; exit 1; }
else
  chmod -R go-rwx "${STAGE}"
  mv -- "${STAGE}" "${RELEASE_ROOT}"
  STAGE=""
fi

if [[ -n "${CONFIG_SOURCE}" ]]; then
  [[ -f "${CONFIG_SOURCE}" && ! -L "${CONFIG_SOURCE}" ]] \
    || { echo "Config source must be a regular non-symlink file" >&2; exit 1; }
  install -m 0600 "${CONFIG_SOURCE}" "${CONFIG_PATH}"
elif [[ ! -f "${CONFIG_PATH}" ]]; then
  umask 077
  "${NODE_REAL}" -e \
    "const {randomBytes}=require('crypto');process.stdout.write(randomBytes(32).toString('hex')+'\\n')" \
    > "${CONFIG_ROOT}/admin.token"
  "${NODE_REAL}" -e \
    "const {randomBytes}=require('crypto');process.stdout.write(randomBytes(32).toString('hex')+'\\n')" \
    > "${CONFIG_ROOT}/marveen-inbound.token"
  "${NODE_REAL}" -e \
    "const {randomBytes}=require('crypto');process.stdout.write(randomBytes(32).toString('hex')+'\\n')" \
    > "${CONFIG_ROOT}/marveen-outbound.token"
  chmod 0600 "${CONFIG_ROOT}"/*.token
  cat > "${CONFIG_PATH}" <<EOF
{
  "version": 1,
  "systemId": "codex",
  "listen": {"host": "127.0.0.1", "port": 3431},
  "storage": {"database": "${DATABASE_PATH}"},
  "codex": {
    "binary": "${CODEX_REAL}",
    "expectedVersion": "0.145.0",
    "runtimeRoot": "${RUNTIME_ROOT}",
    "imageGenerationRequired": true,
    "imageModel": "gpt-image-2"
  },
  "admin": {"tokenFile": "${CONFIG_ROOT}/admin.token"},
  "agents": [{
    "id": "programozo",
    "displayName": "Codex programozó",
    "model": "gpt-5.6-terra",
    "capabilitySummary": "Programozás, webfejlesztés, marketing és képgenerálás.",
    "workspacePath": "${WORKSPACE_ROOT}",
    "sandboxMode": "workspace-write",
    "approvalPolicy": "manual",
    "federationPeer": "marveen",
    "reasoningEffort": "high",
    "networkEnabled": false
  }],
  "peers": [{
    "id": "marveen",
    "baseUrl": "http://127.0.0.1:3420",
    "inboundTokenFile": "${CONFIG_ROOT}/marveen-inbound.token",
    "outboundTokenFile": "${CONFIG_ROOT}/marveen-outbound.token"
  }],
  "workers": {"intervalMs": 250}
}
EOF
  chmod 0600 "${CONFIG_PATH}"
  {
    printf 'FEDERATION_PEER_ID=codex\n'
    printf 'FEDERATION_BASE_URL=http://127.0.0.1:3431\n'
    printf 'MARVEEN_TO_CODEX_TOKEN='
    tr -d '\n' < "${CONFIG_ROOT}/marveen-inbound.token"
    printf '\nCODEX_TO_MARVEEN_TOKEN='
    tr -d '\n' < "${CONFIG_ROOT}/marveen-outbound.token"
    printf '\n'
  } > "${CONFIG_ROOT}/marveen-pairing.env"
  chmod 0600 "${CONFIG_ROOT}/marveen-pairing.env"
fi

chmod 0600 "${CONFIG_PATH}"
"${NODE_REAL}" --input-type=module - \
  "${RELEASE_ROOT}/src/config.mjs" "${CONFIG_PATH}" "${STATE_ROOT}" "${DATA_ROOT}" <<'NODE'
import { pathToFileURL } from 'node:url'
import { relative } from 'node:path'

const [, , modulePath, configPath, stateRoot, dataRoot] = process.argv
const { loadServiceConfig } = await import(pathToFileURL(modulePath))
const config = loadServiceConfig(configPath)
const inside = (root, candidate) => {
  const rel = relative(root, candidate)
  return rel !== '' && !rel.startsWith('..') && !rel.startsWith('/')
}
if (!inside(stateRoot, config.storage.database)) {
  throw new Error('storage.database must stay inside the Bridge state root')
}
if (!inside(dataRoot, config.codex.runtimeRoot)) {
  throw new Error('codex.runtimeRoot must stay inside the Bridge data root')
}
for (const agent of config.agents) {
  if (!inside(dataRoot, agent.workspacePath)) {
    throw new Error(`agent '${agent.id}' workspace must stay inside the Bridge data root`)
  }
}
NODE

ln -sfn "${RELEASE_ROOT}" "${CANDIDATE_LINK}.new"
mv -Tf "${CANDIDATE_LINK}.new" "${CANDIDATE_LINK}"

sed \
  -e "s|@NODE_BIN@|${NODE_REAL}|g" \
  -e "s|@RELEASE_ROOT@|${RELEASE_ROOT}|g" \
  -e "s|@CONFIG_PATH@|${CONFIG_PATH}|g" \
  -e "s|@BETTER_SQLITE3_PATH@|${RELEASE_ROOT}/node_modules/better-sqlite3|g" \
  -e "s|@STATE_ROOT@|${STATE_ROOT}|g" \
  -e "s|@DATA_ROOT@|${DATA_ROOT}|g" \
  -e "s|@CODEX_HOME@|${CODEX_HOME}|g" \
  "${RELEASE_ROOT}/systemd/marveen-codex-bridge-federation.service.in" \
  > "${UNIT_PATH}.new"
chmod 0600 "${UNIT_PATH}.new"
mv -f "${UNIT_PATH}.new" "${UNIT_PATH}"

if [[ "${ACTIVATE}" -eq 0 ]]; then
  echo "RESULT: PHASE 7 PREPARED (NOT ACTIVATED)"
  echo "Candidate: ${CANDIDATE_LINK}"
  echo "Pairing file: ${CONFIG_ROOT}/marveen-pairing.env"
  exit 0
fi

command -v systemctl >/dev/null || { echo "systemctl is required for activation" >&2; exit 1; }
if systemctl --user is-active --quiet bela-codex-bridge.service; then
  echo "Legacy bela-codex-bridge.service is active; refusing dual runtime activation" >&2
  exit 1
fi

OLD_TARGET=""
if [[ -L "${CURRENT_LINK}" ]]; then OLD_TARGET="$(readlink -f -- "${CURRENT_LINK}")"; fi
if [[ -n "${OLD_TARGET}" ]]; then
  ln -sfn "${OLD_TARGET}" "${PREVIOUS_LINK}.new"
  mv -Tf "${PREVIOUS_LINK}.new" "${PREVIOUS_LINK}"
fi
ln -sfn "${RELEASE_ROOT}" "${CURRENT_LINK}.new"
mv -Tf "${CURRENT_LINK}.new" "${CURRENT_LINK}"

systemctl --user daemon-reload
systemctl --user enable --now marveen-codex-bridge.service

READY=0
for _ in {1..45}; do
  if curl --silent --fail http://127.0.0.1:3431/readyz \
    | grep -q '"status":"ready"'; then
    READY=1
    break
  fi
  sleep 2
done

if [[ "${READY}" -ne 1 ]]; then
  echo "New service did not become ready; rolling back release pointer" >&2
  systemctl --user stop marveen-codex-bridge.service || true
  if [[ -n "${OLD_TARGET}" ]]; then
    ln -sfn "${OLD_TARGET}" "${CURRENT_LINK}.new"
    mv -Tf "${CURRENT_LINK}.new" "${CURRENT_LINK}"
    systemctl --user restart marveen-codex-bridge.service || true
  fi
  exit 1
fi

echo "RESULT: PHASE 7 STANDALONE SERVICE ACTIVE"
echo "Dashboard: http://127.0.0.1:3431/dashboard"
