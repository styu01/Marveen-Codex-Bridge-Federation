import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

test('Phase 7 prepare-only installer creates an isolated candidate and never touches Marveen', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'phase7-installer-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const home = join(root, 'home')
  const bin = join(root, 'bin')
  const marveen = join(home, 'marveen')
  mkdirSync(home)
  mkdirSync(bin)
  mkdirSync(marveen)
  const sentinel = join(marveen, 'DO-NOT-TOUCH')
  writeFileSync(sentinel, 'marveen-source-unchanged\n')

  const fakeCodex = join(bin, 'codex')
  writeFileSync(fakeCodex, `#!/usr/bin/env bash
if [[ "\${1:-}" == "--version" ]]; then echo "codex-cli 0.145.0"; exit 0; fi
if [[ "\${1:-}" == "login" && "\${2:-}" == "status" ]]; then
  echo "Logged in using ChatGPT"; exit 0
fi
exit 1
`)
  chmodSync(fakeCodex, 0o755)
  const fakeNode = join(bin, 'node22')
  writeFileSync(fakeNode, `#!/usr/bin/env bash
if [[ "\${1:-}" == "--version" ]]; then echo "v22.23.1"; exit 0; fi
exec "${process.execPath}" "$@"
`)
  chmodSync(fakeNode, 0o755)
  const fakeId = join(bin, 'id')
  writeFileSync(fakeId, `#!/usr/bin/env bash
if [[ "\${1:-}" == "-u" ]]; then echo "1000"; exit 0; fi
exec /usr/bin/id "$@"
`)
  chmodSync(fakeId, 0o755)

  const result = spawnSync('bash', [
    resolve('scripts/install-phase7.sh'),
    '--node-bin', fakeNode,
    '--codex-bin', fakeCodex,
    '--prepare-only',
    '--skip-dependencies',
    '--skip-tests',
  ], {
    cwd: resolve('.'),
    env: {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: join(home, '.config'),
      XDG_STATE_HOME: join(home, '.local/state'),
      XDG_DATA_HOME: join(home, '.local/share'),
      PATH: `${bin}:${process.env.PATH}`,
    },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stdout, /PHASE 7 PREPARED \(NOT ACTIVATED\)/)
  assert.equal(readFileSync(sentinel, 'utf8'), 'marveen-source-unchanged\n')

  const data = join(home, '.local/share/marveen-codex-bridge')
  const candidate = join(data, 'candidate')
  assert.equal(lstatSync(candidate).isSymbolicLink(), true)
  assert.match(readlinkSync(candidate), /0\.3\.0-phase7\.0$/)
  assert.equal(existsSync(join(data, 'current')), false)
  assert.equal(
    JSON.parse(readFileSync(join(
      data,
      'releases/0.3.0-phase7.0/package.json',
    ))).version,
    '0.3.0-phase7.0',
  )
  const configRoot = join(home, '.config/marveen-codex-bridge')
  assert.equal(lstatSync(join(configRoot, 'config.json')).mode & 0o777, 0o600)
  assert.equal(lstatSync(join(configRoot, 'marveen-pairing.env')).mode & 0o777, 0o600)
  assert.doesNotMatch(
    readFileSync(join(home, '.config/systemd/user/marveen-codex-bridge.service'), 'utf8'),
    /bela-codex-bridge/,
  )
})

test('Phase 7 dependency lifecycle PATH is pinned to the selected Node 22 bin', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'phase7-node-path-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const home = join(root, 'home')
  const commandBin = join(root, 'commands')
  const nodeBin = join(root, 'node22/bin')
  const npmDir = join(root, 'node22/lib/node_modules/npm/bin')
  mkdirSync(home, { recursive: true })
  mkdirSync(commandBin, { recursive: true })
  mkdirSync(nodeBin, { recursive: true })
  mkdirSync(npmDir, { recursive: true })

  const nodeWrapper = join(nodeBin, 'node')
  writeFileSync(nodeWrapper, `#!/usr/bin/env bash
if [[ "\${1:-}" == "--version" ]]; then echo "v22.23.1"; exit 0; fi
exec "${process.execPath}" "$@"
`)
  chmodSync(nodeWrapper, 0o755)
  const pathCapture = join(root, 'npm-path.txt')
  writeFileSync(join(npmDir, 'npm-cli.js'), `
require('node:fs').writeFileSync(process.env.PHASE6_PATH_CAPTURE, process.env.PATH)
`)

  const fakeCodex = join(commandBin, 'codex')
  writeFileSync(fakeCodex, `#!/usr/bin/env bash
if [[ "\${1:-}" == "--version" ]]; then echo "codex-cli 0.145.0"; exit 0; fi
if [[ "\${1:-}" == "login" && "\${2:-}" == "status" ]]; then
  echo "Logged in using ChatGPT"; exit 0
fi
exit 1
`)
  chmodSync(fakeCodex, 0o755)
  const fakeId = join(commandBin, 'id')
  writeFileSync(fakeId, `#!/usr/bin/env bash
if [[ "\${1:-}" == "-u" ]]; then echo "1000"; exit 0; fi
exec /usr/bin/id "$@"
`)
  chmodSync(fakeId, 0o755)

  const result = spawnSync('bash', [
    resolve('scripts/install-phase7.sh'),
    '--node-bin', nodeWrapper,
    '--codex-bin', fakeCodex,
    '--prepare-only',
    '--skip-tests',
  ], {
    cwd: resolve('.'),
    env: {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: join(home, '.config'),
      XDG_STATE_HOME: join(home, '.local/state'),
      XDG_DATA_HOME: join(home, '.local/share'),
      PATH: `${commandBin}:${process.env.PATH}`,
      PHASE6_PATH_CAPTURE: pathCapture,
    },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.equal(readFileSync(pathCapture, 'utf8').split(':')[0], nodeBin)
})
