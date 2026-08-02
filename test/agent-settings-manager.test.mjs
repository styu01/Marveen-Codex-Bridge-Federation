import assert from 'node:assert/strict'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { AgentSettingsManager } from '../src/agent-settings-manager.mjs'
import { loadServiceConfig } from '../src/config.mjs'
import { CodexAppServerRuntime } from '../src/codex-app-server-runtime.mjs'

function privateFile(path, value) {
  writeFileSync(path, value, { mode: 0o600 })
  chmodSync(path, 0o600)
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'bridge-agent-settings-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const workspace = join(root, 'workspace')
  mkdirSync(workspace, { mode: 0o700 })
  privateFile(join(root, 'admin.token'), 'a'.repeat(40))
  privateFile(join(root, 'inbound.token'), 'b'.repeat(40))
  privateFile(join(root, 'outbound.token'), 'c'.repeat(40))
  const configPath = join(root, 'config.json')
  privateFile(configPath, `${JSON.stringify({
    version: 1,
    systemId: 'codex',
    listen: { host: '127.0.0.1', port: 3431 },
    storage: { database: './state.sqlite3' },
    codex: {
      binary: process.execPath,
      expectedVersion: '0.145.0',
      runtimeRoot: workspace,
      imageGenerationRequired: false,
    },
    admin: { tokenFile: './admin.token' },
    agents: [{
      id: 'programozo',
      displayName: 'Codex programozó',
      model: 'gpt-5.6-terra',
      workspacePath: workspace,
      sandboxMode: 'workspace-write',
      approvalPolicy: 'manual',
      reasoningEffort: 'high',
      developerInstructions: 'Eredeti fejlesztői szerepkör.',
      federationPeer: 'marveen',
    }],
    peers: [{
      id: 'marveen',
      baseUrl: 'http://127.0.0.1:3420',
      inboundTokenFile: './inbound.token',
      outboundTokenFile: './outbound.token',
    }],
  }, null, 2)}\n`)
  const config = loadServiceConfig(configPath)
  const calls = []
  const runtime = {
    async reconfigureAgent(agent) {
      calls.push(structuredClone(agent))
    },
  }
  const manager = new AgentSettingsManager({
    configPath,
    config,
    runtime,
    clock: () => 1_785_600_000_000 + calls.length,
  })
  return { root, configPath, config, runtime, calls, manager }
}

test('settings update is atomic, private, audited and restarts with a new role', async (t) => {
  const env = fixture(t)
  const result = await env.manager.update({
    actor: 'Istvan',
    developerInstructions: 'Marketingstratéga szerepkör, ellenőrzött utasításokkal.',
    reasoningEffort: 'xhigh',
    confirm: true,
  })
  assert.equal(result.settings.reasoningEffort, 'xhigh')
  assert.equal(result.settings.developerInstructions, 'Marketingstratéga szerepkör, ellenőrzött utasításokkal.')
  assert.equal(env.calls.length, 1)
  assert.equal(env.calls[0].reasoningEffort, 'xhigh')
  assert.equal(env.config.agents[0].reasoningEffort, 'xhigh')
  assert.equal(JSON.parse(readFileSync(env.configPath)).agents[0].reasoningEffort, 'xhigh')
  assert.equal(env.manager.backups().length, 1)
  const audit = env.manager.audit()
  assert.equal(audit.length, 1)
  assert.equal(audit[0].actor, 'Istvan')
  assert.equal(audit[0].authenticatedAs, 'admin-token')
  assert.equal(audit[0].changes.reasoningEffort.before, 'high')
  assert.doesNotMatch(JSON.stringify(audit), /Marketingstratéga|Eredeti fejlesztői/)
})

test('empty roles, invalid efforts and missing confirmation fail without mutation', async (t) => {
  const env = fixture(t)
  const before = readFileSync(env.configPath)
  await assert.rejects(
    env.manager.update({ actor: 'Istvan', developerInstructions: '  ', reasoningEffort: 'high', confirm: true }),
    { code: 'invalid_developer_instructions' },
  )
  await assert.rejects(
    env.manager.update({ actor: 'Istvan', developerInstructions: 'Szerep', reasoningEffort: 'ultra', confirm: true }),
    { code: 'invalid_reasoning_effort' },
  )
  await assert.rejects(
    env.manager.update({ actor: 'Istvan', developerInstructions: 'Szerep', reasoningEffort: 'low' }),
    { code: 'confirmation_required' },
  )
  await assert.rejects(
    env.manager.update({
      actor: 'Istvan',
      developerInstructions: 'Eredeti fejlesztői szerepkör.',
      reasoningEffort: 'high',
      confirm: true,
    }),
    { code: 'no_change' },
  )
  assert.deepEqual(readFileSync(env.configPath), before)
  assert.equal(env.calls.length, 0)
  assert.deepEqual(env.manager.audit(), [])
})

test('restore returns to the previous settings and creates an undo backup', async (t) => {
  const env = fixture(t)
  await env.manager.update({
    actor: 'Istvan',
    developerInstructions: 'Új szerepkör.',
    reasoningEffort: 'low',
    confirm: true,
  })
  const restored = await env.manager.restore({ actor: 'Istvan', confirm: true })
  assert.equal(restored.settings.developerInstructions, 'Eredeti fejlesztői szerepkör.')
  assert.equal(restored.settings.reasoningEffort, 'high')
  assert.equal(env.calls.length, 2)
  assert.equal(env.manager.backups().length, 2)
  assert.equal(env.manager.audit()[0].action, 'restore')
})

test('runtime restart failure restores the configuration and records failure', async (t) => {
  const env = fixture(t)
  env.runtime.reconfigureAgent = async () => {
    const error = new Error('restart failed')
    error.code = 'runtime_restart_failed'
    throw error
  }
  const before = readFileSync(env.configPath)
  await assert.rejects(env.manager.update({
    actor: 'Istvan',
    developerInstructions: 'Nem maradhat meg.',
    reasoningEffort: 'medium',
    confirm: true,
  }), { code: 'runtime_restart_failed' })
  assert.deepEqual(readFileSync(env.configPath), before)
  assert.equal(env.config.agents[0].reasoningEffort, 'high')
  assert.equal(env.manager.audit()[0].outcome, 'failed_rolled_back')
})

test('runtime reconfiguration invalidates the old thread and starts a new generation', async () => {
  const original = { id: 'programozo', reasoningEffort: 'high', developerInstructions: 'Régi' }
  const next = { id: 'programozo', reasoningEffort: 'xhigh', developerInstructions: 'Új' }
  const runtime = new CodexAppServerRuntime({
    config: { agents: [original] },
    environment: {},
  })
  const invalidated = []
  runtime.state = { invalidateThread: (agentId) => invalidated.push(agentId) }
  runtime.approvals = { list: () => [] }
  let restarts = 0
  runtime.stop = async () => {}
  runtime.start = async () => { restarts += 1; runtime.generation = restarts }
  const result = await runtime.reconfigureAgent(next)
  assert.deepEqual(invalidated, ['programozo'])
  assert.equal(restarts, 1)
  assert.equal(runtime.agents.get('programozo').reasoningEffort, 'xhigh')
  assert.deepEqual(result, { agentId: 'programozo', generation: 1 })
})

test('failed runtime reconfiguration restores the previous agent without invalidating its thread', async () => {
  const original = { id: 'programozo', reasoningEffort: 'high', developerInstructions: 'Régi' }
  const next = { id: 'programozo', reasoningEffort: 'xhigh', developerInstructions: 'Új' }
  const runtime = new CodexAppServerRuntime({
    config: { agents: [original] },
    environment: {},
  })
  const invalidated = []
  runtime.state = { invalidateThread: (agentId) => invalidated.push(agentId) }
  runtime.approvals = { list: () => [] }
  runtime.stop = async () => {}
  let starts = 0
  runtime.start = async () => {
    starts += 1
    if (starts === 1) throw Object.assign(new Error('new model failed'), {
      code: 'model_unavailable',
    })
  }
  await assert.rejects(runtime.reconfigureAgent(next), { code: 'model_unavailable' })
  assert.equal(starts, 2)
  assert.deepEqual(invalidated, [])
  assert.equal(runtime.agents.get('programozo').reasoningEffort, 'high')
})

test('runtime reconfiguration refuses active work and pending approval', async () => {
  const original = { id: 'programozo', reasoningEffort: 'high', developerInstructions: 'Régi' }
  const runtime = new CodexAppServerRuntime({
    config: { agents: [original] },
    environment: {},
  })
  runtime.activeAgents.add('programozo')
  await assert.rejects(runtime.reconfigureAgent(original), { code: 'runtime_busy' })
  runtime.activeAgents.clear()
  runtime.approvals = { list: () => [{ approvalId: 'pending' }] }
  await assert.rejects(runtime.reconfigureAgent(original), { code: 'approval_pending' })
})
