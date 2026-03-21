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
let activeKanbanLane = 'now';
let commitmentCountdownInterval = null;
let aiSummary = null;
let aiSummaryLoading = false;
let digestData = null;
let digestDismissed = false;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function humanize(value = '') {
  return String(value).replaceAll('_', ' ').replaceAll('/', ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(value = '') {
  return humanize(value).replace(/\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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
  const buckets = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of buckets) {
    if (absSec >= size) {
      const valueNum = Math.round(diffMs / 1000 / size);
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-valueNum, unit);
    }
  }
  return 'just now';
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
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
  if (['success', 'verified', 'active', 'healthy', 'done_verified', 'approved', 'heartbeat_active', 'delivered'].includes(lower)) return 'success';
  if (['warning', 'pending', 'stale', 'waiting_for_human', 'medium', 'heartbeat_stale', 'at_risk'].includes(lower)) return 'warning';
  if (['error', 'critical', 'blocked', 'failed', 'urgent', 'open', 'rejected', 'missed', 'offline', 'stalled'].includes(lower)) return 'error';
  if (['info', 'claimed', 'idle', 'backlog', 'in_progress', 'operating_normally', 'ok', 'needs_attention', 'cancelled'].includes(lower)) return 'info';
  return 'default';
}

function badge(label, customText = null) {
  return `<span class="badge badge-${badgeTone(label)}">${escapeHtml(customText || humanize(label))}</span>`;
}

function truthStateClass(item) { return `truth-${item?._truth?.state || 'unknown'}`; }
function truthDot(item) { return `<span class="truth-dot ${truthStateClass(item)}"></span>`; }
function truthBadge(item) {
  const state = item?._truth?.state || 'unknown';
  return `<span class="badge badge-${badgeTone(state)}">${truthDot(item)}${escapeHtml(state)}</span>`;
}
function important(text) { return `<span class="table-strong">${escapeHtml(text ?? '—')}</span>`; }
function getViewLabel(key) { return VIEW_DEFS.find((view) => view.key === key)?.label || 'Overview'; }
function getOpenAlerts() { return (state?.alerts || []).filter((alert) => String(alert.status).toLowerCase() === 'open'); }
function getPendingApprovals() { return (state?.approvals || []).filter((approval) => String(approval.status).toLowerCase() === 'pending'); }
function getLaneSummaryMap() { const map = new Map(); (state?.overview?.laneSummaries || []).forEach((item) => map.set(item.lane, item.count)); return map; }
function navigateTo(view) { currentView = view; location.hash = view; draw(); }

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
  nav.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => navigateTo(button.dataset.view)));
}

function renderKpiCard(label, value, description, tone = 'info', isMoney = false) {
  return `
    <article class="card kpi-card kpi-card--${tone}">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div class="metric-value ${isMoney ? 'is-money' : ''}">${escapeHtml(value)}</div>
      <div class="kpi-description">${escapeHtml(description)}</div>
    </article>
  `;
}

function getNeedsMeCount() {
  return getPendingApprovals().length + (state?.tasks || []).filter((task) => task.status === 'waiting_for_human').length;
}

function computeDataConfidence(dataQuality = {}) {
  const total = Object.values(dataQuality).reduce((sum, value) => sum + Number(value || 0), 0);
  if (!total) return 0;
  return Math.round(((Number(dataQuality.verified || 0)) / total) * 100);
}

function getStatusBannerState() {
  const agent = state?.agents?.[0];
  const approvals = getPendingApprovals().length;
  const waitingTasks = (state?.tasks || []).filter((task) => task.status === 'waiting_for_human').length;
  const commitments = state?.commitments || [];
  const atRisk = commitments.filter((item) => item.status === 'at_risk').length;
  const missed = commitments.filter((item) => item.status === 'missed').length;
  const heartbeatAgeMs = agent?.lastHeartbeatAt ? Date.now() - new Date(agent.lastHeartbeatAt).getTime() : Number.POSITIVE_INFINITY;
  if (!agent?.lastHeartbeatAt || heartbeatAgeMs > 2 * 60 * 60 * 1000) return 'offline';
  if (missed || getOpenAlerts().some((alert) => String(alert.severity).toLowerCase() === 'critical') || heartbeatAgeMs > 30 * 60 * 1000) return 'stalled';
  if (approvals || waitingTasks || atRisk || heartbeatAgeMs > 10 * 60 * 1000) return 'attention';
  return 'ok';
}

function formatBannerLabel(stateKey) {
  return ({ ok: 'OPERATING NORMALLY', attention: 'NEEDS ATTENTION', stalled: 'STALLED', offline: 'OFFLINE' })[stateKey] || 'OPERATING NORMALLY';
}

function renderStatusBanner() {
  const agent = state?.agents?.[0] || {};
  const stateKey = getStatusBannerState();
  const needsMe = getNeedsMeCount();
  const attentionCopy = needsMe ? `${needsMe} item${needsMe === 1 ? '' : 's'} need${needsMe === 1 ? 's' : ''} your attention` : 'No human input needed';
  return `
    <section class="status-banner status-banner--${stateKey}">
      <div class="status-banner__top">
        <div class="status-banner__label">${badge(stateKey, formatBannerLabel(stateKey))}</div>
        <div class="status-banner__age">${escapeHtml(formatRelative(agent.lastHeartbeatAt))}</div>
      </div>
      <div class="status-banner__line"><span class="status-banner__key">Currently:</span> ${escapeHtml(agent.currentTaskSummary || 'No live task recorded')}</div>
      <div class="status-banner__meta">
        <span><span class="status-banner__key">Since:</span> ${escapeHtml(formatDateTime(agent.lastHeartbeatAt))}</span>
        <span><span class="status-banner__key">Duration:</span> ${escapeHtml(formatRelative(agent.lastHeartbeatAt).replace('ago', '').trim() || 'just now')}</span>
      </div>
      <div class="status-banner__line"><span class="status-banner__key">Next:</span> ${escapeHtml(state?.meta?.nextActions?.[0] || 'No next action recorded')}</div>
      <div class="status-banner__footer">
        <span>${escapeHtml(attentionCopy)}</span>
        <button type="button" class="btn btn-secondary" data-nav-view="approvals">View →</button>
      </div>
    </section>
  `;
}

function getCommitmentTimeContext(commitment) {
  const due = commitment?.dueBy ? new Date(commitment.dueBy).getTime() : null;
  const resolved = commitment?.resolvedAt ? new Date(commitment.resolvedAt).getTime() : null;
  if (!due) return 'No deadline';
  const deltaMs = (resolved || Date.now()) - due;
  const absMin = Math.round(Math.abs(deltaMs) / 60000);
  const hrs = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const span = hrs ? `${hrs}h ${mins}m` : `${mins}min`;
  if (commitment.status === 'delivered') return deltaMs <= 0 ? `✓ ${span} ahead of schedule` : `✓ ${span} late (still delivered)`;
  if (commitment.status === 'missed') return `✗ overdue by ${span}`;
  if (commitment.status === 'at_risk' || commitment.status === 'in_progress') return `⏱ ${span} remaining`;
  return commitment.proof ? `✓ ${commitment.proof}` : 'Cancelled';
}

function renderCommitments() {
  const commitments = [...(state?.commitments || [])].sort((a, b) => new Date(b.madeAt || 0) - new Date(a.madeAt || 0));
  if (!commitments.length) return '';
  const stats = state?.overview?.commitmentStats || {};
  return `
    <section class="card">
      <div class="card-header">
        <h3>Commitments</h3>
        <div class="card-subtitle">${stats.commitmentsMade || commitments.length} made · ${stats.delivered || 0} delivered · ${stats.missed || 0} missed</div>
      </div>
      <div class="commitment-list">
        ${commitments.map((item) => `
          <div class="commitment-row commitment-row--${escapeHtml(item.status || 'in_progress')}" data-commitment-due-by="${escapeHtml(item.dueBy || '')}" data-commitment-status="${escapeHtml(item.status || 'in_progress')}" data-commitment-resolved-at="${escapeHtml(item.resolvedAt || '')}">
            <div class="commitment-row__main">
              <div class="commitment-row__title">${badge(item.status || 'in_progress')}${escapeHtml(item.title || 'Untitled commitment')}</div>
              <div class="commitment-row__context">${escapeHtml(item.context || 'No context recorded')}</div>
            </div>
            <div class="commitment-countdown">${escapeHtml(getCommitmentTimeContext(item))}</div>
            ${item.status === 'in_progress' ? renderNudgeButton('deadline_extension', item.title, 'Extend deadline') : ''}
            ${item.status === 'missed' ? renderNudgeButton('instruction', item.title, 'Acknowledged') : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderDeliveryScorecard() {
  const stats = state?.overview?.commitmentStats || {};
  const deliveryRate = stats.commitmentsMade ? Math.round(((stats.delivered || 0) / stats.commitmentsMade) * 100) : 0;
  const onTimeRate = stats.delivered ? `${stats.onTime || 0}/${stats.delivered}` : '0/0';
  const tone = deliveryRate > 80 ? 'success' : deliveryRate >= 50 ? 'warning' : 'error';
  return `
    <section class="card">
      <div class="card-header">
        <h3>Delivery Track Record</h3>
        <div class="card-subtitle">Last 7 days</div>
      </div>
      <div class="scorecard-row scorecard-row--${tone}">Delivered: <strong>${stats.delivered || 0}/${stats.commitmentsMade || 0} (${deliveryRate}%)</strong> <span>|</span> On time: <strong>${onTimeRate}</strong> <span>|</span> Avg delivery: <strong>${escapeHtml(stats.avgDeliveryLead || '—')}</strong></div>
    </section>
  `;
}

function renderKpiStrip() {
  const overview = state?.overview || {};
  const confidence = computeDataConfidence(overview.dataQuality || {});
  const needsMe = getNeedsMeCount();
  return `
    <section class="grid kpi-grid">
      ${renderKpiCard('Tasks Active', String(overview.tasksInProgress ?? 0), 'Things being actively pushed right now.', 'info')}
      ${renderKpiCard('Needs Me', String(needsMe), 'Approvals or waiting-for-human blockers.', needsMe >= 3 ? 'error' : needsMe >= 1 ? 'warning' : 'success')}
      ${renderKpiCard('Spend Today', money(overview.spendTodayUsd ?? 0), 'Usage-backed cost for the day.', 'accent', true)}
      ${renderKpiCard('Data Confidence', `${confidence}% verified`, 'Verified entities across the current state.', confidence > 80 ? 'success' : confidence >= 50 ? 'warning' : 'error')}
    </section>
  `;
}

function renderCurrentWork() {
  const tasks = (state?.tasks || []).filter((task) => task.lane === 'now');
  return `
    <section class="card">
      <div class="card-header">
        <h3>Current Work</h3>
        <div class="card-subtitle">${tasks.length} active</div>
      </div>
      <div class="current-work-list">
        ${tasks.length ? tasks.map((task) => `
          <div class="current-work-item">
            <span class="current-work-item__dot"></span>
            <span class="current-work-item__title">${escapeHtml(task.title || 'Untitled task')}</span>
            <span>${badge(task.status || 'in_progress')}</span>
            <span>${badge(task.project || 'general')}</span>
            ${renderNudgeButton('status_request', task.title, 'Ask for update')}
          </div>
        `).join('') : '<div class="empty-copy">No active now-lane tasks.</div>'}
      </div>
      <div class="section-footer"><button type="button" class="link-button" data-nav-view="work">View all →</button></div>
    </section>
  `;
}

function renderCompactProblems() {
  const problems = getOpenAlerts();
  return `
    <article class="card">
      <div class="card-header">
        <h3>Problems</h3>
        <div class="card-subtitle">${problems.length} open</div>
      </div>
      <div class="problem-list">
        ${problems.length ? problems.filter((p) => !isSnoozed(p.title)).map((problem, index) => `
          <div class="problem-card problem-item${index === 0 ? '' : ''}">
            <button class="problem-toggle" type="button">
              <span class="problem-toggle__title">${badge(problem.severity || problem.status || 'info')}${escapeHtml(problem.title || 'Untitled problem')}</span>
            </button>
            <div class="problem-description">${escapeHtml(problem.description || 'No details available.')}</div>
            <div class="problem-next">→ Next: ${escapeHtml(problem.recommendedAction || 'Review the state and respond.')}</div>
            <div class="problem-actions">
              <button class="btn btn-secondary btn-sm snooze-btn" type="button" data-snooze-id="${escapeHtml(problem.title)}">Snooze 24h</button>
              ${renderNudgeButton('priority_change', problem.title, 'Prioritize this')}
            </div>
          </div>
        `).join('') : '<div class="empty-copy">No open problems.</div>'}
      </div>
    </article>
  `;
}

function renderCompactApprovals() {
  const approvals = getPendingApprovals();
  if (!approvals.length) return '';
  return `
    <article class="card">
      <div class="card-header">
        <h3>Needs Your Decision</h3>
        <div class="card-subtitle">${approvals.length} pending</div>
      </div>
      <div class="compact-approval-list">
        ${approvals.map((approval) => `
          <div class="compact-approval-item" data-approval-id="${escapeHtml(approval.id)}">
            <div class="compact-approval-item__title">${escapeHtml(approval.title || approval.id)}</div>
            <div class="compact-approval-item__meta">Requested by: ${escapeHtml(approval.requestedBy || 'Mission Control')} · ${escapeHtml(humanize(approval.urgency || 'medium'))} urgency</div>
            <div class="action-row">
              <button class="btn btn-success" type="button" data-approval-action="approved" data-approval-id="${escapeHtml(approval.id)}">Approve</button>
              <button class="btn btn-destructive" type="button" data-approval-action="rejected" data-approval-id="${escapeHtml(approval.id)}">Reject</button>
            </div>
            <div class="approval-notes-toggle"><button class="link-button approval-notes-btn" type="button">+ Add notes</button></div>
            <div class="approval-notes-field" style="display:none"><textarea class="approval-notes-input" rows="2" placeholder="Optional notes..." data-approval-notes-for="${escapeHtml(approval.id)}"></textarea></div>
            <div class="confirmation-slot"></div>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderCompactActivity() {
  const events = [...(state?.events || [])].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 5);
  return `
    <section class="card">
      <div class="card-header">
        <h3>Recent Activity</h3>
        <div class="card-subtitle">Last 5 events</div>
      </div>
      <div class="activity-list">
        ${events.map((event) => `
          <div class="activity-row">
            <span class="activity-row__time">${escapeHtml(formatDateTime(event.timestamp))}</span>
            <span class="activity-row__summary">${escapeHtml(event.summary || 'Untitled event')}</span>
            <span>${badge(event.verificationState || event.status || 'info')}</span>
          </div>
        `).join('')}
      </div>
      <div class="section-footer"><button type="button" class="link-button" data-nav-view="events">View all →</button></div>
    </section>
  `;
}

/* ── AI Summary Hero Card ── */
function renderSummaryCard() {
  if (aiSummaryLoading && !aiSummary) {
    return `<section class="card ai-summary-card ai-summary-card--loading" id="ai-summary-card">
      <div class="ai-summary-skeleton">
        <div class="skeleton-line skeleton-line--short"></div>
        <div class="skeleton-line skeleton-line--long"></div>
        <div class="skeleton-line skeleton-line--medium"></div>
      </div>
    </section>`;
  }
  if (!aiSummary) return '<div id="ai-summary-card"></div>';
  const s = aiSummary;
  const statusLabel = { ok: 'All systems nominal', attention: 'Needs attention', stalled: 'Stalled', offline: 'Offline' }[s.status] || 'Unknown';
  const ageMs = s.generatedAt ? Date.now() - new Date(s.generatedAt).getTime() : 0;
  const ageMin = Math.round(ageMs / 60000);
  const ageText = ageMin < 1 ? 'just now' : `${ageMin} min ago`;
  return `<section class="card ai-summary-card ai-summary-card--${escapeHtml(s.status || 'ok')}" id="ai-summary-card">
    <div class="ai-summary-header">
      <span class="ai-summary-dot ai-summary-dot--${escapeHtml(s.status || 'ok')}"></span>
      <span class="ai-summary-status">${escapeHtml(statusLabel)}</span>
      <span class="ai-summary-age">Last update: ${escapeHtml(ageText)}</span>
    </div>
    <div class="ai-summary-greeting">${escapeHtml(s.greeting || '')}</div>
    <div class="ai-summary-body">${escapeHtml(s.summary || '')}</div>
  </section>`;
}

async function fetchSummary(digest = false) {
  if (digest) {
    try {
      const res = await fetch(`/api/summary?digest=true&ts=${Date.now()}`);
      if (res.ok) digestData = await res.json();
    } catch { /* digest fetch failed silently */ }
    return;
  }
  // Skip if already loading or state hasn't changed since last fetch
  if (aiSummaryLoading) return;
  if (aiSummary && aiSummary.lastStateUpdate === state?.meta?.generatedAt) return;
  aiSummaryLoading = true;
  const el = document.getElementById('ai-summary-card');
  if (el && !aiSummary) el.outerHTML = renderSummaryCard();
  try {
    const res = await fetch(`/api/summary?ts=${Date.now()}`);
    if (res.ok) aiSummary = await res.json();
  } catch { /* summary fetch failed silently */ }
  aiSummaryLoading = false;
  const el2 = document.getElementById('ai-summary-card');
  if (el2) el2.outerHTML = renderSummaryCard();
}

/* ── Morning Digest ── */
function shouldShowDigest() {
  if (digestDismissed) return false;
  const lastVisit = localStorage.getItem('mc_lastVisit');
  if (!lastVisit) return true;
  return Date.now() - Number(lastVisit) > 8 * 60 * 60 * 1000;
}

function renderDigestCard() {
  if (!digestData || digestDismissed) return '';
  return `<section class="card ai-digest-card" id="ai-digest-card">
    <div class="ai-digest-header">
      <span class="ai-digest-icon">\u2600</span>
      <span class="ai-digest-title">While you were away...</span>
    </div>
    <div class="ai-digest-body">${escapeHtml(digestData.summary || 'No overnight activity to report.')}</div>
    <div class="ai-digest-footer">
      <button class="btn btn-secondary" id="dismiss-digest" type="button">Got it \u2192</button>
    </div>
  </section>`;
}

/* ── Nudge System ── */
function isNudgeEnabled() { return !!state?.meta?.nudgeEnabled; }

function renderNudgeBar() {
  if (!isNudgeEnabled()) return '';
  return `<section class="nudge-bar" id="nudge-bar">
    <div class="nudge-bar-inner">
      <input type="text" class="nudge-input" id="nudge-input" placeholder="Tell Mansa something..." maxlength="500" />
      <button class="btn btn-primary nudge-send" id="nudge-send" type="button">Send</button>
    </div>
  </section>`;
}

async function sendNudge(type, targetId, message) {
  try {
    const res = await fetch('/api/nudge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, targetId: targetId || null, message, ts: new Date().toISOString() })
    });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

function renderNudgeButton(type, targetId, label) {
  if (!isNudgeEnabled()) return '';
  return `<button class="btn btn-secondary btn-sm nudge-action-btn" type="button" data-nudge-type="${escapeHtml(type)}" data-nudge-target="${escapeHtml(targetId || '')}" data-nudge-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function isSnoozed(alertId) {
  const snoozedAt = localStorage.getItem(`mc_snoozed_${alertId}`);
  if (!snoozedAt) return false;
  return Date.now() - Number(snoozedAt) < 24 * 60 * 60 * 1000;
}

function renderOverview() {
  return `
    ${renderSummaryCard()}
    ${renderDigestCard()}
    ${renderStatusBanner()}
    ${renderCommitments()}
    ${renderDeliveryScorecard()}
    ${renderKpiStrip()}
    ${renderCurrentWork()}
    <section class="grid split-grid">
      ${renderCompactProblems()}
      ${renderCompactApprovals()}
    </section>
    ${renderCompactActivity()}
    ${renderNudgeBar()}
  `;
}

function renderWork() {
  const laneSummaryMap = getLaneSummaryMap();
  const lanes = LANE_ORDER.map((lane) => ({ key: lane, label: LANE_LABELS[lane] || titleCase(lane), count: laneSummaryMap.get(lane) ?? (state?.tasks || []).filter((task) => task.lane === lane).length, tasks: (state?.tasks || []).filter((task) => task.lane === lane) }));
  return `
    <nav class="kanban-tabs" aria-label="Work lanes">${lanes.map((lane) => `
      <button class="kanban-tab${lane.key === activeKanbanLane ? ' active' : ''}" data-lane="${escapeHtml(lane.key)}" type="button">${escapeHtml(lane.label)} <span style="opacity:0.6">${lane.count}</span></button>`).join('')}
    </nav>
    <section class="kanban-board grid">${lanes.map((lane) => `
      <article class="card lane-column kanban-column${lane.key === activeKanbanLane ? ' active' : ''}" data-lane="${escapeHtml(lane.key)}">
        <div class="card-header"><h3>${escapeHtml(lane.label)}</h3><span class="count-pill">${lane.count}</span></div>
        <div class="task-stack">${lane.tasks.length ? lane.tasks.map((task) => `
          <article class="task-card card-interactive"><h4 class="task-title">${escapeHtml(humanize(task.title))}</h4><div class="badge-row">${badge(task.status || 'unknown')}${badge(task.priority || 'default')}${badge(task.project || 'general')}${task.approvalRequired ? badge('waiting_for_human') : ''}</div><div class="list-item-copy">${escapeHtml(task.latestUpdate || 'No update recorded.')}</div><div class="source-ref">${escapeHtml(task.sourceRef || 'work/TASKS.md')}</div></article>`).join('') : '<div class="empty-state empty-state-compact"><div class="empty-copy">No items</div></div>'}</div>
      </article>`).join('')}
    </section>`;
}

function renderApprovals() {
  const approvals = state?.approvals || [];
  if (!approvals.length) return '<section class="card"><div class="empty-state"><div><div class="task-title">No approvals waiting</div><div class="empty-copy">Approval cards will appear here when the ledger has pending decisions.</div></div></div></section>';
  return `
    <section class="grid approvals-grid">${approvals.map((approval) => `
      <article class="card approval-card" data-approval-id="${escapeHtml(approval.id)}"><div class="approval-header"><h3 class="approval-title">${escapeHtml(approval.title || approval.id)}</h3>${badge(approval.status || 'pending')}</div><div class="key-value-grid approval-meta"><div class="key-label">Urgency</div><div class="key-value">${badge(approval.urgency || 'medium')}</div><div class="key-label">Risk</div><div class="key-value">${escapeHtml(humanize(approval.riskCategory || 'other'))}</div><div class="key-label">Requested by</div><div class="key-value">${escapeHtml(approval.requestedBy || 'Mission Control')}</div><div class="key-label">Requested at</div><div class="key-value table-mono">${escapeHtml(formatDateTime(approval.requestedAt))}</div></div><p class="approval-reason">${escapeHtml(approval.reason || 'No reason recorded.')}</p><div class="approval-consequence">${escapeHtml(approval.consequence || 'Decision consequence not recorded.')}</div>${String(approval.status).toLowerCase() === 'pending' ? `<div class="action-row" style="margin-top:12px;"><button class="btn btn-success" type="button" data-approval-action="approved" data-approval-id="${escapeHtml(approval.id)}">Approve</button><button class="btn btn-destructive" type="button" data-approval-action="rejected" data-approval-id="${escapeHtml(approval.id)}">Reject</button></div><div class="approval-notes-toggle"><button class="link-button approval-notes-btn" type="button">+ Add notes</button></div><div class="approval-notes-field" style="display:none"><textarea class="approval-notes-input" rows="2" placeholder="Optional notes..." data-approval-notes-for="${escapeHtml(approval.id)}"></textarea></div><div class="confirmation-slot"></div>` : '<div class="confirmation-inline">Resolution recorded.</div>'}</article>`).join('')}
    </section>`;
}

function renderEvents() {
  const events = [...(state?.events || [])].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  return `
    <section class="card events-card"><div class="card-header"><h3>Event Ledger</h3><div class="card-subtitle">Reverse chronological</div></div><div class="events-list">${events.map((event) => `
      <div class="events-list-item"><div class="event-time">${escapeHtml(formatDateTime(event.timestamp))}</div><div class="list-item-copy">${escapeHtml(event.actor || 'Unknown actor')}</div><div class="list-item-copy">${escapeHtml(humanize(event.type || 'event'))}</div><div class="event-summary">${escapeHtml(event.summary || 'No summary')}</div><div>${badge(event.status || 'info')}</div><div>${truthBadge(event)}</div></div>`).join('')}</div></section>`;
}

function renderDeliveryHistory() {
  const items = [...(state?.commitments || [])].filter((item) => ['delivered', 'missed'].includes(item.status)).sort((a, b) => new Date(b.madeAt || 0) - new Date(a.madeAt || 0));
  if (!items.length) return '';
  return `
    <div class="delivery-history"><div class="memory-block-title">Delivery History</div>${items.map((item) => `<div class="delivery-history-row"><span class="delivery-history-row__date">${escapeHtml(formatDateTime(item.madeAt))}</span><span class="delivery-history-row__title">${badge(item.status || 'in_progress')}${escapeHtml(item.title || 'Untitled commitment')}</span><span class="delivery-history-row__time">${escapeHtml(getCommitmentTimeContext(item))}</span></div>`).join('')}</div>`;
}

function renderAgents() {
  const agents = state?.agents || [];
  return `
    <section class="grid agent-grid">${agents.map((agent, index) => `
      <article class="card agent-card"><div class="agent-header"><div><div class="agent-name">${truthDot(agent)}${escapeHtml(agent.name || 'Unnamed agent')}</div></div>${badge(agent.status || 'unknown')}</div><p class="agent-role">${escapeHtml(agent.role || 'No role recorded.')}</p><div class="key-value-grid agent-meta"><div class="key-label">Model</div><div class="key-value">${escapeHtml(agent.model || 'unknown')}</div><div class="key-label">Environment</div><div class="key-value">${escapeHtml(agent.environment || agent.provider || 'unknown')}</div><div class="key-label">Current Task</div><div class="key-value">${escapeHtml(agent.currentTaskSummary || '—')}</div><div class="key-label">Health</div><div class="key-value">${badge(agent.health || 'unknown')}</div><div class="key-label">Last Seen</div><div class="key-value">${escapeHtml(formatRelative(agent.lastSeenAt))}</div><div class="key-label">Activity</div><div class="key-value">${escapeHtml(String(agent.recentActivityCount ?? 0))}</div></div>${index === 0 ? renderDeliveryHistory() : ''}</article>`).join('')}
    </section>`;
}

function renderSchedule() { const schedules = state?.schedules || []; return `
<section class="card"><div class="card-header"><h3>Schedule</h3><div class="card-subtitle">Run ledger</div></div><div class="table-wrap"><table class="table"><thead><tr><th>Name / Description</th><th>Status</th><th>Owner</th><th>Last Run</th><th>Last Result</th><th>Next Run</th></tr></thead><tbody>${schedules.map((schedule) => `<tr><td>${important(schedule.name || 'Unnamed schedule')}<div class="list-item-copy">${escapeHtml(schedule.humanReadable || schedule.description || 'No description')}</div></td><td>${badge(schedule.status || 'unknown')}</td><td>${important(schedule.ownerAgent || '—')}</td><td class="table-mono">${escapeHtml(formatRelative(schedule.lastRunAt))}</td><td>${badge(schedule.lastRunStatus || 'unknown')}</td><td class="table-mono">${escapeHtml(formatDateTime(schedule.nextRunAt))}</td></tr>`).join('')}</tbody></table></div></section>`; }
function renderUsageCost() { const usage = state?.usage || []; const total = usage.reduce((sum, row) => sum + Number(row.estimatedCostUsd || 0), 0); const topDriver = [...usage].sort((a, b) => Number(b.estimatedCostUsd || 0) - Number(a.estimatedCostUsd || 0))[0]; const truthLevel = state?.truthGaps?.usageCost || (usage.length ? 'verified' : 'unknown'); return `
<section class="grid grid-3">${renderKpiCard('Total Spend Today', money(total), usage.length ? 'Usage rows loaded from ledger files.' : 'No usage rows found yet.', 'accent', true)}${renderKpiCard('Top Cost Driver', topDriver?.agent || '—', topDriver ? `${money(topDriver.estimatedCostUsd)} · ${humanize(topDriver.operationType)}` : 'Waiting for ledger data.', 'info')}${renderKpiCard('Truth Level', titleCase(truthLevel), 'Confidence state for usage and cost data.', 'success')}</section>${usage.length ? `<section class="card"><div class="card-header"><h3>Usage Records</h3><div class="card-subtitle">Structured ledger rows</div></div><div class="table-wrap"><table class="table usage-table"><thead><tr><th>Agent</th><th>Model</th><th>Provider</th><th>Operation</th><th>Cost</th><th>Duration</th><th>Success</th><th>Source</th></tr></thead><tbody>${usage.map((row) => `<tr><td data-label="Agent">${important(row.agent || 'Unknown')}</td><td data-label="Model">${important(row.model || 'unknown')}</td><td data-label="Provider">${escapeHtml(row.provider || 'unknown')}</td><td data-label="Operation">${escapeHtml(humanize(row.operationType || 'unknown'))}</td><td data-label="Cost" class="table-mono table-strong">${escapeHtml(money(row.estimatedCostUsd || 0))}</td><td data-label="Duration" class="table-mono">${escapeHtml(duration(row.durationMs))}</td><td data-label="Success">${badge(row.success ? 'success' : 'failed')}</td><td data-label="Source" class="table-mono">${escapeHtml(row.sourcePath || row._truth?.source || '—')}</td></tr>`).join('')}</tbody></table></div></section>` : `<section class="card"><div class="empty-state"><div><div class="task-title">No usage records yet</div><div class="empty-copy">Add structured usage ledger files and this view will light up with spend, duration, and source rows.</div></div></div></section>`}`; }
function renderArtifacts() { const artifacts = state?.artifacts || []; return `<section class="grid artifacts-grid">${artifacts.map((artifact) => `<article class="card artifact-card"><div class="artifact-header"><div class="artifact-title">${escapeHtml(artifact.title || 'Untitled artifact')}</div>${badge(artifact.category || 'artifact')}</div><div class="key-value-grid artifact-meta"><div class="key-label">Format</div><div class="key-value">${escapeHtml(artifact.format || '—')}</div><div class="key-label">Project</div><div class="key-value">${escapeHtml(artifact.project || '—')}</div><div class="key-label">Creator</div><div class="key-value">${escapeHtml(artifact.creator || '—')}</div><div class="key-label">Created</div><div class="key-value table-mono">${escapeHtml(formatDateTime(artifact.createdAt))}</div><div class="key-label">Path</div><div class="key-value path-mono">${escapeHtml(artifact.path || '—')}</div></div></article>`).join('')}</section>`; }
function renderIntel() { const memory = state?.memory || {}; return `<section class="grid memory-grid"><article class="card"><div class="card-header"><h3>Memory Intelligence</h3><div class="card-subtitle">Key events, decisions, facts</div></div><div class="memory-block"><div class="memory-block-title">Key Events</div><ul class="memory-list">${(memory.keyEvents || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No key events found.</li>'}</ul></div><div class="memory-block"><div class="memory-block-title">Decisions</div><ul class="memory-list">${(memory.decisions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No decisions found.</li>'}</ul></div><div class="memory-block"><div class="memory-block-title">Facts</div><ul class="memory-list">${(memory.facts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No facts found.</li>'}</ul></div></article><article class="card"><div class="card-header"><h3>Spec & Sources</h3><div class="card-subtitle">Grounding inputs</div></div><div class="memory-block"><div class="memory-block-title">Spec</div><div class="list-item-copy">${escapeHtml(state?.spec?.title || 'Mission Control spec')}</div><div class="list-item-copy">${escapeHtml(state?.spec?.status || 'Status unavailable')}</div></div><div class="memory-block"><div class="memory-block-title">Focus</div><div class="spec-source-list">${(state?.spec?.focus || []).map((item) => `<code>${escapeHtml(item)}</code>`).join('') || '<code>No focus items</code>'}</div></div><div class="memory-block"><div class="memory-block-title">Sources</div><div class="spec-source-list">${(state?.meta?.dataSources || []).map((source) => `<code>${escapeHtml(source)}</code>`).join('') || '<code>No sources found</code>'}</div></div></article></section>`; }

const RENDERERS = { overview: renderOverview, work: renderWork, approvals: renderApprovals, events: renderEvents, agents: renderAgents, schedule: renderSchedule, 'usage-cost': renderUsageCost, artifacts: renderArtifacts, intel: renderIntel };

function updateCommitmentCountdowns() {
  document.querySelectorAll('[data-commitment-due-by]').forEach((row) => {
    const dueBy = row.getAttribute('data-commitment-due-by');
    const status = row.getAttribute('data-commitment-status');
    const resolvedAt = row.getAttribute('data-commitment-resolved-at');
    const target = row.querySelector('.commitment-countdown');
    if (!target || !dueBy) return;
    target.textContent = getCommitmentTimeContext({ dueBy, status, resolvedAt });
  });
}

function bindNavButtons() { app.querySelectorAll('[data-nav-view]').forEach((button) => button.addEventListener('click', () => navigateTo(button.dataset.navView))); }

function draw() {
  if (!RENDERERS[currentView]) currentView = 'overview';
  viewTitle.textContent = getViewLabel(currentView);
  renderNav();
  app.classList.remove('fade-in'); void app.offsetWidth; app.classList.add('fade-in');
  app.innerHTML = RENDERERS[currentView]();
  bindNavButtons(); bindApprovalActions(); bindApprovalNotes();
  if (currentView === 'work') initKanbanTabs();
  if (currentView === 'overview') {
    initProblemsAccordion(); updateCommitmentCountdowns();
    clearInterval(commitmentCountdownInterval); commitmentCountdownInterval = setInterval(updateCommitmentCountdowns, 30000);
    if (!aiSummaryLoading) fetchSummary();
    bindNudgeActions(); bindSnoozeActions(); bindDigestDismiss();
  } else { clearInterval(commitmentCountdownInterval); commitmentCountdownInterval = null; }
}

function bindApprovalActions() {
  app.querySelectorAll('[data-approval-action]').forEach((button) => button.addEventListener('click', async () => {
    const id = button.dataset.approvalId;
    const resolution = button.dataset.approvalAction;
    const card = button.closest('[data-approval-id]');
    const slot = card?.querySelector('.confirmation-slot');
    const notesInput = card?.querySelector(`[data-approval-notes-for="${id}"]`);
    const notes = notesInput?.value?.trim() || '';
    await resolveApproval(id, resolution, slot, notes);
  }));
}

function bindApprovalNotes() {
  app.querySelectorAll('.approval-notes-btn').forEach((btn) => btn.addEventListener('click', () => {
    const field = btn.closest('.approval-notes-toggle')?.nextElementSibling;
    if (field) field.style.display = field.style.display === 'none' ? 'block' : 'none';
  }));
}

function bindNudgeActions() {
  const sendBtn = document.getElementById('nudge-send');
  const input = document.getElementById('nudge-input');
  if (sendBtn && input) {
    const doSend = async () => {
      const msg = input.value.trim();
      if (!msg) return;
      sendBtn.disabled = true; sendBtn.textContent = '...';
      const result = await sendNudge('instruction', null, msg);
      if (result) { input.value = ''; sendBtn.textContent = '\u2713 Sent'; }
      else { sendBtn.textContent = 'Failed'; sendBtn.classList.add('nudge-error'); }
      setTimeout(() => { sendBtn.disabled = false; sendBtn.textContent = 'Send'; sendBtn.classList.remove('nudge-error'); }, 3000);
    };
    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSend(); } });
  }

  app.querySelectorAll('.nudge-action-btn').forEach((btn) => btn.addEventListener('click', async () => {
    const type = btn.dataset.nudgeType;
    const target = btn.dataset.nudgeTarget;
    const label = btn.dataset.nudgeLabel;
    btn.disabled = true; btn.textContent = '...';
    const result = await sendNudge(type, target, label);
    if (result) { btn.textContent = '\u2713 Sent'; }
    else { btn.textContent = 'Failed'; btn.classList.add('nudge-error'); }
    setTimeout(() => { btn.disabled = false; btn.textContent = label; btn.classList.remove('nudge-error'); }, 5000);
  }));
}

function bindSnoozeActions() {
  app.querySelectorAll('.snooze-btn').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.dataset.snoozeId;
    localStorage.setItem(`mc_snoozed_${id}`, String(Date.now()));
    const card = btn.closest('.problem-card');
    if (card) card.style.display = 'none';
  }));
}

function bindDigestDismiss() {
  const btn = document.getElementById('dismiss-digest');
  if (btn) btn.addEventListener('click', () => {
    digestDismissed = true;
    localStorage.setItem('mc_lastVisit', String(Date.now()));
    const card = document.getElementById('ai-digest-card');
    if (card) card.remove();
  });
}

function getFreshnessClass(value) { const ageMin = value ? (Date.now() - new Date(value).getTime()) / 60000 : Number.POSITIVE_INFINITY; if (ageMin < 5) return 'fresh'; if (ageMin <= 30) return 'aging'; return 'stale'; }
async function loadState() {
  const cacheBust = Date.now(); let response;
  try { response = await fetch(`/api/state?ts=${cacheBust}`); } catch { response = null; }
  if (response?.ok) state = await response.json(); else { const fallback = await fetch(`./data/state.json?ts=${cacheBust}`); state = await fallback.json(); }
  sourceCount.textContent = `${state?.meta?.dataSources?.length || 0} sources`;
  const freshnessClass = getFreshnessClass(state?.meta?.generatedAt);
  generatedAtEl.innerHTML = `<span class="freshness-dot freshness-${freshnessClass}"></span>Generated ${escapeHtml(formatDateTime(state?.meta?.generatedAt))}`;
  lastRefreshedEl.textContent = `Last refreshed ${formatTime(new Date())}`;
  openAlertsEl.textContent = `${getOpenAlerts().length} open alerts`;
  draw();
}

async function resolveApproval(id, resolution, slot, notes = '') { if (!id) return; if (slot) slot.innerHTML = ''; try { const response = await fetch(`/api/approvals/${encodeURIComponent(id)}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolution, notes }) }); if (!response.ok) throw new Error(`Request failed with ${response.status}`); if (slot) slot.innerHTML = `<div class="confirmation-inline">${escapeHtml(titleCase(resolution))} recorded. Reloading state…</div>`; await loadState(); } catch (error) { if (slot) slot.innerHTML = `<div class="error-inline">${escapeHtml(error.message || 'Approval write failed.')}</div>`; } }
function syncHash() { const next = location.hash.replace('#', ''); if (next && RENDERERS[next]) { currentView = next; draw(); } }
function initMobileDrawer() { const hamburger = document.getElementById('hamburger-btn'); const sidebar = document.getElementById('sidebar'); const overlay = document.getElementById('sidebar-overlay'); if (!hamburger || !sidebar || !overlay) return; function openDrawer() { sidebar.classList.add('open'); overlay.classList.add('visible'); document.body.style.overflow = 'hidden'; } function closeDrawer() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); document.body.style.overflow = ''; } hamburger.addEventListener('click', () => { sidebar.classList.contains('open') ? closeDrawer() : openDrawer(); }); overlay.addEventListener('click', closeDrawer); sidebar.addEventListener('click', (e) => { if (e.target.closest('.nav-item') && window.innerWidth <= 768) closeDrawer(); }); }
function initProblemsAccordion() { document.querySelectorAll('.problem-card').forEach((card) => { const toggle = card.querySelector('.problem-toggle'); toggle?.addEventListener('click', () => card.classList.toggle('expanded')); }); }
function initKanbanTabs() { const tabs = document.querySelector('.kanban-tabs'); if (!tabs) return; tabs.querySelectorAll('.kanban-tab').forEach((tab) => tab.addEventListener('click', () => { activeKanbanLane = tab.dataset.lane; syncKanbanTabs(); })); syncKanbanTabs(); }
function syncKanbanTabs() { document.querySelectorAll('.kanban-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.lane === activeKanbanLane)); document.querySelectorAll('.kanban-column').forEach((col) => col.classList.toggle('active', col.dataset.lane === activeKanbanLane)); }
async function init() {
  refreshButton.addEventListener('click', () => loadState());
  window.addEventListener('hashchange', syncHash);
  initMobileDrawer();
  await loadState();
  if (shouldShowDigest()) { await fetchSummary(true); if (digestData) draw(); }
  localStorage.setItem('mc_lastVisit', String(Date.now()));
  refreshInterval = setInterval(async () => { await loadState(); }, 30000);
}
init();
