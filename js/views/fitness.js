(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.fitness = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TABS = [
    { id: 'plans', name: '训练计划' },
    { id: 'logs', name: '训练记录' },
    { id: 'metrics', name: '身体指标' }
  ];

  let containerRef = null;
  let ctxRef = null;
  let currentTab = 'plans';
  let logPlanId = null;
  let calendarMonth = null;
  let selectedDate = null;

  function findPlan(id) {
    return LifeApp.store.data.fitness.plans.find(function (p) { return p.id === id; });
  }

  function statusBadge(status) {
    const name = { planned: '已计划', in_progress: '进行中', completed: '已完成' }[status] || '已完成';
    const cls = { planned: 'badge-neutral', in_progress: 'badge-warning', completed: 'badge-success' }[status] || 'badge-success';
    return '<span class="badge ' + cls + '">' + name + '</span>';
  }

  function exerciseRow(planId, ex) {
    return '<div class="list-row">' +
      '<div class="list-row-main"><span class="task-title">' + LifeApp.ui.esc(ex.name) + '</span>' +
      '<span class="muted small"> ' + Number(ex.sets || 0) + ' 组 × ' + Number(ex.reps || 0) + ' 次 × ' + Number(ex.weight || 0) + 'kg' + (ex.restSeconds ? ' · 休息 ' + ex.restSeconds + 's' : '') + '</span></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-exercise" data-plan="' + planId + '" data-id="' + ex.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-exercise" data-plan="' + planId + '" data-id="' + ex.id + '">删除</button>' +
      '</div></div>';
  }

  function planCard(plan) {
    return '<div class="fitness-plan-card">' +
      '<div class="panel-head"><div><h3>' + LifeApp.ui.esc(plan.name) + '</h3>' +
      '<span class="muted small">' + LifeApp.ui.esc(plan.schedule || '未安排时间') + '</span></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm btn-primary" data-action="start-workout" data-id="' + plan.id + '">开始训练</button>' +
      '<button type="button" class="btn btn-sm" data-action="start-log" data-id="' + plan.id + '">快速打卡</button>' +
      '<button type="button" class="btn btn-sm" data-action="edit-plan" data-id="' + plan.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-plan" data-id="' + plan.id + '">删除</button>' +
      '</div></div>' +
      '<div class="panel-body">' +
      (plan.exercises.length ? plan.exercises.map(function (ex) { return exerciseRow(plan.id, ex); }).join('') : LifeApp.ui.emptyState('还没有动作，添加一个', '')) +
      '<div style="margin-top:10px"><button type="button" class="btn btn-sm" data-action="add-exercise" data-plan="' + plan.id + '">+ 添加动作</button></div>' +
      '</div></div>';
  }

  function previousFor(name) {
    const logs = LifeApp.store.data.fitness.logs;
    for (let i = logs.length - 1; i >= 0; i -= 1) {
      const found = (logs[i].exercises || []).find(function (ex) { return ex.name === name && (Number(ex.sets) || 0) > 0; });
      if (found) return '上次：' + found.sets + ' 组 × ' + found.reps + ' 次 × ' + found.weight + 'kg';
    }
    return '第一次记录';
  }

  function logFormHtml() {
    const plans = LifeApp.store.data.fitness.plans;
    if (!logPlanId && plans.length) logPlanId = plans[0].id;
    const plan = findPlan(logPlanId);
    let formHtml = '<div class="field"><label>训练日期</label><input id="fitness-log-date" type="date" value="' + LifeApp.store.todayKey() + '"></div>';
    formHtml += '<div class="field"><label>训练计划</label><select id="fitness-log-plan">' +
      plans.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === logPlanId ? ' selected' : '') + '>' + LifeApp.ui.esc(p.name) + '</option>';
      }).join('') + '</select></div>';
    if (plan && plan.exercises.length) {
      formHtml += '<div class="exercise-log-list">' + plan.exercises.map(function (ex) {
        return '<div class="exercise-log-row">' +
          '<span class="exercise-log-name">' + LifeApp.ui.esc(ex.name) + '</span>' +
          '<label>组数<input type="number" id="fitness-ex-' + ex.id + '-sets" value="' + Number(ex.sets || 0) + '"></label>' +
          '<label>次数<input type="number" id="fitness-ex-' + ex.id + '-reps" value="' + Number(ex.reps || 0) + '"></label>' +
          '<label>重量kg<input type="number" id="fitness-ex-' + ex.id + '-weight" value="' + Number(ex.weight || 0) + '"></label>' +
          '</div>' +
          '<div class="muted small previous-line">' + previousFor(ex.name) + '</div>';
      }).join('') + '</div>';
    } else {
      formHtml += LifeApp.ui.emptyState('这个计划还没有动作，先到训练计划中添加', '');
    }
    formHtml += '<div style="margin-top:12px"><button type="button" class="btn btn-primary" data-action="save-log">保存训练记录</button></div>';
    return formHtml;
  }

  function logSummary(log) {
    const plan = findPlan(log.planId);
    const summary = (log.exercises || []).map(function (ex) {
      return LifeApp.ui.esc(ex.name) + ' ' + Number(ex.sets || 0) + 'x' + Number(ex.reps || 0) + 'x' + Number(ex.weight || 0) + 'kg';
    }).join(' · ');
    return summary || (plan ? '按模板 ' + LifeApp.ui.esc(plan.name) : '空训练记录');
  }

  function calendarHtml() {
    const store = LifeApp.store;
    if (!calendarMonth) calendarMonth = store.todayKey().slice(0, 7);
    const weekStart = store.data.settings.weekStart || 'monday';
    const parts = calendarMonth.split('-').map(Number);
    const days = store.buildMonthDays(calendarMonth, weekStart);
    const byDate = {};
    store.data.fitness.logs.forEach(function (l) {
      if (!byDate[l.date]) byDate[l.date] = [];
      byDate[l.date].push(l);
    });
    const labels = weekStart === 'sunday' ? ['日', '一', '二', '三', '四', '五', '六'] : ['一', '二', '三', '四', '五', '六', '日'];
    let html = '<div class="calendar-head">' +
      '<button type="button" class="btn btn-sm" data-action="prev-month">上月</button>' +
      '<span class="calendar-title">' + parts[0] + ' 年 ' + parts[1] + ' 月</span>' +
      '<button type="button" class="btn btn-sm" data-action="next-month">下月</button></div>';
    html += '<div class="month-grid">' + labels.map(function (label) {
      return '<div class="month-weekday">' + label + '</div>';
    }).join('');
    days.forEach(function (day) {
      const logs = byDate[day.date] || [];
      html += '<button type="button" class="month-day' + (day.date === selectedDate ? ' active' : '') + (day.inMonth ? '' : ' outside') + '" data-cal-date="' + day.date + '">' +
        '<span class="month-day-num">' + Number(day.date.slice(-2)) + '</span>' +
        (logs.length ? logs.slice(0, 2).map(function (l) {
          const plan = findPlan(l.planId);
          return '<span class="month-entry">' + LifeApp.ui.esc(plan ? plan.name : '训练') + '</span>';
        }).join('') + (logs.length > 2 ? '<small class="calendar-more">另有 ' + (logs.length - 2) + ' 次</small>' : '') : '') +
        '</button>';
    });
    html += '</div>';
    const selectedLogs = selectedDate ? (byDate[selectedDate] || []) : [];
    html += '<div class="calendar-day-list">' +
      (selectedDate ? '<h3>' + selectedDate + ' 训练</h3>' + (selectedLogs.length ? selectedLogs.map(function (l) {
        const plan = findPlan(l.planId);
        return '<div class="list-row">' +
          '<div class="list-row-main"><div class="task-title">' + LifeApp.ui.esc(plan ? plan.name : '训练') + '</div>' +
          '<div class="task-meta">' + statusBadge(l.status) + '<span class="muted small">' + logSummary(l) + '</span></div></div>' +
          (l.status === 'in_progress' ? '<div class="row-actions"><button type="button" class="btn btn-sm btn-primary" data-action="complete-log" data-id="' + l.id + '">完成训练</button></div>' : '') +
          '</div>';
      }).join('') : LifeApp.ui.emptyState('这一天没有训练', '')) : LifeApp.ui.emptyState('点击日历中的日期查看训练', '')) +
      '</div>';
    return html;
  }

  function metricTrend(metrics) {
    const sorted = metrics.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    if (sorted.length < 2) return '';
    const latest = Number(sorted[0].weight || 0);
    const prev = Number(sorted[1].weight || 0);
    const diff = latest - prev;
    return '较上次 ' + (diff >= 0 ? '+' : '') + diff + 'kg';
  }

  function render(container, ctx) {
    containerRef = container;
    ctxRef = ctx;
    const data = LifeApp.store.data;
    const plans = data.fitness.plans;
    const logs = data.fitness.logs.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    const metrics = data.fitness.metrics.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    const latestMetric = metrics[0];
    const trend = metricTrend(metrics);

    let bodyHtml = '';
    if (currentTab === 'plans') {
      bodyHtml = '<div class="panel"><div class="panel-head"><h2>训练计划</h2><button type="button" class="btn btn-primary" data-action="add-plan">+ 新增计划</button></div><div class="panel-body">' +
        (plans.length ? '<div class="fitness-plan-grid">' + plans.map(planCard).join('') + '</div>' : LifeApp.ui.emptyState('还没有训练计划，先创建一个', '')) +
        '</div></div>';
    } else if (currentTab === 'logs') {
      bodyHtml = '<div class="panel"><div class="panel-head"><h2>训练日历</h2></div><div class="panel-body">' + calendarHtml() + '</div></div>' +
        '<div class="panel" style="margin-top:var(--space)"><div class="panel-head"><h2>快速打卡</h2></div><div class="panel-body">' + logFormHtml() + '</div></div>' +
        '<div class="panel" style="margin-top:var(--space)"><div class="panel-head"><h2>训练记录</h2></div><div class="panel-body">' +
        (logs.length ? logs.map(function (log) {
          const plan = findPlan(log.planId);
          return '<div class="list-row">' +
            '<div class="list-row-main"><div class="task-title">' + LifeApp.ui.esc(log.date) + ' · ' + LifeApp.ui.esc(plan ? plan.name : '已删除计划') + '</div>' +
            '<div class="task-meta">' + statusBadge(log.status) + '<span class="muted small">' + logSummary(log) + '</span></div></div>' +
            '<div class="row-actions">' +
            (log.status === 'in_progress' ? '<button type="button" class="btn btn-sm btn-primary" data-action="complete-log" data-id="' + log.id + '">完成训练</button>' : '') +
            '<button type="button" class="btn btn-sm btn-danger" data-action="delete-log" data-id="' + log.id + '">删除</button>' +
            '</div></div>';
        }).join('') : LifeApp.ui.emptyState('还没有训练记录', '')) +
        '</div></div>';
    } else {
      bodyHtml = '<div class="stat-grid">' +
        '<div class="stat-card"><div class="num">' + (latestMetric ? Number(latestMetric.weight || 0) : '-') + '</div><div class="label">最新体重 kg</div></div>' +
        '<div class="stat-card"><div class="num">' + (latestMetric ? Number(latestMetric.bodyFat || 0) : '-') + '</div><div class="label">最新体脂 %</div></div>' +
        '<div class="stat-card"><div class="num">' + (trend ? trend.replace('较上次 ', '') : '-') + '</div><div class="label">体重趋势</div></div>' +
        '</div>' +
        '<div class="panel" style="margin-top:var(--space)"><div class="panel-head"><h2>身体指标</h2><button type="button" class="btn btn-primary" data-action="add-metric">+ 记录指标</button></div><div class="panel-body">' +
        (metrics.length ? metrics.map(function (m) {
          return '<div class="list-row">' +
            '<div class="list-row-main"><span class="task-title">' + LifeApp.ui.esc(m.date) + '</span>' +
            '<div class="task-meta"><span class="muted small">' + Number(m.weight || 0) + 'kg · 体脂 ' + Number(m.bodyFat || 0) + '%' +
            (m.waist ? ' · 腰围 ' + Number(m.waist || 0) + 'cm' : '') +
            (m.chest ? ' · 胸围 ' + Number(m.chest || 0) + 'cm' : '') + '</span></div>' +
            (m.notes ? '<div class="muted small">' + LifeApp.ui.esc(m.notes) + '</div>' : '') +
            '</div>' +
            '<div class="row-actions">' +
            '<button type="button" class="btn btn-sm" data-action="edit-metric" data-id="' + m.id + '">编辑</button>' +
            '<button type="button" class="btn btn-sm btn-danger" data-action="delete-metric" data-id="' + m.id + '">删除</button>' +
            '</div></div>';
        }).join('') : LifeApp.ui.emptyState('还没有身体指标', '')) +
        '</div></div>';
    }

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.fitness,
        eyebrow: '训练与身体数据',
        title: '健身计划',
        description: '用训练模板开始，逐组记录实际完成情况，并保留历史。',
        actions: '<button type="button" id="fitness-add-template-btn" class="btn btn-primary">+ 新建训练模板</button>'
      }) +
      '<div class="tabs">' + TABS.map(function (t) {
        return '<button type="button" class="tab-btn' + (t.id === currentTab ? ' active' : '') + '" data-tab="' + t.id + '">' + t.name + '</button>';
      }).join('') + '</div>' +
      bodyHtml;

    container.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentTab = btn.getAttribute('data-tab');
        render(containerRef, ctxRef);
      });
    });
    bind(container);
  }

  function bind(container) {
    const headerAdd = container.querySelector('#fitness-add-template-btn');
    if (headerAdd) headerAdd.addEventListener('click', function () { openPlanModal(null); });
    container.querySelectorAll('[data-action="add-plan"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openPlanModal(null); });
    });
    container.querySelectorAll('[data-action="edit-plan"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const plan = findPlan(btn.getAttribute('data-id'));
        if (plan) openPlanModal(plan);
      });
    });
    container.querySelectorAll('[data-action="delete-plan"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deletePlan(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-exercise"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openExerciseModal(btn.getAttribute('data-plan'), null); });
    });
    container.querySelectorAll('[data-action="edit-exercise"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const plan = findPlan(btn.getAttribute('data-plan'));
        const ex = plan && plan.exercises.find(function (x) { return x.id === btn.getAttribute('data-id'); });
        if (ex) openExerciseModal(plan.id, ex);
      });
    });
    container.querySelectorAll('[data-action="delete-exercise"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteExercise(btn.getAttribute('data-plan'), btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="start-log"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        logPlanId = btn.getAttribute('data-id');
        currentTab = 'logs';
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="start-workout"]').forEach(function (btn) {
      btn.addEventListener('click', function () { startWorkout(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="complete-log"]').forEach(function (btn) {
      btn.addEventListener('click', function () { completeLog(btn.getAttribute('data-id')); });
    });
    const planSelect = container.querySelector('#fitness-log-plan');
    if (planSelect) {
      planSelect.addEventListener('change', function () {
        logPlanId = planSelect.value;
        render(containerRef, ctxRef);
      });
    }
    container.querySelectorAll('[data-action="save-log"]').forEach(function (btn) {
      btn.addEventListener('click', function () { saveLog(); });
    });
    container.querySelectorAll('[data-action="delete-log"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteLog(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="prev-month"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = calendarMonth.split('-').map(Number);
        calendarMonth = LifeApp.store.dateKey(new Date(parts[0], parts[1] - 2, 1)).slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="next-month"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = calendarMonth.split('-').map(Number);
        calendarMonth = LifeApp.store.dateKey(new Date(parts[0], parts[1], 1)).slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-cal-date]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedDate = btn.getAttribute('data-cal-date');
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="add-metric"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openMetricModal(null); });
    });
    container.querySelectorAll('[data-action="edit-metric"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const metric = LifeApp.store.data.fitness.metrics.find(function (m) { return m.id === btn.getAttribute('data-id'); });
        if (metric) openMetricModal(metric);
      });
    });
    container.querySelectorAll('[data-action="delete-metric"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteMetric(btn.getAttribute('data-id')); });
    });
  }

  function openPlanModal(plan) {
    const isEdit = !!plan;
    LifeApp.ui.modal({
      title: isEdit ? '编辑训练计划' : '新增训练计划',
      bodyHtml:
        '<div class="field"><label>计划名称</label><input id="fitness-plan-name" type="text" value="' + LifeApp.ui.esc(plan ? plan.name : '') + '"></div>' +
        '<div class="field"><label>每周安排</label><input id="fitness-plan-schedule" type="text" value="' + LifeApp.ui.esc(plan ? plan.schedule : '') + '" placeholder="如 周一 胸部"></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return savePlan(isEdit, plan ? plan.id : null); } }
      ]
    });
  }

  function savePlan(isEdit, id) {
    const name = document.getElementById('fitness-plan-name').value.trim();
    if (!name) {
      LifeApp.ui.toast('计划名称不能为空');
      return false;
    }
    const schedule = document.getElementById('fitness-plan-schedule').value.trim();
    const plans = LifeApp.store.data.fitness.plans;
    if (isEdit) {
      const plan = findPlan(id);
      if (plan) Object.assign(plan, { name: name, schedule: schedule });
    } else {
      plans.push({ id: LifeApp.store.uid(), name: name, schedule: schedule, exercises: [] });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '计划已更新' : '计划已创建');
    return true;
  }

  function deletePlan(id) {
    LifeApp.ui.confirm('确定删除这个训练计划吗？').then(function (ok) {
      if (!ok) return;
      const plans = LifeApp.store.data.fitness.plans;
      const idx = plans.findIndex(function (p) { return p.id === id; });
      if (idx !== -1) plans.splice(idx, 1);
      if (logPlanId === id) logPlanId = null;
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('计划已删除');
    });
  }

  function openExerciseModal(planId, ex) {
    const isEdit = !!ex;
    LifeApp.ui.modal({
      title: isEdit ? '编辑动作' : '添加动作',
      bodyHtml:
        '<div class="field"><label>动作名称</label><input id="fitness-ex-name" type="text" value="' + LifeApp.ui.esc(ex ? ex.name : '') + '"></div>' +
        '<div class="form-row-3">' +
        '<div class="field"><label>组数</label><input id="fitness-ex-sets" type="number" min="1" value="' + (ex ? Number(ex.sets || 0) : 3) + '"></div>' +
        '<div class="field"><label>次数</label><input id="fitness-ex-reps" type="number" min="1" value="' + (ex ? Number(ex.reps || 0) : 10) + '"></div>' +
        '<div class="field"><label>重量kg</label><input id="fitness-ex-weight" type="number" min="0" value="' + (ex ? Number(ex.weight || 0) : 0) + '"></div>' +
        '</div>' +
        '<div class="field"><label>休息秒数</label><input id="fitness-ex-rest" type="number" min="0" value="' + (ex ? Number(ex.restSeconds || 0) : 60) + '"></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveExercise(planId, isEdit, ex ? ex.id : null); } }
      ]
    });
  }

  function saveExercise(planId, isEdit, id) {
    const name = document.getElementById('fitness-ex-name').value.trim();
    if (!name) {
      LifeApp.ui.toast('动作名称不能为空');
      return false;
    }
    const sets = Number(document.getElementById('fitness-ex-sets').value) || 0;
    const reps = Number(document.getElementById('fitness-ex-reps').value) || 0;
    const weight = Number(document.getElementById('fitness-ex-weight').value) || 0;
    const restSeconds = Number(document.getElementById('fitness-ex-rest').value) || 0;
    const plan = findPlan(planId);
    if (!plan) return false;
    if (isEdit) {
      const ex = plan.exercises.find(function (x) { return x.id === id; });
      if (ex) Object.assign(ex, { name: name, sets: sets, reps: reps, weight: weight, restSeconds: restSeconds });
    } else {
      plan.exercises.push({ id: LifeApp.store.uid(), name: name, sets: sets, reps: reps, weight: weight, restSeconds: restSeconds });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '动作已更新' : '动作已添加');
    return true;
  }

  function deleteExercise(planId, id) {
    LifeApp.ui.confirm('确定删除这个动作吗？').then(function (ok) {
      if (!ok) return;
      const plan = findPlan(planId);
      if (!plan) return;
      const idx = plan.exercises.findIndex(function (x) { return x.id === id; });
      if (idx !== -1) plan.exercises.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('动作已删除');
    });
  }

  function startWorkout(planId) {
    const plan = findPlan(planId);
    if (!plan) return;
    const today = LifeApp.store.todayKey();
    LifeApp.store.data.fitness.logs.push({
      id: LifeApp.store.uid(),
      date: today,
      planId: plan.id,
      exercises: plan.exercises.map(function (ex) {
        return { id: ex.id, name: ex.name, sets: 0, reps: 0, weight: 0 };
      }),
      status: 'in_progress',
      note: ''
    });
    currentTab = 'logs';
    selectedDate = today;
    calendarMonth = today.slice(0, 7);
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已开始训练');
  }

  function completeLog(id) {
    const log = LifeApp.store.data.fitness.logs.find(function (l) { return l.id === id; });
    if (!log) return;
    log.status = 'completed';
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('训练已完成');
  }

  function saveLog() {
    const plan = findPlan(logPlanId);
    if (!plan) {
      LifeApp.ui.toast('请先选择训练计划');
      return;
    }
    const date = document.getElementById('fitness-log-date').value;
    if (!date) {
      LifeApp.ui.toast('请选择训练日期');
      return;
    }
    const exercises = plan.exercises.map(function (ex) {
      return {
        id: ex.id,
        name: ex.name,
        sets: Number(document.getElementById('fitness-ex-' + ex.id + '-sets').value) || 0,
        reps: Number(document.getElementById('fitness-ex-' + ex.id + '-reps').value) || 0,
        weight: Number(document.getElementById('fitness-ex-' + ex.id + '-weight').value) || 0
      };
    });
    LifeApp.store.data.fitness.logs.push({ id: LifeApp.store.uid(), date: date, planId: plan.id, exercises: exercises, status: 'completed', note: '' });
    selectedDate = date;
    calendarMonth = date.slice(0, 7);
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('训练记录已保存');
  }

  function deleteLog(id) {
    LifeApp.ui.confirm('确定删除这条训练记录吗？').then(function (ok) {
      if (!ok) return;
      const logs = LifeApp.store.data.fitness.logs;
      const idx = logs.findIndex(function (l) { return l.id === id; });
      if (idx !== -1) logs.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('记录已删除');
    });
  }

  function openMetricModal(metric) {
    const isEdit = !!metric;
    LifeApp.ui.modal({
      title: isEdit ? '编辑身体指标' : '记录身体指标',
      bodyHtml:
        '<div class="field"><label>日期</label><input id="fitness-metric-date" type="date" value="' + LifeApp.ui.esc(metric ? metric.date : LifeApp.store.todayKey()) + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>体重 kg</label><input id="fitness-metric-weight" type="number" step="0.1" value="' + (metric ? Number(metric.weight || 0) : '') + '"></div>' +
        '<div class="field"><label>体脂 %</label><input id="fitness-metric-fat" type="number" step="0.1" value="' + (metric ? Number(metric.bodyFat || 0) : '') + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="field"><label>腰围 cm</label><input id="fitness-metric-waist" type="number" step="0.1" value="' + (metric ? Number(metric.waist || 0) : '') + '"></div>' +
        '<div class="field"><label>胸围 cm</label><input id="fitness-metric-chest" type="number" step="0.1" value="' + (metric ? Number(metric.chest || 0) : '') + '"></div>' +
        '</div>' +
        '<div class="field"><label>备注</label><textarea id="fitness-metric-notes">' + LifeApp.ui.esc(metric ? metric.notes : '') + '</textarea></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveMetric(isEdit, metric ? metric.id : null); } }
      ]
    });
  }

  function saveMetric(isEdit, id) {
    const date = document.getElementById('fitness-metric-date').value;
    if (!date) {
      LifeApp.ui.toast('请选择日期');
      return false;
    }
    const weight = Number(document.getElementById('fitness-metric-weight').value) || 0;
    const bodyFat = Number(document.getElementById('fitness-metric-fat').value) || 0;
    const waist = Number(document.getElementById('fitness-metric-waist').value) || 0;
    const chest = Number(document.getElementById('fitness-metric-chest').value) || 0;
    const notes = document.getElementById('fitness-metric-notes').value.trim();
    const metrics = LifeApp.store.data.fitness.metrics;
    if (isEdit) {
      const metric = metrics.find(function (m) { return m.id === id; });
      if (metric) Object.assign(metric, { date: date, weight: weight, bodyFat: bodyFat, waist: waist, chest: chest, notes: notes });
    } else {
      metrics.push({ id: LifeApp.store.uid(), date: date, weight: weight, bodyFat: bodyFat, waist: waist, chest: chest, notes: notes });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '指标已更新' : '指标已记录');
    return true;
  }

  function deleteMetric(id) {
    LifeApp.ui.confirm('确定删除这条身体指标吗？').then(function (ok) {
      if (!ok) return;
      const metrics = LifeApp.store.data.fitness.metrics;
      const idx = metrics.findIndex(function (m) { return m.id === id; });
      if (idx !== -1) metrics.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('指标已删除');
    });
  }

  return {
    render: render
  };
});
