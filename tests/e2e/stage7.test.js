const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 7：健身计划模块', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('新增训练计划并添加动作', async () => {
    await freshApp(page);
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-action="add-plan"]').click();
    await page.fill('#fitness-plan-name', '胸部训练');
    await page.fill('#fitness-plan-schedule', '周一');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /胸部训练/);
    await page.locator('[data-action="add-exercise"]').click();
    await page.fill('#fitness-ex-name', '卧推');
    await page.fill('#fitness-ex-sets', '4');
    await page.fill('#fitness-ex-reps', '10');
    await page.fill('#fitness-ex-weight', '50');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /卧推/);
    assert.match(await page.locator('#content').textContent(), /4 组 × 10 次 × 50kg/);
    await page.reload();
    await page.locator('[data-module="fitness"]').click();
    assert.match(await page.locator('#content').textContent(), /胸部训练/);
  });

  it('打卡保存训练记录并显示摘要', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.fitness.plans.push({
        id: 'f1', name: '背部训练', schedule: '周二',
        exercises: [{ id: 'e1', name: '引体向上', sets: 3, reps: 8, weight: 0 }]
      });
      LifeApp.store.save();
    });
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-action="start-log"][data-id="f1"]').click();
    await page.fill('#fitness-ex-e1-sets', '5');
    await page.fill('#fitness-ex-e1-reps', '6');
    await page.locator('[data-action="save-log"]').click();
    assert.match(await page.locator('#content').textContent(), /训练记录/);
    assert.match(await page.locator('#content').textContent(), /引体向上 5x6x0kg/);
  });

  it('训练记录可删除', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.fitness.plans.push({ id: 'f1', name: '计划', schedule: '', exercises: [] });
      d.fitness.logs.push({ id: 'l1', date: '2026-08-10', planId: 'f1', exercises: [{ id: 'e1', name: '深蹲', sets: 3, reps: 10, weight: 60 }], note: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-tab="logs"]').click();
    assert.match(await page.locator('#content').textContent(), /深蹲/);
    await page.locator('[data-action="delete-log"][data-id="l1"]').click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /深蹲/);
  });

  it('身体指标可记录并显示趋势', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.fitness.metrics.push(
        { id: 'm1', date: '2026-08-01', weight: 66, bodyFat: 18 },
        { id: 'm2', date: '2026-08-08', weight: 65.5, bodyFat: 17.5 }
      );
      LifeApp.store.save();
    });
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-tab="metrics"]').click();
    assert.match(await page.locator('#content').textContent(), /65.5/);
    assert.match(await page.locator('#content').textContent(), /-0.5kg/);
    await page.locator('[data-action="add-metric"]').click();
    await page.fill('#fitness-metric-weight', '65');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /65kg/);
  });

  it('删除训练计划带二次确认', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.fitness.plans.push({ id: 'f1', name: '待删计划', schedule: '', exercises: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-action="delete-plan"][data-id="f1"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定删除/);
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /待删计划/);
  });

  it('训练日历按日期显示记录并可点击查看', async () => {
    await freshApp(page);
    const today = await page.evaluate(() => LifeApp.store.todayKey());
    await page.evaluate((date) => {
      const d = LifeApp.store.load();
      d.fitness.plans.push({ id: 'f1', name: '日历训练', schedule: '', exercises: [] });
      d.fitness.logs.push({ id: 'l1', date: date, planId: 'f1', exercises: [], status: 'completed', note: '' });
      LifeApp.store.save();
    }, today);
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-tab="logs"]').click();
    const dayCell = page.locator(`[data-cal-date="${today}"]`);
    assert.equal(await dayCell.count(), 1);
    assert.match(await dayCell.textContent(), /日历训练/);
    await dayCell.click();
    assert.match(await page.locator('.calendar-day-list').textContent(), /日历训练/);
  });

  it('开始训练后生成进行中记录并可完成', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.fitness.plans.push({ id: 'f1', name: '进行训练', schedule: '', exercises: [{ id: 'e1', name: '深蹲', sets: 3, reps: 10, weight: 50, restSeconds: 90 }] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-action="start-workout"][data-id="f1"]').click();
    assert.equal(await page.locator('#module-title').textContent(), '健身计划');
    assert.match(await page.locator('#content').textContent(), /进行中/);
    await page.locator('[data-action="complete-log"]').first().click();
    assert.match(await page.locator('#content').textContent(), /已完成/);
  });

  it('打卡表单显示上次动作数据参考', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.fitness.plans.push({ id: 'f1', name: '参考计划', schedule: '', exercises: [{ id: 'e1', name: '卧推', sets: 3, reps: 10, weight: 40, restSeconds: 60 }] });
      d.fitness.logs.push({ id: 'l1', date: '2026-08-01', planId: 'f1', exercises: [{ id: 'e1', name: '卧推', sets: 4, reps: 8, weight: 50 }], status: 'completed', note: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-tab="logs"]').click();
    assert.match(await page.locator('#content').textContent(), /上次：4 组 × 8 次 × 50kg/);
  });

  it('身体指标支持腰围、胸围和备注', async () => {
    await freshApp(page);
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-tab="metrics"]').click();
    await page.locator('[data-action="add-metric"]').click();
    await page.fill('#fitness-metric-weight', '65');
    await page.fill('#fitness-metric-waist', '78');
    await page.fill('#fitness-metric-chest', '95');
    await page.fill('#fitness-metric-notes', '状态不错');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /腰围 78cm/);
    assert.match(await page.locator('#content').textContent(), /状态不错/);
  });
});
