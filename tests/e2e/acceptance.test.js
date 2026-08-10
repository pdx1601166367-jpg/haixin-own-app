const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { openApp, freshApp, chromium, EXECUTABLES, APP_URL } = require('./helpers');

async function launchPersistent(dir) {
  let lastError = null;
  for (const executablePath of EXECUTABLES) {
    try {
      return await chromium.launchPersistentContext(dir, { executablePath, headless: true });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('未找到可用的 Chromium 浏览器');
}

describe('PRD 第 10 节验收标准 1-20', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('1 打开即用：file:// 直接打开且断网可用', async () => {
    const context = await browser.newContext({ offline: true });
    const p = await context.newPage();
    await p.goto(APP_URL);
    assert.equal(await p.title(), '工作生活专属 App');
    assert.match(APP_URL, /^file:\/\//);
    await context.close();
  });

  it('2 侧边栏 9 个模块可切换且当前高亮', async () => {
    await freshApp(page);
    assert.equal(await page.locator('.nav-item').count(), 9);
    await page.locator('[data-module="media"]').click();
    assert.ok(await page.locator('[data-module="media"]').evaluate((el) => el.classList.contains('active')));
    assert.equal(await page.locator('#module-title').textContent(), '自媒体');
  });

  it('3 首页包含今日日期、今日计划进度、快速备忘和模块摘要', async () => {
    await freshApp(page);
    const text = await page.locator('#content').textContent();
    assert.match(text, /欢迎回来/);
    assert.match(text, /今日计划/);
    assert.match(text, /快速备忘/);
    assert.match(text, /模块摘要/);
    assert.ok(await page.locator('.summary-card').count() >= 6);
  });

  it('4 快速备忘回车即记，刷新后保留', async () => {
    await freshApp(page);
    await page.fill('#note-input', '验收备忘');
    await page.keyboard.press('Enter');
    await page.reload();
    assert.match(await page.locator('#content').textContent(), /验收备忘/);
  });

  it('5 今日计划增删改、跨日期、勾选更新进度', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="add-task"]').first().click();
    await page.fill('#task-title', '验收任务');
    await page.locator('.modal-foot .btn-primary').click();
    await page.locator('[data-action="toggle-task"]').first().click();
    assert.match(await page.locator('#content').textContent(), /1\/1 完成 · 100%/);
    await page.locator('[data-action="prev-day"]').click();
    assert.match(await page.locator('#content').textContent(), /这个时间范围还没有计划/);
  });

  it('6 自媒体账号、内容流转和按天数据可用', async () => {
    await freshApp(page);
    await page.locator('[data-module="media"]').click();
    await page.locator('[data-action="add-account"]').click();
    await page.fill('#media-account-platform', '抖音');
    await page.fill('#media-account-name', '验收账号');
    await page.locator('.modal-foot .btn-primary').click();
    await page.locator('[data-tab="contents"]').click();
    await page.locator('[data-action="add-content"]').click();
    await page.fill('#media-content-title', '验收内容');
    await page.fill('#media-content-platform', '抖音');
    await page.locator('.modal-foot .btn-primary').click();
    await page.locator('[data-action="advance-content"]').click();
    assert.match(await page.locator('#content').textContent(), /待策划/);
  });

  it('7 校招记录、状态流转、时间线和统计可用', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push({ id: 'r1', company: '验收公司', position: 'PM', appliedAt: '', status: 'interview', nextAction: '', deadline: '', timeline: [], note: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="campus"]').click();
    assert.match(await page.locator('#content').textContent(), /面试中/);
    assert.match(await page.locator('#content').textContent(), /验收公司/);
    await page.locator('[data-action="toggle-detail"][data-id="r1"]').click();
    await page.fill('#campus-tl-stage', '二面');
    await page.locator('[data-action="add-timeline"][data-id="r1"]').click();
    assert.match(await page.locator('.campus-detail').textContent(), /二面/);
  });

  it('8 产品工作项目、需求、迭代、待办、日志可用', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.product.projects.push({ id: 'pr1', name: '验收项目', desc: '', requirements: [], sprints: [], todos: [], logs: [] });
      LifeApp.store.save();
    });
    await page.locator('[data-module="product"]').click();
    await page.locator('[data-action="add-req"]').click();
    await page.fill('#product-req-title', '验收需求');
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('#content').textContent(), /验收需求/);
    await page.locator('[data-project-tab="todos"]').click();
    await page.fill('#product-todo-input', '验收待办');
    await page.locator('[data-action="add-todo"]').click();
    assert.match(await page.locator('#content').textContent(), /验收待办/);
  });

  it('9 健身计划、打卡、指标可用', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.fitness.plans.push({ id: 'f1', name: '验收计划', schedule: '', exercises: [{ id: 'e1', name: '深蹲', sets: 3, reps: 10, weight: 50 }] });
      d.fitness.metrics.push({ id: 'm1', date: '2026-08-01', weight: 66, bodyFat: 18 });
      LifeApp.store.save();
    });
    await page.locator('[data-module="fitness"]').click();
    await page.locator('[data-action="start-log"][data-id="f1"]').click();
    await page.fill('#fitness-ex-e1-sets', '4');
    await page.locator('[data-action="save-log"]').click();
    assert.match(await page.locator('#content').textContent(), /深蹲 4x10x50kg/);
  });

  it('10 饮食三餐、热量、菜谱和饮水可用', async () => {
    await freshApp(page);
    await page.locator('[data-module="diet"]').click();
    await page.locator('[data-action="add-meal"]').first().click();
    await page.fill('#diet-meal-food', '验收早餐');
    await page.fill('#diet-meal-calories', '120');
    await page.locator('.modal-foot .btn-primary').click();
    await page.locator('[data-action="water-plus"]').click();
    assert.match(await page.locator('#content').textContent(), /验收早餐/);
    assert.match(await page.locator('.diet-stats').textContent(), /120/);
    assert.match(await page.locator('.diet-stats').textContent(), /1/);
  });

  it('11 游戏库、游玩记录、心愿单和时长统计可用', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.games.library.push({ id: 'g1', name: '验收游戏', status: 'playing', rating: 8, review: '' });
      d.games.sessions.push({ id: 's1', date: '2026-08-10', gameId: 'g1', minutes: 120, note: '' });
      d.games.wishlist.push({ id: 'w1', name: '心愿游戏', price: 99 });
      LifeApp.store.save();
    });
    await page.locator('[data-module="game"]').click();
    assert.match(await page.locator('#content').textContent(), /验收游戏/);
    assert.match(await page.locator('#content').textContent(), /2/);
    await page.locator('[data-tab="wishlist"]').click();
    assert.match(await page.locator('#content').textContent(), /心愿游戏/);
  });

  it('12 各模块新增数据刷新后均保留', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: 'n', done: false, createdAt: '' });
      d.plans['2026-08-10'] = [{ id: 'p1', title: 't', time: '', priority: 'low', source: '', done: false }];
      d.media.accounts.push({ id: 'a1', platform: 'x', name: 'y', followers: 0, works: 0 });
      d.campus.records.push({ id: 'r1', company: 'c', position: 'p', appliedAt: '', status: 'preparing', nextAction: '', deadline: '', timeline: [], note: '' });
      d.product.projects.push({ id: 'pr1', name: 'proj', desc: '', requirements: [], sprints: [], todos: [], logs: [] });
      d.fitness.plans.push({ id: 'f1', name: 'fit', schedule: '', exercises: [] });
      d.diet.recipes.push({ id: 'rc1', name: 'recipe', food: 'f', calories: 1 });
      d.games.library.push({ id: 'g1', name: 'game', status: 'want', rating: 0, review: '' });
      LifeApp.store.save();
    });
    await page.reload();
    const counts = await page.evaluate(() => LifeApp.store.moduleCounts(LifeApp.store.load()));
    assert.equal(counts.notes, 1);
    assert.equal(counts.planTasks, 1);
    assert.equal(counts.mediaAccounts, 1);
    assert.equal(counts.campusRecords, 1);
    assert.equal(counts.projects, 1);
    assert.equal(counts.fitnessPlans, 1);
    assert.equal(counts.recipes, 1);
    assert.equal(counts.games, 1);
  });

  it('13 关闭浏览器重新打开数据仍在', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lifeapp-persist-'));
    try {
      const ctx1 = await launchPersistent(dir);
      const p1 = await ctx1.newPage();
      await p1.goto(APP_URL);
      await p1.evaluate(() => {
        const d = LifeApp.store.load();
        d.notes.push({ id: 'n1', text: '重启后还在', done: false, createdAt: '' });
        LifeApp.store.save();
      });
      await ctx1.close();
      const ctx2 = await launchPersistent(dir);
      const p2 = await ctx2.newPage();
      await p2.goto(APP_URL);
      const notes = await p2.evaluate(() => LifeApp.store.load().notes.length);
      assert.equal(notes, 1);
      await ctx2.close();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('14 导出备份文件可解析且包含各模块数据', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-data"]').click();
    const download = await downloadPromise;
    const text = await fs.readFile(await download.path(), 'utf8');
    const parsed = JSON.parse(text);
    assert.equal(parsed.version, 1);
    for (const key of ['notes', 'plans', 'media', 'campus', 'product', 'fitness', 'diet', 'games', 'settings']) {
      assert.ok(key in parsed);
    }
  });

  it('15 清空后为空，导入备份恢复一致', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '恢复一致', done: false, createdAt: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="settings"]').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-data"]').click();
    const backup = await fs.readFile(await (await downloadPromise).path());
    await page.locator('[data-action="clear-data"]').click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.equal(await page.evaluate(() => LifeApp.store.load().notes.length), 0);
    await page.setInputFiles('#import-file', { name: 'b.json', mimeType: 'application/json', buffer: backup });
    await page.locator('.modal-foot .btn-primary').click();
    await page.waitForFunction(() => LifeApp.store.load().notes.length === 1);
    assert.equal(await page.evaluate(() => LifeApp.store.load().notes.length), 1);
  });

  it('16 删除条目和清空数据都有二次确认', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '确认删除', done: false, createdAt: '' });
      LifeApp.store.save();
    });
    await page.reload();
    await page.locator('[data-action="delete-note"]').first().click();
    assert.match(await page.locator('.modal').textContent(), /确定删除/);
    await page.locator('.modal-foot .btn').first().click();
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-action="clear-data"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定清空/);
  });

  it('17 隐藏模块后导航和首页摘要不显示，数据保留', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.games.library.push({ id: 'g1', name: '隐藏后保留', status: 'want', rating: 0, review: '' });
      LifeApp.store.save();
    });
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-module-toggle="game"]').uncheck();
    await page.locator('[data-module="home"]').click();
    assert.equal(await page.locator('.summary-card').filter({ hasText: '游戏娱乐' }).count(), 0);
    assert.equal(await page.locator('[data-module="game"]').count(), 0);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-module-toggle="game"]').check();
    assert.equal(await page.evaluate(() => LifeApp.store.load().games.library.length), 1);
  });

  it('18 主题色和列表密度切换立即生效', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('.swatch-purple').click();
    await page.locator('[data-setting="density"] [data-value="compact"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-accent')), 'purple');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-density')), 'compact');
  });

  it('19 空状态显示引导文字和新增按钮', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    assert.match(await page.locator('#content').textContent(), /这个时间范围还没有计划/);
    assert.equal(await page.locator('[data-action="add-task"]').count(), 2);
  });

  it('20 操作即时保存，顶部提供手动保存', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    await page.locator('[data-action="add-task"]').first().click();
    await page.fill('#task-title', '即时保存任务');
    await page.locator('.modal-foot .btn-primary').click();
    const saved = await page.evaluate(() => {
      const d = LifeApp.store.load();
      return (d.plans[LifeApp.store.todayKey()] || []).some(function (t) { return t.title === '即时保存任务'; });
    });
    assert.equal(saved, true);
    assert.equal(await page.locator('#manual-save-btn').count(), 1);
  });
});
