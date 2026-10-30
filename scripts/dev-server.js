/* =====================================================================
   scripts/dev-server.js — local test server (npm run dev)
   ---------------------------------------------------------------------
   Works like Vercel on your computer, without needing a Vercel login:
   - serves the website from /public with clean URLs (/category -> category.html)
   - runs the API files in /api (e.g. /api/products/toor-dal-1kg -> api/products/[id].js)
   - reads secrets from .env.local
   Restarts by itself when you change a file in /api or /lib.
   ===================================================================== */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const API = path.join(ROOT, 'api');
const PORT = Number(process.env.PORT) || 3000;

loadEnvFile('.env.local');
loadEnvFile('.env');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) await serveApi(req, res, url);
    else serveStatic(res, url);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Server error — see terminal');
  }
}).listen(PORT, () => {
  console.log(`\n  Subhash store running at  http://localhost:${PORT}`);
  console.log(`  Database: ${process.env.TURSO_DATABASE_URL ? 'Turso (cloud)' : 'local.db (local file)'}\n`);
});

// ---------- API: find the matching file in /api and call GET/POST ----------
async function serveApi(req, res, url) {
  const file = findApiFile(url.pathname.slice('/api/'.length).split('/').filter(Boolean));
  if (!file) return send(res, 404, { error: 'Not found' });

  const mod = await import(pathToFileURL(file).href);
  const handler = mod[req.method];
  if (!handler) return send(res, 405, { error: 'Method not allowed' });

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
  const request = new Request(url, { method: req.method, headers: req.headers, body });
  const response = await handler(request);

  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
  console.log(`${req.method} ${url.pathname}${url.search} → ${response.status}`);
}

/** /api/products/abc -> api/products/abc.js, api/products/abc/index.js or api/products/[id].js */
function findApiFile(parts) {
  let dir = API;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const last = i === parts.length - 1;
    if (last && fs.existsSync(path.join(dir, part + '.js'))) return path.join(dir, part + '.js');
    if (fs.existsSync(path.join(dir, part)) && fs.statSync(path.join(dir, part)).isDirectory()) {
      dir = path.join(dir, part);
      if (last && fs.existsSync(path.join(dir, 'index.js'))) return path.join(dir, 'index.js');
      continue;
    }
    const dynamic = fs.readdirSync(dir).find((f) => /^\[.+\](\.js)?$/.test(f));
    if (!dynamic) return null;
    if (dynamic.endsWith('.js')) return last ? path.join(dir, dynamic) : null;
    dir = path.join(dir, dynamic);
    if (last) return fs.existsSync(path.join(dir, 'index.js')) ? path.join(dir, 'index.js') : null;
  }
  return null;
}

// ---------- Website files ----------
function serveStatic(res, url) {
  let rel = decodeURIComponent(url.pathname);
  const candidates = rel.endsWith('/') ? [rel + 'index.html'] : [rel, rel + '.html', rel + '/index.html'];
  for (const c of candidates) {
    const file = path.join(PUBLIC, c);
    if (!file.startsWith(PUBLIC)) break; // block "../" tricks
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    }
  }
  res.writeHead(404, { 'Content-Type': TYPES['.html'] });
  fs.createReadStream(path.join(PUBLIC, '404.html')).pipe(res);
}

// ---------- Helpers ----------
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Minimal .env reader: NAME=value lines, # comments ignored. Doesn't overwrite real env vars. */
function loadEnvFile(name) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
