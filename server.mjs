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
let pushedState = null;
let pushedAt = 0;

// AI summary config
const AI_KEY = process.env.MC_AI_KEY || null;
const AI_MODEL = process.env.MC_AI_MODEL || 'gemini-2.5-flash';
const AI_PROVIDER = process.env.MC_AI_PROVIDER || 'google';
const SUMMARY_CACHE_TTL_MS = 5 * 60 * 1000;
let summaryCache = { summary: null, generatedAt: null, stateKey: null, cachedAt: 0 };

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

// --- AI Summary ---

function buildSummaryPrompt(state) {
  const agent = state?.agents?.[0] || {};
  const overview = state?.overview || {};
  const commitmentStats = overview.commitmentStats || {};
  const commitments = state?.commitments || [];
  const tasks = state?.tasks || [];
  const approvals = (state?.approvals || []).filter(a => String(a.status).toLowerCase() === 'pending');
  const alerts = (state?.alerts || []).filter(a => String(a.status).toLowerCase() === 'open');
  const heartbeatAgeMs = agent.lastHeartbeatAt ? Date.now() - new Date(agent.lastHeartbeatAt).getTime() : null;
  const heartbeatAge = heartbeatAgeMs != null ? `${Math.round(heartbeatAgeMs / 60000)} minutes` : 'unknown';
  const activeCommitments = commitments.filter(c => c.status === 'in_progress').length;
  const atRiskCommitments = commitments.filter(c => c.status === 'at_risk').length;
  const needsAhmed = approvals.length + tasks.filter(t => t.status === 'waiting_for_human').length;
  const onTimePercent = commitmentStats.delivered ? Math.round((commitmentStats.onTime || 0) / commitmentStats.delivered * 100) : 0;

  const context = `Current state:
- Agent health: ${agent.health || 'unknown'}
- Current task: ${agent.currentTaskSummary || 'None'}
- Time since last heartbeat: ${heartbeatAge}
- Active commitments: ${activeCommitments}
- At-risk commitments: ${atRiskCommitments}
- Items needing Ahmed: ${needsAhmed}
- Today's spend: $${Number(overview.spendTodayUsd || 0).toFixed(2)}
- Delivery record: ${commitmentStats.delivered || 0}/${commitmentStats.commitmentsMade || 0} delivered, ${onTimePercent}% on time`;

  return `You are summarizing the status of an AI agent called Mansa for its founder Ahmed.
Keep it to 2-3 sentences. Be direct. Use a warm but professional tone.
Focus on: what's happening right now, whether anything needs Ahmed's attention, and the delivery track record.

${context}

Generate a brief, friendly status summary.`;
}

function buildFallbackSummary(state) {
  const agent = state?.agents?.[0] || {};
  const overview = state?.overview || {};
  const commitmentStats = overview.commitmentStats || {};
  const approvals = (state?.approvals || []).filter(a => String(a.status).toLowerCase() === 'pending');
  const tasks = state?.tasks || [];
  const needsMe = approvals.length + tasks.filter(t => t.status === 'waiting_for_human').length;
  const deliveryRate = commitmentStats.commitmentsMade ? Math.round((commitmentStats.delivered || 0) / commitmentStats.commitmentsMade * 100) : 0;
  const currentTask = agent.currentTaskSummary || 'reviewing workspace state';
  const needsLine = needsMe > 0 ? `${needsMe} item${needsMe === 1 ? '' : 's'} need${needsMe === 1 ? 's' : ''} your attention.` : 'Nothing needs your attention right now.';
  return `Mansa is currently working on ${currentTask}. ${needsLine} Delivery rate: ${deliveryRate}%.`;
}

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { reject(new Error(`AI API returned non-JSON: ${raw.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('AI API timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function callAI(prompt) {
  if (!AI_KEY) throw new Error('MC_AI_KEY not configured');

  if (AI_PROVIDER === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_KEY}`;
    const payload = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    const parsed = new URL(url);
    const resp = await httpsRequest(parsed, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, payload);
    if (resp.status !== 200) throw new Error(`Google AI API error: ${resp.status}`);
    return resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (AI_PROVIDER === 'anthropic') {
    const payload = JSON.stringify({ model: AI_MODEL, max_tokens: 256, messages: [{ role: 'user', content: prompt }] });
    const resp = await httpsRequest('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(payload) } }, payload);
    if (resp.status !== 200) throw new Error(`Anthropic API error: ${resp.status}`);
    return resp.data?.content?.[0]?.text || '';
  }

  if (AI_PROVIDER === 'openai') {
    const payload = JSON.stringify({ model: AI_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 256 });
    const resp = await httpsRequest('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_KEY}`, 'Content-Length': Buffer.byteLength(payload) } }, payload);
    if (resp.status !== 200) throw new Error(`OpenAI API error: ${resp.status}`);
    return resp.data?.choices?.[0]?.message?.content || '';
  }

  throw new Error(`Unknown AI provider: ${AI_PROVIDER}`);
}

async function handleSummary(req, res) {
  const state = getState();
  const stateKey = state?.meta?.generatedAt || '';

  // Check cache
  if (summaryCache.summary && summaryCache.stateKey === stateKey && Date.now() - summaryCache.cachedAt < SUMMARY_CACHE_TTL_MS) {
    return sendJson(res, 200, { summary: summaryCache.summary, generatedAt: summaryCache.generatedAt, model: AI_MODEL, cached: true });
  }

  const generatedAt = new Date().toISOString();
  let summary;
  try {
    const prompt = buildSummaryPrompt(state);
    summary = await callAI(prompt);
  } catch {
    summary = buildFallbackSummary(state);
  }

  summaryCache = { summary, generatedAt, stateKey, cachedAt: Date.now() };
  return sendJson(res, 200, { summary, generatedAt, model: AI_KEY ? AI_MODEL : 'fallback' });
}

// --- Nudge system ---

async function handleNudge(req, res) {
  const raw = await readBody(req);
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return sendJson(res, 400, { error: 'invalid_json' }); }

  const validTypes = ['status_request', 'priority_change', 'deadline_extension', 'instruction'];
  if (!validTypes.includes(body.type)) return sendJson(res, 400, { error: 'invalid_type', validTypes });

  const ts = body.ts || new Date().toISOString();
  const nudgeId = `nudge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = { nudgeId, type: body.type, targetId: body.targetId || null, message: body.message || '', ts, source: 'mission-control-ui' };

  const dir = path.join(workspaceRoot, 'out', 'nudges');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${ts.slice(0, 10)}.jsonl`), `${JSON.stringify(record)}\n`);

  sendJson(res, 200, { ok: true, nudgeId });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${port}`}`);
  if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true, service: 'mission-control', port });
  if (url.pathname === '/api/state' && req.method === 'GET') return sendJson(res, 200, getState());
  if (url.pathname === '/api/state' && req.method === 'POST') return handleStatePush(req, res);
  if (url.pathname === '/api/summary' && req.method === 'GET') return handleSummary(req, res);
  if (url.pathname === '/api/nudge' && req.method === 'POST') return handleNudge(req, res);

  const approvalMatch = /^\/api\/approvals\/([^/]+)\/resolve$/.exec(url.pathname);
  if (req.method === 'POST' && approvalMatch) return handleApprovalResolve(req, res, decodeURIComponent(approvalMatch[1]));

  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(__dirname, safePath);
  if (!filePath.startsWith(__dirname)) return sendJson(res, 403, { error: 'forbidden' });
  serveFile(res, filePath);
});

server.listen(port, () => console.log(`Mission Control listening on http://0.0.0.0:${port}`));
