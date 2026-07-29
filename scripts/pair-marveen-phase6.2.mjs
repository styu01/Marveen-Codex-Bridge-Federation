#!/usr/bin/env node
import { homedir } from 'node:os'
import { join } from 'node:path'
import { stageMarveenPairing } from '../src/marveen-pairing.mjs'

const home = homedir()
const defaults = {
  marveenOrigin: 'http://127.0.0.1:3420',
  dashboardTokenFile: join(home, 'marveen/store/.dashboard-token'),
  bridgeInboundTokenFile: join(home, '.config/marveen-codex-bridge/marveen-inbound.token'),
  bridgeOutboundTokenFile: join(home, '.config/marveen-codex-bridge/marveen-outbound.token'),
  stateFile: join(home, '.local/state/marveen-codex-bridge/pairing/phase6.2.json'),
  execute: false,
}

function usage() {
  console.log(`Usage:
  pair-marveen-phase6.2.mjs [options]

Options:
  --marveen-origin URL
  --dashboard-token-file PATH
  --bridge-inbound-token-file PATH
  --bridge-outbound-token-file PATH
  --state-file PATH
  --execute

Without --execute this is a read-only preflight. The execute mode creates one
disabled Marveen Federation peer through the public dashboard API and writes
the Marveen-minted return token into the Bridge private configuration. It
never enables Federation, restarts a service, or edits Marveen source.`)
}

const options = { ...defaults }
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index]
  const take = () => {
    index += 1
    if (index >= process.argv.length) throw new Error(`${arg} requires a value`)
    return process.argv[index]
  }
  if (arg === '--marveen-origin') options.marveenOrigin = take()
  else if (arg === '--dashboard-token-file') options.dashboardTokenFile = take()
  else if (arg === '--bridge-inbound-token-file') options.bridgeInboundTokenFile = take()
  else if (arg === '--bridge-outbound-token-file') options.bridgeOutboundTokenFile = take()
  else if (arg === '--state-file') options.stateFile = take()
  else if (arg === '--execute') options.execute = true
  else if (arg === '--help') {
    usage()
    process.exit(0)
  } else throw new Error(`Unknown option: ${arg}`)
}

try {
  const result = await stageMarveenPairing(options)
  if (result.status === 'preflight') {
    console.log('PASS: clean Marveen Federation API is reachable and peer id is available')
    console.log('RESULT: PHASE 6.2 PAIRING PREFLIGHT PASS (NO MUTATION)')
  } else {
    console.log('PASS: Marveen peer was created through the public Federation API')
    console.log('PASS: bidirectional tokens are present and Marveen Federation remains disabled')
    console.log('PASS: Marveen source and services were not modified by the pairing step')
    console.log('RESULT: PHASE 6.2 PAIRED BUT DISABLED (NOT CUT OVER)')
  }
} catch (error) {
  console.error(`FAIL: ${error?.message ?? String(error)}`)
  process.exitCode = 1
}
