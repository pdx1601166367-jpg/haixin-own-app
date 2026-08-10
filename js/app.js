(function () {
  'use strict';

  const MODULES = [
    { id: 'home', name: '首页总览', group: '日常' },
    { id: 'plan', name: '今日计划', group: '日常' },
    { id: 'media', name: '自媒体', group: '工作' },
    { id: 'campus', name: '校招进展', group: '工作' },
    { id: 'product', name: '产品工作', group: '工作' },
    { id: 'fitness', name: '健身计划', group: '生活' },
    { id: 'diet', name: '饮食计划', group: '生活' },
    { id: 'game', name: '游戏娱乐', group: '生活' },
    { id: 'settings', name: '数据与设置', group: '系统' }
  ];

  window.LifeApp = window.LifeApp || {};
  LifeApp.app = LifeApp.app || {};
  LifeApp.views = LifeApp.views || {};

  const state = { current: 'home' };
  let navBound = false;
  let saveTimer = null;

  function getEl(id) {
    return document.getElementById(id);
  }

  function getVisibleModules() {
    const data = LifeApp.store && LifeApp.store.data;
    const hidden = (data && data.settings && data.settings.hiddenModules) || [];
    return MODULES.filter(function (m) {
      return hidden.indexOf(m.id) === -1;
    });
  }

  function renderNav() {
    const nav = getEl('nav');
    if (!nav) return;
    const visible = getVisibleModules();
    const groups = [];
    visible.forEach(function (m) {
      const existing = groups.find(function (g) { return g.label === m.group; });
      if (existing) existing.items.push(m);
      else groups.push({ label: m.group, items: [m] });
    });
    nav.innerHTML = groups.map(function (g) {
      return '<div class="nav-group"><span class="nav-label">' + g.label + '</span>' +
        g.items.map(function (m) {
          return '<button type="button" class="nav-item" data-module="' + m.id + '">' +
            '<span class="nav-icon">' + (LifeApp.ui.icons[m.id] || '') + '</span>' +
            '<span>' + m.name + '</span></button>';
        }).join('') +
        '</div>';
    }).join('');
    if (!navBound) {
      nav.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-module]');
        if (btn) switchTo(btn.getAttribute('data-module'));
      });
      navBound = true;
    }
    const currentBtn = nav.querySelector('[data-module="' + state.current + '"]');
    if (currentBtn) currentBtn.classList.add('active');
  }

  function getModule(id) {
    for (let i = 0; i < MODULES.length; i += 1) {
      if (MODULES[i].id === id) return MODULES[i];
    }
    return null;
  }

  function renderContent() {
    const content = getEl('content');
    const module = getModule(state.current);
    const view = LifeApp.views[state.current];
    if (!content || !module) return;
    content.innerHTML = '';
    if (view && typeof view.render === 'function') {
      view.render(content, {
        switchTo: switchTo,
        getModule: getModule,
        state: state
      });
    } else {
      content.innerHTML = '<div class="placeholder">' + module.name + ' 模块待开发</div>';
    }
  }

  function switchTo(id) {
    const module = getModule(id);
    if (!module) return;
    state.current = id;
    const title = getEl('module-title');
    if (title) title.textContent = module.name;
    const moduleIcon = getEl('module-icon');
    if (moduleIcon && LifeApp.ui.icons[id]) moduleIcon.innerHTML = LifeApp.ui.icons[id];
    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-module') === id);
    });
    renderContent();
  }

  function applySettings() {
    const store = LifeApp.store;
    const settingsData = store && store.data && store.data.settings;
    if (!settingsData) return;
    document.documentElement.setAttribute('data-accent', settingsData.accent || 'blue');
    document.documentElement.setAttribute('data-density', settingsData.density || 'normal');
    document.documentElement.setAttribute('data-appearance', settingsData.appearance || 'liquid');
    document.documentElement.setAttribute('data-theme', settingsData.theme || 'light');
  }

  function openSearch() {
    const m = LifeApp.ui.modal({
      title: '全局搜索',
      bodyHtml:
        '<div class="field"><input id="global-search-input" type="text" placeholder="输入关键词，搜索所有模块"></div>' +
        '<div id="global-search-results" class="search-results"><div class="muted small">输入关键词开始搜索</div></div>',
      buttons: [{ label: '关闭', className: 'btn' }]
    });
    const input = m.el.querySelector('#global-search-input');
    const results = m.el.querySelector('#global-search-results');
    input.addEventListener('input', function () {
      const items = LifeApp.store.searchData(input.value);
      if (!items.length) {
        results.innerHTML = '<div class="muted small">没有匹配结果</div>';
        return;
      }
      const byModule = {};
      items.forEach(function (item) {
        if (!byModule[item.module]) byModule[item.module] = [];
        byModule[item.module].push(item);
      });
      results.innerHTML = Object.keys(byModule).map(function (moduleId) {
        const module = getModule(moduleId);
        return '<div class="search-group"><div class="search-group-label">' + module.name + '</div>' +
          byModule[moduleId].map(function (item) {
            return '<button type="button" class="search-result" data-search-module="' + moduleId + '">' +
              '<span>' + LifeApp.ui.esc(item.title) + '</span>' +
              '<small>' + LifeApp.ui.esc(item.detail) + '</small></button>';
          }).join('') +
          '</div>';
      }).join('');
      results.querySelectorAll('[data-search-module]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          m.close();
          switchTo(btn.getAttribute('data-search-module'));
        });
      });
    });
    input.focus();
  }

  function openQuickCreate() {
    const options = [
      { value: 'plan', label: '今日事项' },
      { value: 'note', label: '快速备忘' },
      { value: 'media', label: '自媒体内容' },
      { value: 'campus', label: '校招投递' },
      { value: 'requirement', label: '产品需求' },
      { value: 'fitness', label: '训练记录' },
      { value: 'diet', label: '餐食记录' },
      { value: 'game', label: '游戏' }
    ];
    LifeApp.ui.modal({
      title: '快速新增',
      bodyHtml:
        '<div class="form-row">' +
        '<div class="field"><label>类型</label><select id="quick-type">' +
        options.map(function (o) { return '<option value="' + o.value + '">' + o.label + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>标题 / 内容</label><input id="quick-title" type="text"></div>' +
        '</div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '创建', className: 'btn btn-primary', onClick: function () {
          return quickCreate(document.getElementById('quick-type').value, document.getElementById('quick-title').value);
        } }
      ]
    });
  }

  function quickCreate(type, title) {
    const store = LifeApp.store;
    const d = store.data;
    const today = store.todayKey();
    const text = String(title || '').trim();
    if (!text) {
      LifeApp.ui.toast('请输入标题或内容');
      return false;
    }
    if (type === 'plan') {
      if (!d.plans[today]) d.plans[today] = [];
      d.plans[today].push({ id: store.uid(), title: text, time: '', priority: 'medium', source: '', done: false, status: 'todo', estimatedMinutes: 0 });
      store.save();
      switchTo('plan');
    } else if (type === 'note') {
      d.notes.push({ id: store.uid(), text: text, done: false, createdAt: new Date().toISOString() });
      store.save();
      switchTo('home');
    } else if (type === 'media') {
      d.media.contents.push({ id: store.uid(), title: text, platform: '', status: 'idea', plannedPublishDate: '', publishedAt: '', copyText: '', assetPath: '', publishUrl: '', views: 0, likes: 0, comments: 0 });
      store.save();
      switchTo('media');
    } else if (type === 'campus') {
      d.campus.records.push({ id: store.uid(), company: text, position: '', appliedAt: today, status: 'preparing', nextAction: '', deadline: '', timeline: [], note: '' });
      store.save();
      switchTo('campus');
    } else if (type === 'requirement') {
      const project = d.product.projects[0];
      if (!project) {
        LifeApp.ui.toast('请先创建产品项目');
        return false;
      }
      project.requirements.push({ id: store.uid(), title: text, itemType: 'requirement', priority: 'P1', status: 'backlog' });
      store.save();
      switchTo('product');
    } else if (type === 'fitness') {
      const plan = d.fitness.plans[0];
      if (!plan) {
        LifeApp.ui.toast('请先创建训练计划');
        return false;
      }
      d.fitness.logs.push({ id: store.uid(), date: today, planId: plan.id, exercises: [], status: 'planned', note: '' });
      store.save();
      switchTo('fitness');
    } else if (type === 'diet') {
      let day = d.diet.days.find(function (x) { return x.date === today; });
      if (!day) {
        day = { id: store.uid(), date: today, meals: [] };
        d.diet.days.push(day);
      }
      day.meals.push({ id: store.uid(), type: 'snack', food: text, calories: 0, entryKind: 'actual' });
      store.save();
      switchTo('diet');
    } else if (type === 'game') {
      d.games.library.push({ id: store.uid(), name: text, status: 'want', activityType: 'game', progress: '', nextGoal: '', rating: 0, review: '' });
      store.save();
      switchTo('game');
    }
    LifeApp.ui.toast('已创建');
    return true;
  }

  function initTopbar() {
    const dateEl = getEl('topbar-date');
    if (dateEl) {
      dateEl.textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
    }
    const searchBtn = getEl('global-search-btn');
    if (searchBtn) {
      searchBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
      searchBtn.addEventListener('click', openSearch);
    }
    const topSearch = getEl('top-search-input');
    if (topSearch) {
      topSearch.addEventListener('focus', openSearch);
      topSearch.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          openSearch();
        }
      });
    }
    const sidebarQuick = getEl('sidebar-quick-create');
    if (sidebarQuick) sidebarQuick.addEventListener('click', openQuickCreate);
    const quickBtn = getEl('quick-create-btn');
    if (quickBtn) quickBtn.addEventListener('click', openQuickCreate);
    const manualSave = getEl('manual-save-btn');
    if (manualSave) {
      manualSave.addEventListener('click', function () {
        LifeApp.store.save();
        LifeApp.ui.toast('已保存');
      });
    }
    const saveExit = getEl('save-exit-btn');
    if (saveExit) {
      saveExit.addEventListener('click', function () {
        LifeApp.store.save();
        LifeApp.ui.toast('数据已保存，可以关闭页面');
      });
    }
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    });
    document.addEventListener('lifeapp:saved', function () {
      const indicator = getEl('save-indicator');
      if (!indicator) return;
      indicator.textContent = '已保存';
      indicator.classList.add('saved');
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        indicator.textContent = '自动保存';
        indicator.classList.remove('saved');
      }, 1800);
    });
  }

  LifeApp.app.modules = MODULES;
  LifeApp.app.state = state;
  LifeApp.app.switchTo = switchTo;
  LifeApp.app.renderNav = renderNav;
  LifeApp.app.applySettings = applySettings;
  LifeApp.app.openSearch = openSearch;
  LifeApp.app.openQuickCreate = openQuickCreate;
  LifeApp.app.quickCreate = quickCreate;

  document.addEventListener('DOMContentLoaded', function () {
    if (LifeApp.store) LifeApp.store.load();
    applySettings();
    initTopbar();
    renderNav();
    switchTo('home');
  });
})();
