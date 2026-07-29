export class FederationInboxOrchestrator {
  constructor({
    store,
    runtime,
    systemId,
    workerId,
    leaseMs = 120_000,
    maxAttempts = 3,
    initialDelayMs = 1_000,
    maxDelayMs = 60_000,
    jitterRatio = 0.2,
    random = Math.random,
  }) {
    if (!store) throw new TypeError('store is required')
    if (!runtime || typeof runtime.run !== 'function') throw new TypeError('runtime is required')
    if (typeof systemId !== 'string' || systemId.length === 0) {
      throw new TypeError('systemId is required')
    }
    if (typeof workerId !== 'string' || workerId.length === 0) {
      throw new TypeError('workerId is required')
    }
    this.store = store
    this.runtime = runtime
    this.systemId = systemId
    this.workerId = workerId
    this.leaseMs = leaseMs
    this.maxAttempts = maxAttempts
    this.initialDelayMs = initialDelayMs
    this.maxDelayMs = maxDelayMs
    this.jitterRatio = jitterRatio
    this.random = random
    this.running = false
  }

  async tick(limit = 1) {
    if (this.running) return { skipped: true, claimed: 0, completed: 0, retried: 0, failed: 0 }
    this.running = true
    const summary = { skipped: false, claimed: 0, completed: 0, retried: 0, failed: 0 }
    try {
      const claimed = this.store.claimInbox({
        workerId: this.workerId,
        limit,
        leaseMs: this.leaseMs,
        maxAttempts: this.maxAttempts,
      })
      summary.claimed = claimed.length
      const outcomes = await Promise.all(claimed.map((item) => this.execute(item)))
      for (const outcome of outcomes) summary[outcome] += 1
      return summary
    } finally {
      this.running = false
    }
  }

  async execute(item) {
    try {
      const result = await this.runtime.run({
        agentId: item.to,
        prompt: item.content,
        context: {
          federation: {
            inboxId: item.inboxId,
            peerId: item.peerId,
            from: item.from,
            ref: item.ref,
          },
        },
        idempotencyKey: `federation-inbox-${item.inboxId}`,
      })
      this.store.completeClaimedInboxWithReply({
        inboxId: item.inboxId,
        workerId: this.workerId,
        systemId: this.systemId,
        response: result.response,
        runId: result.runId,
        artifacts: Array.isArray(result.artifacts) ? result.artifacts : [],
      })
      return 'completed'
    } catch (error) {
      const row = this.store.failClaimedInbox({
        inboxId: item.inboxId,
        workerId: this.workerId,
        errorCode: typeof error?.code === 'string' ? error.code : 'runtime_failed',
        maxAttempts: this.maxAttempts,
        initialDelayMs: this.initialDelayMs,
        maxDelayMs: this.maxDelayMs,
        jitterRatio: this.jitterRatio,
        random: this.random,
      })
      return row.state === 'failed' ? 'failed' : 'retried'
    }
  }
}
