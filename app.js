// Mission Control V5 — mobile-first, AI-powered, actionable
const VIEW_DEFS = [
  { key: 'home', label: 'Home', icon: '◈' },
  { key: 'work', label: 'Work', icon: '☐' },
  { key: 'activity', label: 'Activity', icon: '⊙' },
  { key: 'agents', label: 'Agents', icon: '⊕' },
  { key: 'settings', label: 'Settings', icon: '⚙' }
];

const LANE_ORDER = ['now', 'next', 'blocked', 'backlog', 'icebox', 'done_verified'];
const LANE_LABELS = { now: 'Now / Attack', next: 'Next Up', blocked: 'Blocked', backlog: 'Backlog', icebox: 'Icebox / Research', done_verified: 'Done / Verified' };

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const viewTitle = document.getElementById('view-title');
const sourceCount = document.getElementById('source-count');
const refreshButton = document.getElementById('refresh-data');
const generatedAtEl = document.getElementById('generated-at');
const lastRefreshedEl = document.getElementById('last-refreshed');
const openAlertsEl = document.getElementById('open-alerts-pill');

let state = null;
let currentView = location.hash.replace('#', '') || 'home';
// Migrate old hash
if (['overview', 'approvals', 'events', 'schedule', 'usage-cost', 'artifacts', 'intel'].includes(currentView)) {
  if (currentView === 'overview') currentView = 'home';
  else if (['events', 'artifacts', 'intel'].includes(currentView)) currentView = 'activity';
  else if (['schedule', 'usage-cost'].includes(currentView)) currentView = 'settings';
  else if (currentView === 'approvals') currentView = 'home';
}
let refreshInterval = null;
let activeKanbanLane = 'now';
let commitmentCountdownInterval = null;
let aiSummary = null;
let aiSummaryStateKey = null;
let activeActivityTab = 'all';
let activeSettingsTab = 'spend';
let snoozedProblems = {};

// Load snoozed problems from localStorage
try { snoozedProblems = JSON.parse(localStorage.getItem('mc_snoozed_problems') || '{}'); } catch { snoozedProblems = {}; }
function saveSnoozed() { localStorage.setItem('mc_snoozed_problems', JSON.stringify(snoozedProblems)); }
function isProblemSnoozed(id) { const until = snoozedProblems[id]; if (!until) return false; if (Date.now() > until) { delete snoozedProblems[id]; saveSnoozed(); return false; } return true; }

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function humanize(value = '') { return String(value).replaceAll('_', ' ').replaceAll('/', ' ').replace(/\s+/g, ' ').trim(); }
function titleCase(value = '') { return humanize(value).replace(/\w/g, (c) => c.toUpperCase()); }
function formatDateTime(value) { if (!value) return '—'; const d = new Date(value); if (Number.isNaN(d.getTime())) return '—'; return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function formatTime(value) { if (!value) return '—'; const d = new Date(value); if (Number.isNaN(d.getTime())) return '—'; return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }); }
function formatRelative(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const buckets = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of buckets) {
    if (absSec >= size) { const v = Math.round(diffMs / 1000 / size); return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-v, unit); }
  }
  return 'just now';
}
function formatTimelineTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
function duration(value) { const ms = Number(value || 0); if (!ms) return '—'; if (ms < 1000) return `${ms}ms`; if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`; return `${Math.round(ms / 60000)}m`; }

function badgeTone(value = '') {
  const lower = String(value).toLowerCase();
  if (['success', 'verified', 'active', 'healthy', 'done_verified', 'approved', 'heartbeat_active', 'delivered'].includes(lower)) return 'success';
  if (['warning', 'pending', 'stale', 'waiting_for_human', 'medium', 'heartbeat_stale', 'at_risk'].includes(lower)) return 'warning';
  if (['error', 'critical', 'blocked', 'failed', 'urgent', 'open', 'rejected', 'missed', 'offline', 'stalled'].includes(lower)) return 'error';
  if (['info', 'claimed', 'idle', 'backlog', 'in_progress', 'operating_normally', 'ok', 'needs_attention', 'cancelled'].includes(lower)) return 'info';
  return 'default';
}
function badge(label, customText = null) { return `<span class="badge badge-${badgeTone(label)}">${escapeHtml(customText || humanize(label))}</span>`; }
function truthStateClass(item) { return `truth-${item?._truth?.state || 'unknown'}`; }
function truthDot(item) { return `<span class="truth-dot ${truthStateClass(item)}"></span>`; }
function truthBadge(item) { const s = item?._truth?.state || 'unknown'; return `<span class="badge badge-${badgeTone(s)}">${truthDot(item)}${escapeHtml(s)}</span>`; }
function important(text) { return `<span class="table-strong">${escapeHtml(text ?? '—')}</span>`; }
function getViewLabel(key) { return VIEW_DEFS.find((v) => v.key === key)?.label || 'Home'; }
function getOpenAlerts() { return (state?.alerts || []).filter((a) => String(a.status).toLowerCase() === 'open'); }
function getPendingApprovals() { return (state?.approvals || []).filter((a) => String(a.status).toLowerCase() === 'pending'); }
function getLaneSummaryMap() { const m = new Map(); (state?.overview?.laneSummaries || []).forEach((i) => m.set(i.lane, i.count)); return m; }
function navigateTo(view) { currentView = view; location.hash = view; draw(); }

function getNeedsMeCount() {
  return getPendingApprovals().length + (state?.tasks || []).filter((t) => t.status === 'waiting_for_human').length;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Ahmed.';
  if (h < 17) return 'Good afternoon, Ahmed.';
  return 'Good evening, Ahmed.';
}

function getStatusBannerState() {
  const agent = state?.agents?.[0];
  const approvals = getPendingApprovals().length;
  const waitingTasks = (state?.tasks || []).filter((t) => t.status === 'waiting_for_human').length;
  const commitments = state?.commitments || [];
  const atRisk = commitments.filter((c) => c.status === 'at_risk').length;
  const missed = commitments.filter((c) => c.status === 'missed').length;
  const heartbeatAgeMs = agent?.lastHeartbeatAt ? Date.now() - new Date(agent.lastHeartbeatAt).getTime() : Number.POSITIVE_INFINITY;
  if (!agent?.lastHeartbeatAt || heartbeatAgeMs > 2 * 60 * 60 * 1000) return 'offline';
  if (missed || getOpenAlerts().some((a) => String(a.severity).toLowerCase() === 'critical') || heartbeatAgeMs > 30 * 60 * 1000) return 'stalled';
  if (approvals || waitingTasks || atRisk || heartbeatAgeMs > 10 * 60 * 1000) return 'attention';
  return 'ok';
}

function formatStatusLabel(key) {
  return ({ ok: 'All systems nominal', attention: 'Needs attention', stalled: 'Stalled', offline: 'Offline' })[key] || 'All systems nominal';
}

function statusDotChar(key) {
  return ({ ok: '🟢', attention: '🟡', stalled: '🔴', offline: '⚫' })[key] || '🟢';
}

// --- Render Nav ---
function renderNav() {
  const needsMe = getNeedsMeCount();
  nav.innerHTML = VIEW_DEFS.map((v) => `
    <button class="nav-item ${v.key === currentView ? 'is-active' : ''}" type="button" data-view="${v.key}">
      <span class="nav-icon">${v.icon}</span>
      <span>${v.label}</span>
      ${v.key === 'home' && needsMe > 0 ? '<span class="nav-dot"></span>' : ''}
    </button>
  `).join('');
  nav.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => navigateTo(btn.dataset.view)));
}

// --- AI Summary Hero ---
function renderAISummaryHero() {
  const stateKey = getStatusBannerState();
  const summaryText = aiSummary || null;
  const lastUpdate = state?.meta?.generatedAt ? formatRelative(state.meta.generatedAt) : '—';

  return `
    <section class="v5-hero v5-hero--${stateKey}">
      <div class="v5-hero__greeting">${escapeHtml(getGreeting())}</div>
      <div class="v5-hero__summary" id="ai-summary-text">
        ${summaryText ? escapeHtml(summaryText) : '<div class="skeleton-line"></div><div class="skeleton-line skeleton-line--short"></div>'}
      </div>
      <div class="v5-hero__status">
        <span>${statusDotChar(stateKey)} ${escapeHtml(formatStatusLabel(stateKey))}</span>
      </div>
      <div class="v5-hero__meta">Last update: ${escapeHtml(lastUpdate)}</div>
    </section>
  `;
}

// --- KPI Row ---
function renderKpiRow() {
  const overview = state?.overview || {};
  const needsMe = getNeedsMeCount();
  const confidence = computeDataConfidence(overview.dataQuality || {});
  return `
    <section class="v5-kpi-row">
      <button class="v5-kpi" type="button" data-nav-view="work">
        <span class="v5-kpi__value">${overview.tasksInProgress ?? 0}</span>
        <span class="v5-kpi__label">ACTIVE</span>
      </button>
      <button class="v5-kpi ${needsMe > 0 ? 'v5-kpi--attention' : ''}" type="button" data-nav-view="home">
        <span class="v5-kpi__value ${needsMe > 0 ? 'needs-me-active' : ''}">${needsMe}</span>
        <span class="v5-kpi__label">NEEDS ME</span>
      </button>
      <button class="v5-kpi" type="button" data-nav-view="settings">
        <span class="v5-kpi__value v5-kpi__value--money">${money(overview.spendTodayUsd ?? 0)}</span>
        <span class="v5-kpi__label">TODAY</span>
      </button>
      <button class="v5-kpi" type="button" data-nav-view="settings">
        <span class="v5-kpi__value">${confidence}%</span>
        <span class="v5-kpi__label">DATA</span>
      </button>
    </section>
  `;
}

function computeDataConfidence(dq = {}) {
  const total = Object.values(dq).reduce((s, v) => s + Number(v || 0), 0);
  if (!total) return 0;
  return Math.round(((Number(dq.verified || 0)) / total) * 100);
}

// --- Commitments Widget ---
function getCommitmentTimeContext(c) {
  const due = c?.dueBy ? new Date(c.dueBy).getTime() : null;
  const resolved = c?.resolvedAt ? new Date(c.resolvedAt).getTime() : null;
  if (!due) return 'No deadline';
  const deltaMs = (resolved || Date.now()) - due;
  const absMin = Math.round(Math.abs(deltaMs) / 60000);
  const hrs = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const span = hrs ? `${hrs}h ${mins}m` : `${mins}min`;
  if (c.status === 'delivered') return deltaMs <= 0 ? `${span} early` : `${span} late`;
  if (c.status === 'missed') return `overdue by ${span}`;
  if (c.status === 'at_risk' || c.status === 'in_progress') return `${span} remaining`;
  return c.proof ? `✓ ${c.proof}` : 'Cancelled';
}

function commitmentStatusIcon(status) {
  return ({ delivered: '✓', missed: '✗', at_risk: '⏱', in_progress: '●', cancelled: '—' })[status] || '●';
}

function renderCommitmentsWidget() {
  const commitments = [...(state?.commitments || [])].sort((a, b) => new Date(b.madeAt || 0) - new Date(a.madeAt || 0));
  if (!commitments.length) return '';
  const stats = state?.overview?.commitmentStats || {};
  const delivered = stats.delivered || 0;
  const total = stats.commitmentsMade || 0;
  const deliveryRate = total ? Math.round(delivered / total * 100) : 0;

  return `
    <section class="v5-section">
      <div class="v5-section__header">
        <span class="v5-section__title">COMMITMENTS</span>
        <span class="v5-section__stat">${delivered}/${total} shipped</span>
      </div>
      <div class="v5-commitment-list">
        ${commitments.map((c) => `
          <div class="v5-commitment-row v5-commitment-row--${escapeHtml(c.status || 'in_progress')}" data-commitment-id="${escapeHtml(c.id || '')}" data-commitment-due-by="${escapeHtml(c.dueBy || '')}" data-commitment-status="${escapeHtml(c.status || 'in_progress')}" data-commitment-resolved-at="${escapeHtml(c.resolvedAt || '')}">
            <div class="v5-commitment-row__main" role="button" tabindex="0">
              <span class="v5-commitment-icon v5-commitment-icon--${escapeHtml(c.status || 'in_progress')}">${commitmentStatusIcon(c.status)}</span>
              <span class="v5-commitment-title">${escapeHtml(c.title || 'Untitled')}</span>
              <span class="v5-commitment-time">${escapeHtml(getCommitmentTimeContext(c))}</span>
            </div>
            <div class="v5-commitment-detail" hidden>
              <div class="v5-commitment-context">${escapeHtml(c.context || 'No context recorded')}</div>
              ${c.proof ? `<div class="v5-commitment-proof">Proof: ${escapeHtml(c.proof)}</div>` : ''}
              <div class="v5-commitment-dates">Made: ${escapeHtml(formatDateTime(c.madeAt))} · Due: ${escapeHtml(formatDateTime(c.dueBy))}${c.resolvedAt ? ` · Resolved: ${escapeHtml(formatDateTime(c.resolvedAt))}` : ''}</div>
              <div class="v5-commitment-actions">
                ${c.status === 'in_progress' ? `<button class="btn btn-secondary btn-sm" type="button" data-nudge-type="deadline_extension" data-nudge-target="${escapeHtml(c.id || '')}">Extend deadline</button>` : ''}
                ${c.status === 'at_risk' ? `<button class="btn btn-secondary btn-sm" type="button" data-nudge-type="priority_change" data-nudge-target="${escapeHtml(c.id || '')}">I'll handle it</button>` : ''}
                ${c.status === 'missed' ? `<button class="btn btn-secondary btn-sm" type="button" data-nudge-type="instruction" data-nudge-target="${escapeHtml(c.id || '')}" data-nudge-message="Acknowledged">Acknowledged</button>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="v5-section__footer-stats">
        <span>Delivery rate: ${deliveryRate}%</span>
        <span>Avg: ${escapeHtml(stats.avgDeliveryLead || '—')}</span>
      </div>
    </section>
  `;
}

// --- Active Work ---
function renderActiveWork() {
  const tasks = (state?.tasks || []).filter((t) => t.lane === 'now').slice(0, 5);
  const totalNow = (state?.tasks || []).filter((t) => t.lane === 'now').length;

  return `
    <section class="v5-section">
      <div class="v5-section__header">
        <span class="v5-section__title">ACTIVE WORK</span>
      </div>
      ${tasks.length ? `<div class="v5-work-list">${tasks.map((t) => `
        <div class="v5-work-item">
          <div class="v5-work-item__main">
            <span class="v5-work-dot"></span>
            <span class="v5-work-title">${escapeHtml(t.title || 'Untitled')}</span>
          </div>
          <div class="v5-work-meta">${escapeHtml(t.project || 'general')} · ${escapeHtml(humanize(t.status || 'in progress'))}</div>
          <button class="btn btn-secondary btn-sm v5-nudge-inline" type="button" data-nudge-type="status_request" data-nudge-target="${escapeHtml(t.id || '')}" data-nudge-message="What's the status on this?">Ask for update</button>
        </div>
      `).join('')}</div>` : '<div class="v5-empty">No active tasks</div>'}
      ${totalNow > 5 ? `<div class="v5-more">and ${totalNow - 5} more</div>` : ''}
      <div class="section-footer"><button type="button" class="link-button" data-nav-view="work">View all work →</button></div>
    </section>
  `;
}

// --- Needs Your Attention (merged problems + approvals) ---
function renderNeedsAttention() {
  const approvals = getPendingApprovals();
  const problems = getOpenAlerts().filter((a) => !isProblemSnoozed(a.id));
  // Sort: critical first, then warnings, then approvals
  const criticalProblems = problems.filter((p) => String(p.severity).toLowerCase() === 'critical');
  const warningProblems = problems.filter((p) => String(p.severity).toLowerCase() === 'warning');
  const infoProblems = problems.filter((p) => !['critical', 'warning'].includes(String(p.severity).toLowerCase()));
  const merged = [...criticalProblems, ...warningProblems, ...approvals.map((a) => ({ ...a, _isApproval: true })), ...infoProblems];

  if (!merged.length) return '';

  const displayed = merged.slice(0, 5);
  const remaining = merged.length - displayed.length;

  return `
    <section class="v5-section v5-attention">
      <div class="v5-section__header">
        <span class="v5-section__title">NEEDS YOUR ATTENTION</span>
        <span class="v5-section__stat">${merged.length} item${merged.length === 1 ? '' : 's'}</span>
      </div>
      <div class="v5-attention-list">
        ${displayed.map((item) => {
          if (item._isApproval) {
            return `
              <div class="v5-attention-item" data-approval-id="${escapeHtml(item.id)}">
                <div class="v5-attention-item__header">
                  <span class="v5-attention-dot v5-attention-dot--warning">🟡</span>
                  <span class="v5-attention-item__title">${escapeHtml(item.title || item.id)}</span>
                </div>
                <div class="v5-attention-item__desc">${escapeHtml(item.reason || 'Pending approval')}</div>
                <div class="v5-attention-actions">
                  <button class="btn btn-success btn-sm" type="button" data-approval-action="approved" data-approval-id="${escapeHtml(item.id)}">Approve</button>
                  <button class="btn btn-destructive btn-sm" type="button" data-approval-action="rejected" data-approval-id="${escapeHtml(item.id)}">Reject</button>
                  <button class="btn btn-secondary btn-sm v5-notes-toggle" type="button">Notes</button>
                </div>
                <div class="v5-notes-form" hidden>
                  <input class="v5-notes-input" type="text" placeholder="Optional notes..." />
                </div>
                <div class="confirmation-slot"></div>
              </div>
            `;
          }
          const severityDot = String(item.severity).toLowerCase() === 'critical' ? '🔴' : '🟡';
          return `
            <div class="v5-attention-item v5-attention-item--problem" data-problem-id="${escapeHtml(item.id)}">
              <div class="v5-attention-item__header" role="button" tabindex="0">
                <span class="v5-attention-dot">${severityDot}</span>
                <span class="v5-attention-item__title">${escapeHtml(item.title || 'Untitled')}</span>
              </div>
              <div class="v5-attention-item__desc">${escapeHtml(item.description || 'No details')}</div>
              <div class="v5-attention-detail" hidden>
                <div class="v5-attention-recommend">→ ${escapeHtml(item.recommendedAction || 'Review and respond.')}</div>
              </div>
              <div class="v5-attention-actions">
                <button class="btn btn-secondary btn-sm" type="button" data-snooze-id="${escapeHtml(item.id)}">Snooze 24h</button>
                ${String(item.severity).toLowerCase() === 'critical' ? `<button class="btn btn-secondary btn-sm" type="button" data-nudge-type="priority_change" data-nudge-target="${escapeHtml(item.id)}" data-nudge-message="Prioritize this problem">Prioritize this</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${remaining > 0 ? `<div class="v5-more">and ${remaining} more</div>` : ''}
    </section>
  `;
}

// --- Activity Timeline (Home) ---
function renderHomeTimeline() {
  const events = [...(state?.events || [])].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 6);
  if (!events.length) return '';

  // Group by day
  const today = new Date().toDateString();
  let lastDateGroup = null;

  return `
    <section class="v5-section">
      <div class="v5-section__header">
        <span class="v5-section__title">TODAY</span>
      </div>
      <div class="v5-timeline">
        ${events.map((e) => {
          const eDate = new Date(e.timestamp).toDateString();
          let separator = '';
          if (eDate !== lastDateGroup && eDate !== today) {
            separator = `<div class="v5-timeline-separator">YESTERDAY</div>`;
          }
          lastDateGroup = eDate;
          const icon = e.verificationState === 'verified' ? '✓' : e.type === 'session_memory_captured' ? '📎' : (e.status === 'warning' ? '⚠' : '●');
          return `${separator}
            <div class="v5-timeline-row">
              <span class="v5-timeline-time">${escapeHtml(formatTimelineTime(e.timestamp))}</span>
              <span class="v5-timeline-summary">${escapeHtml(e.summary || 'Untitled event')}</span>
              <span class="v5-timeline-icon">${icon}</span>
            </div>`;
        }).join('')}
      </div>
      <div class="section-footer"><button type="button" class="link-button" data-nav-view="activity">View full timeline →</button></div>
    </section>
  `;
}

// --- Morning Digest ---
function renderMorningDigest() {
  const lastVisit = Number(localStorage.getItem('mc_last_visit') || 0);
  const now = Date.now();
  const hoursSince = (now - lastVisit) / (1000 * 60 * 60);
  if (lastVisit && hoursSince < 8) return '';

  const events = state?.events || [];
  const commitments = state?.commitments || [];
  const usage = state?.usage || [];
  const today = new Date().toISOString().slice(0, 10);
  const recentTasks = (state?.tasks || []).filter(t => t.status === 'done_verified').length;
  const recentCommitments = commitments.filter(c => c.status === 'delivered').length;
  const blockers = getOpenAlerts().filter(a => String(a.severity).toLowerCase() === 'critical').length;
  const spend = usage.filter(r => String(r.timestamp || '').startsWith(today)).reduce((s, r) => s + Number(r.estimatedCostUsd || 0), 0);

  if (!events.length && !recentTasks && !recentCommitments) return '';

  const bullets = [];
  if (recentTasks) bullets.push(`${recentTasks} tasks completed`);
  if (recentCommitments) bullets.push(`${recentCommitments} commitments delivered`);
  if (blockers) bullets.push(`${blockers} new blocker${blockers === 1 ? '' : 's'}`);
  if (spend > 0) bullets.push(`${money(spend)} spent`);

  const summary = !bullets.length ? 'Quiet night — no new items need your attention.' :
    `While you were away, Mansa completed ${recentTasks} task${recentTasks === 1 ? '' : 's'} and shipped ${recentCommitments} commitment${recentCommitments === 1 ? '' : 's'}.${blockers ? ` ${blockers} blocker${blockers === 1 ? '' : 's'} appeared that need${blockers === 1 ? 's' : ''} your attention.` : ''} Total spend: ${money(spend)}.`;

  return `
    <section class="v5-digest" id="morning-digest">
      <div class="v5-digest__header">☀ OVERNIGHT DIGEST</div>
      <div class="v5-digest__summary">${escapeHtml(summary)}</div>
      <ul class="v5-digest__bullets">
        ${bullets.map(b => `<li>▸ ${escapeHtml(b)}</li>`).join('')}
      </ul>
      <div class="v5-digest__action">
        <button class="btn btn-secondary btn-sm" type="button" id="dismiss-digest">Got it →</button>
      </div>
    </section>
  `;
}

// --- Home View ---
function renderHome() {
  return `
    ${renderMorningDigest()}
    ${renderAISummaryHero()}
    ${renderKpiRow()}
    ${renderCommitmentsWidget()}
    ${renderActiveWork()}
    ${renderNeedsAttention()}
    ${renderHomeTimeline()}
  `;
}

// --- Work View (unchanged kanban) ---
function renderWork() {
  const laneSummaryMap = getLaneSummaryMap();
  const lanes = LANE_ORDER.map((lane) => ({ key: lane, label: LANE_LABELS[lane] || titleCase(lane), count: laneSummaryMap.get(lane) ?? (state?.tasks || []).filter((t) => t.lane === lane).length, tasks: (state?.tasks || []).filter((t) => t.lane === lane) }));
  return `
    <nav class="kanban-tabs" aria-label="Work lanes">${lanes.map((l) => `
      <button class="kanban-tab${l.key === activeKanbanLane ? ' active' : ''}" data-lane="${escapeHtml(l.key)}" type="button">${escapeHtml(l.label)} <span style="opacity:0.6">${l.count}</span></button>`).join('')}
    </nav>
    <section class="kanban-board grid">${lanes.map((l) => `
      <article class="card lane-column kanban-column${l.key === activeKanbanLane ? ' active' : ''}" data-lane="${escapeHtml(l.key)}">
        <div class="card-header"><h3>${escapeHtml(l.label)}</h3><span class="count-pill">${l.count}</span></div>
        <div class="task-stack">${l.tasks.length ? l.tasks.map((t) => `
          <article class="task-card card-interactive"><h4 class="task-title">${escapeHtml(humanize(t.title))}</h4><div class="badge-row">${badge(t.status || 'unknown')}${badge(t.priority || 'default')}${badge(t.project || 'general')}${t.approvalRequired ? badge('waiting_for_human') : ''}</div><div class="list-item-copy">${escapeHtml(t.latestUpdate || 'No update recorded.')}</div><div class="source-ref">${escapeHtml(t.sourceRef || 'work/TASKS.md')}</div></article>`).join('') : '<div class="empty-state empty-state-compact"><div class="empty-copy">No items</div></div>'}</div>
      </article>`).join('')}
    </section>`;
}

// --- Activity View (merged Events + Artifacts + Intel) ---
function renderActivity() {
  const events = [...(state?.events || [])].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  const artifacts = [...(state?.artifacts || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const memory = state?.memory || {};

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'events', label: 'Events' },
    { key: 'artifacts', label: 'Artifacts' },
    { key: 'memory', label: 'Memory' }
  ];

  let content = '';
  if (activeActivityTab === 'all' || activeActivityTab === 'events') {
    content += events.map((e) => `
      <div class="v5-activity-row">
        <span class="v5-activity-type-icon" title="Event">⊙</span>
        <span class="v5-activity-time">${escapeHtml(formatTimelineTime(e.timestamp))}</span>
        <span class="v5-activity-summary">${escapeHtml(e.summary || 'Untitled event')}</span>
        <span>${badge(e.verificationState || e.status || 'info')}</span>
      </div>
    `).join('');
  }
  if (activeActivityTab === 'all' || activeActivityTab === 'artifacts') {
    content += artifacts.map((a) => `
      <div class="v5-activity-row">
        <span class="v5-activity-type-icon" title="Artifact">◫</span>
        <span class="v5-activity-time">${escapeHtml(formatTimelineTime(a.createdAt))}</span>
        <span class="v5-activity-summary">${escapeHtml(a.title || 'Untitled artifact')}</span>
        <span>${badge(a.category || 'artifact')}</span>
      </div>
    `).join('');
  }
  if (activeActivityTab === 'all' || activeActivityTab === 'memory') {
    const memEntries = [
      ...(memory.keyEvents || []).map((item, i) => ({ text: item, type: 'Key Event', time: '' })),
      ...(memory.decisions || []).map((item) => ({ text: item, type: 'Decision', time: '' })),
      ...(memory.facts || []).map((item) => ({ text: item, type: 'Fact', time: '' }))
    ];
    content += memEntries.map((m) => `
      <div class="v5-activity-row">
        <span class="v5-activity-type-icon" title="Memory">◉</span>
        <span class="v5-activity-time">${escapeHtml(m.time)}</span>
        <span class="v5-activity-summary">${escapeHtml(m.text)}</span>
        <span>${badge(m.type)}</span>
      </div>
    `).join('');
  }

  if (!content) content = '<div class="v5-empty">No activity recorded.</div>';

  return `
    <nav class="v5-tabs" aria-label="Activity tabs">
      ${tabs.map((t) => `<button class="v5-tab${t.key === activeActivityTab ? ' active' : ''}" data-activity-tab="${t.key}" type="button">${t.label}</button>`).join('')}
    </nav>
    <section class="v5-activity-list">${content}</section>
  `;
}

// --- Agents View ---
function renderDeliveryHistory() {
  const items = [...(state?.commitments || [])].filter((c) => ['delivered', 'missed'].includes(c.status)).sort((a, b) => new Date(b.madeAt || 0) - new Date(a.madeAt || 0));
  if (!items.length) return '';
  return `
    <div class="delivery-history"><div class="memory-block-title">Delivery History</div>${items.map((c) => `<div class="delivery-history-row"><span class="delivery-history-row__date">${escapeHtml(formatDateTime(c.madeAt))}</span><span class="delivery-history-row__title">${badge(c.status || 'in_progress')}${escapeHtml(c.title || 'Untitled')}</span><span class="delivery-history-row__time">${escapeHtml(getCommitmentTimeContext(c))}</span></div>`).join('')}</div>`;
}

function renderAgents() {
  const agents = state?.agents || [];
  return `
    <section class="grid agent-grid">${agents.map((agent, i) => `
      <article class="card agent-card"><div class="agent-header"><div><div class="agent-name">${truthDot(agent)}${escapeHtml(agent.name || 'Unnamed')}</div></div>${badge(agent.status || 'unknown')}</div><p class="agent-role">${escapeHtml(agent.role || 'No role.')}</p><div class="key-value-grid agent-meta"><div class="key-label">Model</div><div class="key-value">${escapeHtml(agent.model || 'unknown')}</div><div class="key-label">Environment</div><div class="key-value">${escapeHtml(agent.environment || agent.provider || 'unknown')}</div><div class="key-label">Current Task</div><div class="key-value">${escapeHtml(agent.currentTaskSummary || '—')}</div><div class="key-label">Health</div><div class="key-value">${badge(agent.health || 'unknown')}</div><div class="key-label">Last Seen</div><div class="key-value">${escapeHtml(formatRelative(agent.lastSeenAt))}</div><div class="key-label">Activity</div><div class="key-value">${escapeHtml(String(agent.recentActivityCount ?? 0))}</div></div>${i === 0 ? renderDeliveryHistory() : ''}</article>`).join('')}
    </section>`;
}

// --- Settings View (merged Schedule + Usage/Cost + System) ---
function renderSettings() {
  const tabs = [
    { key: 'spend', label: 'Spend' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'system', label: 'System' }
  ];

  let content = '';
  if (activeSettingsTab === 'spend') {
    content = renderSettingsSpend();
  } else if (activeSettingsTab === 'schedule') {
    content = renderSettingsSchedule();
  } else {
    content = renderSettingsSystem();
  }

  return `
    <nav class="v5-tabs" aria-label="Settings tabs">
      ${tabs.map((t) => `<button class="v5-tab${t.key === activeSettingsTab ? ' active' : ''}" data-settings-tab="${t.key}" type="button">${t.label}</button>`).join('')}
    </nav>
    ${content}
  `;
}

function renderSettingsSpend() {
  const usage = state?.usage || [];
  const total = usage.reduce((s, r) => s + Number(r.estimatedCostUsd || 0), 0);
  const topDriver = [...usage].sort((a, b) => Number(b.estimatedCostUsd || 0) - Number(a.estimatedCostUsd || 0))[0];

  return `
    <section class="grid grid-3">
      ${renderKpiCard('Total Spend Today', money(total), usage.length ? 'From ledger files' : 'No usage rows', 'accent', true)}
      ${renderKpiCard('Top Cost Driver', topDriver?.agent || '—', topDriver ? `${money(topDriver.estimatedCostUsd)} · ${humanize(topDriver.operationType)}` : 'No data', 'info')}
      ${renderKpiCard('Records', String(usage.length), 'Structured ledger rows', 'success')}
    </section>
    ${usage.length ? `<section class="card"><div class="card-header"><h3>Usage Records</h3></div><div class="table-wrap"><table class="table usage-table"><thead><tr><th>Agent</th><th>Model</th><th>Provider</th><th>Operation</th><th>Cost</th><th>Duration</th><th>Success</th></tr></thead><tbody>${usage.map((r) => `<tr><td data-label="Agent">${important(r.agent || 'Unknown')}</td><td data-label="Model">${important(r.model || 'unknown')}</td><td data-label="Provider">${escapeHtml(r.provider || 'unknown')}</td><td data-label="Operation">${escapeHtml(humanize(r.operationType || 'unknown'))}</td><td data-label="Cost" class="table-mono table-strong">${money(r.estimatedCostUsd || 0)}</td><td data-label="Duration" class="table-mono">${duration(r.durationMs)}</td><td data-label="Success">${badge(r.success ? 'success' : 'failed')}</td></tr>`).join('')}</tbody></table></div></section>` : '<section class="card"><div class="v5-empty">No usage records yet.</div></section>'}
  `;
}

function renderSettingsSchedule() {
  const schedules = state?.schedules || [];
  return `
    <section class="card"><div class="card-header"><h3>Schedule</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Status</th><th>Owner</th><th>Last Run</th><th>Result</th><th>Next Run</th></tr></thead><tbody>${schedules.map((s) => `<tr><td>${important(s.name || 'Unnamed')}<div class="list-item-copy">${escapeHtml(s.humanReadable || '')}</div></td><td>${badge(s.status || 'unknown')}</td><td>${important(s.ownerAgent || '—')}</td><td class="table-mono">${escapeHtml(formatRelative(s.lastRunAt))}</td><td>${badge(s.lastRunStatus || 'unknown')}</td><td class="table-mono">${escapeHtml(formatDateTime(s.nextRunAt))}</td></tr>`).join('')}</tbody></table></div></section>
  `;
}

function renderSettingsSystem() {
  const dq = state?.overview?.dataQuality || {};
  const tg = state?.truthGaps || {};
  const ds = state?.meta?.dataSources || [];
  return `
    <section class="card">
      <div class="card-header"><h3>Data Quality</h3></div>
      <div class="key-value-grid">
        <div class="key-label">Verified</div><div class="key-value">${dq.verified || 0}</div>
        <div class="key-label">Claimed</div><div class="key-value">${dq.claimed || 0}</div>
        <div class="key-label">Stale</div><div class="key-value">${dq.stale || 0}</div>
        <div class="key-label">Unknown</div><div class="key-value">${dq.unknown || 0}</div>
      </div>
    </section>
    <section class="card">
      <div class="card-header"><h3>Truth Gaps</h3></div>
      <div class="key-value-grid">
        ${Object.entries(tg).map(([k, v]) => `<div class="key-label">${escapeHtml(humanize(k))}</div><div class="key-value">${escapeHtml(humanize(v))}</div>`).join('')}
      </div>
    </section>
    <section class="card">
      <div class="card-header"><h3>Data Sources</h3><div class="card-subtitle">${ds.length} sources</div></div>
      <div class="spec-source-list">${ds.map((s) => `<code>${escapeHtml(s)}</code>`).join('')}</div>
    </section>
  `;
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

const RENDERERS = { home: renderHome, work: renderWork, activity: renderActivity, agents: renderAgents, settings: renderSettings };

// --- Interactions ---
function updateCommitmentCountdowns() {
  document.querySelectorAll('[data-commitment-due-by]').forEach((row) => {
    const dueBy = row.getAttribute('data-commitment-due-by');
    const status = row.getAttribute('data-commitment-status');
    const resolvedAt = row.getAttribute('data-commitment-resolved-at');
    const target = row.querySelector('.v5-commitment-time');
    if (!target || !dueBy) return;
    target.textContent = getCommitmentTimeContext({ dueBy, status, resolvedAt });
  });
}

function bindNavButtons() {
  app.querySelectorAll('[data-nav-view]').forEach((btn) => btn.addEventListener('click', () => navigateTo(btn.dataset.navView)));
}

function bindApprovalActions() {
  app.querySelectorAll('[data-approval-action]').forEach((btn) => btn.addEventListener('click', async () => {
    const id = btn.dataset.approvalId;
    const resolution = btn.dataset.approvalAction;
    const card = btn.closest('[data-approval-id]');
    const slot = card?.querySelector('.confirmation-slot');
    const notesInput = card?.querySelector('.v5-notes-input');
    const notes = notesInput?.value || '';
    btn.style.transform = 'scale(0.95)';
    btn.style.opacity = '0.7';
    await resolveApproval(id, resolution, notes, slot, btn);
  }));
}

function bindNudgeButtons() {
  app.querySelectorAll('[data-nudge-type]').forEach((btn) => {
    if (btn._nudgeBound) return;
    btn._nudgeBound = true;
    btn.addEventListener('click', async () => {
      const type = btn.dataset.nudgeType;
      const targetId = btn.dataset.nudgeTarget || null;
      const message = btn.dataset.nudgeMessage || '';
      btn.style.transform = 'scale(0.95)';
      btn.style.opacity = '0.7';
      btn.disabled = true;
      try {
        const resp = await fetch('/api/nudge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, targetId, message }) });
        if (!resp.ok) throw new Error(`${resp.status}`);
        btn.textContent = 'Sent ✓';
        btn.classList.add('btn-nudge-sent');
        setTimeout(() => { btn.disabled = false; }, 300000); // 5 min cooldown
      } catch {
        btn.style.transform = '';
        btn.style.opacity = '';
        btn.disabled = false;
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 300);
      }
    });
  });
}

function bindSnoozeButtons() {
  app.querySelectorAll('[data-snooze-id]').forEach((btn) => {
    if (btn._snoozeBound) return;
    btn._snoozeBound = true;
    btn.addEventListener('click', () => {
      const id = btn.dataset.snoozeId;
      snoozedProblems[id] = Date.now() + 24 * 60 * 60 * 1000;
      saveSnoozed();
      const item = btn.closest('.v5-attention-item');
      if (item) { item.style.opacity = '0'; setTimeout(() => { item.remove(); }, 200); }
    });
  });
}

function bindCommitmentExpand() {
  app.querySelectorAll('.v5-commitment-row__main').forEach((main) => {
    main.addEventListener('click', () => {
      const detail = main.parentElement.querySelector('.v5-commitment-detail');
      if (detail) { detail.hidden = !detail.hidden; }
    });
  });
}

function bindProblemExpand() {
  app.querySelectorAll('.v5-attention-item--problem .v5-attention-item__header').forEach((header) => {
    header.addEventListener('click', () => {
      const detail = header.parentElement.querySelector('.v5-attention-detail');
      if (detail) detail.hidden = !detail.hidden;
    });
  });
}

function bindNotesToggle() {
  app.querySelectorAll('.v5-notes-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const form = btn.parentElement.parentElement.querySelector('.v5-notes-form');
      if (form) form.hidden = !form.hidden;
    });
  });
}

function bindDismissDigest() {
  const btn = document.getElementById('dismiss-digest');
  if (btn) {
    btn.addEventListener('click', () => {
      localStorage.setItem('mc_last_visit', String(Date.now()));
      const digest = document.getElementById('morning-digest');
      if (digest) { digest.style.opacity = '0'; setTimeout(() => digest.remove(), 200); }
    });
  }
}

function bindActivityTabs() {
  app.querySelectorAll('[data-activity-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeActivityTab = btn.dataset.activityTab;
      draw();
    });
  });
}

function bindSettingsTabs() {
  app.querySelectorAll('[data-settings-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSettingsTab = btn.dataset.settingsTab;
      draw();
    });
  });
}

function draw() {
  if (!RENDERERS[currentView]) currentView = 'home';
  viewTitle.textContent = getViewLabel(currentView);
  renderNav();
  app.classList.remove('fade-in'); void app.offsetWidth; app.classList.add('fade-in');
  app.innerHTML = RENDERERS[currentView]();
  bindNavButtons();
  bindApprovalActions();
  bindNudgeButtons();
  bindSnoozeButtons();
  bindCommitmentExpand();
  bindProblemExpand();
  bindNotesToggle();
  bindDismissDigest();
  if (currentView === 'work') initKanbanTabs();
  if (currentView === 'activity') bindActivityTabs();
  if (currentView === 'settings') bindSettingsTabs();
  if (currentView === 'home') {
    updateCommitmentCountdowns();
    clearInterval(commitmentCountdownInterval);
    commitmentCountdownInterval = setInterval(updateCommitmentCountdowns, 30000);
  } else {
    clearInterval(commitmentCountdownInterval);
    commitmentCountdownInterval = null;
  }
}

function getFreshnessClass(value) {
  const ageMin = value ? (Date.now() - new Date(value).getTime()) / 60000 : Number.POSITIVE_INFINITY;
  if (ageMin < 5) return 'fresh';
  if (ageMin <= 30) return 'aging';
  return 'stale';
}

async function loadState() {
  const cacheBust = Date.now();
  let response;
  try { response = await fetch(`/api/state?ts=${cacheBust}`); } catch { response = null; }
  if (response?.ok) state = await response.json();
  else { const fallback = await fetch(`./data/state.json?ts=${cacheBust}`); state = await fallback.json(); }
  sourceCount.textContent = `${state?.meta?.dataSources?.length || 0} sources`;
  const freshnessClass = getFreshnessClass(state?.meta?.generatedAt);
  generatedAtEl.innerHTML = `<span class="freshness-dot freshness-${freshnessClass}"></span>Generated ${escapeHtml(formatDateTime(state?.meta?.generatedAt))}`;
  lastRefreshedEl.textContent = `Last refreshed ${formatTime(new Date())}`;
  const needsMe = getNeedsMeCount();
  openAlertsEl.textContent = needsMe > 0 ? `${needsMe} needs me` : '0 alerts';
  draw();
}

async function loadAISummary() {
  const stateKey = state?.meta?.generatedAt || '';
  if (aiSummary && aiSummaryStateKey === stateKey) return;
  try {
    const resp = await fetch(`/api/summary?ts=${Date.now()}`);
    if (resp.ok) {
      const data = await resp.json();
      aiSummary = data.summary;
      aiSummaryStateKey = stateKey;
      const el = document.getElementById('ai-summary-text');
      if (el) el.textContent = aiSummary;
    }
  } catch { /* fallback summary stays as skeleton */ }
}

async function resolveApproval(id, resolution, notes, slot, btn) {
  if (!id) return;
  if (slot) slot.innerHTML = '';
  try {
    const resp = await fetch(`/api/approvals/${encodeURIComponent(id)}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolution, notes }) });
    if (!resp.ok) throw new Error(`${resp.status}`);
    if (btn) { btn.textContent = '✓ Done'; btn.style.transform = ''; btn.style.opacity = ''; }
    if (slot) slot.innerHTML = `<div class="confirmation-inline">${escapeHtml(titleCase(resolution))} recorded.</div>`;
    setTimeout(() => loadState(), 1000);
  } catch (err) {
    if (btn) { btn.style.transform = ''; btn.style.opacity = ''; btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 300); }
    if (slot) slot.innerHTML = `<div class="error-inline">${escapeHtml(err.message || 'Failed.')}</div>`;
  }
}

function syncHash() {
  const next = location.hash.replace('#', '');
  if (next && RENDERERS[next]) { currentView = next; draw(); }
}

function initMobileDrawer() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar || !overlay) return;
  function openDrawer() { sidebar.classList.add('open'); overlay.classList.add('visible'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); document.body.style.overflow = ''; }
  hamburger.addEventListener('click', () => { sidebar.classList.contains('open') ? closeDrawer() : openDrawer(); });
  overlay.addEventListener('click', closeDrawer);
  sidebar.addEventListener('click', (e) => { if (e.target.closest('.nav-item') && window.innerWidth <= 768) closeDrawer(); });
}

function initKanbanTabs() {
  const tabs = document.querySelector('.kanban-tabs');
  if (!tabs) return;
  tabs.querySelectorAll('.kanban-tab').forEach((tab) => tab.addEventListener('click', () => { activeKanbanLane = tab.dataset.lane; syncKanbanTabs(); }));
  syncKanbanTabs();
}
function syncKanbanTabs() {
  document.querySelectorAll('.kanban-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.lane === activeKanbanLane));
  document.querySelectorAll('.kanban-column').forEach((col) => col.classList.toggle('active', col.dataset.lane === activeKanbanLane));
}

// --- Pull to Refresh ---
function initPullToRefresh() {
  let startY = 0;
  let pulling = false;
  const main = document.querySelector('.main');
  if (!main) return;

  main.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) { startY = e.touches[0].clientY; pulling = true; }
  }, { passive: true });

  main.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 80 && window.scrollY === 0) {
      pulling = false;
      const indicator = document.getElementById('pull-refresh-indicator');
      if (indicator) { indicator.classList.add('visible'); }
      loadState().then(() => {
        loadAISummary();
        if (indicator) indicator.classList.remove('visible');
      });
    }
  }, { passive: true });

  main.addEventListener('touchend', () => { pulling = false; }, { passive: true });
}

// --- Quick Command Bar ---
function wireCommandBar(formId, inputId, feedbackId) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const feedback = document.getElementById(feedbackId);
  if (!form || !input) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;
    input.disabled = true;
    try {
      const resp = await fetch('/api/nudge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'instruction', message: msg }) });
      if (!resp.ok) throw new Error(`${resp.status}`);
      input.value = '';
      if (feedback) { feedback.textContent = '✓ Sent to Mansa'; feedback.classList.add('visible'); setTimeout(() => feedback.classList.remove('visible'), 3000); }
    } catch {
      if (feedback) { feedback.textContent = 'Failed to send'; feedback.classList.add('visible', 'error'); setTimeout(() => { feedback.classList.remove('visible', 'error'); }, 3000); }
    }
    input.disabled = false;
    input.focus();
  });
}
function initCommandBar() {
  wireCommandBar('command-bar-form', 'command-bar-input', 'command-bar-feedback');
  wireCommandBar('command-bar-form-desktop', 'command-bar-input-desktop', 'command-bar-feedback-desktop');
}

async function init() {
  refreshButton.addEventListener('click', () => { loadState().then(() => loadAISummary()); });
  window.addEventListener('hashchange', syncHash);
  initMobileDrawer();
  initPullToRefresh();
  initCommandBar();
  await loadState();
  // Load AI summary async - never blocks page render
  loadAISummary();
  // Record visit
  localStorage.setItem('mc_last_visit', String(Date.now()));
  refreshInterval = setInterval(async () => {
    await loadState();
    // Only refetch summary if state changed
    if (state?.meta?.generatedAt !== aiSummaryStateKey) loadAISummary();
  }, 30000);
}
init();
