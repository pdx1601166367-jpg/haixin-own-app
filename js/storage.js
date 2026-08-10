(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.store = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'lifeApp.data.v1';
  let memory = null;
  let data = null;

  function getBackend() {
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage;
    }
    return {
      getItem: function () { return memory; },
      setItem: function (key, value) { memory = String(value); },
      removeItem: function () { memory = null; }
    };
  }

  function createDefaultData() {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      notes: [],
      reviews: {},
      plans: {},
      media: { accounts: [], contents: [], dailyStats: [] },
      campus: { records: [] },
      product: { projects: [] },
      fitness: { plans: [], logs: [], metrics: [] },
      diet: { days: [], water: [], recipes: [], targets: [] },
      games: { library: [], sessions: [], wishlist: [] },
      settings: {
        accent: 'blue',
        density: 'normal',
        appearance: 'liquid',
        theme: 'light',
        hiddenModules: [],
        weekStart: 'monday',
        dateFormat: 'zh-CN',
        dashboardModules: ['media', 'campus', 'product', 'fitness', 'diet', 'game']
      }
    };
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function addDays(key, n) {
    const dt = new Date(key + 'T12:00:00');
    dt.setDate(dt.getDate() + n);
    return dateKey(dt);
  }

  function uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function migrate(raw) {
    const def = createDefaultData();
    if (!raw || typeof raw !== 'object') return def;
    const merged = Object.assign({}, def, raw);
    merged.settings = Object.assign({}, def.settings, raw.settings || {});
    merged.media = Object.assign({}, def.media, raw.media || {});
    merged.campus = Object.assign({}, def.campus, raw.campus || {});
    merged.product = Object.assign({}, def.product, raw.product || {});
    merged.fitness = Object.assign({}, def.fitness, raw.fitness || {});
    merged.diet = Object.assign({}, def.diet, raw.diet || {});
    merged.games = Object.assign({}, def.games, raw.games || {});
    merged.version = 1;
    if (Array.isArray(merged.media.contents)) {
      merged.media.contents.forEach(function (content) {
        if (content.status === 'topic') content.status = 'planning';
        else if (content.status === 'draft') content.status = 'producing';
      });
    }
    return merged;
  }

  function load() {
    const backend = getBackend();
    const raw = backend.getItem(STORAGE_KEY);
    if (!raw) {
      data = createDefaultData();
      save();
      return data;
    }
    try {
      data = migrate(JSON.parse(raw));
    } catch (err) {
      data = createDefaultData();
    }
    return data;
  }

  function save() {
    if (!data) data = createDefaultData();
    data.updatedAt = new Date().toISOString();
    getBackend().setItem(STORAGE_KEY, JSON.stringify(data));
    if (typeof document !== 'undefined' && document.dispatchEvent) {
      document.dispatchEvent(new CustomEvent('lifeapp:saved', { detail: { at: data.updatedAt } }));
    }
    return data;
  }

  function reset() {
    data = createDefaultData();
    save();
    return data;
  }

  function exportData() {
    if (!data) load();
    return JSON.stringify(data, null, 2);
  }

  function importJson(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error('备份文件不是有效的 JSON');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('备份文件格式不正确');
    }
    if (parsed.version !== 1) {
      throw new Error('不支持的备份版本：' + String(parsed.version));
    }
    const required = ['notes', 'plans', 'media', 'campus', 'product', 'fitness', 'diet', 'games', 'settings'];
    for (const key of required) {
      if (!(key in parsed)) {
        throw new Error('备份缺少字段：' + key);
      }
    }
    data = migrate(parsed);
    save();
    return data;
  }

  function planStats(tasks) {
    const list = tasks || [];
    const total = list.length;
    const done = list.filter(function (t) { return t.done; }).length;
    return { total: total, done: done, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function campusStats(records) {
    const list = records || [];
    return {
      total: list.length,
      interviewing: list.filter(function (r) { return r.status === 'interview'; }).length,
      offers: list.filter(function (r) { return r.status === 'offer'; }).length
    };
  }

  function dietDayCalories(day) {
    const meals = (day && day.meals) || [];
    return meals.reduce(function (sum, m) {
      return sum + (Number(m.calories) || 0);
    }, 0);
  }

  function gameMonthMinutes(sessions, now) {
    const base = now || new Date();
    const prefix = base.getFullYear() + '-' + String(base.getMonth() + 1).padStart(2, '0');
    return (sessions || []).filter(function (s) {
      return (s.date || '').indexOf(prefix) === 0;
    }).reduce(function (sum, s) {
      return sum + (Number(s.minutes) || 0);
    }, 0);
  }

  function moduleCounts(source) {
    const d = source || data;
    const projects = d.product.projects;
    return {
      notes: d.notes.length,
      planDays: Object.keys(d.plans).length,
      planTasks: Object.keys(d.plans).reduce(function (n, k) { return n + d.plans[k].length; }, 0),
      mediaAccounts: d.media.accounts.length,
      mediaContents: d.media.contents.length,
      campusRecords: d.campus.records.length,
      projects: projects.length,
      requirements: projects.reduce(function (n, p) { return n + p.requirements.length; }, 0),
      fitnessPlans: d.fitness.plans.length,
      fitnessLogs: d.fitness.logs.length,
      metrics: d.fitness.metrics.length,
      dietDays: d.diet.days.length,
      recipes: d.diet.recipes.length,
      games: d.games.library.length,
      sessions: d.games.sessions.length,
      wishlist: d.games.wishlist.length
    };
  }

  function searchData(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const results = [];
    function push(module, id, title, detail) {
      if (String(title || '').toLowerCase().indexOf(q) !== -1 || String(detail || '').toLowerCase().indexOf(q) !== -1) {
        results.push({ module: module, id: id, title: String(title || ''), detail: String(detail || '') });
      }
    }
    const d = data;
    d.notes.forEach(function (n) { push('home', n.id, n.text, '快速备忘'); });
    Object.keys(d.plans).forEach(function (key) {
      d.plans[key].forEach(function (t) { push('plan', t.id, t.title, key + ' 计划'); });
    });
    d.media.contents.forEach(function (c) { push('media', c.id, c.title, c.platform || '自媒体内容'); });
    d.campus.records.forEach(function (r) { push('campus', r.id, r.company, r.position); });
    d.product.projects.forEach(function (p) {
      push('product', p.id, p.name, '项目');
      p.requirements.forEach(function (r) { push('product', r.id, r.title, p.name + ' 需求'); });
      p.todos.forEach(function (t) { push('product', t.id, t.text, p.name + ' 待办'); });
      p.logs.forEach(function (l) { push('product', l.id, l.content, p.name + ' 日志'); });
    });
    d.fitness.plans.forEach(function (p) {
      push('fitness', p.id, p.name, '训练计划');
      p.exercises.forEach(function (e) { push('fitness', e.id, e.name, p.name); });
    });
    d.fitness.logs.forEach(function (l) { push('fitness', l.id, '训练记录 ' + l.date, ''); });
    d.diet.recipes.forEach(function (r) { push('diet', r.id, r.name, r.food); });
    d.diet.days.forEach(function (day) {
      day.meals.forEach(function (m) { push('diet', m.id, m.food, day.date); });
    });
    d.games.library.forEach(function (g) { push('game', g.id, g.name, '游戏'); });
    d.games.wishlist.forEach(function (w) { push('game', w.id, w.name, '心愿单'); });
    return results;
  }

  function buildMonthDays(month, weekStart) {
    const parts = String(month).split('-').map(Number);
    const first = new Date(parts[0], parts[1] - 1, 1, 12);
    const firstDow = first.getDay();
    const offset = weekStart === 'sunday' ? firstDow : (firstDow + 6) % 7;
    const start = new Date(parts[0], parts[1] - 1, 1 - offset, 12);
    return Array.from({ length: 42 }, function (_, index) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + index);
      const key = dateKey(dt);
      return { date: key, inMonth: key.slice(0, 7) === String(month) };
    });
  }

  function getModuleSummary(id) {
    const d = data;
    if (!d) return { title: '', text: '' };
    if (id === 'plan') {
      const stats = planStats(d.plans[todayKey()]);
      return {
        title: '今日计划',
        text: stats.total ? stats.done + '/' + stats.total + ' 已完成' : '今天还没有计划'
      };
    }
    if (id === 'media') {
      const ideas = d.media.contents.filter(function (c) { return c.status === 'idea'; }).length;
      const published = d.media.contents.filter(function (c) { return c.status === 'published'; }).length;
      return { title: '自媒体', text: '灵感 ' + ideas + ' 条，已发布 ' + published + ' 条' };
    }
    if (id === 'campus') {
      const stats = campusStats(d.campus.records);
      return { title: '校招进展', text: '投递 ' + stats.total + '，面试中 ' + stats.interviewing + '，Offer ' + stats.offers };
    }
    if (id === 'product') {
      const todos = d.product.projects.reduce(function (n, p) {
        return n + p.todos.filter(function (t) { return !t.done; }).length;
      }, 0);
      return { title: '产品工作', text: d.product.projects.length ? '未完成待办 ' + todos + ' 项' : '还没有项目' };
    }
    if (id === 'fitness') {
      const last = d.fitness.logs[d.fitness.logs.length - 1];
      return { title: '健身计划', text: last ? last.date + ' 已训练' : '最近没有训练记录' };
    }
    if (id === 'diet') {
      const day = d.diet.days.find(function (x) { return x.date === todayKey(); });
      return { title: '饮食计划', text: day ? '今日热量 ' + dietDayCalories(day) + ' kcal' : '今天还没有饮食记录' };
    }
    if (id === 'game') {
      const hours = Math.round((gameMonthMinutes(d.games.sessions) / 60) * 10) / 10;
      return { title: '游戏娱乐', text: '本月游玩 ' + hours + ' 小时' };
    }
    return { title: '', text: '' };
  }

  const api = {
    STORAGE_KEY: STORAGE_KEY,
    load: load,
    save: save,
    reset: reset,
    exportData: exportData,
    importJson: importJson,
    migrate: migrate,
    uid: uid,
    dateKey: dateKey,
    todayKey: todayKey,
    addDays: addDays,
    planStats: planStats,
    campusStats: campusStats,
    dietDayCalories: dietDayCalories,
    gameMonthMinutes: gameMonthMinutes,
    moduleCounts: moduleCounts,
    getModuleSummary: getModuleSummary,
    searchData: searchData,
    buildMonthDays: buildMonthDays
  };
  Object.defineProperty(api, 'data', {
    get: function () {
      if (!data) load();
      return data;
    }
  });
  return api;
});
