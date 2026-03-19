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
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendJson(res, 404, { error: 'not_found', path: path.basename(filePath) });
    return;
  }
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

function getState() {
  if (fs.existsSync(bakedStatePath)) {
    try {
      return JSON.parse(fs.readFileSync(bakedStatePath, 'utf8'));
    } catch {}
  }
  return generateState();
}

async function handleApprovalResolve(req, res, id) {
  const raw = await readBody(req);
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    sendJson(res, 400, { error: 'invalid_json' });
    return;
  }

  if (!['approved', 'rejected'].includes(body.resolution)) {
    sendJson(res, 400, { error: 'invalid_resolution' });
    return;
  }

  const ts = new Date().toISOString();
  const record = {
    id,
    resolution: body.resolution,
    notes: body.notes || '',
    ts,
    source: 'mission-control-ui'
  };
  const dir = path.join(workspaceRoot, 'out', 'approvals');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, `${ts.slice(0, 10)}.jsonl`), `${JSON.stringify(record)}\n`);
  sendJson(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${port}`}`);
  if (url.pathname === '/healthz') {
    sendJson(res, 200, { ok: true, service: 'mission-control', port });
    return;
  }
  if (url.pathname === '/api/state') {
    sendJson(res, 200, getState());
    return;
  }

  const approvalMatch = /^\/api\/approvals\/([^/]+)\/resolve$/.exec(url.pathname);
  if (req.method === 'POST' && approvalMatch) {
    await handleApprovalResolve(req, res, decodeURIComponent(approvalMatch[1]));
    return;
  }

  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(requested).replace(/^([.][.][\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }

  serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Mission Control listening on http://0.0.0.0:${port}`);
});
