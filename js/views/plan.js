(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.plan = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SOURCES = [
    { id: '', name: '无' },
    { id: 'media', name: '自媒体' },
    { id: 'campus', name: '校招' },
    { id: 'product', name: '产品工作' },
    { id: 'fitness', name: '健身' },
    { id: 'diet', name: '饮食' },
    { id: 'game', name: '游戏' }
  ];

  const PRIORITIES = [
    { id: 'high', name: '高' },
    { id: 'medium', name: '中' },
    { id: 'low', name: '低' }
  ];

  const STATUSES = [
    { id: 'todo', name: '未开始' },
    { id: 'doing', name: '进行中' },
    { id: 'done', name: '已完成' },
    { id: 'cancelled', name: '已取消' }
  ];

  let currentDate = null;
  let containerRef = null;
  let ctxRef = null;
  let viewMode = 'today';
  let menuId = null;

  function getTasks() {
    const plans = LifeApp.store.data.plans;
    if (!plans[currentDate]) plans[currentDate] = [];
    return plans[currentDate];
  }

  function taskStatus(task) {
    if (task.status) return task.status;
    return task.done ? 'done' : 'todo';
  }

  function statusName(status) {
    const s = STATUSES.find(function (x) { return x.id === status; });
    return s ? s.name : status;
  }

  function sortedTasks(tasks) {
    return tasks.slice().sort(function (a, b) {
      if (taskStatus(a) === 'done' && taskStatus(b) !== 'done') return 1;
      if (taskStatus(a) !== 'done' && taskStatus(b) === 'done') return -1;
      return String(a.time || '').localeCompare(String(b.time || ''));
    });
  }

  function sourceName(id) {
    const s = SOURCES.find(function (x) { return x.id === id; });
    return s ? s.name : '';
  }

  function statusBadge(status) {
    const cls = { todo: 'badge-neutral', doing: 'badge-accent', done: 'badge-success', cancelled: 'badge-danger' }[status] || 'badge-neutral';
    return '<span class="badge ' + cls + '">' + statusName(status) + '</span>';
  }

  function taskBlock(task) {
    const status = taskStatus(task);
    const done = status === 'done';
    const pri = PRIORITIES.find(function (p) { return p.id === task.priority; }) || PRIORITIES[1];
    const src = sourceName(task.source);
    const minutes = Number(task.estimatedMinutes || 0);
    return '<div class="task-block">' +
      '<div class="list-row task-row' + (done ? ' done' : '') + '">' +
      '<span data-action="toggle-task" data-id="' + task.id + '">' + LifeApp.ui.circleCheck(done) + '</span>' +
      '<div class="list-row-main">' +
      '<div class="task-title">' + LifeApp.ui.esc(task.title) + '</div>' +
      '<div class="task-meta">' +
      (task.time ? '<span class="muted small">' + LifeApp.ui.esc(task.time) + '</span>' : '') +
      (minutes ? '<span class="muted small">' + minutes + ' 分钟</span>' : '') +
      statusBadge(status) +
      '<span class="badge badge-' + pri.id + '">' + pri.name + '优先级</span>' +
      (src ? '<button type="button" class="badge badge-accent source-badge" data-action="goto-source" data-source="' + task.source + '">' + src + '</button>' : '') +
      '</div>' +
      (task.notes ? '<div class="muted small task-note">' + LifeApp.ui.esc(task.notes) + '</div>' : '') +
      '</div>' +
      '<div class="row-actions">' +
      '<button type="button" class="icon-btn" data-action="open-menu" data-id="' + task.id + '" title="更多操作">' + LifeApp.ui.threeDots() + '</button>' +
      '<button type="button" class="btn btn-sm" data-action="edit-task" data-id="' + task.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-task" data-id="' + task.id + '">删除</button>' +
      '</div></div>' +
      (menuId === task.id ? '<div class="inline-menu">' +
        (status === 'todo' ? '<button type="button" class="btn btn-sm" data-action="start-task" data-id="' + task.id + '">开始执行</button>' : '') +
        (!done && status !== 'cancelled' ? '<button type="button" class="btn btn-sm" data-action="complete-task" data-id="' + task.id + '">标记完成</button>' : '') +
        '<button type="button" class="btn btn-sm" data-action="postpone-task" data-id="' + task.id + '">移到明天</button>' +
        (status !== 'cancelled' ? '<button type="button" class="btn btn-sm" data-action="cancel-task" data-id="' + task.id + '">取消</button>' : '') +
        '</div>' : '') +
      '</div>';
  }

  function openTaskModal(task) {
    const isEdit = !!task;
    const status = task ? taskStatus(task) : 'todo';
    const bodyHtml =
      '<div class="field"><label>标题</label><input id="task-title" type="text" value="' + LifeApp.ui.esc(task ? task.title : '') + '"></div>' +
      '<div class="form-row">' +
      '<div class="field"><label>时间段</label><input id="task-time" type="time" value="' + LifeApp.ui.esc(task && task.time ? task.time : '') + '"></div>' +
      '<div class="field"><label>预计分钟</label><input id="task-minutes" type="number" min="0" value="' + (task ? Number(task.estimatedMinutes || 0) : 0) + '"></div>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="field"><label>优先级</label><select id="task-priority">' +
      PRIORITIES.map(function (p) {
        return '<option value="' + p.id + '"' + ((task && task.priority) === p.id ? ' selected' : '') + '>' + p.name + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label>状态</label><select id="task-status">' +
      STATUSES.map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === status ? ' selected' : '') + '>' + s.name + '</option>';
      }).join('') +
      '</select></div>' +
      '</div>' +
      '<div class="field"><label>来源</label><select id="task-source">' +
      SOURCES.map(function (s) {
        return '<option value="' + s.id + '"' + ((task ? task.source : '') === s.id ? ' selected' : '') + '>' + s.name + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label>备注</label><textarea id="task-notes">' + LifeApp.ui.esc(task ? task.notes : '') + '</textarea></div>';

    LifeApp.ui.modal({
      title: isEdit ? '编辑任务' : '新增任务',
      bodyHtml: bodyHtml,
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () {
          return saveTask(isEdit, task ? task.id : null);
        } }
      ]
    });
  }

  function saveTask(isEdit, id) {
    const title = document.getElementById('task-title').value.trim();
    if (!title) {
      LifeApp.ui.toast('标题不能为空');
      return false;
    }
    const time = document.getElementById('task-time').value;
    const minutes = Number(document.getElementById('task-minutes').value) || 0;
    const notes = document.getElementById('task-notes').value.trim();
    const priority = document.getElementById('task-priority').value;
    const status = document.getElementById('task-status').value;
    const source = document.getElementById('task-source').value;
    const tasks = getTasks();
    if (isEdit) {
      const task = tasks.find(function (t) { return t.id === id; });
      if (task) {
        task.title = title;
        task.time = time;
        task.estimatedMinutes = minutes;
        task.priority = priority;
        task.notes = notes;
        task.status = status;
        task.done = status === 'done';
        task.source = source;
      }
    } else {
      tasks.push({ id: LifeApp.store.uid(), title: title, time: time, estimatedMinutes: minutes, priority: priority, status: status, done: status === 'done', source: source, notes: notes });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '任务已更新' : '任务已添加');
    return true;
  }

  function toggleTask(id) {
    const task = getTasks().find(function (t) { return t.id === id; });
    if (task) {
      const next = taskStatus(task) === 'done' ? 'todo' : 'done';
      task.status = next;
      task.done = next === 'done';
      LifeApp.store.save();
      render(containerRef, ctxRef);
    }
  }

  function deleteTask(id) {
    LifeApp.ui.confirm('确定删除这条任务吗？').then(function (ok) {
      if (!ok) return;
      const tasks = getTasks();
      const idx = tasks.findIndex(function (t) { return t.id === id; });
      if (idx !== -1) tasks.splice(idx, 1);
      if (menuId === id) menuId = null;
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('任务已删除');
    });
  }

  function gotoSource(id, ctx) {
    const hidden = LifeApp.store.data.settings.hiddenModules || [];
    if (hidden.indexOf(id) !== -1) return;
    ctx.switchTo(id);
  }

  function updateTask(id, changes) {
    const task = getTasks().find(function (t) { return t.id === id; });
    if (!task) return;
    Object.assign(task, changes);
    task.done = task.status === 'done';
    menuId = null;
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已更新');
  }

  function postponeTask(id) {
    const tasks = getTasks();
    const idx = tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;
    const task = tasks.splice(idx, 1)[0];
    const next = LifeApp.store.addDays(currentDate, 1);
    if (!LifeApp.store.data.plans[next]) LifeApp.store.data.plans[next] = [];
    LifeApp.store.data.plans[next].push(task);
    menuId = null;
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已移到明天');
  }

  function visibleTasks() {
    const store = LifeApp.store;
    if (viewMode === 'today') {
      return getTasks();
    }
    if (viewMode === 'week') {
      const end = store.addDays(currentDate, 6);
      const result = [];
      Object.keys(store.data.plans).forEach(function (key) {
        if (key >= currentDate && key <= end) result.push.apply(result, store.data.plans[key]);
      });
      return result;
    }
    const result = [];
    Object.keys(store.data.plans).forEach(function (key) {
      if (key < currentDate) result.push.apply(result, store.data.plans[key]);
      else store.data.plans[key].forEach(function (t) {
        if (['done', 'cancelled'].indexOf(taskStatus(t)) !== -1) result.push(t);
      });
    });
    return result;
  }

  function render(container, ctx) {
    containerRef = container;
    ctxRef = ctx;
    if (!currentDate) currentDate = LifeApp.store.todayKey();
    const store = LifeApp.store;
    const tasks = visibleTasks();
    const activeTasks = tasks.filter(function (t) { return taskStatus(t) !== 'cancelled'; });
    const stats = store.planStats(activeTasks);
    const estimated = activeTasks.reduce(function (sum, t) { return sum + (Number(t.estimatedMinutes) || 0); }, 0);
    const today = store.todayKey();
    const isToday = currentDate === today;
    const review = store.data.reviews[currentDate] || '';

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.plan,
        eyebrow: '日常执行',
        title: '今日计划',
        description: '只安排今天何时执行什么，业务详情仍留在对应模块。',
        actions: '<button type="button" class="btn btn-primary" data-action="add-task">+ 添加事项</button>'
      }) +
      '<div class="plan-toolbar">' +
      '<div class="date-nav">' +
      '<button type="button" class="btn btn-sm" data-action="prev-day">&lsaquo; 前一天</button>' +
      '<span class="date-label" data-testid="plan-date">' + currentDate + (isToday ? '（今天）' : '') + '</span>' +
      '<button type="button" class="btn btn-sm" data-action="next-day">后一天 &rsaquo;</button>' +
      (!isToday ? '<button type="button" class="btn btn-sm btn-primary" data-action="today">回到今天</button>' : '') +
      '<input type="date" id="plan-date-picker" value="' + currentDate + '" aria-label="选择日期">' +
      '</div>' +
      '<div class="segmented" data-view-group>' +
      '<button type="button" class="' + (viewMode === 'today' ? 'active' : '') + '" data-view="today">今日</button>' +
      '<button type="button" class="' + (viewMode === 'week' ? 'active' : '') + '" data-view="week">本周</button>' +
      '<button type="button" class="' + (viewMode === 'history' ? 'active' : '') + '" data-view="history">历史</button>' +
      '</div>' +
      '<span class="muted small">' + stats.done + '/' + activeTasks.length + ' 完成 · ' + stats.percent + '% · 预计 ' + estimated + ' 分钟</span>' +
      '</div>' +
      '<div class="panel">' +
      '<div class="panel-head"><h2>' + (viewMode === 'today' ? currentDate + ' 计划' : viewMode === 'week' ? '未来七天' : '历史记录') + '</h2></div>' +
      '<div class="panel-body">' +
      '<div class="progress-track" style="margin-bottom:14px"><div class="progress-fill" style="width:' + stats.percent + '%"></div></div>' +
      (tasks.length ? '<div class="task-list">' + sortedTasks(tasks).map(taskBlock).join('') + '</div>' : LifeApp.ui.emptyState('这个时间范围还没有计划', '<button type="button" class="btn btn-primary" data-action="add-task">+ 新增</button>')) +
      '</div></div>' +
      (viewMode === 'today' ? '<div class="panel" style="margin-top:var(--space)"><div class="panel-head"><h2>当日复盘</h2></div><div class="panel-body"><textarea id="plan-review" class="review-input" placeholder="今天最值得记住的进展、问题或调整……">' + LifeApp.ui.esc(review) + '</textarea></div></div>' : '');

    container.querySelector('[data-action="prev-day"]').addEventListener('click', function () {
      currentDate = LifeApp.store.addDays(currentDate, -1);
      render(containerRef, ctxRef);
    });
    container.querySelector('[data-action="next-day"]').addEventListener('click', function () {
      currentDate = LifeApp.store.addDays(currentDate, 1);
      render(containerRef, ctxRef);
    });
    const todayBtn = container.querySelector('[data-action="today"]');
    if (todayBtn) {
      todayBtn.addEventListener('click', function () {
        currentDate = LifeApp.store.todayKey();
        render(containerRef, ctxRef);
      });
    }
    container.querySelectorAll('[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        viewMode = btn.getAttribute('data-view');
        menuId = null;
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="add-task"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openTaskModal(null); });
    });
    const datePicker = container.querySelector('#plan-date-picker');
    if (datePicker) {
      datePicker.addEventListener('change', function () {
        if (datePicker.value) {
          currentDate = datePicker.value;
          render(containerRef, ctxRef);
        }
      });
    }
    container.querySelectorAll('[data-action="toggle-task"]').forEach(function (el) {
      el.addEventListener('click', function () { toggleTask(el.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="open-menu"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-id');
        menuId = menuId === id ? null : id;
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="edit-task"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const task = getTasks().find(function (t) { return t.id === btn.getAttribute('data-id'); });
        if (task) openTaskModal(task);
      });
    });
    container.querySelectorAll('[data-action="delete-task"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteTask(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="start-task"]').forEach(function (btn) {
      btn.addEventListener('click', function () { updateTask(btn.getAttribute('data-id'), { status: 'doing' }); });
    });
    container.querySelectorAll('[data-action="complete-task"]').forEach(function (btn) {
      btn.addEventListener('click', function () { updateTask(btn.getAttribute('data-id'), { status: 'done' }); });
    });
    container.querySelectorAll('[data-action="postpone-task"]').forEach(function (btn) {
      btn.addEventListener('click', function () { postponeTask(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="cancel-task"]').forEach(function (btn) {
      btn.addEventListener('click', function () { updateTask(btn.getAttribute('data-id'), { status: 'cancelled' }); });
    });
    container.querySelectorAll('[data-action="goto-source"]').forEach(function (btn) {
      btn.addEventListener('click', function () { gotoSource(btn.getAttribute('data-source'), ctxRef); });
    });
    const reviewInput = container.querySelector('#plan-review');
    if (reviewInput) {
      reviewInput.addEventListener('blur', function () {
        const value = reviewInput.value.trim();
        if (value !== (LifeApp.store.data.reviews[currentDate] || '')) {
          LifeApp.store.data.reviews[currentDate] = value;
          LifeApp.store.save();
          LifeApp.ui.toast('复盘已保存');
        }
      });
    }
  }

  return {
    render: render
  };
});
