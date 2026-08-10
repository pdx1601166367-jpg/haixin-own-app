const path = require('node:path');
const { pathToFileURL } = require('node:url');

function resolvePlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    'playwright',
    'C:\\Users\\PC\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright'
  ].filter(Boolean);
  let lastError = null;
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('未找到 playwright，请先安装或设置 PLAYWRIGHT_PATH');
}

const { chromium } = resolvePlaywright();

const APP_DIR = path.resolve(__dirname, '..', '..');
const APP_URL = pathToFileURL(path.join(APP_DIR, 'index.html')).href;

const EXECUTABLES = process.env.BROWSER_PATH
  ? [process.env.BROWSER_PATH]
  : [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];

async function launchBrowser() {
  let lastError = null;
  for (const executablePath of EXECUTABLES) {
    try {
      return await chromium.launch({ executablePath, headless: true });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('未找到可用的 Chromium 浏览器');
}

async function openApp() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(APP_URL);
  return { browser, page };
}

async function freshApp(page) {
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

module.exports = { APP_DIR, APP_URL, launchBrowser, openApp, freshApp, chromium, EXECUTABLES };
