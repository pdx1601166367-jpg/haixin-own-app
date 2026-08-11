const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp, APP_URL } = require('./helpers');

const MODULE_NAMES = ['首页总览', '今日计划', '自媒体', '校招进展', '产品工作', '健身计划', '饮食计划', '游戏娱乐', '数据与设置'];

describe('阶段 0：项目骨架与导航', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('侧边栏包含 9 个模块', async () => {
    await freshApp(page);
    const names = await page.locator('.nav-item').allTextContents();
    assert.deepEqual(names, MODULE_NAMES);
  });

  it('侧边栏按日常、工作、生活、系统分组', async () => {
    await freshApp(page);
    const labels = await page.locator('.nav-label').allTextContents();
    assert.deepEqual(labels, ['日常', '工作', '生活', '系统']);
    const daily = await page.locator('.nav-group').filter({ hasText: '日常' }).locator('.nav-item').allTextContents();
    assert.deepEqual(daily, ['首页总览', '今日计划']);
  });

  it('品牌名显示为海星的工作生活', async () => {
    await freshApp(page);
    assert.equal(await page.locator('.brand-copy strong').textContent(), '海星的工作生活');
  });

  it('默认进入首页总览且当前项高亮', async () => {
    await freshApp(page);
    assert.equal(await page.locator('#module-title').textContent(), '首页总览');
    assert.equal(await page.locator('[data-module="home"]').getAttribute('class'), 'nav-item active');
    assert.match(await page.locator('#content').textContent(), /欢迎回来/);
  });

  it('点击每个导航项都能切换并高亮', async () => {
    await freshApp(page);
    for (const id of ['plan', 'media', 'campus', 'product', 'fitness', 'diet', 'game', 'settings', 'home']) {
      await page.locator(`[data-module="${id}"]`).click();
      const name = MODULE_NAMES[['home', 'plan', 'media', 'campus', 'product', 'fitness', 'diet', 'game', 'settings'].indexOf(id)];
      assert.equal(await page.locator('#module-title').textContent(), name);
      assert.ok(await page.locator(`[data-module="${id}"]`).evaluate((el) => el.classList.contains('active')));
    }
  });

  it('页面加载无控制台错误', async () => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await freshApp(page);
    assert.deepEqual(errors, []);
  });

  it('应用可通过 file:// 直接打开', async () => {
    assert.match(APP_URL, /^file:\/\//);
    await freshApp(page);
    assert.equal(await page.title(), '工作生活专属 App');
    assert.match(await page.locator('#sidebar-storage-note').textContent(), /本地数据|无法本地保存/);
  });
});
