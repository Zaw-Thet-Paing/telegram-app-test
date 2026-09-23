import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./public/', import.meta.url));

// Keep local setup dependency-free: load simple KEY=value entries from .env.
const envPath = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function parseJsonEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

function extractProducts(payload) {
  const candidates = [
    payload,
    payload?.products,
    payload?.data,
    payload?.data?.products,
    payload?.result,
    payload?.result?.products,
    payload?.result?.records
  ];
  return candidates.find(Array.isArray) || [];
}

async function getProducts(req, res) {
  const apiUrl = process.env.PRODUCT_API_URL;
  if (!apiUrl) {
    return json(res, 503, { error: 'PRODUCT_API_URL is not configured' });
  }

  try {
    const method = (process.env.PRODUCT_API_METHOD || 'POST').toUpperCase();
    const headers = {
      accept: 'application/json',
      ...parseJsonEnv('PRODUCT_API_HEADERS', {})
    };
    const token = process.env.PRODUCT_API_TOKEN;
    if (token) headers.authorization = `Bearer ${token}`;

    const options = { method, headers };
    if (!['GET', 'HEAD'].includes(method)) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(parseJsonEnv('PRODUCT_API_BODY', {}));
    }

    const upstream = await fetch(apiUrl, options);
    const text = await upstream.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { message: text };
    }

    if (!upstream.ok) {
      console.error(`Product API failed with ${upstream.status}`);
      return json(res, 502, {
        error: 'Product service is unavailable',
        upstreamStatus: upstream.status
      });
    }

    return json(res, 200, { products: extractProducts(payload) });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Unable to load products' });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const relativePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/, '');
  const filePath = join(root, relativePath);

  if (!filePath.startsWith(root)) return json(res, 403, { error: 'Forbidden' });

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(file);
  } catch {
    json(res, 404, { error: 'Not found' });
  }
}

createServer(async (req, res) => {
  if (req.method === 'GET' && req.url?.split('?')[0] === '/api/products') {
    return getProducts(req, res);
  }
  if (req.method === 'GET') return serveStatic(req, res);
  json(res, 405, { error: 'Method not allowed' });
}).listen(port, () => {
  console.log(`Telegram Product Mini App running on http://localhost:${port}`);
});
