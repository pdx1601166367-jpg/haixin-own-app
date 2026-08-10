const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 1：数据层、通用组件与设置基础', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('设置页显示数据概览、外观和模块开关', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    assert.match(await page.locator('#content').textContent(), /数据概览/);
    assert.match(await page.locator('#content').textContent(), /外观/);
    assert.match(await page.locator('#content').textContent(), /模块开关/);
    assert.equal(await page.locator('[data-module-toggle]').count(), 7);
  });

  it('切换主题色立即生效且刷新后保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('.swatch-green').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-accent')), 'green');
    const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    assert.match(accent, /047857|rgb\(4, 120, 87\)|green/);
    await page.reload();
    await page.locator('[data-module="settings"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-accent')), 'green');
  });

  it('切换列表密度立即生效且刷新后保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-setting="density"] [data-value="compact"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-density')), 'compact');
    await page.reload();
    await page.locator('[data-module="settings"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-density')), 'compact');
  });

  it('关闭模块后导航隐藏，刷新仍隐藏，重新开启恢复', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-module-toggle="game"]').uncheck();
    assert.equal(await page.locator('[data-module="game"]').count(), 0);
    assert.equal(await page.locator('.nav-item').count(), 8);
    await page.reload();
    assert.equal(await page.locator('[data-module="game"]').count(), 0);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-module-toggle="game"]').check();
    assert.equal(await page.locator('[data-module="game"]').count(), 1);
  });

  it('关闭模块后导航不可进入，重新开启后恢复进入', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    assert.equal(await page.locator('#module-title').textContent(), '今日计划');
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-module-toggle="plan"]').uncheck();
    assert.equal(await page.locator('[data-module="plan"]').count(), 0);
    await page.locator('[data-module-toggle="plan"]').check();
    await page.locator('[data-module="plan"]').click();
    assert.equal(await page.locator('#module-title').textContent(), '今日计划');
  });

  it('数据概览数字随数据更新', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 't1', text: '测试备忘', done: false, createdAt: 'x' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="settings"]').click();
    const stat = await page.locator('.stat-card').filter({ hasText: '备忘' }).textContent();
    assert.match(stat, /1/);
  });

  it('每周起始日和日期格式可保存并刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.selectOption('#setting-week-start', 'sunday');
    await page.selectOption('#setting-date-format', 'iso');
    const settings = await page.evaluate(() => {
      const d = LifeApp.store.load();
      return { weekStart: d.settings.weekStart, dateFormat: d.settings.dateFormat };
    });
    assert.deepEqual(settings, { weekStart: 'sunday', dateFormat: 'iso' });
    await page.reload();
    await page.locator('[data-module="settings"]').click();
    assert.equal(await page.locator('#setting-week-start').inputValue(), 'sunday');
    assert.equal(await page.locator('#setting-date-format').inputValue(), 'iso');
  });

  it('首页摘要模块开关控制首页显示', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-dashboard-toggle="game"]').uncheck();
    await page.locator('[data-module="home"]').click();
    assert.equal(await page.locator('.summary-card').filter({ hasText: '游戏娱乐' }).count(), 0);
    assert.equal(await page.locator('.summary-card').count(), 5);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-dashboard-toggle="game"]').check();
    await page.locator('[data-module="home"]').click();
    assert.equal(await page.locator('.summary-card').filter({ hasText: '游戏娱乐' }).count(), 1);
  });

  it('ISO 日期格式应用到首页', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.selectOption('#setting-date-format', 'iso');
    await page.locator('[data-module="home"]').click();
    assert.match(await page.locator('.page-heading h1').textContent(), /从重点开始/);
    const dateFormat = await page.evaluate(() => LifeApp.store.load().settings.dateFormat);
    assert.equal(dateFormat, 'iso');
  });

  it('界面风格切换立即生效且刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-setting="appearance"] [data-value="notebook"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-appearance')), 'notebook');
    await page.locator('[data-setting="appearance"] [data-value="neo"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-appearance')), 'neo');
    await page.reload();
    await page.locator('[data-module="settings"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-appearance')), 'neo');
  });

  it('深色主题切换立即生效且刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-setting="theme"] [data-value="dark"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
  });
});
