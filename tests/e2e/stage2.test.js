const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 2：今日计划与快速备忘', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('今日计划空状态显示引导和新增按钮', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /这个时间范围还没有计划/);
    assert.equal(await page.locator('[data-action="add-task"]').count(), 2);
  });

  it('新增任务后显示在列表，刷新后保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="add-task"]').first().click();
    await page.fill('#task-title', '写完开发计划');
    await page.fill('#task-time', '09:30');
    await page.selectOption('#task-priority', 'high');
    await page.selectOption('#task-source', 'product');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /写完开发计划/);
    assert.match(await page.locator('#content').textContent(), /高优先级/);
    assert.match(await page.locator('#content').textContent(), /产品工作/);
    await page.reload();
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /写完开发计划/);
  });

  it('空标题不能保存', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="add-task"]').first().click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /这个时间范围还没有计划/);
    assert.equal(await page.locator('.modal').count(), 1);
  });

  it('勾选完成后进度和完成率更新', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [
        { id: 't1', title: '任务一', time: '10:00', priority: 'high', source: '', done: false },
        { id: 't2', title: '任务二', time: '11:00', priority: 'low', source: '', done: false }
      ];
      LifeApp.store.save();
    });
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /0\/2 完成 · 0%/);
    await page.locator('[data-action="toggle-task"][data-id="t1"]').click();
    assert.match(await page.locator('#content').textContent(), /1\/2 完成 · 50%/);
    assert.ok(await page.locator('.task-row').filter({ hasText: '任务一' }).evaluate((el) => el.classList.contains('done')));
  });

  it('编辑任务可以修改标题', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [{ id: 't1', title: '旧标题', time: '', priority: 'low', source: '', done: false }];
      LifeApp.store.save();
    });
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="edit-task"][data-id="t1"]').click();
    await page.fill('#task-title', '新标题');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /新标题/);
  });

  it('删除任务有二次确认，取消不删，确认删除', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [{ id: 't1', title: '要删除的任务', time: '', priority: 'low', source: '', done: false }];
      LifeApp.store.save();
    });
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="delete-task"][data-id="t1"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定删除/);
    await page.locator('.modal-foot .btn').first().click();
    assert.match(await page.locator('#content').textContent(), /要删除的任务/);
    await page.locator('[data-action="delete-task"][data-id="t1"]').click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /要删除的任务/);
  });

  it('日期可切换并回到今天', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    const today = await page.locator('[data-testid="plan-date"]').textContent();
    await page.locator('[data-action="prev-day"]').click();
    const yesterday = await page.locator('[data-testid="plan-date"]').textContent();
    assert.notEqual(yesterday, today);
    await page.locator('[data-action="today"]').click();
    assert.equal(await page.locator('[data-testid="plan-date"]').textContent(), today);
  });

  it('来源标签可跳转到对应模块', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [{ id: 't1', title: '校招任务', time: '', priority: 'medium', source: 'campus', done: false }];
      LifeApp.store.save();
    });
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="goto-source"][data-source="campus"]').click();
    assert.equal(await page.locator('#module-title').textContent(), '校招进展');
  });

  it('今日、本周和历史视图切换', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      const today = LifeApp.store.todayKey();
      const next = LifeApp.store.addDays(today, 2);
      d.plans[today] = [{ id: 't1', title: '今天任务', time: '', priority: 'low', source: '', done: false, status: 'todo', estimatedMinutes: 0 }];
      d.plans[next] = [{ id: 't2', title: '两天后任务', time: '', priority: 'low', source: '', done: false, status: 'todo', estimatedMinutes: 0 }];
      LifeApp.store.save();
    });
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /今天任务/);
    assert.doesNotMatch(await page.locator('#content').textContent(), /两天后任务/);
    await page.locator('[data-view="week"]').click();
    assert.match(await page.locator('#content').textContent(), /两天后任务/);
    await page.locator('[data-view="history"]').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /今天任务/);
  });

  it('行操作菜单支持开始、完成、移到明天和取消', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [{ id: 't1', title: '操作任务', time: '', priority: 'medium', source: '', done: false, status: 'todo', estimatedMinutes: 30 }];
      LifeApp.store.save();
    });
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="open-menu"][data-id="t1"]').click();
    await page.locator('[data-action="start-task"][data-id="t1"]').click();
    assert.match(await page.locator('#content').textContent(), /进行中/);
    await page.locator('[data-action="open-menu"][data-id="t1"]').click();
    await page.locator('[data-action="complete-task"][data-id="t1"]').click();
    assert.match(await page.locator('#content').textContent(), /已完成/);
    assert.match(await page.locator('#content').textContent(), /1\/1 完成 · 100%/);
  });

  it('移到明天后任务出现在明天', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [{ id: 't1', title: '明天处理', time: '', priority: 'low', source: '', done: false, status: 'todo', estimatedMinutes: 0 }];
      LifeApp.store.save();
    });
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="open-menu"][data-id="t1"]').click();
    await page.locator('[data-action="postpone-task"][data-id="t1"]').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /明天处理/);
    await page.locator('[data-action="next-day"]').click();
    assert.match(await page.locator('#content').textContent(), /明天处理/);
  });

  it('当日复盘可保存并刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    await page.fill('#plan-review', '今天完成了重要进展');
    await page.locator('#plan-review').blur();
    await page.reload();
    await page.locator('[data-module="plan"]').click();
    assert.equal(await page.locator('#plan-review').inputValue(), '今天完成了重要进展');
  });

  it('首页快速备忘回车即记，勾选删除，刷新保留', async () => {
    await freshApp(page);
    await page.fill('#note-input', '记得喝水');
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#content').textContent(), /记得喝水/);
    await page.locator('[data-action="toggle-note"]').first().check();
    assert.ok(await page.locator('.note-row').first().evaluate((el) => el.classList.contains('done')));
    await page.reload();
    assert.match(await page.locator('#content').textContent(), /记得喝水/);
    await page.locator('[data-action="delete-note"]').first().click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /记得喝水/);
  });
});
