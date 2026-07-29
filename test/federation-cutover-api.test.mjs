import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import {
  CutoverApiError,
  disableFederation,
  enableFederation,
  normalizeLoopbackOrigin,
  preflightFederation,
  runFederationCanary,
} from '../src/federation-cutover-api.mjs'

function mockFederation({ paired = true } = {}) {
  const state = {
    enabled: false,
    routingMode: 'catalog-first',
    systemId: 'bela',
    peers: paired ? [{ id: 'codex' }] : [],
    calls: [],
  }
  const request = async (path, init = {}) => {
    state.calls.push({ path, ...init })
    if (path === '/api/federation/peers') {
      return {
        enabled: state.enabled,
        routingMode: state.routingMode,
        systemId: state.systemId,
        peers: state.peers,
      }
    }
    if (path === '/api/federation/routing-mode') {
      state.routingMode = init.body.mode
      return { ok: true }
    }
    if (path === '/api/federation/enabled') {
      state.enabled = init.body.enabled
      return { ok: true }
    }
    if (path === '/api/federation/apply') return { ok: true }
    throw new Error(`unexpected path ${path}`)
  }
  return { state, request }
}

test('cutover origin accepts loopback only', () => {
  assert.equal(normalizeLoopbackOrigin('http://127.0.0.1:3420/'), 'http://127.0.0.1:3420')
  assert.throws(
    () => normalizeLoopbackOrigin('https://127.0.0.1:3420'),
    (error) => error instanceof CutoverApiError && error.code === 'invalid_origin',
  )
  assert.throws(
    () => normalizeLoopbackOrigin('http://example.com:3420'),
    (error) => error instanceof CutoverApiError && error.code === 'invalid_origin',
  )
})

test('preflight is read-only, requires disabled Federation and can require peer', async () => {
  const missing = mockFederation({ paired: false })
  assert.deepEqual(
    await preflightFederation({ request: missing.request }),
    {
      enabled: false,
      systemId: 'bela',
      routingMode: 'catalog-first',
      peerPresent: false,
    },
  )
  assert.equal(missing.state.calls.length, 1)
  await assert.rejects(
    preflightFederation({ request: missing.request, requirePeer: true }),
    (error) => error.code === 'peer_missing',
  )
  missing.state.enabled = true
  await assert.rejects(
    preflightFederation({ request: missing.request }),
    (error) => error.code === 'already_enabled',
  )
})

test('enable validates peer, sets routing, enables, applies and verifies', async () => {
  const mock = mockFederation()
  const result = await enableFederation({
    request: mock.request,
    routingMode: 'advisory',
  })
  assert.deepEqual(result, { enabled: true, routingMode: 'advisory' })
  assert.deepEqual(
    mock.state.calls.map(({ path }) => path),
    [
      '/api/federation/peers',
      '/api/federation/routing-mode',
      '/api/federation/enabled',
      '/api/federation/apply',
      '/api/federation/peers',
    ],
  )
  assert.equal(mock.state.enabled, true)
  assert.equal(mock.state.routingMode, 'advisory')
})

test('disable persists the safety switch even if apply fails', async () => {
  const mock = mockFederation()
  mock.state.enabled = true
  const original = mock.request
  const request = async (path, init) => {
    if (path === '/api/federation/apply') throw new Error('restart unavailable')
    return original(path, init)
  }
  assert.deepEqual(await disableFederation({ request }), { enabled: false })
  assert.equal(mock.state.enabled, false)
})

test('canary requires one terminal original and exactly one exact reply', async () => {
  let polls = 0
  const request = async (path, init = {}) => {
    if (path === '/api/messages' && init.method === 'POST') {
      assert.equal(init.body.from, 'bela')
      assert.equal(init.body.to, 'codex/programozo')
      assert.match(init.body.content, /PHASE7_CANARY_OK/)
      return { id: 51 }
    }
    if (path.startsWith('/api/messages?')) {
      polls += 1
      if (polls === 1) {
        return [{
          id: 51,
          from_agent: 'bela',
          to_agent: 'codex/programozo',
          status: 'delivered',
        }]
      }
      return [
        {
          id: 51,
          from_agent: 'bela',
          to_agent: 'codex/programozo',
          status: 'done',
        },
        {
          id: 52,
          from_agent: 'codex/programozo',
          to_agent: 'bela',
          content: 'PHASE7_CANARY_OK',
        },
      ]
    }
    throw new Error(`unexpected ${path}`)
  }
  assert.deepEqual(
    await runFederationCanary({
      request,
      mainAgentId: 'bela',
      marker: 'PHASE7_CANARY_OK',
      pollIntervalMs: 1,
      timeoutMs: 100,
    }),
    { messageId: 51, replyId: 52, marker: 'PHASE7_CANARY_OK' },
  )
})

test('canary rejects duplicate exact replies', async () => {
  const request = async (path) => {
    if (path === '/api/messages') return { id: 51 }
    return [
      { id: 51, status: 'done' },
      {
        id: 52,
        from_agent: 'codex/programozo',
        to_agent: 'bela',
        content: 'PHASE7_DUPLICATE_OK',
      },
      {
        id: 53,
        from_agent: 'codex/programozo',
        to_agent: 'bela',
        content: 'PHASE7_DUPLICATE_OK',
      },
    ]
  }
  await assert.rejects(
    runFederationCanary({
      request,
      mainAgentId: 'bela',
      marker: 'PHASE7_DUPLICATE_OK',
      pollIntervalMs: 1,
      timeoutMs: 100,
    }),
    (error) => error.code === 'duplicate_canary_reply',
  )
})

test('cutover script keeps rollback and independence invariants', () => {
  const source = readFileSync(resolve('scripts/cutover-phase7.sh'), 'utf8')
  assert.match(source, /Without --execute this command is a read-only preflight/)
  assert.match(source, /ROLLBACK: disabling Federation first/)
  assert.match(source, /federation-cutover-api\.mjs" \\\n    disable/)
  assert.match(source, /stash push --include-untracked/)
  assert.match(source, /stash apply "\$\{STASH_COMMIT\}"/)
  assert.match(source, /node_modules-before-cutover/)
  assert.match(source, /systemctl --user disable --now bela-codex-bridge\.service/)
  assert.match(source, /EXPECTED_MARVEEN_VERSION="1\.25\.1"/)
  assert.match(source, /candidate is not Marveen \$\{EXPECTED_MARVEEN_VERSION\}/)
  assert.doesNotMatch(source, /1\.25\.0/)
  assert.match(source, /PHASE 7 PRODUCTION CUTOVER PASS/)
  assert.doesNotMatch(source, /git reset --hard/)
  assert.doesNotMatch(source, /git clean -/)
  assert.doesNotMatch(source, /patch -p/)
  assert.doesNotMatch(source, /src\/web\/|web\/app\.js.*replace/)
})
