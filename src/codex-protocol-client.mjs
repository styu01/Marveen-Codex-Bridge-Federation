import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import readline from 'node:readline'

const MAX_PROTOCOL_LINE_BYTES = 8 * 1024 * 1024

export class CodexProtocolError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'CodexProtocolError'
    this.code = code
    this.details = details
  }
}

export class CodexProtocolClient extends EventEmitter {
  constructor({
    binary,
    cwd,
    requestTimeoutMs,
    startupTimeoutMs,
    environment = process.env,
    serverRequestHandler,
    onStderr = () => {},
  }) {
    super()
    this.binary = binary
    this.cwd = cwd
    this.requestTimeoutMs = requestTimeoutMs
    this.startupTimeoutMs = startupTimeoutMs
    this.environment = environment
    this.serverRequestHandler = serverRequestHandler
    this.onStderr = onStderr
    this.child = null
    this.pending = new Map()
    this.nextId = 1
    this.stopping = false
    this.protocolErrorCount = 0
  }

  get running() {
    return Boolean(this.child && this.child.exitCode === null && !this.child.killed)
  }

  get pendingCount() {
    return this.pending.size
  }

  async start() {
    if (this.child) return
    this.stopping = false
    const child = spawn(this.binary, ['app-server', '--stdio'], {
      cwd: this.cwd,
      env: this.environment,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.child = child
    child.once('error', (error) => this.handleExit(error))
    child.once('exit', (code, signal) => {
      if (this.child === child) this.child = null
      if (!this.stopping) {
        this.handleExit(new CodexProtocolError(
          'app_server_exit',
          `Codex App Server exited unexpectedly: code=${code}, signal=${signal}`,
        ))
      }
    })
    const stdout = readline.createInterface({ input: child.stdout, crlfDelay: Infinity })
    stdout.on('line', (line) => void this.handleLine(line))
    const stderr = readline.createInterface({ input: child.stderr, crlfDelay: Infinity })
    stderr.on('line', (line) => this.onStderr(line))

    try {
      await this.request('initialize', {
        clientInfo: {
          name: 'marveen_codex_bridge_federation',
          title: 'Marveen Codex Bridge Federation',
          version: '0.3.0-phase6.3.0',
        },
        capabilities: {
          experimentalApi: true,
          requestAttestation: false,
          mcpServerOpenaiFormElicitation: false,
          optOutNotificationMethods: [],
        },
      }, this.startupTimeoutMs)
      this.notify('initialized')
    } catch (error) {
      await this.stop()
      throw error
    }
  }

  async stop(graceMs = 5_000) {
    const child = this.child
    if (!child) return
    this.stopping = true
    this.child = null
    const exited = new Promise((resolve) => child.once('exit', resolve))
    child.stdin.end()
    child.kill('SIGTERM')
    const timer = setTimeout(() => child.kill('SIGKILL'), graceMs)
    timer.unref()
    await exited.catch(() => {})
    clearTimeout(timer)
    this.rejectAll(new CodexProtocolError(
      'app_server_stopped',
      'Codex App Server stopped',
    ))
  }

  request(method, params = {}, timeoutMs = this.requestTimeoutMs) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(String(id))
        reject(new CodexProtocolError(
          'rpc_timeout',
          `Codex RPC timeout: ${method}`,
          { method },
        ))
      }, timeoutMs)
      timer.unref()
      this.pending.set(String(id), { method, resolve, reject, timer })
      try {
        this.send({ id, method, params })
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(String(id))
        reject(error)
      }
    })
  }

  notify(method, params) {
    this.send(params === undefined ? { method } : { method, params })
  }

  send(message) {
    if (!this.running || this.child.stdin.destroyed) {
      throw new CodexProtocolError(
        'app_server_offline',
        'Codex App Server is not running',
      )
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`)
  }

  async handleLine(line) {
    if (!line.trim()) return
    if (Buffer.byteLength(line) > MAX_PROTOCOL_LINE_BYTES) {
      this.protocolErrorCount += 1
      this.emit('protocol-error', {
        code: 'protocol_line_too_large',
        bytes: Buffer.byteLength(line),
      })
      return
    }
    let message
    try {
      message = JSON.parse(line)
    } catch {
      this.protocolErrorCount += 1
      this.emit('protocol-error', {
        code: 'invalid_json',
        preview: line.slice(0, 500),
      })
      return
    }
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      this.protocolErrorCount += 1
      this.emit('protocol-error', { code: 'invalid_message_shape' })
      return
    }

    const hasId = typeof message.id === 'number' || typeof message.id === 'string'
    const method = typeof message.method === 'string' ? message.method : null
    if (hasId && method) {
      try {
        const result = await this.serverRequestHandler({
          id: message.id,
          method,
          params: message.params && typeof message.params === 'object'
            ? message.params
            : {},
        })
        if (this.running) this.send({ id: message.id, result })
      } catch (error) {
        if (this.running) {
          this.send({
            id: message.id,
            error: {
              code: -32000,
              message: error?.message || 'Bridge rejected server request',
            },
          })
        } else {
          this.emit('protocol-error', {
            code: 'server_request_aborted',
            method,
          })
        }
      }
      return
    }

    if (hasId) {
      const pending = this.pending.get(String(message.id))
      if (!pending) {
        this.emit('orphan-response', { id: message.id })
        return
      }
      clearTimeout(pending.timer)
      this.pending.delete(String(message.id))
      if (message.error !== undefined) {
        pending.reject(new CodexProtocolError(
          'codex_rpc_error',
          `${pending.method}: ${JSON.stringify(message.error)}`,
          { method: pending.method, error: message.error },
        ))
      } else {
        pending.resolve(message.result)
      }
      return
    }

    if (method) {
      const notification = {
        method,
        params: message.params && typeof message.params === 'object'
          ? message.params
          : {},
      }
      this.emit('notification', notification)
      this.emit(`notification:${method}`, notification)
      return
    }
    this.protocolErrorCount += 1
    this.emit('protocol-error', { code: 'unrecognized_message' })
  }

  handleExit(error) {
    this.child = null
    this.rejectAll(error)
    this.emit('exit', error)
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }
}

export async function declineServerRequest(request) {
  if (
    request.method === 'item/commandExecution/requestApproval'
    || request.method === 'item/fileChange/requestApproval'
  ) {
    return { decision: 'decline' }
  }
  if (request.method === 'item/tool/requestUserInput') return { answers: {} }
  if (request.method === 'mcpServer/elicitation/request') {
    return { action: 'decline', content: null, _meta: null }
  }
  throw new CodexProtocolError(
    'unsupported_server_request',
    `Unsupported Codex request: ${request.method}`,
  )
}
