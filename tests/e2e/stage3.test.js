const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 3：首页总览', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('首页包含日期、今日计划、快速备忘和模块摘要', async () => {
    await freshApp(page);
    const text = await page.locator('#content').textContent();
    assert.match(text, /欢迎回来/);
    assert.match(text, /今日计划/);
    assert.match(text, /快速备忘/);
    assert.match(text, /模块摘要/);
    assert.equal(await page.locator('.summary-card').count(), 6);
  });

  it('今日计划区域显示任务和进度，并可跳转到计划页', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [
        { id: 't1', title: '首页任务甲', time: '10:00', priority: 'high', source: '', done: false },
        { id: 't2', title: '首页任务乙', time: '11:00', priority: 'low', source: '', done: true }
      ];
      LifeApp.store.save();
    });
    await page.reload();
    assert.match(await page.locator('#content').textContent(), /首页任务甲/);
    assert.match(await page.locator('.overview-strip').textContent(), /50%/);
    assert.match(await page.locator('.overview-strip').textContent(), /1 \/ 2/);
    await page.locator('[data-action="goto-plan"]').click();
    assert.equal(await page.locator('#module-title').textContent(), '今日计划');
  });

  it('首页勾选今日计划任务会立即更新进度', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [{ id: 't1', title: '待完成', time: '', priority: 'low', source: '', done: false }];
      LifeApp.store.save();
    });
    await page.reload();
    await page.locator('[data-action="toggle-home-task"]').check();
    assert.match(await page.locator('.overview-strip').textContent(), /100%/);
  });

  it('摘要卡片显示模块最新信息并可跳转', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push({ id: 'r1', company: '测试公司', position: 'PM', appliedAt: '', status: 'interview', nextAction: '', deadline: '', timeline: [], note: '' });
      LifeApp.store.save();
    });
    await page.reload();
    const card = page.locator('.summary-card').filter({ hasText: '校招进展' });
    assert.match(await card.textContent(), /面试中 1/);
    await card.click();
    assert.equal(await page.locator('#module-title').textContent(), '校招进展');
  });

  it('被隐藏的模块不出现在首页摘要中', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-module-toggle="game"]').uncheck();
    await page.locator('[data-module="home"]').click();
    assert.equal(await page.locator('.summary-card').filter({ hasText: '游戏娱乐' }).count(), 0);
    assert.equal(await page.locator('.summary-card').count(), 5);
  });

  it('快速备忘区域支持添加、完成和删除', async () => {
    await freshApp(page);
    await page.fill('#note-input', '首页备忘');
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#content').textContent(), /首页备忘/);
    await page.locator('[data-action="toggle-note"]').first().check();
    assert.ok(await page.locator('.note-row').filter({ hasText: '首页备忘' }).evaluate((el) => el.classList.contains('done')));
    await page.locator('[data-action="delete-note"]').first().click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /首页备忘/);
  });

  it('首页概况显示进度和已安排时长', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      const today = LifeApp.store.todayKey();
      d.plans[today] = [
        { id: 't1', title: '有时间任务', time: '09:00', priority: 'high', source: '', done: true, status: 'done', estimatedMinutes: 60 },
        { id: 't2', title: '待安排任务', time: '', priority: 'low', source: '', done: false, status: 'todo', estimatedMinutes: 30 }
      ];
      LifeApp.store.save();
    });
    await page.reload();
    assert.match(await page.locator('.overview-strip').textContent(), /50%/);
    assert.match(await page.locator('.overview-strip').textContent(), /1 \/ 2/);
    assert.match(await page.locator('.overview-strip').textContent(), /1 小时 30 分/);
    const timeline = page.locator('.home-plan').filter({ hasText: '今日时间线' });
    const unscheduled = page.locator('.home-plan').filter({ hasText: '待安排事项' });
    assert.match(await timeline.textContent(), /有时间任务/);
    assert.match(await unscheduled.textContent(), /待安排任务/);
  });

  it('首页显示需要关注的事项并可跳转', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push({ id: 'r1', company: '关注公司', position: 'PM', appliedAt: '', status: 'applied', nextAction: '准备面试', deadline: '2026-08-12', timeline: [], note: '' });
      LifeApp.store.save();
    });
    await page.reload();
    const attention = page.locator('.attention-list');
    assert.match(await attention.textContent(), /关注公司/);
    assert.match(await attention.textContent(), /截止 2026-08-12/);
    await attention.locator('[data-action="goto-attention"][data-goto-module="campus"]').click();
    assert.equal(await page.locator('#module-title').textContent(), '校招进展');
  });

  it('快速备忘停顿后自动保存，刷新后保留', async () => {
    await freshApp(page);
    await page.fill('#note-input', '自动保存的备忘');
    await page.waitForTimeout(900);
    await page.reload();
    assert.match(await page.locator('#content').textContent(), /自动保存的备忘/);
  });

  it('快速备忘可转为今日事项', async () => {
    await freshApp(page);
    await page.fill('#note-input', '转成事项的备忘');
    await page.keyboard.press('Enter');
    await page.locator('[data-action="convert-memo"]').click();
    assert.doesNotMatch(await page.locator('.home-notes').textContent(), /转成事项的备忘/);
    assert.match(await page.locator('.home-plan').filter({ hasText: '待安排事项' }).textContent(), /转成事项的备忘/);
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /转成事项的备忘/);
  });
});
