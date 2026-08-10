(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.home = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let containerRef = null;
  let ctxRef = null;
  let memoDraft = '';
  let activeMemoId = null;
  let memoTimer = null;

  const SUMMARY_MODULES = ['media', 'campus', 'product', 'fitness', 'diet', 'game'];

  function noteRow(note) {
    return '<div class="list-row note-row' + (note.done ? ' done' : '') + '">' +
      '<input type="checkbox" data-action="toggle-note" data-id="' + note.id + '"' + (note.done ? ' checked' : '') + ' aria-label="完成">' +
      '<div class="list-row-main note-text">' + LifeApp.ui.esc(note.text) + '</div>' +
      '<div class="row-actions"><button type="button" class="btn btn-sm btn-danger" data-action="delete-note" data-id="' + note.id + '">删除</button></div>' +
      '</div>';
  }

  function planRow(task) {
    return '<div class="list-row home-plan-row' + (task.done ? ' done' : '') + '">' +
      '<input type="checkbox" data-action="toggle-home-task" data-id="' + task.id + '"' + (task.done ? ' checked' : '') + ' aria-label="完成">' +
      '<div class="list-row-main">' +
      '<div class="task-title">' + LifeApp.ui.esc(task.title) + '</div>' +
      (task.time ? '<div class="muted small">' + LifeApp.ui.esc(task.time) + '</div>' : '') +
      '</div>' +
      '</div>';
  }

  function summaryCards() {
    const hidden = LifeApp.store.data.settings.hiddenModules || [];
    const dashboardModules = LifeApp.store.data.settings.dashboardModules;
    return SUMMARY_MODULES.filter(function (id) {
      return hidden.indexOf(id) === -1 && (!Array.isArray(dashboardModules) || dashboardModules.indexOf(id) !== -1);
    }).map(function (id) {
      const module = LifeApp.app.modules.find(function (m) { return m.id === id; });
      const summary = LifeApp.store.getModuleSummary(id);
      return '<button type="button" class="summary-card" data-action="goto-module" data-goto-module="' + id + '">' +
        '<div class="summary-title">' + module.name + '</div>' +
        '<div class="summary-text">' + LifeApp.ui.esc(summary.text) + '</div>' +
        '</button>';
    }).join('');
  }

  function attentionItems() {
    const store = LifeApp.store;
    const d = store.data;
    const today = store.todayKey();
    const items = [];
    (d.plans[today] || []).forEach(function (t) {
      if (!t.done && t.priority === 'high') {
        items.push({ module: 'plan', title: t.title, detail: '今日高优先级' });
      }
    });
    d.campus.records.forEach(function (r) {
      const active = ['preparing', 'applied', 'written', 'interview'].indexOf(r.status) !== -1;
      if (!active) return;
      if (r.deadline && r.deadline <= store.addDays(today, 3)) {
        items.push({ module: 'campus', title: r.company, detail: '截止 ' + r.deadline });
      } else if (r.nextAction) {
        items.push({ module: 'campus', title: r.company, detail: '下一步：' + r.nextAction });
      }
    });
    d.product.projects.forEach(function (p) {
      p.todos.filter(function (t) { return !t.done; }).slice(0, 2).forEach(function (t) {
        items.push({ module: 'product', title: t.text, detail: p.name + ' 待办' });
      });
    });
    return items.slice(0, 6);
  }

  function saveMemoDraft() {
    const store = LifeApp.store;
    const d = store.data;
    const text = memoDraft.trim();
    if (!text) return;
    if (activeMemoId) {
      const note = d.notes.find(function (n) { return n.id === activeMemoId; });
      if (note) note.text = text;
    } else {
      const note = { id: store.uid(), text: text, done: false, createdAt: new Date().toISOString() };
      d.notes.push(note);
      activeMemoId = note.id;
    }
    store.save();
  }

  function flushMemo() {
    if (memoTimer) clearTimeout(memoTimer);
    saveMemoDraft();
    memoDraft = '';
    render(containerRef, ctxRef);
  }

  function convertMemo() {
    if (!activeMemoId) return;
    const store = LifeApp.store;
    const d = store.data;
    const note = d.notes.find(function (n) { return n.id === activeMemoId; });
    if (!note) return;
    const today = store.todayKey();
    if (!d.plans[today]) d.plans[today] = [];
    d.plans[today].push({ id: store.uid(), title: note.text, time: '', priority: 'medium', source: '', done: false, status: 'todo', estimatedMinutes: 0 });
    const idx = d.notes.findIndex(function (n) { return n.id === activeMemoId; });
    if (idx !== -1) d.notes.splice(idx, 1);
    activeMemoId = null;
    memoDraft = '';
    store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已转为今日事项');
  }

  function formatMinutes(minutes) {
    const value = Number(minutes || 0);
    if (!value) return '0 分钟';
    if (value < 60) return value + ' 分钟';
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return rest ? hours + ' 小时 ' + rest + ' 分' : hours + ' 小时';
  }

  function addNote() {
    const input = document.getElementById('note-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      LifeApp.ui.toast('请输入备忘内容');
      return;
    }
    LifeApp.store.data.notes.push({
      id: LifeApp.store.uid(),
      text: text,
      done: false,
      createdAt: new Date().toISOString()
    });
    LifeApp.store.save();
    render(containerRef, ctxRef);
      LifeApp.ui.toast('备忘已保存');
  }

  function toggleHomeTask(id) {
    const tasks = LifeApp.store.data.plans[LifeApp.store.todayKey()] || [];
    const task = tasks.find(function (t) { return t.id === id; });
    if (task) {
      task.done = !task.done;
      LifeApp.store.save();
      render(containerRef, ctxRef);
    }
  }

  function toggleNote(id) {
    const note = LifeApp.store.data.notes.find(function (n) { return n.id === id; });
    if (note) {
      note.done = !note.done;
      LifeApp.store.save();
      render(containerRef, ctxRef);
    }
  }

  function deleteNote(id) {
    LifeApp.ui.confirm('确定删除这条备忘吗？').then(function (ok) {
      if (!ok) return;
      const notes = LifeApp.store.data.notes;
      const idx = notes.findIndex(function (n) { return n.id === id; });
      if (idx !== -1) notes.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('备忘已删除');
    });
  }

  function render(container, ctx) {
    containerRef = container;
    ctxRef = ctx;
    const store = LifeApp.store;
    const data = store.data;
    const today = store.todayKey();
    const notes = data.notes.slice().reverse().slice(0, 8);
    const todayTasks = (data.plans[today] || []).slice().sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return String(a.time || '').localeCompare(String(b.time || ''));
    });
    const stats = store.planStats(todayTasks);
    const scheduled = todayTasks.filter(function (t) { return t.time; });
    const unscheduled = todayTasks.filter(function (t) { return !t.time; });
    const scheduledMinutes = todayTasks.reduce(function (sum, t) { return sum + (Number(t.estimatedMinutes) || 0); }, 0);
    const attention = attentionItems();
    const activeNote = activeMemoId ? data.notes.find(function (n) { return n.id === activeMemoId; }) : null;
    const dateFormat = data.settings.dateFormat || 'zh-CN';
    const dateText = dateFormat === 'iso'
      ? today
      : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(today + 'T12:00:00'));

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.home,
        eyebrow: '今天',
        title: '从重点开始',
        description: '欢迎回来，今天的行动、提醒和工作生活状态都在这里。'
      }) +
      '<div class="overview-strip">' +
      '<div class="overview-item"><span>今日进度</span><strong>' + stats.percent + '%</strong></div>' +
      '<div class="progress-track overview-progress"><div class="progress-fill" style="width:' + stats.percent + '%"></div></div>' +
      '<div class="overview-item"><span>已完成</span><strong>' + stats.done + ' / ' + stats.total + '</strong></div>' +
      '<div class="overview-item"><span>已安排</span><strong>' + formatMinutes(scheduledMinutes) + '</strong></div>' +
      '</div>' +
      '<div class="home-grid">' +
      '<div class="home-main">' +
      '<div class="panel home-plan">' +
      '<div class="panel-head"><h2>今日时间线</h2><span class="muted small">有开始时间</span></div>' +
      '<div class="panel-body">' +
      (scheduled.length ? '<div class="note-list">' + scheduled.slice(0, 5).map(planRow).join('') + '</div>' : LifeApp.ui.emptyState('今天还没有时间安排', '')) +
      '</div></div>' +
      '<div class="panel home-plan">' +
      '<div class="panel-head"><h2>待安排事项</h2><span class="muted small">属于今天，还没有时间</span></div>' +
      '<div class="panel-body">' +
      (unscheduled.length ? '<div class="note-list">' + unscheduled.slice(0, 5).map(planRow).join('') + '</div>' : LifeApp.ui.emptyState('所有事项都已安排妥当', '')) +
      '<div style="margin-top:12px;text-align:right"><button type="button" class="btn btn-sm" data-action="goto-plan">去今日计划</button></div>' +
      '</div></div>' +
      '<div class="panel home-notes">' +
      '<div class="panel-head"><h2>快速备忘</h2></div>' +
      '<div class="panel-body">' +
      '<div class="note-input">' +
      '<input id="note-input" type="text" value="' + LifeApp.ui.esc(memoDraft) + '" placeholder="记点什么，停顿后自动保存">' +
      '<button type="button" class="btn btn-primary" data-action="add-note">添加</button>' +
      '</div>' +
      (activeNote ? '<div class="memo-actions"><button type="button" class="btn btn-sm" data-action="convert-memo">转为今日事项</button></div>' : '') +
      (notes.length ? '<div class="note-list">' + notes.map(noteRow).join('') + '</div>' : LifeApp.ui.emptyState('还没有备忘，先记一条', '')) +
      '</div></div>' +
      '</div>' +
      '<div class="home-side">' +
      '<div class="panel">' +
      '<div class="panel-head"><h2>需要关注</h2></div>' +
      '<div class="panel-body attention-list">' +
      (attention.length ? attention.map(function (item) {
        return '<button type="button" class="attention-row" data-action="goto-attention" data-goto-module="' + item.module + '">' +
          '<span class="attention-mark"></span><div><strong>' + LifeApp.ui.esc(item.title) + '</strong><small>' + LifeApp.ui.esc(item.detail) + '</small></div></button>';
      }).join('') : LifeApp.ui.emptyState('目前没有紧急事项', '')) +
      '</div></div>' +
      '<div class="panel">' +
      '<div class="panel-head"><h2>模块摘要</h2></div>' +
      '<div class="panel-body summary-list">' +
      (summaryCards() || LifeApp.ui.emptyState('没有可显示的模块', '')) +
      '</div></div>' +
      '</div>' +
      '</div>';

    const input = container.querySelector('#note-input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        flushMemo();
      }
    });
    input.addEventListener('input', function () {
      memoDraft = input.value;
      if (memoTimer) clearTimeout(memoTimer);
      memoTimer = setTimeout(saveMemoDraft, 700);
    });
    container.querySelector('[data-action="add-note"]').addEventListener('click', flushMemo);
    const convertBtn = container.querySelector('[data-action="convert-memo"]');
    if (convertBtn) convertBtn.addEventListener('click', convertMemo);
    container.querySelectorAll('[data-action="toggle-note"]').forEach(function (el) {
      el.addEventListener('change', function () { toggleNote(el.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="delete-note"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteNote(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="toggle-home-task"]').forEach(function (el) {
      el.addEventListener('change', function () { toggleHomeTask(el.getAttribute('data-id')); });
    });
    const gotoPlan = container.querySelector('[data-action="goto-plan"]');
    if (gotoPlan) gotoPlan.addEventListener('click', function () { ctxRef.switchTo('plan'); });
    container.querySelectorAll('[data-action="goto-module"]').forEach(function (btn) {
      btn.addEventListener('click', function () { ctxRef.switchTo(btn.getAttribute('data-goto-module')); });
    });
    container.querySelectorAll('[data-action="goto-attention"]').forEach(function (btn) {
      btn.addEventListener('click', function () { ctxRef.switchTo(btn.getAttribute('data-goto-module')); });
    });
  }

  return {
    render: render
  };
});
