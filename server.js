'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'app.json');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4567;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.command': 'text/plain; charset=utf-8',
  '.bat': 'text/plain; charset=utf-8'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let size = 0;
    const chunks = [];
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > 50 * 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDataFile() {
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeDataFile(payload) {
  ensureDataDir();
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function serveStatic(req, res, urlPath) {
  let filePath;
  try {
    filePath = path.normalize(path.join(ROOT, decodeURIComponent(urlPath)));
  } catch (err) {
    sendJson(res, 400, { error: 'bad path' });
    return;
  }
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }
  if (urlPath === '/' || urlPath === '/index.html') {
    filePath = path.join(ROOT, 'index.html');
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { error: 'not found' });
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
  const p = url.pathname;

  if (req.method === 'GET' && p === '/api/health') {
    sendJson(res, 200, { ok: true, dataFile: DATA_FILE });
    return;
  }

  if (req.method === 'GET' && p === '/api/data') {
    try {
      const value = readDataFile();
      if (!value) {
        sendJson(res, 404, { error: 'not_found' });
        return;
      }
      sendJson(res, 200, value);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && p === '/api/data') {
    readBody(req).then(function (text) {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid data');
      }
      writeDataFile(parsed);
      sendJson(res, 200, { ok: true, file: DATA_FILE });
    }).catch(function (err) {
      sendJson(res, 400, { error: err.message });
    });
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, p);
    return;
  }

  sendJson(res, 405, { error: 'method not allowed' });
});

server.listen(PORT, HOST, function () {
  console.log('海星的工作生活已启动: http://' + HOST + ':' + PORT);
  console.log('数据文件: ' + DATA_FILE);
});
