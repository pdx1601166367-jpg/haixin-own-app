(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.media = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATUSES = [
    { id: 'idea', name: '灵感' },
    { id: 'planning', name: '待策划' },
    { id: 'producing', name: '制作中' },
    { id: 'ready', name: '待发布' },
    { id: 'published', name: '已发布' }
  ];
  const NEXT_STATUS = { idea: 'planning', planning: 'producing', producing: 'ready', ready: 'published' };
  const TABS = [
    { id: 'accounts', name: '账号' },
    { id: 'contents', name: '内容' },
    { id: 'calendar', name: '发布日历' },
    { id: 'stats', name: '数据记录' }
  ];

  let containerRef = null;
  let ctxRef = null;
  let currentTab = 'accounts';
  let currentMonth = null;
  let selectedDate = null;

  function statusName(id) {
    const s = STATUSES.find(function (x) { return x.id === id; });
    return s ? s.name : id;
  }

  function statusBadge(status) {
    const cls = { idea: 'badge-neutral', planning: 'badge-accent', producing: 'badge-warning', ready: 'badge-warning', published: 'badge-success' }[status] || 'badge-neutral';
    return '<span class="badge ' + cls + '">' + statusName(status) + '</span>';
  }

  function accountCard(account) {
    return '<div class="account-card">' +
      '<div class="account-name">' + LifeApp.ui.esc(account.name) + '</div>' +
      '<div class="muted small">' + LifeApp.ui.esc(account.platform) + '</div>' +
      '<div class="account-nums"><span><b>' + Number(account.followers || 0) + '</b> 粉丝</span><span><b>' + Number(account.works || 0) + '</b> 作品</span></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-account" data-id="' + account.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-account" data-id="' + account.id + '">删除</button>' +
      '</div></div>';
  }

  function contentCard(content) {
    const next = NEXT_STATUS[content.status];
    const planned = content.plannedPublishDate || content.publishDate || '';
    const hasData = [content.views, content.likes, content.comments].some(function (v) { return Number(v || 0) > 0; });
    return '<div class="media-card">' +
      '<div class="media-card-top"><span class="badge badge-neutral">' + LifeApp.ui.esc(content.platform || '未指定平台') + '</span>' + statusBadge(content.status) + '</div>' +
      '<h3>' + LifeApp.ui.esc(content.title) + '</h3>' +
      (content.copyText ? '<p>' + LifeApp.ui.esc(content.copyText) + '</p>' : '') +
      '<div class="media-meta">' +
      (planned ? '<span>计划 ' + LifeApp.ui.esc(planned) + '</span>' : '') +
      (content.publishedAt ? '<span>发布于 ' + LifeApp.ui.esc(content.publishedAt) + '</span>' : '') +
      (content.publishUrl ? '<span>已发布链接</span>' : '') +
      (hasData ? '<span>播放 ' + Number(content.views || 0) + '</span>' : '') +
      '</div>' +
      '<div class="media-actions">' +
      (next ? '<button type="button" class="btn btn-sm" data-action="advance-content" data-id="' + content.id + '">下一步：' + statusName(next) + '</button>' : '') +
      '<button type="button" class="btn btn-sm" data-action="plan-content" data-id="' + content.id + '">加入今日计划</button>' +
      '<button type="button" class="btn btn-sm" data-action="edit-content" data-id="' + content.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-content" data-id="' + content.id + '">删除</button>' +
      '</div></div>';
  }

  function analyticsHtml() {
    const items = LifeApp.store.data.media.contents.filter(function (c) {
      return c.status === 'published' && [c.views, c.likes, c.comments].some(function (v) { return Number(v || 0) > 0; });
    }).sort(function (a, b) {
      return String(a.publishedAt || a.publishDate || '').localeCompare(String(b.publishedAt || b.publishDate || ''));
    });
    if (!items.length) return LifeApp.ui.emptyState('还没有可视化数据，发布后填写播放、点赞或评论即可生成分析', '');
    const totals = items.reduce(function (sum, c) {
      return { views: sum.views + Number(c.views || 0), likes: sum.likes + Number(c.likes || 0), comments: sum.comments + Number(c.comments || 0) };
    }, { views: 0, likes: 0, comments: 0 });
    const rate = totals.views ? ((totals.likes + totals.comments) / totals.views * 100) : 0;
    const best = items.reduce(function (winner, c) {
      return !winner || Number(c.views || 0) > Number(winner.views || 0) ? c : winner;
    }, null);
    const points = items.slice(-8);
    return '<div class="kpi-grid">' +
      '<div class="kpi"><div class="kpi-value">' + totals.views + '</div><div class="kpi-label">总播放 / 阅读</div></div>' +
      '<div class="kpi"><div class="kpi-value">' + rate.toFixed(1) + '%</div><div class="kpi-label">平均互动率</div></div>' +
      '<div class="kpi"><div class="kpi-value kpi-title">' + LifeApp.ui.esc(best.title) + '</div><div class="kpi-label">最佳表现</div></div>' +
      '</div>' +
      '<div class="chart-card">' +
      '<div class="chart-legend"><span><i style="background:#20221f"></i>播放 / 阅读</span><span><i style="background:#388058"></i>点赞 + 评论</span><span class="badge badge-accent">最近 ' + points.length + ' 条</span></div>' +
      mediaChartSvg(points) +
      '</div>';
  }

  function mediaChartSvg(items) {
    const width = 640;
    const height = 200;
    const padL = 48;
    const padR = 14;
    const padT = 16;
    const padB = 28;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const maxViews = Math.max.apply(null, items.map(function (c) { return Number(c.views || 0); }).concat([1]));
    const maxEng = Math.max.apply(null, items.map(function (c) { return Number(c.likes || 0) + Number(c.comments || 0); }).concat([1]));
    const step = items.length > 1 ? innerW / (items.length - 1) : innerW;
    const grid = [0, 0.25, 0.5, 0.75, 1].map(function (ratio) {
      const y = padT + innerH * (1 - ratio);
      return '<line x1="' + padL + '" y1="' + y + '" x2="' + (width - padR) + '" y2="' + y + '" stroke="#e7e9ea" stroke-width="1"/>' +
        '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#999">' + Math.round(maxViews * ratio) + '</text>';
    }).join('');
    const bars = items.map(function (c, i) {
      const h = innerH * (Number(c.views || 0) / maxViews);
      const x = padL + i * step - step * 0.16;
      const y = padT + innerH - h;
      return '<rect x="' + x + '" y="' + y + '" width="' + Math.max(6, step * 0.32) + '" height="' + Math.max(1, h) + '" rx="3" fill="#20221f"/>';
    }).join('');
    const linePoints = items.map(function (c, i) {
      const value = Number(c.likes || 0) + Number(c.comments || 0);
      const x = padL + i * step;
      const y = padT + innerH * (1 - value / maxEng);
      return x + ',' + y;
    }).join(' ');
    const labels = items.map(function (c, i) {
      const x = padL + i * step;
      return '<text x="' + x + '" y="' + (height - 8) + '" text-anchor="middle" font-size="10" fill="#999">' + LifeApp.ui.esc(c.title.length > 6 ? c.title.slice(0, 6) + '…' : c.title) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="发布后数据图表">' +
      grid + bars +
      '<polyline points="' + linePoints + '" fill="none" stroke="#388058" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      items.map(function (c, i) {
        const value = Number(c.likes || 0) + Number(c.comments || 0);
        const x = padL + i * step;
        const y = padT + innerH * (1 - value / maxEng);
        return '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="#388058"/>';
      }).join('') +
      labels +
      '</svg>';
  }

  function statRow(stat) {
    return '<div class="list-row">' +
      '<div class="list-row-main"><span class="task-title">' + LifeApp.ui.esc(stat.date) + '</span>' +
      '<div class="task-meta"><span class="badge badge-neutral">播放 ' + Number(stat.playCount || 0) + '</span><span class="badge badge-' + (Number(stat.followersDelta || 0) >= 0 ? 'success' : 'danger') + '">涨粉 ' + Number(stat.followersDelta || 0) + '</span></div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-stat" data-id="' + stat.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-stat" data-id="' + stat.id + '">删除</button>' +
      '</div></div>';
  }

  function calendarHtml() {
    const store = LifeApp.store;
    if (!currentMonth) currentMonth = store.todayKey().slice(0, 7);
    const parts = currentMonth.split('-').map(Number);
    const first = new Date(parts[0], parts[1] - 1, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(parts[0], parts[1], 0).getDate();
    const byDate = {};
    store.data.media.contents.forEach(function (c) {
      const date = c.publishedAt || c.publishDate || c.plannedPublishDate || '';
      if (c.status === 'published' && date) {
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(c);
      }
    });
    let cells = '<div class="cal-weekday">日</div><div class="cal-weekday">一</div><div class="cal-weekday">二</div><div class="cal-weekday">三</div><div class="cal-weekday">四</div><div class="cal-weekday">五</div><div class="cal-weekday">六</div>';
    for (let i = 0; i < startDow; i += 1) cells += '<div class="cal-day empty"></div>';
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = parts[0] + '-' + String(parts[1]).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const count = (byDate[key] || []).length;
      cells += '<button type="button" class="cal-day' + (key === selectedDate ? ' active' : '') + (count ? ' has-posts' : '') + '" data-cal-date="' + key + '">' + day + (count ? '<span class="cal-count">' + count + '</span>' : '') + '</button>';
    }
    const selectedList = selectedDate ? (byDate[selectedDate] || []) : [];
    return '<div class="calendar-head">' +
      '<button type="button" class="btn btn-sm" data-action="prev-month">上月</button>' +
      '<span class="calendar-title">' + parts[0] + ' 年 ' + parts[1] + ' 月</span>' +
      '<button type="button" class="btn btn-sm" data-action="next-month">下月</button>' +
      '</div>' +
      '<div class="calendar-grid">' + cells + '</div>' +
      '<div class="calendar-day-list">' +
      (selectedDate ? '<h3>' + selectedDate + ' 发布内容</h3>' + (selectedList.length ? selectedList.map(function (c) {
        return '<div class="list-row"><div class="list-row-main">' + LifeApp.ui.esc(c.title) + '</div><div class="muted small">' + LifeApp.ui.esc(c.platform) + '</div></div>';
      }).join('') : LifeApp.ui.emptyState('这一天没有发布内容', '')) : LifeApp.ui.emptyState('点击日历中的日期查看当天发布', '')) +
      '</div>';
  }

  function render(container, ctx) {
    containerRef = container;
    ctxRef = ctx;
    const store = LifeApp.store;
    const data = store.data;
    const today = store.todayKey();

    let bodyHtml = '';
    if (currentTab === 'accounts') {
      bodyHtml = '<div class="panel"><div class="panel-head"><h2>平台账号</h2><button type="button" class="btn btn-primary" data-action="add-account">+ 新增账号</button></div><div class="panel-body">' +
        (data.media.accounts.length ? '<div class="account-grid">' + data.media.accounts.map(accountCard).join('') + '</div>' : LifeApp.ui.emptyState('还没有账号，先添加一个平台账号', '')) +
        '</div></div>';
    } else if (currentTab === 'contents') {
      const producing = data.media.contents.filter(function (c) { return c.status === 'producing'; }).length;
      const ready = data.media.contents.filter(function (c) { return c.status === 'ready'; }).length;
      const publishedMonth = data.media.contents.filter(function (c) {
        return c.status === 'published' && (c.publishedAt || c.publishDate || '').slice(0, 7) === today.slice(0, 7);
      }).length;
      bodyHtml =
        '<div class="media-status-strip">' +
        '<div class="media-status-item"><span>正在制作</span><strong class="num-coral">' + producing + '</strong></div>' +
        '<div class="media-status-item"><span>等待发布</span><strong class="num-blue">' + ready + '</strong></div>' +
        '<div class="media-status-item"><span>本月已发布</span><strong class="num-green">' + publishedMonth + '</strong></div>' +
        '</div>' +
        '<div class="panel" style="margin-bottom:var(--space)"><div class="panel-head"><h2>发布后数据</h2></div><div class="panel-body">' + analyticsHtml() + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h2>内容看板</h2><button type="button" class="btn btn-primary" data-action="add-content">+ 新增内容</button></div><div class="panel-body">' +
        (data.media.contents.length ? '<div class="kanban media-kanban">' + STATUSES.map(function (s) {
          const items = data.media.contents.filter(function (c) { return c.status === s.id; });
          return '<div class="kanban-col"><div class="kanban-head"><span>' + s.name + '</span><span class="badge badge-neutral">' + items.length + '</span></div>' +
            (items.length ? items.map(contentCard).join('') : '<div class="kanban-empty">暂无</div>') + '</div>';
        }).join('') + '</div>' : LifeApp.ui.emptyState('还没有内容，先记录一个灵感', '')) +
        '</div></div>';
    } else if (currentTab === 'calendar') {
      bodyHtml = '<div class="panel"><div class="panel-head"><h2>发布日历</h2></div><div class="panel-body">' + calendarHtml() + '</div></div>';
    } else {
      const stats = data.media.dailyStats.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      bodyHtml = '<div class="panel"><div class="panel-head"><h2>按天数据</h2><button type="button" class="btn btn-primary" data-action="add-stat">+ 新增记录</button></div><div class="panel-body">' +
        (stats.length ? stats.map(statRow).join('') : LifeApp.ui.emptyState('还没有数据记录，记录某天的播放和涨粉', '')) +
        '</div></div>';
    }

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.media,
        eyebrow: '创作流程',
        title: '自媒体',
        description: '从灵感、制作到发布，把内容放在真正的创作流程里。',
        actions: '<button type="button" id="media-add-content-btn" class="btn btn-primary">+ 记录内容</button>'
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
    const headerAdd = container.querySelector('#media-add-content-btn');
    if (headerAdd) headerAdd.addEventListener('click', function () { openContentModal(null); });
    bindActions(container);
  }

  function bindActions(container) {
    container.querySelectorAll('[data-action="add-account"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openAccountModal(null); });
    });
    container.querySelectorAll('[data-action="edit-account"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const account = LifeApp.store.data.media.accounts.find(function (a) { return a.id === btn.getAttribute('data-id'); });
        if (account) openAccountModal(account);
      });
    });
    container.querySelectorAll('[data-action="delete-account"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteAccount(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-content"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openContentModal(null); });
    });
    container.querySelectorAll('[data-action="edit-content"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const content = LifeApp.store.data.media.contents.find(function (c) { return c.id === btn.getAttribute('data-id'); });
        if (content) openContentModal(content);
      });
    });
    container.querySelectorAll('[data-action="delete-content"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteContent(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="advance-content"]').forEach(function (btn) {
      btn.addEventListener('click', function () { advanceContent(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="plan-content"]').forEach(function (btn) {
      btn.addEventListener('click', function () { planContent(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-stat"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openStatModal(null); });
    });
    container.querySelectorAll('[data-action="edit-stat"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const stat = LifeApp.store.data.media.dailyStats.find(function (s) { return s.id === btn.getAttribute('data-id'); });
        if (stat) openStatModal(stat);
      });
    });
    container.querySelectorAll('[data-action="delete-stat"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteStat(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="prev-month"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = currentMonth.split('-').map(Number);
        currentMonth = LifeApp.store.dateKey(new Date(parts[0], parts[1] - 2, 1)).slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="next-month"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = currentMonth.split('-').map(Number);
        currentMonth = LifeApp.store.dateKey(new Date(parts[0], parts[1], 1)).slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-cal-date]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedDate = btn.getAttribute('data-cal-date');
        render(containerRef, ctxRef);
      });
    });
  }

  function openAccountModal(account) {
    const isEdit = !!account;
    LifeApp.ui.modal({
      title: isEdit ? '编辑账号' : '新增账号',
      bodyHtml:
        '<div class="field"><label>平台</label><input id="media-account-platform" type="text" value="' + LifeApp.ui.esc(account ? account.platform : '') + '"></div>' +
        '<div class="field"><label>账号名</label><input id="media-account-name" type="text" value="' + LifeApp.ui.esc(account ? account.name : '') + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>粉丝数</label><input id="media-account-followers" type="number" min="0" value="' + (account ? Number(account.followers || 0) : 0) + '"></div>' +
        '<div class="field"><label>作品数</label><input id="media-account-works" type="number" min="0" value="' + (account ? Number(account.works || 0) : 0) + '"></div>' +
        '</div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveAccount(isEdit, account ? account.id : null); } }
      ]
    });
  }

  function saveAccount(isEdit, id) {
    const platform = document.getElementById('media-account-platform').value.trim();
    const name = document.getElementById('media-account-name').value.trim();
    if (!platform || !name) {
      LifeApp.ui.toast('平台和账号名不能为空');
      return false;
    }
    const followers = Number(document.getElementById('media-account-followers').value) || 0;
    const works = Number(document.getElementById('media-account-works').value) || 0;
    const accounts = LifeApp.store.data.media.accounts;
    if (isEdit) {
      const account = accounts.find(function (a) { return a.id === id; });
      if (account) Object.assign(account, { platform: platform, name: name, followers: followers, works: works });
    } else {
      accounts.push({ id: LifeApp.store.uid(), platform: platform, name: name, followers: followers, works: works });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '账号已更新' : '账号已添加');
    return true;
  }

  function deleteAccount(id) {
    LifeApp.ui.confirm('确定删除这个账号吗？').then(function (ok) {
      if (!ok) return;
      const accounts = LifeApp.store.data.media.accounts;
      const idx = accounts.findIndex(function (a) { return a.id === id; });
      if (idx !== -1) accounts.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('账号已删除');
    });
  }

  function openContentModal(content) {
    const isEdit = !!content;
    LifeApp.ui.modal({
      title: isEdit ? '编辑内容' : '新增内容',
      bodyHtml:
        '<div class="field"><label>标题</label><input id="media-content-title" type="text" value="' + LifeApp.ui.esc(content ? content.title : '') + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>平台</label><input id="media-content-platform" type="text" value="' + LifeApp.ui.esc(content ? content.platform : '') + '"></div>' +
        '<div class="field"><label>内容形式</label><input id="media-content-format" type="text" value="' + LifeApp.ui.esc(content ? content.contentFormat : '') + '" placeholder="视频、图文等"></div>' +
        '</div>' +
        '<div class="field"><label>制作阶段</label><select id="media-content-status">' +
        STATUSES.map(function (s) {
          return '<option value="' + s.id + '"' + ((content ? content.status : 'idea') === s.id ? ' selected' : '') + '>' + s.name + '</option>';
        }).join('') +
        '</select></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>计划发布日期</label><input id="media-content-planned" type="date" value="' + LifeApp.ui.esc(content ? (content.plannedPublishDate || content.publishDate || '') : '') + '"></div>' +
        '<div class="field"><label>实际发布日期</label><input id="media-content-published" type="date" value="' + LifeApp.ui.esc(content && content.publishedAt ? content.publishedAt : '') + '"></div>' +
        '</div>' +
        '<div class="field"><label>素材位置</label><input id="media-content-asset" type="text" value="' + LifeApp.ui.esc(content ? content.assetPath : '') + '"></div>' +
        '<div class="field"><label>发布链接</label><input id="media-content-url" type="text" value="' + LifeApp.ui.esc(content ? content.publishUrl : '') + '"></div>' +
        '<div class="form-row-3">' +
        '<div class="field"><label>播放 / 阅读</label><input id="media-content-views" type="number" min="0" value="' + (content ? Number(content.views || 0) : 0) + '"></div>' +
        '<div class="field"><label>点赞</label><input id="media-content-likes" type="number" min="0" value="' + (content ? Number(content.likes || 0) : 0) + '"></div>' +
        '<div class="field"><label>评论</label><input id="media-content-comments" type="number" min="0" value="' + (content ? Number(content.comments || 0) : 0) + '"></div>' +
        '</div>' +
        '<div class="field"><label>文案与内容笔记</label><textarea id="media-content-copy">' + LifeApp.ui.esc(content ? content.copyText : '') + '</textarea></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveContent(isEdit, content ? content.id : null); } }
      ]
    });
  }

  function saveContent(isEdit, id) {
    const title = document.getElementById('media-content-title').value.trim();
    const platform = document.getElementById('media-content-platform').value.trim();
    if (!title || !platform) {
      LifeApp.ui.toast('标题和平台不能为空');
      return false;
    }
    const status = document.getElementById('media-content-status').value;
    let publishedAt = document.getElementById('media-content-published').value || '';
    if (status === 'published' && !publishedAt) publishedAt = LifeApp.store.todayKey();
    const contents = LifeApp.store.data.media.contents;
    const payload = {
      title: title,
      platform: platform,
      contentFormat: document.getElementById('media-content-format').value.trim(),
      status: status,
      plannedPublishDate: document.getElementById('media-content-planned').value || '',
      publishedAt: publishedAt,
      assetPath: document.getElementById('media-content-asset').value.trim(),
      publishUrl: document.getElementById('media-content-url').value.trim(),
      views: Number(document.getElementById('media-content-views').value) || 0,
      likes: Number(document.getElementById('media-content-likes').value) || 0,
      comments: Number(document.getElementById('media-content-comments').value) || 0,
      copyText: document.getElementById('media-content-copy').value.trim()
    };
    if (isEdit) {
      const content = contents.find(function (c) { return c.id === id; });
      if (content) Object.assign(content, payload);
    } else {
      contents.push(Object.assign({ id: LifeApp.store.uid() }, payload));
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '内容已更新' : '内容已添加');
    return true;
  }

  function advanceContent(id) {
    const content = LifeApp.store.data.media.contents.find(function (c) { return c.id === id; });
    if (!content) return;
    const next = NEXT_STATUS[content.status];
    if (!next) return;
    content.status = next;
    if (next === 'published' && !(content.publishedAt || content.publishDate)) content.publishedAt = LifeApp.store.todayKey();
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已流转到' + statusName(next));
  }

  function planContent(id) {
    const content = LifeApp.store.data.media.contents.find(function (c) { return c.id === id; });
    if (!content) return;
    const today = LifeApp.store.todayKey();
    if (!LifeApp.store.data.plans[today]) LifeApp.store.data.plans[today] = [];
    LifeApp.store.data.plans[today].push({ id: LifeApp.store.uid(), title: '推进内容：' + content.title, time: '', estimatedMinutes: 0, priority: 'medium', source: 'media', done: false, status: 'todo' });
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已加入今日计划');
  }

  function deleteContent(id) {
    LifeApp.ui.confirm('确定删除这条内容吗？').then(function (ok) {
      if (!ok) return;
      const contents = LifeApp.store.data.media.contents;
      const idx = contents.findIndex(function (c) { return c.id === id; });
      if (idx !== -1) contents.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('内容已删除');
    });
  }

  function openStatModal(stat) {
    const isEdit = !!stat;
    LifeApp.ui.modal({
      title: isEdit ? '编辑数据记录' : '新增数据记录',
      bodyHtml:
        '<div class="field"><label>日期</label><input id="media-stat-date" type="date" value="' + LifeApp.ui.esc(stat ? stat.date : LifeApp.store.todayKey()) + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>播放量</label><input id="media-stat-play" type="number" min="0" value="' + (stat ? Number(stat.playCount || 0) : 0) + '"></div>' +
        '<div class="field"><label>涨粉数</label><input id="media-stat-followers" type="number" value="' + (stat ? Number(stat.followersDelta || 0) : 0) + '"></div>' +
        '</div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveStat(isEdit, stat ? stat.id : null); } }
      ]
    });
  }

  function saveStat(isEdit, id) {
    const date = document.getElementById('media-stat-date').value;
    if (!date) {
      LifeApp.ui.toast('请选择日期');
      return false;
    }
    const playCount = Number(document.getElementById('media-stat-play').value) || 0;
    const followersDelta = Number(document.getElementById('media-stat-followers').value) || 0;
    const stats = LifeApp.store.data.media.dailyStats;
    if (isEdit) {
      const stat = stats.find(function (s) { return s.id === id; });
      if (stat) Object.assign(stat, { date: date, playCount: playCount, followersDelta: followersDelta });
    } else {
      stats.push({ id: LifeApp.store.uid(), date: date, playCount: playCount, followersDelta: followersDelta });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '记录已更新' : '记录已添加');
    return true;
  }

  function deleteStat(id) {
    LifeApp.ui.confirm('确定删除这条数据记录吗？').then(function (ok) {
      if (!ok) return;
      const stats = LifeApp.store.data.media.dailyStats;
      const idx = stats.findIndex(function (s) { return s.id === id; });
      if (idx !== -1) stats.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('记录已删除');
    });
  }

  return {
    render: render
  };
});
