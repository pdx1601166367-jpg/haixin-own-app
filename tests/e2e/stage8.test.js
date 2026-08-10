const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 8：饮食计划模块', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('记录餐食后热量合计更新并刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="diet"]').click();
    await page.locator('[data-action="add-meal"]').first().click();
    await page.selectOption('#diet-meal-type', 'breakfast');
    await page.fill('#diet-meal-food', '鸡蛋');
    await page.fill('#diet-meal-calories', '80');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /鸡蛋/);
    assert.match(await page.locator('.diet-stats').textContent(), /80/);
    await page.reload();
    await page.locator('[data-module="diet"]').click();
    assert.match(await page.locator('#content').textContent(), /鸡蛋/);
    assert.match(await page.locator('.diet-stats').textContent(), /80/);
  });

  it('三餐和加餐分区显示各自记录', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      const today = LifeApp.store.todayKey();
      d.diet.days.push({
        id: 'd1', date: today, meals: [
          { id: 'm1', type: 'breakfast', food: '燕麦', calories: 200 },
          { id: 'm2', type: 'lunch', food: '鸡胸肉沙拉', calories: 400 }
        ]
      });
      LifeApp.store.save();
    });
    await page.locator('[data-module="diet"]').click();
    const breakfast = page.locator('.diet-meal-panel').filter({ hasText: '早餐' });
    const lunch = page.locator('.diet-meal-panel').filter({ hasText: '午餐' });
    assert.match(await breakfast.textContent(), /燕麦/);
    assert.match(await lunch.textContent(), /鸡胸肉沙拉/);
    assert.match(await page.locator('.diet-stats').textContent(), /600/);
  });

  it('饮水打卡可加减', async () => {
    await freshApp(page);
    await page.locator('[data-module="diet"]').click();
    await page.locator('[data-action="water-plus"]').click();
    await page.locator('[data-action="water-plus"]').click();
    assert.match(await page.locator('.diet-stats').textContent(), /2/);
    await page.locator('[data-action="water-minus"]').click();
    assert.match(await page.locator('.diet-stats').textContent(), /1/);
  });

  it('菜谱库可新增并可一键记到今日', async () => {
    await freshApp(page);
    await page.locator('[data-module="diet"]').click();
    await page.locator('[data-action="add-recipe"]').click();
    await page.fill('#diet-recipe-name', '鸡胸肉沙拉');
    await page.fill('#diet-recipe-food', '鸡胸肉 150g、生菜');
    await page.fill('#diet-recipe-calories', '300');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /鸡胸肉沙拉/);
    await page.locator('[data-action="use-recipe"]').first().click();
    assert.match(await page.locator('#content').textContent(), /鸡胸肉 150g、生菜/);
    assert.match(await page.locator('.diet-stats').textContent(), /300/);
  });

  it('日期可切换并回到今天', async () => {
    await freshApp(page);
    await page.locator('[data-module="diet"]').click();
    const today = await page.locator('[data-testid="diet-date"]').textContent();
    await page.locator('[data-action="prev-day"]').click();
    assert.notEqual(await page.locator('[data-testid="diet-date"]').textContent(), today);
    await page.locator('[data-action="today"]').click();
    assert.equal(await page.locator('[data-testid="diet-date"]').textContent(), today);
  });

  it('餐食可编辑和删除（带二次确认）', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      const today = LifeApp.store.todayKey();
      d.diet.days.push({ id: 'd1', date: today, meals: [{ id: 'm1', type: 'snack', food: '薯片', calories: 200 }] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="diet"]').click();
    await page.locator('[data-action="edit-meal"][data-id="m1"]').click();
    await page.fill('#diet-meal-food', '坚果');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /坚果/);
    await page.locator('[data-action="delete-meal"][data-id="m1"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定删除/);
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /坚果/);
  });

  it('营养目标设置后实际摄入显示进度', async () => {
    await freshApp(page);
    await page.locator('[data-module="diet"]').click();
    await page.locator('[data-action="edit-target"]').click();
    await page.fill('#diet-target-calories', '2000');
    await page.fill('#diet-target-protein', '100');
    await page.locator('.modal-foot .btn-primary').click();
    await page.locator('[data-action="add-meal"]').first().click();
    await page.fill('#diet-meal-food', '鸡胸肉');
    await page.fill('#diet-meal-calories', '500');
    await page.fill('#diet-meal-protein', '50');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('.nutrition-strip').textContent(), /500/);
    assert.match(await page.locator('.nutrition-strip').textContent(), /2000/);
    assert.match(await page.locator('.nutrition-strip').textContent(), /50/);
  });

  it('计划餐食和实际摄入分开标记与统计', async () => {
    await freshApp(page);
    await page.locator('[data-module="diet"]').click();
    await page.locator('[data-action="add-meal"]').first().click();
    await page.selectOption('#diet-meal-kind', 'planned');
    await page.fill('#diet-meal-food', '计划午餐');
    await page.fill('#diet-meal-calories', '600');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /计划/);
    assert.match(await page.locator('.diet-stats').textContent(), /0/);
  });

  it('可复制昨天的计划餐食', async () => {
    await freshApp(page);
    const yesterday = await page.evaluate(() => LifeApp.store.addDays(LifeApp.store.todayKey(), -1));
    await page.evaluate((date) => {
      const d = LifeApp.store.load();
      d.diet.days.push({ id: 'd1', date: date, meals: [{ id: 'm1', type: 'lunch', food: '昨天的午餐', calories: 500, entryKind: 'planned' }] });
      LifeApp.store.save();
    }, yesterday);
    await page.locator('[data-module="diet"]').click();
    await page.locator('[data-action="copy-yesterday"]').click();
    assert.match(await page.locator('#content').textContent(), /昨天的午餐/);
    assert.match(await page.locator('#content').textContent(), /计划/);
  });

  it('饮食日历按日期显示餐食并可切换', async () => {
    await freshApp(page);
    const today = await page.evaluate(() => LifeApp.store.todayKey());
    await page.evaluate((date) => {
      const d = LifeApp.store.load();
      d.diet.days.push({ id: 'd1', date: date, meals: [{ id: 'm1', type: 'breakfast', food: '日历早餐', calories: 100, entryKind: 'actual' }] });
      LifeApp.store.save();
    }, today);
    await page.locator('[data-module="diet"]').click();
    const dayCell = page.locator(`[data-cal-date="${today}"]`);
    assert.equal(await dayCell.count(), 1);
    assert.match(await dayCell.textContent(), /1 餐/);
    const yesterday = await page.evaluate(() => LifeApp.store.addDays(LifeApp.store.todayKey(), -1));
    await page.locator(`[data-cal-date="${yesterday}"]`).click();
    assert.equal(await page.locator('[data-testid="diet-date"]').textContent(), yesterday);
  });
});
