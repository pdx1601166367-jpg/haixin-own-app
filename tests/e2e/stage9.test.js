const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 9：游戏娱乐模块', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('游戏库可新增并刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="game"]').click();
    await page.locator('[data-action="add-game"]').click();
    await page.fill('#game-name', '塞尔达传说');
    await page.selectOption('#game-status', 'playing');
    await page.fill('#game-rating', '9');
    await page.fill('#game-review', '很好玩');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /塞尔达传说/);
    assert.match(await page.locator('#content').textContent(), /正在进行/);
    assert.match(await page.locator('#content').textContent(), /评分 9\/10/);
    await page.reload();
    await page.locator('[data-module="game"]').click();
    assert.match(await page.locator('#content').textContent(), /塞尔达传说/);
  });

  it('游戏库统计总数正确', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.games.library.push(
        { id: 'g1', name: '游戏A', status: 'playing', rating: 8, review: '' },
        { id: 'g2', name: '游戏B', status: 'want', rating: 0, review: '' }
      );
      LifeApp.store.save();
    });
    await page.locator('[data-module="game"]').click();
    assert.match(await page.locator('#content').textContent(), /游戏总数/);
    const nums = await page.locator('.stat-grid .num').allTextContents();
    assert.equal(nums[1], '2');
  });

  it('游玩记录可新增并更新本月时长', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.games.library.push({ id: 'g1', name: '游戏A', status: 'playing', rating: 0, review: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="game"]').click();
    await page.locator('[data-tab="sessions"]').click();
    await page.locator('[data-action="add-session"]').click();
    await page.fill('#session-minutes', '90');
    await page.fill('#session-note', '推了一个主线');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /90 分钟/);
    assert.match(await page.locator('#content').textContent(), /推了一个主线/);
    assert.match(await page.locator('.stat-grid').textContent(), /1.5/);
  });

  it('心愿单可新增、编辑和删除', async () => {
    await freshApp(page);
    await page.locator('[data-module="game"]').click();
    await page.locator('[data-tab="wishlist"]').click();
    await page.locator('[data-action="add-wish"]').click();
    await page.fill('#wish-name', '新游戏');
    await page.fill('#wish-price', '199');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /新游戏/);
    assert.match(await page.locator('#content').textContent(), /199/);
    await page.locator('[data-action="edit-wish"]').first().click();
    await page.fill('#wish-name', '改后的游戏');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /改后的游戏/);
    await page.locator('[data-action="delete-wish"]').first().click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /改后的游戏/);
  });

  it('游戏可编辑和删除（带二次确认）', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.games.library.push({ id: 'g1', name: '旧游戏', status: 'want', rating: 0, review: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="game"]').click();
    await page.locator('[data-action="edit-game"][data-id="g1"]').click();
    await page.fill('#game-name', '新游戏名');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /新游戏名/);
    await page.locator('[data-action="delete-game"][data-id="g1"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定删除/);
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /新游戏名/);
  });

  it('游戏支持暂停状态和类型分类', async () => {
    await freshApp(page);
    await page.locator('[data-module="game"]').click();
    await page.locator('[data-action="add-game"]').click();
    await page.fill('#game-name', '暂停中的游戏');
    await page.selectOption('#game-status', 'paused');
    await page.selectOption('#game-type', 'movie');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /暂停/);
    assert.match(await page.locator('#content').textContent(), /影视/);
  });

  it('游戏卡片显示进度和下一次目标', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.games.library.push({ id: 'g1', name: '进度游戏', status: 'playing', activityType: 'game', progress: '主线第二章', nextGoal: '完成第三章', rating: 0, review: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="game"]').click();
    assert.match(await page.locator('#content').textContent(), /主线第二章/);
    assert.match(await page.locator('#content').textContent(), /完成第三章/);
  });

  it('开始游玩后计时，结束自动记录分钟', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.games.library.push({ id: 'g1', name: '计时游戏', status: 'want', activityType: 'game', progress: '', nextGoal: '', rating: 0, review: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="game"]').click();
    await page.locator('[data-action="start-session"][data-id="g1"]').click();
    assert.match(await page.locator('#content').textContent(), /计时中/);
    await page.locator('[data-action="stop-session"]').click();
    assert.match(await page.locator('#content').textContent(), /累计 0/);
    const minutes = await page.evaluate(() => LifeApp.store.load().games.sessions[0].minutes);
    assert.ok(minutes >= 1);
  });

  it('游戏可安排到今日计划', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.games.library.push({ id: 'g1', name: '安排游戏', status: 'want', activityType: 'game', progress: '', nextGoal: '', rating: 0, review: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="game"]').click();
    await page.locator('[data-action="plan-game"][data-id="g1"]').click();
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /娱乐：安排游戏/);
  });
});
