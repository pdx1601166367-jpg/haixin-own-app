const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('阶段 4：自媒体模块', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('账号可新增、显示并刷新保留', async () => {
    await freshApp(page);
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-action="add-account"]').click();
    await page.fill('#media-account-platform', '小红书');
    await page.fill('#media-account-name', '我的账号');
    await page.fill('#media-account-followers', '1200');
    await page.fill('#media-account-works', '15');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /我的账号/);
    assert.match(await page.locator('#content').textContent(), /小红书/);
    assert.match(await page.locator('#content').textContent(), /1200/);
    await page.reload();
    await page.locator('[data-module="media"]').click();
    assert.match(await page.locator('#content').textContent(), /我的账号/);
  });

  it('账号可编辑和删除（带二次确认）', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.media.accounts.push({ id: 'a1', platform: 'B站', name: '旧名', followers: 1, works: 2 });
      LifeApp.store.save();
    });
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-action="edit-account"][data-id="a1"]').click();
    await page.fill('#media-account-name', '新名字');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /新名字/);
    await page.locator('[data-action="delete-account"][data-id="a1"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定删除/);
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /新名字/);
  });

  it('内容可从灵感到发布流转', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.media.contents.push({ id: 'c1', title: '测试选题', platform: '小红书', status: 'idea' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-tab="contents"]').click();
    assert.match(await page.locator('#content').textContent(), /灵感/);
    await page.locator('[data-action="advance-content"][data-id="c1"]').click();
    assert.match(await page.locator('#content').textContent(), /待策划/);
    await page.locator('[data-action="advance-content"][data-id="c1"]').click();
    assert.match(await page.locator('#content').textContent(), /制作中/);
    await page.locator('[data-action="advance-content"][data-id="c1"]').click();
    assert.match(await page.locator('#content').textContent(), /待发布/);
    await page.locator('[data-action="advance-content"][data-id="c1"]').click();
    assert.match(await page.locator('#content').textContent(), /已发布/);
    assert.match(await page.locator('#content').textContent(), /发布于/);
  });

  it('发布后数据生成分析摘要', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.media.contents.push(
        { id: 'c1', title: '内容甲', platform: 'B站', status: 'published', publishedAt: '2026-08-01', views: 1000, likes: 100, comments: 20 },
        { id: 'c2', title: '内容乙', platform: 'B站', status: 'published', publishedAt: '2026-08-02', views: 2000, likes: 150, comments: 30 }
      );
      LifeApp.store.save();
    });
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-tab="contents"]').click();
    assert.match(await page.locator('#content').textContent(), /总播放 \/ 阅读/);
    assert.match(await page.locator('#content').textContent(), /3000/);
    assert.match(await page.locator('#content').textContent(), /10.0%/);
    assert.match(await page.locator('#content').textContent(), /内容乙/);
  });

  it('内容可加入今日计划', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.media.contents.push({ id: 'c1', title: '要推进的内容', platform: '小红书', status: 'planning' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-tab="contents"]').click();
    await page.locator('[data-action="plan-content"][data-id="c1"]').click();
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /推进内容：要推进的内容/);
  });

  it('内容可新增和编辑', async () => {
    await freshApp(page);
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-tab="contents"]').click();
    await page.locator('[data-action="add-content"]').click();
    await page.fill('#media-content-title', '新内容标题');
    await page.fill('#media-content-platform', '抖音');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /新内容标题/);
    await page.locator('.media-card').filter({ hasText: '新内容标题' }).locator('[data-action="edit-content"]').click();
    await page.fill('#media-content-title', '改后的标题');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /改后的标题/);
  });

  it('按天数据可新增、编辑和删除', async () => {
    await freshApp(page);
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-tab="stats"]').click();
    await page.locator('[data-action="add-stat"]').click();
    await page.fill('#media-stat-play', '5000');
    await page.fill('#media-stat-followers', '30');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /播放 5000/);
    assert.match(await page.locator('#content').textContent(), /涨粉 30/);
    await page.locator('[data-action="edit-stat"]').first().click();
    await page.fill('#media-stat-play', '8000');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /播放 8000/);
    await page.locator('[data-action="delete-stat"]').first().click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.doesNotMatch(await page.locator('#content').textContent(), /播放 8000/);
  });

  it('发布日历按日期显示已发布内容', async () => {
    await freshApp(page);
    const today = await page.evaluate(() => LifeApp.store.todayKey());
    await page.evaluate((date) => {
      const d = LifeApp.store.load();
      d.media.contents.push({ id: 'c1', title: '今天发布的视频', platform: 'B站', status: 'published', publishedAt: date });
      LifeApp.store.save();
    }, today);
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-tab="calendar"]').click();
    const dayCell = page.locator(`[data-cal-date="${today}"]`);
    assert.equal(await dayCell.count(), 1);
    assert.match(await dayCell.textContent(), /1/);
    await dayCell.click();
    assert.match(await page.locator('#content').textContent(), /今天发布的视频/);
  });
});
