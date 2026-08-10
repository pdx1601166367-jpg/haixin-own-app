const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 6：产品工作模块', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('新增项目后自动选中并刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-action="add-project"]').first().click();
    await page.fill('#product-project-name', '个人产品项目');
    await page.fill('#product-project-desc', '记录产品工作');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /个人产品项目/);
    assert.match(await page.locator('.project-item').first().textContent(), /个人产品项目/);
    await page.reload();
    await page.locator('[data-module="product"]').click();
    assert.match(await page.locator('#content').textContent(), /个人产品项目/);
  });

  it('项目内可新增需求并显示优先级和状态', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({ id: 'pr1', name: '测试项目', desc: '', requirements: [], sprints: [], todos: [], logs: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-action="add-req"]').click();
    await page.fill('#product-req-title', '做一个需求池');
    await page.selectOption('#product-req-priority', 'P0');
    await page.selectOption('#product-req-status', 'doing');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /做一个需求池/);
    assert.match(await page.locator('#content').textContent(), /P0/);
    assert.match(await page.locator('#content').textContent(), /进行中/);
  });

  it('本周待办可添加、勾选和删除', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({ id: 'pr1', name: '测试项目', desc: '', requirements: [], sprints: [], todos: [], logs: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-project-tab="todos"]').click();
    await page.fill('#product-todo-input', '完成周报');
    await page.locator('[data-action="add-todo"]').click();
    assert.match(await page.locator('#content').textContent(), /完成周报/);
    await page.locator('[data-action="toggle-todo"]').check();
    assert.ok(await page.locator('.list-row').filter({ hasText: '完成周报' }).evaluate((el) => el.classList.contains('done')));
    await page.locator('[data-action="delete-todo"]').click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /完成周报/);
  });

  it('工作日志可新增和编辑', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({ id: 'pr1', name: '测试项目', desc: '', requirements: [], sprints: [], todos: [], logs: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-project-tab="logs"]').click();
    await page.locator('[data-action="add-log"]').click();
    await page.fill('#product-log-content', '今天确认了需求');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /今天确认了需求/);
    await page.locator('[data-action="edit-log"]').first().click();
    await page.fill('#product-log-content', '改后的日志');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /改后的日志/);
  });

  it('迭代计划可新增并保存条目', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({ id: 'pr1', name: '测试项目', desc: '', requirements: [], sprints: [], todos: [], logs: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-project-tab="sprints"]').click();
    await page.locator('[data-action="add-sprint"]').click();
    await page.fill('#product-sprint-name', 'V1.0');
    await page.fill('#product-sprint-items', '需求评审\n开发');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /V1.0/);
    assert.match(await page.locator('#content').textContent(), /需求评审/);
  });

  it('项目可编辑和删除（带二次确认）', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({ id: 'pr1', name: '旧项目', desc: '', requirements: [], sprints: [], todos: [], logs: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-action="edit-project"][data-id="pr1"]').click();
    await page.fill('#product-project-name', '新项目名');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /新项目名/);
    await page.locator('[data-action="delete-project"][data-id="pr1"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定删除/);
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /新项目名/);
  });

  it('项目支持进行中、暂停、已完成状态', async () => {
    await freshApp(page);
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-action="add-project"]').first().click();
    await page.fill('#product-project-name', '状态项目');
    await page.selectOption('#product-project-status', 'paused');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /暂停/);
  });

  it('里程碑可新增并显示目标日期', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({ id: 'pr1', name: '里程碑项目', desc: '', status: 'active', requirements: [], milestones: [], sprints: [], todos: [], logs: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-project-tab="milestones"]').click();
    await page.locator('[data-action="add-milestone"]').click();
    await page.fill('#product-milestone-name', 'V1 里程碑');
    await page.fill('#product-milestone-date', '2026-08-30');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /V1 里程碑/);
    assert.match(await page.locator('#content').textContent(), /目标 2026-08-30/);
  });

  it('需求类型可标记为 Bug 并筛选', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({ id: 'pr1', name: '筛选项目', desc: '', status: 'active', requirements: [], milestones: [], sprints: [], todos: [], logs: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-action="add-req"]').click();
    await page.fill('#product-req-title', '登录页 Bug');
    await page.selectOption('#product-req-type', 'bug');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /Bug/);
    await page.locator('[data-action="add-req"]').click();
    await page.fill('#product-req-title', '正常需求');
    await page.locator('.modal-foot .btn-primary').click();
    await page.locator('[data-req-filter="bug"]').click();
    assert.match(await page.locator('#content').textContent(), /登录页 Bug/);
    assert.doesNotMatch(await page.locator('#content').textContent(), /正常需求/);
  });

  it('需求可加入今日计划', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({
        id: 'pr1', name: '计划项目', desc: '', status: 'active',
        requirements: [{ id: 'r1', title: '要做的事', itemType: 'requirement', priority: 'P0', status: 'backlog' }],
        milestones: [], sprints: [], todos: [], logs: []
      });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-action="plan-req"][data-project="pr1"][data-id="r1"]').click();
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /要做的事/);
  });
});
