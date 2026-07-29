const state = {
  token: sessionStorage.getItem('marveenCodexBridgeToken') || '',
  artifactUrls: [],
}

const byId = (id) => document.getElementById(id)
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]))

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      authorization: `Bearer ${state.token}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  if (response.status === 401) throw new Error('unauthorized')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function optionalData(path) {
  try {
    return (await api(path)).data
  } catch (error) {
    if (error.message === 'unauthorized') throw error
    return []
  }
}

function setConnected(value) {
  byId('connection').textContent = value ? 'Bridge online' : 'Nincs kapcsolat'
  byId('connection').className = `badge ${value ? 'online' : 'offline'}`
  byId('login-panel').hidden = value
  byId('dashboard').hidden = !value
}

function renderCards(summary) {
  const cards = [
    ['Verzió', summary.bridgeVersion],
    ['Inbox', summary.counts.inbox],
    ['Dead outbox', summary.counts.outboxDead],
    ['Függő approval', summary.counts.pendingApprovals],
    ['Futások', summary.counts.runs],
    ['Artifactok', summary.counts.artifacts],
  ]
  byId('summary-cards').innerHTML = cards.map(([label, value]) => (
    `<article class="card"><span class="muted">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`
  )).join('')
}

function renderAgents(agents) {
  byId('agents').innerHTML = agents.length
    ? agents.map((agent) => `<div class="agent"><strong>${escapeHtml(agent.displayName)}</strong> <span class="muted">${escapeHtml(agent.id)} · ${escapeHtml(agent.model)}</span></div>`).join('')
    : '<p class="muted">Nincs konfigurált agent.</p>'
}

function renderRuns(runs) {
  byId('runs').innerHTML = runs.length
    ? runs.map((run) => `<tr><td>${escapeHtml(run.agentId)}</td><td class="state">${escapeHtml(run.state)}</td><td>${escapeHtml(run.runId.slice(0, 12))}</td><td>${new Date(run.updatedAtMs).toLocaleString('hu-HU')}</td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">Nincs futás.</td></tr>'
}

async function artifactImage(artifact) {
  const response = await fetch(`/v1/artifacts/${encodeURIComponent(artifact.artifactId)}/content`, {
    headers: { authorization: `Bearer ${state.token}` },
  })
  if (!response.ok) return null
  const url = URL.createObjectURL(await response.blob())
  state.artifactUrls.push(url)
  return url
}

async function renderArtifacts(artifacts) {
  state.artifactUrls.forEach((url) => URL.revokeObjectURL(url))
  state.artifactUrls = []
  const views = await Promise.all(artifacts.slice(0, 12).map(async (artifact) => {
    const image = await artifactImage(artifact)
    return `<article class="artifact">${image ? `<img src="${image}" alt="">` : ''}<div><strong>${escapeHtml(artifact.workspaceRelativePath)}</strong><br><span class="muted">${escapeHtml(artifact.width)}×${escapeHtml(artifact.height)}</span></div></article>`
  }))
  byId('artifacts').innerHTML = views.join('') || '<p class="muted">Nincs képartifact.</p>'
}

async function decideApproval(approvalId, decision) {
  await api(`/v1/approvals/${encodeURIComponent(approvalId)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  })
  await refresh()
}

function renderApprovals(approvals) {
  byId('approvals').innerHTML = approvals.length
    ? approvals.map((approval) => `<div class="approval"><div><strong>${escapeHtml(approval.category)}</strong><br><span class="muted">${escapeHtml(approval.agentId)} · ${escapeHtml(approval.approvalId)}</span></div><div><button data-decision="approve" data-id="${escapeHtml(approval.approvalId)}">Jóváhagyás</button> <button class="secondary" data-decision="decline" data-id="${escapeHtml(approval.approvalId)}">Elutasítás</button></div></div>`).join('')
    : '<p class="muted">Nincs függő jóváhagyás.</p>'
}

async function refresh() {
  const [summary, runs, approvals, artifacts] = await Promise.all([
    api('/v1/dashboard/summary'),
    optionalData('/v1/runs?limit=100'),
    optionalData('/v1/approvals?state=pending'),
    optionalData('/v1/artifacts'),
  ])
  renderCards(summary.data)
  renderAgents(summary.data.agents)
  renderRuns(runs)
  renderApprovals(approvals)
  await renderArtifacts(artifacts)
  setConnected(true)
}

byId('login-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  state.token = byId('token').value.trim()
  try {
    await refresh()
    sessionStorage.setItem('marveenCodexBridgeToken', state.token)
    byId('login-error').textContent = ''
    byId('token').value = ''
  } catch {
    state.token = ''
    byId('login-error').textContent = 'A token hibás vagy a Bridge nem elérhető.'
    setConnected(false)
  }
})
byId('refresh').addEventListener('click', () => refresh().catch(() => setConnected(false)))
byId('logout').addEventListener('click', () => {
  sessionStorage.removeItem('marveenCodexBridgeToken')
  state.token = ''
  setConnected(false)
})
byId('approvals').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-decision]')
  if (!button) return
  void decideApproval(button.dataset.id, button.dataset.decision)
})

if (state.token) refresh().catch(() => setConnected(false))
