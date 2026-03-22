/* ── SVG Icon Library ── */
const ICONS = {
  overview: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
  work: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  approvals: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8l2 2 3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  events: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="1.5" fill="currentColor"/><circle cx="4" cy="8" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><line x1="7" y1="4" x2="14" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  agents: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  schedule: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'usage-cost': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M5 4.5h4.5a2 2 0 010 4H5m0 0h5a2 2 0 010 4H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  artifacts: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 2v4h4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  intel: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="0" x2="8" y2="3" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="13" x2="8" y2="16" stroke="currentColor" stroke-width="1.5"/><line x1="0" y1="8" x2="3" y2="8" stroke="currentColor" stroke-width="1.5"/><line x1="13" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="1.5"/></svg>',
  alert: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="8" y1="6" x2="8" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11" r="0.75" fill="currentColor"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  link: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M7 1h4v4M11 1L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const VIEW_DEFS = [
  { key: 'overview', label: 'Overview', icon: ICONS.overview, group: 'Console' },
  { key: 'work', label: 'Work', icon: ICONS.work, group: 'Console' },
  { key: 'approvals', label: 'Approvals', icon: ICONS.approvals, group: 'Console' },
  { key: 'events', label: 'Events', icon: ICONS.events, group: 'Operations' },
  { key: 'agents', label: 'Agents', icon: ICONS.agents, group: 'Operations' },
  { key: 'schedule', label: 'Schedule', icon: ICONS.schedule, group: 'Operations' },
  { key: 'usage-cost', label: 'Usage / Cost', icon: ICONS['usage-cost'], group: 'Operations' },
  { key: 'artifacts', label: 'Artifacts', icon: ICONS.artifacts, group: 'System' },
  { key: 'intel', label: 'Intel', icon: ICONS.intel, group: 'System' }
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
let currentView = 'overview';
let currentDeepLinkId = null; // e.g. 'task/deploy-v5' or 'approval/cost-cap'
let refreshInterval = null;
let activeKanbanLane = 'now';
let commitmentCountdownInterval = null;
let aiSummary = null;
let aiSummaryLoading = false;
let digestData = null;
let digestDismissed = false;
let liveUsage = null;
let liveUsageLoading = false;

/* ── Path-based Router ── */
function parseRoute() {
  const path = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!path || path === 'index.html') return { view: 'overview', itemType: null, itemId: null };
  const parts = path.split('/');
  const viewKeys = VIEW_DEFS.map(v => v.key);
  if (viewKeys.includes(parts[0])) {
    return { view: parts[0], itemType: parts[1] || null, itemId: parts[2] ? decodeURIComponent(parts[2]) : null };
  }
  // Deep link patterns: /task/{id}, /approval/{id}, /agent/{id}
  const itemTypes = ['task', 'approval', 'agent', 'commitment', 'alert'];
  if (itemTypes.includes(parts[0]) && parts[1]) {
    const viewMap = { task: 'work', approval: 'approvals', agent: 'agents', commitment: 'overview', alert: 'overview' };
    return { view: viewMap[parts[0]] || 'overview', itemType: parts[0], itemId: decodeURIComponent(parts[1]) };
  }
  // Fallback: try hash for backwards compat
  const hash = location.hash.replace('#', '');
  if (hash && viewKeys.includes(hash)) return { view: hash, itemType: null, itemId: null };
  return { view: parts[0] && viewKeys.includes(parts[0]) ? parts[0] : 'overview', itemType: null, itemId: null };
}

function pushRoute(path, replace = false) {
  const url = '/' + path;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

function getItemUrl(type, id) {
  return `/${type}/${encodeURIComponent(id)}`;
}

/* ── Toast Notification System ── */
const toastContainer = document.getElementById('toast-container');
let toastCounter = 0;

function showToast(title, message = '', type = 'info', durationMs = 4000) {
  const id = `toast-${++toastCounter}`;
  const iconMap = { success: ICONS.check, warning: ICONS.alert, error: ICONS.close, info: ICONS.overview };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.id = id;
  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || iconMap.info}</span>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="toast-close" type="button" aria-label="Dismiss">${ICONS.close}</button>
  `;
  toastContainer.appendChild(toast);
  const dismiss = () => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), 200);
  };
  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  if (durationMs > 0) setTimeout(dismiss, durationMs);
  return id;
}

// Initialize route
const initialRoute = parseRoute();
currentView = initialRoute.view;
currentDeepLinkId = initialRoute.itemId ? `${initialRoute.itemType}/${initialRoute.itemId}` : null;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripMarkdown(value = '') {
  return String(value)
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')      // italic
    .replace(/__(.+?)__/g, '$1')      // bold alt
    .replace(/\b_(.+?)_\b/g, '$1')    // italic alt (word-boundary aware, preserves snake_case)
    .replace(/`(.+?)`/g, '$1')        // inline code
    .replace(/#+\s*/g, '')            // headings
    .trim();
}

function humanize(value = '') {
  return String(value).replaceAll('_', ' ').replaceAll('/', ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(value = '') {
  return humanize(value).replace(/\b\w/g, (char) => char.toUpperCase());
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

function costForTask(taskId) {
  const entry = (state?.costByEntity?.byTask || []).find(e => e.taskId === taskId);
  return entry ? entry.costUsd : null;
}

function costForCommitment(commitmentId) {
  const entry = (state?.costByEntity?.byCommitment || []).find(e => e.commitmentId === commitmentId);
  return entry ? entry.costUsd : null;
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
function navigateTo(view, itemType = null, itemId = null) {
  currentView = view;
  currentDeepLinkId = itemType && itemId ? `${itemType}/${itemId}` : null;
  const path = itemType && itemId ? `${itemType}/${encodeURIComponent(itemId)}` : view;
  pushRoute(path);
  draw();
  if (currentDeepLinkId) highlightDeepLinkTarget();
}

function highlightDeepLinkTarget() {
  if (!currentDeepLinkId) return;
  const [type, id] = currentDeepLinkId.split('/');
  const selectorMap = {
    task: `[data-task-id="${id}"]`,
    approval: `[data-approval-id="${id}"]`,
    commitment: `[data-commitment-id="${id}"]`,
    alert: `[data-alert-id="${id}"]`
  };
  const selector = selectorMap[type];
  if (!selector) return;
  requestAnimationFrame(() => {
    const el = document.querySelector(selector);
    if (el) {
      el.classList.add('deep-link-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.classList.remove('deep-link-highlight'), 2000);
    }
  });
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
          <div class="commitment-row commitment-row--${escapeHtml(item.status || 'in_progress')}" data-commitment-id="${escapeHtml(item.id || '')}" data-commitment-due-by="${escapeHtml(item.dueBy || '')}" data-commitment-status="${escapeHtml(item.status || 'in_progress')}" data-commitment-resolved-at="${escapeHtml(item.resolvedAt || '')}">
            <div class="commitment-row__main">
              <div class="commitment-row__title">${badge(item.status || 'in_progress')}${escapeHtml(stripMarkdown(item.title) || 'Untitled commitment')}</div>
              <div class="commitment-row__context">${escapeHtml(item.context || 'No context recorded')}</div>
            </div>
            <div class="commitment-countdown">${escapeHtml(getCommitmentTimeContext(item))}</div>
            ${(() => { const c = costForCommitment(item.id); return c !== null ? `<div class="commitment-cost">${escapeHtml(money(c))}</div>` : ''; })()}
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
            <span class="current-work-item__title">${escapeHtml(stripMarkdown(task.title) || 'Untitled task')}</span>
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
          <div class="problem-card problem-item${index === 0 ? '' : ''}" data-alert-id="${escapeHtml(problem.id || '')}">
            <button class="problem-toggle" type="button">
              <span class="problem-toggle__title">${badge(problem.severity || problem.status || 'info')}${escapeHtml(stripMarkdown(problem.title) || 'Untitled problem')}</span>
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
  if (!aiSummary) {
    return `<section class="card ai-summary-card ai-summary-card--loading" id="ai-summary-card">
      <div class="ai-summary-skeleton">
        <div class="skeleton-line skeleton-line--short"></div>
        <div class="skeleton-line skeleton-line--long"></div>
        <div class="skeleton-line skeleton-line--medium"></div>
      </div>
    </section>`;
  }
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

/* ── Priority Attention Bar ── */
function renderAttentionBar() {
  const pendingApprovals = getPendingApprovals();
  const waitingTasks = (state?.tasks || []).filter(t => t.status === 'waiting_for_human');
  const atRiskCommitments = (state?.commitments || []).filter(c => c.status === 'at_risk');
  const criticalAlerts = getOpenAlerts().filter(a => String(a.severity).toLowerCase() === 'critical');

  const items = [];
  for (const a of pendingApprovals) items.push({ label: a.title || a.id, type: 'approval', id: a.id });
  for (const t of waitingTasks) items.push({ label: t.title, type: 'task', id: t.id });
  for (const c of atRiskCommitments) items.push({ label: c.title, type: 'commitment', id: c.id });
  for (const a of criticalAlerts) items.push({ label: a.title, type: 'alert', id: a.id });

  if (!items.length) {
    return `<div class="attention-bar attention-bar--ok">
      <span class="attention-bar__icon">${ICONS.check}</span>
      <span class="attention-bar__text">Nothing needs your attention right now.</span>
    </div>`;
  }

  return `<div class="attention-bar">
    <span class="attention-bar__icon">${ICONS.alert}</span>
    <span class="attention-bar__text">${items.length} thing${items.length === 1 ? '' : 's'} need${items.length === 1 ? 's' : ''} you right now</span>
    <div class="attention-bar__links">
      ${items.slice(0, 5).map(item => `<a class="attention-link" href="${escapeHtml(getItemUrl(item.type, item.id))}" data-deep-link="${escapeHtml(item.type)}" data-deep-id="${escapeHtml(item.id)}">${escapeHtml(stripMarkdown(item.label).slice(0, 35))}${stripMarkdown(item.label).length > 35 ? '…' : ''}</a>`).join('')}
    </div>
  </div>`;
}

/* ── Live Burn Rate ── */
async function fetchLiveUsage() {
  if (liveUsageLoading) return;
  liveUsageLoading = true;
  try {
    const res = await fetch(`/api/usage/live?ts=${Date.now()}`);
    if (res.ok) liveUsage = await res.json();
  } catch (err) {
    console.warn('Live usage fetch failed:', err.message);
  }
  liveUsageLoading = false;
}

function renderBurnRate() {
  if (!liveUsage || !liveUsage.configuredProviders?.length) return '';
  const providers = liveUsage.providers || [];
  const configured = liveUsage.configuredProviders || [];
  if (!configured.length) return '';

  const providerCards = configured.map(name => {
    const data = providers.find(p => p.provider === name);
    if (!data) return `<div class="burn-rate-provider burn-rate-provider--disconnected"><div class="burn-rate-provider__name">${escapeHtml(name)}</div><div class="burn-rate-provider__cost">—</div><div class="burn-rate-provider__status"><span class="disconnected-badge">Not connected</span></div></div>`;
    if (data.error) return `<div class="burn-rate-provider burn-rate-provider--error"><div class="burn-rate-provider__name">${escapeHtml(name)}</div><div class="burn-rate-provider__cost">Error</div><div class="burn-rate-provider__status">${escapeHtml(data.error)}</div></div>`;
    const tokens = (data.inputTokens || 0) + (data.outputTokens || 0);
    return `<div class="burn-rate-provider"><div class="burn-rate-provider__name">${escapeHtml(name)}</div><div class="burn-rate-provider__cost">$${Number(data.costUsd || 0).toFixed(4)}</div>${tokens ? `<div class="burn-rate-provider__tokens">${Number(tokens).toLocaleString()} tokens</div>` : ''}<div class="burn-rate-provider__status"><span class="truth-dot truth-verified"></span>Live · ${escapeHtml(formatRelative(data.fetchedAt))}</div></div>`;
  }).join('');

  const ageText = liveUsage.fetchedAt ? formatRelative(liveUsage.fetchedAt) : 'never';
  return `<section class="card">
    <div class="card-header"><h3>Live Burn Rate</h3><div class="card-subtitle">Updated ${escapeHtml(ageText)}</div></div>
    <div class="burn-rate-card">${providerCards}</div>
    <div class="burn-rate-total"><span>Total today</span><span class="burn-rate-total__amount">$${Number(liveUsage.totalCostUsd || 0).toFixed(4)}</span></div>
  </section>`;
}

function renderOverview() {
  return `
    ${renderAttentionBar()}
    ${renderSummaryCard()}
    ${renderDigestCard()}
    ${renderStatusBanner()}
    ${renderBurnRate()}
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
          <article class="task-card card-interactive" data-task-id="${escapeHtml(task.id)}"><h4 class="task-title">${escapeHtml(stripMarkdown(task.title))}</h4><div class="badge-row">${badge(task.status || 'unknown')}${badge(task.priority || 'default')}${badge(task.project || 'general')}${task.approvalRequired ? badge('waiting_for_human') : ''}${(() => { const c = costForTask(task.id); return c !== null ? `<span class="badge badge--cost">${escapeHtml(money(c))}</span>` : ''; })()}</div><div class="list-item-copy">${escapeHtml(task.latestUpdate || 'No update recorded.')}</div><div class="source-ref">${escapeHtml(task.sourceRef || 'work/TASKS.md')}</div></article>`).join('') : '<div class="empty-state empty-state-compact"><div class="empty-copy">No items</div></div>'}</div>
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
    <div class="delivery-history"><div class="memory-block-title">Delivery History</div>${items.map((item) => `<div class="delivery-history-row"><span class="delivery-history-row__date">${escapeHtml(formatDateTime(item.madeAt))}</span><span class="delivery-history-row__title">${badge(item.status || 'in_progress')}${escapeHtml(stripMarkdown(item.title) || 'Untitled commitment')}</span><span class="delivery-history-row__time">${escapeHtml(getCommitmentTimeContext(item))}</span></div>`).join('')}</div>`;
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
function renderUsageCost() {
  const usage = state?.usage || [];
  const total = usage.reduce((sum, row) => sum + Number(row.estimatedCostUsd || 0), 0);
  const topDriver = [...usage].sort((a, b) => Number(b.estimatedCostUsd || 0) - Number(a.estimatedCostUsd || 0))[0];
  const truthLevel = state?.truthGaps?.usageCost || (usage.length ? 'verified' : 'unknown');
  // Combine ledger total with live API total
  const liveTotal = liveUsage?.totalCostUsd || 0;
  const combinedTotal = total + liveTotal;
  const costByTask = (state?.costByEntity?.byTask || []).sort((a, b) => b.costUsd - a.costUsd);
  const costByCommitment = (state?.costByEntity?.byCommitment || []).sort((a, b) => b.costUsd - a.costUsd);
  const hasCostBreakdown = costByTask.length || costByCommitment.length;
  return `
${renderBurnRate()}
<section class="grid grid-3">${renderKpiCard('Total Spend Today', money(combinedTotal), liveTotal ? `$${total.toFixed(2)} ledger + $${liveTotal.toFixed(4)} live API` : (usage.length ? 'Usage rows loaded from ledger files.' : 'No usage rows found yet.'), 'accent', true)}${renderKpiCard('Top Cost Driver', topDriver?.agent || '—', topDriver ? `${money(topDriver.estimatedCostUsd)} · ${humanize(topDriver.operationType)}` : 'Waiting for ledger data.', 'info')}${renderKpiCard('Truth Level', titleCase(truthLevel), 'Confidence state for usage and cost data.', 'success')}</section>${hasCostBreakdown ? `<section class="grid ${costByTask.length && costByCommitment.length ? 'split-grid' : ''}">${costByTask.length ? `<div class="card"><div class="card-header"><h3>Cost by Task</h3><div class="card-subtitle">${costByTask.length} task${costByTask.length === 1 ? '' : 's'} with tracked spend</div></div><div class="table-wrap"><table class="table"><thead><tr><th>Task</th><th>Cost</th><th>Rows</th></tr></thead><tbody>${costByTask.map(e => { const task = (state?.tasks || []).find(t => t.id === e.taskId); return `<tr><td>${important(task ? stripMarkdown(task.title) : e.taskId)}</td><td class="table-mono table-strong">${escapeHtml(money(e.costUsd))}</td><td class="table-mono">${e.rows}</td></tr>`; }).join('')}</tbody></table></div></div>` : ''}${costByCommitment.length ? `<div class="card"><div class="card-header"><h3>Cost by Commitment</h3><div class="card-subtitle">${costByCommitment.length} commitment${costByCommitment.length === 1 ? '' : 's'} with tracked spend</div></div><div class="table-wrap"><table class="table"><thead><tr><th>Commitment</th><th>Cost</th><th>Rows</th></tr></thead><tbody>${costByCommitment.map(e => { const c = (state?.commitments || []).find(c => c.id === e.commitmentId); return `<tr><td>${important(c ? stripMarkdown(c.title) : e.commitmentId)}${c ? ` ${badge(c.status)}` : ''}</td><td class="table-mono table-strong">${escapeHtml(money(e.costUsd))}</td><td class="table-mono">${e.rows}</td></tr>`; }).join('')}</tbody></table></div></div>` : ''}</section>` : ''}${usage.length ? `<section class="card"><div class="card-header"><h3>Usage Records</h3><div class="card-subtitle">Structured ledger rows</div></div><div class="table-wrap"><table class="table usage-table"><thead><tr><th>Agent</th><th>Model</th><th>Provider</th><th>Operation</th><th>Cost</th><th>Duration</th><th>Success</th><th>Source</th></tr></thead><tbody>${usage.map((row) => `<tr><td data-label="Agent">${important(row.agent || 'Unknown')}</td><td data-label="Model">${important(row.model || 'unknown')}</td><td data-label="Provider">${escapeHtml(row.provider || 'unknown')}</td><td data-label="Operation">${escapeHtml(humanize(row.operationType || 'unknown'))}</td><td data-label="Cost" class="table-mono table-strong">${escapeHtml(money(row.estimatedCostUsd || 0))}</td><td data-label="Duration" class="table-mono">${escapeHtml(duration(row.durationMs))}</td><td data-label="Success">${badge(row.success ? 'success' : 'failed')}</td><td data-label="Source" class="table-mono">${escapeHtml(row.sourcePath || row._truth?.source || '—')}</td></tr>`).join('')}</tbody></table></div></section>` : `<section class="card"><div class="empty-state"><div><div class="task-title">No usage records yet</div><div class="empty-copy">Add structured usage ledger files and this view will light up with spend, duration, and source rows.</div></div></div></section>`}`;
}
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

function bindNavButtons() { app.querySelectorAll('[data-nav-view]').forEach((button) => button.addEventListener('click', (e) => { e.preventDefault(); navigateTo(button.dataset.navView); })); }

function bindDeepLinks() {
  app.querySelectorAll('[data-deep-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const type = link.dataset.deepLink;
      const id = link.dataset.deepId;
      const viewMap = { task: 'work', approval: 'approvals', agent: 'agents', commitment: 'overview', alert: 'overview' };
      navigateTo(viewMap[type] || 'overview', type, id);
    });
  });
}

function draw() {
  if (!RENDERERS[currentView]) currentView = 'overview';
  viewTitle.textContent = getViewLabel(currentView);
  renderNav();
  app.classList.remove('fade-in'); void app.offsetWidth; app.classList.add('fade-in');
  app.innerHTML = RENDERERS[currentView]();
  app.classList.add('stagger-in');
  bindNavButtons(); bindApprovalActions(); bindApprovalNotes(); bindDeepLinks();
  if (currentView === 'work') initKanbanTabs();
  if (currentView === 'overview') {
    initProblemsAccordion(); updateCommitmentCountdowns();
    clearInterval(commitmentCountdownInterval); commitmentCountdownInterval = setInterval(updateCommitmentCountdowns, 30000);
    if (!aiSummaryLoading) fetchSummary();
    if (!liveUsageLoading && !liveUsage) fetchLiveUsage().then(() => { const el = document.querySelector('.burn-rate-card')?.closest('.card'); if (el) el.outerHTML = renderBurnRate(); });
    bindNudgeActions(); bindSnoozeActions(); bindDigestDismiss();
  } else { clearInterval(commitmentCountdownInterval); commitmentCountdownInterval = null; }
  if (currentDeepLinkId) highlightDeepLinkTarget();
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
      if (result) { input.value = ''; sendBtn.textContent = '\u2713 Sent'; showToast('Nudge sent', msg.slice(0, 60), 'success'); }
      else { sendBtn.textContent = 'Failed'; sendBtn.classList.add('nudge-error'); showToast('Nudge failed', 'Could not deliver the message.', 'error'); }
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

async function resolveApproval(id, resolution, slot, notes = '') {
  if (!id) return;
  if (slot) slot.innerHTML = '';
  try {
    const response = await fetch(`/api/approvals/${encodeURIComponent(id)}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolution, notes }) });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    if (slot) slot.innerHTML = `<div class="confirmation-inline">${escapeHtml(titleCase(resolution))} recorded. Reloading state…</div>`;
    showToast(`${titleCase(resolution)}`, `Approval ${id} has been ${resolution}.`, resolution === 'approved' ? 'success' : 'warning');
    await loadState();
  } catch (error) {
    if (slot) slot.innerHTML = `<div class="error-inline">${escapeHtml(error.message || 'Approval write failed.')}</div>`;
    showToast('Approval failed', error.message || 'Could not record the decision.', 'error');
  }
}

function syncRoute() {
  const route = parseRoute();
  if (route.view !== currentView || (route.itemId && `${route.itemType}/${route.itemId}` !== currentDeepLinkId)) {
    currentView = route.view;
    currentDeepLinkId = route.itemType && route.itemId ? `${route.itemType}/${route.itemId}` : null;
    draw();
    if (currentDeepLinkId) highlightDeepLinkTarget();
  }
}

// Backwards compat: redirect hash routes to path routes
function migrateHashRoute() {
  const hash = location.hash.replace('#', '');
  if (hash && RENDERERS[hash]) {
    pushRoute(hash, true);
    currentView = hash;
  }
}
function initMobileDrawer() { const hamburger = document.getElementById('hamburger-btn'); const sidebar = document.getElementById('sidebar'); const overlay = document.getElementById('sidebar-overlay'); if (!hamburger || !sidebar || !overlay) return; function openDrawer() { sidebar.classList.add('open'); overlay.classList.add('visible'); document.body.style.overflow = 'hidden'; } function closeDrawer() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); document.body.style.overflow = ''; } hamburger.addEventListener('click', () => { sidebar.classList.contains('open') ? closeDrawer() : openDrawer(); }); overlay.addEventListener('click', closeDrawer); sidebar.addEventListener('click', (e) => { if (e.target.closest('.nav-item') && window.innerWidth <= 768) closeDrawer(); }); }
function initProblemsAccordion() { document.querySelectorAll('.problem-card').forEach((card) => { const toggle = card.querySelector('.problem-toggle'); toggle?.addEventListener('click', () => card.classList.toggle('expanded')); }); }
function initKanbanTabs() { const tabs = document.querySelector('.kanban-tabs'); if (!tabs) return; tabs.querySelectorAll('.kanban-tab').forEach((tab) => tab.addEventListener('click', () => { activeKanbanLane = tab.dataset.lane; syncKanbanTabs(); })); syncKanbanTabs(); }
function syncKanbanTabs() { document.querySelectorAll('.kanban-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.lane === activeKanbanLane)); document.querySelectorAll('.kanban-column').forEach((col) => col.classList.toggle('active', col.dataset.lane === activeKanbanLane)); }
async function init() {
  migrateHashRoute();
  refreshButton.addEventListener('click', () => loadState());
  window.addEventListener('popstate', syncRoute);
  // Also listen for hash changes for backwards compat
  window.addEventListener('hashchange', () => { migrateHashRoute(); syncRoute(); });
  initMobileDrawer();
  await loadState();
  if (shouldShowDigest()) { await fetchSummary(true); if (digestData) draw(); }
  localStorage.setItem('mc_lastVisit', String(Date.now()));
  // Poll live usage every 5 minutes
  fetchLiveUsage();
  setInterval(fetchLiveUsage, 5 * 60 * 1000);
  refreshInterval = setInterval(async () => { await loadState(); }, 30000);
}
init();
