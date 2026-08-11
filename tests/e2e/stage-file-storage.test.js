const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium, EXECUTABLES } = require('./helpers');

const NODE = 'C:\\Users\\PC\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const SERVER = path.resolve(__dirname, '..', '..', 'server.js');
const PORT = 4871;
const BASE_URL = 'http://127.0.0.1:' + PORT;

function startServer(dataDir) {
  const child = spawn(NODE, [SERVER], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir },
    stdio: 'ignore',
    windowsHide: true
  });
  return child;
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE_URL + '/api/health');
      if (res.ok) return;
    } catch (err) {
      // 服务尚未就绪
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('本地服务启动超时');
}

async function waitForFileData(predicate, dataFile, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const text = await fs.readFile(dataFile, 'utf8');
      const parsed = JSON.parse(text);
      if (predicate(parsed)) return parsed;
    } catch (err) {
      // 文件尚未写入
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('数据文件未达到预期状态');
}

describe('本地文件夹文件存储', () => {
  let browser;
  let dataDir;
  let dataFile;
  let server;

  before(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lifeapp-file-'));
    dataFile = path.join(dataDir, 'app.json');
    server = startServer(dataDir);
    await waitForServer();
    browser = await chromium.launch({ executablePath: EXECUTABLES[0], headless: true });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) server.kill();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('服务模式下新增数据会写入独立文件', async () => {
    const page = await browser.newPage();
    await page.goto(BASE_URL + '/index.html');
    await page.waitForFunction(() => window.LifeApp && LifeApp.store && LifeApp.store.isFileMode());
    await page.fill('#note-input', '文件存储备忘');
    await page.keyboard.press('Enter');
    await waitForFileData((d) => d.notes.some((n) => n.text === '文件存储备忘'), dataFile);
    const saved = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    assert.ok(saved.notes.some((n) => n.text === '文件存储备忘'));
    assert.equal(await page.locator('#sidebar-storage-note').textContent(), '数据保存在本地文件夹');
    await page.close();
  });

  it('刷新后数据从文件恢复', async () => {
    const page = await browser.newPage();
    await page.goto(BASE_URL + '/index.html');
    await page.waitForFunction(() => window.LifeApp && LifeApp.store);
    await page.waitForFunction(() => LifeApp.store.load().notes.some((n) => n.text === '文件存储备忘'));
    assert.match(await page.locator('#content').textContent(), /文件存储备忘/);
    await page.reload();
    await page.waitForFunction(() => LifeApp.store.load().notes.some((n) => n.text === '文件存储备忘'));
    assert.match(await page.locator('#content').textContent(), /文件存储备忘/);
    await page.close();
  });

  it('关闭并重启服务后数据仍在文件中', async () => {
    server.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
    server = startServer(dataDir);
    await waitForServer();
    const page = await browser.newPage();
    await page.goto(BASE_URL + '/index.html');
    await page.waitForFunction(() => window.LifeApp && LifeApp.store);
    await page.waitForFunction(() => LifeApp.store.load().notes.some((n) => n.text === '文件存储备忘'));
    assert.match(await page.locator('#content').textContent(), /文件存储备忘/);
    await page.close();
  });

  it('备份导出与恢复导入在文件模式下工作', async () => {
    const page = await browser.newPage();
    await page.goto(BASE_URL + '/index.html');
    await page.waitForFunction(() => window.LifeApp && LifeApp.store && LifeApp.store.isFileMode());
    await page.locator('[data-module="settings"]').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-data"]').click();
    const download = await downloadPromise;
    const backup = await fs.readFile(await download.path());
    const parsed = JSON.parse(backup.toString('utf8'));
    assert.ok(parsed.notes.some((n) => n.text === '文件存储备忘'));
    await page.locator('[data-action="clear-data"]').click();
    await page.locator('.modal-foot .btn-primary').click();
    await waitForFileData((d) => d.notes.length === 0, dataFile);
    await page.setInputFiles('#import-file', { name: 'backup.json', mimeType: 'application/json', buffer: backup });
    await page.locator('.modal-foot .btn-primary').click();
    await waitForFileData((d) => d.notes.some((n) => n.text === '文件存储备忘'), dataFile);
    assert.ok((JSON.parse(await fs.readFile(dataFile, 'utf8'))).notes.some((n) => n.text === '文件存储备忘'));
    await page.close();
  });
});
