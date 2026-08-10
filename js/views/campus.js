(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.campus = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATUSES = [
    { id: 'preparing', name: '准备中' },
    { id: 'applied', name: '已投递' },
    { id: 'written', name: '笔试' },
    { id: 'interview', name: '面试' },
    { id: 'offer', name: 'Offer' },
    { id: 'givenup', name: '已放弃' }
  ];

  let containerRef = null;
  let ctxRef = null;
  let expandedId = null;

  function statusName(id) {
    const s = STATUSES.find(function (x) { return x.id === id; });
    return s ? s.name : id;
  }

  function statusBadge(id) {
    const cls = {
      preparing: 'badge-neutral',
      applied: 'badge-accent',
      written: 'badge-warning',
      interview: 'badge-warning',
      offer: 'badge-success',
      givenup: 'badge-danger'
    }[id] || 'badge-neutral';
    return '<span class="badge ' + cls + '">' + statusName(id) + '</span>';
  }

  function timelineItem(item) {
    return '<div class="list-row timeline-row">' +
      '<div class="list-row-main">' +
      '<div class="task-title">' + LifeApp.ui.esc(item.stage) + '</div>' +
      '<div class="task-meta"><span class="muted small">' + LifeApp.ui.esc(item.date) + '</span>' + (item.note ? '<span class="muted small">' + LifeApp.ui.esc(item.note) + '</span>' : '') + '</div>' +
      '</div></div>';
  }

  function recordCard(record) {
    const expanded = expandedId === record.id;
    return '<div class="campus-card">' +
      '<div class="campus-card-head">' +
      '<div class="list-row-main">' +
      '<div class="task-title">' + LifeApp.ui.esc(record.company) + '</div>' +
      '<div class="task-meta">' + statusBadge(record.status) + '<span class="muted small">' + LifeApp.ui.esc(record.position) + '</span>' + (record.appliedAt ? '<span class="muted small">投递 ' + LifeApp.ui.esc(record.appliedAt) + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="toggle-detail" data-id="' + record.id + '">' + (expanded ? '收起' : '详情') + '</button>' +
      '<button type="button" class="btn btn-sm" data-action="edit-record" data-id="' + record.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-record" data-id="' + record.id + '">删除</button>' +
      '</div>' +
      '</div>' +
      (record.nextAction || record.deadline ? '<div class="campus-next">' +
        (record.nextAction ? '<span>下一步：' + LifeApp.ui.esc(record.nextAction) + '</span>' : '') +
        (record.deadline ? '<span class="muted small">截止 ' + LifeApp.ui.esc(record.deadline) + '</span>' : '') +
        '</div>' : '') +
      (expanded ? '<div class="campus-detail">' +
        '<div class="form-row"><div class="field"><label>当前状态</label><select data-action="change-status" data-id="' + record.id + '">' +
        STATUSES.map(function (s) {
          return '<option value="' + s.id + '"' + (s.id === record.status ? ' selected' : '') + '>' + s.name + '</option>';
        }).join('') +
        '</select></div></div>' +
        '<h3>流程时间线</h3>' +
        (record.timeline.length ? record.timeline.map(timelineItem).join('') : LifeApp.ui.emptyState('还没有流程节点', '')) +
        '<div class="timeline-add">' +
        '<input type="date" id="campus-tl-date" value="' + LifeApp.store.todayKey() + '">' +
        '<input type="text" id="campus-tl-stage" placeholder="阶段，如 一面">' +
        '<input type="text" id="campus-tl-note" placeholder="备注（可选）">' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="add-timeline" data-id="' + record.id + '">添加节点</button>' +
        '</div>' +
        (record.note ? '<div class="muted small" style="margin-top:8px">备注：' + LifeApp.ui.esc(record.note) + '</div>' : '') +
        '</div>' : '') +
      '</div>';
  }

  function render(container, ctx) {
    containerRef = container;
    ctxRef = ctx;
    const data = LifeApp.store.data;
    const stats = LifeApp.store.campusStats(data.campus.records);

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.campus,
        eyebrow: '求职进度',
        title: '校招进展',
        description: '管理投递、笔试、面试和 Offer，每一步都有记录。',
        actions: '<button type="button" class="btn btn-primary" data-action="add-record">+ 新增投递</button>'
      }) +
      '<div class="stat-grid campus-stats">' +
      '<div class="stat-card"><div class="num">' + stats.total + '</div><div class="label">投递总数</div></div>' +
      '<div class="stat-card"><div class="num">' + stats.interviewing + '</div><div class="label">面试中</div></div>' +
      '<div class="stat-card"><div class="num">' + stats.offers + '</div><div class="label">Offer</div></div>' +
      '</div>' +
      '<div class="kanban">' +
      STATUSES.map(function (s) {
        const records = data.campus.records.filter(function (r) { return r.status === s.id; });
        return '<div class="kanban-col">' +
          '<div class="kanban-head"><span>' + s.name + '</span><span class="badge badge-neutral">' + records.length + '</span></div>' +
          (records.length ? records.map(recordCard).join('') : '<div class="kanban-empty">暂无</div>') +
          '</div>';
      }).join('') +
      '</div>';

    container.querySelectorAll('[data-action="add-record"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openRecordModal(null); });
    });
    container.querySelectorAll('[data-action="toggle-detail"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-id');
        expandedId = expandedId === id ? null : id;
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="edit-record"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const record = LifeApp.store.data.campus.records.find(function (r) { return r.id === btn.getAttribute('data-id'); });
        if (record) openRecordModal(record);
      });
    });
    container.querySelectorAll('[data-action="delete-record"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteRecord(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="change-status"]').forEach(function (select) {
      select.addEventListener('change', function () {
        const record = LifeApp.store.data.campus.records.find(function (r) { return r.id === select.getAttribute('data-id'); });
        if (record) {
          record.status = select.value;
          LifeApp.store.save();
          render(containerRef, ctxRef);
          LifeApp.ui.toast('状态已更新为' + statusName(record.status));
        }
      });
    });
    container.querySelectorAll('[data-action="add-timeline"]').forEach(function (btn) {
      btn.addEventListener('click', function () { addTimeline(btn.getAttribute('data-id')); });
    });
  }

  function openRecordModal(record) {
    const isEdit = !!record;
    LifeApp.ui.modal({
      title: isEdit ? '编辑投递记录' : '新增投递记录',
      bodyHtml:
        '<div class="form-row">' +
        '<div class="field"><label>公司</label><input id="campus-company" type="text" value="' + LifeApp.ui.esc(record ? record.company : '') + '"></div>' +
        '<div class="field"><label>岗位</label><input id="campus-position" type="text" value="' + LifeApp.ui.esc(record ? record.position : '') + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="field"><label>投递时间</label><input id="campus-applied" type="date" value="' + LifeApp.ui.esc(record && record.appliedAt ? record.appliedAt : LifeApp.store.todayKey()) + '"></div>' +
        '<div class="field"><label>当前状态</label><select id="campus-status">' +
        STATUSES.map(function (s) {
          return '<option value="' + s.id + '"' + ((record ? record.status : 'preparing') === s.id ? ' selected' : '') + '>' + s.name + '</option>';
        }).join('') +
        '</select></div></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>下一步行动</label><input id="campus-next" type="text" value="' + LifeApp.ui.esc(record ? record.nextAction : '') + '"></div>' +
        '<div class="field"><label>截止时间</label><input id="campus-deadline" type="date" value="' + LifeApp.ui.esc(record && record.deadline ? record.deadline : '') + '"></div>' +
        '</div>' +
        '<div class="field"><label>备注</label><textarea id="campus-note">' + LifeApp.ui.esc(record ? record.note : '') + '</textarea></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveRecord(isEdit, record ? record.id : null); } }
      ]
    });
  }

  function saveRecord(isEdit, id) {
    const company = document.getElementById('campus-company').value.trim();
    const position = document.getElementById('campus-position').value.trim();
    if (!company || !position) {
      LifeApp.ui.toast('公司和岗位不能为空');
      return false;
    }
    const appliedAt = document.getElementById('campus-applied').value || '';
    const status = document.getElementById('campus-status').value;
    const nextAction = document.getElementById('campus-next').value.trim();
    const deadline = document.getElementById('campus-deadline').value || '';
    const note = document.getElementById('campus-note').value.trim();
    const records = LifeApp.store.data.campus.records;
    if (isEdit) {
      const record = records.find(function (r) { return r.id === id; });
      if (record) Object.assign(record, { company: company, position: position, appliedAt: appliedAt, status: status, nextAction: nextAction, deadline: deadline, note: note });
    } else {
      records.push({ id: LifeApp.store.uid(), company: company, position: position, appliedAt: appliedAt, status: status, nextAction: nextAction, deadline: deadline, timeline: [], note: note });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '记录已更新' : '投递已添加');
    return true;
  }

  function deleteRecord(id) {
    LifeApp.ui.confirm('确定删除这条投递记录吗？').then(function (ok) {
      if (!ok) return;
      const records = LifeApp.store.data.campus.records;
      const idx = records.findIndex(function (r) { return r.id === id; });
      if (idx !== -1) records.splice(idx, 1);
      if (expandedId === id) expandedId = null;
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('记录已删除');
    });
  }

  function addTimeline(id) {
    const record = LifeApp.store.data.campus.records.find(function (r) { return r.id === id; });
    if (!record) return;
    const date = document.getElementById('campus-tl-date').value;
    const stage = document.getElementById('campus-tl-stage').value.trim();
    if (!date || !stage) {
      LifeApp.ui.toast('日期和阶段不能为空');
      return;
    }
    const note = document.getElementById('campus-tl-note').value.trim();
    record.timeline.push({ id: LifeApp.store.uid(), date: date, stage: stage, note: note });
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('流程节点已添加');
  }

  return {
    render: render
  };
});
