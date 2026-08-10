const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const store = require('../../js/storage.js');

describe('storage 数据层', () => {
  beforeEach(() => {
    store.reset();
  });

  it('默认数据包含全部模块结构和版本号', () => {
    const d = store.load();
    assert.equal(d.version, 1);
    assert.deepEqual(d.notes, []);
    assert.deepEqual(d.reviews, {});
    assert.deepEqual(d.plans, {});
    assert.deepEqual(d.media.accounts, []);
    assert.deepEqual(d.campus.records, []);
    assert.deepEqual(d.product.projects, []);
    assert.deepEqual(d.fitness.plans, []);
    assert.deepEqual(d.diet.recipes, []);
    assert.deepEqual(d.games.library, []);
    assert.equal(d.settings.accent, 'blue');
    assert.equal(d.settings.density, 'normal');
    assert.equal(d.settings.appearance, 'liquid');
    assert.equal(d.settings.theme, 'light');
    assert.deepEqual(d.settings.hiddenModules, []);
    assert.equal(d.settings.weekStart, 'monday');
    assert.equal(d.settings.dateFormat, 'zh-CN');
    assert.deepEqual(d.settings.dashboardModules, ['media', 'campus', 'product', 'fitness', 'diet', 'game']);
  });

  it('save 后 load 能完整往返', () => {
    const d = store.load();
    d.notes.push({ id: 'n1', text: '测试', done: false, createdAt: 'x' });
    store.save();
    const loaded = store.load();
    assert.equal(loaded.notes.length, 1);
    assert.equal(loaded.notes[0].text, '测试');
  });

  it('reset 清空全部数据', () => {
    const d = store.load();
    d.notes.push({ id: 'n1', text: 'x', done: false, createdAt: 'x' });
    store.save();
    store.reset();
    assert.equal(store.load().notes.length, 0);
  });

  it('uid 每次生成不重复', () => {
    const ids = new Set();
    for (let i = 0; i < 500; i += 1) ids.add(store.uid());
    assert.equal(ids.size, 500);
  });

  it('日期工具正确', () => {
    assert.equal(store.dateKey(new Date(2026, 7, 10, 12)), '2026-08-10');
    assert.equal(store.addDays('2026-08-10', 1), '2026-08-11');
    assert.equal(store.addDays('2026-08-10', -1), '2026-08-09');
    assert.match(store.todayKey(), /^\d{4}-\d{2}-\d{2}$/);
  });

  it('migrate 补齐缺失的模块字段', () => {
    const migrated = store.migrate({ version: 0, notes: [{ id: 'n1' }] });
    assert.equal(migrated.version, 1);
    assert.equal(migrated.notes.length, 1);
    assert.deepEqual(migrated.plans, {});
    assert.equal(migrated.settings.accent, 'blue');
  });

  it('migrate 把旧自媒体状态映射到五阶段', () => {
    const migrated = store.migrate({
      version: 0,
      notes: [],
      plans: {},
      media: { accounts: [], contents: [{ id: 'c1', status: 'topic' }, { id: 'c2', status: 'draft' }], dailyStats: [] },
      campus: { records: [] },
      product: { projects: [] },
      fitness: { plans: [], logs: [], metrics: [] },
      diet: { days: [], water: [], recipes: [] },
      games: { library: [], sessions: [], wishlist: [] },
      settings: {}
    });
    assert.equal(migrated.media.contents[0].status, 'planning');
    assert.equal(migrated.media.contents[1].status, 'producing');
  });

  it('importJson 接受有效备份并覆盖当前数据', () => {
    const d = store.load();
    d.notes.push({ id: 'n1', text: '备份内容', done: false, createdAt: 'x' });
    store.save();
    const text = JSON.stringify({ ...store.load(), version: 1 });
    store.reset();
    store.importJson(text);
    assert.equal(store.load().notes[0].text, '备份内容');
  });

  it('importJson 拒绝无效 JSON 且不改变现有数据', () => {
    store.load().notes.push({ id: 'n1', text: '原数据', done: false, createdAt: 'x' });
    store.save();
    assert.throws(() => store.importJson('{bad json'), /JSON/);
    assert.equal(store.load().notes.length, 1);
  });

  it('importJson 拒绝缺少模块字段的备份', () => {
    assert.throws(() => store.importJson(JSON.stringify({ version: 1, notes: [] })), /字段/);
  });

  it('planStats 计算总数、完成数和百分比', () => {
    const stats = store.planStats([
      { done: true },
      { done: false },
      { done: true }
    ]);
    assert.deepEqual(stats, { total: 3, done: 2, percent: 67 });
    assert.deepEqual(store.planStats([]), { total: 0, done: 0, percent: 0 });
  });

  it('campusStats 统计投递、面试中和 Offer', () => {
    const stats = store.campusStats([
      { status: 'preparing' },
      { status: 'applied' },
      { status: 'interview' },
      { status: 'interview' },
      { status: 'offer' }
    ]);
    assert.deepEqual(stats, { total: 5, interviewing: 2, offers: 1 });
  });

  it('dietDayCalories 合计当天热量', () => {
    const day = { meals: [{ calories: 100 }, { calories: '250' }, { calories: undefined }] };
    assert.equal(store.dietDayCalories(day), 350);
  });

  it('gameMonthMinutes 只统计本月', () => {
    const now = new Date(2026, 7, 15);
    const minutes = store.gameMonthMinutes([
      { date: '2026-08-01', minutes: 60 },
      { date: '2026-08-31', minutes: 30 },
      { date: '2026-07-31', minutes: 999 }
    ], now);
    assert.equal(minutes, 90);
  });

  it('moduleCounts 统计各模块条目数', () => {
    const d = store.load();
    d.notes.push({ id: 'n1' });
    d.plans['2026-08-10'] = [{ id: 'p1' }, { id: 'p2' }];
    d.media.contents.push({ id: 'c1' });
    d.campus.records.push({ id: 'r1' });
    d.product.projects.push({ id: 'pr1', requirements: [{ id: 'q1' }] });
    d.fitness.logs.push({ id: 'fl1' });
    d.diet.days.push({ id: 'd1' });
    d.games.library.push({ id: 'g1' });
    const counts = store.moduleCounts(d);
    assert.equal(counts.notes, 1);
    assert.equal(counts.planTasks, 2);
    assert.equal(counts.mediaContents, 1);
    assert.equal(counts.campusRecords, 1);
    assert.equal(counts.requirements, 1);
    assert.equal(counts.fitnessLogs, 1);
    assert.equal(counts.dietDays, 1);
    assert.equal(counts.games, 1);
  });

  it('searchData 跨模块搜索并返回分组结果', () => {
    const d = store.load();
    d.notes.push({ id: 'n1', text: '会议备忘', done: false, createdAt: '' });
    d.campus.records.push({ id: 'r1', company: '腾讯', position: '产品经理', appliedAt: '', status: 'preparing', nextAction: '', deadline: '', timeline: [], note: '' });
    d.games.library.push({ id: 'g1', name: '会议游戏', status: 'want', rating: 0, review: '' });
    const results = store.searchData('会议');
    assert.equal(results.length, 2);
    assert.deepEqual(new Set(results.map(function (r) { return r.module; })), new Set(['home', 'game']));
  });

  it('buildMonthDays 生成 42 天且周一起始正确', () => {
    const days = store.buildMonthDays('2026-08', 'monday');
    assert.equal(days.length, 42);
    assert.equal(days[0].date, '2026-07-27');
    assert.equal(days[0].inMonth, false);
    assert.equal(days.find(function (d) { return d.date === '2026-08-01'; }).inMonth, true);
  });
});
