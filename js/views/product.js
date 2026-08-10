(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.product = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const REQ_PRIORITIES = [
    { id: 'P0', name: 'P0' },
    { id: 'P1', name: 'P1' },
    { id: 'P2', name: 'P2' }
  ];
  const REQ_STATUSES = [
    { id: 'backlog', name: '待排期' },
    { id: 'doing', name: '进行中' },
    { id: 'done', name: '已完成' },
    { id: 'cancelled', name: '砍掉' }
  ];
  const TABS = [
    { id: 'requirements', name: '需求池' },
    { id: 'milestones', name: '里程碑' },
    { id: 'sprints', name: '迭代计划' },
    { id: 'todos', name: '本周待办' },
    { id: 'logs', name: '工作日志' }
  ];

  const PROJECT_STATUSES = [
    { id: 'active', name: '进行中' },
    { id: 'paused', name: '暂停' },
    { id: 'completed', name: '已完成' }
  ];

  const ITEM_TYPES = [
    { id: 'feature', name: '功能' },
    { id: 'requirement', name: '需求' },
    { id: 'bug', name: 'Bug' },
    { id: 'technical', name: '技术问题' }
  ];

  let containerRef = null;
  let ctxRef = null;
  let selectedProjectId = null;
  let projectTab = 'requirements';
  let reqFilter = 'open';

  function statusName(id) {
    const s = REQ_STATUSES.find(function (x) { return x.id === id; });
    return s ? s.name : id;
  }

  function statusBadge(id) {
    const cls = { backlog: 'badge-neutral', doing: 'badge-accent', done: 'badge-success', cancelled: 'badge-danger' }[id] || 'badge-neutral';
    return '<span class="badge ' + cls + '">' + statusName(id) + '</span>';
  }

  function priorityBadge(id) {
    const cls = { P0: 'badge-high', P1: 'badge-medium', P2: 'badge-low' }[id] || 'badge-low';
    return '<span class="badge ' + cls + '">' + id + '</span>';
  }

  function selectedProject() {
    const projects = LifeApp.store.data.product.projects;
    if (!selectedProjectId && projects.length) selectedProjectId = projects[0].id;
    return projects.find(function (p) { return p.id === selectedProjectId; }) || null;
  }

  function projectListHtml(projects, selected) {
    if (!projects.length) return LifeApp.ui.emptyState('还没有项目，先创建一个', '<button type="button" class="btn btn-primary" data-action="add-project">+ 新增项目</button>');
    return projects.map(function (p) {
      const status = PROJECT_STATUSES.find(function (s) { return s.id === p.status; }) || PROJECT_STATUSES[0];
      return '<div class="project-item' + (selected && p.id === selected.id ? ' active' : '') + '" data-action="select-project" data-id="' + p.id + '">' +
        '<div class="project-item-main"><div class="project-name">' + LifeApp.ui.esc(p.name) + '</div>' +
        '<div class="muted small">' + status.name + '</div>' +
        (p.desc ? '<div class="muted small">' + LifeApp.ui.esc(p.desc) + '</div>' : '') +
        '</div>' +
        '<div class="row-actions">' +
        '<button type="button" class="btn btn-sm" data-action="edit-project" data-id="' + p.id + '">编辑</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="delete-project" data-id="' + p.id + '">删除</button>' +
        '</div></div>';
    }).join('');
  }

  function requirementRow(projectId, req) {
    const type = ITEM_TYPES.find(function (t) { return t.id === req.itemType; }) || ITEM_TYPES[1];
    return '<div class="list-row">' +
      '<div class="list-row-main"><div class="task-title">' + LifeApp.ui.esc(req.title) + '</div>' +
      '<div class="task-meta"><span class="badge badge-neutral">' + type.name + '</span>' + priorityBadge(req.priority) + statusBadge(req.status) + '</div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="plan-req" data-project="' + projectId + '" data-id="' + req.id + '" title="加入今日计划">加入计划</button>' +
      '<button type="button" class="btn btn-sm" data-action="edit-req" data-project="' + projectId + '" data-id="' + req.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-req" data-project="' + projectId + '" data-id="' + req.id + '">删除</button>' +
      '</div></div>';
  }

  function sprintRow(projectId, sprint) {
    return '<div class="list-row">' +
      '<div class="list-row-main"><div class="task-title">' + LifeApp.ui.esc(sprint.name) + '</div>' +
      '<div class="task-meta"><span class="muted small">' + LifeApp.ui.esc(sprint.start) + ' 至 ' + LifeApp.ui.esc(sprint.end) + '</span></div>' +
      (sprint.items && sprint.items.length ? '<div class="muted small">' + sprint.items.map(function (i) { return LifeApp.ui.esc(i); }).join(' · ') + '</div>' : '') +
      '</div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-sprint" data-project="' + projectId + '" data-id="' + sprint.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-sprint" data-project="' + projectId + '" data-id="' + sprint.id + '">删除</button>' +
      '</div></div>';
  }

  function milestoneRow(projectId, milestone) {
    return '<div class="list-row">' +
      '<div class="list-row-main"><div class="task-title">' + LifeApp.ui.esc(milestone.name) + '</div>' +
      '<div class="task-meta">' +
      (milestone.targetDate ? '<span class="muted small">目标 ' + LifeApp.ui.esc(milestone.targetDate) + '</span>' : '<span class="muted small">未设置目标日期</span>') +
      '<span class="badge badge-' + (milestone.status === 'done' ? 'success' : 'neutral') + '">' + (milestone.status === 'done' ? '已完成' : '进行中') + '</span>' +
      '</div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-milestone" data-project="' + projectId + '" data-id="' + milestone.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-milestone" data-project="' + projectId + '" data-id="' + milestone.id + '">删除</button>' +
      '</div></div>';
  }

  function todoRow(projectId, todo) {
    return '<div class="list-row' + (todo.done ? ' done' : '') + '">' +
      '<input type="checkbox" data-action="toggle-todo" data-project="' + projectId + '" data-id="' + todo.id + '"' + (todo.done ? ' checked' : '') + ' aria-label="完成">' +
      '<div class="list-row-main todo-text">' + LifeApp.ui.esc(todo.text) + '</div>' +
      '<div class="row-actions"><button type="button" class="btn btn-sm btn-danger" data-action="delete-todo" data-project="' + projectId + '" data-id="' + todo.id + '">删除</button></div>' +
      '</div>';
  }

  function logRow(projectId, log) {
    return '<div class="list-row">' +
      '<div class="list-row-main"><div class="task-title">' + LifeApp.ui.esc(log.date) + '</div><div>' + LifeApp.ui.esc(log.content) + '</div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-log" data-project="' + projectId + '" data-id="' + log.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-log" data-project="' + projectId + '" data-id="' + log.id + '">删除</button>' +
      '</div></div>';
  }

  function tabContent(project) {
    if (projectTab === 'requirements') {
      const filtered = project.requirements.filter(function (r) {
        if (reqFilter === 'all') return true;
        if (reqFilter === 'bug') return r.itemType === 'bug';
        return r.status !== 'done' && r.status !== 'cancelled';
      });
      return '<div class="tab-toolbar"><h3>需求池</h3><div class="work-section-actions"><div class="compact-filter">' +
        '<button type="button" class="' + (reqFilter === 'open' ? 'active' : '') + '" data-req-filter="open">未完成</button>' +
        '<button type="button" class="' + (reqFilter === 'bug' ? 'active' : '') + '" data-req-filter="bug">Bug</button>' +
        '<button type="button" class="' + (reqFilter === 'all' ? 'active' : '') + '" data-req-filter="all">全部</button>' +
        '</div><button type="button" class="btn btn-primary btn-sm" data-action="add-req" data-project="' + project.id + '">+ 新增需求</button></div></div>' +
        (filtered.length ? filtered.map(function (r) { return requirementRow(project.id, r); }).join('') : LifeApp.ui.emptyState('当前筛选没有需求', ''));
    }
    if (projectTab === 'milestones') {
      return '<div class="tab-toolbar"><h3>里程碑</h3><button type="button" class="btn btn-primary btn-sm" data-action="add-milestone" data-project="' + project.id + '">+ 新增里程碑</button></div>' +
        (project.milestones.length ? project.milestones.map(function (m) { return milestoneRow(project.id, m); }).join('') : LifeApp.ui.emptyState('还没有里程碑，用目标日期把握项目节奏', ''));
    }
    if (projectTab === 'sprints') {
      return '<div class="tab-toolbar"><h3>迭代计划</h3><button type="button" class="btn btn-primary btn-sm" data-action="add-sprint" data-project="' + project.id + '">+ 新增迭代</button></div>' +
        (project.sprints.length ? project.sprints.map(function (s) { return sprintRow(project.id, s); }).join('') : LifeApp.ui.emptyState('还没有迭代', ''));
    }
    if (projectTab === 'todos') {
      return '<div class="tab-toolbar"><h3>本周待办</h3></div>' +
        '<div class="note-input"><input id="product-todo-input" type="text" placeholder="添加本周待办"><button type="button" class="btn btn-primary" data-action="add-todo" data-project="' + project.id + '">添加</button></div>' +
        (project.todos.length ? project.todos.map(function (t) { return todoRow(project.id, t); }).join('') : LifeApp.ui.emptyState('本周还没有待办', ''));
    }
    return '<div class="tab-toolbar"><h3>工作日志</h3><button type="button" class="btn btn-primary btn-sm" data-action="add-log" data-project="' + project.id + '">+ 写日志</button></div>' +
      (project.logs.length ? project.logs.slice().reverse().map(function (l) { return logRow(project.id, l); }).join('') : LifeApp.ui.emptyState('还没有工作日志', ''));
  }

  function render(container, ctx) {
    containerRef = container;
    ctxRef = ctx;
    const data = LifeApp.store.data;
    const projects = data.product.projects;
    const selected = selectedProject();

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.product,
        eyebrow: '项目与技术记录',
        title: '产品工作',
        description: '项目、里程碑、需求、待办和日志各归其位。',
        actions: '<button type="button" class="btn btn-primary" data-action="add-project">+ 新增项目</button>'
      }) +
      '<div class="product-layout">' +
      '<div class="panel project-list-panel"><div class="panel-head"><h2>项目</h2></div><div class="panel-body">' +
      projectListHtml(projects, selected) +
      '</div></div>' +
      (selected ? '<div class="panel project-detail">' +
        '<div class="panel-head"><h2>' + LifeApp.ui.esc(selected.name) + '</h2>' +
        '<div class="detail-actions">' +
        '<span class="badge badge-' + (selected.status === 'active' ? 'success' : selected.status === 'completed' ? 'neutral' : 'warning') + '">' + ((PROJECT_STATUSES.find(function (s) { return s.id === selected.status; }) || PROJECT_STATUSES[0]).name) + '</span>' +
        (selected.desc ? '<span class="muted small">' + LifeApp.ui.esc(selected.desc) + '</span>' : '') +
        '</div></div>' +
        '<div class="panel-body">' +
        '<div class="tabs project-tabs">' + TABS.map(function (t) {
          return '<button type="button" class="tab-btn' + (t.id === projectTab ? ' active' : '') + '" data-project-tab="' + t.id + '">' + t.name + '</button>';
        }).join('') + '</div>' +
        tabContent(selected) +
        '</div></div>' : '<div class="panel project-detail"><div class="panel-body">' + LifeApp.ui.emptyState('选择或创建一个项目开始', '') + '</div></div>') +
      '</div>';

    bind(container);
  }

  function bind(container) {
    container.querySelectorAll('[data-action="add-project"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openProjectModal(null); });
    });
    container.querySelectorAll('[data-action="select-project"]').forEach(function (el) {
      el.addEventListener('click', function () {
        selectedProjectId = el.getAttribute('data-id');
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="edit-project"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const project = LifeApp.store.data.product.projects.find(function (p) { return p.id === btn.getAttribute('data-id'); });
        if (project) openProjectModal(project);
      });
    });
    container.querySelectorAll('[data-action="delete-project"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteProject(btn.getAttribute('data-id'));
      });
    });
    container.querySelectorAll('[data-project-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        projectTab = btn.getAttribute('data-project-tab');
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="add-req"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openReqModal(btn.getAttribute('data-project'), null); });
    });
    container.querySelectorAll('[data-req-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        reqFilter = btn.getAttribute('data-req-filter');
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="edit-req"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const project = findProject(btn.getAttribute('data-project'));
        const req = project && project.requirements.find(function (r) { return r.id === btn.getAttribute('data-id'); });
        if (req) openReqModal(project.id, req);
      });
    });
    container.querySelectorAll('[data-action="delete-req"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteReq(btn.getAttribute('data-project'), btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="plan-req"]').forEach(function (btn) {
      btn.addEventListener('click', function () { planReq(btn.getAttribute('data-project'), btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-milestone"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openMilestoneModal(btn.getAttribute('data-project'), null); });
    });
    container.querySelectorAll('[data-action="edit-milestone"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const project = findProject(btn.getAttribute('data-project'));
        const milestone = project && project.milestones.find(function (m) { return m.id === btn.getAttribute('data-id'); });
        if (milestone) openMilestoneModal(project.id, milestone);
      });
    });
    container.querySelectorAll('[data-action="delete-milestone"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteMilestone(btn.getAttribute('data-project'), btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-sprint"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openSprintModal(btn.getAttribute('data-project'), null); });
    });
    container.querySelectorAll('[data-action="edit-sprint"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const project = findProject(btn.getAttribute('data-project'));
        const sprint = project && project.sprints.find(function (s) { return s.id === btn.getAttribute('data-id'); });
        if (sprint) openSprintModal(project.id, sprint);
      });
    });
    container.querySelectorAll('[data-action="delete-sprint"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteSprint(btn.getAttribute('data-project'), btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-todo"]').forEach(function (btn) {
      btn.addEventListener('click', function () { addTodo(btn.getAttribute('data-project')); });
    });
    const todoInput = container.querySelector('#product-todo-input');
    if (todoInput) {
      todoInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.isComposing) {
          const btn = container.querySelector('[data-action="add-todo"]');
          if (btn) addTodo(btn.getAttribute('data-project'));
        }
      });
    }
    container.querySelectorAll('[data-action="toggle-todo"]').forEach(function (el) {
      el.addEventListener('change', function () { toggleTodo(el.getAttribute('data-project'), el.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="delete-todo"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteTodo(btn.getAttribute('data-project'), btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-log"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openLogModal(btn.getAttribute('data-project'), null); });
    });
    container.querySelectorAll('[data-action="edit-log"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const project = findProject(btn.getAttribute('data-project'));
        const log = project && project.logs.find(function (l) { return l.id === btn.getAttribute('data-id'); });
        if (log) openLogModal(project.id, log);
      });
    });
    container.querySelectorAll('[data-action="delete-log"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteLog(btn.getAttribute('data-project'), btn.getAttribute('data-id')); });
    });
  }

  function findProject(id) {
    return LifeApp.store.data.product.projects.find(function (p) { return p.id === id; });
  }

  function openProjectModal(project) {
    const isEdit = !!project;
    const status = project ? project.status : 'active';
    LifeApp.ui.modal({
      title: isEdit ? '编辑项目' : '新增项目',
      bodyHtml:
        '<div class="field"><label>项目名称</label><input id="product-project-name" type="text" value="' + LifeApp.ui.esc(project ? project.name : '') + '"></div>' +
        '<div class="field"><label>状态</label><select id="product-project-status">' +
        PROJECT_STATUSES.map(function (s) {
          return '<option value="' + s.id + '"' + (s.id === status ? ' selected' : '') + '>' + s.name + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>描述</label><textarea id="product-project-desc">' + LifeApp.ui.esc(project ? project.desc : '') + '</textarea></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveProject(isEdit, project ? project.id : null); } }
      ]
    });
  }

  function saveProject(isEdit, id) {
    const name = document.getElementById('product-project-name').value.trim();
    if (!name) {
      LifeApp.ui.toast('项目名称不能为空');
      return false;
    }
    const desc = document.getElementById('product-project-desc').value.trim();
    const status = document.getElementById('product-project-status').value;
    const projects = LifeApp.store.data.product.projects;
    if (isEdit) {
      const project = projects.find(function (p) { return p.id === id; });
      if (project) Object.assign(project, { name: name, desc: desc, status: status });
    } else {
      const project = { id: LifeApp.store.uid(), name: name, desc: desc, status: status, requirements: [], milestones: [], sprints: [], todos: [], logs: [] };
      projects.push(project);
      selectedProjectId = project.id;
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '项目已更新' : '项目已创建');
    return true;
  }

  function deleteProject(id) {
    LifeApp.ui.confirm('确定删除这个项目和它的全部数据吗？').then(function (ok) {
      if (!ok) return;
      const projects = LifeApp.store.data.product.projects;
      const idx = projects.findIndex(function (p) { return p.id === id; });
      if (idx !== -1) projects.splice(idx, 1);
      if (selectedProjectId === id) selectedProjectId = null;
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('项目已删除');
    });
  }

  function openReqModal(projectId, req) {
    const isEdit = !!req;
    LifeApp.ui.modal({
      title: isEdit ? '编辑需求' : '新增需求',
      bodyHtml:
        '<div class="field"><label>需求标题</label><input id="product-req-title" type="text" value="' + LifeApp.ui.esc(req ? req.title : '') + '"></div>' +
        '<div class="field"><label>类型</label><select id="product-req-type">' +
        ITEM_TYPES.map(function (t) {
          return '<option value="' + t.id + '"' + ((req ? req.itemType : 'requirement') === t.id ? ' selected' : '') + '>' + t.name + '</option>';
        }).join('') + '</select></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>优先级</label><select id="product-req-priority">' +
        REQ_PRIORITIES.map(function (p) {
          return '<option value="' + p.id + '"' + ((req ? req.priority : 'P1') === p.id ? ' selected' : '') + '>' + p.name + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>状态</label><select id="product-req-status">' +
        REQ_STATUSES.map(function (s) {
          return '<option value="' + s.id + '"' + ((req ? req.status : 'backlog') === s.id ? ' selected' : '') + '>' + s.name + '</option>';
        }).join('') + '</select></div></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveReq(projectId, isEdit, req ? req.id : null); } }
      ]
    });
  }

  function saveReq(projectId, isEdit, id) {
    const title = document.getElementById('product-req-title').value.trim();
    if (!title) {
      LifeApp.ui.toast('需求标题不能为空');
      return false;
    }
    const priority = document.getElementById('product-req-priority').value;
    const status = document.getElementById('product-req-status').value;
    const itemType = document.getElementById('product-req-type').value;
    const project = findProject(projectId);
    if (!project) return false;
    if (isEdit) {
      const req = project.requirements.find(function (r) { return r.id === id; });
      if (req) Object.assign(req, { title: title, priority: priority, status: status, itemType: itemType });
    } else {
      project.requirements.push({ id: LifeApp.store.uid(), title: title, priority: priority, status: status, itemType: itemType });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '需求已更新' : '需求已添加');
    return true;
  }

  function deleteReq(projectId, id) {
    LifeApp.ui.confirm('确定删除这条需求吗？').then(function (ok) {
      if (!ok) return;
      const project = findProject(projectId);
      if (!project) return;
      const idx = project.requirements.findIndex(function (r) { return r.id === id; });
      if (idx !== -1) project.requirements.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('需求已删除');
    });
  }

  function planReq(projectId, id) {
    const project = findProject(projectId);
    if (!project) return;
    const req = project.requirements.find(function (r) { return r.id === id; });
    if (!req) return;
    const today = LifeApp.store.todayKey();
    if (!LifeApp.store.data.plans[today]) LifeApp.store.data.plans[today] = [];
    LifeApp.store.data.plans[today].push({ id: LifeApp.store.uid(), title: req.title, time: '', estimatedMinutes: 0, priority: req.priority === 'P0' ? 'high' : 'medium', source: 'product', done: false, status: 'todo' });
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已加入今日计划');
  }

  function openMilestoneModal(projectId, milestone) {
    const isEdit = !!milestone;
    LifeApp.ui.modal({
      title: isEdit ? '编辑里程碑' : '新增里程碑',
      bodyHtml:
        '<div class="field"><label>里程碑名称</label><input id="product-milestone-name" type="text" value="' + LifeApp.ui.esc(milestone ? milestone.name : '') + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>目标日期</label><input id="product-milestone-date" type="date" value="' + LifeApp.ui.esc(milestone && milestone.targetDate ? milestone.targetDate : '') + '"></div>' +
        '<div class="field"><label>状态</label><select id="product-milestone-status">' +
        '<option value="open"' + (!milestone || milestone.status !== 'done' ? ' selected' : '') + '>进行中</option>' +
        '<option value="done"' + (milestone && milestone.status === 'done' ? ' selected' : '') + '>已完成</option>' +
        '</select></div></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveMilestone(projectId, isEdit, milestone ? milestone.id : null); } }
      ]
    });
  }

  function saveMilestone(projectId, isEdit, id) {
    const name = document.getElementById('product-milestone-name').value.trim();
    if (!name) {
      LifeApp.ui.toast('里程碑名称不能为空');
      return false;
    }
    const targetDate = document.getElementById('product-milestone-date').value || '';
    const status = document.getElementById('product-milestone-status').value;
    const project = findProject(projectId);
    if (!project) return false;
    if (isEdit) {
      const milestone = project.milestones.find(function (m) { return m.id === id; });
      if (milestone) Object.assign(milestone, { name: name, targetDate: targetDate, status: status });
    } else {
      project.milestones.push({ id: LifeApp.store.uid(), name: name, targetDate: targetDate, status: status });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '里程碑已更新' : '里程碑已添加');
    return true;
  }

  function deleteMilestone(projectId, id) {
    LifeApp.ui.confirm('确定删除这个里程碑吗？').then(function (ok) {
      if (!ok) return;
      const project = findProject(projectId);
      if (!project) return;
      const idx = project.milestones.findIndex(function (m) { return m.id === id; });
      if (idx !== -1) project.milestones.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('里程碑已删除');
    });
  }

  function openSprintModal(projectId, sprint) {
    const isEdit = !!sprint;
    LifeApp.ui.modal({
      title: isEdit ? '编辑迭代' : '新增迭代',
      bodyHtml:
        '<div class="field"><label>迭代名称</label><input id="product-sprint-name" type="text" value="' + LifeApp.ui.esc(sprint ? sprint.name : '') + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>开始日期</label><input id="product-sprint-start" type="date" value="' + LifeApp.ui.esc(sprint && sprint.start ? sprint.start : '') + '"></div>' +
        '<div class="field"><label>结束日期</label><input id="product-sprint-end" type="date" value="' + LifeApp.ui.esc(sprint && sprint.end ? sprint.end : '') + '"></div>' +
        '</div>' +
        '<div class="field"><label>条目（每行一条）</label><textarea id="product-sprint-items">' + LifeApp.ui.esc(sprint && sprint.items ? sprint.items.join('\n') : '') + '</textarea></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveSprint(projectId, isEdit, sprint ? sprint.id : null); } }
      ]
    });
  }

  function saveSprint(projectId, isEdit, id) {
    const name = document.getElementById('product-sprint-name').value.trim();
    if (!name) {
      LifeApp.ui.toast('迭代名称不能为空');
      return false;
    }
    const start = document.getElementById('product-sprint-start').value || '';
    const end = document.getElementById('product-sprint-end').value || '';
    const items = document.getElementById('product-sprint-items').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    const project = findProject(projectId);
    if (!project) return false;
    if (isEdit) {
      const sprint = project.sprints.find(function (s) { return s.id === id; });
      if (sprint) Object.assign(sprint, { name: name, start: start, end: end, items: items });
    } else {
      project.sprints.push({ id: LifeApp.store.uid(), name: name, start: start, end: end, items: items });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '迭代已更新' : '迭代已添加');
    return true;
  }

  function deleteSprint(projectId, id) {
    LifeApp.ui.confirm('确定删除这个迭代吗？').then(function (ok) {
      if (!ok) return;
      const project = findProject(projectId);
      if (!project) return;
      const idx = project.sprints.findIndex(function (s) { return s.id === id; });
      if (idx !== -1) project.sprints.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('迭代已删除');
    });
  }

  function addTodo(projectId) {
    const input = document.getElementById('product-todo-input');
    const text = input ? input.value.trim() : '';
    if (!text) {
      LifeApp.ui.toast('待办内容不能为空');
      return;
    }
    const project = findProject(projectId);
    if (!project) return;
    project.todos.push({ id: LifeApp.store.uid(), text: text, done: false });
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('待办已添加');
  }

  function toggleTodo(projectId, id) {
    const project = findProject(projectId);
    if (!project) return;
    const todo = project.todos.find(function (t) { return t.id === id; });
    if (todo) {
      todo.done = !todo.done;
      LifeApp.store.save();
      render(containerRef, ctxRef);
    }
  }

  function deleteTodo(projectId, id) {
    LifeApp.ui.confirm('确定删除这条待办吗？').then(function (ok) {
      if (!ok) return;
      const project = findProject(projectId);
      if (!project) return;
      const idx = project.todos.findIndex(function (t) { return t.id === id; });
      if (idx !== -1) project.todos.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('待办已删除');
    });
  }

  function openLogModal(projectId, log) {
    const isEdit = !!log;
    LifeApp.ui.modal({
      title: isEdit ? '编辑日志' : '写日志',
      bodyHtml:
        '<div class="field"><label>日期</label><input id="product-log-date" type="date" value="' + LifeApp.ui.esc(log ? log.date : LifeApp.store.todayKey()) + '"></div>' +
        '<div class="field"><label>内容</label><textarea id="product-log-content">' + LifeApp.ui.esc(log ? log.content : '') + '</textarea></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveLog(projectId, isEdit, log ? log.id : null); } }
      ]
    });
  }

  function saveLog(projectId, isEdit, id) {
    const date = document.getElementById('product-log-date').value;
    const content = document.getElementById('product-log-content').value.trim();
    if (!date || !content) {
      LifeApp.ui.toast('日期和内容不能为空');
      return false;
    }
    const project = findProject(projectId);
    if (!project) return false;
    if (isEdit) {
      const log = project.logs.find(function (l) { return l.id === id; });
      if (log) Object.assign(log, { date: date, content: content });
    } else {
      project.logs.push({ id: LifeApp.store.uid(), date: date, content: content });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '日志已更新' : '日志已保存');
    return true;
  }

  function deleteLog(projectId, id) {
    LifeApp.ui.confirm('确定删除这条日志吗？').then(function (ok) {
      if (!ok) return;
      const project = findProject(projectId);
      if (!project) return;
      const idx = project.logs.findIndex(function (l) { return l.id === id; });
      if (idx !== -1) project.logs.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('日志已删除');
    });
  }

  return {
    render: render
  };
});
