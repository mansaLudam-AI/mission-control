#!/usr/bin/env node
import http from 'node:http';
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${port}`}`);
  if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true, service: 'mission-control', port });
  if (url.pathname === '/api/state' && req.method === 'GET') return sendJson(res, 200, getState());
  if (url.pathname === '/api/state' && req.method === 'POST') return handleStatePush(req, res);

  const approvalMatch = /^\/api\/approvals\/([^/]+)\/resolve$/.exec(url.pathname);
  if (req.method === 'POST' && approvalMatch) return handleApprovalResolve(req, res, decodeURIComponent(approvalMatch[1]));

  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(__dirname, safePath);
  if (!filePath.startsWith(__dirname)) return sendJson(res, 403, { error: 'forbidden' });
  serveFile(res, filePath);
});

server.listen(port, () => console.log(`Mission Control listening on http://0.0.0.0:${port}`));
