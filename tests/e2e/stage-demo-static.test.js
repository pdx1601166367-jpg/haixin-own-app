const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, EXECUTABLES } = require('./helpers');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/api/data') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<html>404 not found</html>');
        return;
      }
      let filePath = path.normalize(path.join(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
      if (!filePath.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

describe('GitHub Pages 静态演示模式', () => {
  let browser;
  let server;
  let baseUrl;

  before(async () => {
    server = await startStaticServer();
    baseUrl = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ executablePath: EXECUTABLES[0], headless: true });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) server.close();
  });

  it('无本地服务时自动降级浏览器存储并载入演示数据', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(baseUrl + '/index.html?demo=1');
    await page.waitForFunction(() => window.LifeApp && LifeApp.store && !LifeApp.store.isFileMode());
    await page.waitForFunction(() => LifeApp.store.load().notes.some((n) => n.text.indexOf('作品集') !== -1));
    assert.match(await page.locator('#sidebar-storage-note').textContent(), /浏览器|降级|演示/);
    assert.match(await page.locator('#content').textContent(), /准备 AI 产品经理面试/);
    await context.close();
  });

  it('演示数据在刷新后保留', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(baseUrl + '/index.html?demo=1');
    await page.waitForFunction(() => LifeApp.store.load().campus.records.length >= 2);
    await page.reload();
    await page.waitForFunction(() => LifeApp.store.load().campus.records.length >= 2);
    assert.match(await page.locator('#content').textContent(), /某科技公司/);
    await context.close();
  });

  it('静态模式下新增数据写入浏览器存储并刷新保留', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(baseUrl + '/index.html?demo=1');
    await page.waitForFunction(() => window.LifeApp && LifeApp.store && !LifeApp.store.isFileMode());
    await page.fill('#note-input', '静态演示新增备忘');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => LifeApp.store.load().notes.some((n) => n.text === '静态演示新增备忘'));
    await page.reload();
    await page.waitForFunction(() => LifeApp.store.load().notes.some((n) => n.text === '静态演示新增备忘'));
    assert.match(await page.locator('#content').textContent(), /静态演示新增备忘/);
    await context.close();
  });
});
