const VIEW_DEFS = [
  { key: 'overview', label: 'Overview', icon: '◈', group: 'Console' },
  { key: 'work', label: 'Work', icon: '☐', group: 'Console' },
  { key: 'approvals', label: 'Approvals', icon: '✓', group: 'Console' },
  { key: 'events', label: 'Events', icon: '⊙', group: 'Operations' },
  { key: 'agents', label: 'Agents', icon: '⊕', group: 'Operations' },
  { key: 'schedule', label: 'Schedule', icon: '◷', group: 'Operations' },
  { key: 'usage-cost', label: 'Usage / Cost', icon: '$', group: 'Operations' },
  { key: 'artifacts', label: 'Artifacts', icon: '◫', group: 'System' },
  { key: 'intel', label: 'Intel', icon: '◉', group: 'System' }
];

const LANE_ORDER = ['now', 'next', 'blocked', 'backlog', 'icebox', 'done_verified'];
const LANE_LABELS = {
  now: 'Now / Attack',
  next: 'Next Up',
  blocked: 'Blocked',
  backlog: 'Backlog',
  icebox: 'Icebox / Research',
  done_verified: 'Done / Verified'
};

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const viewTitle = document.getElementById('view-title');
const sourceCount = document.getElementById('source-count');
const refreshButton = document.getElementById('refresh-data');
const generatedAtEl = document.getElementById('generated-at');
const lastRefreshedEl = document.getElementById('last-refreshed');
const openAlertsEl = document.getElementById('open-alerts-pill');

let state = null;
let currentView = location.hash.replace('#', '') || 'overview';
let refreshInterval = null;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function humanize(value = '') {
  return String(value)
    .replaceAll('_', ' ')
    .replaceAll('/', ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value = '') {
  return humanize(value).replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function formatRelative(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const buckets = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  for (const [unit, size] of buckets) {
    if (absSec >= size) {
      const valueNum = Math.round(diffMs / 1000 / size);
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-valueNum, unit);
    }
  }
  return 'just now';
}

function money(value) {
  const num = Number(value || 0);
  return `$${num.toFixed(2)}`;
}

function duration(value) {
  const ms = Number(value || 0);
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function badgeTone(value = '') {
  const lower = String(value).toLowerCase();
  if (['success', 'verified', 'active', 'healthy', 'done_verified', 'approved', 'heartbeat_active'].includes(lower)) return 'success';
  if (['warning', 'pending', 'stale', 'waiting_for_human', 'medium', 'heartbeat_stale'].includes(lower)) return 'warning';
  if (['error', 'critical', 'blocked', 'failed', 'urgent', 'open', 'rejected'].includes(lower)) return 'error';
  if (['info', 'claimed', 'idle', 'backlog', 'in_progress'].includes(lower)) return 'info';
  return 'default';
}

function badge(label) {
  return `<span class="badge badge-${badgeTone(label)}">${escapeHtml(humanize(label))}</span>`;
}

function truthStateClass(item) {
  return `truth-${item?._truth?.state || 'unknown'}`;
}

function truthDot(item) {
  return `<span class="truth-dot ${truthStateClass(item)}"></span>`;
}

function truthBadge(item) {
  const state = item?._truth?.state || 'unknown';
  return `<span class="badge badge-${badgeTone(state)}">${truthDot(item)}${escapeHtml(state)}</span>`;
}

function important(text) {
  return `<span class="table-strong">${escapeHtml(text ?? '—')}</span>`;
}

function mono(text) {
  return `<span class="table-mono">${escapeHtml(text ?? '—')}</span>`;
}

function getViewLabel(key) {
  return VIEW_DEFS.find((view) => view.key === key)?.label || 'Overview';
}

function getOpenAlerts() {
  return (state?.alerts || []).filter((alert) => String(alert.status).toLowerCase() === 'open');
}

function getPendingApprovals() {
  return (state?.approvals || []).filter((approval) => String(approval.status).toLowerCase() === 'pending');
}

function getLaneSummaryMap() {
  const map = new Map();
  (state?.overview?.laneSummaries || []).forEach((item) => map.set(item.lane, item.count));
  return map;
}

function renderNav() {
  const groups = [...new Set(VIEW_DEFS.map((view) => view.group))];
  nav.innerHTML = groups.map((group) => {
    const items = VIEW_DEFS.filter((view) => view.group === group).map((view) => `
      <button class="nav-item ${view.key === currentView ? 'is-active' : ''}" type="button" data-view="${view.key}">
        <span class="nav-icon">${view.icon}</span>
        <span>${view.label}</span>
      </button>
    `).join('');
    return `<div class="nav-group-label">${group}</div>${items}`;
  }).join('');

  nav.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view;
      location.hash = currentView;
      draw();
    });
  });
}

function renderKpiCard(label, value, description, isMoney = false) {
  return `
    <article class="card kpi-card card-interactive">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div class="metric-value ${isMoney ? 'is-money' : ''}">${escapeHtml(value)}</div>
      <div class="kpi-description">${escapeHtml(description)}</div>
    </article>
  `;
}

function renderOverview() {
  const overview = state?.overview || {};
  const alerts = getOpenAlerts();
  const approvals = getPendingApprovals();
  const usage = state?.usage || [];
  const spendToday = usage.reduce((sum, row) => sum + Number(row.estimatedCostUsd || 0), 0);
  const recentEvents = [...(state?.events || [])].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 6);
  const mission = state?.meta?.missionStatement || 'Mission state unavailable.';
  const nextActions = state?.meta?.nextActions || [];
  const problems = alerts.length ? alerts : [{ title: 'No open alerts', description: 'System looks quiet right now.', severity: 'success', recommendedAction: 'Keep monitoring.' }];
  const dataQuality = overview.dataQuality;

  return `
    <section class="grid kpi-grid">
      ${renderKpiCard('Active Agents', String(overview.activeAgents ?? 0), 'Agents currently active or recorded.')}
      ${renderKpiCard('Now / Attack', String(overview.tasksInProgress ?? 0), 'Tasks actively being pushed right now.')}
      ${renderKpiCard('Blocked', String(overview.blockedTasks ?? 0), 'Items stalled by dependencies or approvals.')}
      ${renderKpiCard('Open Alerts', String(overview.openAlerts ?? alerts.length), 'Issues requiring operator attention.')}
      ${renderKpiCard('Pending Approvals', String(overview.pendingApprovals ?? approvals.length), 'Decisions waiting on a resolution.')}
      ${renderKpiCard('Spend Today', money(overview.spendTodayUsd ?? spendToday), 'Live usage-derived spend for today.', true)}
      ${renderKpiCard('Artifacts Today', String(overview.artifactsCreatedToday ?? (state?.artifacts || []).length), 'Durable outputs created today.')}
      ${renderKpiCard('Schedules Ran', String(overview.schedulesExecutedToday ?? 0), 'Recorded schedule executions today.')}
    </section>

    ${dataQuality ? `
      <section class="card">
        <div class="card-header">
          <h3>Data Quality</h3>
          <div class="card-subtitle">Truth state distribution</div>
        </div>
        <div class="inline-list">
          <div class="truth-stat"><span class="truth-dot truth-verified"></span>Verified ${dataQuality.verified ?? 0}</div>
          <div class="truth-stat"><span class="truth-dot truth-claimed"></span>Claimed ${dataQuality.claimed ?? 0}</div>
          <div class="truth-stat"><span class="truth-dot truth-stale"></span>Stale ${dataQuality.stale ?? 0}</div>
          <div class="truth-stat"><span class="truth-dot truth-unknown"></span>Unknown ${dataQuality.unknown ?? 0}</div>
        </div>
      </section>
    ` : ''}

    <section class="card">
      <div class="card-header">
        <h3>Work Lanes</h3>
        <div class="card-subtitle">Current task distribution</div>
      </div>
      <div class="lane-pill-row">
        ${(overview.laneSummaries || []).map((lane) => `<span class="lane-pill">${escapeHtml(lane.label)} <strong>${lane.count ?? 0}</strong></span>`).join('')}
      </div>
    </section>

    <section class="grid split-grid">
      <article class="card">
        <div class="card-header">
          <h3>Problems</h3>
          <div class="card-subtitle">${problems.length} surfaced</div>
        </div>
        <ul class="list-plain problem-list">
          ${problems.map((problem) => `
            <li class="problem-item">
              <div class="task-header">
                <div class="problem-title">${escapeHtml(problem.title || 'Untitled alert')}</div>
                ${badge(problem.severity || problem.status || 'open')}
              </div>
              <div class="problem-copy">${escapeHtml(problem.description || problem.reason || 'No details available.')}</div>
              <div class="event-meta" style="margin-top:8px;">
                <span class="card-subtitle">Next:</span>
                <span class="list-item-copy">${escapeHtml(problem.recommendedAction || 'Review state and respond.')}</span>
              </div>
            </li>
          `).join('')}
        </ul>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Recent Events</h3>
          <div class="card-subtitle">Reverse chronological</div>
        </div>
        <ul class="list-plain event-simple-list">
          ${recentEvents.map((event) => `
            <li class="event-simple-item">
              <div class="event-simple-meta">
                <span class="event-time">${escapeHtml(formatDateTime(event.timestamp))}</span>
                ${badge(event.status || 'info')}
              </div>
              <div class="event-simple-summary">${escapeHtml(event.summary || 'Untitled event')}</div>
              <div class="event-simple-actor">${escapeHtml(event.actor || 'Mansa')} · ${escapeHtml(humanize(event.type || 'event'))}</div>
            </li>
          `).join('')}
        </ul>
      </article>
    </section>

    <section class="grid split-grid">
      <article class="card">
        <div class="card-header">
          <h3>Mission Statement</h3>
          <div class="card-subtitle">Why this console exists</div>
        </div>
        <p class="mission-copy">${escapeHtml(mission)}</p>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Next Actions</h3>
          <div class="card-subtitle">Operator guidance</div>
        </div>
        <ul class="memory-list">
          ${nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No next actions recorded.</li>'}
        </ul>
      </article>
    </section>
  `;
}

function renderWork() {
  const laneSummaryMap = getLaneSummaryMap();
  const lanes = LANE_ORDER.map((lane) => ({
    key: lane,
    label: LANE_LABELS[lane] || titleCase(lane),
    count: laneSummaryMap.get(lane) ?? (state?.tasks || []).filter((task) => task.lane === lane).length,
    tasks: (state?.tasks || []).filter((task) => task.lane === lane)
  }));

  return `
    <nav class="kanban-tabs" aria-label="Work lanes">
      ${lanes.map((lane) => `
        <button class="kanban-tab${lane.key === activeKanbanLane ? ' active' : ''}" data-lane="${escapeHtml(lane.key)}" type="button">
          ${escapeHtml(lane.label)} <span style="opacity:0.6">${lane.count}</span>
        </button>
      `).join('')}
    </nav>
    <section class="kanban-board">
      ${lanes.map((lane) => `
        <article class="card lane-column kanban-column${lane.key === activeKanbanLane ? ' active' : ''}" data-lane="${escapeHtml(lane.key)}">
          <div class="card-header">
            <h3>${escapeHtml(lane.label)}</h3>
            <span class="count-pill">${lane.count}</span>
          </div>
          <div class="task-stack">
            ${lane.tasks.length ? lane.tasks.map((task) => `
              <article class="task-card card-interactive">
                <h4 class="task-title">${escapeHtml(humanize(task.title))}</h4>
                <div class="badge-row">
                  ${badge(task.status || 'unknown')}
                  ${badge(task.priority || 'default')}
                  ${badge(task.project || 'general')}
                  ${task.approvalRequired ? badge('waiting_for_human') : ''}
                </div>
                <div class="list-item-copy">${escapeHtml(task.latestUpdate || 'No update recorded.')}</div>
                <div class="source-ref">${escapeHtml(task.sourceRef || 'work/TASKS.md')}</div>
              </article>
            `).join('') : `
              <div class="empty-state empty-state-compact">
                <div class="empty-copy">No items</div>
              </div>
            `}
          </div>
        </article>
      `).join('')}
    </section>
  `;
}

function renderApprovals() {
  const approvals = state?.approvals || [];
  if (!approvals.length) {
    return `
      <section class="card">
        <div class="empty-state">
          <div>
            <div class="task-title">No approvals waiting</div>
            <div class="empty-copy">Approval cards will appear here when the ledger has pending decisions.</div>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="grid approvals-grid">
      ${approvals.map((approval) => `
        <article class="card approval-card card-interactive" data-approval-id="${escapeHtml(approval.id)}">
          <div class="approval-header">
            <h3 class="approval-title">${escapeHtml(approval.title || approval.id)}</h3>
            ${badge(approval.status || 'pending')}
          </div>

          <div class="key-value-grid approval-meta">
            <div class="key-label">Urgency</div><div class="key-value">${badge(approval.urgency || 'medium')}</div>
            <div class="key-label">Risk</div><div class="key-value">${escapeHtml(humanize(approval.riskCategory || 'other'))}</div>
            <div class="key-label">Requested by</div><div class="key-value">${escapeHtml(approval.requestedBy || 'Mission Control')}</div>
            <div class="key-label">Requested at</div><div class="key-value table-mono">${escapeHtml(formatDateTime(approval.requestedAt))}</div>
          </div>

          <p class="approval-reason">${escapeHtml(approval.reason || 'No reason recorded.')}</p>
          <div class="approval-consequence">${escapeHtml(approval.consequence || 'Decision consequence not recorded.')}</div>

          ${String(approval.status).toLowerCase() === 'pending' ? `
            <div class="action-row" style="margin-top:12px;">
              <button class="btn btn-success" type="button" data-approval-action="approved" data-approval-id="${escapeHtml(approval.id)}">Approve</button>
              <button class="btn btn-destructive" type="button" data-approval-action="rejected" data-approval-id="${escapeHtml(approval.id)}">Reject</button>
            </div>
            <div class="confirmation-slot"></div>
          ` : `
            <div class="confirmation-inline">Resolution recorded.</div>
          `}
        </article>
      `).join('')}
    </section>
  `;
}

function renderEvents() {
  const events = [...(state?.events || [])].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  return `
    <section class="card events-card">
      <div class="card-header">
        <h3>Event Ledger</h3>
        <div class="card-subtitle">Reverse chronological</div>
      </div>
      <div class="events-list">
        ${events.map((event) => `
          <div class="events-list-item">
            <div class="event-time">${escapeHtml(formatDateTime(event.timestamp))}</div>
            <div class="list-item-copy">${escapeHtml(event.actor || 'Unknown actor')}</div>
            <div class="list-item-copy">${escapeHtml(humanize(event.type || 'event'))}</div>
            <div class="event-summary">${escapeHtml(event.summary || 'No summary')}</div>
            <div>${badge(event.status || 'info')}</div>
            <div>${truthBadge(event)}</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderAgents() {
  const agents = state?.agents || [];
  return `
    <section class="grid agent-grid">
      ${agents.map((agent) => `
        <article class="card agent-card card-interactive">
          <div class="agent-header">
            <div>
              <div class="agent-name">${truthDot(agent)}${escapeHtml(agent.name || 'Unnamed agent')}</div>
            </div>
            ${badge(agent.status || 'unknown')}
          </div>
          <p class="agent-role">${escapeHtml(agent.role || 'No role recorded.')}</p>
          <div class="key-value-grid agent-meta">
            <div class="key-label">Model</div><div class="key-value">${escapeHtml(agent.model || 'unknown')}</div>
            <div class="key-label">Environment</div><div class="key-value">${escapeHtml(agent.environment || agent.provider || 'unknown')}</div>
            <div class="key-label">Current Task</div><div class="key-value">${escapeHtml(agent.currentTaskSummary || '—')}</div>
            <div class="key-label">Health</div><div class="key-value">${badge(agent.health || 'unknown')}</div>
            <div class="key-label">Last Seen</div><div class="key-value">${escapeHtml(formatRelative(agent.lastSeenAt))}</div>
            <div class="key-label">Activity</div><div class="key-value">${escapeHtml(String(agent.recentActivityCount ?? 0))}</div>
          </div>
        </article>
      `).join('')}
    </section>
  `;
}

function renderSchedule() {
  const schedules = state?.schedules || [];
  return `
    <section class="card">
      <div class="card-header">
        <h3>Schedule</h3>
        <div class="card-subtitle">Run ledger</div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Name / Description</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Last Run</th>
              <th>Last Result</th>
              <th>Next Run</th>
            </tr>
          </thead>
          <tbody>
            ${schedules.map((schedule) => `
              <tr>
                <td>
                  ${important(schedule.name || 'Unnamed schedule')}
                  <div class="list-item-copy">${escapeHtml(schedule.humanReadable || schedule.description || 'No description')}</div>
                </td>
                <td>${badge(schedule.status || 'unknown')}</td>
                <td>${important(schedule.ownerAgent || '—')}</td>
                <td class="table-mono">${escapeHtml(formatRelative(schedule.lastRunAt))}</td>
                <td>${badge(schedule.lastRunStatus || 'unknown')}</td>
                <td class="table-mono">${escapeHtml(formatDateTime(schedule.nextRunAt))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderUsageCost() {
  const usage = state?.usage || [];
  const total = usage.reduce((sum, row) => sum + Number(row.estimatedCostUsd || 0), 0);
  const topDriver = [...usage].sort((a, b) => Number(b.estimatedCostUsd || 0) - Number(a.estimatedCostUsd || 0))[0];
  const truthLevel = state?.truthGaps?.usageCost || (usage.length ? 'verified' : 'unknown');

  return `
    <section class="grid grid-3">
      ${renderKpiCard('Total Spend Today', money(total), usage.length ? 'Usage rows loaded from ledger files.' : 'No usage rows found yet.', true)}
      ${renderKpiCard('Top Cost Driver', topDriver?.agent || '—', topDriver ? `${money(topDriver.estimatedCostUsd)} · ${humanize(topDriver.operationType)}` : 'Waiting for ledger data.')}
      ${renderKpiCard('Truth Level', titleCase(truthLevel), 'Confidence state for usage and cost data.')}
    </section>

    ${usage.length ? `
      <section class="card">
        <div class="card-header">
          <h3>Usage Records</h3>
          <div class="card-subtitle">Structured ledger rows</div>
        </div>
        <div class="table-wrap">
          <table class="table usage-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Model</th>
                <th>Provider</th>
                <th>Operation</th>
                <th>Cost</th>
                <th>Duration</th>
                <th>Success</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${usage.map((row) => `
                <tr>
                  <td data-label="Agent">${important(row.agent || 'Unknown')}</td>
                  <td data-label="Model">${important(row.model || 'unknown')}</td>
                  <td data-label="Provider">${escapeHtml(row.provider || 'unknown')}</td>
                  <td data-label="Operation">${escapeHtml(humanize(row.operationType || 'unknown'))}</td>
                  <td data-label="Cost" class="table-mono table-strong">${escapeHtml(money(row.estimatedCostUsd || 0))}</td>
                  <td data-label="Duration" class="table-mono">${escapeHtml(duration(row.durationMs))}</td>
                  <td data-label="Success">${badge(row.success ? 'success' : 'failed')}</td>
                  <td data-label="Source" class="table-mono">${escapeHtml(row.sourcePath || row._truth?.source || '—')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    ` : `
      <section class="card">
        <div class="empty-state">
          <div>
            <div class="task-title">No usage records yet</div>
            <div class="empty-copy">Add structured usage ledger files and this view will light up with spend, duration, and source rows.</div>
          </div>
        </div>
      </section>
    `}
  `;
}

function renderArtifacts() {
  const artifacts = state?.artifacts || [];
  return `
    <section class="grid artifacts-grid">
      ${artifacts.map((artifact) => `
        <article class="card artifact-card card-interactive">
          <div class="artifact-header">
            <div class="artifact-title">${escapeHtml(artifact.title || 'Untitled artifact')}</div>
            ${badge(artifact.category || 'artifact')}
          </div>
          <div class="key-value-grid artifact-meta">
            <div class="key-label">Format</div><div class="key-value">${escapeHtml(artifact.format || '—')}</div>
            <div class="key-label">Project</div><div class="key-value">${escapeHtml(artifact.project || '—')}</div>
            <div class="key-label">Creator</div><div class="key-value">${escapeHtml(artifact.creator || '—')}</div>
            <div class="key-label">Created</div><div class="key-value table-mono">${escapeHtml(formatDateTime(artifact.createdAt))}</div>
            <div class="key-label">Path</div><div class="key-value path-mono">${escapeHtml(artifact.path || '—')}</div>
          </div>
        </article>
      `).join('')}
    </section>
  `;
}

function renderIntel() {
  const memory = state?.memory || {};
  return `
    <section class="grid memory-grid">
      <article class="card">
        <div class="card-header">
          <h3>Memory Intelligence</h3>
          <div class="card-subtitle">Key events, decisions, facts</div>
        </div>

        <div class="memory-block">
          <div class="memory-block-title">Key Events</div>
          <ul class="memory-list">${(memory.keyEvents || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No key events found.</li>'}</ul>
        </div>

        <div class="memory-block">
          <div class="memory-block-title">Decisions</div>
          <ul class="memory-list">${(memory.decisions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No decisions found.</li>'}</ul>
        </div>

        <div class="memory-block">
          <div class="memory-block-title">Facts</div>
          <ul class="memory-list">${(memory.facts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No facts found.</li>'}</ul>
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Spec & Sources</h3>
          <div class="card-subtitle">Grounding inputs</div>
        </div>
        <div class="memory-block">
          <div class="memory-block-title">Spec</div>
          <div class="list-item-copy">${escapeHtml(state?.spec?.title || 'Mission Control spec')}</div>
          <div class="list-item-copy">${escapeHtml(state?.spec?.status || 'Status unavailable')}</div>
        </div>
        <div class="memory-block">
          <div class="memory-block-title">Focus</div>
          <div class="spec-source-list">${(state?.spec?.focus || []).map((item) => `<code>${escapeHtml(item)}</code>`).join('') || '<code>No focus items</code>'}</div>
        </div>
        <div class="memory-block">
          <div class="memory-block-title">Sources</div>
          <div class="spec-source-list">${(state?.meta?.dataSources || []).map((source) => `<code>${escapeHtml(source)}</code>`).join('') || '<code>No sources found</code>'}</div>
        </div>
      </article>
    </section>
  `;
}

const RENDERERS = {
  overview: renderOverview,
  work: renderWork,
  approvals: renderApprovals,
  events: renderEvents,
  agents: renderAgents,
  schedule: renderSchedule,
  'usage-cost': renderUsageCost,
  artifacts: renderArtifacts,
  intel: renderIntel
};

function draw() {
  if (!RENDERERS[currentView]) currentView = 'overview';
  viewTitle.textContent = getViewLabel(currentView);
  renderNav();
  app.classList.remove('fade-in');
  void app.offsetWidth;
  app.classList.add('fade-in');
  app.innerHTML = RENDERERS[currentView]();
  bindApprovalActions();
  if (currentView === 'work') initKanbanTabs();
  if (currentView === 'overview') initProblemsAccordion();
}

function bindApprovalActions() {
  app.querySelectorAll('[data-approval-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.approvalId;
      const resolution = button.dataset.approvalAction;
      const card = button.closest('[data-approval-id]');
      const slot = card?.querySelector('.confirmation-slot');
      await resolveApproval(id, resolution, slot);
    });
  });
}

async function loadState() {
  const cacheBust = Date.now();
  let response;
  try {
    response = await fetch(`/api/state?ts=${cacheBust}`);
  } catch {
    response = null;
  }

  if (response?.ok) {
    state = await response.json();
  } else {
    const fallback = await fetch(`./data/state.json?ts=${cacheBust}`);
    state = await fallback.json();
  }

  sourceCount.textContent = `${state?.meta?.dataSources?.length || 0} sources`;
  generatedAtEl.textContent = `Generated ${formatDateTime(state?.meta?.generatedAt)}`;
  lastRefreshedEl.textContent = `Last refreshed ${formatTime(new Date())}`;
  openAlertsEl.textContent = `${getOpenAlerts().length} open alerts`;
  draw();
}

async function resolveApproval(id, resolution, slot) {
  if (!id) return;
  if (slot) slot.innerHTML = '';

  try {
    const response = await fetch(`/api/approvals/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution })
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    if (slot) slot.innerHTML = `<div class="confirmation-inline">${escapeHtml(titleCase(resolution))} recorded. Reloading state…</div>`;
    await loadState();
  } catch (error) {
    if (slot) slot.innerHTML = `<div class="error-inline">${escapeHtml(error.message || 'Approval write failed.')}</div>`;
  }
}

function syncHash() {
  const next = location.hash.replace('#', '');
  if (next && RENDERERS[next]) {
    currentView = next;
    draw();
  }
}

/* ── Mobile drawer ── */
function initMobileDrawer() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar || !overlay) return;

  function openDrawer() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  overlay.addEventListener('click', closeDrawer);

  // Close drawer when a nav item is tapped on mobile
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item') && window.innerWidth <= 768) closeDrawer();
  });
}

/* ── Problems accordion ── */
function initProblemsAccordion() {
  document.querySelectorAll('.problem-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (window.innerWidth > 768) return;
      card.classList.toggle('expanded');
    });
  });
}

/* ── Kanban tabs (mobile) ── */
let activeKanbanLane = 'now';

function initKanbanTabs() {
  const tabs = document.querySelector('.kanban-tabs');
  if (!tabs) return;
  tabs.querySelectorAll('.kanban-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeKanbanLane = tab.dataset.lane;
      syncKanbanTabs();
    });
  });
  syncKanbanTabs();
}

function syncKanbanTabs() {
  document.querySelectorAll('.kanban-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.lane === activeKanbanLane);
  });
  document.querySelectorAll('.kanban-column').forEach((col) => {
    col.classList.toggle('active', col.dataset.lane === activeKanbanLane);
  });
}

async function init() {
  refreshButton.addEventListener('click', () => loadState());
  window.addEventListener('hashchange', syncHash);
  initMobileDrawer();
  await loadState();
  refreshInterval = setInterval(async () => {
    await loadState();
  }, 30000);
}

init();
