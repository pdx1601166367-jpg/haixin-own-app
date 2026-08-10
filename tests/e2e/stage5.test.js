const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 5：校招进展模块', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('统计数字与记录一致', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push(
        { id: 'r1', company: 'A公司', position: 'PM', appliedAt: '2026-08-01', status: 'applied', nextAction: '', deadline: '', timeline: [], note: '' },
        { id: 'r2', company: 'B公司', position: 'PM', appliedAt: '2026-08-02', status: 'interview', nextAction: '', deadline: '', timeline: [], note: '' },
        { id: 'r3', company: 'C公司', position: 'PM', appliedAt: '2026-08-03', status: 'interview', nextAction: '', deadline: '', timeline: [], note: '' },
        { id: 'r4', company: 'D公司', position: 'PM', appliedAt: '2026-08-04', status: 'offer', nextAction: '', deadline: '', timeline: [], note: '' }
      );
      LifeApp.store.save();
    });
    await page.locator('[data-module="campus"]').click();
    const text = await page.locator('#content').textContent();
    assert.match(text, /投递总数/);
    const nums = await page.locator('.campus-stats .num').allTextContents();
    assert.deepEqual(nums, ['4', '2', '1']);
  });

  it('新增投递记录出现在对应分组并刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="campus"]').click();
    await page.locator('[data-action="add-record"]').click();
    await page.fill('#campus-company', '腾讯');
    await page.fill('#campus-position', '产品经理');
    await page.selectOption('#campus-status', 'applied');
    await page.fill('#campus-next', '准备笔试');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /腾讯/);
    const appliedCol = page.locator('.kanban-col').filter({ hasText: '已投递' });
    assert.match(await appliedCol.textContent(), /腾讯/);
    await page.reload();
    await page.locator('[data-module="campus"]').click();
    assert.match(await page.locator('#content').textContent(), /腾讯/);
  });

  it('状态流转后记录移动到新分组', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push({ id: 'r1', company: '字节', position: 'PM', appliedAt: '', status: 'applied', nextAction: '', deadline: '', timeline: [], note: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="campus"]').click();
    await page.locator('[data-action="toggle-detail"][data-id="r1"]').click();
    await page.selectOption('[data-action="change-status"][data-id="r1"]', 'interview');
    const interviewCol = page.locator('.kanban-col').filter({ hasText: '面试' });
    assert.match(await interviewCol.textContent(), /字节/);
  });

  it('详情中可添加流程时间线节点', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push({ id: 'r1', company: '美团', position: 'PM', appliedAt: '', status: 'written', nextAction: '', deadline: '', timeline: [], note: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="campus"]').click();
    await page.locator('[data-action="toggle-detail"][data-id="r1"]').click();
    await page.fill('#campus-tl-stage', '一面');
    await page.locator('[data-action="add-timeline"][data-id="r1"]').click();
    assert.match(await page.locator('.campus-detail').textContent(), /一面/);
  });

  it('编辑记录可以修改公司名', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push({ id: 'r1', company: '旧公司', position: 'PM', appliedAt: '', status: 'preparing', nextAction: '', deadline: '', timeline: [], note: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="campus"]').click();
    await page.locator('[data-action="edit-record"][data-id="r1"]').click();
    await page.fill('#campus-company', '新公司');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /新公司/);
  });

  it('删除记录带二次确认', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push({ id: 'r1', company: '待删公司', position: 'PM', appliedAt: '', status: 'preparing', nextAction: '', deadline: '', timeline: [], note: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="campus"]').click();
    await page.locator('[data-action="delete-record"][data-id="r1"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定删除/);
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /待删公司/);
  });
});
