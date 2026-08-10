const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('全局搜索、快速新增与保存状态', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('顶部工具栏显示日期、搜索、快速新增和保存状态', async () => {
    await freshApp(page);
    assert.match(await page.locator('#topbar-date').textContent(), /\d+月\d+日/);
    assert.equal(await page.locator('#global-search-btn').count(), 1);
    assert.equal(await page.locator('#quick-create-btn').count(), 1);
    assert.equal(await page.locator('#save-indicator').textContent(), '自动保存');
  });

  it('搜索按模块分组展示结果并可跳转', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '搜索测试备忘', done: false, createdAt: '' });
      d.campus.records.push({ id: 'r1', company: '搜索公司', position: 'PM', appliedAt: '', status: 'preparing', nextAction: '', deadline: '', timeline: [], note: '' });
      LifeApp.store.save();
    });
    await page.locator('#global-search-btn').click();
    await page.fill('#global-search-input', '搜索');
    const groups = await page.locator('.search-group-label').allTextContents();
    assert.deepEqual(groups, ['首页总览', '校招进展']);
    await page.locator('.search-result').filter({ hasText: '搜索公司' }).click();
    assert.equal(await page.locator('#module-title').textContent(), '校招进展');
  });

  it('Ctrl+K 可以打开全局搜索', async () => {
    await freshApp(page);
    await page.keyboard.press('Control+K');
    assert.equal(await page.locator('#global-search-input').count(), 1);
    await page.keyboard.press('Escape');
  });

  it('快速新增备忘并出现在首页', async () => {
    await freshApp(page);
    await page.locator('#quick-create-btn').click();
    await page.selectOption('#quick-type', 'note');
    await page.fill('#quick-title', '快速新增的备忘');
    await page.locator('.modal-foot .btn-primary').click();
    assert.equal(await page.locator('#module-title').textContent(), '首页总览');
    assert.match(await page.locator('#content').textContent(), /快速新增的备忘/);
  });

  it('快速新增今日事项并出现在计划页', async () => {
    await freshApp(page);
    await page.locator('#quick-create-btn').click();
    await page.selectOption('#quick-type', 'plan');
    await page.fill('#quick-title', '快速新增的事项');
    await page.locator('.modal-foot .btn-primary').click();
    assert.equal(await page.locator('#module-title').textContent(), '今日计划');
    assert.match(await page.locator('#content').textContent(), /快速新增的事项/);
  });

  it('快速新增产品需求需要先有项目并提示', async () => {
    await freshApp(page);
    await page.locator('#quick-create-btn').click();
    await page.selectOption('#quick-type', 'requirement');
    await page.fill('#quick-title', '无项目需求');
    await page.locator('.modal-foot .btn-primary').click();
    assert.equal(await page.locator('.modal').count(), 1);
    assert.match(await page.locator('.toast').last().textContent(), /请先创建产品项目/);
  });

  it('操作后保存状态显示已保存', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '保存状态测试', done: false, createdAt: '' });
      LifeApp.store.save();
    });
    await page.waitForFunction(() => document.getElementById('save-indicator').textContent === '已保存');
  });
});
