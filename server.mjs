#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateState } from './scripts/build-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 3000);
const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '..');
const bakedStatePath = path.join(__dirname, 'data', 'state.json');
const PUSH_TOKEN = process.env.MC_PUSH_TOKEN || null;
const PUSH_TTL_MS = 10 * 60 * 1000;
const MC_AI_KEY = process.env.MC_AI_KEY || null;
const MC_AI_MODEL = process.env.MC_AI_MODEL || 'gemini-2.5-flash';
const MC_AI_PROVIDER = process.env.MC_AI_PROVIDER || 'google';
const MC_NUDGE_ENDPOINT = process.env.MC_NUDGE_ENDPOINT || null;
const SUMMARY_TTL_MS = 5 * 60 * 1000;

// OpenRouter usage tracking (single source of truth for all LLM costs)
const OPENROUTER_API_KEY = process.env.MC_OPENROUTER_API_KEY || null;
const USAGE_POLL_TTL_MS = 5 * 60 * 1000;
let usageCache = { data: null, fetchedAt: 0 };
let pushedState = null;
let pushedAt = 0;
let summaryCache = { summary: null, digest: null };

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return sendJson(res, 404, { error: 'not_found', path: path.basename(filePath) });
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function getBaseState() {
  if (fs.existsSync(bakedStatePath)) {
    try { return JSON.parse(fs.readFileSync(bakedStatePath, 'utf8')); } catch {}
  }
  return generateState();
}

function deepMerge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) return patch;
  if (!base || typeof base !== 'object' || !patch || typeof patch !== 'object') return patch;
  const merged = { ...base };
  for (const [key, value] of Object.entries(patch)) merged[key] = key in merged ? deepMerge(merged[key], value) : value;
  return merged;
}

function getState() {
  const base = getBaseState();
  if (pushedState && Date.now() - pushedAt < PUSH_TTL_MS) return deepMerge(base, pushedState);
  return base;
}

async function handleStatePush(req, res) {
  if (!PUSH_TOKEN) return sendJson(res, 403, { error: 'push_disabled' });
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${PUSH_TOKEN}`) return sendJson(res, 401, { error: 'unauthorized' });
  const raw = await readBody(req);
  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return sendJson(res, 400, { error: 'invalid_json' });
  }
  pushedState = body;
  pushedAt = Date.now();
  return sendJson(res, 200, { ok: true, receivedAt: new Date(pushedAt).toISOString() });
}

async function handleApprovalResolve(req, res, id) {
  const raw = await readBody(req);
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { return sendJson(res, 400, { error: 'invalid_json' }); }
  if (!['approved', 'rejected'].includes(body.resolution)) return sendJson(res, 400, { error: 'invalid_resolution' });
  const ts = new Date().toISOString();
  const record = { id, resolution: body.resolution, notes: body.notes || '', ts, source: 'mission-control-ui' };
  const dir = path.join(workspaceRoot, 'out', 'approvals');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${ts.slice(0, 10)}.jsonl`), `${JSON.stringify(record)}\n`);
  sendJson(res, 200, { ok: true });
}

/* ── AI Provider Architecture ── */
const AI_PROVIDERS = {
  google: {
    hostname: 'generativelanguage.googleapis.com',
    buildPath: (model, apiKey) => `/v1beta/models/${model}:generateContent?key=${apiKey}`,
    buildBody: (prompt) => ({ contents: [{ parts: [{ text: prompt }] }] }),
    extractText: (json) => json?.candidates?.[0]?.content?.parts?.[0]?.text || null
  },
  openai: {
    hostname: 'api.openai.com',
    buildPath: () => '/v1/chat/completions',
    buildBody: (prompt, model) => ({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 300 }),
    extractText: (json) => json?.choices?.[0]?.message?.content || null,
    authHeader: (apiKey) => `Bearer ${apiKey}`
  },
  anthropic: {
    hostname: 'api.anthropic.com',
    buildPath: () => '/v1/messages',
    buildBody: (prompt, model) => ({ model, max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
    extractText: (json) => json?.content?.[0]?.text || null,
    authHeader: (apiKey) => apiKey,
    extraHeaders: { 'anthropic-version': '2023-06-01' }
  }
};


function httpsPostJson(hostname, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname, path: urlPath, method: 'POST', timeout: 15000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('AI request timeout')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function buildSummaryPrompt(currentState, isDigest = false) {
  const agent = currentState?.agents?.[0] || {};
  const commitments = currentState?.commitments || [];
  const tasks = currentState?.tasks || [];
  const approvals = (currentState?.approvals || []).filter((a) => String(a.status).toLowerCase() === 'pending');
  const alerts = (currentState?.alerts || []).filter((a) => String(a.status).toLowerCase() === 'open');
  const usage = currentState?.usage || [];
  const totalSpend = usage.reduce((sum, r) => sum + Number(r.estimatedCostUsd || 0), 0).toFixed(2);
  const delivered = commitments.filter((c) => c.status === 'delivered').length;
  const atRisk = commitments.filter((c) => c.status === 'at_risk').length;
  const missed = commitments.filter((c) => c.status === 'missed').length;
  const activeTasks = tasks.filter((t) => t.lane === 'now').length;

  const context = `- Agent health: ${agent.health || 'unknown'}
- Current task: ${agent.currentTaskSummary || 'none'}
- Time since last heartbeat: ${agent.lastHeartbeatAt ? Math.round((Date.now() - new Date(agent.lastHeartbeatAt).getTime()) / 60000) + ' minutes' : 'unknown'}
- Active tasks (now lane): ${activeTasks}
- Active commitments: ${commitments.filter((c) => c.status === 'in_progress').length}
- At-risk commitments: ${atRisk}
- Missed commitments: ${missed}
- Pending approvals: ${approvals.length}
- Open alerts: ${alerts.length}
- Today's spend: $${totalSpend}
- Delivery record: ${delivered}/${commitments.length} delivered`;

  if (isDigest) {
    return `You are summarizing the overnight activity of an AI agent called Mansa for its founder Ahmed.
Keep it to 3-4 sentences. Be direct. Use a warm but professional tone.
Focus on: what was accomplished, what changed, whether anything needs Ahmed's attention now, and the delivery track record.

Current state:
${context}

Recent events:
${(currentState?.events || []).slice(0, 10).map((e) => `- ${e.summary || 'event'}`).join('\n')}

Generate a brief overnight digest summary. Start with what happened, end with what needs attention (if anything).`;
  }

  return `You are summarizing the status of an AI agent called Mansa for its founder Ahmed.
Keep it to 2-3 sentences. Be direct. Use a warm but professional tone.
Focus on: what's happening right now, whether anything needs Ahmed's attention, and the delivery track record.

Current state:
${context}

Generate a brief, friendly status summary. Do not include a greeting — just the status content.`;
}

function generateFallbackSummary(currentState) {
  const agent = currentState?.agents?.[0] || {};
  const commitments = currentState?.commitments || [];
  const approvals = (currentState?.approvals || []).filter((a) => String(a.status).toLowerCase() === 'pending');
  const delivered = commitments.filter((c) => c.status === 'delivered').length;
  const activeTasks = (currentState?.tasks || []).filter((t) => t.lane === 'now').length;
  const needsMe = approvals.length + (currentState?.tasks || []).filter((t) => t.status === 'waiting_for_human').length;
  const parts = [];
  if (agent.currentTaskSummary) parts.push(`Mansa is currently working on ${agent.currentTaskSummary}.`);
  else parts.push('Mansa has no active task recorded.');
  if (activeTasks) parts.push(`${activeTasks} task${activeTasks === 1 ? ' is' : 's are'} in the now lane.`);
  if (needsMe) parts.push(`${needsMe} item${needsMe === 1 ? '' : 's'} need${needsMe === 1 ? 's' : ''} your attention.`);
  if (delivered) parts.push(`Delivery rate: ${delivered}/${commitments.length} shipped.`);
  return parts.join(' ');
}

function getStatusFromState(currentState) {
  const agent = currentState?.agents?.[0];
  const commitments = currentState?.commitments || [];
  const approvals = (currentState?.approvals || []).filter((a) => String(a.status).toLowerCase() === 'pending');
  const waitingTasks = (currentState?.tasks || []).filter((t) => t.status === 'waiting_for_human').length;
  const atRisk = commitments.filter((c) => c.status === 'at_risk').length;
  const missed = commitments.filter((c) => c.status === 'missed').length;
  const heartbeatAgeMs = agent?.lastHeartbeatAt ? Date.now() - new Date(agent.lastHeartbeatAt).getTime() : Infinity;
  const alerts = (currentState?.alerts || []).filter((a) => String(a.status).toLowerCase() === 'open');
  if (!agent?.lastHeartbeatAt || heartbeatAgeMs > 2 * 60 * 60 * 1000) return 'offline';
  if (missed || alerts.some((a) => String(a.severity).toLowerCase() === 'critical') || heartbeatAgeMs > 30 * 60 * 1000) return 'stalled';
  if (approvals.length || waitingTasks || atRisk || heartbeatAgeMs > 10 * 60 * 1000) return 'attention';
  return 'ok';
}

async function fetchAiSummary(currentState, isDigest = false) {
  const cacheKey = isDigest ? 'digest' : 'summary';
  const stateTs = currentState?.meta?.generatedAt || '';
  const cached = summaryCache[cacheKey];
  if (cached && cached.stateTs === stateTs && Date.now() - cached.fetchedAt < SUMMARY_TTL_MS) {
    return cached.data;
  }

  const greeting = `${getTimeGreeting()}, Ahmed.`;
  const status = getStatusFromState(currentState);

  if (!MC_AI_KEY) {
    const data = { greeting, summary: generateFallbackSummary(currentState), status, generatedAt: new Date().toISOString(), source: 'fallback', type: cacheKey, lastStateUpdate: stateTs };
    summaryCache[cacheKey] = { stateTs, fetchedAt: Date.now(), data };
    return data;
  }

  const provider = AI_PROVIDERS[MC_AI_PROVIDER];
  if (!provider) {
    const data = { greeting, summary: generateFallbackSummary(currentState), status, generatedAt: new Date().toISOString(), source: 'fallback', type: cacheKey, lastStateUpdate: stateTs };
    summaryCache[cacheKey] = { stateTs, fetchedAt: Date.now(), data };
    return data;
  }

  try {
    const prompt = buildSummaryPrompt(currentState, isDigest);
    const urlPath = provider.buildPath(MC_AI_MODEL, MC_AI_KEY);
    const body = provider.buildBody(prompt, MC_AI_MODEL);
    const headers = {};
    if (provider.authHeader) {
      const authKey = MC_AI_PROVIDER === 'anthropic' ? 'x-api-key' : 'Authorization';
      headers[authKey] = provider.authHeader(MC_AI_KEY);
    }
    if (provider.extraHeaders) Object.assign(headers, provider.extraHeaders);

    const response = await httpsPostJson(provider.hostname, urlPath, body, headers);
    const text = provider.extractText(response);

    if (text) {
      const data = { greeting, summary: text.trim(), status, generatedAt: new Date().toISOString(), source: 'ai', type: cacheKey, lastStateUpdate: stateTs };
      summaryCache[cacheKey] = { stateTs, fetchedAt: Date.now(), data };
      return data;
    }
  } catch (err) {
    console.error('AI summary error:', err.message);
  }

  const data = { greeting, summary: generateFallbackSummary(currentState), status, generatedAt: new Date().toISOString(), source: 'fallback', type: cacheKey, lastStateUpdate: stateTs };
  summaryCache[cacheKey] = { stateTs, fetchedAt: Date.now(), data };
  return data;
}

async function handleSummary(req, res, url) {
  const isDigest = url.searchParams.get('digest') === 'true';
  const currentState = getState();
  const result = await fetchAiSummary(currentState, isDigest);
  sendJson(res, 200, result);
}

/* ── Provider Usage API Polling ── */
function httpsGetJson(hostname, urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path: urlPath, method: 'GET', timeout: 15000,
      headers: { 'Accept': 'application/json', ...headers }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Usage API request timeout')); });
    req.on('error', reject);
    req.end();
  });
}

async function fetchOpenRouterActivity() {
  if (!OPENROUTER_API_KEY) return null;
  try {
    // Fetch today's activity (per-model breakdown with actual costs from OpenRouter)
    const today = new Date().toISOString().slice(0, 10);
    const [activity, keyData] = await Promise.all([
      httpsGetJson('openrouter.ai', `/api/v1/activity?date=${today}`, {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      }),
      httpsGetJson('openrouter.ai', '/api/v1/auth/key', {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      })
    ]);

    const items = activity?.data || [];
    const modelMap = {};
    let totalCost = 0, totalInput = 0, totalOutput = 0;

    for (const item of items) {
      const model = item.model || item.model_name || 'unknown';
      const cost = Number(item.total_cost || item.cost || 0);
      const input = Number(item.tokens_prompt || item.input_tokens || 0);
      const output = Number(item.tokens_completion || item.output_tokens || 0);
      totalCost += cost;
      totalInput += input;
      totalOutput += output;
      if (!modelMap[model]) modelMap[model] = { model, costUsd: 0, inputTokens: 0, outputTokens: 0 };
      modelMap[model].costUsd += cost;
      modelMap[model].inputTokens += input;
      modelMap[model].outputTokens += output;
    }

    // Fall back to credits-used total from /auth/key if activity returned no cost data
    const creditsCost = Number(keyData?.data?.usage || 0);
    if (totalCost === 0 && creditsCost > 0) totalCost = creditsCost;

    return {
      provider: 'openrouter',
      costUsd: totalCost,
      creditsLimit: keyData?.data?.limit || null,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      models: Object.values(modelMap),
      fetchedAt: new Date().toISOString(),
      raw: { activity, keyData }
    };
  } catch (err) {
    console.error('OpenRouter activity fetch error:', err.message);
    return { provider: 'openrouter', error: err.message, fetchedAt: new Date().toISOString() };
  }
}

async function getProviderUsage() {
  if (usageCache.data && Date.now() - usageCache.fetchedAt < USAGE_POLL_TTL_MS) {
    return usageCache.data;
  }
  const provider = await fetchOpenRouterActivity();
  const providers = provider ? [provider] : [];
  const data = {
    totalCostUsd: provider?.costUsd || 0,
    totalInputTokens: provider?.inputTokens || 0,
    totalOutputTokens: provider?.outputTokens || 0,
    providers,
    configuredProviders: OPENROUTER_API_KEY ? ['openrouter'] : [],
    fetchedAt: new Date().toISOString()
  };
  usageCache = { data, fetchedAt: Date.now() };
  return data;
}

async function handleUsageLive(req, res) {
  const data = await getProviderUsage();
  sendJson(res, 200, data);
}

async function handleNudge(req, res) {
  const raw = await readBody(req);
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { return sendJson(res, 400, { error: 'invalid_json' }); }

  const validTypes = ['status_request', 'priority_change', 'deadline_extension', 'instruction'];
  if (!validTypes.includes(body.type)) return sendJson(res, 400, { error: 'invalid_type', validTypes });
  if (!body.message && body.type === 'instruction') return sendJson(res, 400, { error: 'message_required' });

  const nudgeId = `nudge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ts = new Date().toISOString();
  const record = { nudgeId, type: body.type, targetId: body.targetId || null, message: body.message || '', ts, source: 'mission-control-ui' };

  // Audit log
  const dir = path.join(workspaceRoot, 'out', 'nudges');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${ts.slice(0, 10)}.jsonl`), `${JSON.stringify(record)}\n`);

  // Forward to transport endpoint if configured
  if (MC_NUDGE_ENDPOINT) {
    try {
      const endpointUrl = new URL(MC_NUDGE_ENDPOINT);
      const mod = endpointUrl.protocol === 'https:' ? https : http;
      const fwdData = JSON.stringify(record);
      const fwdReq = mod.request({
        hostname: endpointUrl.hostname, port: endpointUrl.port, path: endpointUrl.pathname + endpointUrl.search,
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fwdData) }
      });
      fwdReq.on('error', (err) => console.error('Nudge forward error:', err.message));
      fwdReq.write(fwdData);
      fwdReq.end();
    } catch (err) {
      console.error('Nudge forward error:', err.message);
    }
  }

  sendJson(res, 200, { ok: true, nudgeId });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${port}`}`);
  if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true, service: 'mission-control', port });
  if (url.pathname === '/api/state' && req.method === 'GET') {
    const s = getState();
    if (s && s.meta) s.meta.nudgeEnabled = !!MC_NUDGE_ENDPOINT;
    else if (s) s.meta = { nudgeEnabled: !!MC_NUDGE_ENDPOINT };
    return sendJson(res, 200, s);
  }
  if (url.pathname === '/api/state' && req.method === 'POST') return handleStatePush(req, res);
  if (url.pathname === '/api/summary' && req.method === 'GET') return handleSummary(req, res, url);
  if (url.pathname === '/api/nudge' && req.method === 'POST') return handleNudge(req, res);
  if (url.pathname === '/api/usage/live' && req.method === 'GET') return handleUsageLive(req, res);

  const approvalMatch = /^\/api\/approvals\/([^/]+)\/resolve$/.exec(url.pathname);
  if (req.method === 'POST' && approvalMatch) return handleApprovalResolve(req, res, decodeURIComponent(approvalMatch[1]));

  // Static file serving
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(__dirname, safePath);
  if (!filePath.startsWith(__dirname)) return sendJson(res, 403, { error: 'forbidden' });

  // If the file exists, serve it directly
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(res, filePath);
  }

  // Path-based deep link catch-all: serve index.html for any unmatched route
  // This enables clean URLs like /task/deploy-v5, /approval/cost-cap, /work, etc.
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) return serveFile(res, indexPath);
  sendJson(res, 404, { error: 'not_found' });
});

server.listen(port, () => console.log(`Mission Control listening on http://0.0.0.0:${port}`));
