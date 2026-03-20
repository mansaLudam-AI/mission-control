#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mcRoot = path.resolve(__dirname, '..');
const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(mcRoot, '..');

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const stat = (p) => fs.statSync(p);
const toIso = (value) => new Date(value).toISOString();
const safeSlug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function truth(state = 'unknown', source = 'unknown', freshAt = null) {
  return { state, source, freshAt };
}

function buildDataQuality(items) {
  return items.reduce((acc, item) => {
    const key = item?._truth?.state || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { verified: 0, claimed: 0, stale: 0, unknown: 0 });
}

function parseTasks(markdown) {
  const laneConfigs = [
    { heading: 'Now / Attack', lane: 'now', label: 'Now / Attack', defaultStatus: 'in_progress', verificationState: 'claimed', latestUpdate: 'Tracked in now/attack commitments', truthState: 'claimed' },
    { heading: 'Next Up', lane: 'next', label: 'Next Up', defaultStatus: 'backlog', verificationState: 'claimed', latestUpdate: 'Queued in next-up commitments', truthState: 'claimed' },
    { heading: 'Blocked / Waiting', lane: 'blocked', label: 'Blocked', defaultStatus: 'blocked', verificationState: 'stale', latestUpdate: 'Tracked in blocked/waiting section', truthState: 'stale' },
    { heading: 'Backlog / Opportunistic', lane: 'backlog', label: 'Backlog', defaultStatus: 'backlog', verificationState: 'claimed', latestUpdate: 'Tracked in backlog/opportunistic section', truthState: 'claimed' },
    { heading: 'Icebox / Research', lane: 'icebox', label: 'Icebox / Research', defaultStatus: 'backlog', verificationState: 'claimed', latestUpdate: 'Tracked in icebox/research section', truthState: 'claimed' }
  ];

  const rows = [];
  for (const config of laneConfigs) {
    const body = new RegExp(`## ${config.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?:\\n## |$)`).exec(markdown)?.[1] ?? '';
    for (const line of body.split('\n')) {
      const m = /^- \[( |x)\] (.+)$/.exec(line.trim());
      if (!m) continue;
      const done = m[1] === 'x';
      const title = m[2].trim();
      const lower = title.toLowerCase();
      const waitingForHuman = !done && (
        config.lane === 'blocked'
        || /waiting/.test(lower)
        || /ahmed/.test(lower)
        || /needs approval/.test(lower)
        || /pending approval/.test(lower)
        || /requires elevated/.test(lower)
        || /requires host-level/.test(lower)
      );
      const status = done ? 'done_verified' : waitingForHuman ? 'waiting_for_human' : config.defaultStatus;
      const lane = done ? 'done_verified' : config.lane;
      const laneLabel = done ? 'Done / Verified' : config.label;
      const priority = config.lane === 'now' ? 'urgent' : /mission control|openclaw|deploy|approval|shell/.test(lower) ? 'medium' : 'low';
      const project = /mission control/.test(lower) ? 'Mission Control' : /revenue/.test(lower) ? 'Revenue' : 'Operations';
      rows.push({
        id: `task-${safeSlug(title)}`,
        title,
        lane,
        laneLabel,
        status,
        priority,
        project,
        assignee: waitingForHuman ? 'Ahmed + Mansa' : 'Mansa',
        latestUpdate: done ? 'Recorded as completed in work/TASKS.md' : config.latestUpdate,
        verificationState: done ? 'verified' : config.verificationState,
        blockedReason: waitingForHuman ? 'Waiting on human-side dependency or approval.' : '',
        sourceRef: 'work/TASKS.md',
        approvalRequired: waitingForHuman,
        _truth: truth(done ? 'verified' : config.truthState, 'work/TASKS.md', null)
      });
    }
  }
  return rows;
}

function parseBullets(markdown, heading) {
  const body = new RegExp(`## ${heading}([\\s\\S]*?)(?:\\n## |$)`).exec(markdown)?.[1] ?? '';
  return body.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
}

function parseMemorySections(markdown) {
  return {
    keyEvents: parseBullets(markdown, 'Key Events'),
    decisions: parseBullets(markdown, 'Decisions Made'),
    facts: parseBullets(markdown, 'Facts Extracted'),
    priorities: parseBullets(markdown, "Tomorrow’s Priorities")
  };
}

function summarizeStatusFile(filePath) {
  const content = read(filePath);
  const objective = /## Objective\n([\s\S]*?)(?:\n## |$)/.exec(content)?.[1]?.trim();
  const phase = /## Current Phase\n([\s\S]*?)(?:\n## |$)/.exec(content)?.[1]?.trim();
  const updatesBody = /## Status Updates\n([\s\S]*?)(?:\n## |$)/.exec(content)?.[1] ?? '';
  const updates = updatesBody.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
  return { objective, phase, updates, content };
}

function artifactCategory(name) {
  if (name.includes('proof')) return 'proof';
  if (name.includes('incident')) return 'incident';
  if (name.includes('mission-control')) return 'status';
  return 'status';
}

function parseSessionMemoryFile(name) {
  const fullPath = path.join(workspaceRoot, 'memory', name);
  const content = read(fullPath);
  const sessionKey = /- \*\*Session Key\*\*: (.+)/.exec(content)?.[1]?.trim() ?? 'unknown';
  const source = /- \*\*Source\*\*: (.+)/.exec(content)?.[1]?.trim() ?? 'unknown';
  const lines = content.split('\n').filter((line) => /^assistant:|^user:/.test(line.trim()));
  const assistantMessages = lines.filter((line) => line.startsWith('assistant:')).length;
  const userMessages = lines.filter((line) => line.startsWith('user:')).length;
  return {
    id: `session-${safeSlug(sessionKey)}`,
    name: name.replace(/\.md$/, ''),
    role: source === 'discord' ? 'Channel session' : source === 'telegram' ? 'Direct session' : 'Recorded session',
    tier: 'memory',
    model: 'unknown',
    provider: 'workspace memory',
    environment: source,
    status: 'recorded',
    currentTaskSummary: `${assistantMessages} assistant messages, ${userMessages} user messages captured`,
    lastHeartbeatAt: toIso(stat(fullPath).mtimeMs),
    lastSeenAt: toIso(stat(fullPath).mtimeMs),
    health: 'unknown',
    recentActivityCount: assistantMessages + userMessages,
    sessionKey,
    source,
    _truth: truth('verified', `memory/${name}`, toIso(stat(fullPath).mtimeMs))
  };
}

function buildUsageLedgerPaths() {
  return [path.join(workspaceRoot, 'out', 'usage'), path.join(workspaceRoot, 'out', 'costs'), path.join(workspaceRoot, 'data', 'usage')];
}

function collectUsageRecords() {
  const ledgerDirs = buildUsageLedgerPaths().filter((dir) => exists(dir));
  const records = [];
  for (const dir of ledgerDirs) {
    for (const name of fs.readdirSync(dir).sort()) {
      const fullPath = path.join(dir, name);
      if (!stat(fullPath).isFile()) continue;
      if (!/\.(json|jsonl|ndjson)$/i.test(name)) continue;
      const raw = read(fullPath).trim();
      if (!raw) continue;
      try {
        if (name.endsWith('.json')) {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) records.push({ ...item, _path: fullPath });
        } else {
          for (const line of raw.split('\n')) {
            if (!line.trim()) continue;
            records.push({ ...JSON.parse(line), _path: fullPath });
          }
        }
      } catch {
        records.push({
          agent: 'Unknown',
          model: 'unknown',
          provider: 'unknown',
          task: 'ledger_parse_error',
          op: 'ledger_parse_error',
          estimatedCostUsd: 0,
          durationMs: 0,
          success: false,
          ts: toIso(stat(fullPath).mtimeMs),
          _path: fullPath,
          _truth: truth('stale', path.relative(workspaceRoot, fullPath), toIso(stat(fullPath).mtimeMs))
        });
      }
    }
  }

  return records.map((row, index) => {
    const freshAt = row.ts || row.timestamp || toIso(stat(row._path).mtimeMs);
    return {
      id: row.id || `usage-${index + 1}`,
      agent: row.agent || row.name || 'Unknown',
      model: row.model || 'unknown',
      provider: row.provider || 'unknown',
      operationType: row.operationType || row.kind || row.op || 'unknown',
      estimatedCostUsd: Number(row.estimatedCostUsd ?? row.costUsd ?? row.cost ?? 0),
      durationMs: Number(row.durationMs ?? row.duration ?? 0),
      success: Boolean(row.success ?? true),
      note: row.note || row.task || `Loaded from ${path.relative(workspaceRoot, row._path)}`,
      timestamp: freshAt,
      sourcePath: path.relative(workspaceRoot, row._path),
      session: row.session || 'unknown',
      inputTokens: Number(row.inputTokens ?? 0),
      outputTokens: Number(row.outputTokens ?? 0),
      _truth: row._truth || truth('verified', path.relative(workspaceRoot, row._path), freshAt)
    };
  }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}


function readCommitments(now = new Date()) {
  const filePath = path.join(workspaceRoot, 'out', 'commitments', 'active.jsonl');
  if (!exists(filePath)) return [];
  const rows = [];
  const raw = read(filePath).trim();
  if (!raw) return rows;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      const dueMs = row.dueBy ? new Date(row.dueBy).getTime() : null;
      let status = row.status || 'in_progress';
      if (status === 'in_progress' && dueMs) {
        const diff = dueMs - now.getTime();
        if (diff < 0) status = 'missed';
        else if (diff <= 30 * 60 * 1000) status = 'at_risk';
      }
      rows.push({
        ...row,
        status,
        _truth: truth('verified', path.relative(workspaceRoot, filePath), row.resolvedAt || row.madeAt || toIso(stat(filePath).mtimeMs))
      });
    } catch {}
  }
  return rows.sort((a, b) => new Date(b.madeAt || 0) - new Date(a.madeAt || 0));
}

function buildCommitmentStats(commitments) {
  const made = commitments.length;
  const delivered = commitments.filter((item) => item.status === 'delivered').length;
  const missed = commitments.filter((item) => item.status === 'missed').length;
  const atRisk = commitments.filter((item) => item.status === 'at_risk').length;
  const onTime = commitments.filter((item) => item.status === 'delivered' && item.resolvedAt && item.dueBy && new Date(item.resolvedAt) <= new Date(item.dueBy)).length;
  const deliveredDiffs = commitments.filter((item) => item.status === 'delivered' && item.resolvedAt && item.dueBy).map((item) => new Date(item.dueBy).getTime() - new Date(item.resolvedAt).getTime());
  const avg = deliveredDiffs.length ? Math.round(deliveredDiffs.reduce((a,b)=>a+b,0) / deliveredDiffs.length / 60000) : null;
  const abs = Math.abs(avg || 0);
  const avgDeliveryLead = avg === null ? '—' : `${Math.floor(abs/60) ? `${Math.floor(abs/60)}h ` : ''}${abs%60}m ${avg >= 0 ? 'early' : 'late'}`.trim();
  return { commitmentsMade: made, delivered, missed, onTime, atRisk, avgDeliveryLead };
}

function readApprovalLedger(nowIso) {
  const dir = path.join(workspaceRoot, 'out', 'approvals');
  if (!exists(dir)) return [];
  const records = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const fullPath = path.join(dir, name);
    if (!stat(fullPath).isFile() || !name.endsWith('.jsonl')) continue;
    const raw = read(fullPath).trim();
    if (!raw) continue;
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        records.push({
          id: row.id,
          title: row.title || row.id,
          urgency: row.urgency || 'medium',
          status: row.resolution || row.status || 'pending',
          riskCategory: row.riskCategory || 'other',
          requestedBy: row.requestedBy || 'Mission Control',
          requestedAt: row.requestedAt || row.ts || nowIso,
          reason: row.reason || row.notes || 'Recorded in approval ledger.',
          consequence: row.consequence || 'Decision captured in approval ledger.',
          notes: row.notes || '',
          _truth: truth('verified', path.relative(workspaceRoot, fullPath), row.ts || toIso(stat(fullPath).mtimeMs))
        });
      } catch {}
    }
  }
  return records;
}

export function generateState(now = new Date()) {
  const isoNow = now.toISOString();
  const today = isoNow.slice(0, 10);
  const tasksPath = path.join(workspaceRoot, 'work', 'TASKS.md');
  const memoryPath = path.join(workspaceRoot, 'memory', `${today}.md`);
  const specPath = path.join(workspaceRoot, 'reference', 'mission-control-v2.1-spec.md');
  const statusDir = path.join(workspaceRoot, 'out', 'status');
  const memoryDir = path.join(workspaceRoot, 'memory');
  const heartbeatPath = path.join(workspaceRoot, 'out', 'heartbeat', 'latest.json');
  const sessionMemoryFiles = exists(memoryDir) ? fs.readdirSync(memoryDir).filter((name) => name.startsWith(today + '-') && name.endsWith('.md')).sort() : [];
  const statusFiles = exists(statusDir) ? fs.readdirSync(statusDir).filter((name) => name.endsWith('.md')).sort() : [];

  const tasks = exists(tasksPath) ? parseTasks(read(tasksPath)) : [];
  const memory = exists(memoryPath) ? parseMemorySections(read(memoryPath)) : { keyEvents: [], decisions: [], facts: [], priorities: [] };
  const specStats = exists(specPath) ? stat(specPath) : null;
  const usage = collectUsageRecords();
  const commitments = readCommitments(now);
  const commitmentStats = buildCommitmentStats(commitments);

  const artifacts = [
    ...(specStats ? [{
      title: 'Mission Control v2.1 Spec', category: 'spec', format: 'md', createdAt: toIso(specStats.mtimeMs), project: 'Mission Control', creator: 'Mansa', path: 'reference/mission-control-v2.1-spec.md'
    }] : []),
    ...statusFiles.map((name) => {
      const filePath = path.join(statusDir, name);
      const s = stat(filePath);
      return { title: name.replace(/\.md$/, ''), category: artifactCategory(name), format: 'md', createdAt: toIso(s.mtimeMs), project: name.includes('mission-control') ? 'Mission Control' : 'Operations', creator: 'Mansa', path: `out/status/${name}` };
    })
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const recentStatuses = statusFiles.slice(-6).map((name) => {
    const filePath = path.join(statusDir, name);
    const s = stat(filePath);
    const summary = summarizeStatusFile(filePath);
    return { timestamp: toIso(s.mtimeMs), actor: 'Mansa', type: 'status_file_updated', entity: `artifact/${name}`, summary: summary.objective || name, status: summary.phase === 'prepared' ? 'warning' : summary.phase === 'building' ? 'info' : 'success', verificationState: 'verified' };
  });
  const memoryEvents = memory.keyEvents.slice(0, 8).map((item, index) => ({ timestamp: toIso(new Date(now.getTime() - (index + 1) * 60000)), actor: 'Mansa', type: 'daily_memory', entity: `memory/${today}.md`, summary: item, status: 'info', verificationState: 'verified' }));
  const sessionEvents = sessionMemoryFiles.slice(-4).map((name) => {
    const fullPath = path.join(memoryDir, name);
    const session = parseSessionMemoryFile(name);
    return { timestamp: toIso(stat(fullPath).mtimeMs), actor: 'Mansa', type: 'session_memory_captured', entity: `memory/${name}`, summary: `${session.source} session captured: ${name.replace(/\.md$/, '')}`, status: 'info', verificationState: 'verified' };
  });
  const events = [...recentStatuses, ...sessionEvents, ...memoryEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const spendTodayUsd = usage.filter((row) => String(row.timestamp || '').startsWith(today)).reduce((sum, row) => sum + Number(row.estimatedCostUsd || 0), 0);
  const missionTask = tasks.find((task) => task.project === 'Mission Control' && task.lane === 'now') || tasks.find((task) => task.project === 'Mission Control');
  const waitingTasks = tasks.filter((task) => task.status === 'waiting_for_human');
  const blockedTasks = tasks.filter((task) => ['blocked', 'waiting_for_human'].includes(task.status)).length;
  const laneOrder = ['now', 'next', 'blocked', 'backlog', 'icebox', 'done_verified'];
  const laneLabelMap = { now: 'Now / Attack', next: 'Next Up', blocked: 'Blocked', backlog: 'Backlog', icebox: 'Icebox / Research', done_verified: 'Done / Verified' };
  const laneSummaries = laneOrder.map((lane) => ({ lane, label: tasks.find((task) => task.lane === lane)?.laneLabel || laneLabelMap[lane] || lane, count: tasks.filter((task) => task.lane === lane).length }));

  const ledgerApprovals = readApprovalLedger(isoNow);
  const approvals = ledgerApprovals.length ? ledgerApprovals : waitingTasks.map((task) => ({
    id: `approval-${safeSlug(task.title)}`,
    title: task.title,
    urgency: task.priority,
    status: 'pending',
    riskCategory: task.project === 'Operations' ? 'config_change' : 'other',
    requestedBy: task.assignee,
    requestedAt: isoNow,
    reason: 'Derived from work/TASKS.md waiting-for-human state.',
    consequence: 'Work remains stalled until the human-side dependency is cleared.',
    _truth: truth('claimed', 'work/TASKS.md', null)
  }));

  const heartbeat = exists(heartbeatPath) ? JSON.parse(read(heartbeatPath)) : null;
  const heartbeatAgeMs = heartbeat?.ts ? now.getTime() - new Date(heartbeat.ts).getTime() : null;
  const heartbeatHealth = !heartbeat ? 'unknown' : heartbeatAgeMs <= 15 * 60 * 1000 ? 'heartbeat_active' : 'heartbeat_stale';
  const heartbeatTruthState = !heartbeat ? 'unknown' : heartbeatAgeMs <= 15 * 60 * 1000 ? 'verified' : 'stale';

  const workspaceStatePath = path.join(workspaceRoot, '.openclaw', 'workspace-state.json');
  const workspaceState = exists(workspaceStatePath) ? JSON.parse(read(workspaceStatePath)) : null;

  const schedules = [
    { name: 'nightly-extraction', humanReadable: 'Every day at 2:00 AM Pacific', status: 'active', nextRunAt: '2026-03-19T09:00:00Z', lastRunAt: '2026-03-18T09:00:00Z', lastRunStatus: 'success', ownerAgent: 'Nightly Extraction' },
    { name: 'weekly-consolidation', humanReadable: 'Sunday at 9:00 AM Pacific', status: 'active', nextRunAt: '2026-03-22T16:00:00Z', lastRunAt: '2026-03-17T21:45:00Z', lastRunStatus: 'success', ownerAgent: 'Mansa' },
    { name: 'heartbeat-check', humanReadable: 'Lightweight monitoring cadence', status: heartbeat ? 'active' : (tasks.some((task) => /heartbeat/i.test(task.title)) ? 'active' : 'unknown'), nextRunAt: null, lastRunAt: heartbeat?.ts || '2026-03-18T10:55:00Z', lastRunStatus: heartbeat ? (heartbeatHealth === 'heartbeat_active' ? 'success' : 'warning') : (tasks.some((task) => /heartbeat/i.test(task.title) && task.status !== 'done_verified') ? 'warning' : 'unknown'), ownerAgent: 'Heartbeat' }
  ];

  const agents = [
    {
      id: 'agent-main',
      name: 'Mansa',
      role: 'Primary operator',
      tier: 'primary',
      model: 'unknown',
      provider: 'workspace state',
      environment: 'OpenClaw main',
      status: missionTask ? 'active' : 'idle',
      currentTaskSummary: heartbeat?.task || missionTask?.title || 'Reviewing workspace state',
      lastHeartbeatAt: heartbeat?.ts || workspaceState?.onboardingCompletedAt || isoNow,
      lastSeenAt: heartbeat?.ts || workspaceState?.onboardingCompletedAt || isoNow,
      health: heartbeat ? heartbeatHealth : 'unknown',
      recentActivityCount: events.length,
      _truth: truth(heartbeatTruthState, heartbeat ? 'out/heartbeat/latest.json' : '.openclaw/workspace-state.json', heartbeat?.ts || workspaceState?.onboardingCompletedAt || null)
    },
    ...sessionMemoryFiles.slice(-3).map(parseSessionMemoryFile)
  ];

  const alerts = [
    { id: 'alert-heartbeat-cost-logging', severity: tasks.some((task) => /heartbeat cost logging/i.test(task.title) && task.status !== 'done_verified') ? 'warning' : 'info', status: 'open', title: 'Heartbeat cost logging is still not explicit', description: 'The active task ledger still shows heartbeat cost logging as unfinished, so Usage / Cost cannot yet claim full truth.', recommendedAction: 'Ship direct cost logging and swap inferred rows for real records.' },
    { id: 'alert-first-revenue-not-started', severity: tasks.some((task) => /revenue-generating business/i.test(task.title) && task.status !== 'done_verified') ? 'critical' : 'info', status: 'open', title: 'First revenue push is still pending', description: 'The canonical task ledger still shows the first revenue-generating business as an open commitment.', recommendedAction: 'Use Mission Control to reduce operator friction, then move immediately into execution that can make money.' },
    { id: 'alert-usage-ledger-missing', severity: usage.length ? 'info' : 'warning', status: 'open', title: usage.length ? 'Usage ledger is present' : 'No direct usage ledger found', description: usage.length ? 'Usage / Cost now reads from real ledger files on disk.' : 'Mission Control did not find any structured usage/cost ledger files in the workspace, so spend is reported as unknown instead of guessed.', recommendedAction: usage.length ? 'Keep writing structured usage logs so costs stay grounded.' : 'Write JSON/JSONL usage records under out/usage, out/costs, or data/usage.' },
    { id: 'alert-local-proof-freshness', severity: 'info', status: 'open', title: 'Deployment shape is ready, but proof must stay fresh', description: 'Railway can boot this app directly, but Mission Control credibility still depends on rebuild/run proof in the status log.', recommendedAction: 'Re-run local smoke test or deploy after meaningful data/model changes.' }
  ];

  const truthItems = [...agents, ...approvals, ...usage, ...commitments];

  return {
    meta: {
      title: 'Mission Control',
      subtitle: 'Operator Console v2 MVP',
      generatedAt: isoNow,
      deployment: { mode: 'node_http_server', platformReady: ['Railway'], portSource: 'PORT env or 3000 default' },
      missionStatement: 'Turn the agent system from a black box into an observable, steerable, cost-aware operating system.',
      nextActions: memory.priorities.length ? memory.priorities.slice(0, 3) : ['Keep Mission Control grounded in real workspace data.', 'Add explicit cost logs next.', 'Use the saved proofs to reduce founder ping load.'],
      dataSources: [
        ...(exists(tasksPath) ? ['work/TASKS.md'] : []),
        ...(exists(memoryPath) ? [`memory/${today}.md`] : []),
        ...sessionMemoryFiles.map((name) => `memory/${name}`),
        ...(exists(specPath) ? ['reference/mission-control-v2.1-spec.md'] : []),
        ...(exists(workspaceStatePath) ? ['.openclaw/workspace-state.json'] : []),
        ...(exists(heartbeatPath) ? ['out/heartbeat/latest.json'] : []),
        ...statusFiles.map((name) => `out/status/${name}`),
        ...usage.map((row) => row.sourcePath),
        ...(ledgerApprovals.length ? ['out/approvals/*.jsonl'] : [])
      ]
    },
    overview: {
      activeAgents: agents.filter((agent) => ['active', 'recorded'].includes(agent.status)).length,
      tasksInProgress: tasks.filter((task) => task.lane === 'now').length,
      blockedTasks,
      pendingApprovals: approvals.filter((item) => item.status === 'pending').length,
      openAlerts: alerts.filter((alert) => alert.status === 'open').length,
      spendTodayUsd,
      artifactsCreatedToday: artifacts.filter((artifact) => artifact.createdAt.startsWith(today)).length,
      schedulesExecutedToday: schedules.filter((item) => String(item.lastRunAt || '').startsWith(today)).length,
      laneSummaries,
      dataQuality: buildDataQuality(truthItems),
      commitmentStats
    },
    commitments,
    agents,
    tasks,
    approvals,
    events,
    alerts,
    schedules,
    usage,
    artifacts,
    truthGaps: {
      usageCost: usage.length ? 'direct_real_ledger' : 'missing_direct_ledger',
      approvals: ledgerApprovals.length ? 'approval_ledger' : approvals.length ? 'task_derived' : 'no_waiting_human_items_found',
      agentHealth: heartbeat ? 'heartbeat_backed' : 'workspace_derived_not_live_runtime',
      scheduleFreshness: 'partially_recorded'
    },
    memory: {
      date: today,
      keyEvents: memory.keyEvents,
      decisions: memory.decisions,
      facts: memory.facts,
      relatedFiles: sessionMemoryFiles.map((name) => `memory/${name}`)
    },
    spec: {
      title: 'Mission Control v2.1 — Operator Console Spec',
      status: specStats ? 'Draft v2.1' : 'Missing',
      path: 'reference/mission-control-v2.1-spec.md',
      focus: ['Overview', 'Events', 'Problems / Alerts', 'Approvals', 'Usage / Cost']
    }
  };
}

export function writeStateFile() {
  const outPath = path.join(mcRoot, 'data', 'state.json');
  const tasksPath = path.join(workspaceRoot, 'work', 'TASKS.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (!exists(tasksPath) && exists(outPath)) {
    return outPath;
  }

  const state = generateState();
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2) + '\n');
  return outPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outPath = writeStateFile();
  console.log(`Wrote ${path.relative(workspaceRoot, outPath)}`);
}
